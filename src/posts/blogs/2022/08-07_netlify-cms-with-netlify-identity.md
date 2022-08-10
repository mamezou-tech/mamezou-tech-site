---
title: Netlify Identityを使ってNetlify CMSのユーザー認証をする
publishedPath: netlify-cms-with-netlify-identity
author: noboru-kudoh
date: 2022-08-10
permalink: "/blogs/{{ page.date | date: '%Y/%m/%d' }}/{{ publishedPath }}/"
tags:
  - post
  - 2022年
  - netlify
  - netlify-cms
---
前回は以下の記事で[Netlify CMS](https://www.netlifycms.org/)を使ったコンテンツ管理をご紹介しました。

- [Netlify CMSのワークフローでコンテンツ管理をする](/blogs/2022/08/03/netlifycms-workflow-intro/)

この記事ではGitHubのOAuth認証を使用して、ユーザーがブログ投稿をできるようにしました。
当サイトにおいても、記事の投稿をNetlify CMSでも作成、公開できるようにしました。この記事自体もNetlify CMSを使って作成しています。

CMSを使うのはいいですが、誰でも投稿できる状態は望ましくありません。
また、ケースによってはCMSを利用するユーザーがバックエンドのGitHubアカウントを持っていないこともあると思います。
このようなケースに対応してNetlifyでは[Netlify Identity](https://docs.netlify.com/visitor-access/identity/)という認証サービスがあります。
Netlify Identityは、認証機能のマネージドサービスで、独自のユーザー管理はもちろん、Google等の外部の認証サービスと連携可能です。AWSでいうCognitoユーザープールのようなものです。

- [Getting Started with JWT and Identity](https://www.netlify.com/blog/2018/01/23/getting-started-with-jwt-and-identity/)

Netlify Identity自体はNetlify CMS専用のサービスではなく、汎用的な認証サービスです。
例えば、Netlifyにホスティングしているサイトで特定のページは、社内ユーザー向けにしたいといったユースケースで使用できます。

今回はNetlify Identityを利用して、Netlify CMSのユーザー認証を有効にする方法をご紹介したいと思います。
対象とするサイトは、前回記事でローカル環境で動作確認したものです。
ここでは認証方式として、Googleアカウントを使用して、招待制(invite-only)でCMSを利用できるようにします。
また、Netlify CMSは/adminを使用しますので、このパスのみをNetlify Identityでの認証対象とし、それ以外(トップページ、公開ブログ)は誰でも参照できるようにします。

また、CMS利用者はGitHubアカウントがないケースを想定します。
完成形のGitHubレポジトリは以下に公開しています（フィーチャーブランチ）。

- <https://github.com/kudoh/netlify-cms-11ty-example/tree/feature/netlify-identity>

[[TOC]]

## Netlifyにサイトをデプロイする

まずは、前回構築したサイトをNetlifyにホスティングします[^1]。
Netlifyにログインし、既存のGitHubレポジトリを新規サイトとしてデプロイします。
Netlifyコンソールから以下のように選択して、ナビゲーションにしたがって進みます。

1. 「Add New site」
1. 「Import an existing project」選択
1. 「GitHub」クリック
1. GitHubログイン
1. レポジトリ選択
1. ブランチ選択(feature/netlify-identity)
1. 「Deploy site」クリック

ブランチ、feature/netlify-identityを選択します。mainブランチはNetlify Identity対応が含まれていませんので、後述の変更を別途入れる必要があります。

![Deploy Site](https://i.gyazo.com/7d9cf17aae4293818d9487ff1e59ef29.png)

Netlifyのサイトデプロイの詳細なやり方は、以下公式ドキュメントを参照してください。

- [Netlify - Import from an existing repository](https://docs.netlify.com/welcome/add-new-site/#import-from-an-existing-repository)

[^1]: サイトのデプロイにはNetlifyアカウントが必要になります。この記事ではProプランを契約しているものとして説明しますが、無料のStarterプランでもNetlify Identityは使用できます。

実際に試す場合は、レポジトリをForkして試してみてください。
ホスティングが終わると、Netlifyから払い出されたドメインでサイトが閲覧できるようになります。雑なページ＆本題ではないので掲載省略しますが、トップページは記事の一覧がでてきます。
通常はこの後でカスタムドメインを作成しますが、本題でありませんのでここでは対応しません。

## Netlify Identityを有効にする

デフォルトではNetlify Identityは無効化されています。
デプロイしたサイトの設定でNetlify Identityを有効にします。

![Enable Netlify Identity](https://i.gyazo.com/dc9ee4de8a07293bec1a05edf8c92405.png)

デフォルトは招待制ではなく、誰でもアカウント作成ができる状態(Open)となっています。これを招待制にしておきます。
サイト設定からIdentityに進み、「Registration」で「Invite Only」を選択して、保存します。

![Netlify - invite-only](https://i.gyazo.com/84b2e6ba81bd69fa573b0a32cce9ae0b.png)

また、外部認証サービスとしてGoogle認証を使用可能にしておきます。 サイト設定の「External Provider」からGoogleを選択します。

![Netlify - External Provider](https://i.gyazo.com/6cdb98631bbb59b22cf3f34135106ed6.png)

その後、Google認証の設定をカスタムするかを聞かれますが、ここではデフォルトの「Use default configuration」を選択します。

これでNetlify Identityの基本設定は完了です。ユーザーの招待はメールテンプレートやGit Gatewayの設定が終わってから実施します。

## Netlify Identityのメールテンプレート設定

デフォルトでは、サイトのトップページ(/)を認証ページと想定されています。このためユーザーを招待すると、招待メールが送信され、そのリンク先はトップページで、そこで認証を行うことになります。

このサイトではトップページではなく、CMSは/adminパス上で動作しますので、メールテンプレートをカスタマイズする必要があります。
Netlify Identityでは、サイト上にカスタマイズしたメールテンプレートを配置することで、招待メールの内容をカスタマイズ可能です。

- [Netlify - Identity-generated emails](https://docs.netlify.com/visitor-access/identity/identity-generated-emails/#email-templates)

ここでは、レポジトリの`/src/admin/mail-templates`配下にHTML形式でデフォルトメールテンプレートをカスタマイズしたものを配置しました。
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
サイト設定の「Identitiy」から「Emails」に進み、各テンプレートのパスを指定します。
以下は招待メールの設定ですが、他のテンプレートも同じように指定しました。

![Netlify - Invitation mail template](https://i.gyazo.com/90c96db8a0330a82d14caa8a642803ba.png)

## Git Gatewayを有効にする

Netlify CMSはGitHubに対して、記事の投稿(ブランチ作成、コミット、プッシュ、プルリクエスト)や公開ブランチ(main)へのマージを行う必要があります。
しかし、CMSを利用するユーザーがGitHubアカウントを持っているとも限りません。

Netlifyでは[Git Gateway](https://docs.netlify.com/visitor-access/git-gateway/)というサービスを提供しています。
これを利用すると、Netlifyがユーザーに代わってこのGit操作を引き受けてくれます。
なお、Git Gatewayは現時点でベータ機能の位置づけです。実際に利用する際は最新の状況を確認してください。

これについてもサイト設定で行います。「Identity」から「Services」に進みGit Gatewayを有効にします。

![Netlify - Enable Git Gateway](https://i.gyazo.com/10238a6282230646d76d762a6237ccba.png)

「Enable Git Gateway」をクリックすると、GitHubの認証が実行されアクセストークンが発行されます。

アクセストークンの発行に成功すると、コンソール上は以下のようになります。
![Netlify - Git Gateway Success](https://i.gyazo.com/5448e627cfb1b1432d408718350e3700.png)

## CMSユーザーを招待する

現在は誰も招待していないので、ここでコンソールのIdentityメニューよりCMSを利用するユーザーを招待します。

![Netlify - Invite user](https://i.gyazo.com/6cb3d10ea723bd6a654f39e9a04ca9e8.png)

招待ユーザーには以下のような招待メールが届きます。

![invitation mail](https://i.gyazo.com/ee7cad3ddd7f912aad699823501c5b1e.png)

リンクをクリックすると、デプロイしたサイトの/adminパスに飛びます。


## Netlify Identity設定の中身

## まとめ
