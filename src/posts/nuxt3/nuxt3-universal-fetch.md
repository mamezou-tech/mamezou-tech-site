---
title: Nuxt3入門(第3回) - ユニバーサルフェッチでデータを取得する
author: noboru-kudo
date: 2022-10-06
templateEngineOverride: md
tags: [SSG, SSR]
prevPage: ./src/posts/nuxt3/nuxt3-develop-sample-app.md
nextPage: ./src/posts/nuxt3/nuxt3-routing.md
---

[前回](/nuxt/nuxt3-develop-sample-app/)は簡単なブログサイトを作成し、Nuxtの基本機能や開発の流れを見てきました。

ただ、ここで作成したサンプルアプリのブログサイトは、表示するブログデータは固定値で保持していました。新しいブログを追加した場合は別途ビルドする必要があります。
実際のブログシステムでは、リアルタイムで最新ブログを取得したいところです。また、SEOや初期ロード時間を考慮して、クライアントサイドではなくサーバーサイドでレンダリングした意味のあるHTMLで取得できるようにしたいという要求もあるでしょう。

Nuxt2では、一般的に@nuxtjs/axiosや@nuxt/httpを使ってデータを取得するケースが多かったと思いますが、Nuxt3では新しいフェッチAPI($fetch)が導入されました。

今回は、Nuxt3のNitroサーバーエンジンでブログ取得APIを用意して、ここからブログ情報を取得するようにしてみます。
なお、ここではレンダリングモードとして、Nuxt標準のユニバーサルレンダリング(プリレンダリング無効)を使用することを前提とします。

[[TOC]]

## NitroでサーバーサイドAPI作成

ここではNuxt3のサーバーエンジンのNitroを使ってAPIを準備します。
もちろん任意のフレームワーク・サービスで構築したAPIでも利用できます。

ただし、APIの実装としてNuxt3のNitroを使うと、サーバーサイドレンダリングではHTTP通信でなく直接APIコールとなります。
一方でクライアントサイドのレンダリングでは通常のHTTP経由の通信となります。
このように、同一のソースコードでも臨機応変に呼び出し方式を自動で切り替えできますので、よりパフォーマンスに最適化したレンダリングが実現できます[^1]。

