import type { App } from "obsidian";
import { afterAll, describe, expect, it, vi } from "vitest";
import {
  extractShapeDefinitions,
  loadShapeDefinitions,
} from "../src/svg/shapes";
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

  it("loads the deployed asset from the manifest plugin directory", async () => {
    const read = vi.fn().mockResolvedValue(shapesSvg);
    const app = {
      vault: {
        configDir: ".obsidian",
        adapter: { read },
      },
    } as unknown as App;
    await expect(
      loadShapeDefinitions(
        app,
        ".obsidian/plugins/tekken-code-image",
        "tekken-code-image",
        "<svg />",
      ),
    ).resolves.toHaveProperty("attack");
    expect(read).toHaveBeenCalledWith(
      ".obsidian/plugins/tekken-code-image/shapes.svg",
    );
  });

  it("falls back to an ID-based path when the manifest directory is unavailable", async () => {
    const read = vi.fn().mockResolvedValue(shapesSvg);
    const app = {
      vault: {
        configDir: ".obsidian",
        adapter: { read },
      },
    } as unknown as App;

    await expect(
      loadShapeDefinitions(
        app,
        undefined,
        "tekken-code-image",
        "<svg />",
      ),
    ).resolves.toHaveProperty("attack");
    expect(read).toHaveBeenCalledWith(
      ".obsidian/plugins/tekken-code-image/shapes.svg",
    );
  });

  it("uses the embedded SVG when the deployed asset is unavailable", async () => {
    const app = {
      vault: {
        configDir: ".obsidian",
        adapter: { read: vi.fn().mockRejectedValue(new Error("not found")) },
      },
    } as unknown as App;

    await expect(
      loadShapeDefinitions(
        app,
        ".obsidian/plugins/tekken-code-image",
        "tekken-code-image",
        shapesSvg,
      ),
    ).resolves.toHaveProperty("attack");
  });
});

afterAll(() => getBounds.mockRestore());
