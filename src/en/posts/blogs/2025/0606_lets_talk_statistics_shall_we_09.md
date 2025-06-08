---
title: >-
  Let's Talk Statistics - Introduction to Statistics for Software Quality (No.9
  Normal Distribution and Its Surroundings: The Meaning and Limitations of the
  3σ Rule)
author: shuichi-takatsu
date: 2025-06-06T00:00:00.000Z
tags:
  - Analytics
  - ソフトウェア
  - 品質
  - 新人向け
image: true
translate: true

---

## Introduction

In quality control statistics, a representative keyword is “±3σ (Three Sigma).” This is a rule based on the assumption of a normal distribution, indicating how much data variability can be tolerated, and it frequently appears in anomaly detection and process control settings.

However, the assumption of “if it’s a normal distribution...” is often questionable in the first place. In the ninth installment of “Let’s Talk Statistics,” we will explain the meaning and limitations of the 3σ rule, and how to handle field data that cannot be approximated by a normal distribution.

---

## 1. Basics of the Normal Distribution and the 3σ Rule

### ● What Is the Normal Distribution?

The normal distribution is a continuous distribution with the following characteristics:

- Symmetrical about the **mean μ**
- The degree of variability is determined by the **standard deviation σ**
- The curve shape is a “bell curve”

The probability density function of the normal distribution is given by:

$$
f(x) = \frac{1}{\sqrt{2\pi\sigma^2}} \exp\left( -\frac{(x - \mu)^2}{2\sigma^2} \right)
$$

Even when looking at the formula, it may be hard to visualize at a glance, so it’s fine to refer to the graph shape introduced in Section 2.

:::info
● Standard Normal Distribution and Z-Score

Among normal distributions, the one **standardized to a mean μ = 0 and a standard deviation σ = 1** is called the standard normal distribution.  
This distribution is expressed by the following formula, denoted by Z:

$$
f(z) = \frac{1}{\sqrt{2\pi}} \exp\left( -\frac{z^2}{2} \right)
$$

Using the standard normal distribution, any normal distribution can be **compared on a common scale of mean 0 and standard deviation 1**.  
The transformation value used at this time is called the Z-score (Z value), calculated by:

$$
Z = \frac{X - \mu}{\sigma}
$$

The Z-score expresses “how far a value X is from the mean (in terms of standard deviations),” and forms the basis for many statistical methods such as anomaly detection, confidence interval estimation, and t-tests.

We will cover the application of Z-scores in detail in a later installment on “Confidence Intervals and Errors.”
:::

### ● What Is the 3σ Rule?

| Range | Theoretical Proportion |
|-------|------------------------|
| ±1σ   | about 68.3%            |
| ±2σ   | about 95.4%            |
| ±3σ   | about 99.7%            |

In other words, data that fall outside ±3σ are considered **extremely rare events**. This serves as the basis for treating them as “outliers” or “deviations.”

:::info
● Six Sigma (6σ):  
In manufacturing, service industries, and other fields, there is a quality management methodology called **Six Sigma**.  
The goal of Six Sigma is to **control process variability and drive defects as close to zero as possible**.

While the 3σ rule based on the normal distribution covers 99.7% of data within ±3σ, Six Sigma assumes that **99.99966% of data lie within ±6σ**, aiming for an extremely low defect rate of **3.4 defects per million opportunities**.

In the software domain, you can apply these concepts in situations such as:  
- Managing **variability** in bug occurrence rates or review times  
- Using regression analysis to **predict** future defect counts  
- Quantitatively evaluating process stability with process capability indices (Cp, Cpk)  
  (Cp and Cpk are discussed later)

“Understand variability, identify causes, and leverage improvements”—this concept epitomizes statistical quality control.
:::

---

## 2. Visualizing with Python

This code plots a graph to visually understand the relationship between the normal distribution and the 3σ rule.

```python
import numpy as np
import matplotlib.pyplot as plt
from scipy.stats import norm

plt.rcParams['font.family'] = 'Meiryo'

mu = 0
sigma = 1
x = np.linspace(mu - 4*sigma, mu + 4*sigma, 500)
y = norm.pdf(x, mu, sigma)

plt.plot(x, y, label='正規分布', color='steelblue')
plt.axvline(mu, color='black', linestyle='--', label='平均')
for i in range(1, 4):
    plt.axvline(mu + i*sigma, color='gray', linestyle=':')
    plt.axvline(mu - i*sigma, color='gray', linestyle=':')

plt.fill_between(x, y, where=(x > mu - 3*sigma) & (x < mu + 3*sigma), color='lightblue', alpha=0.5, label='±3σ範囲')
plt.title("正規分布と±3σルール")
plt.xlabel("値")
plt.ylabel("確率密度")
plt.legend()
plt.tight_layout()
plt.show()
```

