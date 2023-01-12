---
title: Vue3コンポーネントをnpmモジュールとしてAWS CodeArtifactにデプロイする
author: noboru-kudo
date: 2022-07-10
tags: ["vite", "vue", "AWS", "code-artifact"]
templateEngineOverride: md
---

Vue.jsのようなコンポーネントフレームワークを使ってある程度の規模の開発を進めていくと、作成するコンポーネントは膨大になってきます。
その結果、似たようなコンポーネントが乱立し、メンテナンスが難しい状況に陥るのはよくあることです。

この課題に対する有力な解決策は、再利用可能なコンポーネントをnpmモジュールとしてプライベートnpmレジストリに登録することです。
こうすることで、UIコンポーネントの組織内共有や通常のライブラリ同様のバージョン管理が可能となり、この苦痛は大きく緩和されることになるでしょう。

今回は[Vue.js](https://vuejs.org/)(v3)のコンポーネントをnpmモジュール化し、[AWS CodeArtifact](https://aws.amazon.com/jp/codeartifact/)にデプロイする方法を紹介します。


## Vueコンポーネントライブラリのプロジェクト作成

今回はVueやReact、Svelte等の有名フレームワークに対応した高速ビルドツールの[Vite](https://vitejs.dev/)を利用します。
任意のディレクトリで以下のコマンドを実行します。

```shell
npm create vite@latest
# ? Project name: my-vue-libs
# ? Select a framework: vue
# ? Select a variant: vue-ts
cd my-vue-libs/
npm install
```

インタラクティブに作成するプロジェクト構造を聞かれます。ここではプロジェクト名を`my-vue-libs`として、Vue.js+TypeScriptを選択しました。
後は、ViteがフレームワークやTypeScriptで必要な設定ファイルを作成してくれます(現時点で最新のViteのv2.9.14を使用)。

ここでは、以下のような構造でプロジェクトが作成されました。

```
my-vue-libs/
├── README.md
├── index.html
├── node_modules
│     └── (省略)
├── package-lock.json
├── package.json
├── public
│ └── favicon.ico
├── src
│ ├── App.vue
│ ├── assets
│ │ └── logo.png
│ ├── components
│ │ └── HelloWorld.vue
│ ├── env.d.ts
│ └── main.ts
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

今回はVueコンポーネントのライブラリなので、public等は削除して構いません。

## 公開用のコンポーネントを作成する

ここからnpmレジストリで公開するVueコンポーネントを作成します。
以下のボタンコンポーネント(`MyButton.vue`)を作成しました。
なお、ライブラリに無関係なファイル(HelloWorld.vueやApp.vue、main.ts)はこの時点で削除しました。

```typescript
<template>
  <button @click="click">{{ name }}</button>
</template>

<script lang="ts" setup>
const props = defineProps<{
  name: string
}>();
const emit = defineEmits<{
  (e: "click", message: string): void
}>();
const click = () => emit("click", "MyButton clicked!!!")
</script>
```

Vue3のComposition API+setupスクリプトで、シンプルなボタンコンポーネントを作成しました。

次に、コンポーネントを公開するエントリーポイントを作成します。
ここでは、`src`直下に以下の`index.ts`を配置しました。

```typescript
import MyButton from "./components/MyButton.vue";
export { MyButton }
```

作成したコンポーネントをexportするだけです。
複数のコンポーネントを公開する場合は、コンポーネント作成後に追記していきます。

## ライブラリモードのビルド設定をする

今回はUIアプリとしてパッケージングしないので、専用のビルド設定が必要です。
Viteにはnpmモジュールとしてビルドするライブラリモードが用意されていますのでこれを利用します。

- [Vite - Library Mode](https://vitejs.dev/guide/build.html#library-mode)

プロジェクトルート直下の`vite.config.ts`のbuildフィールドに以下を追加します。

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import * as path from "path";

export default defineConfig({
  plugins: [vue()],

  // >>> start
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "my-vue-libs",
      fileName: (format) => `my-vue-libs-${format}.js`
    },
    rollupOptions: {
      external: "vue",
      output: {
        globals: {
          vue: "Vue",
        }
      }
    }
  }
  // <<< end
})
```

この状態で以下のコマンドを実行すると、Viteでビルド、バンドルされた結果が`dist`ディレクトリに出力されます。

```shell
npx vite build

# vite v2.9.14 building for production...
# ✓ 2 modules transformed.
# dist/my-vue-libs-es.js   0.48 KiB / gzip: 0.29 KiB
# dist/my-vue-libs-umd.js   0.61 KiB / gzip: 0.39 KiB
```

UMD(Universal Module Definition)形式とESM(ES Module)形式の2種類のバンドルファイルが作成されました。

## AWS CodeArtifactにデプロイする

次に、プライベートnpmレジストリのAWS CodeArtifactにモジュールをデプロイします。

その前に、このままではTypeScriptからこのモジュールを利用できませんので、d.tsファイル(TypeScript向けの型宣言)を生成します。
プロジェクトルート直下のtsconfig.jsonに以下を追加します(関連部分のみ抜粋)。

```json
{
  "compilerOptions": {
    "declaration": true,
    "declarationDir": "dist",
  }
}
```

d.tsファイルは以下で出力できます。

```shell
npx tsc --emitDeclarationOnly
```

Viteのビルド結果とともに`dist`配下に`index.d.ts`が出力されているはずです。

```
dist/
├── index.d.ts
├── my-vue-libs-es.js
└── my-vue-libs-umd.js
```

また、npmモジュールとして公開するために、package.jsonもライブラリ用に修正します。

```json
{
  "name": "my-vue-libs",
  "description": "My Component Library",
  "version": "0.0.1",
  "files": ["dist"],
  "types": "./dist/index.d.ts",
  "module": "./dist/my-vue-libs-es.js",
  "main": "./dist/my-vue-libs-umd.js",
  "exports": {
    ".": {
      "import": "./dist/my-vue-libs-es.js",
      "require": "./dist/my-vue-libs-umd.js"
    }
  },
  // (以降省略)
}
```

各設定値には、先程生成したdist配下のファイルを指定します。

ここまでできれば準備完了です。

AWSのCodeArtifactリポジトリを作成します。
今回はマネジメントコンソールから以下の内容で作成しました。

![CodeArtifact setup](https://i.gyazo.com/070d72ecf65447be663f40ffb9fceddd.png)

ここにVueコンポーネントのnpmモジュールをデプロイしましょう。
まずは、CodeArtifactにログインします[^1]。

[^1]: デフォルトに戻す場合は`npm config set registry https://registry.npmjs.com/`を実行します。

```shell
export AWS_ACCOUNT=xxxxxxxxxxxx
aws codeartifact login --tool npm --repository my-private-registry \
  --domain mamezou-tech --domain-owner ${AWS_ACCOUNT}
# 接続確認
npm -d ping
```

最後の出力結果からCodeArtifactに接続できていることを確認します。
後はCodeArtifactにnpmモジュールをpublishするだけです[^2]。

[^2]: 誤ってnpm本体のレジストリに公開しないように`package.json`の`publishConfig.registry`にもCodeArtifactのURLを指定しておいた方が良いと思います。また、ここでは実施していませんがライブラリのモジュール名も他と区別しやすいようにスコープ(@xxxx)をつけるとより良いと思います。

```shell
npm publish
```

成功したらマネジメントコンソールからも確認しておきます。

![CodeArtifact module](https://i.gyazo.com/bcc34a0f2d56752278b3f3d0cb268344.png)

作成したモジュールが無事デプロイできました。

## デプロイしたnpmモジュールを利用する

最後に任意のVue.jsプロジェクトを作成し、デプロイしたVueコンポーネントを使ってみます。
インストールは基本的には通常のnpmレジストリと同じですが、事前にCodeArtifactへログインしている必要があります。

```shell
aws codeartifact login --tool npm --repository my-private-registry \
  --domain mamezou-tech --domain-owner ${AWS_ACCOUNT}

npm install my-vue-libs
```

`package.json`を見ると、先程デプロイされているnpmモジュールが追加されます。

```json
  "dependencies": {
    // (省略)
    "my-vue-libs": "^0.0.1",
  },
```

後は、このモジュールに含まれるVueコンポーネントを使って実装するだけです。

```typescript
<template>
  <div>
    <MyButton name="My Library Component" @click="message = $event"/>
    <p>{{ message }}</p>
  </div>
</template>

<script lang="ts" setup>
// 作成したnpmモジュールに含まれるVueコンポーネント
import { MyButton } from "my-vue-libs"; 
import { ref } from "vue";

const message = ref("");
</script>
```

importでCodeArtifactにデプロイしたnpmモジュールを指定し、Vueコンポーネントを利用します。
それ以降は通常の実装と変わりありません。

## まとめ

UIフレームワークをアプリとして動かす情報はかなり多いですが、npmモジュールでライブラリとして公開する方法は意外に少ない気がしています。
今後マイクロフロントエンドが浸透してくると、この辺りの知識を要求されることも多いのではと思います。

参考になりましたら幸いです。

---
参考資料

- [Viteドキュメント](https://vitejs.dev/)
- [Vue.jsドキュメント](https://vuejs.org/)
- [AWS CodeArtifactドキュメント](https://docs.aws.amazon.com/codeartifact/latest/ug/welcome.html)
