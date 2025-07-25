---
title: 来聊聊统计学吧 - 软件质量的统计入门（No.12 假设检验：显著差异真的有意义吗？）
author: shuichi-takatsu
date: 2025-06-11T00:00:00.000Z
tags:
  - Analytics
  - ソフトウェア
  - 品質
  - 新人向け
image: true
translate: true
---

## 引言

到目前为止，为了“估计总体的趋势”，我们主要看了以下几种方法。  
- 从样本估计总体均值或总体比例  
- 表示估计值变动范围的“标准误差（SE）”  
- 以数值形式表示统计不确定性的“置信区间（Confidence Interval）”

这些都是关于以“多大精度”说明总体特征的**估计**。  
相比之下，这次要讨论的**假设检验**是一个**在统计上判断“是或否”**的工具。

“来聊聊统计学吧”系列第12回中，我们将以质量改进和A/B测试等实际应用为题材，解释假设检验的基本机制。

---

## 什么是假设检验？

到目前为止，我们基于均值或比例进行“估计”。  
例如，从样本均值估计总体均值，或者计算置信区间，并认为“真值可能位于该范围内”之类的情况。

但在实际工作中，下列这些提问不是更常见吗？  
- “方案A和方案B的数字有差别……那真的有意义吗？”  
- “据说评审时间有所改善，但那只是偶然吗？”  
- “能说这次实验的结果具有可重复性吗？”

就像这样，当想判断“是偶然的波动？还是确实存在差异？”时，就需要使用用于“判断差异是否偶然”的工具——**假设检验**。  
它是检验数字差异“是否真的有意义”的标准统计方法。

