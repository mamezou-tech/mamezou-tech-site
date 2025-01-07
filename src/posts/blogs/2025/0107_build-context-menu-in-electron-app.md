---
title: Electron アプリでコンテキストメニューを出す方法
author: masahiro-kondo
date: 2025-01-07
tags: [electron]
image: true
---

## はじめに
昨年 Electron v33.2.1 にアップデートしたら急にアプリのコンテキストメニューが出なくなりました。

最初は利用してるライブラリ（後述）が追従できていないのではないかと思い調べたのですが、ライブラリのリポジトリには特にそういう issue は上がっておらず、Electron のバージョンを戻してしばらく放置していました。その後 Electron v33.3.0 が出たのでリリースノートを見ると Electron 本体でコンテキストメニューのイベントのバグが発生していた模様です。

@[og](https://github.com/electron/electron/pull/44953)

Electron を v33.3.0 に上げると無事コンテキストメニューが出るようになりました。

コンテキストメニューのハンドリングには定番の electron-context-menu を使っています。

@[og](https://www.npmjs.com/package/electron-context-menu)

あまり Electron に慣れてなかった時に便利なので導入しました。過去に Electron のバージョンアップに伴い、何度か動かなくなったのでデバッグして PR 出して直してもらったりしてたのですが、動かなくなるたびデバッグするのも面倒になってきました。

当然 Electron はメニュー API を提供しており、`popup` メソッドを使えばコンテキストメニューも出せますし、`context-menu` イベントのパラメータにあらゆるコンテキスト情報が入っているので、大抵の処理は実装できることが分かってきました[^1]。そこで、もうコンテキストメニューは自前で構築して依存ライブラリを減らそうと思いました。

[^1]: 初期の Electron ではコンテキストメニューを出すのがとても面倒だったと記憶してます。おそらく electron-context-menu の開発のモチベーションは簡易な API 提供にあったのでしょう。

:::info
Electron のバージョンアップに伴うアーキテクチャの変遷については、これまでかなり取り上げてきました。破壊的変更が多く、対応すべき Window クラスや View クラスも増え続けており、ライブラリ作者のメンテナンスにもかなりの手間がかかると思います。

- [electron-quick-start のコミット履歴で見る Electron プログラミングモデルの変遷](/blogs/2022/02/14/history-of-electron-quick-start/)
- [Electron - WebView から BrowserView に移行する](/blogs/2022/01/07/electron-browserview/)
- [Electron に BrowserView を置き換える WebContentsView が実装されたので見てみる](/blogs/2024/03/06/electron-webcontentsview/)

Electron 自体の進化もありますが、依存している Chrome が全人類が使っているアクティブなプロジェクトなので致し方ない面もあると思います。
:::

## Electron の Menu API
Electron のメニュー API やイベントについては公式ドキュメントの以下の箇所に載っています。

- [https://www.electronjs.org/docs/latest/api/menu#menupopupoptions](https://www.electronjs.org/docs/latest/api/menu#menupopupoptions)
- [https://www.electronjs.org/docs/latest/api/web-contents#event-context-menu](https://www.electronjs.org/docs/latest/api/web-contents#event-context-menu)

メニュー API とイベントによりコンテキストメニューを実装するのはおよそ以下のようなコードになります[^2]。

[^2]: ESM 対応のコードとなります。Electron アプリの ESM 対応については、「[Electron v28 で ESM サポートが入ったので試す](/blogs/2023/12/06/electron-esm-support-available/)」で紹介しています。

```javascript
import { app, BrowserWindow, Menu } from 'electron';

let mainWindow;

app.whenReady().then(() => {
  createWindow();

  mainWindow.webContents.on('context-menu', (e, params) => {  // 1
    const menuTemplate = buildMenuTemplate(params);           // 2
    const contextMenu = Menu.buildFromTemplate(menuTemplate); // 3
    contextMenu.popup({ window: mainWindow.webContents });    // 4
  });
});

function buildMenuTemplate(params) {
  const menuTemplate = [
    {
      label: 'menu1',
      click: () => { console.log('menu1 clicked'); }
    },
    {
      label: 'menu2',
      click: () => { console.log('menu2 clicked'); }
    },
  ];
  return menuTemplate;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    // プロパティ設定
  });
  // サイト読み込みなど
}
```

1. コンテキストメニューを表示するウィンドウ(この例では `BrowserWindow`) の `webContents` プロパティで `context-menu` イベントをハンドリングします。引数の `params` オブジェクトには表示しているコンテンツに関するあらゆる情報が入ってきます。
2. 自前で用意した buildMenuTemplate 関数で `MenuItem` オブジェクトの配列を構築しています。`params` の値によって、各メニュー項目の可視性を制御したりもできます。実際のアプリでは、この buildMenuTemplate のような関数の実装量が一番多くなります。 
3. `Menu.buildFromTemplate` メソッドを使用して、コンテキストメニューを生成します。
4. コンテキストメニューの `popup` メソッドを使用してコンテキストメニューを表示します。

:::info
webContens オブジェクトは以下のクラスに存在します。

- BrowserWindow
- BrowserView
- WebContentsView

BrowserView は非推奨のため、`BrowserView.webContents` オブジェクトも非推奨になっています。
また、WebContentsView のコンテナとして使用する BaseWindow には webContents オブジェクトがありません。以下の記事で構造を解説しています。

[Electron - WebContentsView 時代のアプリ構造を可視化してみる](/blogs/2024/08/28/electron-webcontentsview-app-structure/)
:::

## リンクの識別、選択テキストの取得
Electron アプリではクリック位置のコンテンツによるコンテキストメニューの出し分けが重要となります（コンテキストなので当たり前ですが）。筆者のアプリで多用しているのはリンククリックと選択テキストのハンドリングです。

リンクを右クリックした場合に有効化されるメニューの例です。クリックされたのがリンクかどうかは params オブジェクトの `linkURL` プロパティに値が設定されているかで判定できます。

```javascript
// メニューテンプレートの配列定義の抜粋
    {
      label: '開く',
      click: () => { openLink(params.linkURL); },  // 1
      visible: params.linkURL                      // 2
    },
```
1. params の linkURL を開く自前の openLink 関数を呼んでいます。openLink 関数では Electron の別ウィンドウを開く処理や、ブラウザでリンクを開く処理を `shell.openExternal` メソッドなどで実装します。
2. `visible` プロパティで `params.linkURL` に URL の文字列が設定されている場合のみメニューを表示するようにしています。

実行したところです。
![open link](https://i.gyazo.com/aed4101103ed4909c8c14f338a07150b.png)

コンテンツのテキストが選択されている場合に有効化されるメニューの例です。選択されたテキストを Google 検索する機能を実装しています。クリックされたのが選択されたテキストかどうかは `params.selectionText` に有効な値が入っているかどうかで判定できます。

```javascript
// メニューテンプレートの配列定義の抜粋
    {
      label: `Google で '${params.selectionText}' を検索`, // 1
      click: () => {                                        // 2
        const url = new URL('https://www.google.com/search');
        url.searchParams.set('q', params.selectionText);
        shell.openExternal(url.toString());
      },
      visible: params.selectionText.trim().length > 0      // 3
    },
```
1. メニューに選択された文字列を表示しています。
2. Google 検索を実行する処理を実装しています。
3. `visible` プロパティでテキストが選択されている場合のみメニューを表示するようにしています。

実行したところです。
![Google search](https://i.gyazo.com/1c01a4f433c30991b2183ed4f20c5d86.png)

## 画像のコピーなど
リンクや選択テキスト以外にも、表示されている画像や画像 URL をクリップボードにコピーする処理は欲しくなると思います。

画像コピーは `webContents.copyImageAt` という便利メソッドで簡単に実装できます。画像の URL も params オブジェクトの `srcURL` で取得できます。

ポイントは `visible` 属性を params オブジェクトの `mediaType` プロパティで判定するところです。

```javascript
// メニューテンプレートの配列定義の抜粋
    {
      label: '画像をコピー',
      click: () => { content.copyImageAt(params.x, params.y); },
      visible: params.mediaType === 'image'
    },
    {
      label: '画像の URL をコピー',
      click: () => { clipboard.writeText(params.srcURL); },
      visible: params.mediaType === 'image'
    },
```

実行したところです。
![copy image](https://i.gyazo.com/4f4f2dbb42c8a4349c69a7dca22d4e66.png)

## さいごに
長年使っていた electron-context-menu とお別れできました。やってみたら簡単でした。メニューの場合、ライブラリを使用して削減できるコード量よりメニュー定義自体のコード量の方が多いので、さほど冗長になった感はありません。気になる場合は、細かい仕様追加に備えて別モジュールに切り出すぐらいでいいかなと思います。
electron-context-menu は独自に webContents の編集機能を実装していたり、イベントハンドラなどのリソース解放もちゃんとやっていたりするので、品質は高く、今現在使用することには問題ありません。とはいえ、メンテナンスされなくなるリスクもあるので、可能であれば Electron の API だけで実装するのがおすすめです。
