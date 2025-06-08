---
title: >-
  Let's Talk About Statistics: Introduction to Statistics for Software Quality
  (No.8 Intuition and Computation of Probability: Understanding the Nature of
  'Chance')
author: shuichi-takatsu
date: 2025-06-05T00:00:00.000Z
tags:
  - Analytics
  - ソフトウェア
  - 品質
  - 新人向け
image: true
translate: true
---

## Introduction

In the eighth installment of "Let's Talk About Statistics," we will discuss an intuitive understanding of "probability," basic methods of calculation, and **probability distributions** that are useful in quality management settings.

"Why did that bug happen?"  
"Wasn't it just that it happened not to be caught in testing?"  
— The tool for handling such phenomena of "chance" scientifically is probability.

In this article, we focus on the following three representative distributions:  
- Binomial Distribution (Binomial Distribution)  
- Poisson Distribution (Poisson Distribution)  
- Normal Distribution (Normal Distribution)

To properly understand these "probability distributions," it is also necessary to address the underlying **Probability Theory (Probability Theory)**. A probability distribution is a "model built on Probability Theory," serving as a mathematical tool to represent phenomena such as "how many successes occur out of a number of trials" or "how much variation there is."

Therefore, in the first part of this article, we will first overview the basics of Probability Theory (trials, events, and the definition of probability), and in the latter part, we will introduce representative probability distributions (discrete and continuous).

## 1. What is Probability Theory?: The Theoretical Foundation of Statistical Inference

"Probability Theory" is a **theoretical framework for mathematically describing and predicting the occurrence probabilities of random events**.  
While statistical inference is a practical methodology for drawing conclusions from actual data, Probability Theory provides the **theoretical foundation** for it.

| Comparison      | Probability Theory                         | Statistical Inference                                   |
|-----------------|---------------------------------------------|---------------------------------------------------------|
| Scope           | Provides a theoretical framework            | Practical data analysis                                 |
| Approach        | Construction of mathematical models and laws | Extraction of insights and decision-making from data    |
| Data Handling   | Probabilities of theoretical events         | Estimating (inferring) populations from real data       |

### Definition of Trials and Events

To understand Probability Theory, it's crucial to grasp the basic framework of "what you consider when thinking about probability." For this, we first confirm two concepts: "trial" and "event."

- **Trial (Trial)**: An experiment or action whose outcome can change by chance  
  Examples: drawing one lottery ticket, loading a website once for a test

- **Event (Event)**: A possible occurrence as a result of a trial  
  Examples: "drawing a winning lottery ticket," "a load error occurs"

### Axiomatic Definition of Probability (Laplace's Probability)

\(P(A) = \frac{\text{Number of cases corresponding to event A}}{\text{Total number of trial outcomes}}\)

For example, if 2 out of 10 tickets are winning, the probability of drawing a winning ticket is

\[
P(\text{winning}) = \frac{2}{10} = 0.2
\]

### Main Concepts Covered in Probability Theory

- **Probability distributions** (discrete and continuous)  
- **Conditional probability**  
- **Independence**  
- **Expectation, variance, standard deviation**  
- **Law of Large Numbers / Central Limit Theorem (※1)**, etc.

:::info
※1: **What are the Law of Large Numbers and the Central Limit Theorem?**

- **Law of Large Numbers**:  
  This law states that as the number of samples (sample size) increases, the sample mean \(\bar{x}\) approaches the population mean \(\mu\) arbitrarily closely.  
  → It is close to the intuition of "if you observe a lot, you can see the overall trend."

- **Central Limit Theorem**:  
  This theorem states that regardless of the shape of the population distribution, the distribution of sufficiently many sample means will **approach a normal distribution**.  
  → This explains why statistical methods that assume a normal distribution are broadly applicable.

These theories are the pillars that underpin the question of "why can we infer the properties of a population from a sample?"  
**Details will be covered in a later installment.**
:::

Thus, understanding Probability Theory provides the power to underpin the premises of statistical inference and serves as the theoretical foundation for answering the question, "Why can we understand a population from a sample?"

## 2. What is Probability?

### The Sense of "Probability" Hidden in Everyday Life

What comes to mind when you hear the word "probability"? Dice, gacha (capsule toy machines), weather forecasts, lotteries… All these are phenomena influenced by "chance," but we tend to dismiss them as "unpredictable events."

However, probability is a tool for capturing the "regularities within chance." In statistics, probability is used to quantitatively make judgments such as "How likely is this to happen?" or "Can we really say it's impossible?" In fact, every day we **unconsciously make probabilistic judgments** as we act.

