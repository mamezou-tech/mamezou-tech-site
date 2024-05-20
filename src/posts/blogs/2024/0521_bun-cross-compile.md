---
title: Bun で実行可能バイナリをクロスコンパイルする
author: masahiro-kondo
date: 2024-05-21
tags: [Bun, javascript]
image: true
---

## はじめに

去年の9月 Bun が 1.0 に到達した時、開発環境に導入してみる記事を書きました。

[開発環境の Node.js を Bun に置き換えてみる](/blogs/2023/11/21/replace-nodejs-with-bun-in-devenv/)

その後 Bun 1.1 で Windows 対応が行われ、真のクロスプラットフォームが実現されました。

[Bun 1.1 | Bun Blog](https://bun.sh/blog/bun-v1.1)

実行可能バイナリを生成する機能は提供されていましたが、1.1.5 でクロスコンパイルの機能が実装されました。

[Bun v1.1.5 | Bun Blog](https://bun.sh/blog/bun-v1.1.5)

:::info:宣伝 - Software Design 2024年6月号の Bun 特集に寄稿しました
冒頭で紹介した記事がきっかけで、Software Design 2024年6月号第2特集の Bun に寄稿する機会を得ました。以下のように Bun の概要から利用方法、Node.js とのパフォーマンス比較を網羅する特集です。

- 第1章: Bun の全体像をつかむ
- 第2章: Bun を使ってみよう
- 第3章: Bun と Node.js の徹底比較

筆者は2章の執筆を担当させていただきました。Bun のインストールから各機能の紹介と利用方法、デバッグ方法などについて書きました。執筆時点では Bun 1.1 のリリース直後で、クロスコンパイルについては触れられませんでした。実行可能バイナリの作成については紹介しています。
第3章は Node.js と Bun のコードを AWS Lambda にデプロイして速度比較するなど、興味深い内容となっています。

<a href="https://gihyo.jp/magazine/SD/archive/2024/202406" target=_blank><img src="https://gihyo.jp/assets/images/cover/2024/thumb/TH160_642406.jpg" alt="SD202406" /></a>

[Software Design 2024年6月号](https://gihyo.jp/magazine/SD/archive/2024/202406)
:::

## シングルバイナリおよびクロスコンパイルの利点
シングルバイナリ化することのメリットは、ユーザーに対する配布の利便性はもちろんのこと、以下のような利点もあります。

- 実行時に import 解決、トランスパイル、コード生成の処理が不要になるため時間とメモリが節約できる
- バイナリのコピーだけでコンテナ化が可能でランタイム不要なので軽量コンテナにできる
- ダウンロードしてパスを通すだけで実行できるので CI がシンプルになりビルド時間の節約になる

さらにクロスコンパイルができると以下のような利点があります。

- 対象の環境ごとにビルド環境を用意する必要がない
- 1つの CI パイプラインで全ターゲットの実行可能バイナリをビルドできる

このため、もともとオールインワンを売りとする Bun にクロスコンパイルの機能が実装されたことで、開発からクロスプラットフォームへの実行可能バイナリ配布まで bun CLI 一つで賄えることになり開発体験はかなり向上したと言えるでしょう。

## Bun のクロスコンパイルを試す
では、Bun の実行可能バイナリの生成とクロスコンパイルを試してみましょう。筆者は macOS Sonoma / Bun 1.1.8 の環境で実施しています。

Bun のプロジェクトを作成します。

```shell
mkdir simple-server && cd simple-server
bun init -y
```

ポート3000番で待ち受けてメッセージを返すだけの簡単な HTTP サーバーを書きました。

```typescript:index.ts
Bun.serve({
  port: 3000,
  fetch(req) {
    return new Response('Hello, Bun!')
  }
});
```

このコードは以下で実行可能です。

```shell
bun index.ts
```

実行可能バイナリを作成してみます。

```shell
$ bun build --compile ./index.ts --outfile simpleServer
   [2ms]  bundle  1 modules
 [104ms] compile  simpleServer
```

この0.1秒程度でビルドが完了し、macOS のマシンをターゲットとする51MBの実行可能バイナリが生成されました。

```shell
$ ls -lh simpleServer
-rwxrwxrwx  1 kondoh  staff    51M  5 20 14:50 simpleServer
```

以下のように bun CLI なしで実行できます。

```shell
./simpleServer
```

上記の例では、ターゲットを指定しませんでしたが `--target` オプションでプラットフォームを指定できます。Windows 用のバイナリを生成してみましょう。

```shell
$ bun build --compile ./index.ts --target=bun-windows-x64 --outfile simpleServer.exe
   [3ms]  bundle  1 modules
[4.302s] compile  simpleServer.exe bun-windows-x64-v1.1.8
```

必要なライブラリのダウンロードを含めて4.3秒ほどでビルドが完了しました。ファイルサイズは100MBぐらいですね。

```shell
$ ls -lh simpleServer.exe
-rwxrwxrwx  1 kondoh  staff   105M  5 20 14:55 simpleServer.exe
```

`--target` の指定は以下のようになっています。

| プラットフォーム | `--target` の値 |
|:--|:--|
| Linux x64   | `bun-linux-x64` |
| Linux ARM   | `bun-linux-arm64` |
| Windows x64 | `bun-windows-x64` |
| macOS x64   | `bun-darwin-x64` |
| macOS Apple Silicon | `bun-darwin-arm64` |

プロダクションへのデプロイ時には、`--minify` と `--sourcemap` の指定も推奨されています。

```shell
bun build --compile --minify --sourcemap ./path/to/my/app.ts --outfile myapp
```

`--minify` オプションを指定することでトランスパイルされたコードのサイズを小さくできます。`--sourcemap` オプションを指定することでオリジナルのソースコードの位置でエラー情報を出力させることが可能です。

このほか、アセットの埋め込みや SQLite データベースの埋め込みもサポートされています。詳細はドキュメントを参照してください。

[Single-file executable – Runtime | Bun Docs](https://bun.sh/docs/bundler/executables#cross-compile-to-other-platforms)

## 主要ランタイムでの実装状況
実行可能バイナリの生成については、Node.js と Deno でも実装されており、クロスコンパイルについては Deno にも既に実装されています。

- [deno compile, standalone executables | Deno Docs](https://docs.deno.com/runtime/manual/tools/compiler#cross-compilation)
- [Single executable applications | Node.js v22.2.0 Documentation](https://nodejs.org/api/single-executable-applications.html)


| | Deno | Bun | Node.js |
|:--|:--:|:--:|:--:|
| 実行可能バイナリの生成 | ⚪︎ | ⚪︎ | ⚪︎ (Active development) |
| クロスコンパイル      | ⚪︎ | ⚪︎ | - | 

Node.js の Single Executable Applications に関しては、`stability: 1.1 - Active development` のステータスであり、現時点では安定版とは言えません。後発のランタイム Deno と Bun が肩を並べたという状況です。

:::info
昨年の記事ですが、本サイトでは Node.js の Single Executable Applications について以下の記事で取り上げています。

[Node.js v19.7で実験的に導入された Single Executable Applications で単独実行可能ファイルを作成する](/blogs/2023/03/01/node19-sea-intro/)
:::

## さいごに
以上、Bun で実装された実行可能バイナリのクロスコンパイルを試してみました。
実行可能バイナリによってデプロイ環境でのフットプリントを小さく起動を速くできることは大きなメリットです。
最終的には、CI でエンドツーエンドのテストをターゲットプラットフォームごとに実施する必要はありますが、クロスコンパイル機能により開発環境は１プラットフォーム分だけあればよいのは嬉しいところです。
