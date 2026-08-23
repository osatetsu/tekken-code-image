import { expect, test } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { parse } from "../src/parser";
import { generateSvg } from "../src/svg/generator";
import { DEFAULT_SETTINGS } from "../src/types";
import type { ShapeDefinitions } from "../src/svg/shapes";

const shapesSvg = readFileSync(
  join(__dirname, "../src/svg/shapes.svg"),
  "utf-8",
);

// Phase A: 画像出力を目的とした最小ケース集。
// 各ケースについて、デバッグモードのSVGと描画PNGを test-output/ に書き出す。
// 仕様としては:
//   - 単一改行で2行になる
//   - 3行以上になる
//   - CRLF も同じ扱い
//   - 連続改行は1つに縮約される
//   - 末尾改行は縮約のみ（画像上は末尾行を省略）
type Case = { name: string; source: string; note: string };
const CASES: Case[] = [
  { name: "single-row", source: "789 > 4n6 > 123", note: "ベースライン（単一行）" },
  { name: "two-rows", source: "6\nn", note: "単一改行で2行" },
  { name: "three-rows", source: "6\nn\n6", note: "3行" },
  { name: "collapsed-blanks", source: "6\n\n\n6", note: "連続改行は1つに縮約" },
  {
    name: "crlf-three-rows",
    source: "789 > 4n6 > 123\r\nLP RP > LK RK\r\n[LK RP]",
    note: "CRLF + 複雑な3行",
  },
  { name: "trailing-newline", source: "6\n", note: "末尾改行" },
  {
    name: "wide-varied-widths",
    source: "6\nLP RP\n[LK RP] > [LK RK]",
    note: "各行の幅が異なるケース",
  },
];

test.describe("Phase A: 画像ファイル出力", () => {
  for (const c of CASES) {
    test(`writes ${c.name}`, async ({ page }) => {
      const outputDirectory = join(__dirname, "../test-output");
      const svgPath = join(outputDirectory, `multi-line-${c.name}.svg`);
      const pngPath = join(outputDirectory, `multi-line-${c.name}.png`);

      // shapes.svg をブラウザにマウントして、ShapeDefinitions を採取する。
      await page.setContent(shapesSvg);
      const shapes = await page.locator("svg").evaluate((svg) => {
        const measurementViewBox = {
          x: -100,
          y: -100,
          width: 200,
          height: 200,
        };
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
            return [id, shape];
          }),
        );
      });

      const generatedSvg = generateSvg(
        parse(c.source),
        { ...DEFAULT_SETTINGS, debugMode: true },
        shapes as ShapeDefinitions,
      );

      mkdirSync(outputDirectory, { recursive: true });
      writeFileSync(svgPath, generatedSvg, "utf-8");

      await page.setContent(`<main>${generatedSvg}</main>`);
      const diagram = page.locator("svg");
      await expect(diagram).toBeVisible();

      await diagram.screenshot({ path: pngPath });
    });
  }
});
