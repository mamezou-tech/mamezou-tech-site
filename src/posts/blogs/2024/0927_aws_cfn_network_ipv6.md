---
title: AWS CloudFormationでやさしくネットワーク構築 - IPv6対応、NATゲートウェイ設置切替作業も易しくてお財布にも優しい！
author: yuji-kurabayashi
date: 2024-09-27
image: true
tags: [ AWS, IaC, CloudFormation, Network, IPv6, DualStack ]
---

# 背景

　AWSを使ってちょっと技術検証してみたいとき、何をするにも必ずと言っていいほどまず最初にVPCをはじめとするネットワークを用意しますよね。そして、できれば新しくVPCから用意してクリーンな状態のネットワークを用意したいですよね。
　VPCとその周辺のネットワークリソースはAWSマネジメントコンソールから簡単に作成できます。しかし、それを後始末する作業が面倒です。いきなりVPCをまるごと削除とかできたら楽なのですがそうはいきません。作成されたたくさんのリソースを依存関係を考慮した順番で（所属や参照している側の末端のリソースから順に）少しずつ削除していかなければならないのが厄介です。
　また、プライベートサブネット内からIPv4でインターネット接続するためにはNATゲートウェイおよびElastic IPが必要になります。これらのリソースは実際の利用有無を問わず、ただ存在しているだけで課金されます。だからといって、インターネット接続が必要になるたびにいちいち手作業でこれらのリソースを作っては消していたのでは面倒です。ちなみに、プライベートサブネット内からIPv6でインターネット接続するためには課金対象リソースを設置する必要がないので、IPv6を利用することでコストを削減できます。
　ネットワーク構築および後始末という儀式的で面倒な作業は、時間を拘束されるうえにストレスなので作業を自動化したいです。そして、課金対象リソース（NATゲートウェイおよびElastic IP）はインターネット接続が必要な時だけピンポイントで利用できるようにして、さらにIPv6も活用して節約したいです。そこで私はIaCとしてVPCネットワーク構築CloudFormationテンプレートを作成してみましたので、ご参考になればと思い紹介させていただきます。

