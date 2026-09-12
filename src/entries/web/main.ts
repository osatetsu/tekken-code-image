import { parse } from "../../core/parser";
import { generateSvg, generateErrorSvg } from "../../core/svg/generator";
import {
  convertTextNodesToPaths,
  extractFontFamilyName,
} from "../../core/svg/path-converter";
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
import { createLatestRequestGate } from "./latest-request-gate";

let settings: Settings;
let shapes: ShapeDefinitions;

const STORAGE_KEY = "tekken-code-image-settings";
const PATH_CONVERT_STORAGE_KEY = "tekken-code-image-path-convert";

// Web 版限定: Text → Path 変換の状態 (Obsidian 側では使用しない)
// derivedFontFamily は opentype.js で抽出した内部 family 名、または
// 抽出失敗時の file name フォールバック。
type PathConvertState = {
  enabled: boolean;
  fontBase64: string | null;
  fontFileName: string | null;
  derivedFontFamily: string | null;
  derivedFontFamilyIsFallback: boolean;
};

let pathState: PathConvertState = {
  enabled: false,
  fontBase64: null,
  fontFileName: null,
  derivedFontFamily: null,
  derivedFontFamilyIsFallback: false,
};

const outputRequestGate = createLatestRequestGate();

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
    if (!raw) {
      return {
        enabled: false,
        fontBase64: null,
        fontFileName: null,
        derivedFontFamily: null,
        derivedFontFamilyIsFallback: false,
      };
    }
    const parsed = JSON.parse(raw);
    return {
      enabled: !!parsed.enabled,
      fontBase64: typeof parsed.fontBase64 === "string" ? parsed.fontBase64 : null,
      fontFileName: typeof parsed.fontFileName === "string" ? parsed.fontFileName : null,
      derivedFontFamily:
        typeof parsed.derivedFontFamily === "string" ? parsed.derivedFontFamily : null,
      derivedFontFamilyIsFallback: !!parsed.derivedFontFamilyIsFallback,
    };
  } catch {
    return {
      enabled: false,
      fontBase64: null,
      fontFileName: null,
      derivedFontFamily: null,
      derivedFontFamilyIsFallback: false,
    };
  }
}

function savePathConvertState(): void {
  try {
    localStorage.setItem(PATH_CONVERT_STORAGE_KEY, JSON.stringify(pathState));
    // 保存成功時は既存の永続化警告をクリア
    const warningEl = document.getElementById("path-convert-warning");
    if (
      warningEl &&
      (warningEl.dataset.kind === "quota" ||
        warningEl.dataset.kind === "save-error")
    ) {
      warningEl.textContent = "";
      warningEl.style.display = "none";
      delete warningEl.dataset.kind;
    }
  } catch (e) {
    // localStorage の容量上限に達した場合
    // - メモリ上の pathState は維持(現セッション中は Path 化が機能する)
    // - 次回訪問時に再選択が必要であることをユーザに通知する
    const isQuota =
      e instanceof DOMException &&
      (e.name === "QuotaExceededError" ||
        e.name === "NS_ERROR_DOM_QUOTA_REACHED");
    const warningEl = document.getElementById("path-convert-warning");
    if (warningEl) {
      warningEl.dataset.kind = isQuota ? "quota" : "save-error";
      warningEl.textContent = isQuota
        ? "localStorage の容量上限に達したため、フォント設定を保存できませんでした。次回訪問時にフォントを再選択してください。"
        : "設定の保存に失敗しました。";
      warningEl.style.display = "block";
    }
    // メモリ上の pathState は維持する(現セッション中は Path 化が機能する)
  }
}

type WarningKind =
  | "none"
  | "family-missing"
  | "family-fallback"
  | "family-mismatch"
  | "path-failed"
  | "save-error"
  | "quota";

function setPathConvertWarning(kind: WarningKind, message = ""): void {
  const warningEl = document.getElementById("path-convert-warning");
  if (!warningEl) return;
  if (kind === "none" || !message) {
    warningEl.textContent = "";
    warningEl.style.display = "none";
    delete warningEl.dataset.kind;
    return;
  }
  warningEl.dataset.kind = kind;
  warningEl.textContent = message;
  warningEl.style.display = "block";
}

function canConvertToPath(): boolean {
  return (
    pathState.enabled &&
    !!pathState.fontBase64 &&
    !!pathState.derivedFontFamily
  );
}

function isPersistenceWarning(kind: WarningKind | ""): boolean {
  return kind === "quota" || kind === "save-error";
}

