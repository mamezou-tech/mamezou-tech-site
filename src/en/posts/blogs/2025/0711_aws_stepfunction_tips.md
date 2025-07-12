---
title: A Hands-On Summary of Stumbling Points in AWS Step Functions
author: hirokazu-niwa
date: 2025-07-11T00:00:00.000Z
tags:
  - step-functions
  - AWS
image: true
translate: true

---

## Overview
When preparing for the "AWS Certified Developer – Associate (DVA-C02)" exam, I decided to deepen my understanding not only through theory but by actually getting hands-on experience. I thought it would be helpful to record, as a memo, the points where I stumbled or found concepts hard to grasp so I can refer back to them later. This time, I want to try out AWS Step Functions (hereafter Step Functions), a service I haven’t had much experience with before, which is also included in the exam scope!

## What Is AWS Step Functions?
I’ll leave the finer details and terminology to the [official documentation](https://docs.aws.amazon.com/ja_jp/step-functions/latest/dg/welcome.html), but simply put, I think the term “**AWS service orchestration tool**” appropriately describes it. Basically, it’s a service that lets you incorporate APIs like the AWS SDK into a flow called a state machine, enabling coordinated data processing across AWS services.

The official documentation lists the following use cases for Step Functions:
- Data processing workflows
- Machine learning workflows
- Microservices orchestration
- Security automation

For example, you can generate thumbnails and convert sizes concurrently for uploaded images, or perform iterative processing on structured data. You can also implement retries when errors occur in the flow, so it’s nice that it supports error handling.

## Understanding the Concepts and Usage
When dealing with a service I’m not familiar with, I think the quickest way to get a feel for it is to dive into a tutorial. So I followed the [official tutorial](https://docs.aws.amazon.com/step-functions/latest/dg/getting-started.html) and got hands-on to organize the features and how to use Step Functions. There’s not much point in reproducing the entire tutorial from start to finish, so I’ll note down the concepts and usage that seem important as I go through it.

### 1. There Are Two Ways to Configure a Workflow (Equivalent to a State Machine)
There are two patterns for defining a workflow in Step Functions:
- GUI-based configuration with Workflow Studio
- Code-based configuration using ASL, a JSON-based structured language

If you don’t have any particular preference, you can safely use Workflow Studio’s GUI-based setup. Even if you configure it via the GUI, the definition is also generated in ASL, so you can share the same configuration with other environments or team members later on.

![Work flow studio GUI](/img/blogs/2025/0711_aws_stepfunction_tips/image-2.png)

![ASL image](/img/blogs/2025/0711_aws_stepfunction_tips/image-3.png)

I thought it might be convenient to quickly define the overall outline of a workflow in the GUI and then refine the details in ASL. (Especially because trying to define [Choice](https://docs.aws.amazon.com/ja_jp/step-functions/latest/dg/state-choice.html) or [Map](https://docs.aws.amazon.com/ja_jp/step-functions/latest/dg/state-map.html) flows entirely in ASL from the start can be confusing at first glance.)

### 2. You Can Visually Monitor Workflow Execution in Real Time
![Work flow state image](/img/blogs/2025/0711_aws_stepfunction_tips/image.png)

You can see at a glance whether each state (i.e., step in the workflow) succeeded or failed, and you can also view the state’s inputs, outputs, and definition. This makes it easy to understand what failure occurred and where in the definition the error lies.

One concept I found a bit confusing here was “events.” I understood this to refer to the detailed state transitions happening within a state (listed in the “Step” column in the Event Viewer). You can view these details in the Event Viewer.

![event viewer image](/img/blogs/2025/0711_aws_stepfunction_tips/image-1.png)

### 3. Types of Tasks
As described in [Task Types](https://docs.aws.amazon.com/ja_jp/step-functions/latest/dg/state-task.html#task-types), there appear to be four types of tasks:

- Activity  
  Borrowing the official wording, an activity-type task refers to a way to link a state with an external application (the activity worker) hosted anywhere outside Step Functions.  
  You need to implement a polling mechanism on the external application side, and it can be a bit involved, but it’s useful to have a system that can manage applications outside AWS.

- Lambda Function  
  As the name suggests, this is the type of task that invokes a Lambda function within the workflow.

- Supported AWS Services  
  This is the type used to execute the integrations discussed in the Supported Services Integration section below.

- HTTP Task  
  Again quoting the official documentation, this type allows you to call third-party SaaS applications like Stripe or Salesforce within your workflow.  
  However, to implement this, you need to separately create an “EventBridge connection” that includes the headers, body, and query parameters required for API authorization, so it seems like a relatively involved task type. I’ll leave the details to the [official documentation on HTTP task connections](https://docs.aws.amazon.com/ja_jp/step-functions/latest/dg/call-https-apis.html#http-task-authentication).

How you define each of the four task types is also described in the documentation, but I noted this point because specifying the type determines what Step Functions will do.  
If your application is built on AWS, the Lambda Function and Supported AWS Services types should cover most use cases. However, considering existing external applications or SaaS services adds more effort.

Another somewhat confusing aspect is that you don’t distinguish these types via the Type field, but rather by how you specify the ARN in the Resource field.

![task type set position](/img/blogs/2025/0711_aws_stepfunction_tips/image-6.png)

### 4. About Service Integration
This applies when you select a Supported Service API Action as the task type. It’s another somewhat confusing concept: calling various AWS services from Step Functions is defined as “service integration.”

There are also types of “service integration”:
- AWS SDK integration
- Optimized integration
- Cross-account access

(I’m omitting details about cross-account access.)

Furthermore, for each integration type, there are three patterns of behavior:
- Request-response (default behavior)
- Job execution (.sync)
- Waiting for callback (.waitForTaskToken)

A table summarizing this is provided on the official page.

![service integration table view](/img/blogs/2025/0711_aws_stepfunction_tips/image-4.png)

As you can see, even within each type, some patterns aren’t supported, so you’ll need to check before using them.

Also, to briefly explain the difference between AWS SDK integration and Optimized Integration:

|AWS SDK Integration|Optimized Integration|
|:--|:--|
|Functions exactly like a standard API call using the AWS SDK|API calls customized by Step Functions|

This is my understanding, and the official recommendation is to use Optimized Integration.  
“Customized” means that the options and parameters you can specify for the API are prepared in a way that’s easy to use in Step Functions. With AWS SDK integration, you specify the API parameters directly, so it’s essentially the same method you would use with the SDK.

Officially, it’s recommended to use Optimized Integration whenever possible. However, there are far more services available with AWS SDK integration. So if the service you want to define in your workflow is supported by both AWS SDK Integration and Optimized Integration, I think it’s fine to use Optimized Integration.

:::info: Note
For service integration and its types and behaviors, see:
- [3 Types of Groups](https://docs.aws.amazon.com/ja_jp/step-functions/latest/dg/integrate-services.html)
- [3 Patterns of Behavior](https://docs.aws.amazon.com/ja_jp/step-functions/latest/dg/integrate-optimized.html)
:::

## My Impressions
I felt that you could probably achieve something similar by combining SDK commands in AWS Lambda and implementing logic like loops in code, but that would likely be limited to simple tasks or those with short execution times.

In reality, implementing comprehensive error handling, data retention, and coordination between Lambda functions using only Lambda would be difficult and hard to manage. From that perspective, I think Step Functions is best used when building multi-step processes, when you need branching or parallel execution involving various services, or when you want to visually grasp each step’s execution status and data flow.

Of course, there are concerns such as the learning curve for understanding ASL, cost issues related to the billing model, and that you’ll still need to maintain code if you involve Lambda. These are factors you need to carefully evaluate against your objectives during the service selection phase.

## Conclusion
This time, I focused on AWS Step Functions and covered the basics, but I think I was able to organize my own understanding of its features and use cases.

Moving forward, I plan to actually try out the use cases mentioned above and compile notes on issues I encounter during flow definition and detailed considerations for service integration. Thank you for reading to the end.
