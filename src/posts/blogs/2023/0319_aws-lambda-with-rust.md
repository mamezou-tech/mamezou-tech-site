---
title: Rustで書いたコードをAWS Lambdaにデプロイする
author: noboru-kudo
date: 2023-03-19
tags: [rust, サーバーレス, lambda, AWS, aws-cdk, IaC]
---

最近のRustの勢いはホントにすごいですね。新サービス・プロダクトの実装言語としてRustを採用したというニュースをあちこちで聞くようになりましたね。
この勢いだとシステムプログラミングの領域だけでなく、エンタープライズ系のシステムにもRustの快進撃が波及してきそうです。

今更感ありますが、筆者もRustaceanになるべくRustのキャッチアップを始めたところです。
最近はバックエンド処理にAWS Lambdaを使うことが多いので、手始めにRustがAWS Lambdaでも動くのかを試してみました。

現時点で、AWS Lambdaのランタイム環境としてRustはネイティブサポートされていません。
とはいえ、Lambdaの[カスタムランタイム](https://docs.aws.amazon.com/lambda/latest/dg/runtimes-custom.html)を使えばRustも動作するはずです。
カスタムランタイムはセットアップが面倒ですが、以下を使えば簡単に実現できそうです。

- [GitHub - awslabs/aws-lambda-rust-runtime](https://github.com/awslabs/aws-lambda-rust-runtime)
- [GitHub - cargo-lambda](https://github.com/cargo-lambda/cargo-lambda)

cargo-lambdaは、Rust向けのLambdaランタイム(aws-lambda-rust-runtime)を使った構成をサポートするCargoサブコマンド群を提供しています。

今回はこれらのツールを使って、RustのコードをLambda関数としてAWSにデプロイしてみたいと思います。

## cargo-lambdaをインストールする
まずはcargo-lambdaをインストールします[^1]。

[^1]: もちろん、Rust自体は事前に[こちら](https://www.rust-lang.org/tools/install)で準備しておきます。

```shell
brew tap cargo-lambda/cargo-lambda
brew install cargo-lambda
# cargo-lambdaのバージョンチェック
cargo lambda --version
```

上記はmacOSのインストール手順です。それ以外の環境は[公式ドキュメント](https://www.cargo-lambda.info/guide/installation.html)を参照してください。
ここでは、現時点で最新のv0.17.2をインストールしました。

## RustのLambdaパッケージを作成する

cargo-lambdaを使ってLambda関数のテンプレートを作成します。
以下のコマンドを実行します。

```shell
# API Gateway(REST)向けのプロジェクト
cargo lambda new sample-rust-lambda --http-feature=apigw_rest
```

`--http-feature=apigw_rest`オプションで、API Gateway(REST API)経由のLambda構成になります[^2]。
コマンド実行が終わると、sample-rust-lambdaというディレクトリに以下のRustパッケージ(バイナリクレート)が作成されます。

[^2]: 具体的には、[lambda_httpクレート](https://docs.rs/crate/lambda_http/0.7.3/features)のフィーチャーフラグに影響していました。

```
.
├── Cargo.toml
└── src
    └── main.rs
```

`src/main.rs`がLambda関数本体です。
なお、`src/bin/*.rs`という形の複数バイナリクレートのパッケージにすれば、複数Lambdaを1パッケージで作成できます。

ここで生成されたソースコードは、以下のようになっていました。

```rust
use lambda_http::{run, service_fn, Body, Error, Request, RequestExt, Response};

/// This is the main body for the function.
/// Write your code inside it.
/// There are some code example in the following URLs:
/// - https://github.com/awslabs/aws-lambda-rust-runtime/tree/main/examples
async fn function_handler(_event: Request) -> Result<Response<Body>, Error> {
    // Extract some useful information from the request

    // Return something that implements IntoResponse.
    // It will be serialized to the right response event automatically by the runtime
    let resp = Response::builder()
        .status(200)
        .header("content-type", "text/html")
        .body("Hello AWS Lambda HTTP request".into())
        .map_err(Box::new)?;
    Ok(resp)
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        // disable printing the name of the module in every log line.
        .with_target(false)
        // disabling time is handy because CloudWatch will add the ingestion time.
        .without_time()
        .init();

    run(service_fn(function_handler)).await
}
```

main関数がLambdaの初期化処理、function_handler関数がイベントハンドラになります。

:::column:HTTP以外のイベントを処理するLambda関数
HTTP以外の場合はイベントタイプ(--event-type)を指定すると、各種イベントに対応したパッケージが作成できます。

例えば、S3イベントでトリガーするLambda関数を作成する場合は以下のようになります。

```shell
cargo lambda new s3-rust-lambda --event-type=s3::S3Event
```

また、パラメータを指定しなければ、対話形式で出力するパッケージのタイプを選択できます。
それ以外に、カスタムテンプレートから作成もできます。詳細は以下公式ドキュメントを参照してください。

- [cargo-lambda Doc - cargo lambda new](https://www.cargo-lambda.info/commands/new.html)
:::


## RustでサンプルのLambda関数を実装する

RustでLambda関数を実装してみます。
今回はHTTPリクエストボディ(JSON)の値をDynamoDBに保存する関数を作ってみます。

まずは、Cargoで必要なライブラリを追加します。

```shell
cargo add aws_sdk_dynamodb aws-config serde uuid --features uuid/v4
```

`src/main.rs`は、以下のように変更しました。

```rust
use std::env;
use std::fmt::Debug;
use lambda_http::{run, service_fn, Body, Error, Request, Response};
use aws_sdk_dynamodb::Client;
use aws_sdk_dynamodb::model::AttributeValue;
use lambda_http::aws_lambda_events::serde_json;
use uuid::Uuid;

#[derive(serde::Deserialize, serde::Serialize, Debug)]
struct User {
    name: String,
    age: u16
}

/// Lambdaイベントハンドラ
async fn function_handler(db_client: &Client, event: Request) -> Result<Response<Body>, Error> {
    let json = std::str::from_utf8(event.body()).expect("illegal body");
    tracing::info!(payload = %json, "JSON Payload received");
    let user = serde_json::from_str::<User>(json).expect("parse error");

    let user_id = Uuid::new_v4();
    let dynamo_req = db_client.put_item()
        .table_name(env::var("USER_TABLE").expect("env(USER_TABLE) not found"))
        .item("user_id", AttributeValue::S(user_id.to_string().into()))
        .item("name", AttributeValue::S(user.name))
        .item("age", AttributeValue::N(user.age.to_string()));

    tracing::info!(user_id = ?user_id,"Sending request to DynamoDB...");
    let result = dynamo_req.send().await.expect("dynamodb error");
    tracing::info!(result = ?result, "DynamoDB Output");
    let resp = Response::builder()
        .status(200)
        .header("content-type", "text/plain")
        .body(user_id.to_string().into())
        .map_err(Box::new)?;
    Ok(resp)
}

/// Lambda初期化処理
#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing::info!("Initializing lambda function(Cold Start)...");
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .with_target(false)
        .without_time()
        .init();

    let client = Client::new(&aws_config::load_from_env().await);
    tracing::info!(client = ?client, "Created DynamoDB");

    run(service_fn(|event| async {
        function_handler(&client, event).await
    })).await
}
```

本題ではないので詳細省きますが、以下のことをしています。
- 初期化処理(main関数) - トレーシング情報初期化 / DynamoDBクライアント作成
- イベントハンドラ(function_handler関数) - リクエストボディ(JSON)をUser構造体にパース / DynamoDBに保存

実際のLambda関数へのビルドは、cargo-lambdaのコマンドを実行します。

```shell
cargo lambda build --release
```

Cargoのリリースビルド(--release)が実行され、`target/lambda`配下にLambdaカスタムランタイムのバイナリが出力されます。

![cargo-lambda ビルド結果](https://i.gyazo.com/6caee3cad381f723c980aa5a24175910.png)

これをLambdaに配置してあげれば良さそうです。
Lambdaへのデプロイもcargo-lambdaのコマンドで実行できます。

```shell
cargo lambda deploy
```

AWSコンソールからも、以下のようにデプロイされたことを確認できました。

![AWS console - Lambda単体](https://i.gyazo.com/5366414335da6f8ce7aa07aa14e5fcf7.png)


## AWS CDKを使ってデプロイする

先程cargo-lambdaを使って、Rustで作成したLambda関数をビルドし、AWS環境へのデプロイまで簡単にできました。
とはいえ、API GatewayやDynamoDBといった関連リソースを作成していないため、そのままでは動作しません。

実運用を見据えると、cargo-lambdaでLambda単体をデプロイするのではなく、IaCツールで関連リソースと一緒にまとめて構成管理したいところです。

調べてみると、cargo-lambdaでAWS CDKのコンストラクトが提供されていました。

- [GitHub - cargo-lambda-cdk](https://github.com/cargo-lambda/cargo-lambda-cdk)

こちらを使ってみます。事前に先程`cargo lambda deploy`で作成したLambdaは、手動で削除しておきます。
ここではRustパッケージ内に、以下コマンドでAWS CDKプロジェクトを作成します。なお、AWS CDKはセットアップ済みであることを前提としています[^4]。

[^4]: 未セットアップの場合は、AWS CDKの[公式ドキュメント](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html)を参照してください。セットアップ後は`cdk bootstrap`でCDKの実行に必要なリソースを事前に配置しておく必要があります。

```shell
mkdir cdk && cd cdk
# TypeScriptのappタイプで作成
cdk init app --language typescript
# cargo-lambdaのコンストラクト導入。ここでは現時点で最新の`0.0.6`
npm install cargo-lambda-cdk
```

生成された`sample-rust-lambda/cdk/lib/cdk-stack.ts`に、AWSリソースの構成を記述していきます。

```typescript
import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Effect } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { RustFunction } from 'cargo-lambda-cdk';

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const stage = this.node.tryGetContext('stage');

    // DynamoDBテーブル
    const userTable = new dynamodb.Table(this, 'UserTable', {
      tableName: `user-table-${stage}`,
      partitionKey: {
        type: AttributeType.STRING,
        name: 'user_id'
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Lambda実行ロール
    const role = new iam.Role(this, 'RustLambdaRole', {
      roleName: 'MyRustLambdaRole',
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
      inlinePolicies: {
        UserTablePut: new iam.PolicyDocument({
          statements: [new iam.PolicyStatement({
            actions: ['dynamodb:PutItem'],
            effect: Effect.ALLOW,
            resources: [`arn:aws:dynamodb:${this.region}:${this.account}:table/user-table-*`]
          })]
        })
      }
    });

    // cargo-lambda: Rust Lambda関数
    const func = new RustFunction(this, 'sample-rust-lambda', {
      manifestPath: '../Cargo.toml',
      functionName: 'sample-rust-lambda',
      description: 'Sample Rust Lambda Function',
      environment: {
        USER_TABLE: userTable.tableName
      },
      role
    });

    // API Gateway(エンドポイント: POST /user)
    const api = new apigateway.RestApi(this, 'MyRustAPI', {
      deployOptions: {
        stageName: stage
      }
    });
    api.root.addResource('user')
      .addMethod('POST', new apigateway.LambdaIntegration(func));

    // CFn Outputs
    new cdk.CfnOutput(this, 'LambdaName', {
      value: func.functionName
    });
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.urlForPath('/user') // APIエンドポイント出力
    });
  }
}
```

少し長いですが、記述内容は自明だと思います。

真ん中くらいにあるRustFunctionが、cargo-lambdaが提供するコンストラクトです。
これがcargo-lambdaのビルドを実行し、CloudFormation経由でLambdaにデプロイします。

それ以外は、AWS CDKで提供されている各コンストラクトを使ってAWSリソース全体の構成を記述しています。

:::column:1パッケージ内に複数Lambdaがある場合(複数バイナリクレート)
Rustパッケージを複数バイナリクレート構成にして複数Lambdaをデプロイする場合は、デプロイする数分だけRustFunctionを記述し、binaryNameにクレート名を設定することで動作しました。

例えば、/userでPOST/GETのエンドポイント(Lambda)を用意する場合は、以下のようになります。

```typescript
// Lambda: POST /user, バイナリクレート: /src/bin/post_user.rs
const postUserFn = new RustFunction(this, 'PostUserFunction', {
  manifestPath: '../Cargo.toml',
  functionName: 'sample-rust-lambda-post-user',
  description: 'User Creation Lambda Function',
  binaryName: 'post_user',
  environment: {
    USER_TABLE: userTable.tableName
  },
  role
});
// Lambda: GET /user, バイナリクレート: /src/bin/get_user.rs
const getUserFn = new RustFunction(this, 'GetUserFunction', {
  manifestPath: '../Cargo.toml',
  functionName: 'sample-rust-lambda-get-user',
  description: 'User Retrieval Lambda Function',
  binaryName: 'get_user',
  environment: {
    USER_TABLE: userTable.tableName
  },
  role
});
// API Gateway
const api = new apigateway.RestApi(this, 'MyRustAPI', {
  deployOptions: {
    stageName: stage
  }
});
const user = api.root.addResource('user')
user.addMethod('POST', new apigateway.LambdaIntegration(postUserFn));
user.addMethod('GET', new apigateway.LambdaIntegration(getUserFn));
```
:::

後はデプロイするだけです。

```shell
cdk deploy --context stage=dev
```

実行が終わると、RustのLambdaに加えて、API GatewayやDynamoDB等の関連するリソースがデプロイされます。
管理コンソールからLambdaの状態を確認してみます。

![AWS Console - Lambda CDK](https://i.gyazo.com/688832458453c2a5d4bfce5fa90df48a.jpg)

カスタムランタイムとしてLambdaがデプロイされている様子が分かります。
また、これのイベントソースとしてAPI Gatewayも紐付けられています。ここでは掲載しませんがDynamoDBのテーブルももちろん作成されています。

デプロイ時に出力されたAPI Gatewayのエンドポイント(ApiEndpoint)にcurlでアクセスしてみます。

```shell
curl https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/dev/hello -d '{"name": "mamezou", "age": 40}'
> 06d84b8e-7d7c-4088-8bfa-87329501ce3e
```

期待通りユーザーIDとしてランダムなUUIDが返却されました。

AWSコンソールよりDynamoDBを見ると該当レコードが追加されていることも分かります。

![AWS Console - DynamoDB](https://i.gyazo.com/34e3c423560c518f9fe7e2eaac4b4023.png)

CloudWatchでLambdaの実行ログも確認しておきます。

![AWS Console - CloudWatch Logs](https://i.gyazo.com/059211aa070e7955a1394ed9bc9247e8.png)

いつも通り初期化(Init)フェーズ、実行(Invoke)フェーズそれぞれのログが確認できます。

## まとめ

今回はcargo-lambdaを使って、Rustで書いたコードをLambdaで動かしてみました。
Lambdaのカスタムランタイムを使っていますが、まるでネイティブサポートされているかのように実装からデプロイまでスムーズにできた感触があります。

Rustの現状の人気を見ると、Lambdaのランタイムとしてサポートされるのは時間の問題とは思いますが、現時点でも十分に実用的な感じがしました。
