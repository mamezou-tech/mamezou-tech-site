---
title: Nuxt3 - 単体テスト前編 - セットアップ・コンポーネントをマウントする
author: noboru-kudo
date: 2024-02-07
tags: [nuxt, vue, テスト]
image: true
---

Nuxt3がリリースされて結構時間が経ちました。その間にも様々な改良が施されて今では成熟したフレームワークになったと言えるかと思います。

ただ、リリースしてしばらくの間はテストに関するドキュメントはほとんどなく手探りの状態でした。それから時が流れ、ふと公式ドキュメントを見ると、現在はテストユーティリティやドキュメントが充実してきました。
ということで、複数回に分けてNuxt3のテストを整理してみたいと思います。

- [Nuxt3 Doc - Testing](https://nuxt.com/docs/getting-started/testing)

ここではNuxt3.10.0時点(2024-01-30リリース)の情報をベースに、単体テストのみを対象とします。

初回はテストユーティリティのセットアップとテスト対象のコンポーネントのマウントです。

## セットアップ

Nuxtから公式で提供されているユーティリティライブラリの[@nuxt/test-utils](https://github.com/nuxt/test-utils)を使います。
現時点では、単体テスト用のテスティングフレームワークは[Vitest](https://vitest.dev/)のみをサポートしています。

非ブラウザ環境で動作する単体テストでは通常DOMエミュレータが必要です。ユーティリティライブラリでは[happy-dom](https://github.com/capricorn86/happy-dom)と[jsdom](https://github.com/jsdom/jsdom)をサポートしています。
ここではhappy-domを使ってセットアップします。

```shell
npm install -D @nuxt/test-utils vitest @vue/test-utils happy-dom
```

なお、一緒にインストールしている[@vue/test-utils](https://test-utils.vuejs.org/)はNuxtではなく純粋なVue向けの単体テストユーティリティです。

NuxtのユーティリティライブラリはNuxtモジュールを提供していますので`nuxt.config.ts`に登録します。

```typescript
export default defineNuxtConfig({
  modules: [
    '@nuxt/test-utils/module' // Nuxtモジュールの登録
  ],
  typescript: {
    tsConfig: {
      compilerOptions: {
        types: ["vitest/globals"] // globalsのTypeScriptサポート
      }
    }
  }
})
```

このNuxtモジュールのソースコード[^1]を見てみると、モック用マクロの登録・ルートコンポーネントのスタブ等のViteプラグインが含まれているようです。

[^1]: ソースコード(Nuxtモジュール): <https://github.com/nuxt/test-utils/blob/main/src/module.ts>

次に、プロジェクトルート直下にVitestの設定ファイル`vitest.config.ts`を作成します。

```typescript
import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    globals: true // describeやtest/expect等をimportなしで使う
  }
})
```

ポイントはVitest本体が提供する`defineConfig`ではなく、Nuxtユーティリティライブラリが提供する`defineVitestConfig`を使っている部分です。
ここでNuxtに対応したVitest設定を構築しています。

また、ユーティリティライブラリはVitestの[カスタム環境](https://vitest.dev/guide/environment#custom-environment)を提供し、ここでNuxt固有のブラウザ環境($fetch等)をセットアップしています[^2]。
上記では`environment: nuxt`と指定し、全てのテストに対して有効にしています。
これを指定しない場合、Nuxt環境での単体テストを実行するには個別に以下のいずれかの対応が必要です。

- テストファイル名のサフィックスを`.nuxt.(spec|test).ts`とする
- `// @vitest-environment nuxt`コメントをテストファイル先頭に付与する

[^2]: ソースコード(Vitestカスタム環境): <https://github.com/nuxt/test-utils/blob/main/src/environments/vitest/index.ts>

:::column:DOMエミューレータにjsdom使う
ここではデフォルトのhappy-domを使っていますが、jsdomを使う場合は`vitest.config.ts`を以下のようにします。

```typescript
export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    globals: true,
    environmentOptions: {
      nuxt: {
        domEnvironment: "jsdom"
      }
    }
  }
})
```
:::

## コンポーネントをマウントする

それではテストを書いてみます。まずはシンプルにテストコードからコンポーネントをマウントします。
以下のコンポーネントをテスト対象とします。

```html
<script setup lang="ts">
  const counter = ref(0);
  const nuxtApp = useNuxtApp();
</script>

<template>
  <button @click="counter++">Count Up!!</button>
  <div test-id="counter">{{ counter }}</div>
  <div test-id="nuxt-version">{{ nuxtApp.versions.nuxt }}</div>
</template>
```
ボタンクリックでカウンタを増やしていくだけのシンプルなコンポーネントです。
これに対する単体テストは以下のように書けます。

```typescript
import { mount, type VueWrapper } from '@vue/test-utils';
import Sample from '~/components/Sample.vue';

describe('Sample Component', () => {
  let wrapper: VueWrapper;
  afterEach(() => {
    wrapper?.unmount();
  });
  test('1回クリックするごとに値が増えていくこと', async () => {
    const wrapper = mount(Sample);
    await wrapper.get('button').trigger('click');
    expect(wrapper.get('[test-id="counter"]').text()).toBe('1');
    await wrapper.get('button').trigger('click');
    expect(wrapper.get('[test-id="counter"]').text()).toBe('2');
  });
  test('Nuxtバージョンが正く表示されていること', async () => {
    const wrapper = mount(Sample);
    expect(wrapper.get('[test-id="nuxt-version"]').text()).toBe('3.10.0');
  });
});
```

今までと変わらないシンプルなものですね。このテストは成功します。
ここでコンポーネントのマウントにはVue Test Utilsが提供する[mount](https://test-utils.vuejs.org/api/#mount)を使用しています。

2つ目のテストは、Nuxtアプリのバージョン表示を検証しています。
このテストが成功するのは、Nuxtテストユーティティがテスト実行前にNuxtアプリ(NuxtApp)を初期化[^3]しているからです。
全て試した訳ではありませんが、Nuxtが提供するComposable等のAPIの大半はモック/スタブ化しなくても単体テストで使えるようです(テストの内容次第ではモック化したいケースも多いとは思いますが)。

[^3]: ソースコード(Vitestのセットアップスクリプト): <https://github.com/nuxt/test-utils/blob/main/src/runtime/entry.ts>

## 非同期のコンポーネントをマウントする
テスト対象のコンポーネントでscript setupが非同期の場合はどうでしょうか？
Nuxt3が提供する非同期API`useFetch`を使ってコンテンツを取得するケースを考えてみます。

```html
<script setup lang="ts">
  const counter = ref(0);
  const nuxtApp = useNuxtApp();
  // 非同期処理
  const { data } = await useFetch('/api/foo');
</script>

// 省略(先ほどと同じ)
```

このコンポーネントでは、先ほどのテストは失敗してしまいます。
![](https://i.gyazo.com/51e4b1955c1c95d22406173b38929554.png)

コンポーネントがレンダリングされる前にテストが実行されているようです。Vue Test Utilsが提供する[flushPromise](https://test-utils.vuejs.org/api/#flushPromises)を実行しても解決しません。
Vue Test Utilsのドキュメントを見ると、このような非同期setupの場合はVue組み込みの[Suspense](https://ja.vuejs.org/guide/built-ins/suspense)コンポーネントでラップする必要があると記載されています。

- [Vue Test Utils Doc - Testing asynchronous setup](https://test-utils.vuejs.org/guide/advanced/async-suspense.html#Testing-asynchronous-setup)

ドキュメントの通りに修正すると以下のようになります(修正方法は同じなので1つ目のケースのみ掲載します)。

```typescript
test('1回クリックするごとに値が増えていくこと', async () => {
  const TestComponent = defineComponent({
    components: { Sample },
    template: '<Suspense><Sample /></Suspense>'
  });

  const wrapper = mount(TestComponent);
  await flushPromises();
  await wrapper.get('button').trigger('click');
  expect(wrapper.get('[test-id="counter"]').text()).toBe('1');
  await wrapper.get('button').trigger('click');
  expect(wrapper.get('[test-id="counter"]').text()).toBe('2');
});
```

これでテストは成功しますが、なんだか分かりにくいですね。
Nuxtのテストユーティリティでは、このようなケースで使える[mountSuspended](https://nuxt.com/docs/getting-started/testing#mountsuspended)(Testing Libraryを使う場合は[renderSuspended](https://nuxt.com/docs/getting-started/testing#rendersuspended))を提供しています[^4] 。

これを利用すると、テストは以下のようになります。

```typescript
test('1回クリックするごとに値が増えていくこと', async () => {
  const wrapper = await mountSuspended(Sample);
  
  await wrapper.get('button').trigger('click');
  expect(wrapper.get('[test-id="counter"]').text()).toBe("1")
  await wrapper.get('button').trigger('click');
  expect(wrapper.get('[test-id="counter"]').text()).toBe("2")
})
```

前述のコードと比較してシンプルになりましたね。`mountSuspended`内部では`Suspense`コンポーネントでテスト対象コンポーネントをラップしています。
また、同期関数の`mount`と違い、`mountSuspended`は非同期関数ですのできっちりとawaitする必要があります。
ほとんどのケースではVue Test Utilsの`mount`でも問題はないですが、Nuxtの単体テストでは一律この`mountSuspended`を使った方が混乱なくテストが書けそうですね[^5]。

[^4]: ソースコード(mountSuspended): <https://github.com/nuxt/test-utils/blob/main/src/runtime-utils/mount.ts>
[^5]: 内部でVue Routerを使っていたりしますので、useRouterをモックにする場合は注意が必要です。

## 終わりに
今回は、Nuxt3が提供するテストユーティリティのセットアップ方法とテストコンポーネントのマウント方法についてご紹介しました。
テストユーティリティを使うと、面倒なセットアップが不要でNuxt環境での単体テストが簡単に記述できることが分かります。

次回は単体テストでのモックについて掘り下げていきたいと思います。

- [Nuxt3 - 単体テスト後編 - モック・スタブ用のユーティリティを使う](/blogs/2024/02/12/nuxt3-unit-testing-mock/)