- "It looks like it's going to rain today, so I'll take an umbrella."  
- "This feature might have bugs before release."  
- "Because there were many pointed out issues in the last review, there should be fewer this time."

It is precisely this ability to **estimate 'the possible likelihood of occurrences' and make decisions** that is the first step in probabilistic decision-making.

### Software Quality and Probability

In software development, the following situations are related to probability:

- **Frequency of failures** (probability of bug occurrence per unit time)  
- **Test detection capability** (probability of discovering defects)  
- **Risk assessment** (probability of failure × impact)

In other words, "probability" is not just a mathematical concept; it's a **common language for expressing quality numerically**.

### Basic Definition of Probability

So, what is "probability" in the first place? The most basic definition is:

\[
P = \frac{\text{Number of favorable patterns}}{\text{Total number of patterns}}
\]

### Example: Probability of Detecting a Bug in a Test

Suppose you run 10 test cases and detect a bug in 2 of them. Then, what is the "probability that a bug is found in a single test case"?

- Number of favorable patterns: 2 (the two cases where a bug was found)  
- Total number of patterns: 10 (the total number of test cases)

\[
P(\text{bug detection}) = \frac{2}{10} = 0.2
\]

In this way, probability expresses as a ratio "how likely the desired outcome is relative to the whole."

### Overview of Probability Distributions

A probability distribution describes in the form of a "distribution" how a probabilistically varying value appears. Below, we classify and introduce representative distributions.

| Distribution Name        | Example Use Case                    | Type of Distribution (※2) | Characteristics                                         |
|--------------------------|-------------------------------------|---------------------------|--------------------------------------------------------|
| Binomial Distribution    | Number of successes/failures        | Discrete                  | Number of successes in a fixed number of trials       |
| Poisson Distribution     | Number of bugs per unit time        | Discrete                  | Count of rare events                                   |
| Geometric Distribution   | Number of trials until first success| Discrete                  | Focus on the number of failures until success         |
| Normal Distribution      | Review time, effort, etc.           | Continuous                | Bell-shaped distribution based on the Central Limit Theorem |
| Uniform Distribution     | Random initial values               | Continuous/Discrete       | All values are equally probable                      |
| Exponential Distribution | Time until the next bug occurs      | Continuous                | Constant occurrence rate                              |

:::info
※2: **Types of Probability Distributions**:  
Probability distributions are classified into **discrete distributions** and **continuous distributions** depending on how the variable varies.

| Type                  | Description                                       | Example                             | Function                             |
|-----------------------|---------------------------------------------------|-------------------------------------|--------------------------------------|
| Discrete Distribution | The values exist as **separate, countable points**| Die rolls, bug counts               | Probability Mass Function (PMF)      |
| Continuous Distribution | The values exist **continuously over any range**| Height, test execution time         | Probability Density Function (PDF)   |

● Discrete Distribution:  
- The variable takes on a limited set of **countable** values.  
- Examples:  
  - Die rolls (integers 1–6)  
  - Number of bugs detected in testing (0, 1, 2, …)

In a discrete distribution, you can define the probability of taking exactly x.  
Example: \(P(X = 2) = 0.25\)

● Continuous Distribution:  
- The variable can take on values **continuously** (infinitely smooth).  
- Examples:  
  - Test execution time (e.g., 21.34 seconds)  
  - CPU usage (e.g., 48.123%)

In a continuous distribution, the probability of taking exactly x is zero.  
Instead, you consider the probability of falling between x and y.  
Example: \(P(20 < X < 25) = \int_{20}^{25} f(x)\,dx\)

Understanding this difference allows you to **choose the appropriate distribution model and function (PMF / PDF)**.  
Functions (PMF / PDF) will be explained later.  
:::

### From Descriptive Statistics to Inferential Statistics

Among the many probability distributions, in this installment we will explain the "Binomial Distribution," "Poisson Distribution," and "Normal Distribution." These three distributions are the **core that connects descriptive statistics and inferential statistics**. By understanding where and when to use each, you can broaden the scope of your statistical analysis and apply it more smoothly in practice.

#### ● Binomial Distribution
- A model for cases where there are multiple **binary trials**, such as "success or failure."  
→ Example: If the probability of finding a bug is 30%, how many bugs will be discovered in 10 reviews?

#### ● Poisson Distribution
- A model for the **frequency of rare event occurrences** per unit time or area.  
→ Example: If an average of 2 bugs occur per day, what is the probability of 5 bugs on a given day?

#### ● Normal Distribution
- The distribution that **data from nature and practice most commonly follow**.  
→ Due to the Central Limit Theorem, many quantitative real-world data (effort, time, etc.) tend to approach a normal distribution.

