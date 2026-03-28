---
title: How to Fix Garbled Characters When Using AWS Session Manager with Git Bash
author: takahiro-maeda
date: 2026-03-24T00:00:00.000Z
tags:
  - AWS
  - SSM
  - terminal
image: true
translate: true

---

## Introduction

Which OS do you typically use for work?  
Personally, I use a Mac, but at work I use Windows.

In a Windows environment, I use Git Bash, which is lightweight, easy to use, and allows POSIX-like operations.  
Since it can also be used from Windows Terminal, you can continue using familiar commands as-is, and it works well with the AWS CLI.

@[og](https://developer.mamezou-tech.com/blogs/2023/09/08/windows-terminal-with-git-bash/)

For these reasons, I also used Git Bash when connecting to EC2 via AWS Systems Manager Session Manager (hereinafter, SSM).  
However, on Windows Git Bash, some box-drawing characters and symbols included in commands like `lsblk` or `systemctl status` sometimes became garbled.

In this article, I will introduce how to reproduce this issue, its cause, and how to work around it.

In conclusion, **the first choice is to update the session-manager-plugin to the latest version**.  
If updating is difficult, **changing the code page to UTF-8 with `chcp.com 65001`** was effective.

Note that this issue did not occur when connecting from a Mac.

## Prerequisites

The following environment was used for testing:

- OS: Windows 11 (Pro)  
- Terminal: Git Bash  
- AWS CLI: `aws-cli/2.32.16 Python/3.13.11 Windows/11 exe/AMD64`  
- session-manager-plugin: `1.2.707.0 (at the start of testing) → 1.2.792.0 (resolved)`

This article is intended for those who:

- Connect to EC2 using AWS CLI/SSM on Windows + Git Bash  
- Experience garbled box-drawing characters or symbols in `lsblk` or `systemctl status`

## Summary of Recommendations

The mitigation methods are as follows:

| Priority | Mitigation Method                                                         | Notes                                                   |
| ----     | ----                                                                      | ----                                                    |
| 1        | Update the `session-manager-plugin` to the latest version (`1.2.792.0`+) | Fundamental solution. Recommended first                 |
| 2        | Run `chcp.com 65001`                                                      | Temporary workaround if you cannot update the plugin    |
| 3        | Configure it in `.bashrc`                                                 | Persist the workaround for continued use                |

## Recommended Mitigation: Update session-manager-plugin to the Latest Version

During testing, I confirmed that **updating to the latest `session-manager-plugin` resolves the issue**.

*Note: This version was released three days before writing and testing this article.*

At the time of writing, updating the plugin to `1.2.792.0` eliminated the garbling.

For installation instructions, please refer to the following AWS official documentation:

[Installing the Session Manager Plugin on Windows](https://docs.aws.amazon.com/ja_jp/systems-manager/latest/userguide/install-plugin-windows.html)

### Why It Was Fixed in `1.2.792.0`

The release notes for `1.2.792.0`, the latest version at the time of writing, included fixes related to keyboard input and character processing in Windows environments.

- [session-manager-plugin 1.2.792.0 Release Page](https://github.com/aws/session-manager-plugin/releases/tag/1.2.792.0)

Looking at the following PR related to `1.2.792.0`, you can see that an issue similar to the one described in this article was addressed:

- [PR: Fix Chinese and Japanese character display issues on Windows platform](https://github.com/aws/session-manager-plugin/pull/115)

This PR explains that the Windows version of `session-manager-plugin` was using the `windows.WriteFile` API when outputting, and some UTF-8 characters for certain languages were not being processed correctly.

As a result, Chinese and Japanese input/output was partially garbled.

It is highly likely that the garbling observed in this article was also resolved by this fix included in `1.2.792.0`.

---

The latter half of this article summarizes the reproduction steps and temporary workarounds when using an older version (`1.2.707.0`).

First, update the plugin to the latest version and verify whether the issue is resolved.

## Garbled Characters Issue (With an Older Plugin)

When using an older version of the plugin (e.g., `1.2.707.0`), garbling occurred when running commands like the following:

This was tested on the official AMIs for Amazon Linux 2023 and Ubuntu 24.04, but the garbling appeared in the same places regardless of the AMI.

```bash
lsblk
NAME         MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS
loop0          7:0    0 27.8M  1 loop /snap/amazon-ssm-agent/12322
loop1          7:1    0   74M  1 loop /snap/core22/2339
loop2          7:2    0 48.1M  1 loop /snap/snapd/25935
nvme0n1      259:0    0    8G  0 disk
笏懌楳nvme0n1p1  259:1    0    7G  0 part /
笏懌楳nvme0n1p14 259:2    0    4M  0 part
笏懌楳nvme0n1p15 259:3    0  106M  0 part /boot/efi
笏披楳nvme0n1p16 259:4    0  913M  0 part /boot
```

```bash
systemctl status sshd
笳・sshd.service - OpenSSH server daemon
     Loaded: loaded (/usr/lib/systemd/system/sshd.service; enabled; preset: enabled)
     Active: active (running) since Sun 2026-03-20 14:18:54 UTC; 1min 12s ago
       Docs: man:sshd(8)
             man:sshd_config(5)
   Main PID: 1553 (sshd)
      Tasks: 1 (limit: 1067)
     Memory: 2.3M
        CPU: 15ms
     CGroup: /system.slice/sshd.service
             笏披楳1553 "sshd: /usr/sbin/sshd -D [listener] 0 of 10-100 startups"
```

As you can see, the box-drawing characters and status icons are garbled.

## Cause

When examining these characters, the result was as follows:

| Original | Unicode                                                                         | Garbled                 |
| ----     | ------------------------------------------------------------------------------- | ----------------------- |
| `├─`      | [U+251C](https://0g0.org/unicode/251C/), [U+2500](https://0g0.org/unicode/2500/) | `笏懌楳`                |
| `└─`      | [U+2514](https://0g0.org/unicode/2514/), [U+2500](https://0g0.org/unicode/2500/) | `笏披楳`                |
| `●`       | [U+25CF](https://0g0.org/unicode/25CF/)                                         | `笳` (invalid trailing character) |

From the above, it can be concluded that the garbling occurred because the UTF-8 strings were mistakenly interpreted as CP932 (Shift_JIS family).

In other words, the character encoding settings of the console on the Git Bash side did not match the strings received via SSM, resulting in box-drawing characters and symbols not being displayed correctly.

## Checking Git Bash Settings and Temporary Workarounds

### Check Your Current Git Bash Settings

In this environment, the result of running `chcp.com` was CP932.

If you want to check your current Git Bash settings, you can use the following command:

```bash
chcp.com
Active code page: 932
```

### Temporary Workaround: Change the Console Code Page to UTF-8

:::info
First, update the `session-manager-plugin` to the latest version and verify that the issue is resolved.  
The method introduced here is a temporary workaround if you cannot update the plugin.
:::

If you cannot download the latest version or have restrictions on installation, try the following command to change the current code page to UTF-8:

```bash
chcp.com 65001
Active code page: 65001
```

:::column Why chcp.com?
Git Bash does not recognize a plain `chcp` command and does not work as expected.  
This is because you need to explicitly call the Windows standard `C:\Windows\System32\chcp.com`.
:::

#### References

- [How to Fix Garbled Japanese Text in Git Bash](https://github.com/fs5013-furi-sutao/explain.how_to_fix_garbled_japanese_text.on_gitbash)
- [Qiita: How to Convert Character Encoding in Git Bash (Windows)](https://qiita.com/BlackMagician/items/1de399c5b577f7514de8)
- [Microsoft chcp](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/chcp)
- [Microsoft Code Page Identifiers](https://learn.microsoft.com/en-us/windows/win32/intl/code-page-identifiers)

## Results

After changing the console code page to UTF-8 and checking again, I confirmed that the previously garbled sections were output correctly.

When using the latest `session-manager-plugin`, the output was correct without having to run `chcp.com 65001`.

```bash
lsblk
NAME         MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS
loop0          7:0    0 27.8M  1 loop /snap/amazon-ssm-agent/12322
loop1          7:1    0   74M  1 loop /snap/core22/2339
loop2          7:2    0 48.1M  1 loop /snap/snapd/25935
nvme0n1      259:0    0    8G  0 disk
├─nvme0n1p1  259:1    0    7G  0 part /
├─nvme0n1p14 259:2    0    4M  0 part
├─nvme0n1p15 259:3    0  106M  0 part /boot/efi
└─nvme0n1p16 259:4    0  913M  0 part /boot
```

```bash
systemctl status sshd
● sshd.service - OpenSSH server daemon
     Loaded: loaded (/usr/lib/systemd/system/sshd.service; enabled; preset: enabled)
     Active: active (running) since Sun 2026-03-20 15:22:04 UTC; 33s ago
       Docs: man:sshd(8)
             man:sshd_config(5)
   Main PID: 1549 (sshd)
      Tasks: 1 (limit: 1067)
     Memory: 2.3M
        CPU: 15ms
     CGroup: /system.slice/sshd.service
             └─1549 "sshd: /usr/sbin/sshd -D [listener] 0 of 10-100 startups"
```

## Persisting the Setting

If changing the code page every time is troublesome, you can add the setting to `.bashrc` so that it automatically switches to UTF-8 when Git Bash starts:

```bash
echo 'chcp.com 65001 > /dev/null' >> ~/.bashrc
```

## Conclusion

In this article, I introduced the cause and mitigation methods for garbled characters occurring when using SSM on Git Bash.

To summarize the key points:

- First, update the `session-manager-plugin` to the latest version  
- If you’re using an older plugin, you may experience garbling due to the console code page on the Git Bash side  
- In environments where you cannot update, switching to UTF-8 with `chcp.com 65001` is effective  
- For continued use, you can persist it by adding it to `.bashrc`

Until now, even when garbling occurred, I dealt with it by manually interpreting the distorted parts.  
Recently, as EC2-related work has increased, the frequency of encountering garbling has also increased, so I researched mitigation methods in this article.  
It took some time to arrive at the solution, so I hope the content of this article is helpful to you.  

Thank you for reading until the end.
