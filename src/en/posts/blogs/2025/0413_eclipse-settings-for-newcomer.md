---
title: >-
  A Handy Eclipse Settings Guide You Should Check First in Java Development [For
  Beginners]
author: toshio-ogiwara
date: 2025-04-13T00:00:00.000Z
tags:
  - java
  - eclipse
  - 新人向け
image: true
translate: true
---

I believe many teams still use Eclipse for newcomer training. Knowing a few handy settings can greatly affect your daily development efficiency and stress levels. In this article, we'll summarize the basic Eclipse settings that are useful for Java development. We've organized the key points you should grasp as a newcomer as compactly as possible. Understanding where each setting is and what it means will help you take the first step toward setting up your environment.

:::info
This article assumes the use of [Pleiades All in One](https://willbrains.jp/). While Pleiades comes with many of these settings configured by default, default settings can change depending on the version or be altered unintentionally. Knowing where and how you can configure each setting is important for mastering Eclipse. I hope you'll take this opportunity to understand the meaning and operation of these settings through this article.
:::

## 1. Check the Java version

First, check the version of the JDK that will be used in your Java projects.

- In Window → Preferences → Java → Installed JREs, verify the JDK you want to use and change the default if necessary.

![jre](/img/blogs/2025/0413_eclipse-settings/cap_01-jre.drawio.svg)

The JDK (JRE) checked here will be the JDK used by any newly created Java project. This is just the default—after creating a project, you can also change the JDK used for each project individually.

:::column:Checking the version in use is important
Right after installing Eclipse or creating a new workspace, the JDK you plan to use may not be set correctly. Even if you're using Pleiades All in One, if the JDK being used differs from the version your Java project expects, you may encounter compilation errors or build failures. By explicitly checking which JDK will be used before creating a project, you can nip potential problems in the bud. Since this is the foundation of your development environment, be sure not to forget to check it!
:::

## 2. Standardize the character encoding

To prevent garbled characters across the entire project, set the character encoding to UTF-8.

- In Window → Preferences → General → Workspace, set “Text file encoding” to UTF-8.

![utf8](/img/blogs/2025/0413_eclipse-settings/cap_02-utf8.drawio.svg)

:::column:UTF-8 is the standard choice for character encoding
Nowadays, selecting UTF-8 for source code character encoding is the standard. It makes it easier to prevent garbled text when working across different OSes or collaborating with other developers, and tool and library support is most advanced for UTF-8.
:::

## 3. Code formatting settings

Set up code formatting to automatically maintain clean Java code.

- In Window → Preferences → Java → Code Style → Formatter, choose your preferred settings (the default Pleiades [Custom] is recommended).

![format](/img/blogs/2025/0413_eclipse-settings/cap_03-format.drawio.svg)

:::column:Spaces or tabs for indentation?
The coding style defined by Pleiades [Custom] is based on a general style widely used in Java and can be used seamlessly in many development projects. However, note that the default setting for indentation is “tabs.” In practice, many projects use spaces for indentation. Therefore, we recommend changing this setting as needed to align with your project’s or team’s policy. By the way, I personally prefer spaces and can’t stand anything other than space indentation...
![indent](/img/blogs/2025/0413_eclipse-settings/cap_04-indent.drawio.svg)
:::

## 4. Show line numbers

To make code reviews and error checking easier, display line numbers as follows:

![line_no](/img/blogs/2025/0413_eclipse-settings/cap_05-line_no.drawio.svg)

- In Window → Preferences → General → Editors → Text Editors, check “Show line numbers.”

![line_no_check](/img/blogs/2025/0413_eclipse-settings/cap_06-line_no_check.drawio.svg)

:::column:Knowing line numbers makes asking questions easier!
When you ask a senior colleague about an error saying “I’m getting an error around here…,” they often reply, “Where exactly? Which line?” Being able to promptly answer “It’s on line X” is the first step to becoming a capable engineer. Always displaying line numbers is a fundamental practice for programmers. Even though the visual change is minor, it’s an important setting that directly impacts the smoothness of daily communication.
:::

## 5. Show the character count per line

Display a guideline for line length to keep your code readable.

![guideline](/img/blogs/2025/0413_eclipse-settings/cap_07-guideline.drawio.svg)

- In Window → Preferences → General → Editors → Text Editors, check “Show print margin” and set the right margin to an appropriate value such as 120.

![guideline_check](/img/blogs/2025/0413_eclipse-settings/cap_08-guideline_check.drawio.svg)

:::column:Use the guideline to determine wrap positions
Eclipse’s formatter can automatically wrap (insert line breaks) when a line exceeds the specified character limit, as shown below:

![guideline_check](/img/blogs/2025/0413_eclipse-settings/cap_09-wrapped.drawio.svg)

While this automatic wrapping is convenient, relying on the formatter can lead to line breaks at unintended points, making code harder to read. That’s why we also recommend using the guideline to manually wrap lines at appropriate spots.
:::

## 6. Adjust the font and size

Adjust the font and font size to create a more readable and less tiring display.

- In Window → Preferences → General → Appearance → Colors and Fonts → Basic → Text Font, set your preferred font and size (e.g., "Consolas 12").

![font](/img/blogs/2025/0413_eclipse-settings/cap_10-font.drawio.svg)

:::column:Programming fonts are recommended!
You can certainly use Eclipse’s default font (e.g., MS Gothic) without issue, but using a programming‑specific font greatly improves the visibility of symbols and alphanumeric characters, making coding more comfortable. Although you need to install it, it’s definitely worth trying at least once. For example, I’ve been using [Ricty Diminished](https://rictyfonts.github.io/diminished) for years (the project is now discontinued). Even subtle differences in appearance can make a big difference in fatigue and misreading during long work sessions. Find a font that suits you. As a reference, below are examples showing MS Gothic and Ricty Diminished.

![font_comp](/img/blogs/2025/0413_eclipse-settings/cap_11-font_comp.drawio.svg)
:::

## 7. Automate import organization on save

Automatically organize imports to keep your code clean.

- In Window → Preferences → Java → Editor → Save Actions, check “Organize imports.”

![import_check](/img/blogs/2025/0413_eclipse-settings/cap_13-import_check.drawio.svg)

Enabling this feature will automatically delete unused import statements, expand wildcards (`*`), and sort imports when saving the file, as shown below:

![import](/img/blogs/2025/0413_eclipse-settings/cap_12-import.drawio.svg)

:::column:Avoid wildcard imports (e.g., import java.util.*)!
Using wildcard imports (*) groups imports together but can cause unintended class collisions and make it harder to identify which classes are being used. In Java development, it’s standard to explicitly import the classes you use. Configure Eclipse to “never use wildcard imports.”
:::

## 8. Configure console output

Adjust console history and character limits to make log inspection easier.

- In Window → Preferences → Run/Debug → Console, adjust the console output limit.

![console](/img/blogs/2025/0413_eclipse-settings/cap_14-console.drawio.svg)

:::column:What if logs get truncated and disappear?
Eclipse’s console has a limit on how much log it can display. Therefore, when a large volume of logs is output at once, older logs may disappear partway through. In such cases, increasing the console buffer size is effective.
:::

## 9. Automatically remove trailing whitespace on save

Automatically remove trailing whitespace, which is hard to notice visually, to reduce diffs and make reviews easier.

- In Window → Preferences → General → Editors → AnyEdit Tools, check “Remove trailing whitespace”[^1].

[^1]: In recent versions of Eclipse, you can also enable “Additional actions” in Window → Preferences → Java → Editor → Save Actions to remove trailing whitespace, but that activates many other features as well. Here, we introduce the simpler AnyEdit Tools plugin setting.

![space](/img/blogs/2025/0413_eclipse-settings/cap_15-space.drawio.svg)

:::column:Why reduce diffs to make reviews easier?
Trailing whitespace is hard to see visually yet is detected as a diff by version control tools like Git. As a result, “meaningless changes” get included in files and can hide substantive changes during reviews. Enabling automatic removal of trailing whitespace helps prevent this noise, reducing review burden and improving the clarity of history. It’s a small tweak, but it’s very effective in team development.
:::

## 10. Visualize full-width spaces and line break codes

To prevent bugs caused by unintended full-width spaces or differing line breaks, make them visible for inspection.

- In Window → Preferences → General → Editors → Text Editors, check “Show whitespace characters” to display full-width spaces, tabs, and line break symbols. You can also fine‑tune which characters are shown via the “Configure visibility” dialog.

![disp](/img/blogs/2025/0413_eclipse-settings/cap_16-disp.drawio.svg)

<br>
With this setting enabled, spaces, tabs, and line break symbols are displayed as shown below:

![disp_char](/img/blogs/2025/0413_eclipse-settings/cap_17-disp_char.drawio.svg)

:::column:Why is visualizing full-width spaces important?
In Java, having full-width spaces mixed into executable code lines can cause compilation errors. Full-width spaces accidentally entered while typing in Japanese are particularly hard to spot visually and can lead to debugging headaches when you don’t know the cause. To prevent such issues, it’s important to enable settings that make full-width spaces and line break codes visible. When you find yourself thinking “Why is this error happening?”, this small precaution will help you avoid wasting time, so be sure to enable it.
:::

## Conclusion
Eclipse is feature‑rich, so you might be confused at first about which settings to adjust. However, even just applying the basic settings introduced here can greatly improve your development experience. I hope this article serves as a helpful first step in finding an environment that works for you as you continue using Eclipse!
