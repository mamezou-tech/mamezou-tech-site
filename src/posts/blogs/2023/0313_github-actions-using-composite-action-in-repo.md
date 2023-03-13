---
title: GitHub Actions ワークフローのコードをリポジトリ内 Composite Action で共有する
author: masahiro-kondo
date: 2023-03-13
tags: [CI/CD, GitHub]
---

GitHub Actions ワークフローで、job を構成する step を Composite Action に切り出し、同一リポジトリの複数のワークフローで共有することが可能です。この記事ではこのようなリポジトリ内 Action の作成方法とメリットを紹介します。

## リポジトリ内 Action とは
GitHub Actions の Action は、独立したリポジトリに配置して複数リポジトリのワークフローから利用するものです。

![share action over repos](https://i.gyazo.com/49e83112c1635b358bae86dda3664667.png)

一方、独立した(専用の)リポジトリではなくプロダクトコードを管理する単一のリポジトリ内に Action を配置し、リポジトリ内の複数のワークフローから利用するという使い方もできます。

![share action in repo](https://i.gyazo.com/b36acb5f8c39ec72db1a9bd7602a1522.png)

リポジトリ内 Action (In-repo action) とでもいうところですが、筆者は便宜的に local action と呼んでいます(リポジトリのローカルにあるという意味で)。

## 対象のワークフロー

今回、複数のワークフローでテスト環境を構築する step を共通化するためにリポジトリ内 Action を利用しました。対象のワークフローは単一の job で構成されており、大まかに次の流れになっています。

```mermaid
flowchart LR
    A[環境構築] --> B[アプリインストール] --> C[テスト実行]
```

- 環境構築
  - GitHub Actions Runner の VM 上に Minikube で Kubernetes クラスターを作成
  - Kubernetes クラスターに MySQL などの基盤系のソフトウェアインストール、テスト用データベース作成
  - GitHub の private なコンテナレジストリからイメージを pull するために secret を作成
  - etc.
- アプリインストール
  - 構築された Kubernetes 環境にテスト対象のアプリの Pod を起動
- テスト実行
  - E2E テストの実行

ワークフローファイルを抜粋すると次のようになります。

{% raw %}
```yaml
on:
  pull_request

jobs:
  end-to-end-test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v3

      # 環境構築 (Action 化する部分)
      - name: Start Minikube
        run: minikube start
      - name: Create namespace for test
        run: kubectl create ns e2e-test
      - name: Install MySQL
        run: |
          helm repo add bitnami https://charts.bitnami.com/bitnami
          helm install test-db bitnami/mysql -n e2e-test -f ./mysql/values.yml
      - name: Setup database
        run: |
          kubectl -n e2e-test cp ./mysql/setup.sql test-db-mysql-0:/opt/bitnami/
          kubectl -n e2e-test exec -i test-db-mysql-0 -- bash << 'EOC'
            mysql -u test-user -p test < /opt/bitnami/setup.sql 
          EOC
      - name: Create secret for GitHub container registry
        run: |
          kubectl -n e2e-test create secret container-registry regcred \
            --docker-server=https://ghcr.io \
            --docker-username=${{ github.actor }} \
            --docker-password=${{ secrets.GITHUB_TOKEN }}
      # 以降も構築 step が続く

      # アプリインストール
      - name: Install App
        run: kubectl -n e2e-test apply -f app-deployment.yml

      # テスト実行
      - name: Run test
      # 以下テストシナリオの実行 step が続く
```
{% endraw %}

MySQL などは Helm Chart でインストールしています。Helm Chart の設定を記述する values.yaml や データベース構築用 DDL/DML を記述した setup.sql など、リポジトリ内のファイルを使用しています。

当初、アプリインストール以降の step で strategy.matrix[^1] を利用して、テストシナリオ毎に E2E テストの job を並列で実行していました。その後テスト実行のパターンが増えて、matrix ではなく別ワークフローとして定義した方がよいケースが出てきため、環境構築部分を再利用する方法を検討しました。

[^1]: Matrix の利用については、「[ジョブにマトリックスを使用する - GitHub Docs](https://docs.github.com/ja/actions/using-jobs/using-a-matrix-for-your-jobs)」を参考にしてください。

ワークフローのコードを利用する標準的な手段としては以下があります。

- 独立した Action
- 再利用可能ワークフロー (Reusable workflows)

これらは以下のような特徴(制約)があります。

- 独立した Action
  - 呼び出すワークフローのコンテキストで実行されるため Action Runner の VM に対する変更(環境構築)はその後の step でも引き継がれる
  - 専用のリポジトリに配置する必要がある
  - 利用側のリポジトリに依存しない汎用的な機能を提供する
  - private リポジトリに配置する場合、他のリポジトリからのアクセス許可設定が必要
- 再利用可能ワークフロー
  - 呼び出し元のワークフローからは呼び出し先の Actions Runner の VM を使用できない
  - private リポジトリに配置する場合、他のリポジトリからのアクセス許可設定が必要

特に、再利用可能ワークフローの場合は、job 単位のワークフロー再利用であり、呼び出し先の Action Runner の VM で環境構築しても、呼び出し元から構築した環境を利用できません。
今回は、呼び出し側のコンテキストで実行される Action を選択しました。そして、独立したリポジトリではなく利用するリポジトリ内に配置するというやや変則的な構成にしました。

:::info
今回は、GitHub Action Runner の VM に Minikube で環境を構築しているため、再利用可能ワークフローは使えませんでした。Amazon EKS などの外部の Kubernetes 環境を構築してテストに利用するようなケースでは、job の実行環境が呼び出し元と分離していても問題ないため、再利用可能ワークフローを使用できます。
再利用可能ワークフローについては以下の記事で紹介しています。

- [GitHub Actions - 再利用可能ワークフローを使う](/blogs/2022/03/08/github-actions-reuse-workflows/)
- [GitHub Actions - 再利用可能ワークフローと手動トリガーで入力値の扱いを統一](/blogs/2022/06/11/github-actions-inputs-unified/)
- [GitHub Actions - 再利用可能ワークフローでネスト呼び出しと Matrix strategy が解禁](/blogs/2022/08/25/github-actions-reusable-workflow-renewal/)
- [GitHub Actions - private リポジトリの Action と再利用可能ワークフローが呼び出しが可能に](/blogs/2022/12/24/sharing-private-actions-and-reusable-workflows/)
:::

## Composite Action への切り出し
ワークフローの環境構築部分を Action として切り出しました。以下のように、Composite Action の定義 action.yml を local-action ディレクトリに配置しました。1ファイルなのでルートに配置してもいいのですが、ワークフローでの指定の分かりやすさのためにディレクトリを掘っています。

```shell
.
├── .github
│   └── workflows # Action を利用するワークフローファイル
│       ├── e2e-test1.yml
│       └── e2e-test2.yml
├── local-action
│   └── action.yml # Composite Action 定義
├── mysql
│   ├── setup.sql # データベース構築用 SQL
│   └── values.yaml # MySQL の Helm Chart 設定
└── src # プロダクトコード
```

Action 定義 (action.yml) の抜粋です。

- local-action/action.yml
{% raw %}
```yaml
name: 'Setup test environment'

description: 'Setup test environment on Minikube'
inputs:
  action-token:
    description: 'workflow token'
    required: true

runs:
  using: "composite"
  steps:
    - name: Start Minikube
      run: minikube start
      shell: bash
    - name: Create namespace for test
      run: kubectl create ns e2e-test
      shell: bash
    - name: Install MySQL
      run: |
        helm repo add bitnami https://charts.bitnami.com/bitnami
        helm install test-db bitnami/mysql -n e2e-test -f ./mysql/values.yml
      shell: bash
    - name: Setup database
      run: |
        kubectl -n e2e-test cp ./mysql/setup.sql test-db-mysql-0:/opt/bitnami/
        kubectl -n e2e-test exec -i test-db-mysql-0 -- bash << 'EOC'
          mysql -u test-user -p test < /opt/bitnami/setup.sql 
        EOC
      shell: bash
    - name: Create secret for GitHub container registry
      run: |
        kubectl -n e2e-test create secret container-registry regcred \
          --docker-server=https://ghcr.io \
          --docker-username=${{ github.actor }} \
          --docker-password=${{ inputs.action-token }}
      shell: bash
    # 以降も構築 step が続く
```
{% endraw %}

Action では secret を扱えないため inputs の `action-token` でパラメータとして受け取るようにしています。
steps の定義は元のワークフローとほぼ同じで、各 step に `shell: bash` の1行を追加するだけです。

ここで、Action の step 内で元のワークフロー定義と同じように values.yaml や setup.sql を利用していることに気付かれた方もいるでしょう。Action 実行時は、ワークフロー実行時と同様、ルートディレクトリからの相対パスでリポジトリ内のファイルを指定可能です。独立した Action の場合、全て inputs 経由で渡す必要がありますが、リポジトリ内に配置して実行するため、呼び出し側のコンテキストと密結合にすることができます。

:::info
Composite Action (複合アクション)は、GitHub Actions ワークフローと同じ構文で Action を実装できる技術です。詳細は公式ドキュメントを参照してください。

[複合アクションを作成する - GitHub Docs](https://docs.github.com/ja/actions/creating-actions/creating-a-composite-action)
:::

利用側のワークフローです。ローカルパス `./local-action` を指定して Action を実行しています。`with` で GITHUB_TOKEN を渡します。

- .github/workflows/e2e-test1.yml
{% raw %}
```yaml
on:
  pull_request

jobs:
  end-to-end-test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Build environment
        uses: ./local-action
        with:
          action-token: ${{ secrets.GITHUB_TOKEN }}

      - name: Install App
        run: kubectl -n e2e-test apply -f app-deployment.yml
      - name: Run test
      # 以下テスト実行 step が続く
```
{% endraw %}

## まとめ
以上、GitHub Actions ワークフローの step を切り出してリポジトリ内の Composite Action として再利用する方法を紹介しました。

Action は再利用可能性の高い部品として作成するものですが、ワークフローの step を切り出したような Action は、他のリポジトリから再利用できるものでもないため、利用するリポジトリ内に配置して問題ないでしょう[^2]。

[^2]: リポジトリが無駄に増えてしまうこともありませんし。

リポジトリ内 Action のデメリットとしては以下が挙げられます。

- Action 部分はワークフロー実行画面に詳細が事前に表示されない
- Action のシンタックスエラーが実行時エラーでしか検出できない[^3]

[^3]: よく考えると Composite Action 開発時の制約でもあります。

とはいえ、既存の step を切り出して作ると考えると、実行に耐えてきたものを流用するのでさほど問題にならないと思います。
