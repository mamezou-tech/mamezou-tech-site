---
title: AWS LambdaでAWS AppConfigのフィーチャーフラグを使う
author: noboru-kudo
date: 2023-09-13
tags: [サーバーレス, lambda, AWS]
---

アプリケーションの機能リリースでフィーチャーフラグ(またはフィーチャートグル)を使うことは結構多いかと思います。

このフィーチャーフラグの実装方法としては、単純に環境変数やパラメータで指定するものから専用のマネージドサービスを使うものまで幅広い選択肢があります。

AWSでもAWS Systems Managerの[AWS AppConfig](https://docs.aws.amazon.com/appconfig/)(以下AppConfig)がこれを提供しています。
このAppConfig自体は2021年にリリースされていますが、ググってもあまり情報が見つからず、マイナーな機能と言えそうです。
とはいえ、AppConfigはアプリケーションの機能リリースをデプロイなしに安全に行えるフィーチャーフラグ機能を備えています。

少し思うところがあり、改めてAppConfigを使う方法を調べてみましたのでここで紹介します。

なお、この記事のソースコードは[こちら](https://github.com/kudoh/lambda-app-config-example)で公開しています。

## AppConfigをLambdaで使う方法(Lambda Extension)

ここではAWS LambdaでAppConfigのフィーチャーフラグを読んで、動的に対象機能の有効・無効を切り替えるものを想定します。

AppConfigではセッション開始(StartConfigurationSession)と最新情報取得(GetLatestConfiguration)の2つのAPIを提供しています。
フィーチャーフラグを取得する場合は、まずセッションを開始してから設定情報を取得するという流れになります(API呼び出し間はトークン引き継ぎが必要)。
また、設定が更新されない場合は最新情報取得(GetLatestConfiguration)時にデータが空になりますので、フィーチャーフラグはキャッシュしておくことも必要です。

- [AWS AppConfig Doc - About the AWS AppConfig data plane service](https://docs.aws.amazon.com/appconfig/latest/userguide/about-data-plane.html)
- [AWS AppConfig Doc - Retrieving the configuration](https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-retrieving-the-configuration.html)

というように使い方が少し面倒です。
ただし、Lambdaを使う場合は、この部分はLambda Extensionとして提供されていますのでこの実装を大幅に省略できます。

- [AWS AppConfig Doc - AWS AppConfig integration with Lambda extensions](https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-integration-lambda-extensions.html)

以下は、上記公式ドキュメントからAppConfig Lambda Extensionのアーキテクチャの抜粋です。

![AppConfig Lambda Extension](https://i.gyazo.com/f9626e0cf7f549748574fb6aed00b842.png)

Lambda Extensionが間に入ってAppConfigとのやりとりを仲介してくれている様子が分かります。

## Lambdaイベントハンドラー作成

Lambda関数のソースコードは以下のようになりました。

```typescript
import { APIGatewayProxyHandler } from 'aws-lambda';

type FeatureFlags = {
  [name: string]: {
    enabled: boolean;
  }
}
export const sample: APIGatewayProxyHandler = async (event, context) => {
  // AppConfig ExtensionからFeatureフラグ取得
  const appName = 'sample-app';
  const env = process.env.STAGE;
  const profile = 'default';
  const resp = await fetch(`http://localhost:2772/applications/${appName}/environments/${env}/configurations/${profile}`);
  const flags: FeatureFlags = await resp.json();

  return {
    statusCode: 200,
    body: JSON.stringify({
      flags: {
        featureA: flags.featureA.enabled,
        featureB: flags.featureB.enabled
      }
    }),
    headers: {
      'Content-Type': 'application/json'
    }
  };
};
```

fetch関数を実行しているところポイントです。AWS SDKではなく、AppConfigのLambda Extensionが提供するローカルエンドポイント(`http://localhost:2772`)からフィーチャーフラグを取得しています。
これにより、フィーチャーフラグのローカルキャッシュや定期的(デフォルトは45秒)な最新情報の取得の実装が省略できます。

ポート番号は環境変数で変更可能ですが、ここではデフォルト値の2772をそのまま使っています。
URLのappName(AppConfigアプリケーション名)、env(デプロイメント)、profile(設定プロファイル)はAppConfig側で設定するものです。

このコードでは取得したフィーチャーフラグから`featureA`、`featureB`を取得して、APIレスポンスとして返すだけのものです(実際はこれをもとに振る舞いが変わる想定です)。

## AWSリソース設定(AWS CDK)

リソースのプロビジョニングには[AWS CDK](https://aws.amazon.com/jp/cdk/)を使います。

全体のソースコードは[こちら](https://gist.github.com/kudoh/f6b731844673f4be3c4f87cf03c0d723)です。
少し長いですがやっていることは単純です。

### 1. AWS AppConfig

```typescript
// アプリケーション
const configApp = new appConfig.CfnApplication(this, 'AppConfigSample', {
  name: 'sample-app'
});
// 環境
const devEnv = new appConfig.CfnEnvironment(this, 'AppConfigDev', {
  name: 'dev',
  applicationId: configApp.ref
});
// 設定プロファイル
const appConfigDefault = new appConfig.CfnConfigurationProfile(this, 'AppConfigDefaultProfile', {
  name: 'default',
  applicationId: configApp.ref,
  type: 'AWS.AppConfig.FeatureFlags',
  locationUri: 'hosted'
});
```

AppConfigまわりのリソースです。マイナーサービスゆえかAppConfigではL2コンストラクトがないので、L1コンストラクトで書いています。

- [CloudFormation Doc - AWS AppConfig resource type reference](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/AWS_AppConfig.html)

なお、ここではAppConfigのベースのアプリケーション、環境、設定プロファイルのみを作成し、実際のフィーチャーフラグはマネジメントコンソールより管理するものと想定しています。

### 2. Lambda関数

```typescript
const sampleLambda = new nodejsLambda.NodejsFunction(this, 'SampleLambda', {
  entry: '../app/handler.ts',
  handler: 'sample',
  runtime: Runtime.NODEJS_18_X,
  functionName: 'sample-function',
  logRetention: RetentionDays.ONE_DAY,
  environment: {
    STAGE: stage,
    AWS_APPCONFIG_EXTENSION_LOG_LEVEL: 'debug'
  }
});
// Lambda Function URL
const url = sampleLambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE
});
```

シンプルなLambda関数です。

ここでのポイントはLambda Extension関係の設定をLambda関数の環境変数として指定するところくらいです(`AWS_APPCONFIG_EXTENSION_XXXX`)。
Lambda Extensionの詳細な設定は、以下公式ドキュメントを参照してください。

- [AWS AppConfig Doc - Configuring the AWS AppConfig Lambda extension](https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-integration-lambda-extensions.html#appconfig-integration-lambda-extensions-config)

### 3. AppConfig Lambda Extension

```typescript
const extensionArn = 'arn:aws:lambda:ap-northeast-1:980059726660:layer:AWS-AppConfig-Extension:84';
sampleLambda.addLayers(LayerVersion.fromLayerVersionArn(this, 'AppConfigExtension', extensionArn));
// AppConfig Extensionの実行ロール
const appConfigRole = new iam.Role(this, 'AppConfigExtensionRole', {
  roleName: 'AppConfigExtensionRole',
  assumedBy: sampleLambda.grantPrincipal, // 利用するLambdaで引き受け可能
  inlinePolicies: {
    UserTablePut: new iam.PolicyDocument({
      statements: [new iam.PolicyStatement({
        actions: ['appconfig:StartConfigurationSession', 'appconfig:GetLatestConfiguration'],
        effect: Effect.ALLOW,
        resources: [`arn:aws:appconfig:${this.region}:${this.account}:application/${configApp.ref}/environment/${devEnv.ref}/configuration/${appConfigDefault.ref}`]
      })]
    })
  }
});
sampleLambda.addEnvironment('AWS_APPCONFIG_EXTENSION_ROLE_ARN', appConfigRole.roleArn);
```

まず、作成したLambda関数にAWSが提供するAppConfigのLambda ExtensionをLambdaレイヤーとして追加しています。
ここで指定しているARNは以下公式ドキュメントに記載されているものです。

- [AWS AppConfig Doc - Available versions of the AWS AppConfig Lambda extension](https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-integration-lambda-extensions-versions.html)

次に、Lambda Extensionが実行するIAMロールを作成しています。
ここでは`appconfig:StartConfigurationSession`と`appconfig:GetLatestConfiguration`のみを許可しておけば問題ありません。
このロールのARNはLambda関数の環境変数(`AWS_APPCONFIG_EXTENSION_ROLE_ARN`)に指定します。
Lambda ExtensionはこのロールをAppConfigのフィーチャーフラグ取得時に使います。

## フィーチャーフラグの動作確認

あとはデプロイして確認してみます。

```shell
cdk deploy --context stage=dev
```

デプロイ後にマネジメントコンソールからAppConfigのフィーチャーフラグを設定します。
CDKの実行でアプリケーション(`sample-app`)や設定プロファイル(`default`)、環境(`dev`)は作成済みです。フィーチャーフラグを追加するだけです。
`default`プロファイルに以下2つのフィーチャーフラグ(featureA/featureB)を追加しました。

![AppConfig FeatureFlag1](https://i.gyazo.com/c034844a0dd18ed415ab9e0337ee0a67.png)

初期状態では両機能とも無効化されています。
これを`dev`環境にデプロイします(アプリのデプロイではありません)。

![AppConfig Deploy1](https://i.gyazo.com/236e2961c36a8db8882ff348e87fd677.png)

デプロイ戦略は`AppConfig.AllAtOnce`を選択します。これはデプロイするとすぐに設定が変わります。
他に徐々にデプロイするカナリアデプロイの戦略も指定できますし、カスタムのデプロイ戦略も作成可能です。
有効にするフィーチャーフラグの特性に応じた最適なものを選択していくことになるかと思います。
デプロイ戦略の詳細は、以下公式ドキュメントを参照してください。

- [AppConfig Doc - Creating a deployment strategy](https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-creating-deployment-strategy.html)

デプロイが完了したら、Lambda Function URLのエンドポイントにアクセスしてみます(CDKのOutputとしてコンソールに表示されます)。

![curl v1](https://i.gyazo.com/4b83c81279fda9bb51e20c6c7adac645.png)

AppConfigのフィーチャーフラグが取得できていると確認できました。

A機能(featureA)を有効にします。

![AppConfig FeatureFlag2](https://i.gyazo.com/73ee133a2dcc6556e5c3e862a9817ace.png)

こちらはバージョン2です。再度これをデプロイします。

![AppConfig Deploy2](https://i.gyazo.com/1740ec07e1620953175d683603251f6b.png)

こちらもデプロイ後すぐに設定は反映されます。

![curl v2](https://i.gyazo.com/0d77808b0f8d9adc4c08d440a2f7702e.png)

A機能(featureA)が有効になっていることが分かります。

## 最後に

Lambda Extensionを使うことで、セッション管理やポーリング/キャッシュといった実装を省略して簡単にフィーチャーフラグ機能を実装できました。
AppConfigを使えばフィーチャーフラグの有効化にデプロイは不要ですし、バージョン切り戻しもワンクリックです。
カナリアデプロイのような高度なデプロイ戦略も使えますし、使える機会があれば導入してみたいものですね。