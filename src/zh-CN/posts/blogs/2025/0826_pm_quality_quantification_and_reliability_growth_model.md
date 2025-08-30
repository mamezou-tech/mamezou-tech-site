---
title: 质量定量化与可靠度增长模型｜能干的PM的软件可靠性评估与质量保证推进方法
author: makoto-takahashi
date: 2025-08-26T00:00:00.000Z
tags:
  - 品質保証
  - ProjectManagement
  - プロジェクト管理
image: true
translate: true

---

# 引言
“质量管理”一听到，可能会联想到“让用户满意”或“满足规格”。

软件工程研究者罗伯特·L·格拉斯指出，质量并非单一的要素。  
质量是由各种属性组成的集合体。

质量保证是对这些多样属性进行平衡管理的工作。  
其中，“可靠性”是决定用户是否能够安心持续使用系统的重要特性。

本文将聚焦于构成质量的重要要素之一“可靠性”。  
并面向项目经理介绍在质量保证中广泛使用的软件可靠度增长模型的应用方法。

:::info 质量是属性的集合体
罗伯特·L·格拉斯的著作『Facts and Fallacies of Software Engineering（ソフトウェア開発 55の真実と10のウソ）』中，将质量定义为“属性的集合体”，并指出它与用户满意度、交付期、成本等是不同的方面。
:::

# 什么是软件质量？ISO/IEC 25010 定义的8个特性
国际标准规范 ISO/IEC 25010 将质量分为以下8个属性：

- 功能适合性（Functional suitability）  
- 性能效率（Performance efficiency）  
- 兼容性（Compatibility）  
- 可用性（Usability）  
- **可靠性（Reliability）**  
- 安全性（Security）  
- 可维护性（Maintainability）  
- 可移植性（Portability）  

#### 为什么在质量保证中重视可靠性（Reliability）
其中，可靠性指的是产品或系统在指定条件下能够稳定持续运行的能力。  
故障发生频率及影响的轻重、快速恢复能力是产品或系统的重要要素。  
在产品或系统中，软件能够持续提供预期功能的能力，就是可靠性的指标。

# 定量化软件可靠性的代表性指标
用于定量化可靠性的代表性指标有 **MTTF** 和 **缺陷收敛率**。

### 什么是 MTTF
指产品或系统的平均故障时间。取自 "Mean Time To Failure" 的首字母。

这是一个预测值，并非保证产品能一直运行到该时间。  
通常作为可靠性测试等的参考值，用以下公式表示。

**MTTF 计算公式**  
$$\text{MTTF} = \frac{\text{产品/系统的总运行时间}}{\text{故障数}}$$

**计算示例**  
- 产品运行时间：1000 小时  
- 故障数：5 次  
- MTTF = 1000 ÷ 5 = 200 小时  

**含义**  
表示平均每 200 小时发生一次故障。

MTTF 越长，产品或系统的可靠性越高。

### 缺陷收敛率的计算方法与应用要点
缺陷收敛率是指软件开发或测试过程中发现并修复的缺陷比例的指标。  
在软件质量管理领域，用于对测试或评审的进度进行定量评估。

缺陷收敛率通过以下公式计算。

**缺陷收敛率计算公式**  
$$\text{缺陷收敛率（%）} = \frac{\text{累计发现的缺陷数（期间内）}}{\text{估计总缺陷数（期间结束时的估计总数）}}$$

**要点**  
通过测试中发现的故障数以及使用软件可靠度增长模型，可以预测估计的总缺陷数。  
由此，可以对缺陷收敛的进展情况进行科学评估。

# 软件可靠度增长模型的正确使用方法｜作为质量保证手法的应用要点
软件可靠度增长模型是基于测试中发现的故障累积数进行分析的。  
因此，它是预测潜在故障数的典型质量保证手法。

作为可靠性评估的代表手段，被许多质量保证现场所使用。

❌ 错误示例：在横轴使用日期（软件可靠度增长模型的错误用法）

![横轴使用日期示例](/img/pm/QA_x-axis_represents_dates.png)

如果在横轴使用日期，则会包含未执行测试的期间。  
因此，故障发现的节奏会不准确，可靠性预测的精度会下降。

---

✅ 正确示例：在横轴使用测试时间（正确进行可靠性评估的软件可靠度增长模型应用示例）

![横轴使用测试时间示例](/img/pm/QA_x-axis_represents_test_time.png)

正确利用软件可靠度增长模型非常重要。  
错误的用法会大幅影响质量保证中可靠性评估的精度。

# 使用 SRATS 进行可靠性评估实践｜软件可靠度增长模型的应用方法
我经常使用名为 SRATS 的工具来进行可靠度增长曲线分析。

