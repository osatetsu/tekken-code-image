import { parse } from "../../core/parser";
import { generateSvg, generateErrorSvg } from "../../core/svg/generator";
import { renderSvg } from "../../core/svg/render";
import { extractShapeDefinitions, type ShapeDefinitions } from "../../core/svg/shapes";
import embeddedShapesSvg from "../../core/svg/shapes.svg";
import {
  isNumericSettingKey,
  loadSettings,
  SETTING_ITEMS,
} from "../../core/settings/settings";
import type { Settings, Button } from "../../core/types";
import { DEFAULT_SETTINGS } from "../../core/types";

let settings: Settings;
let shapes: ShapeDefinitions;

const STORAGE_KEY = "tekken-code-image-settings";

function loadStoredSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return loadSettings(raw ? JSON.parse(raw) : null);
  } catch {
    return loadSettings(null);
  }
}

function saveStoredSettings(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function convert(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  try {
    const diagram = parse(input);
    const svg = generateSvg(diagram, settings, shapes);
    return svg || "";
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return generateErrorSvg(msg);
  }
}

function updateOutput(): void {
  const input = document.getElementById("dsl-input") as HTMLTextAreaElement;
  const output = document.getElementById("svg-output") as HTMLElement;
  const svg = convert(input.value);
  if (svg) {
    renderSvg(output, svg);
  } else {
    output.replaceChildren();
  }
}

function setupDslInput(): void {
  const input = document.getElementById("dsl-input") as HTMLTextAreaElement;
  input.addEventListener("input", () => updateOutput());
}

function setupExampleButtons(): void {
  const examples = [
    "[LK RP] > [LK RK]",
    '"こんにちは世界!"',
    '4LP+RK > 9RK > 3LKRP > 3LKRPLK "(T)" > 66 > 6WP',
    '3RP > "fc" > "ws" LP RP LK > 6RP > LPRPRP > 66 >\n"  " 2LK "Boot" LP "Dual-boot" > LP',
  ];
  const container = document.getElementById("examples") as HTMLElement;
  for (const ex of examples) {
    const btn = document.createElement("button");
    btn.className = "example-btn";
    btn.textContent = ex;
    btn.addEventListener("click", () => {
      const input = document.getElementById("dsl-input") as HTMLTextAreaElement;
      input.value = ex;
      updateOutput();
    });
    container.appendChild(btn);
  }
}

function createNumberSetting(
  key: keyof Settings,
  label: string,
  description: string,
): HTMLElement {
  const row = document.createElement("div");
  row.className = "setting-row";
  const labelEl = document.createElement("label");
  labelEl.textContent = label;
  const descEl = document.createElement("span");
  descEl.className = "setting-desc";
  descEl.textContent = description;
  const input = document.createElement("input");
  input.type = "number";
  input.value = String(settings[key as keyof Settings]);
  input.addEventListener("input", () => {
    const num = Number(input.value);
    if (!isNaN(num)) {
      (settings as any)[key] = num;
      saveStoredSettings();
      updateOutput();
    }
  });
  row.appendChild(labelEl);
  row.appendChild(input);
  row.appendChild(descEl);
  return row;
}

function createTextSetting(
  key: keyof Settings,
  label: string,
  description: string,
): HTMLElement {
  const row = document.createElement("div");
  row.className = "setting-row";
  const labelEl = document.createElement("label");
  labelEl.textContent = label;
  const descEl = document.createElement("span");
  descEl.className = "setting-desc";
  descEl.textContent = description;
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "default";
  input.value = String(settings[key as keyof Settings] ?? "");
  input.addEventListener("input", () => {
    (settings as any)[key] = input.value || null;
    saveStoredSettings();
    updateOutput();
  });
  row.appendChild(labelEl);
  row.appendChild(input);
  row.appendChild(descEl);
  return row;
}

function createColorSetting(
  key: keyof Settings,
  label: string,
  description: string,
): HTMLElement {
  const row = document.createElement("div");
  row.className = "setting-row";
  const labelEl = document.createElement("label");
  labelEl.textContent = label;
  const descEl = document.createElement("span");
  descEl.className = "setting-desc";
  descEl.textContent = description;
  const input = document.createElement("input");
  input.type = "color";
  input.value = settings[key as keyof Settings] as string;
  input.addEventListener("input", () => {
    (settings as any)[key] = input.value;
    saveStoredSettings();
    updateOutput();
  });
  row.appendChild(labelEl);
  row.appendChild(input);
  row.appendChild(descEl);
  return row;
}

function createToggleSetting(
  key: keyof Settings,
  label: string,
  description: string,
): HTMLElement {
  const row = document.createElement("div");
  row.className = "setting-row";
  const labelEl = document.createElement("label");
  labelEl.textContent = label;
  const descEl = document.createElement("span");
  descEl.className = "setting-desc";
  descEl.textContent = description;
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = settings[key as keyof Settings] as boolean;
  input.addEventListener("change", () => {
    (settings as any)[key] = input.checked;
    saveStoredSettings();
    updateOutput();
  });
  row.appendChild(labelEl);
  row.appendChild(input);
  row.appendChild(descEl);
  return row;
}

function createAttackColorSetting(
  button: Button,
  kind: "pressed" | "unpressed",
): HTMLElement {
  const row = document.createElement("div");
  row.className = "setting-row";
  const labelEl = document.createElement("label");
  labelEl.textContent = `${button} ${kind}`;
  const input = document.createElement("input");
  input.type = "color";
  input.value = settings.attackColors[button][kind];
  input.addEventListener("input", () => {
    settings.attackColors[button][kind] = input.value;
    saveStoredSettings();
    updateOutput();
  });
  row.appendChild(labelEl);
  row.appendChild(input);
  return row;
}

function setupSettingsPanel(): void {
  const panel = document.getElementById("settings-panel") as HTMLElement;

  for (const [key, item] of Object.entries(SETTING_ITEMS)) {
    if (key === "fontFamily") {
      panel.appendChild(createTextSetting(key as keyof Settings, item.label, item.description));
    } else if (key === "textFillColor" || key === "textStrokeColor") {
      panel.appendChild(createColorSetting(key as keyof Settings, item.label, item.description));
    } else if (key === "debugMode") {
      panel.appendChild(createToggleSetting(key as keyof Settings, item.label, item.description));
    } else if (isNumericSettingKey(key)) {
      panel.appendChild(createNumberSetting(key as keyof Settings, item.label, item.description));
    }
  }

  const heading = document.createElement("h3");
  heading.textContent = "Attack button colors";
  panel.appendChild(heading);

  for (const btn of ["LP", "RP", "LK", "RK"] as Button[]) {
    panel.appendChild(createAttackColorSetting(btn, "pressed"));
    panel.appendChild(createAttackColorSetting(btn, "unpressed"));
  }

  const restoreRow = document.createElement("div");
  restoreRow.className = "setting-row";
  const restoreBtn = document.createElement("button");
  restoreBtn.className = "restore-btn";
  restoreBtn.textContent = "Restore defaults";
  restoreBtn.addEventListener("click", () => {
    settings = loadSettings(null);
    saveStoredSettings();
    panel.replaceChildren();
    setupSettingsPanel();
    updateOutput();
  });
  restoreRow.appendChild(restoreBtn);
  panel.appendChild(restoreRow);
}

function setupDownloadButton(): void {
  const btn = document.getElementById("download-btn") as HTMLButtonElement;
  btn.addEventListener("click", () => {
    const input = document.getElementById("dsl-input") as HTMLTextAreaElement;
    const svg = convert(input.value);
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tekken-command.svg";
    a.click();
    URL.revokeObjectURL(url);
  });
}

function init(): void {
  settings = loadStoredSettings();
  shapes = extractShapeDefinitions(embeddedShapesSvg);

  setupDslInput();
  setupExampleButtons();
  setupSettingsPanel();
  setupDownloadButton();

  const input = document.getElementById("dsl-input") as HTMLTextAreaElement;
  input.value = "6n23RP";
  updateOutput();
}

init();
