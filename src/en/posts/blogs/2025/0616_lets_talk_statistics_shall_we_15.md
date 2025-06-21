---
title: >-
  Let's Talk About Statistics - Introduction to Statistics for Software Quality
  (No.15 Practical Case Studies of Statistical Quality Control (SQC))
author: shuichi-takatsu
date: 2025-06-16T00:00:00.000Z
tags:
  - Analytics
  - ソフトウェア
  - 品質
  - 新人向け
image: true
translate: true

---

## Introduction: The Grand Finale of Quality Analysis Has Arrived

**"Why aren't defects decreasing?" "Is this process really stable?"**  
― Can you answer such questions with statistics?

So far, we have learned many analytical methods from a statistical perspective on the theme of software quality.  
And now, in Part 15 of "Let's Talk About Statistics," as the **culmination** of this series, we introduce **Statistical Quality Control (SQC: Statistical Quality Control)**.

SQC is a framework that leverages statistical methods to **visualize** the quality of processes and deliverables and to continuously improve them.  
It is highly useful not only in manufacturing but also in software development and testing for **analyzing bug trends** and **verifying process stability**.

"Quality is not a matter of chance, but something to be controlled"—SQC strongly supports this idea.  
In this chapter, building on the knowledge we have acquired so far, we explain, with concrete examples, how to apply it to real-world software quality management.

---

## Main SQC Metrics for Practical Use

**"What does it mean to 'visualize quality' in concrete terms?"**  
It simply means **having metrics** that allow you to quantitatively grasp the state on the ground.  
Instead of relying on subjective intuition or personal experience, you need **tools that can make data-driven decisions**.

Here, we introduce representative SQC metrics frequently used in software quality management.  
They all serve as weapons for "speaking about quality in numbers."

| Metric                             | Example Use                                                                                     |
|------------------------------------|-------------------------------------------------------------------------------------------------|
| Bug Density                        | Quantitative quality evaluation (e.g., defects per KLOC)                                        |
| Review Defect Rate                 | Verifying review coverage and effectiveness                                                    |
| Defect Distribution (Pareto)       | Identifying concentrated defect causes                                                         |
| Hypothesis Testing (t-tests, etc.) | Statistically testing the effectiveness of quality improvement or review process changes       |
| Regression Analysis (simple, etc.) | Analyzing relationships between test effort or review scope and outcomes to quantitatively assess improvements and design validity |

**Metrics should not be mere numbers for reporting but hints that inspire "insight" and "action."**

---

## Case 1: Defect Density and Delivery Decisions

### ● Background:

In a certain project (PJ), we introduced "defect density (defects/KLOC)" as the **quality criterion** to decide whether to approve the final release.  
This metric, rather than just the number of defects, considers the size of the source code, making it easier to compare across projects and against past performance.

### ● Actions:

- Collected the **average defect density and its standard deviation (σ)** from past projects as a comparison baseline.  
- If the target project's defect density exceeded "**average + 3σ**", we considered it a **statistically abnormal level of defects**, and:
  - Judged it as a **quality risk**  
  - Conducted **additional reviews and focused checks** to reconsider the release decision

### ● Key Points:

- The normalized metric of **defects per KLOC** allows comparison between large and small projects.  
- Using the **3σ rule** enables objective and explainable decisions.  
- This method is the **first step in moving away from subjective ‘delivery decisions’ and towards quantitatively managed quality standards.**

**Quality decisions based on numbers** are key to increasing team-wide buy-in and transparency in decision-making.

### ● Example: Delivery Decision Logic Based on Defect Density (Python)

```python
import numpy as np
import matplotlib.pyplot as plt
plt.rcParams['font.family'] = 'Meiryo'

# Sample data of defect densities (defects/KLOC) from past projects
past_defect_densities = np.array([12.5, 15.0, 11.8, 14.3, 13.2, 16.1, 12.9])

# Current project's defect density
current_density = 23.7  # ←You can change this to check other projects

# Calculate mean and standard deviation
mean = np.mean(past_defect_densities)
std_dev = np.std(past_defect_densities, ddof=1)  # Calculated as a sample, not population

# Threshold = mean + 3σ
threshold = mean + 3 * std_dev

# Decision
print(f"Past Mean: {mean:.2f}, Std Dev: {std_dev:.2f}, Threshold: {threshold:.2f}")
print(f"Current Project Defect Density: {current_density:.2f}")

if current_density > threshold:
    print("△: Quality risk present—consider conducting additional reviews.")
else:
    print("〇: Quality risk is considered low.")
```

