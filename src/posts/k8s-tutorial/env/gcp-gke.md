---
title: GCP GKEクラスタ環境構築
author: noboru-kudo
---
今回はGCPのKubernetesのフルマネージドサービス[GKE](https://cloud.google.com/kubernetes-engine)でクラスタ環境を構築してみましょう。

## 1. gcloud CLIのインストール & 初期設定
https://cloud.google.com/sdk/downloads?hl=JA
事前に`mame-k8s`というプロジェクトを作成している前提です。

```shell
# インストール後の設定
gcloud components update
gcloud auth login
# login Google Cloud
gcloud config set project mame-k8s
# Region/Zoneの選択は以下
# gcloud compute zones list
gcloud config set compute/zone asia-northeast1-a
# GKE有効化
gcloud services enable container.googleapis.com
```

## 2. Kubernetesクラスタ環境作成
`gke-cluster`というクラスタをNode数を4として作成してみる(デフォルトは3)。
```shell
gcloud container clusters create gke-cluster --num-nodes 4
```
```
> Creating cluster gke-cluster in asia-northeast1-a... Cluster is being health-checked (master is healthy)...done.                                                                                                                             
> Created [https://container.googleapis.com/v1/projects/mame-k8s/zones/asia-northeast1-a/clusters/gke-cluster].
> To inspect the contents of your cluster, go to: https://console.cloud.google.com/kubernetes/workload_/gcloud/asia-northeast1-a/gke-cluster?project=mame-k8s
> kubeconfig entry generated for gke-cluster.
> NAME         LOCATION           MASTER_VERSION  MASTER_IP    MACHINE_TYPE   NODE_VERSION   NUM_NODES  STATUS
> gke-cluster  asia-northeast1-a  1.12.7-gke.10   34.85.16.52  n1-standard-1  1.12.7-gke.10  4          RUNNING
```
現時点ではKubernetesのバージョンはv1.12だった(この時点で最新は1.14だからGKEでも結構古いのね)。
クラスタの詳細をさらに深掘りしてみる。
```shell
gcloud container clusters describe gke-cluster
```
```
> addonsConfig:
>   kubernetesDashboard:
>     disabled: true
>   networkPolicyConfig:
>     disabled: true
> clusterIpv4Cidr: 10.24.0.0/14
> createTime: '2019-06-02T12:18:49+00:00'
> currentMasterVersion: 1.12.7-gke.10
> currentNodeCount: 4
> currentNodeVersion: 1.12.7-gke.10
> defaultMaxPodsConstraint:
>   maxPodsPerNode: '110'
> endpoint: 34.85.16.52
> initialClusterVersion: 1.12.7-gke.10
> instanceGroupUrls:
> - (省略)
    > labelFingerprint: a9dc16a7
    > legacyAbac: {}
    > location: asia-northeast1-a
    > locations:
> - asia-northeast1-a
    > loggingService: logging.googleapis.com
    > masterAuth:
    >   clusterCaCertificate: (省略)
    > monitoringService: monitoring.googleapis.com
    > name: gke-cluster
    > network: default
    > networkConfig:
    >   network: projects/mame-k8s/global/networks/default
    >   subnetwork: projects/mame-k8s/regions/asia-northeast1/subnetworks/default
    > nodeConfig:
    >   diskSizeGb: 100
    >   diskType: pd-standard
    >   imageType: COS
    >   machineType: n1-standard-1
    >   metadata:
    >     disable-legacy-endpoints: 'true'
    >   oauthScopes:
    >   - (省略)
          >   serviceAccount: default
          > nodeIpv4CidrSize: 24
          > nodePools:
> - config:
    >     diskSizeGb: 100
    >     diskType: pd-standard
    >     imageType: COS
    >     machineType: n1-standard-1
    >     metadata:
    >       disable-legacy-endpoints: 'true'
    >     oauthScopes:
    >     - (省略)
            >     serviceAccount: default
            >   initialNodeCount: 4
            >   instanceGroupUrls:
>   - (省略)
      >   management:
      >     autoRepair: true
      >   name: default-pool
      >   podIpv4CidrSize: 24
      >   selfLink: (省略)
      >   status: RUNNING
      >   version: 1.12.7-gke.10
      > servicesIpv4Cidr: 10.27.240.0/20
      > status: RUNNING
      > subnetwork: default
      > zone: asia-northeast1-a
```

## 3. クラスタ環境への接続
ローカル環境からkubectl経由でGKEに接続する設定をする。
code:bash
gcloud container clusters get-credentials gke-cluster
ホームディレクトリ上のkubeconfigにGKE用のエントリーが追加された。
中身を見てみる。
```shell
kubectl config view
```
```
> apiVersion: v1
> clusters:
> - cluster:
    >     certificate-authority-data: DATA+OMITTED
    >     server: https://34.85.16.52
    >   name: gke_mame-k8s_asia-northeast1-a_gke-cluster
    >   (省略)
    > contexts:
> - context:
    >     cluster: gke_mame-k8s_asia-northeast1-a_gke-cluster
    >     user: gke_mame-k8s_asia-northeast1-a_gke-cluster
    >   name: gke_mame-k8s_asia-northeast1-a_gke-cluster
    >   (省略)
    > current-context: gke_mame-k8s_asia-northeast1-a_gke-cluster
    > kind: Config
    > preferences: {}
    > users:
> - name: gke_mame-k8s_asia-northeast1-a_gke-cluster
    >   user:
    >     auth-provider:
    >       config:
    >         access-token: (省略)
    >         cmd-args: config config-helper --format=json
    >         cmd-path: /Users/xxxxxx/Downloads/google-cloud-sdk/bin/gcloud
    >         expiry: "2019-06-02T13:02:24Z"
    >         expiry-key: '{.credential.token_expiry}'
    >         token-key: '{.credential.access_token}'
    >       name: gcp
    >   (省略)
```
GKE用のCluster、User、Contextが追加されていて、CurrentContextに設定されている。

Kubectlでクラスタ情報を見てみる。
```shell
kubectl cluster-info
```
```
> Kubernetes master is running at https://34.85.16.52
> GLBCDefaultBackend is running at https://34.85.16.52/api/v1/namespaces/kube-system/services/default-http-backend:http/proxy
> Heapster is running at https://34.85.16.52/api/v1/namespaces/kube-system/services/heapster/proxy
> KubeDNS is running at https://34.85.16.52/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy
> Metrics-server is running at https://34.85.16.52/api/v1/namespaces/kube-system/services/https:metrics-server:/proxy
```
やはりHeapster/Metrics Serverといったモニタリング系のサービスが起動している。

最後にGKEのノードを見てみる。
```shell
kubectl get node -o wide
```
```
> NAME                                         STATUS   ROLES    AGE   VERSION          INTERNAL-IP   EXTERNAL-IP      OS-IMAGE                             KERNEL-VERSION   CONTAINER-RUNTIME
> gke-gke-cluster-default-pool-02b18187-1hk0   Ready    <none>   17m   v1.12.7-gke.10   10.146.0.3    35.200.65.20     Container-Optimized OS from Google   4.14.106+        docker://17.3.2
> gke-gke-cluster-default-pool-02b18187-3r91   Ready    <none>   17m   v1.12.7-gke.10   10.146.0.5    34.85.72.70      Container-Optimized OS from Google   4.14.106+        docker://17.3.2
> gke-gke-cluster-default-pool-02b18187-vhf3   Ready    <none>   17m   v1.12.7-gke.10   10.146.0.4    34.85.122.138    Container-Optimized OS from Google   4.14.106+        docker://17.3.2
> gke-gke-cluster-default-pool-02b18187-z6dw   Ready    <none>   17m   v1.12.7-gke.10   10.146.0.2    35.221.117.206   Container-Optimized OS from Google   4.14.106+        docker://17.3.2
```
指定した4台のNodeがReady状態になっている。GKEはマネージドサービスなのでMasterNodeは出てこない（利用者から隠蔽されている）。
OSはGoogleでコンテナ用に最適化されたものが使用されていて、CRIにはDockerを使用しているのが分かる。

## 4. 動作確認
ローカル(Vagrant+VirtualBox)で構築したときと同じようにNginxをデプロイしてみる。
```shell
kubectl create deployment nginx --image=nginx
# 数秒待ってから
kubectl get deployment,replicaset,pod
```
```
> NAME                          DESIRED   CURRENT   UP-TO-DATE   AVAILABLE   AGE
> deployment.extensions/nginx   1         1         1            1           12s
>
> NAME                                    DESIRED   CURRENT   READY   AGE
> replicaset.extensions/nginx-55bd7c9fd   1         1         1       12s
>
> NAME                        READY   STATUS    RESTARTS   AGE
> pod/nginx-55bd7c9fd-g67zb   1/1     Running   0          12s
```

クラウド環境なのでローカルで試したNodePortではなくLoadBalancerタイプでServiceを作成する。
```shell
kubectl create service loadbalancer nginx --tcp 80:80
```
```
> service/nginx created
```
```shell
# 1分くらい待ってから
kubectl get svc
```
```
> NAME         TYPE           CLUSTER-IP      EXTERNAL-IP     PORT(S)        AGE
> kubernetes   ClusterIP      10.27.240.1     <none>          443/TCP        22m
> nginx        LoadBalancer   10.27.241.119   [* 35.243.85.149]   80:31312/TCP   68s
```
LoadBalancerの外部公開IPとして35.243.85.149が割り当てられた。

NginxのWelcomeページにアクセスできるかを試す。
```shell
curl 35.243.85.149
```
```
> <!DOCTYPE html>
> <html>
> <head>
> <title>Welcome to nginx!</title>
>(省略)
> </head>
> <body>
> <h1>Welcome to nginx!</h1>
> <p>If you see this page, the nginx web server is successfully installed and
> working. Further configuration is required.</p>
>
> <p>For online documentation and support please refer to
> <a href="http://nginx.org/">nginx.org</a>.<br/>
> Commercial support is available at
> <a href="http://nginx.com/">nginx.com</a>.</p>
>
> <p><em>Thank you for using nginx.</em></p>
> </body>
```
GKEも無事に接続できました。

## 5. GCPコンソール
動作検証内容がGCPのコンソールでどうなっているのかを見てみる。
- クラスタ概要  
ノード数の増加とかもここでできる。
![](https://i.gyazo.com/a945f88c4a7f5ebf4a83f4811ffdfa70.png)

- ワークロード  
KubernetesのDeploymentリソース。普通はやっちゃダメだけどYAMLの変更とかもできる。
![](https://i.gyazo.com/60265fcd020f3d9231a9dc2dee50a451.png)

- サービス  
KubernetesのServiceリソース。普通はやっちゃダメだけどYAMLの変更とかもできる。
![](https://i.gyazo.com/88709914c40c48d093b9d12cf3875fc5.png)

- ログ  
Google StackDriverから見れる。
![](https://i.gyazo.com/2971768501b859e02f1fed2b1a08cb7e.png)

- VMインスタンス
Kubernetesノードとして4台が生成されている。これがメインの課金対象になる(GKE自体は無償)。
![](https://i.gyazo.com/c3ca2b3bfb9f222e3e06fcd98a4f7c84.png)

- モニタリング
[Google StackDriver] 。専用のウィンドウが立ち上がってきた。これ使えるんだったら[Datadog]とか要らないね。
![](https://i.gyazo.com/7b944e4c37b8e150252c0e1c19112ad3.png)

## 6. クリーンアップ
```shell
# LoadBalancerリソース削除(GKEと連動するGCPリソースなのでクラスタ消してもおそらく消えない)
kubectl delete service nginx
# GKEリソース削除(コンテナはここで消える)
gcloud container clusters delete gke-cluster
```

やっぱりGKEはKubernetes産みの親だけあって、運用面がビルトインで組み込まれていて一歩進んでる感じがした。
