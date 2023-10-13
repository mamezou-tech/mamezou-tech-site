---
title: "フロントエンド"
description: フロントエンド系フレームワーク・プラットフォームの活用方法
icon: https://api.iconify.design/mdi/web.svg?color=%23730099&height=28
---

フロントエンド系の開発の比重は近年高くなる一方です。コンシューマー向けだけでなく、エンタープライズでも生産性向上のために良いユーザー体験が求められるようになってきました。フロントエンド技術は、移り変わりが激しくキャッチアップが大変な分野でもあります。

ここでは、定番フレームワークの使いこなしポイントや、注目技術についてご紹介します。


## Nuxt
Vue は React と人気を二分する UI フレームワークで、Nuxt は Vue をベースとした アプリケーションフレームワークです。ここでは Nuxt の導入や各機能の利用方法をご紹介します。

### Nuxt3入門
- [Nuxt3入門(第1回) - Nuxtがサポートするレンダリングモードを理解する](/nuxt/nuxt3-rendering-mode/)
- [Nuxt3入門(第2回) - 簡単なNuxtアプリケーションを作成する](/nuxt/nuxt3-develop-sample-app/)
- [Nuxt3入門(第3回) - ユニバーサルフェッチでデータを取得する](/nuxt/nuxt3-universal-fetch/)
- [Nuxt3入門(第4回) - Nuxtのルーティングを理解する](/nuxt/nuxt3-routing/)
- [Nuxt3入門(第5回) - アプリケーションの設定情報を管理する](/nuxt/nuxt3-app-configuration/)
- [Nuxt3入門(第6回) - アプリケーションで発生するエラーに対応する](/nuxt/nuxt3-error-handling/)
- [Nuxt3入門(第7回) - Nuxt3のプラグイン・ミドルウェアを使う](/nuxt/nuxt3-plugin-middleware/)
- [Nuxt3入門(第8回) - useStateでコンポーネント間で状態を共有する](/nuxt/nuxt3-state-management/)
- [Nuxt3入門(第9回) - Nuxt3アプリケーションをサーバーレス環境にデプロイする](/nuxt/nuxt3-serverless-deploy/)

### ブログ
- [Nuxt3で導入されたハイブリッドレンダリングとNuxt版ISG/ISRを試してみる](/blogs/2022/12/18/nuxt3-hybrid-rendering/)
- [Nuxt版のServer Componentsでサーバー環境限定でレンダリングする](/blogs/2023/07/05/nuxt3-server-components-intro/)

## プリレンダリング
クライアントでの応答性が重要な Web アプリでは SPA(Single Page Application) が発展してきました。一方、コンテンツが重要なサイトでは事前ビルドした静的コンテンツによる MPA(Multi Page Application) が注目されています。ここではプリレンダリングフレームワークに関する記事を紹介します。

### Eleventy(11ty)
- [Eleventy入門(第1回) - 11tyで手早く静的サイトを作成する](/11ty/11ty-intro/)
- [Eleventy入門(第2回) - テンプレート・コードを部品化する](/11ty/11ty-reusable-components/)
- [Eleventyで生成したマークダウン記事の画像を拡大する](/blogs/2022/05/19/11ty-zoom-image/)
- [Eleventyで生成したサイトでNetlify Edge Functionsを使ってみる](/blogs/2022/08/17/netlify-edge-functions-with-11ty/)

### Astro
- [コンテンツ重視の静的サイトジェネレーター Astro でドキュメントサイトを構築する](/blogs/2022/09/07/build-doc-site-with-astro/)
- [Astro 2.0 + MDX + Recharts で Markdown ページにインタラクティブなチャートを描画する](/blogs/2023/01/29/astro-2.0-mdx/)
- [Astro 2.1 で実験的サポートされた Markdoc Integration を触ってみる](/blogs/2023/03/23/astro2_1-with-markdoc-support/)

### Fresh
- [Fresh - Deno の 次世代 Web フレームワーク](/blogs/2022/07/04/fresh-deno-next-gen-web-framework/)
- [Fresh 1.2 へアップグレード - island の新機能など](/blogs/2023/06/27/fresh-1_2/)

