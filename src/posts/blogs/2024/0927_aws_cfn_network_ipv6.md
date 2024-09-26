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
　ネットワーク構築および後始末という儀式的で面倒な作業は、時間を拘束されるうえにストレスなので作業を自動化したいです。そして、課金対象リソース（NATゲートウェイおよびElastic IP）はインターネット接続が必要な時だけピンポイントで利用できるようにして、さらにIPv6も活用して節約したいです。そこで私は、楽をするために苦労したい、そして汎用的な仕掛けを考えて作ることが好き、ということでIaCとしてVPCネットワーク構築CloudFormationテンプレートを作成しました。そしてこのCloudFormationテンプレートは、もはや私にとっては技術検証のお供として欠かせなくなっていて、便利なので是非ご紹介したいと思いました。

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

CloudFormationテンプレートを作成する際に私が目指したコンセプトは以下の通りです。

1. AWSマネジメントコンソール操作でのVPC作成時と同等のリソースを作成できる
1. IPv4だけでなくIPv6にも対応している
1. 課金対象リソース（NATゲートウェイとElastic IP）の作成および削除の切り替えを楽に行うことができる

<details>
<summary><span style="font-size: 150%; color: red;"><b>ネットワーク構築CloudFormationテンプレートyamlファイル（ここをクリックするとコード全体を表示 or 非表示にします）</b></span></summary>

