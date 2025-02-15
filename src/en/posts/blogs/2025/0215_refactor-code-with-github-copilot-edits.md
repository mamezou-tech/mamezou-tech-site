---
title: Efficient Refactoring with Copilot Edits in VS Code
author: masahiro-kondo
date: 2025-02-15T00:00:00.000Z
tags:
  - GitHub Copilot
  - リファクタリング
  - vscode
image: true
translate: true

---

## Introduction
GitHub Copilot’s development goal is to make developers’ lives easier by providing an AI pair programmer.

With the GitHub Copilot extension in VS Code, it suggests code modifications for the file you are editing. In addition, there is a workflow where you write a prompt in the Chat UI and have code generated from scratch for you to use.

While getting code generated in VS Code’s Copilot Chat is convenient, don’t you sometimes feel a bit bogged down when working in the Chat UI?

1. Write and send a prompt  
2. Code is generated from scratch  
3. Review the code  
4. If there are parts you want changed, give further instructions with an additional prompt  
5. The code is regenerated from the beginning  
6. Review the code  
7. If the result is good, merge the generated code into the project you’re editing

In this way, you end up repeatedly issuing prompts, generating the complete code, and reviewing it—forcing you to stare at a full code generation in the Chat UI every time. Sure, it’s about 100 times faster than writing code manually, but wouldn’t it be better if the code right in front of you could change directly?

## Direct Display and Iterative Processing of Generated Files in Copilot Chat
A little while ago, GitHub’s ChangeLog announced a preview feature on the GitHub website’s Copilot Chat that enables direct iterative processing of files (View and Iterate Generated files).

