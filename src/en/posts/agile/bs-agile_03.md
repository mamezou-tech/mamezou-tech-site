---
title: 'Agile in Business Systems Part 3: Compatibility with SaaS'
author: makiko-nakasato
date: 2023-11-14T00:00:00.000Z
prevPage: ./src/posts/agile/bs-agile_02.md
nextPage: ./src/posts/agile/bs-agile_04.md
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/agile/bs-agile_03/).
:::



## Introduction
I'm Nakasato.

This time, I'm posting with a bit of trepidation as it's a topic that might get stones thrown at me from various vendors. That said, I've been hearing similar stories here and there recently, so I'll explain it with a firm heart.

## Is SaaS Suitable for Agile Development?
When renewing business systems, it's becoming more common to hear about developing based on SaaS rather than scratch development. The development method involves having a base SaaS, adding third-party plugins, or creating and adding custom components.

And these SaaS vendors sometimes claim, "Our service is suitable for agile development!" The basis for this claim is likely that they can quickly show a working system and that changes within the scope assumed by the service can be easily made with configuration files, etc.

While this is not necessarily wrong, I've often heard cases where taking it at face value can be dangerous. Points to be careful about include:
- The "scope of changes assumed by the service" is narrower than expected.
- Replacing plugins can take time, not due to technical issues.
- You might have to reconsider using the SaaS itself.

Let's explain each point.

### The "Scope of Changes Assumed by the Service" is Narrower Than Expected
Even though it's SaaS, I think it's a type of package. As a package, it has a "design philosophy," and using that SaaS means adhering to that philosophy. The SaaS side does not accommodate the user's convenience. Especially if you're used to scratch development or more flexible CMS (Content Management Systems), you might find yourself surprised by the limitations. You need to carefully compare and consider what you want to do and the functions provided by the SaaS.

Furthermore, a unique challenge with SaaS is that the provided functions can change suddenly. This aspect is more severe than packages installed on-premises. What worked today might not work tomorrow (of course, there would be prior notice), and you need to continuously follow the SaaS version upgrades.

### Replacing Plugins Can Take Time, Not Due to Technical Issues
These SaaS vendors often collaborate with companies that develop and sell third-party plugins, forming an "ecosystem." While this is generally good, the problem is that each requires a contract. You need a contract with the plugin company separately from the SaaS vendor. If you want to use another plugin, you need another contract.

And these contracts inevitably take more time than development. In some cases, it might take several months to get approval again. Even if you realize that the initially chosen plugin is insufficient and find a better one, you can't switch immediately. As a result, agility can be hindered from a completely different perspective than technical issues.

### You Might Have to Reconsider Using the SaaS Itself
If a specific SaaS is used in another system within the same company and is working reasonably well, it would become a strong candidate for your team as well. However, unfortunately, even a slight difference might make it unsuitable for your team's system.

This can happen even within a single system. Agile development fundamentally involves continuous development, gradually expanding a single system. During this process, even if the requirements have matched well so far, there might come a time when it becomes impossible to meet them.

At this point, can you get the end-user to agree?
Or, can you abandon the SaaS-based system you've built up and switch to another platform?

## How Can the Development Side Protect Themselves When Using SaaS?
First, don't take the vendor's sales pitch at face value and understand that such possibilities exist. If the SaaS is specified by the end-user, they also need to understand this. I wrote this article as a basis for mutual understanding of these disadvantages.

From a broader perspective, the development side needs the ability to "discern" various services, packages, and platforms themselves.
Let's discuss this in the next article.