```yaml:cfn_network.yaml
AWSTemplateFormatVersion: 2010-09-09
Description: >-
  Create IPv4-Only or Dual Stack(IPv4 & IPv6) or IPv6-Only network resources.
  We can create network resources easily using AWS Management Console, but cleaning up these resources is always troublesome.
  NAT Gateway and Elastic IP Address resources are charged just by existing.
  If you want to use the IPv6 protocol, Egress-Only Internet Gateway is created on VPC.
  If you use the IPv6 protocol from Private Subnet, you can use the Egress-Only Internet Gateway resource for your Internet connection free of charge.
  This CloudFormation template lets you easily and instantly create or update or delete these resources, helping you reduce costs and troublesome.

Metadata:
  AWS::CloudFormation::Interface:
    ParameterGroups:
      - Label:
          default: Network Resources Name Prefix
        Parameters:
          - ResourcePrefix
      - Label:
          default: <Charged> Enable NAT Gateway and Elastic IP
        Parameters:
          - EnableNatGateway
      - Label:
          default: Enable IPv6
        Parameters:
          - EnableIpv6CidrBlock
      - Label:
          default: VPC Settings
        Parameters:
          - VpcName
          - VpcCidrBlockIpAddressPrefix
          - VpcCidrBlockIpAddressSuffix
          - VpcCidrBlockCidr
      - Label:
          default: Subnet 1 Settings
        Parameters:
          - CreateSubnet1
          - Subnet1AvailabilityZone
      - Label:
          default: Subnet 2 Settings
        Parameters:
          - CreateSubnet2
          - Subnet2AvailabilityZone
      - Label:
          default: Subnet 3 Settings
        Parameters:
          - CreateSubnet3
          - Subnet3AvailabilityZone
      - Label:
          default: Gateway Type VPC Endpoint Settings
        Parameters:
          - CreateS3VpcEndpoint
          - CreateDynamoDBVpcEndpoint
      - Label:
          default: PrefixList Settings
        Parameters:
          - CreatePrefixList
      - Label:
          default: Public Subnet 1 For NAT Gateway Settings
        Parameters:
          - PublicSubnet1ForNATGWName
          - PublicSubnet1ForNATGWCidrBlockIpAddressSuffix
          - PublicSubnet1ForNATGWCidrBlockCidr
      - Label:
          default: Public Subnet 1 Settings
        Parameters:
          - PublicSubnet1Name
          - PublicSubnet1CidrBlockIpAddressSuffix
          - PublicSubnet1CidrBlockCidr
          - PublicSubnet1InternetProtocolStack
      - Label:
          default: Private Subnet 1 Settings
        Parameters:
          - PrivateSubnet1Name
          - PrivateSubnet1CidrBlockIpAddressSuffix
          - PrivateSubnet1CidrBlockCidr
          - PrivateSubnet1InternetProtocolStack
      - Label:
          default: Public Subnet 2 For NAT Gateway Settings
        Parameters:
          - PublicSubnet2ForNATGWName
          - PublicSubnet2ForNATGWCidrBlockIpAddressSuffix
          - PublicSubnet2ForNATGWCidrBlockCidr
      - Label:
          default: Public Subnet 2 Settings
        Parameters:
          - PublicSubnet2Name
          - PublicSubnet2CidrBlockIpAddressSuffix
          - PublicSubnet2CidrBlockCidr
          - PublicSubnet2InternetProtocolStack
      - Label:
          default: Private Subnet 2 Settings
        Parameters:
          - PrivateSubnet2Name
          - PrivateSubnet2CidrBlockIpAddressSuffix
          - PrivateSubnet2CidrBlockCidr
          - PrivateSubnet2InternetProtocolStack
      - Label:
          default: Public Subnet 3 For NAT Gateway Settings
        Parameters:
          - PublicSubnet3ForNATGWName
          - PublicSubnet3ForNATGWCidrBlockIpAddressSuffix
          - PublicSubnet3ForNATGWCidrBlockCidr
      - Label:
          default: Public Subnet 3 Settings
        Parameters:
          - PublicSubnet3Name
          - PublicSubnet3CidrBlockIpAddressSuffix
          - PublicSubnet3CidrBlockCidr
          - PublicSubnet3InternetProtocolStack
      - Label:
          default: Private Subnet 3 Settings
        Parameters:
          - PrivateSubnet3Name
          - PrivateSubnet3CidrBlockIpAddressSuffix
          - PrivateSubnet3CidrBlockCidr
          - PrivateSubnet3InternetProtocolStack

    ParameterLabels:

      ResourcePrefix:
        default: prefix

      EnableNatGateway:
        default: enabled

      EnableIpv6CidrBlock:
        default: enabled

      VpcName:
        default: name
      VpcCidrBlockIpAddressPrefix:
        default: IPAddressPrefix
      VpcCidrBlockIpAddressSuffix:
        default: IPAddressSuffix
      VpcCidrBlockCidr:
        default: CIDR

      CreateSubnet1:
        default: Create
      Subnet1AvailabilityZone:
        default: AvailabilityZone

      CreateSubnet2:
        default: Create
      Subnet2AvailabilityZone:
        default: AvailabilityZone

      CreateSubnet3:
        default: Create
      Subnet3AvailabilityZone:
        default: AvailabilityZone

      CreateS3VpcEndpoint:
        default: CreateS3
      CreateDynamoDBVpcEndpoint:
        default: CreateDynamoDB

      CreatePrefixList:
        default: Create

      PublicSubnet1ForNATGWName:
        default: name
      PublicSubnet1ForNATGWCidrBlockIpAddressSuffix:
        default: IPAddressSuffix
      PublicSubnet1ForNATGWCidrBlockCidr:
        default: CIDR

      PublicSubnet1Name:
        default: name
      PublicSubnet1CidrBlockIpAddressSuffix:
        default: IPAddressSuffix
      PublicSubnet1CidrBlockCidr:
        default: CIDR
      PublicSubnet1InternetProtocolStack:
        default: InternetProtocolStack

      PrivateSubnet1Name:
        default: name
      PrivateSubnet1CidrBlockIpAddressSuffix:
        default: IPAddressSuffix
      PrivateSubnet1CidrBlockCidr:
        default: CIDR
      PrivateSubnet1InternetProtocolStack:
        default: InternetProtocolStack

      PublicSubnet2ForNATGWName:
        default: name
      PublicSubnet2ForNATGWCidrBlockIpAddressSuffix:
        default: IPAddressSuffix
      PublicSubnet2ForNATGWCidrBlockCidr:
        default: CIDR

      PublicSubnet2Name:
        default: name
      PublicSubnet2CidrBlockIpAddressSuffix:
        default: IPAddressSuffix
      PublicSubnet2CidrBlockCidr:
        default: CIDR
      PublicSubnet2InternetProtocolStack:
        default: InternetProtocolStack

      PrivateSubnet2Name:
        default: name
      PrivateSubnet2CidrBlockIpAddressSuffix:
        default: IPAddressSuffix
      PrivateSubnet2CidrBlockCidr:
        default: CIDR
      PrivateSubnet2InternetProtocolStack:
        default: InternetProtocolStack

      PublicSubnet3ForNATGWName:
        default: name
      PublicSubnet3ForNATGWCidrBlockIpAddressSuffix:
        default: IPAddressSuffix
      PublicSubnet3ForNATGWCidrBlockCidr:
        default: CIDR

      PublicSubnet3Name:
        default: name
      PublicSubnet3CidrBlockIpAddressSuffix:
        default: IPAddressSuffix
      PublicSubnet3CidrBlockCidr:
        default: CIDR
      PublicSubnet3InternetProtocolStack:
        default: InternetProtocolStack

      PrivateSubnet3Name:
        default: name
      PrivateSubnet3CidrBlockIpAddressSuffix:
        default: IPAddressSuffix
      PrivateSubnet3CidrBlockCidr:
        default: CIDR
      PrivateSubnet3InternetProtocolStack:
        default: InternetProtocolStack

Parameters:

  ResourcePrefix:
    Description: <Required> This value is used as the resource name prefix.
    Type: String
    MinLength: 1

  EnableNatGateway:
    Description: <Charged> Create NAT Gateway and Elastic IP. Note that NAT Gateways and Elastic IPs are created per availability zone and are charged separately. These resources are required for IPv4 local to IPv4 public address translation for Internet connectivity from private subnets and IPv6 to IPv4 address translation (NAT64) for connecting from an IPv6-Only subnet to an IPv4-Only environment In the case of IPv6-Only, it is required for IPv4-Only. For IPv6-Only, creating the NAT gateway and Elastic IP will automatically enable DNS64 for the subnet and prepare the NAT gateway routing for NAT64. If not IPv6-Only, creating a NAT gateway and Elastic IP automatically prepares the NAT gateway routing for Internet connectivity from the private subnet.
    Type: String
    Default: false
    AllowedValues: [ true, false ]

  EnableIpv6CidrBlock:
    Description: <Cannot update after create stack> Whether IPv6 is enabled or not should be decided and specified when the CloudFormation stack is created. It cannot be changed after creation. Requests an Amazon-provided IPv6 CIDR block with a /56 prefix length for the VPC. You cannot specify the range of IPv6 addresses or the size of the CIDR block. If specified this 'false', (Public or Private) Subnet internet protocol stack 'DualStack' setting regard as 'IPv4Only'. see https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/aws-ipv6-support.html
    Type: String
    Default: true
    AllowedValues: [ true, false ]

  VpcName:
    Description: <Optional> VPC resource name.
    Type: String
  VpcCidrBlockIpAddressPrefix:
    Description: <Required> VPC primary CIDR block IP address prefix conforming to RFC 1918 and AWS user guide. This IP address prefix is automatically applied to the subnet IP address prefix. For example (10.X.X.X, 172.16.X.X, 172.18.X.X - 172.31.X.X, 192.168.X.X). 10.0.0.0 - 10.255.255.255 (10/8 prefix), 172.16.0.0 - 172.16.255.255, 172.18.0.0 - 172.31.255.255 (172.16/12 prefix), 192.168.0.0 - 192.168.255.255 (192.168/16 prefix). see https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/vpc-cidr-blocks.html, and see http://www.faqs.org/rfcs/rfc1918.html
    Type: String
    Default: 10.0
    AllowedPattern: "^(10\\.([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])|172\\.(16|1[8-9]|2[0-9]|3[0-1])|192\\.168)$"
    ConstraintDescription: xxx.xxx
  VpcCidrBlockIpAddressSuffix:
    Description: <Required> VPC primary CIDR block IP address suffix.
    Type: String
    Default: 0.0
    AllowedPattern: "^([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\\.([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])$"
    ConstraintDescription: xxx.xxx
  VpcCidrBlockCidr:
    Description: <Required> VPC primary CIDR block CIDR (16 - 28). /28 - 16 IP Addresses, /27 - 32 IPs, /26 - 64 IPs, /25 - 128 IPs, /24 - 256 IPs, /23 - 512 IPs, /22 - 1024 IPs, /21 - 2048 IPs, /20 - 4096 IPs, /19 - 8192 IPs, /18 - 16384 IPs, /17 - 32768 IPs, /16 - 65536 IPs.
    Type: String
    Default: 16
    AllowedPattern: "^(1[6-9]|2[0-8])$"
    ConstraintDescription: xx

  CreateSubnet1:
    Description: Create (Public and Private) Subnet 1 or not.
    Type: String
    Default: true
    AllowedValues: [ true, false ]
  Subnet1AvailabilityZone:
    Description: (Public and Private) Subnet 1 availability zone name.
    Type: AWS::EC2::AvailabilityZone::Name
    MinLength: 1
    Default: ap-northeast-1a

  CreateSubnet2:
    Description: Create (Public and Private) Subnet 2 or not.
    Type: String
    Default: false
    AllowedValues: [ true, false ]
  Subnet2AvailabilityZone:
    Description: (Public and Private) Subnet 2 availability zone name.
    Type: AWS::EC2::AvailabilityZone::Name
    MinLength: 1
    Default: ap-northeast-1c

  CreateSubnet3:
    Description: Create (Public and Private) Subnet 3 or not.
    Type: String
    Default: false
    AllowedValues: [ true, false ]
  Subnet3AvailabilityZone:
    Description: (Public and Private) Subnet 3 availability zone name.
    Type: AWS::EC2::AvailabilityZone::Name
    MinLength: 1
    Default: ap-northeast-1d

  CreateS3VpcEndpoint:
    Description: Create gateway type S3 VPC Endpoint or not.
    Type: String
    Default: true
    AllowedValues: [ true, false ]
  CreateDynamoDBVpcEndpoint:
    Description: Create gateway type dynamoDB VPC Endpoint or not.
    Type: String
    Default: false
    AllowedValues: [ true, false ]

  CreatePrefixList:
    Description: Create PrefixList or not.
    Type: String
    Default: true
    AllowedValues: [ true, false ]

  PublicSubnet1ForNATGWName:
    Description: <Optional> Public Subnet 1 for NAT Gateway resource name.
    Type: String
  PublicSubnet1ForNATGWCidrBlockIpAddressSuffix:
    Description: Public Subnet 1 for NAT Gateway CIDR block IP address suffix. see https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/subnet-sizing.html
    Type: String
    Default: 0.0
    AllowedPattern: "^([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\\.([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])$"
    ConstraintDescription: xxx.xxx
  PublicSubnet1ForNATGWCidrBlockCidr:
    Description: Public Subnet 1 for NAT Gateway CIDR block CIDR (16 - 28).
    Type: String
    Default: 20
    AllowedPattern: "^(1[6-9]|2[0-8])$"
    ConstraintDescription: xx

  PublicSubnet1Name:
    Description: <Optional> Public Subnet 1 resource name.
    Type: String
  PublicSubnet1CidrBlockIpAddressSuffix:
    Description: Public Subnet 1 CIDR block IP address suffix. see https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/subnet-sizing.html
    Type: String
    Default: 48.0
    AllowedPattern: "^([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\\.([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])$"
    ConstraintDescription: xxx.xxx
  PublicSubnet1CidrBlockCidr:
    Description: Public Subnet 1 CIDR block CIDR (16 - 28).
    Type: String
    Default: 20
    AllowedPattern: "^(1[6-9]|2[0-8])$"
    ConstraintDescription: xx
  PublicSubnet1InternetProtocolStack:
    Description: Public Subnet 1 Internet Protocol Stack. If IPv6 is not enabled, it is forced to consider IPv4Only. It is strongly recommended that the decision to set the protocol stack to IPv6Only be made at the time of subnet creation and not changed after creation. Also, since a NAT Gateway cannot be created on an IPv6Only subnet, the protocol stack should be set to DualStack instead of IPv6Only on the subnet where the NAT Gateway is planned to be created. It can be changed, but this has the side effect of recreating the subnet. If you do change it, please make sure that the side-effect is not a problem before doing so.
    Type: String
    Default: DualStack
    AllowedValues: [ IPv4Only, DualStack, IPv6Only ]

  PrivateSubnet1Name:
    Description: <Optional> Private Subnet 1 resource name.
    Type: String
  PrivateSubnet1CidrBlockIpAddressSuffix:
    Description: Private Subnet 1 CIDR block IP address suffix. see https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/subnet-sizing.html
    Type: String
    Default: 96.0
    AllowedPattern: "^([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\\.([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])$"
    ConstraintDescription: xxx.xxx
  PrivateSubnet1CidrBlockCidr:
    Description: Private Subnet 1 CIDR block CIDR (16 - 28).
    Type: String
    Default: 20
    AllowedPattern: "^(1[6-9]|2[0-8])$"
    ConstraintDescription: xx
  PrivateSubnet1InternetProtocolStack:
    Description: Private Subnet 1 Internet Protocol Stack. If IPv6 is not enabled, it is forced to consider IPv4Only. It is strongly recommended that you decide whether or not to set the protocol stack to IPv6Only when you create the subnet, and that you do not change it once it is created. It can be changed, but this has the side effect of recreating the subnet. If you do change it, please make sure that the side-effect is not a problem before doing so.
    Type: String
    Default: DualStack
    AllowedValues: [ IPv4Only, DualStack, IPv6Only ]

  PublicSubnet2ForNATGWName:
    Description: <Optional> Public Subnet 2 for NAT Gateway resource name.
    Type: String
  PublicSubnet2ForNATGWCidrBlockIpAddressSuffix:
    Description: Public Subnet 2 for NAT Gateway CIDR block IP address suffix. see https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/subnet-sizing.html
    Type: String
    Default: 16.0
    AllowedPattern: "^([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\\.([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])$"
    ConstraintDescription: xxx.xxx
  PublicSubnet2ForNATGWCidrBlockCidr:
    Description: Public Subnet 2 for NAT Gateway CIDR block CIDR (16 - 28).
    Type: String
    Default: 20
    AllowedPattern: "^(1[6-9]|2[0-8])$"
    ConstraintDescription: xx

  PublicSubnet2Name:
    Description: <Optional> Public Subnet 2 resource name.
    Type: String
  PublicSubnet2CidrBlockIpAddressSuffix:
    Description: Public Subnet 2 CIDR block IP address suffix. see https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/subnet-sizing.html
    Type: String
    Default: 64.0
    AllowedPattern: "^([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\\.([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])$"
    ConstraintDescription: xxx.xxx
  PublicSubnet2CidrBlockCidr:
    Description: Public Subnet 2 CIDR block CIDR (16 - 28).
    Type: String
    Default: 20
    AllowedPattern: "^(1[6-9]|2[0-8])$"
    ConstraintDescription: xx
  PublicSubnet2InternetProtocolStack:
    Description: Public Subnet 2 Internet Protocol Stack. If IPv6 is not enabled, it is forced to consider IPv4Only. It is strongly recommended that the decision to set the protocol stack to IPv6Only be made at the time of subnet creation and not changed after creation. Also, since a NAT Gateway cannot be created on an IPv6Only subnet, the protocol stack should be set to DualStack instead of IPv6Only on the subnet where the NAT Gateway is planned to be created. It can be changed, but this has the side effect of recreating the subnet. If you do change it, please make sure that the side-effect is not a problem before doing so.
    Type: String
    Default: DualStack
    AllowedValues: [ IPv4Only, DualStack, IPv6Only ]

  PrivateSubnet2Name:
    Description: <Optional> Private Subnet 2 resource name.
    Type: String
  PrivateSubnet2CidrBlockIpAddressSuffix:
    Description: Private Subnet 2 CIDR block IP address suffix. see https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/subnet-sizing.html
    Type: String
    Default: 112.0
    AllowedPattern: "^([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\\.([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])$"
    ConstraintDescription: xxx.xxx
  PrivateSubnet2CidrBlockCidr:
    Description: Private Subnet 2 CIDR block CIDR (16 - 28).
    Type: String
    Default: 20
    AllowedPattern: "^(1[6-9]|2[0-8])$"
    ConstraintDescription: xx
  PrivateSubnet2InternetProtocolStack:
    Description: Private Subnet 2 Internet Protocol Stack. If IPv6 is not enabled, it is forced to consider IPv4Only. It is strongly recommended that you decide whether or not to set the protocol stack to IPv6Only when you create the subnet, and that you do not change it once it is created. It can be changed, but this has the side effect of recreating the subnet. If you do change it, please make sure that the side-effect is not a problem before doing so.
    Type: String
    Default: DualStack
    AllowedValues: [ IPv4Only, DualStack, IPv6Only ]

  PublicSubnet3ForNATGWName:
    Description: <Optional> Public Subnet 3 for NAT Gateway resource name.
    Type: String
  PublicSubnet3ForNATGWCidrBlockIpAddressSuffix:
    Description: Public Subnet 3 for NAT Gateway CIDR block IP address suffix. see https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/subnet-sizing.html
    Type: String
    Default: 32.0
    AllowedPattern: "^([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\\.([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])$"
    ConstraintDescription: xxx.xxx
  PublicSubnet3ForNATGWCidrBlockCidr:
    Description: Public Subnet 3 for NAT Gateway CIDR block CIDR (16 - 28).
    Type: String
    Default: 20
    AllowedPattern: "^(1[6-9]|2[0-8])$"
    ConstraintDescription: xx

  PublicSubnet3Name:
    Description: <Optional> Public Subnet 3 resource name.
    Type: String
  PublicSubnet3CidrBlockIpAddressSuffix:
    Description: Public Subnet 3 CIDR block IP address suffix. see https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/subnet-sizing.html
    Type: String
    Default: 80.0
    AllowedPattern: "^([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\\.([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])$"
    ConstraintDescription: xxx.xxx
  PublicSubnet3CidrBlockCidr:
    Description: Public Subnet 3 CIDR block CIDR (16 - 28).
    Type: String
    Default: 20
    AllowedPattern: "^(1[6-9]|2[0-8])$"
    ConstraintDescription: xx
  PublicSubnet3InternetProtocolStack:
    Description: Public Subnet 3 Internet Protocol Stack. If IPv6 is not enabled, it is forced to consider IPv4Only. It is strongly recommended that the decision to set the protocol stack to IPv6Only be made at the time of subnet creation and not changed after creation. Also, since a NAT Gateway cannot be created on an IPv6Only subnet, the protocol stack should be set to DualStack instead of IPv6Only on the subnet where the NAT Gateway is planned to be created. It can be changed, but this has the side effect of recreating the subnet. If you do change it, please make sure that the side-effect is not a problem before doing so.
    Type: String
    Default: DualStack
    AllowedValues: [ IPv4Only, DualStack, IPv6Only ]

  PrivateSubnet3Name:
    Description: <Optional> Private Subnet 3 resource name.
    Type: String
  PrivateSubnet3CidrBlockIpAddressSuffix:
    Description: Private Subnet 3 CIDR block IP address suffix. see https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/subnet-sizing.html
    Type: String
    Default: 128.0
    AllowedPattern: "^([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])\\.([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])$"
    ConstraintDescription: xxx.xxx
  PrivateSubnet3CidrBlockCidr:
    Description: Private Subnet 3 CIDR block CIDR (16 - 28).
    Type: String
    Default: 20
    AllowedPattern: "^(1[6-9]|2[0-8])$"
    ConstraintDescription: xx
  PrivateSubnet3InternetProtocolStack:
    Description: Private Subnet 3 Internet Protocol Stack. If IPv6 is not enabled, it is forced to consider IPv4Only. It is strongly recommended that you decide whether or not to set the protocol stack to IPv6Only when you create the subnet, and that you do not change it once it is created. It can be changed, but this has the side effect of recreating the subnet. If you do change it, please make sure that the side-effect is not a problem before doing so.
    Type: String
    Default: DualStack
    AllowedValues: [ IPv4Only, DualStack, IPv6Only ]

Conditions:

  NotSpecifiedVpcName: !Equals [ !Ref VpcName, "" ]
  EnableIpv6CidrBlock: !Equals [ !Ref EnableIpv6CidrBlock, true ]
  CreatePrefixList: !Equals [ !Ref CreatePrefixList, true ]
  EnableNatGateway: !Equals [ !Ref EnableNatGateway, true ]

  CreateSubnet1: !Equals [ !Ref CreateSubnet1, true ]
  EnableNatGateway1:
    Fn::And:
      - !Condition CreateSubnet1
      - !Condition EnableNatGateway
  EnableIpv6CidrBlock1:
    Fn::And:
      - !Condition CreateSubnet1
      - !Condition EnableIpv6CidrBlock
  NotSpecifiedPublicSubnet1ForNATGWName: !Equals [ !Ref PublicSubnet1ForNATGWName, "" ]
  PublicSubnet1Ipv6Only:
    Fn::And:
      - !Condition CreateSubnet1
      - !Condition EnableIpv6CidrBlock
      - !Equals [ !Ref PublicSubnet1InternetProtocolStack, IPv6Only ]
  NotPublicSubnet1Ipv6Only:
    Fn::And:
      - !Condition CreateSubnet1
      - !Not [ !Condition PublicSubnet1Ipv6Only ]
  PublicSubnet1Ipv4Only:
    Fn::And:
      - !Condition CreateSubnet1
      - Fn::Or:
          - !Not [ !Condition EnableIpv6CidrBlock ]
          - !Equals [ !Ref PublicSubnet1InternetProtocolStack, IPv4Only ]
  NotPublicSubnet1Ipv4Only:
    Fn::And:
      - !Condition CreateSubnet1
      - !Not [ !Condition PublicSubnet1Ipv4Only ]
  EnablePublicSubnet1NAT64:
    Fn::And:
      - !Condition EnableNatGateway1
      - !Condition PublicSubnet1Ipv6Only
  NotSpecifiedPublicSubnet1Name: !Equals [ !Ref PublicSubnet1Name, "" ]

  PrivateSubnet1Ipv6Only:
    Fn::And:
      - !Condition CreateSubnet1
      - !Condition EnableIpv6CidrBlock
      - !Equals [ !Ref PrivateSubnet1InternetProtocolStack, IPv6Only ]
  NotPrivateSubnet1Ipv6Only:
    Fn::And:
      - !Condition CreateSubnet1
      - !Not [ !Condition PrivateSubnet1Ipv6Only ]
  EnablePrivateNatGateway1:
    Fn::And:
      - !Condition EnableNatGateway1
      - !Condition NotPrivateSubnet1Ipv6Only
  PrivateSubnet1Ipv4Only:
    Fn::And:
      - !Condition CreateSubnet1
      - Fn::Or:
          - !Not [ !Condition EnableIpv6CidrBlock ]
          - !Equals [ !Ref PrivateSubnet1InternetProtocolStack, IPv4Only ]
  NotPrivateSubnet1Ipv4Only:
    Fn::And:
      - !Condition CreateSubnet1
      - !Not [ !Condition PrivateSubnet1Ipv4Only ]
  EnablePrivateSubnet1NAT64:
    Fn::And:
      - !Condition EnableNatGateway1
      - !Condition PrivateSubnet1Ipv6Only
  NotSpecifiedPrivateSubnet1Name: !Equals [ !Ref PrivateSubnet1Name, "" ]

  CreateSubnet2: !Equals [ !Ref CreateSubnet2, true ]
  EnableNatGateway2:
    Fn::And:
      - !Condition CreateSubnet2
      - !Condition EnableNatGateway
  EnableIpv6CidrBlock2:
    Fn::And:
      - !Condition CreateSubnet2
      - !Condition EnableIpv6CidrBlock
  NotSpecifiedPublicSubnet2ForNATGWName: !Equals [ !Ref PublicSubnet2ForNATGWName, "" ]
  PublicSubnet2Ipv6Only:
    Fn::And:
      - !Condition CreateSubnet2
      - !Condition EnableIpv6CidrBlock
      - !Equals [ !Ref PublicSubnet2InternetProtocolStack, IPv6Only ]
  NotPublicSubnet2Ipv6Only:
    Fn::And:
      - !Condition CreateSubnet2
      - !Not [ !Condition PublicSubnet2Ipv6Only ]
  PublicSubnet2Ipv4Only:
    Fn::And:
      - !Condition CreateSubnet2
      - Fn::Or:
          - !Not [ !Condition EnableIpv6CidrBlock ]
          - !Equals [ !Ref PublicSubnet2InternetProtocolStack, IPv4Only ]
  NotPublicSubnet2Ipv4Only:
    Fn::And:
      - !Condition CreateSubnet2
      - !Not [ !Condition PublicSubnet2Ipv4Only ]
  EnablePublicSubnet2NAT64:
    Fn::And:
      - !Condition EnableNatGateway2
      - !Condition PublicSubnet2Ipv6Only
  NotSpecifiedPublicSubnet2Name: !Equals [ !Ref PublicSubnet2Name, "" ]

  PrivateSubnet2Ipv6Only:
    Fn::And:
      - !Condition CreateSubnet2
      - !Condition EnableIpv6CidrBlock
      - !Equals [ !Ref PrivateSubnet2InternetProtocolStack, IPv6Only ]
  NotPrivateSubnet2Ipv6Only:
    Fn::And:
      - !Condition CreateSubnet2
      - !Not [ !Condition PrivateSubnet2Ipv6Only ]
  EnablePrivateNatGateway2:
    Fn::And:
      - !Condition EnableNatGateway2
      - !Condition NotPrivateSubnet2Ipv6Only
  PrivateSubnet2Ipv4Only:
    Fn::And:
      - !Condition CreateSubnet2
      - Fn::Or:
          - !Not [ !Condition EnableIpv6CidrBlock ]
          - !Equals [ !Ref PrivateSubnet2InternetProtocolStack, IPv4Only ]
  NotPrivateSubnet2Ipv4Only:
    Fn::And:
      - !Condition CreateSubnet2
      - !Not [ !Condition PrivateSubnet2Ipv4Only ]
  EnablePrivateSubnet2NAT64:
    Fn::And:
      - !Condition EnableNatGateway2
      - !Condition PrivateSubnet2Ipv6Only
  NotSpecifiedPrivateSubnet2Name: !Equals [ !Ref PrivateSubnet2Name, "" ]

  CreateSubnet3: !Equals [ !Ref CreateSubnet3, true ]
  EnableNatGateway3:
    Fn::And:
      - !Condition CreateSubnet3
      - !Condition EnableNatGateway
  EnableIpv6CidrBlock3:
    Fn::And:
      - !Condition CreateSubnet3
      - !Condition EnableIpv6CidrBlock
  NotSpecifiedPublicSubnet3ForNATGWName: !Equals [ !Ref PublicSubnet3ForNATGWName, "" ]
  PublicSubnet3Ipv6Only:
    Fn::And:
      - !Condition CreateSubnet3
      - !Condition EnableIpv6CidrBlock
      - !Equals [ !Ref PublicSubnet3InternetProtocolStack, IPv6Only ]
  NotPublicSubnet3Ipv6Only:
    Fn::And:
      - !Condition CreateSubnet3
      - !Not [ !Condition PublicSubnet3Ipv6Only ]
  PublicSubnet3Ipv4Only:
    Fn::And:
      - !Condition CreateSubnet3
      - Fn::Or:
          - !Not [ !Condition EnableIpv6CidrBlock ]
          - !Equals [ !Ref PublicSubnet3InternetProtocolStack, IPv4Only ]
  NotPublicSubnet3Ipv4Only:
    Fn::And:
      - !Condition CreateSubnet3
      - !Not [ !Condition PublicSubnet3Ipv4Only ]
  EnablePublicSubnet3NAT64:
    Fn::And:
      - !Condition EnableNatGateway3
      - !Condition PublicSubnet3Ipv6Only
  NotSpecifiedPublicSubnet3Name: !Equals [ !Ref PublicSubnet3Name, "" ]

  PrivateSubnet3Ipv6Only:
    Fn::And:
      - !Condition CreateSubnet3
      - !Condition EnableIpv6CidrBlock
      - !Equals [ !Ref PrivateSubnet3InternetProtocolStack, IPv6Only ]
  NotPrivateSubnet3Ipv6Only:
    Fn::And:
      - !Condition CreateSubnet3
      - !Not [ !Condition PrivateSubnet3Ipv6Only ]
  EnablePrivateNatGateway3:
    Fn::And:
      - !Condition EnableNatGateway3
      - !Condition NotPrivateSubnet3Ipv6Only
  PrivateSubnet3Ipv4Only:
    Fn::And:
      - !Condition CreateSubnet3
      - Fn::Or:
          - !Not [ !Condition EnableIpv6CidrBlock ]
          - !Equals [ !Ref PrivateSubnet3InternetProtocolStack, IPv4Only ]
  NotPrivateSubnet3Ipv4Only:
    Fn::And:
      - !Condition CreateSubnet3
      - !Not [ !Condition PrivateSubnet3Ipv4Only ]
  EnablePrivateSubnet3NAT64:
    Fn::And:
      - !Condition EnableNatGateway3
      - !Condition PrivateSubnet3Ipv6Only
  NotSpecifiedPrivateSubnet3Name: !Equals [ !Ref PrivateSubnet3Name, "" ]

  CreateSubnet:
    Fn::Or:
      - !Condition CreateSubnet1
      - !Condition CreateSubnet2
      - !Condition CreateSubnet3

  CreateS3VpcEndpoint:
    Fn::And:
      - !Equals [ !Ref CreateS3VpcEndpoint, true ]
      - !Condition CreateSubnet
  CreateDynamoDBVpcEndpoint:
    Fn::And:
      - !Equals [ !Ref CreateDynamoDBVpcEndpoint, true ]
      - !Condition CreateSubnet

Resources:

##############################
# VPC
##############################

  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: !Sub ${VpcCidrBlockIpAddressPrefix}.${VpcCidrBlockIpAddressSuffix}/${VpcCidrBlockCidr}
      EnableDnsSupport: true
      EnableDnsHostnames: true
      InstanceTenancy: default
      Tags:
        - Key: Name
          Value:
            Fn::If:
              - NotSpecifiedVpcName
              - !Sub ${ResourcePrefix}-vpc
              - !Ref VpcName

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

  VPCIPv4CidrPrefixList:
    Type: AWS::EC2::PrefixList
    Condition: CreatePrefixList
    Properties:
      AddressFamily: IPv4
      Entries:
        -  Cidr: !GetAtt VPC.CidrBlock
           Description: !Sub ${ResourcePrefix} VPC Primary IPv4 CIDR block.
      MaxEntries: 1
      PrefixListName: !Sub ${ResourcePrefix}-vpc-ipv4-cidr-pl
      Tags: 
        - Key: Name
          Value: !Sub ${ResourcePrefix}-vpc-ipv4-cidr-pl

  VPCIPv6CidrPrefixList:
    Type: AWS::EC2::PrefixList
    Condition: CreatePrefixList
    DependsOn: EnableIpv6CidrBlockWaitCondition
    Properties:
      AddressFamily: IPv6
      Entries:
        -  Fn::If:
             - EnableIpv6CidrBlock
             - Cidr: !Select [ 0, !GetAtt VPC.Ipv6CidrBlocks ]
               Description: !Sub ${ResourcePrefix} VPC IPv6 CIDR block.
             - !Ref AWS::NoValue
      MaxEntries: 1
      PrefixListName: !Sub ${ResourcePrefix}-vpc-ipv6-cidr-pl
      Tags: 
        - Key: Name
          Value: !Sub ${ResourcePrefix}-vpc-ipv6-cidr-pl

  InternetGateway:
    Type: AWS::EC2::InternetGateway
    Properties:
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-igw

  VPCInternetGatewayAttachment:
    Type: AWS::EC2::VPCGatewayAttachment
    Properties:
      VpcId: !Ref VPC
      InternetGatewayId: !Ref InternetGateway

  EgressOnlyInternetGateway:
    Type: AWS::EC2::EgressOnlyInternetGateway
    Condition: EnableIpv6CidrBlock
    Properties:
      VpcId: !Ref VPC

##############################
# Public NAT Gateway Network
##############################

  PublicForNATGWNetworkACL:
    Type: AWS::EC2::NetworkAcl
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-public-for-natgw-nacl

  PublicForNATGWNetworkACLEntryEgress:
    Type: AWS::EC2::NetworkAclEntry
    Properties:
      NetworkAclId: !Ref PublicForNATGWNetworkACL
      Egress: true
      RuleNumber : 100
      RuleAction : allow
      Protocol: -1
      CidrBlock: 0.0.0.0/0

  PublicForNATGWNetworkACLEntryIngress:
    Type: AWS::EC2::NetworkAclEntry
    Properties:
      NetworkAclId: !Ref PublicForNATGWNetworkACL
      Egress: false
      RuleNumber : 100
      RuleAction : allow
      Protocol: -1
      CidrBlock: 0.0.0.0/0

  PublicForNATGWNetworkACLEntryEgressIpv6:
    Type: AWS::EC2::NetworkAclEntry
    Condition: EnableIpv6CidrBlock
    Properties:
      NetworkAclId: !Ref PublicForNATGWNetworkACL
      Egress: true
      RuleNumber : 101
      RuleAction : allow
      Protocol: -1
      Ipv6CidrBlock: ::/0

  PublicForNATGWNetworkACLEntryIngressIpv6:
    Type: AWS::EC2::NetworkAclEntry
    Condition: EnableIpv6CidrBlock
    Properties:
      NetworkAclId: !Ref PublicForNATGWNetworkACL
      Egress: false
      RuleNumber : 101
      RuleAction : allow
      Protocol: -1
      Ipv6CidrBlock: ::/0

  NatGatewayEipPrefixList:
    Type: AWS::EC2::PrefixList
    Condition: CreatePrefixList
    Properties:
      AddressFamily: IPv4
      Entries:
        - Fn::If:
          - EnableNatGateway1
          - Cidr: !Join [ '', [ !GetAtt NatGatewayEip1.PublicIp, /32 ] ]
            Description: !Sub ${ResourcePrefix} Nat Gateway 1 Public IP.
          - !Ref AWS::NoValue
        - Fn::If:
          - EnableNatGateway2
          - Cidr: !Join [ '', [ !GetAtt NatGatewayEip2.PublicIp, /32 ] ]
            Description: !Sub ${ResourcePrefix} Nat Gateway 2 Public IP.
          - !Ref AWS::NoValue
        - Fn::If:
          - EnableNatGateway3
          - Cidr: !Join [ '', [ !GetAtt NatGatewayEip3.PublicIp, /32 ] ]
            Description: !Sub ${ResourcePrefix} Nat Gateway 3 Public IP.
          - !Ref AWS::NoValue
      MaxEntries: 3
      PrefixListName: !Sub ${ResourcePrefix}-natgw-eip-pl
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-natgw-eip-pl

  PublicSubnetForNATGWIPv4CidrPrefixList:
    Type: AWS::EC2::PrefixList
    Condition: CreatePrefixList
    Properties:
      AddressFamily: IPv4
      Entries:
        - Fn::If:
          - CreateSubnet1
          - Cidr: !GetAtt PublicSubnet1ForNATGW.CidrBlock
            Description: !Sub ${ResourcePrefix} Public Subnet 1 For NAT Gateway IPv4 CIDR block.
          - !Ref AWS::NoValue
        - Fn::If:
          - CreateSubnet2
          - Cidr: !GetAtt PublicSubnet2ForNATGW.CidrBlock
            Description: !Sub ${ResourcePrefix} Public Subnet 2 For NAT Gateway IPv4 CIDR block.
          - !Ref AWS::NoValue
        - Fn::If:
          - CreateSubnet3
          - Cidr: !GetAtt PublicSubnet3ForNATGW.CidrBlock
            Description: !Sub ${ResourcePrefix} Public Subnet 3 For NAT Gateway IPv4 CIDR block.
          - !Ref AWS::NoValue
      MaxEntries: 3
      PrefixListName: !Sub ${ResourcePrefix}-public-subnet-for-natgw-ipv4-cidr-pl
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-public-subnet-for-natgw-ipv4-cidr-pl

  PublicSubnetForNATGWIPv6CidrPrefixList:
    Type: AWS::EC2::PrefixList
    Condition: CreatePrefixList
    Properties:
      AddressFamily: IPv6
      Entries:
        - Fn::If:
          - EnableIpv6CidrBlock1
          - Cidr: !Select [ 0, !GetAtt PublicSubnet1ForNATGW.Ipv6CidrBlocks ]
            Description: !Sub ${ResourcePrefix} Public Subnet 1 For NAT Gateway IPv6 CIDR block.
          - !Ref AWS::NoValue
        - Fn::If:
          - EnableIpv6CidrBlock2
          - Cidr: !Select [ 0, !GetAtt PublicSubnet2ForNATGW.Ipv6CidrBlocks ]
            Description: !Sub ${ResourcePrefix} Public Subnet 2 For NAT Gateway IPv6 CIDR block.
          - !Ref AWS::NoValue
        - Fn::If:
          - EnableIpv6CidrBlock3
          - Cidr: !Select [ 0, !GetAtt PublicSubnet3ForNATGW.Ipv6CidrBlocks ]
            Description: !Sub ${ResourcePrefix} Public Subnet 3 For NAT Gateway IPv6 CIDR block.
          - !Ref AWS::NoValue
      MaxEntries: 3
      PrefixListName: !Sub ${ResourcePrefix}-public-subnet-for-natgw-ipv6-cidr-pl
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-public-subnet-for-natgw-ipv6-cidr-pl

#---------------------------------------
# Public Subnet 1 For NAT Gateway
#---------------------------------------

  NatGatewayEip1:
    Type: AWS::EC2::EIP
    Condition: EnableNatGateway1
    DependsOn: VPCInternetGatewayAttachment
    Properties:
      Domain: vpc
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-natgw-eip1-${Subnet1AvailabilityZone}

  NatGateway1:
    Type: AWS::EC2::NatGateway
    Condition: EnableNatGateway1
    Properties:
      AllocationId: !GetAtt NatGatewayEip1.AllocationId
      ConnectivityType: public
      SubnetId: !Ref PublicSubnet1ForNATGW
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-natgw1-${Subnet1AvailabilityZone}

  PublicRouteTable1ForNATGW:
    Type: AWS::EC2::RouteTable
    Condition: CreateSubnet1
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-public-rtb1-for-natgw-${Subnet1AvailabilityZone}

  InternetAccessPublicRoute1ForNATGW:
    Type: AWS::EC2::Route
    Condition: CreateSubnet1
    DependsOn: VPCInternetGatewayAttachment
    Properties:
      RouteTableId: !Ref PublicRouteTable1ForNATGW
      DestinationCidrBlock: 0.0.0.0/0
      GatewayId: !Ref InternetGateway

  InternetAccessPublicRoute1IPv6ForNATGW:
    Type: AWS::EC2::Route
    Condition: EnableIpv6CidrBlock1
    DependsOn: VPCInternetGatewayAttachment
    Properties:
      RouteTableId: !Ref PublicRouteTable1ForNATGW
      DestinationIpv6CidrBlock: ::/0
      GatewayId: !Ref InternetGateway

  PublicSubnet1ForNATGW:
    Type: AWS::EC2::Subnet
    Condition: CreateSubnet1
    DependsOn: EnableIpv6CidrBlockWaitCondition
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Ref Subnet1AvailabilityZone
      MapPublicIpOnLaunch: true
      AssignIpv6AddressOnCreation: !If [ EnableIpv6CidrBlock1, true, false ]
      CidrBlock: !Sub ${VpcCidrBlockIpAddressPrefix}.${PublicSubnet1ForNATGWCidrBlockIpAddressSuffix}/${PublicSubnet1ForNATGWCidrBlockCidr}
      Ipv6CidrBlock:
        Fn::If:
          - EnableIpv6CidrBlock1
          - !Select [ 0, !Cidr [ !Select [ 0, !GetAtt VPC.Ipv6CidrBlocks ], 9, 64 ] ]
          - !Ref AWS::NoValue
      Ipv6Native: false
      EnableDns64: false
      Tags:
        - Key: Name
          Value:
            Fn::If:
              - NotSpecifiedPublicSubnet1ForNATGWName
              - !Sub ${ResourcePrefix}-public-subnet1-for-natgw-${Subnet1AvailabilityZone}
              - !Ref PublicSubnet1ForNATGWName

  PublicSubnet1ForNATGWRouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Condition: CreateSubnet1
    Properties:
      SubnetId: !Ref PublicSubnet1ForNATGW
      RouteTableId: !Ref PublicRouteTable1ForNATGW

  PublicSubnet1ForNATGWNACLAssociation:
    Type: AWS::EC2::SubnetNetworkAclAssociation
    Condition: CreateSubnet1
    Properties:
      SubnetId: !Ref PublicSubnet1ForNATGW
      NetworkAclId: !Ref PublicForNATGWNetworkACL

  NatGatewayEip1PrefixList:
    Type: AWS::EC2::PrefixList
    Condition: CreatePrefixList
    Properties:
      AddressFamily: IPv4
      Entries:
        - Fn::If:
          - EnableNatGateway1
          - Cidr: !Join [ '', [ !GetAtt NatGatewayEip1.PublicIp, /32 ] ]
            Description: !Sub ${ResourcePrefix} Nat Gateway 1 Public IP.
          - !Ref AWS::NoValue
      MaxEntries: 1
      PrefixListName: !Sub ${ResourcePrefix}-natgw-eip1-pl
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-natgw-eip1-pl

  PublicSubnet1ForNATGWIPv4CidrPrefixList:
    Type: AWS::EC2::PrefixList
    Condition: CreatePrefixList
    Properties:
      AddressFamily: IPv4
      Entries:
        - Fn::If:
          - CreateSubnet1
          - Cidr: !GetAtt PublicSubnet1ForNATGW.CidrBlock
            Description: !Sub ${ResourcePrefix} Public Subnet 1 For NAT Gateway IPv4 CIDR block.
          - !Ref AWS::NoValue
      MaxEntries: 1
      PrefixListName: !Sub ${ResourcePrefix}-public-subnet1-for-natgw-ipv4-cidr-pl
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-public-subnet1-for-natgw-ipv4-cidr-pl

  PublicSubnet1ForNATGWIPv6CidrPrefixList:
    Type: AWS::EC2::PrefixList
    Condition: CreatePrefixList
    Properties:
      AddressFamily: IPv6
      Entries:
        - Fn::If:
          - EnableIpv6CidrBlock1
          - Cidr: !Select [ 0, !GetAtt PublicSubnet1ForNATGW.Ipv6CidrBlocks ]
            Description: !Sub ${ResourcePrefix} Public Subnet 1 For NAT Gateway IPv6 CIDR block.
          - !Ref AWS::NoValue
      MaxEntries: 1
      PrefixListName: !Sub ${ResourcePrefix}-public-subnet1-for-natgw-ipv6-cidr-pl
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-public-subnet1-for-natgw-ipv6-cidr-pl

#---------------------------------------
# Public Subnet 2 For NAT Gateway
#---------------------------------------

  NatGatewayEip2:
    Type: AWS::EC2::EIP
    Condition: EnableNatGateway2
    DependsOn: VPCInternetGatewayAttachment
    Properties:
      Domain: vpc
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-natgw-eip2-${Subnet2AvailabilityZone}

  NatGateway2:
    Type: AWS::EC2::NatGateway
    Condition: EnableNatGateway2
    Properties:
      AllocationId: !GetAtt NatGatewayEip2.AllocationId
      ConnectivityType: public
      SubnetId: !Ref PublicSubnet2ForNATGW
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-natgw2-${Subnet2AvailabilityZone}

  PublicRouteTable2ForNATGW:
    Type: AWS::EC2::RouteTable
    Condition: CreateSubnet2
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-public-rtb2-for-natgw-${Subnet2AvailabilityZone}

  InternetAccessPublicRoute2ForNATGW:
    Type: AWS::EC2::Route
    Condition: CreateSubnet2
    DependsOn: VPCInternetGatewayAttachment
    Properties:
      RouteTableId: !Ref PublicRouteTable2ForNATGW
      DestinationCidrBlock: 0.0.0.0/0
      GatewayId: !Ref InternetGateway

  InternetAccessPublicRoute2IPv6ForNATGW:
    Type: AWS::EC2::Route
    Condition: EnableIpv6CidrBlock2
    DependsOn: VPCInternetGatewayAttachment
    Properties:
      RouteTableId: !Ref PublicRouteTable2ForNATGW
      DestinationIpv6CidrBlock: ::/0
      GatewayId: !Ref InternetGateway

  PublicSubnet2ForNATGW:
    Type: AWS::EC2::Subnet
    Condition: CreateSubnet2
    DependsOn: EnableIpv6CidrBlockWaitCondition
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Ref Subnet2AvailabilityZone
      MapPublicIpOnLaunch: true
      AssignIpv6AddressOnCreation: !If [ EnableIpv6CidrBlock2, true, false ]
      CidrBlock: !Sub ${VpcCidrBlockIpAddressPrefix}.${PublicSubnet2ForNATGWCidrBlockIpAddressSuffix}/${PublicSubnet2ForNATGWCidrBlockCidr}
      Ipv6CidrBlock:
        Fn::If:
          - EnableIpv6CidrBlock2
          - !Select [ 1, !Cidr [ !Select [ 0, !GetAtt VPC.Ipv6CidrBlocks ], 9, 64 ] ]
          - !Ref AWS::NoValue
      Ipv6Native: false
      EnableDns64: false
      Tags:
        - Key: Name
          Value:
            Fn::If:
              - NotSpecifiedPublicSubnet2ForNATGWName
              - !Sub ${ResourcePrefix}-public-subnet2-for-natgw-${Subnet2AvailabilityZone}
              - !Ref PublicSubnet2ForNATGWName

  PublicSubnet2ForNATGWRouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Condition: CreateSubnet2
    Properties:
      SubnetId: !Ref PublicSubnet2ForNATGW
      RouteTableId: !Ref PublicRouteTable2ForNATGW

  PublicSubnet2ForNATGWNACLAssociation:
    Type: AWS::EC2::SubnetNetworkAclAssociation
    Condition: CreateSubnet2
    Properties:
      SubnetId: !Ref PublicSubnet2ForNATGW
      NetworkAclId: !Ref PublicForNATGWNetworkACL

  NatGatewayEip2PrefixList:
    Type: AWS::EC2::PrefixList
    Condition: CreatePrefixList
    Properties:
      AddressFamily: IPv4
      Entries:
        - Fn::If:
          - EnableNatGateway2
          - Cidr: !Join [ '', [ !GetAtt NatGatewayEip2.PublicIp, /32 ] ]
            Description: !Sub ${ResourcePrefix} Nat Gateway 2 Public IP.
          - !Ref AWS::NoValue
      MaxEntries: 1
      PrefixListName: !Sub ${ResourcePrefix}-natgw-eip2-pl
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-natgw-eip2-pl

  PublicSubnet2ForNATGWIPv4CidrPrefixList:
    Type: AWS::EC2::PrefixList
    Condition: CreatePrefixList
    Properties:
      AddressFamily: IPv4
      Entries:
        - Fn::If:
          - CreateSubnet2
          - Cidr: !GetAtt PublicSubnet2ForNATGW.CidrBlock
            Description: !Sub ${ResourcePrefix} Public Subnet 2 For NAT Gateway IPv4 CIDR block.
          - !Ref AWS::NoValue
      MaxEntries: 1
      PrefixListName: !Sub ${ResourcePrefix}-public-subnet2-for-natgw-ipv4-cidr-pl
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-public-subnet2-for-natgw-ipv4-cidr-pl

  PublicSubnet2ForNATGWIPv6CidrPrefixList:
    Type: AWS::EC2::PrefixList
    Condition: CreatePrefixList
    Properties:
      AddressFamily: IPv6
      Entries:
        - Fn::If:
          - EnableIpv6CidrBlock2
          - Cidr: !Select [ 0, !GetAtt PublicSubnet2ForNATGW.Ipv6CidrBlocks ]
            Description: !Sub ${ResourcePrefix} Public Subnet 2 For NAT Gateway IPv6 CIDR block.
          - !Ref AWS::NoValue
      MaxEntries: 1
      PrefixListName: !Sub ${ResourcePrefix}-public-subnet2-for-natgw-ipv6-cidr-pl
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-public-subnet2-for-natgw-ipv6-cidr-pl

#---------------------------------------
# Public Subnet 3 For NAT Gateway
#---------------------------------------

  NatGatewayEip3:
    Type: AWS::EC2::EIP
    Condition: EnableNatGateway3
    DependsOn: VPCInternetGatewayAttachment
    Properties:
      Domain: vpc
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-natgw-eip3-${Subnet3AvailabilityZone}

  NatGateway3:
    Type: AWS::EC2::NatGateway
    Condition: EnableNatGateway3
    Properties:
      AllocationId: !GetAtt NatGatewayEip3.AllocationId
      ConnectivityType: public
      SubnetId: !Ref PublicSubnet3ForNATGW
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-natgw3-${Subnet3AvailabilityZone}

  PublicRouteTable3ForNATGW:
    Type: AWS::EC2::RouteTable
    Condition: CreateSubnet3
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-public-rtb3-for-natgw-${Subnet3AvailabilityZone}

  InternetAccessPublicRoute3ForNATGW:
    Type: AWS::EC2::Route
    Condition: CreateSubnet3
    DependsOn: VPCInternetGatewayAttachment
    Properties:
      RouteTableId: !Ref PublicRouteTable3ForNATGW
      DestinationCidrBlock: 0.0.0.0/0
      GatewayId: !Ref InternetGateway

  InternetAccessPublicRoute3IPv6ForNATGW:
    Type: AWS::EC2::Route
    Condition: EnableIpv6CidrBlock3
    DependsOn: VPCInternetGatewayAttachment
    Properties:
      RouteTableId: !Ref PublicRouteTable3ForNATGW
      DestinationIpv6CidrBlock: ::/0
      GatewayId: !Ref InternetGateway

  PublicSubnet3ForNATGW:
    Type: AWS::EC2::Subnet
    Condition: CreateSubnet3
    DependsOn: EnableIpv6CidrBlockWaitCondition
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Ref Subnet3AvailabilityZone
      MapPublicIpOnLaunch: true
      AssignIpv6AddressOnCreation: !If [ EnableIpv6CidrBlock3, true, false ]
      CidrBlock: !Sub ${VpcCidrBlockIpAddressPrefix}.${PublicSubnet3ForNATGWCidrBlockIpAddressSuffix}/${PublicSubnet3ForNATGWCidrBlockCidr}
      Ipv6CidrBlock:
        Fn::If:
          - EnableIpv6CidrBlock3
          - !Select [ 2, !Cidr [ !Select [ 0, !GetAtt VPC.Ipv6CidrBlocks ], 9, 64 ] ]
          - !Ref AWS::NoValue
      Ipv6Native: false
      EnableDns64: false
      Tags:
        - Key: Name
          Value:
            Fn::If:
              - NotSpecifiedPublicSubnet3ForNATGWName
              - !Sub ${ResourcePrefix}-public-subnet3-for-natgw-${Subnet3AvailabilityZone}
              - !Ref PublicSubnet3ForNATGWName

  PublicSubnet3ForNATGWRouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Condition: CreateSubnet3
    Properties:
      SubnetId: !Ref PublicSubnet3ForNATGW
      RouteTableId: !Ref PublicRouteTable3ForNATGW

  PublicSubnet3ForNATGWNACLAssociation:
    Type: AWS::EC2::SubnetNetworkAclAssociation
    Condition: CreateSubnet3
    Properties:
      SubnetId: !Ref PublicSubnet3ForNATGW
      NetworkAclId: !Ref PublicForNATGWNetworkACL

  NatGatewayEip3PrefixList:
    Type: AWS::EC2::PrefixList
    Condition: CreatePrefixList
    Properties:
      AddressFamily: IPv4
      Entries:
        - Fn::If:
          - EnableNatGateway3
          - Cidr: !Join [ '', [ !GetAtt NatGatewayEip3.PublicIp, /32 ] ]
            Description: !Sub ${ResourcePrefix} Nat Gateway 3 Public IP.
          - !Ref AWS::NoValue
      MaxEntries: 1
      PrefixListName: !Sub ${ResourcePrefix}-natgw-eip3-pl
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-natgw-eip3-pl

  PublicSubnet3ForNATGWIPv4CidrPrefixList:
    Type: AWS::EC2::PrefixList
    Condition: CreatePrefixList
    Properties:
      AddressFamily: IPv4
      Entries:
        - Fn::If:
          - CreateSubnet3
          - Cidr: !GetAtt PublicSubnet3ForNATGW.CidrBlock
            Description: !Sub ${ResourcePrefix} Public Subnet 3 For NAT Gateway IPv4 CIDR block.
          - !Ref AWS::NoValue
      MaxEntries: 1
      PrefixListName: !Sub ${ResourcePrefix}-public-subnet3-for-natgw-ipv4-cidr-pl
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-public-subnet3-for-natgw-ipv4-cidr-pl

  PublicSubnet3ForNATGWIPv6CidrPrefixList:
    Type: AWS::EC2::PrefixList
    Condition: CreatePrefixList
    Properties:
      AddressFamily: IPv6
      Entries:
        - Fn::If:
          - EnableIpv6CidrBlock3
          - Cidr: !Select [ 0, !GetAtt PublicSubnet3ForNATGW.Ipv6CidrBlocks ]
            Description: !Sub ${ResourcePrefix} Public Subnet 3 For NAT Gateway IPv6 CIDR block.
          - !Ref AWS::NoValue
      MaxEntries: 1
      PrefixListName: !Sub ${ResourcePrefix}-public-subnet3-for-natgw-ipv6-cidr-pl
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-public-subnet3-for-natgw-ipv6-cidr-pl

##############################
# Public Network
##############################

  PublicNetworkACL:
    Type: AWS::EC2::NetworkAcl
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-public-nacl

  PublicNetworkACLEntryEgress:
    Type: AWS::EC2::NetworkAclEntry
    Properties:
      NetworkAclId: !Ref PublicNetworkACL
      Egress: true
      RuleNumber : 100
      RuleAction : allow
      Protocol: -1
      CidrBlock: 0.0.0.0/0

  PublicNetworkACLEntryIngress:
    Type: AWS::EC2::NetworkAclEntry
    Properties:
      NetworkAclId: !Ref PublicNetworkACL
      Egress: false
      RuleNumber : 100
      RuleAction : allow
      Protocol: -1
      CidrBlock: 0.0.0.0/0

  PublicNetworkACLEntryEgressIpv6:
    Type: AWS::EC2::NetworkAclEntry
    Condition: EnableIpv6CidrBlock
    Properties:
      NetworkAclId: !Ref PublicNetworkACL
      Egress: true
      RuleNumber : 101
      RuleAction : allow
      Protocol: -1
      Ipv6CidrBlock: ::/0

  PublicNetworkACLEntryIngressIpv6:
    Type: AWS::EC2::NetworkAclEntry
    Condition: EnableIpv6CidrBlock
    Properties:
      NetworkAclId: !Ref PublicNetworkACL
      Egress: false
      RuleNumber : 101
      RuleAction : allow
      Protocol: -1
      Ipv6CidrBlock: ::/0

  PublicSubnetIPv4CidrPrefixList:
    Type: AWS::EC2::PrefixList
    Condition: CreatePrefixList
    Properties:
      AddressFamily: IPv4
      Entries:
        - Fn::If:
          - CreateSubnet1
          - Fn::If:
              - PublicSubnet1Ipv6Only
              - !Ref AWS::NoValue
              - Cidr: !GetAtt PublicSubnet1.CidrBlock
                Description: !Sub ${ResourcePrefix} Public Subnet 1 IPv4 CIDR block.
          - !Ref AWS::NoValue
        - Fn::If:
          - CreateSubnet2
          - Fn::If:
              - PublicSubnet2Ipv6Only
              - !Ref AWS::NoValue
              - Cidr: !GetAtt PublicSubnet2.CidrBlock
                Description: !Sub ${ResourcePrefix} Public Subnet 2 IPv4 CIDR block.
          - !Ref AWS::NoValue
        - Fn::If:
          - CreateSubnet3
          - Fn::If:
              - PublicSubnet3Ipv6Only
              - !Ref AWS::NoValue
              - Cidr: !GetAtt PublicSubnet3.CidrBlock
                Description: !Sub ${ResourcePrefix} Public Subnet 3 IPv4 CIDR block.
          - !Ref AWS::NoValue
      MaxEntries: 3
      PrefixListName: !Sub ${ResourcePrefix}-public-subnet-ipv4-cidr-pl
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-public-subnet-ipv4-cidr-pl

  PublicSubnetIPv6CidrPrefixList:
    Type: AWS::EC2::PrefixList
    Condition: CreatePrefixList
    Properties:
      AddressFamily: IPv6
      Entries:
        - Fn::If:
          - CreateSubnet1
          - Fn::If:
              - PublicSubnet1Ipv4Only
              - !Ref AWS::NoValue
              - Cidr: !Select [ 0, !GetAtt PublicSubnet1.Ipv6CidrBlocks ]
                Description: !Sub ${ResourcePrefix} Public Subnet 1 IPv6 CIDR block.
          - !Ref AWS::NoValue
        - Fn::If:
          - CreateSubnet2
          - Fn::If:
              - PublicSubnet2Ipv4Only
              - !Ref AWS::NoValue
              - Cidr: !Select [ 0, !GetAtt PublicSubnet2.Ipv6CidrBlocks ]
                Description: !Sub ${ResourcePrefix} Public Subnet 2 IPv6 CIDR block.
          - !Ref AWS::NoValue
        - Fn::If:
          - CreateSubnet3
          - Fn::If:
              - PublicSubnet3Ipv4Only
              - !Ref AWS::NoValue
              - Cidr: !Select [ 0, !GetAtt PublicSubnet3.Ipv6CidrBlocks ]
                Description: !Sub ${ResourcePrefix} Public Subnet 3 IPv6 CIDR block.
          - !Ref AWS::NoValue
      MaxEntries: 3
      PrefixListName: !Sub ${ResourcePrefix}-public-subnet-ipv6-cidr-pl
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-public-subnet-ipv6-cidr-pl

#---------------------------------------
# Public Subnet 1
#---------------------------------------

  PublicRouteTable1:
    Type: AWS::EC2::RouteTable
    Condition: CreateSubnet1
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-public-rtb1-${Subnet1AvailabilityZone}

  InternetAccessPublicRoute1:
    Type: AWS::EC2::Route
    Condition: NotPublicSubnet1Ipv6Only
    DependsOn: VPCInternetGatewayAttachment
    Properties:
      RouteTableId: !Ref PublicRouteTable1
      DestinationCidrBlock: 0.0.0.0/0
      GatewayId: !Ref InternetGateway

  InternetAccessPublicRoute1IPv6:
    Type: AWS::EC2::Route
    Condition: NotPublicSubnet1Ipv4Only
    DependsOn: VPCInternetGatewayAttachment
    Properties:
      RouteTableId: !Ref PublicRouteTable1
      DestinationIpv6CidrBlock: ::/0
      GatewayId: !Ref InternetGateway

  InternetAccessPublicRoute1NAT64:
    Type: AWS::EC2::Route
    Condition: EnablePublicSubnet1NAT64
    DependsOn: VPCInternetGatewayAttachment
    Properties:
      RouteTableId: !Ref PublicRouteTable1
      DestinationIpv6CidrBlock: 64:ff9b::/96
      NatGatewayId: !Ref NatGateway1

  PublicSubnet1:
    Type: AWS::EC2::Subnet
    Condition: CreateSubnet1
    DependsOn: EnableIpv6CidrBlockWaitCondition
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Ref Subnet1AvailabilityZone
      MapPublicIpOnLaunch: !If [ PublicSubnet1Ipv6Only, false, true ]
      AssignIpv6AddressOnCreation: !If [ PublicSubnet1Ipv4Only, false, true ]
      CidrBlock:
        Fn::If:
          - PublicSubnet1Ipv6Only
          - !Ref AWS::NoValue
          - !Sub ${VpcCidrBlockIpAddressPrefix}.${PublicSubnet1CidrBlockIpAddressSuffix}/${PublicSubnet1CidrBlockCidr}
      Ipv6CidrBlock:
        Fn::If:
          - PublicSubnet1Ipv4Only
          - !Ref AWS::NoValue
          - !Select [ 3, !Cidr [ !Select [ 0, !GetAtt VPC.Ipv6CidrBlocks ], 9, 64 ] ]
      Ipv6Native: !If [ PublicSubnet1Ipv6Only, true, false ]
      EnableDns64: !If [ EnablePublicSubnet1NAT64, true, false ]
      Tags:
        - Key: Name
          Value:
            Fn::If:
              - NotSpecifiedPublicSubnet1Name
              - !Sub ${ResourcePrefix}-public-subnet1-${Subnet1AvailabilityZone}
              - !Ref PublicSubnet1Name

  PublicSubnet1RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Condition: CreateSubnet1
    Properties:
      SubnetId: !Ref PublicSubnet1
      RouteTableId: !Ref PublicRouteTable1

  PublicSubnet1NACLAssociation:
    Type: AWS::EC2::SubnetNetworkAclAssociation
    Condition: CreateSubnet1
    Properties:
      SubnetId: !Ref PublicSubnet1
      NetworkAclId: !Ref PublicNetworkACL

  PublicSubnet1IPv4CidrPrefixList:
    Type: AWS::EC2::PrefixList
    Condition: CreatePrefixList
    Properties:
      AddressFamily: IPv4
      Entries:
        - Fn::If:
          - CreateSubnet1
          - Fn::If:
              - PublicSubnet1Ipv6Only
              - !Ref AWS::NoValue
              - Cidr: !GetAtt PublicSubnet1.CidrBlock
                Description: !Sub ${ResourcePrefix} Public Subnet 1 IPv4 CIDR block.
          - !Ref AWS::NoValue
      MaxEntries: 1
      PrefixListName: !Sub ${ResourcePrefix}-public-subnet1-ipv4-cidr-pl
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-public-subnet1-ipv4-cidr-pl

  PublicSubnet1IPv6CidrPrefixList:
    Type: AWS::EC2::PrefixList
    Condition: CreatePrefixList
    Properties:
      AddressFamily: IPv6
      Entries:
        - Fn::If:
          - CreateSubnet1
          - Fn::If:
              - PublicSubnet1Ipv4Only
              - !Ref AWS::NoValue
              - Cidr: !Select [ 0, !GetAtt PublicSubnet1.Ipv6CidrBlocks ]
                Description: !Sub ${ResourcePrefix} Public Subnet 1 IPv6 CIDR block.
          - !Ref AWS::NoValue
      MaxEntries: 1
      PrefixListName: !Sub ${ResourcePrefix}-public-subnet1-ipv6-cidr-pl
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-public-subnet1-ipv6-cidr-pl

#---------------------------------------
# Public Subnet 2
#---------------------------------------

  PublicRouteTable2:
    Type: AWS::EC2::RouteTable
    Condition: CreateSubnet2
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-public-rtb2-${Subnet2AvailabilityZone}

  InternetAccessPublicRoute2:
    Type: AWS::EC2::Route
    Condition: NotPublicSubnet2Ipv6Only
    DependsOn: VPCInternetGatewayAttachment
    Properties:
      RouteTableId: !Ref PublicRouteTable2
      DestinationCidrBlock: 0.0.0.0/0
      GatewayId: !Ref InternetGateway

  InternetAccessPublicRoute2IPv6:
    Type: AWS::EC2::Route
    Condition: NotPublicSubnet2Ipv4Only
    DependsOn: VPCInternetGatewayAttachment
    Properties:
      RouteTableId: !Ref PublicRouteTable2
      DestinationIpv6CidrBlock: ::/0
      GatewayId: !Ref InternetGateway

  InternetAccessPublicRoute2NAT64:
    Type: AWS::EC2::Route
    Condition: EnablePublicSubnet2NAT64
    DependsOn: VPCInternetGatewayAttachment
    Properties:
      RouteTableId: !Ref PublicRouteTable2
      DestinationIpv6CidrBlock: 64:ff9b::/96
      NatGatewayId: !Ref NatGateway2

  PublicSubnet2:
    Type: AWS::EC2::Subnet
    Condition: CreateSubnet2
    DependsOn: EnableIpv6CidrBlockWaitCondition
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Ref Subnet2AvailabilityZone
      MapPublicIpOnLaunch: !If [ PublicSubnet2Ipv6Only, false, true ]
      AssignIpv6AddressOnCreation: !If [ PublicSubnet2Ipv4Only, false, true ]
      CidrBlock:
        Fn::If:
          - PublicSubnet2Ipv6Only
          - !Ref AWS::NoValue
          - !Sub ${VpcCidrBlockIpAddressPrefix}.${PublicSubnet2CidrBlockIpAddressSuffix}/${PublicSubnet2CidrBlockCidr}
      Ipv6CidrBlock:
        Fn::If:
          - PublicSubnet2Ipv4Only
          - !Ref AWS::NoValue
          - !Select [ 4, !Cidr [ !Select [ 0, !GetAtt VPC.Ipv6CidrBlocks ], 9, 64 ] ]
      Ipv6Native: !If [ PublicSubnet2Ipv6Only, true, false ]
      EnableDns64: !If [ EnablePublicSubnet2NAT64, true, false ]
      Tags:
        - Key: Name
          Value:
            Fn::If:
              - NotSpecifiedPublicSubnet2Name
              - !Sub ${ResourcePrefix}-public-subnet2-${Subnet2AvailabilityZone}
              - !Ref PublicSubnet2Name

  PublicSubnet2RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Condition: CreateSubnet2
    Properties:
      SubnetId: !Ref PublicSubnet2
      RouteTableId: !Ref PublicRouteTable2

  PublicSubnet2NACLAssociation:
    Type: AWS::EC2::SubnetNetworkAclAssociation
    Condition: CreateSubnet2
    Properties:
      SubnetId: !Ref PublicSubnet2
      NetworkAclId: !Ref PublicNetworkACL

  PublicSubnet2IPv4CidrPrefixList:
    Type: AWS::EC2::PrefixList
    Condition: CreatePrefixList
    Properties:
      AddressFamily: IPv4
      Entries:
        - Fn::If:
          - CreateSubnet2
          - Fn::If:
              - PublicSubnet2Ipv6Only
              - !Ref AWS::NoValue
              - Cidr: !GetAtt PublicSubnet2.CidrBlock
                Description: !Sub ${ResourcePrefix} Public Subnet 2 IPv4 CIDR block.
          - !Ref AWS::NoValue
      MaxEntries: 1
      PrefixListName: !Sub ${ResourcePrefix}-public-subnet2-ipv4-cidr-pl
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-public-subnet2-ipv4-cidr-pl

  PublicSubnet2IPv6CidrPrefixList:
    Type: AWS::EC2::PrefixList
    Condition: CreatePrefixList
    Properties:
      AddressFamily: IPv6
      Entries:
        - Fn::If:
          - CreateSubnet2
          - Fn::If:
              - PublicSubnet2Ipv4Only
              - !Ref AWS::NoValue
              - Cidr: !Select [ 0, !GetAtt PublicSubnet2.Ipv6CidrBlocks ]
                Description: !Sub ${ResourcePrefix} Public Subnet 2 IPv6 CIDR block.
          - !Ref AWS::NoValue
      MaxEntries: 1
      PrefixListName: !Sub ${ResourcePrefix}-public-subnet2-ipv6-cidr-pl
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-public-subnet2-ipv6-cidr-pl

#---------------------------------------
# Public Subnet 3
#---------------------------------------

  PublicRouteTable3:
    Type: AWS::EC2::RouteTable
    Condition: CreateSubnet3
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-public-rtb3-${Subnet3AvailabilityZone}

  InternetAccessPublicRoute3:
    Type: AWS::EC2::Route
    Condition: NotPublicSubnet3Ipv6Only
    DependsOn: VPCInternetGatewayAttachment
    Properties:
      RouteTableId: !Ref PublicRouteTable3
      DestinationCidrBlock: 0.0.0.0/0
      GatewayId: !Ref InternetGateway

  InternetAccessPublicRoute3IPv6:
    Type: AWS::EC2::Route
    Condition: NotPublicSubnet3Ipv4Only
    DependsOn: VPCInternetGatewayAttachment
    Properties:
      RouteTableId: !Ref PublicRouteTable3
      DestinationIpv6CidrBlock: ::/0
      GatewayId: !Ref InternetGateway

  InternetAccessPublicRoute3NAT64:
    Type: AWS::EC2::Route
    Condition: EnablePublicSubnet3NAT64
    DependsOn: VPCInternetGatewayAttachment
    Properties:
      RouteTableId: !Ref PublicRouteTable3
      DestinationIpv6CidrBlock: 64:ff9b::/96
      NatGatewayId: !Ref NatGateway3

  PublicSubnet3:
    Type: AWS::EC2::Subnet
    Condition: CreateSubnet3
    DependsOn: EnableIpv6CidrBlockWaitCondition
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Ref Subnet3AvailabilityZone
      MapPublicIpOnLaunch: !If [ PublicSubnet3Ipv6Only, false, true ]
      AssignIpv6AddressOnCreation: !If [ PublicSubnet3Ipv4Only, false, true ]
      CidrBlock:
        Fn::If:
          - PublicSubnet3Ipv6Only
          - !Ref AWS::NoValue
          - !Sub ${VpcCidrBlockIpAddressPrefix}.${PublicSubnet3CidrBlockIpAddressSuffix}/${PublicSubnet3CidrBlockCidr}
      Ipv6CidrBlock:
        Fn::If:
          - PublicSubnet3Ipv4Only
          - !Ref AWS::NoValue
          - !Select [ 5, !Cidr [ !Select [ 0, !GetAtt VPC.Ipv6CidrBlocks ], 9, 64 ] ]
      Ipv6Native: !If [ PublicSubnet3Ipv6Only, true, false ]
      EnableDns64: !If [ EnablePublicSubnet3NAT64, true, false ]
      Tags:
        - Key: Name
          Value:
            Fn::If:
              - NotSpecifiedPublicSubnet3Name
              - !Sub ${ResourcePrefix}-public-subnet3-${Subnet3AvailabilityZone}
              - !Ref PublicSubnet3Name

  PublicSubnet3RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Condition: CreateSubnet3
    Properties:
      SubnetId: !Ref PublicSubnet3
      RouteTableId: !Ref PublicRouteTable3

  PublicSubnet3NACLAssociation:
    Type: AWS::EC2::SubnetNetworkAclAssociation
    Condition: CreateSubnet3
    Properties:
      SubnetId: !Ref PublicSubnet3
      NetworkAclId: !Ref PublicNetworkACL

  PublicSubnet3IPv4CidrPrefixList:
    Type: AWS::EC2::PrefixList
    Condition: CreatePrefixList
    Properties:
      AddressFamily: IPv4
      Entries:
        - Fn::If:
          - CreateSubnet3
          - Fn::If:
              - PublicSubnet3Ipv6Only
              - !Ref AWS::NoValue
              - Cidr: !GetAtt PublicSubnet3.CidrBlock
                Description: !Sub ${ResourcePrefix} Public Subnet 3 IPv4 CIDR block.
          - !Ref AWS::NoValue
      MaxEntries: 1
      PrefixListName: !Sub ${ResourcePrefix}-public-subnet3-ipv4-cidr-pl
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-public-subnet3-ipv4-cidr-pl

  PublicSubnet3IPv6CidrPrefixList:
    Type: AWS::EC2::PrefixList
    Condition: CreatePrefixList
    Properties:
      AddressFamily: IPv6
      Entries:
        - Fn::If:
          - CreateSubnet3
          - Fn::If:
              - PublicSubnet3Ipv4Only
              - !Ref AWS::NoValue
              - Cidr: !Select [ 0, !GetAtt PublicSubnet3.Ipv6CidrBlocks ]
                Description: !Sub ${ResourcePrefix} Public Subnet 3 IPv6 CIDR block.
          - !Ref AWS::NoValue
      MaxEntries: 1
      PrefixListName: !Sub ${ResourcePrefix}-public-subnet3-ipv6-cidr-pl
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-public-subnet3-ipv6-cidr-pl

##############################
# Private Network
##############################

  PrivateNetworkACL:
    Type: AWS::EC2::NetworkAcl
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-private-nacl

  PrivateNetworkACLEntryEgress:
    Type: AWS::EC2::NetworkAclEntry
    Properties:
      NetworkAclId: !Ref PrivateNetworkACL
      Egress: true
      RuleNumber : 100
      RuleAction : allow
      Protocol: -1
      CidrBlock: 0.0.0.0/0

  PrivateNetworkACLEntryIngress:
    Type: AWS::EC2::NetworkAclEntry
    Properties:
      NetworkAclId: !Ref PrivateNetworkACL
      Egress: false
      RuleNumber : 100
      RuleAction : allow
      Protocol: -1
      CidrBlock: 0.0.0.0/0

  PrivateNetworkACLEntryEgressIpv6:
    Type: AWS::EC2::NetworkAclEntry
    Condition: EnableIpv6CidrBlock
    Properties:
      NetworkAclId: !Ref PrivateNetworkACL
      Egress: true
      RuleNumber : 101
      RuleAction : allow
      Protocol: -1
      Ipv6CidrBlock: ::/0

  PrivateNetworkACLEntryIngressIpv6:
    Type: AWS::EC2::NetworkAclEntry
    Condition: EnableIpv6CidrBlock
    Properties:
      NetworkAclId: !Ref PrivateNetworkACL
      Egress: false
      RuleNumber : 101
      RuleAction : allow
      Protocol: -1
      Ipv6CidrBlock: ::/0

  PrivateSubnetIPv4CidrPrefixList:
    Type: AWS::EC2::PrefixList
    Condition: CreatePrefixList
    Properties:
      AddressFamily: IPv4
      Entries:
        - Fn::If:
          - CreateSubnet1
          - Fn::If:
              - PrivateSubnet1Ipv6Only
              - !Ref AWS::NoValue
              - Cidr: !GetAtt PrivateSubnet1.CidrBlock
                Description: !Sub ${ResourcePrefix} Private Subnet 1 IPv4 CIDR block.
          - !Ref AWS::NoValue
        - Fn::If:
          - CreateSubnet2
          - Fn::If:
              - PrivateSubnet2Ipv6Only
              - !Ref AWS::NoValue
              - Cidr: !GetAtt PrivateSubnet2.CidrBlock
                Description: !Sub ${ResourcePrefix} Private Subnet 2 IPv4 CIDR block.
          - !Ref AWS::NoValue
        - Fn::If:
          - CreateSubnet3
          - Fn::If:
              - PrivateSubnet3Ipv6Only
              - !Ref AWS::NoValue
              - Cidr: !GetAtt PrivateSubnet3.CidrBlock
                Description: !Sub ${ResourcePrefix} Private Subnet 3 IPv4 CIDR block.
          - !Ref AWS::NoValue
      MaxEntries: 3
      PrefixListName: !Sub ${ResourcePrefix}-private-subnet-ipv4-cidr-pl
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-private-subnet-ipv4-cidr-pl

  PrivateSubnetIPv6CidrPrefixList:
    Type: AWS::EC2::PrefixList
    Condition: CreatePrefixList
    Properties:
      AddressFamily: IPv6
      Entries:
        - Fn::If:
          - CreateSubnet1
          - Fn::If:
              - PrivateSubnet1Ipv4Only
              - !Ref AWS::NoValue
              - Cidr: !Select [ 0, !GetAtt PrivateSubnet1.Ipv6CidrBlocks ]
                Description: !Sub ${ResourcePrefix} Private Subnet 1 IPv6 CIDR block.
          - !Ref AWS::NoValue
        - Fn::If:
          - CreateSubnet2
          - Fn::If:
              - PrivateSubnet2Ipv4Only
              - !Ref AWS::NoValue
              - Cidr: !Select [ 0, !GetAtt PrivateSubnet2.Ipv6CidrBlocks ]
                Description: !Sub ${ResourcePrefix} Private Subnet 2 IPv6 CIDR block.
          - !Ref AWS::NoValue
        - Fn::If:
          - CreateSubnet3
          - Fn::If:
              - PrivateSubnet3Ipv4Only
              - !Ref AWS::NoValue
              - Cidr: !Select [ 0, !GetAtt PrivateSubnet3.Ipv6CidrBlocks ]
                Description: !Sub ${ResourcePrefix} Private Subnet 3 IPv6 CIDR block.
          - !Ref AWS::NoValue
      MaxEntries: 3
      PrefixListName: !Sub ${ResourcePrefix}-private-subnet-ipv6-cidr-pl
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-private-subnet-ipv6-cidr-pl

#---------------------------------------
# Private Subnet 1
#---------------------------------------

  PrivateRouteTable1:
    Type: AWS::EC2::RouteTable
    Condition: CreateSubnet1
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-private-rtb1-${Subnet1AvailabilityZone}

  InternetAccessPrivateRoute1:
    Type: AWS::EC2::Route
    Condition: EnablePrivateNatGateway1
    DependsOn: VPCInternetGatewayAttachment
    Properties:
      RouteTableId: !Ref PrivateRouteTable1
      DestinationCidrBlock: 0.0.0.0/0
      NatGatewayId: !Ref NatGateway1

  InternetAccessPrivateRoute1IPv6:
    Type: AWS::EC2::Route
    Condition: NotPrivateSubnet1Ipv4Only
    Properties:
      RouteTableId: !Ref PrivateRouteTable1
      DestinationIpv6CidrBlock: ::/0
      EgressOnlyInternetGatewayId: !Ref EgressOnlyInternetGateway

  InternetAccessPrivateRoute1NAT64:
    Type: AWS::EC2::Route
    Condition: EnablePrivateSubnet1NAT64
    DependsOn: VPCInternetGatewayAttachment
    Properties:
      RouteTableId: !Ref PrivateRouteTable1
      DestinationIpv6CidrBlock: 64:ff9b::/96
      NatGatewayId: !Ref NatGateway1

  PrivateSubnet1:
    Type: AWS::EC2::Subnet
    Condition: CreateSubnet1
    DependsOn: EnableIpv6CidrBlockWaitCondition
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Ref Subnet1AvailabilityZone
      MapPublicIpOnLaunch: false
      AssignIpv6AddressOnCreation: !If [ PrivateSubnet1Ipv4Only, false, true ]
      CidrBlock:
        Fn::If:
          - PrivateSubnet1Ipv6Only
          - !Ref AWS::NoValue
          - !Sub ${VpcCidrBlockIpAddressPrefix}.${PrivateSubnet1CidrBlockIpAddressSuffix}/${PrivateSubnet1CidrBlockCidr}
      Ipv6CidrBlock:
        Fn::If:
          - PrivateSubnet1Ipv4Only
          - !Ref AWS::NoValue
          - !Select [ 6, !Cidr [ !Select [ 0, !GetAtt VPC.Ipv6CidrBlocks ], 9, 64 ] ]
      Ipv6Native: !If [ PrivateSubnet1Ipv6Only, true, false ]
      EnableDns64: !If [ EnablePrivateSubnet1NAT64, true, false ]
      Tags:
        - Key: Name
          Value:
            Fn::If:
              - NotSpecifiedPrivateSubnet1Name
              - !Sub ${ResourcePrefix}-private-subnet1-${Subnet1AvailabilityZone}
              - !Ref PrivateSubnet1Name

  PrivateSubnet1RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Condition: CreateSubnet1
    Properties:
      SubnetId: !Ref PrivateSubnet1
      RouteTableId: !Ref PrivateRouteTable1

  PrivateSubnet1NACLAssociation:
    Type: AWS::EC2::SubnetNetworkAclAssociation
    Condition: CreateSubnet1
    Properties:
      SubnetId: !Ref PrivateSubnet1
      NetworkAclId: !Ref PrivateNetworkACL

  PrivateSubnet1IPv4CidrPrefixList:
    Type: AWS::EC2::PrefixList
    Condition: CreatePrefixList
    Properties:
      AddressFamily: IPv4
      Entries:
        - Fn::If:
          - CreateSubnet1
          - Fn::If:
              - PrivateSubnet1Ipv6Only
              - !Ref AWS::NoValue
              - Cidr: !GetAtt PrivateSubnet1.CidrBlock
                Description: !Sub ${ResourcePrefix} Private Subnet 1 IPv4 CIDR block.
          - !Ref AWS::NoValue
      MaxEntries: 1
      PrefixListName: !Sub ${ResourcePrefix}-private-subnet1-ipv4-cidr-pl
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-private-subnet1-ipv4-cidr-pl

  PrivateSubnet1IPv6CidrPrefixList:
    Type: AWS::EC2::PrefixList
    Condition: CreatePrefixList
    Properties:
      AddressFamily: IPv6
      Entries:
        - Fn::If:
          - CreateSubnet1
          - Fn::If:
              - PrivateSubnet1Ipv4Only
              - !Ref AWS::NoValue
              - Cidr: !Select [ 0, !GetAtt PrivateSubnet1.Ipv6CidrBlocks ]
                Description: !Sub ${ResourcePrefix} Private Subnet 1 IPv6 CIDR block.
          - !Ref AWS::NoValue
      MaxEntries: 1
      PrefixListName: !Sub ${ResourcePrefix}-private-subnet1-ipv6-cidr-pl
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-private-subnet1-ipv6-cidr-pl

#---------------------------------------
# Private Subnet 2
#---------------------------------------

  PrivateRouteTable2:
    Type: AWS::EC2::RouteTable
    Condition: CreateSubnet2
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-private-rtb2-${Subnet2AvailabilityZone}

  InternetAccessPrivateRoute2:
    Type: AWS::EC2::Route
    Condition: EnablePrivateNatGateway2
    DependsOn: VPCInternetGatewayAttachment
    Properties:
      RouteTableId: !Ref PrivateRouteTable2
      DestinationCidrBlock: 0.0.0.0/0
      NatGatewayId: !Ref NatGateway2

  InternetAccessPrivateRoute2IPv6:
    Type: AWS::EC2::Route
    Condition: NotPrivateSubnet2Ipv4Only
    Properties:
      RouteTableId: !Ref PrivateRouteTable2
      DestinationIpv6CidrBlock: ::/0
      EgressOnlyInternetGatewayId: !Ref EgressOnlyInternetGateway

  InternetAccessPrivateRoute2NAT64:
    Type: AWS::EC2::Route
    Condition: EnablePrivateSubnet2NAT64
    DependsOn: VPCInternetGatewayAttachment
    Properties:
      RouteTableId: !Ref PrivateRouteTable2
      DestinationIpv6CidrBlock: 64:ff9b::/96
      NatGatewayId: !Ref NatGateway2

  PrivateSubnet2:
    Type: AWS::EC2::Subnet
    Condition: CreateSubnet2
    DependsOn: EnableIpv6CidrBlockWaitCondition
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Ref Subnet2AvailabilityZone
      MapPublicIpOnLaunch: false
      AssignIpv6AddressOnCreation: !If [ PrivateSubnet2Ipv4Only, false, true ]
      CidrBlock:
        Fn::If:
          - PrivateSubnet2Ipv6Only
          - !Ref AWS::NoValue
          - !Sub ${VpcCidrBlockIpAddressPrefix}.${PrivateSubnet2CidrBlockIpAddressSuffix}/${PrivateSubnet2CidrBlockCidr}
      Ipv6CidrBlock:
        Fn::If:
          - PrivateSubnet2Ipv4Only
          - !Ref AWS::NoValue
          - !Select [ 7, !Cidr [ !Select [ 0, !GetAtt VPC.Ipv6CidrBlocks ], 9, 64 ] ]
      Ipv6Native: !If [ PrivateSubnet2Ipv6Only, true, false ]
      EnableDns64: !If [ EnablePrivateSubnet2NAT64, true, false ]
      Tags:
        - Key: Name
          Value:
            Fn::If:
              - NotSpecifiedPrivateSubnet2Name
              - !Sub ${ResourcePrefix}-private-subnet2-${Subnet2AvailabilityZone}
              - !Ref PrivateSubnet2Name

  PrivateSubnet2RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Condition: CreateSubnet2
    Properties:
      SubnetId: !Ref PrivateSubnet2
      RouteTableId: !Ref PrivateRouteTable2

  PrivateSubnet2NACLAssociation:
    Type: AWS::EC2::SubnetNetworkAclAssociation
    Condition: CreateSubnet2
    Properties:
      SubnetId: !Ref PrivateSubnet2
      NetworkAclId: !Ref PrivateNetworkACL

  PrivateSubnet2IPv4CidrPrefixList:
    Type: AWS::EC2::PrefixList
    Condition: CreatePrefixList
    Properties:
      AddressFamily: IPv4
      Entries:
        - Fn::If:
          - CreateSubnet2
          - Fn::If:
              - PrivateSubnet2Ipv6Only
              - !Ref AWS::NoValue
              - Cidr: !GetAtt PrivateSubnet2.CidrBlock
                Description: !Sub ${ResourcePrefix} Private Subnet 2 IPv4 CIDR block.
          - !Ref AWS::NoValue
      MaxEntries: 1
      PrefixListName: !Sub ${ResourcePrefix}-private-subnet2-ipv4-cidr-pl
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-private-subnet2-ipv4-cidr-pl

  PrivateSubnet2IPv6CidrPrefixList:
    Type: AWS::EC2::PrefixList
    Condition: CreatePrefixList
    Properties:
      AddressFamily: IPv6
      Entries:
        - Fn::If:
          - CreateSubnet2
          - Fn::If:
              - PrivateSubnet2Ipv4Only
              - !Ref AWS::NoValue
              - Cidr: !Select [ 0, !GetAtt PrivateSubnet2.Ipv6CidrBlocks ]
                Description: !Sub ${ResourcePrefix} Private Subnet 2 IPv6 CIDR block.
          - !Ref AWS::NoValue
      MaxEntries: 1
      PrefixListName: !Sub ${ResourcePrefix}-private-subnet2-ipv6-cidr-pl
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-private-subnet2-ipv6-cidr-pl

#---------------------------------------
# Private Subnet 3
#---------------------------------------

  PrivateRouteTable3:
    Type: AWS::EC2::RouteTable
    Condition: CreateSubnet3
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-private-rtb3-${Subnet3AvailabilityZone}

  InternetAccessPrivateRoute3:
    Type: AWS::EC2::Route
    Condition: EnablePrivateNatGateway3
    DependsOn: VPCInternetGatewayAttachment
    Properties:
      RouteTableId: !Ref PrivateRouteTable3
      DestinationCidrBlock: 0.0.0.0/0
      NatGatewayId: !Ref NatGateway3

  InternetAccessPrivateRoute3IPv6:
    Type: AWS::EC2::Route
    Condition: NotPrivateSubnet3Ipv4Only
    Properties:
      RouteTableId: !Ref PrivateRouteTable3
      DestinationIpv6CidrBlock: ::/0
      EgressOnlyInternetGatewayId: !Ref EgressOnlyInternetGateway

  InternetAccessPrivateRoute3NAT64:
    Type: AWS::EC2::Route
    Condition: EnablePrivateSubnet3NAT64
    DependsOn: VPCInternetGatewayAttachment
    Properties:
      RouteTableId: !Ref PrivateRouteTable3
      DestinationIpv6CidrBlock: 64:ff9b::/96
      NatGatewayId: !Ref NatGateway3

  PrivateSubnet3:
    Type: AWS::EC2::Subnet
    Condition: CreateSubnet3
    DependsOn: EnableIpv6CidrBlockWaitCondition
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Ref Subnet3AvailabilityZone
      MapPublicIpOnLaunch: false
      AssignIpv6AddressOnCreation: !If [ PrivateSubnet3Ipv4Only, false, true ]
      CidrBlock:
        Fn::If:
          - PrivateSubnet3Ipv6Only
          - !Ref AWS::NoValue
          - !Sub ${VpcCidrBlockIpAddressPrefix}.${PrivateSubnet3CidrBlockIpAddressSuffix}/${PrivateSubnet3CidrBlockCidr}
      Ipv6CidrBlock:
        Fn::If:
          - PrivateSubnet3Ipv4Only
          - !Ref AWS::NoValue
          - !Select [ 8, !Cidr [ !Select [ 0, !GetAtt VPC.Ipv6CidrBlocks ], 9, 64 ] ]
      Ipv6Native: !If [ PrivateSubnet3Ipv6Only, true, false ]
      EnableDns64: !If [ EnablePrivateSubnet3NAT64, true, false ]
      Tags:
        - Key: Name
          Value:
            Fn::If:
              - NotSpecifiedPrivateSubnet3Name
              - !Sub ${ResourcePrefix}-private-subnet3-${Subnet3AvailabilityZone}
              - !Ref PrivateSubnet3Name

  PrivateSubnet3RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Condition: CreateSubnet3
    Properties:
      SubnetId: !Ref PrivateSubnet3
      RouteTableId: !Ref PrivateRouteTable3

  PrivateSubnet3NACLAssociation:
    Type: AWS::EC2::SubnetNetworkAclAssociation
    Condition: CreateSubnet3
    Properties:
      SubnetId: !Ref PrivateSubnet3
      NetworkAclId: !Ref PrivateNetworkACL

  PrivateSubnet3IPv4CidrPrefixList:
    Type: AWS::EC2::PrefixList
    Condition: CreatePrefixList
    Properties:
      AddressFamily: IPv4
      Entries:
        - Fn::If:
          - CreateSubnet3
          - Fn::If:
              - PrivateSubnet3Ipv6Only
              - !Ref AWS::NoValue
              - Cidr: !GetAtt PrivateSubnet3.CidrBlock
                Description: !Sub ${ResourcePrefix} Private Subnet 3 IPv4 CIDR block.
          - !Ref AWS::NoValue
      MaxEntries: 1
      PrefixListName: !Sub ${ResourcePrefix}-private-subnet3-ipv4-cidr-pl
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-private-subnet3-ipv4-cidr-pl

  PrivateSubnet3IPv6CidrPrefixList:
    Type: AWS::EC2::PrefixList
    Condition: CreatePrefixList
    Properties:
      AddressFamily: IPv6
      Entries:
        - Fn::If:
          - CreateSubnet3
          - Fn::If:
              - PrivateSubnet3Ipv4Only
              - !Ref AWS::NoValue
              - Cidr: !Select [ 0, !GetAtt PrivateSubnet3.Ipv6CidrBlocks ]
                Description: !Sub ${ResourcePrefix} Private Subnet 3 IPv6 CIDR block.
          - !Ref AWS::NoValue
      MaxEntries: 1
      PrefixListName: !Sub ${ResourcePrefix}-private-subnet3-ipv6-cidr-pl
      Tags:
        - Key: Name
          Value: !Sub ${ResourcePrefix}-private-subnet3-ipv6-cidr-pl

##############################
# Gateway Type VPC Endpoint
##############################

  GatewayTypeVpcEndpointS3:
    Type: AWS::EC2::VPCEndpoint
    Condition: CreateS3VpcEndpoint
    Properties:
      ServiceName: !Sub com.amazonaws.${AWS::Region}.s3
      VpcId: !Ref VPC
      VpcEndpointType: Gateway
      RouteTableIds:
        - Fn::If:
          - CreateSubnet1
          - !GetAtt PublicRouteTable1ForNATGW.RouteTableId
          - !Ref AWS::NoValue
        - Fn::If:
          - CreateSubnet1
          - !GetAtt PublicRouteTable1.RouteTableId
          - !Ref AWS::NoValue
        - Fn::If:
          - CreateSubnet1
          - !GetAtt PrivateRouteTable1.RouteTableId
          - !Ref AWS::NoValue
        - Fn::If:
          - CreateSubnet2
          - !GetAtt PublicRouteTable2ForNATGW.RouteTableId
          - !Ref AWS::NoValue
        - Fn::If:
          - CreateSubnet2
          - !GetAtt PublicRouteTable2.RouteTableId
          - !Ref AWS::NoValue
        - Fn::If:
          - CreateSubnet2
          - !GetAtt PrivateRouteTable2.RouteTableId
          - !Ref AWS::NoValue
        - Fn::If:
          - CreateSubnet3
          - !GetAtt PublicRouteTable3ForNATGW.RouteTableId
          - !Ref AWS::NoValue
        - Fn::If:
          - CreateSubnet3
          - !GetAtt PublicRouteTable3.RouteTableId
          - !Ref AWS::NoValue
        - Fn::If:
          - CreateSubnet3
          - !GetAtt PrivateRouteTable3.RouteTableId
          - !Ref AWS::NoValue

  GatewayTypeVpcEndpointDynamoDB:
    Type: AWS::EC2::VPCEndpoint
    Condition: CreateDynamoDBVpcEndpoint
    Properties:
      ServiceName: !Sub com.amazonaws.${AWS::Region}.dynamodb
      VpcId: !Ref VPC
      VpcEndpointType: Gateway
      RouteTableIds:
        - Fn::If:
          - CreateSubnet1
          - !GetAtt PublicRouteTable1ForNATGW.RouteTableId
          - !Ref AWS::NoValue
        - Fn::If:
          - CreateSubnet1
          - !GetAtt PublicRouteTable1.RouteTableId
          - !Ref AWS::NoValue
        - Fn::If:
          - CreateSubnet1
          - !GetAtt PrivateRouteTable1.RouteTableId
          - !Ref AWS::NoValue
        - Fn::If:
          - CreateSubnet2
          - !GetAtt PublicRouteTable2ForNATGW.RouteTableId
          - !Ref AWS::NoValue
        - Fn::If:
          - CreateSubnet2
          - !GetAtt PublicRouteTable2.RouteTableId
          - !Ref AWS::NoValue
        - Fn::If:
          - CreateSubnet2
          - !GetAtt PrivateRouteTable2.RouteTableId
          - !Ref AWS::NoValue
        - Fn::If:
          - CreateSubnet3
          - !GetAtt PublicRouteTable3ForNATGW.RouteTableId
          - !Ref AWS::NoValue
        - Fn::If:
          - CreateSubnet3
          - !GetAtt PublicRouteTable3.RouteTableId
          - !Ref AWS::NoValue
        - Fn::If:
          - CreateSubnet3
          - !GetAtt PrivateRouteTable3.RouteTableId
          - !Ref AWS::NoValue

Outputs:

##############################
# VPC
##############################

  VpcId:
    Value: !Ref VPC
    Export:
      Name: !Sub ${AWS::StackName}-VpcId

  VpcCidrBlock:
    Value: !GetAtt VPC.CidrBlock
    Export:
      Name: !Sub ${AWS::StackName}-VpcCidrBlock

  EnableIpv6:
    Value: !If [ EnableIpv6CidrBlock, true, false ]
    Export:
      Name: !Sub ${AWS::StackName}-EnableIpv6

  VpcIpv6CidrBlocks:
# Exported values must not be empty or whitespace-only, so empty values  represent '-'.
    Value:
      Fn::If:
        - EnableIpv6CidrBlock
        - !Join [ ',', !GetAtt VPC.Ipv6CidrBlocks ]
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-VpcIpv6CidrBlocks

  VpcIPv4CidrPrefixListId:
    Value:
      Fn::If:
        - CreatePrefixList
        - !Ref VPCIPv4CidrPrefixList
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-VpcIPv4CidrPrefixListId

  VpcIPv6CidrPrefixListId:
    Value:
      Fn::If:
        - CreatePrefixList
        - !Ref VPCIPv6CidrPrefixList
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-VpcIPv6CidrPrefixListId

##############################
# Subnet
##############################

  CreateSubnet:
    Value: !If [ CreateSubnet, true, false ]
    Export:
      Name: !Sub ${AWS::StackName}-CreateSubnet

  CreateSubnet1:
    Value: !If [ CreateSubnet1, true, false ]
    Export:
      Name: !Sub ${AWS::StackName}-CreateSubnet1

  CreateSubnet2:
    Value: !If [ CreateSubnet2, true, false ]
    Export:
      Name: !Sub ${AWS::StackName}-CreateSubnet2

  CreateSubnet3:
    Value: !If [ CreateSubnet3, true, false ]
    Export:
      Name: !Sub ${AWS::StackName}-CreateSubnet3

  CreatedSubnetKeys:
    Value:
      Fn::If:
        - CreateSubnet
        - Fn::Join:
            - ','
            - - Fn::If:
                  - CreateSubnet1
                  - PublicSubnet1ForNATGW,PublicSubnet1,PrivateSubnet1
                  - !Ref AWS::NoValue
              - Fn::If:
                  - CreateSubnet2
                  - PublicSubnet2ForNATGW,PublicSubnet2,PrivateSubnet2
                  - !Ref AWS::NoValue
              - Fn::If:
                  - CreateSubnet3
                  - PublicSubnet3ForNATGW,PublicSubnet3,PrivateSubnet3
                  - !Ref AWS::NoValue
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-CreatedSubnetKeys

  Subnet1AvailabilityZone:
    Value: !If [ CreateSubnet1, !Ref Subnet1AvailabilityZone, '-' ]
    Export:
      Name: !Sub ${AWS::StackName}-Subnet1AvailabilityZone

  Subnet2AvailabilityZone:
    Value: !If [ CreateSubnet2, !Ref Subnet2AvailabilityZone, '-' ]
    Export:
      Name: !Sub ${AWS::StackName}-Subnet2AvailabilityZone

  Subnet3AvailabilityZone:
    Value: !If [ CreateSubnet3, !Ref Subnet3AvailabilityZone, '-' ]
    Export:
      Name: !Sub ${AWS::StackName}-Subnet3AvailabilityZone

  EnableNatGateway:
    Value: !If [ EnableNatGateway, true, false ]
    Export:
      Name: !Sub ${AWS::StackName}-EnableNatGateway

##############################
# Public NAT Gateway Network
##############################

  NatGatewayEipPrefixListId:
    Value:
      Fn::If:
        - CreatePrefixList
        - !Ref NatGatewayEipPrefixList
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-NatGatewayEipPrefixListId

  PublicSubnetForNATGWIPv4CidrPrefixListId:
    Value:
      Fn::If:
        - CreatePrefixList
        - !Ref PublicSubnetForNATGWIPv4CidrPrefixList
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnetForNATGWIPv4CidrPrefixListId

  PublicSubnetForNATGWIPv6CidrPrefixListId:
    Value:
      Fn::If:
        - CreatePrefixList
        - !Ref PublicSubnetForNATGWIPv6CidrPrefixList
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnetForNATGWIPv6CidrPrefixListId

  CreatedPublicSubnetForNATGWIds:
    Value:
      Fn::If:
        - CreateSubnet
        - Fn::Join:
            - ','
            - - Fn::If:
                  - CreateSubnet1
                  - !Ref PublicSubnet1ForNATGW
                  - !Ref AWS::NoValue
              - Fn::If:
                  - CreateSubnet2
                  - !Ref PublicSubnet2ForNATGW
                  - !Ref AWS::NoValue
              - Fn::If:
                  - CreateSubnet3
                  - !Ref PublicSubnet3ForNATGW
                  - !Ref AWS::NoValue
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-CreatedPublicSubnetForNATGWIds

  CreatedPublicSubnetForNATGWKeys:
    Value:
      Fn::If:
        - CreateSubnet
        - Fn::Join:
            - ','
            - - Fn::If:
                  - CreateSubnet1
                  - PublicSubnet1ForNATGW
                  - !Ref AWS::NoValue
              - Fn::If:
                  - CreateSubnet2
                  - PublicSubnet2ForNATGW
                  - !Ref AWS::NoValue
              - Fn::If:
                  - CreateSubnet3
                  - PublicSubnet3ForNATGW
                  - !Ref AWS::NoValue
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-CreatedPublicSubnetForNATGWKeys

#---------------------------------------
# Public Subnet 1 For NAT Gateway
#---------------------------------------

  NatGateway1PublicIp:
    Value:
      Fn::If:
        - EnableNatGateway1
        - !GetAtt NatGatewayEip1.PublicIp
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-NatGateway1PublicIp

  PublicRouteTable1ForNATGWId:
    Value:
      Fn::If:
        - CreateSubnet1
        - !Ref PublicRouteTable1ForNATGW
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicRouteTable1ForNATGWId

  PublicSubnet1ForNATGWId:
    Value:
      Fn::If:
        - CreateSubnet1
        - !Ref PublicSubnet1ForNATGW
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet1ForNATGWId

  PublicSubnet1ForNATGWCidrBlock:
    Value:
      Fn::If:
        - CreateSubnet1
        - !GetAtt PublicSubnet1ForNATGW.CidrBlock
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet1ForNATGWCidrBlock

  PublicSubnet1ForNATGWIpv6CidrBlocks:
    Value:
      Fn::If:
        - EnableIpv6CidrBlock1
        - !Join [ ',', !GetAtt PublicSubnet1ForNATGW.Ipv6CidrBlocks ]
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet1ForNATGWIpv6CidrBlocks

  PublicSubnet1ForNATGWProtocolStack:
    Value:
      Fn::If:
        - CreateSubnet1
        - Fn::If:
            - EnableIpv6CidrBlock1
            - DualStack
            - IPv4Only
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet1ForNATGWProtocolStack

  PublicSubnet1ForNATGWMapPublicIpOnLaunch:
    Value: !If [ CreateSubnet1, true, false ]
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet1ForNATGWMapPublicIpOnLaunch

  NatGatewayEip1PrefixListId:
    Value:
      Fn::If:
        - CreatePrefixList
        - !Ref NatGatewayEip1PrefixList
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-NatGatewayEip1PrefixListId

  PublicSubnet1ForNATGWIPv4CidrPrefixListId:
    Value:
      Fn::If:
        - CreatePrefixList
        - !Ref PublicSubnet1ForNATGWIPv4CidrPrefixList
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet1ForNATGWIPv4CidrPrefixListId

  PublicSubnet1ForNATGWIPv6CidrPrefixListId:
    Value:
      Fn::If:
        - CreatePrefixList
        - !Ref PublicSubnet1ForNATGWIPv6CidrPrefixList
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet1ForNATGWIPv6CidrPrefixListId

#---------------------------------------
# Public Subnet 2 For NAT Gateway
#---------------------------------------

  NatGateway2PublicIp:
    Value:
      Fn::If:
        - EnableNatGateway2
        - !GetAtt NatGatewayEip2.PublicIp
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-NatGateway2PublicIp

  PublicRouteTable2ForNATGWId:
    Value:
      Fn::If:
        - CreateSubnet2
        - !Ref PublicRouteTable2ForNATGW
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicRouteTable2ForNATGWId

  PublicSubnet2ForNATGWId:
    Value:
      Fn::If:
        - CreateSubnet2
        - !Ref PublicSubnet2ForNATGW
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet2ForNATGWId

  PublicSubnet2ForNATGWCidrBlock:
    Value:
      Fn::If:
        - CreateSubnet2
        - !GetAtt PublicSubnet2ForNATGW.CidrBlock
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet2ForNATGWCidrBlock

  PublicSubnet2ForNATGWIpv6CidrBlocks:
    Value:
      Fn::If:
        - EnableIpv6CidrBlock2
        - !Join [ ',', !GetAtt PublicSubnet2ForNATGW.Ipv6CidrBlocks ]
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet2ForNATGWIpv6CidrBlocks

  PublicSubnet2ForNATGWProtocolStack:
    Value:
      Fn::If:
        - CreateSubnet2
        - Fn::If:
            - EnableIpv6CidrBlock2
            - DualStack
            - IPv4Only
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet2ForNATGWProtocolStack

  PublicSubnet2ForNATGWMapPublicIpOnLaunch:
    Value: !If [ CreateSubnet2, true, false ]
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet2ForNATGWMapPublicIpOnLaunch

  NatGatewayEip2PrefixListId:
    Value:
      Fn::If:
        - CreatePrefixList
        - !Ref NatGatewayEip2PrefixList
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-NatGatewayEip2PrefixListId

  PublicSubnet2ForNATGWIPv4CidrPrefixListId:
    Value:
      Fn::If:
        - CreatePrefixList
        - !Ref PublicSubnet2ForNATGWIPv4CidrPrefixList
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet2ForNATGWIPv4CidrPrefixListId

  PublicSubnet2ForNATGWIPv6CidrPrefixListId:
    Value:
      Fn::If:
        - CreatePrefixList
        - !Ref PublicSubnet2ForNATGWIPv6CidrPrefixList
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet2ForNATGWIPv6CidrPrefixListId

#---------------------------------------
# Public Subnet 3 For NAT Gateway
#---------------------------------------

  NatGateway3PublicIp:
    Value:
      Fn::If:
        - EnableNatGateway3
        - !GetAtt NatGatewayEip3.PublicIp
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-NatGateway3PublicIp

  PublicRouteTable3ForNATGWId:
    Value:
      Fn::If:
        - CreateSubnet3
        - !Ref PublicRouteTable3ForNATGW
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicRouteTable3ForNATGWId

  PublicSubnet3ForNATGWId:
    Value:
      Fn::If:
        - CreateSubnet3
        - !Ref PublicSubnet3ForNATGW
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet3ForNATGWId

  PublicSubnet3ForNATGWCidrBlock:
    Value:
      Fn::If:
        - CreateSubnet3
        - !GetAtt PublicSubnet3ForNATGW.CidrBlock
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet3ForNATGWCidrBlock

  PublicSubnet3ForNATGWIpv6CidrBlocks:
    Value:
      Fn::If:
        - EnableIpv6CidrBlock3
        - !Join [ ',', !GetAtt PublicSubnet3ForNATGW.Ipv6CidrBlocks ]
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet3ForNATGWIpv6CidrBlocks

  PublicSubnet3ForNATGWProtocolStack:
    Value:
      Fn::If:
        - CreateSubnet3
        - Fn::If:
            - EnableIpv6CidrBlock3
            - DualStack
            - IPv4Only
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet3ForNATGWProtocolStack

  PublicSubnet3ForNATGWMapPublicIpOnLaunch:
    Value: !If [ CreateSubnet3, true, false ]
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet3ForNATGWMapPublicIpOnLaunch

  NatGatewayEip3PrefixListId:
    Value:
      Fn::If:
        - CreatePrefixList
        - !Ref NatGatewayEip3PrefixList
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-NatGatewayEip3PrefixListId

  PublicSubnet3ForNATGWIPv4CidrPrefixListId:
    Value:
      Fn::If:
        - CreatePrefixList
        - !Ref PublicSubnet3ForNATGWIPv4CidrPrefixList
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet3ForNATGWIPv4CidrPrefixListId

  PublicSubnet3ForNATGWIPv6CidrPrefixListId:
    Value:
      Fn::If:
        - CreatePrefixList
        - !Ref PublicSubnet3ForNATGWIPv6CidrPrefixList
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet3ForNATGWIPv6CidrPrefixListId

##############################
# Public Network
##############################

  PublicSubnetIPv4CidrPrefixListId:
    Value:
      Fn::If:
        - CreatePrefixList
        - !Ref PublicSubnetIPv4CidrPrefixList
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnetIPv4CidrPrefixListId

  PublicSubnetIPv6CidrPrefixListId:
    Value:
      Fn::If:
        - CreatePrefixList
        - !Ref PublicSubnetIPv6CidrPrefixList
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnetIPv6CidrPrefixListId

  CreatedPublicSubnetIds:
    Value:
      Fn::If:
        - CreateSubnet
        - Fn::Join:
            - ','
            - - Fn::If:
                  - CreateSubnet1
                  - !Ref PublicSubnet1
                  - !Ref AWS::NoValue
              - Fn::If:
                  - CreateSubnet2
                  - !Ref PublicSubnet2
                  - !Ref AWS::NoValue
              - Fn::If:
                  - CreateSubnet3
                  - !Ref PublicSubnet3
                  - !Ref AWS::NoValue
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-CreatedPublicSubnetIds

  CreatedPublicSubnetKeys:
    Value:
      Fn::If:
        - CreateSubnet
        - Fn::Join:
            - ','
            - - Fn::If:
                  - CreateSubnet1
                  - PublicSubnet1
                  - !Ref AWS::NoValue
              - Fn::If:
                  - CreateSubnet2
                  - PublicSubnet2
                  - !Ref AWS::NoValue
              - Fn::If:
                  - CreateSubnet3
                  - PublicSubnet3
                  - !Ref AWS::NoValue
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-CreatedPublicSubnetKeys

#---------------------------------------
# Public Subnet 1
#---------------------------------------

  PublicRouteTable1Id:
    Value:
      Fn::If:
        - CreateSubnet1
        - !Ref PublicRouteTable1
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicRouteTable1Id

  PublicSubnet1Id:
    Value:
      Fn::If:
        - CreateSubnet1
        - !Ref PublicSubnet1
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet1Id

  PublicSubnet1CidrBlock:
    Value:
      Fn::If:
        - CreateSubnet1
        - Fn::If:
            - PublicSubnet1Ipv6Only
            - '-'
            - !GetAtt PublicSubnet1.CidrBlock
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet1CidrBlock

  PublicSubnet1Ipv6CidrBlocks:
    Value:
      Fn::If:
        - CreateSubnet1
        - Fn::If:
            - PublicSubnet1Ipv4Only
            - '-'
            - !Join [ ',', !GetAtt PublicSubnet1.Ipv6CidrBlocks ]
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet1Ipv6CidrBlocks

  PublicSubnet1ProtocolStack:
    Value:
      Fn::If:
        - CreateSubnet1
        - Fn::If:
            - PublicSubnet1Ipv6Only
            - IPv6Only
            - Fn::If:
                - PublicSubnet1Ipv4Only
                - IPv4Only
                - DualStack
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet1ProtocolStack

  PublicSubnet1MapPublicIpOnLaunch:
    Value: !If [ PublicSubnet1Ipv6Only, false, true ]
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet1MapPublicIpOnLaunch

  PublicSubnet1IPv4CidrPrefixListId:
    Value:
      Fn::If:
        - CreatePrefixList
        - !Ref PublicSubnet1IPv4CidrPrefixList
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet1IPv4CidrPrefixListId

  PublicSubnet1IPv6CidrPrefixListId:
    Value:
      Fn::If:
        - CreatePrefixList
        - !Ref PublicSubnet1IPv6CidrPrefixList
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet1IPv6CidrPrefixListId

#---------------------------------------
# Public Subnet 2
#---------------------------------------

  PublicRouteTable2Id:
    Value:
      Fn::If:
        - CreateSubnet2
        - !Ref PublicRouteTable2
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicRouteTable2Id

  PublicSubnet2Id:
    Value:
      Fn::If:
        - CreateSubnet2
        - !Ref PublicSubnet2
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet2Id

  PublicSubnet2CidrBlock:
    Value:
      Fn::If:
        - CreateSubnet2
        - Fn::If:
            - PublicSubnet2Ipv6Only
            - '-'
            - !GetAtt PublicSubnet2.CidrBlock
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet2CidrBlock

  PublicSubnet2Ipv6CidrBlocks:
    Value:
      Fn::If:
        - CreateSubnet2
        - Fn::If:
            - PublicSubnet2Ipv4Only
            - '-'
            - !Join [ ',', !GetAtt PublicSubnet2.Ipv6CidrBlocks ]
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet2Ipv6CidrBlocks

  PublicSubnet2ProtocolStack:
    Value:
      Fn::If:
        - CreateSubnet2
        - Fn::If:
            - PublicSubnet2Ipv6Only
            - IPv6Only
            - Fn::If:
                - PublicSubnet2Ipv4Only
                - IPv4Only
                - DualStack
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet2ProtocolStack

  PublicSubnet2MapPublicIpOnLaunch:
    Value: !If [ PublicSubnet2Ipv6Only, false, true ]
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet2MapPublicIpOnLaunch

  PublicSubnet2IPv4CidrPrefixListId:
    Value:
      Fn::If:
        - CreatePrefixList
        - !Ref PublicSubnet2IPv4CidrPrefixList
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet2IPv4CidrPrefixListId

  PublicSubnet2IPv6CidrPrefixListId:
    Value:
      Fn::If:
        - CreatePrefixList
        - !Ref PublicSubnet2IPv6CidrPrefixList
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet2IPv6CidrPrefixListId

#---------------------------------------
# Public Subnet 3
#---------------------------------------

  PublicRouteTable3Id:
    Value:
      Fn::If:
        - CreateSubnet3
        - !Ref PublicRouteTable3
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicRouteTable3Id

  PublicSubnet3Id:
    Value:
      Fn::If:
        - CreateSubnet3
        - !Ref PublicSubnet3
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet3Id

  PublicSubnet3CidrBlock:
    Value:
      Fn::If:
        - CreateSubnet3
        - Fn::If:
            - PublicSubnet3Ipv6Only
            - '-'
            - !GetAtt PublicSubnet3.CidrBlock
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet3CidrBlock

  PublicSubnet3Ipv6CidrBlocks:
    Value:
      Fn::If:
        - CreateSubnet3
        - Fn::If:
            - PublicSubnet3Ipv4Only
            - '-'
            - !Join [ ',', !GetAtt PublicSubnet3.Ipv6CidrBlocks ]
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet3Ipv6CidrBlocks

  PublicSubnet3ProtocolStack:
    Value:
      Fn::If:
        - CreateSubnet3
        - Fn::If:
            - PublicSubnet3Ipv6Only
            - IPv6Only
            - Fn::If:
                - PublicSubnet3Ipv4Only
                - IPv4Only
                - DualStack
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet3ProtocolStack

  PublicSubnet3MapPublicIpOnLaunch:
    Value: !If [ PublicSubnet3Ipv6Only, false, true ]
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet3MapPublicIpOnLaunch

  PublicSubnet3IPv4CidrPrefixListId:
    Value:
      Fn::If:
        - CreatePrefixList
        - !Ref PublicSubnet3IPv4CidrPrefixList
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet3IPv4CidrPrefixListId

  PublicSubnet3IPv6CidrPrefixListId:
    Value:
      Fn::If:
        - CreatePrefixList
        - !Ref PublicSubnet3IPv6CidrPrefixList
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PublicSubnet3IPv6CidrPrefixListId

##############################
# Private Network
##############################

  PrivateSubnetIPv4CidrPrefixListId:
    Value:
      Fn::If:
        - CreatePrefixList
        - !Ref PrivateSubnetIPv4CidrPrefixList
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PrivateSubnetIPv4CidrPrefixListId

  PrivateSubnetIPv6CidrPrefixListId:
    Value:
      Fn::If:
        - CreatePrefixList
        - !Ref PrivateSubnetIPv6CidrPrefixList
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PrivateSubnetIPv6CidrPrefixListId

  CreatedPrivateSubnetIds:
    Value:
      Fn::If:
        - CreateSubnet
        - Fn::Join:
            - ','
            - - Fn::If:
                  - CreateSubnet1
                  - !Ref PrivateSubnet1
                  - !Ref AWS::NoValue
              - Fn::If:
                  - CreateSubnet2
                  - !Ref PrivateSubnet2
                  - !Ref AWS::NoValue
              - Fn::If:
                  - CreateSubnet3
                  - !Ref PrivateSubnet3
                  - !Ref AWS::NoValue
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-CreatedPrivateSubnetIds

  CreatedPrivateSubnetKeys:
    Value:
      Fn::If:
        - CreateSubnet
        - Fn::Join:
            - ','
            - - Fn::If:
                  - CreateSubnet1
                  - PrivateSubnet1
                  - !Ref AWS::NoValue
              - Fn::If:
                  - CreateSubnet2
                  - PrivateSubnet2
                  - !Ref AWS::NoValue
              - Fn::If:
                  - CreateSubnet3
                  - PrivateSubnet3
                  - !Ref AWS::NoValue
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-CreatedPrivateSubnetKeys

#---------------------------------------
# Private Subnet 1
#---------------------------------------

  PrivateRouteTable1Id:
    Value:
      Fn::If:
        - CreateSubnet1
        - !Ref PrivateRouteTable1
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PrivateRouteTable1Id

  PrivateSubnet1Id:
    Value:
      Fn::If:
        - CreateSubnet1
        - !Ref PrivateSubnet1
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PrivateSubnet1Id

  PrivateSubnet1CidrBlock:
    Value:
      Fn::If:
        - CreateSubnet1
        - Fn::If:
            - PrivateSubnet1Ipv6Only
            - '-'
            - !GetAtt PrivateSubnet1.CidrBlock
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PrivateSubnet1CidrBlock

  PrivateSubnet1Ipv6CidrBlocks:
    Value:
      Fn::If:
        - CreateSubnet1
        - Fn::If:
            - PrivateSubnet1Ipv4Only
            - '-'
            - !Join [ ',', !GetAtt PrivateSubnet1.Ipv6CidrBlocks ]
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PrivateSubnet1Ipv6CidrBlocks

  PrivateSubnet1ProtocolStack:
    Value:
      Fn::If:
        - CreateSubnet1
        - Fn::If:
            - PrivateSubnet1Ipv6Only
            - IPv6Only
            - Fn::If:
                - PrivateSubnet1Ipv4Only
                - IPv4Only
                - DualStack
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PrivateSubnet1ProtocolStack

  PrivateSubnet1MapPublicIpOnLaunch:
    Value: false
    Export:
      Name: !Sub ${AWS::StackName}-PrivateSubnet1MapPublicIpOnLaunch

  PrivateSubnet1IPv4CidrPrefixListId:
    Value:
      Fn::If:
        - CreatePrefixList
        - !Ref PrivateSubnet1IPv4CidrPrefixList
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PrivateSubnet1IPv4CidrPrefixListId

  PrivateSubnet1IPv6CidrPrefixListId:
    Value:
      Fn::If:
        - CreatePrefixList
        - !Ref PrivateSubnet1IPv6CidrPrefixList
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PrivateSubnet1IPv6CidrPrefixListId

#---------------------------------------
# Private Subnet 2
#---------------------------------------

  PrivateRouteTable2Id:
    Value:
      Fn::If:
        - CreateSubnet2
        - !Ref PrivateRouteTable2
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PrivateRouteTable2Id

  PrivateSubnet2Id:
    Value:
      Fn::If:
        - CreateSubnet2
        - !Ref PrivateSubnet2
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PrivateSubnet2Id

  PrivateSubnet2CidrBlock:
    Value:
      Fn::If:
        - CreateSubnet2
        - Fn::If:
            - PrivateSubnet2Ipv6Only
            - '-'
            - !GetAtt PrivateSubnet2.CidrBlock
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PrivateSubnet2CidrBlock

  PrivateSubnet2Ipv6CidrBlocks:
    Value:
      Fn::If:
        - CreateSubnet2
        - Fn::If:
            - PrivateSubnet2Ipv4Only
            - '-'
            - !Join [ ',', !GetAtt PrivateSubnet2.Ipv6CidrBlocks ]
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PrivateSubnet2Ipv6CidrBlocks

  PrivateSubnet2ProtocolStack:
    Value:
      Fn::If:
        - CreateSubnet2
        - Fn::If:
            - PrivateSubnet2Ipv6Only
            - IPv6Only
            - Fn::If:
                - PrivateSubnet2Ipv4Only
                - IPv4Only
                - DualStack
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PrivateSubnet2ProtocolStack

  PrivateSubnet2MapPublicIpOnLaunch:
    Value: false
    Export:
      Name: !Sub ${AWS::StackName}-PrivateSubnet2MapPublicIpOnLaunch

  PrivateSubnet2IPv4CidrPrefixListId:
    Value:
      Fn::If:
        - CreatePrefixList
        - !Ref PrivateSubnet2IPv4CidrPrefixList
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PrivateSubnet2IPv4CidrPrefixListId

  PrivateSubnet2IPv6CidrPrefixListId:
    Value:
      Fn::If:
        - CreatePrefixList
        - !Ref PrivateSubnet2IPv6CidrPrefixList
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PrivateSubnet2IPv6CidrPrefixListId

#---------------------------------------
# Private Subnet 3
#---------------------------------------

  PrivateRouteTable3Id:
    Value:
      Fn::If:
        - CreateSubnet3
        - !Ref PrivateRouteTable3
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PrivateRouteTable3Id

  PrivateSubnet3Id:
    Value:
      Fn::If:
        - CreateSubnet3
        - !Ref PrivateSubnet3
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PrivateSubnet3Id

  PrivateSubnet3CidrBlock:
    Value:
      Fn::If:
        - CreateSubnet3
        - Fn::If:
            - PrivateSubnet3Ipv6Only
            - '-'
            - !GetAtt PrivateSubnet3.CidrBlock
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PrivateSubnet3CidrBlock

  PrivateSubnet3Ipv6CidrBlocks:
    Value:
      Fn::If:
        - CreateSubnet3
        - Fn::If:
            - PrivateSubnet3Ipv4Only
            - '-'
            - !Join [ ',', !GetAtt PrivateSubnet3.Ipv6CidrBlocks ]
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PrivateSubnet3Ipv6CidrBlocks

  PrivateSubnet3ProtocolStack:
    Value:
      Fn::If:
        - CreateSubnet3
        - Fn::If:
            - PrivateSubnet3Ipv6Only
            - IPv6Only
            - Fn::If:
                - PrivateSubnet3Ipv4Only
                - IPv4Only
                - DualStack
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PrivateSubnet3ProtocolStack

  PrivateSubnet3MapPublicIpOnLaunch:
    Value: false
    Export:
      Name: !Sub ${AWS::StackName}-PrivateSubnet3MapPublicIpOnLaunch

  PrivateSubnet3IPv4CidrPrefixListId:
    Value:
      Fn::If:
        - CreatePrefixList
        - !Ref PrivateSubnet3IPv4CidrPrefixList
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PrivateSubnet3IPv4CidrPrefixListId

  PrivateSubnet3IPv6CidrPrefixListId:
    Value:
      Fn::If:
        - CreatePrefixList
        - !Ref PrivateSubnet3IPv6CidrPrefixList
        - '-'
    Export:
      Name: !Sub ${AWS::StackName}-PrivateSubnet3IPv6CidrPrefixListId

```

