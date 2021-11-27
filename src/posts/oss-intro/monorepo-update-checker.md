---
title: "monorepo-update-checker"
description: '豆蔵社員が開発するOSS紹介 monorepo-update-checker 編'
date: 2021-11-26
---

[monorepo-update-checker](https://github.com/mamezou-tech/monorepo-update-checker) は モノレポの変更有無を配下のプロジェクト（リポジトリ）ごとにチェックできる Action です。

モノレポは Git リポジトリ構成戦略で、あらゆるプロジェクトを一つの Git リポジトリで管理する方式です。相対する戦略はマルチレポです。Google の Chrome などのあらゆるプロダクトが巨大なモノレポで構成されているのは有名です。

モノレポ、マルチレポそれぞれにメリット・デメリットがありますが、モノレポの一番のデメリットは CI を実行するトリガーとなるソースコードの変更検知でしょう。Git や GitHub ではモノレポ・マルチレポを区別する手段が提供されていないため、個別のプロジェクトで発生した変更が全体の変更として検知され CI が実行されます。GitHub Actions を使う場合もそれは例外ではありません。一部のプロジェクトの変更が、システム全体に波及してしまうのはビルドパイプラインとして好ましいものではありません。

monorepo-update-checker はこの問題を解決するために必要なプロジェクトごとの変更有無をチェック可能にする Action です。

GitHub Actions のワークフローでの利用例は以下のようになります。

```yaml
name: workflow-sample1
on:
  push:
    branches: [ main ]
jobs:
  service1:
    runs-on: ubuntu-latest
    steps:
      - name: Check for update in commit
        id: check
        uses: mamezou-tech/monorepo-update-checkern@main
        with:
          projectPaths: |
            service1:test/service1,test/service1-option
            service2:test/service2
            service3:test/service3
{% raw %}
      - name: serivce1 processing
      - if: ${{ fromJSON(steps.check.outputs.results).service1 }}
        run: echo execute processing of service1
      - name: serivce2 processing
      - if: ${{ fromJSON(steps.check.outputs.results).service2 }}
        run: echo execute processing of service2
      - name: serivce3 processing
      - if: ${{ fromJSON(steps.check.outputs.results).service3 }}
        run: echo execute processing of service3
{% endraw %}
```

{% raw %}
各プロジェクトの変更有無が `${{fromJSON(steps.check.outputs.results).proj }}` の形式で取得できるので、その結果に従って GitHub Actions ワークフロー構文の if を用いてビルドやデプロイなど変更に伴う処理をトリガーします。
{% endraw %}

詳細は [README](https://github.com/mamezou-tech/monorepo-update-checker/blob/main/README.md) を参照してください。
