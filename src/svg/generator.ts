import type { Button, Diagram, Node, Settings } from "../types";
import { DEFAULT_SETTINGS } from "../types";
import manifest from "../../manifest.json";
import {
  REQUIRED_SHAPE_IDS,
  type ShapeDefinition,
  type ShapeDefinitions,
} from "./shapes";

type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const ARROW_ANGLES: Record<number, number> = {
  6: 0,
  9: -45,
  8: -90,
  7: -135,
  4: 180,
  1: 135,
  2: 90,
  3: 45,
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function validateShapes(shapes: ShapeDefinitions): void {
  const missing = REQUIRED_SHAPE_IDS.filter((id) => !shapes[id]);
  if (missing.length > 0) {
    throw new Error(`Missing required shapes: ${missing.join(", ")}`);
  }
}

function getScale(shape: ShapeDefinition, shapeSize: number): number {
  const largestSide = Math.max(shape.width, shape.height);
  return largestSide > shapeSize ? shapeSize / largestSide : 1;
}

function rotateBounds(bounds: Bounds, angle: number): Bounds {
  if (angle === 0) {
    return bounds;
  }

  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const corners = [
    [bounds.x, bounds.y],
    [bounds.x + bounds.width, bounds.y],
    [bounds.x, bounds.y + bounds.height],
    [bounds.x + bounds.width, bounds.y + bounds.height],
  ];
  const rotated = corners.map(([x, y]) => ({
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  }));
  const xs = rotated.map((point) => point.x);
  const ys = rotated.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);

  return {
    x: minX,
    y: minY,
    width: Math.max(...xs) - minX,
    height: Math.max(...ys) - minY,
  };
}

function getShapeBounds(
  shape: ShapeDefinition,
  shapeSize: number,
  angle = 0,
): Bounds {
  const scale = getScale(shape, shapeSize);
  const bounds = rotateBounds(
    {
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height,
    },
    angle,
  );
  return {
    x: bounds.x * scale,
    y: bounds.y * scale,
    width: bounds.width * scale,
    height: bounds.height * scale,
  };
}

function measureTextWidth(text: string, settings: Settings): number {
  if (typeof document === "undefined") {
    return Array.from(text).length * settings.fontSize * 0.6;
  }

  const context = document.createElement("canvas").getContext("2d");
  if (!context) {
    return Array.from(text).length * settings.fontSize * 0.6;
  }

  context.font = settings.fontFamily
    ? `${settings.fontSize}px ${settings.fontFamily}`
    : `${settings.fontSize}px sans-serif`;
  return context.measureText(text).width;
}

function getNodeBounds(
  node: Node,
  settings: Settings,
  shapes: ShapeDefinitions,
): Bounds {
  if (node.type === "text") {
    return {
      x: 0,
      y: 0,
      width: Math.ceil(measureTextWidth(node.value, settings)),
      height: settings.fontSize,
    };
  }

  if (node.type === "arrow") {
    return getShapeBounds(
      shapes["arrow-right"],
      settings.shapeSize,
      ARROW_ANGLES[node.direction],
    );
  }

  const shapeId =
    node.type === "neutral"
      ? "neutral-star"
      : node.type === "attack"
        ? "attack"
        : node.type === "slide-start"
          ? "slide-left"
          : node.type === "slide-end"
            ? "slide-right"
            : "separator";
  return getShapeBounds(shapes[shapeId], settings.shapeSize);
}

function prefixIds(content: string, instanceId: number): string {
  return content.replace(/\bid="([^"]+)"/g, (_match, id: string) => {
    return `id="${id}-${instanceId}"`;
  });
}

function renderAttackContent(
  content: string,
  buttons: Button[],
  settings: Settings,
): string {
  let result = content;
  for (const button of ["LP", "RP", "LK", "RK"] as Button[]) {
    const color = buttons.includes(button)
      ? settings.attackColors[button].pressed
      : settings.attackColors[button].unpressed;
    const circle = new RegExp(
      `<circle\\b(?=[^>]*\\bid="${button}")[^>]*>`,
      "g",
    );
    result = result.replace(circle, (tag) => {
      const fill = `fill="${escapeXml(color)}"`;
      return /\bfill="[^"]*"/.test(tag)
        ? tag.replace(/\bfill="[^"]*"/, fill)
        : tag.replace("<circle", `<circle ${fill}`);
    });
  }
  return result;
}

