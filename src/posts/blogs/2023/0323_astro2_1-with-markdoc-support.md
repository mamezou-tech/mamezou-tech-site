---
title: Astro 2.1 で実験的サポートされた Markdoc Integration を触ってみる
author: masahiro-kondo
date: 2023-03-23
tags: [Astro, SSG]
---

人気の静的サイトジェネレーター Astro 2.1がリリースされました。

[Astro 2.1 | Astro](https://astro.build/blog/astro-210/)

2.1では Markdoc の実験的サポートが入りました。Markdoc は Stripe 社によって開発された Markdown ベースのコンテンツフレームワークです。

[A powerful, flexible, Markdown-based authoring framework](https://markdoc.dev/)

Astro では Markdown に JSX を埋め込み可能な MDX が従来からサポートされていました。Markdoc サポートのモチベーションとしては、ビルド時間の削減があるようです。Astro 2.1 リリースのブログによると、MDX が大量に処理される場合に顕著な速度低下が見られる問題があるそうです。

:::info
Markdoc サポートの PR に Markdown / MDX / Markdoc のレンダリングを比較したベンチマークが掲載されており、これによると、Astro components や React components を含む場合 MDX と比較して Markdoc のビルド速度は最大3倍のパフォーマンスを示したようです。また同ベンチマークによるとプレーンなコンテンツのレンダリングでも Markdoc のパフォーマンスが優っています。

[Markdoc support by bholmesdev · Pull Request #508 · withastro/roadmap](https://github.com/withastro/roadmap/pull/508#issuecomment-1458762554)
:::

## Markdoc の特徴
MDX が JSX を Markdown に直接埋め込むのに対し、Markdoc は独自のタグとノード定義で Markdown を拡張します。Markdown 自体ではドキュメントサイトのような複雑で高度に構造化されたコンテンツを記述するのに十分ではないという考えから、カスタムタグを Markdown に埋め込めるシステムになっています。

Markdoc のパーサーには markdown-it が使用され、レンダリングには HTML レンダラーや React コンポーネントをレンダリングする React レンダラーなどの専用のレンダリングシステムが使われています。

[What is Markdoc?](https://markdoc.dev/docs/overview)

独自のタグ、属性、変数、関数を追加でき、Markdown の要素を Node として独自に拡張できたりします。

[The Markdoc syntax](https://markdoc.dev/docs/syntax)

## Astro 2.1 へのアップデートと Markdoc Integration の追加
以前の記事、「[Astro 2.0 + MDX + Recharts で Markdown ページにインタラクティブなチャートを描画する](/blogs/2023/01/29/astro-2.0-mdx/)」で MDX を使うプロジェクトを Blog テンプレートで作成していましたので、まずはこのプロジェクトを Astro 2.1 にアップデートしました。

プロジェクトのリポジトリは以下にあります。

[GitHub - kondoumh/astro-blog-example](https://github.com/kondoumh/astro-blog-example)

プロジェクトに Markdoc Integration を追加します。

```shell
cd astro-blog-example
npx astro add markdoc
```

![Add markdoc integration](https://i.gyazo.com/32181c16d870a0f1cb2b9e70949fe055.png)

必要なパッケージがインストールされ、astro.config.mjs の `integrations` に `markdoc()` が追加されました。

- astro.config.mjs
```javascript
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

import markdoc from "@astrojs/markdoc";

// https://astro.build/config
export default defineConfig({
  site: 'https://example.com',
  integrations: [mdx(), sitemap(), react(), markdoc()]
});
```

:::info
Markdoc インテグレーションについての公式ドキュメントは以下を参照してください。

[@astrojs/markdoc](https://docs.astro.build/en/guides/integrations-guide/markdoc/)
:::

拡張子 `.mdoc` のファイルを 以下のような内容で作成し、src/content/blog に配置しました。Markdown の table と Markdoc 組み込みの table タグで同じ内容の表を書いています。

- src/content/blog/using-markdoc.mdoc

{% raw %}
```markdown
---
title: "Using Markdoc"
description: "Markdoc usage page"
pubDate: "Mar 20 2023"
---

## Why Markdoc?

### Markdown table

| Italics   | Bold     | Code   |
| --------- | -------- | ------ |
| _italics_ | **bold** | `code` |

### Markdoc table

{% table %}
- Italics
- Bold
- Code
---
- _italics_
- **bold**
- `code`
{% /table %}
```
{% endraw %}

Markdoc のカスタムタグは、テキストエディタ上はテーブルに見えませんが、横に長くなりがちなテーブルを箇条書き形式で書けるようになっています。レンダリングすると、以下のように Markdown 版と同じ見え方になりました。

![render markdoc](https://i.gyazo.com/a3f449325c6b99584926fea10b38dc87.png)

## カスタムタグを適用してみる
次にカスタムのタグを追加してみます。Markdoc を使った Astro の Blog テーマに astro-ink があります。

[GitHub - one-aalam/astro-ink: Crisp, minimal, personal blog theme for Astro](https://github.com/one-aalam/astro-ink)

このテーマを参考に記事本文に埋め込む注意書きなどに使用する Callout タグを取り込んでみました。

src/components/mdoc 配下に Callout コンポーネントを配置しました。CalloutType (check、error、note、warning) に応じて、Callout のアイコンやタイトルの色を変えるようにしています。

- src/components/mdoc/Callout.astro

```javascript
---
import { Icon } from 'astro-icon'
export type CalloutType = 'check' | 'error' | 'note' | 'warning'
interface Props {
    title: string
    type: CalloutType
}

const ICON_MAP: Record<CalloutType, string> = {
    'check': 'check-circle',
    'error': 'close-circle',
    'note': 'note',
    'warning': 'warning-circle'
}

const COLOR_MAP: Record<CalloutType, string> = {
    'check': 'text-green-700',
    'error': 'text-red-700',
    'note': ' text-gray-700',
    'warning': 'text-orange-400'
}

const { title, type = 'note' } = Astro.props
---
<div class="callout flex gap-2 w-full bg-gray-50 my-1 px-5 py-2 rounded-sm shadow-sm">
    <Icon class={`w-8 h-8 inline-block ${COLOR_MAP[type]}`} pack="mdi" name={ICON_MAP[type]} />
    <div class="copy flex flex-col">
        <h3 class={`title m-0 ${COLOR_MAP[type]}`}>{title}</h3>
        <slot/>
    </div>
</div>
```
{% raw %}
Blog のテンプレートである `[...slug]`.astro を Callout タグを使用できるように修正しました。上記の Callout.astro を import して、`<Content components={{ Callout }}/>` のように指定しています。これにより Markdoc 形式のファイルで `{% callout .. %}` のようにタグを使用することができます。
{% endraw %}

- src/pages/blog/`[...slug]`.astro

```javascript
---
import { CollectionEntry, getCollection } from 'astro:content';
import BlogPost from '../../layouts/BlogPost.astro';
import Callout from '../../components/mdoc/Callout.astro';

export async function getStaticPaths() {
	const posts = await getCollection('blog');
	return posts.map((post) => ({
		params: { slug: post.slug },
		props: post,
	}));
}
type Props = CollectionEntry<'blog'>;

const post = Astro.props;
const { Content } = await post.render();
---

<BlogPost {...post.data}>
	<h1>{post.data.title}</h1>
	<Content components={{ Callout }}/>
</BlogPost>
```

astro.config.mjs では、カスタムタグ定義を追加します。オリジナルの Callout.astro で Tailwind によるスタイリングを使っていたので、Tailwind Integration も使うようにしました。

- astro.config.mjs
```javascript
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import markdoc from "@astrojs/markdoc";

import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  site: 'https://example.com',
  integrations: [mdx(), sitemap(), react(),
    tailwind({
      config: { applyBaseStyles: false },
    }),
    markdoc({
      tags: {
        callout: {
          render: "Callout",
          attributes: {
            type: {
              type: String
            },
            title: {
              type: String
            }
          }
        }
      }
    }
  ),]
});
```

Markdocファイル(.mdoc ファイルで)で Callout タグを使用します。

{% raw %}
```markdown
## Custom Tag (callout)
{% callout type="check" title="Check" %}
    This is a check callout.
{% /callout %}

{% callout type="error" title="Error" %}
    This is a error callout.
{% /callout %}

{% callout type="note" title="Note" %}
    this is a note callout.
{% /callout %}

{% callout type="warning" title="Warning" %}
    this is a woaning callout.
{% /callout %}
```
{% endraw %}

Callout のタイプに応じたレンダリングが実行されました。

![Render callout tag](https://i.gyazo.com/af9dec30f098c0cefefa95705384f23f.png)

## 最後に
以上、Astro 2.1 の Markdoc Integration を試してみました。現在は実験的サポートということですので、今後の動向に注目したいと思います。
MDX のサポートは継続されますが、将来的に Markdoc へのマイグレーションがガイドされるのかもしれません。

Markdoc そのものに関しては、開発者向けという感じは否めません(Markup じゃなく Markdown なのに)。一方でドキュメントをコンポーネントに分割して高度に構造化したいユースケースでは有効なソリューションになりそうです(まさにそれが Markdoc が解決したい問題だと思いますが)。

Markdoc はすでに React や Next で利用できます。今後 Astro で本格サポートされたらさらに普及していくのかもしれません。
