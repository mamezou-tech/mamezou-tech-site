---
title: >-
  【Agile FAQ: Today’s Laboratory】Can BMAD Relieve Concerns About “Development at
  AI’s Mercy”? (Part 1)
author: tomohiro-fujii
date: 2026-11-11T00:00:00.000Z
tags:
  - スクラム
  - アジャイル
  - アジャイル開発
  - 生成AI
  - AI
translate: true

---

&emsp;Thank you for reading this article. I am Tomohiro Fujii, a member of the Agile Group.
&emsp;In the previous extra edition, “Eradicating Japanese-Style Agile,” I wrote that AI-driven development could become the new banner of Japanese-style Agile. This time is a follow-up “laboratory” session (...when will we get back to the main series...?).
&emsp;For a long time, I have specialized in “upstream processes” such as requirements management using use cases and stories. My work has always centered on how what to build (What) is decided and put into words. From that perspective, recent AI-driven development had seemed to me to carry the risk of “ending up blindly following it,” which made it feel somewhat dangerous.
&emsp;However, as the scope of AI application in development expands at an explosive pace, I cannot help but be interested when it enters my area of expertise.

&emsp;So, in this laboratory, I will actually try the BMAD Method (hereafter, BMAD), which I have been seriously into lately. I assume there are both people who want the quick answer and people who want to try it themselves, so Part 1 presents examples of the actual interactions and an evaluation, while Part 2 will be a guide for those who want to try it (with no great depth or anything).
&emsp;The evaluation has the following three perspectives:

1. **What happens when you blindly follow AI?**
2. **Can a dialogue with AI be established?**
3. **Is that dialogue more than simple questions and answers—does it help refine the human side’s ideas?**

## Conclusion

- **Perspective 1**: Even when proceeding without any human answers, the tool marked its assumptions and left questions that needed confirmation. However, it also produced a 586-line requirements specification based on those assumptions, and when a human answered the questions, many of the premises turned out to differ from reality.
- **Perspective 2**: A dialogue was established. The AI restated what it had heard to confirm it, changed its subsequent questions in response to the answers, and accepted “I don’t know” as an answer.
- **Perspective 3**: It helped refine the idea. The subject changed from “build a new site” to “find out why the existing site is not being used,” and my assessment was reframed as “a hypothesis that needs to be verified.” However, refinement was not one-way: situations in which humans corrected the AI’s proposals were equally important.

&emsp;**Even if the tool formulates questions, humans are the ones who answer them. If you proceed without answering, you will ultimately get closer to being “at AI’s mercy.”**

## What Is BMAD?

&emsp;BMAD stands for Breakthrough Method for Agile AI-Driven Development, an open-source method for AI-driven development. It is used by incorporating it into coding AI tools such as Claude Code.
&emsp;Its characteristic is that AI agents are assigned roles corresponding to those on a development team. Each agent creates the documents for its own stage and hands them over to the next stage.

| Stage | Main Roles | Main Deliverables |
|---|---|---|
| Analysis | Analyst | Product brief, PRFAQ |
| Planning | PM, UX Designer | Requirements specification (PRD: Product Requirements Document), UX design |
| Design | Architect, PM | Architecture, epics and stories |
| Implementation | Developers and others | Sprint plans, code, reviews, retrospectives |

&emsp;Planning can be skipped depending on the scale, and at every stage, a record file (`.memlog.md`) preserves, line by line, who decided what and how.
&emsp;What this article examines is only the analysis and planning stages in the table—in other words, **how far BMAD can support the stage “before” specifications are decided**. It does not cover design, implementation, code quality, or comparisons with other methods.

## Experimental Conditions

&emsp;The subject is the following request from a fictional software vendor:

> We want to create a support site for users of our products and maximize customer convenience.

&emsp;That is all we started with.
&emsp;I ran this through two different approaches. Experiment 1 examines Perspective 1, while Experiment 2 examines Perspectives 2 and 3.

