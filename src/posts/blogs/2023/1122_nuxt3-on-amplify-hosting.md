---
title: AWS AmplifyにNuxt3のSSRアプリをゼロコンフィグでデプロイする
author: noboru-kudo
date: 2023-11-22
tags: [aws-amplify, nuxt, SSR, vue]
---

GAリリースから約1年経過してだいぶ成熟してきた感のあるNuxt3ですが、利用するアプリのタイプに応じてデプロイ方法が異なってきます。

SPAやプリレンダリングを使用した静的ホスティングであれば、生成した静的リソースをデプロイするだけなので比較的簡単です。
ただ、最近主流となりつつあるサーバーサイドでページを生成するSSRアプリを採用した場合は、コンテナ等のサーバー環境を別途準備する必要があり何かと手間がかかります。

つい先日(2023-11-21)にNuxt公式のXアカウントからこんなポストがありました。

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">Deploying a Nuxt app to <a href="https://twitter.com/AWSAmplify?ref_src=twsrc%5Etfw">@AWSAmplify</a> with zero configuration is now possible ✨<a href="https://t.co/ussCbTHcfN">https://t.co/ussCbTHcfN</a> <a href="https://t.co/u7Autg3Jk4">pic.twitter.com/u7Autg3Jk4</a></p>&mdash; Nuxt (@nuxt_js) <a href="https://twitter.com/nuxt_js/status/1726684316435194083?ref_src=twsrc%5Etfw">November 20, 2023</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

