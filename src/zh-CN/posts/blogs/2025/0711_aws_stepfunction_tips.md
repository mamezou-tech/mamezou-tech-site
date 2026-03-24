---
title: 汇总实践中使用 AWS Step Functions 时遇到的难点
author: hirokazu-niwa
date: 2025-07-11T00:00:00.000Z
tags:
  - step-functions
  - AWS
image: true
translate: true

---

## 概述
为了参加 AWS Certified Developer - Associate (DVA-C02) 考试，我决定不仅通过知识层面学习，还要通过实际动手来加深理解，并把在此过程中遇到的困难或不易理解的概念整理成备忘录，以便日后回顾。  
这次要尝试的是 AWS Step Functions（以下简称 Step Functions），因为它也是考试范围的一部分，而且平时很少接触，所以想借此机会试用一下！

## AWS Step Functions 是什么
细节部分和术语定义等留给[官方文档](https://docs.aws.amazon.com/ja_jp/step-functions/latest/dg/welcome.html)，简单来说，我认为用“**AWS 服务编排工具**”来描述这项服务最为恰当。  
基本上，它可以把 AWS SDK 等 API 嵌入到称为状态机（State Machine）的流程中，实现 AWS 服务的联动数据处理。

具体来说，Step Functions 的典型用例在官方文档中列举了：  
- 数据处理流程  
- 机器学习工作流程  
- 微服务编排  
- 安全自动化

比如对上传的图片并行执行缩略图生成和尺寸转换，或者对结构化数据进行迭代处理。  
在流程中发生错误时还能实现重试，因此对错误处理的支持也很不错。

## 概念和使用方法的理解
对于不太熟悉的服务，我觉得通过教程快速上手把整体印象捉住最快。这次我将按照[官方教程](https://docs.aws.amazon.com/step-functions/latest/dg/getting-started.html)动手实践，并整理 Step Functions 的特点和用法。  
教程内容不必全部复刻，我会在操作过程中记录重要的概念和使用要点。

### 1. 定义工作流程（与状态机同义）的方法有两种
在 Step Functions 中定义工作流程有两种方式：  
- 在 Workflow Studio 中基于 GUI 进行设置  
- 使用名为 ASL 的基于 JSON 的结构化语言进行代码式设置

如果没有特殊要求，只需在 Workflow Studio 中基于 GUI 设置即可。  
即使使用 GUI 设置，系统也会同步生成 ASL 定义，这样便于在后期与其他环境或团队成员共享配置。

![Work flow studio GUI](/img/blogs/2025/0711_aws_stepfunction_tips/image-2.png)

![ASL image](/img/blogs/2025/0711_aws_stepfunction_tips/image-3.png)

可以先在 GUI 中快速定义流程的整体结构，再用 ASL 对细节进行打磨。  
（特别是尝试用 ASL 从头定义 [Choice](https://docs.aws.amazon.com/ja_jp/step-functions/latest/dg/state-choice.html) 或 [Map](https://docs.aws.amazon.com/ja_jp/step-functions/latest/dg/state-map.html) 流程时，一眼看上去会感觉不太直观）

### 2. 可以实时以图形化方式查看流程执行
![Work flow state image](/img/blogs/2025/0711_aws_stepfunction_tips/image.png)  
可以一目了然地看到各个状态（流程内的各步骤）是成功还是失败，还能查看状态的输入输出和定义内容，方便快速定位失败原因或错误的定义。

这里稍微有点让人困惑的概念是“事件”。  
我理解这是指状态（在“事件查看器”中，“Step”列所示）的详细状态变更。  
可以在“事件查看器”中查看这些内容。

![event viewer image](/img/blogs/2025/0711_aws_stepfunction_tips/image-1.png)

### 3. 任务的类型
如[任务类型](https://docs.aws.amazon.com/ja_jp/step-functions/latest/dg/state-task.html#task-types) 所示，存在以下四种任务类型：

- 活动（Activity）  
- Lambda 函数  
- 支持的 AWS 服务  
- HTTP 任务

简要总结各类型及其特点：

- 活动（Activity）  
  借用官方的描述，活动类型任务是指将 Step Functions 的状态与托管在任意位置的应用（即活动工作者）关联的方法。  
  需要在外部应用中实现轮询机制，虽然比较麻烦，但能够管理 AWS 之外的应用也很实用。

- Lambda 函数  
  顾名思义，此类型任务在工作流程中调用 Lambda 函数。

- 支持的 AWS 服务  
  用于执行后文[服务的集成](#4-服务的集成)中所述的操作类型。

- HTTP 任务  
  同样借用官方说法，此类型可在流程中调用 Stripe、Salesforce 等第三方 SaaS 应用。  
  但要实现此功能，需要额外创建包含 API 授权所需的请求头、正文和查询参数的“EventBridge 连接”，实施起来相对繁琐。  
  具体可参阅[官方 - HTTP 任务的连接](https://docs.aws.amazon.com/ja_jp/step-functions/latest/dg/call-https-apis.html#http-task-authentication)。

如官方所述，不同类型的任务定义方式不同。指定哪种类型后，Step Functions 将执行相应的内容，故此处予以强调。  
如果应用都部署在 AWS 上，通常“Lambda 函数”类型和“支持的 AWS 服务”类型即可满足需求；如果要考虑现有的外部应用或 SaaS 服务，则会更复杂。  
另外稍显烦琐的是，不是通过 Type 字段区分类型，而是通过在 Resource 字段中指定 ARN 的写法来区分。

![task type set position](/img/blogs/2025/0711_aws_stepfunction_tips/image-6.png)

### 4. 服务的集成
任务类型选择为[支持的服务的 API 操作](https://docs.aws.amazon.com/ja_jp/step-functions/latest/dg/state-task.html#state-task-connector) 时，涉及的概念即为“服务的集成”，它指的是 Step Functions 调用各种 AWS 服务的能力。  

“服务的集成”也分为几种：  
- AWS SDK 集成  
- 优化的集成  
- 跨账户访问  

（关于跨账户访问的细节此处略去）

另外，每种集成下又有三种行为模式：  
- 请求响应（默认行为）  
- 作业执行（.sync）  
- 等待回调（.waitForTaskToken）

官方文档中有一张表格汇总了这些内容。

![service integration table view](/img/blogs/2025/0711_aws_stepfunction_tips/image-4.png)

如图所示，不同类型中也可能存在不支持的模式，使用前需要确认。  

简单对比“AWS SDK 集成”和“优化的集成”：  

| AWS SDK 集成 | 优化的集成 |
|:--|:--|
| 与使用 AWS SDK 进行的标准 API 调用完全相同 | API 调用经过 Step Functions 的定制化 |

官方推荐使用“优化的集成”。  
所谓定制化，是指 Step Functions 为 API 提供了更易用的选项和参数。  
而 AWS SDK 集成则是直接指定 API 参数，与使用 SDK 时的方法相同。

官方虽然建议尽量使用“优化的集成”，但“AWS SDK 集成”支持的服务更多。如果某项服务在两者中均受支持，可以优先考虑“优化的集成”。

:::info 【补充】  
关于服务集成的类型和行为，可参考以下页面：  
- [三种集成组](https://docs.aws.amazon.com/ja_jp/step-functions/latest/dg/integrate-services.html)  
- [三种行为模式](https://docs.aws.amazon.com/ja_jp/step-functions/latest/dg/integrate-optimized.html)  
:::

## 所感
我感觉如果在 AWS Lambda 中组合 SDK 命令，并通过编程语法实现循环等逻辑，也能做类似的事情，但那仅限于简单或短时的处理。  
实际上，如果仅用 Lambda 来实现错误处理、数据保持、函数间联动，可能既困难又难以维护。因此，从以下角度来看，使用 Step Functions 可能更合适：  
- 构建包含多个步骤的流程  
- 需要结合多种服务进行分支或并行执行  
- 希望可视化地把握各步骤的执行状况和数据流

当然也有一些顾虑，例如“ASL 学习成本较高”、“计费模式带来成本问题”、“如果涉及 Lambda 仍需代码维护”等，但这些都需要在选型阶段根据目标进行权衡。

## 结束语
这次主要聚焦于 AWS Step Functions 的基本内容，我也梳理出了自己的特点和使用时机。  
接下来我打算在前面提到的用例上动手实践，并整理“在定义流程时遇到的问题”和“服务集成的细节注意事项”等内容，希望能陆续更新。  
感谢阅读至此。
