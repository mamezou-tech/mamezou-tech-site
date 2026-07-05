---
title: 豆蔵デベロッパーサイト 2026年4-6月のサマリー
author: masahiro-kondo
date: 2026-07-05
tags: [retrospective]
image: true
---

今年も半分が過ぎました。2026年4-6月のサマリーです。

## 記事数・執筆者数
この3ヶ月で13本の記事が投稿され、記事数は889になりました。

## 連載
### AIエージェントとシステムをつなぐMCP入門
MCP(Model Context Protocol) は AI エージェントが外部サービスと通信するための仕様で、2024年に Anthropic 社によって初版がリリースされました。MCP を使用することで、AI エージェントは外部サービスの機能を効果的に利用できます。MCP の基本から実装まで段階を分けて解説するシリーズです。

@[og](/blogs/2026/04/24/mcp-impl_introduction/)

現在は以下の6記事が公開されています。

- [イントロダクション](/blogs/2026/04/24/mcp-impl_introduction/)
- [stdio実装編](/blogs/2026/05/08/mcp-impl_stdio/)
- [StreamableHTTPステートレス実装編](/blogs/2026/05/22/mcp-impl_http_stateless/)
- [StreamableHTTPステートフル実装編](/blogs/2026/06/05/mcp-impl_http_stateful/)
- [プロンプト編](/blogs/2026/06/19/mcp-impl_prompt/)
- [リソース編](/blogs/2026/07/03/mcp-impl_resource/)

## テーマ別記事
### 認定資格

@[og](/blogs/2026/04/13/google_cloud_all_certified_revenge/)

@[og](/blogs/2026/04/20/aws_certified_generative_ai_developer/)

### ペアレンタルコントロール
上記の AWS・Google Cloud 認定を“W全冠”したエンジニアが、クラウドから降りて自宅のネットワークと格闘した異色の記事です。夜中に学校用タブレットでゲームをする子供との「イタチごっこ」に終止符を打つべく、手持ちの家庭用ルータとRaspberry Piを活用して、MACアドレス制限やサブネット分離、Pi-holeによる独自DNS構築まで、本気の「ガチ構成」を徹夜で組み上げる様子を赤裸々に綴っています。DoH（暗号化DNS）対策などのリアルな課題にも触れられており、ネットワークの基礎を学び直したい方や、同じ悩みを持つITエンジニアの親御さん必見の泥臭くも愛に溢れた実践録です。

@[og](/blogs/2026/04/09/home_network_control/)

### スクラムマスターと AI
チームの対話を支えるスクラムマスターにとって、視覚的な資料作成は欠かせませんが、一方で多大な時間がかかるのが共通の悩み。本記事では、そのボトルネックを AI で突破する実践的な手法を解説しています。ChatGPT を思考のパートナーとして構成を練り上げ、最新の生成 AI ツールでスライドを一気に形にする――単なる「時短術」に留まらず、AI との対話を通じてアイデアを磨き、本来注力すべきファシリテーションやコーチングの質を高めるための「共創のプロセス」を紹介しています。資料作成の重圧から解放され、チームの価値最大化に向き合いたいリーダー・マネージャーにとっても役立つ内容となっています。

@[og](/blogs/2026/04/27/ai-presentation/)

### GitHub

GitHub の Organization 運用において、「機密リポジトリを作りたいが、Basic Permission の設定変更による管理コスト爆発は避けたい」というジレンマ。この記事では、高価なEnterprise プランを契約せずとも、Teams プランの制限下で安全かつ効率的にアクセス権を管理する「ホワイトリスト方式」の戦略を解説しています。全メンバー用の統合チーム作成によるセキュリティ境界の構築から、GitHub API と Actions を組み合わせた「チーム追加漏れを防ぐ自動化スクリプト」の実装まで、管理者の負担を増やさない現場目線のハックを紹介しています。

@[og](/blogs/2026/06/24/github-manage-organization-access/)


CI/CD 環境で広く使われる GitHub Actions に新たに追加された、単一ワークフロー内でのステップ並行実行機能をいち早く検証した記事です。background 属性を使った非同期実行や、parallel ブロックを使った同時実行の基本構文を解説するだけでなく、Go 言語のクロスコンパイルを用いた実践的なパフォーマンス検証も実施。vCPU コア数やコンテキストスイッチの観点から「期待したほど速くならなかった理由」と、「これまでの Matrix ビルドとどう使い分けるべきか」まで深く考察しており、現場の CI 改善に直結する生きた知見が得られます。はてなブックマークでも注目され、公開直後からアクセスが上昇しました。

@[og](/blogs/2026/06/27/github-actions-parallel-steps/)

## さいごに
以上、2026年度第1四半期のサマリーでした。投稿数が少なかったため、個別の記事紹介を厚めにしてみました。

よかったら[フィード](/feed/)の購読、[X](https://x.com/MamezouDev) や [Bluesky](https://bsky.app/profile/mamezoudev.bsky.social) でのフォローもお願いします。[Facebook](https://www.facebook.com/mamezou.jp) でも本サイトの注目記事をはじめ豆蔵に関するイベントを紹介しています。[note](https://note.com/mamezou_info) にも時々本サイト関連の記事が掲載されています。

