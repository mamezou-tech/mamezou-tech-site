---
title: Even if asked, 'Do we need another method?', Introducing Amplio
author: tomohiro-fujii
date: 2024-08-06T00:00:00.000Z
summerRelayUrl: https://developer.mamezou-tech.com/events/season/2024-summer/
tags:
  - アジャイル開発
  - summer2024
image: true
translate: true
---


This article is the seventh entry in the [Summer Relay Series 2024](/events/season/2024-summer/).

Well, even if you suddenly hear "Amplio" in the title, most people would probably think, "What is that about?" Amplio is an approach currently in the midst of evolution. I have been deeply involved with DA (Disciplined Agile) from the beginning, and I find much to resonate with in the underlying issues of Amplio, which I believe could be of reference to many people. Therefore, since it is still evolving (meaning it can change in various ways), I would like to introduce it from the perspective of "What significance could it hold for us?" rather than delving into the details. If you are interested, I've included several URLs at the end of the article, so please take a look.

## Quickly Understanding Amplio

- The proponent is Mr. Al Shalloway.
- Amplio is currently being developed as a major technical asset at Success Engineering, a company founded by Mr. Shalloway in 2021.
- It supports the transformation of teams and organizations with a focus on improving value streams.
- Rather than a process framework, it is a catalog of practices. However, it is not just a collection but advocates "decision support" and "effective learning" linked to incremental improvement.

## The Predecessor of Amplio:

Amplio is still a new method, but it has a predecessor. It is FLEX (Flow for Enterprise Transformation), proposed at Net Objective, a company founded by Mr. Al Shalloway. This method was positioned as a "collection of practices and guides to help those who have dabbled in SAFe or Scrum and got stuck."

To gain a foothold in the agile field, PMI, known for PMBOK, acquired FLEX from Net Objective and DA (Disciplined Agile Framework) from the Disciplined Agile Consortium in 2019. Mr. Al Shalloway of FLEX, Mr. Scott Ambler, and Mr. Mark Lines of DA also joined PMI, and the integration of FLEX and DA was announced.

> This integration bore fruit and can be referenced as DA-FLEX from the following URL (even if you are not a PMI member).

> DA FLEX online book

