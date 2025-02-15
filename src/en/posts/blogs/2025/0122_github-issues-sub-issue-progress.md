---
title: You can track progress with Sub-issues in GitHub Issues
author: masahiro-kondo
date: 2025-01-22T00:00:00.000Z
tags:
  - プロジェクト管理
  - GitHub
image: true
translate: true

---

## Introduction

Last autumn, I wrote an article about trying out the Sub-issues feature of GitHub Issues when it became available in private preview.

- [Now you can create Sub-issues in GitHub Issues (Beta)](/blogs/2024/10/05/github-issues-with-sub-issues-beta/)

At the beginning of this year, this feature has entered public preview, and all users can now try it.

@[og](https://github.blog/changelog/2025-01-13-evolving-github-issues-public-preview/)

## Visualization of Parent-Child Relationships and Progress in Projects
In the article during the private preview, I introduced a method for visualizing parent-child relationships of issues using grouping.

By specifying `Parent issue` in `Group By` in the Table view or Roadmap view, you can express the hierarchy. At this time, a progress bar based on the status of sub-issues is also displayed.

![Group by parent issue](https://i.gyazo.com/9479ff561b49190ad7fcdf9bd9f760a5.png)

## Visualizing Progress Using the Progress Field
Now, even without specifying groups, you can visualize progress by using a dedicated progress field[^1].

[^1]: It might have been possible even during the private preview, but I didn't notice.

The usage is described in the official documentation.

[About the progress fields of parent issues and sub-issues – GitHub Docs](https://docs.github.com/ja/issues/planning-and-tracking-with-projects/understanding-fields/about-parent-issue-and-sub-issue-progress-fields)

I tried setting it up using the repository and project used in the previous article. The issues from the previous article have already been closed, so I added new Issues and Sub-issues.

![Issue and sub-issues](https://i.gyazo.com/c9df8229161077e419feb93e3d411357.png)

In the settings of the parent issue, select the project to add.

![Select project](https://i.gyazo.com/b20677075835686639245b6b32f53de5.png)

:::info
As I wrote in the previous article, sub-issues are automatically added by the project's workflow, so you don't need to add them individually.
:::

The issues and sub-issues have been added to the project.

![Issues added](https://i.gyazo.com/3d79da2aa285ad746a7688dead3761d7.png)

Now, let's display the progress field.

From the menu that appears when you click the `+` button, select `Sub-issues progress` under `Hidden fields`.

![Set Sub-issues progress](https://i.gyazo.com/7b41cbf381a1bd7d6d58702c2286f55c.png)

A column that displays the progress bar for the parent issue will be added.

![Show Sub-issues progress](https://i.gyazo.com/a07ba5d868dfccc76a470ffcbe8bf4f6.png)

Looks good. Let's hide the sub-issues using a filter and display only the parent issues. Just specify `no:parent-issue` in the filter.

![set filter](https://i.gyazo.com/fc0ec0b835e5e7be1a3f19f4b3df9bab.png)

Now it's clean with only the parent issues and progress bars.

![parent issue only view](https://i.gyazo.com/6aa5396a24c132e10f8c042a40e3c297.png)

If you click `Save` in this state, you can display this view at any time.

## Conclusion
GitHub Issues is steadily making progress.
Previously, there was a method to visualize progress using task lists within an issue, but by using Sub-issues and the progress field, you can see progress at the issue granularity, which I think could be useful in many situations. Why not try utilizing it in your project management?
