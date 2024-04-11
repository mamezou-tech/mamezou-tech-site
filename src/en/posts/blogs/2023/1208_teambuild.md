---
title: 'Building a Strong Development Team: Key Considerations'
author: uno
date: 2023-12-08T00:00:00.000Z
tags:
  - advent2023
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2023/
image: true
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/blogs/2023/12/08/teambuild/).
:::



Hello, it's been a while. This is Uno.
Today's article is for day 8 of the [Mamezou Developer Site Advent Calendar 2023](https://developer.mamezou-tech.com/events/advent-calendar/2023/).

Mamezou is known for IT consulting, so there's a strong image of us handling outsourced tasks, but my team also does contracted development. The system we are currently developing has been operational for several years, and now activities like DevOps improvements have become the main focus; however, we still proceed with the project by discussing and proposing solutions to unforeseen demands and challenges with the development team. At Mamezou, there's no difference in how we operate based on the type of contract.

:::info 
Note 1: There is inherently no difference in activity whether it's outsourcing or contracting in terms of engineering. Once something is made, its rationale, the finished product, and how it is used are all created with traceability in mind. This is necessary regardless of the contract type.
:::

I believe a strong team is essential for project execution, but it's rare to start a project with such a team already in place.
- It's the first time working with some people, so it's unclear.
- There's no information on the technical abilities of partners included.
- There are member changes along the way.

Moreover, the success of the project depends not only on our team but also on the client's team structure, circumstances, and capabilities.

Of course, software engineering is necessary at each stage of the project, but since the people involved differ every time, learning from books about adopted technologies, development processes, and management processes often does not go as planned.

This time, I would like to write about what I usually keep in mind when dealing with such challenging projects.

# General Principles

## 1. Maintaining Motivation
  - The most important thing is whether each person involved in the project can work with high motivation.
  - I believe the quality of the finished product, whether good or bad, is judged by the customers, but the motivation of the people who create it greatly affects the quality.

## 2. Feel Free to Take Breaks
  - It's okay to take a break after working hard, or even if you lose motivation.
  - I recommend taking breaks to maintain motivation.

## 3. Greetings are Simple but Important
  - Except for those who find it demotivating even to greet, everyone does it, especially in remote development. Working alone at home can be lonely, so hearing "Good morning," "Thank you," "Sorry," and "Good job" can make it feel like we're working together.
  - This may seem obvious for a professional, but I sincerely feel it's important for building good relationships.

# Requirements

## 4. Understand the Client's Business
  - We write the business flow and express the flow of people, goods, money, and information.
    - This activity may be mundane, but it's the most important input for system development.
    - Without this, you can't specify what is happening where, so a shared diagram that can point to "this" is necessary.
  - Once a dynamic diagram is created, I make a static diagram. Various objects appear in the business flow, so I create a relationship diagram between these objects to compile them into a glossary. This also serves as a shared diagram, which is very important as it will eventually lead to a data model.
    - If there are objects whose creators, updaters, and deletors are unknown, it probably means that the business flow hearing was insufficient.

## 5. Understand What the Client Wants and Why
  - After understanding their business, I grasp what they want and why it's necessary, and what would be a good goal. I try to understand the direction of all stakeholders.
    - A common mistake is to immediately listen to system requirements. This is wrong because it's not so much about demanding improvements to the system as it is about wanting to improve the current operations.
    - Therefore, I understand the background and the current difficulties to draw out information for fundamental solutions.
      - I say "as much as possible" because there are areas where it's impossible to intervene, such as when using external services or product products.

# Development Team Sharing

## 6. Emphasize Transparency
  - I don't filter information by role, such as sub-leaders or junior engineers, and share everything honestly, including unreasonable or unpleasant things.
    - Relationships involve occasionally dealing with unpleasant people from the client side who say unreasonable things. I share these situations openly.
  - Conversely, I also report honestly about our inconveniences, such as underestimations that lead to unfinished work, and apologize for them.
:::info
Covering up or lying in reports, ensuring quality, and forcing the team into an unreasonable schedule can lead to exhaustion... I've experienced this, and it brings no good. Reporting accurately allows us to see the situation clearly and alters the appropriate measures for project management. It also leads to adjustments in the estimation accuracy of the estimator (scope and depth of impact assessment).
I believe this fosters a sense of responsibility even among engineers who do not usually take the front line.
:::

## 7. Don't Micromanage, Delegate
  - Once the purpose and background are understood, and the architecture and various components prepared for the project are comprehended, I believe that manufacturing can basically be done by combining them, so I don't produce detailed design documents or give detailed instructions.
    - Sometimes, when dealing with external services or when common components are needed, it's necessary to share class structures using models and proceed with the work accordingly.
  - I used to be forced to create massive amounts of meaningless documents under the name of "detailed design" at an SIer, but I think most people prefer not to waste time, and actually, this is the most enjoyable part for each engineer with the highest degree of freedom.
:::info
Some people just say "please handle it" and leave everything up to others, but that's not what I mean. Once the purpose, background, and adopted technologies are shared and understood, and the output of the task can be imagined, filling in the gaps can be done using each engineer's preferred methods.
However, if there are differences in knowledge and technical skills, additional explanations or on-the-job training may be necessary.
:::

## 8. Grow Together, Understand Together
  - Related to the delegation part above, since technical skills vary among individuals, what one member understands may not be conveyed to another. In such cases, instead of always having someone teach, we support each other and grow together with a sense of collective development.

## 9. The Implementer Makes an Accurate Estimate
  - Since I leave the work to each individual without detailed instructions, the person declares how long the function they are about to create will take.
    - Depending on the worker, they might consider 1 day out of a week as a buffer.
    - Or, they might be squeezing a task they think will take 7 days into a week.
    - As the manager, I predict how long it would take me, so if there's a significant discrepancy with my sense, there's certainly room for discussion, but I trust the person and plan for completion in a week if they say it can be done in that time.
    - Of course, the deadlines set here are directly communicated in stakeholder meetings and progress reports with the client. This is also about transparency.

## 10. Imminent Deadlines
  - There was a commercial that said, "The inhabitants of this planet don't work hard unless there's a deadline." I've always believed this to be true.
    - Summer homework is okay if done by 8/31 → The hard work happens just before the end of summer break.
    - To avoid this, if a week's work is declared, let's share the design content on the second day, and release it to the test machine on the fourth day. Having an imminent intermediate deadline creates appropriate moments to exert effort.

# In Conclusion

It turned out to be quite a document-heavy article.
I still need to learn and grow myself, but I hope this can be of some help to those involved in software development projects.
If there's a demand for more details on certain topics, I'd like to write more about them.
