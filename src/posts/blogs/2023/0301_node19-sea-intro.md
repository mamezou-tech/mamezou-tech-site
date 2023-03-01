---
title: Node.js v19.7で実験的に導入された Single Executable Applications で単独実行可能ファイルを作成する
author: noboru-kudo
date: 2023-03-01
tags: [nodejs]
---

Rust/Golang/GraalVM/.NetのSingleFile等、昨今は実行環境を必要とせず、単独で実行可能なバイナリファイルにパッケージするものが多いかと思います。
これにより、事前のランタイム環境のセットアップが不要となり、環境構築やデプロイ作業が大幅に簡素化されてきました。

JavaScriptでは、Denoがこの実行可能ファイルへのコンパイルを標準搭載していますが、Node.jsは公式にサポートしていませんでした。
そこで最近以下の記事を目にしました。

- [Node.jsとJavaScriptアプリを単一の実行ファイルにする「Single Executable Applications」機能、Node.js 19.7.0で実験的機能として搭載](https://www.publickey1.jp/blog/23/nodejsjavascriptsingle_executable_applicationsnodejs_1970.html)

Node.jsのv19.7に、実験的機能として実行可能ファイルへのパッケージ機能がサポートされたようです。
今回はこの「Single Executable Applications」の機能を試してみました。

- [Node.js Doc - Single executable applications](https://nodejs.org/api/single-executable-applications.html#single-executable-applications)

:::alert
当記事は現時点で最新のNode.js v19.7.0で確認しているものです。
Single Executable Applicationsは実験的機能で、まだ商用環境で使える段階のものではありません。
:::

## 対象アプリケーション

公式ドキュメントの例はコンソールへの出力のみと実用的な感じがしなかったので、ここでは[Fastify](https://www.fastify.io/)を使ったTypeScriptベースのWeb APIを考えてみます。

まずはTypeScriptに加えて、コンパイルとバンドル用に[esbuild](https://esbuild.github.io/)をインストールます。

```shell
# TypeScript/バンドラ(esbuild)セットアップ
npm install -D esbuild typescript
# tsconfig.json作成
npx tsc --init
```

TypeScriptのコンパイルだけであればTypeScriptに付属するtscでもいいのですが、実行可能ファイルを作成するには依存関係含めて1つのJavaScriptにバンドル必要がありますのでesbuildを入れています。

次に、WebフレームワークのFastifyをインストールします。

```shell
npm install fastify
```

ソースコードは(server.ts)以下のようなものを記述しました。

```typescript
import Fastify, { FastifyInstance } from 'fastify';

const server: FastifyInstance = Fastify({});

// APIエンドポイント
server.get<{ Querystring: { name?: string } }>('/hello', async (request, reply) => {
  const { name } = request.query;
  return { message: `Hello, ${name}!!` };
});

// Fastifyサーバー起動
const start = async () => {
  try {
    const args = process.argv.slice(2);
    await server.listen({ host: args[0] ?? '0.0.0.0', port: args[1] ? Number(args[1]) : 3000 });
    const address = server.server.address() as AddressInfo;
    console.log(`server listening at ${address.address}:${address.port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};
start();
```

`/hello?name=foo`とするとJSON形式でレスポンスが返ってくるだけのシンプルなものです。
まずは実行可能ファイルでなく、そのまま実行する場合は以下のように実行します。

```shell
# コンパイル & バンドル
npx esbuild --bundle --minify --platform=node --outfile=server.js server.ts
# 実行
node server.js localhost 8000
# 確認(別ターミナルから)
curl localhost:8000/hello?name=mamezou
> {"message":"Hello, mamezou!!"}
```

期待通りのレスポンスが返ってきました。

## 実行可能ファイルを作成する

アプリケーションの準備ができたので、早速Node.js v19.7のSingle Executable Applicationsを試してみます。

ドキュメントを読むと、Single Executable Applicationsの仕組みは、Node.jsの実行ファイル自体(つまりnodeコマンド)にJavaScriptファイルを注入して実現されるようです。

OSにmacOS、Node.jsのバージョン管理にanyenvを使用している筆者の環境では、以下のようにnodeコマンドをコピー&リネームしました。

```shell
cp $(anyenv root)/envs/nodenv/versions/19.7.0/bin/node server
```

ここでコピーしたserverが、実行可能ファイルのベースになります。
このため、現時点では他の環境で動作させる場合は、環境に合ったNode.jsの実行ファイル(node)の事前準備が必要になりそうです。

では、先程esbuildでバンドルしたserver.jsを、コピーしたNode.jsの実行ファイルに埋め込みます。
公式ドキュメントではこれを行うツールとして[postject](https://github.com/nodejs/postject)を使用しています。

macOSの場合は以下のようになります。

```shell
npx postject server NODE_JS_CODE server.js \
    --sentinel-fuse NODE_JS_FUSE_fce680ab2cc467b6e072b8b5df1996b2 \
    --macho-segment-name NODE_JS
```

`--sentinel-fuse`はNode.jsのSingle Executable Applicationsを有効にするためのFeature Toggleになっています。
なお、WindowsやLinuxの場合は`--macho-segment-name NODE_JS`は不要です。

しばらく(筆者環境では30秒程)すると、先程コピーしたNode.jsの実行ファイルserverにJavaScriptが埋め込まれました。

後は実行するだけです。

```shell
./server localhost 8000
```

ここでNode.jsは先程埋め込んだJavaScriptファイルを検知して、通常のnodeコマンドでなくアプリケーション(FastifyのWeb API)を起動するようになりました。

## まとめ

今回はできたてのNode.jsのSingle Executable Applicationsによる実行可能ファイルの作成を見てみました。
手順が煩雑なことに加えて、ターゲット環境別にNode.jsの実行ファイルを用意する必要がある等、Denoと比べると多くの改善の余地がありますが、正式バージョンでどうなるかに期待したいところです。
