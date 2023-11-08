---
title: Piniaを使ってNuxtアプリの状態を共有をする
author: noboru-kudo
date: 2023-11-05
tags: [pinia, nuxt, vue]
---

全てのアプリケーションに当てはまるものではありませんが、規模の大きなアプリケーションではどこからでもアクセスできる中央集権的なストアがほしくなってきます。
今回はNuxtを使って、Vueの状態管理ライブラリとして推奨されている[Pinia](https://pinia.vuejs.org/)の使い方を簡単に紹介したいと思います。

## なぜPinia？

[Vue](https://vuejs.org/)の状態管理ライブラリと言えば、長らく[Vuex](https://vuex.vuejs.org/)でしたが現在は違います。
Vuexの公式ドキュメントのトップには以下のように書かれています。

> Pinia is now the new default
> The official state management library for Vue has changed to Pinia. Pinia has almost the exact same or enhanced API as Vuex 5, described in Vuex 5 RFC. You could simply consider Pinia as Vuex 5 with a different name. Pinia also works with Vue 2.x as well.

このように、現在VueではPiniaが推奨されています。PiniaはVuexのv5と同義の位置付けになっています。
一方でPiniaの[ドキュメント](https://pinia.vuejs.org/introduction.html#Comparison-with-Vuex)を読むと、以下のように書かれています。

> Pinia started out as an exploration of what the next iteration of Vuex could look like, incorporating many ideas from core team discussions for Vuex 5. Eventually, we realized that Pinia already implements most of what we wanted in Vuex 5, and decided to make it the new recommendation instead.

つまり、当初はVuex v5の仕様を探求するためにPiniaを作ったけど、気づいたらPiniaに全て実装されていたのでこちらを推奨にしたとのことです。

## Piniaをセットアップする

NuxtではPinia用のNuxtモジュールが用意されています。

- [Pinia Doc - Nuxt.js](https://pinia.vuejs.org/ssr/nuxt.html)

まずはPiniaとNuxtモジュールの@pinia/nuxtをインストールします。

```shell
npm install pinia @pinia/nuxt
```

あとは`nuxt.config.ts`にNuxtモジュールをセットアップします。

```typescript
export default defineNuxtConfig({
  devtools: {
    enabled: true
  },
  modules: [
    '@pinia/nuxt' // Nuxtモジュールのセットアップ
  ],
})
```

これでセットアップコード不要で、Piniaが利用できるようになります。

## Piniaのストアを作成する

PiniaはVuexと似ていますが、もっとシンプルになっています。
最も大きな違いは、VuexのMutationがなくなり、状態を直接変更できるようになっています。
コンポーネントからの実際の使い方は後述しますが、今までActionやMutationをdispatchやcommitといったメソッドで呼び分けていましたが、そのような手順は不要になりました。

Piniaのストアには２種類あります。

- [Option Stores](https://pinia.vuejs.org/core-concepts/#Option-Stores)
- [Setup Stores](https://pinia.vuejs.org/core-concepts/#Setup-Stores)

名前からピンとくる方が多いと思いますが、両者はVue本体のOption APIとComposition API(setup)と同じような関係です。
Option Storesはstate/getters/actionsフィールドを持つオブジェクトです。

| Option Stores(Pinia) | 説明                            | 類似するOption API(Vue) |
|----------------------|-------------------------------|---------------------|
| state                | ストアで中央管理する状態                  | data                |
| getters              | 状態を加工したものを返すメソッド(キャッシュあり)     | computed            |
| actions              | データ更新等副作用のある処理を実行するメソッド(非同期可) | methods             |

Option APIの経験者であれば説明は要らないですね。

一方で、Setup Storesはオブジェクトではなく関数です。前述のOption Storeのフィールドは、それぞれ以下のように置き換えられれます。

| Option Stores | 対応するSetup Storesの関数 |
|---------------|---------------------|
| state         | ref()               |
| getters       | computed()          |
| actions       | 通常の関数               |

関数内にこれらを使ってストアを定義し、戻り値としてPiniaに与えることでOption Storesと同じ機能を提供します。
このようにSetup Storesは、Composition APIでsetupメソッドやscript setupを使った書き方と類似しています。

どちらのスタイルを使うかですが、個人的にはVueコンポーネントの記述スタイル(Option API/Composition API)に合わせるのがいいんじゃないかと思います。
とはいえ、従来のVuexから移行するのであれば書き方が似ているOption Storesを採用した方がスムーズに進められるかもしれません[^1]。

[^1]: Piniaの[ドキュメント](https://pinia.vuejs.org/core-concepts/#What-syntax-should-I-pick-)では、よく分からない場合はOption Storesをお勧めしています。

ここでは、ブログ記事一覧のストアを題材例として両スタイルで実装してみます。

### Option Stores

```typescript
export const useArticlesStore = defineStore('articles', {
  state: () => ({
    articles: [] as Article[],
    username: ''
  }),
  getters: {
    authorNames: (state) => {
      return state.articles.map(article => article.author.name);
    },
    // 引数ありGetter(関数を返す。このままだとキャッシュは効かない)
    contentLength: (state) => {
      return (id: number) => state.articles.find(article => article.id === id)?.content.length ?? 0;
    }
  },
  actions: {
    async load() {
      this.articles = await $fetch('/api/articles');
    },
    async save(article: Omit<Article, 'id'>) {
      await $fetch('/api/articles', { method: 'post', body: article });
      await this.load();
    },
    async update(article: Article) {
      await $fetch('/api/articles', { method: 'put', body: article });
      await this.load();
    }
  }
});
```

既存のVuexと似ていますが、前述の通りPiniaにはMutationがありません。
また、StateやAction等へのアクセスには、VueのOption APIのように`this`が使えます。Vuex時代のcommitやdispatchは不要です。
とてもシンプルで直感的になりましたね。

:::column:PiniaにおけるNamespace
PiniaではNamespaceという言葉は存在しませんが、類似の概念としてストアの識別子(id)があります。
これはストア定義で使っているdefineStoreの第1引数(この例では`articles`)が該当します。
この識別子は必須項目です。つまりPiniaでは実質的にNamespaceがビルトインされているものとなっています。

また、Vuexのツリー状のモジュール構成と異なり、Piniaはこの識別子をフラットな構造で管理しています。
この辺りはVuexからの移行で混乱する部分かもしれません。以下公式ドキュメントを事前に読んでおくと移行がスムーズになると思います。

- [Pinia Doc - Migrating from Vuex ≤4](https://pinia.vuejs.org/cookbook/migration-vuex.html)
:::

### Setup Stores
```typescript
export const useArticlesStore = defineStore('articles', () => {
  // State
  const articles = ref<Article[]>([]);
  const username = ref('')
  
  // Getters
  const authorNames = computed(() => {
    const names = articles.value.map(article => article.author.name);
    return Array.from(new Set(names));
  });
  // 引数ありGetter(キャッシュは効かないのに注意)
  const contentLength = computed(() =>
    (id: number) => articles.value.find(article => article.id === id)?.content.length ?? 0);

  // Actions
  async function load() {
    articles.value = await $fetch('/api/articles');
  }

  async function save(article: Omit<Article, 'id'>) {
    await $fetch('/api/articles', { method: 'post', body: article });
    await load();
  }

  async function update(article: Article) {
    await $fetch('/api/articles', { method: 'put', body: article });
    await load();
  }

  return { articles, username, fetch, authorNames, contentLength, load, save, update };
});
```

Setup Storesの方は従来のVuexとの書き方とは全く異なりますが、Composition APIに慣れた方であればこちらの方がむしろ実装しやすいと思います。
前述の通り、オブジェクトではなく関数スタイルに変わり、Option Storeの各フィールドがref() / computed() / function に置き換えられています。

## コンポーネントからPiniaのストアを使う

次は、このストアをコンポーネントから使います。
ここでは、VueコンポーネントはComposition APIで記述するものとします。

まずはコンポーネントからストアを使います。

```typescript
const store = useArticlesStore();
```

PiniaでもComposableを使う場合のように、関数名は`use<Name>Store`とするのが一般的です。

Piniaの状態(state)を取得する場合は、ストアから直接アクセスできます。

```typescript
// state
console.log(store.articles[0]);
console.log(store.username);
// getters
console.log(store.authorNames);
console.log(store.contentLength(1))
```

更新の場合も、VuexのようにMutationを使わずに状態(state)を直接変更できます。

```typescript
store.articles[0].title = 'Getting start with Pinia';
```

注意点として、PiniaのストアはVueのreactive関数でラップされています(propsと同じ)。
このため分割代入で取り出す場合は、[storeToRefs関数](https://pinia.vuejs.org/api/modules/pinia.html#storeToRefs)を実行しなければ、ストアの変更に対してリアクティブとなりません。

```typescript
// NG: リアクティブにならない
const { username } = store;
// OK
const { username } = storeToRefs(store);
```

複数の状態を同時に更新する$patchメソッドも用意されています。

```typescript
// 一括更新
// オブジェクトスタイル
store.$patch({
  articles: store.articles.splice(0, 1),
  username: '豆蔵太郎'
});
// コールバック関数スタイル
store.$patch((state) => {
  state.articles.push({
    ...state.articles[0],
    id: state.articles[0].id + 1
  })
  state.username = '豆蔵花子'
});
```

単純なものであればオブジェクトスタイル、複雑なものであればコールバック関数スタイルを選択します。
$patchメソッドの詳細は公式ドキュメントを参照してください。

- [Pinia Doc - Mutating the state](https://pinia.vuejs.org/core-concepts/state.html#Mutating-the-state)

ストアに定義したActionの実行も通常のメソッド呼び出しと同じです。VuexのようにmapActionsやdispatchメソッドは不要です。

```typescript
const article = {...}
await store.load();
await store.save(article);
await store.update(article);
```

素のVuexを使っていた時代とは比べものにならないほどシンプルになりました。

## まとめ

VueのデファクトスタンダードになったPiniaを使った状態管理について簡単な機能をご紹介しました。
PiniaはVuexと比較してとても簡単に使えることが実感できたと思います。

とはいえ、Nuxt3のuseStateを使っても類似のことができます。
シンプルなアプリケーションであれば、実際にこれで十分なケースも多いのだろうと思います。

- [Nuxt Doc - State Management](https://nuxt.com/docs/getting-started/state-management)

とはいえ、Pinia導入の敷居はとても低く感じます。使い所を見極め、Piniaにメリットがあれば積極的に使っていきたいものです。
