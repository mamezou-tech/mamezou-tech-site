---
title: GitHub Actions - private リポジトリの Action と再利用可能ワークフローが呼び出しが可能に
author: masahiro-kondo
date: 2022-12-24
tags: [CI/CD, GitHub, advent2022]
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2022/
---

これは、[豆蔵デベロッパーサイトアドベントカレンダー2022](https://developer.mamezou-tech.com/events/advent-calendar/2022/)第24日目の記事です。

これまで Action、および再利用可能ワークフローのリポジトリは public にしないと他リポジトリのワークフローから呼び出すことができませんでした。

このたび private リポジトリの Action と再利用可能ワークフローが同一オーガニゼーション、個人アカウント、Enterprise で利用可能になったことが発表されました。

[GitHub Actions - Sharing actions and reusable workflows from private repositories is now GA | GitHub Changelog](https://github.blog/changelog/2022-12-14-github-actions-sharing-actions-and-reusable-workflows-from-private-repositories-is-now-ga/)

この機能は待ち望んでいた人も多いのではないでしょうか。GitHub からのクリスマスプレゼント？ということで早速試してみました。

private リポジトリでの Action と再利用可能ワークフローの共有についての公式ドキュメントは以下から見ることができます。

[Sharing actions and workflows from your private repository - GitHub Docs](https://docs.github.com/en/actions/creating-actions/sharing-actions-and-workflows-from-your-private-repository)

[[TOC]]

## private リポジトリの Action を呼び出す

実は private リポジトリの Action 呼び出しに関しては3月に Enterprise プランではすでにサポートされていました。

[Sharing GitHub Actions within your enterprise is now GA | GitHub Changelog](https://github.blog/changelog/2022-03-04-sharing-github-actions-within-your-enterprise-is-now-ga/)

この Changelog を見て喜び勇んで会社のオーガニゼーションで試したところ、残念ながら弊社は Enterprise プランではないことに気づいてしまいました(笑)。この時お蔵入りにしていたお試しコードを再び取り出して試しました。

まず private リポジトリに作ったサンプルの Greeting Action です。Composite Action のサンプルを使いました。入力パラメータとして、挨拶をする相手を受け取ります。最初のステップで挨拶、次のステップで乱数を生成してアウトプットに設定しています。

- sample-internal-action/action.yml

{% raw %}
```yaml
name: 'Hello World'
description: 'Greet someone'
inputs:
  who-to-greet:  # id of input
    description: 'Who to greet'
    required: true
    default: 'World'
outputs:
  random-number:
    description: "Random number"
    value: ${{ steps.random-number-generator.outputs.random-id }}
runs:
  using: "composite"
  steps:
    - run: echo Hello ${{ inputs.who-to-greet }}.
      shell: bash
    - id: random-number-generator
      run: echo "random-id=$(echo $RANDOM)" >> $GITHUB_OUTPUT
      shell: bash
```
{% endraw %}

:::info
GitHub Actions の Action は当初 Docker Action と JavaScript Action の2種類がありました。Docker Action は任意の言語(主にシェルスクリプト)で実装、JavaScript Action は GitHub 提供の NPM パッケージを使って JavaScript/TypeScript で実装します。ワークフローと同じ YAML の構文では実装できませんでした。後に Composite Action が登場し、ワークフローと同じ構文で書けるようになりました。

[Creating a composite action - GitHub Docs](https://docs.github.com/en/actions/creating-actions/creating-a-composite-action)
:::

Action のリポジトリ(sample-internal-action) では、オーガニゼーション内のリポジトリに対してアクセス設定が必要です。リポジトリの `Settings` > `Actions` > `General` を開きます。

![Setting Actions General](https://i.gyazo.com/60bda484696fbb660ca1f1fbf8bd0183.png)

`Access` セクションで、`Accessible from repositories in the <onwer> organization` を選択して `Save` をクリックします。

![Arrow Access from internal repos](https://i.gyazo.com/6e5b2abd0079806fc68feac70483f163.png)

次に利用側のワークフローです。これも Action と同じオーガニゼーションの private リポジトリに作成しています。 sample-internal-action を `uses` で指定し、次のステップで格納された乱数を echo で表示しています。

use-internal-action/.github/workflows/ci.yml

{% raw %}
```yaml
name: CI

on: [workflow_dispatch]

jobs:
  hello_world_job:
    runs-on: ubuntu-latest
    name: A job to say hello
    steps:
      - uses: actions/checkout@v3
      - id: foo
        uses: mamezou-tech/sample-internal-action@master
        with:
          who-to-greet: 'Mamezou'
      - run: echo random-number ${{ steps.foo.outputs.random-number }}
        shell: bash
```
{% endraw %}

実行結果です。挨拶文の出力の後、Action で生成された乱数が出力されました。

![実行結果](https://i.gyazo.com/6fdbc49554f262d04dafea37eadfdc7b.png)

## private リポジトリの再利用可能ワークフローを呼び出す

次に private リポジトリの再利用可能ワークフローの呼び出しを試します。

:::info
再利用可能ワークフローについては何度か紹介してきました。以下の記事をご参照ください。

- [GitHub Actions - 再利用可能ワークフローを使う](/blogs/2022/03/08/github-actions-reuse-workflows/)
- [GitHub Actions - 再利用可能ワークフローと手動トリガーで入力値の扱いを統一](/blogs/2022/06/11/github-actions-inputs-unified/)
- [GitHub Actions - 再利用可能ワークフローでネスト呼び出しと Matrix strategy が解禁](/blogs/2022/08/25/github-actions-reusable-workflow-renewal/)
:::

まず利用されるワークフローです。個人アカウントの private リポジトリ shared-workflows に作成しました[^1]。

[^1]: このリポジトリの Access 設定も Action のリポジトリと同様、`Accessible from repositories in the <onwer> organization` を指定しておきます。

CI/CD を意識して入力パラメータ `target` でデプロイ先を受け取るサンプルにしました。デプロイ先を環境変数として設定します。

- shared-workflows/.github/workflows/deploy.yml

{% raw %}
```yaml
name: Build & Deploy for given tareget

on:
  workflow_call:
    inputs:
      target:
        description: 'Target to deploy app'
        required: true
        type: string

env:
  TARGET: ${{ inputs.target }}

jobs:

  build:
    runs-on: ubuntu-latest
    steps:
      - name: Build
        run: echo "Build for $TARGET environment"
      - name: Package
        run: echo "Package for $TARGET environment"
      - name: Deploy
        run: echo "Deploy to $TARGET environment"
```
{% endraw %}

呼び出し側ワークフローを同じアカウントの private リポジトリに配置しました。

- call-private-reusable-flow.yml

```yaml
name: Use reusable flow in another private repo

on:
  workflow_dispatch:

jobs:
  UseReusableFlow:
    uses: kondoumh/shared-workflows/.github/workflows/deploy.yml@main
    with:
      target: dev
```

実行結果です。再利用ワークフローで定義したジョブの各ステップが実行されました。`with` で指定したパラメータの値も反映されています。

![実行結果](https://i.gyazo.com/7f9fef6319e74461539c6fdc83e013f0.png)

## 最後に
以上、private リポジトリの Action と再利用可能ワークフローが呼び出せるようになったことを確認しました。

OSS ではないプロジェクトで Action や再利用可能ワークフローを自前で作りたい場合、これまでは public にしないといけないのがネックになるケースがあったかと思います。Action は単機能なので公開してもさほど差し支えない場合が多いですが、再利用可能ワークフローでは、ビルド・デプロイされるプロダクトの名前が表に出たり、ワークフロー内で機密情報を扱う場合もあったりと、公開の障壁が特に高くなります。

筆者は数年前のプロジェクトで private の Action リポジトリを利用側のワークフローから checkout して実行していました。もうそのようなワークアラウンドは不要です。再利用可能ワークフローも当時はありませんでしたが、ワークフローを共有する仕組みがあればという話はよく上がっていました。

今回のアップデートで CI/CD パイプラインのコード共通化が促進されるのではないでしょうか。
