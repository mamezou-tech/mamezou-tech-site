---
title: Nuxt3入門(第1回) - Nuxtがサポートするレンダリングモードを理解する
author: noboru-kudo
date: 2022-09-25
templateEngineOverride: md
tags: [SSG, SSR]
# prevPage: ./src/posts/jest/jest-mock.md
---

Vue.jsのハイブリッドフレームワークとして人気のNuxtですが、メジャーアップデートとなるNuxt3がそろそろGAになりそうです。
Vue3やNitro、Vite等、多くの変更がある[Nuxt3](https://v3.nuxtjs.org/)ですが2022年春にRC版が公開された後、ハイペースで更新が続きかなり安定してきた印象です。

ここでは、Nuxt3入門と題してNuxt3が提供する基本機能について連載を書いていきたいと思います。
まず、初回はNuxtが提供するレンダリングモードを整理します。

なお、基本的なプロジェクト作成の方法は[公式ドキュメント](https://v3.nuxtjs.org/getting-started/installation)に記載されているとおりですので触れません。

今回は、新しいVueコンポーネントを作成せずに初期状態のNuxtのWelcomeページで見ていきます。

[[TOC]]

## Nuxt3が提供するレンダリングモード

Nuxt2と同じようにNuxt3ではクライアントサイドレンダリングとユニバーサルレンダリングに対応しています。
ただし、今後の予定として、両者を組み合わせたハイブリッドレンダリングやエッジ環境でのレンダリングもサポート予定のようです。

- [Hybrid Rendering (Route Caching rules) ](https://github.com/nuxt/framework/discussions/560)

レンダリングモードの概要は、公式ドキュメントの以下で説明されています。

- [Nuxt - Rendering Modes](https://v3.nuxtjs.org/guide/concepts/rendering)

## クライアントサイドレンダリング(Client-side Only Rendering)

SPA(Single Page Application)と言ったほうが分かりやすいかと思います。クライアントつまりブラウザ上でレンダリングするモードです。
ここでNuxtがビルドする主要なアウトプットはJavaScriptソースコードです。

クライアントサイドレンダリングを使用する場合は`nuxt.config.ts`を以下のようにします。

```typescript
export default defineNuxtConfig({
  ssr: false
})
```

Nuxt3では以下のように静的リソースを生成します。

```shell
npx nuxi generate
```

Nuxt2の`nuxt`ではなく、Nuxt3では`nuxi`コマンドを使用する点に注意が必要です。
`dist`ディレクトリにビルドされたリソースが出力されます。これをNginx等のWebサーバーやS3、Netlify/Vercel等にホスティングすることでサービスを提供できます。

生成された`dist/index.html`を見ると以下のようになっています。

```html
<!DOCTYPE html>
<html >
<head><link rel="modulepreload" as="script" crossorigin href="/_nuxt/entry.efa19551.js"><link rel="preload" as="style" href="/_nuxt/entry.eba111bf.css"><link rel="prefetch" as="script" crossorigin href="/_nuxt/error-component.81f0ed77.js"><link rel="stylesheet" href="/_nuxt/entry.eba111bf.css"></head>
<body ><div id="__nuxt"></div><script>window.__NUXT__={serverRendered:false,config:{public:{},app:{baseURL:"\u002F",buildAssetsDir:"\u002F_nuxt\u002F",cdnURL:""}},data:{},state:{}}</script><script type="module" src="/_nuxt/entry.efa19551.js" crossorigin></script></body>
</html>
```

HTMLとしての中身はなく(Nuxtのプレースホルダのみ)、生成したNuxtアプリケーションを指定したscriptタグのみが埋め込まれていることが分かります。
ブラウザでこれを取得すると、Nuxtアプリケーションが起動され、ページのレンダリングが実行されます。
VueのSPAでよく使われる[Vue CLI](https://cli.vuejs.org/)を使ってビルドしたものと同じ挙動です。

実行環境はクライアントサイドのみになりますので、後述のユニバーサルレンダリングと比較して開発が容易であることや（サーバー環境でのレンダリングを意識する必要がない）、サーバー実行環境が不要である等のメリットがあります。

その一方で、ページが表示されるまでの初期ロード(クライアントレンダリングの完了)に時間がかかったり、JavaScriptがメインとなっているためSEOには不利に働きます。
これはユニバーサルレンダリングにより解消されます。

## ユニバーサルレンダリング(Universal Rendering)

Nuxtではこちらがデフォルトです。

ユニバーサルレンダリングは、一般的にはSSR(Server-Side Rendering)という方が分かりやすいかと思います。
クライアントサイドレンダリングと異なり、ここではサーバーサイドでもレンダリングしてHTMLを生成します。
このため、ブラウザはリソースをフェッチするとすぐに描画可能で、クライアントサイドレンダリングの欠点である初期ロードの遅さやSEOの問題を解消します。

ただし、非ブラウザ環境のサーバーサイド(Node.js)でレンダリングしたHTMLは、このままではユーザー操作に対するリアクティブ性はありません。
ここで登場するのがハイドレーションステップです。ハイドレーションはクライアントサイド(つまりブラウザ環境)でも同様のレンダリングし、その結果を既存のHTMLに融合します。
これにより、クライアントサイドレンダリングと同じリアクティブ性を後付けで追加する流れになります。

このハイドレーションの動きについては、本家Vueの公式ドキュメントに詳細がありますのでご参考ください。

- [Vue - Client Hydration](https://vuejs.org/guide/scaling-up/ssr.html#rendering-an-app)

:::column:アイランドアーキテクチャとハイドレーション
ハイドレーションは巷で流行り(?)のアイランドアーキテクチャでも重要な位置づけとなっています。
リアクティブ性が必要なアイランド(コンポーネント)では、HTMLを表示しつつも遅延してハイドレーションが実行されます。
こうすることでSSGのメリットを損なうことなく、ユーザーに対するインタラクティブ性を確保しています。

- [Islands Architecture](https://jasonformat.com/islands-architecture/)

このアイランドアーキテクチャを推進しているAstroは本サイトの記事として紹介していますので、興味のある方はご参照ください。

- [コンテンツ重視の静的サイトジェネレーター Astro でドキュメントサイトを構築する](/blogs/2022/09/07/build-doc-site-with-astro/)
:::

このようにサーバー、クライアントサイド双方でレンダリングされるため、ユニバーサルレンダリングという名称となっています。
このため、実装時はサーバー(Node.js等)、各種ブラウザ双方で動くことを保証する必要があり、クライアントサイドレンダリングよりも実装難易度は高いと言えます。
不用意にwindow.location等ブラウザ固有のAPIを使おうとすれば、サーバーサイドでのレンダリング時にエラーとなります。

前述の通り、ユニバーサルレンダリングはNuxtのデフォルトですので、特別な指定は不要です。
明示的に指定する場合は、`nuxt.config.ts`を以下のように指定します。

```typescript
export default defineNuxtConfig({
  ssr: true,
})
```

ビルドは以下のように`nuxi build`コマンドを実行します。

```shell
npx nuxi build
```

実行が終わると、`.output`ディレクトリにサーバー実行モジュールが出力されます。

```
.output
├── nitro.json
├── public
│ └── _nuxt
│     ├── entry.eba111bf.css
│     ├── entry.efa19551.js
│     ├── error-404.18ced855.css
│     ├── error-404.e1668e0f.js
│     ├── error-500.6838e31d.js
│     ├── error-500.e60962de.css
│     └── error-component.81f0ed77.js
└── server
    ├── chunks
    │ ├── app
    │ ├── error-500.mjs
    │ ├── error-500.mjs.map
    │ ├── handlers
    │ └── nitro
    ├── index.mjs
    ├── index.mjs.map
    ├── node_modules
    └── package.json
```

これはNuxt3でサーバーエンジンとして採用されているNitroのモジュールです。
デフォルトではNode.js Serverをターゲット環境としていますが、NitroはユニバーサルJavaScriptエンジンですので、LambdaやDeno等の他の環境で実行可能です(未検証です)。
また、Nitroでは必要なもののみをバンドルしますので、Nuxt2よりもかなりモジュールサイズも削減されますし、Nuxt2と比較して高速です。

Nitroは[こちら](/blogs/2022/07/20/nitro_with_lambda/)の記事でも触れていますので、興味のある方はご参照ください。

実際にスタンドアローンのNode.js Serverで実行する場合は、以下のようにします。

```shell
node .output/server/index.mjs
```

デフォルトの3000番ポートでNitroサーバーが起動します。

実際にcurlで`http://localhost:3000`にアクセスしてみます。
初期プロジェクト作成時のWelcomeページでは以下のようなHTMLが取得できました（長いので大部分は省略しています）。

```html
<!-- 抜粋・整形 -->
<!DOCTYPE html>
<html data-head-attrs="">
<head>
  <!-- (省略) -->
</head>
<body data-head-attrs="">
<div id="__nuxt">
  <div>
    <div class="font-sans antialiased bg-white dark:bg-black text-black dark:text-white min-h-screen place-content-center flex flex-col items-center justify-center p-8 text-sm sm:text-base"
         data-v-25102a06>
      <div class="grid grid-cols-3 gap-4 md:gap-8 max-w-5xl w-full z-20" data-v-25102a06>
        <div class="col-span-3 rounded p-4 flex flex-col gradient-border" data-v-25102a06>
          <div class="flex justify-between items-center mb-4" data-v-25102a06><h1 class="font-medium text-2xl" data-v-25102a06>Get Started</h1>
          </div>
          <p class="mb-2" data-v-25102a06>Remove this welcome page by replacing <a class="bg-gray-100 dark:bg-white/10 rounded font-mono p-1 font-bold" data-v-25102a06>&lt;NuxtWelcome /&gt;</a>
            in <a href="https://v3.nuxtjs.org/docs/directory-structure/app" target="_blank" rel="noopener" class="bg-gray-100 dark:bg-white/10 rounded font-mono p-1 font-bold" data-v-25102a06>app.vue</a> with
            your own code.</p></div>
        <a href="https://v3.nuxtjs.org" target="_blank" rel="noopener"
           class="gradient-border cursor-pointer col-span-3 sm:col-span-1 p-4 flex flex-col" data-v-25102a06>
          <h2 class="font-semibold text-xl mt-4" data-v-25102a06>Documentation</h2>
          <p class="mt-2" data-v-25102a06>We highly recommend you take a look at the Nuxt documentation, whether you are
            new or have previous experience with the framework.</p></a><a href="https://github.com/nuxt/framework" target="_blank" rel="noopener" class="cursor-pointer gradient-border col-span-3 sm:col-span-1 p-4 flex flex-col" data-v-25102a06>
        <h2 class="font-semibold text-xl mt-4" data-v-25102a06>GitHub</h2>
        <p class="mt-2" data-v-25102a06>Nuxt is open source and the code is available on GitHub, feel free to star it,
          participate in discussions or dive into the source.</p></a><a href="https://twitter.com/nuxt_js" target="_blank" rel="noopener" class="cursor-pointer gradient-border col-span-3 sm:col-span-1 p-4 flex flex-col" data-v-25102a06>
        <h2 class="font-semibold text-xl mt-4" data-v-25102a06>Twitter</h2>
        <p class="mt-2" data-v-25102a06>Follow the Nuxt Twitter account to get latest news about releases, new modules,
          tutorials and tips.</p></a></div>
    </div>
  </div>
</div>
<script>window.__NUXT__ = {
  data: {},
  state: {},
  _errors: {},
  serverRendered: true,
  config: {public: {}, app: {baseURL: "\u002F", buildAssetsDir: "\u002F_nuxt\u002F", cdnURL: ""}}
}</script>
<script type="module" src="/_nuxt/entry.efa19551.js" crossorigin></script>
</body>
</html>
```

先程のクライアントサイドレンダリングの場合はscriptタグだけでしたが、今回はHTMLのコンテンツが含まれています。これがサーバーサイドでレンダリングした結果です。
ブラウザはすぐにこれを表示可能で、初期ロード時間はかなり短縮されますし、検索エンジンのBotもすぐにこのページを認識するはずです。
これに対して前述のハイドレーションが加えられ、HTMLに対してリアクティブ性が追加されます。その後の動きはクライアントサイドレンダリングのときと同じです。
以下のイメージです。

![Nuxt universal rendering](https://i.gyazo.com/5da3255e252b87b9036824c5efce54d3.png)

この仕組みの欠点は、サーバー環境で毎回レンダリングが発生することによるレスポンス遅延ですが、これに対してはCDNを挟むことで、キャッシュを利用したパフォーマンス対策が施されることが一般的かと思います。
とはいえ、やはりサーバー実行環境を準備し、運用していく必要があります。
NitroではNode.js Serverだけでなく、任意のサーバーレス環境にもデプロイ可能ですが、できれば静的なコンテンツとして配信したいことが多いでしょう。

ここで登場するのが、プリレンダリングです。
一般的にはこの形態はSSRに対してSSGと言う方も多いかと思いますが、Nuxtのコンテキストでは、レンダリングのタイミングが異なるだけでこれもSSRの1形態として扱われています(`nuxt.config.ts`は`ssr: true`とする必要があります)。
プリレンダリングでは、先程Nitroサーバー環境でレンダリングしていたものをビルド時にまとめて実施します。

プリレンダリングを利用する場合は、クライアントサイドレンダリング同様に`nuxi generate`コマンドを実行します。

```shell
npx nuxi generate
```

これを実行すると`dist`配下にHTMLが出力されます。掲載は省略しますが`index.html`を見ると先程curlでNitroサーバーから取得したものと同様のHTMLが出力されます。
このディレクトリ配下を任意のホスティング環境に配置すれば、すぐにWebサイトを運用できます。

プリレンダリングでは、以下のようなイメージで動作しているようです[^1]。

![Nuxt universal rendering - prerendering](https://i.gyazo.com/8b49dae0d1dfe517c5c667adbd902a37.png)

[^1]: プリレンダリングではNitroの[prerender](https://nitro.unjs.io/config#prerender)オプションが使用されるようです。

プリレンダリングでは、主要なタスクをビルド時に実行しますので、実行環境はシンプルになります。
クライアントレンダリングと同じように、単純にいつもの静的サイトとしてデプロイするだけですので、運用も簡単です。
欠点はプリレンダリングの分ビルド時間が長くなることです。さらに、HTMLは静的なものですので、ページ更新の都度実行する必要があります。
今回は1ページ(Welcomeページ)だけですので、ほとんど変わりませんが、ページ数が増えるにつれてこの部分のコストは差が出てくることになります。
このため、大規模なサイトでは、CI環境はそれなりのスペックのものを用意する必要があるかと思います。

このようにプリレンダリングにもトレードオフがあり、どちらが優れているということは一概には言えません。サイトの特性に応じて選択していくことになります。

## まとめ
今回は、Nuxt3(Nuxt2でも基本は同じですが)が備えるレンダリングモードについて見てきました。
特にユニバーサルレンダリングは、SPAを中心に経験された方には少し風変わりなアーキテクチャに見えるかもしれませんが、よく見るとSPAのメリットを活かしつつも、パフォーマンスやSEOといった課題に対する解決策を提供していることが分かります。
また、前述の通りNuxt3ではこれ以外にもより高機能なレンダリングがサポートされていく予定です。
今後の動向に注視していく必要があります。

次回からは、Nuxt3が提供する機能についてフォーカスしていきたいと思います。