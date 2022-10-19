---
title: Nuxt3入門(第6回) - アプリケーションで発生するエラーに対応する
author: noboru-kudo
date: 2022-10-19
templateEngineOverride: md
tags: [SSG, SSR]
prevPage: ./src/posts/nuxt3/nuxt3-app-configuration.md
---

[前回](/nuxt/nuxt3-app-configuration/)はNuxt3の設定情報管理について見てきました。

今回のテーマは実用的なアプリケーションに不可欠なエラーハンドリングです。
Nuxtはクライアントサイドだけでなく、サーバーサイドレンダリングもサポートするハイブリッドフレームワークです。
このため、エラー発生箇所に対応した適切なハンドリングが求められます。

- [Nuxt3ドキュメント - Error handling](https://v3.nuxtjs.org/getting-started/error-handling)

[[TOC]]

## Vueコンポーネントのエラー

Vueコンポーネントのレンダリングやライフサイクルメソッド、setup等、エラーが発生する場所は多くあります。
機能固有のエラーハンドリングはtry/catchやPromiseを用いることになりますが、Vue/Nuxtがフレームワークとして提供している仕組みについて見ていきます。

### onErrorCaptured

Nuxtではありませんが、Vueでは[onErrorCaptured](https://vuejs.org/api/composition-api-lifecycle.html#onerrorcaptured) イベントフックを提供しています。
これはサブコンポーネントで捕捉されないエラーが発生した時に呼び出されるフックです[^1]。

[^1]: onErrorCapturedは、ネストされたサブコンポーネントが対象で、自コンポーネント内でのエラー発生時には呼ばれない点に注意が必要です。

例としてサブコンポーネントのmountedでエラーが発生したとします。
ページコンポーネントのソースコードは以下のようになります。

```html
<script setup lang="ts">
const message = ref('');

onErrorCaptured((err) => {
  console.log('onErrorCaptured', err);
  message.value = err.message;
})
</script>

<template>
  <div>
    <p>{{ message }}</p>
    <FlakyComponent />
  </div>
</template>
```

エラーが発生するサブコンポーネント(FlakyComponent)は以下です。

```html
<script setup lang="ts">
onMounted(() => {
  throw createError('FlakyComponentでエラーが発生しました！');
})
</script>
<template>
  <div>サブコンポーネント</div>
</template>
```

サブコンポーネントの方で使用している[createError](https://v3.nuxtjs.org/api/utils/create-error)はNuxt3が提供するエラーオブジェクト作成のユーティリティです。

これを実行するとサブコンポーネントのmountedでエラーが発生します。
このエラーはonErrorCapturedフックで捕捉され、エラーメッセージが表示されるようになります。

![onErrorCaptured](https://i.gyazo.com/141a82bac19258a27ad72966106f24b7.png)

なお、onErrorCapturedに指定したコールバック関数は何も返却していませんので、上位のイベントフックがある場合はそれらも実行されます。
コールバック関数でfalseを返却すると上位エラーハンドリングの伝播を止めることができます。

ここでエラーを発生させたmountedはクライアントサイドでのみ実行されるVueのライフサイクルイベントです。
サーバーサイドでも実行されるsetupでエラーが発生するとどうなるでしょうか？

サブコンポーネント(FlakyComponent)は以下のようになります。
```html
<script setup lang="ts">
throw createError('FlakyComponentでエラーが発生しました！');
</script>
<template>
  <div>サブコンポーネント</div>
</template>
```

これを実行すると以下のようになります。

![ssr error](https://i.gyazo.com/3980e5ff713788b0c42be7462c1b882d.png)

Nuxt3のデフォルトのメッセージの表示ではなく、エラーページに遷移してしまいました。
ここではサーバーサイドでonErrorCapturedのコールバック関数は実行されます。とはいえ、Nuxtはサーバーサイドレンダリングでエラーが発生するとクリティカルエラーと判断し、専用のエラーページを返す仕様となっています(500エラー)[^2]。

[^2]: プリレンダリングの場合はgenerate処理でエラーが発生し、HTMLページが生成されなくなります。

このようにサーバーサイドの実行で未捕捉のエラーが発生した場合は、onErrorCapturedを使っても意図しない結果を招く場合がありますので注意が必要です[^3]。

[^3]: onErrorCapturedのコールバック関数の戻り値としてfalseを返却するとエラーページ表示を防止できます。

:::column:グローバルにエラーを捕捉する
onErrorCapturedは、配下のサブコンポーネントで発生した未捕捉のエラー発生時に呼び出されます。
自コンポーネントのエラーは対象外ということもあり、使い所が難しいフックと言えるかもしれません。

とはいえ、エラーレポートシステム等を使う等、グローバルに未捕捉のエラーを検知したいことは多いかと思います。
このケースではVueが提供するerrorHandlerを利用します。

`plugins`ディレクトリに以下のようなプラグインを作成すれば、未捕捉のエラーが発生した場合に指定した関数が実行されます。

```typescript
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.config.errorHandler = (err, context) => {
    console.log("vue based error handler", err, context)
  }
})
```

ただし、ここで捕捉できるエラーはVueに関するもののみで、これで全てのエラーを検知できる訳ではありません。
例えば、setTimeout/setIntervalのコールバック関数内でのエラーは検知しません。
全てのエラーを検知したい場合は、別途Windowの[error](https://developer.mozilla.org/en-US/docs/Web/API/Window/error_event)イベント等のフックと併用する必要があります。

Nuxtアプリケーションの起動時に発生するクリティカルなエラー検知は、`app:error`イベントフックを使用します。こちらの詳細はNuxtの[公式ドキュメント](https://v3.nuxtjs.org/getting-started/error-handling/#server-and-client-startup-errors-ssr--spa)を参照してください。
:::

### NuxtErrorBoundaryコンポーネント

クライアントサイド限定ですが、[NuxtErrorBoundary](https://v3.nuxtjs.org/api/components/nuxt-error-boundary)を使うと、簡単にエラー発生時の影響を局所化できます。
[ソースコード](https://github.com/nuxt/framework/blob/main/packages/nuxt/src/app/components/nuxt-error-boundary.ts)を見ればすぐに分かりますが、NuxtErrorBoundaryは前述のonErrorCapturedフックを使って配下のコンポーネントで発生するエラーを監視するNuxtのユーティリティコンポーネントです。

```html
<script>
const log = (err) => console.log(err)
</script>

<template>
  <div>
    <NuxtErrorBoundary @error="log">
      <!-- default slot -->
      <FlakyComponent />
      <!-- フォールバック -->
      <template #error="{ error }">
        エラーが発生しました。
        {{ error }}
      </template>
    </NuxtErrorBoundary>
  </div>
</template>
```

NuxtErrorBoundaryはデフォルトスロットに対象コンポーネント、名前付きスロット(error)にエラー発生時のフォールバックコンテンツを指定します[^5]。

[^5]: スロットについてはVueの[ドキュメント](https://vuejs.org/guide/components/slots.html)を参照してください。

注意点として、ハイドレーション中はフォールバックが実行されないよう制御されています。このため対象コンポーネントのmounted等で発生したエラーには反応しません。
また、フォールバック時は上位のエラーハンドラへの伝播も行われませんので、グローバルなエラーハンドラでは検知されないようになります。

### APIアクセスエラー

Nuxt3ではAPIアクセス時に[useFetch](https://v3.nuxtjs.org/api/composables/use-fetch)/[useAsyncData](https://v3.nuxtjs.org/api/composables/use-async-data) Composableを使うことが多いかと思います。
この点についてのエラーハンドリングについても見てみます。

useFetch/useAsyncData自体は例外をスローしませんので、try-await/catch等でハンドリングしてもcatch節は実行されません。
これらは戻り値として`error`を返却しますので、それを受け取る必要があります。

`error`の型は`Ref<DataT | null>`とリアクティブになっており、`error.value`の初期値はnullです。
このため、useFetch/useAsyncData呼び出し直後にif文等で判定しても意味はありません。

テンプレートでエラーハンドリングをする例は、以下のようになります。

```html
<script setup lang="ts">
const { data: articles, error } = useFetch('/api/blogs');
// useAsyncDataを使う場合
// const { data: articles, error } = useAsyncData(() => $fetch('/api/blogs'));
</script>
<template>
  <div>サブコンポーネント</div>
  <div v-if="articles">
    <p>成功</p>
    {{ articles }}
  </div>
  <div v-else-if="error">
    <p>エラーが発生しました</p>
  </div>
</template>
```

なお、`error`はサーバーサイドではエラー詳細が格納されていますが、クライアントサイドのハイドレーション実行後はboolean型(エラー時はtrue)になります。
これは、不用意にエラー内容をクライアントサイドに公開しないためのNuxtのセキュリティ面での配慮です。
Errorの内容(ステータスコード等)をクライアントサイドで保持したい場合は、別途状態を保持するように実装する必要があります[^6]。

[^6]: GitHubの[こちら](https://github.com/nuxt/framework/issues/2122)のIssueで議論されていますので、興味のある方は参照してください。

## カスタムエラーページの作成

Nuxtは、サーバーサイド実行でエラーが発生した場合や、クライアントサイドでクリティカルなエラーが発生した場合に専用のエラーページを表示します。
もちろんこのエラーページはカスタマイズ可能です。

- [Nuxt3ドキュメント - Rendering an Error Page](https://v3.nuxtjs.org/getting-started/error-handling/#rendering-an-error-page)

カスタムエラーページを作成する場合は、プロジェクトルート直下に`error.vue`を作成するだけです。
以下のようなものになります。

```html
<script setup lang="ts">
import { NuxtApp } from "#app";

const props = defineProps<{ error: NuxtApp["payload"]["error"] }>();
const handleError = () => clearError({redirect: '/'})
const isDev = process.dev;
</script>

<template>
  <p>エラーが発生しました</p>
  <button @click="handleError">トップページに戻る</button>
  <div v-if="isDev">
    {{ error }}
  </div>
</template>
```

エラーページも通常のVueコンポーネントです。
propsとしてエラー発生内容が格納されている`error`を受け取れます。ここでは開発モード(`npm run dev`)の場合のみエラー内容の詳細を表示するようにしています。

上記では、エラーページで「トップページに戻る」ボタンを配置し、そのイベントハンドラでNuxtユーティリティの[clearError](https://v3.nuxtjs.org/api/utils/clear-error)を呼んでいます。
この関数はNuxtアプリケーション(NuxtApp.payload.error)が内部で保持しているエラーをクリアするものです。
引数にリダイレクト先(ここではトップページ)を指定することで、クリア後に通常のページへ復帰できるようになります。

:::column:クライアントサイドでエラーページを表示する
クライアントサイドで例外をスローするとデフォルトは非クリティカルなエラーになり、エラーページは表示されません。
この場合はユーティリティ関数として用意されている[showError](https://v3.nuxtjs.org/api/utils/show-error)を使用すればエラーページを表示できます。
[createError](https://v3.nuxtjs.org/api/utils/create-error)を使う場合でもfatalをtrueにするとエラーページを表示できます[^7]。

```typescript
// プログラムでエラーページ表示
const moveError = () => {
  showError(createError('FlakyComponentでエラーが発生しました！'))
}
// エラー生成時にfatal:trueを指定
onMounted(() => {
  throw createError({ message: 'FlakyComponentでエラーが発生しました！', fatal: true });
})
```

[^7]: 現時点(RC.11)で開発モード(`npm run dev`)では動作しませんでした。ビルド後(`npm run build`)は正常にエラーページに遷移しました。
:::

## まとめ

ここでは、Nuxt3が提供するエラーハンドリングを見てきました。
Nuxtだけでなく、Vueで用意されているものも含めて、うまく使って堅牢でデバッグしやすいアプリケーションとしたいものです。

次回はプラグイン開発について見ていく予定です。