:::info SRATS2017 —— 软件可靠度增长模型介绍
[SRATS](https://swreliab.github.io/SRATS2017/index.html) (Software Reliability Assessment Tool on Spreadsheet Software) 是一种将软件可靠度增长模型在电子表格软件上进行处理的质量保证手法。  
它利用可靠度增长曲线来支持软件可靠性评估和测试进度管理。  
:::

## SRATS2017 概要
基于概率与统计理论，可以评估软件为正常运行所需的稳定程度，即软件的可靠性。

- 输入：故障数据  
  - 时间间隔（Time Interval）或累积时间（Cumulative Time）  
  - 故障数（Number of Failure）  
- 输出：软件可靠度增长模型  
  - 当前剩余的缺陷数（Predictive Residual Faults）  
  - 当前缺陷全部被移除的概率（Fault-Free Probability）  
  - 下一个故障被发现前的测试时间（Conditional MTTF）  

## SRATS2017 使用示例

### 故障数据输入（时间间隔·累积时间）
首先，从测试实绩中准备故障数据。

故障数根据 Redmine 或 JIRA 等问题管理系统中登记的故障数据生成。  
请根据报告的事件数量进行计数。

数据的输入方式有“时间间隔”和“累积时间”两种。  
时间单位可以是（工时）或（工日）等，只要在项目中统一即可。  
关键是持续使用同一单位进行测量。

示例）时间间隔（Time Interval 示例）  
| 测试实施日 | 时间间隔 | 故障数 |  
| :--- | :--- | :--- |  
| 2024年1月1日 | 24 | 3 |  
| 2024年1月2日 | 24 | 3 |  
| 2024年1月3日 | 24 | 3 |  
| 2024年1月4日 | 24 | 3 |  

该示例表示 3 人每日进行 8 小时测试，每日发现 3 次故障的情况。

示例）累积时间（Cumulative Time 示例）  
| 测试实施日 | 累积时间 | 故障数 |  
| :--- | :--- | :--- |  
| 2024年1月1日 | 24 | 3 |  
| 2024年1月2日 | 48 | 3 |  
| 2024年1月3日 | 72 | 3 |  
| 2024年1月4日 | 96 | 3 |  

在累积时间中，第 2 列为累计值，这是与“时间间隔”的区别。  
时间单位使用（工时），但（工日）或（工月）也可以。

### 模型选择与参数估计（基于 AIC/BIC 的评估）
接下来进行模型估计。  
选择故障数据的单元格，执行“Estimate”操作。

![参数估计界面](/img/pm/QA_SRATS_estimate.png)

模型估计后，会显示估计结果摘要（如 Gamma SRGM、Exponential SRGM 等）。

当 Status 为 “Convergence” 时，表示已估计出最符合数据的参数。  
而 “MaxIteration” 则表示参数估计未能正常完成。

在估计结果摘要中，AIC 或 BIC 值较小的模型即为最适合故障数据的模型。

### 可靠性报告的解读（剩余缺陷数・Fault-Free Probability・Conditional MTTF）
选择适合的模型后，输出报告并评估可靠性。  
该结果将作为将软件可靠度增长模型作为质量保证手法运行时的决策依据。

示例）软件可靠度增长模型  
![软件可靠度增长模型](/img/pm/QA_SRATS_software_reliability_growth_model.png)

当曲线接近水平时，意味着可靠度较高。

---

示例）故障预测  
![故障预测](/img/pm/QA_SRATS_faults_report_sample.png)

- Predictive Residual Faults  
  在示例中表示当前剩余的缺陷数为 1.2395 个。  
- Fault-Free Probability  
  表示当前缺陷已全部被移除的概率为 0.2895。  
- Conditional MTTF  
  表示若要发现下一个故障，则需经过 56.40 单位的测试时间。

质量保证负责人将依据这些指标来判断是否需要进行额外测试。

### 对软件可靠度增长模型的判断
以下示例演示如何通过软件可靠度增长模型（SRGM）判断故障是否收敛。

![测试初期阶段](/img/pm/QA_SRATS_SRGM_ealy_test_stage.png)

由于 SRGM 呈右肩上扬的形态，因此在测试初期阶段可以判断存在大量潜在故障。

---

![测试中期阶段](/img/pm/QA_SRATS_SRGM_middle_test_stage.png)

当 SRGM 曲线的斜率变得平缓时，表示故障数量虽在减少，但仍存在潜在故障。

---

![测试结束阶段](/img/pm/QA_SRATS_SRGM_closing_test_stage.png)

如果 SRGM 曲线的斜率接近水平，意味着发现新故障需要较长时间，可判断故障已收敛。

# 总结：SRGM只是质量管理的“强力一环”
软件可靠度增长模型是用数值支持可靠性评估的强大工具。  
但它并非质量管理的全部。

罗伯特·L·格拉斯说过“质量是属性的集合体”。  
软件可靠度增长模型不过是在质量保证的多样属性中，专门用于定量化“可靠性”的方法。

要想成功实施质量保证，不仅要考虑可靠性，还要顾及性能、可维护性、安全性等。  
应将软件可靠度增长模型作为质量保证整体的一部分，助力项目整体质量提升。

:::info
**本文是“能干的PM系列”的一部分**  
👉 [防止检查表形式化｜能干的PM的重构术与7项改进策略](https://developer.mamezou-tech.com/blogs/2025/07/10/pm_checklist_rebuild_and_improve/)  
👉 [避免形式化的例会推进方法｜能干的PM的7个改进步骤](https://developer.mamezou-tech.com/blogs/2025/07/18/pm_meeting_rebuild_and_improve/)  
👉 [任务得以消化的列表运营｜能干的PM的摆脱形式化技巧12选](https://developer.mamezou-tech.com/blogs/2025/07/24/issue_list_rebuilding_and_practical_tips_for_pms/)  
👉 [利用因果关系图的问题解决方法｜对现场改进有效的能干的PM的实践步骤](https://developer.mamezou-tech.com/blogs/2025/08/05/problem_solving_with_cause_effect_diagram/)  
👉 [利用未来实现树的中间目标推动现场｜能干的PM的改进计划术](https://developer.mamezou-tech.com/blogs/2025/08/14/improvement_plan_with_future_reality_tree/)  
👉 [流程改进的实践步骤｜能干的PM使用的IDEAL模型与成功秘诀](https://developer.mamezou-tech.com/blogs/2025/08/08/pm_process_improvement_ideal_model_and_practical_steps/)  
👉 [变更管理成功指南｜能干的PM实践的需求管理·配置管理·可追溯性应用法](https://developer.mamezou-tech.com/blogs/2025/08/20/pm_change_management_with_rm_cm_and_traceability/)  
:::
