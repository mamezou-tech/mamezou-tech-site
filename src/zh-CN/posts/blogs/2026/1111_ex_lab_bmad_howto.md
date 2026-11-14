---
title: 【敏捷 FAQ 今日实验室】试用 BMAD——从环境搭建到比较“仅 AI”和“人来回答”（后篇·操作篇）
author: tomohiro-fujii
date: 2026-11-11T00:00:00.000Z
tags:
  - スクラム
  - アジャイル
  - アジャイル開発
  - 生成AI
  - AI
  - BMAD
  - Claude Code
translate: true

---

&emsp;感谢您阅读本文。我是隶属于敏捷小组的藤井智弘。
&emsp;在前篇中，我从担心“唯 AI 是从”的立场试用了 BMAD Method（以下简称 BMAD），并写下了对它的评价。后篇则是一份**用于在本地复现实验的操作指南**。
&emsp;与前篇相同，本文涉及的范围截至分析和规划阶段（即“要做什么”确定之前）。不涉及让 AI 编写代码的操作步骤。

## 本文要做什么

1. 准备开发容器，并在其中安装 Claude Code 和 BMAD
2. 将对话和文档设置为日语，并确定称呼
3. 实验 1：只提供一句需求，让 AI 独自生成产品简介和产品需求文档（PRD）
4. 实验 2：人在回答 AI 问题的同时，创建产品简介
5. 并列比较两项结果，找出“人应当确认的事项”

&emsp;这些步骤已于 2026 年 11 月，使用 **BMAD v6.12.4（稳定版）** 和 Claude Code 验证。BMAD 的版本变化很快，预览版 V7 的命令体系本身就不同。请固定版本后再进行尝试。

## 1. 需要准备的东西

| 项目 | 本次使用的内容 |
|---|---|
| OS | macOS |
| 容器运行环境 | OrbStack（也可使用 Docker Desktop） |
| 运行开发容器的工具 | VS Code 的 Dev Containers 扩展，或 devcontainer CLI |
| Claude 账户 | Claude 订阅（可使用 Claude Code 的订阅） |

&emsp;Node.js、Python、uv 和 Claude Code 都安装在容器中。

&emsp;不过，本地 Mac 上也需要有 `~/.claude` 文件夹和 `~/.claude.json` 文件（用于在下一步中将这两者与容器共享）。如果两者都没有，请先在 Mac 上启动一次 Claude Code。如果使用 devcontainer CLI，请先通过 `npm i -g @devcontainers/cli` 安装。

## 2. 准备开发容器

&emsp;BMAD 使用 `npx` 安装，也会使用 Python 脚本。为了避免每次试用都弄乱本地环境，我们在开发容器中运行它。在工作文件夹中创建 `.devcontainer/`，并放入以下两个文件。

**`.devcontainer/Dockerfile`**

```dockerfile
FROM mcr.microsoft.com/devcontainers/typescript-node:22
# 已包含 Node.js 22（BMAD v6.12 需要 20.12 以上）、git 和 zsh

# 在容器中安装 Claude Code
RUN npm install -g @anthropic-ai/claude-code

USER node
```

**`.devcontainer/devcontainer.json`**

```json
{
  "name": "bmad-lab",
  "build": { "dockerfile": "Dockerfile" },
  "features": {
    "ghcr.io/devcontainers/features/python:1": { "version": "3.12" },
    "ghcr.io/va-h/devcontainers-features/uv:1": {}
  },
  "remoteUser": "node",
  "mounts": [
    "source=${localEnv:HOME}/.claude,target=/home/node/.claude,type=bind",
    "source=${localEnv:HOME}/.claude.json,target=/home/node/.claude.json,type=bind"
  ],
  "customizations": {
    "vscode": {
      "extensions": ["anthropic.claude-code"],
      "settings": { "terminal.integrated.defaultProfile.linux": "zsh" }
    }
  }
}
```

&emsp;关键在于 `mounts`。将本地的 `~/.claude` 与容器共享后，Claude Code 的登录信息会保留在容器外部。即使重建容器，也不需要重新登录。
&emsp;在 VS Code 中打开这个文件夹后，选择“Reopen in Container”，容器就会启动。如果要从终端启动，操作如下。

```bash
devcontainer up --workspace-folder .
devcontainer exec --workspace-folder . zsh   # 进入容器中的 shell
```

