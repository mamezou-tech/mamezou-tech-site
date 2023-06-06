---
title: Stale Repos Action を使って GitHub オーガニゼーションの古いリポジトリをリストする
author: masahiro-kondo
date: 2023-06-07
tags: [GitHub, CI/CD]
---

## Stale Repos Action とは
Stale Repos Action は、GitHub オーガニゼーション内で一定期間更新のないリポジトリを検出するための Action です。ワークフローに組み込んで定期実行することで、古くなったリポジトリをリストアップし棚卸しできます。GitHub 公式の Action で v1.0 のリリースアナウンスがありました。

[Announcing the Stale Repos Action | The GitHub Blog](https://github.blog/2023-06-05-announcing-the-stale-repos-action/)

この Action は GitHub の Open Source Program Office (OSPO) によって開発され、OSS として公開されたようです。

:::info
自分の組織内で OSPO 組織を立ち上げて運営していくためのガイドは以下のリポジトリで OSS として公開されています。

[GitHub - github/github-ospo: Helping open source program offices get started](https://github.com/github/github-ospo)
:::

Stale Repos Action のリポジトリは以下です。

[GitHub - github/stale-repos: Find stale repositories in a GitHub organization.](https://github.com/github/stale-repos)

Marketplace のページは以下です。

[stale-repos - GitHub Marketplace](https://github.com/marketplace/actions/stale-repos)

:::info
リポジトリではなく、古い issue や PR を自動クローズする Action は以前からあります。

[Close Stale Issues - GitHub Marketplace](https://github.com/marketplace/actions/close-stale-issues)
:::

## 使ってみる

アナウンスのブログや Action の README にワークフローサンプルがありますので使うのは簡単でしょう。自社のオーガニゼーションのリポジトリにワークフローファイルを追加して試してみました。

{% raw %}
```yaml
name: stale repo identifier

on:
  workflow_dispatch:
  schedule:
    - cron: '0 0 1 * *'

jobs:
  build:
    name: stale repo identifier
    runs-on: ubuntu-latest

    permissions:
      contents: read
      issues: write
      repository-projects: read

    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Run stale_repos tool
      uses: docker://ghcr.io/github/stale_repos:v1
      env:
        GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        ORGANIZATION: mamezou-tech
        INACTIVE_DAYS: 365

    - name: Create issue
      uses: peter-evans/create-issue-from-file@v4
      with:
        title: Stale repository report
        content-filepath: ./stale_repos.md
        assignees: kondoumh
```
{% endraw %}

スケジュール起動では毎月1日の午前0時(UTC) に起動するようにしました。

Stale Repo Action は Docker Action です。Run stale_repos tool のステップで使用しています。環境変数 `ORGANIZATION` で指定されたオーガニゼーションで、`INACTIVE_DAYS` で指定された日数更新がないリポジトリを検出して stale_repos.md という Markdown ファイルに出力します。

後続ステップで create-issue-from-file Action を使って出力された Markdown ファイルから issue を作成します。この Action では作成した issue に `assignees` で担当者をアサインすることも可能です。

:::info
README のサンプルワークフローでは、リポジトリの read 権限を付与した PAT(Personal Access Token) を secret に格納して使用するようになっていました。PAT の発行や更新は面倒なので GITHB_TOKEN を使用しリポジトリや issue などへの permissions を付与する方法にしてみました。
:::

このワークフローを実行すると、ワークフローが格納されているリポジトリに issue が作成され非アクティブなリポジトリの一覧表が挿入されました。担当者もアサインされました。

![Stale repository report](https://i.gyazo.com/f7119467280ff497f4577f64f7c24e73.png)

とてもシンプルです。issue として起票されることで、対象リポジトリをアーカイブする、再度アクティブなものにしていくなどのアクションに繋げることができます。このように定期的に非アクティブなリポジトリに対する見直しをかけることが、オーガニゼーション内のリポジトリの鮮度を維持する上で役立ちます。

:::info
記事執筆時点では public なリポジトリしかリストアップされませんでしたが、private なリポジトリも対象にする PR が出ており、マージされていました。

[Allow private repos and update test by zkoppert · Pull Request #21 · github/stale-repos](https://github.com/github/stale-repos/pull/21)
:::

## 最後に

以上、GitHub の OSPO から公開された Stale repos Action の紹介でした。開発組織が大きくなりリポジトリの数が増えてくると、古い非アクティブなリポジトリが増えてメンテナンスコストだけが増大していきます。オーガニゼーション内のリポジトリの鮮度を保つためにもこういったレポーティングの仕組みは重要です。
