---
title: >-
  【Agile FAQ, Part 11】Why Does It Never Finish? The Real Reasons Behind Sprint
  Carryover Tasks and How to Address Them
author: tomohiro-fujii
date: 2026-10-30T00:00:00.000Z
tags:
  - スクラム
  - アジャイル
  - アジャイル開発
translate: true

---

&emsp;Thank you for reading this article. I am Tomohiro Fujii from the Agile Group.
&emsp;From Part 9 through the previous installment, we have been discussing estimation and forecasting. This installment and the next will address two recurring issues that repeatedly undermine those forecasts: carryovers and interruptions.

## Question

&emsp;Every sprint, two or three PBIs do not get completed and are carried over to the next sprint. Should we re-estimate the points for carried-over PBIs? Also, treating something that is 80% complete as “incomplete” seems harsh on the members who worked hard on it. Where should a team that has normalized carryovers start fixing things?

## Answer

&emsp;Since the question contains three separate questions, I will answer them briefly before getting to the main topic.

- Should points be re-estimated for carried-over PBIs? — No (the reasons will be explained below).
- Is it harsh to treat something that is 80% complete as incomplete? — It may seem harsh, but it is incomplete. In the sense that it cannot be released and does not deliver value to customers, “almost complete” is the same as “not started.”
- Where should a team for which carryovers have become routine begin? — Start not by blaming or hiding carryovers, but by categorizing their causes.

&emsp;Carryovers are not failures. They are **an important source of data and a mirror reflecting the reality of the team’s planning and work**. The discussion below proceeds along two axes: “continuing to treat complete/incomplete as binary” and “separating the causes of carryovers by type.”

![Figure 1: “Almost complete” belongs on the same side as “not started” in that it cannot be released](/img/blogs/2026/1030_11_unfinished_tasks_every_sprint/fig11_01.webp)

## Isn’t It a Little Shocking to Be Told, “Anything That Was Not Finished Is Incomplete”?

&emsp;Many of you have probably been taught in training or on the job that “PBIs not completed within the sprint are incomplete” and “you must not count points for partially completed work.” At that time, did you not have questions like these?

- Certainly, 80% of the work has progressed. Does treating it as zero not distort reality?
- If the goal is to eliminate carryovers, could we not simply plan less work from the beginning?
- The efforts of members who worked hard do not remain in the numbers. Would that not affect morale?

&emsp;All three are questions grounded in the realities of the workplace. To state the conclusion first, **how incomplete work is handled is not about “evaluating effort”; it is about the freshness of the data used for forecasting**.
- Even if 80% has progressed, the uncertainty in the remaining 20% is not zero (which means it is not even certain whether what you think has progressed is truly 80% complete).
- Zero carryovers are not a goal; they occur as a result of eliminating their causes.
- What should be recorded in numbers is not effort, but whether something was completed.

&emsp;Let us first look at how carryovers tend to be handled, and then return to these points one by one.

## Carryover Anti-Patterns

&emsp;Teams where carryovers have become routine tend to exhibit several anti-patterns. Try comparing them with the scenes from your own sprints.

**Pattern 1: Partial Credit** — This is the pattern of saying, “It is 80% complete, so we will count 80% of the points,” and “We will re-estimate the carried-over portion as the remaining 20% of the points.” Since the total points will be the same in the long run, it may initially appear harmless. However, partial credit artificially suppresses sprint-to-sprint variation, making the “range” discussed previously appear narrower than it really is. The risks hidden in the remaining 20% also disappear from the numbers. Moreover, everyone has surely experienced “just a little more” taking three days—or worse, dragging on far longer than expected.

**Pattern 2: Tacit Acceptance** — This is the pattern in which carryovers occur every time, but are never discussed in retrospectives or planning. “Well, that is how it always is.” Carryovers are not recorded, their causes are not analyzed, and the same amount of work is piled into the next sprint. In fact, many teams where carryovers have become routine fall into this pattern. It is not uncommon to encounter teams where delays have also become routine, and where being late is no longer considered a problem in itself.

**Pattern 3: Blame Hunting** — This is the pattern in which, whenever a carryover occurs, the question becomes, “Who was slow?” From then on, carryovers become something to hide, explain away, or manipulate to make the numbers add up; they never become material for analyzing causes. Once the atmosphere in which carryovers can be reported honestly is lost, the team loses its means of seeing its own reality.

