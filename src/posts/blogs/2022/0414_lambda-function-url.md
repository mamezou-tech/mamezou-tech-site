---
title: Lambda Function URLでLambdaをHTTPで直接実行する
author: noboru-kudo
date: 2022-04-14
tags: [AWS, サーバーレス, ServerlessFramework]
---

2022/04/06 AWSはLambdaをHTTPで直接呼び出す機能追加を発表しました。

- [Announcing AWS Lambda Function URLs: Built-in HTTPS Endpoints for Single-Function Microservices](https://aws.amazon.com/jp/blogs/aws/announcing-aws-lambda-function-urls-built-in-https-endpoints-for-single-function-microservices/)

今まではLambdaをHTTPベースで呼び出す場合は、API GatewayやALB(Application Load Balancer)を経由する必要がありましたが、Lambda Function URLという新たな選択肢ができました。
サーバーレス環境のプロビジョニングツールの[Serverless Framework](https://www.serverless.com/framework)も、すぐにv3.12.0からLambda Function URLに対応しました。

- [AWS Lambda Function URLs with Serverless Framework](https://www.serverless.com/blog/aws-lambda-function-urls-with-serverless-framework)

今回はこの新機能を試してみます。

[[TOC]]

## 事前準備

Serverless Frameworkは、現時点で最新の3.13.0を使用します。

```shell
npm install -g serverless@3.13.0
serverless --version
```
```
Framework Core: 3.13.0
Plugin: 6.2.1
SDK: 4.3.2
```

## プロジェクト作成

Serverless FrameworkのCLIで作成します。今回は`aws-nodejs`のテンプレートを使用します。

```shell
serverless create --template aws-nodejs \
  --path lambda-function-url
```

`lambda-function-url`ディレクトリが作成され、サンプルのLambdaとserverless.ymlが配置されます。
ここで作成されるサンプルLambdaを、API Gateway経由でなくLambda Function URLを使うように設定します。

## Lambda Function URL有効化

Serverless Frameworkで作成された`lambda-function-url/serverless.yml`を編集して、Lambda Function URLに変更します。

```yaml
provider:
  name: aws
  # Node14+東京リージョン
  runtime: nodejs14.x
  region: ap-northeast-1
functions:
  hello:
    handler: handler.hello
    # Lambda Function URL使用
    url: true
```

重要な変更点は`url: true`です。
API Gatewayを使う場合は`events.http`配下にAPI Gatewayのパス等の設定を記述していましたが、Lambda Function URLはこれだけで十分です。

## CloudFormationテンプレートの確認

後はデプロイするだけですが、せっかくなのでServerless Frameworkが生成するCloud Formationのテンプレートも見てみます。

```shell
serverless package
```

`lambda-function-url/.serverless/cloudformation-template-update-stack.json`のCloud Formationのテンプレートを確認します。
以下該当部分のみを抜粋します。

```json
{
  "HelloLambdaFunctionUrl": {
    "Type": "AWS::Lambda::Url",
    "Properties": {
      "AuthType": "NONE",
      "TargetFunctionArn": {
        "Fn::GetAtt": [
          "HelloLambdaFunction",
          "Arn"
        ]
      }
    }
  }
}
```

CloudFormationリソースとして`AWS::Lambda::Url`が追加されているのが確認できます。
今回は認証設定をしていないので`NONE`となっていますが、IAM認証もできます(Cognito等はできません)。
CloudFormationテンプレートの詳細は[公式ドキュメント](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-lambda-url.html)を参照してください。

## Serverless Frameworkでデプロイ

では、これをデプロイしてみます。

```shell
serverless deploy
```
```
Deploying lambda-function-url to stage dev (ap-northeast-1)

✔ Service deployed to stack lambda-function-url-dev (117s)

endpoint: https://xxxxxxxxxxxxxxxxxx.lambda-url.ap-northeast-1.on.aws/
functions:
  hello: lambda-function-url-dev-hello (392 B)
```

Serverless Frameworkの出力結果にエンドポイントが表示されています。公式ドキュメントによると、Lambda Function URLは以下の形式でURLが生成されるようです。
これはLambdaを再作成しなければ変わることはありません。

> https://\<url-id\>.lambda-url.\<region\>.on.aws

このエンドポイントにcurlでアクセスしてみます。

```shell
curl https://xxxxxxxxxxxxxxxxxx.lambda-url.ap-northeast-1.on.aws/
```
```
{
  "message": "Go Serverless v1.0! Your function executed successfully!",
  "input": {
    "version": "2.0",
    "routeKey": "$default",
    "rawPath": "/",
# 以下省略
```
API Gatewayなしで直接Lambdaにアクセスできることが分かります。
レスポンスの形式もLambdaで返しているフォーマットではなく、通常のREST APIアクセスと変わりません(サンプルのLambdaはeventの中身も出力しているので見にくいですが)。

ドキュメントを確認すると、Lambda上のI/FはAPI Gateway(Lambda Proxy)互換のリクエスト・レスポンスフォーマットをそのまま利用できます。
実際のクライアントリクエスト、レスポンスのマッピングはLambda Function URLが行います。
以下の公式ドキュメントにマッピングの詳細が記載されていますので、興味のある方は参照してください。

- [Invoking Lambda function URLs](https://docs.aws.amazon.com/lambda/latest/dg/urls-invocation.html)
- [Working with AWS Lambda proxy integrations for HTTP APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html)

AWS マネジメントコンソールでは、以下のようにLambda Function URLのエンドポイントや設定を確認できます。
![](https://i.gyazo.com/d20e74c52e9edba983d1f2e3bc787faf.png)

## CORSを設定する

Lambda Function URLはランダムなドメインが割り当てられますので、ブラウザから直接アクセスする場合はCORS対策が欠かせません。
Lambda Function URLはCORSにも対応していますので、これを試してみます。
serverless.ymlを以下のように修正します。

```yaml
functions:
  hello:
    handler: handler.hello
    url:
      # Lambda Function URLのCORS設定
      cors:
        allowedOrigins: https://www.example.com
        allowedMethods: PUT
        allowedHeaders: Content-Type,Authorization
        allowCredentials: true
```
`cors`をオブジェクト型として、CORSの各種ヘッダを設定します。
設定可能なCORSヘッダはLambda Function URLの[公式ドキュメント](https://docs.aws.amazon.com/lambda/latest/dg/urls-configuration.html#urls-cors)を参照してください。
これでデプロイして、curlでpre-flightリクエスト(OPTIONSメソッド)をエミュレートしてみます。

```shell
curl -X OPTIONS --head \
  -H 'Origin: https://www.example.com' \
  -H 'Access-Control-Request-Method: PUT' \
    https://xxxxxxxxxxxxxxxxxx.lambda-url.ap-northeast-1.on.aws/
```
```
HTTP/1.1 200 OK
Date: Thu, 14 Apr 2022 05:32:06 GMT
Content-Type: application/json
Content-Length: 0
Connection: keep-alive
x-amzn-RequestId: d78cb417-d306-455e-ac1e-deafa1bf04a8
Access-Control-Allow-Origin: https://www.example.com
Access-Control-Allow-Headers: content-type,authorization
Vary: Origin
Access-Control-Allow-Methods: PUT
Access-Control-Allow-Credentials: true
```
CORS関連のレスポンスヘッダが、Lambda Function URLによって付与されていることが分かります。

このCORSの設定は、マネジメントコンソール上でも確認できます。

![](https://i.gyazo.com/8c48e2ae79bf4e21400f716bef33f753.png)

## まとめ

今までLambdaをHTTPアクセスするためには、API Gateway等の別のリソースを使う必要がありましたが、Lambda Function URLを使うとLambda単体でお手軽にサーバーレス環境を構築できるようになりました。

ただし、Lambda Function URLはAPI Gatewayを置き換えるものではありません。
API Gatewayのような高度なマッピングやキャッシュ、IAM以外の認証は基本できません(Lambda内で頑張るしかない)。

Serverless Frameworkの[公式ブログ](https://www.serverless.com/blog/aws-lambda-function-urls-with-serverless-framework)に適切なユースケースについて言及されていますのでご参考ください。

- Express.js等のフレームワークを使ってLambda内でリクエストルーティングをするケース(単一関数)
- シンプルなWebHook
- SSRのバックエンド(Nuxt.js, Next.js等)
- API Gatewayの29秒タイムアウトを超えるAPI(Lambdaの最大タイムアウト15分を適用可)

Lambda Function URLのHTTPはあくまで同期通信で、システム間連携等で乱用するとシステム全体の可用性を下げる結果となりますので注意したいところです。

---
参照資料

- [Lambda function URL公式ドキュメント](https://docs.aws.amazon.com/lambda/latest/dg/lambda-urls.html)