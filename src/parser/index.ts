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

function checkConsecutiveSeparators(nodes: Node[]): void {
  for (let i = 0; i < nodes.length - 1; i++) {
    if (nodes[i].type === "separator" && nodes[i + 1].type === "separator") {
      throw new Error("Syntax error: consecutive separators");
    }
  }
}

const BaseVisitor = parser.getBaseCstVisitorConstructor();

class TekkenVisitor extends BaseVisitor {
  constructor() {
    super();
    this.validateVisitor();
  }

  diagram(ctx: any): Diagram {
    const nodes: Node[] = [];
    if (ctx.topLevelItem) {
      for (const item of ctx.topLevelItem) {
        const result = this.visit(item);
        if (Array.isArray(result)) {
          nodes.push(...result);
        } else if (result) {
          nodes.push(result);
        }
      }
    }
    checkConsecutiveSeparators(nodes);
    return { nodes };
  }

  topLevelItem(ctx: any): Node | Node[] {
    if (ctx.sequence) return this.visit(ctx.sequence);
    if (ctx.slide) return this.visit(ctx.slide);
    if (ctx.text) return this.visit(ctx.text);
    if (ctx.separator) return this.visit(ctx.separator);
    throw new Error("Unknown top level item");
  }

  sequence(ctx: any): Node[] {
    const nodes: Node[] = [];
    if (ctx.direction) {
      for (const d of ctx.direction) {
        nodes.push(this.visit(d));
      }
    }
    if (ctx.neutral) {
      for (const n of ctx.neutral) {
        nodes.push(this.visit(n));
      }
    }
    if (ctx.attack) {
      for (const a of ctx.attack) {
        nodes.push(this.visit(a));
      }
    }
    return nodes;
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

  attack(ctx: any): Node {
    const buttons: Button[] = [];
    if (ctx.AttackButton) {
      for (const tok of ctx.AttackButton) {
        buttons.push(...expandButtons(tok.image as AttackToken));
      }
    }
    return { type: "attack", buttons: deduplicate(buttons) };
  }

  slide(ctx: any): Node[] {
    const buttons: Button[] = [];
    if (ctx.AttackButton) {
      for (const tok of ctx.AttackButton) {
        buttons.push(tok.image as Button);
      }
    }
    if (buttons.length < 2) {
      throw new Error("Syntax error: slide must contain at least 2 buttons");
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
    const raw = tok.image.slice(1, -1);
    const value = raw.replace(/\\"/g, '"').replace(/\\:/g, ":");
    return { type: "text", value };
  }

  separator(): Node {
    return { type: "separator" };
  }
}

const visitor = new TekkenVisitor();

export function parse(input: string): Diagram {
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
