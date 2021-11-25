---
title: Container Storage(OpenEBS)
author: noboru-kudo
eleventyExcludeFromCollections: true
---
[Kubernetes]上で稼働するアプリはコンテナ内に存在するため、ローカルファイルシステムにデータを保存しても、コンテナが消えると同時にデータも消失する。

コンテナが稼働しているノード自体のストレージにデータを保存することも可能だが(hostpath)、各PodがどのNodeに配置されるかはkube-scheduler次第で、次も同じノードが利用できるということは保証されない。
[Node Affinity](https://kubernetes.io/docs/concepts/configuration/assign-pod-node/#affinity-and-anti-affinity)を使えばPodがスケジュールされるNodeを指定することはできるが、Nodeに依存することになりKubernetesのメリットを殺すことになる（Nodeが死んだら終わり）。

そこで永続化用ストレージが必要なアプリケーションのために、[Kubernetes] クラスタに分散ストレージ環境を用意し、この問題に対処する。
この辺りはまだ成熟していないフィールドではあるが、最近勢いを見せている[OpenEBS] を使う(v0.9.0)。
クラウド環境であればプロバイダから永続化ストレージソリューションが提供されているので、それを使うのがいいと思うがOpenEBSを使ってプロバイダへの依存を回避するという選択肢もある。

今回は永続化ストレージを使用するMongoDBをOpenEBSが提供する分散ストレージ上で動作させる。
![](https://i.gyazo.com/66dee71323f3a119b36e601406958d27.png)

今回はローカル環境に構築したクラスタ + パッケージマネージャの[Helm]を利用する。

## 1. 事前準備（iSCSIインストール）
OpenEBSの必須要件であるストレージネットワークプロトコルの[iSCSI](https://ja.wikipedia.org/wiki/ISCSI)をクラスタ環境の全ノードにインストールする。
ローカルクラスタ構築向けのVagrantfile内のスクリプトでインストールするので、そこから環境構築している場合はこの手順は不要

```shell
# VirtualBoxのGuestOSにSSH
vagrant ssh k8s-master1

sudo yum install iscsi-initiator-utils -y
sudo systemctl enable iscsid && sudo systemctl start iscsid
# その他のWorkerノード(k8s-worker1,k8s-worker2,k8s-worker3)も同じようにする
```

iSCSIが起動したことを確認する。
```shell
systemctl status iscsid
```
```
   iscsid.service - Open-iSCSI
   Loaded: loaded (/usr/lib/systemd/system/iscsid.service; enabled; vendor preset: disabled)
   [* Active: active (running) ]since 日 2019-05-26 04:54:14 UTC; 9min ago
     Docs: man:iscsid(8)
           man:iscsiadm(8)
  Process: 17281 ExecStart=/usr/sbin/iscsid (code=exited, status=0/SUCCESS)
 Main PID: 17283 (iscsid)
    Tasks: 2
   Memory: 1.5M
   CGroup: /system.slice/iscsid.service
           ├─17282 /usr/sbin/iscsid
           └─17283 /usr/sbin/iscsid
```

## 2. OpenEBSのインストール
[Helm] でOpenEBSをインストールする。
```shell
kubectl create ns openebs
helm upgrade openebs --install stable/openebs --namespace openebs
```

インストールが正常に終わっていることを確認する。
```shell
kubectl get pods -n openebs
```
```
> NAME                                           READY   STATUS    RESTARTS   AGE
> openebs-admission-server-66bdd66664-d5mxs      1/1     Running   0          9m1s
> openebs-apiserver-ff6858b4-lhqfg               1/1     Running   0          9m1s
> openebs-localpv-provisioner-849db6dc95-x9l92   1/1     Running   0          9m1s
> openebs-ndm-69xht                              1/1     Running   0          9m1s
> openebs-ndm-wf8sn                              1/1     Running   0          9m1s
> openebs-ndm-zxgs7                              1/1     Running   0          9m1s
> openebs-provisioner-65d4695b46-dggh7           1/1     Running   0          9m1s
> openebs-snapshot-operator-69cc4c778d-sn4t5     2/2     Running   0          9m1s
```
何やらいろんなものがインストールされている。  
`openebs-ndm`というPodがDaemonSetで各Nodeに配置されている。これはNode Disk Manager(NDM)というコンポーネントで各ノードのストレージを管理するために使われている。
これと`apiserver`と`provisioner`を合わせたものが、OpenEBSのControl Planeに相当する。
![](https://i.gyazo.com/196b87c83e032ae25449ba4085e08a7c.png)


## 3. Storage Poolの生成
OpenEBSのストレージエンジンである[cStor https://docs.openebs.io/docs/next/cstor.html]のStorage Poolを生成する。
OpenEBSのCRDであるStoragePoolClaimを用いて作成する。

```yaml
apiVersion: openebs.io/v1alpha1
kind: StoragePoolClaim
metadata:
  name: cstor-pool
  annotations:
    # cstor Podが利用するメモリ
    cas.openebs.io/config: |
      - name: PoolResourceRequests
        value: |-
          memory: 512Mi
      - name: PoolResourceLimits
        value: |-
          memory: 1Gi
spec:
  name: cstor-pool
  type: sparse
  # Poolインスタンスの数。Node数以下にする必要がある
  maxPools: 3
  poolSpec:
    poolType: striped
```
```shell
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/storage/cstor-pool-config.yaml
```

OpenEBSのAPIサーバのログを確認してみる。
```shell
kubectl logs -n openebs $(kubectl get pod -n openebs -l component=apiserver -o jsonpath='{.items[0].metadata.name}')
```
```
> I0526 06:39:29.043854       6 handler.go:176] Provisioning pool 1/3 for storagepoolclaim cstor-pool
> I0526 06:39:29.056590       6 storagepool_create.go:83] Creating storagepool for storagepoolclaim cstor-pool via CASTemplate
> I0526 06:39:29.143645       6 storagepool_create.go:94] Cas template based storagepool created successfully: name 'cstor-pool'
> I0526 06:39:29.143668       6 handler.go:176] Provisioning pool 2/3 for storagepoolclaim cstor-pool
> I0526 06:39:29.209529       6 storagepool_create.go:83] Creating storagepool for storagepoolclaim cstor-pool via CASTemplate
> I0526 06:39:29.284602       6 storagepool_create.go:94] Cas template based storagepool created successfully: name 'cstor-pool'
> I0526 06:39:29.284617       6 handler.go:176] Provisioning pool 3/3 for storagepoolclaim cstor-pool
> I0526 06:39:29.299054       6 storagepool_create.go:83] Creating storagepool for storagepoolclaim cstor-pool via CASTemplate
> I0526 06:39:29.356738       6 storagepool_create.go:94] Cas template based storagepool created successfully: name 'cstor-pool'
```
先程投入したCRD(StoragePoolClaim)に反応して、cstoreのStorage Poolを生成していることが分かる。
ここから各アプリ向けの専用ストレージが割り当てられるようだ。

Storage PoolのPodを確認してみる。
```shell
kubectl get pod -n openebs -l app=cstor-pool
```
```
> NAME                               READY   STATUS    RESTARTS   AGE
> cstor-pool-fq7f-76b475c577-fx989   3/3     Running   0          12m
> cstor-pool-uwm7-6c8b7d58d8-k6f6n   3/3     Running   0          12m
> cstor-pool-ym6n-6484c7fbfb-2nsnq   3/3     Running   0          12m
```
`maxPools`で指定した数だけcstorのPodが生成されていることが分かる。

Poolしたディスクの使用状況を確認する。
```shell
# cspの省略形も使える
kubectl get cstorpools
```
```
> NAME              ALLOCATED   FREE    CAPACITY   STATUS    TYPE      AGE
> cstor-pool-fq7f   1.58M       9.94G   9.94G      Healthy   striped   19m
> cstor-pool-uwm7   282K        9.94G   9.94G      Healthy   striped   19m
> cstor-pool-ym6n   4.21M       9.93G   9.94G      Healthy   striped   19m
```
Workerノードのディスク10GB * 3が使えるようになっている(GuestOSのディスクサイズみたい)。  
この辺りは別の専用Nodeを準備して[Taints/Toleration](https://kubernetes.io/docs/concepts/configuration/taint-and-toleration/)を使用してPodの配置(データ用ノードにはスケジュールしないとか)を調整した方がいいような気がする(この辺りの設計は難しそう)。
pfffOpenEBSでどのDiskを使用するかはStoragePoolClaimで指定することができる。今回は使用しなかったので、全てのWorkerノードが対象になっている。

## 4. StorageClass作成
いよいよここからKubernetesのStorageClassリソースを作成し、アプリケーションからVolumeとして利用できるように準備する。

<https://docs.openebs.io/docs/next/configuresc.html>

```yaml
 apiVersion: storage.k8s.io/v1
 kind: StorageClass
 metadata:
   name: openebs-sparse-sc
   labels:
     component: openebs-sc
   annotations:
     openebs.io/cas-type: cstor
     # 2つのVolumeにデータをレプリケーションする
     cas.openebs.io/config: |
       - name: StoragePoolClaim
         value: "cstor-pool"
       - name: ReplicaCount
         value: "2"
 provisioner: openebs.io/provisioner-iscsi
```
```shell
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/storage/storageclass.yaml
```

作成したStorageClassリソースの内容を確認する。
```shell
kubectl get sc openebs-sparse-sc
```
```
> NAME                PROVISIONER                    AGE
> openebs-sparse-sc   openebs.io/provisioner-iscsi   11m
```


## 5. 動作確認
Storageを使用するMongoDBをデプロイして、データの永続化ができていることを確認する。
今回はシンプルに1台構成。商用環境等実際の環境でレプリカセットを使う。
- [Running MongoDB as a Microservice with Docker and Kubernetes](https://www.mongodb.com/blog/post/running-mongodb-as-a-microservice-with-docker-and-kubernetes)
```shell
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/storage/mongodb.yaml
```

Podの状態がRunningになるまで待つ（Volumeが割り当てられるまでしばらく時間がかかった）。
```shell
kubectl get pod -o wide
```
```
> NAME      READY   STATUS    RESTARTS   AGE     IP           NODE          NOMINATED NODE   READINESS GATES
> mongo-0   1/1     Running   0          4m57s   10.244.3.8   k8s-worker3   <none>           <none>
```

作成されたMongoDBにデータを登録してみる。
```shell
kubectl exec -it mongo-0 bash
```
```
> mongo
> use testDB
> db.test.insert({name: "Frieza", title: "Kubernetes Hands-On"})
> db.test.insert({name: "Dodoria", title: "Anaconda"})
> db.test.find()
> { "_id" : ObjectId("5cfccd010307cd10b6a514ef"), "name" : "Frieza", "title" : "Kubernetes Hands-On" }
> { "_id" : ObjectId("5cfccd1b0307cd10b6a514f0"), "name" : "Dodoria", "title" : "Anaconda" }
```
Podを消してもデータは消えない（OpenEBS内に永続化されている）。


OpenEBSによって作られたVolumeの中身を見てみる。
```shell
kubectl get pv
```
```
> NAME                                       CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM                       STORAGECLASS        REASON   AGE
> pvc-6e3d9246-8a92-11e9-9253-525400261060   1Gi        RWO            Delete           Bound    default/mongo-pvc-mongo-0   openebs-sparse-sc            32m
```
PersistentVolumeをもう少し詳しくみてみる。

```shell
kubectl describe pv pvc-6e3d9246-8a92-11e9-9253-525400261060
```
```
> Name:            pvc-6e3d9246-8a92-11e9-9253-525400261060
> Labels:          openebs.io/cas-type=cstor
>                  openebs.io/storageclass=openebs-sparse-sc
> Annotations:     openEBSProvisionerIdentity: k8s-worker3
>                  openebs.io/cas-type: cstor
>                  pv.kubernetes.io/provisioned-by: openebs.io/provisioner-iscsi
> Finalizers:      [kubernetes.io/pv-protection]
> StorageClass:    openebs-sparse-sc
> Status:          Bound
> Claim:           default/mongo-pvc-mongo-0
> Reclaim Policy:  Delete
> Access Modes:    RWO
> VolumeMode:      Filesystem
> Capacity:        1Gi
> Node Affinity:   <none>
> Message:   
> Source:
>     Type:               ISCSI (an ISCSI Disk resource that is attached to a kubelet's host machine and then exposed to the pod)
>     TargetPortal:       10.107.19.62:3260
>     IQN:                iqn.2016-09.com.openebs.cstor:pvc-6e3d9246-8a92-11e9-9253-525400261060
>     Lun:                0
>     ISCSIInterface      default
>     FSType:             ext4
>     ReadOnly:           false
>     Portals:            []
>     DiscoveryCHAPAuth:  false
>     SessionCHAPAuth:    false
>     SecretRef:          nil
>     InitiatorName:      <none>
```
OpenEBSのStorageClassでiSCSIディスクリソースとして作成されている。

OpenEBS側は何が起きたのかな？

```shell
kubectl get svc,pod -n openebs
```

```
> NAME                                               TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)                               AGE
> service/admission-server-svc                       ClusterIP   10.109.32.19    <none>        443/TCP                               37m
> service/openebs-apiservice                         ClusterIP   10.110.132.37   <none>        5656/TCP                              37m
> [* service/pvc-6e3d9246-8a92-11e9-9253-525400261060]   ClusterIP   10.107.19.62    <none>        3260/TCP,7777/TCP,6060/TCP,9500/TCP   23m
>
> NAME                                                                  READY   STATUS    RESTARTS   AGE
> (省略)
> [* pod/pvc-6e3d9246-8a92-11e9-9253-525400261060-target-6c7c6769c8djcm7 ]  3/3     Running   0          23m
```

OpenEBSはPersistentVolumeClaimの生成イベントを検知すると専用のPod(DataPlane)を生成し、ストレージを要求するPod(この場合はMongoDB)にアタッチしているようだ。
