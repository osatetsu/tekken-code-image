import type { Diagram, Node, Settings, Button } from "../types";
import { DEFAULT_SETTINGS } from "../types";
import { readFileSync } from "fs";
import shapesData from "./shapes-data.json";

const REQUIRED_SHAPES = ["arrow-right", "neutral-star", "slide-left", "separator", "attack"];

function validateShapes(shapes: Map<string, ShapeDef>): void {
  const missing = REQUIRED_SHAPES.filter(id => !shapes.has(id));
  if (missing.length > 0) {
    throw new Error(`Missing required shapes in shapes.svg: ${missing.join(", ")}`);
  }
}

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

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function measureTextWidth(text: string, fontSize: number, fontFamily: string | null): number {
  if (typeof document === "undefined") {
    return text.length * fontSize * 0.6;
  }
  try {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.style.position = "absolute";
    svg.style.visibility = "hidden";
    document.body.appendChild(svg);

    const textEl = document.createElementNS(svgNS, "text");
    textEl.setAttribute("font-size", String(fontSize));
    if (fontFamily) textEl.setAttribute("font-family", fontFamily);
    textEl.textContent = text;
    svg.appendChild(textEl);

    const width = textEl.getComputedTextLength();
    document.body.removeChild(svg);
    return width;
  } catch {
    return text.length * fontSize * 0.6;
  }
}

interface ShapeDef {
  id: string;
  content: string;
  width: number;
  height: number;
}

function parseShapesFromSvg(): Map<string, ShapeDef> {
  const shapes = new Map<string, ShapeDef>();

  for (const [id, data] of Object.entries(shapesData)) {
    if (id === "svg1" || id === "layer1") continue;

    const offsetX = -data.x;
    const offsetY = -data.y;

    let normalizedContent: string;
    if (data.content.startsWith("<")) {
      normalizedContent = `<g transform="translate(${offsetX},${offsetY})">${data.content}</g>`;
    } else {
      normalizedContent = `<g transform="translate(${offsetX},${offsetY})"><path d="${data.content}"/></g>`;
    }

    shapes.set(id, {
      id,
      content: normalizedContent,
      width: data.width,
      height: data.height,
    });
  }

  return shapes;
}

const shapeDefs = parseShapesFromSvg();
validateShapes(shapeDefs);

function generateShape(
  x: number,
  y: number,
  shape: ShapeDef,
  shapeSize: number,
  id: number,
  extraTransform?: string
): string {
  const yOffset = y + (shapeSize - shape.height) / 2;
  const extra = extraTransform ?? "";
  return `<g transform="translate(${x},${yOffset})${extra}" data-id="${id}">${shape.content}</g>`;
}

function generateAttack(
  buttons: Button[],
  x: number,
  y: number,
  size: number,
  id: number,
  settings: Settings
): string {
  const attack = shapeDefs.get("attack");
  if (!attack) return "";

  const yOffset = y + (size - attack.height) / 2;

  const allButtons: Button[] = ["LP", "LK", "RP", "RK"];
  let content = attack.content;

  for (const btn of allButtons) {
    const isPressed = buttons.includes(btn);
    const color = isPressed ? settings.attackColors[btn].pressed : settings.attackColors[btn].unpressed;
    content = content.replace(
      `id="${btn}"`,
      `id="${btn}" fill="${color}"`
    );
  }

  return `<g transform="translate(${x},${yOffset})" data-id="${id}">${content}</g>`;
}

function generateText(
  value: string,
  x: number,
  y: number,
  width: number,
  size: number,
  id: number,
  settings: Settings
): string {
  const fontFamily = settings.fontFamily ?? "sans-serif";
  const yOffset = y + size * 0.75;
  return `<text x="${x}" y="${yOffset}" font-size="${settings.fontSize}" font-family="${escapeXml(fontFamily)}" data-id="${id}">${escapeXml(value)}</text>`;
}

function generateDebugRect(x: number, y: number, width: number, height: number): string {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="none" stroke="red" stroke-width="1"/>`;
}

export function generateSvg(diagram: Diagram, settings?: Partial<Settings>): string {
  const mergedSettings: Settings = {
    ...DEFAULT_SETTINGS,
    ...diagram.settings,
    ...settings,
    attackColors: {
      ...DEFAULT_SETTINGS.attackColors,
      ...diagram.settings?.attackColors,
      ...settings?.attackColors,
    },
  };

  const { shapeSize, padding, margin, debugMode } = mergedSettings;
  const nodes = diagram.nodes;

  if (nodes.length === 0) {
    return "";
  }

  const positions: { x: number; width: number }[] = [];
  let currentX = margin;

  for (const node of nodes) {
    const width = getNodeWidth(node, shapeSize, mergedSettings);
    positions.push({ x: currentX, width });
    currentX += width + padding;
  }

  const totalWidth = currentX - padding + margin * 2;
  const totalHeight = shapeSize + margin * 2;

  const elements: string[] = [];
  let idCounter = 1;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const pos = positions[i];
    const y = margin;
    const id = idCounter++;

    switch (node.type) {
      case "arrow": {
        const arrowShape = shapeDefs.get("arrow-right");
        if (arrowShape) {
          const angle = ARROW_ANGLES[node.direction];
          const extra = angle === 0 ? undefined : ` rotate(${angle},${arrowShape.width / 2},${arrowShape.height / 2})`;
          elements.push(generateShape(pos.x, y, arrowShape, shapeSize, id, extra));
        }
        break;
      }
      case "neutral": {
        const starShape = shapeDefs.get("neutral-star");
        if (starShape) {
          elements.push(generateShape(pos.x, y, starShape, shapeSize, id));
        }
        break;
      }
      case "attack":
        elements.push(generateAttack(node.buttons, pos.x, y, shapeSize, id, mergedSettings));
        break;
      case "slide-start": {
        const slideShape = shapeDefs.get("slide-left");
        if (slideShape) {
          elements.push(generateShape(pos.x, y, slideShape, shapeSize, id));
        }
        break;
      }
      case "slide-end": {
        const slideShape = shapeDefs.get("slide-left");
        if (slideShape) {
          elements.push(generateShape(pos.x, y, slideShape, shapeSize, id, " scale(-1,1)"));
        }
        break;
      }
      case "separator": {
        const sepShape = shapeDefs.get("separator");
        if (sepShape) {
          elements.push(generateShape(pos.x, y, sepShape, shapeSize, id));
        }
        break;
      }
      case "text":
        elements.push(generateText(node.value, pos.x, y, pos.width, shapeSize, id, mergedSettings));
        break;
    }

    if (debugMode) {
      elements.push(generateDebugRect(pos.x, y, pos.width, shapeSize));
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">
  ${elements.join("\n  ")}
</svg>`;
}

function getNodeWidth(node: Node, shapeSize: number, settings: Settings): number {
  if (node.type === "text") {
    return Math.ceil(measureTextWidth(node.value, settings.fontSize, settings.fontFamily));
  }
  return shapeSize;
}

export function generateErrorSvg(errorMessage: string): string {
  const width = 480;
  const fontSize = 16;
  const height = Math.ceil(fontSize * 1.2);
  const padding = 16;
  const textX = padding;
  const textY = padding + fontSize;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height + padding * 2}" viewBox="0 0 ${width} ${height + padding * 2}">
  <text x="${textX}" y="${textY}" font-size="${fontSize}" font-family="monospace">ERROR: ${escapeXml(errorMessage)}</text>
</svg>`;
}
