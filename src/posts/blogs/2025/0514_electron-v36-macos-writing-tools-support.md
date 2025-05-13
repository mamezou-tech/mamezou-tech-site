---
title: Electron アプリから macOS Apple Intelligence の Writing Tools を使う
author: masahiro-kondo
date: 2025-05-14
tags: [electron, 生成AI]
image: true
---

## はじめに

先月末に Electron 36.0.0 がリリースされました。

- [Electron 36.0.0 | Electron](https://www.electronjs.org/blog/electron-36-0)

目玉機能として macOS の Apple Intelligence の Writing Tools をコンテキストメニュー経由で使用できるようになりました。

:::info
後述しますが、コンテキストメニューではなくメニューバーのアプリケーションメニューから Writing Tools を利用することは以前のバージョンの Electron でも可能です。Apple Intelligence を有効化するだけで、アプリに手を入れる必要はありません。
:::

## Apple Intelligence とは

Apple Intelligence は Apple のデバイスで提供される AI プラットフォームで、iOS 18.1、iPadOS 18.1、macOS Sequoia 15.1 以降で利用できます。日本語にも対応しています。Apple Intelligence を有効にすると、画像生成アプリが使えたり、Siri が ChatGPT と連携して賢くなったりするのですが、汎用的な機能として通常のアプリケーションで Writing Tools が使えるようになります[^1]。

[^1]: 日本語では「作文ツール」という名前になっています。

@[og](https://www.apple.com/jp/apple-intelligence/)

有効化は設定の「Apple Intelligence と Siri」から行います[^2]。

![Apple Intelligence](https://i.gyazo.com/6a17bb91198a07967a6acd061528963b.png)

[^2]: 筆者は Mac とはキーボードで対話するので Siri は有効にしていません。

Apple Intelligence を有効にすると、テキストを表示・編集するあらゆるネイティブアプリケーションでテキストを選択した状態で、アプリの「編集」メニューおよびコンテキストメニューから Writing Tools の機能を呼び出して、テキスト内容の要約や校正を行えます。

- [MacのApple Intelligenceで作文ツールを使用する](https://support.apple.com/ja-jp/guide/mac-help/mchldcd6c260/mac)

テキストエディットアプリケーションで、Writing Tools を呼び出すところ。コンテキストメニューの「作文ツール」のサブメニューから目的の機能を呼び出せます。

![context menu](https://i.gyazo.com/b4a3272aaadc3732283c80dbedf737e6.png)

## Electron のコンテキストメニューにおける Writing Tools サポート
コンテキストメニューで Writing Tools を使えるようにするという機能リクエストは、以下の issue で議論されていました。

@[og](https://github.com/electron/electron/issues/44445)

Electron v36 でリリースされた機能は、OS レベルのメニュー項目サポートを追加する以下の PR により実現されているようです。

@[og](https://github.com/electron/electron/pull/45138)

これは、メニュー構築時に WebFrameMain クラスのインスタンスを受け取るオプションにより有効化されます。

- [webFrameMain | Electron](https://www.electronjs.org/docs/latest/api/web-frame-main)

:::info
記事の冒頭に記載した通り、Apple Intelligence が有効になっていれば、既存の Electron アプリでも特に手を入れることなく、メニューバーから Writing Tools を利用できます。今回サポートされたのは TextArea などで選択されたテキストに対してコンテキストメニューから Writing Tools を利用したいというユースケースです。

![Writing tools added in app menu](https://i.gyazo.com/b2abbbe106c4ac1aa7da37b7189ea104.png)
:::

## Electron アプリのコンテキストメニューで Writing Tools を有効にする

メインウィンドウに、Web コンテンツを読み込むだけのベーシックな Electron アプリのコンテキストメニューで Writing Tools を使用できるようにするサンプルを示します。

:::info
Electron アプリでコンテキストメニューを表示するための方法については、以下の記事で紹介しています。

@[og](/blogs/2025/01/07/build-context-menu-in-electron-app/)
:::

やっていることは、通常のコンテキストメニュー表示で、WebContents の focusedFrame プロパティ(WebFrameMain のインスタンス) を取得して、contextMenu.popup の frame オプションに指定するだけです。
詳細はコード内コメントを参照していただければと思います。

```javascript
import { app, BrowserWindow, Menu } from 'electron';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow;

app.whenReady().then(() => {
  createWindow(); // メインウィンドウ作成

  // コンテキストメニュー処理
  mainWindow.webContents.on('context-menu', (e, params) => {
    // メインウィンドウの WebFrameMain クラスを取得
    const focusedFrame = mainWindow.webContents.focusedFrame;

    // メニューテンプレート作成
    const menuTemplate = buildMenuTemplate(params);
    // 本来は visible 属性は Electron 側で処理されるはずだが、最近処理してくれないので自前でフィルター
    const visibleItems = menuTemplate.filter(item => item.visible);

    // コンテキストメニュー作成
    const contextMenu = Menu.buildFromTemplate(visibleItems);
    contextMenu.popup({
      window: mainWindow.webContents,
      frame: focusedFrame, // WebFrameMain のインスタンスを設定する
    });
  });
});

// メインウィンドウ作成
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800, height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    }
  });
  mainWindow.loadFile('index.html');
}

// メニューテンプレート構築
function buildMenuTemplate(params) {
  const menuTemplete = [
     {
      label: 'Copy', // テキストコピー(role を使用)
      role: 'copy',
      visible: params.selectionText.trim().length > 0
    }
  ];
  return menuTemplete;
}
```

実行結果。「作文ツール」メニューからアプリのテキストデータを Writing Tools に渡して結果を得ることができます。テキストエリアで使うのが相性いいですね。

![Sample app](https://i.gyazo.com/19b3417c15807274917ac8dd1da8c65e.png)

:::info
上記のコードを Windows で動かした場合は、コードで指定したメニューの表示以外は特に何もしないので、プラットフォームを判定してコードを書き分ける必要はないようです。
:::

[拙作の Scrapbox アプリ](https://github.com/kondoumh/sbe)にも組み込んでみました。

![sbe with writing tools 1](https://i.gyazo.com/9ec1872f3865bfc14392ea6038713904.png)![sbe with writing tools 2](https://i.gyazo.com/ebc3c8ff08ffe6e75a9c483bbde53dad.png)

Scrapbox の編集画面は通常のテキストエリアとは異なるせいか、「置き換え」はうまく動作しませんでした[^3]。

[^3]: 一旦コピーしてから直接ペーストすれば OK でした。

## さいごに
クロスプラットフォームなアプリを作れる Electron ですが、OS ネイティブの便利機能をアプリに取り込めるのはよいことですね。各 OS と生成 AI の融合は今後も進んでいくでしょうし、Electron アプリもプラットフォームの進化に合わせて利便性が向上することになります。
