---
title: >-
  For Newcomers in the Generative AI Era: Building the Ability to Take
  Responsibility for Your Own Code
author: masahiro-kondo
date: 2025-05-07T00:00:00.000Z
tags:
  - 生成AI
  - 学び
  - 新人向け
image: true
translate: true

---

## Introduction

How are today's newcomers researching and learning about technology? A web search yields official documentation, countless technical blogs (including this site), and similar articles, while X (Twitter) and YouTube overflow with useful information. GitHub hosts many OSS projects that you can easily try. There are also plenty of efficient courses on online learning platforms like Udemy and O'Reilly. And of course, generative AI—AI assistants are embedded in development tools to write code and explain error causes.

Because today's young people have high information literacy, many of them are adept at interacting with these information sources and efficiently acquiring knowledge.

However, wouldn't the following situations also likely occur?

- Because you can get something working without much effort, the motivation to understand the underlying principles is diminished.
- When an error occurs, you handle it ad hoc using information from the web or AI and stop without investigating the root cause.
- When you actually want to learn in depth, you get lost about where or how to start researching.

In other words, isn't there a particular challenge of learning unique to an age overflowing with information and assisted by AI?

In this article, I hope to share what I believe are useful considerations and mindsets for newcomers in such an era when acquiring technical skills.

:::column:Background from When the Author Was a Newcomer
When I was a newcomer, the internet wasn't yet widely available in companies, and our main information sources were the manuals for commands installed in the OS (the ones you read with the man command), the printed manuals that came with development tools, and paper books and magazines.  
I would write code or look up errors with a thick manual covered in sticky notes in one hand. Code reviews were done by printing out the code and marking it up with a pen (the PC screens at the time were so small that readability was poor).  
You might wonder what era this was, but compared to today, it feels like a completely different world to me. Because information was limited, we had no choice but to think and experiment on our own based on that limited information. Conversely, you could say it was a simpler time when fewer prerequisites and knowledge were needed to develop a system.
:::

## The Limitations of "If It Runs, It's Good Enough"

Not just newcomers, but a certain number of people adopt the "just Google it, find a code snippet that fits, and if it runs, it's good enough" approach. They copy and paste code snippets from technical blogs or Stack Overflow and say, "It works, so that's fine!" But as soon as the specifications change a little or the library version differs, they get stuck again. Each time they research again and somehow solve it, but without a fundamental understanding, they stumble over the same issues every time. I wish they would develop a habit of taking a step deeper and asking, "Why does it work this way?"  
Even when you use generative AI, it only shortens the time to get something running, and I feel that what happens on the human side doesn't change.

:::column:Early Generative AI
While recent generative AI does perform web searches behind the scenes, in its early days it relied on information available at the time the model was created, often generating code that used deprecated APIs and wouldn't run.
:::

## Start by Reading the Official Documentation

There was a time when I thought, "Official documentation isn't very helpful." In fact, in the early days of OSS, documentation often went unupdated, was unfriendly, or was English-only, so it was more useful to search for Japanese information. But today is different. Most OSS official documentation is very carefully written and serves as the most accurate and reliable primary source. In 30 minutes, you can complete the Quick Start to install and run Hello World. Localization into various languages is now commonplace, and if it's only in English, there's always Google Translate.  
When you develop a habit of "first checking the official docs" when you want to look something up, your depth of understanding changes. Many times you can reach the answer more quickly and accurately than by searching because version differences and configuration prerequisites are clearly stated.

The official documentation properly states the "specifications," "prerequisites," and "limitations." For example:

- "This option can only be used from v2.0 onwards."
- "This function returns a Promise, so you need to handle it with await or then."

You can obtain precise information directly from the software provider.

By developing the "skill to read" reliable primary information like official documentation, you also gain the following side benefits:

- You can make fundamental fixes instead of just resolving superficial errors.
- You won't stumble over the same issue again (build reproducibility and foresight).
- You'll be more adaptable to new technologies (those who can interpret documentation learn faster).

:::column:The Importance of Documentation in OSS
Before the spread of OSS, it was common to use proprietary software and development tools from companies like IBM, Microsoft, Sun Microsystems, and Oracle.  
The use of OSS for development became widespread after projects like Linux and PostgreSQL achieved performance and reliability on par with commercial Unix OSs and DBMSs. As Apache HTTP Server and Java began to be used in business, the use of OSS in enterprise grew gradually. Along with this, the importance of OSS documentation started to be recognized.  
Today, forming a developer community is crucial for OSS projects, and providing tutorials and friendly documentation has become essential for the developer experience.
:::

