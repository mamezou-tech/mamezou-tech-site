---
title: ストレージ - AWS EFS
author: noboru-kudo
date: 2021-11-14
tags: [aws]
prevPage: ./src/posts/k8s-tutorial/storage/ebs.md
---

[前回](/containers/k8s/tutorial/storage/ebs/)はAWS EBSを使ってコンテナにストレージをマウントすることで、Podの再起動時にもデータを消失することなく継続して利用することができました。

今回はNFSプロトコルを利用する共有ファイルストレージサービスである[AWS EFS](https://aws.amazon.com/jp/efs/)を使って複数Pod間でのファイル共有を実現します。
EFSはAZ内でのみ利用可能なEBSと異なり、同一リージョン内の複数AZに冗長化されるため、AZ障害が発生しても別のAZのノードから引き続き利用することが可能です。
逆に多数の読み書きが発生する際のパフォーマンスや、コストの点ではEBSに劣りますので、ユースケースに応じて選択する必要があります。

EFSについても[CSI(Container Storage Interface)](https://github.com/container-storage-interface/spec)ドライバが用意されているため、こちらを利用します。
公式リポジトリは以下になります。
- <https://github.com/kubernetes-sigs/aws-efs-csi-driver>

前回同様に今回も静的プロビジョニングと動的プロビジョニングの両方を試してみましょう。

[[TOC]]

## 事前準備
以下のいずれかの方法で事前にEKS環境を作成しておいてください。

- [AWS EKS(eksctl)](/containers/k8s/tutorial/infra/aws-eks-eksctl/)
- [AWS EKS(Terraform)](/containers/k8s/tutorial/infra/aws-eks-terraform/)

CSIドライバのインストールにk8sパッケージマネージャーの[helm](https://helm.sh/)を利用します。
未セットアップの場合は[こちら](https://helm.sh/docs/intro/install/) を参考にv3以降のバージョンをセットアップしてください。


## EFS CSIドライバのアクセス許可設定
EBS同様にEFSのCSIドライバがEFSに対してアクセスができるようにIAM PolicyとIAM Roleを作成します。
こちらもEKSクラスタ環境のセットアップ方法(eksctl/Terraform)によって手順が異なります。以下手順に応じてどちらかを実施してください。

### eksctl
環境構築にeksctlを利用している場合は今までと同様にeksctlのサブコマンドを利用してIRSAを構成します。

IRSAを利用するためにはOIDCプロバイダを有効化する必要があります。未実施の場合は以下のコマンドを実行してください。

```shell
eksctl utils associate-iam-oidc-provider \
    --cluster mz-k8s \
    --approve
```

まずはCSIドライバで使用するカスタムポリシーを作成します。
以下のコマンドでJSONファイルをダウンロードし、AWS上にカスタムポリシー作成しましょう(マネジメントコンソールから作成しても構いません)。

```shell
# Policyファイルダウンロード
curl -o efs-controller-policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-efs-csi-driver/master/docs/iam-policy-example.json
# カスタムポリシー作成
aws iam create-policy \
    --policy-name AWSEFSControllerIAMPolicy \
    --policy-document file://efs-controller-policy.json
```

次に作成したポリシーに対応するIAM Role/k8s ServiceAccountを作成します。
これについてはeksctlのサブコマンドで作成します。

```shell
eksctl create iamserviceaccount \
  --cluster=mz-k8s \
  --namespace=kube-system \
  --name=aws-efs-controller \
  --attach-policy-arn=arn:aws:iam::xxxxxxxxxxxx:policy/AWSEFSControllerIAMPolicy \
  --approve
```

実行するとeksctlがCloudFormationスタックを実行し、AWS上にIAM Role、k8s上に対応するServiceAccountが作成されます。

また、Controllerだけでなく、EFSをマウントするためのノードのポリシーも別途必要になります。
以下のJSONファイル(ここでは`efs-node-policy.json`としました)を用意しましょう。

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "elasticfilesystem:DescribeMountTargets",
        "ec2:DescribeAvailabilityZones"
      ],
      "Resource": "*"
    }
  ]
}
```

こちらのポリシーについても作成します。

```shell
# カスタムポリシー作成
aws iam create-policy \
    --policy-name AWSEFSNodeIAMPolicy \
    --policy-document file://efs-node-policy.json
