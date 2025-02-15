---
title: VS Code 的 Copilot Edits 高效进行重构
author: masahiro-kondo
date: 2025-02-15T00:00:00.000Z
tags:
  - GitHub Copilot
  - リファクタリング
  - vscode
image: true
translate: true

---

## 引言
据说 GitHub Copilot 的开发目标是通过提供 AI 配对程序员，来让开发者的生活更加轻松。

在 VS Code 的 GitHub Copilot 扩展中，会对正在编辑的文件提出代码修改建议。除此之外，还有一种工作流程是在 Chat UI 中书写提示，从零开始生成代码并加以利用。

虽然在 VS Code 的 Copilot Chat 中生成代码很方便，但在 Chat UI 中操作时，是否有感到略微繁琐呢。

1. 编写并发送提示  
2. 代码会被全新生成  
3. 检查代码  
4. 如有需要修改之处，则通过额外的提示进行指示  
5. 代码从头开始重新生成  
6. 检查代码  
7. 如果结果良好，将生成的代码合并到正在编辑的项目中

如此反复地进行提示发布、代码全量生成以及代码检查，每次都要在 Chat UI 上审视完全生成的代码。虽然与人类手写代码相比速度快上百倍，但眼前的代码能直接被更改，显然更让人满意。

## Copilot Chat 中生成文件的直接显示与迭代处理

在不久前的 GitHub ChangeLog 中，宣布了一项在 GitHub 网站的 Copilot Chat 内直接迭代处理文件的功能 (View and Iterate Generated files) 的预览版功能。

