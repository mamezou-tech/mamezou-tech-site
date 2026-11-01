---
title: >-
  【Agile FAQ Extra Edition (A Theoretical Discussion of Estimation)】Although
  Story Points Are Supposed to Eliminate Individual Dependence, They Differ by
  Person
author: tomohiro-fujii
date: 2026-10-21T00:00:00.000Z
tags:
  - スクラム
  - アジャイル
  - アジャイル開発
  - プロジェクト管理
translate: true

---

&emsp;Thank you for reading this article. I am Tomohiro Fujii, a member of the Agile Group.
&emsp;As I was writing Part 9 (converting to person-days), the discussion expanded around the question, “What exactly do story points measure?” and would no longer fit within the main article. So I have separated it out as an extra edition. Rather than following the usual question-and-answer format, this is a **theoretical** installment that follows a single question through to the end.
&emsp;But I like this kind of thing, you know. I really do.

## The Question That Had Been Bothering Me

&emsp;I have been asked the same question several times by people who came from workplaces that used function points (FP). “FP is an objective size measure that eliminates individual dependence: if you follow the counting rules, almost anyone will arrive at the same value. I heard that story points also eliminate individual dependence by using relative values, yet different team members give the same item a 3 or an 8. If this is supposed to be an estimate that eliminates individual dependence, isn’t something wrong if the estimated value differs depending on the person?”

&emsp;To be honest, I myself had held this question for a long time. Training materials explain it this way: “Person-days differ depending on the person, but the ratio of sizes is the same no matter who looks at it. Therefore, estimating with relative values can eliminate individual dependence.” If so, why do values differ in Planning Poker? If differences are expected, what exactly has been eliminated by saying that it “eliminates individual dependence”? With FP, values do not differ if you count according to the rules, so why not do that?

&emsp;The answer has two layers. The first is that the word “individual dependence” refers to two different things, and story points eliminate only one of them. The second is that Agile planning does not rely on accuracy at the time of estimation in the first place. Let us examine these in order, starting with the first layer.

## There Is More Than One Kind of Individual Dependence

&emsp;The first is **dependence on the person doing the work**. The same item may take two days if done by Person A, but six days if done by Person B. The second is **dependence on the person making the estimate**. Person A judges the same item to be a 3, while Person B judges it to be an 8.

&emsp;FP is a measurement method intended to eliminate both of these. It counts externally observable functions—inputs and outputs, inquiries, internal files, and external interfaces—using rules. Therefore, the value does not depend on who builds it, and if the measurers are trained, their counts converge on similar values. FP is “measurement,” and measurement is an activity that aims to produce the same value when the same object is measured using the same procedure.

&emsp;Story points deal only with the first kind of individual dependence. Moreover, they do not eliminate it; they sidestep it. For Person A, an item may take one day and another may take two days. For Person B, they may take three days and six days. Even if the absolute values differ by a factor of three, the ratio—“the latter is twice the former”—is the same. When estimating an item without knowing who will take it, retaining only the ratio makes the estimate usable regardless of who does the work. This is what “relative values can eliminate individual dependence” actually means: **what is expected is the invariance of the ratio, not the objectivity of the absolute value**.

&emsp;The second kind—the difference caused by the person making the estimate—is not eliminated from the outset. Story points are not measurements but judgments, and they are based on “that team’s scale.” The standard for that scale is not a counting rule but a reference story—an actual item such as “a modification to the login screen is a 3.” Therefore, values differing between estimators is not a defect; it is a feature of relative estimation.

![Figure 1: Two kinds of individual dependence—dependence on the person doing the work and dependence on the person making the estimate](/img/blogs/2026/1021_ex_what_do_story_points_measure/figex_01.webp)

## They Differ Because That Is How They Are Designed

&emsp;Planning Poker takes the form of “everyone reveals their value simultaneously, and if the values differ, discuss them” because the differences themselves are used as information. If the values split between 3 and 8, then either one side knows of a landmine that the other does not, or they interpret the requirements differently. The person who gave a 3 may know an easy way around the issue, while the person who gave an 8 may have been burned in the same area before. After putting those perspectives on the table, the team converges on a single value. Variation between estimators is not something to eliminate; it is a detector for finding differences in understanding. And the procedure for converging is the work of calibrating the scale (ah, it reminds me of the experiments for my graduation thesis...).

