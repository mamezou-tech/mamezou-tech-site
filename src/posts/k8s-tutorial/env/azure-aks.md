---
title: Azure AKSクラスタ環境構築
author: noboru-kudo
---
今回はAzureのKubernetesのフルマネージドサービス[AKS](https://azure.microsoft.com/en-us/services/kubernetes-service/)でクラスタ環境を構築してみましょう。

WebコンソールではなくAzure CLIから作成する。

## Azure CLIのインストール
https://docs.microsoft.com/ja-jp/cli/azure/install-azure-cli?view=azure-cli-latest

## リソースグループの作成
Kubernetes用のリソースグループ(region=japaneast)を作成する。
```shell
# Location表示
az account list-locations | jq -r '.[].name'
# japaneast(東日本)で作成
az group create --name k8sResourceGroup --location japaneast
```
```
> {
>   "id": "/subscriptions/9ba645f4-9377-4161-a3f3-ad51ebebf567/resourceGroups/k8sResourceGroup",
>   "location": "japaneast",
>   "managedBy": null,
>   "name": "k8sResourceGroup",
>   "properties": {
>     "provisioningState": "Succeeded"
>   },
>   "tags": null,
>   "type": null
> }
```

## Kubernetesクラスタ環境構築
Node数2(それ以外はデフォルト)でクラスタ環境を構築する。
無料枠でNode数3だとQuota超過でエラーになった。。(使えるCPUコア数は4つまで)
```shell
az aks create \
--resource-group k8sResourceGroup \
--name aks-cluster \
--node-count 2 \
--enable-addons monitoring \
--generate-ssh-keys
```
```
> {
>   (中略)
>   "agentPoolProfiles": [
>     {
>       "availabilityZones": null,
>       "count": 2,
>       "enableAutoScaling": null,
>       "maxCount": null,
>       "maxPods": 110,
>       "minCount": null,
>       "name": "nodepool1",
>       "orchestratorVersion": "1.12.8",
>       "osDiskSizeGb": 100,
>       "osType": "Linux",
>       "provisioningState": "Succeeded",
>       "type": "AvailabilitySet",
>       "vmSize": "Standard_DS2_v2",
>       "vnetSubnetId": null
>     }
>   ],
>   "apiServerAuthorizedIpRanges": null,
>   "dnsPrefix": "aks-cluste-k8sResourceGroup-9ba645",
>   "enablePodSecurityPolicy": null,
>   "enableRbac": true,
>   "fqdn": "[* aks-cluste-k8sresourcegroup-9ba645-811034a9.hcp.japaneast.azmk8s.io]",
>   "id": "/subscriptions/9ba645f4-9377-4161-a3f3-ad51ebebf567/resourcegroups/k8sResourceGroup/providers/Microsoft.ContainerService/managedClusters/aks-cluster",
> [*   "kubernetesVersion": "1.12.8"],
>   (中略)
>   "location": "japaneast",
>   "name": "aks-cluster",
>   "networkProfile": {
>     "dnsServiceIp": "10.0.0.10",
>     "dockerBridgeCidr": "172.17.0.1/16",
>     "networkPlugin": "kubenet",
>     "networkPolicy": null,
>     "podCidr": "10.244.0.0/16",
>     "serviceCidr": "10.0.0.0/16"
>   },
>   "nodeResourceGroup": "MC_k8sResourceGroup_aks-cluster_japaneast",
>   "provisioningState": "Succeeded",
>   "resourceGroup": "k8sResourceGroup",
>   "servicePrincipalProfile": {
>     "clientId": "14ebfe4b-5fbb-425c-946f-f4ca1dd0b763",
>     "secret": null
>   },
>   "tags": null,
>   "type": "Microsoft.ContainerService/ManagedClusters"
> }
```
Kubernetes v1.12の環境がセットアップされて、FQDNとして`aks-cluste-k8sresourcegroup-9ba645-811034a9.hcp.japaneast.azmk8s.io`が割り当てられている。

## クラスタ環境への接続
ローカル環境から[Kubectl]経由でAKSに接続する設定をする。
```shell
az aks get-credentials --resource-group k8sResourceGroup --name aks-cluster
```
```
> Merged "aks-cluster" as current context in /Users/xxxx/.kube/config
ホームディレクトリ上のkubeconfigにAKS用のエントリーが追加された。
中身を見てみる。
code:bash
kubectl config view
> apiVersion: v1
> clusters:
> - cluster:
    >     certificate-authority-data: DATA+OMITTED
    >     server: https://aks-cluste-k8sresourcegroup-9ba645-811034a9.hcp.japaneast.azmk8s.io:443
    >   name: aks-cluster
    > (省略)
    > contexts:
> - context:
    >     cluster: aks-cluster
    >     user: clusterUser_k8sResourceGroup_aks-cluster
    >   name: aks-cluster
    > (省略)
    > current-context: aks-cluster
    > kind: Config
    > preferences: {}
    > users:
> - name: clusterUser_k8sResourceGroup_aks-cluster
    >   user:
    >     client-certificate-data: REDACTED
    >     client-key-data: REDACTED
    >     token: 29eb5ff44a10bdf11fbf3dd7224a1b88
    > (省略)
```
AKS用のCluster、User、Contextが追加されていて、CurrentContextに設定されている。

Kubectlでクラスタ情報を見てみる。
```shell
kubectl cluster-info
```
```
> Kubernetes master is running at https://aks-cluste-k8sresourcegroup-9ba645-811034a9.hcp.japaneast.azmk8s.io:443
> Heapster is running at https://aks-cluste-k8sresourcegroup-9ba645-811034a9.hcp.japaneast.azmk8s.io:443/api/v1/namespaces/kube-system/services/heapster/proxy
> CoreDNS is running at https://aks-cluste-k8sresourcegroup-9ba645-811034a9.hcp.japaneast.azmk8s.io:443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy
> kubernetes-dashboard is running at https://aks-cluste-k8sresourcegroup-9ba645-811034a9.hcp.japaneast.azmk8s.io:443/api/v1/namespaces/kube-system/services/kubernetes-dashboard/proxy
> Metrics-server is running at https://aks-cluste-k8sresourcegroup-9ba645-811034a9.hcp.japaneast.azmk8s.io:443/api/v1/namespaces/kube-system/services/https:metrics-server:/proxy
```
Kubernetes以外にもいろんなAddon(多分モニタリングAddonをONにしたから)が起動している。

最後にAKSのノードを見てみる。
```shell
kubectl get node -o wide
```
```
> NAME                       STATUS   ROLES   AGE   VERSION   INTERNAL-IP   EXTERNAL-IP   OS-IMAGE             KERNEL-VERSION      CONTAINER-RUNTIME
> aks-nodepool1-35400216-0   Ready    agent   15m   v1.12.8   10.240.0.4    <none>        Ubuntu 16.04.6 LTS   4.15.0-1042-azure   docker://3.0.4
> aks-nodepool1-35400216-1   Ready    agent   15m   v1.12.8   10.240.0.5    <none>        Ubuntu 16.04.6 LTS   4.15.0-1042-azure   docker://3.0.4
```
指定した2台のNodeがReady状態になっている。AKSはマネージドサービスなのでMasterNodeは出てこない（利用者から隠蔽されている）。
OSはUbuntuでCRIにはDockerを使用しているのが分かる。

## 動作確認
ローカル(Vagrant+VirtualBox)で構築したときと同じようにNginxをデプロイしてみる。
```shell
kubectl create deployment nginx --image=nginx
# 数秒待ってから
kubectl get deployment,replicaset,pod
```
```
> NAME                          DESIRED   CURRENT   UP-TO-DATE   AVAILABLE   AGE
> deployment.extensions/nginx   1         1         1            1           28s
>
> NAME                                    DESIRED   CURRENT   READY   AGE
> replicaset.extensions/nginx-55bd7c9fd   1         1         1       28s
>
> NAME                        READY   STATUS    RESTARTS   AGE
> pod/nginx-55bd7c9fd-j6fzh   1/1     Running   0          28s
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
> NAME         TYPE           CLUSTER-IP   EXTERNAL-IP    PORT(S)        AGE
> kubernetes   ClusterIP      10.0.0.1     <none>         443/TCP        33m
> nginx        LoadBalancer   10.0.161.7   [* 138.91.12.76]   80:32102/TCP   3m46s
```
LoadBalancerの外部公開IPとして138.91.12.76が割り当てられた。

NginxのWelcomeにアクセスできるかを試す。
```shell
curl 138.91.12.76
```
```
> <!DOCTYPE html>
> <html>
> <head>
> <title>Welcome to nginx!</title>
> (省略)
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
> </html>
```
無事に接続できました。

## Azureコンソール
動作検証内容がAzureのコンソールでどうなっているのかを見てみる。

- クラスタ概要
![](https://i.gyazo.com/f612696d492216e9503fc96af1ceb551.png)

	モニタリング
![](https://i.gyazo.com/d4ec60b914732efbf1b704da51a860a7.png)

これに加えて、Podレベルの詳細を見るためにkube-dashboardが利用できる。
そのままだとRBACで権限エラーとなるので、まずはkube-dashboardが各種リソースにアクセスできるようにcluster-adminのロールを付与する必要がある。
```shell
kubectl create clusterrolebinding kubernetes-dashboard --clusterrole=cluster-admin --serviceaccount=kube-system:kubernetes-dashboard
```
そして以下のコマンドを実行するとkube-dashboardのブラウザが起動する（ローカル環境でkube-proxyを起動している）。
```shell
az aks browse --resource-group k8sResourceGroup --name aks-cluster
```
![](https://i.gyazo.com/34e07827c41349de197f78c8495e70b3.png)

	ログ
![](https://i.gyazo.com/069da66ad579e00aed43868e03d640d9.png)

## クリーンアップ
リソースグループごとまとめて削除するとクラスタごと消してくれる。
```shell
az group delete --name k8sResourceGroup --yes --no-wait
```
