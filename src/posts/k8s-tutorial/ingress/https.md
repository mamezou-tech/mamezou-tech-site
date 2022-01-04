---
title: Ingress - HTTPS通信(Cert Manager)
author: noboru-kudo
date: 2021-10-28
prevPage: ./src/posts/k8s-tutorial/ingress/external-dns.md
nextPage: ./src/posts/k8s-tutorial/storage/ebs.md
---

今回はIngressにTLS証明書をセットアップし、サンプルアプリに対してセキュアに通信できるようにしてみましょう。

ゼロトラストネットワークの考え方が普及し、今や開発・テスト環境でも通信のTLS化が当たり前の時代になりました(もちろん暗号化は通信だけではだめですが)。
そこで課題となるのが、暗号化で利用する証明書の管理です。証明書の有効期限切れによる通信障害のニュースもよく耳にします。

KubernetesのIngressは手動では証明書を作成・発行して登録することも可能ですが、前述の通り証明書の運用には課題があります。
そこで、今回はTLS証明書の発行やローテートを自動でやってくれる[Cert Manager](https://github.com/jetstack/cert-manager)を使ってHTTPS通信の環境を構築しましょう。

- 公式ドキュメント: <https://cert-manager.io/docs/>

AWS Load Balancer ControllerつまりALB(Application Load Balancer)をIngressとして利用する場合(詳細は[こちら](/containers/k8s/tutorial/ingress/ingress-nginx/)参照)は、[AWS Certificate Manager(ACM)](https://aws.amazon.com/jp/certificate-manager/)という証明書管理のマネージドサービスがありますのでこれを使う形になります（現時点でALBはACM以外の証明書を使う術はありません）[^1]。

[^1]: AWS Load Balancer ControllerでHTTPSを使う場合は[こちら](https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.2/guide/tasks/ssl_redirect/)が参考になります。

今回はNginxをIngressとして使うNGINX Ingress Controllerを使って、証明書の管理を自動化していきます。

Cert ManagerはCRD(Custom Resource Definitions)として提供されるIssuerとCertificateリソースを使って証明書の管理をしています。
- Issuer/ClusterIssuer
  Cert Managerが証明書の発行リクエストを行う証明書発行機関です。サポート対象の発行機関の種類は[こちら](https://cert-manager.io/docs/configuration/#supported-issuer-types)から確認できます。
- Certificate
  Issuerより発行された証明書リソース。Ingressリソースが定義されるとCert Managerが作成します。ここで有効期限の管理にも使われています。

今回は自己署名(いわゆるオレオレ証明書)と無料で証明書発行ができる[Let's Encrypt](https://letsencrypt.org/)を使ってIngressのHTTPS通信を実現してみましょう。
完成イメージは以下のようになります。

![](https://i.gyazo.com/fa39261af82bfefe43878d5f31e4b638.png)

[[TOC]]

## 事前準備
以下のいずれかの方法で事前にEKS環境を作成しておいてください。

- [AWS EKS(eksctl)](/containers/k8s/tutorial/infra/aws-eks-eksctl/)
- [AWS EKS(Terraform)](/containers/k8s/tutorial/infra/aws-eks-terraform/)

また、Cert Managerのインストールにk8sパッケージマネージャーの[helm](https://helm.sh/)を利用します。
未セットアップの場合は[こちら](https://helm.sh/docs/intro/install/) を参考にv3.3[^2]以降のバージョンをセットアップしてください。

[^2]: CRDバグの問題によりHelm v3.2以前の場合は個別にCRDをセットアップする必要があります。詳細は[こちら](https://cert-manager.io/docs/installation/helm/#option-1-installing-crds-with-kubectl)を参照してください。

EKS環境構築後はクラスタにIngress Controllerをインストールします。
今回はNGINX Ingress Controllerを使用します。以下手順で事前にセットアップしてください。

- [NGINX Ingress Controller](/containers/k8s/tutorial/ingress/ingress-nginx/)

また、Let's Encryptを利用する場合は証明書の発行にドメイン検証が必要なため、正規のドメインが必要となります。
以下の手順を実施して、ドメイン準備とDNSへのレコード登録を自動化するexternal-dnsのセットアップも実施してください。
本チュートリアルでは`mamezou-tech.com`（Route53で購入）のサブドメインを使用しますが、都度自分のドメインに置き換えてください。

なお、今回はAWS Load Balancer ControllerではなくNGINX Ingress Controllerを使用しますので、以下手順に記載されている事前準備のAWS Load Balancer Controllerのインストールはスキップして構いません。

- [カスタムドメイン管理(external-dns)](/containers/k8s/tutorial/ingress/external-dns/)

## Cert Managerインストール

それではクラスタ環境にCert Managerをインストールしましょう。今回はHelmを使いますが、他にも多くの方法があります。詳細なセットアップ方法は[こちら](https://cert-manager.io/docs/installation/)を参照しくてださい。
Cert ManagerのHelm Chartは[こちら](https://artifacthub.io/packages/helm/cert-manager/cert-manager)で確認できます。

まずはリポジトリの追加と最新化を行います。

```shell
helm repo add jetstack https://charts.jetstack.io
helm repo update
```

それでは以下でCert Managerをインストールしましょう(現時点で最新の`1.5.4`を使います)。

```shell
helm upgrade cert-manager jetstack/cert-manager \
  --install --version 1.5.4 \
  --namespace cert-manager --create-namespace \
  --set installCRDs=true \
  --wait
```

今回は`cert-manager`Namespace内にCert Managerをインストールするように指定しているだけのシンプルなものです。
また、`installCRDs`の設定でCRDのセットアップも合わせて行うようにしました[^3]。
その他の詳細なオプションは[こちら](https://artifacthub.io/packages/helm/cert-manager/cert-manager#configuration)で確認してください。

[^3]: Cert ManagerはAWSリソースへのアクセスが発生しないため、今までと異なりIAM Role等の作成は不要です。

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

上記のように様々なCRDが作成されていることが分かります。特にIssuerやCertificateは、Cert Managerを運用する上では重要なリソースとなります[^4]。

[^4]: これらを管理するkubectlの[プラグイン](https://cert-manager.io/docs/usage/kubectl-plugin/)も提供されていますので、管理者ロールの方はこちらも導入しておくとよいでしょう。


## 自己署名の証明書でHTTPS通信

Let's Encryptを使う前に、まずは自己署名の証明書でCert Managerの動きを確認しましょう。

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

次にIngressをデプロイしましょう。
今回はHTTPS通信になりますのでCert Managerを利用してTLS設定を有効化しましょう。
以下のYAMLファイル(ここでは`ingress-self-signing.yaml`としました)を作成します。

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-aws-ingress
  annotations:
    external-dns.alpha.kubernetes.io/hostname: k8s-tutorial.mamezou-tech.com
    # 自己署名の証明書Issuerを指定
    cert-manager.io/issuer: "selfsigning-issuer"
spec:
  ingressClassName: nginx
  # IngressのTLS設定
  tls:
    - hosts:
        - k8s-tutorial.mamezou-tech.com
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
`annotations`の`cert-manager.io/issuer`で利用するCert ManagerのIssuerとして先程作成した`selfsigning-issuer`を指定しています。
Cert Managerで`annotations`に指定可能なオプションは[こちら](https://cert-manager.io/docs/usage/ingress/#supported-annotations)に記載されていますので環境に応じて使い分けましょう。

最後に`spec.tls`フィールドを新たに追加し、TLS証明書を格納したSecretリソースを指定します。
この名前は任意で構いません。Cert Managerがこれに応じた自己署名の証明書をSecretリソースとして発行してくれます。

これをクラスタ環境に反映しましょう。

```shell
kubectl apply -f ingress-self-signing.yaml
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
Annotations:                     cert-manager.io/issuer: selfsigning-issuer
                                 external-dns.alpha.kubernetes.io/hostname: k8s-tutorial.mamezou-tech.com
Events:
  Type    Reason             Age                  From                      Message
  ----    ------             ----                 ----                      -------
  Normal  CreateCertificate  10m                  cert-manager              Successfully created Certificate "selfsigning-cert"
  Normal  Sync               9m27s (x2 over 10m)  nginx-ingress-controller  Scheduled for sync
  Normal  Sync               9m27s (x2 over 10m)  nginx-ingress-controller  Scheduled for sync
```

TLSやEventsの内容から正しくTLS証明書の設定が完了していることが分かります。
Cert Managerで管理する証明書はSecretリソースと同名のCertificateリソースで確認できます。こちらを見てみましょう。

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

証明書の現在の状態や有効期限を確認することができます。Cert Managerはこの情報をもとに証明書のローテートを自動で実施してくれます。
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

証明書の公開鍵(tls.crt)や秘密鍵(tls.key)が格納されている様子が分かります。Ingress(ここでの実態はNginx)はこの情報をもとに通信の暗号化・復号化を行う形になります。

最後にcurlを使ってHTTPS通信でサンプルアプリにアクセスしてみましょう。
今回は自己署名の証明書のため、証明書の検証をスキップする`-k`オプションを指定する必要があります。

```shell
curl -k https://k8s-tutorial.mamezou-tech.com/app1
curl -k https://k8s-tutorial.mamezou-tech.com/app2
```

```
app1-7ff67dc549-6gjk5: hello sample app!
app2-b6dc558b5-g9m99: hello sample app!
```

HTTP通信でサンプルアプリにアクセスできていることが分かります。DNS設定の反映には時間がかかりますので、名前解決に失敗する場合はしばらく待ってから試してみてください。

ちなみにですが、試しにHTTPでアクセスしてみると以下のようにHTTPSのURLにリダイレクトされます。

```shell
curl -k -v http://k8s-tutorial.mamezou-tech.com/app1
```

```
*   Trying 18.180.204.238...
* TCP_NODELAY set
* Connected to k8s-tutorial.mamezou-tech.com (18.180.204.238) port 80 (#0)
> GET /app1 HTTP/1.1
> Host: k8s-tutorial.mamezou-tech.com
> User-Agent: curl/7.64.1
> Accept: */*
> 
< HTTP/1.1 308 Permanent Redirect
< Date: Thu, 28 Oct 2021 02:04:47 GMT
< Content-Type: text/html
< Content-Length: 164
< Connection: keep-alive
< Location: https://k8s-tutorial.mamezou-tech.com/app1
< 
(省略)
```

これはNGINX Ingress Controllerのデフォルト仕様([公式ドキュメント](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/#server-side-https-enforcement-through-redirect))のためIngress Controllerの実装に何を使うかによって変わってきます。

## 正規の証明書でHTTPS通信

次に自己署名ではなく正規の証明書を使って動作確認をしてみましょう。
今回は証明書の発行を無料で実施できる[Let's Encrypt](https://letsencrypt.org/)を認証局[^5]として使用します。

[^5]: Let's Encryptは証明書の自動発行を行うACME(Automated Certificate Management Environment)プロトコルをサポートしており、個人レベルでも簡単に証明書を発行することが可能です。

Let's Encrypt用のIssuerリソースのYAMLファイルは以下のようになります。ここでは`lets-encrypt-issuer.yaml`として作成しました。

```yaml
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: letsencrypt-issuer
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: '<your-mail-address>'
    privateKeySecretRef:
      name: acme-client-letsencrypt
    solvers:
      - http01:
          ingress:
            class: nginx
```

上記はLet's Encryptを認証局として利用する設定になります。
`email`フィールドには自分のメールアドレスを設定してください。このアドレスがLet's Encryptに登録され、その後の証明書に関するLet's Encryptとのやりとりを行う形になります。
`acme-client-letsencrypt`で指定するSecretリソースはLet's Encryptとやりとりするための秘密鍵が保存されます（事前に作成する必要はありません）。

また、`solvers`フィールドのところに注目してください。Let's EncryptがサポートするACMEプロトコルでは、証明書発行前にドメインの所有者が自分自身であることを証明する必要があります(Challengeといいます)。
この方法として実際にHTTP通信して検証するHTTP-01と、DNSのTXTレコードで検証するDNS-01の2種類があります[^6]。
今回はDNS関連の作業なしで検証可能なHTTP-01を使ってドメイン所有を検証しましょう。
そのため、ここでは`http01`フィールドを追加して、HTTP検証時に利用するIngress ControllerのIngressClassを指定しています[^7]。

[^6]: Challenge Typeの詳細は[こちら](https://letsencrypt.org/docs/challenge-types/)を参照してください。
[^7]: DNS-01については[こちら](https://cert-manager.io/docs/configuration/acme/dns01/)を参照してください。

それでは、こちらをクラスタ環境に反映しましょう。

```shell
kubectl apply -f lets-encrypt-issuer.yaml
```

作成したIssuerリソースを確認してみましょう。

```shell
kubectl describe issuer letsencrypt-issuer
```

以下抜粋して表示します。

```
Name:         letsencrypt-issuer
Namespace:    default
API Version:  cert-manager.io/v1
Kind:         Issuer
Spec:
  Acme:
    Email:            xxxxxxxxxx@mamezou.com
    Preferred Chain:  
    Private Key Secret Ref:
      Name:  acme-client-letsencrypt
    Server:  https://acme-v02.api.letsencrypt.org/directory
    Solvers:
      http01:
        Ingress:
          Class:  nginx
Status:
  Acme:
    Last Registered Email:  xxxxxxxxx@mamezou.com
    Uri:                    https://acme-v02.api.letsencrypt.org/acme/acct/257864610
  Conditions:
    Last Transition Time:  2021-10-28T04:28:02Z
    Message:               The ACME account was registered with the ACME server
    Observed Generation:   1
    Reason:                ACMEAccountRegistered
    Status:                True
    Type:                  Ready
Events:                    <none>
```

Statusの部分を見るとACMEアカウントとしてLet's Encryptにメールアドレスが登録されていることが確認できます。
この時点では、Ingressリソースを作成していませんので証明書は発行されません。

それでは実際に証明書を発行してみましょう。
サンプルアプリについては自己署名のときに使用したものをそのまま使いますが、前回作成したIngressリソースについては削除しておきましょう。

```shell
kubectl delete -f ingress-self-signing.yaml
```

では、Let's Encryptに対応したIngressリソースのYAMLファイル(ここでは`lets-encrypt-issuer.yaml`としました)を作成しましょう。

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-aws-ingress
  annotations:
    external-dns.alpha.kubernetes.io/hostname: k8s-tutorial.mamezou-tech.com
    # Let's EncryptのIssuerを指定
    cert-manager.io/issuer: "letsencrypt-issuer"
spec:
  ingressClassName: nginx
  # IngressのTLS設定
  tls:
    - hosts:
        - k8s-tutorial.mamezou-tech.com
      secretName: letsencrypt-cert
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

先程の自己署名のときに作成したものとほとんど同じですが、`cert-manager.io/issuer`に指定するIssuerを先程Let's Encrypt向けに作成したものに変更しています。
また、証明書のSecretリソースは自己署名のものと区別するため、別の名前にしています。こちらも他のSecretと重複しない限り任意で構いません。

ではIngressリソースを作成しましょう。

```shell
kubectl apply -f ingress-lets-encrypt.yaml
```

今回も作成したIngressリソースを確認しましょう。

```shell
kubectl describe ing app-aws-ingress
```

```
Name:             app-aws-ingress
Namespace:        default
Address:          xxxxxxxxxxxxxxxxxxx-xxxxxxxxxxxxxxxx.elb.ap-northeast-1.amazonaws.com
Default backend:  default-http-backend:80 (<error: endpoints "default-http-backend" not found>)
TLS:
  letsencrypt-cert terminates k8s-tutorial.mamezou-tech.com
Rules:
  Host                           Path  Backends
  ----                           ----  --------
  k8s-tutorial.mamezou-tech.com  
                                 /app1   app1:80 (192.168.35.150:8080,192.168.64.249:8080)
                                 /app2   app2:80 (192.168.42.251:8080,192.168.94.91:8080)
Annotations:                     cert-manager.io/issuer: letsencrypt-issuer
                                 external-dns.alpha.kubernetes.io/hostname: k8s-tutorial.mamezou-tech.com
Events:
  Type    Reason             Age                   From                      Message
  ----    ------             ----                  ----                      -------
  Normal  CreateCertificate  2m38s                 cert-manager              Successfully created Certificate "letsencrypt-cert"
  Normal  Sync               110s (x2 over 2m39s)  nginx-ingress-controller  Scheduled for sync
  Normal  Sync               110s (x2 over 2m39s)  nginx-ingress-controller  Scheduled for sync
```

Eventsに注目すると、Cert Managerが`letsencrypt-cert`という証明書を作成していることが分かります。
実際に証明書が作成されるには、先程のLet's Encryptのドメイン所有者の検証(Challenge)をクリアする必要がありますのでタイムラグがあります[^8]。

[^8]: 初めてのドメインは場合は、external-dnsによって作成されたRoute53のDNSレコードが有効になるまで名前解決ができませんのでかなり待ちます。

内部ではCert Managerがドメイン所有者の検証するために一時的なエンドポイントを作成し、Let's Encryptに対して、証明書の発行要求を行うという動きをします。
k8sのイベントログを見ると次のようになっています。

```shell
kubectl get ev
```

```
19m         Normal    Sync                ingress/cm-acme-http-solver-b8jp6                              Scheduled for sync
19m         Normal    Sync                ingress/cm-acme-http-solver-b8jp6                              Scheduled for sync
19m         Normal    Scheduled           pod/cm-acme-http-solver-bv95g                                  Successfully assigned default/cm-acme-http-solver-bv95g to ip-192-168-46-142.ap-northeast-1.compute.internal
19m         Normal    Pulling             pod/cm-acme-http-solver-bv95g                                  Pulling image "quay.io/jetstack/cert-manager-acmesolver:v1.5.4"
18m         Normal    Pulled              pod/cm-acme-http-solver-bv95g                                  Successfully pulled image "quay.io/jetstack/cert-manager-acmesolver:v1.5.4" in 6.29418664s
18m         Normal    Created             pod/cm-acme-http-solver-bv95g                                  Created container acmesolver
18m         Normal    Started             pod/cm-acme-http-solver-bv95g                                  Started container acmesolver
18m         Normal    Killing             pod/cm-acme-http-solver-bv95g                                  Stopping container acmesolver
6m17s       Normal    Complete            order/letsencrypt-cert-lkpg9-182064821                         Order completed successfully
6m19s       Normal    cert-manager.io     certificaterequest/letsencrypt-cert-lkpg9                      Certificate request has been approved by cert-manager.io
6m19s       Normal    OrderCreated        certificaterequest/letsencrypt-cert-lkpg9                      Created Order resource default/letsencrypt-cert-lkpg9-182064821
6m19s       Normal    OrderPending        certificaterequest/letsencrypt-cert-lkpg9                      Waiting on certificate issuance from order default/letsencrypt-cert-lkpg9-182064821: ""
6m17s       Normal    CertificateIssued   certificaterequest/letsencrypt-cert-lkpg9                      Certificate fetched from issuer successfully
6m20s       Normal    Issuing             certificate/letsencrypt-cert                                   Issuing certificate as Secret does not exist
6m19s       Normal    Generated           certificate/letsencrypt-cert                                   Stored new private key in temporary Secret resource "letsencrypt-cert-frzt9"
6m19s       Normal    Requested           certificate/letsencrypt-cert                                   Created new CertificateRequest resource "letsencrypt-cert-lkpg9"
6m17s       Normal    Issuing             certificate/letsencrypt-cert                                   The certificate has been successfully issued
```

このようにCert Managerは証明書を発行するために、HTTP-01に対応するために専用のIngress/Pod作成(これらは一時的で成功すると削除されます)や、その後の証明書発行要求と証明書のSecretリソースへの保存といった、様々な処理をユーザーの代わりに実施してくれていることが分かります。
前回同様にCertificateリソースについても確認しましょう。

```shell
kubectl describe certificate letsencrypt-cert
```

以下抜粋になります。

```
Name:         letsencrypt-cert
Namespace:    default
API Version:  cert-manager.io/v1
Kind:         Certificate
Spec:
  Dns Names:
    k8s-tutorial.mamezou-tech.com
  Issuer Ref:
    Group:      cert-manager.io
    Kind:       Issuer
    Name:       letsencrypt-issuer
  Secret Name:  letsencrypt-cert
  Usages:
    digital signature
    key encipherment
Status:
  Conditions:
    Last Transition Time:  2021-10-28T05:18:52Z
    Message:               Certificate is up to date and has not expired
    Observed Generation:   1
    Reason:                Ready
    Status:                True
    Type:                  Ready
  Not After:               2022-01-26T04:18:50Z
  Not Before:              2021-10-28T04:18:51Z
  Renewal Time:            2021-12-27T04:18:50Z
  Revision:                1
Events:
  Type    Reason     Age   From          Message
  ----    ------     ----  ----          -------
  Normal  Issuing    23m   cert-manager  Issuing certificate as Secret does not exist
  Normal  Generated  23m   cert-manager  Stored new private key in temporary Secret resource "letsencrypt-cert-frzt9"
  Normal  Requested  23m   cert-manager  Created new CertificateRequest resource "letsencrypt-cert-lkpg9"
  Normal  Issuing    23m   cert-manager  The certificate has been successfully issued
```

こちらも自己署名同様に証明書の状態が確認できます。
自分で署名した前回と違い、今回は認証局に対して証明書の発行要求をしています。これはOrderリソースで確認できます。

```shell
kubectl get order
```
```
NAME                               STATE   AGE
letsencrypt-cert-lkpg9-182064821   valid   30m
```

長いのでここでは省略しますが、これを`kubectl describe order <order-name>`で見ると証明書発行要求の詳細を確認することができます。

また、ドメインの所有者検証の情報はChallengeリソースで確認できます。このリソースはLet's Encryptとのドメイン検証の都度作成され、成功すると削除されます。
証明書が発行されない場合はこのリソースの存在を確認し、存在する場合は失敗の原因を探ることができます(`kubectl describe challenge <challenge-name>`)。
例えば名前解決に失敗している場合は以下のような出力になります。

```
Name:         letsencrypt-cert-l5mlt-129283757-1181534344
Namespace:    default
API Version:  acme.cert-manager.io/v1
Kind:         Challenge
Spec:
  Authorization URL:  https://acme-v02.api.letsencrypt.org/acme/authz-v3/43990363140
  Dns Name:           k8s-tutorial2.mamezou-tech.com
  Solver:
    http01:
      Ingress:
        Class:  nginx
  Token:        xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  Type:         HTTP-01
  URL:          https://acme-v02.api.letsencrypt.org/acme/chall-v3/43990363140/0mMg8Q
  Wildcard:     false
Status:
  Presented:   true
  Processing:  true
  Reason:      Waiting for HTTP-01 challenge propagation: failed to perform self check GET request 'http://k8s-tutorial2.mamezou-tech.com/.well-known/acme-challenge/hkjOO6LYVrwvvPBzh9C6eA7kYUGNJxoNEGiJSYqPdUE': Get "http://k8s-tutorial2.mamezou-tech.com/.well-known/acme-challenge/hkjOO6LYVrwvvPBzh9C6eA7kYUGNJxoNEGiJSYqPdUE": dial tcp: lookup k8s-tutorial2.mamezou-tech.com on 172.20.0.10:53: no such host
  State:       pending
```

StatusのReasonでHTTP-01実施する上でのセルフチェックで名前解決に失敗している様子を確認できます(しばらく待つとDNSが伝播されてこの状態は解消されますが)。

最後に前回同様に証明書のSecretリソースを確認しましょう。

```shell
kubectl describe secret letsencrypt-cert
```

```
Name:         letsencrypt-cert
Namespace:    default

Type:  kubernetes.io/tls

Data
====
tls.crt:  5632 bytes
tls.key:  1679 bytes
```

証明書の公開鍵(tls.crt)や秘密鍵(tls.key)が格納されている様子が分かります。

それでは、curlを使ってHTTPS通信でサンプルアプリにアクセスしてみましょう。
今回は正規の証明書を使っているため、証明書の検証スキップ(`-k`オプション)は不要です。

```shell
curl https://k8s-tutorial.mamezou-tech.com/app1
curl https://k8s-tutorial.mamezou-tech.com/app2
```

```
app1-7ff67dc549-7tjkf: hello sample app!
app2-b6dc558b5-sf54z: hello sample app!
```

上記のように問題なくHTTPSで通信できているはずです。

## クリーンアップ

不要になったリソースを削除しましょう。

```shell
# app1/app2
kubectl delete -f app.yaml
# Ingress削除(Let's Encrypt未実施の場合はingress-self-issuer.yaml)
kubectl delete -f ingress-lets-encrypt.yaml
helm uninstall -n ingress-nginx ingress-nginx
helm uninstall -n external-dns external-dns
helm uninstall -n cert-manager cert-manager
```

最後にクラスタ環境を削除します。こちらは環境構築編のクリーンアップ手順を参照してください。
- [AWS EKS(eksctl)](/containers/k8s/tutorial/infra/aws-eks-eksctl#クリーンアップ)
- [AWS EKS(Terraform)](/containers/k8s/tutorial/infra/aws-eks-terraform#クリーンアップ)
