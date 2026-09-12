---
title: '[Agile FAQ #2] Isn''t Scrum unsuited for maintenance and operations teams?'
author: tomohiro-fujii
date: 2026-09-10T00:00:00.000Z
tags:
  - スクラム
  - アジャイル
translate: true

---

Thank you for reading this article. I’m Tomohiro Fujii of the Agile Group.

## Question
&emsp;Our team focuses on maintenance and operations of existing systems. We mainly handle bug fixes and improvement requests, and it’s not the kind of work where we plan and build large new features in sprints. The Scrum taught in training seems premised on new development, and we have many interruptions. So isn’t Scrum unsuited for us?

## Answer
&emsp;It’s not Scrum that doesn’t fit, but the assumptions behind typical Scrum explanations. From a different perspective, maintenance and operations are quite a natural environment for Agile. Development teams steeped in waterfall culture often struggle to get used to the idea of “not deciding everything upfront.” In contrast, in the world of maintenance and operations, “not deciding everything from the start” is taken as a given.  
&emsp;Moreover, maintenance and operations are not only well suited to Scrum’s work-management aspect. They are likely the best stage for honing the other half—craftsmanship techniques such as testing, design, and releases—that Scrum itself does not define but that are indispensable to Agile. The latter half of this article will focus on that.  
&emsp;First, before hastily concluding whether it’s a fit or not, let’s reconsider: are new development and maintenance & operations really entirely different?

## Are “New Development” and “Maintenance & Operations” Really Different?
&emsp;This question is based on the notion that “new feature development” and “maintenance & operations’ bug fixes and improvement requests” are completely different kinds of work. Let’s question that premise from a Scrum standpoint. For convenience, we’ll call the former “new-development” and the latter “maintenance.”

&emsp;Lining them up from the backlog perspective looks like this:

- New-development: desired features line up → prioritize by value and risk → complete small increments and deliver → get feedback and decide the next steps  
- Maintenance: bug reports and improvement requests flow in → prioritize by impact and urgency → fix and deliver → observe user reactions and recurrence to decide the next steps  

&emsp;Regardless of whether it’s new or not, valuable work items flow in, you prioritize them, complete small slices and deliver, then look at the results to decide the next steps. Stepping back, both are structurally the same. Both “streams” run the loop that Scrum tries to spin. And both backlogs are lists that assume items will flow in later—they’re not lists that must be fully specified from the start.

&emsp;Are there no differences at all? There are differences, but they’re differences of degree, not kind.

- Item size and independence: maintenance items are small-grained and often independent; new-development items tend to be larger with strong inter-item dependencies  
- Predictability of incoming work: maintenance has many sudden inflows, so you can’t fully decide next week’s work this week; new-development is (comparatively) easier to plan  
![Figure 1: Differences between New Development (left) and Maintenance & Operations (right)](/img/blogs/2026/0910_2_scrum_for_maintenance_teams/fig02_01.png)

- Stakeholder expectations: new-development teams are asked “when and what will be delivered?” while maintenance teams are asked “how quickly and reliably can you fix it?”

&emsp;These factors may justify changing operational parameters (see Part 1)—sprint length, goal-setting style, capacity allocation—but they’re not reasons to decide whether to do Scrum or not. It’s the same mindset; only the parameters (how you adjust them) differ.

## The “Other Half” That Scrum Doesn’t Define
&emsp;Let’s go one step further. What we’ve discussed so far concerns backlogs and prioritization—the work-management side that Scrum defines. But if you reread the Scrum Guide, you’ll notice something: Scrum does not define “how to build” anything. How to write tests, how to maintain design, how often to integrate and release … these lie outside Scrum.

&emsp;This “other half” of Agile has been borne by engineering practices exemplified by XP (Extreme Programming): automated testing (and test-driven development), refactoring (improving internal structure without changing behavior), continuous integration (frequent integration with automated builds and tests), small releases, simple design. Many teams that introduce Scrum alone and then struggle—“nothing working comes out each sprint,” “speed keeps dropping”—are missing this half. They have only the management framework, without the engineering foundation to turn it into working product.  
![Figure 2: You can’t create anything with Scrum alone](/img/blogs/2026/0910_2_scrum_for_maintenance_teams/fig02_02.png)

## Maintenance & Operations Are the Best Stage for Strengthening That “Other Half”
&emsp;When development teams steeped in waterfall culture transition to Agile, their biggest obstacle is the habit (or desire) to “decide everything before building.” Drawing Gantt charts, fixing requirements, finalizing design, then implementation … many teams struggle for months, even years, to let go of this habit.

&emsp;Now look at the world of maintenance and operations.  
&emsp;No one knows which bugs will be reported next month. Everyone has learned viscerally that there’s no point in creating a detailed plan for six months ahead. In other words, **the state of “not deciding everything upfront” is already unintentionally achieved**. The habit teams struggle to let go of simply doesn’t exist as an environmental option.

&emsp;Here’s the crux: day-to-day maintenance work is itself a practice ground for XP engineering practices.

- **Automated Testing**: When fixing a bug, the most natural procedure is “first write a test to reproduce it, then make it pass.” Expanding the regression-test suite to ensure the fix doesn’t break in the next change is also accepted as “obvious” in maintenance. This starkly contrasts with many immature Agile projects where the misconception (or excuse?) “tests can wait until just before release” prevails unchecked.  
- **Refactoring**: Maintenance changes are small-grained. The habit of “clean up the touched code a little before committing it back” each time is the only realistic way to keep code healthy without big rewrites, and maintenance work gives developers many opportunities to practice.  
- **Continuous Integration and Small Releases**: Because items are independent, each can be integrated and delivered one by one. The cycle of “complete a small piece and deliver it” is short, and the incentives and returns for investing in build/test/deploy automation are even clearer than in new development.  
- **Definition of Done** (the team agreement on what counts as “finished”): Experiencing “done” many times each sprint earns you far more practice runs of estimation, splitting, and agreeing on “what done means” than in new-development projects. The inspect-and-adapt rhythm also continues seamlessly into daily work through incident retrospectives and recurrence prevention.

