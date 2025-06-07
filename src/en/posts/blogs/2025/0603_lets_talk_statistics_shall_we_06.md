---
title: >-
  Let's Talk About Statistics - Intro to Statistics for Software Quality (No.6
  How to Correctly Choose Graphs for Practical Use)
author: shuichi-takatsu
date: 2025-06-03T00:00:00.000Z
tags:
  - Analytics
  - ソフトウェア
  - 品質
  - 新人向け
image: true
translate: true

---

## Introduction

In the 6th installment of "Let's Talk About Statistics", we address the theme of **choosing the right graphs for practical use**.

When presenting data to **convey** it to an audience, how you use graphs is extremely important.  
No matter how accurate your analysis, selecting or drawing the wrong type of graph can lead to misunderstandings or mistrust.

This time, we'll organize the key points for selecting among the following six basic graphs frequently encountered in practice:

- Bar Chart: Ideal for comparing quantities across categories  
- Line Chart: Effective for understanding time-series changes and trends  
- Scatter Plot: Visualizes relationships between two numerical variables  
- Histogram: Captures the distribution shape of continuous data  
- Box Plot: Best for visualizing variability, skewness, and outliers  
- Pareto Chart: Used for prioritizing and judging key factors

Additionally, we'll share perspectives on creating **persuasive materials**, including examples of "graphs you should avoid."

---

## Bar Chart: Ideal for Comparing Quantities Across Categories

A bar chart is the most basic graph for visually grasping differences in quantity across categories.  
It excels at capturing data trends and balance, making it highly effective as the **first step in quality analysis**.

### ● Software Quality Example

