---
title: ユニバーサルJavaScriptサーバーNitroをAWS Lambdaにデプロイする
author: noboru-kudo
date: 2022-07-20
tags: [nuxt, AWS, サーバーレス, serverless-framework, lambda, vue]
templateEngineOverride: md
---

2022-04-19にハイブリッドVueフレームワークの[Nuxt3](https://nuxt.com/)がRCバージョンになりました。

@[og](https://nuxt.com/blog/nuxt3-rc)

Nuxt3はVue3やTypeScript、Vite対応等の様々な改良・機能追加がありますが、大きな変更の1つにNitroエンジンの搭載があります。

- [Nitro](https://nitro.build/)

Nitro自体はNuxtに依存するものではなく、Node.js上で動作する軽量・高速JavaScriptサーバーです。Nuxt3ではユニバーサルモードのサーバー側ビルド・実行環境に利用されています。
Nitroの大きな特徴として、当初からサーバーレス環境を前提としてデザインされており、[AWS Lambda](https://aws.amazon.com/jp/lambda/)や[Netlify](https://www.netlify.com/)、[Vercel](https://vercel.com/)等の各種サーバーレスプロバイダー上で動作可能です。
このようなマルチプロバイダー対応や移植性の高さから、NitroはユニバーサルJavaScriptサーバーというのが売りのようです。

今回はNuxt3ではなく、あえてNitroにフォーカスしてその機能を試してみました。

:::info
2025年2月10日:
現時点のNitroの最新バージョン(v2.10.4)に合わせて記事全体を更新しました。
:::

## Nitroをセットアップする

Nitroドキュメント上でZero-Configセットアップと言っているだけあって簡単です。

Nitroをインストールします(現時点で最新のv2.10.4)。ここではNitro本体に加えてTypeScriptもインストール、初期化しました。

```shell
npx giget@latest nitro nitro-sample --install
```

`nitro-sample`ディレクトリが作成され、Nitroのプロジェクトテンプレートが作成されます。

これで準備完了です。

## NitroでREST APIを作成する

Nitroは実装も最小限です。REST APIは`/server/routes`ディレクトリ内にリクエストを処理するスクリプトファイルを配置するだけです。
今回は/fooでアクセス可能なGET/POSTメソッドを用意しました。以下追加したファイルです。

```typescript:/server/routes/foo.get.ts
export default eventHandler((event) => {
  const { name } = getQuery(event);
  return `GET: ${name}`;
})
```

```typescript:/server/routes/foo.post.ts
export default eventHandler(async (event) => {
  const { name } = await readBody<{ name: string }>(event);
  return `POST: ${name}`;
})
```

非常にシンプルですね。それぞれのファイルがAPIのRouteになります。
Nitroは内部的には[H3](https://github.com/unjs/h3)という軽量サーバーを利用して、リクエストを処理します。
このroutesディレクトリ内のスクリプトは、ファイル名やディレクトリ構成に応じてそのままH3のRouteとしてマッピングされます。明示的なルーティングの定義は不要です。
実装方法の詳細は、以下NitroドキュメントやH3のドキュメントを参照してください。

- [Nitro - Route Handling](https://nitro.build/guide/routing)

また、上記スクリプトファイルにはimport文がありませんが、掲載を省略している訳ではありません。
NitroではAuto Import機能が備わっており、よく利用するものはimportを記述する必要がありません。

- [Nitro - Auto Imports](https://nitro.build/guide/utils#auto-imports)

これをローカル環境で起動します。以下のコマンドを実行します。

```shell
npm run dev
```

デフォルトはローカルホストの3000ポートでサーバーが起動します。
以下curlでの動作確認です。

```shell
curl "http://localhost:3000/foo?name=mamezou"
> GET: mamezou

curl "http://localhost:3000/foo" -d '{"name": "mamezou"}' -H 'Content-Type: application/json'
> POST: mamezou 
```

リクエストが正常に処理されました。ホットリロードも効いていますので、ソースコードの変更は即座に反映されます。

:::info
ここでは記載しませんでしたが、REST APIだけでなく、ストレージやキャッシュ、静的リソースのサポートもあります。
必要に応じて参照してください。

- [Nitro - Storage Layer](https://nitro.unjs.io/guide/storage/)
- [Nitro - Cache API](https://nitro.unjs.io/guide/cache/)
- [Nitro - Assets Handling](https://nitro.unjs.io/guide/assets/)
:::

## ローカルでビルド・実行する
まずは、ローカル環境でこのAPIをビルドしてみます。
以下のコマンドを実行します。

```shell
npm run build
```

デフォルトは`.output`ディレクトリ配下にビルド成果物が出力されます。
ここでは、`.output`配下は以下のようになりました。

```
.output
├── nitro.json
├── public
└── server
    ├── chunks
    │ ├── nitro
    │ │ ├── nitro.mjs
    │ │ └── nitro.mjs.map
    │ └── routes
    │     ├── foo.get.mjs
    │     ├── foo.get.mjs.map
    │     ├── foo.post.mjs
    │     ├── foo.post.mjs.map
    │     ├── index.mjs
    │     └── index.mjs.map
    ├── index.mjs
    ├── index.mjs.map
    ├── node_modules
    │ └── node-mock-http
    │     (省略)
    └── package.json

12 directories, 16 files
```

Nitroはバンドラーとして[rollup](https://rollupjs.org/guide/en/)を使い、Tree Shakingで必要なもののみをバンドルします。
このため、プロジェクト配下の`node_modules`ディレクトリはデプロイに不要です。
`.output`ディレクトリのみがデプロイ対象となりますので、かなり軽量になります。

デフォルトではNode.js Server向けにビルドされます。これをローカル環境で起動する場合は、以下のようになります。

```shell
node .output/server/index.mjs
```

Node.js Serverが起動します。これで先程同様にcurl等でAPIにアクセスできます。
Node.jsのコンテナ等でNitroを動かす場合は、これを利用することになるかと思います。

:::info
ビルド設定は、`nitro.config.ts`を別途作成することで、環境によってカスタマイズできます。
例えば、バンドルをミニファイする場合は以下のように指定します。

```typescript
export default defineNitroConfig({
  minify: true
})
```
設定の詳細は、以下公式ドキュメントを参照してください。

- [Nitro Configuration](https://nitro.unjs.io/config/)
:::

## Nitro REST APIをAWS Lambdaにデプロイする

前述の通り、Nitroはマルチプロバイダーのサーバーレス環境で動かすことができます。
先程はデフォルトのNode.js Serverで動かしましたが、今度はAWS Lambdaにデプロイしてみます。

Lambdaにデプロイする場合は、ビルド時にpresetを指定します。

```shell
NITRO_PRESET=aws-lambda npm run build
```

環境変数`NITRO_PRESET`に`aws-lambda`を指定します[^1]。このようにすることで、NitroはLambda用の実行コードを出力します。
Lambda以外の場合もこのpresetを変更することで、プロバイダーに応じたビルド結果へ切り替えできるようになっています。
なお、Netlify等の一部のプロバイダーではpresetを使わなくても自動検知可能です。
プロバイダー設定の詳細は[公式ドキュメント](https://nitro.build/deploy)を参照してください。

[^1]: presetの指定は設定ファイル(nitro.config.ts)でも可能です。

ビルド結果の`.output/server/chunks/nitro/nitro.mjs`を見ると、Lambdaのイベントハンドラに変わっています。

```javascript:.output/server/chunks/nitro/nitro.mjs
async function handler(event, context) {
  const query = {
    ...event.queryStringParameters,
    ...event.multiValueQueryStringParameters
  };
  const url = withQuery(
    event.path || event.rawPath,
    query
  );
  const method = event.httpMethod || event.requestContext?.http?.method || "get";
  if ("cookies" in event && event.cookies) {
    event.headers.cookie = event.cookies.join(";");
  }
  const r = await nitroApp.localCall({
    event,
    url,
    context,
    headers: normalizeLambdaIncomingHeaders(event.headers),
    method,
    query,
    body: event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString("utf8") : event.body
  });
  const isApiGwV2 = "cookies" in event || "rawPath" in event;
  const awsBody = await normalizeLambdaOutgoingBody(r.body, r.headers);
  const cookies = normalizeCookieHeader(r.headers["set-cookie"]);
  return {
    ...cookies.length > 0 && {
      ...isApiGwV2 ? { cookies } : { multiValueHeaders: { "set-cookie": cookies } }
    },
    statusCode: r.status,
    headers: normalizeLambdaOutgoingHeaders(r.headers, true),
    body: awsBody.body,
    isBase64Encoded: awsBody.type === "binary"
  };
}
```

これをAWSにデプロイします。
ここでは、LambdaのデプロイにServerless Frameworkを使います。プロジェクトルート直下にserverless.yamlを用意しました。

```yaml:serverless.yml
service: nitro-sample
provider:
  name: aws
  runtime: nodejs22.x
  region: ap-northeast-1
package:
  patterns:
    - "!**"
    - ".output/**"
functions:
  foo:
    handler: .output/server/index.handler
    url: true # Lambda Function URLを使う
```

非常にシンプルな構成にしました。
`.output`配下のファイルのみをデプロイ対象とし、`functions`には単一のLambda関数(foo)を定義しています。
Lambda関数のハンドラーには、Nitroで出力したエントリーポイントを指定します。
また、`url: true`としてAPI Gatewayを配置せずに、Lambda Function URL経由[^2]でLambda関数へアクセスできるようにしました。

[^2]: Lambda Function URLは[こちら](/blogs/2022/04/14/lambda-function-url/)の記事で紹介していますので、必要な場合はご参照ください。

```shell
npx serverless deploy
```

AWS CLIでLambadaのURLを確認し、curlでアクセスしてみます。 URLはデプロイ時の出力やマネジメントコンソールからの確認でも構いません。
```shell
# AWS CLI
LAMBDA_URL=$(aws lambda get-function-url-config --function-name nitro-sample-dev-foo --query FunctionUrl --output text)
> https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.lambda-url.ap-northeast-1.on.aws/

curl "${LAMBDA_URL}foo?name=mamezou"
> GET: mamezou

curl "${LAMBDA_URL}foo" -d '{"name": "mamezou"}' -H 'Content-Type: application/json'
> POST: mamezou 
```

Node.js Serverと同じように、AWS LambdaでNitroのAPIサーバーが使えるようになりました。

## まとめ
今回は純粋にNitroを使って、APIサーバーを作成してみました。非常にシンプルで使いやすく、Nuxt3を使わずともこれ単体でもいろいろできそうだなと思いました。

ちなみに、今回Lambdaのコールドスタートにかかった時間は240msほどでした。
ミニファイ設定等を調整すればもう少し短縮できるかもしれませんが、まずまずの数値だと思います。
とはいえ、今回はシンプルすぎるAPIでNitro以外の依存関係もないので、実用レベルになるともっとかかりそうです。

この辺りの時間が許容できなくなった場合は、その時にコンテナ等で常時起動させておくように変更すれば良さそうです。 
というのも今回実装したREST APIでLambdaに依存するコードは一切なく、Nitroのビルド時にパラメータレベルで切り替えしました。
ユニバーサルサーバーのNitroは可搬性に優れていますので、臨機応変にデプロイ先を変えていくことができそうです。

---
参考資料

- [Nitroドキュメント](https://nitro.build/guide)
- [H3 GitHubレポジトリ](https://github.com/unjs/h3)
