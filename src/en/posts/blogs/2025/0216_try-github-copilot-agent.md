---
title: Trying GitHub Copilot's Agent Mode (Public Preview)
author: masahiro-kondo
date: 2025-02-16T00:00:00.000Z
tags:
  - AIエージェント
  - GitHub Copilot
  - vscode
image: true
translate: true

---

## Introduction
It seems that GitHub Copilot's agent mode has awakened.

@[og](https://github.blog/news-insights/product-news/github-copilot-the-agent-awakens/)

An introductory video has also been posted on YouTube.

<iframe width="560" height="315" src="https://www.youtube.com/embed/of--3Fq1M3w?si=p7HCmjJYvpVsOliV" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
<br>

I’d like to try out GitHub Copilot’s agent to see what it’s like.

:::info
It was predicted that the agent would arrive in 2025, as mentioned in last year’s Adkare article.

@[og](/blogs/2024/12/04/openai-swarm-multi-agent-intro/)
:::

## Getting Started
As of the time of writing this article, you'll need the Insiders version of VS Code rather than the release version, so download and install the VS Code Insiders edition from the link below.[^1]

@[og](https://code.visualstudio.com/insiders/)

[^1]: Installing Insiders will not affect the release version of VS Code, so rest assured.

Once you launch VS Code Insiders, install the pre-release version of the GitHub Copilot Chat extension. If you search for "Copilot Chat" in the extensions tab, it will appear at the top.

![Install GitHub Copilot Chat Pre-Release](https://i.gyazo.com/ab949401efa609baafceac984976b6a2.png)

To use Copilot, sign in with a GitHub account that holds an active subscription.

![Sign in with GitHub](https://i.gyazo.com/848c132eb54c47d645693579e84479f9.png)

Check in the Copilot settings that the Agent is enabled.

![Settings](https://i.gyazo.com/76aacce1da4d0468ce44bb741d8228cb.png)

Open the Copilot Edits mode.

![Open Copilot Edits](https://i.gyazo.com/b4e0f8c139e01aaaf3e0ce7f4b4d0bae.png)

For an agent mode that works autonomously, rather than a conventional Chat UI, Copilot Edits—which allows you to edit files directly—seems like the right fit.

:::info
For more on Copilot Edits, please refer to the following article.

@[og](/blogs/2025/02/15/refactor-code-with-github-copilot-edits/)
:::

Switch from Edit to Agent using the options located beneath the prompt input box.

![Switch to Agent](https://i.gyazo.com/59b0cdc7cf175b70a32173aed271fd6c.png)

By doing so, Copilot Edits switches to Agent Mode (Experimental).

![Agent Mode Panel](https://i.gyazo.com/a5805735f8b80a9535280d50cb8c65a7.png)

Since we're at it, I opted for the Claude 3.5 Sonnet (Preview) model instead of GPT 4o.

![Cloude](https://i.gyazo.com/caf9c20f6014767a5732720a02d55770.png)

## Creating a Simple App Using Agent Mode
Since it's an agent, I decided to have it tackle something a bit more advanced by giving the following instruction:

“Create a site for managing ToDo items with Nuxt 3. Configure it so that data is saved in SQLite.”

Initially, a dialog prompting to enable Sonnet appeared, so I clicked Enable.

![Enable sonnet](https://i.gyazo.com/1ae71ec613e0496b308956c731e93f2d.png)

Next, it suggested running a command to generate a Nuxt app.

![Create Nuxt app](https://i.gyazo.com/d5e68389c41f2f8712a9fce5b162f7cd.png)

Clicking Continue executed the command, and it waited while the command ran.

![waiting for executing CLI](https://i.gyazo.com/927d1c92faeeeb7c5b6e188d98eaba5c.png)

In the terminal, generation of the Nuxt project began, installing packages and creating the project (during nuxi execution, a human typically selects a package manager, etc.).

![npx nuxi](https://i.gyazo.com/336031d7f102eec7e0a8c858179c3d03.png)

After creating the project, it proceeded to install SQLite-related components. I simply clicked Continue as instructed.

![Install SQLite](https://i.gyazo.com/f535f239760b72fe5f7a086821d2558c.png)

Packages were installed in the terminal.

![Install npm packages](https://i.gyazo.com/64f52741c0eed17a47df4cb175f05a7b.png)

Once the project and required packages were installed, the app was generated at a rapid pace. Finally, it prompted to start the development server.

![Building App and run app](https://i.gyazo.com/d62258c02679942f0cdb2f18a528bc99.png)

At this point, the generated files have been added to the project.

![Explorer](https://i.gyazo.com/3398ad498474aace2961b2b36b944906.png)

For now, I launched the development server.

![npm run dev](https://i.gyazo.com/b1145b992887b7a125be99d6719ec0dc.png)

The app became accessible.

![ready to use](https://i.gyazo.com/fbb4a889597bd696e8f60ef61de7e369.png)

When I connected to localhost:3000, the app was displayed.

![Open App](https://i.gyazo.com/d7a5e0ce31dfdabc60b0786a697eccbe.png)

I tried entering a ToDo item and clicked the Add button, but there was no response.

![Cannot add todo](https://i.gyazo.com/54326d2dfc6d9b59b1d94d9163b523d0.png)

The terminal showed an error stating that the todos table does not exist.

![Error message](https://i.gyazo.com/5c82ac17a3f55dc2385d0a1ae48d97ce.png)

## Fixing Runtime Errors
Although the app was generated rapidly, it wasn't working correctly. So I copied the error message from the terminal and pasted it into the prompt. It appears that it planned to create the table via a migration using Dizzle ORM.

![recover from error](https://i.gyazo.com/0b44b3217e4e5a99a31d4d030a41969f.png)

Clicking Continue resulted in an error, possibly because the target terminal’s current path was incorrect.

![Command execution error](https://i.gyazo.com/0a03d2f9b99e78cd1d248e76a70e5cc4.png)

After detecting the execution error, it proposed an alternative, so I clicked Continue.

![retry command](https://i.gyazo.com/4baf8004ab247f78bb4bb07a1a18ad72.png)

A deprecation warning was issued, but it appears to have succeeded.

![dizzle-kit](https://i.gyazo.com/5ac64f3d63ea2a25fbb6738f36a63bdc.png)

Upon detecting the command's success, it prompted a restart of the development server, so I clicked Continue.

![Rerun app](https://i.gyazo.com/1fbcd794476e5166411ab7d375a975b6.png)

This time, it worked flawlessly.

![ToDo App worked](https://i.gyazo.com/1ad6e284883a01eb2d536e60b10fa3af.png)

## Adding a New Feature
Now that I’ve seen enough of the power of agent mode, I decided to have it add an extra feature.

I issued the prompt: “I want to add a due date to the ToDo items. The default due date should be today’s date. I’d like to input it with a calendar control.”

![Add feature](https://i.gyazo.com/5c1d686c5d98c32d149c88985b27fc70.png)

Once again, tasks were planned and executed rapidly, and the code modifications were completed. All that remained was to initialize the database and restart.

![Feature implemented](https://i.gyazo.com/6045f5d20cef11215e3c13984729e513.png)

Due to an operational error on my part, the database wasn't created. In a pinch, I asked for the command via the prompt.

![Ask DB initialize command](https://i.gyazo.com/0a72bfdb1552ca93c5ab846b886d3a56.png)

While the database creation succeeded, an error occurred at startup, so I pasted the error message and asked about it.

![Fix error](https://i.gyazo.com/792a2c65acb2f964cd8c2213aeb25f9c.png)

It quickly identified the issue in the generated code and corrected it. As a result, the desired functionality has been added.

![Updated app](https://i.gyazo.com/1aa52e53d3f36a24a830cd900d688e79.png)

## Conclusion
That concludes my trial of Copilot's agent functionality. The time taken to generate the app and add new features was only a matter of tens of seconds each. As demonstrated, it operates very autonomously and truly lives up to the name "agent." Even when errors occur, providing feedback prompts it to autonomously correct the code. It's incredibly capable.