```

先程同様にこれに対応するIAM Role/k8s ServiceAccountを作成します。

```shell
eksctl create iamserviceaccount \
  --cluster=mz-k8s \
  --namespace=kube-system \
  --name=aws-efs-node \
  --attach-policy-arn=arn:aws:iam::xxxxxxxxxxxx:policy/AWSEFSNodeIAMPolicy \
  --approve
```

CloudFormationの実行結果と作成されたIAM Roleをマネジメントコンソールで確認しておきましょう。

- CloudFormation
  ![](https://i.gyazo.com/a852ae24125f665c22925d309b8482c8.png)
- IAM Role
  - aws-efs-controller
    ![](https://i.gyazo.com/cede07304730743abe6b00adca6b4cce.png)
  - aws-efs-node
    ![](https://i.gyazo.com/12733751e5ac3953915f5ebba8116312.png)

ServiceAccountについてはkubectlで確認します。

```shell
kubectl get sa/aws-efs-controller sa/aws-efs-node -n kube-system -o yaml
```

```yaml
# 必要部分のみ抜粋・整形
kind: List
apiVersion: v1
items:
  - apiVersion: v1
    kind: ServiceAccount
    metadata:
      annotations:
        eks.amazonaws.com/role-arn: arn:aws:iam::xxxxxxxxxxxx:role/eksctl-mz-k8s-addon-iamserviceaccount-kube-s-Role1-U72PU1IQO2NP
      labels:
        app.kubernetes.io/managed-by: eksctl
      name: aws-efs-controller
      namespace: kube-system
    secrets:
      - name: aws-efs-controller-token-szqtw
  - apiVersion: v1
    kind: ServiceAccount
    metadata:
      annotations:
        eks.amazonaws.com/role-arn: arn:aws:iam::xxxxxxxxxxxx:role/eksctl-mz-k8s-addon-iamserviceaccount-kube-s-Role1-1JXEPD7H26K7Z
      labels:
        app.kubernetes.io/managed-by: eksctl
      name: aws-efs-node
      namespace: kube-system
    secrets:
      - name: aws-efs-node-token-nkfg8
```

`annotations`に上記IAM RoleのARNが指定されていることが分かります。

### Terraform

環境構築にTerraformを利用している場合は、`main.tf`に以下の定義を追加してください。

```hcl
resource "aws_iam_policy" "efs_csi_controller" {
  name = "AWSEFSControllerIAMPolicy"
  policy = file("${path.module}/efs-controller-policy.json")
}

module "efs_csi_controller" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-assumable-role-with-oidc"
  version = "~> 4.0"
  create_role                   = true
  role_name                     = "EKSEFSCsiController"
  provider_url                  = replace(module.eks.cluster_oidc_issuer_url, "https://", "")
  role_policy_arns              = [aws_iam_policy.efs_csi_controller.arn]
  oidc_fully_qualified_subjects = ["system:serviceaccount:kube-system:aws-efs-controller"]
}

resource "kubernetes_service_account" "efs_csi_controller" {
  metadata {
    name = "aws-efs-controller"
    namespace = "kube-system"
    annotations = {
      "eks.amazonaws.com/role-arn" = module.efs_csi_controller.iam_role_arn
    }
  }
}

resource "aws_iam_policy" "efs_csi_node" {
  name = "AWSEFSNodeIAMPolicy"
  policy = file("${path.module}/efs-node-policy.json")
}

module "efs_csi_node" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-assumable-role-with-oidc"
  version = "~> 4.0"
  create_role                   = true
  role_name                     = "EKSEFSCsiNode"
  provider_url                  = replace(module.eks.cluster_oidc_issuer_url, "https://", "")
  role_policy_arns              = [aws_iam_policy.efs_csi_node.arn]
  oidc_fully_qualified_subjects = ["system:serviceaccount:kube-system:aws-efs-node"]
}

