---
title: Netlify Identityを使ってNetlify CMSのユーザー認証をする
publishedPath: netlify-cms-with-netlify-identity
author: noboru-kudo
date: 2022-08-10
permalink: "/blogs/{{ page.date | date: '%Y/%m/%d' }}/{{ publishedPath }}/"
tags:
  - netlify
  - netlify-cms
  - netlify-identity
  - Security
  - 認証/認可
---
以前に以下の記事で[Netlify CMS](https://www.netlifycms.org/)を使ったコンテンツ管理をご紹介しました。

- [Netlify CMSのワークフローでコンテンツ管理をする](/blogs/2022/08/03/netlifycms-workflow-intro/)

この記事ではGitHubのOAuth認証を使用して、ユーザーがブログ投稿をできるようにしました。
当サイトにおいても、記事の投稿をNetlify CMSでも作成、公開できるようにしました。この記事自体もNetlify CMSを使って作成しています。

CMSを使うのはいいですが、これを操作して誰でも投稿できる状態は望ましくありません。
また、ケースによってはCMSを利用するユーザーがバックエンドのGitHubアカウントを持っていないこともあると思います。
このようなケースに対応してNetlifyでは[Netlify Identity](https://docs.netlify.com/visitor-access/identity/)という認証サービスがあります。
Netlify Identityは、認証機能のマネージドサービスで、独自のユーザー管理はもちろん、Google等の外部の認証サービスと連携可能です。AWSでいうCognitoユーザープールのようなものです。

- [Getting Started with JWT and Identity](https://www.netlify.com/blog/2018/01/23/getting-started-with-jwt-and-identity/)

Netlify Identity自体はNetlify CMS専用のサービスではなく、汎用的な認証サービスです。
例えば、Netlifyにホスティングしているサイトで特定のページは、社内ユーザー向けにしたいといったユースケースで使用できます。

今回は、Netlify Identityで、Netlify CMSでユーザー認証を行う方法をご紹介したいと思います。
[前回記事](/blogs/2022/08/03/netlifycms-workflow-intro/)でローカル環境で動作確認したブログサイトをNetlify上で動かします[^1]。
ここでは、CMSは招待制で特定ユーザーのみ利用できるようにし、認証方式としてGoogleも利用可能にします。

また、Netlify CMSはURLとして/adminを使用しますので、このパスのみをNetlify Identityでの認証対象とします。それ以外のページ(トップページ、公開ブログ)は誰でも参照できるようにします。

完成形のGitHubレポジトリは、以下に公開しています。

- <https://github.com/kudoh/netlify-cms-11ty-example/tree/feature/netlify-identity>

[^1]: 認証時に別途Netlifyのドメインを登録することでローカル環境でも動作は可能でした。


## Netlifyにサイトをデプロイする

まずは、前回構築したサイトをNetlifyにホスティングします[^2]。
Netlifyにログインし、既存のGitHubレポジトリを新規サイトとしてデプロイします。
Netlifyコンソールから以下のように選択して、ナビゲーションにしたがって進みます。

1. 「Add New site」
1. 「Import an existing project」選択
1. 「GitHub」クリック
1. GitHubログイン
1. レポジトリ選択
1. ブランチ選択(feature/netlify-identity)
1. 「Deploy site」クリック

ブランチにはfeature/netlify-identityを選択します。mainブランチはNetlify Identity対応が含まれていませんので、後述する変更を別途行う必要があります。

![Deploy Site](https://i.gyazo.com/7d9cf17aae4293818d9487ff1e59ef29.png)

ブランチ以外は特にデフォルトから変更する必要はありません。
Netlifyのサイトデプロイの詳細なやり方は、以下公式ドキュメントを参照してください。

- [Netlify - Import from an existing repository](https://docs.netlify.com/welcome/add-new-site/#import-from-an-existing-repository)

[^2]: Netlifyへのデプロイには、Netlifyのアカウントが必要になります。この記事ではProプランで確認したものですが、無料のStarterプランでもNetlify Identityは使用できます。

実際に試す場合は、レポジトリをForkして試してみてください。
ホスティングが終わると、Netlifyから払い出されたドメインでサイトが閲覧できるようになります。雑なページ＆本題ではないので掲載省略しますが、トップページはブログの一覧がでてきます。
通常はこの後でカスタムドメインやHTTPSをセットアップしますが、本題でありませんのでここでは実施しません。

## Netlify Identityを有効にする

デフォルトではNetlify Identityは無効化されています。
デプロイしたサイトの設定でNetlify Identityを有効にします。

![Enable Netlify Identity](https://i.gyazo.com/dc9ee4de8a07293bec1a05edf8c92405.png)

デフォルトは招待制ではなく、誰でもアカウント作成ができる状態(Open)となっていますので、招待制に変更します。
サイト設定(Site settings)からIdentityに進み、「Registration」で「Invite Only」を選択、保存します。

![Netlify - invite-only](https://i.gyazo.com/84b2e6ba81bd69fa573b0a32cce9ae0b.png)

また、外部認証サービスとしてGoogle認証を使用可能にしておきます。 サイト設定の「External Provider」からGoogleを選択します。

![Netlify - External Provider](https://i.gyazo.com/6cdb98631bbb59b22cf3f34135106ed6.png)

その後、Google認証の設定をカスタムするかを聞かれますが、ここではデフォルトの「Use default configuration」を選択します。

サイト上のソースコードでは、Netlify Identityの認証を動作させるために、`src/admin/index.html`にNetlify IdentityのWidgetを配置します。

```html
<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Netlify CMS</title>
  <!-- 以下を追加 -->
  <script type="text/javascript" src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>
</head>
<body>
  <script src="https://unpkg.com/netlify-cms@^2.0.0/dist/netlify-cms.js"></script>
</body>
</html>
```

これを配置するだけで、このページへのアクセス時には認証機能が動作するようになり、認証ユーザーのみがアクセス可能になります。
認証機能の実装は、比較的難易度が高い作業になりますので、かなり気持ちが楽になりますね。

:::column:認証ページをカスタマイズする
Widgetはある程度のカスタマイズは可能です、詳細はWidgetの[レポジトリ](https://github.com/netlify/netlify-identity-widget)を参照してください。
example配下には、ReactやVue.js、Svelteへの組み込み例もあります。

また、認証UIを自分で作成した場合は、Netlifyが開発するOSSの[gotrue-js](https://github.com/netlify/gotrue-js)を直接使うと、自由に認証ページを作成できます。
:::

これでNetlify Identityの基本設定は完了です。ユーザーの招待はメールテンプレートやGit Gatewayの設定が終わってから実施します。

## Netlify Identityのメールテンプレート設定

Netlify Identityのデフォルトでは、サイトのトップページ(/)を認証ページとして想定しています。ユーザーを招待すると、トップページに対してリンク（トークン付き）が張られた招待メールが送信されます。

Netlify CMSは/adminパス上で動作しますので、これでは正常に認証機能が動作しません。
メールテンプレートのリンクを修正する必要があります。
Netlify Identityでは、サイト上にカスタマイズしたメールテンプレートを配置することで、招待メールの内容をカスタマイズできます。

- [Netlify - Identity-generated emails](https://docs.netlify.com/visitor-access/identity/identity-generated-emails/#email-templates)

ここでは、レポジトリの[/src/admin/mail-templates](https://github.com/kudoh/netlify-cms-11ty-example/tree/feature/netlify-identity/src/admin/mail-templates)配下に、デフォルトのメールテンプレートをカスタマイズしたものを配置しました。
以下は招待メールのテンプレートの例ですが、他のテンプレートについてもドキュメントに従って作成しています。

{% raw %}
```html
---
templateEngineOverride: false
---
<h2>You have been invited</h2>

<p>
  You have been invited to create a user on {{ .SiteURL }}. Follow
  this link to accept the invite:
</p>
<p><a href="{{ .SiteURL }}/admin/#invite_token={{ .Token }}">Accept the invite</a></p>
```
{% endraw %}

ポイントはaタグの部分のhref属性です。ここで/adminパスを指定するようにします。それ以外(トークン等)はドキュメントに従って設定すれば問題ありませんでした。

このHTMLはサイトデプロイ時にそのまま配置されますので、後はこのパスをNetlify Identityに指定してあげます。
サイト設定の「Identity」 > 「Emails」に進み、各テンプレートのパスを指定します。
以下は招待メールの設定ですが、他のテンプレートも同じように指定しました。

![Netlify - Invitation mail template](https://i.gyazo.com/90c96db8a0330a82d14caa8a642803ba.png)

## Git Gatewayを有効にする

Netlify CMSはGitHubに対して、記事の投稿(ブランチ作成、コミット、プッシュ、プルリクエスト)や公開ブランチ(main)へのマージを行う必要があります。
しかし、CMSを利用するユーザーがGitHubアカウントを持っているとも限りません。

Netlifyでは[Git Gateway](https://docs.netlify.com/visitor-access/git-gateway/)というサービスを提供しています。
これを利用すると、Netlifyがユーザーに代わってこのGit操作を引き受けてくれます。

Git GatewayもNetlifyコンソールのサイト設定で行います。「Identity」から「Services」に進みGit Gatewayを有効にします。

![Netlify - Enable Git Gateway](https://i.gyazo.com/10238a6282230646d76d762a6237ccba.png)

「Enable Git Gateway」をクリックすると、GitHubの認証が実行されアクセストークンが発行されます。

アクセストークンの発行に成功すると、コンソール上は以下のようになります。
![Netlify - Git Gateway Success](https://i.gyazo.com/5448e627cfb1b1432d408718350e3700.png)

:::alert
Git Gatewayは現時点でベータ機能の位置づけです。実際に利用する際は最新の状況を確認してください。
:::

Netlify CMSのバックエンド設定も、以前はGitHubアカウントを使用するようにしていましたが、Git Gatewayを使用するように変更が必要です。
ここでは、[src/admin/config.yml](https://github.com/kudoh/netlify-cms-11ty-example/blob/feature/netlify-identity/src/admin/config.yml)を以下のように修正しています。

```yaml
backend:
  name: git-gateway
  branch: feature/netlify-identity

# 以下省略
```

`name`をgit-gatewayにし、対象ブランチを指定します(デフォルトはmasterになっています)。

## CMSユーザーを招待する

現在は誰も招待していないので、まだCMSは利用不可の状態です。ここでNetlifyコンソールのIdentityメニューよりCMSを利用するユーザーを招待します。

![Netlify - Invite user](https://i.gyazo.com/6cb3d10ea723bd6a654f39e9a04ca9e8.png)

招待ユーザーへは、以下のような招待メールが届きます。

![invitation mail](https://i.gyazo.com/87b9304123776e508c00bfe20a66f63e.png)

分かりにくいですが、これは先程カスタマイズしたメールテンプレートです。
メール本文のリンクをクリックすると、デプロイしたサイトの/adminパスに飛びます。

![Netlify Identity login](https://i.gyazo.com/98b3e70e87e8dd4247d6d8c592422bed.png)

認証ポップアップが出た状態になります。Googleによる認証も有効にしましたので、Netlify Identity独自のユーザーだけでなく、Googleでもログインできるようになっています。
どちらでも構いませんので、ログインすると以前のようにNetlify CMSによるコンテンツ管理ができるようになります。

![Netlify CMS](https://i.gyazo.com/2437dab7e5fffdc2007e02b595fd2bd9.png)

招待ユーザーはGitHubアカウントを持っている必要もありません。Git Gatewayが代わりにGitHub操作も担ってくれます。

## まとめ
ここではNetlify Identityを使って、サイトの一部ページを認証付きにする方法をご紹介しました。
Netlifyにホスティングしているサイトであれば、簡単な設定だけで、外部認証プロバイダを含めた認証機構が導入できるのは大きな魅力だなと感じました。
ただし、初期状態だと招待できるユーザーは5人までで、監査ログ等の機能も使用できませんでした。
それ以上は追加コストが必要なので、本格運用するには予算調整が別途必要そうですね。
