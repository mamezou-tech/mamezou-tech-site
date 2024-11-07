---
title: Creating AWS Lambda Python Layers with CodeBuild + ECR + AWS Batch
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

Among the languages supported by AWS Lambda, Python seems to be popular due to its ease of execution and low learning cost. Although my main language is Java, I often find myself wanting to use Python for quick Lambda implementations, even if I'm not very familiar with it. When you want to leverage external libraries in Lambda, you need to prepare something called a [layer](https://docs.aws.amazon.com/lambda/latest/dg/chapter-layers.html). If the pre-prepared layers by AWS suffice, that's great, but if not, you need to create your own layer. However, when I tried to do this, I got stuck with Python environment setup (especially related to OpenSSL), which was quite challenging. Therefore, I wanted to avoid the hassle of setting up a Python environment and thought it would be great to use Docker and execute tedious command tasks via a shell, so I created a layer creation tool. After various trials and errors, I decided to run the Docker container of the layer creation tool on AWS Batch. I use CodeBuild for image building and have prepared a CloudFormation template for setting up the CodeBuild and AWS Batch environments.

# Why AWS Batch was chosen as the container execution environment

Before trying AWS Batch for this article, I tried all of the following, but either it was impossible or, even if it was possible, it wasn't satisfactory, so I gave up.

## Attempt 1 - Lambda

I thought it would be convenient and interesting if I could create a Lambda layer with Lambda itself, so I tried it. When running Lambda in a container, you can only write to the `/tmp` directory. I set the installation destination to `/tmp` with `pip install`, but eventually, the installation management information was written to directories other than `/tmp`, causing an error, so I gave up.

