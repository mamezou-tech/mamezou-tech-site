---
title: 在 Git Bash 中使用 AWS Session Manager 时的乱码处理方法
author: takahiro-maeda
date: 2026-03-24T00:00:00.000Z
tags:
  - AWS
  - SSM
  - terminal
image: true
translate: true

---

## 介绍

通常在工作中，你使用什么操作系统？  
笔者个人使用 Mac，但在工作中使用 Windows。

在 Windows 环境下，我使用轻量且易于操作、可进行类似 POSIX 操作的 Git Bash。  
因为也可以在 Windows Terminal 中使用，所以可以直接使用平时熟悉的命令，而且与 AWS CLI 的兼容性良好，这一点也很方便。

@[og](https://developer.mamezou-tech.com/blogs/2023/09/08/windows-terminal-with-git-bash/)

基于上述原因，通过 AWS Systems Manager Session Manager（以下简称 SSM）连接 EC2 时也使用了 Git Bash。  
但是，在 Windows 环境下的 Git Bash 中，`lsblk` 和 `systemctl status` 等命令所包含的部分框线和符号有时会出现乱码。

本文将介绍此现象的复现内容、原因以及处理方法。

结论是，**将 session-manager-plugin 更新到最新版 是首选方案**。  
如果难以更新，则**通过 `chcp.com 65001` 将代码页更改为 UTF-8**的方法也是有效的。

另外，从 Mac 连接时不会出现相同的问题。

## 前提条件

在以下环境中进行了验证。

- OS: Windows: 11(Pro)  
- Terminal: Git Bash  
- AWS CLI:  `aws-cli/2.32.16 Python/3.13.11 Windows/11 exe/AMD64`  
- session-manager-plugin: `1.2.707.0(検証開始時)→1.2.792.0(解決)`

适用于以下人群：

- 在 Windows + Git Bash 中使用 AWS CLI/SSM 连接 EC2 的用户。  
- 在执行 `lsblk` 或 `systemctl status` 时出现框线、符号等乱码的用户。

## 先行结论

处理方法如下：

| 优先级 | 处理方法                                              | 备注                              |
| ---- | ----------------------------------------------------- | --------------------------------- |
| 1    | 将 `session-manager-plugin` 更新至最新版（`1.2.792.0` 及以上） | 根本性解决方案。推荐优先使用        |
| 2    | 执行 `chcp.com 65001`                                 | 插件无法更新时的临时对策           |
| 3    | 在 `.bashrc` 中进行设置                               | 若持续使用临时对策，则进行持久化设置 |

## 推荐对策：将 session-manager-plugin 更新至最新版

在验证过程中，已确认**将 `session-manager-plugin` 更新至最新版后可解决该现象**。

※该版本是在本文撰写及验证时的三天前发布的最新版。

在撰写本文时，将插件更新至最新版 `1.2.792.0` 后，乱码现象已无法复现。

安装方法请参阅以下 AWS 官方文档。

[在 Windows 上安装 Session Manager 插件](https://docs.aws.amazon.com/ja_jp/systems-manager/latest/userguide/install-plugin-windows.html)

### 为什么在 `1.2.792.0` 中得到改善

在撰写本文时的最新版 `1.2.792.0` 的发行说明中，包含了针对 Windows 环境下键盘输入及字符处理的修复。

- [session-manager-plugin 1.2.792.0 发布页](https://github.com/aws/session-manager-plugin/releases/tag/1.2.792.0)

查看与 `1.2.792.0` 相关的以下 PR，可见与本文现象相似的问题已被修复。

- [PR: 修复 Windows 平台上中文及日文字符显示异常的问题](https://github.com/aws/session-manager-plugin/pull/115)

PR 中说明，Windows 版 `session-manager-plugin` 在输出时使用了 `windows.WriteFile` API，导致对 `UTF-8` 编码的部分语言字符无法正确处理。

由此，推测在中文和日文的部分输入输出中出现了乱码。

本文中确认的乱码问题，很可能也在包含该修复的 `1.2.792.0` 中得到改善。

---

本文后半总结了**使用旧版本（`1.2.707.0`）时的复现内容及临时对策**。  
首先请将插件更新至最新版，确认问题是否解决。

## 乱码现象（旧版插件情况下）

当使用旧版本插件（例如：`1.2.707.0`）时，执行如下命令时会出现乱码：

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

本次验证使用了 Amazon Linux 2023 和 Ubuntu 24.04 的官方 AMI，但与 AMI 无关，在相同位置均出现乱码。

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

如您所见，框线和状态图标均出现了乱码。

## 原因

经检查，这些字符对应如下：

| 原本 | Unicode                                                                         | 乱码                |
| ---- | ------------------------------------------------------------------------------ | ------------------ |
| `├─` | [U+251C](https://0g0.org/unicode/251C/), [U+2500](https://0g0.org/unicode/2500/) | `笏懌楳`           |
| `└─` | [U+2514](https://0g0.org/unicode/2514/), [U+2500](https://0g0.org/unicode/2500/) | `笏披楳`           |
| `●`  | [U+25CF](https://0g0.org/unicode/25CF/)                                         | `笳`（末尾不正确） |

由此可知，本次乱码是因为 UTF-8 的字符串被错误地当作 CP932（Shift_JIS 系）进行了解释。

也就是说，SSM 途径接收到的字符串与 Git Bash 端控制台的页面字符编码设置不一致，导致框线和符号无法正确显示。

## Git Bash 端的设置检查与临时对策

### 检查当前 Git Bash 的设置

在本次环境中，执行 `chcp.com` 的结果为 CP932。

如需检查自身 Git Bash 的当前设置，可通过以下命令确认：

```bash
chcp.com
現在のコード ページ: 932
```

### 临时对策：将控制台字符编码更改为 UTF-8

:::info
首先请将 `session-manager-plugin` 更新至最新版，并确认问题是否已解决。  
此处介绍的方法为插件无法更新时的临时对策。
:::

无法下载最新版或安装受限的环境用户，可尝试以下命令，将当前页面编码更改为 UTF-8：

```bash
chcp.com 65001
Active code page: 65001
```

:::column 为什么使用 chcp.com
在 Git Bash 上直接使用 `chcp` 无法识别，也无法按预期运行。  
这是因为需要显式调用 Windows 标准的 `C:\Windows\System32\chcp.com`。
:::

#### 参考信息

- [解决 Git Bash 中日语乱码的方法](https://github.com/fs5013-furi-sutao/explain.how_to_fix_garbled_japanese_text.on_gitbash)
- [Qiita: 在 Git Bash 中转换字符编码的方法（Windows）](https://qiita.com/BlackMagician/items/1de399c5b577f7514de8)
- [Microsoft chcp](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/chcp)
- [Microsoft Code Page Identifiers](https://learn.microsoft.com/en-us/windows/win32/intl/code-page-identifiers)

## 结果

更改控制台字符编码为 UTF-8 后，再次确认发现之前出现乱码的位置已正常输出。

如果更新并使用了最新版 `session-manager-plugin`，即使不执行 `chcp.com 65001`，也能正常输出，无乱码。

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

## 持久化设置

如果每次都更改代码页很麻烦，可在 `.bashrc` 中进行设置，让 Git Bash 启动时自动切换到 UTF-8。

```bash
echo 'chcp.com 65001 > /dev/null' >> ~/.bashrc
```

## 总结

本文介绍了在 Git Bash 中使用 SSM 时出现的乱码原因及处理方法。

要点总结如下：

- 首先将 `session-manager-plugin` 更新至最新版  
- 如果使用旧版插件，可能因为 Git Bash 端的页面字符编码导致乱码  
- 在无法更新的环境中，执行 `chcp.com 65001` 将其设为 UTF-8 是有效的  
- 若需持续使用，可在 `.bashrc` 中进行设置以实现持久化  

过去即使出现乱码，也只能手动查看并对照修正。  
最近 EC2 相关操作增多，遇到乱码的频率也提高，因此本文调查了处理方法。  
由于找到解决方法耗时较长，希望本文内容能对您有所帮助。  
感谢您阅读至此。
