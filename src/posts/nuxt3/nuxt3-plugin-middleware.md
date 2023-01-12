---
title: Nuxt3入門(第7回) - Nuxt3のプラグイン・ミドルウェアを使う
author: noboru-kudo
date: 2022-10-23
templateEngineOverride: md
tags: [SSG, SSR]
prevPage: ./src/posts/nuxt3/nuxt3-error-handling.md
nextPage: ./src/posts/nuxt3/nuxt3-state-management.md
---

[前回](/nuxt/nuxt3-error-handling/)はNuxt3のエラーハンドリングについて見てきました。

今回はプラグインとミドルウェアを見ていきます。
両方とも必須という訳ではありませんが、うまく使えばアプリケーション開発を効率化できます。

プラグインはNuxtアプリケーション初期化時に実行してくれるもので、アプリケーション全体で利用するものはここでまとめて定義しておきます。

- [Nuxt3ドキュメント - Plugin Directory](https://nuxt.com/docs/guide/directory-structure/plugins)

ミドルウェアはページルーティング時に実行され、不正な遷移防止や条件によって遷移先を切り替える場合等で使用します。

- [Nuxt3ドキュメント - Middleware Directory](https://nuxt.com/docs/guide/directory-structure/middleware)

プラグイン、ミドルウェアともにNuxt2からあるものですが、Nuxt3では若干使い方が変わっています。


## プラグイン

前述のとおり、プラグインはNuxtアプリケーションの初期化時に実行されます。デフォルトではサーバーサイド、クライアントサイド双方で実行されます。
Nuxt3でプラグインを作成する場合は、`plugins`ディレクトリに配置するだけです。Nuxt2ではこれに加えて`nuxt.config.ts`に利用するプラグインを記述していましたが、Nuxt3では不要です。

:::column:プラグインの実行順序を制御する
`plugins`ディレクトリ配下のプラグインは全て実行対象です[^1]。
複数プラグインの場合は、アルファベット順に実行されます。プラグイン間で依存関係がある等、順序性を担保する必要がある場合は、ファイル名のプリフィックスとして数値をつける等工夫する必要があります。

[^1]: 再帰的にスキャンはされません。ネストした構造とする場合はサブディレクトリ直下に`index.ts`を配置してプラグインを再exportしておく必要があります。
:::

ここでは、Nuxtアプリケーションに対して、日本円のフォーマットを行うユーティリティメソッドを追加してみます。

- [Nuxt3ドキュメント - useNuxtApp - provide](https://nuxt.com/docs/api/composables/use-nuxt-app#provide-name-value)

プラグイン実装は以下のようなイメージとなります。

```typescript
export default defineNuxtPlugin(() => {
  return {
    provide: {
      yen(value: string){
        if (!value) return '';
        const number = Number(value);
        if (isNaN(number)) return '';
        return number.toLocaleString() + '円';
      }
    }
  }
});
```

Nuxt3では、defineNuxtPlugin内でプラグインを実装します。
戻り値は必須ではありませんが、ここではNuxtアプリケーションに対してyenメソッドを追加しています。

このファイルを`plugins`配下に配置して、Nuxtアプリケーションを実行するとVueコンポーネント内でユーティリティメソッドが利用できます。
具体的には以下のような形です。

```html
<script setup lang="ts">
const price = ref(1000);
// スクリプトで使用
const nuxtApp = useNuxtApp();
console.log(nuxtApp.$yen(price.value));
</script>

<template>
  <div>
    <input type="text" v-model="price" />
    <!-- テンプレートで使用 -->
    <p>{{ $yen(price) }}</p>
  </div>
</template>
```

上記のように全てのVueコンポーネントから、プラグインで追加したユーティリティが利用できます(メソッドには`$`プリフィックスがつきます)。
今度は同様のユーティリティを、Vueの[カスタムディレクティブ](https://vuejs.org/guide/reusability/custom-directives.html)で定義してみます。

プラグインのソースコードは以下のようになります。

```typescript
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive("yen", (el, { value }) => {
    if (!value) {
      el.textContent = "";
      return;
    }
    const number = Number(value);
    if (isNaN(number)) {
      el.textContent = "";
    } else {
      el.textContent = number.toLocaleString() + "円";
    }
  });
});
```

ここでは、引数としてNuxtのランタイムコンテキスト(nuxtApp)を受け取ります。
このNuxtAppに含まれるVueアプリケーションに対してカスタムディレクティブ(`yen`)を追加しました。

これはVueテンプレートから以下のように指定することで動作します。

```html
<script setup lang="ts">
const price = ref(1000);
</script>

<template>
  <div>
    <input type="text" v-model="price" />
    <!-- カスタムディレクティブ -->
    <p v-yen="price" />
  </div>
</template>
```

Vueのカスタムディレクティブは`v-`をプリフィックスとして指定します。上記では`v-yen`となります。

:::column:プラグインの実行環境を限定する
ここで紹介したプラグインはクライアント、サーバーサイド双方で実行する必要がありますが、作成するものによってはどちらかの環境でのみ実行したいものもあるかと思います。
このようなケースではNuxt2同様にファイル名で制御可能です。クライアントサイドは`<plugin>.client.ts`、サーバーサイドは`<plugin>.server.ts`とすれば実行環境を限定できます。
:::

## ミドルウェア

続いてはミドルウェアです。
前述の通り、ミドルウェアはページルーティングが発生する際に実行されます。これはサーバーサイド、クライアントサイドでも同様です。

以下はNuxtの[公式ドキュメント](https://nuxt.com/docs/guide/directory-structure/middleware#middleware-directory)の引用ですが、ミドルウェアは3つの方法で作成できます。

1. 匿名(インライン)ルートミドルウェア: ページコンポーネント内に埋め込み
2. 名前付きルートミドルウェア: `middleware`ディレクトリに作成し、実行したいページコンポーネントで実行対象のミドルウェアを指定
3. グローバルルートミドルウェア: 全てのルーティング時に実行される。`middleware`ディレクトリ内に`.global.ts`サフィックスでファイル作成。

ここでは2の名前付きルートミドルウェアを作成します。
管理者向けページ(`/admin`)を想定し、このページはクエリパラメータ(token)に特定の文字列(test)がなければ表示不可とします。
`middleware`ディレクトリ配下に以下のファイル(`auth.ts`)を配置します。

```typescript
export default defineNuxtRouteMiddleware((to, from) => {
  const { token } = to.query;
  if (!token) {
    return abortNavigation(
      createError({ statusCode: 403, message: '認証されていません' })
    );
  }
  if ((Array.isArray(token) ? token[0] : token) !== 'test') {
    return navigateTo("/");
  }
});
```

ミドルウェアはdefineNuxtRouteMiddleware内に記述します。ここでは以下のことを行っています。

- tokenパラメータがない場合は[abortNavigation](https://nuxt.com/docs/api/utils/abort-navigation)で403(Forbidden)エラーを返却(エラーページ表示)[^2]
- tokenパラメータの文字列が不正な場合は[navigateTo](https://nuxt.com/docs/api/utils/navigate-to)でトップページにリダイレクト

[^2]: 引数を省略した場合は404エラーとなります。

これを使う管理者向けページ(`pages/admin.vue`)は、以下のようになります。

```html
<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})
</script>

<template>
  <div>管理者ページ</div>
</template>
```

[definePageMeta](https://nuxt.com/docs/api/utils/define-page-meta) Composableで対象ミドルウェアを指定します(拡張子は省略)。
これでNuxtアプリケーションを実行するとクエリパラメータなしの`/admin`にアクセスするとエラーページ、`/admin?test=foo`であればトップページにリダイレクトされます。

:::column:Staticホスティングでのミドルウェアの挙動
Nuxt2では、Staticホスティング(`npm run generate`)の場合は、初期ロード時にクライアントサイドでミドルウェアが実行されない事象に悩まされた経験があるのですが、Nuxt3ではミドルウェアはgenerate時に加えて、初期ロード時もハイドレーション中に実行してくれるようです。

ただし、ハイドレーション前のgenerateで生成されたページは一瞬表示されますし、Devツール等を見ればHTMLコンテンツを見ることができます。
このような挙動が許容できない場合は、該当ページをgenerate対象から除外する等、別の方法を検討する必要があります。
:::

## まとめ

今回はNuxtアプリケーションを拡張するプラグインや、ルーティング時に個別処理を追加するミドルウェアをご紹介しました。
実用的なアプリケーションでは共によく使用される機能と思いますので、Nuxt3でも抑えておきたいところです。

上級編ではありますが、ビルドレベルでNuxtを拡張する方法としてNuxt Kitを使用したモジュールという方法もあります。

- [Nuxt3ドキュメント - Module Author Guide](https://nuxt.com/docs/guide/going-further/modules)
