---
title: 使用 Gemini Code Assist 制作15拼图
author: akihiro-ishida
date: 2025-05-31T00:00:00.000Z
tags:
  - Gemini
  - 生成AI
  - AI
image: true
translate: true
---

## 引言
我是敏捷组的石田。这次我们暂且离开敏捷或 Scrum 等主题，来聊聊生成式 AI。

Google 提供的 Gemini Code Assist 是一种利用生成式 AI 的编码辅助工具。自 2025 年 2 月起，个人版免费服务已提供，每天可使用 6,000 次代码补全、240 次聊天请求。这对个人开发来说使用限制绰绰有余，非常吸引人。

因此，这次将分享我使用 Gemini Code Assist 挑战编码的体验记录。

## 完成的作品
赶快看看我这次制作的 15 拼图吧。我已推送至 GitHub，并通过 GitHub Pages 发布。

15 拼图是一种经典益智游戏，将标有 1 到 15 的数字面板在 4x4 棋盘上滑动，并将数字排列成正确顺序。对于编程初学者来说，从红白机时代起，制作 15 拼图 就已成为定番[^1]。

在此 15 拼图中，实现了以下基本功能：

- 外观：类似木质的配色
- 操作性：通过方向键移动面板
- 打乱功能：通过按钮或快捷键（S 键）进行随机打乱
- 计时功能：测量从打乱到完成所耗的时间
- 手机支持：支持滑动操作，宽度最大限制为 500px

