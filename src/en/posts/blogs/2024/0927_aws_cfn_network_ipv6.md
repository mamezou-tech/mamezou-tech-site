---
title: >-
  Easy Network Construction with AWS CloudFormation - IPv6 Support and Easy,
  Wallet-Friendly NAT Gateway Setup!
author: yuji-kurabayashi
date: 2024-09-27T00:00:00.000Z
image: true
tags:
  - AWS
  - IaC
  - CloudFormation
  - Network
  - IPv6
  - DualStack
translate: true

---

# Background

When you want to do a bit of technical verification using AWS, you almost always start by preparing a network, including a VPC. Ideally, you want to set up a clean network from a new VPC. VPCs and their surrounding network resources can be easily created from the AWS Management Console. However, cleaning them up afterward is cumbersome. It would be nice if you could just delete the entire VPC, but that's not possible. You have to delete many resources gradually, considering their dependencies (starting from the terminal resources that belong to or reference others), which is troublesome.

Additionally, to connect to the internet via IPv4 from a private subnet, you need a NAT gateway and Elastic IP. These resources incur charges just by existing, regardless of actual use. Manually creating and deleting these resources every time you need internet access is inconvenient. Incidentally, to connect to the internet via IPv6 from a private subnet, you don't need chargeable resources, so using IPv6 can reduce costs.

The ritualistic and tedious task of network construction and cleanup is time-consuming and stressful, so I want to automate it. I also want to use chargeable resources (NAT gateway and Elastic IP) only when internet access is needed and further reduce costs by utilizing IPv6. Therefore, I created a CloudFormation template for VPC network construction as IaC, which I would like to introduce for your reference.

