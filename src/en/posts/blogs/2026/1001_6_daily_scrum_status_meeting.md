---
title: '[Agile FAQ #6] The Daily Scrum Has Become a Progress Reporting Meeting'
author: tomohiro-fujii
date: 2026-10-01T00:00:00.000Z
tags:
  - スクラム
  - アジャイル
  - アジャイル開発
translate: true

---

&emsp;Thank you for reading this article. I’m Tomohiro Fujii from the Agile Group.  
&emsp;You may have been surprised by parts 3–5, as they felt like quite a curveball for a series explaining the basics of agile. However, since these questions come up so often as FAQs, I hope you’ll look back and think, “Oh, so that’s what this series was about.”  
&emsp;In part 6, I’d like to return to the fundamental basics.

## Question

&emsp;We hold a 15-minute Daily Scrum every morning, but it’s become just a meeting where everyone takes turns reporting “what I did yesterday, what I’ll do today, and any blockers” (the three questions we learned in training) and then it’s over. Honestly, no one listens to anyone else’s report. What’s more, as soon as the meeting ends, real discussions break out all over the place. Is there any point to this “ritual” of the Daily Scrum?

## Answer

&emsp;“Real discussions start right after it ends” …this single sentence in the question holds a clue to the answer.  
&emsp;Every morning, the team has things that need to be discussed:

- Who is stuck where,
- Who needs whose help,
- What should be finished first

&emsp;This is the “replanning of today’s activities” aimed at achieving the Sprint Goal. Because it naturally happens after the meeting, we can say that this team clearly recognizes the issues that need discussion and has the relationships necessary to discuss them (to the questioner: this is actually a good sign). What’s missing is the connection between those post-meeting discussions and the “15 minutes.” The round-robin reports end without surfacing who should do what with whom today, and the real conversations start spontaneously between whoever happens to be sitting next to each other and notices the issue first. It’s not that the 15 minutes are unnecessary, but that the Daily Scrum **is not functioning as a mechanism to generate those post-meeting discussions**.

&emsp;Therefore, before you decide to stop doing the Daily Scrum, fix the structure that turns it into a status meeting. The key lies in two things: “who you are speaking to” and “what you decide in these 15 minutes.”

![Figure 1: Real discussions start immediately after the meeting](/img/blogs/2026/1001_6_daily_scrum_status_meeting/fig06_01.webp)

## Have You Ever Wondered When You Were Told, "Keep It to 15 Minutes"?

&emsp;By the way, many of you have probably been taught in training or on the job, “Keep the Daily Scrum to 15 minutes” and “Don’t turn it into a progress report.” At that time, didn’t you have questions like these?

- Sharing progress is surely important in itself, so why is it criticized if that’s all the meeting does?  
- To begin with, what can actually be done in 15 minutes?  
- If the information is necessary for everyone, isn’t it more important to share it even if it takes 30 minutes?

&emsp;I thought the same things. To give you the answer upfront: **it’s not that sharing is bad, it’s that you’re only sharing and nothing else.** Fifteen minutes is too short for pure information sharing, but it’s enough to decide today’s actions. And the information truly needed by everyone isn’t as much as we think—this alone may not convince you, so first let’s look at how Daily Scrums tend to take shape, and then I’ll give you a thorough answer.

## Common Pitfalls in the Daily Scrum

&emsp;When the Daily Scrum turns into a status meeting, it usually follows one of several patterns. Read through these and see which one most closely matches your team.

&emsp;**Pattern 1: Status Meeting Style** — the most common pattern. The speaker’s gaze is directed not at teammates but at the Scrum Master or team lead. You talk in order, and until it’s your turn you just wait. This is exactly the situation described in the opening question.

