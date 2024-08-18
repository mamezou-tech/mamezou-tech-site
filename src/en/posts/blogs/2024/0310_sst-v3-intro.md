---
title: Deploying Serverless Applications with Pulumi-based SST (v3)
author: noboru-kudo
date: 2024-03-10T00:00:00.000Z
tags: [lambda, IaC, サーバーレス, AWS]
image: true
translate: true
---

:::info
To reach a broader audience, this article has been translated from Japanese.
You can find the original version [here](https://developer.mamezou-tech.com/blogs/2024/03/10/sst-v3-intro/).
:::



What do you use to deploy serverless applications, including AWS Lambda? There are many options to choose from, such as the Serverless Framework, SAM (Serverless Application Model), AWS CDK, Terraform, etc., and it can be difficult to decide which one to use.

Among them, the Serverless Framework, which is based on CloudFormation, has become quite popular, but starting from version 4, it is planned to become paid for organizations of a certain size or larger[^1]. Projects in the relevant organizations that cannot accept the move to a paid model will need to migrate to another tool before support for version 3 ends.

[^1]: <https://www.serverless.com/blog/serverless-framework-v4-a-new-model>

I was thinking that AWS CDK might be the strongest candidate now, but it requires a (slightly?) lower-level description than the Serverless Framework. So, I looked into [SST](https://sst.dev/), an IaC tool I had been curious about, and thought it was a nice tool, so I would like to introduce it.

## What is SST? From AWS CDK to Pulumi-based in v3
- [SST - Official Documentation](https://docs.sst.dev/)

SST stands for **S**erverless **ST**ack and is an IaC tool for AWS. As the name suggests, it is specialized for building serverless applications and falls into the same category as the Serverless Framework.

However, while the Serverless Framework is based on CloudFormation, SST (v2) is based on AWS CDK. SST (v2) provides high-level (L3) Constructs for TypeScript for AWS CDK. This allows for easy provisioning of various AWS resources with minimal description. In particular, Constructs specialized for popular front-end frameworks such as Next.js do a nice job of provisioning specific to those frameworks.

In terms of development, features like [Live Lambda Development](https://docs.sst.dev/live-lambda-development) that allow you to check the operation of Lambda functions on the actual AWS environment from a local environment, and [Resource Binding](https://docs.sst.dev/resource-binding) that binds AWS resources to web apps or Lambdas, seem to offer an excellent developer experience. As of now, the [GitHub repository](https://github.com/sst/sst) has over 19K stars, making it quite popular.

However, the upcoming version (v3) seems to have a major change: it plans to move away from using AWS CDK as its base.

- [SST Blog - Moving away from CDK](https://sst.dev/blog/moving-away-from-cdk.html)

The above article is quite long, but the first half discusses the operational issues with AWS CDK and its deployment engine, CloudFormation. Even if you have no experience with SST, if you have operated with AWS CDK or CloudFormation, you might find quite a few relatable points (especially issues like circular references and the difficulty of understanding errors).

The upcoming SST v3 aims to solve these problems by switching its deployment engine to [Pulumi](https://www.pulumi.com/)+[Terraform](https://www.terraform.io/). Even though it mentions Terraform, it does not mean moving to HCL, but rather using Terraform AWS Provider internally with Pulumi[^2], and the appearance does not seem to change much from the AWS CDK-based SST v2 description style. Also, although Terraform had a license change last year, the part used here is not subject to the new license.

[^2]: Inside Pulumi's [AWS Provider](https://github.com/pulumi/pulumi-aws), it seems to bridge Terraform and Pulumi using [pulumi-terraform-bridge](https://github.com/pulumi/pulumi-terraform-bridge).

SST v3 is being developed in a separate GitHub repository under the codename Ion.

- [GitHub - sst/ion](https://github.com/sst/ion)

It is expected to be updated to v3 in the near future, so here I tried out this v3 (alpha version).

:::alert
SST v3 is currently under active development with ongoing breaking changes. If you are trying it out for evaluation purposes, please refer to the latest information. The current v3 documentation can be accessed from the following link (until the stable release).

- [SST Ion Doc](https://ion.sst.dev/docs/)
:::

## Setting Up SST v3

Even though the base has changed to Pulumi+Terraform, since it is only used as an internal engine, there is no need to install both products individually.

Only the SST CLI is installed. The following is for macOS.

```shell
brew install sst/tap/sst

sst version
# ion.0.0.128
```

Currently, I am using `ion.0.0.128`, which is the latest version (it is being updated at a considerable pace).

## Creating Lambda Functions

Since SST v3 is still under development, I will simply publish a Lambda through API Gateway (HTTP API) without using many features.

```shell
mkdir sst-v3-api && cd sst-v3-api
npm init -f
npm install --save-dev typescript
```

Here, I created five Lambda functions as follows.

```typescript:functions/foo[1-5].ts
export const handler = async () => ({ statusCode: 200, body: 'foo' })
```

These functions simply return a fixed value.

Now, initialize this as an SST app. Execute the following command.

```shell
sst init
```

Once the execution is completed, the `.sst` directory will be created under the project root, containing various source codes for SST v3, and a `sst.config.ts` configuration file will be created.

```
.
├── .sst <- Added
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
└── sst.config.ts <- Added
```

The content of sst.config.ts is as follows.
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

Within the run function, you describe the deployment script using components provided by SST or Pulumi.

## Defining AWS Resources with SST Components

Let's describe the components for the created Lambda functions. I tried varying the customization from simple to complex.

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
      // ①Simple pattern
      .route('GET /foo', 'functions/foo1.handler')
      // ②Lambda configuration customization
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
        link: [table] // IAM Policy (inline) for Table access is automatically created
      })
      // ④Custom permissions
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
      // ⑤With path parameter
      .route('GET /foo/{id}', 'functions/foo5.handler');

    // Deploy result output
    return {
      url: api.url
    };
  }
});
```

The code is self-explanatory and probably does not need further explanation. Although it is no longer AWS CDK-based, the style of description is very similar to AWS CDK. First, an instance of API Gateway is created, and routes are defined for it, assigning the Lambda functions mentioned earlier. This alone does the build (esbuild), Lambda function deployment, and publication through API Gateway for you. It also flexibly supports customization of each Lambda.

Particularly useful is the Resource Bindings/Linking feature. When you link AWS resources required by the app, SST handles IAM policy settings and embedding resource information as global variables for you. In the case of ③ above, the following IAM policy was created by SST as an inline policy and assigned to the target Lambda function.

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

Furthermore, looking at the bundled source code of the Lambda function, the following code was added as global variables. The app can use this to access DynamoDB.

```javascript
globalThis.$SST_LINKS = {"SampleTable":{"name":"sst-v3-api-dev-SampleTableTable","type":"sst:aws:Dynamo"}};
```

Such settings are prone to errors, so this is very helpful.

Note that the above uses only SST components, but if there is no provision by SST, Pulumi components can be used, so it seems to support most use cases.

## Deploying with SST

All that's left is to deploy. Deployment is done via the SST CLI.

```shell
# IAM
sst deploy
# To specify a STAGE
sst deploy --stage=dev
```

Once the deployment is completed, the URL of API Gateway is output, and you can check it via that URL.

```shell
GW_URL=https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com
curl $GW_URL/foo
curl -X POST $GW_URL/foo
curl -X PUT $GW_URL/foo
curl -X DELETE $GW_URL/foo
curl $GW_URL/foo/1
```

To see how much faster the Pulumi-based v3 is, I deployed the same configuration with the AWS CDK-based SST v2 and measured the time for each.

| Measurement | v2    | v3   |
|-------------|-------|------|
| Initial deployment time | 60 seconds | 45 seconds |
| Updating one Lambda function | 25.3 seconds | 7.8 seconds |

Especially for updates after the second time, the deployment time has significantly improved. This seems to be a major improvement for development environments with frequent updates.

## Conclusion

After researching SST again, I found it to be a very attractive tool. However, considering the major changes in v3, it feels a bit hesitant to use the current stable version v2. Nevertheless, once v3 is released as a stable version, it seems to become a strong candidate for serverless application IaC tools. I would like to keep an eye on future developments.
