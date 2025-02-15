---
title: Let's Move Beyond TeraTerm and Try the Convenient and Simple 'RLogin'.
author: takahiro-maeda
date: 2024-12-02T00:00:00.000Z
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2024/
tags:
  - advent2024
  - ターミナルエミュレータ
  - ターミナル
  - RLogin
translate: true

---

This is the article for Day 2 of the [Mamezou Developer Site Advent Calendar 2024](/events/advent-calendar/2024/).

## Introduction

When operating virtual machines such as AWS EC2 or Azure VMs on Windows, which terminal software do you use?

There are many types of terminal software, and I believe many people have experience using "TeraTerm." I also used TeraTerm after entering the IT industry but found it somewhat inconvenient.

While searching for better terminal software, I came across "RLogin."  
In this article, I would like to introduce some of the features of "RLogin."

::: info
This article is intended for the following audiences:
- People who want to use a terminal that is easy to set up.
- People who want to learn about terminal software other than TeraTerm.
- People who feel they are not fully utilizing TeraTerm's features.
:::

## History and Development of TeraTerm

TeraTerm is widely used in server infrastructure management and is arguably the most popular terminal software (emulator) in Japan.  
The reasons for its high market share include its stability and reliability, proven through years of use.

The history of TeraTerm dates back a long time. The final version of its predecessor, TeraTerm Pro 2.3, was released on March 10, 1998[^1][^2].  
Later, TeraTerm version 4.10, developed by the TeraTerm Project and still widely used today, was released on January 30, 2005, and has been continuously developed for nearly 20 years.  
Furthermore, TeraTerm 5.0, which supports Unicode, was released on October 15, 2023[^3], and development continues to this day.

