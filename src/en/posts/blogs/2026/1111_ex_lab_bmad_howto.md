---
title: >-
  【Agile FAQ: Today’s Laboratory】Trying BMAD—From Setting Up the Environment to
  Comparing “AI Only” and “Human Answers” (Part 2: Procedures)
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

&emsp;Thank you for reading this article. I am Tomohiro Fujii from the Agile Group.
&emsp;In Part 1, I tried the BMAD Method (hereafter, BMAD) from the perspective of someone concerned about “blindly following AI,” and wrote about my evaluation. Part 2 is a **guide for reproducing that experiment yourself**.
&emsp;As in Part 1, this covers only the analysis and planning stages (up to the point before deciding “what to build”). It does not cover the procedure for having AI write code.

## What This Article Covers

1. Prepare a development container and install Claude Code and BMAD in it
2. Set conversations and documents to Japanese, and choose a name to be addressed by
3. Experiment 1: Give AI only a single sentence of requirements and have it create a product brief and Product Requirements Document (PRD) on its own
4. Experiment 2: Create a product brief while a human answers AI’s questions
5. Compare the two results and identify “what humans need to verify”

&emsp;The procedures were verified with **BMAD v6.12.4 (stable release)** and Claude Code as of November 2026. BMAD changes versions rapidly, and the command structure itself differs in the V7 preview release. Please pin the version when trying this.

## 1. What You Need

| Item | What I Used This Time |
|---|---|
| OS | macOS |
| Container runtime | OrbStack (Docker Desktop is also fine) |
| Tool for running development containers | VS Code Dev Containers extension, or the devcontainer CLI |
| Claude account | A Claude subscription that supports Claude Code |

&emsp;Node.js, Python, uv, and Claude Code are all installed inside the container.

&emsp;However, your local Mac also needs the `~/.claude` folder and `~/.claude.json` file (because the next step shares these two with the container). If neither exists, launch Claude Code once on your Mac first. If you use the devcontainer CLI, install it with `npm i -g @devcontainers/cli`.

## 2. Prepare a Development Container

&emsp;BMAD is installed with `npx` and also uses Python scripts. To avoid cluttering your local environment every time you try it, run it inside a development container. Create `.devcontainer/` in your working folder and place the following two files in it.

**`.devcontainer/Dockerfile`**

```dockerfile
FROM mcr.microsoft.com/devcontainers/typescript-node:22
# Includes Node.js 22 (BMAD v6.12 requires 20.12 or later), git, and zsh

# Install Claude Code inside the container
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

&emsp;The key part is `mounts`. Sharing your local `~/.claude` folder with the container keeps Claude Code login information outside the container. Even if you recreate the container, you will not need to log in again.
&emsp;Open this folder in VS Code and select “Reopen in Container” to start the container. To start it from a terminal, use the following:

```bash
devcontainer up --workspace-folder .
devcontainer exec --workspace-folder . zsh   # Enter the shell inside the container
```

&emsp;The first startup takes a few minutes because it builds Python. Perform all subsequent steps in the terminal inside the container.

## 3. Log In to Claude Code

&emsp;Start `claude` inside the container, enter `/login`, and select “Claude account with subscription.” There are two common pitfalls.

- **The copied URL is cut off partway through**: Since you cannot open a browser from the container, a login URL is displayed on screen. It is very long and wraps based on the width of the display, so it is easy to copy only part of it when selecting it. Opening a truncated URL displays “Invalid OAuth request.” Widen the terminal enough to fit the URL on one line before copying it.
- **Pasting the code into a different screen**: The code displayed in the browser after authorization can only be used in the Claude Code screen that generated the URL. If you paste it into Claude Code in another terminal, “That code wasn't accepted” is displayed.

&emsp;You are done when “Login successful” appears. For the folder trust prompt that follows, select “Yes, I trust this folder.” If you press Enter while the default “No, exit” is selected, Claude Code will exit.

## 4. Install BMAD

&emsp;Create a working folder (here, `trials/support-site`) and install BMAD. For interactive installation, use the following command, selecting Claude Code as the AI tool and bmm (BMad Method) as the module.

```bash
mkdir -p trials/support-site && cd trials/support-site
npx bmad-method@6.12 install
```

&emsp;If you want to install it with the same configuration every time, you can pass the choices as options.

```bash
npx -y bmad-method@6.12 install --yes --tools claude-code --modules bmm \
  --communication-language Japanese --document-output-language Japanese \
  --directory "$PWD"
