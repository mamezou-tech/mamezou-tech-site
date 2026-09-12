---
title: >-
  Agile FAQ #1: Reexamining in the AI Era! Are Scrum Basics Really Necessary?
  The 'Meaning' and 'Value'
author: tomohiro-fujii
date: 2026-09-09T00:00:00.000Z
tags:
  - スクラム
  - アジャイル
  - 生成AI
  - AI
translate: true

---

## Introduction to the Series

&emsp;Thank you for reading this article. I'm Tomohiro Fujii of the Agile Group.

&emsp;Under the mysterious title "Mamezou’s Last Part-Timer," I’ve been bamboozling clients while engaging in training and support every day, and over the years I’ve received the same questions repeatedly. Nearly 30 years have passed since agile development emerged, and with a generational shift among practitioners, it's only natural that questions once thought to be fully debated (or so it seemed) would come up time and again, like a batting order making a full rotation.

&emsp;The purpose of this series is to take those frequently asked questions as starting points and articulate, in the form of an FAQ, the underlying structural problems and practical countermeasures that can be used in the field.

&emsp;The target reader profile is set as follows:
- Have learned basic terminology like “What is a sprint?” through training or specialized books.
- Have been running sprints for a few months since the new fiscal year began and are starting to wonder, “Is this really right?”

The aim is to create an opportunity for those who have learned the basics to take one more step—to dig into the question, “I know it, so why isn’t it working in practice?”—and think more deeply about it.

&emsp;Since this series starts from actual questions I’ve received, you might think from the title that it’s from a “developer’s perspective,” but I’m focusing on “content that anyone involved in agile should know.” So please stay with me even if you’re a team leader or someone on the client or management side facing a Scrum team.

&emsp;Before we get into the main topic, I have three disclaimers:
- Not “the correct answer,” but “options.”
…The methods for addressing challenges often vary depending on the context of the project. While I will present ways to tackle these challenges, please understand them as “options you can take” rather than “the one right answer.” They may differ from approaches suggested in other books or blogs, but view them as an expansion of your options and a starting point to consider what to do in your team’s context.
- Not a tutorial on “how to use AI tools” in detail.
…Interest in using AI in development has been growing, but this series will not explain the specific usage of AI tools. Surely someone else will cover that topic in another article.
- Leave legal matters to the experts.
…Legal and contractual practice issues such as contractor agreements are also outside the scope of this series.

&emsp;That preamble got a bit long. For the first FAQ, I’ve chosen a question that is increasingly common in training and implementation support sessions in this era.

## Question

&emsp;We live in an era where AI writes code, writes tests, and even produces design proposals. Development speed has increased by orders of magnitude. Honestly, is there any point in learning the basics of Scrum at this point? Breaking work into sprints for humans to estimate and reflect feels like a “ritual” before AI’s speed.

## Answer

&emsp;There is a reason to learn them, and I think their importance is actually growing. That’s because Scrum manages not “how fast we build” but “the direction we should go.”  
&emsp;What AI has dramatically accelerated is “how to build,” whereas “what to build” and “what to learn from what’s built” are activities that require human initiative. AI can help, but you can’t completely hand them off to AI. The faster the building speed, the faster you can build the wrong thing—this simple fact has never been more evident in highlighting the value of the unglamorous foundational activity of inspection and adaptation (frequently checking what you’ve built and how you work and continuously adjusting for the next iteration).

## What AI Has and Hasn’t Accelerated

&emsp;First, let’s calmly sort this out. What generative AI has certainly changed is the “how to build” domain: implementation, test code creation, standardized design, research, and so on. There’s no argument—and I’ve personally felt—that these tasks have become several times (or even more) faster.

&emsp;But what about the following questions?
- Whose business problem does this feature solve, and what is it?
- After releasing it, did we achieve the intended effect?
- If not, what will we change next?
- Is the team’s current way of working functioning properly…?

&emsp;These are themes for which humans must take the initiative in decision-making, and AI doesn’t have the answers. It can generate plausible-sounding responses, but the responsibility to verify them remains with people. And as you’ll notice, “what to build,” “what to learn from what’s built,” and “how the team performs inspection and adaptation” are exactly what agile has consistently questioned over the past 30 years. AI has not taken on any of these questions that agile has addressed. Rather, what has increased is only the speed of building without facing these questions (at least so far).

## The New yet Ancient Disease of “AI-Dictated Development”

&emsp;One consequence we’ve begun to see in the field is development that blindly accepts AI-generated outputs without sufficient verification or understanding of their intent… It makes you want to shout, “That’s just ‘AI-Dictated Development’!” which is entirely different from genuine “AI-Driven Development.”

![Figure 1: Big difference in the same AIDD. AI-Driven Development (left) vs. AI-Dictated Development (right)](/img/blogs/2026/0909_1-do_we_still_need_scrum/fig01-01.png)  
Illustration left: AI-Driven   Illustration right: AI-Dictated

