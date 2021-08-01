---
title: Ingress Controller導入(AWS ALB編)
author: noboru-kudo
---
Kubernetesハンズオン-Ingress Controller - Nginxの続き。

AWSのL7ロードバランサのIngressリソースの実装であるALB Ingress Controllerの動作を確認する(以下AWS公式サイトより抜粋)。  
<https://github.com/kubernetes-sigs/aws-alb-ingress-controller>

このハンズオンでは[Ingress]リソースを投入するとALB Ingress Controllerが[AWS Elastic Load Balancing] のALBリソースを作成することを確認する。
![](https://i.gyazo.com/a7124857e2ba6fafeb8d7b3737032cb4.png)

ALB Ingress ControllerはIngressの投入を検知するとALBリソースを動的に生成し、ルーティングルールやTargetNodeをプロビジョニングしてくれる。
さらに今回はexternal-dnsを使って自動でRoute53で公開アドレスを割り当てるところまでやる（目指すところはAWSリソースを手動で作ったりしない）。


## EKSクラスタ環境作成
基本はAWS EKSクラスタ環境構築と同じだけど、いくつかのオプションをつけておくとALBに必要なIAM Policy回りを合わせて付けてくれる。

- `--alb-ingress-access`: ALBリソースを作成するためにWorkerNodeにPolicyを付けてれる
- `--external-dns-access`: Route53に対するアクセスPolicy(自動プロビジョニングする)

```shell
CLUSTER_NAME=frieza
eksctl create cluster \
--name $CLUSTER_NAME \
--nodegroup-name standard-workers \
--node-type m5.large \
--nodes 3 \
--auto-kubeconfig \
--region ap-northeast-1 \
--zones ap-northeast-1a,ap-northeast-1c,ap-northeast-1d \
--external-dns-access \
--alb-ingress-access
```
kubeconfigの設定をして、クライアントから接続できるようにする。
```shell
eksctl utils write-kubeconfig --name=$CLUSTER_NAME
```


## ALB Ingress Controller導入
helmでインストールする。
[Kubernetesハンズオン-パッケージマネージャ]
```shell
helm repo add incubator http://storage.googleapis.com/kubernetes-charts-incubator
helm install incubator/aws-alb-ingress-controller \
--name aws-alb-ingress-controller \
--set clusterName=$CLUSTER_NAME \
--set autoDiscoverAwsRegion=true \
--set autoDiscoverAwsVpcID=true
```

ALB Ingress ControllerはDeployment経由でPodとしてデプロイされる。
```shell
kubectl get deploy,pod -l app.kubernetes.io/name=aws-alb-ingress-controller
```
```
> NAME                                               DESIRED   CURRENT   UP-TO-DATE   AVAILABLE   AGE
> deployment.extensions/aws-alb-ingress-controller   1         1         1            1           86s
>
> NAME                                             READY   STATUS    RESTARTS   AGE
> pod/aws-alb-ingress-controller-c7cdcbdc5-2mxph   1/1     Running   0          86s
```

## サンプルアプリデプロイ
NginxのIngress Controllerと同じようにサンプルアプリをデプロイする。
```shell
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/ingress/nginx/app1.yaml
kubectl apply -f https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/ingress/nginx/app2.yaml
```

```shell
kubectl get pod,svc -l 'app in (app1,app2)'
```
```
> NAME                        READY   STATUS    RESTARTS   AGE
> pod/app1-77d54f9976-rknmc   1/1     Running   0          67s
> pod/app1-77d54f9976-t5vjp   1/1     Running   0          67s
> pod/app2-5b9b5bcfbf-tlcrl   1/1     Running   0          66s
> pod/app2-5b9b5bcfbf-vtxkc   1/1     Running   0          66s
>
> NAME           TYPE       CLUSTER-IP       EXTERNAL-IP   PORT(S)          AGE
> service/app1   NodePort   10.100.207.224   <none>        3000:32630/TCP   67s
> service/app2   NodePort   10.100.216.63    <none>        3000:30181/TCP   66s
```
デプロイ完了！


## Ingressリソース作成
ALBに対応するIngressリソースを作成・投入する。
```yaml
kind: Ingress
apiVersion: extensions/v1beta1
metadata:
  name: ingress
  annotations:
    kubernetes.io/ingress.class: 'alb'
    # トラフィックを振り向けるVPCのPublicサブネット（SubnetにTagをつけて自動検出させることもできる）
    alb.ingress.kubernetes.io/subnets: ''
    # ALBのスキーマ設定(PublicELB)
    alb.ingress.kubernetes.io/scheme: internet-facing
    # ALBからアプリへのヘルスチェックパス
    alb.ingress.kubernetes.io/healthcheck-path: /
spec:
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
# EKS VPCのPublic Subnetを取得
PUBLIC_SUBNETS=$(aws ec2 describe-subnets \
--filters "Name=tag:Name,Values=*${CLUSTER_NAME}*Public*" \
--query 'Subnets[].SubnetId' --output text \
| tr '\t' ',')
# Ingressリソース投入!
curl -sSL https://raw.githubusercontent.com/kudoh/k8s-hands-on/master/ingress/alb/ingress.yaml | \
sed -e "s#alb.ingress.kubernetes.io/subnets: ''#alb.ingress.kubernetes.io/subnets: $PUBLIC_SUBNETS#g" | \
kubectl apply -f-
```
Ingressリソースにアドレスが割り当てられたかを確認する。
```shell
kubectl describe ingress/ingress
```
```
> Name:             ingress
> Namespace:        default
> Address:          [* 0b2a8fbb-default-ingress-e8c7-565340723.ap-northeast-1.elb.amazonaws.com]
> Default backend:  default-http-backend:80 (<none>)
> Rules:
>   Host            Path  Backends
>   ----            ----  --------
>   eks.frieza.dev  
>                   /app1   app1:3000 (192.168.55.55:3000,192.168.69.94:3000)
>                   /app2   app2:3000 (192.168.38.49:3000,192.168.85.223:3000)
> (省略)
> Events:
>   Type    Reason  Age   From                    Message
>   ----    ------  ----  ----                    -------
>   Normal  CREATE  15s   alb-ingress-controller  [* LoadBalancer 0b2a8fbb-default-ingress-e8c7 created], ARN: arn:aws:elasticloadbalancing:ap-northeast-1:331762965715:loadbalancer/app/0b2a8fbb-default-ingress-e8c7/99ca64db2dc12b39
>   Normal  CREATE  14s   alb-ingress-controller  [* rule 1 created with conditions [{    Field: "host-header",    Values: ["eks.frieza.dev"]  },{    Field: "path-pattern",    Values: ["/app1"]  }]]
>   Normal  CREATE  14s   alb-ingress-controller  [* rule 2 created with conditions [{    Field: "host-header",    Values: ["eks.frieza.dev"]  },{    Field: "path-pattern",    Values: ["/app2"]  }]]
```
ALBリソースが生成されて、公開アドレス(FQDN)が割り当てられている。
Eventsを見るとALB Ingress ControllerがALBリソースとIngressマニフェストに従ったルールを生成していることが分かる。

AWSコンソールでその内容を確認する。

- ロードバランサ
Ingressリソースに対応したALBリソースが生成されている。
![](https://i.gyazo.com/32c86b4f64650e3a99f3a0ce7e3a721a.png)
- ルーティングルール
Ingressリソースのパスベースのマッピングが反映されている。
![](https://i.gyazo.com/c2416514c0b5ef6342b0a65e9794d3ca.png)
- ターゲットグループ
EKSのWorkderノードに対してトラフィックが転送されているようプロビジョニングされている。
![](https://i.gyazo.com/1850ef1df24b6b070a886c08f8f8d2c1.png)


## 動作確認
まずはDNSなしでALB経由でアプリにアクセスしてみる。
```shell
HOSTNAME=$(kubectl get ingress ingress -o jsonpath='{.status.loadBalancer.ingress[*].hostname}')
curl $HOSTNAME/app1 -H 'Host:eks.frieza.dev'; echo
```
```
> [app1:192.168.44.177]私の戦闘力は530000です…ですが、もちろんフルパワーであなたと戦う気はありませんからご心配なく…
curl $HOSTNAME/app2 -H 'Host:eks.frieza.dev'; echo
> [app2:192.168.19.36]ずいぶんムダな努力をするんですね・・・そんなことがわたしに通用するわけがないでしょう！
```
2つのアプリに対してパスベースでルーティングができていることが分かる。
このままだとIngressリソースのHost名(eks.frieza.dev)とAWS(xxxxx.ap-northeast-1.elb.amazonaws.com)が割り当てたアドレスが不一致で使い物にならない。


## DNSプロビジョニング
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

