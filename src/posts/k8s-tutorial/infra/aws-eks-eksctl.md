---
title: クラスタ環境構築 - AWS EKS (eksctl)
author: noboru-kudo
date: 2021-10-07
tags: [AWS, IaC]
nextPage: ./src/posts/k8s-tutorial/infra/aws-eks-terraform.md
---

AWSのKubernetesフルマネージドサービスのEKS(Elastic Kubernetes Service)でクラスタ環境を構築してみましょう。

今回クラスタの構築にはAWS公式のCLIツールの[eksctl](https://eksctl.io/)を利用します。

eksctlはWeaveworks社で開発されたEKSクラスタの構築・運用を容易にしてくれるCLIツールです。
このツールはAWSインフラ部分を抽象化してくれるので、AWSのことをよく知らない方でもEKS環境の構築が簡単になりました（実際の商用で利用する環境であればAWSの知識は必要ですが）。  
eksctl内部ではIaCツールとしてCloudFormationを利用しており、CloudFormationスタックを作成・更新していくスタイルになります。


## 事前準備

以下の3つのツールを事前にセットアップしましょう。

### eksctl
本記事でメインに利用します。現時点で最新の`0.68.0`を使います。
ローカル環境に応じて[こちら](https://eksctl.io/introduction/#installation)よりセットアップしてください。

ローカル環境にインストールできない場合は[Dockerコンテナ](https://hub.docker.com/r/weaveworks/eksctl)を使う方法もあります。

### kubectl
kubectlはk8sの操作するための必須ツールです。[こちら](https://kubernetes.io/docs/tasks/tools/#kubectl)を参照して準備してください。

### AWS CLI
ユーザー認証でAWS CLI(v2)も利用します。
v1利用または未セットアップの場合は[こちら](https://docs.aws.amazon.com/ja_jp/cli/latest/userguide/install-cliv2.html)を参考にインストールしてください。

## eksctlのアクセス許可設定
eksctlでクラスタの作成をするにはEKSだけでなく、VPCやCloudFormation等様々なアクセス許可をIAMユーザーに付与する必要があります。  
そのユーザーは広範囲のアクセス許可が必要となりますし、将来的にパイプライン上で実行することも踏まえてeksctl専用のIAMユーザーを作成しておくとよいでしょう。

必要最低限のポリシーについてeksctlのドキュメントに記載されています。
- <https://eksctl.io/usage/minimum-iam-policies/>

今回環境構築後のチュートリアルでIAMポリシーを作成することがありますので、`IamLimitedAccess`に以下を追加してください(`Resource`のARN内の`xxxxxxxxxxxx`は対象のAWSアカウントで置換してください)。

```json
{
  "Effect": "Allow",
  "Action": "iam:CreatePolicy",
  "Resource": "arn:aws:iam::xxxxxxxxxxxx:policy/*"
}
```

これでIAMユーザの作成とポリシーの設定をマネジメントコンソールから行います。

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
オプションは[YAMLファイル](https://eksctl.io/usage/schema/)として指定することもできますので、継続的に利用する場合はYAMLファイルとして作成してgit管理の対象とするのが望ましいでしょう。

今回はYAMLファイルでなく直接コマンドのオプションとして指定します。
以下のようにシンプルにクラスタ名のみを指定してクラスタを作成します。ここではクラスタ名を`mz-k8s`としていますが任意の名前で構いません。変更した場合は後続のクラスタ名は読み替えてください。
またデフォルトは25分でタイムアウトしますが、AWSの状況によってはこれを超えることもあるため長めに指定しておくとよいでしょう。

実運用では必要なキャパシティを満たすWorkerの数(`--nodes`)やインスタンスタイプ(`--node-type`)等を適切に設定する必要があります。

```shell
eksctl create cluster --name mz-k8s --timeout 40m
```

実行するとeksctlはCloudFormationスタック（VPC等のネットワークリソースやEKSクラスタ等）を作成し、AWS環境への適用を開始します。  
完了まではしばらくかかります。今回の構成では25分程度かかりました。気長に待ちましょう。

実行が完了したら早速作成したクラスタを見てみましょう。

まずはeksctlの動きを見てみます。前述の通りeksctlはIaCツールとしてCloudFormationを利用して各種リソースを作成しています。
マネジメントコンソールのCloudFormationを見てみると`eksctl-${CLUSTER_NAME}-`というプリフィックスでで複数のスタックが作成されています[^2]。

![](https://i.gyazo.com/ac96bd83580f0de6a84785af235f63dd.png)

[^2]: これらはeksctlのユーティリティコマンド`eksctl utils describe-stacks --name=mz-k8s`でも参照できます。

各スタックのテンプレートを見てみると以下のように各種リソースの構成が定義されています。これらはeksctlのオプションの設定内容により変わります。

| スタック名 | 内容
| --------- | --------------------------------------------------
| eksctl-mz-k8s-cluster | VPC、サブネット、NatGateway/InternetGateway等のネットワークやEKSクラスタリソース
| eksctl-mz-k8s-nodegroup-ng-92d271e3 | EKSのマネージドノードグループリソース(k8sのWorker)

最後にEKSクラスタをマネジメントコンソールで確認しましょう。EKSを選択すると以下のように作成されていることが分かります。

![](https://i.gyazo.com/81475ba5da1b37ec3ef665d8a4d8dfda.png)

現時点では最新のk8sは1.22ですが、2つ古い1.20で作成されたようです。ここはEKSのデフォルト値の状況によって変わります。
バージョンについてはクラスタ作成時に`--version`オプション指定することで希望するバージョンで作成することができます(もちろんEKSでサポートされるバージョンに限ります)。

設定 -> コンピューティング -> ノードグループと選択すると以下のようにマネージドノードグループの設定をみることができます。

![](https://i.gyazo.com/e0d7f8b83340934503a263bc23526837.png)

今回は特に指定しませんでしたので、eksctlデフォルトの2ノード、インスタンスタイプ`m5.large`でノードグループが構成されていることが分かります。
この部分はAWSの費用に大きく影響しますので注意しましょう。

## クラスタ環境への接続

それでは作成したEKSにローカル環境からkubectl経由で接続してみましょう。
eksctlはデフォルトでローカルのkubectlの接続設定であるkubeconfig(`~/.kube/config`)も更新してくれますので、クラスタ作成が終わると接続可能な状態になっています[^3]。

[^3]: `eksctl utils write-kubeconfig --name=$CLUSTER_NAME`コマンドで作成することもできます。

ではkubeconfigの中身を見てみましょう。

```shell
kubectl config view
```

以下に必要な部分を抜粋・整形したものを載せます。

```yaml
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

`users`セクションを見ると`aws-iam-authenticator`コマンドを利用してIAM認証でEKSにアクセスするように構成されていることが分かります[^4]。

[^4]: aws CLI v1.16.156以降では、`aws-iam-authenticator`は不要になったのですが、現時点ではeksctlの必須の依存ライブラリになっているようです。

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

## 開発者ユーザーのアクセス許可
現在の状態だとeksctlを実行したIAMユーザー(`eksctl`)のみがアクセス可能なクラスタです。
セキュリティ上の理由により`eksctl`ユーザーは環境構築用に限定し、各開発者は適切なポリシーで割り当てた専用IAMユーザーを使うのが一般的です。
EKSでは`aws-auth`というConfigMapリソースでAWSのIAM認証とk8sクラスタのRBACを紐付けることで一般の開発者がkubectlでクラスタにアクセスできるようになります。

まず、初期状態の`aws-auth`の内容を見てみましょう。
```shell
eksctl get iamidentitymapping --cluster mz-k8s
```

```
ARN												USERNAME				GROUPS
arn:aws:iam::xxxxxxxxxxx:role/eksctl-mz-k8s-nodegroup-ng-1b7d5d-NodeInstanceRole-1ILPNQD3IML3I	system:node:{{EC2PrivateDNSName}}	system:bootstrappers,system:nodes
```

クラスタ構築直後は1件のみ設定されています[^6]。
これはマネージドノードグループがNode管理やPodのスケジューリング等のインフラタスクを実行する上で必要なもので、これを削除・変更してはいけません(確実にクラスタ壊れます)。

[^6]: EKS on Fargateでセットアップした場合はFargateプロファイルについても設定されています。

EKSでは、これにクラスタにアクセスするIAM UserまたはRoleを追加することで、該当の開発者がクラスタにアクセスできるようになります。
これの実態は通常のk8sのConfigMapリソースなので直接更新してもよいのですが、eksctlには専用のサブコマンドが用意されていますのでそちらを利用しましょう。

マネジメントコンソールから別途IAMユーザー(ここでは`noboru-kudo`)を作成した後、以下のコマンドでクラスタアクセスを許可するようにします。

```shell
eksctl create iamidentitymapping --cluster mz-k8s \
  --arn arn:aws:iam::xxxxxxxxxxx:user/noboru-kudo \
  --group system:masters \
  --username noboru-kudo
```

`arn`オプションには作成したIAMユーザーのARNを指定しましょう（マネジメントコンソールから参照できます）。
`username`は任意ですがAWS側とマッピングしやすくするためにIAMユーザー名に合わせるのが無難でしょう。スイッチロールで他のアカウントのIAMユーザを指定する場合はそのRoleのARNを指定します。
`group`にはk8sのGroup名を指定します。今回は`system:masters`（管理者権限）を割り当てていますが、実運用では必要最低限のアクセス許可を持った専用のClusterRole/RoleとClusterRoleBinding/RoleBindingを作成して割り当てるようにしましょう([k8sのRBACガイド](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)参照)。
例えば、以下のような参照用の権限を作成した場合は`system:masters`ではなく`readonly`を指定します。

```yaml
kind: ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: readonly
subjects:
- kind: Group
  name: readonly # これを指定
  apiGroup: rbac.authorization.k8s.io
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: view # k8s組み込みの参照用ロール
```

それでは実行結果を見てみましょう。今度は直接ConfigMapリソース`aws-auth`の中身を直接見てみます。

```shell
kubectl get cm aws-auth -n kube-system -o yaml
```
```yaml
# 一部省略/整形
apiVersion: v1
kind: ConfigMap
metadata:
  name: aws-auth
  namespace: kube-system
data:
  mapRoles: |
    - groups:
      - system:bootstrappers
      - system:nodes
      rolearn: arn:aws:iam::xxxxxxxxxxxx:role/eksctl-mz-k8s-nodegroup-ng-1b7d5d-NodeInstanceRole-1ILPNQD3IML3I
      username: system:node:{{EC2PrivateDNSName}}
  mapUsers: |
    - groups:
      - system:masters
      userarn: arn:aws:iam::xxxxxxxxxxxx:user/noboru-kudo
      username: noboru-kudo
```

`mapUsers`セクションに今回追加したIAMユーザーが登録されていることが分かります。
別のターミナルを開いて登録したIAMユーザーでクラスタが参照できることを確認しましょう。
まずAWS CLIのバージョンがv2以降であることを確認しましょう(v1ではこの手順は機能しません)。

```shell
aws --version
```

```
aws-cli/2.2.44 Python/3.8.8 Darwin/20.6.0 exe/x86_64 prompt/off
```

続いて追加したユーザーのAWS CLIの設定を完了させましょう。
作成したIAMユーザーのアクセスキー、シークレットをセットアップしてください。

```shell
aws configure
```

ではEKSクラスタの認証(kubeconfig)をセットアップしましょう。以下のawsコマンドでkubeconfigが更新されます。

```shell
aws eks update-kubeconfig --name mz-k8s
```

先程同様にkubeconfigの内容を見てみましょう。
```shell
kubectl config view
```

```yaml
# 必要な部分のみ抜粋・編集
apiVersion: v1
kind: Config
clusters:
  - cluster:
      certificate-authority-data: DATA+OMITTED
      server: https://xxxxxxxxxxxxxxxxxxxxxxxxxxxx.yl4.ap-northeast-1.eks.amazonaws.com
    name: arn:aws:eks:ap-northeast-1:xxxxxxxxxxxx:cluster/mz-k8s
contexts:
  - context:
      cluster: arn:aws:eks:ap-northeast-1:xxxxxxxxxxxx:cluster/mz-k8s
      user: arn:aws:eks:ap-northeast-1:xxxxxxxxxxxx:cluster/mz-k8s
    name: arn:aws:eks:ap-northeast-1:xxxxxxxxxxxx:cluster/mz-k8s
current-context: arn:aws:eks:ap-northeast-1:xxxxxxxxxxxx:cluster/mz-k8s
users:
  - name: arn:aws:eks:ap-northeast-1:xxxxxxxxxxxx:cluster/mz-k8s
    user:
      exec:
        apiVersion: client.authentication.k8s.io/v1alpha1
        args:
          - --region
          - ap-northeast-1
          - eks
          - get-token
          - --cluster-name
          - mz-k8s
        command: aws
        env:
          - name: AWS_PROFILE
            value: default
        interactiveMode: IfAvailable
        provideClusterInfo: false
```

`aws eks get-token`コマンドでIAMユーザーEKSクラスタの認証ステップが登録されていることが確認できます。
以下のコマンドで先程同様にEKSクラスタの情報が表示されていればセットアップ完了です。

```shell
kubectl cluster-info
```

以降の動作確認は引き続きこのIAMユーザーで実施します。

## 動作確認

最後に作成したクラスタ環境と開発用のIAMユーザー(ここでは`noboru-kudo`)で簡単に動作確認してみましょう。Nginxのコンテナをデプロイしてみます。

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
それではこの公開エンドポイントに対してブラウザからアクセスしてみましょう。

![](https://i.gyazo.com/9b20756707bb6ba5dc27b7368ccfc012.png)

NginxのWelcomeページにアクセスできれば確認完了です。
DNSが伝播されるまで少し時間がかかりますので接続できない場合はしばらく待ってからリトライしてください。

## クリーンアップ
EKSはControl Planeだけでなく、マネージドノード自体の課金もありますので使わなくなったものは削除しましょう。

eksctlユーザーのターミナルに戻って以下のコマンドで全てのリソースを削除してしまいましょう。

```shell
# VPC,EKS削除
eksctl delete cluster --name mz-k8s
```

これでVPCやEKSクラスタに加えて、ServiceリソースのLoadBalancer作成に伴って作成されたELBも削除されます[^7]。

[^7]: 以前は、k8s経由で作成したリソースは事前に削除しないと失敗しましたが、最近のeksctlは自動で作成されたELB含めて削除してくれるようです。

---
参照資料

- AWSドキュメント: <https://docs.aws.amazon.com/ja_jp/eks/latest/userguide/getting-started-eksctl.html>
- eksctlドキュメント：<https://eksctl.io/>