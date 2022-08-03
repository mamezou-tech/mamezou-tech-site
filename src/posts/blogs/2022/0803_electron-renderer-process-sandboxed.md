---
title: Electron v20 で有効化された Renderer プロセスサンドボックス化に対応する
author: masahiro-kondo
tags: electron
date: 2022-08-03
---

Electron v20 がリリースされました。

[Release electron v20.0.0 · electron/electron](https://github.com/electron/electron/releases/tag/v20.0.0)

Breaking Changes として、Renderer プロセスがデフォルトでサンドボックス化されました。

> Renderers are now sandboxed by default unless `nodeIntegration: true` or `sandbox: false` is specified.

:::info
Electron のプロセスサンドボックス化は、Chrome の機能を利用しており、Main プロセス以外はほとんどのシステムリソースへのアクセスを制限することで悪意のあるコードが引き起こす被害を制限するためのものです。
:::

Electron BrowserWindow の webPreferences のオプションで、`nodeIntegration` はデフォルトで false になっているため、これまでも Renderer プロセスでは Node モジュールを require して使うことはできませんでした。ただ、preload スクリプト[^1]については、`sandbox: false` だったため、Node モジュールを使うことができていました。

:::info
Electron アプリのアーキテクチャについては、過去記事「[electron-quick-start のコミット履歴で見る Electron プログラミングモデルの変遷](/blogs/2022/02/14/history-of-electron-quick-start/)」に詳細を書いています。
:::

[^1]: Renderer プロセスのスクリプトの前に読み込ませるスクリプトで Main プロセスとの通信に使用します。

preload スクリプトのサンドボックス化について、ドキュメントには以下のようにあります。

[プロセスのサンドボックス化 | Electron](https://www.electronjs.org/ja/docs/latest/tutorial/sandbox#プリロードスクリプト)

> レンダラープロセスがメインプロセスと通信できるようにするため、サンドボックス化したレンダラーにアタッチされるプリロードスクリプトでは Node.js API をポリフィルしたサブセットを利用できるようになっています。 Node の require に似た require 関数のモジュールを公開してありますが、これは以下 Electron や Node の組み込みモジュールのサブセットしかインポートできません。

サンドボックスが有効になった場合、preload スクリプトでは、Electron の Renderer プロセス用のモジュールしかインポートできなくなります[^2]。なので、サードパーティの Node モジュールは使えません。

[^2]: Clipboard や ipcRenderer など Electron の API のごく一部が対象です。

筆者が開発している非公式 Scrapbox アプリでは、preload スクリプトで node-fetch を使ってデータを取得するコードを書いていました[^3]。

[^3]: Renderer プロセスで使用できる fetch API ではデータ取得に必要な cookie 認証が使えないためです。

このため、v20 にアップデートすると、node-fetch がインポートされずデータが取得できなくなりました。もちろん `sandbox: false` を設定するとこれまで通りに動作します。しかし、このオプションもいずれ廃止される恐れがありますし、よりセキュアなコードにするために推奨される実装にする方がよいでしょう。

変更前の preload スクリプトのコードです。Renderer プロセスから呼び出すデータ取得 API を定義していました[^4]。

[^4]: Renderer プロセスからは、`window.api.fetchPageInfo` で呼び出せます。

```javascript
const { contextBridge, ipcRenderer } = require('electron');
const fetch = require('node-fetch');

contextBridge.exposeInMainWorld(
  'api', {
    fetchPageInfo: async url => {
      const res = await fetch(url, { headers: { /* credentials */ } });
      const data = await res.json();
      return data;
    },
    // 省略
  }
);
```

変更後の preload スクリプトです。node-fetch の使用をやめて、`ipcRenderer.invoke` を使って、Main プロセスに `fetch-page-info` メッセージを送り、データを取得します。

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld(
  'api', {
    fetchPageInfo: async url => {
      const data = await ipcRenderer.invoke('fetch-page-info', url);
      return data;
    },
    // 省略
  }
);
```

次に Main プロセスへのコード追加です。データ取得の関数を preload スクリプトから移動しました。IPC 通信のハンドラーを追加しています。Renderer プロセスから `fetch-page-info` メッセージを受信したらデータ取得関数を呼び出して Renderer プロセスに結果を返します。

```javascript
const fetch = require('node-fetch');

ipcMain.handle('fetch-page-info', async (e, url) => {
  const data = await fetchPageInfo(url);
  return data;
});

async function fetchPageInfo(url) {
  const res = await fetch(url, { headers: { /* credentials */ } });
  const data = await res.json();
  return data;
}
```

これで preload スクリプト(を含む Renderer プロセス)は Main プロセスとの IPC 通信だけのコードになりました。

IPC はプロセス間通信なので、ハンドラーの追加やデータのマーシャリング等が必要[^5]で、少し面倒です。しかし Main プロセス以外のプロセスはサンドボックス化するという Chrome のセキュリティ方式に Electron アプリも準拠していく必要はありますし、継続的な開発のためにも必要な措置と受け止めています。

[^5]: この例では JSON で結果を返しているので元のコードからの変更はありませんでした。
