---
title: 「AWS Certified Machine Learning Engineer - Associate Beta」を受験してAWS認定資格全15種取得してきた
author: kazuyuki-shiratani
date: 2024-12-06
tags: [AWS認定, advent2024]
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2024/
image: true
---
これは[豆蔵デベロッパーサイトアドベントカレンダー2024](/events/advent-calendar/2024/)第6日目の記事です。

## はじめに

先日、「AWS Certified Machine Learning Engineer - Associate Beta」を受験しましたので、準備したことや感想などをまとめました。

:::info
[秘密保持契約（NDA）](https://aws.amazon.com/jp/certification/certification-agreement/)があるため、詳細な試験内容については触れることができませんので、ご了承ください。
:::

## 試験について

[AWS Certified Machine Learning Engineer - Associate（以下、機械学習エンジニア）](https://aws.amazon.com/jp/certification/certified-machine-learning-engineer-associate/)は以下のように説明されています。

- 試験の概要(2024/12/6時点)
  - AWS Certified Machine Learning Engineer - Associate (MLA-C01) 試験では、AWSクラウドを使用した機械学習 (ML) ソリューションとパイプラインの構築、運用化、デプロイ、保守についての受験者の能力を検証します。
  - カテゴリ：Associate
  - 試験時間：130分
  - 出題数：65問
  - 合格基準スコア：720
  - 受験料：150ドル(20,000円 + 税)

ベータ版は170分、85問だったので、問題数が減ってます

## 準備したこと

AWS Certified AI Practitionerと同様、Skill Builderで対象講義を視聴して、AWSのサービスや生成AIに関する知識を身に付けました。

### 試験ガイド

- [試験ガイド](https://d1.awsstatic.com/ja_JP/training-and-certification/docs-machine-learning-engineer-associate/AWS-Certified-Machine-Learning-Engineer-Associate_Exam-Guide.pdf)を読んで、出題範囲、出題形式、合格基準などを確認します。
  - 4分野から出題されます。
    - 1. 機械学習 (ML) のためのデータ準備 (28%)
    - 2. ML モデルの開発 (26%)
    - 3. ML ワークフローのデプロイとオーケストレーション (22%)
    - 4. ML ソリューションのモニタリング、保守、セキュリティ (24%)

### 書籍

- 機械学習に関連するサービスの書籍を読んで、関連サービスの使用方法、活用方法、ベストプラクティスなどを身に着ける。
  - [Amazon Bedrock 生成AIアプリ開発入門 [AWS深掘りガイド]](https://www.amazon.co.jp/dp/4815626448)
  - [実践 AWSデータサイエンス ―エンドツーエンドのMLOpsパイプライン実装](https://www.amazon.co.jp/dp/4873119685)
- 読みたかったが、読めなかった書籍。
  - [AWSではじめる生成AI　RAGアプリケーション開発から、基盤モデルの微調整、マルチモーダルAI活用までを試して学ぶ](https://www.amazon.co.jp/dp/4814400721)

### Skill Builder

- Skill Builderで対象講義を視聴して、AWSのサービスや生成AIに関する知識を身に着ける。
  - [Standard Exam Prep Plan: AWS Certified Machine Learning - Associate (MLA-C01)](https://explore.skillbuilder.aws/learn/learning_plan/view/2191/plan)
    - 英語のみですが、英語字幕をブラウザで日本語に変換して視聴しました。
  - [Enhanced Exam Prep Plan: AWS Machine Learning - Associate (MLA-C01)](https://explore.skillbuilder.aws/learn/learning_plan/view/2192/plan)
    - 英語のみですが、英語字幕をブラウザで日本語に変換して視聴しました。
    - サブスクリプションが必要です。

### 公式問題集

- 公式問題集を解いて、自身の理解度と試験の出題形式を確認する。
  - [AWS Certified Machine Learning Engineer - Associate Official Question Set (MLA-C01 - English)](https://explore.skillbuilder.aws/learn/course/internal/view/elearning/19688/exam-prep-official-practice-question-set-aws-certified-machine-learning-engineer-associate-mla-c01-english)
    - 20問のサンプル問題があります。
    - 英語のみなので、ブラウザの翻訳機能を使いながら解きました。
    - ブラウザの翻訳機能では直訳が多いため、解読困難な場合もあります。
  - [Official Pretest: AWS Certified Machine Learning Engineer - Associate (MLA-C01)](https://explore.skillbuilder.aws/learn/course/internal/view/elearning/19742/exam-prep-official-pretest-aws-certified-machine-learning-engineer-associate-mla-c01-english)
    - 65問のサンプル問題があります。
    - サブスクリプションが必要です。
    - 英語のみなので、ブラウザの翻訳機能を使いながら解きました。
    - ブラウザの翻訳機能では直訳が多いため、解読困難な場合もあります。

### Skill Builderのサブスクリプションについて

Skill Builderのサブスクリプションに登録してみてわかったことを記載しておきます。
詳細は[こちら](https://skillbuilder.aws/subscriptions)を参照してください。

- 29ドル/月のコストが必要です。
- AWSアカウントから請求されます。
- イベント参加等で発行されるクレジットは使用できません。
- 登録月は登録日からの日割り請求です。

## 気を付けた点

- 生成AIの知識よりも、以下の知識が必須であることがわかりました。
  - SageMakerなどの機械学習に関する知識
  - ファインチューニングしたAIに対する評価方法
  - 責任あるAIに関する知識
- 他の試験区分同様、AWSサービスのベストプラクティスを押さえることが重要であることがわかりました。
- 問題文の制約（分析にかかる時間、リアルタイム性など）からどのサービスを選択すべきかを整理しておく必要があります。
  - 15分を超える処理はLambdaではなくECSやBatchなどを選択する
  - リアルタイム性が必要であればETLにGlueを選択する
  - 翌日までにデータが処理されればよいのであれば、S3に保管しスポットインスタンスでデータ処理する

## 受験

AWS Certified Machine Learning – Specialtyと比べて、問題文は短いものの難易度はあまり変わらないように感じました。

公式問題集よりは選択に悩む問題があった印象です。

翻訳精度はブラウザの翻訳機能に比べると読みやすいと感じました。

試験時間は170分でしたが、筆者は見直しを軽くしかしないため120分ほどで完了して退室しました。

[新しい種類の試験問題の追加](https://aws.amazon.com/jp/blogs/news/aws-certification-new-exam-question-types/)でアナウンスされていたような従来と異なる解答形式の問題は1問ずつ出題されました。公式問題にも出題があるので、体験しておくことをお勧めします。

## 受験後

結果はその場では出ず、19時過ぎにメールが届き、ポータルサイトで確認できました。

スコアは少し余裕を持って合格でした。

## まとめ

- 無事に現在取得可能なAWS認定15個をすべて取得した状態になりました。
- 試験自体は他のAssociate以上のAWS認定を取得していれば難しく感じないと思います。
- 昨今のトレンドから、どうしても生成AIの知識を準備したくなりますが、機械学習や責任あるAIに関する知識がメインであることに気を付けましょう。

以上、簡単なまとめになりますが、これから受験を予定されている方の参考になれば幸いです。


