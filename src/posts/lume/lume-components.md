---
title: Lume入門(第4回) - ページ部品をコンポーネント化して再利用する
author: noboru-kudo
date: 2023-11-01
prevPage: ./src/posts/lume/lume-search.md
---

[前回](/lume/lume-search/)は、Lumeのタグ管理を使ってページの検索性を高める方法をご紹介しました。 
ここでは、SearchプラグインやPaginateプラグインを使ってタグの一覧ページを作成しました。

今回はUIの部品化と再利用がテーマです。
昨今はReactやVue等のフロントエンドフレームワークの普及によってコンポーネント指向でUIを部品化することが当たり前になっています。
LumeはフレームワークではなくSSGの位置付けですが、強力なコンポーネント機能が用意されています。

- [Lume Doc - Components](https://lume.land/docs/core/components/)

公式ドキュメントに記載されているように、Lumeのコンポーネントはテンプレートエンジンに依存せずどこからでも利用可能です。

今回はNunjucksとJSXでコンポーネントを作成し、各種テンプレートから使う方法を見ていきます[^1]。

[^1]: 実は[Lume入門(第2回)](/lume/lume-jsx-mdx/)でUI部品(JSX)を作成してMDXから使う方法は触れられています。

:::info
2023-12-08にLumeがv2にメジャーアップデートしました。これに伴い本記事もv2で動作するよう更新しました。

- [Lume Blog - Lume 2 is finally here!!](https://lume.land/blog/posts/lume-2/)
:::

:::column:_includesディレクトリからUI部品を再利用する
`_includes`ディレクトリはページ本体ではないテンプレートを格納する特殊なディレクトリです。
Lumeのドキュメントではあまり触れられていませんが、このディレクトリはレイアウトファイルだけでなく、コンポーネントでも使えます。
以下はNunjucksで作成したページから`_includes/component.njk`に配置したコンポーネントを利用する例です。

```html
<article>
  <h2>NunjucksのincludeでUI部品を利用する</h2>
  {% include 'component.njk' %}
</article>
```

[Eleventy](https://www.11ty.dev/docs/languages/nunjucks/)ではこのように使うのが一般的でしたが、Lumeでは本記事で紹介しているテンプレートエンジン非依存のコンポーネント機能がお勧めのようです。
:::

## Nunjucksでコンポーネントを作成する

まずはビルトインテンプレートのNunjucksを使ってみます。
ここではアラートボックス部品をコンポーネントとして作成します。
以下のNunjucksテンプレート(alertbox.njk)を`_components`配下に配置します。

```html
<div class="alert alert-{{type}}">
  {{message}}
</div>
```

タイプとメッセージを受け取って、divタグ内にメッセージを出力するシンプルなものです。

このコンポーネントを使う場合は以下のようになります。

```html
---
title: Lumeコンポーネント入門
url: /components/nunjucks/
layout: layouts/blog.njk
---

{{ comp.alertbox({ type: 'info', message: 'Nunjucksのコンポーネントです'}) | safe }}
```

`comp`変数を使っているところがポイントです。このオブジェクト内に、`_components`配下に作成したコンポーネントが格納されています。
Nunjucksテンプレートでは、この`comp`変数に直接アクセスできます。各コンポーネントは引数として可変パラメータをオブジェクト形式で指定できるようになっています。

このテンプレートでページを生成すると、以下のようなHTMLとなります（抜粋）。

```html
<main>
  <article>
    <h2>Lumeコンポーネント入門</h2>
    <div class="alert alert-info">
      Nunjucksのコンポーネントです
    </div>
  </article>
</main>
```

アラートボックスコンポーネントがページ内に展開されている様子が分かります。

:::column:JSX/MDXテンプレートからNunjucksで作成したコンポーネントを使う
JSX/MDXテンプレートでもNunjucksで作成したコンポーネントを使うことはできますが、Nunjucksで作成したコンポーネントは文字列としてレンダリングするためエスケープされてしまいます。
HTMLとしてレンダリングするには`dangerouslySetInnerHTML`を使う必要があります。

```tsx
export default ({comp}: Lume.Data) => (
  <div dangerouslySetInnerHTML={{
    __html: comp.alertbox({type: "info", message: "Nunjucksのコンポーネントです"})
  }} />
)
```

とても残念な感じですね。テンプレートとしてJSX/MDXを使うのであれば、特別な理由がない限りコンポーネントはJSXとして作成するのが良さそうです。
:::

## JSXでコンポーネントを作成する

先ほどはビルトインテンプレートのNunjucksでコンポーネントを作成する方法を見てきました。
次はJSXで作成してみましょう。

先ほどと同じアラートボックスをJSX(TSX)で書き換えてみます。

```tsx
interface Props extends Lume.Data {
  type: 'info' | 'warning' | 'error';
  message: string;
}

export default ({ type, message }: Props) => (
  <div className={`alert alert-${type}`}>
    { message }
  </div>
)
```

説明の必要もないシンプルなJSXコンポーネントです[^2]。

[^2]: ここではPropsとしてLumeのLume.Dataを拡張していますが、Lume固有のデータ(serachやpaginate等)も使用していないため必須ではありません。

注意点としては、useStateやイベントハンドラ等のリアクティブな実装は機能しません。
Lumeはクライアントサイドの振る舞いには関知しません。あくまでのページ生成時のレンダリングで使われるだけです。

:::info
現時点ではJSX/MDXはビルトインのプラグインではありません。テンプレートとして使用する場合は別途有効化する必要があります。
詳細は以下を参考にしてください。

- [Lume入門(第2回) - テンプレートエンジンとしてJSXとMDXを使う](/lume/lume-jsx-mdx/)
:::

このコンポーネントを各テンプレートから使うと以下のようになります。

- Nunjucksテンプレート
```html
---
title: Lumeコンポーネント入門
url: /components/jsx/
layout: layouts/blog.njk
---

{{ comp.AlertBox({ type: 'info', message: 'JSXのコンポーネントです'}) | safe }}
```

- JSX(TSX)テンプレート
```tsx
export const title = "Lumeコンポーネント入門";
export const url = "/components/jsx/";
export const layout = "layouts/blog.njk";

export default ({ comp }: Lume.Data) => (
  <comp.AlertBox type="info" message="JSXのコンポーネントです" />
)
```

- MDXテンプレート

```markdown
---
title: Lumeコンポーネント入門
url: /components/jsx/
layout: layouts/blog.njk
---

<comp.AlertBox type="info" message="JSXのコンポーネントです" />
```

Nunjucksコンポーネントと同様に`comp`変数から各コンポーネントにアクセスしています。
特にJSX/MDXについては、カスタムタグがそのままテンプレートで利用できます（パラメータはPropsになります）。React経験者にとってはより直感的になりましたね。

## コンポーネント用のCSSを出力する

最後にLumeのコンポーネント機能が提供する少し面白い機能を紹介します。
Lumeではコンポーネント自体に加えて、コンポーネント用のCSSやJavaScriptリソースを別ファイルに出力できます。

ここでは、今回作成したJSXのアラートボックスに対してCSSを適用してみます[^3]。
コンポーネントは以下のようになります。

```tsx
// コンポーネント向けのCSSを出力
export const css = `
  .alert {
    padding: 10px;
    margin-bottom: 10px;
    border: 1px solid transparent;
    border-radius: 4px;
  }
  .alert-info {
    color: #31708f;
    background-color: #d9edf7;
    border-color: #bce8f1;
  }
  .alert-warning {
    color: #8a6d3b;
    background-color: #fcf8e3;
    border-color: #faebcc;
  }
  .alert-error {
    color: #a94442;
    background-color: #f2dede;
    border-color: #ebccd1;
  }
`

interface Props extends Lume.Data{
  type: 'info' | 'warning' | 'error';
  message: string;
}

export default ({ type, message }: Props) => (
  <div className={`alert alert-${type}`}>
    { message }
  </div>
)
```

`css`変数をexportしているところがポイントです。他のコードは変更ありません。
この変数をexportすると、Lumeはビルド時に`/components.css`へその内容を出力します。

ちなみに、JavaScriptの場合は、`js`変数にJavaScriptを記述すると`/components.js`に出力されます。

あとはレイアウトファイルでこのCSSをリンクしておきます。

```html
<head>
  <link rel="stylesheet" href="/components.css" />
</head>
```

このようにしておくと、このアラートボックスコンポーネントは以下のように表示されます。

![](https://i.gyazo.com/18c9729858874c9e6453a42e78a4b22f.png)

コンポーネントに対してスタイルが適用されている様子が分かります。
このCSSは対象コンポーネントが利用されている場合のみ出力される点がポイントです。未使用の場合はCSSに含まれませんのでサイズの節約になります。

ただし、出力されるファイルはCSS/JavaScript各1ファイルですので、内容に重複がある場合はいずれかの指定で上書きされてしまいます。
多数のコンポーネントで利用する場合はコンポーネントプレフィックスをつける等工夫した方が良さそうです。

[^3]: Nunjucksのコンポーネントでも、コンポーネントのフロントマターにcssやjsを指定すれば同様のことができます。

## まとめ

今回はLumeが提供するコンポーネント機能を紹介しました。
静的サイトでもUIのコンポーネント化がうまくいくと、後々の運用が楽になってきますので是非活用していきたいところです。