---
title: Netlify CMSのワークフローでコンテンツ管理をする
author: noboru-kudo
date: 2022-08-03
tags: [netlify-cms, netlify, 11ty, SSG, CMS]
templateEngineOverride: md
---

当サイトも記事数が180を超え、執筆者も増えてきました。
現状はGitHubをNetlifyと連携させることで、プルリクエスト経由で記事公開をしてきました。
これでも問題はないのですが、そろそろCMS的な仕組みでGitに不慣れな人でも簡単に記事作成やサイト自体の設定変更ができないかなと思い始めました。

世の中的には、ヘッドレスCMSが流行っていると思います。
ヘッドレスCMSはWordPressのようにフロントエンド向けのUIを提供せずに、単純なコンテンツ管理機能のみを提供します。
もちろんフロントエンド側の開発は必要ですが、そのレイアウトは自由自在で好きなフレームワークが使えます。また、UI自体を置き換えるものでありませんので、段階的な移行も簡単です。

今回ヘッドレスCMSで簡単に導入できるものとして、ホスティングサービスで有名なNetlifyがOSSとして提供している[Netlify CMS](https://www.netlifycms.org/)を試してみたいと思います。

Netlify CMS自体は、Netlify本体と直接依存関係がある訳ではなく、CMSとして単独で利用できます(もちろんNetlifyの方が連携しやすいですが)。
また、Netlify CMS自体には、コンテンツを保管する永続化レイヤは存在せず、GitHubやGitLab等のGitベースのサービスをバックエンドとして利用します。

今回は、静的サイトジェネレータ(SSG)として[eleventy](https://11ty.dev)を使い、そのコンテンツをNetlify CMSで管理するようにしてみたいと思います。
題材はブログサイトです(本サイトとは直接関係ありません)。

なお、ここではeleventyを使用しましたが、もちろん他のSSGツールでも構いません。
メジャーなツールは公式ドキュメントでも説明されていますので、興味のある方はご参考ください。

- [Netlify CMS - Platform Guides](https://www.netlifycms.org/docs/site-generator-overview/)

[[TOC]]

## eleventy(11ty)プロジェクトを作成する

まずは、npmプロジェクトを作成します。
今回は`netlify-cms-11ty-example`という名前で作成しました。

```shell
mkdir netlify-cms-11ty-example
cd netlify-cms-11ty-example/
npm init -y
```

次に、静的サイトジェネレータのeleventyをインストールします。
現時点で最新の`1.0.1`をインストールしました。
```shell
npm install --save-dev @11ty/eleventy 
```

以下の構成でディレクトリ、ファイルを作成します。

```
.
├── package-lock.json
├── package.json
├── .eleventy.js
└── src
    ├── _data
    │ └── meta.json
    ├── _includes
    │ └── blog.njk
    └── posts
        ├── posts.json
        └── test.md
```

`src`配下のファイルは以下の通りです。

### .eleventy.js

eleventyの設定ファイルです。
ここでは、マークダウン記事の変換と`src`ディレクトリの指定のみを行います。

```javascript
const markdownIt = require("markdown-it");

module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("./src/admin/config.yml");
  eleventyConfig.setLibrary("md", markdownIt({
    html: true,
    breaks: true,
  }))
  return {
    dir: {
      input: "src",
    }
  };
};
```

`eleventyConfig.addPassthroughCopy("./src/admin/config.yml")`の部分は、Netlify CMSの設定ファイル(config.yml)をコピーするように指定します。
内容の詳細は後述しますが、実行時にNetlify CMSはこの設定ファイルを取得するため、静的サイト生成結果に含める必要があります。

### _data/meta.json
ブログサイトのメタデータ格納します。これもCMSでの管理対象としてます。
この情報はeleventyのテンプレートでグローバルに参照可能です[^1]。

[^1]: 詳細はeleventyの[公式ドキュメント](https://www.11ty.dev/docs/data-global/)を参照しくてださい。

初期状態として、以下のファイルを作成しました。

```json
{
  "siteName": "Netlify CMSで作成するブログサイト",
  "footerLinks": [
    {
      "name": "豆蔵デベロッパーサイト",
      "url": "https://developer.mamezou-tech.com"
    },
    {
      "name": "豆蔵公式ホームページ",
      "url": "https://www.mamezou.com/"
    }
  ]
}
```

### _includes/blog.njk

eleventyのレイアウトファイルです。全てのブログはこのテンプレートを使用します。

```html
<!doctype html>
<html lang="ja">
  <head>
    <title>{{title}}</title>
    <meta charset="UTF-8">
  </head>
  <body>
    <header style="border-bottom-style:solid;border-bottom-width:thin;">
      {{ meta.siteName }}
    </header>
    <article>
      <h1>{{ title }}</h1>
      <p>author: {{ author }}</p>
      {{ content | safe }}
    <article>
    <footer style="border-top-style:solid;border-top-width:thin;">
      <ul>
      {%- for link in meta.footerLinks %}
        <li><a href="{{ link.url }}">{{ link.name }}</a></li>
      {%- endfor %}
      <ul>
    </footer>
  <body>
</html>
```

headerタグ、footerタグには先程の`meta.json`の情報を出力します。
articleタグ内にはブログの情報を出力します。
`{{ content | safe }}`の部分にマークダウンで記述したブログをHTMLに変換して置き換えます。

### posts/posts.json

全ブログ共通の設定です。

```json
{
  "layout": "blog",
  "permalink": "/blogs/{{ page.date | date: '%Y/%m/%d' }}/{{ publishedPath }}/"
}
```

layoutとして先程作成した`blog.njk`を使用し、ブログのパス(permalink)を動的に指定します。
最終的なリンクは、ブログのメタ情報として指定する`publishedPath`により決まります。 例えば`/blogs/2022/08/03/sample-blog/`のようなパスになります。

### posts/test.md
動作確認用のサンプルブログです。

```markdown
---
title: テスト記事
author: noboru-kudo
publishedPath: test
date: 2022-08-03
---

## 見出し1
これはテストです。

### 見出し2

本サイトは静的サイトジェネレーターの[eleventy](https://11ty.dev)で生成しています。
```

この状態で以下のコマンドを実行します。

```shell
npx @11ty/eleventy --serve
```

eleventyのHTTPサーバーが起動し、ローカルホストの8080ポートで公開されます。
ブラウザから`http://localhost:8080/blogs/2022/08/12/test/`を開くと、マークダウンで記述したサンプルブログが表示されます。

![sample-blog](https://i.gyazo.com/5d9bebdb89f9594b6c8f3b66b3d48de1.png)

これで準備完了です。以降はNetlify CMSを使ってサイト設定確認やブログ作成・公開をしてみたいと思います。
これをGitHubのレポジトリとしてコミット＆プッシュしておきます。

```shell
git remote add origin https://github.com/<github-user>/netlify-cms-11ty-example.git
git add -A
git commit -m "initial commit"
git push origin main 
```

## Netlify CMSのセットアップをする

ではNetlify CMSをセットアップします。Netlify CMSは個別にインストールする必要はありません[^2]。

[^2]: npmモジュールとしてinstallもできます。詳細は[公式ドキュメント](https://www.netlifycms.org/docs/add-to-your-site/#installing-with-npm)を参照してください。

まず、`src`配下に`admin`ディレクトリを作成し、`index.html`を配置します。
index.htmlの内容は以下のようにしました。

```html
<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Content Manager</title>
</head>
<body>
  <script src="https://unpkg.com/netlify-cms@^2.0.0/dist/netlify-cms.js"></script>
</body>
</html>
```

`body`タグの中に`script`タグを配置して、Netlify CMSのモジュールを指定するだけです。
次に、`admin`ディレクトリ配下に`config.yml`を作成します。
このファイルがNetlify CMSの設定になります。

長いので2つに分けて説明します。

```yaml
backend:
  name: github
  repo: kudoh/netlify-cms-11ty-example
  branch: main

publish_mode: editorial_workflow

media_folder: src/images
public_folder: /images
locale: ja
```

この部分がNetlify CMS設定の基本的な部分です。
`backend`がコンテンツを保管する場所です。今回はGitHubを使用し、GitHubアカウントでコンテンツ管理をするようにしました。
`name`に`github`を指定し、`repo`/`branch`をGitHubに作成したレポジトリの情報をそれぞれ設定しています。

なお、ホスティングサービスとしてNetlifyを利用している場合は、[Netlify Identity](https://docs.netlify.com/visitor-access/identity/)を使うと、GitHubアカウントを持たない人でも簡単に認証設定できます（この場合はgit-gatewayを使用します）。

`publish_mode`には、Netlify CMSのワークフローを利用する指定としています。これを有効(`editorial_workflow`を指定)にしておくと、プルリクエストベースのGitHubのレビュープロセスが利用できます。
`media_folder`/`public_folder`は画像ファイルのアップロード先です。こちらは今回使用しませんが、画像ファイルを扱う場合に利用できます（利用しなくても指定は必須でした）。
`locale`は日本(ja)とします。これを指定しておくとCMSのUIが日本向けにローカライズされます。

続いてNetlify CMSが提供するUI部品を設定します。

```yaml
collections:
  - name: blog
    label: ブログ
    create: true # 新規作成可能
    folder: src/posts # GitHubのコンテンツ配置先
    slug: "{{year}}-{{month}}-{{day}}-{{slug}}" # ファイル名
    fields: # UI部品
      - { label: 記事のタイトル, name: title, widget: string }
      - { label: 公開パス, name: publishedPath, widget: string, pattern: ["^[a-z0-9-]+$", "英小文字、数字+ハイフンのみ"] }
      - { label: 執筆者, name: author, widget: string, pattern: ["^[a-z-]+$", "英小文字+ハイフンのみ"]}
      - { label: 公開日, name: date, widget: date, date_format: YYYY-MM-DD, format: YYYY-MM-DD }
      - { label: 本文, name: body, widget: markdown }
      - label: タグ
        name: tags
        widget: select
        multiple: true
        options: [netlify, 11ty, SSG, post, 2022年]
        default: [post, 2022年]
  - name: settings
    label: 設定
    files:
      - name: site
        label: サイト全般
        file: src/_data/meta.json
        editor:
          preview: false
        fields:
          - { label: サイト名, name: siteName, widget: string }
          - label: フッターリンク
            name: footerLinks
            widget: list
            collapsed: true
            summary: "{{fields.name}}:{{fields.url}}"
            fields:
              - { label: リンク名, name: name, widget: string}
              - { label: URL, name: url, widget: string, pattern: ["^https://.+$", "HTTPSサイトを指定"]}
```

この`collections`がCMSのUI設定として利用する部分です。
少し長くなりますが、要領さえ分かればそれほど難しいものでもありません。

ここでは、ブログ(name=blog)とサイト設定(name=settings)の2つの要素としています。
それぞれに対して、GitHubの参照先(`folder`または`files`/`file`)とUI部品(`fields`)を指定します。
UI部品にはNetlify CMSが提供するWidgetを利用できます。単純なテキストフィールドからマークダウンまで様々なものが用意されています。
それぞれの詳細は、以下公式ドキュメントを参照してください。

- [Netlify CMS - Widget](https://www.netlifycms.org/docs/widgets/)

これだけでも多くのユースケースに対応できますが、もっと凝った部品を提供する場合はカスタムWidgetを作成します。

- [Netlify CMS - Creating Custom Widgets](https://www.netlifycms.org/docs/custom-widgets/)

この場合はReactコンポーネントとして作成する必要がありますので、React経験者でないと少しハードルが高いかもしれません。
ただ、これを活用できるとCMSのUI/UXは飛躍的に向上すると思います。

## Netlify CMSのUIを見てみる

それでは、Netlify CMSを実際に使ってみたいと思います。
通常は、静的サイトとしてデプロイして使うと思いますが、Netlify CMS自体はバックエンドサービスを持たないため、ローカル環境でも利用できます。

ブラウザより`http://localhost:8080/admin/`にアクセスします。
以下のようなページが表示されます。

![Netlify CMS - login](https://i.gyazo.com/060dbdab15cbcf60ad34820b8f7d1a32.png)

「GitHubでログインする」をクリックして、GitHubで認証すると以下のようなトップページが表示されました。

![Netlify CMS - Home](https://i.gyazo.com/d69a4e0d6eec7b7b1f8c3a6c6e9bce8e.png)

いい感じのUIが表示されました。コレクションの部分が先程`config.yml`で指定したものです。
ブログは先程作成したテストブログ(`test.md`)が表示されています。これをクリックすると以下のような表示になります。

![Netlify CMS - test-blog](https://i.gyazo.com/a2371ae2e13dfdff7018b6427076a39c.png)

先程作成したブログの内容が表示されています。もちろん、ここで修正も可能です。

今度はサイト設定の方も見てみます。トップページに戻って「設定」 -> 「サイト全般」をクリックします（これも`config.yml`で設定したものです）。

![Netlify CMS - settings](https://i.gyazo.com/5dc839ac5890c2427f3f31e51cb0f479.png)

先程`meta.json`として作成したサイト設定情報が表示されています。ここで設定を変更すればサイト本体の方にも反映されます(GitHubにコミット)。

## Netlify CMSでブログを書いてみる(ワークフロー)

ここでは実際にNetlify CMS上でブログを書いてみたいと思います。
また、実際に公開される(mainブランチへのコミット)までにどのようなワークフローとなるのかも確認します。

Netlify CMSのトップページに戻って、「ブログを作成」ボタンをクリックします。
新規ブログの作成ページが表示されますので、以下のように入力しました。

![Netlify CMS - blog create](https://i.gyazo.com/d2719423a3a3a502ca58c924930a973f.png)

これを保存すると、下書き状態となります。
これはカンバンでも確認できます。ナビゲーションバーより「ワークフロー」をクリックすると以下のようになります。

![Netlify CMS - draft](https://i.gyazo.com/b9b5940cfe1048183cc2fe8fc73555cb.png)

GitHub上ではフィーチャーブランチ上にコミットされ、プルリクエストが作成されます。
以下プルリクエストの詳細です。

![GitHub - pull-request](https://i.gyazo.com/ad884008305eb54b89a4c32cba070c97.png)

プルリクエストにはNetlify CMSによってラベル`netlify-cms/draft`が付けられています。
ホスティングサービスの方のNetlifyと連携するようにしておけば、プルリクエストに反応してプレビューバージョンのサイトがデプロイされますので、ここで実際のサイトでブログを確認できます。

ここでブログ作成が完了し、レビュー依頼したいとします。
この場合はワークフローからドラッグ＆ドロップします（ブログを一度表示してステータスを「レビュー中」に変更しても同じです）。

![Netlify CMS - review](https://i.gyazo.com/b5ef4e5d10720c314af59a05f605d6f8.png)

GitHubでは先程の`netlify-cms/draft`ラベルが削除され、`netlify-cms/pending-review`が付けられています。
![GitHub - pull-request-review](https://i.gyazo.com/3789610cccfdfb3b2aa0c7e258ef4af1.png)

レビューが完了したものとします。ワークフローより該当ブログを公開待ち状態にします。
![Netlify CMS - pending-publish](https://i.gyazo.com/44d40ee64e41e7f2afb7ed53a23063b3.png)

GitHubのプルリクエストでは、今度はラベル`netlify-cms/pending-publish`が付けられました。
![GitHub - pending-publish](https://i.gyazo.com/2137964d748776e25f0a9317c23f38d1.png)

このようにNetlify CMSはプルリクエストのラベルを付け替えることで、現在のステータスを管理しているようです。

最後にこのブログを公開します。ワークフローの該当ブログの「エントリを公開」をクリックします。
![Netlify CMS - publish](https://i.gyazo.com/5e8b8a8a8198f03a87f48d7ed163ccd4.png)

これでプルリクエストはmainブランチにマージされ、フィーチャーブランチは削除されます（ワークフローからも該当ブログは消えます）。
![GitHub - pull-request-merged](https://i.gyazo.com/21a34aa22e71dfcbd6752f5eb36251d4.png)

(ホスティングサービスとしての)Netlifyを利用していれば、mainブランチの変更を検知し、実際のサイトに変更を反映する形になります。
Netlifyを利用していない場合は、このマージを契機にパイプラインでサイト生成して、デプロイするといった流れになると思います。

## まとめ
Netlify CMSはGitベースのバックエンドサービスを利用し、Git流のやり方でコンテンツ管理をしていることが実感できました。
とはいえ、ワークフローの動きも自然で、Gitに習熟していないユーザーでも比較的容易に扱えるのかなと思いました。
今回はブログ公開までのワークフローを見ていきましたが、サイト自体の設定も同じです。

本サイトでも、まずは共通レイアウト等を試行してみようかと思います（個人的にはブログ記事だとやはり使い慣れたエディターを使いたいなという感じがしました）。

当ブログで使用したGitHubレポジトリは以下で公開していますので、興味のある方はご参考ください。

- <https://github.com/kudoh/netlify-cms-11ty-example>