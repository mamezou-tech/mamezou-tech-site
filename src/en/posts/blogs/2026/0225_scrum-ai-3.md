---
title: Considering AI Utilization for Scrum Masters - Inspection and Adaptation
date: 2026-02-25T00:00:00.000Z
tags:
  - 生成AI
  - AI
  - スクラム
author: akihiro-ishida
translate: true

---
## Introduction

Ishida from the Agile Group here.

Following [Part 1: Introduction](/blogs/2025/12/04/scrum-ai-1/) and [Part 2: Transparency](/blogs/2026/01/15/scrum-ai-2/), this article is the final installment of the three-part series.

In Part 1, we introduced the Scrum Guide Extension Pack and the potential for strengthening empirical process control with AI; in Part 2, we discussed reinforcing transparency with AI by creating visualization tools using Jira × GAS × AI. This time, we will explore how a Scrum Master can leverage AI for the remaining two pillars of Scrum: inspection and adaptation.

Currently, using AI to record, transcribe, and summarize meetings is becoming commonplace. When companies start utilizing generative AI in their work, this is usually the first use case. However, it is a shame to simply save that output as “meeting minutes.” Instead, consider using AI as an objective evaluator (coach) to drive process improvements in your team.

## Why Delegate “Retrospective Evaluation” to AI

When you’ve been developing with the same team for a long time, have you ever felt that retrospectives become repetitive, with the same discussions each time? Even if you recognize the importance of finding small improvements every sprint, conversations often end with vague acknowledgments like “that went well,” lacking specific improvement actions. Or they can devolve into complaints and grievances about stakeholders, creating a negative atmosphere.

Many teams practice a “retrospective of the retrospective” to improve the retrospective itself, but it’s tough to resist the tide of monotony.

As a method of AI utilization, you can have AI perform an objective evaluation—free from emotions and interpersonal dynamics—i.e., inspection.

## Practice: Quantitative Evaluation of Retrospectives with AI

The practice is relatively simple. Input the transcript of your retrospective captured via Zoom, Google Meet, etc., directly into a generative AI. Based on that transcript, ask the AI to score the team’s discussion according to predefined evaluation criteria.

We define ten evaluation items for an excellent retrospective in consultation with the AI and score each out of 10 points, for a total of 100 points. An example of the evaluation items we created is as follows:

**List of Evaluation Items:**
1. Appropriateness of Topics  
2. Specificity of Improvement Actions  
3. Meeting Progression and Facilitation Quality  
4. Lively Discussion  
5. Participation and Speaking Distribution  
6. Resolution of Discussion Points  
7. Depth of Discussion  
8. Sustainability of Improvements  
9. Positive Perspective  
10. Neutrality Among Participants  

In addition to scores, ask the AI to propose three concrete improvement suggestions for the next retrospective. This way, for items with low scores, the AI can recommend specific actions such as encouraging input from team members other than the facilitator, enforcing timeboxes to prevent discussions from dragging on, or trying different facilitation techniques.

We also build the prompt for generating these evaluations and actions by consulting with the generative AI. Personally, I love the process of feeling the start of singularity as I craft prompts through dialogue with the AI.

If you’re using Gemini, it’s convenient to create a Gem with this prompt set as the system prompt (custom instruction).

### Running the Feedback Loop

With the preparations for quantitative evaluation of retrospectives complete, evaluating alone is meaningless. You need to connect these results to actions in the next retrospective.

Specifically, at the beginning of the next retrospective, share the AI’s previous score and improvement suggestions with the team. This allows you to start the new retrospective with awareness of past reflections (for example, that actions were too vague).

Ideally, this feedback should be provided by the Scrum Master based on their observations, but having generative AI as a partner enables more objective and persuasive feedback.

### Real-World Examples of Team Adaptations

Here are two examples of adaptations (changes) that actually took place in teams as a result of the AI’s objective scores and action suggestions.

Case 1: Low Score Due to Lack of Positivity  
The AI pointed out that the discussion focused solely on complaints and issues, lacking a positive perspective. As an adaptation, the team introduced “thank you cards” and intentionally set aside time to express gratitude and share positive points, thus encouraging more positive remarks.

Case 2: Low Score Due to Vague Actions  
Although the AI provided improvement suggestions, the suggestions didn’t translate into concrete execution plans. In response, the team established a rule to confirm the 5W1H—“when, who, what”—when deciding on actions.

## Application: Extending to the Daily Scrum

This time we introduced examples of inspection and adaptation in retrospectives, but of course this can be applied to other events. One of the most effective is the Daily Scrum.

The Daily Scrum has a strict rule that it must end within 15 minutes. If it runs over, it may indicate insufficient preparation, too much deep-dive discussion, or unnecessary topics. Moreover, the Daily Scrum should be an inspection point for achieving the sprint goal, not just a status report.

Precisely because it’s a daily event, the cycle of objective inspection and adaptation with AI has a high potential to drive significant improvements in work practices.

## Conclusion: AI as a Partner for the Scrum Master

In this series, we have introduced how to reinforce Scrum’s three pillars with generative AI: ensuring transparency (data visualization) in Part 2, and practicing inspection and adaptation (process evaluation and improvement) in Part 3.

A Scrum Master must observe the team to ensure that Scrum is implemented correctly and strive to maintain these three pillars.

AI excels at inspection, objectively pointing out habits and tendencies that humans may miss. However, for adaptation—absorbing those insights and determining how to guide the team and build culture—the Scrum Master and team need to take responsibility.

By leveraging AI as a trusted partner, strengthening your Scrum practices will likely become crucial in future agile development.
