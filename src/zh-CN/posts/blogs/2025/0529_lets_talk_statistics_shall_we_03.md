---
title: 让我们来谈谈统计吧 - 用于软件质量的统计入门（No.3 代表值的使用区别：平均值・中位数・众数）
author: shuichi-takatsu
date: 2025-05-29T00:00:00.000Z
tags:
  - Analytics
  - ソフトウェア
  - 品質
  - 新人向け
image: true
translate: true

---

## 引言

“让我们来谈谈统计吧”第3回将讨论“代表值的使用区别”。

世上充满了数据。  
“数据的中心该如何表达呢？”  
这是统计学最基本的问题之一。

在处理质量数据时，经常使用“平均值”，但仅凭这一点真的能做出合适的判断吗？

其实，“平均值·中位数·众数”各自具有不同的特点，如果使用不当，可能会引发误解。  
本期将结合软件质量的实际案例，轻松解说**代表值的差异及使用技巧**。

---

## 什么是代表值？

“代表值”是指在某组数据分布中，能够表示中心趋势的数值。  
统计学中常用的3种代表值如下：

| 种类     | 说明                           | 使用示例（软件质量）         |
|----------|--------------------------------|------------------------------|
| 平均值   | 全部数据之和 ÷ 数据个数        | 缺陷修复所需平均天数         |
| 中位数   | 从小到大排列时的中间值         | 测试用例执行时间的中位数     |
| 众数     | 出现最频繁的值                 | 最常见的错误代码             |

---

## 平均值：大家都喜欢，但“要注意”

平均值通过“全部数据之和 ÷ 数据个数”来计算。

### ● 特点
- 简单易计算，直观易懂  
- 能用一个数值表示整体趋势  
- 可在 Excel、Python 等工具中自动计算，常作为汇总的第一步  

实际工作中，常常有“**先算出平均值再说**”的做法，但这并不一定是最优选择。

### ● **易受异常值影响**

平均值对所有数据都“同等”对待，因此当存在**极端值（异常值）**时，平均值会很容易被牵引偏移。

#### 例：测试执行时间（秒）

让我们来看下面这个测试执行时间（秒）的例子。  
```
20, 22, 21, 19, 105
```
- **平均值：`37.4` 秒**  
- 中位数：`21` 秒

