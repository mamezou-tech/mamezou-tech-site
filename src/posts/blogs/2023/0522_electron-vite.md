---
title: electron-vite で Electron アプリ開発の生産性を上げる
author: masahiro-kondo
date: 2023-05-22
tags: [electron]
---

electron-vite は Electron アプリ開発用に構成された次世代の開発環境を謳っています。名前の通り JavaScript のデファクトビルドツールになりつつある Vite を採用しています。

## 概要
electron-vite の Git リポジトリです。記事執筆時点のバージョンは v1.0.22 スター数は922でした。個人開発のプロジェクトです。

[GitHub - alex8088/electron-vite: Next generation Electron build tooling based on Vite 新一代 Electron 开发构建工具，支持源代码保护](https://github.com/alex8088/electron-vite)

公式サイトからその特徴を列挙してみます。

[Next Generation Electron Build Tooling | electron-vite](https://evite.netlify.app/)

1. `Vite Powered`: Vite の利点を継承し、Vite での開発方法が利用できる
2. `Pre-configured`: Electron 向けに設定されている
3. `Optimize Asset Handling`: Electron の main process 向けに最適化されたアセットの取り扱い
4. `Fast HMR`: renderer process で HMR が利用可能
5. `Hot Reloading`: main process と preload scripts もホットリローディングが可能
6. `Easy to Debug`: IDE でのデバッグが容易
7. `TypeScript Decorators`: emit に TypeScript の Decorators によるメタデータをサポート
8. `Source Code Protection`: ソースコード保護のため V8 bytecode へのコンパイル
9. `Out-of-the-box`: 追加設定なしで、TypeScript / Vue/ React / Svelte/ SolidJS などをサポート

素の Electron 開発では renderer process のアセット開発は特にサポートされておらず自前でビルド環境を作る必要があります。ホットリローディングもないので、アプリのデバッグメニューからリロードします。main process や preload script の変更はリロードしても反映されないので、アプリを再起動する必要があります。electron-vite ではこのあたりをかなり改善・省力化してくれます。

:::info
main process / renderer process / preload といった Electron のプログラミング要素については以下の記事で解説しています。

[electron-quick-start のコミット履歴で見る Electron プログラミングモデルの変遷](/blogs/2022/02/14/history-of-electron-quick-start/)
:::

elecrtron-vite の公式ドキュメントからもう少し説明を見てみましょう。

[Getting Started | electron-vite](https://evite.netlify.app/guide/)

コミュニティリソースに多くある Vite ベースの Electron 開発テンプレートは複雑で補助スクリプトが必要だったり、ソースコードの保護ができないなどの課題がある。electron-vite はこれら課題を解決し、Electron のための俊敏で無駄のない開発体験を提供することを目的としているとのことです。

electron-vite では main process / preload スクリプトがバンドルされ、renderer process では Vite の開発サーバで [HMR](https://ja.vitejs.dev/guide/api-hmr.html) が使用されることでビルドや動作確認の手間が削減されます。実際、electron-vite で作業をしていると Vue などで SPA を開発しているのに近い開発体験が得られました。

さらに electron-vite は Electron の推奨構成(nodeIntegration 無効化、contextIsolation 有効化など)が設計に反映されており、ベストプラクティスに準拠できます。生成されたプロジェクト構成を見ると近年の Electron の推奨構成にほぼ準拠したものでした。

:::info:サンドボックス化の制限事項
electron-vite では `sandbox:false` で renderer process のサンドボックスを無効化しています。これは CommonJS module を複数ファイルに分割するために必要な措置とのことです。

[Limitations of Sandboxing | Development | electron-vite](https://evite.netlify.app/guide/dev.html#limitations-of-sandboxing)

renderer プロセスのサンドボックス化については以下の記事で紹介しています。

[Electron v20 で有効化された Renderer プロセスサンドボックス化に対応する](/blogs/2022/08/03/electron-renderer-process-sandboxed/)

electron-vite を利用した開発では preload スクリプト内でサードパーティの Node モジュールを利用しないよう注意が必要です。
:::

## プロジェクトの作成

以下のコマンドで electron-vite を使ったプロジェクトを作成します。

```shell
$ npm create @quick-start/electron
```

フレームワークに Vue を選択して作成しました。

```
Need to install the following packages:
  @quick-start/create-electron@1.0.12
Ok to proceed? (y) y
✔ Project name: … hello-evite
✔ Select a framework: › vue
✔ Add TypeScript? … No / Yes
✔ Add Electron updater plugin? … No / Yes
✔ Enable Electron download mirror proxy? … No / Yes

Scaffolding project in /Users/kondoh/dev/electron-study/hello-evite...

Done. Now run:

  cd hello-evite
  npm install
  npm run dev
```

プロジェクトのディレクトリ構成は、以下のようになりました。src 配下に main process、preload スクリプト、renderer のディレクトリが掘られます。Vue を選択したので renderer 配下は通常の Vue3 のプロジェクト構成になっています。

```shell
.
├── dev-app-update.yml
├── electron-builder.yml
├── electron.vite.config.js
├── package.json
├── resources
│   └── icon.png
└── src
    ├── main
    │   └── index.js
    ├── preload
    │   └── index.js
    └── renderer
        ├── index.html
        └── src
            ├── App.vue
            ├── assets
            │   ├── css
            │   │   └── styles.less
            │   └── icons.svg
            ├── components
            │   └── Versions.vue
            └── main.js
```

:::info
構成は、`electron.vite.config.ts` でカスタマイズ可能です。

[Development | electron-vite](https://evite.netlify.app/guide/dev.html)
:::

## 開発・デバッグ
以下のコマンドで Electron アプリのビルドと実行が可能です。

```shell
npm run dev
```

プロジェクトを作成した直後は以下のようなアプリが起動してきます。

![default app](https://i.gyazo.com/395219123af473d5477a5853261a055f.png)

package.json の npm script では、`"dev": "electron-vite dev",` が定義されています。

HMR による renderer process のホットリローディングが可能になっていますので、src/renderer 配下のファイルを編集した場合素早くアプリの画面に反映されます。main process や preload スクリプトを書き換えた際もリロードさせるには、`electron-vite dev` に `--watch` フラグをつけます。

[Hot Reloading | electron-vite](https://evite.netlify.app/guide/hot-reloading.html)

:::info
npm script で常時 `--watch` を指定してしまうと、再起動のたびに VS Code からアプリ側にフォーカスを持っていかれますので、必要時に応じて指定するのが無難です。main process や preload スクリプトを微修正する場合に使うのがよいでしょう。以下のように npm script の引数でフラグを指定することも可能です。

```shell
npm run dev -- --watch
```
:::

Electron アプリでは、HTML や JavaScript のアセットは通常ローカルファイルシステムから読み込みます。electron-vite では HMR を利用するため、開発時は環境変数で指定されたローカル URL から読み込むようになっています(環境変数は electron-vite が自動設定します)。

- src/main/index.js (ボイラープレートコードの抜粋)
```javascript
function createWindow() {
  // Create the browser window
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js')
    }
  })

  // Load the local URL for development or the local
  // html file for production
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}
```

[Using HMR | electron-vite](https://evite.netlify.app/guide/hmr.html)

## 簡単なアプリの開発
簡単なアプリを electron-vite で開発して使用感を見ていきます。今回作成したアプリのコードは以下にあります。

[electron-study/hello-evite at master · kondoumh/electron-study](https://github.com/kondoumh/electron-study/tree/master/hello-evite)

「[Vue 3 と D3.js で作る可視化アプリ](/blogs/2023/02/10/visualization-with-vue3-and-d3/)」の記事で作成した Vue 3 のアプリのコードを利用します。この SPA アプリのソースコードを electron-vite で生成した src/renderer 配下に配置するだけでほぼ手直しなく[^1]アプリが動作しました。

![vu3 d3.js app](https://i.gyazo.com/f2219fea1d818ab258114c76a80a183c.png)

[^1]: Netlify に配置した JSON ファイルを取得するために src/renderer/index.html の meta タグを少し修正した程度です。

今回は、アプリのヘッダーに `export to svg` ボタンをつけて、D3.js の可視化結果を SVG としてファイルにエクスポートできるように機能を追加します。

![export button](https://i.gyazo.com/8585abdc03a5c23f50df24e5d88e1b30.png)

Header.vue にボタンとクリック時の emit 処理を追加します。

- src/renderer/src/components/Header.vue
```html
<template>
  <header>
    <h2>Scrapbox graph</h2>
    <select v-model="project" @change="onChange">
      <option>help-jp</option>
      <option>comic-forum</option>
      <option>icons</option>
    </select>
    <button @click="onExportToSvg">export to svg</button> <!-- 追加 -->
  </header>
</template>
  
<script setup>
import { ref } from 'vue';

const project = ref('help-jp');
const emit = defineEmits(['project-changed', 'export-svg']); // emit 定義を追加

const onChange = () => {
  emit('project-changed', project.value);
}
const onExportToSvg = () => {
  emit('export-svg'); // イベントを発行
}
</script>
```

親の App.vue で Header コンポーネントのクリックをハンドリングして Graph コンポーネントのメソッドを呼び出します。表示中の Scrapbox プロジェクト名を引数に渡しています。

- src/renderer/src/App.vue
```html
<template>
  <div>
    <Header @project-changed="switchProject" @export-svg="exportToSvg" /> <!-- イベントを追加 -->
    <Graph ref="graph" v-bind:project="project" /> <!-- ref を追加 -->
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

const graph = ref(null);      // Graph コンポーネントの ref
const exportToSvg = () => {
  graph.value.exportToSvg(project.value); // Graph コンポーネントのメソッド呼び出し
}
</script>
```

preload スクリプトに、main process に対して SVG ファイルをエクスポートのメッセージを送信するメソッドを追加します。

- src/preload/index.js (抜粋)
```javascript
import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld(
  'mainApi', {
    exportToSvg: async (project, data) => await ipcRenderer.invoke('export-to-svg', project, data),
  }
);
```

Graph.vue で d3.select して SVG の表示に必要な属性情報を追加し、上記の preload で追加したメソッドを呼び出します。

- src/renderer/src/components/Graph.vue (抜粋)
```javascript
const exportToSvg = async project => {
  const svgContainer = d3.select('svg')
                          .attr('xmlns','http://www.w3.org/2000/svg')
                          .attr("version",'1.1');
  window.mainApi.exportToSvg(project, svgContainer.node().outerHTML);
}
```

main process ではファイル保存用ダイアログを起動して保存先が確定したら SVG ファイルを書き出します。

- src/main/index.js (抜粋)
```javascript
import * as fs from 'node:fs/promises'

ipcMain.handle('export-to-svg', async (event, project, data) => {
  const win = BrowserWindow.getFocusedWindow();
  const result = await dialog.showSaveDialog(
    win, {
      title: 'Export to SVG',
      defaultPath: `${project}.svg`,
      filters: [ { name: 'SVG', extensions: ['svg'] }, ],
    },
  );
  if (!result.canceled) {
    await fs.writeFile(result.filePath, data);
  }
});
```

以上のコード追加で `export to svg` ボタンクリック時に保存ダイアログが出て SVG ファイルを保存することが可能になりました。

![save svg dialog](https://i.gyazo.com/0c3ad22a3aa154f2b43fececafc34a4d.png)

## 開発体験
上記の開発作業においてホットリローディングの効果はやはり大きく、Vite の HMR で画面が一瞬で書き換わります。これまで手動でちまちまリロードしていたのが嘘のような快適さでした。main process や preload スクリプトを書き換えた時のリロードも可能なので、ちょっとしたコードの調整時に重宝します。

Electron アプリ開発を始める上でのツール設定など、オールインワンで揃っていて開発着手が早まります。

electron-builder も内包しており、バイナリやインストーラーも用意された npm script を実行するだけで作成可能です[^2]。

[^2]: GitHub Actions によるアプリ配布のワークフローサンプルもドキュメントにあります。[https://evite.netlify.app/guide/distribution.html#github-action-ci-cd](https://evite.netlify.app/guide/distribution.html#github-action-ci-cd)

:::info
VS Code など IDE でのデバッグもサポートされています。

[Debugging | electron-vite](https://evite.netlify.app/guide/debugging.html)

Elctron に内蔵された Chrome DevTools の方が慣れているので今回は使いませんでした。
:::

## 最後に
以上、electron-vite の使用レポートでした。Electron をよく理解して設計されており、ドキュメントも整備されていて、現時点での完成度は非常に高いものがあります。Electron のベストプラクティスに準拠した構成になっており Electron に慣れていない開発者でもさほどの苦労なく入っていけそうです。

後発の [Tauri](https://tauri.app/) では最初からこのレベルの環境が提供されていますが、Electron でもここまでのサポートがあれば随分と効率が上がりそうです。

Electron と Web のビルドツールを組み合わせるボイラープレートプロジェクトはこれまでもありましたが、あまり普及しているとは言い難い状況です[^3]。Electron の開発スピードや Web 開発の流行にも追従する必要があり、コミュニティベースでは難しい面があるのでしょう。electron-vite も個人プロジェクトのため継続性については懸念があります。

[^3]: VS Code や Slack などの大きな Electron プロジェクトでは自前で容易しているのでしょう。

Web アプリのアセットを保有しており、クイックに Electron アプリ化をしたい時などに採用を検討するのがよいでしょう。