:::check:NATゲートウェイとElastic IPの役割
[NATゲートウェイ](https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/vpc-nat-gateway.html)は、プライベートサブネットからインターネット接続するためのIPv4ローカル→IPv4パブリックアドレス変換や、IPv6-OnlyサブネットからIPv4Only環境に接続するためのIPv6→IPv4アドレス変換(NAT64)をする際に必要になります。そして[Elastic IP](https://docs.aws.amazon.com/ja_jp/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html)は、パブリックIPv4アドレスのことで、これをNATゲートウェイに関連付けてアドレス変換に用います。
:::

:::check:NATゲートウェイとElastic IPの利用料金
[利用料金](https://aws.amazon.com/jp/vpc/pricing/)ですが、東京リージョンの場合、NATゲートウェイは存在しているだけで 0.062(USD/時)で、さらにデータ転送料は 0.062(USD/GB)です。そしてElastic IPは[2024年2月1日よりElastic IPの料金体系が変更](https://aws.amazon.com/jp/blogs/news/new-aws-public-ipv4-address-charge-public-ip-insights/)になり、実質存在しているだけで課金され 0.005(USD/時)です。これらを作成してうっかり消さないまま1か月間（720時間）放置してしまうと、NATゲートウェイは 44.64 USD、Elastic IPは 3.6 USDなので、合計 48.24 USDとなります。（1USD = 150円と仮定して換算すると7,236円となります。全く使っていないにも関わらず、個人利用でこの料金を請求されたらショックを受けてしまいますね。）そしてご丁寧に3AZ分用意していたとなるとさらに3倍になってしまいます。（なんと21,708円・・・コワイデスネ。）
:::

:::check:AWSサービスのIPv6対応状況
IPv6はAWS Summit 2024にて「IPv6 on AWS ～Public IPv4 アドレス削減に向けてできることできないこと」（[動画](https://www.youtube.com/watch?v=SX54RPOVp2g)や[資料](https://pages.awscloud.com/rs/112-TZM-766/images/AWS-20_Network_AWS_Summit_JP_2024.pdf)）で取り上げられており、CloudFormationを作成する際に参考にさせていただきました。IPv6対応状況は、[IPv6 をサポートする AWS サービス](https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/aws-ipv6-support.html)にまとめられています。ここに載っているサービスのみがIPv6に対応しており、逆に載っていないサービスはIPv6には対応していないということになります。
:::

:::check:AWS CloudFormationについて
[CloudFormation](https://docs.aws.amazon.com/ja_jp/AWSCloudFormation/latest/UserGuide/Welcome.html)は特に何も用意せずともお手軽に利用できて便利なので私は気に入っています。最低限テキストエディタさえあればCloudFormationテンプレートを用意できます。ひとたびテンプレートを用意すれば、自分だけでなく他の人でも簡単に利用出来て、誰でも何度やっても間違いにくく再現性をもって速やかにリソースを作成できて、後始末もとても簡単です。私がCloudFormationを数年前に触ったときはテンプレートパラメータ数が60個までという制限があって引っかかったことがありましたが、今では200個まで指定可能になっていて、いろいろと[制限](https://docs.aws.amazon.com/ja_jp/AWSCloudFormation/latest/UserGuide/cloudformation-limits.html)が緩和されたり[機能の充実](https://speakerdeck.com/konokenj/iac-updates-2024-05?slide=22)が図られています。2024年には[IaCジェネレーター](https://docs.aws.amazon.com/ja_jp/AWSCloudFormation/latest/UserGuide/generate-IaC.html)が提供され、既存リソースからCloudFormationテンプレートを出力できるようになりました。この機能が提供されたことで、最初にAWSマネジメントコンソールで試行錯誤しながら手作業で用意したリソースをIaCジェネレーターでCloudFormationテンプレート出力して、これを使いやすく整理して使う、といった使い方ができるので便利です。
:::

# ネットワーク構築CloudFormationテンプレート概要

早速ですが、作成したCloudFormationテンプレートについて説明します。

## ネットワーク構築CloudFormationテンプレートyamlファイル

<span style="font-size: 150%;"><b>[cfn_network.yaml](https://github.com/yuji-kurabayashi/cloudformation_templates/blob/main/cfn_network.yaml)</b></span>

CloudFormationテンプレートを作成する際に私が目指したコンセプトは以下の通りです。

1. AWSマネジメントコンソール操作でのVPC作成時と同等のリソースを作成できる
1. IPv4だけでなくIPv6にも対応している
1. 課金対象リソース（NATゲートウェイとElastic IP）の作成および削除の切り替えを楽に行うことができる

## インフラ構成図

作成したCloudFormationテンプレートを使って用意できるインフラ構成図です。

![ネットワーク構成図](/img/blogs/2024/0927_aws_cfn_network_ipv6/cfn_network.jpg)

　パブリックサブネットがAZごとに2つずつありますが、これには理由があります。IPv6Onlyサブネット向けにNAT64機能を用意しようと思って、IPv6OnlyサブネットにNATゲートウェイを立てようとしたのですが、立てられないことに検証時に気が付きました。よく考えればわかることなのですが、NATゲートウェイはIPv4にアドレス変換するものなので、IPv4が利用できるサブネット（IPv4OnlyまたはDualStack）にしか立てられないという制限があります。そこで、NATゲートウェイ設置用のパブリックサブネットを用意して、これとは別にNATゲートウェイを立てないパブリックサブネットを用意すれば、プロトコルスタックに制限がなくなると考えました。

:::column:構成図の描画ツール
私はこれまでAWSインフラ構成図を描くときは、[AWS アーキテクチャアイコン](https://aws.amazon.com/jp/architecture/icons/)のパワーポイントからアイコンを探してExcel方眼紙にコピー＆ペーストして、 Alt + Tab で2つのファイルをバタバタ往復していました。今回は初めて[draw.io](https://www.drawio.com/)を使って描いてみましたが、バタバタから解放されて快適でした。
:::

## ルートテーブルおよびルーティング内容

ルートテーブルは作成する各サブネット単位で作成し、それぞれ以下のようにルーティング設定をします。ターゲットがNATゲートウェイになっているルートに関しては、NATゲートウェイを作成する設定が有効になったら作成され、無効になったら削除されます。

### NATゲートウェイ設置用パブリックサブネット

| 送信先 | ターゲット | 用途 | CFn設定によるルート設置条件 |
| --- | --- | --- | --- |
| 0.0.0.0/0 | インターネットゲートウェイ | インターネット接続(IPv4) | なし（常に） |
| ::/0 | インターネットゲートウェイ | インターネット接続(IPv6) | IPv6が有効である場合 |
| AWS所有のS3用マネージドプレフィックスリスト | VPCエンドポイント | S3接続 | 設定が有効な場合 |
| AWS所有のDynamoDB用マネージドプレフィックスリスト | VPCエンドポイント | DynamoDB接続 | 設定が有効な場合 |
| CFnで作成したVPCのCIDR(IPv4) | local | VPC内ローカル接続(IPv4) | なし（AWSが強制的に用意する） |
| CFnで作成したVPCのCIDR(IPv6) | local | VPC内ローカル接続(IPv6) | なし（AWSが強制的に用意する） |

### パブリックサブネット

| 送信先 | ターゲット | 用途 | CFn設定によるルート設置条件 |
| --- | --- | --- | --- |
| 0.0.0.0/0 | インターネットゲートウェイ | インターネット接続(IPv4) | サブネットがIPv6Onlyではない場合 |
| ::/0 | インターネットゲートウェイ | インターネット接続(IPv6) | サブネットがIPv4Onlyではない場合 |
| 64:ff9b::/96 | NATゲートウェイ | NAT64 | サブネットがIPv6Onlyである場合、なおかつNATゲートウェイが有効である場合 |
| AWS所有のS3用マネージドプレフィックスリスト | VPCエンドポイント | S3接続 | 設定が有効な場合 |
| AWS所有のDynamoDB用マネージドプレフィックスリスト | VPCエンドポイント | DynamoDB接続 | 設定が有効な場合 |
| CFnで作成したVPCのCIDR(IPv4) | local | VPC内ローカル接続(IPv4) | なし（AWSが強制的に用意する） |
| CFnで作成したVPCのCIDR(IPv6) | local | VPC内ローカル接続(IPv6) | なし（AWSが強制的に用意する） |

### プライベートサブネット

| 送信先 | ターゲット | 用途 | CFn設定によるルート設置条件 |
| --- | --- | --- | --- |
| 0.0.0.0/0 | NATゲートウェイ | インターネット接続(IPv4) | サブネットがIPv6Onlyではない場合、なおかつNATゲートウェイが有効である場合 |
| ::/0 | Egress-Onlyインターネットゲートウェイ | インターネット接続(IPv6) | サブネットがIPv4Onlyではない場合 |
| 64:ff9b::/96 | NATゲートウェイ | NAT64 | サブネットがIPv6Onlyである場合、なおかつNATゲートウェイが有効である場合 |
| AWS所有のS3用マネージドプレフィックスリスト | VPCエンドポイント | S3接続 | 設定が有効な場合 |
| AWS所有のDynamoDB用マネージドプレフィックスリスト | VPCエンドポイント | DynamoDB接続 | 設定が有効な場合 |
| CFnで作成したVPCのCIDR(IPv4) | local | VPC内ローカル接続(IPv4) | なし（AWSが強制的に用意する） |
| CFnで作成したVPCのCIDR(IPv6) | local | VPC内ローカル接続(IPv6) | なし（AWSが強制的に用意する） |

## ネットワーク構築CloudFormationテンプレートの機能および注意点

作成したCloudFormationテンプレートの機能および利用する際の注意点について、ポイントを絞ってテンプレートでの出現順に説明します。詳細な説明はCloudFormationテンプレートに記載してあります。説明が全部英語になっていますが、これは国際化を意識しているという意図ではないです。ただCloudFormationテンプレートではマルチバイト文字の表示が化けてしまうため、（拙いですが）英語にしているだけです。

:::column:翻訳ツール
[DeepL翻訳](https://www.deepl.com/ja/translator)には大変お世話になりました。
:::

### 課金対象リソース（NATゲートウェイとElastic IP）利用切り替え

|![NATゲートウェイ有効化](/img/blogs/2024/0927_aws_cfn_network_ipv6/cfn_enable_natgw.jpg)|
|:--|

**課金対象リソース（NATゲートウェイとElastic IP）の作成（削除）およびルーティング（解除）をたった1つの設定で切り替え可能です。**

NATゲートウェイおよびElastic IPを作成すると、IPv6Onlyサブネットの場合は自動的にサブネットの[DNS64を有効にして、NAT64のためにNATゲートウェイルーティング](https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/nat-gateway-nat64-dns64.html)を用意します。また、IPv6Onlyではないプライベートサブネットの場合は自動的に[プライベートサブネットからのインターネット接続のためにNATゲートウェイルーティング](https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/nat-gateway-scenarios.html)を用意します。

### IPv6有効化

|![IPv6有効化](/img/blogs/2024/0927_aws_cfn_network_ipv6/cfn_enable_ipv6.jpg)|
|:--|

構築するVPCネットワーク全体でIPv6を有効にするかどうかを設定します。
**IPv6を有効にするかどうかはCloudFormationスタック作成時に決めて指定してください。作成後に変更はできません。**

これはCloudFormationテンプレートの実装の都合による制約となります。VPCとIPv6CIDRブロックの関連付けが完了するまでサブネットの作成を条件付きで待機させています。関連付けが終わってからでないと、サブネットにIPv6CIDRを割り当てる際にVPCからIPv6CIDRブロックを参照できずにエラーになってしまいます。このエラー発生を回避するために、テンプレート内では[AWS::CloudFormation::WaitConditionHandle](https://docs.aws.amazon.com/ja_jp/AWSCloudFormation/latest/UserGuide/aws-resource-cloudformation-waitconditionhandle.html) および [AWS::CloudFormation::WaitCondition](https://docs.aws.amazon.com/ja_jp/AWSCloudFormation/latest/UserGuide/aws-resource-cloudformation-waitcondition.html) を使って条件付き待機をさせていますが、このリソースがスタックの更新には対応していないため、スタック作成時に確定させる必要があります。

```yaml
  VPC:
    Type: AWS::EC2::VPC
    ・・・省略・・・

  VPCIpv6CidrBlock:
    Type: AWS::EC2::VPCCidrBlock
    Condition: EnableIpv6CidrBlock
    Properties:
      AmazonProvidedIpv6CidrBlock: true
      VpcId: !Ref VPC

  NoWaitHandle:
    Type: AWS::CloudFormation::WaitConditionHandle

# AWS::CloudFormation::WaitConditionHandle Updates aren't supported for this resource. see https://docs.aws.amazon.com/ja_jp/AWSCloudFormation/latest/UserGuide/aws-resource-cloudformation-waitconditionhandle.html
  VPCIpv6CidrBlockWaitHandle:
    Condition: EnableIpv6CidrBlock
    DependsOn: VPCIpv6CidrBlock
    Type: AWS::CloudFormation::WaitConditionHandle

# AWS::CloudFormation::WaitCondition Updates aren't supported. see https://docs.aws.amazon.com/ja_jp/AWSCloudFormation/latest/UserGuide/aws-resource-cloudformation-waitcondition.html
  EnableIpv6CidrBlockWaitCondition:
    Type: AWS::CloudFormation::WaitCondition
    Properties:
      Handle: !If [ EnableIpv6CidrBlock, !Ref VPCIpv6CidrBlockWaitHandle, !Ref NoWaitHandle ]
      Timeout: 1
      Count: 0

  PublicSubnet1:
    Type: AWS::EC2::Subnet
    Condition: CreateSubnet1
    DependsOn: EnableIpv6CidrBlockWaitCondition
    Properties:
      VpcId: !Ref VPC
      Ipv6CidrBlock:
        Fn::If:
          - PublicSubnet1Ipv4Only
          - !Ref AWS::NoValue
          - !Select [ 3, !Cidr [ !Select [ 0, !GetAtt VPC.Ipv6CidrBlocks ], 9, 64 ] ]
    ・・・省略・・・
```

### VPC

|![VPC](/img/blogs/2024/0927_aws_cfn_network_ipv6/cfn_vpc.jpg)|
|:--|

#### IPAddressPrefix

VPC CIDRのIPアドレス前半部分です。**この値は作成する各サブネットにも適用されます。** 別途新しくVPCを立てたい場合は、別途CloudFormationスタックを作成して、ここの値に他のVPCでは使っていない別のものを指定します。例えば、VPCを既に10.0で始まるIPアドレスCIDRブロックで作成している場合は、10.1や10.2、172.16、192.168などにすることで新しくVPCを立てることができます。

### サブネットアベイラビリティーゾーン

|![サブネットAZ](/img/blogs/2024/0927_aws_cfn_network_ipv6/cfn_subnet.jpg)|
|:--|

最大で3AZ分のサブネットを作成できます。それぞれ1AZにつき、NATゲートウェイ設置用パブリックサブネット・パブリックサブネット・プライベートサブネットを1つずつ作成し、さらにNATゲートウェイが有効である場合はNATゲートウェイとElastic IPを1セット作成します。検証などで可用性があまり重要なファクターではない場合は、1AZ分のみ作成するようにするとNATゲートウェイを有効にした際のコストを抑えられます。

### Gateway型VPCエンドポイント

|![VPCエンドポイント](/img/blogs/2024/0927_aws_cfn_network_ipv6/cfn_vpc_endpoint.jpg)|
|:--|

この設定を有効にすると、インターネットを経由することなくS3やDynamoDBにアクセスできるようになります。作成したすべてのサブネットに対して[Gateway型VPCエンドポイント](https://docs.aws.amazon.com/ja_jp/vpc/latest/privatelink/gateway-endpoints.html)のアクセス経路を用意します。

:::check:Gateway型VPCエンドポイントのススメ
　パブリックサブネットであればVPCエンドポイントを用意せずともインターネットゲートウェイ経由でアクセスできるため不要かもしれませんが、敢えて用意しています。S3バケットを作成する際には、「パブリックアクセスをすべてブロック」という設定がデフォルトで有効が選択された状態になっています。これはS3バケットを不必要に外部に公開するべきではないという方針によるものであると思われます。この設定が有効になっているとパブリックサブネットであってもインターネット経由でのアクセスができなくなるため、敢えて用意しています。ちなみにAWSマネジメントコンソールからVPCを作成するときにS3のVPCエンドポイントも一緒に作成できますが、こちらはプライベートサブネットしかルートを用意してくれません。
　また、Interface型VPCエンドポイントは存在しているだけでも課金されるタイプで有料であるのに対して、Gateway型VPCエンドポイントは無料です。Gateway型VPCエンドポイントを利用すれば、インターネットを経由せずにセキュアかつ高速に無料で通信できるため積極的に使いたいです。そして、Gateway型VPCエンドポイントはS3とDynamoDBしかないので、DynamoDBもついでに用意しました。ちなみに当記事を執筆した時点では、S3はIPv6をサポートしていますが、DynamoDBはIPv6をサポートしていません。
:::

### プレフィックスリスト

|![プレフィックスリスト](/img/blogs/2024/0927_aws_cfn_network_ipv6/cfn_prefixlist.jpg)|
|:--|

この設定を有効にすると、以下の各CIDRについてIPv4およびIPv6両方の[プレフィックスリスト](https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/working-with-managed-prefix-lists.html)を作成します。
（AZ）と書いてあるものは、AZでまとめたもの（AZ1 & AZ2 & AZ3のリスト）と、各AZ単独のもの（AZ1のみのリスト、AZ2のみのリスト、AZ3のみのリスト）をそれぞれ作成します。
また、作成対象に指定していないAZについてはリストには含まれません。作成対象に指定していないAZ単独のものについては空のリストを作成します。

* VPC
* （AZ）NATゲートウェイに紐づけたパブリックElastic IP（※NATゲートウェイ無効時は空のリスト）
* （AZ）NATゲートウェイ設置用パブリックサブネット
* （AZ）パブリックサブネット
* （AZ）プライベートサブネット

:::check:プレフィックスリストのススメ
　例えばセキュリティグループのルール設定でよくありがちなのは、VPC内からだったり、サブネット3AZ分からのアクセスを許可したいというケースです。その際にVPCだったりサブネット3AZ分のCIDR値をコピー＆ペーストしてベタ打ちして設定していませんか。ルールを設定する際に説明の記載が不十分だと、ベタ打ちされたCIDRが一体何のCIDRを表しているのかわからなくなることが怖いです。何だかわからなければ迂闊に変更もできません。また、CIDRの割り当てを変更した場合は、漏れなく全てのベタ打ちしたCIDR値を修正しなければならなくなります。
　そこで、自前でプレフィックスリストを用意してCIDR値を管理して、各セキュリティグループではプレフィックスリストIDで参照するようにします。プレフィックスリストを利用すれば、その説明だけを見て使うものを判断すればよく、その説明に該当する実際の正確なCIDR値がどうなっているのかを調べたうえにコピー＆ペーストする必要がありません。プレフィックスリストには物理名もタグも付与できますし、詳細な説明をしっかり書いておけば、それを参照するセキュリティグループのルールにいちいち説明を書く必要もなくなります。しかもルールで設定したプレフィックスリストにはリンクが張られるのですぐに詳細を確認できます。そして、もしCIDRの割り当てを変更した場合は、プレフィックスリストのCIDR値だけを修正すれば、参照する各セキュリティグループにも全く影響を与えずに変更を反映できます。プレフィックスリストを使うことはメリットしかないと思います。
:::

### 各サブネット詳細

ここでは代表して Public Subnet 1 を掲載します。

|![各サブネット詳細](/img/blogs/2024/0927_aws_cfn_network_ipv6/cfn_subnet_detail.jpg)|
|:--|

#### IPAddressSuffix, CIDR

VPC CIDRの範囲内で、各サブネットに割り振るCIDRのIPアドレス後半部分および範囲を設定します。どうにも腑に落ちないのですが、ここの設定内容によってはCIDRの範囲が他のサブネットと競合していないのに何故か競合している旨のエラーになってしまうことがあります。私の感覚だとCIDRの大きさを揃えてみるとうまくいきやすいです。（ちなみにデフォルト値では9つ全てのサブネットのCIDRを20に統一しています。）

エラーメッセージ例

```
Resource handler returned message: "The CIDR '10.0.48.0/18' conflicts with another subnet (Service: Ec2, Status Code: 400, Request ID: 7a6b3e27-785e-4bfb-b3c2-f65fe5fb9f4b)" (RequestToken: ed254eda-4a4a-b990-97bd-222529064425, HandlerErrorCode: AlreadyExists)
```

#### InternetProtocolStack

各サブネットのプロトコルスタックは「IPv4Only」「DualStack」「IPv6Only」のいずれかで作成できます。なお、IPv6を有効化していない場合は強制的に「IPv4Only」が指定されているものとして取り扱われます。
NATゲートウェイ設置用パブリックサブネットのプロトコルスタックは、IPv6が有効の場合はDualStack、無効の場合はIPv4Onlyに自動的に決まるため、設定を直接指定できません。
そして、IPv6Onlyに関しては以下の注意点があります。

**プロトコルスタックをIPv6Onlyにするかどうかはサブネット作成時に予め方針を決めておいて、作成後は変更しないことを強く推奨します。**

なぜなら、サブネット作成後にプロトコルスタックを他のものからIPv6Onlyに変更したり、逆にIPv6Onlyから他のものに変更すること自体が不可能だからです。AWSマネジメントコンソールでの操作でもサブネット作成後に変更する方法が見当たらなかったです。
どうしても変更したい場合はサブネット再作成になるというインパクトの大きい副作用があります。CloudFormationでも再作成する必要がある場合はリソースの置換（新規作成＆削除）扱いとなります。再作成によってサブネットIDが変化するため置換前のサブネットを参照しているリソースに影響があったり、置換前のサブネット上に作成されていたリソースがどうなるかは保証できません。以下、変更する際の注意点です。

* IPv4OnlyからDualStack、DualStackからIPv4Onlyへの変更は可能で、サブネット再作成は発生しません。
* IPv4OnlyからIPv6Only、IPv6OnlyからIPv4Onlyへの変更は可能ですが、IPv6Only絡みの変更が伴うため、サブネット再作成が発生します。
* IPv6OnlyからDualStack、DualStackからIPv6Onlyへの変更はエラーになります。これはCloudFormationテンプレートの実装（IPv6CIDRの割り当て）の都合によるものです。変更したい場合はいったんIPv4Onlyに変更してからであれば変更できます。ただし、IPv6Only絡みの変更が伴うため、サブネット再作成が発生します。

# ネットワーク構築および疎通検証

実際に[ネットワーク構築CloudFormationテンプレート](#%E3%83%8D%E3%83%83%E3%83%88%E3%83%AF%E3%83%BC%E3%82%AF%E6%A7%8B%E7%AF%89cloudformation%E3%83%86%E3%83%B3%E3%83%97%E3%83%AC%E3%83%BC%E3%83%88yaml%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB)を使ってネットワークを構築し、疎通検証します。

## 検証観点

DualStack、IPv4Only、IPv6Onlyな各パブリック・プライベートサブネットにて、DualStack、IPv4Only、IPv6Onlyな環境にそれぞれインターネット接続ができるかどうかを確認します。
これをNATゲートウェイを設置しない場合と設置した場合それぞれで確認します。NATゲートウェイ設置前後では以下の変化があることを期待します。

* プライベートサブネットからのIPv4での接続は、ローカルアドレス変換が機能して接続できるようになるはず
* IPv6OnlyサブネットからIPv4Onlyへの接続は、NAT64が機能して接続できるようになるはず

## ネットワーク構築CloudFormationテンプレート設定内容

ネットワーク構築CloudFormationテンプレートを使ってスタックを作成します。パラメータ設定内容の要点は以下の通りです。3つのAZをそれぞれIPv4Only, DualStack, IPv6Only用として利用して、検証をまとめていっぺんに行います。

1. 課金対象リソース（NATゲートウェイとElastic IP）利用切り替え
    * <Charged\> Enable NAT Gateway and Elastic IP
        * enabled: **trueに設定してスタックを作成・更新すると課金されます。ご注意ください。** NATゲートウェイを設置する場合はtrue、設置しない場合はfalseをセットします。そしてNATゲートウェイ設置ありの検証が済み次第、コストを抑えるため速やかにここをfalseに設定してスタックを更新します。
1. IPv6有効化
    * Enable IPv6
        * enabled: true
1. VPC
    * VPC Settings
        * IPAddressPrefix: 既存のVPCと重複しないものを設定します。
1. サブネットアベイラビリティーゾーン
    * Subnet 1 Settings
        * Create: true
    * Subnet 2 Settings
        * Create: true
    * Subnet 3 Settings
        * Create: true
1. Gateway型VPCエンドポイント
    * Gateway Type VPC Endpoint Settings
        * CreateS3: true
1. 各サブネット詳細
    * Public Subnet 1 Settings
        * InternetProtocolStack: IPv4Only
    * Private Subnet 1 Settings
        * InternetProtocolStack: IPv4Only
    * Public Subnet 2 Settings
        * InternetProtocolStack: DualStack
    * Private Subnet 2 Settings
        * InternetProtocolStack: DualStack
    * Public Subnet 3 Settings
        * InternetProtocolStack: IPv6Only
    * Private Subnet 3 Settings
        * InternetProtocolStack: IPv6Only

:::alert:こんなときはスタック作成をリトライ
IPv6を有効にした場合、稀にVPC IPv6CIDRのプレフィックスリストのリソースや各サブネットのリソース作成時に、`Template error: Fn::Select cannot select nonexistent value at index 0`というよくわからないエラーが出てスタック作成が失敗することがあります。そのような場合はエラーになったスタックを一旦削除してから改めて新規作成します。
このメッセージは、IPv6CIDRブロックの参照 `!Select [ 0, !GetAtt VPC.Ipv6CidrBlocks ]` でエラーになっているため出ています。条件付き待機を使ってIPv6CIDRがVPCに関連付けが終わるまでサブネットの作成を待機させていて、CloudFormationのスタック作成イベント発生順番を見ても関連付けが終わった後でサブネット作成が始まっているにもかかわらず、何故か関連付けが終わる前に採番しようとしてエラーになるような動きをすることがあります。
:::

## 検証方法

疎通検証用として各サブネットにEC2を立てます。EC2を採用した理由は、当記事を執筆した時点では[IPv6 をサポートする AWS サービス](https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/aws-ipv6-support.html)の中でもIPv6Onlyに対応したAWSサービスは数少なく、コンピューティングリソースだとEC2ぐらいしか選択肢がないからです。

そして、EC2のUserDataに以下のスクリプトをセットして検証します。UserDataはEC2初回起動時に実行されます。以下のスクリプトは[ネットワーク構築疎通確認用CloudFormationテンプレートyamlファイル](#%E3%83%8D%E3%83%83%E3%83%88%E3%83%AF%E3%83%BC%E3%82%AF%E6%A7%8B%E7%AF%89%E7%96%8E%E9%80%9A%E7%A2%BA%E8%AA%8D%E7%94%A8cloudformation%E3%83%86%E3%83%B3%E3%83%97%E3%83%AC%E3%83%BC%E3%83%88yaml%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB)のEC2インスタンスリソースのUserDataから抜粋したもので、`${EnableNatGateway}`, `${EC2NetworkConnectionTestResultS3Bucket}`, `${SubnetKey}`, `${ProtocolStack}`はCloudFormation内の参照で置き換わります。

```bash
#!/bin/bash
yum update -y
dualstack=$(curl -s -m 10 -o /dev/null --write-out "%{http_code}" 'https://www.google.com' 2>&1)
if [ "$dualstack" = "200" ]; then
    echo -n "OK" > dualstack.txt
else
    echo -n "" > dualstack.txt
fi
ipv4Only=$(curl -s -m 10 -o /dev/null --write-out "%{http_code}" 'https://ipv4.google.com' 2>&1)
if [ "$ipv4Only" = "200" ]; then
    echo -n "OK" > ipv4Only.txt
else
    echo -n "" > ipv4Only.txt
fi
ipv6Only=$(curl -s -m 10 -o /dev/null --write-out "%{http_code}" 'https://ipv6.google.com' 2>&1)
if [ "$ipv6Only" = "200" ]; then
    echo -n "OK" > ipv6Only.txt
else
    echo -n "" > ipv6Only.txt
fi
aws configure set default.s3.use_dualstack_endpoint true
aws configure set default.s3.addressing_style virtual
EnableNatGateway="${EnableNatGateway}"
NatGateway="disabledNATGW"
if [ "$EnableNatGateway" = "true" ]; then
    NatGateway="enabledNATGW"
fi
S3UrlPrefix=s3://"${EC2NetworkConnectionTestResultS3Bucket}"/"${SubnetKey}"_"${ProtocolStack}"_"$NatGateway"_
aws s3 cp dualstack.txt "$S3UrlPrefix"dualstack.txt
aws s3 cp ipv4Only.txt "$S3UrlPrefix"ipv4Only.txt
aws s3 cp ipv6Only.txt "$S3UrlPrefix"ipv6Only.txt
```

### スクリプト内容

1. DualStack、IPv4Only、IPv6Onlyそれぞれの環境にインターネット接続し、成功ならば「OK」を書き込んだテキストファイルを作成し、失敗であれば空ファイルを作成します。
    * DualStack: [https://www.google.com](https://www.google.com)
    * IPv4Only: [https://ipv4.google.com](https://ipv4.google.com)
    * IPv6Only: [https://ipv6.google.com](https://ipv6.google.com)
1. IPv6Only環境でもS3に接続できるようにAWS CLIの設定をします。（[後述](#%E5%95%8F%E9%A1%8C%E7%82%B9%E3%81%9D%E3%81%AE%EF%BC%92-s3%E3%81%AB%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB%E3%81%8C%E3%82%A2%E3%83%83%E3%83%97%E3%83%AD%E3%83%BC%E3%83%89%E3%81%95%E3%82%8C%E3%81%AA%E3%81%8B%E3%81%A3%E3%81%9F)）
1. 接続結果である各テキストファイルをS3にアップロードします。

こうしておくと、S3バケットの中のオブジェクト一覧を表示してファイル名とファイルサイズを見るだけで全ての結果が一目瞭然で、2バイトなら成功で0バイトなら失敗ということがわかります。curlのステータスコードをそのままテキストファイルに書き込んでアップロードすればよさそうですが、curlは成功ならば「200」を返し、失敗ならば「000」を返すので、ファイルサイズがどちらも3バイトになり、ファイルの中身まで確認しないと結果が分からないことが面倒なので、わざわざ判定処理を入れてファイルサイズだけで結果が分かるようにしています。そして、S3にテキストファイルをアップロードしていること自体にも意味があって、Gateway型VPCエンドポイント設置によるS3への接続確認も兼ねることができます。こうしてEC2インスタンスに全く接続することなく自動的に検証結果がS3に集まってきて速やかに結果確認して検証を済ませられるため、EC2インスタンス稼働時間やNATゲートウェイ設置時間で発生するコストを抑えられるというメリットがあります。

### ネットワーク構築疎通確認用CloudFormationテンプレートyamlファイル

<span style="font-size: 150%;"><b>[cfn_network_test.yaml](https://github.com/yuji-kurabayashi/cloudformation_templates/blob/main/cfn_network_test.yaml)</b></span>

検証作業を速やかに済ませたいのでCloudFormationテンプレートを用意しました。

ネットワーク構築で用意したVPCエンドポイントを使ってS3に接続できることを確認をするため、一切のパブリックアクセスを禁じた結果格納用S3バケットを作成しています。

```yaml
  EC2NetworkConnectionTestResultS3Bucket:
    Type: AWS::S3::Bucket
    DeletionPolicy: Retain
    Properties:
      AccessControl: Private
      PublicAccessBlockConfiguration:
        BlockPublicAcls: True
        BlockPublicPolicy: True
        IgnorePublicAcls: True
        RestrictPublicBuckets: True
```

[Fn::ForEach](https://docs.aws.amazon.com/ja_jp/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-foreach.html)を使って、EC2インスタンスを各サブネットに一気に作成して起動します。なお、各EC2インスタンスが接続結果ファイルをアップロードする前に結果格納用S3バケットが用意されている必要があるため、念のため結果格納用S3バケットの作成が完了するまでEC2インスタンスの作成を待機するようにしています。

```yaml
  Fn::ForEach::EC2Instances:
    - SubnetKey
    - !Ref TestTargetSubnetKeys
    - EC2Instance${SubnetKey}:
        Type: AWS::EC2::Instance
        DependsOn: EC2NetworkConnectionTestResultS3Bucket
        Properties:
          ImageId: !Ref EC2ImageId
          InstanceType: !Ref EC2InstanceType
          NetworkInterfaces:
            - DeviceIndex: 0
              SubnetId:
                Fn::ImportValue: !Sub ${ReferenceNetworkStackName}-${SubnetKey}Id
  ・・・省略・・・
```

### ネットワーク構築疎通確認用CloudFormationテンプレート設定内容

**実際にスタックを作成するとEC2インスタンスを起動しますので課金されます。ご注意ください。検証が終わったら速やかにスタックを削除します。**

ネットワーク構築疎通確認用CloudFormationテンプレートは、ネットワーク構築CloudFormationテンプレートで作成したスタックの出力を[Fn::ImportValue](https://docs.aws.amazon.com/ja_jp/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-importvalue.html)を使って参照します。ReferenceNetworkStackNameに出力を参照するスタック名を入力してスタックを作成するだけです。スタックを作成したら、全てのEC2インスタンスが起動するまで（6サブネット×3接続=18個ファイルがアップロードされるまで）待機します。（稀にEC2インスタンスの起動に失敗することがありますが、その際は再度スタックを作り直します。）スタックを作成するだけで検証結果が出て、スタック全体が作成完了する頃には全ての結果がS3バケットに集まっていると思います。

|![検証テンプレートパラメータ設定画面](/img/blogs/2024/0927_aws_cfn_network_ipv6/cfn_network_test_parameter.jpg)|
|:--|

スタック作成時に以下の確認がありますが、全てにチェックを入れてスタックを作成します。

![検証テンプレート確認画面](/img/blogs/2024/0927_aws_cfn_network_ipv6/cfn_create_stack_confirm.jpg)

## 検証中に遭遇した問題点

検証時にIPv6Only環境で問題に遭遇したのでまとめておきます。

### 問題点その１ EC2インスタンス作成に失敗した

当初はインスタンスタイプは t2.micro で検証していました。IPv4OnlyおよびDualStackサブネット上ではEC2インスタンスが作成できたのですが、IPv6Onlyサブネット上では`IPv6 addresses are not supported on t2.micro`というメッセージが出て失敗してしまいました。IPv6Onlyに対応したインスタンスタイプを指定する必要があるとのことでした。

[こちら](https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/aws-ipv6-support.html)によると、

> Amazon EC2 は、Nitro システムに基づくインスタンスを IPv6 専用サブネットに起動することをサポートしています。

さらに、[こちら](https://aws.amazon.com/en/blogs/networking-and-content-delivery/introducing-ipv6-only-subnets-and-ec2-instances/)によると、

> Select an AMI and a Nitro instance type (for example, t3.micro)

と書いてあるので、インスタンスタイプを t3.micro にしたところEC2インスタンス作成に成功しました。

### 問題点その２ S3にファイルがアップロードされなかった

問題点その１をクリアしてIPv6Onlyサブネット上でEC2インスタンスが無事起動しましたが、テキストファイルがいつになってもアップロードされませんでした。IPv6Only環境からS3にアクセスするにはデュアルスタックエンドポイントを使うための特別な設定が必要とのことでした。UserDataのコマンドの中にちょっと見慣れないものがあったと思いますが、これがIPv6Only環境からS3にCLIで接続する場合に必要な設定となります。（[参考](https://docs.aws.amazon.com/ja_jp/AmazonS3/latest/userguide/dual-stack-endpoints.html)）

```bash
aws configure set default.s3.use_dualstack_endpoint true
aws configure set default.s3.addressing_style virtual
```

## 検証結果

CloudFormationスタックの出力のリンク先を開くだけで結果がわかります。S3バケットはスタックを削除しても残りますので、結果を確認したらバケットを空にしてバケットを削除します。

|![検証結果リンク](/img/blogs/2024/0927_aws_cfn_network_ipv6/cfn_network_test_link.jpg)|
|:--|

### NATゲートウェイ設置なし

サイズが 2.0 B ならばインターネット接続成功、0 B ならば失敗となります。全てのサブネットのEC2から漏れなく結果テキストファイルがS3バケットにアップロードされました。この結果を以って、どのサブネットからでもS3アクセスが可能であることが確認できました。また、接続先がIPv6に対応していれば、プライベートからであってもIPv6ならばNATゲートウェイ要らずでインターネット接続できるので、IPv6を利用すればコストを抑えられそうです。

|![検証結果NATGWなし](/img/blogs/2024/0927_aws_cfn_network_ipv6/cfn_network_test_result_disable_natgw.jpg)|
|:--|

| 接続元 サブネット | 接続元 プロトコルスタック | 接続先 IPv4Only | 接続先 DualStack | 接続先 IPv6Only | コメント |
| --- | --- | --- | --- | --- | --- |
| PublicSubnet1 | IPv4Only | OK | OK | NG | IPv4はインターネットゲートウェイで接続可能 |
| PublicSubnet2 | DualStack | OK | OK | OK | IPv6もインターネットゲートウェイで接続可能 |
| PublicSubnet3 | IPv6Only | NG | OK | OK | 同上 |
| PrivateSubnet1 | IPv4Only | NG | NG | NG | IPv4だけではプライベートからは一切接続できない |
| PrivateSubnet2 | DualStack | NG | OK | OK | IPv6はEgress-Onlyインターネットゲートウェイで接続可能 |
| PrivateSubnet3 | IPv6Only | NG | OK | OK | 同上 |

### NATゲートウェイ設置あり

IPv4OnlyからIPv6Onlyへの接続を除く全ての接続が成功するようになりました。よって、NATゲートウェイ設置切り替えがしっかり機能していることが確認できました。

|![検証結果NATGWあり](/img/blogs/2024/0927_aws_cfn_network_ipv6/cfn_network_test_result_enable_natgw.jpg)|
|:--|

| 接続元 サブネット | 接続元 プロトコルスタック | 接続先 IPv4Only | 接続先 DualStack | 接続先 IPv6Only | コメント |
| --- | --- | --- | --- | --- | --- |
| PublicSubnet1 | IPv4Only | OK | OK | NG ||
| PublicSubnet2 | DualStack | OK | OK | OK ||
| PublicSubnet3 | IPv6Only | NG→OK | OK | OK | NAT64が行われてIPv4にも接続成功 |
| PrivateSubnet1 | IPv4Only | NG→OK | NG→OK | NG | IPv4のローカルアドレス変換が行われて接続成功 |
| PrivateSubnet2 | DualStack | NG→OK | OK | OK | 同上 |
| PrivateSubnet3 | IPv6Only | NG→OK | OK | OK | NAT64が行われてIPv4にも接続成功 |

## IPv6Onlyまとめ

最後に、検証や記事執筆での情報収集でIPv6Onlyについてわかったことをまとめておきます。

1. サブネットのIPv6Onlyの設定は作成後に変更できないので作成時に決める必要があります。
1. （当たり前ですが、）NATゲートウェイなどIPv4での利用が前提となるリソースはIPv6Onlyには作成できません。
1. IPv6OnlyからIPv4Onlyへ通信するためには、NAT64するためのNATゲートウェイが必要でコストがかかります。
1. IPv6Onlyで利用できるAWSサービスは数少ないです。
1. EC2はIPv6Onlyで利用できますが、IPv6Onlyに対応したEC2インスタンスタイプ（t3.microなどのNitroシステムに基づくインスタンス）である必要があります。
1. IPv6Only環境でAWS CLIを使ってS3アクセスするためには、デュアルスタックエンドポイントを使うための特別な設定が必要になります。

IPv6Onlyはちょっと検証しただけでもいろいろと躓きポイントが出てきましたが、DualStackは特に引っかかるところもなかったので、もしIPv6対応をするならばDualStackにすることが現実的であると思いました。ただし、IPv4とIPv6どちらも考慮したネットワーク設定が必要になるので、IPv4Onlyの時よりもネットワーク設定に手間がかかるということを承知の上で対応する必要があります。

# 最後に

　私が豆蔵に転職するまでは、私はひたすらWebアプリケーション開発をやっていて、恥ずかしながらインフラ経験が皆無でネットワークやクラウドの知識も経験も皆無の状態で豆蔵に転職してきました。AWS？ Amazon Web Service？ なぜみんなそんなにアマゾンでお買い物したいのですか？ というレベルでした。入社後は是非ともクラウドをキャッチアップしてほしいということで、AWSを使ったプロジェクトに参画となりました。そして、その後私が参画した全てのプロジェクトでAWSが使われていました。
　これまで私が参画したプロジェクトを思い返してみると、ネットワーク系はインフラの中のインフラで重要なので、プロジェクトでは専任のインフラ有識者が設計や構築を担当していることが多かったです。開発者としてプロジェクトに参画した場合は、開発者はネットワーク関連や請求関連のリソースには触れられないようにロールを制限されていることが多かったです。よって、開発者がネットワークを構築する機会はめったにありません。保守プロジェクトならば当然ネットワーク構築済みなのでなおさらです。コストについてもAWSマネジメントコンソールログイン直後のダッシュボードで総額の表示が見えたときはびっくりはするものの、自分に直接請求が来ることはないのでコストに対する意識が希薄になりがちです。
　自分で個人的にAWSアカウントを取得して検証でもしない限り、ネットワークに触れる機会は少ないと思います。そして私は、自分のアカウントを取得すること自体も葛藤があって躊躇っていました。自分のアカウントであれば自分の責任で以って自分の思うがままに自由に検証できると思う一方、もし悪用されたら大変だとか、よくわかっていないので知らぬ間に意図しないとんでもない額の請求が来たらどうしようという不安があったからです。そして、悪用がこわいのでAWSアカウントを取得したらすぐやることを事前によく調べてから思い切ってアカウントを取得しました。
　自分のアカウントで独力で実際にネットワーク系を構築して理解すると、ネットワークはどんなサービスにも付いて回る概念なので、その他のAWSサービスについても理解しやすくなりました。もっとはやくやればよかったです。
　コストについても自分に請求が来て痛い目を見るので、具体的に何にコストがかかっているのかまで嫌でも意識するようになりました。コストを意識することは仕事においても重要で役立ちます。私は過去に、せっかく頑張って調べながらNATゲートウェイを用意してインターネット接続できるようにしたので、これはそのままにしておこうと思ってNATゲートウェイを放置してしまいました。その結果ちょっと高い授業料を払うことになり痛い目を見ました。これは何か対策が必要だと危機感を抱きました。そこで、存在するだけでもお金がかかるリソースを意図せず放置してしまわないように、コストが閾値を超えるとアラート発砲メールが飛ぶような仕掛けを用意しました。
　この失敗がきっかけで、NATゲートウェイを使う時だけすぐに用意して、使い終わったらすぐに消せるようにしたいと思い、それを実現するCloudFormationテンプレートを作りました。テンプレートを作って本記事を執筆しながら色々と調べているうちに、IPv6にするとコストを抑えられることも知ったので取り入れました。こうしてネットワーク構築の要素を追加で盛り込みながらCloudFormationテンプレートを作ってみたので、お役立ていただければ幸いです。