&emsp;首次启动时需要构建 Python 环境，因此会花几分钟。之后的所有步骤都在容器内的终端中执行。

## 3. 登录 Claude Code

&emsp;在容器中启动 `claude`，输入 `/login`，然后选择“Claude account with subscription”。有两个容易踩坑的地方。

- **URL 复制时被截断**：由于无法从容器打开浏览器，屏幕上会显示登录用 URL。这个 URL 很长，会因屏幕宽度而换行，因此在选中复制时很容易截断。打开被截断的 URL 后，会显示“无效的 OAuth 请求”。请将终端窗口拉宽到足以让 URL 显示在一行内，再进行复制
- **把代码粘贴到别的界面**：授权后浏览器显示的代码，只能在生成该 URL 的 Claude Code 界面中使用。若粘贴到另一个终端中的 Claude Code，会显示“That code wasn't accepted”

&emsp;看到“Login successful”即表示完成。接下来询问是否信任文件夹时，选择“Yes, I trust this folder”。如果保持默认的“No, exit”并按 Enter，Claude Code 会直接退出。

## 4. 安装 BMAD

&emsp;创建工作文件夹（此处为 `trials/support-site`），然后安装 BMAD。若采用交互式安装，请使用以下命令，并选择 Claude Code 作为 AI 工具、bmm（BMad Method）作为模块。

```bash
mkdir -p trials/support-site && cd trials/support-site
npx bmad-method@6.12 install
```

&emsp;如果希望每次都以相同配置安装，可以通过选项传入选择内容。

```bash
npx -y bmad-method@6.12 install --yes --tools claude-code --modules bmm \
  --communication-language Japanese --document-output-language Japanese \
  --directory "$PWD"
```

&emsp;安装完成后，文件夹中会生成以下内容。

| 位置 | 内容 |
|---|---|
| `.claude/skills/bmad-*` | 可从 Claude Code 调用的技能（BMAD 各个角色及其步骤的说明书） |
| `_bmad/` | 配置和脚本。`_bmad/custom/` 是供用户覆盖配置的位置 |
| `_bmad-output/` | 产物存放位置。规划文档会进入 `planning-artifacts/` |

## 5. 将对话和文档设置为日语，并确定称呼

&emsp;如果在安装时指定了 `--communication-language Japanese`，BMAD 实际读取的设置将是日语。不过，有两个容易混淆的地方。

- 打开安装器写出的基础配置文件（`_bmad/config.toml`）时，会看到对话语言写着 `English`。实际使用的值由另一个文件决定，因此不必仅因这一点而慌张
- Agent 对你的称呼，默认会是 OS 用户名。在开发容器中，它会称呼你为“Node”

&emsp;基础配置文件会在每次重新安装时被覆盖，因此不要直接修改它。建议改为在用于覆盖设置的 `_bmad/custom/config.toml` 文件末尾添加以下内容，以固定配置。

```toml
[core]
user_name = "Tom"
communication_language = "Japanese"
document_output_language = "Japanese"
project_name = "support-site"
```

&emsp;`project_name` 会用于产物的文件夹名称。可以通过以下命令确认实际使用的配置。

```bash
uv run _bmad/scripts/resolve_config.py --project-root .
```

&emsp;如果输出开头如下所示，即表示成功。

```json
{
  "core": {
    "user_name": "Tom",
    "communication_language": "Japanese",
    "project_name": "support-site",
    "document_output_language": "Japanese",
    "output_folder": "_bmad-output"
  },
```

&emsp;最后启动 Claude Code 并调用 `/bmad-help`。如果返回 BMAD 技能的使用说明，准备工作就完成了。

### 用一个脚本完成步骤 4 和 5

&emsp;将前提检查、安装、固定设置和验证整合到一个脚本中，如下所示。在开发容器中像 `bash setup_bmad.sh trials/support-site Tom` 这样执行（第二个参数是称呼）。已确认可以在新文件夹中完整执行到最后。

