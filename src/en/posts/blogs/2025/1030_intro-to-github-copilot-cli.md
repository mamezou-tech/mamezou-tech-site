---
title: CLI Has Arrived for GitHub Copilot Too!
author: masahiro-kondo
date: 2025-10-30T00:00:00.000Z
tags:
  - GitHub Copilot
image: true
translate: true

---

## Introduction
A little time has passed, but at the end of last month GitHub Copilot CLI entered public preview.

@[og](https://github.blog/changelog/2025-09-25-github-copilot-cli-is-now-in-public-preview/)

Having started as a VS Code extension, GitHub Copilot now also works as a CLI, just like Claude Code and Gemini. By offering it as a CLI,
- It is no longer tied to an IDE
- It enables integration with other CLI tools via pipes

These strengths are added, and many people will also be attracted by the fact that you can complete your work using only the terminal.

Furthermore, since you use it while logged in to GitHub, you can operate repositories you are involved with, and you can immediately use GitHub’s MCP servers.

You can refer to the Japanese documentation here:

[Using GitHub Copilot CLI - GitHub Docs](https://docs.github.com/ja/copilot/how-tos/use-copilot-agents/use-copilot-cli)

:::alert
The gh-copilot extension, which was previously provided as an extension to GitHub CLI, has been deprecated with the public preview of Copilot CLI and will be replaced by Copilot CLI.

@[og](https://github.blog/changelog/2025-09-24-deprecate-github-copilot-extensions-github-apps/)

I introduced gh-copilot last February.

@[og](https://developer.mamezou-tech.com/blogs/2024/02/28/github-copilot-in-cli/)
:::

:::info
GitHub Copilot CLI is available on GitHub Copilot Pro, GitHub Copilot Pro+, GitHub Copilot Business, and GitHub Copilot Enterprise plans.
:::

## Installation and Startup
Install it according to the documentation.

@[og](https://docs.github.com/ja/copilot/how-tos/set-up/install-copilot-cli)

You can install it globally with npm.

```shell
npm install -g @github/copilot
```

Start the GitHub CLI.

```shell
copilot
```

The GitHub CLI’s TUI will start, showing your login status to GitHub and connection status to the GitHub MCP server.

![run copilot](https://i.gyazo.com/619b7fec51279ed982a4b7cf9f5e3831.png)

It asks whether you trust the folder you’re working in. Since I always work in `$HOME/dev`, I chose option 2, `Yes, and remember this folder for future sessions`.

:::info
In my environment, I’m already logged in to GitHub via GitHub CLI (the GitHub operations CLI, not the Copilot CLI), so I believe it’s using that authentication token to log in.
:::

## Trying It Out
The following page is helpful for understanding how to use it.

@[og](https://docs.github.com/ja/copilot/concepts/agents/about-copilot-cli)

### Interactive Mode
This mode allows you to enter prompts on the TUI and interactively proceed with your work.

I navigated to the directory of the Electron app repository I’m developing (cloned from GitHub) ([sbe](https://github.com/kondoumh/sbe)) and then started Copilot CLI.

```shell
cd sbe
copilot 
```

You can mention files using `@`. If you type part of a path after `@`, it will list suggestions.

![mention file](https://i.gyazo.com/21ad22a50b6bc96c81c4e13382fa8f6e.png)

I asked it to explain the source code.

![explain](https://i.gyazo.com/bc474ee9da491423f47de4c8bd099328.png)

If you ask in Japanese, it will respond in Japanese.

![explain in japanese](https://i.gyazo.com/1e9e556c84d1a93264a46b1f9006557a.png)

When you exit interactive mode, your usage stats and lines of code changed are displayed.

```
 Total usage est:       2 Premium requests
 Total duration (API):  15.1s
 Total duration (wall): 12m 33.3s
 Total code changes:    0 lines added, 0 lines removed
 Usage by model:
     claude-sonnet-4.5    24.9k input, 414 output, 0 cache read, 0 cache write (Est. 2 Premium requests)

 Shutting down...
```

### Program Mode
This mode provides prompts directly to Copilot CLI via arguments or pipes for execution.

```
copilot -p "explain src/favs.js"
```

The TUI does not start, and the prompt result is output directly.

```
I'll read the src/favs.js file to explain it to you.

✓ Read src/favs.js (57 lines)

This is a Vue.js 3 app that manages favorites in an Electron application. It creates a UI for displaying and deleting favorite items with these key features:

**Core functionality**: Loads favorites from the Electron backend via `window.favsApi`, displays them in a list, and provides delete functionality with a confirmation dialog. It listens for window focus events to refresh the favorites list.

**Theme support**: Automatically detects and applies light/dark mode based on system preferences using Vuetify's theming system.


Total usage est:       1 Premium request
Total duration (API):  11.5s
Total duration (wall): 15.2s
Total code changes:    0 lines added, 0 lines removed
Usage by model:
    claude-sonnet-4.5    23.6k input, 239 output, 0 cache read, 0 cache write (Est. 1 Premium request)
```

The result is printed to stdout, followed by usage stats.

### Local Tasks
You can instruct it to make changes to local code.

First, I requested a review of a single source code file and asked for improvement points.

```
Review @src/about.js
```

![Review code](https://i.gyazo.com/638ec52f5d4cfb23e2ecbd75936fe142.png)

As positive points, it praised the clean component structure with appropriate lifecycle hooks and the proper separation of concerns via IPC.

It pointed out some issues, but one that concerned me was that there was no cleanup of focus-related listeners in Vue’s `beforeUnmount`, which could lead to memory leaks.

So I asked it to fix this issue.

```
Fix No cleanup problem
```

![Fix code](https://i.gyazo.com/5ac5afa32e800e409e8bc69ec68a1390.png)

It added the `beforeUnmount` hook method and code to remove the listener. Since there is no `off` API to remove the listener, this change isn’t acceptable. However, since I’m just trying out the Copilot CLI features, I asked it to apply the same fix to the other files as well. It asks for confirmation for each file.

```
Apply this fix to other files too
```

![Apply to other files](https://i.gyazo.com/ee1029b82a463ec3f84b6d041f833c7e.png)

The fix was applied to all files.

:::info
Although not used in this example, when you use external commands like sed or chmod in local tasks, it will ask for permission. You can pre-authorize them at runtime with `--allow-tool`.
:::

### GitHub Tasks (Listing Issues)
You can also perform GitHub-related tasks. To start, I displayed the list of issues in the repository.

```shell
list my open issues
```

![list issues](https://i.gyazo.com/6dd6ffdf93f9deb5bb7356014be84029.png)

### GitHub Tasks (Creating a PR)
I have the listener removal changes I just tested on the Electron app locally, so I had it create a PR from that.

```shell
create a pull request from this changes
```

![Creating PR](https://i.gyazo.com/b0663df6854b6c70aea8e303484b1fc6.png)

It created a branch and pushed it for me. Then it asked to confirm creating a PR from this.

![Confirming create PR](https://i.gyazo.com/758ac0295fb4df46824a5453bf5d2f45.png)

When I selected Yes, the PR was created.

![Created PR](https://i.gyazo.com/5d318abfc590e54d2e124dff3d0ede86.png)

The PR author is set to myself.

### GitHub Tasks (Running Actions Workflows)
GitHub tasks also allow you to operate GitHub Actions workflows. First, I had it list the workflows in this repository.

![list workflows](https://i.gyazo.com/f9a84487aa6642d692e566ed9edd5e96.png)

Among the listed workflows, `OS Matrix` is a workflow that runs tests for the Electron app across platforms. When you run it manually with the `beta` parameter set to `true`, it installs the latest beta version of Electron and tests it. You can refer to the workflow file here: [here](https://github.com/kondoumh/sbe/blob/main/.github/workflows/ci.yml).

I tried instructing it to run this workflow.

```
Run OS Matrix with input value "beta" to true
```

It suggested a plan to run it using GitHub CLI (not GitHub Copilot CLI), and presented options for execution.

![Trigger Workflow](https://i.gyazo.com/90ce6d7d5e1e03942647a27d02bfb47d.png)

Choosing 1 grants permission for a one-time run, while choosing 2 grants permission for the rest of the session. I chose 1, and it seems to have run successfully.

![Workflow triggerd](https://i.gyazo.com/ea3da2b3a8d5c335f6aa060adf535f65.png)

It actually installed the beta version of Electron and ran the tests properly.

![Running workflow](https://i.gyazo.com/4d1f9abea98b1b7ed90f128f3c705b1a.png)

It’s helpful that you don’t need to use the web UI or know how to run workflows via GitHub CLI; you can just give natural language instructions.

## Conclusion
GitHub Copilot CLI provides a more powerful Copilot collaborative environment than expected.

Improvements are underway toward GA, such as supporting multi-line prompt input.

@[og](https://github.blog/changelog/2025-10-17-copilot-cli-multiline-input-new-mcp-enhancements-and-haiku-4-5/)

If you master features such as integration with the MCP server, you should be able to handle many complex tasks using only the terminal.
