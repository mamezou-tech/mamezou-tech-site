---
title: "コンテナ"
description: Kubernetesを含むコンテナエコシステムの環境構築や運用ノウハウ
layout: page.njk
titleImage: "/img/logo/mameka5_50.png"
---

## Kubernetesチュートリアル
コンテナ界隈でデファクトスタンダードとなったKubernetesはもはやクラウド環境のみならずオンプレ環境でも利用が進んでいます。
アプリケーション開発する上で、アプリ内のことだけでなくコンテナ基盤について理解することは、拡張性や耐障害性といったコンテナメリットを活かす上で非常に重要な要素であると考えています。
ここではそんなKubernetesの環境構築から開発・運用までで必要な作業をハンズオン形式で実施することで初心者レベルからの脱却を目指します。

### 環境構築編
#### クラスタ環境構築
1. [AWS EKS(eksctl)](/containers/k8s/tutorial/infra/aws-eks-eksctl)
2. [AWS EKS(Terraform)](/containers/k8s/tutorial/infra/aws-eks-terraform)

#### Ingress
1. [NGINX Ingress Controller](/containers/k8s/tutorial/ingress/ingress-nginx)
2. [AWS Load Balancer Controller](/containers/k8s/tutorial/ingress/ingress-aws)
3. [カスタムドメイン管理(external-dns)](/containers/k8s/tutorial/ingress/external-dns)
4. [HTTPS通信(Cert Manager)](/containers/k8s/tutorial/ingress/https)

#### ストレージ
1. [AWS EBS](/containers/k8s/tutorial/storage/ebs)
2. [AWS EFS](/containers/k8s/tutorial/storage/efs)

### アプリケーション開発編
1. 事前準備<span style="color:red">Coming Soon!</span>
2. Webアプリケーション開発 <span style="color:red">Coming Soon!</span>
3. バッチアプリケーション開発 <span style="color:red">Coming Soon!</span>

### 継続的デリバリ
1. Flux <span style="color:red">Coming Soon!</span>
2. ArgoCD <span style="color:red">Coming Soon!</span>

### クラスタ運用編

#### スケーリング/スケジューラ
1. オートスケーリング <span style="color:red">Coming Soon!</span>
2. カスタムスケジューリング <span style="color:red">Coming Soon!</span>

#### モニタリング
1. メトリクス収集 <span style="color:red">Coming Soon!</span>
2. アラート <span style="color:red">Coming Soon!</span>
3. 可視化 <span style="color:red">Coming Soon!</span>
4. トレーシング/APM <span style="color:red">Coming Soon!</span>
5. ログ収集 <span style="color:red">Coming Soon!</span>

#### バックアップ・リストア
1. [Velero による Kubernetes クラスタのバックアップ・リストア](/containers/k8s/tutorial/ops/velero-backup)

{% comment %}
### サービスメッシュ実践
#### Istio
1. 導入編 <span style="color:red">Coming Soon!</span>
1. ルーティング編 <span style="color:red">Coming Soon!</span>
1. フォールトトレランス編 <span style="color:red">Coming Soon!</span>
1. セキュリティ編 <span style="color:red">Coming Soon!</span>
1. モニタリング編 <span style="color:red">Coming Soon!</span>

#### AWS App Mesh
1. T.B.D

{% endcomment %}

### 応用編
1. カスタムリソース(CRD)(Kubernetes Operators) <span style="color:red">Coming Soon!</span>
1. ポリシー管理(OPA) <span style="color:red">Coming Soon!</span>
1. [Argo Workflows](/containers/k8s/tutorial/advanced/argo-workflows)
