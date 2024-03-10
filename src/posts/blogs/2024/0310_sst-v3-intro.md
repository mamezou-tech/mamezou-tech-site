---
title: PulumiベースのSST(v3)でサーバーレスアプリケーションをデプロイする
author: noboru-kudo
date: 2024-03-10
tags: [lambda, AWS, サーバーレス]
image: true
---

AWS Lambdaを始めとするサーバーレスアプリケーションのデプロイに何を使っていますか？
Serverless FrameworkやSAM(Serverless Application Model)、AWS CDK、Terraform等、数多くの選択肢がありどれを使うか悩みますね。

その中でも、CloudFormationをベースにするServerless Frameworkは結構普及したと思いますが、v4からは一定規模以上の組織では有償化される予定です[^1]。
該当組織で有償化を受け入れられないプロジェクトは、v3のサポートが切れる前に他のツールに移行する必要があります。

[^1]: <https://www.serverless.com/blog/serverless-framework-v4-a-new-model>

今だとAWS CDKが最有力なのかなと思っていましたが、Serverless Frameworkよりも(少し?)低レベルの記述が必要になってきます。
そこで、以前から気になっていた[SST](https://sst.dev/)というIaCツールを調べてみて、いい感じのツールだなと思いましたので紹介させていただきます。

## SSTとは？v3でAWS CDKからPulumiベースに
- [SST - 公式ドキュメント](https://docs.sst.dev/)

AWS向けのIaCツールで**S**erverless **ST**ackの略です。
その名の通りサーバーレスアプリケーション構築に特化したもので、Serverless Frameworkと同じ分類に入ります。

といっても、Serverless FrameworkはCloudFormationベースですが、SST(v2)はAWS CDKをベースとしています。
SST(v2)はAWS CDKのTypeScript向けの高レベル(L3)Constructを提供しています。これを使うと少量の記述で簡単に各種AWSリソースのプロビジョニングができます。
特にNext.js等の人気フロントエンドフレームワークに特化したConstructは、フレームワーク固有のプロビジョニングをいい感じにやってくれます。

開発面でも、ローカル環境から実際のAWS環境上でLambdaの動作を確認できる[Live Lambda Development](https://docs.sst.dev/live-lambda-development)や、AWSリソースをWebアプリやLambdaにバインドする[Resource Binding](https://docs.sst.dev/resource-binding)等、開発者体験も抜群に良さそうです。
現時点で[GitHubレポジトリ](https://github.com/sst/sst)のスター数も19Kを超えてかなり人気です。

ただ、予定している次期バージョン(v3)では大きな変更があるようです。ベースとしているAWS CDKをやめるようです。

- [SST Blog - Moving away from CDK](https://sst.dev/blog/moving-away-from-cdk.html)

上記記事はかなり長いですが、前半部分ではAWS CDKとそのデプロイエンジンのCloudFormationで運用する問題点が書かれています。
SST自体の利用経験がなくとも、AWS CDKやCloudFormationで運用したことがある方であれば、思い当たる部分は結構多いのではと思います(循環参照問題やエラーの分かりにくさは特に感じます)。

来たるSST v3ではこれらの問題点を解消すべく、そのデプロイエンジンを[Pulumi](https://www.pulumi.com/)+[Terraform](https://www.terraform.io/)に切り替えるとのことです。
ここでTerraformといってもHCLに移行する訳ではなく、Pulumiで内部的にAWSプロビジョニングをTerraform AWS Providerで使用しているだけで[^2]、見た感じはAWS CDKベースのSST v2の記述スタイルと大きく変わりません。 
また、Terraformと言えば去年ライセンス変更がありましたが、ここで使用している部分は新ライセンスの適用対象ではないとのことです。

[^2]: Pulumiの[AWS Provider](https://github.com/pulumi/pulumi-aws)内で[pulumi-terraform-bridge](https://github.com/pulumi/pulumi-terraform-bridge)を使ってTerraformとPulumiをブリッジしているようです。

SST v3はコードネームIonとして、本体とは別のGitHubレポジトリで開発が進められています。

- [GitHub - sst/ion](https://github.com/sst/ion)

遠くない将来v3にアップデートされると思いますので、ここではこのv3(アルファ版)を試してみました。

:::alert
SST v3は絶賛開発中で随時破壊的な変更が施されています。
評価目的で試す場合は、最新の情報を参照してください。現時点でのv3ドキュメントは以下より参照できます(安定版のリリースまで)。

- [SST Ion Doc](https://ion.sst.dev/docs/)
:::

## SST v3をセットアップする

ベースがPulumi+Terraformになったと言っても、内部のエンジンとして利用しているだけなので、両プロダクトを個別にインストールする必要はありません。

SSTのCLIのみインストールします。以下はmacOSの場合です。

```shell
brew install sst/tap/sst

sst version
# ion.0.0.128
```

今回は現時点で最新の`ion.0.0.128`を使用しています(今はかなりのペースで更新されています)。

## Lambda関数を作成する

SST v3はまさに開発中ですので、多くの機能を使わずにシンプルにLambdaをAPI Gateway(HTTP API)経由で公開してみます。

```shell
mkdir sst-v3-api && cd sst-v3-api
npm init -f
npm install --save-dev typescript
```

今回はここで以下のようなLambda関数を5本作成しました。

```typescript:functions/foo[1-5].ts
export const handler = async () => ({ statusCode: 200, body: 'foo' })
```

何もせずに固定値を返す関数です。

これをSSTアプリとして初期化します。以下のコマンドを実行します。

```shell
sst init
```

実行が終わるとプロジェクトルート直下に`.sst`というディレクトリ内にSST v3の各種ソースコードが生成され、`sst.config.ts`という設定ファイルが作成されます。

```
.
├── .sst <- 追加
│   ├── eval
│   ├── platform
│   └── stage
├── functions
│   ├── foo1.ts
│   ├── foo2.ts
│   ├── foo3.ts
│   ├── foo4.ts
│   └── foo5.ts
├── node_modules
├── package-lock.json
├── package.json
└── sst.config.ts <- 追加
```

sst.config.tsの内容は以下の通りです。
```typescript:sst.config.ts
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: 'sst-v3-api',
      removalPolicy: input?.stage === 'production' ? 'retain' : 'remove'
    };
  },
  async run() {},
});
```

run関数内にSSTまたはPulumiが提供するコンポーネントを使ってデプロイスクリプトを記述します。

## SSTのコンポーネントでAWSリソースを定義する

では、作成したLambda関数のコンポーネントを記述してみます。
シンプルなものからカスタマイズまでバリエーションを変えてみました。

```typescript:sst.config.ts
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: 'sst-v3-api',
      removalPolicy: input?.stage === 'production' ? 'retain' : 'remove'
    };
  },
  async run() {
    const table = new sst.aws.Dynamo('SampleTable', {
      primaryIndex: { hashKey: 'id' },
      fields: { id: 'string' }
    });
    
    const api = new sst.aws.ApiGatewayV2('SSTSampleApiGateway');
    api
      // ①シンプルパターン
      .route('GET /foo', 'functions/foo1.handler')
      // ②Lambda設定カスタマイズ
      .route('POST /foo', {
        handler: 'functions/foo2.handler',
        memory: '256 MB',
        runtime: 'nodejs20.x',
        description: 'sample foo API',
        architecture: 'arm64',
        timeout: '10 seconds'
      })
      // ③Resource Linking(Binding)
      .route('PUT /foo', {
        handler: 'functions/foo3.handler',
        link: [table] // TableアクセスのIAM Policy(inline)が自動で作成される
      })
      // ④カスタムパーミッション
      .route('DELETE /foo', {
        handler: 'functions/foo4.handler',
        permissions: [{
          actions: ['s3:ListBucket'],
          resources: ['arn:aws:s3:::mz-sandbox-developer-site-image-bucket']
        }, {
          actions: ['s3:GetObject'],
          resources: ['arn:aws:s3:::mz-sandbox-developer-site-image-bucket/*']
        }]
      })
      // ⑤パスパラメータあり
      .route('GET /foo/{id}', 'functions/foo5.handler');

    // デプロイ結果出力
    return {
      url: api.url
    };
  }
});
```

コードは自明で特に説明は不要かと思います。
最初にAPI Gatewayのインスタンスを作成し、それに対してルートを定義して、先ほどのLambda関数を割り当てています。
これだけでビルド(esbuild)、Lambda関数デプロイ、API Gatewayで公開と全てやってくれます。
各Lambdaのカスタマイズも一通り柔軟に対応できます。

特に便利だと思ったのはResource Bindings/Linking機能です。
アプリで必要とするAWSリソースを紐付け(link)すると、該当リソースのIAMポリシー設定やグローバル変数にリソース情報の埋め込みをやってくれます。
上記③のケースだと、以下のIAMポリシーがSSTによってインラインで作成されて対象Lambda関数に割り当てられていました。

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "dynamodb:*",
            "Resource": [
                "arn:aws:dynamodb:ap-northeast-1:xxxxxxxxxxxx:table/sst-v3-api-dev-SampleTableTable/*",
                "arn:aws:dynamodb:ap-northeast-1:xxxxxxxxxxxx:table/sst-v3-api-dev-SampleTableTable"
            ]
        }
    ]
}
```

さらに、バンドルされたLambda関数のソースコードを見ると、グローバル変数として以下のようなコードが追加されていました。
アプリからはこれを使ってDynamoDBにアクセスできます。

```javascript
globalThis.$SST_LINKS = {"SampleTable":{"name":"sst-v3-api-dev-SampleTableTable","type":"sst:aws:Dynamo"}};
```

この辺りの設定は間違えやすいので助かりますね。

なお、上記はSSTのコンポーネントのみを使っていますが、SSTで提供がない場合はPulumiのコンポーネントを使えますのでほとんどのユースケースに対応できそうです。

## SSTでデプロイする

あとはデプロイするだけです。
デプロイはSSTのCLI経由で実施します。

```shell
# IAM
sst deploy
# STAGEを指定する場合
sst deploy --stage=dev
```

デプロイが終わるとAPI GatewayのURLが出力されますので、それ経由で確認できます。

```shell
GW_URL=https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com
curl $GW_URL/foo
curl -X POST $GW_URL/foo
curl -X PUT $GW_URL/foo
curl -X DELETE $GW_URL/foo
curl $GW_URL/foo/1
```

Pulumiベースのv3でどれくらい早くなったのかを見るために、AWS CDKベースのSST v2でも全く同じ構成でデプロイして、それぞれの時間を計測してみました。

| 計測内容           | v2    | v3   |
|----------------|-------|------|
| 初期デプロイ時間       | 60秒   | 45秒  |
| 1つのLambda関数を更新 | 25.3秒 | 7.8秒 |

特に2回目以降の更新でかなりデプロイ時間が早くなっています。頻繁に更新が入る開発環境などでは大きな改善となりそうですね。

## まとめ

今回SSTを改めて調べてみて、かなり魅力的なツールだなと感じました。
ただ、v3で大きく変わることを考えると現在の安定版v2を使うのは。。という感じですね。
とはいえ、v3が安定版としてリリースされるとサーバーレスアプリケーションのIaCツールとして有力な選択肢になるなと感じます。
今後の動向をチェックしておきたいなと思いました。