![Normal Distribution and the ±3σ Rule](https://gyazo.com/964a9df5d74e35c65aaa3095beec32e9.png)

You can see from the graph how much data is contained within ±1σ, ±2σ, and ±3σ in a normal distribution.  
In particular, you can visually grasp the 3σ rule, which states that almost all data (99.7%) lie within ±3σ.

In other words:  
- It serves as a criterion for detecting “anomalies” or “outliers” in process and quality control.  
- Data beyond ±3σ are often treated as anomalies that exceed normal variability.

---

## 3. Practical Applications: Quality Standards and Process Capability

In the previous section, we introduced how the normal distribution is a very effective model for capturing the spread and location of variable data. This concept is also used in real-world practice to determine **how stable a product or process is and whether it falls within acceptable limits**.

For example, if we assume that measurements such as final product dimensions or processing times **follow a normal distribution**, we can evaluate quality stability by comparing the distribution’s width (variability) to the **allowable specification range (upper and lower limits)**.

This is where process capability indices (※1) such as **Cp** and **Cpk** come into play. These indices quantify how well process variability and the mean’s position conform to specifications, using the normal distribution’s standard deviation (σ) as a reference.

- “Understand variability” → “Apply by comparing with allowable range”

In this way, statistical theory directly connects to quality evaluation and process management.

:::info
※1: What are Cp and Cpk?

Representative indices for expressing process capability include Cp and Cpk. They are widely used in manufacturing and quality assurance, and can also be applied to evaluate the stability and consistency of software development processes.

● Definition of Cp:  
$$
Cp = \frac{\text{USL} - \text{LSL}}{6\sigma}
$$

- USL: Upper Specification Limit  
- LSL: Lower Specification Limit  
- σ: Process standard deviation (a measure of variability)

→ **Indicates how much the process variability fits within the specification width (tolerance range).**  
→ This index only considers the “ratio of widths,” regardless of the mean’s position.

● Definition of Cpk:  
$$
Cpk = \min \left( \frac{\text{USL} - \mu}{3\sigma}, \frac{\mu - \text{LSL}}{3\sigma} \right)
$$

→ This index adds consideration of whether the **mean is offset from the center** (i.e., if there is a bias), on top of Cp.  
→ If the mean is centered, Cp ≒ Cpk. If the mean is shifted, Cpk < Cp.
:::

### ● Visualizing the Difference Between Cp and Cpk

Process capability indices Cp and Cpk used in manufacturing and software quality are important measures for evaluating process variability and stability relative to specifications. The following code visualizes the difference between the case where the mean is at the center of the specification (Cp = Cpk) and the case where the mean is shifted (Cp > Cpk).

```python
import numpy as np
import matplotlib.pyplot as plt
from scipy.stats import norm

plt.rcParams['font.family'] = 'Meiryo'  # Japanese support (effective for local execution)

# Parameter settings
sigma = 5
mu_cp = 50  # When Cp = Cpk (mean is centered)
mu_cpk = 55  # When Cp > Cpk (mean is shifted)
LSL = 30
USL = 70

x = np.linspace(20, 80, 500)
y_cp = norm.pdf(x, mu_cp, sigma)
y_cpk = norm.pdf(x, mu_cpk, sigma)

plt.figure(figsize=(10, 5))
plt.plot(x, y_cp, label='平均=50（Cp=Cpk）', color='steelblue')
plt.plot(x, y_cpk, label='平均=55（Cp>Cpk）', color='orange')

plt.axvline(LSL, color='red', linestyle='--', label='LSL（下限）')
plt.axvline(USL, color='red', linestyle='--', label='USL（上限）')
plt.axvline((LSL + USL)/2, color='black', linestyle='--', label='中心値')

plt.title("CpとCpkの違いを示す正規分布の比較")
plt.xlabel("値")
plt.ylabel("確率密度")
plt.legend()
plt.tight_layout()
plt.show()
```

![Comparison of Cp and Cpk](https://gyazo.com/2a635e2a704bf5c6addc9a91c0c4fe94.png)

#### Explanation

- The blue line represents the case where the mean is at the center of the specification (Cp = Cpk).  
- The orange line represents the case where the mean is shifted from the specification (Cp > Cpk).  
- Even with the same variability (standard deviation), Cpk becomes smaller if there is an offset from the center.  
- In other words, even if variability is low, a process will be judged to have low capability if it is not centered within the specification.

### ● Practical Guidelines and Applications

- In many industries and companies, **Cp ≥ 1.33** is often set as a quality standard  
  → This implies stability equivalent to ±4σ fitting within the specification  
- In software development as well, it can be applied to assess variability in test execution time, review time, lead time, etc.  
- **If Cpk is low, the process itself may be biased**, and a review of the mean or process improvement may be required

For example, you can apply Cp and Cpk in situations such as:

#### ■ Example 1: Evaluating Stability of Test Execution Time  
After recording the execution times of an automated test for a feature, the execution time was **an average of 30 seconds** with **a standard deviation of 2 seconds**, and the specified tolerance range is **±10 seconds (20–40 seconds)**.

In this case,  
- $Cp = \frac{USL - LSL}{6\sigma} = \frac{40 - 20}{6 \times 2} = \frac{20}{12} \approx 1.67$  
  → **Variability is very small, and quality is stable**  
- $Cpk = \min\left( \frac{USL - \mu}{3\sigma}, \frac{\mu - LSL}{3\sigma} \right) = \min\left( \frac{40 - 30}{6}, \frac{30 - 20}{6} \right) = \frac{10}{6} \approx 1.67$  
  → **The mean is also at the center of the specification, indicating no process bias**

→ It can be evaluated as a **very stable, high-quality process**. Both Cp and Cpk satisfy **1.67 ≥ 1.33**, meeting quality standards in many industries. Such a process is often judged to be “statistically stable and requiring little improvement.”

#### ■ Example 2: When Review Times Are Biased  
The average review time is 30 minutes, but variability is large, with a median of 26 minutes and a standard deviation of 6 minutes. If the specification tolerance range is 20–40 minutes:  
- $Cp = \frac{40 - 20}{6 \times 6} = \frac{20}{36} \approx 0.56$  
- $Cpk = \min\left(\frac{40 - 30}{3 \times 6}, \frac{30 - 20}{3 \times 6}\right) = \frac{10}{18} \approx 0.56$  

→ **This shows large variability and instability in review times.** You may need to review the review criteria or provide training.

### ● Summary of Cp and Cpk

| Index | What It Examines                                | Considers Shift from Center | Implication                                                            |
|-------|-------------------------------------------------|-----------------------------|------------------------------------------------------------------------|
| Cp    | Variability relative to specification width     | No                          | May have capability but be off-center                                  |
| Cpk   | Variability and mean shift (Cp plus mean bias)  | Yes                         | Indicates the actual “true” process capability usable in practice       |

Managing process variability directly relates to quality stability. Cp and Cpk are **key metrics of statistical quality control**.

---

## 4. Limitations and Cautions

- **Not all data follow a normal distribution**  
  - Examples: Test times, incident response times, number of review comments often **skew right (long right tail)**  
  - This may indicate an asymmetric distribution with high “skewness” or “kurtosis”  
    (For skewness and kurtosis, see [here](/en/blogs/2025/06/02/lets_talk_statistics_shall_we_05/))

- **If you forcibly apply the 3σ rule to non-normal distributions…**  
  - You are likely to **miss anomalies**  
  - You are likely to have **false positives**

- **Neglecting tests or distribution visualization risks incorrect statistical judgments**  
  - Check distribution shape with histograms or box plots  
  - Confirm skewness and kurtosis numerically  
  - It is also effective to use a normality test (※2), such as the Shapiro–Wilk test

:::info
※2: Normality Tests  
We will cover normality tests in a later installment on hypothesis testing.  
For now, it is sufficient to understand them as tests to check whether data follow a normal distribution.
:::

**It is important to validate the assumption (distribution) before using these methods.**  
In particular, methods like process capability indices and the 3σ rule assume a normal distribution, so you must include a process to confirm that your data meet this assumption.

---

## Conclusion

- The normal distribution and the 3σ rule are widely used to **visualize process variability and serve as fundamental indicators for anomaly detection**  
- Cp and Cpk allow you to quantify **how stable a process is**  
- However, caution is required if data do not follow a normal distribution

---

## Next Time

Next time is “Population and Samples: Basics of Sampling.” We will explain how to estimate a population from a limited sample, the starting point of statistical inference.

[I have compiled statistics-related information here.](/analytics/)

I hope you find it useful in your data analysis.

<style>
img {
    border: 1px gray solid;
}
</style>
