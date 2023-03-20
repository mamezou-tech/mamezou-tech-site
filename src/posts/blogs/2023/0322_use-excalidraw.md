---
title: 手書き風ドローツール Excalidraw のススメ
author: naotsugu-kobayashi
date: 2023-03-22
tags: [excalidraw, tools, notion, obsidian, Tauri]
---


「ちょっと図で考えたい」「メモに簡単な図を添えたい」そんな用途にオススメなドローツールが、Excalidraw です。

`https://excalidraw.com/` にアクセスすれば、ユーザ登録などもなく直ちに使い始められます。

![fig01](/img/blogs/2023/0322_use-excalidraw-fig01.png)



「百聞は一見にしかず」を心理学の分野で言えば、Picture Superiority Effect(PSE) になります。日本語で言うところの「画像優位性効果」ですね。人は、文字や言葉よりも画像の処理の方が早く、視覚情報の方が記憶に残りやすいというものです。

サクッとメモを残したい時に、図で書けば分かりやすいとは思いつつも、ドローツールを立ち上げるのは手間で心理的障壁が大きいものです。そんな時、すぐに作業を開始でき、シンプル極まりない Excalidraw はとても良い選択肢になります。

手書き風なザックリした図しか書けないので、変にレイアウトに凝りたくなるという無意味な誘惑が湧くこともありません。気兼ねなく書き捨ての図を作ることができます。逆に言えば、しっかりした図を描きたい用途には Excalidraw は向いていません。Figma など他のツールを使いましょう。




## Excalidraw の使い方

シンプルなツールなので、使い方として説明すべきことも特にないのですが、上部のツールからシェイプを選択して描く だけです。

![fig02](/img/blogs/2023/0322_use-excalidraw-fig02.png)


ツールバーには `1` や `2` などにショートカットが割り当てられているので、選択を素早く行うこともできます。

![fig03](/img/blogs/2023/0322_use-excalidraw-fig03.png)


左端のカギ型アイコンでは、描き終わった後にツールの選択を継続するか解除するかを設定することができます。


ショートカットは右下のヘルプボタンから確認することができます。

![fig04](/img/blogs/2023/0322_use-excalidraw-fig04.png)


図を選択してエンターキーを押せばテキスト編集でき、何もないところでダブルクリックするとテキスト追加ができます。

図のコンテキストメニューから以下の操作が可能です。


![fig05](/img/blogs/2023/0322_use-excalidraw-fig05.png)


図形を選択すると以下のようなプロパティが編集できます。

![fig06](/img/blogs/2023/0322_use-excalidraw-fig06.png)

メニューからは、ローカルに保存(`.excalidraw` という実体はJSONファイル)したり、PNG や SVG などにエクスポートすることができます。ダークモードや日本語への切り替えも行えます。

![fig07](/img/blogs/2023/0322_use-excalidraw-fig07.png)




## Excalidraw Integration

Excalidraw は、単なる React app として実装されています。ですので、様々なツールに埋め込んで使うことができます。



### Notion

みんな大好き Notion にはデフォルトで Excalidraw が埋め込みできます。

Ebbeds ブロックで選択するだけです。

![fig08](/img/blogs/2023/0322_use-excalidraw-fig08.png)


ノートにそのまま埋め込む形で  Excalidraw が利用可能です。

![fig09](/img/blogs/2023/0322_use-excalidraw-fig09.png)




### Obsidian

最強のマークダウンメモツールとして呼び声の高い Obsidian ではコミュニティプラグインで Excalidraw が利用できます。
導入も簡単で、Excalidraw プラグインを入れるだけです。

![fig10](/img/blogs/2023/0322_use-excalidraw-fig10.png)

Obsidian の Excalidraw プラグインはとても出来が良く、Obsidian のメモに wikiリンクを張ることができ、Obsidian ユーザの必須プラグインと言っても過言ではないでしょう。




## TAURI

Excalidraw は単なる React App なので、簡単にスタンドアロンアプリケーション化することができます。ここでサクッと作ってみましょう(`cargo` や `npm` は導入済みとします)。

`cargo` で `create-tauri-app` と `tauri-cli` を導入してひな形を作成します。オプションは以下の通りに選択します。

