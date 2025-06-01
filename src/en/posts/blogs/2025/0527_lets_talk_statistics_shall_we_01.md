---
title: >-
  Let's Talk About Statistics - Introduction to Statistics for Software Quality
  (No.1 What Is Statistics? Why Is It Necessary for Software Quality?)
author: shuichi-takatsu
date: 2025-05-27T00:00:00.000Z
tags:
  - Analytics
  - ソフトウェア
  - 品質
  - 新人向け
image: true
translate: true

---

## Introduction

A certain division of an IT company.

> **QA Manager**: "I feel like there were an unusually high number of bugs in the last release—what do you think?"  
> **Dev Lead**: "Well... I do get the impression there were a bit more than usual."  
> **QA Manager**: "'Impression,' huh... What do the numbers say?"  
> **Dev Lead**: "Uh, let's see..."  
> **QA Manager**: "Also, the test we added last month—is it having an effect? Have defects decreased?"  
> **Team Member**: "It feels like they have decreased, but I can't say for sure..."

Such conversations are not uncommon in IT workplaces.  
If we talk about quality based on 'it feels like' or 'probably', the real issues won't become visible.  
Is it acceptable to make decisions that affect project quality based only on subjective impressions?

This is where "statistics" become necessary.

Statistics is a tool for quantifying a variable reality and making evidence-based decisions.  
"Measure correctly, visualize, and think"—that is the first step toward quality improvement.

That said, just hearing "statistics" may bring to mind complex equations and graphs, causing many to hesitate.  
But don't worry. In this series, we'll gently introduce the concepts of statistics from a practical viewpoint that those involved in software development and quality management can actually use.

Let's start by exploring the basics: "What is statistics anyway?"

---

## What Is Statistics?

When you hear the word "statistics", what comes to mind?  
Graphs, averages, variance, normal distribution... or perhaps some daunting formulas?

However, the essence of statistics is very simple.  
"A methodology for collecting, organizing, analyzing data, and extracting meaningful information"—that is statistics.

In both our daily lives and at work, we inadvertently make "statistical judgments".

In everyday life:
- "This cafe is always crowded, so I'll go at a different time."
- "Lately, I feel like I'm spending more time looking at my smartphone before bed."
- "Those clouds look like it's going to rain, so I'll take an umbrella when I go out."

These decisions are examples of determining future actions based on past experience and observations (= data).  
In other words, we naturally read trends from data and make decisions.

Likewise, at work:
- "The number of review comments this month seems lower than usual."
- "I feel like the time it takes to run tests has been increasing lately..."
- "It seems this task tends to be completed faster by Team B than by Team A."

These, too, are acts of sensing "changes" and "differences" from accumulated data and making judgments.

In other words, statistics is not a difficult technique used only by experts.  
It is a technique to turn the intuitive ability to utilize data we already have into a more accurate and reliable form.

And in practice, statistics becomes a powerful weapon to support problem-solving and decision-making in the following ways:

- Understand trends in project progress and quality  
- Detect signs of anomalies early  
- Objectively evaluate the effectiveness of improvement measures  
- Provide explanations that convince the team and customers

"Turning the unseen into the seen"—that's the greatest value of statistics, and it directly connects to improving quality and preventing recurrence.

In the next section, let's look at the difference between descriptive statistics and inferential statistics, the two central concepts of statistics.

---

## The Two Pillars of Statistics

The world of statistics is broadly composed of two pillars. These are **descriptive statistics** and **inferential statistics** (also called estimation statistics).  
Understanding these two pillars gives you the basic stance on how to look at data and how to make decisions.

These two have clearly divided roles based on the perspective of how to handle the data you have.

### Descriptive Statistics

**Descriptive statistics** is the technique for organizing, summarizing, and visualizing the data you have on hand.

For example, the following processes fall under descriptive statistics:
- Compute **representative values** (e.g., mean, median, mode)  
- Derive **measures of dispersion** such as standard deviation, variance, and range  
- **Visualize data distributions** using histograms, box-and-whisker plots, etc.

> Example: Aggregate the number of defect tickets by week and view the trend with a bar chart

