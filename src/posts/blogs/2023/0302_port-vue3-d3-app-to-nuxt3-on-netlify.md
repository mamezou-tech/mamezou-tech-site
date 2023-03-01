---
title: Vue3+D3.js アプリを Nuxt3 に移植して Netlify にデプロイしてみた
author: masahiro-kondo
date: 2023-03-02
tags: [nuxt, netlify]
---

「[Vue 3 と D3.js で作る可視化アプリ](/blogs/2023/02/10/visualization-with-vue3-and-d3/)」の記事では、D3.js を使った可視化のための簡単な Web アプリを Vue3 の SPA で作成しました。

![screen shot](https://i.gyazo.com/e9d577e1fbf8e6494d903172459da7f8.png)

## Nuxt3 への移植
Vue3 がなんとなく分かった気がしたので、次に Nuxt3 への移植にトライしました。

:::info
豆蔵デベロッパーサイトには Nuxt3 の充実した入門記事があります。以下のインデックスページからどうぞ。

[Nuxt3入門 | フロントエンド](https://developer.mamezou-tech.com/frontend/#nuxt3入門)
:::

まず Nuxt3 プロジェクトを作成します。Vue3 のアプリは scrapbox-graph というプロジェクト名で作ったので安直に `-nuxt` のサフィックスをつけました。

```shell
npx nuxi init scrapbox-graph-nuxt
```

作成したプロジェクトは以下のリポジトリに置きました。

[GitHub - kondoumh/scrapbox-graph-nuxt](https://github.com/kondoumh/scrapbox-graph-nuxt)

## Nuxt3 機能の利用
出来上がったプロジェクトに、Vue3 アプリから Vue ファイルを持っていくと一応そのままでも動作しますすが、せっかくなので Nuxt の機能を使用します。画面遷移もない簡単なアプリですのでごく一部の機能だけですが。

### モジュール分割と useFetch の利用
Vue3 のアプリの時はデータフェッチとオブジェクト変換、Graph のレンダリングを1つの Vue ファイルにベタッと書いていました。今回はレンダリング部分のみ Vue コンポーネントに切り出し、データ取得と変換はモジュールとして composables ディレクトリに配置しました。

- composables/useGraph (抜粋)

```javascript
export function useGraph() {
  const graphData = ref([]);

  const nodes = computed(() => {
    // 変換処理
    return nodes;
  });

  const edges = computed(() => {
    // 変換処理
    return edges;
  });

  const fetchData = async project => {
    const { data: graph } = await useFetch(/* データ取得先 URL */);
    graphData.value = graph.value;
  };

  return {
    nodes,
    edges,
    fetchData,
  };
}
```

ブラウザの fetch API をそのまま使っていたところは useFetch を使用しました。

:::info
useFetch については Nuxt3入門の第3回で解説されています。

[Nuxt3入門(第3回) - ユニバーサルフェッチでデータを取得する](/nuxt/nuxt3-universal-fetch/)
:::

### useState の利用
Vue3 アプリでは、ヘッダーコンポーネントのセレクトボックスの選択状態の変化を emit と props で伝播させていました。Nuxt3 の useState を使えばこのような値のバケツリレーをしなくてもシンプルに状態を管理できます。

Header コンポーネントでは `@onChnage` や emit を書かなくてよくなりました。

- components/Header.vue
```html
<template>
  <header>
    <h2>Scrapbox graph</h2>
    <select v-model="project">
      <option>help-jp</option>
      <option>comic-forum</option>
      <option>icons</option>
    </select>
  </header>
</template>

<script setup>
  const project = useState('selected-project', () => {
    return 'help-jp';
  });
</script>
```

Graph コンポーネント側では useState で選択されているプロジェクト名を取れるようになり、app.vue で受け渡ししなくてもよくなりました。

- components/Graph.vue
```html
<template>
  <svg id="svg" />
</template>

<script setup>
  import * as d3 from 'd3';
  const { width, height, nodes, edges, fetchData } = useGraph();
  const project = useState('selected-project');

  <!-- 省略 -->
</script>
```

:::info
useState については Nuxt3入門の第8回で解説されています。

[Nuxt3入門(第8回) - Nuxt3のuseStateでコンポーネント間で状態を共有する](/nuxt/nuxt3-state-management/)
:::

app.vue はコンポーネントを並べるだけの静的な記述になりました。

- app.vue

```html
<template>
  <div>
    <Header />
    <Graph />
  </div>
</template>
```

## Netlify へのデプロイ
Vue3 アプリは GitHub Pages で公開していました。GitHub Pages に Nuxt のアプリをデプロイするには、事前にスタティックなアセットを生成する必要があります[^1]。

Netlify を使うと事前のスタティックなアセット生成なしで Nuxt アプリをホスティングできます。今回は使用していませんが Nitro を使った SSR にも対応しています。

[Nuxt on Netlify](https://docs.netlify.com/integrations/frameworks/nuxt/)

:::info
Nitro は Nuxt でも採用されている軽量な JavaScript エンジンです。以下の記事をご参照ください。

- [ユニバーサルJavaScriptサーバーNitroをAWS Lambdaにデプロイする](/blogs/2022/07/20/nitro_with_lambda/)
- [Nuxt3入門(第9回) - Nuxt3アプリケーションをサーバーレス環境にデプロイする](https://developer.mamezou-tech.com/nuxt/nuxt3-serverless-deploy/)
:::

[^1]: package.json の "generate" スクリプトで "nuxt generate" を実行します。

Netlify でのデプロイは簡単です。Build command と publish directory の指定だけで、しかもデフォルト値のままです。

![Build settings](https://i.gyazo.com/162ddf9d9947e58f860a4dd0f47c6175.png)

ちゃんと Nuxt アプリであることも検出されています。

![detecting Nuxt](https://i.gyazo.com/bcf83326d15dc93a1e7c3f4bc2567cf0.png)

デプロイしたサイトです。

[https://kondoumh-scrapbox-graph-nuxt.netlify.app/](https://kondoumh-scrapbox-graph-nuxt.netlify.app/)

## 最後に
Vue3 から Nuxt3 に簡単なアプリを移植することで Nuxt3 の利点がちょっと理解できた気がします。世間的には React / Next.js がデファクトスタンダードになっていますが、既存の Vue / Nuxt のコードベースがある場合、移行先としてはやはり有力候補になるのではないでしょうか。