**Pattern 4: Postponing Testing** — This is a variation often seen in business-system environments. Implementation is completed, but testing alone fails to finish every time. Much of the testing remains manual, so the team cannot achieve a pace that allows it to fit completion—including testing—within the sprint. If this is accepted as unavoidable and testing starts being pushed outside the sprint, system testing and integration testing accumulate just before release, creating what looks like sprints but is actually “batch development with postponed testing.”
&emsp;What is truly frightening comes afterward. In the end, there is still not enough time for testing, and the documentation—which is already limited compared with waterfall development—is no help either. As a result, defects are delivered rapidly to users without being found.

![Figure 2: Carryover anti-patterns—partial credit, tacit acceptance, blame hunting, and postponed testing](/img/blogs/2026/1030_11_unfinished_tasks_every_sprint/fig11_02.webp)

## The Assumption That Makes Carryovers “Failures”

&emsp;These four patterns stand on the same foundation: the assumption that **“a carryover is a failure to follow the plan.”** Once you adopt this assumption, every conclusion follows naturally: failures should be made to appear smaller (partial credit), it is better not to mention them (tacit acceptance), someone must be responsible (blame hunting), and processes that cannot be completed in time should be moved outside the sprint (postponing testing).
&emsp;Let us now resolve the three questions that we set aside earlier.

&emsp;First, **does treating 80% as zero distort reality?** No—the opposite is true. Treating 80% as 80% distorts reality. Scrum’s insistence on a “Definition of Done” is not merely philosophical. The remaining 20% of an 80%-complete PBI includes untested code, unreviewed designs, and unintegrated modules. In software development, risk is concentrated precisely in that final 20%. Treating work as binary—complete or incomplete—is a discipline for keeping the uncertainty of “just a little more” out of planning. The same is true of not counting partial points or re-estimating points when work is carried over: halfway credit makes velocity appear smoother than reality. Carry a PBI over with its original points, and count it for the first time in the sprint in which it is completed. It may be unglamorous, but this is the most honest record. If externally facing progress reports based on the amount of work completed are necessary, provide them separately. Just do not mix them into velocity.

&emsp;Next, **could we not simply plan less work from the beginning?** That is half correct. Previously, I wrote that the work you are certain to include should be planned using a pessimistic estimate. If carryovers still occur, however, the problem is not the amount of work but the size of the PBIs, the capacity estimate, or the way work is started. Simply reducing the amount of work may make things appear resolved, but the fundamental cause remains (and the same situation will recur afterward). Zero carryovers are not a goal; they occur as a result of eliminating their causes.

&emsp;And **would it not hurt morale if effort does not remain in the numbers?** If it does, that is because “completion” is not being recognized as the team’s achievement. **Velocity is not a number for recording individual effort; it is a number for recording what the team delivered.** If you want to acknowledge an individual’s 80% effort, acknowledge it with words, not numbers. The discipline of recording only completion in the numbers protects members in the long run. It is far more satisfying to break work into smaller pieces and complete them every time than to repeatedly carry the feeling of “we were so close.”

&emsp;Then where does the assumption that **failing to follow the plan is a failure** come from? It is rooted in a pre-Scrum norm: plans are meant to be followed, and failing to meet them is failure. Drawing Gantt charts, pressing people about delays, and requiring explanation documents for missed targets—many members join Scrum teams after having absorbed this culture. There is no one to blame. It is simply that this old norm is applied directly to sprint planning.

&emsp;So what is a carryover supposed to be? Scrum reverses this norm. A plan is a hypothesis, and failure to meet it is an observation that reveals the gap between the hypothesis and reality.
&emsp;**Observation** — Record, as they are, what did not finish, how much did not finish, and why. Do not blame, hide, or round anything off.
&emsp;**Inspection** — Separate the causes of carryovers by type and identify those that recur. Ask not, “Who was slow?” but “What type was this carryover?”
&emsp;**Adaptation** — Change planning or ways of working in the next sprint according to each type: splitting work, reviewing capacity, or changing how work is started.

&emsp;Viewed through this lens, the shortcomings of tacit acceptance and blame hunting become clear. The former discards observation, and the latter distorts it. Neither can proceed to inspection. Shift direction from “making failures look smaller” to “categorizing causes and reflecting them in the next plan.” This change is the foundation for the prescriptions below.

