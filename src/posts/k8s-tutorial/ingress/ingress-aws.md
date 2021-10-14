---
title: Ingress - AWS Load Balancer Controller
author: noboru-kudo
---

[前回](/containers/k8s/tutorial/ingress/ingress-nginx)はNginxをIngress Controllerとして利用しました。
Nginxはロードバランサーとして利用可能なプロキシサーバーで、実績のある成熟したミドルウェアと言えます。
しかし、AWSにはロードバランサーのフルマネージドサービスとしてELB(Elastic Load Balancing)が存在しますので、あえてNginxを入れなくても、ロードバランサー機能として同等のことができます。
今回はIngress ControllerとしてAWSマネージドサービスを利用できるようにしましょう。
こちらに対応できるようAWS Load Balancer Controller[^1]というIngress Controllerがありますのでこちらを導入します。
- Github: <https://github.com/kubernetes-sigs/aws-load-balancer-controller>
- ドキュメント: <https://kubernetes-sigs.github.io/aws-load-balancer-controller>

[^1]: 以前はAWS ALB Ingress Controllerという名前でTicketmaster社で開発されてものでしたが、2018年にKubernetes SIG-AWSに移管された後、NLB(Network Load Balancer)にも対応可能なAWS Load Balancer Controllerと改名されました。

AWS Load Balancer Controllerはその設定によって以下の2種類のELBを作成することが可能です。

