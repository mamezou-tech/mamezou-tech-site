---
title: >-
  Let's Talk About Statistics - Introduction to Statistics for Software Quality
  (No.5 Understanding Shape: Skewness, Kurtosis, and Distribution
  Characteristics)
author: shuichi-takatsu
date: 2025-06-02T00:00:00.000Z
tags:
  - Analytics
  - ソフトウェア
  - 品質
  - 新人向け
image: true
translate: true

---

## Introduction

In the fifth installment of the series "Let's Talk About Statistics", we focus on the "shape" of data.  
So far, we’ve looked at central tendency and dispersion, but by **focusing on the shape of the distribution itself**, the essence of the data becomes clearer.

In this article, we’ll introduce two main metrics:

- Skewness … The “asymmetry” of a distribution  
- Kurtosis … The “peakedness” and “tail heaviness” of a distribution

In quality management, many statistical controls and decisions assume a **normal distribution**, so the ability to **detect non-normal distributions** is essential.

:::info
**What Is a Normal Distribution:**  
We’ve mentioned the “normal distribution” several times. We’ll explain it in detail in the section on “Probability and Distributions”, but rather than keep saying “details in a later installment”, here’s an intuitive overview:

A normal distribution is a bell-shaped distribution in which **most data concentrate around the mean in a symmetric fashion**. Mathematically, it’s defined as a continuous probability distribution centered at mean μ with standard deviation σ. (We introduced the mean in [Part 3](/blogs/2025/05/29/lets_talk_statistics_shall_we_03/) and standard deviation in [Part 4](/blogs/2025/05/30/lets_talk_statistics_shall_we_04/).)

It’s a fundamental distribution observed in many natural and business phenomena.

**Key Characteristics of a Normal Distribution:**  
- **Symmetric around the mean**  
- **Height and width determined by the standard deviation (σ)**  
- **About 68% of data fall within ±1σ, 95% within ±2σ, and 99.7% within ±3σ**

This property allows judgments such as “a value more than 2σ away from the mean is abnormal.”

The blue curve below represents a normal distribution with mean 0 and standard deviation 1. The colored areas show:  
- Green: ±1σ (about 68.3% of data)  
- Orange: ±2σ (up to about 95.4%)  
- Red: ±3σ (up to about 99.7%)

