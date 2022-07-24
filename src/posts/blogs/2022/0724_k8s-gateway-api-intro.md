---
title: Ingressを強化したKubernetes Gateway APIを試してみる
author: noboru-kudo
date: 2022-07-24
tags: [k8s, container, istio]
templateEngineOverride: md
---

2022-07-13にKubernetesコミュニティ(sig-network)で策定が進められているKubernetes Gateway APIがベータ版になりました。

- [Kubernetes Gateway API Graduates to Beta](https://kubernetes.io/blog/2022/07/13/gateway-api-graduates-to-beta/)

外部からのトラフィックにはKubernetesビルトインリソースのIngressで対応することが多いと思いますが、Ingressには次のような欠点が指摘されてきました。

- クラスタ管理者、アプリ開発者の関心事が1つのリソース(Ingress)内に混在している(責務が曖昧)
- カナリアリリース等、Ingressでサポートしていない機能を利用する場合は、実装固有のアノテーションを指定する必要がある
- HTTP(S)通信しか対応していない(この部分は現時点ではGateway APIでも実験的バージョン)

Kubernetes Gateway API(以下Gateway API)はこのような欠点を解消すべく誕生した新しいAPIです。
現時点ではサポートするプロダクトのほとんどが一部機能に限定されており、商用環境で使うにはかなり勇気が必要ですが、将来的にはIngressに取って変わる可能性があります。
今回はこのGateway APIを実際に試してみたいと思います。

:::info
現時点で最も実装が進んでいるのはGCPのGKEで、パブリックプレビュー版として提供されています。
興味のある方は以下公式ドキュメントを参照してください。

- [Google Cloud GKEドキュメント - Gateway](https://cloud.google.com/kubernetes-engine/docs/concepts/gateway-api)
:::

[[TOC]]

## Kubernetes Gateway APIが提供するリソース

Gateway APIは、ロールに応じてリソースが分離され、大規模クラスタでの運用に配慮した設計となっています。
次のリソースで構成されています。

| リソース名        | ロール           | 内容                |
|--------------|---------------|-------------------|
| GatewayClass | インフラプロバイダ     | Gateway種類の定義      |
| Gateway      | クラスタ管理者       | Gatewayインスタンスの設定  |
| xRoute(複数種類) | アプリ管理者 or 開発者 | Serviceへのルーティング設定 |

このようにGateway APIはロール指向でリソースが分割されています。

GatewayClassはクラウドプロバイダや実装ベンダーが提供するもので、利用者が作成することはほとんどないかと思います。
Ingressでいう[IngressClass](https://kubernetes.io/docs/concepts/services-networking/ingress/#ingress-class)と同義になります。

GatewayとxRouteは従来のIngressリソースに対応します。Gateway APIでは運用を考慮し、ロールに応じて2つに分割されています。

Gatewayはクラスタ管理者が作成します。ここではGatewayインスタンス自体のインフラ設定をします。
また、ここで作成したGatewayの利用範囲を制限したり、TLSや共通のネットワーク設定もここでできます。

xRouteはアプリのルーティングを設定するリソースで、アプリ開発者または管理者が自分のNamespace内に作成します。
xの部分はHTTPやTLS等の種類でさらに分割されます。現時点では、HTTPRouteのみがベータ版として提供されています。

:::column:HTTP(S)以外のxRoute
TLSのSNIベースのルーティングを定義するTLSRouteや、TCP/UDPプロトコルをサポートするTCP/UDPRouteがあります。
現時点では、両者は実験的(Experimental)バージョンで、デフォルトでは含まれていません([Experimental Channel](https://gateway-api.sigs.k8s.io/guides/getting-started/#install-experimental-channel)として提供)。
これが安定してくるとHTTP以外の様々なプロトコルに対応可能となり、Gateway APIの普及が大きく前進しそうです。

- [Kubernetes Gateway APIドキュメント - TLS Configuration](https://gateway-api.sigs.k8s.io/guides/tls/)
- [Kubernetes Gateway APIドキュメント - TCP routing](https://gateway-api.sigs.k8s.io/guides/tcp/)
:::

以下公式ドキュメントから、これらのリソースの関連を示したものを抜粋しました。

![gateway api resource relations](https://i.gyazo.com/8b45f6bc139dbf8037e682ae08a1a7d0.png)
引用元: <https://gateway-api.sigs.k8s.io/concepts/api-overview/#combined-types>

以降で実際のGateway APIの利用方法を見ていきます。

## IstioでGateway APIをセットアップする

今回はKubernetes環境にはローカルで簡単に確認できるminikubeを利用しました[^1]。

[^1]: minikubeのセットアップは[こちら](/containers/k8s/tutorial/app/minikube/)の記事を参照してください。

Gateway APIの実装にはいくつかありますが、ここでは[Istio](https://istio.io/)を使用することにしました。
Istioは以下公式ドキュメントよりセットアップします。

- [Istio - Getting Started](https://istio.io/latest/docs/setup/getting-started/)

:::alert
IstioのGateway APIサポートは現時点でアルファ版の位置づけです。
まだ安定しているとは言えませんので、実運用を検討する際は最新の実装状況を確認してください。

- [Istio - Kubernetes Gateway API](https://istio.io/latest/docs/tasks/traffic-management/ingress/gateway-api/)

Istio以外でGateway APIをサポートする製品や実装ステータスは、以下に記載があります。
- [Kubernetes Gateway API - Implementation](https://gateway-api.sigs.k8s.io/implementations/)
:::

ここではistioctl(CLIツール)をインストールし、Istio本体をminimalプロファイルでセットアップします。

```shell
curl -L https://istio.io/downloadIstio | sh -
# ここでは現時点の最新バージョンの1.14.1をインストール
cd istio-1.14.1
export PATH=$PWD/bin:$PATH
istioctl install --set profile=minimal -y
```

インストールが終わるとistio-systemというNamespace配下にIstioのPodが実行されます。

```shell
kubectl get pod -n istio-system
```
```
NAME                      READY   STATUS    RESTARTS   AGE
istiod-859b487f84-48b9w   1/1     Running   0          3m2s
```

また、この時点で`istio`というGatewayClassも作成されていました。これを使用してGateway APIを利用できそうです。

```shell
kubectl get gatewayclass
```
```
NAME    CONTROLLER                    ACCEPTED   AGE
istio   istio.io/gateway-controller   True       1h
```

<div style="margin-top: 1.2rem"></div>

セットアップ後は別ターミナルで、minikubeからローカル環境にトンネルを通しておきます。

```shell
minikube tunnel
```

minikubeからローカル環境にトンネルが作成されます。このターミナルはこのままにしておきます。

## Gatewayを作成する

ここでは以下のような構成を想定します。

![sample-structure](https://i.gyazo.com/cfdafa63b907861549c0e4a0b08b0dad.png)

fooとbarというチームがそれぞれ開発したアプリを、クラスタ管理者が管理する共通Gatewayで公開するものとします。
また、Gatewayはドメイン`example.com`のサブドメインを使用するアプリでのみ利用可能とします。

では、Gatewayリソースを作成してみます。
まずは、クラスタ管理者のみがGatewayを作成するものとして専用Namespaceを用意します。

```shell
kubectl create ns istio-ingress
```

ここでは`istio-ingress`としました。

作成するGatewayリソースは以下のようになります(`gateway.yaml`としました)。

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: Gateway
metadata:
  name: gateway
  namespace: istio-ingress
spec:
  gatewayClassName: istio
  listeners:
    - name: default
      hostname: "*.example.com"
      port: 80
      protocol: HTTP
      allowedRoutes:
        namespaces:
          from: All
```

`spec.gatewayClassName`に先程確認したIstioが提供するGatewayClassの名前を指定します。

`spec.listeners`にはGatewayの設定を記述します。
ここではdefaultという名前で、ホスト名`*.example.com`のHTTP通信を許可するリスナーを1つ作成しました。

これを反映します。
```shell
kubectl apply -f gateway.yaml
```

Gatewayの状態は以下で確認します。
```shell
kubectl get gateway -n istio-ingress
```
```
NAME      CLASS   ADDRESS         READY   AGE
gateway   istio   10.102.160.70   True    82s
```

READYがtrueとなり、Istio側の準備が完了しています。
ADDRESSが外部向けのIPアドレスです。
今回はローカル環境ですが、クラウド環境ではこの時点でロードバランサーが配置され、エンドポイントが割り当てられるはずです。

実際のGatewayのPod、Serviceも確認してみます。

```shell
kubectl get pod,svc -n istio-ingress
```

```
NAME                           READY   STATUS    RESTARTS   AGE
pod/gateway-6cd4768fdf-rcv4b   1/1     Running   0          4m6s

NAME              TYPE           CLUSTER-IP      EXTERNAL-IP     PORT(S)                        AGE
service/gateway   LoadBalancer   10.102.160.70   10.102.160.70   15021:30671/TCP,80:30970/TCP   4m6s
```

Gateway Podが起動しています。実態はIstioのEnvoyプロキシーです。
また、LoadBalancerタイプのServiceも作成され、EXTERNAL-IPには先程のGatewayと同じIPアドレスが指定されています。
これを通して外部からのトラフィックを受け付けています。

## HTTPRouteでルーティングを定義する

HTTPRouteを作成して、アプリのルーティングを定義します。

ここでは予め以下のマニフェストでサンプルアプリをデプロイしておきました。

- [fooアプリ - マニフェスト](https://gist.github.com/kudoh/c6e015861c1aac9dee46752a1d1c4f6f)
- [barアプリ - マニフェスト](https://gist.github.com/kudoh/78ea558a8c92725d10174a12877ed0aa)

それぞれリクエストを受け付けると、Pod名を返すだけのシンプルなものです。
このアプリに対してHTTPRouteを作成します。

```yaml
# foo-route.yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: HTTPRoute
metadata:
  name: http
  namespace: foo
spec:
  parentRefs:
    - name: gateway
      namespace: istio-ingress
      sectionName: default
  hostnames: ["foo.example.com"]
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /foo
      backendRefs:
        - name: foo
          port: 80
```
```yaml
# bar-route.yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: HTTPRoute
metadata:
  name: http
  namespace: bar
spec:
  parentRefs:
    - name: gateway
      namespace: istio-ingress
      sectionName: default
  hostnames: ["bar.example.com"]
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /bar
      backendRefs:
        - name: bar
          port: 80
```

それぞれの基本的な構造は同じです。

まず、`spec.parentRefs`配下で先程作成したGatewayリソースを指定します。`sectionName`にはリスナーの名前を指定します。こちらは先程defaultという名前で作成しましたので、それを設定します。

`spec.hostNames`にはホスト名を指定します。Gateway側で`example.com`のサブドメインのみを許可しましたので、それぞれ`foo.example.com`、`bar.example.com`としました。

最後に`spec.rules`です。ここにアプリ向けに作成したServiceリソースへのマッピングを定義します。
この辺りはIngressの指定とほとんど同じです。それぞれのパス(`/foo`または`/bar`)に対応するServiceへのルーティングを指定します。

これをクラスタに反映します。

```shell
kubectl apply -f foo-route.yaml -f bar-route.yaml
```

HTTPRouteは以下で確認します。

```shell
kubectl get httproute -A
```
```
NAMESPACE   NAME   HOSTNAMES             AGE
bar         http   ["bar.example.com"]   2m34s
foo         http   ["foo.example.com"]   3m50s
```

実際のIstioのルーティング設定は、IstioのCLIツールistioctlからも確認できます。

```shell
GATEWAY_POD=$(kubectl get pod -n istio-ingress -o jsonpath='{.items[0].metadata.name}')
istioctl proxy-config route ${GATEWAY_POD} -n istio-ingress
```
```
NAME        DOMAINS             MATCH                  VIRTUAL SERVICE
http.80     bar.example.com                            http-0-istio-autogenerated-k8s-gateway.bar
http.80     foo.example.com                            http-0-istio-autogenerated-k8s-gateway.foo
            *                   /stats/prometheus*     
            *                   /healthz/ready*        
```

実際に動作するかをcurlで確認します。今回はDNS設定をしていないので、Hostヘッダを指定します。

```shell
GATEWAY_IP=$(kubectl get gateways gateway -n istio-ingress -o jsonpath='{.status.addresses[*].value}')
curl -H Host:foo.example.com ${GATEWAY_IP}/foo 
> foo foo-99dcf8b8-jq8gm
curl -H Host:bar.example.com ${GATEWAY_IP}/bar
> bar bar-95c7cdf87-v8sqx
```

無事Gateway経由でPodにアクセスできました。

## HTTPS通信を強制する

一般的に外部公開向けのエンドポイントはHTTPS通信を強制したいことが多いと思います。
Ingressだと、ルーティングを記述するIngressリソース側にTLS設定が必要でしたが、Gateway APIではクラスタ管理者側(つまりGatewayリソース)で設定します。

ローカルで簡単に試せる自己署名の証明書を使って試してみます。
まず、opensslで自己署名のワイルドカード証明書を作成し、Secretリソースとして登録します。

```shell
openssl req -x509 -nodes -days 30 -subj /CN=*.example.com \
  -keyout server.key -out server.crt
kubectl create secret tls self-signed-cert \
  --cert server.crt --key server.key -n istio-ingress
```

Gatewayリソースは以下のように修正します。

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: Gateway
metadata:
  name: gateway
  namespace: istio-ingress
spec:
  gatewayClassName: istio
  listeners:
    - name: default
      hostname: "*.example.com"
#      port: 80
#      protocol: HTTP
      port: 443
      protocol: HTTPS
      tls:
        certificateRefs:
          - kind: Secret
            group: ""
            name: self-signed-cert
            namespace: istio-ingress
      allowedRoutes:
        namespaces:
          from: All
```

`spec.port/protocol`には443/HTTPSとし、`spec.tls.certificateRefs`に先程作成した証明書のSecretリソースを指定します。
アプリ側で作成したHTTPRouteリソースは変更不要です。

これを適用します。
```shell
kubectl apply -f gateway.yaml
```

これだけです。今度はHTTPSプロトコルでアクセスします。

```shell
curl -H Host:foo.example.com --resolve "foo.example.com:443:${GATEWAY_IP}" \
  --cacert server.crt "https://foo.example.com:443/foo"
> foo foo-99dcf8b8-jq8gm
curl -H Host:bar.example.com --resolve "bar.example.com:443:${GATEWAY_IP}" \
  --cacert server.crt "https://bar.example.com:443/bar"
> bar bar-95c7cdf87-v8sqx
```

先ほどと同じ結果になりました。アプリ側(つまりHTTPRouteリソース)では何もせずともHTTPS化できました。
この構成であれば、更新を忘れがちな証明書もクラスタ管理者で一括管理になります。
非機能要件をアプリ担当者から分離できますので、ある程度大きい規模のクラスタでは理想的だと思います。

## カナリアリリースをする

Gateway APIではカナリアリリースもサポートします。これをIngressで実現するには、実装固有のアノテーションで指定する必要がありました。

以下のようにfooアプリをv1 -> v2にアップデートするケースを想定します。
なお、シンプルに確認するために、先程のHTTPS通信はHTTPに戻しました。

![canary release](https://i.gyazo.com/2e209d5107d974a12a93564356d2020b.png)

今回の主要アクターはアプリ開発者です。HTTPRouteのルーティングを調整することでカナリアリリースを実現します。

まずはv1,v2のアプリを用意します。以下のマニフェストを作成し、デプロイ(Deployment, Service)しておきました。

- [fooアプリ - v1,v2マニフェスト](https://gist.github.com/kudoh/6e9dfe63fff2c1e49c98d99ad02b9adc)

現時点では100%のトラフィックをv1に向けておきますが、HTTPヘッダでenv=canaryと指定した場合はv2の方にトラフィックを振り向けるようにします。
HTTPRouteは以下のようになります。

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: HTTPRoute
metadata:
  name: http
  namespace: foo
spec:
  parentRefs:
    - name: gateway
      namespace: istio-ingress
      sectionName: default
  hostnames: ["foo.example.com"]
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /foo
      backendRefs:
        - name: foo-v1
          port: 80
    - matches:
        - headers:
            - name: env
              value: canary
          path:
            type: PathPrefix
            value: /foo
      backendRefs:
        - name: foo-v2
          port: 80
```

`spec.rules`に2つのルールを記述しています。1つ目のルールでは先程と同様にパス一致のみでv1、2つ目のルールではそれにHTTPヘッダ条件(`spec.rules.matches.headers`)を加えてv2へのルーティングを指定します。
この状態で反映すると、以下のようになります。

```shell
# デフォルト -> v1
curl -H Host:foo.example.com ${GATEWAY_IP}/foo 
> foo foo-v1-6c476649d9-km6k4
# HTTPヘッダ(env=canary)指定 -> v2
curl -H Host:foo.example.com -H env:canary ${GATEWAY_IP}/foo 
> foo foo-v2-9c5644495-vlzvx
```

期待通り、特定のHTTPヘッダがついている場合のみv2にトラフィックが流れました。

次に、v1へ80%、v2に20%のトラフィックを流すようにします。
HTTPRouteを以下のように変更します。

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: HTTPRoute
metadata:
  name: http
  namespace: foo
spec:
  parentRefs:
    - name: gateway
      namespace: istio-ingress
      sectionName: default
  hostnames: ["foo.example.com"]
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /foo
      backendRefs:
        - name: foo-v1
          port: 80
          weight: 80
        - name: foo-v2
          port: 80
          weight: 20
```

ルールは1つになり、`spec.rules.backendRefs`に2つのServiceを記述しました。
それぞれに`weight`を追加して、トラフィックの割合を指定します。

これを適用して、複数回curlでアクセスしてみます。

```shell
for i in $(seq 1 10); do curl -H Host:foo.example.com ${GATEWAY_IP}/foo; done 
```
```
foo foo-v1-6c476649d9-km6k4
foo foo-v1-6c476649d9-km6k4
foo foo-v1-6c476649d9-km6k4
foo foo-v2-9c5644495-vlzvx
foo foo-v1-6c476649d9-km6k4
foo foo-v1-6c476649d9-km6k4
foo foo-v1-6c476649d9-km6k4
foo foo-v2-9c5644495-vlzvx
foo foo-v1-6c476649d9-km6k4
foo foo-v1-6c476649d9-km6k4
```

20%の割合でv2にトラフィックが流れていることが確認できます。
最後にv1側のweightを0、v2を100にすればリリース完了です(もちろんv1側は削除しても構いません)。

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: HTTPRoute
metadata:
  name: http
  namespace: foo
spec:
  parentRefs:
    - name: gateway
      namespace: istio-ingress
      sectionName: default
  hostnames: ["foo.example.com"]
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /foo
      backendRefs:
        - name: foo-v1
          port: 80
          weight: 0
        - name: foo-v2
          port: 80
          weight: 100
```

これで全てのトラフィックはv2側に流れます（自明なので確認結果は省略します）。

:::column:Flaggerでカナリアリリースを自動化する
ここでは手動でカナリアリリースを試しましたが、プログレッシブデリバリーツールの[Flagger](https://flagger.app/)でもGateway APIの対応が進められています。
実際にカナリアリリースをする際は、Flaggerを利用した方がより確実なリリースを実施できると思います。
今回は試してはいませんが、興味のある方は以下のドキュメントを参照してください。

- [Flagger - Gateway API Canary Deployments](https://docs.flagger.app/tutorials/gatewayapi-progressive-delivery)

Flaggerを利用したカナリアリリースは本サイトでも紹介記事がありますので、そちらもぜひご参考ください。
- [Flagger と Ingress Nginx でカナリアリリースをする](/blogs/2022/05/08/flagger-nginx-canary/)
:::

## まとめ

Gateway APIは責務に応じてリソースが分割されたことで、ある程度の規模のクラスタ構成で運用効率が大きく改善されると思います。
また、カナリアリリース等、Ingressにはない仕様が多く盛り込まれ、よりモダンなAPIになってきた感があります。
今後HTTPS以外のプロトコルについても順次実装が進んでくると、多くのユースケースで適用可能になり、より注目度が高まってくると考えられます。

ただし、Gateway APIのFAQによると、現状Gateway APIでIngressを置き換える予定はないようです。

> Q: Will Gateway API replace the Ingress API?
> A: No. The Ingress API is GA since Kubernetes 1.19. There are no plans to deprecate this API and we expect most Ingress controllers to support it indefinitely.

引用元: <https://gateway-api.sigs.k8s.io/faq/>

とはいえ、Gateway APIがベータ版となったことで、今後サポートする製品はもっと増えてくると思います。
そうなってくると、IngressではなくGateway APIを採用する事例が増えてくることは間違いないかと思います。
今後もGateway APIの動向には注目です。

---
参照資料

- [Gateway API ドキュメント](https://gateway-api.sigs.k8s.io/)
- [Istioドキュメント - Gateway API](https://istio.io/latest/docs/tasks/traffic-management/ingress/gateway-api/)