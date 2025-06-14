---
title: >-
  Let's Talk Statistics - Introduction to Statistics for Software Quality (No.11
  Confidence Intervals and Errors: How Much Can We Trust These Results?)
author: shuichi-takatsu
date: 2025-06-10T00:00:00.000Z
tags:
  - Analytics
  - ソフトウェア
  - 品質
  - 新人向け
image: true
translate: true

---

## Introduction

“Let’s Talk Statistics” installment 11 explains the fundamental concepts of inferential statistics—**confidence intervals** and **standard errors**—from a practical perspective on how to apply them to reports and quality assessments.

In software quality contexts, **quantifying uncertainty with confidence intervals and Z-scores** is becoming increasingly important for answering the question, “How much can we trust the results?”

---

## The Difference Between Probability Theory and Statistical Inference: Grasp the Basics

As mentioned in [the 8th installment](/blogs/2025/06/05/lets_talk_statistics_shall_we_08/), let’s review briefly.  
Understanding the difference between “probability theory” and “statistical inference” is crucial for grasping “confidence intervals” and “estimation.”

| Comparison Item   | Probability Theory                                | Statistical Inference                             |
|-------------------|---------------------------------------------------|---------------------------------------------------|
| Scope             | Provides a theoretical framework                  | Practical data analysis                           |
| Approach          | Constructs mathematical models and laws           | Extracts insights and supports decision-making from data |
| Data Handling     | Theoretical probabilities of events (e.g., theoretical defect rate) | Estimates the population from real data (e.g., defect rate estimated from test data) |

> **Probability theory is the foundation of statistical inference.**  
> **Statistical inference is the tool that uses probability theory to draw conclusions from “real data.”**

By understanding this difference, your perspective on “how to infer a population from a sample” improves dramatically.

---

## What Does ‘Mean ± Value’ Mean?

So far, we’ve extracted representative values such as “mean” and “proportion” from quality data to infer the overall situation.  
This is nothing more than the act of **estimating the population from a limited sample**.

This kind of “reading the population from a sample” is called **statistical inference**.

But you might wonder:

> “How accurate is that average?”  
> “If we measure it again, there’s no guarantee we’ll get the same value, right?”

Statistical inference always involves **error**.  
The expression “mean ± value” quantitatively shows the magnitude of that error.

For example—  
if it’s written “the defect rate is 3.2 ± 0.4%,”  
what does the “± 0.4” mean?

In short, it indicates the **error**.  
But this “error” is not vague; it is quantitatively defined by the **standard error (SE)** and the **width of the confidence interval (CI)**.

In other words, it numerically shows the **degree of uncertainty**, i.e., how much the estimate (3.2%) might fluctuate.

### ● What Is the Standard Error?

Although the sample mean tends to be close to the population mean, the standard error quantitatively measures **how much it fluctuates**.

$$
SE = \frac{\sigma}{\sqrt{n}}
$$

- σ: population standard deviation (spread of the distribution)  
- n: sample size  

The standard error is the “margin of error of the mean,” and as the sample size increases, SE decreases.  
In other words, **the more data you have, the more accurate the estimate**.

:::info
**Why do we divide the standard deviation by √n rather than n to compute the standard error?**

The standard error represents the “variability of the sample mean.”  
When you average n data points, the variability (i.e., variance) is reduced by a factor of n. Since the standard deviation is the square root of the variance, you end up dividing by √n.

That is:  
- Variance (squared variability) → σ² / n  
- Standard error (variability magnitude) → √(σ² / n) = σ / √n  

Therefore, taking the square root results in √n, not n, in the denominator.
:::

As you can see from SE = σ/√n, as the sample size n increases, the denominator grows, and the standard error (the margin of variation of the mean) becomes smaller.

:::info
**What’s the difference between “standard deviation” and “standard error”?**  
They sound similar, but their purposes and meanings differ. Let’s clarify:  
- **Standard Deviation (SD)**: the magnitude of variability in the data itself (how far individual data points deviate from the mean)  
- **Standard Error (SE)**: the variability of the sample mean (how stable the mean estimate is)  

In other words:  
- Standard Deviation → variability of individual values  
- Standard Error → reliability of the mean estimate  

This difference is also related to the test statistics (t-value and Z-value) in hypothesis testing, which we’ll cover next time.
:::

To understand this visually, let’s compare the “spread of the sampling distribution of the mean” as n changes. The figure below shows the spread for n = 5, 10, 30, and 100.