AWS Amplifyホスティングでは約3年前(2020-9)にSSRをサポートしています。
ですが、サポートするフレームワークとしては事実上Next.jsの一択だったように感じます(誤解があるかもしれません)。
今回Nuxt3のサーバーエンジンである[Nitro](https://nitro.unjs.io/)がAmplifyホスティングにゼロコンフィグ対応しました。
これによりNuxt3もAmplifyホスティングの有力な選択肢として加えられそうです。

- [Nuxt doc - Deploy - AWS Amplify](https://nuxt.com/deploy/aws-amplify)
- [Nitro doc - Providers - AWS Amplify](https://nitro.unjs.io/deploy/providers/aws-amplify)

早速これを試してみます。

[^1]: <https://github.com/unjs/nitro/releases/tag/v2.8.0>

## 対象のNuxtアプリケーションを準備する

本記事で試すNuxtアプリケーションは、以下Nuxtチュートリアル記事で作成したアプリケーションです。

- [Nuxt3入門(第2回) - 簡単なNuxtアプリケーションを作成する](/nuxt/nuxt3-develop-sample-app/)

Amplify対応はNuxt3のv3.8.2(Nitro v2.8.0[^1])以降でサポートされていますので、ここでバージョンを最新化しておきます。

```shell
npx nuxt upgrade
> ℹ Package Manager: npm 10.2.2
> ℹ Current nuxt version: 3.8.2
```

Amplify対応はゼロコンフィグでデプロイ時に自動検知して構成されます。ここで設定変更は不要です。

今回は、これをGitHubのプライベートレポジトリとして作成しておきました。

## Amplifyホスティングを作成する

ここでは、AWSの管理コンソールで作成します。
AWS管理コンソールにログインして、AWS Amplifyサービスを選択します。
Amplifyホスティングの「使用を開始する」をクリックします。

![amplify hosting - getting start](https://i.gyazo.com/708d028fe73cc0f752a0a7d5def515ae.png)

Gitプロバイダーを選択します。今回はGitHubのレポジトリとして作成していますのでGitHubを選択します。

![select git provider](https://i.gyazo.com/b5cc53914ecbde7984c4b9c6a409dc85.png)

ここでGitHubのサイトに飛ばされるので、GitHubのAmplifyアプリのインストールとレポジトリの読取許可をします。

<img src="https://i.gyazo.com/d419c0ca7622492957f0233e44810858.png" alt="GitHub Auth" width="400px" />

プルダウンに選択可能なレポジトリが表示されますので、対象アプリケーションのレポジトリとデプロイブランチを指定します。

![select nuxt3 app repository](https://i.gyazo.com/deb558a87d5c88ab0ddf1a39605a8694.png)

次に進むと、ビルド設定のページが表示されます。
ここで生成されるAmplifyの構成ファイルは変更不要です(自動検知)。

ただし、SSRを使用しますので「サーバー側のレンダリングのデプロイ」セクションの「Enable SSR app logs」をチェックします。
なお、ビルド時の環境変数があれば、ここで合わせて指定できます（見切れていますがSSR設定の下に詳細設定があります）。

![build setting](https://i.gyazo.com/005ab5f7b615a928a73ead34be329352.png)

最終確認ページが表示されます。
そのまま「保存してデプロイ」をクリックします。

![amplify hosting confirm](https://i.gyazo.com/3790a905ca1a43ca2aa660843a03df5d.png)

Amplifyホスティングのビルドとデプロイが開始されます。以下の表示になったら完了です。
これ以降は、対象レポジトリのブランチを監視して変更を検知すると継続的にビルド、デプロイをしてくれます。

![amplify hosting complete](https://i.gyazo.com/73d98a67007f44ac55196a1e55cdb433.png)

左側に`https://main.xxxxxxxxxxxxx.amplifyapp.com/`と表示されている部分がAmplifyで生成したURLです。
このリンクを踏むと、サンプルアプリがデプロイされていることが確認できます。

![nuxt3 app](https://i.gyazo.com/3604b1f728e250217314b8a8e2a069b0.png)

もちろん、このドメインはカスタムドメインに変更できます。
詳細はAmplifyホスティングの公式ドキュメントを参照してください。

- [Amplify Hosting Doc - Setting up custom domains](https://docs.aws.amazon.com/amplify/latest/userguide/custom-domains.html)

Amplifyアプリページのブランチ名(ここではmain)をクリックするとビルドの詳細が確認できます。
ここではフロントエンドのビルドログの部分を注目します。

![Amplify Hosting build log](https://i.gyazo.com/9296cad4e8ca8a500ea9542c517ba265.png)

Nitroのプリセットとして`aws-amplify`が選択されていることが分かります。
これがNitroで新しく追加されたAmplifyホスティング向けのプリセットです。
NitroがAmplifyホスティングのビルドであることを検知して、Amplifyホスティングの仕様に従ったリソースを`.amplify-hosting`配下に出力しています。

:::column:Nuxt/NitroのAmplifyホスティング向けプリセットの出力内容を確認する

ローカル環境で出力リソースを確認する場合は、環境変数を指定してビルドします。

```shell
NITRO_PRESET=aws_amplify npm run build
```

プロジェクトルート直下の`.amplify-hosting`に、Amplifyホスティング準拠のリソースが出力されています。
Amplifyホスティング仕様の詳細は、公式ドキュメントを参照してください。

- [Amplify Hosting - SSR - Deployment Specification](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-deployment-specification.html)

合わせてNitroのプリセットのソースコードを参照すると理解も深まります。

- [GitHub - Nitro - aws-amplify.ts](https://github.com/unjs/nitro/blob/main/src/presets/aws-amplify.ts)
:::

サーバー(SSR)側のログはCloudWatchから確認できます。

![computed log](https://i.gyazo.com/7a6b736c9cf07b0cf2fb7161beea5c90.png)
![cloudwatch logs](https://i.gyazo.com/c58c4c83c7250e0d9a6e93798eefe214.png)

サーバー側はLambdaで動いているようですね。

## まとめ

Amplifyホスティング簡単ですね！今回サーバー側の環境構築作業は一切していませんがAmplifyが全部やってくれました。

今回試していないものの中で一番気になるのは、Netlify的なプルリクエスト時のプレビューモードです。

- [Amplify Hosting Doc - Web previews for pull requests](https://docs.aws.amazon.com/amplify/latest/userguide/pr-previews.html)

これであればPR作成時にレビューや動作確認ができるのでとても開発効率が良くなるなと思います(今度試してみようと思います)。

また、デプロイワークフロー内にテストも組み込めるようです(現状はCypressのみ)。

- [Amplify Hosting Doc - Add end-to-end Cypress tests to your Amplify app](https://docs.aws.amazon.com/amplify/latest/userguide/running-tests.html)

単純なアプリであれば、CDパイプラインを別途作成しなくても安全にアプリケーションを公開できますね。
