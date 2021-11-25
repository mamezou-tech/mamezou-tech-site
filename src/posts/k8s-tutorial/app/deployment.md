---
title: ステートレスアプリ(Deployment)
author: noboru-kudo
eleventyExcludeFromCollections: true
---
ステートレスアプリを開発し、[Kubernetes]のDeploymentリソースを利用してデプロイするハンズオン。

アプリケーションはステートレスな作りにすると可用性やスケーラビリティといったKubernetesのメリットを最大限に活かすことができる。

## 対象アプリケーション
[Github]のWebAPIを利用して、リポジトリを検索するとてもシンプルなアプリケーションをKubernetesで動かす。
以下が完成イメージ。

![](https://i.gyazo.com/28a7e22041be8d7598ab8a3a026b8491.png)

- repo-search-ui  
Vue.js+Bootstrapを使用したSPA
- api-gateway   
UIからのリクエストを受付け、Backendにリクエストを転送する。それだけだとつまらないので、検索結果をRedisにキャッシュしておき、以降は同じ条件であればキャッシュから結果を返すようにする。Node.js+Expressで実装する。
- github-service  
GithubのWebAPIで指定した条件に合致するリポジトリを検索するBackend Service。Spring Boot+WebFluxで実装する。
- Redis  
API Gatewayのキャッシングレイヤ。本来はMaster-Slave構成にする必要があるけど、複雑になるのでそこまでしない。本題ではないのでhelmお手軽プランで導入する。

Kubernetesの使い方にフォーカスしているのでソースコードの詳細は説明しません。
例外処理やセキュリティ対応等はしていないので、実プロジェクトで使えるものではありません。

完成したUIのイメージはこんな感じ。
![](https://i.gyazo.com/e86c532054919dc2ac0d596a4183bd65.png)

環境としてはローカルPCに構築したものを使用しますが、クラウド環境でも大差ありません(Ingress回りは要修正)。

## Github Service(Spring Boot)
まずは一番後ろのレイヤから。実際はここにドメインロジックが実装されるイメージ(いわゆるマイクロサービス的な)。
このアプリは検索条件としてクエリパラメータ(query)を受け取り、Githubのリポジトリ検索のWebAPI(v3)を呼び出してそれを返すだけのシンプルなもの。[Spring Boot]+[Spring WebFlux]で作成した。

アプリコード：<https://github.com/kudoh/k8s-hands-on/tree/master/app/stateless/github-service>

以降はこれをデプロイするために必要なKubernetesリソースに焦点をあてる。

### Secretリソース
アプリケーションの秘密情報を管理するリソース。  
本題ではないがアプリで必要なので事前準備で一番最初に生成しておく。
Secretリソースはパスワードやトークン、秘密鍵等の一般の開発者が見てはいけない設定情報を保管するためのリソース。Podからは環境変数やVolumeとして参照することができる。
Volumeとして参照する場合でもtmpfs(メモリ)に書き込まれるため、ディスク上には書き込まれることはない(ComfigMapリソースはディスクに書き込まれる)。
ただし、Secret自体はBase64でデコードすれば参照することができるため、[RBAC]によるSecretリソースに対する権限管理は必須(当然アプリでこの情報をログに出力するのもダメ)。
とはいえRBACでSecretリソースの参照を制限したとしても利用しているPodの中にアクセス(kubectl exec pod-name envとか)すれば中身は見れるので本当に秘密にしたい場合は[Vault]や[AWS Secrets Manager]等の仕組みを別途導入する方がよいと言える(アプリ対応要)。

このアプリではGithubのWebAPIにアクセスするためのユーザIDとパスワードをSecretリソースとして登録する。
以下のようなマニフェストを記述する。
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-secret
  labels:
    app: github-service
data:
  # githubのuser/pass。環境変数で置換する。
  password: ''
  user: ''
```
```shell
# <github-userid>,<github-password>の部分は自分のID/Passに置換
GITHUB_USER=$(echo -n "<github-userid>" | base64)
GITHUB_PASSWORD=$(echo -n "<github-password>" | base64)
curl -sSL https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/app/stateless/k8s/github-service/secret.yaml | \
   sed -e "s/user: ''/user: $GITHUB_USER/g" | \
   sed -e "s/password: ''/password: $GITHUB_PASSWORD/g" | \
   kubectl apply -f-
```
Secretリソースの内容を見てみる。
```shell
kubectl describe secret github-secret
```
```
> Name:         github-secret
> Namespace:    default
> Labels:       app=github-service
> Annotations:  
> Type:         Opaque
>
> Data
> ====
> password:  13 bytes
> user:      5 bytes
```
このようにdescribeコマンドではSecretのデータは出力されないが、出力フォーマットをYAMLやJSONに変更すると出てくるのでSecretリソースに対するRead権限付与はやはり注意が必要。

### Deploymentリソース
ステートフルアプリの中心となるリソース。
これをKubernetesに投入するとDeploymentそのものに加えて、Podレプリカを管理するReplicaSet、コンテナを管理するPodリソースがそれぞれ生成され、耐障害性と可用性を兼ねそえたアプリケーションを構築することができる。
![](https://i.gyazo.com/3ac125dc68622b40cd9ef2d62c2e15ef.png)

github-serviceアプリでは以下のようなマニフェストを記述する。
```yaml
 apiVersion: apps/v1
 kind: Deployment
 metadata:
   labels:
     app: github-service
   name: github-service
 spec:
  # ......
```
長いので続きは[こちら](https://github.com/kudoh/k8s-hands-on/blob/master/app/stateless/k8s/github-service/deployment.yaml)参照。以下要点を説明。

- デプロイ戦略
```yaml
strategy:
  type: RollingUpdate
```
Deploymentリソースは名前の通りデプロイに関する情報を管理しており、アプリケーションに適した[デプロイ戦略]を指定する必要がある。
指定できるデプロイ戦略は現状は [Rolling Update](デフォルト) と [Recreate Deployment] のみ。
RollingUpdateを指定した場合はさらにどのくらいのスピードでスピンアップするとか細かい設定を指定することもできる。
[Canary Release] 等はネイティブにはサポートしていないので、[Spinnaker]等の[CD]製品を導入するか頑張ってスクリプト等を使って対応する必要がある。

- レプリカ設定
```yaml
# クラスタ構成の設定
   replicas: 2
   # Deploymentによって作成されるReplicaSetのLabelSelector
   selector:
     matchLabels:
       app: github-service
```
ReplicaSetリソースに関する指定。Podレプリカ数とReplicaSetがスコープとするPodのラベルを指定する(Label Selector)。
KubernetesはこのLabel SelectorによりReplicaSetとPodとの間の疎結合を保っている(ここに限らずLabel SelectorはKubernetesのあらゆる場所に見られる)

- コンテナ設定

```yaml
template:
  metadata:
    labels:
      app: github-service
  spec:
    # Pod内のコンテナ(github-service)に関する設定
    containers:
    - name: github-service
      # コンテナイメージのリポジトリ＋Tag
      image: kudohn/github-service:v1
      imagePullPolicy: IfNotPresent
      # コンテナが公開するPort情報(httpという名前のNamed Port)
      ports:
      - name: http
        containerPort: 8080
        protocol: TCP
```

ReplicaSetリソースが管理するPodリソースのテンプレート。これをもとにレプリカ数分のPodが複製される(実作業はKubeletがCRI(コンテナランタイム)と連携して行う)。
コンテナイメージや公開するポート等の基本情報を設定する。

- Liveness Probe / Readiness Probe

```yaml
readinessProbe:
  httpGet:
    path: /actuator/health
    port: 8080
  initialDelaySeconds: 30
  timeoutSeconds: 5
livenessProbe:
  httpGet:
    path: /actuator/health
    port: 8080
  initialDelaySeconds: 30
  timeoutSeconds: 5
```

Readiness ProbeはPod(つまりアプリ)がリクエストを受け付ける準備ができていることをKubernetesに連携する仕組み。
これに成功しなければ、Podは起動中と見なされてServiceリソースのエンドポイントとして公開されることはない。

Liveness ProbeはPodのオートヒーリング機能の基準を提供する。
これに失敗するとKuberenetes(ReplicaSetリソース)はサービスが機能不全に陥っていると判断し、コンテナの再起動を実行する。
Javaアプリ等の起動に時間がかかるようなアプリはチェック開始のDelay(initialDelaySeconds)を正しく設定しないと、コンテナの再起動が無限ループになるので注意(起動中に再起動)が必要。ここではSpring Bootアプリなので30秒を指定している。

上記はReadiness/LivenessProbeに同じエンドポイントを指定しているが、各々の特性を考慮して別のものを指定することができる。
HTTP GETの他にコマンドだったりソケットで確認する方法もある。

- 環境変数(env)

```yaml
env:
- name: GITHUB_USER
  valueFrom:
    secretKeyRef:
      name: github-secret
      key: user
- name: GITHUB_PASSWORD
  valueFrom:
    secretKeyRef:
      name: github-secret
      key: password
```

コンテナの環境変数。主な用途はアプリケーションの設定情報を注入すること。
固定値の他にConfigMap/Secretリソースから指定することもできる。ここでは先程作成したSecretリソースの値を動的に環境変数に指定している。
基本的にアプリケーションはここから環境差分のある設定情報を取得する必要がある。ここでは指定していないが、数が多い場合等は環境変数ではなくVolumeとして設定ファイル自体をコンテナにMountするやり方でもよい。
[設定 (The Twelve-Factor App)]参照

このDeploymentリソースをKubernetesに投入する。
```shell
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/app/stateless/k8s/github-service/deployment.yaml
```

デプロイされたものを確認する。
```shell
kubectl get deploy,svc,pod -l app=github-service
```
```
> NAME                                   READY   UP-TO-DATE   AVAILABLE   AGE
> deployment.extensions/github-service   2/2     2            2           2m20s
>
> NAME                                              DESIRED   CURRENT   READY   AGE
> replicaset.extensions/github-service-7c544bdc66   2         2         2       2m20s
>
> NAME                                  READY   STATUS    RESTARTS   AGE
> pod/github-service-7c544bdc66-2qb6k   1/1     Running   0          2m20s
> pod/github-service-7c544bdc66-fvxsk   1/1     Running   0          2m20s
```
Deployment, ReplicaSet, Pod(レプリカ数分)リソースが作成され、アプリ(Pod)が実行されている事がわかる(Running)。

デプロイ履歴を見てみる。
```shell
kubectl rollout history deploy/github-service
```

```
> deployment.extensions/github-service
> REVISION  CHANGE-CAUSE
> 1         <none>
```

今回は初回なので1リビジョンのみが表示されているが、デプロイを繰り返すと蓄積されてくる。

デプロイしたアプリがおかしくてロールバックしたい場合は以下のように実行する。
```shell
kubectl rollout undo deployment github-service --to-revision=<対象リビジョン>
```

### Serviceリソース
Kubernetesの[サービスディスカバリ]を担うリソース。
Deploymentリソースだけでは複数のPodに対する統一したエンドポイントがなく、アプリにアクセスするにはPodに対してアクセスする必要がある。
しかし、PodはLivnessProbe(死活監視の仕組み)やKubernetesのスケジューラにより再起動・再配置されるため、Podに直接アクセスすることは管理的な理由を除いてやってはいけない(ライフサイクルが短いものと考える必要がある)。
これを解決するための仕組みがServiceリソースで、利用者からPod群を隠蔽し静的な単一のアクセスポイントを提供する。
Serviceリソースは静的なIPアドレスに加えて、ドメイン名（クラスタードメイン）も割り当てられ、クラスタ内部ではこのドメイン名でアクセスすることが可能(IPは意識しない)。
Serviceは受け取ったリクエストトラフィックをランダムに各Podに振り分けを行うので(L4レベルのロードバランサ)、各サービスの前面に内部LBとか個別に配置する必要はない。
[バックエンドサービス (The Twelve-Factor App)]をKubernetesで実現する手段としての位置づけ。

![](https://i.gyazo.com/ca6acf0a924f4f6a4d201c9e383ca25d.png)

以下のようなマニフェストを記述する。
ポイントはselectorでDeploymentリソースで指定したLabelを選択しているところ(Label Selector)。これを間違えるとスコープ外となりリクエストをPodに転送してくれない。

```yaml
 kind: Service
 apiVersion: v1
 metadata:
   name: github-service
   labels:
     app: github-service
 spec:
   type: ClusterIP
   # Serviceとして公開するPodのLabel Selector
   selector:
     app: github-service
   ports:
     - name: http
       protocol: TCP
       targetPort: http
       port: 80
```

```shell
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/app/stateless/k8s/github-service/service.yaml
```

投入したServiceリソースの状態を見てみる。
```shell
kubectl get svc -l app=github-service
```
```
> NAME             TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)   AGE
> github-service   ClusterIP   10.103.211.92   <none>        80/TCP    9s
```
マニフェストで指定したとおり80番ポートが公開されている。
ServiceタイプのClusterIPはクラスタ内でのみアクセス可能なタイプなので、EXTERNAL-IPは割り当てられないが、ClusterIPが割り当てられていることが分かる。これがPod群にアクセスするためのエンドポイントとなる。クラスタードメインは以下のフォーマットで内部DNS(CoreDNS)によって割り当てられる。
`<Service Name>.<Namespace>.svc.cluster.local` -> このサンプルの場合はgithub-service.default.svc.cluster.localになる(cluster.localはデフォルト値なので環境によっては変えられている可能性はある)。
さらに省略形として`<Service Name>`や`<Service Name>.<Namespace>`も使用することができる(CoreDNSが上記正式ドメインにマッピングしている)。

実際にServiceリソースが管理するエンドポイントを見る場合はServiceと合わせて作成されるEndpointリソースを見れば分かる。
```shell
kubectl describe ep -l app=github-service
```
```
> Name:         github-service
> Namespace:    default
> Labels:       app=github-service
> Annotations:  <none>
> Subsets:
>   Addresses:          10.244.1.118,10.244.3.66
>   NotReadyAddresses:  <none>
>   Ports:
>     Name  Port  Protocol
>     ----  ----  --------
>     http  8080  TCP
```
Addressesに割り当てられているのは2つレプリカのgithub-serviceのPodのIPアドレスで、Label SelectorによってこのServiceによって管理されている。

## API Gateway(Node.js) + Redis
UIとBackend Serviceとの仲介を行う[API Gateway]。既成品ではなく軽量な[Node.js]で構築する。
単純にUIのリクエストを仲介するだけでなく、1度取得した結果は1時間Redisにキャッシュしておいて次回以降は高速に結果を返す。

アプリコード：<https://github.com/kudoh/k8s-hands-on/tree/master/app/stateless/api-gateway>

### Redis

まずはキャッシュレイヤのRedisを構築する。これは本題ではないので[Helm]を使用して構築する。
インメモリのシングル構成で構築する。

```shell
# NamespaceはredisでMasterシングル構成。落ちたらKubernetesがリスタートしてくれる。
# 面倒なのでパスワードは固定で（省略するとランダムな文字列が生成される）。
helm upgrade redis --install stable/redis --namespace redis \
  --set master.persistence.enabled=false \
  --set cluster.enabled=false \
  --set password=frieza-redis-pass
```
インストールしたものを見てみる。
```shell
kubectl get pod -n redis -l app=redis
```
```
> NAME             READY   STATUS    RESTARTS   AGE
> redis-master-0   1/1     Running   0          5h
```
問題なさそう。

次にapi-gatewayをデプロイする。ここも基本はgithub-serviceと同じDeploymentリソースを使用する。
その前にDeploymentリソースで必要となるConfigMapとSecretリソースを投入する。

### ConfigMapリソース

ConfigMapはアプリケーションの設定情報を管理するリソース。設定情報は環境変数やVolumeとして直接ファイルでアプリに提供することができる。
Secretリソースと似ているが、単純なキーバリュー形式の値のほかファイルそのものを中に入れることもでき、Base64エンコードする必要もない。
例えばSpring Bootのapplication.yamlそのものをConfigMapリソースの中に入れるとかもできる。あらゆる設定情報(秘密情報を除く)をConfigMapリソース内で管理すると構成管理が楽になりそう。

api-gatewayではBackendサービスの接続先とRedisの接続先とポート番号を設定情報として設定する。
接続先のPodのIPアドレスではなく、Serviceリソースのドメインを指定しているところがポイント。
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
  redisHost: redis-master.redis.svc.cluster.local
  redisPort: "6379"
```
```shell
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/app/stateless/k8s/api-gateway/configmap.yaml
```

投入したリソースの状態を見てみる。
```shell
kubectl describe cm -l app=api-gateway
```
```
> Name:         api-gateway-config
> Namespace:    default
> Labels:       app=api-gateway
> Data
> ====
> redisHost:
> ----
> redis-master.redis.svc.cluster.local
> redisPort:
> ----
> 6379
> serviceURL:
> ----
> http://github-service.default.svc.cluster.local/github
```
Secretリソースと違いConfigMapは指定した設定情報が表示される。

### Secretリソース
api-gatewayではRedisにアクセスするためにパスワードを必要としている。定石通りこれは秘密情報なのでSecretリソースを作成する。
この例はハンズオンなので直接Gitで平文で管理しているが、実運用でやっては絶対ダメ。暗号化するか参照制限されたセキュアな場所で管理する必要がある。

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: redis-secret
data:
  # Helmでインストールした際のパスワードをBase64エンコードしたもの(frieza-redis-pass)
  password: ZnJpZXphLXJlZGlzLXBhc3M=
```

```shell
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/app/stateless/k8s/api-gateway/secret.yaml
```

Secretリソースの中身を見てみる。github-serviceの時とは変えて今度はYAMLで出力してみる。

```shell
kubectl get secret redis-secret -o yaml
```
```
> apiVersion: v1
> data:
>   password: [* ZnJpZXphLXJlZGlzLXBhc3M=]
> kind: Secret
> metadata:
>   annotations:
>     kubectl.kubernetes.io/last-applied-configuration: |
>       {"apiVersion":"v1","data":{"password":"ZnJpZXphLXJlZGlzLXBhc3M="},"kind":"Secret","metadata":{"annotations":{},"name":"redis-secret","namespace":"default"}}
>   creationTimestamp: "2019-06-26T12:01:55Z"
>   name: redis-secret
>   namespace: default
>   resourceVersion: "361915"
>   selfLink: /api/v1/namespaces/default/secrets/redis-secret
>   uid: 31195a50-980a-11e9-89af-525400261060
> type: Opaque
```

このようにYAMLにすればSecretの中身を見ることはでき、これをBase64でデコードするとパスワードは取得できるので参照権限には注意する。

### Deploymentリソース
ようやく本体となるDeploymentリソースを投入する。マニフェストは[こちら https://github.com/kudoh/k8s-hands-on/blob/master/app/stateless/k8s/api-gateway/deployment.yaml]。
github-serviceのDeploymentリソースと大きな違いはないが、アプリの特性を考慮して以下を変えている。
- 大量のリクエストをさばくことを想定してレプリカ数は多めにとる(4)
- Node.jsは軽量なのでKubernetesへの要求・上限リソース(メモリ、CPU)は小さくする
- Node.jsは起動も高速なのでLiveness/ReadinessProbeのDelayも小さくする
```shell
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/app/stateless/k8s/api-gateway/deployment.yaml
```
デプロイされたものを確認する。
```shell
kubectl get deploy,rs,pod -l app=api-gateway
```
```
> NAME                                READY   UP-TO-DATE   AVAILABLE   AGE
> deployment.extensions/api-gateway   4/4     4            4           3m18s
>
> NAME                                           DESIRED   CURRENT   READY   AGE
> replicaset.extensions/api-gateway-589b945f57   4         4         4       3m18s
>
> NAME                               READY   STATUS    RESTARTS   AGE
> pod/api-gateway-589b945f57-ld9nz   1/1     Running   0          3m18s
> pod/api-gateway-589b945f57-nftxz   1/1     Running   0          3m17s
> pod/api-gateway-589b945f57-pbnrd   1/1     Running   0          3m18s
> pod/api-gateway-589b945f57-szqjx   1/1     Running   0          3m18s
```
DeploymentリソースによりReplicaSetリソースと4つのapi-gatewayのPodが生成され、アプリが実行されているのが分かる。

### Serviceリソース

例に漏れずAPI GatewayもServiceリソースを作成する。
このServiceリソースはIngressからアクセスされることになる。Ingress Controllerの実装にもよるが一般的にIngressからアクセスされるServiceのTypeは`NodePort`である必要がある。
NodePortはクラスタ内部のIPアドレスの他に全てのWorker Nodeでランダム(デフォルト)なPortが割り当てられて公開される。
API GatewayのServiceリソースは以下のようなマニフェストになる。

```yaml
kind: Service
apiVersion: v1
metadata:
  name: api-gateway
  labels:
    app: api-gateway
spec:
  type: NodePort
  selector:
    app: api-gateway
  ports:
  - name: http
    protocol: TCP
    targetPort: http
    port: 80
```

```shell
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/app/stateless/k8s/api-gateway/service.yaml
```

投入したServiceリソースの中身を確認する。
```shell
kubectl describe svc -l app=api-gateway
```
```
> Name:                     api-gateway
> Namespace:                default
> Labels:                   app=api-gateway
> Selector:                 app=api-gateway
> Type:                     NodePort
> IP:                       10.111.37.250
> Port:                     http  80/TCP
> TargetPort:               http/TCP
> [* NodePort:                 http  31968/TCP]
> Endpoints:                10.244.1.122:3000,10.244.2.98:3000,10.244.2.99:3000 + 1 more...
> Session Affinity:         None
> External Traffic Policy:  Cluster
```
Endpointsとしてapi-gatewayのPodのIPアドレスが4つ割り当てられ、NodePortとして31968ポートが公開されていることが分かる。
curlで全てのWorker Nodeに対してこのNodePortにアクセスしてみる。
```shell
# k8s-worker1
curl -s 172.16.20.11:31968/api/v1/repos?query=frieza -o /dev/null -w '%{http_code}\n'
# k8s-worker2
curl -s 172.16.20.12:31968/api/v1/repos?query=frieza -o /dev/null -w '%{http_code}\n'
# k8s-worker3
curl -s 172.16.20.13:31968/api/v1/repos?query=frieza -o /dev/null -w '%{http_code}\n'
```
全てレスポンスコード200が返ってくる。


## Web UI(Vue.js)
最後はVue.jsで作ったWebUIアプリ。
これ単体では何もできないのでNginxの上で静的リソースのWebサイトとして公開する。
アプリコード：<https://github.com/kudoh/k8s-hands-on/tree/master/app/stateless/repo-search-ui>

### ConfigMapリソース
Vue.js自体には設定情報は必要ないが、Nginxのconfigを指定しないとサービス公開ができないので、ConfigMapリソースを作成する必要がある。
キーバリュー形式ではNginxは認識できないので、ここではNginxのconfigファイルとしてそのままConfigMapリソースに入れる。
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-config
  labels:
    app: repo-search-ui
data:
  repo-search-ui.conf: |-
    server {
        listen       80;
        server_name  localhost;
        location / {
            root   /usr/share/nginx/html;
            index  index.html;
        }
        location /health {
            access_log off;
            return 200 "UP\n";
        }      
        error_page   500 502 503 504  /50x.html;
        location = /50x.html {
            root   /usr/share/nginx/html;
        }
    }
```

このようにすると`repo-search-ui.conf`というファイルそのものをVue.jsアプリを公開するためにVolumeとしてPodにマウントすることができる。
これをそのままKuberentesに投入する。

```shell
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/app/stateless/k8s/repo-search-ui/configmap.yaml
```

ConfigMapリソースの中身を確認する。
```shell
kubectl describe cm -l app=repo-search-ui
```
```
> Name:         nginx-config
> Namespace:    default
> Labels:       app=repo-search-ui
> Data
> ====
> repo-search-ui.conf:
> ----
> server {
>     listen       80;
>     server_name  localhost;
>     location / {
>         root   /usr/share/nginx/html;
>         index  index.html;
>     }
>     location /health {
>         access_log off;
>         return 200 "UP\n";
>     }      
>     error_page   500 502 503 504  /50x.html;
>     location = /50x.html {
>         root   /usr/share/nginx/html;
>     }
> }
```
このようにconfigファイルそのものが中に入っていることが分かる。

### Deploymentリソース
NginxのコンテナイメージにビルドしたVue.jsアプリ(静的リソース)を載せてそれをDeploymentリソースとして作成する。

YAMLリソースは[こちら https://github.com/kudoh/k8s-hands-on/blob/master/app/stateless/k8s/repo-search-ui/deployment.yaml]。
ポイントとしては先程作成したConfigMapリソースをコンテナのVolumeとして割り当てている以下の部分。
```yaml
containers:
- name: repo-search-ui
  # ...
  # カスタムのNginx configをConfigMapからVolumeとしてMount
   volumeMounts:
     - name: nginx-volume
       mountPath: /etc/nginx/conf.d
       readOnly: true
  # ...
 # ConfigMap Volume
 volumes:
 - name: nginx-volume
   configMap: 
     name: nginx-config
```
Nginxが認識するカスタムconfig用ディレクトリ`/etc/nginx/conf.d`にConfigMapリソースの`repo-search-ui.conf`をMountしている。
これをKubernetesに投入する。

```shell
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/app/stateless/k8s/repo-search-ui/deployment.yaml
```

いつものように作成されたリソースを見てみる。
```shell
kubectl get deploy,rs,pod -l app=repo-search-ui
```
```
> NAME                                   READY   UP-TO-DATE   AVAILABLE   AGE
> deployment.extensions/repo-search-ui   2/2     2            2           17s
>
> NAME                                              DESIRED   CURRENT   READY   AGE
> replicaset.extensions/repo-search-ui-7cdbcd695c   2         2         2       17s
>
> NAME                                  READY   STATUS    RESTARTS   AGE
> pod/repo-search-ui-7cdbcd695c-7b28p   1/1     Running   0          17s
> pod/repo-search-ui-7cdbcd695c-8rr4c   1/1     Running   0          17s
```

カスタムのconfigファイルがコンテナ内でどう配置されているのかを見てみる。
```shell
kubectl exec $(kubectl get pod -l app=repo-search-ui -o jsonpath='{.items[0].metadata.name}') -- ls -l /etc/nginx/conf.d
```
```
> lrwxrwxrwx    1 root     root            26 Jun 27 11:26 repo-search-ui.conf -> ..data/repo-search-ui.conf
```
物理的にコピーされているのではなく、シンボリックリンクで作成されているのが分かる。
アプリでconfigをリロードする仕組みがあればConfigMapの変更は再起動なしで即時に反映することができる（環境変数ではこれはできない）。

### Serviceリソース

UIリソースもIngressからアクセスされるので、API Gateway同様にNodePortのServiceリソースとして作成する。  
以下のように作成する（特に変わったことは何もない）。
```yaml
apiVersion: v1
kind: Service
metadata:
  name: repo-search-ui
  labels:
    app: repo-search-ui
spec:
  type: NodePort
  selector:
    app: repo-search-ui
  ports:
  - name: http
    port: 80
    protocol: TCP
    targetPort: http
```
```shell
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/app/stateless/k8s/repo-search-ui/service.yaml
```

投入したServiceリソースの中身を確認する。
```shell
kubectl describe svc -l app=repo-search-ui
```
```
> Name:                     repo-search-ui
> Namespace:                default
> Labels:                   app=repo-search-ui
> Selector:                 app=repo-search-ui
> Type:                     NodePort
> IP:                       10.98.100.149
> Port:                     http  80/TCP
> TargetPort:               http/TCP
> NodePort:                 http  30214/TCP
> Endpoints:                10.244.1.123:80,10.244.2.100:80
> Session Affinity:         None
> External Traffic Policy:  Cluster
```
先程作成したVue.jsのPodがEndpointsとして認識されている。

先程と同じようにNodePort経由でアクセスしてみる。

```shell
# k8s-worker1
curl -s 172.16.20.11:30214 -o /dev/null -w '%{http_code}\n'
# k8s-worker2
curl -s 172.16.20.12:30214 -o /dev/null -w '%{http_code}\n'
# k8s-worker3
curl -s 172.16.20.13:30214 -o /dev/null -w '%{http_code}\n'
```

今回も全部200が返ってくる。
これで全てのアプリのデプロイは完了した。


### Ingressリソース
最後にIngressでアプリケーションのエンドポイントを作成する。
事前にNginx のIngress Controllerをインストールしておく(Nginxでなくてもいい)

せっかくなのでTLSで通信の暗号化を行う。今回は手動で証明書を設定する（ローカルなので自己署名）。
Cert Managerを使うと自動化できる。[Kubernetesハンズオン-Ingress TLS証明書管理]

まずはキーペアを作成する。
```shell
openssl req -x509 -sha256 -nodes -days 365 -newkey rsa:2048 -keyout tls.key -out tls.crt -subj "/CN=frieza.local/O=Mamezou"
```

tls.crt(証明書)とtls.key(秘密鍵)が生成される。これをSecretリソースとして登録する。
```shell
kubectl create secret tls tls-secret --key tls.key --cert tls.crt
```
上記はマニフェストではなくコマンドで作成している（Secretリソースはこれでいい気がする）。

これを使って以下のIngressリソースを投入する。
```yaml
apiVersion: networking.k8s.io/v1beta1
kind: Ingress
metadata:
  name: github-ingress
  annotations:
    kubernetes.io/ingress.class: "nginx"
spec:
  # 自己署名の証明書のキーペアを含むSecretリソースを指定する
  tls:
  - hosts:
    - frieza.local
    secretName: tls-secret
  rules:
  # 公開ホスト名
  - host: github.frieza.local
    http:
      # パスベースルーティング
      paths:
      # API Gateway
      - path: /api/v1
        backend:
          serviceName: api-gateway
          servicePort: 80
      # Vue.js(静的リソース)
      - path: /
        backend:
          serviceName: repo-search-ui
          servicePort: 80
```
```shell
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/app/stateless/k8s/ingress/ingress.yaml
```

作成されたIngressリソースを見てみる。
```shell
kubectl describe ingress github-ingress
```
```
> Name:             github-ingress
> Namespace:        default
> Address:          
> Default backend:  default-http-backend:80 (<none>)
> TLS:
>   tls-secret terminates frieza.local
> Rules:
>   Host                 Path  Backends
>   ----                 ----  --------
>   github.frieza.local  
>                        /api/v1   api-gateway:80 (10.244.1.122:3000,10.244.2.98:3000,10.244.2.99:3000 + 1 more...)
>                        /         repo-search-ui:80 (10.244.1.123:80,10.244.2.100:80)
```

最後にブラウザからアクセスして確認する。
まずは/etc/hostsに静的エントリを追加する(DNSの代替)。
```shell
echo "172.16.20.11 github.frieza.local" | sudo tee -a /etc/hosts
```

そして`https://github.frieza.local`のURLをブラウザでアクセス（自己署名なので警告は無視）！
![](https://i.gyazo.com/9aea1ec591adfc1229aa6ee95dd7bc7a.gif)

ようやく終わりです。。

