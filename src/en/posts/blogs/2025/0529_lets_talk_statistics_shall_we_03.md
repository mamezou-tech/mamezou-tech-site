---
title: >-
  Let's Talk Statistics - Introduction to Statistics for Software Quality (No.3
  Differentiating Representative Values: Mean, Median, Mode)
author: shuichi-takatsu
date: 2025-05-29T00:00:00.000Z
tags:
  - Analytics
  - ソフトウェア
  - 品質
  - 新人向け
image: true
translate: true

---

## Introduction

In the third installment of “Let's Talk Statistics,” we will discuss how to differentiate representative values.

Data is everywhere.  
“How do you express the center of the data?”  
This is one of the most fundamental questions in statistics.

When working with quality data, the average is often used, but is that alone really sufficient for making an appropriate judgment?

In fact, the mean, median, and mode each have different characteristics, and misusing them can lead to misunderstandings.  
In this installment, we will gently explain the **differences among representative values and key points for choosing between them**, along with practical examples from software quality.

---

## What Are Representative Values?

“Representative values” are numerical indicators that show the central tendency of a data distribution.  
The three representative values commonly used in statistics are as follows:

| Type    | Description                          | Use Case (Software Quality)         |
|---------|--------------------------------------|-------------------------------------|
| Mean    | Sum of all data ÷ number of data     | Average days to fix a bug           |
| Median  | The middle value when ordered        | Median test case execution time     |
| Mode    | The value that appears most frequently | The most common error code        |

---

## Mean: A Popular Choice but “Use with Caution”

The mean is calculated as “sum of all data ÷ number of data points.”

### ● Characteristics
- Simple to calculate and intuitive to understand
- Represents the overall trend as a single number
- Can be auto-calculated by tools like Excel or Python, and is often used as the first step in aggregation

In practice, it's common to say, **“Let’s just compute the average for now,”** but this isn’t always optimal.

### ● **Strongly Influenced by Outliers**

Since the mean treats all data “equally,” it can easily be skewed by **extreme values (outliers)**.

#### Example: Test Execution Time (seconds)

Consider the following test execution times (in seconds):
```
20, 22, 21, 19, 105
```
- **Mean: `37.4` seconds**  
- Median: `21` seconds

