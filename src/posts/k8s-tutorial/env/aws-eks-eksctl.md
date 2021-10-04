---
title: クラスタ環境構築 - AWS EKS (eksctl)
author: noboru-kudo
---

AWSのKubernetesフルマネージドサービスのEKS(Elastic Kubernetes Service)でクラスタ環境を構築してみましょう。

今回クラスタの構築にはAWS公式のCLIツールの[eksctl](https://eksctl.io/)を利用します。

eksctlはWeaveworks社で開発されたEKSクラスタの構築・運用を容易にしてくれるCLIツールです。
このツールはAWSインフラ部分を抽象化してくれるのでAWSのことをよく知らない方でもEKS環境の構築が簡単になりました（実際の商用で利用する環境であればAWSの知識は必要ですが）。  
eksctlはIaCツールとしてCloudFormationを利用しており、クラスタの運用はスタックを作成・更新していくスタイルになります。

## 事前準備
まずはeksctlをローカルマシンにセットアップします(現時点で最新の`0.68.0`を使います)。

```shell
brew tap weaveworks/tap
brew install weaveworks/tap/eksctl
```

上記はHomeBrewを利用していますが、Mac以外の場合は[こちら](https://eksctl.io/introduction/#installation)を参考にインストールすればOKです。

また、ローカル環境にインストールできない場合は[Dockerコンテナ](https://hub.docker.com/r/weaveworks/eksctl)を使う方法もあります。

kubectlはk8sの操作するための必須ツールです。
[こちら](https://kubernetes.io/docs/tasks/tools/#kubectl)を参照して準備してください。

## アクセス許可設定
eksctlでクラスタの作成をするにはEKSだけでなく、VPCやCloudFormation等様々なアクセス許可をIAMユーザーに付与する必要があります。  
そのユーザーは広範囲のアクセス許可が必要となりますし、将来的にパイプライン上で実行することも踏まえてeksctl専用のIAMユーザーを作成しておくとよいでしょう。

最小限のポリシーについてはeksctlのドキュメントに記載されていますので、IAMユーザの作成とポリシーの設定をマネジメントコンソールから行います。
- <https://eksctl.io/usage/minimum-iam-policies/>

ポリシーを設定したIAMユーザー(eksctl)は以下のようになります。
![](https://i.gyazo.com/408a2bb6d88f138bb21976435648d276.png)

上記で作成したIAMユーザーのアクセスキー、シークレットを環境変数に指定します。

```shell
export AWS_ACCESS_KEY_ID=xxxxxxxxxxxxxxx
export AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxx
export AWS_DEFAULT_REGION=ap-northeast-1
```

## Kubernetesクラスタ環境構築
それではeksctlを使ってクラスタ環境を作成してみましょう。新規クラスタの構築にはeksctlの`create cluster`サブコマンドを使います。

このコマンドには様々なオプションが用意されており、これらを指定することで詳細なチューニングを行うことができます。
オプションは[Yamlファイル](https://eksctl.io/usage/schema/)として指定することもできますので、継続的に利用する場合はYamlファイルとして作成してgit管理の対象とするのが望ましいでしょう。

今回はYamlファイルでなく直接コマンドのオプションとして指定します。
以下のようにシンプルにクラスタ名とIRSA[^1]が使えるようにOIDCプロバイダを有効にしてクラスタを作成します。
またデフォルトは25分でタイムアウトしますが、AWSの状況によってはこれを超えることもあるため長めに指定しておくと良いでしょう。

実運用では必要なキャパシティを満たすWorkerの数(`--nodes`)やインスタンスタイプ(`--node-type`)等を適切に設定する必要があります。

[^1]: IAM Roles for Service Account。PodのAWSリソースアクセスを管理する機能。公式ドキュメントは[こちら](https://docs.aws.amazon.com/ja_jp/eks/latest/userguide/iam-roles-for-service-accounts.html)参照。

```shell
eksctl create cluster --name mz-k8s --with-oidc --timeout 40m
```

実行するとeksctlはCloudFormationスタック（VPC等のネットワークリソースやEKSクラスタ等）を作成し、AWS環境への適用を開始します。  
完了まではしばらくかかります。今回の構成では25分程度かかりました。気長に待ちましょう。

実行が完了したら早速作成したクラスタを見てみましょう。

まずはeksctlの動きを見てみます。前述の通りeksctlはIaCツールとしてCloudFormationを利用して各種リソースを作成しています。
マネジメントコンソールのCloudFormationを見てみると`eksctl-${CLUSTER_NAME}-`というプリフィックスでで複数のスタックが作成されています[^2]。

![](https://i.gyazo.com/45cca0f45ad278defd180a3d6f25e5f4.png)

[^2]: これらはeksctlのユーティリティコマンド`eksctl utils describe-stacks --name=mz-k8s`でも参照できます。

各スタックのテンプレートを見てみると以下のように各種リソースの定義が定義されています。これらはeksctlのオプションの設定内容により変わります。

| スタック名 | 内容
| --------- | --------------------------------------------------
| eksctl-mz-k8s-cluster | VPC、サブネット、NatGateway/InternetGateway等のネットワークやEKSクラスタリソース
| eksctl-mz-k8s-nodegroup-ng-92d271e3 | EKSのマネージドノードグループリソース(k8sのWorker)
| eksctl-mz-k8s-addon-iamserviceaccount-kube-system-aws-node | IRSAで利用するIAMロール

最後にEKSクラスタをマネジメントコンソールで確認しましょう。EKSを選択すると以下のように作成されていることが分かります。

![](https://i.gyazo.com/81475ba5da1b37ec3ef665d8a4d8dfda.png)

現時点では最新のk8sは1.21ですが、1つ古い1.20で作成されたようです。
バージョンについてはクラスタ作成時に`--version`オプション指定することで希望するバージョンで作成することができます(もちろんEKSでサポートされるバージョンに限ります)。

設定 -> コンピューティング -> ノードグループと選択すると以下のようにマネージドノードグループの設定をみることができます。

![](https://i.gyazo.com/e0d7f8b83340934503a263bc23526837.png)

今回は特に指定しませんでしたので、eksctlデフォルトの2ノード、インスタンスタイプ`m5.large`でノードグループが構成されていることが分かります。
この部分はAWSの費用に大きく影響しますので注意しましょう。

## クラスタ環境への接続

それでは作成したEKSにローカル環境からkubectl経由で接続してみましょう。
eksctlはデフォルトでローカルのkubectlの接続設定(`~/.kube/config`)も更新してくれますので、クラスタ作成が終わると接続可能な状態になっています[^3]。

[^3]: `eksctl utils write-kubeconfig --name=$CLUSTER_NAME`コマンドで作成することもできます。

ではkubeconfigの中身を見てみましょう。

```shell
kubectl config view
```

以下に必要な部分を抜粋・整形したものを載せます。

```
apiVersion: v1
kind: Config
clusters:
- cluster:
    certificate-authority-data: DATA+OMITTED
    server: https://xxxxxxxxxxxxxxxxxxx.gr7.ap-northeast-1.eks.amazonaws.com
  name: mz-k8s.ap-northeast-1.eksctl.io
contexts:
- context:
    cluster: mz-k8s.ap-northeast-1.eksctl.io
    user: eksctl@mz-k8s.ap-northeast-1.eksctl.io
  name: eksctl@mz-k8s.ap-northeast-1.eksctl.io
users:
- name: eksctl@mz-k8s.ap-northeast-1.eksctl.io
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1alpha1
      args:
      - token
      - -i
      - mz-k8s
      command: aws-iam-authenticator
      env:
      - name: AWS_STS_REGIONAL_ENDPOINTS
        value: regional
      - name: AWS_DEFAULT_REGION
        value: ap-northeast-1
      interactiveMode: IfAvailable
      provideClusterInfo: false
```

usersセクションを見ると`aws-iam-authenticator`コマンドを利用してIAM認証でEKSにアクセスするように構成されていることが分かります[^4]。

[^4]: aws CLI 2.xでは`aws-iam-authenticator`不要になったのですが現時点ではeksctlの必須の依存ライブラリになっているようです。

クラスタ情報を見てみましょう。

```shell
kubectl cluster-info
```

```
Kubernetes control plane is running at https://xxxxxxxxxxxxxxxxx.gr7.ap-northeast-1.eks.amazonaws.com
CoreDNS is running at https://xxxxxxxxxxxxxxxxx.gr7.ap-northeast-1.eks.amazonaws.com/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy
```

k8sのControl PlaneとCoreDNSの接続先情報が表示されました。kubectlはこのControl Planeと接続して各種リソースの作成・更新等を行います。

最後にNodeリソースの方を見てみましょう。

```shell
kubectl get node -o wide
```

```
NAME                                                STATUS   ROLES    AGE   VERSION              INTERNAL-IP      EXTERNAL-IP     OS-IMAGE         KERNEL-VERSION                CONTAINER-RUNTIME
ip-192-168-60-212.ap-northeast-1.compute.internal   Ready    <none>   98m   v1.20.7-eks-135321   192.168.60.212   35.73.228.54    Amazon Linux 2   5.4.144-69.257.amzn2.x86_64   docker://19.3.13
ip-192-168-77-193.ap-northeast-1.compute.internal   Ready    <none>   98m   v1.20.7-eks-135321   192.168.77.193   54.64.218.240   Amazon Linux 2   5.4.144-69.257.amzn2.x86_64   docker://19.3.13
```

NodeのOSイメージはAmazon Linux2、コンテナランタイムはDocker[^5]が使われているようです。

[^5]: k8s v1.23ではdocker-shimのサポートが削除される予定ですので新しいバージョンでは変更になると思います。

## 動作確認

作成したクラスタ環境で簡単に動作確認してみましょう。Nginxのコンテナをデプロイしてみます。

```shell
# Podリソース作成
kubectl run nginx --restart Never --image nginx
# ServiceリソースをLoadBalancerとして公開
kubectl expose pod nginx --port 80 --type LoadBalancer
```

NginxのPodとそれに対応するServiceリソースを外部公開のロードバランサーとして作成しました。内容を確認してみましょう。

```shell
kubectl get pod,service -l run=nginx
```

```
NAME        READY   STATUS    RESTARTS   AGE
pod/nginx   1/1     Running   0          3m18s

NAME                 TYPE           CLUSTER-IP      EXTERNAL-IP                                                                    PORT(S)        AGE
service/nginx        LoadBalancer   10.100.44.191   xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.ap-northeast-1.elb.amazonaws.com   80:30072/TCP   76s
```

service/nginxの`EXTERNAL-IP`の値が公開エンドポイントになります(`CLUSTER-IP`はクラスタ内のもので外部からアクセスはできません)。

内部的にはServiceリソースの作成をEKSが検知すると、外部からのトラフィックをルーティングするためのELBを作成します。
実際にマネジメントコンソールからも確認することができます。

![](https://i.gyazo.com/bcf096bb54a7af4a7508e6dfa380f1ca.png)

このELBがマネージドノードに対して外部からのリクエストをルーティングしていることが分かります。
それではこの公開エンドポイントに対してcurlでアクセスしてみましょう。

```shell
curl xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.ap-northeast-1.elb.amazonaws.com
```

```
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
html { color-scheme: light dark; }
body { width: 35em; margin: 0 auto;
font-family: Tahoma, Verdana, Arial, sans-serif; }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>

<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>

<p><em>Thank you for using nginx.</em></p>
</body>
</html>
```

NginxのWelcomeページにアクセスできていることが分かります。

## 6. クリーンアップ
EKSはControl Planeだけでなく、マネージドノード自体の課金もありますので使わなくなったものは削除しましょう。

まずは先程作成したPod/Serviceリソースを削除しておきます。

```shell
kubectl delete svc/nginx pod/nginx
```

LoadBalancerタイプのServiceリソースが削除されるとEKSはこれを検知して未使用になったELBリソースを削除します。
マネジメントコンソールからELBが削除されたことを確認した後[^6]はeksctlで一気に削除してしまいましょう。

[^6]: 以前は事前に削除しないと`eksctl delete cluster`で失敗しましたが最近のeksctlはk8s内で自動作成したELBも削除してくれるようです。

```shell
# VPC,EKS削除
eksctl delete cluster --name mz-k8s
```

---
参照資料

- AWSドキュメント: <https://docs.aws.amazon.com/ja_jp/eks/latest/userguide/getting-started-eksctl.html>
