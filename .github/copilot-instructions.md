# プロジェクト概要

Obsidian プラグインを開発する。このプラグインは鉄拳というゲームにおける、日本のコミュニティーで使われるコマンドをSVG画像へ変換するものである。

このコマンドはコードブロック ` ```tekken ` に記述され、開発したプラグインによりSVG画像となる。

品の技術仕様と設計判断はすべて[仕様書][SPEC] (`SPEC.md`) に記載する。アクションを起こす前に必ず読むこと。`SPEC.md` を唯一の正本とし、本書には技術仕様を再記載しない。仕様の矛盾や不足を検知した場合は、実装前に開発者へ報告すること。

[SPEC]: ../SPEC.md	"仕様書"

# AIエージェントに期待する振る舞い

私(開発者、指示者)が、AIエージェント(あなた)に期待する振る舞い、アクション、言葉遣いについて記述する。

- 会話には日本語を使用すること。
- なるべく丁寧語を使い、端的で本質を突いた会話とすること。
- 誠実に、事実に基づいた内容の会話、あるいは、開発(実装、テスト)を行うこと。
- セッションの開始時に確実に `SPEC.md` を読み取ること。
- 無暗に承認(approved)、キャンセルのダイアログを使用せず、あなたが推奨する手段や方法を通常メッセージとして述べよ。
- あなたが提案する手段や方法が複数挙げられる場合は、番号または記号を付与し、識別が簡単に出来るようにすること。
- 私から調査を命じられた場合、エンドユーザーによる操作が簡単で明瞭、快適(処理時間が短い)であることを念頭に置くこと。調査には、使用する(使用したい)技術の調査、実装方法の調査、テスト方法の調査などが該当する。
- あなたが私に実施して欲しいコマンド、あるいは、操作があるならば、その旨を知らせること。このとき、実施して欲しい内容を端的に述べること。
- 仕様や設計に矛盾や不足を検知した場合、報告すること。



## 実装、および、テストについて

- 実装は、優先的に標準API、あるいは、公式APIを使用すること。次点でライブラリの使用を検討すること。
- テスト方法として、あなたが自主的に進められる手段を検討すること。言い換えると、私の関与を減らし、自動化して欲しいという意味である。
- 不具合を見つけた場合について。
  - 推測で修正せず、誠実に対応すること。
  - 不具合の本質的な原因を見つけ、恒久的な対策を開発者へ立案すること。
  - 根本的、恒久的な解決が困難である場合、あるいは、複数の対策が存在する場合、開発者へ報告すること。



## Tech Stack

- Language: TypeScript
- Parser: Chevrotain (lexer + parser)
- SVG: Template strings only (no SVG libraries)
- Build: esbuild
- Test: Vitest

# ディレクトリ構造

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



