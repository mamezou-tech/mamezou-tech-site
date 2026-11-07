---
title: >-
  【An Agile FAQ That Has Strayed Far Off Course】Why I Am the Chairman of the
  “Unofficial Society for the Eradication of Japanese-Style Agile”
author: tomohiro-fujii
date: 2026-11-02T00:00:00.000Z
tags:
  - スクラム
  - アジャイル
  - アジャイル開発
translate: true

---

&emsp;Thank you for reading this article. I am Tomohiro Fujii, a member of the Agile Group.
&emsp;First, please allow me to introduce myself again. For many years, I have served as the chairman of the “Unofficial Society for the Eradication of Japanese-Style Agile.” The number of members is undisclosed (or rather, I have never counted them). There are no membership fees, and the bylaws and the background behind the society’s founding are included at the end of this article.
&emsp;On the surface, it is a joke. But at its core, I am completely serious. And I am actually asked about this quite often.
&emsp;This time, I would like to explain why I want to eradicate it—not as a part-time worker at Mamezou, but as the chairman of this suspicious-sounding society.

## Question

&emsp;A business partner has proposed an approach called “Japanese-style Agile (hybrid Agile).” They say that requirements will be firmly defined and the budget finalized first, development will proceed in two-week iterations, and integrated testing will be conducted all at once at the end. Since the budget is finalized, it should be easier to obtain internal approval, and it seems well suited to our company. Is there any problem with this?

## Answer

&emsp;The approach itself can be valid as a transitional form. The problem is its name. If requirements and the budget are finalized first, the amount that can be changed afterward is almost no different from change management in Waterfall. Calling that “Agile” causes the client to expect flexibility that they will not actually receive. **If you cannot obtain Agile’s degree of freedom, it is more honest to call it “Hybrid Waterfall.”**
&emsp;And in fact, the desire to know the total budget in advance does not conflict with Agile. What should be fixed is not a list of requirements, but the budget and the objective.

![Figure 1: What should be fixed: the list of requirements, or the budget and objective?](/img/blogs/2026/1102_ex_abolish_japanese_agile/figex3_01.webp)

## What I Want to Eradicate Is Not the “Method,” but the “Sales Pitch”

&emsp;First, let me clarify what exactly I want to eradicate.
&emsp;Proceeding through requirements definition in a Waterfall manner, iterating only during construction, and conducting testing all together at the end: this form has a name, “Water-Scrum-Fall.” It is said to have been named by Dave West of the research firm Forrester as the real-world form Agile takes in many organizations. The earlier phases—requirements and budget approval—and the later phases—testing and release—remain conventional, while only the middle becomes iterative. It is a form that many organizations pass through at least once during their transition to Agile.
&emsp;So I do not intend to criticize organizations simply for being at this stage. As I wrote in the special edition, “When Sound Arguments Don’t Work,” when organizational assumptions cannot be changed, starting with what can be done is the right way to fight.
&emsp;What this society wants to eradicate is the rhetoric of calling this transitional form “Agile suited to Japanese organizations” and selling it as the destination. When it is sold as the destination, the transition—put another way, evolution—stops there.

## Why Does “Japanese-Style” Sell?

&emsp;I understand very well why this sales pitch has a certain appeal.
&emsp;The client wants to know the total budget early. An amount is necessary to obtain internal approval. The vendor cannot win the contract without presenting an amount. At the same time, they cannot sign a contract based on careless numbers. So they try to firmly define the requirements and finalize the budget. Up to this point, it is rational from either perspective. No one is doing anything wrong.
&emsp;The problem comes next.

## The Amount That Can Be Changed Does Not Change

&emsp;Finalizing requirements and finalizing the budget means that subsequent changes become “changes within the budget framework.” Changes that exceed the framework require submitting a change request, estimating the impact, and obtaining approval. This is exactly the Waterfall change management process. Even if the iteration unit becomes two weeks, the total amount that can be changed remains almost the same.
&emsp;Yet the word “Agile” carries the image of being able to make changes flexibly. The client signs the contract based on that image and later wonders, “If this is Agile, why do we receive an estimate every time we make a change?”
&emsp;Within our society, we affectionately call this **signboard fraud**.
&emsp;...That wording may sound harsh, so let me put it more accurately in this article. The seller is not necessarily trying to deceive anyone. In fact, in many cases, the seller also **believes** that they are practicing Agile. But the result is that **the client is led to expect flexibility that they cannot obtain**.
&emsp;The signboard and its contents do not match.

## What Is Lost When the Signboard and the Contents Diverge?

&emsp;If it were merely a matter of naming, perhaps it would not be worth getting upset over. But this mismatch causes real harm. Many of the problems covered in this series become structurally built into this form.

