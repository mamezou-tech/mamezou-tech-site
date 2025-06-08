---
title: >-
  Let's Talk About Statistics - Introduction to Statistics for Software Quality
  (No.7: Introduction to Statistical Graphs with Python and Excel)
author: shuichi-takatsu
date: 2025-06-04T00:00:00.000Z
tags:
  - Analytics
  - ソフトウェア
  - 品質
  - 新人向け
image: true
translate: true
---

## Introduction

In the seventh installment of "Let's Talk About Statistics," we introduce **how to create practical graphs for real-world use**.

Concepts introduced so far—such as “measures of central tendency,” “variability,” and “distribution shape”—are **most valuable when presented visually**.  
This time, we'll actually draw the following statistical graphs—commonly used in the field—using both **Python (matplotlib/pandas)** and **Excel**.  
For the Python examples, we've added brief explanations; for Excel, we've outlined simple steps for creating each chart. Please try them out yourself!

- Bar Chart: Ideal for comparing quantities across categories  
- Line Chart: Effective for capturing time-series changes and trends  
- Scatter Plot: Visualize the relationship between two numerical variables  
- Histogram: Understand the distribution shape of continuous data  
- Box Plot: Perfect for visualizing variability, skew, and outliers  
- Pareto Chart: Useful for determining priority areas and setting priorities

---

## 0. Environment

In this section, we'll set up the environment needed to plot statistical graphs with Python.  
No special development environment is required; it's assumed that **Python is running on your local PC**.

### Python Version

- Python 3.9 or above (recommended)

### Required Libraries

The following libraries are used. Install them by running:

```bash
pip install matplotlib pandas numpy
```

- **matplotlib**: Fundamental library for plotting graphs  
- **pandas**: Convenient for DataFrame operations  
- **numpy**: Used for data generation and statistical calculations

### Font Notes (Windows Environment)

To prevent garbled Japanese text, specify the font in matplotlib settings:

```python
import matplotlib.pyplot as plt
plt.rcParams['font.family'] = 'Meiryo'  # Use 'Meiryo' for Windows, 'AppleGothic' for macOS
```

### Jupyter Lab Is Also Recommended

**Jupyter Lab** allows you to run code interactively in your browser, making it ideal for checking graphs as you go.  
Install with:

```bash
pip install jupyterlab
```

Start with:

```bash
jupyter lab
```

### About Excel

We'll use Microsoft 365's Excel.  
Installation details for Excel are omitted.

---

## 1. Bar Chart: Ideal for Comparing Quantities Across Categories

Bar charts are extremely effective for visually grasping the **differences in quantities across categories**.  
In software quality management, they shine for use cases such as “number of occurrences by bug type” or “comparison of review issue counts.”

### Data

Assume the following bug count data by category:

| Category     | Count |
|--------------|-------|
| UI           | 10    |
| Logic        | 15    |
| Performance  | 8     |
| Other        | 5     |

### Python Example

```python
import matplotlib.pyplot as plt

plt.rcParams['font.family'] = 'Meiryo'

categories = ["UI", "ロジック", "性能", "その他"]
counts = [10, 15, 8, 5]

plt.bar(categories, counts, color='salmon', edgecolor='black')
plt.title("バグ種別の件数")
plt.xlabel("カテゴリ")
plt.ylabel("件数")
plt.tight_layout()
plt.show()
```

