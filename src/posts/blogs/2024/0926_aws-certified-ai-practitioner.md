---
title: 「AWS Certified AI Practitioner Beta」を受験して14冠になった
author: kazuyuki-shiratani
date: 2024-09-26
tags: [AWS認定]
image: true
---

## はじめに

「AWS Certified AI Practitioner Beta」を受験してきました。準備したことや感想などをまとめます。

:::info
[秘密保持契約（NDA）](https://aws.amazon.com/jp/certification/certification-agreement/)があるため、詳細な試験内容については触れることができませんので、ご了承ください。
:::

## 試験について

[AWS Certified AI Practitioner（以下、AIプラクティショナー）](https://aws.amazon.com/jp/certification/certified-ai-practitioner/)は以下のように説明されています。

- 試験の概要
  - AWS Certified AI Practitioner (AIF-C01) 試験は、特定の職務に関係なく、AI/ML、生成 AI テクノロジー、関連する AWS のサービスとツールに関する総合的な知識を効果的に実証できる個人を対象としています。
  - カテゴリ：Foundational
  - 試験時間：120分
  - 出題数：85問
  - 合格基準スコア：700
  - 受験料：10,000円 + 税 （半額バウチャー利用可能）

※ベータ試験であるため、正式リリース後は試験時間や出題数などが変更される可能性があります。

## 申し込み

8月13日から受験の申込みが開始されるとアナウンスされていたこともあり、当日は申込サイトを覗いていました。

受験可能なのは翌日からだと勝手に思い込んでお盆中に受験しようと思っていましたが、受験申し込みを進めてみると受験可能日は8月27日からでした。

調整の結果、9月8日の受験となりました。

## 準備したこと

生成AIについてはほとんど触れないままでしたので、2年前に取得したAWS Certified Machine Learning - SpecialtyやG検定で身に着けた知識からのスタートになりました。

なお、AWS Summitで発表されてから少しずつ準備をしようと思っていましたが、8月頭に別の資格試験が控えていたため、実質準備開始したのはお盆前からの1か月弱になりました。

### 試験ガイド

- [試験ガイド](https://d1.awsstatic.com/ja_JP/training-and-certification/docs-ai-practitioner/AWS-Certified-AI-Practitioner_Exam-Guide.pdf)を読んで、出題範囲、出題形式、合格基準などを確認します。
  - 5分野から出題されます。
    - 1. AI と ML の基礎 (20%)
    - 2. 生成 AI の基礎 (24%)
    - 3. 基盤モデルの応用 (28%)
    - 4. 責任ある AI に関するガイドライン (14%)
    - 5. AI ソリューションのセキュリティ、コンプライアンス、ガバナンス (14%)

### 書籍

- 機械学習(ML)、人工知能(AI)、生成AIに関する書籍を読んで、基礎的な知識を身に着ける。
  - [図解即戦力　機械学習&ディープラーニングのしくみと技術がこれ1冊でしっかりわかる教科書](https://www.amazon.co.jp/dp/429710640X)
  - [深層学習教科書 ディープラーニング G検定(ジェネラリスト)公式テキスト 第3版](https://www.amazon.co.jp/dp/4798184810)
  - [生成ＡＩパスポート テキスト&問題集](https://www.amazon.co.jp/dp/4800591740)

- 関連サービスに関する書籍を読んで、関連サービスの使用方法、活用方法、ベストプラクティスなどを身に着ける。
  - [Amazon Bedrock 生成AIアプリ開発入門 [AWS深掘りガイド]](https://www.amazon.co.jp/dp/4815626448)

### Skill Builder

- Skill Builderで対象講義を視聴して、AWSのサービスや生成AIに関する知識を身に着ける。
  - [Standard Exam Prep Plan: AWS Certified AI Practitioner (AIF-C01)](https://explore.skillbuilder.aws/learn/learning_plan/view/2193/plan)
    - 英語のみですが、英語字幕をブラウザで日本語に変換して視聴しました。
  - [Enhanced Exam Prep Plan: AWS Certified AI Practitioner (AIF-C01)](https://explore.skillbuilder.aws/learn/learning_plan/view/2194/plan)
    - サブスクリプションが必要です。
    - 英語のみですが、英語字幕をブラウザで日本語に変換して視聴しました。

### 公式問題集

- 公式問題集を解いて、自身の理解度と試験の出題形式を確認する。
  - [Exam Prep Official Practice Question Set: AWS Certified AI Practitioner (AIF-C01 - English)](https://explore.skillbuilder.aws/learn/course/internal/view/elearning/19790/exam-prep-official-practice-question-set-aws-certified-ai-practitioner-aif-c01-english)
    - 20問のサンプル問題があります。
    - 英語のみなので、ブラウザの翻訳機能を使いながら解きました。
    - ブラウザの翻訳機能では直訳が多いため、読み取り困難な場合は原文を確認しながら進めます。
  - [Exam Prep Official Pretest: AWS Certified AI Practitioner (AIF-C01 - English)](https://explore.skillbuilder.aws/learn/course/internal/view/elearning/20274/exam-prep-official-pretest-aws-certified-ai-practitioner-aif-c01-english)
    - サブスクリプションが必要です。
    - 65問のサンプル問題があります。
    - 英語のみなので、ブラウザの翻訳機能を使いながら解きました。
    - ブラウザの翻訳機能では直訳が多いため、読み取り困難な場合は原文を確認しながら進めます。

### Udemy

- Udemyで関連の教材を視聴して、AWSのサービスや生成AIに関する知識を身に着ける。
  - [[NEW] Ultimate AWS Certified AI Practitioner AIF-C01](https://www.udemy.com/course/aws-ai-practitioner-certified/)
    - 日本語字幕がありました。
    - Udemy Businessにも同講座がありました。

## 準備しながら気づいたこと

- AIプラクティショナーという名称と昨今のトレンドから生成AIの比重が高くなるのではないかと思い、Bedrock、RAG、プロンプトエンジニアリングなど生成AIに関する知識について重点的に準備しました。
- ただし、試験ガイドや公式問題集の内容を見るとわかるのですが、SageMakerなどの機械学習に関する知識、ファインチューニングしたAIに対する評価方法などの責任あるAIに関する知識も必須であることがわかりました。
- AIに関連したサービスの使い方を知っておくことが重要であることがわかりました。
  - Amazon Polly：テキスト読み上げ
  - Amazon Transcribe：音声認識
  - Amazon Translate：翻訳
  - Amazon Lex：チャットボット
  - Amazon Rekognition：画像認識
  - Amazon Textract：テキスト抽出
  - Amazon Comprehend：自然言語処理
- 他の試験区分同様、AWSサービスのベストプラクティスを押さえることが重要であることがわかりました。

## 受験

いつもと同じ博多駅近くのテストセンターで10時から受験してきました。

Foundationalということもあり、ProfessionalやSpecialtyと比べると問題文が短く単純だと感じました。

公式問題集よりは選択に悩む問題があった印象です。

翻訳精度はブラウザの翻訳機能に比べると読みやすいと感じました。

試験時間は120分でしたが、筆者は見直しを軽くしかしないため70分ほどで完了して退室しました。

ちなみに、[新しい種類の試験問題の追加](https://aws.amazon.com/jp/blogs/news/aws-certification-new-exam-question-types/)でアナウンスされていたような従来と異なる解答形式の問題は公式問題集には出てきていましたが、今回の受験では出題されませんでした。

## 受験後

結果はその場では出ず、19時過ぎにメールが届き、ポータルサイトで確認できました。

スコアは少し余裕を持って合格でした。

## まとめ

- 今回も無事一発合格できました。
- 試験自体はAssociate以上のAWS認定を取得していれば難しく感じないと思います。
- 昨今のトレンドから、どうしても生成AI中心に準備したくなりますが、機械学習や責任あるAIに関する知識も必須であることに気を付けましょう。
- 関連する資格として、以下の取得を検討してもいいかもしれません。
（※筆者は各検定団体の回し者ではありません）
  - [G検定](https://www.jdla-exam.org/d/)
  - [生成AIパスポート](https://guga.or.jp/generativeaiexam/)
  - [データサイエンティスト検定](https://www.datascientist.or.jp/dscertification/)

以上、簡単なまとめになりますが、これから受験を予定されている方の参考になれば幸いです。

※後日、「AWS Certified Machine Learning Engineer - Associate Beta」も受験してきましたので、近日中に投稿する予定です。
