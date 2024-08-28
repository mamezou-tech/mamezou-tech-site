---
title: Using the High-Speed JavaScript Runtime LLRT (Beta) for AWS Lambda
author: noboru-kudo
date: 2024-02-21T00:00:00.000Z
tags: [lambda, AWS, サーバーレス]
image: true
translate: true
---




In on-demand services like AWS Lambda, delays caused by cold starts can be a problem. Although the extent of the delay varies depending on the runtime environment used, even relatively lightweight runtime environments like Node.js experience delays due to cold starts.

I recently read the following article:

[Publickey - AWS releases 'LLRT' (Low Latency Runtime), a lightweight JavaScript runtime focused on fast startup, as open source for use with AWS Lambda](https://www.publickey1.jp/blog/24/awsjavascriptllrtlow_latency_runtimeaws_lambda.html)

It seems that AWS is experimentally developing a new JavaScript runtime called LLRT (Low Latency Runtime). The official repository is as follows:

- [GitHub awslabs/llrt](https://github.com/awslabs/llrt)

The official repository introduces LLRT as follows:

> LLRT (Low Latency Runtime) is a lightweight JavaScript runtime designed to address the growing demand for fast and efficient Serverless applications. LLRT offers up to over 10x faster startup and up to 2x overall lower cost compared to other JavaScript runtimes running on AWS Lambda
> 
> It's built in Rust, utilizing QuickJS as JavaScript engine, ensuring efficient memory usage and swift startup.

Until now, Node.js has been the standard for using JavaScript with Lambda, but LLRT, specialized for use on serverless platforms, may soon become a new option. Thinking it sounded promising, I decided to give it a try.

## Preparing a Lambda Function

First, prepare the target Lambda function. Here, I prepared the following handler in TypeScript.

```typescript:lambda/index.ts
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const dynamodbClient = new DynamoDBClient();
const documentClient = DynamoDBDocumentClient.from(dynamodbClient);

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const body = JSON.parse(event.body || '{}');
  const id = Math.random().toString(36).substring(2);
  await documentClient.send(new PutCommand({
    TableName: process.env.EXAMPLE_TABLE_NAME,
    Item: { id, name: body.name }
  }));
  const resp = await documentClient.send(new GetCommand({
    TableName: process.env.EXAMPLE_TABLE_NAME,
    Key: { id }
  }));

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(resp.Item)
  };
};
```

The event handler performs PUT/GET operations on a DynamoDB table.

For building TypeScript, I used [esbuild](https://esbuild.github.io/). I prepared the following script.

```javascript:lambda/build.mjs
import esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['index.ts'],
  logLevel: 'info',
  platform: 'node',
  target: 'es2020',
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  bundle: true,
  minify: true,
  outdir: 'build',
  format: 'esm',
  outExtension: {
    '.js': '.mjs'
  },
  external: ['@aws-sdk/*']
});
```
I used esbuild for transpiling and bundling to JavaScript, and minifying.

LLRT includes the main AWS SDK v3[^1], so there's no need to bundle them. They are excluded by specifying them in `external`.

[^1]: The AWS SDKs bundled with LLRT are listed in the official repository's [README](https://github.com/awslabs/llrt?tab=readme-ov-file#using-aws-sdk-v3-with-llrt).

## Deploying Lambda with LLRT Runtime

Here, I use AWS CDK for deployment. First, create a CDK app project.

```shell
mkdir cdk && cd cdk
cdk init app -l typescript
```

The deployment script is as follows.

```typescript:cdk/libs/cdk-stack.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Effect } from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Architecture, FunctionUrlAuthType } from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { execSync } from 'child_process';

export class LlrtExampleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Build (transpile & bundle)
    execSync('node build.mjs', {
      cwd: '../lambda'
    });

    const tableName = `${this.stackName}-LLRTTest`;
    const role = new iam.Role(this, 'LlrtExampleLambdaRole', {
      roleName: `${this.stackName}-llrt-example-lambda-role`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
      inlinePolicies: {
        DynamoDBTable: new iam.PolicyDocument({
          statements: [new iam.PolicyStatement({
            effect: Effect.ALLOW,
            resources: [
              `arn:aws:dynamodb:*:${this.account}:table/${tableName}`
            ],
            actions: ['dynamodb:GetItem', 'dynamodb:PutItem']
          })]
        })
      }
    });

    // Lambda layer containing LLRT's bootstrap binary
    const llrtLayer = new lambda.LayerVersion(this, 'LlrtArmLayer', {
      // Download and place from below
      // https://github.com/awslabs/llrt/releases
      code: lambda.Code.fromAsset('./llrt-lambda-arm64.zip'),
      compatibleRuntimes: [lambda.Runtime.PROVIDED_AL2023],
      compatibleArchitectures: [lambda.Architecture.ARM_64]
    });
    const llrtFunction = new lambda.Function(this, 'LlrtFunction', {
      role,
      functionName: `${this.stackName}-llrt`,
      code: lambda.Code.fromAsset('../lambda/build'),
      handler: 'index.handler',
      memorySize: 128,
      runtime: lambda.Runtime.PROVIDED_AL2023, // Specify custom runtime
      architecture: Architecture.ARM_64,
      layers: [llrtLayer],
      environment: {
        EXAMPLE_TABLE_NAME: tableName
      }
    });
    const llrtFuncUrl = new lambda.FunctionUrl(this, 'LlrtFunctionURL', {
      function: llrtFunction,
      authType: FunctionUrlAuthType.NONE
    });

    new dynamodb.Table(this, 'SampleTable', {
      tableName: tableName,
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING
      }
    });
    new cdk.CfnOutput(this, 'LlrtURL', {
      value: llrtFuncUrl.url
    });
  }
}
```

The above was created with reference to the [example](https://github.com/awslabs/llrt/tree/main/example) in the official repository.

LLRT is still in beta and is not provided as a standard runtime for Lambda. It needs to be prepared separately as a [custom runtime](https://docs.aws.amazon.com/lambda/latest/dg/runtimes-custom.html).

LLRT provides an entry point (bootstrap) for this custom runtime.

- [GitHub awslabs/llrt - Releases](https://github.com/awslabs/llrt/releases)

Here, I downloaded the latest `v0.1.7-beta` llrt-lambda-arm64.zip (for ARM64) and placed it directly under the CDK project[^2]. Then, I configured this ZIP file (entry point) as a Lambda layer (llrtLayer).

[^2]: If you unzip the ZIP file for trial, you can see the bootstrap binary file required for the custom runtime.

In the target Lambda function, the runtime is not the usual Node.js but Amazon Linux 2023 (`provided.al2023`), and the layer specified is the aforementioned layer (llrtLayer).

All that's left is to deploy.

```shell
npx cdk deploy
```

The Lambda function has Function URL enabled. I obtained the URL and executed a cold start with curl.

```shell
STACK_NAME=your-stack-name
LLRT_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME \
  --query "Stacks[0].Outputs[?OutputKey=='LlrtURL'].OutputValue" --output text)

curl -H 'Content-Type: application/json' $LLRT_URL -d '{"name": "mamezou"}'
> {"id":"h1p0wi20p","name":"mamezou"}
```

It seems to be working fine. Let's check the logs in CloudWatch.

![cloudwatch](https://i.gyazo.com/3c0c6b1507222967ccdbe448bbecb6fe.png)

The initialization time (Init) is 58ms, and the total time is about 106ms, which is very fast[^3].

[^3]: I learned for the first time that in the case of custom runtimes, the Init time is included in The Billed Duration.

## Comparing Execution Time with Node.js Runtime

Let's see how much faster it has become compared to the Node.js runtime. I deployed the same Lambda function with the Node.js (v20) runtime for comparison.

Below are excerpts from the REPORT logs when cold starting 5 times with each runtime.

- Node.js(v20)
```
Duration: 1109.67 ms Billed Duration: 1110 ms Memory Size: 128 MB Max Memory Used: 92 MB Init Duration: 640.88 ms
Duration: 1057.59 ms Billed Duration: 1058 ms Memory Size: 128 MB Max Memory Used: 94 MB Init Duration: 640.50 ms
Duration: 1072.59 ms Billed Duration: 1073 ms Memory Size: 128 MB Max Memory Used: 94 MB Init Duration: 666.84 ms
Duration: 1117.04 ms Billed Duration: 1118 ms Memory Size: 128 MB Max Memory Used: 94 MB Init Duration: 668.36 ms
Duration: 1053.59 ms Billed Duration: 1054 ms Memory Size: 128 MB Max Memory Used: 93 MB Init Duration: 609.24 ms
```

- LLRT
```
Duration: 58.47 ms Billed Duration: 105 ms Memory Size: 128 MB Max Memory Used: 21 MB Init Duration: 46.37 ms
Duration: 25.86 ms Billed Duration: 65 ms Memory Size: 128 MB Max Memory Used: 21 MB Init Duration: 38.24 ms
Duration: 51.15 ms Billed Duration: 100 ms Memory Size: 128 MB Max Memory Used: 21 MB Init Duration: 48.06 ms
Duration: 51.15 ms Billed Duration: 100 ms Memory Size: 128 MB Max Memory Used: 21 MB Init Duration: 48.06 ms
Duration: 31.13 ms Billed Duration: 74 ms Memory Size: 128 MB Max Memory Used: 21 MB Init Duration: 42.38 ms
```

The results are clear. For this Lambda function, the LLRT runtime is more than 10 times faster. According to the [article](https://www.publickey1.jp/blog/24/awsjavascriptllrtlow_latency_runtimeaws_lambda.html), the main reason for the speedup is the lack of a JIT compiler, but it's surprising how much of a difference it makes.

What about warm starts? I also ran each runtime 5 times for warm starts.

- Node.js(v20)
```
Duration: 117.48 ms Billed Duration: 118 ms Memory Size: 128 MB Max Memory Used: 93 MB
Duration: 89.97 ms Billed Duration: 90 ms Memory Size: 128 MB Max Memory Used: 93 MB
Duration: 138.48 ms Billed Duration: 139 ms Memory Size: 128 MB Max Memory Used: 93 MB
Duration: 129.71 ms Billed Duration: 130 ms Memory Size: 128 MB Max Memory Used: 93 MB
Duration: 142.57 ms Billed Duration: 143 ms Memory Size: 128 MB Max Memory Used: 93 MB
```

- LLRT
```
Duration: 42.87 ms Billed Duration: 43 ms Memory Size: 128 MB Max Memory Used: 21 MB
Duration: 33.24 ms Billed Duration: 34 ms Memory Size: 128 MB Max Memory Used: 21 MB
Duration: 38.43 ms Billed Duration: 39 ms Memory Size: 128 MB Max Memory Used: 21 MB
Duration: 34.10 ms Billed Duration: 35 ms Memory Size: 128 MB Max Memory Used: 21 MB
Duration: 34.37 ms Billed Duration: 35 ms Memory Size: 128 MB Max Memory Used: 21 MB
```

In the case of this Lambda function, LLRT is more than twice as fast even for warm starts.

## Summary

This was a brief look at trying out LLRT. The effects were beyond my expectations. Although it's still experimental and its future is uncertain, the day when it can be used as a standard runtime for Lambda is eagerly awaited.

Of course, LLRT is not suitable for all cases. The [official repository](https://github.com/awslabs/llrt?tab=readme-ov-file#limitations) mentions the following:

> There are many cases where LLRT shows notable performance drawbacks compared with JIT-powered runtimes, such as large data processing, Monte Carlo simulations or performing tasks with hundreds of thousands or millions of iterations. LLRT is most effective when applied to smaller Serverless functions dedicated to tasks such as data transformation, real-time processing, AWS service integrations, authorization, validation, etc.

Since there's no JIT compiler, there are certainly disadvantages. It's a rule of thumb to use LLRT in conjunction with other runtimes, including Node.js, depending on the situation, but for short-duration, pay-as-you-go services like Lambda, LLRT could become a strong option.
