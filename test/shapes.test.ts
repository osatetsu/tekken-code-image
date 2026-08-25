import { afterAll, describe, expect, it, vi } from "vitest";
import { extractShapeDefinitions } from "../src/core/svg/shapes";
import shapesSvg from "./svg-mock";

Object.defineProperty(SVGElement.prototype, "setCssProps", {
  value: vi.fn(),
  configurable: true,
});

const getBounds = vi
  .spyOn(SVGGraphicsElement.prototype, "getBBox")
  .mockReturnValue({ x: -1, y: -2, width: 3, height: 4 } as DOMRect);

describe("runtime SVG shape definitions", () => {
  it("extracts all required shapes from shapes.svg", () => {
    const shapes = extractShapeDefinitions(shapesSvg);

    expect(Object.keys(shapes)).toEqual([
      "arrow-right",
      "neutral-star",
      "slide-left",
      "slide-right",
      "separator",
      "attack",
    ]);
    expect(shapes.attack.content).toContain('id="LP"');
    expect(shapes["arrow-right"]).toMatchObject({
      x: -1,
      y: -2,
      width: 3,
      height: 4,
    });
  });

  it("rejects SVG files that omit a required shape", () => {
    const missingArrow = shapesSvg.replace('id="arrow-right"', 'id="other"');

    expect(() => extractShapeDefinitions(missingArrow)).toThrow(
      "Missing required shapes: arrow-right",
    );
  });

  it("rejects malformed SVG XML", () => {
    expect(() => extractShapeDefinitions("<svg>")).toThrow(
      "Invalid shapes.svg XML",
    );
  });
});

afterAll(() => getBounds.mockRestore());
