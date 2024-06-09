---
title: >-
  Dedicated to Newcomers: Explaining Project Terms in Software Development in a
  Gentle and Fun Way (Part 2)
author: toshio-ogiwara
date: 2024-05-01T00:00:00.000Z
tags:
  - 新人向け
image: true
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/blogs/2024/05/01/playful_project_terms2/).
:::



[Last time](/blogs/2024/04/19/playful_project_terms/), we ended halfway through explaining the terms, so this time we will continue with the second part.

# A Certain Project's Email (Reposted)
First, let's repost an email from the previous project.

> As the project is starting, we will have a <span style="color: blue;">kick-off</span>. We ask for everyone's participation.
> The <span style="color: blue;">scope</span> of development was being adjusted, but it was decided yesterday with the <span style="color: blue;">stakeholders</span>.
> The <span style="color: blue;">progress</span> will be managed based on the <span style="color: blue;">timeline</span>. Based on the decided <span style="color: blue;">scope</span>, please start with scheduling. The system's <span style="color: blue;">cutover</span> is at the end of March next year.
> Development requires a <span style="color: blue;">review</span> at each <span style="color: blue;">phase</span>. If work is delayed, consider measures including <span style="color: blue;">rescheduling</span>, and report as appropriate.
> This time, we will have you report the number of defects found in the <span style="color: blue;">test</span> as needed.

<br />

Last time, we explained the terms "kick-off," "timeline," "progress," "rescheduling," and "cutover." This time, we will explain the remaining terms that were not covered. If you haven't seen the previous part or have forgotten it, please start from [the first part](/blogs/2024/04/19/playful_project_terms/).

# Explanation of Terms
Like last time, we will explain terms that seem unique to the software industry, following a different order than their appearance in the text.

## Scope
In system development, "scope" is used in several meanings, but in this context, it refers to the range of development[^1].

[^1]: In the context of programming, scope means the effective range.

In the development of systems or software (apps), you decide the range of functions to include in the system or app you are currently developing.

For example, suppose it was decided to create an e-commerce site. After considering the necessary functions, six functions were identified: membership function, product management function, product browsing function, ordering function, recommendation function, and point management function.

However, the e-commerce site needs to be cutover in six months, and the budget for development is limited. It is clear that if all six functions are developed, it will not meet the cutover deadline, and the budget will be insufficient.

In such a case, what would you do? Would you ask for an extension of the deadline? Or would you beg somewhere to increase the budget?

These two strategies are not non-existent, but in many cases, the development period and budget are constraints that cannot be changed. Therefore, the project must proceed within these constraints, and the typical strategy adopted in this case is to "reduce what is to be made."

In the example mentioned, while the membership function, product management function, product browsing function, and ordering function are minimally necessary to sell things online, it seems that we can somehow manage without the recommendation function and point management function. Therefore, to keep the period and budget within range, we will postpone the development of these two functions and proceed with the development targeting the four functions of membership, product management, product browsing, and ordering.

This adjustment and decision are quite common in software development, and the development target range decided in this development project is called the "scope."

It is very important for all stakeholders involved in the project to have a clear understanding of the development scope. Newcomers involved in development might really wonder if such a thing happens, but it is not uncommon to find out towards the end of the project that necessary functions have not been developed because the understanding of the development scope decided in the project was not properly communicated.

