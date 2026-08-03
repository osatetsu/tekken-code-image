import type { App } from "obsidian";

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
    const svgRect = svg.getBoundingClientRect();
    const rect = group.getBoundingClientRect();
    const scale = svgRect.width / MEASUREMENT_VIEW_BOX.width;
    if (scale <= 0 || rect.width <= 0 || rect.height <= 0) {
      return undefined;
    }

    return {
      x: MEASUREMENT_VIEW_BOX.x + (rect.left - svgRect.left) / scale,
      y: MEASUREMENT_VIEW_BOX.y + (rect.top - svgRect.top) / scale,
      width: rect.width / scale,
      height: rect.height / scale,
    };
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

  const mountedSvg = document.importNode(svg, true);
  mountedSvg.setAttribute("width", "1000");
  mountedSvg.setAttribute("height", "1000");
  mountedSvg.setAttribute(
    "viewBox",
    `${MEASUREMENT_VIEW_BOX.x} ${MEASUREMENT_VIEW_BOX.y} ${MEASUREMENT_VIEW_BOX.width} ${MEASUREMENT_VIEW_BOX.height}`,
  );
  mountedSvg.setCssProps({
    position: "fixed",
    left: "-10000px",
    top: "0",
    visibility: "hidden",
    overflow: "hidden",
  });
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

export async function loadShapeDefinitions(
  app: App,
  pluginDirectory: string | undefined,
  pluginId: string,
  embeddedSvg: string,
): Promise<ShapeDefinitions> {
  const directory =
    pluginDirectory ?? `${app.vault.configDir}/plugins/${pluginId}`;
  const path = `${directory}/shapes.svg`;
  let svgText: string;
  try {
    svgText = await app.vault.adapter.read(path);
  } catch {
    svgText = embeddedSvg;
  }

  return extractShapeDefinitions(svgText);
}
