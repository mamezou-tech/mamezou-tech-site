---
title: "AWS Controllers for Kubernetes(ACK): AWSサービスをKubernetesカスタムリソースで管理する"
author: noboru-kudo
date: 2022-09-14
templateEngineOverride: md
tags: [k8s, container, IaC, AWS]
---

Kubernetesを利用した開発では、クラスタ内で動作するアプリケーションやミドルウェアをDeploymentやStatefulSet等のKubernetes APIリソースとして管理します。
また、これにArgoCDやFlux等のデプロイツールを組み合わせて継続的にクラスタに同期することが一般的です。

一方で、クラウド環境を利用する場合は、クラウドベンダーが提供するサービスを使うことが多いかと思います。
これらはKubernetesのマニフェストファイルではなく、TerraformやCloudFormation、CDK等のIaCツールを使って別途プロビジョニングすることがほとんどです。
組織によっては、このようなIaCツールは別チーム管理で開発スピードを阻害する要因となり、フラストレーションが溜まっている現場もあるかもしれません。

AWS環境限定ですが、今回はAWSが提供するサービスもアプリケーションと一緒に管理できるAWS Controllers for Kubernetes(以下ACK)を紹介したいと思います。

- [GitHub - AWS Controllers for Kubernetes (ACK)](https://github.com/aws-controllers-k8s/community)
- [ACKドキュメント](https://aws-controllers-k8s.github.io/community/docs/community/overview/)

以下はACK公式ドキュメントから引用したアーキテクチャです。

![ACK - アーキテクチャ](https://i.gyazo.com/1c12b9128187d4c8219e8f915e0434e0.png)

引用元: [ACK - How it Works](https://aws-controllers-k8s.github.io/community/docs/community/how-it-works/)

このように、ACKは利用したいAWSサービスをKubernetesのカスタムリソースとしてデプロイすることで、Kubernetesのコントロールループで継続的にAWSインフラと同期してくれます。
これによって、AWSサービスもアプリケーション同様に、Kustomize等のKubernetes向けのツールで管理できるようになります。

:::info
今回触れませんが、類似のツールとしてマルチクラウド対応の[Crossplane](https://crossplane.io/)もあります。
現時点では、こちらの方がより多機能でサポート範囲が広くなっています（若干使い方が難しい感はありますが）。
:::

[[TOC]]

## ACKのIAMロールを準備する
ACKもKubernetesのPod(コントローラ)として動作します。AWSサービスへのアクセスポリシーを事前に準備する必要があります。
ここでは[IRSA(IAM Role for ServiceAccount)](https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html)を利用して、ACKコントローラのIAMロール・ポリシーを作成します。

ここでは事前にAWS EKS環境を準備し、ACKを使用してAWS DynamoDBを作成したいとします。

以下の信頼ポリシー(`dynamodb-trust-policy.json`)を準備しました。

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::xxxxxxxxxxxx:oidc-provider/oidc.eks.ap-northeast-1.amazonaws.com/id/A57296AAEB058CF4DC35ADD7C5A70DD7"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "oidc.eks.ap-northeast-1.amazonaws.com/id/A57296AAEB058CF4DC35ADD7C5A70DD7:sub": "system:serviceaccount:ack-system:ack-dynamodb-controller"
        }
      }
    }
  ]
}
```

PrincipalやConditionで使用している`oidc.eks.....`の部分は、IRSA用のEKS OIDCプロバイダのURL(プロトコルなし)です。ここを経由して、AWSよりセッショントークンを取得します。
URLはマネジメントコンソールのEKSメニューより確認できます。

![AWS EKS OpenID Connect Provider URL](https://i.gyazo.com/d006bbab33dc991ef033fb150d30b6b6.png)

Conditionの引受条件には、これから作成するKubernetesのServiceAccountを指定します。
以下のフォーマットで指定します。

- `system:serviceaccount:<k8s-namespace>:<k8s-service-account>`

これを信頼ポリシーとして、IAMロールを作成します。

```shell
aws iam create-role --role-name ack-dynamodb-controller \
  --assume-role-policy-document file://dynamodb-trust-policy.json
```

続いてこのIAMロールにIAMポリシーをアタッチします。
ここではAWSマネージドポリシーの`AmazonDynamoDBFullAccess`をつけます[^1]。

[^1]: 各ACKコントローラのGitHubレポジトリの`/config/iam/recommended-policy-arn`に推奨するポリシーが格納されています。

```shell
aws iam attach-role-policy \
  --role-name ack-dynamodb-controller \
  --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess
```

これで準備完了です。このIAMロールを利用して、ACKコントローラがDynamoDBリソースを作成・更新します。

## ACK(DynamoDBコントローラ)をインストールする

ここでEKSにACKをインストールします。
ACKは単一のプロダクトでなく、使用するAWSサービスの単位でインストールします。
まだ未実装のものもありますが、利用できるAWSサービスは以下公式ドキュメントを参照してください。

- [ACK - Services](https://aws-controllers-k8s.github.io/community/docs/community/services/)

今回はDynamoDBを対象としますので、以下のようにインストールします。ここでは現時点で最新の`v0.1.6`を指定しました。

```shell
helm upgrade --install --create-namespace --namespace ack-system ack-dynamodb-controller \
  oci://public.ecr.aws/aws-controllers-k8s/dynamodb-chart --version=v0.1.6 \
  --set aws.region=ap-northeast-1 \
  --set serviceAccount.annotations.eks"\.amazonaws\.com"/role-arn=arn:aws:iam::xxxxxxxxxxxx:role/ack-dynamodb-controller
