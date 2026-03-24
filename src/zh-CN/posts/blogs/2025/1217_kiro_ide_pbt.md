---
title: 使用 Kiro 开启基于属性的测试：揭示意料之外的问题
author: hironori-maruoka
date: 2025-12-17T00:00:00.000Z
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2025/
tags:
  - Kiro
  - PBT
  - テスト
  - 品質保証
  - advent2025
image: true
translate: true

---

这是[is开发者网站Advent日历2025](/events/advent-calendar/2025/)第17天的文章。

## 1. 引言：为什么现在要尝试 PBT

属性驱动测试（以下简称 PBT）是一种**针对从规格中提取出的“应满足的属性（property）”，对任意输入、状态及操作序列进行验证**的测试方法。PBT 已知与传统的基于案例的测试（EBT）存在**相互补充的关系**[^2]。

老实说，仅凭这段说明，很多人可能无法豁然开朗。我自己也一直对其感兴趣，但由于觉得将应满足的行为形式化很困难，实施成本也很高，一直没下手实践。

然而，在 2025 年 11 月 17 日 GA 发布的 **Kiro** 中，作为 IDE 功能引入了**“通过属性驱动测试对规格进行正确性验证”**[^5]。由于这一新功能似乎降低了 PBT 导入的门槛，**于是决定亲自动手体验一番**。

