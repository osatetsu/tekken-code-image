import { parse } from "../../core/parser";
import { generateSvg, generateErrorSvg } from "../../core/svg/generator";
import { convertTextNodesToPaths } from "../../core/svg/path-converter";
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
const PATH_CONVERT_STORAGE_KEY = "tekken-code-image-path-convert";

// Web 版限定: Text → Path 変換の状態 (Obsidian 側では使用しない)
type PathConvertState = {
  enabled: boolean;
  fontFamilyName: string;
  fontBase64: string | null;
  fontFileName: string | null;
};

let pathState: PathConvertState = {
  enabled: false,
  fontFamilyName: "",
  fontBase64: null,
  fontFileName: null,
};

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

function loadPathConvertState(): PathConvertState {
  try {
    const raw = localStorage.getItem(PATH_CONVERT_STORAGE_KEY);
    if (!raw) return { enabled: false, fontFamilyName: "", fontBase64: null, fontFileName: null };
    const parsed = JSON.parse(raw);
    return {
      enabled: !!parsed.enabled,
      fontFamilyName: typeof parsed.fontFamilyName === "string" ? parsed.fontFamilyName : "",
      fontBase64: typeof parsed.fontBase64 === "string" ? parsed.fontBase64 : null,
      fontFileName: typeof parsed.fontFileName === "string" ? parsed.fontFileName : null,
    };
  } catch {
    return { enabled: false, fontFamilyName: "", fontBase64: null, fontFileName: null };
  }
}

function savePathConvertState(): void {
  localStorage.setItem(PATH_CONVERT_STORAGE_KEY, JSON.stringify(pathState));
}

function showPathConvertWarning(message: string): void {
  const warningEl = document.getElementById("path-convert-warning");
  if (warningEl) {
    warningEl.textContent = message;
    warningEl.style.display = message ? "block" : "none";
  }
}

function canConvertToPath(): boolean {
  return pathState.enabled && !!pathState.fontBase64 && !!pathState.fontFamilyName;
}

async function convert(input: string): Promise<string> {
  const trimmed = input.trim();
  if (!trimmed) return "";

  let svg: string;
  try {
    const diagram = parse(input);
    svg = generateSvg(diagram, settings, shapes);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return generateErrorSvg(msg);
  }

  if (!svg) return "";

  // Web 版限定: Text → Path 変換
  if (canConvertToPath()) {
    try {
      const binary = atob(pathState.fontBase64!);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      const converted = await convertTextNodesToPaths(svg, {
        fontFamilyName: pathState.fontFamilyName,
        fontBuffer: bytes.buffer,
      });
      showPathConvertWarning("");
      return converted;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      showPathConvertWarning(`Path 変換に失敗しました: ${msg}`);
      return svg;
    }
  } else if (pathState.enabled && (!pathState.fontBase64 || !pathState.fontFamilyName)) {
    showPathConvertWarning("Text → Path 変換が ON ですが、フォントが未設定です。");
  } else {
    showPathConvertWarning("");
  }
  return svg;
}

function updateOutput(): void {
  const input = document.getElementById("dsl-input") as HTMLTextAreaElement;
  const output = document.getElementById("svg-output") as HTMLElement;
  void convert(input.value).then((svg) => {
    if (svg) {
      renderSvg(output, svg);
    } else {
      output.replaceChildren();
    }
  });
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
    void convert(input.value).then((svg) => {
      if (!svg) return;
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tekken-command.svg";
      a.click();
      URL.revokeObjectURL(url);
    });
  });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunkSize)),
    );
  }
  return btoa(binary);
}

function setupPathConvertPanel(): void {
  const panel = document.getElementById("path-convert-panel") as HTMLElement;
  if (!panel) return;

  // 見出し
  const heading = document.createElement("h3");
  heading.textContent = "Text → Path 変換 (Web 版限定)";
  panel.appendChild(heading);

  // トグル
  const toggleRow = document.createElement("div");
  toggleRow.className = "setting-row";
  const toggleLabel = document.createElement("label");
  toggleLabel.textContent = "有効化";
  const toggleInput = document.createElement("input");
  toggleInput.type = "checkbox";
  toggleInput.checked = pathState.enabled;
  toggleInput.addEventListener("change", () => {
    pathState.enabled = toggleInput.checked;
    savePathConvertState();
    updateOutput();
  });
  toggleRow.appendChild(toggleLabel);
  toggleRow.appendChild(toggleInput);
  panel.appendChild(toggleRow);

  // 警告表示
  const warningEl = document.createElement("div");
  warningEl.id = "path-convert-warning";
  warningEl.className = "path-warning";
  warningEl.style.display = "none";
  panel.appendChild(warningEl);

  // フォントファミリ名
  const familyRow = document.createElement("div");
  familyRow.className = "setting-row";
  const familyLabel = document.createElement("label");
  familyLabel.textContent = "Font family";
  const familyInput = document.createElement("input");
  familyInput.type = "text";
  familyInput.placeholder = "例: MyCustomFont";
  familyInput.value = pathState.fontFamilyName;
  familyInput.addEventListener("input", () => {
    pathState.fontFamilyName = familyInput.value.trim();
    savePathConvertState();
    updateOutput();
  });
  familyRow.appendChild(familyLabel);
  familyRow.appendChild(familyInput);
  panel.appendChild(familyRow);

  // フォントファイル選択
  const fileRow = document.createElement("div");
  fileRow.className = "setting-row";
  const fileLabel = document.createElement("label");
  fileLabel.textContent = "Font file";
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".ttf,.otf,.woff,.woff2";
  const fileStatus = document.createElement("span");
  fileStatus.className = "setting-desc";
  fileStatus.textContent = pathState.fontFileName
    ? `選択中: ${pathState.fontFileName}`
    : "未選択";
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer;
      pathState.fontBase64 = arrayBufferToBase64(buffer);
      pathState.fontFileName = file.name;
      // family 名が空なら file name を暫定入力
      if (!pathState.fontFamilyName) {
        pathState.fontFamilyName = file.name.replace(/\.[^.]+$/, "");
        familyInput.value = pathState.fontFamilyName;
      }
      savePathConvertState();
      fileStatus.textContent = `選択中: ${file.name}`;
      updateOutput();
    };
    reader.readAsArrayBuffer(file);
  });
  fileRow.appendChild(fileLabel);
  fileRow.appendChild(fileInput);
  fileRow.appendChild(fileStatus);
  panel.appendChild(fileRow);

  // 説明
  const desc = document.createElement("p");
  desc.className = "setting-desc";
  desc.textContent =
    "Filmora など <text> 非対応レンダラで文字が空白化する問題を回避します。フォントはユーザ責任で用意してください (プラグインは同梱しません)。";
  panel.appendChild(desc);
}

function init(): void {
  settings = loadStoredSettings();
  shapes = extractShapeDefinitions(embeddedShapesSvg);
  pathState = loadPathConvertState();

  setupDslInput();
  setupExampleButtons();
  setupSettingsPanel();
  setupPathConvertPanel();
  setupDownloadButton();

  const input = document.getElementById("dsl-input") as HTMLTextAreaElement;
  input.value = "6n23RP";
  updateOutput();
}

init();
