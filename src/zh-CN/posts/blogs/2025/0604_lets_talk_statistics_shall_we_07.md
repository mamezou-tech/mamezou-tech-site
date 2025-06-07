---
title: 让我们来谈谈统计 - 面向软件质量的统计入门（No.7 Python与Excel中绘制统计图表入门）
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

## 引言

“让我们来谈谈统计”系列第7回，将介绍**实务中可使用的图表绘制方法**。

到目前为止介绍的“代表值”“离散程度”“分布形状”等，只有**通过可视化展示才有价值**。  
本次我们将使用现场常用的**Python（matplotlib/pandas）和 Excel**两种方式，实际绘制以下统计图表。  
对于 Python 程序提供简要说明，对 Excel 则添加了图表创建的简单步骤，欢迎大家实际动手尝试。

- 柱状图（Bar Chart）：适合分类数量比较  
- 折线图（Line Chart）：适合把握时序变化和趋势  
- 散点图（Scatter Plot）：可视化两个数值间的关系  
- 直方图（Histogram）：把握连续数据的分布形状  
- 箱线图（Box Plot）：适合可视化离散程度、偏斜和离群值  
- 帕累托图（Pareto Chart）：用于判断重点对策和优先级划分

---

## 0. 环境

本章将简单配置使用 Python 绘制统计图表所需的环境。  
无需特殊开发环境，假设**在本地 PC 上能运行 Python**。

### ● Python 版本

- Python 3.9 以上（推荐）

### ● 所需库

以下库将被使用。请在命令提示符（或终端）中运行以下命令进行安装。

```bash
pip install matplotlib pandas numpy
```

- **matplotlib**：用于绘制图表的基础库  
- **pandas**：便于操作数据框  
- **numpy**：用于数据生成和统计计算

### ● 字体注意（Windows 环境）

为防止日文乱码，在 matplotlib 设置中指定字体。

```python
import matplotlib.pyplot as plt
plt.rcParams['font.family'] = 'Meiryo'  # Windows 下使用 'Meiryo'，mac 下使用 'AppleGothic'
```

### ● 推荐使用 Jupyter Lab

**Jupyter Lab** 可在浏览器中交互式执行代码，非常适合绘制图表时进行确认。  
可通过以下命令安装：

```bash
pip install jupyterlab
```

启动方法：

```bash
jupyter lab
```

### ● 关于 Excel

本文使用 Microsoft365 的 Excel，关于 Excel 的安装过程在此略过。  

---

## 1. 柱状图（Bar Chart）：适合分类数量比较

柱状图（Bar Chart）在**可视化分类数量差异**时非常有效。  
在软件质量管理中，经常用于“各缺陷类型的发生件数”或“评审指摘数的比较”等场景。  

### ● 数据

假设如下按类别划分的缺陷件数数据。  
| 类别    | 件数 |
|---------|------|
| UI      | 10   |
| 逻辑    | 15   |
| 性能    | 8    |
| 其他    | 5    |

### ● Python 中绘制

以下示例展示了按类别显示缺陷件数的柱状图。

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

