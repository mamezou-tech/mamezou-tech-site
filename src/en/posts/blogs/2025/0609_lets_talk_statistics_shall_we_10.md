---
title: >-
  Let's Talk About Statistics - Introduction to Statistics for Software Quality
  (No.10: Population and Sample: Central Limit Theorem, Law of Large Numbers)
author: shuichi-takatsu
date: 2025-06-09T00:00:00.000Z
tags:
  - Analytics
  - ソフトウェア
  - 品質
  - 新人向け
image: true
translate: true

---

## Introduction

"If we could examine everything, it would be perfect, but in reality, that's impossible."  
—This is a challenge common not only in quality management but in all research and analysis.

In "Let's Talk About Statistics" Part 10, we introduce the fundamental concepts of inferential statistics: "**population**" and "**sample**", and explain the "**Central Limit Theorem**" and the "**Law of Large Numbers**" that underpin the core of inferential statistics. We also discuss, from a practical perspective, the **sampling error** and the **danger of bias** that arise from these concepts.

For example:
- You recorded 100 defects in testing, but does that really represent the "overall trend"?
- Can you estimate the quality of the entire project based only on review of some modules?

To address these questions, you need the mindset of **"inferring the whole from a part."**

In this article, as a first step, we will use software quality case studies to reveal **"why mishandling samples leads to incorrect decisions."**

---

## What Are Populations and Samples?

""Population" and "sample" sound difficult..."  
If you have such an impression, it's precisely you who should learn these fundamentals of inferential statistics.

In real business and quality management, **it's practically impossible to examine all the data (the population).**  
That's why we need the wisdom of "reading the whole from a part"—estimating the characteristics of the whole from a subset (a sample).

For example:

- **Population**: The entire set under investigation  
  Example: All bug tickets registered in the past year (Total: 18,435)

- **Sample**: A subset of data drawn from the population  
  Example: 500 bug records that occurred in April 2025

We can express this schematically as:

$$
\bar{x}_{\text{sample}} \approx \mu_{\text{population}}
$$

This equation says that even from a part of the data (the sample), you can estimate the trend of the whole (the population) to some extent. The basic idea of inferential statistics is to estimate the population mean $\mu$ from the sample mean $\bar{x}$.

