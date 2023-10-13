---
title: Lume入門(第2回) - テンプレートエンジンとしてJSXとMDXを使う
author: noboru-kudo
date: 2023-10-13
prevPage: ./src/posts/lume/lume-intro.md
---

[前回](/lume/lume-intro)はLumeの基本的な使い方を見てきました。

ここではテンプレート言語として、ビルトインで使えるマークダウンとMozillaのNunjucksを使いました。
ただ、マークダウンとは違い、Nunjucksはあまり世の中に浸透しているとは言えず(たいしたことはないですが)学習コストも発生します。
最近はReactエコシステム普及に伴ってJSXが広く使われています。また、マークダウンでJSXを使えるように拡張した[MDX](https://mdxjs.com/)を使いたいと考える人も多いのではないでしょうか。

Lumeは複数テンプレートエンジンをサポートしています。もちろんJSX/MDXもプラグインでサポートしています。プラグインといってもサードパーティ製ではなくLume本体で管理されています(そのうちビルトインプラグインになるかもしれませんが)。
今回は前回のブログサイトをJSX/MDXを使って書き直してみたいと思います。

## JSXプラグインを有効にする

以下のプラグインをセットアップします。

- [Lume Plugins - JSX](https://lume.land/plugins/jsx/)

他のプラグイン同様にJSXプラグイン導入も簡単です。`_config.ts`に以下を追加します(変更部分のみ掲載)。

```typescript
import jsx from "lume/plugins/jsx.ts";

const site = lume();
site.use(jsx())
```

必要に応じて`deno.json`のTypeScriptコンパイラ設定(`compilerOptions`)すれば完了です(今回は特に設定していません)。

## レイアウトファイルをJSXで書き換える

前回ブログページのレイアウトファイルとしてNunjucksを使っていたものをそのままJSX(TSX)に変換します。
blog.tsxとして以下のJSXを配置しました。

```tsx
export default ({ title, children }: React.PropsWithChildren<{ title: string}>) => (
  <html lang="ja">
  <head>
    <meta charSet="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
    <link rel="stylesheet" href="/css/style.css" />
    <link href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism.min.css" rel="stylesheet" />
  </head>
  <body>
  <header>
    <h1>サンプルブログサイト</h1>
  </header>

  <main>
    <article>
      <h2>{title}</h2>
      {children}
    </article>
  </main>

  <footer>
    <p>&copy; 2023 豆香ブログ</p>
  </footer>
  </body>
  </html>
)
```

propsとしてマークダウンのフロントマター情報(`title`)とコンテンツ(`children`)を受け取っています。
コンテンツはNunjucksのときは`content`変数を使用していましたが、JSXなのでここは`children`変数として受け取ります。

当たり前ですが、Lumeは静的サイトジェネレーターでクライアント側のJavaScript実行には関与しません。
ここでuseStateやイベントハンドラなどリアクティブなコードを記述しても動作しません。サーバーコンポーネントとして考える必要があります。

これを使うマークダウンファイル(ブログページ)はフロントマターの`layout`変数の値をJSX(TSX)を指定するように拡張子を変更します。

```markdown
---
title: Lumeで始めるブログサイト運営
url: /blogs/lume/
# 以下blog.njkから変更
layout: layouts/blog.tsx
---
```

これだけです。JSXの変換処理などは一切不要です。
これでサーバーを動かすと(`deno task serve`)、前回と同じ結果が得られます。

今回はレイアウトファイルとしてJSXを使いましたが、もちろんUIコンポーネントやページ自体でも利用できます。

## MDXプラグインを有効にする

次にMDXを試してみましょう。[MDX](https://mdxjs.com/)はマークダウンでJSXが使えるよう拡張したものです。
こちらもJSX同様に`_config.ts`に追加するだです。

```typescript
import jsx from "lume/plugins/jsx.ts";
import mdx from "lume/plugins/mdx.ts";

const site = lume();

site.use(jsx()); // MDXを使う場合は必須
site.use(mdx()); // MDXプラグイン
```

依存するJSXプラグインに加えてMDXプラグインを追加しています。

## MDXでページを作成する

ここではJSXでコンポーネントを作成し、MDXのページからそれを利用します。
`_components`ディレクトリを作成し、以下のCardコンポーネント(Card.tsx)を配置します。

```tsx
const styles = {
  card: {
    border: '1px solid #ddd',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    marginBottom: '20px'
  },
  title: {
    fontSize: '1em',
    marginBottom: '10px'
  },
  description: {
    marginBottom: '10px'
  }
};
export default ({ title, children }: React.PropsWithChildren<{
  title: string
}>) => {
  return (
    <div style={styles.card}>
      {title && <div style={styles.title}>{title}</div>}
      {children}
    </div>
  );
};
```

カード部品(Card)としてレンダリングするUI部品です。

ここに配置した`_components`ディレクトリはLumeにとって特別なものです。ここに配置したコンポーネントはグローバルにどこからでも使えるようになります。

:::info
JSXに限らず、他のテンプレート言語で記述された部品もこのディレクトリに配置することでグローバルに利用可能です。
詳細は公式ドキュメントを参照してください。

- [Lume Doc - Components](https://lume.land/docs/core/components/)
:::

それでは、このUI部品をMDXで使ってみます。
プロジェクトルートに以下のMDXを配置します(index.mdx)。

```markdown
---
title: LumeでJSX/MDXを使う
url: /blogs/lume-mdx/
layout: layouts/blog.tsx
---

Lumeで使えるテンプレートエンジンは多数あり、JSX/MDXもサポートしています。

JSX/MDXは公式プラグインとして提供されており、簡単に導入できます。

<comp.Card title="MDXとは？">
  MDXとはマークダウンをJSXを使えるように拡張したものです。

  詳細は以下公式ドキュメントを参照してください。
  - [Markdown for the component era](https://mdxjs.com/)
</comp.Card>
```

マークダウン内で`<comp.Card ...>...</comp.Card>`が先程作成したJSXコンポーネントです。
プレフィックスでついている`comp`は、グローバルコンポーネントが格納されているオブジェクトです。
このようにグローバルコンポーネントはimportなしで使えます[^1]。

[^1]: コンポーネントを`_components`以外に配置した場合は、マークダウン内でimport分を記述すれば使えます。

ここでは、titleに加えてchildrenとして渡す内容をタグ内に記述して、Cardコンポーネントをレンダリングしています。
この辺りの記述はReactを使った経験がある方にはお馴染みのものかと思います。

これを実行すると以下のようページになります。

![MDX](https://i.gyazo.com/e839bde1e894aac24afeb9b1242252ce.png)

最後に、今回の記事での変更点を以下にまとめます。
```markdown
.
├── _components
│   └── Card.tsx <- グローバルで利用可能なCardコンポーネント
├── _includes
│   └── layouts
│       ├── blog.njk <- 前回作成したNunjucksテンプレート
│       └── blog.tsx <- 新規に作成したJSXテンプレート(内容はNunjucks版と同じ)
├── css
│   └── style.scss
├── _config.ts <- JSX/MDXプラグイン導入
├── deno.json
├── deno.lock
├── index.md <- 利用テンプレートをJSXに変更
└── index.mdx <- Cardコンポーネントを使用するMDX
```

## まとめ

今回はLumeでJSX/MDXをテンプレート言語として使用しました。
JSX/MDXに限らずLumeは多くのテンプレート言語サポートをプラグインとして提供しています。

- [Lume Plugins - Template Engine](https://lume.land/plugins/?status=all&template_engine=on)

もちろんここにない場合は自作できます。入門編ではありませんが、試してみるのもおもしろそうですね。

- [Lume Doc - Loaders and engines](https://lume.land/docs/core/loaders/)

また、ここでは触れていませんが、1つのファイルで複数のテンプレートエンジンを実行させることも可能です。
例えば、Eleventyのようにマークダウンに対して、Nunjucksとマークダウンパーサーの2つを実行するなんてこともできます。

- [Lume Doc - Multiple template engines](https://lume.land/docs/core/multiple-template-engines/)

次回はLumeのページ管理(Searchプラグイン)を見ていきたいと思います。