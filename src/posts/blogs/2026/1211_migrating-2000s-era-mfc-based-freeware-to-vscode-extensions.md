---
title: ゼロ年代フリーソフトウェアをサルベージ！ アイデアプロセッサ iEdit を VS Code 拡張として式年遷宮(モダナイズ) - AI Ready な可視化ツールへ
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

@[og](/blogs/2026/10/23/update-my-vscode-extension-after-3years/)

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
オリジナルの iEdit には JSON 形式のインポート・エクスポート機能があります。元々プレーンテキスト形式や XML 形式はサポートしていたのですが、今時は JSON 読み書きできないとダメでしょってことで、2018年のリリースで頑張って C++ で書きました (これが実質最後の機能追加でした)。今回の VS Code 版でこの JSON を読み込めるようにしました。

以下は iEdit のバイナリと同梱しているマニュアルのようなドキュメントをオリジナルの iEdit で表示しているところです。

![Original Doc1](/img/blogs/2026/1211_migrating-2000s-era-freeware/original-doc1.png)
*オリジナルのサンプルドキュメントを表示したところ(概要)*

このドキュメントを JSON 形式に出力し、Copilot に解析してもらってインポート機能を追加しました。インポートといっても、拡張子を iedit.json に変えるだけで読んでくれます (編集したら新フォーマットで保存)。

![Imported Doc1](/img/blogs/2026/1211_migrating-2000s-era-freeware/imported-doc1.png)
*VS Code 版にインポートして表示したところ*

ほぼ同じですね。うまく読み込めています。

以下は、色々なパターンのリンクを使っている箇所のオリジナルでの表示です。

![Original Doc2](/img/blogs/2026/1211_migrating-2000s-era-freeware/original-doc2.png)
*オリジナルのサンプルドキュメントを表示したところ(リンクの種類)*

この部分を VS Code 版で表示してみました。

![Imported Doc2](/img/blogs/2026/1211_migrating-2000s-era-freeware/imported-doc2.png)
*VS Code 版での表示*

リンクの種類とかはまだ再現度低いですが、もう少しな感じですね。

:::info
今回ダイアグラムの部分は vis-network というグラフ可視化用ライブラリを使っていますが、2つのノード間で双方向のリンクを作成した場合など、リンクの重なりを回避して表示するためスムージングを入れて分離させるようにしてみました。オリジナルでは、「リンクに経過点を持たせユーザーが手で曲げる」という機能を提供しています。
:::

20年以上前に別のアプリで作ったデータが、そのまま読み込めて再現されるのはなかなか感動的でした。やはりデータを汎用的な形式で読み書きできるようにしておくことは正義ですね。

:::info
C++ で書いてた JSON ファイルですが、BOM 付きの UTF-8 フォーマットになってしまっていたことが、Copilot の実装でバレてしまいました😅。
:::

## Copilot とのペアプロの様子
ペアプロといっても筆者はナビで、全ての実装は Copilot。筆者は内容を確認して承認というサイクルでした。
ナビはちゃんとできてたと思います。VS Code 拡張を作った経験もあるし、iEdit に関しては「ドメイン・エキスパート」でもありますし💪。

Copilot がプロトを爆速で作ってくれるので感心したら、逆に褒められましたw

![Copilot Chat1](/img/blogs/2026/1211_migrating-2000s-era-freeware/copilot-chat1.png)

ネットワーク図のノードやリンクを選択して編集操作を行いますが、この当たり判定 (HitTest) がバグることが度々あって、都度直してもらってました。

![Copilot Chat1](/img/blogs/2026/1211_migrating-2000s-era-freeware/copilot-chat3.png)

このあたりは本格実装の時は、State Machine などを使ってリファクタリングしたいところです。

アウトラインビューのツリーの開閉のところでちょっと伝わってなくて (VS Code のアウトラインと勘違いしてたようです)、スクショを見せたらすぐに直してくれました。Copilot くんノリノリですw

