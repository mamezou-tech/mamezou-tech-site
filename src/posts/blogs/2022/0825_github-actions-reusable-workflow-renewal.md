---
title: GitHub Actions 再利用可能ワークフローでネスト呼び出しと Matrix strategy が解禁
author: masahiro-kondo
tags: [GitHub, CI/CD]
date: 2022-08-25
---

以前の「[GitHub Actions - 再利用可能ワークフローを使う](/blogs/2022/03/08/github-actions-reuse-workflows/)」の記事時点では、以下のような制約がありました。

> 1. 再利用可能ワークフローは他の再利用可能ワークフローを呼び出すことはできない
> 2. プライベートリポジトリ内の再利用可能ワークフローは、同一リポジトリ内のワークフローでのみ使用可能
> 3. 呼び出し元ワークフローで定義されたワークフローレベルの環境変数は呼び出されたワークフローに伝播されない
> 4. strategy プロパティは、再利用可能ワークフローを呼び出すジョブではサポートされない

このたびのリリースで、1と4の制約が解消され、再利用可能ワークフローのネスト呼び出しが可能となるとともに、呼び出し元からの Matrix strategy も使えるようになりました[^2]。

[^2]: 2の制約も2022年12月に解消されました。詳細は「[GitHub Actions - private リポジトリの Action と再利用可能ワークフローが呼び出しが可能に](/blogs/2022/12/24/sharing-private-actions-and-reusable-workflows/)」を参照してください。

[GitHub Actions&#058; Improvements to reusable workflows | GitHub Changelog](https://github.blog/changelog/2022-08-22-github-actions-improvements-to-reusable-workflows-2/)

早速試してみましょう。まずはネスト呼び出しから。

呼び出し側のワークフロー。再利用可能ワークフローをパラメータ付きで呼び出します。

```yaml
name: Use reusable flow

on:
  workflow_dispatch:

jobs:
  UseReusableFlow:
    uses: kondoumh/iac-dev/.github/workflows/reusable-flow.yml@master
    with:
      param1: hoge
```

再利用可能ワークフロー第1階層。パラメータを受けて、さらに、再利用可能ワークフローにパラメータを渡して呼び出ます。

```yaml
name: Reusable workflow A

on:
  workflow_call:
    inputs:
      param1:
        description: 'Param1'
        required: true
        type: string

jobs:
  call-another-reusable:
    uses: kondoumh/iac-dev/.github/workflows/reusable-nested-flow.yml@master
    with:
      param1: ${{ inputs.param1 }}
```

再利用可能ワークフロー第２階層。ここで本命のジョブが動きます。渡ってきたパラメータを出力します。

```yaml
name: Reusable workflow B

on:
  workflow_call:
    inputs:
      param1:
        description: 'Param1'
        required: true
        type: string

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Echo
        run: echo "called from reusable flow with param ${{ inputs.param1 }}!"
```

実行してみると、ちゃんと最下層のジョブが実行され、パラメータの受け渡しもできました。

![ネストワークフロー実行](https://i.gyazo.com/e1054cdd3c210382f93243c243448c22.png)

:::info
再利用可能ワークフローのネスト呼び出しは、ネストは4階層まで可能なようです。

> You can connect up to four levels of workflows. 

また、同一オーガニゼーションやエンタープライズでは、`inherit` キーワードにより、暗黙的なシークレットの受け渡しも可能です。詳しくはドキュメントを参照してください。

[https://docs.github.com/en/actions/using-workflows/reusing-workflows#nesting-reusable-workflows](https://docs.github.com/en/actions/using-workflows/reusing-workflows#nesting-reusable-workflows)
:::

次に、Matrix strategy です。

呼び出し側のワークフロー。`strategy/matrix` の `target` で `dev`、`stage`、`prod` のようにデプロイ先の環境を matrix で指定しています。再利用可能ワークフローの `target` パラメータにこの matrix を指定することにより、target の要素分のジョブが起動されてパラレルに実行されます。

```yaml
name: Dploy with matrix strategy

on:
  workflow_dispatch:

jobs:
  ReuseableMatrixJobForDeployment:
    strategy:
      matrix:
        target: [dev, stage, prod]
    uses: kondoumh/iac-dev/.github/workflows/deployment-reusable.yml@master
    with:
      target: ${{ matrix.target }}
```

再利用可能ワークフローの deployment-reusable.yml です。`inputs.target` でデプロイ先の環境を受け取り、ビルド、パッケージ、デプロイを行います(この例は単に echo しているだけ)。

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

:::info
もしワークフローでコンテナアプリケーションの CI/CD を行う場合、ビルドは1度だけでデプロイ先の差異は環境変数で対応するのが王道ですが、ここはあくまでサンプルということでご了承ください。
:::

実行すると、matrix が展開され各環境のジョブが実行されました。以下のスクリーンショットは、プロダクションビルドの実行結果を開いたところです。

![再利用可能ワークフロー matrix 実行結果](https://i.gyazo.com/edaa2830397276a6d1b061dbf04ee75d.png)

:::info
ちなみに matrix とネスト呼び出しを混在させることはできますが、ジョブに依存関係を定義したりすると意図した動きをしませんでした。あまり凝ったことはできない模様です。
:::

以上、再利用可能ワークフローの改善ポイントを見てきました。ワークフローコードの重複削減には有効なので、機会があったら使ってみたいと思います。
