---
title: Netlify CMSをNetlify Identityを使って認証する
publishedPath: netlify-cms-with-netlify-identity
author: noboru-kudoh
date: 2022-08-11
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
ただし、ケースによってはCMSを利用するユーザーがGitHubアカウントを持っていないこともあると思います。
このようなケースに対応してNetlifyでは[Netlify Identity](https://docs.netlify.com/visitor-access/identity/)という認証サービスがあります。
Netlify Identityは、認証機能のマネージドサービスで、独自の認証機構はもちろん、Google等の外部の認証サービスと連携可能です。

- [Getting Started with JWT and Identity](https://www.netlify.com/blog/2018/01/23/getting-started-with-jwt-and-identity/)

Netlify IdentityはNetlify CMS専用のサービスではなく、汎用的な認証サービスです。例えば、Netlifyにホスティングしているサイトで特定のページは社内ユーザー向けのページにしたいといってユースケースで使用できます。

今回はNetlify Identityを利用して、Netlify CMSのユーザー認証を有効にする方法をご紹介したいと思います。
対象とするサイトは前回構築して、ローカル環境で動作確認したものです。GitHubレポジトリは以下に公開しています。

- <https://github.com/kudoh/netlify-cms-11ty-example>

[[TOC]]

## Netlify Identityを有効にする

前回構築したサイトをNetlifyにホスティングします。
Netlifyにログインし、新規サイトをデプロイします。詳細なやり方は、以下公式ドキュメントを参照してください。

- [Netlify - Import from an existing repository](https://docs.netlify.com/welcome/add-new-site/#import-from-an-existing-repository)

実際に試す場合はレポジトリをForkして試してみてください。
ホスティングが終わるとNetlifyで生成されたドメインでサイトが閲覧できるようになっているはずです。

デフォルトではNetlify Identityは無効化されています。
事前にNetlify管理コンソールのサイト設定よりNetlify Identityを有効にします。

![enable netlify identity](https://i.gyazo.com/dc9ee4de8a07293bec1a05edf8c92405.png)

## Git Gatewayを有効にする