Also, the [kick-off](/blogs/2024/04/19/playful_project_terms/#キックオーフ) introduced last time is necessary for aligning the overall direction of the project for this purpose.

## Stakeholder
Following the scope, let's talk about stakeholders. I first heard this term about 20 years ago, and my initial image was exactly like the following.

![A drawing of a steak](/img/blogs/2024/0501_steakholder.png)

<br />

Steak? Holder? When I heard it, I couldn't imagine what it meant at all, but the meaning of "stakeholder" as it appears in the dictionary is "interested party" in software development as well.

Looking at the sentence where stakeholders appear in the email:

> The scope of development was being adjusted, but it was decided yesterday with the stakeholders.

<br />

Looking at this sentence alone, you might think it's just saying stakeholders, but that's just "the customer," why use a fancy foreign term? I was one of those people at that time.

However, stakeholders have a deeper and more important meaning. To create a good system, it is necessary to meet the expectations of all those involved with the system.

The direct customer who provides the development funds is certainly one important stakeholder, but in many cases, the organization that operates the system created is different from the customer or developers. In that case, the organization and people who operate the system daily have their own expectations and requests, such as "We want the new system to integrate with Slack for notifications in case of a fault, so we can respond quickly."

Now, will such expectations and requests come out just from the direct customer who provides the funds or the developers? They might come out by chance, but whether they are all correct or not is something that can't be known unless it's considered by the people or organizations who are actually going to operate it.

Therefore, stakeholders in a development project are not just the customer but include all people who have some interest or expectation regarding the system being developed. Recognizing the stakeholders related to the project correctly is very important in managing the project.

:::column:Developers themselves are also stakeholders
Stakeholders are people who have interests in the system development. Therefore, naturally, developers themselves are also stakeholders. As stakeholders, they have certain demands. What are the demands that developers have, or rather, should inherently have? These include maintainability, development efficiency, and execution efficiency. For example, the demand, "Let's introduce a CI environment in this project to make development more efficient," should rightfully come from developers. This is the same for maintainability and execution efficiency. Therefore, it might be good to make engineers who commonly say, "That was not mentioned," aware that developers are also one of the stakeholders.
:::

## Phase
Just because the development scope, which is a kind of goal of the development project, has been decided, it doesn't work well if everyone starts working on it all at once, right? Some people might start writing programs immediately, while others might start thinking about the details of the functions, such as what should be the input and output of the functions. If each person does different things, it becomes impossible to grasp the whole, and as a result, unnecessary work also occurs.

To begin with, even if you decide to create a membership function, you can't start writing the program immediately, right? For example, what items are necessary to manage as member information? Where will it be stored? What process will the entered member information go through? As such, you need to gradually detail the target.

From such considerations, software development projects divide the project into several different stages or periods to proceed with development, and each divided stage or period is called a "phase."

Generally, a project is divided into multiple phases, each with specific objectives. This makes it easier to grasp how much the entire project has progressed, and it becomes possible to check the [progress](/blogs/2024/04/19/playful_project_terms/#進捗) and ensure the quality of the product being properly made.

Typical phases of a software development project include "requirements definition phase," "design phase," "implementation phase," "testing phase," "maintenance phase," etc. Explaining these would require another two or three articles, so we will leave it at introducing the terms here.

## Review
Review might be an unfamiliar word for those who have been students until now. Unlike other unfamiliar words like stakeholders, which brought something to mind, I honestly had no idea when I first heard the term review.

However, I perceive review as a "mid-check." As explained in the "phase" earlier, a development project has several phases divided by their respective objectives. Each phase has set objectives, but what would happen if you moved on to the next phase without confirming whether those objectives have been achieved? It's not hard to imagine that problems would have grown significantly by the time you notice.

To prevent this, development projects perform evaluations at key points to assess whether the documents or program codes created in the project meet the objectives. This act of evaluating the deliverables is called a "review."

For example, during the requirements definition phase, you create a list of functions that clarifies what to make in the system as a deliverable, but you review whether the functions included in that list satisfy the project's objectives in the latter half of the requirements definition phase.

However, it is difficult to evaluate whether they are satisfactory by yourself. Therefore, reviews typically involve stakeholders who are interested in the deliverables being reviewed or experts who have deep knowledge of those deliverables.

:::column:T.B.D. is very difficult for me?
When having deliverables reviewed, if a certain part is still undecided and not completed, it is often marked with "T.B.D." to indicate this. However, T.B.D. means undecided, but the reason for being undecided is often because it is difficult to decide or examine, so there was a joke at one time that T.B.D. stands for "Too Badly Done" rather than "To Be Determined"...
:::

## Test
The last term is "test." When I first heard this term, I seriously thought, "There are still tests even after becoming a working adult? Oh no, what kind of questions will they ask?" But rest assured, it's completely different.

In software development, a "test" is the work of verifying whether the software created functions as expected or meets specific objectives, simply put, it involves running what has been made to check it[^2]. Although the term "test" might make you tense, thinking of it this way might help you understand it as something quite ordinary.

[^2]: This might include reviews and static analysis by tools as static tests, but for ease of understanding, we refer to dynamic tests as "tests" here.

This concludes the explanation of project terms spread over two parts. There are many more project-specific terms used in actual software development, but I hope this article serves as an entry point to understanding them.
