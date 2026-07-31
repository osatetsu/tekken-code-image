import { expect, test } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { parse } from "../src/parser";
import { generateSvg } from "../src/svg/generator";
import { DEFAULT_SETTINGS } from "../src/types";

test.describe("Rendered Tekken diagram", () => {
  test("writes a browser-rendered PNG", async ({ page }) => {
    const outputDirectory = join(__dirname, "../test-output");
    const svgPath = join(outputDirectory, "representative-command.svg");
    const pngPath = join(outputDirectory, "representative-command.png");
    const generatedSvg = generateSvg(
      parse('789 > 4LP+RK > [LKRP] "Example"'),
      DEFAULT_SETTINGS,
    );

    mkdirSync(outputDirectory, { recursive: true });
    writeFileSync(svgPath, generatedSvg, "utf-8");
    const svg = readFileSync(svgPath, "utf-8");
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
