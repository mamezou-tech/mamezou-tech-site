---
title: Velero による Kubernetes クラスタのバックアップ・リストア
author: masahiro-kondo
---

Velero は Kubernetes クラスタのオブジェクトをバックアップ・リストアするためのツールです。

[Velero](https://velero.io)

概要ページで Velero の想定しているユースケースを見てみましょう。

[Velero Docs - Overview](https://velero.io/docs/v1.7/index.html)

> Velero gives you tools to back up and restore your Kubernetes cluster resources and persistent volumes.

- クラスタのバックアップを取り、消失時にリストアする
- クラスタのリソースを他のクラスタに移行する
- 本番用クラスタを開発・テスト用クラスタにレプリケーションする

このように、目的に応じてバックアップを取得し、利用することができます。

Kubernetes のオブジェクトは Key-Value store である etcd に保存されるため etcd のデータをバックアップしておけば、クラスタの状態を復元することができます。ただし Pod にマウントしている PV のデータは Kubernetes が管理しない外部ストレージに保存されているため、etcd データのリストアだけでは復元できず、別途ストレージのバックアップをリストアしなければなりません。Velero では Kubernetes の Volume Snapshot の機能を用いて PV のスナップショットを取得し、リストア時に使用することができます。これにより Pod と保持したデータを一緒に復元できます。

それでは、EKS に PV を使用するアプリケーションをデプロイして、Velero でバックアップし、リストアしてみましょう。

## 事前準備
以下のいずれかの方法で事前にEKS環境を作成しておいてください。

- [AWS EKS(eksctl)](/containers/k8s/tutorial/infra/aws-eks-eksctl)
- [AWS EKS(Terraform)](/containers/k8s/tutorial/infra/aws-eks-terraform)

[ストレージ - AWS EBS](/containers/k8s/tutorial/storage/ebs) では、EBS CSI ドライバーを導入しました。Velero は最新の v1.7 でも EBS CSI Driver で作成される PV をサポートしていません[^1]。そこで、in-tree のドライバーで作成される PV と VolumeSnapshot を利用するため、StorageClass は gp2 を利用します。

[^1]: 2022 年にリリースされる v1.8 で対応される予定です。[velero/ROADMAP.md at main · vmware-tanzu/velero](https://github.com/vmware-tanzu/velero/blob/main/ROADMAP.md)

## Velero CLI のインストール

Velero はサーバー側のプログラムだけインストールして、kubectl で manifest をデプロイすることでも使用できますが、Velero CLI をインストールすると操作が楽です。各 OS へのインストールは公式サイトの手順に従ってください。

https://velero.io/docs/v1.7/basic-install/#install-the-cli

## EKS クラスタへの Velero インストール

Velero CLI をインストールしていれば、Kubernetes クラスタへのインストールは CLI から実行できます。

Velero には各クラウドのプラグインが提供されており、バックアップ先として S3 を指定したり、EBS の Snapshot を生成することができます。実運用では Velero 用の IAM User を作成し S3 などへのアクセスポリシーを付与するべきですが、ここでは簡便のため個人用の IAM User の権限で実行します。

あらかじめ、バックアップ先の S3 バケットを準備しておきます。S3 バケット名とリージョンを環境変数として宣言します。

```
BUCKET=<bucket name>
AWS_DEFAULT_REGION=ap-northeast-1
```

以下のように指定して、velero install コマンドを実行します。

- provider に aws を指定
- velero-plugin-for-aws を指定[^2]
- bucket に S3 バケット名を指定
- backup-location-config と snapshot-location-config のリージョンを指定
- secret-file オプションに AWS の credential ファイルを指定

[^2]: [GitHub - vmware-tanzu/velero-plugin-for-aws: Plugins to support Velero on AWS](https://github.com/vmware-tanzu/velero-plugin-for-aws)


backup-location-config に指定するのは バックアップが転送される S3 バケットのリージョン、snapshot-location-config に指定するのはスナップショットを作成する EBS のリージョンです。

```
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.3.0 \
  --bucket $BUCKET \
  --backup-location-config region=$AWS_DEFAULT_REGION \
  --snapshot-location-config region=$AWS_DEFAULT_REGION \
  --secret-file ~/.aws/credentials
```

velero ネームスペースが作成され、各種 CRD、ClusterRoleBinding、ServiceAcount がデプロイされます。

```
Velero is installed! ⛵ Use 'kubectl logs deployment/velero -n velero' to view the status.
```

velero ネームスペースには Velero の Pod と ReplicaSet ができています。

```
$ kubectl -n velero get all 
NAME                         READY   STATUS    RESTARTS   AGE
pod/velero-fbf6dfbc8-bhrnv   1/1     Running   0          5s

NAME                     READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/velero   1/1     1            1           5s

NAME                               DESIRED   CURRENT   READY   AGE
replicaset.apps/velero-fbf6dfbc8   1         1         1       5s
```

インストールされる CRD の一覧。バックアップやリストア、スケジュールなどを作成するための CRD がインストールされています。

```
$ kubectl get crd | grep velero.io
backups.velero.io                            2021-11-19T07:11:24Z
backupstoragelocations.velero.io             2021-11-19T07:11:24Z
deletebackuprequests.velero.io               2021-11-19T07:11:24Z
downloadrequests.velero.io                   2021-11-19T07:11:24Z
podvolumebackups.velero.io                   2021-11-19T07:11:24Z
podvolumerestores.velero.io                  2021-11-19T07:11:24Z
resticrepositories.velero.io                 2021-11-19T07:11:24Z
restores.velero.io                           2021-11-19T07:11:24Z
schedules.velero.io                          2021-11-19T07:11:24Z
serverstatusrequests.velero.io               2021-11-19T07:11:24Z
volumesnapshotlocations.velero.io            2021-11-19T07:11:24Z
```

## バックアップ対象のアプリケーションデプロイ

それでは、バックアップ対象となるアプリケーションをデプロイします。ネームスペースごとバックアップしたいので、default ではなく適当なネームスペース(ここでは vs-test) を作成します。

```
kubectl create namespace vs-test
```

PVC をデプロイします。以下のようなマニフェストを作成し、pvc.yaml として保存します。StorageClass は `gp2` を指定します。

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ebs-volume-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: gp2
```

PVC を　vs-test ネームスペースにデプロイします。

```
kubectl apply -f pvc.yaml -n vs-test
```

この PVC で作成される PV を使用するアプリケーションのマニフェストを作成し、deployment.yaml として保存します。PVC の claimName には pvc.yaml で作成する `ebs-voluve-pvc` を指定します。

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
            claimName: ebs-volume-pvc
```

この Deployment も vs-test ネームスペースにデプロイします。

```
kubectl apply -f deployment.yaml -n vs-test
```

Pod が起動して、PVC にボリュームがバインドされたのを確認します。

```
kubectl get po,pvc -n vs-test
NAME                       READY   STATUS    RESTARTS   AGE
pod/app-76f895bcc8-bszl8   1/1     Running   7          40s

NAME                                   STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
persistentvolumeclaim/ebs-volume-pvc   Bound    pvc-e5021405-4313-4ab6-ac6e-f55884cb605f   10Gi       RWO            gp2            30s
```

[ストレージ - AWS EBS](/containers/k8s/tutorial/storage/ebs) のハンズオンと同じように Pod にマウントされたパスにファイルを作成します。

```
$ POD=$(kubectl -n vs-test get pod -o jsonpath='{.items[0].metadata.name}' -l app=app)
$ kubectl -n vs-test exec $POD -- sh -c 'echo "hello ebs!" > /app/data/test.txt'
$ kubectl -n vs-test exec $POD -- cat /app/data/test.txt
hello ebs!
```

## オンデマンドバックアップの作成

この状態で vs-test ネームスペースのバックアップを取ります。Velero にはオンデマンドバックアップとスケジュールバックアップがあります。ここでは即時作成されるオンデマンドバックアップを作成します。

```
$ velero backup create 202111191615 --include-namespaces vs-test --wait
Backup request "202111191615" submitted successfully.
Waiting for backup to complete. You may safely press ctrl-c to stop waiting - your backup will continue in the background.
..
Backup completed with status: Completed. You may check for more information using the commands `velero backup describe 202111191615` and `velero backup logs 202111191615`.
```

オンデマンドバックアップを作成すると velero ネームスペースに backup オブジェクトが作成されていきます。

```
$ kubectl get backups -n velero
NAME           AGE
202111191615   50s
```

backup オブジェクトの詳細をみるとバックアップ日時やステータス、保存されたアイテム数や Volume Snapshot 数などが記録されています。

```
$ kubectl -n velero describe backup 202111191615 
Name:         202111191615
Namespace:    velero
Labels:       velero.io/storage-location=default
Annotations:  velero.io/source-cluster-k8s-gitversion: v1.21.2-eks-06eac09
              velero.io/source-cluster-k8s-major-version: 1
              velero.io/source-cluster-k8s-minor-version: 21+
API Version:  velero.io/v1
Kind:         Backup
Metadata:
  Creation Timestamp:  2021-11-19T07:16:02Z
  Generation:          5

・・・(中略)

Spec:
  Default Volumes To Restic:  false
  Hooks:
  Included Namespaces:
    vs-test
  Metadata:
  Storage Location:  default
  Ttl:               720h0m0s
  Volume Snapshot Locations:
    default
Status:
  Completion Timestamp:  2021-11-19T07:16:03Z
  Expiration:            2021-12-19T07:16:02Z
  Format Version:        1.1.0
  Phase:                 Completed
  Progress:
    Items Backed Up:           35
    Total Items:               35
  Start Timestamp:             2021-11-19T07:16:02Z
  Version:                     1
  Volume Snapshots Attempted:  1
  Volume Snapshots Completed:  1
Events:                        <none>
```

S3 バケットには backups というフォルダが作成され、配下にバックアップ名のフォルダが作成されてバックアップされたオブジェクトやメタデータが保存されます。

![](https://gyazo.com/c54d3f819356c32189ccf29ee9267c70.png)

EBS ボリュームののスナップショットも同時に作成されています。

![](https://gyazo.com/8711d18dafc153470b498c64423aea4e.png)

## アプリケーションの削除とバックアップからのリストア

バックアップが取れたので vs-test のアプリケーションを削除、vs-test ネームスペース自体も削除します。


```
kubectl -n vs-test delete -f deployment.yaml
kubectl -n vs-test delete -f pvc.yaml
kubectl delete ns vs-test
```

この状態でバックアップからリストアできることを確認します。作成したバックアップを指定して velero create restore コマンドを実行します。

```
$ velero create restore --from-backup 202111191615 --wait
Restore request "202111191615-20211119162813" submitted successfully.
Waiting for restore to complete. You may safely press ctrl-c to stop waiting - your restore will continue in the background.
.
Restore completed with status: Completed. You may check for more information using the commands `velero restore describe 202111191615-20211119162813` and `velero restore logs 202111191615-20211119162813`.
```

コマンドが成功したので vs-test ネームスペースが作成され、Pod や PVC も復活していることを確認します。

```
$ kubectl get po -n vs-test
NAME                   READY   STATUS    RESTARTS   AGE
app-76f895bcc8-bszl8   1/1     Running   0          23s

$ kubectl get pvc -n vs-test
NAME             STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
ebs-volume-pvc   Bound    pvc-e5021405-4313-4ab6-ac6e-f55884cb605f   10Gi       RWO            gp2            33s
```

PV に作成したファイルも復元されていることを確認します。

```
$ POD=$(kubectl -n vs-test get pod -o jsonpath='{.items[0].metadata.name}' -l app=app)
$ kubectl -n vs-test exec $POD -- cat /app/data/test.txt                              
hello ebs!
```

リストアオブジェクトも velero ネームスペースに作成されます。

```
kubectl -n velero get restores
NAME                          AGE
202111191615-20211119162813   40s
```
S3 バケットにもリストアのログや結果が出力されます。

![](https://gyazo.com/9bc2546bbe4093044d728016d179e90b.png)

## クリーンアップ

バックアップは下記のように backup delete コマンドで削除します。実行すると S3 バケットのデータや EBS のスナップショットも削除されます。

```
velero backup delete 202111191615
```

Velero をクラスタ環境からアンインストールします。

```
$ velero uninstall
You are about to uninstall Velero.
Are you sure you want to continue (Y/N)? Y
Waiting for velero namespace "velero" to be deleted
.......................................................
Velero namespace "velero" deleted
W1109 00:47:49.212323   85702 warnings.go:70] apiextensions.k8s.io/v1beta1 CustomResourceDefinition is deprecated in v1.16+, unavailable in v1.22+; use apiextensions.k8s.io/v1 CustomResourceDefinition
Velero uninstalled ⛵
```

最後にクラスタ環境を削除します。こちらは環境構築編のクリーンアップ手順を参照してください。
- [AWS EKS(eksctl)](/containers/k8s/tutorial/env/aws-eks-eksctl#クリーンアップ)
- [AWS EKS(Terraform)](/containers/k8s/tutorial/env/aws-eks-terraform#クリーンアップ)

## まとめ
以上のように Velero を使用すると、Kubernetes のオブジェクトと PV のデータを同時にバックアップ・リストアすることが可能です。バックアップ先も S3 など各クラウド提供のストレージを簡単に利用できます。この記事では触れていませんが、定期バックアップも Kubernetes のスケジューリング機能を利用して簡単に実行できますし、世代の指定も可能です。この記事のようなネームスペース単位だけでなく、オブジェクトのラベルなどでバックアップ対象をきめ細かく指定することもできます。

データベースについては別途バックアップする必要がありますが、バックアップ・リストアや移行の手順がかなり簡略化されるのではないでしょうか。

PV データについては、CSI ドライバーが Snapshot に対応している必要があります。下記ページの Production Drivers の表の Other Features に著名なドライバーの対応状況がまとめられています。

[Drivers - Kubernetes CSI Developer Documentation](https://kubernetes-csi.github.io/docs/drivers.html)

またこの記事のように EBS CSI Driver に Velero プラグイン自体が未対応というケースもあります。今後 CSI ドライバーへの移行が進み多くのプラットフォームで利用可能になることが期待できます。