![Copilot Chat2](/img/blogs/2026/1211_migrating-2000s-era-freeware/copilot-chat2.png)

プロトタイピングで実装したフィーチャー一覧です。

```
- ノードの階層管理（ツリー表示）
- 左ペインアウトラインの開閉（▶ / ▼）
- サイドバーのアウトラインビューでツリー表示（ネットワークビューと選択同期）
- アウトラインビューのコンテキストメニューで Move Up / Move Down / Indent / Outdent
- ツールバーの ↑ / ↓ / → / ← で Move Up / Move Down / Indent / Outdent
- ツールバーはアイコン表示 + Tooltip（title）対応
- 同階層ノードのネットワーク表示（ノード移動、リンク追加）
- 同一ノードペア間の複数リンクを曲線で自動分離表示
- Link Mode（2クリック）で直感的なリンク作成
- Link Mode で始点ノードをネットワーク上にハイライト表示
- 芋づるモード（macOS: ⌘ + ドラッグ / Windows・Linux: Ctrl + ドラッグ）でリンク接続ノードがバネ追従
- vis-network 標準のマルチセレクト/マルチドラッグ
- ネットワーク空白部分のコンテキストメニューから Add Sibling
- Node Color ボタンでカラーピッカーを開き、Apply で選択ノードに色適用
- ネットワークで選択したエッジを対象に Link Label / Unlink を編集
- リンク編集（ラベル変更、削除）
- 選択ノードの Markdown テキスト編集（シンタックスハイライト）
- VS Code テーマ変数に寄せた Markdown ハイライト調整
- 3ビューの選択同期
- ペイン境界のドラッグ調整（左右 / 上下）
- VS Code 標準の保存/ダーティ管理/Undo・Redo（Custom Editor 経由）
- テキスト編集中は autosave 反映を遅延（入力体験を優先）
- ワークスペース直下の `.iedit.json` への保存
- 旧 iEdit JSON（`ieditDoc.nodes` / `ieditDoc.links`）の読み込み互換
```

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

MFC では CDocument が各ビュー(CView の派生クラス)を知っており、個別ビューでのドキュメントへの変更を各ビューに一斉通知します。各ビューでは OnUpdate イベントで必要な再描画を行うという Observer パターンです(図の左部分)。
VS Code 拡張では、VS Code の Extension Host 内で TextDocument としてドキュメントが管理され、拡張側の Webview プロセスの操作により、CustomTextEditorProvider を仲介して TextDocument の変更が行われ、TextDocument の更新も CustomTextEditorProvider 経由で Webview に通知されます(図の右部分)

:::info
アーキテクチャ図の右部分のように要素を破線の枠で囲むような図はオリジナルの iEdit では描けたのですが、vis-network で作ったプロト版には厳しかったです。ダイアグラムを描くだけでなくドローツール的な領域にも踏み込む必要があるためです。ということで上記の図は Gemini に描いてもらいました。
:::

## おまけ: AI に iEdit ファイルを生成してもらう
VS Code 拡張になったことで、Copilot とか Claude Code に 「xxをやって結果を iEdit 形式で吐いて」ってお願いが簡単にできるようになりました。プロンプトで JSON ファイルの形式さえ教えてあげれば、MCP サーバー建てたりとか面倒なことやらなくてもいいのです。

こんなプロンプトを書いて投げてみました。Wikipedia を調べて徳川15代の歴代将軍の家系図を作り、各将軍ノードにそれぞれのプロフィールを書いてもらうというものです。