function renderShape(
  shapeId: string,
  shapes: ShapeDefinitions,
  bounds: Bounds,
  x: number,
  contentHeight: number,
  shapeSize: number,
  instanceId: number,
  angle = 0,
  attackButtons?: Button[],
  settings?: Settings,
): string {
  const shape = shapes[shapeId];
  const scale = getScale(shape, shapeSize);
  const y = (contentHeight - bounds.height) / 2;
  const transform = `translate(${x - bounds.x} ${y - bounds.y}) scale(${scale})${
    angle === 0 ? "" : ` rotate(${angle})`
  }`;
  const content =
    attackButtons && settings
      ? renderAttackContent(shape.content, attackButtons, settings)
      : shape.content;

  return `<g id="${shapeId}-instance-${instanceId}" transform="${transform}">${prefixIds(content, instanceId)}</g>`;
}

function renderText(
  value: string,
  bounds: Bounds,
  x: number,
  contentHeight: number,
  instanceId: number,
  settings: Settings,
): string {
  const baseline = contentHeight * 0.75;
  const fontFamily = settings.fontFamily
    ? ` font-family="${escapeXml(settings.fontFamily)}"`
    : "";
  return `<text id="text-${instanceId}" x="${x}" y="${baseline}" font-size="${settings.fontSize}"${fontFamily}>${escapeXml(value)}</text>`;
}

function renderNode(
  node: Node,
  shapes: ShapeDefinitions,
  bounds: Bounds,
  x: number,
  contentHeight: number,
  instanceId: number,
  settings: Settings,
): string {
  if (node.type === "text") {
    return renderText(node.value, bounds, x, contentHeight, instanceId, settings);
  }

  if (node.type === "arrow") {
    return renderShape(
      "arrow-right",
      shapes,
      bounds,
      x,
      contentHeight,
      settings.shapeSize,
      instanceId,
      ARROW_ANGLES[node.direction],
    );
  }

  if (node.type === "attack") {
    return renderShape(
      "attack",
      shapes,
      bounds,
      x,
      contentHeight,
      settings.shapeSize,
      instanceId,
      0,
      node.buttons,
      settings,
    );
  }

  const shapeId =
    node.type === "neutral"
      ? "neutral-star"
      : node.type === "slide-start"
        ? "slide-left"
        : node.type === "slide-end"
          ? "slide-right"
          : "separator";
  return renderShape(
    shapeId,
    shapes,
    bounds,
    x,
    contentHeight,
    settings.shapeSize,
    instanceId,
  );
}

function mergeSettings(settings?: Partial<Settings>): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    attackColors: {
      ...DEFAULT_SETTINGS.attackColors,
      ...settings?.attackColors,
    },
  };
}

export function generateSvg(
  diagram: Diagram,
  settings: Partial<Settings> | undefined,
  shapes: ShapeDefinitions,
): string {
  if (diagram.nodes.length === 0) {
    return "";
  }

  validateShapes(shapes);
  const mergedSettings = mergeSettings(settings);
  const contentHeight = Math.max(mergedSettings.shapeSize, mergedSettings.fontSize);
  const measuredNodes = diagram.nodes.map((node) => ({
    node,
    bounds: getNodeBounds(node, mergedSettings, shapes),
  }));
  const contentWidth =
    measuredNodes.reduce((total, { bounds }) => total + bounds.width, 0) +
    mergedSettings.padding * (measuredNodes.length - 1);
  const width = contentWidth + mergedSettings.margin * 2;
  const height = contentHeight + mergedSettings.margin * 2;

  let x = mergedSettings.margin;
  const elements: string[] = [];
  for (let index = 0; index < measuredNodes.length; index += 1) {
    const { node, bounds } = measuredNodes[index];
    elements.push(
      renderNode(
        node,
        shapes,
        bounds,
        x,
        contentHeight,
        index + 1,
        mergedSettings,
      ),
    );
    if (mergedSettings.debugMode) {
      elements.push(
        `<rect x="${x}" y="${(contentHeight - bounds.height) / 2}" width="${bounds.width}" height="${bounds.height}" fill="none" stroke="red" stroke-width="1"/>`,
      );
    }
    x += bounds.width + mergedSettings.padding;
  }
  if (mergedSettings.debugMode) {
    elements.push(
      `<text x="0" y="${contentHeight - 2}" font-size="16">${escapeXml(manifest.version)}</text>`,
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <g transform="translate(0 ${mergedSettings.margin})">
    ${elements.join("\n    ")}
  </g>
</svg>`;
}

export function generateErrorSvg(errorMessage: string): string {
  const width = 480;
  const height = 24;
  const fontSize = 16;
  const x = 8;
  const baseline = 17;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><text x="${x}" y="${baseline}" fill="red" font-size="${fontSize}">ERROR: ${escapeXml(errorMessage)}</text></svg>`;
}
