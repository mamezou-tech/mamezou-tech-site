---
title: 【Agile FAQ No. 9】My Boss Asks Me to Convert Story Points into Person-Days
author: tomohiro-fujii
date: 2026-10-21T00:00:00.000Z
tags:
  - スクラム
  - アジャイル
  - アジャイル開発
  - プロジェクト管理
translate: true

---

&emsp;Thank you for reading this article. I am Tomohiro Fujii, a member of the Agile Group.
&emsp;Parts 6 through 8 covered Scrum events. Starting this time, we will move on to estimation and forecasting. As with the event installments, we will examine the topic in the following order: “the honest question → anti-patterns → the root of the misunderstanding → prescriptions.”

## Question

&emsp;We estimate using story points, but my boss asks every time, “So, how many person-days is that?” At a loss for an answer, I ended up creating a conversion table such as “1 point = 0.5 person-days.” I feel that this defeats the purpose of relative estimation, and I sometimes wonder whether we should just estimate in person-days from the beginning if we are going to convert them anyway.
&emsp;What would have been the correct answer?

## Answer

&emsp;Although the wording differs, the topic of your question—points and person-days—is something I am asked very often. Let us consider this question from three perspectives.

- Does your boss really need “person-days”?
- Was creating a conversion table really such a bad thing?
- If we do not answer in person-days, what exactly should we answer with?

&emsp;I will answer them in order.
- What your boss really needs is usually not person-days, but rather, “When will it be finished? (Or, will it make the deadline?)” and “How much will it cost?” Person-days are merely being asked for as a means of deriving those answers.
- You cannot be blamed for creating a conversion table itself (after all, you were asked for one). However, the moment you fix it as “1 point corresponds to XX,” several gears—as described later—begin turning in reverse. The feeling of “then we should just use person-days from the beginning” is understandable; if everyone is converting to person-days during estimation sessions, that would indeed be more honest. However, the cause is not points, but the conversion table.
- What you should provide is not a converted point value, but **a release forecast and a view of the cost**. If you can answer with a range, such as “Completion is expected between early and late [month],” based on actual velocity and the remaining backlog, that will usually satisfy an internal manager’s needs (though cases where person-days are required for approval on the ordering side are different; we will cover those in the prescriptions).

&emsp;Rather than following the literal wording of the question, answer “what the other person really wants to know” behind it—that is all there is to it. The two central themes are “translating your boss’s question” and “separating the numbers presented externally from the tools used for internal planning.”

![Figure 1: The literal question, “How many person-days?”, and the question behind it](/img/blogs/2026/1021_9_story_points_to_person_days/fig09_01.webp)

## Didn’t You Find It Odd When You Were Told, “Points Must Not Be Converted into Person-Days”?

&emsp;Many of you have probably been taught in training or on the job that “story points are relative values” and “they must not be converted into person-days.” Did you not have questions such as these at that time?

- Budgets and approval processes operate in person-days. Without conversion, the discussion cannot move forward.
- In the end, everyone is converting into person-days in their heads during estimation sessions. Wouldn’t it be better to use person-days from the outset?
- What can a manager decide based on relative values alone?

&emsp;All of these are legitimate questions. To give the answer first, **the key point is that a figure derived from “1 point = X person-days” and velocity are similar-looking but fundamentally different numbers**. A converted value is a number that states the **cost of an item**, as in “this item takes 3 person-days.” Velocity is a number that states the **flow of a team**, as in “this team completes 25 points per sprint.” Planning requires the latter. If you bring the former into planning, reconciling individual items begins.

&emsp;If budgets and approval processes operate in person-days, you do need to connect to person-days. However, what you connect is not each individual item, but the total. Divide the total remaining points by velocity to determine the duration, then multiply that duration by the team’s monthly cost to determine the amount. This approach avoids assigning person-days to individual items.
&emsp;What a manager wants to decide is not the relative value itself, but “when it will be finished” and “how much it will cost.” What you should give your manager is **not the input material called points, but the outlook derived from it**.

&emsp;That said, this alone may not be sufficiently explained. Let us first list the forms that conversion requests tend to take, and then answer them one by one.

## Anti-Patterns of Person-Day Conversion

&emsp;There are several anti-patterns surrounding conversion. If any sound familiar, start there.

**Type 1: The conversion-table type**—This is the most common type. A fixed conversion table such as “1 point = 0.5 person-days” is created, points are multiplied to convert them into person-days, and the result is reported. This is exactly the case in the opening question. Things are peaceful immediately after creating it, but during estimation sessions everyone begins calculating backward into person-days, and the speed of comparison—“this is about twice as much as that”—is gradually lost.

