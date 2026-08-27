import { parse } from "../../core/parser";
import { generateSvg, generateErrorSvg } from "../../core/svg/generator";
import { renderSvg } from "../../core/svg/render";
import { extractShapeDefinitions, type ShapeDefinitions } from "../../core/svg/shapes";
import embeddedShapesSvg from "../../core/svg/shapes.svg";
import { loadSettings } from "../../core/settings/settings";
import type { Settings } from "../../core/types";

const shapes: ShapeDefinitions = extractShapeDefinitions(embeddedShapesSvg);
const settings: Settings = loadSettings(null);

export function convertTekken(source: string): string {
  try {
    const diagram = parse(source);
    return generateSvg(diagram, settings, shapes) || "";
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return generateErrorSvg(msg);
  }
}

export function renderInto(el: HTMLElement, source: string): void {
  const svg = convertTekken(source);
  if (svg) renderSvg(el, svg);
}