有关 Kiro 的 PBT 功能，请参阅官方文档“[Correctness with Property-based tests](https://kiro.dev/docs/specs/correctness/)”。

---

## 2. 为什么要使用 PBT：与 EBT 的决定性差异

在书籍『実践プロパティベーステスト』[^1]中，对 PBT 的特点作了如下说明。

> 这不是为了测试而书写大量示例，也不是生成用来投入代码的随机数据，而是一种用于发现代码中潜藏的、意想不到的新 bug 的方法

让我们通过具体示例来思考。在传统的基于案例的测试（EBT）中，我们会验证“1 加 3 得到 4”这样的特定示例。而在 PBT 中，则定义了“无论哪个数字加上另一个数字，交换顺序后相加的结果都应相同”这一普遍性质。

![EBT 与 PBT 的区别](/img/blogs/2025/1217_kiro_ide_pbt/EBT_vs_PBT.png)

左图为 EBT，右图为 PBT 的示意。EBT 是手动创建并验证测试用例，而 PBT 则是定义属性并使用随机输入进行验证。

也就是说，EBT 对**可预测的 bug**更为有效，而 PBT 则有可能发现**无法预料的 bug**。这一差异将在后文的 UI 显示测试中得以体现。

---

## 3. 选择“工单管理”作为题材的原因

作为有关 Kiro + PBT 的解读文章，有一篇以“房间移动游戏”为题材的 Medium 文章[^4]。

这个游戏由于以下结构，非常适合 PBT。

```
状态 × 操作 × 不变条件（Property）
```

我认为同样的结构在**业务应用**中也经常出现，因此这次以“工单管理”这个示例作为题材。

工单管理具有以下特征。

* 状态转换的约束
* 终态的不变条件
* 重执行和顺序依赖性
* 异常场景的保障

这些都是**在基于案例的测试中难以捕捉，但与 PBT 非常契合的性质**。因此，我在考虑到实际应用的前提下选择了工单管理作为题材。

---

## 4. 规格：极为简单的工单管理

这次，我特意将规格简化到极致。

### 工单的状态

```text
Status = { Open, InProgress, Done }
```

* 仅限上述三个

### 允许的状态转换

```text
Open        → InProgress
InProgress  → Done
```

* 除上述转换外的所有转换均无效
* Done 是终态，不接受任何操作

将这一最小规格输入到 Kiro 中。

---

## 5. 使用 Kiro 执行基于属性的测试

### 5-1. 生成需求文档（requirements.md）

首先，在 Kiro IDE 中输入以下需求。

```
- 创建基于 GUI 的简易工单管理应用
- 无需持久化，仅作为验证用的最小化应用
- 工单必须始终处于三种状态之一
- 状态仅可单方向转换：「未处理→处理中→完成」
- 从完成状态无法转换到其他状态
- 状态更新通过点击按钮进行切换
- 功能仅限于创建、列表和状态更新
- 希望将状态转换规则作为不变条件，通过 PBT 进行验证
```

输出了如下需求文档。  
**验收标准采用 EARS 记法[^6]（“Easy Approach to Requirements Syntax：需求定义的语法规则”），并被清晰地语言化**。

```markdown:需求文档摘录
### 需求3

**用户故事：** 作为用户，我想更新工单的状态，以便准确反映工作进度。

#### 验收标准

1. WHEN 用户按下未处理工单的状态更新按钮 THEN Ticket_System SHALL 将该工单更改为处理中状态
2. WHEN 用户按下处理中工单的状态更新按钮 THEN Ticket_System SHALL 将该工单更改为完成状态
3. WHEN 工单处于完成状态时 THEN Ticket_System SHALL 禁用状态更新按钮
4. WHEN 执行状态转换时 THEN Ticket_System SHALL 仅允许未处理到处理中、处理中到完成的顺序
5. WHEN 对完成状态的工单尝试进行状态更改时 THEN Ticket_System SHALL 拒绝该操作并保持当前状态
```

特别值得关注的是，将无效转换拒绝、在完成状态无法操作、状态转换的顺序约束等**与后续属性定义相连的描述**阐明得非常清晰。

---

### 5-2. 设计文档（design.md）与属性定义

在生成设计文档时，Kiro 宣告：

> 已创建了设计文档的前半部分。接下来，将在对验收标准进行分析后定义正确性属性。

![Kiro IDE 输出设计文档和 Property 定义](/img/blogs/2025/1217_kiro_ide_pbt/kiro_ide_design.png)

以下是输出结果的摘录。  
**属性被作为设计成果物明确输出**。

```markdown:设计文档摘录
### 属性1: 工单创建时的初始状态
*对于任意*有效的标题，当创建新工单时，该工单始终以未处理状态创建

### 属性2: 创建工单时的列表添加
*对于任意*工单列表和有效的标题，当创建新工单时，列表大小增加 1，并且新工单包含在列表中

### 属性3: 工单显示内容的完整性
*对于任意*工单，其渲染结果包含标题和当前状态信息

### 属性4: 有效状态转换的执行
*对于任意*工单和有效的转换（未处理→处理中、处理中→完成），执行状态更新操作后，工单状态变更为期望的下一个状态

### 属性5: 拒绝无效状态转换
*对于任意*工单和无效转换，执行状态更新操作后，工单状态不发生改变

### 属性6: 完成状态下的操作禁用
*对于任意*完成状态的工单，状态更新按钮应被禁用，无法执行操作

### 属性7: 系统不变条件的维护
*对于任意*操作（创建、状态更新）执行后，系统内的所有工单应保持在有效状态（未处理、处理中、完成之一）
```

结果不仅定义了状态转换，还包含初始状态的不变性、显示内容的完整性、系统整体不变条件等，**共定义了 7 条并非人们明确要求的属性**。

---

### 5-3. 实现计划（tasks.md）与属性的可追溯性

输出了如下实现计划。

```markdown:实现计划摘录
- [ ] 2. 业务逻辑层
  - [ ] 2.1 创建状态转换逻辑测试
    - **属性4: 有效状态转换的执行** (需求 3.1, 3.2, 3.4)
    - **属性5: 拒绝无效状态转换** (需求 3.5, 4.2)
    - _需求: 3.1, 3.2, 3.4, 3.5, 4.2_

  - [ ] 2.2 实现状态转换函数
    - 有效转换判断逻辑
    - 状态更新处理的实现
    - 测试执行与通过确认
    - _需求: 3.1, 3.2, 3.4, 3.5_
```

在 tasks.md 中，Property、需求、测试及实现任务被关联起来，**“为什么存在这项测试”**得以追溯。

此外，由于采用了 TDD 的测试优先原则，自然而然形成了以下流程：

> 创建测试 → 实现

关于使用 TDD 的 AI 驱动开发，请参阅以下文章。

@[og](https://developer.mamezou-tech.com/blogs/2025/11/28/qdev-aidd-spec-kit/)

---

### 5-4. 实现与 PBT 的具体示例

状态转换的属性已使用 fast-check[^3] 实现为 PBT。

下面提供所编写的测试代码示例。针对任意标题和任意有效状态，验证**转换性质必然成立**。

```typescript:TypeScript 与 fast-check 测试代码示例
test('从未处理到处理中转换正确执行', () => {
  fc.assert(
    fc.property(validTitleArb, (title) => {
      const ticket: Ticket = {
        title,
        status: TicketStatus.PENDING
      };

      // 从未处理到处理中转换是有效的
      const isValid = isValidTransition(ticket.status, TicketStatus.IN_PROGRESS);
      const nextStatus = getNextStatus(ticket.status);

      expect(isValid).toBe(true);
      expect(nextStatus).toBe(TicketStatus.IN_PROGRESS);
    }),
    { numRuns: 100 }
  );
});
```

---

### 5-5. 运行验证

在完成的界面中，注册了几个工单，并尝试触发错误，进行了运行验证。

![已实现的工单管理应用的运行验证](/img/blogs/2025/1217_kiro_ide_pbt/react_application_demo.png)

---

## 6. 总结：使用 Kiro 实现 PBT 后的收获

老实说，**仅凭状态转换很难体会到 PBT 的强大之处**。因为这次的状态转换规则非常简单，基于案例的测试也能充分验证。

然而，在与 UI 显示相关的属性测试中，情况则完全不同。

### 意料之外的发现

在工单标题显示的属性测试中，  
发现连续空格会被 HTML 规范化，  
对于前后空格或仅含空格的标题的处理也存在模糊性，  
以及其他**作为规格并未考虑到的问题**被检测出来。

我认为这些问题在手动测试或基于案例的测试中，几乎不会被纳入测试视角。

通过这次经验，我深刻体会到，**PBT 的价值不在于“进行全面的尝试”，而在于“揭示出人们未曾设想的输入与前提”**。

---

## 7. 结语

通过使用 Kiro，我体会到了以下几点。

* PBT 导入的心理和实现门槛确实降低了。
* 可以以属性为核心，将规格、设计与测试连接起来。

此次是在单元级别，  
**在集成测试或系统测试中加以利用**似乎也具有价值。

本次使用的代码仓库已在以下地址公开。  
（可能会在未预告的情况下停止公开）

@[og](https://github.com/hironori-maruoka/kiro-pbt-sample)

[^1]: Fred Hebert, Leonid Rozenberg. [実践プロパティベーステスト ― PropErとErlang/Elixirではじめよう](https://www.lambdanote.com/products/proper). LambdaNote, 2023.
[^2]: Takuto Wada. [Property-based Testing 的定位 / Intro to Property-based Testing](https://speakerdeck.com/twada/intro-to-property-based-testing). Speaker Deck.
[^3]: fast-check. [fast-check](https://fast-check.dev/).
[^4]: Matheus Evangelista. [Building Smarter with Kiro: A Hands-On Look at Property-Based Testing](https://medium.com/@codingmatheus/building-smarter-with-kiro-a-hands-on-look-at-property-based-testing-76fab8f00cc4). Medium, 2025.
[^5]: Amazon Web Services. [Kiro：采用生成 AI 强化 IDE 与命令行功能的新工具已正式提供](https://aws.amazon.com/jp/blogs/news/general-availability/). AWS 博客, 2025.
[^6]: Alistair Mavin. [EARS: The Easy Approach to Requirements Syntax](https://alistairmavin.com/ears/).