&emsp;If you average the split here and make it a 5, it is quick, but you throw away the information contained in the disagreement. A 5 is nobody’s judgment. Deciding based on the value from the most knowledgeable person will often get you closer to the correct value, but that is “that person’s scale,” not “the team’s scale.” In a sprint when that person is absent, or after they leave, the scale will shift. You can eliminate disagreement by creating a rule table and counting, for example, “one screen is 3, one table is 2,” but difficulties not covered by the rules—landmines in legacy code, ambiguous requirements, unfamiliar technologies—disappear from the number, and **the more objective the points become, the further they move away from this team’s actual sense of the work**. There are many ways to eliminate disagreement, all of which arise from the assumption that “points should be objective measurements,” and all of which stop the calibration of the scale.

![Figure 2: When values split between 3 and 8—average them, follow the most knowledgeable person, or discuss and converge](/img/blogs/2026/1021_ex_what_do_story_points_measure/figex_02.webp)

&emsp;What story points aim for is **not objectivity, but consistency within the team**. Still, people familiar with FP may not be convinced merely by being told that “they do not need to be objective.” How can the accuracy of a number that is not objective be ensured? This question leads to the second layer.

## Where Is Accuracy Created?

&emsp;The product of estimation is not a number, but a judgment. By assigning points, you are deciding three things: “Is it safe to include this in the sprint?”, “Should it be split?”, and “Should we investigate it first?” It does not decide much beyond that. The level of accuracy needed for these judgments can be coarse. Whether something is a 3 or a 5 rarely changes the decision; whether it is a 3 or a 13 does. That is why the point scale skips values—1, 2, 3, 5, 8, 13—and those gaps are a declaration that “we distinguish only differences of roughly this magnitude.” Points turn experience-based judgments into numbers to use as material for decisions. Even with errors, they are sufficient as long as those errors are not large enough to change the decision.

&emsp;For the other use—adding up points and dividing by velocity to get an outlook—individual errors offset each other as they accumulate. An item judged as a 3 that turns out to be a 5 and an item judged as a 5 that turns out to be a 3 cancel each other out in the total. Therefore, variation is not a problem. What is a problem is bias: bias such as everyone inflating estimates in the same direction remains in the total rather than being canceled out. Inflating numbers in order to “stabilize” velocity is problematic because it creates bias, not variation.

&emsp;So why is it possible to use coarse judgments without errors becoming too large? This is the key to Agile planning: errors are determined not by the estimation method, but by **the size of what is being estimated** and **the time until you can compare it with the actual result**. If items are small, an 8 will not become an 80. Since error is proportional to the size of the item and to uncertainty, making items small and resolving uncertainty in advance through refinement keeps the upper bound of error small even if the judgment is coarse. If sprints are short, you will know within a few weeks that a judgment was wrong, and can reflect that in the next judgment. The same is true of not taking on too many things at once: the fewer items running simultaneously, the less one miss affects the others. Agile controls error not by increasing estimation accuracy, but by **creating a structure in which estimation errors cannot become large**.

&emsp;There is no point discussing estimation methods or accuracy without discussing this structure. This is the deepest aspect of the contrast between FP and story points.
&emsp;FP requires accuracy at the time of estimation because it assumes the scope is fixed at the beginning and there is no mechanism for reducing error afterward. If the estimate is wrong, there is no later opportunity to compensate for it. Therefore, accuracy must be created upfront, requiring rules that produce the same value no matter who counts.
&emsp;Story points can work with coarse judgments because the place where accuracy is created is not at the time of estimation, but in the surrounding mechanisms—small items, short sprints, refinement, and actual velocity.
&emsp;**The difference between FP and points is not a difference in the level of accuracy, but a difference in where accuracy is created**. The answer to the opening question, “Why not count using rules?” is not “because objectivity is unnecessary,” but “because we are not betting on accuracy at the time of estimation.”

![Figure 3: Where accuracy is created—at the time of estimation, or in the mechanisms surrounding estimation](/img/blogs/2026/1021_ex_what_do_story_points_measure/figex_03.webp)

## Where Did Individual Dependence Go?

&emsp;Let us return to the first layer and answer the question of whether individual dependence has disappeared. It has not. It has merely been placed somewhere different.

&emsp;FP makes size objective, but in exchange it separately requires various “coefficients that adjust for characteristics and reflect productivity” when converting size into effort—for example, how many hours per FP this team using this technology requires. Individual dependence has been pushed into these coefficients. The division of responsibilities is: size is objective, coefficients are team-specific.

