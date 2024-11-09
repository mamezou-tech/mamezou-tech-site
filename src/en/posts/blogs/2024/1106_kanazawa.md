---
title: Fargate Tips
author: shigeki-shoji
date: 2024-11-06T00:00:00.000Z
tags:
  - AWS
  - Fargate
  - tips
translate: true

---

Hello, I am [Shoji](https://github.com/edward-mamezou), an AWS Certified Instructor[^1].

On November 2nd, the event "[JAWS-UG Kanazawa Branch × Container Branch Joint Project: Container Study Session While Watching Physical Containers!](https://jawsug-kanazawa.connpass.com/event/325803/)" was held at Kanazawa Port. Kanazawa is a favorite place of mine where I lived for a while during the Y2K problem. Because of that, I applied for this event and had the opportunity to talk about Fargate. In this article, I will explain the content of the slides "A Talk on Training Using Fargate" used during the presentation.

## Pushing Container Images to ECR with GitHub Actions

The flow for pushing container images built with GitHub Actions to ECR is as follows:

1. Clone the GitHub repository code with actions/checkout.
2. Obtain authentication information for AWS using aws-actions/configure-aws-credentials.
3. Log in to ECR using aws-actions/amazon-ecr-login.
4. Use docker/build-push-action to build the container image and push it to ECR.

Actually, for the third step, you can use the latest docker/login-action. By using this, you can be freed from changing the actions depending on where you push the container image (ECR, DockerHub, Azure Container Registry, etc.).

## Points to Note When Pushing Multi-Platform Container Images to ECR

From the perspectives of cost and sustainability, there is an increasing trend to launch applications on AWS using arm64. However, the PCs used for development are often Intel-based. In such cases, it is more convenient if the developer's local PC can pull the Intel image. In this case, use the `docker buildx` command to build images that support multiple platforms and push them to ECR.

When following the principle of least privilege for security, the IAM policy settings obtained from the official AWS documentation will fail to push to ECR.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ecr:CompleteLayerUpload",
                "ecr:UploadLayerPart",
                "ecr:InitiateLayerUpload",
                "ecr:BatchCheckLayerAvailability",
                "ecr:PutImage",
                "ecr:BatchGetImage"
            ],
            "Resource": "arn:aws:ecr:region:111122223333:repository/repository-name"
        },
        {
            "Effect": "Allow",
            "Action": "ecr:GetAuthorizationToken",
            "Resource": "*"
        }
    ]
}
```

For pushing to ECR using the `docker buildx` command, you also need `ecr:GetDownloadUrlForLayer`.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": [
                "ecr:GetDownloadUrlForLayer",
                "ecr:CompleteLayerUpload",
                "ecr:UploadLayerPart",
                "ecr:InitiateLayerUpload",
                "ecr:BatchCheckLayerAvailability",
                "ecr:PutImage",
                "ecr:BatchGetImage"
            ],
            "Resource": "arn:aws:ecr:region:111122223333:repository/repository-name",
            "Effect": "Allow"
        },
        {
            "Effect": "Allow",
            "Action": "ecr:GetAuthorizationToken",
            "Resource": "*"
        }
    ]
}
```

## Running Fargate in a Private Subnet

Finally, here are the necessary PrivateLinks when running Fargate in a Private Subnet.

![](/img/blogs/2024/20241102_fargate.png)

As shown in the diagram, the latest version of Fargate requires the following PrivateLink endpoints:

- `com.amazonaws.<region>.ecr.api`
- `com.amazonaws.<region>.ecr.dkr`
- `com.amazonaws.<region>.ssm`
- `com.amazonaws.<region>.logs`

Additionally, the security group for the endpoints, except for the logs, needs inbound permission for port number 443.

## Conclusion

Before the COVID-19 pandemic, I often visited Kanazawa. Kenrokuen Garden and Kanazawa Castle Ruins have been my favorite places since I first visited them over 25 years ago. If I have another opportunity to present in Kanazawa, I would love to go again. Thank you to the staff of the JAWS-UG Kanazawa Branch, the Container Branch, and all the participants!!

[^1]: [AWS Official Training](https://www.mamezou.com/services/hrd/aws_training)
