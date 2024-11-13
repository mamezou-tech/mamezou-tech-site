---
title: AWS AppSync Events でリアルタイム配信を試してみる
author: noboru-kudo
date: 2024-11-13
tags: [AWS, appsync, nuxt, websocket]
image: true
---

先月末にAWS AppSyncから新しいAPIが導入されました。

- [AWS AppSync Events の発表: サーバーレス WebSocket API で、あらゆる規模の Web およびモバイルのリアルタイムエクスペリエンスを実現](https://aws.amazon.com/jp/blogs/news/announcing-aws-appsync-events-serverless-websocket-apis/)

AppSyncといえばGraphQLのマネージドサービスでしたが、新しくWebSocketベースのEvent APIという選択肢が追加されました。
Event APIはWebSocketベースなので、イベント発行は即時にクライアント側で受信できます。Pub/Subモデルなので、特定のクライアントだけでなく、ブロードキャストやマルチキャストでのイベント送信にも対応します。

現状では双方向WebSocket・データソース統合やLambdaイベントハンドラが未サポート等各種制約はありますが、今の状態でも色々なユースケースで使えそうな気がしたので使用感を試してみました。

- [AWS AppSync Event Doc](https://docs.aws.amazon.com/appsync/latest/eventapi/event-api-welcome.html)

## AppSync Event APIを作成する

CloudFormationテンプレートで書いてみました。

```yaml:appsync-events.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Sample AppSync Template'
Resources:
  # AppSync Event API本体
  AppSyncApi:
    Type: AWS::AppSync::Api
    Properties:
      Name: 'appsync-event-api-sample'
      EventConfig:
        # 以下から選択
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

  # APIキーの生成
  ApiKey:
    Type: AWS::AppSync::ApiKey
    Properties:
      ApiId: !GetAtt AppSyncApi.ApiId

  # Event APIのネームスペース
  # APIレベルで指定した認証の上書き可
  NameSpace:
    Type: AWS::AppSync::ChannelNamespace
    Properties:
      Name: sample
      ApiId: !GetAtt AppSyncApi.ApiId
      # カスタムのイベントハンドラーをセットする場合は以下を指定
      # CodeHandlers: NodeJS source
      # CodeS3Location: S3 Endpoint

  # Event APIのログ出力用のIAMロール
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

[AWS::AppSync::Api](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-appsync-api.html)がEvent APIの中心的なリソースです。ここでAPIレベルの設定をします。
今回は認証方式としてAPIキー(`API_KEY`)とIAM(`AWS_IAM`)を指定しています。
認証方式はイベント発行と購読それぞれに指定可能です。ここでは発行(`DefaultPublishAuthModes`)はAPIキーとIAM、購読(`DefaultSubscribeAuthModes`)はAPIキーのみとしてます。
他にもOpenID ConnectやLambda認証、Cognito UserPoolも指定可能です。詳細は以下公式ドキュメントを参照してください。

- [AppSync Events Doc - Configuring authorization and authentication to secure Event APIs](https://docs.aws.amazon.com/appsync/latest/eventapi/configure-event-api-auth.html)

もう1つEvent APIの重要な概念として[Namespace](https://docs.aws.amazon.com/appsync/latest/eventapi/channel-namespaces.html)があります。
上記では、[AWS::AppSync::ChannelNamespace](https://docs.aws.amazon.com/ja_jp/AWSCloudFormation/latest/UserGuide/aws-resource-appsync-channelnamespace.html)リソースでNamespace(`sample`)を作成しています。
ここでは指定してませんが、Namespace単位でAPIレベルの認証方式を限定したり、カスタムのイベントハンドラ[^1]を指定できます。

Event APIではこのNamespaceをプリフィックスとするチャンネルの単位でイベントの発行や購読します。
チャンネルは`/default/foo/bar`のように階層構造で管理しますが、事前に作成する必要はありません（Event API内で作成されます）。

[^1]: リリースアナウンスの[ブログ](https://aws.amazon.com/jp/blogs/news/announcing-aws-appsync-events-serverless-websocket-apis/)を読むと、カスタムイベントハンドラは将来的にLambdaにも対応する予定とのことです。

このテンプレートをデプロイします。

```shell
aws cloudformation deploy --template-file appsync-events.yaml \
  --stack-name appsync-events-sample --capabilities CAPABILITY_IAM
```

マネジメントコンソールからAppSynct Eventsの状態を確認してみます。

![Event API](https://i.gyazo.com/52a74d6123eb192dc742b5400325289e.png)

Event APIが作成され、HTTPエンドポイントやRealtimeエンドポイント(WebSocket)が作成されています。

Event APIの設定は以下のようになっています。

![API settings](https://i.gyazo.com/ff25b5fd17a69b9ef847c5b1397414be.png)

API単位の設定が反映されています。APIキーの払い出しもされています。

Namespaceも確認してみます。

![Namespace](https://i.gyazo.com/e012f88ea7883a7656976fef0caef73a.png)

Namespaceはほとんど何も指定してないのでデフォルト状態で作成されています。

## Event APIを動かしてみる

早速クライアントを作成して、Event APIのリアルタイム反映を体験してみます。
今回はNuxtでフロントエンドアプリを作成しました。
以下がソースコードです。

```html:app.vue
<script setup lang="ts">
  import type { EventsChannel } from 'aws-amplify/data';
  import { events } from 'aws-amplify/data';
  import { Amplify } from 'aws-amplify';

  // aws-amplifyを初期化(認証モードはAPIキー)
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
    // /sample/channel配下のチャンネルを購読
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

AppSync Eventsへのアクセスは、もちろん素のWebSocketを使ってもできますが、ここでは[aws-amplify](https://www.npmjs.com/package/aws-amplify)を使います(実装がとても楽になります)。
`events.connect`でEvent APIに接続し、`events.subscribe`でチャンネルを購読します。
ここでは購読するチャンネルは`/sample/channel/*`と指定しました。これは`/sample/channel`配下の全チャンネルを意味します。

なお、Event APIから受け取ったデータはそのままリアクティブ変数(`messages`)に設定し、UI表示するようにしています。

このアプリを起動してChromeのDevツールを見ると、WebSocketコネクションの確立やチャンネル購読の通信が確認できます。

![Chrome WebSocket log](https://i.gyazo.com/a58848d3c959e751f8e5801e1297eaec.png)

:::column:Amplifyを使ってイベントを発行する
このソースコードではイベント購読のみですが、`events.post`を使ってイベント発行もできます。

```typescript
await events.post('/sample/channel/test', {
  message: 'Publish from Amplify'
});
```
現状はWebSocket経由でのイベント発行は対応していませんが、将来的に対応予定のようです。
:::

次にイベント発行側の方です。
通常はフロントエンドやバックエンドサービスからイベント発行をすることになるかと思いますが、今回はcurlでやってみます。
先ほどCloudFormationテンプレートでイベント発行の認証はAPIキー方式とIAMを使った方式を指定しました。

まずAPIキーを使ったイベント発行です。

```shell
API_KEY=da2-xxxxxxxxxxxxx
HTTP_HOST=xxxxxxxxxxxx.appsync-api.ap-northeast-1.amazonaws.com

curl -H "x-api-key:${API_KEY}" -H "Host:$HTTP_HOST" \
     https://${HTTP_HOST}/event -d '{"channel":"/sample/channel/test","events":["{\"message\":\"最新データをお届けします(API_KEY)!!\"}"]}'
```

APIキーやHTTPエンドポイントはマネジメントコンソールから確認できます。

次に、IAMの場合です。curlの7.75.0以上はAWS認証に対応していますので、特別な準備は必要ありません。

```shell
curl --aws-sigv4 "aws:amz:ap-northeast-1:appsync" \
     --user "$(aws configure get aws_access_key_id):$(aws configure get aws_secret_access_key)" \
     https://${HTTP_HOST}/event \
     -d '{"channel":"/sample/channel/test","events":["{\"message\":\"最新データをお届けします(IAM)!!\"}"]}'
```

以下はそれぞれのコマンドを実行した動画です。

<a href="https://gyazo.com/88c051d3b3d32046411c232282dab4b7"><video width="100%" autoplay muted loop playsinline controls><source src="https://i.gyazo.com/88c051d3b3d32046411c232282dab4b7.mp4" type="video/mp4"/></video></a>

イベント発行(curl実行)が終わると、ほぼリアルタイムでデータが反映されていることが分かります。
この様子はChrome DevツールのWebSocketログからも確認できます。

## まとめ

実用的なサンプルではありませんが、AppSync Eventsを使ったリアルタイム配信を使ってみました。
この手のアプリケーションを真面目に実装するとかなりの労力を伴いますが、AppSync Eventsを使えばかなり手早く実装できそうです。
また、無料枠付きの従量制のフルマネージドサービスなところも魅力的です。
共同作業型アプリケーションやイベント駆動なユースケースで活躍しそうですね。