- **Learning does not reach the deliverable**: Since requirements have been finalized, even if a Sprint Review reveals that “this was not what we needed,” what is being built cannot be changed. The reviews that influence no one’s decision-making, which we saw in Part 8, become the norm rather than the exception.
- **You discover mistakes only at the end**: Because testing is consolidated at the end, items “completed” during Sprints have not actually been validated. The test-deferral pattern from Part 11 becomes the official process. Agile’s greatest benefit—discovering mistakes early—disappears there.
- **The effort becomes the sum of both approaches**: Waterfall documentation and approvals remain as they are, and Scrum events are added on top. All that remains in the minds of people on the ground is, “When we became Agile, we had more meetings.”
- **There is no reason to strengthen the fundamentals**: If testing is ultimately performed manually in a batch, there is no need for test automation or CI. This investment, which has long been postponed in business-system environments, can never be justified in this form.
- **The PO returns to being an acceptance inspector**: Because requirements are finalized first, the PO becomes a person who verifies whether something conforms to specifications, rather than a person who decides direction. The “internal subcontracting” structure discussed in Part 8 remains intact.

&emsp;And the greatest harm is the conclusion that remains within the organization as a result of all this. Costs increase, while quality and delivery dates do not improve, and no learning occurs. Since this is carried out under the name “Agile,” the organization is left with the experience-based conclusion that “We tried Agile, but it was not right for us.” What stands in the way of anyone trying the real thing next is the memory of this failure in an environment where precedent-oriented thinking is common. In the special edition “Sound Arguments,” I wrote that organizations which have been hurt in the past by trendy buzzwords become defensive just from seeing the signboard. This sales pitch is what plants those seeds.

## The Total Amount Can Be Presented Up Front

&emsp;So how should we respond to the client’s desire to “know the total budget early”? In fact, Agile does not conflict with this request.
&emsp;If the period and team size are decided, the total amount can be finalized in advance. Instead, the contents are not fixed. Build the highest-priority items, deliver them, look at the results, and reorder the remaining items. Fix the budget and objective, and move the scope. The discussion in Part 4 about estimating without finalizing all features is also based on this idea.
&emsp;In other words, what the client truly wants to know is the total amount, not the finalization of all requirements. Japanese-style Agile finalizes the requirements as well under the pretext of presenting the total amount, and then says, “We are flexible because this is Agile.” That is where the mismatch lies.
&emsp;One question is enough to determine which one your project is.

> **What is fixed in the contract: the list of requirements, or the budget and objective?**

&emsp;If the list of requirements is fixed, then even if you are iterating, the substance is Waterfall. If the budget and objective are fixed, and the contents are treated as a prioritized list of candidates, then you actually obtain Agile’s degree of freedom. Can you swap items without submitting change-request paperwork? That is sufficient for a practical judgment.
&emsp;Of course, changing the form of a contract is not easy. Fixed-price contracts, internal development standards, audit requirements—there are any number of assumptions that cannot be changed. That is precisely why, while they cannot be changed, you should call the approach by an honest name: **Hybrid Waterfall**. With this name, the client can have the correct expectations, and the vendor will not be criticized for flexibility they never promised.
&emsp;The third principle of the special edition “Sound Arguments” was, “If there is substance, do not obsess over the signboard.” This time, the reverse applies: **If there is no substance, do not put up the signboard.**

## New Signboards in the AI Era

&emsp;While we are on the subject, as chairman, I would like to issue a warning about new signboards that may appear in the future.
&emsp;“AI-driven development,” which places generative AI at the center of development, and “Spec-Driven Development (SDD),” in which specifications are written first and AI generates code from them, are attracting attention. On the surface, both take the form of “write the specifications properly first, then iterate rapidly through implementation with AI.” They resemble Japanese-style Agile’s approach of “firmly define requirements and iterate only during construction” to a surprising degree. “The upstream phase matters even more in the AI era. It turns out that the approach of firmly defining requirements before building was correct after all”—I think it is only a matter of time before such a sales pitch appears (or perhaps it has already appeared...).

&emsp;However, the logic goes in the opposite direction. The key point of SDD is not that specifications come first. It is that **the cost of revising specifications and rebuilding is almost zero**. Specifications are written in small units of features or increments. Once you learn something by looking at what works, you revise the specifications and rebuild. Specifications do not become appendices to a contract; they continue to live as files within the repository.
&emsp;In the past, the rationale for doing extensive design in the earlier phase was that “changing things later is expensive.” AI further undermines this assumption that XP sought to overturn through testing and refactoring. **If changing things later can be done cheaply, then the reason for finalizing everything up front becomes weaker, not stronger.**

&emsp;What is dangerous is the combination of borrowing only the form of SDD, finalizing the specifications for the entire system in an earlier phase, and freezing them in a contract. That is “Waterfall where typing is done quickly by AI”—a mechanism for producing large quantities of the wrong thing from incorrect specifications, faster than ever before (and people will probably be unable to review it all).
&emsp;You could call it **the completed organization-wide version of development at AI’s mercy** that I described in Part 1.

