---
title: Deno Deploy を基盤とする Netlify Edge Functions を試す
author: masahiro-kondo
date: 2022-07-23
tags: [netlify, Deno, サーバーレス, Edge]
---

Netlify では、AWS Lambda を利用したサーバーレス機能 Functions が従来から提供されていました。

[Functions overview](https://docs.netlify.com/functions/overview/)

今年の4月 Netlify Edge Functions ベータ版についての発表が Netlify と Deno からありました。

- [Netlify Edge Functions: Serverless Compute Powered by Deno](https://www.netlify.com/blog/announcing-serverless-compute-with-edge-functions/)
- [Netlify Edge Functions on Deno Deploy](https://deno.com/blog/netlify-edge-functions-on-deno-deploy)

先日の「[Fresh - Deno の 次世代 Web フレームワーク](/blogs/2022/07/04/fresh-deno-next-gen-web-framework/)」の記事で Fresh が Deno Deploy を基盤としたフレームワークであることを紹介しました。Netlify Edge Functions は、この Deno Deploy を利用してユーザーのロケーションに近いエッジ環境でサーバーレス機能を提供するものです。

Lambda ベースの従来の Functions は JavaScript(TypeScript) と Go で実装できますが、Edge Functions は JavaScript(TypeScript) 専用です。

:::alert
Edge Functions は2022年7月時点では実験的フィーチャーのため、プロダクション環境では使わないよう注意書きされています。

[Get started with Edge Functions](https://docs.netlify.com/netlify-labs/experimental-features/edge-functions/get-started/)

> Experimental Feature
>
> This experimental feature is available to try out before it’s fully released or ready for production. We recommend using it in non-critical sites and non-production environments only. Learn more in our Netlify Labs doc.
:::

この記事では、簡単な Edge Function を作成・デプロイしてみてそのポテンシャルを見ていこうと思います。


## Netlify CLI のインストール
まず、ローカルで開発ができるよう、Netlify CLI をグローバルインストールします。

```shell
npm install -g netlify-cli
```

VS Code を使っていれば、Deno 拡張などのインストールもサジェストされるため、インストールしておくとよいでしょう。

## 簡単な Edge Function の作成
hello-edge.js を netlify/edge-functions 配下に以下の内容で作ります。

```javascript
export default () => new Response("Hello Edge Function");
```

netlify.toml を以下の内容で作成します。

```toml
[[edge_functions]]
  function = "hello-edge"
  path = "/edge"
```

:::info

従来の Functions は netlify.toml に設定を書かなくても、プロジェクトの netlify/functions ディレクトリにコードを置くだけでデプロイできます (Zero configuration)。Edge Functions の方は、netlify/edge-functions ディレクトリにコードを置いて、netlify.toml に function 名とパスを指定する必要があります。function 名は JavaScript(TypeScropt) のファイル名です。複数の function を指定可能です。

```toml
[[edge_functions]]
  function = "foo"
  path = "/foo"

[[edge_functions]]
  function = "bar"
  path = "/bar"
```
:::

開発用サーバーを起動します。

```shell
netlify dev
```

function hello-edge が検出され、8888ポートで serve されます。

```
◈ Netlify Dev ◈
◈ Ignored general context env var: LANG (defined in process)
◈ No app server detected. Using simple static server
◈ Unable to determine public folder to serve files from. Using current working directory
◈ Setup a netlify.toml file with a [dev] section to specify your dev server settings.
◈ See docs at: https://cli.netlify.com/netlify-dev#project-detection
◈ Running static server from "netlify-functions-example"
◈ Functions server is listening on 58980

◈ Static server listening to 3999

   ┌─────────────────────────────────────────────────┐
   │                                                 │
   │   ◈ Server now ready on http://localhost:8888   │
   │                                                 │
   └─────────────────────────────────────────────────┘

◈ Loaded edge function hello-edge
```

function を呼び出してみます。

```shell
$ curl localhost:8888/edge
Hello Edge Function
```

## Edge Function のデプロイ
コードを GitHub リポジトリで管理し、Netlify の管理画面でデプロイ設定しました。Netlify にサイトを作成し、リポジトリをリンクしています。Build Setting は無指定で OK です。

![Netlify の Build & deploy 設定](https://i.gyazo.com/378fd266cab92bf922bb926be198a70e.png)

Production branch は main にしています。

![Build & deploy の Branch 設定](https://i.gyazo.com/20e59431181f1370f63fc221eee384d1.png)

この状態で GitHub リポジトリの main に push すると Netlify のサーバーで Build が実行されます。

![Netlify build のログ画面](https://i.gyazo.com/3a002506aa6a02b5f6da7f70a9620eba.png)

`2. Edge Functions bundling` セクションで、netlify/edge-functions 配下のコードが検出されてバンドルされ、`3. Deploy site` セクションで6秒ほどでデプロイが完了しているのがわかります[^1]。

[^1]: ビルドログに、`1. Functions bundling` も含まれていますが、これは Netlify Functions のサンプル用リポジトリを流用したので netlify/functions 配下の function もデプロイされたためです。

:::info
Netlify CLI を使えば、以下のコマンドでもデプロイは可能です。

```shell
netlify login
netlify deploy --build –-prod
```

:::

デプロイが完了したので、呼び出してみます。

```shell
$ curl https://kondoumh-example-functions.netlify.app/edge
Hello Edge Function
```

無事に実行できました。とても簡単ですね。

## Deno モジュールの利用
Edge Functions ではスタンダード Web API と Deno モジュールを使用できます。Deno モジュールは URL から直接インポートして使用できます。

以下のような TypeScript ファイルを date-now.ts というファイル名で作成します。Deno datatime の format モジュールを URL から直接インポートして使用しています。

```typescript
import { format } from "https://deno.land/std@0.149.0/datetime/mod.ts";

export default () => {
  const now = format(new Date(), "yyyy-MM-dd HH:mm:ss.SSS");
  return new Response(now);
}
```

デプロイして実行してみます。

```shell
$ curl https://kondoumh-example-functions.netlify.app/date-now
2022-07-23 06:49:18.193
```

Node.js のモジュールのように事前にパッケージしてデプロイする必要がなく、簡単に利用できることがわかります。


## Chaining を使ってみる
Netlify Edge Function のユニークな機能として、Chaining があります。netlify.toml の同じ `path` 属性をを共有した function が、宣言順序を尊重して順番に実行できます。

例えば、以下のように path `/context` を共有する2つの function を定義します。

```toml
[[edge_functions]]
  function = "use-context"
  path = "/context"

[[edge_functions]]
  function = "hello-edge"
  path = "/context"
```

hello-edge は最初にデプロイしたものと同じファイルです。use-context.ts ファイルを以下の内容で作成します。

```typescript
import { Context } from "netlify:edge";

export default async (req: Request, { next, geo }: Context) => {
  const res = await next();
  let text = await res.text();

  if (geo.country.code === "JP") {
    text = text.replaceAll("Hello", "こんにちは");
  }

  return new Response(text, res);
};
```

netlify:edge の Context オブジェクトを使用しています。next は宣言順で自身の次にある function を呼び出す Chaining の機能です。geo は、リクエストに含まれる国情報を取得するのに使用しています。next により hello-edge が呼び出されて 'Hello Edge Function' という文字列が得られます。国コードが "JP" の場合に Response の文字列を変換しています。

このコードをローカルで実行します。

```shell
$ curl localhost:8888/context
こんにちは Edge Function
```

:::info
記事執筆時点、geo は筆者の Netlify 環境ではデプロイ時にビルドエラーになりました。next は動作しました。
:::

このように Chaining を活用することで、アプリケーションを小さな function で構成し、ユーザーのロケーションに応じて結果をカスタマイズするような使い方が可能です。

上記の例では、function のレスポンスをメモリに保持していますが、Streams API を使って少しずつクライアントに配信することもできます。

## まとめ
Netlify Edge Functions で簡単な function を作成して動かしてみました。標準 Web API や Deno モジュールを利用できるためサーバーレス基盤として十分な機能があると言えるでしょう。Deno の高性能な JavaScript ランタイムで実行されるため、性能面でも期待できます。Chaining をうまく利用すれば、きめ細かいサービスが提供できそうです。

Edge Functions のユースケースについて公式ドキュメントにユースケースとサンプルへのリンクが掲載されています。

[Edge Functions overview](https://docs.netlify.com/netlify-labs/experimental-features/edge-functions/#use-cases)

- Transform responses with content includes
- Set custom HTTP request headers
- Localize content with geolocation
- Rewrite responses from another URL
- A/B tests using cookies

また、各種 JavaScript フレームワークでの利用方法についてもサンプルがあります。

- Astro
- Eleventy
- Hydrogen
- Next.js
- Nuxt 3
- Remix
- SolidJS
- SvelteKit

今回作成したコードは以下のリポジトリに格納しています。

[GitHub - kondoumh/netlify-functions-example](https://github.com/kondoumh/netlify-functions-example)


---
参考

[A Deep Dive into Netlify Edge Functions](https://www.netlify.com/blog/deep-dive-into-netlify-edge-functions/)