## When an Error Occurs, Start by Reading the Stack Trace

When an error occurs, before immediately relying on AI or searches, I recommend carefully reading the stack trace. At first glance it may seem daunting, but it's packed with clues for problem-solving.

Once you can read "in which file and line number, from which function it was called, and what caused the crash," you'll be able to track down the error cause yourself. Start by trying to extract information like the following:

- On which line, in which function, and in which module the failure occurred
- The cause of exceptions like NullPointerException (so-called null pointer) or type errors

For example, let's say you get this error in JavaScript (Node.js):

```shell
TypeError: Cannot read property 'x' of undefined
    at doSomething (/src/utils.js:25:13)
    at main (/src/index.js:10:5)
```

In this case, it's clearly written where and what happened:

- What happened: attempted to read property `x` of an undefined object
- Where it happened: line 25 of utils.js
- Where that function was called from: line 10 of index.js

By interpreting this information and comparing it to your own code, you can solve many issues without relying on web searches or AI. It's also important to distinguish where your code ends and the errors of the libraries you are using begin. Even when you turn to web searches or AI, focusing only on the surface error message can lead you to completely different contexts and waste time before you find the solution.

Even if you don't understand much at first, you'll gradually get used to it and start to grasp how to read it and what causes the errors. Begin by thinking, "The error message contains important information."

As you become able to read stack traces, when you write code yourself, you'll adopt practices such as writing error messages that are easy to analyze and writing code that makes errors easy to trace. This is very important for writing maintainable code.

## Build Fundamental Problem-Solving Skills

Programming is a means of solving challenges, and the process itself is a chain of problem-solving. First, you have to solve the problem of setting up your development environment. Writing code or fixing errors is a repetition of "there is a problem → how do I solve it?"[^1]

[^1]: There's even a phrase like "solving the customer's business challenges," but that's a discussion for the next stage.

Therefore, before writing code, get into the habit of pausing to think "why am I doing this?" and when an error occurs, pause to figure out "where and what is happening."

The ability to solve challenges isn't something you acquire overnight. It's enough to take small steps by continuing the little habits of "reading error messages," "reading official documentation," and "thinking for yourself first." As you accumulate experiences of solving problems on your own, you'll eventually gain the confidence that you can "manage somehow" in any environment and with any technology. That confidence and experience will form the foundation of an engineer who can succeed with or without relying on AI.

## Use AI Proactively—Things to Be Careful About

This article is not arguing for sealing off AI and solving everything on your own. I myself use ChatGPT and GitHub Copilot. They are convenient and certainly speed up my work.  
However, if "using generated code as-is without scrutinizing it" becomes a habit, I believe there's a risk of missing out on growth opportunities.

While referring to AI's answers, don't forget to keep these perspectives in mind:

- "Why does it work this way?"
- "What does the error mean?"
- "What does the official documentation say?"

With this habit of "using while thinking," AI becomes a tool that actually accelerates learning. Indeed, AI dramatically shortens the lead time between getting in touch with a technology and starting to build something, which is fantastic because it lets you challenge new technologies without fear.

## Conclusion

If you're reading this and thinking, "I've been doing all that for a long time," then you're in good shape. Keep going as you are.

When I was younger, I read the following computer adage and was struck by how true it was:

> The compiler compiles, and the linker links. But the debugger does not debug for you.

With a debugger, you can step through code and observe code behavior and variable values. However, you the creator still have to do the actual debugging yourself. That hasn't changed even in the generative AI era. (Oh, and maybe young people aren't aware of linkers anymore when you mention them, and it doesn't resonate; but that's okay.)

I think this also applies to the following situation today:

> Generative AI will generate code for you and investigate the causes of errors. However, it does not guarantee the correctness of the generated code.

Software engineers write code for people who use systems and services and earn compensation for it. Therefore, ultimately you need to take responsibility for the code you write. What does taking responsibility mean? It means that you can explain in your own words how the code you wrote is constructed and how it behaves, and that you can fix it yourself when there's a specification change or a bug[^2].

[^2]: When asked to explain system behavior or source code, you can't say, "I don't know because AI wrote it."

There's also the term "responsible AI," but that refers to holding AI service providers accountable, not to engineers shifting responsibility to AI.

For the time being, no matter how much generative AI evolves, I don't believe it will become an entity that verifies and guarantees code correctness. Therefore, we humans need to perform that task.

After all, engineers are a profession that will continue learning throughout their lives, whether AI exists or not, so let's strive to always take responsibility for the code we write, no matter what era comes. I look forward to the growth of all the newcomers.
