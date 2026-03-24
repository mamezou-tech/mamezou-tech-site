---
title: 使用 Kiro CLI 试验 Ralph 循环
author: hironori-maruoka
date: 2026-01-30T00:00:00.000Z
tags:
  - Kiro
  - AIDD
  - AIエージェント
image: true
translate: true

---

## 引言

AI 代理的自主开发非常有吸引力，但在长时间处理时会因上下文退化导致精度下降。针对这一挑战，备受关注的方案是**Ralph 循环**（一种在每次处理后丢弃上下文，并在新会话中继续处理的自主开发方法）。本文将分享使用 Kiro CLI[^4]（支持 AI 代理自主开发的 CLI 工具）验证 Ralph 循环的结果和实践中获得的经验教训。

## 背景：上下文管理的挑战与 Ralph 循环

传统 AI 聊天的难点在于，长时间对话中上下文会被压缩或退化，导致精度下降[^1]。

Ralph 循环的核心原则是**避免上下文腐败**[^2]。在每个任务完成后丢弃上下文，并在新会话中启动下一任务，形成循环结构。乍看之下是简单的技巧，但据认为可在保持精度稳定的同时，实现长时间任务的执行。

本次验证中，我们没有使用经典组合 Claude Code + PRD.md（Product Requirements Document: 产品需求规格说明书），而是改用**Kiro IDE[^5]（从规范编写到任务管理进行交互式支持的 IDE）生成的三种规范交付物（requirements.md、design.md、tasks.md）**。通过结构化的指令来提高精度。

## 验证题材：电子表格应用

此次验证中，我们开发了在 Web 浏览器上运行的轻量级电子表格应用。

### 应用程序规格

* 10 列×20 行的网格、单元格引用、四则运算  
* SUM/AVG 函数、循环引用错误检测  
* 技术栈：React + TypeScript + Vite + Vitest  

选题要点是**相对复杂度较高、上下文可能被挤压导致处理迷失的应用**。涉及公式解析器、依赖关系图、循环引用检测等多个概念，旨在检验 Ralph 循环的实用性。

### 完成的应用

先介绍本次创建的电子表格应用。初始界面显示如下 10 列×20 行的网格和公式栏。

![完成的电子表格应用（初始界面）](/img/blogs/2026/0130_kiro_cli_ralph/spreadsheet_sample.png)

已实现单元格引用、四则运算、SUM/AVG 函数等功能，支持基于公式的自动计算。以下示例演示了使用 SUM 函数进行简单数值运算。

![基于公式的自动运算示例](/img/blogs/2026/0130_kiro_cli_ralph/spreadsheet_sample_sum_func.png)

### 测试质量

通过自主执行，自动生成并实现了以下测试：

- **测试用例总数**：126 个  
- **单元测试**：101 个  
- **基于属性测试**（通过随机输入验证规范属性的测试方法）：25 个  

Kiro CLI 遵循测试驱动开发方法，自主构建了包含基于属性测试的随机输入验证测试套件。即使对于人类难以预测的输入模式，也能高效生成用于验证循环引用检测和公式评估准确性的测试，有助于保证质量。

## 实施步骤

Ralph 循环的实现分为以下两步。

## 步骤1：使用 Kiro IDE 的准备阶段

### 项目结构

首先准备如下项目目录结构：

```text
project/
├── .kiro/specs/spreadsheet-sample/
│   ├── requirements.md      # EARS 记法的需求定义
│   ├── design.md            # 系统设计文档
│   └── tasks.md             # 实现任务列表
├── progress.txt             # 记录实现进度（在迭代间传递）
├── ralph-once.sh            # 单次执行脚本
└── afk-ralph.sh             # Ralph 循环控制脚本
```

### 1-1. 规范交付物的创建

使用 Kiro IDE 定义电子表格应用的规范。在 Spec 模式下，于 `.kiro/specs/spreadsheet-sample/` 目录生成以下 3 个规范交付物：

* **requirements.md**：使用 EARS 记法（需求定义的语法规则）编写的需求定义。明确地描述了验收标准  
* **design.md**：系统设计文档。包含架构和组件设计  
* **tasks.md**：实现任务列表。Kiro CLI 会读取此文件并实现未完成的任务  

通过与 Kiro IDE 的交互，传达应用程序需求，完成这些规范交付物。此阶段尚不会生成代码。

### 1-2. 创建 Shell 脚本

接下来，创建用于控制 Ralph 循环的 Shell 脚本 `afk-ralph.sh`。脚本实现参考了 AIHero.dev 的指南[^3]。

### 主循环

```bash:afk-ralph.sh（主循环部分）
for ((i=1; i<=${1}; i++)); do
  echo "loop iteration $i"

  # 读取三种规范和 progress.txt
  req="$(cat "${SPEC_DIR}/requirements.md")"
  des="$(cat "${SPEC_DIR}/design.md")"
  tasks="$(cat "${SPEC_DIR}/tasks.md")"
  progress="$(cat progress.txt 2>/dev/null || echo '尚无进度')"

  # 将占位符替换为实际内容
  prompt="$(build_prompt)"
  prompt="${prompt/__REQ__/$req}"
  prompt="${prompt/__DES__/$des}"
  prompt="${prompt/__TASKS__/$tasks}"
  prompt="${prompt/__PROGRESS__/$progress}"

  logfile="/tmp/kiro-iteration-${i}.log"
  kiro-cli chat --no-interactive --trust-all-tools "$prompt" 2>&1 | tee "$logfile"

  # 通过未完成任务数量和 COMPLETE 输出判断是否结束
  uncompleted=$(grep -cE '^\- \[ \]' "${SPEC_DIR}/tasks.md" 2>/dev/null || echo "0")
  has_promise=$(grep -q "<promise>COMPLETE</promise>" "$logfile" && echo "yes" || echo "no")

  if [ "$uncompleted" -eq 0 ] && [ "$has_promise" = "yes" ]; then
    echo "All tasks verified complete after $i iterations."
    exit 0
  fi
done
```

