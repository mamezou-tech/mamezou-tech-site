---
title: "OSS"
description: "豆蔵メンバーが開発しているOSSの紹介"
titleImage: "/img/logo/mame-kun4_50.png"
---

## CI/CD
以前はJenkins一択だったCI/CDツールも最近は様々なものが登場し、プロジェクトで採用できる選択肢が広がっています。  
各CI/CDツールはそのシステム特性に応じて様々な拡張ポイントが用意されています。
これをうまく使うことでプロジェクトに合った実用性の高いパイプラインを構築できます。
ここでは汎用性の高いCI/CDプラグインのOSSについてご紹介します。

### Github Actions
* [setup-helmfile](/oss-intro/setup-helmfile/)

  Github Actionsで [helmfile](https://github.com/roboll/helmfile) を setup する Action。

* [buildpacks-action](/oss-intro/buildpacks-action/)

  GitHub Actions で [Cloud Native Buildpacks](https://buildpacks.io) によるコンテナイメージビルドを実行する Action。

* [monorepo-update-checker](/oss-intro/monorepo-update-checker/)

  Monorepo内の変更有無を配下のプロジェクト（リポジトリ）ごとにチェックできる Action。

### Concourse CI
* [concourse-k8s-resource](/oss-intro/concourse-k8s-resource/)

  Go言語製のConcourse CIのKubernetes向けカスタムリソース。

---

## ツール

* [sbgraph](/oss-intro/sbgraph/)

  [Scrapbox](https://scrapbox.io) のページ間リンクを可視化するための CLI

---

## 各種プラグイン

* [eleventy-plugin-code-clipboard](/oss-intro/eleventy-plugin-code-clipboard/)

  静的サイトジェネレータの[eleventy(11ty)](https://www.11ty.dev/)で作成したマークダウンのコードブロックにクリップボードボタンを適用するプラグイン。