---
title: 使用 AI 与 Marp 打造工程师风格的演示文稿制作方法
date: 2026-04-27T00:00:00.000Z
tags:
  - Marp
  - 生成AI
  - AI
author: akihiro-ishida
image: true
translate: true

---
## 前言

我是敏捷组的石田。

前些天，也就是3月24日，参加了[豆寄席“思考Scrum Master如何活用AI：强化透明性·检验·适应三大支柱的实践方法”](https://mamezou.connpass.com/event/386346/)并做了演讲。第50届这一里程碑式的活动有超出预期的大量观众参加，衷心感谢大家的参与。再次感受到Scrum Master与AI这一组合的高关注度。

在演讲中，我以Scrum Master如何利用AI为主要主题，同时也提到了使用AI进行演示文稿制作。此次将更详细地介绍这些内容。

已在[GitHub公开](https://github.com/mamezou-ishida/mamezou-presentation)了可用于演示文稿制作的模板仓库。详细用法请参考仓库的README。本文将重点介绍“使用AI制作演示文稿的优势”和“模板特点”。

## 什么叫使用AI制作演示文稿

### 传统演示文稿制作的挑战

制作演示资料意外地耗时。大致流程整理如下，通常会执行以下步骤：

1. 整理想传达的内容并构思大纲
2. 撰写各张幻灯片的文本
3. 在 PowerPoint 或 Keynote 中调整布局与设计
4. 反复审阅和修改

其中尤其是 **“1. 构思大纲”** 和 **“3. 美化设计”** 往往耗费大量时间。大纲从零开始思考时容易停滞，而一旦开始精雕细琢设计就没有尽头。

### AI带来的改变

利用生成式AI，可以如下解决上述问题：

- **生成结构提案**：只需提供“想要就XX进行演示”的需求，就能获得章节划分和大纲建议
- **生成幻灯片文本草稿**：结构确定后，可让AI生成各张幻灯片的正文
- **从规格说明书·需求文档转换**：可将规格说明书或会议记录等现有文档作为输入，让AI进行面向演示的摘要与重构

更重要的一点是，擅长文字生成的AI与Markdown非常契合，通过使用Markdown来编写幻灯片，可以将内容生成与修正以自然对话的方式进行，无需像操作PowerPoint这类二进制文件那样直接编辑，也更便于进行差异管理。

## 模板仓库介绍

[mamezou-presentation](https://github.com/mamezou-ishida/mamezou-presentation) 是将 **Marp + GitHub Actions + GitHub Pages** 组合的针对is的演示模板。因采用MIT License开源，外部人士也可自由使用与改造。

### 仓库主要结构

```
mamezou-presentation/
├── presentation/
│   ├── 01_intro.md        # 幻灯片（按数字顺序合并）
│   ├── 02_main.md
│   └── ...
├── images/
│   └── title.svg          # 标题幻灯片用图片
├── mamezou-theme.css       # is品牌主题（紫色系）
└── .github/workflows/      # 自动构建·部署配置
```

幻灯片以 `presentation/NN_name.md` 形式进行分割管理，并按数字顺序合并。无需将所有幻灯片塞入一个文件，便于按章节分文件管理。

## 模板特点

### 只需 Push 即可发布

此模板最大的特点是，**只需将内容推送到 main 分支，即可自动生成 HTML/PDF 并发布到 GitHub Pages**。

无需记住诸如“如何执行构建命令”“如何导出为PDF”等步骤。只需编写Markdown并 push，就能自动生成演示用成果物。

```
git add presentation/01_intro.md
git commit -m "添加幻灯片"
git push origin main
# → GitHub Actions 启动，自动生成并发布 HTML/PDF
```

### VS Code + Marp 扩展实现实时预览

在本地开发中，通过 VS Code 的 [Marp for VS Code](https://marketplace.visualstudio.com/items?itemName=marp-team.marp-vscode) 扩展，可以在编辑 Markdown 的同时实时预览幻灯片，实现“编写 → 检查 → 修改”的快速迭代。

### 与 AI 工作流程的集成（GitHub Spec Kit）

此模板支持通过**GitHub Spec Kit**的 AI 工作流程。可与 Gemini CLI 和 Claude Code 联动，通过以下命令让 AI 主导幻灯片制作：

| 命令 | 内容 |
|---|---|
| `/speckit.specify` | 与 AI 一起整理演示内容的规格（要传达什么） |
| `/speckit.plan` | 基于规格生成幻灯片结构提案 |
| `/speckit.tasks` | 将各张幻灯片的制作任务拆分 |

只要将“要讲什么”以规格形式写出来，AI 就会提出幻灯片的大纲。人类可以集中精力进行审阅和内容充实，从而在更短时间内完成高质量的演示。

另外，通过利用 Spec Kit 的 **[Constitution](https://github.com/mamezou-ishida/mamezou-presentation/blob/main/.specify/memory/constitution.md)**（规范·限制），可以统一 AI 生成文本的语气和风格。将规则以 Constitution 形式定义后，可以跨多张幻灯片保持一致的文体。例如，在此模板中定义了以下规则：

- 幻灯片正文的语气统一为“だ・である”调（常体）（引言部分也可使用“です・ます”调）
- 强调时避免使用日式引号（「」），改用 HTML 的 `<strong>` 标签

### 图表自动转换（Mermaid → PNG）

将 Mermaid 格式（`.mmd`）文件放入仓库后，GitHub Actions 会自动转换为 PNG，并嵌入幻灯片中。

```mermaid
graph LR
    A[撰写规格] --> B[AI 提供结构提案]
    B --> C[Markdown 撰写]
    C --> D[Push]
    D --> E[自动构建·发布]
```

由于可以以文本方式管理图表，与版本控制非常契合。

### 演示者模式与计时器功能

还配备了支持实际演示的功能。

- **演示者模式**：在浏览器中按 `p` 键即可切换到附带演讲者备注的演示者模式
- **倒计时计时器**：利用AI制作了用于管理演讲时间的计时器应用，可与议程一并自定义
- **基于JavaScript的扩展**：由于演示文稿为HTML格式，可通过嵌入JavaScript来创建各章节快捷方式等，实现高度自由的自定义

## 使用AI制作演示文稿的优势汇总

整理至此，利用AI制作演示文稿具有以下优势：

| 优势 | 描述 |
|---|---|
| **速度** | 由于AI生成结构提案和草稿，启动速度快 |
| **质量** | AI能提出漏项较少的结构 |
| **一致性** | 模板保证了每次相同质量的设计 |
| **可复现性** | 由于使用Markdown，易于版本控制和差异对比 |
| **专注力** | 可以专注于“要传达什么”而非设计 |

其中“可以专注”的体验尤为显著，当有了AI和模板，设计上的犹豫消失后，更容易将注意力放在内容质量上。

## 结语

这次借由在豆寄席的演讲，向大家介绍了使用AI制作演示文稿的实践。

模板仓库以 MIT License 开源，因此即使是is外部人士也可自由使用和改造。

- 仓库： [mamezou-ishida/mamezou-presentation](https://github.com/mamezou-ishida/mamezou-presentation)

如有“想要试试”“如果有这样的功能就好了”之类的反馈或问题，欢迎在 GitHub 的 Issue 中提出。欢迎大家尝试使用 AI 与 Markdown 进行演示文稿制作。
