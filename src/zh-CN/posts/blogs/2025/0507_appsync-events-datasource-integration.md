---
title: 整理 AWS AppSync Events 数据源集成的使用方法
author: noboru-kudo
date: 2025-05-07T00:00:00.000Z
tags:
  - appsync
  - websocket
  - AWS
image: true
translate: true

---

去年（2024 年）发布的以下文章中介绍了 AWS AppSync 的 Event API。

@[og](/blogs/2024/11/13/aws-appsync-events/)

谈到 AppSync，GraphQL 是最著名的功能，但随着基于 WebSocket 的 Event API 的引入，实时通信变得更加简单。自那时起大约半年过去了，Event API 持续新增功能。

主要更新如下：

- [What's New with AWS - AWS AppSync releases CDK L2 constructs to simplify creating WebSocket APIs](https://aws.amazon.com/about-aws/whats-new/2025/02/aws-appsync-cdk-l2-simplify-websocket-apis/)
- [What's New with AWS - AppSync Events adds publishing over WebSocket for real-time pub/sub](https://aws.amazon.com/about-aws/whats-new/2025/03/appsync-events-publishing-websocket-real-time-pub-sub/)

而在上个月，Event API 也可像 GraphQL API 那样直接与 Lambda、DynamoDB、Bedrock 等集成了。

@[og](https://aws.amazon.com/about-aws/whats-new/2025/04/aws-appsync-events-data-source-integrations-channel-namespaces/)

[官方文档](https://docs.aws.amazon.com/appsync/latest/eventapi/supported-datasources.html)指出，目前支持以下数据源：

- Lambda
- DynamoDB
- RDS
- EventBridge
- OpenSearch Service
- HTTP 端点
- Bedrock

在这里，聚焦于其中的 Lambda 和 DynamoDB，整理 Event API 中的数据源集成方法。

## 事前准备

首先，准备一个不使用数据源集成的最小化 AppSync Events 环境。

最近，Event API 也支持 AWS CDK 的 L2 构造。

- [AWS CDK Reference - AppSync - Events](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_appsync-readme.html#events)

这次我想使用 CDK 而不是 CloudFormation 模板来构建环境。CDK 脚本如下：

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
    // 无数据源集成的通道
    api.addChannelNamespace('sample');
  }
}
```

这是一个仅使用 API 密钥认证的简单构成。

部署后，AppSync 管理控制台将显示如下：

![Simple - AppSync Event](https://i.gyazo.com/814416e446cf6db9c87a95d78133ca35.png)

在控制台附带的 Pub/Sub 编辑器中确认操作。

**1. 连接（Subscribe 部分）**  
![Simple - Connect](https://i.gyazo.com/09bc3b2d8170f4504a553dc5afb0b630.png)

**2. 订阅频道（Subscribe 部分）**  
![Simple - Subscribe](https://i.gyazo.com/d0e10e3e0b61dc988ca60dc5e1864ffc.png)

**3. 发布事件（Publish 部分）**  
可以选择 HTTP 或 WebSocket，二者任意。成功后右侧会显示结果。  
![Simple - Publish](https://i.gyazo.com/1cc59a9377eb5fcfeb57b14cfac7b3ff.png)

**4. 验证事件分发结果（Subscribe 部分）**  
如果在客户端能看到之前发布的事件，则成功。  
![Simple - Subscribe Result](https://i.gyazo.com/70e911a1e6057fde20e7bf1b3a5cb93b.png)

已确认发布的事件会原样分发到订阅该频道的客户端。

接下来，将在此 AppSync Event API 上添加数据源集成。

## 与 DynamoDB 集成（自定义处理程序）

首先，创建 DynamoDB 表，并将其注册为 Event API 的数据源。

```typescript
// (省略前文)

// 要进行数据源集成的 DynamoDB 表
const table = new dynamodb.Table(this, 'EventTable', {
  tableName: 'AppSyncEventsTable',
  partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING }
});
// 注册为 AppSync Events 的数据源
const dynamodbDataSource = api.addDynamoDbDataSource('EventDataSource', table);
```

接着，添加使用 DynamoDB 的命名空间（sample-dynamodb），并将之前的数据源与自定义处理程序关联。

```typescript
// 用于 DynamoDB 的命名空间
api.addChannelNamespace('sample-dynamodb', {
  // 将 DynamoDB 设置为数据源
  publishHandlerConfig: {
    dataSource: dynamodbDataSource
  },
  // 自定义处理程序
  code: appsync.Code.fromInline(`
import * as ddb from '@aws-appsync/utils/dynamodb'

// 在事件发布及分发时执行的钩子
export const onPublish = {
  // 发布
  request(ctx) {
    const channel = ctx.info.channel.path
    return ddb.batchPut({
      tables: {
        '${table.tableName}': ctx.events.map(({ id, payload }) => ({ channel, id, ...payload })),
      }
    })
  },
  // 分发
  response(ctx) {
    // ctx.result 中存放了 request 的执行结果
    return ctx.result.data['${table.tableName}'].map(({ id, ...payload }) => ({ id, payload: 'DynamoDB:' + payload.message }))
  }
}
// 在频道订阅时执行的钩子
export const onSubscribe = (ctx) => {
  console.log('Joined:' + ctx.info.channel.path)
}`)
});
```

| 钩子         | 时机               | 主要用途               |
|-------------|---------------------|--------------------|
| onPublish   | 事件发布时（向客户端分发） | 数据源操作、事件验证/转换 |
| onSubscribe | 客户端订阅频道时    | 授权、日志记录、初始化        |

若要启用数据源集成，各钩子需由以下函数构成的对象：

- request: 对数据源调用进行输入校验、权限检查和转换处理。  
- response: 接收数据源执行结果，进行错误处理和格式化。  

在上述代码中，由于在 publishHandlerConfig 中指定了 DynamoDB 数据源，因此在 onPublish 钩子中实现了 request 和 response。  
在 request 函数中，使用 AppSync 运行时（APPSYNC_JS）提供的 DynamoDB 内置模块将数据写入表。  
在 response 函数中，向写入结果添加前缀(`DynamoDB:`)，并分发给各客户端。  

:::info
此次为了简洁起见，在 AWS CDK 中以内联代码的方式创建了事件处理程序，但在实际生产环境中可能不会采用这种方法。随着事件处理程序实现变复杂，会希望有 TypeScript 的类型支持和 Lint（APPSYNC_JS 是一个相当受限的 JavaScript 运行时环境）。

AppSync 提供了类型定义、各类实用工具以及 eslint 规则作为 NPM 包。以下官方文档说明了具体的使用步骤以及使用 esbuild 打包的方法，供参考。

- [AppSync Events Doc - Configuring utilities for the APPSYNC_JS runtime](https://docs.aws.amazon.com/appsync/latest/eventapi/configure-utilities.html)
- [AppSync Events Doc - Bundling, TypeScript, and source maps for the APPSYNC_JS runtime](https://docs.aws.amazon.com/appsync/latest/eventapi/additional-utilities.html)
:::

### 操作验证

接下来，检查 DynamoDB 集成是否按预期运行。

部署堆栈后，首先打开 AppSync 管理控制台确认配置。

**数据源**  
![DynamoDB - Datasource](https://i.gyazo.com/b9d9a7ef859b5822f4849e5519c439bd.png)

**命名空间**  
![DynamoDB - Namespace](https://i.gyazo.com/7622f1df69ada28b1374daeb42e86075.png)

可确认 DynamoDB 表已作为数据源添加，并与 sample-dynamodb 命名空间关联。最初创建的 sample 命名空间处理程序为 None（未指定），而 sample-dynamodb 设置了 AppSyncJS。展开详情可以查看之前创建的事件处理程序的源代码内容。

接着，使用 Pub/Sub 编辑器验证实际流程（连接步骤省略）。

**1. 订阅频道（Subscribe 部分）**  
这次指定为 DynamoDB 创建的命名空间（sample-dynamodb）进行订阅。  
![DynamoDB - Subscribe](https://i.gyazo.com/77842383d684e64236d81052b0a92b7c.png)

**2. 发布事件（Publish 部分）**  
向同一命名空间的频道发布事件。  
![DynamoDB - Publish](https://i.gyazo.com/757e04122b73effd2c1f8daccfc82591.png)

**3. 验证事件分发结果（Subscribe 部分）**  
如事件处理程序的 response 函数所述，带有前缀(`DynamoDB:`)的事件已分发。  
![DynamoDB - Subscribe Result](https://i.gyazo.com/f0e6c76a7221f144cb6f2ba3f94acdfc.png)

最后打开 DynamoDB 表，确认事件已保存为记录。  
![DynamoDB - Table Editor](https://i.gyazo.com/bbc2ad66077442dd395f0bb36433f699.png)

至此，可确认与 DynamoDB 的数据源集成已正常运行。

## 与 Lambda 直接集成

接下来使用 Lambda 作为数据源。与 DynamoDB 不同，可直接集成调用 Lambda 函数本身作为 AppSync 的事件处理程序。  
AppSync 独有的 JavaScript 运行时环境存在各种限制[^1]，但利用基于 Node 的 Lambda 函数，可不受这些限制，实现更高自由度的代码。

[^1]: <https://docs.aws.amazon.com/appsync/latest/eventapi/runtime-supported-features.html>

这里演示如何使用该直接集成。

### 资源构成（CDK）

将以下代码添加到 CDK 脚本中。

```typescript
// 要进行数据源集成的 Lambda 函数
const fn = new lambda.Function(this, 'EventHandler', {
  functionName: 'SampleAppSyncDataSourceHandler',
  runtime: lambda.Runtime.NODEJS_22_X,
  handler: 'index.handler',
  code: lambda.Code.fromInline(`
exports.handler = async (event) => {
  if (event.info.operation === 'PUBLISH') {
    // onPublish 事件
    return {
      events: event.events.map(e => ({
        id: e.id,
        payload: 'Lambda:' + e.payload.message // 在此设置分发内容
      }))
      // 错误发生时可返回以下
      // error: 'error message'
    };
  } else {
    // onSubscribe 事件
    return null; // 订阅 OK
  }
}`)
});
// 注册为 AppSync Events 的数据源
const lambdaDataSource = api.addLambdaDataSource('EventHandler', fn);
// 用于 Lambda 的命名空间
api.addChannelNamespace('sample-lambda', {
  publishHandlerConfig: {
    direct: true, // 直接集成
    dataSource: lambdaDataSource
  },
  subscribeHandlerConfig: {
    direct: true, // 直接集成
    dataSource: lambdaDataSource
  }
});
```

首先，定义一个作为 AppSync Events 事件处理程序的 Lambda 函数。  
在此直接集成方式中，Lambda 函数本身充当事件处理程序，并需以 AppSync Events 规定的格式返回响应。  

[官方文档](https://docs.aws.amazon.com/appsync/latest/eventapi/writing-event-handlers.html#direct-lambda-integration)中有详细说明，这里实现了同时支持 onPublish 和 onSubscribe 两个事件的 Lambda 函数。  
直接集成的特点是不像 AppSync 自定义处理程序那样需要分别定义 request/response 函数，仅需将分发内容（events）直接作为返回值即可。  
在此示例中，同样在消息前添加前缀(`Lambda:`)来分发事件。

创建 Lambda 函数后，设置数据源集成（addLambdaDataSource）和命名空间（sample-lambda）。与 DynamoDB 集成示例不同，此处在命名空间中不设置 AppSync 自定义处理程序，而是将 publishHandlerConfig/subscribeHandlerConfig 的 direct 参数设为 `true` 来启用直接集成。

:::info
虽然此次未使用，但如果在 Lambda 中实现 AppSync Events 处理程序，可以使用 AWS 提供的 Powertool 进行更直观的实现。

- [Powertools for AWS Lambda (TypeScript) - AppSync Events](https://docs.powertools.aws.dev/lambda/typescript/latest/features/event-handler/appsync-events/)
:::

### 操作验证

部署堆栈后，AppSync 管理控制台将显示如下：

**数据源**  
![Lambda - Datasource](https://i.gyazo.com/182c12f2705c04bddcee6532b9646f7e.png)

**命名空间**  
![Lambda - Namespace](https://i.gyazo.com/065e114f22b6c716c6da8401da1fd915.png)

可确认 Lambda 函数已注册为数据源，并与 sample-lambda 命名空间关联。同时，事件处理程序设置为 Direct，已启用与 Lambda 函数的直接集成。

接着，同样使用 Pub/Sub 编辑器验证操作。

**1. 订阅频道（Subscribe 部分）**  
指定为 Lambda 创建的命名空间（sample-lambda）进行频道订阅。  
![Lambda - Subscribe](https://i.gyazo.com/923d9f13e9be5bd1803ddda8bae14340.png)

**2. 发布事件（Publish 部分）**  
向同一命名空间的频道发布事件。  
![Lambda - Publish](https://i.gyazo.com/448cad429e26fb411fe9a7546edcd2a2.png)

**3. 验证事件分发结果（Subscribe 部分）**  
可确认带有 Lambda 函数设置的前缀(`Lambda:`)的事件已被分发。  
![Lambda - Subscribe Result](https://i.gyazo.com/e9e7b776ab46e7da632b95901ea190af.png)

至此，可确认与 Lambda 的直接集成同样能够按预期处理和分发事件。

## 总结

本文中，我们以 DynamoDB 和 Lambda 为例，确认了 AppSync Events 新增的数据源集成功能的基础用法。该功能的新增使得与 AWS 各种服务和外部资源的集成变得非常简单，大幅提升了 AppSync Events 的实用性。使用方式也直观，使用 CDK 进行环境构建也相对容易。

今后，将一边尝试 RDS、Bedrock 等其他数据源集成，一边探索实时应用程序的新可能性。
