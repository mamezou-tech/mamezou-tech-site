---
title: Cypress Component TestingでVueコンポーネントの単体テストをする
author: noboru-kudo
date: 2022-06-12
tags: ["テスト"]
---

E2Eテストのフレームワークとして有名な[Cypress](https://www.cypress.io/)ですが、コンポーネントテスト(Component Testing)機能もあります。
このコンポーネントテストは2021-04-06にアルファ版として導入されていましたが、2022-06-01のCypress v10のリリースでベータ版に昇格しました。

- [Introducing the Cypress Component Test Runner– new in 7.0.0](https://www.cypress.io/blog/2021/04/06/introducing-the-cypress-component-test-runner/)
- [Announcing Cypress 10 with Component Testing Beta!](https://www.cypress.io/blog/2022/06/01/cypress-10-release/)

公式ブログによると、既にプロダクション環境での利用も問題なさそうです。
Cypressのコンポーネントテストはブラウザベースでテストできるので、Jest等で行っていた既存のNodeベースの単体テストを置き換える存在になる可能性を秘めていると感じます。

今回はCypressのE2Eではなく、コンポーネントテスト機能を利用して、Vueコンポーネントの単体テストにトライしてみようと思います。

[[TOC]]

## Cypressをセットアップする

まず、事前にVue CLIでVue3のTypeScriptプロジェクトを作成しました(`vue create`コマンド)。
このプロジェクトに対してCypressをセットアップします。
まずは、プロジェクトのルートディレクトリでCypressをインストールします。

```shell
npm install --save-dev cypress @testing-library/cypress
npx cypress --version
> Cypress package version: 10.1.0
> Cypress binary version: 10.1.0
> Electron version: 18.0.4
> Bundled Node version: 16.13.2
```

現時点で最新のCypress`10.1.0`をセットアップしました。
ここでは、Cypress本体だけでなく、Cypressをリッチに使える[Testing Library](https://testing-library.com/)拡張も合わせて入れました。

次に、Cypressの自動構成を利用して、Cypressをセットアップします。

```shell
# プロジェクトディレクトリへ移動
cd cy-component-testing
npx cypress open
```

CypressのUIが開きます。

![](https://i.gyazo.com/4aca3db1581de553589233a8020cc73f.png)

右側にコンポーネントテスト(Component Testing)が表示されますので、こちらをクリックします。

![](https://i.gyazo.com/d77a9a078d43ac5f7db2e648f5b89984.png)

今回はVue CLI(Vue 3)で作成していますので、デフォルト選択のまま次に進みます。
現時点では、Cypressのコンポーネントテストでは以下のフレームワークをサポートしています。

- Create React App
- Next.js ※アルファサポート
- Nuxt.js(v2) ※アルファサポート
- React.js
- Vue CLI(v2)
- Vue CLI(v3)

![](https://i.gyazo.com/ed7e222e7839fadf488110d2b98fa2a2.png)

依存ライブラリです。そのまま次に進みます。

![](https://i.gyazo.com/b7ac77a45eae8a9b878ae508b8ab0aad.png)

Cypress関連の設定ファイルが表示されています。このまま進みます。

![](https://i.gyazo.com/65a8cef0bccce474fa12153038a1cc89.png)

これで完了です。まだ何も作成していないため、ここで一旦CypressのUIは終了しておきました。

生成されたものを確認すると、プロジェクトルート配下に`cypress`というCypress用のディレクトリが作成されました。
また、ルート直下にCypressの設定ファイル(`cypress.config.ts`)が以下の内容で作成されました。

```typescript
import { defineConfig } from "cypress";

export default defineConfig({
  component: {
    devServer: {
      framework: "vue-cli",
      bundler: "webpack",
    },
  },
});
```

Vue CLIのデフォルトのWebpackの[DevServer](https://webpack.js.org/configuration/dev-server/)を使用して、コンポーネントテストを実施することが分かります。

ここで、TypeScript向けにcypressディレクトリ配下に、以下のtsconfigを作成しておきます。
```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["es5", "dom"],
    "types": ["cypress", "node", "@testing-library/cypress"]
  },
  "include": ["**/*.ts"]
}
```
参考: <https://docs.cypress.io/guides/tooling/typescript-support#Configure-tsconfig-json>

## テスト対象のコンポーネントを作成する

VueのSFC(Single File Component)で、以下コンポーネントを作成しました。

```typescript
<template>
  <h1 data-testid="title">{{ title }}</h1>
  <p data-testid="count-result">{{ count }}</p>
  <button data-testid="increment" @click="increment">increment</button>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = withDefaults(defineProps<{title: string}>(), {
  title: 'Welcome to Cypress Component Testing!!',
});

const count = ref(+(sessionStorage.getItem('count') || 0));

const increment = () => {
  const incremented = count.value + 1;
  sessionStorage.setItem('count', incremented.toString());
  count.value = incremented;
};
</script>
```

Vue3のComposition APIを使っています[^1]。

[^1]: Vue v3のComposition APIを使うと従来のオプションAPIと全く違った感じになりますね。。

シンプルなコンポーネントですが、ポイントは以下です。
- 親コンポーネントから`props.title`で受け取ったタイトルを表示する
- incrementボタンをクリックするとdata(`count`)をカウントアップして表示する
- カウントアップした値はブラウザのセッションストレージに保存する

1、2点目は、従来のJest + Vue Test Utilsを使った単体テストでも簡単に実装できますが、3点目のセッションストレージはブラウザに依存するため、モック化する必要があり結構面倒です。
このようにブラウザ機能を利用するようなものは、単体テストしにくいので、実ブラウザが使えるE2Eテストで確認することが多いと思います。

また、テンプレートの各要素には`data-testid`を追加して、テストコードでルックアップできるようしています(testing-libraryのユーティリティメソッドを利用します)。

## コンポーネントテストを記述する

上記コンポーネントの単体テストを行うCypressのコンポーネントテストを書いていきます。
まずは、テスト対象のVueコンポーネントをインポートし、describeブロックを定義します。

```typescript
import TestComponent from '../../src/components/TestComponent.vue';

describe('TestComponent.cy.ts', () => {
  // ここにテストを書く
}
```

従来のJestでの記述スタイルとほとんど変わりません(使っているのはmochaですが)。 
今回はコンポーネントのテストのため、テスト対象のVueコンポーネントをここでインポートします。

最初に、ブラウザ固有の機能に依存しないシンプルなテストを記述してみます。

```typescript
it('Titleが表示されていること', () => {
  cy.mount(TestComponent, {
    props: {
      title: 'My Custom Title'
    }
  })
  cy.findByTestId('title').should('have.text', 'My Custom Title')
})

it('incrementをクリックするとカウントアップされた値が表示されること', () => {
  cy.mount(TestComponent)
  cy.findByTestId('increment').click()
  cy.findByTestId('count-result').should('have.text', '1')
})
```

E2Eの場合は`cy.visit(...)`で、URLアクセスしますが、コンポーネントテストは`cy.mount(...)`を記述します。
こうすることでCypressはテスト対象のコンポーネントを、ブラウザ上でマウントしてくれます。
この`mount`メソッドは、Vue.jsでは内部的には[Vue Test Utils](https://test-utils.vuejs.org/guide/)を呼び出しているようで、使い方もほとんど同じです。
違いと言えば、Vue Test Utilsを使った場合はmountの戻り値(Wrapper)を使ってクリックや入力、値の取得等を行いますが、そこはCypressでブラウザから確認するので不要です。

mount後の記述はCypressのE2Eテストと変わりません。Cypressから提供される豊富なメソッドで簡潔にテストを記述できます[^2]。

[^2]: `cy.findByTestId(...)`はtesting-libraryのCypress拡張です。詳細は[こちら](https://github.com/testing-library/cypress-testing-library)を参照してください。

ここでは載せていませんが、テスト対象コンポーネントでタイマー等の非同期処理を多用すると、Jest+Vue Test Utilsはテストが途端にカオスになります。
Cypressのコンポーネントテストでは、Cypressに備わる[リトライ機能](https://docs.cypress.io/guides/core-concepts/retry-ability)が使えるのでかなり緩和されそうです。

次に、ブラウザ機能の1つであるセッションストレージに値が保存されていることを検証します。

```typescript
beforeEach(() => {
  // テスト開始前にブラウザのセッションストレージをリセット
  cy.window().then(win => {
    win.sessionStorage.clear();
  })
})

it('SessionStorageにカウントアップされた値が保存されていること', () => {
  cy.mount(TestComponent)
  cy.findByTestId('increment').click()
  cy.findByTestId('increment').click()
  cy.findByTestId('increment').click()
  cy.window().then(win => {
    const actual = win.sessionStorage.getItem('count')
    cy.wrap(actual).should('have.string', '3')
  })
})
```

`beforeEach`でテスト開始前にブラウザのセッションストレージをクリアし、テストでは3回incrementボタンをクリックした後に、セッションストレージの中身を確認しています。
コードを見れば分かるように、実ブラウザを使ったテストなので、セッションストレージは本物です。モック化する必要がなく、シンプルで直感的です。
このように、Cypressのコンポーネントテストはブラウザ機能(セッションストレージやCookie、タブ等)に依存するコンポーネントでは絶大な力を発揮してくれそうです。

## コンポーネントテストを実行する

作成したテストを実行します。
まずは、インタラクティブモードで実施してみます。

```shell
# インタラクティブモード
npx cypress open --component --browser chrome
```

全てのテストが実行されます。E2Eテストと比較してかなり高速な印象です。

![](https://i.gyazo.com/0f02a4e4cb95e1cceace93bba223b8d8.png)

変更を検知する度に実行してくれますし、アプリケーションを別途起動する必要がありませんので非常に効率良くテストができます。
CypressのE2Eテスト同様に、ここでスナップショット等が確認できますので、テスト結果は見やすくデバッグも簡単です。

もちろんヘッドレスモードでの実行もできます。以下はコンポーネントテストをCLIで実行する例です。

```shell
npx cypress run --component --browser=chrome
```
```
[@cypress/webpack-dev-server]: removing HtmlWebpackPlugin from configuration.
<i> [webpack-dev-server] Project is running at:
<i> [webpack-dev-server] Loopback: http://127.0.0.1:8081/
<i> [webpack-dev-server] Content not from webpack is served from '/Users/noboru-kudo/workspace/cy-component-testing/public' directory

====================================================================================================

  (Run Starting)

  ┌────────────────────────────────────────────────────────────────────────────────────────────────┐
  │ Cypress:        10.1.0                                                                         │
  │ Browser:        Chrome 102 (headless)                                                          │
  │ Node Version:   v16.13.1 (/Users/noboru-kudo/.nodenv/versions/16.13.1/bin/node)                │
  │ Specs:          1 found (TestComponent.cy.ts)                                                  │
  │ Searched:       **/*.cy.{js,jsx,ts,tsx}                                                        │
  └────────────────────────────────────────────────────────────────────────────────────────────────┘


────────────────────────────────────────────────────────────────────────────────────────────────────
                                                                                                    
  Running:  TestComponent.cy.ts                                                             (1 of 1)
<i> [webpack-dev-middleware] wait until bundle finished: /__cypress/src/index.html

    ✓ Titleが表示されていること (87ms)
    ✓ incrementをクリックするとカウントアップされた値が表示されること (112ms)
    ✓ SessionStorageにカウントアップされた値が保存されていること (246ms)


  3 passing (472ms)


  (Results)

  ┌────────────────────────────────────────────────────────────────────────────────────────────────┐
  │ Tests:        3                                                                                │
  │ Passing:      3                                                                                │
  │ Failing:      0                                                                                │
  │ Pending:      0                                                                                │
  │ Skipped:      0                                                                                │
  │ Screenshots:  0                                                                                │
  │ Video:        true                                                                             │
  │ Duration:     0 seconds                                                                        │
  │ Spec Ran:     TestComponent.cy.ts                                                              │
  └────────────────────────────────────────────────────────────────────────────────────────────────┘


  (Video)

  -  Started processing:  Compressing to 32 CRF                                                     
  -  Finished processing: /Users/noboru-kudo/workspace/cy-component-testing/cypress/v    (0 seconds)
                          ideos/TestComponent.cy.ts.mp4                                             


====================================================================================================

  (Run Finished)


       Spec                                              Tests  Passing  Failing  Pending  Skipped  
  ┌────────────────────────────────────────────────────────────────────────────────────────────────┐
  │ ✔  TestComponent.cy.ts                      470ms        3        3        -        -        - │
  └────────────────────────────────────────────────────────────────────────────────────────────────┘
    ✔  All specs passed!                        470ms        3        3        -        -        -  

```

CIではこちらを利用することになります。初回起動はそれなりに時間がかかりますが、テスト実行時間が470msと比較的高速です(ケース数少ないですが)。

## まとめ

ブラウザベースのアプリケーションはやはりブラウザ上で動かすのが安心・確実です。
既にE2EテストでCypressを使っている場合は、使い方もほとんど同じですし、こちらへの移行を検討するのは価値がありそうです。
そうでない場合でも、既存のNodeベースの単体テストをCypressに置き換えるのは結構アリじゃないかと思いました。

---
参考資料

- [Cypress Component Testingドキュメント](https://docs.cypress.io/guides/component-testing/writing-your-first-component-test)