The results are as follows:  
```text
Past Mean: 13.69, Std Dev: 1.51, Threshold: 18.23
Current Project Defect Density: 23.70
△: Quality risk present—consider conducting additional reviews.
```

### ● Explanation of Statistical Methods

#### 1. **Calculation of Defect Density**
- Definition:  
  $$ \text{Defect Density} = \frac{\text{Number of Defects}}{\text{KLOC (thousands of lines of code)}} $$
- Role: A normalized measure of software quality by code size, allowing comparison across projects.

#### 2. **Use of Basic Statistics (Mean and Standard Deviation)**
- Mean: Understands the "central tendency" of past performance values.  
- Standard Deviation: Evaluates the variability (i.e., stability of quality) in defect density.  
- Purpose: To determine whether the current project falls within the "normal range" of past performance.

#### 3. **3σ Rule (Outlier Detection Based on Normal Distribution)**
- Concept:
  - Assuming a normal distribution, about 99.7% of data falls within "mean ± 3σ."  
  - Data beyond this range is considered "statistically abnormal."
- Practical Interpretation:
  - Defect density exceeding mean + 3σ → judged as a **high-quality risk state**, triggering additional reviews.

#### 4. **Outlier Detection and Decision Support**
- This method **quantifies risk based on mathematical evidence**, enabling objective quality decisions rather than subjective ones.

### ● Summary of Case 1

In this case, by combining **descriptive statistics (mean & standard deviation) with the 3σ rule** for the practical metric of "defect density," we achieve **process stability assessment and release decision support**.  
This is arguably the most fundamental approach in SQC (Statistical Quality Control).

---

## Case 2: Analysis of Review Defect Rate

### ● Background:

Although code reviews were conducted, many bugs were still found in later stages.  
We investigated the question: "Why are bugs being missed even though reviews were supposed to have been performed?"

### ● Actions:

- Visualized, at a file level, the ratio of "number of review comments" to "number of reviews conducted" (i.e., the review defect rate).  
- Discovered that certain areas had **extremely low review defect rates**.  
- Inferred that those areas were "formally reviewed on record but were essentially superficial reviews."  
- Implemented a **review process overhaul** (e.g., formalizing review criteria, introducing pair reviews) in the affected areas.

### ● Key Points:

- The strength of the review defect rate is that it **visualizes formal reviews and questions their effectiveness**.  
- By detecting extreme zero-defect rates or skewed patterns, you can **reveal hidden signs of quality risk**.

### ● Example: Visualizing Review Defect Rate (Python)

```python
import matplotlib.pyplot as plt
import numpy as np

# Japanese font (Windows environment)
plt.rcParams['font.family'] = 'Meiryo'

# Number of reviews conducted and number of defects identified per module
modules = ['ModuleA', 'ModuleB', 'ModuleC', 'ModuleD', 'ModuleE']
review_counts = np.array([10, 12, 9, 15, 13])    # Reviews conducted
defect_counts = np.array([4, 0, 5, 1, 6])        # Defects identified

# Calculate defect rate (avoid division by zero)
with np.errstate(divide='ignore', invalid='ignore'):
    review_rates = np.where(review_counts > 0, defect_counts / review_counts, 0)

# Visualize with a bar chart
plt.figure(figsize=(8, 5))
bars = plt.bar(modules, review_rates, color='skyblue')
plt.ylabel('Review Defect Rate')
plt.ylim(0, 1.0)
plt.title('Review Defect Rate by Module')

# Display values above bars
for bar, rate in zip(bars, review_rates):
    plt.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.02,
             f'{rate:.2f}', ha='center')

plt.grid(axis='y', linestyle='--', alpha=0.7)
plt.tight_layout()
plt.show()
```

The results were as follows:  

