---
title: GitHub Actions - 再利用可能ワークフローを使う
author: masahiro-kondo
date: 2022-03-08
tags: [CI/CD, GitHub]
---

GitHub Actions のワークフローから別のワークフローを再利用する機能が昨年11月にリリースされました。この機能がなくて不便に感じていた人も多いのではないでしょうか。

- [GitHub Actions&#058; Reusable workflows are generally available | GitHub Changelog](https://github.blog/changelog/2021-11-24-github-actions-reusable-workflows-are-generally-available/)
- [Reusing workflows - GitHub Docs](https://docs.github.com/ja/actions/using-workflows/reusing-workflows)

シンプルなワークフローを作って試してみました。

呼び出し側のワークフロー。同一リポジトリのワークフローを呼び出すには、`uses` キーワードを使ってプロジェクトルートからの相対パスで `.github/workflow` 配下のワークフローファイルを指定します。通常のジョブと違って `runs-on` などは指定しません。

```yaml
name: Caller Job
on:
  workflow_dispatch:

jobs:
  Reuse:
    uses: ./.github/workflows/callee.yml
```

呼び出されるワークフロー。ワークフローのトリガーには `workflow_call` を指定します。`runs-on` は呼び出される側で指定します。

```yaml
name: Callee Job
on:
  workflow_call:

jobs:
  Build:
    runs-on: ubuntu-latest
    steps:
      - run: echo called!
```
>
呼び出し側のワークフローを手動で実行しました。呼び出し側と呼び出される側が1つにまとめられたジョブ `Reuse / Build` として表示されました。

![](https://i.gyazo.com/18df029bd2ad151878857a87fcdbc7f2.png)

ログを見ると、呼び出されるワークフローに書いた step の処理がそのまま出力されています。

![](https://i.gyazo.com/1434fc61bc1db9d0403431262d8c27e6.png)

呼び出し側フローに呼び出されるフローをインライン展開しているような動きですね。

[公式ドキュメント](https://docs.github.com/ja/actions/using-workflows/reusing-workflows#limitations)によると再利用可能ワークフローには以下のような制限があります。

1. 再利用可能ワークフローは他の再利用可能ワークフローを呼び出すことはできない
1. プライベートリポジトリ内の再利用可能ワークフローは、同一リポジトリ内のワークフローでのみ使用可能
1. 呼び出し元ワークフローで定義されたワークフローレベルの環境変数は呼び出されたワークフローに伝播されない
1. `strategy` プロパティは、再利用可能ワークフローを呼び出すジョブではサポートされない

2番目の制約はちょっと残念ですね。1つのプライベートリポジトリに再利用可能ワークフローを集約して他のリポジトリのワークフローから呼ぶという使い方はできないようです[^1]。public なリポジトリのワークフローであれば以下のように指定可能です。

[^1]: ワークフローをオーガニゼーション単位で共有する機能は将来提供される予定ですが、マイルストーンは未定です。[https://github.com/github/roadmap/issues/52](https://github.com/github/roadmap/issues/52)


```yaml
jobs:
  Reuse1:
    uses: mamezou-tech/reusable-flows/.github/workflows/reuse1.yml@main
  Reuse2:
    uses: mamezou-tech/reusable-flows/.github/workflows/reuse2.yml@v1
```

4番目の制約によれば、マトリクス実行や fail-fast のような strategy の機能を呼び出し側ジョブで使えないということになります。


外部の Action を実行するのと同じ構文で、再利用可能ワークフローにパラメータを受け渡すことができます。 パラメータは `with` キーワードで指定します。 secret は `secrets` キーワードで渡せます。

{% raw %}
```yaml
jobs:
  call-workflow-passing-data:
    uses: octo-org/example-repo/.github/workflows/workflow-B.yml@main
    with:
      username: mona
    secrets:
      token: ${{ secrets.TOKEN }}
```
{% endraw %}

{% raw %}
呼び出されるワークフローでは、パラメータや secret の名前、型などを指定します[^2]。`${{ inputs.username }}`、`${{ secrets.token }}` のよう渡されたパラメータや secret を利用できます。
{% endraw %}

[^2]: [GitHub Actionsのメタデータ構文 - GitHub Docs](https://docs.github.com/ja/actions/creating-actions/metadata-syntax-for-github-actions#name)

{% raw %}
```yaml
name: Reusable workflow example

on:
  workflow_call:
    inputs:
      username:
        required: true
        type: string
    secrets:
      token:
        required: true

jobs:
  example_job:
    name: Pass input and secrets to my-action
    runs-on: ubuntu-latest
    steps:
      - uses: ./.github/workflows/my-action
        with:
          username: ${{ inputs.username }}
          token: ${{ secrets.token }}
```
{% endraw %}

>
再利用可能なワークフローが使えることで、ビルドやテストなどのワークフローを個別のファイルに切り出して E2E テスト用のワークフローやリリース用のワークフローから利用できるようになりました。ワークフローのコード重複を削減するためにうまく利用したいですね。