&emsp;Story points assume that the estimating team and the development team are the same, and incorporate team-specific conditions into the estimate itself. Any remaining calibration mismatch is absorbed into velocity. Even if the scale is somewhat distorted, velocity is measured with the same distortion, so predictions remain accurate. Individual dependence has been pushed into velocity. The division of responsibilities is: both size and scale are team-specific, and therefore velocity is also team-specific. The mechanisms mentioned in the previous section that shorten “the time until you can compare with the actual result” perform this absorption every sprint.

&emsp;In both approaches, individual dependence is not eliminated; it is merely placed somewhere different. Seen this way, one could say that story points are more honestly self-contained. With FP, “objective size” and “team-specific coefficients” are handled by different people in different places, so the coefficients tend to be neglected. With story points, estimating, building, and measuring are all contained within one team, so distortions cancel each other out automatically.

![Figure 4: Where individual dependence is placed—FP puts it in productivity coefficients, points put it in velocity](/img/blogs/2026/1021_ex_what_do_story_points_measure/figex_04.webp)

## So, What Do Points Measure?

&emsp;Now we can say it. Story points are the team’s **experience-based judgment** of the **size** of what is to be built—a combination of quantity, complexity, and uncertainty—expressed as a relative value using the team’s scale. They are not measurements but judgments, and the more important product is not the number itself but the decisions made using it.

&emsp;While effort is a measure on the input side—“the time people invest”—size is a measure on the side of the thing being built. Velocity connects the two, holding as an observation after the fact a conversion factor that says, “This team can complete work of this size at this pace.” Therefore, points are not “another name for effort.” Nor are they “objective size” like FP. They are a currency of size valid only within the team.

&emsp;Let us return to the opening question. Story points are not estimates that eliminate individual dependence; they are **team-specific estimates**. What they eliminate is only the absolute value of “who will do the work,” and even that is merely shifted into ratios. Differences among estimators are not something to eliminate, but material for reaching agreement. And the conditions that make this approach work are not objectivity, but that estimating, building, and measuring are contained within the same team, and that there is a surrounding structure in which deviations cannot become large.

&emsp;The moment you use them in a way that is not self-contained, the team-specific nature of the scale is exposed and breaks down. Comparing points across teams. Having one team estimate and another team build. Taking them outside through a conversion table. The four patterns discussed in Part 9 were all such “non-self-contained uses.” This is also the root of the distinction written in that article: “The converted value is the cost of an item; velocity is the flow rate of a team.” Because flow rate is measured using a scale that has meaning only within the team, it begins pretending to be a cost the moment it is taken outside the team.

## A Few Modest Practices for the Workplace

&emsp;That is enough theory; there is not much to do in practice.

&emsp;The standard for the scale is a reference story, so choose two or three actual items and decide, “These are a 3,” then refer to them every time you estimate. When team members change, review the reference stories together with the new members. A scale is not a rule but a shared memory, so you need a procedure for passing that memory on.

&emsp;When values differ, talk rather than average. Simply having the people at both ends state their reasons in a sentence or two will usually reveal either a landmine or a misunderstanding. If you cannot converge, split the item or schedule investigation first.

&emsp;When you want to improve estimation accuracy, question the size of the items and the length of the sprint rather than the method. If items of 13 or more are the norm, no amount of polishing estimation techniques will reduce the error. Split them first.

&emsp;Do not take the scale outside the team. As written in Part 9, the numbers to share externally are the schedule and amount derived from total points and actual velocity.

&emsp;And when a contract absolutely requires a basis for a size measure that eliminates individual dependence, do not try to make points objective; instead, use a measurement method such as FP separately. Points are a planning tool; FP is a contracting tool. If you try to use them for both purposes, neither can fulfill its role. For completeness, FP’s objectivity is also an ideal: reports have long indicated that in practice, variation of 10% to 30% occurs between measurers. Still, “counting by rules” and “deciding by agreement” are fundamentally different in principle, so it is enough to keep both as different tools for different purposes.

## Conclusion

&emsp;Many of us have been taught that estimation means “getting the correct value right.” FP is the culmination of that culture, designed to aim for the same value no matter who performs the count. When you encounter story points within this culture, it is natural to feel that “an estimate that is not objective is an immature estimate.” I felt that way too.

&emsp;However, Agile planning does not aim to get the correct value right; it aims to continue updating predictions based on actual results. What matters for that is not that values are objective, but that you continue measuring with the same scale and maintain a structure in which deviations cannot become large. Accuracy exists not inside the estimate, but in the mechanisms surrounding estimation. When points differ within a team, that is not individual dependence being exposed; it is the moment when a difference in understanding has been found. Are you discussing it at that point, and are the items sufficiently small? These two questions are the simplest way to check whether this team’s estimation is functioning as a tool.
