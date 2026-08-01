# AGENTS.md

## Project Overview
Obsidian plugin that converts a custom DSL (Tekken fighting game notation) into SVG images.
Code blocks tagged with ` ```tekken ` are rendered as SVG diagrams.

## Role

本ドキュメントにおける、本プロジェクトに関与する人間およびAIの役割を定義する。
用語は本プロジェクト内での意味に限定する。

### 1. 開発者 (Developer)
- **別名**: 指示者 (Director)
- **役割**:
  - アプリケーションの仕様・要件を策定する
  - AIエージェントに自然言語で指示を出す
  - AIが生成したコードや提案を評価・修正する
- **責任範囲**:
  - プロジェクトの方向性と品質の最終決定
  - エンドユーザー体験の設計

## 2. AIエージェント (AI Agent)
- **別名**: アシスタント (Assistant), コーディングエージェント (Coding Agent)
- **役割**:
  - 開発者からの指示を受け、コード生成・修正・提案を行う
  - 必要に応じて技術的な説明や代替案を提示する
- **責任範囲**:
  - 指示に基づく正確かつ効率的な実装
  - エラーや不明点の報告

## 3. エンドユーザー (End User)
- **別名**: 利用者, 顧客 (Customer)
- **役割**:
  - 完成したプラグインを利用する
  - 必要に応じて利用体験に基づくフィードバックを提供する
- **責任範囲**:
  - プラグインの利用規約に従った使用

## Key Specification
製品の技術仕様と設計判断はすべて `SPEC.md` に記載する。変更前に必ず読むこと。
`SPEC.md` を唯一の正本とし、本書には技術仕様を再記載しない。
仕様の矛盾や不足を検知した場合は、実装前に開発者へ報告すること。

## Tech Stack
- Language: TypeScript
- Parser: Chevrotain (lexer + parser)
- SVG: Template strings only (no SVG libraries)
- Build: esbuild
- Test: Vitest

## Directory Structure
```
src/
  main.ts                  # Plugin entry point
  parser/
    lexer.ts               # Chevrotain token definitions
    parser.ts              # Chevrotain grammar -> Diagram
  svg/
    shapes.svg             # 図形定義の編集元
    shapes.ts              # 実行時の図形定義読み込み
    generator.ts           # Diagram -> SVG string
  types/
    index.ts               # Node, Diagram, Settings types
  settings/
    settings.ts            # Obsidian setting definitions
test/
  parser.test.ts
  generator.test.ts
dist/                      # ビルド成果物（Git 管理しない）
  main.js
  manifest.json
  shapes.svg
```

## Build & Test

Coding, Build & Test は、AIエージェントが作業に当たる。
この時の方針を記述する。

- 仕様や設計に矛盾や不足を検知した場合、開発者へ報告すること。
- 実装について、AIエージェントよりも開発者が実施したほうが早い、あるいは、効率が良い場合、報告すること。(例えば、`shapes.svg` の座標を正規化するなど)
- 不具合を見つけた場合について。
  - 推測で修正せず、誠実に対応すること。
  - 不具合の本質的な原因を見つけ、恒久的な対策を開発者へ立案すること。
  - 根本的、恒久的な解決が困難である場合、あるいは、複数の対策が存在する場合、開発者へ報告すること。
- git には不具合修正単位でコミットすること。このとき、コミットメッセージは妥当な内容とすること。
- 優先的に、標準API、あるいは、公式APIを使用すること。次点でライブラリの使用を検討すること。
- 外部のライブラリやモジュールを使用する場合は、マルウェア等を含んでいないことを確認すること。
- テストは極力、AIエージェントが行える方法を選ぶこと。
  - テストケースについて、開発者による提供を選択肢として持つこと。その場合、どのようなテストか開発者へ報告すること。
