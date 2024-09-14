---
title: >-
  Things I Struggled with When Displaying the Execution Browser of Playwright on
  WSL
author: kotaro-miura
date: 2024-09-10T00:00:00.000Z
tags:
  - playwright
  - wsl
  - linux
  - テスト
  - トラブルシューティング
  - X Window System
  - VcXsrv
image: true
translate: true

---

# Introduction

When trying to display the execution browser of [Playwright](https://playwright.dev/) installed on WSL2 on Windows 10 (with headless mode off), it didn't work initially, so I will summarize the cause and the solution I implemented.

:::info:Operating Environment

OS: Windows 10 (22H2)

WSL: 2.2.4.0 (Ubuntu 24.04 LTS)

Playwright: 1.45.3

:::

# Things I Struggled with

As a premise, there was no problem with the Playwright test code itself, and the tests completed successfully in headless mode.

First, disable headless mode in the Playwright settings as follows.

```typescript:playwright.config.ts
  use: {
    headless: false
  }
```

Then execute the Playwright test.

```sh
$ npx playwright test
```

Then the following error was displayed, and the execution failed.

```sh
  Error: browserType.launch: Target page, context or browser has been closed
    Browser logs:

    ╔════════════════════════════════════════════════════════════════════════════════════════════════╗
    ║ Looks like you launched a headed browser without having a XServer running.                     ║
    ║ Set either 'headless: true' or use 'xvfb-run <your-playwright-app>' before running Playwright. ║
    ║                                                                                                ║
    ║ <3 Playwright Team                                                                             ║
    ╚════════════════════════════════════════════════════════════════════════════════════════════════╝
```

# Solution

The error message essentially says, "You can't launch a headed browser without an XServer running."

Therefore, I decided to start an XServer on the Windows side.

:::alert:Enabling WSLg also solves this

Without manually starting an XServer, the latest WSL has a feature called [**WSLg**](https://github.com/microsoft/wslg) that supports GUI apps on WSL by default, and if this is enabled, such issues should not occur.

WSLg is automatically enabled if Windows, WSL, and the graphics driver are up to date, so do it if possible.

In my environment, Windows and WSL were the latest, but the graphics driver was old, so it didn't work. I was afraid that manually updating the graphics driver might cause display issues due to compatibility problems, so I gave up on enabling WSLg.

:::

## What is the X Window System?

This is a brief explanation of terms.

The X Window System is a window system commonly used by UNIX-like OS to display GUIs on a display. It adopts a client-server model, where you can start an XServer on the machine connected to the display you want to show and send graphics rendering commands over the network from another machine running a GUI app to the XServer[^aboutX].

[^aboutX]:[What is the X Window System](https://www.astec-x.com/FAQ/aboutx.html)

In this case, it's on the same machine, but the XServer is started on the Windows side, and the WSL side acts as an X client issuing rendering commands for the Playwright browser to the XServer.

## Starting an XServer on the Windows side

Returning to the topic, I will summarize the solution.

As a free XServer software for Windows, [VcXsrv](https://sourceforge.net/projects/vcxsrv/) seems to be popular, so I will use this.

1. First, download and install the VcXsrv installer.
  [Installer distribution site link](https://sourceforge.net/projects/vcxsrv/)
2. Start VcXsrv.
3. Configure the settings as follows on the displayed screen.
    - Select display settings: Multiple windows
    - Display number: -1
      ![VcXsrv1](/img/blogs/2024/0910_playwright_headed_wsl/VcXsrv1.png)
    - Select how to start clients: Start no client
      ![VcXsrv2](/img/blogs/2024/0910_playwright_headed_wsl/VcXsrv2.png)
    - Extra settings: Check all
      ![VcXsrv3](/img/blogs/2024/0910_playwright_headed_wsl/VcXsrv3.png)
    - Press Complete
      ![VcXsrv4](/img/blogs/2024/0910_playwright_headed_wsl/VcXsrv4.png)
    - Firewall settings: Allow for the connected network profile.
      ![VcXsrv5](/img/blogs/2024/0910_playwright_headed_wsl/VcXsrv5.png)


4. Set environment variables on WSL.

By executing the following command on WSL, set the environment variable `DISPLAY` to `{Windows host IP address}:0`.

```sh
export DISPLAY=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2; exit;}'):0
```

By configuring the above settings, the error was resolved, and the execution browser of Playwright on WSL could be displayed on the screen.

I will attach a screenshot of the window displayed when executing the [Playwright test sample](https://playwright.dev/docs/writing-tests#first-test). The execution browser is specified as chromium.
![browser](/img/blogs/2024/0910_playwright_headed_wsl/playwright_browser.png)

:::column:Address to Set in DISPLAY Variable

- As a side note, the Windows host IP address can also be obtained with the command `ip route show | grep -i default | awk '{ print $3}'`.[^getIp]
- The number in the `:0` part represents the display number[^address]. You can specify it in the "Display number" setting item when starting VcXsrv. This time, -1 was entered when starting VcXsrv, and 0 is automatically assigned in this case. VcXsrv can be started multiple times, and if you specify "Display number=-1" each time you start it, the display numbers will be assigned sequentially as 0, 1, 2, ...

:::

[^getIp]:[Accessing Network Applications with WSL](https://learn.microsoft.com/ja-jp/windows/wsl/networking)

[^address]:Explanation about the address: [Chapter 2 Display Functions](https://xjman.dsl.gr.jp/X11R6/X11/CH02.html)


# Conclusion

This time, I summarized the method of starting an XServer as a solution to the error that occurred when trying to display the Playwright browser on WSL. I hope it will be helpful to anyone who encounters a similar error.
