---
title: '[Agile FAQ #8] Stakeholders Have Stopped Attending the Sprint Review'
author: tomohiro-fujii
date: 2026-10-09T00:00:00.000Z
tags:
  - スクラム
  - アジャイル
  - アジャイル開発
translate: true

---

&emsp;Thank you for reading this article. I’m Tomohiro Fujii from the Agile Group.  
&emsp;After discussing the Daily and the Retro, the third event is the Sprint Review. The first two events conclude entirely within the team, but the Review features people outside the team as the main participants. For that reason, the ways it can become a hollow ritual and how to fix it are somewhat different.

## Question

&emsp;When we first started Scrum, members from related departments used to attend the Sprint Review (partly out of curiosity). But now, four months in, almost all attendees are just team members. We prepare demos properly every time, yet no one watches them.  
&emsp;The other day, the person in charge on the client side said, “If you send the demo as a video or document, I’ll watch it. We’ll compile detailed checks during acceptance.” They didn’t seem to mean any harm, and I understand they’re busy.  
&emsp;But still… is there any point in continuing a Review that’s turned into a “team-only demo session”?

## Answer

&emsp;The simple phrase “Please send the materials” holds the answer. They think of the Review as a “report.” If it’s just a report, materials alone suffice; there’s no need to attend a meeting. From their position, that judgment is completely rational. The problem is that the Review really has become a reporting meeting.  
&emsp;When I get this kind of question, the asker is usually thinking about three things.

- Is the reason they stopped coming that they’re busy, or that they lost interest?  
- If materials suffice, is it okay to just settle for that?  
- Even a team-only Review, is it better than nothing?

&emsp;I’ll answer in order.  
- They didn’t stop coming because they’re busy or bored; they’ve **learned that nothing will be decided even if they come**. Once you show completed work, get a round of applause, and that’s it, there’s no reason to attend a second meeting.

&emsp;&emsp;&emsp;&emsp;Figure 1: All set, seats empty — Sprint Review four months later  
![Figure 1: All set, seats empty — Sprint Review four months later](/img/blogs/2026/1009_8_stakeholders_skip_sprint_review/fig08_01.webp)

- Whether materials suffice depends on the meeting’s content. **If it’s a report, materials suffice**. However, **decisions like “Should we keep or discard this alternative flow?” or “Which business area should we validate next?” won’t come back via materials alone**.  
- A team-only Review is, unfortunately, not a real Review. There’s no one to inspect it.  
&emsp;The remedy is not to nag people to attend, but to redefine the meeting. If you change the Review from a “completion reporting session” to a “meeting where we decide what to build next in the words of people outside the team,” **people who realize their input will move the product will come even if you don’t explicitly invite them**. There are two things to look at: who you want to decide what, and what happened to the feedback you received afterwards.

## “The Review Is Not a Place for Acceptance” — Did That Guidance Resonate?

&emsp;Many of you have likely been taught in training or on-site that “the Sprint Review is not a place for approval or acceptance” and that “it’s not a demo session but an inspection session.” But didn’t you think:

- What’s wrong with showing completed work and having it confirmed? The client side wants to accept it, after all.  
- If we solicit stakeholder feedback every time, won’t the plan shift or get out of control?  
- How do we get people who don’t come to attend? Apart from reminders, what else is there?

&emsp;These questions are perfectly valid. In conclusion…  
- Showing what’s finished isn’t bad; **the problem is doing nothing after the demonstration**.  
- Plans shifting is exactly the point and as expected. However, shifts happen at the Sprint boundary.  
- **People continue attending meetings only when they know their input has an impact**.

Before diving into each, let’s first look at the common shapes a Review tends to take, and then explain them in order.

## Typical Sprint Review Patterns

&emsp;A hollowed-out Review can take several forms (in the Retro, they were “faces,” but that had no deeper meaning). As you read, imagine which one most closely matches your meetings.

**Type 1: Completion Reporting Meeting** — The most common form. The team takes turns showcasing “what was done in this Sprint,” stakeholders clap and say “thank you,” then leave. Even if questions arise, they’re answered and that’s it. What will be done in the next Sprint has been decided before the meeting. “Please send me the materials” is the stakeholders’ honest evaluation of this format.