1. [ALB:Application Load Balancer](https://docs.aws.amazon.com/ja_jp/elasticloadbalancing/latest/application/introduction.html)
2. [NLB:Network Load Balancer](https://docs.aws.amazon.com/ja_jp/elasticloadbalancing/latest/network/introduction.html)

上記NLBはL4 LoadBalancerのため、LoadBalancerタイプのServiceリソースのみに対応しているため、Ingressをスコープとする本章では対象外となります。

Ingressリソースが登録・変更を検知されると、以下のイメージ[^2]で自動構成されます。

![](https://i.gyazo.com/a7124857e2ba6fafeb8d7b3737032cb4.png)

[^2]: <https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/how-it-works/>より抜粋

このようにAWS Ingress ControllerはIngressの投入を検知(API Serverから通知)すると、ALBリソースを動的に生成し、ルーティングルールやTargetGroupをプロビジョニングして、トラフィックをk8sクラスタにルーティングしてくれることが分かります。


## 事前準備
以下のいずれかの方法で事前にEKS環境を作成しておいてください。

- [AWS EKS(eksctl)](/containers/k8s/tutorial/infra/aws-eks-eksctl)
- [AWS EKS(Terraform)](/containers/k8s/tutorial/infra/aws-eks-terraform)

また、Ingress Controllerのインストールにk8sパッケージマネージャーの[helm](https://helm.sh/)を利用します。未セットアップの場合は[こちら](https://helm.sh/docs/intro/install/) を参考にv3以降のバージョンをセットアップしてください。

## IAMアクセス許可の設定

事前にIngress ControllerがAWSリソースにアクセスできるようにアクセス許可を設定しましょう。
これはeksctl or Terraformのどちらで環境構築したかで手順が変わってきます。

### eksctl

eksctlの場合はサブコマンドが用意されていますのでそちらを利用します。
こちらは[公式ドキュメント](https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.2/deploy/installation/#setup-iam-role-for-service-accounts)に記載されていますのでそのまま実行するだけで構いません。

まずはIngress ControllerのAWSリソースへのアクセスを厳密に行うためIRSA[^3]を有効化します。これはeksctlのサブコマンドを利用します。

[^3]: IAM Roles for Service Account。PodのAWSリソースアクセスを管理する機能。Pod単位でパーミッション管理ができるようになりますので原則使用するようにしましょう。公式ドキュメントは[こちら](https://docs.aws.amazon.com/ja_jp/eks/latest/userguide/iam-roles-for-service-accounts.html)参照。

```shell
eksctl utils associate-iam-oidc-provider \
    --cluster mz-k8s \
    --approve
```

次にAWS上にカスタムポリシーを作成します。下記はAWS CLIを利用していますが、マネジメントコンソールから作成しても構いません。

```shell
curl -o iam-policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/main/docs/install/iam_policy.json
aws iam create-policy \
    --policy-name AWSLoadBalancerControllerIAMPolicy \
    --policy-document file://iam-policy.json
```

そして作成したポリシーを指定したIngress ControllerのIAM Roleを作成します。これはeksctlのサブコマンドが用意されています。

```shell
eksctl create iamserviceaccount \
  --cluster=mz-k8s \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --attach-policy-arn=arn:aws:iam::xxxxxxxxxxxx:policy/AWSLoadBalancerControllerIAMPolicy \
  --approve
```

上記を実行すると新たなCloudFormationスタックが作成され、Ingress Controller用にIAMロールが作成されます。これらはマネジメントコンソールより確認できます。

- CloudFormation
![](https://i.gyazo.com/ab38f741f26ebb516843e49058803b95.png)
- IAM Role
![](https://i.gyazo.com/c1140481a1b49be6ebbb5e76f0deb7fa.png)

これにより、Ingress ControllerがEKSにデプロイされたOIDCプロバイダを経由してAWSリソースへのアクセスを実施することが可能になります。

k8sクラスタに作成されたアカウントも見てみましょう。

```shell
kubectl get sa -n kube-system aws-load-balancer-controller -o yaml
```

```yaml
# 必要部分のみ抜粋
apiVersion: v1
kind: ServiceAccount
metadata:
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::xxxxxxxxxxxx:role/eksctl-mz-k8s-addon-iamserviceaccount-kube-s-Role1-A6F1PJXB0EZ9
  name: aws-load-balancer-controller
  namespace: kube-system
secrets:
- name: aws-load-balancer-controller-token-kd2fj
```

k8sクラスタにも`aws-load-balancer-controller`というServiceAccountリソースが作成されていることが分かります。
`annotations`に注目してください。ここで作成したIAM Roleの紐付けが行われています。
これにより、Ingress Controllerはこのアカウントを利用することで指定したパーミッションでAWSリソースにアクセスする形となります。

このIRSA(IAM Role for ServiceAccount)はIngress Controllerだけでなく、全てのアプリケーションに適用可能ですのでAWSリソースへのアクセスが必要な場合に指定することが望ましいでしょう。

### Terraform

TODO パブリックサブネットにkubernetes.io/role/elb: 1を指定する必要あり。auto-discovery有効にするため。

## Ingress Controllerインストール

前回同様にhelmを用いてインストールしましょう。今回は別途設定ファイルを用意するのではなく、コマンド引数に設定も含めています。

```shell
# helm Chartリポジトリ追加
helm repo add eks https://aws.github.io/eks-charts
helm repo update
```

次にIngress Controllerで使用するCRD(Custom Resource Definition)を作成します。

```shell
kubectl apply -k "github.com/aws/eks-charts/stable/aws-load-balancer-controller//crds?ref=master"
```

これらのCRDについては、Ingress Controller内部や拡張設定(IngressClassParams)で利用するもで、今回は直接利用することはありません。

最後にIngress Controllerをインストールしましょう。以下は現時点で最新の`1.2.7`のHelm Chartを利用しています。

```shell
helm upgrade aws-load-balancer-controller eks/aws-load-balancer-controller \
  --install --version 1.2.7 \
  --namespace kube-system --set clusterName=mz-k8s \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller
```

helm以外にもマニフェストファイルからのインストールオプションもあります。詳細は[こちら](https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/deploy/installation/)を参照してください。

実際にIngress Controllerがデプロイされているのかを確認してみましょう。

```shell
kubectl get pod -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller
```

```
NAME                                            READY   STATUS    RESTARTS   AGE
aws-load-balancer-controller-85df74f446-d89vn   1/1     Running   0          8m8s
aws-load-balancer-controller-85df74f446-dd9jz   1/1     Running   0          8m8s
```

デフォルトでは2つ(`replicaCount`パラメータで変更可)のIngress Controllerが起動されている様子が分かります。

また、現時点でのHelm Chart(`1.2.7`)ではIngressClassについては自動構成しないため、以下のようにIngressClass用のマニフェストを作成して適用しておきましょう。
以下では`aws`というIngressClassを指定すると、ALBが構成されるように設定しています。

```yaml
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: aws
spec:
  controller: ingress.k8s.aws/alb
```

ここでは上記を`ingressclass.yaml`という名前で作成しました。これをクラスタ環境に反映しましょう。

```shell
kubectl apply -f ingressclass.yaml
```

これで準備は完了です。

## サンプルアプリデプロイ

それでは、Ingress作成前にサンプルアプリをデプロイしてみましょう。

利用するアプリについてもNGINX Ingress Controllerと1点除いて同じですので、[こちら](/containers/k8s/tutorial/ingress/ingress-nginx/#サンプルアプリのデプロイ)を参照してください。
異なる点はAWS Load Balancer ControllerはNodePortを経由してルーティングを行うため、Serviceリソースに対して`type=NodePort`を指定する必要があります[^4]。

[^4]: NGINX Ingress Controllerは、Ingress ControllerがLoadBalancerタイプのService(`ingress-nginx-controller`)経由でルーティングしていましたので、全く別の実装になっています。

以下はapp1のみですが、app2のServiceに対しても同様の変更をしてください。

```yaml
apiVersion: v1
kind: Service
metadata:
  labels:
    app: app1
  name: app1
spec:
  # ClusterIPではなくNodePortを指定
  type: NodePort
  selector:
    app: app1
  ports:
    - targetPort: http
      port: 80
```

こちらでデプロイします。

```shell
kubectl apply -f app.yaml
```

デプロイ後はアプリの内容を確認しましょう。

```shell
kubectl get cm,deployment,pod,svc
```

```
# 必要部分のみ抜粋
NAME                         DATA   AGE
configmap/server             1      3m40s

NAME                   READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/app1   2/2     2            2           3m40s
deployment.apps/app2   2/2     2            2           3m40s

NAME                        READY   STATUS    RESTARTS   AGE
pod/app1-7ff67dc549-9flp8   1/1     Running   0          3m40s
pod/app1-7ff67dc549-h2kc4   1/1     Running   0          3m40s
pod/app2-b6dc558b5-5p5fd    1/1     Running   0          3m40s
pod/app2-b6dc558b5-99skd    1/1     Running   0          3m40s

NAME                 TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE
service/app1         NodePort    10.100.68.126   <none>        80:32672/TCP   3m40s
service/app2         NodePort    10.100.210.66   <none>        80:30243/TCP   3m40s
```

上記のように構成されていれば準備は完了です(Serviceの`TYPE`が`NodePort`になっている点を確認してください)。


## Ingressリソース作成

それではIngressリソースの作成を行い、2つのアプリ(app1/app2)へのルーティングを構成しましょう。
マニフェストファイル(`ingress.yaml`という名前で作成しました)は以下のようになります。

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-aws-ingress
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
spec:
  ingressClassName: aws
  rules:
    - host: sample-app.mamezou-tech.com
      http:
        paths:
          # app1へのルーティングルール
          - backend:
              service:
                name: app1
                port:
                  number: 80
            path: /app1
            pathType: Prefix
          # app2へのルーティングルール
          - backend:
              service:
                name: app2
                port:
                  number: 80
            path: /app2
            pathType: Prefix
```

まず、AWS Load Balancer Controllerではデフォルトは内部LBとして構成されますので、外部公開用に作成する場合は`annotaions`で`alb.ingress.kubernetes.io/scheme: internet-facing`を指定する必要があります。
また、`IngressClassName`には先程作成した`aws`を指定しています。これによりAWS Load Balancer Controllerを使ってIngressを構成するようにしています。

最後に前回NGINX Ingress Controllerのときは、ホスト名ベースでルーティングルールを作成しましたが、今回はパスベースで作成しています。
`/app1`が指定されるとapp1へ、`/app2`が指定されるとapp2にリクエストを転送するようにしています。

指定できるオプションは他にも多く存在します。詳細は[こちら](https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/annotations/)を参照してください。

```shell
kubectl apply -f ingress.yaml
```

Ingressリソースの詳細を確認してみましょう。

```shell
kubectl describe ingress app-aws-ingress
```

```
Name:             app-aws-ingress
Namespace:        default
Address:          k8s-default-appawsin-xxxxxxxxx-xxxxxxxxxx.ap-northeast-1.elb.amazonaws.com
Default backend:  default-http-backend:80 (<error: endpoints "default-http-backend" not found>)
Rules:
  Host                         Path  Backends
  ----                         ----  --------
  sample-app.mamezou-tech.com  
                               /app1   app1:80 (192.168.18.184:8080,192.168.70.176:8080)
                               /app2   app2:80 (192.168.19.165:8080,192.168.84.183:8080)
Annotations:                   alb.ingress.kubernetes.io/scheme: internet-facing
Events:
  Type    Reason                  Age   From     Message
  ----    ------                  ----  ----     -------
  Normal  SuccessfullyReconciled  33s   ingress  Successfully reconciled
```

AWS上にALBが生成されて、`Address`に公開アドレス(FQDN)が表示されています。

実際にマネジメントコンソールでも確認してみましょう。EC2メニューより参照できます。

1. ロードバランサ
![](https://i.gyazo.com/406d7ef4b4a55a73982fe977d9dd339b.png)
外部公開LB(Internet-facing)としてALB(種類=application)が作成されていることが分かります。

2. ルーティングルール(リスナー -> ルールの表示/編集)
![](https://i.gyazo.com/696d3e9f9fd956528712e8fb1f6b7ed0.png)
Ingressリソースに指定したルールでルーティング設定が構成されています。

これらは手動で変更するとk8sで管理する状態と差異が出てしまうため避けるようにしてください。


## 動作確認

それではALB経由でアプリにアクセスしてみましょう。
今回も[前回](/containers/k8s/tutorial/ingress/ingress-nginx/#動作確認)同様に、DNS設定を実施しないため、curlでHostヘッダを直接指定してアプリにアクセスします。

まずはURLを使い回せるようにIngressリソース（=ALB）のエンドポイントを変数に保存しておきます。

```shell
INGRESS_URL=$(kubectl get ingress app-aws-ingress -o jsonpath='{.status.loadBalancer.ingress[*].hostname}')
echo $INGRESS_URL
```

`k8s-default-appawsin-xxxxxxx-xxxxxxxxx.ap-northeast-1.elb.amazonaws.com`といった形のURLが出力されればOKです。

```shell
# app1
curl $INGRESS_URL/app1 -H 'Host:sample-app.mamezou-tech.com'; echo
# app2
curl $INGRESS_URL/app2 -H 'Host:sample-app.mamezou-tech.com'; echo
```

```
app1-7ff67dc549-h2kc4: hello sample app!
app2-b6dc558b5-5p5fd: hello sample app!
```

正常に応答レスポンスが返ってきており、ALB経由でアプリにアクセスできていることが分かります。
また、出力内容から指定したパスに応じてそれぞれのアプリ(app1/app2)に対してリクエストが届いていることも確認できました。

次に正しく負荷分散ができているかを確認します。app1に対して連続して10リクエスト送信します。

```shell
for i in {1..10}; do curl -H 'Host:sample-app.mamezou-tech.com' $INGRESS_URL/app1; done
```

```
app1-7ff67dc549-h2kc4: hello sample app!
app1-7ff67dc549-h2kc4: hello sample app!
app1-7ff67dc549-9flp8: hello sample app!
app1-7ff67dc549-9flp8: hello sample app!
app1-7ff67dc549-9flp8: hello sample app!
app1-7ff67dc549-h2kc4: hello sample app!
app1-7ff67dc549-h2kc4: hello sample app!
app1-7ff67dc549-9flp8: hello sample app!
app1-7ff67dc549-9flp8: hello sample app!
app1-7ff67dc549-9flp8: hello sample app!
```

出力内容から2つのPodに負荷分散されている様子が見て取れます。

## DNSプロビジョニング TODO 別章に移動
Route53で宛先をIngerssリソースのHost名とALBをマッピングする。
手動でやることもできるが、Ingressリソースを作成するたびにRecordSetを作るのは面倒。
そんな面倒くさがりな人のためにDNSの自動プロビジョニングをやってくれる[external-dns https://github.com/kubernetes-incubator/external-dns]を使う。
この製品はRoute53だけなく、Cloud DNS等様々なDNSサービスのプロビジョニングが可能

ここではドメインはGoogle Domainsで以前取得した`frieza.dev`を使い回す。
まずはRoute53のHostedZoneを作成する(ここは手動でやる必要がある)。
```shell
aws route53 create-hosted-zone --name "frieza.dev." --caller-reference "frieza.dev-$(date +%s)"
```

割り当てられたNameサーバ情報を取得する。
```shell
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones --query 'HostedZones[0].Id' --output text)
aws route53 get-hosted-zone --id $HOSTED_ZONE_ID
```
```
> {
>     "HostedZone": {
>         "ResourceRecordSetCount": 4,
>         "CallerReference": "frieza.dev-1561126253",
>         "Config": {
>             "PrivateZone": false
>         },
>         "Id": "/hostedzone/ZINLB2WD5FXEV",
>         "Name": "frieza.dev."
>     },
>     "DelegationSet": {
>         "NameServers": [
>             "[* ns-1520.awsdns-62.org]",
>             "[* ns-822.awsdns-38.net]",
>             "[* ns-1749.awsdns-26.co.uk]",
>             "[* ns-470.awsdns-58.com]"
>         ]
>     }
> }
```

取得したNameServerを利用するようにGoogleDomainに設定する。実際に反映されるまでに数時間もかかった。
![](https://i.gyazo.com/634bc5fad3f53edb15b2701e0b2420d5.png)

external-dnsのマニフェストをダウンロードしてdomain-filterをfrieza.dev(Route53のHostedZone)に修正する(余計なものは消した)。
```shell
curl -o external-dns.yaml https://raw.githubusercontent.com/kubernetes-sigs/aws-alb-ingress-controller/v1.1.2/docs/examples/external-dns.yaml
```
```yaml
# (省略)
metadata:
  name: external-dns
spec:
  strategy:
  type: Recreate
  template:
    metadata:
      labels:
        app: external-dns
    spec:
      serviceAccountName: external-dns
      containers:
      - name: external-dns
      image: registry.opensource.zalan.do/teapot/external-dns:v0.5.9
      # ここだけ修正
      args:
      - --source=service
      - --source=ingress
      - --domain-filter=frieza.dev
      - --provider=aws
      - --policy=upsert-only
      - --aws-zone-type=public
```
これをEKSに投入する。
```shell
kubectl apply -f external-dns.yaml
```
external-dnalのログを見てみる。
```shell
kubectl logs deploy/external-dns
```
```
> time="2019-06-22T01:48:09Z" level=info msg="Created Kubernetes client https://10.100.0.1:443"
> time="2019-06-22T01:48:11Z" level=info msg="Desired change: [* CREATE eks.frieza.dev A]"
> time="2019-06-22T01:48:11Z" level=info msg="Desired change: [* CREATE eks.frieza.dev TXT]"
> time="2019-06-22T01:48:11Z" level=info msg="[* 2 record(s) in zone frieza.dev. were successfully updated]"
```
external-dnsがIngressのHost名をRoute53にレコードセットを作成してくれているのが分かる(AレコードとTXTレコード)。
- AWSコンソール(Route53)
![](https://i.gyazo.com/0601e3527038d74bab56d7f5a47e1803.png)

DNSレコードがグローバルに伝播されるまでまたしばらく待つ。
```shell
dig eks.frieza.dev
```
```
> ; <<>> DiG 9.10.6 <<>> eks.frieza.dev
> ;; global options: +cmd
> ;; Got answer:
> ;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 27697
> ;; flags: qr rd ra; QUERY: 1, ANSWER: 3, AUTHORITY: 4, ADDITIONAL: 9
>
> ;; OPT PSEUDOSECTION:
> ; EDNS: version: 0, flags:; udp: 4096
> ;; QUESTION SECTION:
> ;eks.frieza.dev.                        IN      A
>
> ;; ANSWER SECTION:
> [* eks.frieza.dev.         60      IN      A       13.113.34.180]
> [* eks.frieza.dev.         60      IN      A       13.113.165.21]
> [* eks.frieza.dev.         60      IN      A       13.115.180.248]
>
> ;; AUTHORITY SECTION:
> frieza.dev.             10800   IN      NS      ns-1520.awsdns-62.org.
> frieza.dev.             10800   IN      NS      ns-1749.awsdns-26.co.uk.
> frieza.dev.             10800   IN      NS      ns-470.awsdns-58.com.
> frieza.dev.             10800   IN      NS      ns-822.awsdns-38.net.
> (省略)
```
OK!
さっそくIngressリソースで指定したお気に入りのURLでアクセスする。
```shell
for i in {1..10}; do curl eks.frieza.dev/app1;echo; done
```
```
> [app1:192.168.55.55]私の戦闘力は530000です…ですが、(省略)
> [app1:192.168.69.94]私の戦闘力は530000です…ですが、(省略)
> [app1:192.168.55.55]私の戦闘力は530000です…ですが、(省略)
> [app1:192.168.69.94]私の戦闘力は530000です…ですが、(省略)
> [app1:192.168.69.94]私の戦闘力は530000です…ですが、(省略)
> [app1:192.168.55.55]私の戦闘力は530000です…ですが、(省略)
> [app1:192.168.69.94]私の戦闘力は530000です…ですが、(省略)
> [app1:192.168.69.94]私の戦闘力は530000です…ですが、(省略)
> [app1:192.168.55.55]私の戦闘力は530000です…ですが、(省略)
```
```shell
for i in {1..10}; do curl eks.frieza.dev/app2;echo; done
```
```
> [app2:192.168.38.49]ずいぶんムダな努力をするんですね・・・(省略)
> [app2:192.168.38.49]ずいぶんムダな努力をするんですね・・・(省略)
> [app2:192.168.85.223]ずいぶんムダな努力をするんですね・・(省略)
> [app2:192.168.38.49]ずいぶんムダな努力をするんですね・・・(省略)
> [app2:192.168.38.49]ずいぶんムダな努力をするんですね・・・(省略)
> [app2:192.168.85.223]ずいぶんムダな努力をするんですね・・(省略)
> [app2:192.168.38.49]ずいぶんムダな努力をするんですね・・・(省略)
> [app2:192.168.38.49]ずいぶんムダな努力をするんですね・・・(省略)
> [app2:192.168.38.49]ずいぶんムダな努力をするんですね・・・(省略)
> [app2:192.168.85.223]ずいぶんムダな努力をするんですね・・(省略)
```
ランダムにリクエストが各Podに分散されているのが分かる。
ALBは負荷分散アルゴリズムとしてはラウンドロビンのみサポートしているのでそれ以外はできない。

こうしておけば新たに別のIngressを投入する際にドメイン`frieza.dev`のサブドメインにしておけばALBリソースやRoute53のRecordSetが自動でプロビジョニングされるようになる。

## クリーンアップ

EKS経由でいろいろなりソースを作ってDriftしているので、単純にClusterだけを消すとCloudFormationスタックの削除に失敗する。

```shell
# Ingress -> ALBリソース削除
kubectl delete ingress/ingress
# ALB Ingress Controller
helm delete --purge aws-alb-ingress-controller
# external-dns
kubectl delete deploy/external-dns

# Route53(CLIだとjson作らないとダメ。マネジメントコンソールから消したほうが早い)
aws route53 change-resource-record-sets --hosted-zone-id $HOSTED_ZONE_ID --change-batch file://del-records.json
aws route53 delete-hosted-zone --id $HOSTED_ZONE_ID

# 最後にクラスタを消す
eksctl delete cluster --name $CLUSTER_NAME
```

クラスタ削除にも15分程度時間がかかる。CloudFormationを見て削除が全て成功していることを確認した方がよい。

