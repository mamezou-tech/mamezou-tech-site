---
title: >-
  A Guide to Copilot Pull Request Reviews — Custom Instructions and Japanese
  Localization in Practice
author: kenta-ishihara
date: 2025-09-10T00:00:00.000Z
tags:
  - GitHub Copilot
  - 生成AI
  - summer2025
image: true
translate: true

---

This article is the 10th day of the Summer 2025 Relay Series.

## Introduction
I'm using GitHub + GitHub Copilot at work, and recently I've been asking Copilot to review pull requests as a form of self-check. It gives quite accurate comments, but since it defaults to replying in English, I started researching how to make it reply in Japanese, which is what prompted this article.

## Getting GitHub Copilot to Review
If you're using GitHub Copilot, you should definitely try its review feature. Here's how to do it. (See the official documentation for details)

1. Create a pull request on GitHub.com or navigate to an existing one.  
2. Open the Reviewers menu and select Copilot.  
3. Wait for Copilot to review the pull request (usually within 30 seconds).  
4. Check Copilot's comments. They are treated like regular review comments (add reactions, reply, resolve, hide, etc.).

When I actually tried it, I was impressed by how accurately it pointed out bugs and refactoring opportunities. From a developer's perspective, it's incredibly useful to get such feedback.

However, what really bothered me is that it basically replies in English. So I decided to try custom instructions.

## Adding Custom Instructions
GitHub has a feature called "Custom Instructions", which lets you give instructions to Copilot in natural language using Markdown. (For more details, see the official documentation.) This time, to apply it to the entire repository, I created the following file:
```
.github/copilot-instructions.md
```

An example of the contents is as follows.
```markdown
## Basic Policy
- Write all generated comments, explanations, responses, and reviews in Japanese.
- Provide suggestions that are as readable, concise, and specific as possible.
```

Also, this time I added the following coding guidelines. Below is an example rule regarding `let` / `const` in ES2015 (ES6).
```markdown
# JavaScript
---
## Are you using const or let instead of var for variable declarations?
Declare variables that are not reassigned with const, and those that are reassigned with let.
With var, you can redeclare the same variable name, but let does not allow this.
(Prevents duplicate variable definitions and unintended reassignment)
```

After pushing this file and requesting a review from Copilot, I received comments in line with the coding guidelines as expected.  
[![Image from Gyazo](https://i.gyazo.com/79fcea4bd54538730017a599bdbf1f54.png)](https://gyazo.com/79fcea4bd54538730017a599bdbf1f54)

If your project already manages coding guidelines in Markdown, I found it effective to simply copy and paste them as they are. (Some teams use Excel to compile their guidelines, but considering compatibility with generative AI, I would like to promote Markdown format moving forward.)

## Points to Note When Writing Custom Instructions
With instructions like the following, you may not get the intended results.

1. You cannot reference external resources (URLs or file paths).  
```markdown
Bad example:
- To understand the code in this repository, please read the following URL:
  https://example.com/internal-specs

- Make suggestions while referring to `/docs/design/architecture.md`
```

2. You cannot instruct it to respond in a specific style.  
```markdown
Bad example:
- Please respond in a bright, friendly tone.
```
*However, there have been cases where simple instructions, such as 'Please use "~nano da"' for sentence endings, were reflected.*

3. You cannot enforce the length or format of the response.  
```markdown
Bad example:
- Always reply within 1000 characters.
- Summarize at the end in a 5-7-5 syllable structure.
```

As language models evolve, it may become possible to do things that are not possible now (something to look forward to).

## All Solved... Or So I Thought
When I applied the custom instructions and created a new pull request, the review came back in English again. After submitting a few pull requests, sometimes it replied in English, sometimes in Japanese, so it felt quite inconsistent. (Judging by the comments, it does seem to reference the custom instructions themselves.) Moving forward, when working with generative AI, users may need to abandon the expectation that "it will always do exactly what you say" and be prepared to tolerate a certain degree of ambiguity. (I give up.)

## Conclusion
- If you're using GitHub + GitHub Copilot, definitely try the review feature.  
- By adding custom instructions to `.github/copilot-instructions.md`, you can specify review guidelines (writing your rules in Markdown makes them easier to leverage).  
- However, since it doesn't always follow your instructions exactly, it's important to have a mindset that accepts the inherent ambiguity of generative AI.