resource "kubernetes_service_account" "efs_csi_node" {
  metadata {
    name = "aws-efs-node"
    namespace = "kube-system"
    annotations = {
      "eks.amazonaws.com/role-arn" = module.efs_csi_node.iam_role_arn
    }
  }
}
```

EBSのときとは違い、EFS CSIドライバはControllerとノードそれぞれにポリシーを用意する必要があります。それぞれ以下のことをしています。

- JSONファイルよりIAM Policyを作成し、CSIドライバ（Controllerおよびノード）がEFSにアクセスできるようにカスタムポリシーを作成
- CSIドライバが利用するIAM Roleを作成（EKSのOIDCプロバイダ経由でk8sのServiceAccountが引受可能）し、上記カスタムポリシーを指定
- k8s上にServiceAccountを作成して上記IAM Roleと紐付け

次に、Terraform内で利用するカスタムポリシーのJSONファイルをそれぞれ準備します。

- `efs-controller-policy.json`
```shell
curl -o efs-controller-policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-efs-csi-driver/master/docs/iam-policy-example.json
```
- `efs-node-policy.json`
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "elasticfilesystem:DescribeMountTargets",
        "ec2:DescribeAvailabilityZones"
      ],
      "Resource": "*"
    }
  ]
}
```

これをAWS/k8sクラスタ環境に適用します。
```shell
# Moduleを追加したため再度initコマンドを実行
terraform init
# 追加内容チェック
terraform plan
# AWS/EKSに変更適用
terraform apply
```

