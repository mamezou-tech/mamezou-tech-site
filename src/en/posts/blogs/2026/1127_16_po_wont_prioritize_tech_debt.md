---
title: >-
  【Agile FAQ Part 16】The PO Won't Prioritize Repaying Technical Debt (and a
  Bonus: Why Test Automation Has Not Taken Hold in Japan)
author: tomohiro-fujii
date: 2026-11-27T00:00:00.000Z
tags:
  - スクラム
  - アジャイル
  - アジャイル開発
translate: true

---

&emsp;Thank you for reading this article. I am Tomohiro Fujii, a member of the Agile Group.
&emsp;In Part 11, I wrote that the fundamental solution to the “test deferral” pattern—where testing is pushed outside the Sprint—is to invest in test automation, and that I would cover that topic in a future installment. This is that installment. Test automation is also the clearest example of repaying technical debt.

:::info
The Agile FAQ series index is here 🫱 [Agile FAQ](/agile/#アジャイルfaq)
[Previous article 👈 【Agile FAQ Part 15】The PO Is Too Busy to Come to the Team](/blogs/2026/11/27/15_self_organization_leader_decides/)
:::


## Question

&emsp;We have been adding PBIs for refactoring and infrastructure improvements to the backlog, but they are constantly pushed back by feature development. Even when we speak with the PO, the conversation ends with a single remark: “But it works, right?” As developers, we can feel that the code is becoming harder to work with every day. How can we persuade them?

## Answer

&emsp;This question usually combines the following three concerns.

- The PO does not understand technology, so perhaps they do not grasp the seriousness of the debt.
- How should we respond to “But it works, right?”
- Why should we need the PO to approve quality-related matters in the first place?

&emsp;I will start with something that may be hard to hear: the reason it does not get through is not that the PO does not understand technology. It is that you have not translated the impact of the debt into the PO’s language—value, speed, and risk.
- “The code is messy” sounds like a matter of a developer’s aesthetic sensibilities.
- The response to “But it works, right?” should not be based on grievances about the past, but on predictions about the future.
- And the third question actually gets to the heart of the matter. You should reduce the very structure in which the PO must approve “PBIs dedicated to repaying debt.” **Quality is not something to be obtained through negotiation; it is something to be woven into everyday development.**
&emsp;In short, there are two things: “translation” and “weaving it in.”

![Figure 1: Appealing to aesthetic sensibilities, or translating into predictions about the future](/img/blogs/2026/1127_16_po_wont_prioritize_tech_debt/fig16_01.webp)

## Did You Not Feel Like Arguing Back Against the Advice, “Put Technical Debt in the Backlog and Have the PO Prioritize It”?

&emsp;“Turn technical debt repayment into PBIs, add them to the backlog, and have the PO prioritize them based on value.” That is the model answer in training courses, but developers may feel like responding as follows.

- If customer-visible features and invisible infrastructure improvements are compared on the same playing field, is it not obvious that features will take priority?
- They say the PO should judge “value,” but can the PO judge the value of internal code quality?
- In the end, do we not have any choice but to fix things secretly in between feature development work?

&emsp;To state the conclusion first: **the moment you step onto the “features vs. debt” playing field, you have already lost.** What the PO can judge is not internal quality, but what that quality will bring to future speed and risk. And “fixing things secretly” is the worst choice; instead, “weave it in openly.”
&emsp;…Even so, you may find it difficult to accept immediately.

&emsp;Following the pattern of this series (you are getting used to it by now, right?), let us first look at how debt tends to be handled, and then return to the explanation.

## Technical Debt Anti-Patterns

&emsp;Teams struggling with debt tend to fall into several anti-patterns. As you read, think about the bottom section of your own team’s backlog.

**Pattern 1: Perpetually Last Place**—This is the most common pattern. You add “refactoring PBIs” to the backlog and place them alongside features. To the PO, one looks like “value visible to the customer,” while the other looks like “something invisible to the customer.” In a zero-sum comparison, there is no reason for the invisible thing to beat the visible one. This is the contest the questioner loses every time.

**Pattern 2: Aesthetic Appeal**—This pattern appeals with phrases such as “the code is messy,” “the design is not elegant,” or “it feels wrong.” It is true that developers experience the pain every day, but because that experience has not been turned into numbers and causal relationships, it sounds like a matter of personal taste to the PO. The more strongly you appeal, the stronger the impression becomes that developers are being selfish.

**Pattern 3: Hidden Repayment**—This pattern quietly slips substantial rebuilding work into feature-development PBIs. It may work in the short term, but if discovered, it destroys trust, and every subsequent translation will be viewed with suspicion. You will no longer be able to explain why estimates have suddenly increased, and talking about debt itself becomes taboo.

**Pattern 4: Waiting for a Major Repayment**—This pattern sacrifices quality in daily development while thinking, “Someday we will take a Sprint dedicated to repayment and fix everything at once.” As long as sacrifice is the norm and repayment is the exception, debt will increase monotonically. Bulk repayment has a high approval hurdle, and even if it is approved, “feature development stops during that time,” making the next approval even harder to obtain. The day of repayment you are waiting for will never come.

![Figure 2: Technical debt anti-patterns—perpetually last place, aesthetic appeal, hidden repayment, and waiting for a major repayment](/img/blogs/2026/1127_16_po_wont_prioritize_tech_debt/fig16_02.webp)

## Where Does the “Features vs. Debt” Playing Field Come From?

&emsp;All four patterns share one idea: the assumption that **quality is something acquired in exchange for features.** If quality is exchanged for features, then you have no choice but to make them compete on the same playing field (perpetually last place). If debt loses that competition, it is because your appeal is weak (aesthetic appeal). If it cannot pass through the front door, you obtain it through the back door (hidden repayment). And you wait for the day when you can obtain it all at once (waiting for a major repayment). The four patterns are a list of strategies derived from this assumption.

&emsp;Let us remove that assumption and reread the three concerns.

&emsp;First, **the point that invisible improvements cannot win if compared on the same playing field as visible features.** That is correct. Therefore, reduce the number of times you step onto that playing field. Most debt should be repaid little by little within daily feature development, rather than through PBIs dedicated solely to repayment. Limit the debt you bring onto the playing field to only the critical points with a broad impact. Then, you can turn it into a contest you can win.

&emsp;Next, **the point of whether the PO can judge the value of internal quality.** They cannot. That is not what you should ask them to judge. “But it works, right?” is a legitimate question from the PO’s perspective. Repaying debt is an investment, and investments require justification. The information a PO needs to make an appropriate decision is: “This modification used to take three days six months ago, but now takes eight days,” “Three out of the last five changes in this area have caused production defects,” or “If we continue this way, the estimate for the △△ feature next fiscal year will double”—in other words, speed, risk, and predictions about the future.
&emsp;What is missing from the developers’ work is translating this into the PO’s language. Once translated, debt becomes an enemy not only for developers but also for the PO, and repayment comes to be seen as an investment the PO should make.

&emsp;And then, **the point of whether there is no choice but to fix things secretly.** The opposite is true. Instead of fixing things secretly, weave them in openly. Make “leave the place you touched a little cleaner than when you found it” not an individual’s hidden work, but an official team standard explicitly documented in the Definition of Done.
&emsp;Just as a doctor does not ask a patient to approve disinfection before surgery, **the quality standards of work performed by professionals are not matters requiring PO approval.** The difference from the hidden repayment pattern is that what you are doing is disclosed.

&emsp;**Where does the idea that “quality is exchanged for features” become ingrained?** It is because the effects of technical debt emerge later, and in a different place. The loss caused by reducing quality today appears months later as delays to a different feature, and no ledger records it under an item called “interest on the debt incurred back then.” As with the loss caused by the absent PO discussed in Part 13, losses with invisible causal relationships naturally continue to be left out of decision-making. When this is compounded by the expectation of “faster and cheaper” we saw in Part 2—the continuing pressure to reduce costs—investments in new technologies such as test automation and refactoring are among the first things to be cut, and only the speed at which debt accumulates increases (we will examine why test automation is a typical example in the bonus section at the end). Nobody is being lazy. The causal relationship is simply invisible.

&emsp;So how should technical debt really be handled? If we apply the three pillars of empiricism, it takes the following form.
&emsp;**Transparency**—The impact of debt is visible not as developers’ subjective experience, but as numbers such as modification lead time, change failure rate, and estimation bias.
&emsp;**Inspection**—Those numbers are turned into predictions about the future to identify which debt is critical.
&emsp;**Adaptation**—Critical points are brought into decision-making as investments, while everything else is woven into daily development. When repayment produces results, report them with numbers.

&emsp;Viewed in this light, we can see what the aesthetic appeal pattern lacks. Transparency stops at subjective experience, and neither inspection (identifying the critical points) nor adaptation (deciding what to weave in and what to put forward as an investment) has begun. Move from “negotiating to obtain quality” to “translating it and putting it forward as an investment, while weaving in the rest.” Change the playing field itself.
&emsp;Once this changes, all of the following prescriptions point in the same direction.

## Prescriptions

&emsp;The following is a list of tools; you do not have to do all of them. However, if you simply stop after saying, “We adopted the Boy Scout Rule,” you have merely given hidden repayment a new name. After trying these approaches, judge their effectiveness by whether modification lead time has shortened and whether conversations with the PO have changed from “But it works, right?” to “What is the basis for that prediction?”

**First, record modification lead time and change failure rate**
&emsp;Before persuasion comes record-keeping. The material for persuasion is not developers’ intuition, but data. In Part 2, I wrote that the measurable changes you should want executives to expect are: “lead time for one change becomes shorter,” “fewer incidents occur during cutovers and releases,” and “the range of estimation error becomes narrower.” The same measures are used to measure the impact of debt. The following, for example, are effective.

- **Growth in modification lead time**: “Changes around ◯◯ used to take three days from start to delivery six months ago, but now take eight days. If this trend continues, the estimate for the △△ feature planned for next fiscal year will double.”
- **Change failure rate**: “Three out of the last five changes in this area have caused production defects.”
- **Estimation bias**: “During planning, only PBIs that touch this screen have estimates that spike every time. This structure is the reason.”

&emsp;You can begin recording these today. Once you have accumulated data over several Sprints, subjective impressions become numbers and causal relationships.
&emsp;Yes, you can gain the weapon of those without power.

**Translate into the language of the PO—or more precisely, the language of those who control the budget**
&emsp;Once records have accumulated, speak not of grievances about the past, but of predictions about the future. “If we continue this way, the features you want to build will become this much slower and more dangerous.” Reframe the situation so that debt is the PO’s enemy and repayment is the PO’s investment. Translation is completed by the behavior of the recipient as well. If developers speak in numbers and causal relationships, POs and those who control the budget should respond with numbers whether they adopt or reject the proposal; if they reject it, they should leave that decision in the record. If your relationship changes from “But it works, right?” to “What is the basis for that prediction?”, then this topic **becomes a shared investment decision rather than a negotiation.**

**For major repayment, narrow down proposals based on return on investment**
&emsp;Once you can translate, the next step is selection. Do not try to repay every debt that concerns you. Focus on critical points with broad effects: “Fixing this will make all future development in the ◯◯ area faster.” Propose them together with their expected effects. Once repayment actually produces results—for example, modifications return to taking three days—be sure to report that to the PO. Accumulating these successful experiences builds credibility for the next proposal.
&emsp;For teams burdened with the test deferral pattern discussed in Part 11, the first critical point is usually test automation. “Manual regression testing takes ◯ person-days every Sprint,” and “◯ percent of carryover work is waiting for testing”—with these two figures, automation can be proposed not as “what developers want,” but as “an investment that reduces carryover and enables faster releases.” If you begin with regression testing for flows with high business impact, you can demonstrate effects quickly.

**Weave it into everyday work—the Boy Scout Rule**
&emsp;In parallel, incorporate mechanisms into daily work to prevent debt from growing and to reduce it little by little. “Leave the place you touched a little cleaner than when you found it”—this is the “Boy Scout Rule” popularized by Robert C. Martin. Along with a feature-development PBI, make small improvements in the surrounding area. This is not a matter requiring PO approval; it is a quality standard for professional work, one that should be explicitly documented in the Definition of Done and made an official team standard.
&emsp;However, disclose and explain to the ordering side what is included as “quality work included in the Definition of Done.” Estimates naturally include that effort, and that should also be disclosed. Revise the Definition of Done through team agreement, and if there is a department responsible for quality standards, file the change and keep it on record so that it can be explained in an audit. Do not put the trade-off of “we can go faster if we reduce quality” on the negotiation table in the first place.

**If large-scale repayment is still necessary, put it into decision-making without hiding it**
&emsp;In some cases, years of accumulated debt require major rebuilding that cannot be addressed merely by weaving improvements into normal work. What you must not do at that point is hide the work inside feature-development PBIs and undertake it on your own. Show the scale, risks, and expected effects, and have it evaluated as a business decision. If it is postponed, record its impact—development will become slower and the system more likely to break—and propose it again once the facts have accumulated. Integrity is the strongest negotiating resource in this discussion.

![Figure 3: Translate, invest in critical points, and weave the rest into daily development](/img/blogs/2026/1127_16_po_wont_prioritize_tech_debt/fig16_03.webp)

## Why Has This Question Been Repeated for 30 Years?

&emsp;As we saw in the section on assumptions, the structure that makes the causal relationship of losses difficult to see is one reason. In addition, developers themselves fall into the same trap across generations. They express pain as a feeling, it is dismissed as a matter of aesthetics, they give up and stay silent, and debt accumulates further. Only diligent record-keeping that translates feelings into numbers and causal relationships can break this chain. The habit of translation is worth acquiring before any refactoring technique.
- Is modification lead time being recorded?
- Are the effects of repayment being reported in numbers?
- Is quality work explicitly documented in the Definition of Done?

&emsp;These three are gauges for measuring whether a team is treating debt as an investment rather than as a negotiation.

## Bonus: Why Has Test Automation Not Become Widespread in Japan?

&emsp;In Part 11, we looked at the “test deferral” pattern of teams that continue to conduct tests manually. When I discuss this topic in the field, I often hear the response, “We understand that automation is important. But it will not work in our organization.” Why does it not work? I would like to offer my own view by going back a little in history.

&emsp;For a long time in Japan, regardless of industry, “cost reduction” was the most important keyword in management. System development was no exception. And as a method of reducing costs, test automation had one structural disadvantage: **the investment comes first, and the benefits come later.** It takes a substantial amount of effort to write test code, set up the execution mechanisms, and make them maintainable. That effort is recovered only after running the same tests dozens or hundreds of times. At the time of budget approval, the money going out is clear, while the money coming back is only a “future prospect.”

&emsp;Meanwhile, during the same period, there was a more easily understood solution: run tests using lower-cost labor. If manual testing is moved to low-cost arrangements, including offshore operations, the amount of testing remains the same while only the unit cost of labor goes down. Cash outflow decreases beginning that month, and the effect appears in the next quarter’s numbers. While automation was a matter of “investing now and recovering the cost over several years,” this was a matter of “working immediately in the current fiscal period.”

&emsp;When asked which to choose, many organizations chose the latter, and on the measurement scale of that time, it was a rational decision. In Part 2, I wrote that under the constraint of cost reduction, team composition is prioritized by unit cost and investment in the ability to create things is omitted. Test automation was a representative example of what was “omitted.” In this way, the assumption that “testing is something done manually” was passed down for years and generations. It was simply the accumulation of rational choices in the same direction at each point in time.

&emsp;However, that assumption cannot withstand today’s speed. The cost of manual testing increases in proportion to the number of releases. In an era when releases happened twice a year, it was manageable to run regression tests manually each time. If you release every two weeks, however, you run the same regression tests 26 times per year. No matter how much you reduce the unit cost, if the number of times increases more than tenfold, the total cost cannot keep up. Moreover, manual testing involves waiting time—from requesting the tests until receiving the results—and that waiting time directly adds to lead time. In Part 11, we saw testing fail to fit within a Sprint and pile up just before release. A solution based on lowering unit costs becomes not a solution but a bottleneck when faced with the speed of Sprints.

&emsp;Therefore, discussions about test automation need to leave the “cost reduction” playing field. Automation is not an investment to make testing cheaper; it is **an investment that enables verification quickly and repeatedly.** In this installment’s prescriptions, we discussed translating debt into “predictions about the future.” The same applies to test automation: speak about the two figures mentioned in the prescriptions not in terms of unit cost, but in terms of frequency and waiting time. Then the discussion shifts from “how much cheaper will it become?” to “how much faster can we deliver?”

&emsp;And this assumption is now beginning to collapse from another direction as well: generative AI has become able to write test code. The greatest barrier to test automation—the “investment comes first” part, namely the effort of writing out tests—has shrunk significantly. Even when measured by the cost-reduction yardstick, automation is becoming less likely to lose. I believe it is fair to say that a long-postponed investment is finally receiving favorable winds.
&emsp;However, what AI can take over is only the effort of writing tests. Deciding what should be verified—which business flows must not stop, which behavior is specified, and which behavior is a bug—still requires human judgment. Moreover, if AI writes both the code and the tests, they tend to share the same assumptions, and the tests merely reproduce “what the code does.” In Part 5, we discussed treating the existing system as the specification and locking it down with characterization tests. If you have AI write tests, humans must decide the perspectives from which to verify things, and people who understand the business must verify the correctness of the tests. As long as you do not lose sight of that, AI can be a powerful tool for advancing an investment that has not progressed in this country for 30 years.

![Figure 4: A solution that lowers unit costs becomes a bottleneck as the number of releases increases](/img/blogs/2026/1127_16_po_wont_prioritize_tech_debt/fig16_04.webp)

---


*Next time: “How Much Documentation Should We Write?”*

:::info
The Agile FAQ series index is here 🫱 [Agile FAQ](/agile/#アジャイルfaq)
[Previous article 👈 【Agile FAQ Part 15】The PO Is Too Busy to Come to the Team](/blogs/2026/11/27/15_self_organization_leader_decides/)
:::
