---
title: GitHub Copilot is now implemented within the github.com site
author: masahiro-kondo
date: 2024-09-28T00:00:00.000Z
tags:
  - GitHub
  - Copilot
image: true
translate: true

---

## Introduction

GitHub Copilot has been integrated into the functionality of the github.com site.

[Copilot in GitHub.com now available on Copilot Individual and Copilot Business (Public Preview) · GitHub Changelog](https://github.blog/changelog/2024-09-26-copilot-in-github-com-now-available-on-copilot-individual-and-copilot-business-public-preview/)

It is currently available as a public preview, and can be used by individual users of Copilot or organization users on the business plan. Details of the features are introduced in the following blog.

[GitHub Copilot now available in github.com for Copilot Individual and Copilot Business plans](https://github.blog/news-insights/product-news/github-copilot-now-available-in-github-com-for-copilot-individual-and-copilot-business-plans/)

Speaking of GitHub Copilot, it was something that assisted development by being integrated into VS Code and GitHub CLI[^1], but now it will also support operations in the browser. Additionally, not only on the website, but chat functionality with Copilot has also been provided on GitHub Mobile.

[^1]: For the Copilot feature in GitHub CLI, see "[Getting help with command input in GitHub Copilot in the CLI](/blogs/2024/02/28/github-copilot-in-cli/)".

When logged in with an account that has Copilot enabled, the familiar icon is displayed in the bottom right of the page.

![Copilot enabled](https://i.gyazo.com/f24dcbb0a6461e9bd7ad525e31bf52e3.png)

Currently, the following features seem to be provided:

- Conversations about repositories and files
- Draft generation of PR summaries
- Summary generation of Discussions
- Error analysis of GitHub Actions

## Trying out various queries with Copilot

You can converse with Copilot in a manner similar to ChatGPT. It also supports Japanese.

I tried asking about how to use GitHub's GraphQL API.

![General Chat](https://i.gyazo.com/43aed6bfb3eb72dd087370a3fa3af1d1.png)

You can also inquire about the overview of a repository in natural language. Narrow down the target repository in advance.

![search repo](https://i.gyazo.com/7d5456ff1661592248bdddca252368d4.png)

:::info
If you already know the repository, you can start a conversation about it by clicking the icon in the top right of the repository page.

![header icon](https://i.gyazo.com/eb9e0892815b814bcf0327c6fa1c90ab.png)
:::

I selected the Apache Kafka repository and had it explain the overview.

![Explain Kafka](https://i.gyazo.com/67c2948272364f4f02881269f6aedea4.png)

It also introduces issues.

![Show issues](https://i.gyazo.com/138400b199cd8fee1bd68fc3b5e75cc5.png)

With the `/` command, you can delete or create new conversation threads.

![slash commands](https://i.gyazo.com/a0b544aea6a31292e241514ea8817926.png)

Conversations are saved as threads, so you can load past threads and continue the conversation.

![Active Conversations](https://i.gyazo.com/1702def63b69af4a79c330dcf3d6e6c5.png)

In services like ChatGPT, it's quite difficult to extract the latest information about a specific repository, but with Copilot built into GitHub, it provides answers based on actual repository information, which seems useful for researching large-scale OSS.

## Assisting in understanding code

You can ask not only about the overview of a repository but also about the details of the code. The Copilot icon is also attached to the header of the file page, and you can click it to ask questions about each file in the repository.

![File header icons](https://i.gyazo.com/5f3f0f7a94961296f8c331f132262af8.png)

It provided detailed explanations of the file overview and the processing overview of each function.

![Explain file](https://i.gyazo.com/ba03edf91b8292b955b306c471edf125.png)

:::info
Conversations about files involve narrowing down the repository and attaching the relevant file to ask Copilot.

![start thread about file](https://i.gyazo.com/bad7cb56dec07d2683d4d9241d04565b.png)
:::

## Drafting PRs

Finally, let's try drafting a PR. The author often doesn't write summaries when creating PRs in their personal repository.

:::info
In personal repositories, I often self-merge without reviews, so I received GitHub's YOLO badge.

![YOLO](https://i.gyazo.com/667ce08351d9e719ffd10b22fc950145.png)
:::

I had it add explanations to past merged PRs.

When I opened a PR that was merged without any explanation, Copilot was there too.

![Meraged PR without descripiton](https://i.gyazo.com/81ef73cd9e7ee41c76bf1b91fb57847f.png)

A menu opens that generates a summary of the PR.

![Gen Summary](https://i.gyazo.com/92fe83faddbe9b680134c8e7fd4ade5b.png)

A wonderfully well-crafted explanation was generated.

![Generated summary](https://i.gyazo.com/58f52c5dccafe62e721f772605279e1e.png)

:::alert
Of course, this usage is not correct, and it should be done when drafting a PR for review. The summary generated when creating the PR for this article was as follows.

![This article PR summary](https://i.gyazo.com/ba3b52451aaca5c0768fcc9c66889826.png)
:::

## Conclusion

This was an introduction to Copilot built into the GitHub site. It's very convenient to receive Copilot's assistance without cloning the repository and opening it in VS Code.

On sites like GitHub where various tasks are performed, AI assistance like this may become widespread. In the near future, web UIs without AI assistance might be considered classic UIs.
