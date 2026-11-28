---
title: >-
  【Agile FAQ #15】Even Though We Call It Self-Organization, the Leader Still
  Decides Everything
author: tomohiro-fujii
date: 2026-11-27T00:00:00.000Z
tags:
  - スクラム
  - アジャイル
  - アジャイル開発
translate: true

---

&emsp;Thank you for reading this article. I am Tomohiro Fujii, a member of the Agile Group.
&emsp;We have continued discussing the roles of the PO and SM, but this time we will talk about the team itself—“self-organization,” a term that always comes up in training yet is perhaps the least tangible in the workplace. In Part 12, I wrote that “the authority given to teams in the field is not extensive enough for the term self-organization not to sound hollow.” That was about authority in relation to those outside the team.
&emsp;This time, we will discuss what happens inside the team, between leaders and members.

:::info
The Agile FAQ series index is available here 🫱 [Agile FAQ](/agile/#アジャイルfaq)
[Previous article 👈 【Agile FAQ #14】What Does a Scrum Master Do? They Look Like They Have Nothing to Do (Plus a Bonus: Will AI Replace SMs?)](/blogs/2026/11/20/14_what_does_scrum_master_do/)
:::

## Question

&emsp;I hear that a “self-organizing (or self-managing) team” is the ideal in Scrum, but in reality, our veteran leader decides everything—from task assignments to technical decisions. The leader also seems exhausted from having too much to do, and appears to recognize that team members will not grow under these circumstances. Still, I do not think anything will change just by calling out, “Become self-organizing.”
&emsp;Where should we start?

## Answer

&emsp;When we break down this concern, it separates into three questions (you are probably wondering why there are always three, right? I just like the number “three”).

- Does the leader make decisions because they refuse to let go of them?
- Even if we say “delegate,” delegating will lead to failure. Should we still delegate?
- In the first place, does self-organization mean that there is no leader?

&emsp;A state in which the leader continues making decisions is not the product of laziness or a desire for power (at least, I hope not), but rather the product of a **rational vicious cycle**.
- When the leader decides, it is fast and accurate.
&emsp;→ Team members lose opportunities to make judgments.
&emsp;&emsp;→ They cannot gain experience, so they really do fail when responsibility is delegated to them.
&emsp;&emsp;&emsp;→ The leader makes even more decisions.
&emsp;It is true that delegating (or rather, dumping everything on someone) leads to failure. Therefore, rather than taking the extreme approach of “delegate everything,” you need to design a gradual process of letting go of decisions one at a time. And self-organization does not mean that the leader becomes unnecessary; it means that the center of gravity of the leader’s work shifts from “making decisions” to “creating a team that can make decisions.”
&emsp;There are two key ideas: delegation is not a matter of zero or one, but has levels; and the cost of failure can be reduced through technology.

![Figure 1: The rational vicious cycle in which the leader keeps making decisions](/img/blogs/2026/1127_15_self_organization_leader_decides/fig15_01.webp)

## “Let the Team Handle It”—Did You Think Those Words Could Actually Be Used in the Workplace?

&emsp;“The team manages itself.” “Rather than giving instructions, leaders should leave things to the team.” When you heard that in training, perhaps leaders had the following objections in mind.

- If I delegate and they fail, the leader is the one who takes responsibility. And yet I am told to delegate.
- The deadline is close; we do not have the luxury of practicing decision-making.
- Team members themselves do not want to make decisions. Is delegation necessarily considerate?

&emsp;Anyone in a leadership position thinks this way at least once. However, it is important to recognize that **“delegation” is an investment in team members, and any investment requires capital**. Because responsibility remains with the leader, mechanisms to minimize the damage of failure should come first. A close deadline may be a reason to break the scope of delegation into stages, but it is not a reason to never delegate. And team members do not want to decide because they have never had the experience of deciding.
&emsp;We will explain the substance of these three answers, beginning with what leader dependency tends to look like.

## Anti-Patterns of Leader Dependency

&emsp;Teams where the leader decides everything tend to exhibit several anti-patterns. Both leaders and team members should recognize some of these.

**Pattern 1: Well-Intentioned Dictatorship**—This is the most common and the hardest pattern to notice. The leader can make decisions faster and more accurately than anyone else, so they decide. There is no ill intent; in fact, they feel that they are protecting the team. The closer the deadline, the more correct this seems, and opportunities to delegate are passed over with the justification, “This time, we are in a hurry.” And it does not happen only once. It happens almost every time. The team described in the opening question is probably this type.

**Pattern 2: The Rallying-Cry Approach**—This is the approach of suddenly letting go of everything one day, saying, “Starting today, we are going self-organizing. Decide things yourselves.” Team members with no experience of deciding cannot make decisions; even when they do, they fail; and a few weeks later, the leader returns saying, “I guess I have to do it myself after all.” This backlash leaves the organization with the conclusion that “self-organization is impossible for us.”

**Pattern 3: Answering First**—This is the approach where the leader voices an opinion first in a meeting. The leader may think, “I only stated my opinion,” but the moment they do, all other proposals die. It is not that team members are unwilling to decide; the leader’s answer has simply appeared before they can decide. Leaders with absolutely no intention of being dictatorial are the least likely to notice this pattern.

![Figure 2: Anti-patterns of leader dependency—well-intentioned dictatorship, rallying cries, and answering first](/img/blogs/2026/1127_15_self_organization_leader_decides/fig15_02.webp)

## The Assumption of Two Choices

&emsp;These three patterns may appear to be separate problems, but they come from the same source: the assumption that **“delegation is a binary choice: either delegate or do not delegate.”** If there are only two choices, then while you cannot delegate, you make all the decisions yourself (well-intentioned dictatorship); once you decide to delegate, you let go of everything (the rallying-cry approach); and if you merely state an opinion, that counts as delegation (answering first). These three patterns are all the possible answers within that binary choice.

&emsp;In the Agile world, it is important to **unravel assumptions** like this “binary choice.” Now, let us return to the three questions.

&emsp;First, **the point that you are being told to delegate even though responsibility remains with the leader**. That is correct. Which is precisely why you should first create a structure in which the damage remains small even if failure occurs. When the leader decides, it is always correct in the short term. Decisions are fast, accuracy is high, and rework is limited (we want such people to become leaders). On the other hand, delegating to team members is always a short-term cost. It takes time, mistakes occur, and in the end the leader must catch them during review...
&emsp;**“Delegation” is an investment that buys long-term capability in exchange for short-term losses**. And investments require capital: room to absorb failure, time to wait, and agreement that “failure is part of learning.” In teams without these, the investment in delegation is passed over every time, and the vicious cycle becomes entrenched.
&emsp;The answer is to **create this capital first**.

&emsp;Next, **the point that there is no time to practice when the deadline is near**. It is true that there is no extra time. However, is that not because you are thinking in terms of delegating everything? If you break down what needs to be decided, you can start by delegating small decisions that will not affect the deadline. You may not be able to delegate the choice of a library, but perhaps you can delegate the decision of whether a review passes. If you break the scope of delegation into stages, a close deadline may be a reason to say, “For now, only up to here,” but it cannot be a reason to say, “Never delegate.”

&emsp;And then, **the point that team members do not want to decide**. If they have never had the experience of deciding, it is only natural that they do not want to do so. In a team where opportunities for judgment have always been swallowed up by the leader’s remarks, it would be stranger if people raised their hands when told, “Please decide.” Not wanting to decide is not a matter of personality; it is the team’s history, and history can be rewritten through small successes.

&emsp;Finally, **why do we come to think only in terms of a binary choice?** Because a system in which “a highly capable individual takes the lead in making decisions” is the inevitable byproduct of small successes. At startup, a team moves quickly through the immediate decisions of a reliable individual. That success experience deepens dependence on the leader, but by the time the team grows, that dependence has become an obstacle to growth. At that point, the organization knows only one form—“the leader decides”—and can imagine only “not deciding” as its opposite. No one has done anything wrong. No one simply showed them that there are stages in between.

&emsp;So how should genuine self-organization proceed? Rearranged according to transparency, inspection, and adaptation, it looks like this.
&emsp;**Transparency**—There is a list of the “things to decide” that arise daily within the team, and it is visible who is currently making each decision and at what level.
&emsp;**Inspection**—Reviewing what happened with delegated decisions without blaming anyone. Was the damage caused by failure within an acceptable range? Can the level be raised next time?
&emsp;**Adaptation**—Moving the level of delegation one step at a time for each decision. Raise it if things go well; step it back one level if the failure is significant.

&emsp;When viewed through these three layers, you can see where the rallying-cry approach fails. Without a list of decisions (transparency), it moves everything to the highest level at once, then returns things to the way they were without inspecting failures. Rather than “delegate or do not delegate,” it should be “move each decision through levels step by step”—this replacement is what it means to design delegation. This shift is the starting point for the prescription below.

## Prescription

&emsp;There are various delegation frameworks besides the one introduced below. However, merely saying, “We have decided on levels,” only changes the sign on the rallying-cry approach. After trying it, verify whether the number of decisions made by people other than the leader has increased and whether the leader’s exhaustion has decreased.

**First, take inventory of decisions**
&emsp;Before applying any prescription, write down the current state. Break down the large term “self-organization” into a list of concrete decisions. Task assignment, implementation approach selection, library adoption, release decisions, review pass/fail decisions, response priority during incidents... Write down the “things to decide” that arise in the team every day, and note who currently makes each one. When the discussion changes from “the leader’s attitude” to “who makes this decision,” you are already halfway to success. You can create this list today without anyone’s approval.

**Agree on seven levels of delegation**
&emsp;In the “Delegation Poker” practice advocated by Jurgen Appelo in his book 『Management 3.0』, delegation is expressed in seven levels.

1. Tell (the leader decides and informs others)
2. Sell (explain the reasons for the decision)
3. Consult (hear opinions, then the leader decides)
4. Agree (everyone decides together)
5. Advise (the leader advises, and team members decide)
6. Inquire (ask after team members have decided)
7. Delegate (leave it entirely to them)

&emsp;For each inventoried decision, have the leader and team members agree on “what level are we at now?” and “what level will we move to by the next quarter?” By progressing in stages, such as “task assignment is currently at level 3; next, move it to level 5,” you can avoid the typical backlash pattern of “delegate everything and collapse.”

**The leader’s new job is to “speak last”**
&emsp;If I were to recommend one concrete behavioral change for leaders during the transition to delegation, it would be this: do not state your opinion first in meetings. Ask questions, let team members fully put forward their proposals, and state your own opinion last. If you feel something is missing, that is a sign of success. That sense of something missing is precisely the amount of decision-making opportunity that team members had previously lost to the leader’s remarks. This is the least expensive prescription for escaping the answering-first pattern.

**Reduce the cost of failure through technology**
&emsp;The countermeasure for “delegating leads to failure” is not to watch over people so they do not fail; it is to create a structure in which the damage remains small even when failure occurs. Release in small units, make it possible to roll back immediately with feature flags (a mechanism that switches features on and off through configuration and enables immediate rollback when problems arise), and establish a safety net of reviews and tests. The lower the price of failure, the wider the scope that can be delegated. In addition, explicitly agreeing in advance on “what level of failure is acceptable” makes a completely different atmosphere when failure actually occurs.
&emsp;**The speed of delegation is, in fact, determined by the speed at which you build technical safety nets**.

![Figure 3: Delegation is not zero or one—one step at a time for each decision](/img/blogs/2026/1127_15_self_organization_leader_decides/fig15_03.webp)

## Why Has This Question Been Repeated for 30 Years?

&emsp;The pattern in which small successes deepen dependence on the leader is replayed regardless of industry or era. The fact that the leader themselves is exhausted is actually an opportunity. The person paying the greatest cost to sustain the vicious cycle is the leader, and the realization that “I cannot keep this up” becomes a stronger motivation for change than any sound argument.

&emsp;Self-organization does not mean that leaders become unnecessary. It means that the leader’s work shifts from “making decisions” to “creating a team that can make decisions.” And this transition progresses only when the courage of the person letting go of authority and the stretching effort of the people taking it on align step by step. What pushes that process forward is not a rallying cry, but the design of safety nets.
&emsp;Whether there is a list of decisions and whether there are decisions whose level has risen by one this quarter—these are indicators of whether this team’s self-organization is progressing.

---


*Next time: “The PO Will Not Prioritize Repaying Technical Debt (Plus a Bonus: Why Test Automation Has Not Spread in Japan)”*

:::info
The Agile FAQ series index is available here 🫱 [Agile FAQ](/agile/#アジャイルfaq)
[Previous article 👈 【Agile FAQ #14】What Does a Scrum Master Do? They Look Like They Have Nothing to Do (Plus a Bonus: Will AI Replace SMs?)](/blogs/2026/11/20/14_what_does_scrum_master_do/)
:::
