---
title: Ingress - カスタムドメイン管理(external-dns)
author: noboru-kudo
date: 2021-10-17
prevPage: ./src/posts/k8s-tutorial/ingress/ingress-aws.md
nextPage: ./src/posts/k8s-tutorial/ingress/https.md
---

前回まではアプリケーションにアクセスする際にはIngressに登録したホスト名をHostヘッダを直接指定することでDNSで名前解決がされた体で確認していました。
当然ですが、実運用でこのようなことをすることはなく、DNSサーバにIngressとのマッピングを追加する必要があります。
もちろん手動でDNSサーバにレコードを追加して実現することはできますが、Ingressにホストを追加する度に別途DNSで作業する必要が出てきますし、DNSは設定ミスがあるとその被害は大きくなるのが通例です(それ故にネットワーク管理者のみがアクセス可能な組織も多いでしょう)。

今回はこれを自動化してしまいましょう。
このためのツールとしてKubernetesコミュニティ(Special Interest Groups:SIGs)で開発・運用されているexternal-dnsを利用します。

- 公式サイト: <https://github.com/kubernetes-sigs/external-dns>

Alphaステータスのものが多いですが、対応するDNSプロバイダとしては[こちら](https://github.com/kubernetes-sigs/external-dns#status-of-providers)で確認できるように様々なものがあります。
今回はAWSのDNSサービスである[Route53](https://aws.amazon.com/jp/route53/)を使用します。

また、今回は前提としてカスタムドメインを事前に用意する必要があります。
自分のドメインを持っていない場合は任意のものを準備してください。安いものであれば年間数百円で購入可能です。
本チュートリアルはAWSで実施するのでRoute53での取得をオススメしますが、以下のようなドメインレジストラでも構いません(動作は未検証です)。
- [お名前.com](https://www.onamae.com/)
- [Google Domains](https://domains.google/)
- [Star Domain](https://www.star-domain.jp/)

Route53でのドメイン取得については[こちら](https://docs.aws.amazon.com/ja_jp/Route53/latest/DeveloperGuide/domain-register.html)の公式ドキュメントを参照してください。
ここでは本サイト同様に`mamezou-tech.com`（Route53で購入）のサブドメインを使用します。

[[TOC]]

## 事前準備
以下のいずれかの方法で事前にEKS環境を作成しておいてください。

- [AWS EKS(eksctl)](/containers/k8s/tutorial/infra/aws-eks-eksctl/)
- [AWS EKS(Terraform)](/containers/k8s/tutorial/infra/aws-eks-terraform/)

また、external-dnsのインストールにk8sパッケージマネージャーの[helm](https://helm.sh/)を利用します。未セットアップの場合は[こちら](https://helm.sh/docs/intro/install/) を参考にv3以降のバージョンをセットアップしてください。

次にIngress Controllerをインストールします。
以下のいずれかをインストールしてください(以降はAWS Load Balancer Controllerをインストールしたものとして記載していますがIngressClassNameの指定以外は変わりません)。

- [AWS Load Balancer Controller](/containers/k8s/tutorial/ingress/ingress-aws/)
- [NGINX Ingress Controller](/containers/k8s/tutorial/ingress/ingress-nginx/)

## external-dnsのアクセス許可設定
external-dnsがRoute53に対してレコード操作ができるようにIAM PolicyとIAM Roleを作成します。
必要なアクセス許可は以下に記載されています。
<https://github.com/kubernetes-sigs/external-dns/blob/master/docs/tutorials/aws.md#iam-policy>
ここでは上記をJSONファイル(`external-dns-policy.json`)として保存して利用します。

### eksctl
環境構築にeksctlを利用している場合は[Ingress Controllerセットアップ](/containers/k8s/tutorial/ingress/ingress-aws#eksctl)同様にeksctlのサブコマンドを利用します。
今回もIRSAを利用しますので、EKSのOIDCは有効化しておいてください(`eksctl utils associate-iam-oidc-provider`)。

まずはexternal-dnsで使用するカスタムポリシーを作成します。
以下のコマンドで先程作成したIAM PolicyのJSONファイルを引数として作成しましょう(マネジメントコンソールから作成しても構いません)。

```shell
aws iam create-policy \
    --policy-name ExternalDNSRecordSetChange \
    --policy-document file://external-dns-policy.json
```

次に作成したポリシーに対応するIAM Role/k8s ServiceAccountを作成します。
これについてはeksctlのサブコマンドで作成します。
```shell
eksctl create iamserviceaccount \
  --cluster=mz-k8s \
  --namespace=external-dns \
  --name=external-dns \
  --attach-policy-arn=arn:aws:iam::xxxxxxxxxxxx:policy/ExternalDNSRecordSetChange \
  --approve
```

これを実行するとeksctlがCloudFormationスタックを実行し、AWS上にIAM Role、k8s上に対応するServiceAccountが作成されます。
こちらについてもマネジメントコンソールで確認してみましょう。

- CloudFormation
  ![](https://i.gyazo.com/b4352477e391fef4ef73aed134e2e93e.png)
- IAM Role
  ![](https://i.gyazo.com/a8b15ff17ed076f113fe83df2b14def7.png)

ServiceAccountについてはkubectlで確認します[^1]。

[^1]: Namespaceについては存在しない場合はeksctlが作成してくれます。

```shell
kubectl get sa external-dns -n external-dns -o yaml
```

```yaml
# 必要部分のみ抜粋・整形
apiVersion: v1
kind: ServiceAccount
metadata:
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::xxxxxxxxxxxx:role/eksctl-mz-k8s-addon-iamserviceaccount-extern-Role1-2P413LKUVE98
  labels:
    app.kubernetes.io/managed-by: eksctl
  name: external-dns
  namespace: external-dns
secrets:
  - name: external-dns-token-4f7s4
```

`annotations`に上記IAM RoleのARNが指定されていることが分かります。

### Terraform
環境構築にTerraformを利用している場合は、`main.tf`に以下の定義を追加してください。

```hcl
resource "aws_iam_policy" "external_dns" {
  name = "ExternalDNSRecordSetChange"
  policy = file("${path.module}/external-dns-policy.json")
}

resource "kubernetes_namespace" "external_dns" {
  metadata {
    name = "external-dns"
  }
}

module "external_dns" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-assumable-role-with-oidc"
  version = "~> 4.0"
  create_role                   = true
  role_name                     = "EKSExternalDNS"
  provider_url                  = replace(module.eks.cluster_oidc_issuer_url, "https://", "")
  role_policy_arns              = [aws_iam_policy.external_dns.arn]
  oidc_fully_qualified_subjects = ["system:serviceaccount:${kubernetes_namespace.external_dns.metadata[0].name}:external-dns"]
}

resource "kubernetes_service_account" "external_dns" {
  metadata {
    name = "external-dns"
    namespace = kubernetes_namespace.external_dns.metadata[0].name
    annotations = {
      "eks.amazonaws.com/role-arn" = module.external_dns.iam_role_arn
    }
  }
}
```
以下のことをしています。

- JSONファイルよりIAM Policyを作成し、external-dnsがRoute53の更新をできるようにカスタムポリシーを作成
- k8s上に`external-dns`というNamespaceを作成
- external-dnsが利用するIAM Roleを作成（EKSのOIDCプロバイダ経由でk8sのServiceAccountが引受可能）し、上記カスタムポリシーを指定
- k8s上にServiceAccountを作成して上記IAM Roleと紐付け


これをAWS/k8sクラスタ環境に適用します。
```shell
# module初期化
terraform init
# 追加内容チェック
terraform plan
# AWS/EKSに変更適用
terraform apply
```

反映が完了したらマネジメントコンソールで確認してみましょう。
IAM Role/Policyは以下のようになります。
![](https://i.gyazo.com/dad27d3aaba7475c75a6b52e3210a81c.png)

IAM Role/Policyが問題なく作成されています。

次にk8sのServiceAccountは以下のように確認できます。

```shell
kubectl get sa external-dns -n external-dns -o yaml
```

```yaml
# 必要部分のみ抜粋・整形
apiVersion: v1
automountServiceAccountToken: true
kind: ServiceAccount
metadata:
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::xxxxxxxxxxxx:role/EKSExternalDNS
  name: external-dns
  namespace: external-dns
secrets:
- name: external-dns-token-nt5fl
```

指定したIAM RoleでServiceAccountリソースがNamespace`external-dns`に作成されていることが確認できます。

## DNSホストゾーンの登録

external-dnsの管理範囲とするホストゾーンをRoute53に事前に登録します。

Route53で購入した場合は、既にそのドメインでホストゾーンが作成されていますので、新たに作成する必要はありません[^2]。この手順はスキップ可能です。
[^2]: とはいえ複数のAWSアカウントで管理する環境ですと環境ごとにサブドメインでホストゾーンを作成し、親ドメイン側（マスターアカウント）はサブドメイン側のホストゾーンに移譲する方法がよく使われると思います。

Route53で購入していない場合場合は、マネジメントコンソールより「Route53 -> ホストゾーンの作成」を選択して自分で用意したドメインを入力・作成してください。
タイプはデフォルトの「パブリックホストゾーン」のままにしてください。
![](https://i.gyazo.com/6502e899fe5594fa84157a34e1be79c4.png)

AWS CLIの場合は以下で作成可能ですが、Route53へのアクセスができるIAMユーザーで実施してください[^3]
[^3]: 環境構築時に作成した`terraform`IAM ユーザーは該当操作のパーミッションはありませんので別途ポリシーの追加が必要です。

```shell
aws route53 create-hosted-zone \
  --name "xxxxxxxx.xxx" --caller-reference "k8s-tutorial-$(date +%s)"
```

次に、ドメインレジストラ側で、作成したRoute53のホストゾーンに名前解決を移譲するように変更します。
ドメインレジストラで用意されている管理ページで、このホストゾーンに割り当てられたネームサーバーを利用するように設定をしてください。
指定するネームサーバーはマネジメントコンソールのNSレコードの内容から確認できます。
![](https://i.gyazo.com/f0381c4581351f0c37eb1a7bbdb1e0ef.png)

例としてGoogle Domainsで購入したものは、以下のようにカスタムネームサーバーとして上記内容を設定します。
![](https://i.gyazo.com/69a2ed78fd729fa904111809410381e0.png)


## external-dnsインストール
それでは準備が整いましたので、今回主役のexternal-dnsをセットアップしましょう。
以下にHelm Chartが準備されていますので今回もHelmを使ってインストールします。
- <https://github.com/bitnami/charts/tree/master/bitnami/external-dns>

いつものようにリポジトリを追加・更新します。
```shell
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
```

以下のパラメータでexternal-dnsをインストールします。以下は現時点で最新の`5.4.11`のHelm Chartを利用しています。

```shell
helm upgrade external-dns bitnami/external-dns \
  --install --version 5.4.11 \
  --namespace external-dns \
  --set provider=aws \
  --set aws.region=ap-northeast-1 \
  --set aws.zoneType=public \
  --set serviceAccount.create=false \
  --set serviceAccount.name=external-dns \
  --set domainFilters[0]=mamezou-tech.com \
  --wait
```

- `--namespace`でexternal-dnsをインストールするのは事前に作成したnamespaceを指定
- `provider`はRoute53を利用するため`aws`を指定
- `aws.region`は東京リージョン(ap-northeast-1)を指定。使っているリージョンが異なる場合は変更してください。
- `aws.zoneType`は外部公開の`public`を指定
- `serviceAccount`/`serviceAccount.name`は事前に作成したものを指定
- `domainFilters[0]`で対象とするドメイン(ホストゾーン)を指定。自分で用意したドメインに変更してください。

external-dnsにはその他にも多数のパラメータが用意されています。必要に応じて追加してください。
利用可能なパラメータは[こちら](https://github.com/bitnami/charts/tree/master/bitnami/external-dns#parameters)を参照してください。

デプロイが正常に終了しているかを確認しましょう。
今回は`external-dns`Namespaceに配置していますので、以下のコマンドで確認できます。

```shell
kubectl get deploy,svc,pod -n external-dns
```

```
NAME                           READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/external-dns   1/1     1            1           44s

NAME                   TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
service/external-dns   ClusterIP   10.100.72.190   <none>        7979/TCP   44s

NAME                                READY   STATUS    RESTARTS   AGE
pod/external-dns-6d5f46b99d-9zhl9   1/1     Running   0          43s
```

1つのPod(デフォルト)でexternal-dnsが稼働中となっていることが分かります。
ログについても確認してみましょう。

```shell
kubectl logs deploy/external-dns -n external-dns
```

以下抜粋です。

```
time="2021-10-20T02:48:01Z" level=info msg="Instantiating new Kubernetes client"
time="2021-10-20T02:48:01Z" level=info msg="Using inCluster-config based on serviceaccount-token"
time="2021-10-20T02:48:01Z" level=info msg="Created Kubernetes client https://10.100.0.1:443"
time="2021-10-20T02:48:09Z" level=info msg="Applying provider record filter for domains: [mamezou-tech.com. .mamezou-tech.com.]"
time="2021-10-20T02:48:09Z" level=info msg="All records are already up to date"
```

external-dnsが起動して、Route53とクラスタ環境を監視している様子が分かります。

## サンプルアプリのデプロイ

external-dnsを確認するためのサンプルアプリをデプロイしましょう。
[こちら](/containers/k8s/tutorial/ingress/ingress-aws#サンプルアプリのデプロイ)と同じですが再掲します。

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
  type: NodePort
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
  type: NodePort
  selector:
    app: app2
  ports:
    - targetPort: http
      port: 80
```

AWS Load Balancer ControllerはNodePortを使う点に注意してください。
こちらでデプロイします。

```shell
kubectl apply -f app.yaml
```

いつものようにデプロイ後はアプリの状態を確認しましょう。

```shell
kubectl get cm,deployment,pod,svc
```

```
# 必要部分のみ抜粋
NAME                         DATA   AGE
configmap/server             1      100s

NAME                   READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/app1   2/2     2            2           100s
deployment.apps/app2   2/2     2            2           100s

NAME                        READY   STATUS    RESTARTS   AGE
pod/app1-7ff67dc549-gz48k   1/1     Running   0          100s
pod/app1-7ff67dc549-jxflp   1/1     Running   0          100s
pod/app2-b6dc558b5-5zb69    1/1     Running   0          100s
pod/app2-b6dc558b5-6nksz    1/1     Running   0          100s

NAME                 TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE
service/app1         NodePort    172.20.135.3    <none>        80:31391/TCP   100s
service/app2         NodePort    172.20.122.30   <none>        80:31670/TCP   100s
```

これでアプリの準備は完了です。

## Ingressリソース作成

それではこれに対応するIngressリソースを作成しましょう。
基本的には[AWS Load Balancer Controllerの環境構築時](/containers/k8s/tutorial/ingress/ingress-aws#Ingressリソース作成)と同じです。

以下のようになります。
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-aws-ingress
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    # external-dnsにRoute53への登録を指示
    external-dns.alpha.kubernetes.io/hostname: k8s-tutorial.mamezou-tech.com
spec:
  ingressClassName: aws
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
`annotations`部分に注目してください。
`external-dns.alpha.kubernetes.io/hostname`に、ルーティングルールの`host`で指定した`k8s-tutorial.mamezou-tech.com`を設定しています(複数の場合はカンマ区切り)。
external-dnsはこれを検知してRoute53と同期します。

なお、NGINX Ingress Controllerを使用する場合は`ingressClassName`に`nginx`と指定してください。

これをk8sに反映しましょう。

```shell
kubectl apply -f ingress.yaml
```

反映が終わったら、まずはIngressリソースを確認してみましょう。

```shell
kubectl describe ing app-aws-ingress
```

```
Name:             app-aws-ingress
Namespace:        default
Address:          k8s-default-appawsin-xxxxxxxxx-xxxxxxxxxxxx.ap-northeast-1.elb.amazonaws.com
Default backend:  default-http-backend:80 (<error: endpoints "default-http-backend" not found>)
Rules:
  Host                           Path  Backends
  ----                           ----  --------
  k8s-tutorial.mamezou-tech.com  
                                 /app1   app1:80 (10.0.1.55:8080,10.0.2.177:8080)
                                 /app2   app2:80 (10.0.1.114:8080,10.0.2.131:8080)
Annotations:                     alb.ingress.kubernetes.io/scheme: internet-facing
                                 external-dns.alpha.kubernetes.io/hostname: k8s-tutorial.mamezou-tech.com
Events:
  Type    Reason                  Age   From     Message
  ----    ------                  ----  ----     -------
  Normal  SuccessfullyReconciled  53s   ingress  Successfully reconciled
```
前回と同じように`Address`に外部公開用のURL(AWSで自動生成されたもの)が割り当てられ、バックエンドとしてパスベースのルーティングでapp1/app2が設定済みであることが確認できます。
また、Annotationsにexternal-dnsのドメインが指定されていることも確認できます。

AWSのマネジメントコンソールからRoute53の状態を見てみましょう。サービスからRoute53を選択し、自分のドメインのホストゾーンに登録されているレコードを見てみましょう。
![](https://i.gyazo.com/b840185e7ffb26568626f928be009fdb.png)

Aレコードが作成され、これがIngress(実態はALB)に対してマッピングされている様子が分かります。
Aレコードが作成されていない場合は、external-dnsのログを確認してみましょう。以下のようにexternal-logのPodより確認可能です。

```shell
kubectl logs deploy/external-dns -n external-dns
```

正常に終了していれば以下のような出力が確認できます。

```
time="2021-10-17T07:09:38Z" level=info msg="Applying provider record filter for domains: [mamezou-tech.com. .mamezou-tech.com.]"
time="2021-10-17T07:09:38Z" level=info msg="Desired change: UPSERT k8s-tutorial.mamezou-tech.com A [Id: /hostedzone/XXXXXXXXXXXXXXXXXXXXX]"
time="2021-10-17T07:09:38Z" level=info msg="Desired change: UPSERT k8s-tutorial.mamezou-tech.com TXT [Id: /hostedzone/XXXXXXXXXXXXXXXXXXXXX]"
time="2021-10-17T07:09:39Z" level=info msg="2 record(s) in zone mamezou-tech.com. [Id: /hostedzone/XXXXXXXXXXXXXXXXXXXXX] were successfully updated"
```

レコード追加が完了したら、実際に名前解決ができるのかをdigコマンドで確認します。Windowsの場合はnslookupコマンドで代用してください。

```shell
dig k8s-tutorial.mamezou-tech.com
```

```
; <<>> DiG 9.10.6 <<>> k8s-tutorial.mamezou-tech.com
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 41319
;; flags: qr rd ra; QUERY: 1, ANSWER: 3, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 512
;; QUESTION SECTION:
;k8s-tutorial.mamezou-tech.com.	IN	A

;; ANSWER SECTION:
k8s-tutorial.mamezou-tech.com. 60 IN	A	xxx.xxx.xxx.xxx
k8s-tutorial.mamezou-tech.com. 60 IN	A	xxx.xxx.xxx.xxx
k8s-tutorial.mamezou-tech.com. 60 IN	A	xxx.xxx.xxx.xxx

;; Query time: 421 msec
;; SERVER: 192.168.10.1#53(192.168.10.1)
;; WHEN: Sun Oct 17 16:16:09 JST 2021
;; MSG SIZE  rcvd: 106
```

`ANSWER SECTION`でAレコードが確認できました。DNSは全世界に伝播されるまでしばらく時間がかかります(特にRoute53以外でドメイン取得した場合は数時間かかることもあります)。


## 動作確認

最後にアプリにアクセスしてみましょう。
前回まではcurlでエンドポイントはAWSで自動生成されたものを使い、そのHostヘッダにIngressのホスト名を指定してDNSの名前解決を擬似的に行っていましたが、今回はそのようなことは不要なはずです。
実際に使うドメインは自分のものに置き換えてアクセスしてください。

```shell
# app1
curl k8s-tutorial.mamezou-tech.com/app1
# app2
curl k8s-tutorial.mamezou-tech.com/app2
```

```
app1-7ff67dc549-gz48k: hello sample app!
app2-b6dc558b5-5zb69: hello sample app!
```

カスタムドメインのみでアクセスできていることが分かります。


## クリーンアップ

最後に不要になったリソースを削除しましょう。

```shell
# app1/app2
kubectl delete -f app.yaml
# Ingress -> ALBリソース削除
kubectl delete -f ingress.yaml
# ALBが削除されたことを確認後にAWS Load Balancer Controller/external-dnsをアンインストール
helm uninstall -n external-dns external-dns
helm uninstall -n kube-system aws-load-balancer-controller
```

また、external-dnsはデフォルトでは安全のためにRoute53のレコードを削除しません(helmインストール時に`policy`に`sync`を指定すれば可能です)。
マネジメントコンソールから不要になったレコード(A/Txt)は手動で削除しておきましょう(**誤って利用中のものを削除しないよう注意してください**)。

最後にクラスタ環境を削除します。こちらは環境構築編のクリーンアップ手順を参照してください。
- [AWS EKS(eksctl)](/containers/k8s/tutorial/env/aws-eks-eksctl#クリーンアップ)
- [AWS EKS(Terraform)](/containers/k8s/tutorial/env/aws-eks-terraform#クリーンアップ)


---

参照資料

external-dnsドキュメント: <https://github.com/kubernetes-sigs/external-dns>