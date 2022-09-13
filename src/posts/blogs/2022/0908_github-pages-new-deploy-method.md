---
title: カスタムワークフローで GitHub Pages デプロイが可能に
author: masahiro-kondo
date: 2022-09-08
tags: [GitHub, CI/CD]
---

GitHub Pages は専用のブランチか `docs` などのターゲットディレクトリを指定して公開する方式です。したがって、SSG(Static Site Generator) を使う場合、ソースコードだけでなくビルド成果物もリポジトリ管理する必要がありました。7月に GitHub Actions ワークフローによるデプロイがベータ版として利用可能になりました。

[GitHub Pages&#058; Custom GitHub Actions Workflows (beta) | GitHub Changelog](https://github.blog/changelog/2022-07-27-github-pages-custom-github-actions-workflows-beta/)

これにより、ビルド成果物をリポジトリ管理せずに、リポジトリの更新をトリガーに GitHub Pages を更新できるようになります。

リポジトリの GitHub Pages の設定で Build and deployment セクションの `Source` を見ると、GitHub Actions (beta) が選択できるようになっています。

![GitHub Pages Build and deployment](https://i.gyazo.com/869904e7802923600aa670afd461fb4f.png)

GitHub Actions を選択すると Jekyll を使ったワークフローと、Static HTML のワークフローがサジェストされます。

![ワークフロー選択](https://i.gyazo.com/65cb718acb9cb10ad30065e8197ad058.png)

Jekyll のワークフローを修正して使えばよさそうということで、`GitHub Pages Jekyll` の `Configure` をクリック。ワークフローの編集画面になるので、これをベースに作業をしていきます。

![ワークフロー編集](https://i.gyazo.com/a4d5f81fd90846d12113dd7f213bad27.png)

以下のようなワークフローを書きました。Jekyll ではなく、[先日紹介した](/blogs/2022/09/07/build-doc-site-with-astro/) Astro でビルドしています。

{% raw %}
```yaml
name: Deploy GitHub Pages with Astro

on:
  push:
    branches: ["main"]

  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      - name: Setup Pages
        uses: actions/configure-pages@v2
      - name: Use Node.js 16
        uses: actions/setup-node@v2
        with:
          node-version: 16
      - name: Install dependencies
        run: npm install
      - name: Build Astro
        run: npm run build
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v1
        with:
          path: dist/

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v1
```
{% endraw %}

ポイントとしては、`permission`の　`contents: read` でリポジトリの読み取りを `pages: write` Pages への書き込みを許可しています。`id-token:write` の部分は、GitHub Pages をデプロイするインフラに対して OIDC 認証するために必要なのではないかと推測しています。

ジョブはシーケンシャルに実行される2つのジョブ(build と deploy)を定義して、build ジョブの最後に、Astro でビルドした静的サイト用の成果物を upload-pages-artifact でアップロードしています[^1]。Astro のデフォルトでは、`dist` 配下に成果物を出力しますので、`with/path` で指定しました。後続の deploy ジョブは、deploy-pages アクションを使用します。このアクションは、先行ジョブの成果物をダウンロードして、デプロイを実行します[^2]。

このように、GitHub Pages 専用のアクションを組み合わせてワークフローを作成することで、GitHub 側で Pages の構築をやってくれます。

[^1]: upload-artifact ではないことに注意。
[^2]: depoly ジョブは Jekyll のワークフローから変えていません。

:::info
シーケンシャルなジョブの定義については、以下の記事にまとめていますので、参考にしてください。

[GitHub Actions ワークフローにおけるジョブ制御](/blogs/2022/02/20/job-control-in-github-actions/)
:::

ワークフローを実行して成功するとサマリーページに build ジョブの成果物が表示され、deploy ジョブには、デプロイ先の URL が表示されます。

![ワークフロー実行結果](https://i.gyazo.com/b4cef713e288d4966ad773c120a907be.png)

リポジトリのトップページの Environments セクションでも Pages が作成されていることが表示されます。

![リポジトリのPages表示](https://i.gyazo.com/fc8fed6f1d83a5123d98340fcef5ab0f.png)

以上、Git Hub Actions のカスタムワークフローによる GitHub Pages デプロイを試しました。これまで GitHub Pages はちょっと特殊なブランチ管理が必要でしたが、この機能が正式公開されれば、Netlify や Cloudflare Pages とまではいきませんが、かなり使い勝手が向上すると言えるでしょう。特に Enterprise アカウントで Private な GitHub Pages をメンテナンスしているプロジェクトでは喜ばれそうです。
