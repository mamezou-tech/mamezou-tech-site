---
title: Tauri 2.0 が RC になってるので触ってみる
author: masahiro-kondo
date: 2024-09-22
tags: [Tauri]
image: true
---

## はじめに
もうすぐ Tauri 2.0 がリリースされます[^1]。

[Tauri 2.0](https://v2.tauri.app/)

[^1]: Tauri 2.0 のドキュメント類は [https://v2.tauri.app/](https://v2.tauri.app/) の URL で提供されています。

現在リリース候補が出ており、記事執筆時点では Tauri CLI のバージョンは 2.0.0-rc.16 でした。

[Tauri 2.0 Release Candidate](https://v2.tauri.app/blog/tauri-2-0-0-release-candidate/)

このところ個人開発では Electron の更新を追いかけてばかりで、以下の Tauri 記事を書いてからもう2年も経ってしまいました💦

[Tauri でデスクトップアプリ開発を始める](https://developer.mamezou-tech.com/blogs/2022/07/08/writing-app-with-tauri/)

時の経つのは早いですね。これを機にリハビリしていきたいと思います。

:::column:Tauri 2.0 で何が変わる？
Tauri 2.0 では、iOS と Android がサポートされ、従来のデスクトップアプリに加えモバイルアプリを開発できるようになります。React Native や Flutter といった数多くのモバイルアプリ開発フレームワークに Tauri も参入することになります。
[Roadmap to Tauri 2.0](https://v2.tauri.app/blog/roadmap-to-tauri-2-0/)

プラグインアーキテクチャが導入され、Tauri の Core も複数のプラグインに分割されました。

従来 Rust と JavaScript のブリッジ機能が提供されて相互の機能を呼び出すことができましたが、Tauri 2.0 では、Kotlin(もしくは Java)、および Swift のバインディング機能が提供されます。これにより、Android や iOS でプラグインを開発してネイティブ機能を呼び出すことが可能になります。
[Mobile Plugin Development](https://v2.tauri.app/develop/plugins/develop-mobile/)

その他 Tauri 2.0 では IPC の改善、MultiWebView、メニューとトレイアイコンの JavaScript API、ネイティブなコンテキストメニューなども追加されています。
:::

## 1.0 で作ったアプリのマイグレーション
それでは、冒頭の2年前の記事で作った BPMN モデラーアプリを v2 対応していきます。

![bpmn modeler](https://i.gyazo.com/b61c02743285b89a4023a299d30c43d7.png)

アプリのリポジトリはこちらです。

[GitHub - kondoumh/tauri-bpmn-modeler-example: BPMN modeler example with Tauri](https://github.com/kondoumh/tauri-bpmn-modeler-example)

Tauri 1.0 からのマイグレーション情報は以下のページにあります。

[Upgrade from Tauri 1.0](https://v2.tauri.app/start/migrate/from-tauri-1/)

自動でマイグレーションするには以下のように、Tauri CLI をインストールして、migrate コマンドを実行します。

```shell
npm install @tauri-apps/cli@next
npm run tauri migrate
```

これで、プロジェクトのファイルが変更・追加されますので、dev コマンドでビルド・実行を確認します。

```shell
npm run tauri dev
```

v1 時代の Cargo.lock があると、依存ライブラリでビルドエラーが出るため削除してビルドしました。

Tauri の設定ファイル tauri.conf.json の変更については以下のセクションにあります。

[https://v2.tauri.app/start/migrate/from-tauri-1/#tauri-configuration](https://v2.tauri.app/start/migrate/from-tauri-1/#tauri-configuration)

ここに記載されている変更はほとんど自動でマイグレーションされます。

BPMN モデラーアプリは、ファイルをドラッグ＆ドロップしてモデルファイルを開くようにしていました。そのため、`tauri > windows > fileDropEnabled` を false にしていましたが、この属性が `app > windows > dragDropEnabled` にリネームされており、ここは自動でマイグレーションされず、手動で変更しました。

:::info
v1 では fs:allow-write-text-file などの allowList を tauri.conf.json に書いていましたが、v2 では、`src-tauri/capability` 配下の JSON ファイルに切り出されています。プラグインアーキテクチャにより設定ファイルも分割している模様です。`capability` のファイルは migrate コマンドで自動で生成されました。
:::

マイグレーションされた変更部分を見ると、ダイアログやファイルシステムといったコンポーネントがプラグインとして分割されていることが分かります。

```diff-javascript
- import { save } from '@tauri-apps/api/dialog';
- import { writeTextFile } from '@tauri-apps/api/fs';
+ import { save } from '@tauri-apps/plugin-dialog';
+ import { writeTextFile } from '@tauri-apps/plugin-fs';
```

v2 での動作を確認後、bpmn.js などの依存ライブラリを最新化しました。マイグレーションの PR は以下にあります。

[feat: Migrate to tauri v2 by kondoumh · Pull Request #24 · kondoumh/tauri-bpmn-modeler-example](https://github.com/kondoumh/tauri-bpmn-modeler-example/pull/24)

## Tauri 2.0 のフィーチャー: ネイティブなコンテキストメニューを使ってみる

v2 ではネイティブなコンテキストメニュー機能が追加されました。v1 では [Plugin として提供](https://github.com/c2r0b/tauri-plugin-context-menu)されていましたが、本体に取り込まれてたことになります。ユーザーからの要望が多かったようです。

[[feat] Add native context menu · Issue #4338 · tauri-apps/tauri](https://github.com/tauri-apps/tauri/issues/4338)

[muda]((https://github.com/tauri-apps/muda)) という Menu 系ライブラリにより実現され、JavaScript / Rust の両方で API が提供されています。OS ネイティブなのでスタイルは OS 依存になりますが、他のデスクトップアプリとの同様のルック＆フィールになるというメリットはあります。

BPMN モデラーアプリは、モデルファイルをドラッグ＆ドロップで開く仕様でしたが、コンテキストメニューからファイルダイアログを呼び出して開く機能を追加してみました。今回は、JavaScript の API を使用します。

app.js で Menu と MenuItem を import しました。また、ファイルオープンのダイアログや、テキストファイル読み込み関数も import に追加しました。

```javascript:app/app.js
import { Menu, MenuItem } from '@tauri-apps/api/menu';

import { save, open } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
```

bpmn.js は jQuery に依存しているので、jQuery で BPMN 編集画面の `canvas` クラスがついた div を選択して contextmenu イベントを処理するようにします。jQuery のコード、懐かしい感じです。

```javascript:app/app.js
$(function() {
  // 中略
  $('.canvas').contextmenu( async e => {
    e.preventDefault();
    e.stopPropagation();
    
    const menuItems = [
      await MenuItem.new({
        text: 'Open Diagram',
        action: async () => {
          const path = await open({ defaultPath: 'diagram.bpmn' });
          if (path) {
            const xml = await readTextFile(path);
            openDiagram(xml);
          }
        },
      }),
    ];
    const menu = await Menu.new({ items: menuItems });
    menu.popup();
  });
  // 後略
```

MenuItem にメニューテキスト(`Open Diagram`)と、メニューのアクションを定義します。アクションの関数では、ファイルオープンダイアログからパスを取得してファイルを読み込んだあと、ダイアグラムを開く関数を呼び出しています。

これで、ダイアログでモデルファイルを選択して開くという機能が追加できました。

![Context menu](https://i.gyazo.com/0eec68b58c28ee5163b2ab887aa1b52a.png)

![Open dialog](https://i.gyazo.com/b604c74783adf6e784acf5d7602b8d77.png)

この変更は以下の PR に含まれています。

[feat: add context menu to open diagram data by kondoumh · Pull Request #25 · kondoumh/tauri-bpmn-modeler-example](https://github.com/kondoumh/tauri-bpmn-modeler-example/pull/25)

## さいごに
以上、久々に Tauri を触ってサンプルアプリを更新してみました。まだ v2 のドキュメント類は整備されていないため、VS Code 上で TypeScript の型情報を参照しながら変更した箇所もありました。Rust のコードは全く書いていません。

[先日の Electron 記事の最後のコラム](https://developer.mamezou-tech.com/blogs/2024/08/28/electron-webcontentsview-app-structure/#%E3%81%95%E3%81%84%E3%81%94%E3%81%AB)に書きましたが、Tauri 2.0 はモバイル対応のためのマイルストーンであり、本命は WebView 実装が Servo に置き換えられるタイミングだと思っています。v2 の間に実装されるのか v3 になるのかは分かりませんが、引き続き Tauri 動向はウォッチしておこうと思います。
