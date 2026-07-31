import { parser } from "./parser";
import { TekkenLexer } from "./lexer";
import type { Node, Diagram, Button } from "../types";

type AttackToken = "LP" | "RP" | "LK" | "RK" | "WP" | "WK";

function expandButtons(button: AttackToken): Button[] {
  if (button === "WP") return ["LP", "RP"];
  if (button === "WK") return ["LK", "RK"];
  return [button];
}

function deduplicate(buttons: Button[]): Button[] {
  return [...new Set(buttons)];
}

const BaseVisitor = parser.getBaseCstVisitorConstructor();

class TekkenVisitor extends BaseVisitor {
  constructor() {
    super();
    this.validateVisitor();
  }

  diagram(ctx: any): Diagram {
    const nodes: Node[] = [];
    if (ctx.element) {
      for (const item of ctx.element) {
        const result = this.visit(item);
        if (Array.isArray(result)) {
          nodes.push(...result);
        } else if (result) {
          nodes.push(result);
        }
      }
    }
    return { nodes };
  }

  element(ctx: any): Node | Node[] | undefined {
    if (ctx.direction) return this.visit(ctx.direction);
    if (ctx.neutral) return this.visit(ctx.neutral);
    if (ctx.buttonPress) return this.visit(ctx.buttonPress);
    if (ctx.slidePress) return this.visit(ctx.slidePress);
    if (ctx.text) return this.visit(ctx.text);
    if (ctx.separator) return this.visit(ctx.separator);
    return undefined;
  }

  direction(ctx: any): Node {
    const tok = ctx.Direction[0];
    return {
      type: "arrow",
      direction: parseInt(tok.image, 10) as any,
    };
  }

  neutral(): Node {
    return { type: "neutral" };
  }

  button(): undefined {
    return undefined;
  }

  buttonPress(ctx: any): Node {
    const buttons: Button[] = [];
    if (ctx.button) {
      for (const button of ctx.button) {
        const token = button.children.AttackButton?.[0] ?? button.children.WideButton?.[0];
        if (token) {
          buttons.push(...expandButtons(token.image as AttackToken));
        }
      }
    }
    return { type: "attack", buttons: deduplicate(buttons) };
  }

  slidePress(ctx: any): Node[] {
    const buttons: Button[] = [];
    if (ctx.AttackButton) {
      for (const tok of ctx.AttackButton) {
        buttons.push(tok.image as Button);
      }
    }
    const nodes: Node[] = [{ type: "slide-start" }];
    for (const btn of buttons) {
      nodes.push({ type: "attack", buttons: [btn] });
    }
    nodes.push({ type: "slide-end" });
    return nodes;
  }

  text(ctx: any): Node {
    const tok = ctx.Text[0];
    return { type: "text", value: tok.image.slice(1, -1) };
  }

  separator(): Node {
    return { type: "separator" };
  }
}

const visitor = new TekkenVisitor();

export function parse(input: string): Diagram {
  if (Array.from(input).length > 200) {
    throw new Error("Input exceeds maximum length of 200 characters");
  }

  const lexResult = TekkenLexer.tokenize(input);

  if (lexResult.errors.length > 0) {
    throw new Error(lexResult.errors[0].message);
  }

  parser.input = lexResult.tokens;
  const cst = parser.diagram();

  if (parser.errors.length > 0) {
    throw new Error(parser.errors[0].message);
  }

  return visitor.visit(cst);
}
