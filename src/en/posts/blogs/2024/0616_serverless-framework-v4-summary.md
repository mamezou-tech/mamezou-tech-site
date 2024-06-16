---
title: Organizing the Changes in Serverless Framework v4
author: noboru-kudo
date: 2024-06-16T00:00:00.000Z
tags:
  - serverless-framework
  - lambda
  - サーバーレス
  - AWS
  - IaC
image: true
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/blogs/2024/06/16/serverless-framework-v4-summary/).
:::



Recently (2024-06-14), the GA release of Serverless Framework v4 was announced.

- [Serverless Framework V4 Generally Available](https://www.serverless.com/blog/serverless-framework-v4-general-availability)

This time, I have subjectively organized the main changes in this v4 release.

## License Change

If you fall under the target users, this is the most impactful change. Although there was a [pre-announcement](https://www.serverless.com/blog/serverless-framework-v4-a-new-model) in 2023, it has now become mandatory for organizations with a certain scale of revenue to use it for a fee.

According to the [official documentation](https://www.serverless.com/framework/docs/guides/upgrading-v4), it is described as follows:

> As we announced at the end of 2023, Serverless Framework CLI will continue to be free for individual developers and small businesses, but will no longer be free for Organizations that have greater than $2M in annual revenue. These Organizations will require a commercial Subscription.
> 
> These changes only apply to Serverless Framework V.4 and beyond and not to earlier versions. Serverless Framework V.3 will continue to be maintained via critical security and bug fixes through 2024.

Even if you are only using the CLI, organizations with annual revenue exceeding $2M will need to purchase a paid subscription (and v3 support will also end by the end of 2024).

Looking at the [Pricing page](https://www.serverless.com/pricing) on the official site, it seems that you purchase in units called "credits."
Currently, only 2 credits are free, and beyond that, there are bundles of 15 credits for $60, 50 credits for $175, and 300 credits for $750 per month. You need to purchase the total number required by your organization by combining these.
Additionally, there are discounts for small businesses and annual payments, which can make it a bit cheaper ([see the FAQ on the Pricing page](https://www.serverless.com/pricing)).

Note that credits are only usable for the relevant month and cannot be carried over to the next month if unused, so be careful not to purchase excessively.

Regarding this "credit" billing unit, if you are only using the CLI (without using the Serverless Dashboard), 1 credit is consumed per service instance.
This "service instance" is defined as follows:

> A Service Instance in the Serverless Framework is defined by a specific combination of "service", "stage", and "region" parameters in your serverless.yml file, essentially representing a unique deployment in a particular stage and region. Think of it as a distinct AWS CloudFormation stack managed by the Serverless Framework.

For example, if you are operating in three environments: development, staging, and production, with a multi-region configuration in Tokyo and Osaka, you will need to purchase 1 (service) * 3 (stage) * 2 (region) = 6 credits every month.

Subscriptions can be purchased from the [Serverless Framework Dashboard](https://app.serverless.com/settings/billing) or the [AWS Marketplace](https://aws.amazon.com/marketplace/pp/prodview-ok24yw6x5wcrg).
If individual payments are cumbersome due to internal procedures, it seems better to purchase via the AWS Marketplace.

:::alert
This information is as of the time of writing. Always check the official [Pricing page](https://www.serverless.com/pricing) for the latest pricing information.
:::

Due to this license change, regardless of whether you are subject to a paid subscription, if you use v4, you will need to log in to the [Serverless Framework Dashboard](http://app.serverless.com/) (serverless login) or set either an access key (`SERVERLESS_ACCESS_KEY`) or a license key (`SERVERLESS_LICENSE_KEY`) as an environment variable.

## AWS Dev Mode (via CLI)

- [Serverless Framework Doc - CLI - Dev](https://www.serverless.com/framework/docs/providers/aws/cli-reference/dev)

You can immediately deploy and verify the operation of Lambda under development on AWS from your local environment.
Moreover, the source code modified in the IDE can be executed immediately without redeploying[^1].

[^1]: Similar to SST's [Live Lambda Development](https://docs.sst.dev/live-lambda-development).

Until now, it was only available on the [Serverless Framework Dashboard](http://app.serverless.com/) or the [Serverless Console](https://www.serverless.com/console-docs/docs), but now it can also be used from the CLI[^2].

[^2]: I had only used it from the CLI, so embarrassingly, I didn't know this feature existed.

The usage is simple; just execute the dev subcommand of the CLI.

The following command is an example of running a Lambda function in Dev mode as the `local` stage.

```shell
npx serverless dev --stage local
```
```
(CLI output result)
Dev ϟ Mode

Dev Mode redirects live AWS Lambda events to your local code enabling you to develop faster without the slowness of deploying changes.

Docs: https://www.serverless.com/framework/docs/providers/aws/cli-reference/dev

Run "serverless deploy" after a Dev Mode session to restore original code.

Functions:
  hello: slsv4-local-hello (91 kB)

Endpoints:
  GET - https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/

✔ Connected (Ctrl+C to cancel)

v→ λ hello ── aws:apigateway:v2:get:/ <- executed from another terminal with curl (logs are also output here)
─ invoke
← λ hello (200)
```

A CloudFormation stack is created and deployed for Dev mode. After that, the terminal remains connected to the deployed Lambda function.
When you execute the function there, the logs are also output to the same terminal session.

Internally, the Dev mode deployment does not actually deploy the source code as Lambda; instead, it deploys glue code that connects the local environment and the Lambda function via WebSocket (using [AWS IoT Core](https://aws.amazon.com/iot-core/)) and transfers the function execution requests to the local environment.
Therefore, after the initial deployment, any changes to the source code locally can be immediately verified (no redeployment needed).

I think this feature brings maximum development efficiency, but initially, it directly executes the CloudFormation stack from the local environment, which may be difficult in many environments due to policy reasons.

## Variable Resolver (Terraform / Vault Integration)
Until now, it natively supported CloudFormation outputs and SSM Parameter Store/Secrets Manager secret values, but from v4, a mechanism called Variable Resolver has been introduced, which can be used for variable resolution of any external service.

> The Variable Resolver is a new concept in Serverless Framework V.4 that allows you to use different sources for your variables.

With this, Terraform outputs and Vault secret values can now be treated as variables.

- [Serverless Framework Doc - Variables - Reference HashiCorp Terraform State Outputs](https://www.serverless.com/framework/docs/guides/variables/terraform)
- [Serverless Framework Doc - Variables - Reference HashiCorp Vault Secrets](https://www.serverless.com/framework/docs/guides/variables/vault)

As an example, I have incorporated Terraform outputs into serverless.yml.

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

// Output -> To be incorporated as a variable in Serverless Framework
output "dynamodb_table_name" {
  value = aws_dynamodb_table.sample.name
}
```

- Serverless Framework (serverless.yml)
```yaml
service: ServerlessV4Sample

provider:
  name: aws
  region: ap-northeast-1
  runtime: nodejs20.x
stages:
  default:
    # Terraform Variable Resolver (specifying S3 remote state)
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
      # Incorporating output from Terraform
      SIMPLE_TABLE: ${terraform:outputs:dynamodb_table_name}
```
The usage of Vault is almost the same as this. From v4 onwards, it seems that variable resolution from external services will be sequentially introduced using this Variable Resolver mechanism.

Since Terraform/Vault are widely used tools for multi-cloud environments, I think there are quite a few sites that have been eagerly awaiting this feature.

## Built-in Support for TypeScript (esbuild)

In v3, when developing with Node.js runtime + TypeScript, many sites were using the serverless-esbuild plugin to build with [esbuild](https://github.com/evanw/esbuild).
From v4, esbuild support is now built-in.

- [Serverless Framework Doc - AWS Lambda Build Configuration](https://www.serverless.com/framework/docs/providers/aws/guide/building)

From v4, a `build` block can be added directly under the root to configure the build settings.
Currently, it is only esbuild, but it seems that it will be expanded to other tools in the future.

Below is an example of building a Lambda function with ESM + minification in v4.

```yaml:serverless.yml
service: ServerlessV4Sample

package:
  patterns: ['package.json'] # type=module
  
build:
  esbuild:
    minify: true
    format: 'esm'
# This did not work (forced output as .js)
#    outExtension:
#      .js: .mjs
```

Note that the built-in esbuild build is not compatible with the serverless-esbuild plugin.

:::info
Initially, I tried to change the extension to .mjs with the esbuild `outExtension` parameter, but at the current time (v4.1.0), this setting did not work with esbuild support (output as .js), resulting in a runtime error.
Therefore, the above was avoided by including a package.json specified as `type:module` in the package bundle.
:::

## Deprecation of Non-AWS Providers

- [Serverless Framework Doc - Upgrading to V4 - Deprecation Of Non-AWS Providers](https://www.serverless.com/framework/docs/guides/upgrading-v4#deprecation-of-non-aws-providers)

Serverless Framework had supported not only AWS but also Azure and GCP, etc., but with v4, it is deprecated, and they will focus solely on AWS.
Well, I haven't heard much about using Serverless Framework for anything other than AWS, so I think it was inevitable for the Serverless Framework development team to focus and concentrate.

However, there are plans to support non-AWS providers through the Extension mechanism in the future.

## In Conclusion

There are still other changes from v4, but I have summarized the main changes.
Development has been carried out with backward compatibility in mind, and apart from the license change, there are relatively few major changes.

I hope this is helpful.
