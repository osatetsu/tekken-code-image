import type { Settings, ButtonColor, Button } from "../types";
import { DEFAULT_SETTINGS } from "../types";

export const SETTING_ITEMS: Record<keyof Omit<Settings, "attackColors">, { label: string; description: string }> = {
  shapeSize: { label: "Shape size", description: "Size of a single shape in pixels" },
  padding: { label: "Padding", description: "Space between shapes in pixels" },
  margin: { label: "Margin", description: "Space around the image in pixels" },
  fontFamily: { label: "Font family", description: "Font family for text nodes" },
  fontSize: { label: "Font size", description: "Font size for text nodes in pixels" },
  textFillColor: { label: "Text fill color", description: "Fill color for text nodes" },
  textStrokeColor: { label: "Text outline color", description: "Outline color for text nodes" },
  textStrokeWidth: { label: "Text outline width", description: "Outline width for text nodes in pixels" },
  debugMode: { label: "Debug mode", description: "Show bounding boxes around shapes" },
};

export const ATTACK_COLOR_ITEMS: Record<Button, { label: string }> = {
  LP: { label: "LP" },
  RP: { label: "RP" },
  LK: { label: "LK" },
  RK: { label: "RK" },
};

export const NUMERIC_SETTING_KEYS = [
  "shapeSize",
  "padding",
  "margin",
  "fontSize",
  "textStrokeWidth",
] as const;

export type NumericSettingKey = (typeof NUMERIC_SETTING_KEYS)[number];

export function isNumericSettingKey(key: string): key is NumericSettingKey {
  return (NUMERIC_SETTING_KEYS as readonly string[]).includes(key);
}

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