![Normal distribution and the ranges ±1σ, ±2σ, ±3σ](https://gyazo.com/8cb1b0d6ddbac3a34a6ca1f2e0adc954.png)
:::

**Relation to Software Quality:**  
Phenomena such as processing times or review durations in software tend theoretically to approach a normal distribution due to the accumulation of random factors. However, actual data can be “close to normal”, “extremely skewed”, or “peaked with many outliers”. To detect these quirks, **looking at only the mean or standard deviation is insufficient**. In this installment, we introduce **skewness** and **kurtosis**, metrics that quantify distribution shape, and learn how to handle non-normal distributions in practice.

## Skewness: Assessing Symmetry

### ● Definition

Skewness is a metric that indicates **which direction a data distribution tilts**. By evaluating “which side of the mean the data are biased toward?”, you can grasp biases that are hard to see with just the mean or standard deviation.

- Skewness = 0: Symmetric distribution (e.g., normal distribution)  
- Skewness > 0: Long tail to the right (more outliers on the right)  
- Skewness < 0: Long tail to the left (more outliers on the left)

:::info
The skewness formula is defined as follows:

Descriptive Statistics  
$g_1 = \frac{1}{n} \sum \left( \frac{x_i - \bar{x}}{s} \right)^3$

- $x_i$: Each data point  
- $\bar{x}$: Mean (in descriptive statistics treated as the population mean μ)  
- $s$: Standard deviation (no correction, denominator $n$)  
- $n$: Number of data points  

Inferential Statistics  
$g_1 = \frac{n}{(n - 1)(n - 2)} \sum \left( \frac{x_i - \bar{x}}{s} \right)^3$

- $x_i$: Each data point  
- $\bar{x}$: Sample mean  
- $s$: Sample standard deviation  
- $n$: Number of data points  

Since tools can calculate skewness automatically, you don’t need to memorize these formulas.  
*“$g_1$” is an abbreviation for the skewness derived from sample moments.*
:::

### ● Visual Illustration

Here’s a visual representation of skewness:  
![Left-skewed distribution, symmetric distribution (normal distribution), right-skewed distribution](https://gyazo.com/7788928215d83f7717e2cef976c29e46.png)

### ● Practical Examples

In software development and quality management, **skewed data are common**.

- Distribution of days required for fixes  
  Most fixes take 1–3 days, but some take over a week → **right-skewed**  
- User satisfaction surveys  
  Many responses are 4 or 5 out of 5 (high satisfaction), with few low ratings → **left-skewed**

### ● Consequences of Ignoring Skewness

If you rely solely on the mean despite skewness, you may **misinterpret what’s typical**:

- The mean can be distorted, leading to unrealistic KPI (1) or SLA (2) settings  
- Under- or overestimation of review/test durations  
- Quality judgments dragged by “a few extreme cases”

:::info
(1) KPI (Key Performance Indicator): Numeric targets for measuring project or business performance (e.g., average days to fix bugs, review completion rate).  
(2) SLA (Service Level Agreement): Agreed service quality levels between provider and user (e.g., initial incident response time, time to complete a fix).  
:::

Understanding skewness aids in **early anomaly detection** and in **choosing the appropriate central measure** (mean vs. median). Capturing data quirks enables **more accurate decisions and improvements**.

---

## Kurtosis: Peakedness and Tail Heaviness

### ● Definition

Kurtosis is a metric representing a distribution’s **peak height (degree of concentration) and tail weight (likelihood of outliers)**.

| Kurtosis Value | Shape Features                                 | Meaning                                                      |
|----------------|-------------------------------------------------|--------------------------------------------------------------|
| Kurtosis = 0   | Same as normal distribution                     | Baseline shape. Standard balance of center and outliers      |
| Kurtosis > 0   | Sharp peak and heavy tails                      | Data cluster at center, yet extreme outliers are likely      |
| Kurtosis < 0   | Flat peak and short tails                       | Data are uniformly spread, with few outliers                 |

A **high-kurtosis distribution** has most data near the mean but occasionally extreme outliers.  
A **low-kurtosis distribution** has few extreme values and is more uniformly spread.

:::info
The kurtosis formula is defined as follows:

Descriptive Statistics  
$g_2 = \frac{1}{n} \sum \left( \frac{x_i - \bar{x}}{s} \right)^4 - 3$  
*The “−3” correction sets the normal distribution’s kurtosis to 0 (excess kurtosis).*

Inferential Statistics  
$g_2 = \frac{n(n + 1)}{(n - 1)(n - 2)(n - 3)} \sum \left( \frac{x_i - \bar{x}}{s} \right)^4 - \frac{3(n - 1)^2}{(n - 2)(n - 3)}$

Since tools can calculate kurtosis automatically, you don’t need to memorize these formulas.  
*“$g_2$” is an abbreviation for the kurtosis derived from sample moments.*
:::

### ● Visual Illustration

A visual comparison by kurtosis:  
![Comparison of distributions by differences in kurtosis](https://gyazo.com/cfced68656f98afc7568ec552bbeee40.png)

- High-kurtosis distribution: Narrow, tall center with **long, thin tails** (sharp peak and long whiskers)  
- Low-kurtosis distribution: Flat, wide center with **short tails** (gentle peak and short whiskers)

### ● Note: Higher Kurtosis Is Not Necessarily Better

At first glance, “high kurtosis = many data points near the mean” might seem good. However, in practice, **high kurtosis can indicate risk**.

#### Leptokurtic (High-Kurtosis) Distribution

- Characteristics:
  - Most data cluster near the mean  
  - **Prone to extreme outliers (e.g., unusually long durations)**  
  - Sharp peak and heavy tails  

- Risks:
  - The mean alone may hide the impact of anomalies  
  - While it seems stable, **significant delays or issues can occur occasionally**  

- Example:
  - Reviews usually take 20 minutes, but one took 120 minutes  
    → The mean masks the anomaly, but kurtosis reveals it

#### Platykurtic (Low-Kurtosis) Distribution

- Characteristics:
  - Data are broadly spread (high variance)  
  - **Few outliers**  
  - Flat peak and short tails  

- Implications:
  - There is variability, but extreme cases are rare  
  - **Variability remains within a controllable range**

#### Comparison Table

| Aspect          | High-Kurtosis Distribution    | Low-Kurtosis Distribution      |
|-----------------|-------------------------------|--------------------------------|
| Appearance      | Seems stable                  | Seems variable                 |
| Reality         | High risk of outliers         | Low risk of outliers           |
| Management Note | **Beware of overlooking anomalies** | Safe but variable         |

---

## The Importance of “Distribution Quirks” in Practice

Many statistical methods (especially inferential statistics) **assume data follow a normal distribution**. However, real-world data often **deviate from normality**.

This happens because practical data are generated by overlapping uncertainties such as human work, sudden events, and environmental factors, causing distributions to stray from the ideal bell shape.

### ● Examples in Software Quality:

- **Fix effort:** Most tasks are short, but some take dozens of hours → **right-skewed distribution (positive skewness)**  
- **Review duration:** A few extremely long reviews → **high kurtosis due to outliers**  
- **Bug density:** Most modules have low density, but some have concentrated bugs → **multimodal distribution**

Ignoring these quirks and evaluating by mean and standard deviation alone can lead to:
- Targets that don’t match reality  
- Complaints when reported averages differ from expectations  
- Metrics swayed by outliers, hiding improvement effects

For non-normal data, using shape metrics like skewness and kurtosis helps ensure accurate understanding and decision-making.

### ● Detecting with Visualization: Histograms and Box Plots

We used histograms and box plots in [Part 4](/blogs/2025/05/30/lets_talk_statistics_shall_we_04/). They clearly show skewness and peakedness. You can easily generate them in Python or Excel, so we recommend using them in your analysis.

- **Histograms:** Visually inspect skewness and peakedness  
- **Box plots:** Check asymmetry and presence of outliers

#### Python Program (Histogram and Box Plot)

```python
import matplotlib.pyplot as plt
import numpy as np
from scipy.stats import skew, kurtosis

np.random.seed(0)
data = np.concatenate([np.random.normal(50, 5, 950), np.random.normal(100, 5, 50)])

plt.figure(figsize=(12, 5))

plt.subplot(1, 2, 1)
plt.hist(data, bins=30, color="skyblue", edgecolor="black")
plt.title("ヒストグラム（歪度と尖度の例）")
plt.xlabel("値")
plt.ylabel("度数")

plt.subplot(1, 2, 2)
plt.boxplot(data, vert=False, patch_artist=True, boxprops=dict(facecolor='lightgreen'))
plt.title("箱ひげ図")

plt.tight_layout()
plt.show()

print("歪度:", skew(data))
print("尖度:", kurtosis(data))
```

![Histogram (example of skewness and kurtosis) and box plot](https://gyazo.com/2ac2d221d0dd08a4e850687687c89539.png)

---

## Summary

- Skewness and kurtosis are crucial for numerically understanding distribution quirks  
- They help assess how close data are to a normal distribution  
- They’re useful for checking the normality assumption before statistical processing  
- Deepen your understanding with both visual plots and numeric metrics

---

## Next Preview

Next time, we’ll cover **Visualization Techniques with Graphs**. We’ll share tips on choosing the right graphs and creating effective materials.

[Here is a collection of statistical information.](/analytics/)

We hope you find this useful for your data analysis.

<style>
img {
    border: 1px gray solid;
}
</style>
