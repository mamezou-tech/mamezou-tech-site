---
title: Mamezou Developer Site Summary for April–June 2026
author: masahiro-kondo
date: 2026-07-05T00:00:00.000Z
tags:
  - retrospective
image: true
translate: true

---

Half of this year is already over. Here is the summary for April–June 2026.

## Number of Articles and Contributors
Over the past three months, 13 articles were posted, bringing the total number of articles to 889.

## Series
### Introduction to MCP: Connecting AI Agents and Systems
MCP (Model Context Protocol) is a specification for AI agents to communicate with external services, with its first edition released by Anthropic in 2024. By using MCP, AI agents can effectively utilize the capabilities of external services. This series explains MCP in stages, from the basics to implementation.

@[og](/blogs/2026/04/24/mcp-impl_introduction/)

Currently, the following six articles have been published:

- [Introduction](/blogs/2026/04/24/mcp-impl_introduction/)
- [stdio Implementation](/blogs/2026/05/08/mcp-impl_stdio/)
- [StreamableHTTP Stateless Implementation](/blogs/2026/05/22/mcp-impl_http_stateless/)
- [StreamableHTTP Stateful Implementation](/blogs/2026/06/05/mcp-impl_http_stateful/)
- [Prompt](/blogs/2026/06/19/mcp-impl_prompt/)
- [Resources](/blogs/2026/07/03/mcp-impl_resource/)

## Themed Articles
### Certification

@[og](/blogs/2026/04/13/google_cloud_all_certified_revenge/)

@[og](/blogs/2026/04/20/aws_certified_generative_ai_developer/)

### Parental Control
An unconventional article by an engineer who achieved both AWS and Google Cloud certifications, then stepped away from the cloud to wrestle with their home network. To put an end to the “cat-and-mouse game” with a child playing games on a tablet late at night, they stay up all night building a serious “hardcore setup” using a consumer router and Raspberry Pi, implementing MAC address filtering, subnet isolation, and building a custom DNS with Pi-hole. The article candidly describes real-world challenges like DoH (encrypted DNS) countermeasures, making it a gritty, heartfelt case study ideal for those wanting to relearn network fundamentals or for IT engineer parents facing the same struggles.

@[og](/blogs/2026/04/09/home_network_control/)

### Scrum Masters and AI
For Scrum Masters who support team dialogue, creating visual materials is indispensable but also time-consuming. This article explains practical methods to overcome that bottleneck with AI. It shows how to refine structure with ChatGPT as a thinking partner and quickly shape slides using the latest generative AI tools—not just as a “time-saving trick,” but as a “co-creation process” that polishes ideas through AI interaction and enhances the quality of facilitation and coaching, allowing Scrum Masters to focus on what truly matters. This content is also useful for leaders and managers who want to break free from the pressure of material creation and maximize team value.

@[og](/blogs/2026/04/27/ai-presentation/)

### GitHub
In GitHub Organization management, there is a dilemma: you want to create private repositories but avoid a management cost explosion from changing Basic Permission settings. This article explains a “whitelist approach” strategy to safely and efficiently manage access rights under the Teams plan without subscribing to the costly Enterprise plan. It introduces hacks from a practical perspective, from building security boundaries by creating a unified team for all members to implementing an “automation script to prevent missing team additions” by combining the GitHub API with Actions, all without increasing administrators’ workload.

@[og](/blogs/2026/06/24/github-manage-organization-access/)

This article quickly verifies the new parallel step execution feature within a single workflow recently added to GitHub Actions, which is widely used in CI/CD environments. It not only explains the basics of asynchronous execution using the background attribute and concurrent execution with the parallel block, but also includes a practical performance evaluation using Go cross-compilation. It delves into why it “didn’t become as fast as expected” from the perspectives of vCPU core count and context switching, and how to decide between this and the traditional Matrix build, providing live insights that directly tie into on-site CI improvements. It attracted attention on Hatena Bookmark and saw increased traffic immediately after publication.

@[og](/blogs/2026/06/27/github-actions-parallel-steps/)

## Closing Remarks
That concludes the summary for Q1 of fiscal year 2026. Since the number of posts was small, we provided more detailed introductions for each article.

If you like, please subscribe to our [feed](/feed/), and follow us on [X](https://x.com/MamezouDev) and [Bluesky](https://bsky.app/profile/mamezoudev.bsky.social). On [Facebook](https://www.facebook.com/mamezou.jp), we also share featured articles and Mamezou-related events. Occasionally, articles related to this site are also published on [note](https://note.com/mamezou_info).
