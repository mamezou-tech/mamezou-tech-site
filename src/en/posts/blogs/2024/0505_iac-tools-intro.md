---
title: Leveraging the IaC Approach for Efficient Cloud Infrastructure Management
author: noboru-kudo
date: 2024-05-05T00:00:00.000Z
tags:
  - IaC
  - 新人向け
  - AWS
image: true
translate: true

---




This article is part of the ongoing series for newcomers. Here, as a first step to quickly move beyond being a newcomer, we introduce the benefits of adopting IaC (Infrastructure as Code) tools and their simple usage.

The era when cloud environments are a given has now arrived.

Even with cloud environments, in the past, it was common to create virtual machines and configure applications and various dependent software within them, similar to on-premises environments. However, recently, it has become common to construct environments by combining countless resources, including managed services provided by cloud providers. How should these resources be created?

## Creating with the GUI provided by cloud providers

The most understandable option as a first choice is to manually create them through the GUI prepared by each cloud provider. Of course, this method is not bad. Using the GUI allows you to visually grasp information and perform intuitive operations. Personally, I think the GUI is optimal when trying out features that have never been used before.

However, the biggest drawback of this method is the lack of reproducibility. Generally, projects often prepare multiple environments according to their purpose, not only in commercial environments but also in test and staging environments. In such cases, it is necessary to create each environment with the same configuration (although there are differences in external environment parameters, etc.). Clearly, creating them manually using the GUI is inefficient. Manual work is prone to human errors and troubleshooting can take a lot of time. Of course, in practice, procedures are usually prepared to avoid this, but if the system consists of numerous resources, it becomes a time-consuming simple task that leads to a decrease in motivation. Additionally, the GUI provided by cloud providers changes quite frequently with feature additions. Accordingly, maintenance of the procedure itself must also be carried out appropriately, otherwise, no one will be able to handle it.

Also, cloud environments are generally good at flexible usage depending on the situation. For example, you might want to delete resources during long holiday periods to save costs and restore them after the holidays. Even in such cases, manual creation from the GUI is inefficient and offers low cost benefits.

This is where the importance of the IaC automation approach increases.

## IaC Automation Approach

IaC (Infrastructure as Code) is, as the name suggests, an approach that treats infrastructure resources as code. In other words, you write code for infrastructure resources just like you do for application source code. The code is written in high-level languages such as YAML/JSON, domain-specific languages (HCL, etc.), but recently, methods using the same programming languages as applications (JavaScript, Python, etc.) are preferred.

The code is efficiently and reliably reflected in the environment using the power of IaC tools. Since it is an actual program, not a manual, it produces the same results no matter how many times it is executed. Here, the problem of lack of reproducibility that the GUI has is solved. Moreover, infrastructure code written in high-level languages is often self-evident, so it is often shared among stakeholders as a design document.

One of the major benefits of IaC is that, like applications, it can be operated with version control systems such as Git. Not only ensuring traceability using the history management function but also fully utilizing the functions of version control systems such as pull requests/merge requests. Also, IaC tools are often operated by combining them with CI/CD pipelines, using the creation of pull requests or pushes as triggers to synchronize the corresponding branch and execution environment. Since you only need to commit (or merge) and push the code to the corresponding Git repository, the workload for deployment is significantly reduced. For rollbacks, just revert commit from the change history to automatically sync to the previous version. It also matches perfectly with agile development, which often has frequent release cycles.

:::column:IaC's Disadvantages
Of course, there are also disadvantages to the IaC approach.
The first is the issue of tool proficiency. I often see sites that have only a superficial understanding of the tool and end up with IaC in form only without leveraging the tool's inherent power. Also, I mentioned earlier that the GUI provided by cloud providers changes frequently, but cloud services themselves and IaC tool versions are also constantly updated.
Over time, you may find that deployment is impossible. This means that the reproducibility issue, which should have been resolved, is exposed again.
To avoid this, it is important to continuously grasp the release information of the tools you adopt, release small changes frequently, and respond to changes at an early stage.
:::

Finally, let me introduce some representative IaC tools.
There are two types of IaC automation tools.

### Imperative Style
These are tools of the style that describe the specific procedures (How) for configuring the infrastructure as code.
The following tools are representative:

