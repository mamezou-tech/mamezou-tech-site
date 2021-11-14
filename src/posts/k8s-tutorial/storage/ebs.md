---
title: ストレージ - AWS EBS
author: noboru-kudo
---

これまでAWS EKS上でk8sクラスタ環境の構築を行い、Ingress Controllerを導入することでインターネットからのリクエストを受け付けられるようにしました。
ただ、アプリについては固定レスポンスを返すだけで実践的なものではありませんでした。
そこで今回は、データ保存を行うアプリを考えてみましょう。

コンテナではローカファイルシステムは一時的なもので、保存しても再起動時にそのデータは消失してしまいます。
コンテナが稼働しているノード自体のストレージにデータを保存することも可能ですが(hostpath)、各PodがどのNodeに配置されるかはスケジューラ次第で、次に起動されるときに同じノードが利用できるということは保証されません[^1]。
やはりデータについてはコンテナはもちろんノードからも分離して管理することが理想的です。

[^1]: [Node Affinity](https://kubernetes.io/docs/concepts/configuration/assign-pod-node/#affinity-and-anti-affinity)を使えばPodがスケジュールされるNodeを指定することはできますが、PodがNodeに依存することになり耐障害性やリソース効率性の観点で望ましくありありません。

Kubernetesでは[CSI(Container Storage Interface)](https://github.com/container-storage-interface/spec)というk8sとストレージプロバイダーとのインターフェースが規定されており、それを実装したCSIドライバを組み込むことで様々なストレージについて統一インターフェース(つまりはマニフェストファイル)で利用できるようになっています。 [^2]

[^2]: 以前はin-treeプラグインと呼ばれ、Kubernetes本体のリポジトリに組み込まれていましたが(モノレポ)、開発効率の改善や様々なストレージプロバイダーが参入できるように現在はCSIドライバを使うように移行が進められています。

CSIドライバはクラウドプロバイダが提供するものからサードパーティ製のものまで様々なものが提供されています。
今回はAWSの提供するストレージサービスの[EBS(Elastic Block Store)](https://aws.amazon.com/jp/ebs/)をCSIを通してk8sクラスタ環境から利用できるようにしましょう。
導入するEBSのCSIドライバはk8sコミュニティによって開発されており、公式リポジトリは以下になります。
- <https://github.com/kubernetes-sigs/aws-ebs-csi-driver>

k8sクラスタ環境のストレージ利用については以下の2種類が用意されています。
- 静的プロビジョニング: 事前にストレージと、k8s上のPV(PersistentVolume)リソースを作成しておき、それに対してアプリからのストレージ要求(PVC:PersistentVolumeClaim)に対応する方法
- 動的プロビジョニング: アプリからのストレージ要求(PVC)に対応して、ストレージとPVを動的に作成して紐付けを行う方法。別途StorageClassリソースで動的生成の手順を指定しておく。[^3]

[^3]: PVCやPVを使わずに直接PodにVolumeを指定してマウントする方法もありますが、アプリとインフラ責務の分離ができないという理由でPVC，PVを利用する方法が主流です。こちらについては触れません。

今回は両方のパターンについて実践していきましょう。

## 事前準備
以下のいずれかの方法で事前にEKS環境を作成しておいてください。

- [AWS EKS(eksctl)](/containers/k8s/tutorial/infra/aws-eks-eksctl)
- [AWS EKS(Terraform)](/containers/k8s/tutorial/infra/aws-eks-terraform)

CSIドライバのインストールにk8sパッケージマネージャーの[helm](https://helm.sh/)を利用します。
未セットアップの場合は[こちら](https://helm.sh/docs/intro/install/) を参考にv3以降のバージョンをセットアップしてください。


## EBS CSIドライバのアクセス許可設定
EBSのCSIドライバがEBSに対してアクセスができるようにIAM PolicyとIAM Roleを作成します。
EKSクラスタ環境のセットアップ方法(eksctl/Terraform)によって手順が異なります。以下手順に応じてどちらかを実施してください。

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
curl -o ebs-controller-policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-ebs-csi-driver/master/docs/example-iam-policy.json
# カスタムポリシー作成
aws iam create-policy \
    --policy-name AWSEBSControllerIAMPolicy \
    --policy-document file://ebs-controller-policy.json
```

次に作成したポリシーに対応するIAM Role/k8s ServiceAccountを作成します。
これについてはeksctlのサブコマンドで作成します。

```shell
eksctl create iamserviceaccount \
  --cluster=mz-k8s \
  --namespace=kube-system \
  --name=aws-ebs-controller \
  --attach-policy-arn=arn:aws:iam::xxxxxxxxxxxx:policy/AWSEBSControllerIAMPolicy \
  --approve
```

実行するとeksctlがCloudFormationスタックを実行し、AWS上にIAM Role、k8s上に対応するServiceAccountが作成されます。
マネジメントコンソールで確認してみましょう。

- CloudFormation
  ![](https://i.gyazo.com/d68b779a28468f0514164e3e94532acf.png)
- IAM Role
  ![](https://i.gyazo.com/88b8d89478c0c2534ec37cc826c19a44.png)

ServiceAccountについてはkubectlで確認します。

```shell
kubectl get sa aws-ebs-controller -n kube-system -o yaml
```

```yaml
# 必要部分のみ抜粋・整形
apiVersion: v1
kind: ServiceAccount
metadata:
  name: aws-ebs-controller
  namespace: kube-system
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::xxxxxxxxxxxx:role/eksctl-mz-k8s-addon-iamserviceaccount-kube-s-Role1-68K77KXE622V
  labels:
    app.kubernetes.io/managed-by: eksctl
secrets:
  - name: aws-ebs-controller-token-j88db
```

`annotations`に上記IAM RoleのARNが指定されていることが分かります。

### Terraform

環境構築にTerraformを利用している場合は、`main.tf`に以下の定義を追加してください。

```hcl
resource "aws_iam_policy" "ebs_csi" {
  name = "AWSEBSControllerIAMPolicy"
  policy = file("${path.module}/ebs-controller-policy.json")
}

module "ebs_csi" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-assumable-role-with-oidc"
  version = "~> 4.0"
  create_role                   = true
  role_name                     = "EKSEBSCsiDriver"
  provider_url                  = replace(module.eks.cluster_oidc_issuer_url, "https://", "")
  role_policy_arns              = [aws_iam_policy.ebs_csi.arn]
  oidc_fully_qualified_subjects = ["system:serviceaccount:kube-system:aws-ebs-controller"]
}

resource "kubernetes_service_account" "ebs_csi" {
  metadata {
    name = "aws-ebs-controller"
    namespace = "kube-system"
    annotations = {
      "eks.amazonaws.com/role-arn" = module.ebs_csi.iam_role_arn
    }
  }
}
```
以下のことをしています。

- JSONファイルよりIAM Policyを作成し、CSIドライバがEBSにアクセスできるようにカスタムポリシーを作成
- CSIドライバが利用するIAM Roleを作成（EKSのOIDCプロバイダ経由でk8sのServiceAccountが引受可能）し、上記カスタムポリシーを指定
- k8s上にServiceAccountを作成して上記IAM Roleと紐付け

次に、Terraform内で利用するカスタムポリシーのJSONファイルを準備します。
JSONファイルあはCSI ドライバのリポジトリにあるサンプルをそのまま使います。

```shell
# Policyファイルダウンロード
curl -o ebs-controller-policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-ebs-csi-driver/master/docs/example-iam-policy.json
```

これをAWS/k8sクラスタ環境に適用します。
```shell
# module初期化
terraform init
# 追加内容チェック
terraform plan
# AWS/EKSに変更適用
terraform apply
```

反映が完了したらマネジメントコンソールで確認してみましょう。
IAM Role/Policyは以下のようになります。
![](https://i.gyazo.com/1337b3a744402bff6acaf7e6d9f62c7e.png)

IAM Role/Policyが問題なく作成されています。

次にk8s側に作成したServiceAccountを確認します。

```shell
kubectl get sa aws-ebs-controller -n kube-system -o yaml
```

```yaml
# 必要部分のみ抜粋・整形
apiVersion: v1
automountServiceAccountToken: true
kind: ServiceAccount
metadata:
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::xxxxxxxxxxxx:role/EKSEBSCsiDriver
  name: aws-ebs-controller
  namespace: kube-system
secrets:
  - name: aws-ebs-controller-token-d4kk2
```

指定したIAM RoleでServiceAccountリソースがNamespace`kube-system`に作成されていることが確認できます。

## EBS CSIドライバインストール

それではHelmでEBSのCSIドライバを導入しましょう。利用するHelm Chartは以下にホスティングされています。

<https://github.com/kubernetes-sigs/aws-ebs-csi-driver/tree/master/charts/aws-ebs-csi-driver>

まずはHelmチャートのリポジトリを追加します。

```shell
helm repo add aws-ebs-csi-driver https://kubernetes-sigs.github.io/aws-ebs-csi-driver
helm repo update
```

ではCSIドライバをインストールしましょう。Helmチャートは現時点で最新バージョンの`2.4.0`を使用します。

```shell
helm upgrade aws-ebs-csi-driver aws-ebs-csi-driver/aws-ebs-csi-driver \
  --install --version 2.4.0 \
  --namespace kube-system \
  --set controller.serviceAccount.create=false \
  --set controller.serviceAccount.name=aws-ebs-controller \
  --wait
```

パラメータでServiceAccountの生成を無効にして、先程作成したIAM Roleに紐付けしたものを指定しています。それ以外はデフォルトで構いません。


## 静的プロビジョニング

それでは静的プロビジョニングを構成してみましょう。
静的プロビジョニングの場合は事前にEBSを作成しておく必要があります。
EBSはAZ(Availability Zone)を跨って利用することはできませんので、まずk8sのノードがどのAZに配置されているのかを確認しましょう。
各ノードは配置されているAZのラベルがつけられています。

```shell
kubectl get node -L topology.ebs.csi.aws.com/zone
```

```
NAME                                            STATUS   ROLES    AGE   VERSION               ZONE
ip-10-0-1-90.ap-northeast-1.compute.internal    Ready    <none>   16m   v1.21.4-eks-033ce7e   ap-northeast-1a
ip-10-0-3-122.ap-northeast-1.compute.internal   Ready    <none>   16m   v1.21.4-eks-033ce7e   ap-northeast-1d
```

この結果から`ap-northeast-1a`、`ap-northeast-1d`に配置されていることが確認できます。
ここではAZ`ap-northeast-1a`内に作成しましょう（どのAZに作成するかは出力されているものであれば任意です。別のAZの場合は以降置き換えてください）。

以下のコマンドでAWS上にEBSボリュームを作成します(マネジメントコンソールからでも構いません)。

```shell
aws ec2 create-volume --availability-zone ap-northeast-1a --size 10 \
  --tag-specifications 'ResourceType=volume,Tags=[{Key=Name,Value=k8s-ebs-test}]'
```

上記では東京リージョン内の`ap-northeast-1a`を指定し、10GiBのストレージを作成しています。
マネジメントコンソールから作成したボリュームを確認してみましょう。メニューからEC2 -> Elastic Block Storeで参照することができます。
![](https://i.gyazo.com/422f6ddbd888ae232caa7304695b6e34.png)

作成したEBSボリュームをk8sに関連付けます。これはPV(PersistentVolume)リソースを作成することで実施します。
以下のようにYAMLファイル(ここでは`pv.yaml`)を作成しましょう。

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: ebs-test-volume
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  # CSI設定
  csi:
    driver: ebs.csi.aws.com
    # 手動作成したEBSのVolumeID
    volumeHandle: vol-00b52f41e6065cb7c
```

`capacity`として10GiB、`accessModes`として読み書き可能なストレージとして作成しました。
また`csi`部分で今回使用するCSIドライバを指定し、`volumeHandle`に先程作成したEBSのボリュームIDを設定します。

これでPVリソースを作成しましょう。

```shell
kubectl apply -f pv.yaml
```

ではPVの中身を確認してみましょう。

```shell
kubectl describe pv ebs-test-volume
```

以下のようになっています。

```
# 必要部分のみ抜粋・整形
Name:            ebs-test-volume
Finalizers:      [kubernetes.io/pv-protection]
StorageClass:    
Status:          Available
Claim:           
Reclaim Policy:  Retain
Access Modes:    RWO
VolumeMode:      Filesystem
Capacity:        10Gi
Node Affinity:   <none>
Source:
    Type:              CSI (a Container Storage Interface (CSI) volume source)
    Driver:            ebs.csi.aws.com
    FSType:            
    VolumeHandle:      vol-00b52f41e6065cb7c
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
  name: ebs-test-volume-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: ""
```

`accessModes`で読み書き可能なストレージを10GiB(`storage`フィールド)のサイズで要求していることが分かると思います。
`storageClassName`に空文字を設定していますが、これはEKSデフォルトの動的プロビジョニングが動作するのを防ぐために必要です。

こちらでPVCリソースを作成しましょう。

```shell
kubectl apply -f pvc.yaml
```

作成後はPVCリソースについても中身を確認しましょう。

```shell
kubectl describe pvc ebs-test-volume-pvc
```

```
Name:          ebs-test-volume-pvc
Namespace:     default
StorageClass:  
Status:        Bound
Volume:        ebs-test-volume
Labels:        <none>
Annotations:   pv.kubernetes.io/bind-completed: yes
               pv.kubernetes.io/bound-by-controller: yes
Finalizers:    [kubernetes.io/pvc-protection]
Capacity:      10Gi
Access Modes:  RWO
VolumeMode:    Filesystem
Used By:       <none>
```

`Status`をみると`Bound`となっており、PVCがPVにバインディングされていることが分かります。
また`Volume`には先程作成したPVが設定されています。これはPVCの希望条件(サイズやアクセスモード)に対して、先程のPVがマッチしたため紐付けがされたものです。
もう一度PVの方のステータスを見てみましょう。

```shell
kubectl get pv ebs-test-volume
```

```
NAME              CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM                         STORAGECLASS   REASON   AGE
ebs-test-volume   10Gi       RWO            Retain           Bound    default/ebs-test-volume-pvc                           17m
```

こちらも`Status`が`Available`から`Bound`となり、`CLAIM`として先程のPVCが設定されていることが確認できます。
この状態になるとこのPVは該当PVC以外から利用されることはありません(排他がかかっている状態)。

では最後に利用するコンテナ側(アプリ)です。
今回はbusyboxコンテナを起動し、実際にEBS内にファイルを配置し、コンテナの再起動や削除後でもデータが永続化されているかを確認するだけにします。

以下のYAMLファイル(ここでは`deployment.yaml`)を用意しましょう。

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
      nodeSelector:
        topology.ebs.csi.aws.com/zone: ap-northeast-1a
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
            claimName: ebs-test-volume-pvc
```

コンテナの動きとしてはbusyboxを起動して、sleepするだけの単純なものですが以下の点に注目してください[^4]。

[^4]: 複数レプリカで更新が必要な場合は、ファイル競合を避けるために、Deploymentではなくコンテナごとにボリュームを分離するStatefulSetを使用します。

- `volumes`フィールドにPodで利用するボリュームを定義し、ここに先程作成したPVCリソースを指定します。これによりPVCリソースがこのPodで利用できるようになります。
- `containers.volumeMounts`でボリュームをコンテナのどのパスにマウントするのかを設定しています。これにより先程のEBSが`/app/data`にマウントされます。

また、`nodeSelector`でAZを指定しています。これは前述の通りEBSはAZを跨って利用することができないため、先程EBSを作成したAZ(`ap-northeast-1a`)でのみスケジューリングされるようにしています。
これを指定しない場合、別のAZに配置されたNodeにPodがデプロイされるとボリュームのマウントができずに起動することができなくなります。

```shell
kubectl apply -f deployment.yaml
```

Podがデプロイ時にボリュームのマウントを始まります。Podリソースのイベントを確認してみます。

```shell
POD=$(kubectl get pod -o jsonpath='{.items[0].metadata.name}' -l app=app)
kubectl describe pod $POD
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
今回はbusyboxコンテナを起動しているだけですので、`kubectl exec`で直接コンテナ内に入ってテストファイルを直接配置します。

```shell
POD=$(kubectl get pod -o jsonpath='{.items[0].metadata.name}' -l app=app)
kubectl exec $POD -- sh -c 'echo "hello ebs!" > /app/data/test.txt'
kubectl exec $POD -- cat /app/data/test.txt
```

マウントしたパス(`/app/data`)に`test.txt`というファイルを作成しました。`hello ebs!`という内容がコンソール上に出力されることを確認してください。

ではPodを再起動してみましょう。

```shell
kubectl rollout restart deployment app
kubectl get pod
```

```
NAME                   READY   STATUS        RESTARTS   AGE
app-5569fd9559-t6w8l   1/1     Running       0          6s
app-5776847dd9-896vs   1/1     Terminating   0          105s
```

新しいPodが新たに作成され、先程実行していたPodが終了していく様子が分かります。
古いPodが削除されたのを確認後に、新しく起動したPodに先程のファイルが存在し、内容が失われていないかを確認してみましょう。

```shell
POD=$(kubectl get pod -o jsonpath='{.items[0].metadata.name}' -l app=app)
kubectl exec $POD -- cat /app/data/test.txt
```

`hello ebs!`という出力が確認できたと思います。Podの再起動後でもデータが引き継がれていることが確認できました。
次はPodを生成したDeploymentリソースごと削除し、再度作成してみましょう。

```shell
kubectl delete -f deployment.yaml
kubectl apply -f deployment.yaml
# 新しいPodが起動して、古いPodが削除されるまでしばらく待つ(kubectl get pod)

POD=$(kubectl get pod -o jsonpath='{.items[0].metadata.name}' -l app=app)
kubectl exec $POD -- cat /app/data/test.txt
```

ここでも`hello ebs!`という出力が確認できたと思います。
Pod再起動だけでなく、Deploymentごと消しても、永続化したデータは新しいPodで引き続き利用可能なことが分かります。

## 動的プロビジョニング

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
