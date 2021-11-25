---
title: "OSS"
description: '豆蔵社員が開発するOSSの紹介'
---

## CI/CD関連
最近はCI/CDを実現する様々なソフトウェア・サービスが利用できるようになっていて、プロジェクトで採用できる選択肢が広がっています。  
また、各CI/CDツールはそのシステム特性に応じて様々な拡張ポイントが用意されていて、これをうまく使うことが効率的でなパイプラインを構築することが可能です。

### Github Actions
* [setup-helmfile](/oss-intro/setup-helmfile)

  Github Actionsで [helmfile](https://github.com/roboll/helmfile) を setup する Action。

* [buildpacks-action](/oss-intro/buildpacks-action)

  GitHub Actions で [Cloud Native Buildpacks](https://buildpacks.io) によるコンテナイメージビルドを実行する Action。

* [monorepo-update-checker](/oss-intro/monorepo-update-checker)

  Monorepo内の変更有無を配下のプロジェクト（リポジトリ）ごとにチェックできる Action。

### Concourse CI
* [concourse-k8s-resource](/oss-intro/concourse-k8s-resource)

  Go言語製のConcourse CIのKubernetes向けカスタムリソース。
  パイプラインにスクリプト記述することなくビルドしたコンテナイメージをk8s環境にリリースすることができます。

---

## ユーティリティ

* [sbgraph](/oss-intro/sbgraph)

  [Scrapbox](https://scrapbox.io) のページ間リンクを可視化するための CLI
