---
title: Eleventy(11ty)入門 - 導入編
author: noboru-kudo
date: 2023-03-25
---

本サイトは開設当初から静的サイトジェネレーター(SSG)として[Eleventy](https://www.11ty.dev/)を使っています。
もう1年以上使っていますが、特に大きな問題なく運用できています。

そんなEleventyが2023-02-08にv2.0となりました[^1]。

[^1]: 本サイトは2.0のCanaryバージョンから使っていたため、大きな変更なくv2.0にバージョンアップできました。

- [ELEVENTY V2.0.0, THE STABLE RELEASE](https://www.11ty.dev/blog/eleventy-v2/)

Eleventyはコンテンツ重視の静的サイト作成に大きなアドバンテージを持っていますが、特に日本では今ひとつ認知度が少ないと感じます。
そこで、これまでの運用経験からEleventyの入門シリーズを書いてみようかと思います。

## Eleventyの特徴

EleventyはNode.jsベースの静的サイトジェネレーターです。
主に以下の特徴があります。

- デフォルトでゼロコンフィグ。簡単に導入できる。
- 複数テンプレート言語をサポートし、各々は併用OK（HTML、マークダウン、Liquid、Nunjucks、etc...）。
- クライアント(ブラウザ)で動作するJavaScriptなし。パフォーマンスやSEOに強い。

このような特性から、ブログやドキュメントサイトのようなコンテンツベースの静的サイトが得意です。

:::column:好みのフレームワークでクライアント処理を追加する
デフォルトではクライアントで動作するJavaScriptはありませんので、リアクティブ特性やリアルタイムフェッチ等を利用することはできません。
ただ、Eleventyでは[アイランドアーキテクチャ](https://jasonformat.com/islands-architecture/)に対応した公式プラグインが用意されています。
これを導入すれば、SSGのメリットであるパフォーマンスを損なうことなく、好きなフレームワークでクライアント処理を追加できます。
詳細は以下公式ドキュメントにフレームワークの実装例を含めて記載されていますので、参照してください。

- [Eleventy Doc - PARTIAL HYDRATION](https://www.11ty.dev/docs/plugins/partial-hydration/)

本サイトでもこれを導入しており、静的サイトを基本としながらも、部分的に[Preact](https://preactjs.com/)でクライアント処理を追加しています。
:::

コンテンツのビルド速度の点では、Go言語ベースのHugoには及びませんが、JavaScriptベースの静的サイトジェネレーターでは最高クラスとのことです。

- [Eleventy Doc - BUILD PERFORMANCE](https://www.11ty.dev/docs/performance/#build-performance)

:::column:JamstackトレンドでみるEleventyの成長
2022年の[Jamstackトレンド](https://jamstack.org/survey/2022/)の結果から見ても、Eleventyは静的サイトジェネレーターで一定のシェア(19%)と満足度スコア(3.8)を獲得していることが伺えます。

これを受けたNetlifyの予想記事では、2023年も静的サイトジェネレーターとしてEleventyは成長が継続すると予想しています。

> Static site generators: a big leap forward for 11ty
> Rating: A+
> Our riskiest prediction paid off . At 19% share 11ty is still behind Gatsby’s 28%, but 11ty gained 2% in share while Gatsby lost 9%. We think 11ty’s momentum will continue given its stellar 3.8 satisfaction score.

引用元: [Jamstack Trends: How will we develop in 2023?](https://www.netlify.com/blog/jamstack-trend-predictions-2023/)
:::

## Eleventyのセットアップ

任意のnpmプロジェクトにインストールします。

```shell
npm install --save-dev @11ty/eleventy
```

Eleventyはビルド時のみで実行環境(クライアント側)はありませんので、devDependenciesで構いません。
ここでは、現時点で最新のv2.0.0をインストールしました。

## シンプルな静的サイトを作成する

ゼロコンフィグを謳っているだけあって、もうサイトを作成できます。
ここでは、ローカル環境で実際に静的サイトを作成してみます。

プロジェクトルートに以下の内容のindex.liquidというファイルを配置します。

{% raw %}
```html
<html lang="ja">
<head>
  <title>Eleventyサンプル</title>
</head>
<body>
  <h1>Eleventyサンプル</h1>
  <p>バージョン: {{ eleventy.version }}</p>
</body>
</html>
```
{% endraw %}

一見HTMLですが、{% raw %}{{ eleventy.version }}{% endraw %}の部分は、[Liquid](https://www.11ty.dev/docs/languages/liquid/)というテンプレート言語の文法になっています。
特徴のところでも触れましたが、Eleventyは複数のテンプレート言語をサポートしており、Liquidはその1つで公式ドキュメントでよく使われているものの1つです。

ここではEleventy組み込みの変数(eleventy.version)からバージョンを出力しています[^2]。

[^2]: Eleventy組み込み変数の詳細は[公式ドキュメント](https://www.11ty.dev/docs/data-eleventy-supplied/)を参照してください。

:::column:Eleventyでサポートするテンプレート
Eleventyでは多数のテンプレートを併用可能です。
現時点での公式ドキュメントでは、以下のテンプレートをサポートしています。

1. [Liquid](https://www.11ty.dev/docs/languages/liquid/)
2. [Nunjucks](https://www.11ty.dev/docs/languages/nunjucks/)
3. [マークダウン](https://www.11ty.dev/docs/languages/markdown/)
4. [HTML](https://www.11ty.dev/docs/languages/html/)
5. [WebComponents(WebC)](https://www.11ty.dev/docs/languages/webc/)
6. [JavaScript](https://www.11ty.dev/docs/languages/javascript/)
7. [Handlebars](https://www.11ty.dev/docs/languages/handlebars/)
8. [Mustache](https://www.11ty.dev/docs/languages/mustache/)
9. [EJS](https://www.11ty.dev/docs/languages/ejs/)
10. [HAML](https://www.11ty.dev/docs/languages/haml/)
11. [Pug](https://www.11ty.dev/docs/languages/pug/)

かなりの数でどれを使うか悩むところですね。公式ドキュメントだとほとんどがレイアウトとしてLiquidまたはNunjucks、コンテンツにマークダウンが使われていますので、こだわりがなければその辺りを採用するのが無難かなと思います。
とはいえ、v2.0.0以降で利用可能になったWebComponents(WebC)は個人的に注目しています。

なお、デフォルトでは拡張子で使用するテンプレートエンジンが決まりますが、設定で切り替え可能です。
詳細は公式ドキュメントを参照してください。

- [Eleventy Doc - TEMPLATE LANGUAGES](https://www.11ty.dev/docs/languages/#overriding-the-template-language)
:::

後は、Eleventyのコマンドを実行するだけです。
ローカル環境ではEleventyにビルトインされている[Devサーバー](https://www.11ty.dev/docs/dev-server/)を使います。

```shell
npx @11ty/eleventy --serve
```
```
[11ty] Writing _site/index.html from ./index.liquid
[11ty] Wrote 1 files in 0.11 seconds (v2.0.0)
[11ty] Watching…
[11ty] Server at http://localhost:8081/
```

ここでLiquidテンプレートエンジンで変換されています。
ビルド結果はデフォルトの`_site`ディレクトリにHTMLファイルとして出力されています。
実際の`_site/index.html`の内容は以下です。

```html
<html lang="ja">
<head>
  <title>Eleventyサンプル</title>
</head>
<body>
  <h1>Eleventyサンプル</h1>
  <p>バージョン: 2.0.0</p>
</body>
</html>
```

バージョンが`2.0.0`に変換されて出力されていることが分かります。

また、`--serve`オプションによりビルド後にEleventyビルトインのDevサーバーが起動し、このコンテンツを配信している状態になります。
ブラウザで`http://localhost:8080/` にアクセスすれば上記ページが表示されます。

Devサーバー起動中に、HTMLテンプレートを変更すればリアルタイムにビルドが実行され、サイトも更新されます（ホットリロード）。

:::column:インクリメンタルにビルドする
コンテンツが増えてくると、ホットリロード時のページ生成に時間がかかるようになります。
そのような状態になった場合は、`--incremental`オプションをつけると増分ビルドになりますので、ホットリロードが劇的に高速化されます。

```shell
npx @11ty/eleventy --serve --incremental
```

また、v2.0.0からは`--ignore-initial`を組み合わせると、初回ビルドすらスキップして、前回ビルド結果を再利用できます。
ただし、Devサーバーを起動中の変更のみを増分ビルドとして認識するため、使い方には注意が必要です（起動していない間の変更はフルビルドしないと反映されない）。
詳細は公式ドキュメントを参照してください。

- [Eleventy Doc - --ignore-initial TO RUN ELEVENTY WITHOUT AN INITIAL BUILD](https://www.11ty.dev/docs/usage/#ignore-initial-to-run-eleventy-without-an-initial-build)
:::

なお、コンテンツ作成が終わって、サーバー環境やホスティングサービスにデプロイする際はDevサーバーは不要ですので、`--serve`なしで同コマンドを実行します。
後はビルド結果の`_site`ディレクトリのコンテンツをデプロイするだけです。
もちろん、これはGitHub Actions等のCI/CDパイプライン上での実行になるかと思います。

## マークダウンでコンテンツを作成する

先程はシンプルなLiquidベースのHTMLをコンテンツに使いましたが、ブログやドキュメントサイト等では、一般的にマークダウンで作成することが多いかと思います。
ここではマークダウンを使ってコンテンツを作成してみます。

その前にコンテンツページ共通のレイアウトを定義します。`_includes`ディレクトリを作成し、その中に以下のファイル(base.liquid)を配置します。
Eleventyでは、このディレクトリ内のファイルは他のテンプレートから利用される特殊なものとして扱われます。EleventyでビルドしてもHTMLページとして出力されません。

{% raw %}
```liquid
<html lang="ja">
<head>
    <title>Eleventyサンプル</title>
</head>
<body>
<header>
    <h1>Eleventyサンプル</h1>
</header>
<article>
    {{ content }}
</article>
<footer>
    <p>&copy; mamezou-tech</p>
</footer>
</body>
</html>
```
{% endraw %}

先程と同様に、Liquidテンプレートで記述したものです。
ここでのポイントは、{% raw %}`{{ content }}`{% endraw %}となっている部分です。

Eleventyでは、このcontent変数に子テンプレートの内容が設定されます。
ここでコンテンツファイルの内容をそのままHTML内に挿入するようにしています。

後はこれを利用する実際のコンテンツです。以下のマークダウンを作成します。

```markdown
---
layout: base
---
# サンプルページ
Eleventyのドキュメントはこちらです！！

- [Eleventy Doc](https://www.11ty.dev/)
``` 

上部のメタ情報(Front Matterといいます)に`layout: base`としてテンプレートを指定しています[^3]。
こうするとEleventyは、`_include`ディレクトリ内のbaseレイアウト(つまり先程作成したbase.liquid)の子テンプレートとして認識します。

[^3]: ここではYAMLで記述していますが、JavaScriptやJSON形式もサポートしています。

それ以降は通常のマークダウン記法で記述するだけです。
Eleventyではマークダウンパーサーのライブラリとして[markdown-it](https://github.com/markdown-it/markdown-it)を使ってHTMLに変換します。

この段階でDEVサーバーが起動していれば、Eleventyがマークダウンファイルの追加を検知して`_site/sample/index.html`にHTMLが出力されているはずです。

```html
<html lang="ja">
<head>
    <title>Eleventyサンプル</title>
</head>
<body>
<header>
    <h1>Eleventyサンプル</h1>
</header>
<article>
    <h1>サンプルページ</h1>
<p>Eleventyのドキュメントはこちらです！！</p>
<ul>
<li><a href="https://www.11ty.dev/">Eleventy Doc</a></li>
</ul>

</article>
<footer>
    <p>&copy; mamezou-tech</p>
</footer>
</body>
</html>
```

LiquidテンプレートにマークダウンのコンテンツがHTMLに変換されて挿入されているのが分かります。
ブラウザから`http://localhost:8080/sample/`にアクセスすればWebページとして参照できます。

:::column:マークダウンパーサーのカスタムレンダラー
マークダウンパーサーとして使っているmarkdown-itは、カスタマイズやプラグインで拡張したい場合がほとんどかと思います。
このような場合は、公開されているmarkdown-itのプラグインや自作レンダラーも適用できます。

- [NPM - markdown-it プラグイン](https://www.npmjs.com/search?q=keywords:markdown-it-plugin)

これらは後述のEleventyの設定ファイルを利用してEleventyに適用可能です。
:::

## Eleventyの設定ファイル

これまでは全てデフォルトを使ってきましたが、Eleventyを使いこなすには、設定ファイルを理解する必要があります。

Eleventyの設定ファイルは、プロジェクトルートに配置します。
デフォルトでは、以下のいずれかのファイル名で作成します。

- .eleventy.js
- eleventy.config.js
- eleventy.config.cjs

このうち、eleventy.config.js/eleventy.config.cjsはv2.0.0以降から登場しています[^4]。

[^4]: これ以外を設定ファイルとして使用する場合は、CLIオプション(--config)で指定します。

このEleventy設定で、よく使うものだと以下のようなものがあります。

- [Eleventyプラグイン](https://www.11ty.dev/docs/plugins/)の追加
- [デフォルトディレクトリ構造](https://www.11ty.dev/docs/config/#configuration-options)変更
- [ショートコード](https://www.11ty.dev/docs/shortcodes/)・[フィルター](https://www.11ty.dev/docs/filters/)追加
- [カスタムCollection](https://www.11ty.dev/docs/collections/#advanced-custom-filtering-and-sorting)追加
- [パススルーコピー](https://www.11ty.dev/docs/copy/)(CSS/Image等の静的アセットのコピー)
- [Eleventy監視対象](https://www.11ty.dev/docs/watch-serve/)追加
- [ライフサクルイベントフック](https://www.11ty.dev/docs/events/)
- [マークダウンパーサー(markdown-it)のカスタマイズ](https://www.11ty.dev/docs/languages/markdown/)

詳細な設定はEleventyの[公式ドキュメント](https://www.11ty.dev/docs/config/)を参照してください。

例えば、以下のファイルを作成したとします。

```javascript
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");

module.exports = function(eleventyConfig) {
  // ①
  eleventyConfig.addPlugin(syntaxHighlight);
  // ②
  eleventyConfig.addPassthroughCopy("./src/css");

  return {
    dir: {
      // ③
      input: "src",
      // ④
      output: "dist"
    }
  };
};
```

ここでは以下の設定をしています。

- ① Eleventyプラグインでマークダウンのコードスニペットのシンタックスハイライト有効化
- ② CSSファイルを出力先にコピー
- ③ ベースディレクトリを`src`配下に変更(デフォルトはプロジェクトルート)
- ④ ビルド結果の出力先を`dist`に変更(デフォルトは`_site`)

この設定であれば、プロジェクトのディレクトリ構成は以下のようなものとなります。

```
.
├── src // ベースディレクトリ
│   ├── _includes
│   │   └── base.liquid
│   ├── css // CSS
│   │   └── style.css
│   └── post
│       └── sample.md
├── dist // ビルド結果出力先
│   ├── css
│   │   └── style.css
│   └── post
│       └── sample
├── eleventy.config.js // Eleventy設定ファイル
├── package-lock.json
└── package.json
```

個人的には、ベースディレクトリはデフォルトのプロジェクトルートよりも、`src`のように専用ディレクトリ上にした方が入力/出力が分離されて見栄えが良くなると思います。

先程作成したサイトをベースにすると、`src`配下のファイルは以下のようなものになります。

### src/css/style.css

```css
:root {
  --base-color: #b780ea;
}

header {
  background-color: var(--base-color);
  padding: 5px;
}

header > h1 {
  font-size: 1.2rem;
}

footer {
  background-color: var(--base-color);
  padding: 2px;
}
```

サンプルのCSSです。これはテンプレート処理されずにそのまま出力ディレクトリにコピーされます（パススルーコピー）。

### レイアウトファイル(src/_includes/base.liquid)

```html
<html lang="ja">
<head>
    <title>Eleventyサンプル</title>
    <link href="{{ "/css/style.css" | url }}" rel="stylesheet" />
    <link href="https://unpkg.com/prismjs@1.20.0/themes/prism-okaidia.css" rel="stylesheet">
</head>
<body>
<header>
    <h1>Eleventyサンプル</h1>
</header>
<article>
    {{ content }}
</article>
<footer>
    <p>&copy; mamezou-tech</p>
</footer>
</body>
</html>
``` 

headタグ内に2つのCSSリンクを追加しています。

最初のCSSは`src/css`に配置したもので、2つ目はEleventyのシンタックスハイライトプラグインの利用で必要なものです。
プラグインの詳細は以下の公式ドキュメントを参照してください。

- [Eleventy Doc - SYNTAX HIGHLIGHTING PLUGIN](https://www.11ty.dev/docs/plugins/syntaxhighlight/)

### src/post/sample.md
~~~markdown
---
layout: base
permalink: /sample/
---
# サンプルページ
Eleventyの設定ファイルは以下のようになります。
```javascript
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");

module.exports = function(eleventyConfig) {
  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPassthroughCopy("./src/css");

  return {
    dir: {
      input: "src",
      output: "dist"
    }
  };
};
```
~~~

シンタックスハイライトを有効にしていますので、コードスニペットを記述してみました。
また、メタ情報(Front Matter)に`permalink`を追加し、ページのURLに`/sample`を指定しました。
これを指定しない場合は`src`ディレクトリからのパスとして`/post/sample`がURLとなります。

### 出力結果

この例では以下のようなページが出力されます。

![screen](https://i.gyazo.com/627648cb99bdb7af9a94e0159b5a13dc.png)

## まとめ

今回はEleventyを使い始める手順についてご紹介しました。
EleventyはNPMプロジェクトと同じ感覚で作成でき、すぐに始められることが分かっていただけたと思います。
本サイトも現在500ページ近くありますが、増分ビルドで快適に執筆活動ができています。

次回は、Eleventyのプラグインやマークダウンパーサー(markdown-it)のカスタマイズについて書きたいと思います。