| Item | Details |
|---|---|
| BMAD version and environment | v6.12.4 (stable version), Claude Code (inside a development container) |
| Customization | None (only the language of conversations and documents was set to Japanese) |
| Experiment 1: Run with AI only | Give it only the one-sentence request and have it create a product brief and requirements specification (PRD) using an approach that asks no humans at all (headless) |
| Experiment 2: Run with human answers | Create a product brief while I answer the analyst’s questions (using the “Fast path”) |

| | Experiment 1: Product Brief | Experiment 1: PRD | Experiment 2: Product Brief |
|---|---|---|---|
| Time and effort required | About 6 minutes | About 13 minutes | 7 rounds of dialogue |
| Assumption markers (`[ASSUMPTION]`) | 5 locations | 31 locations | 5 locations |
| Decision records (`.memlog.md`) | 20 entries | 29 entries | 39 entries |
| Document size | About 2,800 Japanese characters | About 20,000 Japanese characters (586 lines, 27 functional requirements) | About 3,600 Japanese characters |

&emsp;The “decision records” in the table are the number of lines left in the record file mentioned above. “Assumption markers” are explained in detail under Perspective 1.

## Perspective 1: What Happens When You Blindly Follow AI?

&emsp;BMAD outputs quite a large volume of documentation, so the outputs introduced in this article are all excerpts of key portions. Please try the procedure in Part 2 yourself to examine the full output.
&emsp;First, here is the opening of the product brief from Experiment 1.

> Create a support site where users of our products can find answers on their own when they encounter problems and, if they cannot find them, reach a human without getting lost. “Maximizing convenience,” as stated in the request, cannot be measured as it stands. Therefore, this brief rephrases it as **resolving problems quickly and reliably**.
> Based on the research, the problem appears to be less that “there is no support site” and more that “it cannot be found even when one exists.” Only 14% of inquiries were fully resolved through self-service, and the largest reason for failure was “unable to find relevant information” (more than 43%) (Gartner, 2024).

&emsp;Frankly, it is well done. Without asking anyone, the AI even conducted web research and rephrased the unmeasurable “maximize convenience” into measurable terms. It also properly marked areas based on assumptions.
&emsp;Let me explain these “assumption markers” here. When BMAD’s AI writes something based on assumptions that have not been confirmed with a human, it adds an `[ASSUMPTION]` marker to that part. It is a sign meaning, “This is the AI’s assumption, and nobody has confirmed it yet.” In Experiment 1, where it asks no human questions, it has no choice but to fill in everything it does not know with assumptions, so many of these markers appear. Questions that cannot be filled in through assumptions and can only be answered by humans are collected at the end of the document as “unconfirmed questions.”
&emsp;Here is the actual problem section. The `[ASSUMPTION]` beside the heading is that marker.

> **On the company side** `[ASSUMPTION]`
> - The same questions arrive repeatedly, consuming support staff time.
> - Because answers are not retained anywhere, they are not handed over to the next person in charge.

&emsp;The “unconfirmed questions” at the end also retained exactly the questions that needed to be verified.

> 3. What existing FAQs, manuals, and contact channels are there, and who manages them?
> 4. Is the objective customer satisfaction or reducing support costs? If both, which should take priority when they conflict?

&emsp;The PRD it then created was 586 lines long. Its 27 functional requirements were numbered. The PRD includes a section called “usage scenarios (user journeys, UJ),” which describes how users use the product through stories involving named individuals. The first one begins like this:

> **UJ-1. Mr. Sato, an accounting staff member, resolves an error that occurred during month-end closing work by himself.**
> Mr. Sato is an accounting staff member who uses our product for monthly closing. He is not very familiar with the product. The deadline is approaching.

&emsp;“Mr. Sato” does not appear in the product brief. At the beginning of this PRD section, the AI itself added the following note:

> The product brief does not describe actual situations in which users use the product. The following is an assumption constructed from the product brief’s “who it is for” and “what will be created.”

&emsp;In other words, Mr. Sato was a person newly imagined by the AI at the PRD stage, layering assumption upon assumption (and, of course, this scenario also carries an assumption marker). So what was the reality? Here it is alongside the answers I gave in Experiment 2.