![](https://gyazo.com/43de179736472dfecd6ea87ca2871333.png)

- `ModuleB` had 0 defects identified out of 12 reviews → possible **superficial review**  
- `ModuleD` also had a low defect rate (1/15) → possible **insufficient coverage or reviewer inexperience**

Through such visualization, you can **quantitatively extract problematic review areas** and target process improvements precisely.

### ● Explanation of Statistical Methods

1. **Ratio Metric (Review Defect Rate)**  
   - Defect Rate = Number of Defects Identified ÷ Number of Reviews Conducted  
   - A representative process metric for measuring the "quality" of reviews

2. **Visual Outlier Detection (Part of EDA)**  
   - Visualize extreme zeros or variability in a bar chart to detect signs of **formalized or hollow reviews**

3. **Introduction of a Practical Quantitative Improvement Cycle**  
   - Starting from "Why are there so few defects identified?", leading to **improvements in review objectives, methods, and criteria**

### ● Summary of Case 2

This case demonstrates how using a **rate rather than absolute counts** makes the quality of reviews visible, surfacing the **hard-to-see issue of "superficial reviews" with data**.  
It’s not advanced statistical analysis, but it is a **fundamental approach of SQC directly applicable to practice**.

---

## Case 3: Focused Management with Defect Distribution (Pareto Analysis)

### ● Background:

Defects were occurring frequently, but priorities for where to start were unclear.  
There were not enough resources to "tackle everything," leading to ineffective improvements.

### ● Actions:

- Aggregated defect counts by cause category and module  
- Created a Pareto chart and confirmed that **approximately 80% of defects were caused by the top 20% of categories**  
- Prioritized improvement activities (training, focused reviews, design improvements) on the top causes

### ● Key Points:

- In a context where you "can’t address everything," this method **visualizes where to invest limited resources**.  
- By focusing improvements based on numbers, you gain **high explanatory power and buy-in on the ground**.  
- As a representative approach where you can readily see SQC “results,” it’s easy to demonstrate actual improvement outcomes.

### ● Example: Creating a Pareto Chart by Defect Category (Python)

```python
import matplotlib.pyplot as plt
import numpy as np

# Japanese font settings (for Windows environment)
plt.rcParams['font.family'] = 'Meiryo'

# Defect categories and counts (example)
categories = ['Specification Omission', 'Design Error', 'Coding Error', 'Insufficient Review', 'Test Omission']
counts = np.array([35, 25, 20, 10, 5])

# Sort in descending order by count
sorted_idx = np.argsort(counts)[::-1]
sorted_categories = np.array(categories)[sorted_idx]
sorted_counts = counts[sorted_idx]

# Calculate cumulative percentage
cumulative = np.cumsum(sorted_counts)
cumulative_percent = cumulative / cumulative[-1] * 100

# Plotting
fig, ax1 = plt.subplots()

ax1.bar(sorted_categories, sorted_counts, color='skyblue', label='Number of Defects')
ax1.set_ylabel('Number of Defects')
ax1.set_ylim(0, max(sorted_counts)*1.2)

ax2 = ax1.twinx()
ax2.plot(sorted_categories, cumulative_percent, color='red', marker='o', label='Cumulative Percentage (%)')
ax2.set_ylabel('Cumulative Percentage (%)')
ax2.set_ylim(0, 110)

plt.title('Pareto Chart by Defect Category')
fig.tight_layout()
plt.grid(True, axis='y', linestyle='--', alpha=0.6)
plt.show()
```

The results were as follows:  

![](https://gyazo.com/a43da3d80d0249886dc3d77a2445e778.png)

### ● Explanation of Statistical Methods

#### 1. Pareto Analysis
- Visualizes the phenomenon where **a minority of causes leads to a majority of results**, based on the 80:20 rule  
- Combines bar charts (individual values) and line charts (cumulative percentage)

#### 2. Setting Priority of Items
- Not just sorting by count; you can also consider "impact" and "frequency"  
- Enables **data-driven prioritization of improvement efforts**

#### 3. Decision Support in SQC
- Pareto charts are extremely effective **visual tools for explaining the priority and rationale of improvement activities**

### ● Summary of Case 3

This case is a **representative example of SQC** that shows **where to focus resources** using data.  
It helps achieve maximum effect with limited time, personnel, and cost through “focused management.”

---

## Case 4: Evaluating the Effect of Review Improvement Measures

### ● Background:

After implementing measures to strengthen review criteria (introducing checklists, formalizing viewpoints, etc.), it was necessary to evaluate, "Did the quality of reviews (number of defects identified) actually improve?"

### ● Actions:

- **Mean difference test using a t-test**  
- Collected review defect count data for "before" and "after" the improvement measures  
- Used **t-test (two-sample test without pairing)** to evaluate whether there was a difference in average defect counts between the two groups  
- If a statistically significant difference was found, we judged the measures to be effective

### ● Key Points:

- You can **judge the effectiveness of measures with data rather than intuition**.  
- Testing is the most direct way to **give statistical evidence to quality improvement decisions**.  
- Concepts such as null hypothesis, alternative hypothesis, p-value, and significance level are fundamental to statistics.

### ● Example: Evaluating the Effectiveness of Review Improvement Measures (Python)

```python
import numpy as np
from scipy import stats
import matplotlib.pyplot as plt
plt.rcParams['font.family'] = 'Meiryo'  # Japanese font (Windows environment)

# Number of defects identified per review before improvements (example)
before = np.array([2, 3, 1, 2, 3, 2, 1])

# Number of defects identified per review after improvements
after = np.array([4, 5, 3, 4, 5, 6, 4])

# t-test (Welch’s t-test, assuming unequal variances)
t_stat, p_value = stats.ttest_ind(after, before, equal_var=False)

print(f"t-statistic: {t_stat:.2f}")
print(f"p-value: {p_value:.4f}")

# Decision based on results
alpha = 0.05
if p_value < alpha:
    print("〇 Significant difference: The measures are judged to be effective.")
else:
    print("△ No significant difference: The measures' effectiveness cannot be confirmed statistically.")
```

The results were as follows:  
```text
t-statistic: 5.05
p-value: 0.0003
〇 Significant difference: The measures are judged to be effective.
```

### ● Explanation of Statistical Methods

#### 1. Hypothesis Testing (t-test)
- Null Hypothesis $H_0$: "There is no difference in mean defect counts before and after improvements."  
- Alternative Hypothesis $H_1$: "There is a difference in means."  
- Calculate the **t-statistic and p-value**, and judge if there is a difference at a **5% significance level (p < 0.05)**

#### 2. Welch’s t-test
- Assumes unequal population variances, using a **t-test that does not assume equal variances**  
- In practice, sample sizes are often small, making Welch's method more broadly applicable

#### 3. Decision Support
- The test results provide **quantitative evidence for the effectiveness of improvement activities**  
- Directly ties into **detecting quality changes in SQC**

### ● Summary of Case 4

This case illustrates answering the question "Did the measures make a difference?" **with statistical evidence**.  
Testing is a fitting final approach as the **technical support for SQC’s "moment of decision."**

---

## Case 5: Analyzing the Relationship Between Review Scope and Defect Counts

### ● Background:

We tested the hypothesis that the more lines of code reviewed, the more defects would be identified.  
The goal was to confirm whether review effort corresponds to results and to use this for optimizing review design and viewpoints.

### ● Actions:

- Collected data on "lines of code reviewed (SLOC)" and "number of defects identified" from past review records  
- Used simple regression analysis to **model the relationship between review scope and defect counts**  
- Checked the strength of correlation and slope of the regression equation to consider an appropriate review granularity

### ● Key Points:

- Validates the **balance between review quality and quantity: "the more you look, the more you find"?**  
- From the regression coefficient, you can quantitatively obtain the **"expected value" of review effectiveness**  
- If fewer defects are found than expected, it also raises suspicion of **omitted viewpoints or superficial reviews**

### ● Example: Regression Analysis of Review Scope vs. Defect Counts (Python)

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression

plt.rcParams['font.family'] = 'Meiryo'

# Data: lines of code reviewed (SLOC) and defects identified
x = np.array([100, 200, 300, 400, 500]).reshape(-1, 1)
y = np.array([2, 4, 6, 7, 8])

# Regression analysis
model = LinearRegression()
model.fit(x, y)

# Regression coefficient and intercept
a = model.coef_[0]
b = model.intercept_
print(f"Regression equation: Defect Count = {a:.2f} × Lines + {b:.2f}")

# Visualization
x_pred = np.linspace(50, 600, 100).reshape(-1, 1)
y_pred = model.predict(x_pred)

plt.scatter(x, y, color='blue', label='Actual Data')
plt.plot(x_pred, y_pred, color='red', label='Regression Line')
plt.xlabel('Lines of Code Reviewed (SLOC)')
plt.ylabel('Defect Count')
plt.title('Relationship Between Review Scope and Defect Counts')
plt.grid(True)
plt.legend()
plt.tight_layout()
plt.show()
```

The results were as follows:  

![](https://gyazo.com/f80ba623b86f8c04ce9b0441d2720eb2.png)

### ● Explanation of Statistical Methods

#### 1. Simple Regression Analysis
- Explanatory Variable: Lines of code reviewed (SLOC)  
- Response Variable: Number of defects identified  
- Regression Line: Estimate $y = ax + b$ for prediction and comparison

#### 2. Meaning of the Regression Coefficient
- **A large coefficient** means that "as lines increase, defects increase" = **a consistent defect density**  
- **A small coefficient** means that even with more lines, defects don't increase → suspicion of review superficiality

#### 3. Model Evaluation and Residuals
- Use $R^2$ and residual plots to assess model fit, explanatory power, and pattern biases

Below is model evaluation and residual analysis (visualized in Python).

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score

plt.rcParams['font.family'] = 'Meiryo'

# Data
x = np.array([100, 200, 300, 400, 500]).reshape(-1, 1)
y = np.array([2, 4, 6, 7, 8])

# Train the model
model = LinearRegression()
model.fit(x, y)

# Prediction and R^2
y_pred = model.predict(x)
r2 = r2_score(y, y_pred)
print(f"Coefficient of determination R^2 = {r2:.3f}")

# Calculate residuals
residuals = y - y_pred

# Residual plot
plt.figure(figsize=(6, 4))
plt.scatter(y_pred, residuals, color='purple')
plt.axhline(0, color='red', linestyle='--')
plt.xlabel('Predicted Values (Defect Count)')
plt.ylabel('Residuals (Actual - Predicted)')
plt.title('Residual Plot (Review Lines vs. Defect Count)')
plt.grid(True)
plt.tight_layout()
plt.show()
```

![](https://gyazo.com/31a118fe94a7cf91460decb846aae693.png)

From the coefficient of determination **$R^2 = 0.970$**, we see that the review lines explain the defect count well.  
The residuals are randomly distributed, indicating the linear regression model is highly valid.  
This result provides a reliable basis for predicting the relationship between review scope and outcomes in practice.

### ● Summary of Case 5

In this case, we used regression analysis to **visualize the relationship between review scope and outcomes (defect counts)**, obtaining evidence to optimize review activities and review structure.  
This is a highly practical approach for delving into the relationship between “quantity” and “results” in quality activities.

---

## Key Points for Introducing SQC (Statistics Don’t Have to Be Complicated)

- **The essence of SQC is not to end with mere number reporting but to discover "changes" and "deviations" that lead to insights.**  
  **<span style="color: red;">Even without complex formulas or models, simple visualizations such as bar charts, Pareto charts, and time-series trends of metrics can deliver ample practical impact.</span>**

- Most of the cases covered in this series consist of **basic descriptive statistics + simple methods**, such as ratios, densities, and difference tests.  
  You don’t need complicated theories; what matters is the ability to **gain insight, make judgments, and provide explanations**.

- Also, **don’t try to complete SQC individually**.  
  By incorporating **regular sharing, visualization, and review** mechanisms within the team, you can more easily cultivate a **culture of continuous quality improvement**.

**In SQC, the attitude of “observing, thinking, and dialoguing” is far more important than statistical knowledge.**

---

## Concluding This Series

Thank you for following the "Let's Talk About Statistics" series over 15 installments.  
This series has focused on **how statistics can be useful in software quality settings**, introducing both fundamental statistical methods and real-world case studies.  
I hope you have learned not just theoretical explanations but also the **concepts and techniques to visualize quality and turn it into improvement**.

**Statistics are tools for "observation, insight, and dialogue," more than for complicated formulas.**

While this marks a pause for the series, I plan to share additional statistical and quality management topics useful for practice and education as special editions as needed.  
Please continue to expand **the culture of talking about quality using statistics** in your own workplaces.

[I've compiled related statistical information here.](/analytics/)  
I hope you find it useful for your data analysis.

<style>
img {{
    border: 1px gray solid;
}}
</style>
