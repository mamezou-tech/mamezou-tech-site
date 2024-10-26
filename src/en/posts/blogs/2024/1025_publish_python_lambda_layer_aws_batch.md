---
title: Creating AWS Lambda Python Layer with CodeBuild + ECR + AWS Batch
author: yuji-kurabayashi
date: 2024-10-25T00:00:00.000Z
tags:
  - AWS
  - lambda
  - Python
  - docker
  - CodeBuild
  - CloudFormation
  - ECR
  - Batch
  - Fargate
image: true
translate: true

---

# Background

Among the languages supported by AWS Lambda, Python seems to be popular due to its ease of use and low learning cost. Although my main language is Java, I tend to use Python for Lambda when I want to get things done quickly, even if I'm not very familiar with it. When you want to leverage external libraries in Lambda, you need to prepare something called a [layer](https://docs.aws.amazon.com/lambda/latest/dg/chapter-layers.html). It's fine if the layers provided by AWS are sufficient, but if not, you'll need to prepare your own. However, when I tried it, I got stuck with Python environment setup (especially related to OpenSSL), which was quite challenging. Therefore, I wanted to avoid the hassle of setting up the Python environment, so I thought it would be nice to use Docker and execute tedious command tasks via shell scripts, leading me to create a layer creation tool. After various considerations, I decided to run the Docker container of the layer creation tool on AWS Batch. CodeBuild is used for image building, and I prepared a CloudFormation template for setting up the CodeBuild and AWS Batch environment.

# Why AWS Batch was chosen for the container execution environment

Before trying AWS Batch in this article, I tried all the following options, but either they were not feasible, or even if they were possible, they were not satisfactory, so I gave up.

## Attempt 1 - Lambda

I thought it would be convenient and interesting if I could create Lambda layers with Lambda itself, so I tried it. When running Lambda in a container, you can only write to the `/tmp` directory. I set the installation destination to `/tmp` with `pip install`, but eventually, the installation management information was written to directories other than `/tmp`, causing errors, so I gave up.

