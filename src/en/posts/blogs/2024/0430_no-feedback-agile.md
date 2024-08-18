---
title: 'Agile, Waterfall, and the V-Model in Manufacturing: Unraveling Misconceptions'
author: takayuki-oguro
date: 2024-04-30T00:00:00.000Z
tags:
  - アジャイル開発
  - 組込み
image: true
translate: true

---

:::info
To reach a broader audience, this article has been translated from Japanese.
You can find the original version [here](https://developer.mamezou-tech.com/blogs/2024/04/30/no-feedback-agile/).
:::



# Introduction

The choice of development methodology is directly linked to the success of a project.
Although I am not an Agile specialist consultant, I do implement Agile in the context of consulting for process improvement in manufacturing. In this context, Agile, Waterfall, and the V-model are often misunderstood concepts.
In this article, I will explain the differences between these methodologies and considerations for their application, based on my personal experience and specific examples.

:::alert
Originally, the V-model consists of the following three components, but in this article, I intentionally used the term V-model to refer only to (1). This is because, during consulting, developers often focus only on (1) when they refer to the "V-model," based on their questions.
(1) The left side of the V represents the development stages (e.g., requirements definition → system design → component design → module design).
(2) The right side of the V represents the testing stages (e.g., unit testing → integration testing → system testing → acceptance testing).
(3) It shows that the output from the left side becomes the test base on the right side at each stage of the V.

:::

# Confusion between the V-Model and Waterfall, and Misunderstandings about Agile

Often, the V-model and Waterfall are seen as synonymous, but this is a misunderstanding.
Waterfall is a method of progressing through a series of phases (requirements definition, design, implementation, verification, maintenance) in stages, moving to the next phase only when one is 100% complete, and not returning to previous phases once they have moved on.
In contrast, the V-model shows a "smooth sequence of making things." It simply represents the idea of clarifying what you want (requirements definition), considering the structure of that thing (design), and then creating it (implementation). It does not mean that each process is completed 100% before moving on; rather, it assumes back-and-forth movement between processes.

Consider this: if you try to consider the structure or implement something without clearly defining what you want, how much rework would that cause? The V-model simply shows a work sequence that minimizes such rework.

From here, if we reconsider the relationship between Waterfall and the V-model,
"Waterfall is a method of moving from the top left to the bottom right of the V-model without going back and forth between stages and only moving on after 100% completion."
can be explained.

Agile development is often explained in the context of being anti-Waterfall, so among those who confuse the V-model with Waterfall, there is still a common belief that "Agile does not use the V-model." However, Agile is not against the V-model itself, which minimizes rework; it only criticizes the large amount of rework at the end of the project, which is typical of Waterfall.

Waterfall
![Waterfall](/img/blogs/2024/0430_no-feedback-agile/no-feedback-agile_01.png)  
Created by OpenAI's DALL-E

V-model
![V-model](/img/blogs/2024/0430_no-feedback-agile/no-feedback-agile_02.png)  
Created by OpenAI's DALL-E

# The Presence of the V-Model in Agile

As mentioned earlier, the V-model shows a "smooth sequence of making things." By thinking about requirements and design as much as possible on paper before implementing code, you can minimize rework.

When considering an Agile approach, it would be good to think as follows:
1. Based on the V-model, think through what can be understood on paper,
2. Make a thin version of the product with some unknown elements remaining,
3. Obtain feedback and return to 1.

The traditional V-model exists within daily and sprint routines.

# The Subtle Differences between Incremental Development and Agile

I have been involved in the development of embedded software at various manufacturers. Embedded software development at manufacturers is often perceived as "not Agile, old development" compared to web development, etc. However, the actual development at manufacturers is not strictly Waterfall as shown below.

Waterfall
![Waterfall](/img/blogs/2024/0430_no-feedback-agile/no-feedback-agile_01.png)  
Created by OpenAI's DALL-E

Especially in manufacturers dealing with BtoB products that are not consumer goods, there is often a demand for rapid productization. Therefore, incremental development, where the product is released first and then software with more advanced functions is shipped later (as an update), is commonly practiced.

Incremental development
![Incremental](/img/blogs/2024/0430_no-feedback-agile/no-feedback-agile_03.png) 
Created by OpenAI's DALL-E

For example, a typical case would proceed as follows:
Each step takes several months, and continues like this.
Here, without fear of misunderstanding, I write that such incremental development steps are sometimes called "iterations" on the ground.
- "Iteration 1: Verification of basic function with hardware alone"
- "Iteration 2: Development of small application function 1"
- "Iteration 3: Development of small application function 2"
When the time comes that a product release is unavoidable, the product is released, and then the remaining functions are developed.

Thus, when developers are proposed to adopt Agile, they feel, "We are not doing Waterfall but iteration development, so there is no need to change our development style."
Also, "There are various schools of Agile, so that's Agile too," is a flexible way of thinking that is often discussed.

However, this style of development typically involves long iterations and does not have a feedback cycle.
Neither the product requirement feedback cycle nor the retrospective is effectively cycling PDCA, which I have often observed.
To me, this does not leverage the benefits of Agile development.

This is one of the reasons for the misunderstanding about the introduction of Agile development in manufacturers. And, the extension of development periods, decline in quality, and increase in maintenance work remain unresolved.

# Examples of Waterfall Development Disguised as Agile

In one team I was involved with, although Agile methods such as product backlogs and sprints were adopted, I observed sprints that had become "Waterfall-like" without actual feedback. I present this as an example of non-Agile development disguised as Agile in manufacturing.

As mentioned earlier, incremental development is sporadically observed in manufacturers.
In this case, the introduction of Agile development for developers feels like significantly shortening the iteration period of incremental development. For example, "Just divide the previous development milestones into one or two weeks. Then, reflect at the end of each cycle," is a common misunderstanding.
While such misunderstandings exist, teams trying to adopt Agile in manufacturing are challenging in adopting new practices. Some teams also introduce practices like pair programming. In teams I was involved with, the overall skill level of programmers improved due to the effects of pair programming, leading to satisfaction with Agile.

However, growth stops here. Indeed, there was a big problem with the misunderstanding.
They can't create a good product backlog... Unconsciously, they base their thinking on the traditional incremental development steps. Even if they write something resembling a user story, in reality, it's just a small part of one process in the V-model. And they execute it as a sprint.

I occasionally visit the team to observe, and when I see the daily stand-ups or product backlog refinement, I feel that the members do not seem to be enjoying themselves. They appeared to be stuck with difficult technical challenges.

When we open up the discussion, the content of the sprints was essentially as follows:
- "Sprint 1: Analysis of XX + ..."
- "Sprint 2: Design of XX 1 + ..."
- "Sprint 3: Design of XX 2 + ..."
- "Sprint 3: Implementation of XX + ..."

Since one sprint is just doing one process of the V-model, they were not able to reap the benefits of agile feedback and learning. If the delicious fruit is not obtained, it is naturally not enjoyable.

I explained, and they understood, but I don't think everyone has fully digested it yet.

By creating an actually working program in a short period of one or two weeks, you can recognize issues or feel reassured that there are no problems. In this case, the entire range of the V-model should be implemented within one sprint.

To repeat, the following two are compatible in this context:
- "Reduce rework by thinking on paper about what can be understood without implementing code."
- "For things that cannot be understood without implementing code, run an iterative feedback cycle to reduce major rework in the later stages of the project."

This may seem simple to explain, but because the means to reduce rework are "not implementing code immediately" and "implementing code immediately," it may be confusing.
Balancing these two is what makes an iterative V-model.

This experience of mine can also be expressed as, "This team was incremental but not iterative."
I realized that such problems are likely to occur in manufacturing sites because the experience of traditional incremental development is deeply ingrained.
In the future, I want to clearly articulate the importance of cycling the feedback cycle through iteration.

Incremental development
![Incremental](/img/blogs/2024/0430_no-feedback-agile/no-feedback-agile_03.png) 
Created by OpenAI's DALL-E

Iterative development
![Iterative](/img/blogs/2024/0430_no-feedback-agile/no-feedback-agile_04.png) 
Created by OpenAI's DALL-E

# Conclusion

In recent years, as I interact with customers, I feel that Agile development is becoming important even in manufacturing. However, rather than aiming for the introduction of an Agile process, we must aim to reap its results/fruits.

If we emphasize the introduction of an Agile process rather than its results/fruits, it may be boasted that "we have been doing Agile all along."
However, if there is no noticeable growth in the team or product, and they do not seem to be enjoying themselves, then it is not truly Agile (agile) development. The agile feedback cycle is probably not turning.

The person who taught me Agile said, "With Agile, it's good to make it enjoyable for yourselves." I hope you can lead an enjoyable Agile life, continuously obtaining good products and personal growth.

Please share your experiences and thoughts on the application of these methodologies in your projects. Exchanging views from different perspectives provides opportunities for further learning and growth.
