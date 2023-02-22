---
title: Lambda SnapStartをServerless Frameworkでデプロイする
author: noboru-kudo
date: 2022-12-21
tags: [serverless-framework, lambda, AWS, java, サーバーレス]
---

先日、AWSからLambda SnapStartの発表がありました。

- [Accelerate Your Lambda Functions with Lambda SnapStart](https://aws.amazon.com/blogs/aws/new-accelerate-your-lambda-functions-with-lambda-snapstart/)
- [(邦訳)Lambda SnapStart で Lambda 関数を高速化](https://aws.amazon.com/jp/blogs/news/new-accelerate-your-lambda-functions-with-lambda-snapstart/)

この発表は、LambdaでのJava(含むJVM言語)の存在感を高めるきっかけとなりそうです。

GraalVMは別にして、一般的にJavaで作成したアプリケーションは起動に時間がかかります。
このため、他の言語と比較してJavaはLambdaのコールドスタートのペナルティが大きく、実装言語として採用しにくい傾向があると思います[^1]。

[^1]: 採用する場合でも、(コストと引き換えに)[Provisioned Concurrency](https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html)を使って一定数のLambda関数を常時Warm状態にしておくなどの工夫が必要なケースも多いと思います。

Lambda SnapStart(以下SnapStart)は、この流れを変える機能です。
SnapStartは、あらかじめ初期化(Init)フェーズを実行し、その状態をスナップショットとして保存します。
実際のコールドスタートは、このスナップショットから復元(Restoreフェーズ)して実行(Invokeフェーズ)します。
これによって、SnapStartのコールドスタートは劇的に速くなります。

今回は、[Serverless Framework](https://www.serverless.com/)を使ってSnapStartを試してみたい思います。

:::info
SnapStartはJavaのCRaC(Coordinated Restore at Checkpoint)を基盤技術としています。
CRaCは本サイトの以下記事で詳細に説明されていますので、興味のある方は是非ご参照ください。

- [CRaCによるJavaの高速化](/blogs/2022/12/02/jdk-crac/)
:::


## Serverless Frameworkを導入する

まずは、Serverless Frameworkをインストールしておきます。
ただ、執筆時点ではServerless FrameworkはSnapStartに対応しておらず、そのままでは利用できません。

とはいえ、コードベース(mainブランチ)では既にSnapStart対応がマージされており、次のv3.26.0に含まれそうです。

- [GitHub - Serverless Framework - SnapStart PR](https://github.com/serverless/serverless/pull/11576)

ここでは、SnapStart対応が含まれるスナップショットバージョンを指定して、Serverless Frameworkをインストールしました。

```shell
npm install -g serverless@3.25.1-968ddd59
serverless -v
> Framework Core: 3.25.1-968ddd59
> Plugin: 6.2.2-47374d46
> SDK: 4.3.2
```

:::info:更新情報
2022-12-22に、SnapStart対応のServerless Frameworkのv3.26.0がリリースされています。
現在は上記のようにバージョンを直接指定する必要はありません。最新の安定版でSnapStartが利用できます。
:::

## サンプルのLambda関数を作成する

今回はJavaマイクロサービスフレームワークの[Micronaut](https://micronaut.io/)を使用して、Lambda関数を作成します。

```shell
# SdkManでMicronaut CLIインストール
sdk install micronaut
# MicronautでLambda関数のテンプレート生成
mn create-function-app com.mamezou.lambda-snapstart \
  --features=aws-lambda --build=gradle --lang=java
```

`lambda-snapstart`というディレクトリが作成され、その中にGradleビルドファイル[^2]やLambdaイベントハンドラ等、ソースコード一式が出力されます。

[^2]: プロジェクト生成時にビルドツール(`--build`)として`gradle`を指定しているためです。Mavenを使う場合は`maven`を指定してください。

ただSnapStartを動かすだけであれば、これだけでも十分です。
せっかくなので今回は、以下ドキュメントに従ってCRaCのRuntime Hooksでログ出力するようにします。

- [AWS Lambda Doc - Runtime hooks for Lambda SnapStart](https://docs.aws.amazon.com/lambda/latest/dg/snapstart-runtime-hooks.html)

修正後のソースコードは以下です。

### build.gradle

CRaCのライブラリを依存関係に追加します。

```groovy
dependencies {
    // ...
    // add crac library
    implementation group: 'io.github.crac', name: 'org-crac', version: '0.1.3'
}
```

### FunctionRequestHandler.java

ここではイベントハンドラ自体でSnapStart(CRaC)のフックも処理するようにします。
先程Micronautにイベントハンドラは既に作成されていますので、必要な場所のみを修正していきます。

以下はimport文を省略したソースコードです。

```java
public class FunctionRequestHandler extends MicronautRequestHandler<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent>
        implements Resource { // Interface追加

    @Inject
    ObjectMapper objectMapper;

    // Resource登録
    public FunctionRequestHandler() {
        Core.getGlobalContext().register(this);
    }

    @Override
    public APIGatewayProxyResponseEvent execute(APIGatewayProxyRequestEvent input) {
        APIGatewayProxyResponseEvent response = new APIGatewayProxyResponseEvent();
        try {
            System.out.println("INVOKE");
            String json = objectMapper.writeValueAsString(Collections.singletonMap("message", "Hello World"));
            response.setStatusCode(200);
            response.setBody(json);
        } catch (JsonProcessingException e) {
            response.setStatusCode(500);
        }
        return response;
    }

    // CRaC Runtime Hooks追加
    @Override
    public void beforeCheckpoint(Context<? extends Resource> context) {
        System.out.println("BEFORE CHECKPOINT");
    }

    @Override
    public void afterRestore(Context<? extends Resource> context) {
        System.out.println("AFTER RESTORE");
    }
}
```

イベントハンドラに`org.crac.Resource`をimplementsして、各Runtime Hooksメソッドを追加します。
また、コンストラクタでは`org.crac.Core`を使って、CRaCのグローバルコンテキストに自分自身(Resource)を登録しておきます。

ここでは、Lambdaの実行(Invoke)フェーズに加えて、CRaCのbeforeCheckpoint、afterRestoreフックでログ出力をするようにしています。

CRaCのRuntime Hooksの詳細や使い所は、本サイトの以下記事を参照してください。

- [CRaCによるJavaの高速化 - CRaCのAPIを使ってイベントをフックする](/blogs/2022/12/02/jdk-crac/#cracのapiを使ってイベントをフックする)

SnapStartでは、初期化(Init)フェーズで、beforeCheckpointイベント、コールドスタート時にafterRestoreイベントが実行されます。

ビルドは以下のようにします。

```shell
./gradlew shadowJar
```

`build/libs`配下に、依存関係も含めたオールインワンのJarファイル(`lambda-snapstart-0.1-all.jar`)が作成されます。

Micronaut初めて使ってみたのですが、このあたりの設定含めて全てやってくれて後はデプロイするだけ。簡単でいいですね。

## Serverless Frameworkをセットアップする

サンプルのLambda関数ができましたので、Serverless FrameworkでLambdaの設定をします。
プロジェクトルートに以下のserverless.ymlを作成しました。

```yaml
service: lambda-snapstart-sls
frameworkVersion: '3'
provider:
  name: aws
  stage: dev
  region: ap-northeast-1
  runtime: java11 # Corretto
package:
  artifact: build/libs/lambda-snapstart-0.1-all.jar # all-in-one Jar
functions:
  HelloWorld:
    handler: com.mamezou.FunctionRequestHandler
    url: true # Lambda Function URL有効
    snapStart: true # Lambda SnapStart有効
```

ポイントは`snapStart: true`の部分です。
これを指定すると最新のServerless FrameworkはSnapStartが有効と認識します。
また、ここではAPI Gatewayは使用せずに、Lambda Function URL[^3]を有効としてLambda関数のみで直接HTTPリクエストを処理できるようにしました。

[^3]: Lambda Function URLの詳細は[こちら](/blogs/2022/04/14/lambda-function-url/)の記事をご参考ください。

デプロイ前に、この設定がどのようなものとなるのかを確認します。
以下のコマンドで、Serverless Frameworkが実際に適用するCloud Formationスタックのテンプレートを見てみます。

```shell
serverless package
```

`.serverless`ディレクトリが作成され、その中にCloud Formationスタックのテンプレート(`cloudformation-template-update-stack.json`)が配置されます。
以下、SnapStartに関連する部分を抜粋しました。

```json
{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Description": "The AWS CloudFormation template for this Serverless application",
  "Resources": {
    // (中略)
    "HelloWorldLambdaFunction": {
      "Type": "AWS::Lambda::Function",
      "Properties": {
        // (中略)
        "Handler": "com.mamezou.FunctionRequestHandler",
        "Runtime": "java11",
        "FunctionName": "lambda-snapstart-sls-dev-HelloWorld",
        "MemorySize": 1024,
        "Timeout": 6,
        "Role": {
          "Fn::GetAtt": [
            "IamRoleLambdaExecution",
            "Arn"
          ]
        },
        // SnapStart指定
        "SnapStart": {
          "ApplyOn": "PublishedVersions"
        }
      },
      "DependsOn": [
        "HelloWorldLogGroup"
      ]
    },
    // (中略)
    // デプロイバージョンを指定したLambdaエイリアス作成
    "HelloWorldSnapStartLambdaAlias": {
      "Type": "AWS::Lambda::Alias",
      "Properties": {
        "FunctionName": {
          "Ref": "HelloWorldLambdaFunction"
        },
        "FunctionVersion": {
          "Fn::GetAtt": [
            "HelloWorldLambdaVersion9JlRuG7KtZAqYZPRDgQNvYF9skxkm2vMPMLXistT2l8",
            "Version"
          ]
        },
        "Name": "snapstart"
      },
      "DependsOn": "HelloWorldLambdaFunction"
    },
  },
  // (以降省略)
}
```

Lambda関数(AWS::Lambda::Function)リソースで`SnapStart`が追加されています。
ここで`ApplyOn`に`PublishedVersions`を指定することで、デプロイ時にLambda関数のスナップショットを取得するようになります。
この設定の詳細は、以下CloudFormationの公式リファレンスを参照してください。

- [AWS CloudFormationリファレンス- AWS::Lambda::Function SnapStart](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-lambda-function-snapstart.html)

もう1つは、Lambdaエイリアス(AWS::Lambda::Alias)です。これはSnapStart指定がない場合は作成されないリソースです。
[公式ドキュメント](https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html)にも記載されていますが、SnapStartは公開されたバージョンのエイリアスのみに適用できます。

> You can use SnapStart only on published function versions and aliases that point to versions. You can't use SnapStart on a function's unpublished version ($LATEST).

Serverless Frameworkでは、`snapstart`というエイリアスに対してデプロイ対象のLambda関数のバージョンを紐付けするように構成されるようです。
再デプロイした場合も、このエイリアスに更新バージョンのLambdaが紐付けされます。

Lambdaエイリアス自体の詳細については、以下公式ドキュメントを参照してください。

- [AWS Lambdaドキュメント - Lambda function aliases](https://docs.aws.amazon.com/lambda/latest/dg/configuration-aliases.html)

## SnapStartを有効にしたLambda関数をデプロイする

内部の仕組みが理解できたところで、早速SnapStartを有効にしたLambda関数をデプロイします。
デプロイ自体は、通常のServerless Frameworkの手順と変わりません。

```shell
serverless deploy
```

デプロイが成功したら、AWSマネジメントコンソールよりLambda関数を確認してみます。

![AWS Console - Lambda SnapStart](https://i.gyazo.com/a48386b825e283431b921bac73382460.png)

SnapStartが有効になっていることが分かります。
Lambdaエイリアスの方も確認します。

![AWS Console - Lambda Alias](https://i.gyazo.com/aea071a4e1ae26d234e7a8125a378cee.png)

エイリアス`snapstart`が作成され、デプロイしたLambda関数のバージョンに100%の割合で振り向けられています。

通常のLambdaと異なり、SnapStartの場合はこのデプロイ時点でLambdaの初期化(Init)フェーズが実行されているはずです。
CloudWatchでログを確認します。

![AWS CloudWatch - Lambda SnapStart Init phase](https://i.gyazo.com/a9d5e66c2084886b3b0eaaac5988d0b0.png)

この段階でInitフェーズが実行されているのが確認できます。
ただ、どういう理由か分かりませんが、Initフェーズは複数回(ここでは4回)実行されます。AZ数分初期化が実行されるのかと思い、何回かデプロイしてみましたが、そうでもないようです。

とはいえ、beforeCheckpointフックやINIT_REPORTのログは出力されませんでした。何度か試してみましたが出たり出なかったり。。。InitフェーズのCloudWatchのログは出力されないこともあるようです[^4]。
ただ、ログに出ていなくてもbeforeCheckpointフック自体は実行されているようでした。現時点ではこのフックは意図しないタイミングで実行されそうなので、これに頼るのはやめたほうが良さそうです。

[^4]: このログ欠落の現象はDevelopersIOの記事でも紹介されていました。
[SnapStartでリストアされたLambda実行環境はスナップショット取得時と同じMACアドレスを利用する](https://dev.classmethod.jp/articles/snapstart-use-same-macaddress/)

この謎の事象は忘れて、デプロイしたLambda関数を実行してみます。
ここではLambda Function URLを有効にしていますので、curlでLambda関数の公開URLを叩いてみます。

```shell
# AWSコンソールからはエイリアス:snapstart選択 -> 設定 -> 関数URLで参照できます 
LAMBDA_URL=$(aws lambda get-function-url-config --function-name lambda-snapstart-sls-dev-HelloWorld:snapstart \
  --query FunctionUrl --output text)

curl ${LAMBDA_URL}
> {"message":"Hello World"}
```

正常にレスポンスが返ってきました。
CloudWatchよりLambda関数のログを確認してみます。

![AWS CloudWatch - Lambda SnapStart Restore/Invoke phase](https://i.gyazo.com/2b785e77bb454bf657efa96c6608ec3d.png)

初回アクセスですが、復元(Restore)フェーズから実行されているのが分かります。
この復元フェーズでかかった時間はわずか207msです。

もちろん一定時間経過後のコールドスタートも同様で、スナップショットから復元されて実行されるため速度は変わりません。
今まで他言語と比較して劣っていたJavaのコールドスタートペナルティが解消されています。

参考までに、同じソースコードでSnapStartを無効にした場合のログ出力内容も掲載します。

![AWS CloudWatch - Normal Lambda](https://i.gyazo.com/a3b5ec12cf5d70b9b3199cecdf168716.png)

Lambda関数の実行時間に大きな差はありませんが、初期化処理に3秒近くかかっています。
SnapStart有効時は207ms(復元フェーズ)あれば実行できていましたので、SnapStartを無効にするとより大きなコールドスタートペナルティが発生していることが分かります。

## 最後に

万能のように見えるSnapStartですが、いくつか注意事項もあります。

まず、初期化処理(イベントハンドラ外)で一意な値を生成する場合です。SnapStartではスナップショットを再利用するためこの常識は通用しません。
一意な値は実行(Invoke)フェーズで生成するか、Runtime Hooks(afterRestoreイベント)を使うなどの考慮が必要です。

- [AWS Lambda Doc - Handling uniqueness with Lambda SnapStart](https://docs.aws.amazon.com/lambda/latest/dg/snapstart-uniqueness.html)

また、初期化処理で外部ネットワークコネクションを確立している場合は、スナップショット復元時にもこれが有効であることは保証されていません。
イベントハンドラで再接続機能を保持する必要があります(といってもこれはSnapStartに限定した話ではないと思いますが)。

さらに、SnapStart自体の制約にも注意が必要です。Provisioned Concurrencyと併用不可や、AWS X-Ray/ARMアーキテクチャ等利用できない機能もあります。
詳細はLambdaの[公式ドキュメント](https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html)に記載があります。

> SnapStart does not support provisioned concurrency, the arm64 architecture, the Lambda Extensions API, Amazon Elastic File System (Amazon EFS), AWS X-Ray, or ephemeral storage greater than 512 MB.

> SnapStartは、プロビジョニングされた同時実行、arm64アーキテクチャ、Lambda Extensions API、Amazon Elastic File System（Amazon EFS）、AWS X-Ray、512 MBを超えるエフェメラルストレージをサポートしません。

特にクリティカルなLambda関数では、SnapStartではなくProvisioned Concurrencyを使用した方が良いかもしれません。
AWSの[公式ドキュメント](https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html)では、以下のように言及されています。

> Use provisioned concurrency if your application has strict cold start latency requirements. You can't use both SnapStart and provisioned concurrency on the same function version.

> コールドスタートのレイテンシ要件が厳しいアプリケーションでは、プロビジョニングされた同時 実行を使用してください。同じ機能バージョンで、SnapStartとプロビジョニングされた同時実行の両方を使用することはできません。

これを理解した上でSnapStartをうまく使っていくと、ソリューションの幅も広がっていくと思います。
特に今回使ってみたMicronautにとっては、SnapStartはかなりの追い風となることは間違いないでしょうね。
