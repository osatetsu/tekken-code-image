import type { Diagram, Node, Settings, Button } from "../types";
import { DEFAULT_SETTINGS } from "../types";
import { readFileSync } from "fs";
const shapesSvg = readFileSync("./src/svg/shapes.svg", "utf-8");

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
  if (typeof document === "undefined" || typeof HTMLCanvasElement === "undefined") {
    return text.length * fontSize * 0.6;
  }
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return text.length * fontSize * 0.6;
    const font = fontFamily ? `${fontSize}px ${fontFamily}` : `${fontSize}px sans-serif`;
    ctx.font = font;
    return ctx.measureText(text).width;
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

function parsePathBoundingBox(d: string): { x: number; y: number; width: number; height: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let cx = 0, cy = 0;
  let isFirstMove = true;
  const commands = d.match(/[a-zA-Z][^a-zA-Z]*/g) || [];

  for (const cmd of commands) {
    const op = cmd[0];
    const isRelative = op === op.toLowerCase() && !isFirstMove;
    const nums = cmd.slice(1).match(/[-+]?\d*\.?\d+/g)?.map(Number) || [];

    switch (op.toLowerCase()) {
      case 'm':
        for (let i = 0; i < nums.length; i += 2) {
          if (i + 1 >= nums.length) break;
          if (isFirstMove) {
            cx = nums[i];
            cy = nums[i + 1];
            isFirstMove = false;
          } else {
            cx = isRelative ? cx + nums[i] : nums[i];
            cy = isRelative ? cy + nums[i + 1] : nums[i + 1];
          }
          minX = Math.min(minX, cx); minY = Math.min(minY, cy);
          maxX = Math.max(maxX, cx); maxY = Math.max(maxY, cy);
        }
        break;
      case 'l':
        for (let i = 0; i < nums.length; i += 2) {
          if (i + 1 >= nums.length) break;
          cx = isRelative ? cx + nums[i] : nums[i];
          cy = isRelative ? cy + nums[i + 1] : nums[i + 1];
          minX = Math.min(minX, cx); minY = Math.min(minY, cy);
          maxX = Math.max(maxX, cx); maxY = Math.max(maxY, cy);
        }
        break;
      case 'h':
        for (const n of nums) {
          cx = isRelative ? cx + n : n;
          minX = Math.min(minX, cx); maxX = Math.max(maxX, cx);
        }
        break;
      case 'v':
        for (const n of nums) {
          cy = isRelative ? cy + n : n;
          minY = Math.min(minY, cy); maxY = Math.max(maxY, cy);
        }
        break;
      case 'c':
        for (let i = 0; i < nums.length; i += 6) {
          if (i + 5 >= nums.length) break;
          const x1 = isRelative ? cx + nums[i] : nums[i];
          const y1 = isRelative ? cy + nums[i + 1] : nums[i + 1];
          const x2 = isRelative ? cx + nums[i + 2] : nums[i + 2];
          const y2 = isRelative ? cy + nums[i + 3] : nums[i + 3];
          const ex = isRelative ? cx + nums[i + 4] : nums[i + 4];
          const ey = isRelative ? cy + nums[i + 5] : nums[i + 5];
          minX = Math.min(minX, x1, x2, ex); minY = Math.min(minY, y1, y2, ey);
          maxX = Math.max(maxX, x1, x2, ex); maxY = Math.max(maxY, y1, y2, ey);
          cx = ex; cy = ey;
        }
        break;
      case 'z':
        break;
    }
  }

  if (minX === Infinity) return { x: 0, y: 0, width: 10, height: 10 };
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function parseShapesFromSvg(svgString: string): Map<string, ShapeDef> {
  const shapes = new Map<string, ShapeDef>();
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, "image/svg+xml");

  const paths = doc.querySelectorAll("path[id]");
  for (const path of paths) {
    const id = path.getAttribute("id");
    if (id === "svg1" || id === "layer1") continue;

    const d = path.getAttribute("d");
    if (!d) continue;

    const style = path.getAttribute("style") || "";
    const bbox = parsePathBoundingBox(d);
    const normalizedContent = `<g transform="translate(${-bbox.x},${-bbox.y})"><path d="${d}" style="${style}"/></g>`;

    shapes.set(id, {
      id,
      content: normalizedContent,
      width: bbox.width,
      height: bbox.height,
    });
  }

  const groups = doc.querySelectorAll("g[id]");
  for (const group of groups) {
    const id = group.getAttribute("id");
    if (id === "svg1" || id === "layer1") continue;

    const circles = group.querySelectorAll("circle");
    if (circles.length === 0) continue;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const circle of circles) {
      const cx = parseFloat(circle.getAttribute("cx") || "0");
      const cy = parseFloat(circle.getAttribute("cy") || "0");
      const r = parseFloat(circle.getAttribute("r") || "0");
      minX = Math.min(minX, cx - r);
      minY = Math.min(minY, cy - r);
      maxX = Math.max(maxX, cx + r);
      maxY = Math.max(maxY, cy + r);
    }

    const serializer = new XMLSerializer();
    let innerContent = "";
    for (const child of Array.from(group.childNodes)) {
      innerContent += serializer.serializeToString(child);
    }

    const width = maxX - minX;
    const height = maxY - minY;
    const normalizedContent = `<g transform="translate(${-minX},${-minY})">${innerContent}</g>`;
    shapes.set(id, { id, content: normalizedContent, width, height });
  }

  return shapes;
}

const shapeDefs = parseShapesFromSvg(shapesSvg);
validateShapes(shapeDefs);

function generateShape(
  x: number,
  y: number,
  shape: ShapeDef,
  shapeSize: number,
  id: number,
  extraTransform?: string
): string {
  const scale = shape.height > shapeSize ? shapeSize / shape.height : 1.0;
  const scaledHeight = shape.height * scale;
  const yOffset = y + (shapeSize - scaledHeight) / 2;
  const scaleTransform = scale === 1.0 ? "" : ` scale(${scale})`;
  const extra = extraTransform ?? "";
  return `<g transform="translate(${x},${yOffset})${scaleTransform}${extra}" data-id="${id}">${shape.content}</g>`;
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

  const scale = attack.height > size ? size / attack.height : 1.0;
  const scaledHeight = attack.height * scale;
  const yOffset = y + (size - scaledHeight) / 2;

  const allButtons: Button[] = ["LP", "LK", "RP", "RK"];
  let content = attack.content;

  for (const btn of allButtons) {
    const isPressed = buttons.includes(btn);
    const color = isPressed ? settings.attackColors[btn].pressed : settings.attackColors[btn].unpressed;
    const circleRegex = new RegExp(
      `(<circle\\s[^>]*id="${btn}"[^>]*style="[^"]*?)fill:[^;]+`,
      "g"
    );
    content = content.replace(circleRegex, `$1fill:${color}`);
  }

  return `<g transform="translate(${x},${yOffset}) scale(${scale})" data-id="${id}">${content}</g>`;
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