### Lume
- [Lume入門(第1回) - Denoベースの静的サイトジェネレーターLumeで静的サイトを手早く作る](/lume/lume-intro/)
- [Lume入門(第2回) - テンプレートエンジンとしてJSXとMDXを使う](/lume/lume-jsx-mdx/)

## Deno
Deno は高速でセキュアな JavaScript ランタイムです。Node.js に比べ開発体験も向上しています。ここでは、Deno の導入や活用についてご紹介します。

### Denoを始める
- [Deno を始める - 第1回 (開発環境とランタイム)](/deno/getting-started/01-introduction/)
- [Deno を始める - 第2回 (外部ライブラリの利用)](/deno/getting-started/02-use-external-packages/)
- [Deno を始める - 第3回 (SSR)](/deno/getting-started/03-server-side-rendering/)
- [Deno を始める - 第4回 (OS 機能と FFI の利用)](/deno/getting-started/04-using-os-and-ffi/)
- [Deno を始める - 第5回 (WebAssembly の利用)](/deno/getting-started/05-using-wasm/)
- [Deno を始める - 第6回 (Deno Deploy で静的ファイルを配信)](/deno/getting-started/06-serving-files-on-deno-deploy/)
- [Deno を始める - 第7回 (All in one な deno のサブコマンド)](/deno/getting-started/07-all-in-one-deno-sub-commands/)

### ブログ
- [Deno による Slack プラットフォーム(オープンベータ)](/blogs/2022/09/27/slack-new-plotform-powered-by-deno/)
- [Deno 1.31で安定化されたプロセス起動 API Deno.Command を使ってみる](/blogs/2023/03/06/deno-new-command-api/)

## エッジ環境
コンテンツの配信先を CDN にしてホスト管理プロセスを無くす Jamstack なアーキテクチャが普及してきています。さらに静的コンテンツのみならず、データベース機能も各サービスから提供され始めました。ここでは Netlify[^1] をはじめとするエッジ環境の活用についてご紹介します。

[^1]: 豆蔵デベロッパーサイトのホスティングにも使っています。

### Netlify
- [Deno Deploy を基盤とする Netlify Edge Functions を試す](/blogs/2022/07/23/try-netlify-edge-functions/)
- [Netlify CMSのワークフローでコンテンツ管理をする](/blogs/2022/08/03/netlifycms-workflow-intro/)
- [Netlify Identityを使ってNetlify CMSのユーザー認証をする](/blogs/2022/08/10/netlify-cms-with-netlify-identity/)
- [NetlifyのLighthouseプラグインでWebサイトのメトリクスを継続的に評価する](/blogs/2022/08/17/netlify-lighthouse-plugin-intro/)
- [Netlify Split TestingでGitブランチベースのA/Bテストをする](/blogs/2022/08/21/netlify-split-testing-intro/)

### Deno Deploy
- [Deno のビルトイン key-value データベース Deno KV が登場](/blogs/2023/05/09/deno-kv/)
- [Deno KV を Deno Deploy で使う](/blogs/2023/05/18/deno-kv-on-deno-deploy/)

## デスクトップアプリ
フロントエンドの技術は Web アプリだけでなくデスクトップアプリにも応用されています。ここでは、定番の Electron をはじめとするデスクトップアプリケーションのフレームワークの活用についてご紹介します。

### Electron
- [Electron - WebView から BrowserView に移行する](/blogs/2022/01/07/electron-browserview/)
- [electron-quick-start のコミット履歴で見る Electron プログラミングモデルの変遷](/blogs/2022/02/14/history-of-electron-quick-start/)
- [Electron v20 で有効化された Renderer プロセスサンドボックス化に対応する](/blogs/2022/08/03/electron-renderer-process-sandboxed/)

### Tauri
- [Rust によるデスクトップアプリケーションフレームワーク Tauri](/blogs/2022/03/06/tauri/)
- [Tauri でデスクトップアプリ開発を始める](/blogs/2022/07/08/writing-app-with-tauri/)
