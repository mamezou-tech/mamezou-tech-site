---
title: Copilot 的 Pull Request 审查指南 — 自定义指令与日语化实践
author: kenta-ishihara
date: 2025-09-10T00:00:00.000Z
tags:
  - GitHub Copilot
  - 生成AI
  - summer2025
image: true
translate: true

---

本文是2025年夏季接力连载的第10篇文章。

## 引言
在工作中使用 GitHub + GitHub Copilot，最近也将 pull request 的审查作为自检，同时委托 Copilot 执行。它能够相当准确地给出评论，但默认是英文回复，因此我想让它用日语回复，这就是本文的契机。

## 让 GitHub Copilot 进行审查
如果正在使用 GitHub Copilot，就一定要尝试 Copilot 的审查功能。操作方法如下。（详情请参考[官方文档](https://docs.github.com/ja/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/requesting-a-pull-request-review)）

1. 在 GitHub.com 上创建 pull request 或切换到已有的 pull request。  
2. 打开 Reviewers 菜单，选择 Copilot。  
3. 等待 Copilot 审查 pull request（通常在 30 秒内）。  
4. 查看 Copilot 的评论。评论可像普通审查评论一样处理（可添加反应、评论、标记为解决、隐藏等）。

实际使用时，它能够非常准确地指出 bug 或需要重构的地方，给人印象深刻。从开发者的角度来看，能获得有用的审查意见实在是太好了。  
不过，唯一让人在意的是它基本上以英文回复。因此我决定尝试一下自定义指令。

## 添加自定义指令
GitHub 提供了“自定义指令”机制，可以用 markdown 格式的自然语言来给 Copilot 下指令。  
(详情请参考[官方文档](https://docs.github.com/ja/copilot/how-tos/configure-custom-instructions/add-repository-instructions))  
这次为了应用于整个仓库，创建了以下文件。
```
.github/copilot-instructions.md
```

其中一个示例内容如下。
```markdown
## 基本方针
- 生成的所有评论、说明、回答、审查均请使用“日语”编写。
- 尽可能易读、简洁且提出具体建议。
```

这次我还在上述基础上，追加了以下类似编码规范的内容。以下是针对[ES2015(ES6)](https://262.ecma-international.org/) 的 `let` / `const` 规则示例。
```markdown
# JavaScript
---
## 在变量声明时是否使用const或let而非var
没有重新赋值的变量请使用const，需要重新赋值的变量请使用let声明
var可以重复声明相同变量名，而let则不行
（防止变量重复定义或意外重新赋值）
```

将此文件 push 后请求 Copilot 审查，果然收到了符合编码规范的评论。  
[![Image from Gyazo](https://i.gyazo.com/79fcea4bd54538730017a599bdbf1f54.png)](https://gyazo.com/79fcea4bd54538730017a599bdbf1f54)

如果项目中已经以 markdown 格式管理编码规范，那么直接复制粘贴来利用也是很有效的。  
（有些团队用 Excel 来整理规范，但考虑到与生成式 AI 的兼容性，今后我想推荐使用 markdown 格式）

## 在编写自定义指令时的注意事项
以下指令可能无法得到预期结果。  
1. 无法使用引用外部资源（URL 或文件路径）的指令。
```markdown
不良示例：
- 若要理解此仓库的代码，请阅读以下 URL：
  https://example.com/internal-specs

- 请参考 `/docs/design/architecture.md` 提出建议
```

2. 无法指定以某种特定风格回复的指令。
```markdown
不良示例：
- 请以轻松友好的口吻回复
```
※不过，也有像“请把句尾改为〜なのだ”这种简单的指定被采纳的情况。

3. 无法强制规定回复的长度或形式。
```markdown
不良示例：
- 请确保回复在1000字符以内
- 最后请用五・七・五形式总结
```

关于上述示例，我也认为随着未来语言模型的进化，目前做不到的事情也有可能变为可行。（期待未来）

## 本以为万事都迎刃而解…却
当我将所创建的自定义指令应用并创建新的 pull request 时，审查再次以英文回复。提交几次 pull request 后，时而用英文回复，时而用日语回复，感觉并不太稳定。  
（从评论内容来看，似乎确实参考了自定义指令）  
将来与生成式 AI 打交道时，或许需要摒弃“它一定会听话”的想法，接受一定程度的模糊性，这是用户需要具备的心态。（认命）

## 总结
- 如果正在使用 GitHub + GitHub Copilot，一定要尝试它的审查功能  
- 通过在 `.github/copilot-instructions.md` 中添加自定义指令，可指定审查的指导方针（如果将规范以 markdown 编写，更易于利用）  
- 但由于它并不一定会完全按照指令执行，因此接受生成式 AI 特有的模糊性是很重要的心态
