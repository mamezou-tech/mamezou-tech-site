---
title: CCPM理论篇：即使是优秀团队也会失败？原因是“瓶颈”！学习CCPM基础的TOC
author: makoto-takahashi
date: 2025-05-09T00:00:00.000Z
tags:
  - ProjectManagement
  - プロジェクト管理
  - CCPM
  - TOC
translate: true

---

# 引言

“明明由优秀的成员按照计划进行，为什么项目却总是延迟，有时甚至失败……”  
在许多项目中，你是否也有过这样的经历？  
其根本原因或许就在于难以察觉的**“瓶颈（约束）”**。

关注这一“约束”的方法就是**CCPM（关键链项目管理）**。  
CCPM的导入案例还很少，可能并不为人所知，但就我个人经验而言，这是一种非常实用且有效的方法。

有位客户曾说：“除了CCPM之外，还能理解其他框架的项目经理更让人放心”。  
正因如此，CCPM虽然仍被视为罕见，但对真正理解它的人却充满信任感。

在项目管理领域，有PMBOK、Scrum、ITIL、CMMI、A-SPICE等多种框架和指南。  
在如此多样的方法中，为什么CCPM值得关注？  
接下来，我将为大家浅显易懂地解释其原因与背景。

CCPM是一种以TOC（约束理论）为基础的项目管理方法。  
TOC是“集中于约束以追求整体最优”的方法论，而CCPM则将其应用于项目的进度管理。  
这次，我们将介绍作为前提的TOC，特别是决定项目成败的**“约束”**的思路。

# 什么是TOC

> 约束理论（Theory of Constraints）的简称，是一个理论体系，通过集中管理约束来导出解决方案，以实现整体最优。  
> 从组织整体的“关联性”和“变异性”来看，一定能在某处发现约束。  
> 集中于约束并消除它，就能实现整体最优。  
> 此外，通过集中，还能在短时间内取得成果。

**引用来源：** TOC CLUB JAPAN「[什么是TOC](https://www.tocclub.net/about.html)」

只看这段说明，可能会对“约束”、“关联性”、“变异性”、“整体最优”等关键词感到有些难以理解，接下来将通过具体示例进行说明。

## 测验：车辆生产工厂示例

![车辆生产工厂示例：问题](/img/ccpm/constraints_question.png)

上图是对车辆生产工厂制造流程的简易示意。  
* 五角形箭头表示一个工序，流程从左向右进行  
* 从下向上，工序会汇合  
* 箭头左下的红色圆圈数字，表示该工序一天能生产出相当于1辆车所需部件的数量，即“生产能力”

那么，来做个测验！  
“检验”一天的处理能力为相当于8辆车，“轮胎制造”一天能生产9辆车所需的轮胎。  
在这家工厂，一天能作为整车完成的产量是多少辆车？

## 答案与解析

![车辆生产工厂示例：答案](/img/ccpm/constraints_answer.png)

正确答案是**4辆**。

原因在于“发动机制造”一天只能生产4辆车所需发动机，这里成为了**瓶颈**，也就是**约束**。  
即使前道工序准备了相当于7辆车的部件，如果发动机只有4辆车用，就无法再继续完成更多车辆。

在TOC中，这样的工序称为“约束（Constraint）”，约束决定了整体的处理能力。

:::info:补充说明
一系列的“关联”在TOC术语中称为“依赖事件（Dependent Events）”。
:::

## TOC中约束的特点

![约束的特点](/img/ccpm/constraints_key_characteristics.png)

* 约束的特点  
    * 库存堆积  
    * 后续工序被迫等待  
    * 处理耗时较长

## TOC的整体最优五步骤

在TOC中，提出了围绕约束开展改进的“五步骤”。  
该方法可应用于各种行业和业务。

1. **确定约束**  
    * 确定最限制整体成果的因素＝约束  
    * 示例：处理极其缓慢的机器或负责人  
2. **充分利用约束**  
    * 想办法让约束在现有条件下发挥最大作用  
    * 示例：提高稼动率、优先分配重要任务  
3. **让其他一切遵从约束**  
    * 为整体最优，其他工序需配合约束的节奏  
    * 示例：根据缓慢工序减少在制品  
4. **提升约束的能力**  
    * 通过投资或改革，提升约束本身的能力  
    * 示例：引入新设备、外包等  
5. **寻找下一个约束**  
    * 当当前约束被消除后，确定下一个约束并持续改进  

例如，将“发动机制造”的能力强化到一天可生产6辆车所需发动机后……

![车辆生产工厂的新约束](/img/ccpm/constraints_next.png)

下一个约束将是“内装部件装配”（1天5辆车所需量）。

# 在软件开发业务中的应用

在我主要咨询对象——软件开发业务中，TOC也非常有效。

![软件开发业务流程](/img/ccpm/constraints_software_workflow.png)

上图简要展示了从客户提出功能需求，到功能被实现并可供使用的流程。

在软件开发业务中，存在以下变动要素。  
![功能开发团队示意](/img/ccpm/constraints_software_team_image.png)  
* 所需功能的内容和数量每次都不同  
* 不一定由同一人来执行

:::info:补充说明
“随时变化的要素”在TOC中称为“统计变动（Statistical Fluctuation）”。
:::

# 确定软件开发业务的约束

在软件开发中，也可以运用TOC的约束特点来发现**瓶颈**。

![软件开发业务的约束](/img/ccpm/constraints_software_key_characteristics.png)

* 软件开发业务中的“约束特点”  
    * 任务或票据堆积  
    * 后续工序因等待前序成果物而停滞  
    * 从输入到输出的吞吐量较差

一旦确定了约束，就按照TOC原则进行应对即可。

# 总结

* 系统存在约束  
    * 只要存在“关联性”和“变异性”，就一定存在约束  
* 系统整体的处理能力由约束决定  
    * 某些要素限制着整体的处理能力  
* 集中于约束有助于实现整体最优  
    * 明确区分约束与非约束，集中于约束可提升成果  
* 对于非约束，有时也需要“什么都不做”的勇气（※这很难）  
    * 强化非约束可能会导致增加约束的库存等情况，反而恶化

下次作为“CCPM实战篇”，将在本次所学TOC思路的基础上，讲解具体的CCPM项目规划（进度编制与缓冲区设计）。  
敬请期待。