</details>

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

そして、EC2のUserDataに以下のスクリプトをセットして検証します。UserDataはEC2初回起動時に実行されます。以下のスクリプトはCloudFormationのEC2インスタンスリソースのUserDataから抜粋したもので、`${EnableNatGateway}`, `${EC2NetworkConnectionTestResultS3Bucket}`, `${SubnetKey}`, `${ProtocolStack}`はCloudFormation内の参照で置き換わります。

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

検証作業を速やかに済ませたいのでCloudFormationテンプレートを用意しました。

<details>
<summary><span style="font-size: 150%; color: red;"><b>ネットワーク構築疎通確認用CloudFormationテンプレートyamlファイル（ここをクリックするとコード全体を表示 or 非表示にします）</b></span></summary>

```yaml:cfn_network_test.yaml
AWSTemplateFormatVersion: 2010-09-09
Description: >-
  Create resources of Network Connection Test.
  This CloudFormation template automatically creates an S3 bucket to store the network connection test results.
  The name of the S3 bucket created should be found in the output on the stack.
  Note that this S3 bucket will remain even after the stack is deleted, so please delete it manually, as it cannot be deleted while the result files are still in the S3 bucket.

Metadata:
  AWS::CloudFormation::Interface:
    ParameterGroups:
      - Label:
          default: Refer CloudFormation Stack Settings
        Parameters:
          - ReferenceNetworkStackName
          - TestTargetSubnetKeys
      - Label:
          default: EC2 Settings
        Parameters:
          - EC2ImageId
          - EC2InstanceType

    ParameterLabels:

      ReferenceNetworkStackName:
        default: ReferenceNetworkStackName
      TestTargetSubnetKeys:
        default: TestTargetSubnetKeys

      EC2ImageId:
        default: ImageId
      EC2InstanceType:
        default: InstanceType

Transform: AWS::LanguageExtensions

Parameters:

  ReferenceNetworkStackName:
    Type: String
    Description: <Required> Specify the CloudFormation stack name that refers to the Output export value.
    MinLength: 1
  TestTargetSubnetKeys:
    Type: List<String>
    Description: <Required> Specify the subnet keys created by ReferenceNetworkStackName stack.
    Default: PublicSubnet1,PrivateSubnet1,PublicSubnet2,PrivateSubnet2,PublicSubnet3,PrivateSubnet3
    AllowedValues:
      - PublicSubnet1ForNATGW
      - PublicSubnet1
      - PrivateSubnet1
      - PublicSubnet2ForNATGW
      - PublicSubnet2
      - PrivateSubnet2
      - PublicSubnet3ForNATGW
      - PublicSubnet3
      - PrivateSubnet3

  EC2ImageId:
    Description: <Required> EC2 AMI image id specified by public Parameter Store name. (see https://docs.aws.amazon.com/ja_jp/systems-manager/latest/userguide/parameter-store-public-parameters-ami.html)
    Type: AWS::SSM::Parameter::Value<AWS::EC2::Image::Id>
    Default: /aws/service/ami-amazon-linux-latest/al2023-ami-minimal-kernel-default-x86_64
  EC2InstanceType:
    Type: String
    Description: <Required> The instance type. (see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-instance.html#cfn-ec2-instance-instancetype) [Attention] Amazon EC2 supports launching instances based on the Nitro System into IPv6-only subnets. (see https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/aws-ipv6-support.html)
    Default: t3.micro
    MinLength: 1

Resources:

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

  EC2NetworkConnectionTestResultS3BucketUploadManagedPolicy:
    Type: AWS::IAM::ManagedPolicy
    Properties:
      ManagedPolicyName: EC2NetworkConnectionTestResultS3BucketUploadManagedPolicy
      PolicyDocument:
        Version: 2012-10-17
        Statement:
          -
            Sid: AllowUploadFileToEC2NetworkConnectionTestResultS3Bucket
            Effect: Allow
            Action:
              - s3:PutObject
            Resource: !Sub
              - ${S3Arn}/*
              - S3Arn: !GetAtt EC2NetworkConnectionTestResultS3Bucket.Arn

  Fn::ForEach::EC2Instances:
    - SubnetKey
    - !Ref TestTargetSubnetKeys
    - EC2Instance${SubnetKey}:
        Type: AWS::EC2::Instance
        DependsOn: EC2NetworkConnectionTestResultS3Bucket
        Properties:
          ImageId: !Ref EC2ImageId
          InstanceType: !Ref EC2InstanceType
          IamInstanceProfile:
            Ref: !Sub EC2InstanceProfile${SubnetKey}
          UserData:
            Fn::Base64: !Sub
              - |
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
              - EnableNatGateway:
                  Fn::ImportValue: !Sub ${ReferenceNetworkStackName}-EnableNatGateway
                ProtocolStack:
                  Fn::ImportValue: !Sub ${ReferenceNetworkStackName}-${SubnetKey}ProtocolStack
          NetworkInterfaces:
            - DeviceIndex: 0
              AssociatePublicIpAddress:
                Fn::ImportValue: !Sub ${ReferenceNetworkStackName}-${SubnetKey}MapPublicIpOnLaunch
              SubnetId:
                Fn::ImportValue: !Sub ${ReferenceNetworkStackName}-${SubnetKey}Id
              GroupSet:
                - Ref: !Sub EC2InstanceSecurityGroup${SubnetKey}
          Tags:
            - Key: Name
              Value: !Sub EC2-${SubnetKey}

      EC2InstanceProfile${SubnetKey}:
        Type: AWS::IAM::InstanceProfile
        Properties:
          InstanceProfileName: !Sub EC2InstanceProfile-${SubnetKey}
          Roles:
            - Ref: !Sub EC2InstanceRole${SubnetKey}

      EC2InstanceRole${SubnetKey}:
        Type: AWS::IAM::Role
        Properties:
          RoleName: !Sub EC2InstanceRole-${SubnetKey}
          AssumeRolePolicyDocument:
            Version: 2012-10-17
            Statement:
              - Effect: Allow
                Principal:
                  Service:
                    - ec2.amazonaws.com
                Action:
                  - sts:AssumeRole
          ManagedPolicyArns:
            - !Ref EC2NetworkConnectionTestResultS3BucketUploadManagedPolicy
          Tags:
            - Key: Name
              Value: !Sub EC2InstanceRole-${SubnetKey}

      EC2InstanceRolePolicy${SubnetKey}:
        Type: AWS::IAM::Policy
        Properties:
          PolicyName: !Sub EC2InstanceRolePolicy-${SubnetKey}
          PolicyDocument:
            Version: 2012-10-17
            Statement:
              - Effect: Allow
                Action: '*'
                Resource: !Sub
                  - arn:aws:ec2:${AWS::Region}:${AWS::AccountId}:instance:${EC2InstanceId}
                  - EC2InstanceId:
                      Ref: !Sub EC2Instance${SubnetKey}
          Roles:
            - Ref: !Sub EC2InstanceRole${SubnetKey}

      EC2InstanceSecurityGroup${SubnetKey}:
        Type: AWS::EC2::SecurityGroup
        Properties:
          GroupName: !Sub EC2-${SubnetKey}-sg
          GroupDescription: !Sub ${SubnetKey} EC2 instance Security Group.
          VpcId:
            Fn::ImportValue: !Sub ${ReferenceNetworkStackName}-VpcId
          Tags:
            - Key: Name
              Value: !Sub EC2-${SubnetKey}-sg

Outputs:

  EC2NetworkConnectionTestResultS3BucketName:
    Value: !Ref EC2NetworkConnectionTestResultS3Bucket
    Export:
      Name: !Sub ${AWS::StackName}-EC2NetworkConnectionTestResultS3BucketName

  EC2NetworkConnectionTestResultS3BucketConsoleUrl:
    Value: !Sub https://${AWS::Region}.console.aws.amazon.com/s3/buckets/${EC2NetworkConnectionTestResultS3Bucket}
    Export:
      Name: !Sub ${AWS::StackName}-EC2NetworkConnectionTestResultS3BucketConsoleUrl

```
</details>

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