&emsp;**Pattern 2: Customer Reporting Style** — common in business environments. You see this when the client’s representative or a manager at director level stops by the Daily Scrum “to check in.” While it’s good that they’re interested, from that moment on the Daily Scrum turns into a “progress report for the customer.” Team members speak to the client, the leader smooths things over, and any problems are downplayed. In some cases, there might even be a “light rehearsal” beforehand to decide what to say during the Daily. In this situation, the dynamic we saw in part 3—where the customer and vendor sides stop thinking when facing each other—is reenacted every morning.

&emsp;**Pattern 3: External Commitments Style** — in support and maintenance teams, it’s common to have members splitting their time with other projects or operations. If left unchecked, a multi-assigned member’s Daily Scrum report becomes a rundown of their entire day: “This morning I handled an incident on another project, and this afternoon I have meetings….” Although they’re speaking honestly, it gives the team no material for replanning.

&emsp;**Pattern 4: Daily Report Style** — often seen in remote teams that handle the Daily Scrum by posting to a chat. Each person writes “yesterday, today, blockers” and it’s done. While having a record is not bad, no one reads it, no one responds, and writing becomes the goal. It’s a report with no audience—a daily report, representing the ultimate form of status meeting.

&emsp;**Pattern 5: Overtime Style** — another pattern teams fall into when status reporting takes over. Discussions start during the meeting, and the 15 minutes extend to 30, 40 minutes, and so on. While holding discussions is progress compared to a simple status meeting, the time the whole team spends listening to conversations relevant only to some members accumulates every morning.

## What Is the Fundamental Misunderstanding?

&emsp;These five patterns look different on the surface, but they share a common fundamental misunderstanding: the assumption that “the Daily Scrum is a place to share information.” If you adopt this assumption, then once the sharing is done the meeting is successful; if it takes too long, just extend it; if more people want to share, let them join. All these decisions naturally follow. The five patterns are simply the result of carrying out this assumption to its logical conclusion.

&emsp;Now, let’s consider the three questions we posed at the beginning when you’re told, “keep it to 15 minutes.”

&emsp;First, **what’s wrong with ending the meeting with sharing only?** The act of sharing progress itself is important and not bad. The problem is the means. Having people speak out in turn to share is the most expensive way to share information. If it’s eight people for 15 minutes, that’s two hours of effort every morning. And status-meeting style sharing tends to skew toward “everything’s fine,” so the quality of information suffers. **If you want to share information, a task board and a burndown chart are cheaper, more accurate, and always available.** In other words, a status-meeting style Daily Scrum spends time doing what a board can do better and does nothing of what only a meeting can do—make decisions. It’s not that sharing is bad, but that you’re doing **nothing but** sharing.

&emsp;Next, **what can you really do in 15 minutes, and wouldn’t it be more important to have everyone share even if it takes 30 minutes?** Fifteen minutes is too short for information sharing, but it’s enough to decide how to move today. You check how far you are from the goal, identify the single riskiest item, and decide who will talk to whom afterward. It’s not a briefing, but **triage time.** And yes, if information is truly needed by everyone, you should share it even if it takes 30 minutes. However, when you measure on the ground, the information everyone needs is about as much as the distance to the goal; the vast majority of it is information needed by only 2–3 people. The reality of a 30-minute Daily Scrum is that it’s time where the whole team listens to conversations relevant only to a few. The Daily Scrum should be designed so that only things concerning everyone are discussed by everyone, and the rest by the people involved; the 15-minute limit reflects the rule of thumb that “there’s only this much that everyone needs to hear.” **If you feel you need 30 minutes every day, take it as a warning that your goal is vague, your items are too big, or your board isn’t doing its job of sharing information—one of those is the culprit.**

&emsp;So, **why does the assumption of a “place to share information” creep in?** Many team members come to a Scrum team already ingrained with the pre-Scrum culture—reporting progress to a boss and waiting for instructions. The act of “speaking at a morning meeting” automatically triggers the reporting format they’ve used their entire careers. There’s no ill intent or laziness—only the recipient (who you’re speaking to) is different. But when the recipient changes, the nature of the meeting fundamentally changes. If your audience is your manager, the goal becomes “showing that I’m doing my job properly,” so stories of smooth progress multiply, blockers are downplayed, and listening to others’ reports becomes “waiting for your turn.” “Having them attend for transparency” is just another derivative of the same misunderstanding.

