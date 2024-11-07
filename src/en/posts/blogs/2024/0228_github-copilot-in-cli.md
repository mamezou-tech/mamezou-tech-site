---
title: Getting Help with Command Inputs from GitHub Copilot in the CLI
author: masahiro-kondo
date: 2024-02-28T00:00:00.000Z
tags: [Copilot, GitHub]
image: true
translate: true
---



## Introduction

GitHub Copilot functions as an extension for code editors like VS Code. By using GitHub Copilot in the CLI, you can also receive Copilot's assistance when entering commands in the terminal.

It has been introduced in GitHub's Blog with a video.

GitHub Copilot in the CLI is provided as an extension (gh-copilot) to the GitHub CLI (gh). For brevity, it will be referred to as gh-copilot henceforth.

With gh-copilot, you can ask questions in a chat-like interface on the terminal and receive answers. The questions are sent to GitHub's API, analyzed by Copilot's language model, and answered.

The documentation for gh-copilot can be found here:

gh-copilot is in public beta at the time of writing this article. To use it, you need a GitHub Copilot Individual subscription. I am using an Individual subscription. If the organization you belong to has a GitHub Copilot Business subscription and has activated gh-copilot, it can also be used.

(Added on 2024.03.22)
gh-copilot has become generally available (GA), and can now be used with all Individual, Business, and Enterprise Copilot plans.

## Installation
You need to install GitHub CLI beforehand. For instructions on installing GitHub CLI, refer to the Installation section in the GitHub repository README. On macOS, you can install it with `brew install gh`.

You must be logged into GitHub with GitHub CLI. To check if you are logged in, execute `gh auth status`. If logged in, it shows the status of your account, PAT, and the scopes of the PAT.

If you are not logged in, log in with `gh auth login`.
Then, install gh-copilot.

```
gh extension install github/gh-copilot
```

If you see the following output, the installation was successful.

```
✓ Installed extension github/gh-copilot
```

The first time you run `gh copilot`, you will be asked whether to allow GitHub to collect optional usage data to help us improve. Select Yes.

## Main Commands of gh-copilot

When you run gh-copilot, you will see a message and prompt like below.

gh-copilot can assist with the following three types of commands:

- Generic shell commands (shell)
- GitHub CLI commands (gh)
- Git commands (git)

The main commands of gh-copilot are the following two:

- suggest: Get suggestions for commands
- explain: Get explanations for commands

For `suggest`, you pass what you want to do in natural language.

For `explain`, you pass the command you want to execute, including arguments and options.

Below is a screenshot of using suggest (click to enlarge).

- You are asking "get kubernetes cluster information."
- You select `generic shell command` as the command type.
- As a result, the command `kubectl get cluster-info` was suggested.
- By using `Revise`, you can modify the question or add additional information.
  - After adding "with yaml output" as a condition, you got `kubectl get cluster-info -o yaml`.
- You selected `Copy command to clipboard` to copy the obtained command to the clipboard.

If selecting the command type every time is cumbersome, you can directly get the suggestion result by specifying the command type with `-t`.

For detailed usage, display the usage with `gh copilot suggest --help` or ask directly with `gh copilot suggest`.

## Using explain on a Suggestion

`explain` can also be used on suggestion results. After getting a suggestion result, select `Explain command`. In the following example, explain is applied to the suggestion result of the question "Terminate all processes whose names match a specific regular expression" to get explanations about the command and options.

## Asking in Japanese
Let's try asking in Japanese.

Normal responses are provided. Let's revise it since rmi is a bit old.

It looks good.

Let's ask something a bit more complicated.

The command generated from a vague instruction in Japanese seems usable.

:::info
GitHub Copilot's documentation states the following limitation:

> GitHub Copilot in the CLI is trained primarily on natural language content written in English. As a result, when specifying prompts in languages other than English for GitHub Copilot in the CLI, performance may vary.

Currently, it seems that asking questions in English results in higher accuracy.
:::

## Conclusion
This was an introduction to GitHub Copilot in the CLI. Currently, it has been trained on data up to 2021, so it does not support the latest versions of commands or commands released after 2022. Users are also responsible for checking for biases and inaccuracies inherent in LLM.

In the past, we used the man command or googled for CLI information, but it took quite some time for commands we don't frequently use.

:::info
For commands you have used before, reusing command history is the best way to utilize them. For efficient use of command history, please refer to the following article.

[Reintroduction to Bash for More Convenience](/blogs/2023/11/30/bash-reintroduction/)
:::

Nowadays, you can just ask ChatGPT and copy-paste, but having a dedicated UX in the terminal you're actually using is indeed convenient.

While it might feel like relying on Copilot could lead to a decline in technical skills, considering it as a new interface for using computers might be the right approach.

Having already used "natural language as a programming language," utilizing "natural language as commands" to quickly complete tasks seems like a good idea.
