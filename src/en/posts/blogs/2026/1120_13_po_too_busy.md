---
title: 【Agile FAQ, Part 13】The PO Is Too Busy to Come to the Team
author: tomohiro-fujii
date: 2026-11-20T00:00:00.000Z
tags:
  - アジャイル開発
  - スクラム
  - アジャイル
translate: true

---

&emsp;Thank you for reading this article. I am Tomohiro Fujii, a member of the Agile Group.
&emsp;We have taken quite a few detours (or perhaps gotten lost?), but from this installment, let us return to the main path.
&emsp;This time, we will cover the Product Owner (PO), and next time, the Scrum Master (SM). Questions about both roles arise because the textbook role differs from what is seen in the field—but the nature of those differences is the reverse of each other.

:::info
The Agile FAQ series index is here 🫱 [Agile FAQ](/agile/#アジャイルfaq)
[Previous article 👈 【Agile FAQ, Part 12】No More Being Thrown Around by Interruptions! An FAQ on “How to Protect Your Plans” in Agile Teams?](/blogs/2026/10/30/12_planning_interrupt_work/)
[Next article 👉 【Agile FAQ, Part 14】What Does a Scrum Master Do? They Look Like They Have Nothing to Do (Plus: Will AI Replace SMs?)](/blogs/2026/11/20/14_what_does_scrum_master_do/)
:::

## Question

&emsp;Our Product Owner is also responsible for other work and hardly ever comes to the team. Refinement is conducted by developers alone, replies to questions take several days, and acceptance confirmation is rushed through all at once on the final day of the Sprint. There is an atmosphere of “the PO is busy, so it cannot be helped,” but is it really okay to continue like this?

## Answer

&emsp;No, it is not. However, this kind of question invariably comes with three related doubts.

- It is true that they are busy. Is there any point in blaming the PO?
- Developers handle both refinement and acceptance. If it is working, what is the problem?
- Developers have no authority to change how the PO works. Is there anything they can do?

&emsp;An important premise is that, in many cases, the individual PO is not the one to blame. A situation where the PO cannot come to the team is usually the result of the organization treating the PO role as “light work that can be handled alongside other duties,” or merely as a conduit for user requests. More broadly, it may also reflect the fact that quite a few people still see Agile as nothing more than “ingenuity on the part of developers.” If things appear to be working anyway, it is because developers are filling in the **decision-making gaps created by the PO's absence** through guesswork. When those guesses are wrong, the cost is **paid later in the form of rework**.
&emsp;Even in such a situation, there are things developers can do. Break down the PO's work, and reduce waiting time through delegation and scheduled appointments. For what remains unresolved even after that, escalate it—with records attached—not as an issue of insufficient developer effort, but as an organizational decision-making issue.
&emsp;The key points boil down to two things: “do not treat the PO's work as one indivisible lump,” and “make the cost of waiting visible in numbers.”

![Figure 1: When PO work is treated as one indivisible lump, a long line forms at a single service window](/img/blogs/2026/1120_13_po_too_busy/fig13_01.webp)

## When You Hear the Textbook Phrase “The PO Should Be Dedicated,” Don't You Think, “That’s Impossible”?

&emsp;“The PO is one person accountable for the product, and ideally should be dedicated to it”—some of you may have heard this in training and then pictured the people at your own company. The questions that come to mind are probably something like these (or perhaps they are not questions, but resignation).

- At our company, it is not realistic to assign someone from the business department to the development team full time.
- If we cannot move forward without asking the PO about everything, perhaps Scrum itself does not fit the reality of our work.
- Even if we tell management that “the PO does not come,” will it not simply end with “work something out”?

&emsp;These are reasonable doubts. To state the point first: what matters is **not whether the PO is dedicated, but whether decisions are made**. Many—probably most—organizations cannot make the PO role dedicated, but there are ways to shorten the decision-making queue. The reason you cannot move forward without asking about everything is that the PO's work has not been broken down.
&emsp;And speaking to management should not be a complaint; it should be presented as an investment decision backed by figures for the losses involved (data is a negotiating tool for those without power, remember?).

&emsp;Of course, that is only a summary. It will make the explanation that follows easier to understand if we first look at what PO absence tends to look like.

## Anti-Patterns of PO Absence

&emsp;Teams whose PO does not come tend to exhibit several anti-patterns. Read on while thinking about your own team's PO.

**Pattern 1: Last-Minute Acceptance**—This is the most common pattern in consultations. During the Sprint, questions receive no response for a long time, then the PO comes on the final day and processes all acceptance confirmations at once. The situation described at the beginning is exactly this pattern. Specification questions, priority decisions, and acceptance confirmation—all of them line up at the single window called the PO. Because that window does not open, the line grows longer, resulting in a small-scale breakdown that is processed all at once just before the deadline.

**Pattern 2: Guesswork Development**—Unable to wait for answers from the PO, developers proceed based on “it is probably like this.” Most guesses are correct, but the incorrect ones come back late in the Sprint as “that is not what I meant.” It may look like things are moving along, but rework has become routine.

**Pattern 3: Relay Point**—A PO representative, or proxy PO, has been appointed, but decision-making authority is unclear. What the proxy PO decides is later overturned by the actual PO. Developers face a double queue: “ask the proxy, then wait for confirmation from the PO,” which can actually increase waiting time.

**Pattern 4: Delivery Inspection**—This pattern is likely to occur in business-system environments. The PO behaves as the “client” and understands involvement with developers to mean “checking what has been completed.” They do not attend refinement because they consider it “the development side's job.” This is the manifestation, in the behavior of a single PO, of the “internal outsourcing” structure discussed in Part 8—a hierarchical relationship in which the business department treats the IT department like a contractor.

![Figure 2: Anti-patterns of PO absence—last-minute acceptance, guesswork development, relay point, and delivery inspection](/img/blogs/2026/1120_13_po_too_busy/fig13_02.webp)

## What Lies Beneath the Idea of “Getting Them to Come”

&emsp;The same assumption lies beneath all four patterns: **“The PO's job is to check what has been made and make decisions.”** If checking and deciding are the job, the PO only needs to come at the end (last-minute acceptance); developers can fill in the middle through guesswork (guesswork development); a representative only needs to perform the checking on their behalf (relay point); and involvement comes to mean inspection upon delivery (delivery inspection). The four patterns are the result of this assumption becoming entrenched in the organization.

&emsp;Once this assumption becomes visible, the answers to the three doubts also look different.

&emsp;First, **the point that it is not realistic to assign someone from the business department full time**. That is true; most organizations cannot do it. However, not being able to make the role dedicated and not receiving decisions are separate problems. If we break down the PO's work, it looks something like this:

- Product direction: Vision, investment decisions, and negotiation with stakeholders (this is also the role I referred to in Part 9 when I wrote that “interpreting” the language of people outside the team is originally the PO's or manager's job)
- Prioritization: Determining the order of the backlog
- Elaboration: Specifying individual PBIs and their acceptance criteria
- Acceptance: Confirming completed work

&emsp;Of these four, only the first two can truly be done only by the PO. If direction and decision criteria are shared, developers can prepare proposals for elaboration and have the PO confirm them. The same applies to acceptance: just as I wrote in Part 8 that “inspection should be completed before the meeting,” if acceptance criteria are explicitly defined in advance, developers can perform the initial confirmation for most items. In other words, this is a shift from a structure where “everything is asked of the PO” to one where “developers prepare proposals and the PO only makes decisions.” The PO's required time becomes a fraction of what it was, and developers' waiting time disappears. The busier the PO, the more incentive they have to cooperate with this shift. Even if the role cannot be dedicated, decisions can still be made available.

&emsp;Next, **if we cannot move forward without asking the PO about everything, does that mean Scrum does not fit reality?** For better or worse, Scrum taught in training tends to be textbook-oriented (though fundamentals matter, whatever you do). By that standard, not having a dedicated PO is not ideal, but it would be premature to conclude from that alone that “Scrum is not a fit.” You can adjust to the reality of the situation by changing how PO work is divided. The queue becomes a single line because “asking the PO” is treated uniformly for everything from specification details to prioritization. If you separate work by the type of decision involved, the queue for the PO becomes shorter, and the rest can be handled among the developers.

&emsp;And then there is the concern, **will it not just end with “work something out” even if we speak to management?** If you say “the PO does not come,” it will. If you say “we spend X hours per month waiting for PO answers, with Y rework items,” the conversation changes. The need to make the PO dedicated or replace them is not a complaint within the team; it is an agenda item for an organizational investment decision. To make it an agenda item, you need numbers.

&emsp;**Why does the view of the PO as “the person who checks and decides” become entrenched in organizations?** For many organizations, the idea of assigning a dedicated decision-maker to a development team still runs counter to intuition. “We increase the number of people building things, but the people making decisions can handle it as a side job”—this judgment stems from the fact that the Agile dynamic in which delays in decision-making directly cause delays in development is difficult for upper management to experience firsthand. There are also practical reasons why a decision-maker cannot be taken out of the business department, such as a lack of staff in that department. The hierarchical “internal outsourcing” relationship further accelerates this. Just as no company would permanently station its own decision-maker at a contractor, the idea of assigning someone from one's own department to a team treated as an “outsourcer” does not arise.

&emsp;So how should a PO actually be involved? Put the materials and criteria for decisions in place first, and make the decisions themselves quick—when divided into transparency, inspection, and adaptation, it looks like this.
&emsp;**Transparency**—The product direction and decision criteria are made visible to developers, rather than existing only in the PO's head. A Product Goal—one sentence describing the next state the product should reach—or notes on value criteria provide the container for this.
&emsp;**Inspection**—The PO evaluates proposals or provisional decisions made by developers against those criteria. This is not “consultation”; it is “approval.”
&emsp;**Adaptation**—The ordering and content of the backlog are updated based on the results of inspection. If a decision is overturned, the reason should also be added to the criteria.

&emsp;Viewed through these three elements, the problem with the last-minute acceptance pattern becomes clear. Because decision criteria are not transparent, developers cannot prepare proposals to bring to inspection, and they must stop until the PO comes. Reconfigure the interaction from “the PO comes and checks” to “criteria are established, developers prepare proposals, and the PO decides in a short amount of time.” Once this shift occurs, half the remedy is already in place.

## Remedies

&emsp;The form of delegation and the frequency of appointments may differ from workplace to workplace. The pitfall is being satisfied simply because you have added recurring meetings with the PO. If developers do not bring proposals and options, and there are no decision criteria, then the meetings merely increase the number of times per week that you “check everything together” to twice. The last-minute acceptance pattern has only been divided into smaller batches. After trying these measures, evaluate them by whether time spent waiting for PO answers and the number of rework items have decreased.

**First, record queues and rework**
&emsp;Before taking action, quantify the losses. Record, one line at a time, the date a question was sent to the PO and the date an answer arrived, as well as the number and reasons for items returned during acceptance. For example, if each person on a team of six developers spends two hours per week waiting for PO answers, waiting time alone amounts to around 50 hours per month—roughly 0.3 person-months. Add rework and rebuilding features that miss the mark, and the total can reach the scale of one dedicated PO. The salary cost of a dedicated PO appears in the budget, but these losses appear as line items in no ledger. If you do not record them, they remain invisible. Once they become visible—or, in other words, once you can show what will improve and by how much—the remedies that follow become easier to negotiate.

**Make the PO's time “reserved seats”**
&emsp;Stop asking, “Do you have time right now?” on an ad hoc basis, and establish fixed recurring slots. For example, two 30-minute weekly slots for questions and acceptance, plus one hour of refinement every other week. The busier someone is, the less able they are to respond to unplanned interruptions, while still being able to honor fixed appointments. It is not enough merely to create the slots; you need to design what happens in them. Within the slot, developers present proposals and options, and the PO chooses. By making it a place for “approval” rather than “consultation,” the density of those 30 minutes increases dramatically. These reserved seats depend on preparation by both sides. Developers bring the decision-making materials to the meeting, while the PO keeps the appointment and records the reason when overturning a decision later. Only with this mutual commitment can you achieve a process that “works in a short amount of time.”
&emsp;You can also make this “preparation before bringing something to the meeting” a team rule. This is the so-called “Definition of Ready”—an explicit statement of what must be in place before work begins on a PBI, such as its objective, acceptance criteria, and options requiring a decision. The Scrum Guide only includes a “Definition of Done”; it does not include a Definition of Ready, and there is criticism that increasing gates stops the flow.
&emsp;However, for teams that cannot secure enough PO time, defining the state in which an item can be brought to a reserved seat is the most reliable way to make those 30 minutes a place for approval. And as seen in the previous section, if acceptance criteria are explicitly documented in advance, developers can perform the initial acceptance confirmation—that is also an indication that the Definition of Done is functioning. Preparation for reserved seats becomes a mechanism that puts the Definition of Ready and Definition of Done to work in a workplace where the PO is absent.

**Have decision criteria documented**
&emsp;Have the PO articulate the decision criteria—what matters in this product and what should take priority when there is uncertainty—so that provisional prioritization decisions can be made even when the PO is absent. Simply having a Product Goal or brief notes on value criteria enables developers to estimate “how would the PO decide?” and move forward provisionally, then compare answers at the reserved appointment. With these decision criteria, even the “intake gate” from Part 12 can have a rotating team member make an initial assessment without a PO being permanently present. The difference from the guesswork development pattern is that the basis for the estimate exists in writing, and a place for checking the answer has been established.

**If you appoint a proxy PO, document their decision-making authority**
&emsp;Appointing a PO representative is also an option, but it has pros and cons. If it works well, it eliminates the queue, but a proxy whose decision-making authority is unclear falls into the relay point pattern. If you appoint one, draw a written boundary between “what the proxy may decide” and “what remains with the actual PO,” and observe how often decisions are overturned. If they are overturned frequently, that is a sign the boundary is not working.

**Escalate what cannot be filled**
&emsp;If, even after improvements through delegation and appointments, product direction and prioritization—the two things only the PO can do—remain hollow, then the issue exceeds the scope of developer effort. Have the Scrum Master formally raise the fact that the product effectively has no decision-maker to the organization, attaching the waiting-time and rework figures recorded at the beginning. (If the PO is on the customer side in contract work, this should be raised as a staffing issue through the responsible contact on the ordering side.) It is not uncommon for teams to continue for years while leaving this point ambiguous. I covered survival strategies for cases where the organization still does not act after escalation in the special edition, “When the Right Argument Does Not Get Through.”

![Figure 3: Make the PO's time “reserved seats”—developers bring proposals, and the PO approves](/img/blogs/2026/1120_13_po_too_busy/fig13_03.webp)


## Why Has This Question Been Repeated for 30 Years?

&emsp;The losses caused by PO absence—waiting time, rework, and features that miss the mark—do not appear on the books, as we saw in the remedies section. Ironically, these losses usually cost more than the salary of one dedicated PO. Yet because they are invisible, the same decision is repeated from organization to organization and generation to generation.

&emsp;That is precisely why the greatest contribution developers can make is to record queues and rework, turning invisible losses into visible figures. From time to time, check whether the PO's decision criteria are visible to developers, whether waiting time is being recorded, and whether decisions are being made in reserved appointments. This is the measure of whether product decision-making is functioning in your team.

---

:::info
The Agile FAQ series index is here 🫱 [Agile FAQ](/agile/#アジャイルfaq)
[Previous article 👈 【Agile FAQ, Part 12】No More Being Thrown Around by Interruptions! An FAQ on “How to Protect Your Plans” in Agile Teams?](/blogs/2026/10/30/12_planning_interrupt_work/)
[Next article 👉 【Agile FAQ, Part 14】What Does a Scrum Master Do? They Look Like They Have Nothing to Do (Plus: Will AI Replace SMs?)](/blogs/2026/11/20/14_what_does_scrum_master_do/)
:::
