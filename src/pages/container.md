---
title: "コンテナ"
description: Kubernetesを中心としたコンテナエコシステムの環境構築や運用ノウハウ
layout: page.njk
titleImage: "/img/logo/mameka5_50.png"
---

## Kubernetesチュートリアル
コンテナオーケストレーションツールとしてデファクトスタンダードとなったKubernetesは、今やクラウド環境のみならずオンプレ環境でも利用が進んでおり、コンテナ実行基盤としての確固たる地位を築いています。
アプリケーション開発する上で、アプリ内のことだけでなくコンテナ実行基盤について理解することは、拡張性や耐障害性といったコンテナメリットを活かす上で非常に重要な要素であると考えています。
ここでは、そんなKubernetesの環境構築から開発・運用までで必要な作業をハンズオン形式で実施することで、初心者レベルからの脱却を目指します。

### 環境構築編
#### クラウド環境にKubernetesクラスタを構築
1. [AWS EKS(eksctl)](/containers/k8s/tutorial/infra/aws-eks-eksctl/)
2. [AWS EKS(Terraform)](/containers/k8s/tutorial/infra/aws-eks-terraform/)

#### Ingressでアプリケーションのゲートウェイ導入
1. [NGINX Ingress Controller](/containers/k8s/tutorial/ingress/ingress-nginx/)
2. [AWS Load Balancer Controller](/containers/k8s/tutorial/ingress/ingress-aws/)
3. [カスタムドメイン管理(external-dns)](/containers/k8s/tutorial/ingress/external-dns/)
4. [HTTPS通信(Cert Manager)](/containers/k8s/tutorial/ingress/https/)

#### ストレージ(CSI)を導入してデータ永続化
1. [AWS EBS](/containers/k8s/tutorial/storage/ebs/)
2. [AWS EFS](/containers/k8s/tutorial/storage/efs/)

### アプリケーション開発編
#### ローカル開発環境準備
1. [実行環境(minikube)](/containers/k8s/tutorial/app/minikube/)
2. [自動化ツール(Skaffold)](/containers/k8s/tutorial/app/skaffold/)
3. [ローカルAWS(LocalStack)](/containers/k8s/tutorial/app/localstack/)

#### Kubernetesマニフェスト作成
1. [Webアプリケーション(Deployment)](/containers/k8s/tutorial/app/web-app/)
2. [バッチアプリケーション(CronJob/Job)](/containers/k8s/tutorial/app/batch/)

#### クラスタ環境デプロイ
1. [コンテナレジストリ(ECR)](/containers/k8s/tutorial/app/container-registry/)
2. [EKSクラスタ(AWS環境準備)](/containers/k8s/tutorial/app/eks-1/)
3. [EKSクラスタ(Kustomize導入)](/containers/k8s/tutorial/app/eks-2/)
4. [EKSクラスタ(デプロイ)](/containers/k8s/tutorial/app/eks-3/)

### 継続的デリバリ編
1. [Flux](/containers/k8s/tutorial/delivery/flux/)
2. [ArgoCD](/containers/k8s/tutorial/delivery/argocd/)

### クラスタ運用編
#### スケーリング/スケジューラを使った柔軟なデプロイ戦略
1. オートスケーリング <span style="color:red">Coming Soon!</span>
2. カスタムスケジューリング <span style="color:red">Coming Soon!</span>

#### アプリケーションのログ、メトリクスのモニタリング
1. メトリクス収集 <span style="color:red">Coming Soon!</span>
2. アラート <span style="color:red">Coming Soon!</span>
3. 可視化 <span style="color:red">Coming Soon!</span>
4. トレーシング/APM <span style="color:red">Coming Soon!</span>
5. ログ収集 <span style="color:red">Coming Soon!</span>

#### バックアップ・リストアで重要なデータ保護
1. [Velero による Kubernetes クラスタのバックアップ・リストア](/containers/k8s/tutorial/ops/velero-backup/)

{% comment %}
### サービスメッシュ実践
#### Istio
1. 導入編 <span style="color:red">Coming Soon!</span>
1. ルーティング編 <span style="color:red">Coming Soon!</span>
1. フォールトトレランス編 <span style="color:red">Coming Soon!</span>
1. セキュリティ編 <span style="color:red">Coming Soon!</span>
1. モニタリング編 <span style="color:red">Coming Soon!</span>

{% endcomment %}

### 応用編
1. カスタムリソース(CRD)(Kubernetes Operators) <span style="color:red">Coming Soon!</span>
1. ポリシー管理(OPA) <span style="color:red">Coming Soon!</span>
1. [Argo Workflows](/containers/k8s/tutorial/advanced/argo-workflows/)
