---
title: >-
  Let's Talk About Statistics - Introductory Statistics for Software Quality
  (No.12 Hypothesis Testing: Does Statistical Significance Really Matter?)
author: shuichi-takatsu
date: 2025-06-11T00:00:00.000Z
tags:
  - Analytics
  - ソフトウェア
  - 品質
  - 新人向け
image: true
translate: true

---

## Introduction

So far, we've primarily explored the following methods for "estimating the characteristics of a population":

- Estimating the population mean or population proportion from a sample  
- The "standard error (SE)" indicating the variability of the estimate  
- The "confidence interval" quantifying statistical uncertainty  

All of these concern the question, "How precisely can we say something about the population?"—that is, estimation.  
In contrast, the tool for **statistically determining "yes or no"** is what we'll cover here: **hypothesis testing**.

In the 12th installment of "Let's Talk About Statistics," we'll explain the basic mechanism of hypothesis testing using practical examples such as quality improvement and A/B testing.

---

## What is Hypothesis Testing?

So far, we've been performing "estimation" based on means and proportions.  
For example, estimating the population mean from a sample mean, or calculating a confidence interval and thinking, "The true value might lie within this range."

However, in real-world practice, aren't questions like these far more common?

- "There's a difference in the numbers between Option A and Option B... but does that actually mean anything?"  
- "They say review time improved, but couldn't that just be due to chance?"  
- "Can we say the results of this experiment are reproducible?"

In such cases, when we want to judge "Is this just random variation or a real difference?", we use **hypothesis testing**—a tool to determine whether a difference could be due to chance.  
This is the standard method to statistically verify whether a numerical difference is truly meaningful.

