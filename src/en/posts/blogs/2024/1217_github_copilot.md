---
title: How to Use GitHub Copilot and What You Need to Know Before Introducing It
author: kenta-ishihara
date: 2024-12-17T00:00:00.000Z
tags:
  - GitHub Copilot
  - advent2024
image: true
translate: true

---

This is the article for Day 17 of the [Mamezou Developer Site Advent Calendar 2024](/events/advent-calendar/2024/).

## Introduction
I'm Ishihara, who eats [Burger King's Big Bet](https://app.burgerking.co.jp/bkad/bigbet/index.html) when I want to look ahead.
Recently, I became able to use [GitHub Copilot](https://docs.github.com/ja/copilot) (hereafter referred to as Copilot) at work, so I have summarized how to use it and what you need to know before introducing it.
I hope this will be of some help to those who are considering introducing Copilot or are currently using it.
(This article is based on a Windows + IntelliJ environment. Please be forewarned.)

## Installation Method
1. Register for one of the following Copilot subscriptions with your GitHub account. (See: [Subscription plans for GitHub Copilot](https://docs.github.com/ja/copilot/about-github-copilot/subscription-plans-for-github-copilot))
   - GitHub Copilot Individual (for individuals)
   - GitHub Copilot Business (for small to medium teams or companies)
   - GitHub Copilot Enterprise (for large teams or companies)
2. Install the Copilot plugin.
   1. In IntelliJ, open the settings dialog by pressing "Ctrl + Alt + S".
   2. From "Plugins", search for "GitHub Copilot" and install it.
3. Link IntelliJ with your GitHub account. (See: [Installing GitHub Copilot in JetBrains IDEs](https://docs.github.com/ja/copilot/managing-copilot/configure-personal-settings/installing-the-github-copilot-extension-in-your-environment?tool=jetbrains#jetbrains-ide-%E3%81%A7%E3%81%AE-github-copilot-%E3%81%AE%E3%82%A4%E3%83%B3%E3%82%B9%E3%83%88%E3%83%BC%E3%83%AB))

## Running Costs
*As of December 2024 prices. For current prices, please refer to the [official documentation](https://docs.github.com/ja/billing/managing-billing-for-your-products/managing-billing-for-github-copilot/about-billing-for-github-copilot).*
- Using GitHub Copilot Individual (for individuals) costs $10/month or $100/year
- Using GitHub Copilot Business (for small to medium teams or companies) costs $19/month
- Using GitHub Copilot Enterprise (for large teams or companies) costs $39/month

## Basic Usage
The main uses are the following two:

### Input Completion Feature
1. Like the IDE's input completion function, it will suggest subsequent implementations while coding. Press "Tab" to accept the suggestion, or press "Esc" to reject it.
2. When there are multiple suggestions, you can select them by pressing "Alt + ]" (next suggestion) or "Alt + [" (previous suggestion).
3. The automatic input completion suggestions are proposed in step units (including multiple steps). If you want to accept suggestions partially, refer to the following:
   - Accept on a word basis with "Ctrl + →"
   - Accept on a step basis with "Ctrl + Alt + →"
4. If you make the implementation details specific in comments, you will receive more accurate suggestions.

### AI Chat Function
1. Click the "Copilot Chat" icon in IntelliJ and enter your prompt.
2. You can select reference files when sending a prompt.
   - In addition to explicitly specifying, Copilot also references the files currently open in IntelliJ. If your prompt is about the currently open file, you don't need to specify it.
   - If you want to indicate a specific part of a target file, Copilot will refer to it if you ask while selecting the relevant portion.

## Differences from ChatGPT
Basically, I think that most of what you need from Copilot can be resolved by using ChatGPT.
However, in terms of inputting prompts that include prerequisites or the efficiency of providing real-time suggestions, Copilot gives the impression of being far easier to use.

## Use Cases
- Coding support
- Support for pair programming or mob programming navigators
- Code explanations
  - For code with low readability, have it explain the processing content using "/explain".
- As a companion for refactoring
  - Use "/fix" to have it suggest points to fix. It may also be good for checking if there are improvements needed after implementation.
- Creating test code
  - If you input "/test" into Copilot Chat while the target file is open, it will suggest test code.
- Implementing in languages or libraries where your skills are shallow
  - It's encouraging to have an example code provided as a startup for learning/implementing programming languages or libraries with which you are not very familiar.
    (However, whether all the suggested code works correctly is another issue.)
- Error causes and countermeasures
  - If you can't immediately think of the cause of an error, try asking it for now. (Just as a reference.)

## User Feedback
- It was easier to use than ChatGPT, as it eliminated the need to think of and input prompts.
- Occasionally, it gives absurd suggestions. (Perhaps because unnecessary comments remained in the code in question, or the comments were incorrect?)
- When the content was simple but there was a lot to implement, using Copilot made the work highly efficient.
- It was helpful in extracting items from existing classes when creating specifications.
- It's valuable as a consultation partner to ask when you're struggling with implementation.

## Things That Might Happen in Future Development Sites Advanced by AI
- Newcomer: "I don't know the cause of the bug because the AI wrote it." Then the boss says: "It's the code you wrote!"
    - Take responsibility for the code you write. The AI won't take responsibility for you.
- Boss says: "It's easier to ask the AI"—AI harassment
    - Even if you think it, try not to say it out loud.
    - Overreliance isn't good either, but if the environment allows, newcomers might be able to work more efficiently by effectively using Copilot.

## Conclusion
As it becomes rather commonplace to use ChatGPT or Copilot for looking up things while coding, I wonder if "Google it" or "ggrks" are becoming obsolete terms. (I'm afraid to ask.)
Whether it's AI or "Mr. Google", the fact that users themselves think and take responsibility for the code they write may never change regardless of the era.
