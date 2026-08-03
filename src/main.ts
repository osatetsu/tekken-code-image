import { Plugin, App, PluginSettingTab, Setting } from "obsidian";
import { parse } from "./parser";
import { generateSvg, generateErrorSvg } from "./svg/generator";
import { renderSvg } from "./svg/render";
import { loadShapeDefinitions, type ShapeDefinitions } from "./svg/shapes";
import embeddedShapesSvg from "./svg/shapes.svg";
import {
  isNumericSettingKey,
  loadSettings,
  SETTING_ITEMS,
} from "./settings/settings";
import type { Settings, Button } from "./types";
import { DEFAULT_SETTINGS } from "./types";

export default class TekkenCodePlugin extends Plugin {
  settings!: Settings;
  shapes?: ShapeDefinitions;
  shapeLoadError?: Error;

  async onload() {
    await this.loadPluginSettings();
    try {
      this.shapes = await loadShapeDefinitions(
        this.app,
        this.manifest.dir,
        this.manifest.id,
        embeddedShapesSvg,
      );
    } catch (error) {
      this.shapeLoadError =
        error instanceof Error ? error : new Error("Unable to load shapes.svg");
      console.error("Tekken Code Image:", this.shapeLoadError);
    }
    this.registerMarkdownCodeBlockProcessor("tekken", this.processTekkenBlock.bind(this));
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
      const svg = generateSvg(diagram, this.settings, this.shapes);
      if (!svg) {
        return;
      }
      renderSvg(el, svg);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unknown error";
      const errorSvg = generateErrorSvg(errorMessage);
      renderSvg(el, errorSvg);
    }
  }
}

class TekkenSettingTab extends PluginSettingTab {
  plugin: TekkenCodePlugin;

  constructor(app: App, plugin: TekkenCodePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    new Setting(containerEl)
      .setName("Restore defaults")
      .setDesc("Restore every setting to its default value")
      .addButton((button) =>
        button
          .setButtonText("Restore defaults")
          .setWarning()
          .onClick(async () => {
            this.plugin.settings = loadSettings(null);
            await this.plugin.savePluginSettings();
            this.display();
          })
      );

    for (const [key, item] of Object.entries(SETTING_ITEMS)) {
      if (key === "fontFamily") {
        new Setting(containerEl)
          .setName(item.label)
          .setDesc(item.description)
          .addText((text) =>
            text
              .setPlaceholder("default")
              .setValue(this.plugin.settings.fontFamily ?? "")
              .onChange(async (value) => {
                this.plugin.settings.fontFamily = value || null;
                await this.plugin.savePluginSettings();
              })
          );
      } else if (key === "textFillColor" || key === "textStrokeColor") {
        new Setting(containerEl)
          .setName(item.label)
          .setDesc(item.description)
          .addColorPicker((picker) =>
            picker
              .setValue(this.plugin.settings[key])
              .onChange(async (value) => {
                this.plugin.settings[key] = value;
                await this.plugin.savePluginSettings();
              })
          );
      } else if (key === "debugMode") {
        new Setting(containerEl)
          .setName(item.label)
          .setDesc(item.description)
          .addToggle((toggle) =>
            toggle
              .setValue(this.plugin.settings.debugMode)
              .onChange(async (value) => {
                this.plugin.settings.debugMode = value;
                await this.plugin.savePluginSettings();
              })
          );
      } else {
        if (!isNumericSettingKey(key)) {
          continue;
        }

        new Setting(containerEl)
          .setName(item.label)
          .setDesc(item.description)
          .addText((text) =>
            text
              .setPlaceholder(String(DEFAULT_SETTINGS[key as keyof Settings]))
              .setValue(String(this.plugin.settings[key as keyof Settings]))
              .onChange(async (value) => {
                const num = Number(value);
                if (!isNaN(num)) {
                  this.plugin.settings[key] = num;
                  await this.plugin.savePluginSettings();
                }
              })
          );
      }
    }

    new Setting(containerEl).setName("Attack button colors").setHeading();
    for (const btn of ["LP", "RP", "LK", "RK"] as Button[]) {
      new Setting(containerEl)
        .setName(`${btn} pressed color`)
        .addColorPicker((picker) =>
          picker
            .setValue(this.plugin.settings.attackColors[btn].pressed)
            .onChange(async (value) => {
              this.plugin.settings.attackColors[btn].pressed = value;
              await this.plugin.savePluginSettings();
            })
        );
      new Setting(containerEl)
        .setName(`${btn} unpressed color`)
        .addColorPicker((picker) =>
          picker
            .setValue(this.plugin.settings.attackColors[btn].unpressed)
            .onChange(async (value) => {
              this.plugin.settings.attackColors[btn].unpressed = value;
              await this.plugin.savePluginSettings();
            })
        );
    }
  }
}
