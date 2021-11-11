---
title: ストレージ - AWS EFS
author: noboru-kudo
---

[前回](/containers/k8s/tutorial/storage/ebs)はAWS EBSを使ってコンテナにストレージをマウントすることで、Podの再起動時にもデータを消失することなく永続化することができました。

今回はNFSプロトコルを利用する共有ファイルストレージサービスである[AWS EFS](https://aws.amazon.com/jp/efs/)を使って複数Pod間でのファイル共有を実現します。
EFSの場合はAZ内でのみ利用可能なEBSと異なり、同一リージョン内の複数AZに冗長化されるため、AZ障害が発生しても別のAZのノードから引き続き利用することが可能です。
逆に多数の読み書きが発生する際のパフォーマンスや、コストの点ではEBSに劣りますので、ユースケースに応じて選択する必要があります。

EFSについても[CSI(Container Storage Interface)](https://github.com/container-storage-interface/spec)ドライバが用意されているため、こちらを利用します。
公式リポジトリは以下になります。
- <https://github.com/kubernetes-sigs/aws-efs-csi-driver>

前回同様に今回も静的プロビジョニングと動的プロビジョニングの両方を試してみましょう。

## 事前準備
以下のいずれかの方法で事前にEKS環境を作成しておいてください。

- [AWS EKS(eksctl)](/containers/k8s/tutorial/infra/aws-eks-eksctl)
- [AWS EKS(Terraform)](/containers/k8s/tutorial/infra/aws-eks-terraform)

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

また、Controllerだけでなく、EFSはマウント対象ノードのポリシーも別途必要になります。
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

マネジメントコンソールで確認してみましょう。

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

### Terraform TODO:見直し

環境構築にTerraformを利用している場合は、`main.tf`に以下の定義を追加してください。

```hcl
resource "aws_iam_policy" "efs_csi" {
  name = "AWSEFSControllerIAMPolicy"
  policy = file("${path.module}/efs-controller-policy.json")
}

module "efs_csi" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-assumable-role-with-oidc"
  version = "~> 4.0"
  create_role                   = true
  role_name                     = "EKSEFSCsiDriver"
  provider_url                  = replace(module.eks.cluster_oidc_issuer_url, "https://", "")
  role_policy_arns              = [aws_iam_policy.efs_csi.arn]
  oidc_fully_qualified_subjects = ["system:serviceaccount:kube-system:aws-efs-controller"]
}

resource "kubernetes_service_account" "efs_csi" {
  metadata {
    name = "aws-efs-controller"
    namespace = "kube-system"
    annotations = {
      "eks.amazonaws.com/role-arn" = module.efs_csi.iam_role_arn
    }
  }
}
```
以下のことをしています。

- JSONファイルよりIAM Policyを作成し、CSIドライバがEFSにアクセスできるようにカスタムポリシーを作成
- CSIドライバが利用するIAM Roleを作成（EKSのOIDCプロバイダ経由でk8sのServiceAccountが引受可能）し、上記カスタムポリシーを指定
- k8s上にServiceAccountを作成して上記IAM Roleと紐付け

これをAWS/k8sクラスタ環境に適用します。
```shell
# Policyファイルダウンロード
curl -o efs-controller-policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-efs-csi-driver/master/docs/iam-policy-example.json
# 追加内容チェック
terraform plan
# AWS/EKSに変更適用
terraform apply
```

反映が完了したらマネジメントコンソールで確認してみましょう。
IAM Role/Policyは以下のようになります。
![](https://i.gyazo.com/1337b3a744402bff6acaf7e6d9f62c7e.png)

IAM Role/Policyが問題なく作成されています。

次にk8sのServiceAccountは以下のように確認できます。

```shell
kubectl get sa aws-efs-controller -n kube-system -o yaml
```

```yaml
# 必要部分のみ抜粋・整形
apiVersion: v1
automountServiceAccountToken: true
kind: ServiceAccount
metadata:
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::xxxxxxxxxxxx:role/EKSEFSCsiDriver
  name: aws-efs-controller
  namespace: kube-system
secrets:
  - name: aws-efs-controller-token-d4kk2
```

指定したIAM RoleでServiceAccountリソースがNamespace`kube-system`に作成されていることが確認できます。

## EFS CSIドライバインストール

それではHelmでEFSのCSIドライバを導入しましょう。Helm Chartは以下にホスティングされています。

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

パラメータでServiceAccountの生成を無効にして先程作成したIAM Roleに紐付けしたものを指定しています。それ以外はデフォルトで構いません。


## 静的プロビジョニング

それでは静的プロビジョニングを構成してみましょう。
こちらもEBS同様に事前にEFSを作成しておく必要があります。ただし、標準設定だとEFSはAZに依存しませんのでEBSのようにAZを意識する必要はありません。

以下のコマンドでAWS上にEFSとマウントポイントを作成します(マネジメントコンソールからでも構いません)。
後で利用するので出力結果から`FileSystemId`の値(`fs-xxxxxxxxxxx`)を控えておきましょう。

```shell
# EFS作成
aws efs create-file-system --tags Key=Name,Value=k8s-efs-test
```

デフォルト設定でEFSを作成しました（指定可能なパラメータは[こちら](https://docs.aws.amazon.com/cli/latest/reference/efs/create-file-system.html)を参照）。

マネジメントコンソールから作成したEFSを確認してみましょう。EFSメニューから参照することができます。
![](https://i.gyazo.com/6eb907088415964072ed22fa1bd8ad89.png)

次にNFSのマウントターゲットを作成します。NFSにマウントするにはVPC内のk8sノードの配置されているプライベートサブネットにマウントターゲットを作成する必要があります。
リージョン内の全AZから利用できるよう全てのプライベートサブネットに対して作成しましょう。
以下はAWS CLIで作成していますが、結構煩雑なのでマネジメントコンソールから作成しても構いません(EFSメニュー -> ファイルシステム選択 -> ネットワーク -> マウントターゲットを作成)。

```shell
# k8sが配置されているVPC ID取得
aws ec2 describe-vpcs
# マウントポイント用のセキュリティグループ
aws ec2 create-security-group --region ap-northeast-1 \
  --group-name efs-eks-sg \
  --vpc-id vpc-063e883e24d7055c2 \
  --description "EFS Mount point for EKS"
# 出力結果よりGroupId取得
aws ec2 authorize-security-group-ingress \
  --group-id sg-0aeca0534c3b45823 \
  --protocol tcp \
  --port 2049 \
  --cidr 0.0.0.0/0 \
  --region ap-northeast-1

# プライベートサブネットID取得
aws ec2 describe-subnets --filters Name=vpc-id,Values=vpc-063e883e24d7055c2 \
  --query 'Subnets[?MapPublicIpOnLaunch==`false`].SubnetId' --output text
# 出力された全サブネットにマウントターゲット作成
aws efs create-mount-target --file-system-id fs-0bd9d0366b39c6d35 --subnet-id subnet-0791edaa01fed3ede \
  --security-groups sg-0aeca0534c3b45823
aws efs create-mount-target --file-system-id fs-0bd9d0366b39c6d35 --subnet-id subnet-02475d48da09be36e \
  --security-groups sg-0aeca0534c3b45823
aws efs create-mount-target --file-system-id fs-0bd9d0366b39c6d35 --subnet-id subnet-074adcf1ddcd88f79 \
  --security-groups sg-0aeca0534c3b45823
```

これでEFS側の準備が整いました。

では、EBS同様に作成したEFSをk8sのPVリソースとして作成しましょう。
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
また`csi`部分で今回使用するEFSのCSIドライバを指定し、`volumeHandle`に先程作成したEFSの`FileSystemId`を設定してください[^1]。
EFSはストレージは自動拡張・縮小されるため、事前にサイズを指定する必要はありませんが、k8sでは`capacity`は必須フィールドのため有効な値を指定する必要があります。

[^1]: 忘れてしまった場合はマネジメントコンソールまたはAWS CLI(`aws efs describe-file-systems --query "FileSystems[*].FileSystemId"`)で確認できます。

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

Podがデプロイ時にボリュームのマウントを始まります。Podリソースのイベントを確認してみます。

```shell
POD1=$(kubectl get pod -o jsonpath='{.items[0].metadata.name}' -l app=app1)
kubectl describe pod $POD1
POD2=$(kubectl get pod -o jsonpath='{.items[0].metadata.name}' -l app=app1)
kubectl describe pod $POD2
```

```
# Eventsのみ抜粋
Events:
  Type    Reason                  Age   From                     Message
  ----    ------                  ----  ----                     -------
  Normal  Scheduled               43s   default-scheduler        Successfully assigned default/app-5776847dd9-896vs to ip-10-0-1-90.ap-northeast-1.compute.internal
  Normal  SuccessfulAttachVolume  41s   attachdetach-controller  AttachVolume.Attach succeeded for volume "ebs-test-volume"
  Normal  Pulling                 33s   kubelet                  Pulling image "busybox"
  Normal  Pulled                  30s   kubelet                  Successfully pulled image "busybox" in 3.847789281s
  Normal  Created                 30s   kubelet                  Created container app
  Normal  Started                 29s   kubelet                  Started container app
```

Eventsの2行目を見ると分かるようにPVのアタッチに成功しています。これでEBSボリュームがPod内のコンテナに対してマウントされました。

実際にファイルを配置して、再起動後でもデータが永続化されているのかを見てみましょう。
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
app2で同ファイルに追記してapp1側で内容を確認してみましょう。

```shell
kubectl exec $POD2 -- sh -c 'echo "app2:hello efs!" >> /app/data/test.txt'
kubectl exec $POD1 -- cat /app/data/test.txt
```

`app1:hello efs!`と`app2:hello efs!`の2行が出力されていれば確認OKです。
NFSでファイル共有されていますので、Podの再起動等でもこの情報は失われることはありません。

マネジメントコンソールから確認してみましょう。EFSメニューよりファイルシステム -> モニタリングと選択するとメトリクスが変動していることが確認できます[^2]。

[^2]: 残念ながら現状マネジメントコンソールでEFSに配置したファイルの参照機能はないようです。

![](https://i.gyazo.com/ec9df795aa1dd7ff66faab5775231407.png)

## 動的プロビジョニング TODO

静的プロビジョニングによって、EBS CSI ControllerがEBSボリュームを該当ノードにアタッチして、Pod内部のコンテナにマウントされていることを確認してきました。
ただ、AZを意識してEBSボリュームの手動作成やPVへの関連付け等はかなり面倒だと感じられたと思います。次は動的プロビジョニングによってEBS・PVの作成を自動化してしまいましょう。

動的プロビジョニングを利用するにはStorageClassというリソースを別途用意します。
StorageClassはアクセス速度(SSDやHDD)やIOスループット等、カテゴリごとに用意するのが一般的ですが今回は1つのみ用意します。
YAMLファイル(ここでは`storageclass.yaml`)を作成し、以下を記述しましょう。

```yaml
kind: StorageClass
apiVersion: storage.k8s.io/v1
metadata:
  name: aws-ebs-ssd
provisioner: ebs.csi.aws.com
volumeBindingMode: WaitForFirstConsumer
parameters:
  type: gp2
```

`type`フィールドにEBSのボリュームタイプである`gp2`(SSD)を指定しています。
こちらで指定可能なタイプはEBSの仕様に準じますので[こちら](https://docs.aws.amazon.com/ja_jp/AWSEC2/latest/UserGuide/ebs-volume-types.html)を参考にしてください。
また、`volumeBindingMode`を`WaitForFirstConsumer`に設定し、Podで初めて利用する際にEBSボリュームつまりPVを作成するように指示しています。

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
aws-ebs-ssd     ebs.csi.aws.com         Delete          WaitForFirstConsumer   false                  40s
gp2 (default)   kubernetes.io/aws-ebs   Delete          WaitForFirstConsumer   false                  75m
```

作成した`aws-ebs-ssd`以外に`gp2`というStorageClassが出てきたことに不思議に思われるかもしれません。
k8sのディストーションには予めデフォルトのStorageClassが設定されていることが多いです。
EKSでも既にデフォルトのStorageClassとしてこの`gp2`が作成されています（ここはCSIドライバでなくk8s内部のProvisionerが使用されています）。
今回はこのデフォルトのStorageClassはなく、CSIドライバとしてインストールしたPROVISIONERを使用する`aws-ebs-ssd`による動的プロビジョニングを行います。

これに対してPVCでストレージ要求を行うようにします。
YAMLファイル(`pvc.yaml`)を作成します。

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ebs-ssd-volume-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: aws-ebs-ssd
```

静的プロビジョニングのときに利用したものとほとんど同じですが、`storageClassName`に先程作成したStorageClassを指定します(先程はStorageClassを利用しないように空文字を設定しました)。
これによって、動的プロビジョニングつまりStorageClassを使用してPV/EBSの作成を自動的に実行する形になります。

では、こちらについても作成しましょう。

```shell
kubectl apply -f pvc.yaml
```

PVCの状態を確認しておきましょう。

```shell
kubectl get pvc ebs-ssd-volume-pvc
```

```
NAME                 STATUS    VOLUME   CAPACITY   ACCESS MODES   STORAGECLASS   AGE
ebs-ssd-volume-pvc   Pending                                      aws-ebs-ssd    3m17s
```

今回はPVを作成していませんので`STATUS`は`Pending`になっています。
ではPodを作成しましょう。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: app
  template:
    metadata:
      labels:
        app: app
    spec:
      containers:
        - name: app
          image: busybox
          command: [sh, -c, "sleep 10000"]
          volumeMounts:
            - mountPath: /app/data
              name: data
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: ebs-ssd-volume-pvc
```

基本的には先程とほとんど同じですが、以下の点が異なります。
- `nodeSelector`を削除。CSIドライバがPodがデプロイされたAZに動的にEBSを作成するため指定不要
- `volumes.persistentVolumeClaim.claimName`をStorageClassを使うように指定したPVCの名前を指定

こちらで作成(静的プロビジョニングで既に作成済みの場合は更新)します。

```shell
kubectl apply -f deployment.yaml
```

Podが起動したらPV,PVCの状態を確認してみましょう。

```shell
kubectl get pvc,pv
```

```
# 動的プロビジョニングのみ抜粋
NAME                                        STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
persistentvolumeclaim/ebs-ssd-volume-pvc    Bound    pvc-7dc82e91-e25c-401b-acc1-5bf9615c522b   10Gi       RWO            aws-ebs-ssd    8m56s

NAME                                                        CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM                         STORAGECLASS   REASON   AGE
persistentvolume/pvc-7dc82e91-e25c-401b-acc1-5bf9615c522b   10Gi       RWO            Delete           Bound    default/ebs-ssd-volume-pvc    aws-ebs-ssd             2m50s
```

PVリソース(`pvc-xxxxxx`)が自動的に作成され、それが先程作成したPVCにバインドされている様子が分かります。
この状態でマネジメントコンソールでEBSを見ると実際に作成されたEBSボリュームを確認することもできます。

![](https://i.gyazo.com/39a28347379b88d3e35cc34db6a129da.png)

これで先程同様にコンテナ内にファイル保存して、再起動または削除すると同じ結果が得られます。

```shell
# ファイル作成
POD=$(kubectl get pod -o jsonpath='{.items[0].metadata.name}' -l app=app)
kubectl exec $POD -- sh -c 'echo "hello ebs!" > /app/data/test.txt'
kubectl exec $POD -- cat /app/data/test.txt

# Pod再起動
kubectl rollout restart deployment app
# 新しいPodが起動して、古いPodが削除されるまでしばらく待つ(kubectl get pod)
POD=$(kubectl get pod -o jsonpath='{.items[0].metadata.name}' -l app=app)
kubectl exec $POD -- cat /app/data/test.txt

# Pod削除 -> 新規生成
kubectl delete -f deployment.yaml
kubectl apply -f deployment.yaml
# 新しいPodが起動して、古いPodが削除されるまでしばらく待つ(kubectl get pod)
POD=$(kubectl get pod -o jsonpath='{.items[0].metadata.name}' -l app=app)
kubectl exec $POD -- cat /app/data/test.txt
```

全てのケースで`hello ebs!`という文字列が出力されれば確認終了です。

## クリーンアップ

本チュートリアルのリソースは以下で削除します。

```shell
kubectl delete deploy app
kubectl delete pvc --all

kubectl delete pv --all
# マネジメントコンソールから動的プロビジョニングで作成されたEBSボリュームが削除されたことを確認する

helm uninstall -n kube-system aws-ebs-csi-driver
```

動的プロビジョニングで作成したEBSボリュームは上記で削除されますが、静的プロビジョニングで作成したAWS CLIかマネジメントコンソールで削除します。

```shell
aws ec2 delete-volume --volume-id xxxxxxxxxxx
```

最後にクラスタ環境を削除します。こちらは環境構築編のクリーンアップ手順を参照してください。
- [AWS EKS(eksctl)](/containers/k8s/tutorial/env/aws-eks-eksctl#クリーンアップ)
- [AWS EKS(Terraform)](/containers/k8s/tutorial/env/aws-eks-terraform#クリーンアップ)
