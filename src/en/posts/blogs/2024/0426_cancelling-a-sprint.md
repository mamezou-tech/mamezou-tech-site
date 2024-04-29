---
title: Interpreting 'Sprint Cancellation' from the Scrum Guide
author: akihiro-ishida
date: 2024-04-26T00:00:00.000Z
tags:
  - スクラム
image: true
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/blogs/2024/04/26/cancelling-a-sprint/).
:::



## Introduction
I'm Ishida from the Agile Group. This time, I'd like to discuss a topic that's seldom brought up: "sprint cancellation."

In Scrum, which values the rhythm of development, it's naturally preferable to avoid interrupting sprints, which are central to this rhythm. The Scrum Guide 2017 even mentions that "sprint cancellation can sometimes become a trauma for the team."

However, unavoidable circumstances exist in any project, and it's important to consider these possibilities in advance.

## 'Sprint Cancellation' in the Scrum Guide
As the title suggests, let's first check how sprint cancellation is described in the Scrum Guide. The 2020 edition of the Scrum Guide states:

> If the Sprint Goal becomes obsolete, the Sprint might be cancelled. Only the Product Owner has the authority to cancel the Sprint.

That's all it says. It's written very succinctly, and it's not very clear. We need to consider what "if the Sprint Goal becomes obsolete" actually means.

Let's go back and check the 2017 edition of the Scrum Guide. Here, 'Sprint Cancellation' is included as a sub-item under sprints, and it's described in more detail. Here's just the first part of that description:

> A Sprint can be cancelled before the timebox is over. Only the Product Owner has the authority to cancel the Sprint. At this time, the opinions of stakeholders, the development team, and the Scrum Master can also be considered.
>
> If the Sprint Goal becomes outdated, the Sprint will likely be cancelled. The company's direction or changes in market and technology conditions can make the Sprint Goal outdated. If it seems meaningless considering the situation, the Sprint should be cancelled. However, since the duration of a Sprint is short, the impact of its cancellation is usually minimal.

## Obsolete Sprint Goals
So, what could be considered as "the Sprint Goal becomes obsolete" as mentioned in the Scrum Guide 2020? Let's think about some scenarios.

### External Factors
The first is when the goal itself becomes meaningless due to a change in company policy or market conditions, or the necessity for the goal disappears. For example, if the sales of a new product were to be cancelled, and you were renovating an EC site for its sale.

This is exactly the kind of example mentioned in the Scrum Guide, so it would be a candidate for sprint cancellation.

However, if you were using a waterfall approach and had spent months on development only to cancel just before release, the impact and loss would be significant. But if the development is stopped within the 1-2 week sprint period, the impact is minimal. This is a decision to cancel benefiting from agile development.

### Interjected Tasks
Next, consider when interjected tasks or urgent bug fixes mean that the current sprint goal is no longer relevant. This is the most common occurrence in real projects.

Interpreting the Scrum Guide literally, this doesn't quite fit the description of "the Sprint Goal becomes obsolete," but realistically, it's a situation where cancellation is unavoidable. If the Product Owner decides that the team needs to respond immediately to the interjected task, then it meets the criteria for cancellation.

It's important to note, as stated in the Scrum Guide, that only the Product Owner has the authority to cancel the sprint. Developers cannot decide to cancel the sprint on their own due to interjected work, nor can stakeholders override the Product Owner to issue a cancellation.

### Illness Among Team Members
Finally, consider a situation where most team members fall ill with the flu, making it difficult to achieve the sprint goal.

In this case, it can't be said that the sprint goal itself has become obsolete, but rather that it's difficult to complete everything in this condition.

The sprint goal will likely be unmet, but development will continue as much as possible. Once members recover, a new sprint goal will be set, and the normal state of the Scrum team will be restored.

## Conclusion
Sprint cancellation is something Scrum teams should avoid as much as possible. However, projects don't always go as planned.

When faced with the decision to cancel a sprint, it's crucial for the Product Owner to be able to control and make that decision. If sprint cancellations become frequent, it's also important for the Scrum Master to take action and work with stakeholders.