![](https://gyazo.com/3b1732dbf2fda6dc206bdb625fbfcfa8.png)

The strength of descriptive statistics is that it clearly captures what is happening now.  
It can be immediately applied in everyday work, such as checking project progress, analyzing trends in review results, and quantifying daily reports.

#### The Core of Descriptive Statistics: The Ability to Grasp the Current Situation

Descriptive statistics is precisely the technique to visualize "what is happening now".  
For example, by organizing pass rates of test executions, defect occurrence timings, and the number of code review comments, you can clarify process bottlenecks and stability.

- Representative values (mean, median) → central tendency of defects  
- Measures of dispersion (standard deviation) → variability in stability  
- Histograms and box-and-whisker plots → distribution shape and outlier detection

Without statistics, these tend to remain subjective impressions of "probably too many or too few".  
Using descriptive statistics, you can speak clearly with numerical evidence.

### Inferential Statistics

**Inferential statistics** is the method of inferring the characteristics of a population from a sample of data at hand.  
In other words, it's the technique of gauging the unseen parts based on limited observations.

It mainly includes the following analyses:
- **Confidence intervals**: the range within which the true mean is believed to lie  
- **Hypothesis testing**: whether the effect of an improvement measure can be said to be not due to chance

> Example: "Can we really say that the number of bugs decreased after introducing the new test process?"

![](https://gyazo.com/bb1bcb2d264049bd59109d4102db5c2e.png)

#### The Core of Inferential Statistics: Decision-making Power

Inferential statistics is used to determine "Is this sufficient?" and "Is the change genuine?"

For example:
- The number of review comments decreased after the new guidelines → Could that decrease be just random?  
- It appears we are hitting the quality targets → Is that result truly within a trustworthy range?

To verify these, you need inferential statistics—the method for inferring the whole from a sample.  
Concepts such as confidence intervals, hypothesis testing, and p-values come into play here.

---

## About Bayesian Statistics

In statistics, there is actually another approach called **Bayesian statistics**.  
This is a method of inference that, in addition to observed data, incorporates prior knowledge (prior probabilities).

However, Bayesian statistics is a different framework with a different definition of probability, and it has many specialized applications.  
In this series, we will first focus on frequentist statistics, i.e., **descriptive statistics and inferential statistics**.  
**We plan to introduce Bayesian statistics in the later part of the series or as a special edition.**

---

## The Relationship Between Software Quality and Statistics

### Quality Varies

In software development environments, quality fluctuates daily.  
The number of defects, detection timing, fix cost, test pass rate—none of these remain completely constant.

Such **variability is the very essence of quality risk**.  
And if you ignore this variability and make decisions by feel, it can lead to serious oversights and mistakes.

What you need is **statistics** to capture with numbers and discern trends.  
Quantify variability, detect anomalies, and maintain process stability.  
This, precisely, is the role of statistics in software quality management.

### Where Statistics Shine

In software development, you can use statistics in more scenarios than you might imagine.  
Both descriptive and inferential statistics play their roles.

- **Trend analysis of defect counts** (Descriptive Statistics)  
  → Aggregate weekly bug report counts to grasp quality trends for each release

- **Verifying the effect of process improvements** (Inferential Statistics)  
  → Did the number of comments decrease after introducing the new review procedures? Determine with hypothesis testing

- **Process stability monitoring** (Descriptive Statistics + Control Charts)  
  → Monitor test pass rates with X̄-R control charts to detect early signs of anomalies

- **Identifying outliers and root cause analysis** (Descriptive Statistics)  
  → Identify bugs that took an unusually long time to fix and use that to plan recurrence prevention measures

- **Evaluating goal attainment** (Inferential Statistics)  
  → Statistically verify whether the actual value meets the goal of keeping defect density at or below 0.8 defects/KLOC*

※1: KLOC (Kilo Lines of Code): A unit used in software engineering as a metric for size, productivity, or quality. One KLOC denotes 1,000 lines of source code.

In this way, statistics can be used **across all processes to understand the current state, drive improvements, and maintain quality**.

### Quality Management = Application of Statistics

It's often said that "quality is built in".  
But in reality, **quality can only be maintained by measuring, observing, and controlling it**.

Statistical Quality Control (SQC) has developed in the manufacturing industry.  
However, in recent years, its significance has been reevaluated particularly for 'invisible' products such as those in software development.

Defect reports, review records, test logs—we are already surrounded by a lot of data.  
It is the true value of statistics to 'handle them as numbers' and leverage them for improvement.

---

## The Power You Gain by Learning Statistics

Statistics is not just an analysis tool. For quality managers and engineers, it's also a 'thinking skill' for acquiring the following abilities:

- **Quantitative judgment**, not swayed by intuition or assumptions  
  → Instead of "I somehow feel that bugs have decreased," you can say "they have significantly decreased with a p-value of 0.01."

- **Explanatory ability** to answer "Why can you say that?"  
  → Convince your team, manager, or clients with objective evidence

- **Ability to prove** the effect of improvements  
  → Determine whether a measure's effect is due to 'chance' or genuine ability

- **Visualization skills**  
  → Create intuitive visuals such as heat maps and graphs to communicate data

Adopting a statistical mindset represents an evolution from "relying on experience and intuition" to "making decisions based on data".  
And that is the first step toward becoming the kind of person who can speak about quality with confidence.

## After Learning

Now, how has the conversation of the IT company personnel that we discussed at the beginning changed?

> **QA Manager**: "How were the bug trends in last month's release?"  
> **Dev Lead**: "Yes; compared to last time, the number of bugs decreased from 18 to 11. There's also a clear difference in the 95% confidence interval."  
> **QA Manager**: "I see. So the additional testing had an effect?"  
> **Team Member**: "Yes. After implementation, bug density dropped from 0.9 to 0.5 defects/KLOC, and hypothesis testing shows a significant difference."  
> **QA Manager**: "Great. It's reassuring when the effect is demonstrated with numbers."

---

## Summary

- Statistics is a tool for making accurate judgments based on data.  
- Using descriptive and inferential statistics as needed enables improvements in practice.  
- Statistics is an indispensable skill in software quality.

---

## Next Time

Next time, under the theme "Engaging with Data," we will delve into the differences between qualitative and quantitative data, measurement values and their errors, and what makes good data.

[I have compiled statistics-related information here.](/analytics/)

I hope you find it useful for your data analysis.

<style>
img {
    border: 1px gray solid;
}
</style>