| Premise in the Experiment 1 document (assumption) | Actual answer from the human |
|---|---|
| The product is B2B business software | A sales support system. **This was correct.** |
| Users are business staff unfamiliar with the product. The PRD protagonist is “Mr. Sato, an accounting staff member.” | **Sales employees** working in the field |
| There are support staff who spend time answering the same questions | There are **no support staff, or very few**. Sales representatives route questions **to developers** |
| Manuals and FAQs are scattered across different places | A simple support site **already exists**. Even so, operational questions flow into inquiries |
| The objective is customer satisfaction or cost reduction (left as a question) | The priority is **user satisfaction**. **It was correct to leave this as a question.** |

&emsp;To be fair, the tool is doing what it should do. However, **assumption markers only have meaning when humans read and verify them.** If they are passed on to the next stage without being checked, the 27 functional requirements may end up being built on the premise of a “support staff member” or “Mr. Sato in accounting” who does not actually exist.
&emsp;**What we should be wary of when blindly following AI is not simply that incorrect documents may be created, but that plausible-looking documents can easily become the premise for the next process without being verified.**

![Figure 1: Both markers and questions remained. Even so, when humans answered, many of the premises differed from reality.](/img/blogs/2026/1111_ex_lab_bmad/figlab_01.webp)

## Perspective 2: Can a Dialogue With AI Be Established?

&emsp;When I gave the same request in Experiment 2, the analyst did not immediately create a document. First, it asked me to put everything in my head onto the page. When I wrote freely about the product, the current inquiry flow, the trigger, and what I wanted to prioritize, it organized what it had heard into a table and returned it to me.

| What it heard | Impact on the approach (summary of the analyst’s response) |
|---|---|
| Product: A sales support system used daily by field sales employees | Users are “people whose work has stopped in the middle of a task.” Focus on whether they can reach an answer immediately |
| Priority: User satisfaction rather than reducing developers’ workload | Use user-side metrics as the primary measure of success |
| Current contact channel: A simple support site already exists | This is not about creating a new site, but about finding out why the existing site is not being used |

&emsp;It restated what it had heard to confirm it and showed where it was getting stuck. This is the same thing a good listener does. When I chose the “Fast path,” it consolidated the remaining unknowns into six questions. Where I responded “unknown,” it either filled in an assumption marker or left it as “what is not known.” Additional answers I sent later were also properly reflected.
&emsp;**A dialogue can be established.** However, with the “Fast path,” questions arrive in batches, so the interaction becomes closer to a Q&A session. Incidentally, there is also a “Coaching path,” where you proceed while being pushed back one question at a time. I encourage everyone to try it.

## Perspective 3: Did the Dialogue Refine the Human Idea?

&emsp;This was what I most wanted to know.

**The subject was rewritten, and the range of possible solutions expanded**

&emsp;The moment I answered that “a simple site already exists,” the analyst rewrote the subject as “find out why the existing site is not being used,” and added this:

> If there are many operational questions and users are in the middle of their work, we may later need to revisit whether the form of a “site” itself is correct.

&emsp;In fact, it later asked, accompanied by research findings from companies in the same industry, “Should the scope be limited to the site, or should it include help accessed from the product screen as well?” I answered, “Because we prioritize releasing quickly, let us start with the site only.” **The AI expanded the options, and I made the choice.**

**An assessment was reframed as a hypothesis**

&emsp;When asked, “Why is the current site not useful?” I answered, “I think there are not enough articles, and it is hard to find things.” The product brief then stated:

> “There are many operational questions” and “there are not enough articles, and they are hard to find” are both assessments, not verified results.

&emsp;It neither denied the assessment nor treated it as fact. It reframed it as “something to verify first.” In Parts 3 through 5, I discussed verifying “current functionality” first; the same movement is occurring at the requirements stage.

**The yardstick became usable**

