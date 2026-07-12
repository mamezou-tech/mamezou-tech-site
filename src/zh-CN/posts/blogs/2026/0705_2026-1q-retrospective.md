---
title: is 开发者网站 2026年4-6月总结
author: masahiro-kondo
date: 2026-07-05T00:00:00.000Z
tags:
  - retrospective
image: true
translate: true

---

今年也已经过半。这里是2026年4-6月的总结。

## 文章数・撰写人数
在这三个月中，共发布了13篇文章，文章总数达到了889篇。

## 连载
### 连接 AI 代理与系统的 MCP 入门
MCP（Model Context Protocol）是 AI 代理与外部服务通信的规范，由 Anthropic 公司于2024年发布了初版。使用 MCP 可以让 AI 代理有效利用外部服务的功能。本系列将分阶段从 MCP 的基础到实现进行讲解。

@[og](/blogs/2026/04/24/mcp-impl_introduction/)

目前已发布以下6篇文章。

- [介绍](/blogs/2026/04/24/mcp-impl_introduction/)
- [stdio 实现篇](/blogs/2026/05/08/mcp-impl_stdio/)
- [StreamableHTTP 无状态实现篇](/blogs/2026/05/22/mcp-impl_http_stateless/)
- [StreamableHTTP 有状态实现篇](/blogs/2026/06/05/mcp-impl_http_stateful/)
- [提示词篇](/blogs/2026/06/19/mcp-impl_prompt/)
- [资源篇](/blogs/2026/07/03/mcp-impl_resource/)

## 按主题分类的文章
### 认证资格

@[og](/blogs/2026/04/13/google_cloud_all_certified_revenge/)

@[og](/blogs/2026/04/20/aws_certified_generative_ai_developer/)

### 家长控制
这是一篇与众不同的文章，讲述了这位在上述 AWS 和 Google Cloud 认证中获得“W全冠”的工程师，从云端回到家中，与家庭网络展开搏斗的经历。为了结束孩子深夜使用学校平板玩游戏的“猫捉老鼠”式折腾，他利用手头的家用路由器和 Raspberry Pi，从 MAC 地址限制、子网隔离到通过 Pi-hole 构建自有 DNS，不顾一切地彻夜搭建出真正的“硬核配置”，并赤裸裸地记录了整个过程。文章还触及了 DoH（加密 DNS）对策等现实挑战，对于想要重新学习网络基础的人，或面临同样困扰的 IT 工程师父母来说，这是一个接地气且充满爱意的实战记录，绝对不容错过。

@[og](/blogs/2026/04/09/home_network_control/)

### Scrum Master 与 AI
对于支撑团队对话的 Scrum Master 来说，制作可视化资料不可或缺，但与此同时，这也通常需要花费大量时间，是一个共同的难题。本文解读了如何利用 AI 突破这一瓶颈的实用手法：将 ChatGPT 视为思考伙伴来打磨结构，并用最新的生成式 AI 工具一口气完成幻灯片制作——不仅仅是简简单单的“时短技巧”，更通过与 AI 的对话来打磨创意，提升应集中发力的主持和教练辅导质量，介绍了一个“共创流程”。对于想要从资料制作压力中解放出来、并专注于团队价值最大化的领导者和经理人来说，也具有实用价值。

@[og](/blogs/2026/04/27/ai-presentation/)

### GitHub
在 GitHub 组织（Organization）运维中，存在“想要创建私有仓库，却又不愿因修改 Basic Permission 设置而让管理成本暴增”的两难。本文阐述了在不购买昂贵 Enterprise 计划的情况下，如何在 Teams 计划的限制下安全且高效地管理访问权限的“白名单方式”策略。从为所有成员创建统一团队以构建安全边界，到结合 GitHub API 与 Actions 实现“防止漏加团队成员的自动化脚本”，介绍了一些贴近一线需求、不会增加管理员负担的实用 hack 技巧。

@[og](/blogs/2026/06/24/github-manage-organization-access/)

这是一篇率先验证在 CI/CD 环境中广泛使用的 GitHub Actions 新增“在单个工作流内并行执行步骤”功能的文章。文章不仅解释了使用 background 属性进行异步执行和使用 parallel 块进行并行执行的基本语法，还进行了利用 Go 语言交叉编译的实战性能测试。从 vCPU 核数和上下文切换的角度，深入考察了“为什么未能达到预期加速效果”以及“应如何与此前的 Matrix 构建相区分使用”，并提供了可直接应用于现场 CI 改进的实战见解。在 Hatena Bookmark 上也受到关注，自公开以来访问量不断上升。

@[og](/blogs/2026/06/27/github-actions-parallel-steps/)

## 最后
以上是2026年度第一季度的总结。由于发布数量较少，所以对各篇文章的介绍做了更为详尽的阐述。

如果喜欢的话，请订阅[Feed](/feed/)，也欢迎在[X](https://x.com/MamezouDev)或[Bluesky](https://bsky.app/profile/mamezoudev.bsky.social)上关注我们。在[Facebook](https://www.facebook.com/mamezou.jp)上，我们也会介绍本网站的精选文章以及 is 的相关活动。[note](https://note.com/mamezou_info)上也不时会刊登本网站相关的文章。