```

ACKのHelmチャートはAWS ECRのパブリックレポジトリで管理されています。インストール時は以下のフォーマットでHelmチャートのURLを指定する必要があります。

- `oci://public.ecr.aws/aws-controllers-k8s/<aws-service>-chart`

また、Helmのパラメータ`serviceAccount.annotations...`の部分で先程作成したIAMロールのARNを指定します[^2]。
これでACKコントローラのServiceAccountは、このIAMロールを引き受けるようになります。

[^2]: Helm CLIの制約でドット`.`はエスケープして引用符で括る必要があります。

実際にインストールしたACKを確認します。

```shell
kubectl get deploy,pod -n ack-system
```

```
NAME                                                     READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/ack-dynamodb-controller-dynamodb-chart   1/1     1            1           114s

NAME                                                          READY   STATUS    RESTARTS   AGE
pod/ack-dynamodb-controller-dynamodb-chart-6c577cb5d9-wvgvr   1/1     Running   0          114s
```

カスタムリソース(CRD)も確認します。

```shell
kubectl get crd | grep dynamodb
```

```
backups.dynamodb.services.k8s.aws            2022-09-14T00:51:42Z
globaltables.dynamodb.services.k8s.aws       2022-09-14T00:51:42Z
tables.dynamodb.services.k8s.aws             2022-09-14T00:51:42Z
```

これを使用して、DynamoDBの構成を記述していく形になります。

## ACKでDynamoDBテーブルを作成する

実際にDynamoDBのテーブルを作成してみます。
Tableカスタムリソースを以下(`blog.yaml`)のように作成してみました。

```yaml
apiVersion: dynamodb.services.k8s.aws/v1alpha1
kind: Table
metadata:
  name: blog
spec:
  tableName: blog
  billingMode: PAY_PER_REQUEST
  attributeDefinitions:
    - attributeName: Url
      attributeType: S
  keySchema:
    - attributeName: Url
      keyType: HASH
```

ここではプレーンなYAMLファイルとして作成しました。
DynamoDBを使ったことがあれば、内容は自明です。1つのパーティションキーからなる`blog`テーブルです。
詳細なAPI仕様は、以下公式ドキュメントを参照してください。

- [ACK - API Reference](https://aws-controllers-k8s.github.io/community/reference/)

これをEKSクラスタに反映します。

```shell
kubectl apply -f blog.yaml -n default
```

作成したカスタムリソースを参照してみます。

```shell
kubectl describe table blog
```

以下抜粋です。

```
Name:         blog
Namespace:    default
API Version:  dynamodb.services.k8s.aws/v1alpha1
Kind:         Table
Spec:
  Attribute Definitions:
    Attribute Name:  Url
    Attribute Type:  S
  Billing Mode:      PAY_PER_REQUEST
  Key Schema:
    Attribute Name:  Url
    Key Type:        HASH
  Table Name:        blog
Status:
  Ack Resource Metadata:
    Arn:               arn:aws:dynamodb:ap-northeast-1:xxxxxxxxxxxx:table/blog
    Owner Account ID:  xxxxxxxxxxxx
    Region:            ap-northeast-1
  Billing Mode Summary:
    Billing Mode:  PAY_PER_REQUEST
  Conditions:
    Last Transition Time:  2022-09-14T04:30:27Z
    Message:               Resource synced successfully
    Reason:                
    Status:                True
    Type:                  ACK.ResourceSynced
  Creation Date Time:      2022-09-14T04:30:21Z
  Item Count:              0
  Table ID:                fc8a7f59-7c92-452a-9612-43ea70f595ec
  Table Size Bytes:        0
  Table Status:            CREATING
```

Statusを見るとACKのコントローラが、指定した構成でAWSと同期していることが分かります。

もちろん、作成したDynamoDBテーブルはマネジメントコンソールからも確認できます。

![AWS - management console - dynamodb](https://i.gyazo.com/9421116c23419deab43431b0d921d7c0.png)

ここで作成したものは、Kubernetesのコントロールループにより同期されますので、カスタムリソースを更新すれば、変更内容は即時反映されます。
カスタムリソースを削除した場合は、該当のDynamoDBテーブルも削除されます[^3]

[^3]: データも消えるので、アプリケーションのアンデプロイだけのつもりで誤って削除してしまうと事故になります。デプロイ単位等はアプリケーション本体とは分けたほうが良いかなと思います。

## まとめ

今回は、KubernetesのリソースとしてAWSサービスを管理するツールをご紹介しました。
これを使えば、KubernetesのマニフェストファイルとしてAWSサービスも管理できます。
まだ利用できるサービスに限りはありますが、AWS上のKubernetesでアプリケーション開発しているプロジェクトであれば、かなり魅力的なツールになると思います。

AWSブログでも、ACKでLambdaをデプロイする方法が紹介されています。興味のある方はご参照ください。

- [Deploying AWS Lambda functions using AWS Controllers for Kubernetes (ACK)](https://aws.amazon.com/jp/blogs/compute/deploying-aws-lambda-functions-using-aws-controllers-for-kubernetes-ack/)
