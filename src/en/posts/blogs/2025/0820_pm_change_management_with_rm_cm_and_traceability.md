---
title: >-
  Change Management Success Guide: Requirement Management, Configuration
  Management, and Traceability Practices by Effective PMs
author: makoto-takahashi
date: 2025-08-20T00:00:00.000Z
tags:
  - 構成管理
  - ProjectManagement
  - プロジェクト管理
image: true
translate: true

---

# Introduction

"Change is inevitable in projects"—this is a fact every on-site project manager (PM) knows. However, if change management is mishandled, it can lead to inconsistencies in deliverables, quality degradation, and risks such as schedule delays.

Simply creating an approval flow is not enough to succeed in change management. It is essential to establish requirement management and configuration management, and use traceability data to understand the scope of impact.

In this article, based on CMMI best practices, we explain the fundamentals and mechanisms of change management that can be practiced in the field.

:::info: About CMMI
CMMI (Capability Maturity Model Integration) is a model developed by Carnegie Mellon University’s SEI under commission from the U.S. Department of Defense, starting in 1985.  
Based on numerous case studies, it systematizes software development success principles (best practices).  
A distinctive feature is that it is grounded not only in theory but also in practical knowledge.
:::

# Key Points to Avoid Failure in Change Management: Basics of Requirement Management and Configuration Management

Effective change management relies on two indispensable processes: requirement management and configuration management.

## Purpose of Requirement Management

Manage change requests against baseline-configured deliverables. Specifically, confirm the following three points:  
- Feasibility of the change  
- Impact on dependent deliverables  
- Impact on cost and schedule  

## Purpose of Configuration Management

Through identification of configuration items, configuration control, status accounting and reporting, and configuration audits, establish and maintain consistency of deliverables. Changes are made against a baseline to prevent unintended modifications and version confusion.

# Overview of the Change Management Process

![Process diagram of requirement management and configuration management for successful change management](/img/pm/configuration_management_rm_cm_process.png)  
Figure 1: Overall process for successful change management. A diagram organizing the flow of requirement management, configuration management, and traceability.

1. **Manage requirement changes**  
   When a requirement changes, record the details of the change, the reasons, and the history of actions taken.

2. **Track change requests**  
   Manage change requests against baseline-configured deliverables. Specifically, perform the following:  
   - Decide on the feasibility of the change  
   - Identify impacts on dependent deliverables  
   - Analyze impacts on cost and schedule  

3. **Control configuration items**  
   Before updating and approving the baseline, verify that there are no unintended impacts.

4. **Maintain bidirectional traceability of requirements**  
   In change management, use bidirectional traceability of requirements to identify impacts on interdependent deliverables.

# Failure Case in Change Management: Release Delay Due to Omitted Requirement Change Tracking and Countermeasures

In an e-commerce system development, additional requirements from the sales department were not reflected in the change management sheet. As a result, test design proceeded based on the old specifications. In the QA phase, inconsistencies were discovered, and the production release was delayed by two weeks.

The cause was the omission of updates to the "change request management data" and ambiguity in the approval process. As a countermeasure, automatic notifications to the change request management tool and mandatory weekly reviews were implemented. Since then, no similar mistakes have occurred.

Lesson learned: When the approval flow and records become mere formalities, the ability to understand the impact of changes quickly breaks down.

# Key Elements

## Configuration Items and Baselines

![Configuration items and baselines](/img/pm/configuration_management_systempng.png)  
Figure 2: The relationship between configuration items and baselines, the basic elements of configuration management. The foundation for ensuring consistency in change management.

- **Configuration Item**: Deliverables that require tracking and change management (requirement definitions, design documents, code, etc.)  
- **Baseline**: The official version at a specific point in time. All changes must be made from this standard. Without a baseline, it becomes unclear which version should be changed.

## Change Request Management Data

![Change request management data](/img/pm/configuration_management_change_request_management_data.png)  
Figure 3: Example of change request management data. A mechanism that visualizes change details, reasons, and scope of impact, linking requirement management and configuration management.

Centralize management of change details, reasons, impact scope, status, and more, to visualize the progress of changes.

## Traceability Data

![Traceability data](/img/pm/configuration_management_traceability_data.png)  
Figure 4: Overview of traceability data. Analyze the scope of impact in change management through vertical and horizontal traceability.

### Vertical Traceability

Track relationships between upstream and downstream in the development process (e.g., code → design → requirements).

### Horizontal Traceability

Track dependencies within the same level (e.g., between requirements, between design modules, between components). Analyze "what will be affected if this is changed" to limit the ripple effects of changes.

# Pitfalls of Traceability: Failure Cases and Cautions Due to Excessive Change Management

In an embedded software development project, 100% of documents were mapped. The goal was to achieve complete coverage in impact analysis, but more than 20 hours per week were spent on matrix management for traceability.

As a result, decisions on implementation priorities were delayed, and the schedule was significantly compressed.

On the other hand, in a small-scale web project, even minor changes were subjected to the same approval flow as major revisions, and detailed documentation was mandated.

Consequently, developers and designers hesitated to make new proposals, and opportunities for service improvement decreased.

In both environments, side effects outweighed the original goals of **accurately understanding the scope of impact** and **ensuring change consistency**. In other words, maintaining traceability data and the approval process itself became the objectives.

Lesson learned: Change management and traceability are dangerous if neglected, but also dangerous if overdone. Tailor them to the project's size and characteristics, focusing on 3–5 critical items. Implement measures to reduce operational burden, such as automation with scripts or AI.

## Summary

In project management, change is unavoidable. What matters is establishing the foundational processes of **requirement management** and **configuration management**. Furthermore, by utilizing **baselines and traceability data**, you can accurately grasp the impact of changes.

Properly operating these processes prevents confusion caused by changes. As a result, you can deliver projects that maintain both quality and deadlines. The key to "successful change management" lies in the combination of requirement management, configuration management, and traceability.

:::info
**This article is part of the "Effective PM Series"**  
👉 [Preventing Checklist Formalization! Reconstruction Techniques and 7 Improvement Measures for Effective PMs](https://developer.mamezou-tech.com/blogs/2025/07/10/pm_checklist_rebuild_and_improve/)  
👉 [How to Conduct Recurring Meetings That Avoid Formalization | 7 Improvement Steps for Effective PMs](https://developer.mamezou-tech.com/blogs/2025/07/18/pm_meeting_rebuild_and_improve/)  
👉 [Managing Issue Lists That Lead to Issue Resolution | 12 De-Formalization Techniques for Effective PMs](https://developer.mamezou-tech.com/blogs/2025/07/24/issue_list_rebuilding_and_practical_tips_for_pms/)  
👉 [Problem-Solving Using Cause-and-Effect Diagrams | Practical Steps for Field Improvement by Effective PMs](https://developer.mamezou-tech.com/blogs/2025/08/05/problem_solving_with_cause_effect_diagram/)  
👉 [Driving the Field with Intermediate Goals! Future Reality Tree Utilization Techniques for Effective PMs](https://developer.mamezou-tech.com/blogs/2025/08/14/improvement_plan_with_future_reality_tree/)  
👉 [Practical Steps for Process Improvement | The IDEAL Model and Success Secrets Used by Effective PMs](https://developer.mamezou-tech.com/blogs/2025/08/08/pm_process_improvement_ideal_model_and_practical_steps/)  
:::
