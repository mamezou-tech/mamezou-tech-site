---
title: EKS Blueprints(CDK)ですぐ使える実用的なEKSクラスタ環境を簡単に手に入れる
author: noboru-kudo
date: 2022-09-01
templateEngineOverride: md
tags: [k8s, container, aws-cdk, argocd, IaC]
---

EKSクラスタを構築するには、Kubernetesだけでなくその土台となるAWSネットワーク・セキュリティの知識も少なからず必要です。
また、素のEKSクラスタをそのまま利用することはほとんどなく、Ingress Controllerやオートスケーラー、メトリクスコレクター等多くのツールを別途セットアップする必要があります。
複数チームで共有するようなマルチテナント環境の場合は、NamespaceやRBAC等、やることはたくさんあります。
eksctlやTerraformのEKSモジュールを使えばある程度は改善できますが、全てをカバーできる訳ではありません。

これらをまとめて一気にセットアップしてくれるツールとして、EKS BlueprintsというOSSがあります。
AWS公式ブログでも紹介されています。

- [Bootstrapping clusters with EKS Blueprints](https://aws.amazon.com/jp/blogs/containers/bootstrapping-clusters-with-eks-blueprints/)
- [(邦訳)EKS Blueprints を使用してクラスターをブートストラップする](https://aws.amazon.com/jp/blogs/news/bootstrapping-clusters-with-eks-blueprints/)

EKS BlueprintsはネットワークやEKSクラスタはもちろん、アドオン形式でIngressやメトリクス関連のツールの構成やArgoCDによる継続的デプロイ環境までカバーしています。
現状EKS Blueprintsの提供形態は、AWS CDK(AWS Cloud Development Kit)とTerraformの2つのIaCツールに対応しています。

- [cdk-eks-blueprints](https://aws-quickstart.github.io/cdk-eks-blueprints/)
- [terraform-aws-eks-blueprints](https://aws-ia.github.io/terraform-aws-eks-blueprints/)

今回はAWS CDKの方で試してみます(Terraformの方も後日トライします)。


## AWS CDKプロジェクトを作成する

まずはAWS CDKのCLIをインストールしておきます。AWS CDKはnpmモジュールとし提供されています。

- [npm - AWS-CDK Toolkit](https://www.npmjs.com/package/aws-cdk)

こちらをまずはインストールしておきます。

```shell
npm install -g aws-cdk
```

なお、CDKの前提条件として[AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)も別途インストールが必要です。

続いて、AWS CDKプロジェクトを`app`テンプレートを使って初期化します。

```shell
mkdir eks-blueprints-cdk-example
cd eks-blueprints-cdk-example
cdk init app --language typescript
```

今回はCDKの実装言語としてTypeScriptを選択しました。
実行後は、ディレクトリ内にAWS CDKの`app`テンプレートが展開されます。

```
eks-blueprints-cdk-example/
├── README.md
├── bin
│ └── eks-blueprints-cdk-example.ts
├── cdk.json
├── jest.config.js
├── lib
│ └── eks-blueprints-cdk-example-stack.ts
├── package-lock.json
├── package.json
├── test
│ └── eks-blueprints-cdk-example.test.ts
└── tsconfig.json
```

今回使うのは`bin`ディレクトリ配下の`eks-blueprints-cdk-example.ts`です。
このファイル名は、デフォルトではプロジェクトディレクトリ名と同じになります。

最後に本題のEKS Blueprintsをインストールします。

- [npm - @aws-quickstart/eks-blueprints](https://www.npmjs.com/package/@aws-quickstart/eks-blueprints)

```shell
npm install @aws-quickstart/eks-blueprints
```

ここでは現時点で最新の`1.2.0`をセットアップしました。

## EKS Blueprintsを使ってEKSクラスタ構成を記述する

EKS Blueprintsが提供するAPIを使うように、生成されたCDKのソースコード(`bin/eks-blueprints-cdk-example.ts`)を修正します。
ここでは、以下のようにしてみました。

```typescript
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from "@aws-quickstart/eks-blueprints";

const app = new cdk.App();
const account = "XXXXXXXXXXXX"; // AWSアカウントID
const region = "ap-northeast-1";

const addOns = [
  new blueprints.addons.VpcCniAddOn(),
  new blueprints.addons.CoreDnsAddOn(),
  new blueprints.addons.KubeProxyAddOn(),
  new blueprints.addons.ArgoCDAddOn(),
  new blueprints.addons.AwsLoadBalancerControllerAddOn(),
];

blueprints.EksBlueprint.builder()
  .account(account)
  .region(region)
  .addOns(...addOns)
  .build(app, "eks-blueprints"); // IDはデフォルトでCloudFormationのスタック/EKSクラスタ名として使用される
```

アドオン(addOns)にCNIやCoreDNS、KubeProxy等のEKS本体でアドオンとして提供されているものに加えて、Ingress実装であるAWS Load Balancer Controller(以下ALB Controller)やArgoCD等サードパーティ製のものも設定しています。
これを設定すれば、EKSクラスタで必要な各種ツールをまとめて構成できます。ここでは全てデフォルトですが、各アドオンのコンストラクタでカスタム設定を入れることもできます。
EKS Blueprintsで提供されているアドオンは多岐に渡っており、これ以外にもよく使うものが多数含まれています。
詳細は以下の公式ドキュメントを参照しくてださい。

- [EKS Blueprints(CDK) - Add-ons](https://aws-quickstart.github.io/cdk-eks-blueprints/addons/)

これらの設定に加えて、AWSアカウント・リージョン等をEKS Blueprintsのビルダーに設定すれば完了です。
ほとんどデフォルトを使っているのもありますが、コード自体とてもシンプルで自明です。
もちろんCDKのソースコードは通常のTypeScriptですので、環境に応じて各種設定を切り替えるのも簡単です。TerraformやCloudFormationのようにツール固有のトリッキー(?)な記述は不要です。

:::column:クラスタ環境をカスタマイズする
ここではクラスタ環境の構成を指定しなかったので、マネージドノードグループで1ノードのみの構成になります（デフォルト）。
もちろん、実運用で使う場合は、別途カスタマイズが必要です。場合によってはEC2ベースのマネージドノードグループではなく、Fargateを使いたいということもあるかと思います。

EKS blueprintsでは、適切なクラスタープロバイダーを選択、設定することで好みのクラスタ環境にカスタマイズできます。

- [EKS Blueprints(CDK) - Cluster Providers](https://aws-quickstart.github.io/cdk-eks-blueprints/cluster-providers/)

例えば、マルチノードでマネージドノードグループを構成する場合は、以下のようになります。

```typescript
const clusterProvider = new blueprints.MngClusterProvider({
  version: cdk.aws_eks.KubernetesVersion.V1_21,
  minSize: 2,
  maxSize: 5,
  desiredSize: 3,
  instanceTypes: [cdk.aws_ec2.InstanceType.of(cdk.aws_ec2.InstanceClass.M5, cdk.aws_ec2.InstanceSize.XLARGE)]
})

blueprints.EksBlueprint.builder()
  .account(account)
  .region(region)
  .clusterProvider(clusterProvider)
  .addOns(...addOns)
  .build(app, "eks-blueprints");
```

上記はクラスタープロバイダーでマネージドノードグループを使用するMngClusterProviderを使用して、ノード数やEC2のインスタンスタイプを指定しています。
GenericClusterProviderを使えば、Fargateとマネージドノードグループとのハイブリッド構成も可能です。
:::

## AWS CDKをデプロイする

ここで、一旦EKSクラスタ環境を構築してみます。
まず最初に、CDK Toolkit自体のCloudFormationスタックをデプロイします。

```shell
cdk bootstrap
```

CloudFormationスタックは以下のようになります。

![CDK Toolkit - stack](https://i.gyazo.com/0f29c7d57abd1bd24413ed885d2f2334.png)

ここでS3やECRレポジトリ、IAMリソース等が作成されます。後続のデプロイではここで作成したリソースを使用します。
本題ではありませんので、このBootstrapの詳細は省きます。興味のある方は公式ドキュメントを参照しくてださい。

- [AWS CDK(v2) - Bootstrapping](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html)

実際のCDKのデプロイは、以下のコマンドを実行します。

```shell
cdk deploy
```

デプロイが完了するまでしばらく待ちます。25分もすればEKS環境ができあがっていました。

CloudFormationスタックは以下のようになっていました。

![CloudFormation Stack - deploy](https://i.gyazo.com/af08a62b6f8e8d55337d5228eb8ae486.png)

`eks-blueprints`をルートスタックとして、2つのネストされたスタックが作成されました。
多数のリソースが含まれていますので、詳細は省きますが、マネジメントコンソールからVPCネットワークとEKSクラスタ環境を確認してみます。

- VPCネットワーク
![VPC](https://i.gyazo.com/7191c57830d6eb3899f51e98d0763afa.png)

- EKSクラスタ
![EKS Cluster](https://i.gyazo.com/e7050742dd6cc3faa30b8fef27a233d3.png)

あれだけの記述量で、立派なクラスタ環境ができました。

次に、EKS Blueprintsで指定したアドオンの状態を確認します。
まずはEKSで提供されているアドオンです。

![EKS Cluster Addon](https://i.gyazo.com/8537896ce5f876c2a262e8d701f35bb1.png)

指定した3つのアドオンが有効化されているのが確認できます。

次に、ALB ControllerとArgoCDを確認します。これらはEKS内のPodとして作成されているはずです。
まずは、EKSクラスタにアクセスできるように、kubectlのkubeconfigを更新します。
初期状態でアクセス可能なIAMロール[^1]はデプロイ時に出力されますが、実態はCloudFormationの出力(Outputs)です。
マネジメントコンソールからルートスタック(ここでは`eks-blueprints`)の出力を確認します。

[^1]: このIAMロールのみがEKS内にアクセス可能なものとして、ConfigMap`aws-auth`に追加されます。

![CloudFormation Outputs](https://i.gyazo.com/d32b631b24367a58d182d04e986e5d03.png)

AWS CLIのコマンド(`aws eks update-kubeconfig`)が出力されていますので、これをコピーしてローカル環境で実行します。

```shell
aws eks update-kubeconfig --name eks-blueprints --region ap-northeast-1 \
  --role-arn arn:aws:iam::XXXXXXXXXXXX:role/eks-blueprints-eksblueprintsMastersRole4B4A8F3E-1XK07TJ2WHF6A	
```

では、EKSクラスタ内のリソースを確認します。

- ALB Controller
```shell
kubectl get pod -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller
```
```
NAME                                            READY   STATUS    RESTARTS   AGE
aws-load-balancer-controller-7f8f9f94db-ldgdp   1/1     Running   0          36m
aws-load-balancer-controller-7f8f9f94db-xlfp9   1/1     Running   0          36m
```

- ArgoCD
```shell
kubectl get pod -n argocd
```
```
NAME                                                              READY   STATUS    RESTARTS   AGE
blueprints-addon-argocd-application-controller-0                  1/1     Running   0          37m
blueprints-addon-argocd-applicationset-controller-55b8cc6blvdkb   1/1     Running   0          37m
blueprints-addon-argocd-dex-server-75c7749fb7-48dbc               1/1     Running   0          37m
blueprints-addon-argocd-notifications-controller-d78b586f5jf244   1/1     Running   0          37m
blueprints-addon-argocd-redis-848d4cd999-s78gw                    1/1     Running   0          37m
blueprints-addon-argocd-repo-server-df564957-fws7x                1/1     Running   0          37m
blueprints-addon-argocd-server-5476f69798-j9sck                   1/1     Running   0          37m
```

それぞれのPodが実行されています。個別セットアップせずに、すぐにアプリをデプロイできる環境が手に入りました。

## ArgoCDでアプリケーションをデプロイする

セットアップしたArgoCDを使ってアプリケーションをデプロイしてみます。
ここでは、EKS Blueprintsで用意されている[サンプル](https://github.com/aws-samples/eks-blueprints-workloads)を使ってみます。

- [EKS Blueprints(CDK) - Getting Started - Deploy workloads with ArgoCD](https://aws-quickstart.github.io/cdk-eks-blueprints/getting-started/#deploy-workloads-with-argocd)

上記ドキュメントの通り実施するだけですので、ここでの記載は省略します。
デプロイが終わると、以下のように4チーム(team-burnham/team-riker/team-geordie/team-carmen)のサンプルアプリがデプロイされます。

![argocd ui](https://i.gyazo.com/31ee80a1d145b828695f9c9b69b34736.png)

dev-appsは`app of apps`と呼ばれるもので、サンプルアプリ自体をデプロイするアプリです。詳細は[ArgoCDのドキュメント](https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-bootstrapping/)を参照してください。

## チームを管理する

EKS Blueprintsのコアコンセプトの1つにチーム管理があります。
通常複数チームで1つのクラスタ環境を使うことも多いですので、これを使ってみることにします。

- [EKS Blueprints(CDK) - Teams](https://aws-quickstart.github.io/cdk-eks-blueprints/teams/)

現時点では、プラットフォームチーム(`PlatformTeam`)とアプリケーションチーム(`ApplicationTeam`)の2種類をサポートしています。
名前から想像がつく通り、プラットフォームチームはクラスタ全体の管理者、アプリケーションチームは各Namespaceに割り当てられた開発チームです。

EKSクラスタの設定同様に、チーム設定もEKS Blueprintsのビルダーで設定します。
ここでは先程デプロイしたサンプルアプリの4チーム＋クラスタ管理者(`admin`)を作成してみます。
以下は関連部分のみの抜粋です。

```typescript
import { ArnPrincipal } from "aws-cdk-lib/aws-iam";

// 省略

const admin = new PlatformTeam({
  name: "admin",
  users: [
    new ArnPrincipal(`arn:aws:iam::${account}:user/admin`)
  ],
});
const burnham = new ApplicationTeam({
  name: "burnham",
  users: [
    new ArnPrincipal(`arn:aws:iam::${account}:user/burnham`)
  ],
});
const riker = new ApplicationTeam({
  name: "riker",
  users: [
    new ArnPrincipal(`arn:aws:iam::${account}:user/riker`)
  ],
});
const geordie = new ApplicationTeam({
  name: "geordie",
  users: [
    new ArnPrincipal(`arn:aws:iam::${account}:user/geordie`)
  ],
});
const carmen = new ApplicationTeam({
  name: "carmen",
  users: [
    new ArnPrincipal(`arn:aws:iam::${account}:user/carmen`)
  ],
});

blueprints.EksBlueprint.builder()
  .account(account)
  .teams(admin, burnham, riker, geordie, carmen) // Team指定
  .region(region)
  .addOns(...addOns)
  .build(app, "eks-blueprints");
```

プラットフォームチーム(`mamezou-admin`)、サンプルアプリで作成された4つのアプリケーションチームそれぞれを定義し、EKS Blueprintsのビルダーに設定しています。
サンプルとして、チーム名のIAMユーザーを1人ずつ指定していますが、もちろん実運用では実際の開発者を複数指定します。
これで再度`cdk deploy`を実行します。

実行後はチームごとにIAMロールが作成されます。

![IAM Role - Team](https://i.gyazo.com/43e2392e209bfd71597850b88e63fd3d.png)

ロールの信頼ポリシーを見ると、先程指定したIAMユーザーのみがこのロールを引き受けられるようになっています。

![IAM Role - trusted policy](https://i.gyazo.com/266261aadd425cd8fe7978fda28f6128.png)

EKSクラスタ側も確認します。
まず、EKSでIAMリソースとの紐付けをしているConfigMapの`aws-auth`を見てみます。

```shell
kubectl describe cm aws-auth -n kube-system
```
以下は`mapRoles`の内容を抜粋、整形したものです。

```json
[
  {
    "rolearn": "arn:aws:iam::XXXXXXXXXXXX:role/eks-blueprints-teamadminAccessRole924BE173-13ILATWH14F8P",
    "username": "admin",
    "groups": [
      "system:masters"
    ]
  },
  {
    "rolearn": "arn:aws:iam::XXXXXXXXXXXX:role/eks-blueprints-teamburnhamAccessRole3CDA6927-15M0NDPVMK3P5",
    "username": "burnham",
    "groups": [
      "team-burnham-team-group"
    ]
  },
  {
    "rolearn": "arn:aws:iam::XXXXXXXXXXXX:role/eks-blueprints-teamrikerAccessRole9A404680-R2GJARZEQVN5",
    "username": "riker",
    "groups": [
      "team-riker-team-group"
    ]
  },
  {
    "rolearn": "arn:aws:iam::XXXXXXXXXXXX:role/eks-blueprints-teamgeordieAccessRole8DDEDE53-8GWTUGXUGF1B",
    "username": "geordie",
    "groups": [
      "team-geordie-team-group"
    ]
  },
  {
    "rolearn": "arn:aws:iam::XXXXXXXXXXXX:role/eks-blueprints-teamcarmenAccessRole3D9E17C9-1C87R7SMS4V3G",
    "username": "carmen",
    "groups": [
      "team-carmen-team-group"
    ]
  }
]
```

先程作成したIAMロールに対してグループ(`groups`)が割り当てられています。

プラットフォームチーム(`admin`)は`system:master`グループで、クラスタ管理者権限(`cluster-admin`ロール)になっています。

一方で、アプリケーションチームにはチーム別のグループ(`team-<name>-team-group`)が割り当てられています。
このグループには、以下の内容で権限が割り当てられており、自チームのNamespaceに作成したリソースのみ参照権限が割り当てられます。

- [GitHub - DefaultTeamRoles](https://github.com/aws-quickstart/cdk-eks-blueprints/blob/main/lib/teams/default-team-roles.ts)

残念ながら、現時点ではこのデフォルトRoleのカスタマイズはできないようです[^2]。最低限のアクセス許可のみとなっていますので、構築後に必要に応じて別途修正する必要がありそうです。

[^2]: EKS Blueprintsのソースコードを見ると今後はカスタマイズできるようになりそうです。

なお、自チームのNamespaceが未作成の場合は、CDKのデプロイ時に作成されます。デフォルトではアプリケーションチーム名に`team-`プレフィックスがついたものになります(チーム作成時に`namespace`プロパティで指定可)。

ここまで見てきたように、チームに所属する管理者や開発者は、クラスタ環境へのアクセスはIAMユーザーではなく、IAMロールでアクセスする必要があります。

```shell
# burnhamのIAMロールの例
aws eks update-kubeconfig --name eks-blueprints --region ap-northeast-1 \
  --role-arn arn:aws:iam::XXXXXXXXXXXX:role/eks-blueprints-teamburnhamAccessRole3CDA6927-15M0NDPVMK3P5	
# 自チームのNamespaceリソース参照
kubectl get pod -n team-burnham
> NAME                     READY   STATUS    RESTARTS   AGE
> nginx-66b6c48dd5-vs78l   1/1     Running   0          122m
# 他チームのNamespaceリソース参照
kubectl get pod -n team-carmen
> Error from server (Forbidden): pods is forbidden: User "burnham" cannot list resource "pods" in API group "" in the namespace "team-carmen"
```

指定するIAMロールは、CloudFormationのルートスタックの出力から確認可能です。

もちろんマネジメントコンソール経由でEKSクラスタ環境にアクセスする場合も、所属するチームのIAMロールへのスイッチロールが必要です。

## まとめ

EKS Blueprintsを使うことで、少しの記述でネットワーク環境やEKSクラスタだけでなく、クラス内部のリソースやチーム開発環境を一気に構築できます。
また、Blueprint(青写真)というだけあって、できあがったものの詳細を見るとベストプラクティス的な構成の勉強になりますので、たとえ使わなくてもやってみる価値はあると感じます。

EKS Blueprintsの今後の成長と普及に期待したいと思います。
