import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const shapesSvg = readFileSync(join(__dirname, "../src/svg/shapes.svg"), "utf-8");

test.describe("SVG shapes", () => {
  test("generate shape data JSON", async ({ page }) => {
    await page.setContent(`<!DOCTYPE html><html><body><div id="c"></div></body></html>`);

    const shapeData = await page.evaluate((svgString) => {
      const container = document.getElementById("c")!;
      container.innerHTML = svgString;
      const result: Record<string, { x: number; y: number; width: number; height: number; content: string }> = {};
      const serializer = new XMLSerializer();

      const paths = container.querySelectorAll("path[id]");
      for (const path of paths) {
        const id = path.getAttribute("id")!;
        if (id === "svg1" || id === "layer1") continue;
        const bbox = path.getBBox();
        result[id] = { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height, content: serializer.serializeToString(path) };
      }

      const groups = container.querySelectorAll("g[id]");
      for (const group of groups) {
        const id = group.getAttribute("id")!;
        if (id === "svg1" || id === "layer1") continue;
        const bbox = group.getBBox();
        let innerContent = "";
        for (const child of Array.from(group.childNodes)) {
          innerContent += serializer.serializeToString(child);
        }
        result[id] = { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height, content: innerContent };
      }

      return result;
    }, shapesSvg);

    console.log("=== Shape Data ===");
    console.log(JSON.stringify(shapeData, null, 2));

    const outputDir = join(__dirname, "../src/svg");
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(join(outputDir, "shapes-data.json"), JSON.stringify(shapeData, null, 2));

    for (const [id, data] of Object.entries(shapeData)) {
      expect(data.width, `${id} width`).toBeGreaterThan(0);
      expect(data.height, `${id} height`).toBeGreaterThan(0);
    }
  });
});
