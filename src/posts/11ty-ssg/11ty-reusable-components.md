---
title: Eleventy入門(第2回) - テンプレート・コードを部品化する
author: noboru-kudo
date: 2023-03-15
prevPage: ./src/posts/11ty-ssg/11ty-intro.md
---

[前回記事](/11ty/11ty-intro/)では、Eleventyでマークダウンベースの簡単なサイトを作成する方法をご紹介しました。

サイトがローンチして成長してくると、UIやコードに重複が発生してきます。
このような状況になると、部品化や再利用の仕組みが必要になってきます。

今回は、Eleventyで提供されている部品化テクニックを見ていきたいと思います。

## テンプレートを部品化する

前回はレイアウトファイルを親テンプレートとして作成し、基本的構造をマークダウンコンテンツに適用しました。
これはテンプレートの継承関係を使った共通化です。Eleventyではこのレイアウト機能は2階層以上でも利用可能です。

ここでは、UI部品として定義したテンプレートを他のテンプレートに取りこむ集約関係を使った共通化を実践します。
この機能はEleventyというよりも各テンプレート言語でサポートされる機能を利用します。

テンプレート言語としてLiquidを見ていきますが、他のテンプレートでも基本的には同じ仕組みを持っています。

前回以下のようなLiquidテンプレートのレイアウトファイル(`src/_includes/base.liquid`)を作成しました。

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

シンプルすぎて部品化する価値はありませんが、headerタグを拡張して部品化してみます。
`src/_includes`配下にheader.liquidファイルを用意します。

{% raw %}
```liquid
<header>
    <h1>{{ title }}</h1>
    {%- if description %}
    <sub>{{ description }}</sub>
    {%- endif %}
</header>
```
{% endraw %}

