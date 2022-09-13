---
title: Netlify Split TestingでGitブランチベースのA/Bテストをする
author: noboru-kudo
date: 2022-08-21
templateEngineOverride: md
tags: [netlify]
---

不特定多数のユーザーに公開するWebサイトでは、UI/UXの改善がエンゲージメントやコンバージョン等の指標に良い影響があるのかは、実際に公開してみないと分からないことが多いかと思います。

ここでよく利用されるリリース戦略はA/Bテストです。
運用中のバージョン(Aパターン)に加えて、変更後のサイト(Bパターン)を同一ドメインで並行して公開し、Cookie等の値を利用して一定の割合でBパターンにもリクエストを振り向けます。
一定期間運用後に、両バージョンのメトリクスを比較し、実際に改善されていることを確認できた場合に全面的に切り替えます。

A/Bテストを実現するサービスは様々なものがありますが、今回は[Netlify](https://www.netlify.com/)のSplit Testing機能を利用したA/Bテストをご紹介します。

- [Netlify - Split Testing](https://docs.netlify.com/site-deploys/split-testing/)

NetlifyのSplit Testingは、GitブランチベースでA/Bテストを実施します。Netlifyは通常Gitワークフローで運用することがほとんどですので、Netlifyユーザーにとっては非常に相性の良い方法です。

:::alert
NetlifyのSplit Testing機能は現在ベータバージョンでの提供となっております。
実際に利用する際は、最新の状況を確認し、事前に動作確認することをお勧めします。
:::

ここでは以下のようにmainブランチはProduction環境向け(Aパターン)、feature/darkブランチは更新バージョン(Bパターン)としてA/Bテストします。

![Netlify Split Testing summary](https://i.gyazo.com/7fd7e2fa17b9b2a1f7a8df7cd4eabb2e.png)

[[TOC]]

## Netlifyでサイトを作成する

ここではGitレポジトリのホスティングサービスとしてGitHubを使用します[^1]。
任意のサイトをGitHubレポジトリとして作成し、Netlifyにインポートします。このときmainブランチをProductionにしてデプロイします。

[^1]: Netlifyでは他にもGitLabやBitbucket、Azure DevOpsのレポジトリからもインポート可能です。

- [Netlify - Import from an existing repository](https://docs.netlify.com/welcome/add-new-site/#import-from-an-existing-repository)

使用する静的サイトのジェネレータは何でも構いませんが、ここでは本サイトで使っている[Eleventy](https://www.11ty.dev/)で確認しています。
HugoやNext.js、Nuxt等の他のジェネレータを使っても基本的な流れは同じです。
サイト自体の作成は本題ではありませんので、ここでは省略します。

A/Bテストでは、テスト自体よりも両バージョンのメトリクスを評価することが大切です。
ここでは、ここではメトリクス収集に[Google Analytics](https://analytics.google.com/analytics/web/)(GA4)を使います[^2]。まずはGoogle Analyticsのアカウントを作成します。

[^2]: NetlifyのドキュメントではGoogle Analytics以外に[Segment](https://segment.com/)を使った例が紹介されています。詳細は[こちら](https://docs.netlify.com/site-deploys/split-testing/#send-to-segment)を参照してください。

- [GA4のセットアップ - Set up Analytics for a website and/or app](https://support.google.com/analytics/answer/9304153)

その後、サイトにGoogle Analyticsのスクリプトタグを埋め込みます。
基本的にはGoogle Analytics導入時に提案されたコードを埋め込むだけですが、Google Analyticsに送信されるメトリクスがどのブランチ(パターン)のものなのかを識別するために一部変更しています。

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());

gtag('config', 'G-XXXXXXXXXX', {
  'user_properties': {
    branch: '{{ env.branch }}'
  }
});
</script>
```

Netlifyではビルド時に、どのブランチでビルドしているのかという情報を`BRANCH`という環境変数に設定します。

- [Netlify - Environment variables - Git metadata](https://docs.netlify.com/configure-builds/environment-variables/#git-metadata)

これをGoogle Analyticsにカスタムディメンションとして送信し、どのバージョン(＝ブランチ)のものなのかを判断できるようにします。

上記コードでは、`gtag('config')`で、ユーザースコープ(`user_properties`)のカスタムディメンション(`branch`)として、変数`{{ env.branch }}`を埋め込んでいます。
この部分の設定方法は、サイトジェネレータに何を使うかによって変わってきます。

Eleventyの場合は`_data`ディレクトリ配下に、以下のようなJavaScriptファイル(`env.js`)を配置すれば、上記のようにNetlifyの環境変数(`BRANCH`)の値を参照できます。

```javascript
module.exports = {
  branch: process.env.BRANCH || 'main',
}
```

このカスタムディメンション(`branch`)はGoogle Analytics側でもカスタム定義として登録しておきます。

![GA - custom dimension](https://i.gyazo.com/3a0aec7e687ed2bed616850fae33429a.png)

カスタムディメンションの詳細は、Google Analyticsのドキュメントを参照してください。

- [GA4カスタムディメンション作成 - Create dimensions & metrics](https://support.google.com/analytics/answer/10075209)
- [GA4カスタムディメンション収集 - Collect data about your users](https://support.google.com/analytics/answer/12370404)

この状態で、サイトをmainブランチにコミット&プッシュし、Productionバージョンとしてデプロイします(mainブランチ変更をNetlifyが検知して自動でデプロイされます)。

## 更新バージョンのブランチを作成する

mainブランチよりフィーチャーブランチを作成し、更新バージョンを作成します。
今回は使用するCSSをダークモードに切り替えるように変えてみました。

```html
  <!-- mainブランチは/css/style.cssになっている -->
  <link href="/css/style-dark.css" rel="stylesheet" />
```

これをfeature/darkブランチとしてGitHubにプッシュします。
通常はこの後mainブランチへのPull Requestを作成すると、Netlifyが検知しPreviewバージョンとしてデプロイを実施します。

## NetlifyのSplit Testingを有効にする

NetlifyコンソールからSplit Testingを選択し、「Activate branch deploys」をクリックします。

![Netlify activate branch deploys](https://i.gyazo.com/ad86d64db896db79470716ebca402d3b.png)

こうするとmain以外のBranchデプロイが実行され、Gitブランチが選択可能な状態となります。
デプロイログを見ると、Branchデプロイはソースは同じですが、Pull Request作成時にデプロイされるPreviewバージョンとは異なるもののようです(当初勘違いしてました)。

![Netlify Split Testing](https://i.gyazo.com/d4fd1f1a3486245645ab0a1227234e41.png)

Branchのところに、先程更新バージョンとしてGitHubにプッシュしたfeature/darkを選択します。
Splitの比率はデフォルトの50%のままにし、「Start test」をクリックします。
これでSplit Testingが開始されます。
mainブランチ(つまりProduction環境)にデプロイしているものと同じURLにアクセスすると50%の確率でfeature/darkブランチのサイトが表示されます。
Netlify Split Testingでは、CookieベースのA/Bテストを採用しており、Chrome DevToolsから`nf_ab`というCookieが設定されているのが確認できます。
以下は更新バージョン(Bパターン)で表示されている状態です。

![Netlify Split Testing - B pattern](https://i.gyazo.com/47472661f8a083db536a0b71b7db42a9.png)

A/Bテストのパターン切り替えはCookieベースになっていますので、同一ブラウザで何度リロードしても変わりません。
ローカルでバージョンを切り替えを確認するには、その都度Cookieを削除してアクセスします。50%の確率で変わるはずです。

Google Analyticsのリアルタイムレポートでも以下のように確認できます。
![GA - realtime report user property](https://i.gyazo.com/70f6a19de77eda6c0b1e33f11754878c.png)

これを分析軸とすれば、この変更がサイトアクセスにどのような影響を及ぼしているか確認できます。
良い影響がでていることが確認できれば、フィーチャーブランチをmainブランチにマージすれば、Productionバージョンに昇格します。
その後、Netlifyコンソールから「Stop test」をクリックすればSplit Testingは終了します。

一方で、更新バージョンの結果が好ましくない場合は、フィーチャーブランチに変更コミットを重ねれば、Branchデプロイしたバージョンにも反映されA/Bテストをそのまま継続できます。
改善の見込みがなければ、Split Testingを終了して、フィーチャーブランチは削除しても構いません。

## まとめ

今回は、Netlifyが提供するSplit Testingを利用してA/Bテストを試してみました。
メトリクス収集の部分の工夫は必要ですが、GitブランチベースでA/Bテストを実施できることが分かりました。
レビュー段階でちょっと実際に公開してみないと分からないと思えば、そこからすぐにA/Bテストを開始するなんてことが簡単にできます。

とても簡単に実施できますので、Netlifyを使っている方は是非試してみてください！
本サイトでも今後必要に応じて試してみたいと思います。
