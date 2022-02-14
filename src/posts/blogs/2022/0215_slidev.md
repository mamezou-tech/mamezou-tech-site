---
title: Markdown でスライドを作れる Slidev を使う
author: masahiro-kondo
date: 2022-02-15
---

[Slidev](https://sli.dev/) は Markdown でスライドを作成できる NPM パッケージです。

ドキュメントは日本語版もあります。

[概要](https://ja.sli.dev/guide/#概要)ページに書かれている機能性を見ると、普段コードを書いてる人をターゲットにしていることが分かります。

> - 📝 Markdownベース - お気に入りのエディタとワークフローを使用
> - 🧑‍💻 デベロッパーフレンドリー - ビルトインのシンタックスハイライト、ライブコーディングなど
> - 🎨 豊富なテーマ - テーマはnpmパッケージで共有・利用が可能
> - 🌈 スタイリッシュ - Windi CSS オンデマンドユーティリティ、 使いやすい埋め込まれたスタイルシート
> - 🤹 インタラクティブ - Vueコンポーネントをシームレスに埋め込み
> - 🎙 プレゼンターモード - 別のウィンドウ、スマートフォンでさえもスライドを操作
> - 🎨 描画 - スライドに描画し、注釈をつける
> - 🧮 LaTeX - LaTeX数式のビルトインサポート
> - 📰 図形 - 説明と合わせて図形を作成
> - 🌟 アイコン - どんなアイコンセットからでも、直接アイコンにアクセス
> - 💻 エディタ - 統合されたエディタとVS Code拡張機能
> - 🎥 レコーディング - ビルトインのレコーディングとカメラビュー
> - 📤 ポータブル - PDF、PNG、またはホスト可能なSPAにエクスポート
> - ⚡️ 高速 - Vite によって提供されたインスタントリロード
> - 🛠 自由に開発可能 - Viteプラグイン、Vue components、どんなnpmパッケージも使用可能

PowerPoint や Keynote を使わなくても Web 技術を使ったクールなスライドが作れて Git で管理できるのがデベロッパーにウケる要素でしょう。Static Site Generator をスライドに応用した感じです。

> これらのツールや技術を組み合わせることで、Slidevは実現されています。
>
>- Vite - 非常に高速なフロントエンドツール
>- Vue 3をベースにしたMarkdown - 必要に応じてHTMLとVueコンポーネントを使いつつ、コンテンツに集中できます
>- Windi CSS - オンデマンドなユーティリティファーストのCSSフレームワーク、 スライドを自在にスタイリング
>- Prism、Shiki、Monaco Editor - ファーストクラスのコードスニペットサポートとライブコーディング機能
>- RecordRTC - ビルトインのレコーディングとカメラビュー
>- VueUseファミリー - @vueuse/core、@vueuse/head、@vueuse/motionなど
>- Iconify - アイコンセットコレクション
>- Drauu - 描画と注釈のサポート
>- KaTeX - LaTeX数式のレンダリング
>- Mermaid - テキストによる図解

これらの技術について深く知らなくてもスライドは作れますが、知っていれば色々ハックできそうです。Slidev はまだ絶賛開発中なのでやりすぎると将来スライドが壊れてしまうリスクはありますが。

先日書いた [Electron のブログ](/blogs/2022/02/14/history-of-electron-quick-start/)をスライド化するというのをやってみました。

ガイドに従ってプロジェクトを作成します。

[https://ja.sli.dev/guide/install.html](https://ja.sli.dev/guide/install.html)

```shell
$ npm init slidev@latest
Need to install the following packages:
  create-slidev@latest
Ok to proceed? (y)

  ●■▲
  Slidev Creator  v0.28.5

? Project name: › history-of-electron-quick-start
  Scaffolding project in history-of-electron-quick-start ...
  Done.

✔ Install and start it now? … yes
? Choose the agent › - Use arrow-keys. Return to submit.
❯   npm
    yarn
    pnpm
```

localhost:3030 でホスティングが開始され、ブラウザのページでひな形のスライドが表示されます。

![](https://i.gyazo.com/949bd59f7d3d577e7a42c21154a3897a.png)

生成されたファイル構成です。

![](https://i.gyazo.com/c5b0171eeb473b18004d37991e8bd682.png)

生成された slides.md を編集してお好みのスライドを作り上げていきます。

netlify.toml も出力されていて「当然 Netlify にデプロイするでしょ」と言わんばかりです。ということで今回作成したスライドは Netlify で公開しています。

[https://history-of-electron-quick-start.netlify.app](https://history-of-electron-quick-start.netlify.app)

スライドのソースコードは以下のリポジトリにあります。

[GitHub - kondoumh/history-of-electron-quick-start](https://github.com/kondoumh/history-of-electron-quick-start)

以下、このスライドで使用した機能を少し紹介します。


**[クリックアニメーション](https://ja.sli.dev/guide/animations.html#クリックアニメーション)**

クリックしたらテキストを表示するアニメーションを `v-click` ディレクティブで適用可能です[^1]。

[^1]: クリックイベントはナビゲーションバーの矢印ボタンクリックかスペースキーや矢印キーの押下で発動します。

`v-clicks` ディレクティブにより、リストなどの要素に `v-click` ディレクティブを一括適用できます。

スライドの最初のページで使ってみました。

[https://history-of-electron-quick-start.netlify.app/2](https://history-of-electron-quick-start.netlify.app/2)

クリック回数をクエリパラメータで指定すると途中状態のスライドを取得可能です。

[https://history-of-electron-quick-start.netlify.app/2?clicks=2](https://history-of-electron-quick-start.netlify.app/2?clicks=2)

**[コードブロック](https://ja.sli.dev/guide/syntax.html#コードブロック)**

コードブロックの言語名に続けて curly brace の中に注目させたい行を指定できます。以下は、8行目と9行目を目立たせる例です[^2]。

[^2]: `/` はエスケープのためで実際には書きません。

```html
/```html {8,9}
<!DOCTYPE html>
<html>
  <head>
    <title>Hello World!</title>
  </head>
  <body>
    <h1>Hello World!</h1>
    We are using io.js <script>document.write(process.version)</script>
    and Electron <script>document.write(process.versions['electron'])</script>.
  </body>
</html>
/```
```

適用したスライドの例です。

![](https://i.gyazo.com/32bbb8ee06285da73077a291c9ef5591.png)

[https://history-of-electron-quick-start.netlify.app/3](https://history-of-electron-quick-start.netlify.app/3)

このスライドでは使っていませんが、行の指定を `|` で区切るとクリックアニメーションが適用され、注目箇所を複数ステップで変化させることも可能です。

**[アイコン](https://ja.sli.dev/guide/syntax.html#アイコン)**

Material Design Icons などの人気のあるアイコンセットを直接指定してスライドのテキストを装飾できます。

![](https://i.gyazo.com/23527b57eca80ddb4e183b249c73c702.png)

[https://history-of-electron-quick-start.netlify.app/8](https://history-of-electron-quick-start.netlify.app/8)

このスライドでは、以下のようにリスト中でアイコンを指定しています。実際のページでは4行目は、アイコンとテキストをセットでアニメーションさせています。

```md
- <ph-file-html /> index.html
- <ph-file-js /> main.js
- <codicon-json /> package.json
- <span class="animate-pulse"><ph-file-js /> **preload.js**</span>
- <ph-file-js /> renderer.js
```

スライド内スタイルを使ってリスト中の強調したい番号を指定して、色を変えたりしてます。

```html
<style>
  li:nth-child(2) {
    color: blue;
  }
  li:nth-child(4) {
    color: red;
  }
  li:nth-child(5) {
    color: blue;
  }
</style>
```

>

以上、Slidev で簡単なスライドを作成して公開してみました。なかなかよかったので機会があったらまた使ってみます。