```

&emsp;Once installation is complete, the following items are created in the folder.

| Location | Contents |
|---|---|
| `.claude/skills/bmad-*` | Skills invoked from Claude Code (instruction manuals for each BMAD role and procedure) |
| `_bmad/` | Configuration and scripts. `_bmad/custom/` is where users place overrides |
| `_bmad-output/` | Location for deliverables. Planning documents go into `planning-artifacts/` |

## 5. Set Conversations and Documents to Japanese, and Choose a Name

&emsp;If you specified `--communication-language Japanese` during installation, the configuration BMAD actually reads will be Japanese. However, there are two potentially confusing points.

- If you open the base configuration file generated by the installer (`_bmad/config.toml`), it says the conversation language is `English`. The values actually used are determined from another file, so there is no need to panic based on this alone.
- By default, agents address you using your OS username. Inside the development container, you will be called “Node.”

&emsp;The base configuration file is overwritten whenever you reinstall, so do not edit it directly. Instead, it is safer to append the following to the override file `_bmad/custom/config.toml` to make these settings persistent.

```toml
[core]
user_name = "Tom"
communication_language = "Japanese"
document_output_language = "Japanese"
project_name = "support-site"
```

&emsp;`project_name` is used in the deliverable folder name. You can verify the configuration actually being used with the following command.

```bash
uv run _bmad/scripts/resolve_config.py --project-root .
```

&emsp;If the beginning of the output looks like the following, it worked.

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

&emsp;Finally, start Claude Code and invoke `/bmad-help`. Preparation is complete if you receive guidance about BMAD skills.

### Steps 4 and 5 in a Single Script

&emsp;The following combines prerequisite checks, installation, fixed configuration, and verification into a single script. Run it inside the development container, for example: `bash setup_bmad.sh trials/support-site Tom` (the second argument is the name to be addressed by). I have verified that it completes successfully in a new folder.

```bash
#!/usr/bin/env bash
# Create a BMAD v6.12 experimental environment (run inside a development container)
#   bash setup_bmad.sh [working folder] [name to be addressed by]
#   Example: bash setup_bmad.sh trials/support-site Tom
set -euo pipefail
DIR="${1:-trials/support-site}"
NAME="${2:-User}"
BMAD_VERSION="${BMAD_VERSION:-6.12}"

echo "== Checking prerequisites"
ok=1
check() {
  if command -v "$1" >/dev/null 2>&1; then
    echo "  ✓ $1 $("$1" --version 2>/dev/null | head -1)"
  else
    echo "  ✗ $1 was not found"; ok=0
  fi
}
check node; check python3; check uv; check git; check claude
[ "$ok" = 1 ] || { echo "Install the missing items and run this again"; exit 1; }

echo "== Installing BMAD v${BMAD_VERSION}: $DIR"
mkdir -p "$DIR"
npx -y "bmad-method@${BMAD_VERSION}" install --yes --tools claude-code --modules bmm \
  --communication-language Japanese --document-output-language Japanese \
  --directory "$(cd "$DIR" && pwd)"

echo "== Fixing conversation and document language to Japanese (_bmad/custom/config.toml)"
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

echo "== Checking configuration"
uv run _bmad/scripts/resolve_config.py --project-root . \
  | grep -E '"(user_name|communication_language|document_output_language|project_name)"'
echo "Done. Next: cd $DIR && start claude, then invoke /bmad-help"
```

## 6. Skills Used This Time

&emsp;v6.12.4 has around 30 skills. During the analysis and planning stages, the following are the ones used here.

| Skill | Role | What It Does | Deliverable |
|---|---|---|---|
| `bmad-help` | Guide | Examines the current state and recommends the next skill to use | None |
| `bmad-product-brief` | Analyst | Elicits requirements through dialogue and creates a product brief | `briefs/…/brief.md` |
| `bmad-prd` | PM | Creates requirements specifications from a product brief and other inputs | `prds/…/prd.md` |
| `bmad-prfaq` | Analyst | Tests a concept by working backward from the completed product’s press release (an alternative to a product brief) | PRFAQ |
| `bmad-advanced-elicitation` | As needed | Further challenges a draft using techniques such as premortems | Revised draft |

&emsp;Every skill creates a record file (`.memlog.md`) along with its deliverable, preserving decisions, assumptions, and items that were withdrawn one line at a time.

## 7. Experiment 1: Run with AI Only (Headless)

&emsp;The product brief and PRD skills have a workflow called headless mode, which completes documents using available information and assumptions without asking a person questions. We use this to see “what kind of document results if the human answers nothing.”
&emsp;Start Claude Code with `-p` (run once and exit) and invoke the skill.

```bash
claude -p --dangerously-skip-permissions \
'/bmad-product-brief Run in headless mode (headless: true, intent: create).
The only input is this one sentence. There is no other information.
"Create a support site for users of our products and maximize customer convenience."
Do not ask people questions. Complete the product brief according to the skill’s Headless Mode instructions, and return the final status in JSON.' \
  < /dev/null > headless_brief.log 2>&1
