import { Plugin, MarkdownPostProcessorContext, App, PluginSettingTab, Setting } from "obsidian";
import { parse } from "./parser";
import { generateSvg, generateErrorSvg } from "./svg/generator";
import {
  isNumericSettingKey,
  loadSettings,
  SETTING_ITEMS,
} from "./settings/settings";
import type { Settings, Button } from "./types";
import { DEFAULT_SETTINGS } from "./types";

export default class TekkenCodePlugin extends Plugin {
  settings!: Settings;

  async onload() {
    await this.loadPluginSettings();
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

    try {
      const diagram = parse(source);
      const svg = generateSvg(diagram, this.settings);
      if (!svg) {
        return;
      }
      el.innerHTML = svg;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unknown error";
      const errorSvg = generateErrorSvg(errorMessage);
      el.innerHTML = errorSvg;
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
    containerEl.createEl("h2", { text: "Tekken Code Image Settings" });

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

    containerEl.createEl("h3", { text: "Attack Button Colors" });
    for (const btn of ["LP", "RP", "LK", "RK"] as Button[]) {
      containerEl.createEl("h4", { text: btn });
      new Setting(containerEl)
        .setName("Pressed Color")
        .addColorPicker((picker) =>
          picker
            .setValue(this.plugin.settings.attackColors[btn].pressed)
            .onChange(async (value) => {
              this.plugin.settings.attackColors[btn].pressed = value;
              await this.plugin.savePluginSettings();
            })
        );
      new Setting(containerEl)
        .setName("Unpressed Color")
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
