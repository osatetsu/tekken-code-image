import type { App } from "obsidian";
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
        ".obsidian/plugins/obsidian_tekken_code_image",
        "obsidian-tekken-code-image",
      ),
    ).resolves.toHaveProperty("attack");
    expect(read).toHaveBeenCalledWith(
      ".obsidian/plugins/obsidian_tekken_code_image/shapes.svg",
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
      loadShapeDefinitions(app, undefined, "obsidian-tekken-code-image"),
    ).resolves.toHaveProperty("attack");
    expect(read).toHaveBeenCalledWith(
      ".obsidian/plugins/obsidian-tekken-code-image/shapes.svg",
    );
  });

  it("reports a missing deployed SVG", async () => {
    const app = {
      vault: {
        configDir: ".obsidian",
        adapter: { read: vi.fn().mockRejectedValue(new Error("not found")) },
      },
    } as unknown as App;

    await expect(
      loadShapeDefinitions(
        app,
        ".obsidian/plugins/obsidian_tekken_code_image",
        "obsidian-tekken-code-image",
      ),
    ).rejects.toThrow(
      'Unable to read shapes.svg at ".obsidian/plugins/obsidian_tekken_code_image/shapes.svg": not found',
    );
  });
});

afterAll(() => getBounds.mockRestore());