```bash
#!/usr/bin/env bash
# 创建 BMAD v6.12 的实验环境（在开发容器中执行）
#   bash setup_bmad.sh [工作文件夹] [称呼]
#   示例：bash setup_bmad.sh trials/support-site Tom
set -euo pipefail
DIR="${1:-trials/support-site}"
NAME="${2:-User}"
BMAD_VERSION="${BMAD_VERSION:-6.12}"

echo "== 检查前提条件"
ok=1
check() {
  if command -v "$1" >/dev/null 2>&1; then
    echo "  ✓ $1 $("$1" --version 2>/dev/null | head -1)"
  else
    echo "  ✗ 未找到 $1"; ok=0
  fi
}
check node; check python3; check uv; check git; check claude
[ "$ok" = 1 ] || { echo "请先安装缺少的内容后再执行一次"; exit 1; }

echo "== 安装 BMAD v${BMAD_VERSION}：$DIR"
mkdir -p "$DIR"
npx -y "bmad-method@${BMAD_VERSION}" install --yes --tools claude-code --modules bmm \
  --communication-language Japanese --document-output-language Japanese \
  --directory "$(cd "$DIR" && pwd)"

echo "== 将对话和文档固定为日语（_bmad/custom/config.toml）"
cd "$DIR"
if ! grep -q '^\[core\]' _bmad/custom/config.toml 2>/dev/null; then
  cat >> _bmad/custom/config.toml <<EOF

[core]
user_name = "${NAME}"
communication_language = "Japanese"
document_output_language = "Japanese"
project_name = "$(basename "$PWD")"
EOF
fi

echo "== 检查设置"
uv run _bmad/scripts/resolve_config.py --project-root . \
  | grep -E '"(user_name|communication_language|document_output_language|project_name)"'
echo "完成。接下来请执行：cd $DIR && claude，然后调用 /bmad-help"
```

## 6. 本次使用的技能

&emsp;v6.12.4 中有约 30 个技能。在分析和规划阶段，本次使用以下技能。

| 技能 | 角色 | 做什么 | 产物 |
|---|---|---|---|
| `bmad-help` | 引导 | 查看当前状态，并推荐下一步应使用的技能 | 无 |
| `bmad-product-brief` | 分析师 | 通过对话挖掘需求，创建产品简介 | `briefs/…/brief.md` |
| `bmad-prd` | PM | 基于产品简介等内容创建产品需求文档 | `prds/…/prd.md` |
| `bmad-prfaq` | 分析师 | 从完成时的新闻稿反推，以验证构想（替代产品简介） | PRFAQ |
| `bmad-advanced-elicitation` | 随时 | 使用预演失败分析等方法，进一步打磨草稿 | 修订后的草稿 |

&emsp;每项技能都会连同产物一起创建记录文件（`.memlog.md`），逐行记录已决定的事项、推测的事项和被撤销的事项。

## 7. 实验 1：仅由 AI 完成（无头模式）

&emsp;产品简介和 PRD 技能都提供一种无需向人提问、仅凭现有信息和推测完成文档的推进方式（无头模式）。通过它，我们可以了解“人在完全没有回答时，会生成怎样的文档”。
&emsp;以 `-p`（仅执行一次后退出）启动 Claude Code，并调用技能。

```bash
claude -p --dangerously-skip-permissions \
'/bmad-product-brief 请以无头模式执行（headless: true、intent: create）。
输入只有以下这一句话。没有其他信息。
“请为本公司产品的用户创建一个支持网站，最大化提升客户便利性。”
不要向人提问，请遵循技能中 Headless Mode 的指示完成产品简介，并在最后返回 JSON 状态。' \
  < /dev/null > headless_brief.log 2>&1
```

&emsp;`--dangerously-skip-permissions` 表示无需确认即可允许写入文件和执行命令。为了让它不询问人而一直运行到结束，才添加了该选项；但请只在像本次这样**可随时丢弃的容器中**使用。
&emsp;这次大约 6 分钟完成，并生成以下 3 个文件。

```text
_bmad-output/planning-artifacts/briefs/brief-support-site-2026-11-09/
├── brief.md      产品简介
├── addendum.md   未能容纳进产品简介的材料（如调研要点）
└── .memlog.md    决策、推测和调研结果的记录
```

&emsp;文件夹名称中的日期取自容器时间（协调世界时）。如果在日本时间的早晨执行，日期会显示为前一天。
&emsp;**为了避免与下一项实验混在一起，请在此处修改文件夹名称。**因为实验 2 的产品简介也会尝试使用相同日期的文件夹名称。

```bash
mv _bmad-output/planning-artifacts/briefs/brief-support-site-2026-11-09 \
   _bmad-output/planning-artifacts/briefs/brief-support-site-headless
```

&emsp;接着，让它基于这份产品简介创建 PRD。

