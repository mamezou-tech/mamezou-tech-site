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

Serviceは一群のPodが安定して機能を提供するために、主に以下の仕組みを提供します[^1]。
[^1]: Serviceの詳細はKubernetesの[公式ドキュメント](https://kubernetes.io/docs/concepts/services-networking/service/)を参照してください。

- 静的エンドポイント提供：Pod群(つまりService)に対して静的なIPアドレス/ドメインを割り当てる
- サービスディカバリー：バックエンドのPod群に対してトラフィックを負荷分散する(kube-proxy)

これは主に内部DNS、ラベルセレクターによるルーティング先Podの動的管理、実際の負荷分散を担うkube-proxy等によって実現されています。

具体的にはServiceの生成が検知されると、Kubernetes内では以下のような動きをします(3PodをService(`foo`)で管理する例)。

![](https://i.gyazo.com/e5ab50458eca53982548a6698fb3c1c1.png)

1. ServiceのドメインをControl Planeの内部DNSにServiceのエントリ(Aレコード/SRVレコード)を追加する[^2]
2. Serviceのラベルセレクターからルーティング対象のPodをルックアップして、PodのIPアドレス等をEndpointとして登録する
3. 各ノードに配置されているkube-proxy(Control Plane)は、Service/Endpointの情報からルーティングルールを更新する（実際にクライアントからリクエストがあった場合は、これを利用して各Podに負荷分散）。

[^2]: これについてはLocalStack構築時の[動作確認](/containers/k8s/tutorial/app/localstack/#動作確認)でも触れています。

kube-proxyで使われる負荷分散は、デフォルトではLinuxのiptablesが使われており、ランダムアルゴリズムでルーティングされます。
この仕組みは初回のみでなく、関連するリソースに変更があった場合はループするようになっています(Control LoopとかReconciliation Loopと呼ばれます)。
配下のPodが新規生成や削除された場合は、この動作が再度実施されて常に最新状態に保たれるようになっています。

Serviceでは、もう1つ重要な点としてReadinessProbeというヘルスチェックがあります。これは以下のように動きます。
1. Podに何かしらの障害が発生する。
2. ReadinessProbeのヘルスチェックがしきい値を超えて失敗する。
3. 上記の②の部分で障害が発生しているPodがEndpointから除外される(正確にはnotReadyAddressになる)。
4. この情報がkube-proxyに伝えられルーティングルールが更新される。これにより障害中のPodにはルーティングから除外される。
5. その後Podが再起動等で回復する。
6. 再びループが始まりEndpointが更新され、kube-proxyのルーティングルールが更新される。これにより該当Podは再度トラフィックを受け付ける

このようにして、正常なPodのみにトラフィックがルーティングされるようにするのもServiceリソースな役割です。

### Deployment

### ConfigMap

## LocalStack

## Skaffold

## 動作確認