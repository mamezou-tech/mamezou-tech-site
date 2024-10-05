---
title: You Can Now Create Sub-issues in GitHub Issues (Beta)
author: masahiro-kondo
date: 2024-10-05T00:00:00.000Z
tags:
  - GitHub
image: true
translate: true

---

## Introduction
The Sub-issues feature has been added to GitHub Issues. It is currently in the public preview stage.

[Evolving GitHub Issues (Public Preview) · GitHub Changelog](https://github.blog/changelog/2024-10-01-evolving-github-issues-public-preview/)

I immediately joined the waitlist.

![waitlist](https://i.gyazo.com/7e612debe006706b1033ddcd83fcaff2.png)

Soon after, I received a notification email that the beta version, including Sub-issues, was enabled.

![Welcome](https://i.gyazo.com/a4c9046778c4f2273818c012020c2f65.png)

I overlooked the email and didn't notice it for about three days. 💦

## Creating Sub-issues
The official documentation provides steps for adding Sub-issues.

[Adding sub-issues - GitHub Docs](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/adding-sub-issues)

There is a `Create sub-issue` button below the issue summary description.

![create sub-issue](https://i.gyazo.com/54408ce65248b3e2cebaed1a15481b91.png)

You can choose to add a new sub-issue or an existing issue.

![add menu](https://i.gyazo.com/2798d1871874b81fbb565f0e08c06579.png)

This is the screen for registering a new sub-issue.

![create new sub issue](https://i.gyazo.com/0242a680b97220a1e8e944ec62313784.png)

If you check `Create more sub-issues` before clicking `Create`, you can register sub-issues consecutively.

Once registered, sub-issues are listed below the issue description.

![sub-issues list](https://i.gyazo.com/d1140feaa7c6fc0ca4bb7d7e96e3c66e.png)

You can add sub-issues to issues registered as sub-issues, allowing for multiple levels of nesting.

## Visualizing the Hierarchical Structure of Issues
Currently, the hierarchical structure of Sub-issues is not visualized on the repository's issue list screen.

![issue list](https://i.gyazo.com/483e235d57f65d612a343a5b78587a52.png)

I created a project and added the above issues.

![Projects](https://i.gyazo.com/ae46cda4e8ea47a8da8564105f8f04f0.png)

![Add issues to project](https://i.gyazo.com/531ac2fd72d52d879cdfd91313f53c39.png)

By adding only the root issue, sub-issues are automatically added. This is due to the workflow feature of Projects.

![Sub-issues automatically added](https://i.gyazo.com/79b71776af07ac8d3ebccd815c90c15d.png)

In normal mode, it is displayed flat.

![Project view](https://i.gyazo.com/e7309d286442937148fbe95033797ce1.png)

Specify `Parent issue` under grouping.

![Set Group](https://i.gyazo.com/058bf940e8b428dc61ddd4bf67f66ba7.png)

The hierarchy is represented through group display.

![Group by parent issue](https://i.gyazo.com/1614410ec508e8f8af200510c8169e18.png)

The above screen was the Table view of Projects, but it is also reflected when switching to the Roadmap view.

![Roadmap View](https://i.gyazo.com/ed9953d16bc171d75ad5259c7397fd9a.png)

It might be a bit cumbersome since you need to create a project and operate it.

:::info
It's quite old, but the workflow of GitHub Projects is introduced in the following article.

[Trying Out the Renewed GitHub Projects Automation](/blogs/2022/10/22/renewed-github-projects-automation/)

The Roadmap view of GitHub Projects is introduced in the following article.

[Roadmaps Appear in GitHub Projects - Manage Issues and PRs on a Timeline](/blogs/2023/03/28/github-projects-new-roadmaps-layout/)
:::

## Closing Issues with Sub-issues

I tried closing the root issue of Sub-issues.

![Close root issue](https://i.gyazo.com/7e71e64d945377cacbc4a91770fbc813.png)

Even if Sub-issues are open, you can close it normally.

![issue Closed](https://i.gyazo.com/46ce5a245bc031b158054bd983f22cb4.png)

There doesn't seem to be a feature to guard based on the status of Sub-issues at this stage.

It might be implemented in the future based on feedback.

## Conclusion
In my usual usage, a parent-child structure for issues is not necessary, but I think many people believe it should be present as an issue tracker. The public preview is being discussed in the following Discussion. It might be good to try it out and give feedback.

[Sub-issues Public Preview · community · Discussion #139932](https://github.com/orgs/community/discussions/139932)

I am looking forward to seeing how much it will be polished in the official version.