```bash
B=_bmad-output/planning-artifacts/briefs/brief-support-site-headless
claude -p --dangerously-skip-permissions \
"/bmad-prd 请以无头模式执行（headless: true、intent: create）。
输入只有产品简介 $B/brief.md 和 $B/addendum.md。不要向人提问，请遵循技能 references/headless.md 中的指示完成 PRD，并在最后返回 JSON 状态。" \
  < /dev/null > headless_prd.log 2>&1
```

&emsp;这次耗时约 13 分钟，生成了一份 586 行的 PRD。`prds/prd-support-site-…/` 中除了 PRD 和记录文件外，还会保留技能自身编写的审查内容（`review-rubric.md`、`review-polish-*.md`），以及与输入产品简介进行核对的结果（如 `reconcile-brief.md`）。
&emsp;日志末尾会以 JSON 返回状态。这是最重要的输出（以下为摘录）。

```json
{
  "status": "partial",
  "intent": "create",
  "open_questions": [
    "★Q1 产品是什么（企业软件／面向消费者／设备）。用户人数和职业",
    "Q2 当前咨询数量、构成、解决所需时间（这将决定目标值和首篇文章的选择方式）",
    "★Q3 现有 FAQ、手册和咨询窗口分别是什么，由谁管理。可以从咨询窗口获取什么内容",
    "…（共 10 项）"
  ],
  "assumptions": [
    "产品为企业软件，用户是不具备该产品专业知识的业务人员",
    "…（共 12 项）"
  ]
}
```

&emsp;请确认：`status` 并不是 `complete`（完成），而是 `partial`（需要人工确认）；并且其中并列列出了 `open_questions`（人应回答的问题）和 `assumptions`（通过推测设定的前提）。**仅由 AI 创建的文档，其价值不在正文，而在这两份列表中。**

### 用一个脚本完成实验 1

&emsp;以下脚本将产品简介、修改文件夹名称以及 PRD 全部整合在一起。如果想更换题目，可以像 `REQUEST="（你的需求）" bash run_experiment1.sh` 这样，替换一句需求后再执行。日志会保留在 `trials/support-site/logs/` 中。请从包含 `trials/` 的工作文件夹最上层执行。

&emsp;重新执行时，请先删除旧的 `brief-support-site-headless` 文件夹，或为其改名。如果保留不动，新的产品简介会被嵌套移动到其中。

```bash
#!/usr/bin/env bash
# 实验 1：只提供一句需求，让 AI 独自（无头模式）创建产品简介和 PRD
# 在开发容器中执行：bash run_experiment1.sh [工作文件夹]
# 更换题目时：REQUEST="（你的需求）" bash run_experiment1.sh
set -euo pipefail
cd "${1:-trials/support-site}"
REQUEST="${REQUEST:-请为本公司产品的用户创建一个支持网站，最大化提升客户便利性。}"
BRIEFS=_bmad-output/planning-artifacts/briefs
HEADLESS="$BRIEFS/brief-$(basename "$PWD")-headless"
mkdir -p logs

echo "== 1/3 仅由 AI 创建产品简介（需要数分钟）"
claude -p --dangerously-skip-permissions \
"/bmad-product-brief 请以无头模式执行（headless: true、intent: create）。
输入只有以下这一句话。没有其他信息。
“${REQUEST}”
不要向人提问，请遵循技能中 Headless Mode 的指示完成产品简介，并在最后返回 JSON 状态。" \
  < /dev/null > logs/headless_brief.log 2>&1

echo "== 2/3 修改文件夹名称，以免与实验 2 混在一起"
SRC=$(ls -dt "$BRIEFS"/brief-* | grep -v -- '-headless$' | head -1)
mv "$SRC" "$HEADLESS"
echo "   $SRC → $HEADLESS"

echo "== 3/3 基于该产品简介，仅由 AI 创建 PRD（需要十几分钟）"
claude -p --dangerously-skip-permissions \
"/bmad-prd 请以无头模式执行（headless: true、intent: create）。
输入只有产品简介 $HEADLESS/brief.md 和 $HEADLESS/addendum.md。不要向人提问，请遵循技能 references/headless.md 中的指示完成 PRD，并在最后返回 JSON 状态。" \
  < /dev/null > logs/headless_prd.log 2>&1

echo "完成。请确认最后的 JSON（status、open_questions、assumptions）："
echo "  tail -60 $PWD/logs/headless_prd.log"
```

## 8. 实验 2：由人回答后完成

