---
title: Ingress TLS証明書管理(Cert Manager)
author: noboru-kudo
---
今回はIngressにTLS証明書をセットアップにしてセキュアに通信できるようにしてみましょう。

ゼロトラストネットワークの考え方が普及し、今や開発・テスト環境でもTLS化が当たり前の時代になった。証明書の管理が面倒なのでできればやりたくないけど避けられなくなってきた。

KubernetesのIngressリソースは手動で証明書を作成・発行して登録することも可能だが、今回はTLS証明書の発行や更新を自動でやってくれるCert Managerを使う。

<https://github.com/jetstack/cert-manager>

Cert ManagerはCRDとして提供されるIssuerとCertificateリソースを使って証明書の管理をしている。
- Issuer
  - Cert Managerが証明書の発行リクエストを行う証明書発行機関。ClusterスコープのClusterIssuerリソースもある。
  - https://docs.cert-manager.io/en/latest/tasks/issuers/index.html#supported-issuer-types
- Certificate
  - 発行された証明書リソース。Ingressリソースが定義されるとCert Managerが作成する。有効期限の管理にも使われている。

今回の完成イメージはこんな感じ。
![](https://i.gyazo.com/fa39261af82bfefe43878d5f31e4b638.png)


環境としては自己署名の証明書を使ったローカル環境とLet's Encryptの証明書を使ったクラウド環境(AKS)を対象にする。

## Cert Managerインストール(自己署名・Let's Encrypt共通)

ローカルクラスタ環境にCert Managerをインストールする。Helmでやる方法もあるが今回は普通にマニフェストから入れる。
```shell
kubectl create namespace cert-manager
# WebHookが機能するようにValidationを無効化
kubectl label namespace cert-manager certmanager.k8s.io/disable-validation=true
# インストール(local)
kubectl apply -f https://github.com/jetstack/cert-manager/releases/download/v0.8.0/cert-manager.yaml
# Kubernetesが1.13未満の場合
kubectl apply -f https://github.com/jetstack/cert-manager/releases/download/v0.8.0/cert-manager.yaml --validate=false
```

何がインストールされたのかを見てみる。
```shell
kubectl get pod -n cert-manager
```

```
NAME                                      READY   STATUS    RESTARTS   AGE
cert-manager-54f645f7d6-bbtjx             1/1     Running   0          3m59s
cert-manager-cainjector-79b7fc64f-mn7st   1/1     Running   0          4m
cert-manager-webhook-6484955794-fxfkh     1/1     Running   0          4m
```

Cert Manager本体の他に証明書のInjectorとかWebHookが稼働している。この他にIssuerやCertificateのCRDリソースも作成されていた。

### Part1. 自己署名編

いわゆるオレオレ証明書。ローカル環境等のCAの利用が難しい場合に使う。

前提条件としてローカルクラスタ環境にNginxのIngress Controllerを導入済みとする。

#### 1. サンプルアプリデプロイ
サンプルアプリをデプロイする([Kubernetesハンズオン-Ingress Controller - Nginx]から流用)。
```shell
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/ingress/nginx/app1.yaml
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/ingress/nginx/app2.yaml
```

#### 2. 自己署名のIssuerリソース作成
自己署名用のIssuerリソースを作成する。内容はselfSignedを指定するだけでよい。

```yaml
apiVersion: certmanager.k8s.io/v1alpha1
kind: Issuer
metadata:
  name: selfsigning-issuer
spec:
  selfSigned: {}
```

```shell
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/cert-manager/issuer-self.yaml
```

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
# 念の為。これはリソースグループと共に消えると思う
helm delete --purge nginx-ingress
az aks delete --name aks-cluster --resource-group $RG --no-wait --yes
# グローバルIP
az network public-ip delete --name frieza-ip --resource-group $NODE_RG
# リソースグループ
az group delete --name k8sResourceGroup --yes --no-wait
```