&emsp;Viewed this way, it’s not that “Scrum doesn’t fit maintenance and operations,” but rather that, if you want to master both Scrum’s management framework and XP-style engineering techniques, maintenance and operations are an excellent stage.

## But Let’s Also Recognize the Limitations
&emsp;However, there are limitations. Maintenance and operations make it easy to hone craftsmanship, but there are two Scrum-management skills that are hard to practice there:

1. The ability to “bundle” work under a Sprint Goal. If you only handle small, independent items, the goal tends to degenerate into “finish this sprint’s items.” You won’t naturally practice grouping disparate tasks into a single objective unless you deliberately focus on it.  
2. Decision-making around value prioritization. When faced with bugs that “must obviously be fixed,” opportunities for the Product Owner’s “muscle training” of prioritizing what to build and what not to build based on delivered value diminish.

&emsp;Having seen many teams of near-Agile beginners dive straight into production development and fail, I believe the approach of “first build craftsmanship skills in maintenance & operations” → “then in new development tackle sprint goals and Product Owner skill training while progressing development” is well worth considering.

&emsp;Especially in Japan, investment in these craftsmanship skills tends to be structurally lacking. Many executives view Agile in the “fast and cheap” context. As a result, team composition prioritizes unit cost, training investments are skipped, and teams lack solid craftsmanship abilities from design through coding and testing. It’s not uncommon to see a team that’s had Scrum training but no one has done test automation or refactoring call themselves “starting Scrum” and then dive into production development. The blame should lie not with individual engineers but with the composition and investment decisions.

&emsp;Of course, under cost-cutting constraints, those decisions can be rational in the moment. A series of rational choices leading to unintended results—this pattern will recur in our upcoming discussions on upgrade projects.

&emsp;In my view, this is one of the major causes of Agile development failures. Proposing maintenance and operations as a training ground is also a proposal to rebuild this craftsmanship foundation in day-to-day work.

&emsp;What I’d like executives to expect, instead of “fast and cheap,” are measurable changes such as “shorter lead time for individual changes,” “fewer incidents in cutovers and releases,” and “narrower deviation ranges in estimates.” I plan to cover these in future installments of this series.

&emsp;And of course, I want them to view the development team as a “value-creation engine,” not as a cost center to be shaved down, but as **an entity to invest in and develop**.

## Remedies for Common On-the-Ground Challenges
&emsp;When applying to maintenance and operations, here are some remedies for challenges you’re likely to encounter:

**Unable to Set a Sprint Goal**  
&emsp;As mentioned earlier, setting goals may be quite difficult. For teams that have been running sprints for just a few months, you might as well cut to the chase: don’t force goal setting yet. Instead, focus first on basic engineering practices—incorporating automated testing and refactoring into daily routines.

&emsp;Of course, I’m not suggesting you ban goal setting. You’ll get stuck if you try to set goals in terms of a “feature bundle.” Thinking in terms of improvement, reduction, or stabilization makes it easier. “Halve this month’s alert count,” “complete automation to eliminate this procedure manual,” “turn the top three inquiry types into FAQs to reduce inquiries.” These are valid sprint goals and also practice your bundling ability.

**Plans Wrecked by Interruptions**  
&emsp;For the first one or two sprints, record the number, duration, and sources of interruptions, and design capacity by allocating “planned slots” and “interruption slots” based on actual ratios rather than intuition. Detailed practices (how to record, rotating duty, unified intake, etc.) will be covered around Part 12.

**Sprints Themselves Don’t Fit the Reality**  
&emsp;If interruptions regularly make up more than half your work, don’t cling to Scrum—seriously consider combining or migrating to Kanban (a method that manages work in flow without sprint timeboxes). Kanban, which pulls in work as it flows and improves flow speed and bottlenecks, naturally fits flow-centric environments. Scrum is a means, not an end. “Stopping Scrum” doesn’t mean “stopping Agile.”

## Why Has This Question Been Asked Repeatedly for 30 Years?
&emsp;The reason is simple: most Agile explanations, training, and success stories have implicitly featured “teams developing new features” as their protagonists. Even though the majority of readers work in maintenance and operations, the heroes of the materials have always been new development teams. Moreover, in Japan, waterfall development is taught thoroughly in new-employee training, while Agile is barely covered. The “lack of materials” condition starts at the very beginning of one’s career.

&emsp;That’s why practitioners in maintenance and operations feel the same anxieties with each generation change: “Are we the exception?” “Are we being deprived of opportunities to encounter new approaches?”

&emsp;However, as this article has shown, the exception lies not in the actual work but in the premises of the materials. The Scrum stage set-up of “in an unpredictable environment, deliver small increments and learn as you go” is fully in place. On top of that, practice problems for the craftsmanship techniques that Scrum doesn’t define flow in every single day.

&emsp;How about thinking that maintenance and operations are not on the periphery of Agile, but rather **the place where its legs and lower body are built**?  
![Figure 3: Maintenance & Operations are the gym for Agile practitioners](/img/blogs/2026/0910_2_scrum_for_maintenance_teams/fig02_03.png)

---
*Next: "How to Address 'Current Functionality Assurance' in Upgrade Projects?"*
