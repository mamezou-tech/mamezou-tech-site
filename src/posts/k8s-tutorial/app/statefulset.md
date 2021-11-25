---
title: ステートフルアプリ(StatefulSet)
author: noboru-kudo
eleventyExcludeFromCollections: true
---
アプリが状態を持っている場合に使用するStatefulSetリソースのハンズオン。

ここでいうステートフルはローカルのファイルシステムとかネットワーク構成に依存するようなアプリを指す。
メモリはダメ。コンテナなので再起動すると消える

StatefulSetリソースは以前のバージョンではPetSetといわれていたようにKubernetesはpodを替えの効かないペットのように丁寧に扱う（ReplicaSetは家畜のように手荒に扱う）。
Deployment/ReplicaSetリソースと違い以下の特徴がある。

- ネットワーク識別子：再起動しても以前と同じホスト名、DNS、Pod識別子。
- ストレージ：再起動しても以前と同じVolumeを引き継ぐ（Pod専用のVolume）
- デプロイ：同時並行ではなく1つずつ(アンデプロイはデプロイとは逆順)

クラスタ構成のDBとかKafka等のミドルウェアで使用する例が多いが、これに適した業務アプリが思いつかない。。
複雑な構造なので、あまり気軽に手を出すものじゃない気がする
ということで[Kubernetesハンズオン-ステートレスアプリ(Deployment)]で使っていたRedisをStatefulSetリソースを使って再構築するハンズオンにする。
前回はパッケージマネージャのHelmを使ってシングル構成＋オンメモリでRedisを導入したが、今回はMaster-Slave構成としてReplicationによる負荷分散を行う。
完成形としては以下のようなイメージになる。