async function convert(input: string): Promise<string> {
  const trimmed = input.trim();
  if (!trimmed) {
    if (!isPersistenceWarning(warningElCurrentKind())) {
      setPathConvertWarning("none");
    }
    return "";
  }

  if (!isPersistenceWarning(warningElCurrentKind())) {
    // Path 化 ON だがフォント未設定 → 警告のみ、<text> のまま出力
    if (
      pathState.enabled &&
      (!pathState.fontBase64 || !pathState.derivedFontFamily)
    ) {
      setPathConvertWarning(
        "family-missing",
        "Text → Path 変換が ON ですが、フォントが選択されていないか family 名を抽出できませんでした。",
      );
    } else if (
      pathState.enabled &&
      pathState.derivedFontFamilyIsFallback
    ) {
      setPathConvertWarning(
        "family-fallback",
        `フォント内部の family 名を抽出できなかったため、ファイル名 (${pathState.fontFileName ?? "?"}) を仮の family 名として使用します。Path 化に失敗する可能性があります。`,
      );
    } else {
      setPathConvertWarning("none");
    }
  }

  let svg: string;
  try {
    const diagram = parse(input);
    // Path 化時は <text> ノードに font-family 属性を強制付与するため、
    // settings.fontFamily を derivedFontFamily で上書きしたコピーを渡す
    const renderSettings =
      pathState.enabled && pathState.derivedFontFamily
        ? { ...settings, fontFamily: pathState.derivedFontFamily }
        : settings;
    svg = generateSvg(diagram, renderSettings, shapes);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    svg = generateErrorSvg(msg);
  }

  if (!svg) return "";

  if (canConvertToPath() && pathState.derivedFontFamily) {
    try {
      const binary = atob(pathState.fontBase64!);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      const result = await convertTextNodesToPaths(svg, {
        fontFamilyName: pathState.derivedFontFamily,
        fontBuffer: bytes.buffer,
      });
      if (result.failed) {
        // 警告は既に family-fallback が出ていない限りここで出す
        if (
          warningElCurrentKind() !== "family-fallback" &&
          !isPersistenceWarning(warningElCurrentKind())
        ) {
          setPathConvertWarning(
            "family-mismatch",
            "Path 化に失敗しました。フォントの family 名を確認してください。",
          );
        }
        return svg;
      }
      return result.svg;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      if (!isPersistenceWarning(warningElCurrentKind())) {
        setPathConvertWarning("path-failed", `Path 変換に失敗しました: ${msg}`);
      }
      return svg;
    }
  }
  return svg;
}

function warningElCurrentKind(): WarningKind | "" {
  const warningEl = document.getElementById("path-convert-warning");
  return (warningEl?.dataset.kind as WarningKind | undefined) ?? "";
}

function updateOutput(): void {
  const input = document.getElementById("dsl-input") as HTMLTextAreaElement;
  const output = document.getElementById("svg-output") as HTMLElement;
  const generation = outputRequestGate.next();
  void convert(input.value).then((svg) => {
    if (!outputRequestGate.isCurrent(generation)) return;
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
  toggleLabel.htmlFor = "path-convert-toggle";
  toggleLabel.textContent = "有効化";
  const toggleInput = document.createElement("input");
  toggleInput.id = "path-convert-toggle";
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

  // 内部 family 名の表示 (読み取り専用)
  const familyInfo = document.createElement("div");
  familyInfo.className = "setting-desc";
  familyInfo.id = "path-family-info";
  familyInfo.textContent = pathState.derivedFontFamily
    ? `内部 family: ${pathState.derivedFontFamily}${
        pathState.derivedFontFamilyIsFallback ? " (ファイル名フォールバック)" : ""
      }`
    : "フォント未選択";
  panel.appendChild(familyInfo);

  // フォントファイル選択
  const fileRow = document.createElement("div");
  fileRow.className = "path-file-row";
  const fileLabel = document.createElement("label");
  fileLabel.textContent = "Font file";
  fileLabel.style.minWidth = "80px";
  fileLabel.style.fontSize = "0.85rem";
  // input[type=file] は不可視化し、別途ボタンから click() を発火する
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept =
    ".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2,application/octet-stream";
  fileInput.style.position = "absolute";
  fileInput.style.left = "-9999px";
  fileInput.style.width = "1px";
  fileInput.style.height = "1px";
  fileInput.style.opacity = "0";
  const fileButton = document.createElement("button");
  fileButton.type = "button";
  fileButton.className = "path-file-button";
  fileButton.textContent = "Choose Font File…";
  const fileStatus = document.createElement("span");
  fileStatus.className = "path-file-name";
  fileStatus.textContent = pathState.fontFileName
    ? `選択中: ${pathState.fontFileName}`
    : "未選択";
  fileButton.addEventListener("click", () => {
    fileInput.click();
  });
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const buffer = reader.result as ArrayBuffer;
      pathState.fontBase64 = arrayBufferToBase64(buffer);
      pathState.fontFileName = file.name;
      // 内部 family 名を抽出試行。失敗したら file name をフォールバック。
      const extracted = await extractFontFamilyName(buffer);
      if (extracted) {
        pathState.derivedFontFamily = extracted;
        pathState.derivedFontFamilyIsFallback = false;
      } else {
        pathState.derivedFontFamily = file.name.replace(/\.[^.]+$/, "");
        pathState.derivedFontFamilyIsFallback = true;
      }
      savePathConvertState();
      fileStatus.textContent = `選択中: ${file.name}`;
      familyInfo.textContent = `内部 family: ${pathState.derivedFontFamily}${
        pathState.derivedFontFamilyIsFallback ? " (ファイル名フォールバック)" : ""
      }`;
      updateOutput();
    };
    reader.readAsArrayBuffer(file);
  });
  fileRow.appendChild(fileLabel);
  fileRow.appendChild(fileButton);
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
