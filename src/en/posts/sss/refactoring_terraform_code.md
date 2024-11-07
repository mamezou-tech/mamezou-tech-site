---
title: Refactoring Terraform Code
author: tadashi-nakamura
date: 2024-10-30T00:00:00.000Z
tags:
  - terraform
  - IaC
  - AWS
  - s3
  - sss
  - tips
translate: true

---

# Introduction

When renaming or moving resources between modules in Terraform code, executing `terraform apply` can result in the deletion and regeneration of renamed resources. Here, we introduce procedures for changing resource names and moving resources between modules without affecting the actual infrastructure.

Although the content is general, it is based on insights from the [Sales Support System (SSS)](/in-house-project/sss/intro/) developed and operated internally at Mamezou. The following assumptions are made:

- The existing AWS environment is managed with Terraform's IaC.
- Terraform code is divided into multiple directories (modules).
- Terraform state is stored in an AWS S3 bucket.

In SSS, to store Terraform state in AWS S3, files like the one below are defined and specified as arguments during Terraform execution.

```terraform:backend.hcl
bucket = "<AWS S3 bucket name for Terraform state management files>"
key    = "<AWS S3 object name for Terraform state management files>"
region = "<Region where AWS S3 is located>"
```

*This is referenced in the final shell script.

# Confirming Resources

To check the resources managed by Terraform, execute the following command:

```bash
terraform state list
```

From the displayed list, identify the resources to rename or move between modules.

# Changing Resource Names

To change the name of a resource within the same module, execute the following command:

```bash
terraform state mv "<old resource name>" "<new resource name>"
```

For example, it would look like this:

```bash
terraform state mv "module.application.aws_ecs_task_definition.one" "module.application.aws_ecs_task_definition.the_other"
```

This changes the resource of type `aws_ecs_task_definition` named `one` within the `application` module to `the_other` as shown below.

```terraform:application/main.tf(before)
resource "aws_ecs_task_definition" "one" {
  ...
}
```

```terraform:application/main.tf(after)
resource "aws_ecs_task_definition" "the_other" {
  ...
}
```

# Moving Resources Between Modules

Moving resources between modules essentially uses the same command as renaming resources (similar to the Unix shell command `mv`, which allows renaming and moving). The difference is that the move occurs through files rather than within Terraform's management.

The flow is as follows:

1. Move the target resource from the source module's Terraform management to a state export file.
2. Output the state of the target resource to a file in the destination module.
3. Move the target resource from the state export file to the destination state file.
4. Import the contents of the updated destination state file back into the Terraform management of the destination module.

Let's look at each command in detail.

First, move the resource from Terraform management to a file.

```bash
terraform state mv -state-out=<export file name> "<resource name>" "<resource name>"
```

Here, if you change the value of the last parameter from "resource name" to another name, it will also change the resource name simultaneously.

Next, output the state of the destination to a file.

```bash
terraform state pull > <destination module state file name>
```

Then, move the resource between files.

```bash
terraform state mv -state=<export file name> -state-out=<destination module state file name> "<resource name>" "<resource name>"
```

Finally, return the updated state file to Terraform management.

```bash
terraform state push <destination module state file name>
```

## Shell Script for Moving Resources in Bulk

Finally, here is a template for a shell script to move resources in bulk.

```bash:move_resources.sh
#!/usr/bin/bash

# Variables
RESOURCES=(
    # List resource names
    "aws_vpc.this" # Example
    "aws_vpc.that" # Example
    ...
)

SOURCE_DIR=<source module directory name>
TARGET_DIR=<destination module directory name>
EXPORTED=<export file name>
TARGET_STATE=<destination module state file name>

# Move out
cd $SOURCE_DIR
terraform init -backend-config=backend.hcl
for RESOURCE in ${RESOURCES[@]}; do
    echo Copy $RESOURCE Key File
    terraform state mv -state-out=$EXPORTED $RESOURCE $RESOURCE
done
terraform state list
cd ..

# Move in
cd $TARGET_DIR
terraform init -backend-config=backend.hcl
terraform state pull > $TARGET_STATE
for RESOURCE in ${RESOURCES[@]}; do
    echo Copy $RESOURCE Key File
    terraform state mv -state=$EXPORTED -state-out=$TARGET_STATE $RESOURCE $RESOURCE
done
terraform state push $TARGET_STATE
terraform state list
rm $TARGET_STATE $EXPORTED
cd ..
```
