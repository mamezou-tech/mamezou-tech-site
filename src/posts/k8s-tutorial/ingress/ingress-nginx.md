---
title: Ingress - NGINX Ingress Controller
author: noboru-kudo
---

Kubernetesで提供されるL7 ロードバランサのIngressリソースを導入しましょう。

Ingressとはクラス環境内にデプロイされたアプリに対してL7のロードバランシングを行うKubernetesの機能のことです([こちら](https://kubernetes.io/docs/concepts/services-networking/ingress/)参照)。

環境構築編では動作確認用にServiceリソースをLoadBalancerとして定義することでL4ロードバランサーを作成(実態はELB)しましたが、この方法はルーティング機能が貧弱だったり、クラスタ環境が成長して様々なアプリケーションで利用されるようになるとエンドポイントごとにロードバランサーを配置する必要がある等、柔軟性やコストの観点で劣ります。
Ingressを利用すると、Ingressのマニフェストにルーティングのルールを記述することで、1つのロードバランサーで様々なアプリケーションへのエンドポイントを提供することが可能となります。
実際のプロジェクトでもこのIngressリソースを利用して外部にアプリケーションを公開することが多いかと思います。

Ingressリソース自体はインターフェース(マニフェスト構造)のみを規定していて、その実装であるIngress Controller(Kubernetesのカスタムコントローラ)が実際のトラフィックルーティングを担います。
Ingress Controllerは様々なものがあり、利用可能なものは以下の公式ドキュメントに記載されています。
- <https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/>

今回はKubernetesが公式サポートする[NGINX Ingress Controller](https://github.com/kubernetes/ingress-nginx)を導入してIngress機能を確認します。
NGINX Ingress ControllerはおそらくIngress Controllerでもっともよく知られているもので、その名の通り[Nginx](https://nginx.org/en/docs/)をロードバランサーとして利用して各アプリケーションへのルーティングを実現します。

完成形は以下のようなイメージになります。
![](https://i.gyazo.com/78e1811be6831f6e561f781b2bd513c0.png)

## 事前準備

以下のいずれかの方法で事前にEKS環境を作成しておいてください。

- [AWS EKS(eksctl)](/containers/k8s/tutorial/infra/aws-eks-eksctl)
- [AWS EKS(Terraform)](/containers/k8s/tutorial/infra/aws-eks-terraform)

また、Ingress Controllerのインストールにk8sパッケージマネージャーの[helm](https://helm.sh/)を利用します。
ローカル環境に[こちら](https://helm.sh/docs/intro/install/) を参考にv3以降のバージョンをセットアップしてください[^1]。

[^1]: Helmのv3以降ではサーバー環境へのインストール(tiller)が不要となり、セキュリティ面でも安心して使えるようになりました。

## Ingress Controllerインストール

NGINX Ingress Controllerには様々なインストール方法が用意されています。
- <https://kubernetes.github.io/ingress-nginx/deploy/>

今回はHelmチャートとして公開されているNginxのIngress Controllerをインストールします[^2]。

[^2]: Helmチャートの中身に興味がある方は[こちら](https://github.com/kubernetes/ingress-nginx/tree/main/charts/ingress-nginx)を見てみるとよいでしょう。

まずは以下のコマンドでhelmにリポジトリを追加して最新化します。
```shell
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
```

後はインストールコマンドを実行するだけです。
ここでは様々なオプションが指定できます。[こちら](https://github.com/kubernetes/ingress-nginx/blob/main/charts/ingress-nginx/values.yaml)で利用可能なオプションを確認できます[^3]

[^3]: `helm show values ingress-nginx/ingress-nginx`コマンドでも参照できます。

ほとんどのものはデフォルトで構いませんが、Nginxは2台のレプリカ、AWSリソースとしてNLB(Network LoadBalancer)[^4]を使うようにセットアップしましょう。
任意の名前(ここでは`values.yaml`)でYAMLファイルを作成し、以下の内容を記述します。

[^4]: 何も指定しない場合は前世代のELBであるCLB(Classic LoadBalancer)として作成されます。L7レイヤの機能はNginxが担うため、AWSのELBとしてはNLBを使うのが望ましいでしょう。

```yaml
controller:
  # nginxのreplica数
  replicaCount: 2

  # AWS側のLBとしてNLBを指定
  service:
    annotations:
      service.beta.kubernetes.io/aws-load-balancer-backend-protocol: tcp
      service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: 'true'
      service.beta.kubernetes.io/aws-load-balancer-type: nlb
```

これでインストールする準備ができました。以下のコマンドを実行しましょう。

```shell
helm upgrade ingress-nginx ingress-nginx/ingress-nginx \
  --install --version 4.0.5 \
  --namespace ingress-nginx --create-namespace \
  --values values.yaml \
  --wait
```

上記コマンドでhelmはHelmチャートのテンプレートとパラメータファイル(`--values`)からk8sのマニフェストを生成し、クラスタ環境に反映します。
また、作成するNamespaceは`ingress-nginx`で、存在しない場合は新たに作成するように指定しています(`--namespace`/`--create-namespace`)。
`--version`ではNGINX Ingress ControllerのHelmチャートのバージョンを指定しています。Helmチャートは時間とともにバージョンアップされていきますので、予期しないアップデート(デフォルトは最新)を避けるために必ずバージョン[^5]を指定しておくようにするのが望ましいでしょう。

[^5]: バージョン情報はIngressControllerのGithubや[ArtifactHub](https://artifacthub.io/packages/helm/ingress-nginx/ingress-nginx)でも確認できます。

NginxのIngress Controllerが起動するとHelm上で状態を確認することができます(内部的には作成したNamespaceのConfigMapに保存されます)。

```shell
helm list -n ingress-nginx
```

```
NAME         	NAMESPACE    	REVISION	UPDATED                             	STATUS  	CHART              	APP VERSION
ingress-nginx	ingress-nginx	1       	2021-10-10 13:07:27.980349 +0900 JST	deployed	ingress-nginx-4.0.5	1.0.3      
```

リリース名(`ingress-nginx`)がファーストリビジョンとしてデプロイされたことが分かります。

それでは作成されたKubernetesリソースを確認してみましょう。

### Service

以下コマンドを実行します。

```shell
kubectl get svc -n ingress-nginx 
```

```
NAME                                 TYPE           CLUSTER-IP       EXTERNAL-IP                                                                          PORT(S)                      AGE
ingress-nginx-controller             LoadBalancer   10.100.149.143   xxxxxxxxxxxxxx-xxxxxxxxxxxxxxx.elb.ap-northeast-1.amazonaws.com   80:31415/TCP,443:30825/TCP   5m56s
ingress-nginx-controller-admission   ClusterIP      10.100.248.171   <none>                                                                               443/TCP                      5m56s
```

`ingress-nginx-controller`が外部に公開するIngress Controllerのエンドポイントになります。
`ingress-nginx-controller-admission`はIngressリソースのバリデーションをする際に使われる内部的なServiceリソースで、ここでは気にする必要はありません[^6]。

`ingress-nginx-controller`の`EXTERNAL-IP`に外部公開用のエンドポイント(`xxxxxx.elb.ap-northeast-1.amazonaws.com`)が設定されていることが分かります。
これがこのIngress Controllerにアクセスする際に利用するエンドポイントになります。
実際の運用を行う際にはこれをそのまま使うのではなく、別途ドメインの作成と該当エンドポイントに対してRoute53等のDNSにマッピングレコードを追加することが一般的でしょう。

[^6]: <https://kubernetes.github.io/ingress-nginx/how-it-works/#avoiding-outage-from-wrong-configuration>

AWS側の状態も確認してみましょう。このLoadBalancerのServiceリソースの生成を検知してNLB(Network LoadBalancer)が生成されているはずです。
マネジメントコンソールからEC2 -> ロードバランサーと選択してみましょう。

![](https://i.gyazo.com/c8bee8af9f919e1b9d7eece686276c08.png)

上記のようにAWS上にNLBが生成されていることが分かります。

### Pod

以下コマンドを実行します。

```shell
kubectl get pod -n ingress-nginx
```

```
NAME                                        READY   STATUS    RESTARTS   AGE
ingress-nginx-controller-646d5d4d67-4rdt2   1/1     Running   0          42m
ingress-nginx-controller-646d5d4d67-wzdmn   1/1     Running   0          47s
```

レプリカ数として指定した2つのPodが実行中であることが分かります。
1つのPodのコンテナイメージで何が使われているのか見てみましょう[^7]。

```shell
kubectl get pod -n ingress-nginx $(kubectl get pod -n ingress-nginx -o jsonpath='{.items[0].metadata.name}') \
  -o jsonpath='{.spec.containers[0].image}'
```

```
k8s.gcr.io/ingress-nginx/controller:v1.0.3@sha256:4ade87838eb8256b094fbb5272d7dda9b6c7fa8b759e6af5383c1300996a7452
```

PodリソースではNGINX Ingress Controllerのコンテナ(`k8s.gcr.io/ingress-nginx/controller`)が起動していることが分かります。
この中でIngressリソースの変更を監視して、変更時にはNginxの設定に反映するようプログラムが動作しています。

[^7]: コマンドの`-o jsonpath='{...}'`は[JSONPath](https://goessner.net/articles/JsonPath/)の記法を使用してPodのマニフェストから特定のフィールドのみを出力するように整形しています。これを使いこなすとkubectlの操作が格段に楽になりますので是非使いこなせるようになりましょう。

実際のNGINX Ingress Controllerのログも見てみましょう。

```shell
kubectl logs -n ingress-nginx $(kubectl get pod -n ingress-nginx -o jsonpath='{.items[0].metadata.name}')
```

```
-------------------------------------------------------------------------------
NGINX Ingress controller
  Release:       v1.0.3
  Build:         6e125826ad3968709392f2056023d4d7474ed4f5
  Repository:    https://github.com/kubernetes/ingress-nginx
  nginx version: nginx/1.19.9

-------------------------------------------------------------------------------

W1010 04:07:31.336417       6 client_config.go:615] Neither --kubeconfig nor --master was specified.  Using the inClusterConfig.  This might not work.
I1010 04:07:31.336936       6 main.go:221] "Creating API client" host="https://10.100.0.1:443"
I1010 04:07:31.347958       6 main.go:265] "Running in Kubernetes cluster" major="1" minor="20+" git="v1.20.7-eks-d88609" state="clean" commit="d886092805d5cc3a47ed5cf0c43de38ce442dfcb" platform="linux/amd64"
I1010 04:07:31.495290       6 main.go:104] "SSL fake certificate created" file="/etc/ingress-controller/ssl/default-fake-certificate.pem"
I1010 04:07:31.522215       6 ssl.go:531] "loading tls certificate" path="/usr/local/certificates/cert" key="/usr/local/certificates/key"
I1010 04:07:31.549442       6 nginx.go:253] "Starting NGINX Ingress controller"
I1010 04:07:31.558138       6 event.go:282] Event(v1.ObjectReference{Kind:"ConfigMap", Namespace:"ingress-nginx", Name:"ingress-nginx-controller", UID:"2b8518a5-0afd-44a9-9c5a-56e4d4022cfc", APIVersion:"v1", ResourceVersion:"24050", FieldPath:""}): type: 'Normal' reason: 'CREATE' ConfigMap ingress-nginx/ingress-nginx-controller
I1010 04:07:32.750207       6 nginx.go:295] "Starting NGINX process"
I1010 04:07:32.750205       6 leaderelection.go:243] attempting to acquire leader lease ingress-nginx/ingress-controller-leader...
I1010 04:07:32.750961       6 nginx.go:315] "Starting validation webhook" address=":8443" certPath="/usr/local/certificates/cert" keyPath="/usr/local/certificates/key"
I1010 04:07:32.751306       6 controller.go:152] "Configuration changes detected, backend reload required"
I1010 04:07:32.766735       6 leaderelection.go:253] successfully acquired lease ingress-nginx/ingress-controller-leader
I1010 04:07:32.766898       6 status.go:84] "New leader elected" identity="ingress-nginx-controller-646d5d4d67-4rdt2"
I1010 04:07:32.808211       6 controller.go:169] "Backend successfully reloaded"
I1010 04:07:32.808361       6 controller.go:180] "Initial sync, sleeping for 1 second"
```

NGINX Ingress Controllerがクラスタ構成で起動している様子が分かります。これで準備は完了です。

## サンプルアプリのデプロイ

それでは作成したIngress経由でアプリケーションに対してリクエストがルーティングできるのかを試してみましょう。
まずはアプリケーションを用意する必要があります。
本来はソースコード記述、コンテナイメージビルド、レジストリプッシュ等の手順を踏む必要がありますが、今回の本題ではありませんのでConfigMap上にNode.jsのスクリプトを保管し、それをNode.jsの公式コンテナで直接実行するようにします。
また、ルーティングの確認をするために、2種類のアプリケーション(ソースコードは同じ)を準備します。
任意の名前(ここでは`app.yaml`としました)でYAMLファイルを作成し、以下の内容を記述しましょう。

```yaml
# サンプルアプリスクリプト
apiVersion: v1
kind: ConfigMap
metadata:
  name: server
data:
  index.js: |
    const http = require('http');

    const server = http.createServer((req, res) => {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain');
      res.end(`${process.env.POD_NAME}: hello sample app!\n`);
    });

    const hostname = '0.0.0.0';
    const port = 8080;
    server.listen(port, hostname, () => {
      console.log(`Server running at http://${hostname}:${port}/`);
    });
---
# 1つ目のアプリ
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app1
spec:
  replicas: 2
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
          image: node:16
          ports:
            - name: http
              containerPort: 8080
          env:
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
          command: [sh, -c, "node /opt/server/index.js"]
          volumeMounts:
            - mountPath: /opt/server
              name: server
      volumes:
        - name: server
          configMap:
            name: server
---
# 2つ目のアプリ
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app2
spec:
  replicas: 2
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
          image: node:16
          ports:
            - name: http
              containerPort: 8080
          env:
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
          command: [sh, -c, "node /opt/server/index.js"]
          volumeMounts:
            - mountPath: /opt/server
              name: server
      volumes:
        - name: server
          configMap:
            name: server
---
apiVersion: v1
kind: Service
metadata:
  labels:
    app: app1
  name: app1
spec:
  selector:
    app: app1
  ports:
    - targetPort: http
      port: 80
---
apiVersion: v1
kind: Service
metadata:
  labels:
    app: app2
  name: app2
spec:
  selector:
    app: app2
  ports:
    - targetPort: http
      port: 80
```

少し長いですが内容は非常に単純です。前述の通りここの内容については重要ではありませんのでコピペで構いません。

### ConfigMap(`server`)
Node.jsのスクリプト本体。Node.jsのサーバーを起動し、リクエストが来た際には環境変数に保存されたPod名と固定文字列を返します。

### Deployment(`app1`/`app2`)
2種類のアプリケーションそれぞれをDeploymentリソースとして作成します。ポイントは以下のとおりです。

- レプリカ数2の冗長構成(`replicas`)
- 先程のConfigMapをマウント(`volueme`/`volumeMounts`)
- Pod起動時にNode.jsの`node`コマンド(Deploymentリソースの`command`フィールド参照)でスクリプト実行
- 環境変数としてPod名を設定(`env`フィールド)

### Service(`app1`/`app2`)
最後に上記をServiceリソースとして公開しています。前回のクラスタ環境構築と違う点として`type`を指定していません。
これにより、そのServiceはクラスタ内でのみアクセス可能なエンドポイントを提供するClusterIPとして作成されます。
もちろん`EXTERNAL-IP`は設定されませんので、`type=LoadBalancer`としたときのようにELBが生成されることはありません。
このように外部公開用のServiceはエッジ部分のみに限定して、通常のServiceはClusterIPとして公開することが多くなります。

kubectlでこれらのリソースをデプロイしましょう。

```shell
kubectl apply -f app.yaml
```

デプロイしたアプリの状態を確認しましょう。

```shell
kubectl get cm,deployment,pod,svc
```

```
# 関連部分のみ抜粋
NAME                                  DATA   AGE
configmap/server                      1      8m31s

NAME                   READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/app1   2/2     2            2           8m31s
deployment.apps/app2   2/2     2            2           8m31s

NAME                        READY   STATUS    RESTARTS   AGE
pod/app1-7ff67dc549-dttr8   1/1     Running   0          8m31s
pod/app1-7ff67dc549-rlw7x   1/1     Running   0          8m31s
pod/app2-b6dc558b5-8q6rw    1/1     Running   0          8m31s
pod/app2-b6dc558b5-q6cq2    1/1     Running   0          8m31s

NAME                 TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)   AGE
service/app1         ClusterIP   10.100.249.6    <none>        80/TCP    8m31s
service/app2         ClusterIP   10.100.192.77   <none>        80/TCP    8m31s
```

app1/app2でそれぞれPodが2つずつ起動して実行中であることが分かります。Serviceリソースについても`TYPE`がClusterIPとして作成されていることが分かります(`EXTERNAL-IP`の割当なし)。

## Ingressリソース作成

では、作成した2つの素晴らしい(?)アプリを外部に公開するためのIngressリソースを作成しましょう。
今回はドメインやDNSは作成せずに、任意のドメインに対して動作シミュレーションするようにします。

任意のYAMLファイル(ここでは`ingress.yaml`としました)を作成し、以下の内容を記述します。

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
spec:
  ingressClassName: nginx # k8s 1.19以降で必要
  rules:
    # app1へのルーティングルール
    - host: sample-app1.mamezou-tech.com
      http:
        paths:
          - backend:
              service:
                name: app1
                port:
                  number: 80
            path: /
            pathType: Prefix
    # app2へのルーティングルール
    - host: sample-app2.mamezou-tech.com
      http:
        paths:
          - backend:
              service:
                name: app2
                port:
                  number: 80
            path: /
            pathType: Prefix
```

`apiVersion: networking.k8s.io/v1`/`kind: Ingress`と記述することでIngressリソースのマニフェストになります。
注意点として`ingressClassName`フィールドに`nginx`と記述する必要があります。対応するIngressClassリソースはNGINX Ingress Controllerのインストール時に既に作成されています[^8][^9]。
最も重要な部分はその下の`rules`フィールド配下です。ここにホスト名、パスに対してルーティングするServiceの名前を記述します。
これにもとづいてIngress ControllerはNginxの設定ファイル(nginx.conf)を更新し、アプリケーションへのリクエストを転送するようになります。
上記では2つのホスト名(`sample-app1.mamezou-tech.com`/`sample-app2.mamezou-tech.com`)に対してそれぞれapp1/app2へとリクエストを流すように指定しています。
もちろんNginxはこれだけでなくリバースプロキシーとして数多くの機能を持っていますので、別途`annotations`フィールド[^10]やConfigMap[^11]を更新することで様々なカスタマイズを行うことができます。

[^8]: Ingress Controllerは複数配置することもありますので、以前は`annotations`でどのIngress Controllerを使用するかを指定していましたが、k8s 1.19からは新たに`IngressClass`というリソースが追加され、これを指定するように変更されています。
[^9]: 対応するIngressClassが存在しない場合(`kubectl get ingressClass -n ingress-nginx`)は、[こちら](https://kubernetes.github.io/ingress-nginx/user-guide/basic-usage/)を参考に別途作成してください。
[^10]: <https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/>
[^11]: <https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/>

では、Ingressリソースについてkubectlコマンドで反映しましょう。

```shell
kubectl apply -f ingress.yaml
```

反映したらIngressリソースの内容を確認しましょう。Ingress ControllerがIngressリソースの作成を検知するまで少し時間がかかる場合もあります。

```shell
kubectl describe ingress app-ingress
```

```
Name:             app-ingress
Namespace:        default
Address:          xxxxxxxxxxxxxxxx-xxxxxxxxxxxxx.elb.ap-northeast-1.amazonaws.com
Default backend:  default-http-backend:80 (<error: endpoints "default-http-backend" not found>)
Rules:
  Host                          Path  Backends
  ----                          ----  --------
  sample-app1.mamezou-tech.com  
                                /   app1:80 (192.168.29.81:8080,192.168.52.46:8080)
  sample-app2.mamezou-tech.com  
                                /   app2:80 (192.168.15.185:8080,192.168.45.143:8080)
Annotations:                    <none>
Events:
  Type    Reason  Age                From                      Message
  ----    ------  ----               ----                      -------
  Normal  Sync    53m (x2 over 53m)  nginx-ingress-controller  Scheduled for sync
  Normal  Sync    53m (x2 over 53m)  nginx-ingress-controller  Scheduled for sync
```

Rulesのセクションを確認するとそれぞれのホスト・パスがService(app1は`app1:80`)およびその背後のPod(app1は`192.168.29.81:8080,192.168.52.46:8080`)に対してのルーティングが設定されていることが分かります。

Nginxに詳しい方は実際のnginx.confの中身が気になるところでしょう。
以下のようにIngress ControllerのPod内の`/etc/nginx/nginx.conf`を見ると実際のNginxの設定ファイルを参照することができます。

```shell
kubectl exec -n ingress-nginx \
  $(kubectl get pod -n ingress-nginx -o jsonpath='{.items[0].metadata.name}') \
  -- cat /etc/nginx/nginx.conf
```

非常に長いので内容は省略しますが、ルーティングルールがnginx.confに反映されている様子が分かります。
このファイルはIngress Controllerがイベントループの中でIngressリソースの変更を検知して更新していくものですので直接更新はしないでください。

## 動作確認

それでは実際にIngress経由でアプリにアクセスしてみましょう。
Ingressはホスト名(Hostヘッダ)に基づいてルーティングを行いますので、Ingressリソースのルールに指定したホスト名と実際のエンドポイント(NLB/Ingress ControllerのURL)について、DNSに登録する必要があります。

こちらについては今回の本題ではありませんので、curlでHostヘッダを指定してシミュレーションしましょう。
実際のアクセス先については、`kubectl get svc ingress-nginx-controller -n ingress-nginx`コマンドのEXTERNAL-IPを確認してください。

今回はIngressのエンドポイント事前に変数に設定しておきます。

```shell
INGRESS_URL=$(kubectl get svc ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
echo $INGRESS_URL
```

`xxxxxxxxxxxxxxxx-xxxxxxxxxxxxxx.elb.ap-northeast-1.amazonaws.com`といった形のURLが出力されればOKです。
それではapp1/app2それぞれに対してリクエストを送ってみましょう。

```shell
# app1
curl -H 'Host:sample-app1.mamezou-tech.com' $INGRESS_URL
# app2
curl -H 'Host:sample-app2.mamezou-tech.com' $INGRESS_URL
```
```
app1-7ff67dc549-rlw7x: hello sample app!
app2-b6dc558b5-q6cq2: hello sample app!
```

app1/app2のそれぞれのPodに対してリクエストが送信できていることが分かります(`app1-xxxxxx`がapp1、`app2-xxxxxx`がapp2に対応します)。
接続できない場合はマニフェストの設定に誤りがある可能性がありますので見直してみてください。

最後に冗長構成で作成したPodに対して負荷分散が正しく行われているかを確認してみましょう。
app1に対して10回リクエストを連続で送信してみます。

```shell
for i in {1..10}; do curl -H 'Host:sample-app1.mamezou-tech.com' $INGRESS_URL; done
```
```
app1-7ff67dc549-dttr8: hello sample app!
app1-7ff67dc549-rlw7x: hello sample app!
app1-7ff67dc549-dttr8: hello sample app!
app1-7ff67dc549-dttr8: hello sample app!
app1-7ff67dc549-dttr8: hello sample app!
app1-7ff67dc549-rlw7x: hello sample app!
app1-7ff67dc549-dttr8: hello sample app!
app1-7ff67dc549-rlw7x: hello sample app!
app1-7ff67dc549-rlw7x: hello sample app!
app1-7ff67dc549-dttr8: hello sample app!
```

2つのPodそれぞれにリクエストが負荷分散されている様子が確認できます。

## セッション維持(Session Affinity)

一般的にコンテナやサーバーレスアーキテクチャで実行するアプリはステートレスが原則です。
とは言ってもインメモリのHttpSessionを使うようなレガシーなアプリをリフト&シフトで移行する場合に、同一クライアントからのリクエストは全て同じPodに振り向けるようにする必要があることも多いでしょう。
今回はこの要件に対応するためにNginxのセッション維持機能を導入してみましょう[^12]。

[^12]: と言ってもオンプレと違い、コンテナ環境ではPodだけでなくNodeについても頻繁に増減させるため、これは完全な代替とはなりません。アプリをステートレスにできるのであればそうすべきです。

NginxではCookieによるセッション維持をサポートしていますのでこれを利用します。
先程のファイルに以下を追記します。
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  # ここから
  annotations:
    nginx.ingress.kubernetes.io/affinity: "cookie"
  # ここまで
spec:
# 以下は変更なし
```

変更点は`annotations`に定義(`nginx.ingress.kubernetes.io/affinity: "cookie"`)を追加しただけです。

他にもCookieに関して指定できるオプションがありますので、詳細は[こちら](https://kubernetes.github.io/ingress-nginx/examples/affinity/cookie/)を参照してください。

こちらについて先程のIngressを更新しましょう。

```shell
kubectl apply -f ingress.yaml
```

こちらで再度リクエストを送ってレスポンスヘッダを確認してみましょう。

```shell
curl -i -H 'Host:sample-app1.mamezou-tech.com' $INGRESS_URL
```

```
HTTP/1.1 200 OK
Date: Sun, 10 Oct 2021 09:03:31 GMT
Content-Type: text/plain
Content-Length: 41
Connection: keep-alive
Set-Cookie: INGRESSCOOKIE=1633856612.574.32.257509|84b1c2de93d4453da32050254a7bce65; Path=/; HttpOnly

app1-7ff67dc549-rlw7x: hello sample app!
```

`Set-Cookie`ヘッダにIngressリソースで指定した`INGRESSCOOKIE`が設定されていることが分かります。

ブラウザの動作をシミュレートして、先程のCookieの値をリクエストに指定して10回連続で送信してみましょう。

```shell
for i in {1..10}; do curl -b 'INGRESSCOOKIE=1633856612.574.32.257509|84b1c2de93d4453da32050254a7bce65' \
  -H 'Host:sample-app1.mamezou-tech.com' $INGRESS_URL; done
```

```
app1-7ff67dc549-rlw7x: hello sample app!
app1-7ff67dc549-rlw7x: hello sample app!
app1-7ff67dc549-rlw7x: hello sample app!
app1-7ff67dc549-rlw7x: hello sample app!
app1-7ff67dc549-rlw7x: hello sample app!
app1-7ff67dc549-rlw7x: hello sample app!
app1-7ff67dc549-rlw7x: hello sample app!
app1-7ff67dc549-rlw7x: hello sample app!
app1-7ff67dc549-rlw7x: hello sample app!
app1-7ff67dc549-rlw7x: hello sample app!
```

レスポンスのPod名を見ると、全て最初のリクエストと同じPodにリクエストが送信されていることが確認できSession Affinityが有効になっていることが分かります。

## 流量制御(Rate Limiting)

最後にDDoSアタック対策としてNginxのRate Limitingによる流量制御を行ってみましょう。
同一クライアントに対して1秒あたりのリクエスト数(RPS: Request Per Seconds)を10に制限してみましょう。

変更点は以下の通りです。

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    # ここから
    nginx.ingress.kubernetes.io/limit-rps: "5"
    # ここまで
spec:
# 以下は変更なし
```

先程のSession Affinityと同様に`annotations`に`nginx.ingress.kubernetes.io/limit-rps: "5"`を指定しただけですね(今回はSession Affinityは無効化してください)。

注意点としてこの設定はNginx Ingress ControllerのPodごとに反映されるため、これにreplicas数を乗じてRPSを計算する必要があります(今回はレプリカ数2のため5x2=10RPSでPodにルーティングされる)。
また、NginxではLeaky bucketアルゴリズムを採用しており、バーストトラフィックに備えてキューイングする点(デフォルトではRPS Limitの5倍)についても考慮する必要があります(今回のサンプルだと5x5x2=100のキューがあります)。

いつものようにこちらも反映させましょう。

```shell
kubectl apply -f ingress.yaml
```

今回は負荷テストツールとしてNode.jsの[loadtest](https://www.npmjs.com/package/loadtest)を利用しますが、他の負荷試験ツールでも構いません。
事前に`npm install -g loadtest`でインストールしておいてください。
ここでは設定値を超えるように1000リクエストをRPS50で投げてみました。

```shell
loadtest -n 1000 --rps 50 -H 'Host:sample-app1.mamezou-tech.com' http://$INGRESS_URL
```

以下のような結果となりました。

```
Requests: 0 (0%), requests per second: 0, mean latency: 0 ms
Requests: 205 (21%), requests per second: 41, mean latency: 22.4 ms
Errors: 25, accumulated errors: 25, 12.2% of total requests
Requests: 455 (46%), requests per second: 50, mean latency: 20.7 ms
Errors: 148, accumulated errors: 173, 38% of total requests
Requests: 706 (71%), requests per second: 50, mean latency: 20.1 ms
Errors: 151, accumulated errors: 324, 45.9% of total requests
Requests: 956 (96%), requests per second: 50, mean latency: 20.8 ms
Errors: 150, accumulated errors: 474, 49.6% of total requests

Target URL:          http://a2f875134edf94076b8ca6906ba8c105-af5122787977356e.elb.ap-northeast-1.amazonaws.com
Max requests:        1000
Concurrency level:   1
Agent:               none
Requests per second: 50

Completed requests:  1000
Total errors:        501
Total time:          20.881590101999997 s
Requests per second: 48
Mean latency:        20.9 ms

Percentage of the requests served within a certain time
  50%      20 ms
  90%      25 ms
  95%      28 ms
  99%      36 ms
 100%      46 ms (longest request)

 100%      46 ms (longest request)

  503:   501 errors
```

時間経過と共にキュー(Bucket)が溢れてリクエストがエラーになっていく様子が分かります。
最終的には501/1000と約50%のリクエストが、PodにルーティングされることなくNGINX Ingress Controllerで503(ServiceUnavailable)エラー[^13]を返されました。

[^13]: 429(Too Many Requests)にしたいところですね。こちらはConfigMapの方で対応可能です。[こちら](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/#limit-req-status-code)を参照してください。

## クリーンアップ

今回のリソース削除する際にはまず作成したk8sリソースを削除してから、クラスタ環境を削除するようにしましょう。
以下の手順でk8sのリソースを削除できます。


```
# app1/app2
kubectl delete -f app.yaml
# Ingress
kubectl delete -f ingress.yaml
# Ingress Controller
helm uninstall ingress-nginx -n ingress-nginx
```

クラスタ環境については環境構築編のクリーンアップ手順を参照してください。
- [AWS EKS(eksctl)](/containers/k8s/tutorial/env/aws-eks-eksctl#クリーンアップ)
- [AWS EKS(Terraform)](/containers/k8s/tutorial/env/aws-eks-terraform#クリーンアップ)