欢迎通过以下 URL 进行试玩：  
[https://mamezou-ishida.github.io/15puzzle/](https://mamezou-ishida.github.io/15puzzle/)  
![15拼图](/img/blogs/2025/0602_gemini-code-assist/15puzzle.png)

[^1]: 在 1987 年发售的红白机版初代《最终幻想》中，有一个可以玩 15 拼图 的隐藏秘籍。

## 开发环境
开发环境中使用了 Mac，编辑器选择了 VS Code。编程语言为 JavaScript，使用了可轻松创建图像和动画的库 [p5.js](https://p5js.org/)。

如何在 VS Code 中使用 p5.js，可查看 p5.js 官方网站的详细说明。  
[https://p5js.org/tutorials/setting-up-your-environment/#vscode](https://p5js.org/tutorials/setting-up-your-environment/#vscode)

实际上，只需安装 VS Code 扩展「[p5.vscode](https://marketplace.visualstudio.com/items?itemName=samplavigne.p5-vscode)」即可。安装后，只需在命令面板中运行「Create p5.js Project」，然后指定文件夹即可创建项目。

接着，让 VS Code 支持 Gemini Code Assist。同样，只需安装 VS Code 扩展「[Gemini Code Assist](https://marketplace.visualstudio.com/items?itemName=Google.geminicodeassist)」，并使用 Google 账号登录，即可完成设置。

需要注意的是，使用个人免费版时，请使用个人的 Google 账号，而不是与公司 GCP 账号或 Workspace 绑定的账号。

## 完成代码与 Gemini Code Assist 的应用
已将完成的代码公开在 GitHub。实际编写的仅有 `sketch.js` 文件，其余文件均为项目创建时自动生成。  
[mamezou-ishida/15puzzle](https://github.com/mamezou-ishida/15puzzle)

使用 VS Code 的 Gemini Code Assist 插件，可以在 VS Code 中以聊天形式向 AI 发出指令，并生成代码。

这次为开发此 15 拼图，向 Gemini Code Assist 发出的指令仅有 10 次。

```
我想使用 p5.js 制作 15 拼图。首先，作为准备，请创建 16 个 4x4 排列的矩形。
请在这些矩形的周围画上宽度为矩形直径四分之一的边框。整体配色要呈现木质效果。
```

```
接下来，请在每个矩形的中央，从左到右、从上到下依次填入 1 到 15 的数字。
请使用亲切活泼的字体。
请将多余的右下角矩形设置成能明显看出为空白的颜色。
```

```
空白部分的颜色最好选用浅色。
```

```
接下来，实现拼图的动作。
当按下上下左右键时，请让相邻的面板移动到空白处。
```

```
面板移动时，请实现一个耗时 0.1 秒的移动动画。
```

```
接下来添加打乱功能。在拼图下方添加一个「Scramble(S)」按钮，
按下该按钮时要让拼图被打乱。
另外，按下 S 键时也应执行相同操作。
```

```
按钮外观请更活泼一些。
```

```
接下来添加计时功能。在打乱按钮下方，显示精确到小数第一位的计时器。
显示格式为「0.0 秒」。打乱之后，在首次移动面板时开始计时，
完成后停止计时，并将计时器的颜色设为红色。
打乱按钮和计时器要居中显示。
```

```
接下来进行手机端支持。请将拼图的最大宽度设为 500px。
并且要支持通过滑动来移动面板。
```

```
出现以下错误：
sketch.js:415 Uncaught ReferenceError:
touchX is not defined at touchStarted (sketch.js:415:7) at e.default._ontouchstart (p5.min.js:2:607198)
```

由于中间还包括了对颜色和外观的调整以及错误修复的指令，实际上功能性新增的指令只用了 7 次。GitHub 的提交记录，除去首次提交，也是 7 次。

Gemini Code Assist 会根据聊天指令生成相应代码，仅需点击「Accept Changes」按钮即可自动合并。可以说只需发出指令、按下合并按钮，就能完成 15 拼图。

顺带一提，当我询问如何通过 GitHub Pages 发布时，它也给出了非常详细的指导。

## 熟练使用 AI 的技巧
以下是我在使用 Gemini Code Assist 时发现的一些经验。

### 多次从头制作同一项目
这次的 15 拼图共通过 7 次提交完成，但实际上，为了写这篇文章，我是第 4 次才做出最终作品。一开始由于规格尚未明确，我反复进行试错，然后从头重做。不过我觉得，这是学习使用生成式 AI 进行编码时非常有用的方法。经过几次重复，我逐渐掌握了如何发出合适的指令，最终以 7 次提交——几乎是最短的方式完成了作品。从第一次提交到完成，时间也不足一小时。

此外，同样的指令也不会生成完全相同的外观和代码，这也是个有趣的发现。比如，最终完成的 15 拼图中各面板的角稍微带有圆角，但在之前的版本中都未被提议过。

### 首先声明想要制作的内容
在制作 15 拼图时，我在最初的指令中就声明了“我要制作 15 拼图”。我认为这是非常重要的一点。起初，我专注于发出诸如创建 16 个矩形并在其中填入数字等具体指令。但通过最开始明确声明想要制作的内容，生成式 AI 能够更深入地理解意图并生成代码。即使突然使用事先未定义的“面板”或“打乱”等词汇，它也能轻松理解并接受，大概是因为 AI 已经把握了整体上下文。

### 频繁提交
这一点不言而喻，但发出指令并不一定一下子就能得到想要的结果。有时界面或动作并不符合预期，有时还会生成导致错误的代码。此时如果急于连续发出指令，很容易陷入无法回退的境地，之后常会后悔“要是当时修改那条指令就好了”。因此，频繁提交、确保随时能够回到之前的状态非常重要。若不这样做，就会越陷越深。

### 无法合并时的应对方法
这与 VS Code 扩展有关，特别是修改量较大时，经常会出现生成代码后无法合并的情况。遇到这种情况，可以尝试发出“无法合并，请调整使其可合并”之类的指令，如果仍然无法解决，就发出“无法合并，请输出完整内容”的指令，大多数情况下都能解决。

### 阅读并理解代码说明的重要性
Gemini Code Assist 不仅会生成代码，还会对其提供相当详细的说明。如果只是个人兴趣开发，或许直接合并就可以了（实际上这次我完全没有阅读代码就完成了）。但若在工作中使用代码辅助，就不能这么做。遇到 bug 或询问时，说“是生成式 AI 写的，所以不知道”是行不通的。将其仅作为辅助或编码学习的工具，至少在目前，这是最明智的使用方式。

## 总结
近期生成式 AI 的成长可谓惊人，其进化速度令人瞠目。不使用生成式 AI 就开展工作的时代已经近在咫尺，因为效率实在太低了。这可以说是与从纸笔时代到文字处理器和个人电脑普及一样，甚至更大规模的社会与工作方式的巨变时期。

像 Gemini Code Assist 这样的工具，不仅能显著提升我们的编码生产率，还能大大降低“想做这个”时的门槛。即使是编程经验浅的人，也能借助 AI 的力量在短时间内制作出可运行的成果。当然，对 AI 生成代码质量的理解，以及适当的修正和管理技能仍然很重要，但这些技能也将在与 AI 共同开发的过程中自然而然地习得。

作为 AI 时代的工程师，我今后也会继续与代码辅助工具好好相处。
