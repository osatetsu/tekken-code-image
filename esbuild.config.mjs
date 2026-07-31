import * as esbuild from "esbuild";
import { copyFileSync, mkdirSync, watch } from "fs";
import { join } from "path";

const production = process.argv.includes("--production");
const outputDirectory = "dist";

function copyRuntimeAssets() {
  mkdirSync(outputDirectory, { recursive: true });
  copyFileSync("manifest.json", join(outputDirectory, "manifest.json"));
  copyFileSync("src/svg/shapes.svg", join(outputDirectory, "shapes.svg"));
}

const ctx = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  outfile: join(outputDirectory, "main.js"),
  format: "cjs",
  target: "es2020",
  sourcemap: production ? false : "inline",
  minify: production,
  external: ["obsidian"],
  platform: "node",
  logLevel: "info",
});

if (production) {
  await ctx.rebuild();
  await ctx.dispose();
  copyRuntimeAssets();
} else {
  await ctx.watch();
  copyRuntimeAssets();
  watch("manifest.json", copyRuntimeAssets);
  watch("src/svg/shapes.svg", copyRuntimeAssets);
}