```

&emsp;`--dangerously-skip-permissions` allows file writes and command execution without confirmation. It is included so the process can run to completion without asking a human, but only use it **inside a disposable container**, such as the one used here.
&emsp;This took about six minutes and created the following three files.

```text
_bmad-output/planning-artifacts/briefs/brief-support-site-2026-11-09/
├── brief.md      Product brief
├── addendum.md   Materials that did not fit in the product brief (such as research highlights)
└── .memlog.md    Record of decisions, assumptions, and research findings
```

&emsp;The date in the folder name is based on the container’s time (Coordinated Universal Time). If you run it in the morning Japan time, it will have the previous day’s date.
&emsp;**Rename the folder here so it does not get mixed up with the next experiment.** The product brief from Experiment 2 will also try to use a folder name with the same date.

```bash
mv _bmad-output/planning-artifacts/briefs/brief-support-site-2026-11-09 \
   _bmad-output/planning-artifacts/briefs/brief-support-site-headless
```

&emsp;Next, have it create a PRD from this product brief.

```bash
B=_bmad-output/planning-artifacts/briefs/brief-support-site-headless
claude -p --dangerously-skip-permissions \
"/bmad-prd Run in headless mode (headless: true, intent: create).
The only input is the product brief $B/brief.md and $B/addendum.md. Do not ask people questions. Complete the PRD according to the instructions in the skill’s references/headless.md, and return the final status in JSON." \
  < /dev/null > headless_prd.log 2>&1
```

&emsp;This took about 13 minutes and produced a 586-line PRD. In addition to the PRD and record file, `prds/prd-support-site-…/` also contains reviews written by the skill itself (`review-rubric.md`, `review-polish-*.md`) and the results of cross-checking against the input product brief (`reconcile-brief.md`, and others).
&emsp;The log ends by returning the status in JSON. This is the most important output (excerpt below).

```json
{
  "status": "partial",
  "intent": "create",
  "open_questions": [
    "★Q1 What is the product (business software / consumer-facing / equipment)? Number and job roles of users",
    "Q2 Current number and breakdown of inquiries, and time to resolution (determines target metrics and how to select initial articles)",
    "★Q3 What existing FAQs, manuals, and contact channels are there, and who manages them? What can be incorporated from the contact channels?",
    "… (10 items in total)"
  ],
  "assumptions": [
    "The product is business software, and its users are operational staff who are not product experts",
    "… (12 items in total)"
  ]
}
```

&emsp;Confirm that `status` is not `complete`, but rather `partial` (human verification is required), and that `open_questions` (questions people should answer) and `assumptions` (premises assumed by inference) are listed together. **The value of a document created by AI alone lies less in its body text than in these two lists.**

### Experiment 1 in a Single Script

&emsp;This combines the product brief, folder renaming, and PRD into one script. If you want to change the prompt, replace the one-sentence request and run it like this: `REQUEST="(your request)" bash run_experiment1.sh`. Logs are retained in `trials/support-site/logs/`. Run it from the top-level working folder containing `trials/`.

&emsp;When rerunning it, delete or rename the old `brief-support-site-headless` folder first. If you leave it in place, the new product brief will be moved inside it as a nested folder.

```bash
#!/usr/bin/env bash
# Experiment 1: Give only a one-sentence request and have AI alone (headless) create a product brief and PRD
# Run inside a development container: bash run_experiment1.sh [working folder]
# To change the prompt: REQUEST="(your request)" bash run_experiment1.sh
set -euo pipefail
cd "${1:-trials/support-site}"
REQUEST="${REQUEST:-Create a support site for users of our products and maximize customer convenience.}"
BRIEFS=_bmad-output/planning-artifacts/briefs
HEADLESS="$BRIEFS/brief-$(basename "$PWD")-headless"
mkdir -p logs

echo "== 1/3 Create a product brief with AI only (takes a few minutes)"
claude -p --dangerously-skip-permissions \
"/bmad-product-brief Run in headless mode (headless: true, intent: create).
The only input is this one sentence. There is no other information.
\"${REQUEST}\"
Do not ask people questions. Complete the product brief according to the skill’s Headless Mode instructions, and return the final status in JSON." \
  < /dev/null > logs/headless_brief.log 2>&1

