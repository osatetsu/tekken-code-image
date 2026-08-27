import type { Button, Diagram, Node, Settings } from "../types";
import { DEFAULT_SETTINGS } from "../types";
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

function getShapeBounds(
  shape: ShapeDefinition,
  shapeSize: number,
  angle = 0,
): Bounds {
  const scale = getScale(shape, shapeSize);
  const bounds = shape.rotatedBounds?.[angle] ?? shape;
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
  return `<text id="text-${instanceId}" x="${x}" y="${baseline}" font-size="${settings.fontSize}" fill="${escapeXml(settings.textFillColor)}" stroke="${escapeXml(settings.textStrokeColor)}" stroke-width="${settings.textStrokeWidth}" stroke-linejoin="round" paint-order="stroke fill"${fontFamily}>${escapeXml(value)}</text>`;
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

  // Split nodes into rows at newline boundaries while measuring each node's bounds.
  type MeasuredNode = { node: Node; bounds: Bounds };
  const lines: MeasuredNode[][] = [[]];
  for (const node of diagram.nodes) {
    if (node.type === "newline") {
      lines.push([]);
      continue;
    }
    const bounds = getNodeBounds(node, mergedSettings, shapes);
    lines[lines.length - 1].push({ node, bounds });
  }

  const { shapeSize, padding, margin } = mergedSettings;

  // Drop trailing empty lines (e.g. from a final newline). Empty intermediate
  // lines are preserved because they create intentional vertical gaps.
  while (lines.length > 1 && lines[lines.length - 1].length === 0) {
    lines.pop();
  }

  const computeLineWidth = (line: MeasuredNode[]): number => {
    if (line.length === 0) {
      return 0;
    }
    const total = line.reduce((sum, { bounds }) => sum + bounds.width, 0);
    return total + padding * (line.length - 1);
  };

  let contentWidth = 0;
  for (const line of lines) {
    contentWidth = Math.max(contentWidth, computeLineWidth(line));
  }
  const width = contentWidth + margin * 2;
  const lineAdvance = shapeSize + padding;
  const rowCount = Math.max(1, lines.length);
  const totalContentHeight =
    rowCount === 1
      ? contentHeight
      : contentHeight + (rowCount - 1) * lineAdvance;
  const height = totalContentHeight + margin * 2;

  const elements: string[] = [];
  let instanceId = 0;
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const lineY = margin + lineIndex * lineAdvance;
    const lineElements: string[] = [];
    let x = margin;
    for (const { node, bounds } of line) {
      instanceId += 1;
      lineElements.push(
        renderNode(
          node,
          shapes,
          bounds,
          x,
          contentHeight,
          instanceId,
          mergedSettings,
        ),
      );
      if (mergedSettings.debugMode) {
        lineElements.push(
          `<rect x="${x}" y="${lineY + (contentHeight - bounds.height) / 2}" width="${bounds.width}" height="${bounds.height}" fill="none" stroke="red" stroke-width="1"/>`,
        );
      }
      x += bounds.width + padding;
    }
    if (lineElements.length === 0) {
      // Empty line: render nothing but reserve the vertical space via the wrapper.
      elements.push(
        `<g transform="translate(0 ${lineY})" data-empty-line="true"></g>`,
      );
      continue;
    }
    elements.push(
      `<g transform="translate(0 ${lineY})">\n      ${lineElements.join("\n      ")}\n    </g>`,
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${elements.join("\n  ")}
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