在主循环中，每次迭代都会读取规范文件，将其嵌入提示并执行 Kiro CLI。结束条件是同时满足 **tasks.md 中未完成的任务为零** 且 **AI 输出 `<promise>COMPLETE</promise>`**。

### 执行选项与风险

- `--no-interactive`: 禁用交互模式，无需等待用户输入即可自动执行  
- `--trust-all-tools`: 自动批准所有工具执行，不会要求确认命令执行  

虽然这些选项可以实现完全自主执行，但存在执行非预期命令的风险。因此，必须在 devcontainer 等隔离环境中执行。正如后文“发现与教训”中所述，不建议在不进行环境隔离的情况下执行。

### 给 AI 代理的提示

```bash:afk-ralph.sh（提示模板部分）
build_prompt() {
  cat <<'PROMPT'
【需求】__REQ__
【设计】__DES__
【任务列表】__TASKS__
【进度】__PROGRESS__

1. 理解需求和设计
2. 查看任务列表和进度，找出下一个未完成的任务
3. 执行该任务
4. 提交变更
5. 完成后，将 tasks.md 中的复选框从 [ ] 更新为 [x]（必需）
6. 将完成的内容附加到 progress.txt 中（必需）

每次执行仅实现一个任务
禁止使用 npm run test。必须使用 npm run test:unit 或 npm run test -- --run
禁止常驻进程，必须只执行一次即可结束的命令
(省略)
仅在所有任务完成时输出 <promise>COMPLETE</promise>
如果 tasks.md 中仍有未完成任务 [ ]，则绝对不要输出 <promise>COMPLETE</promise>
PROMPT
}
```

提示中包含将三种规范和进度嵌入的占位符，以及对 AI 代理的详细执行约束。特别是禁止常驻进程和明确结束条件非常重要。

## 步骤2：使用 Kiro CLI 运行 Ralph 循环

在 devcontainer（VS Code 的容器化开发）环境中执行 Shell 脚本，启动 Ralph 循环。

```bash
$ ./afk-ralph.sh 10
START afk-ralph.sh
loop iteration 1
# ... kiro-cli 实现任务1，并提交 ...
loop iteration 2
# ... kiro-cli 实现任务2，并提交 ...
...
All tasks verified complete after 7 iterations.
```

参数 `10` 表示最大迭代次数。每次迭代都会在新的上下文中启动 Kiro CLI 并执行任务。

上图展示了在完成任务2.2和2.3后，进入迭代2的场景。

![Ralph 循环的迭代切换](/img/blogs/2026/0130_kiro_cli_ralph/kiro_ralph_loop_iteration_1_to_2.png)

每次迭代执行以下操作：

1. 读取三种规范交付物和进度  
2. 确定下一个未完成的任务  
3. 实现任务并执行测试  
4. 提交变更  
5. 更新 tasks.md 中的复选框  
6. 在 progress.txt 中记录进度  

---

## 发现与教训

### 环境隔离是必需的

自主执行以自动批准所有命令为前提，不可预知可能发生的行为。这次在 devcontainer 环境中执行，感受到预测 AI 行为的难度，比如进度文件出现在多个位置。

### 去掉等待模式与交互确认

为了自主执行，需要避免插入中断。这次在提示中指示禁止执行伴有交互确认或等待的命令。

### 大量消耗 Token

由于每次处理都要新建会话并从零开始输入，消耗的 token 会比以往更多。需要在资源充足的环境中执行。

---

## 总结

虽然完成的应用程序基本功能运行正常，但与商业产品相比功能方面的差距显而易见。但在深夜启动脚本，第二天早上醒来时发现应用已完成可运行的体验，让人切实体会到了 AI 代理的可能性。

这次是一个需要几十次迭代即可完成的简单题材，但我想挑战需要数百次迭代的复杂应用程序开发。

本次开发的仓库已在以下地址公开。（可能会在未经通知的情况下停止公开）

@[og](https://github.com/hironori-maruoka/kiro-ralph)

[^1]: 16x Engineer. [LLM Context Management Guide: Performance degrades with more context](https://eval.16x.engineer/blog/llm-context-management-guide#performance-degrades-with-more-content).
[^2]: The Ralph Wiggum Loop from 1st principles (by the creator of Ralph). [YouTube](https://www.youtube.com/watch?v=4Nna09dG_c0).
[^3]: AIHero.dev. [Getting Started with Ralph: Create your script](https://www.aihero.dev/getting-started-with-ralph).
[^4]: AWS. [Kiro CLI 的介绍](https://aws.amazon.com/jp/blogs/news/introducing-kiro-cli/).
[^5]: AWS. [Kiro 的介绍](https://aws.amazon.com/jp/blogs/news/introducing-kiro/).