echo "== 2/3 Rename the folder so it does not get mixed up with Experiment 2"
SRC=$(ls -dt "$BRIEFS"/brief-* | grep -v -- '-headless$' | head -1)
mv "$SRC" "$HEADLESS"
echo "   $SRC → $HEADLESS"

echo "== 3/3 Create a PRD from that product brief with AI only (takes more than ten minutes)"
claude -p --dangerously-skip-permissions \
"/bmad-prd Run in headless mode (headless: true, intent: create).
The only input is the product brief $HEADLESS/brief.md and $HEADLESS/addendum.md. Do not ask people questions. Complete the PRD according to the instructions in the skill’s references/headless.md, and return the final status in JSON." \
  < /dev/null > logs/headless_prd.log 2>&1

echo "Done. Check the final JSON (status, open_questions, assumptions):"
echo "  tail -60 $PWD/logs/headless_prd.log"
```

## 8. Experiment 2: Proceed with Human Answers

&emsp;Using the same request, this time create a product brief while a human answers AI’s questions. Start Claude Code normally and proceed interactively.

```bash
claude
```

&emsp;Invoke the skill and write the request. Add a note so it does not resume the folder from Experiment 1.

```text
/bmad-product-brief I would like to create a new product brief (please do not resume the existing briefs/brief-support-site-headless, as it is for a separate experiment).