```markdown:プロンプト
あなたは iEdit JSON 生成アシスタントです。
以下の仕様を厳密に守って、最終的に JSON だけを出力してください（説明文やコードフェンス不要）。

# iEdit JSON 仕様
- ルートはオブジェクト
- 必須キー: version, selectedNodeId, nodes, links
- version は 1
- selectedNodeId は nodes 内に存在する id
- nodes は配列。各要素:
  - id: string（一意）
  - parentId: string | null（root のみ null）
  - label: string
  - text: string（Markdown可）
  - shape?: "box" | "ellipse" | "roundbox"
  - x, y, nodeColor は省略可
- links は配列。各要素:
  - id: string（一意）
  - source: string（nodes.id を参照）
  - target: string（nodes.id を参照）
  - label?: string
- JSON は UTF-8 を想定。妥当な JSON のみ出力

# 構造ルール
- 必ず id="root", parentId=null のノードを 1 つ作る
- それ以外のノードは parentId に既存ノード id を設定
- 同じ id を再利用しない
- links の source/target は必ず既存 id を参照
- 不明な情報は捏造せず text に「要確認」と明記

# 出力前セルフチェック（内部で実施）
1) JSON 構文が正しい
2) nodes.id / links.id の重複なし
3) parentId/source/target の参照整合性 OK
4) selectedNodeId が存在
5) root が 1 件

---
以下のテーマで生成:
Wikipedia情報をもとに、徳川将軍家（初代〜15代）の iEdit JSON を作成

追加要件:
- root 配下に「徳川将軍家」カテゴリを置く
- 初代〜15代の各将軍ノードを作成
- parentId で家系の主系統を表現
- 養子・継承・分家など parentId で表しにくい関係は links で補足
- 各将軍ノード text は 200〜400字
- 各 text 末尾に「出典: Wikipedia（ページ名）」を入れる
- 最終出力は JSON のみ
```

以下が出力された JSON を可視化した結果です。家系図(Family tree) がツリーに展開されてしまいましたね。たまたま選択してた階層に、家綱と綱吉が出てきており、二人が兄弟だったことを知りました。

![Family outline](/img/blogs/2026/1211_migrating-2000s-era-freeware/family1.png)

プロンプトを少し修正。

```markdown:プロンプト
# 構造ルール（重要）
- 必ず id="root", parentId=null のノードを1つ作る
- 必ず id="tokugawa-shogunate", parentId="root" のカテゴリノードを作る
- 将軍ノード（1代〜15代）は **全て parentId="tokugawa-shogunate"** にする
  - 親子を parentId 連鎖で表現しない（フラット構造）
- 血縁・継承・養子・分家などの関係は links で表現する

# 内容要件
- 1代〜15代の将軍ノードを作る
- 各将軍ノード text は 180〜350字程度
- 各 text の末尾に「出典: Wikipedia（ページ名）」を付ける
- 不確かな情報は断定せず「要確認」と明記

# 品質チェック（内部で実施）
1) JSON として妥当
2) nodes.id / links.id 重複なし
3) parentId/source/target の参照整合性OK
4) root は1件のみ
5) 将軍ノードの parentId が全件 tokugawa-shogunate

この条件で JSON を生成してください。
```

今度はちゃんとネットワークに展開されました。iEdit の芋づる機能で綺麗に配置できました。吉宗が家光から生まれてたりして、Wikipedia ちゃんと読めてない感じですが😅。

![Family network](/img/blogs/2026/1211_migrating-2000s-era-freeware/family2.png)

iedit-vscode プロジェクトの NPM パッケージ依存関係を解析してみました。技術スタックがいい感じで可視化されてますね。

![Npm dependencies](/img/blogs/2026/1211_migrating-2000s-era-freeware/package-dependencies.png)

## さいごに
以上、古いフリーソフトウェアを VS Code の拡張としてモダナイズする話でした。オリジナル iEdit では色々と自作してコードも膨大になっていましたが、Copilot の書いてくれたコードはさほど大量でもなく、シンプルです。ドキュメントの編集というドメインが VS Code 拡張に対して提供されている機能とマッチして素早くモノが作れた (VS Code という巨人の肩に乗れた) ということかなと思いました。

プロトなのでまだ Visual Studio Marketplace には公開していませんが、年末年始で機能追加や細かい調整をして公開したいなと考えています。
