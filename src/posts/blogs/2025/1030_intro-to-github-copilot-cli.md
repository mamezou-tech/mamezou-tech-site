---
title: GitHub Copilot にも CLI がやってきた！
author: masahiro-kondo
date: 2025-10-30
tags: [GitHub Copilot]
image: true
---

## はじめに
ちょっと時間が経ってしまいましたが、先月末 GitHub Copilot CLI がパブリックプレビューになりました。

@[og](https://github.blog/changelog/2025-09-25-github-copilot-cli-is-now-in-public-preview/)

VS Code の拡張から始まった GitHub Copilot も Claude Code や Gemini と同様 CLI としても動作するようになりました。CLI として提供されることで、
- IDE 縛りがなくなる
- パイプを使って他の CLI ツールとの連携が可能

という強みが追加されます。ターミナルだけで作業が完結できるという点にも魅力を感じる人は多いでしょう。

さらに GitHub にログイン状態で利用するため自分が関わっているリポジトリの操作もできますし、GitHub の MCP サーバーもすぐ利用ます。

日本語のドキュメントは以下から参照できます。

[GitHub Copilot CLI の使用 - GitHub Docs](https://docs.github.com/ja/copilot/how-tos/use-copilot-agents/use-copilot-cli)

:::alert
従来 GitHub CLI の拡張として提供されていた gh-cpilot は Copilot CLI のパブリックプレビューに伴って非推奨となり、Copilot CLI に置き換えられます。

@[og](https://github.blog/changelog/2025-09-24-deprecate-github-copilot-extensions-github-apps/)

gh-copilot については昨年2月紹介してました。

@[og](https://developer.mamezou-tech.com/blogs/2024/02/28/github-copilot-in-cli/)
:::

:::info
GitHub Copilot CLI は、GitHub Copilot Pro、GitHub Copilot Pro+、GitHub Copilot Business、GitHub Copilot Enterprise プランで使用できます。
:::

## インストールと起動
ドキュメントに従ってインストールします。

@[og](https://docs.github.com/ja/copilot/how-tos/set-up/install-copilot-cli)

npm でグローバルインストール可能です。

```shell
npm install -g @github/copilot
```

GitHub CLI を起動します。

```shell
copilot
```

GitHub CLI の TUI が起動し GitHub へのログイン状態、GitHub MCP サーバへの接続状況が表示されます。

![run copilot](https://i.gyazo.com/619b7fec51279ed982a4b7cf9f5e3831.png)

作業するフォルダの信頼について聞かれています。いつも `$HOME/dev` で作業してるので2番の `Yes, and remember this folder for future sessions` を選択しました。

:::info
筆者の環境では GitHub CLI (Copilot CLI じゃない GitHub 操作用 CLI) で事前に GitHub にログインしているため、その認証トークンでログイン状態になっているのだと思います。
:::

## 使ってみる
使い方を理解する上では以下のページが役立ちます。

@[og](https://docs.github.com/ja/copilot/concepts/agents/about-copilot-cli)

### 対話型モード
TUI 上でプロンプトを入力して対話的に作業を進めるモードです。

GitHub から clone した筆者が作っている Electron アプリのリポジトリ([sbe](https://github.com/kondoumh/sbe))のディレクトリに移動してから Copilot CLI を起動しました。

```shell
cd sbe
copilot 
```

`@` でファイルをメンションできます。`@` に続いてパスの一部を入力すると候補が列挙されます。

![mention file](https://i.gyazo.com/21ad22a50b6bc96c81c4e13382fa8f6e.png)

ソースコードの説明をしてもらいました。

![explain](https://i.gyazo.com/bc474ee9da491423f47de4c8bd099328.png)

日本語で質問すると日本語で回答してくれます。

![explain in japanese](https://i.gyazo.com/1e9e556c84d1a93264a46b1f9006557a.png)

対話モードを抜けると利用実績やコードの変更行数などが表示されます。

```
 Total usage est:       2 Premium requests
 Total duration (API):  15.1s
 Total duration (wall): 12m 33.3s
 Total code changes:    0 lines added, 0 lines removed
 Usage by model:
     claude-sonnet-4.5    24.9k input, 414 output, 0 cache read, 0 cache write (Est. 2 Premium requests)

 Shutting down...
```

### プログラムモード
Copilot CLI に引数やパイプでプロンプトを与えて直接実行するモードです。

```
copilot -p "explain src/favs.js"
```

TUI は起動せず直接プロンプトの結果が出力されます。

```
I'll read the src/favs.js file to explain it to you.

✓ Read src/favs.js (57 lines)

This is a Vue.js 3 app that manages favorites in an Electron application. It creates a UI for displaying and deleting favorite items with these key features:

**Core functionality**: Loads favorites from the Electron backend via `window.favsApi`, displays them in a list, and provides delete functionality with a confirmation dialog. It listens for window focus events to refresh the favorites list.

**Theme support**: Automatically detects and applies light/dark mode based on system preferences using Vuetify's theming system.


Total usage est:       1 Premium request
Total duration (API):  11.5s
Total duration (wall): 15.2s
Total code changes:    0 lines added, 0 lines removed
Usage by model:
    claude-sonnet-4.5    23.6k input, 239 output, 0 cache read, 0 cache write (Est. 1 Premium request)
```

結果は標準出力に出力され、続いて利用実績も表示されます。

### ローカルタスク
ローカルにあるコードを変更するように指示できます。

まず、1つのソースコードのファイルについてのレビューを依頼し、改善ポイントを挙げてもらいました。

```
Review @src/about.js
```

![Review code](https://i.gyazo.com/638ec52f5d4cfb23e2ecbd75936fe142.png)

良い点として、適切なライフサイクルフックを持つクリーンなコンポーネント構造とか、IPC による関心事の適切な分離などを誉めてくれています。

いくつか問題点を挙げてくれていますが、使用している Vue の `beforeUnmount` でフォーカス関連のリスナーを削除してないので、メモリリークの懸念があるというのが気になりました。

そこで、この問題を修正するように依頼。

```
Fix No cleanup problem
```

![Fix code](https://i.gyazo.com/5ac5afa32e800e409e8bc69ec68a1390.png)

`beforeUnmount` のフックメソッドと Listener 削除のコードが追加されました。リスナーを `off` で削除する API は存在しないため受け入れる変更ではありません。ですが、今は Copilot CLI の機能を試しているため、他のファイルにも同様に適用をお願いしてみました。ファイルごとに変更していいか聞かれます。

```
Apply this fix to other files too
```
![Apply to other files](https://i.gyazo.com/ee1029b82a463ec3f84b6d041f833c7e.png)

全てのファイルに適用が終わりました。

:::info
この例では使用しませんでしたが、ローカルタスクにおいて sed とか chmod などの外部コマンドを使用する場合は、使用許可を聞いてきます。`--allow-tool` で実行時に予め許可を与えることもできます。
:::

### GitHub タスク(issue 一覧取得)
GitHub の操作に関するタスクも実行できます。手始めにリポジトリの issue 一覧を表示させてみました。

```shell
list my open issues
```

![list issues](https://i.gyazo.com/6dd6ffdf93f9deb5bb7356014be84029.png)

### GitHub タスク(PR 作成)
先ほど試した Electron アプリへのリスナー削除の変更が手元にあるので、そこから PR を作ってもらいます。

```shell
create a pull request from this changes
```

![Creating PR](https://i.gyazo.com/b0663df6854b6c70aea8e303484b1fc6.png)

ブランチを作って push までやってくれました。これをもとに PR を作るか確認が入りました。

![Confirming create PR](https://i.gyazo.com/758ac0295fb4df46824a5453bf5d2f45.png)

Yes を選択すると PR が作成されました。

![Created PR](https://i.gyazo.com/5d318abfc590e54d2e124dff3d0ede86.png)

PR の作者は筆者自身となっています。

### GitHub タスク(Actions ワークフロー実行)
GitHub タスクでは GitHub Actions ワークフローの操作も可能です。まず、このリポジトリのワークフローを列挙させてみました。

![list workflows](https://i.gyazo.com/f9a84487aa6642d692e566ed9edd5e96.png)

列挙されたワークフローのうち `OS Matrix` は、クロスプラットフォームで Electron アプリのテストを実行するワークフローです。手動実行時に `beta` というパラメータを `true` に設定して実行すると Electron の最新ベータ版をインストールしてテストします。ワークフローファイルは[こちら](https://github.com/kondoumh/sbe/blob/main/.github/workflows/ci.yml)から参照してください。

このワークフローの実行を指示してみました。

```
Run OS Matrix with input value "beta" to true
```

(GitHub Copilot CLI ではなく) GitHub CLI を使って実行するプランを提示、実行についてのオプションを提示してきました。

![Trigger Workflow](https://i.gyazo.com/90ce6d7d5e1e03942647a27d02bfb47d.png)

1を選択すると、1回限りの実行を許可、2を選択するとこのセッションを通しての許可を与えることになります。1を選択すると無事に実行できたようです。

![Workflow triggerd](https://i.gyazo.com/ea3da2b3a8d5c335f6aa060adf535f65.png)

実際にちゃんと Electron のベータ版をインストールしてテストが実行されていました。

![Running workflow](https://i.gyazo.com/4d1f9abea98b1b7ed90f128f3c705b1a.png)

Web UI を使わなくても GitHUb CLI によるワークフロー実行方法を知らなくても、自然言語で指示すればいいので助かりますね。

## さいごに
GitHub Copilot CLI は予想以上に強力な Copilot 協調環境を提供してくれていました。

プロンプトの複数行入力にも対応するなど、GA に向けて改善が進んでいます。

@[og](https://github.blog/changelog/2025-10-17-copilot-cli-multiline-input-new-mcp-enhancements-and-haiku-4-5/)

MCP サーバーとの連携なども使いこなせれば、ターミナルだけで多くの複雑なタスクがこなせそうですね。
