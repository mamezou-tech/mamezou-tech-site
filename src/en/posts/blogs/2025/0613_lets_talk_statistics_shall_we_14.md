---
title: >-
  Let's Talk About Statistics - Introduction to Statistics for Software Quality
  (No.14 Prediction: Interpreting Quality with Regression Analysis)
author: shuichi-takatsu
date: 2025-06-13T00:00:00.000Z
tags:
  - Analytics
  - ソフトウェア
  - 品質
  - 新人向け
image: true
translate: true

---

## Introduction

In the fourteenth installment of "Let's Talk About Statistics," we challenge ourselves to "predict the future" using a technique called **regression analysis**.  
In this series, we have been using past data to grasp the overall picture and relationships, and this time, we'll leverage that insight to learn how to **predict "what will happen in the future" with concrete numbers**.

For example—  
- Estimate future defect counts based on the relationship between past testing effort and the number of bugs  
- Predict the number of review comments based on the number of code lines in a module  
- Predict a decline in user satisfaction based on changes in response time  

In this way, **regression analysis is a statistical tool for stepping from "relationships" into "estimating the future."**  
In software quality environments, there are increasing situations where, in addition to heuristics, **quantitative predictions** support decision-making.

This time, we will cover the basics of regression analysis—simple linear regression—and provide a compact explanation from theory to practice to implementation in Python.  
I hope you'll feel, "Statistics can also be used for prediction!"

---

## What Is Regression Analysis?

**Regression analysis** is a statistical method for **predicting** a certain variable (the dependent variable) using other variables (independent variables).  
Simple correlation analysis only captures tendencies such as "there is / there is no relationship," but regression analysis models that relationship as a formula and makes it possible to **estimate and predict specific numerical values**.

For example—  
- If you know the testing effort (independent variable), you can predict the future number of bugs (dependent variable)  
- If you know a module's lines of code or complexity, you can estimate the number of review comments or defects  
- Model the relationship between skill or years of experience and defect occurrence to analyze team risk  

Regression analysis is used for the following purposes:

1. **Prediction**  
   Based on the values of independent variables, predict the values of the dependent variable.  
   Examples:  
   - Lines of code in a module → Predict the number of latent defects in that module  
   - Testing design effort → Predict the number of defects that will be found  

2. **Factor Analysis**  
   Quantitatively evaluate which independent variables have how much impact on the dependent variable.  
   Examples:  
   - Compare the magnitude of the effects of complexity, code volume, and developer skill on defect count  

:::info
This method is not only a fundamental technique in statistics but has also become the **foundation of predictive modeling in machine learning** in recent years. Because of its high accuracy and interpretability, it is considered a standard analysis method in software quality analysis.
:::

---

## Simple Linear Regression: The Most Basic Regression Model

There are various types of regression analysis, but the most basic is **simple linear regression**.  
This is an extremely simple model for "predicting one dependent variable (Y) from one independent variable (X)."

The basic formula for simple linear regression is as follows:

$$
Y = \beta_0 + \beta_1 X + \varepsilon
$$

The meanings of these symbols are:

- $Y$: the variable to predict (dependent variable)  
- $X$: the explanatory variable (variable used for prediction)  
- $\beta_0$: intercept (the predicted value of Y when X is 0)  
- $\beta_1$: regression coefficient (how much Y changes when X increases by one unit)  
- $\varepsilon$: error term (the deviation that the model cannot explain)  

This equation assumes a **linear relationship between X and Y** and aims to draw a single line (the regression line) for prediction.  
Intuitively, the goal is to "draw the line that best fits the scatterplot of the data" so that Y can be predicted from X.

### ● How to Derive the Regression Equation (Least Squares Method)

How do we find the line that "fits best"?  
The answer is the **Least Squares Method**.

#### Residuals and Their Minimization

A "residual" is the **difference between the actual observed value and the predicted value by the regression line** for each data point.

$$
\varepsilon_i = y_i - (\beta_1 x_i + \beta_0)
$$

We adjust the regression line so that these residuals are as small as possible.  
However, simply summing the residuals cancels out positive and negative values, so we minimize the **sum of squared residuals**:

#### Objective of the Minimization

$$
\text{Objective:} \quad \sum_{i=1}^{n} (y_i - \beta_1 x_i - \beta_0)^2 \quad \text{minimized}
$$