**Type 2: The report-card type**—This type repurposes points into an individual productivity metric, such as “how many points that person completed this month,” or into comparisons between teams, such as “Team A completes 30 points every sprint and Team B completes 15. Is Team B half as productive?” Estimation becomes a tool of self-protection, creating incentives to estimate large or to choose easy items. The numbers inflate and die as a forecasting tool. When a measurement becomes a target, it ceases to be a good measurement—a phenomenon known as “Goodhart’s law,” named after economist Charles Goodhart. In the first place, points are relative values within a team, and Team A’s 5 and Team B’s 5 have no compatibility whatsoever. A conversion table conceals that fact.

**Type 3: The haggling type**—This type occurs when the ordering side or an administrative department sees the number converted to person-days and starts bargaining down individual items: “This screen takes 3 person-days? You did it in 2 person-days before, didn’t you?” The moment a point breakdown turns into a person-day breakdown, estimation becomes negotiation material rather than forecasting material. This is the same structure we saw in Part 3, where estimation breakdowns flow into guarantee language.

**Type 4: The silence type**—This type follows the teaching of “do not convert,” responds to a manager’s question only with “points are relative values, so they cannot be converted into person-days,” and ends the conversation there. That is correct, but it answers nothing about what the manager truly wanted to know: “when” and “how much.” It abandons translation while believing it has followed the teaching.

![Figure 2: Four anti-patterns of person-day conversion](/img/blogs/2026/1021_9_story_points_to_person_days/fig09_02.webp)

## The Assumption Common to All Four Types

&emsp;All four types share an assumption: **points are another name for effort**. If you start with this assumption, it naturally follows that creating a conversion table is appropriate, that points should be usable to compare individuals and teams, that item breakdowns should be negotiable, and even that “if they cannot be converted, they are useless.” Every type appears after failing to question this assumption.

&emsp;With that in mind, let us answer the questions raised earlier one by one.

&emsp;First, **wouldn’t the discussion fail to move forward without conversion?** That is correct. Organizational budgeting, approval processes, and external reporting operate in the language of person-days and person-months, and discussions cannot move forward unless you connect to that language. This is reality, and denying it gets us nowhere. Moreover, converting points into person-days is mathematically possible. If you divide the person-days used in a sprint by the points completed in that sprint, “1 point = X person-days” can be calculated with simple arithmetic. Many conversion tables in the field are actually created from historical results in this way. Their origin is valid.
&emsp;Even so, a converted value and velocity are not the same thing. The difference lies in what the number claims. Velocity is the **flow** of the system called the team: “this team completes X points per sprint.” It is an **observed value after the fact, including meetings, interruptions, and waiting time, and it makes no claims about the individual items developed during that period**. It speaks only about the total. A converted value **takes that velocity, fixes it as a constant, factors in team size and sprint length, and transforms it into an attribute value associated with an item: “this item takes 3 person-days.”** In other words, it becomes a number that speaks of the **cost** of an item. Even if both come from the same historical results, one is team flow and the other is item cost. This is the dividing line.
&emsp;The moment it becomes item cost, haggling over each item, blaming a person who took five days for a three-person-day item, and demanding re-estimation per item all become “legitimate uses.” Those who estimate inflate points in anticipation of this, and points become performance metrics. All four types described earlier arise from here. **As long as they remain flow, these problems cannot arise in the first place.**
&emsp;So how do we connect the outlook for what we will create to the language of person-days and person-months? Do not multiply it onto items; divide it at the total level. Divide the total points in the remaining backlog by historical velocity, and you get the remaining number of sprints. That is “when it will be finished.” Multiply that number of sprints by the team’s monthly cost, and you get “how much it will cost.” Since velocity is a changing observed value, it can be handled as a range (20–30), which makes the forecast a range as well, and **deviations return to the next plan as “forecast updates.”** If you instead apply a converted value to items during estimation, the plan is fixed at that point, and **the same deviations appear as “delays.”**
&emsp;By connecting the language of person-days and person-months to totals, you can preserve the style of using points for estimation within the team while presenting the outlook expected by people outside the team based on historical data. When asked about actual results themselves, it is even simpler: “This team spent X yen in labor costs over these three months and delivered Y,” without converting individual items.