![](https://gyazo.com/fee2364f95aca674df2112d3e44b3e71.png)

---

## Concept and Structure of Hypothesis Testing

Hypothesis testing is a statistically systematized approach for determining whether an observation falls within a range explainable by chance or represents a difference that cannot be attributed to chance.

In hypothesis testing, we start with the assumption of "no difference" or "no effect"; this is called the **null hypothesis ($H_0$)**.  
Against this, the claim of "there is a difference" or "there is an effect" is the **alternative hypothesis ($H_1$)**.

### ● Basic Structure of Hypothesis Testing

The basic steps of a test are:

1. **Formulate the null hypothesis $H_0$**  
   Example: "There is no difference in bug detection rates between the new and old tools."

2. **Formulate the alternative hypothesis $H_1$**  
   Example: "The bug detection rate of the new tool is higher than that of the old tool."

3. **Evaluate how "extreme" the observed data is under $H_0$ by calculating a probability (the p-value).**

4. **If that probability is very small** (i.e., the outcome is unlikely to occur by chance), **reject $H_0$.**

5. **As a result, support $H_1$** (i.e., conclude there is a difference).

![](https://gyazo.com/489a2ea51db38ad1992c50181ca9eb18.png)

The above diagram illustrates the basic idea of hypothesis testing.

We consider how "unusual" the observed statistic (in this case, z = 2.1) is under the standard normal distribution.  
If it falls in the tail beyond the significance level (e.g., 5%), we judge that such an extreme result is unlikely to occur by chance, and reject the null hypothesis.

:::info
What is important in hypothesis testing is numerically evaluating "how extreme the observed data is."  
The number used for this purpose is called the **test statistic**.

A test statistic is:
- A value calculated from the data (sample) that measures **how extreme the data is if the null hypothesis is true.**
- The calculated test statistic is compared against distributions such as the t distribution, Z distribution, F distribution, or χ² distribution to **derive the p-value**.
- The **larger (more extreme)** the test statistic, the more we judge that the null hypothesis is unlikely to hold.

Below is a list of common tests and their corresponding test statistics:

| Test Method                         | Test Statistic | Main Meaning / Role                                              | Corresponding Distribution |
|-------------------------------------|----------------|------------------------------------------------------------------|----------------------------|
| **t-test**                          | t-value        | Difference in means ÷ standard error of the sample (unknown population variance) | t distribution             |
| **Analysis of Variance (ANOVA)**    | F-value        | Variance between groups ÷ variance within groups                 | F distribution             |
| **Chi-square test**                 | χ² value       | Sum of (observed − expected)² ÷ expected value                   | Chi-square distribution    |

The 'position' of these statistics on their respective distributions (how far out in the tail they are) determines "how unusual they are (i.e., how small the p-value is)," and thus whether to reject the null hypothesis.  
We will discuss t-tests, ANOVA, and chi-square tests later.
:::

### ● The Criteria for Decision: "P-value" and "Significance Level"

- **P-value** is the probability of obtaining data as extreme as or more extreme than what was observed, assuming the null hypothesis is true.  
    - Small p-value (e.g., 0.01) → "Such a difference is unlikely to be due to chance!" → Reject the null hypothesis  
    - Large p-value (e.g., 0.45) → "That level of difference could occur by chance." → Cannot reject the null hypothesis

- **Significance level (α)** is the threshold for how unlikely a result must be to be considered not due to chance.  
    - Common choices are **0.05 (5%)** and **0.01 (1%)**.

- **Decision rule**:  
    - p-value < α: Reject $H_0$ → "Statistically significant"  
    - p-value ≥ α: Fail to reject $H_0$ → "Not statistically significant"

### ● Example of Hypothesis Testing

Let's consider an example in software quality: introducing a new coding standard.  
We can formulate the hypotheses as follows:

- **Null hypothesis $H_0$**: Introducing the new coding standard does not change the bug insertion rate.  
- **Alternative hypothesis $H_1$**: Introducing the new coding standard reduces the bug insertion rate.

Suppose the average bug insertion rate under the old process (without the new coding standard) was 4.2%.  
Under the new process (with the new coding standard), the average bug insertion rate is 3.7%.

Also, suppose the standard error (SE) is 0.2%, and the p-value obtained from the difference test (t-test) is **0.004**.

Now, how do we interpret this result?

- **Null hypothesis ($H_0$)**: "There is no difference between the old and new processes (the new standard has no effect)"  
- **Alternative hypothesis ($H_1$)**: "There is a difference between the old and new processes (the new standard has an effect)"

→ **p-value = 0.004 < 0.05** (significance level)

Therefore:  
- **Reject the null hypothesis**  
- **Support the alternative hypothesis (statistically significant)**  

→ We can conclude that the new coding standard has a **statistically significant improvement effect**.

However, note that the difference is only 0.5%, so whether this amount of improvement is sufficient in practice requires separate consideration.

:::info
**'Statistically significant difference' ≠ 'Practically important difference'.**  
Also, with large sample sizes, even small differences can become significant, so it is important to also look at effect size.  
In this way, 'statistical significance' and 'meaningful difference (effect size)' are separate concepts.  
(We will cover effect size in detail in a later installment.)
:::

### ● Summary of Hypothesis Testing

**Hypothesis testing proceeds by rejecting the null hypothesis in order to support the alternative hypothesis.**  
The procedure may seem somewhat indirect.  
If you have questions about why hypothesis testing is conducted in this way, please read this article: [here](/blogs/2022/06/01/hypothesis-test/).  
It explains why hypothesis testing uses this approach.

---

## Types of Tests

There are many types of hypothesis tests.  
Below are representative test methods.  
| Test Name                         | Typical Use Case                                              |
|-----------------------------------|----------------------------------------------------------------|
| t-test                            | Test for a difference in means (small sample, unknown population variance) |
| Analysis of Variance (ANOVA)      | Test for differences among three or more means (comparing factor effects) |
| Chi-square test                   | Test for differences in proportions, goodness-of-fit, independence (categorical data) |
| z-test                            | Test for differences in means or proportions (large sample, known population variance) |
| Welch's t-test                    | Test for difference in means of two groups with unequal variances |
| Paired t-test                     | Test for difference in means for paired data (e.g., before-and-after) |
| Mann–Whitney U test               | Test for difference between two groups on ordinal or non-normal data |

As listed above, there are many types of hypothesis tests, but the three that are especially common in practice and form the basis of statistical analysis are:

- **t-test**: A simple and fundamental test for comparing the means of two groups  
- **Analysis of Variance (ANOVA)**: A test for comparing means among three or more groups to evaluate factor effects  
- **Chi-square test**: A test for examining differences in proportions or independence in categorical data  

These are widely used and serve as the foundation for other tests.  
In the following sections, we will take a closer look at these three tests in order.

### ● t-test

The **t-test** is a method for **testing whether there is a statistical difference between the means of two groups**.  
It is commonly used in software engineering for A/B testing, performance comparisons between new and old tools, and so on.

#### Main Types of t-tests

##### 1. One-sample t-test  
Tests whether the mean of a single group differs from a specific known value (target value, historical benchmark, etc.).  
    Example: 'Is the average build time of the new build system statistically different from the target of 10 minutes?'

##### 2. Independent 2-sample t-test  
Tests whether the means of two independent groups differ.  
    Example: 'Is there a difference in the number of detected bugs per module between the team using static analysis tool A and the team using tool B?'  
    (For instructions on how to perform this test using a tool, see this article: [here](/blogs/2022/05/19/confirm-the-quality-improvement-effect/).)

##### 3. Paired 2-sample t-test  
Tests whether there is a difference between two means measured under different conditions (e.g., before and after) on the same subjects.  
    Example: 'Did the average cyclomatic complexity of the same modules change before and after refactoring?'  
    (For instructions on how to perform this test using a tool, see this article: [here](/blogs/2022/05/20/corresponding-t-test/).)

#### Notes

- It is the most widely used test when you want to deal with **differences in means**.  
- The test statistic used is the **t-value (t statistic)**, and the p-value is calculated based on the t distribution.

![](https://gyazo.com/a86d09be10983cb727b2bb42992512a4.png)

:::info
What is **degrees of freedom**?  
We touched on this briefly in [Part 4](/blogs/2025/05/30/lets_talk_statistics_shall_we_04/), but the term **degrees of freedom** appeared in the graph above.  
**Degrees of freedom** is the number of values that are free to vary when calculating a statistic.

For example, when the mean of three data points is fixed, if you choose any two values freely, the third value is automatically determined.  
In this way, **constraints (such as a fixed mean or sum) reduce the number of values that can vary freely**.

- Using the mean of $n$ data points → degrees of freedom = $n - 1$  
- In a t-test (comparison of two means), degrees of freedom are calculated based on the sample sizes, and the p-value is obtained by comparing to the t distribution.  
- Analysis of variance (ANOVA) and chi-square tests also have their own corresponding degrees of freedom.

**Degrees of freedom are a crucial parameter that determine which distribution to use for the test.**  
They directly affect the reliability of the test, so it is important to understand the concept of degrees of freedom.  
If you are interested, there is more explanation here: [Degrees of Freedom](/blogs/2022/06/20/degrees-of-freedom/).
:::

#### Caveats

There are the following assumptions:

- The **population variance is unknown** (this applies to most practical situations)  
- The **sample is randomly drawn**  
- The **data distribution is approximately normal** (especially for small samples)  
- The **variances of the two groups are equal** (relaxed in Welch's t-test)

If these assumptions are not met, consider alternative methods such as **non-parametric tests**.  
(We will discuss non-parametric tests later.)

### ● Analysis of Variance (ANOVA)

The **Analysis of Variance (ANOVA)** is a representative test method for **examining whether there is a statistical difference among the means of three or more groups**.  
Examples:  
- Is there a difference in the average defect density among software developed using development methods A, B, and C?  
- Is there a difference in the average test case completion time among multiple test teams?  
(For instructions on how to perform the test using a tool, see these articles: [here](/blogs/2022/05/22/one-factor-analysis-of-variance/) and [here](/blogs/2022/05/24/analysis-of-variance/).)

#### Basic Concept

- Decompose the total variance of the data into 'between-group variance' and 'within-group variance.'  
- If the 'between-group variance' is sufficiently larger than the 'within-group variance,' judge that 'at least one group's mean differs significantly.'  
- The ratio of these variances is represented by the **F statistic (F-value) (between-group variance ÷ within-group variance)**, and the p-value is calculated using the F distribution.

![](https://gyazo.com/a5093c186191f9b9b96f2c3b70fa90e2.png)

#### Caveats

- Even if ANOVA reveals that there is an overall difference, it does not tell you **which specific groups differ**.  
- Detailed comparisons require additional analyses called **multiple comparisons (post-hoc).**

Also, there are the following assumptions:  
- **Independence**: Observations in each group are independent of each other.  
- **Normality**: The population distribution of each group follows a normal distribution.  
- **Homogeneity of variances (equal variances assumption)**: The population variances of each group are equal (or similar).

If these assumptions are not met, take the following measures:  
- If normality is questionable → **non-parametric test (e.g., Kruskal–Wallis test)**  
- If homogeneity of variances is questionable → **Welch's ANOVA**

:::stop
You might think, "If you're testing differences in means, just use t-tests."  
However, repeating t-tests across multiple groups leads to the accumulation of the probability of observing a difference by chance (Type I error)—the multiple comparisons problem.  
ANOVA avoids this issue by **evaluating all group mean differences in a single test**.  
As a rule, use ANOVA when you have three or more groups to compare.  
(ANOVA can also be used for two-group comparisons, but t-tests are more common.)
:::

### ● Chi-Square Test (χ² Test)

The **chi-square test (χ² test)** is a representative method for testing **proportions or the presence/absence of associations** in categorical (nominal scale) data.  
It is used for analyses based on yes/no answers, multiple-choice survey results, counts by category, and so on.

#### Applications

- Whether the distribution of observed categorical data differs from an expected theoretical distribution.  
- Whether two categorical variables are associated (i.e., not independent).

#### Main Types of Chi-Square Tests

##### 1. Test of Independence  
Tests whether two categorical variables are related (i.e., not independent).  
    Example:  
    - Is there a relationship between the operating system in use (Windows, macOS, Linux) and the occurrence of a specific error message?  
    - Is there a relationship between the number of review participants (2 people, 3 people, 4 or more) and the rate of finding critical defects (found/not found)?  

This uses a **contingency table** to compare the "observed counts" and "expected counts" in each cell and calculate the chi-square statistic.

##### 2. Goodness-of-Fit Test  
Tests whether the observed proportions of categorical data match the expected theoretical proportions.  
    Example: Are the category proportions of bugs observed (UI: 30%, Logic: 50%, Performance: 20%) different from the company-wide average distribution (UI: 40%, Logic: 40%, Performance: 20%)?  
    (For instructions on how to perform this test using a tool, see this article: [here](/blogs/2022/06/16/chi-square-goodness-of-fit-test/).)

#### Test Statistic and Distribution

- Test statistic: **χ² value** (sum of (observed − expected)² ÷ expected for each cell)  
- Corresponding distribution: **chi-square distribution (χ² distribution)**

![](https://gyazo.com/af11b7f4ba5d4129db714a83348a01e3.png)

#### Caveats

- Be careful when there are cells with very small expected counts, as this reduces the accuracy of the test.

Also, the following assumptions apply:  
- **Data are categorical (qualitative variables):** Applied to category-type data such as labeled groups rather than numerical values.  
- **Observations are independent:** Each cell count must come from independent trials.  
- **Expected counts are sufficiently large:** It is desirable for all cells to have an **expected count** of **at least 5**.  
    (A few cells with expected counts below 5 may be tolerated, but if **more than 20% of cells** have expected counts below 5, the reliability of the test declines.)

If these assumptions are not met, consider alternatives such as **Fisher's exact test**.

:::info
The **expected count** is the "theoretically expected value for a cell, assuming the null hypothesis is true."  
The chi-square test evaluates how much the "observed data" deviate from the "expected values."
:::

### ● How to Choose a Test

Below is a simple flowchart for choosing which test method to use:

![](https://gyazo.com/9bfcc8b88f0a3ff0f8280a58dff797f1.png)

*This is just a guideline. Each test has its own assumptions.

---

## Common Misconceptions and Caveats

"'**p < 0.05 therefore it is meaningful**'" is not necessarily true.  
It is also necessary to consider **effect size (the actual magnitude of the difference)** and **practical significance**.

### ● Statistical Significance Does Not Necessarily Mean Practical Importance

Even if the p-value is 0.01 or 0.001 (indicating statistical significance), the difference is **not necessarily important in practice**.  
The p-value merely indicates that the difference cannot be explained by chance; how large the difference is and what impact it has on the actual setting are separate matters.

> Example: Even if there is a mean difference of **0.3 bug reports**, if that has a negligible impact on the actual development process or user experience, it may be "statistically significant" but a "**practically meaningless difference**."

### ● Points of Consideration

- **p-value**: Assess whether the difference is unlikely to be due to chance (statistical significance)  
- **Effect size**: Quantitatively evaluate the magnitude of the difference (e.g., Cohen's d)  
- **Practical significance**: Evaluate the difference from the perspective of its impact and decision-making in the real-world context

:::info
A small p-value does not necessarily mean "there is a huge difference" or "an important difference."  
It is important to consider **statistical significance, effect size, and practical significance** together.
:::

---

## What About Normality?

Many hypothesis tests assume that "data follow a normal distribution", so whether this assumption holds (= normality) affects the reliability of the results.

- Check the distribution using histograms or box plots  
- Numerically check skewness and kurtosis  
- Use normality tests such as the Shapiro–Wilk test

Below is a list of major normality test methods:  
| Test Name                          | Features                                                 | Suitable Situations                                |
|------------------------------------|----------------------------------------------------------|----------------------------------------------------|
| **Shapiro–Wilk Test**              | Strong for small to medium-sized data. Accurate and widely used. | General-purpose normality test. Best for samples up to 1000 observations. |
| **Kolmogorov–Smirnov Test (K-S test)** | Compares the overall shape of the distribution. Customizable. | When the population distribution is explicitly specified. |
| **Anderson–Darling Test**          | An improvement on the K-S test, sensitive to distribution tails. | When you want to assess normality more rigorously.  |
| **Jarque–Bera Test**               | Determines based on skewness and kurtosis.               | Checking normality of residuals in regression analysis, etc. |
| **D’Agostino’s K-squared Test**    | Similar to Shapiro but strong for large data sets.       | When sample sizes are large (hundreds to thousands). |

:::info
Regarding normality tests, it is sufficient here to understand them as "methods for checking whether data follow a normal distribution."
:::

A simple guide for choosing:  
| Sample Size            | Recommended Test                             |
|------------------------|----------------------------------------------|
| Small (n < 50)         | Shapiro–Wilk Test                            |
| Medium (n ≈ 50–500)    | Anderson–Darling Test, D’Agostino’s K-squared Test |
| Large (n > 1000)       | Jarque–Bera Test, Kolmogorov–Smirnov Test (use with caution) |

Caveats:  
- Small p-value → cannot assume normal distribution (reject normality)  
- Large p-value → cannot reject normality (i.e., it is reasonable to assume normality)  

However, note that with large datasets, these tests have "excessive power", making them likely to reject even tiny deviations.  
In practice, it is recommended to use visualizations such as histograms or Q–Q plots in combination.

:::info
A **Q–Q plot (Quantile–Quantile plot)** is a graph used to visually check whether data follow a specific theoretical distribution (e.g., a normal distribution).  
It compares the quantiles of the data to the quantiles of the theoretical distribution; if the points lie on a straight line, the data are judged to follow that distribution.  
It is often used to check assumptions for hypothesis testing, such as normality.
:::

## When Normality is Not Met

Earlier, we mentioned that many hypothesis tests (such as t-tests and ANOVA) assume that **data follow a normal distribution**.  
However, actual data do not always follow a normal distribution, and in the following cases the assumption may not hold:

- Data are skewed or the distribution shape is distorted  
- Ordinal scale data where the intervals are not equal  
- Presence of extreme outliers that affect the mean  

In such cases, **non-parametric tests (distribution-free tests)** are effective.

### ● What is a Non-Parametric Test?

Non-parametric tests are methods that can be performed without assuming a specific distribution (such as normal distribution), and have the following characteristics:

- **Distribution-free** (do not assume a probability distribution)  
- Based on **ranks or medians**, making them **robust to outliers**  
- Applicable to **ordinal data or data on different scales**

### ● Commonly Used Non-Parametric Tests

| Test Name                          | Corresponding Parametric Test | Main Use Case                                            |
|------------------------------------|-------------------------------|----------------------------------------------------------|
| **Wilcoxon Signed-Rank Test**      | Paired t-test                 | Test for differences between two related samples         |
| **Mann–Whitney U Test**            | Independent t-test            | Test for differences in medians of two independent groups |
| **Kruskal–Wallis Test**            | ANOVA                         | Test for differences among three or more independent groups |
| **Friedman Test**                  | Repeated measures ANOVA       | Comparison of three or more conditions on the same subjects |

Non-parametric tests are important methods that can be leveraged as **a more realistic option**, rather than giving up on testing because "distributional assumptions do not hold."

:::info
Non-parametric tests have few distributional assumptions and are **flexible and convenient**.  
However, that does not mean "non-parametric tests are always better."  
One reason is **statistical power**.

● What is power?  
It is the probability of **correctly detecting a difference when there truly is one**.  
Low power increases the risk of **missing a real difference (Type II error)**.

● Advantage of parametric tests (when assumptions are met)  
When data meet the assumptions of parametric tests (e.g., normal distribution), **parametric tests generally have higher power than non-parametric tests**.  
This means they can **detect smaller differences with the same amount of data**.

● Trade-off  
While non-parametric tests have fewer assumptions, they can **have lower power**, so relying on them without consideration can lead to **missing important differences that could have been detected**.

● Conclusion  
Understand the characteristics of your data (distribution, outliers, etc.) and:  
- If assumptions are met, use **parametric tests**  
- If assumptions are not met, use **non-parametric tests**  

This choice is a **statistically wise decision**.
:::

---

## Practical Examples

- **Comparing before and after bug fixes**:  
  Did the average number of bugs significantly decrease after the fix?

- **Task time with UI changes**:  
  Is there a statistically significant reduction in operation time with the new UI?

- **Change in the number of review comments**:  
  Use a t-test to verify whether there is a difference in the average number of comments before and after introducing pair reviews

:::alert
**Caution**  
When using hypothesis tests, pay attention to the following assumptions:

- The sample is randomly drawn  
- Samples are sufficiently independent  
- Distributional assumptions (e.g., normality, homogeneity of variances) hold

If these are violated, the interpretation of p-values and significance may be incorrect.
:::

### ● Statistical Significance and Practical Meaning

- Even if it is "statistically significant," whether it "matters" in practice is another story.  
- Statistics are just **one piece of the decision-making puzzle**.  
  In practice, decisions need to balance other factors such as **cost, scope of impact, and reproducibility**.

---

## Conclusion

Hypothesis testing is an important method for statistically determining whether there is a meaningful difference in the data.  
With correct understanding and usage, you can avoid wrong decisions and conduct reliable analyses.

### Steps of Hypothesis Testing
- Clearly define the **null hypothesis** and **alternative hypothesis**  
- Calculate the test statistic and determine the **p-value**  
- Compare with the **significance level (e.g., 5%)** to decide whether it is statistically significant

### Key Points to Note
- **Statistical significance ≠ practical importance** (also consider effect size and usability)  
- Pay attention to **assumptions of normality**, **sample size**, and **sampling method**  
- Choose the appropriate test type (t-test, ANOVA, chi-square test, etc.)

Statistics are tools not only for determining whether there is a difference but also for judging how meaningful that difference is.  
Hypothesis testing is not perfect, but if you deepen your understanding and use it correctly, it can become a powerful tool.

---

## Next Time

Next time, we will cover the difference between "correlation" and "causation."

[Statistical information is compiled here.](/analytics/)

I hope you find it useful for data analysis.

<style>
img {{
    border: 1px gray solid;
}}
</style>