# 編集後記

　私が豆蔵に転職するまでは、私はひたすらWebアプリケーション開発をやっていて、恥ずかしながらインフラ経験が皆無でネットワークやクラウドの知識も経験も皆無の状態で豆蔵に転職してきました。AWS？ Amazon Web Service？ なぜみんなそんなにアマゾンでお買い物したいのですか？ というレベルでした。入社後は是非ともクラウドをキャッチアップしてほしいということで、AWSを使ったプロジェクトに参画となりました。そして、その後私が参画した全てのプロジェクトでAWSが使われていました。
　これまで私が参画したプロジェクトを思い返してみると、ネットワーク系はインフラの中のインフラで重要なので、プロジェクトでは専任のインフラ有識者が設計や構築を担当していることが多かったです。開発者としてプロジェクトに参画した場合は、開発者はネットワーク関連や請求関連のリソースには触れられないようにロールを制限されていることが多かったです。よって、開発者がネットワークを構築する機会はめったにありません。保守プロジェクトならば当然ネットワーク構築済みなのでなおさらです。コストについてもAWSマネジメントコンソールログイン直後のダッシュボードで総額の表示が見えたときはびっくりはするものの、自分に直接請求が来ることはないのでコストに対する意識が希薄になりがちです。
　自分で個人的にAWSアカウントを取得して検証でもしない限り、ネットワークに触れる機会は少ないと思います。そして私は、自分のアカウントを取得すること自体も葛藤があって躊躇っていました。自分のアカウントであれば自分の責任で以って自分の思うがままに自由に検証できると思う一方、もし悪用されたら大変だとか、よくわかっていないので知らぬ間に意図しないとんでもない額の請求が来たらどうしようという不安があったからです。そして、悪用がこわいのでAWSアカウントを取得したらすぐやることを事前によく調べてから思い切ってアカウントを取得しました。
　自分のアカウントで独力で実際にネットワーク系を構築して理解すると、ネットワークはどんなサービスにも付いて回る概念なので、その他のAWSサービスについても理解しやすくなりました。もっとはやくやればよかったです。
　コストについても自分に請求が来て痛い目を見るので、具体的に何にコストがかかっているのかまで嫌でも意識するようになりました。コストを意識することは仕事においても重要で役立ちます。私は過去に、せっかく頑張って調べながらNATゲートウェイを用意してインターネット接続できるようにしたので、これはそのままにしておこうと思ってNATゲートウェイを放置してしまいました。その結果ちょっと高い授業料を払うことになり痛い目を見ました。これは何か対策が必要だと危機感を抱きました。そこで、存在するだけでもお金がかかるリソースを意図せず放置してしまわないように、コストが閾値を超えるとアラート発砲メールが飛ぶような仕掛けを用意しました。
　この失敗がきっかけで、NATゲートウェイを使う時だけすぐに用意して、使い終わったらすぐに消せるようにしたいと思い、それを実現するCloudFormationテンプレートを作りました。テンプレートを作って本記事を執筆しながら色々と調べているうちに、IPv6にするとコストを抑えられることも知ったので取り入れました。こうしてネットワーク構築の要素を追加で盛り込みながらCloudFormationテンプレートを作ってみたので、お役立ていただければ幸いです。
