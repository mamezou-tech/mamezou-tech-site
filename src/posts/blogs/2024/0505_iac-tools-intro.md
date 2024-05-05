---
title: 効率的なクラウドインフラ管理のためにIaCアプローチを活用する
author: noboru-kudo
date: 2024-05-05
tags: [IaC, "新人向け", AWS]
image: true
---

本記事は現在開催中の[新人向け連載](/events/season/2024-spring/)に向けたものです。
ここでは、いち早く新人から脱却するための第一歩として、IaC(Infrastructure as Code)ツール導入のメリットや簡単な使い方を紹介します。

今やクラウド環境は当たり前の時代になりました。

クラウドといっても、昔は仮想マシンを作成してその中にアプリケーションや依存する各種ソフトウェアを構成するオンプレミス環境と同じような使い方が多かったです。
ところが、最近はクラウドプロバイダが提供するマネージドサービスを含む無数のリソースを組み合わせて構築することが一般的になってきたと感じます。
これらのリソースはどのように作成すべきでしょうか？

## クラウドプロバイダが提供するGUIで作成する

最初の選択肢として一番分かりやすいのは、各クラウドプロバイダが用意されているGUIから手動で作成する方法です。
もちろんこの方法が悪い訳ではありません。GUIを使うことで情報を視覚的に把握し、直感的な操作が可能となります。個人的にもGUIは使ったことのない機能を最初に試す場合は最適だと思います。

ただし、この方法の最大の欠点は再現性がないことです。
一般的にプロジェクトは商用環境だけでなく、テスト環境やステージング環境等、目的に応じて複数環境を用意することが多いでしょう。
そのようなケースでは、(外部環境等のパラメータの違いはありますが)基本的に同じ構成でそれぞれの環境を作成する必要があります。
これをGUIを用いて手動で作成するのは明らかに非効率です。手作業による人的ミスが発生しやすく、トラブルシュートに多くの時間を要することになります。
もちろん、そうならないように実際の現場では通常手順書を用意するのですが、多数のリソースで構成しているシステムの場合は、とても時間のかかる単純作業でモチベーション低下に繋がります。
さらに、クラウドプロバイダが提供するGUIは、機能追加と共に結構な頻度で変わっていきます。これに合わせて手順書自体のメンテナンスも適宜実施していかなければ誰も手を出せない塩漬け状態になります。

また、一般的にクラウド環境は状況に応じた柔軟な使い方が得意です。例えば、長期休暇期間はコスト節約のためリソースを削除しておき、休み明けに復旧させたいということもあるでしょう。
このようなケースでもGUIからの手動作成は非効率でコストメリットが低い作業と言えます。

ここで重要性を増してくるのがIaCによる自動化アプローチです。

## IaCによるアプローチ

IaC(Infrastructure as Code)は、その名の通りインフラリソースをコードとして扱うアプローチです。
つまり、アプリケーションのソースコードと同じようにインフラリソースもコードを記述します。
記述するコードはYAML/JSON、ドメイン特化言語(HCL等)等の高レベル言語が使われていますが、最近はアプリケーションと同じプログラミング言語(JavaScriptやPython等)で記述する方法が好まれる傾向があります。

コードはIaCツールの力を利用して効率的かつ確実に環境に反映されます。
手順書ではなく実際に動くプログラムなので何度実行しても同じ結果になります[^1]。ここではGUIが持つ再現性欠如の問題が解消されます。
また、高レベル言語で記述されるインフラコードは自明なことが多いので、設計ドキュメントとして関係者間で共有される現場も多いです。

[^1]: このような性質は冪等性と呼ばれます。全てのリソースで冪等性が担保されているとまでは言えませんが、IaCツールはこれを意識した設計となっています。

IaCの大きなメリットとして、アプリケーション同様にGit等のバージョン管理システムで運用できることが上げられます。履歴管理機能を使ったトレーサビリティ確保はもちろん、プルリクエスト/マージリクエストを使ったレビュー等、バージョン管理システムの機能をフル活用できます。
また、IaCツールをCI/CDパイプラインを組み合わせてプルリクエスト作成またはプッシュをトリガーとして対応するブランチと実行環境を同期して運用するケースも多く見られます。
対応するGitレポジトリにコードをコミット(またはマージ)してプッシュするだけなので、デプロイに対する作業負荷は大きく軽減されます。ロールバックについても変更履歴からリバートコミットするだけで自動的に以前のバージョンに同期されます。
頻繁なリリースサイクルを持つことの多いアジャイル開発との相性も抜群です。

