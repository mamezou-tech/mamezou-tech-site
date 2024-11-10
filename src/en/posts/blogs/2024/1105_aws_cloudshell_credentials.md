---
title: >-
  AWS Tips - Secret Trick!? Easily Get the Credentials of the Operating User
  with AWS CloudShell!
author: yuji-kurabayashi
date: 2024-11-05T00:00:00.000Z
image: true
tags:
  - AWS
  - CloudShell
  - docker
  - CloudFormation
translate: true

---

# Introduction

[AWS CloudShell](https://docs.aws.amazon.com/ja_jp/cloudshell/latest/userguide/welcome.html) is equipped with features that make it convenient and easy to use as a bastion server for infrastructure work. Additionally, as a handy trick, you can easily obtain the credentials of the operating user, which I will introduce here.

# CloudShell Trick

It's very simple. Just execute the following command in CloudShell.

```shell
curl -s -H "Authorization: $AWS_CONTAINER_AUTHORIZATION_TOKEN" "$AWS_CONTAINER_CREDENTIALS_FULL_URI"
```

Then, you will receive a response like the following:

```json
{
        "Type": "",
        "AccessKeyId": "ASIA...",
        "SecretAccessKey": "K8ZX...",
        "Token": "IQoJ...",
        "Expiration": "2024-10-10T08:44:18Z",
        "Code": "Success"
}
```

`AccessKeyId`, `SecretAccessKey`, and `Token` are the credentials. The expiration time of the credentials `Expiration` is quite short, approximately between 5 and 15 minutes after issuance, so it is best to issue them just before you actually need to use them. Incidentally, the values of each credential seem to change each time the `Expiration` value changes. If the operating user has sufficient permissions for what you want to do, you can proceed using these credentials.

However, if the operating user has powerful permissions, it could result in excessive permissions. If the credentials should be issued with minimal necessary permissions, or if the expiration time of the credentials is too short, use [`aws sts assume-role`](https://awscli.amazonaws.com/v2/documentation/api/latest/reference/sts/assume-role.html) to prepare credentials. However, using this requires the preliminary setup of policies and roles. On the other hand, this trick requires none of these efforts and can be used easily.

:::check:What is contained in the CloudShell environment variables?
When you run the `printenv | grep AWS` command in CloudShell, you will see something like the following:

```shell
AWS_CONTAINER_AUTHORIZATION_TOKEN="0tTw..."
AWS_CONTAINER_CREDENTIALS_FULL_URI="http://localhost:1338/latest/meta-data/container/security-credentials"
AWS_DEFAULT_REGION="ap-northeast-1"
・・・
```

* The setting value of `AWS_CONTAINER_AUTHORIZATION_TOKEN` seems to change each time the CloudShell environment is launched.
* The setting value of `AWS_CONTAINER_CREDENTIALS_FULL_URI` appears to be fixed. The endpoint is local.
* The setting value of `AWS_DEFAULT_REGION` is set to the region where CloudShell is launched.
:::

# Example of Using the CloudShell Trick

For example, when you containerize a tool using the AWS CLI and execute it in a container on CloudShell. In an article I previously wrote, "[Creating AWS Lambda Python Layers with CodeBuild + ECR + AWS Batch](/blogs/2024/10/25/publish_python_lambda_layer_aws_batch/)", there is a description in the "Background of Adopting AWS Batch for Container Execution Environment" - "Trial 2 - CloudShell" section about testing by executing a docker container in CloudShell, and in fact, I used the CloudShell trick during this trial.
When experimenting with creating such a tool, the necessary permissions change as you modify the processing content, and if an error occurs due to permission issues, it becomes difficult to isolate the cause of the problem, hindering smooth verification and becoming inefficient. Using this trick is very convenient because it is extremely easy to use and allows you to use the permissions of the operating user (yourself) for a very short time.

For example, if you execute the following in CloudShell (let's ignore the fact that you could directly execute `aws s3 ls` in CloudShell for this example),

```sh
docker run --rm amazon/aws-cli s3 ls
```

The AWS CLI inside the docker container cannot use the credentials, resulting in an error like the following:

```
Unable to locate credentials. You can configure credentials by running "aws configure".
```

To allow the AWS CLI inside the docker container to use the credentials, you need to set the credentials with specific environment variable names recognized by the AWS CLI.

Therefore, I prepared a shell script "[publish_temporary_credentials.sh](https://github.com/yuji-kurabayashi/publish_temporary_credentials/blob/main/publish_temporary_credentials.sh)".

If you want to use `aws sts assume-role`, set the ARN of the role as the first argument of the shell script.
And, if you want to use `aws sts assume-role`, you need to prepare policies and roles in advance, so I prepared a CloudFormation template "[cfn_assume_role.yaml](https://github.com/yuji-kurabayashi/publish_temporary_credentials/blob/main/cfn_assume_role.yaml)" that can easily create these. By using this template, you can prepare a policy by specifying the actions you want to allow and create a role to issue credentials by combining it with existing policies.

```shell:publish_temporary_credentials.sh
#bin/sh

TEMPORARY_CREDENTIALS=
TEMPORARY_ACCESS_KEY_ID=
TEMPORARY_SECRET_ACCESS_KEY=
TEMPORARY_SESSION_TOKEN=

if [ -n "$1" ]; then
  # specified first arg (regard as use 'sts assume-role arn')
  TEMPORARY_CREDENTIALS=$(aws sts assume-role --role-arn "$1" --role-session-name `date +%Y%m%d%H%M%S`-session)
  TEMPORARY_ACCESS_KEY_ID=$(echo -n "$TEMPORARY_CREDENTIALS" | jq -r .Credentials.AccessKeyId)
  TEMPORARY_SECRET_ACCESS_KEY=$(echo -n "$TEMPORARY_CREDENTIALS" | jq -r .Credentials.SecretAccessKey)
  TEMPORARY_SESSION_TOKEN=$(echo -n "$TEMPORARY_CREDENTIALS" | jq -r .Credentials.SessionToken)
elif [ -n "$AWS_CONTAINER_AUTHORIZATION_TOKEN" ] && [ -n "$AWS_CONTAINER_CREDENTIALS_FULL_URI" ]; then
  # executing on AWS CloudShell
  TEMPORARY_CREDENTIALS=$(curl -s -H "Authorization: $AWS_CONTAINER_AUTHORIZATION_TOKEN" "$AWS_CONTAINER_CREDENTIALS_FULL_URI")
  TEMPORARY_ACCESS_KEY_ID=$(echo -n "$TEMPORARY_CREDENTIALS" | jq -r .AccessKeyId)
  TEMPORARY_SECRET_ACCESS_KEY=$(echo -n "$TEMPORARY_CREDENTIALS" | jq -r .SecretAccessKey)
  TEMPORARY_SESSION_TOKEN=$(echo -n "$TEMPORARY_CREDENTIALS" | jq -r .Token)
fi

echo "$TEMPORARY_CREDENTIALS"
echo ""
echo export AWS_ACCESS_KEY_ID="$TEMPORARY_ACCESS_KEY_ID"
echo export AWS_SECRET_ACCESS_KEY="$TEMPORARY_SECRET_ACCESS_KEY"
echo export AWS_SESSION_TOKEN="$TEMPORARY_SESSION_TOKEN"
echo export AWS_DEFAULT_REGION="$AWS_DEFAULT_REGION"

export TEMPORARY_AWS_ACCESS_KEY_ID="$TEMPORARY_ACCESS_KEY_ID"
export TEMPORARY_AWS_SECRET_ACCESS_KEY="$TEMPORARY_SECRET_ACCESS_KEY"
export TEMPORARY_AWS_SESSION_TOKEN="$TEMPORARY_SESSION_TOKEN"
```

* The reason for outputting in the form of the export command is to make it easy to copy and paste the issued credentials for use in environments other than CloudShell.
* Depending on the command executed with the AWS CLI, you may also need to set the region in addition to the credentials, so it is output and set together.
    * When I actually executed the `aws s3 cp` command inside the docker container, an error occurred stating that the region was not specified.
* The issued credentials are set with the following environment variable names. The reason for not setting them directly to "AWS_ACCESS_KEY_ID" etc. is to avoid affecting the AWS CLI used directly in CloudShell.
    * TEMPORARY_AWS_ACCESS_KEY_ID
    * TEMPORARY_AWS_SECRET_ACCESS_KEY
    * TEMPORARY_AWS_SESSION_TOKEN

After executing the shell as follows, pass the credentials etc. as environment variables in the `docker run` command to execute successfully.
The point when executing the shell is that to actually reflect the environment variables set within the shell processing into the environment, you need to execute it with `source` like `source ./publish_temporary_credentials.sh`.

```shell
chmod +x ./publish_temporary_credentials.sh
source ./publish_temporary_credentials.sh
# for use 'sts assume-role arn'
# source ./publish_temporary_credentials.sh arn:aws:iam::123456789012:role/assume-role-name

docker run --rm \
  -e AWS_ACCESS_KEY_ID="$TEMPORARY_AWS_ACCESS_KEY_ID" \
  -e AWS_SECRET_ACCESS_KEY="$TEMPORARY_AWS_SECRET_ACCESS_KEY" \
  -e AWS_SESSION_TOKEN="$TEMPORARY_AWS_SESSION_TOKEN" \
  -e AWS_DEFAULT_REGION="$AWS_DEFAULT_REGION" \
  amazon/aws-cli s3 ls
```

# Convenient One-liner

For reference, here is a one-liner to output credentials in the form of the export command.

## CloudShell Trick Version

Copy and paste this directly into CloudShell to use.

```shell
curl -s -H "Authorization: $AWS_CONTAINER_AUTHORIZATION_TOKEN" "$AWS_CONTAINER_CREDENTIALS_FULL_URI" \
  | jq -r "[ \"export AWS_ACCESS_KEY_ID=\" + .AccessKeyId, \"export AWS_SECRET_ACCESS_KEY=\" + .SecretAccessKey, \"export AWS_SESSION_TOKEN=\" + .Token ] | .[]" && \
echo export AWS_DEFAULT_REGION="$AWS_DEFAULT_REGION"
```

## aws sts assume-role Version

Use the following after appropriately replacing the part "your_sts_assume_role_ARN".
Also, the command below is output in the stack output created by the aforementioned CloudFormation template [cfn_assume_role.yaml](https://github.com/yuji-kurabayashi/publish_temporary_credentials/blob/main/cfn_assume_role.yaml), so you can copy and paste it directly to use.

```shell
aws sts assume-role --role-arn "your_sts_assume_role_ARN" --role-session-name `date +%Y%m%d%H%M%S`-session \
  | jq -r "[ \"export AWS_ACCESS_KEY_ID=\" + .Credentials.AccessKeyId, \"export AWS_SECRET_ACCESS_KEY=\" + .Credentials.SecretAccessKey, \"export AWS_SESSION_TOKEN=\" + .Credentials.SessionToken ] | .[]" && \
echo export AWS_DEFAULT_REGION="$AWS_DEFAULT_REGION"
```

# Conclusion

The CloudShell trick is handy, but if, for example, the operating user has a role with AdministratorAccess, it becomes credentials with very powerful permissions, so handle with care and consider using `aws sts assume-role` to appropriately restrict permissions.
