---
title: >-
  【Agile FAQ #12】No More Being at the Mercy of Interruptions! An FAQ on “How to
  Protect Your Plan” in Agile Teams
author: tomohiro-fujii
date: 2026-10-30T00:00:00.000Z
tags:
  - スクラム
  - アジャイル
  - アジャイル開発
  - プロジェクト管理
translate: true

---

&emsp;Thank you for reading this article. I am Tomohiro Fujii from the Agile Group.
&emsp;Following on from the carryover work discussed last time, this article is about another frequent betrayer of plans: interruptions. Here, we will cover how to keep records, establish a duty rotation, and centralize intake—the topics I promised in Part 2 to address together around Part 12.

## Question

&emsp;Production incident responses, inquiries from other departments, “Could you quickly look into this?” requests via managers... Work that is not included in the sprint plan arrives without fail in every sprint. The plan is always eroded, and the sprint goal ends up being nothing more than pie in the sky.
&emsp;Is there a way to incorporate interruptions into Scrum operations rather than pretending they do not exist?

## Answer

&emsp;Yes. First, let us address the three questions that invariably accompany this one.

- Interruptions come in a different form every time. Is there really any way to predict them?
- If we put interruptions into the plan, the amount of planned work is reduced accordingly. Is that not a “loss”?
- The team has no authority to refuse. In the end, do we not simply have to accept whatever comes in?

&emsp;Let us answer them one by one.
- While individual interruptions cannot be predicted, **their total volume often falls within a certain range**. If you keep records, you will find patterns.
- Reducing planned work by the amount of interruptions is not a **loss**; it simply means you now have a **plan that reflects reality**.
- The team has no authority to refuse—this is true. The authority actually given to teams in the field is often so limited that the term “self-organization” can sound hollow. That is precisely why you should build the **role of refusing** into the system.

&emsp;There are three key points. First, measure. Second, incorporate an interruption buffer into the plan from the outset based on actual results. Third, design how interruptions are received. A setup in which everyone can be interrupted at any time is the worst possible design, because it destroys everyone's ability to concentrate.

![Figure 1: Even if each individual interruption differs every time, the total volume of interruptions falls within a certain range](/img/blogs/2026/1030_12_planning_interrupt_work/fig12_01.webp)

## “You must not change the plan during a sprint”—Did that make sense to you when you learned it in training?

&emsp;I think many of you have been taught in training that “the sprint plan is something to be protected” and that “changes during a sprint put the sprint goal at risk” (or have come to understand it that way). At the time, did you not have questions such as these?

- Are we supposed to say, “It is during the sprint, so come back next week,” even when a production incident occurs?
- If we put all interruptions into the backlog and defer them to the next sprint, the requesters will not accept that.
- Are the “sprints that can be protected” described in textbooks only applicable to workplaces with no interruptions?

&emsp;These three are also the objections I hear most frequently at organizations I support. To give you the answer first: **what must be protected is not “the plan,” but “the way the plan is created.”** Handle incidents, but within a buffer. Do not defer everything to the next sprint; sort work according to urgency. And textbook sprints do not assume that there are no interruptions—they assume interruptions have been incorporated into the plan. Let us trace the path to this answer, starting with interruption anti-patterns.

## Interruption Anti-Patterns

&emsp;Teams struggling with interruptions tend to exhibit several anti-patterns. If even one of these applies to your team, this article should be useful.

**Pattern 1: The Unexpected Type**—This is the type I encounter most often. During sprint planning, capacity is estimated on the assumption that there will be zero interruptions. This is despite the fact that there has not been a single interruption-free sprint in the past ten sprints. This time it is a production incident; last time it was a data extraction request from another department; before that it was an urgent investigation requested by Sales. Distracted by the different appearances of individual cases, teams overlook the fact that the total volume falls within a relatively consistent range, and the contradictory state of “suffering from unexpected events every time” becomes the norm.

**Pattern 2: The Direct-Hit Type**—This is the type where interruption requests are sent directly to whoever happens to be easiest to approach, or whoever handled the issue last time. One particular person's plan repeatedly collapses, and that person is never able to complete their planned work. Moreover, because everyone is placed in a state where they “do not know when they will be interrupted,” the entire team is deprived of time to concentrate.

