---
title: Executing Continuous Deployment of CloudFront from a Pipeline
author: noboru-kudo
date: 2024-01-28T00:00:00.000Z
tags:
  - cloud-front
  - code-pipeline
  - lambda
  - AWS
  - CI/CD
image: true
translate: true

---




What release strategies are you adopting at your site? There are various methods and products/services for safe releases, such as blue-green deployments, A/B testing, and canary releases. Of course, AWS supports various release strategies, but this time we will discuss the continuous deployment feature of CloudFront, which provides CDN.

- [AWS Doc - Safely Test CDN Configuration Changes Using Continuous Deployment of CloudFront](https://docs.aws.amazon.com/ja_jp/AmazonCloudFront/latest/DeveloperGuide/continuous-deployment.html)

CloudFront's continuous deployment prepares primary and staging CloudFront distributions and distributes traffic based on policies. Promotion from staging to primary is done through the management console, CLI, or API to achieve zero downtime releases. However, you would want to execute this workflow through a CI/CD pipeline (essentially an API call). This time, we will test the continuous deployment workflow using [CodePipeline](https://aws.amazon.com/jp/codepipeline/), a managed service from AWS.

# Overall Configuration
First, let's look at the environment we are building this time. I will explain it by dividing it into the runtime environment side and the pipeline.

## Runtime Environment (CloudFront)
![Runtime Architecture](https://i.gyazo.com/d7006035edc49e2585902b1984af80e5.png)

This is a common configuration of a website with S3 as the origin. For continuous deployment, multiple versions are released simultaneously, and the app is deployed in version-specific folders on S3.

CloudFront will have two distributions. The primary environment handles commercial traffic, while the staging environment handles only a portion of the traffic under specified conditions. In continuous deployment, the staging environment's distribution is separate from the primary environment, but it is accessed through the URL of the primary environment side. From the end-user's perspective, the difference between the two environments is not noticeable. When promotion to the primary environment is executed, the settings of the staging environment are overwritten to the primary environment.

Also, it is assumed that the S3 origin and primary distribution for placing static resources have already been constructed and are in operation. Additionally, for this verification, caching will be disabled to observe the behavior of continuous deployment.

## Pipeline
![CodePipeline Architecture](https://i.gyazo.com/189ac06ff81caee9c3ecda43c523a59e.png)

The pipeline is triggered by changes in the Git repository (here, CodeCommit, already built) and configures the environment related to continuous deployment (CloudFormation). Subsequently, the Lambda function ([Continuous Deployment Activation Function](#continuous-deployment-activation-function)) is executed. Details will be discussed later, but this is where the necessary post-processing to enable the created continuous deployment environment is performed.

With this, continuous deployment is enabled, and testing is conducted in the staging environment. CloudFront supports the following two types of routing for the staging environment:

- Header-based: Only requests with a specific HTTP header are routed.
- Weight-based: A certain percentage of commercial traffic is routed.

These are specified as continuous deployment policies (CloudFormation template details will be discussed later).

After testing, an approval process is included. This uses the manual approval action provided by CodePipeline.

- [AWS Doc - Adding a Manual Approval Action to a Pipeline in CodePipeline](https://docs.aws.amazon.com/ja_jp/codepipeline/latest/userguide/approvals-action-add.html)

The final process after approval (`Promotion` stage) is the promotion to the primary environment. This uses the Lambda function ([Primary Environment Promotion Function](#primary-environment-promotion-function)). In this, the [UpdateDistributionWithStagingConfig](https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_UpdateDistributionWithStagingConfig.html) API is used to overwrite the primary environment with the staging environment's settings. Also, at this point, continuous deployment itself is disabled, and routing to the staging environment is stopped.

Note that this does not consider the case where the previous stage's approval process is rejected. In actual operation, additional post-processing, such as disabling continuous deployment, may be necessary.

# Preparing Lambda Functions

Prepare the Lambda functions called from the pipeline and deploy them.

## Continuous Deployment Activation Function

This function performs post-processing after applying the CloudFront distribution/staging continuous deployment CloudFormation. Once this function is executed, the continuous deployment environment is completed.

```typescript
// Imports are omitted

const cfClient = new CloudFrontClient();
const pipelineClient = new CodePipelineClient();
const s3Client = new S3Client();

// Parameters received from CodePipeline
type UserParams = {
  PrimaryDistributionId: string;
  StagingDistributionId: string;
  ContinuousDeploymentPolicyId: string;
  StaticResourceBucketName: string;
};

// Lambda event handler
export const handler: CodePipelineHandler = async (event) => {
  const params: UserParams = JSON.parse(
    event["CodePipeline.job"].data.actionConfiguration.configuration
      .UserParameters
  );

  try {
    // Allow access from staging distribution to the bucket (update bucket policy if necessary)
    const bucketPolicy = await s3Client.send(
      new GetBucketPolicyCommand({ Bucket: params.StaticResourceBucketName })
    );
    if (!bucketPolicy.Policy?.includes(params.StagingDistributionId)) {
      console.info("updating BucketPolicy...");
      await s3Client.send(
        new PutBucketPolicyCommand({
          Bucket: params.StaticResourceBucketName,
          Policy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Principal: {
                  Service: "cloudfront.amazonaws.com",
                },
                Action: "s3:GetObject",
                Resource: `arn:aws:s3:::${params.StaticResourceBucketName}/*`,
                Condition: {
                  "ForAnyValue:StringEquals": {
                    "AWS:SourceArn": [
                      `arn:aws:cloudfront::${process.env.AWS_ACCOUNT_ID}:distribution/${params.PrimaryDistributionId}`,
                      `arn:aws:cloudfront::${process.env.AWS_ACCOUNT_ID}:distribution/${params.StagingDistributionId}`,
                    ],
                  },
                },
              },
            ],
          }),
        })
      );
    }

    // Associate the continuous deployment policy with the primary distribution (if necessary)
    const prod = await cfClient.send(
      new GetDistributionCommand({ Id: params.PrimaryDistributionId })
    );
    console.info({ distribution: prod.Distribution });
    if (
      prod.Distribution?.DistributionConfig?.ContinuousDeploymentPolicyId !==
      params.ContinuousDeploymentPolicyId
    ) {
      console.info("updating primary distribution...");
      await cfClient.send(
        new UpdateDistributionCommand({
          Id: params.PrimaryDistributionId,
          DistributionConfig: {
            ...prod.Distribution?.DistributionConfig,
            ContinuousDeploymentPolicyId: params.ContinuousDeploymentPolicyId,
          } as DistributionConfig,
          IfMatch: prod.ETag,
        })
      );
    }

    // Enable continuous deployment
    // Once promoted to primary, the template remains enabled but the actual resource is disabled (drift state), so reactivation is needed each time (if there's no change in the template, CloudFormation application is skipped)
    const policy = await cfClient.send(
      new GetContinuousDeploymentPolicyCommand({
        Id: params.ContinuousDeploymentPolicyId,
      })
    );
    if (
      !policy.ContinuousDeploymentPolicy?.ContinuousDeploymentPolicyConfig
        ?.Enabled
    ) {
      console.info("enabling continuous deployment...");
      await cfClient.send(
        new UpdateContinuousDeploymentPolicyCommand({
          Id: params.ContinuousDeploymentPolicyId,
          ContinuousDeploymentPolicyConfig: {
            ...policy.ContinuousDeploymentPolicy
              ?.ContinuousDeploymentPolicyConfig,
            Enabled: true, // Activate
          } as ContinuousDeploymentPolicyConfig,
          IfMatch: policy.ETag,
        })
      );
    }

    await pipelineClient.send(
      new PutJobSuccessResultCommand({
        jobId: event["CodePipeline.job"].id,
      })
    );
  } catch (e) {
    console.error({ e });
    await pipelineClient.send(
      new PutJobFailureResultCommand({
        jobId: event["CodePipeline.job"].id,
        failureDetails: {
          type: "JobFailed",
          message: (e as Error).message,
        },
      })
    );
  }
};
```

Although it's somewhat lengthy, the content is as follows:

1. (If necessary) Allow access from the staging distribution to the S3 origin (update bucket policy).
2. (If necessary) Attach the continuous deployment policy to the pre-built primary distribution.
3. (If necessary) Activate the continuous deployment policy.

Basically, 1 and 2 are only during initial construction, and 3 is executed in subsequent continuous deployments.

:::column:Why is it necessary to activate the continuous deployment policy?
The continuous deployment policy is also included in the previous action's CloudFormation template, and you might think it's not necessary to activate it here. However, when using the API to promote to the primary environment, continuous deployment itself is directly updated to be disabled. At this point, the state drifts in CloudFormation (enabled in the stack, disabled in the actual resource). Therefore, if there is no change in the routing policy for the next continuous deployment, it is deemed unnecessary to update and is skipped (i.e., it does not become active). To ensure continuous deployment, it was necessary to update and activate the continuous deployment policy here.
:::

## Primary Environment Promotion Function

This function is executed when the test in the staging environment is approved and promoted to the primary environment.

```typescript
// Imports are omitted

const cfClient = new CloudFrontClient();
const pipelineClient = new CodePipelineClient();

type UserParams = {
  PrimaryDistributionId: string;
  StagingDistributionId: string;
};
export const handler: CodePipelineHandler = async (event) => {
  const params: UserParams = JSON.parse(
    event["CodePipeline.job"].data.actionConfiguration.configuration
      .UserParameters
  );

  try {
    const prod = await cfClient.send(
      new GetDistributionCommand({ Id: params.PrimaryDistributionId })
    );
    const staging = await cfClient.send(
      new GetDistributionCommand({
        Id: params.StagingDistributionId,
      })
    );

    // Copy config from Staging to Production
    await cfClient.send(
      new UpdateDistributionWithStagingConfigCommand({
        Id: params.PrimaryDistributionId,
        StagingDistributionId: params.StagingDistributionId,
        IfMatch: `${prod.ETag}, ${staging.ETag}`,
      })
    );

    await pipelineClient.send(
      new PutJobSuccessResultCommand({
        jobId: event["CodePipeline.job"].id,
      })
    );
  } catch (e) {
    console.error({ e });
    await pipelineClient.send(
      new PutJobFailureResultCommand({
        jobId: event["CodePipeline.job"].id,
        failureDetails: {
          type: "JobFailed",
          message: (e as Error).message,
        },
      })
    );
  }
};
```

The key point is the part where the `UpdateDistributionWithStagingConfigCommand` command is sent. Here, the promotion API for continuous deployment is executed.

# Building the Pipeline

The CodePipeline pipeline was constructed using a CloudFormation template (pipeline.yml). Since it's lengthy, only the CodePipeline part is excerpted here.

The entire file can be viewed [here](https://gist.github.com/kudoh/e5da51f09c1e7f8d068fddc33591e913).

## Continuous Deployment Environment Construction Stage

First, the part that enables continuous deployment.

```yaml
  CodePipeline:
    Type: AWS::CodePipeline::Pipeline
    Properties:
      ArtifactStore:
        Location: !Ref ArtifactStoreBucket
        Type: S3
      Name: !Ref PipelineName
      RoleArn: !GetAtt [ "CodePipelineRole", Arn]
      Stages:
        # Trigger: Git repository (continuous deployment configuration)
        - Name: Source
          Actions:
            - Name: Source
              ActionTypeId:
                Category: Source
                Owner: AWS
                Provider: CodeCommit
                Version: "1"
              Configuration:
                BranchName: "main"
                RepositoryName: !Ref RepositoryName
              OutputArtifacts:
                - Name: SourceArtifactOutput
              RunOrder: "1"
        - Name: Deploy
          Actions:
            # Provisioning staging distribution, continuous deployment policy
            - Name: Deploy_to_Staging
              ActionTypeId:
                Category: Deploy
                Owner: AWS
                Provider: CloudFormation
                Version: "1"
              InputArtifacts:
                - Name: SourceArtifactOutput
              Configuration:
                ActionMode: CREATE_UPDATE
                Capabilities: CAPABILITY_IAM,CAPABILITY_NAMED_IAM,CAPABILITY_AUTO_EXPAND
                RoleArn: !GetAtt CloudFormationRole.Arn
                StackName: !Ref CloudFormationStackName
                TemplatePath: !Sub SourceArtifactOutput::${CloudFormationFileName}
                ParameterOverrides: !Sub
                  - |
                    {
                      "PrimaryDistributionId": "${PrimaryDistributionId}", 
                      "StaticResourceBucketName": "${StaticResourceBucketName}", 
                      "OriginAccessControlId": "${OriginAccessControlId}"
                    }
                  -
                    PrimaryDistributionId: !Ref PrimaryDistributionId
                    StaticResourceBucketName: !Ref StaticResourceBucketName
                    OriginAccessControlId: !Ref OriginAccessControlId
              OutputArtifacts:
                - Name: CloudFormationOutputs
              Namespace: CFOutput
              RunOrder: "1"
            # Execute continuous deployment activation function
            - Name: Enable_CloudFront_CD
              ActionTypeId:
                Category: Invoke
                Owner: AWS
                Provider: Lambda
                Version: "1"
              InputArtifacts:
                - Name: CloudFormationOutputs
              Configuration:
                FunctionName: !Ref EnableCloudFrontCDLambdaName
                UserParameters: !Sub
                  - |
                    {
                      "PrimaryDistributionId": "${PrimaryDistributionId}",
                      "StagingDistributionId": "#{CFOutput.StagingDistributionId}",
                      "StaticResourceBucketName": "${StaticResourceBucketName}",
                      "ContinuousDeploymentPolicyId": "#{CFOutput.ContinuousDeploymentPolicyId}"
                    }
                  -
                    PrimaryDistributionId: !Ref PrimaryDistributionId
                    StaticResourceBucketName: !Ref StaticResourceBucketName
              RunOrder: "2"
              # Continued in the second half...
```

Two actions are defined in the `Deploy` stage following the `Source` stage.
One is the application of the continuous deployment CloudFormation template placed in the Git repository (`Deploy_to_Staging` action).
The content of this CloudFormation template will be discussed later, but it is assumed that this is where the main settings for continuous deployment, such as the staging environment's distribution and routing policy, are made.

The other is the execution of the Lambda function ([Continuous Deployment Activation Function](#continuous-deployment-activation-function)) (`Enable_CloudFront_CD` action).
The information necessary for the execution of the Lambda function is set as `UserParameters` from the parameters of the CloudFormation and the output of the previous action's CloudFormation (`CFOutput`).

## Approval & Primary Environment Promotion Stage
Next is the second half of the pipeline.

```yaml
  CodePipeline:
    Type: AWS::CodePipeline::Pipeline
    Properties:
      # Omitted
      Stages:
        # First half stages (previously mentioned) - Omitted
        - Name: ManualApproval
          Actions:
            - Name: ManualApproval
              ActionTypeId:
                Category: Approval
                Owner: AWS
                Provider: Manual
                Version: "1"
              RunOrder: "3"
        - Name: Promotion
          Actions:
            - Name: Promote_to_Production
              ActionTypeId:
                Category: Invoke
                Owner: AWS
                Provider: Lambda
                Version: "1"
              InputArtifacts:
                - Name: CloudFormationOutputs
              Configuration:
                FunctionName: !Ref PromoteLambdaName
                UserParameters: !Sub '{"PrimaryDistributionId": "${PrimaryDistributionId}", "StagingDistributionId": "#{CFOutput.StagingDistributionId}"}'
              RunOrder: "4"
```

The `ManualApproval` stage places an approval action for the staging environment. It is assumed that approval will be done through the CodePipeline UI here.

The following `Promotion` stage is the promotion of the staging environment to the primary environment. This simply executes the previously mentioned [Primary Environment Promotion Function](#primary-environment-promotion-function).

# Trying Continuous Deployment

The environment is ready, so let's try it out immediately. In the S3 bucket serving as the origin, create folders `1.0.0`, `2.0.0`, and `3.0.0` and place any HTML (index.html) in them.
![S3](https://i.gyazo.com/6f3987a86eef960b119224674493876f.png)

Currently, the primary environment returns the HTML for v1 as follows.

```shell
PRIMARY_DISTRIBUTION_ID=xxxxxxxxxx
DOMAIN_NAME=$(aws cloudfront get-distribution --id ${PRIMARY_DISTRIBUTION_ID} --query "Distribution.DomainName" --output text)

curl https://${DOMAIN_NAME}/index.html

> <!DOCTYPE html><html lang="ja"><body><h1>v1 App</h1></body></html>
```

We will sequentially update this to v2 and v3 using the pipeline.

## HTTP Header-Based Routing (v1 -> v2)
Let's first try routing to the staging environment only in cases with a specific HTTP header.
Place the following continuous deployment CloudFormation template (staging-cloudfront-distribution.yml) in the Git repository.

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Staging CloudFront Distribution'

Parameters:
  PrimaryDistributionId:
    Type: String
  StaticResourceBucketName:
    Type: String
  OriginAccessControlId:
    Type: String

Resources:
  # Continuous deployment policy
  ContinuousDeploymentPolicy:
    Type: AWS::CloudFront::ContinuousDeploymentPolicy
    Properties:
      ContinuousDeploymentPolicyConfig:
        Enabled: true
        StagingDistributionDnsNames:
          - !GetAtt SampleWebSiteDistributionStaging.DomainName
        # Routing settings to the staging environment
        TrafficConfig:
          SingleHeaderConfig:
            Header: aws-cf-cd-env
            Value: staging
          Type: SingleHeader

  # Staging distribution
  SampleWebSiteDistributionStaging:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Enabled: true
        Staging: true
        HttpVersion: http2
        DefaultCacheBehavior:
          TargetOriginId: website-resources
          # AWS Managed Cache Policy (CachingDisabled)
          CachePolicyId: 4135ea2d-6df8-44a3-9df3-4b5a84be39ad
          ViewerProtocolPolicy: redirect-to-https
        Origins:
          - Id: website-resources
            DomainName: !Sub "${StaticResourceBucketName}.s3.${AWS::Region}.amazonaws.com"
            OriginAccessControlId: !Ref OriginAccessControlId
            S3OriginConfig,: {}
            # Staging environment has app version 2.0.0 (primary environment has 1.0.0)
            OriginPath: /2.0.0
# Used in subsequent actions
Outputs:
  StagingDistributionId:
    Value: !GetAtt SampleWebSiteDistributionStaging.Id
  ContinuousDeploymentPolicyId:
    Value: !GetAtt ContinuousDeploymentPolicy.Id
```

In the `ContinuousDeploymentPolicy` resource, the routing settings (`TrafficConfig`) for continuous deployment are configured. This time it's header-based, so set `Type: SingleHeader` and specify the header name and value for routing to the staging environment in `SingleHeaderConfig`. Here, the header `aws-cf-cd-env` is set to route requests with the value `staging`. Note that the header name for CloudFront's continuous deployment must start with `aws-cf-cd-`.

Next, build the pipeline. Create the CloudFormation stack for the pipeline mentioned earlier. You can do this via CLI or the management console.

```shell
aws cloudformation create-stack --stack-name cloudfront-cd-pipeline --template-body file://pipeline.yml \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
  --parameters ParameterKey=RepositoryName,ParameterValue=xxxxxx \
               ParameterKey=PrimaryDistributionId,ParameterValue=XXXXXXXXXXXXXX \
               ParameterKey=PromoteLambdaName,ParameterValue=cloudfront-cd-tools-dev-promote \
               ParameterKey=EnableCloudFrontCDLambdaName,ParameterValue=cloudfront-cd-tools-dev-enableCloudFrontCD \
               ParameterKey=StaticResourceBucketName,ParameterValue=cloudfront-cd-primary-distrib-staticresourcebucket-xxxxxxxxxx \
               ParameterKey=OriginAccessControlId,ParameterValue=XXXXXXXXXXXXXX
```

The parameters above must be set to the pre-built values:

| Parameter Name                | Description                                           |
|-------------------------------|-------------------------------------------------------|
| RepositoryName                | Git repository name                                   |
| PrimaryDistributionId         | ID of the primary distribution                        |
| EnableCloudFrontCDLambdaName  | [Continuous Deployment Activation Function](#continuous-deployment-activation-function) |
| PromoteLambdaName             | [Primary Environment Promotion Function](#primary-environment-promotion-function) |
| StaticResourceBucketName      | Name of the bucket storing static resources           |
| OriginAccessControlId         | ID of the origin access control of the primary distribution |

Once the CloudFormation execution completes, the following code pipeline is created.

![Pipeline picture](https://i.gyazo.com/e80ab5dd30d01b64fbbe60a11f2c2cae.png)

Initially, the pipeline runs automatically and constructs the staging environment based on the continuous deployment policy created earlier. If successful, the pipeline execution pauses at the approval stage (`ManualApprove`).

![Pending stage](https://i.gyazo.com/615aa2caffc4b5432f28baabda96542b.png)

Check the state of the CloudFront distribution in the management console.
- Primary environment
![primary distribution cd](https://i.gyazo.com/4c11aba856b4fd05c48fbb0900b6b037.png)
- Staging environment
![staging distribution cd](https://i.gyazo.com/e5e78fe55447fed7080649e77a27ae98.png)

Both environments are linked with the continuous deployment policy. In this state, accessing with the specified HTTP header (`aws-cf-cd-env:staging`) will route the traffic to the staging environment instead of the primary environment.

```shell
PRIMARY_DISTRIBUTION_ID=xxxxxxxxxx
DOMAIN_NAME=$(aws cloudfront get-distribution --id ${PRIMARY_DISTRIBUTION_ID} --query "Distribution.DomainName" --output text)

# Primary environment (v1)
curl https://${DOMAIN_NAME}/index.html
> <!DOCTYPE html><html lang="ja"><body><h1>v1 App</h1></body></html>

# Staging environment (v2)
curl -H "aws-cf-cd-env:staging" https://${DOMAIN_NAME}/index.html
> <!DOCTYPE html><html lang="ja"><body><h1>v2 App</h1></body></html>
```

With the header, the HTML configured for the staging environment is returned. Requests without the header do not route to the staging environment and do not affect the primary environment, which is in commercial operation.

Next, assuming testing in the staging environment (v2) is complete, approve it. This is done through the CodePipeline UI.

Click "Review" on the action that is pending, and the following dialog appears. Select "Approve," optionally enter a comment, and click "Submit."

![Approve release](https://i.gyazo.com/c7ceea3314c7250125c3bb5ef1e3ed80.png)

The pipeline resumes, and the [Primary Environment Promotion Function](#primary-environment-promotion-function) is executed in the `Promotion` stage.

![Promote](https://i.gyazo.com/7d3ad00e982fba70bf6996e99010268f.png)

After the `Promotion` stage completes, running curl again now returns the v2 HTML in the primary environment.

```shell
curl https://${DOMAIN_NAME}/index.html
> <!DOCTYPE html><html lang="ja"><body><h1>v2 App</h1></body></html>
```

Check the settings of the primary environment distribution in the management console.
![Primary Distribution v2](https://i.gyazo.com/241d6a3eb404397815457ab108c32129.png)

The origin path has changed from `1.0.0` to `2.0.0`. It shows that the primary environment has been overwritten with the staging environment's settings.

## Weight-Based Routing (v2 -> v3)

Having seen the entire process, let's also look at the other routing policy, weight-based.

Place the following continuous deployment CloudFormation template in the Git repository for deployment.

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Staging CloudFront Distribution'

Parameters:
  PrimaryDistributionId:
    Type: String
  StaticResourceBucketName:
    Type: String
  OriginAccessControlId:
    Type: String

Resources:
  # Continuous deployment policy
  ContinuousDeploymentPolicy:
    Type: AWS::CloudFront::ContinuousDeploymentPolicy
    Properties:
      ContinuousDeploymentPolicyConfig:
        Enabled: true
        StagingDistributionDnsNames:
          - !GetAtt SampleWebSiteDistributionStaging.DomainName
        # Routing settings to the staging environment -> Changed to weight-based
        TrafficConfig:
          SingleWeightConfig:
            Weight: 0.15 # Route 15% of traffic to the staging environment (0 - 15%)
            SessionStickinessConfig: # Enable sticky sessions
              IdleTTL: 300 # Invalidate if no access for 5 minutes
              MaximumTTL: 600 # Valid for up to 10 minutes
          Type: SingleWeight

  # Staging distribution
  SampleWebSiteDistributionStaging:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Enabled: true
        Staging: true
        HttpVersion: http2
        DefaultCacheBehavior:
          TargetOriginId: website-resources
          # AWS Managed Cache Policy (CachingDisabled)
          CachePolicyId: 4135ea2d-6df8-44a3-9df3-4b5a84be39ad
          ViewerProtocolPolicy: redirect-to-https
        Origins:
          - Id: website-resources
            DomainName: !Sub "${StaticResourceBucketName}.s3.${AWS::Region}.amazonaws.com"
            OriginAccessControlId: !Ref OriginAccessControlId
            S3OriginConfig: {}
            # 2.0.0 -> 3.0.0
            OriginPath: /3.0.0
# Used in subsequent actions
Outputs:
  StagingDistributionId:
    Value: !GetAtt SampleWebSiteDistributionStaging.Id
  ContinuousDeploymentPolicyId:
    Value: !GetAtt ContinuousDeploymentPolicy.Id
```

The key point is the `ContinuousDeploymentPolicy` resource's `TrafficConfig`. This time, specify the weight-based routing setting `Type: SingleWeight` and configure the details in `SingleWeightConfig`. `Weight` specifies the percentage of traffic routed to the staging environment. For some reason, currently, you can only route up to 15% of the traffic to the staging environment.

Continuous deployment also supports sticky sessions (`SessionStickinessConfig`), ensuring that clients are routed to the same environment for a certain period. For browser-based applications, it's usually enabled to prevent environments from mixing (the values specified above are short for verification purposes).

Commit this to the Git repository. This triggers the pipeline to resume, and continuous deployment is enabled, pausing again at `ManualApproval`.

Using curl to check, you can see that the specified percentage (here, 15%) of traffic is being routed to the staging environment (v3).

```shell
for i in {1..10}; do curl https://${DOMAIN_NAME}/index.html; sleep 1; done

> <!DOCTYPE html><html lang="ja"><body><h1>v2 App</h1></body></html>
> <!DOCTYPE html><html lang="ja"><body><h1>v3 App</h1></body></html>
> <!DOCTYPE html><html lang="ja"><body><h1>v2 App</h1></body></html>
> <!DOCTYPE html><html lang="ja"><body><h1>v2 App</h1></body></html>
> <!DOCTYPE html><html lang="ja"><body><h1>v2 App</h1></body></html>
> <!DOCTYPE html><html lang="ja"><body><h1>v2 App</h1></body></html>
> <!DOCTYPE html><html lang="ja"><body><h1>v2 App</h1></body></html>
> <!DOCTYPE html><html lang="ja"><body><h1>v2 App</h1></body></html>
> <!DOCTYPE html><html lang="ja"><body><h1>v2 App</h1></body></html>
> <!DOCTYPE html><html lang="ja"><body><h1>v3 App</h1></body></html>
```

Note that in the environment I tested, it took about 10 minutes for traffic to actually start being routed to the staging environment.

The above is using the curl command, so sticky sessions are not effective, but checking with a browser shows that the same environment (v2 or v3) is displayed for the maximum TTL for the same client. The Chrome DevTool shows that the `x-amz-continuous-deployment-state` session cookie is used for this.

![chrome dev tools](https://i.gyazo.com/e3f5ddc250cf470a683f8e725ef356b9.png)

Deleting this cookie resets the session, and routing is again performed at the specified percentage.

# Conclusion

This article turned out to be quite lengthy, but we were able to execute continuous deployment of CloudFront from CodePipeline. What I felt from this exercise is that this continuous deployment feature may not mesh well with IaC tools. The API for promoting to the primary environment directly changes the settings of the primary distribution and disables the continuous deployment policy, causing drift from the CloudFormation template, which led to some unintended behaviors and issues.

If adhering to the principles of GitOps, it might be better to limit continuous deployment to traffic routing only, and perform promotions through updates to the primary environment's CloudFormation template instead.

---
Reference articles & repositories:

- [AWS Blog - Achieving Zero Downtime Deployments with Amazon CloudFront Using Blue/Green Continuous Deployments](https://aws.amazon.com/jp/blogs/news/networking-and-content-delivery-achieving-zero-downtime-deployments-with-amazon-cloudfront-using-blue-green-continuous-deployments/)
- [GitHub - AWS Samples - amazon-cloudfront-continuous-deployment](https://github.com/aws-samples/amazon-cloudfront-continuous-deployment)
- [GitHub - AWS Samples - amazon-cloudfront-continuousdeployment-cicd](https://github.com/aws-samples/amazon-cloudfront-continuousdeployment-cicd)
