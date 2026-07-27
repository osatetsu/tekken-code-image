import { describe, it, expect } from "vitest";
import { parse } from "../src/parser";
import { generateSvg, generateErrorSvg } from "../src/svg/generator";
import { DEFAULT_SETTINGS } from "../src/types";

describe("SVG Generator", () => {
  it("generates SVG for arrow", () => {
    const diagram = parse("6");
    const svg = generateSvg(diagram, DEFAULT_SETTINGS);
    expect(svg).toContain("<svg");
    expect(svg.length).toBeGreaterThan(50);
  });

  it("generates SVG for neutral", () => {
    const diagram = parse("n");
    const svg = generateSvg(diagram, DEFAULT_SETTINGS);
    expect(svg).toContain("<svg");
    expect(svg.length).toBeGreaterThan(50);
  });

  it("generates SVG for attack", () => {
    const diagram = parse("LP");
    const svg = generateSvg(diagram, DEFAULT_SETTINGS);
    expect(svg).toContain("<svg");
    expect(svg).toContain("circle");
  });

  it("generates SVG for separator", () => {
    const diagram = parse(">");
    const svg = generateSvg(diagram, DEFAULT_SETTINGS);
    expect(svg).toContain("<svg");
    expect(svg.length).toBeGreaterThan(50);
  });

  it("generates SVG for text", () => {
    const diagram = parse('"(T)"');
    const svg = generateSvg(diagram, DEFAULT_SETTINGS);
    expect(svg).toContain("<text");
    expect(svg).toContain("(T)");
  });

  it("generates SVG for slide", () => {
    const diagram = parse("[LKRP]");
    const svg = generateSvg(diagram, DEFAULT_SETTINGS);
    expect(svg).toContain("<svg");
    expect(svg).toContain("circle");
  });

  it("returns empty string for empty diagram", () => {
    const result = generateSvg({ nodes: [] }, DEFAULT_SETTINGS);
    expect(result).toBe("");
  });

  it("applies debug mode", () => {
    const diagram = parse("6");
    const svg = generateSvg(diagram, { ...DEFAULT_SETTINGS, debugMode: true });
    expect(svg).toContain("stroke=\"red\"");
  });
});

describe("Error SVG", () => {
  it("generates error SVG", () => {
    const svg = generateErrorSvg("Syntax error");
    expect(svg).toContain("ERROR: Syntax error");
    expect(svg).toContain("<svg");
  });

  it("escapes XML in error message", () => {
    const svg = generateErrorSvg("<invalid>");
    expect(svg).toContain("&lt;invalid&gt;");
  });
});
