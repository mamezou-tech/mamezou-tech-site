---
title: AWS Lambda向け高速JavaScriptランタイム LLRT(ベータ版) を使う
author: noboru-kudo
date: 2024-02-21
tags: [lambda, AWS, サーバーレス]
image: true
---

AWS Lambdaのようなオンデマンドなサービスでは、コールドスタートによる遅延が問題になることがあります。
もちろん使用するランタイム環境によって大小ありますが、Node.jsのような比較的軽量なランタイム環境でもコールドスタートによる遅延は発生します。

最近以下の記事を読みました。

[Publickey - AWS、高速起動にこだわった軽量なJavaScriptランタイム「LLRT」（Low Latency Runtime）をオープンソースで公開。AWS Lambdaでの利用にフォーカス](https://www.publickey1.jp/blog/24/awsjavascriptllrtlow_latency_runtimeaws_lambda.html)

AWSがLLRT(Low Latency Runtime)という新しいJavaScriptランタイムを実験的に開発しているようです。公式レポジトリは以下です。

- [GitHub awslabs/llrt](https://github.com/awslabs/llrt)

公式レポジトリではLLRTを以下のように紹介しています。

> LLRT (Low Latency Runtime) is a lightweight JavaScript runtime designed to address the growing demand for fast and efficient Serverless applications. LLRT offers up to over 10x faster startup and up to 2x overall lower cost compared to other JavaScript runtimes running on AWS Lambda
> 
> It's built in Rust, utilizing QuickJS as JavaScript engine, ensuring efficient memory usage and swift startup.
> 
> (DeepL訳)
> LLRT（Low Latency Runtime）は、高速で効率的なサーバーレスアプリケーションの需要の高まりに対応するために設計された軽量のJavaScriptランタイムです。LLRTは、AWS Lambda上で動作する他のJavaScriptランタイムと比較して、最大10倍以上の高速起動と最大2倍の低コスト化を実現します。
>
> JavaScriptエンジンとしてQuickJSを利用し、効率的なメモリ使用と迅速な起動を保証するRustで構築されています。

今までLambdaでJavaScriptといえばNode.jsが定番でしたが、サーバーレスプラットフォームでの利用に特化したLLRTが新たな選択肢として加わる日が近いもしれません。
これは...と思いましたので、早速試してみました。

## Lambda関数を用意する

まずは対象のLambda関数を用意します。
ここではTypeScriptで以下のハンドラを用意しました。

```typescript:lambda/index.ts
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const dynamodbClient = new DynamoDBClient();
const documentClient = DynamoDBDocumentClient.from(dynamodbClient);

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const body = JSON.parse(event.body || '{}');
  const id = Math.random().toString(36).substring(2);
  await documentClient.send(new PutCommand({
    TableName: process.env.EXAMPLE_TABLE_NAME,
    Item: { id, name: body.name }
  }));
  const resp = await documentClient.send(new GetCommand({
    TableName: process.env.EXAMPLE_TABLE_NAME,
    Key: { id }
  }));

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(resp.Item)
  };
};
```

イベントハンドラでは、DynamoDBのテーブルへのPUT/GETオペレーションを実行しています。

TypeScriptのビルドには[esbuild](https://esbuild.github.io/)を使います。
以下のスクリプトを用意しました。

```javascript:lambda/build.mjs
import esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['index.ts'],
  logLevel: 'info',
  platform: 'node',
  target: 'es2020',
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  bundle: true,
  minify: true,
  outdir: 'build',
  format: 'esm',
  outExtension: {
    '.js': '.mjs'
  },
  external: ['@aws-sdk/*']
});
```
esbuildでJavaScriptへのトランスパイルとバンドル、ミニファイをしています。

なお、LLRTには主要なAWS SDK v3[^1]が含まれていますので、それらはバンドルに含める必要はありません。`external`に指定して除外しています。

[^1]: LLRTにバンドルされているAWS SDKは公式レポジトリの[README](https://github.com/awslabs/llrt?tab=readme-ov-file#using-aws-sdk-v3-with-llrt)に記載があります。

## LLRTランタイムでLambdaをデプロイする

ここではAWS CDKを使ってデプロイします。まずCDKのappプロジェクトを作成します。

```shell
mkdir cdk && cd cdk
cdk init app -l typescript
```

デプロイスクリプトは以下の通りです。

```typescript:cdk/libs/cdk-stack.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Effect } from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Architecture, FunctionUrlAuthType } from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { execSync } from 'child_process';

export class LlrtExampleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ビルド(トランスパイル・バンドル)
    execSync('node build.mjs', {
      cwd: '../lambda'
    });

    const tableName = `${this.stackName}-LLRTTest`;
    const role = new iam.Role(this, 'LlrtExampleLambdaRole', {
      roleName: `${this.stackName}-llrt-example-lambda-role`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
      inlinePolicies: {
        DynamoDBTable: new iam.PolicyDocument({
          statements: [new iam.PolicyStatement({
            effect: Effect.ALLOW,
            resources: [
              `arn:aws:dynamodb:*:${this.account}:table/${tableName}`
            ],
            actions: ['dynamodb:GetItem', 'dynamodb:PutItem']
          })]
        })
      }
    });

    // LLRTのbootstrapバイナリを含むLambdaレイヤー
    const llrtLayer = new lambda.LayerVersion(this, 'LlrtArmLayer', {
      // 以下よりダウンロードして配置
      // https://github.com/awslabs/llrt/releases
      code: lambda.Code.fromAsset('./llrt-lambda-arm64.zip'),
      compatibleRuntimes: [lambda.Runtime.PROVIDED_AL2023],
      compatibleArchitectures: [lambda.Architecture.ARM_64]
    });
    const llrtFunction = new lambda.Function(this, 'LlrtFunction', {
      role,
      functionName: `${this.stackName}-llrt`,
      code: lambda.Code.fromAsset('../lambda/build'),
      handler: 'index.handler',
      memorySize: 128,
      runtime: lambda.Runtime.PROVIDED_AL2023, // カスタムランタイムを指定
      architecture: Architecture.ARM_64,
      layers: [llrtLayer],
      environment: {
        EXAMPLE_TABLE_NAME: tableName
      }
    });
    const llrtFuncUrl = new lambda.FunctionUrl(this, 'LlrtFunctionURL', {
      function: llrtFunction,
      authType: FunctionUrlAuthType.NONE
    });

    new dynamodb.Table(this, 'SampleTable', {
      tableName: tableName,
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING
      }
    });
    new cdk.CfnOutput(this, 'LlrtURL', {
      value: llrtFuncUrl.url
    });
  }
}
```

上記は公式レポジトリの[example](https://github.com/awslabs/llrt/tree/main/example)を参考にしながら作りました。

LLRTはまだベータ版でLambdaの標準ランタイムとして提供されている訳ではありません。
[カスタムランタイム](https://docs.aws.amazon.com/lambda/latest/dg/runtimes-custom.html)として別途用意する必要があります。

LLRTはこのカスタムランタイム向けのエントリーポイント(bootstrap)を提供しています。

- [GitHub awslabs/llrt - Releases](https://github.com/awslabs/llrt/releases)

ここでは、ARM64向けのllrt-lambda-arm64.zip(現時点で最新の`v0.1.7-beta`)をダウンロードして、CDKプロジェクト直下に配置しました[^2]。
そしてこのZIPファイル(エントリーポイント)をLambdaレイヤー(llrtLayer)として構成しています。

[^2]: 試しにZIPファイルを解凍するとカスタムランタイムに必要なbootstrapバイナリファイルが確認できます。

デプロイ対象のLambda関数では、ランタイム(runtime)はいつものNode.jsでなくAmazon Linux 2023(`provided.al2023`)、Lambdaレイヤー(layers)には先ほどのレイヤー(llrtLayer)を指定します。

あとはデプロイするだけです。

```shell
npx cdk deploy
```

Lambda関数はFunction URLを有効にしています。
そのURLを取得してcurlでコールドスタート実行してみます。

```shell
STACK_NAME=your-stack-name
LLRT_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME \
  --query "Stacks[0].Outputs[?OutputKey=='LlrtURL'].OutputValue" --output text)

curl -H 'Content-Type: application/json' $LLRT_URL -d '{"name": "mamezou"}'
> {"id":"h1p0wi20p","name":"mamezou"}
```

問題なさそうです。CloudWatchでログを確認してみます。

![cloudwatch](https://i.gyazo.com/3c0c6b1507222967ccdbe448bbecb6fe.png)

初期化時間(Init)は58ms、全体でも106ms程と非常に高速です[^3]。

[^3]: 初めて知ったのですが、カスタムランタイムの場合はDurationにInitの時間は含まれないようです。Billed Durationは合計時間になっているようですが。

## Node.jsランタイムと実行時間を比較する

Node.jsランタイムと比較してどれくらい早くなったのかも見てみます。
同じLambda関数を、Node.js(v20)ランタイムでもデプロイして比較しました。

以下は、それぞれのランタイムで5回コールドスタートした場合のREPORTログの抜粋です。

- Node.js(v20)
```
Duration: 1109.67 ms	Billed Duration: 1110 ms	Memory Size: 128 MB	Max Memory Used: 92 MB	Init Duration: 640.88 ms
Duration: 1057.59 ms	Billed Duration: 1058 ms	Memory Size: 128 MB	Max Memory Used: 94 MB	Init Duration: 640.50 ms
Duration: 1072.59 ms	Billed Duration: 1073 ms	Memory Size: 128 MB	Max Memory Used: 94 MB	Init Duration: 666.84 ms
Duration: 1117.04 ms	Billed Duration: 1118 ms	Memory Size: 128 MB	Max Memory Used: 94 MB	Init Duration: 668.36 ms
Duration: 1053.59 ms	Billed Duration: 1054 ms	Memory Size: 128 MB	Max Memory Used: 93 MB	Init Duration: 609.24 ms	
```

- LLRT
```
Duration: 58.47 ms	Billed Duration: 105 ms	Memory Size: 128 MB	Max Memory Used: 21 MB	Init Duration: 46.37 ms
Duration: 25.86 ms	Billed Duration: 65 ms	Memory Size: 128 MB	Max Memory Used: 21 MB	Init Duration: 38.24 ms
Duration: 51.15 ms	Billed Duration: 100 ms	Memory Size: 128 MB	Max Memory Used: 21 MB	Init Duration: 48.06 ms
Duration: 51.15 ms	Billed Duration: 100 ms	Memory Size: 128 MB	Max Memory Used: 21 MB	Init Duration: 48.06 ms
Duration: 31.13 ms	Billed Duration: 74 ms	Memory Size: 128 MB	Max Memory Used: 21 MB	Init Duration: 42.38 ms
```

結果は一目瞭然です。このLambda関数ではLLRTランタイムの方が10倍以上速いです。
[記事](https://www.publickey1.jp/blog/24/awsjavascriptllrtlow_latency_runtimeaws_lambda.html)によると、JITコンパイラを搭載していないことが高速化の主な要因とのことですが、こんなに差が出るものなんですね。

ウォームスタートの場合はどうでしょうか。こちらもそれぞれ5回実行してみました。

- Node.js(v20)
```
Duration: 117.48 ms	Billed Duration: 118 ms	Memory Size: 128 MB	Max Memory Used: 93 MB
Duration: 89.97 ms Billed Duration: 90 ms Memory Size: 128 MB Max Memory Used: 93 MB
Duration: 138.48 ms Billed Duration: 139 ms Memory Size: 128 MB Max Memory Used: 93 MB
Duration: 129.71 ms Billed Duration: 130 ms Memory Size: 128 MB Max Memory Used: 93 MB
Duration: 142.57 ms Billed Duration: 143 ms Memory Size: 128 MB Max Memory Used: 93 MB
```

- LLRT
```
Duration: 42.87 ms Billed Duration: 43 ms Memory Size: 128 MB Max Memory Used: 21 MB
Duration: 33.24 ms Billed Duration: 34 ms Memory Size: 128 MB Max Memory Used: 21 MB
Duration: 38.43 ms Billed Duration: 39 ms Memory Size: 128 MB Max Memory Used: 21 MB
Duration: 34.10 ms Billed Duration: 35 ms Memory Size: 128 MB Max Memory Used: 21 MB
Duration: 34.37 ms Billed Duration: 35 ms Memory Size: 128 MB Max Memory Used: 21 MB
```

このLambda関数の場合は、ウォームスタートでもLLRTの方が2倍以上速いという結果でした。

## まとめ

簡単ではありますが、LLRTを試してみた結果でした。
その効果は想像以上でした。まだ実験的段階で将来的なところは未定ですが、Lambdaの標準ランタイムとして使える日が待ち望まれますね。

もちろん全てのケースでLLRTが適している訳ではありません。
[公式レポジトリ](https://github.com/awslabs/llrt?tab=readme-ov-file#limitations)では以下のように言及されています。

> There are many cases where LLRT shows notable performance drawbacks compared with JIT-powered runtimes, such as large data processing, Monte Carlo simulations or performing tasks with hundreds of thousands or millions of iterations. LLRT is most effective when applied to smaller Serverless functions dedicated to tasks such as data transformation, real time processing, AWS service integrations, authorization, validation etc.
> (DeepL訳)
> 大規模なデータ処理、モンテカルロ・シミュレーション、数十万または数百万の反復を伴うタスクの実行など、LLRTがJITベースのランタイムと比較して顕著なパフォーマンス上の欠点を示すケースは多い。LLRTは、データ変換、リアルタイム処理、AWSサービス統合、認可、検証などのタスクに特化した小規模なServerless関数に適用する場合に最も効果的です。

JITコンパイラがない訳ですから、当然デメリットも出てきます。
適材適所でNode.js含めた他のランタイムと使い分けていくのが鉄則ですが、Lambdaのような短時間実行＆従量課金のサービスであればLLRTは有力な選択肢になっていくのかなと思いました。