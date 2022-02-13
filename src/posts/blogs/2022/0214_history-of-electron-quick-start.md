---
title: electron-quick-start のコミット履歴で見る Electron プログラミングモデルの変遷
author: masahiro-kondo
date: 2022-02-14
---

electron-quick-start は Electron でのプロジェクトのひな形となるアプリのリポジトリです。

[GitHub - electron/electron-quick-start: Clone to try a simple Electron app](https://github.com/electron/electron-quick-start)

Electron が1.0に到達する以前の2015年からメンテナンスされています。Electron の進化とともにファイル構成やプログラミングモデルも変わってきました。その歴史をコミット履歴から見ていきましょう。

[[TOC]]

## 2015/10/17 io.js からスタート
[8113791cebec956796e5a10562b64fa965754f7e](https://github.com/electron/electron-quick-start/tree/8113791cebec956796e5a10562b64fa965754f7e)

最初期のコミットで、ファイルは2つ。

- index.html
- main.js

index.html で 使用している OSS バージョンを表示しています。最初は Node.js ではなく io.js を使ってました。なつかしいですね[^1]。script タグでナチュラルに io.js の process API が使われています。シンプルですが Electron のコンセプトがよくわかるサンプルになっています。Electron のバージョンは不明です。

[^1]: [Node v4.0.0 (Current) | Node.js](https://nodejs.org/en/blog/release/v4.0.0/)

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Hello World!</title>
  </head>
  <body>
    <h1>Hello World!</h1>
    We are using io.js <script>document.write(process.version)</script>
    and Electron <script>document.write(process.versions['electron'])</script>.
  </body>
</html>
```

main.js は、メインウィンドウ(BrowserWindow)の生成、HTML ファイルのロード、アプリの終了処理などが書かれています。現在のものとさほど変わりませんが、最初にクラッシュレポート用のオブジェクトを起動していますね。electron-quick-start の提供には Electron のクラッシュレポートを収集するねらいもあったのでしょう。

```js
var app = require('app');
var BrowserWindow = require('browser-window');

require('crash-reporter').start();

var mainWindow = null;

app.on('window-all-closed', function() {
  if (process.platform != 'darwin') {
    app.quit();
  }
});

app.on('ready', function() {
  mainWindow = new BrowserWindow({width: 800, height: 600});

  mainWindow.loadUrl('file://' + __dirname + '/index.html');

  mainWindow.openDevTools();

  mainWindow.on('closed', function() {
    mainWindow = null;
  });
});
```

## 2015/10/20 Node.js への移行
[fcc251352b84715b74be7ffff6cccf83eb796f91](https://github.com/electron/electron-quick-start/tree/fcc251352b84715b74be7ffff6cccf83eb796f91)

Node.js に移行し、package.json が追加され原型が完成しました。Electron はまだ electron-prebuild というパッケージ名で 0.34.0[^2]。

[^2]: Atom Editor v1.2.0 のリリースで使用されたバージョンと思われます。([https://github.com/atom/atom/blob/v1.2.0/package.json](https://github.com/atom/atom/blob/v1.2.0/package.json))。また、VS Code の 1.0 リリースが 2016/04/14 であるため、当時の VS Code で使用されていた Electron もこのアーキテクチャーであったと思われます。

- index.html
- main.js
- **package.json**

この頃はまだプロセスモデルが明確でなく、BrowserWindow にロードされた JavaScript でも Node.js API が使えるユニークな開発環境のデモといった感じがします。

![](https://i.gyazo.com/2efac3be552517498b4e78ad7ded6859.png)

## 2016/04/21 renderer process の定義
[1e287bdb624bb1a62362316994c226ba7d26f6a9](https://github.com/electron/electron-quick-start/tree/1e287bdb624bb1a62362316994c226ba7d26f6a9)

renderer.js が追加されました。

- index.html
- main.js
- package.json
- **renderer.js**

electron-prebuild 0.37.0。index.html のコメントに renderer process という言葉が出てきました。

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Hello World!</title>
  </head>
  <body>
    <h1>Hello World!</h1>
    <!-- All of the Node.js APIs are available in this renderer process. -->
    We are using node <script>document.write(process.versions.node)</script>,
    Chromium <script>document.write(process.versions.chrome)</script>,
    and Electron <script>document.write(process.versions.electron)</script>.
  </body>

  <script>
    // You can also require other files to run in this process
    require('renderer.js')
  </script>
</html>
```

renderer.js は Node.js の require 構文で読み込まれています。renderer.js はコメントだけのファイルですが、BrowserWindow の renderer process で実行されることが書かれています。

```js
// This file is required by the index.html file and will
// be executed in the renderer process for that window.
```
main process でウィンドウ制御、renderer process で Node.js の API も活用して UI のコードを書くというプログラミングモデルが導入されました。両プロセス間の通信もあたり前に行われていました。

![](https://i.gyazo.com/c1998194bb339b52e8d7d6dfabdfc399.png)

electron-quick-start はこの構成が長く続きました。

## 2019/04/26 Electron 5.0.0
[1cb6d17b40c6fc14fd6dc4e6f2a951558b7e7297](https://github.com/electron/electron-quick-start/tree/1cb6d17b40c6fc14fd6dc4e6f2a951558b7e7297)

Electron が 5.0.0 に更新されました。webPreferences の nodeIntegration のデフォルト値が false になるという breaking change がありましたが、特に対応はありませんでした。

## 2019/06/08 preload の登場
[19788f8fbe10de4777d4c51c64b1d964a6b6901d](https://github.com/electron/electron-quick-start/tree/19788f8fbe10de4777d4c51c64b1d964a6b6901d)

Electron は 5.0.2 とマイナーアップデートですが、preload を使用する PR がマージされました。

[feat: use a preload script instead of enabling nodeIntegration by malept · Pull Request #279 · electron/electron-quick-start](https://github.com/electron/electron-quick-start/pull/279)

JS ファイルは preload.js を含む3ファイル構成になりました。

- index.html
- main.js
- package.json
- **preload.js**
- renderer.js

index.html の script タグでは、require ではなく src で renderer.js を読み込むように変更されました。そして従来 script タグで Node の process API が直接使われていた部分が id 付きの span 要素に置き換えられています。

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Hello World!</title>
  </head>
  <body>
    <h1>Hello World!</h1>
    We are using Node.js <span id="node-version"></span>,
    Chromium <span id="chrome-version"></span>,
    and Electron <span id="electron-version"></span>.

    <!-- You can also require other files to run in this process -->
    <script src="./renderer.js"></script>
  </body>
</html>
```

preload.js では、index.html の span 要素を指定して process API でバージョンをレンダリングしています。

```js
// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
window.addEventListener('DOMContentLoaded', () => {
  for (const versionType of ['chrome', 'electron', 'node']) {
    document.getElementById(`${versionType}-version`).innerText = process.versions[versionType]
  }
})
```

main.js では webPreferences の preload プロパティで preload.js を読み込んでいます。

```js
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
```

renderer.js のコメントは変わってませんが、きっと変更もれでしょう。

```js
// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
```

## 2019/10/12 preload への正式な移行
[6788309ed8dade0f08f3d054190f44ccb45d0db8](https://github.com/electron/electron-quick-start/tree/6788309ed8dade0f08f3d054190f44ccb45d0db8)

renderer.js のコメントが修正されました。けっこう放置されてましたね。

```js
// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.
```

これで、renderer process が Node.js から隔離されました。そして、ContextBridge (preload) を介して main process との通信や Node.js API を使用するプログラミングモデルになりました。renderer.js からは preload のメソッドやイベントは window オブジェクトのメソッドやイベントに見えます。これにより renderer プロセスはブラウザで実行される JavaScript と同等のサンドボックス環境になったと言えます[^3]。

[^3]: preload.js で DOM 操作やってしまってるのでサンプルとしては微妙ですが。

![](https://i.gyazo.com/d442151631d5a2b78dc1f705fb056631.png)

## 2019/11/13 CSP 導入
[0ed07b8a7b21da2c9903769af44cb3a49c49fd68](https://github.com/electron/electron-quick-start/tree/0ed07b8a7b21da2c9903769af44cb3a49c49fd68)

Electron 7.1.1 に更新されました。index.html に Content Security Policy の meta タグが追加されました。その後の修正で X-Content-Security-Policy の指定は不要になりました。

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <!-- https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP -->
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'">
    <meta http-equiv="X-Content-Security-Policy" content="default-src 'self'; script-src 'self'">
    <title>Hello World!</title>
  </head>
  <body>
    <h1>Hello World!</h1>
    We are using Node.js <span id="node-version"></span>,
    Chromium <span id="chrome-version"></span>,
    and Electron <span id="electron-version"></span>.

    <!-- You can also require other files to run in this process -->
    <script src="./renderer.js"></script>
  </body>
</html>
```

## 2021/10/07 デフォルト CSS ファイルを追加
[4ff40bc838cc4c009f569300a5ba8e6a68924223](https://github.com/electron/electron-quick-start/tree/4ff40bc838cc4c009f569300a5ba8e6a68924223)

Electron 15.1.1 に更新されました。デフォルトの CSS ファイルが追加されました。

- index.html
- main.js
- package.json
- preload.js
- renderer.js
- **styles.css**

## 2022/01/03 inline CSS の許容
[bc9cce16d583ba3b69aae318b3904d8a04979058](https://github.com/electron/electron-quick-start/tree/bc9cce16d583ba3b69aae318b3904d8a04979058)


Electron 16.0.5 に更新されました。inline CSS を 許可する PR がマージされています。

[CORS: Allow inline CSS and style attributes by Kilian · Pull Request #550 · electron/electron-quick-start](https://github.com/electron/electron-quick-start/pull/550)

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <!-- https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP -->
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'">
    <link href="./styles.css" rel="stylesheet">
    <title>Hello World!</title>
  </head>
  <body>
    <h1>Hello World!</h1>
    We are using Node.js <span id="node-version"></span>,
    Chromium <span id="chrome-version"></span>,
    and Electron <span id="electron-version"></span>.

    <!-- You can also require other files to run in this process -->
    <script src="./renderer.js"></script>
  </body>
</html>
```

## まとめ
以上、electron-quick-start の変更から Electron プログラミングモデルの変遷を見てきました。ここ数年で renderer プロセスは Node.js から分離されたブラウザでの JavaScript 実行モデルに近づいたと言えるでしょう。

electron-quick-start のコードは最小限なもので、実開発でどのようにコードを書くべきというところまでは示していませんが、標準的な構成を示すという意味で重要な存在です。

今後は、ES Modules 対応などが入ってくるのではないかと予想しています。
