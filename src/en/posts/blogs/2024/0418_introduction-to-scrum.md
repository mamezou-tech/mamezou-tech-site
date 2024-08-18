---
title: We Held an Introductory Scrum Workshop
author: shigeki-shoji
date: 2024-04-18T00:00:00.000Z
tags:
  - アジャイル開発
  - AWS
  - 新人向け
image: false
translate: true

---

:::info
To reach a broader audience, this article has been translated from Japanese.
You can find the original version [here](https://developer.mamezou-tech.com/blogs/2024/04/18/introduction-to-scrum/).
:::



Hello, I'm [Shoji](https://github.com/edward-mamezou). Our company holds a bi-weekly "Agile Study Group" in the morning. At one of these sessions in February, there was a proposal from the Scrum Master, Kamei, to hold a workshop targeted at new employees joining in April. After escalating this proposal, it was formally decided to proceed, and preparations began.

There are several frameworks within agile development. Among them, "Scrum," the most popular, seemed like a good subject to progress through team-based learning. We planned it over four days, considering it as one sprint, from planning to retrospective.

In Scrum, teams collaborate to develop a product. The team consists of one Scrum Master (Kamei), one Product Owner (Nakamura), and several developers (this time, three new employees and Shoji as the tech lead). Although many Scrum workshops focus on the Scrum Master, this time it was designed with developers in mind.

## Day 1

We started with self-introductions, followed by an overview of Scrum, and then explained the product concept using a stuffed cow from a Korean drama as a virtual stakeholder. The product planning used a simplified version of Amazon's Working Backwards.

The product architecture diagram is as follows:

![Architecture Diagram](/img/blogs/2024/introduction-to-scrum/architecture.png)

We hadn't thought of a service name in this product planning, but this was discussed among the developers. The naming process was lively, producing abbreviations and taglines, which was a pleasant surprise.

We then moved into planning. Like in a real development environment, it started with many unknowns. After seeing the product overview and an unfamiliar AWS architecture diagram, there was considerable confusion when it came to estimation.

Given the situation, estimating using Fibonacci numbers seemed impractical, so we decided to estimate using T-shirt sizes (S, M, L), starting with items that seemed to be size S, which helped move the estimation process along.

We were able to create a sprint goal and backlog for the first day's first sprint. However, the expressions during the naming phase suggested a journey started with considerable anxiety.

## Day 2

Blindly pushing forward in product development isn't efficient. In actual Scrum development, it's common to tackle "technical spikes" within a timebox.

Most of the second day was planned for a technical spike to learn AWS, which we carried out. Starting with how to use the management console, uploading files to S3, downloading from S3, and learning how to use Step Functions.

The hands-on approach with AWS helped alleviate some of the anxiety felt on the first day. As participants became more familiar with the operations, conversations increased, and expressions brightened. The quality of collaboration also seemed to improve as conversations increased. There were also instances of pointing out my simple mistakes and sharing content they researched themselves.

By the end of the day, we achieved the goal of transcribing video files uploaded to S3 and making them downloadable from S3. Achieving this goal significantly contributed to reducing anxiety. This was evident from the many sticky notes on the whiteboard during the daily retrospective. The retrospective focused heavily on Learning.

## Day 3

The architecture diagram envisioned summarizing the product goal using [Amazon Bedrock](https://aws.amazon.com/jp/bedrock/) from transcription, but at the planning stage, the product owner requested the realization of translation from transcription first, so the third day added the translation feature.

Once we had a rough idea of the translation feature, we discussed how to enhance the product's appeal and the current implementation challenges with four people. Some of the lighter issues were reflected towards the final day. The second day seemed to have alleviated much of the anxiety, but the third day appeared quite relaxed. The discussion of challenges outside the sprint scope was lively.

![Improvement Proposals](/img/blogs/2024/introduction-to-scrum/issues.jpg)

Using [Amazon Transcribe](https://aws.amazon.com/jp/transcribe/) for transcription, we built the translation using Step Functions. There were some sticking points, but we managed to construct it with reference to the AWS official blog post from October 5, 2021, "[AWS Step Functions now supports 200 AWS services to enable easier workflow automation](https://aws.amazon.com/jp/blogs/news/now-aws-step-functions-supports-200-aws-services-to-enable-easier-workflow-automation/)."

The daily retrospective on the third day felt somewhat lonely personally, as Fun was less, but Done and Learn were prevalent.

## Final Day (Day 4)

The final day involved organizing the deliverables for the sprint review, preparing the presentation, conducting the sprint review, and the retrospective. The sprint review saw participation from several people within the company, and the feedback was lively, which was a good opportunity.

The presentation and demo included improvements to the original product planning, which would have been valuable feedback even in actual product development.

The retrospective seemed less biased. Ultimately, it seemed that everyone enjoyed the team development experience.

![Retrospective](/img/blogs/2024/introduction-to-scrum/retro.jpg)

## Conclusion

Looking at the sprint periods in actual development projects, many are about a week long. This initiative of having four days per sprint aligns closely with a realistic program. We also felt a good synergy between Scrum and team-based learning (TBL).

In this study session, everyone was involved from the initial phase, but even then, the first planning phase was felt to be quite anxiety-inducing, which would likely be the case if joining a development team that uses Scrum, especially as the accumulated tacit knowledge within that team would likely increase the anxiety during planning. This has been a significant insight through the members, and we want to consider measures to reduce such anxiety.
