---
title: 参加了「AWS Certified AI Business Strategist (AIB-C01)」考试！新设商业认证概览与合格体验记
author: kazuyuki-shiratani
date: 2026-10-15T00:00:00.000Z
tags:
  - AWS
  - AWS認定
image: true
translate: true

---

## 前言

本文记录了我凭兴趣参加新考试的经历。

前几天，我参加了 AWS 认证新设的备受关注的 Beta 考试「AWS Certified AI Business Strategist (AIB-C01，Beta 考试代码：AB1-C01)」。本文将总结该新设考试的概要、学习准备、考试当日的真实感受以及合格结果。

:::info
由于签署了[保密协议（NDA）](https://aws.amazon.com/jp/certification/certification-agreement/)，因此无法提及详细的试题内容或个别题目，请谅解。  
此外，本文所述内容基于 2026 年 10 月（Beta 考试参加时）的信息。
:::

## 关于考试

[AWS Certified AI Business Strategist（以下简称 AI Business Strategist）](https://aws.amazon.com/jp/certification/certified-ai-business-strategist/) 是面向业务领导者、DX 推进负责人、企划岗位等的认证资格。该认证综合评估了利用 AI 及生成式 AI 技术创造商业价值、战略决策和推进治理方面的知识。

迄今为止的 AWS 认证主要聚焦于「Solutions Architect」和各类 Specialty 等基础设施构建与实施技术（How）。与之相比，本考试隶属于新设的「Business」类别，其最大特色在于专注于业务战略视角，即“将 AI 应用于哪些课题，如何进行投资决策和推进内部控制（Why / What）”。

- **考试概要**
  - **考试代码**: AIB-C01（Beta 考试代码：AB1-C01）
  - **类别**: Business（※新设类别）
  - **考试时间**: 170 分钟 + 10 分钟（前后问卷等）
  - **题目数量**: 约 85 题（※Beta 考试）
  - **合格分数线**: 700 分（满分 100～1,000 分）
  - **考试费用**: 8,250 日元（含税，※无法使用半价凭证）

※由于是 Beta 考试，正式发布后考试时间和题目数量等可能会有部分变更。

### 出题领域（根据考试指南）

考试指南中列出了以下 4 个主要出题领域。

1. **领域 1：AI 基础与商业素养**
   - 机器学习和生成式 AI 的基本概念，可应用的业务课题识别
   - 传统预测型 AI 与生成式 AI（基础模型）的特性差异及对业务的影响
2. **领域 2：AI 战略与商业价值创造**
   - 制定 AI 导入的商业案例、ROI（投资回报率）的评估方法
   - 自行开发（Build）还是采用外部服务/现有模型（Buy）的权衡判断
   - 设置定量/定性的 KPI（关键绩效指标）
3. **领域 3：AI 治理与负责任的 AI 领导力**
   - 推进负责任的 AI（公平性、透明性、问责制、隐私保护）
   - 幻觉（Hallucination）风险的对策与 Human-in-the-Loop（人机介入）设计
   - 知识产权、著作权与行业合规的遵守
4. **领域 4：组织的 AI 准备度与变革推进（Transformation）**
   - 建立支撑全公司 AI 应用的组织体制（AI 卓越中心：CoE）
   - 员工技能提升、变革管理（克服对变革的抵抗）
   - 从试点运营到全公司推广的规模化策略

## 报名

在确认 Beta 考试公告后，我通过认证门户网站完成了报名。

AWS 认证的新设考试 Beta 版以 8,250 日元（含税）的特别价格，为抢先体验最新趋势出题方向提供了宝贵机会。这次我也调整了日程，锁定了测试中心的考试名额。

## 准备工作

由于本认证并不考察编码或详细基础设施配置命令，而是聚焦于业务视角下的 AI 应用战略及治理，我在此方向上开展了准备。

### 1. 细读考试指南

首先阅读了官方[考试指南](https://aws.amazon.com/jp/certification/certified-ai-business-strategist/)，确认了出题范围。  
其中明确指出“Python 代码实现”和“基础设施详细设置”等不在出题范围，因此我将学习重点聚焦于业务决策和战略制定的场景。

### 2. AWS Skill Builder

我在 AWS 官方学习平台 “AWS Skill Builder” 上查看并利用了官方练习题集及相关教材。

- [**Official Practice Question Set: AWS Certified AI Business Strategist (AIB-C01 - 日本語)**](https://skillbuilder.aws/learn/NN5MQE4G3M/official-practice-question-set-aws-certified-ai-business-strategist-aibc01--/B3F7Q7CP37)  
  官方提供的日文练习题集，可提前掌握出题趋势、场景题形式及选项考察方式
- [**考试准备分类（AIB-C01 / AB1-C01）**](https://skillbuilder.aws/category/exam-prep/ai-business-strategist-business-AIB-C01)  
  利用针对业务领导者的生成式 AI 课程（如 “Generative AI for Executives”）及负责任的 AI（Responsible AI）相关教材进行基础概念输入

### 3. 查阅官方白皮书与博客

我复习了与商业价值和治理相关的 AWS 官方文档及框架。

- [**AWS Cloud Adoption Framework (CAF) for Artificial Intelligence**](https://docs.aws.amazon.com/pdfs/whitepapers/latest/aws-caf-for-ai/aws-caf-for-ai.pdf)
- [**Responsible AI（负责任的 AI）官方指南**](https://aws.amazon.com/jp/ai/responsible-ai/)
- [**Amazon Bedrock / AWS 生成式 AI 服务应用案例**](https://aws.amazon.com/jp/ai/generative-ai/customers/)（金融、医疗、零售等行业用例）

## 准备过程中注意到的要点

在学习过程中，我发现了与传统面向工程师的考试不同的几个重要视角。

- **非考察“技术上是否可行”，而是“作为商业投资是否合理”**  
  对最新基础模型进行微调并非总是最佳答案，应先通过提示调优或 RAG 验证，再判断是否与 ROI、运营成本和风险相匹配。
- **Build vs Buy 的明确判断标准**  
  考察何时应引入 SaaS 或托管服务（如 Amazon Q），何时应构建专属模型或管道（如 Amazon SageMaker / Bedrock）。
- **负责任的 AI（Responsible AI）与风险管理的权重较高**  
  幻觉对策、偏见缓解、著作权保护、数据隐私等企业在 AI 投产时面临的法律与伦理风险治理设计，是考试的重要支柱。
- **组织与人才的变革管理的重要性**  
  不仅是工具引入，还要建立 CoE（Center of Excellence）、进行内部培训、逐步推进 PoC，“如何让组织真正落地 AI”也是重要主题。

## 考试当日情况

我在常去的测试中心参加了考试。

- **题干长度与出题内容**  
  虽然偶尔会出现整屏或一整页篇幅较长的题干，但并非考察复杂的技术架构或参数设置，核心是如何在组织内推广 AI 的展开策略以及推进内部控制与治理规则的决策。因此，如果平时从事 PM（项目管理）、业务企划或 DX 推进等工作，就能通过上下文自然选择正确答案。
- **时间分配与个人状态**  
  考试时间设置为 170 分钟，相对宽裕。当天由于前一晚睡眠不足，中途有些打盹，最终勉强在时间截止前完成。但考试中没有代码阅读或复杂计算题，只要状态良好、专注作答，就能以每题约 1 分钟的节奏顺利完成。

## 考试结果

当晚，我收到了成绩报告，**顺利合格**。  
此外，作为 Beta 考试合格者的特典，我还顺利获得了**Early Adopter（早期采用者）数字徽章**。

![credly-badges](/img/blogs/2026/1015_aws_certified_ai_business_strategist/credly-badges.png)

正如我的预感，考试中没有考查细枝末节的 AWS CLI 命令等内容，而是基于业务语境考察“能否做出恰当的 AI 应用决策”和“能否构建负责任的推进体系”这样的本质理解。

### 可借鉴的基础知识（与其他 AI 认证的亲和性）

实际考试体验让我深感，其他云厂商或现有 AI 认证所积累的知识会带来极大优势。  
特别是如果具备以下认证的知识或学习经验，就能顺利把握出题意图，**考试会轻松许多**。

- **AWS Certified Generative AI Developer - Professional (AIP-C01)**  
  对 Bedrock 的选型标准、护栏（Guardrail）及合规设计等具有深入见解
- **AWS Certified AI Practitioner (AIF-C01)**  
  掌握 AWS 上 AI/ML 的基础概念及各类用例的核心知识
- **Google Cloud 认证 Generative AI Leader (GAIL)**  
  从业务领导者视角对生成式 AI 导入、ROI 评估和组织推广具有共通思路
- **Microsoft 认证: Azure AI 基础 (AI-901)**  
  负责任的 AI（公平性、透明性、隐私保护等）的基本原则具有共通性
- **生成式 AI 通行证（GUGA）**  
  掌握 AI 素养、知识产权、著作权、风险管理等社会与业务共通的基础教养

顺便提一下，除了“生成式 AI 通行证”外，我已通过并取得以上所有认证。  
因此，我在各考试中积累的治理及用例知识已融会贯通，即使面对初次见到的场景题，也能顺畅做出判断。

## 总结

- **作为新设类别「Business」，对非工程师也十分友好**  
  对于 PM、DX 推进者、企划人员、顾问等承担业务与 AI 桥梁角色的人员，是证明体系化知识的理想考试体系。  
- **对工程师而言也是“提升视野”的绝佳机会**  
  对于平时关注“如何实现”的工程师来说，也是整理“为何要做”“是否值得投资”“如何在组织中落地”这些更高层次业务视角的好机会。  
- **早期参加可获得 Early Adopter 徽章**  
  这是新设认证推出初期的特色，对 AI 推进相关的业务领导者和工程师来说都是值得挑战的认证。

以上为简要的考试记录，希望能对正在考虑参加此考试的您有所帮助。
