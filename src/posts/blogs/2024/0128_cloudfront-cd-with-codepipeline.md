---
title: CloudFrontの継続的デプロイをパイプラインから実行する
author: noboru-kudo
date: 2024-01-28
tags: [cloud-front, code-pipeline, lambda, AWS, "CI/CD"]
---

皆さんの現場ではどのようなリリース戦略を採用しているでしょうか？
安全なリリースを実現するために、ブルーグリーンデプロイやA/Bテスト、カナリアリリース等いろんなやり方やプロダクト/サービスがありますね。
もちろんAWSでも様々なリリース戦略をサポートしていますが、今回はCDNを提供するCloudFrontの継続的デプロイという機能を取り上げます。

- [AWS Doc - CloudFront の継続的デプロイを使用して CDN 設定の変更を安全にテストする](https://docs.aws.amazon.com/ja_jp/AmazonCloudFront/latest/DeveloperGuide/continuous-deployment.html)

CloudFrontの継続的デプロイは、プライマリとステージングのCloudFrontディストリビューションを用意してポリシーに基づいてトラフィックを振り分けます。
ステージングからプライマリへの昇格は、マネジメントコンソールやCLIまたはAPIを通して行うことでゼロダウンタイムのリリースを実現します。
とはいえ、このワークフローはCI/CDパイプライン(実態はAPIコール)を通して実行したいですね。
今回はAWSのマネージドサービスである[CodePipeline](https://aws.amazon.com/jp/codepipeline/)を使って継続的デプロイのワークフローを検証します。

# 全体構成
まず、今回構築する環境を眺めてみます。
実行環境側とパイプラインに分けて説明します。

## 実行環境(CloudFront)
![Runtime Architecture](https://i.gyazo.com/d7006035edc49e2585902b1984af80e5.png)

S3をオリジンとしたよくある構成のWebサイトです。
継続的デプロイで複数バージョンを同時リリースするために、S3上はバージョンごとのフォルダにアプリをデプロイする構成としています[^1]。

[^1]: ステージング、プライマリディストリビューションでオリジンを分ける方法でもいいと思います。

CloudFrontのディストリビューションは2つ用意します。
プライマリ環境が商用トラフィック、ステージング環境が継続的デプロイポリシーの条件で一部トラフィックが流れるディストリビューションです。
継続的デプロイでは、ステージング環境のディストリビューションはプライマリ環境とは別ですが、プライマリ環境側のURLを通してアクセスする形になります。つまりエンドユーザー観点では両環境の違いを意識しません。
プライマリ環境への昇格が実行される時点で、ステージング環境の設定がプライマリ環境に上書きされます。

なお、ここでは静的リソースを配置するS3オリジンとプライマリディストリビューションは事前に構築済みで商用運用中である前提としています。
また、今回の検証では継続的デプロイの動きを確認するためにキャッシュは無効化します[^2]。

[^2]: キャッシュはある程度長い時間有効にしている場合が多いかと思います。実運用だと早期の切り替えのために適宜キャッシュを無効化する必要がありそうです。

## パイプライン
![CodePipeline Architecture](https://i.gyazo.com/189ac06ff81caee9c3ecda43c523a59e.png)

パイプラインはGitレポジトリ(ここではCodeCommit。事前構築済み)の変更でトリガーされ、そこに配置されている継続的デプロイに関連する環境を構成します(CloudFormation)。
この後でLambda関数([継続的デプロイ有効化関数](#継続的デプロイ有効化関数))を実行します。詳細は後述しますが、作成した継続的デプロイ環境を有効に機能させるために必要な後処理をここで行っています。

これで継続的デプロイが有効になりますので、ステージング環境でテストを行います。
CloudFrontではステージング環境のルーティングとして以下2種類をサポートしています。

- ヘッダベース：特定のHTTPヘッダが付与されるリクエストのみをルーティング
- 重みベース：商用トラフィックのうち一定割合のリクエストをルーティング

これらは継続的デプロイのポリシーとして指定する形になります(CloudFormationテンプレートは後述します)。

テスト後は承認プロセスを挟みます。これはCodePipelineが提供する手動承認アクションを利用します。

- [AWS Doc - CodePipeline でパイプラインにマニュアルの承認アクションを追加する](https://docs.aws.amazon.com/ja_jp/codepipeline/latest/userguide/approvals-action-add.html)

承認後の最後のプロセス(`Promotion`ステージ)がプライマリ環境への昇格です。これにはLambda関数([プライマリ環境昇格関数](#プライマリ環境昇格関数))を利用します。
この中で[UpdateDistributionWithStagingConfig](https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_UpdateDistributionWithStagingConfig.html) APIを使ってステージング環境の設定でプライマリ環境を上書きします。

なお、ここでは前ステージの承認プロセスで拒否された場合のことは考慮していません。実運用だと継続的デプロイを無効化する等の後処理が別途必要になると思います。

# Lambda関数を準備する

パイプラインから呼ばれるLambda関数を準備し、デプロイ[^3]しておきます。

[^3]: ここではデプロイ方法については特に触れていませんが、マネジメントコンソール、CloudFormationやAWS CDK、Serverless Framework等何でも構いません。

## 継続的デプロイ有効化関数

ステージング環境向けのCloudFrontディストリビューション/継続的デプロイのCloudFormation適用後の事後処理を行います。
この関数が実行されると継続的デプロイ環境は完成します。

```typescript
// importは省略

const cfClient = new CloudFrontClient();
const pipelineClient = new CodePipelineClient();
const s3Client = new S3Client();

// CodePipelineより受け取るパラメータ
type UserParams = {
  PrimaryDistributionId: string;
  StagingDistributionId: string;
  ContinuousDeploymentPolicyId: string;
  StaticResourceBucketName: string;
};

// Lambdaイベントハンドラ
export const handler: CodePipelineHandler = async (event) => {
  const params: UserParams = JSON.parse(
    event["CodePipeline.job"].data.actionConfiguration.configuration
      .UserParameters
  );

  try {
    // バケットポリシーにステージンディストリビューションからのアクセスを許可
    const bucketPolicy = await s3Client.send(
      new GetBucketPolicyCommand({ Bucket: params.StaticResourceBucketName })
    );
    if (!bucketPolicy.Policy?.includes(params.StagingDistributionId)) {
      console.info("updating BucketPolicy...");
      await s3Client.send(
        new PutBucketPolicyCommand({
          Bucket: params.StaticResourceBucketName,
          Policy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Principal: {
                  Service: "cloudfront.amazonaws.com",
                },
                Action: "s3:GetObject",
                Resource: `arn:aws:s3:::${params.StaticResourceBucketName}/*`,
                Condition: {
                  "ForAnyValue:StringEquals": {
                    "AWS:SourceArn": [
                      `arn:aws:cloudfront::${process.env.AWS_ACCOUNT_ID}:distribution/${params.PrimaryDistributionId}`,
                      `arn:aws:cloudfront::${process.env.AWS_ACCOUNT_ID}:distribution/${params.StagingDistributionId}`,
                    ],
                  },
                },
              },
            ],
          }),
        })
      );
    }

    // 継続的デプロイポリシーとプライマリディストリビューションを関連付け
    const prod = await cfClient.send(
      new GetDistributionCommand({ Id: params.PrimaryDistributionId })
    );
    console.info({ distribution: prod.Distribution });
    if (
      prod.Distribution?.DistributionConfig?.ContinuousDeploymentPolicyId !==
      params.ContinuousDeploymentPolicyId
    ) {
      console.info("updating primary distribution...");
      await cfClient.send(
        new UpdateDistributionCommand({
          Id: params.PrimaryDistributionId,
          DistributionConfig: {
            ...prod.Distribution?.DistributionConfig,
            ContinuousDeploymentPolicyId: params.ContinuousDeploymentPolicyId,
          } as DistributionConfig,
          IfMatch: prod.ETag,
        })
      );
    }

    // 継続的デプロイ有効化
    // 一度プライマリに昇格するとテンプレート上は有効でも実リソースは無効になっている(ドリフト状態)ので2回目以降は都度有効化が必要(テンプレート上変更がないとCloudFormationの適用はスキップされる)
    const policy = await cfClient.send(
      new GetContinuousDeploymentPolicyCommand({
        Id: params.ContinuousDeploymentPolicyId,
      })
    );
    if (
      !policy.ContinuousDeploymentPolicy?.ContinuousDeploymentPolicyConfig
        ?.Enabled
    ) {
      console.info("enabling continuous deployment...");
      await cfClient.send(
        new UpdateContinuousDeploymentPolicyCommand({
          Id: params.ContinuousDeploymentPolicyId,
          ContinuousDeploymentPolicyConfig: {
            ...policy.ContinuousDeploymentPolicy
              ?.ContinuousDeploymentPolicyConfig,
            Enabled: true, // 有効化
          } as ContinuousDeploymentPolicyConfig,
          IfMatch: policy.ETag,
        })
      );
    }

    await pipelineClient.send(
      new PutJobSuccessResultCommand({
        jobId: event["CodePipeline.job"].id,
      })
    );
  } catch (e) {
    console.error({ e });
    await pipelineClient.send(
      new PutJobFailureResultCommand({
        jobId: event["CodePipeline.job"].id,
        failureDetails: {
          type: "JobFailed",
          message: (e as Error).message,
        },
      })
    );
  }
};
```

多少長いですが、やっている内容は以下の通りです。

1. (必要な場合)ステージングディストリビューションからS3オリジンへのアクセスを許可(バケットポリシー更新)
2. (必要な場合)継続的デプロイポリシーを事前構築済みのプライマリディストリビューションにアタッチ
3. (必要な場合)継続的デプロイポリシーを有効化

基本的には1,2は初回構築時のみ、3は2回目以降の継続的デプロイで実行されます。

:::column:なぜ継続的デプロイポリシーの有効化が必要か
継続的デプロイポリシーは前アクションのCloudFormationテンプレートにも含まれており、ここで有効化する必要はないと思われるかもしれません。
ただ、継続的デプロイのAPIを使ってプライマリ環境に昇格すると、継続的デプロイ自体は無効に直接更新されます。
この時点でCloudFormation上はドリフトした状態となります(スタック的には有効、実態のリソースは無効)。
このため、次のCloudFormation適用ではポリシーに変更がない場合は、更新不要と判断されてスキップされます(つまり有効にならない)。
このため、ここで改めて継続的デプロイポリシーを有効に更新する必要がありました。
:::

## プライマリ環境昇格関数

ステージング環境でのテストが承認され、プライマリ環境へ昇格する際に実行される関数です。
この関数が実行されると、ステージングディストリビューションの構成がプライマリディストリビューションにコピーされます。
また、ここで継続的デプロイ自体は無効化されステージング環境へのルーティングは停止されます。

```typescript
// importは省略

const cfClient = new CloudFrontClient();
const pipelineClient = new CodePipelineClient();

type UserParams = {
  PrimaryDistributionId: string;
  StagingDistributionId: string;
};
export const handler: CodePipelineHandler = async (event) => {
  const params: UserParams = JSON.parse(
    event["CodePipeline.job"].data.actionConfiguration.configuration
      .UserParameters
  );

  try {
    const prod = await cfClient.send(
      new GetDistributionCommand({ Id: params.PrimaryDistributionId })
    );
    const staging = await cfClient.send(
      new GetDistributionCommand({
        Id: params.StagingDistributionId,
      })
    );

    // StagingのProductionにConfigをコピー
    await cfClient.send(
      new UpdateDistributionWithStagingConfigCommand({
        Id: params.PrimaryDistributionId,
        StagingDistributionId: params.StagingDistributionId,
        IfMatch: `${prod.ETag}, ${staging.ETag}`,
      })
    );

    await pipelineClient.send(
      new PutJobSuccessResultCommand({
        jobId: event["CodePipeline.job"].id,
      })
    );
  } catch (e) {
    console.error({ e });
    await pipelineClient.send(
      new PutJobFailureResultCommand({
        jobId: event["CodePipeline.job"].id,
        failureDetails: {
          type: "JobFailed",
          message: (e as Error).message,
        },
      })
    );
  }
};
```

ポイントは`UpdateDistributionWithStagingConfigCommand`コマンドを送信している部分です。
ここで継続的デプロイの昇格APIを実行しています。

# パイプラインを構築する

CodePipelineのパイプラインはCloudFormationのテンプレート(pipeline.yml)で構築しました。
長いのでCodePipeline部分のみ抜粋して掲載します。

ファイル全体は[こちら](https://gist.github.com/kudoh/e5da51f09c1e7f8d068fddc33591e913)から参照できます。

## 継続的デプロイ環境構築ステージ

まず前半の継続的デプロイを有効にする部分です。
```yaml
  CodePipeline:
    Type: AWS::CodePipeline::Pipeline
    Properties:
      ArtifactStore:
        Location: !Ref ArtifactStoreBucket
        Type: S3
      Name: !Ref PipelineName
      RoleArn: !GetAtt [ "CodePipelineRole", Arn]
      Stages:
        # トリガー：Gitレポジトリ(継続的デプロイ構成)
        - Name: Source
          Actions:
            - Name: Source
              ActionTypeId:
                Category: Source
                Owner: AWS
                Provider: CodeCommit
                Version: "1"
              Configuration:
                BranchName: "main"
                RepositoryName: !Ref RepositoryName
              OutputArtifacts:
                - Name: SourceArtifactOutput
              RunOrder: "1"
        - Name: Deploy
          Actions:
            # ステージング用のディストリビューション、継続的デプロイメントポリシーのプロビジョニング
            - Name: Deploy_to_Staging
              ActionTypeId:
                Category: Deploy
                Owner: AWS
                Provider: CloudFormation
                Version: "1"
              InputArtifacts:
                - Name: SourceArtifactOutput
              Configuration:
                ActionMode: CREATE_UPDATE
                Capabilities: CAPABILITY_IAM,CAPABILITY_NAMED_IAM,CAPABILITY_AUTO_EXPAND
                RoleArn: !GetAtt CloudFormationRole.Arn
                StackName: !Ref CloudFormationStackName
                TemplatePath: !Sub SourceArtifactOutput::${CloudFormationFileName}
                ParameterOverrides: !Sub
                  - |
                    {
                      "PrimaryDistributionId": "${PrimaryDistributionId}", 
                      "StaticResourceBucketName": "${StaticResourceBucketName}", 
                      "OriginAccessControlId": "${OriginAccessControlId}"
                    }
                  -
                    PrimaryDistributionId: !Ref PrimaryDistributionId
                    StaticResourceBucketName: !Ref StaticResourceBucketName
                    OriginAccessControlId: !Ref OriginAccessControlId
              OutputArtifacts:
                - Name: CloudFormationOutputs
              Namespace: CFOutput
              RunOrder: "1"
            # 継続的デプロイ有効化関数実行
            - Name: Enable_CloudFront_CD
              ActionTypeId:
                Category: Invoke
                Owner: AWS
                Provider: Lambda
                Version: "1"
              InputArtifacts:
                - Name: CloudFormationOutputs
              Configuration:
                FunctionName: !Ref EnableCloudFrontCDLambdaName
                UserParameters: !Sub
                  - |
                    {
                      "PrimaryDistributionId": "${PrimaryDistributionId}",
                      "StagingDistributionId": "#{CFOutput.StagingDistributionId}",
                      "StaticResourceBucketName": "${StaticResourceBucketName}",
                      "ContinuousDeploymentPolicyId": "#{CFOutput.ContinuousDeploymentPolicyId}"
                    }
                  -
                    PrimaryDistributionId: !Ref PrimaryDistributionId
                    StaticResourceBucketName: !Ref StaticResourceBucketName
              RunOrder: "2"
              # 後半に続く...
```

`Source`ステージ後の`Deploy`ステージで2つのアクションを定義しています。
1つはGitレポジトリに配置されている継続的デプロイ用のCloudFormationテンプレート適用です(`Deploy_to_Staging`アクション)。
このCloudFormationテンプレートの内容については後述しますが、ここでステージング環境のバージョンやルーティングポリシー等の継続的デプロイの主要な設定をすることを想定しています。

もう1つはLambda関数([継続的デプロイ有効化関数](#継続的デプロイ有効化関数))実行です(`Enable_CloudFront_CD`アクション)。
Lambda関数実行に必要な情報は`UserParameters`として自CloudFormationのパラメータや前アクションのCloudFormationの出力(`CFOutput`)から設定しています。

## 承認・プライマリ環境昇格ステージ
続いてパイプラインの後半です。

```yaml
  CodePipeline:
    Type: AWS::CodePipeline::Pipeline
    Properties:
      # 省略
      Stages:
        # 前半ステージ(前述) - 省略
        - Name: ManualApproval
          Actions:
            - Name: ManualApproval
              ActionTypeId:
                Category: Approval
                Owner: AWS
                Provider: Manual
                Version: "1"
              RunOrder: "3"
        - Name: Promotion
          Actions:
            - Name: Promote_to_Production
              ActionTypeId:
                Category: Invoke
                Owner: AWS
                Provider: Lambda
                Version: "1"
              InputArtifacts:
                - Name: CloudFormationOutputs
              Configuration:
                FunctionName: !Ref PromoteLambdaName
                UserParameters: !Sub '{"PrimaryDistributionId": "${PrimaryDistributionId}", "StagingDistributionId": "#{CFOutput.StagingDistributionId}"}'
              RunOrder: "4"
```

`ManualApproval`ステージでステージング環境の承認アクションを配置します。ここではCodePipelineのUIで承認することを想定しています。

続く`Promotion`ステージはステージング環境のプライマリ環境への昇格です。これは前述の[プライマリ環境昇格関数](#プライマリ環境昇格関数)を実行するだけです。

# 継続的デプロイを試してみる

環境面の準備は整いましたので早速試してみます。
オリジンとなるS3バケットには、`1.0.0`/`2.0.0`/`3.0.0`のフォルダを作成して任意のHTML(index.html)を配置しておきます。
![S3](https://i.gyazo.com/6f3987a86eef960b119224674493876f.png)

以下のように現時点のプライマリ環境ではv1のHTMLが返ってきます。

```shell
PRIMARY_DISTRIBUTION_ID=xxxxxxxxxx
DOMAIN_NAME=$(aws cloudfront get-distribution --id ${PRIMARY_DISTRIBUTION_ID} --query "Distribution.DomainName" --output text)

curl https://${DOMAIN_NAME}/index.html

> <!DOCTYPE html><html lang="ja"><body><h1>v1 App</h1></body></html>
```

これを順次v2、v3へ別のルーティングポリシーで継続的デプロイ環境を構築してみます。

## HTTPヘッダベースルーティング
まずは特定のHTTPヘッダの場合にステージング環境へルーティングするようにしてみます。
以下の継続的デプロイのCloudFormationテンプレートをGitレポジトリに配置します。

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Staging CloudFront Distribution'

Parameters:
  PrimaryDistributionId:
    Type: String
  StaticResourceBucketName:
    Type: String
  OriginAccessControlId:
    Type: String

Resources:
  # 継続的デプロイポリシー
  ContinuousDeploymentPolicy:
    Type: AWS::CloudFront::ContinuousDeploymentPolicy
    Properties:
      ContinuousDeploymentPolicyConfig:
        Enabled: true
        StagingDistributionDnsNames:
          - !GetAtt SampleWebSiteDistributionStaging.DomainName
        # ステージング環境へのルーティング設定
        TrafficConfig:
          SingleHeaderConfig:
            Header: aws-cf-cd-env
            Value: staging
          Type: SingleHeader

  # ステージング用のディストリビューション
  SampleWebSiteDistributionStaging:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Enabled: true
        Staging: true
        HttpVersion: http2
        DefaultCacheBehavior:
          TargetOriginId: website-resources
          # AWS Managed Cache Policy(CachingDisabled)
          CachePolicyId: 4135ea2d-6df8-44a3-9df3-4b5a84be39ad
          ViewerProtocolPolicy: redirect-to-https
        Origins:
          - Id: website-resources
            DomainName: !Sub "${StaticResourceBucketName}.s3.${AWS::Region}.amazonaws.com"
            OriginAccessControlId: !Ref OriginAccessControlId
            S3OriginConfig: {}
            # ステージング環境はバージョン2.0.0のアプリ(プライマリ環境は1.0.0)
            OriginPath: /2.0.0
# 後続のアクションで使用
Outputs:
  StagingDistributionId:
    Value: !GetAtt SampleWebSiteDistributionStaging.Id
  ContinuousDeploymentPolicyId:
    Value: !GetAtt ContinuousDeploymentPolicy.Id
```

`ContinuousDeploymentPolicy`リソースで継続的デプロイのルーティング設定(`TrafficConfig`)をします。
今回はヘッダベースなので`Type: SingleHeader`とし、`SingleHeaderConfig`にステージング環境へルーティングするヘッダ名と値を指定します。
ここでは`aws-cf-cd-env`というヘッダで値に`staging`が設定されたリクエストをルーティング対象としました。
なお、CloudFrontの継続的デプロイのキーは`aws-cf-cd-`で始まる必要があります。

次にパイプラインを構築します。前述のパイプラインのCloudFormationスタックを作成します。
ここではCLIから実施しますが、マネジメントコンソールでも構いません。

```shell
aws cloudformation create-stack --stack-name cloudfront-cd-pipeline --template-body file://pipeline.yml \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
  --parameters ParameterKey=RepositoryName,ParameterValue=xxxxxx \
               ParameterKey=PrimaryDistributionId,ParameterValue=XXXXXXXXXXXXXX \
               ParameterKey=PromoteLambdaName,ParameterValue=cloudfront-cd-tools-dev-promote \
               ParameterKey=EnableCloudFrontCDLambdaName,ParameterValue=cloudfront-cd-tools-dev-enableCloudFrontCD \
               ParameterKey=StaticResourceBucketName,ParameterValue=cloudfront-cd-primary-distrib-staticresourcebucket-xxxxxxxxxx \
               ParameterKey=OriginAccessControlId,ParameterValue=XXXXXXXXXXXXXX
```

上記の各パラメータは、事前に構築済みのものを指定する必要があります。

| パラメータ名                       | 内容                               |
|------------------------------|----------------------------------|
| RepositoryName               | Gitレポジトリ名                        |
| PrimaryDistributionId        | CloudFrontプライマリディストリビューションのID    |
| EnableCloudFrontCDLambdaName | [継続的デプロイ有効化関数](#継続的デプロイ有効化関数)    |
| PromoteLambdaName            | [プライマリ環境昇格関数](#プライマリ環境昇格関数)      |
| StaticResourceBucketName     | 静的リソース格納バケット名                    |
| OriginAccessControlId        | CloudFrontに適用するオリジンアクセスコントロールのID |

CloudFormationの実行が終わると、以下のコードパイプラインが作成されています。

![Pipeline picture](https://i.gyazo.com/e80ab5dd30d01b64fbbe60a11f2c2cae.png)

初回はそのままパイプラインが実行され、v2向けの先ほど作成した継続的デプロイポリシーをもとにステージング環境が構築されます。
成功すると承認ステージ(`ManualApprove`)でパイプラインの実行が止まります。

![Pending stage](https://i.gyazo.com/615aa2caffc4b5432f28baabda96542b.png)

マネジメントコンソールからCloudFrontディストリビューションの状態を確認してみます。
- プライマリ環境
![primary distribution cd](https://i.gyazo.com/4c11aba856b4fd05c48fbb0900b6b037.png)
- ステージング環境
![staging distribution cd](https://i.gyazo.com/e5e78fe55447fed7080649e77a27ae98.png)

両環境のディストリビューションで継続的デプロイポリシーが関連づいています。
この状態で、指定したHTTPヘッダ(`aws-cf-cd-env:staging`)でアクセスすると、プライマリ環境ではなくステージング環境にトラフィックが流れます。

```shell
PRIMARY_DISTRIBUTION_ID=xxxxxxxxxx
DOMAIN_NAME=$(aws cloudfront get-distribution --id ${PRIMARY_DISTRIBUTION_ID} --query "Distribution.DomainName" --output text)

# プライマリ環境(v1)
curl https://${DOMAIN_NAME}/index.html
> <!DOCTYPE html><html lang="ja"><body><h1>v1 App</h1></body></html>

# ステージング環境(v2)
curl -H "aws-cf-cd-env:staging" https://${DOMAIN_NAME}/index.html
> <!DOCTYPE html><html lang="ja"><body><h1>v2 App</h1></body></html>
```
ヘッダ付きの方はステージング環境向けに配置してHTMLが返ってきます。ヘッダがないリクエストはステージング環境に流れることはなく、プライマリ環境つまり商用運用中の環境に影響を与えることはありません。

それでは、ステージング環境(v2)でのテストが終わったと仮定して承認します。これはCodePipelineのUIから行います。

保留中になっているアクションから「レビュー」をクリックすると以下のダイアログが表示されます。
「承認します」を選択し、コメント(任意)を記入して「送信」をクリックします。

![Approve release](https://i.gyazo.com/c7ceea3314c7250125c3bb5ef1e3ed80.png)

パイプラインが再開し、`Promote`ステージで[プライマリ環境昇格関数](#プライマリ環境昇格関数)が実行されます。

![Promote](https://i.gyazo.com/7d3ad00e982fba70bf6996e99010268f.png)

`Promote`ステージが終わって再度curlを実行すると今度はプライマリ環境でもv2のHTMLが返ってきます。

```shell
curl https://${DOMAIN_NAME}/index.html
> <!DOCTYPE html><html lang="ja"><body><h1>v2 App</h1></body></html>
```

マネジメントコンソールからプライマリ環境ディストリビューションの設定を確認します。
![Primary Distribution v2](https://i.gyazo.com/241d6a3eb404397815457ab108c32129.png)

オリジンパスが`1.0.0`から`2.0.0`と変わっています。ステージング環境の設定でプライマリ環境が上書きされていることが分かります。

## 重みベースルーティング

一通りの流れを確認できましたので、次はもう1つのルーティングポリシーである重みベースの方も見てみます。

Gitレポジトリに配置する継続的デプロイのCloudFormationテンプレートは以下になります。

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Staging CloudFront Distribution'

Parameters:
  PrimaryDistributionId:
    Type: String
  StaticResourceBucketName:
    Type: String
  OriginAccessControlId:
    Type: String

Resources:
  # 継続的デプロイポリシー
  ContinuousDeploymentPolicy:
    Type: AWS::CloudFront::ContinuousDeploymentPolicy
    Properties:
      ContinuousDeploymentPolicyConfig:
        Enabled: true
        StagingDistributionDnsNames:
          - !GetAtt SampleWebSiteDistributionStaging.DomainName
        # ステージング環境へのルーティング設定 -> 重みベースに変更
        TrafficConfig:
          SingleWeightConfig:
            Weight: 0.15 # 15%のトラフィックをステージング環境に転送(0 - 15%)
            SessionStickinessConfig: # スティッキーセッション有効化
              IdleTTL: 300 # 5分アクセスがなければ無効
              MaximumTTL: 600 # 最大10分間有効
          Type: SingleWeight

  # ステージング用のディストリビューション
  SampleWebSiteDistributionStaging:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Enabled: true
        Staging: true
        HttpVersion: http2
        DefaultCacheBehavior:
          TargetOriginId: website-resources
          # AWS Managed Cache Policy(CachingDisabled)
          CachePolicyId: 4135ea2d-6df8-44a3-9df3-4b5a84be39ad
          ViewerProtocolPolicy: redirect-to-https
        Origins:
          - Id: website-resources
            DomainName: !Sub "${StaticResourceBucketName}.s3.${AWS::Region}.amazonaws.com"
            OriginAccessControlId: !Ref OriginAccessControlId
            S3OriginConfig: {}
            # 2.0.0 -> 3.0.0
            OriginPath: /3.0.0
# 後続のアクションで使用
Outputs:
  StagingDistributionId:
    Value: !GetAtt SampleWebSiteDistributionStaging.Id
  ContinuousDeploymentPolicyId:
    Value: !GetAtt ContinuousDeploymentPolicy.Id
```

ポイントは`ContinuousDeploymentPolicy`リソースの`TrafficConfig`です。
今回は重みベースのルーティング設定である`Type: SingleWeight`を指定し、SingleWeightConfigに詳細な設定をします。
`Weight`でステージング環境へ振り向ける割合を指定します。
理由はよく分かりませんが、現時点では最大15％の割合までしかステージング環境へのルーティングはできないようです。

継続的デプロイはスティッキーセッション(`SessionStickinessConfig`)もサポートしており、クライアントは一定期間は同一環境に振り向けられます。
ブラウザベースのアプリケーションでは、環境が混在しないよう通常は有効にする形になると思います(上記は検証のため短めの値を指定しています)。

こちらをGitレポジトリにコミットします。
これをトリガーに再度パイプラインが再開し、先ほど同様に`ManualApproval`で保留中となり、継続的デプロイが有効になります。

curlで確認して見ると、指定した割合(ここでは15%)でステージング環境(v3)にルーティングされている様子が分かります。

```shell
for i in {1..10}; do curl https://${DOMAIN_NAME}/index.html; sleep 1; done

> <!DOCTYPE html><html lang="ja"><body><h1>v2 App</h1></body></html>
> <!DOCTYPE html><html lang="ja"><body><h1>v3 App</h1></body></html>
> <!DOCTYPE html><html lang="ja"><body><h1>v2 App</h1></body></html>
> <!DOCTYPE html><html lang="ja"><body><h1>v2 App</h1></body></html>
> <!DOCTYPE html><html lang="ja"><body><h1>v2 App</h1></body></html>
> <!DOCTYPE html><html lang="ja"><body><h1>v2 App</h1></body></html>
> <!DOCTYPE html><html lang="ja"><body><h1>v2 App</h1></body></html>
> <!DOCTYPE html><html lang="ja"><body><h1>v2 App</h1></body></html>
> <!DOCTYPE html><html lang="ja"><body><h1>v2 App</h1></body></html>
> <!DOCTYPE html><html lang="ja"><body><h1>v3 App</h1></body></html>
```

なお、筆者が検証した環境では、実際にステージング環境にも振り分けられるようになるまで10分ほど時間がかかりました。

上記はcurlコマンドのためスティッキーセッションが効いていませんが、ブラウザで確認してみると同一クライアントの場合は最大TTLまでは同一環境(v2 or v3)が表示されます。
Chrome DevToolで確認してみると、これには`x-amz-continuous-deployment-state`というセッションCookieが利用されているようです。

![chrome dev tools](https://i.gyazo.com/e3f5ddc250cf470a683f8e725ef356b9.png)

このCookieを削除すればセッションはリセットされて再度指定した割合で振り向けられます。

# 最後に

少し長い記事になってしまいましたが、CloudFrontの継続的デプロイをCodePipelineから実行できました。
今回やってみて感じたのは、この継続的デプロイ機能はIaCツールと相性があまりよくないかなと思いました。
プライマリ環境への昇格APIはプライマリディストリビューションの設定更新や継続的デプロイポリシーの無効化とリソースの状態を直接変更してしまいます。
このためCloudFormationテンプレートからのドリフトが発生して、意図しない動作でハマったりしました[^4]。

GitOpsの原則に徹するのであれば、継続的デプロイはトラフィックルーティングだけに限定し、昇格はAPIではなくプライマリ環境のCloudFormationテンプレート更新という形でもいいのかなと思ったりもしました。

[^4]: それ以外でもプライマリ環境のディストリビューション作成時に継続的デプロイを同時に作ろうとするとエラーになったりしました(別途更新が必要)。

---
参考記事・レポジトリ

- [AWS Blog - ブルー/グリーンでの継続的デプロイを使用して Amazon CloudFront でゼロダウンタイムのデプロイメントを実現する](https://aws.amazon.com/jp/blogs/news/networking-and-content-delivery-achieving-zero-downtime-deployments-with-amazon-cloudfront-using-blue-green-continuous-deployments/)
- [GitHub - AWS Samples - amazon-cloudfront-continuous-deployment](https://github.com/aws-samples/amazon-cloudfront-continuous-deployment)
- [GitHub - AWS Samples - amazon-cloudfront-continuousdeployment-cicd](https://github.com/aws-samples/amazon-cloudfront-continuousdeployment-cicd)
