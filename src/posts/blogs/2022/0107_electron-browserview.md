---
title: "Electron - WebView から BrowserView に移行する"
author: masahiro-kondo
date: 2022-01-07
tags: electron
---

Electron には Web コンテンツを表示する仕組みとして当初から WebView が提供されており、多くのアプリで採用されています。現在 WebView のドキュメント冒頭には使用を避けるよう警告が書かれています。

https://www.electronjs.org/ja/docs/latest/api/webview-tag

> 私たちは webview タグを使用せずに、iframe や Electron の BrowserView、または埋め込みコンテンツを完全に避けるアーキテクチャにするといった代替案の検討を推奨しています。

現在推奨されている Web コンテンツの埋め込み方式は BrowserView です。BrowserView はデザインツールの開発元である Figma が Electron にコントリビュートして実現したとのことです。

[Introducing BrowserView for Electron](https://www.figma.com/blog/introducing-browserview-for-electron/)

Figma の Web アプリは WebGL や WebAssembly など Web 標準の技術で高度な操作性を実現しているようです。しかし Electron WebView ではうまく動かない機能が多く、実行スピードも遅かったようです。WebView は Chromium の内部モジュールで Chrome 拡張に使用されており、大きな変更は難しくバグ修正も遅いという状況でした。そこで Electron 独自の BrowserView というオルタナティブが誕生しました。

BrowserView と WebView の違いは以下のようになります。

|  | WebView | BrowserView |
|:--|:--|:--|
| プロセス | renderer | main |
| 実装 | OOPIF(Out-of-Process iframe) - DOM 階層の一部 | BrowserWindow (Electron アプリのメイン Window) の子 Window - OS 階層の一部 |
| DOM 要素としての利用 | 可 | 不可 |

BrowserView は Chrome のタブのような動作モデル(独立したプロセスとして実行される)のようです。

BrowserView を採用するにあたってのメリデメをあげてみます。

- メリット
  - 高速に動作する
  - セキュア
    - webPreferences の nodeIntegration をデフォルトのまま `false` にできる
    - webPreferences の contextIsoration をデフォルトのまま `true` にできる
    - WebPreferences の webviewTag をデフォルトのまま `false` にできる
  - 継続的なメンテナンスが期待できる(メジャーな商用サービスで利用されている)
  - BrowserWindow / WebView 同様に埋め込みコンテンツを利用できる
- デメリット
  - WebView と違ってレイアウトに HTML/CSS が利用できない
  - 実験的(Exprerimental) とマークされた API ばかりなので将来の破壊的変更を覚悟しなければならない
  - BrowserView をサポートする NPM パッケージがまだ少ない

Electron のセキュリティポリシーは webPreferences オブジェクトのプロパティのデフォルト値として表明されており、バージョンが上がるたびセキュアな方に変更されています。WebView でも webViewTag 以外の値を変えずに実装は可能ですが、WebView 周りのエコシステムに乗るとどうしてもデフォルト値の変更が必要になるケースが多いのです。BrowserView を使うことも含めて、このポリシーに沿う形で実装することが求められている状況です[^1]。

[^1]: Web コンテンツを簡単にホストしてデスクトップアプリ化できることが Electron のウリだったはずなのに、ハシゴを外されている感はありますが。

実験的とされる API について、リリース以降の breaking changes はいくつかのメソッドやプロパティの廃止、大きな機能追加は複数 BrowserView 登録がありました。最近は細かなバグフィクスだけなので、かなり枯れてきたと見てよいのではないでしょうか。

Slack のアプリも2017年に BrowserView へ移行しています[^2]。もう5年も前です。

[^2]: React Redux を Electron の IPC 通信にうまく適用して移行した模様です。

[Growing Pains: Migrating Slack’s Desktop App to BrowserView - Slack Engineering](https://slack.engineering/growing-pains-migrating-slacks-desktop-app-to-browserview/)

BrowserView の API 仕様については、公式ドキュメントを参照してください。

[BrowserView | Electron](https://www.electronjs.org/ja/docs/latest/api/browser-view)

また、BrowserView の追加・削除などのメソッドについては、BrowserWindow のドキュメントにあります。

[BrowserWindow | Electron](https://www.electronjs.org/ja/docs/latest/api/browser-window)

BrowserView の簡単な利用例を見てみましょう。HTML/JavaScript のアセットを表示する例です。setupView 関数内部で BrowserView のインスタンスを生成し BrowserWindow の addBrowserView メソッドで追加しています。BrowserWindow に合わせて自動リサイズするようにしています。

```js
// main.js
const { BrowserView, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
  });
  setupView('local.html');
}

function setupView(file) {
  const view = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });
  mainWindow.addBrowserView(view);
  view.setBounds({ x: 0, y: 0, width: bounds.width, height: bounds.height });
  view.setAutoResize({ width: true, height: true, horizontal: true, vertical: true });
  view.webContents.loadFile(file);
}
```

ロードした HTML の JavaScript(renderer プロセス)で UI イベントを拾って main プロセスで受信できます。その場合は preload する JavaScript で IPC 通信をラップし、renderer プロセスからその関数を呼び出すよう実装します。BrowserWindow と同じプログラミングモデルです。

前述の通り BrowserView は CSS によるレイアウトはできませんが、setBounds で Programmatic に頑張れば、ある程度の要件なら実装できそうです[^3]。

[^3]: とはいえ複雑で柔軟なレイアウトは厳しいので、メインのコンテンツは Window を全体的に占有するものに向いていると言えます。

BrowserView は BrowserWindow に対して複数追加でき、スクリーンのトップに表示させる View を切り替え可能です。また、BrowserWindow の webContents との混在も可能です。これを活かして複数の BrowserView を(疑似的な)タブで切り替える簡易ブラウザ的アプリを作成しました。アプリのスクリーンショットです。

![](https://i.gyazo.com/6b8c52054c9dfc41e10abedbd8cba5d5.gif)

Electron の公式サイトとローカルの HTML をタブ替わりのボタンで切り替えます。ローカル HTML のボタンをクリックすることでも BrowserView が切り替わり Electron 公式サイトを表示します。タブ領域は HTML を BrowserWindow にロードして CSS でスクリーン上部に配置しています[^4]。

[^4]: タブ領域は BrowserView でも実装できます。ここでは CSS でレイアウトしたいこと、UI 用の特殊な BrowserView を作りたくない(コンテンツのレンダリングに徹したい)ことから、BrowserWindow に実装しました。

main プロセスの createWindow 関数のコードです。setAutoResize は BrowserWindows のサイズに追従するのでタブ領域の調整ができないため、自前でリサイズしています。タブ領域用 HTML (tabbar.html) と BrowserView 用 HTML (local.html) それぞれに preload ファイルを用意しています。

```js
// main.js
function createWindow () {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });
  setupView('https://electronjs.org');
  setupViewLocal('local.html');
  mainWindow.loadFile('tabbar.html');

  ['resize'].forEach(e => {
    mainWindow.on(e, () => {
      mainWindow.getBrowserViews().forEach((view) => {
        resizeView(view);
      })
    });
  });
}

function setupView(url) {
  const view = new BrowserView();
  mainWindow.addBrowserView(view);
  resizeView(view);
  view.webContents.loadURL(url);
}

function setupViewLocal(file) {
  const view = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, 'local_preload.js')
    }
  });
  mainWindow.addBrowserView(view);
  resizeView(view);
  view.webContents.loadFile(file);
}

function resizeView(view) {
  const bound = mainWindow.getBounds();
  view.setBounds({ x: 0, y: 30, width: bound.width, height: bound.height - 30 });
}
```

タブ領域の renderer プロセスから main プロセスにメッセージを送信するための contextBridge です。各タブ用に IPC 通信をラップしたメソッドを切っています。

```js
// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld(
  'api', {
    tab1: async () => await ipcRenderer.invoke('tab1'),
    tab2: async () => await ipcRenderer.invoke('tab2')
  }
);

```

タブ領域の renderer プロセスでは、ボタンクリックで contextBridge にラップされたメソッドを呼びます。

```js
// tabbar.js
onload = () => {
  document.querySelector('#tab1').addEventListener('click', e => {
    window.api.tab1();
  });
  document.querySelector('#tab2').addEventListener('click', e => {
    window.api.tab2();
  });
}
```

BrowserView 用の contextBridge です。タブ領域と同様です。

```js
// local_preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld(
  'localApi', {
    switchPage: async () => await ipcRenderer.invoke('switch-to-electronjs')
  }
);

```

BrowserView 用の renderer プロセスです。タブ領域と同様です。

```js
// local.js
onload = () => {
  document.querySelector('#button1').addEventListener('click', e => {
    console.log(window.localApi.switchPage());
  });
}
```

最後に main プロセスの IPC 受信部分です。イベントに応じて BrowserWindow の setTopBrowserView メソッドで 指定の BrowserView を最上位に切り替えています。

```js
// from tabbar
ipcMain.handle('tab1', e => {
  mainWindow.setTopBrowserView(mainWindow.getBrowserViews()[0]);
});

// from tabbar
ipcMain.handle('tab2', e => {
  mainWindow.setTopBrowserView(mainWindow.getBrowserViews()[1]);
});

// from local
ipcMain.handle('switch-to-electronjs', e => {
  mainWindow.setTopBrowserView(mainWindow.getBrowserViews()[0]);
});
```

Electron のセキュリティポリシーに従いつつ、BrowserView 毎に独立した renderer プロセスで UI イベントを処理できました。全体のソースコードは以下のリポジトリに置いています。

[GitHub - mamezou-tech/electron-example-browserview: Example of Electron app that registers and switches between multiple BrowserViews.](https://github.com/mamezou-tech/electron-example-browserview)

WebView からの移行は大丈夫そうという所感は得られました。Electron で Web コンテンツを表示するケースでは、パフォーマンスとセキュリティ、継続性の観点からも BrowserView を使っていきたいところです。
