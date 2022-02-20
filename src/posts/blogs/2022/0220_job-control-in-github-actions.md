---
title: GitHub Actions ワークフローにおけるジョブ制御
author: masahiro-kondo
date: 2022-02-20
tags: [CI/CD]
---

GitHub Actions ワークフローでは、複数のジョブを順次・並列・条件実行できます。各ジョブは異なるマシン(Runner) もしくは コンテナイメージで実行されます。それぞれ具体的に見ていきましょう。

[[TOC]]

:::info
本記事は、以下のブログ記事を再編・追記したものです。
[GitHub Actions ワークフローで複数のジョブ実行を制御する - kondoumh のブログ](https://blog.kondoumh.com/entry/2021/01/22/133427)
:::

## 順次実行 (シーケンシャル)

```mermaid
flowchart LR
   Build1 --> Build2
```

何も指定しなければ、ジョブは並列に実行されます。順次実行するには、`needs` キーワードで、先行のジョブを指定します。

```yaml
name: Sequential Jobs
on:
  push:

jobs:
  Build1:
    runs-on: ubuntu-latest
    steps:
    - run: echo Build1

  Build2:
    runs-on: ubuntu-latest
    needs: Build1
    steps:
    - run: echo Build2
```
ワークフロー実行結果です。

![](https://i.gyazo.com/dedaa456ce34322dba9e7ff58d79b367.png)

## 並列実行 (フォーク)
```mermaid
flowchart LR
   Setup --> Build1 & Build2
```
ジョブを実行後に複数のジョブを並列実行するには、各ジョブの `needs` に分岐元のジョブを指定します。

```yaml
name: Fork Jobs
on:
  push:

jobs:
  Setup:
    runs-on: ubuntu-latest
    steps:
    - run: echo Setup

  Build1:
    runs-on: ubuntu-latest
    needs: Setup
    steps:
    - run: echo Build1

  Build2:
    runs-on: ubuntu-latest
    needs: Setup
    steps:
    - run: echo Build2
```

ワークフロー実行結果です。

![](https://i.gyazo.com/699047a74befdac4912323a27bbcc33a.png)

## 並列実行 (ジョイン)

```mermaid
flowchart LR
   Build1 --> Teardown
   Build2 --> Teardown
```

並列ジョブをジョインして最終の処理を行うには `needs` にジョインしたいジョブを列挙します。

```yaml
name: Join Jobs
on:
  push:

jobs:
  Build1:
    runs-on: ubuntu-latest
    steps:
    - run: echo Build1

  Build2:
    runs-on: ubuntu-latest
    steps:
    - run: echo Build2

  Teardown:
    runs-on: ubuntu-latest
    needs: [Build1, Build2]
    steps:
    - run: echo Teardown
```

ワークフロー実行結果です。

![](https://i.gyazo.com/346d7b6fa407f95113ab0ec1dea551d9.png)

## フォークとジョインの組合せ
```mermaid
flowchart LR
   Build --> TestA & TestB
   TestA --> Deploy
   TestB --> Deploy
```

CI でビルド後に複数のテストを並列実行して成功したらデプロイするような例です。

```yaml
name: Deploy
on:
  push:

jobs:
  Build:
    runs-on: ubuntu-latest
    steps:
    - run: echo Build

  TestA:
    runs-on: ubuntu-latest
    needs: Build
    steps:
    - run: echo Test A

  TestB:
    runs-on: ubuntu-latest
    needs: Build
    name: Run Test B
    steps:
    - run: echo Test B

  Deploy:
    runs-on: ubuntu-latest
    needs: [TestA, TestB]
    steps:
    - run: echo Deploy
```

ワークフロー実行結果です。

![](https://i.gyazo.com/b701cfda64e8082ce6f97e2754394e4b.png)

## 条件実行 (コンディション)

ワークフローの成功・失敗を最後に通知するような例です。

```mermaid
flowchart LR
    A[Deploy] --> B{result?};
    B -->|success| C[Notify succeed];
    B -->|fail| D[Notify failure];
```

GitHub Actions ではワークフローの状態は内包するジョブの失敗・成功に依存します。1つでもジョブが失敗していれば、ワークフローの状態は失敗です。ワークフローの状態は success / failure などの関数で取得できるため、`if` 条件文でジョブの実行条件を指定します。

{% raw %}
```yaml
  Deploy:
    runs-on: ubuntu-latest
    needs: [TestA, TestB]
    steps:
    - name: Deploy
      run: echo Deploy

  Notify_succeed:
    if: ${{ success() }}
    runs-on: ubuntu-latest
    needs: Deploy
    steps:
    - name: Notify to Slack channel
      uses: rtCamp/action-slack-notify@v2
      env:
        SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK_URL }}
        SLACK_USERNAME: GitHUb Actions
        SLACK_TITLE: Workflow Succeeded
        SLACK_ICON: https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png
        SLACK_MESSAGE: 'Run number : #${{ github.run_number }}'

  Notify_failure:
    if: ${{ failure() }}
    runs-on: ubuntu-latest
    needs: Deploy
    steps:
    - name: Notify to Slack channel
      uses: rtCamp/action-slack-notify@v2
      env:
        SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK_URL }}
        SLACK_USERNAME: GitHUb Actions
        SLACK_TITLE: Workflow failed
        SLACK_ICON: https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png
        SLACK_COLOR: danger
        SLACK_MESSAGE: 'Run number : #${{ github.run_number }}'
```
{% endraw %}

Notify_succeed ジョブと Notify_failure ジョブで、通知内容を結果に応じてタイトルに設定しています。GitHub Actions のビルド番号を `github.run_number` という組み込みの変数で取得して Slack のメッセージに出力しています。


Slack への通知に、以下の Action を利用しました。

[Slack Notify - GitHub Marketplace](https://github.com/marketplace/actions/slack-notify)

ワークフロー成功時の実行結果です。

![](https://i.gyazo.com/204a68f8bb90df5c0a118bf67f22edf0.png)

Slack への通知例です。

![](https://i.gyazo.com/db186019607396e7e15710531dae9b5a.png)

ワークフロー失敗時の実行結果です。TestB が失敗したので Deploy はスキップされ、失敗通知が実行されました。

![](https://i.gyazo.com/c1de37b07cd2b1ed58043f9ca5cb72e9.png)

Slack への通知例です。

![](https://i.gyazo.com/71f9c464a215f9b0ed209988d9e8e875.png)

ワークフローの成功・失敗に関わらず何らかのジョブを実行したい場合は、always 関数を使って以下のように定義できます。

{% raw %}
```yaml
  Run_always:
    if: ${{ always() }}
    runs-on: ubuntu-latest
```
{% endraw %}