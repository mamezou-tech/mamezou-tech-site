---
title: Nuxt3 - 単体テスト後編 - モック・スタブ用のユーティリティを使う
author: noboru-kudo
date: 2024-02-12
tags: [nuxt, vue, テスト]
image: true
---

[前回](/blogs/2024/02/07/nuxt3-unit-testing-mount/)はNuxt3の単体テスト方法として以下の内容を見てきました。

- Nuxtのテストユーティリティ(@nuxt/test-utils)をセットアップする
- テスト用のNuxt環境上でNuxtコンポーネントをマウントしてテストを書く

後半となる今回は、テストユーティリティが提供するモック・スタブに関する機能について見てみたいと思います。

:::info
ここではVitest自体のモック機能について詳細は触れません。
少し昔のものですが、以下の記事でVitestの概要をご紹介してます。

- [Viteベースの高速テスティングフレームワークVitestを使ってみる](/blogs/2022/12/28/vitest-intro/)

上記の記事では、モックについてはあまり触れていませんが基本的な使い方はJestと同じです。
Jestのモックは以下記事でご紹介しています。

- [Jest再入門 - 関数・モジュールモック編](/testing/jest/jest-mock/)
:::

## Composableのモック化(mockNuxtImport)

- [Nuxt Doc - mockNuxtImport](https://nuxt.com/docs/getting-started/testing#mocknuxtimport)

この機能が最も使用頻度の高いと思います。
Nuxt3の代表的な機能の1つとして[自動インポート](https://nuxt.com/docs/guide/concepts/auto-imports)が挙げられます。
これを使うとNuxt/VueのコアAPIに加えて、composablesディレクトリに配置したComposableはimportなしで使えるようになります。
プロダクトコードが簡潔になりますので、Nuxtを使っている多くのプロジェクトで採用していると思います。
これを簡単にモック化するのがmockNuxtImportです。

ここでは、Nuxtが提供するComposableの[useRoute](https://nuxt.com/docs/api/composables/use-route)をモック化するケースを考えます。
テスト対象のプロダクトコードは以下です。

```html
<script setup lang="ts">
const route = useRoute();
</script>

<template>
  <div v-if="route.params.id">{{ route.params.id }}</div>
</template>
```

Vue RouterのRouteにアクセスしてパスパラメータ(id)を表示するページです。
mockNuxtImportを使ってuseRouteをモック化すると以下のようになります。

```typescript
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import testPage from '~/pages/route/[id].vue';

mockNuxtImport('useRoute', () => () => ({
  params: {
    id: '999'
  }
}));

test('using mockNuxtImport', async () => {
  const wrapper = await mountSuspended(testPage);
  expect(wrapper.get('div').text()).toBe('999');
});
```

テストファイルのトップレベルでmockNuxtImportを記述します。
第1引数はモックにする自動インポート対象のComposableです。[vi.mock](https://vitest.dev/api/vi.html#vi-mock)を使う場合はComposableのパス(この例では`#app/composables/router`)を指定する必要がありますが、この変換はmockNuxtImportがやってくれます。

第2引数はモックのFactory関数です。モックにするuseRouteは関数なのでここで記述するファクトリ関数も関数を返す必要があります。

コラムの方に詳細は記述していますが、mockNuxtImportはAPIとしての実態はなくマクロ(Viteプラグイン)として動作し、ソースコードは[vi.mock](https://vitest.dev/api/vi.html#vi-mock)に書き換えられます。
このため、vi.mock同様にファイル最上部に巻き上げ(hoisting)られます。テスト(test関数)ごとに複数のmockNuxtImportを配置しても最後の1つで上書きされます。
以下vi.mockの[ドキュメント](https://vitest.dev/api/vi.html#vi-mock)からの引用です。

> vi.mock is hoisted (in other words, moved) to top of the file. It means that whenever you write it (be it inside beforeEach or test), it will actually be called before that.
> (以下DeepL訳)
> vi.mockはファイルの一番上に引き上げられる（言い換えれば、移動させられる）。つまり、（beforeEachの中であれtestの中であれ）これを書くと、実際にはその前に呼び出されることになる。

とはいえ、テストごとにモックの振る舞いを変えたいことは当然あるかと思います。
テストユーティリティのドキュメントにも言及されていますが、このようなケースでは[vi.hoisted](https://vitest.dev/api/vi.html#vi-hoisted-0-31-0)を使ってモックを初期化します。

以下はvi.hoistedを使って各テストでモックの振る舞いを記述するサンプルです。

```typescript
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import testPage from '~/pages/route/[id].vue';

// mockNuxtImport(vi.mock)と一緒に巻き上げられる(初期化エラーは発生しない)
const { mockRoute } = vi.hoisted(() => ({
  mockRoute: vi.fn()
}));

// こちらは失敗する(巻き上げられない)
// -> ReferenceError: mockRoute is not defined
// const mockRoute = vi.fn();

// vi.mockに変換されるので巻き上げられる
mockNuxtImport('useRoute', () => mockRoute);

afterEach(() => {
  mockRoute.mockReset();
})

test('id=999', async () => {
  mockRoute.mockReturnValue({
    params: {
      id: '999'
    }
  })
  const wrapper = await mountSuspended(testPage);
  expect(wrapper.get('div').text()).toBe('999');
});

test('id=undefined', async () => {
  mockRoute.mockReturnValue({
    params: {
      id: undefined
    }
  })
  const wrapper = await mountSuspended(testPage);
  expect(wrapper.find('div').exists()).toBe(false);
});
```

vi.hoistedはvi.mockと一緒に巻き上げ対象となりますので、参照エラーは発生しません(単純にトップレベルで宣言すると巻き上げられず参照エラーになります)。
この特性を利用して、vi.hoistedでモックを初期化(vi.fn)しておき、それをvi.mockのFactory関数で返すようにします。
あとは各テストに応じてモックの振る舞いを記述するだけです(もちろんモックは各テストで共有されますので、afterEach等で後始末しておきます)。

なお、Vitestのvi.mock/vi.hoistedの巻き上げに関する詳細は以下記事がとてもよくまとまっています。
内部の仕組みを知りたい方はご一読ください(本記事でもかなり参考にさせていただきました)。

- [Zenn blog - ESMのmock巻き上げ問題とVitestのvi.hoistedについて](https://zenn.dev/ptna/articles/617b0884f6af0e)
- [Zenn blog - Vitest の vi.mock は巻き上げられる](https://zenn.dev/you_5805/articles/vitest-mock-hoisting)

:::column:mockNuxtImportマクロの変換内容
前述の通り、mockNuxtImportはマクロでAPIとしての実態はありません。
実際の動きを調べてみたところ、以下のように書き換えが行われていました。

```typescript
vi.hoisted(() => {
  if (!globalThis.__NUXT_VITEST_MOCKS) {
    vi.stubGlobal('__NUXT_VITEST_MOCKS', {});
  }
});
vi.mock('#app/composables/router', async (importOriginal) => {
  const mocks = globalThis.__NUXT_VITEST_MOCKS;
  if (!mocks['#app/composables/router']) {
    mocks['#app/composables/router'] = { ...await importOriginal('#app/composables/router') };
  }
  mocks['#app/composables/router']['useRoute'] = await (() => () => ({
    params: {
      id: '999'
    }
  }))();
  return mocks['#app/composables/router'];
});
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import testPage from '~/pages/route/[id].vue';
```

結構たくさんのコードに変換されていますが、大事なのはVitestの[vi.mock](https://vitest.dev/api/vi.html#vi-mock)に変換されている部分です。
もっとシンプルに書くと以下のような感じでしょうか。

```typescript
vi.mock('#app/composables/router', async (importOriginal) => {
  return {
    ...await importOriginal<typeof import('#app/composables/router')>(),
    useRoute: () => ({
      params: {
        id: '999'
      }
    })
  };
});
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import testPage from '~/pages/route/[id].vue';
```
つまり、mockNuxtImportマクロは自動インポートしているComposableのパスを取得して、vi.mockのFactory関数で指定した部分をモックにしているだけです。
原理が分かるとシンプルですね。
:::

## サブコンポーネントのスタブ化(mockComponent)

- [Nuxt Doc - mockComponent](https://nuxt.com/docs/getting-started/testing#mockcomponent)

テスト対象のコンポーネントのスタブを提供します(mockComponentという名前ですがスタブのイメージが近そうです)。
以下のようなボタンコンポーネントがあったとします。

```html
<script setup lang="ts">
  const { data: foo } = await useFetch('/api/foo');
</script>

<template>
  <button v-if="foo">{{ foo.name }}</button>
</template>
```

APIからボタン名を取得してボタンを描画するカスタムコンポーネントです。

これを使うページコンポーネントは以下のようなものです。
```html
<script setup lang="ts">
  const counter = ref(0);
</script>

<template>
  <MyButton @click="counter++" />
  <div>{{ counter }}</div>
</template>
```

このページをテスト対象として単体テストを書いてみます。
ここで、ボタンコンポーネントはuseFetchでAPIに依存してるので、スタブにしたいと考えたとします。

Nuxtのテストユーティリティが提供するmockComponentを使うと以下のようになります。

```typescript
import testPage from '~/pages/mocks/comp-mock.vue';
import { mockComponent, mountSuspended } from '@nuxt/test-utils/runtime';

mockComponent('MyButton',  {
  template: '<button>stub button</button>'
});

test('using mockComponent', async () => {
  const wrapper = await mountSuspended(testPage);

  await wrapper.get('button').trigger('click');
  expect(wrapper.get('div').text()).toBe('1');
});
```

mockComponentもファイルのトップレベルに配置します。上記では第1引数にコンポーネント名(相対パスも可)、第2引数にスタブコンポーネント(外部ファイルのimportも可)を定義しています。
mockNuxtImport同様に、mockComponentもvi.mockに変換されますので、Vitestでファイル最上部まで巻き上げられます。このためトップレベルに1つ配置が原則になります。

上記テストを実行するとMyButtonコンポーネントはスタブで置き換えられ、APIコールは行われません。


:::column:Vue Test Utilsのスタブ機能を使う
ここではNuxtのテストユーティリティのスタブ機能を紹介しましたが、これを使わなくてもVue Test Utilsにもスタブ機能はあります。

- [Vue Test Utils Doc - Stubs and Shallow Mount](https://test-utils.vuejs.org/guide/advanced/stubs-shallow-mount.html)

この場合は以下のようなテストコードになります。

```typescript
import testPage from '~/pages/mocks/comp-mock.vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';

test('using VTU stub', async () => {
  const wrapper = await mountSuspended(testPage, {
    global: {
      stubs: {
        MyButton: defineComponent({
          template: '<button>stub button</button>'
        })
      }
    }
  });

  await wrapper.get('button').trigger('click');
  expect(wrapper.get('div').text()).toBe('1');
});
```

最後に言うのもアレですが、こちらだとテストごとにスタブの振る舞いを変えるのも簡単です。
デフォルトスタブ実装の提供もありますので、現時点では基本はこちらを使う方がいいんじゃないかと思ったりもしてます。
:::

:::column:mockComponentマクロの変換内容
mockComponentもマクロで、ソースコードはテストユーティリティで変換されます。
実際には以下のようなコードに書き換えられていました。

```typescript
import { vi } from 'vitest';
vi.mock('/path/to/components/MyButton.vue', async () => {
  const factory = ({
    template: '<button>mock button</button>'
  });
  const result = typeof factory === 'function' ? await factory() : await factory;
  return 'default' in result ? result : { default: result };
});
import testPage from '~/pages/mocks/comp-mock.vue';
import { mockComponent, mountSuspended } from '@nuxt/test-utils/runtime';
```

やはりmockNuxtImport同様に、vi.mockに変換されています。
Factory関数を今回のケースに限定したものに置き換えると以下のような形でしょうか。

```typescript
import { vi } from 'vitest';
vi.mock('/path/to/MyButton.vue', () => ({
  default: {
    template: '<button>mock button</button>'
  }
}));
import testPage from '~/pages/mocks/comp-mock.vue';
import { mockComponent, mountSuspended } from '@nuxt/test-utils/runtime';
```

こちらでもテストは成功します。
:::

## (補足)APIのスタブ・モック化

先ほどはComponentごとスタブにしましたが、それよりもAPIコールだけをモックにした方がより実態に近いテストができます。
NuxtのテストユーティリティにはAPIのスタブ化用に[registerEndpoint](https://nuxt.com/docs/getting-started/testing#registerendpoint) APIを提供しています(こちらはマクロではなくAPIとしての実態があります)。

これを使うと、テストユーティリティがスタブ用のAPIを提供してくれます。
テストコードは以下のようなものになります。

```typescript
import testPage from '~/pages/mocks/comp-mock.vue';
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime';

registerEndpoint('/api/foo', () => ({
  name: 'stub button'
}))

test('using registerEndpoint', async () => {
  const wrapper = await mountSuspended(testPage);

  await wrapper.get('button').trigger('click');
  expect(wrapper.get('div').text()).toBe('1');
});
```

これでコンポーネント自体は実体を使い、APIのみをスタブにした単体テストになります。

:::column:MSWでAPIをモックにする
registerEndpointはAPIのスタブ機能を提供するだけで、テストファイル内でレスポンスを切り替えたり検証目的で使えません。
VitestではAPIのモック化に[Mock Service Worker(MSW)](https://mswjs.io/)を推奨しています。

- [Vitest Doc - Mocking - Requests](https://vitest.dev/guide/mocking.html#requests)

MSWを使う場合は、以下のように書き換えられます。

```typescript
import testPage from '~/pages/mocks/comp-mock.vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { createFetch } from 'ofetch';

const server = setupServer();

afterAll(() => {
  server.close();
});

afterEach(() => {
  server.resetHandlers();
});

test('using Mock Service Worker', async () => {
  server.use(http.get('http://localhost:3000/api/foo', () => HttpResponse.json({
    name: 'stub button'
  })));
  server.listen({ onUnhandledRequest: 'error' });
  // [重要!!]$fetchのモック化用のパッチ(server.listen後に)
  globalThis.$fetch = createFetch({ fetch: globalThis.fetch, Headers: globalThis.Headers })

  const wrapper = await mountSuspended(testPage);

  await wrapper.get('button').trigger('click');
  expect(wrapper.get('div').text()).toBe('1');
});
```

このようにすればテストごとにレスポンスをエラーに切り替えたり、リクエスト検証等の細かい制御ができます。

ただし、上記ソースコードを見れば分かるとおり、現時点ではMSWにモック化する場合は一工夫必要でした。
というのも、そのままMSWを使うとuseFetchはモック化されませんでした($fetchも同様)。
調べてみると、Nuxtが内部で使用しているofetchのIssueに以下がありました。

- [GitHub ofetch Issue - Usage with MSW / patched fetch](https://github.com/unjs/ofetch/issues/295)

createFetchを使わないとMSWのモック化の対象にならないようです。
プロダクトコードを変えたくない場合は、上記のようにserver.listen後に$fetchを上書きしてあげればモック化できました。
:::

## まとめ

2部構成でNuxtのテストユーティリティを使った単体テストのやり方をご紹介しました。

Nuxtのテストユーティリティは、Nuxt環境エミュレートやテスト用の各種マクロ・APIを提供してくれます。
機能面に目が行きがちですが、この辺りのテスト機能も品質維持には重要です。しっかり抑えていきたいですね。

- [Nuxt3 - 単体テスト前編 - セットアップ・コンポーネントをマウントする](/blogs/2024/02/07/nuxt3-unit-testing-mount/)
