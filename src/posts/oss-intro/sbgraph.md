---
title: "sbgraph"
description: '豆蔵社員が開発するOSS紹介 sbgraph 編'
date: 2021-11-26
tags: [scrapbox]
---

[sbgraph](https://github.com/mamezou-tech/sbgraph) は [Scrapbox](https://scrapbox.io) のページ間リンクを可視化するためデータを出力する CLI です。

Scrapbox はページ間のリンクを簡単に作成し、ページ配下にリンク先のページが可視化されていくユニークな情報共有システムです。豆蔵では社員の情報共有ツールとして大いに活用されています。

[豆蔵のScrapbox活用！コンサルタントの能動性に火をつけマインドチェンジを後押し](https://www.scrapbox-news.com/blog/scrapbox-415b4b98-281f-46cd-b6cc-d2a5a609e770)

sbgraph を使うと Scrapbox プロジェクトの全ページのリンク情報を抽出し dot ファイルを出力するので、GraphViz で可視化することが可能です。

![](https://user-images.githubusercontent.com/2092183/79331841-ca874880-7f56-11ea-9127-c1f249742028.png)

sbgraph は golang で実装しています。Linux / macOS / Windows のバイナリをリリースページから取得可能です。

[Latest releas](https://github.com/mamezou-tech/sbgraph/releases/latest)

golang が利用できる環境では go install コマンドでもインストール可能です。

```
go install github.com/mamezou-tech/sbgraph@latest
```

sbgraph では以下のサブコマンドが提供されています。

| サブコマンド | 説明 |
|:--|:--|
| init      | 設定ファイルを生成しワーキングディレクトリを決めます |
| project   | データ抽出対象の Scrapbox プロジェクトを指定します |
| status    | 設定情報を出力します |
| fetch     | 対象プロジェクトからページ情報を取得しワーキングディレクトリ配下にキャッシュします |
| aggregate | ワーキングディレクトリにキャッシュしたプロジェクトの情報から、ページビュー・リンク数などの情報を集計します |
| graph     | ワーキングディレクトリにキャッシュしたプロジェクトの情報からグラフ構造を抽出して dot ファイル形式などで出力します |


以下のようにサブコマンドを実行してグラフデータを取得します。

```
sgbraph init
sbgraph project -p foobar
sbgraph fetch
sbgraph graph
```

詳しい使い方は [README](https://github.com/mamezou-tech/sbgraph/blob/master/README.md) を参照してください。

sbgraph では dot 形式だけではなく、独自の JSON 形式の出力も可能です。この形式のファイルを使って独自に可視化システムを構築することもできます。以下にパブリックな Scrapbox プロジェクトをデータとして使用した [D3.js](https://d3js.org/) による可視化のデモサイトを立ち上げています。

[Scrapbox viz](https://sb-data-kondoumh.netlify.app/)
