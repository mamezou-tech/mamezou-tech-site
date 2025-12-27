---
title: AWS认证12冠三年后 - 更新与新认证分类
author: kazuyuki-shiratani
date: 2025-12-23T00:00:00.000Z
tags:
  - AWS認定
  - advent2025
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2025/
image: true
translate: true

---
这是[is开发者网站Advent日历2025](https://developer.mamezou-tech.com/events/advent-calendar/2025/)第23天的文章。

## 前言

自2022年12月12日发布“[完成全部12项AWS认证后总结学习经验](/blogs/2022/12/12/aws_all_certified/)”一文以来，已经过去了3年。  
本文将总结这3年间发生了哪些变化，以及新添加的认证分类。

:::info
由于存在[保密协议（NDA）](https://aws.amazon.com/jp/certification/certification-agreement/)，无法涉及考试的详细内容，敬请谅解。
:::

## 三年回顾

自2022年10月达成AWS认证12冠以来，已经过去了3年。在此期间，有几项认证到期，需要进行更新。

### 关于认证的更新

AWS认证的有效期为3年。2022年获得的认证在2025年需要进行更新。  
本次需要更新的认证共有5项。

#### 两项专业级认证的更新

两项专业级认证（解决方案架构师和 DevOps 工程师）同时包含下位级认证的更新，因此，我提前于到期的6月，在1月完成了更新。  
专业级认证在更新时也会同时更新下位的准入级认证（Solutions Architect – Associate、Developer – Associate、SysOps Administrator – Associate），因此一次更新即可维持多项认证，这是一大优势。

- AWS Certified Solutions Architect – Professional  
  - 考试内容与之前相同，考查了以 Organization 为核心的架构、安全、运维等广泛知识  
  - 大量题目涉及多账户策略、治理、成本优化、灾难恢复等企业级设计  
  - 题干依旧很长，需要整理需求后再阅读  

- AWS Certified DevOps Engineer – Professional  
  - 同样与之前无明显变化，与 Solutions Architect 一起备考时所学知识得到充分运用  
  - 考查范围主要包括 CI/CD 流水线设计、基础设施自动化、监控与日志管理等  
  - 本应该废止的 Code Commit 竟然出现了，令人怀疑“现在再考这有意义吗？”，但后续撤销了废止，因此还是有意义的  

#### 三项专项认证的重新获取

三项专项认证（安全、机器学习、高级网络）由于预留了充足的准备时间，无需担心有效期，认证失效后陆续重新取得。  
专项认证与专业级认证不同，不包含下位认证的更新，因此需要单独进行更新。  
高级网络认证一直是我的弱项，得益于[重考活动](https://pages.awscloud.com/GLOBAL-other-GC-Traincert-Global-Retake-Registration-2025.html?gc-language=ja-jp)的帮助。

- AWS Certified Security – Specialty  
  - 参加考试时为 SCS-C02，但与之前相比几乎没有变化  
  - 考查了 IAM、安全组、网络 ACL、WAF、GuardDuty、Security Hub 等与安全相关的广泛知识  
  - 大量题目涉及多账户环境下的安全治理及满足合规性要求的设计  
  - 据说在 SCS-C03 中，与生成式 AI 相关的安全内容将增加，预计覆盖范围会更广  

- AWS Certified Machine Learning – Specialty  
  - 官方宣布将于2026年3月31日废止  
  - 考试内容与之前保持一致，以机器学习为核心  
  - 主要考查基于 Amazon SageMaker 的机器学习流水线构建、模型训练与部署、监控等  
  - 也需要机器学习基础知识，如数据预处理、特征工程、模型评估方法等  

- AWS Certified Advanced Networking – Specialty  
  - 在本次更新中，内容变化最大  
  - 之前以 Direct Connect 和 VPN 连接为主，这次增加了大量关于 AWS Global Accelerator、CloudFront、Route 53 等全球网络服务的题目  
  - 也有许多多区域环境下的网络设计以及混合云环境连接性的题目  
  - Transit Gateway 和 Gateway Load Balancer 等较新服务相关的题目也有所增加  

#### 已废止的三项专项认证

三项认证被废止后，在获取之日起满3年的当天陆续失效。  
这些认证因整合到新的认证分类或 AWS 认证项目重组而被废止。  
在有效期结束前，这些认证依然有效，但没有更新机会，自然失效。

- AWS Certified Database – Specialty
- AWS Certified Data Analytics – Specialty
- AWS Certified SAP on AWS – Specialty

### 三年中获得的经验

在2022年的文章中，我写道：“由于并没有实际接触及构建系统，今后希望提升能在实际系统构建中使用的技能”。  
在这3年中，也确实有在实际项目中运用 AWS 的机会，但目前仍仅限于简单应用的方案设计程度。

#### 在实际工作中运用AWS

在实际项目中，以下场景中 AWS 认证所学知识发挥了作用：

- **理解现有系统**  
  - 在理解已有的 AWS 系统时，认证所学知识大有帮助  
  - 在了解使用了哪些 AWS 服务及服务间如何协同时，认证学习的各服务特点和使用方法成为参考  
  - 在阅读系统架构图或文档时，由于具备 AWS 认证知识，理解更加顺畅  

- **系统的运行确认与调查**  
  - 在对现有系统进行运行确认或故障排查时，认证所学知识发挥了作用  
  - 在检查 IAM 角色或安全组配置时，认证学习的知识也有助于理解  

- **设计评审与文档理解**  
  - 在理解其他成员设计的 AWS 架构或现有系统文档时，认证所学知识很有帮助  
  - 拥有认证学习的最佳实践和安全知识，使得理解设计意图和注意事项更加容易  

#### 认证知识与实际工作的差距

也深刻感受到认证所学知识与实际工作存在一些差距：

- **实际工作需要结合多项服务**  
  - 认证考试侧重考查单个服务的知识，而在实际工作中，需要将多项服务结合起来构建系统  
  - 服务间协同及数据流设计等方面，需要更加实用的知识  

- **成本与性能的平衡**  
  - 认证考试中多为选择“最优解决方案”的题目，但在实际工作中，需要考虑成本与性能的平衡  
  - 在实际项目中，预算限制、与现有系统的兼容性等考试中未考虑的因素也非常重要  

- **缺乏实际构建与运维经验**  
  - 认证所学知识主要涉及设计和概念方面，实际构建与运维经验仍然不足  
  - 今后希望积累使用 AWS 构建和运维系统的实际经验  

## 关于新认证分类

自2022年以来，AWS认证新增了4个分类。其中已有3个取得并撰写了开发者网站文章。

- [2024年3月23日：AWS Certified Data Engineer - Associate](/blogs/2024/03/23/aws-certified-data-engineer-associate/)  
- [2024年9月26日：AWS Certified AI Practitioner](/blogs/2024/09/26/aws-certified-ai-practitioner/)  
- [2024年12月6日：AWS Certified Machine Learning Engineer - Associate](/blogs/2024/12/06/aws-certified-machine-learning-engineer/)  

这次要讨论的是第四个新认证分类：AWS Certified Generative AI Developer – Professional。

### AWS Certified Generative AI Developer – Professional

[AWS Certified Generative AI Developer – Professional](https://aws.amazon.com/jp/certification/certified-generative-ai-developer-professional/)是一项专业级认证，用于证明在使用 Amazon Bedrock 等 AWS 服务构建并部署适用于生产环境的 AI 解决方案时具备高级技能。

#### 考试概要

- **类别**: Professional  
- **Beta考试时长**: 205 分  
- **Beta考试形式**: 85 道题，单选题和多选题  
- **Beta考试费用**: 150 美元（日本地区为22,000日元含税）  
- **Beta考试语言**: 英语和日语  

另外，无法使用重考活动优惠，但可以使用常规的半价优惠券。

#### 适用考生

该认证最适合具有2年以上云计算经验，想提升职业发展的开发者。  
适用考生需满足以下要求：

- 有2年以上在 AWS 或使用开源技术构建生产环境级别应用的经验  
- 具备一般的 AI/ML 或数据工程经验  
- 有1年生成式 AI 解决方案实施的实务经验  
- 具备 AWS 计算、存储、网络服务的使用经验  
- 理解 AWS 安全最佳实践和身份管理  
- 具有 AWS 部署和基础设施即代码工具的经验  
- 了解 AWS 监控与可观测性服务  
- 理解 AWS 成本优化原则  

#### 关于 Beta 考试

由于是 Beta 考试，同 Machine Learning Engineer – Associate 和 AI Practitioner 考试一样，遵循认证指南进行准备。  

Beta 考试与常规考试不同，是在考试内容和形式尚未最终确定前进行的考试。  
在 AWS 认证中，会先通过 Beta 考试验证题目的质量，之后再将题目用于标准版本考试。  
通过 Beta 考试的考生将成为该新认证的首批获得者。  

前5,000名参加考试的考生通过时将获得特别的 Early Adopter 徽章。  
因此，认真审查认证指南并理解出题范围后再进行准备非常重要。  

#### 准备方法

作为准备 Beta 考试，我采用了以下学习方法：

- **查看认证指南**  
  - 确认出题范围和各领域的权重，把握重点学习领域  
  - 对于 Generative AI Developer – Professional，主要目标服务包括 Amazon Bedrock、Amazon SageMaker、AWS Lambda、Amazon API Gateway 等  

- **官方文档与动手实践**  
  - 阅读 Amazon Bedrock 官方文档，理解主要功能和用法  
  - 通过 AWS Skill Builder 的相关课程和动手实验室，实际操作服务  
  - 学习生成式 AI 应用的构建模式和最佳实践  

- **利用相关认证的知识**  
  - 运用在 AI Practitioner 和 Machine Learning Engineer – Associate 考试中学到的知识  
  - Solutions Architect – Professional 考试中学习的架构设计知识也很有帮助  
  - 安全和监控方面的知识对生成式 AI 应用的设计也很必要  

- **利用实际经验**  
  - 在实际项目中，虽然只做过简单应用的方案设计，但我认为这段经验对理解题目有所帮助  
  - 不过，由于实际经验仍然有限，需要广泛学习认证指南覆盖的范围  

#### 参加考试体验

我参加了考试。  
虽然觉得自己准备充分，但考试内容与预想有所不同。

**考试难度与特点**

- **题量与时间**  
  - 205 分 85 道题的设置，需要每题约 2.4 分钟的时间分配  
  - 题干和选项都非常冗长，需要花时间从文字中构建架构图的想象  
  - 许多题目是结合多项服务的复杂场景，整体把握需要时间  

- **出题内容特点**  
  - 大量题目涉及以 Amazon Bedrock 为核心的生成式 AI 应用构建  
  - 考查了面向生产环境的设计（可扩展性、安全性、成本优化等）  
  - 许多题目的多个选项看似正确，需要基于最佳实践进行判断  
  - 大量题目涉及错误处理、监控、日志管理等运维方面的考量  

- **时间分配的挑战**  
  - 考试耗时至最后，几乎没有时间进行复查  
  - 总感觉自己阅读长文较慢，需要改善这一点  
  - 深刻体会到快速理解长篇题干并整理要点的能力至关重要  

**结果和今后对策**

在 X（原 Twitter）等上经常看到合格报告，但很遗憾我没能通过。  
在正式发布前，我打算在以下方面进行改进以继续准备：

- **应对长篇题目**  
  - 练习快速阅读题干并整理要点  
  - 练习迅速在脑中构建架构图或架构示意图  

- **强化实战知识**  
  - 积累使用 Amazon Bedrock 构建实际应用的经验  
  - 学习面向生产环境运维的设计模式  

- **深入理解相关服务**  
  - 加深对 AWS Lambda、Amazon API Gateway、Amazon CloudFront 等生成式 AI 应用常用服务的了解  
  - 从安全、监控、成本优化等角度学习最佳实践  

## 维持认证动力

要在3年内持续保持认证，需要持续学习。  
我通过以下方法维持了学习动力：

### 持续学习方法

- **定期跟进 AWS 服务**  
  - 定期观看 AWS 官方博客和 re:Invent 的会议视频，跟进新服务和新功能  
  - 利用 AWS Skill Builder 课程，系统性地更新知识  
  - 尤其是生成式 AI 相关服务（如 Amazon Bedrock、Amazon Q 等）更新频繁，需要持续学习  

- **在实际工作中运用 AWS**  
  - 在实际项目中使用 AWS，将认证所学知识应用于实践，加深理解  
  - 在解决实际工作中遇到的挑战过程中，学习新知识和最佳实践  
  - 通过亲身体验认证知识在实际工作中的价值来保持学习动力  

- **挑战新的认证分类**  
  - 每当新的认证分类推出，我都会积极挑战，将其作为学习新知识的机会  
  - 通过参加 Beta 考试，力争成为新认证的首批获得者  
  - 挑战新认证分类是提高学习动力的良好契机  

### 动力源泉

另外，满足[2026 Japan All AWS Certifications Engineers](https://aws.amazon.com/jp/blogs/psa/2026-japan-all-aws-certifications-engineers-criteria/)的评选标准成为了很大的动力。  
我连续在2023、2024和2025年三年被选中，目标是继续保持所有 AWS 认证。

为实现这一目标，需要做出以下努力：

- **认证的更新规划**  
  - 管理各认证的有效期，预先掌握需要更新的认证  
  - 专业级认证会同步更新下位认证，因此优先进行更新  
  - 专项认证需单独更新，因此有计划地进行准备  

- **应对新的认证分类**  
  - 新的认证分类推出后，尽量尽早获取  
  - 参加 Beta 考试可增加早期获得的可能性  
  - 应对新的认证分类是持续保持所有 AWS 认证所必需的  

- **与社区交流**  
  - 在 X（原 Twitter）和技术博客等平台与有相同目标的人交流信息  
  - 通过分享认证获取经验和学习方法来维持动力  
  - 与社区交流是支撑持续学习的重要因素  

## 结论

自2022年实现 AWS 认证12冠以来已过去3年，部分认证需要更新。  
同时，这期间新增了新的认证分类，扩展了 AWS 认证的选项。  
获取认证不是终点，而是持续学习的契机。  
今后也将不断挑战新技术和新认证分类。