![Distribution of Test Execution Times (Histogram)](https://gyazo.com/a2b0a59b87e63cafbd8dd614f87b0778.png)

:::info
A histogram is a bar chart that shows the distribution of data (how frequently each value occurs) by bar height. By visualizing the count in each value range (bin), you can quickly understand any skewness, the impact of outliers, central tendency, and variability. In the software quality domain, it is effective for grasping distributions of test execution times, review durations, defect counts, and similar metrics.
:::

In this case, one abnormally long execution time (105 seconds) drives the mean up significantly. In practice, even if someone says “the average is 37 seconds,” it's hard to say that this reflects the overall picture, right?

This is a typical example of the risk of using the mean when the data is **not normally distributed (※1)**.

:::info
※1: A “normal distribution” refers to a bell-shaped distribution where many data points concentrate around the mean in a symmetric pattern. We will explain this in more detail in a later installment, but for now, it is sufficient to understand it as a state in which there are few extremely small or large values and the data cluster around the center.
:::

### ● Practical Considerations
- When there are **a small number of extreme values** in metrics like rework effort, test time, or review duration, relying solely on the average can lead to overestimation or underestimation
- When using it as a basis for KPIs (※2) or SLAs (※3), it is advisable to use it in conjunction with the **median or percentiles** (※4)
- Many quality teams have experienced **“We reported the average and received complaints!”**

:::info
※2: KPI (Key Performance Indicator) → A numerical target used to measure the achievement level of a project or operation (e.g., average days to fix a bug, review completion rate).  
※3: SLA (Service Level Agreement) → A set of agreed-upon service quality metrics between a service provider and its users (e.g., initial response time to an incident, time to complete a fix).  
※4: Percentile → A measure indicating the relative standing of a value when data are ordered from smallest to largest (e.g., if the 90th percentile (P90) is 20 seconds, it means “90% of test cases completed within 20 seconds”).  
:::

### ● When Should You Use the Mean?
- **When values are not heavily skewed (i.e., the distribution is symmetric)**
- **When you want a rough overview of the whole**
- **When you want to compare multiple teams or processes**

In such cases, the mean is very effective. However, the golden rule is to **check the data distribution before using it**!

### Supplement: Types of Means

There are actually several types of “mean”:

| Type of Mean     | Characteristics                       | Example Use                                |
|------------------|---------------------------------------|--------------------------------------------|
| Arithmetic Mean  | The most common. Sum ÷ count          | Everyday averages (e.g., effort, actuals)  |
| Weighted Mean    | Weighted (reflects importance or counts) | Average bug counts by team, etc.         |
| Geometric Mean   | Used for rates of change and growth factors | Performance evaluation (e.g., processing speed) |

![Review Comment Rate by Team and Weighted Mean](https://gyazo.com/15901e97133e883b9821c3db6dbf2278.png)

For example, when averaging the number of reviews per team, using a weighted mean that assigns weights based on each team’s count results in a fairer evaluation.

---

## Median: The ‘Reliable Representative’ When There Is Variability

The median is the “middle value” when data are ordered from smallest to largest.  
Since it splits the data so that **exactly 50% of the data are smaller or larger than this value**, it is an extremely stable measure for understanding the center of a distribution.

### ● Characteristics
- Because it is the “middle” when ordered, it is **less affected by outliers**
- Particularly effective for **skewed data** or **non-normal distributions**
- Meaningful even when there are few observations (e.g., can be calculated for odd or even counts)

#### Example: Test Execution Time (Same Data as in the Mean Example)

For the same data `[20, 22, 21, 19, 105]`, the median is `21`.  
- Mean: `37.4` seconds  
- **Median: `21` seconds**

![Boxplot of Test Execution Times](https://gyazo.com/70dea722dbe3394dbf97ddf0b89ae554.png)

:::info
A boxplot is a chart that allows you to instantly understand the distribution, variability, and presence of outliers in data. The box represents the “middle 50% range (interquartile range),” the whiskers show the extent of the spread, and individual points beyond the whiskers represent “outliers.” In practice, it is useful for evaluating variability and detecting anomalies in metrics such as processing time or effort.
:::

As shown here, even with the extreme value of 105, the median remains largely unaffected, making it a highly reliable **typical value**.

### ● Practical Applications
- When deriving a “representative value” for processes with high variability—such as **test execution times or review durations**—the median reflects reality more accurately
- Using the median for metrics like **number of customer support cases or inquiry response times** also prevents overestimation due to abnormally long cases
- In comparisons of **performance by process**, the median easily absorbs “extreme differences between individuals”

For example, if the average review time is 100 minutes and the median is 35 minutes, it may be that most reviews finish in about 35 minutes, with only a few lengthy ones raising the average.

### ● The Median as a Recommended “Safety Indicator”
- Its concept is easy for beginners to understand
- It does not greatly distort the data distribution
- Reporting it alongside the mean provides **a hint of distribution skewness**

---

## Mode: Ideal for Pattern Recognition

The mode is the value that appears most frequently in the data.  
Unlike the mean or median, it directly indicates “which value occurred most often,” making it an **excellent measure for identifying typical patterns**.

### ● Characteristics
- Focuses on the most frequently occurring value
- Particularly effective for **categorical data** or **discrete numerical data**
- Rather than the center of the distribution, it can be thought of as capturing the “peak” of the distribution

#### Example: Bug Fix Duration (Days)

Consider the following bug fix durations (in days):
```
1, 2, 1, 1, 5, 3
```
For `[1, 2, 1, 1, 5, 3]`, the mode is `1`.  
- Mean: `2.2`  
- Median: `1.5`  
- Mode: `1`

![Frequency of Bug Fix Durations](https://gyazo.com/5cd46ef2e8edeb15644ee2e836db112b.png)

This means that the most bugs are fixed in one day.

### ● Practical Applications
- Identifying the **most common bug types** (e.g., UI-related bugs)
- Determining the **most frequent rework effort** (e.g., many fixes that complete in one day)
- Grasping typical durations and frequently occurring review comments

The mode is well-suited for **understanding recurring patterns**. Particularly when capturing trends by category, the mode is an intuitive and easy-to-understand metric.

For example, if a summary of review comments by category shows “naming rule violations” as the mode, it may be necessary to re-educate on that rule.

### ● Caveats and Limitations
- Be cautious when there are **multiple modes** (e.g., bimodal distributions)
- **Not easily applied to continuous data** (you might group into bins and examine via a histogram)
- Unlike the mean or median, it does not necessarily represent the overall distribution shape

---

## How to Choose? Perspectives for Practical Decision-Making

Representative values should not be fixed to a single measure; rather, it is important to **choose based on the nature of the data and the purpose of the decision**.  
Below are examples of typical decision criteria.

| Purpose                              | Suitable Representative Value | Reason                                                                           |
|--------------------------------------|-------------------------------|----------------------------------------------------------------------------------|
| To indicate the general trend        | Mean                          | Sums all values and divides by the count, providing a “rough central tendency”   |
| To avoid sensitivity to outliers     | Median                        | Takes the middle of the ordered data, so it is stable and less influenced by extremes |
| To know the most common case         | Mode                          | Shows the most frequent value, making it suitable for “identifying typical patterns” or category distributions |

### ● Supplement: Limitations of Each and the Recommendation to Use Them Together
- **Mean**: Sensitive to outliers. Since it sums all values and divides by the count, a single abnormal value (outlier) can pull the mean significantly. Be careful when the data distribution is skewed.
- **Median**: Strong in being less affected by extreme values because it considers only the middle value. However, it does not reflect “how large the difference is between the upper and lower values (the degree of variability).”
- **Mode**: A simple measure focusing on the “most frequent value,” but depending on the data, there may be no mode (values are too dispersed) or multiple modes (e.g., bimodal), making it difficult to apply in some cases.

Therefore, by presenting the **mean + median + mode together**, you can capture the data distribution and trends from multiple perspectives. In practice, supplementing the mean with the median and percentiles is the first step in preventing misunderstandings and overconfidence.

---

## Understand Visually: Relationship Between Histograms and Representative Values

By plotting a histogram, you can visually compare where the **mean, median, and mode** lie within the distribution.

### Normal Distribution: The Three Values Are Nearly the Same

For a normal distribution, the mean, median, and mode occupy almost the same position.

![Locations of Representative Values in a Normal Distribution](https://gyazo.com/7c4748e4ae30578a7dfb703daf655869.png)

### Skewed Distribution: Only the Mean Tends to Shift

In a right-skewed distribution (with outliers), outliers pull the mean to the right, causing it to diverge from the median and mode.

![Shifts of Representative Values in a Skewed Distribution](https://gyazo.com/83158a675bbf19e7c63b3a29a11b908a.png)

---

## Summary

- There are three types of representative values: the mean, median, and mode
- The mean is convenient but vulnerable to outliers
- The median is stable and robust to variability
- The mode is suited to indicating “common patterns”
- It is important to choose appropriately according to the data characteristics and purpose

---

## Next Time Preview

Next time, under the theme “Understanding Variability,” we will look at measures of dispersion such as variance, standard deviation, and range, using histograms and boxplots.

[Statistics-related information is compiled here.](/analytics/)

I hope you will find it useful for data analysis.

<style>
img {
    border: 1px gray solid;
}
</style>
