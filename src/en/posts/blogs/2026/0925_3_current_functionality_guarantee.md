---
title: >-
  Agile FAQ Part 3: How to Address 'Current Functionality Guarantee' in Upgrade
  Projects?
author: tomohiro-fujii
date: 2026-09-25T00:00:00.000Z
tags:
  - スクラム
  - アジャイル
translate: true

---

&emsp;Thank you for reading this article. I’m Tomohiro Fujii from the Agile Group.

&emsp;A succession of decisions eventually becomes a convention. And once it becomes a convention, no one dares to question it anymore. This is the culmination of “thoughtless adherence to precedent.” From this article onward, in the next three installments we will tackle one such convention: the “Current Functionality Guarantee” in upgrade projects. Addressing it requires three perspectives, each serving as a sub-theme, which we will cover over three articles.

- Part 3 (this article): Examining what “current” actually is  
- Part 4: Creating an “overall picture” that can be agreed upon  
- Part 5: Verifying, budgeting, and allocating  

&emsp;The aim of these three articles is to “stir things up in your workplace.” Phrases like “Upgrade projects have to be done this way” or “Agile means such-and-such” have been stopping our thinking. It’s time to turn a questioning gaze at them and invite, “Is it really impossible? Let’s think it over once.”

&emsp;Moreover, in reality it’s rare to see Agile practices penetrate even the people at approval or contract negotiation tables, or to have corporate processes that allow Agile. I hope you’ll read these three articles as examples of how to reshape your processes to fit those contexts.

## Question

&emsp;Our department’s work focuses on renewal and upgrade projects for existing systems. There’s a new policy to “proceed with this project in Agile,” but to be honest, I don’t see the benefits.

&emsp;The ordering side is proceeding on the premise of a “Current Functionality Guarantee.” But we have no way to capture all of the current system’s functionality. There’s no guarantee the documentation we rely on is complete, and even if it is, there’s no guarantee it matches the live system. If it’s tough with Waterfall, Agile—which doesn’t finalize everything up front—should be even more challenging. The ordering side demands all functionality, while Agile doesn’t finalize everything up front—and I can’t shake this sense of dissonance.

&emsp;In a situation where they say, “Guarantee it, but the full scope is unknown,” how should we address that with Agile?

## Answer

&emsp;That sense of discomfort is exactly right. First, hold on to that discomfort and doubt.

&emsp;In JUAS’s “Corporate IT Trend Survey 2026,” “renewal, update, and enhancement of existing systems and infrastructure” is listed among the reasons for increasing IT budgets—so the backdrop to this question reflects the industry’s reality.

&emsp;In such projects, “Current Functionality Guarantee” is a “magic word”—it’s a promise to cover all functionality even though the full scope remains unknown. However, in substance it’s nothing more than a restatement of “requirements are unknown.” And, combined with liability for non-conformance (formerly “defect warranty”), the ordering side can shift the risk onto the contractor.

…Is that a bit too provocative?

&emsp;The tricky part is that this ambiguous wording becomes the acceptance criterion. A promise to guarantee everything while it’s unclear what “as is” actually is means that **unless you change the promise itself, no matter how you structure the contract, in practice there’s no way to fulfill it.** One side insists “If it can’t be done, we’re in trouble,” while the other, eager for the contract, pretends “We can do it,” and you’re guaranteed a quagmire.

&emsp;Admitting frankly that “what can’t be done can’t be done” is the starting line for a solution.

&emsp;Now, circling back to “I don’t see the benefits”… far from lacking advantages, **I believe upgrade projects are prime territory for Agile.** The point is to **replace ambiguous things with manageable forms.**

&emsp;So, what does “current” actually refer to? Let’s begin there.

## The Reality Behind “As Is” —— It’s Not a Single Specification but Three

&emsp;What exactly does “as is” refer to? The fundamental issue is that what’s called the “current specification” is actually a mixture of three separate things.

1. **What’s Written on Paper (Documented Specification)**  
   &emsp;Content recorded in design or specification documents at a specific point in time. It **might** have reflected the actual system at that **point**, but there’s no guarantee it matches the latest version. Those who hold these papers are the ordering side and the contractor’s estimating team.