- [Nuxt3ドキュメント - Server Engine - Direct API Calls](https://v3.nuxtjs.org/guide/concepts/server-engine#direct-api-calls)

[^1]: 実際の切り替えは、NuxtというよりもNitroが利用している[unenv](https://github.com/unjs/unenv)で行われているようです。

NitroでAPIを作成する場合は、`server/api`ディレクトリを作成し、その配下にソースコードを配置します。

- [Nuxt3ドキュメント - Server Directory](https://v3.nuxtjs.org/guide/directory-structure/server)

ここでは以下の2つのAPIを作成します。

1. ブログ一覧の取得API(`/api/blogs`)
2. 指定されたIDのブログ取得API(`/api/blogs/:id`)

`server`配下は以下の構造になります。

```
server/
└── api
    ├── blogs
    │   └── [id].get.ts
    └── blogs.get.ts
```

Nitroはこのディレクトリ構造をもとに、APIのルートにマッピングします。詳細は以下Nitroドキュメントを参照してください。

- [Nitroドキュメント - Route Handling](https://nitro.unjs.io/guide/introduction/routing)

ここに各APIのソースコードを配置します。

- blogs.get.ts
```typescript
import fs from "fs";

export default defineEventHandler(
  async () => JSON.parse(fs.readFileSync(process.env.BLOG_DB, "utf-8")).articles
);
```

- \[id\].get.ts
```typescript
import fs from "fs";

export default defineEventHandler(async (event) => {
  const articles = JSON.parse(fs.readFileSync(process.env.BLOG_DB, 'utf-8')).articles;
  const found =
    articles.find((article) => +event.context.params.id === article.id);
  if (!found) {
    throw createError({ statusCode: 404, statusMessage: "NotFound" });
  }
  return found;
});
```

ここでは環境変数(BLOG_DB)に指定したJSONファイルを読み込み、APIレスポンスとして返すだけのシンプルなものです。
実際には、DBやCMS、キャッシュ等、取得するデータに応じた処理をここで記述することになります。

Nitroは、内部的にh3という軽量のHTTPサーバーを使用しており、ここで記述するリクエスト・レスポンスハンドラはh3に準じたものとする必要があります。
また、クエリパラメータやリクエストボディの取得等、必要最低限のh3のユーティリティが用意されています。Nuxt3同様にNitroでもAuto Importが有効となっており、ほとんどのユーティリティはimportの記述なしで利用可能です。
h3の詳細は以下ドキュメントを参照してください。

- [h3ドキュメント - GitHub](https://github.com/unjs/h3)

実際にこれをビルドして、APIにアクセスしてみます。
その前に、読み込ませるJSONファイルを任意の場所に配置します。

```json
{
  "articles": [
    {
      "id": 1,
      "title": "Nuxt3入門",
      "content": "Nuxt3が公式リリースされました。Nuxt3ではVue3対応だけでなく、NitroやVite等様々な改善が施されています。"
    },
    {
      "id": 2,
      "title": "Jest再入門",
      "content": "今回はJestのモックについて整理していきます。Jestはビルトインでマッチャーが提供され、これ単体で多くのユースケースをサポートします。"
    }
  ]
}
```

後は以下でビルドと実行をします。APIで使用しているように環境変数(BLOG_DB)には、上記JSONファイルのパスを実行前に設定します。

```shell
npm run build
# ここではカレントディレクトリ直下にJSONファイル(db.json)を配置
export BLOG_DB=${PWD}/db.json
node .output/server/index.mjs
```

別ターミナルからcurl等でアクセスするとAPIが動作していることが確認できます。

```shell
curl localhost:3000/api/blogs/1
> {"id":1,"title":"Nuxt3入門","content":"Nuxt3が公式リリースされました。Nuxt3ではVue3対応だけでなく、NitroやVite等様々な改善が施されています。"}
```

## VueコンポーネントでフェッチAPIを利用する

ここから、作成したAPIを呼び出すようにVueコンポーネント側を変えていきます。
Nuxt3ではデータ取得のためのフェッチAPIがビルトインで提供されるようになりました。

具体的には$fetch関数です。この関数の実態は[ohmyfetch](https://github.com/unjs/ohmyfetch)です。
ohmyfetchは実行環境がブラウザの場合は[Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)、Node.js環境の場合は[node-fetch](https://github.com/node-fetch/node-fetch)(または実験的バージョンのNode.jsのFetch API)を使うユニバーサルなAPIです。

$fetch関数はグローバルで利用可能で、importなしでどこでからでも使えます。
また、前述の通りNitroで作成したAPIであれば、サーバー環境で実行する場合は直接APIコールになり性能面で有利となりますので、NitroでAPIを使う際にはよほどの理由がない限りこちらを利用した方が良いかと思います。

Nuxtではこれをラップした以下のComposableを用意していますので、まずはこちらの利用を検討することになります。

- [Nuxt3ドキュメント - useFetch](https://v3.nuxtjs.org/api/composables/use-fetch)
- [Nuxt3ドキュメント - useLazyFetch](https://v3.nuxtjs.org/api/composables/use-lazy-fetch)

両者の違いはクライアントナビゲーションのブロック有無です。各Composableの詳細は上記ドキュメントを参照しくてださい。

今回はuseFetchを使用して、ブログをフェッチするように修正してみます。
前回はComposition APIのComposableを使って実装していましたが、ここではuseFetchを使うようにページコンポーネントを変更します。

- index.vue
```html
<script setup lang="ts">
// 旧実装
// const { fetchArticles, articles } = useArticles();
// fetchArticles();

// useFetch($fetch)利用
const { data: articles, refresh } = await useFetch('/api/blogs');
</script>

<template>
  <div>
    <p>新着記事！！</p>
    <ul>
      <li v-for="article in articles" :key="article.id">
        <NuxtLink :to="{path: '/details', query: { id:article.id }}">{{
            article.title
          }}
        </NuxtLink>
      </li>
    </ul>
    <!-- データ更新処理 -->
    <button @click="refresh">最新情報取得</button>
    <Advertisement />
  </div>
</template>
```

- details.vue
```html
<script setup lang="ts">
const route = useRoute();
const { id } = route.query;
// 旧実装
// const { article, fetchArticle } = useArticles();
// fetchArticle(+id);

// useFetch($fetch)利用
const { data: article } = await useFetch(`/api/blogs/${id}`);
</script>

<template>
  <div>
    <article v-if="article">
      <p>タイトル：{{ article.title }}</p>
      <hr />
      <div style="width: 500px">{{ article.content }}</div>
    </article>
    <NuxtLink to="/">戻る</NuxtLink>
    <Advertisement />
  </div>
</template>
```

実装自体は1行追加のみの簡単なものです。
以下は、useFetch/useLazyFetchの戻り値の型定義です。

```typescript
type AsyncData<DataT> = {
  data: Ref<DataT> // <- レスポンスボディ
  pending: Ref<boolean>
  refresh: () => Promise<void>
  execute: () => Promise<void>
  error: Ref<Error | boolean>
}
```

レスポンスボディを格納するdataの型に注目します。Ref&lt;DataT>となっていて、これ自体がVue3のリアクティブな変数となっていることが分かります。
つまり、dataはVue3のref()等で別途リアクティブ変数を用意する必要はなく、そのままテンプレートで使えて更新時には再レンダリングされます。

上記のコードでは、分割代入で戻り値からdataを取り出し、テンプレートで使いやすいようにリネームしています。
また、index.vue(ブログ一覧)では戻り値からrefresh関数も取得しています。このrefresh関数は、実行すれば最新のデータをフェッチして、レスポンスボディのdataを更新します。
テンプレートに「最新情報取得」ボタンを配置し、クリックするとrefresh関数を呼び出して最新のブログを取得するようにしました。

:::column:複雑なデータフェッチを記述する
useFetchやuseLazyFetchはシンプルですが、場合によってリクエスト前後にロジックを入れたいこともあるかと思います。
その場合は、以下のComposableを使い、その中で$fetch関数を呼び出します。

- [Nuxt3ドキュメント - useAsyncData](https://v3.nuxtjs.org/api/composables/use-async-data)
- [Nuxt3ドキュメント - useLazyAsyncData](https://v3.nuxtjs.org/api/composables/use-lazy-async-data)

Nuxt2を使ったことのある方は、useAsyncDataにピンときたかもしれません。そうです。これがNuxt2で使っていたasyncDataフックの後継です。
前述のuseFetch/useLazyFetchは、useAsyncData/useLazyAsyncDataと$fetchのシンタックスシュガーです。
:::

後は実行するだけです。先程同様にNuxtアプリをビルド(`npm run build`)して、Nitroサーバーを起動(`node .output/server/index.mjs`)するだけです。
ブラウザから`http://localhost:3000/`にアクセスすると、変更前と見た目は変わりませんが初回ロード時はサーバーサイドでAPIが呼び出され、HTMLとして返却されます。
一方で、index.vueに配置した「最新情報法取得」ボタンクリックや詳細ページ表示時は、ブラウザからAPIが呼び出されます。
また、詳細ページに直接アクセスする際は、サーバーサイドで直接APIコールしてデータフェッチを行い、ブログのコンテンツを含むHTMLとして返却します。
少しややこしいので、図にすると以下のようになります。

- トップページ表示 -> 最新情報取得 -> 詳細ページ表示(NuxtLink)
![Nuxt3 - Universal fetch1](https://i.gyazo.com/6219145b930f024aef6a067f00e0a79d.png)
 
- 詳細ページ直接表示
![Nuxt3 - Universal fetch2](https://i.gyazo.com/54158eb88f6359a8f9d3448b97f2264e.png)

同一コードで、サーバー(①部分)、ブラウザ(②部分)双方で利用可能なユニバーサルなフェッチが実現できています。
ブログJSONを変更して、リロードや「最新情報取得」ボタンをクリックすると更新データはすぐに反映されます。

## まとめ
今回はNuxt3で導入された新しいフェッチAPIを使い、サーバー、ブラウザ両方で利用可能なユニバーサルフェッチの実装を見てきました。
サーバーサイドレンダリングでデプロイする形態では、どこでレンダリングされてもいいようにユニバーサルな実装が必要となります。
ユニバーサルフェッチは、これを念頭にデザインされた柔軟なAPIであることが分かります。

次回はNuxt3のルーティングについて見ていきます。