![测试执行时间的分布（直方图）](https://gyazo.com/a2b0a59b87e63cafbd8dd614f87b0778.png)

:::info
※直方图是一种用条形高度表示数据分布状况（各数值出现频率）的图表。  
通过将各数值区间（bin）的数量可视化，可一目了然地了解是否存在偏态、异常值影响、中心趋势和离散程度。  
在软件质量领域，直方图对于把握测试执行时间、评审所需时间、缺陷数量等时间或数量的分布非常有效。  
:::

在这种情况下，1条异常长的执行时间（105秒）大幅拉高了平均值。  
在实际工作中，当有人说“平均37秒”时，很难说这能真实反映整体情况，不是吗？

这是**在数据不符合正态分布(※1)时使用平均值的风险**的典型案例。

:::info
※1：“正态分布”是指大部分数据集中在平均值附近，呈左右对称的“山形分布”。  
  本系列后面会详细说明，这里只需要理解为“**极端小或极端大值很少，数据集中在中心附近的状态**”即可。  
:::

### ● 在实际工作中的注意事项

- 在修复工时、测试时间、评审所需时间等中，若**少部分存在极端值**，仅用平均值判断容易导致“高估或低估”  
- 在将平均值作为 KPI(※2) 或 SLA(※3) 的标准时，最好**与中位数或百分位数**(※4) 结合使用  
- 在质量管理现场，也不乏“报告平均值时收到投诉！”的情况  

:::info
※2：KPI（Key Performance Indicator）→关键绩效指标。用于衡量项目或业务达成度的数值目标。（例：缺陷修复平均天数、评审完成率等）  
※3：SLA（Service Level Agreement）→服务等级协议。在服务提供者与使用者之间就服务质量达成的协议指标。（例：故障响应的初动时间或修复完成时间等）  
※4：百分位数（Percentile）→将数据按从小到大排序后，表示位于从底部数第几%的指标。（例：若 90 百分位数（P90）为 20 秒，则表示“90% 的测试用例在 20 秒内完成”。）  
:::

### ● 何时适合使用平均值？

- **数值未严重偏倚（即分布呈对称）**  
- **想粗略掌握整体情况**  
- **想在多个团队或流程间进行比较**  

在上述情况下，平均值非常有效。  
但原则上在使用前**必须确认数据分布**！

### 补充：平均值的种类

事实上，“平均值”有多种类型：

| 平均类型   | 特点                          | 用途示例                        |
|------------|-------------------------------|---------------------------------|
| 算术平均   | 最常见。合计 ÷ 项目数          | 工时、实际值等的日常平均         |
| 加权平均   | 加权（反映重要度或项目数）     | 按团队的缺陷数计算平均等         |
| 几何平均   | 用于倍数、增长率等             | 性能评估（如：处理速度）等      |

![各团队评审指出率与加权平均](https://gyazo.com/15901e97133e883b9821c3db6dbf2278.png)

例如，在对各团队的评审件数取平均时，使用加权平均，按照“各团队的件数”赋予权重，可获得更公平的评估。

---

## 中位数：在有较大波动时的“安心代表”

中位数（median）是指将数据按从小到大排序后处于“正中间的值”。  
由于它位于“整体恰好50%的数据小于或大于该值”的位置，因此在把握分布中心时是非常稳定的指标。

### ● 特点
- 因为取排列后的“中间值”，所以**不容易受异常值影响**  
- 对**偏态数据**和**非正态分布**尤为有效  
- 即使观测数据较少也有意义（例如：奇数或偶数个数据均可计算）  

#### 例：测试执行时间（与平均值示例相同）

对与平均值示例相同的 `[20, 22, 21, 19, 105]`，中位数为 `21`。  
- 平均值：`37.4` 秒  
- **中位数：`21` 秒**  

![测试执行时间的箱线图](https://gyazo.com/70dea722dbe3394dbf97ddf0b89ae554.png)

:::info
※箱线图（Boxplot）是一种可一目了然地了解数据分布、波动及是否存在异常值的图表。  
箱体表示“中间50%的范围（四分位距）”，线（须）表示数据的扩展程度，箱体外的点或线路表示“异常值”。  
在实际工作中，对于处理时间、工时等波动评估和异常值检测非常有帮助。  
:::

如此一来，即使有 105 这样极端的大值，中位数仍不易受其影响，作为**“典型值”**具有较高的可靠性。

### ● 在实际工作中的应用
- 在**测试执行时间和评审所需时间**等差异较大的流程中，当需要得出“代表值”时，中位数更能反映真实情况  
- 对**客户处理件数、咨询响应时间**等，使用中位数也能避免因“极端长时间响应”导致的高估  
- 在**各流程的绩效比较**等场景下，中位数也能更好地“吸收极端的人员差异”  

例如，当“评审平均时间：100 分”和“中位数：35 分”时，实际情况可能是大多数评审在约 35 分钟内完成，只有极少数长时间评审拉高了平均值。

### ● 建议将中位数作为“安心指标”
- 即使是初学者也容易理解其概念  
- 不会大幅扭曲数据的分布情况  
- 与平均值一起报告时，可作为**传达分布偏倚**的提示  

---

## 众数：最适合模式识别

众数（mode）是数据中**出现最频繁的值**。  
与平均值和中位数不同，它直接展示“哪个值出现得最频繁”，是**把握典型模式的优秀指标**。

### ● 特点
- 关注出现最频繁的值  
- 对**类别型**或**离散数值**数据特别有效  
- 可说它不是衡量分布的中心，而是捕捉“分布峰顶”  

#### 例：缺陷修复所需天数（日）

让我们来看下面这个缺陷修复所需天数的例子。  
```
1, 2, 1, 1, 5, 3
```

如果缺陷修复所需天数为 `[1, 2, 1, 1, 5, 3]`，则众数为 `1`。  
- 平均值：`2.2`  
- 中位数：`1.5`  
- 众数：`1`

![缺陷修复所需天数的频率](https://gyazo.com/5cd46ef2e8edeb15644ee2e836db112b.png)

表示“1 天内可修复的缺陷数量最多”。

### ● 实际应用
- **出现最多的缺陷类型**（例如：UI 相关缺陷最多）  
- **常见的修复工作量**（例如：多数修复在 1 天内完成）  
- **把握典型所需时间和常见评审指出项**  

等，非常适合**把握重复出现的模式**。  
尤其在把握各分类/类别趋势时，众数是直观易懂的指标。

例如，将评审评论内容按类别汇总后，如果“命名规则违规”是众数，则可能需要对该方面进行规则再培训。

### ● 注意事项与局限
- 在众数**有多个**的情况下（如双峰分布等）需注意处理方式  
- **在连续数据中难以使用**（也可通过分级后在直方图中查看）  
- 与平均值和中位数不同，**不一定能反映整体分布形状**  

---

## 如何进行区分？：实际判断视角

代表值并非只能固定使用单一指标，**应根据数据特性和判断目的进行区分使用**。  
以下是一些常见的判断标准示例。

| 目的               | 适用代表值 | 理由                                                                                  |
|--------------------|-----------|---------------------------------------------------------------------------------------|
| 想要展示一般趋势   | 平均值    | 通过将所有值求和后除以数据量，可获得“粗略的中心趋势”                                   |
| 关注异常值         | 中位数    | 取排序后的中间值，因此不易受极端值影响，较为稳定                                      |
| 想知道最常见的情况 | 众数      | 显示出现最频繁的值，适用于把握“典型模式”和分类分布                                   |

### ● 补充：各自的局限与建议组合使用
- **平均值**：易受异常值影响。由于汇总所有值后再除以数据量，一个异常值可能大幅牵引平均值。数据分布偏时需注意。  
- **中位数**：仅关注中间值，因此不易受极端值影响，这是它的优点。但另一方面，它不反映“上方和下方差距有多大（离散程度）”。  
- **众数**：关注“出现最频繁的值”，是个简单的指标。但在某些情况下，如“值分散严重而不存在众数”或“多个值出现次数相同，存在多个众数（如双峰分布）”时，它的适用性会受限。  

因此，通过**同时展示平均值+中位数+众数**，即可从多角度把握数据分布和趋势。  
在实际工作中，不仅要展示平均值，还要“补充中位数和百分位数”，这是防止误解和盲目信赖的第一步。

---

## 用可视化来理解：直方图与代表值的关系

实际绘制直方图后，可可视化地比较**平均值·中位数·众数**在分布中的位置。

### 正态分布：三者位置几乎一致

在正态分布中，平均值、中位数和众数几乎位于相同位置。

![正态分布中代表值的位置](https://gyazo.com/7c4748e4ae30578a7dfb703daf655869.png)

### 偏态分布：只有平均值易偏移

对于右偏分布（存在异常值），平均值会被异常值向右拉动，与中位数和众数产生偏差。

![偏态分布中代表值的偏移](https://gyazo.com/83158a675bbf19e7c63b3a29a11b908a.png)

---

## 总结

- 代表值分为三类：“平均值”、“中位数”、“众数”  
- 平均值虽方便，却易受异常值影响  
- 中位数稳定，抗离散能力强  
- 众数适合表示“常见模式”  
- 根据数据特性和目的进行区分使用非常重要

---

## 下期预告

下期将以“把握离散”为主题，利用直方图和箱线图，探讨**方差·标准差·范围**等“离散指标”。

[在这里汇总了统计相关信息。](/analytics/)

希望能助力您的数据分析。

<style>
img {
    border: 1px gray solid;
}
</style>
