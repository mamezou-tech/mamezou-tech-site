---
title: コンテナ
description: Kubernetesを中心としたコンテナエコシステムの環境構築や運用ノウハウ
layout: page.njk
titleImage: "/img/logo/mameka5_50.png"
---

Dockerの登場によって、コンテナはユーティリティ化しました。
当初は開発環境やテスト環境等で使われることが多かったですが、主要クラウドベンダーのKubernetesサポートもあり、今や商用環境でコンテナ技術が使われるのが当たり前になりました。
ここでは、コンテナ技術に関する記事をまとめていきます。

## Kubernetesチュートリアル
コンテナオーケストレーションツールとしてデファクトスタンダードとなったKubernetesは、クラウド環境のみならずオンプレ環境でも利用が進んでおり、コンテナ実行基盤としての確固たる地位を築いています。
ここでは、そんなKubernetesの環境構築から開発・運用までで必要な作業をハンズオン形式で実施することで、初心者レベルからの脱却を目指します。

### 環境構築編
#### Kubernetesクラスタ構築
1. [AWS EKS(eksctl)](/containers/k8s/tutorial/infra/aws-eks-eksctl/)
2. [AWS EKS(Terraform)](/containers/k8s/tutorial/infra/aws-eks-terraform/)

#### Ingress導入
1. [NGINX Ingress Controller](/containers/k8s/tutorial/ingress/ingress-nginx/)
2. [AWS Load Balancer Controller](/containers/k8s/tutorial/ingress/ingress-aws/)
3. [カスタムドメイン管理(external-dns)](/containers/k8s/tutorial/ingress/external-dns/)
4. [HTTPS通信(Cert Manager)](/containers/k8s/tutorial/ingress/https/)

#### ストレージ(CSI)導入
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
#### スケーリング/スケジューラ
1. [オートスケーリング(HPA)](/containers/k8s/tutorial/ops/hpa/)
2. [Podスケジューリング](/containers/k8s/tutorial/ops/scheduling/)

#### モニタリング
1. [メトリクス収集・可視化(Prometheus / Grafana)](/containers/k8s/tutorial/ops/prometheus/)
2. [メトリクス収集・可視化(OpenTelemetry / CloudWatch)](/containers/k8s/tutorial/ops/opentelemetry/)
3. [ログ収集・分析(Fluent Bit / AWS OpenSearch)](/containers/k8s/tutorial/ops/opensearch/)
4. [ログ収集・分析(Fluent Bit / Cloud Watch)](/containers/k8s/tutorial/ops/cloudwatch/)
5. [分散トレーシング(OpenTelemetry / Jaeger)](/containers/k8s/tutorial/ops/jaeger/)
6. [分散トレーシング(OpenTelemetry / AWS X-Ray)](/containers/k8s/tutorial/ops/awsxray/)

#### バックアップ・リストア
1. [Velero による Kubernetes クラスタのバックアップ・リストア](/containers/k8s/tutorial/ops/velero-backup/)

## Kubernetes活用編
Kubernetes活用例を抜粋しました。Kubernetesを様々なユースケースに適用してみましょう。

1. [Kubernetes ネイティブなワークフローエンジン Argo Workflows](/containers/k8s/tutorial/advanced/argo-workflows/)
2. [Karpenterのオートスケールを試してみました](/blogs/2022/02/13/introduce-karpenter/)
3. [Dapr on Jetson Nano with k3s](/blogs/2022/01/03/dapr-on-jetson-nano-with-k3s/)
4. [KubernetesのPod Security(PSS/PSA)](/blogs/2022/03/03/pss-psa/)
5. [Mizu(水)でマイクロサービスのトラフィックを分析する](/blogs/2022/05/04/mizu-intro/)
6. [Flagger と Ingress Nginx でカナリアリリースをする](/blogs/2022/05/08/flagger-nginx-canary/)
7. [Flagger と Ingress Nginx でA/Bテストをする](/blogs/2022/05/15/flagger-nginx-abtesting/)
8. [Strimzi - Kubernetes で Kafka を運用するための Operators](/blogs/2022/05/25/strimzi-kafka-operators/)
9. [Telepresence - EKSのワークロードをローカル環境でデバッグする](/blogs/2022/06/04/telepresence-on-eks/)
10. [SealedSecretsでKubernetesコンテナのシークレット情報をGit管理する](/blogs/2022/06/05/introduce-sealedsecrets/)
11. [Secrets Store CSI DriverでKubernetesのシークレット情報を管理する](/blogs/2022/07/13/secrets-store-csi-driver-intro/)
12. [Camunda Platform のモダンなプロセスオーケストレーター Zeebe による開発環境を構築する](/blogs/2022/07/17/camunda-zeebe/)
13. [Ingressを強化したKubernetes Gateway APIを試してみる](/blogs/2022/07/24/k8s-gateway-api-intro/)
14. [kubectl debugを使ってKubernetesのコンテナをデバッグする](/blogs/2022/08/25/kubernetes-ephemeral-containers-intro/)
15. [EKS Blueprints(CDK)ですぐ使える実用的なEKSクラスタ環境を簡単に手に入れる](/blogs/2022/09/01/eks-blueprints-cdk-intro/)
