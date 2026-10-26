---
title: >-
  [Agile FAQ #5] For an Existing System with Unreliable Documentation, What
  Should Be Treated as the 'Specification' for Verification?
author: tomohiro-fujii
date: 2026-09-30T00:00:00.000Z
tags:
  - スクラム
  - アジャイル
  - アジャイル開発
translate: true

---

&emsp;Thank you for reading this article. I am Tomohiro Fujii, a member of the Agile Group.

&emsp;This is the third (and final) installment of a three-part series addressing the “current-function assurance” in modernization projects by dividing it into three sub-themes. In Part 3 we examined the actual substance of the “existing system,” and in Part 4 we created an overall picture that we could agree on. This time, the sub-theme is “verifying, budgeting, and allocating.”

## Question

&emsp;In a modernization project, I opened the specification documents for the existing system and found the last update was ten years ago. There is no guarantee they match the code, and when I ask people on the ground they keep saying, “It’s not in the manual, but this is how we actually do it.” What should I treat as the “specification” for verification? There’s no time to manually reconcile everything. Moreover, every time an unforeseen behavior is discovered, it seems we’ll have to talk about additional budget, and to be honest, I’m almost afraid of finding something new.

## Answer

&emsp;In Part 4, we saw that while we can agree on the overall picture at the granularity of use cases, we can’t know the contents of those slices without actually running the real system. This article discusses how to discover those “unknown contents” and turn them into verified items, and how to structure and allocate a budget to absorb those discoveries.

&emsp;To give the conclusion up front: if you can’t trust the documentation, make the most trustworthy thing—the running system itself—the specification, and instead of waiting for unknown specifications to surface as post-release incidents, actively uncover them during development by exercising small parts of the system. Agile’s strength in modernization projects lies in this “means of discovery.” The phrase “we can’t verify because the documentation isn’t complete” is the third thought-stopper, following “current-function assurance” and “Agile doesn’t finalize everything upfront.” Before you stop there, consider whether you can replace the subject of verification with the actual system itself.

&emsp;Each of the “three bodies of specification” we covered in Part 3 requires a different verification approach:
- Don’t rely on the paper documentation—but don’t discard it; use it as a clue to find differences from the real system.
- Fix what the code actually does by using characterization tests.
- What people actually do can only be discovered through early partial deployment and on-site interviews.

&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;Figure 1: Each of the three implementations uses a different verification method.  
![Figure 1: Three entities, three verification methods](/img/blogs/2026/0930_5_what_is_the_spec_to_verify/fig05_01.png)

&emsp;The following approach is roughly ordered in this way, followed by a mechanism for the Product Owner (PO) to consolidate and make decisions about the items discovered.

## Approach—Use the real system as the specification and uncover the unknown

**Measure the “actual current functionality” using real usage data**  
&emsp;As noted in Part 4 (“don’t migrate unused functionality”), first gather information such as operation logs, report output histories, and screen access records from the existing system to identify which features are actually used. Record these measurement results for each use case. However, functions that are infrequently used but legally or annually required—like year-end closing, tax-law updates, or disaster fallback procedures—may not appear in the logs. These must be identified not from usage data but separately from the business calendar and regulatory requirements.

**Lock down the “real system” as the specification using characterization tests**  
&emsp;Characterization tests, introduced by Michael Feathers in his book 『レガシーコード改善ガイド』, record the actual behavior of the existing system as tests, regardless of whether that behavior is “correct.” Capture “given this input, this is the response” from the real system and build a regression-test harness to mechanically verify that the post-migration behavior matches the current behavior. It’s standard practice to start with the happy paths of screens heavily used by the business or, for reports and batch jobs, by comparing outputs between the current and the migration version. This is the most practical way to discover the “what the code actually does” items that are often missed by comparing with the specification documents. In Part 4 we positioned test cases as the most important part of the Use-Case description. In practice, the depth we reach—L1 for the minimal flow, L2 for major alternative flows, L3 for all captured patterns—is determined by how many patterns we collect as characterization tests. In the measured sprints discussed later, we only count progress for the portions backed by characterization tests.

**Instead of a big-bang cutover, run it partially to discover differences**  
&emsp;Whether you do parallel operation with output comparison, a phased cutover by business area, or shadow operation (sending production data to the migration system but only comparing results), the common idea is to “shift the discovery of differences forward from post-release to during development.” Defining the scope of a partial deployment naturally follows from clarifying the goal of the use case (e.g., “the accounting clerk can issue the routine beginning-of-month invoices in the new system”). If the goal is written in business terms, it also determines what to compare under shadow operation, and the requester can report the results internally as is. Characterization tests cover “what the code actually does”; only this partial deployment plus on-site interviews can uncover “what people actually do.” Even the much-talked-about “AI-based legacy analysis” can only read paper and code. If you proceed believing those results are “current specifications,” the accident pattern we saw in Part 3 remains. Differences discovered are not failures but welcome findings. Recall the use-case map from Part 4: each time a difference is found, a path is added to the map and the verified list grows.

**Consolidate decisions on discovered “mysterious behaviors” with the PO**  
&emsp;As you verify, you will inevitably encounter “we don’t know whether this behavior is a specification or a bug.” If developers make individual judgments, later someone will say, “They changed it without permission.” Instead, list these mysterious behaviors and pre-agree on an operational rule that hands judgment—“keep/fix/omit”—to the requester/PO. In Part 3 we noted that those at the trenches rarely have a voice; this list is likely the only mechanism to deliver frontline discoveries back upstream.

&emsp;&emsp;&emsp;&emsp;&emsp;Figure 2: Hand off “mysterious behaviors” to the PO  
![Figure 2: “Mysterious behaviors” listed for the PO](/img/blogs/2026/0930_5_what_is_the_spec_to_verify/fig05_02.png)

&emsp;Decide in advance:
- Who will make the judgment
- By when they must decide
- What happens if no decision arrives by then

&emsp;If you start without these, unresolved items will pile up mid-verification. The responsibility for discovery is not questioned; only the requester/PO has the role of deciding—the one division of responsibility common to all projects. Recording the decisions becomes an asset for the next modernization.

**Residual risks are handed over to maintenance and operations**  
&emsp;We referred in Parts 3 and 4 to “who ultimately takes the residual risk.” The answer varies by organization, but residual risks don’t vanish at project close; they pass to the maintenance/operations team discussed in Part 2. Therefore, this question must be discussed up front with the team that will inherit those risks.

## Where to put discovered items—The backlog is open

&emsp;In Part 2 we saw that the backlog is “a list that assumes items will flow in later.” In modernization projects, this property changes the meaning of scope management.

&emsp;At the use-case level from Part 4, the list of use cases is treated as fixed—a nearly closed list under a heavy approval process (additions or removals of these items are handled as changes approved by the requester). The slices beneath that level, however, form an open list. Keep the heavy approvals only at the use-case layer and leave the slice layer open. Behaviors discovered in the previous section are quietly added as alternative flows. In Part 4 we said “slice-level swaps are not subject to approval (though they are recorded)”—that’s what we meant. Even without approvals, additions and swaps remain in the backlog history, so you can trace them later. And don’t turn additions into a responsibility issue (echoing Part 3’s “don’t blame for omissions”). Once blame enters, discoveries get hidden and the discovery process stops.

&emsp;However, “the backlog is open” may be obvious to the development team but not to the departments managing approvals and contracts. A process where additions or swaps occur without approval is an exception from the company’s perspective. Pressuring with “let’s deepen understanding of Agile” will come across as “imposing ideology” and only add resistance. **Keep the heavy approvals at the use-case layer, open only the slice layer—this line drawing is a compromise designed to work in organizations in transition.**

## Handling the budget—Is the purse open for the discoveries?

&emsp;Even if the backlog is open, discoveries can’t be accommodated if the purse is closed. Part 4 covered deriving the volume (number × size and initial depth) from the overall picture. Here we convert that volume into money, set up a budget container, and allocate it as development progresses. Since approval systems vary by organization, what follows is not an answer but material for your own organization to consider.

**Internal approvals (ringi) and contracts occur in different contexts**  
&emsp;**Ringi** is the process by which the requester secures a budget container (an upper limit) within their organization. **The contract** is the agreement between requester and vendor on what is promised, what is subject to negotiation, and how payments are handled. The contract amount is set within the ringi container but does not have to match it exactly. Do not copy the detailed breakdown from the ringi into the contract’s guarantee clauses—that’s the boundary we drew in Part 3. What follows concerns the ringi side.

**Convert size to duration and cost—base it on actual measurements first**  
&emsp;To convert the volume from Part 4 into duration and cost, rely on the team’s actual measured values. Perform actual migration and verification on the first two or three use cases, measure how many points you advance per sprint (velocity measured in use-case granularity), and count only the portions backed by characterization tests. Unlike the usual story-based velocity, here you count use cases and only “progress” what has been verified to the specified depth. How you reflect depth in volume (e.g., what fraction of an L1 bundle to count) is also verified here rather than decided on paper. Divide the total points by velocity to get duration, and multiply duration by the team’s monthly cost to get an amount (e.g., 120 total points, 6 points per sprint → 20 sprints → ~10 months at two-week sprints). Since measured values vary, propose the upper range as the container in the ringi. The vendor (or internal team) proposes this conversion, and the requester uses it to set the container. If the container is decided first, you can back-calculate the scope and depth it covers (we’ll revisit using measured ranges and what to do with the converted numbers in a future installment). If the ringi deadline won’t wait for measurements, you may substitute past-project data as a provisional value—but agree in advance to replace it with actual measurements after the first few sprints. Avoid assuming standard man-hours, because if you treat per-feature man-hours as fixed, that breakdown tends to seep into the contract. The provisional value here is only the velocity for translating total volume into duration. Note that this conversion assumes you can establish an initial velocity value (organizations without actual measurements, past data, or analogies cannot do this). The resulting figure is the upper limit of the ringi container, not the contract amount or final payment. Subsequent budget management subtracts the verified portions from that upper limit—and you may end up with leftover budget, which is not a failure.

**Keep the total budget fixed, but change how it’s allocated**  
&emsp;Let’s recap the premise: since you can’t foresee all requirements, you can’t estimate the entire container by adding up everything. However, some parts are foreseeable. The work to complete the minimal set of migration-target use cases is countable from the real system and can be estimated by summation. What you can’t sum up are the work to complete alternative flows beyond the minimal set (depth L2/L3) and the effort to handle unknowns discovered during verification. Therefore, structure the container in two layers: the “summable” portion and the portion managed by subtracting from the total.

&emsp;There’s another hurdle on the ringi side. Summation-style ringi means that the detailed breakdown becomes the budget usage. The instant you pass “all-items list × unit price,” not only the amount but also “what it’s used for” is fixed, eliminating any regulatory room to reallocate based on discoveries. If you raise an additional ringi every time you discover something unexpected, this approach won’t work (note that we’re talking about “unexpected” additional ringi; ringi that sets a broad container to be used in phases is a different matter). Fundamentally, you could overhaul the budgeting system itself—moving from annual budgets to rolling forecasts and dynamic resource allocation (“Beyond Budgeting”). But switching an organization that uses summation-style ringi directly to that is a high hurdle. As a first step you can take within the existing system, here are three compromise proposals to **keep the container fixed but change only how it’s allocated within it**.

First, divide the ringi breakdown into a **Commitment Bucket** and a **Discovery Bucket**. The Commitment Bucket covers finishing all migration-target use cases to the minimal set (L1). The Discovery Bucket covers completing alternative flows beyond the minimal set and handling unknowns discovered during verification, sized at roughly 20–30% of the total. Unlike traditional contingencies, explicitly write the rules for using the Discovery Bucket in the ringi: “Once the minimal set is verified for a use case, expand it to alternative flows in order of business impact. The allocation is decided by the team in regular meetings, and only if the total or deadline will be exceeded is a re-riigi required.” Since you can substantiate the total and initial depth from Part 4 and the previous section’s measurements, the format stays the same. The only addition is a clause delegating part of the approval authority to the team.
You shouldn’t leave the container as a single undivided bucket for three reasons:
- Responses to discoveries don’t eat into the budget for the minimal set needed to keep operations running.
- Limiting delegation to the Discovery Bucket makes the delegation clause more likely to pass ringi.
- If the budget runs low, you can distinguish between underestimation of the Commitment Bucket and heavy consumption of the Discovery Bucket. The latter is an expected event and, as noted in Part 3, not a responsibility issue. If discoveries stay within the Discovery Bucket, no additional ringi is needed; if they exceed it, you’ll see that early from the consumption status.

![Figure 3: Keep the container fixed but change the allocation within it](/img/blogs/2026/0930_5_what_is_the_spec_to_verify/fig05_03.png)

Second, split the ringi into two stages and place the measurement first. The first stage is a “measurement sprint”—a small, short-term engagement in which you actually migrate and verify a few use cases under a small contract. The second stage is requesting the main container after you have an actual velocity from the measurement. This mimics the existing practice of “ordering the requirements-definition phase first,” so it passes even in summation-style organizations. The difference is that the deliverables for the first stage are not a requirements document but the first lines of the verified list and the measured velocity. That first characterization test also happens in this first stage.

Third, leave the annual container unchanged and update the project’s “budget vs. actual + forecast” quarterly. Update the forecast based on the growth of the verified list and progress toward goals, and present your expected Discovery Bucket consumption—or early notice if it will under-run. Most organizations already have a quarterly review format; just add a line for “how many migration-target use cases have been verified to which depths” (the summary table of “use cases × depth” from Part 4). You then decide at the end whether to use any leftover budget on further alternative flows or return it. Maintaining the container on an annual basis while updating forecasts per project is also a small-scale trial of rolling forecasts from Beyond Budgeting.

&emsp;What’s fixed is the total amount, deadline, and Commitment Bucket; what moves is the allocation and forecast within the Discovery Bucket. Enabling this requires two things: writing the delegation of allocation authority into the ringi and first raising a small ringi for measurements. Both are just one-line additions to the existing forms, not new systems. There are things you can try within the current system before overhauling the system. An open backlog alone isn’t enough; the purse must be equally open.

## Why has this question been asked for 30 years?

&emsp;Every modernization lament begins with “there’s no documentation,” and once the modernization ends, the documentation again goes out of date. There is a reason for this cycle. In the final stages of a modernization, under deadline pressure “making it work” becomes the top priority, and the bandwidth to record decisions is the first thing to be cut. In the next modernization, the decisions made previously show up as “mysterious behaviors whose reasons are unknown,” and the cycle of investigation begins again. In Part 4, we noted that much of what people do manually today is a remnant of alternative flows implicitly cut by someone in the previous modernization. Their essence is the thirty years’ accumulation of unrecorded decisions.

&emsp;The first step to breaking this cycle is not “lamenting” but leaving behind a verified list and a record of decisions in this project. Characterization tests provide the verified list (the “use cases × depth” table from Part 4) by continuously fixing the real system’s behaviors in a machine-readable form. The list of decisions on mysterious behaviors is the first written answer to “why is it this way?” At the start of Part 3, we wrote that decisions eventually become customs and no one questions them. A decision list hands over decisions made before they become customs, along with the reasoning, to the next generation. Both require far less effort than rewriting the entire specification pack, and whoever takes on the next modernization can start, at the very least, from outside your current “unknown whole” situation. My answer to “what should replace paper as the basis for acceptance?” from Part 4 is also these two items. Don’t add more paper; keep what you capture from the real system. That is the best documentation of all.

&emsp;At the beginning of Part 3, I said these three articles were intended to stir things up. The three perspectives they present—seeing the substance of the existing system, creating an agreeable overall picture, verifying, budgeting, and allocating—are one possible viewpoint, not the definitive answer. They’re not a straight application of Scrum, but one example of reengineering the process to fit the Japanese context of ringi, contracts, and multi-layered subcontracting. Objections such as “it won’t work in our environment,” “ringi is not that simple,” or “who pays for the effort of characterization tests?” are exactly the debates I hoped to provoke. Please discuss these ideas at your workplace.

---
&emsp;With that, have we safely landed beyond the minefield?

![Figure 4: Have you made it through the minefield?](/img/blogs/2026/0930_5_what_is_the_spec_to_verify/fig05_04.png)

*Next time: “The Daily Scrum Has Turned into a Status Meeting”*