@[og](https://github.blog/changelog/2025-02-05-view-and-iterate-on-generated-files-directly-within-copilot-chat-preview/)

与以往在 VS Code 中的 Copilot Chat 类似，以前每次都是全部重新生成，但现在则以先前生成的文件为基础，依据提示直接反映更新内容。

:::info
关于 GitHub 网站上的 Copilot Chat，已在以下文章中介绍。

@[og](/blogs/2024/09/28/github-copilot-in-github-com/)
:::

在提示中加入类似“创建文件”或“生成文件”等指令性句子，即可进入直接显示与迭代处理模式。

这是执行提示“创建包含2024年 JavaScript 十大新闻的 Markdown 文件”的结果。生成的文件显示在传统 Chat UI 的右侧面板中。

![View and Iterate 1](https://i.gyazo.com/77313d6025ab75a0eadc113861040e29.png)

在 Chat UI 侧，会记录生成文件的步骤计划和执行结果。右侧面板上显示的 Markdown 文件即为最终成果。

由于标题虽为日语而正文却为英语，显得不协调，所以通过额外提示“正文也请用日语”后，同一个文件被重新更正。

![View and Iterate 2](https://i.gyazo.com/1be02f320116a2cdc9be2b606a56bcb4.png)

如上所述，在 GitHub.com 上的 Copilot Chat 中，已支持通过提示直接编辑生成的文件。

## 在 VS Code 中 Copilot Edits 正式发布

我一直想在 VS Code 中也能进行 View and Iterate 功能，结果就在前几日 GitHub Copilot Agent 发布时，Copilot Edits 这一功能已进入 GA[^1]。

@[og](https://github.blog/news-insights/product-news/github-copilot-the-agent-awakens/)

在 Copilot Edits 中，可以在 VS Code 中打开目标文件的状态下，以交互方式发布提示并对文件进行修正。

[^1]: 关于 Agent 部分，稍后会在其他文章中讨论。

在 VS Code 的文档中有如下页面进行说明。

@[og](https://code.visualstudio.com/docs/copilot/copilot-edits)

## 开始使用 Copilot Edits
使用 Copilot Edits 需要在 VS Code 中安装 GitHub Copilot 扩展，并以拥有有效 GitHub Copilot 订阅的 GitHub 账号登录。如果左下角的个人资料图标菜单如下所示，则说明配置正确。

![Sign in](https://i.gyazo.com/3a2aeeac8f7e01b43d81f79f11381ff2.png)

点击 VS Code 中的 Copilot 图标，然后从菜单中选择 “Copilot Edits を開く”。

![Open GitHub Copilot Edits](https://i.gyazo.com/69de8f32a33f71901df544d4f14efff8.png)

Copilot Edits 的界面与传统 Copilot Chat 的界面并无太大差别，但新增了一个用于附加正在编辑文件的 UI。通过在这个“工作集”中包含目标文件并书写提示，就可以与 Copilot 协同编辑该文件。

![Edit with copilot](https://i.gyazo.com/74a12ac779168465dd1a64f59cdee506.png)

## 使用 Copilot Edits 进行重构工作
在代码重构中，会同时编辑多个文件，并且往往会创建新的文件。若采用传统的 Chat UI 进行操作，不仅文件操作繁琐，还需要频繁进行复制粘贴，实在相当麻烦。

尝试用 Copilot Edits 重构用 Java 编写的有点糟糕的代码。[^2]

[^2]: 这段糟糕的代码是让 GitHub 网站的 Copilot 以 View and Iterate 模式编写的。

打开目标文件后，它会自动添加到工作集中。

![Open files](https://i.gyazo.com/c192e4c4f532b863eca04ac3a265138c.png)

若需要在工作集中添加其他文件，只需点击 `+ファイルの追加` 按钮，即可从候选列表中进行选择。

![Add file](https://i.gyazo.com/7df319ec6104abb84db205960c6f7173.png)

就这样，可以在工作集中包含多个相关文件。

![Added files](https://i.gyazo.com/c4d59771b0c8695d27b1024f0e0b9190.png)

那么，让我们通过提示来指示进行重构吧。

此处不展示代码细节，文件中有一个名为 Employee 的数据类和一个名为 EmployeeManager 的管理类，其中 EmployeeManager 拥有的功能过多，显得有些复杂。

我发出了提示：“EmployeeManger が大きいのでいくつかのクラスに分割してください。”  
（因名称不变，这里仍保留 EmployeeManager 相关名称。）

![First refactor](https://i.gyazo.com/ae2aac8531f8e58b43505960556f3ed8.png)

从 EmployeeManager 中提取出了 3 个类，总共划分为 4 个类。当然，这些类已作为新文件加入到项目中。可以按文件查看修改的部分，然后决定“承认”或“放弃”。在工作集区域点击 “採用” 即可一并批准这些修改。

暂时点击了 “採用”，接受了 Copilot 的重构。

结果生成了一个名为 EmployeeUpdater 的数据类，它仅仅用于更新属性的（无聊的）类。

![EmployeeUpdater](https://i.gyazo.com/953db4fd06af176fe4991d0fcaf30e4a.png)

这可能是因为重构前的 EmployeeManager 对每个属性都暴露了更新方法。

我又发出提示：“EmployeeManager の Employee 更新メソッドを廃止して、Employee を受け取って更新するメソッドに変更し、EmployeeUpdater は廃止で。”  
（提示中仍保留部分原文）

EmployeeManager 中的方法大致按意图进行了整合与取消。

![refactor update method](https://i.gyazo.com/069a5bab5130a6dc0c18b606f0333200.png)

EmployeeUpdater 被标记为可删除。

![remove EmployeeUpdater](https://i.gyazo.com/0dc403a254a4106766d29f65e85c4056.png)

虽然类已被适当拆分，但代码中仍带有一点旧风味，所以我又发出提示：“employee パッケージのコードを改善して。”

![improve code](https://i.gyazo.com/0858996b9f21d32075e19b5c81ab8561.png)

代码现已改为使用 Stream，使得整体可读性大幅提升。

最后，尝试添加测试代码。我发出了提示“employee パッケージに単体テストを追加して”。生成测试代码后，又发出提示“テストケースに @DisplayName を追加して”，随后这些标签被一并添加到了所有测试方法中。

![Add Test code](https://i.gyazo.com/3e9fd6e68500930779dcb4bba34eb3ce.png)

当然，所有编写的测试均全部通过。

:::info
虽然本文中提示的使用较为随意，但关于如何在 GitHub Copilot 中进行重构的指导，已在以下博客中进行了详细解说。

@[og](https://github.blog/ai-and-ml/github-copilot/how-to-refactor-code-with-github-copilot/)
:::

## 最后
以上，我稍微试用了 Copilot Edits。真是令人惊叹——它仿佛将那些能够快速编写代码的程序员作为驾驶员，而自己则充当导航者。

虽然它确实让开发者的生活更加轻松，但也令人担忧的是，这可能会减少开发者独立进行重构的机会，从而导致那些导航能力不足的开发者越来越多。
