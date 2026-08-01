import { expect, test } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { parse } from "../src/parser";
import { generateSvg } from "../src/svg/generator";
import { DEFAULT_SETTINGS } from "../src/types";
import type { ShapeDefinitions } from "../src/svg/shapes";

const shapesSvg = readFileSync(join(__dirname, "../src/svg/shapes.svg"), "utf-8");

test.describe("Rendered Tekken diagram", () => {
  test("writes a debug rendering for the specification's basic directions", async ({ page }) => {
    const outputDirectory = join(__dirname, "../test-output");
    const svgPath = join(outputDirectory, "basic-directions-debug.svg");
    const pngPath = join(outputDirectory, "basic-directions-debug.png");
    await page.setContent(shapesSvg);
    const shapes = await page.locator("svg").evaluate((svg) => {
      const measurementViewBox = { x: -100, y: -100, width: 200, height: 200 };
      svg.setAttribute("width", "1000");
      svg.setAttribute("height", "1000");
      svg.setAttribute(
        "viewBox",
        `${measurementViewBox.x} ${measurementViewBox.y} ${measurementViewBox.width} ${measurementViewBox.height}`,
      );
      svg.setAttribute(
        "style",
        "position:fixed;left:-10000px;top:0;visibility:hidden;overflow:hidden",
      );
      const ids = [
        "arrow-right",
        "neutral-star",
        "slide-left",
        "slide-right",
        "separator",
        "attack",
      ];
      const serializer = new XMLSerializer();
      return Object.fromEntries(
        ids.map((id) => {
          const element = svg.querySelector<SVGGraphicsElement>(`#${id}`);
          if (!element) {
            throw new Error(`Missing shape: ${id}`);
          }
          const bounds = element.getBBox();
          const content =
            element instanceof SVGGElement
              ? Array.from(element.childNodes)
                  .map((child) => serializer.serializeToString(child))
                  .join("")
              : serializer.serializeToString(element);
          const shape = {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            content,
          };
          if (id === "arrow-right") {
            const svgRect = svg.getBoundingClientRect();
            const scale = svgRect.width / measurementViewBox.width;
            const rotatedBounds = Object.fromEntries(
              [-135, -90, -45, 45, 90, 135, 180].flatMap((angle) => {
                const group = document.createElementNS(
                  "http://www.w3.org/2000/svg",
                  "g",
                );
                group.setAttribute("transform", `rotate(${angle})`);
                group.appendChild(element.cloneNode(true));
                svg.appendChild(group);
                const rect = group.getBoundingClientRect();
                group.remove();
                return [
                  [
                    angle,
                    {
                      x:
                        measurementViewBox.x +
                        (rect.left - svgRect.left) / scale,
                      y:
                        measurementViewBox.y +
                        (rect.top - svgRect.top) / scale,
                      width: rect.width / scale,
                      height: rect.height / scale,
                    },
                  ],
                ];
              }),
            );
            Object.assign(shape, { rotatedBounds });
          }
          return [
            id,
            shape,
          ];
        }),
      );
    });
    const generatedSvg = generateSvg(
      parse("789 > 4n6 > 123"),
      { ...DEFAULT_SETTINGS, debugMode: true },
      shapes as ShapeDefinitions,
    );

    mkdirSync(outputDirectory, { recursive: true });
    writeFileSync(svgPath, generatedSvg, "utf-8");
    const svg = readFileSync(svgPath, "utf-8");
    expect(svg).toContain('stroke="red"');
    await page.setContent(`<main>${svg}</main>`);

    const diagram = page.locator("svg");
    await expect(diagram).toBeVisible();
    const box = await diagram.boundingBox();
    expect(box).not.toBeNull();
    expect(box?.width).toBeGreaterThan(0);
    expect(box?.height).toBeGreaterThan(0);

    const nodeBounds = await page.locator('g[id*="-instance-"]').evaluateAll(
      (elements) =>
        elements.map((element) => {
          const rect = element.getBoundingClientRect();
          return { left: rect.left, right: rect.right, width: rect.width };
        }),
    );
    expect(nodeBounds).toHaveLength(11);
    for (let index = 1; index < nodeBounds.length; index += 1) {
      expect(nodeBounds[index].width).toBeGreaterThan(0);
      expect(nodeBounds[index].left).toBeGreaterThanOrEqual(
        nodeBounds[index - 1].right,
      );
    }

    await diagram.screenshot({ path: pngPath });
  });
});
