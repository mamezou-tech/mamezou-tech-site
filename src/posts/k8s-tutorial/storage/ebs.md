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
必要なアクセス許可は以下に記載されています。
<https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/docs/example-iam-policy.json>

### eksctl
環境構築にeksctlを利用している場合は今までと同様にeksctlのサブコマンドを利用してIRSAを構成します。

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
  --attach-policy-arn=arn:aws:iam::446197467950:policy/AWSEBSControllerIAMPolicy \
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
```
以下のことをしています。

- JSONファイルよりIAM Policyを作成し、CSIドライバがEBSにアクセスできるようにカスタムポリシーを作成
- CSIドライバが利用するIAM Roleを作成（EKSのOIDCプロバイダ経由でk8sのServiceAccountが引受可能）し、上記カスタムポリシーを指定
- k8s上にServiceAccountを作成して上記IAM Roleと紐付け


これをAWS/k8sクラスタ環境に適用します。
```shell
# 追加内容チェック
terraform plan
# AWS/EKSに変更適用
terraform apply
```

反映が完了したらマネジメントコンソールで確認してみましょう。
IAM Role/Policyは以下のようになります。
![](https://i.gyazo.com/dad27d3aaba7475c75a6b52e3210a81c.png)

IAM Role/Policyが問題なく作成されています。

次にk8sのServiceAccountは以下のように確認できます。

```shell
kubectl get sa aws-ebs-controller -n kube-system -o yaml
```

```yaml
# 必要部分のみ抜粋・整形
TODO
```

指定したIAM RoleでServiceAccountリソースがNamespace`external-dns`に作成されていることが確認できます。

## EBS CSIドライバインストール

それではHelmでEBSのCSIドライバを導入しましょう。Helm Chartは以下にホスティングされています。

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

パラメータでServiceAccountの生成を無効にして先程作成したIAM Roleに紐付けしたものを指定しています。それ以外はデフォルトで構いません。


## 静的プロビジョニング

それでは静的プロビジョニングを構成してみましょう。
静的プロビジョニングの場合は事前にEBSを作成しておく必要があります。以下のコマンドでAWS上にEBSボリュームを作成しましょう(マネジメントコンソールからでも構いません)。

```shell
aws ec2 create-volume --availability-zone ap-northeast-1a --size 10 \
  --tag-specifications 'ResourceType=volume,Tags=[{Key=Name,Value=k8s-ebs-test}]'
```

注意する点としてEBSはAZ(Availability Zone)を跨って利用することはできません。
上記では東京リージョン内の`ap-northeast-1a`を指定し、10GiBのストレージを作成しています。
マネジメントコンソールから作成したボリュームを確認してみましょう。メニューからEC2 -> Elastic Block Storeで参照することができます。
![](https://i.gyazo.com/fe32e58414208edae46ad1d13bfd6ab9.png)

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
    volumeHandle: vol-0ebbc792bd54fc32b
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
    VolumeHandle:      vol-0ebbc792bd54fc32b
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
kubectl apply -f pv.yaml
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

こちらも`Status`が`Available`から`Bound`となっていることが確認できます。この状態になるとこのPVは該当PVC以外から利用されることはありません(排他がかかっている状態)。

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

コンテナの動きとしてはbusyboxを起動して、sleepするだけの単純なものですが以下の点に注目してください。

- `volumes`フィールドにPodで利用するボリュームを定義し、ここに先程作成したPVCリソースを指定します。これによりPVCリソースがこのPodで利用できるようになります。
- `containers.volumeMounts`でボリュームをコンテナのどのパスにマウントするのかを設定しています。これにより先程のEBSが`/app/data`にマウントされます。

また、`nodeSelector`でAZを指定しています。これは前述の通りEBSはAZを跨って利用することができないため、先程EBSを作成したAZ(`ap-northeast-1a`)でのみスケジューリングされるようにしています。
指定しない場合に別のAZにPodがデプロイされるとボリュームのマウントができずに起動することができなくなります。

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
  Normal  Scheduled               119s  default-scheduler        Successfully assigned default/app-5776847dd9-t7pmk to ip-192-168-60-198.ap-northeast-1.compute.internal
  Normal  SuccessfulAttachVolume  115s  attachdetach-controller  AttachVolume.Attach succeeded for volume "ebs-test-volume"
  Normal  Pulling                 102s  kubelet                  Pulling image "busybox"
  Normal  Pulled                  100s  kubelet                  Successfully pulled image "busybox" in 1.826315098s
  Normal  Created                 100s  kubelet                  Created container app
  Normal  Started                 100s  kubelet                  Started container app
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
app-5776847dd9-t7pmk   1/1     Terminating   0          9m56s
app-59586bfc8b-fszn9   1/1     Running       0          16s
```

新しいPodが新たに作成され、先程実行していたPodが終了していく様子が分かります。
新しく起動したPodに入って先程のファイルが存在し、内容が失われていないかを確認してみましょう。

```shell
POD=$(kubectl get pod -o jsonpath='{.items[0].metadata.name}' -l app=app)
kubectl exec $POD -- cat /app/data/test.txt
```

`hello ebs!`という出力が確認できたと思います。Podの再起動後でもデータが引き継がれていることが確認できました。
次はPodを生成したDeploymentリソースごと削除し、再度作成してみましょう。

```shell
kubectl delete -f deployment.yaml
# Podが完全に消えるまでしばらく待つ
kubectl apply -f deployment.yaml
# Podが起動するまでしばらく待つ

POD=$(kubectl get pod -o jsonpath='{.items[0].metadata.name}' -l app=app)
kubectl exec $POD -- cat /app/data/test.txt
```

ここでも`hello ebs!`という出力が確認できたと思います。
Pod再起動だけでなく、Deploymentごと消しても、永続化したデータは新しいPodで引き続き利用可能なことが分かります。

## 動的プロビジョニング
TODO