For reference, the "Container Constraints" section of [AWS Lambda for the Containers Developer](https://aws.amazon.com/blogs/news/aws-lambda-for-the-containers-developer/) mentions the following:

> Containers run with a read-only root file system (the only writable path is /tmp).

## Attempt 2 - CloudShell

I thought it was nice that Docker could be used for free by default, so I tried it. However, CloudShell's CPU architecture seemed to be only x86_64, and I couldn't run container images created with the arm64 that Amazon is promoting, so I gave up. Even after trying to install a [cross-platform emulator for Docker](https://hub.docker.com/r/tonistiigi/binfmt), it didn't work well.

## Attempt 3 - EC2

I prepared an arm64 instance, so I could run container images created with arm64. However, there were too many steps to use it each time, and I couldn't limit the instance running time purely to the container execution time, which seemed wasteful in terms of cost, so AWS Batch seemed like a good option.

# Layer Creation Tool

I created a layer creation tool. As long as Docker can be used, it can be utilized anywhere, including local development environments.

## Layer Creation Shell

* <span style="font-size: 120%;"><b>[PublishPythonLambdaLayer.sh](https://github.com/yuji-kurabayashi/publish_lambda_layer/blob/main/python/PublishPythonLambdaLayer.sh)</b></span>

Generally, the steps to create and register a Python Lambda layer are as follows:

1. Execute the Python library installation command
    * Prepare a [requirements.txt](https://pip.pypa.io/en/latest/reference/requirements-file-format/) file listing the target libraries
    * [`python -m pip install [options] -r <requirements file> [package-index-options] ...`](https://pip.pypa.io/en/latest/cli/pip_install/#pip-install)
1. Create a layer (zip file)
    * Prepare it in the [specified directory structure](https://docs.aws.amazon.com/lambda/latest/dg/packaging-layers.html#packaging-layers-paths) and compress it into a zip file
        * python
        * python/lib/python3.x/site-packages (site directory)
1. Upload the layer (zip file) to S3
    * With AWS CLI, use [`s3 cp`](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/s3/cp.html)
    * With AWS Management Console operations, you can directly upload the layer zip file when creating a layer, but if it exceeds 10MB, you need to place it in S3 for upload
1. Register the Lambda layer
    * With AWS CLI, use [`publish-layer-version`](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/lambda/publish-layer-version.html)

The layer creation shell performs these steps seamlessly. However, it does not support creating Lambda layers that include custom Python modules.

If you do not specify the S3 bucket name for the Lambda layer upload destination, it will only create the layer. This is to allow use up to layer creation even if it is known in advance that the environment you are executing from cannot connect to S3. If you can create the layer (zip file) and have the file on hand, you can somehow handle it manually.

Also, if you have an environment where Python can be used normally, you can directly use only the layer creation shell to create layers.

You can check the usage details of the layer creation shell with the following command:

```sh
./PublishPythonLambdaLayer.sh -h
```

## Dockerfile

* <span style="font-size: 120%;"><b>[Dockerfile](https://github.com/yuji-kurabayashi/publish_lambda_layer/blob/main/python/Dockerfile)</b></span>

```dockerfile:Dockerfile
# see https://hub.docker.com/r/amazon/aws-lambda-python/
ARG BASE_IMAGE_TAG=latest

FROM amazon/aws-lambda-python:${BASE_IMAGE_TAG?}

COPY ./PublishPythonLambdaLayer.sh .

RUN <<EOF
chmod +x ./PublishPythonLambdaLayer.sh

# for Amazon Linux 2023 (for python 3.12)
if (type dnf > /dev/null 2>&1); then
  # see https://docs.aws.amazon.com/linux/al2023/ug/deterministic-upgrades-usage.html
  # dnf update -y
  dnf upgrade -y --releasever=latest
  dnf install -y zip unzip
  dnf clean all
  rm -rf /var/cache/dnf/*
# for Amazon Linux 2 (for python 3.11)
elif (type yum > /dev/null 2>&1); then
  yum update -y
  yum install -y zip unzip
  yum clean all
  rm -rf /var/cache/yum/*
else
  echo update failed. unsupported package management tool.
  exit 1
fi

# see https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
if !(type aws > /dev/null 2>&1); then
  CPU_ARCHITECTURE=$(uname -m)
  if [ "$CPU_ARCHITECTURE" = "x86_64" ]; then
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
  elif [ "$CPU_ARCHITECTURE" = "aarch64" ]; then
    curl "https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip" -o "awscliv2.zip"
  else
    echo aws cli install failed. unsupported cpu architecture.
    exit 1
  fi
  unzip -qq awscliv2.zip
  ./aws/install > /dev/null 2>&1
  rm -f awscliv2.zip
fi
EOF

ENTRYPOINT [ "bash", "./PublishPythonLambdaLayer.sh" ]
CMD [ "" ]
```

1. Base Image
    * Uses [amazon/aws-lambda-python](https://hub.docker.com/r/amazon/aws-lambda-python/). It's the execution environment of AWS Lambda Python itself, making it the optimal environment for creating layers.
1. Base Image Tag
    * You can specify the tag of the base image during docker build with `--build-arg BASE_IMAGE_TAG=<tag>`. You can flexibly choose an environment that matches the desired CPU architecture and Python version, such as `3.11` or `3.12`. However, `yum` is only available for Python 3.11 based on Amazon Linux 2, and `dnf` is only available for Python 3.12 based on Amazon Linux 2023, so there was no compatibility. Therefore, I handled it by checking if the dnf command could be executed and using dnf and yum accordingly.
1. Initialization Processing such as Installation
    * Written using [heredocs](https://www.docker.com/blog/introduction-to-heredocs-in-dockerfiles/). It makes it easier to write complex processes without having to chain commands with `&& \`, and as a result, it makes it easier to reduce the number of layers in the Docker image, reducing the image size.
1. Others
    * The logs for AWS CLI file extraction and installation were cut because they were annoying due to the large amount of output.
    * The options for the layer creation shell can be overwritten with CMD at runtime.

# Infrastructure Diagram of the Layer Creation Tool

## Build Environment

1. Place the source (layer creation tool) in S3
1. Create a Docker image with CodeBuild
1. Push it to ECR

![Infrastructure Diagram of the Build Environment](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/024.png)

## Execution Environment

1. Pull the Docker image from ECR with AWS Batch
1. Execute the container with AWS Batch to create the layer
1. Upload it to S3
1. Register the layer with Lambda

![Infrastructure Diagram of the Execution Environment](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/025.png)

# How to Set Up and Execute the Layer Creation Tool Environment

AWS officially strongly recommends using arm64 for the CPU architecture of computing resources such as Lambda, so the default values of the CloudFormation template for creating the environment are set for arm64.

:::check:AWS Officially Recommends arm64 for Computing Resources
AWS seems to strongly recommend [using arm64 for Lambda](https://docs.aws.amazon.com/lambda/latest/dg/foundation-arch.html). They even mention transitioning to arm64. When comparing [Lambda pricing](https://aws.amazon.com/lambda/pricing/#aws-element-9ccd9262-b656-4d9c-8a72-34ee6b662135) between x86_64 and arm64, arm64 is about 20% cheaper. In terms of [performance comparison](https://aws.amazon.com/blogs/apn/comparing-aws-lambda-arm-vs-x86-performance-cost-and-analysis-2/), arm64 clearly wins. Here is a quote:

> Lambda functions using the arm64 architecture (AWS Graviton2 processor) achieve significantly better pricing and performance than equivalent functions running on the x86_64 architecture. Consider using arm64 for compute-intensive applications such as high-performance computing, video encoding, and simulation workloads.

Incidentally, even when comparing [Fargate pricing](https://aws.amazon.com/fargate/pricing/) between x86_64 and arm64, both CPU and memory are about 20% cheaper for arm64.
:::

## (1) Network Construction

Prepare a subnet that meets all the following network requirements for creating an AWS Batch environment. You can easily prepare it using the CloudFormation template from my previous article "[Gentle Network Construction with AWS CloudFormation - Easy and Wallet-Friendly IPv6 Support and NAT Gateway Setup Switching!](/blogs/2024/09/27/aws_cfn_network_ipv6/)".

* Connectable to S3
    * If connecting to an S3 bucket that cannot be accessed externally, you need to connect via a private link (prepare a Gateway-type VPC endpoint and route it)
* Connectable to the internet with IPv4

## (2) Create an S3 Bucket for Storing Layer Creation Tool Source Code

Since the source code is referenced from S3 in CodeBuild, prepare an S3 bucket and folder to store the layer creation tool source code, and store the layer creation tool source code ([Dockerfile](https://github.com/yuji-kurabayashi/publish_lambda_layer/blob/main/python/Dockerfile) and [PublishPythonLambdaLayer.sh](https://github.com/yuji-kurabayashi/publish_lambda_layer/blob/main/python/PublishPythonLambdaLayer.sh)) in the same hierarchy. The requirements.txt used later is placed in the same location for convenience, but it can be placed in another bucket. As an example, I prepared it in `s3://publish-lambda-layer-tool-pcjkn63zhk/python/`. It is desirable to check the setting "Block all public access" when creating the S3 bucket.

|![S3 Bucket for Storing Layer Creation Tool Source Code](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/001.jpg)|
|:--|

## (3) Create an S3 Bucket for Storing Lambda Layers

Prepare an S3 bucket to upload the created Lambda layers. As an example, I prepared `s3://lambda-layer-pcjkn63zhk/`. It is desirable to check the setting "Block all public access" when creating the S3 bucket.

|![S3 Bucket for Storing Lambda Layers](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/000.jpg)|
|:--|

## (4) Create CodeBuild Project and ECR Repository

I have prepared a CloudFormation template to create a CodeBuild project and ECR repository. Use this to create resources.

* <span style="font-size: 120%;"><b>[cfn_codebuild.yaml](https://github.com/yuji-kurabayashi/cloudformation_templates/blob/main/cfn_codebuild.yaml)</b></span>

|![cfn_codebuild Parameter Setting Example](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/022.jpg)|
|:--|

Below is an example of parameter settings for arm64.

| Parameter Item Name | Value (for arm64) | Comment |
| --- | --- | --- |
| Stack Name | publish-python-lambda-layer-tool-build-project-arm64 | |
| CodeBuildProjectName | publish-python-lambda-layer-tool-arm64 | |
| BuildProjectDescription | (Optional) | |
| BuildEnvironmentOSContainer | ARM_CONTAINER | |
| BuildEnvironmentComputeSpec | BUILD_GENERAL1_SMALL | |
| BuildEnvironmentImage | aws/codebuild/amazonlinux2-aarch64-standard:3.0 | Select and set one for aarch64 from [here](https://docs.aws.amazon.com/codebuild/latest/userguide/ec2-compute-images.html). |
| SourceLocation | publish-lambda-layer-tool-pcjkn63zhk/python/ | Specify the storage path from "Create an S3 Bucket for Storing Layer Creation Tool Source Code". Remove `s3://`. |
| RepositoryName | publish-python-lambda-layer-tool-arm64 | |

Of course, you can also prepare for x86_64. Below is an example of parameter settings.

| Parameter Item Name | Value (for x86_64) | Comment |
| --- | --- | --- |
| Stack Name | publish-python-lambda-layer-tool-build-project-x86-64 | |
| CodeBuildProjectName | publish-python-lambda-layer-tool-x86-64 | |
| BuildProjectDescription | (Optional) | |
| BuildEnvironmentOSContainer | LINUX_CONTAINER | |
| BuildEnvironmentComputeSpec | BUILD_GENERAL1_SMALL | |
| BuildEnvironmentImage | aws/codebuild/amazonlinux2-x86_64-standard:5.0 | Select and set one for x86_64 from [here](https://docs.aws.amazon.com/codebuild/latest/userguide/ec2-compute-images.html). |
| SourceLocation | publish-lambda-layer-tool-pcjkn63zhk/python/ | Specify the storage path from "Create an S3 Bucket for Storing Layer Creation Tool Source Code". Remove `s3://`. |
| RepositoryName | publish-python-lambda-layer-tool-x86-64 | |

## (5) Create Docker Image for Layer Creation Tool

Execute the build in the created CodeBuild project. The buildspec, which writes the process of creating a Docker image and pushing it to the ECR repository, and the environment variables referenced within the buildspec, are already prepared when the project is created with CloudFormation. You can build it by just setting the environment variables to be set at runtime.

```yaml:buildspec.yml
version: 0.2
phases:
  pre_build:
    commands:
      - |
        export AWS_ECR_REGISTRY_URL=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.$AWS_URL_SUFFIX
        export DOCKER_IMAGE_REPO_NAME_AND_TAG=$IMAGE_REPO_NAME:$IMAGE_TAG
        echo "AWS_ECR_REGISTRY_URL="$AWS_ECR_REGISTRY_URL
        echo "DOCKER_IMAGE_REPO_NAME_AND_TAG="$DOCKER_IMAGE_REPO_NAME_AND_TAG
      - echo "----- login to Amazon ECR Repository -----"
      - aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $AWS_ECR_REGISTRY_URL
      - |
        if [ -n "$DOCKER_USER" ] && [ -n "$DOCKER_TOKEN" ]; then
          echo "----- login to docker hub -----"
          echo $DOCKER_TOKEN | docker login -u $DOCKER_USER --password-stdin
        fi
  build:
    commands:
      - echo "----- build docker image -----"
      - echo Build started on `date`
      - docker build -t $DOCKER_IMAGE_REPO_NAME_AND_TAG $DOCKER_BUILD_OPTIONS .
      - echo Build completed on `date`
  post_build:
    commands:
      - echo "----- add docker image tag -----"
      - docker tag $DOCKER_IMAGE_REPO_NAME_AND_TAG $AWS_ECR_REGISTRY_URL/$DOCKER_IMAGE_REPO_NAME_AND_TAG
      - echo "----- push docker image to Amazon ECR Repository -----"
      - docker push $AWS_ECR_REGISTRY_URL/$DOCKER_IMAGE_REPO_NAME_AND_TAG
```

### Environment Variable Settings

Set them in the CodeBuild project's "Edit" -> "Environment" -> "Additional Configuration" -> "Environment Variables". After setting, press "Update Project".

|![CodeBuild Project Environment Variables](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/004.jpg)|
|:--|

Below is an example of parameter settings for arm64.

| Environment Variable Name | Value (for arm64) | Comment |
| --- | --- | --- |
| IMAGE_TAG | latest | The tag assigned to the Docker image created by CodeBuild. It is also possible to set the same value as the `--build-arg BASE_IMAGE_TAG` in `DOCKER_BUILD_OPTIONS` for identification. |
| DOCKER_BUILD_OPTIONS | --build-arg BASE_IMAGE_TAG=,```yaml
--build-arg BASE_IMAGE_TAG=3.12.2024.10.15.10 | Specify the tag of the base image. Find the desired Python version and OS/ARCH for arm64 [here](https://hub.docker.com/r/amazon/aws-lambda-python/tags).
```

Below is an example of parameter settings for x86_64.

| Environment Variable Name | Value (for x86_64) | Comment |
| --- | --- | --- |
| IMAGE_TAG | latest | The tag assigned to the Docker image created by CodeBuild. It is also possible to set the same value as the `--build-arg BASE_IMAGE_TAG` in `DOCKER_BUILD_OPTIONS` for identification. |
| DOCKER_BUILD_OPTIONS | --build-arg BASE_IMAGE_TAG=3.12.2024.10.16.13 | Specify the tag of the base image. Find the desired Python version and OS/ARCH for amd64 [here](https://hub.docker.com/r/amazon/aws-lambda-python/tags). |

:::alert:Explicitly Specify a Version-Fixed Tag for the Base Image
If you do not specify `--build-arg BASE_IMAGE_TAG` in `DOCKER_BUILD_OPTIONS`, `latest` will be applied. Note that if you build with `latest`, there is a risk that the internal version used by the base image will suddenly increase one day, affecting the operation and causing it to suddenly stop working. Therefore, it is generally desirable to explicitly specify a tag that fixes the version. Note that in [amazon/aws-lambda-python](https://hub.docker.com/r/amazon/aws-lambda-python/), the internal version may increase even with `3.11` or `3.12`, so be careful.
:::

### Execute the Build

Press "Start Build".

|![CodeBuild Project Environment Variables](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/003.jpg)|
|:--|

Confirm that it succeeded.

|![CodeBuild Build Success](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/005.jpg)|
|:--|

Confirm that the image has been pushed to the ECR repository.

|![ECR Repository](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/006.jpg)|
|:--|

### If the Build Fails

When executing the docker build command, the pull of the base image may fail with a mysterious error message "Too Many Requests." If this happens, retrying the build may succeed. If retries continue to fail, or if you want to ensure stable build success, prepare your Docker Hub user and set the CodeBuild environment variables `DOCKER_USER` and `DOCKER_TOKEN`. It is desirable to register these credentials in Parameter Store or Secrets Manager rather than setting them directly as plain text in environment variables.

#### Parameter Store Setting Example

|![Parameter Store Setting Example](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/019.jpg)|
|:--|

#### Secrets Manager Setting Example

|![Secrets Manager Setting Example](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/020.jpg)|
|:--|

#### CodeBuild Environment Variable Setting Example

* When referencing Parameter Store
    * Set the value to "Name of My Parameter" and the type to "Parameter".
        * Example of setting the value: `DOCKER_USER`
* When referencing Secrets Manager
    * Set the value to "Secret Name:Secret Key" and the type to "Secrets Manager".
        * Example of setting the value: `MyDockerHubAccount:DOCKER_TOKEN`

|![DockerHub Account Environment Variable Setting Example](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/021.jpg)|
|:--|

:::check:About the Cause of Docker Build Failure in CodeBuild
The cause of the failure when executing the docker build command with a mysterious error message "Too Many Requests" is that all CodeBuild users in the current AWS region share the global IP address of CodeBuild in that region, and it is assumed that many of them are accessing Docker Hub as anonymous users. If you are unlucky with the assigned CodeBuild global IP address, you may hit the [Anonymous users' rate limit](https://docs.docker.com/docker-hub/download-rate-limit/#whats-the-download-rate-limit-on-docker-hub) of "100 pulls per 6 hours per IP address." Therefore, set the environment variables "DOCKER_USER" and "DOCKER_TOKEN" to log in to Docker Hub. This will apply the rate limit for Authenticated users of "200 pulls per 6 hour period," so if you haven't excessively pulled images with that user, it should succeed.

By the way, when checking the AWS IP address range json downloaded from [here](https://docs.aws.amazon.com/vpc/latest/userguide/aws-ip-ranges.html) at the time of writing this article, it seems that 8 + 8 = 16 IP addresses are secured for CodeBuild in the Tokyo region. In other words, each time you build anonymously with CodeBuild, you will be testing your luck with up to 16 IP addresses.
:::

## (6) Create AWS Batch Environment

I have prepared a CloudFormation template to create an AWS Batch environment. Use this to create resources.

* <span style="font-size: 120%;"><b>[cfn_aws_batch.yaml](https://github.com/yuji-kurabayashi/cloudformation_templates/blob/main/cfn_aws_batch.yaml)</b></span>

|![cfn_aws_batch Parameter Setting Example](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/023.jpg)|
|:--|

Below is an example of parameter settings for arm64.

| Parameter Item Name | Value (for arm64) | Comment |
| --- | --- | --- |
| Stack Name | publish-python-lambda-layer-tool-aws-batch-arm64 | |
| prefix | publish-python-lambda-layer-tool-arm64 | |
| AwsBatchVpcId | VPC to which the specified AwsBatchSubnetIds belong | |
| AwsBatchSubnetIds | Subnet where IPv4 can be used | Ensure it is connectable to the internet. |
| ComputeResourcesType | FARGATE | Currently, Fargate Spot is not available for arm64 in AWS Batch. |
| AssignPublicIp | (Depending on the network) | If you select a public subnet in AwsBatchSubnetIds, set it to ENABLED |
| CpuArchitecture | ARM64 | |
| AwsBatchVCPU | (Optional) | |
| AwsBatchMemory | (Optional) | |
| AllowActions | s3:GetObject,s3:ListBucket,s3:PutObject,lambda:PublishLayerVersion | Necessary permissions for the layer creation tool. |
| EcrRepositoryName | publish-python-lambda-layer-tool-arm64 | ECR repository that was pushed |
| DockerImageTag | latest | Image tag of the ECR repository that was pushed |

:::check:AWS Batch Does Not Support Fargate Spot for arm64
[Fargate Spot](https://aws.amazon.com/blogs/news/aws-fargate-spot-now-generally-available/) offers up to 70% off compared to Fargate, despite the risk of task interruption. Since the layer creation tool can simply be re-executed if a task is interrupted, it is not much of a disadvantage, so it is something I would like to actively use. Although [Fargate Spot can be used for arm64 in ECS](https://aws.amazon.com/about-aws/whats-new/2024/09/amazon-ecs-graviton-based-spot-compute-fargate/), unfortunately, at the time of writing this article, [Fargate Spot cannot be used for arm64 in AWS Batch](https://docs.aws.amazon.com/batch/latest/APIReference/API_RuntimePlatform.html). When I actually specified Fargate Spot for arm64 in CloudFormation, resources such as compute environments could be created, but the job status remained Runnable indefinitely, and it seemed to be stopped from executing. It seems like AWS Batch uses ECS Fargate internally, but it's incomprehensible. Incidentally, it can be used for x86_64. I hope it becomes available for arm64 as well.
:::

Below is an example of parameter settings for x86_64.

| Parameter Item Name | Value (for x86_64) | Comment |
| --- | --- | --- |
| Stack Name | publish-python-lambda-layer-tool-aws-batch-x86-64 | |
| prefix | publish-python-lambda-layer-tool-x86-64 | |
| AwsBatchVpcId | VPC to which the specified AwsBatchSubnetIds belong | |
| AwsBatchSubnetIds | Subnet where IPv4 can be used | Ensure it is connectable to the internet. |
| ComputeResourcesType | FARGATE_SPOT | Fargate Spot can be used for x86_64. |
| AssignPublicIp | (Depending on the network) | If you select a public subnet in AwsBatchSubnetIds, set it to ENABLED |
| CpuArchitecture | X86_64 | |
| AwsBatchVCPU | (Optional) | |
| AwsBatchMemory | (Optional) | |
| AllowActions | s3:GetObject,s3:ListBucket,s3:PutObject,lambda:PublishLayerVersion | Necessary permissions for the layer creation tool. |
| EcrRepositoryName | publish-python-lambda-layer-tool-x86-64 | ECR repository that was pushed |
| DockerImageTag | latest | Image tag of the ECR repository that was pushed |

## (7) Execute Layer Creation

Create a job in the created AWS Batch environment to create the Lambda layer. In AWS Batch, press the "Submit new job" button in "Jobs".

|![Submit New Job](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/007.jpg)|
|:--|

### General Settings

Select the following:

* Job Definition
    * CloudFormation parameter "prefix" value-job-definition
* Job Queue
    * CloudFormation parameter "prefix" value-job-queue

|![Job General Settings](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/008.jpg)|
|:--|

### Container Overrides Command - Options

Below is an example of the minimum necessary parameter settings for arm64. Overwrite `CMD [ "" ]` in the Dockerfile to set options for the layer creation shell.

|![Container Overrides](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/009.jpg)|
|:--|

```
[ "-p s3://publish-lambda-layer-tool-pcjkn63zhk/python/requirements.txt", "-n http_request_lib_test_python_3_12_arm64", "-s lambda-layer-pcjkn63zhk" ]
```

#### Options for the Layer Creation Shell

| Option | Required or Optional | Description |
| --- | --- | --- |
| -p | Either "-r" or "-p" is required | Specify the path to requirements.txt. Specify an S3 URL or local file path. |
| -r | Either "-r" or "-p" is required | Specify the contents of requirements.txt. Specify the contents of requirements.txt with line breaks replaced by "|". |
| -n | Required | Specify the layer name. |
| -s | (Assuming the layer is uploaded to S3, it is required) | Specify the S3 bucket name for storing the layer. Specify the bucket name created in "Create an S3 Bucket for Storing Lambda Layers". Although this option is not required for the shell, it is essentially required when running on AWS Batch because there is no way to retrieve the created layer zip file without S3 upload. |
| -k | Optional | You can change the S3 key for storing the layer (default is "python"). |
| -l | Optional | Specify the license information for the layer. |

As an example, I prepared `requirements.txt` in `s3://publish-lambda-layer-tool-pcjkn63zhk/python/`. Its contents are as follows:

```
requests == 2.32.3
httpx == 0.27.2
```

You can also use the "-r" option without preparing a `requirements.txt` file by specifying the following:

```
[ "-r requests == 2.32.3|httpx == 0.27.2", "-n http_request_lib_test_python_3_12_arm64", "-s lambda-layer-pcjkn63zhk" ]
```

Below is an example of the minimum necessary parameter settings for x86_64.

```
[ "-p s3://publish-lambda-layer-tool-pcjkn63zhk/python/requirements.txt", "-n http_request_lib_test_python_3_12_x86_64", "-s lambda-layer-pcjkn63zhk" ]
```

### Submit the Job

If the status is Succeeded, it is successful.

|![Job Success](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/010.jpg)|
|:--|

The layer zip file is stored in S3.

|![S3 Layer Zip](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/011.jpg)|
|:--|

The metadata of the layer zip file contains various information about the layer.

|![S3 Layer Zip Metadata](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/012.jpg)|
|:--|

It is also registered as a Lambda layer.

|![Lambda Layer](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/013.jpg)|
|:--|

|![Lambda Layer Details](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/014.jpg)|
|:--|

## (8) Try Using the Layer

### Create a Function

Create a function by specifying the desired runtime and architecture.

|![Create Function](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/015.jpg)|
|:--|

### Add Layer

Add the layer to the function.

|![Add Layer](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/016.jpg)|
|:--|

### General Settings - Timeout

The default timeout for Lambda is 3 seconds, so change it to about 1 minute just in case.

### Source Code

Try using the modules (requests, httpx) included in the layer. Additionally, use `platform.python_version()` to check the actual Python version running.

```python:lambda_function.py
import platform
import httpx
import requests

def lambda_handler(event, context):
    python_version = platform.python_version()
    print('[lambda python runtime version] ' + python_version)
    url = 'https://aws.amazon.com/'
    httpx_response = httpx.get(url)
    print('[httpx response]')
    print(httpx_response)
    requests_response = requests.get(url)
    print('[requests response]')
    print(requests_response)
    return python_version
```

### Execution Result

The HTTP request went through, and the running Python version is returned, indicating that the layer is usable.

|![Lambda Execution Result](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/018.jpg)|
|:--|

The base image for layer creation (3.12.7) was released shortly before, so the actual Lambda (3.12.5) hadn't caught up yet. If it doesn't work well when the Python versions don't match, you might want to choose a base image with a matching Python version and recreate the layer.

# Finally

This time I implemented it in Python, but by replacing the contents of the layer creation tool (only the Dockerfile and shell), I think other Lambda-supported languages can also create layers easily using this method. Furthermore, the CloudFormation templates for the image creation environment CodeBuild and the container execution environment AWS Batch were created to be used generically rather than being specialized for the layer creation tool, so I believe you can prepare tools and applications in any language using these.
