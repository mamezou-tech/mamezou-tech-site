---
title: Nuxt3入門(第9回) - Nuxt3アプリケーションをサーバーレス環境にデプロイする
author: noboru-kudo
date: 2022-11-02
templateEngineOverride: md
tags: [SSR, AWS, サーバーレス, serverless-framework, lambda]
prevPage: ./src/posts/nuxt3/nuxt3-state-management.md
---

[前回](/nuxt/nuxt3-state-management)はNuxt3のステート管理について見てきました。

連載最後の今回は、サンプルアプリとして作成したNuxtアプリケーションをAWS環境にデプロイしてみます。

デプロイするアプリケーションは、以下の回で作成した仮想のブログシステムです。

- [Nuxt3入門(第2回) - 簡単なNuxtアプリケーションを作成する](/nuxt/nuxt3-develop-sample-app/)
- [Nuxt3入門(第3回) - ユニバーサルフェッチでデータを取得する](/nuxt/nuxt3-universal-fetch/)
- [Nuxt3入門(第4回) - Nuxtのルーティングを理解する](/nuxt/nuxt3-routing/)

使用するレンダリングモードはNuxtのデフォルトでユニバーサルレンダリングを採用します。
なお、ここではプリレンダリングは使用せず、サーバーサイド実行環境を配置してNuxtを動作させるものとします[^1]。

[^1]: プリレンダリングを使用する場合は、SSG同様で単純にビルドされた出力結果をS3等へホスティングするだけです。