&emsp;使用同样的需求，这次让人在回答 AI 问题的过程中创建产品简介。正常启动 Claude Code，并以交互方式推进。

```bash
claude
```

&emsp;调用技能并写下需求。为避免重新打开实验 1 的文件夹，再补充一句说明。

```text
/bmad-product-brief 我想新建产品简介（现有的 briefs/brief-support-site-headless 是另一项实验，请不要继续该实验）。

请为本公司产品的用户创建一个支持网站，最大化提升客户便利性。
```

&emsp;分析师会按照以下顺序推进。

1. **把脑中的内容全部说出来**：它会要求你不必在意顺序，写下产品、用户、痛点和契机。还会询问是否有现有资料
2. **还有没有其他内容**：相关人员、过去的失败经验、希望避免的事项
3. **选择推进方式**：选择“快速路径（Fast path）”（将余下内容浓缩成几个问题询问，并一口气生成带有推测标记的草稿）或“辅导路径（Coaching path）”（逐节撰写，并不断接受追问）。以日语运行时，Agent 会将这两种方式翻译为“快速路径”“细致路径”等形式展示
4. **草稿与追问**：它会针对最薄弱的点进行追问，也会询问推测部分是否正确
5. **收尾**：确认记录文件中每一项的反映位置，审阅文档后完成

&emsp;对于无法回答的问题，可以回答“不清楚”“目前无法决定”。分析师会以带有推测标记的方式补充，或者将其作为“尚未了解的事项”保留。**能够坦然说出不知道什么**，正是这种推进方式最适合发挥作用的地方。中途还可能会收到调研结果，因为分析师会在后台执行 Web 调研。
&emsp;这次通过“快速路径”进行了 7 轮往返（为了记录，我使用 `claude -p --resume` 每次推进一轮；但平时直接交互即可）。从该产品简介继续进入 PRD 时，请按推荐做法在新的会话中启动 `bmad-prd`，并注意不要与实验 1 的 PRD 文件夹发生名称冲突。

## 9. 如何解读结果

&emsp;在前篇中，我通过以下三个维度进行评价。

| 维度 | 主要查看的实验 | 查看内容 |
|---|---|---|
| 1. 一味听从会怎样 | 实验 1 | 推测标记、未确认的问题，以及在这些内容基础上堆积起来的文档体量 |
| 2. 与 AI 的对话是否成立 | 实验 2 | 对已听内容的复述、下一个问题是否会根据回答变化、如何处理“不清楚” |
| 3. 对话是否让人的想法得到提炼 | 对比实验 1 和 2 | 对题目的重新表述、对判断的处理、由人修改 AI 建议的记录 |

&emsp;完成两项实验后，请按以下顺序进行对比阅读。① 对应维度 1，② 和 ④ 对应维度 2 与 3，③ 对三个维度都有效。

**① 统计推测标记，并列成清单**

```bash
cd trials/support-site/_bmad-output/planning-artifacts   # 从工作文件夹最上层开始
grep -n "\[ASSUMPTION" briefs/brief-support-site-headless/brief.md
grep -c "\[ASSUMPTION" prds/*/prd.md
```

&emsp;这次，实验 1 的产品简介中有 5 处，PRD 中有 31 处。**这个数量就是人应当确认事项的数量。**需要注意的是，产品简介的 grep 结果中，还会命中一行说明文字：“对通过推测补充的部分加上 `[ASSUMPTION]`……”，因此统计时需要扣除这一行。

&emsp;数量、行数和耗时会随着每次执行而变化。为了验证而再次执行时，PRD 为 482 行，推测标记有 27 处。请将本文中的数字仅视为参考。

**② 在记录文件中查看被撤销的推测**

&emsp;`.memlog.md` 的每一行都带有类型，例如 `decision`（决策）、`assumption`（推测）、`override`（撤销／覆盖）、`insight`（调研发现）和 `gap`（尚未了解的事项）。

```bash
grep "^- (assumption)" briefs/*/.memlog.md
grep "^- (override)"   briefs/*/.memlog.md
```

&emsp;记录文件的内容例如如下所示（摘自本次实际结果）。实验 1 中并列的是推测和调研发现，实验 2 中并列的是由人的回答得出的决策和撤销内容。

