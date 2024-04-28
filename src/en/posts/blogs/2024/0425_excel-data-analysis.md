---
title: Easily Analyzing Open Data with Excel
author: shinichiro-iwaki
date: 2024-04-25T00:00:00.000Z
tags:
  - 新人向け
  - 小技
image: true
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/blogs/2024/04/25/excel-data-analysis/).
:::



Until recently, I couldn't let go of my cold-weather gear, but it has warmed up considerably. When you go outside, you see people in shiny new backpacks and crisp suits, looking dazzling as they seem excited about their new lives. Although I am now known for my "What's that?" attitude, I fondly remember my days as a new employee years ago, scrambling through training that included business manners and document creation, among other business skills.

Now, let's talk about a tool that often appears in training for newcomers: the beloved spreadsheet tool, Excel. It is almost always installed on business-use Windows PCs, and users often end up using it as a project management tool or for drawing/modeling due to their fondness for it. However, the real appeal of this tool lies in its flexible features that support processing and analyzing tabular data.

So, while reminiscing about the beginnings of my professional life, let's implement a relatively easy-to-use data analysis tool using Excel's features. The data to be analyzed can be anything, but since this is a 'developer' site, let's use data that can be obtained from the Web.

## Acquiring Data for Analysis
First, we input the data to be analyzed into Excel. Excel includes a feature called PowerQuery, which allows you to define data input processes with low code. In my environment (Office365 V2403), operations from the 'Data' menu are possible. When you select 'Get Data' from the ribbon menu, you can see that it is possible to set various data sources such as files, databases, and APIs.

The Git hosting service I often use, Gitlab, publishes APIs in formats like REST, allowing you to retrieve various information. For example, sending a request to `/projects` will get you a list of project data in json format.

Most APIs require authentication for access, so as a preliminary step, sign in to Gitlab and issue an access token that allows read-api (or higher) operations, and keep a record of it.

In PowerQuery, selecting 'Other Data Sources' -> 'Web' launches a dialog where you can enter a URL. If the API does not require authentication, entering the URL is sufficient, but here, as an example, I will retrieve a list of projects created under my account (`/users/:userID:/projects`). In the detailed settings of the dialog, you can set additional header information to send to the access destination, such as setting the PRIVATE-TOKEN header to send your Gitlab access token according to Gitlab's API specifications.

Once you set the necessary information and click 'OK', the PowerQuery editor screen switches, and the data retrieved from the API is displayed in tabular form. Gitlab returns the data in json format, so the table consists of rows labeled 'Record', each containing json data of a project. If you click on any one Record, you can view the contents of the selected Record.

After converting the data to a table format, you can expand each row's values into columns. By clicking the icon at the top right of the table, you can select the rows (data item names) you want to expand, and the contents of the Record are expanded into columns.

You can also perform data filtering, sorting, and transformation operations on the PowerQuery editor screen. For example, the 'creation date' data retrieved from Gitlab, such as `2023-06-22T12:13:43.053Z`, is a string representing standard time, which can be converted into date and time data for easier analysis.

## Analyzing Data with Pivot Tables
Although you can analyze the tabular data directly, Excel has a feature called pivot tables that supports analysis. In this example, the data volume is small, so you could just look at it directly, but when the data volume increases, it can be painful to analyze a vast table. In such cases, you can easily perform data aggregation through UI operations.

You can perform pivot table analysis on the data in Excel, but let's display the retrieved data directly in a pivot table. By right-clicking on the query you created, you can change the data load destination.

When you set the load destination to a pivot table, the pivot table settings menu for the retrieved data is displayed. The pivot table creates a table by aggregating the selected item values (total, average, etc.) or counts by the units of items selected for the vertical axis (rows) and horizontal axis (columns). You can also set filters to narrow down the range of input data to include in the table. For example, dragging the `Column1.id` data to the 'Values' field and the `Column1.created_at` data to the 'Rows' field creates a table aggregating the Gitlab project data IDs by creation date.

## Summary
We introduced a simple method of data analysis using Excel's features, using data obtainable from Gitlab's API as a subject. The tables and graphs created in this simple example could easily be made manually, but they are very useful in cases where the data volume is large or updates frequently. There are many useful tools for data analysis, and if you are conducting serious analysis, coding the process might be more efficient. However, for simple data analysis or making data easy to understand, Excel alone can achieve this, making it conveniently usable in everyday situations. Although I intended to give a brief introduction, it turned out to be a rather long article. I will introduce in more detail how to use PowerQuery's features and code data analysis (if there is a response).
