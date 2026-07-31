import { describe, it, expect } from "vitest";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
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
    expect(svg).toContain('fill="#000000"');
    expect(svg).toContain('fill="#ffffff"');
    expect(svg).not.toContain('fill="none"');
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
    expect(svg).not.toContain("font-family=");
  });

  it("applies a configured text font family", () => {
    const svg = generateSvg(parse('"Text"'), {
      ...DEFAULT_SETTINGS,
      fontFamily: "monospace",
    });
    expect(svg).toContain('font-family="monospace"');
  });

  it("escapes XML characters in text", () => {
    const svg = generateSvg(parse('"<&>あ"'), DEFAULT_SETTINGS);
    expect(svg).toContain("&lt;&amp;&gt;あ");

    const document = new DOMParser().parseFromString(svg, "image/svg+xml");
    expect(document.querySelector("parsererror")).toBeNull();
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

  it("assigns unique IDs to repeated shapes", () => {
    const svg = generateSvg(parse("66"), DEFAULT_SETTINGS);
    expect(svg).toContain('id="arrow-right-instance-1"');
    expect(svg).toContain('id="arrow-right-instance-2"');
    expect(svg).toContain('id="arrow-right-1"');
    expect(svg).toContain('id="arrow-right-2"');
  });

  it("generates well-formed SVG XML", () => {
    const svg = generateSvg(parse('4LP+RK > [LKRP] "(T)"'), DEFAULT_SETTINGS);
    const document = new DOMParser().parseFromString(svg, "image/svg+xml");
    expect(document.querySelector("parsererror")).toBeNull();
  });

  it("writes a representative diagram SVG", () => {
    const outputDirectory = join(process.cwd(), "test-output");
    const outputPath = join(outputDirectory, "representative-command.svg");
    const svg = generateSvg(
      parse('789 > 4LP+RK > [LKRP] "Example"'),
      DEFAULT_SETTINGS,
    );

    mkdirSync(outputDirectory, { recursive: true });
    writeFileSync(outputPath, svg, "utf-8");

    const writtenSvg = readFileSync(outputPath, "utf-8");
    const document = new DOMParser().parseFromString(writtenSvg, "image/svg+xml");
    expect(document.querySelector("parsererror")).toBeNull();
    expect(writtenSvg).toContain("Example");
    expect(writtenSvg).toContain('fill="#000000"');
  });
});

describe("Error SVG", () => {
  it("generates error SVG", () => {
    const svg = generateErrorSvg("Syntax error");
    expect(svg).toContain("ERROR: Syntax error");
    expect(svg).toContain("<svg");
    expect(svg).toContain('fill="red"');
  });

  it("escapes XML in error message", () => {
    const svg = generateErrorSvg("<invalid>");
    expect(svg).toContain("&lt;invalid&gt;");
  });
});
