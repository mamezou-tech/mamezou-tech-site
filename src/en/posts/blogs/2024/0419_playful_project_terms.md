---
title: >-
  Dedicated to Newcomers: Gently and Enjoyably Explaining Project Terminology in
  Software Development (Part 1)
author: toshio-ogiwara
date: 2024-04-19T00:00:00.000Z
tags:
  - 新人向け
image: true
translate: true

---

:::info
To reach a broader audience, this article has been translated from Japanese.
You can find the original version [here](https://developer.mamezou-tech.com/blogs/2024/04/19/playful_project_terms/).
:::



Spring is here. I remember the first time I, as a newcomer, attended a project meeting and was overwhelmed by the unfamiliar industry jargon flying around. This time, I want to introduce some project terms that are unfamiliar to newcomers but commonly used on-site, based on my own arbitrary and biased views, to help you smoothly participate in projects in the future.

## A Certain Project's Email
Although fictional, let's assume you all received an email like this at the start of the project. Please read it first.

> As the project commences, we will conduct a <span style="color: blue;">kickoff</span>. Your participation is requested.
> The development <span style="color: blue;">scope</span> was being adjusted but was decided yesterday with the <span style="color: blue;">stakeholders</span>.
> The <span style="color: blue;">progress</span> will be managed based on the <span style="color: blue;">timeline</span>. Based on the decided <span style="color: blue;">scope</span>, please start by creating a schedule. The system's <span style="color: blue;">cutover</span> is at the end of March next year.
> Development requires <span style="color: blue;">reviews</span> for each <span style="color: blue;">phase</span>. If work is delayed, consider measures including <span style="color: blue;">rescheduling</span>, and report as appropriate.
> This time, please report the number of defects in the test</span> as appropriate.

<br />

If you have a year of development experience, you might roughly understand what the email is about, but how about you newcomers? You might be puzzled by the many unfamiliar terms.

## Explanation of Terms
From here, I will explain each of the <span style="color: blue;">terms</span> that seem unique to the software industry mentioned in the text. I will explain them in an easy-to-understand order, which may differ from the order they appear in the text.

### Kickoff
A meeting held to gather all participants when a project is launched, to explain the purpose, overview, and rough plan of the development project, aiming to align everyone's direction. This term is not explicitly defined in any book or standard but is commonly used in the industry.

:::column:Kickoff - Common sense is not so common
At the start of the project, in addition to the kickoff meeting, there is often a social gathering known as a drinking party where all participants are involved. However, in the department I was assigned to as a new graduate, we called the drinking party a kickoff, and the initial meeting where everyone gathered was called by a different name.

So, I believed that a kickoff was a drinking party, but when I joined a new project after changing jobs and heard that we were having a kickoff during the day, I thought, "I knew it was a casual company, but drinking in the middle of the day, wow," and was shocked to find out that it was what is commonly referred to as a kickoff meeting.

This shows that the same term may refer to different things in different companies or organizations, or the same thing may be referred to by different terms, so be careful. By the way, I remember being dumbfounded when I asked a colleague, "Where are we going to drink in the middle of the day?"
:::

### Timeline
It's a table like the following, with lines drawn for each necessary task indicating the duration of the work.

![Example of a timeline](https://www2.nec-nexs.com/bizsupli/useful/excel/images/img_excel36_cap01_l.jpg)
- Source: [「Excelの便利機能活用術」工程管理に最適なガントチャートを効率よく作成しよう｜NECネクサソリューションズ](https://www2.nec-nexs.com/bizsupli/useful/excel/36.html)

To create a system or software (app), several tasks are necessary. The timeline shows what kind of work is needed, from when to when, who is responsible, and what results are produced (the example omits "who" and "what is produced").

A timeline is generally created at the start of a project and is used to track the progress of each task. Therefore, a timeline is a schedule that clearly shows what needs to be done and when.

Terms such as "Gantt chart" and "WBS" are also commonly used with similar meanings and purposes to a timeline (though they are strictly different). At the beginning, you can think of WBS as a schedule or timeline without any problem.

:::column:Timeline (Schedule) - Expertise Required?
Creating a timeline requires some tricks and experience, so newcomers are not usually tasked with creating one right away. The need for tricks and experience arises because if you make a schedule with too much leeway, customers or bosses may question why it takes so long, and if it's too tight, you might end up strangling yourself with daily overtime to meet the schedule. Thus, creating a well-balanced timeline requires skilled expertise[^1].

However, the initial project schedule can never completely eliminate elements of fortune-telling and wishful thinking. One way to deal with this uncertainty is the recent spread of agile development, as I understand it. Although I say this, I don't have enough knowledge or anecdotes to discuss agile development, so I'll leave this topic to others.
:::

[^1]: I'm joking, but seriously, creating an accurate plan (estimate) requires knowledge of software engineering, including appropriate estimation techniques, in addition to experience and intuition about the subject area.

### Progress
The state of how far work has advanced is called "progress." In projects, as explained in the timeline section, the result of the work, what can be accomplished, is defined at the start of the work. Progress is described as how much has been advanced towards that goal, often expressed as a percentage.

For example, suppose there is a task to design a certain function, and the design work is supposed to produce a design document with an estimated 10 pages. If three pages are completed at a certain point, the progress rate for that task is 30%.

This might seem simple, but accurately measuring progress is actually very difficult. In the example, we estimated 10 pages at the start, but it's common for the number of pages to increase as more issues arise during the work. Also, if nine pages were completed one day, making the progress 90%, but the next day you realize there was an omission and more pages are needed, what would the progress be then?

Thus, accurately measuring progress requires a high-precision definition of the goal and a correct method to measure how much has been accomplished so far.

"High-precision goal definition" means it's very difficult to accurately predict the expected completion pages at the start of the work. Also, it was easy to understand because we used page numbers as an example, but what if the target was a certain function?

If a senior asks, "What's the progress on that function?" how would you answer? Would you say 50% because you feel like half is done? In reality, progress is often judged by feeling on-site, and it's true that many cases don't suffer from this approach.

So, there's no need to be stiff[^2] about reporting accurate progress, but it's important to understand that "measuring progress, plans, and estimates accurately is actually difficult."

By the way, "accurately estimating" the target or "correctly measuring the output" has been a long-standing theme in software development, and various methods have been devised and proposed in the world of software engineering. It might be interesting to explore this area once you gain some experience.

[^2]: There's no need to be stiff, but that doesn't mean you can answer casually. It's necessary to report honestly and correctly based on facts.

### Reschedule
The formal name is Re-Schedule, which means changing the schedule. In development projects, this term mainly refers to changing the originally planned start or completion dates of tasks. Moving the start or end dates forward, which accelerates the work, won't usually cause complaints from bosses or customers, but delaying them can potentially lead to the system's completion being later than originally planned, so a significant reason is often needed to approve such changes (obviously).

If the schedule is behind, the typical solutions are as follows:
1. Extend the planned completion date, i.e., delay the schedule.
2. Reduce the initially planned tasks.
3. Work overtime and push through with determination.

As an aside, when I was younger (late 1990s to early 2000s), options 1 and 2 were almost never approved, and the only viable option was to work overtime. However, in recent years, with workstyle reforms, there seems to be an atmosphere where delays are accepted, and options 1 and 2 are more likely to be approved.

### Cutover Day
The day to showcase the system you've been building, i.e., the day the system starts being used. This is from the user's perspective, but from the developer's perspective, it's the deadline by which the system must be completed.

This term has various synonyms in the industry, such as "release," "launch," and "service start," which are often used with the same meaning as cutover. In the department I was assigned to as a new graduate, we called the cutover "Maru S (Circle S)" or simply "S," which I heard came from writing the letter S for Start circled on the timeline.

That's about it for now. I've only explained five terms, but it's already quite long. I'll continue in the next part.
