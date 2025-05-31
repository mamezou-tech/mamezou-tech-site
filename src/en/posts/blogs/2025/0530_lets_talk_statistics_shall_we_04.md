---
title: >-
  Let's Talk About Statistics - Introduction to Statistics for Software Quality
  (No.4 Understanding Variability: Variance, Standard Deviation, Range)
author: shuichi-takatsu
date: 2025-05-30T00:00:00.000Z
tags:
  - Analytics
  - ソフトウェア
  - 品質
  - 新人向け
image: true
translate: true

---

## Introduction

In the 4th installment of "Let's Talk About Statistics", we will discuss the theme of understanding variability.

All measured data, not just quality data, include some degree of variability.  
Using only representative values such as the mean or median fails to reveal the spread of the distribution, which can lead to incorrect interpretations.

In this article, we will introduce the following metrics for quantitatively capturing data variability:

- Variance
- Standard Deviation
- Range

We will visually explain the differences and appropriate usage of each using histograms and box plots.

---

## Variance and Standard Deviation: Quantifying Data Spread

### ● What is Variance?

Variance is the **mean of squared deviations** of the data from the mean.  
A large variance indicates high variability, and a small variance indicates low variability.

It might seem sufficient to measure variability by summing deviations, but simply summing deviations always yields zero. (The mean μ is defined such that the sum of deviations of all data points from the mean is zero.)  
In other words, the following relation always holds:

Σ_{i=1}^{N} (x_i − μ) = 0

Since this "sum" provides no information about the magnitude of deviations, we need to apply squaring to the deviations:

Variance = (Σ_{i=1}^{N} (x_i − μ)²) / N

μ: mean  
N: number of data points

However, since its unit is the square of the original data's unit, it can be difficult to interpret intuitively.

:::info
Strictly speaking, there are several definitions of variance that are used depending on the purpose.
- **Population variance** (σ²): σ² = (1/N) Σ_{i=1}^{N} (x_i − μ)²
- **Unbiased sample variance** (s²): s² = (1/(n−1)) Σ_{i=1}^{n} (x_i − x̄)²

Here, μ and x̄ have the following meanings:
- μ: population mean (mean of the entire population)
- x̄: sample mean (mean of the sample)

The denominator changes depending on whether you are dealing with the entire population or estimating from a sample:
- When handling the entire population: denominator is N
- When estimating from a sample: denominator is n − 1 (unbiased variance)

As an international notation convention, the following symbols are used:
- **N**: population size (total number of data points)
- **n**: sample size (number of data points in the sample)

This notation helps visually distinguish "whole versus part."

In practice, there is also a version of sample variance without this correction:
- **Biased sample variance**: s² = (1/n) Σ_{i=1}^{n} (x_i − x̄)²

However, the sample variance that divides by n tends to **underestimate the population variance**. To correct this bias and produce an estimate closer to the population variance, a **degrees of freedom** correction is applied by using n − 1 in the denominator. We will cover the background and meaning of this correction in the section on inferential statistics.

※1: 'Degrees of freedom' refers to the number of independent values that can vary when estimating. For more on degrees of freedom, see [here](/blogs/2022/06/20/degrees-of-freedom/).  
:::

#### Example: Let's calculate variance with actual data

For example, suppose the time (in minutes) required for a review task was as follows:
```text
[18, 21, 22, 24, 20, 19, 23, 25, 28, 30]
```
Let's calculate the mean and population variance of this data.
```python
import numpy as np
import matplotlib.pyplot as plt

# Sample data (review time required)
data = [18, 21, 22, 24, 20, 19, 23, 25, 28, 30]

# Population mean and variance (denominator is N)
mean = np.mean(data)
var = np.var(data, ddof=0)  # Population variance by setting ddof=0

print(f"平均値: {mean:.2f} 分")
print(f"母集団分散: {var:.2f} 分²")
```
The result is as follows:
- Mean: 23.00 minutes
- Population variance: 13.40 minutes²

In this way, you can numerically express how dispersed the data are from the mean (variability) as the "variance." In descriptive statistics, understanding variance is the first step in grasping the characteristics of the data.

:::info
**Why use squared deviations?**  
Some readers might wonder, "Why square the deviations? Wouldn't absolute values work?" (I thought so myself.)