```text
# 来自实验 1（仅 AI）的记录
- (assumption) 假定产品是 B2B 企业软件（套装软件/SaaS）。无依据：仅出现“本公司产品的用户”“客户”等词语。若为 B2C 或实体产品，结构会发生变化
- (assumption) 假定当前咨询窗口以电话和邮件为主，FAQ/手册分散或为 PDF
- (insight) 调研：自助服务中完全解决的比例为 14%，最大的失败原因是“找不到相关信息”43%（Gartner 2024）。网站的核心不是文章数量，而是“能被找到”

# 来自实验 2（人来回答）的记录
- (decision) 当前窗口：已经有一个简单的支持网站。咨询通过邮件、电话和负责销售人员进行
- (decision) 当前网站无用的原因：用户认为文章不足（c）、难以查找（b）（这并非已验证的结果，而是一种判断）
- (decision) 改述（AI 的建议，尚未得到用户确认）：不是“创建网站”，而是创建这样一种状态：“用户能在短时间内、不询问他人的情况下解决操作问题，仍然存在的问题则由非开发人员的窗口受理”
- (override) 撤销“第一版不包含 AI 自动响应”的假设，将利用 AI 纳入第一版范围（用户回答：也希望利用 AI）。使用方式在 PRD 中决定（候选方案：基于文章回答／创建文章草稿／协助一线窗口）
```

&emsp;可以看出，实验 1 的第 1、2 行内容被实验 2 的第 1 行推翻了。像这样核对记录，就能直接制作出前篇中的表格。

&emsp;实验 2 中标记为 `override` 的行，是人的回答推翻 AI 推测的记录。这一次，“第一版不包含 AI 自动响应”的推测，就因为我说了一句“也希望利用 AI”而被撤销。

**③ 对照实验 1 的推测与实验 2 的回答**

&emsp;将实验 1 的 `assumptions` 和 `open_questions` 放在左侧，将实验 2 中人的回答内容放在右侧。前篇中的表格就是基于这种对照创建的。若将内容分为“猜对的推测”“猜错的推测”“作为问题保留才是正确做法的事项”三类，就能看出工具的行为特征。

**④ 区分 AI 的建议与人的决策**

&emsp;阅读实验 2 的产品简介，区分“人回答的内容”与“AI 提出的、但人尚未认可的内容”。这次，分析师自己就说明了开头的改述“是我的建议，尚未获得认可”。请不要将尚未认可的建议作为决策传递到下一道流程。

## 10. 遇到的问题

| 症状 | 原因与处理方法 |
|---|---|
| 浏览器显示“无效的 OAuth 请求” | 登录 URL 复制时被截断。请将终端拉宽，确保 URL 显示在一行内后再复制 |
| “That code wasn't accepted” | 将代码粘贴到了与生成 URL 的 Claude Code 不同的实例中。请粘贴到生成该 URL 的界面 |
| 首次启动时 Claude Code 直接结束 | 在文件夹信任确认中选择了默认的“No, exit”。请重新启动并选择“Yes” |
| Agent 称呼你为“Node” | 默认称呼是 OS 用户名。在 `_bmad/custom/config.toml` 中设置 `user_name` |
| `_bmad/config.toml` 中写着 `English` | 实际使用的值由其他位置决定。请通过 `resolve_config.py` 的输出确认 |
| 产物文件夹的日期变成前一天 | 容器时间为协调世界时。虽然没有实际影响，但记录时需要注意 |
| 实验 2 试图开始继续实验 1 | 因为使用了相同日期的文件夹名称。请提前修改实验 1 的文件夹名称，并在调用时也补充说明 |

## 结语

&emsp;操作本身比预想中简单：安装需要几分钟，仅 AI 的实验约需 20 分钟。最耗时的部分，是我在实验 2 中回答 AI 问题的时间。我认为，那恰恰才是这个工具正确的使用方式。
&emsp;建议带着仅 AI 实验中出现的 `open_questions` 和 `assumptions` 清单，进入由人回答的实验。你会惊讶地发现，自己到底不了解什么会变得非常清晰。请务必用手头的题目试一试。
&emsp;另外，本文涉及的范围仅截至分析和规划阶段。这个连载从主线到番外篇，实验室和绕路内容越来越多，因此我想日后再选择合适的时机，写一写使用 BMAD 后续流程的内容。

---

*前篇：“BMAD 能否消除对‘唯 AI 是从开发’的担忧？”／下次：“PO 很忙，无法来到团队”（12/1）／本篇连载列表请参阅第 1 篇。*
