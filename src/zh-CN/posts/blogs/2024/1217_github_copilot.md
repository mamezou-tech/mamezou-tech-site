---
title: GitHub Copilot的使用方法以及在引入前需要了解的事项
author: kenta-ishihara
date: 2024-12-17T00:00:00.000Z
tags:
  - GitHub Copilot
  - advent2024
image: true
translate: true

---

这是[is开发者网站Advent Calendar 2024](/events/advent-calendar/2024/)第17天的文章。

## 开始之前
当我想振作的时候，就会去吃[汉堡王的Big Bet](https://app.burgerking.co.jp/bkad/bigbet/index.html)。最近，我在项目中开始使用[GitHub Copilot](https://docs.github.com/ja/copilot)(以下简称Copilot)，所以将使用方法和引入前需要知道的一些事项整理了一下。如果本文能为正在考虑引入Copilot的人，或者已经在使用Copilot的人提供帮助，我将深感荣幸。(本文基于Windows + IntelliJ环境编写，敬请谅解。)

## 引入方法
1. 使用GitHub账号订阅以下Copilot计划。(参考：[GitHub Copilot 的订阅计划](https://docs.github.com/ja/copilot/about-github-copilot/subscription-plans-for-github-copilot))
   - GitHub Copilot Individual（个人版）
   - GitHub Copilot Business（适用于中小团队或企业）
   - GitHub Copilot Enterprise（适用于大型团队或企业）
2. 安装Copilot插件。
   1. 从IntelliJ中使用快捷键「Ctrl + Alt + S」打开设置对话框。
   2. 在「插件」中搜索「GitHub Copilot」并安装。
3. 将IntelliJ与GitHub账号进行关联。(参考：[使用JetBrains IDE安装GitHub Copilot](https://docs.github.com/ja/copilot/managing-copilot/configure-personal-settings/installing-the-github-copilot-extension-in-your-environment?tool=jetbrains#jetbrains-ide-%E3%81%A7%E3%81%AE-github-copilot-%E3%81%AE%E3%82%A4%E3%83%B3%E3%82%B9%E3%83%88%E3%83%BC%E3%83%AB))

## 使用成本
※截至2024年12月的价格，仅供参考。具体价格请参阅[官方文档](https://docs.github.com/ja/billing/managing-billing-for-your-products/managing-billing-for-github-copilot/about-billing-for-github-copilot)。
- 如果使用GitHub Copilot Individual（个人版），费用为10美元/月或100美元/年。
- 如果使用GitHub Copilot Business（适用于中小团队或企业），费用为19美元/月。
- 如果使用GitHub Copilot Enterprise（适用于大型团队或企业），费用为39美元/月。

## 基本使用方法
基本的使用方法大致分为以下两种：

### 输入补全功能
1. 类似于IDE的输入补全功能，Copilot可以在编码过程中为后续实现提供建议。接受建议请按「Tab」键，不接受请按「Esc」键。
2. 当有多个建议时，可以通过「Alt + ]」（显示下一个建议）或「Alt + [」（显示上一个建议）进行选择。
3. 自动补全的建议可以包含单步或多步提案。如果希望部分接受某些建议，可参考以下操作：
    - 按「Ctrl + →」接受按单词单位的建议。
    - 按「Ctrl + Alt + →」接受按单步单位的建议。
4. 如果在注释中具体描述实现内容，Copilot会提供更精确的建议。

### AI聊天功能
1. 点击IntelliJ中的「Copilot Chat」图标，输入提示语（Prompt）。
2. 在发送提示时，可以选择参考文件。
    - 除了明确指定的文件外，Copilot还会参考当前在IntelliJ中打开的文件。如果问题与当前打开的文件相关，则无需额外指定。
    - 如果想要指定文件的某一部分，只需选定相应内容，然后再进行提问，Copilot会参考选定的部分。

## 关于与ChatGPT的区别
基本上，即使使用ChatGPT，也大致能够满足对Copilot的需求。然而，在输入包含前提条件的提示语，以及实时地提供候选建议的效率方面，Copilot的使用体验更佳。

## 使用场景
- 编码支持
- 辅助进行对偶编程（Pair Programming）和多人编程（Mob Programming）的导航工作。
- 代码解释
  - 对可读性较低的代码，可以通过输入「/explain」让Copilot解释代码的处理内容。
- 协助重构
  - 使用「/fix」获取修改建议，并在实现后确认是否还有改善空间，这可能会非常有用。
- 编写测试代码
  - 在打开目标文件的状态下，在Copilot Chat中输入「/test」并发送，Copilot会提供测试代码的建议。
- 用于掌握不熟悉的语言或库
  - 在学习或实现尚不熟悉的编程语言或库时，Copilot提供的代码示例可以作为很好的参考。（不过建议的代码是否能完全正确运行则需另行确认。）
- 探索错误原因及解决方法
  - 在不了解错误原因时，可以尝试询问Copilot作参考。（仅供参考）

## 用户的评价
- 省去了思考提示词和输入的麻烦，比ChatGPT使用起来更轻松。
- 有时会提供一些脱离实际的建议。（是不是因为对应代码中留有不必要的注释或不准确的注释？）
- 当任务内容较为简单但实现量较大时，使用Copilot可以极大地提高工作效率。
- 在编写需求文档时，根据现有类提取相关条目时得到了帮助。
- 在实现遇到困难时，能够作为值得信赖的“咨询对象”使用。

## AI发展后的未来开发场景可能出现的事情
- 新人：「这是AI生成的代码，我不知道为什么会有Bug。」上司：「这不就是你写的代码吗！」
   - 要为自己写的代码负责，毕竟AI不会为代码负责。
- 上司：「找AI帮忙更轻松。」从而产生AI职场霸凌。
   - 即使心里这么想，也不要说出口。
   - 过于依赖AI不好，但在支持工作的环境下，使用Copilot可能会让不熟练的新人更高效地完成任务。

## 结束语
随着在编码过程中使用ChatGPT或Copilot来查询问题逐渐成为常态，我不禁在想，「百度一下」或者「ggrks」这些词是不是已经快变成过去式了。（不敢问）无论是AI还是Google大神，始终不变的是使用者需要自己思考，并对自己编写的代码负责，不论时代如何变化。
