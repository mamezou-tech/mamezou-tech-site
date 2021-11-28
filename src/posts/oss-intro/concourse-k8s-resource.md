---
title: "concourse-k8s-resource"
description: '豆蔵社員が開発するOSS紹介 concourse-k8s-resource 編'
date: 2021-11-26
---

[concourse-k8s-resource](https://github.com/mamezou-tech/concourse-k8s-resource) は Concource CI で、Kubernetes クラスターにコンテナイメージをデプロイするための Concource カスタムリソースです。

Concourse CI では、Resource という概念で、パイプラインから成果物を取得したり生成するターゲットを定義します。公式・サードパーティ含め多くのリソースが公開されています。

<https://resource-types.concourse-ci.org>

Git / Docker など、必ず使うリソースが提供されていれば、シェルスクリプトなどで実装することなく宣言的に利用でき、パイプライン内での再利用性も高くなります。

concourse-k8s-resource では宣言的スタイルを採用し、パイプラインにスクリプト記述することなくビルドしたコンテナイメージをk8s環境にリリースすることができます。

Concourseのk8sリソースはコミュニティ版のものが既にいくつか存在しています。
しかし、それらはResourceのバージョニング機能(`/opt/resource/check`)が実装されておらず、宣言的でジョブの依存関係(k8sデプロイ後に他のジョブ実行)を定義することができませんでした。
そもそもk8sのDeploymentにはバージョニング機能が備わっているので、これらをパイプラインで活用できないかと考えたことが開発のモチベーションになりました。
このk8sリソースはk8sのクライアントAPI(Go言語)を活用して、k8sのデプロイ・庵デプロイやデプロイリソースのステータス/バージョンをチェックするものとなっています。

詳しくは [README](https://github.com/mamezou-tech/concourse-k8s-resource/blob/master/README.md) を参照してください。
