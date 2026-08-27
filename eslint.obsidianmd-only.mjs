import { cwd } from "node:process";
import obsidianmd from "eslint-plugin-obsidianmd";
import tseslint from "typescript-eslint";

export default [
  // 1. グローバルな無視対象
  //    projectService が型情報を解決できないファイルや成果物を除外する
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "dist-web/**",
      "web/**",
      "main.js",
      "main.js.map",
      "test-output/**",
      "test-results/**",
      "coverage/**",
      // 型情報必須ルールが projectService を介して .ts/.json 以外のファイルを
      // 扱えないため、設定・ビルド系スクリプトは除外する
      "esbuild.config.mjs",
      "eslint.config.mjs",
      "eslint.obsidianmd-only.mjs",
      "playwright.config.ts",
      "vitest.config.ts",
    ],
  },

  // 2. プラグイン実装とテストファイルに対して
  //    obsidianmd ルールと必要なプラグインを適用する
  {
    files: [
      "src/**/*.ts",
      "test/**/*.ts",
      "manifest.json",
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.obsidianmd-only.mjs"],
        },
        tsconfigRootDir: cwd(),
        extraFileExtensions: [".json"],
      },
    },
    plugins: {
      obsidianmd,
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      ...obsidianmd.ruleConfigs.recommended,
      ...obsidianmd.ruleConfigs.recommendedTypeChecked,
      // SVG 属性(fill / stroke 等)の設定は本プラグインの本来の用途であり
      // DOM スタイリングとは別領域のため無効化する
      "obsidianmd/no-static-styles-assignment": "off",
    },
  },
];
