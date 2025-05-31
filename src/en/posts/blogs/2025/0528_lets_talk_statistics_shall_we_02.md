---
title: >-
  Let's Talk About Statistics - Introduction to Statistics for Software Quality
  (No.2 Properly Engaging with Data)
author: shuichi-takatsu
date: 2025-05-28T00:00:00.000Z
tags:
  - Analytics
  - ソフトウェア
  - 品質
  - 新人向け
image: true
translate: true

---

## Introduction

In the second installment of "Let's Talk About Statistics," we’ll discuss how to properly engage with the data itself, which is the prerequisite for any statistical work. No matter how sophisticated the analysis methods are, they’re meaningless if the underlying data aren’t appropriate. Here, we’ll cover the basics of data from three perspectives:

- Types of data (qualitative vs. quantitative + scales)
- Relationship between measurements and errors
- Conditions for collecting good data

---

## Types of Data: Qualitative Data and Quantitative Data

In statistics, data are broadly classified into two types: "qualitative data" and "quantitative data."

### ● Qualitative Data (Categorical Data)

Data that carry meaning or attributes and are represented by **labels** or **categories** rather than numbers.

- Example: Types of bugs (UI, logic, performance)
- Example: Review judgments (OK / NG / needs recheck)
- Example: Test results (pass / fail)

**Features**:
- Cannot perform numerical calculations (e.g., cannot compute averages)
- Can be used for comparing proportions or frequencies

