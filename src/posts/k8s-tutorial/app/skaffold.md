---
title: ローカル開発環境準備 - 自動化ツール(Skaffold)
author: noboru-kudo
date: 2021-12-19
prevPage: ./src/posts/k8s-tutorial/app/minikube.md
---

[前回](/containers/k8s/tutorial/app/minikube/)はminikubeを使ってローカル環境内でコンテナアプリケーションを実行する環境を整えました。

しかし、サンプルアプリをデプロイで、ソースコードのビルドに加えて、コンテナイメージのビルドやKubernetesマニフェストの反映等、手順が煩雑だと感じられた方も多かったのではないでしょうか？
コンテナ以前のアプリ開発だとソースコードを記述後は任意のIDEを使ってそのまま実行していた方が多いと思います。
Kubernetesに載せるためには、追加手順としてコンテナのビルドとマニフェスト反映が必要となり、これを手動でやっていては開発スピードに悪影響を与えることになるでしょう。

今回はこれを解決するために、Google社で開発されたKubernetes向けの自動化ツールである[Skaffold](https://skaffold.dev/)を導入し、面倒な手順を自動化してしまいましょう。

## Skaffoldセットアップ


---
参照資料

- Skaffold: <https://skaffold.dev/docs/>
