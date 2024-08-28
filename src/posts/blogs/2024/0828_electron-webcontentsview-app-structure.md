---
title: Electron - WebContentsView 時代のアプリ構造を可視化してみる
author: masahiro-kondo
date: 2024-08-28
tags: [electron]
image: true
---

## はじめに
今年の春頃に WebContentsView が Electron に導入され、v30.0.0 から正式版になりました。これに伴い、従来の BrowserView は deprecated になりました。

[Electron に BrowserView を置き換える WebContentsView が実装されたので見てみる](/blogs/2024/03/06/electron-webcontentsview/)

元々 BrowserView や WebContentsView は、マルチビューなアプリのためのコンポーネントです。BrowserView を使う場合と WebContentsView とではアプリの構造がやや異なっていると感じたので可視化してみることにしました。

## BrowserWindow によるシングルビューアプリの構造
最初にシングルビューのアプリから始めます。Electron ではシングルビューのアプリ構造はおよそ以下のようになっています。1つのウィンドウに1つの Renderer プロセスが使用されます。

![](/img/blogs/2024/0828_electron-webcontentsview-app-structure/singleview-app-structure.drawio.png)

Main プロセスで BrowserWindow が webContents を保持し Web ページのロードを行います。webContents は Web ページのレンダリングと制御を担当します。Renderer プロセスと Main プロセスとの連携は、preload スクリプトによる Context Bridge を経由して行われます。

- [BrowserWindow | Electron](https://www.electronjs.org/ja/docs/latest/api/browser-window)
-  [webContents | Electron](https://www.electronjs.org/ja/docs/latest/api/web-contents)

:::info
Electron アプリの構造については、以下の記事もご参照ください。

[electron-quick-start のコミット履歴で見る Electron プログラミングモデルの変遷](/blogs/2022/02/14/history-of-electron-quick-start/)
:::

## BrowserWindow + BrowserView 時代のアプリ構造
BrowserView を使うとメインの BrowserWindow に複数のビューを保持して、それぞれ個別の Renderer プロセスを管理できました。

![](/img/blogs/2024/0828_electron-webcontentsview-app-structure/browserview-app-structure.drawio.png)

BrowserWindow も BrwoserView も webContents で Web ページを描画できるため、メインの BrowserWindow でも何かを描画する場合は、BrowserWindow と BrowserView でそれぞれ renderer スクリプト、preload スクリプトを用意していました。

- [BrowserView | Electron](https://www.electronjs.org/ja/docs/latest/api/browser-view)

:::info
BrowserView は実験的 API ということもあってか BrowserWindow と密結合な形で実装されていました。

BrowserWindow が BrowserView を直接保持する形で、`addBrowserView`、`removeBrowserView` などのメソッドが提供されていました。
:::

## マルチビューに特化した BaseWindow + WebContentsView によるアプリ構造
WebContensView は BrowserWindow ではなく BaseWindow をメインのウィンドウとして使用することが前提になっています。ドキュメントには次のような注釈があります。

> BaseWindow は1つのウィンドウに複数の Web ビューを柔軟に作成する方法を提供します。

WebContentsView は BaseWindow の contentView プロパティに各ビューを保持します。BaseWindow 自体はもはや webContents プロパティを持ちません。contentView プロパティで WebContentsView を管理するだけになり、レンダリングや制御に関しては、各 WebContentsView に移譲しています[^1]。

[^1]: contentView は WebContentsView 導入に伴い新設された View クラスで、WebContentsView はこのクラスを継承しています。

![](/img/blogs/2024/0828_electron-webcontentsview-app-structure/webcontensview-app-structure.drawio.png)

BaseWindow の contentView プロパティは 各 WebContentsView を ChildView として保持します。BaseWindow は renderer プロセスを持たないので、renderer スクリプトや preload スクリプトは、各 WebContentsView 用に用意することになります。

- [BaseWindow | Electron](https://www.electronjs.org/ja/docs/latest/api/base-window)
- [WebContentsView | Electron](https://www.electronjs.org/ja/docs/latest/api/web-contents-view)
- [View | Electron](https://www.electronjs.org/ja/docs/latest/api/%E8%A1%A8%E7%A4%BA)

:::info
contentView を唯一の WebContentsView とすることでシングルビューアプリを構成できますが、その構成の場合は 従来通り BrowserWindow を使う方がシンプルです。BaseWindow のドキュメントにも以下のようにあります。

> フルサイズの Web ビューが1つしかないウィンドウの場合は、BrowserWindow クラスの方が簡単なオプションになる場合があります。
:::

## BrowserView から WebContentsView への移行
マルチビューのアプリを BrowserView から WebContentsView へ移行する手順を簡単に紹介します。

1. BrowserWindow を BaseWindow に置き換える
2. BrowserWindow の webContents を使っている場合は、専用の WebContentsView を追加し preload スクリプトを移動する
3. BrowserView を使っている箇所は WebContentsView に置き換える
4. BrowserView の表示順を制御している場合は自前で実装する

4について、BrowserView の `setTopBrowserView` 相当のメソッドが WebContentsView にないため、順序を入れ替える処理を実装する必要があります。

GitHub の mamezou-tech オーガニゼーションで BrowserView のサンプルアプリを公開しています。

[GitHub - mamezou-tech/electron-example-browserview: Example of Electron app that registers and switches between multiple BrowserViews.](https://github.com/mamezou-tech/electron-example-browserview)

:::info
このリポジトリは、以下の記事を書いたときに作成したものです。

[Electron - WebView から BrowserView に移行する](/blogs/2022/01/07/electron-browserview/)
:::

今回のこのリポジトリのサンプルを WebContentsView に移行しました。作成した PR は以下です。

[feat: Replace BrowserView to WebContentsView by kondoumh · Pull Request #5 · mamezou-tech/electron-example-browserview](https://github.com/mamezou-tech/electron-example-browserview/pull/5)

リポジトリ名にはまだ BrowserView が入ったままですが。

## さいごに
以上、WebContentsView によるマルチビューアプリの構造について、シングルビューアプリや BrowserView 時代のマルチビューアプリとの違いを纏め、簡単な移行サンプルも示しました。

ある程度多機能なアプリでは、マルチビュー構造を採用することが多いと思います。マルチビューアプリではメインウィンドウ側にもタブによる切り替えやリサイズ用の UI、レイアウト機能などが欲しいところです。今のところ自前で実装するしかないため、Electron 側でなんらかサポートがあるといいなと思います。

ともあれ、今後 Electron では WebContentsView を使ってマルチビューアプリを実装していきましょう。

:::info
Tauri ではマルチビューに対応した Servo ベースの WebView を開発中らしく、そのために 専用のブラウザプロジェクト Verso まで立ち上げています。

- [NLnet; Servo improvements for Tauri](https://nlnet.nl/project/Verso/)
- [GitHub - versotile-org/verso: A web browser that plays old world blues to build new world hope](https://github.com/versotile-org/verso)

現状、Tauri は環境に入っている WebView 実装 (macOS なら WebKit、Windows なら Chromium など) を使用しているため、クロスブラウザ問題もあります。Tauri で真にクロスプラットフォームなマルチビューアプリが簡単に作れるようになったら、乗り換えたい気もします。

こちらも正式公開が楽しみですね。
:::