> [https://www.pmi.org/disciplined-agile/da-flex-toc](https://www.pmi.org/disciplined-agile/da-flex-toc)

Later, in 2021, Mr. Al Shalloway left PMI and established Success Engineering. The approach being developed there is "Amplio." It may be a reconstruction or even the culmination of FLEX. The history of Amplio is just over two years, but its theoretical system has a long history starting with FLEX.

> As an aside, the following year, Mr. Scott Ambler and Mr. Mark Lines, who were leading DA, also left PMI. And the bell of integration... (Well, I don't know).

## Commonalities Between Amplio and DA

### Advocating a Decision-Making Platform

Since its predecessor FLEX could be integrated with DA, there are commonalities between Amplio and DA. That is, both advocate a "decision-making platform."

When learning agile, you encounter the term "Shu-Ha-Ri."

Agile process frameworks include various ones like SAFe and LeSS, in addition to Scrum. Although the level of detail in the rules varies,

- Role models
- Key activities
- Key deliverables

are defined, and their relationships are sometimes defined in chronological order, regulating the flow of collaboration. Teams adopting a process framework like Scrum use the predefined workflow as a reference model when they are inexperienced. This is "Shu." As their maturity increases, they make various adjustments to fit their environment and constraints (gradually deviating from the reference model, "Ha"). Eventually, they discover their optimal approach and move away from the reference model, "Ri." Having something predefined is very helpful for taking the first step.

However, methods like Amplio (and DA and FLEX) that advocate a decision-making framework have a different awareness of the problem. They question whether the "predefined things" that were supposed to be easy for beginners are becoming unreasonable. Tying this back to "Shu-Ha-Ri," it feels like the following:

1. Can it be followed in the first place? Application

   As the application area of agile expands and situations (recently called "contexts") differ at each site, can a process framework with only basic definitions fit? Can it be followed, or is it unsuitable in the first place? Isn't customization according to the context necessary even at the initial stage?

2. Even if you want to break it, you don't know how to break it

   Even if you want to tailor it to fit your context, where are the options that fit your context? Without knowing the materials for judgment or their suitability, you can't take action.

3. If you decide to "break" it, then what?

   Should you go all at once with a big bang, or should you start small?

   Changing the way you do things takes quite a bit of cost and effort. You want to proceed gradually if possible. You want to proceed...

In other words, the recognition is that there is a lack of materials to judge and decide "What to do in this case?" Even if you have drawers in your mind, you can't decide if they are empty, so let's systematize and present the contents... This is the idea of a decision-making framework.

While process frameworks represented by Scrum present a reference model (so-called "To Be") that defines the workflow to some extent, DA, FLEX, and Amplio focus on supporting decision-making by organizing and systematizing options and decision-making materials tailored to the context of each situation (so-called "As Is"). Therefore, they have a complementary relationship with frameworks. In Amplio, by using "problems that often occur on site with any framework" as a starting point when presenting options, it aims to reduce dependency on specific frameworks and be usable with various frameworks.

## What Is Different Between Amplio and DA

### Aside from the names of individual terms, the range they cover is different.

DA is now touted by PMI as "covering the entire enterprise"... but as someone who has been involved for a long time, I have mostly only seen DAD (Disciplined Agile Delivery), which focuses on development. That's because DAD, which defines the development area, has the longest history and the most content. On the other hand, from the perspective of the value stream that involves areas around the development team, the definition was weak, which was a weakness. To compensate for this, PMI acquired FLEX. Before Amplio came out, I looked at FLEX integrated into DA (DA-FLEX) for optimizing the value stream, but now it's all in on Amplio.

## Components That Make Up Amplio

Enough about positioning; let's touch on the technical aspects a bit.

The technical foundation of Amplio is said by Mr. Al to be built on Flow, Lean, human-centered design, and the theory of constraints ("The Goal"!).

> "Does it have nothing to do with Scrum?"

No need to worry. As mentioned earlier, by standing on "problems that often occur on site with any framework," it is fully applicable to Scrum.

The highest level components (called "components") consist of the following three:

1. Success Strategies

   Based on human-centered design and lean startup thinking, Amplio provides guidance for building products incrementally while exploring value.

2. Decision-Making Platform

   It provides an approach to systematize options starting from "common problems" and make judgments using them. The structured options will be introduced shortly.

3. Effective Learning

   To proceed with improvements quickly and at an appropriate cost, it is necessary to understand your context and devise an approach to make improvements in stages according to the purpose. It is necessary to evaluate the effectiveness of improvements and run a cycle of effective learning and feedback. Amplio provides guidance and a tool called Amplio GPS for this.

> This is the opposite of a "roadmap" approach, which calls for taking numerous training courses in sequence, like some giant frameworks.

In Amplio's books, a significant volume is devoted to explaining this "learning" approach, and alongside the explanation book of Amplio itself, a coaching book is being written, showing a strong interest in how to efficiently "learn and raise maturity" and how to support it as a coach.

What made me think Amplio is "modern" is that all three of the above require interaction with stakeholders, and tools are provided for that, especially actively using virtual collaboration tools like Miro and LucidChart.

## Is the Decision-Making Platform Supported by "Design Patterns"?

In Amplio, "patterns" are used to express problems and their solutions, as well as options according to context. Yes, those Alexander patterns. The Gang of Four (GoF) patterns.

Specifically, it adopts the following system:

1. Problem-solving patterns are called Capabilities, and their approach is based on "common problems and issues" that do not depend on specific frameworks.

   - "Visualizing work and workflow"
   - "Management roles"

   And so on.

2. The notation of Capabilities is expressed according to a prescribed format, like the pattern catalog seen in GoF.

   - Name
   - Purpose (the What)
   - Why it is important
   - Problems to overcome
   - What means can be taken? (the How *multiple options are presented here)

3. Individual Capabilities are classified into larger perspective categories.

At the time of writing this article, the categories covered in the book are the following five:

- Requirements and deliverables
- Capabilities to manage workflow
- Learn, improve, and pivot
- Roles
- Organizing teams and backlogs for effective value streams

These categories and Capabilities are as of the time of writing this article and are expected to be added in the future. In actual coaching settings, the flow is to use these patterns as source material and use the aforementioned tools (assets on Miro or Lucidchart) to consider the current situation, set goals, and discuss implementation methods.

## Why Am I Drawn to Amplio?

Finally, let's touch on "What significance could it hold for us?"

Most of the people I interact with at work are in the **"process of becoming agile," that is, in transition**, rather than "being able to do agile." It's not uncommon for teams to already have someone with a Scrum Master or Product Owner qualification when we meet, yet they still request support (hooray for the qualification business!).

- They don't "not understand Scrum," but they **can't decide** what to do in their current situation (well, they don't understand Scrum either)
- They are anxious about whether they can rely on **limited information like blogs and books they have read**
- The only thing that is "certainly understood" is that they "can't do it even with a qualification"

Practitioners in transition try to forcibly apply the presented To Be to themselves, and for areas not defined by that To Be or parts that don't fit their context, they adopt a distorted version of familiar waterfall methods. As a result, they waste energy and resources (and cost) with a poor way of working that is neither agile nor waterfall (by no means would I call this a hybrid). "What to do" is important, but also "What can be chosen" being organized helps with daily decision-making in various contexts.

This awareness of the problem has been unchanged in me since I first encountered the predecessor of DA in the mid-2000s. As a decision-support platform, DA found value in "increasing the material in the drawers of the mind," but with Amplio, **the "drawers" seem to expand to the mainstream of value creation, the value stream**... This is why I am drawn to Amplio.

## Reference Information Links

Below are URLs to helpful information. If you are interested after reading this article, please explore various information.

Success Engineering home

[https://successengineering.works/](https://successengineering.works/)

Notably, you can read draft versions of books before publication from here. Of course, they want feedback on the content. If you're interested, please participate, get in touch with Amplio, and post suggestions and comments.

Youtube Channel

[https://www.youtube.com/@successengineeringamplio](https://www.youtube.com/@successengineeringamplio)

On this official channel, you can find many explanatory videos of about an hour. Even if you're not good at English, with the support of translation functions, you can manage.

Additionally, the DA knowledge catalog, DA Browser, can be referenced below.

[https://www.pmi.org/disciplined-agile/da-browser](https://www.pmi.org/disciplined-agile/da-browser)

Moreover, PMI Infinity, which integrates PMI knowledge with Chat GPT, is said to already include DA knowledge.

[https://infinity.pmi.org/](https://infinity.pmi.org/)
