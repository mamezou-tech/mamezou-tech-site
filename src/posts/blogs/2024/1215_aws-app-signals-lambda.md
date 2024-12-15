---
title: CloudWatch Application Signals で Lambda のSLOをモニタリングする
author: noboru-kudo
date: 2024-12-15
tags: [ cloudwatch, APM, metrics, lambda, AWS ]
image: true
---

先月ですが、CloudWatch Application SignalsがAWS Lambdaに対応しました。

@[og](https://aws.amazon.com/jp/blogs/aws/track-performance-of-serverless-applications-built-using-aws-lambda-with-application-signals/)

CloudWatch Application Signalsは2023年にプレビューとして登場し、今年GAになった新しいAPM(Application Performance Monitoring)機能です。
今まではEKS、ECS、EC2のみのサポートでしたが、ついにLambdaにも対応しました。

Application Signalsは、OpenTelemetryを使って収集したメトリクスをダッシュボードやサービスマップとして可視化してくれます。
また、SLO(Service Level Objective)をベースとして、目標達成をサポートするプロセスはビジネス視点でとても合理的です。

今回は、今後はAWSの標準APMツールとして定着していくことになりそうなこの機能をLambdaで試してみます。

## Application Signals有効化

Application SignalsがサービスディスカバリやSLOを計測するためには、ログやメトリクスに対するアクセス許可が別途必要です。
ここではマネジメントコンソールから有効にしました。

![](https://i.gyazo.com/fecf90245236a16c771593d54f7a7c8c.png)

Step 2 は各サービスで有効にするので対応不要です。

## モニタリング対象のLambdaを実装する

まずは、モニタリング対象のLambdaを作成します。
今回は以下のLambdaを作成しました。

```typescript
import type { APIGatewayProxyHandler } from 'aws-lambda';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const s3client = new S3Client();
const handler: APIGatewayProxyHandler = async () => {

  await s3client.send(new PutObjectCommand({
    Bucket: process.env.BUCKET_NAME ?? '',
    Key: Date.now().toString() + '.txt',
    Body: 'lambda-app-signal-test'
  }))
  const rand = Math.random();
  // 5%の確率で失敗
  const success = rand > 0.05;
  if (!success) {
    throw new Error('oops!');
  }
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'ok!',
    }),
  };
}

// 現状ADOTをTypeScriptで使う場合にexport文が利用できない制約あり
// https://github.com/aws-observability/aws-otel-lambda/issues/99#issuecomment-919993949
module.exports = { handler }
```

ここではS3バケットへPUTした後に、5%の確率でエラーを発生させています。

## Application Signals有効化してLambdaをデプロイする

作成したLambdaをデプロイします。
ここではAWS CDKを使います。

```typescript
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class LambdaAppSignalStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, 'SampleBucket');
    const role = new iam.Role(this, 'LambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        // 1. Application SignalsのAWSマネージドポリシー
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLambdaApplicationSignalsExecutionRolePolicy')
      ],
      inlinePolicies: {
        s3policy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ['s3:PutObject'],
              resources: [bucket.bucketArn + '/*']
            })
          ]
        })
      }
    });

    // 以下よりAWS管理のLambda LayerのARN取得
    // https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Application-Signals-Enable-Lambda.html#Enable-Lambda-Layers
    const awsOtelDistro = lambda.LayerVersion.fromLayerVersionArn(this, 'AWSOtelExtension',
      'arn:aws:lambda:ap-northeast-1:615299751070:layer:AWSOpenTelemetryDistroJs:5');
    const func = new nodejs.NodejsFunction(this, 'SampleFunction', {
      role,
      functionName: 'flaky-api-for-app-signals',
      entry: './lambda/index.ts',
      handler: 'handler',
      tracing: lambda.Tracing.ACTIVE, // X-RayのActive Tracing有効化(任意)
      layers: [awsOtelDistro], // 2. ADOTレイヤー
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: cdk.Duration.seconds(10),
      environment: {
        BUCKET_NAME: bucket.bucketName,
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-instrument' // 3. Application Signals有効化
      }
    });
    const url = new lambda.FunctionUrl(this, 'SampleFunctionUrl', {
      function: func,
      authType: lambda.FunctionUrlAuthType.NONE
    });

    new cdk.CfnOutput(this, 'SampleFunctionUrlOutput', {
      value: url.url
    });
    new cdk.CfnOutput(this, 'BucketNameOutput', {
      value: bucket.bucketName
    });
  }
}
```

AWS LambdaでApplication Signalsを利用する手順は以下の通りです。

1. AWSマネージドポリシーをLambdaの実行ロールに指定
    - `CloudWatchLambdaApplicationSignalsExecutionRolePolicy`
2. AWSが提供するADOT(AWS Distro for OpenTelemetry)をLambdaレイヤーとして追加
3. 環境変数`AWS_LAMBDA_EXEC_WRAPPER`に`/opt/otel-instrument`を指定

AWSのADOT Lambdaレイヤーは[公式ドキュメント](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Application-Signals-Enable-Lambda.html#Enable-Lambda-Layers)に記載されているものを使います。
また、公式ドキュメントによるとこれに加えてX-RayのActive Tracingを有効にすることも推奨されています。

これをCDKのCLIからデプロイします。

```shell
cdk deploy
```

デプロイ後にマネジメントコンソールからLambdaの状態を確認します。

![Lambda with app signals](https://i.gyazo.com/66eb0d2eb331574e88f66f57d9d28cf0.png)

Application SignalsとX-Rayのトレーシングが有効になっています。

Lambda Function URLを有効にしていますので、curl等でアクセスできます。

```shell
curl https://xxxxxxxxxxxxxxxxxx.lambda-url.ap-northeast-1.on.aws/
# {"message":"ok!"}
```

## Application Signalsのサービス、サービスマップを確認する

モニタリング対象サービスでトラフィックが発生すると、Application Signalsはサービスの追加を検知し、Application Signalsから確認できるようになります。
このプロセスには一定時間(5分程度？)かかります。

![app signals - service discovery](https://i.gyazo.com/1f1355841ff9636187af93ca83e1267e.png)

サービス名をクリックするとサービスの詳細も確認できます。

**Overview**
![app signals - overview](https://i.gyazo.com/32a59ac0afb833012093e766c606c853.png)

**Service Operations**
![app signals - service operations](https://i.gyazo.com/352c91f57f969ca4454ce6bc1aee91ab.png)

**Dependencies**
![app signals - Dependencies](https://i.gyazo.com/672978b643273eb4a5ea74467303eddf.png)

Synthetics CanariesとClient Pagesは今回利用していませんので何も表示されません。

サンプル数が少なく見栄えが良くないですが、Lambdaのメトリクスや依存関係(S3)が可視化されています。
必要に応じてX-Rayで分析するとボトルネックも見えやすくなるかと思います。

次にApplication Signalsのサービスマップを確認します。

![app signals - service map](https://i.gyazo.com/75ceee8e8642ee7f3d9c89b60c571b1d.png)

今回作成したLambda -> S3バケットの関係が可視化されています(X-Rayのトレースマップと似ているような)。
各ノードやエッジをクリックすると該当部分のメトリクスを確認できます。

## SLOを定義する

Application Signalsによるオートディスカバリや標準化ダッシュボードを見てきましたが、さらにSLOを定義してビジネス目線でのモニタリングをやってみます。

ここでも、AWS CDKを使ってSLOを作成します。
Application Signalsは現状L1コンストラクトしかありませんので、CloudFormationで記述するのと同等です。

- [CloudFormation Doc - AWS::ApplicationSignals::ServiceLevelObjective](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-applicationsignals-servicelevelobjective.html)

```typescript
if (this.node.tryGetContext('createSLO') === 'true') {
  const availabilitySLO = new applicationsignals.CfnServiceLevelObjective(this, 'AvailabilityServiceLevelObjective', {
     name: `${func.functionName}-availability`,
     requestBasedSli: {
        requestBasedSliMetric: {
           metricType: 'AVAILABILITY',
           keyAttributes: {
              'Type': 'Service',
              'Name': func.functionName,
              'Environment': 'lambda:default'
           },
           operationName: `${func.functionName}/FunctionHandler`
        }
     },
     goal: {
        attainmentGoal: 95,
        warningThreshold: 30,
        interval: {
           rollingInterval: {
              duration: 1,
              durationUnit: 'DAY' // DAY | MONTH
           }
        }
     },
     // バーンレート(5分、60分の時間枠)
     burnRateConfigurations: [{ lookBackWindowMinutes: 5 }, { lookBackWindowMinutes: 60 }]
   });
}
```

ここでは以下をSLOとしました。

**SLI(Service Level Indicator)**
SLOの指標とするメトリクスです。

採用する指標は可用性(`AVAILABILITY`)とレイテンシ(`LATENCY`)がデフォルトで選択できます。今回は`AVAILABILITY`を指定しました。
これ以外にもモニタリング対象サービスの任意CloudWatchメトリクスも指定可能です。

また指標の算出方法として、一定間隔毎に評価する方式(`sli`)と成功リクエスト数で算出する方式(`requestBasedSli`)の2種類が選択できます。
ここでは計算が単純なリクエストベースを採用しました。

**SLO目標(`goal`)**
先ほど作成したLambdaは5%の確率で失敗するようにしました。
これに合わせて、SLOの目標値(`attainmentGoal`)をギリギリ超えるか超えないかという95%にしました。

監視期間は直近24時間をローリングインターバル(`rollingInterval`)として、現在時刻からスライドしていくことで最新のメトリクスを見るようにしています。
他にもカレンダーインターバル(日/週/月等)の`calendarInterval`も指定可能です。
常に最新情報を見るローリングインターバルは短期的な異常を素早く検知できますが、ビジネス目線のカレンダーインターバルの方がステークホルダーへの説明がしやすいかと思います。

**バーンレート(`burnRateConfigurations`)**
説明がちょっと難しいのがバーンレート(BurnRate)です[^1]。
バーンレートは指定された期間内でエラーバジェット(許容されるエラー)がどの程度の速さで消費されているかを表す指標です(コラム参照)。
バーンレート出典元のGoogleの[Site Reliability Workbook](https://sre.google/workbook/alerting-on-slos/)では、長期と短期の振り返り期間のバーンレートを組み合わせることで信頼性のあるアラートが実現できると言及されています。

これに倣い、ここでは5分と60分の振り返り期間(Look-back window)を設定しました。

[^1]: バーンレートはつい最近Application Signalsで[サポート](https://aws.amazon.com/jp/about-aws/whats-new/2024/11/application-signals-burn-rate-application-performance-goals/)されるようになったようです。

:::column:バーンレートの計算式

計算式はシンプルです。期間内に発生したエラー率(%)からエラーバジェット(%)を割った値になります。

$$
\text{バーンレート} = \frac{\text{実際のエラー率}}{\text{エラーバジェット}}
$$

エラーバージェットは1からSLO目標値を差し引いた値です(99%であれば1%)。その名の通り、SLO期間内に予定しているエラー発生の予算です。
その値の大きさによって以下の状況になります。

- 1の場合: エラーバジェットをちょうど使い切るペース
- 1以上の場合: SLO監視期間到来前にエラーバジェットが枯渇するペース(対処が必要)
- 1以下の場合: エラーバジェットに収まっている(理想的だがリスクを取ってないとも見做される)

例えば、上記可用性SLOのバーンレートを考えてみます。
バーンレートの5分間のLook-back window内で1000リクエストがあり200リクエストでエラーが発生した場合は以下のように計算できます。

- 許容エラー率(エラーバジェット): 100% - 95% = 5%
- 実際のエラー率: 200 / 1000 * 100 = 20%
- バーンレート: 20% / 5% = 4

となり予定の4倍の速度でエラーバジェットを消費していることになります。
この状態が続けばSLO監視期間の1/4でエラーバジェットは枯渇してしまうため、即時の対応が必要になります。
:::

SLOをデプロイします。今回はパラメータとして`createSLO`を`true`にして実行します。

```shell
cdk deploy --context createSLO=true
```

:::alert
SLOは対象サービスがApplication Signalsがサービスを検知してからでないと作成できません。
つまり、Lambda作成と同タイミングでSLOも作成しようとすると、サービスが見つからずにエラーになります。

これを回避するために、ここで対応しているようにフラグ(createSLO)で切り替えたり、スタック自体を分離する等、実行タイミングを調整する工夫が必要です。
:::

マネジメントコンソールでApplication SignalsのSLOを確認します。

![availabilitySLO](https://i.gyazo.com/311384fd5b7f230080b3b41b38f70c30.png)

SLOを定義するだけで、いい感じのダッシュボードを作成してくれます。
今回は94.5%とSLOに指定した95%の可用性は達成できていない状態になっています(2リクエスト分のエラーバジェットを超過)。

また、中程のバーンレートのグラフ見ると短期の振り返り期間(5分)がリクエストの失敗に敏感に反応している一方で長期化の振り返り期間(60分)は平準化されている様子も確認できます。

## SLOベースでCloudWatchアラームを作成する

SLOは定義して現在の状態を可視化しましたが、通知メカニズムを構築しなければ意味がありません。
Application Signals自体はSLOに関連するメトリクスをCloudWatchに登録するまでで、これを監視してアラームを発報するのはCloudWatchアラームの役割です。

今回は以下の3つのタイミングでアラートを作成します。

1. エラーバジェットが残30%の警告
2. エラーバジェットが枯渇(=SLO未達成)
3. 一定期間で10%以上のエラーバジェットを消費

通知方法はSNSを利用したメール通知とします。
以下でSNSトピックとメールサブスクリプションを事前に用意します。

```typescript
const mail = this.node.getContext('mail'); // デプロイ時にアドレス指定
const topic = new sns.Topic(this, 'SampleTopic', {
   topicName: 'flaky-api-for-app-signals-topic'
});
topic.addSubscription(new subscriptions.EmailSubscription(mail));
```

以降はこのSNSトピックをアラームアクションとして追加しています。

### 1. エラーバジェットが残30%の警告 

```typescript
const warningAlarm = new cloudwatch.Alarm(this, 'AvailabilityWarningAlarm', {
   alarmName: `SLO-WarningAlarm-${availabilitySLO.name}`,
   alarmDescription: 'SLO警告(残30%)の閾値超過アラーム',
   actionsEnabled: true,
   evaluationPeriods: 1,
   datapointsToAlarm: 1,
   threshold: 100 - (5 * (1 - 0.3)), // 96.5%
   comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,
   metric: new cloudwatch.Metric({
      metricName: 'AttainmentRate',
      namespace: 'AWS/ApplicationSignals',
      statistic: cloudwatch.Stats.AVERAGE,
      dimensionsMap: {
         SloName: availabilitySLO.name
      },
      unit: cloudwatch.Unit.PERCENT,
      period: cdk.Duration.minutes(5)
   })
});
warningAlarm.addAlarmAction(new actions.SnsAction(topic));
```

Application Signalsは`AWS/ApplicationSignals`ネームスペースに送信されてます。
その中でメトリクス名`AttainmentRate`には、現在のSLO達成率が送信されています。
これを監視すれば良さそうです。
ここではエラーバジェット5%の70%で3.5%、つまり96.5%を切った時点で通知すればいいことになります。

### 2. エラーバジェットが枯渇(=SLO未達成)

```typescript
const attainmentAlarm = new cloudwatch.Alarm(this, 'AvailabilityAttainmentGoalAlarm', {
   alarmName: `SLO-AttainmentGoalAlarm-${availabilitySLO.name}`,
   alarmDescription: 'SLOゴールの閾値超過アラーム',
   actionsEnabled: true,
   evaluationPeriods: 1,
   datapointsToAlarm: 1,
   threshold: 95, // SLOのgoal.attainmentGoalと同値
   comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,
   metric: new cloudwatch.Metric({
      metricName: 'AttainmentRate',
      namespace: 'AWS/ApplicationSignals',
      statistic: cloudwatch.Stats.AVERAGE,
      dimensionsMap: {
         SloName: availabilitySLO.name
      },
      unit: cloudwatch.Unit.PERCENT,
      period: cdk.Duration.minutes(5)
   })
});
attainmentAlarm.addAlarmAction(new actions.SnsAction(topic));
```

使用するメトリクスは警告通知と同じですが、閾値はSLOの目標値(95%)と同じになります。

### 3. 一定期間で10%以上のエラーバジェットを消費

もちろん単一バーンレートに対するアラームでも良いのですが、ここでは短期・短期のバーンレートを組み合わせて使うことでアラートの精度を向上させます。

- 短期バーンレート(5分)：エラーが現在進行中であることを素早く検知・確認する。エラーが止まるとすぐに閾値を下回るため、アラートが速やかに解除される。
- 長期バーンレート(1時間)：持続的なエラーの傾向を確認する。短期の誤検知をフィルタリングする役割。

CloudWatchの[Composite Alarm](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Create_Composite_Alarm_How_To.html)を使います。

```typescript
const burnRateAlarm_5min = new cloudwatch.Alarm(this, 'AvailabilityBurnRateAlarm_5min', {
   alarmName: `SLO-BurnRate-${availabilitySLO.name}-5`,
   alarmDescription: 'バーンレート(5分)の閾値超過アラーム',
   actionsEnabled: true,
   evaluationPeriods: 1,
   datapointsToAlarm: 1,
   // https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-ServiceLevelObjectives.html#CloudWatch-ServiceLevelObjectives-burn
   threshold: 0.1 * (24 * 60) / 60, // 2.4: 長期のLook-back window(60分)に合わせる
   comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
   metric: new cloudwatch.Metric({
      metricName: 'BurnRate',
      namespace: 'AWS/ApplicationSignals',
      statistic: cloudwatch.Stats.MAXIMUM,
      dimensionsMap: {
         SloName: availabilitySLO.name,
         BurnRateWindowMinutes: '5'
      },
      period: cdk.Duration.minutes(2)
   })
});

const burnRateAlarm_60min = new cloudwatch.Alarm(this, 'AvailabilityBurnRateAlarm_60min', {
   alarmName: `SLO-BurnRate-${availabilitySLO.name}-60`,
   alarmDescription: 'バーンレート(60分)の閾値超過アラーム',
   actionsEnabled: true,
   evaluationPeriods: 1,
   datapointsToAlarm: 1,
   threshold: 0.1 * (24 * 60) / 60, // 2.4: 期間内にエラーバージェットの10%消費
   comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
   metric: new cloudwatch.Metric({
      metricName: 'BurnRate',
      namespace: 'AWS/ApplicationSignals',
      statistic: cloudwatch.Stats.MAXIMUM,
      dimensionsMap: {
         SloName: availabilitySLO.name,
         BurnRateWindowMinutes: '60'
      },
      period: cdk.Duration.minutes(2)
   })
});

const compositeAlarm = new cloudwatch.CompositeAlarm(this, 'AvailabilityBurnRateAlarm_Composite', {
   compositeAlarmName: `SLO-BurnRate-${availabilitySLO.name}-CompositeAlarm`,
   actionsEnabled: true,
   alarmDescription: '短期、長期の複合バーンレートアラーム',
   alarmRule: cloudwatch.AlarmRule.allOf(burnRateAlarm_5min, burnRateAlarm_60min)
})
compositeAlarm.addAlarmAction(new actions.SnsAction(topic));
```

先ほどはSLO達成率を監視対象にしましたが、バーンレートは`BurnRate`メトリクス[^2]に送信されますので、これをチェックします。

[^2]: SLO名+Look-back window(`BurnRateWindowMinutes`)のディメンションから確認可能です。

アラーム閾値は以下で計算しました。

$$
\text{エラーバジェット消費率(\%)} \times \frac{\text{SLO期間(分)}}{\text{Look-back window(分)}}
$$

ここでは、60分間でエラーバジェットの10%を消費した時点で通知をしたいので、`0.1*(24*60)/60`で2.4が閾値になります。
これで短期、長期の各バーンレートのアラームを作成し、さらに両アラームのAND条件としてCompositeAlarmを作成すれば完成です。

## まとめ

今回はLambdaを対象にApplication Signalsを使ったモニタリングを試してみました。
ADOTが提供する自動計装のおかげで、アプリケーション側のソースコードには手を入れる必要がありませんし、標準化されたダッシュボードも自動作成してくれますので職人技も不要です！
今後のLambdaのモニタリングは、Application Signalsを使ったSLOベースのものに置き換えが進んでいくのかなと思います。

とはいえ、モニタリングで難しいのはアラート自体の定義です(いつも悩まされます)。
この辺りはある程度の决めで進めていって、定期的(開始当初は短期的なサイクルで)に実績ベースで見直していくのが良さそうですね。
