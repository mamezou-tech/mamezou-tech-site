---
title: 从 VS Code 开始！易懂易用的 C# 开发环境搭建【2025 年版手册】
author: yoshihiro-tamori
date: 2025-07-05T00:00:00.000Z
tags:
  - vscode
  - dotnet
  - csharp
  - 開発環境
image: true
translate: true

---

大家在进行 C# 开发时都使用什么工具？在工作中通常是 Visual Studio Professional，私下则是 Visual Studio Community，这是常见的组合吧。

作为 C# 的标准开发环境，推荐使用 Visual Studio，但是会不会在 VS Code 中也能进行 C# 开发呢？抱着这个想法调查后，果然可以。

本文将介绍在 VS Code 中构建 C# 开发环境的步骤。基本上只需安装扩展并运行一些命令即可。

希望对那些已经习惯 VS Code，想在其中进行 C# 开发的人，以及因为 Visual Studio 价格较高而考虑使用 VS Code 进行开发的人有所帮助。

## VS Code 的下载与安装

首先从官方网站下载并安装 VS Code。

[Download Visual Studio Code - Mac, Linux, Windows](https://code.visualstudio.com/download)

## 安装扩展

安装好 VS Code 后，接下来就是安装扩展了。

赶快启动 VS Code 吧。顺便提供一篇关于安装扩展的参考文章。这是 Microsoft 官方的文章。

[https://learn.microsoft.com/ja-jp/training/modules/install-configure-visual-studio-code/5-exercise-configure-visual-studio-code](https://learn.microsoft.com/ja-jp/training/modules/install-configure-visual-studio-code/5-exercise-configure-visual-studio-code)

首先在 VS Code 中点击扩展图标。

![扩展图标的位置](/img/dotnet/csharp_vscode/csharp_vscode1.png)

此时会出现搜索框，输入 C#。

![在搜索框输入 C#](/img/dotnet/csharp_vscode/csharp_vscode2.png)

出现搜索结果后，选择 C# Dev Kit 并点击安装按钮。

![选择 C# Dev Kit 并点击安装](/img/dotnet/csharp_vscode/csharp_vscode3.png)

接下来安装 IntelliCode for C# Dev Kit。IntelliCode 比 IntelliSense 更强大。提到 C# 和 Visual Studio，大家都知道 IntelliSense 的智能补全功能很强大，而它还有更进化的版本。

![从“视图”菜单中选择命令面板](/img/dotnet/csharp_vscode/csharp_vscode4.png)

详细内容请阅读此文章。

[https://qiita.com/yossy6954/items/f4c8b5f5f8f4c7a843c6](https://qiita.com/yossy6954/items/f4c8b5f5f8f4c7a843c6)

接着从“视图”菜单中选择命令面板。

![输入 .NET: Install New](/img/dotnet/csharp_vscode/csharp_vscode5.png)

输入 .NET: Install New，并查找 .NET: Install New .NET SDK。

![安装 .NET SDK](/img/dotnet/csharp_vscode/csharp_vscode6.png)

点击安装按钮安装 .NET SDK。

![确认 .NET SDK 安装](/img/dotnet/csharp_vscode/csharp_vscode7.png)

安装完成后，重启 Visual Studio Code。重启后，输入 dotnet --version 来确认是否安装成功。如果没有报错并显示了版本号，则表示 OK。

![新建项目](/img/dotnet/csharp_vscode/csharp_vscode8.png)

到此为止，安装已完成。

## 创建 C# 项目

接下来我们来创建一个 C# 项目。

### 创建控制台应用程序

首先创建一个控制台应用程序。

在终端中输入如下命令，即可新建项目（请根据需要更改目录和项目名称）。

`dotnet new console -o C:\Development\SampleProject`

以上是在 Windows 下的示例，如果在 Mac 上，请输入如下命令（请根据需要更改目录和项目名称）。

`dotnet new console -o /dev/SampleProject`

![确认项目创建](/img/dotnet/csharp_vscode/csharp_vscode9.png)

在资源管理器中确认文件夹已创建。

![打开已创建的项目](/img/dotnet/csharp_vscode/csharp_vscode10.png)

在 Visual Studio Code 中打开已创建的项目。

![已打开已创建的项目](/img/dotnet/csharp_vscode/csharp_vscode11.png)

如果能看到项目文件夹下的文件和文件夹，则表示正常。

![构建项目](/img/dotnet/csharp_vscode/csharp_vscode12.png)

既然已经创建了项目，就想运行看看吧。在终端中输入 dotnet build。

![运行项目](/img/dotnet/csharp_vscode/csharp_vscode13.png)

构建完成后，在终端中输入 dotnet run。

![显示了 Hello, World!](/img/dotnet/csharp_vscode/csharp_vscode14.png)

Hello, World 已显示。

![尝试更改消息](/img/dotnet/csharp_vscode/csharp_vscode15.png)

修改控制台显示的消息后保存，再次运行试试。像之前一样，在终端中输入 dotnet build 和 dotnet run。

![消息已更改](/img/dotnet/csharp_vscode/csharp_vscode16.png)

运行后消息已更改。

![创建 Web 应用](/img/dotnet/csharp_vscode/csharp_vscode17.png)

### 创建 Web 应用程序

到目前为止只创建了控制台应用，可能有点不够用。接下来我们来创建 Web 应用。

在终端中输入以下命令（new 后面指定的字符串是项目类型）。请根据需要更改目录和项目名称。

`dotnet new web -o C:\Development\SampleWeb`

以上是在 Windows 下的示例，如果在 Mac 上，请输入如下命令（请根据需要更改目录和项目名称）。

`dotnet new web -o /dev/SampleWeb`

![确认 Web 项目创建](/img/dotnet/csharp_vscode/csharp_vscode18.png)

在资源管理器中确认项目已创建。

![打开已创建的项目](/img/dotnet/csharp_vscode/csharp_vscode19.png)

在菜单中选择“打开文件夹”，然后选择已创建项目的文件夹。

![已打开已创建的项目](/img/dotnet/csharp_vscode/csharp_vscode20.png)

此时会显示 Web 应用的项目结构。

![运行项目](/img/dotnet/csharp_vscode/csharp_vscode21.png)

在 Hello World 后添加一些任意字符串并运行试试。运行时在终端输入 dotnet build 和 dotnet run。

![确认 localhost 的 URL](/img/dotnet/csharp_vscode/csharp_vscode22.png)

遗憾的是，从 Visual Studio Code 运行时，不会自动启动 IIS Express，也不会自动打开浏览器显示界面。

而从 Visual Studio 运行则会自动打开浏览器显示页面。

查看 Properties 文件夹中的 launchSettings.json，确认 URL，然后在浏览器中输入该 URL。

![在 localhost 上确认运行](/img/dotnet/csharp_vscode/csharp_vscode23.png)

如果能够正常显示，则表示成功。

## 结束语

在 VS Code 中构建 C# 开发环境后，我深刻体会到，Visual Studio 果然方便又省事。毕竟大部分操作都可以通过 GUI 完成。

不过在 VS Code 中构建开发环境也并不算太难（安装时间较长，但安装 Visual Studio 或 C# 也差不多是这个时间）。
