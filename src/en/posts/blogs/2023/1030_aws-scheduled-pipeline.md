---
title: Building a Periodically Triggered Pipeline on AWS Using CDK
author: fumihiko-kawano
date: 2023-10-30T00:00:00.000Z
tags:
  - AWS
  - CI/CD
  - aws-cdk
translate: true

---




## Introduction
Pipelines that operate triggered by pushes to a repository are widely used. However, many pipelines execute actions triggered by pushes that are too frequent. Periodically executed pipelines will become increasingly important for building and operating better CI/CD environments. In this article, I will explain how to build a periodically executed pipeline using [Amazon EventBridge Scheduler](https://docs.aws.amazon.com/eventbridge/latest/userguide/scheduler.html) and [CodePipeline](https://aws.amazon.com/codepipeline/) with [AWS CDK](https://docs.aws.amazon.com/cdk/v2/guide/home.html).

## Environment Setup
This time, we are using CDK with TypeScript, so it is assumed that Node.js is installed.

### Installing CDK
Install CDK.
```shell
npm install -g aws-cdk
```
Check the CDK version.
```shell
cdk --version
```
The version used at the time of writing is 2.103.1. If there are compatibility issues, please install version 2.103.1.

### Creating a CodeCommit Repository
Create a repository to link with the pipeline to be created.
```shell
aws codecommit create-repository --repository-name ScheduledPipelineSourceRepo
```
Please register some files in the default branch (main). If not registered, the source action of the pipeline will fail.

### Creating a CDK Project
Create a directory to store the project and run the `cdk init` command.
```shell
mkdir scheduled-pipeline && cd scheduled-pipeline
cdk init sample-app --language typescript
```

## Implementing the Stack
Since this is a sample implementation of a periodically triggered pipeline, internal processing is unnecessary. However, aiming to be usable as a sample for building pipelines with CDK, we have implemented artifact output and reference processing.

### Implementing Processing in ./lib/scheduled-pipeline-stack.ts
Rewrite `scheduled-pipeline-stack.ts` as follows. The details of each process will be explained later.
```typescript
import {Fn, Stack, StackProps} from 'aws-cdk-lib';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import {Construct} from 'constructs';
import {aws_scheduler as scheduler , CfnOutput } from 'aws-cdk-lib';
import {aws_iam} from 'aws-cdk-lib';
import {Pipeline} from 'aws-cdk-lib/aws-codepipeline';

export class ScheduledCodePipelineStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const pipeline = this.createPipeline();
        const pipeLineExecutionRole = this.createPipeLineExecutionRole(pipeline.pipelineArn);
        this.createSchedule(pipeline.pipelineArn, pipeLineExecutionRole.roleArn);
    }

    private createPipeline(): Pipeline {
        // Create the pipeline
        const pipeline = new codepipeline.Pipeline(this, 'scheduledPipeLine', {
            crossAccountKeys: false
        });

        // Declare the repository to link with the pipeline, ScheduledPipelineSourceRepo is an already created repository
        const sourceRepo = codecommit.Repository.fromRepositoryName(this, 'ScheduledPipelineSourceRepo', 'ScheduledPipelineSourceRepo') as codecommit.Repository;
        // Define the artifact to store the contents of the repository obtained by the source action of the pipeline
        const sourceOutput = new codepipeline.Artifact();

        // Define the source action in the pipeline
        // Store the entire source obtained from sourceRepo in sourceOutput
        pipeline.addStage({
            stageName: 'Source',
            actions: [
                new codepipeline_actions.CodeCommitSourceAction({
                    actionName: 'CodeCommitSourceSampleAction',
                    repository: sourceRepo,
                    output: sourceOutput,
                    branch: 'main',
                    trigger: codepipeline_actions.CodeCommitTrigger.NONE,
                }),
            ],
        });

        // Define the CodeBuild project to be executed in the Build stage of the pipeline
        const buildProject = new codebuild.PipelineProject(this, `BuildSampleProject`, {
            buildSpec: codebuild.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    build: {
                        commands: [
                            'echo BuildSampleProject started on `date "+%Y/%m/%d %H:%M:%S"`',
                            'mkdir $CODEBUILD_SRC_DIR/output',
                            'touch $CODEBUILD_SRC_DIR/output/result_file_`date "+%Y_%m_%d_%H_%M_%S"`.txt',
                            `ls -l -R $CODEBUILD_SRC_DIR`
                        ],
                    },
                },
                artifacts: {
                    'base-directory': '$CODEBUILD_SRC_DIR/output',
                    'files': '**/*'
                },
            })
        });

        // Define the CodeBuild project to be executed in the Deploy stage of the pipeline
        const deployProject = new codebuild.PipelineProject(this, `DeploySampleProject`, {
            buildSpec: codebuild.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    build: {
                        commands: [
                            'echo DeploySampleProject started on `date "+%Y/%m/%d %H:%M:%S"`',
                            ,'ls -l'
                        ],
                    },
                },
            })
        });

        // Define the storage location for the Build stage artifacts of the pipeline
        const buildOutput = new codepipeline.Artifact();

        // Link buildProject to the pipeline
        pipeline.addStage({
            stageName: 'Build',
            actions: [
                new codepipeline_actions.CodeBuildAction({
                    actionName: 'BuildSampleAction',
                    project: buildProject,
                    input: sourceOutput,
                    outputs: [buildOutput]
                }),
            ],
        });

        // Link deployProject to the pipeline
        pipeline.addStage({
            stageName: 'Deploy',
            actions: [
                new codepipeline_actions.CodeBuildAction({
                    actionName: 'DeploySampleAction',
                    project: deployProject,
                    input: buildOutput
                }),
            ],
        });

        return pipeline;
    }

    private createPipeLineExecutionRole(pipelineArn: string): aws_iam.Role {
        return new aws_iam.Role(this, 'pipeLineExecutionRole', {
            assumedBy: new aws_iam.ServicePrincipal('scheduler.amazonaws.com'),
            managedPolicies: [
                new aws_iam.ManagedPolicy(this, 'pipeLineExecutionRolePolicy', {
                    statements: [
                        new aws_iam.PolicyStatement({
                            effect: aws_iam.Effect.ALLOW,
                            actions: ['codepipeline:StartPipelineExecution'],
                            resources: [pipelineArn],
                        })
                    ],
                }),
            ],
        });
    }


    private createSchedule(pipelineArn: string, pipeLineExecutionRoleArn: string) {
        new scheduler.CfnSchedule(this, 'ExecPipelineSchedule', {
            flexibleTimeWindow: {
                // Set flexible time window to "OFF"
                mode: 'OFF',
            },
            // Schedule to trigger at 9:30 AM every day
            scheduleExpression: 'cron(30 09 * * ? *)',
            target: {
                // The target to trigger is the created pipeline
                arn: pipelineArn,
                roleArn: pipeLineExecutionRoleArn,
            },
            name: 'pipelineExecutionSchedule',
            // Specify 'Asia/Tokyo' as the time zone, as the default is UTC
            scheduleExpressionTimezone: 'Asia/Tokyo',
        });
    }

}
```

### Explanation of the Pipeline Creation

#### Overview of the Created Pipeline
The pipeline will have Source, Build, and Deploy stages.
![Pipeline Image](/img/blogs/2023/1030_aws-scheduled-pipeline-1.png)

#### Pipeline Creation Process
Define a pipeline named scheduledPipeLine.
```typescript
        const pipeline = new codepipeline.Pipeline(this, 'scheduledPipeLine', {
            crossAccountKeys: false
        });
```

``crossAccountKeys: false`` is a setting to change the server-side encryption key for the S3 bucket storing the pipeline artifacts to "AWS Managed Key". If crossAccountKeys is not explicitly specified, a "Customer Managed Key" will be automatically created, and the stack cannot be deleted for one month. For details, refer to [Deletion Waiting Period for Customer Managed Keys](https://docs.aws.amazon.com/kms/latest/developerguide/deleting-keys.html#deleting-keys-how-it-works).

For details on "Customer Managed Key" and "AWS Managed Key", refer to [Customer Keys and AWS Keys](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#key-mgmt).

#### Setting the Source Stage of the Pipeline
Since it is a pipeline, it needs to set the source (repository) as input. Set the already created CodeCommit repository ScheduledPipelineSourceRepo as the source.

```typescript
        // Declare the repository to link with the pipeline, ScheduledPipelineSourceRepo is an already created repository
        const sourceRepo = codecommit.Repository.fromRepositoryName(this, 'ScheduledPipelineSourceRepo', 'ScheduledPipelineSourceRepo') as codecommit.Repository;
        // Define the artifact to store the contents of the repository obtained by the source action of the pipeline
        const sourceOutput = new codepipeline.Artifact();

        // Define the source action in the pipeline
        // Store the entire source obtained from sourceRepo in sourceOutput
        pipeline.addStage({
            stageName: 'Source',
            actions: [
                new codepipeline_actions.CodeCommitSourceAction({
                    actionName: 'CodeCommitSourceSampleAction',
                    repository: sourceRepo,
                    output: sourceOutput,
                    branch: 'main',
                    trigger: codepipeline_actions.CodeCommitTrigger.NONE,
                }),
            ],
        });
```

Generally, pipelines are triggered by pushes to the repository, so when creating a pipeline with CDK, the trigger is enabled by default. This time, since we want to trigger only from [Amazon EventBridge Scheduler](https://docs.aws.amazon.com/eventbridge/latest/userguide/scheduler.html), we set ``trigger: codepipeline_actions.CodeCommitTrigger.NONE`` in the actions of the Source stage.

#### Setting the Build Stage of the Pipeline
The build process outputs the execution time to the standard output with echo and outputs a virtual build artifact to `$CODEBUILD_SRC_DIR/output`.
```typescript
        // Define the CodeBuild project to be executed in the Build stage of the pipeline
        const buildProject = new codebuild.PipelineProject(this, `BuildSampleProject`, {
            buildSpec: codebuild.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    build: {
                        commands: [
                            'echo BuildSampleProject started on `date "+%Y/%m/%d %H:%M:%S"`',
                            'mkdir $CODEBUILD_SRC_DIR/output',
                            'touch $CODEBUILD_SRC_DIR/output/result_file_`date "+%Y_%m_%d_%H_%M_%S"`.txt',
                            `ls -l -R $CODEBUILD_SRC_DIR`
                        ],
                    },
                },
                artifacts: {
                    'base-directory': '$CODEBUILD_SRC_DIR/output',
                    'files': '**/*'
                },
            })
        });
        
```
The following code links buildProject to the Build stage of the pipeline.
```typescript
        // Link buildProject to the pipeline
        pipeline.addStage({
            stageName: 'Build',
            actions: [
                new codepipeline_actions.CodeBuildAction({
                    actionName: 'BuildSampleAction',
                    project: buildProject,
                    input: sourceOutput,
                    outputs: [buildOutput]
                }),
            ],
        });
```

#### Setting the Deploy Stage of the Pipeline
The Deploy process outputs the execution time to the standard output with echo and outputs the file list of the directory specified in the input of CodeBuildAction.

```typescript
        // Define the CodeBuild project to be executed in the Deploy stage of the pipeline
        const deployProject = new codebuild.PipelineProject(this, `DeploySampleProject`, {
            buildSpec: codebuild.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    build: {
                        commands: [
                            'echo DeploySampleProject started on `date "+%Y/%m/%d %H:%M:%S"`',
                            ,'ls -l'
                        ],
                    },
                },
            })
        });
```
The following code links deployProject to the Deploy stage of the pipeline.
```typescript
        // Link deployProject to the pipeline
        pipeline.addStage({
            stageName: 'Deploy',
            actions: [
                new codepipeline_actions.CodeBuildAction({
                    actionName: 'DeploySampleAction',
                    project: deployProject,
                    input: buildOutput
                }),
            ],
        });
```

``input: buildOutput`` specifies buildOutput, which is the same object specified in the outputs of the CodeBuildAction of buildProject.

The execution log of buildProject is as follows. This log is from when the default branch of ScheduledPipelineSourceRepo has a file named "File registered in the repository.txt" in the root.

```
[Container] 2023/10/27 08:18:21.554852 Running command echo BuildSampleProject started on `date "+%Y/%m/%d %H:%M:%S"`
BuildSampleProject started on 2023/10/27 08:18:21

[Container] 2023/10/27 08:18:21.562679 Running command mkdir $CODEBUILD_SRC_DIR/output

[Container] 2023/10/27 08:18:21.568056 Running command touch $CODEBUILD_SRC_DIR/output/result_file_`date "+%Y_%m_%d_%H_%M_%S"`.txt

[Container] 2023/10/27 08:18:21.575371 Running command ls -l -R $CODEBUILD_SRC_DIR
/codebuild/output/src3287704453/src:
total 0
drwxr-xr-x 2 root root 49 Oct 27 08:18 output
-rw-r--r-- 1 root root  0 Oct 27 08:18 File registered in the repository.txt

/codebuild/output/src3287704453/src/output:
total 0
-rw-r--r-- 1 root root 0 Oct 27 08:18 result_file_2023_10_27_08_18_21.txt
```

The execution log of deployProject is as follows.
```shell
[Container] 2023/10/27 08:19:31.520871 Running command echo DeploySampleProject started on `date "+%Y/%m/%d %H:%M:%S"`
DeploySampleProject started on 2023/10/27 08:19:31

[Container] 2023/10/27 08:19:31.526980 Running command ls -l
total 0
-rw-r--r-- 1 root root 0 Oct 27 08:18 result_file_2023_10_27_08_18_21.txt
```

The artifacts setting of buildProject specifies
```typescript
artifacts: {
    'base-directory': '$CODEBUILD_SRC_DIR/output',
    'files': '**/*'
}
```
Therefore, the current directory when deployProject runs contains only the file created by ``'touch $CODEBUILD_SRC_DIR/output/result_file_`date "+%Y_%m_%d_%H_%M_%S"`.txt'``.

### Creating a Role to Trigger the Pipeline
When triggering some process from [Amazon EventBridge Scheduler](https://docs.aws.amazon.com/eventbridge/latest/userguide/scheduler.html), a role for triggering is required.

The requirement for the created role is that it has the authority to trigger the created pipeline from Amazon EventBridge Scheduler.

In terms of AWS role definition, it allows the ``codepipeline:StartPipelineExecution`` action to be executed from ``ServicePrincipal:'scheduler.amazonaws.com'`` on the created pipeline.

Expressing this in CDK code, it looks like this:
pipelineArn specifies the ARN of the created pipeline (``pipeline.pipelineArn``).
```typescript
        const pipeLineExecutionRole  = new aws_iam.Role(this, 'pipeLineExecutionRole', {
            assumedBy: new aws_iam.ServicePrincipal('scheduler.amazonaws.com'),
            managedPolicies: [
                new aws_iam.ManagedPolicy(this, 'pipeLineExecutionRolePolicy', {
                    statements: [
                        new aws_iam.PolicyStatement({
                            effect: aws_iam.Effect.ALLOW,
                            actions: ['codepipeline:StartPipelineExecution'],
                            resources: [pipelineArn],
                        })
                    ],
                }),
            ],
        });
```

### Registering the Schedule to Trigger the Created Pipeline
```typescript
private createSchedule(pipelineArn: string, pipeLineExecutionRoleArn: string) {
    new scheduler.CfnSchedule(this, 'ExecPipelineSchedule', {
        flexibleTimeWindow: {
            // Set flexible time window to "OFF"
            mode: 'OFF',
        },
        // Schedule to trigger at 9:30 AM every day
        scheduleExpression: 'cron(30 09 * * ? *)',
        target: {
            // The target to trigger is the created pipeline
            arn: pipelineArn,
            roleArn: pipeLineExecutionRoleArn,
        },
        name: 'pipelineExecutionSchedule',
        // Specify 'Asia/Tokyo' as the time zone, as the default is UTC
        scheduleExpressionTimezone: 'Asia/Tokyo',
    });
}
```
The explanation other than scheduleExpression is sufficiently covered in the comments within the code. The value specified for scheduleExpression can be a string meaning "execute at a specific time" or "execute at regular intervals". For details on the values to specify in scheduleExpression, refer to [Creating an Amazon EventBridge Rule That Runs on a Schedule](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html#eb-create-scheduled-rule-schedule).

### Deploy

Execute the following commands to deploy to AWS.
```shell
cdk bootstrap
cdk deploy
```
The ``cdk bootstrap`` command creates the S3 bucket and other resources used by CDK during deployment. It needs to be executed once per target account and region. The ``cdk deploy`` command takes about 3 minutes to execute.

### AWS Management Console Display Image

The actually registered schedule will look like this.
![Schedule Details](/img/blogs/2023/1030_aws-scheduled-pipeline-2.png)

The target settings of the schedule will look like this.
![Schedule Target](/img/blogs/2023/1030_aws-scheduled-pipeline-3.png)

## Summary
I have explained how to build a periodically triggered pipeline using CDK. The pipeline consists of three stages, assuming actual usage scenarios, so I hope it can be used as a template when building pipelines.