2. **What the Code Does (Implemented Behavior)**  
   &emsp;The behavior that the code actually executes. This includes deviations from the spec—bug fixes, emergency on-site patches, and features that were never documented. Maintenance developers are the ones with this information or who can read the code.
3. **What People Do (On-the-Job Usage)**  
   &emsp;How users actually operate the system in their day-to-day work. This includes unofficial procedures and operational workarounds created to avoid known bugs. Business processes excluded during the last renewal and handled manually fall here, yet they rarely make it into code or specs. Only the on-site users know them, and for them it isn’t a “spec”—it’s just routine. So unless you ask, these details don’t surface.

![Figure 1: Which “As Is” Are We Talking About? —— Paper · Code · People](/img/blogs/2026/0925_3_current_functionality_guarantee/fig03_01.png)

&emsp;When the ordering side talks about a “Current Functionality Guarantee,” what they really want to protect is **3: What People Do.** However, what underpins the contract and acceptance is **1: Paper**, and what the actual migration work deals with is **2: Code.** These three aligned roughly on release day; it’s the passage of time that creates the discrepancies.

- Emergency incident fixes change only the code.  
- For legal or organizational changes, on-site operations respond first until a budget for system updates is allocated.  
- Paper is postponed with the note, “We’ll fix it all in the next major overhaul.”

&emsp;Each of these decisions is rational in the moment. It’s the accumulation of them that, over time, causes the three areas to diverge. It’s not due to negligence or lack of effort—it’s the inevitable outcome. And this divergence is the structural reason why in renewal projects you see repeated incidents like “All tests passed, yet post-release operations stopped.”

&emsp;The three don’t match. Yet only Paper sits at the estimation and contract table. The ordering side has no way to capture everything, the contractor’s upper levels lack materials, and those at the front lines who have the materials have no opportunity to speak up.

**No one has a complete picture, yet everyone is promising a complete guarantee.**  
—This is the true nature of the promise I said at the outset is impossible to fulfill in practice (I’ll touch on why this continues at the end).

## Why Agile Still Works

&emsp;If you can’t grasp everything at the granularity of individual behaviors, then **at that granularity** you have no choice but to “discover as you go.” This is empiricism—the core of Agile—namely, try it, observe, and adjust.

&emsp;In Part 2 of this series, we classified projects as “new development” and “maintenance,” and the third category is “renewal/upgrade.” Renewal/upgrade projects have these characteristics:

- You can’t rely on documentation being complete, and there are many unknowns.  
- You have the actual system for validation, so you can check your answers.  
- If you switch over all at once and fail, business operations come to a halt.

&emsp;All of these traits favor an approach of “validating in small increments.” It’s often assumed, “Since there’s an existing system, you can list out all functions, so Waterfall is safer.” But in reality, you only feel like you can list everything. That assumption itself conflicts with the traits of renewal/upgrade projects.

## Prescription —— Reconstructing the Guarantee

&emsp;How do you reconcile the conflict between “we need everything” and “we’re not supposed to finalize everything upfront”? Replace the ambiguous “everything” with a manageable construct.

**Reframe the “implicit guarantee of everything” as “verified list + remaining risk”**  
&emsp;Instead of treating “everything” as the final, all-encompassing scope that must be known from the start, rethink it as a list that grows through verification. The first task isn’t technical work, but negotiating a redefinition of what you’re actually guaranteeing. Why not convert the “Current Functionality Guarantee” into two parts: a list of verified features (which are guaranteed) and a separate area for unverified or undiscovered elements? Share the unverified/undiscovered area as a risk and address it as soon as it’s discovered.

![Figure 2: Reconstructing “everything”](/img/blogs/2026/0925_3_current_functionality_guarantee/fig03_02.png)

&emsp;The key is to treat the discovery of additional requirements afterward as “something that naturally happens,” rather than turning it into a question of “who’s responsible for omissions.” Who ultimately bears the remaining risk should be a question you address at the outset of this reconfiguration (the answer varies by organization). With each sprint, the verified list grows and the remaining risk shrinks—a model where progress directly translates into an expanded guarantee scope.