&emsp;&emsp;&emsp;&emsp;Figure 2: A meeting where people clap and leave. “I’ll take a look at the materials.”  
![Figure 2: A meeting where people clap and leave. “I’ll take a look at the materials.”](/img/blogs/2026/1009_8_stakeholders_skip_sprint_review/fig08_02.webp)

**Type 2: Acceptance Meeting** — Common in business environments. Representatives from the client side or, even in in-house development, members of business units attend thinking it’s a “delivery confirmation.” They focus on “Is it done as we said?” and don’t discuss “Is this sufficient? What should we do next?” In Part 6, I discussed the “customer reporting style,” where clients and managers drop in on Daily, and said that if they want to be part of decision-making, their place is the Review. Even if you save them a seat, if it remains an acceptance meeting, it’s just the Daily’s reporting session moved to the Review.

**Type 3: Everyone-Gather Meeting** — Convened by sending a blanket invitation to “all concerned.” Invitations that don’t communicate “why you are being invited” are treated lightly by everyone. Initially, people attend out of curiosity, but after a few times it gets classified as a “routine you don’t have to attend.”

**Type 4: Stamp-Approval Meeting** — The team seeks approval with “Is this acceptable?” The stakeholders’ only role is to say “yes,” and no options are presented. Approval is granted, but direction doesn’t change at all. If the Acceptance Meeting is the client side’s approach, the Stamp-Approval Meeting is the vendor side’s.

**Type 5: Team-Only Demo Session** — The end state of Types 1–4. People outside stop coming, and the team demos for itself and that’s it. It’s not bad that there’s a record, but there’s no one to inspect. The team asking the question is in this exact situation now.

## Underlying Assumption of the Five Types

&emsp;What roots all five types is the **assumption that “the Review is a place to show deliverables.”** If that’s the case, as long as you show something, the meeting is a success; if people don’t come, you just need to improve your demo; once you get approval, it’s complete. There’s nothing inherently wrong with any of the five types—they’ve reached their logical conclusion. And if it’s only a “showcase,” materials suffice. From that premise, the stakeholders are completely justified.

&emsp;Now, let’s revisit the three questions (※This article’s structure has become patterned too).

- **What’s wrong with showing finished work for confirmation?**  
&emsp;Nothing is wrong with that. Demonstrating a working product is the starting point of the Review. **The problem is doing nothing after the demonstration.** When stakeholders have a working increment in front of them, what they can provide isn’t just “is this what we asked for?” but information the team doesn’t have—on-the-ground realities, market or other department conditions, and upcoming challenges. A meeting that ends without gathering that is merely a report for the team and acceptance for the stakeholders, leaving no material for deciding next steps. **Acceptance tasks (verifying against the Definition of Done or acceptance criteria) are necessary work, but not work to be done during the Review.** Do those verifications before the meeting, and use the meeting to discuss “What do we do next based on this?” With that division, the Review won’t be eaten up by acceptance.

- **If we gather opinions every time, won’t the plan wobble?**  
&emsp;It will wobble (of course). And that is exactly the purpose. Showing a working increment every Sprint is meant to correct the direction quickly, and a Review where the direction never changes is the same as not inspecting anything. However, the wobble occurs at the Sprint level. Opinions raised during the meeting aren’t injected directly into the development team’s work but are taken as reordering items in the Product Backlog and picked up in the next Sprint planning. With that receptacle, opinions become “material for updating the plan” rather than “things that break the plan.” In the terms of Part 4, slice swaps occur routinely within this receptacle, and additions or removals from the use-case list are the only items that go through an explicit decision process on the client side.

- **How do we get people who don’t come to attend?**  
&emsp;Nagging them will no longer bring them back. **People continue attending meetings only when they know their input has an impact.** I’m sure you readers would also want to reduce attendance at reporting meetings where there’s no opportunity or need to speak.  
&emsp;The reason people came to the early Reviews and the reason they stopped coming are actually the same. At the start, stakeholders come to see “what happens with this new approach.” After seeing a few times, they learn: The demos are in place, they answer questions, but regardless of what I say or don’t say, what happens in the next Sprint doesn’t change… Once that learning is complete, the Review is classified on the calendar as a “routine you don’t have to attend,” and “Please send me the materials” is what comes out of their mouths. This is not stakeholder negligence, but rational behavior.  
&emsp;There is only one way to get them to come: make it a “meeting where, if you come, something will be decided in your words.”

