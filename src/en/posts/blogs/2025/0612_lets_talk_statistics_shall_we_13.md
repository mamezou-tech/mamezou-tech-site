---
title: >-
  Let's Talk About Statistics - Introductory Statistics for Software Quality
  (No.13 Correlation and Causation: Pitfalls of Scatterplots and Correlation
  Coefficients)
author: shuichi-takatsu
date: 2025-06-12T00:00:00.000Z
tags:
  - Analytics
  - ソフトウェア
  - 品質
  - 新人向け
image: true
translate: true
---

## Introduction

In previous installments of this series, we've covered methods for "estimating population tendencies" through representative values such as **means** and **proportions**.  
Specifically, in situations like estimating a population mean from a sample mean or comparing differences in proportions, we've explored **statistical estimation** and **hypothesis testing**.

However, in practice, there are many cases where we want to focus on more dynamic relationships, such as "Does one factor influence another outcome?" For example—

- "Does an increase in review effort lead to fewer defects?"
- "Does higher code complexity result in more defects?"

Exploring whether such relationships exist is the goal of **correlation analysis**.  
However, having correlation does not necessarily mean there is a causal relationship.  
There are also pitfalls like **confounding variables** and **spurious correlations** to be aware of.

Moreover, to understand not only "whether something is statistically significant" but also "whether that relationship is of practical significance," the concept of **effect size** is indispensable.  
By evaluating effect size alongside p-values, you can more clearly understand the "practical impact" behind the numbers.

In the 13th installment of "Let's Talk About Statistics," we will focus on the following topics:

- The difference between correlation and causation  
- The meaning and interpretation of correlation coefficients  
- The practical significance of effect size  
- Visualization with scatterplots and associated cautions  
- Partial correlation and handling confounding variables  

Using software quality data as examples, we aim to help you adopt the perspective of "There is a relationship, but is it really meaningful?" so that you can make more practical and reliable decisions.

---

## What Is Correlation?

**Correlation** refers to a condition in which two variables exhibit a tendency to move together.  
For example, if there is a relationship like "the larger the development size, the more defects there are," we can say there is a correlation between "development size" and "number of defects."

### ● Basic Characteristics of Correlation

