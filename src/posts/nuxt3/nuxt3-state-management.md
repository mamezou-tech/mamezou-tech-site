---
title: Nuxt3入門(第8回) - Nuxt3のuseStateでコンポーネント間で状態を共有する 
author: noboru-kudo
date: 2022-10-28
templateEngineOverride: md
tags: [SSG, SSR]
prevPage: ./src/posts/nuxt3/nuxt3-plugin-middleware.md
---

[前回](/nuxt/nuxt3-plugin-middleware/)はNuxt3でプラグイン、ミドルウェアの導入について見てきました。

今回はNuxt3が提供する状態管理について見ていきます。

Nuxt2では、コンポーネント間で状態を共有するには、Nuxt2にバンドルされている[Vuex](https://vuex.vuejs.org/)を使うのが一般的でした。

Nuxt3ではVuexはNuxt本体に含まれていません。
代わりにNuxt3では新たに[useState](https://v3.nuxtjs.org/api/composables/use-state) Composableが提供されるようになりました[^1]。
useStateはVuex程の機能はありませんが、必要最低限のシンプルな設計で使いやすいものとなっています。
比較的シンプルなデータ構造であったり、中小規模のアプリケーションでは十分に実用的なものとなっています。

[^1]: Reactにも同名のフックがありますが、これとは全く別物です。

:::info
それなりの規模のアプリケーションでは、現時点では[Pinia](https://pinia.vuejs.org/)の利用を検討すると良いかと思います。
こちらはNuxtモジュールとして提供されています。
useStateとPiniaとの比較は以下記事に詳細が載っていますので、興味のある方はご参照ください。

- [Nuxt 3 State Management: Pinia vs useState](https://www.vuemastery.com/blog/nuxt-3-state-mangement-pinia-vs-usestate/)
:::

[[TOC]]

## ref/reactiveの欠点

Vue3には[ref](https://vuejs.org/api/reactivity-core.html#ref)や[reactive](https://vuejs.org/api/reactivity-core.html#reactive)という状態管理用のAPIが備わっていますが、これらは一般的にコンポーネント内で使用するものです。
[NuxtLink](https://v3.nuxtjs.org/api/components/nuxt-link)等で他のページに切り替えた場合は、コンポーネントはアンマウントされますので、状態は保持されません。
また、状態をサブコンポーネントで利用する場合は、通常はpropsを通じて渡してあげます。サブコンポーネントで状態を更新する場合は、イベントを発火して、データを主管する親コンポーネントでデータ更新をします。
コンポーネント構造がシンプルな場合はこれで問題ありませんが、コンポーネントツリーが3階層、4階層と深くなってくると冗長で面倒な作業になります(よくバケツリレーと言われています)。

これを回避するために、refやreactiveをコンポーネント外のグローバルな領域に持たせようとすると、Nuxt等のSSRフレームワークでは問題が生じます。
サーバーサイド側のアプリケーションは、1つのインスタンスで複数ユーザーのリクエストを受付けます。
このためグローバルな領域で状態管理をしようとすると、その情報は全てのユーザーで共有されてしまいます(Cross-Request State Pollution)。
データの内容にもよりますが、ユーザー固有の情報であれば情報漏洩となるでしょう。

また、NuxtのSSRでは、初期ロード時はサーバーサイドに加えて、クライアントサイドでも同じようにVueコンポーネントが初期化されます（ハイドレーション）。
例えば、以下のようなコンポーネントです。

```html
<script lang="ts" setup>
const result = ref<number>(heavyCompute());
function heavyCompute() {
  console.log('execute heavy calculation');
  // (重い初期化処理)
  return 1;
}
</script>
```

このページを表示すると、heavyComputeメソッドはサーバーサイド、クライアンサイド双方で実行されます。

![ref/reactive init](https://i.gyazo.com/485f02505b5f9e6dc9e9aa603c6221ee.png)

固定値等の軽量な初期化処理は問題ありませんが、そうでない場合は効率的とは言えません。サーバーサイドで実行した結果を、クライアンサイドのハイドレーションでもそのまま利用する方が理想的です。

## useStateの概要

ここからuseStateを使ってみます。まずuseStateのインターフェースを確認します。
以下のようになっています。

```typescript
export declare function useState<T>(key?: string, init?: (() => T | Ref<T>)): Ref<T>;
export declare function useState<T>(init?: (() => T | Ref<T>)): Ref<T>;
```

useStateは状態の作成と取得の両方を兼ねています。キー(key)と初期化処理(init)をもとに、現在の状態を返します。

keyを省略した場合は、ランダムな値が採番されます。コンポーネント内でのみ使用する状態で利用できます。
initは状態が初期化されてない場合のみ実行されます。これはサーバーサイドで実行済みの場合も含まれます。
つまり、サーバーサイドでinitが実行されている場合は、クライアンサイドではinitは実行されません。

![useState init](https://i.gyazo.com/2a5ac32818c2757f65924017802d3500.png)

このように、先程のref/reactiveと比べてuseStateはSSRフレンドリーなAPIと言えます。

## useStateを使ってみる

では、useStateを使ってみましょう。
ここではログインユーザー情報を複数コンポーネントで使えるよう、useStateでグローバルに状態変数を定義してみます。

まず、最初のページ(`pages/user.vue`)は以下のようにしました。

```html
<script lang="ts" setup>
const user = useState<{ id: string, name: string, mail: string }>('login-user', () => {
  console.log('retrieving user info...')
  return {
    id: '012345',
    name: 'mamezou',
    mail: 'nuxt-developer@mamezou.com'
  };
})
</script>

<template>
  <div>
    <h1>useState実装例</h1>
    <NuxtLink to="/user-detail">{{ user.name }}さんの詳細ページへ</NuxtLink>
  </div>
</template>
```

setupの最初で、useStateを使ってユーザー情報を初期化しています。ここでは固定値ですが、実運用では外部の認証システム等から取得することを想定しています。
テンプレートではNuxtLinkを使ってユーザー詳細ページ(`pages/user-detail.vue`)に遷移するようにしています。
ユーザー詳細ページは以下のようにしました。

```html
<script lang="ts" setup>
const user = useState('login-user')
</script>

<template>
  <div>
    <p>ユーザーID: {{ user.id }}</p>
    <p>ユーザー名: {{ user.name }}</p>
    <p>メールアドレス: {{ user.mail }}</p>
  </div>
</template>
```

先程useStateで指定したものと同じキーで取得し、ユーザー情報を表示しています。

これでNuxtアプリケーションをビルド・実行し、ブラウザから`/user`を表示し、ページリンクから詳細ページを表示します。

- /user
![user page](https://i.gyazo.com/abf0fe6da3b8e47bb71eaa1adf10dc3a.png)
- /user-detail
![user detail](https://i.gyazo.com/c8c71a8f822c74719de7eee5ca803c6b.png)

ユーザーページで初期化されたユーザー情報は、ページを跨って詳細ページでも表示されていることが分かります。
サーバーサイドのコンソール上にはユーザー情報を取得するログ(`retrieving...`)が出力されますが、クライアンサイドでは出力されません。 
つまり、init処理はサーバーサイドで1回のみ実行されています。

サーバーサイドでレンダリングされたHTMLを確認すると、以下のようになっていました（フォーマットして必要な部分のみ抜粋）。
```html
<!DOCTYPE html>
<html data-head-attrs="">
<head>
  <!-- 省略 -->
</head>
<body data-head-attrs="">
<div id="__nuxt">
  <div data-v-433a9abd>
    <!-- 省略 -->
  </div>
</div>
<script>window.__NUXT__ = {
  data: {},
  // サーバーサイドで初期化された状態
  state: {"$slogin-user": {id: "012345", name: "mamezou", mail: "nuxt-developer@mamezou.com"}},
  _errors: {},
  serverRendered: true,
  config: {
    app: {baseURL: "\u002F", buildAssetsDir: "\u002F_nuxt\u002F", cdnURL: ""}
  }
}</script>
<script type="module" src="/_nuxt/@vite/client" crossorigin></script>
<script type="module"
        src="/_nuxt/sample-app/node_modules/nuxt/dist/app/entry.mjs"
        crossorigin></script>
</body>
</html>
```

scriptタグ内に、stateとしてサーバーサイドで初期化された情報が格納されていることが分かります。
クライアンサイドのハイドレーションではこれを初期値として利用し、初期化処理(init)をスキップしているようです[^2]。
このようにstateの内容はレンダリング結果に含まれていますので、シリアライズ可能な型にする必要があります(classやfunctionは不可)。

[^2]: Nuxt内部のuseStateの実装としては、ランタイムコンテキスト(NuxtApp)のpayload内でこの状態を管理しているようです。

## グローバルな状態をComposableで一元管理する

先程のuseStateでは以下の問題があります。

- 初期化処理(init)を省略しているユーザー詳細ページ(`/user-details`)を直接表示すると、サーバーサイドレンダリングでエラーが発生する。
- 各ページで指定するキー(key)が単純な文字列なのでタイポしやすい
- 複数の状態を利用する場合、useStateがあちこちに散らばり、共有している状態管理変数を概観できない

[公式ドキュメント](https://v3.nuxtjs.org/getting-started/state-management#shared-state)でも言及されていますが、VueのComposition APIを使用して、Vuexのstoreように状態管理を一元管理すると良さそうです。

`composables/states.ts`を作成し、先程のuseStateを移植するだけです。

```typescript
export const useLoginUser = () =>
  useState<{ id: string; name: string; mail: string }>("login-user", () => {
    console.log("retrieving user info...");
    return {
      id: "012345",
      name: "mamezou",
      mail: "nuxt-developer@mamezou.com",
    };
  });
```

複数の状態を作成する場合は、`use...`を追加していけばいいです。こうすることでVuexのようにグローバルな状態をここで一元管理できます。

後は`pages/user.vue`/`pages/user-detail.vue`双方のuseStateを上記に置き換えるだけです。
`pages/user-detail.vue`では、以下のようになります。

```html
<script lang="ts" setup>
// const user = useState('login-user')
// 以下に置き換え
const user = useLoginUser();
</script>
<template>
  <!-- (変更なし。省略) -->
</template>
```

こうすることで、利用側でkeyの値を気にする必要はありませんし、直接詳細ページを表示しても初期化処理が実行されて正常にHTMLが生成されます[^3]。

[^3]: Staticホスティング(`npm run generate`)の場合は、ビルド時に初期化処理が実行されますので、データの鮮度に注意が必要です。

## まとめ

今回はNuxt3のuseStateを使って状態を共有する方法をご紹介しました。
Vuex等を使うよりもかなり簡単に使えることが実感できたかと思います。