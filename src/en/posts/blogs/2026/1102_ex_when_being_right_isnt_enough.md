---
title: >-
  【Agile FAQ Special Edition】When Being Right Isn’t Enough… A Survival Strategy
  for When Clients or Management Won’t Listen
author: tomohiro-fujii
date: 2026-11-02T00:00:00.000Z
tags:
  - スクラム
  - アジャイル
  - アジャイル開発
translate: true

---

&emsp;Thank you for reading this article. I am Tomohiro Fujii, a member of the Agile Group. This time as well, I bring you an unannounced special edition.
&emsp;At the end of Part 8, I wrote that “how to fight in an environment where the stakeholder side simply will not budge” would also be covered somewhere in this series someday. This is that “someday.”

&emsp;That said, this is also a rather blunt story of: “You can’t do Agile because management does not understand? Stop complaining and just do it.”

## Question

&emsp;The prescriptions in this series are helpful, but many of them ultimately lead to “negotiate with the client side” or “raise the issue with the organization.” Frankly, our client side and management have no intention of listening. The conversation ends with things like, “Do it as you always have,” “So, how many person-days?” or “Agile? We do not need trendy stuff.” In an environment where sound arguments do not get through—I will not say every argument is sound, but many of them seem so to me—is Agile ultimately impossible?

## Answer

&emsp;It is not impossible. However, you need to change the order. If you read the prescriptions in this series as “win the negotiation first, then put them into practice,” you have it backward. First, do what you can put into practice, build a track record, and then negotiate using that track record. **Negotiation is not the first hurdle; it is the final finishing touch.**
&emsp;And I want you to remember that, among the prescriptions in this series, **there are surprisingly many that require no one’s permission**.

![Figure 1: Negotiation is not the first hurdle; it is the final finishing touch](/img/blogs/2026/1102_ex_when_being_right_isnt_enough/figex_01.webp)

## First, break down why the other side “will not listen”

&emsp;Before getting into the frustrating part, take a moment to observe the other side calmly. Those who are unwilling to listen usually have structural reasons as well.

- **A proposal with no track record looks like nothing but risk**: Agile may seem like a rational proposal to you, but to them, it is a demand that says, “Bet your own responsibility on a method you do not know well.” From that person’s position, refusing is actually a sincere judgment.
- **An evaluation structure in which not changing is the optimal solution**: In organizations where nobody is penalized for maintaining the status quo, a proposal for change becomes an asymmetric gamble: “If it succeeds, that is only expected; if it fails, it is the proposer’s fault.”
- **They have failed before with a “trendy buzzword”**: Organizations that were burned by some other three-letter acronym years ago become defensive just from seeing the label.

&emsp;In other words, the other side is often not opposing your logic; they are opposing the uncertainty contained in your proposal. If that is the case, the answer is not “explain it more correctly.” It is to reduce uncertainty—in other words, to build a small track record. In Part 5, I wrote that pushing with sound arguments can look to the other person like “forcing what ought to be done on us,” and can instead make them hit the brakes. If you are stuck at “I explained it correctly, but it did not get through,” then you are caught in the same trap.

![Figure 2: What the other side opposes is not the logic, but the uncertainty contained in the proposal](/img/blogs/2026/1102_ex_when_being_right_isnt_enough/figex_02.webp)

## Survival strategy

&emsp;This time, these are not the usual “prescriptions.” They are **principles**.

**First principle: Start with areas that require no permission**
&emsp;Try sorting the prescriptions in this series again according to whether they “require permission.” Recording interruptions (Part 12), checking the previous Try at the beginning of a retrospective (Part 7), walking the board from the right edge (Part 6), and items planned for future installments, such as reviewing decisions, recording enhancement lead times, and writing ten lines of an ADR (a record of decisions)... None of these require anyone’s permission. Improvements that can be completed within the team, as well as recording and measurement, can begin today.
&emsp;To add a caveat so that this does not become an extreme argument: the handling of documents required by audits or contracts is outside your discretion. Likewise, if you change the development process itself for a project subject to internal development standards, that is something to be handled through the procedure for exempting the project from those standards; it is not an “area that requires no permission.”
&emsp;Take another calm look. “We cannot do anything because management will not act” is usually not true.

