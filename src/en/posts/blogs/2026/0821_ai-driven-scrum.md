---
title: >-
  Considering AI Utilization for Scrum Masters - Practical Edition: AI-Driven
  Daily Scrum
date: 2026-08-21T00:00:00.000Z
tags:
  - スクラム
  - アジャイル
  - 生成AI
  - AI
author: akihiro-ishida
image: true
translate: true

---

## Introduction

This is Ishida from the Agile Group.

In the previous series [Considering AI Utilization for Scrum Masters](/agile/#スクラムマスターのai活用を考える), I introduced approaches to strengthen the three pillars—transparency, inspection, and adaptation—using AI. In this practical edition, I will introduce the initiative I am practicing in my current project: advancing the Daily Scrum initiated by AI output.

Up to now, the AI uses introduced were essentially about humans “going to use AI.” When you have data you want analyzed, you consult AI; when you use transcription to evaluate a retrospective, the starting point of the output is always on the human side.

However, what I aim for is a world where this relationship is reversed: AI inspects the team’s state and generates output, and humans proceed with Scrum events based on that output. In this article, as the first step toward that goal, I will concretely introduce the initiative I am practicing in the Daily Scrum.

## Daily Scrum Prone to Turning into Progress Reports

In many teams, the Daily Scrum tends to become a mere formality. It ends up as just a progress report meeting where members share in turn “what I did yesterday, what I will do today, and any blockers,” and somehow burn through 15 minutes. It’s not uncommon for teams to finish that way.

Originally, the Daily Scrum is not just a place for work reports. It should be an opportunity to inspect whether we are on track to meet the Sprint Goal and, if necessary, adapt the plan.

However, conducting this “inspection and adaptation toward the Sprint Goal” thoroughly every day is not easy. It’s burdensome for humans to accurately grasp each morning how ticket statuses changed from yesterday to today, and whether those changes are good or bad signs for achieving the Sprint Goal.

This is where AI comes in. It accumulates and analyzes daily changes to tickets and objectively evaluates their relationship to the Sprint Goal.

## Practice: Accumulate Ticket History with GAS and Analyze with Gemini

The mechanism I am practicing consists largely of the following steps:

1. Use Google Apps Script (GAS) to fetch the status of Jira tickets in the current sprint and their linked subtasks daily, and accumulate them in Google Docs in a time series.
2. Have Gemini analyze the accumulated history and output inspection results for the Sprint Goal.
3. Conduct the Daily Scrum using Gemini’s analysis results as the source of information.

### Step 1: Accumulating Daily Ticket History with GAS

First, prepare a GAS that records Jira data in Google Docs via the Jira API. For creating the GAS code itself, I also use generative AI, as in previous articles. The document content begins with the Sprint Goal of the currently ongoing sprint, followed by appending daily the change history of tickets—stories, tasks, and their linked subtasks—in the sprint. Tracking subtask changes increases the data volume but allows us to capture actual progress and any bottlenecks.

What we fetch from Jira looks roughly like this:

```
=== 2026-08-05 Snapshot ===
sprint_name: Sprint 21
sprint_goal: Make the user notification feature releasable

target_date: 2026-08-14

  id: prj-1421 - Define data model for notification settings
  status: Done
  assignee: Tanaka
  story_points: 2
  change_log: 2026-08-13 15:23 status(InProgress -> Done)

  id: prj-1422 - Implement settings update API endpoint
  status: In Progress
  assignee: Tanaka
  story_points: 1
  change_log: 2026-08-13 15:45 status(To Do -> InProgress)
```

### Step 2: Analyzing from the Perspective of Inspection and Adaptation with Gemini

Before the Daily Scrum, I have Gemini analyze the accumulated document. By registering the system prompt as a custom instruction in Gemini, you can obtain stable analysis every morning from the same perspective, which is convenient.

For use in the Daily Scrum, the following content is particularly important:

- **Sprint Goal Status**: By analyzing ticket and subtask change history alongside the Sprint Goal, AI inspects the current state of development in relation to Sprint Goal achievement.
- **Member-Wise Today's Updates & Questions**: The AI organizes the recent work status for each member assigned to tickets and generates specific questions—such as whether there are any blockers to achieving the Sprint Goal.

In the actual Daily Scrum, we check each member’s work status based on this information, verify the validity of AI’s inspection of the Sprint Goal, and adapt the plan if necessary. This ensures the Daily Scrum does not end as a mere progress report but naturally unites the team toward the Sprint Goal.

Here is part of the prompt for the Gem I created:

```
# Role
You are an excellent Agile Scrum Master and the facilitator for the Daily Scrum.
Read the provided Jira log and, to help the team achieve the Sprint Goal,
organize the points to confirm in today’s Daily Scrum and generate the opening remarks for the meeting.

# Characteristics of Input Data & Operational Rules
(omitted)

# Thought Process & Instructions
(omitted)

# Output Format
Output in the following structure.
Maintain a professional yet approachable tone so it can be comfortably read straight through in the Daily Scrum.

Good morning, everyone. Let’s begin today’s Daily Scrum.
## Sprint Goal Status
  [Goal Item]: (A concise analysis in 1–2 lines considering the sense of progress, remaining tasks, and types of work)

## Member-Wise Today's Updates & Questions
  [Member Name / For pair programming, list both names]
  Recent status: (A summary of ticket movements or changelog on the most recent workday)
  AI Question: (A specific question considering the status and types of work, such as asking if there are any blockers)
```

## Scrum Driven by AI’s Output

The essence of this mechanism is that the starting point of the Daily Scrum becomes AI’s output.

Traditionally, members report their status one by one, someone notices a problem, and so on. But in this practice, Gemini completes the inspection of the Sprint Goal before the Daily Scrum even begins.

The team can start the Daily Scrum from the “discussion points for today” presented by the AI. For example, “Let’s first discuss the blocker on the API implementation that Tanaka-san is responsible for, which the AI has identified.”

This is the beginning of the world I aim for: not humans going to the AI, but Scrum driven by AI’s output. Humans are freed from the effort of querying the AI and can focus on the human-only decision making of “how to adapt” based on the insights the AI provides.

## Deployment as a Scrum Master

I built this mechanism and deployed it to the team. For the first two weeks or so, I ran the analysis in Gemini myself while adjusting the data and prompts, and shared the results via Slack as a test operation. Once it was stable, I left the decision to continue up to the team, and now the team autonomously uses this mechanism.

As a Scrum Master, I think it is important to present the team with the option to strengthen inspection and adaptation in the Daily Scrum, but leave the decision on whether to actually use it to the team.

## Changes in the Team through AI-Driven Daily Scrum

We operate the actual Daily Scrum in the following flow. Note that the team is fully remote.

1. The facilitator for the day runs Gemini before the Daily Scrum and posts the results to Slack.
2. Based on the analysis results, first understand the Sprint Goal status, then review the member-wise questions provided by the AI.
3. Indicate via a Zoom reaction—“Yes,” “No,” or “Not sure”—whether we can achieve the Sprint Goal as is.
4. If any are “No” or “Not sure,” confirm the details and change the work plan if necessary.

There is a practice in the Daily Scrum called “Sprint Goal Check-in.” At the start of the Daily Scrum, all developers are asked, “Does it look like we can achieve the Sprint Goal if we continue like this?” This reinforces inspection of the Sprint Goal. The above method adds AI assistance to this, further strengthening inspection and adaptation for the Sprint Goal.

Our team used to share individual work statuses in the Daily Scrum but couldn’t inspect whether that work was correctly aligned with the Sprint Goal. The AI analysis has increased transparency of the work status, and by having the AI handle the inspection of the Sprint Goal, discussions about necessary adaptations naturally emerge in the team.

## Potential Questions

### If you're running Gemini manually, can you really call this AI-driven?
One may wonder: if Gemini is ultimately operated by humans, isn’t the starting point still human? That is true. Ideally, you would automate the analysis using an API, posting the inspection results to Slack before every Daily Scrum. However, this method considers the constraint that AI-related APIs cannot be used in the project I’m involved in. If you’d like to try this yourself, please challenge yourself with more advanced automation.

### Wouldn't it be possible to analyze tickets with Jira's built-in AI?
Jira currently includes an AI agent called Rovo. With it, you can likely analyze the sprint with less effort. However, considering freedom of prompts and stability of outputs, I believe the method using a system prompt like this is sufficiently useful.

## Points to Note When Practicing

### AI Inspections Are a 'Draft'
While Gemini’s inspections are highly useful, they only analyze what can be gleaned from ticket data. They can't grasp context not visible in tickets—for example, that “this ticket is stalled because we intentionally deprioritized it.”

While making the AI’s output the starting point, the team must judge whether its insights are on target. This dialogue is the value of the Daily Scrum, not blindly trusting the AI’s analysis.

### Beware of Document Bloat
Writing data, including Jira ticket changelogs, every day causes the document—and thus the AI input—to bloat. You need measures to limit data volume, such as switching to a new document each sprint or writing only items that changed since the previous day.

### Reflect on the Mechanism Itself
Regularly reflect on whether this mechanism is serving the team. If the AI’s output is off the mark or misleads discussions, review the prompts and the data being stored. Also, as a Scrum Master, your role ends at providing the mechanism. If you conclude it’s meaningless to the team or the operational burden is too high, decide to stop using it.

## Conclusion

In this article, as the practical edition of the “Considering AI Utilization for Scrum Masters” series, I introduced an initiative to drive the Daily Scrum from an AI starting point.

- Use GAS to accumulate daily histories of Jira tickets and subtasks in Google Docs.
- Generate the Sprint Goal status and member-wise questions every morning with a custom Gemini instruction (Gem).
- Start the Daily Scrum based on those analysis results, combining them with the Sprint Goal Check-in to strengthen inspection and adaptation.

With this mechanism, the Daily Scrum, which tended to end as mere progress reports, has transformed into a venue for inspecting the Sprint Goal and discussing adaptations. It steadily strengthens Scrum’s three pillars—transparency of work status, inspection toward the Sprint Goal, and adaptations for goal achievement—through AI.

This initiative is still a work in progress, but AI will continuously inspect the team's state, and humans will focus on adaptation based on those insights. I look forward to further exploring this AI-driven Scrum world through continued practice.
