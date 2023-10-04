---
title: Actions permissions に GitHub Actions ワークフローに必要な最小限のパーミッションを教えてもらう
author: masahiro-kondo
date: 2023-06-28
tags: [GitHub, CI/CD]
---

## Actions Permissions

GitHub Actions のセキュリティのためのツール actions-permissions が public beta として公開されました。

[New tool to secure your GitHub Actions | The GitHub Blog](https://github.blog/2023-06-26-new-tool-to-secure-your-github-actions/)

2023年2月以前に作成された GitHub リポジトリにおいて、GitHub Actions ワークフロー実行時に発行されるアクセストークン(GITHUB_TOKEN)はデフォルトでリポジトリの読み取りと書き込みのフルパーミッションが与えられています[^1]。

![Workflow permissions default](https://i.gyazo.com/7a8efa6393ff2b0545ab7ae9db80e167.png)

[^1]: 2023年2月以降に作成されたリポジトリではデフォルトのパーミッションが読み取りのみに設定されています。[GitHub Actions - Updating the default GITHUB_TOKEN permissions to read-only | GitHub Changelog](https://github.blog/changelog/2023-02-02-github-actions-updating-the-default-github_token-permissions-to-read-only/)

セキュリティ向上のためにリポジトリの設定を変更すると既存のワークフローが動かなくなる可能性があります。そこで移行用の支援ツールとして公開されたのが、actions-permissions というわけです。

[GitHub - GitHubSecurityLab/actions-permissions: GitHub token permissions Monitor and Advisor actions](https://github.com/GitHubSecurityLab/actions-permissions)

このリポジトリでは 2つの GitHub Actions 用 Action が公開されています。

- GitHub token permissions Monitor action
- GitHub token permissions Advisor action

Permissions Monitor action をワークフローの step として追加することで、ワークフロー実行に必要な必要最小限のパーミッションをレポートしてくれます。これには利用している Action が要求するパーミッションも含まれます。必要最小限のパーミッションを把握しワークフローに明示的に指定することで、不要なパーミッションが付与されることなく、リポジトリのデフォルト設定もセキュアな状態にすることができます。

## Permissions Monitor の利用
わざとらしい例ですが、ファイルを作成してリポジトリに commit / push する以下のようなワークフローがあるとします。リポジトリへの push 操作を含むので、当然読み取り以上のパーミッションが必要となります。

```yaml
name: Commit and push

on: [workflow_dispatch]

jobs:
  Build:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3
    - run: |
        git config --global user.name "github-actions[bot]"
        git config --global user.email "github-actions[bot]@users.noreply.github.com"
        echo "Hello! now is $(date)" >> _artifacts/hello.txt
        git add _artifacts/hello.txt
        git commit -m "Add hello.txt"
        git push
```

以下のように、Permissions Monitor を実行するステップを追加します。

```diff
jobs:
  Build:
    runs-on: ubuntu-latest

    steps:
+   - uses: GitHubSecurityLab/actions-permissions/monitor@v1
+     with:
+       config: ${{ vars.PERMISSIONS_CONFIG }}
    - uses: actions/checkout@v3
    - run: |
        git config --global user.name "github-actions[bot]"
```

:::info
config の指定はなくてもデフォルト値が使用され動作するのですが、明示的に指定することが推奨されています。

[actions-permissions/monitor at main · GitHubSecurityLab/actions-permissions](https://github.com/GitHubSecurityLab/actions-permissions/tree/main/monitor#configuration)
:::

実行すると、必要なパーミッション情報を収集して Summary ページに反映してくれます。

![Run actions-permissions step](https://i.gyazo.com/3fdc3a5c2bcfffbbfc5af0d8793d49ab.png)


必要最小限のパーミッションが表示され、成果物としてもアップロードされます。このワークフローでは `contents: write` が必要でした。

![Summary](https://i.gyazo.com/3287966f53df89905a2df115417a4f70.png)

成果物の中身は JSON ファイルです。
```json
{"contents":"write"}
```

それでは、この情報に基づいてワークフローを修正します。
`permissions` フィールドに `contents: write` を追記して permissions/monitor の step を削除すれば完了です。

```diff
jobs:
  Build:
+   permissions:
+     contents: write

    runs-on: ubuntu-latest

    steps:
-   - uses: GitHubSecurityLab/actions-permissions/monitor@v1
-     with:
-       config: ${{ vars.PERMISSIONS_CONFIG }}
    - uses: actions/checkout@v3
    - run: |
        git config --global user.name "github-actions[bot]"
```

同じリポジトリのワークフロー全てに必要な修正を施せば、リポジトリのデフォルト設定を変更しても大丈夫です。

![Set default read only](https://i.gyazo.com/69a8eddfa10453ef44574abec0aba9ea.png)

## Permissions Advisor の利用
以下のワークフローをリポジトリに追加することで、リポジトリ内のワークフローファイルを指定して Advisor を手動で実行することができます。

[https://github.com/GitHubSecurityLab/actions-permissions/blob/main/advisor/workflow.yml](https://github.com/GitHubSecurityLab/actions-permissions/blob/main/advisor/workflow.yml)

過去に成功したワークフローのログを解析しているようで、何回分の実行結果を使用するか回数も指定します。

含まれる Node.js のスクリプトを使用するとローカルでも実行が可能です。

詳しくは README.md を参照してください。

[actions-permissions/advisor/README.md at main · GitHubSecurityLab/actions-permissions](https://github.com/GitHubSecurityLab/actions-permissions/blob/main/advisor/README.md)

筆者が管理しているいくつかのリポジトリで試してみましたが、特にアドバイス内容が得られなかったので実行結果の掲載は割愛します。

## 最後に
GitHub Actions でもセキュリティに気を遣う時代になりました。既存ワークフローの改修はコストがかかりますが、このようなツールを有効に利用して、推奨される設定で運用していきたいですね。