@[og](https://github.blog/changelog/2025-02-05-view-and-iterate-on-generated-files-directly-within-copilot-chat-preview/)

Like the previous Copilot Chat in VS Code where the entire code was generated each time, this feature now allows updates based on an initially generated file to be directly reflected via prompts.

:::info
Regarding Copilot Chat on the GitHub website, it is introduced in the following article.

@[og](/blogs/2024/09/28/github-copilot-in-github-com/)
:::

When you include sentences such as “create a file” or “generate a file” in your prompt, it switches to the direct display and iterative processing mode.

This is the result of executing the prompt, “Create a Markdown file that includes the Top 10 JavaScript news of 2024.” As before, the generated file is displayed in the right panel of the Chat UI.

![View and Iterate 1](https://i.gyazo.com/77313d6025ab75a0eadc113861040e29.png)

On the Chat UI side, the plan for generating the file and its execution results are shown. The Markdown file displayed in the right panel is the deliverable.

Since the title was in Japanese while the body was in English—resulting in an inconsistent feel—issuing an extra prompt saying, “Please have the body in Japanese as well,” rewrote the same file.

![View and Iterate 2](https://i.gyazo.com/1be02f320116a2cdc9be2b606a56fcb4.png)

As described above, on Copilot Chat on GitHub.com, you can directly edit generated files using prompts.

## Copilot Edits Reaches GA in VS Code
I was hoping we could have View and Iterate in VS Code as well, and not long ago, with the announcement of the GitHub Copilot Agent, the feature called Copilot Edits reached GA[^1].

@[og](https://github.blog/news-insights/product-news/github-copilot-the-agent-awakens/)

With Copilot Edits, you can open the target file in VS Code, issue interactive prompts, and modify the file accordingly.

[^1]: I plan to cover the Agent in a separate article.

The VS Code documentation explains this on the following page.

@[og](https://code.visualstudio.com/docs/copilot/copilot-edits)

## Getting Started with Copilot Edits
To use Copilot Edits, you need to install the GitHub Copilot extension in VS Code and be logged in with a GitHub account that has an active GitHub Copilot subscription. It’s fine as long as the menu from the profile icon in the bottom left looks like the following.

![Sign in](https://i.gyazo.com/3a2aeeac8f7e01b43d81f79f11381ff2.png)

Click the Copilot icon in VS Code and select “Open Copilot Edits” from the menu.

![Open GitHub Copilot Edits](https://i.gyazo.com/69de8f32a33f71901df544d4f14efff8.png)

Copilot Edits isn’t very different from the previous Copilot Chat screen, but it includes a UI for attaching the file you’re editing. By including the target file in this “working set” and writing your prompt, you can collaboratively edit the file with Copilot.

![Edit with copilot](https://i.gyazo.com/74a12ac779168465dd1a64f59cdee506.png)

## Performing Refactoring with Copilot Edits
In code refactoring, you often edit multiple files simultaneously, and new files may even be created. Doing this in the traditional Chat UI can be quite cumbersome due to repeated file operations and copy-paste actions.

Let’s try refactoring some not-so-great Java code using Copilot Edits.[^2]

[^2]: This suboptimal code was written using Copilot in View and Iterate mode on the GitHub website.

When you open the target file, it gets added to the working set.

![Open files](https://i.gyazo.com/c192e4c4f532b863eca04ac3a265138c.png)

If you want to add another file to the working set, click “+ Add File” to choose from the available candidates.

![Add file](https://i.gyazo.com/7df319ec6104abb84db205960c6f7173.png)

In this way, you can include multiple related files in the working set.

![Added files](https://i.gyazo.com/c4d59771b0c8695d27b1024f0e0b9190.png)

Now, let’s instruct the refactoring with a prompt.

I won’t show the code details, but imagine there is a data class called Employee and a management class called EmployeeManager, where EmployeeManager has taken on too many responsibilities and has become somewhat complex.

I issued a prompt stating, “EmployeeManager is too large; please split it into several classes.”

![First refactor](https://i.gyazo.com/ae2aac8531f8e58b43505960556f3ed8.png)

From EmployeeManager, three classes were extracted—dividing it into four classes in total. Naturally, these have been added to the project as new files. You can review the changes in each file and decide whether to “Approve” or “Discard” them. By clicking “Adopt” in the working set area, you can approve all changes at once.

I clicked “Adopt” to accept Copilot’s refactoring.

A trivial class called EmployeeUpdater, whose sole purpose is to update the attributes of a data class, was created.

![EmployeeUpdater](https://i.gyazo.com/953db4fd06af176fe4991d0fcaf30e4a.png)

This likely happened because the pre-refactoring EmployeeManager exposed update methods for each attribute.

I then issued a prompt saying, “Remove the Employee update methods from EmployeeManager, change them to a method that accepts an Employee for updating, and deprecate EmployeeUpdater.”

The methods in EmployeeManager were consolidated more or less as intended.

![refactor update method](https://i.gyazo.com/069a5bab5130a6dc0c18b606f0333200.png)

EmployeeUpdater was marked as removable.

![remove EmployeeUpdater](https://i.gyazo.com/0dc403a254a4106766d29f65e85c4056.png)

Although the classes were reasonably split up, the code still felt a bit legacy. So I issued a prompt saying, “Improve the code in the employee package.”

![improve code](https://i.gyazo.com/0858996b9f21d32075e19b5c81ab8561.png)

It transformed the code into a more readable version by utilizing Streams.

Finally, I added test code. I requested, “Please add unit tests for the employee package.” After generating the test code, I asked, “Please add @DisplayName to all test cases,” and it added them in bulk to every test method.

![Add Test code](https://i.gyazo.com/3e9fd6e68500930779dcb4bba34eb3ce.png)

Of course, all the tests passed successfully.

:::info
In this article, I issued the prompts rather loosely, but for guidelines on how to refactor code with GitHub Copilot, please refer to the following blog.

@[og](https://github.blog/ai-and-ml/github-copilot/how-to-refactor-code-with-github-copilot/)
:::

## In Conclusion
That’s it—I tried out Copilot Edits a bit, and it’s quite impressive. It really feels like you have a rapidly coding pair programmer acting as the driver while you take on the navigator role.

While it certainly makes developers’ lives easier, I also have concerns that it may reduce opportunities for developers to refactor code on their own, potentially leading to an increase in developers who aren’t as adept at providing effective guidance.
