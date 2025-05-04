---
title: CloudFormation小技テクニック紹介 (配列とループ処理)
author: toshiki-nakasu
date: 2025-99-99 # FIXME
tags: [AWS, CloudFormation, ソースコード, 学び, 小技]
image: true
---

:::info:この記事で紹介すること

- CloudFormationでの配列の利活用
- CloudFormationでのループテンプレート記述
:::

1. CloudFormationとは (概要のみ)
    ※今回は私の好みでyamlのみ
1. CloudFormationでの配列について
1. CloudFormationでのループ記述について
    1. SNSサービスでの送信先定義
    1. QuickSightサービスのデータセットリソースの定義
        SPICE形式, 直接クエリ形式どちらも
        QuickSightのテンプレートも癖が多いので、リクエストがあれば別記事で書きます
