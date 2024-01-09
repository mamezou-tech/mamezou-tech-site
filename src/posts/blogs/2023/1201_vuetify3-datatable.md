---
title: Vue 2 EOL 直前！ Vuetify 3のデータテーブルコンポーネントが正式リリース
author: masahiro-kondo
date: 2023-12-01
tags: [vuetify, vue, advent2023]
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2023/
image: true
---

これは[豆蔵デベロッパーサイトアドベントカレンダー2023](/events/advent-calendar/2023/)第1日目の記事です。

## はじめに
Vuetify は Vue ベースの UI コンポーネント集です。デザインセンスがない筆者でも楽に整った画面が作れるので、かなりお世話になっています。

[Vuetify — A Vue Component Framework](https://vuetifyjs.com/)

Vuetify 3が正式リリースされてから1年経ちますが、VDataIterator、VDataTable などのコンポーネントはずっと labs という実験的ライブラリとして提供されていました。Vuetify 2でこれらのコンポーネントを多用しているプロジェクトは移行が難しかったのではないでしょうか。11月にこれらのコンポーネントが含まれた待望の v3.4.0 がリリースされました。

[Release v3.4.0 · vuetifyjs/vuetify](https://github.com/vuetifyjs/vuetify/releases/tag/v3.4.0)

この記事では Vuetify 3のデータテーブルコンポーネントを見ていきます。

:::info
Vuetify 3.4.0には、Blackguard というマイルストーン名がついています。

3.0 Titan、3.1 Valkyrie、3.2 Orion、3.3 Icarus とギリシャ神話系のコードネームだったのですが、路線変更したのでしょうか。
:::

:::info
Vue 2 は今月31日に EOL を迎えます。
[Vue 2 LTS, EOL & Extended Support](https://v2.vuejs.org/lts/)

一方 Vuetify 2(2.7) は2025年1月23日が EOL になっています。
[Long-term support — Vuetify](https://vuetifyjs.com/en/introduction/long-term-support/)

もうしばらくは Vue 2.7 + Vuetify 2.7 で凌げるとは思いますが、移行はなるべく早く行ないたいところです。どうしてもアップグレードが難しい場合は、[Vue 2 NES(Never-Ending Support)](https://www.herodevs.com/support/nes-vue) などの選択肢もあるようです。
:::

## Data tables (VDataTable)

VDataTable は Vuetify 2から存在するデータテーブルコンポーネントです。

![テーブルコンポーネントの画面](https://i.gyazo.com/2bb2b939827598063d7f0c9d727e9d6f.png)

[Data table component — Vuetify](https://vuetifyjs.com/en/components/data-tables/basics/)

VDataTable の基本的な使い方は Vuetify 2版とあまり変わっていません。

```html
<template>
  <v-data-table
    :headers="headers"
    :items="desserts"
    :search="search"
  ></v-data-table>
</template>
```

```javascript
data: () => ({
  search: '',
  headers: [
    {
      align: 'start',
      key: 'name',
      sortable: false,
      title: 'Dessert (100g serving)',
    },
    { key: 'calories', title: 'Calories' },
    { key: 'fat', title: 'Fat (g)' },
    { key: 'carbs', title: 'Carbs (g)' },
    { key: 'protein', title: 'Protein (g)' },
    { key: 'iron', title: 'Iron (%)' },
  ],
  desserts: []
})
```

ヘッダー定義のプロパティが `text` から `title`、`value` から `key` に変わるなどしています。また Vuetify 2版と比べてかなり細かい指定が可能になっています。詳しくは API ドキュメントを参照してください。

[VDataTable API](https://vuetifyjs.com/en/api/v-data-table/)

:::info
Vuetify 2 の VDataTable では、列ごとの昇順・降順切り替えの可否を `:sort-desc="[true, false, true]"` のように配列で指定できましたが、このプロパティは廃止されたようです。
:::

## Server side tables (VDataTableServer)

Vuetify 2ではデータテーブルコンポーネントは VDataTable だけでした。Vuetify 3では新しく VDataTableServer が追加されました。VDataTableServer は REST API などのバックエンドから取得するデータを表示するのに適したコンポーネントです。このユースケースがほとんどでしょうから、今後はほぼ VDataTableServer を使うことになるのではないかと思います。

[Data table - Server side tables — Vuetify](https://vuetifyjs.com/en/components/data-tables/server-side-tables/)

`v-data-table-server` タグを指定します。基本的な API は VDataTable と同じです。ユーザーのテーブル操作(ページネーション、ソート順変更など)によりデータを再取得・再表示する必要がある場合、データ取得用メソッドを呼び出してくれます。

テンプレート側では、`@update:options` プロパティにデータ取得用メソッドを指定します。VDataTable で実装する場合、コード側で VDataTable の options オブジェクトに対する watcher を定義してメソッド呼び出しを書いていたのですが、プロパティで簡単に指定できるようになりました。

```html
<template>
  <v-data-table-server
    v-model:items-per-page="itemsPerPage"
    :headers="headers"
    :items-length="totalItems"
    :items="serverItems"
    :loading="loading"
    item-value="name"
    @update:options="loadItems"
  ></v-data-table-server>
</template>
```

コード側では `page`、`itemsPerPage`、`sortBy` などのプロパティを引数として受け取るメソッドを定義します。これら引数の値はコンポーネント側で設定してくれます。下記の例では `page` と `itemsPerPage` の値はそのまま、`sortBy` に関しては指定されていればその値、なければデフォルト値を設定して API 呼び出しに埋め込んでいます。

```javascript
data: () => ({
  itemsPerPage: 5,
  headers: [
    // ヘッダー定義
  ],
  serverItems: [],
  loading: false,
  totalItems: 0,
}),
methods: {
  async loadItems ({ page, itemsPerPage, sortBy }) {
    this.loading = true // ローディング表示
    const sortKey = sortBy.length ? sortBy[0].key : 'column1'
    const order = sortBy.length ? sortBy[0].order : 'asc'
    const data = await fetch(`${SOME_API_ENDPOINT}?page=${page}&size=${itemsPerPage}&sortby=${sortKey}&order=${order}`)
    this.serverItems = await data.items
    this.totalItems = await data.count
    this.loading = false // ローディング表示解除
  },
},
```

:::info
`loading` はデータ取得メソッド呼び出し中にテーブルにローディング状態を示すアニメーションを表示するプロパティです。
:::

## Virtual tables (VDataTableVirtual)

Vuetify 3では非常に大きなデータセットを表示するための VDataTableVirtual コンポーネントも追加されました。`items` プロパティに何万件という規模のデータセットを指定しても、仮想化により表示に必要な一部のみをレンダリングしてくれます。

[Data table - Virtual tables — Vuetify](https://vuetifyjs.com/en/components/data-tables/virtual-tables/)

`v-data-table-virtural` タグを指定するだけです。

```html
<template>
  <v-data-table-virtual
    :headers="headers"
    :items="largeNumberOfItems"
    height="400"
    item-value="name"
  ></v-data-table-virtual>
</template>
```

ソートとフィルタリングも可能です。

なかなか便利そうなコンポーネントではありますが、これがあるからといって大量のデータを使用する画面を乱造するのは控えた方がよいでしょう。ネットワークの帯域を食い潰してしまいます。

## 最後に
以上、Vuetify 3のデータテーブルコンポーネントの紹介でした。Vuetify 2に比べブラッシュアップされ種類も増えているので仕様を把握して使いたいですね。

筆者が作っている非公式 Scrapbox アプリでも昨年の7月に Vue 2 + Vuetify 2に移行していました。この時にデータテーブルコンポーネントも採用しました。

[Electron 製の非公式 Scrapbox アプリを式年遷宮した話](/blogs/2022/07/13/migrating-electron-app-to-new-archi/)

当時は Electron の更新への追従に気を取られるあまり Vue 2の EOL は意識していませんでした。Vuetify 3についても昨年7月時点ではまだベータ版(v3.0.0-beta.5 ぐらい)だったのです。そしてこの1年データテーブルコンポーネントを使っている画面は移行できずにいました。今回の Vuetify 3.4.0リリースにより、年末の Vue 2 EOL 直前で全ての画面を Vue 3 + Vuetify 3 に移行できました。これで安心して年を越せます。

UI コンポーネントの都合でアップデートが滞ってしまうのは技術選定上のリスクではありましたが、まあ、あるあるですね。
