---
title: Tauri でデスクトップアプリ開発を始める
author: masahiro-kondo
date: 2022-07-08
tags: Tauri
---

先月、Tauri が v1.0 に到達しました。

[Tauri 1.0 Release | Tauri Apps](https://tauri.app/blog/tauri_1_0/)

前回の記事、[「Rust によるデスクトップアプリケーションフレームワーク Tauri」](/blogs/2022/03/06/tauri/)では、カウンターを動かす簡単なアプリを実装したにとどまっていましたが、もう少し実用的なアプリを作って、雰囲気をつかんでいきたいと思います。

:::info
前回記事では、v1.0.0-rc.5 (Pre-release) を使っており、筆者の M1 Mac ではビルドが通りませんでしたが、v1.0.0 では問題なくビルドできました。
:::

[[TOC]]

## リモートサイトをロードするアプリ
前回記事では、

> 今のところ Electron のようにリモートのサイトをまるっとアプリのコンテンツとして表示する機能はなさそうです。

と書いていましたが、ちょっと調べたら、簡単にできました(元記事は訂正済みです)。ということで、フォローアップとして、リモートサイトを表示するアプリケーションを作ってみましょう。

Tauri のプロジェクトで、src-tauri/tauri.conf.json で `build/devPath`、`build/distDir` にロードするサイトを指定するだけです。GitHub のサイトを指定しました。

```json
{
  "$schema": "../node_modules/@tauri-apps/cli/schema.json",
  "build": {
    "beforeBuildCommand": "",
    "beforeDevCommand": "",
    "devPath": "https://github.com",
    "distDir": "https://github.com"
  },
```

アプリを実行してみたところです。GitHub サイトにログインして普通に使えます。

![](https://i.gyazo.com/982f7e8d3fb7d71a3466e9f8a9f7208f.png)

## 今回作成するアプリ (BPMN モデリングツール)

さて、デスクトップアプリなので、なにかプロダクティブなツールをと考え、BMPN.iO というサイトで公開されている BPMN 2.0 のモデリング用エディタを取り上げることにしました。

[Web-based tooling for BPMN, DMN, CMMN, and Forms | bpmn.io](https://bpmn.io/)

以下からデモ画面でモデリングができます。

[BPMN Editor | demo.bpmn.io](https://demo.bpmn.io/)

作成したモデルのファイルを BPMN 形式(XML) や SVG 形式でダウンロード可能です。

このサイトでは、bpmn.js という OSS のライブラリを使用しています。bpmn.js を使うと BPMN モデリングツールを Web ページに組み込んで、独自にホスティングすることも可能です。

[GitHub - bpmn-io/bpmn-js: A BPMN 2.0 rendering toolkit and web modeler.](https://github.com/bpmn-io/bpmn-js)

今回は、このライブラリを組み込んで、デスクトップで動作する BPMN エディタに仕立ててみます。

完成イメージです。

![](https://i.gyazo.com/d9b9aa26eb014e1391a6d64ce790b15b.gif)

起動画面で、BPMN ファイルを画面にドロップするか `create a new diagram` のリンクをクリックするとモデル編集画面に入ります。画面左下の `BPMN diagram`、`SVG image` のボタンクリックで XML 形式、SVG 形式でのファイル保存ができます。

アプリのソースコード全体は以下にあります。

[GitHub - kondoumh/tauri-bpmn-modeler-example: BPMN modeler example with Tauri](https://github.com/kondoumh/tauri-bpmn-modeler-example)

## プロジェクトの作成 (Tauri with Webpack)

BPMN エディタのサンプルも以下のリポジトリに公開されていますので、この中で、modeler のサンプルをベースにします。

[GitHub - bpmn-io/bpmn-js-examples: Some examples how to use bpmn-js](https://github.com/bpmn-io/bpmn-js-examples)

このサンプルは、[Webpack](https://webpack.js.org/) でアプリのアセットをビルドする構成です。Tauri では [Vite](https://ja.vitejs.dev/) が標準でサポートされてますが、Webpack を使うアプリも package.json と tauri.conf.json を設定することで開発可能です。そこで、Tauri のアプリ生成では、Vanilla.js を指定して、手動で設定を組み込みました。

```shell
npx create-tauri-app
```

```
Press any key to continue...
? What is your app name? tauri-app
? What should the window title be? Tauri App
? What UI recipe would you like to add? (Use arrow keys)
❯ Vanilla.js (html, css, and js without the bundlers) 
  create-vite (vanilla, vue, react, svelte, preact, lit) 
(https://vitejs.dev/guide/#scaffolding-your-first-vite-project) 
  create-react-app (https://create-react-app.dev/) 
  Svelte (https://github.com/sveltejs/template) 
  Solid (https://github.com/solidjs/templates) 
  Vue CLI (https://cli.vuejs.org/)
```

まず、tauri.conf.json では、`build/devPath` に webpack-dev-srver が起動する URL (ここでは、localhost:3001 を指定)、`build/distDir` に Webpack でバンドルされたアセットが格納されるディレクトリを相対パスで指定します。また `build/beforeBuildCommand` にはアセットのビルドコマンド、`build/beforeDevCommand` には、webpack-dev-server を起動するコマンドを指定します。

```json
{
  "$schema": "../node_modules/@tauri-apps/cli/schema.json",
  "build": {
    "beforeBuildCommand": "npm run build",
    "beforeDevCommand": "npm run dev",
    "devPath": "http://localhost:3001",
    "distDir": "../public"
  },
  :
```

distDir に相対的パスが指定されると、そのパスは再起的に読み取られ、全てのファイルがアプリケーションに読み込まれ、デフォルトで index.html ファイルをメイン画面にロードします。

[Configuration | Tauri Apps](https://tauri.app/v1/api/config/)

package.json では、tauri.conf.json で指定したコマンド build と dev を npm script で指定します。
dependencies には、アプリに必要なライブラリと、`@tauri-apps/api`、devDependencies には、Webpack 関連ライブラリと、`@tauri-apps/cli` などを組み込みます[^1]。

[^1]: サンプルの Webpack 関連など依存関係が古かったので全て現時点の最新バージョンに上げています。

```json
{
  "name": "tauri-bpmn-modeler-example",
  "scripts": {
    "build": "webpack --mode production",
    "dev": "webpack-dev-server",
    "tauri": "tauri"
  },
  "dependencies": {
    "@tauri-apps/api": "^1.0.2",
    "bpmn-js": "^9.3.1",
    "diagram-js": "^8.7.0",
    "jquery": "^3.6.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^1.0.3",
    "copy-webpack-plugin": "^11.0.0",
    "eslint": "^8.19.0",
    "eslint-plugin-bpmn-io": "^0.14.0",
    "npm-run-all": "^4.1.5",
    "raw-loader": "^4.0.2",
    "webpack": "^5.73.0",
    "webpack-cli": "^4.10.0",
    "webpack-dev-server": "^4.9.3"
  }
}
```

webpack.config.js の devServer 設定では、開発時に起動するポートを指定。開発時にブラウザでも同じページが開かないよう、`open: false` を指定します。あと、サンプルの copy-webpack-plugin が古かったので、plugins のオプション指定も修正しました。

```javascript
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'assets/**', to: 'vendor/bpmn-js', context: 'node_modules/bpmn-js/dist/' },
        { from: '**/*.{html,css}', context: 'app/' }
      ]
    })
  ],
  devServer: {
    port: 3001,
    open: false
  }
```

これで、`npm run tauri dev` を実行すると、アプリ画面で BPMN エディタが使える状態になります。

:::info
設定から分かるように webpack-dev-server が起動するのは開発時だけで、パッケージングされたバイナリでは bundler でビルドされた静的なファイルが起動時に読み込まれるだけです。内部で Web Server が動作するということではありません。
:::

## BPMN ファイル読み込み部分の実装

さて、元のサンプルでは起動画面に BPMN ファイルをドロップすることでファイルを開くことができますが、Tauri に読み込んだ状態ではドロップに反応しません。これは、Tauri 側でファイルドロップを受け取るようになっており、JavaScript の実装が動かないためです。これを解消するには、tauri.conf.json で `fileDropEnabled` を false にします。これは、WebView でファイルドロップを受け付けるかどうかの設定で、無効化することで、JavaScript 側でハンドリングを実装できます。

```json
    "windows": [
      {
        "fullscreen": false,
        "height": 768,
        "resizable": true,
        "title": "Tarui BPMN Modeler example",
        "width": 1024,
        "fileDropEnabled": false
      }
    ]
```

これで、エディタ画面にファイルをドロップすると読み込まれるようになりました。

![](https://i.gyazo.com/7902403df6ef96beda356a2a229daed8.gif)

## ファイル保存の実装 (with Tauri API)

次にファイルの保存です。元のサンプルのコードでは、BPMN 形式や SVG 形式での保存は、Web サイトからのダウンロードを想定して実装されているので、Tauri のデスクトップアプリケーションにロードした状態では動きません。そこで、Tauri API を使って、ファイル保存機能を実装します。

tauri.conf.json では、JavaScript 側から Tauri API を呼び出せるように、`build/withGlobalTauri` を true に設定します。

```json
  "build": {
    "beforeBuildCommand": "npm run build",
    "beforeDevCommand": "npm run dev",
    "devPath": "http://localhost:3001",
    "distDir": "../public",
    "withGlobalTauri": true
  },
```

tauri.conf.json の `tauri/allowlist` により、使用する機能を個別に有効化、無効化します。生成されたプロジェクトでは、全ての機能が許可されています。

```json
  "tauri": {
    "allowlist": {
      "all": true
    },
```

今回はファイルの read / write を許可したいので、トップレベルの all を false にして、必要な allowlist を個別に有効化します。ファイルシステムの fs と ファイル保存ダイアログ save の使用を許可しました。

```json
  "tauri": {
    "allowlist": {
      "all": false,
      "fs": {
        "all": false,
        "readFile": true,
        "writeFile": true
      },
      "dialog": {
        "all": false,
        "save": true
      }
    },
```

修正するとリビルドが実行され、src/tauri/Cargo.toml の dependencies が以下のように書きかわります。

```diff
- tauri = { version = "1.0.2", features = ["api-all"] }
+ tauri = { version = "1.0.2", features = ["dialog-save", "fs-read-file", "fs-write-file"] }
```

ファイル保存ダイアログとファイルシステムの API ドキュメントは以下にあります。

- [dialog | Tauri Apps](https://tauri.app/v1/api/js/modules/dialog/)
- [fs | Tauri Apps](https://tauri.app/v1/api/js/modules/fs/)

ファイル保存部分の実装(app/app.js)を抜粋します。サンプルは jQuery に依存していますが、そこは変更していません。

```javascript
import $ from 'jquery';
import BpmnModeler from 'bpmn-js/lib/Modeler';

import { save } from '@tauri-apps/api/dialog';
import { writeTextFile } from '@tauri-apps/api/fs';

const modeler = new BpmnModeler({
  container: '#js-canvas'
});
 :
$(function() {
   :
  const saveDiagramLink = $('#js-save-diagram')
  const saveSvgLink = $('#js-save-svg');
   :
  saveDiagramLink.on('click', async () => {
    const { xml } = await modeler.saveXML({ format: true });
    const path = await save({ defaultPath: 'diagram.bpmn' });
    if (path) {
      await writeTextFile(path, xml);
    }
  })

  saveSvgLink.on('click', async () => {
    const { svg } = await modeler.saveSVG();
    const path = await save({ defaultPath: 'diagram.svg' });
    if (path) {
      await writeTextFile(path, svg);
    }
  });
```

実装は単純で BpmnModeler の saveXML / saveSVG メソッドでデータを取得し、保存ダイアログで保存場所を取得したあと、fs.writeTextFile でデータを書き出しているだけです。
保存の dialog モジュール の save 関数の引数は、SaveDialogOptions インタフェースを受け取るようになっており、ここでは、デフォルトのファイル名、diagram.bpmn などを設定しました。


[dialog.SaveDialogOptions | Tauri Apps](https://tauri.app/v1/api/js/interfaces/dialog.SaveDialogOptions)

## アプリケーションのパッケージング

最後に、アプリケーションのパッケージングです。

```shell
npm run tauri build
```

macOS の場合、dmg ファイルが生成されて、インストーラの画面が起動します。

![](https://i.gyazo.com/e858c694f03b9e09b2af2704d17c285c.png)

## まとめ
以上、Tauri で bpmn.js を Webpack でバンドルしたアセットを組み込むことでデスクトップで動作する BPMN モデリングツールを作りました。Tauri API は使いましたが、Rust のコードは特に書いていません。ファイルのドラッグ＆ドロップを Tauri 側で実装するとなると、Rust のコードを書くことになると思います。

やはり、Electron アプリより起動が速いですね。

:::info
ちなみに今回題材にした bpmn.js ですが、Camunda というプロセスオーケストレーター製品を提供している会社の製品です。

[The Universal Process Orchestrator | Camunda](https://camunda.com/)

これは、Kuberentes ネイティブな BPMN ワークフローエンジン Zeebe によるプラットフォームです。bpmn.js はモデリングツールの UI をライブラリ化したもので、モデリングツール自体は、Electron アプリとして提供されています。

Camunda のプラットフォームについては、また別途取り上げてみたいと思います。
:::
