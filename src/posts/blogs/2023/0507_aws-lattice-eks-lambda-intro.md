---
title: Amazon VPC Latticeを使ってコンテナ(EKS)とLambda関数で相互通信する
author: noboru-kudo
date: 2023-05-07
tags: [AWS, msa, k8s, lambda]
---

2023-03-31にAmazon VPC Lattice(以下Lattice)というマネージドサービスがプライベートプレビューからGAとなりました。

- [Simplify Service-to-Service Connectivity, Security, and Monitoring with Amazon VPC Lattice – Now Generally Available](https://aws.amazon.com/jp/blogs/aws/simplify-service-to-service-connectivity-security-and-monitoring-with-amazon-vpc-lattice-now-generally-available/)
- [(邦訳)Amazon VPC Lattice でサービス間の接続、セキュリティ、モニタリングを簡素化 — 一般提供開始](https://aws.amazon.com/jp/blogs/news/simplify-service-to-service-connectivity-security-and-monitoring-with-amazon-vpc-lattice-now-generally-available/)

Latticeは日本語で「格子」と訳されているところから、サービスメッシュ的な匂いがしますが、いまひとつ名前から機能が想像できません。
[AWS公式ドキュメント](https://docs.aws.amazon.com/ja_jp/vpc-lattice/latest/ug/what-is-vpc-service-network.html)には、以下のように記載されています。

> Amazon VPC Lattice は、複数のアカウントや仮想プライベートクラウド (VPC) にわたるすべてのサービスの接続、保護、監視に使用できる、完全マネージド型のアプリケーションネットワーキングサービスです。
> (中略)
> Amazon VPC Lattice は、マイクロサービスとレガシーサービスを論理的な境界内で相互接続するのに役立ち、より効率的に検出して管理できます。
> VPC Lattice では、マイクロサービスを「サービス」と呼んでいます。

AWSアカウントやVPCを抽象化した1つのサービスネットワークを提供しているようです。また、外部との境界ではなくサービス間の境界をスコープとしているようです。

ドキュメントを眺めてみた感じだと、KubernetesのクラスタネットワークをAWSインフラ全体に適用したような雰囲気ですが、もやもやする感じです。
こういうときはとりあえず触ってみます。ここでは、Latticeを通してAWS EKSとAWS Lambdaで相互通信を試してみました。

## LatticeのKubernetes Gateway APIコントローラーをセットアップする

Latticeは、KubernetesのGateway APIの実装としても使えます。
これは、以下のAWSブログでも紹介されています。

- [Amazon VPC Lattice と AWS Gateway API コントローラーのご紹介：Kubernetes Gateway API の実装](https://aws.amazon.com/jp/blogs/news/introducing-aws-gateway-api-controller-for-amazon-vpc-lattice-an-implementation-of-kubernetes-gateway-api/)

せっかくなので、このAWS Gateway APIコントローラーを試してみたいと思います。
セットアップ手順は、以下ドキュメントに記載の通りですので、ここでの詳細な手順は省略します。

- [Deploying the AWS Gateway API Controller](https://www.gateway-api-controller.eks.aws.dev/deploy/)

注意点として、通常のEKSセットアップだけでなく、Latticeからのインバウンドトラフィックを許可するようKubernetesクラスターのセキュリティグループ修正が別途必要です。

![](https://i.gyazo.com/5d79f29ea871bacdffa98540de368f82.png)

:::column:Security Groupのソース指定にプレフィックスリストIDを使う
Gateway APIのドキュメントの通りに実施すると上記のようにソースにCIDRを指定することになりますが、以下記事で紹介されているようにプレフィックスリストIDを指定した方が良いと思います。

- [DeveloperIO - Amazon VPC Lattice ターゲットのセキュリティグループではプレフィックスリストを使おう](https://dev.classmethod.jp/articles/use-prefix-lists-for-security-grouops-of-vpc-lattice/)
:::

セットアップが終わったあとは、GatewayClassとGateway APIコントローラーが正しくデプロイされたことを確認しておきます。

- GatewayClassオブジェクト
```shell
kubectl get gatewayclass
> NAME                 CONTROLLER                                              ACCEPTED   AGE
> amazon-vpc-lattice   application-networking.k8s.aws/gateway-api-controller   True       75s
```

- AWS Gateway APIコントローラー
```shell
kubectl get pod -n aws-application-networking-system
> NAME                                      READY   STATUS    RESTARTS   AGE
> gateway-api-controller-5b5b89bd87-f29kf   2/2     Running   0          2m48s
```

:::info
KubernetesのGateway APIは、以下ブログでも紹介しています。興味のある方はご参考ください。

- [Ingressを強化したKubernetes Gateway APIを試してみる](https://developer.mamezou-tech.com/blogs/2022/07/24/k8s-gateway-api-intro/)

余談ですが、筆者はGateway APIをIngressと同様に、外部との境界がスコープのものと考えていましたので、サービス間通信をスコープにするLatticeがGateway APIの実装というのは結構違和感があったりもします。
:::

## Service Networkを作成する
Service NetworkはLatticeの最上位レイヤーで、マイクロサービスを統合する仮想的なネットワークです。

Service Networkは複数VPCを関連付け可能で、サービスクライアント側は所属しているVPCを関連付ける必要があります。
一方で、サービスプロバイダー側では、別途Serviceリソースを作成してこのService Networkに関連付ける必要があります。

もちろんService Network自体はAWS CLIやCloudFormation等でも作成できますが、ここではKubernetesのGateway APIコントローラーを使って作成します。
以下のマニフェスト(`gateway.yaml`)を用意しました。

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: Gateway
metadata:
  name: sample
  annotations:
    application-networking.k8s.aws/lattice-vpc-association: "true"
spec:
  gatewayClassName: amazon-vpc-lattice
  listeners:
    - name: https
      protocol: HTTPS
      port: 443
```

`spec.gatewayClassName`には、インストール時に作成したGatewayClassオブジェクトの名前(`amazon-vpc-lattice`)を指定します。
また、`metadata.annotations`の指定で、EKSクラスタのVPCをService Networkに自動で関連付けしています。

KubernetesのGatewayオブジェクトの詳細は、以下Gateway APIの公式ドキュメントを参照してください。

- [Kubernetes Gateway API - Gateway Spec](https://gateway-api.sigs.k8s.io/references/spec/#gateway.networking.k8s.io/v1beta1.Gateway)

```shell
kubectl apply -f gateway.yaml
```

Gateway APIコントローラーがGatewayオブジェクトの作成を検知すると、LatticeのService Networkを作成します。
AWSマネジメントコンソール上でも以下のように、Service Networkの作成を確認できました。

![AWS Management Console - Lattice Service Network](https://i.gyazo.com/3cc57a58d4507c6ddfef07c3259b34d3.png)

VPC associationを見ると、EKSクラスタのVPCがLatticeに関連付けられていることが分かります。

これで準備ができました。以降でLatticeのServiceを作成してEKSのコンテナとLambda関数の相互通信を試します。

## ユースケース: EKS -> Lattice -> Lambda

まずは、EKSのコンテナからLambda関数を呼び出してみます。
ここでの内容は以下のようなイメージになります。

![](https://i.gyazo.com/4979f68894b3d3ceb692dc54988ea8ae.png)

最初にLambda関数を作成します。これはServerless Frameworkでサクッと作ります。

### イベントハンドラー

EKSにAPIを提供するLambdaイベントハンドラーのソースコード(`handler.hello`)は以下の通りです。

```typescript
import { Handler } from 'aws-lambda';

export const hello: Handler = async (event) => {
  return {
    statusCode: 200,
    body: 'Hello Foo Lambda!!'
  };
};
```

固定メッセージを返すだけです。
なお、Latticeトリガーでのインターフェース詳細については、以下AWS Lambdaの公式ドキュメントを参照してください。

- [AWS Lambda Doc - Using AWS Lambda with Amazon VPC Lattice](https://docs.aws.amazon.com/lambda/latest/dg/services-vpc-lattice.html)

### serverless.yml

デプロイ構成を司る`serverless.yml`は以下の通りです。

```yaml
service: 'sample'
frameworkVersion: '3'
plugins: ['serverless-esbuild']
provider:
  name: 'aws'
  region: 'ap-northeast-1'
  runtime: 'nodejs18.x'
functions:
  hello:
    handler: "handler.hello"
package:
  individually: true
custom:
  esbuild:
    bundle: true
    minify: false
    sourcemap: true
    exclude: ['aws-sdk']
    target: 'node18'
    define: { 'require.resolve': undefined }
    platform: 'node'
    concurrency: 10
resources:
  Resources:
    # Lattice Service resources
    # APIを公開するサービス
    FooService:
      Type: AWS::VpcLattice::Service
      Properties:
        AuthType: NONE
        Name: foo-service
    # サービスレベルのリスナー(プロトコルやデフォルトルール)
    FooListener:
      Type: AWS::VpcLattice::Listener
      Properties:
        DefaultAction:
          Forward:
            TargetGroups:
              - TargetGroupIdentifier: !Ref FooTargetGroup
        Protocol: HTTPS
        ServiceIdentifier: !Ref FooService
    # サービスを実際に提供しているアプリケーション群
    FooTargetGroup:
      Type: AWS::VpcLattice::TargetGroup
      Properties:
        Name: foo-lambda
        Targets:
          - Id: !GetAtt HelloLambdaFunction.Arn
        Type: LAMBDA
    # サービスをService Networkに関連付けする
    FooServiceAssociation:
      Type: AWS::VpcLattice::ServiceNetworkServiceAssociation
      Properties:
        ServiceIdentifier: !Ref FooService
        # Service Network(sample)のARNを指定
        ServiceNetworkIdentifier: arn:aws:vpc-lattice:ap-northeast-1:XXXXXXXXXXXX:servicenetwork/sn-095ecd8e8bb0273d1
```

functionsセクションの通り、hello関数のみの構成です。
なお、ここでイベントトリガー(API Gateway等)の作成はしていません。

ここでのイベントトリガーはLatticeになりますが、現時点ではServerless Frameworkは未対応です。
このため、resourcesセクション配下にCloudFormationのテンプレートで、Latticeに必要な各リソースを定義しました。
Service Networkに加えて、これらのリソースの役割を正確に把握することがLatticeを理解するポイントになってきそうです。
とはいえ、ListenerやTarget GroupはELBでもお馴染みですので、言葉だけでもイメージできる方は多いかと思います。

:::column:複雑なルーティングルールを指定する
今回は指定していませんが、`AWS::VpcLattice::Rule`リソースを作成することで、パスやヘッダベースで追加のルーティングルールを作成できます。
リクエストを振り向ける割合(ウェイト)も指定できますのでカナリアデプロイの用途でも使用できそうです。
ルーティングルールの詳細は、以下公式ドキュメントを参照してください。

- [Amazon VPC Lattice Doc - Listeners - Listener rules](https://docs.aws.amazon.com/vpc-lattice/latest/ug/listeners.html#listener-rules)
- [AWS CloudFormation Doc - AWS::VpcLattice::Rule](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-vpclattice-rule.html)
:::
 

### デプロイ

これをデプロイします。

```yaml
serverless deploy
```

デプロイ後は、Lambdaに加えてLatticeのServiceやTarget Groupも作成されているかを確認します。

#### Lambda関数
![AWS Management Console - Lambda](https://i.gyazo.com/98c0c6f7e9e1ce88a8b40265e8ff49de.png)
Lambda関数のイベントリガーとしてLatticeが設定されています。

#### Lattice Service
![AWS Management Console - Lattice Service - lambda](https://i.gyazo.com/234564a4dc8103c24d60ae2c3850ca9a.png)
サービスの接続先ドメインが確認できます。これが公開するサービスのFQDNになります。
ここでは実施していませんが、カスタムドメインも指定可能です。

また、Service Network Associationとして先程作成したService Networkに関連付けられていることも確認できます。これはService Network側のメニューからも確認できます。

Routingタブ(Listener)は以下の通りです。

![AWS Management Console - Lattice Service - lambda - routing](https://i.gyazo.com/76085e2e1406709c29d8bc88ffa46e1b.png)

デフォルトアクションのみが設定されています。

#### Lattice Target Group
![AWS Management Console - Lattice Service - lambda - target group](https://i.gyazo.com/9d802de2d2b602e1057c23630f4684ea.png)

Targetとして、デプロイしたLambda関数(sample-dev-hello)が指定されています。

### 動作確認

確認が完了しましたので、EKSからLambdaを呼び出してみます。
ここではアプリをデプロイするのではなく、EKS内にコンテナを起動してその中からcurlでLambda関数を実行します。
指定するエンドポイントは、先程Latticeのサービス作成時に確認したドメインから作成します。

```shell
kubectl run --image curlimages/curl --rm -it curl -- sh
curl https://foo-service-xxxxxxxxxxxxxxxxx.xxxxxxx.vpc-lattice-svcs.ap-northeast-1.on.aws
> Hello Foo Lambda!!
```

EKSコンテナから、Latticeを経由してLambda関数が実行できていることが分かります。

## ユースケース: Lambda -> Lattice -> EKS

次は、逆方向の通信を確認してみます。
ここでの内容は以下のようなイメージになります。

![](https://i.gyazo.com/184b97aa3bad6f873c31c939a6f0a298.png)

### EKS - Pod

まず、サービスを提供するEKS側で以下のアプリ(`app.yaml`)をデプロイします。

```yaml
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
      res.end('Hello Bar EKS Pod!!');
    });

    const hostname = '0.0.0.0';
    const port = 8080;
    server.listen(port, hostname, () => {
      console.log(`Server running at http://${hostname}:${port}/`);
    });
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: app
  template:
    metadata:
      labels:
        app: app
    spec:
      containers:
        - name: app
          image: node:18
          ports:
            - name: http
              containerPort: 8080
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
    app: app
  name: app
spec:
  type: NodePort
  selector:
    app: app
  ports:
    - targetPort: 8080 # httpはNG!!
      port: 80
```

シンプルなNode.jsサーバーです。HTTPリクエスト受け取ると自身の固定テキストを返すのみです。

:::alert
現時点では、LatticeのGateway APIコントローラーではServiceオブジェクト(こちらはk8sのServiceです)のNamed Portに対応しておらず、ポート番号を指定する必要がありました(ハマりました)。
こちらはIssueも作成されており、近い将来解消されることと思います。

- <https://github.com/aws/aws-application-networking-k8s/issues/86>
:::

こちらをデプロイしておきます。

```shell
kubectl apply -f app.yaml
```

### Lattice Service/TargetGroup(HTTPRoute)作成

次にLatticeのService/Target Groupリソースです。
EKS側ではGateway APIの実装としてLatticeを使っていますので、HTTPRouteオブジェクトを作成することで、これらのリソースも作成されるはずです。
以下のマニフェスト(`httproutes.yaml`)を用意しました。

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: HTTPRoute
metadata:
  name: eks-app
spec:
  parentRefs:
    - name: sample
      sectionName: https
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /app
      backendRefs:
        - name: app
          kind: Service
          port: 80
```

今回はパスベースのルーティングを使ってみました。
リクエストパスが`/app`の場合に、先程デプロイしたPodにルーティングするよう指定しています。

ここでは1つのルールのみですが、もちろんパスやヘッダ等でPod(k8s側のService)を切り替えたり、ウェイトを指定してカナリアデプロイするといった指定もできます（が、未検証です）。
詳細は以下Gateway APIのドキュメントを参照してください。

- [Gateway API Doc - HTTP routing](https://gateway-api.sigs.k8s.io/guides/http-routing/)
- [Gateway API Reference - HttpRoute](https://gateway-api.sigs.k8s.io/api-types/httproute/)

これをEKSに反映します。

```shell
kubectl apply -f httproutes.yaml
```

作成後にAWSマネジメントコンソールから、対応するLatticeのリソースが作成されたか確認します。

#### Lattice Service
![AWS Management Console - Lattice Service - EKS](https://i.gyazo.com/7a98b47d6f87c72293d978e6736851a1.png)

今度はEKS側のドメインが生成されています。先程のLambdaの時と同様にService AssociationとしてService Networkに関連付けもされています。

Routingタブは以下の通りです。

![AWS Management Console - Lattice Service - EKS - routing](https://i.gyazo.com/11958f1c967893193c09188f3d0f98bc.png)

今回は`/app`の場合のみにPodにルーティングを行い、それ以外(デフォルトアクション)は404レスポンスを返すように設定されました。

#### Lattice Target Group
![AWS Management Console - Lattice Service - EKS - Target Group](https://i.gyazo.com/3c858288b306d00b4d2cc212d410f95f.png)

ここでは、EKS(Kubernetes)のノード(マネージドノードグループ)がTargetとして指定されています。
LatticeはTargetタイプがインスタンスやIP等の場合は、ELB同様にヘルスチェックを実施し、Healthyなノードのみにルーティングしてくれます。

### Lambda VPCのService Networkへの関連付け
次に、このサービスのクライアントとなるLambda関数を作成しますが、その前にサービスクライアントがVPCに所属している必要があります。これはLambdaでも同様です。
ここでは、事前にEKSとは別にプライベートサブネットのみで構成するVPCを作成して、それをLatticeのサービスネットワークに関連付けました。
以下はVPCとの関連付けの様子です。

1. 「Create VPC associations」クリック
![](https://i.gyazo.com/d7237f7d594bba35638d9bf69ec7701a.png)
2. 「VPC」「Security Group」を選択して、「Save changes」クリック
![](https://i.gyazo.com/8cc8a6e229fd44baa8c6ac63a904b32b.png)

なお、指定するSecurity Groupには、VPCからLatticeへのリクエストを通すために、VPC CIDRからのインバウンドトラフィックを許可する必要があります。
詳細は以下公式ドキュメントを参照してください。

- [Amazon VPC Lattice Doc - Control traffic using security groups](https://docs.aws.amazon.com/vpc-lattice/latest/ug/security-groups.html)

### イベントハンドラー(サービスクライアント)

クライアント側のLambda関数として、以下イベントハンドラーを新規追加しました。

```typescript
export const client: Handler = async (event) => {
  const res = await fetch('https://eks-app-default-xxxxxxxxxxxxxxxxx.xxxxxxx.vpc-lattice-svcs.ap-northeast-1.on.aws/app');
  return {
    statusCode: 200,
    body: `from EKS: ${await res.text()}`
  };
};
```

先程確認したEKS側のドメインでAPI呼び出して、そのレスポンス(固定メッセージ)をそのまま返しています。

### serverless.yml

`serverless.yml`は以下のように変更しました。

```yaml
service: 'sample'
frameworkVersion: '3'
plugins: ['serverless-esbuild']
provider:
  name: 'aws'
  region: 'ap-northeast-1'
  runtime: 'nodejs18.x'
functions:
  hello:
    handler: "handler.hello"
  # 追加した関数(サービスクライアント)
  eksClient:
    handler: "handler.client"
    # VPCにアタッチ
    vpc:
      securityGroupIds:
        - !Ref LambdaSG
      subnetIds:
        - subnet-xxxxxxxxxxxxxxxxx
        - subnet-yyyyyyyyyyyyyyyyy
package:
  individually: true
custom:
  # (中略)
resources:
  Resources:
    # (中略)
    LambdaSG:
      Type: AWS::EC2::SecurityGroup
      Properties:
        GroupDescription: Allow http to client host
        VpcId: vpc-zzzzzzzzzzzzzzzzz
```

このLambda関数は、Latticeに関連付けしているVPCにアタッチしています。
なお、この関数はサービスプロバイダーではありませんので、LatticeのServiceやTargetGroupを作成する必要はありません。

### デプロイ & 動作確認
これをデプロイします。

```shell
serverless deploy
```

今回は特にLatticeのService等は設定してませんので、イベントトリガーのない単独のLambda関数になります。

デプロイが終わったあとは、Lambda関数を実行します。
ここではAWS CLIで実行しました。

```shell
aws lambda invoke --function-name sample-dev-eksClient /dev/stdout
> {"statusCode":200,"body":"from EKS: Hello Bar EKS Pod!!"}
```

Lambda関数からEKS内のAPIを実行できていることが分かります。

## まとめ

Latticeを使ってEKSとLambdaで相互通信を試してみました。
今回はEKS(Gateway API)やLambdaだけやりましたが、他にもALBやEC2インスタンス等様々なAWSサービスが利用できます。

アプリ開発の視点では、すべてのサービスが1つのネットワークに所属しているように見えます。
他のサービスと連携する場合は、相手側がLambda等のサーバーレス環境なのかEC2ベースのレガシーシステムなのか意識することなく、Latticeのサービスに対してやりとりするだけです。

ロールモデルやセキュリティ(今回はやっていませんがIAMを効かせられます)も確立していますし、ある程度大きな規模のマイクサービス開発の現場で特に力を発揮するサービスかなと思います。
運用ポリシーとして、サービス間連携はすべてLatticeに集約するようにすれば、全体把握しやすく運用が楽になると思います。

今回はLatticeの基本レベルのところを理解できましたが、今後もう少し深堀りしてみたいなと思いました。
