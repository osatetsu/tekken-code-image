import * as esbuild from "esbuild";
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  rmSync,
  watch,
  writeFileSync,
} from "fs";
import { join } from "path";

const production = process.argv.includes("--production");

// --target オプションのパース (obsidian | web | all、デフォルトは all)
const targetArg = process.argv.find((a) => a.startsWith("--target="));
const targetInput = targetArg ? targetArg.split("=")[1] : "all";

const VALID_TARGETS = ["obsidian", "web", "all"];
if (!VALID_TARGETS.includes(targetInput)) {
  throw new Error(
    `Unknown --target value: "${targetInput}". Valid values: ${VALID_TARGETS.join(", ")}`
  );
}
const targets = targetInput === "all" ? ["obsidian", "web"] : [targetInput];

const obsidianOutDir = "dist";
const webBuildOutDir = "dist-web";
const webDevOutDir = "web"; // dev/watch 時は web/main.js として配置し、web/index.html から相対参照

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function copyObsidianRuntimeAssets() {
  ensureDir(obsidianOutDir);
  copyFileSync("manifest.json", join(obsidianOutDir, "manifest.json"));
  rmSync(join(obsidianOutDir, "shapes.svg"), { force: true });
}

/**
 * web/index.html をそのまま dist-web/ にコピーする。
 * `<script src="./main.js"></script>` は外部参照のままにし、
 * HTML インライン化による文字列破壊 (`escapeXml` 内の `&` 等) を回避する。
 */
function copyWebHtml({ htmlSrcPath, htmlOutPath }) {
  ensureDir(webBuildOutDir);
  copyFileSync(htmlSrcPath, htmlOutPath);
}

function buildObsidianContext() {
  return esbuild.context({
    entryPoints: ["src/entries/obsidian/main.ts"],
    bundle: true,
    outfile: join(obsidianOutDir, "main.js"),
    format: "cjs",
    target: "es2020",
    sourcemap: production ? false : "inline",
    minify: production,
    external: ["obsidian"],
    loader: { ".svg": "text" },
    platform: "node",
    logLevel: "info",
  });
}

function buildWebContext(outDir) {
  return esbuild.context({
    entryPoints: ["src/entries/web/main.ts"],
    bundle: true,
    outfile: join(outDir, "main.js"),
    format: "iife",
    target: "es2020",
    sourcemap: production ? false : "inline",
    minify: production,
    loader: { ".svg": "text" },
    platform: "browser",
    logLevel: "info",
  });
}

async function buildOnce() {
  const shouldBuildObsidian = targets.includes("obsidian");
  const shouldBuildWeb = targets.includes("web");

  if (shouldBuildObsidian) {
    const ctx = await buildObsidianContext();
    await ctx.rebuild();
    await ctx.dispose();
    copyObsidianRuntimeAssets();
  }

  if (shouldBuildWeb) {
    // プロダクションは dist-web/ に出力して単一 HTML を生成
    const ctx = await buildWebContext(webBuildOutDir);
    await ctx.rebuild();
    await ctx.dispose();
    if (production) {
      copyWebHtml({
        htmlSrcPath: "web/index.html",
        htmlOutPath: join(webBuildOutDir, "index.html"),
      });
    }
  }
}

async function watchAll() {
  const shouldBuildObsidian = targets.includes("obsidian");
  const shouldBuildWeb = targets.includes("web");

  if (shouldBuildObsidian) {
    const ctx = await buildObsidianContext();
    await ctx.watch();
    copyObsidianRuntimeAssets();
    watch("manifest.json", copyObsidianRuntimeAssets);
  }
  if (shouldBuildWeb) {
    // dev/watch 時は web/ に出力し、既存の web/index.html から相対参照される形にする
    const ctx = await buildWebContext(webDevOutDir);
    await ctx.watch();
  }
  // プロセスが終了しないように維持
  await new Promise(() => {});
}

if (production) {
  await buildOnce();
} else {
  // 引数なし、または --target がない場合は watch モードとして扱う
  // watch モードを意図的に一回切りで実行したい場合は --once を渡す
  const runOnce = process.argv.includes("--once");
  if (runOnce) {
    await buildOnce();
  } else {
    await watchAll();
  }
}