:::check:Role of NAT Gateway and Elastic IP
A [NAT gateway](https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/vpc-nat-gateway.html) is needed for IPv4 local to public address translation from a private subnet to connect to the internet or for IPv6 to IPv4 address translation (NAT64) to connect from an IPv6-only subnet to an IPv4-only environment. An [Elastic IP](https://docs.aws.amazon.com/ja_jp/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html) is a public IPv4 address associated with the NAT gateway for address translation.
:::

:::check:NAT Gateway and Elastic IP Usage Charges
Regarding [usage charges](https://aws.amazon.com/jp/vpc/pricing/), in the Tokyo region, a NAT gateway costs 0.062 USD/hour just by existing, and data transfer costs 0.062 USD/GB. From February 1, 2024, the [Elastic IP pricing structure will change](https://aws.amazon.com/jp/blogs/news/new-aws-public-ipv4-address-charge-public-ip-insights/), and it will be charged 0.005 USD/hour just by existing. If you accidentally leave these created for a month (720 hours), the NAT gateway will cost 44.64 USD, and the Elastic IP will cost 3.6 USD, totaling 48.24 USD. Assuming 1 USD = 150 yen, this amounts to 7,236 yen. It would be shocking to be billed this amount for personal use without actually using it. If you have prepared for 3 AZs, it triples (21,708 yen... scary).
:::

:::check:AWS Services IPv6 Support Status
IPv6 was discussed at AWS Summit 2024 in "IPv6 on AWS - What You Can and Can't Do to Reduce Public IPv4 Addresses" ([video](https://www.youtube.com/watch?v=SX54RPOVp2g) and [materials](https://pages.awscloud.com/rs/112-TZM-766/images/AWS-20_Network_AWS_Summit_JP_2024.pdf)), which I referred to when creating CloudFormation. The IPv6 support status is summarized in [AWS Services That Support IPv6](https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/aws-ipv6-support.html). Only the services listed here support IPv6, and conversely, services not listed do not support IPv6.
:::

:::check:About AWS CloudFormation
[CloudFormation](https://docs.aws.amazon.com/ja_jp/AWSCloudFormation/latest/UserGuide/Welcome.html) is convenient and easy to use without any preparation, which I like. You can prepare a CloudFormation template with just a text editor. Once you have a template, not only you but others can easily use it, create resources quickly and reproducibly without mistakes, and cleanup is straightforward. When I first used CloudFormation a few years ago, there was a limit of 60 template parameters, which was a hurdle, but now you can specify up to 200, and various [limits](https://docs.aws.amazon.com/ja_jp/AWSCloudFormation/latest/UserGuide/cloudformation-limits.html) have been relaxed, and [features enhanced](https://speakerdeck.com/konokenj/iac-updates-2024-05?slide=22). In 2024, an [IaC generator](https://docs.aws.amazon.com/ja_jp/AWSCloudFormation/latest/UserGuide/generate-IaC.html) was provided, allowing you to output CloudFormation templates from existing resources. This feature allows you to experiment with resources manually in the AWS Management Console, output the CloudFormation template with the IaC generator, organize it for ease of use, and use it, which is convenient.
:::

# Overview of the Network Construction CloudFormation Template

Let's explain the CloudFormation template I created.

## Network Construction CloudFormation Template YAML File

<span style="font-size: 150%;"><b>[cfn_network.yaml](https://github.com/yuji-kurabayashi/cloudformation_templates/blob/main/cfn_network.yaml)</b></span>

The concept I aimed for when creating the CloudFormation template is as follows:

1. Create resources equivalent to when creating a VPC through AWS Management Console operations.
2. Support not only IPv4 but also IPv6.
3. Easily switch the creation and deletion of chargeable resources (NAT gateway and Elastic IP).

## Infrastructure Diagram

This is the infrastructure diagram that can be prepared using the created CloudFormation template.

![Network Diagram](/img/blogs/2024/0927_aws_cfn_network_ipv6/cfn_network.jpg)

There are two public subnets per AZ, but there is a reason for this. I intended to provide NAT64 functionality for IPv6-only subnets and tried to set up a NAT gateway in the IPv6-only subnet, but I realized during verification that it couldn't be set up. It makes sense upon reflection, but since a NAT gateway translates to IPv4, it can only be set up in subnets where IPv4 is available (IPv4-only or DualStack). Therefore, I thought that by preparing a public subnet for NAT gateway installation and another public subnet without a NAT gateway, there would be no protocol stack restrictions.

:::column:Drawing Tool for Diagrams
Until now, when drawing AWS infrastructure diagrams, I would find icons from the [AWS Architecture Icons](https://aws.amazon.com/jp/architecture/icons/) PowerPoint and copy & paste them onto Excel graph paper, switching back and forth between the two files with Alt + Tab. This time, I used [draw.io](https://www.drawio.com/) for the first time, and it was comfortable being free from the back-and-forth.
:::

## Route Tables and Routing Details

Route tables are created for each subnet, and routing is set as follows. Routes targeting the NAT gateway are created when the NAT gateway creation setting is enabled and deleted when disabled.

### Public Subnet for NAT Gateway Installation

| Destination | Target | Purpose | Route Installation Condition by CFn Setting |
| --- | --- | --- | --- |
| 0.0.0.0/0 | Internet Gateway | Internet Connection (IPv4) | None (Always) |
| ::/0 | Internet Gateway | Internet Connection (IPv6) | When IPv6 is enabled |
| AWS-owned S3 Managed Prefix List | VPC Endpoint | S3 Connection | When enabled |
| AWS-owned DynamoDB Managed Prefix List | VPC Endpoint | DynamoDB Connection | When enabled |
| CFn-created VPC CIDR (IPv4) | local | Local Connection within VPC (IPv4) | None (Forced by AWS) |
| CFn-created VPC CIDR (IPv6) | local | Local Connection within VPC (IPv6) | None (Forced by AWS) |

### Public Subnet

| Destination | Target | Purpose | Route Installation Condition by CFn Setting |
| --- | --- | --- | --- |
| 0.0.0.0/0 | Internet Gateway | Internet Connection (IPv4) | When the subnet is not IPv6-only |
| ::/0 | Internet Gateway | Internet Connection (IPv6) | When the subnet is not IPv4-only |
| 64:ff9b::/96 | NAT Gateway | NAT64 | When the subnet is IPv6-only and the NAT gateway is enabled |
| AWS-owned S3 Managed Prefix List | VPC Endpoint | S3 Connection | When enabled |
| AWS-owned DynamoDB Managed Prefix List | VPC Endpoint | DynamoDB Connection | When enabled |
| CFn-created VPC CIDR (IPv4) | local | Local Connection within VPC (IPv4) | None (Forced by AWS) |
| CFn-created VPC CIDR (IPv6) | local | Local Connection within VPC (IPv6) | None (Forced by AWS) |

### Private Subnet

| Destination | Target | Purpose | Route Installation Condition by CFn Setting |
| --- | --- | --- | --- |
| 0.0.0.0/0 | NAT Gateway | Internet Connection (IPv4) | When the subnet is not IPv6-only and the NAT gateway is enabled |
| ::/0 | Egress-Only Internet Gateway | Internet Connection (IPv6) | When the subnet is not IPv4-only |
| 64:ff9b::/96 | NAT Gateway | NAT64 | When the subnet is IPv6-only and the NAT gateway is enabled |
| AWS-owned S3 Managed Prefix List | VPC Endpoint | S3 Connection | When enabled |
| AWS-owned DynamoDB Managed Prefix List | VPC Endpoint | DynamoDB Connection | When enabled |
| CFn-created VPC CIDR (IPv4) | local | Local Connection within VPC (IPv4) | None (Forced by AWS) |
| CFn-created VPC CIDR (IPv6) | local | Local Connection within VPC (IPv6) | None (Forced by AWS) |

## Features and Precautions of the Network Construction CloudFormation Template

Here are the features and precautions when using the created CloudFormation template, explained in order of appearance in the template. Detailed explanations are provided in the CloudFormation template. The explanations are all in English, not because of internationalization intentions, but because multibyte characters get garbled in CloudFormation templates, so they are in English (albeit poor).

:::column:Translation Tool
I was greatly helped by [DeepL Translator](https://www.deepl.com/ja/translator).
:::

### Switching Use of Chargeable Resources (NAT Gateway and Elastic IP)

|![Enable NAT Gateway](/img/blogs/2024/0927_aws_cfn_network_ipv6/cfn_enable_natgw.jpg)|
|:--|

**You can switch the creation (deletion) and routing (removal) of chargeable resources (NAT gateway and Elastic IP) with just one setting.**

When you create a NAT gateway and Elastic IP, if it's an IPv6-only subnet, DNS64 is automatically enabled for the subnet, and NAT64 routing for the NAT gateway is prepared. Also, if it's a private subnet that is not IPv6-only, NAT gateway routing is automatically prepared for internet connection from the private subnet.

### Enabling IPv6

|![Enable IPv6](/img/blogs/2024/0927_aws_cfn_network_ipv6/cfn_enable_ipv6.jpg)|
|:--|

Set whether to enable IPv6 for the entire VPC network to be constructed.
**Decide and specify whether to enable IPv6 when creating the CloudFormation stack. It cannot be changed after creation.**

This is a constraint due to the implementation of the CloudFormation template. Subnet creation is conditionally delayed until the association of the VPC and IPv6 CIDR block is completed. If the association is not completed, referencing the IPv6 CIDR block from the VPC when assigning it to a subnet will result in an error. To avoid this error, conditional waiting is implemented in the template using [AWS::CloudFormation::WaitConditionHandle](https://docs.aws.amazon.com/ja_jp/AWSCloudFormation/latest/UserGuide/aws-resource-cloudformation-waitconditionhandle.html) and [AWS::CloudFormation::WaitCondition](https://docs.aws.amazon.com/ja_jp/AWSCloudFormation/latest/UserGuide/aws-resource-cloudformation-waitcondition.html), but these resources do not support stack updates, so they must be finalized at stack creation.

```yaml
  VPC:
    Type: AWS::EC2::VPC
    ・・・省略・・・

  VPCIpv6CidrBlock:
    Type: AWS::EC2::VPCCidrBlock
    Condition: EnableIpv6CidrBlock
    Properties:
      AmazonProvidedIpv6CidrBlock: true
      VpcId: !Ref VPC

  NoWaitHandle:
    Type: AWS::CloudFormation::WaitConditionHandle

# AWS::CloudFormation::WaitConditionHandle Updates aren't supported for this resource. see https://docs.aws.amazon.com/ja_jp/AWSCloudFormation/latest/UserGuide/aws-resource-cloudformation-waitconditionhandle.html
  VPCIpv6CidrBlockWaitHandle:
    Condition: EnableIpv6CidrBlock
    DependsOn: VPCIpv6CidrBlock
    Type: AWS::CloudFormation::WaitConditionHandle

# AWS::CloudFormation::WaitCondition Updates aren't supported. see https://docs.aws.amazon.com/ja_jp/AWSCloudFormation/latest/UserGuide/aws-resource-cloudformation-waitcondition.html
  EnableIpv6CidrBlockWaitCondition:
    Type: AWS::CloudFormation::WaitCondition
    Properties:
      Handle: !If [ EnableIpv6CidrBlock, !Ref VPCIpv6CidrBlockWaitHandle, !Ref NoWaitHandle ]
      Timeout: 1
      Count: 0

  PublicSubnet1:
    Type: AWS::EC2::Subnet
    Condition: CreateSubnet1
    DependsOn: EnableIpv6CidrBlockWaitCondition
    Properties:
      VpcId: !Ref VPC
      Ipv6CidrBlock:
        Fn::If:
          - PublicSubnet1Ipv4Only
          - !Ref AWS::NoValue
          - !Select [ 3, !Cidr [ !Select [ 0, !GetAtt VPC.Ipv6CidrBlocks ], 9, 64 ] ]
    ・・・省略・・・
```

### VPC

|![VPC](/img/blogs/2024/0927_aws_cfn_network_ipv6/cfn_vpc.jpg)|
|:--|

#### IPAddressPrefix

This is the front part of the IP address for the VPC CIDR. **This value also applies to each subnet to be created.** If you want to set up a new VPC, create a separate CloudFormation stack and specify a different value that is not used by other VPCs here. For example, if you have already created a VPC with an IP address CIDR block starting with 10.0, you can set it to 10.1, 10.2, 172.16, or 192.168 to create a new VPC.

### Subnet Availability Zone

|![Subnet AZ](/img/blogs/2024/0927_aws_cfn_network_ipv6/cfn_subnet.jpg)|
|:--|

You can create subnets for up to 3 AZs. For each AZ, create one public subnet for NAT gateway installation, one public subnet, and one private subnet, and if the NAT gateway is enabled, create a set of NAT gateway and Elastic IP. If availability is not a critical factor for verification, creating only one AZ can reduce costs when the NAT gateway is enabled.

### Gateway Type VPC Endpoint

|![VPC Endpoint](/img/blogs/2024/0927_aws_cfn_network_ipv6/cfn_vpc_endpoint.jpg)|
|:--|

Enabling this setting allows access to S3 and DynamoDB without going through the internet. Prepare access routes for [Gateway Type VPC Endpoints](https://docs.aws.amazon.com/ja_jp/vpc/latest/privatelink/gateway-endpoints.html) for all created subnets.

:::check:Recommendation for Gateway Type VPC Endpoint
For public subnets, access is possible via the internet gateway without preparing a VPC endpoint, so it may not be necessary, but I intentionally prepared it. When creating an S3 bucket, the "Block all public access" setting is selected by default. This seems to be due to a policy that S3 buckets should not be unnecessarily exposed to the outside. If this setting is enabled, access via the internet is not possible even for public subnets, so I intentionally prepared it. Incidentally, when creating a VPC from the AWS Management Console, you can also create an S3 VPC endpoint, but this only prepares routes for private subnets.
Also, while Interface Type VPC Endpoints incur charges just by existing, Gateway Type VPC Endpoints are free. By using Gateway Type VPC Endpoints, you can communicate securely and quickly without going through the internet for free, so I want to use them actively. Since there are only Gateway Type VPC Endpoints for S3 and DynamoDB, I prepared DynamoDB as well. At the time of writing this article, S3 supports IPv6, but DynamoDB does not.
:::

### Prefix List

|![Prefix List](/img/blogs/2024/0927_aws_cfn_network_ipv6/cfn_prefixlist.jpg)|
|:--|

Enabling this setting creates both IPv4 and IPv6 [prefix lists](https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/working-with-managed-prefix-lists.html) for each of the following CIDRs. Items marked with (AZ) create lists grouped by AZ (a list of AZ1 & AZ2 & AZ3) and individual lists for each AZ (a list only for AZ1, only for AZ2, only for AZ3). Lists for AZs not specified for creation are not included. Empty lists are created for individual AZs not specified for creation.

* VPC
* (AZ) Public Elastic IP associated with NAT Gateway (empty list when NAT Gateway is disabled)
* (AZ) Public Subnet for NAT Gateway Installation
* (AZ) Public Subnet
* (AZ) Private Subnet

:::check:Recommendation for Prefix List
For example, a common case in security group rule settings is wanting to allow access from within the VPC or from subnets across 3 AZs. Are you copying and pasting the CIDR values for the VPC or subnets across 3 AZs and setting them manually? It's scary if the explanation is insufficient when setting rules, and you don't know what the manually entered CIDR represents. If you don't know, you can't change,it carelessly. Also, if you change the CIDR allocation, you have to modify all manually entered CIDR values without missing any.

Therefore, prepare your own prefix list to manage CIDR values and reference them by prefix list ID in each security group. By using a prefix list, you only need to judge what to use by looking at the explanation, and you don't need to investigate the actual accurate CIDR values and copy & paste them. Prefix lists can have physical names and tags, and if you write detailed explanations, you don't need to write explanations for each rule in the security group that references them. Moreover, links are created for prefix lists set in rules, so you can quickly check details. If you change the CIDR allocation, you only need to modify the CIDR values in the prefix list, reflecting changes without affecting the security groups that reference them. I think using prefix lists has only advantages.

### Subnet Details

Here, we present Public Subnet 1 as a representative example.

|![Subnet Details](/img/blogs/2024/0927_aws_cfn_network_ipv6/cfn_subnet_detail.jpg)|
|:--|

#### IPAddressSuffix, CIDR

Set the latter part of the IP address and range for the CIDR assigned to each subnet within the VPC CIDR range. It doesn't quite make sense, but depending on the settings here, you might get an error stating that the CIDR range conflicts with another subnet even if it doesn't. In my experience, it tends to work better if you align the CIDR sizes. (Incidentally, the default values unify all nine subnets' CIDRs to 20.)

Example error message:

```
Resource handler returned message: "The CIDR '10.0.48.0/18' conflicts with another subnet (Service: Ec2, Status Code: 400, Request ID: 7a6b3e27-785e-4bfb-b3c2-f65fe5fb9f4b)" (RequestToken: ed254eda-4a4a-b990-97bd-222529064425, HandlerErrorCode: AlreadyExists)
```

#### InternetProtocolStack

Each subnet's protocol stack can be created as "IPv4Only," "DualStack," or "IPv6Only." If IPv6 is not enabled, it is forcibly treated as "IPv4Only." The protocol stack for the public subnet for NAT gateway installation is automatically determined as DualStack if IPv6 is enabled and IPv4Only if not, so it cannot be directly specified. There are the following precautions regarding IPv6Only:

**It is strongly recommended to decide whether to make the protocol stack IPv6Only at the time of subnet creation and not to change it after creation.**

This is because changing the protocol stack from or to IPv6Only after subnet creation is impossible. There was no method found to change it after creation through AWS Management Console operations. If you must change it, it involves the significant impact of recreating the subnet. In CloudFormation, if recreation is necessary, it is treated as resource replacement (new creation & deletion). Since the subnet ID changes upon recreation, it may affect resources referencing the pre-replacement subnet, and what happens to resources created on the pre-replacement subnet is not guaranteed. Below are the precautions when changing:

* Changing from IPv4Only to DualStack or from DualStack to IPv4Only is possible, and no subnet recreation occurs.
* Changing from IPv4Only to IPv6Only or from IPv6Only to IPv4Only is possible, but since it involves changes related to IPv6Only, subnet recreation occurs.
* Changing from IPv6Only to DualStack or from DualStack to IPv6Only results in an error. This is due to the implementation of the CloudFormation template (assignment of IPv6CIDR). If you want to change, you can change it after first changing it to IPv4Only. However, since it involves changes related to IPv6Only, subnet recreation occurs.

# Network Construction and Connectivity Verification

Let's construct the network using the [Network Construction CloudFormation Template](#%E3%83%8D%E3%83%83%E3%83%88%E3%83%AF%E3%83%BC%E3%82%AF%E6%A7%8B%E7%AF%89cloudformation%E3%83%86%E3%83%B3%E3%83%97%E3%83%AC%E3%83%BC%E3%83%88yaml%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB) and verify connectivity.

## Verification Points

Check whether each public and private subnet with DualStack, IPv4Only, and IPv6Only can connect to the internet in DualStack, IPv4Only, and IPv6Only environments, respectively. Verify this both when the NAT gateway is not installed and when it is installed. Expect the following changes before and after NAT gateway installation:

* IPv4 connection from a private subnet should become possible with local address translation functioning.
* Connection from an IPv6Only subnet to IPv4Only should become possible with NAT64 functioning.

## Network Construction CloudFormation Template Settings

Create a stack using the network construction CloudFormation template. The key points of the parameter settings are as follows. Use the three AZs for IPv4Only, DualStack, and IPv6Only, respectively, and conduct verification all at once.

1. Switching Use of Chargeable Resources (NAT Gateway and Elastic IP)
    * <Charged> Enable NAT Gateway and Elastic IP
        * enabled: **Setting to true when creating or updating the stack incurs charges. Please be careful.** Set true when installing the NAT gateway, and false when not. After verifying with NAT gateway installation, promptly set this to false to reduce costs.
1. Enabling IPv6
    * Enable IPv6
        * enabled: true
1. VPC
    * VPC Settings
        * IPAddressPrefix: Set something that does not overlap with existing VPCs.
1. Subnet Availability Zone
    * Subnet 1 Settings
        * Create: true
    * Subnet 2 Settings
        * Create: true
    * Subnet 3 Settings
        * Create: true
1. Gateway Type VPC Endpoint
    * Gateway Type VPC Endpoint Settings
        * CreateS3: true
1. Subnet Details
    * Public Subnet 1 Settings
        * InternetProtocolStack: IPv4Only
    * Private Subnet 1 Settings
        * InternetProtocolStack: IPv4Only
    * Public Subnet 2 Settings
        * InternetProtocolStack: DualStack
    * Private Subnet 2 Settings
        * InternetProtocolStack: DualStack
    * Public Subnet 3 Settings
        * InternetProtocolStack: IPv6Only
    * Private Subnet 3 Settings
        * InternetProtocolStack: IPv6Only

:::alert:Retry Stack Creation in These Cases
When IPv6 is enabled, occasionally, resource creation for the VPC IPv6CIDR prefix list or each subnet fails with an unclear error message `Template error: Fn::Select cannot select nonexistent value at index 0`, causing stack creation to fail. In such cases, delete the failed stack and create a new one. This message appears due to an error in referencing the IPv6CIDR block `!Select [ 0, !GetAtt VPC.Ipv6CidrBlocks ]`. Conditional waiting is used to delay subnet creation until the association of the IPv6CIDR block with the VPC is completed. Although the stack creation event order in CloudFormation shows that subnet creation starts after the association is complete, sometimes it seems to attempt numbering before the association is complete, resulting in an error.
:::

## Verification Method

Set up EC2 instances in each subnet for connectivity verification. The reason for using EC2 is that at the time of writing, among [AWS services that support IPv6](https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/aws-ipv6-support.html), only a few AWS services support IPv6Only, and EC2 is almost the only option for computing resources.

Set the following script in the UserData of the EC2 instance for verification. UserData is executed when the EC2 instance is first launched. The following script is excerpted from the EC2 instance resource's UserData in the [Network Construction Connectivity Verification CloudFormation Template YAML File](#%E3%83%8D%E3%83%83%E3%83%88%E3%83%AF%E3%83%BC%E3%82%AF%E6%A7%8B%E7%AF%89%E7%96%8E%E9%80%9A%E7%A2%BA%E8%AA%8D%E7%94%A8cloudformation%E3%83%86%E3%83%B3%E3%83%97%E3%83%AC%E3%83%BC%E3%83%88yaml%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB), and `${EnableNatGateway}`, `${EC2NetworkConnectionTestResultS3Bucket}`, `${SubnetKey}`, `${ProtocolStack}` are replaced with references within CloudFormation.

```bash
#!/bin/bash
yum update -y
dualstack=$(curl -s -m 10 -o /dev/null --write-out "%{http_code}" 'https://www.google.com' 2>&1)
if [ "$dualstack" = "200" ]; then
    echo -n "OK" > dualstack.txt
else
    echo -n "" > dualstack.txt
fi
ipv4Only=$(curl -s -m 10 -o /dev/null --write-out "%{http_code}" 'https://ipv4.google.com' 2>&1)
if [ "$ipv4Only" = "200" ]; then
    echo -n "OK" > ipv4Only.txt
else
    echo -n "" > ipv4Only.txt
fi
ipv6Only=$(curl -s -m 10 -o /dev/null --write-out "%{http_code}" 'https://ipv6.google.com' 2>&1)
if [ "$ipv6Only" = "200" ]; then
    echo -n "OK" > ipv6Only.txt
else
    echo -n "" > ipv6Only.txt
fi
aws configure set default.s3.use_dualstack_endpoint true
aws configure set default.s3.addressing_style virtual
EnableNatGateway="${EnableNatGateway}"
NatGateway="disabledNATGW"
if [ "$EnableNatGateway" = "true" ]; then
    NatGateway="enabledNATGW"
fi
S3UrlPrefix=s3://"${EC2NetworkConnectionTestResultS3Bucket}"/"${SubnetKey}"_"${ProtocolStack}"_"$NatGateway"_
aws s3 cp dualstack.txt "$S3UrlPrefix"dualstack.txt
aws s3 cp ipv4Only.txt "$S3UrlPrefix"ipv4Only.txt
aws s3 cp ipv6Only.txt "$S3UrlPrefix"ipv6Only.txt
```

### Script Content

1. Connect to the internet in DualStack, IPv4Only, and IPv6Only environments, creating a text file with "OK" if successful and an empty file if unsuccessful.
    * DualStack: [https://www.google.com](https://www.google.com)
    * IPv4Only: [https://ipv4.google.com](https://ipv4.google.com)
    * IPv6Only: [https://ipv6.google.com](https://ipv6.google.com)
1. Configure AWS CLI settings to connect to S3 even in IPv6Only environments. ([See below](#%E5%95%8F%E9%A1%8C%E7%82%B9%E3%81%9D%E3%81%AE%EF%BC%92-s3%E3%81%AB%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB%E3%81%8C%E3%82%A2%E3%83%83%E3%83%97%E3%83%AD%E3%83%BC%E3%83%89%E3%81%95%E3%82%8C%E3%81%AA%E3%81%8B%E3%81%A3%E3%81%9F))
1. Upload each text file with the connection results to S3.

This setup allows you to see all results at a glance by displaying the list of objects in the S3 bucket and checking the file names and sizes. If the size is 2 bytes, the connection was successful; if 0 bytes, it failed. While it seems you could write the curl status code directly to a text file and upload it, curl returns "200" on success and "000" on failure, making both file sizes 3 bytes, requiring you to check the contents to know the result, which is inconvenient. Therefore, I intentionally added judgment processing to make the result clear from the file size alone. Uploading text files to S3 also serves as a confirmation of connection to S3 via the Gateway Type VPC Endpoint. This way, you can automatically gather verification results in S3 without connecting to the EC2 instance at all, quickly confirm results, and complete verification, reducing costs incurred by EC2 instance runtime and NAT gateway installation time.

### Network Construction Connectivity Verification CloudFormation Template YAML File

<span style="font-size: 150%;"><b>[cfn_network_test.yaml](https://github.com/yuji-kurabayashi/cloudformation_templates/blob/main/cfn_network_test.yaml)</b></span>

Since I want to complete the verification work quickly, I prepared a CloudFormation template.

To confirm that you can connect to S3 using the VPC endpoint prepared during network construction, a result storage S3 bucket is created with all public access prohibited.

```yaml
  EC2NetworkConnectionTestResultS3Bucket:
    Type: AWS::S3::Bucket
    DeletionPolicy: Retain
    Properties:
      AccessControl: Private
      PublicAccessBlockConfiguration:
        BlockPublicAcls: True
        BlockPublicPolicy: True
        IgnorePublicAcls: True
        RestrictPublicBuckets: True
```

Using [Fn::ForEach](https://docs.aws.amazon.com/ja_jp/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-foreach.html), create and launch EC2 instances in each subnet all at once. Note that EC2 instances need the result storage S3 bucket to be prepared before uploading the connection result files, so they are set to wait until the result storage S3 bucket creation is complete, just in case.

```yaml
  Fn::ForEach::EC2Instances:
    - SubnetKey
    - !Ref TestTargetSubnetKeys
    - EC2Instance${SubnetKey}:
        Type: AWS::EC2::Instance
        DependsOn: EC2NetworkConnectionTestResultS3Bucket
        Properties:
          ImageId: !Ref EC2ImageId
          InstanceType: !Ref EC2InstanceType
          NetworkInterfaces:
            - DeviceIndex: 0
              SubnetId:
                Fn::ImportValue: !Sub ${ReferenceNetworkStackName}-${SubnetKey}Id
  ・・・省略・・・
```

### Network Construction Connectivity Verification CloudFormation Template Settings

**Creating a stack will launch EC2 instances, which incurs charges. Please be careful. Delete the stack promptly after verification.**

The network construction connectivity verification CloudFormation template references the output of the stack created by the network construction CloudFormation template using [Fn::ImportValue](https://docs.aws.amazon.com/ja_jp/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-importvalue.html). Simply input the stack name to reference the output in ReferenceNetworkStackName and create the stack. Once the stack is created, wait until all EC2 instances are launched (18 files uploaded for 6 subnets × 3 connections). (Occasionally, EC2 instance launches may fail, but in such cases, recreate the stack.) Just creating the stack will result in verification results, and by the time the entire stack creation is complete, all results should be gathered in the S3 bucket.

|![Verification Template Parameter Settings Screen](/img/blogs/2024/0927_aws_cfn_network_ipv6/cfn_network_test_parameter.jpg)|
|:--|

There are confirmations during stack creation, but check all of them and create the stack.

![Verification Template Confirmation Screen](/img/blogs/2024/0927_aws_cfn_network_ipv6/cfn_create_stack_confirm.jpg)

## Issues Encountered During Verification

During verification, issues were encountered in IPv6Only environments, which are summarized here.

### Issue 1: Failed to Create EC2 Instance

Initially, I was verifying with the instance type set to t2.micro. While EC2 instances could be created on IPv4Only and DualStack subnets, they failed on IPv6Only subnets with the message `IPv6 addresses are not supported on t2.micro`. It was necessary to specify an instance type that supports IPv6Only.

According to [this](https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/aws-ipv6-support.html),

> Amazon EC2 supports launching instances in IPv6-only subnets based on the Nitro system.

Furthermore, according to [this](https://aws.amazon.com/en/blogs/networking-and-content-delivery/introducing-ipv6-only-subnets-and-ec2-instances/),

> Select an AMI and a Nitro instance type (for example, t3.micro)

So, I set the instance type to t3.micro, and the EC2 instance creation succeeded.

### Issue 2: Files Were Not Uploaded to S3

After resolving Issue 1, the EC2 instance on the IPv6Only subnet was successfully launched, but the text files were not uploaded. Special settings are required to access S3 from an IPv6Only environment using dual-stack endpoints. The commands in the UserData might have seemed unfamiliar, but these are the settings needed to connect to S3 with CLI from an IPv6Only environment. ([Reference](https://docs.aws.amazon.com/ja_jp/AmazonS3/latest/userguide/dual-stack-endpoints.html))

```bash
aws configure set default.s3.use_dualstack_endpoint true
aws configure set default.s3.addressing_style virtual
```

## Verification Results

You can see the results just by opening the links in the CloudFormation stack output. The S3 bucket remains even after the stack is deleted, so empty the bucket and delete it after checking the results.

|![Verification Results Link](/img/blogs/2024/0927_aws_cfn_network_ipv6/cfn_network_test_link.jpg)|
|:--|

### Without NAT Gateway Installation

A size of 2.0 B indicates successful internet connection, while 0 B indicates failure. Text files with results were uploaded from EC2 in all subnets to the S3 bucket without omission. This confirms that S3 access is possible from any subnet. Also, if the destination supports IPv6, even from private, internet connection is possible without a NAT gateway, suggesting cost savings by using IPv6.

|![Verification Results Without NATGW](/img/blogs/2024/0927_aws_cfn_network_ipv6/cfn_network_test_result_disable_natgw.jpg)|
|:--|

| Source,| Source Subnet | Source Protocol Stack | Destination IPv4Only | Destination DualStack | Destination IPv6Only | Comments |
| --- | --- | --- | --- | --- | --- |
| PublicSubnet1 | IPv4Only | OK | OK | NG | IPv4 can connect via internet gateway |
| PublicSubnet2 | DualStack | OK | OK | OK | IPv6 can also connect via internet gateway |
| PublicSubnet3 | IPv6Only | NG | OK | OK | Same as above |
| PrivateSubnet1 | IPv4Only | NG | NG | NG | IPv4 cannot connect from private at all |
| PrivateSubnet2 | DualStack | NG | OK | OK | IPv6 can connect via Egress-Only internet gateway |
| PrivateSubnet3 | IPv6Only | NG | OK | OK | Same as above |

### With NAT Gateway Installation

All connections succeeded except for the connection from IPv4Only to IPv6Only. This confirms that the NAT gateway installation toggle is functioning properly.

|![Verification Results With NATGW](/img/blogs/2024/0927_aws_cfn_network_ipv6/cfn_network_test_result_enable_natgw.jpg)|
|:--|

| Source Subnet | Source Protocol Stack | Destination IPv4Only | Destination DualStack | Destination IPv6Only | Comments |
| --- | --- | --- | --- | --- | --- |
| PublicSubnet1 | IPv4Only | OK | OK | NG ||
| PublicSubnet2 | DualStack | OK | OK | OK ||
| PublicSubnet3 | IPv6Only | NG→OK | OK | OK | NAT64 allows connection to IPv4 |
| PrivateSubnet1 | IPv4Only | NG→OK | NG→OK | NG | Local address translation allows connection |
| PrivateSubnet2 | DualStack | NG→OK | OK | OK | Same as above |
| PrivateSubnet3 | IPv6Only | NG→OK | OK | OK | NAT64 allows connection to IPv4 |

## Summary of IPv6Only

Finally, I will summarize what I learned about IPv6Only through verification and information gathering for this article.

1. The IPv6Only setting of a subnet cannot be changed after creation, so it must be decided at creation.
2. (Obviously,) resources like NAT gateways that assume IPv4 usage cannot be created in IPv6Only.
3. To communicate from IPv6Only to IPv4Only, a NAT gateway for NAT64 is required, incurring costs.
4. Few AWS services are available for IPv6Only.
5. EC2 can be used with IPv6Only, but it must be an EC2 instance type that supports IPv6Only (e.g., t3.micro based on the Nitro system).
6. Special settings are required to access S3 with AWS CLI in IPv6Only environments using dual-stack endpoints.

Even with just a little verification, there were various stumbling points with IPv6Only, but there were no particular issues with DualStack. Therefore, if considering IPv6 support, using DualStack seems practical. However, it requires network settings considering both IPv4 and IPv6, so it needs to be done with the understanding that it will take more effort than IPv4Only.

# In Conclusion

Before joining Mamezou, I was solely involved in web application development and, embarrassingly, had no infrastructure experience or knowledge of networks or the cloud. When I joined Mamezou, I was at a level where I wondered why everyone wanted to shop on Amazon so much. After joining, I was encouraged to catch up with the cloud, so I participated in a project using AWS. Subsequently, AWS was used in every project I participated in.

Reflecting on the projects I've been involved in, network-related tasks were often handled by dedicated infrastructure experts because they are crucial infrastructure within the infrastructure. When participating in projects as a developer, developers were often restricted from accessing network-related or billing-related resources. Therefore, developers rarely have the opportunity to build networks. In maintenance projects, the network is already built, so even more so. Although I was surprised to see the total amount displayed on the dashboard immediately after logging into the AWS Management Console, I tend to become less conscious of costs because I am not directly billed.

Unless you obtain your own AWS account for personal testing, there are few opportunities to touch the network. I hesitated to obtain my own account due to concerns about potential misuse or receiving an unexpectedly large bill without realizing it. After careful research on what to do immediately upon obtaining an AWS account, I finally took the plunge and obtained an account.

Building and understanding network systems independently with my own account made it easier to understand other AWS services, as networking is a concept that accompanies any service. I wish I had done it sooner. Being billed personally also made me more aware of what specifically incurs costs, which is important and useful in work. In the past, I left the NAT gateway I had worked hard to set up for internet connection, thinking I would keep it as is, and ended up paying a high price for the lesson. This prompted me to set up a mechanism to trigger alert emails when costs exceed a threshold to avoid unintentionally leaving costly resources.

This failure led me to want to be able to quickly set up and remove NAT gateways when needed, so I created a CloudFormation template to achieve that. While researching for this article, I learned that using IPv6 can reduce costs, so I incorporated that as well. I hope this CloudFormation template, which I created while adding elements of network construction, will be helpful to you.