- Correlation does not imply causation (discussed later).  
- Positive correlation: as one increases, the other tends to increase (e.g., development size and effort).  
- Negative correlation: as one increases, the other tends to decrease (e.g., review time and defect injection rate).  
- Correlation can be visually confirmed with scatterplots, and quantification uses the **correlation coefficient (Pearson's r)**.

### ● Guidelines for Interpreting Correlation Coefficients

| Correlation coefficient r | Interpretation            |
|---------------------------|---------------------------|
| ±0.9 and above            | Very strong correlation   |
| ±0.7 to 0.9               | Strong correlation        |
| ±0.4 to 0.7               | Moderate correlation      |
| ±0.2 to 0.4               | Weak correlation          |
| ±0 to 0.2                 | Little to no correlation  |

These guidelines are only for reference; in practice, it's important to interpret them in the context of the domain and data characteristics.

### ● Examples of Correlation in Software Quality

- **Correlation between number of defects detected and development duration**  
  If there's a tendency for longer development durations to correspond to more defects, we can consider this a positive correlation.

- **Correlation between code complexity and defect density**  
  If modules with higher cyclomatic complexity have higher defect density, a strong positive correlation may be indicated.

- **Correlation between review time and number of missed fixes**  
  If longer review times correspond to fewer missed fixes, this may show a negative correlation (negative r value).

The correlation coefficient is an indicator of the "strength of the tendency," and in practice, using it **in conjunction with p-values** allows you to confirm both "statistical significance" and "practical effect size."  
(For an explanation of correlation coefficients using tools, please refer to this article [here](/en/blogs/2022/05/26/correlation-matrix/).)

---

## Effect Size

**Effect size** is a quantitative measure that expresses the magnitude of observed differences or the strength of correlations.  
While a p-value indicates whether something is due to chance, effect size is used to evaluate how large a difference or relationship is.

### ● Why Is Effect Size Important?

- Even if the **p-value is significant but the effect size is small**, the difference may be negligible in practice.  
- Because **effect size is independent of sample size**, it's effective in determining whether a difference is truly meaningful.

### ● Common Examples of Effect Size

| Effect Size Measure | Purpose and Meaning                                                    |
|---------------------|------------------------------------------------------------------------|
| Cohen's d           | Magnitude of mean differences (used in t-tests)                       |
| Pearson's r         | Strength of correlation between variables (used in correlation analysis) |
| η² (eta squared)    | Proportion of variance explained between groups (used in ANOVA)       |
| Odds ratio (OR)     | Strength of association between categories (e.g., in logistic regression) |

### ● Examples of Using Effect Size in Software Quality

For example, suppose it's reported that "introducing a new tool led to a statistically significant reduction in the number of defects."  
At first glance, that sounds like a good result, but if the difference is slight and the effect size is very small, it might not be a perceptible difference for users in a real-world development environment.  
In this way, **even if the p-value is significant, it is a separate question whether it represents a 'practical improvement.'**

On the other hand, **even if the p-value is not significant, if the effect size is medium to large, it may simply mean there was insufficient sample size, and an important difference might actually exist.**

Thus, effect size functions as an additional axis of evaluation independent of "statistical significance (p-value)."  
**Presenting both p-value and effect size is key to enhancing the persuasiveness of practical decision-making.**

### ● A Concrete Example of Effect Size (Cohen's d) in a t-Test

For example, suppose we conduct the following investigation in a project:

- Team A (using the old tool): mean number of defect reports = 8.4, standard deviation = 2.0, n = 30  
- Team B (using the new tool): mean number of defect reports = 6.8, standard deviation = 2.1, n = 30

At this time, Cohen's d is calculated as follows:

・Formula for calculating Cohen's d:

$$
d = \frac{M_1 - M_2}{s_p}
$$

Here, $s_p$ (the pooled standard deviation) is given by:

$$
s_p = \sqrt{\frac{s_1^2 + s_2^2}{2}} = \sqrt{\frac{2.0^2 + 2.1^2}{2}} \approx 2.05
$$

Therefore, Cohen's d can be calculated as follows:

$$
d = \frac{8.4 - 6.8}{2.05} \approx 0.78
$$

This result is **Cohen's d = 0.78**, which according to general benchmarks corresponds to a "**moderate to strong effect**."  
By presenting this effect size alongside the p-value, you can reinforce the case that the improvement is not only "statistically significant" but also "practically meaningful."

:::info
Below is an interpretation (guideline) for Cohen's d effect size.  
| Value of Cohen's d | Interpretation of Effect Size                       |
|--------------------|-----------------------------------------------------|
| 0.0 to 0.2         | Very small effect (almost no difference)            |
| 0.2 to 0.5         | Small effect (slight difference)                    |
| 0.5 to 0.8         | Medium effect (practically meaningful difference)   |
| 0.8 and above      | Large effect (clear and substantial difference)     |
:::

---

## Using Scatterplots

A scatterplot is a fundamental and powerful tool for visually grasping the relationship between two variables.  
By "seeing" features that are difficult to discern from numbers alone, you can intuitively understand correlations, trends, the presence of outliers, and more.

- From the **pattern of point dispersion**, you can grasp the strength and direction of the relationship between variables (positive correlation / negative correlation / no correlation).  
- Not limited to linear relationships, you can also visually identify **curved non-linear trends** and **skewed group distributions**.  
- You can immediately spot the **presence of outliers**, which can affect the reliability of the correlation coefficient.

### ● Example in Software Quality

Illustratively, suppose you visualize the relationship between module size (lines of code) and number of defects in a scatterplot.  
Even if it appears there is some correlation, if a few extremely large modules are exerting a strong influence, the scatterplot will immediately reveal the presence of these "outliers."  
Also, even if there doesn't seem to be a linear correlation, a scatterplot can provide hints about features you might miss with numeric indicators alone, such as "strong correlation only within a certain range" or "a U-shaped relationship."

![Relationship between Lines of Code and Number of Defects](https://gyazo.com/9675a2dc7a3bc6fb60cef478c92ff1a2.png)

> By viewing the "picture (scatterplot)" together with the numbers (correlation coefficient), you can make a more multifaceted and valid judgment.

---

## Basics of Correlation Analysis

Scatterplots and correlation coefficients are visual and quantitative tools to back up the impression that "there seems to be a relationship," but if you want to take one step further and determine "Is the correlation statistically significant?" you use **correlation analysis**.

### ● Pearson's Product-Moment Correlation Coefficient and Testing

The correlation coefficient (Pearson's *r*) is a measure of the "strength of the linear relationship between two variables," ranging from -1 to +1.  
To test whether this *r* observed in a sample did not occur by chance and reflects a significant correlation in the population, you perform a **significance test for the correlation coefficient**.

In this test, you set up the following hypotheses:

- Null hypothesis ($H_0$): population correlation coefficient $\rho = 0$ (i.e., no correlation)  
- Alternative hypothesis ($H_1$): $\rho \ne 0$ (there is a correlation)

If the p-value is below the significance level (e.g., 5%), you conclude that "there is a correlation."

### ● Practical Examples of Correlation Analysis (Software Quality)

For example, correlation analysis is useful for answering questions such as:

- "Is there a statistically meaningful relationship between development duration and number of defects?"  
- "Is the relationship between review effort and defect density consistent rather than a fluke?"  
- "Is the correlation between test coverage and quality metrics reproducible?"

However, the prerequisites for conducting correlation analysis include that the data are **continuous variables** and **approximately normally distributed**. If these conditions are not met, you need to consider nonparametric methods such as Spearman's rank correlation.

---




## What Is 'Partial Correlation'?

**Partial correlation** is a measure that evaluates the correlation between two variables while excluding the influence of other variables when there are three or more variables.

For example—

- **X: Development effort**  
- **Y: Number of defects**  
- **Z: Module size (lines of code)**  

At this time, even if you observe a correlation between X and Y, it might be a spurious correlation caused by Z (module size). Partial correlation is used when you want to see, "Is there still a correlation between X and Y after removing the effect of Z?"

### ● Difference from Regular Correlation

| Type                           | Description                                                      |
|--------------------------------|------------------------------------------------------------------|
| Correlation coefficient        | Examines the simple correlation between X and Y                  |
| Partial correlation coefficient | Examines the correlation between X and Y after removing the influence of Z |

### ● Example Use Cases in the Context of Software Quality

For example—

- Even if there appears to be a correlation between "review effort" and "number of defects," it might be due to the influence of "module size."  
- By using partial correlation, you can test, "Does review effort still affect defects after removing the influence of module size?"

In this way, **partial correlation is an effective method to avoid being misled by "spurious correlations."**  
(For an explanation of partial correlation using tools, please refer to the article [here](/blogs/2022/07/08/partial-correlation/).)

---

## Correlation and Causation Are Different!

The existence of correlation only indicates the fact that "two variables tend to change together," and **does not necessarily mean that one causes the other (i.e., there is a causal relationship).**

For example—

- Suppose there is **a correlation between the number of review comments and the number of defects.**  
  However, that alone does not **prove** that "more reviews cause fewer (or more) defects."  
- There may be a **third factor (confounding variable)** at play.  
  For example, if "specification complexity" affects both reviews and defects, this might **simply be a spurious correlation caused by another factor, complexity.**

### ● Risks of Confusing Correlation with Causation

- If you mistake correlation for causation and implement improvements, you may **fail to address the core issue**.  
- A strategy of **"increasing reviews will reduce bugs"** might actually result in "more complex specifications leading to both more reviews and more bugs."

### ● Countermeasures: How to Determine the Possibility of Causation?

- Use partial correlation to remove the influence of a third variable  
- Examine time-series data to determine "which changed first"  
- Confirm causation through experimental or intervention designs (e.g., A/B testing)

> **Summary:** Correlation is useful information, but you must be careful when judging whether it implies "causation."  
> In data-driven decision making, consciously verify whether **there is evidence of causation**.

:::info
Ice Cream and Drowning Deaths? – Misunderstanding Correlation and Causation –

There is a famous example:

> **"When ice cream sales increase, the number of drowning deaths also increases."**

This data indeed shows a **correlation**, but it doesn't mean that eating ice cream causes people to drown.

In cases like this, there is a **third factor (confounding variable)** at play.  
In this case, it is **"hot weather."**

- On hot days, ice cream sells well.  
- On hot days, activities around water such as swimming increase, leading to more drowning incidents.

In other words, the factor **"hot days" influences both variables.**  
Thus:

- **Just because there is correlation**  
- **does not mean one causes the other (i.e., causation).**

This is something that must always be kept in mind when analyzing data.

> **Correlation ≠ Causation** — "varying together" is not the same as "cause and effect."
:::

---

## Practical Considerations

- **If you misinterpret correlation as causation and take countermeasures, you risk implementing misguided and incorrect strategies.**  
  For example, even if there is a negative correlation between the number of reviews and number of defects, mechanically increasing only the number of reviews may fail to address the root cause.

- **"Correlation alone" does not tell you what is cause and what is effect.**  
  Moreover, if a **confounding variable (third factor)** is involved, making decisions based only on superficial correlations risks missing the essence.

- Therefore, first confirm whether there is an "observed correlation," and then take the crucial step of **verifying causation through experiments or designed interventions.**  

:::info
Correlation is just a hint. Healthy statistical literacy in practice is not about "taking measures because there's correlation," but about "formulating hypotheses from correlations and then verifying causation."
:::

---

## Summary

- Correlation indicates a "tendency to vary together" and is different from causation.  
- The correlation coefficient (Pearson's r) is a numeric measure of the strength of a linear relationship between two variables.  
- Just because correlation is strong does not mean "A causes B"; confounding variables may be involved.  
- When you find a correlation in practice, it's important **not to immediately assume causation but to verify it through experiments or study designs.**  
- By also using effect size (e.g., Cohen's d) and scatterplots, you can gain a deeper understanding of **differences and relationships that are meaningful in practice.**

---

## Next Time Preview

Next time, we'll deliver **"Prediction: Interpreting Quality with Regression Analysis."**  
These are methods that take one step beyond correlation to model "prediction" and "degree of influence."  

As these analytical methods are widely used in practice, please look forward to it.

[Statistical information is compiled here.](/analytics/)  
I hope you find it useful for your data analysis.

<style>
img {{
    border: 1px gray solid;
}}
</style>