&emsp;When I answered that satisfaction was “judged by considering surveys, cancellations, and feedback at renewal comprehensively,” the analyst added metrics such as time to resolution, saying, “Because these are metrics that take time to produce results, I have placed metrics that move earlier in front of them.” I only realized when it pointed it out that I had no way to check midway through whether the rebuilt site was working.

**Questions that could not be answered remained**

&emsp;After the draft, the analyst pushed back on the weakest point.

> **Who will write and continue updating the articles?**
> If article creation is assigned to developers while there are no support staff, the “burden of answering questions” will merely become the “burden of writing articles.”

&emsp;I could not answer and only replied, “We cannot decide that now.” It remained at the top of “what is not known” in the product brief. I believe that **placing unanswered questions in the most prominent location** is also part of refinement.

**Refinement was not one-way**

&emsp;There was also a situation in the opposite direction. At the beginning of its draft, the analyst had rephrased the subject as: “Enable operational questions to be resolved in a short time without asking people. Have the remaining questions handled by a contact point other than developers.” At the finalization stage, it declared that this was **still a proposal for which it had not received my approval**. On rereading it, developers had disappeared from the flow. In reality, inquiries that the first-line contact point cannot fully handle are escalated to developers, and I also wanted to use AI. When I told it so, the rephrasing was revised as follows:

> Enable users to self-resolve many operational questions on the site in a short time (with help from AI as well). Questions that cannot be self-resolved are handled by the first-line contact point, and only those that cannot be resolved there are escalated to developers.

&emsp;At this point, the analyst’s own assumption that “the initial version will not include AI automated responses” was also withdrawn and retained in the record file.
&emsp;**It does help refinement.** However, the AI did not refine things unilaterally. The AI’s questions shook the human assessment, and the human answers corrected the AI’s proposals. Looking back, just as Experiment 1 accepted “build a site” as is, I too was about to answer without questioning the means called “a site” or my own assessment. **The only difference was whether there was someone there to ask questions.**

![Figure 2: Questions changed the subject from “building new” to “rebuilding.”](/img/blogs/2026/1111_ex_lab_bmad/figlab_02.webp)

## Strengths: The Tool Itself Has Mechanisms to Prevent Being “at AI’s Mercy”

- **It does not think on your behalf**: The instruction document for the product brief skill says, “Do not do the thinking on their behalf” and “push back if the answer is shallow” (the original is in English; quotations are translated by the author. The same applies below). Its actual behavior was also as described under Perspectives 2 and 3.
- **It marks assumptions and retains undecided matters**: The PRD instruction document specifies that even when proceeding without asking humans, it “must not fabricate success metrics or scope decisions; record them.” In fact, target values remained blank, and the PRD reported its own status not as “complete” but as “partially complete (human confirmation required).”
- **It distinguishes AI proposals from human decisions**: As seen in Perspective 3, it declared the unapproved rephrasing to be a “proposal.” This may be the most important characteristic for preventing people from being “at AI’s mercy.”
- **It provides guardrail metrics**: The PRD included this metric: “Number of inquiries—do not make reducing this itself the goal. It can easily be reduced by hiding the entry point.” This is exactly what I wrote about in Parts 9 and 10: not turning metrics into report cards.
- **Undecided What does not flow into the next stage**: The skill for breaking work into epics and stories has no path for proceeding without asking humans. Its instruction document says, “Do not generate content without human input,” and the pre-implementation assessment also asks, “Can it be implemented without fabricating decisions that have not been recorded?” This is the same question as the so-called “Definition of Ready.”
- **Decision records remain**: Even the withdrawal of assumptions is recorded line by line. This is the same idea as the “list of judgments about mysterious behavior” in Part 5 and Architecture Decision Records (ADRs).

## Cautions: Whether the Mechanisms Work Depends on How They Are Used

