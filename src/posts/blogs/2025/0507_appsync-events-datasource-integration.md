---
title: AWS AppSync Events のデータソース統合の使い方を整理する
author: noboru-kudo
date: 2025-05-07
tags: [appsync, websocket, AWS]
image: true
---

昨年(2024年)に公開した以下の記事で、AWS AppSyncのEvent APIを紹介しました。

@[og](/blogs/2024/11/13/aws-appsync-events/)

AppSyncといえばGraphQLが有名ですが、WebSocketベースのEvent APIが導入されたことで、リアルタイム通信がさらに簡単になりました。
それから約半年が経過し、Event APIには機能追加が続いています。

代表的なアップデートは次のとおりです。

- [What's New with AWS - AWS AppSync releases CDK L2 constructs to simplify creating WebSocket APIs](https://aws.amazon.com/about-aws/whats-new/2025/02/aws-appsync-cdk-l2-simplify-websocket-apis/)
- [What's New with AWS - AppSync Events adds publishing over WebSocket for real-time pub/sub](https://aws.amazon.com/about-aws/whats-new/2025/03/appsync-events-publishing-websocket-real-time-pub-sub/)
 
さらに先月には、GraphQL APIと同様に Event APIでもLambda や DynamoDB、Bedrockなどと直接統合できるようになりました。

@[og](https://aws.amazon.com/about-aws/whats-new/2025/04/aws-appsync-events-data-source-integrations-channel-namespaces/)

[公式ドキュメント](https://docs.aws.amazon.com/appsync/latest/eventapi/supported-datasources.html)によると、現時点では以下のデータソースをサポートしています。

- Lambda
- DynamoDB
- RDS
- EventBridge
- OpenSearch Service
- HTTPエンドポイント
- Bedrock

ここでは、このうちLambdaとDynamoDBに焦点を当て、Event APIにおけるデータソース統合方法を整理します。

## 事前準備

まず、データソース統合を使わない最小構成でAppSync Eventsの環境を用意します。

最近、Event APIもAWS CDKのL2コンストラクトに対応しました。

- [AWS CDK Reference - AppSync - Events](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_appsync-readme.html#events)

今回はCloudFormationテンプレートではなく、CDKの方を使って環境を構築したいと思います。
CDKのスクリプトは以下のようにしました。

```typescript
import * as cdk from 'aws-cdk-lib';
import { CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import { AppSyncFieldLogLevel } from 'aws-cdk-lib/aws-appsync';
import * as logs from 'aws-cdk-lib/aws-logs';

export class AppSyncStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const apiKeyProvider: appsync.AppSyncAuthProvider = {
      authorizationType: appsync.AppSyncAuthorizationType.API_KEY
    };

    const api = new appsync.EventApi(this, 'EventApi', {
      apiName: 'AppSyncEventsSampleApi',
      authorizationConfig: {
        authProviders: [
          apiKeyProvider
        ],
        connectionAuthModeTypes: [
          appsync.AppSyncAuthorizationType.API_KEY
        ],
        defaultPublishAuthModeTypes: [
          appsync.AppSyncAuthorizationType.API_KEY
        ],
        defaultSubscribeAuthModeTypes: [
          appsync.AppSyncAuthorizationType.API_KEY
        ]
      },
      logConfig: {
        retention: logs.RetentionDays.ONE_DAY,
        fieldLogLevel: AppSyncFieldLogLevel.ALL
      }
    });
    // データソース統合なしのチャネル
    api.addChannelNamespace('sample');
  }
}
```

APIキー認証のみのシンプルな構成です。

これをデプロイするとAppSyncマネジメントコンソールは次のように表示されます。

![Simple - AppSync Event](https://i.gyazo.com/814416e446cf6db9c87a95d78133ca35.png)

コンソール付属のPub/Subエディターで動作を確認します。

**1. 接続(Subscribeセクション)**
![Simple - Connect](https://i.gyazo.com/09bc3b2d8170f4504a553dc5afb0b630.png)

**2. チャネル購読(Subscribeセクション)**
![Simple - Subscribe](https://i.gyazo.com/d0e10e3e0b61dc988ca60dc5e1864ffc.png)

**3. イベント発行(Publishセクション)**
HTTPとWebSocketが選択できますが、どちらでも構いません。
成功すると右側に結果が表示されます。

![Simple - Publish](https://i.gyazo.com/1cc59a9377eb5fcfeb57b14cfac7b3ff.png)

**4. イベント配信結果確認(Subscribeセクション)**
クライアント側で先ほど発行したイベントが確認できれば成功です。

![Simple - Subscribe Result](https://i.gyazo.com/70e911a1e6057fde20e7bf1b3a5cb93b.png)

発行したイベントがチャネルを購読しているクライアントにそのまま配信されることを確認できました。

以降では、このAppSync Event APIにデータソース統合を追加していきます。

## DynamoDBと統合する(カスタムハンドラー)

DynamoDBをデータソースとして利用するには、Event API 専用のイベントハンドラーを用意します。
ハンドラーはAPPSYNC_JSランタイム(独自のJavaScript実行環境)上で動作します。

ここでは、指定した名前空間のチャネルに発行されたイベントをDynamoDBに保存し、その書き込み結果を加工してクライアントへ配信するハンドラーを実装します。

![](https://i.gyazo.com/1ba7c8238fb15957fe3eed89fe8f44f5.png)

### リソース構成(CDK)

まず、DynamoDBテーブルを作成し、Event APIのデータソースとして登録します。

```typescript
// (前略)

// データソース統合対象のDynamoDBテーブル
const table = new dynamodb.Table(this, 'EventTable', {
  tableName: 'AppSyncEventsTable',
  partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING }
});
// AppSync Eventsにデータソースとして登録
const dynamodbDataSource = api.addDynamoDbDataSource('EventDataSource', table);
```

次に、DynamoDB を利用する名前空間(sample-dynamodb)を追加し、先ほどのデータソースとカスタムハンドラーを紐付けます。

```typescript
// DynamoDB用の名前空間
api.addChannelNamespace('sample-dynamodb', {
  // DynamoDBをデータソースとして設定
  publishHandlerConfig: {
    dataSource: dynamodbDataSource
  },
  // カスタムハンドラー
  code: appsync.Code.fromInline(`
import * as ddb from '@aws-appsync/utils/dynamodb'

// イベント発行・配信時に実行されるフック
export const onPublish = {
  // 発行
  request(ctx) {
    const channel = ctx.info.channel.path
    return ddb.batchPut({
      tables: {
        '${table.tableName}': ctx.events.map(({ id, payload }) => ({ channel, id, ...payload })),
      }
    })
  },
  // 配信
  response(ctx) {
    // ctx.resultにrequestの実行結果が格納されている
    return ctx.result.data['${table.tableName}'].map(({ id, ...payload }) => ({ id, payload: 'DynamoDB:' + payload.message }))
  }
}
// チャネル購読時に実行されるフック
export const onSubscribe = (ctx) => {
  console.log('Joined:' + ctx.info.channel.path)
}`)
});
```

名前空間に登録するAppSync Eventsのイベントハンドラーには、次の2種類のフックが用意されています。

| フック         | タイミング               | 主な用途               |
|-------------|---------------------|--------------------|
| onPublish   | イベント発行時(クライアントへの配信) | データソース操作、イベント検証/変換 |
| onSubscribe | クライアントがチャネル購読した時    | 認可、ロギング、初期化        |

データソース統合を有効する場合は、各フックは以下の関数で構成するオブジェクトである必要があります。

- request: データソース呼び出し用の入力検証や権限チェック、変換処理をする。
- response: データソース実行結果を受け取り、エラー処理や整形処理をする。

上記コードでは publishHandlerConfigにDynamoDBデータソースを指定しているため、onPublishフックにrequestとresponseを実装しています。
request関数では、AppSyncのランタイム(APPSYNC_JS)が提供するDynamoDB向けの[Built-inモジュール](https://docs.aws.amazon.com/appsync/latest/eventapi/built-in-modules.html#DDB-built-in-module)を使って、テーブルに登録しています。
response関数の方では、その書き込み結果にプレフィックス(`DynamoDB:`)を追加して各クライアントに配信しています。

:::info
今回はシンプルさを優先して、AWS CDKの中でインラインコードとしてイベントハンドラーを作成していますが、実運用でこの方法を取ることはないかと思います。
イベントハンドラーの実装が複雑になってくると、TypeScriptによる型サポートやLintが欲しくなってきます(APPSYNC_JSは結構制限の多いJavaScriptランタイム環境です)。

AppSyncでは型定義/各種ユーティリティやeslintルールをNPMパッケージとして提供しています。
以下公式ドキュメントで、具体的な利用手順やesbuildによるバンドル方法を説明していますので、ご参考ください。

- [AppSync Events Doc - Configuring utilities for the APPSYNC_JS runtime](https://docs.aws.amazon.com/appsync/latest/eventapi/configure-utilities.html)
- [AppSync Events Doc - Bundling, TypeScript, and source maps for the APPSYNC_JS runtime](https://docs.aws.amazon.com/appsync/latest/eventapi/additional-utilities.html)
:::

### 動作確認

続いて、DynamoDB 連携が想定どおり動いているかをチェックします。

スタックをデプロイしたら、まずAppSyncマネジメントコンソールを開いて構成を確認します。

**データソース**
![DynamoDB - Datasource](https://i.gyazo.com/b9d9a7ef859b5822f4849e5519c439bd.png)

**名前空間**
![DynamoDB - Namespace](https://i.gyazo.com/7622f1df69ada28b1374daeb42e86075.png)

DynamoDBテーブルがデータソースとして追加され、sample-dynamodb名前空間に紐付いているのが確認できます。
最初に作成したsample名前空間はハンドラーがNone(未指定)ですが、sample-dynamodbにはAppSyncJSが設定されています。詳細を開くと先ほど作成したイベントハンドラのソースコードの中身が確認できます。

次に、Pub/Subエディターを使って実際のフローを検証します(接続は割愛)。

**1. チャネル購読(Subscribeセクション)**
今回は、DynamoDB用に作成した名前空間(sample-dynamodb)を指定して購読します。
![DynamoDB - Subscribe](https://i.gyazo.com/77842383d684e64236d81052b0a92b7c.png)

**2. イベント発行(Publishセクション)**
同名前空間のチャネルに対してイベントを発行します。
![DynamoDB - Publish](https://i.gyazo.com/757e04122b73effd2c1f8daccfc82591.png)

**3. イベント配信結果確認(Subscribeセクション)**
イベントハンドラのresponse関数で記述したとおり、プレフィックス(`DynamoDB:`)付きでイベントが配信されています。
![DynamoDB - Subscribe Result](https://i.gyazo.com/f0e6c76a7221f144cb6f2ba3f94acdfc.png)

最後にDynamoDBテーブルを開き、イベントがレコードとして保存されていることを確認します。

![DynamoDB - Table Editor](https://i.gyazo.com/bbc2ad66077442dd395f0bb36433f699.png)

これで、DynamoDBとのデータソース統合が正常に機能していることを確認できました。

## Lambdaと直接統合する

次はLambdaをデータソースとして利用します。
DynamoDBの場合と異なり、Lambda関数そのものをAppSyncのイベントハンドラーとして呼び出す直接統合が可能です。
AppSync独自のJavaScriptランタイム環境では様々な制約[^1]がありますが、NodeベースのLambda関数を利用することで、これらの制限なく自由度の高いコードを実装できます。

[^1]: <https://docs.aws.amazon.com/appsync/latest/eventapi/runtime-supported-features.html>

![](https://i.gyazo.com/5a8613ec2bc31812f3f5f69a8f3c6ab8.png)

ここでは、この直接統合を使ってみます。

### リソース構成(CDK)

以下のコードをCDKのスクリプトに追加します。

```typescript
// データソース統合対象のLambda関数
const fn = new lambda.Function(this, 'EventHandler', {
  functionName: 'SampleAppSyncDataSourceHandler',
  runtime: lambda.Runtime.NODEJS_22_X,
  handler: 'index.handler',
  code: lambda.Code.fromInline(`
exports.handler = async (event) => {
  if (event.info.operation === 'PUBLISH') {
    // onPublishイベント
    return {
      events: event.events.map(e => ({
        id: e.id,
        payload: 'Lambda:' + e.payload.message // ここに配信内容を設定
      }))
      // エラー発生時は以下
      // error: 'error message'
    };
  } else {
    // onSubscribeイベント
    return null; // 購読OK
  }
}`)
});
// AppSync Eventsにデータソースとして登録
const lambdaDataSource = api.addLambdaDataSource('EventHandler', fn);
// Lambda用の名前空間
api.addChannelNamespace('sample-lambda', {
  publishHandlerConfig: {
    direct: true, // 直接統合
    dataSource: lambdaDataSource
  },
  subscribeHandlerConfig: {
    direct: true, // 直接統合
    dataSource: lambdaDataSource
  }
});
```
まず、AppSync Eventsのイベントハンドラとして機能するLambda関数を定義します。
この直接統合方式では、Lambda関数自体がイベントハンドラの役割を担い、AppSync Eventsが規定する形式でレスポンスを返す必要があります。

[公式ドキュメント](https://docs.aws.amazon.com/appsync/latest/eventapi/writing-event-handlers.html#direct-lambda-integration)に詳細が記載されていますが、ここではonPublishとonSubscribe両方のイベントに対応するLambda関数を実装しています。
直接統合の特徴は、AppSyncのカスタムハンドラーとは異なり、request/response関数を個別に定義する必要がなく、配信内容(events)を直接戻り値として返すだけで良い点です。
この例でも、前述のDynamoDB統合と同様に、メッセージにプレフィックス(`Lambda:`)を付加してイベントを配信しています。

Lambda関数の作成後、データソース統合(addLambdaDataSource)と名前空間(sample-lambda)を設定します。
DynamoDB統合の例とは異なり、名前空間にはAppSyncのカスタムハンドラーを設定せず、代わりにpublishHandlerConfig/subscribeHandlerConfigのdirectパラメータを`true`に設定して直接統合を有効化しています。


:::info
今回使用しませんでしたが、LambdaでAppSync Eventsのハンドラを実装する場合は、AWSが提供するPowertoolを利用すると直感的な実装ができます。

- [Powertools for AWS Lambda (TypeScript) - AppSync Events](https://docs.powertools.aws.dev/lambda/typescript/latest/features/event-handler/appsync-events/)
:::
### 動作確認

スタックをデプロイすると、AppSyncマネジメントコンソールには次のように表示されます。

**データソース**
![Lambda - Datasource](https://i.gyazo.com/182c12f2705c04bddcee6532b9646f7e.png)

**名前空間**
![Lambda - Namespace](https://i.gyazo.com/065e114f22b6c716c6da8401da1fd915.png)

Lambda関数がデータソースとして登録され、sample-lambda名前空間に紐付けられていることが確認できます。
また、イベントハンドラ設定がDirectになっており、Lambda関数との直接統合が有効化されています。

では、ここでもPub/Subエディターを使って動作を検証します。

**1. チャネル購読(Subscribeセクション)**
Lambda用に作成した名前空間(sample-lambda)を指定してチャネル購読します。
![Lambda - Subscribe](https://i.gyazo.com/923d9f13e9be5bd1803ddda8bae14340.png)

**2. イベント発行(Publishセクション)**
同名前空間のチャネルに対してイベントを発行します。
![Lambda - Publish](https://i.gyazo.com/448cad429e26fb411fe9a7546edcd2a2.png)

**3. イベント配信結果確認(Subscribeセクション)**
Lambda関数で設定したプレフィックス(`Lambda:`)付きでイベントが配信されていることが確認できます。

![Lambda - Subscribe Result](https://i.gyazo.com/e9e7b776ab46e7da632b95901ea190af.png)

これでLambdaとの直接統合でも、期待どおりイベントが処理・配信されることを確認できました。

## まとめ

本記事では、AppSync Eventsに追加されたデータソース統合機能について、DynamoDBとLambdaを例に基本的な使い方を確認しました。
この機能追加により、AWSの各種サービスや外部リソースとの連携が非常に簡単になり、AppSync Eventsの実用性が大幅に向上しました。
使い方も直感的で、CDKを使った環境構築も比較的容易です。

今後は、RDSやBedrock等の他のデータソース統合も試しながら、リアルタイムアプリケーションの新たな可能性を探っていきたいと思いました。