&emsp;A hallmark of AI-dictated development is that each deliverable appears plausible. The code runs, the tests pass, the documentation is in order. The problem is that no one can satisfactorily explain for whom or for what purpose the whole was created. Unverified assumptions underlie unverified outputs piled up at high speed. What used to take months—marching in the wrong direction—can now be reproduced in weeks.

&emsp;However, this is not a new disease. There have always been instances of development that doesn’t question intent: “I built it because it was in the requirements document,” “I did exactly as I was told.” AI has just made that faster and better at hiding behind the illusion of having “built something.”

&emsp;With the same diagnosis, the prescription is in the same category.

## Scrum Fundamentals Are What Work Especially Well Against AI Outputs

&emsp;Let’s reframe the fundamentals covered in this series within the context of AI.  
- **The habit of questioning recipient and purpose** prompts you to ask, “Who is this code for and why?” (fig002) even of AI outputs. The more plausible the generated output, the more this question remains purely human work.  
![Figure 2: Continuously asking why](/img/blogs/2026/0909_1-do_we_still_need_scrum/fig01-02.png)  
- **The rhythm of finishing small increments and inspecting** forces you not to swallow generated outputs whole but to secure opportunities to run them, have users try them, and learn. Sprints exist not because “humans are slow” but to “establish a learning cadence,” so even if generation is faster, sprints remain necessary. In fact, as the number of outputs requiring verification increases, the value of this inspection rhythm goes up.  
- **The discipline of measurement and recording** turns the feeling of “it seems faster with AI” into verifiable facts. Has lead time—from start to delivery—actually shortened? Are rework loops not increasing? Tool evaluation also becomes a subject of inspection and adaptation.

&emsp;Conversely, there are things that can change. Sprint length, estimation methods, documentation practices… these are “operational parameters” that adjust how Scrum flows, and their optimal values can shift with AI (this distinction between “fundamentals” and “operational parameters” will recur in future articles). If generation is faster, you might shorten sprints. You might find that it’s faster to build something to test it rather than discuss estimates. Feel free to rethink these parameters boldly. In this era of major technological transformation, “uncritical adherence to precedent is a ‘sin.’”  
Changes to these parameters should also be discussed and agreed upon by the team and be subject to inspection of their effects. It’s not a matter of doing whatever you want on the ground while ignoring those around you.

&emsp;And the moment you remove the inspection-and-adaptation loop itself that I’ve described so far, what remains is “high-speed blind obedience.”

## Why Do Similar Questions Resurface Every Time a New Technology Emerges?

&emsp;The question “Now that we have a new tool, aren’t the fundamentals of the process unnecessary?” is actually not new to AI. CASE tools (a group of tools from the 1980s–90s that automatically generated code from design diagrams), RAD (a 1990s development approach of rapid prototyping), low-code promises that programmers would become unnecessary… every time a new tool appeared, the same question was replayed. This isn’t just one rotation of the batting order; it’s several innings deep.

&emsp;And every time, the conclusion has been the same. Tools change—and sometimes dramatically improve—“how we build.” But “what to build” and “what to learn from what’s built” remain outside the scope of the tools, and projects that neglect these aspects have failed quickly with fast tools.

&emsp;I acknowledge that AI represents a scale of change unlike past tools. That is precisely why, you might say, the fundamentals for those at the wheel are being tested. What this series will cover from here on is how to hold that wheel.  
![Figure 3: Throughout all time, people hold the wheel](/img/blogs/2026/0909_1-do_we_still_need_scrum/fig01-03.png)

## What’s Coming Next

&emsp;Here are the tentative titles and order for upcoming installments. Please note that these are provisional and may change without notice.

- Part 2: Isn’t Scrum Unsuitable for Maintenance and Operations Teams?
- Part 3: How to Handle “Existing Function Assurance” in Upgrade Projects?
- Part 4: How to Estimate Renovation Projects Without Finalizing All Features?
- Part 5: For Legacy Systems with Unreliable Documentation, What Do You Treat as “Specification” for Verification?
- Part 6: The Daily Scrum Has Become a Status Meeting
- Part 7: Retrospective Isn’t Working… We Keep Rehashing the Same Improvement Ideas and Listing To-Dos
- Part 8: Stakeholders Have Stopped Attending Sprint Reviews
- Part 9: My Boss Demands Story Points Be Converted to Person-Days
- Part 10: Velocity Isn’t Stabilizing. Is It Okay to Use It for Planning?
- Part 11: We Always Have Tasks That Don’t Finish Within the Sprint
- Part 12: How Do You Plan for Interrupts?
- Part 13: The PO Is So Busy They Don’t Join the Team
- Part 14: What Does a Scrum Master Do? They Seem Idle
- Part 15: Even When We’re Told It’s Self-Organizing, the Leader Ends Up Deciding Everything
- Part 16: The PO Won’t Prioritize Paying Down Technical Debt
- Part 17: How Much Documentation Is Enough?
- Part 18: We Made Progress at First, but It Feels Like the Team Has Stalled Lately
- Part 19 (Final): Series Conclusion

&emsp;Thank you for sticking with this long article.

---

*Next: “Isn’t Scrum Unsuitable for Maintenance and Operations Teams?”*
