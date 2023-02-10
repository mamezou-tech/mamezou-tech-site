---
title: Vue 3 と D3.js で作る可視化アプリ
author: masahiro-kondo
date: 2023-02-10
tags: [vue, d3]
---

筆者は Scrapbox を愛用していまして、ページ間のグラフ構造を可視化するためのツールを作っていました。

- [GitHub - mamezou-tech/sbgraph: Fetch Scrapbox project data and visualize activities.](https://github.com/mamezou-tech/sbgraph)

このツールは Graphviz の dot 形式ファイルを生成するので手軽にグラフ構造の可視化が可能です[^1]。

[^1]: ツールの概要は、[紹介記事](/oss-intro/sbgraph/)を参照してください。dot 形式のファイルだけでなく独自の JSON ファイルも出力でき、本記事のアプリでは JSON ファイルを使用しています。

D3.js を使うと Graphviz よりインタラクティブな可視化アプリを作れます。グラフ構造の可視化には、force simulation を使うと効果的です。

[Force-Directed Graph](https://observablehq.com/@d3/force-directed-graph)

かなり前に Vue 2 と D3.js を使って可視化のための SPA (Single Page Application) を試作して放置していました。
放置している間に Vue 3 がリリースされ、D3.js もかなりバージョンアップしてしまって同じコードベースでは動かなくなりました。そこで Vue 3 の学習も兼ねてシンプルな可視化アプリを作ってみることにしました。

## アプリの概要

アプリの画面イメージです。

![app screen](https://i.gyazo.com/e9d577e1fbf8e6494d903172459da7f8.png)

Scrapbox の各ページはゴールドのノード、ページの著者はシアンのノードとして表示しています[^2]。ページ間のリンクは、ページ情報から取得できる1hopリンクを利用しています。ページのノードをクリックすると該当ページを開きます。
ヘッダーの右端のセレクトボックスで対象のプロジェクトを切り替え可能です[^3]。可視化に使用するデータは、冒頭のツールを使って JSON ファイルを生成し Netlify に配置しています。

[^2]: 著者名はハッシュ値でアノニマイズしています。
[^3]: このアプリでは help-jp、commic-forum、icons の各プロジェクトのデータを Scrapbox API で取得し使わせていただいています。

アプリは GitHub Pages にデプロイしましたので force simulation の UI を触っていただければと思います。

[https://kondoumh.github.io/scrapbox-graph/](https://kondoumh.github.io/scrapbox-graph/)

:::info
GitHub Pages へのデプロイにはカスタムワークフロー(ベータ版)を使いました。詳細は以下の記事で紹介しています。

[カスタムワークフローで GitHub Pages デプロイが可能に](/blogs/2022/09/08/github-pages-new-deploy-method/)
:::

アプリのコードは、以下のリポジトリに置いています。

[GitHub - kondoumh/scrapbox-graph](https://github.com/kondoumh/scrapbox-graph)

## プロジェクト作成

以下アプリの作成手順を記していきます。

まず Vue 3 + Vite のテンプレートでプロジェクトを作成しました[^4]。

```shell
npm init vite@latest scrapbox-graph -- --template vue
```

[^4]: Vite はビルドが高速で開発体験がよくなるため、他のフレームワークでも採用が進んでいますね。

## ヘッダーコンポーネントの作成
ヘッダーにアプリタイトルとプロジェクト選択のためのセレクトボックスを配置します。

- components/Header.vue

```html
<template>
  <header>
    <h2>Scrapbox graph</h2>
    <select v-model="project" @change="onChange">
      <option>help-jp</option>
      <option>comic-forum</option>
      <option>icons</option>
    </select>
  </header>
</template>

<script setup>
  import { defineEmits, ref } from 'vue';
  const project = ref('help-jp');
  const emit = defineEmits(['projectChanged']); // emit 作成
  const onChange = () => {
    emit('projectChanged', project.value); // emit 実行
  }
</script>

<style scoped>
header {
  position: fixed;
  top: 0px;
  left: 0px;
  right: 0px;
  height: 50px;
}

h2 {
  margin: 0;
  margin-left: 1em;
  text-align: left;
}

select {
  position: fixed;
  top: 0px;
  right: 0px;
  margin: 1em;
}
</style>
```

セレクトボックスの選択状態が変化すると、バインドしている `project` の値を emit して親コンポーネントに伝搬させるようにしました。Vue 3 では、`defineEmits` API で emit するイベントを定義できます。

## グラフコンポーネント
可視化のためのグラフコンポーネントの実装(抜粋)です。D3.js は SVG で可視化要素をレンダリングします。

- components/Graph.vue

```html
<template>
  <svg id="svg" />
</template>

<script setup>
  import { computed, ref, onMounted, watch } from 'vue';
  import * as d3 from 'd3'

  const graphData = ref([]); // グラフデータを ref で保持
  const width = ref(0); // svg の幅
  const height = ref(0); // svg の高さ

  // プロジェクト名を props で保持
  const props = defineProps({
    project: String,
  });

  // ページと著者のノードを computed で作成
  const nodes = computed(() => {
    let nodes = graphData.value.pages
      .map(page => ({
        id: page.id,
        title: page.title,
        x: width.value * Math.random(),
        y: height.value * Math.random(),
        rx: byteLength(page.title) * 2,
        ry: 10,
        user: false
      }));
    return nodes;
  });

  // エッジ(リンク)を computed で作成
  const edges = computed(() => {
    const ids = new Set(nodes.value.map(node => node.id));
    const idm = new Map();
    nodes.value.forEach((node, index) => idm[node.id] = index);
    let edges = graphData.value.links
      .filter(edge => ids.has(edge.from) && ids.has(edge.to))
      .map(edge => ({
        source: idm[edge.from],
        target: idm[edge.to],
        l: Math.random() * 150
      }));
    return edges;
  });

  // onMounted で svg サイズを取得、データフェッチ、レンダリング
  onMounted(async () => {
    width.value = document.querySelector('svg').clientWidth;
    height.value = document.querySelector('svg').clientHeight;
    await fetchData();
    await render();
  });

  // プロジェクトの変更を検知して、データフェッチ、レンダリング
  watch(() => props.project, async () => {
    await fetchData();
    await render();
  });

  const fetchData = async () => {
    const res = await fetch(/* data url */ );
    graphData.value = await res.json();
  };

  const render = async () => {
    // Zoom 関連の設定
    const zoom = d3.zoom()
      .scaleExtent([1/3, 40])
      .on('zoom', (e, d) => {
        link.attr('transform', e.transform);
        nodeGroup.attr('transform', e.transform);
      });

    d3.select('svg')
      .attr('viewBox', '0 0 1200 1400')
      .attr("preserveAspectRatio", "xMidYMid meet")
      .call(zoom);

    // 最初にリンクをレンダリング
    const link = d3.select('svg')
      .selectAll('line')
      .data(edges.value)
      .enter()
      .append('line')
      .attr('stroke-width', 1)
      .attr('stroke', 'LightGray');

    // ノードの楕円(Ellipse)とテキストをグループとして扱うためのノードグループ
    const nodeGroup = d3.select('svg')
      .selectAll('g')
      .data(nodes.value)
      .enter()
      .append('g')
      // ドラッグ＆ドロップの実装
      .call(d3.drag()
        .on('start', (e, d) => {
          if (!e.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (e, d) => {
          d.fx = e.x;
          d.fy = e.y;
        })
        .on('end', (e, d) => {
          if (!e.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }))
      // ノードクリック時にページを開く
      .on('click', (e, d) => {
        if (d.user) return;
        const page = encodeURIComponent(d.title);
        const url = `/* ページの URL を組み立て*/`;
        window.open(url);        
      });

    // ノードグループに楕円を追加(リンクよりZ軸が手前に)
    nodeGroup.append('ellipse')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('rx', d => d.rx)
      .attr('ry', d => d.ry)
      .attr('fill', d => d.user ? 'Cyan' : 'Gold');

    // ノードグループにテキストを追加(楕円よりZ軸が手前に)
    nodeGroup.append('text')
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('fill', 'steelbule')
      .style('font-size', '11px')
      .text(d => d.title);

    // 以下 force simulation の設定が続く
  };
</script>

<style scoped>
  svg {
    position: fixed;
    top: 50px;
    left: 0;
    height: 100%;
    width: 100%
  }
</style>
```

D3.js の API の説明はしませんが、コメントと合わせて読んでいただくと雰囲気は掴めると思います。graphData や SVG のサイズは ref でリアクティブにしています。対象のプロジェクト名は、`defineProps` API で props に保持しています。ノードとエッジは、graphData が更新されるたびに JSON から再構築するため computed で更新されるようにしています。データのフェッチとレンダリングは、ライフサイクルメソッドの `onMounted` とプロジェクト名の `watch` による変更検知時に実行しています。

## アプリコンポーネント
最後にアプリコンポーネントです。ヘッダーコンポーネントとグラフコンポーネントを描画します。

- App.vue

```javascript
<template>
  <div>
    <Header
      @projectChanged="switchProject"
     />
    <Graph v-bind:project="project"/>
  </div>
</template>

<script setup>
  import { ref } from 'vue';
  import Header from './components/Header.vue';
  import Graph from './components/Graph.vue';
  const project = ref('help-jp');

  const switchProject = value => {
    project.value = value;
  }
</script>

<style scoped>
</style>
```

ヘッダーコンポーネントのセレクトボックスの変更時に emit されるイベントを `@projectChanged` で受けてグラフコンポーネントに伝播させています。

## 最後に
以上、Vue 3 と D3.js の force simulation を使った可視化システムの実装例でした。

D3.js の API が独特なので Vue と混ぜるのはいまいちな気もしますが、SVG をレンダリングする以上のことをやってくれるので、やはり有力な可視化ライブラリの候補だと思います。ノードの数が増えると描画が重くなるので、データの間引きが重要になります。大量のノードを表示したい場合は WebGL など別の方式も検討した方がよいかもしれません。

Vue 3 の Composition API は初体験でしたが、Options API に比べて簡潔に書けるようになっており、モジュール分割も楽そうです(今回はベタッと書いちゃいましたが)。

このアプリではデータのフェッチとレンダリングをクライアントで実行しています。SSR で最初の描画をサーバーサイドにオフロードし force simulation の動作をハイドレートするという今風の作りにできないか試してみたいと思っています。
