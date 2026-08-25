import { Plugin } from "obsidian";
import { parse } from "../../core/parser";
import { generateSvg, generateErrorSvg } from "../../core/svg/generator";
import { renderSvg } from "../../core/svg/render";
import { extractShapeDefinitions, type ShapeDefinitions } from "../../core/svg/shapes";
import type { Settings } from "../../core/types";
import { loadSettings } from "../../core/settings/settings";
import embeddedShapesSvg from "../../core/svg/shapes.svg";
import manifest from "../../../manifest.json";
import { TekkenSettingTab } from "./setting-tab";

/**
 * generateSvg の出力にデバッグ時のみ manifest.version を後付けで挿入する。
 * core/svg/generator.ts は Obsidian / Web 共通のためバージョン埋込みはここに閉じる。
 */
function injectVersionIfDebug(svg: string, settings: Settings): string {
  if (!settings.debugMode) return svg;
  const versionTag = `<text x="0" y="38" font-size="16">${manifest.version}</text>`;
  return svg.replace("</svg>", `  ${versionTag}\n</svg>`);
}

export default class TekkenCodePlugin extends Plugin {
  settings!: Settings;
  shapes?: ShapeDefinitions;
  shapeLoadError?: Error;

  async onload() {
    await this.loadPluginSettings();
    try {
      this.shapes = extractShapeDefinitions(embeddedShapesSvg);
    } catch (error) {
      this.shapeLoadError =
        error instanceof Error ? error : new Error("Unable to load shapes.svg");
      console.error("Tekken Code Image:", this.shapeLoadError);
    }
    this.registerMarkdownCodeBlockProcessor(
      "tekken",
      this.processTekkenBlock.bind(this),
    );
    this.addSettingTab(new TekkenSettingTab(this.app, this));
  }

  async loadPluginSettings() {
    this.settings = loadSettings(await this.loadData());
  }

  async savePluginSettings() {
    await this.saveData(this.settings);
  }

  processTekkenBlock(source: string, el: HTMLElement) {
    const trimmed = source.trim();
    if (!trimmed) {
      return;
    }
    if (this.shapeLoadError) {
      renderSvg(el, generateErrorSvg(this.shapeLoadError.message));
      return;
    }
    if (!this.shapes) {
      renderSvg(el, generateErrorSvg("Shape definitions are unavailable"));
      return;
    }

    try {
      const diagram = parse(source);
      const baseSvg = generateSvg(diagram, this.settings, this.shapes);
      if (!baseSvg) {
        return;
      }
      renderSvg(el, injectVersionIfDebug(baseSvg, this.settings));
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unknown error";
      const errorSvg = generateErrorSvg(errorMessage);
      renderSvg(el, errorSvg);
    }
  }
}
