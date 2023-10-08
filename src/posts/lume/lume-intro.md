---
title: Lume入門(第1回) - Denoベースの静的サイトジェネレーターLumeで静的サイトを手早く作る
author: noboru-kudo
date: 2023-10-09
# nextPage: ./src/posts/11ty-ssg/lume--components.md
---

当サイトもそろそろ開設から2年になろうとしています。
これを機(?)に、ページ生成に使っていた静的サイトジェネレーター(SSG)を[Lume](https://lume.land/)に変更しました。

以前はサイトの生成に[Eleventy(11ty)](https://www.11ty.dev/)を使っていました。
Eleventyでも大きな不満はないのですが[^1]、Denoが基盤のLumeに心惹かれて移行を決断しました。

[^1]: あえていうならTypeScriptサポートがないことと、ドキュメントが分かりにくいことでしょうか。

移行にあたっては、サイト自体に加えて執筆体験に大きな変更が発生しないよう配慮しました。
その点でLumeはEleventyを参考に開発されており、Eleventyと機能レベルの互換性が高くとても移行し易かったです。

一通りLumeの機能を使ってみましたので、Lumeに関する入門記事やTipsを記事にしていきたいと思います。
初回はLumeのセットアップと基本的な使い方から見ていきます。

:::info
Deno自体については本サイトで連載記事がありますので、そちらをご参考ください。

- [Deno を始める - 第1回 (開発環境とランタイム)](/deno/getting-started/01-introduction/)
- [Deno を始める - 第2回 (外部ライブラリの利用)](/deno/getting-started/02-use-external-packages/)
- [Deno を始める - 第3回 (SSR)](/deno/getting-started/03-server-side-rendering/)
- [Deno を始める - 第4回 (OS 機能と FFI の利用)](/deno/getting-started/04-using-os-and-ffi/)
- [Deno を始める - 第5回 (WebAssembly の利用)](/deno/getting-started/05-using-wasm/)
- [Deno を始める - 第6回 (Deno Deploy で静的ファイルを配信)](/deno/getting-started/06-serving-files-on-deno-deploy/)
- [Deno を始める - 第7回 (All in one な deno のサブコマンド)](/deno/getting-started/07-all-in-one-deno-sub-commands/)
:::

## Lumeセットアップ

前述の通りLumeはNode.jsではなくDenoで動作します。
未インストールの場合は、まずはDenoをインストールしましょう。
インストール方法は環境によって異なりますので、以下Denoの公式ページを参考にしてください[^2]。

- [Deno Doc - Installation](https://docs.deno.com/runtime/manual/getting_started/installation)

[^2]: 本記事はmacOS(Apple Siliconプロセッサ)の環境で検証しています。

次にLumeをセットアップします。Lumeの[公式ドキュメント](https://lume.land/docs/overview/installation/)の通りに任意ディレクトリを作成して以下を実行します。

```shell
deno run -Ar https://deno.land/x/lume/init.ts
```
```
 ? Choose the configuration file format › _config.ts (TypeScript)
 ? Do you want to install some plugins now? › Maybe later

Lume configuration file saved: _config.ts

🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥

 Lume configured successfully!

    BENVIDO - WELCOME! 🎉🎉

🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥

Quick start:
  Create the index.md file and write some content
  Run deno task serve to start a local server

See https://lume.land for online documentation
See https://discord.gg/YbTmpACHWB to propose new ideas and get help at Discord
See https://github.com/lumeland/lume to view the source code and report issues
See https://opencollective.com/lume to support Lume development

Deno configuration file saved: deno.json
```

実行すると構成に関していくつか質問されます。
ここでは`_config.ts`の利用言語はTypeScript、プラグインは指定なし(`Maybe later`)としました。

直下に以下のファイルが作成されます。

```
.
├── _config.ts
└── deno.json
```

何だかnode_modulesがないのは気持ちがいいものですね。
`deno.json`はDeno自体の構成ファイルでNode.jsでいう`package.json`です。
`_config.ts`がLumeの設定ファイルです。初期状態は以下のようになっています。

```typescript
import lume from "lume/mod.ts";

const site = lume();

export default site;
```

先ほどのセットアップ時の質問で任意のプラグインを指定していれば、ここにプラグインのセットアップコードが生成されます。
それ以外にもビルドのカスタマイズ、テンプレートのフィルター等、Lumeに関する設定全般をここで指定することになります。

## マークダウンファイルから静的ページを生成する

まだ何の設定も追加していませんが、実はこの状態でマークダウンファイルを作成するだけでも、静的サイトジェネレーターとして機能します。

試しに以下のマークダウンファイル(index.md)を作成します。

````markdown
---
title: Lumeで始めるブログサイト運営
url: /blogs/lume/
---

## Lumeとは

[Lume](https://lume.land/)はDenoで動作する静的サイトジェネレーター(SSG)です。

[公式ドキュメント](https://lume.land/docs/overview/about-lume/)によると、以下のような特徴を持っています。

- マークダウンやJavaScript、JSX、Nunjucksなど、複数フォーマットに対応
- 各プロセッサーのフックして柔軟に拡張可能
- Denoベースのランタイム環境

## インストール

まずは[Deno](https://deno.com/)をインストールしましょう！！

```shell
curl -fsSL https://deno.land/x/install/install.sh | sh
```

続いてLumeのセットアップです。

```shell
deno run -Ar https://deno.land/x/lume/init.ts
```
````

最初にフロントマターと呼ばれるタイトルやURL等のページのメタデータを設定しています。
フロントマターの内容は任意ですが一部のデータはLumeで特別なものとして扱われます。
例えば、ここで使われている`url`は該当ページの公開URLとしてページ生成時のパスやファイル名として利用されます。
フロントマターの詳細は、以下公式ドキュメントを参照してください。

- [Lume Doc - Page data - Standard variables](https://lume.land/docs/creating-pages/page-data/#standard-variables)

次に、ローカル確認用に開発モードでサーバーを起動します。

```shell
deno task serve
# 以下でも同じ
# deno task lume --serve
```

デフォルト3000番ポートでローカル環境にDEVサーバーが起動します。
ブラウザを起動して`http://localhost:3000/blogs/lume/` にアクセスすると以下のようなページが表示されます。

![dev server](https://i.gyazo.com/3551c57872d60db146fd6c8a4e5db7fc.png)

味気ないページですがマークダウンファイルを作成しただけで、それが静的ページとしてHTMLに変換されブラウザで表示されることが確認できます。

この状態でマークダウンファイルを更新すると、Lumeは変更を検知して再ビルド後にブラウザをリロードしてくれます。ここでページの見栄えを確認しながら、ページを作り上げていく形になります。

:::column:ローカルポートを変更する
ローカルDEVサーバーの起動ポートを変更する場合は引数(`--port`)、または`_config.ts`で指定します。
以下はポートを8000番に変更する例です。

```shell
deno task serve --port 8000
# 以下でも同じ
# deno task lume --serve --port 8000
```
```typescript
const site = lume({
  server: {
    port: 8000
  }
});
```
:::

サーバーを起動せずに静的ページを生成する場合は、以下のコマンドを実行します。

```shell
deno task build
# 以下でも同じ
# deno task lume
```

デフォルトでは`_site`ディレクトリ配下にページが生成されています。
実際にデプロイする際には、このディレクトリ配下をそのままアップロードするだけです。

このようにゼロコンフィグの状態でも、簡単に静的サイトがプレビューやデプロイできることが実感できます。

:::column:出力先ディレクトリを変更する
出力先ディレクトリの変更もコマンド引数(`--dest`)または`_config.ts`ファイルで行います。
以下は`public`ディレクトリに変更する例です。

```shell
deno task build --dest public
# 以下でも同じ
# deno task lume --dest public
```
```typescript
const site = lume({
  dest: "public"
});
```
:::

## スタイルシートでページの見栄えを良くする

ここで、設定をいくつか加えてもう少し見栄えの良いページにしていきます。
まずはページにスタイルを当てていきましょう。普通にCSSを作成してもいいのですが、せっかくなのでSCSSで作成してみます。

プロジェクトルート直下に`css`をディレクトリを作成して、以下のSCSS(`style.scss`)を配置します。

```scss
@import url('https://fonts.googleapis.com/css2?family=Pacifico&family=Roboto:wght@400;700&display=swap');

$font-stack-body: 'Roboto', sans-serif;
$font-stack-heading: 'Pacifico', cursive;
$primary-color: #e74c3c;
$secondary-color: #f39c12;
$tertiary-color: #3498db;
$text-color: #2c3e50;
$background-color: #ecf0f1;

@mixin border-radius($radius) {
  -webkit-border-radius: $radius;
  -moz-border-radius: $radius;
  -ms-border-radius: $radius;
  border-radius: $radius;
}

body {
  font-family: $font-stack-body;
  background-color: $background-color;
  color: $text-color;
  margin: 0;
  padding: 0;
}

header {
  background: linear-gradient(to right, $primary-color, $secondary-color);
  color: white;
  padding: 20px;

  h1 {
    font-family: $font-stack-heading;
    font-size: 2em;
  }
}

article {
  margin: 20px;
  padding: 20px;
  background-color: white;
  @include border-radius(10px);

  h2 {
    color: $tertiary-color;
    font-family: $font-stack-heading;
  }
}

footer {
  background: linear-gradient(to left, $secondary-color, $primary-color);
  color: white;
  text-align: center;
  padding: 10px;
  bottom: 0;
  width: 100%;
}
```

次に、このCSSをマークダウンファイルから生成するHTMLに読み込ませます。これにはレイアウトファイルを使います。
レイアウトファイルはページの枠組みを定義するもので、各ページで共通の部分として作成します。

レイアウトファイルには多くのテンプレート言語がサポートされていますが、ここではビルトインで使えるMozillaの[Nunjucks](https://mozilla.github.io/nunjucks/)を使います。
`_includes/layouts`ディレクトリを作成し、以下の`blog.njk`を配置します。

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{ title }}</title>
  <link rel="stylesheet" href="/css/style.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism.min.css" />
</head>
<body>
<header>
  <h1>サンプルブログサイト</h1>
</header>

<main>
  <article>
    <h2>{{ title }}</h2>
    {{ content | safe }}
  </article>
</main>

<footer>
  <p>&copy; 2023 豆香ブログ</p>
</footer>
</body>
</html>
```

headタグ内で`<link rel="stylesheet" href="/css/style.css" />`としてCSSファイルを読み込んでいます。
ただし、先ほどSCSSとして配置していますのでこのままでは読み込みエラーとなります。これには後述のプラグインを使います。
また、それ以外にもコードハイライト用にPrismのCSSもCDNから追加しています。

その他にもいくつかポイントがあります。
まずは、変数として`title`を使っていますが、これは先ほどマークダウンファイル作成時にフロントマターで指定したものです。テンプレートファイルではそのままプレースホルダーとして利用できます。

もう1つは`content`です。これは特殊な変数です。ここにはLumeによりレイアウトを使用しているテンプレート(この場合はマークダウンファイル)の本文が設定されます。
なお、Nunjucksのフィルターとして使われている`safe`はNunjucksビルトインのフィルター[^3]で、この内容が安全であるものとしてマークしています。

:::column:_includeディレクトリはページ生成対象外
レイアウトファイルを配置した`_include`ディレクトリは特殊なディレクトリとして認識され、ページ生成の対象とはなりません。
ここにはページ内で使われる部品も配置することから、レイアウトファイルは`_include`直下ではなく`layouts`等のサブディレクトリに配置することが多いようです。

なお、このディレクトリ名も`_config.ts`で変更可能です。
以下は`_common`に変更する例です。

```typescript
const site = lume({
  includes: "_common"
});

// または
// site.includes([".njk"], "_common");
```
:::

[^3]: <https://mozilla.github.io/nunjucks/templating.html#safe>

このレイアウトファイルを使用するようにマークダウンファイルを変更します。
これはマークダウンファイルのフロントマターで`layout`変数を指定するだけです。

```markdown
---
title: Lumeで始めるブログサイト運営
url: /blogs/lume/
# ↓追加
layout: layouts/blog.njk
---
```

最後にSCSSの変換やコードハイライト設定をします。Lumeではこれらはとても簡単です。
ここでは以下プラグインを使います。

- [Lume Plugins - SASS](https://lume.land/plugins/sass/)
- [Lume Plugins - Prism](https://lume.land/plugins/prism/)

`_config.ts`を以下のように変更します。

```typescript
import lume from "lume/mod.ts";
// ↓追加
import sass from "lume/plugins/sass.ts";
import prism from "lume/plugins/prism.ts";
import "npm:prismjs@1.29.0/components/prism-bash.js";

const site = lume();
// ↓追加
site.use(sass())
site.use(prism())
```

なんとこれだけです。たったこれだけでプラグインがCSS変換やコードハイライトをしてくれます。
もちろんプレビューしながら、変更の即時反映もやってくれます[^4]。

[^4]: ただし`_config.ts`変更時は再起動が必要です。

ここまでやった段階でサイトは以下のようになっています。

![CSS applied](https://i.gyazo.com/4c5a7a414ef8480c066ecd12557aefaf.png)

だいぶ見栄えが良くなりました。

:::column:Lumeプラグイン
プラグインは自作もできますが、多くのプラグインがLumeから提供されています。
まず、ここから自分に合うものがあるのかを探すのがお得です。

- [Lume - Plugins](https://lume.land/plugins/?status=all)

自作する場合も、これらのプラグインのソースコードを参考にするとかなり手早く作れると思います。
:::

:::column:マークダウンパーサーをカスタマイズする
Lumeではマークダウンパーサーに[markdown-it](https://github.com/markdown-it/markdown-it)を使っています。
今回は実施していませんが、このmarkdown-itのカスタマイズやプラグイン拡張ができます。

markdown-itのカスタマイズやプラグインをLumeで使う場合は`_config.ts`を修正します。

例えば、マークダウン改行設定、markdown-itの[FootNoteプラグイン(注釈機能)](https://github.com/markdown-it/markdown-it-footnote)を利用する場合は以下のようにします。

```typescript
import footNote from "npm:markdown-it-footnote@^3.0.3"; // npmレポジトリから取得

const markdown: Partial<PluginOptions["markdown"]> = {
  options: {
    breaks: true // マークダウンの改行を<br>タグに変換
  },
  plugins: [ footNote ] // FootNoteプラグイン
};

const site = lume({}, { markdown });
```

Denoでnpmレポジトリが正式サポートされるようになったので適用は簡単です。

詳細は以下公式ドキュメントを参照してください。

- [Lume Plugins - Markdown](https://lume.land/plugins/markdown/)
:::

## まとめ

今回はLumeを使って簡単な静的サイトを作成してみました。
単純なHTML変換だけでなく、各種プラグインを利用することで簡単に本格的な静的サイトが作成できました。
実際に触ってみると、Eleventyに負けないほど高速かつ拡張もしやすく当サイトでも運用できそうだと思いました。

ここではごく一部の機能しか紹介できていませんので、次回以降で掘り下げていきたいと思います。