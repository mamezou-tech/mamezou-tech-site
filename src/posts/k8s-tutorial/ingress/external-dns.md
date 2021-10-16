---
title: DNSプロビジョニング(external-dns)
author: noboru-kudo
---

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