![Sampling Size vs. Standard Error](https://gyazo.com/022517080d2ef72d7fce3461688995e8.png)

- When n = 5: the distribution is wide with large variability (large standard error)  
- When n = 10: variability is still fairly large, but it starts to concentrate toward the center compared to n = 5  
- When n = 30: the distribution becomes narrower and approximates a normal distribution (effect of the Central Limit Theorem)  
- When n = 100: the distribution is narrow and peaked with small variability (small standard error)  

Thus, the property “the more observations, the more stable the mean” is very important for understanding why confidence intervals narrow.

---

## Meaning of Confidence Intervals

For example, if someone says, “The 95% confidence interval for this defect rate is 3.2% to 4.8%,” it’s tempting to interpret that as “there’s a 95% probability the true value lies within this range.”  
But more precisely, it means:  
“If you repeat the sampling and estimation using this method many times, 95% of the resulting intervals will contain the true value.”

In other words, a confidence interval shows only the **range of uncertainty in the estimation**, not that “a given interval has a 95% probability of containing the true value.”

:::info
**A confidence interval is not an “interval of probability” but a width derived from the “reliability of the method.”**  
For example, a 95% confidence interval means that if you repeat the method 100 times, 95 of those intervals will contain the true value.  
The most commonly used is the **95% confidence interval** corresponding to a Z-score of 1.96.
:::

### ● Formula for Confidence Intervals Using Z-Scores

So, how do we calculate that “range of uncertainty (= confidence interval)?” This is where the Z-score comes in.

A Z-score measures **how many standard errors the sample mean is away from the population mean** and is widely used as a reference for probabilities in the standard normal distribution.

Using the Z-score, the confidence interval is calculated as:

$$
\text{Confidence Interval} = \bar{x} \pm Z \cdot SE
$$

- x̄: sample mean  
- Z: Z-score corresponding to the confidence level (95% → 1.96, 99% → 2.58, etc.)  
- SE: standard error (margin of variability of the mean)  

This formula has the structure **“estimate ± margin of variability.”**

For example:  
- Sample mean defect rate = 4.0%  
- Standard error = 0.5%  
- Confidence level 95% (Z-score = 1.96)  

The confidence interval is:

$$
4.0\% \pm 1.96 \times 0.5\% = 4.0\% \pm 0.98\%
$$

We obtain the confidence interval as “mean ± Z × standard error,” but how should we interpret this result (e.g., 3.02%–4.98%)?

### ● Interpreting Confidence Intervals

It means:  
“If you perform this method 100 times, in 95 of those cases the true defect rate will fall within this interval (3.02%–4.98% in the example above).”  
It does **not** mean that “the true value itself has a 95% probability of lying within this interval.”

This difference is subtle because people tend to confuse “probability” with “reliability.”

Here, we assume “the true defect rate (population parameter) is fixed at a single value.”  
The intervals obtained by estimation will vary by sample, but 95% of those intervals will “by chance” contain the true value.

That is—  
> The “interval” changes (varies)  
> The true value does not change (it is fixed)  

This is the premise.

:::info
*This concept will also be addressed in detail in the ‘Common Misunderstandings’ section later.*
:::

---

## Practical Applications

Statistically meaningful “estimation” differs from merely reporting averages; it’s important to convey the variability and uncertainty.

### ● Examples in Software Quality

- Add “±” to the average **time required for reviews** to create a “prediction interval.”  
- Show a confidence interval for **test success rates** to make decisions that account for variability.

For example, saying “The test success rate for this version is 91.3% ± 2.4% (95% confidence interval)” allows you to interpret it as “at worst 88.9%, at best 93.7%.”

### ● You Can Choose the Confidence Level

Typically, a **95% confidence interval** is used, but you can choose according to the situation:

| Confidence Level | Typical Use Case                   | Description                                |
|------------------|------------------------------------|--------------------------------------------|
| **90%**          | Hypothesis exploration / initial review | Prioritizes speed over precision           |
| **95%**          | Standard analysis / reporting      | Well-balanced and most common              |
| **99%**          | Quality assurance / safety verification | Scenarios requiring more cautious judgment |

### ● Practical Tips

- Specify not only “± how much” but also what **confidence level** it corresponds to.  
- For particularly critical decisions, consider a **99% confidence interval**, adjusting as needed.  
- In business settings, rephrasing as “at worst this much, at best this much” tends to be easier to understand.

---

## Common Misunderstandings

### ● **A Confidence Interval Is Not the “Probability That the True Value Is Contained”**

A confidence interval is the range expected to contain the true value in 95% of repeated studies. In classical (frequentist) statistics, the true value (population parameter) is a fixed single value, assumed to exist somewhere. What behaves probabilistically is the “estimator” (the sample mean or the interval). A confidence interval means “if you repeat this method many times, XX% of the intervals obtained will contain the true value.”

In other words, a “95% confidence interval” does not mean there is a 95% probability that the true value is within it; rather, it asserts that 95% of such intervals would contain the true value. Since the true value is always fixed, there are only two possibilities: it either lies inside the interval or it does not.

:::info
While it may seem like “thinking there’s a 95% probability the true value is inside the interval” makes little practical difference, such a misunderstanding can lead to **serious misjudgments** in practice or research.

Why is this misunderstanding problematic?
- A confidence interval is constructed under the assumption that the estimate will vary; it sets a range that covers 95% of that variation. A single confidence interval has only two possibilities: either it contains the true value or it does not. Treating it as if “there’s a 95% chance that this interval contains the true value” leads to the **wrong causal interpretation** that “each interval probabilistically contains the true value.”

An example of a practical misjudgment:
A development team compared the defect rates of Product A and Product B. The 95% confidence interval for the difference (A − B) was **1.2% to 3.8%**. Since this interval did not include 0 (the no-difference state), they concluded that “A and B have a significant difference.”

A common misunderstanding at this point:
Someone on the team says,  
“Doesn’t this mean there’s a 95% probability that the true difference lies between 1.2% and 3.8%? Then A is clearly worse. Let’s take action immediately!”  
→ They **incorrectly interpret** the interval as “there’s a 95% probability that the true difference is in this range,” and therefore feel justified in believing it.

However, another team’s re-examination found:
- This time the 95% confidence interval was “-0.5% to +2.0%” (including 0)  
  → They concluded “no significant difference.”  
  → **The initial conclusion may have been due to random sampling variation.**

What’s the issue?  
This confidence interval does not mean “there’s a 95% probability that the true difference lies in here,” but “if the same study is repeated 100 times, 95 of the resulting intervals will contain the true difference.”  
In other words:
- There is **no guarantee** that this single interval contains the true difference.  
- Yet people often think “this is almost certain” and make excessive decisions,  
  → **postponing a release or tightening inspection criteria only for Product A.**

Key lessons:
- A confidence interval contains **uncertainty**, and it’s important to **not trust it excessively**.  
- You should make decisions assuming “there is this amount of variability” by repeating the same method multiple times.

Phrasing for correct understanding:
- NG: “There’s a 95% probability the true value is in here.”  
- OK: “If this method is repeated many times, 95% of the intervals will contain the true value.”

It may sound awkward at first, but you’ll become accustomed to it. A confidence interval is not a “probabilistic interval” but the “width of an estimate based on reliability.” Understanding this difference correctly enables **reproducible decisions and avoidance of overconfidence**.
:::

:::info
By the way, in Bayesian statistics, even the true value is treated probabilistically. The true value (parameter) starts as a random variable with uncertainty called the “prior distribution” and is updated by data (observations) into the “posterior distribution.” Therefore, **in Bayesian statistics, it is correct to say ‘there is a 95% probability that the true value lies within this interval.’**
:::

### ● **'Statistical Significance' and 'Practical Significance' Are Different**

Even a small difference can become statistically significant, but it may be negligible in terms of quality.  
> Even if you can say there is a “statistically significant difference,” it does not necessarily mean there is a “difference that matters in practice.”

#### For example:

Suppose you compare the launch times of an app under Plan A and Plan B. After collecting sufficient data and performing a statistical test, the results were:  
- Average launch time for A: 2.10 seconds  
- Average launch time for B: 2.04 seconds  

The difference is 0.06 seconds. Because the sample size was large, this difference was statistically significant (p < 0.01).

However, in practice, a user cannot perceive a difference of 0.06 seconds. If adopting Plan B complicates the implementation or design, you might decide that “we don’t need to adopt Plan B and can ignore this difference.”

#### Lessons:

- “Statistically significant” ≠ “meaningful difference”  
- Statistical significance only indicates that the result is unlikely to be due to chance  

→ Whether the difference is important should be considered together with context, costs, and on-site judgment.

#### Moreover:

- **If the sample size is large, even a very small difference can become statistically significant.**  
- **Conversely, if the sample size is small, a large difference may not be statistically significant.**  

→ **Statistics is a tool. To draw meaningful conclusions, it’s important to use it in conjunction with human judgment.**

---

## Conclusion

In this article, we explained how to judge “how much you can trust the results” from a practical perspective, based on the fundamental concepts of inferential statistics such as confidence intervals, standard errors, and Z-scores.

### Key Points

- **What is a confidence interval?**  
  - An interval that indicates “how much uncertainty there is” for a single estimation  
  - It does not mean “there is a 95% probability that the true value is in it,” but “if this method is repeated, 95% of the intervals will contain the true value”

- **What is the standard error?**  
  - A measure of how much the mean fluctuates, which decreases as the number of data points increases  
  - Note the formula SE = σ/√n

- **Why can we make estimates?**  
  - Central Limit Theorem → the distribution of the sample mean approaches normal  
  - Law of Large Numbers → the sample mean converges to the population mean

- **How should we interpret confidence intervals and test results?**  
  - Even if there is statistical significance, it may not have practical relevance  
  - It is important not to trust them excessively but to treat them as decisions that include uncertainty

---

## Next Time

Next time, we’ll talk about **hypothesis testing.**  
We’ll introduce the logic for discerning what it means to have a “difference”—whether it’s due to chance or truly real.

[We’ve compiled related statistical information here.](/analytics/)

We hope you find it useful for your data analysis.

<style>
img {{
    border: 1px gray solid;
}}
</style>
