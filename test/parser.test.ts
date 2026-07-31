import { describe, it, expect } from "vitest";
import { parse } from "../src/parser";

describe("Lexer", () => {
  it("tokenizes direction numbers", () => {
    const result = parse("123");
    expect(result.nodes).toEqual([
      { type: "arrow", direction: 1 },
      { type: "arrow", direction: 2 },
      { type: "arrow", direction: 3 },
    ]);
  });

  it("tokenizes neutral", () => {
    const result = parse("n");
    expect(result.nodes).toEqual([{ type: "neutral" }]);
  });

  it("tokenizes attack buttons", () => {
    const result = parse("LP");
    expect(result.nodes).toEqual([{ type: "attack", buttons: ["LP"] }]);
  });

  it("expands WP to LP and RP", () => {
    const result = parse("WP");
    expect(result.nodes).toEqual([{ type: "attack", buttons: ["LP", "RP"] }]);
  });

  it("expands WK to LK and RK", () => {
    const result = parse("WK");
    expect(result.nodes).toEqual([{ type: "attack", buttons: ["LK", "RK"] }]);
  });

  it("handles plus separator for attacks", () => {
    const result = parse("LP+RK");
    expect(result.nodes).toEqual([{ type: "attack", buttons: ["LP", "RK"] }]);
  });

  it("expands wide buttons in a combined press", () => {
    const result = parse("WP+WK");
    expect(result.nodes).toEqual([
      { type: "attack", buttons: ["LP", "RP", "LK", "RK"] },
    ]);
  });

  it("tokenizes separator", () => {
    const result = parse(">");
    expect(result.nodes).toEqual([{ type: "separator" }]);
  });

  it("tokenizes text", () => {
    const result = parse('"(T)"');
    expect(result.nodes).toEqual([{ type: "text", value: "(T)" }]);
  });

  it("tokenizes slide brackets", () => {
    const result = parse("[LKRP]");
    expect(result.nodes).toEqual([
      { type: "slide-start" },
      { type: "attack", buttons: ["LK"] },
      { type: "attack", buttons: ["RP"] },
      { type: "slide-end" },
    ]);
  });

  it("ignores spaces and commas", () => {
    const result = parse("4 LP , RK");
    expect(result.nodes).toEqual([
      { type: "arrow", direction: 4 },
      { type: "attack", buttons: ["LP"] },
      { type: "attack", buttons: ["RK"] },
    ]);
  });

  it("preserves element order", () => {
    const result = parse("4LPnRK");
    expect(result.nodes).toEqual([
      { type: "arrow", direction: 4 },
      { type: "attack", buttons: ["LP"] },
      { type: "neutral" },
      { type: "attack", buttons: ["RK"] },
    ]);
  });

  it("accepts icons without rendering nodes", () => {
    const result = parse("4:example1:LP");
    expect(result.nodes).toEqual([
      { type: "arrow", direction: 4 },
      { type: "attack", buttons: ["LP"] },
    ]);
  });

  it("handles complex sequence", () => {
    const result = parse('4LP+RK > 9RK > 3LKRP > 3LKRPLK "(T)" > 66 > 6WP');
    expect(result.nodes.length).toBeGreaterThan(0);
  });
});

describe("Parser Errors", () => {
  it("accepts consecutive separators", () => {
    expect(parse("LP >> RP").nodes).toEqual([
      { type: "attack", buttons: ["LP"] },
      { type: "separator" },
      { type: "separator" },
      { type: "attack", buttons: ["RP"] },
    ]);
  });

  it("throws on empty slide", () => {
    expect(() => parse("[]")).toThrow();
  });

  it("throws on single button in slide", () => {
    expect(() => parse("[LP]")).toThrow();
  });

  it("throws on direction inside slide", () => {
    expect(() => parse("[LKP2]")).toThrow();
  });

  it("throws when input exceeds 200 characters", () => {
    expect(() => parse("6".repeat(201))).toThrow("maximum length");
  });

  it("throws on a double quote inside text", () => {
    expect(() => parse('"a"b"')).toThrow();
  });

  it("throws on empty text", () => {
    expect(() => parse('""')).toThrow();
  });

  it("throws on an icon that starts with a number", () => {
    expect(() => parse(":1example:")).toThrow();
  });
});