![Population and Sample](https://gyazo.com/cb7ef9fd84ffc96cf84910e33034cbe8.png)

It's just like "judging the taste of the entire dish from one bite."  
If the way you "choose" or "take" your sample is poor, you will misjudge the reality of the population.

---

## Why Can We Estimate the Population from a Sample?

We have alluded to this repeatedly, but now let's explain the "**Central Limit Theorem**" and the "**Law of Large Numbers**."  

Earlier, we said that "you can estimate the population from a sample," but why is that? It is known that if the sample size is sufficiently large, the sample mean or proportion approaches the population mean or proportion. This is supported by the foundational statistical theories: the **Central Limit Theorem** and the **Law of Large Numbers**.

### ● Central Limit Theorem

Now let's see how the phenomenon that "the sample mean approaches the population mean" actually occurs.

Even if the distribution of the population is highly skewed, **if the sample size is sufficiently large, the distribution of the sample mean approaches a normal distribution.** This is one of the most important properties in statistics.

This is explained by the **Central Limit Theorem**.  
- **No matter the distribution of the population, if the sample size is large enough (e.g., $n \geq 30$), the distribution of the sample mean approaches a normal distribution.**

In other words, even if the original data are skewed, you can **treat the distribution of the mean as a normal distribution**. This makes it possible to use **statistical methods based on the assumption of normality (such as estimation and hypothesis testing).**

> Example: Even if defect-fix times are skewed, if you take a lot of samples, **their average will approach a normal distribution.**

The following figure visually illustrates the Central Limit Theorem:  
- Left: **Population distribution (exponential distribution)**  
- Right: **Distribution of sample means (with $n = 30$, sampled 1,000 times)**

![Central Limit Theorem](https://gyazo.com/ae33e321d51d2add8b0ec87efadb6c0e.png)

#### Left: Population (Skewed Distribution)

- The distribution used is an **exponential distribution** (a skewed distribution with a right tail)  
- Many values are smaller than the mean, and large values occur rarely

→ Clearly, this distribution is **not a normal distribution.**

#### Right: Distribution of Sample Means (1,000 samples of size $n = 30$)

- Draw 1,000 samples of $n=30$ from the skewed population, compute each sample’s mean, and plot the distribution.  
- As a result, it takes on a shape that is **almost normal (symmetric and concentrated around the center).**

→ This illustrates the Central Limit Theorem property that "the distribution of sample means approaches a normal distribution."

#### What This Figure Shows

From the relationship between the "population" and the "sample" shown above, you can see that even if the original data are **not normally distributed**, as long as the sample size is sufficiently large (e.g., $n \geq 30$), **the distribution of sample means approaches normality** (the Central Limit Theorem).

#### Practical Implications

Even if metrics such as defect density, fix time, or response time are **skewed**, you can still perform **statistical analysis based on normal distribution (such as confidence intervals and hypothesis tests)** on their averages. This provides an intuitive and powerful justification for the question "Why can we assume normality?"

### ● Law of Large Numbers

Now that we have explained that "the sample mean approaches the population mean," let's dig a little deeper into **why** this happens.

Instead of looking at just one sample, imagine rolling a die multiple times and recording the average. With few rolls, the average fluctuates, but as the number of rolls increases, the average converges to a certain value.

This phenomenon is theoretically guaranteed by the **Law of Large Numbers**.  
- **The larger the sample size, the closer the sample mean gets to the population mean.**

In other words, it's the law that guarantees "the more observations you make, the closer the average gets to the true value."

The following figure visually illustrates the Law of Large Numbers:  
- Blue line: Cumulative sample mean  
- Red dashed line: True population mean (μ = 100)

![Law of Large Numbers](https://gyazo.com/09473f1d17fc424a8df973862094136b.png)

#### How to Read This

- When the sample size is small, the average fluctuates widely (up and down).  
- As the sample size increases, the average **converges to the red dashed line (the population mean).**

This graph provides an intuitive understanding of the Law of Large Numbers: "The more data you collect, the closer the average gets to the true mean."

#### What This Figure Shows

You can see that the average has the property of "fluctuating but gradually approaching the true value."  
**You cannot expect accuracy from a single observation, but repeated observations improve precision.**  
Statistical estimation (such as confidence intervals) is usable in practice because **this convergence is guaranteed.**

#### Practical Implications

It is important not to overreact to small amounts of data and to **ensure a sufficient sample size.**  
For example, instead of judging a module's defect density from a single measurement, a statistical approach would gather the **average defect density** across multiple modules.  

The figure above provides a visual answer to the question "Why can we estimate the population from a sample?"

:::info
The Law of Large Numbers is about "accuracy" (how close you get to the true value),  
while the Central Limit Theorem is about "shape" (the distribution becoming normal).  
Both are foundations supporting statistical inference.
:::

### ● What the Two Laws Mean

Drawing conclusions from a small sample alone is very dangerous because **the Central Limit Theorem won’t hold and the distribution of the mean won’t be normal**.  
Conversely, the more data you use (the larger the sample), the closer your estimates of means and proportions get to the "true population values" and the more reliable they become.  
Statistical methods used in practice, such as confidence intervals and significance tests, are based on these two laws (the Central Limit Theorem and the Law of Large Numbers).

---

## Why Use Samples?

A full census (examining the entire population) is ideal, but in reality it is difficult for the following reasons:

- **Cost, time, and human resource constraints**  
  For example, analyzing all 18,000 bug tickets requires an enormous amount of time and manpower.

- **Need for real-time information**  
  In quality management, you need to "understand the current state immediately."  
  Using samples allows for **rapid decisions within a limited time**.

- **Adequate sampling can sufficiently estimate the whole picture**  
  According to statistical theory, using a **random, unbiased sample** allows you to estimate population characteristics (mean, proportion, etc.) with high accuracy.

In short, "Even if you can't examine everything, you can make sufficient judgments by choosing the right 'representatives'."  
This is the power of "samples" in statistics.

---

## What Is Inferential Statistics?

In [Part 1 of "Let's Talk About Statistics"](/2025/05/27/lets_talk_statistics_shall_we_01/), we explained an overview of descriptive and inferential statistics. Up through Part 9, we mainly introduced methods based on descriptive statistics for "looking at" the characteristics of data as they are. From here, we will cover methods for **"estimating the whole (population) from a part (sample),"** i.e., **Inferential Statistics**.

### ● Descriptive Statistics vs Inferential Statistics (Review)

| Type                   | Main Purpose                        | Data Target              | When to Use                           |
|------------------------|-------------------------------------|--------------------------|---------------------------------------|
| Descriptive Statistics | Summarizing and organizing data     | All data at hand         | Understanding the situation, visualizing trends |
| Inferential Statistics | Estimating and making judgments about population properties | A part of the data (sample) | Forecasting, decision making          |

In inferential statistics, you make estimates and judgments such as:

- Estimating the **population mean $\mu$** from the sample mean  
- Estimating the **overall trend or proportion** from the sample proportion  
- Determining whether results are due to chance

"Since it's impossible to examine everything, we consider how accurately we can estimate from a sample."  
This is the entry point to the world of inferential statistics.

---

## Sampling Methods and Bias

We often hear that "a sample should be a 'representative of the population'," but the **reliability of inference itself** is greatly affected by how you choose **a meaningful sample (representative data).**

Here, we introduce typical sampling methods and biases to watch out for.

### ● Random Sampling

Randomly draw from the population with **equal probability**. It is the most basic and reliable method because it is less prone to bias.

Example: Randomly extract 100 items from 1,000 bug IDs

```python
import random

# Prepare 1,000 bug IDs (BUG-0001 to BUG-1000)
all_bugs = [f"BUG-{i:04d}" for i in range(1, 1001)]

# Randomly extract 100 items
sample = random.sample(all_bugs, 100)

# Sort and display only the top 10 items
print("抽出されたバグID（上位10件）：")
for bug in sorted(sample)[:10]:
    print(bug)
```

The output was as follows:

```text
Extracted Bug IDs (Top 10):
BUG-0007
BUG-0016
BUG-0108
BUG-0122
BUG-0123
BUG-0130
BUG-0135
BUG-0140
BUG-0143
BUG-0148
```

### ● Stratified Sampling

Divide the population into **strata based on attributes**, then draw equally from each stratum. This ensures that even minority categories are represented and increases representativeness.

Example:  
- Extract 20 items each from Projects A, B, and C  
- Sample 15 items each from defect categories (UI / Performance / Crash)

In the example below, we assume there are 40 bug IDs in each of the three strata (Projects A, B, and C), and perform stratified sampling by randomly extracting 10 items from each stratum.

```python
import random
import pandas as pd

# Prepare 40 bug IDs for each stratum (project)
strata = {
    "Project A": [f"A-{i:03d}" for i in range(1, 41)],
    "Project B": [f"B-{i:03d}" for i in range(1, 41)],
    "Project C": [f"C-{i:03d}" for i in range(1, 41)],
}

# Randomly extract 10 items from each stratum (stratified sampling)
stratified_sample = []
for project, bugs in strata.items():
    sample = random.sample(bugs, 10)
    stratified_sample.extend((project, bug_id) for bug_id in sorted(sample))

# Display the result in a DataFrame
df = pd.DataFrame(stratified_sample, columns=["層（プロジェクト）", "バグID"])
print(df)
```

The execution result (10 items extracted from each project) was as follows:

```text
      Stratum (Project)   Bug ID
0     Project A          A-006
1     Project A          A-009
2     Project A          A-011
...
13    Project B          B-010
14    Project B          B-024
...
28    Project C          C-037
29    Project C          C-039
```

In this way, by performing stratified sampling, you can ensure that even small groups (strata) are not overlooked, allowing you to secure a highly representative sample.

### ● Examples and Risks of Bias: A Single Choice Can Distort the World

The scary thing about sampling is that, if you're not careful, you tend to draw "conclusions that suit you."

#### ■ Common Examples of Selection Bias

- "Investigating only data from periods of poor quality"  
  → Looks worse than reality (negative bias)  
- "Picking only success cases"  
  → Looks better than reality (positive bias)

This often occurs unintentionally and is a classic example of **"biased conclusions drawn from biased data."**

### ● Sampling Determines the Results Themselves

- **Choose randomly? Or consider strata?**  
- **What time frame and perspective do you choose?**

Even one of these decisions can greatly affect the reliability of your conclusions. For statistically meaningful inference, you must understand **the art of choosing (sampling) and the risks of bias**.

**■ Real-World Example of Incorrect Sampling: Overestimating Review Quality**

In one project, a team tried to evaluate code review quality. They attempted to confirm improvement effects by "extracting review records and calculating the average number of review comments."

However, the subset they **sampled was "review records from veteran engineers only."**

**■ Result:**
- The average number of comments was very low, leading to the conclusion that "quality is very high."  
- However, in reviews by new members, **there were many missed issues and superficial comments.**

→ The evaluation ended up being far removed from the actual review quality of the entire team.

The failure in this example was sampling a "non-representative sample"—focusing on a biased subgroup without considering strata.

**Choosing the wrong sample directly leads to wrong decisions.** Sampling is not just "data extraction" but the **gateway to statistical judgment that influences decision making.**

---

## Practical Precautions

- **The "representativeness" of the sample is the fundamental assumption**  
  - If the sampling is biased, the conclusions will be skewed from the start  
- **Always record and report meta-information such as "extraction method" and "period of investigation"**  
  - Without clear investigation conditions, you cannot reproduce or reinterpret the results later  
- **Assume that error (variability) is unavoidable**  
  - Since you cannot make sampling error zero, it is **the practice of statistical inference** to present estimates with error margins in advance.

For example,  
"Defect occurrence rate is 3.2% ± 0.4%"  
Conveyed in the form **"estimate ± error,"** it makes decision making easier for the recipient.

The theoretical definition of this "error margin" is the **confidence interval** (to be covered next time).

---

## Examples from the Software Quality Field

So far, we have discussed that "choosing the wrong sample leads to incorrect decisions," but in actual software quality management, it is also extremely important **how you design the relationship between the population and the sample according to your objectives**.

For example:

- Do you examine all review records, or focus on records of specific members?  
- Do you include all incident reports, or only focus on critical incidents?

Depending on this design, **the perspective of analysis and how you use the results can change drastically**.

The table below provides concrete examples of how "population, sample, and objective" are connected in the context of software quality.

| Population                               | Sample                                   | Purpose of Extraction             |
|------------------------------------------|------------------------------------------|-----------------------------------|
| All incident reports from the past 3 years | Critical incidents from the past 6 months | Early detection of trend changes  |
| All code review records                  | Review records of new members            | Analysis of training effectiveness |
| Daily automated test logs                | Logs randomly sampled weekly             | Tracking long-term test quality trends |

In this way, "what you target and how you slice it" directly influences the analysis results. The "sample design" that comes before the analysis is an extremely important skill in statistical quality management.

---

## Summary

In this article, we learned about the difference between "population" and "sample," the starting point of statistical inference, and the theories that connect them: the Central Limit Theorem and the Law of Large Numbers.

- A "sample" is data obtained from a part of the population  
- The sample mean $\bar{x}$ is an estimator that approximates the population mean $\mu$  
- This is not by chance but has a **mathematical underpinning** supported by the Central Limit Theorem and the Law of Large Numbers

Also, the following practical points are important:

- **How you choose the sample (sampling) directly affects the results**  
- Samples lacking randomness or containing biased data lead to **incorrect decisions and overconfidence**  
- You need to use strategies like **stratified sampling** to select "representative data"  
- Being unaware of bias (selection bias) undermines the reliability of your analysis

The takeaway in one sentence is **"If you can't examine everything, you need the 'power to choose well'."**  
—This is the essence of inferential statistics.

---

## Next Preview

Next time, we'll learn about **confidence intervals and the concept of error**, answering the question "How much can we trust our estimates?"

[Statistics-related information is compiled here.](/analytics/)

We hope you find it useful for your data analysis.

<style>
img {{
    border: 1px gray solid;
}}
</style>
