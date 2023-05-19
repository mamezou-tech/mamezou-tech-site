---
title: Deno KV を Deno Deploy で使う
author: masahiro-kondo
date: 2023-05-18
tags: [Deno]
---

先日の記事「[Deno のビルトイン key-value データベース Deno KV が登場](/blogs/2023/05/09/deno-kv/)」ではローカルで試しただけでした。

> クローズドベータが使えるようになったら Deno Deploy で試してみたいと思います。

と書いた通り Deno KV クローズドベータの waiting list に登録していました。1週間ぐらいでインビテーションがきて筆者の Deno Deploy アカウントで利用できるようになりました。

## Deno Deploy にデプロイ
ということで、早速先日の記事で作成したプロジェクトを使ってデプロイしていきます。

Deno Depoly のコンソールでプロジェクトを作成します。

![New Project](https://i.gyazo.com/9ee6ecdba86e3d88cb6e8faf4e6207d2.png)

`Deploy from GitHub repository` を選んで、リンク対象の GitHub リポジトリを選択します。

![Select GitHub repo](https://i.gyazo.com/2833e6db27aca5eca19dcfb71545cecb.png)

Git Integration は Automatic でよいです。コードが書かれたファイル(ここでは mod.ts) を選択します。

![deploy from github repo](https://i.gyazo.com/b8d4077ec10c336a8e4f51c4faea9936.png)

:::info
Deno Deploy での Deploy 方法については以下の記事に書いています。Git Integration の種類についても触れています。

[Deno を始める - 第6回 (Deno Deploy で静的ファイルを配信)](https://developer.mamezou-tech.com/deno/getting-started/06-serving-files-on-deno-deploy/)
:::

リポジトリをリンクしてしばらくするとデプロイが完了し、サイトのドメインが確定しました。

![Deployed](https://i.gyazo.com/b0f898e45302bd52a325346906a7e839.png)

## 動作確認

デプロイされたエンドポイントの API を叩きました。[前回記事](/blogs/2023/05/09/deno-kv/)では key-value の value だけ返していましたが、key を含めて返すようにしています。

```shell
$ curl https://kondoumh-deno-serve-kv.deno.dev/books/978-1-09-123456-2 | jq .
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100   143  100   143    0     0    530      0 --:--:-- --:--:-- --:--:--   539
{
  "key": [
    "books",
    "978-1-09-123456-2"
  ],
  "value": {
    "title": "The Great Gatsby",
    "author": "F. Scott Fitzgerald"
  },
  "versionstamp": "00000619c4832d3e0000"
}

$ curl https://kondoumh-deno-serve-kv.deno.dev/books | jq .
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100   549  100   549    0     0    558      0 --:--:-- --:--:-- --:--:--   561
[
  {
    "key": [
      "books",
      "978-1-09-123456-2"
    ],
    "value": {
      "title": "The Great Gatsby",
      "author": "F. Scott Fitzgerald"
    },
    "versionstamp": "00000619c4832d3e0000"
  },
  {
    "key": [
      "books",
      "978-1-09-123456-3"
    ],
    "value": {
      "title": "The Grapes of Wrath",
      "author": "John Steinbeck"
    },
    "versionstamp": "00000619c4859a8f0000"
  },
  {
    "key": [
      "books",
      "978-1-09-123456-4"
    ],
    "value": {
      "title": "Nineteen Eighty-Four",
      "author": "George Orwell"
    },
    "versionstamp": "00000619c48803060000"
  }
]
```

登録も動きました。

```shell
$ curl -X POST -H "Content-Type: application/json" https://kondoumh-deno-serve-kv.deno.dev/books -d '{"isbn":"978-1-09-123456-5","title":"deno book", "author":"mh"}'
00000618a8ceaea50000
```
ローカルでの開発時もそうでしたが、データベース設定は一切なしで使えているので完全マネージドな環境ですね。

## KV の管理画面
サイトの管理画面にも KV が Beta として追加されました。

KV を使っているプロジェクトでは、データ内容とキーによる検索が可能でした。
![kv beta](https://i.gyazo.com/11a79cc7114ae418cf0b62fcbedc60fc.png)

KV を使っていないプロジェクトでは当然何も出ていません。

![no kv](https://i.gyazo.com/4a8efa2c8f955ded76b5ea9a732afe78.png)

:::info
クローズドベータですが、守秘義務に関する条項は見当たらなかったのでスクリーンショットを掲載しています。
:::

## 最後に
以上、Deno Deploy で Deno KV を使用するコードをデプロイして動作確認してみました。Geo レプリケーションされた完全マネージドな KVS を使ったアプリを TypeScript ファイル1個でデプロイできる手軽さは魅力的ですね。