&emsp;Here, recall Parts 3–5, which dealt with overhaul projects. As we saw in those three articles, overhaul projects bring up decisions that only the client side can make almost every Sprint: whether to follow, fix, or discard a “mysterious behavior” found in testing; whether to limit the depth of a use-case test to the minimal set or expand it to main alternate flows; which business area to move to next. All of these are decisions made by people who know the business in front of a working increment. In other words, Review meetings for overhaul projects shouldn’t lack topics. If they still have become “reporting sessions,” then those decisions are either being made outside the Review—via email or another routine—or are left undecided, filled in by developer assumptions. If it’s the former, bring them back into the Review; if it’s the latter, those are precisely the decisions that should be made in the Review.

&emsp;Still, **why does the assumption of a “showcase” so naturally take hold?** Many organizations already have a culture of “progress report meetings,” “deliverable report meetings,” and “acceptance” from before Scrum. Because they look similar—people gathered in front of something working—the Review gets overlaid on those existing formats, and the old purposes—reporting, confirming, obtaining approval—live on. In business-oriented environments, there can be even deeper issues. Even companies that have moved to in-house development often carry over the same role divisions and power structures—essentially “internal outsourcing”—between business units and IT units that existed when dealing with external system vendors. Under that relationship, the Review is treated not as a “place to decide next steps with an equal partner” but as “verifying the vendor’s delivery.” It’s not that anyone is slacking; the nature of the relationship determines the nature of the meeting.

&emsp;So, what is the Sprint Review truly for? Let’s map it to Transparency, Inspection, and Adaptation.  
&emsp;**Transparency** — Ensuring that the Sprint’s results are visible as a working increment—not just in documents—to those outside the team. You also openly show what was achieved and what wasn’t relative to the Sprint Goal. The demo is a means to achieve transparency, not the purpose itself. Up to that point, materials would suffice.  
&emsp;**Inspection** — Examining what is visible against the product goals and the market or operational conditions stakeholders bring, to confirm “Is it okay to proceed as is?” and “What has changed?” It’s here that outside information enters. Sending materials alone won’t bring this back.  
&emsp;**Adaptation** — Deciding what to build next based on the inspection results. Reordering the Product Backlog and changing direction. The outcome of the Review is not the demo but the feedback and the backlog direction that follows.

&emsp;With these three in mind, the true nature of the Completion Reporting Meeting becomes clear. All the meeting time is used for transparency (the demo), and there is neither inspection nor adaptation. It’s the same structure as a reporting-style Daily and a “just say it” Retro. **Replace “a place to show deliverables” with “a place to decide with outsiders what to build next.”** This is the one shift. If this doesn’t change, no remedy will work.

## Prescription

&emsp;A prescription is just a means. There are many expert suggestions on how to run a Review, and you can choose any of them. However, if you only follow a pattern to get a “we did it” feeling, it’s no different from a Stamp-Approval Meeting. Evaluate your Review not by the number of attendees, but by how many times the backlog moved as a result of the Review.

**First, Count How Many Times the Backlog Has Moved as a Result of the Review**  
&emsp;Before taking any action, count. For the last 3–4 Reviews, count how many times the arrangement or content of the Product Backlog changed as a result of each meeting. If you end up with zeros, you’ll get the fact that the Review has been doing neither inspection nor adaptation. Complaints of “stakeholders aren’t coming” will carry more weight when rephrased as “in the last four Reviews, the backlog moved zero times.” It’s the same logic as counting the follow-up to the last Try in the Retro.

**Redesign It as a Decision-Making Forum**  
&emsp;Shift the agenda’s focus from “the demo” to “deciding things.” It’s fine to have just one question per meeting that requires stakeholder judgment; state it clearly in the invitation. A single line like “Decision for this Review: ◯◯” will change the character of the meeting. In an overhaul project, you’ll never run out of questions: “For this behavior found in testing, do we maintain it, fix it, or discard it?” “Should we limit invoice generation testing to the minimal set, or expand it to cover the bulk run at the start of the month?” “Which business area should we move next: payment reconciliation or the monthly close?” In new development: “Can we release this feature in this form?” “Should we proceed in direction A or B?” “Does this hypothesis match the field’s realities?” etcetera…  
&emsp;Start by reviewing what was achieved relative to the Sprint Goal, then present the question. Record the decisions in the meeting minutes and in the backlog, and if your organization has a formal change process, funnel it there. Not leaving it as a verbal agreement is key to sustaining this practice.  
&emsp;For topics that can’t be fully decided on the spot (e.g., approvals requiring formal signatures), explicitly state that “the Review will decide a recommended direction, and formal approval will follow the existing process,” to avoid confusion over the meeting’s authority.

