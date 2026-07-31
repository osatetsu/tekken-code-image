import { describe, expect, it } from "vitest";
import { loadSettings } from "../src/settings/settings";
import { DEFAULT_SETTINGS } from "../src/types";

describe("Settings", () => {
  it("uses defaults when no saved settings exist", () => {
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
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
});
