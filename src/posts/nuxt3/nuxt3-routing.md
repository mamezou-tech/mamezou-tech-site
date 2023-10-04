---
title: Nuxt3入門(第4回) - Nuxtのルーティングを理解する
author: noboru-kudo
date: 2022-10-09
tags: [SSG, SSR]
prevPage: ./src/posts/nuxt3/nuxt3-universal-fetch.md
nextPage: ./src/posts/nuxt3/nuxt3-app-configuration.md
---

[前回](/nuxt/nuxt3-universal-fetch/)はサンプルアプリのブログサイトがAPI経由でブログ情報を取得できるようにしました。

今回は、Nuxtアプリケーションでページ遷移に使うルーティングについて見ていきます。
Nuxt2でも同様ですが、Nuxt開発ではルーティング定義を個別に作成する必要はありません[^1]。Nuxtではファイルシステムベースのルーティングを採用しており、`pages`ディレクトリ配下の構造でルートマッピング決まります。

[^1]: Nuxtを使わない場合は、[Vue Router](https://router.vuejs.org/)でルートマッピングを記述するのが一般的です。


## ルーティングの基本

前述の通り、Nuxtはデフォルトで、ファイル構造にもとづいてルートマッピングを自動生成します。
デモアプリとして作成したブログサイトの`pages`配下は以下の構成でした。

```
pages
├── index.vue
└── details.vue
```

このように配置すると、Nuxtは背後のVue Routerの定義として、以下のマッピング(パス -> ページコンポーネント)を作成します。

- / -> pages/index.vue
- /details -> pages/details.vue

もちろんネストしたディレクトリ構成もできます。

```
pages
└── foo
    └── bar.vue
```

この構成だと /foo/bar が pages/foo/bar.vue にマッピングされます。
この辺りはNuxt2を触っていた方にはお馴染みのものですね。

## プログラムでのページ切り替え

ここまでページ遷移では[NuxtLink](https://nuxt.com/docs/api/components/nuxt-link)を使っていました。これはNuxtにビルトインされているVueコンポーネントです。
もちろんNuxtLinkを使わずに、プログラムでページ切り替えもできます。この場合はNuxtビルトインのnavigateTo関数を使用します。

```html
<script setup lang="ts">
const navigate = () => {
  return navigateTo({
    path: '/foo/bar',
    query: {
      baz: 'programmatic-navigation'
    }
  });
}
</script>

<template>
  <div>
    <button @click="navigate">プログラムでページ遷移</button>
  </div>
</template>
```

他のNuxtコアAPI同様にnavigateToもAuto Import対象ですので、import不要で記述できます。
注意点として、navigateToを利用する場合は、awaitまたは関数の戻り値としてnavigateToの結果を返す必要があります。以下[公式ドキュメント](https://nuxt.com/docs/guide/directory-structure/pages#programmatic-navigation)からの引用です。

> Ensure to always await on navigateTo or chain its result by returning from functions

## キャッチオールルート

対象のマッピングが存在しない場合のルート(Catch-all Route)です。
Nuxt3では`[...slug].vue`というファイル名でページコンポーネントを作成します。slugの部分は任意の文字列で構いません。

作成するページコンポーネントは以下のような通常のVueコンポーネントです。

```html
<template>
  <p>{{ $route.params.slug }} Catch-all Route</p>
</template>
```

テンプレートのみのシンプルなコンポーネントです。
`route.params.slug`の部分には、ファイル名のスプレッド演算子から推測できるようにパスの配列(`/`区切り)が入ります。
このキャッチオール用のページコンポーネントは、任意のディレクトリに配置して適用範囲をそのパス配下に限定できます。

なお、適用範囲の指定はできませんが、`pages/404.vue`ページコンポーネントを作成すれば、全体のキャッチオールルートとして指定可能です。

## 動的ルーティング

シンプルなアプリであればこれで十分かもしれませんが、実用的なアプリケーションでは、パスパラメータを使って動的にルートマッピングをしたいケースは結構多いかと思います。
デモアプリのブログ詳細ページ(details.vue)は、クエリパラメータで表示するブログの内容を切り替えていましたが、ここではパスパラメータに変更します。

- 変更前: /details?id=1
- 変更後: /details/1

Nuxt3で動的ルーティングを作成する場合は、以下のような構成にします。

```
pages
├── index.vue
└── details
    └── [id].vue
```

Nuxt2では`pages/details/_id.vue`のようなアンダースコアをつけていましたが、Nuxt3では`pages/details/[id].vue`のようにパスパラメータを`[]`で囲むように変わっています[^2]。
このスタイルはファイル名だけでなく、ディレクトリ名にも適用できます。

[^2]: 基本的にNitroのルーティングルールが採用されているようです。

この構成にするとNuxtは以下のマッピングを作成します。

- / -> pages/index.vue(変更なし)
- /details/:id -> pages/details/\[id\].vue

2番目の定義がVue Routerの動的ルーティング[^3]になります(`id`パラメータ)。

[^3]: Vue Routerの動的ルーティングは[公式ドキュメント](https://router.vuejs.org/guide/essentials/dynamic-matching.html)を参照してください。

このパスパラメータを利用するようindex.vueを修正します。

```html
<script setup lang="ts">
const {data: articles, refresh} = await useFetch('/api/blogs');
</script>

<template>
  <div>
    <p>新着記事！！</p>
    <ul>
      <li v-for="article in articles" :key="article.id">
        <!-- 以下変更 -->
        <NuxtLink :to="`/details/${article.id}`">{{ article.title }}</NuxtLink>
        <!-- 以下でも可
        <NuxtLink :to="{ name: 'details-id', params: { 'id': article.id }}">{{ article.title }}</NuxtLink>
        -->
      </li>
    </ul>
    <button @click="refresh">最新情報取得</button>
    <Advertisement />
  </div>
</template>
```

`NuxtLink`の`to`プロパティをパスパラメータに変更しています。
`details/[id].vue`の方は以下のようになります。

```html
<script setup lang="ts">
const route = useRoute();
// パスパラメータよりid取得
const { id } = route.params;
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

基本はdetails.vueと同じですが、クエリパラメータ(route.query)として取得していた部分を、パスパラメータ(`route.params`)に変更しました。
これでNuxtアプリケーションをビルドすると、パスパラメータでページ遷移するようになります。

:::column:プリレンダリングと動的ルーティング
Nuxtはルート(`/`)を起点としてHTMLリンクをクロールしており、動的ルーティング対象のページコンポーネントもプリレンダリングできます。
以下はプリレンダリングを実行した場合(`npm run generate`)の出力内容です。

![dynamic routing pre-rendering](https://i.gyazo.com/6f394a98b01bfe82ae5ed09a9fdedbed.png)

クローラーがルートのindex.vueで生成されたHTMLのaタグから/details/1、/details/2を検知し、プリレンダリングしている様子が分かります。
注意点として、クローラーはあくまで生成したHTMLリンクを起点としています。navigateTo関数を使ってページ切り替えする場合はクロール対象とはなりません。

このような場合は、以下のように別途`nuxt.config.ts`でクロール対象を指定する必要があります。

```typescript
export default defineNuxtConfig({
  target: 'static',
  generate: {
    routes: ['/details/1', '/details/2']
  }
})
```

こうすると/details/1、/details/2がプリレンダリング対象となり、生成結果のHTMLリンク先に対してもクローラーが実行されます。
Nuxt3のRC版(rc.11)では、Nuxt2のように`generate.routes`に関数を指定できませんでした。ただし、JSDocには関数の指定もできると記載されていますのでGA版では対応されると思われます。

クローラーを実行せずに対象ルートのみをプリレンダリング対象としたい場合は、明示的に`generate.crawler`をfalseに指定します。

なお、動的ルーティングとは関係ありませんが、サンプルアプリで使用しているブログ情報の「最新情報取得」ボタンは、プリレンダリングではAPIサーバーが存在しないため機能しません(404エラー)。
:::

## カスタムマッピングルール

ここまでは、Nuxtのファイルシステムベースのルーティングを見てきましたが、カスタムでマッピングルール作成も可能です。

- [Nuxtドキュメント - Router Options](https://nuxt.com/docs/guide/directory-structure/pages#router-options)

ここでは、Nuxtが作成するファイルシステムベースの /foo/bar(`pages/foo/bar.vue`) を /foo/baz でもアクセスできるようにしてみます。

これを実施するには、プロジェクトルートに`app`ディレクトリを配置し、その中に`router.options.ts`を作成します。

```typescript
import type { RouterOptions } from '@nuxt/schema'
import { RouterOptions as VueRouterOptions } from "vue-router";

export default <RouterOptions> {
  routes(_routes: VueRouterOptions['routes']) {
    return [..._routes, {
      path: '/foo/baz',
      component: () => import('~/pages/foo/bar.vue')
    }];
  }
}
```

routes関数の引数には、Nuxtが作成したファイルシステムベースのルートマッピングが渡されてきます。
ここではこれに加えて /foo/baz のルートを追加しました。
カスタムルートの記述方法はVue Routerのものです。詳細は[Vue Routerの公式ドキュメント](https://router.vuejs.org/api/interfaces/routeroptions.html)を参照してください。

こうすると /foo/baz が pages/foo/bar.vue にマッピングされ、NuxtLinkやnavigateToでカスタムパスでページ遷移可能となります。

- /foo/bar -> pages/foo/bar.vue (Nuxtデフォルト)
- /foo/baz -> pages/foo/bar.vue (追加したカスタムルート)

もちろん上記ロジックを修正して、Nuxtデフォルトの方のルートを除外することもできます。

## まとめ

今回はNuxtが提供するルーティングの概要を見てきました。
Nuxtデフォルトのファイルシステムベースではマッピングの記述なく、様々なユースケースに対応可能です。

次回はNuxtアプリで利用する設定情報にフォーカスする予定です。