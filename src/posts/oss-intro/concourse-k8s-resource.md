---
title: "concourse-k8s-resource"
description: '豆蔵社員が開発するOSS紹介 concourse-k8s-resource 編'
---

[concourse-k8s-resource](https://github.com/mamezou-tech/concourse-k8s-resource) は Concource CI で、Kubernetes クラスターにコンテナイメージをデプロイするための Concource カスタムリソースです。

Concource CI では、Resource という概念で、パイプラインから成果物を取得したり生成するターゲットを定義します。公式・サードパーティ含め多くのリソースが公開されています。

https://resource-types.concourse-ci.org

Git / Docker など、必ず使うリソースが提供されていれば、シェルスクリプトなどで実装することなく宣言的に利用でき、パイプライン内での再利用性も高くなります。

concourse-k8s-resource を使えば、パイプラインにスクリプト記述することなくビルドしたコンテナイメージをk8s環境にリリースすることができます。

詳しくは [README](https://github.com/mamezou-tech/concourse-k8s-resource/blob/master/README.md) を参照してください。

concourse-k8s-resource は golang で実装しています。
