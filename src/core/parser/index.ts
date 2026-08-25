import { parser } from "./parser";
import { TekkenLexer, LineBreak as LineBreakToken, AttackButton as AttackButtonToken, WideButton as WideButtonToken } from "./lexer";
import type { Node, Diagram, Button, Direction } from "../types";

type AttackTokenImage = "LP" | "RP" | "LK" | "RK" | "WP" | "WK";

function expandButtons(button: AttackTokenImage): Button[] {
  if (button === "WP") return ["LP", "RP"];
  if (button === "WK") return ["LK", "RK"];
  return [button];
}

function deduplicate(buttons: Button[]): Button[] {
  return [...new Set(buttons)];
}

function collapseNewlines(nodes: Node[]): Node[] {
  const result: Node[] = [];
  for (const node of nodes) {
    const last = result[result.length - 1];
    if (node.type === "newline" && last?.type === "newline") {
      continue;
    }
    result.push(node);
  }
  return result;
}

const BaseVisitor = parser.getBaseCstVisitorConstructor();

class TekkenVisitor extends BaseVisitor {
  constructor() {
    super();
    this.validateVisitor();
  }

  diagram(ctx: any): Diagram {
    // CST から element 単位の Node 列を取り出す（順序は element 単位）。
    const elementNodes: Node[] = [];
    if (ctx.element) {
      for (const item of ctx.element) {
        const result = this.visit(item);
        if (Array.isArray(result)) {
          elementNodes.push(...result);
        } else if (result) {
          elementNodes.push(result);
        }
      }
    }
    // 連続改行を1つにまとめる。
    return { nodes: collapseNewlines(elementNodes) };
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
      direction: parseInt(tok.image, 10) as Direction,
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
          buttons.push(...expandButtons(token.image as AttackTokenImage));
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

// tokens を線形に走査し、element 単位で Node[] を構築する。
// 同時に LineBreak の出現位置で { type: "newline" } を挿入する。
function buildNodes(tokens: any[]): Node[] {
  const result: Node[] = [];
  let index = 0;
  while (index < tokens.length) {
    const tok = tokens[index];
    if (tok.tokenType === LineBreakToken) {
      result.push({ type: "newline" });
      index += 1;
      continue;
    }
    const consumed = readElement(tokens, index);
    if (consumed === null) {
      // Icon などはノードを生成しないのでトークンだけ消費。
      index += 1;
      continue;
    }
    for (const node of consumed.nodes) {
      result.push(node);
    }
    index += consumed.count;
  }
  return result;
}

function readElement(
  tokens: any[],
  start: number,
): { nodes: Node[]; count: number } | null {
  const tok = tokens[start];
  const image = tok.image as string;

  // Direction (digit)
  if (image === "1" || image === "2" || image === "3" || image === "4" ||
      image === "6" || image === "7" || image === "8" || image === "9") {
    return {
      nodes: [{ type: "arrow", direction: parseInt(image, 10) as Direction }],
      count: 1,
    };
  }

  // Neutral
  if (image === "n" || image === "N") {
    return { nodes: [{ type: "neutral" }], count: 1 };
  }

  // Separator
  if (image === ">") {
    return { nodes: [{ type: "separator" }], count: 1 };
  }

  // Attack button (LP/RP/LK/RK) or wide button (WP/WK)
  if (tok.tokenType === AttackButtonToken || tok.tokenType === WideButtonToken) {
    const buttons: Button[] = [];
    buttons.push(...expandButtons(image as AttackTokenImage));
    let count = 1;
    while (indexOk(tokens, start + count) &&
           tokens[start + count].image === "+") {
      // Skip '+'
      count += 1;
      if (!indexOk(tokens, start + count)) {
        break;
      }
      const nextTok = tokens[start + count];
      if (nextTok.tokenType !== AttackButtonToken &&
          nextTok.tokenType !== WideButtonToken) {
        break;
      }
      buttons.push(...expandButtons(nextTok.image as AttackTokenImage));
      count += 1;
    }
    return { nodes: [{ type: "attack", buttons: deduplicate(buttons) }], count };
  }

  // Slide press [ AttackButton AttackButton ... ]
  if (image === "[") {
    const nodes: Node[] = [{ type: "slide-start" }];
    let count = 1;
    while (indexOk(tokens, start + count)) {
      const t = tokens[start + count];
      if (t.image === "]") {
        nodes.push({ type: "slide-end" });
        count += 1;
        return { nodes, count };
      }
      if (t.tokenType !== AttackButtonToken) {
        // 不正なトークン: ここで打ち切り（構文解析で別途検出される）。
        break;
      }
      nodes.push({ type: "attack", buttons: [t.image as Button] });
      count += 1;
    }
    return { nodes, count };
  }

  // Text "..."
  if (image.startsWith('"') && image.endsWith('"')) {
    return { nodes: [{ type: "text", value: image.slice(1, -1) }], count: 1 };
  }

  // Icon :...: などは Node を生成しない
  return null;
}

function indexOk(tokens: any[], index: number): boolean {
  return index < tokens.length;
}

export function parse(input: string): Diagram {
  if (Array.from(input).length > 200) {
    throw new Error("Input exceeds maximum length of 200 characters");
  }

  const lexResult = TekkenLexer.tokenize(input);

  if (lexResult.errors.length > 0) {
    throw new Error(lexResult.errors[0].message);
  }

  parser.input = lexResult.tokens;
  parser.diagram();

  if (parser.errors.length > 0) {
    throw new Error(parser.errors[0].message);
  }

  return { nodes: collapseNewlines(buildNodes(lexResult.tokens)) };
}