&emsp;Figure 3: With a working increment in front of them, the backlog moves in the words of outsiders  
![Figure 3: With a working increment in front of them, the backlog moves in the words of outsiders](/img/blogs/2026/1009_8_stakeholders_skip_sprint_review/fig08_03.webp)

**Distribute Questions in Advance**  
&emsp;Even if you ask “Any feedback?” on the spot, people won’t be able to answer. Provide a brief advance summary of what will be demoed and on what decisions you want feedback, giving them time to think. The quality of feedback is proportional to their preparation time. If they say “send me the materials,” make this pre-distribution into those materials. **What you send is not a report, but the question “On the day, please decide this.”**

**Invite by Name and Provide a Reason**  
&emsp;Stop blanket invitations and narrow in on people who are relevant to the agenda. “Ms. X from Accounting, since this report output directly affects your monthly tasks, I’d like you to verify it on the actual screen.” If you can’t state a reason for inviting someone, you don’t need to invite them this time. A small meeting that elicits influential and meaningful feedback is worth far more than a large silent gathering. In Part 6, I talked about setting a seat for client representatives or managers if they want to be involved in decision-making on the Daily. It’s the same when inviting them to the Review: say “I want you to make this decision,” and give a reason.

**Complete Acceptance Checks Before the Meeting**  
&emsp;In environments leaning toward the Acceptance Meeting, reconcile against the acceptance criteria with the responsible parties before the Review (if acceptance criteria are documented in advance, most of it is just a matter of checking the boxes). On the Review day, spend time not on “Is this done as specified?” but on “Based on this, what do we do next?” Agreeing on this mode of stakeholder involvement from the start prevents the Review from being eaten up by delivery checks.

**Provide a One-Page Takeaway**  
&emsp;Client-side representatives have to report back internally after the Review. Half of “send me the materials” means they want material for that report. In Part 3, I talked about sharing vocabularies like “verified list,” “remaining risks,” and “order of business impact” with stakeholders. At the end of the Review, hand out a one-page summary showing how far the verified list has grown in this cycle, what decisions were made, and how the remaining risks have changed. They can take it straight back to their organization. **Decisions in the meeting, reporting on one page.** When you divide tasks this way, the request for “materials” disappears.

**Show What Happened After the Feedback**  
&emsp;At the start of the next Review, always report on what happened to the feedback you received. “Mr. X’s point last time has been added to the backlog in this way and is reflected in today’s demo.” “We decided to postpone Ms. Y’s request for this term after consideration. The reason is…” Whether it was adopted or postponed, as long as people see their prior comments being tracked, speaking up no longer feels like a wasted effort. This becomes the biggest motivator for attendance next time.  
&emsp;This redesign is a joint effort between the team and stakeholders. The team prepares the questions and tracks the feedback, and the invitees come with decisions and verify what happened to their input next time. Once this back-and-forth gets going, the Review becomes a meeting people will attend even if you don’t invite them. It is also a steady effort to transform the “internal outsourcing” hierarchy into equal collaboration.

## Why Has This Question Been Repeated for 30 Years?

&emsp;The form of “regularly showing working software” can be imitated on day one of adoption. But the substance—“using what was shown as material to decide next steps together with outsiders”—requires delving into the team’s external relationships and the organization’s decision-making style, which is significantly more difficult. That’s why many teams focus on form first and stay stuck in form. And months later, they find themselves with empty seats and the same question in a conference room.

&emsp;The number of attendees at the Review is a barometer of the health of the connection between the team and the organization. If empty seats persist, it is a sign that dialogue with the outside is about to break down, and there is something you should fix before worrying about the quality of the demo. Did something get decided in the words of outsiders in this Review, and has the backlog moved? This single question becomes the gauge for the Sprint Review.

&emsp;What? You tried, but the stakeholders still won’t budge? Hmm, we’ll cover how to fight in that kind of environment somewhere else in this series.

---

*Next time: "My manager is asking me to convert story points into person-days"*
