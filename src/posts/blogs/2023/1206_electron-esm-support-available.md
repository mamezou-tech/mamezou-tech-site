---
title: Electron v28 で ESM サポートが入ったので試す
author: masahiro-kondo
date: 2023-12-06
tags: [electron]
---

## はじめに

Electron v28.0.0 がリリースされ ESM(ECMA Script Modules) がサポートされました。

[Electron Releases - v28.0.0](https://releases.electronjs.org/release/v28.0.0)

ついに Electron でも ESM が使えるようになりました。

## Electron の ESM サポート状況

ドキュメントの以下のページに対応方法について記述されています。

[ES Modules (ESM) in Electron | Electron](https://www.electronjs.org/docs/latest/tutorial/esm)

同ページの [ESM support matrix](https://www.electronjs.org/docs/latest/tutorial/esm#summary-esm-support-matrix) (のスクリーンショット)を掲載します。

![ESM Support matrix](https://i.gyazo.com/3d11643d9b8bee56d8ff63db366d86c2.png)

まとめると以下のようになります。

- Main プロセスでは Node.js の ESM Loader が使用される
- Renderer プロセスでは Chromium の ESM Loader が使用される
- Preload スクリプトでは以下のようになる
  - Renderer プロセスがサンドボックス化されている場合 ESM Loader はサポートされない
  - Renderer プロセスがサンドボックス化されていない場合 Node.js の ESM Loader が利用される (そのため拡張子は `.mjs` にする必要がある)

Electron の Main プロセスにおいて、従来の CommonJS ではモジュールのロードは同期的なのに対し、ES Module のロードは非同期的なので以下のように注意が必要です。

> ESM の dynamic import や `app.setPath` などの  Electron API は呼び出しは、コードの順番通りに実行されない。これらは、Electron アプリの `ready` イベントより前に実行される必要があるが、非同期に実行されるため、`ready` イベントの後で実行されるかもしれない。そのため、従来通りの挙動にするにはこれらを await 呼び出しにする必要がある。

ESM のトップレベル await を利用可能なため、await 呼び出しにするのは簡単です。

preload スクリプトに関しては、使用可能なら Node.js の ESM Loader が使用されます。この場合拡張子を `.mjs` にする必要があります。preload スクリプトで Node.js や Electron の機能を使用したい場合はこの方式を採用することになります。Context Isolation が有効になっていない場合は Node.js の dynamic import は使えないなど制約もあります。詳細は以下のセクションを参照してください。

[Preload scripts](https://www.electronjs.org/docs/latest/tutorial/esm#preload-scripts)

:::info
Renderer プロセスのサンドボックス化については以下の記事に書いています。

[Electron v20 で有効化された Renderer プロセスサンドボックス化に対応する](/blogs/2022/08/03/electron-renderer-process-sandboxed/)
:::

## アプリケーションを ESM 対応する

昨年の記事「[Electron - WebView から BrowserView に移行する](/blogs/2022/01/07/electron-browserview/)」で作成したサンプルアプリケーションを Electron v28.0.0 にアップデートして ESM 対応しました。このアプリケーションはサンドボックス化と Context Isolation が有効なので package.json と Main プロセス の修正だけでした。

### package.json
- `"type": "module"` の行を追加

### Main プロセス

- ファイルの拡張子を `.mjs` に変更
- `require` を `import` に変更
- `__filename`、`__dirname` を使用している箇所で url パッケージの `fileURLToPath` をから取得するように変更

dynamic import や `app.setPath` などは使用していないため await をつけるなどの対応は不要でした。

### Preload スクリプト

- 変更なし

サンドボックス環境では ESM Loader がサポートされないため、Electron の機能を呼び出す場合、従来通り `require` を使用します。

### Renderer プロセス

- 変更なし

本アプリのリポジトリは以下にあります。

[GitHub - mamezou-tech/electron-example-browserview: Example of Electron app that registers and switches between multiple BrowserViews.](https://github.com/mamezou-tech/electron-example-browserview)

## 最後に
ESM サポートが入ったことで、Electron アプリや Electron 用パッケージの ESM 対応も進むのではないでしょうか。

去年の初め頃に書いた記事「[electron-quick-start のコミット履歴で見る Electron プログラミングモデルの変遷](https://developer.mamezou-tech.com/blogs/2022/02/14/history-of-electron-quick-start/)」において、

> 今後は、ES Modules 対応などが入ってくるのではないかと予想しています。

と書いていました。[electron-quick-start のリポジトリ](https://github.com/electron/electron-quick-start)を見ると、まだコード自体には ESM 対応は入っていませんでした。
