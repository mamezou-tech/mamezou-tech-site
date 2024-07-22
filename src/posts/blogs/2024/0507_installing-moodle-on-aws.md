---
title: Moodle 4.4をAmazon EC2にインストールする
author: shigeki-shoji
date: 2024-05-07
tags: [AWS, "学び", moodle, LMS]
image: false
---

こんにちは、[庄司](https://github.com/edward-mamezou)です。

組織が主導して新しい業務で必要になる知識や技能を習得する「リスキリング」や大学等で学び直す「リカレント教育」という言葉を聞くことが多くなりました。こうした研修で利用することの多い Learning Management System (LMS) に [Moodle](https://moodle.org/) があります。Moodle は多くの大学や企業で実績があるオープンソースのソフトウェアで、学んだことや習得したスキルの証明に利用できるオープンバッジを発行する機能もあります。

Moodle は Linux、Apache、MySQL、PHP の組み合わせを意味する LAMP 環境で動作するプロダクトです。この記事では MySQL を Amazon RDS で構築し、Linux、Apache、PHP を Amazon EC2 で動作する構成で説明します。

![構成図](/img/blogs/2024/installing-moodle-on-aws/infra.png)

## この記事の目的

この記事では Moodle のマシンイメージ (AMI) の作成方法を説明します。マシンイメージを作ることで複数のバーチャルマシン上でインストール手順書を繰り返し実行するといったトイルを軽減でき、またオートスケールによる柔軟なスケーリングやアカウントIDを超えて展開可能なポータブルなイメージ提供[^1]への道がひらけます。

:::info:
AWS Marketplace やコミュニティから提供されているイメージは、Moodle がどういうものかを手軽に知りたい場合やユースケースに合致するものの場合検討するといいでしょう。この記事を書くモチベーションは、データベースの選定やプラグイン導入を自由に試せる環境が欲しかったため独自にインストールすることにしました。
:::

AMI とは EC2 や [Snowball Edge](https://docs.aws.amazon.com/snowball/latest/developer-guide/using-ami.html) でバーチャルマシンのインスタンスを起動するときに必要な Amazon マシンイメージです。作成された AMI を他のユーザに公開したり、[AWS Marketplace](https://aws.amazon.com/jp/mp/marketplace-service/overview/) に出品されることもあります。

AMI の作成には HashiCorp の [Packer](https://www.packer.io/) のような専用のツールもありますが、この記事ではこうしたツールは使用しません。

この記事は次の2つの説明にフォーカスします。

1. AMI の作成方法
2. Moodle のインストール方法

## 準備

Moodle のインストール、実行に必要なネットワークやアクセスポリシーの準備をします。

1. リージョンに任意のバケット名で S3 バケットを作成します[^2]。
2. 次の CloudFormation テンプレートを使って、IAM ロールとインスタンスプロフィールを作成します。
```yaml
AWSTemplateFormatVersion: "2010-09-09"

Parameters:
  BucketName:
    Description: A bucket name
    Type: String

Resources:
  Role:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal:
              Service:
                - ec2.amazonaws.com
            Action:
              - 'sts:AssumeRole'
      Path: /
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
        - arn:aws:iam::aws:policy/AmazonSSMPatchAssociation
      RoleName: RoleForMoodle

  Policy:
    Type: AWS::IAM::Policy
    Properties:
      PolicyName: PolicyForMoodle
      PolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Action:
              - s3:ListBucket
            Resource:
              - !Sub 'arn:aws:s3:::${BucketName}'
          - Effect: Allow
            Action:
              - s3:PutObject
              - s3:GetObject
            Resource:
              - !Sub 'arn:aws:s3:::${BucketName}/*'
      Roles:
        - !Ref Role
  
  InstanceProfile:
    Type: AWS::IAM::InstanceProfile
    Properties:
      InstanceProfileName: MoodleInstanceProfile
      Path: /
      Roles:
        - !Ref Role
```
3. 次の CloudFormation テンプレートを使って、ネットワーク、セキュリティグループ等を構成します。
```yaml
AWSTemplateFormatVersion: "2010-09-09"

Parameters:
  EnvironmentName:
    Description: An environment name that is prefixed to resource names
    Type: String

Resources:
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsHostnames: true
      EnableDnsSupport: true
      Tags:
        - Key: Name
          Value: !Ref EnvironmentName

  InternetGateway:
    Type: AWS::EC2::InternetGateway
    Properties:
      Tags:
        - Key: Name
          Value: !Ref EnvironmentName
  
  InternetGatewayAttachement:
    Type: AWS::EC2::VPCGatewayAttachment
    Properties:
      InternetGatewayId: !Ref InternetGateway
      VpcId: !Ref VPC

  PublicSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      AvailabilityZone:
        Fn::Select:
          - 0
          - Fn::GetAZs: ""
      CidrBlock: 10.0.0.0/24
      MapPublicIpOnLaunch: true
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub ${EnvironmentName} Public Subnet (AZ1)

  PublicSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      AvailabilityZone:
        Fn::Select:
          - 1
          - Fn::GetAZs: ""
      CidrBlock: 10.0.1.0/24
      MapPublicIpOnLaunch: true
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub ${EnvironmentName} Public Subnet (AZ2)

  NatGateway1EIP:
    Type: AWS::EC2::EIP
    Properties:
      Domain: vpc
  
  NatGateway1:
    Type: AWS::EC2::NatGateway
    Properties:
      AllocationId: !GetAtt NatGateway1EIP.AllocationId
      SubnetId: !Ref PublicSubnet1
      Tags:
        - Key: Name
          Value: !Sub ${EnvironmentName} NatGateway 1 (AZ1)

  PublicRouteTable:
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub ${EnvironmentName} Public Routes

  DefaultPublicRoute:
    Type: AWS::EC2::Route
    Properties:
      DestinationCidrBlock: 0.0.0.0/0
      GatewayId: !Ref InternetGateway
      RouteTableId: !Ref PublicRouteTable

  PublicSubnet1RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      RouteTableId: !Ref PublicRouteTable
      SubnetId: !Ref PublicSubnet1

  PublicSubnet2RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      RouteTableId: !Ref PublicRouteTable
      SubnetId: !Ref PublicSubnet2

  PrivateSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      AvailabilityZone:
        Fn::Select:
          - 0
          - Fn::GetAZs: ""
      CidrBlock: 10.0.2.0/24
      MapPublicIpOnLaunch: false
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub ${EnvironmentName} Private Subnet (AZ1)

  PrivateSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      AvailabilityZone:
        Fn::Select:
          - 1
          - Fn::GetAZs: ""
      CidrBlock: 10.0.3.0/24
      MapPublicIpOnLaunch: false
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub ${EnvironmentName} Private Subnet (AZ2)

  PrivateRouteTable:
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub ${EnvironmentName} Private Routes

  PrivateSubnet1RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      RouteTableId: !Ref PrivateRouteTable
      SubnetId: !Ref PrivateSubnet1

  PrivateSubnet2RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      RouteTableId: !Ref PrivateRouteTable
      SubnetId: !Ref PrivateSubnet2

  RouteNatGateway1:
    Type: AWS::EC2::Route
    Properties:
      RouteTableId: !Ref PrivateRouteTable
      DestinationCidrBlock: '0.0.0.0/0'
      NatGatewayId: !Ref NatGateway1

  S3VPCEndpoint:
    Type: AWS::EC2::VPCEndpoint
    Properties:
      RouteTableIds:
        - !Ref PrivateRouteTable
      ServiceName: !Sub com.amazonaws.${AWS::Region}.s3
      VpcEndpointType: Gateway
      VpcId: !Ref VPC

  MySQLSubnetGroup:
    Type: AWS::RDS::DBSubnetGroup
    Properties:
      DBSubnetGroupDescription: MySQL DBSubnet Group
      DBSubnetGroupName: MySQLSubnet
      SubnetIds:
        - !Ref PrivateSubnet1
        - !Ref PrivateSubnet2

  ElastiCacheSubnetGroup:
    Type: AWS::ElastiCache::SubnetGroup
    Properties:
      CacheSubnetGroupName: ElastiCacheSubnetGroup
      Description: ElastiCache Subnet Group
      SubnetIds:
        - !Ref PrivateSubnet1
        - !Ref PrivateSubnet2

  LBSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Load Balancer Security Group
      GroupName: !Sub ${EnvironmentName}-LB-SecurityGroup
      VpcId: !Ref VPC
  
  EC2SecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: EC2 Security Group
      GroupName: !Sub ${EnvironmentName}-EC2-SecurityGroup
      VpcId: !Ref VPC
  
  LBSecurityGroupIngress:
    Type: AWS::EC2::SecurityGroupIngress
    Properties:
      IpProtocol: tcp
      CidrIp: 0.0.0.0/0
      FromPort: 443
      ToPort: 443
      GroupId:
        Fn::GetAtt:
          - LBSecurityGroup
          - GroupId

  EC2SecurityGroupIngress:
    Type: AWS::EC2::SecurityGroupIngress
    Properties:
      IpProtocol: tcp
      FromPort: 80
      ToPort: 80
      SourceSecurityGroupId: 
        Fn::GetAtt:
          - LBSecurityGroup
          - GroupId
      GroupId:
        Fn::GetAtt:
          - EC2SecurityGroup
          - GroupId

  MySQLSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: MySQL Security Group
      GroupName: !Sub ${EnvironmentName}-MySQL-SecurityGroup
      VpcId: !Ref VPC

  MySQLSecurityGroupIngress:
    Type: AWS::EC2::SecurityGroupIngress
    Properties:
      IpProtocol: tcp
      FromPort: 3306
      ToPort: 3306
      SourceSecurityGroupId: !Ref EC2SecurityGroup
      GroupId:
        Fn::GetAtt:
          - MySQLSecurityGroup
          - GroupId

Outputs:
  VPC:
    Description: A reference to the created VPC
    Value: !Ref VPC
    Export:
      Name: !Sub ${EnvironmentName}-VPC
  
  PublicSubnet1:
    Description: A reference to the public subnet in the 1st Availability Zone
    Value: !Ref PublicSubnet1
    Export: 
      Name: !Sub ${EnvironmentName}-PublicSubnet1
  
  PublicSubnet2:
    Description: A reference to the public subnet in the 2nd Availability Zone
    Value: !Ref PublicSubnet2
    Export:
      Name: !Sub ${EnvironmentName}-PublicSubnet2

  PrivateSubnet1:
    Description: A reference to the private subnet in the 1st Availability Zone
    Value: !Ref PrivateSubnet1
    Export:
      Name: !Sub ${EnvironmentName}-PrivateSubnet1
  
  PrivateSubnet2:
    Description: A reference to the private subnet in the 2nd Availability Zone
    Value: !Ref PrivateSubnet2
    Export:
      Name: !Sub ${EnvironmentName}-PrivateSubnet2
  
  PrivateRouteTable:
    Description: A reference to the private route table
    Value: !Ref PrivateRouteTable
    Export:
      Name: !Sub ${EnvironmentName}-PrivateRouteTable

  LBSecurityGroup:
    Description: A reference to the load balancer security group
    Value: !Ref LBSecurityGroup
    Export:
      Name: !Sub ${EnvironmentName}-LBSecurityGroup
  
  EC2SecurityGroup:
    Description: A reference to the ec2 security group
    Value: !Ref EC2SecurityGroup
    Export:
      Name: !Sub ${EnvironmentName}-EC2SecurityGroup

  MySQLSubnetGroup:
    Description: A reference to the mysql db subnet group.
    Value: !Ref MySQLSubnetGroup
    Export:
      Name: !Sub ${EnvironmentName}-MySQLSubnetGroup
```
4. Amazon RDS で MySQL を作成します。MySQL の認証はユーザ名「root」として、パスワード認証で作成します。

## Moodle を Ubuntu にインストール

「Ubuntu Server 24.04 LTS (HVM), SSD Volume Type」の AMI を `t3a.small` のインスタンスタイプで起動してインストールを進めます。

「ネットワーク設定」の右にある「編集」ボタンをクリックします。
- 「VPC」は[準備](#準備)で作成した VPC を選択します。
- 「サブネット」は「Private Subnet (AZ1)」を選択します。
- 「ファイアウォール（セキュリティグループ）」は「既存のセキュリティグループを選択する」とし、「EC2-SecurityGroup」を選択します。
「高度な詳細」を開きます。
- 「IAM インスタンスプロフィール」は「MoodleInstanceProfile」を選択します。

「インスタンスを起動」ボタンをクリックします。
- 「既存のキーペアを選択、またはキーペアを作成」ダイアログは「キーペアなしで続行」を選択して「インスタンスを起動」ボタンをクリックします。

起動するまで数分待ちます。準備のところで作成したインスタンスプロフィールにより System Manager のセッションマネージャーを使って起動したインスタンスを操作できます。起動したら、「インスタンスに接続」ボタンをクリックし「セッションマネージャー」タブから「接続」ボタンをクリックします。

### php、git、mysql-client のインストール

`apt install php` を実行すると PHP 8.3 がインストールされます。8.3 対応されているのか少し疑問があったため、インターネット上のいくつかの情報を参考に PHP 8.1 をインストールします。

```text
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update
sudo apt upgrade -y
sudo apt install -y php8.1
sudo apt install -y php8.1-mysql php8.1-iconv php8.1-mbstring php8.1-curl php8.1-tokenizer php8.1-xmlrpc php8.1-soap php8.1-ctype php8.1-zip php8.1-gd php8.1-simplexml php8.1-xml php8.1-intl
```

composer をインストールします[^3]。

```text
sudo apt install -y composer
```

次に、git と MySQL Client をインストールします。

```text
sudo apt install -y git mysql-client
```

Moodle を git を使って取得します。

```text
cd /opt
sudo git clone git://git.moodle.org/moodle.git
```

`sudo vi /etc/php/8.1/apache2/php.ini` と `sudo vi /etc/php/8.1/cli/php.ini` でファイル中にある `;max_input_vars=1000` とコメントになっている行を見つけて、`max_input_vars=5000` に修正して保存します。

### Moodle 4.4 のコピー

次のコマンドでブランチ一覧を取得します。

```text
cd /opt/moodle
sudo git branch -a
```

Moodle 4.4 を git に指示します。

```text
sudo git branch --track MOODLE_404_STABLE origin/MOODLE_404_STABLE
sudo git checkout MOODLE_404_STABLE
```

Moodle 4.4 のコピーとデータディレクトリの作成等を行います。

```text
sudo cp -R /opt/moodle /var/www/html/
sudo mkdir /var/moodledata
sudo chown -R www-data /var/moodledata
sudo chmod -R 777 /var/moodledata
sudo chmod -R 0755 /var/www/html/moodle
```

### ロードバランサのヘルスチェックのためのファイルを追加

`/var/www/html/moodle/phpinfo.php` ファイルを次の内容で作成します。

```php
<?php
echo 'Hello world!';
```

### ここまでの AMI を保存

まだ途中ですが、一旦ここまでのイメージを AMI にして保存します。残りはデータベースとの接続設定やロードバランサの設定等になります。これらは実行環境への依存度が高いため、その手前の段階であるこのタイミングで AMI を取得しておくことでポータビリティのあるイメージを取得できます。

操作している EC2 インスタンスを「インスタンスの状態」から `インスタンスを停止` します (`インスタンスを終了` を選択しないよう注意してください)。そして停止したら、「アクション」から「イメージとテンプレート」、「イメージを作成」を選択します。

「イメージを作成」のダイアログで「イメージ名」に任意の名称を入力して「イメージを作成」ボタンをクリックします。

イメージの作成が終了したら、停止したインスタンスを選択して「インスタンスの状態」から `インスタンスを開始` します。開始されたら「セッションマネージャー」で接続します。

### MySQL に moodle データベースを作成

HOSTNAME を準備で作成した Amazon RDS のエンドポイントで置換して、次のように moodle データベースを作成します。

```text
mysql -h HOSTNAME -u root -p
CREATE DATABASE moodle DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Moodle の構成ファイル　(config.php) の設定

```text
sudo php /var/www/html/moodle/admin/cli/install.php
```

デフォルト値以外のところを記述します。

```text
== Data directories permission ==
type value, press Enter to use default value (2777)
: 00777
```

```text
== Web address ==
type value
: https://<YOUR Domain Name>
```

```text
== Data directory ==
type value, press Enter to use default value (/var/www/html/moodledata)
: /var/moodledata
```

```text
== Database host ==
type value, press Enter to use default value (localhost)
: <Amazon RDS のエンドポイント (ホスト名)>
```

```text
== Database port ==
type value, press Enter to use default value ()
: 3306
```

```text
== Database password ==
type value
: <MySQL の root ユーザの PASSWORD>
```

```text
== Full site name ==
type value
: <サイト名>
```

```text
== Short name for site (eg single word) ==
type value
: <サイト名略称>
```

```text
== New admin user password ==
type value
: <Moodle 管理者 (admin) のパスワード>
```

```text
Have you read these conditions and understood them?
type y (means yes) or n (means no)
: y
```

`/var/www/html/moodle/config.php` の `$CFG->wwwroot =` の行の上に `$CFG->sslproxy  = true;` を追記します。

```text
$CFG->sslproxy  = true;
$CFG->wwwroot   = ...;
```

`/var/www/html/moodle/config.php` のモードを変更します。

```text
sudo chmod 664 /var/html/moodle/config.php
```

最後に、`/etc/apache2/sites-available/000-default.conf` の `DocumentRoot` を次のように修正します。

```text
DocumentRoot /var/www/html/moodle
```

### AMI を保存

ここまでのイメージを AMI にして保存します。この AMI は実行環境への依存度が高いため、オートスケールに必要な AMI として利用できるように進化できるでしょう。

操作している EC2 インスタンスを「インスタンスの状態」から `インスタンスを停止` します (`インスタンスを終了` を選択しないよう注意してください)。そして停止したら、「アクション」から「イメージとテンプレート」、「イメージを作成」を選択します。

「イメージを作成」のダイアログで「イメージ名」に任意の名称を入力して「イメージを作成」ボタンをクリックします。

イメージの作成が終了したら、停止したインスタンスを選択して「インスタンスの状態」から `インスタンスを開始` します。

## ブラウザからの操作

### 操作の準備

セキュアに接続するため次の準備が必要です。
- ドメイン名の取得
- Route 53 へのホストゾーン登録
- ロードバランサに設定する証明書の取得

### ロードバランサの作成

ロードバランサのリソースを構築する CloudFormation テンプレートは次のとおりです。

```yaml
AWSTemplateFormatVersion: "2010-09-09"

Parameters:
  EnvironmentName:
    Description: An environment name that is prefixed to resource names
    Type: String

  CertificateArn:
    Description: A certificate arn
    Type: String

  HostedZoneId:
    Description: A hosted zone id
    Type: String

  DomainName:
    Description: A domain name
    Type: String

Resources:
  LoadBalancer:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      IpAddressType: ipv4
      Name: !Sub ${EnvironmentName}-lb
      Scheme: internet-facing
      SecurityGroups:
        - Fn::ImportValue: !Sub ${EnvironmentName}-LBSecurityGroup
      Subnets:
        - Fn::ImportValue: !Sub ${EnvironmentName}-PublicSubnet1
        - Fn::ImportValue: !Sub ${EnvironmentName}-PublicSubnet2

  TargetGroup:
    Type: AWS::ElasticLoadBalancingV2::TargetGroup
    Properties:
      HealthCheckPath: /phpinfo.php
      HealthCheckProtocol: HTTP
      HealthCheckTimeoutSeconds: 5
      Matcher:
        HttpCode: 200
      Name: !Sub ${EnvironmentName}-tg
      Port: 80
      Protocol: HTTP
      ProtocolVersion: HTTP1
      TargetType: instance
      VpcId:
        Fn::ImportValue: !Sub ${EnvironmentName}-VPC

  LoadBalancerListener:
    Type: AWS::ElasticLoadBalancingV2::Listener
    Properties:
      Certificates:
        - CertificateArn: !Ref CertificateArn
      DefaultActions:
        - TargetGroupArn: !Ref TargetGroup
          Type: forward
      LoadBalancerArn: !Ref LoadBalancer
      Port: 443
      Protocol: HTTPS

  LBRecordSet:
    Type: AWS::Route53::RecordSet
    Properties:
      AliasTarget:
        DNSName:
          Fn::GetAtt:
            - LoadBalancer
            - DNSName
        EvaluateTargetHealth: no
        HostedZoneId:
          Fn::GetAtt:
            - LoadBalancer
            - CanonicalHostedZoneID 
      Name: !Ref DomainName
      HostedZoneId: !Ref HostedZoneId
      Type: A
```

#### ターゲットを登録

AWS 管理コンソールの EC2 サービスのロードバランシング、ターゲットグループから、上で作成したターゲットグループを選択し「使用可能なインスタンス」に表示されるインスタンスをチェックして、「保留中として以下を含める」ボタンをクリックして「ターゲットグループの作成」ボタンをクリックします。

### ブラウザからアクセス

Route 53 に登録したドメイン名 (`https://<YOUR DOMAIN NAME>`) をブラウザに入力します。ログイン後の Dashboard が次のように表示されます。 

![画面キャプチャ](/img/blogs/2024/installing-moodle-on-aws/screenshot.png)

## おわりに

作成した AMI の高可用性の実現やポータビリティには課題が残っています。ログインセッション等を ElastiCache (redis、memchached) で保持したり、複数のサーバーで共有すべきデータに NFS や S3 を使用する必要があるでしょう。しかし、今回作成した AMI をベースに設定を見直し進化させることで効率よくゴールを目指すことができます。この記事で書ききれなかった課題については続編以降で紹介したいと考えています。

## 参考

- [Step-by-step Installation Guide for Ubuntu](https://docs.moodle.org/404/en/Step-by-step_Installation_Guide_for_Ubuntu)
- [オープンバッジ発行に向けて、LTS版のMoodle 4.1をPHP8.1でUbuntu 22.04にインストール](https://qiita.com/kolinz/items/9781d3909c7ad0f4b659)
- [Server Cluster](https://docs.moodle.org/404/en/Server_cluster)

[^1]: AWS の AMI カタログを「Moodle」で検索すると、AWS Marketplace とコミュニティから多くの AMI が提供されています。
[^2]: 可用性を高める共有ファイルの保存で S3 を利用する予定があり含めています。
[^3]: S3 を利用するプラグインを導入する場合等に必要です。5月14日追記しました。
