---
title: Running Playwright on Lambda (Lambda Layer / Container)
author: noboru-kudo
date: 2024-07-19T00:00:00.000Z
tags:
  - lambda
  - AWS
  - playwright
  - container
  - tips
  - テスト
image: true
translate: true
---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/blogs/2024/07/19/lambda-playwright-container-tips/).
:::

Currently, a commonly used tool for cross-browser testing is [Playwright](https://playwright.dev/). Even outside of testing, many teams use it simply as a browser automation tool or for scraping purposes.

Due to certain circumstances, I attempted to run Playwright on Lambda, and I struggled more than expected, so I will summarize the steps as a memo.

## Using Lambda Layers

This is the easiest method.

Tools like Playwright do not work on their own; you need to install a browser like Chromium. However, since Lambda is fundamentally a managed service, you cannot freely customize its runtime environment. Additionally, there is a constraint that the ZIP file packaging the Lambda function must be within 50MB (250MB after decompression)[^1], so you cannot install the browser directly.

[^1]: <https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html>

Fortunately, there are people who have built a reduced version of Chromium for Lambda.

- [GitHub - @sparticuz/chromium](https://github.com/Sparticuz/chromium)

Moreover, this is published as a Lambda layer.

- [GitHub - chrome-aws-lambda-layer](https://github.com/shelfio/chrome-aws-lambda-layer)

I tried using this.

### Lambda Function

The Lambda event handler looks as follows.

```typescript:lambda/func-with-layer.ts
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { chromium as playwright } from 'playwright';
import chromium from '@sparticuz/chromium';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const body = JSON.parse(event.body ?? '{}');
  let browser;
  try {
    browser = await playwright.launch({
      args: chromium.args, // Provided by the library
      headless: true,
      executablePath: await chromium.executablePath() // Provided by the library (Chromium location)
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

This simply scrapes the specified URL and returns the HTML under the body tag. The Playwright launch arguments like `args` and `executablePath` are provided by the library.

### Deployment (AWS CDK)

Let's deploy this. Here, we will use AWS CDK.

```typescript
export class PlaywrightLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The ARN for the Lambda Layer can be obtained from the following
    // https://github.com/shelfio/chrome-aws-lambda-layer?tab=readme-ov-file#available-regions
    const chromeLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'ChromeLayer', 
      'arn:aws:lambda:ap-northeast-1:764866452798:layer:chrome-aws-lambda:45');
    const layerFunc = new nodejs.NodejsFunction(this, 'PlaywrightLambdaWithLayer', {
      functionName: 'playwright-layer-example',
      layers: [chromeLayer], // Lambda layer including chromium/helper library
      handler: 'handler', // Event handler function name
      entry: '../lambda/func-with-layer.ts', // Source code of the Lambda function (to be bundled with esbuild)
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 2048,
      timeout: Duration.seconds(30),
      bundling: {
        externalModules: ['@sparticuz/chromium'] // No bundling needed as it's used as a Lambda Layer
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

The ARN for the public Lambda layer is set from [here](https://github.com/shelfio/chrome-aws-lambda-layer?tab=readme-ov-file#available-regions). Also, be cautious as you need to set larger values for memory size and timeout duration to avoid timeout errors.

You can verify the operation using the URL of the Lambda function output during deployment (`cdk deploy`).

```shell
curl -v -H 'Content-Type:application/json' \
  https://xxxxxxxxxxxxxxxxxx.lambda-url.ap-northeast-1.on.aws/ \
  -d '{"url": "https://developer.mamezou-tech.com/"}'
```

If HTML is returned, it is successful.

## Using Lambda Containers

The previously mentioned Chromium is a reduced version, and the Lambda runtime includes only minimal libraries. This may impose constraints on the operation of Playwright.

Another option for running Playwright on Lambda is to use containers[^2]. With containers, you can freely choose the base image, and the package size for Lambda functions is relaxed to 10GB. You can also install the full version of Google Chrome instead of the reduced version of Chromium.

[^2]: Since 2020, Lambda has supported containers in addition to ZIP files.

Next, I tried this.

### Lambda Function

The Lambda event handler is as follows.

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

This code is almost identical to the previous one, but here `excutablePath` is set to `/browser/chrome`. During the container build, Chrome will be installed here.

### Lambda Entry Point (Runtime Interface Client)

The container we are building for Lambda uses a non-AWS base image (for reasons I do not know, the AWS base image for Lambda did not work well). In this case, you need to include the Runtime Interface Client (RIC) in the container image[^3]. Here, to utilize Docker's build cache, I prepared a separate NPM project in a dedicated directory instead of including it in the app's NPM project[^4].

[^3]: The steps for this are documented in the official AWS Lambda [documentation](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-image.html#nodejs-image-clients).
[^4]: Building the Lambda Runtime Interface Client (currently, Chrome for Testing only supports x86) on an Apple Silicon Mac took about 6-7 minutes.

```shell
mkdir -p ric 
cd ric
npm init -f
npm install aws-lambda-ric
```

### Container Build

Based on these, we will create a container for Lambda.

```Dockerfile:Dockerfile
FROM node:20 as builder

RUN apt-get clean && \
    apt-get update && \
    apt-get install -y g++ make cmake unzip libcurl4-openssl-dev

# Lambda Runtime interface client
WORKDIR /ric
RUN --mount=type=bind,source=ric/package.json,target=/ric/package.json \
    --mount=type=bind,source=ric/package-lock.json,target=/ric/package-lock.json \
    --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci

# Lambda Function
WORKDIR /app
RUN --mount=type=bind,source=package.json,target=/app/package.json \
    --mount=type=bind,source=package-lock.json,target=/app/package-lock.json \
    --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci

RUN --mount=type=bind,source=web-scraper.ts,target=/app/container-func.ts \
    npx esbuild --bundle --format=cjs --platform=node --outdir=dist container-func.ts

FROM node:20

ARG CHORME_VERSION=126.0.6478.182

# Install dependencies for Chrome
# https://pptr.dev/troubleshooting#chrome-doesnt-launch-on-linux
RUN apt-get clean && \
    apt-get update && \
    apt-get install -y ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils

# Install Chrome for Testing
RUN npx -y @puppeteer/browsers install chrome@${CHORME_VERSION} --platform linux && \
    mv chrome/linux-${CHORME_VERSION}/chrome-linux64 /browser && \
    rm -r chrome

# Copy necessary resources (RIC and Lambda function) from the builder image
WORKDIR /function
COPY --from=builder /ric /function
COPY --from=builder /app/dist/container-func.js /function/index.js

ENTRYPOINT ["/usr/local/bin/npx", "aws-lambda-ric"]
CMD ["index.handler"]
```

Here, we use the [official Node.js](https://hub.docker.com/_/node) image as the base image and perform a multi-stage build. In the builder image, we build the Lambda entry point (Runtime Interface Client) and the source code of the Lambda function. In the runtime image, we install [Chrome for Testing](https://github.com/GoogleChromeLabs/chrome-for-testing) with a fixed version[^5] and copy various build results from the builder image.

In `ENTRYPOINT`, we specify the command for the Runtime Interface Client (`aws-lambda-ric`), and in `CMD`, we specify the event handler name.

[^5]: Playwright provides a dedicated browser installation command (`npx playwright install --with-deps chromium`), but it did not work in the Lambda container.

### Deployment (AWS CDK)

For Lambda containers, the AWS CDK deployment script looks as follows.

```typescript
export class PlaywrightLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const containerFunc = new lambda.DockerImageFunction(this, 'PlaywrightLambda', {
      functionName: 'playwright-lambda-container-example',
      memorySize: 2048,
      timeout: Duration.seconds(30),
      // Specify the directory of the Dockerfile
      code: lambda.DockerImageCode.fromImageAsset('../lambda', {
        platform: Platform.LINUX_AMD64, // Currently, ARM containers (Chrome For Testing) are not supported
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

This time, instead of using `NodejsFunction`, we use `DockerImageFunction` to package the Lambda function. Using this, the container build/tagging and pushing to ECR are all automated. Despite using a container, the deployment script is as simple as when using ZIP files.

The deployment is done with just `cdk deploy`, similar to when using Lambda layers, and you can verify the operation from the output URL.

```shell
curl -v -H 'Content-Type:application/json' \
  https://xxxxxxxxxxxxxxxxxx.lambda-url.ap-northeast-1.on.aws/ \
  -d '{"url": "https://developer.mamezou-tech.com/"}'
```

## Conclusion

I am not sure how much demand there is for running Playwright on Lambda, but once you get used to the convenience of Lambda, you tend to want to execute everything there.

I hope this is helpful to someone.
