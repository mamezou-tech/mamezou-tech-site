---
title: ゼロ年代のフリーソフトウェアをサルベージ！ アイデアプロセッサ iEdit を VS Code 拡張として式年遷宮(モダナイズ)している話
author: masahiro-kondo
date: 2026-12-11
tags: [個人開発, vscode, advent2026]
image: true
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2026/
---

これは[豆蔵デベロッパーサイトアドベントカレンダー2026](/events/advent-calendar/2026/)第11日目の記事です。

## はじめに
筆者はゼロ年代初頭 Windows のフリーソフトウェアを開発してました。いわゆる「フリーソフト作者」というやつです。当時作っていたのは iEdit というアイデアプロセッサです。

@[og](https://kondoumh.com/software/iedit/)

ツリービューによる階層構造と、ネットワークビューによるグラフ構造、そしてテキスト情報によりアイデアを練り上げていくというものでした。

![iEdit screen shot](https://kondoumh.com/images/iedit/screen.png)

[イントロダクション · iEdit User's Guide](https://iedit.kondoumh.com/)

今でも、上記のページや Vector で配布しています。最後にリリースしたのは2018年ですが、この記事を書くときに手元の Windows 11 23H2 の環境でも動作することを確認しました。

:::info
当時はまあまあのダウンロード数があり、Windows フリーソフトウェアを集めた雑誌に収録されたり、窓の杜に掲載されたり、ぷよぷよで有名なゲームクリエイター米光一成さんが自著の中で取り上げてくださったりしました。

@[og](https://bookplus.nikkei.com/atcl/catalog/2010/9784532491055/)

シナリオ作成などに活用されている方が多く、今でも TRPG のゲームシナリオを iEdit 形式のファイルで配布している方がいるようです。
豆蔵に転職するきっかけもこのソフトを豆蔵の偉い人が使っていてくれたりしたから・・というのもありました。
:::

今回の式年遷宮により、令和の年の瀬に再現された VS Code 拡張版 iEdit のスクショもお見せしておきます。

![iedit-vscode screen shot](/img/blogs/2026/1211_migrating-2000s-era-freeware/iedit-vscode.png)

## 過去のモダナイズの試みと挫折
冒頭のオリジナル版のスクショを見ていただいてもわかるように、ゼロ年代初頭の UI が古臭いです。iEdit は C++ と MFC (Microsoft Foundation Class Library) で作っていました。これまで何度かモダナイズを試みました。

1. 最新の MFC に移行して見た目だけでも新しくする
→ 理由は忘れたけど頓挫 (多分、ガワだけの改修にモチベーションが上がらなかったのだと思われます。)
2. GDI (Windows の古い Graphic Device Interface) で描画しているダイアグラムを GPU アクセラレーションの効いた Direct2D でヌルヌル動くようにする
→ いい感じで動いたがユーザーが独自図形を登録するための Windows メタファイル (wmf/emf 形式) のサポートが難しく挫折
3. WPF で作り直す: めちゃくちゃいけてる .NET のデスクトップアプリ用フレームワーク WPF (Windows Presentation Foundation)。移行先としては優れもの
→ 4 の Silverlight の方がクロスプラットフォーム展開できるということで中止
4. Silverlight で作り直す: WPF と違って、ブラウザ上で動く Silverlight。Out of Browser 機能で今の PWA (Progressive Web Apps) 同様デスクトップアプリのように動く。Windows でも Mac でもいい感じで動いていた
→ iPhone 登場時、Apple CEO ステーブ・ジョブスが RIA (Rich internet Applications: Flash や Silverlight) を否定し、Silverlight ごとお蔵入り😭
5. 筆者の好きな [Electron](/tags/electron/) や [Tauri](/tags/tauri/) で作り直す
→ 考えただけ😅

## アプリケーションプラットフォームとしての VS Code Extensions 環境
先日、自作の VS Code 拡張 changelog-support にアウトライン機能を追加したりしました。VS Code の機能を使って割と簡単にリッチな UI が提供できることを理解しました。

@[og](https://developer.mamezou-tech.com/blogs/2026/10/23/update-my-vscode-extension-after-3years/)

この時ふと、「今は VS Code 拡張に移行するのが一番いいんじゃね？」と思いつき、プロトタイピングをやってみたという話です。

Gemini に相談してみたら、iEdit を構成する各ビューを以下のように実現すればいいのではないかということでした。

1. アウトラインビュー（ツリービュー）
VS Code API: Tree View API (TreeDataProvider) を使う。VS Codeのツリーはドラッグ＆ドロップでの並び替えや階層移動（TreeDragAndDropController）にも対応。

2. ネットワークビュー（ダイアグラム）
VS Code API: Webview API または Custom Editor API を使う。HTML/CSS/JavaScript でグラフィカルなノードとリンクを描画。ゼロから Canvas や SVG を操作するより、React Flow や Cytoscape.js、vis.js などグラフネットワーク描画用 JS ライブラリを使うと、「芋づる機能」や「マインドマップ的な配置」が作りやすくなる。

3. テキストビュー（ノードのテキスト編集）
VS Code API: VS Code標準のテキストエディタ。仮想ドキュメント (TextDocumentContentProvider) を使うか一時ファイルとして開くことで VS Code の強力なテキスト編集機能（検索置換、シンタックスハイライトなど）をそのまま利用可能。

ふむふむ、やっぱりそうだよね、ということでプロトタイプ作成用のリポジトリを作りました。

- [GitHub - kondoumh/iedit-vscode](https://github.com/kondoumh/iedit-vscode)

## プロトタイプの実装
GitHub Copilot で開発を進めました。最初に投入したプロンプトは以下の通り。

> 僕が昔作った iEdit っていうアイデアプロセッサがあって、ツリービューとネットワークビューとテキストエディタを融合したものでした。これを VS Code の拡張として実装したいと思うのですが、プロトタイプの作成を手伝って欲しいです。
>
> https://kondoumh.com/software/iedit/

最初に作られたコードベースは以下のようなものでした。VS Code 拡張の標準的な構成で WebView で UI を作り込む構成になっています。

> **実装したもの（MVP）**
> - `iEdit: Open Prototype` コマンドで起動する Webview UI
> - ツリービュー（ノード階層）
> - ネットワークビュー（同階層ノード表示、ノードドラッグ、リンク追加）
> - テキストエディタ（選択ノード本文編集）
> - 3ビュー同期（選択連動）
> - .iedit.json 保存/読込（ワークスペース直下）
>
> **主なファイル**
> - package.json
> - src/extension.ts
> - src/webview/main.ts
> - scripts/build.mjs
> - README.md
> - tsconfig.json
> - .vscode/launch.json
>
> **ライブラリ選定**
> 今回はプロトタイプ速度優先で vis-network を採用しました（軽量で Webview 実装がシンプル）。

これでいけそうっていう実装ができてたと思います。

以下、実装した主なフィーチャーをスクリーンショットを交えてご紹介します。

### ダイアグラム編集機能
ノードの作成、リンクの作成、リネーム、削除など一通りの操作が可能。一つのノードを Cmd キー(Windows では Ctrl キー)を押しながらドラッグすると他のノードも追従するような動きもオリジナルと同様実装しています。

![Network View](/img/blogs/2026/1211_migrating-2000s-era-freeware/network-view.gif)

### アウトライン編集機能
子ノード、兄弟ノードの追加、リネーム、インデント、アウトデント、上下移動などのアウトライン操作を実装しました。

![Outline View](/img/blogs/2026/1211_migrating-2000s-era-freeware/outline-view.gif)

### アウトラインとダイアグラムの連動
アウトラインでの選択状態に応じて、サブ階層の兄弟ノードだけをダイアグラムで表示する機能。これは Copilot が iEdit のページを読んで勝手に実装してくれてました‼️

![Integration of Outline and Network](/img/blogs/2026/1211_migrating-2000s-era-freeware/outline-network-integration.gif)

### テキスト編集機能
オリジナルでは無味乾燥だったテキスト編集エリアも Markdown を見やすい配色でハイライトできるようになりました。

![Text View](/img/blogs/2026/1211_migrating-2000s-era-freeware/text-view.png)

### 無制限の Undo/Redo
編集結果を無制限に Undo/Redo できます。オリジナルでは Undo 1回だけでした。

### 旧アプリデータのインポート機能
オリジナルの iEdit には JSON 形式のエクスポート機能があります。元々プレーンテキスト形式や XML 形式はサポートしていたのですが、今時は JSON 読み書きできないとダメでしょってことで、2018年のリリースで頑張って C++ で書きました (これが実質最後の機能追加でした)。VS Code 版でこの JSON を読み込めるようにしました。今回、iEdit のバイナリと同梱しているマニュアルのようなドキュメントを JSON 形式に出力して、Copilot に解析してもらって、インポート機能を追加しました。インポートといっても、拡張子を iedit.json に変えるだけで読んでくれます (編集したら新フォーマットで保存)。

![Original Doc1](/img/blogs/2026/1211_migrating-2000s-era-freeware/original-doc1.png)
*オリジナルのサンプルドキュメントを表示したところ(概要)*

![Imported Doc1](/img/blogs/2026/1211_migrating-2000s-era-freeware/imported-doc1.png)
*VS Code 版にインポートして表示したところ*

ほぼ同じです。20年以上前に別のアプリで作ったデータがそのまま読み込めて再現されるのはなかなか感動的でした。

![Original Doc2](/img/blogs/2026/1211_migrating-2000s-era-freeware/original-doc2.png)
*オリジナルのサンプルドキュメントを表示したところ(リンクの種類)*

![Imported Doc2](/img/blogs/2026/1211_migrating-2000s-era-freeware/imported-doc2.png)
*VS Code 版での表示*

リンクの種類とかはまだ再現度低いですが、もう少しな感じですね。

やはりデータを汎用的な形式で読み書きできるようにしておくことは正義ですね。

:::info
C++ で書いてた JSON ファイルですが、BOM 付きの UTF-8 フォーマットになってしまっていたことが、Copilot の実装でバレてしまいました😅。
:::

## Copilot とのペアプロの様子
ペアプロといっても僕はナビで、全ての実装は Copilot。僕は内容を確認して承認というサイクルでした。
ナビはちゃんとできてたと思います。VS Code 拡張を作った経験もあるし、iEdit に関しては「ドメイン・エキスパート」でもありますし💪。

Copilot がプロトを爆速で作ってくれるので感心したら、逆に褒められましたw

![Copilot Chat1](/img/blogs/2026/1211_migrating-2000s-era-freeware/copilot-chat1.png)

アウトラインビューのツリーの開閉のところでちょっと伝わってなくて(VS Code のアウトラインと勘違いしてたようです)、スクショを見せたらすぐに直してくれました。Copilot くんノリノリですw

![Copilot Chat2](/img/blogs/2026/1211_migrating-2000s-era-freeware/copilot-chat2.png)

リポジトリ作成から25コミットで今回の記事の範囲までできちゃいました。

:::info
作業半ばで早々に Copilot のクォータを使い果たしてしまい、追加のバジェット設定をしました。Copilot Pro でも追加予算の設定でプランをアップグレードすることなく作業を継続できます。一時的に多くの作業をしたいケースではおすすめだと思います。

@[og](https://docs.github.com/ja/copilot/how-tos/administer-copilot/manage-budget-requests)
:::

## オリジナルを MFC で開発していた理由
MFC は Windows がまだバージョン3ぐらいから存在する C++ の UI フレームワークです。マイクロソフトが Word や Excel のアプリケーション基盤として使っているものをライブラリとして提供してくれています。ウィザードでポチポチ選択していくだけで Windows のお作法に準拠したアプリの雛形が手に入ります。

- ツールバー、メニューバー、ステータスバー、OS 標準のダイアログボックスやツリーなどのコモンコントロール
- マルチドキュメントインターフェース、Ctrl + N で新規ドキュメントを作成、Ctrl + Tab でドキュメントを切り替え

Windows アプリに慣れたユーザーなら初めて触るアプリでも動作が予測可能で、認知的負荷が低くなります。

MFC は一般的にはアプリ作成効率が悪く生産性が低いとされていました。当時の業務アプリでは Visual Basic / Delphi などの RAD (Rapid Application Development) が主流でしたが、逆にこれらの開発環境では上記のような Windows 標準の UX を提供するのは至難の業でした。MFC の Document-View アーキテクチャ、コマンドルーティングなどの機能がもたらす、プラットフォームへの統合感と完成度は非常に高かったのです。

筆者が MFC を選んだのは Windows ユーザーであれば自然と身についているアプリの操作をツール独自のオペレーションで妨げず、アイデア構築に集中できるようにという気持ちからでした。

## VS Code 拡張のエコシステムに受け継がれる MFC の DNA
VS Code 拡張は、VS Code という IDE の中で拡張のエディタ画面が開き、VS Code のメニューから保存や Undo などの操作ができます。VS Code を使い慣れたユーザーであれば直感的に使えるという点で MFC と共通しています。

MFC のコマンドルーティングでは、ON_UPDATE_COMMAND_UI というマクロというかイベントハンドラで、「このデータが選択されていない時は、このツールバーのボタンとメニューをグレーアウトする」などの状態管理をコマンドの ID で一元管理できました。
VS Code 拡張では package.json にコマンドを登録して VS Code のコマンドパレットから呼び出せるようにし、拡張内の UI からもその機能を呼び出すといった使い方ができます。この辺りのプラットフォームとの親和性は、Electron などの独立したアプリの荒々しい世界とは全く異なる開発体験です。

Undo / Redo に関してはオリジナルでは Command パターンは実装できたものの、各ビューに独自に保持している状態などもあり、単純にコマンド履歴を持っているだけでは実装できず、Memento パターンで状態を丸ごと保持するような実装をしていました。当然メモリの制約も大きかったので回数制限をかけていました。VS Code 版では VS Code の JSON ファイルの操作履歴を管理してもらえるので、JSON ファイルの変更を Webview で検知して再描画するだけです。

MFC の Document-View アーキテクチャと VS Code 拡張のアーキテクチャの比較を示します。

![Compare Architecture](/img/blogs/2026/1211_migrating-2000s-era-freeware/arch.webp)

右のような図はオリジナルの iEdit では描けたのですが、vis-network で作ったプロト版には厳しかったです。ダイアグラムを描くだけでなくドローツール的な領域にも踏み込む必要があるためです。ということで上記の図は Gemini に描いてもらいました。

## さいごに
以上、古いフリーソフトウェアを VS Code の拡張としてモダナイズする話でした。オリジナル iEdit では色々と自作してコードも膨大になっていましたが、Copilot の書いてくれたコードはさほど大量でもなく、シンプルです。ドキュメントの編集というドメインが VS Code 拡張に対して提供されている機能とマッチして素早くモノが作れた (VS Code という巨人の肩に乗れた) ということかなと思いました。

まだ Visual Studio Marketplace には公開していませんが、年末年始で機能追加や細かい調整をして公開したいなと思っています。
