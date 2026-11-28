---
title: Software Engineering in the AI Era
author: yasumasa-takahashi
date: 2026-11-26T00:00:00.000Z
tags:
  - AI
image: true
translate: true

---

## The Age of AI

“Who implements and tests the code in your development environment?”

I believe there are quite a few workplaces where the answer would be, “Mostly AI implements and tests it.”
Although the degree of AI adoption varies depending on an organization’s compliance requirements, it is entirely possible for AI to handle everything from implementation through testing.
There are, in fact, development environments where “we develop software, but AI writes all the code.”

It is often said that “because introducing AI significantly reduces the workload of implementation and unit testing, people will be able to spend more time on upstream processes.”
However, the speed of AI evolution is surpassing even such assumptions.
AI can now design architectures using knowledge such as design principles and design patterns, and create documents explaining them, all at a high level.
Put extremely, we have entered an era in which “working software” can be completed, along with a full set of well-formatted documentation, even without any human involvement whatsoever from design through implementation and testing.

In response to this reality, there is an argument that “because AI hallucinates, human review is essential to ensure quality.”
However, is human review really an effective means of ensuring quality?
Humans make mistakes too.
The causes include insufficient knowledge, preconceived notions, and careless errors caused by fatigue.
AI's body of knowledge can already be said to exceed that of humans, and AI does not suffer from fatigue.
The claim that “human reviews are more effective for quality assurance than reviews using different AI models” will eventually become difficult to sustain.
It is not hard to imagine that, in the near future, AI will operate the development and operations (DevOps) loop itself based on data sensed from the operational environment.

I believe many software engineers are now facing the same question.
**“Will our jobs disappear in the near future?”**

![](/img/blogs/2026/1126_swengineering_with_ai/01.png)

## The Need for Software Engineering

To confront this question, let us return to the basics and consider what a software engineer is.

A software engineer is someone who practices software engineering.
Then why is software engineering necessary for product development?

When explaining the need for engineering, the difference between “programming as a hobby” and “software development as work” is often cited.

“Programming as a hobby” refers to scripts and similar things created solely for one's own use.
Even if the code is somewhat spaghetti-like, or it suddenly stops working one day, you can simply fix it yourself, and no one else is inconvenienced.

On the other hand, “software development as work” requires a level of quality entirely different from that of hobby projects.
Why are products created for work required to have such high quality?
It is not for an engineer's pride or self-satisfaction.
It is because it comes with **“responsibility.”**
When receiving compensation and providing systems that support someone’s work or daily life, the creators become responsible for those products.

Software engineering contains effective methodologies and concrete techniques for fulfilling that responsibility and ensuring high quality.
In other words, software engineers are those who practice software engineering and bear responsibility for software products.

## Will AI Make Software Engineering Unnecessary?

Let us suppose that, in the near future, AI becomes capable of developing software of far higher quality and with far fewer bugs than humans.
Even then, there is a barrier that AI can never overcome.
It is the undeniable fact that **“AI cannot bear responsibility for the products it develops.”**

Organizations that develop AI, such as OpenAI and Anthropic, are responsible for the AI itself.
Therefore, it is natural for them to also be responsible for software developed by their own AI within their own organizations.

On the other hand, organizations that develop products using external AI cannot take responsibility for the AI itself, which they did not develop.
However, they do bear responsibility for their own products developed using that AI.
Even if development is entrusted to AI, responsibility for the product cannot be shifted to the AI itself or to the organization that developed the AI.

Responsibility for a product does not simply mean financially compensating for damages when failures or accidents occur.
It always entails “accountability.”
It is the obligation, as a party involved, to explain in words why the defect occurred and with what intent and structure the system was operating.

Fulfilling accountability is the foundation for taking logical and reliable measures to prevent recurrence.
At the same time, it is itself an expression of sincerity toward users and victims who have suffered harm.

“AI designed and implemented it automatically, so we do not know why it broke.”
“The AI is responsible.”

It is difficult to imagine that society would readily accept such excuses.
In the future, social acceptance of products developed by AI itself will likely increase.
However, it will be difficult for society to accept delegating accountability to AI as well.

## Reconsider Software Engineering

From the perspective of “responsibility for products,” software development in which work is entirely handed over to AI and proceeds without understanding what is inside is not much different from “programming as a hobby,” no matter how advanced the features it implements may be.

For software engineers to work with confidence and carry out “software development as work” while taking responsibility for products, software engineering will become more important than ever.
Understanding the structure of the system, selecting design solutions based on sound reasoning, and maintaining a state in which behavior can be verified and explained when the need arises.
This is the work of software engineers, and the knowledge and methods that support this work are **“software engineering.”**

Now that AI has begun to powerfully support individual tasks that have traditionally required enormous effort and time, such as implementation, testing, and document creation, we stand at a major turning point.
Rather than being content with merely “automating tasks,” we must reexamine the essence of software engineering and ask whether we are truly capable of “responsible product development.”
Perhaps it is precisely now, in the age of AI, that each of us as engineers is being asked about this attitude.

![](/img/blogs/2026/1126_swengineering_with_ai/04.png)

*The content of this article represents the personal views of the author and does not represent the official views of the organization or group to which the author belongs.*