反映が完了したらマネジメントコンソールで確認してみましょう。
IAM Role/Policyは以下のようになります。
- aws-efs-controller
  ![](https://i.gyazo.com/15322579030df97d46584dbe59e55399.png)
- aws-efs-node
  ![](https://i.gyazo.com/7310786444e73e71544738f35eb2724f.png)

IAM Role/Policyが問題なく作成されています。

次にk8s側に作成したServiceAccountを確認します。

```shell
kubectl get sa/aws-efs-controller sa/aws-efs-node -n kube-system -o yaml
```

```yaml
# 必要部分のみ抜粋・整形
apiVersion: v1
kind: List
items:
  - apiVersion: v1
    automountServiceAccountToken: true
    kind: ServiceAccount
    metadata:
      annotations:
        eks.amazonaws.com/role-arn: arn:aws:iam::xxxxxxxxxxxx:role/EKSEFSCsiController
      name: aws-efs-controller
      namespace: kube-system
    secrets:
      - name: aws-efs-controller-token-njd5z
  - apiVersion: v1
    automountServiceAccountToken: true
    kind: ServiceAccount
    metadata:
      annotations:
        eks.amazonaws.com/role-arn: arn:aws:iam::xxxxxxxxxxxx:role/EKSEFSCsiNode
      name: aws-efs-node
      namespace: kube-system
    secrets:
      - name: aws-efs-node-token-vjf9d
```

指定したIAM RoleでそれぞれのServiceAccountリソースがNamespace`kube-system`に作成されていることが確認できます。

## EFS CSIドライバインストール

それではHelmでEFSのCSIドライバを導入しましょう。利用するHelm Chartは以下にホスティングされています。

<https://github.com/kubernetes-sigs/aws-efs-csi-driver/tree/master/charts/aws-efs-csi-driver>

まずはHelmチャートのリポジトリを追加します。

```shell
helm repo add aws-efs-csi-driver https://kubernetes-sigs.github.io/aws-efs-csi-driver
helm repo update
```

ではCSIドライバをインストールしましょう。Helmチャートは現時点で最新バージョンの`2.2.0`を使用します。

```shell
helm upgrade aws-efs-csi-driver aws-efs-csi-driver/aws-efs-csi-driver \
  --install --version 2.2.0 \
  --namespace kube-system \
  --set controller.serviceAccount.create=false \
  --set controller.serviceAccount.name=aws-efs-controller \
  --set node.serviceAccount.create=false \
  --set node.serviceAccount.name=aws-efs-node \
  --wait
```

パラメータでServiceAccount(controller/node)の生成を無効にして、先程作成したIAM Roleに紐付けしたものを指定しています。それ以外はデフォルトで構いません。

## EFSの作成

EFSは静的・動的プロビジョニングのどちらでも、事前にファイルシステムとそれに対応するマウントターゲットを準備する必要があります。
ここではAWSマネジメントコンソールまたはTerraformを用いて構築する方法を紹介します[^1]。
eksctlで環境を構築している場合はマネジメントコンソール[^2]、Terraformの場合はクラスタ環境に利用した設定に追記してEFSを作成しましょう。

[^1]: もちろんAWS CLIでも作成可能です。`aws efs create-file-system`/`aws efs create-mount-target`を利用して作成することが可能です。
[^2]: eksctlを使う場合でもCloudFormationやTerraform等のIaCツールを併用することがバージョン管理や自動化の観点で望ましいでしょう。

### マネジメントコンソール

1. マネジメントコンソールのEC2メニュー -> セキュリティグループを選択し、「セキュリティグループを作成」をクリックします。
![](https://i.gyazo.com/9c5a8bcf57a0ee9ec5ff9e1991d53ec4.png)

2. 以下の内容を入力し、EFS用のセキュリティグループを作成してください[^3]。
![](https://i.gyazo.com/5d94a18eeee461cabadb554cf4380d22.png)

3. マネジメントコンソールのEFSメニューより「ファイルシステム」を選択し、「ファイルシステムの作成」をクリックします。
![](https://i.gyazo.com/338acbbcb7ad1b68fdf829e4f0dd10e4.png)

4. ファイルシステム名を入力し、EKSのノードがデプロイされているVPCを選択(デフォルトVPCではありません)し、「カスタマイズ」ボタンをクリックします。
![](https://i.gyazo.com/d9133886f13d4a7b234de585d7083bf3.png)

5. 「ネットワークアクセス」ページまで進み、マウントターゲットに各AZのプライベートサブネットを選択し、先程作成したセキュリティグループを設定します。
![](https://i.gyazo.com/e663fb36c657c91f502c154011b2a7d9.png)

6. あとはそのまま最後まで進んでファイルシステムを作成してください。「ネットワークアクセス」で設定したマウントターゲットが「利用可能」になれば準備完了です。
![](https://i.gyazo.com/638425a8e90e3d289d2ed36927f8faac.png)

[^3]: 今回はインバウンドとして全て許可していますが、実運用ではセキュリティ観点からアクセスが必要なソースに限定するのが望ましいでしょう。

### Terraform

こちらはIaCツールのTerraformでEFSを作成します。
まず[AWS EKS(Terraform)](/containers/k8s/tutorial/infra/aws-eks-terraform/)で作成したTerraform実行ユーザー(`terraform`)にEFS作成のポリシーを追加しましょう。
今回はマネジメントコンソールより追加しますが、AWS CLI等でも構いません。

マネジメントコンソールよりIAMサービス -> ユーザーを選択し、`terraform`ユーザーを表示し、「インラインポリシーの追加」をクリックします[^4]。

[^4]: 手順簡略化のためインラインポリシーで作成していますが、もちろん専用のカスタムポリシーを作成しても構いません。その場合は「アクセス権限の追加」より編集してください。

![](https://i.gyazo.com/47aad62fe3093efe0f5b4c7c4ad40e0c.png)

ポリシーの作成で表示されるテキストエディタ内に以下のJSON[^5]をコピペして「ポリシーの確認」をクリックしください。

[^5]: EFSのフルアクセスを許可していますが、お使いのAWSセキュリティーポリシー上問題がある場合は権限を絞ってください。

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "elasticfilesystem:*",
            "Resource": "*"
        }
    ]
}
```
![](https://i.gyazo.com/6f04053e91145cab175602aba42b8d04.png)

任意のポリシー名を入力して「ポリシーの作成」をクリックすればterraformユーザーにEFSのアクセス許可を与えることができます。

![](https://i.gyazo.com/92a7b69c9962c9190d80f4f32f342f9d.png)

それではEFSの構成を記述していきましょう。`main.tf`に以下を追記します。

```hcl
resource "aws_efs_file_system" "this" {
  tags = {
    Name = "k8s-efs-test"
  }
  encrypted = true
}

resource "aws_security_group" "efs_mount_target" {
  name        = "efs-eks-sg"
  description = "EFS Mount point for EKS"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port        = 2049
    to_port          = 2049
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
  }

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
  }
}

resource "aws_efs_mount_target" "this" {
  count           = length(module.vpc.private_subnets)
  file_system_id  = aws_efs_file_system.this.id
  subnet_id       = module.vpc.private_subnets[count.index]
  security_groups = [aws_security_group.efs_mount_target.id]
}
```

以下3種類のリソース構成を作成しています。

- aws_efs_file_system: EFSのファイルシステムそのもの。
- aws_security_group: EFSにマウントターゲットに適用するセキュリティーグループ
- aws_efs_mount_target: EFSのマウントターゲット。全AZに適用(`count`フィールド)。

それではこちらを実行してEFS利用環境を構築しましょう。

```shell
# 追加内容チェック
terraform plan
# AWS/EKSに変更適用
terraform apply
```

実行が終わったらマネジメントコンソールからEFSの状態を確認しましょう。

![](https://i.gyazo.com/e752183e6d1b7001bfe75a6cad1b2802.png)

EFSが作成されてマウントターゲットのマウントターゲットの状態が「利用可能」となれば準備完了です。

## 静的プロビジョニング

それでは静的プロビジョニングでPodからEFSを利用可能にしてみましょう。

先程作成したEFSをk8sのPVリソースとして作成しましょう。
以下のようにYAMLファイル(ここでは`pv.yaml`)を作成しましょう。

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: efs-test-volume
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  # CSI設定
  csi:
    driver: efs.csi.aws.com
    # EFSのFileSystemID
    volumeHandle: fs-xxxxxxxxxxx
```

ファイル共有目的で利用を想定し、`accessModes`として、複数クライアントから読み書き可能な`ReadWriteMany`を指定しました。
`csi`部分では、今回使用するEFSのCSIドライバを指定します。`volumeHandle`には、先程作成したEFSのファイルシステムID(マネジメントコンソールから確認できます[^6])を設定してください。
EFSはストレージは自動拡張・縮小されるため、事前にサイズを指定する必要はありませんが、k8sでは`capacity`は必須フィールドのため有効な値を指定する必要があります。

[^6]: AWS CLIの場合は`aws efs describe-file-systems --query "FileSystems[*].FileSystemId"`で確認できます。

これでPVリソースを作成しましょう。

```shell
kubectl apply -f pv.yaml
```

ではPVの中身を確認してみましょう。

```shell
kubectl describe pv efs-test-volume
```

以下のようになっています。

```
# 必要部分のみ抜粋
Name:            efs-test-volume
Finalizers:      [kubernetes.io/pv-protection]
StorageClass:    
Status:          Available
Claim:           
Reclaim Policy:  Retain
Access Modes:    RWX
VolumeMode:      Filesystem
Capacity:        10Gi
Message:         
Source:
    Type:              CSI (a Container Storage Interface (CSI) volume source)
    Driver:            efs.csi.aws.com
    FSType:            
    VolumeHandle:      fs-xxxxxxxxxxx
    ReadOnly:          false
    VolumeAttributes:  <none>
```

先程のYAMLファイルの内容が反映されていることが分かります。現状はまだ誰もこれを利用していないため`Status`は`Available`となっています。

ではこのPVを利用してみましょう。利用するアプリがこのPVを利用するにはPVC(PersistentVolumeClaim)を作成し、ボリュームの利用をk8sに対して要求します。
新しいYAMLファイル(ここでは`pvc.yaml`)を作成しましょう。

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: efs-test-volume-pvc
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 10Gi
  storageClassName: ""
```

PVで指定したように`accessModes`で複数クライアントから読み書き可能(`ReadWriteMany`)なストレージを10GiB(`storage`フィールド)のサイズで要求しています。
`storageClassName`には動的プロビジョニングが動作しないように空文字を設定しています。

こちらでPVCリソースを作成しましょう。

```shell
kubectl apply -f pvc.yaml
```

作成後はPVCリソースについても中身を確認しましょう。

```shell
kubectl describe pvc efs-test-volume-pvc
```

```
# 必要部分のみ抜粋
Name:          efs-test-volume-pvc
Namespace:     default
StorageClass:  
Status:        Bound
Volume:        efs-test-volume
Labels:        <none>
Annotations:   pv.kubernetes.io/bind-completed: yes
               pv.kubernetes.io/bound-by-controller: yes
Finalizers:    [kubernetes.io/pvc-protection]
Capacity:      10Gi
Access Modes:  RWX
VolumeMode:    Filesystem
Used By:       <none>
```

`Status`をみると`Bound`となっており、作成したPVCがPVにバインディングされていることが分かります。
もう一度PVの方のステータスを見てみましょう。

```shell
kubectl get pv efs-test-volume
```

```
NAME              CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM                         STORAGECLASS   REASON   AGE
efs-test-volume   10Gi       RWX            Retain           Bound    default/efs-test-volume-pvc                           10m
```

`Status`が`Bound`となり、`CLAIM`として先程のPVCが設定されていることが確認できます。

EBSの方をセットアップされた方は気づいているかもしれませんが、EBSのときとほとんど同じインターフェースでEFSの設定ができていることが分かります。

では最後に利用するコンテナ側(アプリ)です。

今回は複数のbusyboxコンテナをそれぞれ別のDeploymentリソースから起動し、EFS内に作成したファイルが他のPodからも読み書きできることを確認します。

以下のYAMLファイル(ここでは`deployment.yaml`)を用意しましょう。

```yaml
# app1
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app1
spec:
  replicas: 1
  selector:
    matchLabels:
      app: app1
  template:
    metadata:
      labels:
        app: app1
    spec:
      containers:
        - name: app1
          image: busybox
          command: [sh, -c, "sleep 10000"]
          volumeMounts:
            - mountPath: /app/data
              name: data
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: efs-test-volume-pvc
---
# app2
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app2
spec:
  replicas: 1
  selector:
    matchLabels:
      app: app2
  template:
    metadata:
      labels:
        app: app2
    spec:
      containers:
        - name: app2
          image: busybox
          command: [sh, -c, "sleep 10000"]
          volumeMounts:
            - mountPath: /app/data
              name: data
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: efs-test-volume-pvc
```

基本はEBSのときと同様です。busyboxコンテナを起動して、sleepするだけの単純なものです。
それをDeploymentを2つ(app1/app2)用意し、両方において`volumes.persistentVolumeClaim.claimName`に先程作成したPVCを指定しています。

ではこちらをデプロイしましょう。

```shell
kubectl apply -f deployment.yaml
```

それではPodが起動していることを確認(`kubectl get pod`等)したら、実際にファイルを配置して各Pod間でデータが共有されているかを見てみましょう。
まずapp1に対してテストファイルを配置します。

```shell
POD1=$(kubectl get pod -o jsonpath='{.items[0].metadata.name}' -l app=app1)
kubectl exec $POD1 -- sh -c 'echo "app1:hello efs!" > /app/data/test.txt'
kubectl exec $POD1 -- cat /app/data/test.txt
```

次にapp2でファイルが参照されていることを確認します。

```shell
POD2=$(kubectl get pod -o jsonpath='{.items[0].metadata.name}' -l app=app2)
kubectl exec $POD2 -- cat /app/data/test.txt
```

`app1:hello efs!`と出力されることが確認できると思います。これでapp1とapp2にファイル共有が実現できていることが確認できました。
app2で同ファイルに追記してapp1側から内容を確認してみましょう。

```shell
kubectl exec $POD2 -- sh -c 'echo "app2:hello efs!" >> /app/data/test.txt'
kubectl exec $POD1 -- cat /app/data/test.txt
```

`app1:hello efs!`と`app2:hello efs!`の2行が出力されていれば確認OKです。
EFSはNFSプロトコルでAZを跨ってファイル共有可能ですので、Podが他のAZで起動していても同じファイルの読み書きを実施することができます。

マネジメントコンソールからも確認してみましょう。EFSメニューよりファイルシステム -> モニタリングと選択するとIOPSや接続数等のメトリクスが変動していることが確認できます[^7]。

[^7]: 残念ながら現状はマネジメントコンソールからEFSに配置したファイルの参照機能はないようです。

![](https://i.gyazo.com/ec9df795aa1dd7ff66faab5775231407.png)

## 動的プロビジョニング

それでは次は動的プロビジョニングの方で構成しましょう。

EBS同様にStorageClassというリソースを別途用意します。
YAMLファイル(ここでは`storageclass.yaml`)を作成し、以下を記述しましょう。

```yaml
kind: StorageClass
apiVersion: storage.k8s.io/v1
metadata:
  name: aws-efs
provisioner: efs.csi.aws.com
mountOptions:
  - tls
parameters:
  provisioningMode: efs-ap
  fileSystemId: fs-xxxxxxxxxxxxxxxxx
  directoryPerms: "700"
```

`provisioner`にEFSのCSIドライバを指定し、`parameters`にCSIドライバの必須フィールドを設定します。

現状EFSのCSIドライバは動的プロビジョニングは、[EFSのアクセスポイント](https://docs.aws.amazon.com/efs/latest/ug/efs-access-points.html)のみをサポートしています。
このため`provisioningMode`にはアクセスポイントでマウントを表す`efs-ap`を指定します。
また、`fileSystemId`には、EFSのファイルシステムIDをマネジメントコンソール等から取得したものを設定してください。
最後に`directoryPerms`にはマウントパスのパーミッションを指定します。今回は所有者が読み書きできるように700を指定しました[^8]。

[^8]: アクセスポイントを利用する場合は、マウントパス上はEFS CSIドライバで指定されるユーザーID(デフォルトは50000-の連番)でファイルが作成されます。

ではこれをk8sクラスタ環境に反映しましょう。

```shell
kubectl apply -f storageclass.yaml
```

作成したStorageClassを見てみましょう。

```shell
kubectl get sc
```

```
NAME            PROVISIONER             RECLAIMPOLICY   VOLUMEBINDINGMODE      ALLOWVOLUMEEXPANSION   AGE
aws-efs         efs.csi.aws.com         Delete          Immediate              false                  39s
gp2 (default)   kubernetes.io/aws-ebs   Delete          WaitForFirstConsumer   false                  5h56m
```

CSIドライバとしてインストールしたPROVISIONERを使用する`aws-efs`としてStorageClassが生成されていることが分かります。

これに対してPVCでストレージ要求を行うようにします。
YAMLファイル(`pvc.yaml`)を作成します。

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: efs-test-dynamic-pvc
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 10Gi
  storageClassName: aws-efs
```

静的プロビジョニングのときに利用したものとほとんど同じですが、`storageClassName`に先程作成したStorageClassの`aws-efs`を指定します。

こちらについても作成しましょう。

```shell
kubectl apply -f pvc.yaml
```

PVCの状態を確認しておきましょう。

```shell
kubectl get pvc efs-test-dynamic-pvc
```

```
NAME                   STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
efs-test-dynamic-pvc   Bound    pvc-4ea2196b-a789-40b8-96c1-159824c0bb90   10Gi       RWX            aws-efs        14s
```

`STATUS`/`VOLUME`からPVCが作成され、PVがマウントされていることが分かります。
バインドされたPVの方も見てみましょう。PV名は`VOLUME`の値に置き換えてください。

```shell
kubectl describe pv pvc-4ea2196b-a789-40b8-96c1-159824c0bb90
```

```
# 一部抜粋
Name:            pvc-4ea2196b-a789-40b8-96c1-159824c0bb90
Annotations:     pv.kubernetes.io/provisioned-by: efs.csi.aws.com
Finalizers:      [kubernetes.io/pv-protection]
StorageClass:    aws-efs
Status:          Bound
Claim:           default/efs-test-dynamic-pvc
Reclaim Policy:  Delete
Access Modes:    RWX
VolumeMode:      Filesystem
Capacity:        10Gi
Source:
    Type:              CSI (a Container Storage Interface (CSI) volume source)
    Driver:            efs.csi.aws.com
    FSType:            
    VolumeHandle:      fs-xxxxxxxxxxxxxx::fsap-xxxxxxxxxxxxxx
    ReadOnly:          false
    VolumeAttributes:      storage.kubernetes.io/csiProvisionerIdentity=1636851384129-8081-efs.csi.aws.com
```

動的プロビジョニングによって、自動的にPVが作成されていることが分かります[^9]。
`VolumeHandle`を見るとファイルシステムIDに続いて`fsap-xxxxxxxxxxxxxxx`というものが付加されています。これがEFSのアクセスポイントになります。

[^9]: EBSのときは`volumeBindingMode`に`WaitForFirstConsumer`を指定することで初回利用までPVの作成を遅延させましたが、EFS CSIドライバは現状これをサポートしていません。

実際にマネジメントコンソール(EFSメニュー -> アクセスポイント)からも確認できます。

![](https://i.gyazo.com/7235d4533f2bed077381ea60845f0832.png)

実際にAWS上にEFSのアクセスポイントが作成されていることが分かります[^10]。

[^10]: デフォルトではCSIドライバが自動的にアクセスポイント専用のパス`pvc-`プレフィックスで作成しますが、StorageClassの`parameters.basePath`でパス名を直接指定することも可能です。


ではこれをNFSマウントするPodを作成しましょう。
ファイル(`app.yaml`)は以下のようになります。

```yaml
# app1
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app1
spec:
  replicas: 1
  selector:
    matchLabels:
      app: app1
  template:
    metadata:
      labels:
        app: app1
    spec:
      containers:
        - name: app1
          image: busybox
          command: [sh, -c, "sleep 10000"]
          volumeMounts:
            - mountPath: /app/data
              name: data
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: efs-test-dynamic-pvc
---
# app2
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app2
spec:
  replicas: 1
  selector:
    matchLabels:
      app: app2
  template:
    metadata:
      labels:
        app: app2
    spec:
      containers:
        - name: app2
          image: busybox
          command: [sh, -c, "sleep 10000"]
          volumeMounts:
            - mountPath: /app/data
              name: data
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: efs-test-dynamic-pvc
```

静的プロビジョニングとの違いは、`volumes.persistentVolumeClaim.claimName`を先程StorageClassを使うように指定したPVCの名前に変更しました。
こちらでデプロイしましょう。

```shell
kubectl apply -f deployment.yaml
```

app1/app2のPodが正常に起動(`Running`)したことを確認してから、先程と同様にPod間でファイル共有できることを確認しましょう。

```shell
# app1にファイル作成・書き込み
POD1=$(kubectl get pod -o jsonpath='{.items[0].metadata.name}' -l app=app1)
kubectl exec $POD1 -- sh -c 'echo "app1:hello efs!" > /app/data/test.txt'
kubectl exec $POD1 -- cat /app/data/test.txt

# app2でファイル参照・追記
POD2=$(kubectl get pod -o jsonpath='{.items[0].metadata.name}' -l app=app2)
kubectl exec $POD2 -- cat /app/data/test.txt
kubectl exec $POD2 -- sh -c 'echo "app2:hello efs!" >> /app/data/test.txt'

# app1でファイル参照
kubectl exec $POD1 -- cat /app/data/test.txt
```

最終的に`app1:hello efs!`と`app2:hello efs!`の2行が出力されていれば確認OKです。

## クリーンアップ

本チュートリアルのリソースは以下で削除します。

```shell
kubectl delete deploy --all
kubectl delete pvc --all

kubectl delete pv --all

helm uninstall -n kube-system aws-efs-csi-driver
```

EFSをマネジメントコンソールから作成した場合は、マネジメントコンソールからマウントターゲット、ファイルシステム、セキュリティグループの順に削除してください。
Terraformで環境構築した場合は`terraform destroy`で一緒に削除されるためマネジメントコンソールから削除しないでください。

最後にクラスタ環境を削除します。こちらは環境構築編のクリーンアップ手順を参照してください。
- [AWS EKS(eksctl)](/containers/k8s/tutorial/infra/aws-eks-eksctl#クリーンアップ)
- [AWS EKS(Terraform)](/containers/k8s/tutorial/infra/aws-eks-terraform#クリーンアップ)