**Pattern 3: The Everything-Is-Urgent Type**—This is the type where requests arrive with an “immediately” face and are simply handled as “immediately.” When you record them, you find that a significant portion of requests labeled “immediately” do not actually need to be handled in the current sprint. Because there is no gate for determining urgency, the loudness of the requester’s voice becomes the priority.

**Pattern 4: The Personal-Sacrifice Type**—This is the type where the team accepts interruptions without reducing planned work, and makes up the difference through overtime and weekends. On the surface, the plan is protected and velocity appears stable. It may last for several months, but it ends in exhaustion and attrition. Since management sees a “team that can keep operating even with interruptions,” this is the type in which the need for countermeasures is least visible.

![Figure 2: Interruption anti-patterns—unexpected, direct-hit, everything-is-urgent, and personal-sacrifice](/img/blogs/2026/1030_12_planning_interrupt_work/fig12_02.webp)

## The Assumption That They Are “Exceptions”

&emsp;These four are different manifestations of a single assumption: **“interruptions are exceptions.”** If they are exceptions, you do not include them in the plan (the unexpected type); whoever receives them deals with them directly (the direct-hit type); since they are exceptions, you treat them as urgent (the everything-is-urgent type); and the work is absorbed outside the plan (the personal-sacrifice type). All of these emerge as logically consistent responses from that assumption.

&emsp;From here, let us answer the three questions.

&emsp;First, **are we supposed to say “next week” even when a production incident occurs?** No. You handle the incident. However, you keep an advance buffer in the plan for the work you will accept. The interruption buffer is a matter of capacity. If responding to a production incident requires an emergency-change procedure, follow that procedure rather than skipping it, and draw down the effort required for the response from the interruption buffer secured in advance. If you have a buffer, responding to an incident becomes not “an event that breaks the plan,” but “anticipated work handled within the buffer.”

&emsp;Next, **will requesters not accept it if everything is deferred to the next sprint?** You do not defer everything. You sort work by urgency. Accept truly immediate work within the buffer, and put work that is not truly immediate into the backlog as a candidate for the next sprint. Once this sorting exists, conversations with requesters change from “accept or refuse” to “when will it be done?” In most cases, people object not when they are given a schedule, but when they are refused.

&emsp;And then, **are the textbook sprints only for workplaces without interruptions?** No. When textbooks say “protect the plan,” they do not assume there are no interruptions; they assume that a plan accounting for interruptions has been created. What should be protected is not the list of items included in the plan, but the method of planning based on reality. If measured interruptions account for 30%, factor that 30% out of the plan from the beginning. That is a “plan that can be protected.”

&emsp;**Why do we treat interruptions as exceptions?** It is because each interruption has a different appearance when viewed individually. While each individual case is sudden, the total volume falls within a certain range—this is the typical nature of interruptions. However, the individual appearances are so striking that our attention does not turn to the total volume.
&emsp;There is another reason. Interruptions are a phenomenon in which organizational structures outside the team—insufficient support systems, unclear division of responsibilities with other departments, and unprepared escalation routes—flow into the team. The team therefore feels that “this is not originally our work.” That feeling justifies treating them as “exceptions.” This is not about anyone’s negligence; it is a structural issue.

&emsp;So how should interruptions actually be handled? You only need to apply the empirical process directly.
- First, record interruptions one by one and examine their total volume, sources, and share of capacity (observe).
- Next, question whether “it just happened to be high this time,” and verify whether the total volume truly falls within a consistent range, whether there is a bias in the sources, and what percentage was genuinely urgent (inspect).
- Then, determine the planning buffer based on actual ratios, design how interruptions are received, and invest in reducing interruptions themselves according to their sources (adapt).

&emsp;When arranged in this order, it becomes clear which steps the unexpected type skips. Because there is no observation, every occasion ends with “this time was special,” and neither inspection nor adaptation begins. Stop “handling each case as an exception” and shift to “incorporating them into the plan as a constant and designing how they are received.” This change in perspective determines how effective the prescription will be.

## Prescription

