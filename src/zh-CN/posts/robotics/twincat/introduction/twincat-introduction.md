---
title: TwinCAT 开始软件PLC开发（其1：开发环境构建篇）
author: hayato-ota
tags:
  - PLC
  - TwinCAT
date: 2025-04-10T00:00:00.000Z
translate: true

---

# 0. 引言
TwinCAT 是由以开发 EtherCAT 著称的德国企业 Beckhoff Automation GmbH[^1]（以下简称 Beckhoff）提供的面向工业自动化系统的平台。  
这是一种所谓的软件PLC，并且采用了同为软件PLC应用而知名的 CODESYS 作为OEM。  

本文及相关系列文章将分享使用 TwinCAT 进行软件PLC开发的步骤。  

另外，本文使用的 TwinCAT 版本定为 “TwinCAT 3.1 Build 4026”[^3]。

# 1. 什么是 TwinCAT
## TwinCAT 概述
简而言之，它是一款可以将 PC 转变为 PLC 的应用程序。  

由于普通的 Windows 操作系统缺乏实时性，因此在要求时间临界处理的工业应用中可能不适用。通过引入 TwinCAT，可以为基于 PC 的 Windows 系统添加实时控制功能。  

:::info
目前主要支持的操作系统仅为 Windows，但实际上也存在支持 FreeBSD 的 TwinCAT/BSD[^4]。  
此外，据说将来还计划支持 Linux 版[^5]。（预计2025 Q3？）
:::

在 PLC 程序的开发中，除 IEC61131-3 规范规定的五种语言外，还可以使用 C++。

- LD（梯形图）语言  
- FBD（功能块图）语言  
- ST（结构化文本）语言  
- IL（指令表）语言  
- SFC（顺序功能图）语言  
- C++语言  
  - 但存在部分限制

## TwinCAT 与操作系统的关系
与一般应用程序不同，TwinCAT（确切地说是 TwinCAT 的运行环境）在更深层次上运行。  
TwinCAT 独有的实时内核独立于操作系统运行。创建的程序将在内核模式下执行。