:::column:IaCのデメリット
もちろん、IaCアプローチにもデメリットはあります。
まず挙げられるのはツールの習熟度の問題です。ツールについてある程度の理解がなければ、ツール本来の力を活かせず形だけのIaCに終わる現場をよく見かけます。
また、先ほどクラウドプロバイダが提供するGUIは頻繁に変わると述べましたが、クラウドサービス自体やIaCツールのバージョンも絶えずアップデートされます。
時間が経って気づいたらデプロイが不可能な状態になってしまうかもしれません。それは解消しているはずの再現性の問題が再び露呈していることを意味します。
これを避けるためには、採用しているツールのリリース情報を継続的に把握し、小さな変更を頻繁にリリースして、早い段階で変化に対応できるようにすることが重要になります。
:::

最後に代表的なIaCツールを紹介します。
IaCの自動化ツールには2種類のものがあります。

### 命令型スタイル
インフラ構成の具体的な手順(How)をコードとして記述するスタイルのツールです。
以下のツールが代表的なものです。

- [Ansible](https://www.ansible.com/)
- [Chef](https://www.chef.io/products/chef-infra)
- [Puppet](https://www.puppet.com/)

宣言型スタイルのツールよりも細かい制御が可能で、クラウド環境に限らずサーバー構成のプロビジョニングツールとしてよく使われています。

### 宣言型スタイル
インフラ構成の最終的な望ましい状態をコードとして記述するスタイルのツールです。手続きではなく最終状態を記述するので、通常は読みやすいコードになります。
以下のツールが代表的なものです。

- クラウドプロバイダが提供しているツール
  - [AWS CloudFormation](https://aws.amazon.com/cloudformation/)
  - [AWS Cloud Development Kit(CDK)](https://aws.amazon.com/cdk/)
  - [Azure Resource Manager](https://azure.microsoft.com/get-started/azure-portal/resource-manager/)
  - [Google Cloud Deployment Manager](https://cloud.google.com/deployment-manager/docs)
- サードパーティベンダが提供するツール
  - [Terraform](https://www.terraform.io/)
  - [Pulumi](https://www.pulumi.com/)
  - [Crossplane](https://www.crossplane.io/)

クラウドプロバイダが提供するツールは無料で利用可能で新規機能への追随が早いですが、当然提供するクラウド環境のみでしか使用できません(ベンダーロックイン)。
一方で、サードパーティベンダが提供するツールはマルチクラウドに対応しておりその使用感は洗練されたものが多いですが、新機能への追随までにタイムラグがあったり継続性の懸念といったデメリットがあります。

## IaCを実践する

最後にAWS CDK(以下CDK)を使ってIaCアプローチを実践します。

まずはCDKのCLIをセットアップします。CDKのCLIはNPMパッケージとして提供されています。

```shell
npm install -g aws-cdk
cdk version
```

ここでは現時点で最新の2.140.0をセットアップしています。

CDKはデプロイ対象のAWSアカウント/リージョンに対して初回にCDK用のリソースを作成する必要があります。
これはCDKのbootstrapサブコマンドで作成できます。

```shell
cdk bootstrap aws://<account-id>/<aws-region>
```

対象のAWSアカウント/リージョンにS3バケットやIAMロール等のCDK実行に必要なリソースが作成されます。

それではCDKプロジェクトを作成しましょう。
任意のディレクトリを作成してinitサブコマンドを実行します。

```shell
mkdir cdk-sample
cd cdk-sample
cdk init app --language typescript
```

ここではインフラコードの記述言語としてTypeScriptを選択しています。他にもJavaやPython、C#等も選択できます。
実行が終わると、カレントディレクトリ配下に各種テンプレートファイルが作成されます。

ではインフラコードを書いてみましょう。
以下のように編集します。

```diff-typescript:/cdk-sample/bin/cdk-sample.ts
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkSampleStack } from '../lib/cdk-sample-stack';

const app = new cdk.App();
new CdkSampleStack(app, 'CdkSampleStack', {
  // コメントアウトを解除
+  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
-  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});
```
```diff-typescript:/cdk-sample/lib/cdk-sample-stack.ts
import * as cdk from '@aws-cdk';
import * as ec2 from '@aws-cdk/aws-ec2';

export class CdkSampleStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

+    const vpc = ec2.Vpc.fromLookup(this, 'VPC', {
+      isDefault: true
+    });

+    new ec2.Instance(this, 'MyEC2Instance', {
+      instanceType: new ec2.InstanceType('t3.micro'),
+      machineImage: new ec2.AmazonLinuxImage(),
+      instanceName: 'MyEC2Instance',
+      vpc: vpc
+    });
  }
}
```

ここではAWSアカウントに用意されているデフォルトVPC内にEC2リソースを作成しているだけです。
AWS CDKは宣言型スタイルのツールです。リソースを作成する手続きではなく、最終的に実現したい構成のみを記述します。

実際のプロジェクトではもっと多くのリソースを組み合わせて使用しますが、アプリケーションと比較して分かりやすいコードになることが多いです。

これをデプロイします。デプロイはdeployサブコマンドを使います。

```shell
cdk deploy
```
![](https://i.gyazo.com/8e4582411d39a4477b4f2c1776ee6719.png)

セキュリティ関連リソースの追加があるので確認プロンプトが表示されます。`y`を入力するとデプロイが継続します。
しばらく待つとEC2インスタンスが作成されます。マネジメントコンソールより確認します。

![](https://i.gyazo.com/393b839dccc98b7c3471efee4396808e.png)

CDKはその内部では、記述したコードからAWS CloudFormationテンプレートを作成してデプロイしています。
この様子はマネジメントコンソールのCloudFormationメニューからも確認できます。

![](https://i.gyazo.com/22ed51a2971094bff607410bc8530898.png)

なお、ここで作成したリソースはGUI(マネジメントコンソール)から原則変更してはいけません。
変更時はコードを修正して、deployサブコマンドで再同期します。

このリソースはAWS CDK(実態はCloudFormation)に管理されている状態です。
もし手動変更をするとテンプレートと実際の状態が異なる不整合状態(ドリフト)になり、同期時に予期しない結果(変更が上書きされたり、実行が失敗する等)を招く可能性があります。
無用なトラブルシュート作業を避けるためにGUIからの変更は避けるべきです。

リソースの削除はdestroyサブコマンドを使います。

```shell
cdk destroy
```

これで先ほどのdeployコマンドで作成したリソースは全て削除されるはずです。

:::column:AWS CloudFormationテンプレートを確認する
前述の通り、AWS CDKは内部的にはAWS CloudFormationをデプロイエンジンとしています。
CloudFormationの知識が必要になりますが、トラブルシュート時には実際のテンプレートを確認するのも有効です。

デプロイをせずに、CloudFormationテンプレートを確認するにはsynthサブコマンドを実行します。

```shell
cdk synth
```

長いので大半は省略していますが、標準出力にCloudFormationテンプレートが出力されます。
```yaml
Resources:
  MyEC2InstanceInstanceSecurityGroup06C6622F:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: CdkSampleStack/MyEC2Instance/InstanceSecurityGroup
      SecurityGroupEgress:
        - CidrIp: 0.0.0.0/0
          Description: Allow all outbound traffic by default
          IpProtocol: "-1"
      Tags:
        - Key: Name
          Value: MyEC2Instance
# 以降省略
```
:::

## まとめ

IaCの考え方の紹介とそれを実現するツールとしてAWS CDKの使い方をご紹介しました。
AWS CDK以外のツールも使い方自体は簡単なものが多いです。まずはお気に入りのツールを使い込んでIaCアプローチに慣れてみることをお勧めします。

また、ここではコマンドをターミナルから実行していましたが、実際のプロジェクトではCI/CDパイプラインのジョブに組み込んで、Gitレポジトリが提供するイベントフックを用いて完全自動化することが一般的です。
GitHub Actions等手軽に使えるCI/CDサービスも多いですので、パイプラインに組み込んでみると実運用をイメージできると思います。