**Second principle: Build the track record first, negotiate afterward**
&emsp;Start small, then go talk once you have numbers. Do not say, “Please let us adopt Agile.” Instead, say, “Over the past three months, we recorded interruptions and found that they consumed 40% of our capacity. Starting next month, please let us consolidate intake through a single channel.” The former becomes a **discussion of ideology**, while the latter becomes a **discussion of facts**. Ideology can be rejected based on preference, but facts are harder to reject. This series has repeatedly said, “Measure first,” because measurement is not only a tool for improvement; it is also **the source of negotiating power for those without authority**.

**Third principle: Take down the signboard and get the substance through**
&emsp;If the words “Scrum” and “Agile” close the door, then simply do not use those words. (To be honest, I have a prejudice that “the less capable someone is, the more they put the name of a methodology front and center.”) Instead of calling it a sprint, say, “We will hold a review meeting every two weeks.” Instead of calling it a retrospective, say, “This is our monthly business improvement meeting.” Instead of calling it a backlog, say, “This is a prioritized list of issues.” By the time the substance is in motion and results begin to appear, the name no longer matters. Practice the substance rather than being loyal to the signboard.
&emsp;To avoid misunderstanding, this is not about quietly bypassing prescribed procedures. It simply means adapting the terminology to the other person’s language, within the scope of discretion granted to you. Therefore...

- Tell your direct manager that you are operating under different terminology.
- If the development methodology is explicitly stated in proposals or contracts, first confirm consistency with that wording.
- If you are required to report using deliverable names from development standards, prepare a one-page mapping between those names and the terms used by the team.

&emsp;If you neglect these three points, it becomes indistinguishable from bypassing the process. In fact, **whether you can explain it without using the names is also a test of whether you understand the substance yourself**.

**Fourth principle: Record failed negotiations and use them as ammunition for another attempt**
&emsp;If a proposal is rejected, calmly record the fact that it was rejected and what happened afterward—whether the risk you predicted actually occurred. Keep the record not in personal notes, but in an official place such as the team’s issue management table or impediment list (an official record listing obstacles facing the team). Do not inject emotion or turn it into a grievance; record only the facts. “In April, we proposed consolidating intake through a single channel, but the proposal was deferred. From May through July, interruptions averaged ◯ cases per month, of which ◯ directly resulted in delivery delays.” Once you have accumulated two or three such records, the probability that the same proposal will be accepted changes significantly.
&emsp;Organizations often reject the first proposal but yield to an accumulation of facts. As a survival strategy on the organization’s side, that is rational. Prepare with that in mind.

**Fifth principle: If they still will not move, invest in assets you can take with you**
&emsp;Unfortunately, organizations that will not change even after you have exhausted every option do exist. At such times, I want you to remember that the practices described so far—habits of measurement, discipline in record-keeping, the skill of completing work in small increments, and the language to explain the essence without relying on labels—are all assets that accumulate in you and your team. They will continue to build up if you remain in the organization, and you can take them with you to any environment. Even if you cannot change the organization, your own capabilities and market value will certainly change.
&emsp;This is not a recommendation to change jobs; it is about choosing where to invest. **You cannot control whether the organization will move, but you can control what you learn**.

## Why has this situation repeated for 30 years?

&emsp;Because the very structure of people without authority trying to change an organization from the field is the history of software development itself. Think back: Agile was not a methodology born from top-down direction by management. It was a grassroots movement in which practitioners struggling under heavyweight processes started small without authority, brought together their track records, gave them words, and eventually moved the industry.

&emsp;In other words, “starting small despite standing before people who will not listen” is not an exceptional situation for Agile; it is what Agile looked like at birth. The place where you are now is the same place where those before you stood 30 years ago—or even earlier. And their weapons were the same as yours are now.
&emsp;Small practices, and recorded facts.
&emsp;That should be enough to begin.

![Figure 3: Small practices and recorded facts—the five principles](/img/blogs/2026/1102_ex_when_being_right_isnt_enough/figex_03.webp)

---


*Next time: “The PO is too busy to come to the team” / For the list of installments in the main series, see Part 1.*
