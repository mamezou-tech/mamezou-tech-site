---
title: 参加「AWS Certified Machine Learning Engineer - Associate Beta」后已获得AWS认证全15种资格
author: kazuyuki-shiratani
date: 2024-12-06T00:00:00.000Z
tags:
  - AWS認定
  - advent2024
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2024/
image: true
translate: true

---

这是[is 开发者网站 Advent Calendar 2024](/events/advent-calendar/2024/)第6天的文章。

## 引言

前不久，我参加了“AWS Certified Machine Learning Engineer - Associate Beta”考试，因此总结了我的准备过程和感想。

:::info
由于[保密协议（NDA）](https://aws.amazon.com/jp/certification/certification-agreement/)，无法详细说明考试内容，敬请谅解。
:::

## 关于考试

[AWS Certified Machine Learning Engineer - Associate（以下称为机器学习工程师）](https://aws.amazon.com/jp/certification/certified-machine-learning-engineer-associate/)的描述如下：

- 考试概述（截至2024年12月6日）
  - AWS Certified Machine Learning Engineer - Associate (MLA-C01) 考试旨在验证考生利用AWS云构建、实施、部署和维护机器学习（ML）解决方案及管道的能力。
  - 类别：Associate
  - 考试时长：130分钟
  - 题目数量：65题
  - 合格分数：720分
  - 考试费用：150美元（20,000日元+税）

Beta版考试时长为170分钟，题目数量为85题，因此正式版题目有所减少。

## 准备过程

与AWS Certified AI Practitioner一样，通过Skill Builder观看相关课程，掌握了关于AWS服务和生成式AI的知识。

### 考试指南

- 阅读[考试指南](https://d1.awsstatic.com/ja_JP/training-and-certification/docs-machine-learning-engineer-associate/AWS-Certified-Machine-Learning-Engineer-Associate_Exam-Guide.pdf)，了解考试范围、形式和合格标准。
  - 考题分为以下4个领域：
    - 1. 为机器学习（ML）准备数据（28%）
    - 2. ML模型开发（26%）
    - 3. ML工作流的部署和编排（22%）
    - 4. ML解决方案的监控、维护和安全性（24%）

### 书籍

- 阅读与机器学习相关AWS服务的书籍，学习服务的使用方法、应用方式以及最佳实践。
  - [Amazon Bedrock 生成AI应用开发入门 [AWS深度指南]](https://www.amazon.co.jp/dp/4815626448)
  - [实践 AWS数据科学——端到端的MLOps管道实现](https://www.amazon.co.jp/dp/4873119685)
- 想读但未能阅读的书籍：
  - [用AWS开始生成AI：从RAG应用开发、基础模型微调到多模态AI的实际操练](https://www.amazon.co.jp/dp/4814400721)

### Skill Builder

- 通过Skill Builder观看相关课程，提高对AWS服务和生成式AI的理解。
  - [标准考试准备计划：AWS Certified Machine Learning - Associate (MLA-C01)](https://explore.skillbuilder.aws/learn/learning_plan/view/2191/plan)
    - 仅提供英文内容，但通过浏览器将字幕翻译为日文后观看。
  - [增强考试准备计划：AWS Machine Learning - Associate (MLA-C01)](https://explore.skillbuilder.aws/learn/learning_plan/view/2192/plan)
    - 仅提供英文内容，但通过浏览器将字幕翻译为日文后观看。
    - 需要订阅。

### 官方题库

- 通过官方题库进行自测，确认自己的理解程度并熟悉考试题型。
  - [AWS Certified Machine Learning Engineer - Associate 官方样题集 (MLA-C01 - English)](https://explore.skillbuilder.aws/learn/course/internal/view/elearning/19688/exam-prep-official-practice-question-set-aws-certified-machine-learning-engineer-associate-mla-c01-english)
    - 包括20道样题。
    - 因为是英文题目，所以使用浏览器翻译功能辅助作答。
    - 浏览器翻译功能有较多直译，有时较难解读。
  - [官方预考：AWS Certified Machine Learning Engineer - Associate (MLA-C01)](https://explore.skillbuilder.aws/learn/course/internal/view/elearning/19742/exam-prep-official-pretest-aws-certified-machine-learning-engineer-associate-mla-c01-english)
    - 包括65道样题。
    - 需要订阅。
    - 因为是英文题目，所以使用浏览器翻译功能辅助作答。
    - 浏览器翻译功能有较多直译，有时较难解读。

### Skill Builder订阅相关信息

记录Skill Builder订阅后了解的信息，详情请参考[此处](https://skillbuilder.aws/subscriptions)。

- 每月订阅费用为29美元。
- 费用通过AWS账户扣取。
- 通过活动等获得的信用额度不可用于支付费用。
- 注册当月按照注册日按比例收取费用。

## 注意事项

- 比起生成式AI知识，更需要关注以下方面：
  - 关于SageMaker等机器学习相关服务的知识
  - 对微调后的AI进行评估的方法
  - 关于负责任AI的知识
- 与其他考试类别相同，掌握AWS服务的最佳实践至关重要。
- 需要根据题目限制条件（分析所需时间、实时性等）理清应选择的服务。
  - 超过15分钟的处理选用ECS或Batch，而非Lambda
  - 需要实时性处理的数据ETL选择Glue
  - 如数据处理只需翌日完成，则可储存在S3中并使用Spot实例处理

## 考试经历

相比AWS Certified Machine Learning – Specialty，总体问题较为简短，但难度上没有太大不同。

相较官方题库，考试中有更多让人犹豫的问题。

翻译精准度高于浏览器自带的翻译功能，阅读感觉更加流畅。

考试时间为170分钟，由于本人仅进行了粗略复查，因此约在120分钟时完成并退出。

[关于新型考试问题的追加](https://aws.amazon.com/jp/blogs/news/aws-certification-new-exam-question-types/)中提到的一些非传统解题形式，每种仅出了一道题目。建议先通过官方题库熟悉这些类型。

## 考试结束后

考试结果无法现场查询，晚上19点后收到邮件，并在门户网站确认成绩。

以略高于合格线的分数通过考试。

## 总结

- 目前成功获取到AWS认证的全部15个资格。
- 如果已经考取其他类别的Associate或更高等级AWS认证，考试难度感知不会太大。
- 尽管近年来生成式AI的相关知识备受关注，但要注意该认证主要考查机器学习和负责任AI相关知识。

以上为简单的总结，希望对准备参加考试的读者有所帮助！
