---
title: Electron Forge 入門
author: masahiro-kondo
date: 2024-01-29
tags: [electron]
image: true
---

## はじめに

Electron アプリ開発では [electron-quick-start](https://github.com/electron/electron-quick-start) というスタートアッププロジェクトを使って始めるというのがならわし？です。

Electron は Web UI と Node.js のブリッジによるデスクトップアプリの骨格を作ってくれます。しかし、アプリのパッケージングや公開についてのサポートはありませんでした。サードパーティのツールやライブラリを使用してビルド→パッケージング→公開のパイプラインを開発者自身が作成する必要がありました。

筆者も electron-quick-start を使ってプロジェクトを初期構築し、パッケージャーやテストツールなどを後から追加していきました。アプリ開発のフェーズが進むにつれ、色々なライブラリを試したり設定にハマったりとかなり試行錯誤が必要でした。

:::info
electron-quick-start については以下の記事で紹介しています。

[electron-quick-start のコミット履歴で見る Electron プログラミングモデルの変遷](/blogs/2022/02/14/history-of-electron-quick-start/)
:::

## Electron Forge とは

Electron Forge は、Electron アプリのプロジェクト生成、ビルド、配布を行うためのオールインワンツールです。

公式ドキュメントと GitHub リポジトリは以下です。

- [Getting Started - Electron Forge](https://www.electronforge.io/)
- [GitHub - electron/forge: :electron: A complete tool for building and publishing Electron applications](https://github.com/electron/forge)

2016年に開発が開始されたようです。

Electron 公式ドキュメントにもアプリ配布のところで記載されている公式ツールの位置付けです。

[Distributing Apps With Electron Forge | Electron](https://www.electronjs.org/docs/latest/tutorial/forge-overview)

以下の図は Forge 公式ドキュメント [Build Lifecycle](https://www.electronforge.io/core-concepts/build-lifecycle) の章から引用したものです。Forge がサポートする Elctron アプリのパッケージング(実行形式のバンドル)、インストーラー作成、公開のワークフローを示しています。

> ![Build　life cycle](https://i.gyazo.com/bbb1c7b3b48fd1a2739683e2145d7f5e.webp)

Electron Forge を導入すると、パッケージングや配布に関しての迷いポイントがなくなります。

Forge を開発するモチベーションや提供される価値について、公式ドキュメントの以下の章に書かれています。

[Why Electron Forge - Electron Forge](https://www.electronforge.io/core-concepts/why-electron-forge)

Electron のエコシステムでは electron-packager や electron-builder などの単機能のツールがありました。Electron Forge はこれらのツールを統合しすぐに以下の機能が利用できるようにしています。

- アプリケーションパッケージング
- コード署名
- プラットフォーム固有のインストーラー作成
- Node.js のネイティブリビルド([electron/rebuild](https://github.com/electron/rebuild))
- ユニバーサルな macOS ビルド([electron/universal](https://github.com/electron/universal))

## Forge のプラグイン

プラグインにより、Webpack / Vite がサポートされています。

[Plugins - Electron Forge](https://www.electronforge.io/config/plugins)

Percel についても今後のサポートが検討されているようです。

[Parcel - Electron Forge](https://www.electronforge.io/guides/framework-integration/parcel)

その他にもいくつかプラグインが提供されており、例えば以下のようなものがあります。

- [Electronegativity Plugin - Electron Forge](https://www.electronforge.io/config/plugins/electronegativity) : Electron アプリの脆弱性をチェックするツール [Electronegativity](https://github.com/doyensec/electronegativity) を使用するためのプラグイン
- [Fuses Plugin - Electron Forge](https://www.electronforge.io/config/plugins/fuses) : Electron 自体の機能の有効無効を制御する [Fuse](https://www.electronjs.org/docs/latest/tutorial/fuses) 用プラグイン

Electronegativity 筆者は知りませんでした。CI/CD でも使えるようですのでまた調べて記事にしたいと思います。

## プロジェクト作成
プロジェクト作成の CLI も提供されており、Webpack、Vite の選択、TypeScript の使用も指定できます。
`--template` 引数に `webpack`、`webpack-typescript` のように指定します。

Vite のテンプレートを指定して forge-example というプロジェクトを生成する例です。

```shell
npm init electron-app@latest forge-example -- --template=vite
```

package.json には Forge の CLI やライブラリが入っていました。また Windows 用インストーラーのための Squirrel.Windows (後述)を使用するためのパッケージも指定されています。

```json
  "devDependencies": {
    "@electron-forge/cli": "^7.2.0",
    "@electron-forge/maker-deb": "^7.2.0",
    "@electron-forge/maker-rpm": "^7.2.0",
    "@electron-forge/maker-squirrel": "^7.2.0",
    "@electron-forge/maker-zip": "^7.2.0",
    "@electron-forge/plugin-auto-unpack-natives": "^7.2.0",
    "@electron-forge/plugin-vite": "^7.2.0",
    "electron": "28.2.0"
  },
  "dependencies": {
    "electron-squirrel-startup": "^1.0.0"
  }
```

## 開発環境でのアプリ起動・デバッグ

アプリのデバッグ・デバッグ時は、WebUI のためのローカルサーバーも起動されます。

```shell
$ npm start

> forge-example@0.1.0 start
> electron-forge start

✔ Checking your system
✔ Locating application
✔ Loading configuration
✔ Preparing native dependencies [0.1s]
✔ Running generateAssets hook
⠙ [plugin-vite] Launching dev servers for renderer process code
◼ [plugin-vite] Compiling main process code
✔ [plugin-vite] Launching dev servers for renderer process code [0.1s]
⠙ [plugin-vite] Compiling main process code
vite v4.5.2 building for development...

watching for file changes...
vite v4.5.2 building for development...

watching for file changes...

build started...

build started...
✓ 1 modules transformed.
✓ 1 modules transformed.
Generated an empty chunk: "preload".
.vite/build/main.js  0.44 kB │ gzip: 0.32 kB
built in 30ms.
✔ [plugin-vite] Launching dev servers for renderer process code [0.1s]
✔ [plugin-vite] Compiling main process code [0.0s]
```

アプリが起動され、おなじみの DevTools が利用できます。

![Hello world](https://i.gyazo.com/729747651215ac43a192136092d59273.png)

## フレームワークのサポート

デフォルトでサポートされるのは Vanilla JS ですが、React や Vue が使用できます。

[Framework Integration - Electron Forge](https://www.electronforge.io/guides/framework-integration)

以下のガイドに従って、Vue の開発環境を追加してみました。

[Vue 3 - Electron Forge](https://www.electronforge.io/guides/framework-integration/vue-3)

Vue と Vite の Vue プラグインをインストールします。

```shell
npm i vue
npm i -D @vitejs/plugin-vue
```

これで Vue による UI 開発に必要なパッケージがインストールされます。ただし Vue のアセット生成まではやってくれないので、手動で追加する必要があります。

以下のように Vue 3 のプロジェクトを生成し Forge のプロジェクトの src 配下に Vue プロジェクトの src/assets、src/components、App.vue などのファイルをコピーしました。

```shell
npm create vue@latest
```

index.html の body に Vue アプリ用の div 要素を追加します。

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Hello World!</title>

  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/renderer.js"></script>
  </body>
</html>
```

src/renderer.js は以下のように Vue アプリ作成のコードで置き換えます。

```javascript
import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

vite.renderer.config.mjs の内容を 以下のように plugin-vue を利用するように書き換えます。

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()]
});
```
これで Vue コンポーネントを使った UI を Electron で動かせるようになりました。通常の Vue の SPA と同様に開発できます。

![](https://i.gyazo.com/c002701db2fbae9fc6a952530ccfe2e0.png)

## アプリのビルド

packege.json の npm script `package` を実行すると、プラットフォーム固有の実行形式が生成されます。

```shell
npm run package
```

Apple Silicon の MacBook Pro では `out/<project-name>-darwin-arm64` 配下に macOS のアプリが出力されました。

## Makers の利用

Makers の機能を利用するとプラットフォーム固有のインストーラーを生成してくれます。

[Makers - Electron Forge](https://www.electronforge.io/config/makers)

npm script `make` を実行します。

```shell
npm run make
```

Apple Silicon の MacBook Pro で実行すると、Forge のプロジェクトを生成したデフォルトの状態では Zip アーカイブが `out/make/zip/darwin/arm64` 配下に生成されます。`forge-example-darwin-arm64-0.1.0.zip` のような名前になります。

macOS 用 DMG 形式のインストーラーを生成するには、@electron-forge/maker-dmg パッケージをインストールする必要があります。

```shell
npm i -D @electron-forge/maker-dmg
```

forge.config.js の `makers` 配列に以下のように maker-dmg の設定を追加します。

```json
  makers: [
    {
      name: `@electron-forge/maker-dmg`,
      config: {
        format: 'ULFO'
      }
    }
  ]
```

これで、`npm run make` を実行すると、`out/make` 配下に `forge-example-0.1.0-arm64.dmg` のような名前で DMG ファイルが生成されます。

詳細はドキュメントの以下を参照してください。

[DMG - Electron Forge](https://www.electronforge.io/config/makers/dmg)

Makers が対応しているパッケージの形式は以下のようになっています。

| 形式 | 説明 |
|:-----|:----|
| AppX | Windows Store 用 |
| deb  | Debian ベース の Linux ディストリビューション用 |
| DMG  | macOS 用 |
| Flatpak | Lnux 向けパッケージマネージャ Flatpak 用 |
| Pkg | Mac App Store 用 |
| RPM | RedHat ベースの Linux ディストリビューション用 |
| Snapcraft | Linux 向けパッケージマネージャ Snap 用 |
| Squirrel.Windows | ClickOnce ライクな Windows アプリインストーラー兼アップデーター [Squirrel.Windows](https://github.com/Squirrel/Squirrel.Windows) 用 |
| WiX MSI | Windows アプリインストーラー形式 MSI 用 |
| Zip | ZIP ファイル 用 |

しかし、こうやって見ると、Windows も Linux も多くのインストーラー形式が存在しますね。

## Publishers の利用

ユーザーがアプリをダウンロード、インストール・アップデートするためのサービスに対して配布するのが Publishers です。

[Publishers - Electron Forge](https://www.electronforge.io/config/publishers)

以下のサービスが利用できます。

- Bitbucket
- [Electron Releaser Server](https://github.com/ArekSredzki/electron-release-server)
- GitHub
- Google Cloud Storage
- [Nucleus](https://github.com/atlassian/nucleus)
- S3
- Snapcraft

サービスごとの設定を forge.config.js に記述し、npm script の `publish` を実行します。

```shell
npm run publish
```

## さいごに
以上、Electron Forge によるアプリ開発、パッケージ作成、公開の手順について簡単にまとめました。オールインワンで Electron 本体のバージョンアップにも追従してくれるのは楽ですね。

以前紹介した electron-vite はプロジェクト作成から開発・デバッグを中心にサポートしてくれるツールでした。

[electron-vite で Electron アプリ開発の生産性を上げる](/blogs/2023/05/22/electron-vite/)

Forge はパッケージングと公開周りのサポートが厚い感じです。

Forge は開発中のアプリにも取り込みたいと思いました。既存プロジェクトの取り込みについては公式ドキュメントの以下に記載があります。

[Importing an Existing Project - Electron Forge](https://www.electronforge.io/import-existing-project)
