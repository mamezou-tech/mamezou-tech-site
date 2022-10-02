---
title: Nuxt3入門(第2回) - 簡単なNuxtアプリケーションを作成する
author: noboru-kudo
date: 2022-10-02
templateEngineOverride: md
tags: [SSG, SSR]
prevPage: ./src/posts/nuxt3/nuxt3-rendering-mode.md
---

[前回](/nuxt/nuxt3-rendering-mode/)はNuxtの基本的なレンダリングモードを説明しました。
第2回は、実際に簡単なNuxtアプリケーションを作成し、Nuxt3の開発フローを見ていきます。

[[TOC]]

## 事前準備

まずは、`npx nuxi create sample-app`を実行し、Nuxtのプロジェクトを作成します。
その後に今回使う以下ディレクトリを追加しておきます。

```
sample-app/
├── pages <- ディレクトリ追加
├── layouts <- ディレクトリ追加
├── components <- ディレクトリ追加
├── composables <- ディレクトリ追加
├── .gitignore
├── README.md
├── app.vue
├── nuxt.config.ts
├── package.json
└── tsconfig.json
```

Nuxtでは各ディレクトリの役割を明確に規定しています。基本的にはこれに従うのが鉄則です[^1]。

[^1]: もちろん全てのディレクトリを作成する必要はなく、全て任意となっています（初期状態では何も作成されていません）。

最後に、`npm install`で依存ライブラリをインストールしておきます。

## ページコンポーネントを作成する

まずはページコンポーネントを作成してみます。
Nuxt2同様にページファイルは`pages`ディレクトリにVueコンポーネントを配置します。以下2つのページコンポーネントを作成します。
なお、各コンポーネントは冗長な記述となっていますが、この後に順を追って改善していきます。

- index.vue
```html
<script setup lang="ts">
const articles = ref<{ id: number, title: string }[]>([]);
articles.value = [{
  id: 1,
  title: "Nuxt3入門",
}, {
  id: 2,
  title: "Jest再入門",
}];
</script>

<template>
  <div>
    <header>Nuxt3サンプルアプリケーション</header>
    <div class="container">
      <p>新着記事！！</p>
      <ul>
        <li v-for="article in articles" :key="article.id">
          <NuxtLink :to="{path: '/details', query: { id:article.id }}">{{
              article.title
            }}
          </NuxtLink>
        </li>
      </ul>
    </div>
    <footer>
      © 2022 mamezou-tech
    </footer>
  </div>
</template>

<style scoped>
header {
  border-bottom-style: solid;
  padding: 1rem;
}
footer {
  margin-top: 2rem;
  background-color: #8080ee;
  padding: 1rem;
}
.container {
  margin: 2rem;
}
</style>
```
- details.vue
```html
<script setup lang="ts">
const route = useRoute();
const { id } = route.query;
const articles = [{
  id: 1,
  title: "Nuxt3入門",
  content: "Nuxt3が公式リリースされました。Nuxt3ではVue3対応だけでなく、NitroやVite等様々な改善が施されています。"
}, {
  id: 2,
  title: "Jest再入門",
  content: "今回はJestのモックについて整理していきます。Jestはビルトインでマッチャーが提供され、これ単体で多くのユースケースをサポートします。"
}];
const article = ref<{id: number, title: string, content: string}>(null);
article.value = articles.find(article => +id === article.id)
</script>

<template>
  <div>
    <header>Nuxt3サンプルアプリケーション</header>
    <div class="container">
      <p>タイトル：{{ article.title }}</p>
      <hr />
      <div style="width: 500px">{{ article.content }}</div>
      <NuxtLink to="/">戻る</NuxtLink>
    </div>
    <footer>
      © 2022 mamezou-tech
    </footer>
  </div>
</template>

<style scoped>
header {
  border-bottom-style: solid;
  padding: 1rem;
}
footer {
  margin-top: 2rem;
  background-color: #8080ee;
  padding: 1rem;
}
.container {
  margin: 2rem;
}
</style>
```