[^1]: Referenced from [About TeraTerm > Foreword](https://teratermproject.github.io/manual/5/ja/about/foreword.html)  
[^2]: Referenced from [Tera Term Home Page](https://hp.vector.co.jp/authors/VA002416/)  
[^3]: Referenced from [About TeraTerm > Revision History](https://teratermproject.github.io/manual/5/ja/about/history.html#teraterm)  

## What is RLogin?
::: info
The protocol "rlogin" and the terminal software "RLogin" are different.  
Please be careful not to confuse them.
:::

RLogin is terminal software that runs on Windows.  
Initially, in 1998, it only supported rlogin and telnet. However, in 2005, it became a full-fledged terminal software with support for SSH1/SSH2.  
Since then, it has been continuously released on a 1-2 month cycle, making it a terminal software with a long history, existing alongside the TeraTerm Project[^4].  
As of the time of writing (November 2024), the latest version is 2.29.9.

[^4]: Referenced from [RLogin > Program History](https://kmiya-culti.github.io/RLogin/history.html)  

## Reasons to Recommend RLogin

Here are the reasons why I recommend "RLogin":
- It includes all the essential features.
- It has an intuitive UI, high customizability for various settings, and is easy to configure.
- It selectively includes features that you might think, "It would be nice to have this."
  - The official RLogin website is easy to read.
  - The official website summarizes use cases for each feature.
  - Features can be viewed in a list format, with clear explanations and images.
- It is open-source freeware with no restrictions on commercial or personal use.
  - Some software licenses require caution when using the software, but RLogin imposes no such restrictions.

## Installation Method

You can download the latest zip file from the [official RLogin GitHub](https://github.com/kmiya-culti/RLogin/releases/), extract it, and run `RLogin.exe` to start using it.  
Save the executable as a shortcut or pin it to the taskbar for quick access.

## Basic Usage
### Recommended Initial Settings

Here are the initial settings I recommend.

#### Clipboard Settings
- Copy to clipboard by simply selecting a range with the left click.
- Paste with a right click.  
![Clipboard Settings Screen](/img/blogs/2024/1202_RLogin_introduction/rlogin_initial_clipbord.png)

Additionally, I recommend the following settings:

#### Color Settings
- If you want to change the background, there are 14 preset options available by default.
- You can color-code based on server environments (production, development) or roles (backend, database server).  
![Terminal Background Color Settings Screen](/img/blogs/2024/1202_RLogin_introduction/rlogin_backscreen_color_setting.png)

#### Template and Default Settings
- Once the initial settings are complete, save them as a template.
  - Setting the template as the default will eliminate the need to reconfigure these settings when creating a new connection.  
    - For example, turn on the clipboard settings in the red box.  
    ![Template Settings](/img/blogs/2024/1202_RLogin_introduction/rlogin_template_setting.png)
    - Save the settings as a template and set them as the default.  
    ![Default Settings](/img/blogs/2024/1202_RLogin_introduction/rlogin_default_setting.png)
    - When creating a new connection, you can see that all the default settings (yellow box) are enabled.  
    ![Default Settings Applied](/img/blogs/2024/1202_RLogin_introduction/rlogin_new_server_connect.png)
- To exclude default settings or inherit other connection settings:
  - Right-click the target server in the server selection screen and select "Reset to Default Settings" to make the following changes:
    - Choose "Reset to Program Defaults" to initialize the server settings.
    - Choose "Match the Following Settings" to import settings from another server.  
    ![Reset to Default Settings](/img/blogs/2024/1202_RLogin_introduction/rlogin_return_default_setting_dialog.png)

#### Tab Functionality
- You can display the server selection screen by groups.
- There are two methods:
  - Tab Display Mode:
    - You can set the tab (group) name in the server settings screen's tab (top).  
    ![Tab (Horizontal Display)](/img/blogs/2024/1202_RLogin_introduction/rlogin_tab_setting_x_view.png)  
    ![Tab Settings (Horizontal Display)](/img/blogs/2024/1202_RLogin_introduction/rlogin_tab_xview.png)  
  - Hierarchical Display Mode:
    - Add a "\" at the beginning of the tab (group) name in the server settings screen's tab (top).  
    ![Tab Settings (Hierarchical Display)](/img/blogs/2024/1202_RLogin_introduction/rlogin_tab_setting_tree_view.png)  
    ![Tab (Hierarchical Display)](/img/blogs/2024/1202_RLogin_introduction/rlogin_tab_tree_view.png)  

### Saving Connection Information

Once the initial settings are complete, save the server connection information and settings.  
In the server selection screen, you can also use the connection information in the following ways:
- Create shortcuts (★):  
  - Place them anywhere, such as on the desktop, for one-click server connections.
- Import or export settings information using RLogin's proprietary file format (`.rlg`).
- Copy settings information to the clipboard or paste it from the clipboard.

::: alert
If you are using password authentication, you can save passwords, but it is recommended to avoid saving them for security reasons.  
Be mindful of operational rules, especially when using RLogin in corporate environments.
:::

### Connecting to a Server

Select a server and click the "OK" button to connect.  
![Server Connection Screen](/img/blogs/2024/1202_RLogin_introduction/rlogin_server_select.png)

## Top 3 Recommended Features

### Split Screen Functionality
One of RLogin's standout features is its "Split Screen Functionality."  
With the rise of higher-resolution displays such as 4K, 8K, and ultrawide monitors, the amount of information that can be displayed has increased[^5].  
![Split Screen Demo](/img/blogs/2024/1202_RLogin_introduction/rlogin_full_screen.png)

For those who want to view information from multiple servers on a single screen, this feature is incredibly useful and comprehensive.  
(Of course, you can also use RLogin in multiple windows.)  
The following shortcuts are available for this functionality:
- Split Shortcuts:
  - Split vertically and connect (Ctrl+DOWN(↓))  
  - Split horizontally and connect (Ctrl+RIGHT(→))  
  - Split vertically and create a new connection (Ctrl+Shift+DOWN(↓))  
  - Split horizontally and create a new connection (Ctrl+Shift+RIGHT(→))  
- Window Navigation Shortcuts:
  - Move to the next window (Ctrl+TAB)  
  - Move to the previous window (Ctrl+Shift+TAB)  
  - Move to the window above (Alt+UP(↑))  
  - Move to the window below (Alt+DOWN(↓))  
  - Move to the window to the right (Alt+RIGHT(→))  
  - Move to the window to the left (Alt+LEFT(←))  

[^5]: I personally use a multi-display setup with a 4K monitor and a 1920x1080 monitor.

### Paste Confirmation Functionality
The default-on paste confirmation functionality is another feature I find convenient.  
This feature displays a confirmation dialog when pasting multi-line text and shows the number of tabs and newline characters, which I think is practical for real-world use.

For example, when pasting, unintended trailing newlines or tabs can sometimes be included.  
(Have you ever experienced trailing newlines or tabs sneaking in when copying from Excel, spreadsheets, or the web?)

These issues can often go unnoticed in a text editor. However, by checking the number of tabs and newline characters in the paste confirmation dialog, you can prevent unintended text from being pasted and eliminate potential causes of errors.  
This is particularly useful in scenarios where mistakes are not allowed, such as in production environments, or when ensuring the precise execution of commands or scripts.

::: info
In the images below, the affected areas are highlighted to show where tabs or newlines are included.
:::

- Case where a tab is included at the end:  
![Case with Trailing Tab](/img/blogs/2024/1202_RLogin_introduction/rlogin_paste_tab_pattern.png)  
- Case where a newline is included at the end:  
![Case with Trailing Newline](/img/blogs/2024/1202_RLogin_introduction/rlogin_paste_rn_pattern.png)  

In both cases, you can delete unnecessary tabs or newlines in the paste confirmation editor before sending.

### Search Functionality
While not suitable for advanced search or extraction, RLogin includes a string search feature for the terminal display screen.  
You can access this by right-clicking or selecting "String Search" from the "Edit" menu on the top bar. After performing a search, the matching sections are highlighted.

This feature is useful for quickly finding specific text. It supports case-insensitive searches, wildcard/regular expression searches, and more. It’s a handy feature for quick lookups.  
![Using the Search Functionality](/img/blogs/2024/1202_RLogin_introduction/rlogin_string_search.png)  
The matching text is highlighted in the results:  
![Search Results](/img/blogs/2024/1202_RLogin_introduction/rlogin_string_search_result.png)

## Conclusion
RLogin offers a wide variety of features that I couldn’t cover in this article.  
TeraTerm also has many good points, but its unique macros and other features can have a steep learning curve.

When the learning curve is high, even small ideas may not be implemented.  
On the other hand, RLogin has a customizable UI, an easy-to-read official website, and a relatively low learning curve, making it highly recommended.  
I’ve been using it for about six months, and I hope those who read this article will give it a try.

## Final Note
This article is one of the contributions to the [Mamezou Developer Site Advent Calendar 2024](/events/advent-calendar/2024/).  
From December 2 to December 25, we will be publishing various articles on weekdays for a total of 18 days.  
We hope you’ll read through to the end!