```shell
$ cargo install create-tauri-app
$ cargo install tauri-cli
$ cargo create-tauri-app

✔ Project name · excalidraw-app
✔ Choose which language to use for your frontend · TypeScript / JavaScript - (pnpm, yarn, npm)
✔ Choose your package manager · npm
✔ Choose your UI template · React - (https://reactjs.org/)
✔ Choose your UI flavor · TypeScript

Template created! To get started run:
  cd excalidraw-app
  npm install
  npm run tauri dev
```

`excalidraw` を追加します。

```shell
$ cd excalidraw-app
$ npm install
$ npm install @excalidraw/excalidraw
```


`src/App.tsx` を以下のように編集します。

```typescript
import React, { useState, useRef } from "react";
import { Excalidraw, MainMenu, WelcomeScreen, serializeAsJSON, exportToBlob } from "@excalidraw/excalidraw";
import type { AppState, ExcalidrawImperativeAPI, ExcalidrawProps, BinaryFiles } from '@excalidraw/excalidraw/types/types'
import type { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";

import { save } from "@tauri-apps/api/dialog";
import { writeFile, writeBinaryFile, writeTextFile } from '@tauri-apps/api/fs'

function App() {

  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const [viewModeEnabled, setViewModeEnabled] = useState(false);
  const [gridModeEnabled, setGridModeEnabled] = useState(false);
  const [theme, setTheme] = useState<ExcalidrawProps["theme"]>("light");
  const [exportWithDarkMode, setExportWithDarkMode] = useState<boolean>(false);

  return (
    <>
      <div style={{ height: '97vh' }}>
        <Excalidraw
          ref={(api: ExcalidrawImperativeAPI) => setExcalidrawAPI(api)}
          viewModeEnabled={viewModeEnabled}
          gridModeEnabled={gridModeEnabled}
          theme={theme}
        >
          <MainMenu>
            <MainMenu.Item onSelect={async () => {
              const path = await save({ defaultPath: "image.excalidraw" });
              const file = serializeAsJSON(
                excalidrawAPI?.getSceneElements(),
                excalidrawAPI.getAppState(),
                excalidrawAPI?.getFiles(),
                "local"
              );
              await writeTextFile(path, file);
            }}>Save...</MainMenu.Item>
            <MainMenu.Item onSelect={async () => {
              const path = await save({ defaultPath: "image.png" });
              const blob = await exportToBlob({
                elements: excalidrawAPI?.getSceneElements(),
                mimeType: "image/png",
                appState: excalidrawAPI.getAppState(),
                files: excalidrawAPI?.getFiles()
              });
              const arrayBuffer = await blob.arrayBuffer();
              await writeBinaryFile(path, arrayBuffer);
            }}>Export to png...</MainMenu.Item>

            <MainMenu.Item onSelect={async () => {
              const path = await save({ defaultPath: "image.svg" });
              const svg = await exportToSvg({
                elements: excalidrawAPI?.getSceneElements(),
                appState: excalidrawAPI.getAppState(),
                files: excalidrawAPI?.getFiles()
              });
              await writeTextFile(path, svg.outerHTML);
            }}>Export to svg...</MainMenu.Item>
            
            <MainMenu.DefaultItems.LoadScene />
            <MainMenu.DefaultItems.ClearCanvas />
            <MainMenu.DefaultItems.ToggleTheme />
            <MainMenu.DefaultItems.Help />
          </MainMenu>
          <WelcomeScreen />
        </Excalidraw>
      </div>
    </>
  );
}

export default App;
```

ほとんど手を加えずとも動くのですが、ファイルの保存処理だけは TAURI 向けの実装が必要になります。ローカルへの保存と、png 形式 svg 形式へのエクスポートをメニューに追加しています。

以上でスタンドアロンなアプリケーションが完成です。実行しましょう。

```shell
$ cargo tauri dev
```

以下のようにアプリケーションが起動し、ローカルで Excalidraw が使えるようになります。

![fig11](/img/blogs/2023/0322_use-excalidraw-fig11.png)

以下でアプリケーションのインストーラが作成できます。

```shell
$ cargo tauri build
```

スタンドアロン化完了です。簡単ですねぇ。




## まとめ

シンプルな手書き風ドローツールである Excalidraw を紹介しました。

著者の普段使いメモには Notion から乗り換えて Obsidian を使っています。そしてメモつける図には Excalidraw プラグインを使っています。
いろいろと乗り換えてはきましたが、現時点ではこれがベストなメモ環境かなと考えています。
みなさんも試してみてはいかがでしょうか。

