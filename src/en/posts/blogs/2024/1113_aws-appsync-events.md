---
title: Trying Real-Time Delivery with AWS AppSync Events
author: noboru-kudo
date: 2024-11-13T00:00:00.000Z
tags:
  - AWS
  - appsync
  - nuxt
  - websocket
image: true
translate: true
---

At the end of last month, a new API was introduced to AWS AppSync.

- [Announcing AWS AppSync Events: serverless WebSocket APIs to power real-time web and mobile experiences at any scale](https://aws.amazon.com/blogs/mobile/announcing-aws-appsync-events-serverless-websocket-apis/)

AppSync has been known as a managed service for GraphQL, but now a new WebSocket-based Event API option has been added. Since the Event API is WebSocket-based, events can be received immediately on the client side. As it follows a Pub/Sub model, it supports sending events not only to specific clients but also via broadcast and multicast.

Currently, there are various limitations, such as the lack of support for bidirectional WebSocket, data source integration, and Lambda event handlers, but I felt it could still be used in various use cases, so I tried it out.

- [AWS AppSync Event Doc](https://docs.aws.amazon.com/appsync/latest/eventapi/event-api-welcome.html)

## Creating an AppSync Event API

I wrote it in a CloudFormation template.

```yaml:appsync-events.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Sample AppSync Template'
Resources:
  # Main AppSync Event API
  AppSyncApi:
    Type: AWS::AppSync::Api
    Properties:
      Name: 'appsync-event-api-sample'
      EventConfig:
        # Choose from the following
        # AMAZON_COGNITO_USER_POOLS | AWS_IAM | API_KEY | OPENID_CONNECT | AWS_LAMBDA
        AuthProviders:
          - AuthType: API_KEY
          - AuthType: AWS_IAM
        ConnectionAuthModes:
          - AuthType: API_KEY
          - AuthType: AWS_IAM
        DefaultPublishAuthModes:
          - AuthType: API_KEY
          - AuthType: AWS_IAM
        DefaultSubscribeAuthModes:
          - AuthType: API_KEY
        LogConfig:
          LogLevel: ALL
          CloudWatchLogsRoleArn: !GetAtt CloudWatchLogsRole.Arn

  # Generate API Key
  ApiKey:
    Type: AWS::AppSync::ApiKey
    Properties:
      ApiId: !GetAtt AppSyncApi.ApiId

  # Namespace for Event API
  # Can override authentication specified at the API level
  NameSpace:
    Type: AWS::AppSync::ChannelNamespace
    Properties:
      Name: sample
      ApiId: !GetAtt AppSyncApi.ApiId
      # Specify the following if setting a custom event handler
      # CodeHandlers: NodeJS source
      # CodeS3Location: S3 Endpoint

  # IAM role for logging Event API
  CloudWatchLogsRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: appsync.amazonaws.com
            Action: 'sts:AssumeRole'
      Policies:
        - PolicyName: CloudWatchLogsPolicy
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - logs:PutLogEvents
                  - logs:CreateLogGroup
                  - logs:CreateLogStream
                Resource: '*'

Outputs:
  HttpEndpoint:
    Value: !GetAtt AppSyncApi.Dns.Http
  WebSocketEndpoint:
    Value: !GetAtt AppSyncApi.Dns.Realtime
```

[AWS::AppSync::Api](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-appsync-api.html) is the central resource for the Event API. Here, you configure settings at the API level. This time, we specified API Key (`API_KEY`) and IAM (`AWS_IAM`) as the authentication methods. Authentication methods can be specified separately for event publishing and subscription. Here, publishing (`DefaultPublishAuthModes`) is set to API Key and IAM, while subscription (`DefaultSubscribeAuthModes`) is set to API Key only. You can also specify OpenID Connect, Lambda authentication, or Cognito UserPool. For more details, please refer to the official documentation below.

- [AppSync Events Doc - Configuring authorization and authentication to secure Event APIs](https://docs.aws.amazon.com/appsync/latest/eventapi/configure-event-api-auth.html)

Another important concept of the Event API is [Namespace](https://docs.aws.amazon.com/appsync/latest/eventapi/channel-namespaces.html). In the above, we created a Namespace (`sample`) using the [AWS::AppSync::ChannelNamespace](https://docs.aws.amazon.com/ja_jp/AWSCloudFormation/latest/UserGuide/aws-resource-appsync-channelnamespace.html) resource. Although not specified here, you can restrict the authentication method at the Namespace level or specify a custom event handler[^1].

In the Event API, events are published and subscribed to in units of channels prefixed by this Namespace. Channels are managed in a hierarchical structure like `/default/foo/bar`, but there is no need to create them in advance (they are created within the Event API).

[^1]: According to the [blog](https://aws.amazon.com/jp/blogs/news/announcing-aws-appsync-events-serverless-websocket-apis/) of the release announcement, custom event handlers are planned to support Lambda in the future.

Deploy this template.

```shell
aws cloudformation deploy --template-file appsync-events.yaml \
  --stack-name appsync-events-sample --capabilities CAPABILITY_IAM
```

Let's check the status of AppSync Events from the management console.

![Event API](https://i.gyazo.com/52a74d6123eb192dc742b5400325289e.png)

The Event API has been created, and both HTTP and Realtime (WebSocket) endpoints have been established.

The Event API settings are as follows.

![API settings](https://i.gyazo.com/ff25b5fd17a69b9ef847c5b1397414be.png)

The settings at the API level are reflected. The API key has also been issued.

Let's also check the Namespace.

![Namespace](https://i.gyazo.com/e012f88ea7883a7656976fef0caef73a.png)

Since almost nothing is specified for the Namespace, it has been created in its default state.

## Trying Out the Event API

Let's quickly create a client and experience the real-time reflection of the Event API. This time, I created a frontend app using Nuxt. Below is the source code.

```html:app.vue
<script setup lang="ts">
  import type { EventsChannel } from 'aws-amplify/data';
  import { events } from 'aws-amplify/data';
  import { Amplify } from 'aws-amplify';

  // Initialize aws-amplify (authentication mode is API Key)
  Amplify.configure({
    API: {
      Events: {
        endpoint:
          'https://xxxxxxxxxx.appsync-api.ap-northeast-1.amazonaws.com/event',
        region: 'ap-northeast-1',
        defaultAuthMode: 'apiKey',
        apiKey: 'da2-xxxxxxxx'
      }
    }
  });

  let channel: EventsChannel;
  const messages = ref([]);

  onMounted(async () => {
    // Subscribe to channels under /sample/channel
    channel = await events.connect('/sample/channel/*');
    channel.subscribe({
      next: (data) => {
        console.log('received', data);
        messages.value.push(data.event)
      },
      error: (err) => console.error('error', err)
    });
  });

  onBeforeUnmount(() => {
    channel?.close();
  });
</script>

<template>
  <div>
    <h1>AppSync Events sample</h1>
    <div v-for="message in messages" :key="message">
      {{ message }}
    </div>
  </div>
</template>
```

Access to AppSync Events can, of course, be done using raw WebSocket, but here we use [aws-amplify](https://www.npmjs.com/package/aws-amplify) (which makes the implementation much easier). Connect to the Event API with `events.connect` and subscribe to channels with `events.subscribe`. Here, the subscribed channel is specified as `/sample/channel/*`, which means all channels under `/sample/channel`.

The data received from the Event API is directly set to a reactive variable (`messages`) and displayed in the UI.

When you start this app and look at Chrome's Dev tools, you can see the establishment of the WebSocket connection and the communication for channel subscription.

![Chrome WebSocket log](https://i.gyazo.com/a58848d3c959e751f8e5801e1297eaec.png)

:::column:Publishing Events Using Amplify
In this source code, only event subscription is shown, but you can also publish events using `events.post`.

```typescript
await events.post('/sample/channel/test', {
  message: 'Publish from Amplify'
});
```
Currently, event publishing via WebSocket is not supported, but it seems to be planned for future support.
:::

Next is the event publishing side. Normally, events would be published from frontend or backend services, but this time we'll use curl. In the CloudFormation template earlier, we specified API Key and IAM as the authentication methods for event publishing.

First, event publishing using an API Key.

```shell
API_KEY=da2-xxxxxxxxxxxxx
HTTP_HOST=xxxxxxxxxxxx.appsync-api.ap-northeast-1.amazonaws.com

curl -H "x-api-key:${API_KEY}" -H "Host:$HTTP_HOST" \
     https://${HTTP_HOST}/event -d '{"channel":"/sample/channel/test","events":["{\"message\":\"Delivering the latest data (API_KEY)!!\"}"]}'
```

You can check the API Key and HTTP endpoint from the management console.

Next, in the case of IAM. Curl version 7.75.0 and above supports AWS's SigV4 signature protocol, so no special preparation is needed.

```shell
curl --aws-sigv4 "aws:amz:ap-northeast-1:appsync" \
     --user "$(aws configure get aws_access_key_id):$(aws configure get aws_secret_access_key)" \
     https://${HTTP_HOST}/event \
     -d '{"channel":"/sample/channel/test","events":["{\"message\":\"Delivering the latest data (IAM)!!\"}"]}'
```

Below is a video of each command being executed.

<a href="https://gyazo.com/88c051d3b3d32046411c232282dab4b7"><video width="100%" autoplay muted loop playsinline controls><source src="https://i.gyazo.com/88c051d3b3d32046411c232282dab4b7.mp4" type="video/mp4"/></video></a>

Once the event is published (curl execution), you can see that the data is reflected almost in real time. This can also be confirmed from the WebSocket log in Chrome Dev tools.

## Summary

While this is not a practical sample, I tried using AppSync Events for real-time delivery. Implementing this type of application seriously would involve considerable effort, but with AppSync Events, it seems possible to implement it quite quickly. The fact that it is a fully managed service with a pay-as-you-go model, including a free tier, is also attractive. It seems likely to be useful in collaborative applications and event-driven use cases.