In this way, you obtain the optimal line that minimizes the deviation between all data points and the line.  
Mathematically, you can derive $\beta_0$ (intercept) and $\beta_1$ (slope) using differentiation, but tools like Python can compute them automatically.

:::info
● Practical Point  
The "regression line obtained by the least squares method" does not perfectly fit all data.  
However, it is a very effective way to capture the "overall trend."  
To validate its effectiveness, the **coefficient of determination ($R^2$) and residual analysis** explained in the next chapter are important.
:::

### ● Example: Predicting Bug Counts from Testing Effort

In software development, we can assume there is a certain relationship between **testing effort (time or person-days) and the number of bugs found**.  
Below is an example of creating a model to predict future bug counts from testing effort using past project data.

Past data used  
| Testing Effort (Person-Days) | Number of Bugs |
|------------------------------|----------------|
| 5                            | 4              |
| 10                           | 6              |
| 15                           | 10             |
| 20                           | 14             |
| 25                           | 16             |

Based on this data, we perform prediction using a linear regression model.

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression

# Japanese font setting (for Windows environments)
plt.rcParams['font.family'] = 'Meiryo'

# Past data (example: testing effort [person-days] and number of bugs)
x = np.array([5, 10, 15, 20, 25]).reshape(-1, 1)  # Explanatory variable: testing effort
y = np.array([4, 6, 10, 14, 16])                  # Dependent variable: number of bugs found

# Create and train simple regression model
model = LinearRegression()
model.fit(x, y)

# Retrieve regression coefficient and intercept
a = model.coef_[0]
b = model.intercept_
print(f"回帰式：バグ件数 = {a:.2f} × テスト工数 + {b:.2f}")

# Prediction and visualization
x_pred = np.linspace(0, 30, 100).reshape(-1, 1)
y_pred = model.predict(x_pred)

plt.scatter(x, y, label='実測値（観測データ）', color='blue')
plt.plot(x_pred, y_pred, label='回帰直線', color='red')
plt.xlabel('テスト工数（人日）')
plt.ylabel('バグ件数')
plt.title('テスト工数とバグ件数の回帰分析')
plt.legend()
plt.grid(True)
plt.show()
```

When you run the above program, the following result is output:  
![Regression Analysis of Testing Effort and Bug Count](https://gyazo.com/dc71988abf60b42b293ca77841b7389f.png)

In this example, a positive correlation is assumed: the more testing effort, the more bugs found.  
Of course, in reality, other factors such as test quality and specification complexity also play a role, but it is effective as a simple predictive model focusing on a single factor.

---

## Model Fit: Coefficient of Determination

The indicator used to evaluate how well the created regression model "fits (i.e., how useful it is)" is the **coefficient of determination ($R^2$)**.

- $R^2$ takes a value between 0 and 1, with values closer to 1 indicating higher **explanatory power** of the model.

For example, if $R^2 = 0.75$:  
- You can read it as "75% of the variance in Y is explained by X."  
- The remaining 25% is considered to be due to other variables not used for explanation or random error.

### ● Practical Use Points

The coefficient of determination serves as a baseline for objectively evaluating the "confidence level of predictions."  
However, **a high $R^2$ does not always mean a "good model,"** so it should be judged in conjunction with other indicators.

#### Example Check in Python (continued)

```python
r2 = model.score(x, y)
print(f"決定係数 R^2 = {r2:.2f}")
```

Calculating the above yields "Coefficient of Determination $R^2$ = 0.98."  
In this way, you can numerically confirm how well the model fits the actual data.

:::info
● Why a High $R^2$ Does Not Guarantee a Good Model  

The coefficient of determination $R^2$ is an **indicator of explanatory power**, showing "how much of the variance in the dependent variable (Y) the model can explain."  
However, even if $R^2$ is high, it does not necessarily indicate a good model. The reasons are as follows:

・Reasons Why $R^2$ Alone Is Insufficient  

1. **Model Assumptions May Be Violated**  
   - If residuals are biased or heavily influenced by outliers, a high $R^2$ cannot be trusted.

2. **Overfitting**  
   - Especially in multiple regression analysis, increasing the number of explanatory variables tends to raise $R^2$, but **does not necessarily improve predictive accuracy**.

3. **Overlooking Nonlinearity**  
   - Even if the true relationship is nonlinear, approximating it with a linear model can artificially raise $R^2$.

・So, What Should You Use for Verification?

To validate model adequacy, it is important to combine the following methods:

1. **Residual Analysis**  
   - Check the residual plot for patterns (linearity)  
   - Confirm that residual variance is constant (homoscedasticity)  
   - Verify that residual distribution is approximately normal (normality)  
   - Check for the absence of outliers

2. **Adjusted $R^2$**  
   - $R^2$ adjusted for the number of explanatory variables to avoid **meaningless inflation of $R^2$**  
   - An essential indicator, especially in multiple regression models

3. **Cross Validation**  
   - Split data into training and validation sets to confirm **generalization performance (predictive power) on unseen data**

4. **Consistency with Domain Knowledge**  
   - Evaluate whether the model outputs lead to **reasonable interpretation and actions in practice**  
   - Example: "Doubling test time leads to a tenfold increase in bug count" is practically unrealistic → a sign to revisit the model

・Summary

**$R^2$ is an indicator of "fit," not a guarantee of "correctness" or "reliability."**  
**It is crucial to evaluate models comprehensively using residual analysis, cross validation, adjusted $R^2$, and domain knowledge.**
:::

---

## Verifying Model Validity: Residual Analysis

To confirm that the model is not only a "good fit" but also **statistically sound**, **residual analysis** is indispensable.

Residuals are the differences between the actual observed values and the predicted values from the regression model:

$$
\varepsilon_i = y_i - \hat{y}_i
$$

In an ideal regression model, it is important that these residuals are **randomly scattered** with **no patterns**.

### ● Points to Check in Residual Analysis

- **No trends or patterns in the residual plot** (e.g., curvilinear bias or abnormal distributions)  
- **Normality of residuals** (check with histograms or Q-Q plots for normal distribution)  
- **Homoscedasticity** (uniform scatter of residuals relative to predicted values)  
- **Absence of outliers** (no extremely large residuals)

#### Plotting a Residual Plot in Python (continued)

```python
import seaborn as sns

