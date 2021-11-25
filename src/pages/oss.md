---
title: "OSS"
description: '豆蔵メンバーが開発しているOSSの紹介'
---

## CI/CD関連
最近はCI/CDを実現する様々なソフトウェア・サービスが利用できるようになっていて、プロジェクトで採用できる選択肢が広がっています。  
また、各CI/CDツールはそのシステム特性に応じて様々な拡張ポイントが用意されていて、これをうまく使うことが効率的でなパイプラインを構築することが可能です。

### Github Actions
* [setup-helmfile](https://github.com/mamezou-tech/setup-helmfile)

  Github Actionsで [helmfile](https://github.com/roboll/helmfile) を setup する Action。

  関連記事： <https://blog.kondoumh.com/entry/2020/02/07/213828>

* [buildpacks-action](https://github.com/mamezou-tech/buildpacks-action)

  GitHub Actions で [Cloud Native Buildpacks](https://buildpacks.io) によるコンテナイメージビルドを実行する Action。

* [monorepo-update-checker](https://github.com/mamezou-tech/monorepo-update-checker)

  Monorepo内の変更有無を配下のプロジェクト（リポジトリ）ごとにチェックできる Action。

### Concourse CI
* [concourse-k8s-resource](https://github.com/mamezou-tech/concourse-k8s-resource)

  Go言語製のConcourse CIのKubernetes向けカスタムリソース。
  パイプラインにスクリプト記述することなくビルドしたコンテナイメージをk8s環境にリリースすることができます。

---

## ユーティリティ

* [sbgraph](https://github.com/mamezou-tech/sbgraph)

  [Scrapbox](https://scrapbox.io) のページ間リンクを可視化するための CLI
