---
title: Kubernetesマニフェスト作成 - Webアプリケーション
author: noboru-kudo
date: 2021-12-28
prevPage: ./src/posts/k8s-tutorial/app/localstack.md
---

ここまででローカル環境で開発する準備が整いました。
ここからは、実際に動くアプリケーションをローカル環境にデプロイしましょう。

このチュートリアルでは一般的によくあるであろうシンプルなWebアプリケーションとバッチアプリケーションを例に見ていきます。
題材としてはタスク管理ツールとします。このツールの機能としては以下になります。

- ユーザー向けに、Webブラウザからタスク登録、完了更新する機能（UI+API）
- 管理者向けに、日次で前日完了したタスクをレポートする機能(バッチジョブ)

これらを2回に分けて実装していきます。今回は1つ目のWebアプリケーションの方を見ていきましょう。
以下のような構成になります。

![](https://i.gyazo.com/f0b5f99296d14d9dc1dfeb33f91b02c9.png)

WebアプリケーションはVue.jsで作成されたユーザーインターフェースから、タスク管理API(task-service)を通じてバックエンドのDynamoDBにタスク情報を登録できるような非常にシンプルなものです。

[[TOC]]

## 事前準備

これまでローカル環境で準備したものを全て使用します。未セットアップの場合は以下を参考にローカル環境の開発環境を整えてください。

- [実行環境(minikube)](/containers/k8s/tutorial/app/minikube/)
- [自動化ツール(Skaffold)](/containers/k8s/tutorial/app/skaffold/)
- [ローカルAWS(LocalStack)](/containers/k8s/tutorial/app/localstack/)

なお、minikubeはDocker Desktopでも代用可能です。

## 利用するKubernetesリソース

さて、ここからすぐに作業に着手したいところですが、まずはアプリ開発で抑えておくべきKubernetesのリソース(オブジェクト)についての概要を説明します。
これまでも何度か出てきており、無意識に理解しているかもしれませんが、ここをきちんと理解するとできることの幅が広がります。
既に理解している場合はスキップして構いません。

### Service

Serviceは一群のPodが安定して機能を提供するために、主に以下の仕組みが実装されています[^1]。
[^1]: Serviceの詳細はKubernetesの[公式ドキュメント](https://kubernetes.io/docs/concepts/services-networking/service/)を参照してください。

- 静的エンドポイント提供：Pod群(つまりService)に対して静的なIPアドレス/ドメインを割り当てる
- サービスディカバリー：バックエンドのPod群に対してトラフィックを負荷分散する(kube-proxy)
- クラスタ外部への公開(ServiceType)：NodePortやLoadBalancer等を利用してサービスをクラスタ外部に公開する[^2]

これは内部DNS、ラベルセレクターによるルーティング先Podの動的管理、実際の負荷分散を担うkube-proxy等によって実現されています。
[^2]: 今回はIngressを使用するため、ここでは触れませんが、これを利用することで様々な形でクラスタ外部からのリクエストに応えることができます。詳細は[こちら](https://kubernetes.io/docs/concepts/services-networking/service/#publishing-services-service-types)を参照してください。

具体的にはServiceの生成が検知されると、Kubernetes内では以下のような動きをします(Service`foo`で3Podを管理する例)。

![](https://i.gyazo.com/bb8d4ca6846ef8cf57fa051420bfdb3a.png)

1. ServiceのドメインをControl Planeの内部DNSにServiceのエントリ(Aレコード/SRVレコード)を追加する[^3]
2. Serviceのラベルセレクターからルーティング対象のPodをルックアップして、PodのIPアドレス等をEndpointとして登録する
3. 各ノードに配置されているkube-proxy(Control Plane)は、Service/Endpointの情報からルーティングルール[^4]を更新する（実際にクライアントからリクエストがあった場合は、これを利用して各Podに負荷分散）。

[^3]: これについてはLocalStack構築時の[動作確認](/containers/k8s/tutorial/app/localstack/#動作確認)でも触れています。

[^4]: kube-proxyで使われる負荷分散は、デフォルトではLinuxのiptablesが使われており、ランダムアルゴリズムでルーティングされます。

この仕組みは初回のみでなく、関連するリソースに変更があった場合はループするようになっています(Control LoopとかReconciliation Loopと呼ばれます)。
配下のPodが新規生成や削除された場合は、この動作が再度実施されて常に最新状態に保たれるようになっています。

Serviceのもう1つ重要な役割として、ルーティングルールを正常なPodのみで構成する機能があります。これは以下のように動きます。
![](https://i.gyazo.com/7de15bfaba007e423a085813e306b372.png)

このように、ServiceリソースはPodに定義されたReadinessProbeのヘルスチェックの結果を監視し、異常を検知したPodはトラフィックルーティングから除外されます。
もちろんその後Podが復旧した場合は逆の動きをします(ルーティングルールに追加)。

### Deployment

Deploymentはアプリケーションの更新を宣言的に行うためのリソースです[^5]。

[^5]: 他にもStatefulSetやDaemonSetが存在します。詳細は[こちら(StatefulSet)](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)や[こちら(DaemonSet)](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)を参照してください。

DeploymentがなくてもPod単体でデプロイすることは可能ですが、新バージョンをリリースする場合にどうすればよいでしょうか？
最もシンプルな方法は旧バージョンを削除して新バージョンをデプロイすれば良いですが、ダウンタイムをなくすためには、Blue-Greenデプロイを使って旧バージョンと並行して新バージョンをリリースし、正常に動作確認が取れたら旧バージョンを削除する等の工夫が必要になるでしょう。
また、アプリケーションが複数レプリカで動作させる場合には、さらに複雑なデプロイ作業が必要になるでしょう。

Deploymentを導入することで、マニフェストに期待する状態を記載するだけで、それ以降のオペレーションはKubernetesに任せることができます。
Deploymentは主に以下の機能を提供します。

- レプリカ管理：Podで必要なレプリカ数を維持する。内部的にはReplicaSetを使用する。
- デプロイ：デプロイ戦略として順次更新(RollingUpdate)/と再生性(Recreate)を提供する。
- リビジョン管理：デプロイしたアプリケーションのバージョン管理を行い、ロールバック・デプロイ中断等の機能を提供する。

下図はRollingUpdateでアプリケーションをバージョンアップ(v1->v2)する例です。

![](https://i.gyazo.com/92b91ef9da86f34cdeadd78be91b95ae.png)

図では分かりにくいですが、Deploymentで新しいバージョンをデプロイすると、新バージョンのPodが少しずつ(デフォルトはレプリカ数の25%)起動し、ヘルスチェックが通って正常に起動すると今度は旧バージョンのPodがアンデプロイされていくようになります[^6]。

[^6]: Deploymentは極力レプリカ数を維持しながら順次アップデートをしていいきますので、一時的に指定したレプリカ数を超えるPod(新+旧)が起動することになります。多くのメモリやCPUを必要とするPodでRollingUpdateをする場合は、ノードのキャパシティに余裕をもたせる必要があります。

DeploymentはこのReplicaSetを履歴として管理していますので、過去のデプロイ履歴参照やロールバックは以下のコマンドで実行することが可能です。

```shell
# デプロイ履歴を一覧表示
kubectl rollout history deploy <deployment-name>
# 特定のリビジョンのデプロイ内容を詳細表示
kubectl rollout history deploy <deployment-name> --revision <rev-number>
# 特定のリビジョンのデプロイにロールバック
kubectl rollout undo deploy <deployment-name> --to-revision <rev-number>
```

### ConfigMap

## LocalStack

## Skaffold

## 動作確認