# Calculate residuals
y_pred = model.predict(x)
residuals = y - y_pred

# Residual plot
plt.scatter(y_pred, residuals)
plt.axhline(y=0, color='red', linestyle='--')
plt.xlabel('予測値')
plt.ylabel('残差')
plt.title('残差プロット')
plt.grid(True)
plt.show()
```

![Residual Plot](https://gyazo.com/abef2c5ccea3bb722ab162a239281833.png)

From the above graph, evaluate the following points:  
| Criterion                                   | Assessment            | Comments                                                                                   |
|---------------------------------------------|-----------------------|--------------------------------------------------------------------------------------------|
| Residual plot trends or patterns            | ○ No issues           | Residuals are randomly distributed against predicted values, with no clear curvilinear bias. |
| Residual normality                          | △ Needs verification | It is insufficient to determine if residuals follow a normal distribution from this plot alone. A Q-Q plot is needed. |
| Homoscedasticity (Homoscedasticity)         | △ Slightly unstable   | Some variation in residual spread against predicted values is observed. Confirmation via tests is recommended. |
| Presence of outliers                        | ○ No issues           | No extreme residuals observed; overall, the model fits well.                                |

From this residual plot, you can infer the following improvement and verification needs:  
- No clear patterns are observed in the residuals, but homoscedasticity and normality need verification.  
- Conduct a Q-Q plot or Breusch-Pagan test to validate model assumptions.  
- Consider polynomial regression or adding features if necessary.

### ● Practical Summary

Even with a high coefficient of determination, **a model with patterned residuals may not be trustworthy**.  
Therefore, it is fundamental to always confirm model validity by pairing "coefficient of determination ($R^2$)" with "residual analysis."

---

## Multiple Regression Analysis: When There Are Multiple Explanatory Variables

In practice, factors influencing quality or defect occurrence are rarely limited to just one.  
For example, in addition to "testing effort," factors such as "developer proficiency," "specification complexity," and "whether a review was conducted" often intertwine.  
Therefore, multiple regression analysis, which handles multiple explanatory variables simultaneously, is necessary.

The general form of a multiple regression model is:

$$
Y = \beta_0 + \beta_1 X_1 + \beta_2 X_2 + \dots + \beta_k X_k + \varepsilon
$$

Points to note here:

- **Multicollinearity**: When explanatory variables are highly correlated with each other, estimates of each coefficient become unstable.  
  Example: If review count and testing effort always increase proportionally, it becomes impossible to distinguish their individual effects.  
- **Adjusted Coefficient of Determination (Adjusted $R^2$)**: When the number of variables increases, the ordinary $R^2$ tends to be overestimated. Using Adjusted $R^2$ allows **more reliable comparison of models' explanatory power**.  
- **Practical Relevance**: Even statistically significant explanatory variables may be impractical to control or improve (e.g., weather during development) and may need to be excluded.

### ● Perspectives for Model Improvement

- Select explanatory variables that are **theoretically causal** to the dependent variable.  
- Quantitatively assess multicollinearity using VIF (Variance Inflation Factor) and consider variable reduction (e.g., stepwise methods) if necessary.  
- Remember to perform residual analysis and cross validation to **avoid overfitting** and **verify generalization performance**.

:::info
● **What Is VIF (Variance Inflation Factor)?**  
The **Variance Inflation Factor (VIF)** is an indicator that quantifies the degree of multicollinearity (correlation among explanatory variables).  
The VIF for a variable $X_i$ is defined as:

$$
\text{VIF}_i = \frac{1}{1 - R_i^2}
$$

where $R_i^2$ is the coefficient of determination when regressing $X_i$ on the other explanatory variables.  
Guidelines for VIF values:

| VIF Value     | Interpretation                                    |
|---------------|----------------------------------------------------|
| 1.0–2.0       | No issues                                          |
| 5 or higher   | Suspected multicollinearity                        |
| 10 or higher  | Strong multicollinearity, leading to model instability |

**Point**: Variables with high VIF are strongly correlated with other explanatory variables and can adversely affect coefficient estimation in multiple regression models.

● **What Is Variable Reduction (e.g., Stepwise Methods)?**  
In multiple regression analysis, having too many explanatory variables can lead to **overfitting and decreased interpretability**.  
Therefore, using **variable selection methods** to choose the minimum necessary explanatory variables is important.

Main variable selection methods:

| Method                  | Overview                                                                 |
|-------------------------|--------------------------------------------------------------------------|
| **Stepwise Method**     | Combines forward selection and backward elimination to explore the optimal model by adding and removing explanatory variables. |
| **Forward Selection**   | Adds explanatory variables one at a time, adopting them only if they improve the model. |
| **Backward Elimination**| Starts with all variables and sequentially removes those with the smallest impact. |

**Point**: Employ model evaluation metrics such as AIC, BIC, and Adjusted $R^2$ for reliable model building.
:::

Multiple regression analysis is a fundamental tool for capturing "complex phenomena involving multiple factors" in practice.  
In quality management settings, it is also valued for simultaneously evaluating the influence of multiple factors such as "production conditions" and "testing methods."

---

## Limitations and Caveats of Regression Analysis (Common Pitfalls in Practice)

Regression analysis is a very useful tool, but when using it, you need to understand some **important limitations and caveats**.

### ● Correlation Is Not Causation

**Having a correlation does not necessarily mean there is a causal relationship.**

- Example: Ice cream sales and heatstroke incidence may be correlated, but it does not imply causation (both are influenced by a common factor: rising temperatures).

⇒ In practice, it is important to adopt a **causal inference perspective** (e.g., interventions or controls).

### ● Extrapolation Is Risky (Be Careful of the Model's Applicable Range)

**Predictions that go beyond the range of observed data (extrapolation) can suffer significant accuracy degradation.**

- Models are based only on regularities within the "observed range."  
- Applying them to unknown regions can produce unreasonable predictions.

⇒ **In practice, you should be aware of the "valid range of the data."**

### ● Data Quality Is Key (Garbage In, Garbage Out)

**If the input data quality and reliability are poor, the model results will naturally be poor.**

- Neglecting preprocessing steps such as handling missing values, outliers, or input errors leads to unreliable analysis.  
- Especially in quality management, pay attention to **measurement errors and variability in data collection conditions**.

⇒ **"Data cleansing" and "EDA (Exploratory Data Analysis)" before analysis are indispensable.**

:::info
● **What Is Data Cleansing?**  
Data used for analysis often contain **collection errors, input mistakes, missing values, and outliers**, making reliable analysis impossible without processing.  
The following **"cleansing steps"** are necessary:

- Check and handle missing values (NaN) (e.g., exclusion or imputation)  
- Detect and handle outliers (e.g., values exceeding 3σ)  
- Standardize data types (e.g., numeric values treated as strings)  
- Verify data duplication and consistency (e.g., duplicate IDs, conflicting values)

**Point**: Cleansing is the first step to prevent "garbage data from skewing results" (to avoid Garbage In, Garbage Out).

● **What Is EDA (Exploratory Data Analysis)?**  
EDA is the process of visually and statistically summarizing data to understand its **structure, distribution, trends, and anomalies** before analysis.  
The objective is to intuitively grasp "what's happening in the data" prior to modeling.

Main methods:

- Visualize distributions with histograms, box plots, and scatter plots  
- Overview relationships between variables with a correlation matrix  
- Check trends by grouping or segmenting data (e.g., by process or person in charge)

**Point**: EDA also helps verify whether modeling assumptions (e.g., linearity, normality) are met.

Carrying out these steps carefully greatly improves the accuracy, reliability, and explanatory power of your analysis.  
Before applying regression analysis or machine learning models, be sure to allocate ample time to **"engage with the data."**
:::

### ● Supplement: Other Considerations

- **Insufficient sample size**: A small dataset can lead to overfitting and statistical instability.  
- **Overlooking nonlinear relationships**: Complex relationships that cannot be expressed by a linear model may exist.  
- **Risk of overreliance on the model**: Even a highly accurate model may not translate into actionable business insights (interpretability and operational feasibility must be evaluated).

---

## Differences Between Correlation and Regression

| Aspect                      | Correlation                            | Regression                                                |
|-----------------------------|----------------------------------------|-----------------------------------------------------------|
| Purpose                     | Examine the strength of relationships  | Use a mathematical model for **prediction** and quantifying **effect size** |
| Output                      | Correlation coefficient ($r$)          | Regression equation (e.g., $Y = aX + b$)                  |
| Direction of Interpretation | Symmetrical (X and Y have equal roles) | Asymmetrical (X is independent variable, Y is dependent variable) |
| Causal Implications         | None                                   | Does not necessarily imply causation but is useful for hypothesis building |
| Examples of Use             | Investigating relationships between quality metrics | Predicting bug counts, estimating effort                  |

### ● What Is Correlation?

- Correlation indicates "how much two variables change together."  
- The correlation coefficient $r$ ranges from −1 to +1, with values closer to the extremes indicating a stronger linear relationship.  
- However, **a strong correlation does not necessarily mean causation**.

### ● What Is Regression?

- Regression analysis is a method for "building a model to predict one variable (dependent variable) from another (independent variable)."  
- Simple regression uses one independent variable; multiple regression uses several to predict the dependent variable.  
- In practice, it is widely used for "quality prediction," "effort estimation," "reliability analysis," and more.

:::info
Even if there is correlation, it does not guarantee causation. When using regression analysis, be careful in **interpreting the meaning** of relationships between variables.  
Example: Even if "testing effort" and "bug count" are correlated, it does not by itself prove causation. Consider the presence of external factors.
:::

---

## Applications in Software Quality (Applications of Regression Analysis)

Regression analysis is also an effective tool in software quality management and project management.  
Below are some representative use cases.

### ● Defect Prediction
- **Overview**: Use metrics such as module lines of code (LOC), number of changes, and complexity as explanatory variables to predict future defect counts.  
- **Purpose**: Identify modules at risk of quality degradation in advance and focus reviews and testing on them to improve quality and reduce costs.

### ● Effort Estimation
- **Overview**: Predict effort for design, implementation, and testing phases based on development size indicators such as screen count, requirement count, and function points.  
- **Purpose**: Use past performance data to achieve more objective and reproducible estimates, supporting **reducing estimation variance** and **advanced process management**.

### ● Risk Analysis
- **Overview**: Extract and predict **defect trends** and **delay risks** from past project records and defect history.  
- **Purpose**: Anticipate future defect occurrences and delay risks in advance, and plan early countermeasures to improve quality.

---

## Conclusion

Regression analysis is a powerful tool for **quantitatively predicting the future** using software quality data.  
However, careless application can lead to misunderstandings, so **verifying statistical assumptions** and **integrating domain knowledge** are indispensable.

- Regression analysis is useful for "predicting numerical values."  
- Simple regression is the most basic model and is commonly used in practice.  
- Use it cautiously, being aware of its differences from correlation and potential causal pitfalls.

---

## Next Issue Preview

In the next issue, No.15, we will introduce **practical applications of statistical quality control** as a summary of this series.  

[I’ve compiled statistical information here.](/analytics/)

I hope you find it useful for your data analysis.

<style>
img {{
    border: 1px gray solid;
}}
</style>
