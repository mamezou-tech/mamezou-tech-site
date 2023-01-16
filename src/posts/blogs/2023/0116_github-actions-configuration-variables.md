---
title: GitHub Actions - 構成変数(環境変数)が外部設定できるようになったので用途を整理する
author: masahiro-kondo
date: 2023-01-16
tags: [GitHub, CI/CD]
---

GitHub Actions ワークフローで Configuration variables (構成変数) がサポートされました。

[GitHub Actions - Support for configuration variables in workflows | GitHub Changelog](https://github.blog/changelog/2023-01-10-github-actions-support-for-configuration-variables-in-workflows/)

## 従来の環境変数とシークレット
従来もワークフローファイルに `env` キーワードで環境変数を宣言することはできましたが、ハードコーディングだしワークフローファイル内でしか利用できません[^1]。API Key などの機密情報はシークレットとして外部から設定できます。シークレットはいったん設定してしまうと値を見ることはできないし変更もできない[^2]ため、変数として使うには適していません。ということで、外部から設定可能な環境変数は GitHub Action 登場当初から「なぜないんだろう？」と思っていた機能です。

[^1]: ワークフローファイルに書く env 変数のスコープは、ワークフロー単位・ジョブ単位・ステップ単位の3レベルがあります。
[^2]: 再作成することはできます。

## 構成変数の種類
先にまとめてしまうと構成変数には以下のような種類があります。

|名称|スコープ|用途|
|:--|:--|:--|
| Organization variables | オーガニゼーション内の全リポジトリの全ワークフローから参照可能[^3] | オーガニゼーション全体で利用する値 |
| Repository variables   | リポジトリ内の全てのワークフローから参照可能 | リポジトリ全体で利用する値 |
| Enveronments variables | リポジトリ内の全てのワークフローが特定環境用に実行される際に参照可能 | リポジトリで定義した環境によって値を変える |

[^3]: 参照可能なリポジトリを選択することもできます。

一番使うのがリポジトリ単位の変数 Repository variables でしょう。Enveronments variables は development、production などのデプロイターゲットに応じて値を変えたい変数がある場合に利用します。

[Variables - GitHub Docs](https://docs.github.com/en/actions/learn-github-actions/variables#defining-configuration-variables-for-multiple-workflows)

:::alert
構成変数はプレーンテキストとして管理されます。機密情報は従来通りシークレットの方で管理します。
:::

## オーガニゼーションレベルの構成変数
まず、オーガニゼーションレベルの構成変数(Organization variables)の設定です。

オーガニゼーションの Settings > Security > Secrets and variables > Actions を開きます。

![Organization settings](https://i.gyazo.com/bcac80e78457e9768ac82f7b6609918d.png)

`Secrets` に並んで `Variables` のタブが追加されています。

![New organization variables](https://i.gyazo.com/6f78de3c663675d06acc8559048107ea.png)

`New organization variable` をクリックして構成変数追加画面を開き、`Name` と `Value` を入力し、`Add variable` をクリックします。

![Add organization variable](https://i.gyazo.com/b47ab7e9e76b9176b90dd102700735e6.png)

追加済みの構成変数は値とともに参照できます。

![Added organization variable](https://i.gyazo.com/ccf4c0599a06f142da779a6ad3292dc1.png)

## リポジトリ単位の構成変数
次にリポジトリ単位の構成変数(Repository variables)です。

リポジトリの Settings > Security > Secrets and variables で Variables タブを開くと構成変数の画面が開きます。設定済みのオーガニゼーションレベルの変数も参照できます。

![Repository settings](https://i.gyazo.com/a60231c1834254651bb61f8ef9fdbf5c.png)

`New repository variable` をクリックすると、変数追加画面が開きますので、`Name` と `Value` を入力して `Add variable` をクリックします。

![New repository variable](https://i.gyazo.com/41539c9d8d050bd2d84d189548a8d034.png)

追加済みの変数が値と共に表示されます。

![Added repository variable](https://i.gyazo.com/493b42ceba0a1644751930468a519200.png)

## 環境変数の定義
最後はリポジトリの環境(Environments)単位の変数(Environment variable)です。

Environments はデプロイターゲットを記述するために使用され、Environments ごとに保護ルールとシークレット・構成変数を設定可能です。保護ルールを使うと、Environments を参照するジョブで承認を要求する、特定のブランチに制限するなどの条件を指定できます。詳細はドキュメントを参照してください。

[Using environments for deployment - GitHub Docs](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)

:::info
Environments は public リポジトリと有償プランの private リポジトリで利用できますが、無償プランの private リポジトリでは利用できないようです。
:::

まず、環境の定義からです。リポジトリの Settings > Environments を開き、`New environment` をクリックします。

![Manage environments](https://i.gyazo.com/aa4a48a4d387043f6365421322ade58f.png)

Environments の追加画面が開きますので、`Name` を入力して、`Configure environment` をクリックします。

![Add environment](https://i.gyazo.com/46e45543f06dbce821ab4a9c7f58b258.png)

Environment の構成画面が開きます。ここで、環境用のブランチ、シークレット、環境変数の追加ができます。`Add variable` をクリックします。

![Configure environment](https://i.gyazo.com/ddb4fbc2a233bb5efc0e9403e8637b53.png)

変数追加画面が開くので、`Name` と `Value` を入力して `Add variable` をクリックします。

![Add variable for environment](https://i.gyazo.com/e3c6dce73065c24152ca8b3a74edfc0d.png)

追加された変数は値と共に参照できます。

![Added variable for environment](https://i.gyazo.com/f4e9beac6a0e9f2c45ba97fc67196a9b.png)

development と同様に、staging や production の環境も追加しました。

![Three environments](https://i.gyazo.com/bcca6b6584ce1432b41bca8a17b417d7.png)

Actions variables の画面では、全ての Environment variables が値と共に参照できます。

![Added variable for each environment](https://i.gyazo.com/2c07729424e1646b84fc7bff6c42ec3e.png)

## ワークフローからの構成変数の利用
では定義した構成変数をワークフローから利用してみましょう。以下のようなワークフローファイルを用意しました。

{% raw %}
```yaml
name: Show variables

on:
  workflow_dispatch:
    inputs:
      deployment_target:
        description: 'Deployment target'
        required: true
        default: 'development'
        type: choice
        options:
        - development
        - staging
        - production

jobs:
  display-variables:
    runs-on: ubuntu-latest
    environment: ${{ inputs.deployment_target }}
    steps:
    - name: Use variables
      run: |
        echo "Organization variable : ${{ vars.ORG_NAME }}"
        echo "Repository variable : ${{ vars.PLATFORM_VERSION }}"
        echo "Environment variable : ${{ vars.SERVICE_URL }}"
```
{% endraw %}

手動実行の入力パラメータとして、ターゲットのデプロイ先(development、staging、production)を選択するようにしました。ここで選択されたターゲットはジョブの `environment` に設定され、デプロイ先に応じた変数が参照されます。ジョブのステップでは、オーガニゼーションレベル、リポジトリ単位、環境単位の変数を表示しています。変数は `vars` コンテキストから取り出すことができます。

このワークフローを実行すると、Deployment target のセレクトボックスが表示されます。

![Select target](https://i.gyazo.com/de189a853f4070a0e64510bea2020241.png)

staging を選択して実行しました。

![Run for staging](https://i.gyazo.com/74a816d881406ce6ad157285b7036d4a.png)

実行結果です。各レベルで設定した変数が出力されています。

![Workflow run result](https://i.gyazo.com/48a8c781e8dc6d592fbc69f95d4aac43.png)

## 最後に
以上、GitHub Actions で使えるようになった構成変数を試しました。特に難しいところはないと思います。リポジトリの Environments に関してはこれまでその存在を意識していませんでした。従来は専用の CD ツールやワークフロー内部で扱っていたようなブランチルール、シークレット、環境変数を管理できるようになっていました。