- [Ansible](https://www.ansible.com/)
- [Chef](https://www.chef.io/products/chef-infra)
- [Puppet](https://www.puppet.com/)

These tools allow for finer control than declarative style tools and are often used as provisioning tools for server configurations, not limited to cloud environments.

### Declarative Style
These are tools of the style that describe the final desired state of the infrastructure configuration as code. Since it describes the final state rather than the procedure, the code is usually more readable.
The following tools are representative:

- Tools provided by cloud providers
  - [AWS CloudFormation](https://aws.amazon.com/cloudformation/)
  - [AWS Cloud Development Kit (CDK)](https://aws.amazon.com/cdk/)
  - [Azure Resource Manager](https://azure.microsoft.com/get-started/azure-portal/resource-manager/)
  - [Google Cloud Deployment Manager](https://cloud.google.com/deployment-manager/docs)
- Tools provided by third-party vendors
  - [Terraform](https://www.terraform.io/)
  - [Pulumi](https://www.pulumi.com/)
  - [Crossplane](https://www.crossplane.io/)

Tools provided by cloud providers are free to use and quickly follow new features, but naturally, they can only be used in the cloud environments they provide (vendor lock-in). On the other hand, tools provided by third-party vendors support multi-cloud and their usability is often refined, but there are disadvantages such as a time lag in following new features and concerns about continuity.

## Practicing IaC

Finally, let's practice the IaC approach using AWS CDK (hereinafter referred to as CDK).

First, set up the CDK CLI. The CDK CLI is provided as an NPM package.

```shell
npm install -g aws-cdk
cdk version
```

Here, we are setting up the latest version 2.140.0 at this point.

CDK requires the creation of CDK-specific resources in the target AWS account/region for the first time. This can be done with the CDK's bootstrap subcommand.

```shell
cdk bootstrap aws://<account-id>/<aws-region>
```

Resources necessary for CDK execution, such as S3 buckets and IAM roles, are created in the target AWS account/region.

Now let's create a CDK project. Create an arbitrary directory and execute the init subcommand.

```shell
mkdir cdk-sample
cd cdk-sample
cdk init app --language typescript
```

Here, we are selecting TypeScript as the language for describing infrastructure code. Other languages such as Java, Python, and C# can also be selected. Once the execution is completed, various template files are created in the current directory.

Now let's write some infrastructure code. Edit as follows.

```diff-typescript:/cdk-sample/bin/cdk-sample.ts
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkSampleStack } from '../lib/cdk-sample-stack';

const app = new cdk.App();
new CdkSampleStack(app, 'CdkSampleStack', {
  // Uncomment
+  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
-  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});
```
```diff-typescript:/cdk-sample/lib/cdk-sample-stack.ts
import * as cdk from '@aws-cdk';
import * as ec2 from '@aws-cdk/aws-ec2';

export class CdkSampleStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

+    const vpc = ec2.Vpc.fromLookup(this, 'VPC', {
+      isDefault: true
+    });

+    new ec2.Instance(this, 'MyEC2Instance', {
+      instanceType: new ec2.InstanceType('t3.micro'),
+      machineImage: new ec2.AmazonLinuxImage(),
+      instanceName: 'MyEC2Instance',
+      vpc: vpc
+    });
  }
}
```

Here, we are simply creating EC2 resources within the default VPC prepared in the AWS account. AWS CDK is a declarative style tool. It describes the final configuration you want to achieve, not the procedure for creating resources.

In actual projects, more resources are combined and used, but the code is often easier to understand compared to applications.

Deploy this. Use the deploy subcommand for deployment.

```shell
cdk deploy
```
![](https://i.gyazo.com/8e4582411d39a4477b4f2c1776ee6719.png)

A confirmation prompt appears for adding security-related resources. Entering `y` will continue the deployment. After waiting for a while, the EC2 instance is created. You can check this from the management console.

![](https://i.gyazo.com/393b839dccc98b7c3471efee4396808e.png)

Internally, CDK creates and deploys an AWS CloudFormation template from the code you wrote. This can also be checked from the CloudFormation menu in the management console.

![](https://i.gyazo.com/22ed51a2971094bff607410bc8530898.png)

Note that the resources created here should not be modified from the GUI (management console) in principle. When making changes, modify the code and re-sync using the deploy subcommand.

These resources are managed by AWS CDK (actually CloudFormation). If you make manual changes, it will result in a discrepancy between the template and the actual state (drift), which may lead to unexpected results (changes being overwritten or execution failing) during synchronization. To avoid unnecessary troubleshooting work, changes from the GUI should be avoided.

To delete resources, use the destroy subcommand.

```shell
cdk destroy
```

This should delete all the resources created by the deploy command earlier.

:::column:Check the AWS CloudFormation Template
As mentioned earlier, AWS CDK internally uses AWS CloudFormation as the deployment engine. Knowledge of CloudFormation is necessary, but checking the actual template can also be effective during troubleshooting.

To check the CloudFormation template without deploying, execute the synth subcommand.

```shell
cdk synth
```

Most of it is omitted because it is long, but the CloudFormation template is output to standard output.
```yaml
Resources:
  MyEC2InstanceInstanceSecurityGroup06C6622F:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: CdkSampleStack/MyEC2Instance/InstanceSecurityGroup
      SecurityGroupEgress:
        - CidrIp: 0.0.0.0/0
          Description: Allow all outbound traffic by default
          IpProtocol: "-1"
      Tags:
        - Key: Name
          Value: MyEC2Instance
# Omitted below
```
:::

## Summary

We introduced the concept of IaC and how to use AWS CDK as a tool to implement it. Other tools are also easy to use. We recommend getting used to the IaC approach by familiarizing yourself with your favorite tool.

Also, here we executed commands from the terminal, but in actual projects, it is common to incorporate them into CI/CD pipeline jobs and use event hooks provided by Git repositories for full automation. There are many easy-to-use CI/CD services like GitHub Actions, so incorporating them into the pipeline will help you imagine actual operations.
