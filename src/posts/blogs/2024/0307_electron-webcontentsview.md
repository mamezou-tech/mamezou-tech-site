---
title: Electron に BrowserView を置き換える WebContentsView が実装されたので見てみる
author: masahiro-kondo
date: 2024-03-06
tags: [electron]
image: true
---

## はじめに

Electron v29 のリリースで将来的に BrowserView の置き換えとなる WebContentsView の実装が入りました。

> Added WebContentsView and BaseWindow, replacing the now-deprecated BrowserView APIs.

[Release electron v29.0.0 · electron/electron](https://github.com/electron/electron/releases/tag/v29.0.0)

取り込まれた PR は以下です。

[feat: replace BrowserView with WebContentsView by trop[bot] · Pull Request #40759 · electron/electron](https://github.com/electron/electron/pull/40759)

BrowserView はこのリリースで deprecated になりました。

> The BrowserView class is deprecated, and replaced by the new WebContentsView class.

[electron/docs/api/browser-view.md at main · electron/electron](https://github.com/electron/electron/blob/main/docs/api/browser-view.md)

:::info
BrowserView は Web コンテンツの埋め込み方式として推奨されてきました。それ以前には WebView が広く利用されていました。BrowserView については以下の記事で紹介しています。

[Electron - WebView から BrowserView に移行する](/blogs/2022/01/07/electron-browserview/)
:::

従来の BrowserWindow とは別に BaseWindow が追加されました。記事執筆時点では BaseWindow と WebContentsView の API はまだドキュメントには載っていませんが、リポジトリの以下のファイルが該当します。

- [electron/docs/api/base-window.md at main · electron/electron](https://github.com/electron/electron/blob/main/docs/api/base-window.md)
- [electron/docs/api/web-contents-view.md at main · electron/electron](https://github.com/electron/electron/blob/main/docs/api/web-contents-view.md)

base-window.md には「単一のウィンドウで複数の Web ビューを構成する柔軟な方法を提供」するとあります。BaseWindow と WebContentsView を組み合わせて複数 Web ビューのアプリを構築することを想定しているようです。

:::column:2024.04.26追記
Electron v30.0.0 がリリースされました。BrowserView の実装は削除され WebContentsView を使った Shim に置き換えられました。

[Electron 30.0.0 | Electron](https://www.electronjs.org/blog/electron-30-0)
:::

## 早速使ってみる

WebContentsView を試すには、Electron v30 の alpha リリースを使用する必要があります。

[electron-quick-start](https://github.com/electron/electron-quick-start) をダウンロードし、 `npm install` 実行後、以下のようにアルファ版をインストールします。

```shell
npm install electron@alpha
```

記事執筆時点の v30.0.0-alpha.4 でした。

:::info
Electron Forge でプロジェクト作成すると楽です。Electron Forge については以下の記事を参照してください。

[Electron Forge 入門](/blogs/2024/01/29/electron-forge-introduction/)
:::


BaseWindow と WebContentsView を使います。これらの API は、app の `ready` イベントが発行された後でないと利用できないため `app.whenReady().then()` の中で実装しています。

```javascript:index.js
const { app, BaseWindow, WebContentsView } = require('electron');

app.whenReady().then(() => {
  const win = new BaseWindow({ width: 800, height: 600 }); // 1

  const leftView = new WebContentsView();  // 2
  leftView.webContents.loadURL('https://electronjs.org');
  win.contentView.addChildView(leftView);  // 3

  const rightView = new WebContentsView(); // 4
  rightView.webContents.loadURL('https://github.com/electron/electron');
  win.contentView.addChildView(rightView); // 5

  leftView.setBounds({ x: 0, y: 0, width: 400, height: 600 }); // 6
  rightView.setBounds({ x: 400, y: 0, width: 400, height: 600 });
});
```
以下のステップで複数 Web ビューのアプリを構築しています。

1. BaseWindow を800x600のサイズで作成
2. WebContentsView を作成し、Electron 公式サイトを Web コンテンツとしてロード
3. BaseWindow に上記の WebContentsView を追加
4. 別の WebContentsView を作成し、Electron の GitHub リポジトリをロード
5. BaseWindow に上記の WebContentsView を追加
6. 2つの WebContentsView を BaseWindow の左右に配置

では実行してみます。

```shell
npm start
```

1つのウィンドウが左右2つに分割され、それぞれコンテンツが表示されました。

![sample app](https://i.gyazo.com/73b2a9b15ad4c33b911254d2dc9e42a9.png)

## WebContentsView 登場の背景
WebContentsView は遡ること2年前から準備が始まっていました。Electron の2022年リファクタまとめブログの「WebContentsView でのウインドウモデルのリファクタ」というセクションで紹介されています。

> 最初に予定している変更は、Chrome の WebContentsView を Electron の API で表向きに公開することです。これは既存の BrowserView API (名前に反して Chromium Views とは関係のない Electron 固有のコード) の後継となるものです。 WebContentsView が公開されれば、ウェブコンテンツを表示できる再利用可能な View オブジェクトができ、BrowserWindow クラスを純粋な JavaScript にする道が開かれ、さらにコードの複雑性が解消されます。

[メンテナサミット 2022 まとめ | Electron](https://www.electronjs.org/ja/blog/maintainer-summit-2022-recap)

Chrome ネイティブの WebContentsView を Electron から利用できるようにするためのリファクタリングだったようです。元々 BrowserView は Figma の開発者が貢献して WebView[^1] に対する代替として独自に実装されたものでした。ただ、この独自実装によりコードが複雑化していたようです。

[^1]: WebView もまた Chrome の内部モジュールの公開であり、Chrome では拡張のために使用されているようです。

## BrowserView と WebContentsView のギャップ
WebContentsView 自体は BrowserView と同様に扱えると思われますので、移行はさほど難しくないだろうと考えています。

BrowserWindow では BrowserView 用に以下の API が公開されており、BrowserView のコンテナとしての機能を提供しています。

- setBrowserView
- getBrowserView
- addBrowserView
- removeBrowserView
- setTopBrowserView
- getBrowserViews

[BrowserWindow | Electron](https://www.electronjs.org/ja/docs/latest/api/browser-window)

WebContentsView は新設された View クラスを継承しています。

[electron/docs/api/view.md at main · electron/electron](https://github.com/electron/electron/blob/main/docs/api/view.md)

BaseWindow は BrowserWindow のように直接的な API は提供せず、contentView プロパティ(実体は View クラス)経由で WebContentsView を管理します。View では管理用の API として以下が提供されています。

- addChildView
- removeChildView

BrowserWindow の setBrowserView/getBrowserView に相当するものは複数ビュー前提であれば不要だと思いますが、全ての ChildView を取得するメソッドは欲しいところです。

:::info:2024.8.27追記
全ての ChildView を取得するのは contentView のインスタンスプロパティ children で可能です。これは View の配列になっています。
:::

:::column: View の Z 軸入れ替え
BrowserWindow の setTopBrowserView のような Z 軸の順序を入れ替える便利 API も提供してほしいなと思います。addChildView のシグネチャは以下のように index 指定が可能なのでアプリ側でも実装できそうではありますが。

`view.addChildView(view[, index])`
 - `view` View - Child view to add.
 - `index` Integer (optional) - Index at which to insert the child view. Defaults to adding the child at the end of the child list.
:::

## さいごに
以上、これから主流になると思われる WebContentsView について軽く見てみました。Electron v30 では正式に使えるようになると思われます。
BrowserView はずっと experimental な API という位置付けでした。しばらくは deprecated な API として維持されるようですが、いずれは移行が必要になるでしょう。