![各缺陷类型的件数(Python)](https://gyazo.com/f3e5c6bff6f50f4fcb700905af0558c5.png)

#### 说明（Python）

- 使用 `plt.bar()` 绘制柱状图。  
- `color='salmon'` 设置柱体颜色，`edgecolor='black'` 使边框更清晰。  
- 使用 `tight_layout()` 可防止标签重叠，使图表更易阅读。  
- 为了显示日文，使用了 `plt.rcParams['font.family'] = 'Meiryo'`（适用于 Windows 环境）。

### ● 在 Excel 中绘制

1. 在 A 列输入类别，在 B 列输入缺陷件数。  
2. 选中范围，点击“插入”→“图表”→“簇状柱形图”。  
3. 设置图表标题和轴标签（可选）。

![各缺陷类型的件数(Excel)](https://gyazo.com/fa757ddcad3d6d438f3f79a2996411f1.png)

#### 说明（Excel）

- 在 Excel 中，通过“簇状柱形图”可以轻松可视化各类别的数量。  
- 横轴为“类别”，纵轴为“件数”。  
- 对于类别型（名义尺度）数据，柱状图是最佳选择。

### ● 补充：绘图注意事项

- 柱状图属于**擅长比较数量**的图表。  
- 但对于**时序数据（如：按月变化）应使用折线图**，正确选用图表类型非常重要。

---

## 2. 折线图（Line Chart）：适合把握时序变化和趋势

折线图（Line Chart）适用于**沿时间顺序把握数据变化和趋势**。  
通过在固定间隔记录的时序数据（日、周、月等）上**用线连接各点，可可视化趋势（倾向）**。  
在质量管理中，可广泛用于**进度管理、异常检测、改进效果确认**等场景。  

### ● 数据

假设如下按星期几统计的缺陷件数数据。  
| 星期 | 缺陷件数 |
|------|----------|
| 一   | 5        |
| 二   | 3        |
| 三   | 6        |
| 四   | 4        |
| 五   | 2        |

### ● Python 中绘制

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
![每日缺陷件数(Python)](https://gyazo.com/51c3cacb4c6fd909d7269a607af42393.png)

#### 说明（Python）

- 使用 `plt.plot()` 绘制折线图。  
- 指定 `marker='o'` 后，每个数据点会以圆点显示。  
- `plt.tight_layout()` 可防止图表元素超出边界。

### ● 在 Excel 中绘制

1. 在 A 列输入星期，在 B 列输入缺陷件数。  
2. 选中范围，点击“插入”→“图表”→“折线图”。  
3. 设置图表标题和轴标签（可选）。

![每日缺陷件数(Excel)](https://gyazo.com/d3496270cb602880e04ed174f1585c1a.png)

#### 说明（Excel）

- 只需根据星期和件数两列数据插入折线图即可。  
- Excel 会自动将 X 轴（横轴）识别为分类轴。  
- 添加轴标题或数据标签，可使图表更易理解。

### ● 补充：绘图注意事项

- 横轴使用有序的“星期”，适合用折线连接。  
- 折线图适合展示“流动感”或“趋势”，但对无序分类（如：负责人姓名等）不适用。  
- 数据点过少可能导致线条被过度强调，易误判趋势，需注意。

---

## 3. 散点图（Scatter Plot）：可视化两个数值间的关系

散点图适用于可视化两个数值数据之间的**关系（相关性）**。  
在软件质量中，也可用于发现**评审时间和指摘数的关系**或**测试用例数和缺陷件数**等多种“变量间关联”。  

### ● 数据

假设如下评审所需时间与缺陷指摘数的数据。  
| 评审时间（分） | 指摘数 |
|----------------|--------|
| 10             | 2      |
| 20             | 3      |
| 30             | 4      |
| 40             | 8      |
| 50             | 15     |

### ● Python 中绘制

```python
import matplotlib.pyplot as plt

plt.rcParams['font.family'] = 'Meiryo'

x = [10, 20, 30, 40, 50]  # レビュー時間
y = [2, 3, 4, 8, 15]      # 指摘数

plt.scatter(x, y, color='dodgerblue', edgecolor='black')
plt.title("レビュー時間と指摘数の関係")
plt.xlabel("レビュー時間（分）")
plt.ylabel("指摘数")
plt.grid(True)
plt.tight_layout()
plt.show()
```

![散点图(Python)](https://gyazo.com/dc962c888b73e39f2eb5b7f7ed0d9309.png)

#### 说明（Python）

- `plt.scatter()` 用于绘制散点图。  
- 可通过 `color` 和 `edgecolor` 设置点的颜色和边框。  
- 使用 `grid(True)` 添加辅助网格，可更易识别位置关系。  
- 添加回归直线（※1）等，可确认趋势强度和方向。

:::info
※1：回归直线是指在散点图上所绘制的“最能表示数据趋势的直线”。  
可以通过“y = ax + b”形式，用来判断预测或相关性的强度。  
:::

### ● 在 Excel 中绘制

1. 在 A 列输入“评审时间（分）”，B 列输入“指摘数”。  
2. 选中范围，点击“插入”→“图表”→“散点图（带点）”。  
3. 根据需要添加“拟合曲线（回归直线）”。  

![散点图(Excel)](https://gyazo.com/eccbecc63163c5f50cd3d3bf86aebfee.png)

#### 说明（Excel）

- Excel 的散点图会自动将“A 轴：评审时间”“B 轴：指摘数”进行设置。  
- 右键点击数据点选择“添加趋势线”，即可显示回归直线。  
- 若数据点重叠严重，可调整点的大小或透明度以提高可视性。

### ● 补充：绘图注意事项

- 由于是**查看数值间关系**的图表，不适用于分类数据。  
- 点过多导致重叠时，可使用**透明度（alpha）**或**抖动（jitter）**来提高可读性。  
- 通过识别离群值或添加趋势线，可进行更深层次的分析。

---

## 4. 直方图（Histogram）：把握连续数据的分布形状

直方图（Histogram）适用于**可视化连续数据的分布形状**。  
对于修复缺陷时间或测试执行时间等具有离散性的定量数据，是理解其变化的重要手段。

### ● 数据

假设以下测试执行时间（分钟）的数据（共30条）。  

| 序号 | 执行时间（分） | 序号 | 执行时间（分） |
|------|----------------|------|----------------|
| 1    | 12             | 16   | 33             |
| 2    | 15             | 17   | 34             |
| 3    | 18             | 18   | 35             |
| 4    | 20             | 19   | 36             |
| 5    | 22             | 20   | 38             |
| 6    | 23             | 21   | 39             |
| 7    | 25             | 22   | 40             |
| 8    | 25             | 23   | 42             |
| 9    | 26             | 24   | 43             |
| 10   | 28             | 25   | 45             |
| 11   | 29             | 26   | 47             |
| 12   | 30             | 27   | 49             |
| 13   | 30             | 28   | 50             |
| 14   | 31             | 29   | 52             |
| 15   | 32             | 30   | 55             |

### ● Python 中绘制

```python
import matplotlib.pyplot as plt

plt.rcParams['font.family'] = 'Meiryo'

# 测试执行时间数据（单位：分钟）
test_times = [
    12, 15, 18, 20, 22, 23, 25, 25, 26, 28,
    29, 30, 30, 31, 32, 33, 34, 35, 36, 38,
    39, 40, 42, 43, 45, 47, 49, 50, 52, 55
]

# 绘制直方图
plt.figure(figsize=(8, 5))
plt.hist(test_times, bins=8, edgecolor='black')
plt.title('テスト実行時間の分布（単位：分）')
plt.xlabel('テスト実行時間（分）')
plt.ylabel('件数')
plt.grid(True, linestyle='--', alpha=0.5)
plt.tight_layout()
plt.show()
```

![直方图(Python)](https://gyazo.com/1225b4af6c610764d9facf57c6bcde5c.png)

#### 说明（Python）

- 使用 `plt.hist()` 绘制直方图。  
- `bins=8` 指定分箱数（bin 数）。调整该值可改变图表可读性。  
- `edgecolor='black'` 为柱体添加黑色边框，提高可读性。

### ● 在 Excel 中绘制

1. 准备测试执行时间数据（放在 A 列）。  
2. 选中范围，点击“插入”→“统计图表”→“直方图”。  
3. 根据需要调整分箱数和标签，以提高可读性。

![直方图(Excel)](https://gyazo.com/ae57e028298c302dd44c1a0db910e1f8.png)

#### 说明（Excel）

- 在 Excel 中，直方图会自动计算分箱。  
- 在“轴格式设置”中，可手动调整“分箱宽度”或“分箱数量”。  
- 若存在较多离群值，可考虑使用对数坐标等方式。

### ● 补充：绘图注意事项

- 分箱设置（数量和宽度）会大幅影响图表视觉效果。  
- 不要仅凭外观判断，应考虑数据的统计性质。  
- 若离群值突出，可添加备注，提升友好度。

---

## 5. 箱线图（Box Plot）：最适合可视化离散程度、偏斜和离群值

箱线图（Box Plot）是**可在一张图中可视化数据分布范围、偏斜及离群值**的强大图表。  
基于四分位数，可同时查看**中位数、四分位距（IQR）、最大值、最小值及离群值**等信息。

### ● 数据

假设如下评审所需时间（分钟）数据。

| 序号 | 所需时间（分） |
|------|----------------|
| 1    | 19             |
| 2    | 20             |
| 3    | 21             |
| 4    | 21             |
| 5    | 22             |
| 6    | 23             |
| 7    | 24             |
| 8    | 25             |
| 9    | 26             |
| 10   | 27             |
| 11   | 55             |

### ● Python 中绘制

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

![箱线图(Python)](https://gyazo.com/b176302d8cd8c6416f2e68bbd752bae8.png)

#### 说明（Python）

- `plt.boxplot()` 用于绘制箱线图。  
- `patch_artist=True` 可为箱体填充颜色。  
- 指定 `vert=False` 可生成横向箱线图。  
- 离群值（55）会自动以点的形式显示在须之外。

### ● 在 Excel 中绘制

1. 在 A 列输入数据。  
2. 选中范围，点击“插入”→“统计图表”→“箱线图”。  
3. 调整标题及轴标签。

![箱线图(Excel)](https://gyazo.com/bcec5792b89f48cdb7a94567997dddcc.png)

#### 说明（Excel）

- 在 Excel 中，可直接插入统计图表类型的箱线图。  
- 存在离群值时，会自动以圆点显示。  
- 同时可视化查看四分位距（IQR）和中位数。

### ● 补充：绘图注意事项

- 若离群值极端，图表刻度可能失真，需要注意。  
- 若并排展示多个分组，应统一刻度。  
- 当数据量较少时，箱体可能过小，建议添加说明以提升可读性。

---

## 6. 帕累托图（Pareto Chart）：用于判断重点对策和优先级划分

帕累托图是一种**将柱状图和折线图结合**的图表，可同时可视化各因素的件数和其累积比例。  
常用于判断“关键少数 vs. 琐碎多数（80:20 法则）”，**适合对资源进行集中分配和确定改进优先级**。

### ● 数据

假设如下按缺陷类型统计的件数数据。

| 缺陷类型   | 件数 |
|------------|------|
| 逻辑       | 18   |
| UI        | 12   |
| 性能       | 9    |
| 测试遗漏   | 6    |
| 其他       | 5    |

### ● Python 中绘制

```python
import matplotlib.pyplot as plt
import numpy as np

plt.rcParams['font.family'] = 'Meiryo'

labels = ["ロジック", "UI", "性能", "テスト漏れ", "その他"]
values = [18, 12, 9, 6, 5]

# 计算累积比例
cum_values = np.cumsum(values)
total = sum(values)
cum_percentage = cum_values / total * 100

fig, ax1 = plt.subplots()

# 柱状图（件数）
ax1.bar(labels, values, color='skyblue', edgecolor='black')
ax1.set_ylabel('件数', color='black')
ax1.tick_params(axis='y', labelcolor='black')

# 折线图（累积比例）
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

![帕累托图(Python)](https://gyazo.com/41e72d56b11b753f13368f531d744bfe.png)

#### 说明（Python）

- 使用 `bar()` 绘制各类别的件数，并用 `plot()` 以折线方式显示累积比例。  
- 通过 `twinx()` 可为柱状图和折线图使用不同的 Y 轴。  
- 使用 `np.cumsum()` 计算累积值和累积比例。

### ● 在 Excel 中绘制

1. 在 A 列输入缺陷类型，在 B 列输入缺陷件数。  
2. 按件数降序排序。  
3. 添加累积比例列，使用“累积值 ÷ 合计”计算。  
4. 将柱状图和折线图作为组合图表绘制。

![帕累托图(Excel)](https://gyazo.com/fff99badb7ec3f7cdb8d2d755910a7f5.png)

#### 说明（Excel）

- 由于柱图和折线图使用不同轴，**别忘了设置轴标签**。  
- 项目必须按“件数多到少”排序，否则无法体现帕累托图的意义。  
- 在 Excel 中，可通过选择“组合图表”实现柱状图与折线图的组合。

### ● 补充：绘图注意事项

- **必须按降序排列分类**。  
- **累积比例务必显示在第 2 轴上**。  
- 不在前 20% 的项目仍可能很重要，需注意。

---

## 实务应用提示

- 图表中**请勿忘记添加标题、轴标签和图例**  
- 若存在离群值或趋势，添加注释更有效  
- 在内部资料中，配上“图表说明”会更友好

---

## 总结

- 通过 Python 或 Excel，任何人都能绘制统计图表  
- 有意义的图表能同时辅助分析与说明  
- 掌握基本用法，选择符合目的的图表类型

---

## 下回预告

下回将介绍“概率的直觉与计算：了解‘偶然’的本质”。  
[在这里整理了统计相关信息。](/analytics/)  
希望能为您的数据分析提供帮助。

<style>
img {
    border: 1px gray solid;
}
</style>
