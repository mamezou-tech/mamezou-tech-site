---
title: Fresh - Deno の 次世代 Web フレームワーク
author: masahiro-kondo
date: 2022-07-04
tags: [Deno, Edge]
---

Deno のフルスタック Web フレームワーク Fresh v1.0 がリリースされました。

[Fresh 1.0](https://deno.com/blog/fresh-is-stable)

筆者は Node.js ユーザーで Deno は Hello world 止まりですが、公式ドキュメントを読みながら試してみました。

[[TOC]]

## Fresh 概要
公式ドキュメントに挙げられている特徴は以下の通りです。

[fresh - The next-gen web framework.](https://fresh.deno.dev/)

- エッジ(サーバー)でのジャストインタイムレンダリング
- 最大限のインタラクティブ性のためのアイランドベースのクライアントハイドレーション[^1]
- 実行時のゼロオーバーヘッド
- ビルドステップなし
- 設定が不要
- TypeScript がすぐに使える

[^1]: インタラクティブな UI を実現するため、サーバーサイドでレンダリングしたものに対して、クライアント側で(水分補給のように)注入するというような意味と思われます。

Fresh の特徴については、[Publickey の解説](https://www.publickey1.jp/blog/22/denofresh_10just-in-time.html)に詳しいですが、リクエストごとに HTML をジャストインタイムでレンダリングするとか、インタラクティブな UI のためのアイランドアーキテクチャなどが興味深いと思いました。

Fresh のネーミングは、毎回フレッシュなレンダリング結果を返すことに由来するのでしょうか。

Fresh のアーキテクチャ目標についての記載はシンプルです。

- ページのロード時間は最小化すべき
- クライアントで実行される作業は最小化すべき
- エラーの爆風半径は最小化すべき、そしてグレースフル(優雅に)に減衰すべき

ここでもアイランドアーキテクチャを採用する決定について言及されています。

[Architecture | fresh docs](https://fresh.deno.dev/docs/concepts/architechture)

## 開発環境構築

[Introduction | fresh docs](https://fresh.deno.dev/docs/introduction)

macOS で開発環境を構築しました。まず Deno を Homebrew でインストール。

```shell
brew install deno
```

Fresh を使うには Deno v1.23.0 以降が必要です。バージョンを確認。大丈夫そうです。

```shell
$ deno --version
deno 1.23.1 (release, aarch64-apple-darwin)
v8 10.4.132.8
typescript 4.7.2
```

Fresh のプロジェクトを作成します。

```shell
deno run -A -r https://fresh.deno.dev my-fresh-app
```

```
Download https://fresh.deno.dev/
Download https://deno.land/x/fresh@1.0.0/init.ts
Download https://deno.land/x/fresh@1.0.0/src/dev/deps.ts
  :
Download https://deno.land/std@0.128.0/path/_constants.ts
Download https://deno.land/std@0.128.0/path/_util.ts
Do you want to use 'twind' (https://twind.dev/) for styling? [y/N] 
The manifest has been generated for 3 routes and 1 islands.

Project created!
Run `deno task start` in the project directory to get started.
```

作成されたプロジェクトのディレクトリに移動して、アプリケーションを起動。

```shell
cd my-fresh-app
deno task start
```

```
Watcher Process started.
Download https://deno.land/x/fresh@1.0.0/dev.ts
The manifest has been generated for 3 routes and 1 islands.
Download https://deno.land/x/fresh@1.0.0/server.ts
Download https://deno.land/x/fresh@1.0.0/runtime.ts
Download https://esm.sh/preact@10.8.1
Download https://esm.sh/preact@10.8.1/hooks
Download https://deno.land/x/fresh@1.0.0/src/server/mod.ts
Download https://esm.sh/v86/preact@10.8.1/deno/preact.js
  :
Download https://deno.land/std@0.107.0/path/_util.ts
Download https://deno.land/std@0.107.0/_util/assert.ts
Download https://crux.land/api/get/uYQG
Download https://crux.land/api/get/uYQG.ts
Server listening on http://localhost:8000
```

`localhost:8000` にアクセスするとサンプルページが表示されました。`-1` や `+1` ボタンクリックでカウンターの値が増減します。

![](https://i.gyazo.com/a17a0efabfcf9a2097c7ca5b0a01b3d6.png)

## Fresh アプリの構造
生成されたプロジェクトの構造です。

![](https://i.gyazo.com/925659dc0fa695fbb2ed08c305a76143.png)

カウンターは islands/Conter.tsx で実装されています。ドキュメントによれば、island は分離された Preact のコンポーネントで、クライアントでレンダリングされます。他のコンポーネントはすべて Server でレンダリングされます。

[Interactive islands | fresh docs](https://fresh.deno.dev/docs/concepts/islands)

アプリのインデックスページ routes/index.tsx は次のように、Preact で記述されていました。

```ts
/** @jsx h */
import { h } from "preact";
import Counter from "../islands/Counter.tsx";

export default function Home() {
  return (
    <div>
      <img
        src="/logo.svg"
        height="100px"
        alt="the fresh logo: a sliced lemon dripping with juice"
      />
      <p>
        Welcome to `fresh`. Try update this message in the ./routes/index.tsx
        file, and refresh.
      </p>
      <Counter start={3} />
    </div>
  );
}
```

routes/[name].tsx というファイルがありますが、これが Dynamic Routes の実装で、routes/hoge.tsx のように tsx ファイルを追加することで、/hoge ページに遷移させることができます。

[Dynamic routes | fresh docs](https://fresh.deno.dev/docs/getting-started/dynamic-routes)

生成したプロジェクトに routes/api/joke.tsx というファイルがあります。これは、ランダムなジョークの文章を返す API の実装です。この API を使ってリロードのたびにランダムにジョークを表示するページを追加してみました。

```ts
// routes/jokes.tsx

/** @jsx h */
import { h } from "preact";
import { Handlers } from "$fresh/server.ts";

export const handler: Handlers = {
  async GET(_, ctx) {
    const resp = await fetch('http://localhost:8000/api/joke');
    const joke = await resp.text();
    return ctx.render(joke);
  },
};

export default function Page({ data }) {
  return (
    <div>
      <h2>{data}</h2>
    </div>
  );
}
```

API を呼び出す Handler を作成し、その中でページコンポーネントにデータを渡しています。

[Fetching data | fresh docs](https://fresh.deno.dev/docs/getting-started/fetching-data)

このファイルを routes 配下に追加し、`localhost:8000/jokes` にアクセスすると更新のたびにランダムにジョークが表示されます[^2]。

[^2]: 表示されているジョークは「Java プログラマーはなぜメガネをかけているのか？ can't see sharp (くっきり見えない) 転じて can't C# (C# ができない) から。」というもので、このタイトルの本があるようです。

![](https://i.gyazo.com/da70b988b06d78f7cb40f4d31437e863.png)

## エッジ環境 Deno Deploy へのデプロイ
[Deno Deploy](https://deno.com/deploy) を使ったプロダクションデプロイ。Deno Deploy はグローバルに分散されたエッジの実行環境で、Deno 社により構築されています。

作成したコードを GitHub リポジトリに push して、Deno Deploy Project に登録します。GitHub で Deno Deploy を認証する必要があります。

![](https://i.gyazo.com/dbfc1e6776a261cf7dcd7e574bf98bbb.png)

Deno Deploy のダッシュボードで、リポジトリを選択し、接続するブランチ(ここでは main)を選択し、エントリポイントの main.ts を選択。プロジェクト名(GitHub アカウントとリポジトリ名から自動入力されます)を入力し、Link ボタンをクリックします。

![](https://i.gyazo.com/b26628298ca9bfc725798fdd244edeff.png)

:::info
今回はデプロイに Deno Deploy の `Automatic` を利用しましたが、GitHub Actions によるデプロイも可能で、こちらの方がカスタマイズ性が高いとのことです。
:::

しばらくするとデプロイが完了します。

![](https://i.gyazo.com/c77cc5889f3d2b7ec18d2df87b1dce71.png)

プロジェクトのページからは、Analytics, Logs, Settings のタブで稼働状況の確認や設定が可能です。

![](https://i.gyazo.com/65e0514dcaace6292d4529347d1be0f1.png)

View をクリックすると稼働しているアプリをブラウザで開きます。

![](https://i.gyazo.com/dca7ecd3eced8eccd132e8a83b332012.png)

このようにコードをリポジトリに push するだけで、ビルド、設定することなくデプロイが完了しました。

## Fresh と Jamstack
Fresh は Jamstack を進化させたフレームワークに見えました。Jamstack は Web サイトを速く安全に、簡単に拡張できるように設計されたアーキテクチャで、Pre-rendering を重視し、レンダリング結果を CDN に配置することで、動的サーバーをバックエンドで運用するコストやセキュリティなどのリスクを軽減します。

[What is the Jamstack? | Jamstack](https://jamstack.org/what-is-jamstack/)

Jamstack はこのように SSG (Static Site Generator) を前提としているので、データ更新時にビルドが必要というところが弱点でした。Fresh のようにリクエスト時にジャストインタイムでレンダリングする方式であれば、このタイムラグが無くなります。

SSG/SSR については Next.js などでも実現されていますが、Fresh は Deno Deploy というグローバルなエッジ環境を前提とした、JIT レンダリングによる、ゼロビルド、ゼロコンフィギュレーションな次世代 Web フレームワークなのだと思います。

Jamstack なサービスで有名な Netlify も Deno Deploy を利用した Edge Functions の提供を開始しています。

[Netlify Edge Functions on Deno Deploy](https://deno.com/blog/netlify-edge-functions-on-deno-deploy)

既存の Netlify Functions は AWS Lambda を使用していましたが、Edge Functions は真にエッジで実行される Function になるため、こちらも注目です。

:::info
ジョークページで使用した API 実装 joke.ts のコードは以下のようになっています。Netlify Functions と同様シンプルなコードになっており、その親和性が伺えます。

```ts
import { HandlerContext } from "$fresh/server.ts";

// Jokes courtesy of https://punsandoneliners.com/randomness/programmer-jokes/
const JOKES = [/* 省略 */];

export const handler = (_req: Request, _ctx: HandlerContext): Response => {
  const randomIndex = Math.floor(Math.random() * 10);
  const body = JOKES[randomIndex];
  return new Response(body);
};
```
:::

---
参考

- [Denoが新フレームワーク「Fresh 1.0」リリース。Just-in-timeレンダリングやランタイムオーバヘッドゼロなどの特徴がもたらす優位性とは？](https://www.publickey1.jp/blog/22/denofresh_10just-in-time.html)