Qualitative data can be further classified into two types:
- **Nominal Data**: Labels with no inherent order (e.g., types of bugs)  
  ![Example of Nominal Data](https://gyazo.com/552776ed6a2808b50fb2b3efe9c753cb.png)

- **Ordinal Data**: Data with a meaningful order (e.g., review ratings S > A > B > C)  
  ![Example of Ordinal Data](https://gyazo.com/94e95dc032c7b0f5447225f8023c5868.png)

### ● Quantitative Data (Numeric Data)

Data measured as quantities where the **numbers themselves have meaning**.

- Example: Number of defects, test execution time, code size (KLOC)
- Example: Days taken for fixes, bug density

**Features**:
- Subject to descriptive statistics (mean, variance, etc.) and inferential statistics
- Easy to visualize with line graphs or scatter plots

Quantitative data can also be divided into two types:
- **Discrete Data**: Values that jump (e.g., number of bugs)  
  ![Example of Discrete Data](https://gyazo.com/877a9f31f03b39a30949b1a0eb06d0df.png)

- **Continuous Data**: Values over a continuous range (e.g., memory usage)  
  ![Example of Continuous Data](https://gyazo.com/b41ad15e22d8ccb34a4ba830e19d7acd.png)

---

## About Data Scales

Data differ in meaning and how they should be handled. To choose the right statistical methods and visualization techniques, understanding **scales** is indispensable.

### ● Nominal Scale
- Simple labels (e.g., bug categories, error code classifications)
- Calculations are limited to occurrence counts and the mode

### ● Ordinal Scale
- Order is meaningful (e.g., review ratings, satisfaction surveys: satisfied > neutral > dissatisfied)
- You can compute medians and compare ranks, but calculating means may be inappropriate

### ● Interval Scale
- Equal intervals are meaningful, but there is no absolute zero (e.g., dates, temperature in °C)
- Addition, subtraction, and standard deviation are possible

### ● Ratio Scale
- Has an absolute zero, allowing all arithmetic operations (e.g., execution time, number of defects)
- The most commonly used scale in statistical analysis and visualization

### ● Differences Among the Four Scales and Corresponding Statistical Treatments

The table below shows the differences among these four scales:

| Scale         | Comparison | Mean | Difference | Ratio | Examples                                    |
|---------------|------------|------|------------|-------|---------------------------------------------|
| Nominal Scale | ✕          | ✕    | ✕          | ✕     | Bug classification, error code classification |
| Ordinal Scale | ◯          | △    | ✕          | ✕     | Review ratings, satisfaction surveys          |
| Interval Scale| ◯          | ◯    | ◯          | ✕     | Dates, temperature in °C                     |
| Ratio Scale   | ◯          | ◯    | ◯          | ◯     | Execution time, number of defects            |

![Differences Among the Four Scales and Application Examples](https://gyazo.com/68ac1d7e8e5e9f9d06eea0fb19545231.png)

For example, defect density (defects/KLOC) is on a ratio scale, allowing for mean, variance, and trend analysis. The figure below shows the trend of defect density per release, indicating that the goal is being met as it falls below 0.8 defects/KLOC.  
![Trend of Defect Density per Release and Goal Comparison](https://gyazo.com/bccc71ddbb11955635f7a971d69b5fea.png)

**Differences in scales affect which statistical methods, types of graphs, and interpretations can be applied.**

---

## Measurements and Errors

No matter how carefully you measure, **errors will inevitably occur (including variability).** If you don’t understand this, you risk blindly trusting data and making incorrect decisions.

### ● Measured Value = True Value + Error

Measurements of software quality data (such as review time or bug occurrence rate) have inherent limits in reproducibility. It’s important not to judge based on a single measurement result but to assume that “measurements have variability.” The figure below shows an actual example of variability when measuring the same test item 10 times.

- Example: When measuring test execution time, it varies by about 1–2 seconds each time.  
![Variability in Repeated Measurements: Measured Value = True Value + Error](https://gyazo.com/aeb8aa514b860f49f05cd535da4aa95f.png)

Thus, in reality, measuring the same subject does not yield exactly the same result every time.

### ● Types of Error

In environments dealing with quality data, confusing “variability” with “bias” can lead to incorrect improvement decisions. It’s essential to understand that there are different types of measurement errors and to distinguish between them. The figure below illustrates the typical differences between systematic error and random error.

1. Systematic Error: error that consistently biases in the same direction (e.g., the measuring device shows times 0.5 seconds too fast)  
2. Random Error: error that occurs randomly with each measurement (e.g., environmental noise or differences between measurers)  
![](https://gyazo.com/84868a3bcf6874f99f9f4052853b297e.png)

### ● Why Should You Be Aware of Errors?

Relying on “a single measurement result” to make quality improvement decisions is extremely dangerous. Because measurement results include variability, a statistical perspective is essential to determine whether a change is statistically significant. The figure below compares variability in measurement results before and after a change. How would you interpret whether the difference in medians is significant?

- It’s dangerous to judge based on a single measurement.  
- By treating errors statistically, you can determine whether a change really occurred.  
![](https://gyazo.com/6da28875ce7b14702b51000296d07ace.png)

It is important to maintain the stance that data are merely **“observations containing uncertainty.”**

---

## What Constitutes Good Data?

Statistics only make sense if there is **“good data.”** So, what makes data good?

### ● Conditions for Good Data

1. **Accuracy**: Are there any recording errors or unit mistakes?  
2. **Consistency**: Are measurement methods and recording rules standardized?  
3. **Completeness**: Is data collected comprehensively for the necessary scope?  
4. **Timeliness**: Is data obtained at the required points in time?  
5. **Objectivity**: Is there any bias from subjectivity or personal feelings?  
6. **Suitability for Purpose**: Does this data fit the intended analysis or decision-making objective?

> Example: If the purpose is “defect root cause analysis,” does it include occurrence phase and scope of impact, etc.?

### ● Examples of Bad Data

- Aggregating defect counts without distinguishing between number of occurrences and number of causes (unclear definitions)  
  → **Document the definition and classification rules for bugs, and clarify aggregation rules**  
- Different criteria for recording “bugs” by different staff (subjective bias)  
  → **Establish recording rules, standardize definitions, and perform reviews**  
- Test time records are handwritten and entered later (lack of reliability)  
  → **Introduce automatic collection or immediate entry mechanisms to ensure reliability**

### ● Data Collection Is 90% About “Rule-Making”

Collecting data “just in case” often becomes unusable when you reach the analysis stage.

- Clearly define **who records what and how**  
- It’s important to prepare **data definition documents and recording rule tables**

> In actual practice, there are many cases where, due to “ambiguous recording formats” or “different recording granularities among staff,” you can’t tabulate the data after gathering.  
> That is why **recording design and communication with stakeholders need to come before data collection**.

---

## Conclusion

- Data can be qualitative or quantitative, and the applicable statistical methods differ  
- Since measurements always include errors, multiple observations and consideration of errors are necessary  
- To collect good data, clarifying recording rules and definitions is essential

---

## Next Time

Next time, we’ll finally move into the world of descriptive statistics and learn how to use mean, median, and mode appropriately.

[Here is a compilation of statistical information.](/analytics/)

I hope you can utilize it for data analysis.

<style>
img {
    border: 1px gray solid;
}
</style>
