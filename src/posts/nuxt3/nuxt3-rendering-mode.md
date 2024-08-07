---
title: Nuxt3入門(第1回) - Nuxtがサポートするレンダリングモードを理解する
author: noboru-kudo
date: 2022-09-25
tags: [SSG, SSR]
nextPage: ./src/posts/nuxt3/nuxt3-develop-sample-app.md
image: true
---

Vue.jsのハイブリッドフレームワークとして人気のNuxtですが、メジャーアップデートとなるNuxt3がそろそろGAになりそうです。
Vue3やNitro、Vite等、多くの変更がある[Nuxt3](https://nuxt.com/)ですが2022年春にRC版が公開された後、ハイペースで更新が続きかなり安定してきた印象です。

ここでは、Nuxt3入門と題してNuxt3が提供する基本機能について連載を書いていきたいと思います。
まず、初回はNuxtが提供するレンダリングモードを整理します。

なお、基本的なプロジェクト作成の方法は[公式ドキュメント](https://nuxt.com/docs/getting-started/installation)に記載されているとおりですので触れません。
                                                
今回は、新しいVueコンポーネントを作成せずに初期状態のNuxtのWelcomeページで見ていきます。


## Nuxt3が提供するレンダリングモード

Nuxt2と同じようにNuxt3ではクライアントサイドレンダリングとユニバーサルレンダリングに対応しています。
ただし、今後の予定として、両者を組み合わせたハイブリッドレンダリングやエッジ環境でのレンダリングもサポート予定です。

:::info
Nuxt3のrc.12で、ハイブリッドレンダリングの初期バージョンがリリースされました。
nuxt.config.tsでルートごとにレンダリング方法(クライアントサイドレンダリングやプリレンダリング有無等)を指定できるようになっています。

- [Nuxt3ドキュメント - Hybrid Rendering](https://nuxt.com/docs/guide/concepts/rendering#hybrid-rendering)
:::

レンダリングモードの概要は、公式ドキュメントの以下で説明されています。

- [Nuxt3ドキュメント - Rendering Modes](https://v3.nuxtjs.org/guide/concepts/rendering)

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

`.output/public`ディレクトリにビルドされたリソースが出力されます。これをNginx等のWebサーバーやS3、Netlify/Vercel等にホスティングすることでサービスを提供できます。

生成された`.output/public/index.html`を見ると以下のようになっています。

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
デフォルトではNode.js Serverをターゲット環境としていますが、NitroはユニバーサルJavaScriptエンジンですので、LambdaやDeno等の他の環境で実行可能です。
また、Nitroでは必要なもののみをバンドルしますので、Nuxt2よりもかなりモジュールサイズも削減されますし、ビルド速度もかなり高速になっています。

:::info
サーバーサイドレンダリングをAWSサーバーレス環境のLambdaにデプロイする方法については、以下の記事で紹介しています。
興味のある方はこちらもご参考ください。

- [Nuxt3入門(第9回) - Nuxt3アプリケーションをサーバーレス環境にデプロイする](/nuxt/nuxt3-serverless-deploy/)
:::

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

![Nuxt universal rendering](https://i.gyazo.com/9453dd706daa12054f96d73fad08af89.png)

この仕組みの欠点は、サーバー実行環境を事前に準備し、スケーラビリティを考慮した運用を継続的にしていく必要があることかと思います[^1]。
NitroではNode.js Serverだけでなく、任意のサーバーレス環境にもデプロイ可能ですが、できれば静的なコンテンツとして配信したいことも多いでしょう。

[^1]: 初期ロード時にサーバー環境でレンダリングが発生することによるレスポンス遅延もありますが、初期ロード後は通常のSPA同様にクライアントサイドレンダリングです。また、public配下の静的コンテンツは、CDNを挟むことでキャッシュを利用したパフォーマンス対策が施されることが一般的かと思います。

ここで登場するのが、プリレンダリングです。
一般的にはこの形態はSSRに対してSSGと言う方も多いかと思いますが、Nuxtのコンテキストでは、レンダリングのタイミングが異なるだけでこれもSSRの1形態として扱われています(`nuxt.config.ts`は`ssr: true`とする必要があります)。
プリレンダリングでは、先程Nitroサーバー環境でレンダリングしていたものをビルド時にまとめて実施します。

プリレンダリングを利用する場合は、クライアントサイドレンダリング同様に`nuxi generate`コマンドを実行します。

```shell
npx nuxi generate
```

これを実行すると`.output/pubic`配下にHTMLが出力されます。掲載は省略しますが`index.html`を見ると先程curlでNitroサーバーから取得したものと同様のHTMLが出力されます。
このディレクトリ配下を任意のホスティング環境に配置すれば、すぐにWebサイトを運用できます。

プリレンダリングでは、以下のようなイメージで動作しているようです[^2]。

![Nuxt universal rendering - prerendering](https://i.gyazo.com/8b49dae0d1dfe517c5c667adbd902a37.png)

[^2]: プリレンダリングではNitroの[prerender](https://nitro.unjs.io/config/#prerender)オプションが使用されるようです。

プリレンダリングでは、主要なタスクをビルド時に実行しますので、実行環境はシンプルになります。
クライアントレンダリングと同じように、単純にいつもの静的サイトとしてデプロイするだけですので、運用も簡単です。
また、事前にレンダリングしたものを表示していますので、サーバーサイドレンダリングの実行は不要でパフォーマンスの観点でも高速です。

欠点はプリレンダリングの分ビルド時間が長くなることです。さらに、HTMLは静的なものですので、ページ更新の都度実行する必要があります。
今回は1ページ(Welcomeページ)だけですので、ほとんど変わりませんが、ページ数が増えるにつれてこの部分のコストは差が出てくることになります。
このため、大規模なサイトでは、CI環境はそれなりのスペックのものを用意する必要があるかと思います。

このようにプリレンダリングにもトレードオフがあり、どちらが優れているということは一概には言えません。サイトの特性に応じて選択していくことになります。

:::info
よく間違いやすいのですが、ユニーバーサルレンダリングモードでも全ページをHTMLとして取得する訳ではなく、初期ロード後のページ遷移は通常のSPAと同じようにクライアントサイドでのレンダリングとなります。
これによりSPAをメリットである高速なページ切り替えやインタラクティブ性を確保しています。
:::

## まとめ
今回は、Nuxt3(Nuxt2でも基本は同じですが)が備えるレンダリングモードについて見てきました。
特にユニバーサルレンダリングは、SPAを中心に経験された方には少し風変わりなアーキテクチャに見えるかもしれませんが、よく見るとSPAのメリットを活かしつつも、パフォーマンスやSEOといった課題に対する解決策を提供していることが分かります。
また、前述の通りNuxt3ではこれ以外にもより高機能なレンダリングがサポートされていく予定です。
今後の動向に注視していく必要があります。

次回からは、Nuxt3が提供する機能についてフォーカスしていきたいと思います。