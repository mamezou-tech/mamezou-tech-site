---
title: Rust + AWS Lambdaを使ってSlackでChatGPTと会話する
author: noboru-kudo
date: 2023-04-15
tags: [サーバーレス, lambda, AWS, chatgpt, slack, rust]
---

以前以下の記事でRustをAWS Lambda上で動かす方法をご紹介しました。

- [Rustで書いたコードをAWS Lambdaにデプロイする](/blogs/2023/03/19/aws-lambda-with-rust/)

これを使って何か実用的なものを開発して、楽しくRustのスキルを上げたいなと思っていました。

そこで、最近のChatGPTブームに乗っかることにしました。
ChatGPT開発元のOpenAIが提供する[Chat API](https://platform.openai.com/docs/guides/chat)を通して、Slack上でChatGPTと会話できる機能をRust + Lambdaで実装してみます。

少しググると無数のSlack+ChatGPTネタの記事がヒットします。今更感のあるテーマで公開するのを悩みましたが、それは考えないことにしましたｗ

また、掲載しているRustのコードは稚拙な感じかもと思いますが、頑張って勉強中ですのでその点はご容赦ください。

## アプリの全体構造

多くの方がSlackの[イベントAPI](https://api.slack.com/apis/connections/events-api)を使って、ChatGPTをチャンネルメンバーとして召喚して、メンションに反応するように実装しているようです。
チャットBotの用途としてはイベントAPIを使うのが適切だと思いますが、今回は実装が簡単なSlackの[Slash Command](https://api.slack.com/interactivity/slash-commands)でワンショットの会話をすることにします。

ここで課題となるのは、Slack APIの初期レスポンスには3秒という制約があるということです。ChatGPT同様にChat APIにとって3秒はかなり厳しいです。
とはいえ、Slack APIは後でレスポンスを返すためのURL(response_url)を一緒に連携してくれていますのでこれが使えます。

- [Slack API Doc - Handling user interaction in your Slack apps](https://api.slack.com/interactivity/handling#message_responses)

全体構成は以下のイメージになります。

![slack lambda interaction](https://i.gyazo.com/6bb6ef36e52ece4e75a67559d12ae7dc.png)

上記のように、Lambda以外のAWSリソースは極力使わない最もシンプルな構成にします。

LambdaはSlackからのリクエストを受け付けるもの(chatgpt-slack-gateway)と、実際にChat APIを実行するもの(chatgpt-api-caller)の2本用意します。
chatgpt-slack-gatewayの方は、後続のchatgpt-api-callerを非同期実行しつつもすぐに200レスポンスをSlackに返し、3秒制約を回避します。
また、LambdaはRustで書くので、コールドスタート起因の3秒超過の心配はほぼ皆無です。

:::alert:発生する費用 
OpenAIのAPIは$5(少し前だと$18)の試用期間(3ヶ月)がありますが、その後はリクエスト、レスポンスのトークン量に対する課金が発生します。

- [OpenAI - Pricing](https://openai.com/pricing)

現時点でChat API(gpt-3.5-turbo)は$0.002 / 1Kトークンとかなり安いですが、予想外の課金が発生しないようご注意ください。
課金設定をしている場合は、OpenAIのアカウント設定で、事前に上限値を指定しておくことをお勧めします。

もちろんOpenAI APIだけでなく、AWS Lambdaの費用もあります。
内部で使うChat APIは実行時間が長いです。アクセス数が多いとLambdaにもそれなりの費用が発生することになりますのでご注意ください。
:::

## Rustプロジェクトをセットアップする

[cargo-lambda](https://github.com/cargo-lambda/cargo-lambda)のCargoサブコマンドを使ってセットアップします。

```shell
cargo lambda new slack-gpt-lambda --http apigw_http
cd slack-gpt-lambda/
```

RustのLambdaプロジェクトの雛形が生成されます。
その後必要となる各種ライブラリをインストールします。
今回は以下の依存ライブラリを指定しました。

```toml
# Cargo.toml
# 省略
[dependencies]
async-openai = "0.10.2"
aws-config = "0.55.0"
aws-sdk-lambda = "0.25.1"
aws-sdk-ssm = "0.25.1"
aws_lambda_events = "0.8.3"
lambda_http = { version = "0.8.0", default-features = false, features = ["apigw_http"] }
lambda_runtime = "0.8.0"
reqwest = { version = "0.11.16", default-features = false, features = ["json", "rustls-tls"] }
serde = { version = "1.0.160", features = ["derive"] }
serde_qs = "0.12.0"
tokio = { version = "1", features = ["macros"] }
tracing = { version = "0.1", features = ["log"] }
tracing-subscriber = { version = "0.3", default-features = false, features = ["fmt"] }
```

詳細な説明は省きますが、[async-openai](https://github.com/64bit/async-openai)が、今回利用する非公式のOpenAI APIライブラリです。

## Lambda関数のソースコードを実装する

前述の通り今回は複数Lambdaを配置します。`src/bin`ディレクトリを作成し、ここにLambda関数のソースコードを配置します。

以下3つのソースファイルを作成しました。

- `src/bin/chatgpt_slack_gateway.rs`: Slackからの呼び出しを受け付ける(関数名: chatgpt-slack-gateway)
- `src/bin/chatgpt_api_caller.rs`: OpenAIのChat APIの呼び出してSlackに返す(関数名: chatgpt-api-caller)
- `src/lib.rs`: 共通ライブラリ(chatgpt_api_callerのインターフェース)

### Slackリクエスト受付(chatgpt_slack_gateway.rs)

```rust
use aws_lambda_events::serde_json;
use aws_sdk_lambda::primitives::Blob;
use aws_sdk_lambda::types::InvocationType;
use slack_gpt_lambda::SlackRequest;
use lambda_http::{run, service_fn, Body, Error, Request, Response};
use serde_json::json;

/// Lambda イベントハンドラ
async fn function_handler(
    event: Request,
    client: &aws_sdk_lambda::Client,
) -> Result<Response<Body>, Error> {
    // 1. Slackからのリクエスト解析
    let params: SlackRequest = serde_qs::from_bytes(event.body()).unwrap();
    let payload = serde_json::to_vec(&json!({
        "response_url": params.response_url, // 後でレスポンスを返すURL
        "text": params.text // 問い合わせ内容
    }))?;

    // 2. chatgpt-api-caller関数を非同期で呼出
    client
        .invoke()
        .function_name("chatgpt-api-caller")
        .invocation_type(InvocationType::Event)
        .payload(Blob::new(payload))
        .send()
        .await?;

    // 3. Slackへのレスポンス返却
    let resp = Response::builder()
        .status(200)
        .header("content-type", "text/plain")
        .body("...".into())
        .map_err(Box::new)?;
    Ok(resp)
}

/// Lambda初期化
#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .with_target(false)
        .without_time()
        .init();

    let config = aws_config::load_from_env().await;
    let client = aws_sdk_lambda::Client::new(&config);

    run(service_fn(|event| function_handler(event, &client))).await
}
```

以下ソースコード内のインラインコメントに対する説明です。

1. Slack APIからのPostメッセージを解析します。ここではメッセージ内容(text)と返信用のURL(response_url)を取得しています[^1]。
2. OpenAIのChat APIを実行するLambdaに後続処理を移譲します。invocation_typeをEventとすることで非同期に実行します。
3. Slack APIに200レスポンスを返します。OpenAIのChat APIは非同期にしているので、Slackの制約である3秒を超えることはほぼないはずです。

[^1]: Slack APIはコンテンツタイプ`application/x-www-form-urlencoded`で、リクエストを送信してきます。

### OpenAI Chat API呼出(chatgpt_api_caller.rs)

```rust
use async_openai::types::{
    ChatCompletionRequestMessageArgs, CreateChatCompletionRequestArgs, Role,
};
use aws_lambda_events::serde_json::json;
use lambda_runtime::LambdaEvent;
use lambda_runtime::{run, service_fn, Error};
use slack_gpt_lambda::SlackRequest;

const SYSTEM_SETTING: &str = "美少女キャラとしてフレンドリーに話してください。
以下の制約条件を守ってください。

- 「です」「ます」等の敬語は使わない
- AI Chatの一人称は「豆香」を使う
- Userは友達として会話する
";

/// Lambda イベントハンドラ
async fn function_handler(
    event: LambdaEvent<SlackRequest>,
    client: &async_openai::Client,
) -> Result<(), Error> {
    let payload = event.payload;

    // 1. OpenAI Chat APIの呼出
    let request = CreateChatCompletionRequestArgs::default()
        .model("gpt-3.5-turbo")
        .temperature(0.9)
        .messages([
            ChatCompletionRequestMessageArgs::default()
                .content(SYSTEM_SETTING)
                .role(Role::System)
                .build()
                .unwrap(),
            ChatCompletionRequestMessageArgs::default()
                .content(payload.text.clone())
                .role(Role::User)
                .build()
                .unwrap(),
        ])
        .build();
    let resp = client.chat().create(request.unwrap()).await?;
    let content = &resp.choices[0].message.content;

    // 2. Chat APIのレスポンスをSlack投稿
    let text = format!("```\n{command}\n```\n{content}", command = payload.text);
    let json = json!({
        "text": text,
        // "response_type": "in_channel" // チャンネル内のメンバーが参照できるようにする場合コメントアウト解除
    });
    let slack_res = reqwest::Client::default()
        .post(payload.response_url)
        .json(&json)
        .send()
        .await?;

    tracing::info!(res=?slack_res, "slack response");
    let text = &slack_res.text().await?;
    tracing::info!("slack response body, {text}");
    Ok(())
}

/// Lambda初期化
#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .with_target(false)
        .without_time()
        .init();

    // SSMパラメータストアからOpenAIのAPIキーを取得
    let config = aws_config::load_from_env().await;
    let ssm_client = aws_sdk_ssm::Client::new(&config);
    let output = ssm_client
        .get_parameter()
        .with_decryption(true)
        .name("/openai/api-key")
        .send()
        .await
        .expect("cannot get api-key");
    let api_key = output.parameter().unwrap().value().unwrap();
    let openai_client = async_openai::Client::default().with_api_key(api_key.to_string());

    run(service_fn(|event| function_handler(event, &openai_client))).await
}
```

以下ソースコード内のインラインコメントに対する説明です。

1. OpenAIのChat APIを呼出します。ここは同期的な呼出で一定時間待ちます。temperatureパラメータは高めに設定して出力内容に幅を持たせています。
2. 取得したレスポンスをSlackに投稿します。ここで先程Slackから連携されたレスポンス用のURL(response_url)を使います。

また、Chat APIの呼出に必要なAPIキーは、Lambda初期化処理でSSMパラメータストアから取得するようにしました。

今回はOpenAIのAPIでエラー発生時のハンドリングはしていませんので、エラーが発生しても無視されます（ユーザーは永遠に待たされる）。
ちゃんと書く場合は、Slackに返信できない旨の返信をするのが良さそうです。

なお、Chat APIのSystemロールのメッセージで、ChatGPTのキャラクター設定をしています(実はここが一番苦労してたりしますｗ)。
ここで使っている豆香ちゃんは、弊社公式マスコットキャラクター(かもしれない?)です。

### 共通ライブラリ(lib.rs)

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, PartialEq, Deserialize, Serialize)]
pub struct SlackRequest {
    pub text: String,
    pub response_url: String,
}
```

OpenAI Chat API呼出のLambda関数のI/Fとなる構造体です。
Slackからのリクエストに含まれるものをそのまま設定し、JSONにシリアライズされて連携されます。

## 必要なAWSリソースを準備する

今回はLambda以外のリソースは使っていませんが、Lambdaの実行ロールとOpenAIのAPIキーを格納するSSMパラメータストアは別途用意します。

### Lambda実行ロール

Lambda関数で使うサービスロールを作成しておきます。
ロールには、今回必要な以下のポリシーを付けておきます。

- AWSマネージドポリシーのAWSLambdaBasicExecutionRole
- Lambda関数(chatgpt_api_caller)の実行(lambda:InvokeFunction)を許可
- SSMパラメータストア(/openai/api-key)の読み取り(ssm:GetParameter)を許可

作成したIAMロールのARNを取得してCargo.tomlに追記します。

```toml
[package.metadata.lambda.deploy]
role = "arn:aws:iam::xxxxxxxxxxxx:role/gpt-lambda-role"
```

cargo-lambdaはこのエントリーがある場合にデプロイ時のパラメータとして使用してくれます。

- [cargo-lambda Doc - Deploy configuration in Cargo's Metadata](https://www.cargo-lambda.info/commands/deploy.html#deploy-configuration-in-cargo-s-metadata)

### SSMパラメータストア

OpenAIのAPIにはAPIキーが必要です。事前にOpenAIアカウントからAPIキーを作成します。

- [OpenAI - API key](https://platform.openai.com/account/api-keys)

ここで作成したAPIキーをSSMパラメータストアのパス`/openai/api-key`にOpenAIのAPIキーを登録しておきます。

![SSM](https://i.gyazo.com/0fc026cf15e6808588f9903dbf243b85.png)

OpenAI Chat API呼出関数(chatgpt-api-caller)の初期化処理でこれを取得するようにしています。

## AWS Lambda関数をビルド&デプロイする

AWSインフラ回りの準備ができましたので、Lambda関数をデプロイします。

まずは、cargo-lambdaのコマンドでビルドします。

```shell
cargo lambda build --release
```

`target/lambda`ディレクトリ配下に、2つのLambda関数の実行可能ファイルが出力されます。
後はデプロイするだけです。デプロイもcargo-lambdaのdeployコマンドを使います。

```shell
# chatgpt-slack-gateway
cargo lambda deploy --enable-function-url \
  --binary-name=chatgpt_slack_gateway \
  chatgpt-slack-gateway --timeout 3
# chatgpt-api-caller
cargo lambda deploy --binary-name=chatgpt_api_caller \
  chatgpt-api-caller --timeout 60
```

Slackリクエストを受け付けるchatgpt-slack-gateway関数は、Slackの制限に合わせてタイムアウト3秒としています。
一方で、OpenAIのChat APIを実行するchatgpt-api-caller関数は60秒にしています。デフォルトの30秒だと結構な頻度でタイムアウトしました。

また、chatgpt-slack-gateway関数の方には、`--enable-function-url`を付けてLambda Function URLを有効にしています。

実行が完了すると、以下2つのLambda関数がデプロイされます。

![lambda](https://i.gyazo.com/a6de785df40427758de8458480065688.png)

## Slack AppでSlash Commandをセットアップする

これでAWS側の準備ができました。後はSlack側のSlash Commandをセットアップするだけです。
これについては、Slackのドキュメントがあります。

- [Slack API Doc - Enabling interactivity with Slash Commands](https://api.slack.com/interactivity/slash-commands)

この通りにSlack appを作成し、Slash Commandの設定をするだけです。
ここではSlash Command設定は以下のようにします。

![Slack app](https://i.gyazo.com/6856eb9969b76073c9c64b0e5e03e7b5.png)

Slash Commandは何でもいいですが、ここでは豆香ちゃんキャラにしたので「/mameka」にしました。

今回API GatewayをLambdaの前に配置していませんので、Request URLにはLambda Function URLを指定します。
これは、chatgpt-slack-gateway関数のAWSマネジメントコンソールから取得できます。

![Lambda Function URL](https://i.gyazo.com/5f1a1163ad1e54867bbf7a716c10f606.png)

## SlackのSlash Commandで会話してみる

後はSlackからChat APIと会話するだけです。
`/mameka`と打ってその後にメッセージを入力するとレスポンスが返ってくるはずです。

![ask](https://i.gyazo.com/c9835c2bfa4f542b9d249be20fe6c7ba.png)

↓

![ask-response](https://i.gyazo.com/b15d56d5e80ee70c681604cc9d995303.png)

Slash Commandのデフォルトでは自分だけにメッセージが見えます[^2]。
日々の密かな楽しみとして活用できることは間違いないでしょう♪

[^2]: チャンネルメンバーも参照できるようにするには、Slackにレスポンスを返すときにメッセージボディに`response_type: in_channel`を追加します。

## まとめ

ここではAWS Lambda+Rustを使って、気軽にSlackからChat APIで会話するようにしてみました。
勉強中のRustでも簡単に実装できました。最近はプログラミング言語の学習用として最適だったTwitter APIが料金体系変更で個人レベルでは事実上使えなくなりました。
OpenAIのAPIは、機械学習のスキルもほぼ不要ですし、何より動くと楽しいです。Twitter APIに代わる新たな学習用の題材として最適だなと思いました。

昔は機械学習/AIの実行環境の構築にはかなりのコストがかかっていましたが、随分身近な存在になったと感じる今日この頃です。
もっと新たな可能性を探っていきたいなと思いました。
