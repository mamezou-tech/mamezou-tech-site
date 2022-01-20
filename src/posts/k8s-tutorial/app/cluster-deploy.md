---
title: クラスタ環境デプロイ - EKS
author: noboru-kudo
date: 2022-01-23
prevPage: ./src/posts/k8s-tutorial/app/container-registry.md
---

[前回](/containers/k8s/tutorial/app/container-registory/)で、コンテナレジストリを導入し、コンテナイメージ用のリポジトリを準備しました。
今回はアプリケーション開発編の仕上げとして、Kubernetesクラスタ環境のEKSにアプリケーションをデプロイしましょう。

一般的なプロジェクトでは商用環境だけでなく、結合テスト、受け入れテスト等、様々なフェーズに応じた環境が準備されています。
また、各環境で外部システムとの接続先等の環境固有の設定/構成が必要だったり、コストの関係で全て同等のスペックで準備することが難しいといったケースがほとんどです。
これらの構成は、各KubernetesリソースのYAMLファイルとして記述してきましたが、環境毎にフルセットを準備するのは気が引けることでしょう。

これを解決する手段として、環境差分を吸収する仕組みを導入する必要があります。Kubernetesでは、現状は[Kustomize](https://kustomize.io/)または[Helm](https://helm.sh/)を使うことが一般的かと思います。
両者はアプローチの仕方が異なり、どちらも一長一短があります。

Kustomizeは共通部分(base)に対して、各環境固有のパッチを当てるというスタイルです。マニフェストファイルの知識さえあれば簡単に作成できます。
一方で、HelmはGoのテンプレート言語でマニフェストファイルを記述し、Helmチャートとしてパッケージング・配布する方式を採用しています。このテンプレート言語を習得するためのコストは高いですが、Kustomizeより高い柔軟性を持っているため、不特定多数のユーザーへ提供するプロダクトに向いています。
このような特性から、HelmはKubernetesのパッケージマネージャとして認知されています。有名どころのKubernetesのプロダクトのほとんどは、Helmチャートとして提供されており、[Artifact Hub](https://artifacthub.io/)から検索できます[^1]。

[^1]: 今回利用するECRではコンテナイメージだけでなく、Helmチャートも管理できます。興味のある方は[公式ドキュメント](https://docs.aws.amazon.com/AmazonECR/latest/userguide/push-oci-artifact.html)を参照してください。

今回作成したタスク管理ツールは内部向けのアプリケーションのため、Kustomizeで十分賄えますので、こちらを利用しましょう。
環境としては、今まで作成してきたローカル環境(local)と、仮想の商用環境(prod)としてAWS EKSクラスタを対象に、Kustomizeでマニフェストファイルを構成するものとします。

[[TOC]]

## 事前準備

### EKSクラスタ環境
今回は商用環境としてEKSを利用します。事前にEKSクラスタを準備してください。eksctlでもTerraformでもどちらでも構いません。

- [クラスタ環境構築 - AWS EKS (eksctl)](/containers/k8s/tutorial/infra/aws-eks-eksctl/)
- [クラスタ環境構築 - AWS EKS (Terraform)](/containers/k8s/tutorial/infra/aws-eks-terraform/)

次に、構築したEKSクラスタへの外部通信環境を整えるために、以下のプロダクトをセットアップしてください。

- [Ingress - NGINX Ingress Controller](/containers/k8s/tutorial/ingress/ingress-nginx/)[^2]
- [Ingress - カスタムドメイン管理(external-dns)](/containers/k8s/tutorial/ingress/external-dns/)
- [Ingress - HTTPS通信(Cert Manager)](/containers/k8s/tutorial/ingress/https/)

[^2]: もちろん他のIngress Controllerでも対応可能です。興味のある方はチャレンジしてください。

### ローカルKubernetes
今まで構築したローカル環境についても、Kustomizeを利用するように変更します。
未セットアップの場合は、以下を参考にローカル環境をセットアップしてください。

- [ローカル開発環境準備 - 実行環境(minikube)](/containers/k8s/tutorial/app/minikube/)
- [ローカル開発環境準備 - 自動化ツール(Skaffold)](/containers/k8s/tutorial/app/skaffold/)
- [ローカル開発環境準備 - ローカルAWS(LocalStack)](/containers/k8s/tutorial/app/localstack/)
- [Kubernetesマニフェスト作成 - Webアプリケーション(Deployment)](/containers/k8s/tutorial/app/web-app/)
- [Kubernetesマニフェスト作成 - バッチアプリケーション(CronJob/Job)](/containers/k8s/tutorial/app/batch/)

### Kustomize
現在Kustomizeはkubectl(v1.14以降)に組み込まれいるので、通常は別途インストールする必要がありません。
ですが、今回ローカル環境へのデプロイに使用する[Skaffold](https://skaffold.dev/)で、Kustomizeを使う場合は、別途インストールが必要です。
公式ドキュメントを参考に別途インストールをしてください。

- [https://skaffold.dev/docs/install/](https://skaffold.dev/docs/install/)

### プライベートレジストリ
前回構築したコンテナイメージ用のプライベートレジストリはそのまま使用します。
未セットアップの場合はセットアップしてください。

- [クラスタ環境デプロイ - コンテナレジストリ(ECR)](/containers/k8s/tutorial/app/container-registry/)

## AWSリソースの作成
## Kustomizeの導入

## EKSクラスタにデプロイ

## 動作確認

## まとめ