![Figure 2: When the recipient changes, the nature of the meeting changes](/img/blogs/2026/1001_6_daily_scrum_status_meeting/fig06_02.webp)

&emsp;The well-known “three questions” have also reinforced this misunderstanding. If you just read them like a script, they become nothing more than a sharing procedure. The reason the Scrum Guide 2020 removed the “three questions” is to avoid turning the means into the goal. Another structural factor is the absence of a Sprint Goal. If your goal only means “complete all the tasks you’ve planned for this sprint,” the act of “replanning toward the goal” cannot take place, and all you’re left with are individual work reports. **The hollowing out of the Daily Scrum is often a symptom of the hollowing out of the goal** (how to define goals was also covered in part 2. We’ll revisit it many times because it’s that crucial).

&emsp;So, what is the Daily Scrum really for? Scrum is based on empiricism, and its pillars are **transparency, inspection, and adaptation.** The Daily Scrum is the smallest loop that cycles through these three every day.  
&emsp;**Transparency** — that everyone sees the same thing regarding the Sprint Goal: what is done and what isn’t. This is the job of the board, not the meeting. The meeting starts with what’s already visible.  
&emsp;**Inspection** — comparing what is visible against the goal to confirm, “Will we make it if we keep going like this?” and “What is the riskiest item today?”  
&emsp;**Adaptation** — changing how you move today based on the inspection results: who does what first, who helps whom, what gets put off. This inspection and adaptation is the substance of the Daily Scrum.

&emsp;Seen this way, it becomes clear what’s happening in a status-meeting style Daily Scrum. You spend the full 15 minutes doing transparency in the meeting, leaving no time for inspection or adaptation. Let’s transform this from a venue to explain yesterday’s work into a venue to decide today’s team actions. If this point is off, everything else will be off.

&emsp;The substance of adaptation is the “post-meeting discussions” mentioned in the opening question. They are not something to eliminate but something to intentionally generate from within the Daily Scrum. However, it’s simply impossible to handle all the developers’ discussions in 15 minutes. If individual topics are discussed haphazardly, information sharing breaks down; if everyone is involved in every discussion, there’s no time left to write code. Therefore, the role of the Daily Scrum regarding discussions is to **identify what needs to be discussed and with whom.** “Who will talk to whom about what afterward” is the deliverable of the Daily Scrum. Fifteen minutes is not “the time to cram in and finish discussions,” but **the time to inspect, then decide the discussion partners and topics for adaptation.**

## Prescription

&emsp;The prescriptions below are all just means to an end. Experts have proposed various ways to run the Daily Scrum; feel free to choose whichever you like. However, if you simply go through the motions and end up with a “we’re doing it” feeling, it’s the same as reading the three questions from a script. After trying them, judge what’s effective for you by which of transparency, inspection, and adaptation has improved.

**First, track post-meeting discussions for one week**  
&emsp;Before you fix anything, measure it. For one week, jot down the discussions that start immediately after the Daily Scrum. Three items are enough: “who with whom, about what, how many minutes.” Lining up a week’s worth will give you a list of the topics your team truly needs to address each morning—the measurable contents that the current 15-minute window is missing. Who is waiting for whom, which topics are recurring, and which two people speak together every day. All subsequent prescriptions become much easier to try with this record. Proposals to change the Daily Scrum will meet resistance, but a suggestion like “Last week, we had an average of 40 minutes of post-meeting discussion each day. Could we capture that within 15 minutes?” is backed by numbers that speak for themselves.

**Change the questions**  
&emsp;Stop asking “What did you do yesterday?” and try asking:  
- “What is the most at-risk item for achieving the Sprint Goal right now?”  
- “Who will resolve what today?”  
- “Do you think you’ll make it in time?”  
&emsp;By centering the conversation on distance to the goal rather than individual task confirmation, reporting naturally shifts to discussions.

