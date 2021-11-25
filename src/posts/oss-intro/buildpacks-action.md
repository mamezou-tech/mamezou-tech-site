---
title: "buildpacks-action"
description: '豆蔵社員が開発するOSS紹介 buildpacks-action 編'
---

[buildpacks-action](https://github.com/mamezou-tech/buildpacks-action) は GitHub Actions で [Cloud Native Buildpacks](https://buildpacks.io) を使ってコンテナイメージビルドを実行するための Action です。

Buildpacks は Dockerfile を記述しなくても、アプリケーションのコンテナイメージを作成してくれるツールであり、各種プログラミング言語・アプリケーションフレームワークに対応した buildpack が提供されています。Dockerfile を手作成していると、アプリケーションごとにソフトウェアのバージョンアップに対応してメンテナンスを行う必要がありますが、Buildpacks を利用することでメンテナンスのコストを低減することが可能です。

buildpacks-action は、この Buildpacks を使って GitHub Actions ワークフローでアプリケーションのコンテナイメージをビルドするための Action です。

ワークフローでの利用イメージです。

```yaml
jobs:
  build-maven-app:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Build image
      uses: mamezou-tech/buildpacks-action@master
      with:
        image: 'foo-app'
        tag: dev-${{ github.sha }}
        path: path/to/foo-app
        builder: gcr.io/paketo-buildpacks/builder:base
```
buildpacks のほか、ビルド時の環境変数を指定することも可能です。

詳細は [README](https://github.com/mamezou-tech/buildpacks-action/blob/master/README.md) を参照してください。

buildpacks-action は Docker container action として実装しています。Docker in Docker で実行するため、ベースイメージは docker:dind を使用しています。

[Docker コンテナのアクションを作成する - GitHub Docs](https://docs.github.com/ja/actions/creating-actions/creating-a-docker-container-action)