The following is an example of the number of review comments by development team.  
![Number of review comments by development team (Example)](https://gyazo.com/c11335bcea0676db665f06bb7f7d803d.png)

### ● Suitable Scenarios

- Number of bugs by type (e.g., logic vs UI)  
- Number of reviews per month (as a first step in time-series analysis)  
- Productivity by development team (e.g., number of completed items per story point)

If your goal is to **compare quantities across categories**, a bar chart is optimal.  
You can also immediately spot data trends (for example, if Team A has an unusually high count).

### ● Key Points

- Vertical axis shows quantity, horizontal axis shows categories (numeric vs categorical)  
- Bars’ **length or height** carries meaning  
- Easy to compare even with many items  
- Suited for **non-ordinal categorical data** (nominal scale)

Note: Using horizontal bars can improve readability of category labels.

### ● Practical Pitfalls

- For data with an inherent order, such as months or process phases, a line chart is more appropriate.  
  Using a bar chart can obscure the "flow" of a time series.  
- If bar colors have significance (e.g., severity levels), **omitting a legend can cause misunderstandings**.  
- Pay attention to the **order of categories**. Using alphabetical order or an arbitrary order can make trends hard to discern.

---

## Line Chart: Strong for Time-Series Changes

A line chart is extremely well-suited for representing **changes or trends over time**.  
In software development, it's frequently used to **visualize progress and quality trends**.

### ● Software Quality Example

Below is an example of the weekly review completion rate trend.  
![Weekly review completion rate trend (Example)](https://gyazo.com/e6f3ed40c8fbc3fc44b8a6f6299d4180.png)

### ● Suitable Scenarios

- Daily or weekly trends in bug occurrences (for early anomaly detection)  
- Monthly review completion rates (to confirm improvement effects)  
- Pass rates by process phase (to evaluate stability of each phase)

If your goal is to understand the "flow" or "increase/decrease trend," a line chart is most effective.  
It is especially useful for **measuring the effects of improvement activities or detecting anomalies**.

### ● Key Points

- **X-axis is typically a time axis** (day, week, month, etc.)  
- Multiple series (by team, by category, etc.) can be displayed simultaneously using different line colors or styles  
- Overlaying **trend lines or target lines** helps intuitively grasp differences from goals or overall tendencies  
- Even with many data points, connecting them with lines allows you to perceive **smooth variations**

### ● Practical Pitfalls

- **For non-ordinal (categorical) data, forcing a line chart** can lead to misunderstandings (e.g., bug counts by reviewer).  
- With **very few data points** (e.g., only three), the straight lines may overemphasize a "trend" that isn't real.  
- **Sharp fluctuations** can create a strong visual impression, potentially hindering calm decision-making.

Line charts are the foundation for **graphs that handle time-series data**.  
However, using them incorrectly can lead to misleading or overconfident interpretations.

---

## Scatter Plot: When You Want to See Relationships

A scatter plot is used to **visualize the relationship (correlation) between two numerical variables**.  
In software quality management, it's effective for grasping connections among various variables.

### ● Software Quality Example

Below is an example showing the relationship between review duration and number of comments.  
![Relationship between review duration and number of comments (Example)](https://gyazo.com/2fba134e640af63e2d26fd8c3deb0eba.png)

### ● Suitable Scenarios

- **Number of test cases vs. number of bugs**: to evaluate test design effectiveness  
- **Review duration vs. number of comments**: to check review quality and efficiency  
- **Effort spent on fixes vs. scope of impact**: to verify whether larger changes require more effort

A scatter plot is ideal when you want to **see at a glance** whether there is a correlation and what its tendency is.

### ● Key Points

- **Use continuous numerical data for both X and Y axes** (e.g., duration, count, lines of code)  
- Effective not only for detecting correlation but also for identifying **outliers** (points that clearly differ from others)  
- Adding a trend line (regression line(※1)) clarifies the direction (positive/negative) and strength of the relationship  
- **Shape of the scatter** (tall, wide, spread) allows visual understanding of the relationship's nature

:::info
※1: A **regression line** is the line of best fit through data points on a scatter plot.  
You can grasp at a glance whether the data tend to increase or decrease.  
It's also used for future predictions and quantifying correlations (covered in a later installment).
:::

### ● Practical Pitfalls

- **Plotting categorical data (e.g., reviewer names or module names) on a scatter plot is meaningless.**  
  In such cases, bar charts or box plots are more appropriate.  
- When **points overlap densely**, the actual distribution becomes hard to see.  
  Use **transparency (alpha), adjust point size, or add jitter** to improve visibility.  
- If points **include a time component**, using color or marker variations to represent time can be effective.

Scatter plots are the **first step to explore relationships**.  
However, **correlation does not imply causation**, so interpret with caution.

---

## Histogram: Grasping the Distribution Shape

A histogram is a fundamental tool for **visually capturing distribution characteristics of continuous data**.  
It divides the value range into several "bins"(※2) and represents the count (frequency) of data in each bin with bar heights.

:::info
※2: A "bin" refers to an **interval** when you split the data range into several sections.  
You then show the **frequency** (how many data points fall into each interval) as the bar height.

Example: If data are distributed between 0–100 and you split into 10 bins:  
  - Bin width = 10  
  - Bins: 0–10, 10–20, 20–30 … 90–100  
The bar height represents the number of data points in each interval.

- Deciding the number of bins:  
  The number of bins (≈ number of bars) greatly **affects appearance and analysis results**.

  1. Set manually (e.g., 10–20 bins)  
     - Simple but subjective.  
     - **Too few bins** give only a rough picture; **too many bins** make interpretation difficult due to excessive detail.

  2. Automatic methods (representative ones)  
     ● Sturges' formula: k = ⌈log₂(n) + 1⌉  
       - **n** = number of data points, **k** = number of bins  
       - Suitable when data are approximately normally distributed  
       - A simple rule recommended for beginners

     ● Freedman–Diaconis rule (robust to outliers): h = 2 × IQR × n⁻¹/³  
       - **h** = bin width, **IQR** = interquartile range  
       - Suitable when outliers are present or for non-normal distributions  
       - Bin count is determined by: k = (max – min) / h

     ● Scott's rule: h = 3.49 × σ × n⁻¹/³  
       - **n** = number of data points  
       - **σ** = standard deviation  
       - Bin count is determined by: k = (max – min) / h
:::

### ● Software Quality Example

Below is an example visualizing the distribution of test durations.  
![Distribution of test durations (Histogram)](https://gyazo.com/c068e413180ddb0210f87a086fca12b4.png)

### ● Suitable Scenarios

- When you want to check the distribution of quantitative data with continuous values such as **response time, processing time, test execution time, memory usage, review duration**  
- When you want to quickly grasp aspects like **spread, skewness, outliers,** or the number of peaks (multimodality)  
- For an intuitive check of normality (as a pre-check before descriptive statistics or hypothesis testing(※3))

:::info
※3: **Hypothesis testing** is a statistical method for determining whether observed results are due to chance or represent a meaningful difference.  
For example:  
- "Has this improvement measure really shortened review times?"  
- "Is the difference in bug counts for this team random?"  
It's a tool to draw statistical conclusions. This article does not cover it in detail, but after getting a sense of trends via descriptive statistics, hypothesis testing helps **determine if those trends apply to the entire population**.  
We'll explain it in another installment.
:::

### ● Key Points

- Visualizes the **shape (distribution)** of the entire dataset  
  → e.g., symmetric, right-skewed, multiple peaks (multimodal)  
- Overlaying **mean, median, and mode** makes it easier to understand differences among representative values  
- **Adjusting the number of bins** allows for rough or detailed views of the distribution (too many or too few is problematic)  
- Overlaying another distribution (e.g., a normal distribution) lets you see **how far the data deviate**

### ● Practical Pitfalls

- **Bin width or count settings can greatly change the visual impression.**  
  Use a consistent rule (Sturges’ formula, Freedman–Diaconis rule, etc.) or adjust based on your purpose.  
- **Distant outliers** can stretch the scale and obscure the overall shape.  
  Consider using a log scale or separating outliers in a separate display.  
- Not suitable for categorical or discrete values (use bar charts instead).

A histogram is one of the **first graphs you should look at**.  
Once you know the distribution shape, you can more easily decide which central tendency or dispersion measures are appropriate.

---

## Box Plot: Visualizing Outliers and Variability

A box plot is a powerful graph that **visualizes data spread, skewness, and outliers** in one view.  
Based on quartiles, it lets you simultaneously see the median, interquartile range (IQR), minimum, maximum, and outliers.

### ● Software Quality Example

Below is an example comparing the distribution of bug fix durations by team.  
![Variation in bug fix durations by team](https://gyazo.com/2ad601ce80054060965892debf75e029.png)

### ● Suitable Scenarios

- Visualizing **continuous data with variability** such as review time, fix effort, or test execution time  
- Comparing variability across multiple teams or months  
- Checking stability or anomalies by phase (e.g., if one month has an extreme number of outliers)

### ● Key Points

- **Center line of the box: median** (2nd quartile)  
- **Box edges: 1st quartile (Q1) to 3rd quartile (Q3)** → interquartile range (IQR)  
- **Whiskers**: typically extend from Q1 – 1.5×IQR to Q3 + 1.5×IQR  
- **Outliers**: data points beyond the whiskers (plotted as ●, etc.)  
- You can read **distribution skewness** from the box position and whisker lengths

### ● Practical Pitfalls

- **Don't judge "anomalies" based solely on box shape or outliers.**  
  Distribution skewness or extreme variability may be inherent to the data.  
- **Interpretation is difficult with very small sample sizes.**  
  Even if outliers appear many, they might just be natural variability.  
- When comparing multiple groups, **ensure consistent axis scales.**

Box plots are a convenient tool to simultaneously capture **distribution spread, skewness, and outliers**.  
They are one of the **graph types you should draw first** to identify “practical risks” that the mean alone cannot reveal.

For more on box plots, see these articles:  
- [Checking Outliers with a Box Plot](/blogs/2022/05/18/check-outliers-with-a-boxplot/)  
- [Drawing Box Plots and Scatter Plots Together to Grasp the Overview (Plotting)](/blogs/2022/08/05/boxplot-and-scatterplot/)  
- [Drawing Box Plots and Scatter Plots Together to Grasp the Overview (Stratification & Analysis)](/blogs/2022/08/15/boxplot-and-scatterplot-2/)

---

## Pareto Chart: Ideal for Prioritization (Pareto Chart)

A Pareto chart combines a **bar chart and a line chart**, enabling you to visualize category counts and their cumulative percentages simultaneously.  
Used to identify the "vital few vs. trivial many (80:20 rule)", it’s suitable for **allocating resources and prioritizing improvements**.

### ● Software Quality Example

Below is an example showing bug counts by type and cumulative contribution rate.  
In this example, addressing the top three bug types—Logic, UI, and Specification Omissions—handles nearly 80% of all bugs.  
![Pareto chart by bug type](https://gyazo.com/2ea51ed52464fb97b0e07facf9a4caaa.png)  
- Red bars: bug counts (in descending order)  
- Blue line: cumulative contribution rate (%)  
- Left axis: count, right axis: %

### ● Suitable Scenarios

- Visualizing occurrences by category, such as **bug causes or review comment types**  
- Prioritizing **quality improvement**  
- Focusing on **high-impact issues**

### ● Key Points

- Bar chart: **occurrence count by category (in descending order)**  
- Line chart: **cumulative contribution rate (%)**  
- Usually, the **leftmost few categories account for the majority (around 80%)**  
- Visually distinguishes the “important few” from the “trivial many”

### ● Practical Pitfalls

- **Category order must be in descending occurrence count, or the chart loses meaning.**  
  Random ordering breaks the significance of the cumulative line.  
- Because the bar chart’s **left axis (count)** and the line chart’s **right axis (%)** are different, omitting clear axis labels can cause confusion.  
- **Deciding whether to address only the top categories requires on-site judgment.**  
  Critical issues may hide in less frequent categories.

Pareto charts are a **decision-making tool** that tells you “what to prioritize.”  
They are invaluable for visualizing **effective resource allocation** in quality analysis.

---

## Examples of Graphs to Avoid

Graphs meant to convey data can sometimes **cause misunderstandings or confusion**.  
Below are some "common but avoidable graph representations" seen in practice.

- **3D Charts** (prioritizing appearance but inviting misreading)  
  - Three-dimensional bars or pie charts create a **depth illusion**, making it hard to accurately perceive actual value proportions.  
  - In pie charts, **front-facing slices appear larger**, leading to **misreading of percentages**.  
  → As a rule, **2D representations are sufficient**.

- **Overly Decorative Graphs** (too many colors, shadows, animations)  
  - Gradients, animations, and excessive color distract from actual data comparisons.  
  - They divert the reader’s attention, making it **unclear what you want to convey**.  
  → Limit colors to **around three**, highlighting only essential parts.

- **Mixing Axes with Different Scales** (gives misleading impressions)  
  - Combining charts with **different left and right axis scales** can create the illusion that two lines move similarly.  
  - It can give the impression of manipulative presentation.  
  → When using dual-axis graphs, **clearly label each axis and provide explanatory notes**.

### ▶ The bottom line:

**The purpose of a graph is to "convey," not to "decorate."**  
Aim for an honest and clear presentation that avoids misleading your audience.

---

## Summary

- Graphs are tools to show **comparison**, **change**, and **relationships**. Use the format suited to each purpose.  
- Choose based on data type (categorical vs numerical, time-series vs non-time-series).  
- Inappropriate graphs can become “lies.” Always prioritize **clarity of communication**.

---

## Next Time Preview

Next time: "Introduction to Statistical Graphs with Python and Excel".  
We'll provide practical graphing techniques and tool usage with real code that you can use immediately in practice.

[We've compiled statistics-related information here.](/analytics/)

We hope you find it useful for your data analysis.

<style>
img {
    border: 1px gray solid;
}
</style>
