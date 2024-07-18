---
title: LambdaでPlaywrightを動かす(Lambdaレイヤー / コンテナ)
author: noboru-kudo
date: 2024-07-19
tags: [lambda, AWS, playwright, container, tips, テスト]
image: true
---

今クロスブラウザテストでよく使われるツールといえば[Playwright](https://playwright.dev/)ですね。
テストでなくとも単純にブラウザ自動化ツールやスクレイビングツールとして使っている現場も多いかと思います。

とある事情で、Lambda上でPlaywrightを動かしてみましたが、予想以上に苦戦したので備忘録も兼ねて手順をまとめます。

## Lambdaレイヤーを使う

これが一番簡単な方法です。

Playwright等のツールはそれ単体では動作せず、Chromium等のブラウザをインストールしなければなりません。
とはいえ、基本的にLambdaはマネージドサービスですので、自由にそのランタイム環境をカスタマイズできる訳ではありません。
また、Lambda関数をパッケージングするZIPファイルは、サイズが50MB(解凍後は250MB)以内という制約[^1]がありますので、そのままブラウザをインストールできません。

[^1]: <https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html>

ありがたいことに、Lambda用に縮小版のChromiumをビルドして提供してくれている方がいます。

- [GitHub - @sparticuz/chromium](https://github.com/Sparticuz/chromium)

さらに、これがLambdaレイヤーとして公開されています。

- [GitHub - chrome-aws-lambda-layer](https://github.com/shelfio/chrome-aws-lambda-layer)

これを使ってみました。

### Lambda関数

Lambdaのイベントハンドラは以下のようになります。

```typescript:lambda/func-with-layer.ts
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { chromium as playwright } from 'playwright';
import chromium from '@sparticuz/chromium';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const body = JSON.parse(event.body ?? '{}');
  let browser;
  try {
    browser = await playwright.launch({
      args: chromium.args, // ライブラリ提供
      headless: true,
      executablePath: await chromium.executablePath() // ライブラリ提供(Chromium配置場所)
    });
    const page = await browser.newPage();
    await page.goto(body.url);

    await page.waitForTimeout(3000);
    const bodyHTML = await page.evaluate(() => document.body.outerHTML);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html'
      },
      body: bodyHTML
    };
  } finally {
    if (browser) await browser.close();
  }
};
```

単純に指定されたURLをスクレイピングしてbodyタグ配下のHTMLを返すものです。
`args`や`executablePath`等のPlaywrightの起動引数は、ライブラリで提供されているものを使います。

### デプロイ(AWS CDK)

これをデプロイします。ここではAWS CDKを使います。

```typescript
export class PlaywrightLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lambda LayerのARNは以下より取得
    // https://github.com/shelfio/chrome-aws-lambda-layer?tab=readme-ov-file#available-regions
    const chromeLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'ChromeLayer', 
      'arn:aws:lambda:ap-northeast-1:764866452798:layer:chrome-aws-lambda:45');
    const layerFunc = new nodejs.NodejsFunction(this, 'PlaywrightLambdaWithLayer', {
      functionName: 'playwright-layer-example',
      layers: [chromeLayer], // chromium/ヘルパーライブラリを含むLambdaレイヤー
      handler: 'handler', // イベントハンドラ関数名
      entry: '../lambda/func-with-layer.ts', // Lambda関数のソースコード(esbuildでバンドルする)
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 2048,
      timeout: Duration.seconds(30),
      bundling: {
        externalModules: ['@sparticuz/chromium'] // Lambda Layerとして使っているのでバンドル不要
      }
    });
    const layerFuncUrl = new lambda.FunctionUrl(this, 'PlaywrightLambdaLayerUrl', {
      function: layerFunc,
      authType: FunctionUrlAuthType.NONE
    })
    new CfnOutput(this, 'playwrightLambdaLayerUrl', {
      value: layerFuncUrl.url
    })
  }
}
```

公開LambdaレイヤーのARNは[こちら](https://github.com/shelfio/chrome-aws-lambda-layer?tab=readme-ov-file#available-regions)に掲載されているものを設定します。
また、メモリサイズやタイムアウト時間は大きめの値を設定しないとタイムアウトエラーが発生しますので注意が必要です。

デプロイ(`cdk deploy`)時に出力されるLambda関数のURLで動作確認します。

```shell
curl -v -H 'Content-Type:application/json' \
  https://xxxxxxxxxxxxxxxxxx.lambda-url.ap-northeast-1.on.aws/ \
  -d '{"url": "https://developer.mamezou-tech.com/"}'
```

HTMLが返ってくれば成功です。

## Lambdaコンテナを使う

先ほどのChromiumは縮小版ですし、Lambdaのランタイムは最小限のライブラリしか含まれていません。
この影響でPlaywrightの動作に制約がでてくることもあるかと思います。

PlaywrightをLambdaで動かすもう1つの選択肢としてコンテナを使う方法もあります[^2]。
コンテナであれば自由にベースイメージを選択できますし、Lambda関数のパッケージサイズも10GBまで緩和されます。縮小版ChromiumでなくGoogle Chrome本体でも導入できます。

[^2]: 2020年からLambdaはZIPファイルに加えてコンテナもサポートされていてます。

次はこちらを試してみました。

### Lambda関数

Lambdaのイベントハンドラは以下の通りです。

```typescript:lambda/container-func.ts
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { chromium as playwright } from 'playwright';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const body = JSON.parse(event.body ?? '{}');
  const args = [
    '--single-process', // required
    '--window-size=1920,1080',
    '--use-angle=swiftshader', // required
    '--disable-setuid-sandbox',
    '--no-sandbox',
  ];
  let browser
  try {
    browser = await playwright.launch({
      args,
      headless: true,
      executablePath: '/browser/chrome'
    });
    const page = await browser.newPage();
    await page.goto(body.url);

    await page.waitForTimeout(3000);
    const bodyHTML = await page.evaluate(() => document.body.outerHTML);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html'
      },
      body: bodyHTML
    };
  } finally {
    if (browser) await browser.close();
  }
};
```

先ほどのコードとほとんど変わりませんが、ここでは`excutablePath`に`/browser/chrome`としています。
コンテナビルド時に、ここにChromeをインストールします。

### Lambdaエントリポイント(Runtime Interface Client)

今回Lambda用にビルドするコンテナは非AWSのベースイメージを使います(理由は分かりませんがLambda用のAWSベースイメージはうまく動きませんでした)。
この場合、Lambda関数のエントリポイントとなるRuntime Interface Client(RIC)をコンテナイメージに含める必要があります[^3]。
ここではDockerのビルドキャッシュを効かせるために、アプリ内のNPMプロジェクトに含めるのではなく、専用ディレクトリに別途NPMプロジェクトを用意しました[^4]。

[^3]: この辺りの手順は以下AWS Lambdaの[公式ドキュメント](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-image.html#nodejs-image-clients)に記載されています。
[^4]: Apple SiliconのMacでLambda Runtime Interface Client(現時点でChrome for Testingはx86のみサポート)をDockerでビルド(`npm install`)すると6~7分も時間がかかりました。

```shell
mkdir -p ric 
cd ric
npm init -f
npm install aws-lambda-ric
```

### コンテナビルド

これらをもとにLambda用のコンテナを作成します。

```Dockerfile:Dockerfile
FROM node:20 as builder

RUN apt-get clean && \
    apt-get update && \
    apt-get install -y g++ make cmake unzip libcurl4-openssl-dev

# Lambda Runtime interface client
WORKDIR /ric
COPY ric/package*.json /ric
RUN npm ci

# Lambda Function
WORKDIR /app
COPY tsconfig.json package*.json container-func.ts /app/

RUN npm ci
RUN npx esbuild --bundle --format=cjs --platform=node --outdir=dist container-func.ts

FROM node:20

ARG CHORME_VERSION=126.0.6478.182

# Chromeの依存ライブラリインストール
# https://pptr.dev/troubleshooting#chrome-doesnt-launch-on-linux
RUN apt-get clean && \
    apt-get update && \
    apt-get install -y ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils

# Chrome for Testingインストール
RUN npx -y @puppeteer/browsers install chrome@${CHORME_VERSION} --platform linux && \
    mv chrome/linux-${CHORME_VERSION}/chrome-linux64 /browser && \
    rm -r chrome

# ビルダーイメージから必要なリソース(RICとLambda関数)をコピー
WORKDIR /function
COPY --from=builder /ric /function
COPY --from=builder /app/dist/container-func.js /function/index.js

ENTRYPOINT ["/usr/local/bin/npx", "aws-lambda-ric"]
CMD ["index.handler"]
```

ここでは[公式Node.js](https://hub.docker.com/_/node)イメージをベースイメージとして使い、マルチステージビルドしています。
ビルド用のイメージ(builder)では、Lambdaのエントリポイント(Runtime Interface Client)とLambda関数のソースコードをビルドしています。
ランタイムイメージの方は、インストールバージョンを固定できる[Chrome for Testing](https://github.com/GoogleChromeLabs/chrome-for-testing)をインストール[^5]し、ビルドイメージから各種ビルド結果をコピーしています。

`ENTRYPOINT`ではRuntime Interface Clientのコマンド(`aws-lambda-ric`)を指定し、`CMD`にはイベントハンドラ名を指定します。

[^5]: Playwrightは専用のブラウザインストールコマンド(`npx playwright install --with-deps chromium`)が提供されていますが、Lambdaコンテナでは動作しませんでした。

### デプロイ(AWS CDK)

Lambdaコンテナの場合は、AWS CDKでのデプロイスクリプトは以下のようになります。

```typescript
export class PlaywrightLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const containerFunc = new lambda.DockerImageFunction(this, 'PlaywrightLambda', {
      functionName: 'playwright-lambda-container-example',
      memorySize: 2048,
      timeout: Duration.seconds(30),
      // Dockerfileのディレクトリを指定
      code: lambda.DockerImageCode.fromImageAsset('../lambda', {
        platform: Platform.LINUX_AMD64, // 現時点でARMコンテナ(Chrome For Testing)はサポートされてないので注意
      }),
      architecture: lambda.Architecture.X86_64
    })
    const containerUrl = new lambda.FunctionUrl(this, 'PlaywrightLambdaContainerUrl', {
      function: containerFunc,
      authType: FunctionUrlAuthType.NONE
    })
    new CfnOutput(this, 'playwrightLambdaContainerUrl', {
      value: containerUrl.url
    })
  }
}
```

今回は`NodejsFunction`ではなく`DockerImageFunction`を使ってLambda関数のパッケージングします。
これを使うとコンテナのビルド/タグやECRへのプッシュも全自動でやってくれます。
コンテナを使っているのに、デプロイスクリプトはZIPファイル同様にシンプルですね。

デプロイはLambdaレイヤーを使うときと同様で、`cdk deploy`のみです。動作確認も出力されるURLからアクセスできます。

```shell
curl -v -H 'Content-Type:application/json' \
  https://xxxxxxxxxxxxxxxxxx.lambda-url.ap-northeast-1.on.aws/ \
  -d '{"url": "https://developer.mamezou-tech.com/"}'
```

## まとめ

LambdaでPlaywrightを動作させるのにどれくらい需要があるのか分かりませんが、Lambdaの手軽さに慣れてくると何でもここで実行したくなるものです。

参考になる方がいれば幸いです。