![twincat-and-windows](/img/robotics/twincat/introduction/twincat-and-windows.png)  
（上图摘自[此处](https://sites.google.com/site/twincathowto/cc/%E8%83%8C%E6%99%AF%E7%9F%A5%E8%AD%98%E3%81%AE%E7%BF%92%E5%BE%97%E6%BA%96%E5%82%99/twincat-3-cc-%E3%81%AE%E5%9F%BA%E7%A4%8E)）

:::info: 关于 TwinCAT 设计的文档
可以通过以下链接确认 TwinCAT 的设计理念。  
[TwinCAT3 Product Overview - Philosophy](https://infosys.beckhoff.com/english.php?content=../content/1033/tc3_overview/4275768971.html&id=)
:::

## 开发环境（XAE）与运行环境（XAR）
TwinCAT 主要可以分为两种软件。

- XAE（e<b>X</b>tended <b>A</b>utomation <b>E</b>ngineering）  
  - TwinCAT 的开发环境  
  - 用于开发和调试
- XAR（e<b>X</b>tended <b>A</b>utomation <b>R</b>untime）  
  - TwinCAT 的运行环境  
  - 用于实时运行 PLC 程序

这两款软件无需安装在同一台 PC 上，也可以分别安装在不同的 PC 中。  
也就是说，可以实现以下两种系统配置。

- 模式A：XAE/XAR 存在于同一台 PC 上  
  - 这是最简约的配置  
  - 例如：当希望仅用一台 PC 实现时

<img src="/img/robotics/twincat/introduction/twincat-xae-xar-same-pc.png" width="600">

- 模式B：XAE 安装在开发 PC 上，XAR 安装在运行 PC 上  
  - 虽然系统规模扩大，但在多人开发或不希望在开发 PC 上安装运行环境时非常有用  
  - XAE 和 XAR 之间通过一种称为 ADS（Automation Device Specification）的专用协议进行通信  
  - 例如：运行 PC 在现场，而希望在办公室 PC 上开发

<img src="/img/robotics/twincat/introduction/twincat-xae-xar-diff-pc.png" width="700">

本文将以模式B（XAE 和 XAR 分别安装在不同 PC 上）的配置为前提进行说明。

:::stop
前节中提到的在“内核模式下运行”的仅为 XAR，而 XAE 为普通应用程序。  
本文出于风险考虑，**强烈建议将 XAE 和 XAR 安装在不同的 PC 上。**
:::

:::info: 模式A与模式B的混合型  
另一种模式是：在开发 PC 上仅安装 XAE，而在运行 PC 上同时安装 XAE 和 XAR。  
但由于环境冗余，本文不做详细介绍。
:::

# 2. 开发环境构建
这次准备两台 PC，一台安装开发环境（XAE），另一台安装运行环境（XAR）。  
大致流程如下：

1. 创建 Beckhoff 账号  
2. 在开发 PC 上安装 TwinCAT Package Manager  
3. 在开发 PC 上安装 XAE（开发环境）  
4. 在开发 PC 上下载 XAR（运行环境）的软件包  
5. 从开发 PC 将软件包转移到运行 PC  
6. 在运行 PC 上安装 TwinCAT Package Manager  
7. 在运行 PC 上安装 XAR

虽然有点长，但请耐心阅读。

## 系统配置
下图展示了本文将构建的系统配置。

- 开发 PC = 仅运行开发环境的 PC，假设已连接互联网。  
- 运行 PC = 仅运行运行环境的 PC，假设未连接互联网。

:::alert
在本文及相关系列文章中，我们未使用 Beckhoff 制造的工业PC，而使用的是普通笔记本电脑。  
如果注重实时处理性能，请考虑使用工业PC。
:::

<img src="/img/robotics/twincat/introduction/tobe-system-configuration.png" width="600">

## 创建 Beckhoff 账号
请访问 [Beckhoff 官方网站](https://www.beckhoff.com/ja-jp/) ，然后点击页面顶部的 “サインイン（登录）”。  
点击显示处的 “登録（注册）” 按钮，并按照出现的页面注册账号。

![register-beckoff-account](/img/robotics/twincat/introduction/register-beckoff-account.png)

## 安装 TwinCAT Package Manager
与 TwinCAT 相关的软件均使用 TwinCAT Package Manager（在命令中简写为 `tcpkg`）进行安装。

请前往[TwinCAT Package Manager 下载页面](https://www.beckhoff.com/ja-jp/products/automation/twincat/twincat-3-build-4026/)，点击 `Download TwinCAT Package Manager`。

![beckhoff-download-tpkg-button](/img/robotics/twincat/introduction/beckhoff-download-tpkg-button.png)

虽然下载页面会打开，但需要先登录。请点击页面底部的 `Log in` 按钮进行登录。

登录后，点击 `EXE` 按钮即可下载安装程序。

![tcpkg-download](/img/robotics/twincat/introduction/tcpkg-download.png)

运行下载的 exe 文件以安装 TwinCAT Package Manager。

![tcpkg-installer](/img/robotics/twincat/introduction/tcpkg-installer.png)

安装完成后会提示重启，请重启电脑。

## TwinCAT Package Manager 的设置
从桌面快捷方式启动 TwinCAT Package Manager。

![twincat-package-manager-icon](/img/robotics/twincat/introduction/twincat-package-manager-icon.png)

:::info
快捷方式文件的链接地址为 `C:\Program Files(x86)\Beckhoff\TcPkgUi\bin`。
:::

在最先显示的 “Feed Configuration” 页面中，指定软件包的供应源。由于从互联网获取软件包需要账号，请输入账号信息。  

在 Username 中输入账号的邮箱地址，在 Password 中输入密码。输入完毕后点击 Save 按钮。

![tcpkg-feed-configuration](/img/robotics/twincat/introduction/tcpkg-feed-configuration.png)

点击 Save 按钮后会提示 PowerShell 的执行权限，请选择 “OK”。

:::info
在 TwinCAT Package Manager 中进行的操作由后台运行的 PowerShell 执行。  
因此，在后续步骤中会多次出现权限请求，请每次点击 OK。
:::

接下来，在 “Startup configuration” 页面中进行 TwinCAT Package Manager 的初始设置。按如下方式进行设置。

![tcpkg-startup-configuration](/img/robotics/twincat/introduction/tcpkg-startup-configuration.png)

以下是各设置项的详细说明。

- UseVS2022  
  - 是否将开发环境集成到已安装的 VisualStudio 中
- UseTcXaeShell  
  - 是否安装 TwinCAT IDE（TwinCAT 集成开发环境）（32 位版）
- UseTcXaeShell64  
  - 是否安装 TwinCAT IDE（TwinCAT 集成开发环境）（64 位版）

:::info: 关于 UseVS2022 选项
此选项仅在电脑中安装了 VisualStudio 时显示。用于指定是否将 TwinCAT 的开发环境集成到已选的 VisualStudio 中。  
当在 TwinCAT 中构建 C++ 程序时集成是必需的，但会对 VisualStudio 的显示产生一定更改，因此如果不需要，请选择 “No Integration”。
:::

设置无误后，选择页面下部的 Next。之后，请确认显示出类似下图的可安装软件包列表。

![tcpkg-top-screen](/img/robotics/twincat/introduction/tcpkg-top-screen.png)

TwinCAT Package Manager 的设置至此完成。

## 在开发 PC 上安装 XAE
接下来，安装开发环境。  

在 TwinCAT Package Manager 界面中，勾选 “TwinCAT Standard” 部分的复选框。

![tcpkg-select-twincat-standard-package](/img/robotics/twincat/introduction/tcpkg-select-twincat-standard-package.png)

在屏幕右侧会显示 `TwinCAT Standard-Engineering` 和 `TwinCAT Standard-Runtime` 两项。  
由于开发 PC 上不安装运行环境（Runtime），请点击 × 按钮将其删除。

![tcpkg-delete-runtime-selection](/img/robotics/twincat/introduction/tcpkg-delete-runtime-selection.png)

只保留 Engineering 选项，点击 Install 按钮进行安装。

![tcpkg-press-install-button](/img/robotics/twincat/introduction/tcpkg-press-install-button.png)

至此，XAE 的安装完成。为了保险起见，请重启开发 PC。

## 在开发 PC 上下载运行 PC 安装 XAR 所需的所有文件
由于运行 PC 未连接互联网，因此无法采用与开发 PC 相同的方法进行安装。  
因此，需要在开发 PC 上下载必需的文件，并使用 USB 闪存等设备将文件转移到运行 PC。

:::info: 如果运行 PC 已连接互联网
如果运行 PC 可以连接互联网，则可以采用与开发 PC 相同的方法安装 XAR，因此后续步骤可省略。
:::

首先，打开命令提示符或 PowerShell，输入以下命令。

```
tcpkg list -t workload
```

执行后，将显示可安装软件包列表。请确认在列表底部有 “TwinCAT.Standard.XAE” 和 “TwinCAT.Standard.XAR”。

![tcpkg-list](/img/robotics/twincat/introduction/tcpkg-list.png)

:::column: tcpkg 命令
tcpkg 是 TwinCAT Package 的缩写。详细的命令请参阅下列链接。  
[TwinCAT3 - Working with the command line](https://infosys.beckhoff.com/english.php?content=../content/1033/tc3_installation/15698626059.html&id=)
:::

确认后，请一行一行地输入以下命令，下载所需的软件包（实际上是 NuPkg 文件）。  
（输出目录请根据需要自行更改。）

```
tcpkg download TwinCAT.Standard.XAR -o "C:\TwincatOfflineInstaller\XAR"
```

在此请注意以下几点：
- 输出目录必须事先已创建  
- 安装过程中会多次提示确认

## 从开发 PC 向运行 PC 转移所需的所有文件
请使用 USB 闪存等设备，将以下两项文件转移到运行 PC：  

- TwinCAT-Package-Manager 安装文件  
- XAR 文件夹  

本次放置在 `C:\TwincatOfflineInstaller\` 内。

![twincat-installers](/img/robotics/twincat/introduction/twincat-installers.png)

## 在运行 PC 上进行安装
将目标文件转移到运行 PC 后，首先同之前一样安装 TwinCAT Package Manager。安装完成后，启动 TwinCAT Package Manager。  

启动后，在 Feed Configuration 页面中指定软件包的供应源。  
在开发 PC 上是从互联网获取软件包，但因运行 PC 无法连接互联网，因此使用之前转移的包文件。  
在 Feed URL 部分指定放有 XAR 安装包的目录。

用户名和密码保持空白，点击 OK 按钮。

![tcpkg-feed-configuration-offline](/img/robotics/twincat/introduction/tcpkg-feed-configuration-offline.png)

之后，请确认在主界面中显示了 “TwinCAT Standard”。在此界面中选择 “TwinCAT Standard”，并在运行 PC 上同时安装 XAR 的两部分。

至此，运行 PC 的安装完成。

# 3. 防火墙设置
本章将对开发 PC 和运行 PC 之间的通信进行设置。  
两台设备之间将使用 ADS 通信（Automation Device Specification）这一协议。  
默认情况下，由于防火墙的限制，ADS 通信无法进行。需要在设置中允许下表所列端口的通信。请在开发 PC 和运行 PC 上都允许这些端口通信。

| 协议 | 端口号 | 方向    | 用途                   |
| ---- | ------ | ------- | ---------------------- |
| TCP  | 48898  | 接收&发送 | ADS Communication      |
| UDP  | 48899  | 接收&发送 | ADS 广播搜索            |
| TCP  | 8016   | 接收&发送 | Secure ADS             |

:::info
如果开发 PC 和运行 PC 为同一设备，则本章设置无需执行。
:::

## 打开防火墙设置界面
右击屏幕左下角的 Windows 图标，选择 “検索（搜索）”。

![click-start-search](/img/robotics/twincat/introduction/click-start-search.PNG)

在搜索栏中输入并点击 “セキュリティが強化された Windows Defender ファイアウォール（增强安全性的 Windows Defender 防火墙）”。

![open-firewall-settings-dialog](/img/robotics/twincat/introduction/open-firewall-settings-dialog.png)

在该对话框中添加 ADS 通信所需要的设置。

![firewall-settings-dialog](/img/robotics/twincat/introduction/firewall-settings-dialog.png)

## 添加接收规则
在屏幕左侧的 “受信の規則（接收规则）” 上右击，然后点击 “新しい規則（新建规则）”。

![click-new-reception-rule](/img/robotics/twincat/introduction/click-new-reception-rule.png)

请为上述表格中列出的所有三个端口添加规则。  
例如，对于 “TCP 的 48898 端口”，步骤如下：

- 规则类型  
  - 选择 “ポート（端口）”
- 协议及端口  
  - 指定 TCP 和 48898 端口
- 操作  
  - 选择 “接続を許可する（允许连接）”
- 配置文件  
  - 指定所需的配置文件
- 名称  
  - 填写规则的名称和描述

![select-reception-rule-type](/img/robotics/twincat/introduction/select-reception-rule-type.png)
![select-reception-rule-port](/img/robotics/twincat/introduction/select-reception-rule-port.png)
![select-reception-rule-manipulation](/img/robotics/twincat/introduction/select-reception-rule-manipulation.png)
![select-reception-rule-profile](/img/robotics/twincat/introduction/select-reception-rule-profile.png)
![select-reception-rule-name](/img/robotics/twincat/introduction/select-reception-rule-name.png)

:::stop
请对以下所有端口进行设置：
- TCP, 48898 端口  
- UDP, 48899 端口  
- TCP, 8016 端口
:::

设置完成后，接收规则列表应如下图所示。（名称可根据情况自行调整）

![reception-rule-added](/img/robotics/twincat/introduction/reception-rules-added.png)

接收规则设置至此完成。

## 添加发送规则
接着，添加发送规则。（方法与接收规则几乎相同）  
在屏幕左侧的 “送信の規則（发送规则）” → “新しい規則（新建规则）” 中，请同样添加上述三个设置。（详细步骤省略）

:::alert: 在发送规则向导中的 “操作” 页面  
请注意，默认值为 “接続をブロックする（阻止连接）”。
:::

![send-rule-manipulation](/img/robotics/twincat/introduction/send-rule-manipulation.png)

设置完成后，发送规则列表应如下图所示。（名称可根据情况自行调整）

![send-rule-added](/img/robotics/twincat/introduction/send-rule-added.png)

发送规则设置至此完成。

# 4. ADS 通信路由设置
好了，漫长的开发环境构建即将完成。  
最后，为在开发 PC 与运行 PC 之间实现 ADS 通信，进行路由设置[^6]。

:::info: 如果开发 PC 和运行 PC 为同一台 PC  
如果开发 PC 和运行 PC 为同一台 PC，则无需执行本章设置。
:::

:::info: 执行本章内容前  
在执行本章内容前，请使用网线将开发 PC 和运行 PC 连接，并确保它们处于同一网络中。  
<img src="/img/robotics/twincat/introduction/tobe-system-configuration.png" width="600">
:::

在开发 PC 屏幕右下的系统托盘中，右击紫色齿轮图标，并选择 “Router” → “Edit Routes”。

![open-ads-edit-routes](/img/robotics/twincat/introduction/open-ads-edit-routes.png)

随后会显示 “TwinCAT Static Routes” 界面，请点击左下的 “Add” 按钮。

![click-add-route-button](/img/robotics/twincat/introduction/click-add-route-button.png)

显示 “Add Route Dialog” 界面后，请在左下角勾选 “Advanced Settings”。

![ads-enable-advanced-settings](/img/robotics/twincat/introduction/ads-enable-advanced-settings.png)

勾选后，屏幕下部会显示详细的设置项。在 “Address Info” 的选项中选择 “IP Address”。

![ads-change-address-info](/img/robotics/twincat/introduction/ads-change-address-info.png)

点击屏幕右上方的 “Broadcast Search” 按钮，搜索处于同一网络且安装有 XAR 的 PC。

![ads-click-broadcast-search](/img/robotics/twincat/introduction/ads-click-broadcast-search.png)

如果开发 PC 注册了多个以太网适配器（包括 USB 适配器），将会显示 “Select Adapters” 界面来选择要搜索的适配器。  
为防止与非目标设备连接，请仅选择与安装有 XAR 的 PC 相连接的适配器。

![ads-select-adapter](/img/robotics/twincat/introduction/ads-select-adapter.png)

当检测到安装有 XAR 的 PC 后，请确认其 IP 地址等信息，若无问题则点击 “Add Route”。

![ads-select-and-add-route](/img/robotics/twincat/introduction/ads-select-and-add-route.png)

随后会显示 “SecureADS” 界面，请进行远程连接设置。  
在 “Remote User Credentials” 栏中输入目标运行 PC 的用户名和密码。

![ads-enter-remote-user-credentials](/img/robotics/twincat/introduction/ads-enter-remote-user-credentials.png)

:::info: 如果目标运行 PC 是 Beckhoff 制造的 PC  
对于 Beckhoff 制造的 PC，用户名和密码如下：  
User = Administrator  
Password = 1  
[Windows Operating Systems - General Information](https://infosys.beckhoff.com/english.php?content=../content/1033/sw_os/2019206411.html&id=)
:::

连接成功后，在 “Connected” 部分会显示一个锁形图标。  
确认无误后，点击右下的 “Close” 按钮关闭 “Add Route Dialog”。

![ads-check-connected](/img/robotics/twincat/introduction/ads-check-connected.png)

在 “TwinCAT Static Route” 界面中，请确认刚刚添加的路由设置显示出并呈绿色。如果未显示绿色，请再次确认开发 PC 和运行 PC 是否已连接。

![after-route-added](/img/robotics/twincat/introduction/ads-after-route-added.png)

至此，ADS 通信设置完成。

# 5. 结语
虽然内容冗长，但 TwinCAT 开发环境构建到此结束。辛苦了。  
下一篇文章将实际创建 PLC 程序，并在 TwinCAT 上运行。  

【补充】  
在本文撰写过程中，Beckhoff 官方发布了一段解释开发环境构建步骤的视频。请一并观看。

[TwinCAT Howto - V.3.1.4026以降のインストール方法](https://sites.google.com/site/twincathowto/insutoruto-ji-ben-she-ding/v-3-1-4026%E4%BB%A5%E9%99%8D%E3%81%AE%E3%82%A4%E3%83%B3%E3%82%B9%E3%83%88%E3%83%BC%E3%83%AB%E6%96%B9%E6%B3%95?authuser=0)

[^1]: [Beckhoff Automation](https://www.beckhoff.com/ja-jp/)
[^2]: [CODESYS](https://www.codesys.com/)
[^3]: [TwinCAT 3.1 的最新版本：Build 4026](https://www.beckhoff.com/ja-jp/products/automation/twincat/twincat-3-build-4026/)
[^4]: [TwinCAT/BSD](https://www.beckhoff.com/ja-jp/products/ipc/software-and-tools/twincat-bsd/)
[^5]: [针对实时 Linux 的 TwinCAT 运行时](https://www.beckhoff.com/ja-jp/products/product-news/linux-r/)
[^6]: [TwinCAT Howto - 连接到远程系统](https://sites.google.com/site/twincathowto/insutoruto-ji-ben-she-ding/rimotoshisutemuheno-jie-xu?authuser=0)
