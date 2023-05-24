---
title: AWS LambdaでChatGPTプラグイン開発を試してみる - AWSデプロイ編
author: noboru-kudo
date: 2023-05-25
tags: [chatgpt, サーバーレス, lambda, AWS]
---

以下記事の続編です。
- [AWS LambdaでChatGPTプラグイン開発を試してみる - ローカル開発編](/blogs/2023/05/21/chatgpt-dev-intro-1/)

前回はAWS LambdaでChatGPTプラグインを動かすことを前提として、ローカル環境(SAM CLI)で起動したプラグインAPIとChatGPTを連携して感覚を掴みました。
今回は、実際にAWS環境へデプロイしてみたいと思います。

最終的な構成を再掲します。

![plugin design](https://i.gyazo.com/82b004d462b3c628aa49f8b147fe60e4.png)

このサンプルプラグインのソースコードは以下GitHubレポジトリで公開しています。

- [GitHub - kudoh/chatgpt-plugin-example-aws-lambda](https://github.com/kudoh/chatgpt-plugin-example-aws-lambda)

## AWS環境向けマニフェスト/API仕様を作成する

基本的にローカル環境の時と変わりません。
今回は`static`ディレクトリを別途用意して、以下のリソースを配置しました。

```
static
├── .well-known
│   └── ai-plugin.json <- プラグインマニフェスト
├── openapi.yaml <- OpenAPI仕様
├── legal.html <- プライバシーポリシー
└── logo.png <- プラグインロゴ
```

プラグインマニフェスト、OpenAPI仕様は前回説明のとおりそれぞれマニフェストの説明とプラグインAPIの仕様を記述するものです。
プライバシーポリシーは、プラグインマニフェストの`legal_info_url`で指定したエンドポイントに対応するものです[^1]。
プラグインロゴもローカル環境ではリンク切れになっていましたが、今回はちゃんと用意しました。

[^1]: 今回はChatGPTにご指導(?)いただきながら作成しました。実際に公開する際は本物の専門家と相談するのが良いかと思います。とはいえ、これをチェックされるのは公開申請の時ですので今回の作業ではなくても構いません。

プラグインマニフェストとOpenAPI仕様ですが、ローカル環境と内容は変わりません。
違いはプラグインのエンドポイントのみです。今回はサンプルプラグイン用のドメイン`chatgpt.mamezou-tech.com`を用意しましたので、関連箇所をそれに置き換えています。
以下は各ファイルのGitHubリンクです。

- [プラグインマニフェスト](https://github.com/kudoh/chatgpt-plugin-example-aws-lambda/blob/main/static/.well-known/ai-plugin.json)
- [API仕様](https://github.com/kudoh/chatgpt-plugin-example-aws-lambda/blob/main/static/openapi.yaml)

## AWS CDKスクリプトを記述する

前回はローカル環境向けのスクリプトでしたが、今回はAWS環境向けの部分を記述します。
AWS環境では、プラグインマニフェストやAPI仕様(OAS)等の静的リソースはS3オリジンでCloudFrontから配信します(ローカル環境ではLambda関数として実装)。

この辺りはChatGPTプラグインだから特別といったものはなく、CloudFront経由で静的リソースやAPIを公開したことのある方にとってはお馴染みのものかと思います。

若干長くなるので分割して説明します。
ソースコード全体は、GitHubレポジトリの[こちら](https://github.com/kudoh/chatgpt-plugin-example-aws-lambda/blob/main/cdk/lib/cdk-stack.ts)をご参考ください。

まずは、プラグインAPI本体のLambda関数です。

```typescript
const stage = this.node.tryGetContext('stage') || 'local';

// AWSでは使いません。ローカル固有です。
const preflightOptions = {
  allowMethods: apigateway.Cors.ALL_METHODS,
  allowOrigins: ['https://chat.openai.com'],
  allowHeaders: ['*']
};

const githubSearchFunction = new nodejs.NodejsFunction(this, 'SearchRepos', {
  functionName: this.stackName,
  entry: '../handler.ts',
  handler: 'search',
  timeout: cdk.Duration.seconds(10),
  memorySize: 256,
  runtime: lambda.Runtime.NODEJS_18_X,
  environment: {
    GITHUB_TOKEN: this.node.getContext('github-token') // for testing
  }
});

const api = new apigateway.RestApi(this, 'GithubSearchApi', {
  restApiName: 'GitHub Search API',
  description: 'ChatGPT Plugin for GitHub Search'
});
const resource = api.root.addResource('api').addResource('search', {
  defaultCorsPreflightOptions: stage === "local" ? preflightOptions : undefined
});
resource.addMethod('GET', new apigateway.LambdaIntegration(githubSearchFunction));
```

こちらはローカル環境とほぼ同じです。Lambda関数とAPI Gatewayリソースを作成しています。
ただ、リモート環境(ここではAWS)の場合は、ChatGPTからのアクセスはサーバーサイドからになるようです。このためCORS対応のためのPreflightリクエストは外しました。

続いて、プラグインマニフェストやOpenAPI仕様等の静的リソースを格納するS3バケットを用意します。
なお、ここからはAWS環境でのみ作成するリソースになります。

```typescript
const bucket = new s3.Bucket(this, 'StaticBucket', {
  bucketName: `${this.stackName}-static-resource`,
  accessControl: s3.BucketAccessControl.PRIVATE,
  objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
  autoDeleteObjects: true,
  removalPolicy: RemovalPolicy.DESTROY,
});
new s3deploy.BucketDeployment(this, 'DeployWebsite', {
  sources: [s3deploy.Source.asset('../static')],
  destinationBucket: bucket
});
```

S3バケットを用意して、先程用意したstaticディレクトリ配下をアップロードします。

続いて、ChatGPTからのリクエストを受付けるCloudFrontディストリビューション(CDN)です。
ここでは、先程S3にアップロードした静的リソースに加えて、プラグインAPIを提供するAPI Gatewayそれぞれにリクエスト振り向けます。

```typescript
const oai = new cloudfront.OriginAccessIdentity(this, 'StaticBucketOriginAccessIdentity');
const apiCachePolicy = new cloudfront.CachePolicy(this, 'ChatGPTGitHubSearchCachePolicy', {
  cachePolicyName: `${this.stackName}-api-policy`,
  queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
  headerBehavior: cloudfront.CacheHeaderBehavior.none(),
  cookieBehavior: cloudfront.CacheCookieBehavior.none()
});
const domainName = this.node.getContext('domain');
const certificateArn = this.node.getContext('acm-arn');
const certificate = acm.Certificate.fromCertificateArn(this, 'PluginCert', certificateArn);
const distribution = new cloudfront.Distribution(this, 'ChatGPTDistribution', {
  certificate,
  domainNames: [domainName],
  // デフォルトキャッシュビヘイビア -> 静的リソースバケット(opneapi.yaml, ai-plugin.json...)
  defaultBehavior: {
    cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
    allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    origin: new origins.S3Origin(bucket, {
      originAccessIdentity: oai
    })
  },
  additionalBehaviors: {
    // /api配下のアクセスはAPI Gateway(Lambda)にルーティング
    'api/*': {
      origin: new origins.RestApiOrigin(api),
      cachePolicy: apiCachePolicy,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
    }
  }
});
// 静的リソースはCloudFront経由のみアクセス可能
bucket.addToResourcePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  principals: [new iam.CanonicalUserPrincipal(
    oai.cloudFrontOriginAccessIdentityS3CanonicalUserId)],
  actions: ['s3:GetObject'],
  resources: [bucket.arnForObjects('*')]
}));
```

`/api/*`パスはAPI Gateway(Lambda関数)の方に、それ以外(デフォルト)は静的リソースを格納したS3バケットにルーティングしています。静的リソースの方はCDNとしてのキャッシュを効かせます。
また、カスタムドメインや証明書はAWS CDKのコンテキストより取得するようにしました。

最後はDNSの設定です。
Route53のAレコードを追加し、プラグインのカスタムドメインをCloudFrontディストリビューションに紐付けます。

```typescript
// ここではHostedZoneは既存のものを使用
const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
  zoneName: domainName.substring(domainName.indexOf('.') + 1),
  hostedZoneId: this.node.getContext('zone-id')
});
new route53.ARecord(this, 'DNSRecord', {
  recordName: domainName,
  zone,
  target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution))
});
```

少し長くなりましたが、これで終わりです。

## AWS環境にデプロイする

AWS環境にデプロイします。

事前にACM(Amazon Certificate Manager)で、HTTPS証明書を作成しておきます。
なお、CloudFrontにつけるものですのでバージニア北部(us-east-1)リージョンで作成する必要があります。

デプロイはAWS CDK CLIのdeployコマンドで実施します。

```shell
# 作成した証明書のARN
export ACM_ARN=arn:aws:acm:us-east-1:xxxxxxxxxxxx:certificate/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
# Route53ホステッドゾーン(事前に作成済み)
export HOSTED_ZONE_ID=XXXXXXXXXXXXXXXXXXXXX
# ChatGPTプラグインのドメイン
export PLUGIN_DOMAIN=chatgpt.mamezou-tech.com

cdk deploy --context github-token=${GITHUB_TOKEN} \
  --context stage=aws \
  --context acm-arn=${ACM_ARN} \
  --context zone-id=${HOSTED_ZONE_ID} \
  --context domain=${PLUGIN_DOMAIN}
```

デプロイ終了後はマネジメントコンソールより確認しました。

### プラグインAPI(Lambda関数/API Gateway)
- Lambda関数
![aws lambda](https://i.gyazo.com/56e696f05c316b528fd261e188a17625.png)
- API Gateway
![aws apigateway](https://i.gyazo.com/b4c9d8afa5c352488f63512462169d9d.png)

### 静的リソース(S3)
![s3 bucket](https://i.gyazo.com/5702e9412f2853e8edd36406b07ad8eb.png)

### CDN(CloudFront Distribution)
- オリジン
![cloudfront distribution origin](https://i.gyazo.com/1a6635faaf1e0f599cd2a8fcd010114e.png)
- キャッシュビヘイビア
![cloudfront distribution cache](https://i.gyazo.com/b291eccd94e5477b822e8430b9450bd0.png)

最後にローカル環境同様にcurlで各リソースにアクセスできることを確認します。

```shell
# プラグインAPI
curl "https://${PLUGIN_DOMAIN}/api/search?q=language:javascript"
# プラグインマニフェスト
curl https://${PLUGIN_DOMAIN}/.well-known/ai-plugin.json
# OAS
curl https://${PLUGIN_DOMAIN}/openapi.yaml
```

今回はカスタムドメインを使っていますので、DNSレコードの伝播時間が発生します。正常にアクセスできるまでは少し時間がかかります。

## ChatGPTプラグイン登録をする

curlで疎通確認ができたら、ChatGPTプラグインとして登録します[^2]。
[^2]: 前回ローカル環境でインストールしたプラグインは、事前にプラグインストアからアンインストールしておきます。

リモート環境にデプロイした場合は、少し手順が増えますが基本的なインストールの手順はローカル環境と変わりません。

1. 「GPT-4」 -> 「Plugins」をクリック
![](https://i.gyazo.com/7ad09dbd5d474d45f0cdcf32db303676.png)
2. プラグイン選択で「Plugin store」をクリック
![](https://i.gyazo.com/baabcd3aafbf46d83b4fc9d718c35b50.png)
3. 「Develop your own plugin」をクリック
![](https://i.gyazo.com/9b4a6eebe55aee45b1f4ed7f03c227f4.png)
4. Domainにプラグインドメイン(この場合は`chatgpt.mamezou-tech.com`)を入力して、「Find manifest file」をクリック
![](https://i.gyazo.com/35a247e940df2915e1d97c6e402dafae.png)
5. 「Next」をクリック
![](https://i.gyazo.com/92054811a1cca4ca7b8c2c444671c7bf.png)
6. 「Install for me」をクリック
![](https://i.gyazo.com/53cbedd43d4b4557bb25d30c140ab99d.png)
7. 「Continue」をクリック
![](https://i.gyazo.com/e9c49b95d45a412cb67cc63a9d347027.png)
8. 「Install plugin」をクリック
![](https://i.gyazo.com/459da638a0d9ffcee8d6185c2b965486.png)

これでインストールが完了しました。以下のようにプラグインが確認できました。
![](https://i.gyazo.com/bc7dc93928787d816b229001e1372e2f.png)

ローカル環境ではロゴファイルをアップロードしていなかったので、ログがリンク切れしていましたが今回は大丈夫です。

リモート環境にデプロイしたプラグインで動作した結果です。

<video alt="Video from Gyazo" width="100%" autoplay muted loop playsinline controls><source src="https://i.gyazo.com/35b03a9acf98356f9faa2e24e04e1a23.mp4" type="video/mp4" /></video>

ローカル環境と同様に、ChatGPTがプロンプトに応じてプラグインAPIを実行してくれているのが分かります(アイコンが突然「T」に変わってしまうのはなぜだろう...)。
見た目はローカル環境と同じですが、デベロッパーツールを見ていてリモート環境の場合はプラグインAPIの実行はサーバーサイドになるようです。そのためリモート環境の場合はCORS対応は不要でした。

今回は検証できませんでしたが、公式FAQによるとこの状態で15名までのユーザーがこのプラグインを動作させられるようです。

> Can I invite people to try my plugin?
> Yes, all unverified plugins can be installed by up to 15 other developers who have plugin access. If your plugin is available in the plugin store, it will be accessible to all ChatGPT plus customers.

引用元: <https://platform.openai.com/docs/plugins/production/can-i-invite-people-to-try-my-plugin>

この場合は「Install an unverified plugin」からドメインを入力すれば良さそうです。
ただし、現時点ではこのリンクはプラグイン開発が許可されているユーザーにしか表示されないようです。

## 最後に

今回は実際にAWS上にプラグインをデプロイして、ChatGPTから使う様子を見てみました。
やってみるとプラグイン開発自体は通常のWeb開発と大きな差はないのかなと思いました。

なお、今回未実施ですがChatGPTプラグインとして実際に公開する場合は、OpenAIのBotからレビュー申請を行うようです。
- [OpenAI ChatGPT Plugin - Submit a plugin for review](https://platform.openai.com/docs/plugins/review/submit-a-plugin-for-review)

ちょうどこの記事を書いていたところに、こんなニュースも目にしました。
- [マイクロソフト、ChatGPTとCopilotのプラグイン共通化を発表。プラットフォーム化とエコシステムを促進。Build 2023](https://www.publickey1.jp/blog/23/chatgptcopilotbuild_2023.html)

プラグイン開発に習熟してれば、MicrosoftのCopilot製品群のプラグインにもそのスキルは流用できそうです。

まだ、開発スタイルが定着していると言えない状況ですが、ウォッチしておいて損はなさそうなスキルですね。