---
title: コンテンツ重視の静的サイトジェネレーター Astro でドキュメントサイトを構築する
author: masahiro-kondo
date: 2022-09-07
tags: SSG
---

Astro は SSG (Static Site Generator) の1つです。「高速でコンテンツにフォーカスした Web サイトを構築するためのオールインワン Web フレームワーク」というのがキャッチコピーです。

[Astro | Build faster websites](https://astro.build/)

v1.0 がリリースされました。

[Astro 1.0 | Astro](https://astro.build/blog/astro-1/)

ブログやポートフォリオサイトの他、ドキュメンテーションサイトのテンプレートも提供されています。公式ドキュメントには日本語版もあります。この記事では Astro の概要を見るとともに、実際にサイトを構築してみて使用感をお伝えできたらと思います。

[[TOC]]

## Astro 概要
ドキュメントの [Getting Started](https://docs.astro.build/ja/getting-started/) から Key Features を引用します。

> - コンポーネントアイランド： 高速なウェブサイトを構築するための新しいウェブアーキテクチャー。
> - サーバーファーストのAPI設計： ユーザーのデバイスから高コストのハイドレーションをなくします。
> - デフォルトでゼロJS： サイトを遅くするJavaScriptランタイムオーバーヘッドはありません。
> - エッジ対応： DenoやCloudflareのようなグローバルなエッジを含め、どこでもデプロイできます。
> - カスタマイズ可能： Tailwind、MDX、その他100以上のインテグレーションから選択可能です。
> - 特定のUIに依存しない： React、Preact、Svelte、Vue、Solid、Litなどをサポートします。

Astro の設計思想と適用領域については、コアコンセプトの[Astroを選ぶ理由](https://docs.astro.build/ja/concepts/why-astro/) に詳しく記載されています。

- コンテンツ重視
  - 近年のフロントエンドのフレームワークが Figma のような操作性重視の Web アプリケーションにフォーカスしているのに対し、Astro はコンテンツが豊富なサイト向けに設計されている
- サーバーファースト
  - サーバーサイドレンダリングを最大限活用する。Next.js や Nuxt の SSR がパフォーマンス懸念への対処として限定的に使用されるのと対照的
- デフォルトで高速
  - ロードが遅くなる原因となる JavaScript をクライアントで起動しない(アイランドを除く)
- 簡単に使える
  - React、Svelte、Vue などの UI コンポーネント言語が使え、独自の Astro UI 言語も用意されている
- 充実した機能と柔軟性
  - オールインワンであり、多くのインテグレーションにより拡張可能

:::info
最後のインテグレーションの部分ですが、Astro の Integrations のページにカタログがあります。

[Integrations | Astro](https://astro.build/integrations/)

Netlify CMS との接続も可能となっており、コンテンツ重視のサイトで Markdown に慣れていないユーザーに使ってもらうようにすることも可能です。Netlify CMS については以下の記事で紹介しています。

[Netlify CMSのワークフローでコンテンツ管理をする](/blogs/2022/08/03/netlifycms-workflow-intro/)
:::

コアコンセプトの [MPAs vs. SPAs](https://docs.astro.build/ja/concepts/mpa-vs-spa/) に Astro が採用した MPA (マルチページアプリケーション)と SPA(シングルページアプリケーション)の対比が記述されています。

サーバーレンダリングとクライアントレンダリング、サーバールーティングとクライアントルーティング、サーバー状態管理とクライアント状態管理、これらはトレードオフの関係にあり、どちらがより良い、悪いというものではなく、Astro はコンテンツに特化した Web サイトという使用目的に合致している MPA を選択したと結論づけられています。

また、Astro はサーバー言語として Ruby や PHP などの専用言語を使うことなく、JavaScript、HTML、CSS が使える点で、Next.js などモダンな Web フレームワークと同様の開発体験で MPA サイトアーキテクチャを構築できるとしています。

コアコンセプトの[Astroアイランド](https://docs.astro.build/ja/concepts/islands/)では、インタラクティブな UI について記載されています。ドキュメントの図を転載します。

![アイランドアーキテクチャ](https://i.gyazo.com/9c3aa97ed4d5ac3cee2210b05dc06f1f.png)

> 「Astroアイランド」とは、HTMLの静的なページ上にあるインタラクティブなUIコンポーネントを指します。1つのページに複数のアイランドが存在でき、アイランドは常に孤立して表示されます。静的で非インタラクティブなHTMLの海に浮かぶ島（アイランド）とお考えください。

インタラクティブな UI を作成するため、開発者はブラウザで実行される必要のあるコンポーネントを Client Directives により 指定します。これにより必要なものだけがハイドレーション[^1]されます。個々のアイランドは独立して並列にロードされ、重いものは遅延ロードされます。

[^1]: クライアントサイドで DOM の変更を行うクライアントサイドのプロセス

:::info
アイランドアーキテクチャーは[以前紹介した](/blogs/2022/07/04/fresh-deno-next-gen-web-framework/) Deno の Fresh も採用しています。
:::

## プロジェクト生成

プロジェクトを作成するには、以下のコマンドを実行します。

```shell
npm create astro@latest
```

テンプレートとしてドキュメンテーションサイトを選択しました。

```
Welcome to Astro! (create-astro v1.0.1)
Lets walk through setting up your new Astro project.

✔ Where would you like to create your new project? … ./astro-doc-site-example
✔ Which template would you like to use? › Documentation Site
✔ Template copied!
✔ Would you like to install npm dependencies? (recommended) … yes
✔ Packages installed!
✔ Would you like to initialize a new git repository? (optional) … yes
✔ Git repository created!
✔ How would you like to setup TypeScript? › Relaxed
✔ TypeScript settings applied!
✔ Setup complete.
✔ Ready for liftoff!

 Next steps 

You can now cd into the astro-doc-site-example project directory.
Run npm run dev to start the Astro dev server. CTRL-C to close.
Add frameworks like react and tailwind to your project using astro add

Stuck? Come join us at https://astro.build/chat
Good luck out there, astronaut.
```

VS Code でプロジェクトを開くと Astro 拡張のインストールをサジェストされますのでインストールしましょう。

ローカルの開発サーバーは以下のスクリプトで起動し、ホットリロードが有効になります。

```shell
npm run dev
```

:::info
ローカルに環境を構築しなくても、Web IDE で簡単に試せるようになっています。

[astro.new](https://astro.new/)というサイトから、テンプレートを選んで、StackBlitz、CodeSandbox、Gitpod などの Web IDE からプロジェクトを開いて試すことできます。下のスクリーンショットは、StackBlitz でプロジェクトを開いたところです。開発サーバーが起動して、プレビューで開発中の画面も確認できます。

![StackBlitzでDocプロジェクトを開く](https://i.gyazo.com/41e2f6f23f5e49952e9609f2b220098d.png)
:::

## プロジェクト構成

ドキュメンテーションサイトの画面構成は、ヘッダー、サイドバー、コンテンツからなり、ヘッダーに検索ボックスがついた、OSS のドキュメントサイトなどによくある構成となっています。ダークモード、ライトモード切り替えのスイッチまで搭載されています。

![画面構成](https://i.gyazo.com/b86ef23a602ce9e98a87ef212e102210.png)

ディレクトリ構成は以下のようになっています。`src/components` に画面構成に対応するコンポーネント、`src/layouts` に各コンポーネントを配置する専用のレイアウトコンポーネント、そしてメインのコンテンツは `src/pages` に格納されます。

```
├── src
│   ├── components
│   │   ├── Footer
│   │   │   ├── AvatarList.astro
│   │   │   └── Footer.astro
│   │   ├── HeadCommon.astro
│   │   ├── HeadSEO.astro
│   │   ├── Header
│   │   │   ├── AstroLogo.astro
│   │   │   ├── Header.astro
│   │   │   ├── LanguageSelect.css
│   │   │   ├── LanguageSelect.tsx
│   │   │   ├── Search.css
│   │   │   ├── Search.tsx
│   │   │   ├── SidebarToggle.tsx
│   │   │   └── SkipToContent.astro
│   │   ├── LeftSidebar
│   │   │   └── LeftSidebar.astro
│   │   ├── PageContent
│   │   │   └── PageContent.astro
│   │   └── RightSidebar
│   │       ├── MoreMenu.astro
│   │       ├── RightSidebar.astro
│   │       ├── TableOfContents.tsx
│   │       ├── ThemeToggleButton.css
│   │       └── ThemeToggleButton.tsx
│   ├── config.ts
│   ├── env.d.ts
│   ├── languages.ts
│   ├── layouts
│   │   └── MainLayout.astro
│   ├── pages
│   │   ├── en
│   │   │   ├── introduction.md
│   │   │   ├── page-2.md
│   │   │   ├── page-3.md
│   │   │   └── page-4.md
│   │   └── index.astro
│   └── styles
│       ├── index.css
│       └── theme.css
├── public
│   ├── default-og-image.png
│   ├── favicon.svg
│   └── make-scrollable-code-focusable.js
├── astro.config.mjs
└── package.json
```

:::info
生成されたプロジェクトではコンポーネントの実装に Astro UI 言語が使われていますが、React や Vue などで作ることもできます。Astro のリポジトリの [examples](https://github.com/withastro/astro/tree/main/examples) ディレクトリの flamework-* のプロジェクトが格納されているのに加え、コミュニティによるテーマやスターターキットも多く開発されています。

[GitHub - one-aalam/awesome-astro: Curated resources on building sites with Astro, a brand new way to build static and server rendered sites, with cross-framework components, styling and reactive store support.](https://github.com/one-aalam/awesome-astro)
:::

`src/pages` に配置するコンテンツは Markdonn 形式で、ヘッダーにタイトルやレイアウトファイルを指定します。

```markdown
---
title: Introduction
description: Docs intro
layout: ../../layouts/MainLayout.astro
---

**Welcome to Astro!**

This is the `docs` starter template. It contains all of the features that you need to build a Markdown-powered documentation site, including:
```

多言語対応も可能で、README に手順が書いてあります。`src/config.ts` に以下のように日本語の言語設定と対応するレイアウト情報を追加し,`src/pages/ja` 配下に専用のファイルを配置しました。

```diff
export const KNOWN_LANGUAGES = {
	English: 'en',
+	日本語: 'ja',
} as const;

export const SIDEBAR: Sidebar = {
	en: {
		'Section Header': [
			{ text: 'Introduction', link: 'en/introduction' },
			{ text: 'Page 2', link: 'en/page-2' },
			{ text: 'Page 3', link: 'en/page-3' },
		],
		'Another Section': [{ text: 'Page 4', link: 'en/page-4' }],
	},
+	ja: {
+		'セクションヘッダー': [
+			{ text: 'イントロダクション', link: 'ja/introduction' },
+			{ text: 'ページ2', link: 'ja/page-2' },
+			{ text: 'ページ3', link: 'ja/page-3' },
+		],
+		'他のセクション': [{ text: 'ページ4', link: 'ja/page-4' }],
+	},
};
```

これで、UI に言語切り替えスイッチが出現して、URL を `en` から `ja` に切り替えると日本語コンテンツが表示されます。

![日本語コンテンツの追加](https://i.gyazo.com/5f9490e3d8eae19b1c8b76585d801345.png)

:::info
多言語対応、いい感じなのですが、テンプレートから生成される言語切り替えのセレクトボックスは残念ながらちゃんと動作しませんでした。issue を起票しておこうと思います。Astro 本家のドキュメントサイトの実装を見たら、テンプレートとはかなり違ってました。
:::

この言語切り替えの UI や検索ボックスなどは、client ディレクティブが付与されており、ハイドレートされたアイランドとして動作します。

## デプロイしてみる

ドキュメントの「[デプロイ](https://docs.astro.build/ja/guides/deploy/)」には、静的にデプロイする手順が書かれています。GitHub Pages、Netlify、Google Clund Run、Firebase、Vercel、Cloudeflare Pages などのターゲットにデプロイする手順が書かれています。

Netlify にデプロイしてみました。

プロジェクトルートに以下の内容で netlify.toml ファイルを追加します。

```toml
[build]
  command = "npm run build"
  publish = "dist"
```

プロジェクトを GitHub のリポジトリとしてプッシュし、Netlify の Web UI でデプロイを実行します。Netlify 側で Astro の設定を自動検出するため、リポジトリを接続する以外に UI で設定することは特にありません。

デプロイされたサイトです。

[https://kondoumh-astro-doc-site-example.netlify.app/](https://kondoumh-astro-doc-site-example.netlify.app/)

GitHub のリポジトリは以下にあります。

[GitHub - kondoumh/astro-doc-site-example](https://github.com/kondoumh/astro-doc-site-example)

:::info
この記事では、SSG としての利用しかしておらず、Astro の SSR の機能は未使用です。SSR を有効にするには、各サービスのアダプターを使用する必要があります。Cloudflare、Deno、Netlify、Vercel の各エッジサービスと Node.js 用のアダプターが提供されています。

[Server-side Rendering](https://docs.astro.build/ja/guides/server-side-rendering/)

SSR を有効化すると、リクエストヘッダー、リダイレクト、レスポンス、API Routes などの機能を使用でき、ログイン処理やサーバーサイドでのコード実行が可能となります。
:::

## まとめ
Astro は、コンテンツ重視の MPA アーキテクチャによる次世代 SSG でした。技術面もさることながら、ドキュメントにコンセプトが熱く語られているところ、簡単に使えることに注力しており Web IDE で即座に試せるところなどユーザー獲得の施策にも力が入っています。豊富なテンプレートも用意されていて、さまざまな用途のサイトを構築できるパワーを感じます。
