import { cwd } from "node:process";
import { globalIgnores } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default [
  // 1. ビルド成果物・依存・外部配布物・Playwright 成果物を lint 対象外にする
  globalIgnores([
    "node_modules/**",
    "dist/**",
    "dist-web/**",
    "web/**",
    "main.js",
    "main.js.map",
    "test-output/**",
    "test-results/**",
    "coverage/**",
    // Obsidian プラグインの配布物 manifest は src/manifest ではなく manifest.json 単体が正本。
    // ただし validate-manifest で実体検証するため、ここでは除外しない。
  ]),

  // 2. typescript-eslint に TypeScript プロジェクトの解決を任せる
  //    `obsidianmd.configs.recommended` 側で `recommendedTypeChecked` を含むため、
  //    projectService を有効にしないと型情報必須ルールが機能しない。
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.mjs"],
        },
        tsconfigRootDir: cwd(),
        extraFileExtensions: [".json"],
      },
    },
  },

  // 3. Obsidian 公式推奨構成を取り込む
  //    ESLint core / typescript-eslint / 全 obsidianmd ルール / Obsidian globals を含む
  ...obsidianmd.configs.recommended,

  // 4. 個別ルール上書き
  {
    rules: {
      // 現状コードに `Object.assign` 系の利用が無いためデフォルトのまま (object-assign は warn 推奨)
      // テスト系や Web 側で false-positive が増えるようなら、個別 disable を追加する想定。
    },
  },
];