タイトル(title)と説明(description)を受け取るようにしてみました。
また、説明(description)はLiquidの[if](https://shopify.github.io/liquid/tags/control-flow/#if)を使って、存在する場合のみ表示しています。

ヘッダーを部品として切り出したので、レイアウトファイルの方もこれを取り込むように修正します。

{% raw %}
```liquid
<html lang="ja">
<head>
    <title>Eleventyサンプル</title>
    <link href="/css/style.css" rel="stylesheet" />
    <link href="https://unpkg.com/prismjs@1.20.0/themes/prism-okaidia.css" rel="stylesheet">
</head>
<body>
{% render 'header', title: title, description: description %}
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

{% raw %}`{% render, .... %}`{% endraw %}の部分がポイントです。これはLiquidの[renderタグ](https://shopify.github.io/liquid/tags/template/#render)です[^1]。
このタグは指定したLiquidファイルの内容をレンダリングするものです。
ここで先程切り出したheader.liquidのレンダリング結果を取り込んでいます。

[^1]: Eleventyの[ドキュメント](https://www.11ty.dev/docs/languages/liquid/#supported-features)ではincludeが使われていますが、Liquidの[ドキュメント](https://shopify.github.io/liquid/tags/template/#include)ではincludeは非推奨となっていたためrenderを使いました。

ここで渡しているパラメータ(title、description)は実際のコンテンツを記述するマークダウンファイルで指定するのが良さそうです。
マークダウンファイルは以下のようになります。

```markdown
---
title: 部品化したヘッダー
description: Liquidではrenderタグを利用してテンプレートをレイアウトに取り込めます。
layout: base
permalink: /sample/
---

(以降省略)
```

メタ情報(Front Matter)にtitleとdescriptionを設定しました。これが先程部品化したヘッダーにパラメータとして受け渡される形になります。

実際のサイトは以下のように表示されます。

![header.liquid](https://i.gyazo.com/53e7dcf9f26be70bd5529d7358d2ec93.png)

部品化したヘッダーに、マークダウンで指定したタイトルや説明文が表示されていることが分かります。

:::column:マークダウンファイルから部品を取り込む
ここではLiquidのレイアウトファイルから部品を取り込む方法を見ましたが、マークダウンファイルからも使えます。
というのも、マークダウンファイルはプリプロセッサとしてLiquidを使っているからです。
つまり、マークダウンパーサー(markdown-it)の前にLiquidテンプレートとして処理されます。

マークダウンファイルで使う場合は以下のようになります。

{% raw %}
```markdown
## マークダウンファイルでテンプレート部品を使う
以下の記述をすると、マークダウンファイル内のコンテンツとしてLiquidテンプレートのレンダリング結果を表示できます。

{% render 'foo' %}
```
{% endraw %}

このようにマークダウン内にLiquid構文を記述すると、プリプロセッサでLiquidテンプレートとしてfooテンプレートの処理結果が展開されます。
:::

:::column:マークダウンファイルコンテンツの注意点
マークダウンファイルは、マークダウンパーサーだけでなくLiquidテンプレートとしても処理されますので、コンテンツにLiquid構文が含まれる場合に注意が必要です。

よくハマるケースとしてはGoのテンプレートやGitHub Actionsのパイプラインとしてコードスニペットで{% raw %}`{{...}}`{% endraw %}を記述するケースです。
そのままだとこの部分はLiquidテンプレートとして解釈されて、レンダリング結果として何も出力されないということがよくあります。
その部分をコンテンツとして使いたい場合は、該当部分を[rawタグ](https://shopify.github.io/liquid/tags/template/#raw)で囲ってLiquidテンプレートとして解釈しないよう指定する必要があります[^2]。

なお、マークダウンのプリプロセッサをLiquidから変更したり、無効にしたりもできます。詳細は[公式ドキュメント](https://www.11ty.dev/docs/config/#default-template-engine-for-markdown-files)を参照してください[^3]。

[^2]: もちろんLiquidテンプレートをコンテンツとして多用しているこの記事もrawタグをあちこちで使っていたりします。
[^3]: 当初マークダウンはコンテンツを記述するので、プリプロセッサは無効にするのがいいのかなと思っていましたが、メタ情報(Front Matter)では使いたいことも多く悩ましいところです。
:::

## フィルターで変換処理を再利用する

変換処理はフィルターとして部品化すると、テンプレートを簡潔に記述できます。

- [Eleventy Doc - FILTERS](https://www.11ty.dev/docs/filters/)

フィルターはLiquid、Nunjucks、Handlebars、JavaScriptテンプレートで利用可能なものです。
Liquidでは、以下のように使います。

{% raw %}
```liquid
{% assign names = "foo,bar,baz" | split: "," %}
{%- for name in names %}
<p>{{ name | upcase }}</p>
{%- endfor %}
```
{% endraw %}

フィルターは値に対してパイプ`|`で区切って指定します。もちろん複数のフィルターをチェーンでつなげられます。
上記はsplitとupcaseの2つのLiquidの組み込みフィルターを使っています。
 
- split: 文字列をカンマ区切りで配列に変換
- upcase: 英字を大文字に変換

Liquid組み込みフィルターについては[公式ドキュメント](https://shopify.github.io/liquid/)を参照してください。

よく利用されるものとして、以下のEleventy組み込みのフィルター(ユニバーサルフィルター)も提供されています。

- [url](https://www.11ty.dev/docs/filters/url/)
- [slugify](https://www.11ty.dev/docs/filters/slugify/)
- [log](https://www.11ty.dev/docs/filters/log/)
- [get*CollectionItem](https://www.11ty.dev/docs/filters/collection-items/)

このような組み込みのフィルターで満たせない場合は、カスタムフィルターを作成します。
カスタムフィルターはEleventyの設定ファイルに記述するだけです。

例えば、日付を日本語の年月日表記に変換するフィルターは、以下のように記述できます。

```javascript
module.exports = function(eleventyConfig) {
  // (中略)
  eleventyConfig.addFilter("jpDate", (target) =>
    `${target.getFullYear()}年${target.getMonth() + 1}月${target.getDate()}日`);

  // 以下省略
};
```

フィルターの作成にはeleventyConfigのaddFilterを使います。この関数は各テンプレート言語共通のものです。
第1引数にフィルター名、第2引数にコールバック関数[^4]を指定します。
コールバック関数では引数に変換対象、戻り値として変換結果を返します。
ここではフィルター対象の日付を`YYYY年M月D日`のフォーマットに変換して返しています。

このフィルターはテンプレートでは以下のように使用します。

{% raw %}
```liquid
{{ page.date | jpDate }}
```
{% endraw %}

`page.date`はEleventy提供の[組み込み変数](https://www.11ty.dev/docs/data-eleventy-supplied/#page-variable)でページの作成日が設定されます。
実際にこれを実行すると、作成日がフォーマット変換されて出力されるはずです。

[^4]: Eleventy v2.0.0よりLiquid、Nunjucks等の非同期フィルターをサポートするテンプレート言語でasync関数を指定できるようになりました。

## ショートコードで任意のコードを再利用する

フィルターはその名の通り変換処理を担いますが、ショートコードは変換処理に限定せず任意のコードを部品化します。

- [Eleventy Doc - SHORTCODES](https://www.11ty.dev/docs/shortcodes/)

ショートコードもフィルター同様にLiquid、Nunjucks、Handlebars、JavaScriptテンプレートで利用可能です。
ショートコードもフィルターと同等のことができますが、変換処理ではなくHTML断片等のコンテンツ自体を返すことが多いです。

ショートコードの作成もフィルター同様に設定ファイルに定義します。
例えば指定した商品コードに基づく商品情報を表示するコンポーネントを考えてみます。

```javascript
module.exports = function(eleventyConfig) {
  // (中略)
  eleventyConfig.addShortcode("item", async (itemCode) => {
    const target = await itemRepo.find(itemCode);
    if (!target) return "";
    return `<div>
<p>商品: ${target.name}</p>
<p>価格: ${target.price.toLocaleString()}円</p>
</div>`;
  });
  // 以下省略
};
```

先程はaddFilterを使いましたが、ショートコードはaddShortcodeを使います。
フィルター同様に第1引数には名前、第2引数にコールバック関数を記述します。
ここでは商品コードから架空の商品情報を取得し、HTMLコンテンツを返すようにしました。

なお、v2.0.0からはaddShortcodeでコールバック関数に同期/非同期どちらも使えますが、v1系では非同期の関数にはaddAsyncShortcodeを使う必要があります。

このショートコードは、Liquidテンプレートからは以下のように使います。

{% raw %}
```liquid
{% item "0001" %}
```
{% endraw %}

これまでに使ったif/render等と同じように{% raw %}`{% ... %}`{% endraw %}内に記述します。つまり、ショートコードは各テンプレート言語のカスタムタグに変換されます。

このように、ショートコードはカスタムタグなので、以下のように開始・終了タグ内にコンテンツ自体を含められます。

{% raw %}
```liquid
{% item "0001" %}
<p style="font: 1.2rem bold;color: red">大好評です！！在庫なくなり次第終了します。</p>
{% enditem %}
```
{% endraw %}

ここでは、タグのコンテンツとして架空の商品宣伝用のコンテンツを挿入しました。

ショートコードは以下のようになります。

```javascript
module.exports = function(eleventyConfig) {
  // (中略)
  eleventyConfig.addPairedShortcode("item", async (content, itemCode) => {
    const target = await itemRepo.find(itemCode);
    if (!target) return "";
    return `<div>
<p>商品: ${target.name}</p>
<p>価格: ${target.price.toLocaleString()}円</p>
${content}
</div>`;
  });
  // 以下省略
};
```

開始・終了タグとして使う場合は、addPairedShortcodeを使います。
この場合はコールバック関数の第1引数にタグ内のコンテンツが渡されてきます。ここでは、商品情報のコンテンツの最後にこれを追加しました。

これは以下のようなHTMLに変換されます。

```html
<div>
<p>商品: MacBook Pro</p>
<p>価格: 500,000円</p>
<p style="font: 1.2rem bold;color: red">大好評です！！在庫なくなり次第終了します。</p>
</div>
```

ショートコードが生成した結果に、タグのコンテンツが挿入されていることが分かります。

## まとめ

今回は肥大化するサイトをメンテナンスしやすくするために、Eleventyビルトインで用意されている部品化の機能を見てきました。
これらを使いこなせるようになると、より運用しやすいサイトを構築できます。

現時点ではまだコア機能には入っていませんが、Eleventy2.0からはWeb Componentsによるコンポーネント化も導入されています。
まだ使ったことがないのですが、これを利用すれば各コンポーネントに動的な振る舞いを持たせることもできます。
機会があれば、こちらについても試してご紹介したいと思います。

- [Eleventy Doc - WebC(Web Components)](https://www.11ty.dev/docs/languages/webc/)

次回は、Eleventyで多用するコレクションとタグ管理機能について書きたいと思います。

---
関連記事

- [Eleventy入門(第1回) - 11tyで手早く静的サイトを作成する](/11ty/11ty-intro/)