**Walk the task board, not the people**  
&emsp;Another effective approach is to change the speaking order from “person order” to “PBI (Product Backlog Item) order.” Start at the rightmost side of the task board—the items closest to completion—and ask, “What do we need to do to finish this today?” Simply shifting the subject from “I” to “this item” transforms the conversation from individual task reports to a team completion strategy. It also encourages finishing work in progress, killing two birds with one stone. The same works remotely—just walk through the right side of your shared board, and be careful not to slip back into “everyone shows their face in turn to report.” If you’re a daily-report style team, change your post template to “Who will you ask for what today?” and “What are you waiting for from whom?” and have the person named promise to respond. With a clear recipient, it becomes a discussion even in text form.

![Figure 3: Walk the task board to clarify discussion points](/img/blogs/2026/1001_6_daily_scrum_status_meeting/fig06_03.webp)

**Experiment with changing the listeners’ positions**  
&emsp;In teams where status reporting is directed at the leader, it can be effective for the leader (or Scrum Master) to step one position out of the circle or even skip the meeting entirely. Stripped of their usual addressee, reports will seek a new venue and turn toward teammates. It may sound harsh, but a state where “the Daily Scrum can’t happen without me” is a danger signal for the leader. Before conducting this experiment, ensure progress tracking is covered by information that anyone can see anytime—like the task board or burndown chart. If you’re reducing reporting venues, create the information repository first.

![Figure 4: If you love a child, send them on a journey](/img/blogs/2026/1001_6_daily_scrum_status_meeting/fig06_04.webp)

**Decide seats for people coming from outside**  
&emsp;If you’re in the customer reporting style, don’t just send the client or managers away—**offer them a seat first.** If they want to know progress, publish the board and burndown chart so they can view them anytime. If they want to be involved in decision-making, the appropriate place is the Sprint Review (which we’ll cover later). If they still insist on attending, have them promise “not to speak, and to ask questions only at the review.” If they can’t keep that promise, the team should be aware that on the days they show up, the Daily Scrum reverts to a status meeting.

**Multi-tasking members should only report their available time for this team**  
&emsp;This is a prescription for the external commitments style. What a multi-assigned member should report is, “How much time can I devote to this team’s goal today?” For example, “Today I have 2 hours for this team and will at least complete the checks for this item.” By having them declare their available time upfront, the rest of the team can plan today’s actions accordingly. In teams with many shared assignments, making this declaration the very first line in the Daily Scrum makes all subsequent discussions concrete.

**Make “who will talk to whom about what afterward” the deliverable**  
&emsp;Have the team declare “who will talk to whom about what afterward” during the Daily Scrum, officially position that declaration as the Daily Scrum’s deliverable, and have only the relevant people stay behind to discuss. If you enter overtime, don’t hold everyone hostage to resolve it—triage it by saying “that discussion will happen afterward between these people” and move on. That becomes the Scrum Master’s main task at this stage.

## Why Has This Question Been Repeated for 30 Years?

&emsp;The morning meeting itself was not invented by Scrum. Many organizations already have a culture of “morning assembly” or “progress check,” and the Daily Scrum always gets installed on top of those existing patterns. And overlaying often fails. Because the appearance (every morning, short, standing) is similar, no one notices that the substance (reporting to a manager versus replanning with the team) has been swapped.

&emsp;Each time a new member joins, they bring the morning meeting style from their previous workplace. That’s why this question inevitably replays with each turnover of the team. And the remedy is always the same: confirm the recipient and the purpose, not the form. Can the team answer in their own words, “For whom and to decide what is this 15-minute block?” In other words, ask whether inspection and adaptation occurred in this morning’s 15 minutes. That serves as an effective health check for the Daily Scrum.

---
*Next time: "Retrospectives Aren't Working… Rerunning the Same Improvement Proposals and a ToDo Listing Meeting"*