---

## 3. Binomial Distribution: The Probability of an Event Occurring or Not

"Success or failure," "bug present or not"—this is a probability model used in scenarios of repeating **binary trials**. For example, when considering whether bugs are found in 100 tests, you want to find the **distribution of the number of successes when you repeat n trials with success probability p**—the model you use here is the **Binomial Distribution**.

### ● Definition and Formula of the Binomial Distribution

The Binomial Distribution is defined as follows:

\[
P(X = k) = \binom{n}{k} p^k (1 - p)^{n - k}
\]

- \(n\): Number of trials (e.g., 100 test cases)  
- \(k\): Number of successes (e.g., number of bugs found)  
- \(p\): Probability of success in a single trial (e.g., probability of finding a bug in one test)

The probabilities in a Binomial Distribution are given by the **Probability Mass Function (※3) (PMF)**.

:::info
※3: **Probability Mass Function**  
While **continuous distributions** use a **Probability Density Function (PDF)**, **discrete distributions** (such as the Binomial Distribution and Poisson Distribution) assign probabilities to specific values, so the term "mass" is used instead of "density." The Probability Density Function (PDF) will be explained in the section on the Normal Distribution.
:::

### ● Visualizing the Binomial Distribution in Python

```python
import numpy as np
import matplotlib.pyplot as plt
from scipy.stats import binom

plt.rcParams['font.family'] = 'Meiryo'

n = 100  # Number of trials
p = 0.1  # Success probability

x = np.arange(0, 31)
pmf = binom.pmf(x, n, p)

plt.bar(x, pmf, color='skyblue', edgecolor='black')
plt.title("二項分布（n=100, p=0.1）")
plt.xlabel("バグ検出数")
plt.ylabel("確率")
plt.tight_layout()
plt.show()
```