Create a support site for users of our products and maximize customer convenience.
```

&emsp;The analyst proceeds in the following order.

1. **Get everything out of your head**: You are asked to write about the product, users, problems, and trigger, without worrying about order. You are also asked whether you have materials available.
2. **Anything else?**: Stakeholders, past failures, and things to avoid.
3. **Choose an approach**: Either the “Fast path” (ask the remaining questions in a few grouped questions, then draft everything at once with assumptions marked) or the “Coaching path” (write one section at a time while being challenged). When running in Japanese, the agent translates and presents these as “fast path” and “careful path.”
4. **Draft and challenge**: You are asked about the weakest point, and whether inferred portions are correct.
5. **Finish**: Confirm where each item in the record file is reflected, review the document, and complete it.

&emsp;For questions you cannot answer, it is fine to say “Unknown” or “We cannot decide that now.” The analyst either fills it in with an assumption marker or leaves it as “something not known.” **Being able to say that you do not know something** is the greatest value of this approach. Research results may also arrive during the process, because the analyst runs web research in the background.
&emsp;This time, the “fast path” took seven exchanges (I advanced one exchange at a time using `claude -p --resume` for record-keeping, but ordinary interactive dialogue is sufficient in practice). When proceeding from this product brief to a PRD, begin `bmad-prd` in a new conversation as recommended, and be careful not to have its name collide with the Experiment 1 PRD folder.

## 9. How to Read the Results

&emsp;In Part 1, I evaluated the results from the following three perspectives.

| Perspective | Main Experiment to Examine | What to Look At |
|---|---|---|
| 1. What happens if you blindly follow it? | Experiment 1 | Assumption markers, unconfirmed questions, and the volume of documentation built on top of them |
| 2. Can a dialogue with AI work? | Experiment 2 | Restatements of what was heard, whether subsequent questions change according to answers, and how “unknown” is handled |
| 3. Did the dialogue refine human ideas? | Comparison of Experiments 1 and 2 | Rewording of the prompt, handling of interpretations, and records of humans revising AI proposals |

&emsp;Once you have completed the two experiments, compare them in the following order. Item ① corresponds to Perspective 1; items ② and ④ correspond to Perspectives 2 and 3; and item ③ contributes to all three.

**① Count and list the assumption markers**

```bash
cd trials/support-site/_bmad-output/planning-artifacts   # From the top level of the working folder
grep -n "\[ASSUMPTION" briefs/brief-support-site-headless/brief.md
grep -c "\[ASSUMPTION" prds/*/prd.md
```

&emsp;This time, Experiment 1 had five occurrences in the product brief and 31 in the PRD. **This number is the number of things humans need to verify.** Note that grep on the product brief also matches one line of explanatory text saying something like, “Add `[ASSUMPTION]` to places supplemented through estimation...,” so subtract that occurrence when counting.

&emsp;The number of items, lines, and required time vary with every run. When I ran it again for verification, the PRD was 482 lines and had 27 assumption markers. Treat the article’s numbers as rough guidelines.

**② Look at withdrawn assumptions in the record files**

&emsp;Each line in `.memlog.md` has a type, such as `decision` (decision), `assumption` (assumption), `override` (withdrawal/override), `insight` (research finding), or `gap` (something not known).

```bash
grep "^- (assumption)" briefs/*/.memlog.md
grep "^- (override)"   briefs/*/.memlog.md
```

&emsp;For example, the record files contain the following (excerpts from the actual records produced this time). Experiment 1 lists assumptions and research findings, while Experiment 2 lists decisions and withdrawals based on human responses.

```text
# From the Experiment 1 (AI-only) record
- (assumption) Assume the product is B2B business software (package/SaaS). No basis: only the terms “users of our products” and “customers.” The structure would change for B2C or physical products.
- (assumption) Assume current support channels center on phone and email, and that FAQs/manuals are distributed across locations or are PDFs.
- (insight) Research: Complete resolution through self-service is 14%; the biggest reason for failure is “cannot find relevant information,” 43% (Gartner 2024). The core of the site is not the quantity of articles, but “being able to find them.”

# From the Experiment 2 (human-answer) record
- (decision) Current channels: A simple support site already exists. Inquiries arrive through email, phone, and account representatives.
- (decision) Why the current site is not useful: Users believe it lacks sufficient articles (c) and is difficult to search (b) (this is an interpretation, not a verified result).
- (decision) Rewording (AI proposal, not yet confirmed by the user): Rather than “create a site,” create a state where “users can resolve operational questions quickly without asking a person, while remaining questions are handled by a contact point that is not the developers.”
- (override) Withdraw the assumption that “AI automated responses will not be included in the first version,” and include the use of AI in the scope of the first version (user response: “I also want to make use of AI”). Decide the usage in the PRD (candidates: answers based on articles / drafting articles / assisting the first-line support desk).
```

&emsp;You can see that the first and second lines from Experiment 1 are overturned by the first line from Experiment 2. Comparing the records in this way lets you create the table from Part 1 directly.

&emsp;Lines marked as `override` in Experiment 2 are records of human answers overturning AI assumptions. This time, the assumption that “AI-based automated responses will not be included in the first version” was withdrawn by my single remark: “I also want to make use of AI.”

**③ Compare the assumptions from Experiment 1 with the answers from Experiment 2**

&emsp;Place the `assumptions` and `open_questions` from Experiment 1 on the left, and what the human answered in Experiment 2 on the right. The table in Part 1 was created from this comparison. Divide them into three groups—assumptions that were correct, assumptions that were wrong, and items correctly left as questions—and the tool’s behavior becomes visible.

**④ Separate AI proposals from human decisions**

&emsp;Read the product brief from Experiment 2 and distinguish between “what the human answered” and “what AI proposed but the human has not yet approved.” This time, the analyst itself stated that the rewording at the beginning was “my proposal and has not yet been approved.” Do not pass unapproved proposals on to the next process as decisions.

## 10. Problems I Encountered

| Symptom | Cause and Remedy |
|---|---|
| “Invalid OAuth request” in the browser | The copied login URL was cut off partway through. Widen the terminal to fit it on one line before copying. |
| “That code wasn't accepted” | The code was pasted into a different Claude Code session from the one that generated the URL. Paste it into the screen that generated it. |
| Claude Code exits on first launch | You selected the default “No, exit” at the folder trust prompt. Launch it again and select “Yes.” |
| The agent calls you “Node” | The default name is the OS username. Set `user_name` in `_bmad/custom/config.toml`. |
| `_bmad/config.toml` says `English` | The actual value used is determined elsewhere. Verify it with the output of `resolve_config.py`. |
| The date in the deliverable folder is the previous day | The container time is Coordinated Universal Time. It causes no practical problem, but take note when recording it. |
| Experiment 2 tries to resume Experiment 1 | It uses the same date-based folder name. Rename the Experiment 1 folder and add a note when invoking the skill. |

## Conclusion

&emsp;The procedure itself was easier than I expected: installation takes a few minutes, and the AI-only experiment takes around 20 minutes. What took the most time was my own time answering AI’s questions in Experiment 2. I believe that is precisely the correct way to use this tool.
&emsp;My recommendation is to enter the human-answer experiment with the lists of `open_questions` and `assumptions` generated by the AI-only experiment in hand. It makes what you do not know astonishingly clear. Please try it with a prompt of your own.
&emsp;This article covered only up through the analysis and planning stages. The main series has accumulated many special editions, laboratory sessions, and detours, so I may write about the subsequent BMAD process another time when the opportunity arises.

---

*Part 1: “Can BMAD Resolve Concerns About ‘AI-Driven Development’?” / Next time: “The PO Is Too Busy to Come to the Team” (12/1) / Please see Part 1 for the main series index.*
