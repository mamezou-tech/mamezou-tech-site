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
1. 「Import an existing project」
1. 「GitHub」
1. GitHubログイン
1. レポジトリ選択
1. ブランチ名選択

最後のブランチ名は、feature/netlify-identityを選択します。mainブランチはNetlify Identity対応が含まれていませんので、後述の変更を別途入れる必要があります。

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

## Git Gatewayを有効にする

Netlify CMSはGitHubに対して、記事の投稿(ブランチ作成、コミット、プッシュ、プルリクエスト)や公開ブランチ(main)へのマージを行う必要があります。
CMSを利用するユーザーがGitHubアカウントを持っているとも限りません。

Netlifyでは[Git Gateway](https://docs.netlify.com/visitor-access/git-gateway/)というサービスを提供しています。
これを利用すると、Netlifyがユーザーに代わってこのGit操作を引き受けてくれます。
なお、Git Gatewayは現時点でベータ機能の位置づけです。実際に利用する際は最新の状況を確認してください。
