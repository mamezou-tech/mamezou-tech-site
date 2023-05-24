---
title: AWS LambdaでChatGPTプラグイン開発を試してみる - ローカル開発編
author: noboru-kudo
date: 2023-05-21
tags: [chatgpt, サーバーレス, lambda, AWS]
---

世界中を席巻しているChatGPTですが、プラグイン機能はリアルタイム情報取得、外部API連携等、ChatGPTの可能性を無限に広げます。
そんなプラグイン機能が、Webブラウジングとともに2023-05-15週から順次ChatGPT Plusユーザーに解放されました。

- [Web browsing and Plugins are now rolling out in beta (May 12)](https://help.openai.com/en/articles/6825453-chatgpt-release-notes)

筆者は以前からプラグイン開発のWaitlistに登録していたのですが、ちょうど同時期に順番が回ってきました。
今回は、そんなChatGPTのプラグイン機能の開発をチャレンジしてみたいと思います。

長い記事となりますので2部構成としますが、最終形の構成は以下の通りです。

![plugin design](https://i.gyazo.com/82b004d462b3c628aa49f8b147fe60e4.png)

プラグインの機能としては、ChatGPTからのリクエストに応じて、GitHub APIと連携してGitHubレポジトリを検索するシンプルなものとします。

前半となる今回はAWS環境ではなく、この構成を踏まえてローカル環境でChatGPTプラグインを作成してみます。

:::alert
ChatGPTプラグイン機能自体や開発フローは試験的バージョンで流動的な状況です。
実際にプラグイン開発を試す場合は、OpenAIが提供する最新の状況を確認してください。

- [OpenAI Doc - Chat Plugins](https://platform.openai.com/docs/plugins/introduction)

また、現時点ではプラグイン開発は全ユーザーに解放されている訳ではなく[waitlist](https://openai.com/waitlist/plugins)への登録が必要です。
:::

## プラグイン用のプロジェクトを作成する

ChatGPTのプラグイン機能は、ChatGPTが知能を持つAPIクライアントとなって、プラグインが提供するAPIを実行します。
ここでは、このAPIをLambdaとAPI Gatewayを使って作成します。

今回はAWS Lambda + TypeScript(Node.jsランタイム)でプロジェクトを作成します。

```shell
npm init
npm install -D typescrpt @types/aws-lambda @types/node octokit

# TypeScriptプロジェクト初期化
npx tsc tsc --init 
```

ちなみに[octokit](https://www.npmjs.com/package/octokit)は、GitHub APIの公式ライブラリです。

次に、プロジェクト内にAWS CDKのプロジェクトも作成します。

```shell
mkdir cdk && cd cdk
npx cdk init app --language typescript
npm install -D esbuild
```

`cdk`ディレクトリ配下にAWS CDKのappテンプレートが展開されます。
ここではCloudFormationのスタック名は、以下のようにしました(`cdk/bin/cdk.ts`)。

```typescript
const app = new cdk.App();
new CdkStack(app, 'CdkStack', {
  stackName: 'chatgpt-plugin-github-search'
});
```

なお、AWS CDKのデプロイで必要な[Bootstrap](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html)は事前に終わっているものとします。

## プラグインAPIのLambda関数を作成する

ChatGPTのプラグインのソースコードを作成します。
ここではLambdaのイベントハンドラとして作成します。プロジェクト直下に以下の`handler.ts`を作成しました。

```typescript
import { APIGatewayEvent, APIGatewayProxyHandler, APIGatewayProxyResult, Context } from 'aws-lambda';
import { Octokit } from 'octokit';

const CORSHeaders = {
  'Access-Control-Allow-Origin': 'https://chat.openai.com',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Private-Network': 'true',
  'Access-Control-Allow-Headers': '*'
};

type Repo = {
  full_name: string,
  url: string,
  star: number,
  description: string
}

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});
export const search: APIGatewayProxyHandler = async (event: APIGatewayEvent, context: Context) => {
  const { q } = event.queryStringParameters ?? {};
  const resp = await octokit.request('GET /search/repositories', {
    q,
    sort: 'stars',
    order: 'desc',
    per_page: 5
  });
  const repos: Repo[] = resp.data.items.map(item => ({
    full_name: item.full_name,
    url: item.url,
    star: item.stargazers_count,
    description: item.description
  }));
  return {
    statusCode: 200,
    body: JSON.stringify({
      repos
    }),
    headers: {
      ...CORSHeaders,
      'Content-Type': 'application/json'
    }
  };
};
```

エラー制御等は省いていますのでシンプルです。以下GitHubのレポジトリ検索APIを呼び出して、その結果を返すだけです。

- [GitHub API Doc - Search repositories](https://docs.github.com/en/rest/search?apiVersion=2022-11-28#search-repositories)

ローカル環境の確認だけですが、ChatGPTプラグインはクロスオリジンアクセスとなります。
このため、CORSヘッダーでChatGPTのドメインからのリクエストを許可する必要があります。

## ローカル環境向けマニフェスト/API仕様を作成する

ChatGPTプラグイン開発はローカルで起動したAPIでも確認できます。
トライ＆エラーで試すにはローカル環境が効率的です。

ChatGPTがプラグインを認識するためには、以下2つの要素が必要です。

- ai-plugin.json: プラグインマニフェスト(OpenAIで規定)
- openapi.yaml: OpenAPIで記述したAPI仕様(OAS: OpenAPI Specification)

これらは以下公式ドキュメントで説明されています。

- [OpenAI ChatGPT Plugin Doc - Plugin manifest](https://platform.openai.com/docs/plugins/getting-started/plugin-manifest)
- [OpenAI ChatGPT Plugin Doc - OpenAPI definition](https://platform.openai.com/docs/plugins/getting-started/openapi-definition)

AWS環境ではこれらのファイルはS3に配置してCDN(CloudFront)から配信したいですが、ローカル環境でそこまでできませんので、これもLambda関数として実装します。

AWS CDKだとSAM CLIを使って、ローカル環境でAPIを実行可能です。

- [AWS SAM Doc - Locally testing AWS CDK applications](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-cdk-testing.html)

これを使って確認することにします。まず、プロジェクト配下の`static-local`ディレクトリを作成し、両ファイルを配置しました。

### プラグインマニフェスト(`static-local/.well-known/ai-plugin.json`)

```json
{
  "schema_version": "v1",
  "name_for_human": "GitHub Search",
  "name_for_model": "GitHubSearch",
  "description_for_human": "Plugin for searching GitHub repositories, You can search the repository by entering your search query.",
  "description_for_model": "Plugin for searching GitHub repositories, You can search the repository by entering your search query.",
  "auth": {
    "type": "none"
  },
  "api": {
    "type": "openapi",
    "url": "http://localhost:3000/openapi.yaml",
    "is_user_authenticated": false
  },
  "logo_url": "http://localhost:3000/logo.png",
  "contact_email": "<mail-address>",
  "legal_info_url": "http://localhost:3000/legal"
}
```

重要なのは`description_for_model`です。名前の通りChatGPT向けのプラグインの説明を記述します。
ChatGPTはユーザーの入力プロンプトからプラグインAPI呼び出しをするかどうかをこの説明から判断するので、慎重に記述する必要があります。
記述内容の詳細は、以下OpenAIの公式ドキュメントを参照してください。

- [OpenAI ChatGPT Plugin Doc - Writing descriptions](https://platform.openai.com/docs/plugins/getting-started/writing-descriptions)

なお、各種エンドポイントはSAM CLIのローカル実行で使う`localhost:3000`としています。

ちなみに、`logo_url`や`legal_info_url`のエンドポイントは、この時点では存在しなくても動作上は問題ありませんでした[^1]

[^1]: ただし、これらは必須属性なので今後は変わるかもしれません。

### API仕様(`static-local/openapi.yaml`)

```yaml
openapi: 3.0.3
info:
  title: GitHubSearchPlugin
  description: A Plugin to search GitHub repositories, You can search the repository by entering your search query.
  version: 'v1'
servers:
  - url: http://localhost:3000
paths:
  /api/search:
    get:
      operationId: searchRepos
      summary: Search GitHub Repositories by specified query.
      parameters:
        - in: query
          name: q
          schema:
            type: string
          required: true
          description: The Search query for GitHub repositories.
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SearchReposResponse'
components:
  schemas:
    SearchReposResponse:
      type: object
      properties:
        repos:
          type: array
          items:
            $ref: '#/components/schemas/Repo'
          description: The list of GitHub repositories.
    Repo:
      type: object
      properties:
        full_name:
          type: string
          description: The name of GitHub Repository owner.
        url:
          type: string
          description: The URL of GitHub Repository.
        star:
          type: integer
          description: Number of stars collected by the GitHub repository.
        description:
          type: string
          description: The description of the GitHub repository.
```

プラグインマニフェスト同様にパラメータやフィールドの`description`や`summary`は、ChatGPTがAPI呼び出し時に解釈するものです。
ChatGPTが正しくAPI仕様を理解できるよう正確に記述する必要があります。書いていてAIに対して仕様を記述する時代が来たと感慨深い思いがしましたw

## ローカル環境向けマニフェスト/API仕様のLambda関数を作成する

Lambdaのイベントハンドラは以下の通りです。
これらはローカル環境固有のものですので、`handler-local.ts`を別途作成しました。

```typescript
import { APIGatewayEvent, APIGatewayProxyHandler, APIGatewayProxyResult, Context } from 'aws-lambda';
import * as fs from 'fs';

const CORSHeaders = {
  'Access-Control-Allow-Origin': 'https://chat.openai.com',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Private-Network': 'true',
  'Access-Control-Allow-Headers': '*'
};

export const aiplugin: APIGatewayProxyHandler = async (event: APIGatewayEvent, context: Context) => {
  const plugin = fs.readFileSync('./static-local/.well-known/ai-plugin.json');
  return {
    statusCode: 200,
    body: plugin.toString(),
    headers: {
      ...CORSHeaders,
      'Content-Type': 'application/json'
    }
  };
};

export const openapi: APIGatewayProxyHandler = async (event: APIGatewayEvent, context: Context) => {
  const openapi = fs.readFileSync('./static-local/openapi.yaml');
  return {
    statusCode: 200,
    body: openapi.toString(),
    headers: {
      ...CORSHeaders,
      'Content-Type': 'application/yaml'
    }
  };
};
```

作成した定義ファイルを返すだけのシンプルなイベントハンドラです。
ローカル環境のみこの関数を使って、AWS環境ではS3オリジンとしてCDN(CloudFront)から配信します。

## AWS CDKスクリプトを記述する

AWS CDKのスクリプトを作成します。
初期状態の`cdk/lib/cdk-stack.ts`を以下のように修正しました。

```typescript
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const stage = this.node.tryGetContext('stage') || 'local';

    const preflightOptions = {
      allowMethods: apigateway.Cors.ALL_METHODS,
      allowOrigins: ['https://chat.openai.com'],
      allowHeaders: ['*']
    };

    // ① ChatGPTプラグインのLambda関数本体 - NodejsFunction -> esbuildでトランスパイル&バンドル
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

    // ② API Gateway(REST API)
    const api = new apigateway.RestApi(this, 'GithubSearchApi', {
      restApiName: 'GitHub Search API',
      description: 'ChatGPT Plugin for GitHub Search'
    });
    const resource = api.root.addResource('api').addResource('search', {
      defaultCorsPreflightOptions: preflightOptions
    });
    resource.addMethod('GET', new apigateway.LambdaIntegration(githubSearchFunction));

    // ③ ローカル環境固有
    if (stage === 'local') {
      // static-local配下をLambda関数のソースコードと一緒にパッケージングするHook
      const commandHooks = {
        afterBundling(inputDir: string, outputDir: string): string[] {
          return [`cp -r ${inputDir}/../static-local ${outputDir}`];
        },
        beforeBundling(inputDir: string, outputDir: string): string[] {
          return [];
        },
        beforeInstall(inputDir: string, outputDir: string): string[] {
          return [];
        }
      };
      const openapi = new nodejs.NodejsFunction(this, 'OpenAPI', {
        functionName: 'openapi',
        entry: '../handler-local.ts',
        handler: 'openapi',
        runtime: lambda.Runtime.NODEJS_18_X,
        bundling: {
          commandHooks
        }
      });
      api.root.addResource('openapi.yaml', {
        defaultCorsPreflightOptions: preflightOptions
      }).addMethod('GET', new apigateway.LambdaIntegration(openapi));
      const aiplugin = new nodejs.NodejsFunction(this, 'AIPlugin', {
        functionName: 'aiplugin',
        entry: '../handler-local.ts',
        handler: 'aiplugin',
        runtime: lambda.Runtime.NODEJS_18_X,
        bundling: {
          commandHooks
        }
      });
      api.root.addResource('.well-known').addResource('ai-plugin.json', {
        defaultCorsPreflightOptions: preflightOptions
      }).addMethod('GET', new apigateway.LambdaIntegration(aiplugin));
    }
  }
}
```

前半部では、先ほど作成したGitHub APIを呼び出す関数(①)とAPI Gateway(②)を作成しています。

また、コンテキスト`stage`を用意して環境を意識した構造にしました。ここでは、ローカル環境(`local`)かAWS環境(`aws`)かをパラメータとして取得するようにしています。

ローカル環境(`local`)の場合(③)に、`static-local`配下もパッケージング対象として、プラグインマニフェストやOpenAPI仕様のLambda関数/API Gatewayリソースも作成するようにしています。
AWS環境(`aws`)の場合は、次回後編記事で紹介します。

なお、ここでは簡易的にGitHub APIのアクセスートークンもコンテキストから取得するようにしています[^2]。

[^2]: これだとCloudFormationテンプレートにもトークンが出力されれますので、セキュリティ上望ましくありません。

## ChatGPTとローカルAPIを連携する

ここまでくるとSAM CLIを使ってローカルでAPIを実行できます。

その前に、プラグインAPIはGitHub APIにアクセスしますので、事前にGitHubトークンを作成しておく必要があります。

- [GitHub Docs - Creating a personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)

ソースコードをバンドルして、テンプレートを作成します。
`cdk`ディレクトリで以下を実行します。

```shell
export GITHUB_TOKEN=<your-github-token>
cdk synth --no-staging \
  --context github-token=${GITHUB_TOKEN} \
  --context stage=local
```

`--context`パラメータでGitHubトークンや環境(`local`)を指定します。

次にSAM CLIでAPIをローカル起動します。
なお、ローカル実行にはAPIはDockerコンテナで実行されますので、別途Dockerのインストールが必要です。

```shell
sam local start-api -t ./cdk.out/CdkStack.template.json \
  --warm-containers EAGER
```

`--warm-containers EAGER`オプションを指定していますので、この時点でDocker上にLambda関数分のコンテナも起動します。
正常に起動すれば`localhost:3000`でLambda関数が呼び出せます。

curlで各APIが動作することを確認します。

```shell
# プラグインAPI
curl "http://localhost:3000/api/search?q=language:javascript"
# プラグインマニフェスト
curl http://localhost:3000/.well-known/ai-plugin.json
# OAS
curl http://localhost:3000/openapi.yaml
```

この状態でChatGPTにインストールして確認します。
なお、現時点ではChatGPT Plusユーザーのみがインストールできます(無償ユーザーは不可)。

1. 「GPT-4」 -> 「Plugins」をクリック
![](https://i.gyazo.com/21e346b54e14bfcc8b483f1b4a6baf4a.png)

2. プラグイン選択で「Plugin store」をクリック
![](https://i.gyazo.com/04bcadd165cbf5c268578a4635148be0.png)

3. 「Develop your own plugin」をクリック
![](https://i.gyazo.com/e50d1f95f4a78232e1ed95ca9a48f9c5.png)

4. Domainに`localhost:3000`を入力して、「Find manifest file」をクリック
![](https://i.gyazo.com/5c17fa93fcf8d85c38d5959ca030d7b2.png)

5. 「Install localhost plugin」をクリック
![](https://i.gyazo.com/dc248958237e18fc34e2fc42c647cac3.png)

これで以下のようにローカルで実行しているプラグインが使えるようになりました。

![](https://i.gyazo.com/cc02e099f289ec889bce78e483616b93.png)

ローカル環境ではロゴファイルをアップロードしていませんので、ロゴファイルがリンク切れになっていますが動作上は問題ありませんでした。

後は試すだけです。ChatGPTにJavaScriptで人気のあるGitHubレポジトリを探してもらいます。
以下動画です(Darkだと少し見にくいのでLightテーマにしました)。

<video alt="Video from Gyazo" width="100%" autoplay muted loop playsinline controls>
<source src="https://i.gyazo.com/9fb77284f928fe39bed3be265fbac0cc.mp4" type="video/mp4" />
</video>

ChatGPTがプロンプトに応じてこのプラグインを使うと判断し、OpenAPI仕様からパラメータを組み立て、APIコールをしている様子が分かります。
感心したのは、ChatGPTはレポジトリ検索クエリ作成時に[GitHub独自仕様](https://docs.github.com/en/search-github/searching-on-github/searching-for-repositories)を解釈しているようです(そのような情報はOpenAPI仕様に入れていないのですが...)。

今回はここまでです。
次回は、このプラグインをAWS環境にデプロイしてみたいと思います。

後日ソースコードもGitHub上に公開予定です。