Nuxt3のサーバーエンジンである[Nitro](https://nitro.unjs.io/)は、マルチプラットフォームで動作可能です。
今回は代表的なサーバーレスサービスの[AWS Lambda](https://aws.amazon.com/lambda/)に、Nuxtアプリケーションをデプロイしてみたいと思います。

[[TOC]]

## LambdaにNuxtアプリケーションをデプロイする

まずは、作成したNuxtアプリケーションをシンプルにLambdaにデプロイします。
ここではAPI Gateway等を前面に配置せず、[Lambda Function URL](https://docs.aws.amazon.com/lambda/latest/dg/lambda-urls.html)を使います。

:::info
Lambda Function URLは、2022/4より導入された比較的新しいLambdaの機能です。
別記事でも紹介していますので、興味のある方は以下をご参照ください。

- [Lambda Function URLでLambdaをHTTPで直接実行する](/blogs/2022/04/14/lambda-function-url/)
:::

### Nitroプリセット指定

Nuxt3をLambdaで動作させるには、サーバーエンジンのNitroの[プリセット設定](https://nitro.unjs.io/deploy#changing-the-deployment-preset)が必要です。
プリセットは`nuxt.config.ts`または環境変数より指定できますが、今回は`nuxt.config.ts`を使います。
以下のように修正します。

```typescript
export default defineNuxtConfig({
  nitro: {
    preset: 'aws-lambda',
    serveStatic: true,
  },
})
```

NitroのLambda用のプリセット(`aws-lambda`)を指定します。
デフォルトでは、Nitroビルド結果の`.output/public`配下は公開されません。Lambda単体でデプロイするには、別途`serveStatic: true`を指定する必要があります。

これでNuxtアプリケーションをビルドしておきます。

```shell
npm run build
```

`.output`ディレクトリにビルドした結果が出力されます。
ここでは、デフォルトのNode.js Serverではなく、Lambda向けのハンドラーソースコードが生成されます。

### Lambdaデプロイ

Lambdaのデプロイには[Serverless Framework](https://www.serverless.com/)を使って簡単にデプロイします。
まず、Serverless FrameworkをNuxtプロジェクトにインストールしておきます。Lambda Function URLはServerless Frameworkのv3.12.0以上で利用可能です。

```shell
npm install --save-dev serverless
```

プロジェクトルート直下に`serverless.yml`を作成します。以下のような内容となります。

```yaml
service: nuxt3-sample
frameworkVersion: '3'
provider:
  name: aws
  stage: dev
  region: ap-northeast-1
  runtime: nodejs16.x
  environment:
    BLOG_DB: db.json
package:
  patterns:
    - '!**'
    - '.output/**' # nuxt run buildの出力ディレクトリ
    - 'db.json' # 記事情報を格納したJSONファイル
functions:
  NuxtSsrEngine:
    handler: '.output/server/index.handler'
    url: true # Lambda function URLを有効
```

`package.patterns`で、パッケージング対象を`.output/**`としてNitroビルド結果のみを対象としています。
Nitroは必要なもののみをバンドルしますので、ソースコード自体やnode_modules等を含める必要はありません。
なお、`db.json`については、アプリケーション(API)内で利用しているブログ記事を格納するDBです。本来はCMS等の外部システムから取得することを想定していますが、今回はパッケージング対象に含めています。

`functions`では、1つのLambda(`NuxtSsrEngine`)を定義しています。
`handler`にはNitroのビルド結果で単一のエンドポイントとなる`.output/server/index.handler`を指定します。
また、`url: true`とすることで、作成するLambdaに対して接続用のURLが割り当てられます。

これで準備は完了です。Serverless FrameworkのCLIを使ってデプロイします。

```shell
npx serverless deploy

> Deploying nuxt3-sample to stage dev (ap-northeast-1)
> 
> ✔ Service deployed to stack nuxt3-sample-dev (37s)
> 
> endpoint: https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.lambda-url.ap-northeast-1.on.aws/
> functions:
>   NuxtSsrEngine: nuxt3-sample-dev-NuxtSsrEngine (970 kB)
```

デプロイが終わると、AWS コンソールから作成したLambdaが確認できます。

![](https://i.gyazo.com/c3b76fc8c4eddeb800a3bbfcd72d10ca.png)

記載されているLambdaに割り当てられたURLにブラウザからアクセスします。
ローカル環境で実行したときと同じように、サンプルアプリケーションが実行されていることが分かるはずです。

プリセット変更のみで、簡単にAWSサーバーレス環境にデプロイできました。

## 静的リソースをCDNから配信する

先程はLambda単体でNuxtアプリケーションをデプロイしました。
シンプルで簡単ですが、サーバーサイドレンダリングだけでなく、JavaScript等の静的リソースもLambdaで処理しています。簡単な検証にはいいですが、パフォーマンスやLambdaコストの観点で実用的なものとは言えません。

Nitro設定の`serveStatic`設定の[ドキュメント](https://nitro.unjs.io/config#servestatic)でも以下のように言及されています。

> Note: It is highly recommended that your edge CDN (nginx, apache, cloud) serves the public/ directory instead.

AWS環境であれば、静的リソースはCDN機能を提供するCloudFront経由とするのが理想的です。
ここでは、サーバーサイドレンダリングのみLambdaで実行し、静的リソース(`.output/public`)はS3に配置してCloudFront(CDN)経由で配信するように変更します。

### Nuxt/Lambda設定変更

まず、`nuxt.config.ts`を以下のように修正します。

```typescript
export default defineNuxtConfig({
  nitro: {
    preset: 'aws-lambda',
  },
})
```

`serveStatic`を削除し、静的リソースを実行環境のNitroエンジンから配信しないようにしました(`aws-lambda`プリセットデフォルトの挙動)。

`serverless.yml`も以下のように修正します。

```yaml
service: nuxt3-sample
frameworkVersion: '3'
provider:
  name: aws
  stage: dev
  region: ap-northeast-1
  runtime: nodejs16.x
  environment:
    BLOG_DB: db.json
package:
  patterns:
    - '!**'
    - '.output/server/**' # nuxt run buildの出力ディレクトリのサーバーサイドのみを指定
    - 'db.json' # 記事情報を格納したJSONファイル
functions:
  NuxtSsrEngine:
    handler: '.output/server/index.handler'
    url: true
```

変更点は、`package.patterns`でNitroビルド結果のパッケージング対象を`.output/server/**`のみとし、`public`ディレクトリを除外しました。

先程と同じようにこれをビルドして、デプロイします。

```shell
npm run build
npx serverless deploy
```

### 静的リソース用S3バケットとCloudFrontディストリビューション作成

次に、静的リソースをS3に配置し、CloudFront(CDN)経由で配信するようにします。
なお、CORS設定を回避するために、LambdaのNitroエンジンについてもCloudFront経由とします。

こちらのプロビジョニングにはCloudFormationを使います。
少し長いですが、以下のテンプレート(`cdn.yml`)を用意します。

```yaml
AWSTemplateFormatVersion: "2010-09-09"
Description: Nuxt3 application distribution template

Parameters:
  NuxtSsrEnginDomain:
    Type: String
    Description: Lambda Function URL Domain

Resources:
  # 静的リソース配信用のS3バケット
  StaticResourceBucket:
    Type: AWS::S3::Bucket
    Properties:
      # グローバルで一意な名前を指定してください
      BucketName: nuxt3-sample-public-bucket
      AccessControl: Private
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true
  # CloudFront -> S3のアクセスコントロール
  StaticResourceOriginAccessControl:
    Type: AWS::CloudFront::OriginAccessControl
    Properties:
      OriginAccessControlConfig:
        Name: "nuxt3-sample-oac"
        OriginAccessControlOriginType: s3
        SigningBehavior: always
        SigningProtocol: sigv4
  # S3バケットポリシー(CloudFrontからのみを許可)
  StaticResourceBucketPolicy:
    Type: AWS::S3::BucketPolicy
    Properties:
      Bucket: !Ref StaticResourceBucket
      PolicyDocument:
        Version: 2012-10-17
        Statement:
          Sid: AllowCloudFrontServicePrincipalReadOnly
          Effect: Allow
          Principal:
            Service: cloudfront.amazonaws.com
          Action: s3:GetObject
          Resource: !Sub "arn:aws:s3:::${StaticResourceBucket}/*"
          Condition:
            StringEquals:
              AWS:SourceArn: !Sub "arn:aws:cloudfront::${AWS::AccountId}:distribution/${NuxtSampleAppDistribution}"
  # CloudFrontディストリビューション
  NuxtSampleAppDistribution:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Enabled: true
        HttpVersion: http2
        CacheBehaviors:
          - PathPattern: "/_nuxt/*"
            TargetOriginId: "nuxt-static-resources"
            ViewerProtocolPolicy: redirect-to-https
            # AWS Managed Cache Policy(CachingOptimized)
            CachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6
        DefaultCacheBehavior:
          TargetOriginId: "nuxt-ssr-engine"
          # AWS Managed Cache Policy(CachingDisabled)
          CachePolicyId: 4135ea2d-6df8-44a3-9df3-4b5a84be39ad
          ViewerProtocolPolicy: redirect-to-https
        Origins:
          - Id: "nuxt-static-resources"
            DomainName: !GetAtt StaticResourceBucket.RegionalDomainName
            OriginAccessControlId: !GetAtt StaticResourceOriginAccessControl.Id
            S3OriginConfig: {}
          - Id: "nuxt-ssr-engine"
            DomainName: !Ref NuxtSsrEnginDomain
            CustomOriginConfig:
              OriginProtocolPolicy: https-only
Outputs:
  CloudFrontDomain:
    Value: !GetAtt NuxtSampleAppDistribution.DomainName
```

細かい内容（各リソースの概要はインラインコメントに記載）は省略しますが、2つのオリジンを作成しています。
- 静的リソースを格納したS3オリジン(`nuxt-static-resources`)。パス`/_nuxt/*`の場合はこちらを使用。
- Lambda Function URLをエンドポイントとするカスタムオリジン(`nuxt-ssr-engine`)。上記以外のデフォルト。

S3オリジンの方はCloudFrontのキャッシュを有効とし、カスタムオリジン側は無効としています。シンプルな記載とするためにカスタムキャッシュポリシーではなく、AWS管理のものを適用しています。

これでCloudFormationを実行します。以下はAWS CLIで実行していますが、もちろんAWSコンソール上からでも構いません。
パラメータ(`NuxtSsrEnginDomain`)としてNitroエンジンを実行するLambda Function URLのドメインを指定します。

```shell
aws cloudformation deploy --template-file cdn.yml --stack-name nuxt-distribution \
  --parameter-overrides NuxtSsrEnginDomain=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.lambda-url.ap-northeast-1.on.aws
```

最後に、作成された静的リソース用のS3バケットに`.output/public`配下のリソースをアップロードします。

```shell
# バケット名はテンプレートで指定したもの
aws s3 sync --delete .output/public s3://nuxt3-sample-public-bucket
```

後はアプリケーションにアクセスするだけです。ここではLambda Function URLではなく、CloudFrontに割当てられたURLを使います[^2]。
URLはCloudFormationの出力から確認できます。

[^2]: もちろん実運用する場合は、カスタムドメインを別途割り当てる必要があります。

![CloudFront distribution URL](https://i.gyazo.com/a26782eea409b3d7a1538e439708d3be.png)

ブラウザから上記URLにアクセスすると、先程と同様にアプリケーションが実行されます。
見た目からは分かりませんが、ここでは静的リソースはS3から取得しています。
Chrome DevツールのネットワークからHTTPレスポンスヘッダ(`x-cache`)を確認すると、2回目以降のアクセスは`Hit from cloudfront`となっています。

ここでの内容をまとめると、以下の構成となっています。

![](https://i.gyazo.com/1fac7e96d95e9b445f67d390bdf53a67.png)

こうすることで、Lambdaは初期ロード時のサーバーサイドレンダリングのみの実行となり、静的リソースはS3からCloudFront経由で配信されるようになります。

## まとめ

Nuxt3アプリケーションをAWSサーバーレス環境にデプロイする方法をご紹介しました。
また、Lambda単体のシンプルな方法からCDN(CloudFront)を使った実用的なデプロイも見てきました。

Nuxt2だといろいろ工夫しないとLambdaにデプロイするのは難しかった感がありますが、Nuxt3がNitroを採用したことでプリセットの切り替えだけでよくなりました。
未検証ですが、これはLambdaに限らずNitroがサポートするプラットフォーム全てに適用できるはずです[^3]。

連載はここで一旦終了となりますが、Nuxt3はまだ今も進化しています。面白い機能が出たらまた紹介したいと思います。

[^3]: Nitroがサポートするプラットフォームは[Nitro公式ドキュメント](https://nitro.unjs.io/deploy)を参照してください。