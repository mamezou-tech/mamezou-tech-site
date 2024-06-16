---
title: Serverless Framework v4 の変更点を整理する
author: noboru-kudo
date: 2024-06-16
tags: [serverless-framework, lambda, サーバーレス, AWS, IaC]
image: true
---

先日(2024-06-14)Serverless Framework v4のGAリリースが発表されました。

- [Serverless Framework V4 Generally Available](https://www.serverless.com/blog/serverless-framework-v4-general-availability)

今回はこのv4リリースについて、主要な変更点を主観的に整理してみました。


## ライセンス変更

対象ユーザーに該当する場合は、インパクトが大きいのはやはりこれですね。2023年に[事前予告](https://www.serverless.com/blog/serverless-framework-v4-a-new-model)はありましたが、それに沿った形である程度の売上規模を持つ組織での利用が有償になります。

[公式ドキュメント](https://www.serverless.com/framework/docs/guides/upgrading-v4)をみると、以下のように記述されています。

> As we announced at the end of 2023, Serverless Framework CLI will continue to be free for individual developers and small businesses, but will no longer be free for Organizations that have greater than $2M in annual revenue. These Organizations will require a commercial Subscription.
> 
> These changes only apply to Serverless Framework V.4 and beyond and not to earlier versions. Serverless Framework V.3 will continue to be maintained via critical security and bug fixes through 2024.

(DeepL翻訳)
> 2023年末に発表したように、Serverless Framework CLIは個人の開発者や中小企業に対しては引き続き無料ですが、年間売上が200万ドルを超える組織に対しては無料ではなくなります。これらの組織は、商用サブスクリプションが必要になります。
>
> これらの変更はServerless Framework V.4以降にのみ適用され、それ以前のバージョンには適用されません。サーバーレス・フレームワークV.3は、2024年まで重要なセキュリティとバグの修正を通じて保守が継続されます。

CLIのみの利用でも年間売上が200万ドルを超える組織は有償サブスクリプションの購入が必要になります(さらにv3のサポートも2024年末までだとか)。

公式サイトの[Pricingページ](https://www.serverless.com/pricing)を見ると、「クレジット」という単位で購入するようです。
現時点では2クレジットのみが無料で、それ以上はそれぞれ月額で15クレジットで$60、50クレジットで$175、300クレジットで$750というバンドルが用意されています。これを組み合わせて組織で必要な総数を購入する必要があります。
また、スモールビジネスや年払いの割引があり、それを適用できればもう少し安くなります([Pricingページ](https://www.serverless.com/pricing)のFAQ参照)。

なお、クレジットは該当月のみで使用可能で、使い切れなかった場合の翌月持ち越しはできないようですので、過剰な購入にならないように注意したいところです。

この「クレジット」という課金単位ですが、CLIのみ(Serverless Dashboardを使わない)の場合は、1クレジットは1サービスインスタンスに対して消費されるようです。
この「サービスインスタンス」は以下のように定義されています。

> A Service Instance in the Serverless Framework is defined by a specific combination of "service", "stage", and "region" parameters in your serverless.yml file, essentially representing a unique deployment in a particular stage and region. Think of it as a distinct AWS CloudFormation stack managed by the Serverless Framework.

(DeepL翻訳)
> Serverless FrameworkのService Instanceは、serverless.ymlファイル内の "service"、"stage"、"region "パラメータの特定の組み合わせによって定義され、基本的に特定のステージとリージョンにおける固有のデプロイメントを表す。Serverless Frameworkによって管理される個別のAWS CloudFormationスタックだと考えてほしい。

例えば、開発/ステージング/商用という3環境で、それぞれ東京/大阪のマルチリージョン構成で運用している場合は 1(service) * 3(stage) * 2(region) = 6クレジットを毎月購入する必要があるということですね。

サブスクリプションは[Serverless Framework Dashboard](https://app.serverless.com/settings/billing)または[AWSマーケットプレイス]((https://aws.amazon.com/marketplace/pp/prodview-ok24yw6x5wcrg))から購入可能です。
個別の支払いだと社内手続きが大変という場合は、AWSマーケットプレイス経由で購入するのが良さそうですね。

:::alert
こちらは執筆時点の情報です。最新の価格情報は必ず公式の[Pricingページ](https://www.serverless.com/pricing)を確認してください。
:::

このライセンスの変更により有償サブスクリプション対象有無に関わらず、v4を利用する場合は、[Serverless Framework Dashboard](http://app.serverless.com/)へのログイン(serverless login)またはアクセスキー(`SERVERLESS_ACCESS_KEY`)、ライセンスキー(`SERVERLESS_LICENSE_KEY`)のいずれかを環境変数に設定する必要があります。

## AWS Devモード(CLI経由)

- [Serverless Framework Doc - CLI - Dev](https://www.serverless.com/framework/docs/providers/aws/cli-reference/dev)

ローカル環境で開発中のLambdaをすぐにAWS環境にデプロイして動作確認できます。
さらにIDEで修正したソースコードは再デプロイすることなく即座に実行できます[^1]。

[^1]: SSTの[Live Lambda Development](https://docs.sst.dev/live-lambda-development)と類似の機能ですね。

今まで[Serverless Framework Dashboard](http://app.serverless.com/)や[Serverless Console](https://www.serverless.com/console-docs/docs)でしか使えませんでしたが、CLIからも使えるようになりました[^2]。

[^2]: 私はCLIからしか使ったことがなかったので、恥ずかしながらこの機能の存在を知らなかったです。

使い方は簡単で、CLIのdevサブコマンドを実行するだけです。

以下のコマンドは、`local`ステージとしてLambda関数をDevモードで実行する例です。

```shell
npx serverless dev --stage local
```
```
(CLI出力結果)
Dev ϟ Mode

Dev Mode redirects live AWS Lambda events to your local code enabling you to develop faster without the slowness of deploying changes.

Docs: https://www.serverless.com/framework/docs/providers/aws/cli-reference/dev

Run "serverless deploy" after a Dev Mode session to restore original code.

Functions:
  hello: slsv4-local-hello (91 kB)

Endpoints:
  GET - https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/

✔ Connected (Ctrl+C to cancel)

v→ λ hello ── aws:apigateway:v2:get:/ <- 別ターミナルからcurlで実行(ログもここに出力される)
─ invoke
← λ hello (200)
```

Devモード用でCloudFormationスタックが作成されてデプロイされます。その後はターミナルはデプロイしたLambda関数と接続された状態になります。
そこで関数を実行すれば、同ターミナルセッションにそのログも出力されます。

内部的には、Devモードのデプロイは実際のソースコードをLambdaとしてデプロイしている訳ではなく、ローカル環境とLambda関数をWebSocket接続([AWS IoT Core](https://aws.amazon.com/iot-core/)を使用)し、関数の実行リクエストをローカル環境に転送するグルーコードをデプロイしているようです。
このため、初回のデプロイ以降でローカルでソースコードを変更すると、その変更はすぐに動作確認できます(デプロイ不要)。

最大限の開発効率化をもたらす機能だと思いますが、初回はローカルから直接CloudFormationスタックを実行するのでポリシー的に難しい現場も多そうです。

## Variable Resolver(Terraform / Vault 統合)
今まではCloudFormationの出力やSSMパラメータストア/Secrets Managerのシークレット値接続をネイティブサポートしていましたが、v4からはVariable Resolverという仕組みが導入され、任意の外部サービスの変数解決に使われるようになりました。

> The Variable Resolver is a new concept in Serverless Framework V.4 that allows you to use different sources for your variables.

これに伴い、まずは[Terraform](https://www.terraform.io/)の出力、[Vault](https://www.vaultproject.io/)のシークレット値が変数として扱えるようになりました。

- [Serverless Framework Doc - Variables - Reference HashiCorp Terraform State Outputs](https://www.serverless.com/framework/docs/guides/variables/terraform)
- [Serverless Framework Doc - Variables - Reference HashiCorp Vault Secrets](https://www.serverless.com/framework/docs/guides/variables/vault)


例として、Terraformの出力をserverless.ymlに取り込んでみました。

- Terraform HCL
```hcl
terraform {
  backend "s3" {
    bucket = "remote-terraform-state-12345"
    key    = "terraform/state"
    region = "ap-northeast-1"
  }
}

provider "aws" {
  region = "ap-northeast-1"
}

resource "aws_dynamodb_table" "sample" {
  name         = "sample"
  billing_mode = "PAY_PER_REQUEST"
  hash_key = "id"
  attribute {
    name = "id"
    type = "S"
  }
  tags = {
    Name = "sample-table"
  }
}

// 出力 -> Serverless Frameworkで変数として取り込み対象
output "dynamodb_table_name" {
  value = aws_dynamodb_table.sample.name
}
```

- Serverless Framework(serverless.yml)
```yaml
service: ServerlessV4Sample

provider:
  name: aws
  region: ap-northeast-1
  runtime: nodejs20.x
stages:
  default:
    # TerraformのVariable Resolver(S3リモートステートを指定)
    resolvers:
      terraform:
        type: terraform
        backend: s3
        bucket: remote-terraform-state-12345
        key: terraform/state
functions:
  hello:
    handler: handler.hello
    events:
      - httpApi:
          path: /
          method: get
    environment:
      # Terraformからの出力を取り込む
      SIMPLE_TABLE: ${terraform:outputs:dynamodb_table_name}
```
Vaultも使い方はこれとほとんど同じです。v4以降はこのVariable Resolverの仕組みを使って、外部サービスからの変数解決が順次導入していくのかなと思います。

Terraform/Vaultはマルチクラウド環境向けのツールとしてかなり普及していますので、この機能を待ち望んでいた現場は結構多いのではと思います。

## TypeScript(esbuild)のビルトインサポート

v3でNode.jsランタイム+TypeScriptで開発する場合は、serverless-esbuildプラグインを使って[esbuild](https://github.com/evanw/esbuild)でビルドしている現場が多いかと思います。
v4からはesbuildサポートがビルトインで組み込まれるようになりました。

- [Serverless Framework Doc - AWS Lambda Build Configuration](https://www.serverless.com/framework/docs/providers/aws/guide/building)

v4からはルート直下に`build`ブロックが追加されてビルド設定ができるようになりました。
現状はesbuildのみですが、今後他のツールにも拡張されていきそうな雰囲気です。

以下はv4でLambda関数をESM+ミニファイしてビルドする例です。

```yaml:serverless.yml
service: ServerlessV4Sample

package:
  patterns: ['package.json'] # type=module
  
build:
  esbuild:
    minify: true
    format: 'esm'
# これは動作しなかった(強制的に.jsで出力された)
#    outExtension:
#      .js: .mjs
```

ビルトインされたesbuildのビルドは、serverless-esbuildプラグインのものとは互換性がないので注意しましょう。

:::info
最初はesbuildの`outExtension`パラメータで拡張子を.mjsにしようとしましたが、現時点(v4.1.0)でesbuildサポートでは、この設定は動作せず(.jsで出力)実行時にランタイムエラーが発生しました。
このため、上記は`type:module`に指定したpackage.jsonをパッケージバンドルに含めることで回避しました。
:::

## AWS以外のプロバイダーが非推奨に

- [Serverless Framework Doc - Upgrading to V4 - Deprecation Of Non-AWS Providers](https://www.serverless.com/framework/docs/guides/upgrading-v4#deprecation-of-non-aws-providers)

Serverless FrameworkはAWS以外にもAzureやGCP等もサポートしていましたが、v4で非推奨となりAWSのみに注力するとのことです。
まぁServerless FrameworkでAWS以外を使っているという話はあまり聞いたことがないので、Serverless Frameworkの開発チームが選択と集中をしていく上で仕方のないことだったのかなと思います。

ただし、今後はExtensionの仕組みを通してAWS以外のプロバイダーをサポートする計画があるようです。

## 最後に

まだ他にもv4からの変更はありますが、主要な変更点の概要をまとめてみました。
後方互換性を意識した開発が進められており、ライセンス変更以外は大きな変更は比較的少ないかなという印象です。

ご参考になれば幸いです。