Indeed, if you just want to measure the deviation of data from the mean,
|x_i − μ|
using the **absolute value** might seem sufficient. With absolute values, the sum of deviations isn't zero, and the unit remains the same, which is convenient.

However, there are reasons for deliberately using **squared deviations**:

- Reason ①: Mathematically convenient (differentiable)  
  The absolute value function cannot be **differentiated** at the point x = μ, making it difficult to handle in optimization (such as deriving the mean).  
  Squared functions, on the other hand, are smooth, making analytical calculations and derivations easier. (In machine learning, many algorithms use a loss function that minimizes the "squared error.")

  ![Comparison of the absolute value function and the square function](https://gyazo.com/2fa15b65b69175f7b50cc904759e31aa.png)  
  The absolute value function (f(x) = |x|) has a corner at the origin (x = 0), where the **derivative is undefined**. The slopes of the left and right tangents at x = 0 do not match, making it **non-differentiable**.  
  The square function (f(x) = x²) is **smooth over its entire domain** and is **continuous and differentiable** at every point.

- Reason ②: Theoretical properties  
  The point at which the **sum of squared deviations is minimized** is the mean.  
  This property provides a theoretical justification for the mean as the representative value that minimizes the sum of deviations.  
  In contrast, the **sum of absolute deviations is minimized** by the median.  
  Thus, the choice of representative value depends on what criterion you want to minimize. The median is **less sensitive to extreme values**, making it suitable when the data are heavily skewed.

- Reason ③: Compatibility with other statistics  
  Variance (the mean of squared deviations) integrates smoothly with many other statistical methods such as **the normal distribution and hypothesis testing (※2)**.  
  In the theory of the normal distribution, the "sum of squared deviations" plays a central role.  
  (※2: **Hypothesis testing** is a statistical method for examining whether there truly is a difference between two groups. For example, it is used to determine whether a new testing method has actually increased the number of bugs detected. In that context, **variance** and **standard error** play important roles. We will cover this in detail in the section on hypothesis testing.)

- Of course, absolute deviations can also be used  
  There is a metric called the **Mean Absolute Deviation (MAD)**, which is used in some fields as a robust measure of central tendency against outliers.  
  However, it is not as widely used as variance and standard deviation.

Thus, the question "Why square the deviations?" has clear answers from the perspectives of **theory, computation, and application**. At first, it may seem unnatural, but as you delve deeper into statistics, you'll find yourself thinking, "Ah, so that's why we square the deviations."
:::

### ● What is Standard Deviation?

Standard deviation is the **square root of variance**. Since its unit is the same as the original data, it has the advantage of making the "spread of the data" easier to understand intuitively.

For example:
- If test execution time has a **mean of 30 seconds and a standard deviation of 5 seconds**,  
  → you can roughly interpret this as "most of the data lie in the range 30 ± 5 seconds."

#### Why take the square root of variance?

Variance is a convenient metric for quantifying "variability," but its unit is the square of the original data's unit (e.g., seconds², cases²), making it unintuitive in practice.  
By using standard deviation, you can express a "benchmark of deviation from the mean" in the same unit as the original data (e.g., seconds, cases), which is very useful for practical decision-making and reporting.

#### Example: Calculating standard deviation with actual data (using the same data as for variance)

Below is code to calculate the standard deviation based on 10 review times (in minutes):
```python
import numpy as np
import matplotlib.pyplot as plt

# Sample data (review time required)
data = [18, 21, 22, 24, 20, 19, 23, 25, 28, 30]

# Population standard deviation (note ddof=0)
std_dev = np.std(data, ddof=0)

print(f"標準偏差: {std_dev:.2f} 分")
```
The result is as follows:
- Standard deviation: 3.66 minutes

### ● How to choose between variance and standard deviation?

- **Variance** is convenient when dealing with the magnitude of variability in mathematical and theoretical contexts. In theoretical methods such as the normal distribution, inferential statistics, and analysis of variance (ANOVA), the **value of variance itself** plays an important role. (We will cover details in later installments.)

- On the other hand, **standard deviation** is used to **intuitively understand** how far the data deviate from the mean. In practical work and reports, one often wants to explain, "This value lies within ±○○," and standard deviation is easier to handle in such cases.

To summarize roughly, it looks like this:

| Use case                              | Appropriate metric                          |
|---------------------------------------|---------------------------------------------|
| Mathematical modeling and theoretical analysis | Variance                           |
| Practical explanation and on-site understanding | Standard deviation (same unit) |

Both are important statistics that represent "variability," but the key is to use them according to your purpose and audience.

---

## Range: The simplest variability metric

Range is a very simple variability metric calculated as **maximum value − minimum value**. It is easy to compute and intuitively understandable, helping you grasp the **overall spread** of the data at a glance.

For example, consider the following review time data (in minutes):
```text
[18, 21, 22, 24, 20, 19, 23, 25, 28, 30]
```
In this case:
- Minimum value: 18  
- Maximum value: 30  
- Range: 30 − 18 = **12 minutes**

In other words, you can roughly understand that "this data spans a range from 18 minutes at minimum to 30 minutes at maximum."

### ● Caution: Sensitive to Outliers

Since range only looks at the two extreme points (minimum and maximum), it has the drawback of being **strongly influenced by extreme outliers**. For example, if an outlier of `80` is added to the data above:
```text
[18, 21, 22, 24, 20, 19, 23, 25, 28, 80]
```
- Since the maximum becomes 80, the range becomes `80 − 18 = 62`.  
- This makes it appear as if there is an **abnormally large variability** compared to the real situation.

Therefore, it is advisable to use the range **in conjunction with other metrics (variance, standard deviation, interquartile range (※3))**.

:::info
※3: The interquartile range (IQR) is a measure of variability that indicates how widely the **middle 50% of the data** are spread.  
While the range shows the "overall spread (maximum − minimum)," the **IQR is less affected by extreme outliers.**
:::

When you visualize the range and data variability, it looks like this:  
![Range of review times](https://gyazo.com/2cf8d2a7f16d58184ef3895db433da92.png)

In this graph, you can see the **data distribution and the end values** at a glance, intuitively capturing the meaning of the range.

---

## Recommendations for Visualization: Histograms and Box Plots

### ● Histogram

A histogram shows the distribution, skewness, and variability of data at a glance. It's a useful tool for also identifying the extent of spread and the presence of outliers to some degree.

Below is an example of a histogram of test execution times.  
![Histogram of test execution times](https://gyazo.com/b4654db442a79546dca1303772d77a84.png)

A histogram compactly conveys the following information:
- **Magnitude of variability**: The spread of the distribution is easy to grasp intuitively  
- **Symmetry or skewness**: If the mean and the shape on the left and right are misaligned, there is "skew"  
- **Unimodality or multimodality**: You can visually determine whether there is one peak or multiple peaks  
- **Presence of outliers**: If there is an isolated bar at the edge, outliers may be present

### ● Boxplot

A boxplot is a statistical graph that compactly visualizes data variability, distribution, and the presence of outliers. It's extremely useful for quickly grasping the "features of the distribution" in a single plot and is commonly used in practice.

Below is an example boxplot showing the variability of review times by process step.  
![Variability of review times by process step](https://gyazo.com/3c30c10635fada8c0d32db1bae091c2c.png)

A boxplot compactly illustrates the following information:
- **Median** (the line inside the box)  
- **Interquartile Range (IQR)** (the top and bottom edges of the box)  
- **Minimum, maximum, or outliers** (the whiskers and points)  
- **The spread and skew of the distribution for each process step and the presence of outliers**

In practice, boxplots are invaluable when comparing variability in work time or review time across different process steps.

---

## Practical Tips and Points for Application

- Always check not only the **mean ± standard deviation** but also outliers and the **IQR** (the length of the box in a boxplot).  
- Including both variability metrics and distribution charts in reports makes them more persuasive.  
- When anomalies are frequent, focus on outlier-resistant measures such as the IQR.  
- In quality improvement, shrinking variability indicates process stability, while widening variability is a warning signal.

---

## Summary

- "Variability" is an indispensable perspective for correctly evaluating quality data.  
- Variance, standard deviation, and range each have their characteristics, so use them according to the purpose.  
- Combining them with visualizations such as histograms and boxplots enables a more intuitive understanding.

---

## Next Time

Next time, we'll cover "Knowing the Shape: Skewness, Kurtosis, and Distribution Characteristics." We will explain how to deal with not only normal distributions but also the quirks of "non-normal" data encountered in practice.

[Here is a compilation of statistics-related information.](/analytics/)

We hope you find this useful for your data analysis.

<style>
img {
    border: 1px gray solid;
}
</style>
