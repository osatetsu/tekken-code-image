import { describe, expect, it } from "vitest";
import { loadSettings } from "../src/settings/settings";
import { DEFAULT_SETTINGS } from "../src/types";

describe("Settings", () => {
  it("uses defaults when no saved settings exist", () => {
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS).toMatchObject({
      shapeSize: 32,
      padding: 8,
      fontSize: 24,
    });
  });

  it("creates independent default settings", () => {
    const settings = loadSettings(null);
    settings.attackColors.LP.pressed = "#123456";

    expect(DEFAULT_SETTINGS.attackColors.LP.pressed).toBe("#000000");
  });

  it("preserves color defaults for a partial saved button color", () => {
    const settings = loadSettings({
      attackColors: {
        LP: { pressed: "#123456" },
      },
    });

    expect(settings.attackColors.LP).toEqual({
      pressed: "#123456",
      unpressed: DEFAULT_SETTINGS.attackColors.LP.unpressed,
    });
    expect(settings.attackColors.RP).toEqual(DEFAULT_SETTINGS.attackColors.RP);
  });

  it("applies saved global settings", () => {
    const settings = loadSettings({ shapeSize: 48, debugMode: true });

    expect(settings.shapeSize).toBe(48);
    expect(settings.debugMode).toBe(true);
  });

  it("applies saved text style settings", () => {
    const settings = loadSettings({
      textFillColor: "#123456",
      textStrokeColor: "#654321",
      textStrokeWidth: 2,
    });

    expect(settings.textFillColor).toBe("#123456");
    expect(settings.textStrokeColor).toBe("#654321");
    expect(settings.textStrokeWidth).toBe(2);
  });
});
