import type { App } from "obsidian";

export type ShapeDefinition = {
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
};

export type ShapeDefinitions = Record<string, ShapeDefinition>;

export const REQUIRED_SHAPE_IDS = [
  "arrow-right",
  "neutral-star",
  "slide-left",
  "slide-right",
  "separator",
  "attack",
] as const;

function assertRequiredShapes(shapes: ShapeDefinitions): void {
  const missing = REQUIRED_SHAPE_IDS.filter((id) => !shapes[id]);
  if (missing.length > 0) {
    throw new Error(`Missing required shapes: ${missing.join(", ")}`);
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
  mountedSvg.setAttribute(
    "style",
    "position:absolute;visibility:hidden;width:0;height:0;overflow:hidden",
  );
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
      shapes[id] = {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        content,
      };
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
): Promise<ShapeDefinitions> {
  const directory =
    pluginDirectory ?? `${app.vault.configDir}/plugins/${pluginId}`;
  const path = `${directory}/shapes.svg`;
  let svgText: string;
  try {
    svgText = await app.vault.adapter.read(path);
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : "";
    throw new Error(`Unable to read shapes.svg at "${path}"${detail}`);
  }

  return extractShapeDefinitions(svgText);
}