作成したページは、ブログサイトのトップページ(`index.vue`)と詳細ページ(`details.vue`)を想定したものです。
トップページでブログの一覧を表示し、ブログをクリックすると詳細ページでその記事の内容を表示します。

まず、パッと見て分かるのは、スクリプトがVue3のComposition APIスタイルになっていることです。
Vue3がベースのNuxt3では、Composition APIがデフォルトで利用可能です。
もちろん従来のオプションAPIの方も利用可能ですが、Composition APIはコード再利用の観点でメリットが大きいですので、新規に作成する場合はComposition APIの方を採用すると良いと思います。
Composition API自体の使い方は、本題ではありませんのでここでは説明しません。[Vue3ドキュメント](https://vuejs.org/guide/introduction.html)をご覧ください。

- [Composition API FAQ](https://vuejs.org/guide/extras/composition-api-faq.html)

もう一点気づくことは、上記はref()やuseRoute()等でimport文が記述されていません。これはNuxt3のAuto Importの仕組みを利用しているためです。
Nuxt3では、Nuxt本体やVueの頻出APIはもちろん、自作のVueコンポーネント(`components`配下)、Composition APIのモジュール(`composables`配下)では明示的なimport記述は不要です[^2]。

[^2]: IDEでコードアシストを使うには、Nuxtアプリ一度ビルド時して、TypeScriptの型宣言ファイル(d.ts)を`.nuxt`ディレクトリに作成する必要があります。

- [Nuxt3ドキュメント - Auto Imports](https://v3.nuxtjs.org/guide/concepts/auto-imports)

なお、Vue3からVueコンポーネントは複数のルート要素を保持できるようになりましたが、`pages`ディレクトリ配下のファイルは単一ルートである必要があります。
以下は[Nuxt3ドキュメント](https://v3.nuxtjs.org/guide/directory-structure/pages)からの抜粋です。

> Pages must have a single root element to allow route transitions between pages. (HTML comments are considered elements as well.)

## レイアウトファイルでページの枠組みを共通化する

先ほどのコードはページ間で冗長な部分が多く、理想的な状態とは言えません。
特に、ページのヘッダ、フッタ等が各ページに冗長に記述されていました。 これら全ページ横断的に適用する部分は切り出して管理すべきです。
Nuxt2でも同様ですが、このようなレイアウトは`layouts`ディレクトリにページ共通の枠組みとなるレイアウトファイルを作成します。

- [Nuxtガイド - layout](https://v3.nuxtjs.org/guide/directory-structure/layouts)

ここでは`layouts`ディレクトリ内に`default.vue`を作成し、ヘッダ、フッタを切り出します。

```html
<template>
  <div>
    <header>Nuxt3サンプルアプリケーション</header>
    <div class="container">
      <slot />
    </div>
    <footer>
      © 2022 mamezou-tech
    </footer>
  </div>
</template>

<style scoped>
header {
  border-bottom-style: solid;
  padding: 1rem;
}
footer {
  margin-top: 2rem;
  background-color: #8080ee;
  padding: 1rem;
}
.container {
  margin: 2rem;
}
</style>
```

実際の各ページのコンテンツを挿入する部分は`<slot />`とします。Nuxt2のときは`<Nuxt />`でしたので、間違えないように注意してください。

これで冗長だったページコンポーネントからヘッダやフッタを削除できます。

- index.vue
```html
<script setup lang="ts">
const articles = ref<{ id: number, title: string }[]>([]);
articles.value = [{
  id: 1,
  title: "Nuxt3入門",
}, {
  id: 2,
  title: "Jest再入門",
}];
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
  </div>
</template>
```
- details.vue
```html
<script setup lang="ts">
const route = useRoute();
const {id} = route.query;
const articles = ref<{ id: number, title: string, content: string }[]>([])
articles.value = [{
  id: 1,
  title: "Nuxt3入門",
  content: "Nuxt3が公式リリースされました。Nuxt3ではVue3対応だけでなく、NitroやVite等様々な改善が施されています。"
}, {
  id: 2,
  title: "Jest再入門",
  content: "今回はJestのモックについて整理していきます。Jestはビルトインでマッチャーが提供され、これ単体で多くのユースケースをサポートします。"
}];
const article = articles.value.find(article => id === article.id.toString());
</script>

<template>
  <div>
    <p>タイトル：{{ article.title }}</p>
    <hr />
    <div style="width: 500px">{{ article.content }}</div>
    <NuxtLink to="/">戻る</NuxtLink>
  </div>
</template>
```

先程と比較して、ヘッダ、フッタやスタイル適用がなくなってスッキリしました。
ここでNuxtアプリのエントリーポイントも修正しておきます。
プロジェクト直下の`app.vue`の内容が初期状態のWelcomeページを表示するようになっていますので修正します。

```html
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
```

`<NuxtLayout>`部分は`layouts`ディレクトリ、`<NuxtPage>`タグが`pages`ディレクトリ内のファイルを指します。
各タグの詳細は、公式ドキュメントを参照してください。

- [Nuxtドキュメント - &lt;NuxtLayout>タグ](https://v3.nuxtjs.org/api/components/nuxt-layout)
- [Nuxtドキュメント - &lt;NuxtPage>タグ](https://v3.nuxtjs.org/api/components/nuxt-page)

`default.vue`というファイル名はNuxtのデフォルトとなっていますので、ここではタグを指定するだけで問題ありません。

## Composition APIでロジックを再利用する

次にVue3にビルトインされたComposition APIを使ってみます。

今回表示するブログは固定のものとなっていますが、もちろん完成形としてはAPIアクセスで動的に取得したいです。
ここでは、このブログ取得部分をモジュール(Composable)として各ページから分離します。

`composables`ディレクトリに以下のファイル(`useArticles.ts`)を配置します。

```typescript
interface Article {
  id: number;
  title: string;
  content: string;
}

// 今回は固定値として表示
const demoArticles = [
  {
    id: 1,
    title: "Nuxt3入門",
    content:
      "Nuxt3が公式リリースされました。Nuxt3ではVue3対応だけでなく、NitroやVite等様々な改善が施されています。",
  },
  {
    id: 2,
    title: "Jest再入門",
    content:
      "今回はJestのモックについて整理していきます。Jestはビルトインでマッチャーが提供され、これ単体で多くのユースケースをサポートします。",
  },
];

export function useArticles() {
  const articles = ref<Article[]>([]);
  const article = ref<Article | null>(null);

  // 将来的にはAPIアクセス
  const fetchArticles = (): void => {
    articles.value = demoArticles;
  };
  const fetchArticle = (id: number): void => {
    article.value = demoArticles.find((article) => id === article.id) || null;
  };

  return {
    articles,
    article,
    fetchArticle,
    fetchArticles,
  };
}
```

useArticles内でこのモジュールが公開する関数や変数を定義します。

従来のオプションAPIは、data/props/methods/computed等のシステム的な観点でコードが分離され、このようなステートフルなロジックを別モジュールに切り出すのが難しかったです。
Composition APIの導入によって、ステートフルなものでも機能観点でモジュールとして簡単に切り出すことができるようになりました。

各ページファイルで、このモジュール(Composable)を使うように修正します。

- index.vue
```html
<script setup lang="ts">
const { fetchArticles, articles } = useArticles();
fetchArticles();
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
  </div>
</template>
```

- details.vue
```html
<script setup lang="ts">
const route = useRoute();
const { id } = route.query;
const { article, fetchArticle } = useArticles();
fetchArticle(+id);
</script>

<template>
  <div>
    <p>タイトル：{{ article.title }}</p>
    <hr />
    <div style="width: 500px">{{ article.content }}</div>
    <NuxtLink to="/">戻る</NuxtLink>
  </div>
</template>
```

だいぶシンプルになりました。

article取得部分を先程のComposableの公開関数・変数を使うようにしています。
ここでも前述のNuxt3のAuto Importを使っていますので、useArticlesのimport文を記述する必要はありません。

## コンポーネントでUI部品を再利用する

最後に、Vueコンポーネントで再利用可能なUI部品を作成してみます。この部分はNuxt2と基本的なやり方は変わりません。
ここでは、広告表示コンポーネントを作成し、各ページに広告を掲載するようにしてみます。

VueコンポーネントはNuxt2同様に`components`ディレクトリ内に作成します。
以下の`Advertisement.vue`ファイルを作成しました。

```html
<script setup lang="ts">
const ads = ref<{ id: number, title: string, url: string }[]>([]);
ads.value = [{
  id: 1,
  title: "エンジニア募集中",
  url: "https://wwwrecruit.mamezou.com/"
}, {
  id: 2,
  title: "オンラインセミナー開催のお知らせ",
  url: "https://mamezou.connpass.com/"
}];
</script>

<template>
  <hr />
  <p style="margin: 0.2em 0">広告</p>
  <ul style="list-style-type:none;padding-left:0;">
    <li v-for="ad in ads" :key="ad.id"><a :href="ad.url">{{ ad.title }}</a></li>
  </ul>
</template>
```

固定で複数の広告リンクを表示するだけのシンプルなものです。
これを各ページに挿入します。

- index.vue
```html
<script setup lang="ts">
const { fetchArticles, articles } = useArticles();
fetchArticles();
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
    <!-- ↓追加 -->
    <Advertisement />
  </div>
```

- details.vue
```html
<script setup lang="ts">
const route = useRoute();
const { id } = route.query;
const { article, fetchArticle } = useArticles();
fetchArticle(+id);
</script>

<template>
  <div>
    <p>タイトル：{{ article.title }}</p>
    <hr />
    <div style="width: 500px">{{ article.content }}</div>
    <NuxtLink to="/">戻る</NuxtLink>
    <!-- ↓追加 -->
    <Advertisement />
  </div>
</template>
```

スクリプトの変更はありません。テンプレートに先程の広告コンポーネントを追加しているだけです。
ここでもNuxt3のAuto Importを使っていますので、import文を記述する必要はありません。

ここまでくると、ディレクトリ構造は以下のようになります。

```
sample-app/
├── components
│ └── Advertisement.vue <- 広告表示コンポーネント
├── composables
│ └── useArticles.ts <- ブログ取得Composable
├── layouts
│ └── default.vue <- 共通レイアウト
├── pages
│ ├── index.vue   <- トップページ
│ └── details.vue <- 詳細ページ
├── app.vue <- エントリーポイント
├── node_modules
├── nuxt.config.ts
├── package-lock.json
├── package.json
├── tsconfig.json
└── .gitignore
```

## Nuxtアプリケーションを動かす

ローカル環境でこのアプリを動かしてみます。まずはコード変更時のホットリロード(HMR(Hot Module Replacement))で確認します。
以下のコマンドで実行します。

```shell
npm run dev
```

Nuxt2と比較して、かなり高速です。すぐにアプリが起動します。
ブラウザから`http://localhost:3000/`にアクセスすると、以下のようにUIが確認できます。

![sample app ui](https://i.gyazo.com/79148fde158bc9a574d7728f701c3d49.png)

この状態でソースコードを修正すると、すぐに変更は反映されます。
通常のローカル開発作業では、こちらのモードで実際のUIを確認しながら作業することになります。

実際にデプロイするときは、使用するレンダリングモードによって方法は変わってきます。

```shell
# デフォルト：ユニバーサルレンダリング(プリレンダリング無効:target->server)
npm run build
# Nitroサーバーエンジン起動
node .output/server/index.mjs

# ユニバーサルレンダリング(プリレンダリング有効:target->static) または クライアントサイドレンダリング(SPA)
npm run generate
# dist以下をホスティング
```

どのモードでもデプロイ後に表示されるUIは変わりません。

レンダリングモードの詳細は[前回記事](/nuxt/nuxt3-rendering-mode/)をご参考ください。

## まとめ

Nuxt3ではVue3のComposition APIだけでなく、Auto Importや高速なプラットフォーム等、DX(Developer Experience)が大きく向上しました。
この点は、開発ベロシティやプロダクト品質にかなり貢献するものと思います。

次回はNuxt3のユニバーサルなデータフェッチについて見ていく予定です。
