---
title: 【For Newcomers】Recommended Settings and Usage of A5:SQL Mk-2
author: kenta-ishihara
date: 2024-06-08T00:00:00.000Z
tags:
  - 新人向け
  - tips
image: true　
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/blogs/2024/06/08/a5m2_settings/).
:::



# Introduction

Recently, I thought that combining pickles and boiled eggs might make something as delicious as tartar sauce, so I tried it with kimchi and wasabi-flavored nozawana pickles. (It's not bad, but I don't recommend it) - Ishihara.

In this article, I will describe the recommended settings and usage of the DB development tool [A5:SQL Mk-2](https://a5m2.mmatsubara.com/)[^1] (hereafter referred to as A5M2), which is frequently used in various projects, aimed at newcomers.

## Workspace Settings
Have you ever had the mishap of thinking you were operating in the development environment but were actually in a different environment? To prevent such unforeseen situations, it is recommended to first set up a workspace.

A workspace is a collection of DB registration information and information about open files. The image is like having a workbench for each environment, allowing you to perform DB operations separately.

Let's set it up.
1. Launch A5M2 and press the add button at the bottom left of the screen when the following dialog is displayed.
![Workspace Setup Step 1](/img/blogs/2024/0509_a5m2_settings/workspace_1.png)
   (If the above is not displayed, go to Settings > Launch and Manage Workspace from the toolbar)

2. Name it so that you can recognize the environment you are connecting to, and press the OK button.
![Workspace Setup Step 2](/img/blogs/2024/0509_a5m2_settings/workspace_2.png)

3. Set it up for each environment you connect to.
![Workspace Setup Step 3](/img/blogs/2024/0509_a5m2_settings/workspace_3.png)

## Important Database Settings
Even if you separate workspaces, there is still a risk of mishandling. Let's set up the database for the production environment.

1. Right-click on the left edge of the screen > Add and Remove Database
![Production Setup Step 1](/img/blogs/2024/0509_a5m2_settings/productio_setting_1.png)

2. Select the relevant DB and press the modify button.
![Production Setup Step 2](/img/blogs/2024/0509_a5m2_settings/productio_setting_2.png)

3. Check the DB type: Production environment, select a noticeable color (red is recommended), and press the OK button.
![Production Setup Step 3](/img/blogs/2024/0509_a5m2_settings/productio_setting_3.png)

By setting this up, you will not be able to connect unless you check "Connect to the production environment (or a database that requires caution)" when connecting. Be prepared when connecting to the production environment.
![Production Setup Step 4](/img/blogs/2024/0509_a5m2_settings/productio_setting_4.png)

## Transaction Settings
Have you ever accidentally operated on other records when updating/deleting? A5M2 has a setting to automatically start a transaction during CRUD operations, which I will introduce.

1. Press Settings > Options from the toolbar.
![Transaction Setup Step 1](/img/blogs/2024/0509_a5m2_settings/transaction_1.png)

2. Check "Automatically start a transaction when updating the database" under Database Connection and press the OK button.
![Transaction Setup Step 2](/img/blogs/2024/0509_a5m2_settings/transaction_2.png)

After the above setting, the icon at the top left will blink during DB updates, and you can select commit or rollback by pressing it.
![Transaction Setup Step 3](/img/blogs/2024/0509_a5m2_settings/transaction_3.png)

## Result Set Comparison
When you want to check if the implemented functionality is updating the data as expected, result set comparison is effective.
1. Create and execute a query targeting the data you want to check.
   ![Result Set Comparison 1](/img/blogs/2024/0509_a5m2_settings/result_set_comparison_1.png)
2. Press the following icon.
   ![Result Set Comparison 2](/img/blogs/2024/0509_a5m2_settings/result_set_comparison_2.png)
3. A dialog will be displayed, execute the process you want to check and update the data. Then press the execute (compare) button.
   ![Result Set Comparison 3](/img/blogs/2024/0509_a5m2_settings/result_set_comparison_3.png)
4. The result set comparison dialog will be displayed, and pressing the export to Excel button will show the differences in Excel.
   ![Result Set Comparison 4](/img/blogs/2024/0509_a5m2_settings/result_set_comparison_4.png)
   ![Result Set Comparison 5](/img/blogs/2024/0509_a5m2_settings/result_set_comparison_5.png)

It is also useful as evidence for unit tests, and if unified within the team, it will reduce discrepancies in evidence notation among responsible persons.

## Conclusion
When I checked the release notes of A5M2 out of curiosity, I was surprised to find that the beta version was released in July 1997, and updates are still being made to this day[^2]. I realized once again that the tools we use casually are available because someone created and maintains them, and I hope to use them with gratitude.

[^1]: SQL development tool. I call it "A5M2", but there seem to be various pronunciations. Many people must have thought (english?) when their surroundings called it "A5, A5" during their newcomer days.
[^2]: Even counting from now (June 2024), it's been 27 years. I think there are newcomers reading this thinking (I wasn't even born yet).