![バグ種別の件数(Python)](https://gyazo.com/f3e5c6bff6f50f4fcb700905af0558c5.png)

#### Explanation (Python)

- `plt.bar()` draws the bar chart.  
- `color='salmon'` sets the bar color, and `edgecolor='black'` clarifies the edges.  
- Using `tight_layout()` prevents label overlap and makes the chart more readable.  
- We use `plt.rcParams['font.family'] = 'Meiryo'` to display Japanese text (for Windows environments).

### Excel Example

1. Enter categories in column A and bug counts in column B.  
2. Select the range, then choose Insert → Chart → Column Chart.  
3. (Optional) Set the chart title and axis labels.

![バグ種別の件数(Excel)](https://gyazo.com/fa757ddcad3d6d438f3f79a2996411f1.png)

#### Explanation (Excel)

- In Excel, you can easily visualize quantities by category using a Column Chart.  
- The horizontal axis displays “Category,” and the vertical axis displays “Count.”  
- Bar charts are ideal when the data is categorical (nominal scale).

### Note: Tips for Creating Charts

- Bar charts are **excellent for comparing values**.  
- However, for **time-series data (e.g., monthly changes), a line chart** is the standard choice. Choosing appropriately is important.

---

## 2. Line Chart: Effective for Capturing Time-Series Changes and Trends

Line charts are suitable for **grasping changes and trends over time**.  
By connecting data points recorded at regular intervals (daily, weekly, monthly, etc.) with lines, you can visualize trends.  
In quality management, they are widely used for **progress tracking, anomaly detection, and verifying improvement effects**.

### Data

Assume the following daily bug count data:

| Day       | Bug Count |
|-----------|-----------|
| Monday    | 5         |
| Tuesday   | 3         |
| Wednesday | 6         |
| Thursday  | 4         |
| Friday    | 2         |

### Python Example

```python
import matplotlib.pyplot as plt

plt.rcParams['font.family'] = 'Meiryo'

days = ["月", "火", "水", "木", "金"]
bugs = [5, 3, 6, 4, 2]
plt.plot(days, bugs, marker='o')
plt.title("日別バグ件数")
plt.xlabel("曜日")
plt.ylabel("件数")
plt.tight_layout()
plt.show()
```

![日別バグ件数(Python)](https://gyazo.com/51c3cacb4c6fd909d7269a607af42393.png)

#### Explanation (Python)

- `plt.plot()` is used to draw the line chart.  
- Specifying `marker='o'` displays each data point as a circle.  
- `plt.tight_layout()` ensures that chart elements do not get cut off.

### Excel Example

1. Enter days in column A and bug counts in column B.  
2. Select the range, then choose Insert → Chart → Line Chart.  
3. (Optional) Set the chart title and axis labels.

![日別バグ件数(Excel)](https://gyazo.com/d3496270cb602880e04ed174f1585c1a.png)

#### Explanation (Excel)

- With just two columns of data (day and count), inserting a line chart is simple.  
- Excel automatically interprets the X-axis as a categorical axis.  
- Adding axis titles or data labels can make the chart even clearer.

### Note: Tips for Creating Charts

- The horizontal axis uses the ordered “days of the week,” making lines appropriate.  
- Line charts are great for showing “flow” or “trends,” but are not suitable when categories have no inherent order (e.g., names of team members).  
- If there are too few data points, the line may be overemphasized, leading to misinterpretation of trends.

---

## 3. Scatter Plot: Visualize Relationships Between Two Numerical Variables

Scatter plots are ideal for visualizing the **relationship (correlation)** between two numerical variables.  
In software quality, they can help uncover links such as **review time vs. number of issues** or **number of test cases vs. bug count**.

### Data

Assume the following review time vs. issue count data:

| Review Time (min) | Number of Issues |
|-------------------|------------------|
| 10                | 2                |
| 20                | 3                |
| 30                | 4                |
| 40                | 8                |
| 50                | 15               |

### Python Example

```python
import matplotlib.pyplot as plt

plt.rcParams['font.family'] = 'Meiryo'

x = [10, 20, 30, 40, 50]  # Review time
y = [2, 3, 4, 8, 15]      # Number of issues

plt.scatter(x, y, color='dodgerblue', edgecolor='black')
plt.title("レビュー時間と指摘数の関係")
plt.xlabel("レビュー時間（分）")
plt.ylabel("指摘数")
plt.grid(True)
plt.tight_layout()
plt.show()
```

![散布図(Python)](https://gyazo.com/dc962c888b73e39f2eb5b7f7ed0d9309.png)

#### Explanation (Python)

- `plt.scatter()` plots the scatter points.  
- You can customize point color and edgecolor.  
- Enabling `grid(True)` adds grid lines, which make the relationships easier to read.  
- Adding a regression line (Note 1) lets you assess the strength and direction of the trend.

:::info
Note 1: A regression line is the straight line on a scatter plot that best represents the trend of the data.  
It takes the form "y = ax + b" and is used for forecasting and evaluating the strength of correlation.  
:::

### Excel Example

1. Enter “Review Time (min)” in column A and “Number of Issues” in column B.  
2. Select the range, then choose Insert → Chart → Scatter (points).  
3. Add a trendline (regression line) if needed.

![散布図(Excel)](https://gyazo.com/eccbecc63163c5f50cd3d3bf86aebfee.png)

#### Explanation (Excel)

- Excel’s scatter plot automatically sets “Review Time” on the X-axis and “Number of Issues” on the Y-axis.  
- Right-click the data points and choose “Add Trendline” to display a regression line.  
- If points overlap, adjusting point size or transparency can improve visibility.

### Note: Tips for Creating Charts

- Scatter plots are **for numerical relationships**, so they’re unsuitable for categorical data.  
- If points overlap too much, use **alpha (transparency)** or **jitter (small random offsets)** to improve clarity.  
- Highlighting outliers or adding a trendline can deepen your analysis.

---

## 4. Histogram: Understand the Distribution of Continuous Data

Histograms are suitable for visually grasping the **distribution shape of continuous data**.  
They are essential for understanding variability in quantitative data such as bug fix times or test execution durations.

### Data

Assume the following test execution times (minutes) for 30 runs:

| No. | Execution Time (min) | No. | Execution Time (min) |
|-----|----------------------|-----|----------------------|
| 1   | 12                   | 16  | 33                   |
| 2   | 15                   | 17  | 34                   |
| 3   | 18                   | 18  | 35                   |
| 4   | 20                   | 19  | 36                   |
| 5   | 22                   | 20  | 38                   |
| 6   | 23                   | 21  | 39                   |
| 7   | 25                   | 22  | 40                   |
| 8   | 25                   | 23  | 42                   |
| 9   | 26                   | 24  | 43                   |
| 10  | 28                   | 25  | 45                   |
| 11  | 29                   | 26  | 47                   |
| 12  | 30                   | 27  | 49                   |
| 13  | 30                   | 28  | 50                   |
| 14  | 31                   | 29  | 52                   |
| 15  | 32                   | 30  | 55                   |

### Python Example

```python
import matplotlib.pyplot as plt

plt.rcParams['font.family'] = 'Meiryo'

# Test execution time data (unit: minutes)
test_times = [
    12, 15, 18, 20, 22, 23, 25, 25, 26, 28,
    29, 30, 30, 31, 32, 33, 34, 35, 36, 38,
    39, 40, 42, 43, 45, 47, 49, 50, 52, 55
]

# Draw the histogram
plt.figure(figsize=(8, 5))
plt.hist(test_times, bins=8, edgecolor='black')
plt.title('テスト実行時間の分布（単位：分）')
plt.xlabel('テスト実行時間（分）')
plt.ylabel('件数')
plt.grid(True, linestyle='--', alpha=0.5)
plt.tight_layout()
plt.show()
```

![ヒストグラム(Python)](https://gyazo.com/1225b4af6c610764d9facf57c6bcde5c.png)

#### Explanation (Python)

- `plt.hist()` is used to draw the histogram.  
- `bins=8` specifies the number of bins; adjusting this value changes the readability.  
- `edgecolor='black'` clarifies the bar edges and improves readability.

### Excel Example

1. Prepare the execution time data in column A.  
2. Select the range, then choose Insert → Statistical Chart → Histogram.  
3. Adjust the number of bins and labels to improve readability.

![ヒストグラム(Excel)](https://gyazo.com/ae57e028298c302dd44c1a0db910e1f8.png)

#### Explanation (Excel)

- Excel automatically calculates bins for histograms.  
- In [Axis Options], you can manually adjust [Bin width] or [Number of bins].  
- If there are many outliers, consider techniques such as using a log scale.

### Note: Tips for Creating Charts

- Bin settings (number and width) greatly affect the chart’s appearance.  
- Avoid judging solely by looks; be mindful of the underlying statistical properties.  
- If outliers stand out, adding annotations can be more considerate.

---

## 5. Box Plot: Ideal for Visualizing Variability, Skew, and Outliers

Box plots are a powerful way to **visualize data spread, skewness, and outliers at a glance**.  
Based on quartiles, they simultaneously show the **median, interquartile range (IQR), minimum, maximum, and outliers**.

### Data

Assume the following review time data (minutes):

| No. | Review Time (min) |
|-----|-------------------|
| 1   | 19                |
| 2   | 20                |
| 3   | 21                |
| 4   | 21                |
| 5   | 22                |
| 6   | 23                |
| 7   | 24                |
| 8   | 25                |
| 9   | 26                |
| 10  | 27                |
| 11  | 55                |

### Python Example

```python
import matplotlib.pyplot as plt

plt.rcParams['font.family'] = 'Meiryo'

data = [19, 20, 21, 21, 22, 23, 24, 25, 26, 27, 55]
plt.boxplot(data, vert=False, patch_artist=True)
plt.title("レビュー時間のばらつき")
plt.xlabel("時間（分）")
plt.tight_layout()
plt.show()
```

![箱ひげ図(Python)](https://gyazo.com/b176302d8cd8c6416f2e68bbd752bae8.png)

#### Explanation (Python)

- `plt.boxplot()` is the function for drawing a box plot.  
- Setting `patch_artist=True` allows the box to be filled with color.  
- Specifying `vert=False` makes the box plot horizontal.  
- Outliers (e.g., 55) are automatically shown as points outside the whiskers.

### Excel Example

1. Enter the data in column A.  
2. Select the range, then choose Insert → Statistical Chart → Box Plot.  
3. Adjust the title and axes as needed.

![箱ひげ図(Excel)](https://gyazo.com/bcec5792b89f48cdb7a94567997dddcc.png)

#### Explanation (Excel)

- In Excel, you can easily insert a box plot as a statistical chart.  
- If there are outliers, they are automatically displayed as circles.  
- The interquartile range (IQR) and median can also be visually confirmed.

### Note: Tips for Creating Charts

- When outliers are extreme, the scale can be distorted, so caution is needed.  
- When comparing multiple groups side by side, their scales must be unified.  
- For small datasets, the box may appear very small, so adding additional explanations can be helpful.

---

## 6. Pareto Chart: Useful for Identifying Priorities and Determining Focal Countermeasures

Pareto charts combine a bar chart and a line chart to visualize counts by factor alongside their cumulative percentage.  
They help you apply the “vital few vs. trivial many (80:20 rule)” concept and are ideal for **allocating resources and prioritizing improvements**.

### Data

Assume the following bug type count data:

| Bug Type       | Count |
|----------------|-------|
| Logic          | 18    |
| UI             | 12    |
| Performance    | 9     |
| Test Omissions | 6     |
| Other          | 5     |

### Python Example

```python
import matplotlib.pyplot as plt
import numpy as np

plt.rcParams['font.family'] = 'Meiryo'

labels = ["ロジック", "UI", "性能", "テスト漏れ", "その他"]
values = [18, 12, 9, 6, 5]

# Calculate cumulative percentage
cum_values = np.cumsum(values)
total = sum(values)
cum_percentage = cum_values / total * 100

fig, ax1 = plt.subplots()

# Bar chart (counts)
ax1.bar(labels, values, color='skyblue', edgecolor='black')
ax1.set_ylabel('件数', color='black')
ax1.tick_params(axis='y', labelcolor='black')

# Line chart (cumulative percentage)
ax2 = ax1.twinx()
ax2.plot(labels, cum_percentage, color='red', marker='o')
ax2.set_ylabel('累積比率（％）', color='red')
ax2.tick_params(axis='y', labelcolor='red')
ax2.set_ylim(0, 100)

plt.title('バグ種別ごとの件数と累積比率（パレート図）')
plt.grid(True, axis='y', linestyle='--', alpha=0.5)
plt.tight_layout()
plt.show()
```

![パレート図(Python)](https://gyazo.com/41e72d56b11b753f13368f531d744bfe.png)

#### Explanation (Python)

- `bar()` draws counts by category, and `plot()` overlays the cumulative percentage as a line.  
- `twinx()` allows sharing different Y-axes for the bar and line charts.  
- `np.cumsum()` computes cumulative sums and percentages.

### Excel Example

1. Enter bug types in column A and counts in column B.  
2. Sort the data in descending order of count.  
3. Add a cumulative percentage column (cumulative sum ÷ total).  
4. Insert a combo chart combining a column chart and a line chart.

![パレート図(Excel)](https://gyazo.com/fff99badb7ec3f7cdb8d2d755910a7f5.png)

#### Explanation (Excel)

- Since the bar and line use different axes, **be sure to set axis labels**.  
- The items must be sorted in descending order of count for a meaningful Pareto chart.  
- In Excel, selecting “Combo Chart” lets you combine a bar chart and a line chart.

### Note: Tips for Creating Charts

- It is essential to sort categories in descending order.  
- Always display the `cumulative percentage` on the secondary axis.  
- Items not in the top 20% may still be important, so exercise caution.

---

## Practical Tips for the Workplace

- Always include a **title, axis labels, and legend** on your charts.  
- Adding annotations can be effective when there are outliers or noticeable trends.  
- For internal documents, it’s helpful to provide explanatory text alongside the chart.

---

## Summary

- With Python or Excel, anyone can create statistical charts.  
- Meaningful charts support both analysis and communication.  
- Master the basics and choose the format that fits your purpose.

---

## Next Time

Next time: “Intuition and Calculation of Probability: Understanding the Nature of ‘Chance’.”  
We’ll explain the basics of probability—deeply related to statistics—in an intuitive and practical way.

[I've compiled statistical resources here.](/analytics/)  
I hope you find them useful for your data analysis.

<style>
img {
    border: 1px gray solid;
}
</style>
