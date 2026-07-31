import type { App, PluginManifest } from "obsidian";
import { afterAll, describe, expect, it, vi } from "vitest";
import {
  extractShapeDefinitions,
  loadShapeDefinitions,
} from "../src/svg/shapes";
import shapesSvg from "./svg-mock";

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

  it("loads the deployed asset from the plugin directory", async () => {
    const read = vi.fn().mockResolvedValue(shapesSvg);
    const app = {
      vault: {
        configDir: ".obsidian",
        adapter: { read },
      },
    } as unknown as App;
    const manifest = { id: "obsidian-tekken-code-image" } as PluginManifest;

    await expect(loadShapeDefinitions(app, manifest)).resolves.toHaveProperty(
      "attack",
    );
    expect(read).toHaveBeenCalledWith(
      ".obsidian/plugins/obsidian-tekken-code-image/shapes.svg",
    );
  });
});

afterAll(() => getBounds.mockRestore());
