---
title: HTTPS通信(Cert Manager)
author: noboru-kudo
---

今回はIngressにTLS証明書をセットアップにしてHTTPSでセキュアに通信できるようにしてみましょう。

ゼロトラストネットワークの考え方が普及し、今や開発・テスト環境でも通信のTLS化が当たり前の時代になりました(もちろん暗号化は通信だけではだめですが)。
そこで課題となるのが、暗号化で利用する証明書の管理です。証明書を更新し忘れて有効期限切れによる通信障害が発生したというニュースもよく耳にしますね。

KubernetesのIngressは手動では証明書を作成・発行して登録することも可能ですが、前述の証明書の運用問題があります。
今回はTLS証明書の発行やローテートを自動でやってくれる[Cert Manager](https://github.com/jetstack/cert-manager)を使って実現しましょう[^1]。

- 公式ドキュメント: https://cert-manager.io/docs/

AWS Load Balancer ControllerつまりALB(Application Load Balancer)をIngressとして利用する場合は、AWSの[Certificate Manager](https://aws.amazon.com/jp/certificate-manager/)という証明書管理のマネージドサービスがありますのでこれを使う形になります（現時点でALBはACM以外の証明書を使う術はありません）[^2]。
[^2]: AWS Load Balancer ControllerでHTTPSを使う場合は[こちら](https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.2/guide/tasks/ssl_redirect/)が参考になります。

今回はNginxをIngressとして使うNGINX Ingress Controllerを使って、証明書の管理を自動化していきます。

Cert ManagerはCRD(Custom Resource Definitions)として提供されるIssuerとCertificateリソースを使って証明書の管理をしています。
- Issuer/ClusterIssuer
  Cert Managerが証明書の発行リクエストを行う証明書発行機関です。サポート対象の発行機関の種類は[こちら](https://cert-manager.io/docs/configuration/#supported-issuer-types)から確認できます。
- Certificate
  Issuerより発行された証明書リソース。Ingressリソースが定義されるとCert Managerが作成します。ここで有効期限の管理にも使われています。

今回は自己署名(いわゆるオレオレ証明書)と無料で証明書発行ができる[Let's Encrypt](https://letsencrypt.org/)を使ってIngressのHTTPS通信を実現してみましょう。
完成イメージは以下のようになります。

![](https://i.gyazo.com/fa39261af82bfefe43878d5f31e4b638.png)

## 事前準備
以下のいずれかの方法で事前にEKS環境を作成しておいてください。

- [AWS EKS(eksctl)](/containers/k8s/tutorial/infra/aws-eks-eksctl)
- [AWS EKS(Terraform)](/containers/k8s/tutorial/infra/aws-eks-terraform)

また、cert-managerのインストールにk8sパッケージマネージャーの[helm](https://helm.sh/)を利用します。
未セットアップの場合は[こちら](https://helm.sh/docs/intro/install/) を参考にv3.3[^3]以降のバージョンをセットアップしてください。

[^3]: CRDバグの問題によりHelm v3.2以前の場合は個別にCRDをセットアップする必要があります。詳細は[こちら](https://cert-manager.io/docs/installation/helm/#option-1-installing-crds-with-kubectl)を参照してください。

次にIngress Controllerをインストールします。
今回はAWS Load Balancer Controllerを使用します(未検証ですがNGINX Ingress Controllerにも対応可能なはずです)。以下手順でインストールしてください。

- [NGINX Ingress Controller](/containers/k8s/tutorial/ingress/ingress-nginx)

また、Let's Encryptを利用する場合は証明書の発行にドメイン検証が必要なため、正規のドメインが必要となります。
以下の手順を実施して、ドメイン準備とexternal-dnsのセットアップも実施してください(external-dnsは手動実施でも構いません)。
本チュートリアルでは`mamezou-tech.com`（Route53で購入）のサブドメインを使用しますが、都度自分のドメインに置き換えてください。

今回はAWS Load Balancer ControllerではなくNGINX Ingress Controllerを使用しますので、事前準備のAWS Load Balancer Controllerはスキップして構いません。

- [カスタムドメイン管理(external-dns)](/containers/k8s/tutorial/ingress/external-dns)

## Cert Managerインストール(自己署名・Let's Encrypt共通)

それではクラスタ環境にCert Managerをインストールしましょう。今回はHelmを使いますが、他にも多くの方法があります。詳細なセットアップ方法は[こちら](https://cert-manager.io/docs/installation/)を参照しくてださい。
cert-managerのHelm Chartは[こちら](https://artifacthub.io/packages/helm/cert-manager/cert-manager)で確認できます。

まずはリポジトリの追加と最新化を行います。

```shell
helm repo add jetstack https://charts.jetstack.io
helm repo update
```

それでは以下でcert-managerをインストールしましょう(現時点で最新の`1.5.4`を使います)。

```shell
helm upgrade cert-manager jetstack/cert-manager \
  --install --version 1.5.4 \
  --namespace cert-manager --create-namespace \
  --set installCRDs=true
```

今回は`cert-manager`Namespace内にcert-managerを指定しているだけのシンプルなものです。また、`installCRDs`の設定でCRDのセットアップも合わせて行うようにしました[^4]。
その他の詳細なオプションは[こちら](https://artifacthub.io/packages/helm/cert-manager/cert-manager#configuration)で確認してください。

[^4]: cert-managerはAWSリソースへのアクセスが発生しないため、今までと異なりIAM Role等の作成は不要です。

インストールされたものを確認してみましょう。

```shell
kubectl get deploy,svc,pod -n cert-manager
```

```
NAME                                      READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/cert-manager              1/1     1            1           4m21s
deployment.apps/cert-manager-cainjector   1/1     1            1           4m21s
deployment.apps/cert-manager-webhook      1/1     1            1           4m21s

NAME                           TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)    AGE
service/cert-manager           ClusterIP   10.100.84.146    <none>        9402/TCP   4m21s
service/cert-manager-webhook   ClusterIP   10.100.241.106   <none>        443/TCP    4m21s

NAME                                           READY   STATUS    RESTARTS   AGE
pod/cert-manager-74f46787b6-gs67b              1/1     Running   0          4m20s
pod/cert-manager-cainjector-748dc889c5-9rzmm   1/1     Running   0          4m20s
pod/cert-manager-webhook-995c5c5b6-5pn6j       1/1     Running   0          4m20s
```

Cert Manager本体の他にも、証明書のInjectorやWebHookが実行されていることが分かります。
この他にもIssuerやCertificateのCRD(Custom Resource Definitions)も作成されています。こちらも以下で確認可能です。

```shell
kubectl get crd -l app.kubernetes.io/name=cert-manager
```

```
NAME                                  CREATED AT
certificaterequests.cert-manager.io   2021-10-20T05:49:02Z
certificates.cert-manager.io          2021-10-20T05:49:02Z
challenges.acme.cert-manager.io       2021-10-20T05:49:02Z
clusterissuers.cert-manager.io        2021-10-20T05:49:02Z
issuers.cert-manager.io               2021-10-20T05:49:02Z
orders.acme.cert-manager.io           2021-10-20T05:49:02Z
```

上記のように様々なCRDが作成されていることが分かります。特にIssuerやCertificateは、cert-managerを運用する上では重要なリソースとなります[^5]。

[^5]: これらを管理するkubectlの[プラグイン](https://cert-manager.io/docs/usage/kubectl-plugin/)も提供されていますので、管理者ロールの方はこちらも導入しておくとよいでしょう。


## 自己署名の証明書を作成

Let's Encryptを使う前に、まずはcert-managerの動きを確認しましょう。

自己署名の場合は以下のIssuerリソース(CRD)のYAMLを作成します。ここでは`self-signing-issuer.yaml`というファイル名で作成しました。

```yaml
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: selfsigning-issuer
spec:
  selfSigned: {}
```

`spec`フィールドに`selfSigned`を定義し、値として空のブロック`{}`を指定するだけです。
このファイルをk8sに適用しましょう。

```shell
kubectl apply -f self-signing-issuer.yaml
```

作成したリソースの詳細を確認しましょう。

```shell
kubectl describe issuer selfsigning-issuer
```

以下出力内容の抜粋です。

```
Name:         selfsigning-issuer
Namespace:    default
API Version:  cert-manager.io/v1
Kind:         Issuer
Spec:
  Self Signed:
Status:
  Conditions:
    Last Transition Time:  2021-10-20T06:14:34Z
    Observed Generation:   1
    Reason:                IsReady
    Status:                True
    Type:                  Ready
Events:                    <none>
```

自己署名用のIssuerが作成されて準備完了していることが分かります。

実際にサンプルアプリをデプロイして確認しましょう。アプリは[こちら](/containers/k8s/tutorial/ingress/external-dns/#サンプルアプリのデプロイ)をそのまま使います。

```shell
kubectl apply -f app.yaml
```

次にIngressをデプロイしましょう。今回はHTTPS通信になりますので一部異なります。

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-aws-ingress
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    external-dns.alpha.kubernetes.io/hostname: k8s-tutorial.mamezou-tech.com
    # 自己署名の証明書Issuerを指定
    cert-manager.io/issuer: "selfsigning-issuer"
spec:
  ingressClassName: nginx
  # IngressのTLS設定
  tls:
    - hosts:
        - k8s-tutorial.mamezou-tech.com
      # 証明書のSecret名は任意。Cert Managerが作成してくれる
      secretName: selfsigning-cert
  rules:
    - host: k8s-tutorial.mamezou-tech.com
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
`annotations`の`cert-manager.io/issuer`で利用するcert-managerのIssuerとして先程作成した`selfsigning-issuer`を指定しています。
cert-managerで`annotations`に指定可能なオプションは[こちら](https://cert-manager.io/docs/usage/ingress/#supported-annotations)に記載されていますので環境に応じて使い分けましょう。

最後に`spec.tls`フィールドを新たに追加し、TLS証明書を格納したSecretリソースを指定します。
この名前は任意でよくcert-managerがこれに応じた自己署名の証明書をSecretリソースとして発行してくれます。

これをクラスタ環境に反映しましょう。

```shell
kubectl apply -f ingress.yaml
```

それではまずはIngressリソースを確認しましょう。

```shell
kubectl describe ing app-aws-ingress
```

```
Name:             app-aws-ingress
Namespace:        default
Address:          xxxxxxxxxxxxxxxxxxxxxx-xxxxxxxxxxxxx.elb.ap-northeast-1.amazonaws.com
Default backend:  default-http-backend:80 (<error: endpoints "default-http-backend" not found>)
TLS:
  selfsigning-cert terminates k8s-tutorial.mamezou-tech.com
Rules:
  Host                           Path  Backends
  ----                           ----  --------
  k8s-tutorial.mamezou-tech.com  
                                 /app1   app1:80 (192.168.59.71:8080,192.168.90.227:8080)
                                 /app2   app2:80 (192.168.44.74:8080,192.168.79.72:8080)
Annotations:                     alb.ingress.kubernetes.io/listen-ports: [{"HTTPS":443}]
                                 alb.ingress.kubernetes.io/scheme: internet-facing
                                 cert-manager.io/issuer: selfsigning-issuer
                                 external-dns.alpha.kubernetes.io/hostname: k8s-tutorial.mamezou-tech.com
Events:
  Type    Reason             Age                  From                      Message
  ----    ------             ----                 ----                      -------
  Normal  CreateCertificate  10m                  cert-manager              Successfully created Certificate "selfsigning-cert"
  Normal  Sync               9m27s (x2 over 10m)  nginx-ingress-controller  Scheduled for sync
  Normal  Sync               9m27s (x2 over 10m)  nginx-ingress-controller  Scheduled for sync
```

TLSやEventsの内容から正しくTLS証明書の設定が完了していることが分かります。
cert-managerで管理する証明書はCertificateリソースで確認できます。こちらを見てみましょう。

```shell
kubectl describe certificate selfsigning-cert
```
以下出力内容の抜粋になります。
```
Name:         selfsigning-cert
Namespace:    default
API Version:  cert-manager.io/v1
Kind:         Certificate
Spec:
  Dns Names:
    k8s-tutorial.mamezou-tech.com
  Issuer Ref:
    Group:      cert-manager.io
    Kind:       Issuer
    Name:       selfsigning-issuer
  Secret Name:  selfsigning-cert
  Usages:
    digital signature
    key encipherment
Status:
  Conditions:
    Last Transition Time:  2021-10-20T07:43:03Z
    Message:               Certificate is up to date and has not expired
    Observed Generation:   1
    Reason:                Ready
    Status:                True
    Type:                  Ready
  Not After:               2022-01-18T06:35:31Z
  Not Before:              2021-10-20T06:35:31Z
  Renewal Time:            2021-12-19T06:35:31Z
```

証明書の現在の状態や有効期限を確認することができます。cert-managerはこの情報をもとに証明書のローテートを自動で実施してくれます。
最後に証明書を確認しましょう。上記`Secret Name`の出力のとおり証明書は`selfsigning-cert`というSecretリソースに格納されています（これはIngressリソースで指定したものです）。
こちらも確認してみましょう。

```shell
kubectl describe secret selfsigning-cert
```

```
Name:         selfsigning-cert
Namespace:    default

Type:  kubernetes.io/tls

Data
====
ca.crt:   1046 bytes
tls.crt:  1046 bytes
tls.key:  1679 bytes
```

このように証明書の公開鍵や秘密鍵が格納されている様子が分かります。Ingressはこの情報をもとにトラフィックの暗号化を行う形になります。

最後にcurlでHTTPSでサンプリアプリにアクセスしてみましょう。
今回は自己署名の証明書のため`-k`オプションを指定する必要があります。

```shell
curl -k https://k8s-tutorial.mamezou-tech.com/app1
curl -k https://k8s-tutorial.mamezou-tech.com/app2
```

```
app1-7ff67dc549-6gjk5: hello sample app!
app2-b6dc558b5-g9m99: hello sample app!
```


TODO:以下修正


### Part1. 自己署名編


#### 2. 自己署名のIssuerリソース作成


#### 3. Ingressリソース作成
先程作成したIssuerとTLSの設定を指定したIngressリソースを作成する。
```yaml
kind: Ingress
apiVersion: networking.k8s.io/v1beta1
metadata:
  name: ingress
  annotations:
    kubernetes.io/ingress.class: "nginx"
    # 自己署名の証明書Issuerを指定
    certmanager.k8s.io/issuer: "selfsigning-issuer"
spec:
  # IngressのTLS設定
  tls:
  - hosts:
      - frieza.dev
    # 証明書のSecret名は任意でいい。Cert Managerが作成してくれる
    secretName: selfsigning-cert
  rules:
  - host: frieza.dev
    http:
      paths:
      - path: /app1
        backend:
          serviceName: app1
          servicePort: 3000
      - path: /app2
        backend:
          serviceName: app2
          servicePort: 3000
```

```shell
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/cert-manager/ingress-local.yaml
```

このIngressリソースの作成を検知するとCert Managerはドメインに紐付いた自己署名の証明書を発行し、`selfsigning-cert`というSecretを作成してくれる（opensslとかで自分で作ったりする必要はない）。

Ingressリソースの状態を見てみる。
```shell
kubectl describe ingress/ingress
```

```
Name:             ingress
Namespace:        default
Address:          
Default backend:  default-http-backend:80 (<none>)
TLS:
  selfsigning-cert terminates frieza.dev
Rules:
  (省略)
Events:
  Type    Reason             Age    From                      Message
  ----    ------             ----   ----                      -------
  Normal  CREATE             3m37s  nginx-ingress-controller  Ingress default/ingress
  Normal  CREATE             3m37s  nginx-ingress-controller  Ingress default/ingress
 [*  Normal  CreateCertificate  3m37s  cert-manager              Successfully created Certificate "selfsigning-cert"]
  Normal  UPDATE             3m32s  nginx-ingress-controller  Ingress default/ingress
  Normal  UPDATE             3m32s  nginx-ingress-controller  Ingress default/ingress
```
Cert ManagerがCertificateリソースを作成したEventが表示されている。

それではそのCertificateリソースの中身を見てみよう。
```shell
kubectl describe certificate selfsigning-cert
```

```
Name:         selfsigning-cert
 Namespace:    default
 Labels:       <none>
 Annotations:  <none>
 API Version:  certmanager.k8s.io/v1alpha1
 Kind:         Certificate
 (省略)
 Spec:
   Dns Names:
     frieza.dev
   Issuer Ref:
     Kind:       Issuer
     Name:       [* selfsigning-issuer]
   Secret Name:  [* selfsigning-cert]
 Status:
   Conditions:
     Last Transition Time:  2019-06-15T03:54:41Z
     Message:               Certificate is up to date and has not expired
     Reason:                Ready
     Status:                True
     Type:                  Ready
   Not After:               2019-09-13T03:54:41Z
 Events:
   Type    Reason      Age    From          Message
   ----    ------      ----   ----          -------
   Normal  CertIssued  6m51s  cert-manager  Certificate issued successfully
```

証明書の状態がここで管理されているのが分かる（有効期限が切れると自動更新してくれる）。
Issuerとして先程作成した selfsigning-issuerと、実際の証明書が格納されたSecretリソース(selfsigning-cert)が紐付いているのが分かる。

最後に実際の証明書データであるSecretリソースの中身も見てみる。
```shell
kubectl describe secret selfsigning-cert
```

```
Name:         selfsigning-cert
Namespace:    default
Labels:       certmanager.k8s.io/certificate-name=selfsigning-cert
Annotations:  certmanager.k8s.io/alt-names: frieza.dev
              certmanager.k8s.io/common-name: frieza.dev
              certmanager.k8s.io/ip-sans:
              certmanager.k8s.io/issuer-kind: Issuer
              certmanager.k8s.io/issuer-name: selfsigning-issuer
Type:  kubernetes.io/tls
Data
====
ca.crt:   1135 bytes
tls.crt:  1135 bytes
tls.key:  1675 bytes
```

ca.crt(CA証明書), tls.crt(公開鍵), tls.key(秘密鍵)が格納されている。Ingress ControllerのNginxはこれを使ってhttps通信を実現している。

#### 4. 動作確認
実際にHTTPSでアプリにアクセスしてみる。
/etc/hostsにドメイン(frieza.dev)とLBのIPを静的に紐付けしている。

```shell
# 自己署名なので-kオプションが必要
curl -k https://frieza.dev/app1; echo
```
```
[app1:10.244.1.8]私の戦闘力は530000です…ですが、もちろんフルパワーであなたと戦う気はありませんからご心配なく…
```
```shell
curl -k https://frieza.dev/app2; echo
```
```
[app2:10.244.1.9]ずいぶんムダな努力をするんですね・・・そんなことがわたしに通用するわけがないでしょう！
```
問題なさそう。試しにHTTPでアクセスしてみると以下のようにHTTPSのURLにリダイレクトされる。
```shell
curl -v http://frieza.dev/app2; echo
```
```
*   Trying 172.16.20.11...
* TCP_NODELAY set
* Connected to frieza.dev (172.16.20.11) port 80 (#0)
> GET /app2 HTTP/1.1
> Host: frieza.dev
> User-Agent: curl/7.54.0
> Accept: */*
>
< HTTP/1.1 [* 308 Permanent Redirect]
< Server: nginx/1.15.10
< Date: Sat, 15 Jun 2019 04:11:40 GMT
< Content-Type: text/html
< Content-Length: 172
< Connection: keep-alive
< [* Location: https://frieza.dev/app2]
(省略)
```


### Part2. Let's Encrypt編

自己署名ではなくちゃんとした正規の証明書を使う。
証明書の発行を無料でやってくれる[Let's Encrypt]を認証局として使う。

前提として環境はAKS上でクラスタ環境が構築されているものとする。

GKEはNativeでLet's Encryptサポートしている  
<https://cloud.google.com/kubernetes-engine/docs/how-to/managed-certs>
Cert Managerからやったらできなくてhttp01だとGCEのLBが作成されなくて断念。最近GoogleのIngressは仕様が変わったらしい(バグっぽい気もするけど、まぁNativeサポート使うほうがいいでしょ)

#### 1. ドメイン取得
TLS証明書を取得するにはドメインが必要なので確保しておく。
ここでは`frieza.dev`ドメインをGoogle Domainsで取得した（年間1512円だった）。

<https://domains.google/#/>

#### 2. グローバルIP取得
ドメイン用にIPアドレスを予約する。AKSなのでAzureのPublic IPを取得する。
```shell
# AKSのNodeGroupのResourceGroupに対して割当てる必要があった（そうしないとAKSクラスタ内からアクセスできずずっとPending状態になった）
RG=k8sResourceGroup
NODE_RG=$(az aks list --resource-group $RG --query '[0].nodeResourceGroup' -o tsv)
az network public-ip create --name frieza-ip --resource-group $NODE_RG --allocation-method Static --sku Basic
```
```
 {
   "publicIp": {
   (省略)
     [* "ipAddress": "13.78.10.155"],
     "ipConfiguration": null,
     "ipTags": [],
     "location": "japaneast",
     "name": "frieza-ip",
     "provisioningState": "Succeeded",
     "publicIpAddressVersion": "IPv4",
     "publicIpAllocationMethod": "Static",
     (省略)
   }
 }
```
13.78.10.155がPublic IPとしてリザーブされた。

#### 3. DNSサーバ登録
取得したドメインをDNSサーバに登録する。
Google DomainsのUIでサブドメイン`cloud.frieza.dev`をリザーブしたIP(13.78.10.155)に紐付けする(カスタムリソースレコード)。
![](https://i.gyazo.com/f509291ec7b606cc021dfcdd28a749f3.png)

DNSが機能しているかを確認する。反映までにはしばらく時間がかかる。
```shell
dig cloud.frieza.dev
```
```
 ; <<>> DiG 9.10.6 <<>> cloud.frieza.dev
 ;; global options: +cmd
 ;; Got answer:
 ;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 63296
 ;; flags: qr rd ra; QUERY: 1, ANSWER: 2, AUTHORITY: 4, ADDITIONAL: 9

 ;; OPT PSEUDOSECTION:
 ; EDNS: version: 0, flags:; udp: 4096
 ;; QUESTION SECTION:
 ;cloud.frieza.dev.              IN      A

 ;; ANSWER SECTION:
 [* cloud.frieza.dev.       300     IN      CNAME   frieza.dev.]
 [* frieza.dev.             300     IN      A       13.78.10.155]
```
AレコードとCNAMEレコードがちゃんと返ってきてる。大丈夫そう。

#### 4. サンプルアプリデプロイ
自己署名と同じようにサンプルアプリをデプロイする。
```shell
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/ingress/nginx/app1.yaml
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/ingress/nginx/app2.yaml
```

#### 5. Let's EncryptのIssuerリソース作成
Let's Encrypt用のIssuerリソースを作成する。

```yaml
apiVersion: certmanager.k8s.io/v1alpha1
kind: Issuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
  # Let's Encryptの証明書発行URL(練習用なのでTrustedではない)
  server: https://acme-staging-v02.api.letsencrypt.org/directory
  # こっちが本番向け(Trustedな証明書)
  #server: https://acme-v02.api.letsencrypt.org/directory
  # Let's Encryptに登録するアドレス(環境変数で置換してね)
  email: ''
  # Let's Encryptへのアクセス用のクレデンシャル(Cert Managerが自動生成する)
  privateKeySecretRef:
  name: acme-client-letsencrypt-staging
  # HTTP-01 challenge(証明書発行するためにはそのドメインを所有しているという証明が必要)
  # https://letsencrypt.org/docs/challenge-types/
  # Cert ManagerがLet's EncryptのTokenValidation要求に応えてくれる
  http01: {}
```
```shell
export EMAIL=your-mail@mamezou.com
curl -sSL https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/cert-manager/issuer-letsencrypt.yaml | \
sed -e "s/email: ''/email: $EMAIL/g" | \
  kubectl apply -f-
```

#### 6. Nginx Ingress Controller作成
HelmでNginxのIngress Controllerをインストールする。LoadBalancerのIPにリザーブしたものを指定する。
```shell
helm upgrade nginx-ingress --install stable/nginx-ingress \
--set controller.service.loadBalancerIP="13.78.10.155" \
--set nodeSelector."beta.kubernetes.io/os"=linux
```
AzureがIPアドレスをNginxに反映してくれるまでは少し待ちましょう（3分くらい）。
```shell
kubectl get svc -l app=nginx-ingress
```
```
NAME                            TYPE           CLUSTER-IP    EXTERNAL-IP    PORT(S)                      AGE
nginx-ingress-controller        LoadBalancer   10.0.66.254   [* 13.78.10.155 ]  80:31568/TCP,443:32535/TCP   2m57s
nginx-ingress-default-backend   ClusterIP      10.0.60.173   <none>         80/TCP                       2m56s
```
グローバルIPがIngress Controllerに割り当てられた(EXTERNAL-IP)。

#### 7. Ingressリソース作成
Let's EncryptのIssuerを指定したIngressリソースを投入する。
```yaml
kind: Ingress
apiVersion: extensions/v1beta1
metadata:
  name: ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    # Let's Encrypt Issuer
    certmanager.k8s.io/issuer: "letsencrypt-staging"
    certmanager.k8s.io/acme-challenge-type: http01
spec:
  # IngressのTLS設定
  tls:
  - hosts:
    - "cloud.frieza.dev"
    secretName: letsencrypt-staging
  rules:
  - host: cloud.frieza.dev
    http:
      paths:
      - path: /app1
        backend:
          serviceName: app1
          servicePort: 3000
      - path: /app2
        backend:
          serviceName: app2
          servicePort: 3000
```

```shell
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/cert-manager/ingress-aks.yaml
```

Ingressリソースの状態を見てみる。
```shell
kubectl describe ingress/ingress
```
```
Name:             ingress
Namespace:        default
Address:          
Default backend:  default-http-backend:80 (<none>)
TLS:
  letsencrypt-staging terminates cloud.frieza.dev
Rules:
  Host              Path  Backends
  ----              ----  --------
  cloud.frieza.dev  
                    /app1   app1:3000 (10.244.0.7:3000,10.244.1.9:3000)
                    /app2   app2:3000 (10.244.0.8:3000,10.244.1.10:3000)
Annotations:
  kubernetes.io/ingress.class:                       nginx
  certmanager.k8s.io/acme-challenge-type:            http01
  certmanager.k8s.io/issuer:                         letsencrypt-staging
Events:
  Type    Reason             Age   From                      Message
  ----    ------             ----  ----                      -------
  Normal  CREATE             64s   nginx-ingress-controller  Ingress default/ingress
  [* Normal  CreateCertificate  64s   cert-manager              Successfully created Certificate "letsencrypt-staging"]
  Normal  UPDATE             20s   nginx-ingress-controller  Ingress default/ingress
```
Cert ManagerがLet's EncryptのCertificateリソースを作成したEventが表示されている。

Certificateリソースの中身を見てみる。
```shell
kubectl describe certificate letsencrypt-staging
```
```
Name:         letsencrypt-staging
Namespace:    default
API Version:  certmanager.k8s.io/v1alpha1
Kind:         Certificate
Spec:
  Acme:
    Config:
      Domains:
        cloud.frieza.dev
      Http 01:
        Ingress Class:  nginx
  Dns Names:
    cloud.frieza.dev
  Issuer Ref:
    Kind:       Issuer
    Name:       letsencrypt-staging
  Secret Name:  letsencrypt-staging
Status:
  Conditions:
    Last Transition Time:  2019-06-16T06:53:55Z
    Message:               Certificate is up to date and has not expired
    Reason:                Ready
    Status:                True
    Type:                  Ready
  Not After:               2019-09-14T05:53:55Z
Events:
  Type    Reason         Age   From          Message
  ----    ------         ----  ----          -------
  [* Normal  OrderCreated   85s   cert-manager  Created Order resource "letsencrypt-staging-1592929329"]
  [* Normal  OrderComplete  58s   cert-manager  Order "letsencrypt-staging-1592929329" completed successfully]
  Normal  CertIssued     58s   cert-manager  Certificate issued successfully
```
自己署名の証明書同様に証明書の状態がここで管理されている。
Eventsを見てみると何やらOrderリソースというのが生成されていることが分かる。

これについて調べてみる。

Let's Encryptはドメインの所有者確認チェックをしてから証明書を発行する(Domain認証)。
<https://letsencrypt.org/docs/challenge-types/>

今回はIssuerリソースでhttp01というChallengeを指定したので、Let's Encryptから送信されるトークンリクエストに応えなければならない(cloud.frieza.devは自分が所有してますよという証明)が、Cert Managerはそれについても自動でやってくれる。
このプロセスはOrderとChallengeというCRDリソースで管理されている。

- Order

認証局への証明書発行・更新の状態を管理している。
```shell
kubectl describe order
```

```
Name:         letsencrypt-staging-1592929329                                                                                                                                                                                                  
Namespace:    default                                                                                                                                                                                                                         
Labels:       acme.cert-manager.io/certificate-name=letsencrypt-staging                                                                                                                                                                       
Annotations:  <none>                                                                                                                                                                                                                          
API Version:  certmanager.k8s.io/v1alpha1                                                                                                                                                                                                     
Kind:         Order                                                                                                                                                                                                                           
Spec:
  Config:
    Domains:
      cloud.frieza.dev
    Http 01:
      Ingress Class:  nginx
  Csr:                xxxxxx
  Dns Names:
    cloud.frieza.dev
  Issuer Ref:
    Kind:  Issuer
    Name:  letsencrypt-staging
Status:
  Certificate: XXXXX
    Name:      letsencrypt-staging
    Key:         XXXXX
    Token:       XXXXXX
    Type:        http-01
    URL:         https://acme-staging-v02.api.letsencrypt.org/acme/challenge/v2/124677/token-xxxxxx
    Wildcard:    false                  
  Finalize URL:  https://acme-staging-v02.api.letsencrypt.org/acme/finalize/9621128/37570440
  State:         valid
  URL:           https://acme-staging-v02.api.letsencrypt.org/acme/order/9621128/37570440
Events:                                                                                                                
  Type    Reason      Age    From          Message
  ----    ------      ----   ----          -------
  Normal  Created     7m13s  cert-manager  [* Created Challenge resource "letsencrypt-staging-1592929329-0" for domain "cloud.frieza.dev"]
  Normal  OrderValid  6m47s  cert-manager  [* Order completed successfully]
```

- Challenge

Orderリソースが証明書の発行・要求リクエストを行うときにChallengeというリソースを生成して、ドメイン認証のライフサイクルを管理している。
Challengeはリクエストの都度生成され、成功すると削除される。失敗したときはまずはここを見ると原因が分かる。
Cert Managerが偉いのは内部的に認証局のリクエストが通るかどうかを確かめてからLet's Encryptに正式に証明書の発行を要求している(繰り返し実行するとLet's EncryptのRateLimitに引っ掛かるので)。

```shell
kubectl describe challenge
```
```
Name:         letsencrypt-staging-1592929329-0
Namespace:    default
API Version:  certmanager.k8s.io/v1alpha1
Kind:         Challenge
Spec:
  Authz URL:  https://acme-staging-v02.api.letsencrypt.org/acme/authz/v2/126005
  Config:
    Http 01:
      Ingress Class:  nginx
  Dns Name:           cloud.frieza.dev
  Issuer Ref:
    Kind:    Issuer
    Name:    letsencrypt-staging
  Key:       xxxxxxx
  Token:     xxxxxxxx
  Type:      http-01
  URL:       https://acme-staging-v02.api.letsencrypt.org/acme/challenge/v2/126005/1T2Iyg==
  Wildcard:  false
Status:
  Presented:   false
  Processing:  false
  Reason:      Successfully authorized domain
  State:       valid
Events:
  Type    Reason          Age   From          Message
  ----    ------          ----  ----          -------
  Normal  Started         24s   cert-manager  Challenge scheduled for processing
  [*  Normal  Presented       23s   cert-manager  Presented challenge using http-01 challenge mechanism]
  [* Normal  DomainVerified  1s    cert-manager  Domain "cloud.frieza.dev" verified with "http-01" validation]
```

最後に実際の証明書データであるSecretリソースの中身も見てみる。
```shell
kubectl describe secret letsencrypt-staging
```

```
Name:         letsencrypt-staging
Namespace:    default
Labels:       certmanager.k8s.io/certificate-name=letsencrypt-staging
Annotations:  certmanager.k8s.io/alt-names: cloud.frieza.dev
              certmanager.k8s.io/common-name: cloud.frieza.dev
              certmanager.k8s.io/ip-sans:
              certmanager.k8s.io/issuer-kind: Issuer
              certmanager.k8s.io/issuer-name: letsencrypt-staging
Type:  kubernetes.io/tls
Data
====
tls.key:  1675 bytes
ca.crt:   0 bytes
tls.crt:  3553 bytes
```
自己署名と同じようにキーペアが格納されている。

#### 7. 動作確認
最後に実際にHTTPSリクエストで動作確認する。
```shell
# Staging環境向けの証明書なので-kオプションが必要
curl -k https://cloud.frieza.dev/app1; echo
```
```
> [app1:10.244.1.8]私の戦闘力は530000です…ですが、もちろんフルパワーであなたと戦う気はありませんからご心配なく…
```

Let's EncryptのIssuerで練習用(staging)でなくて、正規のURL(`https://acme-v02.api.letsencrypt.org/directory`)に変更してTLS接続部分を詳しく見てみる。
```shell
curl -v https://cloud.frieza.dev/app1
```

```
*   Trying 13.78.10.155...
* TCP_NODELAY set
* Connected to cloud.frieza.dev (13.78.10.155) port 443 (#0)
* ALPN, offering h2
* ALPN, offering http/1.1
* Cipher selection: ALL:!EXPORT:!EXPORT40:!EXPORT56:!aNULL:!LOW:!RC4:@STRENGTH
* successfully set certificate verify locations:
*   CAfile: /etc/ssl/cert.pem
    >   CApath: none
* TLSv1.2 (OUT), TLS handshake, Client hello (1):
* TLSv1.2 (IN), TLS handshake, Server hello (2):
* TLSv1.2 (IN), TLS handshake, Certificate (11):
* TLSv1.2 (IN), TLS handshake, Server key exchange (12):
* TLSv1.2 (IN), TLS handshake, Server finished (14):
* TLSv1.2 (OUT), TLS handshake, Client key exchange (16):
* TLSv1.2 (OUT), TLS change cipher, Client hello (1):
* TLSv1.2 (OUT), TLS handshake, Finished (20):
* TLSv1.2 (IN), TLS change cipher, Client hello (1):
* TLSv1.2 (IN), TLS handshake, Finished (20):
* SSL connection using TLSv1.2 / ECDHE-RSA-AES256-GCM-SHA384
* ALPN, server accepted to use h2
* [** Server certificate:]
*  [** subject: CN=cloud.frieza.dev]
*  [** start date: Jun 16 06:50:56 2019 GMT]
*  [** expire date: Sep 14 06:50:56 2019 GMT]
*  [** subjectAltName: host "cloud.frieza.dev" matched cert's "cloud.frieza.dev"]
*  [** issuer: C=US; O=Let's Encrypt; CN=Let's Encrypt Authority X3]
*  [** SSL certificate verify ok].
* Using HTTP2, server supports multi-use
* Connection state changed (HTTP/2 confirmed)
* Copying HTTP/2 data in stream buffer to connection buffer after upgrade: len=0
* Using Stream ID: 1 (easy handle 0x7fcc6e806c00)
> GET /app1 HTTP/2
> Host: cloud.frieza.dev
> User-Agent: curl/7.54.0
> Accept: */*
>
(以降省略)
```
ちゃんと証明書の検証がクリアできている。これで安心して使えるね！

#### 8. クリーンアップ
有償なので終わったらきれいにして費用を抑える。

```shell
kubectl delete -f app.yaml
kubectl delete -f ingress.yaml
helm uninstall cert-manager -n cert-manager
helm uninstall external-dns -n external-dns
helm uninstall ingress-nginx -n ingress-nginx
```
