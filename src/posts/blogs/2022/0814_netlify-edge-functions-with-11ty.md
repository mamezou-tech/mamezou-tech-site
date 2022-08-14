---
title: Eleventyで生成したサイトでNetlify Edge Functionsを使ってみる
publishedPath: netlify-edge-functions-with-11ty
author: noboru-kudo
date: 2022-08-17
templateEngineOverride: md
permalink: "/blogs/{{ page.date | date: '%Y/%m/%d' }}/{{ publishedPath }}/"
tags:
  - netlify
  - 11ty
---
一般的にサイトジェネレータで作成したサイトは、特定の場所に静的リソースを配置し、CDN経由で配信することが多いかと思います。
昨今はNext.jsやNuxt.js等のハイブリッドフレームワークを使って、サーバーサイド側でページを生成するSSRも増えてきていますが、やはり静的リソースのみを配置するスタイルは何かと開発・運用しやすいと思います。

とはいえ、このような静的サイトでも、認証、レスポンスヘッダ/Cookie操作等、ちょっとしたサーバーサイド側の処理がほしいことはよくあります。

今回は静的サイトジェネレータに[Eleventy](https://www.11ty.dev/)を使ったサイトで[Netlify](https://www.netlify.com/)が提供する[Netlify Edge Functions](https://docs.netlify.com/netlify-labs/experimental-features/edge-functions/)を適用する方法をご紹介したいと思います。

Netlify Edge Functionsは本サイトで別途紹介記事がありますので、合わせてこちらもご参考ください。

- [Deno Deploy を基盤とする Netlify Edge Functions を試す](/blogs/2022/07/23/try-netlify-edge-functions/)


ここでも触れられているように、Netlify Edge FunctionsはNetlifyのエッジ環境で任意のコードを実行するサービスです。
また、ランタイム環境として次世代のJavaScriptプラットフォーム[Deno](https://deno.land/)を利用する点でも、大きな注目が集まっています。

:::alert
ここで使うNetlify Edge Functionsは実験的(experimental)バージョンとなっています。
また、Netlify Edge Functionsに対応したEleventy2.xもCanaryバージョンです。
実際に利用する場合は、最新の状況を確認した上で、クリティカルでないシステムで適用することをお勧めします。
:::

[[TOC]]

## Eleventyのサンプルサイトを作成する

まずは、Eleventyでシンプルなサイトを作成します。
任意のnpmプロジェクトを作成し、Eleventyとローカル確認用に[Netlify CLI](https://www.npmjs.com/package/netlify-cli)をインストールします。

```shell
npm install --save-dev @11ty/eleventy@2.0.0-canary.14 netlify-cli
```

注意点として、現時点のEleventyの安定版は1.0.1ですが、こちらではNetlify Edge Functionsの対応は含まれていません。明示的に2系バージョンを指定する必要があります。
ここでは、執筆時点で最新の`2.0.0-canary.14`をインストールしました。

Eleventyでのサイト作成は別記事で紹介していますので、ここでは省略します(記事はNetlify CMSのものですが、こちらはセットアップ不要です)。

- [Eleventy(11ty)プロジェクトを作成する](/blogs/2022/08/03/netlifycms-workflow-intro/#eleventy11tyプロジェクトを作成する)

## Eleventyの設定ファイルを修正する

EleventyのEdge Functions対応は、別途インストールは不要で、Eleventy本体に含まれています。
Eleventyの設定ファイル(.eleventy.js)に以下を追加し、プラグインを有効化します。

```javascript
const { EleventyEdgePlugin } = require("@11ty/eleventy");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(EleventyEdgePlugin);
};
```

これだけです。設定はデフォルトのままです（addPluginの第2引数で設定変更も可能です）。
なお、現時点ではEdge Functionサービスは、Netlify Edge Functionsのみに対応していますが、今後追加されていきそうです。そうなってくると、ここで利用するサービスごとの追加設定が別途必要になってきそうです。

## Edge Functionを記述する

## ローカルで確認する(Netlify CLI)

## Netlifyにデプロイする

## まとめ
Elevenｔｙのプラグインを有効にするだけで、簡単にNetlify Edge Functionsを実行することができました。
これだけ簡単でしたら、もっといろんな用途で使っていくことができそうだと思いました。

とはいえ、Netlify Edge FunctionsとEleventy2.0系ともに実験的バージョンですので、早く安定版になるが待ち遠しい感じですね。

本サイトでも、当記事で紹介したNetlify Edge Functionsを使ってテーマ切り替え機能を最近追加しています。
ここではCookieを指定し、テンプレート上でCookieの値に応じてCSS切り替えを行っています。

---
参照資料

- [eleventy - ELEVENTY EDGE](https://www.11ty.dev/docs/plugins/edge/#edge-shortcode-examples)