&emsp;The specific format of a duty rotation or intake route may differ from workplace to workplace. What you should be careful about is stopping at “we secured a buffer.” That is a variant of the unexpected type, where nobody checks whether the buffer matches reality. After trying it, determine whether planned work can now be protected and whether the total volume of interruptions itself has begun to decrease.

**First, keep records for one or two sprints**
&emsp;Measurement comes before countermeasures. When an interruption arrives, record its content, required time, source, and whether it was genuinely needed immediately—in a single line. Any tool will do; sticky notes or a spreadsheet are fine. Once you have accumulated two sprints’ worth, you will see the actual picture: “our interruptions average XX% of capacity” and “the top sources are Department XX and production monitoring.” These figures become the foundation for all subsequent negotiations and design.

**Secure an “interruption buffer” based on actual ratios**
&emsp;If the actual result is 30%, leave 30% of the sprint open for interruptions. There is one caution here. If you plan using velocity, interruption work is already included in the actual results. As we saw in Parts 9 and 10, velocity is an observed value that includes both meetings and interruptions. If you subtract another 30% from it, you will be subtracting twice. Securing a buffer means making that invisible deduction visible. In workplaces that plan in hours or person-days, plan using 70% of capacity. In workplaces that plan using velocity, record interruptions separately from planned work. That way, when the interruption ratio changes, you can understand how much of an increase or decrease in velocity is due to interruptions.
&emsp;If you do not use up the interruption buffer, that is a bonus—you can start on the next candidate item ahead of schedule. Conversely, if you exceed the buffer, record that fact, share it with the PO, and have them assess the impact on the sprint goal. Shift from “the plan was broken by interruptions” to “we adjusted because interruptions exceeded the buffer.” Even though the event is the same, the latter is controlled operation.

**Localize the impact through a duty rotation**
&emsp;For each sprint, designate one or two people to be on duty for interruption response, and consolidate all initial reception of requests with them. The people on duty take on almost no planned work, and use time without interruptions for small improvement tasks or preparation for the next sprint. Other members are shielded from interruptions and can focus on progressing their planned work. Rotate the duty role to prevent concentration on particular people and the creation of single-person dependencies. Rather than “everyone being interrupted a little,” the total amount completed by the team increases when “one person takes it on and everyone else is protected.”

**Centralize the intake gate and add an urgency assessment**
&emsp;Centralize the route for receiving requests (to the person on duty or through a dedicated channel), and insert an assessment of whether “this truly needs to be done immediately, or whether it can go into the backlog for the next sprint.” This assessment and negotiation are the PO’s job. It places too great a burden on developers to individually “refuse” requests. The key is to build the role of refusing into the system. This gate only functions, however, with the cooperation of those making requests. The team centralizes intake and promises a prompt initial response, while requesters follow the route and add a brief note saying “by when” and “why.” If only one side does its part, the gate will quickly be bypassed.

**If interruptions account for more than half, reconsider the framework**
&emsp;If measurements show that interruptions consistently exceed 50%, a flow-based approach is likely better suited to that team’s primary work. As stated in Part 2, do not cling to the fixed box of a sprint; seriously consider using or transitioning to Kanban. Scrum is a means, and there is no value at all in protecting a box that does not fit reality.

![Figure 3: Design how interruptions are received through an intake gate, a duty rotation, and an interruption buffer](/img/blogs/2026/1030_12_planning_interrupt_work/fig12_03.webp)

## Why Has This Question Been Repeated for 30 Years?

&emsp;Interruptions are a phenomenon in which organizational structures outside the team flow into the team. The root causes lie outside the team, and cannot be completely eliminated through internal team ingenuity alone. That is precisely why teams in every era face the same problem.

&emsp;However, that does not mean you are powerless. Measurement becomes a weapon for negotiation, buffers protect plans, and duty rotations protect concentration. Moreover, data such as “XX% of interruptions are routine inquiries from Department XX” provides a basis for investments that reduce interruptions themselves, such as building FAQs, various forms of automation, and self-service. Even against problems that come from outside, there are more actions you can take from within than you might expect. Whether interruptions are recorded, buffers are compared against actual results, and countermeasures by source are on the agenda—having all three in place is an indicator of whether a team is treating interruptions as a constant.

---


*Next time: “The PO is too busy to come to the team.”*
