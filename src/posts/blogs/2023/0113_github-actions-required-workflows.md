---
title: GitHub Actions - オーガニゼーションレベルの required workflows (public beta) を試す
author: masahiro-kondo
date: 2023-01-13
tags: [GitHub, CI/CD]
---

GitHub Actions の required workflows が public beta として公開されました。

[GitHub Actions - Support for organization-wide required workflows public beta | GitHub Changelog](https://github.blog/changelog/2023-01-10-github-actions-support-for-organization-wide-required-workflows-public-beta/)

## required workflows の概要
オーガニゼーション内のリポジトリで Pull Request が作成された時に特定のワークフローの実行を強制する機能です。GitHub の紹介ブログによると以下のようなセキュリティ・品質・統制などのユースケースを想定しているようです。

- セキュリティ: 外部の脆弱性スコアリングまたは動的分析ツールを起動する
- コンプライアンス: すべてのコードが企業の品質基準を満たしていることを確認する
- デプロイ: コードが標準的な方法でCD(継続的デプロイ)されるようにする

[Introducing required workflows and configuration variables to GitHub Actions | The GitHub Blog](https://github.blog/2023-01-10-introducing-required-workflows-and-configuration-variables-to-github-actions/)

上記のユースケースを実現するために全てのワークフローファイルに同じステップを追加するのではなく、1つのリポジトリに集約して CI/CD パイプラインのコード重複を無くし実行漏れを防ぐのが required workflows です。

required workflows のドキュメントは以下にあります。

[Required workflows - GitHub Docs](https://docs.github.com//en/actions/using-workflows/required-workflows)

:::info
GitHub の日本語ドキュメントではまだ訳出されていませんが、required workflows は「必須ワークフロー」と呼べばよいでしょうか。

required workflows はオーガニゼーション内の他のリポジトリから利用されるという点では reusable workflow(再利用可能ワークフロー)と似ています。

再利用可能ワークフローについては以下の記事で紹介しています。

- [GitHub Actions - 再利用可能ワークフローを使う](/blogs/2022/03/08/github-actions-reuse-workflows/)
- [GitHub Actions - 再利用可能ワークフローと手動トリガーで入力値の扱いを統一](/blogs/2022/06/11/github-actions-inputs-unified/)
- [GitHub Actions 再利用可能ワークフローでネスト呼び出しと Matrix strategy が解禁](/blogs/2022/08/25/github-actions-reusable-workflow-renewal/)
:::

## required workflows 用リポジトリの作成
まずオーガニゼーション内に required workflows 専用のリポジトリを作成します。ここでは `required-workflows` というそのままの名前で作成しました。今回リポジトリの可視性は private にしましたが問題なく使えました。

このリポジトリの設定でオーガニゼーション内の他のリポジトリからのアクセスを許可する必要があります。リポジトリの Settings > Actions > General と開きます。

![required workflow repo settings](https://i.gyazo.com/106b9ecfbca3d36a9ff61bb2b1d77245.png)

`Access` セクションで `Accessible from repositories in the xx organization` を選択して `Save` をクリックします。

![Accessible from repos](https://i.gyazo.com/3a38ef39e6b202fbd96fd15a3b33e034.png)

:::info
この設定は再利用可能ワークフロー用のリポジトリの設定と共通です。以下の記事を参照してください。

- [GitHub Actions - private リポジトリの Action と再利用可能ワークフローが呼び出しが可能に](/blogs/2022/12/24/sharing-private-actions-and-reusable-workflows/)
:::

次に required workflow の作成です。required workflows は、通常のワークフローファイルの格納場所である `.github/workflows` 以外の任意のフォルダにも配置できます。今回は flows というフォルダを作って格納することにしました。以下のようにライセンスファイルの存在をチェックする簡単なワークフローを書きました。対象リポジトリをチェックアウトし、挨拶文を表示した後に、LICENSE ファイルを表示しています。

- flows/required.yml

```yaml
name: Check LICENSE

on:
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      - name: Greeting from required workflow
        run: echo Hello! from Required workflow
      - name: Check LICENSE
        run: cat LICENSE
```

## オーガニゼーションにおける required workflows の設定
required workflows はオーガニゼーション単位で設定します。

:::info
required workflows は現時点で無償プランのオーガニゼーションでも利用可能です。これが public beta 期間中だけなのかは不明です。
:::

オーガニゼーションの Settings > Actions > General と選択します。

![Settings-Actions-General](https://i.gyazo.com/d407b9245f09129bd2cb04c477b5721b.png)

General の一番下にある `Required workflows` のセクションで `Add workflow` をクリックして、実行するワークフローや対象リポジトリを設定します。

![Add Required workflows](https://i.gyazo.com/c0e87d62dfe732d69225d4da67dd4b6b.png)

上記で作成した `required-workflows` リポジトリのワークフローファイルを指定し、対象のリポジトリを選択しました。

![required workflows settings](https://i.gyazo.com/d2becaddfa5e121bc6ff26349a690b53.png)

対象リポジトリは、すべてのリポジトリを対象にすることも個別に選択も可能です。今回は `sandbox-repo` というリポジトリを選択しました。

![Select repos](https://i.gyazo.com/ee0c3e22c0ab38eec4cbf04223891e84.png)

## required workflows の動作確認
それでは、対象リポジトリとして選択した `sandbox-repo` リポジトリ[^1]で PR を作って required workflow として作った Check LICENSE ワークフローの動作を確認してみます。

[^1]: このリポジトリでは LICENSE ファイルは追加済みです。

この `sandbox-repo` リポジトリ自体にはワークフローファイルは追加していませんが、PR を作成したら Check LICENSE が実行され成功しました。

![PR Checks](https://i.gyazo.com/9ee7a504c905e744f23db4f70208810f.png)

実行結果の詳細です。`sandbox-repo` がチェックアウトされ Greeting に続いて、LICENSE ファイルが表示されました。

![Workflow result](https://i.gyazo.com/639a45fded98225d14a667ba68cdfcec.png)

## まとめ
required workflows の概要と利用方法を紹介しました。共通的なフローを1箇所にまとめるという意味では再利用可能ワークフローにも似ていますが、利用側のリポジトリではその存在を意識せず問答無用で実行されるところが違いますね。Linter の実行をもれなく行いたいなどのケースにもうまくマッチしそうです。
