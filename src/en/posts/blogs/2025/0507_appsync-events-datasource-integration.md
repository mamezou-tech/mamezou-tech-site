---
title: Organizing How to Use Data Source Integrations in AWS AppSync Events
author: noboru-kudo
date: 2025-05-07T00:00:00.000Z
tags:
  - appsync
  - websocket
  - AWS
image: true
translate: true

---

Last year (2024), I introduced AWS AppSync’s Event API in the following article.

@[og](/en/blogs/2024/11/13/aws-appsync-events/)

AppSync is famous for GraphQL, but with the introduction of the WebSocket-based Event API, real-time communication has become even simpler. About half a year has passed since then, and the Event API has continued to gain new features.

Representative updates include:

- [What's New with AWS - AWS AppSync releases CDK L2 constructs to simplify creating WebSocket APIs](https://aws.amazon.com/about-aws/whats-new/2025/02/aws-appsync-cdk-l2-simplify-websocket-apis/)
- [What's New with AWS - AppSync Events adds publishing over WebSocket for real-time pub/sub](https://aws.amazon.com/about-aws/whats-new/2025/03/appsync-events-publishing-websocket-real-time-pub-sub/)

Furthermore, last month, just like with GraphQL APIs, the Event API gained the ability to integrate directly with Lambda, DynamoDB, Bedrock, and more.

@[og](https://aws.amazon.com/about-aws/whats-new/2025/04/aws-appsync-events-data-source-integrations-channel-namespaces/)

According to the [official documentation](https://docs.aws.amazon.com/appsync/latest/eventapi/supported-datasources.html), the following data sources are supported at this time:

- Lambda
- DynamoDB
- RDS
- EventBridge
- OpenSearch Service
- HTTP endpoints
- Bedrock

Here, we will focus on Lambda and DynamoDB and organize how to integrate these data sources with the Event API.

## Prerequisites

First, prepare an AppSync Events environment with the minimum configuration that does not use data source integrations.

Recently, the Event API has also been supported by AWS CDK L2 constructs.

- [AWS CDK Reference - AppSync - Events](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_appsync-readme.html#events)

This time, instead of a CloudFormation template, we'll use CDK to build the environment. The CDK script is as follows:

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
    // Channel without data source integration
    api.addChannelNamespace('sample');
  }
}
```

This is a simple configuration that uses only API Key authentication.

When you deploy this, the AppSync management console will display as follows:

![Simple - AppSync Event](https://i.gyazo.com/814416e446cf6db9c87a95d78133ca35.png)

Use the built-in Pub/Sub editor in the console to verify the behavior.

1. Connect (Subscribe section)  
   ![Simple - Connect](https://i.gyazo.com/09bc3b2d8170f4504a553dc5afb0b630.png)

2. Subscribe to channel (Subscribe section)  
   ![Simple - Subscribe](https://i.gyazo.com/d0e10e3e0b61dc988ca60dc5e1864ffc.png)

3. Publish event (Publish section)  
   You can choose HTTP or WebSocket; either works. On success, the result appears on the right.  
   ![Simple - Publish](https://i.gyazo.com/1cc59a9377eb5fcfeb57b14cfac7b3ff.png)

4. Verify event delivery (Subscribe section)  
   If you see the event you just published on the client side, it's successful.  
   ![Simple - Subscribe Result](https://i.gyazo.com/70e911a1e6057fde20e7bf1b3a5cb93b.png)

You can confirm that the published event is delivered unchanged to clients subscribed to the channel.

From here on, we'll add data source integrations to this AppSync Event API.

## Integrating with DynamoDB (Custom Handler)

To use DynamoDB as a data source, you need to provide an event handler specific to the Event API. The handler runs on the APPSYNC_JS runtime (a custom JavaScript execution environment).

Here, we will implement a handler that saves events published on a channel in a specified namespace to DynamoDB, processes the write results, and delivers them to clients.

![](https://i.gyazo.com/1ba7c8238fb15957fe3eed89fe8f44f5.png)

### Resource setup (CDK)

First, create a DynamoDB table and register it as a data source for the Event API.

```typescript
// (omitted)

// DynamoDB table for data source integration
const table = new dynamodb.Table(this, 'EventTable', {
  tableName: 'AppSyncEventsTable',
  partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING }
});
// Register as data source for AppSync Events
const dynamodbDataSource = api.addDynamoDbDataSource('EventDataSource', table);
```

Next, add the namespace (sample-dynamodb) that will use DynamoDB, and link the previously created data source and a custom handler.

```typescript
// Namespace for DynamoDB
api.addChannelNamespace('sample-dynamodb', {
  // Set DynamoDB as data source
  publishHandlerConfig: {
    dataSource: dynamodbDataSource
  },
  // Custom handler
  code: appsync.Code.fromInline(`
import * as ddb from '@aws-appsync/utils/dynamodb'

// Hook executed on event publish/deliver
export const onPublish = {
  // Publish
  request(ctx) {
    const channel = ctx.info.channel.path
    return ddb.batchPut({
      tables: {
        '${table.tableName}': ctx.events.map(({ id, payload }) => ({ channel, id, ...payload })),
      }
    })
  },
  // Deliver
  response(ctx) {
    // ctx.result contains the result of the request execution
    return ctx.result.data['${table.tableName}'].map(({ id, ...payload }) => ({ id, payload: 'DynamoDB:' + payload.message }))
  }
}
// Hook executed when a client subscribes to a channel
export const onSubscribe = (ctx) => {
  console.log('Joined:' + ctx.info.channel.path)
}`)
});
```

The event handler registered in a namespace for AppSync Events provides two types of hooks:

| Hook        | Timing                                  | Main Purpose                                    |
|-------------|-----------------------------------------|-------------------------------------------------|
| onPublish   | When an event is published (delivered to clients) | Data source operations, event validation/transformation |
| onSubscribe | When a client subscribes to a channel   | Authorization, logging, initialization           |

When data source integrations are enabled, each hook must be an object composed of the following functions:

- request: Perform input validation, authorization checks, and transformation for data source calls.  
- response: Receive the data source execution results and handle errors or formatting.

In the code above, since we specify the DynamoDB data source in publishHandlerConfig, we implement request and response in the onPublish hook. The request function uses the built-in DynamoDB module provided by the AppSync runtime (APPSYNC_JS) to write to the table. The response function adds a prefix (`DynamoDB:`) to the write results before delivering them to clients.

:::info
For simplicity, we are creating the event handler inline within AWS CDK here, but in a production environment, you probably wouldn’t do it this way. As your event handler implementation becomes more complex, you’ll want type support and linting from TypeScript (APPSYNC_JS is a fairly restrictive JavaScript runtime environment).

AppSync provides type definitions, utilities, and eslint rules as an NPM package. The official documentation below explains detailed usage steps and how to bundle with esbuild, so please refer to it:

- [AppSync Events Doc - Configuring utilities for the APPSYNC_JS runtime](https://docs.aws.amazon.com/appsync/latest/eventapi/configure-utilities.html)
- [AppSync Events Doc - Bundling, TypeScript, and source maps for the APPSYNC_JS runtime](https://docs.aws.amazon.com/appsync/latest/eventapi/additional-utilities.html)
:::

### Verifying Operation

Next, check that the DynamoDB integration works as expected.

After deploying the stack, open the AppSync management console and verify the configuration.

**Data Sources**  
![DynamoDB - Datasource](https://i.gyazo.com/b9d9a7ef859b5822f4849e5519c439bd.png)

**Namespaces**  
![DynamoDB - Namespace](https://i.gyazo.com/7622f1df69ada28b1374daeb42e86075.png)

You can see the DynamoDB table added as a data source and linked to the sample-dynamodb namespace. The initial sample namespace has the handler set to None (unspecified), but sample-dynamodb is configured with AppSyncJS. Expanding the details shows the source code of the event handler you created earlier.

Next, use the Pub/Sub editor to test the actual flow (connection step omitted).

1. Subscribe to channel (Subscribe section)  
   This time, subscribe by specifying the namespace created for DynamoDB (sample-dynamodb).  
   ![DynamoDB - Subscribe](https://i.gyazo.com/77842383d684e64236d81052b0a92b7c.png)

2. Publish event (Publish section)  
   Publish an event to the channel in the same namespace.  
   ![DynamoDB - Publish](https://i.gyazo.com/757e04122b73effd2c1f8daccfc82591.png)

3. Verify event delivery (Subscribe section)  
   As described in the response function of the event handler, the event is delivered with the prefix (`DynamoDB:`).  
   ![DynamoDB - Subscribe Result](https://i.gyazo.com/f0e6c76a7221f144cb6f2ba3f94acdfc.png)

Finally, open the DynamoDB table and confirm that the events are stored as records.

![DynamoDB - Table Editor](https://i.gyazo.com/bbc2ad66077442dd395f0bb36433f699.png)

This confirms that the data source integration with DynamoDB is functioning correctly.

## Integrating Directly with Lambda

Next, let’s use Lambda as a data source. Unlike in the DynamoDB case, it’s possible to directly integrate a Lambda function itself as an AppSync event handler. AppSync’s custom JavaScript runtime environment has various constraints[^1], but by using a Node-based Lambda function, you can implement highly flexible code without these restrictions.

[^1]: https://docs.aws.amazon.com/appsync/latest/eventapi/runtime-supported-features.html

![](https://i.gyazo.com/5a8613ec2bc31812f3f5f69a8f3c6ab8.png)

Here, we’ll try this direct integration.

### Resource setup (CDK)

Add the following code to your CDK script:

```typescript
// Lambda function for data source integration
const fn = new lambda.Function(this, 'EventHandler', {
  functionName: 'SampleAppSyncDataSourceHandler',
  runtime: lambda.Runtime.NODEJS_22_X,
  handler: 'index.handler',
  code: lambda.Code.fromInline(`
exports.handler = async (event) => {
  if (event.info.operation === 'PUBLISH') {
    // onPublish event
    return {
      events: event.events.map(e => ({
        id: e.id,
        payload: 'Lambda:' + e.payload.message // Set the delivery content here
      }))
      // On error, return:
      // error: 'error message'
    };
  } else {
    // onSubscribe event
    return null; // Subscription OK
  }
}`)
});
// Register as data source for AppSync Events
const lambdaDataSource = api.addLambdaDataSource('EventHandler', fn);
// Namespace for Lambda
api.addChannelNamespace('sample-lambda', {
  publishHandlerConfig: {
    direct: true, // Direct integration
    dataSource: lambdaDataSource
  },
  subscribeHandlerConfig: {
    direct: true, // Direct integration
    dataSource: lambdaDataSource
  }
});
```

First, define a Lambda function that will serve as the event handler for AppSync Events. In this direct integration method, the Lambda function itself acts as the handler and must return a response in the format required by AppSync Events.

The [official documentation](https://docs.aws.amazon.com/appsync/latest/eventapi/writing-event-handlers.html#direct-lambda-integration) describes the details, but here we implement a Lambda function that supports both onPublish and onSubscribe events. The feature of direct integration is that, unlike AppSync’s custom handlers where you need to define request/response functions, you simply return the delivery content (events) as the return value. In this example, like the DynamoDB integration, we add a prefix (`Lambda:`) to the message before delivering the event.

After creating the Lambda function, configure the data source integration (addLambdaDataSource) and the namespace (sample-lambda). Unlike in the DynamoDB example, here we do not set AppSync’s custom handler in the namespace; instead, we set the direct parameter to `true` in publishHandlerConfig/subscribeHandlerConfig to enable direct integration with the Lambda function.

:::info
Although we did not use it here, when implementing AppSync Events handlers in Lambda, you can achieve an intuitive implementation by using AWS Powertools provided by AWS.

- [Powertools for AWS Lambda (TypeScript) - AppSync Events](https://docs.powertools.aws.dev/lambda/typescript/latest/features/event-handler/appsync-events/)
:::

### Verifying Operation

After deploying the stack, the AppSync management console will display as follows:

**Data Sources**  
![Lambda - Datasource](https://i.gyazo.com/182c12f2705c04bddcee6532b9646f7e.png)

**Namespaces**  
![Lambda - Namespace](https://i.gyazo.com/065e114f22b6c716c6da8401da1fd915.png)

You can see the Lambda function registered as a data source and linked to the sample-lambda namespace. Also, the event handler setting is Direct, indicating that direct integration with the Lambda function is enabled.

Now, let’s use the Pub/Sub editor here as well to verify the behavior.

1. Subscribe to channel (Subscribe section)  
   Subscribe to the channel by specifying the namespace created for Lambda (sample-lambda).  
   ![Lambda - Subscribe](https://i.gyazo.com/923d9f13e9be5bd1803ddda8bae14340.png)

2. Publish event (Publish section)  
   Publish an event to the channel in the same namespace.  
   ![Lambda - Publish](https://i.gyazo.com/448cad429e26fb411fe9a7546edcd2a2.png)

3. Verify event delivery (Subscribe section)  
   You can confirm that the event is delivered with the prefix (`Lambda:`) set by the Lambda function.  
   ![Lambda - Subscribe Result](https://i.gyazo.com/e9e7b776ab46e7da632b95901ea190af.png)

This confirms that direct integration with Lambda processes and delivers events as expected.

## Conclusion

In this article, we covered the newly added data source integration feature in AppSync Events by walking through basic usage examples for DynamoDB and Lambda. This feature addition makes it extremely easy to integrate with various AWS services and external resources, greatly enhancing the practical utility of AppSync Events. The usage is intuitive, and setting up the environment with CDK is relatively straightforward.

Moving forward, I plan to explore other data source integrations like RDS and Bedrock, and uncover new possibilities for real-time applications.
