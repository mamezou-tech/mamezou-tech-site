---
title: >-
  Has AI Made Model Creation Easier? — Three Pitfalls Learned from ET RoboCon
  2026
author: ken-murai
date: 2026-09-28T00:00:00.000Z
tags:
  - ETロボコン
  - AI
translate: true

---

## Introduction

In the previous article, I introduced my four-year journey in ET RoboCon and how, in last year's Basic Class, I used AI as a "design review partner" and secured a Silver Model.  
@[og](https://developer.mamezou-tech.com/blogs/2026/07/29/et-robocon-001/)

At the end of that article, I wrote that this year I am challenging the Applied Class to further level up my model creation. This article is a sequel to that.

Last year, I mainly had AI review models created by humans, using it to consider improvement proposals and check for omissions. This year, I expanded AI's role beyond review to include extracting candidate requirements and creating initial drafts of diagrams—in other words, using AI in the process of model creation itself.

In the previous article, I introduced AI as a "new weapon" for development. Because the review phase felt effective, I believed that if I expanded the tasks entrusted to AI, model creation itself would become much easier. Indeed, the time from nothing to generating ideas became faster. However, at the stage of organizing those ideas into a deliverable model, tasks like separating requirements from implementation methods, verifying consistency among diagrams, and checking revision diffs took far more time than I had imagined.

In this article, by looking back at model creation for ET RoboCon 2026, I will introduce three pitfalls we actually fell into and explain why—despite faster idea generation with AI—reaching a finished model did not become easier. If the previous article conveyed the positive feel of AI utilization, this one records different challenges that emerged when we expanded AI's role.

## 1. This Year’s Challenge: Model Creation in the Applied Class

At the 2026 Applied Class regional tournament, **ET Rally** is the target of the model review.  
ET Rally is a challenge where you must pass through red, blue, and yellow gates placed on the course in a specified order.

:::info
If you are learning about ET RoboCon for the first time, please refer to the [ET RoboCon official site](https://www.etrobo.jp/). The physical division competition format for 2026 is also introduced in the [official competition rules explanation video](https://www.youtube.com/watch?v=Sa_zXKC643A).
:::

We composed our submitted model with the following three pages:

- Abstract page
- Requirements model
- System analysis model

Model creation proceeded according to the following flow:

```mermaid
flowchart LR
    A[Organizing competition rules] --> B[Use case analysis]
    B --> C[Risk analysis<br>using FMEA]
    C --> D[Requirements model]
    D --> E[Subsystem partitioning]
    E --> F[Structural and behavioral analysis]
    F --> G[Integration of submitted models]
```

We mainly used AI for the following tasks:

- Organizing competition rules
- Identifying candidate requirements
- Creating initial drafts of diagrams
- Checking UML/SysML representations and omissions
- Refining explanatory text

The time from nothing to producing the first draft was reduced. However, assembling that draft into a model ready for submission required more adjustments than expected.

## 2. Three Pitfalls Discovered When Using AI to Create Models

By expanding the scope of tasks entrusted to AI, we encountered especially the following three problems:

1. The more candidate requirements you add, the more requirements and design elements get mixed.
2. The more revisions you make, the further you get from completion.
3. Diagrams created by each person don’t integrate smoothly.

In all cases, these issues surfaced not from the quality of AI’s suggestions themselves, but during the human phase of organizing and integrating those suggestions.

### Pitfall 1: The More Candidate Requirements, the More Requirements and Design Get Mixed

The first issue we ran into was that **the more candidate requirements AI generated, the harder it became to tell which items should remain as requirements**.

When you give AI the competition rules and the information you’re considering, it quickly expands the list of candidate requirements. This is useful for creating a starting point. On the other hand, the suggestions can include not only facts stated in the rules but also design assumptions, abnormal-case countermeasures, and even concrete implementation methods.

Looking back at our interim sorting notes, for example under the requirement “Move to the target coordinates,” we found the following drive methods listed:

- Line-tracing drive
- Floor QR coordinate-system drive
- IMU coordinate-system drive

Elsewhere, from the requirement to acquire information from the hint card, AI drilled down into specific processes like Base64 decoding, AES-128 ECB decryption, and inputting a four-digit decryption key. Individually, these details appeared necessary, but **they were listed at the same level even though some were “requirements the system must satisfy” and others were “design choices for realizing those requirements.”**

Our meeting notes from that time are full of questions like “Are means getting mixed in here?”, “Aren’t algorithms supposed to be chosen at the design phase?”, and “Isn’t this too detailed?” We felt that the work of reclassifying the AI-generated candidates afterwards was more difficult than simply asking AI to expand the list.

In the final version, as a principle, we kept implementation methods out of the requirement items and treated them separately as design elements. For the risk countermeasures extracted by FMEA, rather than writing the countermeasures directly, we first derived the necessary requirements and then linked them to design elements.

Note that we did not keep a complete history of every interaction with AI when creating the requirements diagrams. Therefore, we cannot pinpoint exactly “which requirement was added by AI.” What is presented here is a retrospective look at **what classification challenges remained in the interim materials generated with AI.**

From this experience, we felt it necessary to decide at least the following categories before asking AI to generate candidate requirements:

- Facts derivable from the rules or use cases
- Requirements the system must satisfy
- Design assumptions and implementation methods
- Countermeasure requirements added from risk analysis
- Ideas not yet decided upon

Rather than simply requesting “List the requirements,” it is easier to organize later if you ask AI to **attach a category and rationale to each candidate.**

### Pitfall 2: The More Revisions, the Further You Get from Completion

The next problem was that repeating revisions actually increased the workload.

In practice, we repeatedly asked AI, “Please fix this part,” saw the result and felt, “Something’s off,” then asked for further revisions. Because the initial instruction was vague, the AI sometimes changed text beyond the part we wanted to fix.

We had to check not only the changed section but also whether the change introduced new inconsistencies. With each revision, the scope of what needed verification grew, and we sometimes had no idea whether we were getting closer to completion.

Some team members expanded their interaction with AI so much that, in a few days of work, they reached their one-month usage limit. While generating text and diagram drafts became faster, checking the subsequent diffs took time.

Therefore, in the latter half of the process we focused on the following:

- Specify in one request both the parts to change and those to leave unchanged.
- Have AI output only the diffs instead of regenerating the entire model.
- Decide on a single “latest version” for the team to reference.
- Before continuing revisions, have a person first assess the direction.

Rather than asking AI for countless revisions, **it is more important for a human to clarify what is bothering them and how they want it fixed** before interacting with AI.

### Pitfall 3: Diagrams Created by Each Person Don’t Integrate Smoothly

In this project, multiple members divided up the work and created diagrams. Each person’s use of AI sped up their individual diagram creation.

However, when we combined the completed diagrams, we found discrepancies such as:

- Different names used for the same concept.
- Differing responsibility granularity between the requirements diagram and the system analysis diagram.
- Inconsistent directionality of associations and stereotypes.
- While individual diagrams were valid, relationships across diagrams were impossible to trace.

AI generates a plausible suggestion based on the context provided by each requester. As a result, the differences in each person’s interpretation tended to show up directly in the diagrams. The root cause lies in the lack of common rules and integration methods for distributed work, but it is important to remember that AI can amplify those differences.

Next time, we plan to share upfront the terms and naming conventions used throughout the model, the requirement and subsystem IDs decided in the higher-level process, and the UML/SysML notation. When team members request AI’s help, they will need to supply the same terms and modeling policy. Also, rather than doing a final integration at the end, we want to schedule intermittent diagram reviews where we bring together each member’s work.

## 3. Underlying Human-Side Challenges Behind the Pitfalls

Looking back at the three pitfalls, we cannot chalk them all up to AI. Rather, it seems more accurate to say that **AI concretized ambiguous aspects that were unclear on the human side, increasing the volume of what needed to be organized.**

### The System Boundary Was Not Fully Defined

When we extracted ET Rally from the overall competition, we did not fully decide what to include in this analysis.

In our interim materials, for example, we left open questions about the decryption key—whether the requirement should cover “the running body receiving it,” or where to draw the boundary between the starter, PC, and wireless communication device. When requirements are elaborated with such ambiguous boundaries, even processes that may be out of scope get fleshed out in detail.

We also considered normal driving requirements alongside abnormal cases—like recovery when a QR code cannot be read, timeouts if the target is not reached in time, and re-running when passing through gates out of order—all in the same requirements tree. While it is necessary to think about abnormal flows, having normal flows, risk countermeasures, and design options all grow simultaneously makes it hard to see which perspective you are decomposing requirements from.

It wasn’t that AI created the problem; rather, **because we expanded candidates before deciding the scope and classification axes, AI concretized parts we had not yet defined.**

### No Clear End Criteria for the Analysis

We spent so much time on FMEA and fine-tuning the requirements diagram that we lacked time to write the explanatory text for the system analysis model and the submitted model.

Using AI makes it easy to add ideas like “This case might happen” or “This countermeasure might be necessary.” As a result, it becomes tempting to continue thinking, “I could make this a bit better.” However, in the model review, you must decide what to convey within the limited pages and time.

Our reflection here is not about AI’s output quality alone. We believe it was also critical that **humans did not have clear exit criteria—how far to go before the analysis was considered complete.**

## 4. Even So, Where AI Was Helpful

So far we have listed pitfalls, but that does not mean we thought it would have been better not to use AI. In fact, there were many situations where AI was effective:

- Quickly creating a draft of the model
- Comparing multiple representation options
- Identifying perspectives we had overlooked
- Checking UML/SysML notation and inconsistencies
- Polishing explanatory text for readability

Especially when creating the first draft from scratch, AI was helpful. On the other hand, deciding what to model, determining the analysis scope, and choosing which options to adopt still require human judgment. AI can generate suggestions, but it will not decide what the team’s objectives actually are.

## 5. If We Do the Same Task Again

Reflecting on this time, next time we would proceed as follows:

1. Human-defined model purpose and scope upfront  
2. Classify AI’s output into “facts, requirements, assumptions, implementation methods, proposals”  
3. Record rationale and accept/reject decisions for requirement candidates  
4. Share higher-level-defined terms and IDs with the team  
5. Base changes on diffs rather than regenerating the entire model  
6. Keep interim drafts and reasoning so change history can be traced  
7. Humans decide final consistency checks and accept/reject  

This time, although we retained some interim materials, we did not have a traceable record of interactions with AI or why requirements were added. Next time, we want to keep not only the final model but also notes on “why something was added” or “why something was removed.” That will make it easier to evaluate AI’s outputs and provide decision-making material when integrating models as a team.

Also, before asking AI for the next correction, a person will first consider whether a fix is truly needed and what criteria define completion. It is necessary not only to craft better prompts but also to align the team on who decides what, which file is the latest version, and which state is subject to review.

## 6. Towards the Tokai Regional Tournament

We have already submitted our model and are now shifting our focus to preparing for the live run at the Tokai regional tournament on October 3.

Moving forward, we will verify whether the risk countermeasures studied in the model actually function during runs. We plan to review state transitions using run logs, recovery when gates are misrecognized, and correspondences between the model and implementation.

The strongest impression we gained this time was that while AI speeds up “getting started,” **it does not automatically speed up “deciding what to treat as a requirement, what to leave to design, and where to draw the analysis boundary.”**

AI is good at filling in ambiguous gaps and expanding ideas. However, in modeling, you must decide whether leaving that ambiguity is acceptable and where to draw the line. Next time, more than having AI expand suggestions, I want to consciously use it to support the human-side decisions of **classifying, discarding, and concluding**.