![Binomial Distribution (n=100, p=0.1)](https://gyazo.com/0df828d2917e12d7f5e38031c8c49659.png)

This graph represents the probability distribution of the number of bug detections \(k\) when 100 tests are conducted. The most likely number is around 10 bugs, but the possibility of 20 or more is not zero.

#### Explanation of the Binomial Distribution Plotting Code

- `scipy.stats.binom.pmf(x, n, p)`  
  → Calculates the Probability Mass Function (PMF) of the Binomial Distribution.  
    For each \(x\), it computes the probability that the number of successes equals \(x\).

- `x = np.arange(0, 31)`  
  → Sets the range of success counts to display (here, number of bug detections) from 0 to 30.

- `plt.bar(...)`  
  → Plots the probabilities as a bar graph.

This graph allows you to visually understand how the number of bugs detected out of 100 tests is distributed probabilistically.

### ● Example in Software Quality

**When the probability of detecting a certain bug is 10% and you run 100 tests:**

- You can calculate **the probability of detecting exactly 10 bugs**,  
- **the probability of detecting 20 or more bugs**, etc.

Let's calculate the probability of detecting 20 or more bugs:

```python
from scipy.stats import binom

n = 100
p = 0.1
P_20_or_more = 1 - binom.cdf(19, n, p)  # cdf(19) means P(X<=19), so 1 minus this gives P(X>=20)

print(f"20件以上検出される確率：{P_20_or_more:.4f}")
```

The calculation result is "Probability of detecting 20 or more bugs: 0.0020".

Thus, the **Binomial Distribution is extremely effective for capturing the overall picture of repeated trials of "occurrence or non-occurrence."**

---

## 4. Poisson Distribution: Predicting the Count of Rare Events

"How many bugs occur in one day?" "How many crashes occur in 1000 lines of code?"  
— In these cases, when dealing with the **count of occurrences** within a certain period or region, the Poisson Distribution comes into play.

### ● Definition and Formula of the Poisson Distribution

The Poisson Distribution is defined as follows:

\[
P(X = k) = \frac{\lambda^k e^{-\lambda}}{k!}
\]

- \(\lambda\): Average number of occurrences per fixed period (or region) (e.g., average number of bugs)  
- \(k\): Actual number of occurrences (0, 1, 2, …)

This distribution is used when the following conditions are met:

- You want to know the count of **rare event** occurrences within a fixed period or region.  
- You can assume that events **occur independently**.  
- The occurrence rate per unit time (or region) is **constant**.

### ● Visualizing the Poisson Distribution in Python

```python
import numpy as np
import matplotlib.pyplot as plt
from scipy.stats import poisson

plt.rcParams['font.family'] = 'Meiryo'

λ = 3  # Average of 3 per day
x = np.arange(0, 11)
pmf = poisson.pmf(x, mu=λ)

plt.bar(x, pmf, color='lightgreen', edgecolor='black')
plt.title("ポアソン分布（λ=3）")
plt.xlabel("1日に発生するバグ数")
plt.ylabel("確率")
plt.tight_layout()
plt.show()
```

![Poisson Distribution (λ=3)](https://gyazo.com/e66ef37b9e81d73d1659f5ec068d71ef.png)

This graph represents the probabilities of 0–10 bug occurrences under the assumption of an average of 3 bugs per day. You can intuitively see that around 2–4 bugs are most common, while 6 or more bugs are rare.

#### Explanation of the Poisson Distribution Plotting Code

- `λ = 3`  
  → Average number of bugs per day (3 bugs/day).

- `scipy.stats.poisson.pmf(x, mu=λ)`  
  → Calculates the Probability Mass Function (PMF) of the Poisson Distribution.  
    For each `x`, it computes the probability of _x_ bug occurrences in one day.

- `x = np.arange(0, 11)`  
  → Defines the range of occurrences to display (0–10).

- `plt.bar(...)`  
  → Plots the calculated probabilities as a bar graph.

### ● Example in Software Quality

**Consider a system where an average of 3 failures occur per day.**  
In this case, the following questions can be quantitatively assessed:

- **"What is the probability of 5 failures today?"**  
- **"What is the probability of 20 or more failures in a week?"**

Let's calculate the probability of 5 failures in one day:

```python
from scipy.stats import poisson
P_5 = poisson.pmf(5, mu=3)
print(f"1日に5件の障害が発生する確率：{P_5:.4f}")
```

The calculation result is "Probability of 5 failures occurring in one day: 0.1008".

In this way, the Poisson Distribution helps quantitatively evaluate **rare but plausible problems** (bugs, failures, crashes). In practice, it is extremely useful as foundational information for **prioritizing preventive measures and risk management**.

---

## 5. Normal Distribution: The Natural Form of Variability

Test execution time, review time, rework effort, etc.—**many practical data exhibit variability that spreads around the mean.** The prototypical form of this variability is the Normal Distribution (Normal Distribution).

### ● Definition and Formula of the Normal Distribution

The Normal Distribution is defined as follows:

\[
f(x) = \frac{1}{\sqrt{2\pi\sigma^2}} \exp\!\Bigl(-\frac{(x - \mu)^2}{2\sigma^2}\Bigr)
\]

- \(\mu\): Mean  
- \(\sigma\): Standard deviation  

This function draws a **bell curve** symmetrically around the mean. Here, \(f(x)\) is the **Probability Density Function (※4)** (PDF: probability density function), representing "how densely data points are located around that value" (note that it is not the probability itself).

:::info
※4: **Probability Density Function (PDF)**  
A function value that represents **the 'density' of the probability of values appearing within a range** in continuous probability distributions. It is similar to 'probability' in discrete distributions, but in continuous cases, the probability of a specific single point is zero, so you need to look at the **'density around that point.'**

Example: The probability that height is exactly 170 cm = 0  
→ Instead, consider the probability of a range, e.g., 'between 169.5 cm and 170.5 cm.'

● Mathematically:  
In a **Probability Density Function (PDF)**, such as for the Normal Distribution, the probability of a value falling within an interval \([a, b]\) is

\[
P(a \le x \le b) = \int_a^b f(x)\,dx
\]

- \(f(x)\): Probability Density Function  
- The **area under the curve** corresponds to probability.

● Graphical representation:  
- Horizontal axis: values (e.g., test execution time)  
- Vertical axis: **probability density**  
  → The higher the value, the more frequently data appear around that area.

Thus, 'high density = frequent', 'low density = infrequent'  
However, **the density itself is not probability** (it can exceed 1).
:::

### ● Visualizing the Normal Distribution in Python

```python
import numpy as np
import matplotlib.pyplot as plt
from scipy.stats import norm

plt.rcParams['font.family'] = 'Meiryo'

mu = 50
sigma = 10
x = np.linspace(mu - 4*sigma, mu + 4*sigma, 100)
y = norm.pdf(x, mu, sigma)

plt.plot(x, y, color='darkorange')
plt.title("正規分布（μ=50, σ=10）")
plt.xlabel("値")
plt.ylabel("確率密度")
plt.grid(True)
plt.tight_layout()
plt.show()
```

![Normal Distribution (μ=50, σ=10)](https://gyazo.com/f2498f604980cbaa7b7f6cc743619632.png)

This graph visualizes the **Normal Distribution with mean 50 and standard deviation 10**. It shows a smooth variability with a peak around the mean and decreasing probability density for extremely small or large values.

#### Explanation of the Normal Distribution Plotting Code

- `scipy.stats.norm.pdf(x, mu, sigma)`  
  → Calculates the Probability Density Function (PDF) of the Normal Distribution.  
    It computes the "height (density)" of the continuous distribution for the specified mean μ and standard deviation σ.

- `x = np.linspace(mu - 4*sigma, mu + 4*sigma, 100)`  
  → Divides the range of values (horizontal axis) into 100 points over the interval mean ± 4σ.

### ● Example in Software Quality

In practice, the following variables are considered to approximate a normal distribution:

- **Review time**: very fast or very slow reviews are rare; most cluster around the average  
- **Test execution time**: few outliers; distributed around the mean  
- **Rework effort**: aside from extreme rework, values tend to center around the mean

By assuming a normal distribution for such variables, you can perform **control charts, process capability indices, and confidence interval estimation**.

Below is a simulation of how "review times around an average of 30 minutes" actually vary, compared with the theoretical normal distribution. In practice, such comparisons allow you to visually detect outliers and trends.

```python
import numpy as np
import matplotlib.pyplot as plt
from scipy.stats import norm

plt.rcParams['font.family'] = 'Meiryo'

# Mean and standard deviation
mu = 30
sigma = 5

# Generate 100 review time data points following a normal distribution
review_times = np.random.normal(mu, sigma, 100)

# Visualize with a histogram
plt.hist(review_times, bins=15, density=True, alpha=0.6, color='skyblue', edgecolor='black')

# Overlay the theoretical normal distribution curve
x = np.linspace(mu - 4*sigma, mu + 4*sigma, 100)
y = norm.pdf(x, mu, sigma)
plt.plot(x, y, 'r--', label="理論的な正規分布")

plt.title("レビュー所要時間の分布（平均30分, σ=5）")
plt.xlabel("時間（分）")
plt.ylabel("確率密度")
plt.legend()
plt.grid(True)
plt.tight_layout()
plt.show()
```

![Distribution of Review Times (mean 30 min, σ=5)](https://gyazo.com/e5c5a2b39feea0796f539bd5dd2662d7.png)

By looking at this graph, you can intuitively understand **how closely review times follow a normal distribution** and **where exceptionally short or long reviews lie**.

### ● Importance of the Normal Distribution

- **Central Limit Theorem**: Regardless of the population distribution, the mean of a sufficiently large sample approaches a normal distribution.  
- **Assumption in many statistical methods**: Techniques such as t-tests, regression analysis, and confidence interval estimation (※5) assume normality.  
- **Intuitive properties**: For example, "68% of values fall within ± one standard deviation of the mean."

:::info
※5: About tests, regression analysis, and confidence interval estimation

- **t-test**: A method for examining whether there is a significant difference between the means of two groups.  
- **Regression analysis**: A method to model how one variable influences another.  
- **Confidence interval estimation**: A method to estimate the range in which parameters such as the population mean likely lie.

These techniques are important tools for examining the presence or absence of causal relationships and differences behind the data.  
We will not go into detail in this article, but we will explain them in order in future installments.  
Also, we will cover the "Standard Normal Distribution" and "Z-scores" in upcoming posts.
:::

### ● Practical Notes

- If data are extremely skewed, a normal distribution may not be appropriate.  
- It is important to verify normality by using **histograms and box plots**.  
- When necessary, you can make data approximately normal by **log transformation or Box-Cox transformation**.

The normal distribution is a "lens for interpreting variability." In the field of software quality, skillfully using this lens leads to accurate decision-making and improvement.

---

## 6. Practical Applications

- You can model bug occurrence rates and variability of test results.  
- You can quantitatively judge "Is this result due to chance or is it an anomaly?"  
- It serves as the foundation for **inferential statistics** such as control charts and confidence intervals.

---

## Summary

- Probability is a tool for quantitatively capturing "chance."  
- Binomial Distribution: Effective for yes/no trials.  
- Poisson Distribution: Effective for the count of rare events.  
- Normal Distribution: Applicable to many natural variabilities.

---

## Next Preview

Next time, we will explain "The Normal Distribution and its Surroundings: The Meaning and Limitations of the 3σ Rule." We will also delve into the commonly used "±3σ" and process capability in practice.

[Here's a compilation of statistical resources.](/analytics/)

I hope you find it useful for data analysis.

<style>
img {
    border: 1px gray solid;
}
</style>