- **Assumptions are also contained within polished documents**: It is difficult to fully verify all 31 markers in 586 lines. The more polished a document is, the more tempting it becomes to move forward without checking it, so this is something to remain conscious of.
- **Research provides generalities**: The research itself was accurate. The Gartner research cited by the product brief (August 2024) exists, and the figures match the source. However, web research reveals general facts about the world; it does not reveal circumstances specific to this company, such as “there are no support staff.” Because the research is reliable, the assumed portions can also easily appear reliable. That may require caution.
- **It revisits the means only when humans answer**: Experiment 1 continued to assume “build a site” until the end.
- **The process can look like Water-Scrum-Fall**: If this is done for the entire system all at once and the documents are frozen as contracts, it could become the “Waterfall where AI types faster” that I described in the article about eradication. A mechanism for correcting the course midway (Correct Course) is also provided, so it should be used effectively.
- **Documents increase**: From a one-sentence request, it produced 586 lines in 13 minutes. The discipline to determine who will read which document and when will become even more necessary when AI is writing them.
- **Only humans can provide the time to answer**: BMAD takes over much of the “creating proposals” side, but it does not take over the time needed to “make decisions.”

![Figure 3: The strengths are on the tool side. Whether they work depends on how they are used.](/img/blogs/2026/1111_ex_lab_bmad/figlab_03.webp)

## If You Use It, Follow These Four Rules

1. **Have humans resolve every assumption marker and unconfirmed question before proceeding to the next stage.** Treat the number of markers as the number of things humans need to verify.
2. **Make the first task “verify the assessment.”** Do not treat requests or assessments as facts.
3. **Run it by epic, not for the entire system at once.** Treat documents not as appendices to contracts, but as files to revise as you learn.
4. **Do not mix AI proposals with human decisions.** Treat rephrasing, measures of success, and what not to build as decisions only after they have been approved by humans.

## The Faster Tools Become, the More Valuable the Basics Are

&emsp;In Part 1, I wrote that every time a new tool arrived—CASE, RAD, low-code—people asked, “Are the basics no longer necessary?” The conclusion has always been the same: tools change “how to build,” while “what to build” and “what to learn” remain outside. BMAD has entered even the stage before “what to build” is decided, but when I tried it, I found that the work left to humans had not disappeared; rather, **it had become clearly visible**.
&emsp;I learned one more thing. Most of my answers were only short phrases, but the AI restated them and organized them into a polished product brief. **AI can provide considerable help with the very work of putting things into words.**
&emsp;On the other hand, what Experiment 1 got wrong was not language but facts. What remains with humans is the **content** of verbalization. Knowing the facts on the ground. Being able to distinguish between an assessment and verified facts. Being able to say, “We cannot decide that now.” Being able to point out where an AI proposal is wrong. In the AI era, the skills of “eliciting, verifying, and deciding” requirements matter more than the skill of “writing” them. As someone who has worked in upstream processes for a long time, that was a somewhat gratifying discovery.
&emsp;**No matter how intelligent tools become, humans are the ones who possess the substance of What. That is why humans matter.**

&emsp;After finishing this article, I also realized the difference between a “task” and “work.” A task is mechanically carrying out prescribed procedures; work is producing meaningful results. I think the difference between being “at AI’s mercy” and having “a dialogue with AI” lies here. While conversing with AI, I found myself considering conditions I had never thought of and thinking about what purpose they served.
&emsp;I am often asked, “When AI advances, will Scrum Masters and developers no longer be needed?” But after completing this experiment, I came to feel that there is a more important question. **Could AI become a partner that helps a PO mature?** Beside the PO who decides what to build, it can formulate questions, challenge assessments, and lay unanswered matters out in front of them. This is a far more important position for AI.
&emsp;The former is about reducing people; the latter is about making people effective.
&emsp;If it were up to me, I would want to recommend AI to customers from the latter standpoint.


&emsp;Now, let me ask everyone who has read this far:
&emsp;With a tool like BMAD, do you feel that it may be possible to avoid being “at AI’s mercy”?

&emsp;...Having asked that, the author himself is still very much a BMAD beginner, so I need to keep improving.

---

*Part 2 (Practical Guide): “Trying BMAD—From Setting Up the Environment to Comparing ‘AI Only’ and ‘Human Answers’” / Next time: “The PO Is Too Busy to Come to the Team” (12/1) / For the list of articles in the main series, see Part 1.*
