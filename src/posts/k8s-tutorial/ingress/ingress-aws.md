---
title: Ingress - AWS Load Balancer Controller
author: noboru-kudo
date: 2021-10-17
prevPage: ./src/posts/k8s-tutorial/ingress/ingress-nginx.md
nextPage: ./src/posts/k8s-tutorial/ingress/external-dns.md
---

[前回](/containers/k8s/tutorial/ingress/ingress-nginx)はNginxをIngress Controllerとして利用しました。
Nginxはロードバランサーとして利用可能なプロキシサーバーで、実績のある成熟したミドルウェアと言えます。
しかし、AWSにはロードバランサーのフルマネージドサービスとしてELB(Elastic Load Balancing)が存在しますので、あえてNginxを入れなくても、ロードバランサー機能として同等のことができます。

今回はIngress ControllerとしてAWSマネージドサービスのELBを利用できるようにしましょう。
これに対応するAWS Load Balancer Controller[^1]というIngress Controllerがありますので、こちらを導入します。
- Github: <https://github.com/kubernetes-sigs/aws-load-balancer-controller>
- ドキュメント: <https://kubernetes-sigs.github.io/aws-load-balancer-controller>

[^1]: 以前はAWS ALB Ingress Controllerという名前でTicketmaster社で開発されてものでしたが、2018年にKubernetes SIG-AWSに移管された後、NLB(Network Load Balancer)にも対応可能なAWS Load Balancer Controllerと改名されました。

AWS Load Balancer Controllerは、その設定によって以下の2種類のELBを作成することが可能です。

