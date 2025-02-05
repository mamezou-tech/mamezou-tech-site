---
title: 将突变测试嵌入开发过程的思考
author: shinichiro-iwaki
date: 2024-12-26T00:00:00.000Z
tags:
  - ミューテーションテスト
  - PIT
  - PiTest
  - テスト
image: true
translate: true

---

[在上一篇文章](/blogs/2024/12/03/mutation-testing/)中，我介绍了Java的突变测试工具PIT(PiTest)[^1]。突变测试是一项在评估测试质量方面非常有前景的技术，并且通过使用PIT，不需要额外复杂的配置，我们就可以轻松地对测试进行评估。  
然而，由于它采用的是机械式地引入变异的方式，如果要在日常开发中使用，则有必要对某些事项进行细致考虑。接下来，我们以[此前的文章中](/blogs/2023/05/11/flaky-test-allure/)使用的“常见示例应用程序”为主题，一起探讨实现理想状态的方法。  

[^1]: 如果您关注过之前的日程安排，或许已经注意到了，本篇文章的标题是原定于圣诞日历第3天发布的文章标题——本来计划将此次讨论内容合并到上一篇文章里。然而由于篇幅可能过大，最终决定将其拆分为两篇文章来讨论。

本文的代码示例可在[Gitlab 仓库](https://gitlab.com/shinichiro-iwaki/testexample/)中获取，对此感兴趣的读者可以参考利用。

## 开发的预期场景
在进行发布前，为对测试的充分性进行评估，我们使用PiTest对“常见示例应用程序”执行突变测试(即解析)，并补充了不足的测试用例。能够在发布前检测到测试的不足之处无疑是好事，但在最后阶段因测试不足而匆忙补充却绝对会令人心神不宁。在日常开发中，我们希望能够即时检测出测试的不足，从而能够从容地进行发布。  
事实上，运行PiTest需要花费数十秒的时间。如果在开发的初期阶段测试数量较少，每次运行都耗费这么长时间会有些危险[^2]。因此，我们决定重新审视PiTest的配置，以探讨其是否可以在日常开发中高效无压力地使用。

[^2]: 以本次示例应用为例，包含了使用Pact broker的契约测试等耗时较长的测试。尽管如此，截至上一篇文章发布时，测试目标类仅有4个，测试类数也只有2个，但依然需要消耗数十秒的时间。可以想象，当测试目标达到数百类时，其运行时间可能会从几分钟延长到数小时。如果测试运行时间达到了1小时，在发布前此类情况尚能接受，但在日常开发中使用无疑会令人望而却步。

![Execution Time](/img/blogs/2024/1226_mutation-optimization/execution-time.jpg)

## 测试运行时间的组成
如[上篇文章](/blogs/2023/12/03/mutation-testing/#ミューテーションテストとは)所述，突变测试的实现方式是通过机械地修改被测试对象，然后运行测试。因此，从简单的角度来看[^3]，“可被修改的位置”、“添加的变异内容”和“(原始)测试的运行时间”相乘即为总运行时间。

[^3]: 实际上由于处理可并行运行的特点([参考](https://pitest.org/faq/))，测试时间的增加并非呈简单的线性倍增。然而，由于突变测试的方式是“对目标代码插入变异，然后运行(原始)测试并评估变异是否导致了测试失败”，整体趋势还是可以接受的。

通过运行时的日志可知，占运行时间绝大部分的步骤是覆盖率和依赖关系分析("coverage and dependency analysis")以及针对每一变异点的测试运行和结果分析("run mutation analysis")。换句话说，如果能合理调整[变异目标代码](#改変対象コードの絞り込み)、[变异模式](#変異パターンの絞り込み)以及[运行的测试代码](#実行テストコードの絞り込み)，从而实现必要且充分的突变解析设置，就有可能缩短运行时间。

## 限制变异目标代码
PiTest通过作用于编译后的[字节码并应用特定的“变异器”来修改测试目标代码的行为](https://pitest.org/quickstart/basic_concepts/)，并评估改动后的“变异行为”能否通过测试失败的方式被检测出来。换句话说，如果对未发生改动的源代码(生产代码/测试代码)再次运行测试，其结果也可以被假定为不变[^4]。

[^4]: 从理论上讲，也可能存在一种情况，那就是由于变异器每次运行产生不同的变异，即使源代码未发生变化，测试结果也可能会变化。然而，从技术概念来看，这种情况应该作为工具的缺陷来考虑。

换言之，突变测试是一种可以高效提供反馈的技术，只要“仅对上次突变测试结果有变化的源代码”运行即可。针对这种应用场景，PiTest提供了[增量分析](#インクリメンタル解析)和[指定目标解析](#解析対象クラスの指定)的功能。

### 增量分析
虽然截至本文撰写时，这项功能仍属实验性(experimental)，但PiTest已具备了一项分析代码变化(增量)的[增量分析](https://pitest.org/quickstart/incremental_analysis/)功能。  
增量分析会在运行突变测试时保存被测源代码(生产代码/测试代码)的信息。在下一次运行时，这些信息作为输入，若判断“自上次运行以来未发生任何改动”，则推定其结果不会发生变化，并将其从测试解析目标中剔除。

:::info: 关于“自上次运行以来的改动”
测试目标的行为主要由进行操作的源代码(已编译的字节码)控制。不过，即使源代码未发生改动，其依赖组件的变化也可能会导致被测代码的行为发生改变。  
在PiTest中，依赖组件的影响被限定为“对测试目标影响最大的元素”，即`父类(super class)`和`外部类(outer class)`，以此为基础判断改动的有无。  
这样的逻辑建立在“看似合理但并未得到证明”的假设之上，这可能也是增量分析目前仍被视为实验性功能的原因之一。
:::

要使用增量分析功能，可以如下例所示，指定PiTest运行信息的输入路径(historyInputLocation)和输出路径(historyOutputLocation)。在基于上次测试结果Diff的突变测试中，只需将上次运行的输出作为此次的输入即可。因此，只需对输入路径和输出路径设置相同路径即可。当遇到特殊情况(如“在多个分支间切换进行开发”)时，“输出路径”可能对应的信息与预期的“上次输出结果”并不吻合，这时可能需要每次调整配置。  
作为更简单的设置，还可以将“临时目录”指定为输入路径/输出路径(withHistory)。不过如果是使用Gradle插件，该选项会将构建目录设置为临时路径，因此在执行`clean`任务时，历史数据也会被初始化，需要特别注意。

```groovy
pitest {
    ・・・
    // 设置突变测试历史数据的输入路径/输出路径
    historyInputLocation = ".mutation/history"
    historyOutputLocation = ".mutation/history"
    // 简单地设置为临时目录存储历史记录的方式也可行。当使用该设置时，InputLocation设置将被忽略
    // withHistory = true
}
```

例如，在保有[上一篇文章所示](/blogs/2024/12/03/mutation-testing/)测试覆盖率不足的状态作为历史记录的情况下，改进测试代码后执行`pitest`任务，增量历史会检测到改动的测试代码(GreetServiceTest)，并仅对其涉及的代码`GreetService`实施突变测试。

![Incremental Result](/img/blogs/2024/1226_mutation-optimization/Incremental-result.jpg)

从运行日志可以看出，通过增量分析，突变数量被削减(Incremental analysis reduced number of mutations by 3)。虽然准备阶段的依赖关系分析时间有所增加，但测试运行时间减少至一半左右，总用时依然得到了显著缩短。

### 指定解析目标类
利用[增量分析](#インクリメンタル解析)可以轻松实现以目标为中心的突变测试。然而由于它基于“上次运行”的Diff，因此在某些场景(例如“在合并前针对分支差异代码实施突变测试”)下，可能需要一些运作技巧。  
虽然可以通过“保留分支分叉前的突变测试结果，在合并前再调用”的方式应对，但针对“代码合并前”等场景，可以利用Git等源码管理工具的差异信息。

PiTest可以如下例所示，对变异目标类和测试类进行设置。如果未指定`targetTests`(目标测试类)，其值将默认与`targetClasses`相同。因此在直接指定特定类名作为改动目标时需要特别留意。

```groovy
pitest {
    ・・・
    // 以数组形式设置目标变异类和测试类。支持通配符
    targetClasses = [ "com.example.iwaki.service.GreetService","com.example.iwaki.BackApplication" ]
    // 如果未指定目标测试类，将默认与targetClasses的值相同，因此建议明确指定测试类
    targetTests = [ "com.example.iwaki.service.*","com.example.iwaki.*" ]
}
```

通过将SCM(源码管理工具)管理信息提取的变更内容反映到该配置中，即可指定目标类。由于每次改变`build.gradle`文件较为麻烦，可以通过运行时选项或环境变量进行此类变更。例如，可以通过Gradle的属性设置默认目标，并通过运行时选项(-P)或环境变量(GRADLE_PROJECT_XXX)切换配置[^5]。

[^5]: 官方插件文档中提到了[通过`gradle-override-plugin`覆盖配置](https://gradle-pitest-plugin.solidsoft.info/#how-can-i-override-plugin-configuration-from-command-linesystem-properties)。不过，该插件似乎在覆盖数组值时存在一些限制。因此我们选择使用项目属性输入字符串(以逗号分隔)，在`build.gradle`中将字符串转换为数组的形式。

```groovy
- gradle.properties
 // 可通过Gradle项目属性定义默认设置项，从而通过外部运行时选项进行变更
 PITEST_TARGET_CLASSES="com.example.iwaki.*"
 PITEST_TEST_CLASSES="com.example.iwaki.*"

- build.gradle
----
 pitest {
    ・・・
    // 将gradle.properties的设置值转换为数组后配置使用
    targetClasses = [ PITEST_TARGET_CLASSES ]
    targetTests = [ PITEST_TEST_CLASSES ]
 }
```

通过指定变更的类为目标，测试的运行时间可以与增量解析一样得到缩短。同一分支开发时使用增量解析；检查分支合并前变化内容时则利用SCM信息，如此结合应用，相当方便。

:::info: PiTest的SCM集成功能
在Maven插件中，PiTest提供了与Maven SCM插件结合的目标[scmMutationCoverage](https://pitest.org/quickstart/maven/#scmmutationcoverage-goal)，可以对变更的文件实施突变测试。  
Gradle插件目前尚未看到类似功能的一原因可能在于Gradle允许通过自定义插件灵活实现此类功能，从而彰显工具的独特性。  
需要注意的是，虽然Gradle上也存在一些外部的scm插件，但其中多有开发停止或功能有限的情况。使用Gradle通过SCM信息运行PiTest时，建议在Gradle外操作SCM，例如在CI任务中先由SCM工具提取信息，再传给Gradle。  
:::

## 限制运行的测试代码
[通过前次运行结果限定测试目标](#改変対象コードの絞り込み)是一种优化处理时间的方式。此外，如针对类似集成测试或e2e测试代码这样耗时较长的场景，也可以通过将其排除在突变测试外来缩短所需时间。  
在“常见示例应用程序”中，使用Pact的契约测试是耗时较长的部分。该测试主要用于[验证从前端服务(Consumer)调用时的响应契约](/blogs/2022/12/03/contract-test-with-pact/)，是评估服务间可集成性的测试。考虑到其是在实际集成前的验证，其通过变异评估充分性的意义较弱[^6]。

[^6]: 针对本测试目的的确如此。然而，例如某些情况下通过集成测试覆盖了控制器(Controller)类的单元测试层次内容时，简单剔除集成测试可能导致测试整体未覆盖的比例激增。在限定突变测试目标代码时，需综合考量测试整体策略。

如同指定测试目标类一样，可以通过以下设置排除某些测试类或目标类：

```groovy
pitest {
    ・・・
    // 以数组形式指定排除的类或测试类。支持通配符
    excludedClasses = [ "com.example.iwaki.BackApplication","com.example.iwaki.ClockConfig" ]
    excludedTestClasses = [ "com.example.iwaki.controller.GreetContractTest" ]
}
```

通过剔除耗时较长的契约测试(如Contract Test)或突变测试意义较小的配置类(Config)，可明显缩短执行时间。

![Excluded Result](/img/blogs/2024/1226_mutation-optimization/Excluded-result.jpg)

本文中以类级别为例介绍了目标/排除的配置，但同样也可以对方法级别(excludedMethods/includedTestMethods)或通过测试框架分组(includedGroups/excludedGroup)进行精细化设置。

## 限制变异模式
突变测试应用的变异内容截至当前可参考[官方文档](https://pitest.org/quickstart/mutators/)，其默认启用的11种变异器如下表所示。此外，PiTest还可以提供除下表内容外的18种变异器，且可按名称或分组执行其他变异器的配置变更。

| 变异器 | 概要 | 捕捉到的测试遗漏的例子(※) | 
| ---- | ---- | ---- | 
| CONDITIONALS_BOUNDARY | 调整比较运算符的边界(`> → >=`等) | 边界值测试遗漏 | 
| INCREMENTS | 转换增(减)函数(`++ → --`等) | 针对循环处理“多输入”的测试遗漏 | 
| INVERT_NEGS | 反转数值(`i → -i`等) | 值验证不足(`0`等正负不同但影响不大的情况) | 
| MATH | 数学运算符改造(`a + b → a - b`等) | 值验证不足(例如`0 + 0`运算中无影响但被忽略的情况) | 
| NEGATE_CONDITIONALS | 比较运算符反转(` == → !=`等) | 同值类的测试遗漏(如测试了`x == a`但未验证`x != a`) | 
| VOID_METHOD_CALLS | 删除void方法调用 | 目标方法影响(事后条件等)的测试遗漏 | 
| EMPTY_RETURNS | 将方法的返回值改为空值(`string型返回""`等) | 后续处理中的空值测试不足 | 
| FALSE_RETURNS | 将布尔型方法返回值改为false | 针对目标方法值的组合情况测试不足 | 
| TRUE_RETURNS | 将布尔型方法返回值改为true | 针对目标方法值的组合情况测试不足 | 
| NULL_RETURNS | 将方法的返回值改为Null (未应用NotNull约束) | 后续演算中的Null处理测试不足 | 
| PRIMITIVE_RETURNS | 将基本类型数值(int,float等)返回值改为0 | 针对返回值后续演算中的零除异常未测试 | 

※：变异内容推测自作者

突变是由变异器的作用生成的，因此使用变异器的数量和生成的变异数量之间具有一定的相关性。考虑到开发使用的技术或框架的特性[^7]，对于本身难以产生测试遗漏的情况，通过减少变异器的使用或许可以缩短任务运行时间。

[^7]: 例如采用测试驱动开发(TDD)时，将遵循“首先定义业务行为的测试代码，再通过修改目标代码以满足其要求”的开发风格。在这种情况下，“特定条件=同值类”的测试遗漏不易出现。从而，NEGATE_CONDITIONALS变异器的利用价值可能相对较低。

在本次测试中，暂未发现剔除默认启用的任一变异器的直接依据，因此对比在增加变异器数量后运行时间是否增长。

```groovy
pitest {
    ・・・
    // 指定需用变异器名称或工具定义的分组名
    mutators = [ "ALL" ]
}
```

![Mutator ALL Result](/img/blogs/2024/1226_mutation-optimization/Full-Mutator-result.jpg)

## 总结
本文基于之前介绍的突变测试工具PiTest，针对使用中可能成为障碍的“运行时间”问题，阐释了如何通过配置来缩减运行时间。虽然相较普通测试花费时间长是无法避免的，但只要合理设定解析目标，用途上还是能实现高效应用的。
