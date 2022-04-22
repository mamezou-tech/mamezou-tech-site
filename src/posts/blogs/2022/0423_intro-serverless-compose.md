---
title: Serverless Framework Composeで複数サービスをまとめて管理する
author: noboru-kudo
date: 2022-04-23
tags: [AWS, サーバーレス]
---

2022/04/20にServerless Frameworkの新機能Serverless Framework Composeがアナウンスされました。

- [Introducing multi-service deployments via Serverless Framework Compose](https://www.serverless.com/blog/serverless-framework-compose-multi-service-deployments)

名前からも想像できるようにDocker Composeのように、Serverless Framework Composeは関数のオーケストレーションをするものです。
マイクロサービスのリポジトリ構成として、サービスごとにserverless.ymlを分けているプロジェクトで大きな効果を発揮しそうな機能です。

今回はこの新機能を使ってみたいと思います。

[[TOC]]

## 事前準備

Serverless Framework Composeを利用するには、Serverless Frameworkの`3.15.0`以上が必要です。
ここでは、これをグローバルでインストールしておきます。

```shell
npm install -g serverless@3.15.0
serverless --version
```
```
Framework Core: 3.15.0
Plugin: 6.2.2
SDK: 4.3.2
```

## サービステンプレート作成

今回は依存関係のある以下の2つのServerless Frameworkのサービスを作成します。

- sample-consumer: SQSからメッセージを受け取ってログに出力する
- sample-api: API Gatewayからリクエストを受け取ってSQSにメッセージを送信する

sample-apiはsample-consumerで管理するSQSに依存しています。

各サービスはServerless FrameworkのCLIで作成します。
任意のルートディレクトリを作成し、その配下で以下のコマンドを実行します。

```shell
# SQS Event Consumer
serverless create --template aws-nodejs \
  --path sample-consumer
# API
serverless create --template aws-nodejs \
  --path sample-api
```

serverless.ymlとサンプルのLambda関数が生成されます。
以下のディレクトリ構造になります。

```
.
├── sample-api
│   ├── handler.js
│   └── serverless.yml
└── sample-consumer
   ├── handler.js
   └── serverless.yml
```

## 各サービスのserverless.yml作成

基本的には、通常のServerless Frameworkと同じ工程です。

### sample-consumer

まず、SQSのConsumer関数であるsample-consumerの`serverless.yml`を作成します。

```yaml
service: sample-consumer
frameworkVersion: '3'
provider:
  name: aws
  runtime: nodejs14.x
  region: ap-northeast-1
  stage: dev
functions:
  consumer:
    handler: handler.handleEvent
    events:
      - sqs:
          arn: !GetAtt SampleQueue.Arn
resources:
  Resources:
    SampleQueue:
      Type: AWS::SQS::Queue
      Properties:
        QueueName: sample-queue
  Outputs:
     queueUrl:
       Value: !Ref SampleQueue
```

`resources`フィールドにSQSのCloudFormationテンプレートを追加し、`Outputs`としてそのエンドポイントURLを指定しました。
ここでは載せませんが、Lambda自体はそのSQSのメッセージ受信を検知すると実行するようにしています。

### sample-api

API側は次のようになります。

```yaml
service: sample-api
frameworkVersion: '3'
provider:
  name: aws
  runtime: nodejs14.x
  region: ap-northeast-1
  environment:
    SAMPLE_QUEUE_URL: ${param:sampleQueueUrl}
  stage: dev
  iam:
    role:
      statements:
        - Effect: "Allow"
          Action: "sqs:SendMessage"
          Resource: arn:aws:sqs:${aws:region}:${aws:accountId}:sample-*
functions:
  pushMessage:
    handler: handler.push
    events:
      - http:
          path: /message
          method: POST
```

環境変数(`environment`)のところで、`${param:sampleQueueUrl}`としています。
これはsample-consumerで定義したSQSのURLを設定しています。この点については後述します。

本題から外れるため載せませんが、Lambda関数は、HTTPリクエストを受け付けると、環境変数に設定したSQSに対してメッセージを送信するだけの単純のものです。

## serverless-compose.yml作成

ここでServerless Framework Composeの設定します。
ルートディレクトリに`serverless-compose.yml`を作成します。

以下の内容となります。

```yaml
services:
  sample-api:
    path: sample-api
    params:
      sampleQueueUrl: ${sample-consumer.queueUrl}

  sample-consumer:
    path: sample-consumer
```

シンプルで自明ですね。`services`配下に対象とする各サービスとパスを記述するだけです。

ポイントはsample-apiの`params`です。
ここでsample-apiが参照するSQSのURLを渡しています。ここで指定している値は、sample-consumer側のCloudFormationテンプレートの`Output`に定義しているものです(`queueUrl`)。
こうすることでServerless Frameworkは両サービスに依存関係があると解釈し、sample-consumer -> sample-apiの順序でデプロイされるようになります（依存関係がない場合は並列にデプロイされます）。
Docker Composeはもちろん、CloudFormationやTerraform等のIaCツールではお馴染みのものですので、この辺りのツールに慣れている方は直感的かと思います。

ここでは暗黙的な依存関係を作成しましたが、以下のように明示的な指定も可能です。

```yaml
services:
  sample-api:
    path: sample-api
    dependsOn:
      - other-service
```

:::info
この`serverless-compose.yml`が存在すると、そのルートディレクトリ直下ではServerless Framework Composeのコマンドのみを受け付けるようになります。
例えば、ルートディレクトリでServerless Framework Compose未サポートの`serverless package`を実行すると以下のようなエラーが表示されます。
```
Error:
"package" is not a global command in Serverless Framework Compose.
Available global commands: deploy, remove, info, logs, outputs, refresh-outputs.
You can package each Serverless Framework service by running "serverless <service-name>:package".
```
エラー内容から分かるように、各サービス固有のコマンドを実行する場合は、サービス名をプレフィックスとして付ける必要があります。
:::

これで以下のようなディレクトリ構造になりました。

```
.
├── sample-api
│   ├── handler.js
│   └── serverless.yml
├── sample-consumer
│   ├── handler.js
│   └── serverless.yml
└── serverless-compose.yml
```

## Serverless Framework Composeでデプロイする

では、デプロイしてみます。ルートディレクトリで以下を実行します。

```shell
serverless deploy
```

Serverless Framework Composeは`serverless-compose.yml`の内容に従って各サービスをデプロイされています。

`.serverless/compose.log`を見ると、以下のログが出力されていました。

```

Deploying to stage dev
sample-api › waiting
sample-consumer › waiting
sample-consumer › deploying
sample-consumer › Running "serverless deploy --stage dev"
sample-consumer › Running "serverless" from node_modules
sample-consumer › Deploying sample-consumer to stage dev (ap-northeast-1)
sample-consumer › ✔ Service deployed to stack sample-consumer-dev (213s)
sample-consumer › functions:
sample-consumer ›   consumer: sample-consumer-dev-consumer (215 B)
sample-consumer › Toggle on monitoring with the Serverless Dashboard: run "serverless"
sample-consumer › Running "serverless info --verbose --stage dev"
sample-consumer › Running "serverless" from node_modules
sample-consumer › service: sample-consumer
sample-consumer › stage: dev
sample-consumer › region: ap-northeast-1
sample-consumer › stack: sample-consumer-dev
sample-consumer › functions:
sample-consumer ›   consumer: sample-consumer-dev-consumer
sample-consumer › 
sample-consumer › Stack Outputs:
sample-consumer ›   ConsumerLambdaFunctionQualifiedArn: arn:aws:lambda:ap-northeast-1:xxxxxxxxxxxx:function:sample-consumer-dev-consumer:3
sample-consumer ›   queueUrl: https://sqs.ap-northeast-1.amazonaws.com/xxxxxxxxxxxx/sample-queue
sample-consumer ›   ServerlessDeploymentBucketName: sample-consumer-dev-serverlessdeploymentbucket-1evr1u4mpg86u
sample-consumer › deployed
sample-api › deploying
sample-api › Running "serverless deploy --stage dev --param sampleQueueUrl=https://sqs.ap-northeast-1.amazonaws.com/xxxxxxxxxxxx/sample-queue"
sample-api › Running "serverless" from node_modules
sample-api › Deploying sample-api to stage dev (ap-northeast-1)
sample-api › ✔ Service deployed to stack sample-api-dev (127s)
sample-api › endpoint: POST - https://xxxxxxx.execute-api.ap-northeast-1.amazonaws.com/dev/message
sample-api › functions:
sample-api ›   pushMessage: sample-api-dev-pushMessage (1.8 MB)
sample-api › Toggle on monitoring with the Serverless Dashboard: run "serverless"
sample-api › Running "serverless info --verbose --stage dev --param sampleQueueUrl=https://sqs.ap-northeast-1.amazonaws.com/xxxxxxxxxxxx/sample-queue"
sample-api › Running "serverless" from node_modules
sample-api › service: sample-api
sample-api › stage: dev
sample-api › region: ap-northeast-1
sample-api › stack: sample-api-dev
sample-api › endpoint: POST - https://xxxxxxx.execute-api.ap-northeast-1.amazonaws.com/dev/message
sample-api › functions:
sample-api ›   pushMessage: sample-api-dev-pushMessage
sample-api › 
sample-api › Stack Outputs:
sample-api ›   PushMessageLambdaFunctionQualifiedArn: arn:aws:lambda:ap-northeast-1:xxxxxxxxxxxx:function:sample-api-dev-pushMessage:4
sample-api ›   ServiceEndpoint: https://xxxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/dev
sample-api ›   ServerlessDeploymentBucketName: sample-api-dev-serverlessdeploymentbucket-cr4j22nyidck
sample-api › deployed
```

このようにServerless Framework Composeがサービス間の依存関係を検知して、sample-consumer -> sample-apiの順序でデプロイしていることが分かります。

なお、CloudFormation的には、1つのスタックになる訳ではなく以前と同じように各サービスは別スタックとして作成されます[^1]。

[^1]: 依存関係として指定したSQSの環境変数の部分は、`Fn:ImportValue`が使われるのではなく、Serverless Framework Composeが固定値として設定していました。

アンデプロイも同様にルートディレクトリから`serverless remove`でまとめてアンデプロイできます。

## まとめ

Serverless Framework Composeを使って、複数のserverless.ymlをまとめてデプロイできるようになりました。
`serverless.yml`を分割したいけど、デプロイの管理が面倒というプロジェクトでは大きな効果を発揮できそうな機能ですね。
是非活用していきたいところです。

ただし、`serverless-compose.yml`で使える変数には制限もあります。現時点では`${sls:stage}`/`${env:xxxxx}`以外は使えないので注意しましょう。

- <https://www.serverless.com/framework/docs/guides/compose#configuration>

---
参照資料

- [Serverless Framework Compose ドキュメント](https://www.serverless.com/framework/docs/guides/compose/)