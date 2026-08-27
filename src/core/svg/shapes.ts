export type ShapeDefinition = {
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  rotatedBounds?: Partial<Record<number, ShapeBounds>>;
};

export type ShapeBounds = Omit<ShapeDefinition, "content" | "rotatedBounds">;

export type ShapeDefinitions = Record<string, ShapeDefinition>;

export const REQUIRED_SHAPE_IDS = [
  "arrow-right",
  "neutral-star",
  "slide-left",
  "slide-right",
  "separator",
  "attack",
] as const;

const ARROW_ANGLES = [-135, -90, -45, 45, 90, 135, 180];
const MEASUREMENT_VIEW_BOX = { x: -100, y: -100, width: 200, height: 200 };

function assertRequiredShapes(shapes: ShapeDefinitions): void {
  const missing = REQUIRED_SHAPE_IDS.filter((id) => !shapes[id]);
  if (missing.length > 0) {
    throw new Error(`Missing required shapes: ${missing.join(", ")}`);
  }
}

/**
 * 計測用に SVG を画面外へ退避させる。
 * - Obsidian の HTMLElement 拡張 setCssProps がある環境では、それを使って
 *   `obsidianmd/no-static-styles-assignment` ルールに適合する。
 * - Web / Vitest / Playwright など setCssProps が無い環境では style 属性で隠す。
 * どちらの経路でも `<style>` 要素は作成しない（Obsidian で許可されていないため）。
 */
function hideForMeasurement(svg: SVGElement): void {
  const setCssProps = (svg as unknown as {
    setCssProps?: (props: Record<string, string>) => void;
  }).setCssProps;
  if (typeof setCssProps === "function") {
    setCssProps({
      position: "fixed",
      left: "-10000px",
      top: "0",
      visibility: "hidden",
      overflow: "hidden",
    });
    return;
  }
  svg.setAttribute(
    "style",
    "position:fixed;left:-10000px;top:0;visibility:hidden;overflow:hidden",
  );
}

function getStrokeMargin(element: SVGGraphicsElement): number {
  if (typeof getComputedStyle === "undefined") return 0;
  const strokeWidth = Number.parseFloat(getComputedStyle(element).strokeWidth);
  return Number.isFinite(strokeWidth) && strokeWidth > 0 ? strokeWidth / 2 : 0;
}

function inflateBounds(
  bounds: ShapeBounds,
  margin: number,
): ShapeBounds {
  if (margin <= 0) return bounds;
  return {
    x: bounds.x - margin,
    y: bounds.y - margin,
    width: bounds.width + margin * 2,
    height: bounds.height + margin * 2,
  };
}

/**
 * 回転した矢印の bounding box を取得する。
 * SPEC に基づき、`getBBox()` で取得した幾何学的範囲にストロークの半幅を
 * 四方のマージンとして加算する。これにより斜め方向での意図しない膨張を避けつつ、
 * ストロークを含む実際の見た目に近い範囲を隣接パディングに反映できる。
 */
function measureRotatedArrowBounds(
  svg: Element,
  arrow: SVGGraphicsElement,
  angle: number,
): ShapeBounds | undefined {
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("transform", `rotate(${angle})`);
  group.appendChild(arrow.cloneNode(true));
  svg.appendChild(group);

  try {
    const bounds = group.getBBox();
    if (bounds.width <= 0 || bounds.height <= 0) {
      return undefined;
    }
    return inflateBounds(
      {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      },
      getStrokeMargin(arrow),
    );
  } finally {
    group.remove();
  }
}

export function extractShapeDefinitions(svgText: string): ShapeDefinitions {
  const parsed = new DOMParser().parseFromString(svgText, "image/svg+xml");
  if (parsed.querySelector("parsererror")) {
    throw new Error("Invalid shapes.svg XML");
  }

  const svg = parsed.documentElement;
  if (svg.localName !== "svg") {
    throw new Error("shapes.svg must have an SVG root element");
  }

  const mountedSvg = document.importNode(svg, true) as unknown as SVGElement;
  mountedSvg.setAttribute("width", "1000");
  mountedSvg.setAttribute("height", "1000");
  mountedSvg.setAttribute(
    "viewBox",
    `${MEASUREMENT_VIEW_BOX.x} ${MEASUREMENT_VIEW_BOX.y} ${MEASUREMENT_VIEW_BOX.width} ${MEASUREMENT_VIEW_BOX.height}`,
  );
  hideForMeasurement(mountedSvg);
  document.body.appendChild(mountedSvg);

  try {
    const serializer = new XMLSerializer();
    const shapes: ShapeDefinitions = {};
    for (const id of REQUIRED_SHAPE_IDS) {
      const element = mountedSvg.querySelector<SVGGraphicsElement>(
        `[id="${id}"]`,
      );
      if (!element) {
        continue;
      }

      const bounds = element.getBBox();
      if (bounds.width <= 0 || bounds.height <= 0) {
        throw new Error(`Shape "${id}" has invalid bounds`);
      }

      const content =
        element instanceof SVGGElement
          ? Array.from(element.childNodes)
              .map((child) => serializer.serializeToString(child))
              .join("")
          : serializer.serializeToString(element);
      const shape: ShapeDefinition = {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        content,
      };
      if (id === "arrow-right") {
        const rotatedBounds = Object.fromEntries(
          ARROW_ANGLES.flatMap((angle) => {
            const rotated = measureRotatedArrowBounds(mountedSvg, element, angle);
            return rotated ? [[angle, rotated]] : [];
          }),
        );
        if (Object.keys(rotatedBounds).length > 0) {
          shape.rotatedBounds = rotatedBounds;
        }
      }
      shapes[id] = shape;
    }
    assertRequiredShapes(shapes);
    return shapes;
  } finally {
    mountedSvg.remove();
  }
}