![Figure 3: Multiply items or divide totals—the difference in where person-days are attached](/img/blogs/2026/1021_9_story_points_to_person_days/fig09_03.webp)

&emsp;To be honest, if you review the converted value every sprint and stop looking at it by item, using it only for totals, then multiplying it onto items and dividing totals will produce the same number. The difference is not in the calculation result, but in the meaning of the number and the practices it invites. We will address this more carefully at the end of the installment on velocity.

&emsp;Next, **if everyone is converting to person-days in their heads, wouldn’t it be better to use person-days from the beginning?** If that is the state of affairs, then yes, it would. The advantage of relative estimation is that comparisons such as “this is about twice as much as that” can be made **faster than absolute-value estimation and reached as a team consensus**. If everyone is calculating backward into person-days during estimation sessions, that advantage has already been lost, and estimating in time is more honest. However, this is not because points are meaningless; it is because the conversion table has turned points into another name for person-days. Stop using the conversion table, and the speed of comparison returns.

&emsp;And **what can a manager decide based on relative values alone?** Relative values themselves cannot be used for decisions. What a manager uses for decisions is “when it will be finished” and “how much it will cost,” derived from relative values and actual velocity. Points are not numbers to show a manager; they are **internal team material for creating that outlook**. What you should give the manager is not the material, but the outlook.

&emsp;**Where does the assumption that points are “another name for effort” come from?** Many of us were taught that estimation means accumulating effort. Estimate person-days for each function, total them, and derive the duration and amount. When encountering story points within this culture, it is a natural reaction to understand them as “a new unit of person-days.” This is not a matter of laziness. However, training often fails to convey that this is not a replacement of units, but a replacement of tools.

&emsp;Looking back, what exactly are story points? Before discussing them as a tool, let us state what they measure. Points are relative values that represent the **size** of what is being built—combining volume, complexity, and uncertainty—using the scale of that team. While effort is an input-side quantity, “the time invested by people,” size is a quantity on the side of what is being created. However, size itself has no absolute value, so it is represented as a ratio: “this is about twice as much as that.” Ratios work because, even though the effort required for the same two items varies depending on who creates them (one and two days for Person A, three and six days for Person B), the ratio of two tends not to change. So we keep only the ratio. And because the scale is specific to the team, it loses meaning outside the team.

&emsp;With that established, what are story points originally a tool for? Agile planning is based on empiricism. Rather than fixing estimates in advance, make actual results transparent, inspect the gap between forecasts and results, and adapt the plan. Story points are a tool for this process of “forecasting from actual results.”
&emsp;**Estimation**—Points are for quickly arriving at team consensus on comparisons of size between items. Because they are not absolute values, they are less affected by individual work speed and day-to-day interruptions, making consensus less likely to break down.
&emsp;**Actual results**—The sum of points completed each sprint (velocity) is the team’s actual result. This is the only basis for converting points into time.
&emsp;**Forecasting**—Divide the remaining points by historical velocity to get the remaining number of sprints. Since actual results vary, the forecast becomes a range. The range becomes more reliable as more actual data accumulates, and narrows as the causes of variation are reduced (handling variation will be covered in the installment on velocity).

&emsp;Having come this far, the problem with the conversion-table type should be clear. The problem with “1 point = 0.5 person-days” is not that it lacks a basis, but that it turns actual results that were team flow into item cost, while the table does not change even when the actual results that were its basis change. What must change is from “convert points into person-days for each item” to “use total points and historical velocity to produce an outlook, then connect to language outside the team through that outlook.” This replacement is the premise for all prescriptions in this article.

## Prescriptions

&emsp;From here, we will discuss concrete measures, but all of them are merely tools. Experts have proposed various techniques for estimation and forecasting, and you may choose whichever one you prefer. However, simply declaring that you have “discarded the conversion table” is no different from the silence type. After trying these approaches, determine whether they worked by seeing whether the conversation with your manager changed from “How many person-days?” to “When? How much?”

**First, list velocity from the most recent several sprints alongside the remaining points**
&emsp;Before making changes, put the current state onto a single page. List velocity for the most recent five to eight sprints (the worst and best values) alongside the total points of the remaining backlog. Even with only three sprints of historical data, you can produce a rough range (it takes around five sprints for the range to become reliable, but that is the topic for next time). With just this one page, your answer to “How many person-days?” changes from “It cannot be converted” to “Based on current results, it will take X to Y sprints.” The prescriptions that follow all begin with this one page.

