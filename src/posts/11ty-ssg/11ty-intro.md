---
title: Eleventy入門(第1回) - 11tyで手早く静的サイトを作成する
author: noboru-kudo
date: 2023-03-08
---

本サイトは開設当初から静的サイトジェネレーター(SSG)として[Eleventy](https://www.11ty.dev/)を使っています。
もう1年以上使っていますが、特に大きな問題なく運用できています。

そんなEleventyが2023-02-08にv2.0となりました[^1]。

[^1]: 本サイトは2.0のCanaryバージョンから使っていたため、大きな変更なくv2.0にバージョンアップできました。

- [ELEVENTY V2.0.0, THE STABLE RELEASE](https://www.11ty.dev/blog/eleventy-v2/)

Eleventyはコンテンツ重視の静的サイト作成に大きなアドバンテージを持っていますが、特に日本では今ひとつ認知度がないと感じます。
そこで、これまでの運用経験からEleventyの入門シリーズを書いてみようかと思います。

## Eleventyの特徴

EleventyはNode.jsベースの静的サイトジェネレーターです。
主に以下の特徴があります。

- デフォルトでゼロコンフィグ。簡単に導入できる。
- 複数テンプレート言語をサポートし、各々は併用OK（HTML、マークダウン、Liquid、Nunjucks、etc...）。
- クライアント(ブラウザ)で動作するJavaScriptなし。パフォーマンスやSEOに強い。

このような特性から、ブログやドキュメントサイトのようなコンテンツベースの静的サイトが得意です。
類似のツールとしては、[Astro](https://astro.build/)が近いのかなと思います[^2]。

[^2]: Astroは本サイトの[ブログ記事](/blogs/2022/09/07/build-doc-site-with-astro/)でも紹介していますのでご参考ください。個人的にはAstroはTypeScriptをファーストクラスサポートしているのが魅力です。

:::column:好みのフレームワークでクライアント処理を追加する
デフォルトではクライアントで動作するJavaScriptはありませんので、そのままではUIにリアクティブ性を持たせたり、リアルタイムにデータフェッチするようなことはできません。
ただ、Eleventyでは[アイランドアーキテクチャ](https://jasonformat.com/islands-architecture/)に対応した公式プラグインが用意されています。
これを導入すれば、SSGのメリットであるパフォーマンスを損なうことなく、好きなフレームワークでクライアント処理を追加できます。
詳細は以下公式ドキュメントに各フレームワークの実装例を含めて記載されています。興味のある方はご参照ください。

- [Eleventy Doc - PARTIAL HYDRATION](https://www.11ty.dev/docs/plugins/partial-hydration/)

本サイトでもこれを導入しており、静的サイトを基本としながらも、部分的に[Preact](https://preactjs.com/)でクライアント処理を追加しています。
:::

コンテンツのビルド速度の点では、Go言語ベースのHugoには及びませんが、JavaScriptベースの静的サイトジェネレーターでは最高クラスとのことです。

- [Eleventy Doc - BUILD PERFORMANCE](https://www.11ty.dev/docs/performance/#build-performance)

:::column:JamstackトレンドでみるEleventyの成長
2022年の[Jamstack Servey](https://jamstack.org/survey/2022/)の結果から見ても、Eleventyは静的サイトジェネレーターで一定のシェア(19%)と満足度スコア(3.8)を獲得しています。

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

Eleventyは実行環境(クライアント側)としてのJavaScriptはありませんので、devDependenciesで構いません。
ここでは、現時点で最新のv2.0.0をインストールしました。

## 最もシンプルな静的サイトを作成する

ゼロコンフィグを謳っているだけあって、もうこの時点でサイトを作成できます。
ここでは、ローカル環境で最小限の静的サイトを動作させてみます。

プロジェクトルートに、以下の内容でindex.liquidというファイルを配置します。

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

一見HTMLですが、{% raw %}`{{ eleventy.version }}`{% endraw %}の部分は、[Liquid](https://www.11ty.dev/docs/languages/liquid/)というテンプレート言語の文法になっています。
特徴のところでも触れましたが、Eleventyは複数のテンプレート言語をサポートしています。Liquidはその中の1つで、Shopifyで開発されているものです。

ここでは組み込みの変数(eleventy.version)からEleventyのバージョンを出力しています[^3]。

[^3]: Eleventy組み込み変数の詳細は[公式ドキュメント](https://www.11ty.dev/docs/data-eleventy-supplied/)を参照してください。

:::column:Eleventyでサポートするテンプレート
Eleventyでは多数のテンプレートをサポートしているだけでなく、各テンプレートは併用可能です。
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

ここで、Eleventyの起動コマンドを実行します。
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

ここでビルドが実行されて、先程のテンプレートがLiquidテンプレートエンジンで変換されています。
ビルド結果は、デフォルトの`_site`ディレクトリに出力されています。
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

セットアップしたEleventyのバージョン`2.0.0`が出力されていることが分かります。

また、`--serve`オプションによりビルド後にEleventyビルトインのDevサーバーが起動し、このコンテンツを配信している状態になります。
ブラウザで`http://localhost:8080/` にアクセスすれば上記ページが表示されます。

なお、この状態でテンプレートファイルを更新すればリアルタイムにビルドが実行され、サイトも更新されます（ホットリロード）。

:::column:インクリメンタルにビルドする
コンテンツが増えてくると、ホットリロード時のビルド時間がかかるようになります。
そのような状態になった場合は、`--incremental`オプションをつけると増分ビルドになり、この時間は劇的に高速化されます。

```shell
npx @11ty/eleventy --serve --incremental
```

v2.0.0からは`--ignore-initial`を組み合わせると、初回ビルドすらスキップして、前回ビルド結果を再利用できます。
ただし、Devサーバーを起動中の変更のみを増分ビルド対象として認識するため注意が必要です(つまり、起動していない間の変更はフルビルドしないと反映されません）。
詳細は公式ドキュメントを参照してください。

- [Eleventy Doc - --ignore-initial TO RUN ELEVENTY WITHOUT AN INITIAL BUILD](https://www.11ty.dev/docs/usage/#ignore-initial-to-run-eleventy-without-an-initial-build)
:::

なお、サーバー環境やホスティングサービスにデプロイする際は、`--serve`なしで同コマンドを実行します。
後は`_site`ディレクトリ配下を対象環境にデプロイするだけです。
もちろん、これはGitHub Actions等のCI/CDパイプライン上での実行になるかと思います。

## マークダウンでコンテンツを作成する

先程はシンプルなLiquidベースのHTMLをコンテンツに使いましたが、ブログやドキュメントサイト等では、一般的にマークダウンで作成することが多いかと思います。
ここではマークダウンを使ってコンテンツを作成してみます。

その前にコンテンツページ共通のレイアウトを定義します。`_includes`ディレクトリを作成し、その中に以下のファイル(base.liquid)を配置します。

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

Eleventyでは、このディレクトリ内のファイルは他のテンプレートから利用される特殊なものとして扱われます[^4]。
つまり、このディレクトリ配下はビルドしても単独のページ(HTML)として出力されません。

[^4]: `_includes`というディレクトリ名は設定により変更可能です。詳細は[公式ドキュメント](https://www.11ty.dev/docs/config/#directory-for-includes)を参照してください。

このレイアウトファイルのポイントは、{% raw %}`{{ content }}`{% endraw %}の部分です。
Eleventyでは、このcontent変数に子テンプレートの内容(変換結果)が設定されます。
ここでは、この内容をそのままHTMLに挿入するようにしています。

後はこれを利用する実際のコンテンツ(子テンプレート)です。プロジェクトルートに以下のマークダウン(sample.md)を作成します。

```markdown
---
layout: base
---
# サンプルページ
Eleventyのドキュメントはこちらです！！

- [Eleventy Doc](https://www.11ty.dev/)
``` 

上部のメタ情報(Front Matterといいます)に`layout: base`と親テンプレートを指定しています[^5]。
こうするとEleventyは、このテンプレートをbaseレイアウト(先程作成したbase.liquid)の子テンプレートとして認識します。

[^5]: ここではYAMLで記述していますが、JavaScriptやJSON形式もサポートしています。

以降は通常のマークダウン記法で記述するだけです。

この段階でDevサーバーが起動していれば、Eleventyがマークダウンファイルの追加を検知して`_site/sample/index.html`にHTMLが出力されているはずです。

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
ブラウザから`http://localhost:8080/sample/`にアクセスすれば、Webページとして参照できます。

Eleventyでは、このマークダウンのHTML変換に[markdown-it](https://github.com/markdown-it/markdown-it)ライブラリを使っています。
通常はmarkdown-itそのままでなく、カスタマイズやプラグインで拡張したい場合が多いかと思います。
後述の設定ファイルを使えば、以下のように公開されているmarkdown-itプラグインや自作プラグインも適用できます。

- [NPM - markdown-it プラグイン](https://www.npmjs.com/search?q=keywords:markdown-it-plugin)

## Eleventyの設定ファイルを理解する

これまでは全てデフォルトの状態で使ってきましたが、Eleventyを使いこなすには、設定ファイルを理解する必要があります。
Eleventyのカスタマイズや拡張はこの設定ファイルが必ず登場します。

Eleventyの設定ファイルは、プロジェクトルートに配置します。
デフォルトでは、以下のいずれかのファイル名で作成します。

- .eleventy.js
- eleventy.config.js
- eleventy.config.cjs

このうち、eleventy.config.js/eleventy.config.cjsはv2.0.0以降から登場しています[^6]。

[^6]: これ以外を設定ファイルとして使用する場合は、CLIオプション(--config)で指定します。

Eleventyの設定ファイルは、以下のように記述します。

```javascript
module.exports = function(eleventyConfig) {
  
  // 引数のeleventyConfigに設定をする
  
  // 戻り値でデフォルト挙動をカスタマイズ
  return {
    // ...
  };
};
```

Eleventyの設定(eleventyConfig)を引数で受け取り、基本はそれに対してカスタマイズを加えていきます。
また、ディレクトリ構造やテンプレートエンジン等、戻り値として設定するものもあります。

以下は利用頻度が高い(と思う)設定です。

- [Eleventyプラグイン](https://www.11ty.dev/docs/plugins/)の追加
- [デフォルトディレクトリ構造](https://www.11ty.dev/docs/config/#configuration-options)変更
- [ショートコード](https://www.11ty.dev/docs/shortcodes/)・[フィルター](https://www.11ty.dev/docs/filters/)追加
- [カスタムCollection](https://www.11ty.dev/docs/collections/#advanced-custom-filtering-and-sorting)追加
- [パススルーコピー](https://www.11ty.dev/docs/copy/)(CSS/Image等の静的アセットのコピー)
- [Eleventy監視対象](https://www.11ty.dev/docs/watch-serve/)追加
- [ライフサクルイベントフック](https://www.11ty.dev/docs/events/)
- [マークダウンパーサー(markdown-it)のカスタマイズ](https://www.11ty.dev/docs/languages/markdown/)

## Eleventyをカスタマイズする

ここで、Eleventyの設定ファイルを追加して、少し実践的なものに変えていきます。

以下のEleventy設定ファイル(ここではeleventy.config.jsとしています)を配置します。

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
      output: "public"
    }
  };
};
```

ここでは、以下の設定をしています。

- ① Eleventyプラグインでコードスニペットのシンタックスハイライト有効化
- ② スタイルシート(CSS)はそのままコピー
- ③ ベースディレクトリを`src`配下に変更(デフォルトはプロジェクトルート)
- ④ ビルド結果の出力先を`public`に変更(デフォルトは`_site`)

なお、Eleventyのプラグインは事前にnpmインストールしておきます。
```shell
npm install --save-dev @11ty/eleventy-plugin-syntaxhighlight
```

プラグインの詳細は、以下公式ドキュメントを参照してください。

- [Eleventy Doc - SYNTAX HIGHLIGHTING PLUGIN](https://www.11ty.dev/docs/plugins/syntaxhighlight/)

この設定では、プロジェクトのディレクトリ構成は以下になります。
```
.
├── src // ベースディレクトリ
│   ├── _includes
│   │   └── base.liquid
│   ├── css // スタイルシート
│   │   └── style.css
│   └── post
│       └── sample.md
├── public // ビルド結果出力先
│   ├── css
│   │   └── style.css // パススルーコピー
│   └── sample
│       └── index.html // URL設定変更(後述)
├── eleventy.config.js // Eleventy設定ファイル
├── package-lock.json
└── package.json
```

勘が鋭い方は分かったかもしれません。[Astro](https://docs.astro.build/en/core-concepts/project-structure/)のプロジェクト構造を模倣してみました。

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

サンプルのCSSです。これはテンプレート処理されずそのまま出力ディレクトリにコピーされます。

### レイアウトファイル(src/_includes/base.liquid)

{% raw %}
```html
<html lang="ja">
<head>
    <title>Eleventyサンプル</title>
    <link href="/css/style.css" rel="stylesheet" />
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
{% endraw %}

以前作成したレイアウトファイルに2つのCSSリンクを追加しています。

最初のCSSは`src/css`に配置したもので、それがパススルーコピーされたものを参照しています。

2つ目はEleventyのシンタックスハイライトプラグインの利用で必要なCSSです。
実態は[Prism themes](https://github.com/PrismJS/prism-themes)から提供されているものです。

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
      output: "public"
    }
  };
};
```
~~~

シンタックスハイライトを有効にしていますので、コードスニペットを記述してみました。
また、メタ情報(Front Matter)に`permalink`を追加し、ページURLに`/sample/`を指定しました。
これを指定しない場合のデフォルトは、ベースディレクトリ(`src`)からのパス(`/post/sample/`)がURLとなります。

:::column:ディレクトリレベルで共通のデータをまとめる
ここではマークダウンのメタ情報としてレイアウトやページURLを指定していますが、個別ファイルではなくディレクトリレベルで指定したいところです。
これは、ディレクトリ名と同名のJSON(またはJavaScript)を該当ディレクトリに配置することで実現できます。

この例では、`src/post`ディレクトリ内に以下の`post.json`を作成しす。
{% raw %}
```json
{
  "layout": "base",
  "permalink": "/{{ page.fileSlug }}/"
}
```
{% endraw %}

こうすることで、マークダウンに記述したメタ情報を削除しても、同じ効果が得られます。
なお、マークダウンのメタ情報が存在する場合は、ディレクトリレベルのデータとマージされます。両者に同名のキーが含まれる場合はマークダウンの方が優先されます。

ここで使っている`page.fileSlug`はEleventyが提供する変数でURL用のファイル名が設定されます。詳細は以下公式ドキュメントを参照してください。

- [Eleventy Doc - ELEVENTY SUPPLIED DATA - page VARIABLE](https://www.11ty.dev/docs/data-eleventy-supplied/#page-variable)
:::

### 出力結果

この例では以下のようなページが表示されました。

![screen](https://i.gyazo.com/627648cb99bdb7af9a94e0159b5a13dc.png)

:::column:スタータープロジェクトで実践的なサイトを手早く構築する
Eleventyはカスタマイズの自由度が高く、設定ファイルを作成するにしてもどこから手を付けてよいか分からないかもしれません。
また、(筆者のように)デザインが不得手な方は、出来合いのものをカスタマイズして使いたいことも多いかと思います。

このような人のために、Eleventyではコミュニティ駆動のスタータープロエジェクトが公開されています。
まずはこの中から好みのものを見つけて、自分のサイト向けにカスタマイズしていく形にすると、見た目も良く、各種設定が最適化されたサイトを簡単に構築できます。

- [Eleventy Doc - STARTER PROJECTS](https://www.11ty.dev/docs/starter/)

Lighthouseのスコアも掲載されていますので、選択の参考にすると良いかと思います。
:::

## まとめ

今回は、Eleventyを使い始める手順についてご紹介しました。
使用するテンプレート言語の知識はある程度必要ですが、簡単にサイトを作成できることが分かります。
また、デフォルトでは、クライアントサイドのJavaScriptはありませんので、SEOやパフォーマンス観点でも強力です。

本サイトでも、既に総ページ数は600ページを超えてきましたが、Eleventyで快適(?)な執筆活動ができています。

次回以降、Eleventyのプラグインやショートコード・フィルター等について書きたいと思います。