1. [ALB:Application Load Balancer](https://docs.aws.amazon.com/ja_jp/elasticloadbalancing/latest/application/introduction.html)
2. [NLB:Network Load Balancer](https://docs.aws.amazon.com/ja_jp/elasticloadbalancing/latest/network/introduction.html)

上記NLBはL4タイプのLoadBalancerで、Serviceリソース(`type=LoadBalancer`)のみに対応しているため、Ingressをスコープとする本章では対象外となります。

Ingressリソースが登録・変更を検知されると、以下のイメージ[^2]で自動構成されます。

![](https://i.gyazo.com/a7124857e2ba6fafeb8d7b3737032cb4.png)

[^2]: <https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/how-it-works/>より抜粋

Ingress ControllerがIngressの投入を検知(API Serverから通知)すると、ALBリソースを動的に生成し、ルーティングルールやTargetGroupをプロビジョニングして、トラフィックをk8sクラスタにルーティングするように設定してくれることが分かります。


## 事前準備
以下のいずれかの方法で事前にEKS環境を作成しておいてください。

- [AWS EKS(eksctl)](/containers/k8s/tutorial/infra/aws-eks-eksctl)
- [AWS EKS(Terraform)](/containers/k8s/tutorial/infra/aws-eks-terraform)

また、Ingress Controllerのインストールにk8sパッケージマネージャーの[helm](https://helm.sh/)を利用します。未セットアップの場合は[こちら](https://helm.sh/docs/intro/install/) を参考にv3以降のバージョンをセットアップしてください。

## IAMアクセス許可の設定

事前にIngress ControllerがAWSリソースにアクセスできるようにアクセス許可を設定しましょう。
これはeksctlとTerraformのどちらでクラスタ環境構築したかで手順が変わってきます。利用している環境に応じて以下のいずれかを実施してください。

### eksctl

eksctlの場合は、専用のサブコマンドが用意されていますのでそちらを利用します。
こちらは[公式ドキュメント](https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.2/deploy/installation/#setup-iam-role-for-service-accounts)に記載されていますので、基本はそのまま実行するだけで構いません。

まずは、Ingress ControllerのAWSリソースへのアクセスを厳密に行うためIRSA[^3]を有効化します。

[^3]: IAM Roles for Service Account。PodのAWSリソースアクセスを管理する機能。Pod単位でパーミッション管理ができるようになりますので原則使用するようにしましょう。公式ドキュメントは[こちら](https://docs.aws.amazon.com/ja_jp/eks/latest/userguide/iam-roles-for-service-accounts.html)参照。

```shell
eksctl utils associate-iam-oidc-provider \
    --cluster mz-k8s \
    --approve
```

次にAWS上にカスタムポリシーを作成します。下記はAWS CLIを利用していますが、マネジメントコンソールから作成しても構いません。
カスタムポリシーについてはAWS Load Balancer Controllerで用意されていますのでそれをダウンロードして使用します。

```shell
# ポリシーファイルのダウンロード
curl -o alb-ingress-policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/main/docs/install/iam_policy.json
# IAM Policy作成
aws iam create-policy \
    --policy-name AWSLoadBalancerControllerIAMPolicy \
    --policy-document file://alb-ingress-policy.json
```

そして作成したポリシーを指定したIngress ControllerのIAM Roleとそれを利用するk8sのServiceAccountを作成します。
`eksctl create iamserviceaccount`コマンドを使用します。

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
# 必要部分のみ抜粋/整形
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
Ingress Controllerはこのアカウントを利用することで指定したパーミッション（ポリシー）でELBリソースを作成・更新することが可能となります。

このIRSAはIngress Controllerだけでなく、全てのアプリケーションに適用可能ですのでAWSリソースへのアクセスが必要な場合に漏れなく指定することが望ましいでしょう。

### Terraform

Terraformの場合はクラスタ環境構築後（もちろん構築前でも構いませんが）に以下の点について変更してください。

まず、[VPCモジュールの設定](/containers/k8s/tutorial/infra/aws-eks-terraform#VPCリソース)に以下を追加してください。

```hcl
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  
  # 省略

  # 変更点
  # enable AWS Load Balancer Controller subnet-discovery
  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
  }
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
  }
}
```

これによりIngress Controllerの[Subnet Discovery](https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/deploy/subnet_discovery/)が有効になります[^4]。
これを指定しない場合は、別途Ingressリソースの`annotations`としてサブネットIDを設定する必要があります。

[^4]: eksctlのときはこの手順を実施していませんが、デフォルトでサブネットに該当タグが付与されているようです。

さらにIRSA[^3]を有効にするためもうひと手間加える必要があります。`main.tf`に以下を追加してください。

```hcl
# enable IRSA for AWS Load Balancer Controller
resource "aws_iam_policy" "aws_loadbalancer_controller" {
  name = "EKSIngressAWSLoadBalancerController"
  policy = file("${path.module}/alb-ingress-policy.json")
}

module "iam_assumable_role_admin" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-assumable-role-with-oidc"
  version = "~> 4.0"

  create_role                   = true
  role_name                     = "EKSIngressAWSLoadBalancerController"
  provider_url                  = replace(module.eks.cluster_oidc_issuer_url, "https://", "")
  role_policy_arns              = [aws_iam_policy.aws_loadbalancer_controller.arn]
  oidc_subjects_with_wildcards = ["system:serviceaccount:*:*"]
}

resource "kubernetes_service_account" "aws_loadbalancer_controller" {
  metadata {
    name = "aws-load-balancer-controller"
    namespace = "kube-system"
    annotations = {
      "eks.amazonaws.com/role-arn" = module.iam_assumable_role_admin.iam_role_arn
    }
  }
}
```

以下のことを行っています。

- Ingress Controllerがアクセス可能なカスタムIAMポリシー作成(ポリシーファイルはローカルパス指定)
- カスタムポリシーを利用するIngress Controller用のIAM Role(`EKSIngressAWSLoadBalancerController`)作成。これは[IAMリソース用のTerraform Module](https://registry.terraform.io/modules/terraform-aws-modules/iam/aws/latest)を利用して簡素化しています。
- k8sクラスタ内に上記Roleを利用するように指定したServiceAccount作成(kubernetesプロバイダ使用)。Ingress Controllerはここを通じてIAM Roleで指定したポリシーでAWSリソースにアクセスできるようになります。

上記のIngress ControllerのIAMポリシーのJSONファイルはAWS Load Balancer Controllerで用意されています(eksctlでのセットアップと同じものです)。
あらかじめTerraformのルートモジュール配下(ここでは`terraform`)にダウンロードしておきましょう。

```shell
curl -o alb-ingress-policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/main/docs/install/iam_policy.json
```

これで準備完了です。再度terraform コマンドを実行しましょう。

```shell
# Moduleを追加したため再度initコマンドを実行
terraform init
# 追加内容チェック
terraform plan
# AWS/EKSに変更適用
terraform apply
```

作成したリソースを確認しましょう。まずはIAM Roleをマネジメントコンソールで見てみましょう(IAM -> ロール)。
![](https://i.gyazo.com/beee6b2e46a6ef78d0cd960b8555c2b2.png)

Terraformリソースで指定したようにIAM Roleが作成され、Ingress Controller用のIAM Policyが設定されていることが分かります。

EKSクラスタに作成したServiceAccountも見てみましょう。これはkubectlで確認します。

```shell
kubectl get sa -n kube-system aws-load-balancer-controller -o yaml
```

```
# 必要部分のみ抜粋/整形
apiVersion: v1
kind: ServiceAccount
automountServiceAccountToken: true
metadata:
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::xxxxxxxxxxxx:role/EKSIngressAWSLoadBalancerController
  name: aws-load-balancer-controller
  namespace: kube-system
secrets:
- name: aws-load-balancer-controller-token-zjmzd
```

`annotations`フィールドに作成したIAM RoleのARNが指定されていることが確認できました。

## Ingress Controllerインストール

前回同様にhelmを用いてインストールしましょう。
helm以外にもマニフェストファイルからのインストールオプションもありますので、helmを使わない場合は[こちら](https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/deploy/installation/)を参照してください。

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
今回は別途設定ファイルを用意するのではなく、コマンド引数に設定も含めています(`clusterName`は自分で作成したクラスタ名に変更してください)。

```shell
helm upgrade aws-load-balancer-controller eks/aws-load-balancer-controller \
  --install --version 1.2.7 \
  --namespace kube-system --set clusterName=mz-k8s \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller
```

Ingress Controllerが利用するServiceAccountについては事前に作成していますので、`serviceAccount.create`/`serviceAccount.name`で自動で作成せずに既存のものを利用するように指定しています。

正常に実行が完了したら、実際にIngress Controllerがデプロイされているのかを確認してみましょう。

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

## サンプルアプリのデプロイ

それでは、Ingress作成前にサンプルアプリをデプロイしてみましょう。

利用するアプリについてもNGINX Ingress Controllerと1点除いて同じですので、[こちら](/containers/k8s/tutorial/ingress/ingress-nginx/#サンプルアプリのデプロイ)を参照してください。
異なる点はAWS Load Balancer ControllerはNodePortを経由してルーティングを行うため、Serviceリソースに対して`type=NodePort`を指定する必要があります[^5]。

[^5]: NGINX Ingress Controllerは、Ingress ControllerがLoadBalancerタイプのService(`ingress-nginx-controller`)経由でルーティングしていましたので、全く別の実装になっています。

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

デプロイ後はアプリの状態を確認しましょう。

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

最後に[前回](/containers/k8s/tutorial/ingress/ingress-nginx/#ingressリソース作成)のNGINX Ingress Controllerのときは、ホスト名ベースでルーティングルールを作成しましたが、今回はパスベースで作成しています。
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
curl $INGRESS_URL/app1 -H 'Host:sample-app.mamezou-tech.com'
# app2
curl $INGRESS_URL/app2 -H 'Host:sample-app.mamezou-tech.com'
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

## アクセスログの保管設定

ALBのセットアップが完了し、アプリへのリクエストが無事にルーティングされていることが確認できました。
ただし、実運用では有事のときのためにアクセスログについて厳密な管理が求められることが多いかと思います。
そこで最後にALBのアクセスログの設定を追加してみましょう。

まずマネジメントコンソールからS3選択してログ用のバケットを作成しましょう(Terraformで構築している場合はTerraformで管理しましょう)。
ここではバケット名以外はデフォルトで構いません。ここでは`mz-alb-access-logs-001`という名前にしましたが、バケット名はグローバルで一意である必要がありますので重複しない名前を設定してください。
![](https://i.gyazo.com/66f8ae592fe44b5e497bac9909ff4fb0.png)

次にS3メニューから対象のバケットを選択し、アクセス許可ページにあるバケットポリシーを設定します。
設定値(JSON)については[AWSのALBドキュメント](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html#access-logging-bucket-permissions)に記載がありますので参照してください。

![](https://i.gyazo.com/48495c302ad084f0e5bf1824a46e2974.png)

一番上のAWSアカウントは、利用するリージョンによって決まりますので、誤って自分のAWSアカウントを設定しないように注意してください(上記`582318560864`は東京リージョン(ap-northeast-1)のELBアカウントIDです)。
また、バケット名については自分で作成したものを指定するようにしてください(上記で`mz-alb-access-logs-001`としている部分)。

次にIngress側の設定を行います。アクセスログについてはIngressリソースの`annotations`にて指定します。
以下のようにIngressリソースを修正します。

```yaml
# 必要部分のみ抜粋
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-aws-ingress
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    # S3アクセスログ保管設定
    alb.ingress.kubernetes.io/load-balancer-attributes: |
      access_logs.s3.enabled=true,access_logs.s3.bucket=mz-alb-access-logs-001,access_logs.s3.prefix=sample-app
# 以下同じ
```
`alb.ingress.kubernetes.io/load-balancer-attributes`でS3アクセスログを有効化し、バケット名、プレフィックスを指定しています。
プレフィックスについてはバケットポリシーで指定したものと合わせる必要がありますので注意してください。
これをk8sに適用しましょう。

```shell
kubectl -f ingress.yaml
```

反映後に何度かアプリケーションにアクセスして、S3にアクセスログが保管されていることを確認してみましょう。

```shell
# アプリにアクセス
for i in {1..10}; do curl -H 'Host:sample-app.mamezou-tech.com' $INGRESS_URL/app1; done
```

![](https://i.gyazo.com/1712ebdf68eae9f7a014741197dbf954.png)

(かなり深い階層ですが)アクセスログが保管されていることが分かります。
アクセスログは5分ごとにS3に保管されます。正しい設定なのにログファイルが見つからない場合は5分以上待ってから確認してみてください。

ログの詳細な中身については[AWSドキュメント](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html#access-log-file-format)を参照してください。

この他にもALBには認証基盤としてCognitoとの連携[^6]等も比較的容易にできますので、興味がある方は是非チャレンジしていただければと思います。

[^6]: <https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/tasks/cognito_authentication/>

## クリーンアップ

最後に不要になったリソースを削除して余計な費用が発生しないようにしましょう。

```shell
# app1/app2
kubectl delete -f app.yaml
# Ingress -> ALBリソース削除
kubectl delete -f ingress.yaml
# ALBが削除されたことを確認後にAWS Load Balancer Controllerをアンインストール
helm uninstall -n kube-system aws-load-balancer-controller
```

また、アクセスログ保管に使用したS3バケットは別途マネジメントコンソールから削除してください。

最後にクラスタ環境を削除します。こちらは環境構築編のクリーンアップ手順を参照してください。
- [AWS EKS(eksctl)](/containers/k8s/tutorial/env/aws-eks-eksctl#クリーンアップ)
- [AWS EKS(Terraform)](/containers/k8s/tutorial/env/aws-eks-terraform#クリーンアップ)

---
参照資料

- AWS Load Balancer Controllerドキュメント：<https://kubernetes-sigs.github.io/aws-load-balancer-controller>