&emsp;However, this reconfiguration alone can’t satisfy the ordering side’s request for “everything.” The verified list will expand, but without a denominator, there’s no way to know when it’s complete. What this reconfiguration actually addresses is the ordering side’s true desire behind “everything”—“to keep operations running.” By verifying items in order of business impact, you bring the most critical operations within the guarantee first. Even so, the ordering side will legitimately want to know “how much of the overall scope is complete.” That denominator—what level of granularity to use when constructing the big picture—is the subject of the next installment.

**Don’t channel the estimate breakdown straight into the guarantee wording**  
&emsp;The “budget container” (the total amount and time frame secured in the approval document) and the “scope of the guarantee” (what you promise as “as is” in the contract) are separate. Having a fixed budget isn’t a problem in itself; the problem is that the phrase “Current Functionality Guarantee” from the approval document slides right into the contract guarantee. You don’t need to list out every individual behavior to set up the container (what granularity you can count at is covered in Part 4, and how to structure and allocate the container is handled in Part 5). Keep the estimate breakdown for reference, and don’t pour it into the contract’s guarantee wording. Whether you can draw this boundary will determine the atmosphere in the second half of the project.

**Share vocabulary for internal explanations with the ordering side’s contacts**  
&emsp;Avoid Agile-sounding jargon and use terms like “verified list,” “remaining risk,” and “in order of business impact”—words that your counterpart can use to explain progress to their boss or stakeholders. If you prepare proposals and routine reports using this vocabulary, they can bring them directly into their internal discussions. The same applies between prime and subcontractors: what gets transcribed isn’t the five characters “Current Functionality Guarantee,” but the verified list and remaining risk. Regarding the surveys mentioned in this article, I recommend bringing them in as reading material to share at the same table, rather than using them solely as persuasion tools.

**What developers can do today —— Classify incidents into three categories**  
&emsp;Even developers who aren’t at the contract or negotiation table—even those at the bottom of a multi-tier subcontractor chain, bearing the heaviest load—can do something today. Take your most recent “It was supposed to be ‘as is,’ but it wasn’t” incident and categorize it: was it a mismatch in paper, code, or people/process? Simply having this classification vocabulary transforms a defect report from “we missed it in testing” into “it was a paper-code-people mismatch,” providing an entry point to start this discussion with your team.

## Why Has This Question Been Repeated for 30 Years?

&emsp;Field personnel are vaguely aware that the three don’t align. Yet only Paper continues to be championed because there are perfectly reasonable circumstances (Figure 3).

![Figure 3: Where circumstances and thinking grind to a halt](/img/blogs/2026/0925_3_current_functionality_guarantee/fig03_03.png)

&emsp;The initial decision to adopt the format and wording “Current Functionality Guarantee” was undoubtedly a reasonable and conservative one—about 30 years ago, in the wave of open systems and downsizing. The problem is that those ad-hoc judgments aren’t necessarily passed on as know-how. Projects that got through under a full guarantee are recorded in approval precedents as successes of “being protected by this format.” Meanwhile, decisions to relax the guarantee when they turned out well don’t make it into the templates. As a result, every iteration tilts slightly toward the conservative side, and without an opportunity to revisit it, only the template is handed down as personnel change. This is the mechanism by which projects bearing an “all-inclusive guarantee of unknown scope” are reproduced across generations.

&emsp;I don’t think you’ll be struck by lightning for revisiting it at least once—what do you think?

---

&emsp;There are also thought-stopping words on the contractor side. The questioner himself said, “Agile doesn’t finalize everything.” And it’s worth questioning the word “finalize” itself, which is used by both sides.

&emsp;Waterfall doesn’t truly finalize requirements either. Requirements can change. It’s just that if you change them, the estimate will be affected, so you go through a heavy decision-making process—like a change control board (at least in the PMBOK view). That weight creates the motivation to “get by without changing,” and as a result, things appear to be finalized.  
&emsp;If that’s the case, the real question isn’t “Can you finalize everything or not?” but “Which parts do you subject to heavy procedures, and which parts do you leave as changeable without procedures?” So, at what granularity should you draw that line to reach agreement on the “overall picture” with the ordering side? Next time, we’ll delve into the granularity of the term “function.”

![Figure 4: The question isn’t “Can you finalize?” but “Which parts do you subject to heavy procedures?”](/img/blogs/2026/0925_3_current_functionality_guarantee/fig03_04.png)

*Next time: “How to Estimate Renewal Projects Without Finalizing All Functions?”*