&emsp;To be fair, it is true that AI has increased the value of clearly expressing intent in words up front. Writing first does not itself conflict with Agile. What the Agile Manifesto says is “over,” not “do not write.” What conflicts with Agile is not writing first, but writing in large units and freezing them.
&emsp;Therefore, in the AI era, the question from earlier can be rephrased as follows.

> **Is that specification document an appendix to a contract, or a file in a repository?**

&emsp;If a change request is required every time it is revised, then regardless of what AI generates, it is Hybrid Waterfall.

## The Irony of the Name “Japanese-Style”

&emsp;Finally, as chairman, there is something I absolutely must say: the matter of the name “Japanese-style.”
&emsp;As many people know, tracing the origin of “Scrum” leads to the paper “The New New Product Development Game,” published in 1986 by Hirotaka Takeuchi and Ikujiro Nonaka. This paper compared development in which work is handed off sequentially between phases to a relay race, and development in which phases overlap and everyone advances together to rugby. It argued that the strength of excellent Japanese manufacturers lay in the latter. The name Scrum comes from this.
&emsp;Water-Scrum-Fall is like inserting one Scrum into the middle of a relay race. It does precisely the opposite of what was introduced to the world as a strength of Japanese workplaces, yet calls itself “Japanese-style.”
&emsp;The true Japanese style crossed the ocean long ago and has been reimported under the name Scrum.


## Bylaws

&emsp;With that said, I will include the bylaws of our society for reference. Joining and leaving are both free (← It is a joke, okay? We are not recruiting).

**Article 1: No False Advertising**
&emsp;Do not call an approach Agile if it does not provide Agile’s degree of freedom. If requirements and the budget are finalized first, call it Hybrid Waterfall. **If there is no substance, do not put up the signboard.**

**Article 2: Transitional Stages Are Welcome, but Do Not Make Them the Destination**
&emsp;There is no shame in being in Water-Scrum-Fall. However, decide what you will break down next. Move testing earlier, reduce the scope of requirements that are finalized, or insert releases partway through. Any one of these is enough.

**Article 3: Verify the Contract**
&emsp;When someone says, “We will proceed with Agile,” verify whether what is fixed in the contract is the list of requirements, or the budget and objective.

**Article 4: Make Changes Through Swaps**
&emsp;If you welcome change, agree in advance on the rules for swapping items. When adding something, remove something else. Also decide who makes that decision.

## Why Does Such a Society Exist?

&emsp;I began calling myself chairman because I have repeatedly seen two completely opposite kinds of confusion under the same signboard.

&emsp;The first is a workplace with absolutely no flexibility. A list of functions decided during requirements definition is consumed in order, Sprint by Sprint. I call this **installment payments**. What you buy and the total amount are decided at the time of the contract. The Sprints merely determine how many payments to divide that payment into. Even when you discover partway through that “we did not need this after all,” you have no choice but to keep paying the remaining balance. Even if you observe users’ reactions during the Sprint Review, what will be built in the next Sprint has already been decided. Iteration is taking place, yet there is no opening through which learning can enter.

&emsp;The second is the reverse. The client takes the signboard saying “Because it is Agile, changes are free” at face value and keeps submitting more and more changes. However, since the budget and requirements have already been finalized, the vendor has no capacity to absorb those changes. At first, they accept them by overextending themselves, absorb them through overtime and declining quality, and then, once they reach their limit, change management returns. The client says, “You said it was Agile,” while the vendor says, “We said within the budget.” Neither side is lying.

&emsp;These two situations are the front and back of the same signboard. The first is the result of the vendor keeping the substance as Waterfall. The second is the result of the client believing the signboard. And the same thing was missing from both workplaces. In genuine Agile, changes are welcomed within the constraints of budget and time because **when something new is added, something of lower priority is removed in its place**. Change is not addition; it is replacement. No one had written down this rule of replacement in either the contract or their agreement. Replacement was not allowed in the installment-payment workplace, while replacement was not required in the workplace overwhelmed by changes.
&emsp;The signboard of Japanese-style Agile makes this most important single sentence invisible from both sides.

![Figure 2: The front and back of the same signboard—an installment-payment workplace and a workplace overwhelmed by changes](/img/blogs/2026/1102_ex_abolish_japanese_agile/figex3_02.webp)

&emsp;Although I speak of eradication, our society’s goal is dissolution. When the term “Japanese-style Agile” is no longer used, and transitional stages come to be called transitional stages under honest names, then our society will be able to dissolve with a proud sense of accomplishment.

---


*For the list of articles in the main series, please see Part 1.*
