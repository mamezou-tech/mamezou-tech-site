---
title: GitHub の外部サービス自動リンク参照で英数字の識別子が利用可能に
author: masahiro-kondo
date: 2022-09-02
tags: [GitHub]
---

GitHub の Pro/Team/Enterprise のアカウントでは、外部サービスへの自動リンク参照が利用できます。

Jira や Zendesk などの GitHub 以外のサービスで課題やインシデントを管理しているいるプロジェクトも多いでしょう。その場合、GitHub の issue、PR、コミットコメントに `JIRA#1` のように `プレフィクス<ID>` の形式で書くと自動でリンクしてくれる機能です。課題やインシデントを追跡する上で役立ちます。

7月に自動リンク参照で英数字による識別子がサポートされました。

[Autolinks with alphanumeric IDs | GitHub Changelog](https://github.blog/changelog/2022-07-01-autolinks-with-alphanumeric-ids/)

これにより、リンク先サービスのチケット ID 体系が英数字の場合にも対応できます。

:::info
7月時点では、自動リンクを新規作成するときに、英数字の識別子しか選べなかったのですが、顧客のフィードバックを受けて、現在は英数字と数字のみを選択できるようになっています。

[Autolinks with alphanumeric or numeric IDs | GitHub Changelog](https://github.blog/changelog/2022-08-31-autolinks-with-alphanumeric-or-numeric-ids/)
:::

自動リンク参照を追加するには、リポジトリ設定の `Autolink references` タブで `Add autolink reference` をクリックします。

![自動リンク設定追加ボタン](https://i.gyazo.com/75182e9d34e3b5619ec6d1d878189d72.png)

自動リンク参照の設定追加画面です。参照先のサービスの採番体系が `Alphanumeric` か `Numeric` かを選択します。Jira の場合、`<プロジェクトID>-<番号>` の体系なので `Alphanumeric` を選択。自動リンクを発動させる `Reference prefix` は、`JIRA-` にしました。`Target URL` には、Jira のチケットの URL を `<num>` というテンプレートを入れて指定します。

![Jiraへのリンクを追加](https://i.gyazo.com/34c7f2651a38639192d521c24aac2ddf.png)

`Add autlink reference` をクリックすると自動リンク参照が追加されます。

![追加されたリンク参照](https://i.gyazo.com/68753c512c49c0018d35e909f8ebe74e.png)

自動リンク参照設定を行なったリポジトリで、issue の作成画面を開き、`JIRA-<ID>` の形式で書きます。

![issueの編集](https://i.gyazo.com/dbb01d15868de7f913a11c9f7d72a3c9.png)

プレビューすると、リンクになっています。

![issueのプレビュー](https://i.gyazo.com/7ee8f91794779535179654fd16fc1946.png)

リンクを踏むとあらかじめ登録していた Jira のタスクが開きました[^1]。

[^1]: GitHub と Jira をシステム的にリンクしているわけではないので、この GitHub issue を更新しても、Jira のチケットには何も影響しません。

![参照先のJiraのタスク](https://i.gyazo.com/a4b422db622fe02a7648a798475c92aa.png)

以上のように、GitHub 以外のサービスを使って、ストーリー・タスク・インシデントなどを管理している場合、そのサービスの採番体系に合わせた自動リンク参照の設定が可能なため、URL をフルで貼る必要がなくなります。