![](https://gyazo.com/fee2364f95aca674df2112d3e44b3e71.png)

---

## 假设检验的思路与结构

假设检验是一个统计化体系化的方法，用于判断“是可以用偶然解释？还是差异不能仅靠偶然解释？”。

在假设检验中，首先从“无差异”“无效果”的前提出发。这称为**原假设（$H_0$）**。  
与之相对，主张“存在差异”“具有效果”的是**备择假设（$H_1$）**。

### ● 假设检验的基本结构

检验的基本流程如下：

1. **提出原假设 $H_0$**  
   例：“新旧工具的缺陷检测率无差异”

2. **提出备择假设 $H_1$**  
   例：“新工具的缺陷检测率高于旧工具”

3. **评估在原假设 $H_0$ 下，观测数据有多“罕见”，以概率（P值）表示**

4. **如果该概率非常小（即罕见事件发生），则判断并拒绝原假设 $H_0$**

5. **结果上，支持备择假设 $H_1$**（即认为存在差异）

![](https://gyazo.com/489a2ea51db38ad1992c50181ca9eb18.png)

上图是用图示表示假设检验的基本思路。  
考虑观测到的统计量（此处为 z = 2.1）在标准正态分布中有多“罕见”。  
此时，如果其位于显著性水平（例如 5%）的“右侧尾部”，则判断“如此极端的结果不易由偶然产生”，并拒绝原假设。

:::info
在检验中重要的是以数值评估“观测数据有多极端”。  
此时使用的数值称为**检验统计量**（test statistic）。

检验统计量是：
- 从数据（样本）计算得到的数值，用于衡量**在原假设成立时，数据有多极端**的指标
- 将计算得到的检验统计量数值与 t 分布、Z 分布、F 分布、χ² 分布等对照以**导出 P 值**
- 检验统计量越**大（越极端）**，越难以支持原假设

以下是主要检验及其对应的检验统计量一览：

| 检验方法               | 检验统计量 | 主要含义与作用                                        | 对应分布       |
|------------------------|------------|------------------------------------------------------|--------------|
| **t 检验**             | t 值       | 均值差异 ÷ 样本标准误差（总体方差未知）               | t 分布       |
| **方差分析（ANOVA）**  | F 值       | 组间方差 ÷ 组内方差                                   | F 分布       |
| **卡方检验**           | χ² 值      | 将 (观测值 − 期望值)² ÷ 期望值 求和                   | 卡方分布     |

根据这些统计量在分布中的“位置”有多偏向两端，来判断“有多罕见（即 P 值是否小）”，并决定是否拒绝原假设。  
后文将详细介绍 t 检验、方差分析、卡方检验。
:::

### ● 判定量尺：“P 值”和“显著性水平”

- **P 值（p-value）** 是假设原假设成立时，“能得到与观测数据同样极端或更极端数据的概率”。  
    - 当 p 值 **很小（例如：0.01）** → “如此大的差异难以用偶然解释！” → 拒绝原假设  
    - 当 p 值 **较大（例如：0.45）** → “那种程度的差异也许偶然就会发生” → 无法拒绝原假设

- **显著性水平（α）** 是判断“多罕见的概率才不能归结为偶然”的基准。  
    - 通常使用 **0.05（5%）** 或 **0.01（1%）**。

- **判定规则**：  
    - P 值 < α：拒绝 $H_0$ → “统计上显著”  
    - P 值 ≥ α：不能拒绝 $H_0$ → “统计上不显著”

### ● 假设检验示例

以软件质量为例，考虑“引入新的编码规范”。此时可以如下设定假设：

- **原假设 $H_0$**：即使引入新的编码规范，缺陷引入率也不会改变  
- **备择假设 $H_1$**：引入新的编码规范后，缺陷引入率会下降

假设在旧流程（不引入新编码规范）中，缺陷引入率平均为“4.2%”。而在新流程（引入了新编码规范的流程）中，缺陷引入率平均为“3.7%”。  
此外，此时“标准误差（SE）”为 0.2%，并且通过差异检验（t 检验）得到的**p 值为 0.004**。  

那么，如何解读这一结果呢？  

- **原假设（$H_0$）**：“旧流程与新流程无差异（新规范无效果）”  
- **备择假设（$H_1$）**：“旧流程与新流程有差异（新规范有效果）”

→ **p 值 = 0.004 < 0.05**（显著性水平）

因此：  
- **拒绝原假设**  
- **支持备择假设（统计上显著）**

→ 可以判断“新的编码规范具有**统计学上显著的改进效果**”

但需要注意的是，差异只有 0.5%，**效应量较小**，在实际工作中需另行评估“这差异是否足够具有改进意义？”

:::info
**“统计上有显著差异”≠“在实际工作中有重要差异”**，这一点需注意。  
另一个需要注意的是，样本量越大，微小差异也易显著，因此同时查看效应量也很重要。  
如此，显著差异和有意义的差异（效应量）是不同的概念。  
（※效应量将在后续文章中详细介绍）
:::

### ● 假设检验小结

**假设检验通过拒绝“原假设”来相对地支持“备择假设”**。  
在假设检验中，检验方式看起来有些绕，但如果对此有疑问，可阅读 [此处](/blogs/2022/06/01/hypothesis-test/) 的文章，其中解释了为何假设检验要用这种方法进行检验。

---

## 检验的种类

检验（假设检验）有许多种类。以下是代表性的检验方法：
| 检验名                   | 用例                                         |
|--------------------------|----------------------------------------------|
| t 检验                   | 均值差异检验（小样本且总体方差未知时）       |
| 方差分析（ANOVA）        | 三组及以上均值差异检验（比较因素影响时）     |
| 卡方检验                 | 比例差异、拟合度、独立性检验（类别数据）     |
| z 检验                   | 均值或比例差异检验（样本量大且总体方差已知时） |
| Welch 的 t 检验          | 非等方差的两组均值差异检验                   |
| 配对 t 检验               | 同一对象前后比较等配对数据的均值差异检验     |
| Mann–Whitney U 检验      | 序数尺度或非正态分布数据中两组差异检验       |

如上所示，假设检验有很多种，但在实际工作中常用且作为统计分析基础的主要有以下三种：

- **t 检验**：比较两个均值差异的简单而基本的检验  
- **方差分析（ANOVA）**：比较三组及以上均值差异以评估因素影响的检验  
- **卡方检验**：对类别数据检验比例差异或独立性的检验  

这些方法使用场景广泛，也是其他检验的基础。接下来将依次详细介绍这三种检验。

### ● t 检验

**t 检验（t-test）** 是验证**两组的“均值”是否存在统计学差异**的方法。在软件工程领域中，也常用于 A/B 测试或新旧工具性能比较评估等场景。

#### t 检验的主要类型

##### 1. 单样本 t 检验
检验一组的均值是否与某个已知值（目标值、过往实绩等）不同。  
例：“新的构建系统的平均构建时间与目标 10 分钟在统计上是否存在差异？”

##### 2. 独立两样本 t 检验（独立两组比较）
检验两个相互独立的组的均值是否存在差异。  
例：“使用静态分析工具 A 的团队与使用工具 B 的团队在每个模块检测到的缺陷数量是否有差异？”  
（关于使用工具的检验方法说明，可参考 [此处](/blogs/2022/05/19/confirm-the-quality-improvement-effect/) 文章）

##### 3. 配对两样本 t 检验（配对比较）
检验同一对象在不同条件（如前后比较）下测量的两个均值是否有差异。  
例：“在进行重构前后，同一模块的环状复杂度平均值是否发生变化？”  
（关于使用工具的检验方法说明，可参考 [此处](/blogs/2022/05/20/corresponding-t-test/) 文章）

#### 补充说明

- 当需要处理**均值差异**时，这是使用最广泛的检验方法。  
- 检验统计量使用**t 值（t statistic）**，并基于 t 分布计算 P 值。

![](https://gyazo.com/a86d09be10983cb727b2bb42992512a4.png)

:::info
● 什么是自由度？  
在[第4回](/zh-cn/blogs/2025/05/30/lets_talk_statistics_shall_we_04/)中稍有提及，上图中出现了“**自由度**”一词。**自由度（degree of freedom）**是指**在计算统计量时“可以自由变化的数值个数”**。

例如，当三个数据的平均值已确定时，只要自由选择其中两个值，最后一个值就自动确定。  
如此，**当存在约束（如平均或总和）时，可自由移动的数据个数就会减少**。

- 使用 $n$ 个数据的平均值 → 自由度为 $n - 1$  
- 在 t 检验（两组均值比较）中，根据样本量计算自由度，并与 t 分布对照以求得 P 值。  
- 在方差分析或卡方检验中，也有各自对应的自由度。

**自由度是决定“使用哪种分布进行检验”的重要参数**。  
由于它与检验的可靠性直接相关，请务必掌握自由度的概念。  
如果对自由度感兴趣，可参考 [此处](/blogs/2022/06/20/degrees-of-freedom/)。
:::

#### 注意事项

有以下前提条件：  

- **总体方差未知**（在实际工作中大多如此）  
- **样本随机抽取**  
- **数据分布近似正态分布**（尤其在小样本时）  
- **两组方差相等**（※在 Welch t 检验中可放宽）

若这些条件不满足，请考虑使用**非参数检验**等替代方法。  
（后文将介绍非参数检验）

### ● 方差分析（ANOVA）

**方差分析（ANOVA: Analysis of Variance）** 是用于检验**三组及以上的均值是否存在统计学差异**的代表性检验方法。  
例：  
- 开发方法 A、B、C 三种情况下开发的软件平均缺陷密度是否有差异？  
- 多个测试团队间平均测试用例完成时间是否存在差异？  
（关于使用工具的检验方法说明，可参考 [此处](/blogs/2022/05/22/one-factor-analysis-of-variance/) 或 [此处](/blogs/2022/05/24/analysis-of-variance/) 的文章）

#### 基本思路

- 将整体数据的变异分解为“组间变异”和“组内变异”。  
- 若“组间变异”远大于“组内变异”，则判断“至少有一组的均值存在显著差异”。  
- 这种变异比率即**F统计量（F 值）（组间变异 ÷ 组内变异）**，并使用 F 分布计算 P 值。

![](https://gyazo.com/a5093c186191f9b9b96f2c3b70fa90e2.png)

#### 注意事项

- 即使 ANOVA 判定出“（整体上）存在差异”，也无法得知“具体哪些组之间存在差异”。  
- 需要进行**多重比较（post-hoc）**等附加分析以获得详细对比。

此外，还有以下前提条件：  
- **独立性**：各组观测值相互独立。  
- **正态性**：各组总体分布服从正态分布。  
- **等方差性（等方差假设）**：各组总体方差相等（或接近相等）。

若前提条件不满足，可采取以下对策：  
- 正态性存疑 → **非参数检验（如：Kruskal-Wallis 检验）**  
- 等方差性存疑 → **Welch 方差分析（Welch's ANOVA）**

:::stop
如果只是均值差异检验，可能会认为使用 t 检验即可。  
然而，如果对多个组重复使用 t 检验，“偶然看似有差异”的概率（即第一类错误）会累积（多重比较问题）。  
ANOVA 通过**一次检验评估整体均值差异**来规避此问题。  
若要比较的组数在 3 个及以上，原则上应使用 ANOVA。  
（ANOVA 也可用于两组比较，但一般更常用 t 检验）
:::

### ● 卡方检验（χ² 检验）

**卡方检验（χ² 检验）** 是用于检验**类别数据（名义尺度数据）中的“比例”或“关联性有无”**的代表性检验方法。  
它用于基于“是/否”或多选项问卷结果、按类别统计的数量等进行分析。

#### 用途

- 观测到的类别数据分布是否与预期的理论分布不同？  
- 两个类别变量是否存在关联（即独立性有无）？

#### 卡方检验的主要类型

##### 1. 独立性检验

检验两个类别变量是否相互关联（即是否不独立）。  
例：  
- 正在使用的操作系统（Windows、macOS、Linux）与特定错误信息的出现是否相关？  
- 评审参与人数（2 人、3 人、4 人以上）与重大缺陷发现率（发现/未发现）是否相关？

该检验使用**交叉列联表（分割表）**，通过比较各单元格的“观测频数”和“期望频数”来计算卡方统计量。

##### 2. 拟合度检验

检验观测到的类别数据比例是否与**预期的理论比例一致**。  
例： 发生的缺陷按类别分布（UI:30%、Logic:50%、Performance:20%）是否与全公司平均分布（UI:40%、Logic:40%、Performance:20%）有差异？  
（关于使用工具的检验方法说明，可参考 [此处](/blogs/2022/06/16/chi-square-goodness-of-fit-test/) 文章）

#### 检验统计量与分布

- 检验统计量：**χ² 值**（各单元格的“(观测值 − 期望值)² ÷ 期望值”之和）  
- 对应分布：**卡方分布（χ² 分布）**

![](https://gyazo.com/af11b7f4ba5d4129db714a83348a01e3.png)

#### 注意事项

- 若存在某些单元格期望频数非常小，则检验精度会降低，需要注意。

此外，还有以下前提条件：  
- **数据为类别型（定性变量）**：适用于非数值的“分类标签”或“组别”等**类别数据**。  
- **观测值独立**：各单元格的观测值需来自相互**独立的试验**。  
- **期望频数足够大**：所有单元格的**期望频数（expected count）**宜均 ≥5。（个别单元格可 <5，但当**超过20%的单元格期望频数 <5**时，检验可信度会降低）

若前提条件不满足，可考虑使用**Fisher 精确检验**等方法。

:::info
**期望频数**是指“在假设原假设成立的前提下，理论上预期的单元格值”。  
卡方检验评估“实际观测数据”与“期望值”之间的偏差程度。
:::

### ● 检验的使用区分

下面给出一个简易流程图，帮助选择应使用哪种检验方法。  

![](https://gyazo.com/9bfcc8b88f0a3ff0f8280a58dff797f1.png)

※此流程图仅作参考，各检验方法均有其前提条件。

---

## 常见误解与注意事项

“**p < 0.05 就有意义**”并非绝对。还需同时考虑**效应量（实际差异大小）**和**实际业务意义**。

### ● 即使统计上显著，也未必“重要”

即便 p 值为 0.01 或 0.001 等被认定为“有显著差异”的值，该差异**在业务上未必重要**。  
p 值仅表明“差异难以用偶然解释”，**差异有多大**以及**对现场有何影响**则是另一个问题。

> 例： 即便缺陷报告数的平均差异为**0.3 条**，如果对实际开发流程或用户体验的影响微乎其微，那么即使“统计上显著”，也可能是“**在实际工作中毫无意义的差异**”。

### ● 判断要点

- **p 值**：判断差异是否难以用偶然解释（即统计显著性）  
- **效应量（effect size）**：定量评估差异大小（如：Cohen's d 等）  
- **实际意义（practical significance）**：从现场影响与决策角度来看待该差异

:::info
p 值小 ≠ “存在了不起的差异”或“重要的差异”。  
同时考虑**统计显著性、效应量与实际意义**非常重要。
:::

---

## 正态性问题如何？

多数假设检验以“数据服从正态分布”为前提，因此该前提是否成立（即正态性）会影响结果的可靠性。

- 通过直方图或箱型图检查分布  
- 用偏度和峰度数值进行检查  
- 使用如 Shapiro–Wilk 检验的“正态性检验”

以下是主要正态性检验方法一览：  
| 检验名                                 | 特征                                           | 适用场景                                |
|----------------------------------------|-----------------------------------------------|----------------------------------------|
| **Shapiro–Wilk 检验**                  | 对小至中规模数据强，准确且被广泛使用。          | 常规正态性检验。样本量 <1000 最佳。      |
| **Kolmogorov–Smirnov 检验（K-S 检验）** | 比较整个分布形状，可定制。                     | 当总体分布明确指定时使用。             |
| **Anderson–Darling 检验**              | 改进 K-S 检验，对分布尾部更敏感。              | 想更严格评估正态性时使用。              |
| **Jarque–Bera 检验**                   | 基于偏度（Skewness）和峰度（Kurtosis）进行判定。 | 回归分析残差正态性检验等。               |
| **D’Agostino’s K-squared 检验**        | 与 Shapiro 相似，但对大规模数据更有优势。       | 样本量多时（数百至数千）。               |

:::info
关于正态性检验，这里只需理解为“用于确认数据是否服从正态分布的方法”即可。  
:::

简易使用指南：  
| 样本量              | 推荐检验                                 |
|--------------------|-----------------------------------------|
| 少量（n < 50）     | Shapiro–Wilk 检验                       |
| 中量（n ≈ 50–500）  | Anderson–Darling 检验、D’Agostino’s K-squared 检验 |
| 大量（n > 1000）   | Jarque–Bera 检验、Kolmogorov–Smirnov 检验（需谨慎使用） |

注意：  
- p 值小 → 拒绝正态性  
- p 值大 → 无法拒绝正态性

但需注意，在大规模数据下“检出力过强”，即使微小差异也可能被拒绝。实际工作中建议结合直方图或 Q–Q 图等可视化手段一起使用。

:::info
**Q–Q 图（Quantile-Quantile Plot）** 是一种用于直观确认数据是否服从特定理论分布（如正态分布）的图表。  
它将数据分位点与理论分布分位点进行比较，如果点大致排列在直线上，则判断数据服从该分布。  
常用于检查正态性等假设检验前提条件。  
:::

## 当正态性不满足时

如前所述，许多假设检验（如 t 检验、方差分析等）都以**“数据服从正态分布”为前提**。  
但实际数据不一定满足正态分布，在以下情况下该前提可能不成立：

- 数据存在偏斜或分布形状失真  
- 存在顺序但间隔不等的顺序尺度数据  
- 包含极端离群值导致均值受到影响

此时，**非参数检验(不依赖特定分布的检验)** 会更有效。

### ● 什么是非参数检验？

非参数检验是不需假定特定分布（如正态分布）即可进行的检验方法，具有以下特点：

- **不依赖概率分布前提**（distribution-free）  
- 基于**秩或中位数**，对**离群值鲁棒**  
- 也可用于**顺序数据或量表不一致的数据**

### ● 常用非参数检验

| 检验名                        | 对应的参数检验               | 主要用途                                 |
|------------------------------|------------------------------|-----------------------------------------|
| **Wilcoxon 符号秩检验**      | 配对 t 检验                  | 同一对象两条件间差异检验               |
| **Mann–Whitney U 检验**      | 独立两样本 t 检验            | 独立两组中位数差异检验                 |
| **Kruskal–Wallis 检验**      | 方差分析（ANOVA）            | 三组及以上独立群差异检验              |
| **Friedman 检验**            | 配对方差分析                 | 同一对象三个及以上条件的比较          |

非参数检验不是因“分布前提不成立”而放弃检验，而是可作为**更实际的选择**的重要方法。

:::info
非参数检验因其对分布假定少，是一种**灵活且方便**的方法。  
但并非“任何时候都可使用非参数检验”。其中一个原因是**“检出力（Statistical Power）”**。

 ● 什么是检出力？  
指“当实际上存在差异时，检验正确检测出差异的概率”。  
检出力低时，有**漏检真实差异（第二类错误）**的高风险。

 ● 参数检验的优势（条件满足时）  
当数据确实服从正态分布等参数检验前提成立时，**参数检验通常比非参数检验具有更高的检出力**。  
即在相同数据量下，更易检测出微小差异。

 ● 权衡  
非参数检验虽“假设少”，但**检出力可能降低**，若盲目依赖非参数检验，可能**漏检本可检测到的重要差异**。

 ● 结论  
需充分了解数据特性（如分布或离群值影响），  
- 若条件满足则选 **参数检验**  
- 若条件不满足则选 **非参数检验**

这种区分使用是**统计上更明智的选择**。  
:::

---

## 实际应用示例

- **缺陷修复前后的比较**：  
  修复后平均缺陷数量是否显著减少？

- **UI 更改带来的工作时间**：  
  新 UI 下操作时间是否有显著缩短？

- **评审指出数的变化**：  
  通过 t 检验验证引入配对评审前后平均指出数是否存在差异

:::alert
**注意事项**  
使用假设检验时，请注意以下前提条件：

- 样本须随机抽取  
- 样本彼此具有充分独立性  
- 分布假设（如正态性、等方差性）需成立

若这些前提被破坏，可能导致对 p 值或显著差异的解读出现错误。  
:::

### ● 统计显著性与实际意义

- 即便统计结果显示“存在差异”，是否在实际工作中“有意义”则是另一回事。  
- 统计仅是**决策依据的一部分**。  
  在实际中，需要在**成本、影响范围、可重复性**等其他因素之间进行平衡，以做出决策。

---

## 总结

假设检验是统计判断“数据中是否存在有意义差异”的重要方法。  
只要正确理解并使用，就能避免误判，实现高可靠性的分析。

### ● 假设检验流程
- 明确提出**原假设**与**备择假设**  
- 计算检验统计量，并求得**P 值**  
- 与**显著性水平（如：5%）**比较，判断是否统计显著

### ● 需要注意的要点
- **存在显著差异**不等于**在实践中重要**（也要考虑效应量及实用性）  
- 注意**正态性前提**以及**样本量与抽样方法**  
- 适当选择检验类型（如 t 检验、方差分析、卡方检验等）

统计不仅是检测“有无差异”，也是洞察“差异意义大小”的工具。  
假设检验虽非万能，但若深入理解并正确使用，将是一种强有力的武器。

---

## 下回预告

下回将探讨“相关”与“因果”的区别。

[在此处总结了统计相关信息。](/analytics/)

希望对您的数据分析有所帮助。

<style>
img {{
    border: 1px gray solid;
}}
</style>
