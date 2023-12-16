---
title: Lume入門(第3回) - ページをタグ管理して検索性を高める
author: noboru-kudo
date: 2023-10-25
prevPage: ./src/posts/lume/lume-jsx-mdx.md
nextPage: ./src/posts/lume/lume-components.md
---

[前回](/lume/lume-jsx-mdx/)はLumeのテンプレートエンジンとしてJSX/MDXプラグインを使用する方法を見てきました。

サイト運営が順調でページが増えてくると、目的のページを探すのが辛くなってきます。
こんなときは、ページにタグ(目印)を付けて検索性を高める手法がよく使われますね。

今回は、Lumeを使ってタグ付けされた記事の一覧ページを生成する方法をご紹介します。
また、一覧ページにリストアップする記事が多い場合に有効なページネーション機能も見ていきます。

これらは、LumeのSearchプラグインとPaginateプラグインを使うことで簡単に実装できます。

- [Lume Plugin - Search](https://lume.land/plugins/search/)
- [Lume Plugin - Paginate](https://lume.land/plugins/paginate/)

両プラグインともに、Lume本体にプレインストールされているため、すぐに使い始められます。

:::info
2023-12-08にLumeがv2にメジャーアップデートしました。これに伴い本記事もv2で動作するよう更新しました。

- [Lume Blog - Lume 2 is finally here!!](https://lume.land/blog/posts/lume-2/)
:::

## ページにタグをつける

まずはページ(記事)にタグを付けます。マークダウン(含むNunjucks/MDX)の場合はフロントマターに`tags`変数を追加し、配列形式でタグを複数指定します。

```markdown
---
title: Lumeで始めるブログサイト運営 - その1
layout: layouts/blog.njk
date: 2023-01-01
tags: ["Lume", "SSG", "Deno"]
---
```

上記はタグとして`Lume`、`SSG`、`Deno`と3つのタグをページに付けています。

また、一覧ページのソート条件で使用するために`date`も指定しています。この`date`変数はLumeでは特殊な変数でページ作成日として扱われます。
詳細は以下公式ドキュメントを参照してください。

- [Lume Doc - PageData - Standard variables - date](https://lume.land/docs/creating-pages/page-data/#date)

ここでは`blogs`ディレクトリ配下にこのマークダウンファイルを10ページ分作成します。

```
blogs
├── lume-1.md
├── lume-2.md
├── lume-3.md
├── lume-4.md
├── lume-5.md
├── lume-6.md
├── lume-7.md
├── lume-8.md
├── lume-9.md
└── lume-10.md
```

各ファイルの`date`変数(作成日)は、1日ずつずらした日付(2023-01-01 ~ 2023-01-10)としました。
これらは`/blogs/lume-{num}/`[^1]でアクセス可能なページとして生成されます。

[^1]: フロントマターとして`url`の指定をしていない場合は、デフォルトでパスがURLとなります。

:::column:JSXで作成したページにタグを付ける
JSXで作成したページにタグを付ける場合は、以下のように`tags`変数をexportします。

```jsx
export const title = "Lumeで始めるブログサイト運営 - その1";
export const layout = "layouts/blog.njk";
export const date = "2023-01-01";
export const tags = ["Lume", "SSG", "Deno"];

export default () => (<div>JSXでタグ付けする</div>);
```
:::

## 一覧ページを作成する

事前準備が終わりましたので、タグ付けされた記事の一覧ページを作成します。
ここでは`Lume`でタグ付けされたページを対象とします。

一覧ページの作成も通常ページの作成と基本的には変わりませんが、Lumeがビルトインで提供するSearchプラグインを使用します。

NunjucksバージョンとJSXバージョンで見てみます。

- Nunjucksテンプレート
```html
---
layout: layouts/blog.njk
url: /tags/lume/
title: Lumeのページ一覧
---

{%- for page in search.pages('Lume', 'date=desc') %}
<div>
  <a href="{{ page.url }}">{{ page.title }}</a>
</div>
{%- endfor %}
```
- JSX(TSX)テンプレート
```tsx
export const layout = "layouts/blog.njk";
export const url = "/tags/lume/";
export const title = "Lumeのページ一覧";

export default ({ search }: Lume.Data) => {
  return (
    <>
      {search.pages("Lume", "date=asc").map((page, index) => (
        <div key={index}>
          <a href={page.url}>{page.title}</a>
        </div>
      ))}
    </>
  );
};
```

Nunjucksの場合はグローバル変数、JSXの場合はPropsとしてsearchオブジェクトを受け取り、pagesメソッドから対象のページを取得しています。
pagesメソッドは第1引数に検索条件[^2]、第2引数にソート順、第3引数にリミット件数を指定します。つまり、ここでは`Lume`タグで作成日の降順という条件になります(リミットは指定なし)。

[^2]: 検索条件を指定しない場合は全てのページが返却されます。

第1引数の検索条件はタグだけでなく、フロントマター変数は何でも指定可能です（タグ以外の場合は変数の指定も別途必要）。もちろん複数条件や否定や前方一致等にも対応しています。
詳細は以下公式ドキュメントやソースコードを参照してください。

- [Lume Plugin - Search](https://lume.land/plugins/search/#searching-pages)
- [GitHub Lume - serach.ts](https://github.com/lumeland/lume/blob/master/plugins/search.ts)

どちらのテンプレートでも、生成されるページは以下のような見た目になります。

![search example](https://i.gyazo.com/ecc66ab2ba80fc1e13b98fd5966d8fd6.png)

Lumeタグがついているページが新しい順に一覧化できている様子が分かります。

## 全てのタグの一覧ページを生成する

先ほどは特定タグの一覧ページを作成しましたが、これだとタグが増える度に一覧ページを実装する必要があり効率的とは言えません。
事前に全タグを収集して、それぞれの一覧ページを生成する仕組みを作るのが理想的です。

このようなケースに対応して、Lumeでは[ジェネレーター関数](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/function*)を利用して1つのテンプレートで複数のページを生成できます。

- [Lume Doc - Create multiple pages](https://lume.land/docs/core/multiple-pages/)

ジェネレーター関数はJavaScriptのものです。テンプレートエンジンとしてもJavaScript(こちらもビルトインです)を使います。

先ほどの同等のHTMLを出力するテンプレートは、以下のようになります(ここではTypeScriptを使用してます)。

```typescript
export const layout = "layouts/blog.njk"; // 全ページ共通のフロントマター

export default function* ({ search }: Lume.Data) {
  const tags = search.values("tags"); // 全タグを収集
  for (const tag of tags) {
    const links = search.pages(tag as string, "date=desc").map((page) =>
      `<div><a href="${page.url}">${page.title}</a></div>`
    );
    yield {
      // ページ別のフロントマター
      title: `${tag}のページ一覧`,
      url: `/tags/${tag}/`,
      // ページコンテンツ
      content: links.join("")
    };
  }
}
```

先ほどより若干複雑ですが内容は自明です。
1. searchオブジェクトのtagsメソッドでタグを収集
2. それぞれについてpagesメソッドで対象ページを検索
3. ページコンテンツ(HTML)を生成
4. フロントマターとページコンテンツをyieldで返す

なお、JavaScriptをテンプレートとする場合は、それがページ生成用のテンプレートであることをLumeに示すため、ファイル名のサフィックスとして`<file-name>.page.(js|ts)`とする必要があります(デフォルト)。

先ほど`Lume`、`SSG`、`Deno`の3つのタグをページに指定していますので、これを実行すると以下3ページの一覧が生成されます(どのページも内容はほとんど同じです)。

- /tags/Lume
- /tags/SSG
- /tags/Deno

もちろん、この実装であればタグが増えても追加実装は不要です。

:::column:ロジックとビューを分離する
ここではHTMLレンダリング部分もJavaScriptテンプレート内に記述しました。
ロジックとビューで実装を分離したい場合は、HTML部分はNunjucks等のJavaScript以外で記述し、これをレイアウトとして指定する方法があります。
本ケースでは以下のようになります。

- Nunjucksテンプレート(post-list.njk)
```html
---
layout: "layouts/blog.njk"
---
{%- for page in results %}
<div>
  <a href="{{ page.url }}">{{ page.title }}</a>
</div>
{%- endfor %}
```

- JavaScriptテンプレート
```typescript
// 全ページ共通のフロントマター
export const layout = "layouts/post-list.njk"; // 一覧ページ用のレイアウト

export default function* ({ search }: Lume.Data) {
  const tags = search.values("tags"); // 全タグを収集
  for (const tag of tags) {
    yield {
      // ページ別のフロントマター
      title: `${tag}のページ一覧`,
      url: `/tags/${tag}/`,
      // 検索結果を一覧ページ用のレイアウトに連携
      results: search.pages(tag as string, "date=desc")
    };
  }
}
```
Nunjucksで作成したレイアウトファイルを、JavaScriptテンプレート側で`layout`変数に指定しています。
この例だとHTMLがシンプルすぎて効果を感じられませんが、複雑なテンプレートになる場合は分離した方がスッキリとします。
:::

:::column:JSXを使って1テンプレートで複数ページを生成する
JSXテンプレートもJavaScriptですので、同様のことが可能です。
以下はJSX(TSX)テンプレートを使った場合のジェネレータ関数部分の抜粋です。
```tsx
export default function* ({ search }: Lume.Data) {
  const tags = search.values("tags"); // 全タグを収集
  for (const tag of tags) {
    const links = search.pages(tag as string, "date=desc").map((page, index) =>
      <div key={index}><a href={page.url}>{page.title}</a></div>
    );
    yield {
      // ページ別のフロントマター
      title: `${tag}のページ一覧`,
      url: `/tags/${tag}/`,
      // ページコンテンツ
      content: links
    };
  }
}
```
実装としてもHTML部分がJSXに変わるだけなので、JSXプラグインを有効にしている場合はこちらを利用するのがお勧めです。
ビュー部品としてJSXのカスタムコンポーネントを使ったりするのも簡単です。
:::

## ページネーションを使って一覧ページを作成する

最後にページネーションを使ってみます。
タグ別に一覧ページを作ったとはいえ、汎用的なタグの場合は一覧に表示するページは大量になります。

そのようなケースではページネーションを使うことが多いかと思います。
このページネーションを手動で実装するのは結構面倒ですが、LumeにはPaginateプラグインがビルトインで提供されており、特別な設定なしで利用可能です。

先ほど10ページのサンプル記事を作成しています。ここでは1ページ3件としてページネーション付きの一覧ページを作成します。

```typescript
export const layout = "layouts/blog.njk";
export default function* ({ search, paginate }: Lume.Data) {
  const tags = search.values("tags"); // 全タグを収集
  for (const tag of tags) {
    // paginateプラグインを使ってページネーションを実行
    const paginateResults = paginate(search.pages(tag as string, "date=desc"), {
      // 1ページあたり3件
      size: 3,
      // 1ページは/tags/<tagname>/、2ページ目以降は/tags/<tagname>/<n>/
      url: (n: number) => `/tags/${tag}/${n > 1 ? `${n.toString()}/` : ""}`, 
    });
    for (const paginateResult of paginateResults) {
      const links = paginateResult.results.map((page) =>
        `<div><a href="${page.url}">${page.title}</a></div>`
      );
      yield {
        title: `${tag}のページ一覧`,
        url: paginateResult.url,
        // ページコンテンツ
        content: `
<div>${paginateResult.pagination.page} / ${paginateResult.pagination.totalPages}</div>
${links.join("")}
${paginateResult.pagination.previous ? `<a href="${paginateResult.pagination.previous}">前ページ</a>` : "前ページ"}
<span>|</span>
${paginateResult.pagination.next ? `<a href="${paginateResult.pagination.next}">次ページ</a>` : "次ページ"}`,
      };
    }
  }
}
```

ここでのポイントはpaginateを呼んでいる部分です。第1引数でSearchプラグインの結果、第2引数にページネーション設定(`size`/`url`)を渡します。
Paginateプラグインはこの条件に従って、Searchプラグインの検索結果を分割してくれます。
Paginateプラグインでは`results`に分割結果、`pagination`に現在ページや次/前ページURL等のページネーションに必要な情報を格納してくれます。

後はその結果に従ってページコンテンツを生成するだけです。とても簡単ですね。

上記は各タグ別に以下のページを生成します。

- 1ページ目: /tags/<タグ名>/
- 2ページ目: /tags/<タグ名>/2/
- 3ページ目: /tags/<タグ名>/3/
- 4ページ目: /tags/<タグ名>/4/

以下実際に生成される一覧ページの1つです。

![lume pagination plugin](https://i.gyazo.com/6221b18e58020646a814c4a0838e26a3.png)

## まとめ

今回はLumeでページのタグ管理を実践しました。
SearchプラグインとPaginateプラグインを使うことで、簡単かつ柔軟に実装できることが分かります。
これらのプラグインはタグ管理に限らず、アイデア次第で様々な用途で使用できるものです。
ある程度ページ数が多い場合は、このプラグインに使い慣れておくとサイト管理が楽になってくると思います。