**Answer “when will it be finished?” with a release forecast**
&emsp;Use the range of velocity from the most recent several sprints and the total points in the remaining backlog to present a range for the completion date. “There are 220 points remaining, and velocity is 20–30, so it will take 8–11 sprints, which means [month] through [month].” The key is to answer with a range rather than a single date. If your manager asks in terms of cost, convert the range directly into an amount. “The difference between the best and worst cases is three sprints, which means the current range of uncertainty is equivalent to 1.5 months of the team’s monthly cost.” There is also a practice called “ranged burndown” (a burndown representation with a range introduced in PMI Disciplined Agile), which expresses this range on a burndown chart as two lines representing best and worst cases. The width of the range itself is an honest expression of uncertainty, and it narrows as sprints accumulate. When you can share this experience of “the forecast gradually becomes more precise” with your manager, the quality of the conversation changes.
&emsp;This transition cannot be completed by the person answering alone. Developers should present the range and its basis in the same format each time, while managers who ask should try rephrasing their question from “How many person-days?” to “When? How much?” When both sides become accustomed to this form, the conversion table is no longer needed.

**Answer “how much will it cost?” with the team’s operating cost**
&emsp;The cost of an agile team is determined not by accumulating tasks, but by “how many months we will run this team.” For a situation such as a renewal project, where you budget by a coherent body of deliverables, the budget “container” can be created using the method from Parts 4 and 5 (derive volume by multiplying the number and scale of use cases, overlaid with an initial depth setting, then convert it into duration and cost using actual measurements). On the other hand, the way to think about the cost of a continuously operating team is simple: the team’s monthly cost (personnel costs + expenses) × duration. This calculation requires no person-day conversion. Rather, it is an opportunity to explain the agile funding model of “a fixed team maximizing value within a given period.”

![Figure 4: Traditional planning and agile planning—the things that are fixed are reversed](/img/blogs/2026/1021_9_story_points_to_person_days/fig09_04.webp)

**If conversion is still required, limit its purpose**
&emsp;There are situations where person-days are absolutely necessary for approval processes or contracts. In those cases, draw a line: prepare an approximate value calculated from historical results (“this team spent X yen in labor costs in a quarter and delivered Y”) only for use outside the team, and do not bring it into estimation or planning within the team. There is no issue with the converted value derived from actual results itself, as long as it is limited to this purpose and recalculated whenever actual results are updated. This is the separation of “external currency” and “internal planning tools.” In Part 3, we discussed separating the “budget container” from the “scope of guarantee”; this has the same structure. There is one principle: conversion values presented outside the team come from actual results, while planning within the team uses forecasts. Both are derived from the same records, and the basis for their calculation is documented. This prevents suspicions that the numbers presented externally and the numbers used internally come from different sources. Whether you can agree on this line with your manager is the crucial point. It becomes easier to gain acceptance if you explain the side effects of conversion tables in advance (inflation, turning points into quotas, and comparisons between teams).

**Advanced: There is also an option to stop using points**
&emsp;Once you become able to divide PBIs into sufficiently small and uniform pieces, a method of forecasting by “count” without assigning points becomes possible (throughput-based forecasting). The time spent discussing estimates becomes almost zero, and the answer to “How many person-days?” changes to “We complete an average of X items every sprint.” Keep this in the back of your mind as an option for mature teams.

## Why Has This Question Been Repeated for 30 Years?

&emsp;Story points were created as “tools for planning within a team,” but organizational accounting, approval processes, and contracts still operate in the language of person-days and person-months. Because someone to stand at the boundary between these two languages and interpret them—originally the job of a PO or manager—is not explicitly appointed, the friction at that boundary falls upon the developers who performed the estimates themselves every time. Those developers create conversion tables in good faith, then struggle with the same side effects several years later. This cycle repeats.
&emsp;There is also ongoing pressure to reduce costs in the background. The more executives expect Agile in the context of being “fast and cheap,” the more they want to verify in person-days exactly “how much cheaper it became.” Requests for conversion are also the reverse side of that expectation. This is precisely why it is worthwhile to reshape the content of those expectations themselves through a different way of answering: ranged completion forecasts and team operating costs.

&emsp;When you are asked for a conversion table, it is a sign that there is no translator. Before creating the table, discuss who will take on the work of translation. What you should verify is whether the conversation with your manager has changed from “How many person-days?” to “When? How much?” That is the gauge that tells you whether this team’s estimation is functioning as a forecasting tool.

---


*Next time: “Velocity is not stable. Can we use it for planning?”*