## Prescriptions

&emsp;From here, let us discuss remedies. There are many expert recommendations for splitting work and designing capacity, and any of them may be chosen... I say that every time, do I not? Still, one point: if you say “we split it up” and stop there, it is no different from reducing the amount of work without examining the cause. After trying something, judge it by whether the number of carryovers decreased—and if not, by what types remain.

**First, classify carryovers into three types**
&emsp;Before making changes, start with classification. Understanding the facts is the first step toward improvement in anything. When observing the sprints of teams where carryovers occur every time, their causes can generally be classified into three types.

1. **Too large**: The PBI is too large for one sprint, or the acceptance criteria are ambiguous, causing the scope of “what must be done for it to be complete” to expand after work begins.
2. **Capacity was taken away**: Interruptions or absences meant that the capacity assumed during planning did not actually exist.
3. **Scattered**: Everyone starts working on separate PBIs, and all of them line up at 80% complete. Too many items are started, so none are completed.

&emsp;In the retrospective for a sprint that produced carryovers, ask for each one, “Which of 1–3 is it?” and record it. Once you have three sprints’ worth of data, you will see which type of carryover this team tends toward, and you can select an appropriate prescription. Blame hunting distorts classification. An atmosphere where carryovers can be reported honestly is itself an asset for the team.

**For Cause 1 (too large), use work-splitting techniques**
&emsp;Split PBIs that are “questionably likely to fit within one sprint” at the planning stage. There are many ways to split work: split by workflow step (application only → approval in the next item), by acceptance criteria (happy path → error cases), by target data (domestic only → international support), or by quality level (manual-operation assumption → automation). In the terminology used in Part 4, all of these split at branching points in the use-case flow—the basic flow and alternative flows. Looking for ways to split means looking for branching points in the flow. Until you gain the feel for “splitting functionality into thin vertical slices” (splitting it into narrow, end-to-end paths that run from the screen to the database), it is worthwhile to spend a little more time on refinement. From experience, when one PBI is sized to fit within two or three days of a sprint, carryovers visibly decrease.

**For Cause 2 (capacity was taken away), use actual-results-based capacity planning**
&emsp;If interruptions occur constantly, they are not unexpected events; they are a constant that should be expected. The next installment, Part 12, will discuss how to address this in detail. The essential point is to measure actual interruption work and explicitly allocate capacity for interruptions within the plan.

**For Cause 3 (scattered), use swarming**
&emsp;Make “finish items that are nearly done before starting new items” your shared motto. The daily practice from Part 6 of “walking from the right side of the board”—starting with the PBI closest to completion and asking, “What would it take to finish this today?”—is directly an entry point to swarming. The way of working in which several people gather around one PBI and finish it (swarming) may make individual utilization appear lower, but it increases the number of items completed in the sprint. Optimize completion rather than utilization—this is one of the most counterintuitive and most effective shifts in Agile. If the sprint goal is written not as “finish everything we piled in” but as “make this business operation work in this way,” it also naturally becomes clear which PBI the team should swarm around.

**For the postponed-testing pattern, invest in test automation**
&emsp;The fundamental remedy for this variation is not splitting work or swarming, but investing in test automation. The longer an organization has operated on the premise that testing will be absorbed through sheer manpower, the more likely it is to postpone this investment. However, as long as it leaves intact the structure that prevents work from being “completed” within the sprint, carryovers will not disappear. Investment in automation is planned to be covered in a future installment.

![Figure 3: The relationship between the three carryover categories and their prescriptions](/img/blogs/2026/1030_11_unfinished_tasks_every_sprint/fig11_03.webp)

## Why Has This Question Been Repeated for 30 Years?

&emsp;The feeling that “carryovers are bad” does not disappear after a single training session. Every time a new member who has absorbed the culture of Gantt charts and explanation documents joins, it is brought into the team again. That is why this question returns in different forms whenever team membership changes.

&emsp;Teams that punish carryovers repeat the same carryovers, while teams that learn from carryovers improve the accuracy of their planning. **The dividing line is not ability, but the culture of how missed targets are handled.** Were the carryovers in this sprint recorded by type and reflected in the next plan? That one point reveals whether a team is able to use carryovers as data (just to be clear: this concerns internal views of planning. It does not mean that external delivery commitments may be taken lightly).

---


*Next time: “How should interruption work be incorporated into planning?”*
