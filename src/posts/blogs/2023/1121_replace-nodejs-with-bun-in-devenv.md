---
title: 開発環境の Node.js を Bun に置き換えてみる
author: masahiro-kondo
date: 2023-11-21
tags: [Bun]
---

## はじめに
Bun は Node.js や Deno と競合する JavaScript ランタイムです。

[Bun — A fast all-in-one JavaScript runtime](https://bun.sh/)

特に速度を売りにしており、公式サイトには、React SSR / WebSocket 通信 / SQLite クエリ実行で Node.js / Deno を大きく上回るスループットを示すグラフが掲げられています。サーバーサイドの JavaScript のほとんどを実行し、パフォーマンスの向上、複雑さの軽減、開発者の生産性を上げることを目標として開発されており、以下のような特徴があります。

- 起動も実行速度も高速。Safari の JavaScript エンジンである JavaScriptCore を拡張
- HTTP サーバーの起動ややファイル作成などのタスクを実行するための高度に最適化されたミニマムな API セットを提供
- パッケージマネージャ、テストランナー、バンドラーなど JavaScript アプリを構築するための完全なツールキット

Deno と違い当初から Node.js の代替として開発され、多くの Node.js API と Web API をネイティブに実装しています。Zig と C++ で実装されています。

Bun は今年9月に1.0に到達しました。記事執筆時点のバージョンは1.0.13です。

[Bun 1.0 | Bun Blog](https://bun.sh/blog/bun-v1.0)

多くのツールやフレームワークを Bun で使用するためのガイド集がまとめられています。すでにエコシステムが成熟しつつあることが伺えます。

[Ecosystem | Guides](https://bun.sh/guides/ecosystem)

:::info
Bun の発音は `bʌn` になっており、「ブン」ではなく「バン」に近い音です。
:::

## インストール

まず Bun のインストールから。

[Installation | Bun Docs](https://bun.sh/docs/installation)

```shell
curl -fsSL https://bun.sh/install | bash
```

`$HOME/.bun` 配下にインストールされ、パスの設定などが追加されます。

アップデートは以下のようにします。Deno と同様簡単にアップデートできますね。

```shell
bun upgrade
```

## Nuxt アプリ開発に Bun を適用する
Bun は本サイトでも[豊富な解説記事](https://developer.mamezou-tech.com/tags/nuxt/)がある Nuxt アプリ開発にも適用可能です。冒頭のエコシステムのページに Nuxt のガイドがあります。

[Build an app with Nuxt and Bun | Bun Examples](https://bun.sh/guides/ecosystem/nuxt)


プロジェクト作成は、npx の代わりに bunx を実行します。

```shell
bunx nuxi init my-nuxt-app
```

開発サーバーの起動は、以下のようになります。これにより、生成された package.json の npm script の `dev` が実行されます。

```shell
bun --bun run dev
```

高速な Bun により開発が快適になるのではという期待を持って少し動かしてみました。以下、Node.js と速度比較しながら実行していきます。

## 速度比較: プロジェクト作成
プロジェクト作成の速度を Node と Bun で比較してみます。パッケージマネージャーは npm を使用します。

まず、Node.js から。Node.js は v18.16.0 を使用しています。

```shell
$ npx nuxi init nuxt-dev-node

✔ Which package manager would you like to use?
npm
◐ Installing dependencies...                                  10:59:50

> postinstall
> nuxt prepare

✔ Types generated in .nuxt                                                                                                                                 11:00:36

added 729 packages, and audited 731 packages in 46s

117 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
✔ Installation completed.                                    11:00:36
```

Bun でのプロジェクト生成。

```shell
$ bunx nuxi init nuxt-dev-bun

✔ Which package manager would you like to use?
npm
◐ Installing dependencies...                                 11:05:49

> postinstall
> nuxt prepare

✔ Types generated in .nuxt                                   11:06:26

added 729 packages, and audited 731 packages in 37s

117 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
✔ Installation completed. 
```

Node.js は46秒、Bun は37秒でした。NPM によるパッケージインストールが占める時間が多いとはいえ、Bun 130%ほど高速という結果でした。

## 速度比較: 開発サーバー起動

Node.js による Nuxt 開発サーバーの起動から。

```shell
$ npm run dev

> dev
> nuxt dev

Nuxt 3.8.1 with Nitro 2.7.2                                         11:14:40

  ➜ Local:    http://localhost:3000/
  ➜ Network:  use --host to expose

  ➜ DevTools: press Shift + Option + D in the browser (v1.0.2)      11:14:41

ℹ Vite server warmed up in 562ms                                    11:14:42
ℹ Vite client warmed up in 690ms                                    11:14:42
✔ Nitro built in 250 ms                                       nitro 11:14:42
```

Bun による Nuxt 開発サーバーの起動。

```shell
$ bun --bun run dev

Nuxt                                                              11:20:07 AM

  ➜ Local:    http://localhost:3000/
  ➜ Network:  use --host to expose

  ➜ DevTools: press Shift + Option + D in the browser (v1.0.2)    11:20:07 AM

ℹ Vite server warmed up in 532ms                                  11:20:08 AM
✔ Nitro built in 198 ms                                     nitro 11:20:08 AM
ℹ Vite client warmed up in 876ms                                  11:20:08 AM
```

Node.js での起動時間は 1502ms、Bun は 1606ms でわずかに Node.js が速いという結果になりました。Nuxt の SSR エンジン Nitro のビルド時間は Bun の方がやや速いのでコンテンツが増えてくると Bun が有利になるかもしれません。

## 速度比較: パッケージ追加
以前の記事、「[Vue3+D3.js アプリを Nuxt3 に移植して Netlify にデプロイしてみた](https://developer.mamezou-tech.com/blogs/2023/03/02/port-vue3-d3-app-to-nuxt3-on-netlify/)」で作った Nuxt アプリで試してみました(小規模なアプリですが)。

Node.js での d3 パッケージの追加。2秒。

```shell
$ npm install d3

added 35 packages, and audited 766 packages in 2s

117 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

Bun での d3 パッケージの追加。1.97秒

```shell
$ bun --bun install d3
bun add v1.0.13 (f5bf67bd)
[6.17ms] migrated lockfile from package-lock.json

 installed d3@7.8.5

✔ Types generated in .nuxt                                                                                                                                 11:33:59

 109 packages installed [1.97s]
```

あまり差はありませんでした。

## 速度比較: アプリのビルド
上記のアプリで作成した Vue コンポーネントを追加して、ビルド時間を比較してみました。

Node.js によるビルド。

```shell
$ npm run build

> build
> nuxt build

Nuxt 3.8.1 with Nitro 2.7.2                                                    11:46:23
ℹ Building client...                                                          11:46:24
ℹ vite v4.5.0 building for production...                                      11:46:24
ℹ ✓ 678 modules transformed.                                                  11:46:25
Inspect report generated at /Users/kondoh/dev/js-study/nuxt-dev-node/.nuxt/analyze/.vite-inspect
[11:46:26] ℹ .nuxt/dist/client/manifest.json                     1.81 kB │ gzip:  0.36 kB
 :
[11:46:26] ℹ .nuxt/dist/client/_nuxt/entry.fecb2ad8.js         187.32 kB │ gzip: 68.62 kB
ℹ ✓ built in 1.56s                                                            11:46:26
✔ Client built in 1568ms                                                      11:46:26
ℹ Building server...                                                          11:46:26
ℹ vite v4.5.0 building SSR bundle for production...                           11:46:26
ℹ ✓ 59 modules transformed.                                                   11:46:26
Inspect report generated at /Users/kondoh/dev/js-study/nuxt-dev-node/.nuxt/analyze/.vite-inspect
ℹ .nuxt/dist/server/_nuxt/entry-styles.850bf845.mjs            0.15 kB        11:46:26
ℹ .nuxt/dist/server/_nuxt/error-500-styles.cf4b3e80.mjs        0.15 kB        11:46:26
ℹ .nuxt/dist/server/_nuxt/error-404-styles.1e0dde27.mjs        0.15 kB        11:46:26
ℹ .nuxt/dist/server/styles.mjs                                 0.46 kB        11:46:26
[11:46:26] ℹ .nuxt/dist/server/_nuxt/entry-styles-2.mjs-d4587fba.js       0.28 kB │ map:  0.11 kB
 :
[11:46:26] ℹ .nuxt/dist/server/server.mjs                                41.36 kB │ map: 89.86 kB
ℹ ✓ built in 396ms                                                            11:46:26
✔ Server built in 401ms                                                       11:46:26
✔ Generated public .output/public                                       nitro 11:46:26
ℹ Building Nitro Server (preset: node-server)                           nitro 11:46:26
✔ Nitro server built                                                    nitro 11:46:27
  ├─ .output/server/chunks/app/_nuxt/entry-styles.850bf845.mjs (637 B) (304 B gzip)
    :
  └─ .output/server/package.json (1.6 kB) (529 B gzip)
Σ Total size: 2.9 MB (777 kB gzip)
✔ You can preview this build using node .output/server/index.mjs        nitro 11:46:27
```

Bun によるビルド。

```shell
$ bun --bun run build

[11:51:40 AM]  WARN  Changing NODE_ENV from development to production, to avoid unintended behavior.

Nuxt                                                                        11:51:40 AM
ℹ Building client...                                                       11:51:41 AM
ℹ vite v4.5.0 building for development...                                  11:51:41 AM
ℹ ✓ 678 modules transformed.                                               11:51:42 AM
Inspect report generated at /Users/kondoh/dev/js-study/nuxt-dev-bun/.nuxt/analyze/.vite-inspect
[11:51:42 AM] ℹ .nuxt/dist/client/manifest.json                     1.81 kB │ gzip:  0.35 kB
 :
[11:51:42 AM] ℹ .nuxt/dist/client/_nuxt/entry.96464600.js         216.52 kB │ gzip: 80.48 kB │ map: 1,117.25 kB
ℹ ✓ built in 1.80s                                                         11:51:42 AM
✔ Client built in 1805ms                                                   11:51:42 AM
ℹ Building server...                                                       11:51:42 AM
ℹ vite v4.5.0 building SSR bundle for development...                       11:51:42 AM
ℹ ✓ 55 modules transformed.                                                11:51:43 AM
Inspect report generated at /Users/kondoh/dev/js-study/nuxt-dev-bun/.nuxt/analyze/.vite-inspect
ℹ .nuxt/dist/server/styles.mjs                          0.07 kB            11:51:43 AM
[11:51:43 AM] ℹ .nuxt/dist/server/_nuxt/island-renderer-87f8f18f.js   1.07 kB │ map:  1.41 kB
 :
[11:51:43 AM] ℹ .nuxt/dist/server/server.mjs                         44.26 kB │ map: 93.34 kB
ℹ ✓ built in 290ms                                                         11:51:43 AM
✔ Server built in 294ms                                                    11:51:43 AM
✔ Generated public .output/public                                    nitro 11:51:43 AM
ℹ Building Nitro Server (preset: node-server)                        nitro 11:51:43 AM
✔ Nitro server built                                                 nitro 11:51:44 AM
  ├─ .output/server/chunks/app/_nuxt/error-404-7ddc3ac1.mjs (11.1 kB) (3.6 kB gzip)
   :
  └─ .output/server/package.json (1.6 kB) (529 B gzip)
Σ Total size: 2.9 MB (776 kB gzip)
✔ You can preview this build using node .output/server/index.mjs     nitro 11:51:44 AM
```

Vite のクライアントビルドは、Node.js が 1568ms、Bun が 1805ms、Vite の SSR ビルドは Node.js が 401ms、Bun が 294ms という結果でした。クライアントのバンドルビルドは Node.js が速く、SSR 周りのビルドは Bun が速い結果になりました。やはり SSR の比重が高ければ Bun が有利かもしれません。

## 最後に
ローカルの開発環境を Bun に置き換えて起動速度などを比較してみました。ローカル開発サーバー起動などの日々の作業に関しては体感できるほどの差はありませんでした。今回試したアプリが小規模すぎて差が出にくかったのかもしれません。プロジェクト作成では差が出ましたが初回のみの作業なので、Node.js を置き換えるほどのモチベーションにはなりにくいでしょう。

ただ、Node.js と比べセットアップが楽でオールインワンな Bun の特徴は開発開始時には有利に働く面もありそうです。プロダクション環境、開発環境と用途に合わせてランタイムを使い分ける時代が来ているのかもしれません。競合の登場で Node.js の改善が進むことも期待できます。
