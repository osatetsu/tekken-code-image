import type { Settings, ButtonColor, Button } from "../types";
import { DEFAULT_SETTINGS } from "../types";

export const SETTING_ITEMS: Record<keyof Omit<Settings, "attackColors">, { label: string; description: string }> = {
  shapeSize: { label: "Shape Size", description: "Size of a single shape in pixels" },
  padding: { label: "Padding", description: "Space between shapes in pixels" },
  margin: { label: "Margin", description: "Space around the image in pixels" },
  fontFamily: { label: "Font Family", description: "Font family for text nodes" },
  fontSize: { label: "Font Size", description: "Font size for text nodes in pixels" },
  debugMode: { label: "Debug Mode", description: "Show bounding boxes around shapes" },
};

export const ATTACK_COLOR_ITEMS: Record<Button, { label: string }> = {
  LP: { label: "LP" },
  RP: { label: "RP" },
  LK: { label: "LK" },
  RK: { label: "RK" },
};

type SavedSettings = Partial<Omit<Settings, "attackColors">> & {
  attackColors?: Partial<Record<Button, Partial<ButtonColor>>>;
};

export function loadSettings(savedData: SavedSettings | null | undefined): Settings {
  const { attackColors, ...savedValues } = savedData ?? {};

  return {
    ...DEFAULT_SETTINGS,
    ...savedValues,
    attackColors: {
      LP: { ...DEFAULT_SETTINGS.attackColors.LP, ...attackColors?.LP },
      RP: { ...DEFAULT_SETTINGS.attackColors.RP, ...attackColors?.RP },
      LK: { ...DEFAULT_SETTINGS.attackColors.LK, ...attackColors?.LK },
      RK: { ...DEFAULT_SETTINGS.attackColors.RK, ...attackColors?.RK },
    },
  };
}

export function saveSettings(settings: Settings): any {
  return { ...settings };
}
