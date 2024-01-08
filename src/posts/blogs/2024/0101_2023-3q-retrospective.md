---
title: 豆蔵デベロッパーサイト 2023年10-12月のサマリー
author: masahiro-kondo
date: 2024-01-01
tags: [retrospective]
image: true
---

あけましておめでとうございます。2023年度第3四半期のサマリーです。

## 記事数・執筆者数
この3ヶ月で47本の記事が投稿され、記事数は522になりました。サイト開設から2年で500本を超えたことになります。新規の執筆者は6名でした。

## 各カテゴリーの動向

### ロボット
ロボットの記事も着実に増えています。

- [CCTagマーカーを使ってみた](https://developer.mamezou-tech.com/robotics/vision/cctag/)
- [QtWidgets vs QtQuick](https://developer.mamezou-tech.com/robotics/gui/qtwidget-vs-qtquick/)
- [ロボットマニピュレータ制御のアルゴリズム](https://developer.mamezou-tech.com/robotics/manip-algo/manip-algo/)

ロボットの記事はES事業部のメンバーが執筆しており、非常に専門性の高い内容となっています。

[ロボット | 豆蔵デベロッパーサイト](https://developer.mamezou-tech.com/robotics/)

### LLM
LLM に関する記事も追加されています。

- [独自のデータに基づくAzure OpenAI機能を使ってみた](https://developer.mamezou-tech.com/ml/llm/llm-azure-openai-your-data/)
- [大規模言語モデル初心者がハリーポッター対話モデルを作ってみた](https://developer.mamezou-tech.com/ml/llm/1006_llm-harry-potter/)

LLM の記事はDX戦略事業部のメンバーが中心に執筆しています。

[機械学習 | 豆蔵デベロッパーサイト](https://developer.mamezou-tech.com/ml/)

### アジャイル連載
「業務システムにおけるアジャイル開発」連載に3本の記事が追加されました。

- [業務システムにおけるアジャイル その2：業務フローを元に考える](https://developer.mamezou-tech.com/agile/bs-agile_02/)
- [業務システムにおけるアジャイル その3：SaaSとの相性](https://developer.mamezou-tech.com/agile/bs-agile_03/)
- [業務システムにおけるアジャイル その4：「知」のオープン化](https://developer.mamezou-tech.com/agile/bs-agile_04/)

## テスト

Google Test 連載に GoogleMock編が追加されています。

- [Google Test を使ってみる（その５：GoogleMock編）](https://developer.mamezou-tech.com/blogs/2023/10/08/google-test-05/)

## アドベントカレンダー2023

豆蔵デベロッパーサイトアドベントカレンダーを開催しました。

[アドベントカレンダー2023](https://developer.mamezou-tech.com/events/advent-calendar/2023/)

今年も力作揃いでした。アドベントカレンダーの記事は息長くアクセスを獲得するものが多いので、今年の記事にも期待しています。今回デビューした執筆者も2名いました。

## サイト改善

### 豆香の豆知識コラムが GPT-4 Turbo に移行
一部で好評？トップページのコラム「豆香の豆知識」。AI を GPT-4 から GPT-4 Turbo にアップデート。これまでよりも流暢に IT のジャーゴンを解説してくれています。引き続きお楽しみください。

### SSG を Lume に移行
サイト開設以来 SSG には Eleventy を利用してきましたが、Deno ベースの SSG である [Lume](https://lume.land/) に移行しました。Deno の開発体験のよさは Lume の執筆体験のよさにもつながっていると感じます。Lume に関して入門記事の連載も始まっています。

- [Lume入門](https://developer.mamezou-tech.com/frontend/#lume)

### サイト内検索の改善
これまで Google サイト検索を使用していましたが、Algolia という検索サービスを使って再実装しました。UI と検索結果が改善されていますので、是非ご利用ください。

## 2023年に最も読まれた記事トップ１０

2023年に最も多く読まれた記事トップ10を掲載します。

1. [基本から理解するJWTとJWT認証の仕組み](https://developer.mamezou-tech.com/blogs/2022/12/08/jwt-auth/)
2. [AWS認定資格を12個すべて取得したので勉強したことなどをまとめます](https://developer.mamezou-tech.com/blogs/2022/12/12/aws_all_certified/)
3. [直感が理性に大反抗！「モンティ・ホール問題」](https://developer.mamezou-tech.com/blogs/2022/07/04/monty-hall-problem/)
4. [自然言語処理初心者が「GPT2-japanese」で遊んでみた](https://developer.mamezou-tech.com/blogs/2022/07/08/gpt-2-japanese/)
5. [Nuxt3入門(第4回) - Nuxtのルーティングを理解する](https://developer.mamezou-tech.com/nuxt/nuxt3-routing/)
6. [Nuxt3入門(第1回) - Nuxtがサポートするレンダリングモードを理解する](https://developer.mamezou-tech.com/nuxt/nuxt3-rendering-mode/)
7. [GitHub Actions - 構成変数(環境変数)が外部設定できるようになったので用途を整理する](https://developer.mamezou-tech.com/blogs/2023/01/16/github-actions-configuration-variables/)
8. [統計学で避けて通れない自由度の話](https://developer.mamezou-tech.com/blogs/2022/06/20/degrees-of-freedom/)
9. [Nuxt3入門(第8回) - Nuxt3のuseStateでコンポーネント間で状態を共有する](https://developer.mamezou-tech.com/nuxt/nuxt3-state-management/)
10. [ChatGPTのベースになった自然言語処理モデル「Transformer」を調べていたら「Hugging Face」に行き着いた](https://developer.mamezou-tech.com/blogs/2023/03/20/using-transformer-01/)

記事自体は2022年に書かれたものが多く、息長くアクセスされる記事が多いことを示しています。(2023年公開のバズリ記事が少なかったとも言える)

## 最後に

以上、2023年度第3四半期のまとめでした。

よかったら[フィード](/feed)の購読、[X アカウント](https://twitter.com/MamezouDev)のフォローもお願いします。

本年も豆蔵デベロッパーサイトをよろしくお願いします。