For reference, the "Container Constraints" section of [AWS Lambda for the Containers Developer](https://aws.amazon.com/blogs/news/aws-lambda-for-the-containers-developer/) states the following:

> Containers run with a read-only root file system (only the /tmp path is writable).

## Attempt 2 - CloudShell

I thought it was nice because Docker can be used by default and it's free, so I tried it. However, it seems that the CPU architecture of CloudShell itself is only x86_64, and I couldn't run container images created with arm64, which Amazon is promoting, so I gave up. Even after trying to install a [cross-platform emulator for Docker](https://hub.docker.com/r/tonistiigi/binfmt), it didn't work.

## Attempt 3 - EC2

I prepared an arm64 instance, so naturally, I could run container images created with arm64. However, there were too many steps to use it each time, and I couldn't limit the instance running time purely to the container execution time, which seemed like a waste of cost, so AWS Batch seemed like a good option.

# Layer Creation Tool

I created a layer creation tool. It can be used anywhere as long as Docker is available, including local development environments.

## Layer Creation Shell

* <span style="font-size: 120%;"><b>[PublishPythonLambdaLayer.sh](https://github.com/yuji-kurabayashi/publish_lambda_layer/blob/main/python/PublishPythonLambdaLayer.sh)</b></span>

The general steps to create and register a Python Lambda layer are as follows:

1. Execute the Python library installation command
    * Prepare a [requirements.txt](https://pip.pypa.io/en/latest/reference/requirements-file-format/) file listing the target libraries
    * [`python -m pip install [options] -r <requirements file> [package-index-options] ...`](https://pip.pypa.io/en/latest/cli/pip_install/#pip-install)
1. Create the layer (zip file)
    * It must be prepared with the [specified directory structure](https://docs.aws.amazon.com/lambda/latest/dg/packaging-layers.html#packaging-layers-paths) and compressed into a zip file
        * python
        * python/lib/python3.x/site-packages (site directory)
1. Upload the layer (zip file) to S3
    * With AWS CLI, use [`s3 cp`](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/s3/cp.html)
    * With the AWS Management Console, you can upload the layer zip file directly when creating the layer, but if it exceeds 10MB, you need to place it in S3 for upload
1. Register the Lambda layer
    * With AWS CLI, use [`publish-layer-version`](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/lambda/publish-layer-version.html)

The layer creation shell performs these steps in one go. Note that it does not support creating Lambda layers that include custom Python modules.

If you do not specify the S3 bucket name for uploading the created Lambda layer, it will only create the layer. This is to allow usage up to layer creation even if you know in advance that the environment you are executing from cannot connect to S3. As long as you can create the layer (zip file) and have the file on hand, you can handle it manually.

Additionally, if you have an environment where Python can be used normally, you can directly use only the layer creation shell to create the layer.

You can check the details of how to use the layer creation shell with the following command:

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
    * We use [amazon/aws-lambda-python](https://hub.docker.com/r/amazon/aws-lambda-python/). It's the actual AWS Lambda Python runtime environment, making it the optimal environment for creating layers.
1. Base Image Tag
    * You can specify the tag of the base image during docker build with `--build-arg BASE_IMAGE_TAG=<tag>`. You can flexibly choose an environment that matches the desired CPU architecture and Python version. For example, you can specify `3.11` or `3.12`. However, Python 3.11 based on Amazon Linux 2 only uses `yum`, and Python 3.12 based on Amazon Linux 2023 only uses `dnf`, which are not compatible. Therefore, I checked if the dnf command is available and handled it by switching between dnf and yum.
1. Initialization Processes like Installation
    * Written using [here documents](https://www.docker.com/blog/introduction-to-heredocs-in-dockerfiles/). It makes it easier to write complex processes without having to chain commands with `&& \`, which in turn reduces the number of image layers, making the image size smaller.
1. Others
    * I cut out the logs of file extraction and installation of AWS CLI because they were overwhelming.
    * The options for the layer creation shell can be overwritten with CMD at runtime.

# Infrastructure Diagram of the Layer Creation Tool

## Build Environment

1. Place the source (layer creation tool) in S3
1. Create a Docker image with CodeBuild
1. Push to ECR

![Infrastructure Diagram of the Build Environment](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/024.png)

## Execution Environment

1. Pull the Docker image from ECR with AWS Batch
1. Execute the container with AWS Batch to create the layer
1. Upload to S3
1. Register the layer with Lambda

![Infrastructure Diagram of the Execution Environment](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/025.png)

# How to Build and Execute the Layer Creation Tool Environment

AWS officially strongly recommends using arm64 for the CPU architecture of computing resources, including Lambda, so the default values in the CloudFormation template for environment creation are set for arm64.

:::check:AWS officially recommends arm64 for computing resources
AWS officially strongly recommends using arm64 for Lambda, as mentioned in [this document](https://docs.aws.amazon.com/lambda/latest/dg/foundation-arch.html). They even mention migrating to arm64. When comparing the [pricing for Lambda](https://aws.amazon.com/lambda/pricing/#aws-element-9ccd9262-b656-4d9c-8a72-34ee6b662135) between x86_64 and arm64, arm64 is approximately 20% cheaper. Also, in the [performance comparison](https://aws.amazon.com/blogs/apn/comparing-aws-lambda-arm-vs-x86-performance-cost-and-analysis-2/), arm64 clearly has the advantage. Here's a quote:

> Lambda functions using the arm64 architecture (AWS Graviton2 processors) achieve significantly better pricing and performance than equivalent functions running on the x86_64 architecture. Consider using arm64 for compute-intensive applications such as high-performance computing, video encoding, and simulation workloads.

Incidentally, when comparing [Fargate pricing](https://aws.amazon.com/fargate/pricing/) between x86_64 and arm64, both CPU and memory are approximately 20% cheaper for arm64.
:::

## (1) Network Construction

Prepare a subnet that meets all the following network requirements to create an AWS Batch environment. You can easily prepare it using the CloudFormation template from my previous article, "[Gently Building a Network with AWS CloudFormation - IPv6 Support, Easy NAT Gateway Setup, and Wallet-Friendly!](/blogs/2024/09/27/aws_cfn_network_ipv6/)".

* Able to connect to S3
    * If connecting to an S3 bucket that is not externally accessible, you need to connect via a private link (prepare a Gateway VPC endpoint and route it)
* Able to connect to the internet via IPv4

## (2) Create an S3 Bucket for Storing Layer Creation Tool Source Code

Since CodeBuild is set to reference the source code from S3, prepare an S3 bucket and folder to store the layer creation tool source code, and store the layer creation tool source code ([Dockerfile](https://github.com/yuji-kurabayashi/publish_lambda_layer/blob/main/python/Dockerfile) and [PublishPythonLambdaLayer.sh](https://github.com/yuji-kurabayashi/publish_lambda_layer/blob/main/python/PublishPythonLambdaLayer.sh)) at the same level. The `requirements.txt` used later is placed in the same location for convenience, but it can be placed in another bucket.
For example, I prepared `s3://publish-lambda-layer-tool-pcjkn63zhk/python/`.
It is desirable to check "Block all public access" when creating the S3 bucket.

|![S3 Bucket for Storing Layer Creation Tool Source Code](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/001.jpg)|
|:--|

## (3) Create an S3 Bucket for Storing Lambda Layers

Prepare an S3 bucket to upload the created Lambda layers.
For example, I prepared `s3://lambda-layer-pcjkn63zhk/`.
It is desirable to check "Block all public access" when creating the S3 bucket.

|![S3 Bucket for Storing Lambda Layers](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/000.jpg)|
|:--|

## (4) Create a CodeBuild Project and ECR Repository

I have prepared a CloudFormation template to create a CodeBuild project and ECR repository. Use this to create the resources.

* <span style="font-size: 120%;"><b>[cfn_codebuild.yaml](https://github.com/yuji-kurabayashi/cloudformation_templates/blob/main/cfn_codebuild.yaml)</b></span>

|![cfn_codebuild Parameter Settings Example](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/022.jpg)|
|:--|

Below is an example of parameter settings for arm64.

| Parameter Name | Value (for arm64) | Comments |
| --- | --- | --- |
| Stack Name | publish-python-lambda-layer-tool-build-project-arm64 | |
| CodeBuildProjectName | publish-python-lambda-layer-tool-arm64 | |
| BuildProjectDescription | (Optional) | |
| BuildEnvironmentOSContainer | ARM_CONTAINER | |
| BuildEnvironmentComputeSpec | BUILD_GENERAL1_SMALL | |
| BuildEnvironmentImage | aws/codebuild/amazonlinux2-aarch64-standard:3.0 | Choose from [here](https://docs.aws.amazon.com/codebuild/latest/userguide/ec2-compute-images.html) for aarch64. |
| SourceLocation | publish-lambda-layer-tool-pcjkn63zhk/python/ | Specify the storage path from "(2) Create an S3 Bucket for Storing Layer Creation Tool Source Code". Remove `s3://`. |
| RepositoryName | publish-python-lambda-layer-tool-arm64 | |

You can also prepare for x86_64. Below is an example of parameter settings.

| Parameter Name | Value (for x86_64) | Comments |
| --- | --- | --- |
| Stack Name | publish-python-lambda-layer-tool-build-project-x86-64 | |
| CodeBuildProjectName | publish-python-lambda-layer-tool-x86-64 | |
| BuildProjectDescription | (Optional) | |
| BuildEnvironmentOSContainer | LINUX_CONTAINER | |
| BuildEnvironmentComputeSpec | BUILD_GENERAL1_SMALL | |
| BuildEnvironmentImage | aws/codebuild/amazonlinux2-x86_64-standard:5.0 | Choose from [here](https://docs.aws.amazon.com/codebuild/latest/userguide/ec2-compute-images.html) for x86_64. |
| SourceLocation | publish-lambda-layer-tool-pcjkn63zhk/python/ | Specify the storage path from "(2) Create an S3 Bucket for Storing Layer Creation Tool Source Code". Remove `s3://`. |
| RepositoryName | publish-python-lambda-layer-tool-x86-64 | |

## (5) Create a Docker Image for the Layer Creation Tool

Execute the build in the created CodeBuild project. The buildspec, which describes the process of creating a Docker image and pushing it to the ECR repository, and the environment variables referenced within the buildspec are already prepared when the project is created with CloudFormation. You can build it by simply setting the environment variables to be set at runtime.

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

Set them in the CodeBuild project's "Edit" -> "Environment" -> "Additional settings" -> "Environment variables". After setting, press "Update project".

|![CodeBuild Project Environment Variables](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/004.jpg)|
|:--|

Below is an example of parameter settings for arm64.

| Environment Variable Name | Value (for arm64) | Comments |
| --- | --- | --- |
| IMAGE_TAG | latest | Tag to be assigned to the Docker image created by CodeBuild. It's also possible to set the same value as the `--build-arg BASE_IMAGE_TAG` in `DOCKER_BUILD_OPTIONS` for identification. |
| DOCKER_BUILD_OPTIONS | --build-arg BASE_IMAGE_TAG=3.12.2024.10.15.10 | Specify the tag,of the base image. Find the desired Python version and OS/ARCH as arm64 from [here](https://hub.docker.com/r/amazon/aws-lambda-python/tags).

Below is an example of parameter settings for x86_64.

| Environment Variable Name | Value (for x86_64) | Comments |
| --- | --- | --- |
| IMAGE_TAG | latest | Tag to be assigned to the Docker image created by CodeBuild. It's also possible to set the same value as the `--build-arg BASE_IMAGE_TAG` in `DOCKER_BUILD_OPTIONS` for identification. |
| DOCKER_BUILD_OPTIONS | --build-arg BASE_IMAGE_TAG=3.12.2024.10.16.13 | Specify the tag of the base image. Find the desired Python version and OS/ARCH as amd64 from [here](https://hub.docker.com/r/amazon/aws-lambda-python/tags).

:::alert:Specify a version-fixed tag for the base image explicitly
If you do not specify `--build-arg BASE_IMAGE_TAG` in `DOCKER_BUILD_OPTIONS`, `latest` will be applied. However, if you build with `latest`, there is a risk that the internal versions used in the base image will suddenly be upgraded one day, which may affect the operation and suddenly cause it to stop working. Therefore, it is generally desirable to explicitly specify a version-fixed tag. Note that in [amazon/aws-lambda-python](https://hub.docker.com/r/amazon/aws-lambda-python/), internal versions may also be upgraded with tags like `3.11` or `3.12`, so be careful.
:::

### Build Execution

Press "Start build".

|![CodeBuild Project Environment Variables](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/003.jpg)|
|:--|

Confirm that it was successful.

|![CodeBuild Build Success](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/005.jpg)|
|:--|

Confirm that the image has been pushed to the ECR repository.

|![ECR Repository](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/006.jpg)|
|:--|

### If the Build Execution Fails

Sometimes, when executing the docker build command, the pull of the base image fails with an error message like "Too Many Requests." If you encounter this, simply retrying the build might succeed. If retries continue to fail, or if you want to ensure stable build success, prepare your own Docker Hub user and set the `DOCKER_USER` and `DOCKER_TOKEN` environment variables in CodeBuild. It is recommended to register these authentication details in Parameter Store or Secrets Manager instead of setting them directly as plain text in environment variables.

#### Parameter Store Example

|![Parameter Store Example](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/019.jpg)|
|:--|

#### Secrets Manager Example

|![Secrets Manager Example](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/020.jpg)|
|:--|

#### CodeBuild Environment Variable Settings Example

* When referring to Parameter Store
    * Set the value to "The name of my parameter" and the type to "Parameter".
        * Example value: `DOCKER_USER`
* When referring to Secrets Manager
    * Set the value to "Secret name:Secret key" and the type to "Secrets Manager".
        * Example value: `MyDockerHubAccount:DOCKER_TOKEN`

|![DockerHub Account Environment Variable Settings Example](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/021.jpg)|
|:--|

:::check:About the cause of docker build failure in CodeBuild
The reason for the failure during the docker build command execution with the error "Too Many Requests." is likely because all CodeBuild users in the current AWS region share the global IP address of CodeBuild in that region, and many users are probably accessing Docker Hub as anonymous users. If you're unlucky with the assigned global IP address of CodeBuild, you might hit the [Anonymous users rate limit](https://docs.docker.com/docker-hub/download-rate-limit/#whats-the-download-rate-limit-on-docker-hub) of "100 pulls per 6 hours per IP address." By setting the environment variables "DOCKER_USER" and "DOCKER_TOKEN" to log in to Docker Hub, the rate limit for Authenticated users of "200 pulls per 6 hour period" will apply, so if you haven't excessively pulled images with that user, it should succeed.

Incidentally, when downloading the AWS IP address range JSON from [here](https://docs.aws.amazon.com/vpc/latest/userguide/aws-ip-ranges.html) and checking, it seems that at the time of writing, there are 8 + 8 = 16 IP addresses secured for CodeBuild in the Tokyo region. This means that each time you build with CodeBuild as an anonymous user, you are essentially trying your luck with up to 16 IP addresses for build success.
:::

## (6) Create an AWS Batch Environment

I have prepared a CloudFormation template to create an AWS Batch environment. Use this to create the resources.

* <span style="font-size: 120%;"><b>[cfn_aws_batch.yaml](https://github.com/yuji-kurabayashi/cloudformation_templates/blob/main/cfn_aws_batch.yaml)</b></span>

|![cfn_aws_batch Parameter Settings Example](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/023.jpg)|
|:--|

Below is an example of parameter settings for arm64.

| Parameter Name | Value (for arm64) | Comments |
| --- | --- | --- |
| Stack Name | publish-python-lambda-layer-tool-aws-batch-arm64 | |
| prefix | publish-python-lambda-layer-tool-arm64 | |
| AwsBatchVpcId | The VPC to which the specified AwsBatchSubnetIds belong | |
| AwsBatchSubnetIds | Subnets where IPv4 is available | Ensure they can connect to the internet. |
| ComputeResourcesType | FARGATE | Currently, AWS Batch does not support Fargate Spot for arm64. |
| AssignPublicIp | (Depending on the network) | If you select a public subnet in AwsBatchSubnetIds, set to ENABLED |
| CpuArchitecture | ARM64 | |
| AwsBatchVCPU | (Optional) | |
| AwsBatchMemory | (Optional) | |
| AllowActions | s3:GetObject,s3:ListBucket,s3:PutObject,lambda:PublishLayerVersion | Required permissions for the layer creation tool. |
| EcrRepositoryName | publish-python-lambda-layer-tool-arm64 | The pushed ECR repository |
| DockerImageTag | latest | The image tag of the pushed ECR repository |

:::check:AWS Batch does not support Fargate Spot for arm64
[Fargate Spot](https://aws.amazon.com/blogs/news/aws-fargate-spot-now-generally-available) can be used at a 70% discount compared to Fargate, although there is a risk of task interruption. Since the layer creation tool can simply be re-executed if a task is interrupted, it is desirable to use it actively. Despite [ECS supporting Fargate Spot for arm64](https://aws.amazon.com/about-aws/whats-new/2024/09/amazon-ecs-graviton-based-spot-compute-fargate/), unfortunately, at the time of writing, [AWS Batch does not support Fargate Spot for arm64](https://docs.aws.amazon.com/batch/latest/APIReference/API_RuntimePlatform.html). When I tried specifying Fargate Spot for arm64 in CloudFormation, resources like the compute environment were created, but the job status remained Runnable indefinitely, seemingly being stopped from execution. It's puzzling since AWS Batch seems to use ECS Fargate internally. Note that it is available for x86_64. Hopefully, it will be supported for arm64 soon.
:::

Below is an example of parameter settings for x86_64.

| Parameter Name | Value (for x86_64) | Comments |
| --- | --- | --- |
| Stack Name | publish-python-lambda-layer-tool-aws-batch-x86-64 | |
| prefix | publish-python-lambda-layer-tool-x86-64 | |
| AwsBatchVpcId | The VPC to which the specified AwsBatchSubnetIds belong | |
| AwsBatchSubnetIds | Subnets where IPv4 is available | Ensure they can connect to the internet. |
| ComputeResourcesType | FARGATE_SPOT | Fargate Spot is available for x86_64. |
| AssignPublicIp | (Depending on the network) | If you select a public subnet in AwsBatchSubnetIds, set to ENABLED |
| CpuArchitecture | X86_64 | |
| AwsBatchVCPU | (Optional) | |
| AwsBatchMemory | (Optional) | |
| AllowActions | s3:GetObject,s3:ListBucket,s3:PutObject,lambda:PublishLayerVersion | Required permissions for the layer creation tool. |
| EcrRepositoryName | publish-python-lambda-layer-tool-x86-64 | The pushed ECR repository |
| DockerImageTag | latest | The image tag of the pushed ECR repository |

## (7) Execute Layer Creation

Create a job in the created AWS Batch environment to create a Lambda layer. In AWS Batch, go to "Jobs" and press the "Submit new job" button.

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

### Container Overrides - Command - Options

Below is an example of the minimum necessary parameter settings for arm64. Overwrite the `CMD [ "" ]` in Dockerfile to set the options for the layer creation shell.

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
| -s | (Required if uploading the layer to S3) | Specify the S3 bucket name for storing layers. Specify the bucket name created in "(3) Create an S3 Bucket for Storing Lambda Layers". Although this option is not mandatory for the shell, uploading to S3 is essentially required when running on AWS Batch, as there is no way to retrieve the created layer zip file. |
| -k | Optional | You can change the S3 key for storing layers (default is "python"). |
| -l | Optional | Specify the license information for the layer. |

For example, I prepared `requirements.txt` in `s3://publish-lambda-layer-tool-pcjkn63zhk/python/`. Its contents are as follows:

```
requests == 2.32.3
httpx == 0.27.2
```

You can also use the "-r" option without preparing a `requirements.txt` file by specifying it directly.

```
[ "-r requests == 2.32.3|httpx == 0.27.2", "-n http_request_lib_test_python_3_12_arm64", "-s lambda-layer-pcjkn63zhk" ]
```

Below is an example of the minimum necessary parameter settings for x86_64.

```
[ "-p s3://publish-lambda-layer-tool-pcjkn63zhk/python/requirements.txt", "-n http_request_lib_test_python_3_12_x86_64", "-s lambda-layer-pcjkn63zhk" ]
```

### Submit the Job

If the status becomes Succeeded, it is successful.

|![Job Success](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/010.jpg)|
|:--|

The layer zip file is stored in S3.

|![S3 Layer Zip](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/011.jpg)|
|:--|

The metadata of the layer zip file in S3 contains various information about the layer.

|![S3 Layer Zip Metadata](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/012.jpg)|
|:--|

It is also registered as a Lambda layer.

|![Lambda Layer](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/013.jpg)|
|:--|

|![Lambda Layer Details](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/014.jpg)|
|:--|

## (8) Try Using the Layer

### Create a Function

Create a function specifying the desired runtime and architecture.

|![Create Function](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/015.jpg)|
|:--|

### Add a Layer

Add the layer to the function.

|![Add Layer](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/016.jpg)|
|:--|

### General Settings - Timeout

The default timeout for Lambda is 3 seconds, so change it to about 1 minute just in case.

### Source Code

Try using the modules (requests, httpx) brought in by the layer. Additionally, use `platform.python_version()` to get the actual running Python version.

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

The HTTP request goes through, and the running Python version is returned, indicating success, so the layer is usable.

|![Lambda Execution Result](/img/blogs/2024/1025_publish_python_lambda_layer_aws_batch/018.jpg)|
|:--|

Since the base image for layer creation (3.12.7) was released shortly before, it seems that the actual Lambda (3.12.5) had not yet caught up. If it doesn't work well when the Python versions differ, try selecting a base image that matches the Python version and recreating the layer.

# Conclusion

Although this was implemented in Python, I believe that by replacing the contents of the layer creation tool (only the Dockerfile and shell), layers for other Lambda-supported languages can also be easily created using this method. Additionally, the CloudFormation templates for the image creation environment CodeBuild and the container execution environment AWS Batch were created to be used generically, not specifically for the layer creation tool. Therefore, you can use them to freely prepare tools and applications in any language.
