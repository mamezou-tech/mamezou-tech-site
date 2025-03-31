---
title: 豆蔵デベロッパーサイト 2025年1-3月のサマリー
author: masahiro-kondo
date: 2025-04-01
tags: [retrospective]
image: true
---

2025年度に入りました。2024年度第4四半期のサマリーです。

## 記事数・執筆者数
この3ヶ月で32本の記事が投稿されました。記事数は700本を超え、711になりました。新たに1名が執筆デビューし、累計64名になりました。年明けというか年度末の繁忙期もあり、投稿数はやや少なくなっています。⤵️

## 連載記事

### Javaエンジニアが始めるTypeScript入門
Java エンジニアをターゲットとした TypeScript 入門。第9回の記事が公開されました。

@[og](/typescript-intro/introduction-to-typescript-for-java-engineer_generics/)

### 「今さら聞けないMaven」シリーズ
Maven の tips をお届けするシリーズ。久々に記事が公開されました。

@[og](/blogs/2025/03/30/maven-java24-warning/)

## 特定テーマの記事

### ロボット関連
ロボット関連では、2記事が公開されています。

DQN のアルゴリズムを詳細に解説した記事。ロボットに限らず参考になると思います。

@[og](/robotics/rl/rl_for_robot/)

国産のロボットシミュレータ Choreonoid の紹介。

@[og](/robotics/choreonoid/choreonoid_part1/)


### textlint と VS Code 連携
以下の記事では CLI の出力を VS Code エディタ上で表示する汎用的な仕組みが解説されており、同様のことを実現したい人にとっては参考になると思います。

@[og](/blogs/2025/01/24/vscode-problemmatcher/)

@[og](/blogs/2025/01/27/textlint-tuning-allowlist/)

デベロッパーサイトの執筆環境では textlint による校正を行うことができますが、ターミナルから実行する形式でした。これら記事公開に伴い、VS Code のエディタ上で構成結果を表示するためのプルリクエストも作成され、デベロッパーサイトのリポジトリにマージされました。👍 これで、校正も捗ります。

### 生成 AI 関連
昨今の状況から OpenAI や GitHub Copilot など生成 AI 関連の記事が多くなっています。

データベースやログに保存される個人情報をいかに秘匿するかという問題はどの企業でも重要テーマです。生成 AI を使ったソリューションの導入も進んでいるようです。

@[og](/blogs/2025/01/04/presidio-intro/)

検索を得意とする Perplexity の新 API 紹介記事

@[og](/blogs/2025/01/22/perplexity-sonar-intro/)

GitHub Copilot も進化中。

@[og](/blogs/2025/02/15/refactor-code-with-github-copilot-edits/)

@[og](/blogs/2025/02/16/try-github-copilot-agent/)

ローカルで手軽に LLM を実行できる Ollama の紹介。

@[og](/blogs/2025/02/20/ollama_local_llm/)

LangChain の 生成 AI が長期記憶を保持できるようにする話。

@[og](/blogs/2025/02/26/langmem-intro/)

@[og](/blogs/2025/03/12/langmem-aurora-pgvector/)

OpenAI の SDK の最新情報。

@[og](/blogs/2025/03/19/openai-responses-api-filesearch/)

@[og](/blogs/2025/03/23/openai-agents-sdk-intro/)

### 電子工作関係
コンパクトなマイコンで回路を組み、タイトな低レイヤープログラミングをして、ミンティアの小さなケースでシーリングライトのリモコンを作り上げる話。三部作として公開されました。

@[og](/blogs/2025/03/28/ir-remote-control-with-attiny13a_epi1/)

@[og](/blogs/2025/03/28/ir-remote-control-with-attiny13a_epi2/)

@[og](/blogs/2025/03/28/ir-remote-control-with-attiny13a_epi3/)

### 図解シリーズ

扱うテーマは様々ですが、図を用いて視覚的に説明する記事が多かったのもこの四半期の特徴です。文章とコードスニペットだけでなく、図による解説があると理解しやすいですね。

@[og](/blogs/2025/01/10/go-conc/)

@[og](/blogs/2025/01/17/cycle-postgres/)

@[og](/blogs/2025/01/22/build_system_ninja/)

@[og](/blogs/2025/02/07/bgp-simulation/)

@[og](/blogs/2025/02/14/bgp-simulation-2/)

### Java 関連
今年 Jakarta EE 11 に追加が予定されている Jakarta Data の詳細解説です。

@[og](/blogs/2025/03/12/getting-started-with-jakarta-data-1/)

### Electron 関連
@[og](/blogs/2025/01/07/build-context-menu-in-electron-app/)

@[og](/blogs/2025/03/31/electron-v35-service-worker-preload-scripts/)

### アジャイル・プロジェクトマネージメント
@[og](/blogs/2025/03/24/what_is_project_management/)

@[og](/blogs/2025/03/27/scrum-books/)

## 中国語訳記事の公開を開始
英訳記事に続き、生成 AI による中国語への翻訳記事の公開を始めました。英訳記事は少ないながらも堅調にアクセスを獲得しているため、中華圏からのアクセスにも期待しています。翻訳済みの記事にはタイトルの下に、英語版、中国語版へのリンクが作成されています。

![links for other language](https://i.gyazo.com/d8c0a63051e5e820a2133ace0a00d049.png)

## さいごに
以上、2024年度第4四半期のサマリーでした。執筆者の専門や関心を反映したコアな内容の記事が増えていると思います。

よかったら[フィード](/feed/)の購読、[X](https://x.com/MamezouDev) や [Bluesky](https://bsky.app/profile/mamezoudev.bsky.social) でのフォローもお願いします。[Facebook](https://www.facebook.com/mamezou.jp) でも本サイトの注目記事をはじめ豆蔵に関するイベントを紹介しています。[note](https://note.com/mamezou_info) にも時々本サイト関連の記事が掲載されています。