![](https://i.gyazo.com/12198d21d00c309dc2501dbf33f57d48.png)

Slaveはリードレプリカとして読込アクセスをSlaveに分散するようにして可用性を高める。
Masterも複数用意してデータをシャーディングすることで書込トランザクションも分散することができる(Redis Cluster)

<https://redis.io/topics/cluster-tutorial#redis-cluster-data-sharding>

さらに可用性を高めるにはRedis Sentinelを利用する。Sentinelがノードを監視して、Masterが死ぬとSlaveがMasterに昇格する。

<https://redis.io/topics/sentinel>

RedisのHelm Chartのパラメータを調整すればこんなことをしなくてもできるがそこは突っ込まない

前提とする環境は以下の通り。
- [Kubernetesハンズオン-ローカルクラスタ環境構築]
- [Kubernetesハンズオン-Ingress Controller - Nginx]
- [Kubernetesハンズオン-Container Storage]


## Redis
前回はHelm Chartから作ったが今回は1からMaster Slave構成で作成する。

### Namespaceリソース
今回Redisはアプリケーションとは別のnamespaceに配置しておくようにする。

```shell
kubectl create namespace redis
```

### Secretリソース
Redisのパスワードを含むSecretリソースを作成しておく(YAMLではなくCLIにする)。
```shell
kubectl create secret generic redis-secret --from-literal password=frieza-redis-pass -n redis
```

[* Serviceリソース(Headless)]
StatefulSetを構成するPodが再起動時でも安定したネットワーク識別子を維持できるようにServiceリソースを作成しておく必要がある(StatefulSetの要件)。
これはクラスタ構成内のメンバーがお互いを認識するために必要なもので、他のPodに対して公開するものではない。
```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis-headless
  namespace: redis
  labels:
    app: redis
spec:
  type: ClusterIP
  clusterIP: None
  selector:
    app: redis
  ports:
  - name: redis
    port: 6379
    targetPort: redis
```
ポイントはClusterIPに`None`を指定している部分。こうすることでLabel SelectorでスコープとなるPod群のIPアドレスが直接取得できるようになる（Serviceリソースに対してClusterIPは割り当てられない）。
```shell
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/app/stateful/k8s/redis/headless-service.yaml
```
作成したリソースを見てみる。
```shell
kubectl get svc -n redis -l app=redis -o wide
```
```
> NAME             TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)    AGE     SELECTOR
> redis-headless   ClusterIP   [* None]         <none>        6379/TCP   2m15s   app=redis
```
CLUSTER-IPがNoneになっており、IPアドレスが割り当てられていないことが分かる（このServiceリソースの挙動は後述）。
このようなServiceはHeadless Serviceという。

### ConfigMapリソース
Redisの設定情報を格納する。Master, Slaveを1つにまとめて作成する(別に分けてもいい)。
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis
  namespace: redis
data:
  master.conf: |
    bind 0.0.0.0
    protected-mode no
    port 6379
    tcp-backlog 511
    timeout 0
    tcp-keepalive 300
    daemonize no
    supervised no
    pidfile /var/run/redis_6379.pid
    loglevel notice
    dir /data
    logfile ""
  slave.conf: |
    slaveof redis-master-0.redis-headless 6379
    protected-mode no
    dir /data
```
Master用の設定ファイルを`master.conf`、Slave用の設定ファイルを`slave.conf`として作成している。
ポイントはslave.confで指定している`slaveof`の値に`redis-master-0.redis-headless 6379`と直接Masterのpodを指定している部分。これは先程作成したHeadless Serviceが管理しているPod(redis-master-0)を指定しているものでDeployment/ReplicaSetリソースはこのような指定はできない(Pod名はランダムなサフィックスが追加される)。
これをKubernetesに投入する。

```shell
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/app/stateful/k8s/redis/configmap.yaml
```

### StatefulSetリソース(Master)
Redisへの書込みとSlaveへのReplicationを行うMasterノードのStatefulSetリソースを作成する。今回はRedis Clusterによるシャーディングはしていないので1台のみ。
StatefulSetリソースはDeployment/ReplicaSetリソースと似ているが一部独自の項目がある。
```yaml
 apiVersion: apps/v1
 kind: StatefulSet
 metadata:
   name: redis-master
   namespace: redis
   labels:
     app: redis
     role: master
 spec:
   # デプロイ戦略
   updateStrategy: 
     type: RollingUpdate
   # Headless Service(StatefulSetの要件)
   serviceName: redis-headless
   selector:
     matchLabels:
       app: redis
       role: master
   template:
     metadata:
       labels:
         app: redis
         role: master
     spec:
       containers:
       - name: redis
         # Redisイメージ
         image: redis:5.0.5
         imagePullPolicy: IfNotPresent
         # Redis起動設定
         command: ["redis-server"]
         args: ["/etc/redis/master.conf", "--requirepass", "$(REDIS_PASSWORD)"]
         env:
         # 先程作成したSecretリソースの値を環境変数に注入
         - name: REDIS_PASSWORD
           valueFrom:
             secretKeyRef:
               key: password
               name: redis-secret
         resources:
           limits:
             memory: "256Mi"
             cpu: "200m"
         ports:
           - name: redis
             containerPort: 6379
         volumeMounts:
         # Dataの永続Volume(StatefulSetにより専用ストレージが割り当てられる)
         - name: redis-data
           mountPath: /data
         # RedisのConfig。先程作成したConfigMapリソースをVolumeとしてマウントする
         - name: conf
           mountPath: /etc/redis
       volumes:
         - name: conf
           configMap:
             name: redis
   # Pod別に割り当てられるPVCのテンプレート(OpenEBS)
   volumeClaimTemplates:
   - metadata:
       name: redis-data
     spec:
       storageClassName: openebs-sparse-sc
       resources:
         requests:
           storage: 2Gi
       accessModes:
       - ReadWriteOnce
```
ポイントは以下の通り。
`serviceName`にHeadless Serviceリソースの名前を指定する。このサービスを通してPod別にDNSのAレコードが割り当てられる(先程のConfigMapではこれを利用している)。StatefulSetの必須フィールド。
環境変数`REDIS_PASSWORD`に対して先程作成したSecretリソースのパスワードを割り当て、redis-serverコマンドの引数に渡している。
先程作成したConfigMapリソースをVolumeとしてコンテナの`/etc/redis`にMountし、その中のmaster.confをredis-serverコマンドの引数に渡している。Redisはこの設定をもとにサーバを構成する。
Deployment/ReplicaSetリソースにはない`volumeClaimTemplates`フィールドを作成している。これにより作成された各Podに対応して専用のPersistentVolumeClaim(PVC)が生成・割当てられる。このPVCはStatefulSetやPodが削除されても消されず、Podが起動するとそのまま引き継がれる。
このリソースを投入する。

```shell
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/app/stateful/k8s/redis/master-statefulset.yaml
```

RedisのMasterノードが起動していることを確認する。
```shell
# StatefulSet,Pod,PersistentVolumeClaim,PersistentVolume
kubectl get sts,pod,pvc,pv -n redis
```
```
> [* # StatefulSet]
> NAME                            READY   AGE
> statefulset.apps/redis-master   1/1     2m16s
> [* # Pod (creted by StatefulSet)]
> NAME                 READY   STATUS    RESTARTS   AGE
> pod/redis-master-0   1/1     Running   0          2m16s
> [* # PersistentVolumeClaim (creted by StatefulSet)]
> NAME                                              STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS        AGE
> persistentvolumeclaim/redis-data-redis-master-0   Bound    pvc-e9d7ae9d-a053-11e9-89af-525400261060   2Gi        RWO            openebs-sparse-sc   2m16s
>  [* # PersitentVolume (from OpenEBS)]
> NAME                                                        CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM                             STORAGECLASS        REASON   AGE
> persistentvolume/pvc-e9d7ae9d-a053-11e9-89af-525400261060   2Gi        RWO            Delete           Bound    redis/redis-data-redis-master-0   openebs-sparse-sc            2m10s
```
StatefulSetを起点としてPod -> PersistentVolumeClaim -> PersitentVolume(OpenEBS由来の分散ストレージ)が作成、起動していることが分かる。
また、Pod名が`redis-master-0`とReplicaSetのようにランダムな文字列のサフィックスではなくOrdinalなインデックス値が割り当てられていることも分かる（再起動をしても同一の識別子を引き継ぐことになる）。

RedisのMasterノードのログを見てみる。
```shell
kubectl logs redis-master-0 -n redis
```
```
> 1:C 07 Jul 2019 01:10:19.527 # oO0OoO0OoO0Oo Redis is starting oO0OoO0OoO0Oo
> 1:C 07 Jul 2019 01:10:19.527 # Redis version=5.0.5, bits=64, commit=00000000, modified=0, pid=1, just started
> 1:C 07 Jul 2019 01:10:19.527 # Configuration loaded
> 1:M 07 Jul 2019 01:10:19.528 * Running mode=standalone, port=6379.
> 1:M 07 Jul 2019 01:10:19.528 # WARNING: The TCP backlog setting of 511 cannot be enforced because /proc/sys/net/core/somaxconn is set to the lower value of 128.
> 1:M 07 Jul 2019 01:10:19.528 # Server initialized
> 1:M 07 Jul 2019 01:10:19.528 # WARNING you have Transparent Huge Pages (THP) support enabled in your kernel. This will create latency and memory usage issues with Redis. To fix this issue run the command 'echo never > /sys/kernel/mm/transparent_hugepage/enabled' as root, and add it to your /etc/rc.local in order to retain the setting after a reboot. Redis must be restarted after THP is disabled.
> 1:M 07 Jul 2019 01:10:19.531 * Ready to accept connections
```
Redisが起動していることが分かる（警告は無視。。）。

### StatefulSetリソース(Slave)
Masterノードが起動したので、次はRedisの読込みを行うSlaveノードのStatefulSetリソースを作成する。Masterノードと違い、SlaveはReplica数を増やすことが可能で、読込リクエストに応じてスケールさせることができる。
基本的にはMasterノードとほとんど同じ。
```yaml
 apiVersion: apps/v1
 kind: StatefulSet
 metadata:
   name: redis-slave
   namespace: redis
   labels:
     app: redis
     role: slave
 spec:
   # Slave Read-Replica数
   replicas: 2
   # デプロイ戦略
   updateStrategy: 
     type: RollingUpdate
   # Headless Service(StatefulSetの要件)
   serviceName: redis-headless
   selector:
     matchLabels:
       app: redis
       role: slave
   template:
     metadata:
       labels:
         app: redis
         role: slave
     spec:
       containers:
       - name: redis
         # Redisイメージ
         image: redis:5.0.5
         imagePullPolicy: IfNotPresent
         # Redis起動設定
         command: ["redis-server"]
         args: ["/etc/redis/slave.conf", "--requirepass", "$(REDIS_PASSWORD)", "--masterauth", "$(REDIS_PASSWORD)"]
         env:
         - name: REDIS_PASSWORD
           valueFrom:
             secretKeyRef:
               key: password
               name: redis-secret
         resources:
           limits:
             memory: "256Mi"
             cpu: "200m"
         ports:
           - name: redis
             containerPort: 6379
         volumeMounts:
         # Dataの永続Volume(StatefulSetにより専用ストレージが割り当てられる)
         - name: redis-data
           mountPath: /data
         # RedisのConfig
         - name: conf
           mountPath: /etc/redis
       volumes:
         - name: conf
           configMap:
             name: redis
   # Pod別に割り当てられるPVCのテンプレート(OpenEBS)
   volumeClaimTemplates:
   - metadata:
       name: redis-data
     spec:
       storageClassName: openebs-sparse-sc
       resources:
         requests:
           storage: 2Gi
       accessModes:
       - ReadWriteOnce
```
Masterノードとの違いは以下の通り。
`role`に`slave`を設定していること(この後で公開用Serviceを作成するときに利用)。
2台のレプリカ数として読込アクセスが負荷分散されるようにしている(`replicas`フィールド)
redis-serverの引数にConfigMapリソースのVolumeからSlave用の設定(slave.conf)を渡している。
レプリケーション時の認証を通すためにredis-serverの引数に`--masterauth`としてSecretリソースのパスワードを渡している。
これを投入する。
```shell
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/app/stateful/k8s/redis/slave-statefulset.yaml
```

Masterのとき同様に作成されたリソースを見てみる。
```shell
# StatefulSet,Pod,PersistentVolumeClaim,PersistentVolume
kubectl get sts,pod,pvc,pv -n redis
```
```
> (Master部分は除外)
> [* # StatefulSet]
> NAME                            READY   AGE
> statefulset.apps/redis-slave    2/2     2m58s
> [* # Pod (creted by StatefulSet)]
> NAME                 READY   STATUS    RESTARTS   AGE
> pod/redis-slave-0    1/1     Running   0          2m58s
> pod/redis-slave-1    1/1     Running   0          103s
> [* # PersistentVolumeClaim (creted by StatefulSet)]
> NAME                                              STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS        AGE
> persistentvolumeclaim/redis-data-redis-slave-0    Bound    pvc-beb75079-a056-11e9-89af-525400261060   2Gi        RWO            openebs-sparse-sc   2m58s
> persistentvolumeclaim/redis-data-redis-slave-1    Bound    pvc-eafc3712-a056-11e9-89af-525400261060   2Gi        RWO            openebs-sparse-sc   103s
> [* # PersistentVolume(from OpenEBS)]
> NAME                                                        CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM                             STORAGECLASS        REASON   AGE
> persistentvolume/pvc-beb75079-a056-11e9-89af-525400261060   2Gi        RWO            Delete           Bound    redis/redis-data-redis-slave-0    openebs-sparse-sc            2m57s
> persistentvolume/pvc-eafc3712-a056-11e9-89af-525400261060   2Gi        RWO            Delete           Bound    redis/redis-data-redis-slave-1    openebs-sparse-sc            98s
```
予想通り2つのレプリカで一連のセットのリソースが作成されている。ここでは表現できないがDeployment/ReplicaSetのように一気に起動されずにPodはordinal値0 -> 1と1つずつ順に起動される(起動時にリソース競合が発生しないようにKubernetesが配慮している)。

1つだけSlaveノードのRedisのログを見てみる。
```shell
kubectl logs redis-slave-0 -n redis
```
```
> 1:C 07 Jul 2019 01:31:17.065 # oO0OoO0OoO0Oo Redis is starting oO0OoO0OoO0Oo
> 1:C 07 Jul 2019 01:31:17.065 # Redis version=5.0.5, bits=64, commit=00000000, modified=0, pid=1, just started
> 1:C 07 Jul 2019 01:31:17.065 # Configuration loaded
> 1:S 07 Jul 2019 01:31:17.066 * Running mode=standalone, port=6379.
> 1:S 07 Jul 2019 01:31:17.066 # WARNING: The TCP backlog setting of 511 cannot be enforced because /proc/sys/net/core/somaxconn is set to the lower value of 128.
> 1:S 07 Jul 2019 01:31:17.066 # Server initialized
> 1:S 07 Jul 2019 01:31:17.066 # WARNING you have Transparent Huge Pages (THP) support enabled in
> your kernel. This will create latency and memory usage issues with Redis. To fix this issue run the command 'echo never > /sys/kernel/mm/transparent_hugepage/enabled' as root, and add it to yo
> ur /etc/rc.local in order to retain the setting after a reboot. Redis must be restarted after TH
> P is disabled.
> 1:S 07 Jul 2019 01:31:17.069 * Ready to accept connections
> 1:S 07 Jul 2019 01:31:17.069 *[*  Connecting to MASTER redis-master-0.redis-headless:6379]
> 1:S 07 Jul 2019 01:31:17.076 * MASTER <-> REPLICA sync started
> 1:S 07 Jul 2019 01:31:17.080 * Non blocking connect for SYNC fired the event.
> 1:S 07 Jul 2019 01:31:17.081 * Master replied to PING, replication can continue...
> 1:S 07 Jul 2019 01:31:17.085 * Partial resynchronization not possible (no cached master)
> 1:S 07 Jul 2019 01:31:17.086 * Full resync from master: 0e358f15d31b5895e5667becf221fdc5e4908ee2:0
> 1:S 07 Jul 2019 01:31:17.233 * MASTER <-> REPLICA sync: receiving 175 bytes from master
> 1:S 07 Jul 2019 01:31:17.233 * MASTER <-> REPLICA sync: Flushing old data
> 1:S 07 Jul 2019 01:31:17.233 * MASTER <-> REPLICA sync: Loading DB in memory
> [* 1:S 07 Jul 2019 01:31:17.233 * MASTER <-> REPLICA sync: Finished with success]
```
Slaveが起動し、MasterのReplication通信が行われていることが分かる。

### Serviceリソース(アプリ公開用)
最後にこれらをアプリに公開するようにServiceリソースを構成する。書込と読込(Read-Replica)でエンドポイントを分けるので2つ用意する。
```yaml
 apiVersion: v1
 kind: Service
 metadata:
   name: redis-master
   namespace: redis
   labels:
     app: redis
 spec:
   type: ClusterIP
   selector:
     app: redis
     role: master
   ports:
   - name: redis
     port: 6379
     targetPort: redis
```
```yaml
 apiVersion: v1
 kind: Service
 metadata:
   name: redis-slave
   namespace: redis
   labels:
     app: redis
 spec:
   type: ClusterIP
   selector:
     app: redis
     role: slave
   ports:
   - name: redis
     port: 6379
     targetPort: redis
```
roleラベルでMaster, SlaveそれぞれのPodをスコープとするように指定した普通のServiceでアプリ向けのエンドポイントになる。
これを投入する。
```shell
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/app/stateful/k8s/redis/service-master.yaml
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/app/stateful/k8s/redis/service-slave.yaml
```

## 動作確認

ここで起動したRedisが動作していることを確認する。

まず、StatefulSetの安定したネットワーク構成を支えるHeadlessサービス(redis-headless)のDNSレコードの状態見てみる。
まずはAレコードを見てみる。
```shell
kubectl run -it srvlookup --image=tutum/dnsutils --rm --restart=Never -- dig redis-headless.redis.svc.cluster.local
```
```
> ; <<>> DiG 9.9.5-3ubuntu0.2-Ubuntu <<>> redis-headless.redis.svc.cluster.local
> ;; global options: +cmd
> ;; Got answer:
> ;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 45279
> ;; flags: qr aa rd; QUERY: 1, ANSWER: 3, AUTHORITY: 0, ADDITIONAL: 1
> ;; WARNING: recursion requested but not available
>
> ;; OPT PSEUDOSECTION:
> ; EDNS: version: 0, flags:; udp: 4096
> ;; QUESTION SECTION:
> ;redis-headless.redis.svc.cluster.local.        IN A
>
> ;; ANSWER SECTION:
>[*  redis-headless.redis.svc.cluster.local. 5 IN A  10.244.2.163]
> [* redis-headless.redis.svc.cluster.local. 5 IN A  10.244.3.144]
> [* redis-headless.redis.svc.cluster.local. 5 IN A  10.244.3.143]
```
HeadlessサービスはIPアドレスが割り当てられないので(ClusterIP=None)、スコープとなる全てのPodのIPアドレスが返される。
さらにHeadlessサービスはDNSのSRVレコード(あまり聞き慣れない。。？)も作成しており、ここからスコープ内の全てのPodのホスト名やポートを取得することができる。

```shell
kubectl run -it srvlookup --image=tutum/dnsutils --rm --restart=Never -- dig SRV redis-headless.redis.svc.cluster.local
```

```
> ; <<>> DiG 9.9.5-3ubuntu0.2-Ubuntu <<>> SRV redis-headless.redis.svc.cluster.local
> ;; global options: +cmd
> ;; Got answer:
> ;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 11794
> ;; flags: qr aa rd; QUERY: 1, ANSWER: 3, AUTHORITY: 0, ADDITIONAL: 4
> ;; WARNING: recursion requested but not available
>
> ;; OPT PSEUDOSECTION:
> ; EDNS: version: 0, flags:; udp: 4096
> ;; QUESTION SECTION:
> ;redis-headless.redis.svc.cluster.local.        IN SRV
>
> ;; ANSWER SECTION:
> [* redis-headless.redis.svc.cluster.local. 5 IN SRV 0 33 6379 redis-slave-0.redis-headless.redis.svc.cluster.local.]
> [* redis-headless.redis.svc.cluster.local. 5 IN SRV 0 33 6379 redis-master-0.redis-headless.redis.svc.cluster.local.]
> [* redis-headless.redis.svc.cluster.local. 5 IN SRV 0 33 6379 redis-slave-1.redis-headless.redis.svc.cluster.local.]
>
> ;; ADDITIONAL SECTION:
> [* redis-slave-0.redis-headless.redis.svc.cluster.local. 5 IN A 10.244.2.163]
> [* redis-slave-1.redis-headless.redis.svc.cluster.local. 5 IN A 10.244.3.144]
> [* redis-master-0.redis-headless.redis.svc.cluster.local. 5 IN A 10.244.3.143]
```
ADDITIONAL SECTIONに出ているように各PodのAレコードも登録済みであることが分かる。
実際にSlaveのConfigMapリソースではMaster PodのAレコードを通して対応するMasterノードにアクセスしている。

次にRedis CLIを通して、実際にデータが登録・取得できることを確認する。
```shell
# CLI用のPodを作成
kubectl run -it rediscli --image=goodsmileduck/redis-cli --rm --restart=Never sh
# Master
redis-cli -h redis-master-0.redis-headless.redis.svc.cluster.local -a frieza-redis-pass
set test frieza
# OK
get test
# "frieza"
quit
# Slave-0(Read Replica)
redis-cli -h redis-slave-0.redis-headless.redis.svc.cluster.local -a frieza-redis-pass
get test
# "frieza"
set error read-only
# (error) READONLY You can't write against a read only replica.
quit
# Slave-1(Read Replica)
redis-cli -h redis-slave-1.redis-headless.redis.svc.cluster.local -a frieza-redis-pass
get test
# "frieza"
set error read-only
# (error) READONLY You can't write against a read only replica.
quit
```
期待通りMasterで登録した内容はSlaveにレプリケーションされていることが分かる。

Slaveを1つ殺して、再起動した後でもデータが取得できるかを見てみる。
```shell
# 別ターミナルで実施
# slave-0を殺す
kubectl delete pod redis-slave-0 -n redis
kubectl get pod -n redis
```
```
> NAME             READY   STATUS        RESTARTS   AGE
> redis-master-0   1/1     Running       0          3h58m
> redis-slave-0    0/1     Terminating   0          55s
> redis-slave-1    1/1     Running       0          3h36m
```
StatefulSetがすぐに新しいPodを起動する。
```shell
kubectl get pod -n redis
```
```
> NAME             READY   STATUS              RESTARTS   AGE
> redis-master-0   1/1     Running             0          3h57m
> redis-slave-0    0/1     ContainerCreating   0          1s
> redis-slave-1    1/1     Running             0          3h35m
```
```shell
kubectl get pod -n redis
```
```
> NAME             READY   STATUS    RESTARTS   AGE
> redis-master-0   1/1     Running   0          3h58m
> redis-slave-0    1/1     Running   0          28s
> redis-slave-1    1/1     Running   0          3h37m
```
```shell
# Redis-CLIターミナルで実施
redis-cli -h redis-slave-0.redis-headless.redis.svc.cluster.local -a frieza-redis-pass
get test
# "frieza"
quit
```

Slaveのレプリカ数を増やしてみる。
```shell
# 別ターミナルで実施
# CLIからレプリカ数を3に増やす
kubectl scale --replicas=3 sts/redis-slave -n redis
# redis-slave-2が増設された
kubectl get pod -n redis
```
```
> NAME             READY   STATUS              RESTARTS   AGE
> redis-master-0   1/1     Running             0          4h7m
> redis-slave-0    1/1     Running             0          9m27s
> redis-slave-1    1/1     Running             0          3h46m
> redis-slave-2    0/1     ContainerCreating   0          24s
```
```shell
kubectl get pod -n redis
```
```
> NAME             READY   STATUS    RESTARTS   AGE
> redis-master-0   1/1     Running   0          4h8m
> redis-slave-0    1/1     Running   0          9m37s
> redis-slave-1    1/1     Running   0          3h46m
> redis-slave-2    1/1     Running   0          34s
```

```shell
# Redis-CLIターミナルで実施
# 新しくできたredis-slave-2にアクセス
redis-cli -h redis-slave-2.redis-headless.redis.svc.cluster.local -a frieza-redis-pass
get test
# "frieza"
quit
# 別ターミナルに戻る
# スケールダウンしてレプリカ数を戻す
kubectl scale --replicas=2 sts/redis-slave -n redis
```

## API Gateway
Redis側の準備ができたので、アプリの方を対応する。
api-gateway以外は[Kubernetesハンズオン-ステートレスアプリ(Deployment)]と同じだが、Redisを直接使うapi-gatewayはいくつかの修正が必要になる。

### ConfigMapリソース

api-gatewayのConfigMapリソースはRedisの公開Serviceリソースを示すように変更する。

```yaml
 apiVersion: v1
 kind: ConfigMap
 metadata:
   name: api-gateway-config
   labels:
     app: api-gateway
 data:
   # backend service
   serviceURL: http://github-service.default.svc.cluster.local/github
   # redis for cache
   redisMaster: redis-master.redis
   redisSlave: redis-slave.redis
   redisPort: "6379"
```

### Deploymentリソース
上記ConfigMapよりRedisのエンドポイント(Master/Slave)を環境変数としてコンテナに配布する。

```yaml
    spec:
      # Pod内のコンテナ(api-gateway)に関する設定
      containers:
      - name: api-gateway
        # コンテナイメージのリポジトリ＋Tag
        image: kudohn/api-gateway:v2
        # (省略)
        env:
           - name: REDIS_HOST_MASTER
             valueFrom:
               configMapKeyRef:
                 name: api-gateway-config
                 key: redisMaster
           - name: REDIS_HOST_SLAVE
             valueFrom:
               configMapKeyRef:
                 name: api-gateway-config
                 key: redisSlave
```

## アプリケーション(api-gateway)
アプリケーション側では上記環境変数で渡されたHostをもとにRedis Clientを使う部分をWrite/Readで分離する(Redis Clusterを使う場合はioredisライブラリで対応している)。

<https://github.com/kudoh/k8s-hands-on/tree/master/app/stateful/api-gateway>

主なソースコード変更箇所は以下の通り。
```javascript
 const redisMaster = process.env.REDIS_HOST_MASTER || 'localhost'
 const redisSlave = process.env.REDIS_HOST_SLAVE || 'localhost'
 
 const master = new Redis({
     port: redisPort,
     host: redisMaster, // RedisのMasterノードのServiceリソース(環境変数より取得)
     password: redisPassword
 });
 const slave = new Redis({
     port: redisPort,
     host: redisSlave, // RedisのSlaveノードのServiceリソース(環境変数より取得)
     password: redisPassword
 });
  
 const jsonWriteCache = new JSONCache(master, {prefix: 'cache:'});
 const jsonReadCache = new JSONCache(slave, {prefix: 'cache:'});
 // 省略
 // from Slave Node
 const response = await jsonReadCache.get(query);
 if (response) {
    console.log(`retrieved from Cache. query: ${query}`)  
    res.status(200).json(response);
    return;
 } 
 
 client.get(`/repos?query=${query}`)
    .then(async result => {
      console.log(`retrieved github data successfully. caching for next request.`)
      // set Master Node
      await jsonWriteCache.set(query, result.data, {expire: 60 * 60});
      res.status(200).json(result.data);
    })
```

## アプリデプロイ＆動作確認
ようやく準備ができんたので、全てのアプリリソースをKubernetesに投入する。
```shell
# github-service
GITHUB_USER=$(echo -n "<your-github-userid>" | base64)
GITHUB_PASSWORD=$(echo -n "<your-github-password>" | base64)
curl -sSL https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/app/stateless/k8s/github-service/secret.yaml | \
  sed -e "s/user: ''/user: $GITHUB_USER/g" | \
  sed -e "s/password: ''/password: $GITHUB_PASSWORD/g" | \
  kubectl apply -f-
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/app/stateless/k8s/github-service/deployment.yaml
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/app/stateless/k8s/github-service/service.yaml
# api-gateway. ここだけ変更
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/app/stateful/k8s/api-gateway/configmap.yaml
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/app/stateful/k8s/api-gateway/secret.yaml
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/app/stateful/k8s/api-gateway/deployment.yaml
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/app/stateful/k8s/api-gateway/service.yaml
# repo-search-ui
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/app/stateless/k8s/repo-search-ui/configmap.yaml
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/app/stateless/k8s/repo-search-ui/deployment.yaml
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/app/stateless/k8s/repo-search-ui/service.yaml
# Ingress
openssl req -x509 -sha256 -nodes -days 365 -newkey rsa:2048 -keyout tls.key -out tls.crt -subj "/CN=frieza.local/O=Mamezou"
kubectl create secret tls tls-secret --key tls.key --cert tls.crt
```

アプリの状態を確認する(一部省略)。

```shell
kubectl get pod -o wide
```

```
> NAME                                             READY   STATUS    RESTARTS   AGE     IP             NODE       
> api-gateway-84d6f85f4c-kdhr5                     1/1     Running   0          2m25s   10.244.3.149   k8s-worker3
> api-gateway-84d6f85f4c-vx6j4                     1/1     Running   0          2m25s   10.244.2.170   k8s-worker2
> api-gateway-84d6f85f4c-w7vjn                     1/1     Running   0          2m25s   10.244.1.190   k8s-worker1
> api-gateway-84d6f85f4c-whps2                     1/1     Running   0          2m25s   10.244.1.189   k8s-worker1
> github-service-868f499f45-hmxhg                  1/1     Running   0          3m5s    10.244.3.148   k8s-worker3
> github-service-868f499f45-vqjfn                  1/1     Running   0          3m5s    10.244.2.169   k8s-worker2
> nginx-ingress-controller-5bb5cd56fb-jjfkd        1/1     Running   0          22d     10.244.3.11    k8s-worker3
> nginx-ingress-controller-5bb5cd56fb-v98fk        1/1     Running   0          22d     10.244.2.9     k8s-worker2
> nginx-ingress-default-backend-7f5d59d759-lbqg5   1/1     Running   0          22d     10.244.3.12    k8s-worker3
> rediscli                                         1/1     Running   0          50m     10.244.2.166   k8s-worker2
> repo-search-ui-7cdbcd695c-gg5rr                  1/1     Running   0          118s    10.244.2.171   k8s-worker2
> repo-search-ui-7cdbcd695c-pqxct                  1/1     Running   0          118s    10.244.3.150   k8s-worker3
```
いろんなWorker Nodeにまたがってアプリがデプロイされた

前回と同じようにブラウザで`https://github.frieza.local`にアクセスする(/etc/hostsにエントリ追加済みの前提)。
[[https://gyazo.com/7beba64370b84c0e5ae90fc8d92c7014]]
UI変わっていないので前と同じだけど、ちゃんと動いている。

前に作成しておいたRedis-CLIターミナルでSlaveのキャッシュの中身を見てみる。api-gateway内部で使っているjson-cacheライブラリはHash構造でRedisにデータを格納している。
```shell
# Slave
redis-cli -h redis-master-0.redis-headless.redis.svc.cluster.local -a frieza-redis-pass hgetall cache:frieza | head -n 10
```
```
> 10.size
> 6406
> 14.language
>
> 12.avatar_url
> https://avatars2.githubusercontent.com/u/51203?v=4
> 14.id
> 171743780
> 7.html_url
> https://github.com/colorlessenergy/frieza
```

見にくいけどちゃんとキャッシュとしてGithubの結果が格納されている。
