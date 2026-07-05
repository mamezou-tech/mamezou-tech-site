---
title: Deno 2.9 のデスクトップ機能を試してみた
author: masahiro-kondo
date: 2026-07-07
tags: [Deno]
---

## はじめに

Deno 2.9 リリースおめでとうございます。

@[og](https://deno.com/blog/v2.9)

Electron 大好きな自分としても気になるのはやはり Deno Desktop です。

Tauri と同様 WebView をバックエンドにする構成と Electron と同様 Chromium ベースの構成を選べるとのことで、これは試すしかないと思いました。

:::info
Deno ブログには以下のように書かれており、2.9 時点ではデスクトップ機能は実験的段階です。

> deno desktop is experimental in 2.9. The surface described here is stabilizing and some platform features are still landing.
:::

公式ドキュメントは以下にあります。

@[og](https://docs.deno.com/runtime/desktop/)

## 使ってみる

まずは 2.9 にアップグレードしておきます[^1]。

[^1]: 2026年7月6日現在の最新は 2.9.1 です。

```shell
deno upgrade
```

main.ts に `Deno.serve` を使って普通にサーバープログラムを書きます。

```typescript:main.ts
Deno.serve(() =>
  new Response(
    "<!DOCTYPE html><h1>Hello from Deno desktop </h1>",
    { headers: { "content-type": "text/html" } },
  )
);
```

同じディレクトリで `deno desktop main.ts` を実行します。

```shell
$ deno desktop main.ts

⚠ deno desktop is experimental and subject to change
Check main.ts
Compile main.ts to hello.dylib

Embedded Files

hello.dylib
└── main.ts (430B)

Files: 1.91KB
Metadata: 1.38KB
Remote modules: 12B

Downloading laufey webview backend for aarch64-apple-darwin (v0.4.0)
Download laufey-webview-aarch64-apple-darwin.tar.gz 97.44KiB/97.44KiB
Codesigning bundle with identity "-"
hello.app/Contents/MacOS/laufey_webview: replacing existing signature
hello.app/Contents/MacOS/hello.dylib: replacing existing signature
Bundle hello.app
```

最後の出力で、ルートに hello.app (macOS のアプリ実行ファイル)が生成されており、起動できます（Windows の場合は、hello.exe が生成されます）。

![Hello from Deno Desktop](https://i.gyazo.com/d1c1b83fcfe43fc06dbd6f5168392865.png)

Deno のコンセプト通り、追加のモジュールや設定なし(Out of the box)でデスクトップアプリが生成されました。

## deno desktop の開発体験

MHR (Hot Module Replacement) オプション付きで起動することで、ローカルの開発サーバを立ち上げ、コードの変更を検知してアプリのコンテンツの更新をしてくれます。

```
desktop --hmr main.ts
⚠ deno desktop is experimental and subject to change
Compile main.ts to file:///Users/kondoumh/Library/Caches/deno/desktop/5f4a00908e99d886/hello.dylib

Embedded Files

hello.dylib
└── main.ts (422B)

Files: 1.9KB
Metadata: 1.38KB
Remote modules: 12B

Running desktop app with HMR (watching /Users/kondoumh/dev/deno-study/desktop/hello)
Runtime loaded successfully from: /Users/kondoumh/Library/Caches/deno/desktop/5f4a00908e99d886/hello.dylib
Runtime started
[desktop] dylib path: "/Users/kondoumh/Library/Caches/deno/desktop/5f4a00908e99d886/hello.dylib"
Listening on http://127.0.0.1:52958/
```

main.ts のコードを書き換えると即座に画面に反映されますし、

:::info
Electron では HMR は標準では利用できず、別途 Forge などで開発サーバーを起動する必要があります。

@[og](https://developer.mamezou-tech.com/blogs/2024/01/29/electron-forge-introduction/)
:::

## UI の ローカル HTTP サービスによる実現

Electron (の Forge など) ではローカルサーバーの利用はあくまで開発時だけで、デプロイするとアセットは file:// の URL で読み込まれます。これに対し Deno Desktop はデプロイしたバイナリでもローカルサーバーが起動し、空きポートを自動で割り当て、UI のレンダリングを処理します。このサーバーは完全に組み込みであり、外部に公開されることはありません。開発者はポートの衝突を心配する必要はありません。この「開発時も、ビルドされたバイナリでもローカル HTTP サーバーで UI を提供する実行モデルにより

- 開発時とデプロイ時の挙動に差がない
- コンテンツはブラウザとデスクトップで同じ動きをする
- Next.js などのフレームワークがそのままデスクトップアプリの中で動く

といったメリットが得られます。

@[og](https://docs.deno.com/runtime/desktop/serving/)

## DevTools の起動

Electron や Tauri と同様、DevTools によるデバッグが可能です。BrowserWindow を起動し、`openDevtools` メソッドを呼ぶだけです。

```typescript
const win = new Deno.BrowserWindow({ 
  title: "My Deno Desktop App", 
  width: 800, 
  height: 600,
});

win.openDevtools();

```

@[og](https://docs.deno.com/runtime/desktop/devtools/)

:::info
いまのところ、DevTools のフルサポートはバックエンドを `cef` にしている時のみです。

以下のように、指定して起動する必要があります。

```shell
deno desktop --hmr --backend=cef main.ts
```
:::

![open devtools](https://i.gyazo.com/a6cba882a3c2b115a1c98acd1a5ff2c5.png)

## バックエンドとフロントエンドの通信(Bindings)

Electron の iPC 通信は render.js と main.js を preload.js 経由でブリッジする必要があり、かなり面倒です。Deno デスクトップでは BrowserWindow にバインドした関数を `bindings` というグローバルオブジェクトにより簡単に呼び出すことができます。

Deno ランタイムとレンダリングバックエンドはスレッドやプロセスとして動作し、呼び出しはプロセス内チャネルを介して行われます。
ソケット通信やプロセス間のスケジューリングは起きないそうです。

Electron の ipcMain / ipcRenderer、Tauri の invoke で発生するような、ソケットベースのプロセス間通信を回避できるとのことです。

実際のコードで見てみましょう。

```typescript
const win = new Deno.BrowserWindow({ 
  title: "Bindingsのテスト", 
  width: 800, 
  height: 600,
});

// ==========================================
// 1. バックエンド側：フロントから呼ばれる関数を登録
// ==========================================
win.bind("getSystemInfo", async (userName) => {
  console.log(`[Deno側] フロントエンドから呼ばれました！ 引数: ${userName}`);
  
  // Denoの機能を使ってOSの情報を取得
  const denoVersion = Deno.version.deno;
  const os = Deno.build.os;

  // 少し重い処理をシミュレート（0.5秒待つ）
  await new Promise(resolve => setTimeout(resolve, 500));

  // フロントエンドに返すデータ（JSON化できるものなら何でもOK）
  return {
    message: `こんにちは、${userName}さん！`,
    os: os,
    denoVersion: denoVersion
  };
});

// ==========================================
// 2. フロントエンド側：画面のHTMLを返す
// ==========================================
Deno.serve(() => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Bindings Test</title>
    </head>
    <body>
      <h1>Deno Desktop Bindings</h1>
      <button id="btn">システム情報を取得</button>
      <pre id="result">ここに結果が出ます</pre>

      <script>
        // ボタンが押された時の処理
        document.querySelector('#btn').addEventListener('click', async () => {
          const resultArea = document.getElementById('result');
          resultArea.textContent = "取得中...";

          try {
            // 💡 bindings を使ってバックエンドの関数を呼び出す
            const data = await bindings.getSystemInfo("kondoumh");
            
            // 結果を画面に表示
            resultArea.textContent = JSON.stringify(data, null, 2);
          } catch (error) {
            resultArea.textContent = "error: " + error.message;
          }
        });
      </script>
    </body>
    </html>
  `;

  return new Response(html, {
    headers: { "content-type": "text/html" },
  });
});
```

すごくシンプルです。ネイティな OS 機能と Web UI を連携させるのが簡単なところがいいですね。

@[og](https://docs.deno.com/runtime/desktop/bindings/)

## メニュー の利用

アプリケーションメニュー

```typescript
win.setApplicationMenu([
  {
    submenu: {
      label: "File",
      items: [
        {
          item: {
            label: "New",
            id: "new",
            accelerator: "CmdOrCtrl+N",
            enabled: true,
          },
        },
        {
          item: {
            label: "Open…",
            id: "open",
            accelerator: "CmdOrCtrl+O",
            enabled: true,
          },
        },
        "separator",
        {
          item: {
            label: "Save",
            id: "save",
            accelerator: "CmdOrCtrl+S",
            enabled: true,
          },
        },
        { role: { role: "quit" } },
      ],
    },
  },
  {
    submenu: {
      label: "Edit",
      items: [
        { role: { role: "undo" } },
        { role: { role: "redo" } },
        "separator",
        { role: { role: "cut" } },
        { role: { role: "copy" } },
        { role: { role: "paste" } },
      ],
    },
  },
]);

win.addEventListener("menuclick", (e) => {
  const detail = (e as CustomEvent).detail;
  switch (detail.id) {
    case "new":
      console.log("New clicked");
      break;
    case "open":
      console.log("Open clicked");
      break;
    case "save":
      console.log("Save clicked");
      break;
  }
});
```

コンテキストメニュー

```typescript
const contextMenu: Deno.MenuItem[] = [
  { item: { label: "Copy", id: "copy", enabled: true } },
  { item: { label: "Paste", id: "paste", enabled: true } },
  "separator",
  { item: { label: "Properties…", id: "props", enabled: true } },
];

// Trigger from a right-click. The webview may not forward the browser
// `contextmenu` event, so handle the secondary mouse button on the window.
win.addEventListener("mousedown", (e) => {
  if (e.button === 2) {
    win.showContextMenu(e.clientX, e.clientY, contextMenu);
  }
});

win.addEventListener("contextmenuclick", (e) => {
  if (e.detail.id === "copy") { console.log("Copy clicked"); }
  if (e.detail.id === "paste") { console.log("Paste clicked"); }
  if (e.detail.id === "props") { console.log("Properties clicked"); }
});
```

@[og](https://docs.deno.com/runtime/desktop/menus/)

## フレームワークを利用した開発

Deno.serve() を利用したサンプルを見てきましたが、Deno デスクトップでは、以下のフレームワークとともに利用可能です。これらのプロジェクトのディレクトリで deno desktop を起動すると、フレームワークを自動検出してアプリを構成します。多くのモダンフレームワークがサポートされています。

- Next.js
- Astro
- Fresh
- Remix
- Nuxt
- SvelteKit
- SolidStart
- TanStack Start
- Vite

ローカルで動いてるのに SSR を使うというのがなんとも不思議な感じですが、ちゃんと動いてセキュアであれヨシという感じでしょうか。

@[og](https://docs.deno.com/examples/next_tutorial/)

```shell
deno run -A npm:create-next-app@latest
```

```shell
deno desktop -A 
```

![Next desktop app](https://i.gyazo.com/0c2090df3d84d37ecffa6c76fc96eb1d.png)

Next.js のアプリが、外部サーバーなしでまるっとデスクトップ内で動いてるのは不思議な感じです。

@[og](https://docs.deno.com/runtime/desktop/frameworks/)


## バックエンドの選択について

クロスブラウザが重荷になってきたら、ちょっと配布サイズは大きくなるけど、CEF ベースにスイッチできるのがいいかなと思います。

@[og](https://docs.deno.com/runtime/desktop/backends/)

## Electron との比較

既存の Web アプリがあり、デスクトップ化したい場合は、

WebContentsView 相当のものはない。

VS Code や Figma のようなマルチタブを駆使するアプリは Electron 以外の選択肢はありません。

:::info
Tauri も同様

@[og](https://developer.mamezou-tech.com/blogs/2025/12/01/porting-an-electron-app-to-tauri2/)
:::

@[og](https://docs.deno.com/runtime/desktop/comparison/)

## さいごに
以上、Deno デスクトップ機能を試しました。
本格的なデスクトップアプリ開発環境がアウトオブボックスで使えるようになっており、も

タスクトレイの API なども完備されており、

Tauri と違って、全てを TS で書けるので
既存の Web アプリがあり、メニューやタスクトレイなどの独自 UI を追加し、OS と連携するような用途は Tauri 以上に輝くのではないかと思います。
デスクトップアプリ化自体は1時間もかからず済んでしまうでしょう。

:::info
Tauri も JS の API を生やして、Rust 知らない勢を取り込もうとしてはいます。
:::

experimental から安定版への熟成が楽しみな機能です。
