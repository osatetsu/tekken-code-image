import { App, PluginSettingTab, Setting } from "obsidian";
import {
  isNumericSettingKey,
  loadSettings,
  SETTING_ITEMS,
} from "../../core/settings/settings";
import type { Button, Settings } from "../../core/types";
import { DEFAULT_SETTINGS } from "../../core/types";
import type TekkenCodePlugin from "./main";

export class TekkenSettingTab extends PluginSettingTab {
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
