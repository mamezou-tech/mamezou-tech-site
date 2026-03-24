---
title: >-
  Getting Started with VS Code! Clear & Practical C# Development Environment
  Setup [2025 Edition Manual]
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

Everyone, what do you use for C# development? At work you probably use Visual Studio Professional, and for personal projects Visual Studio Community is the standard, right?

The standard tool for C# development is Visual Studio, but you might be wondering if you can develop C# in VS Code as well. When I looked into it, I found that indeed you can.

In this article, I’ll explain how to set up a C# development environment in VS Code. Basically, you just install extensions and run some commands.

I hope this will be helpful for those who are familiar with VS Code and want to use it for C# development, as well as for those considering using VS Code because Visual Studio is expensive.

## Download and Install VS Code

First, download and install VS Code from the official site.

[Download Visual Studio Code - Mac, Linux, Windows](https://code.visualstudio.com/download)

## Install Extensions

After installing VS Code, next is to install the extensions.

Let’s launch VS Code right away. By the way, here’s a reference article on installing extensions. It’s an official Microsoft article.

[https://learn.microsoft.com/ja-jp/training/modules/install-configure-visual-studio-code/5-exercise-configure-visual-studio-code](https://learn.microsoft.com/ja-jp/training/modules/install-configure-visual-studio-code/5-exercise-configure-visual-studio-code)

First, click the Extensions icon in VS Code.  
![Location of the Extensions icon](/img/dotnet/csharp_vscode/csharp_vscode1.png)

A search box will appear, so type `C#`.  
![Type 'C#' in the search box](/img/dotnet/csharp_vscode/csharp_vscode2.png)

When the search results appear, select `C# Dev Kit` and click the Install button.  
![Select 'C# Dev Kit' and install](/img/dotnet/csharp_vscode/csharp_vscode3.png)

Next, install `IntelliCode for C# Dev Kit`. IntelliCode is more powerful than IntelliSense. C# and Visual Studio are well known for their powerful IntelliSense code completion, but there’s an even more advanced version.  
![Select Command Palette from the View menu](/img/dotnet/csharp_vscode/csharp_vscode4.png)

For details, please read this article.  
[https://qiita.com/yossy6954/items/f4c8b5f5f8f4c7a843c6](https://qiita.com/yossy6954/items/f4c8b5f5f8f4c7a843c6)

Next, select Command Palette from the View menu.  
![Type '.NET: Install New'](/img/dotnet/csharp_vscode/csharp_vscode5.png)

Type `.NET: Install New` and look for `.NET: Install New .NET SDK`.  
![Install .NET SDK](/img/dotnet/csharp_vscode/csharp_vscode6.png)

Click the Install button to install the .NET SDK.  
![Confirm .NET SDK installation](/img/dotnet/csharp_vscode/csharp_vscode7.png)

Once the installation is complete, restart Visual Studio Code. After restarting, run `dotnet --version` in the terminal to confirm the installation. If it displays the version without errors, you’re good.  
![Create a new project](/img/dotnet/csharp_vscode/csharp_vscode8.png)

At this point, the installation is complete.

## Creating a C# Project

Next, let’s create a C# project.

### Creating a Console App

First, let’s create a console app.

By running the following command in the terminal, you can create a new project (please adjust the directory and project name as appropriate).

```bash
dotnet new console -o C:\Development\SampleProject
```

The above is for Windows. For Mac, run the following command (adjust the directory and project name as needed).

```bash
dotnet new console -o /dev/SampleProject
```

![Confirm project creation](/img/dotnet/csharp_vscode/csharp_vscode9.png)

Confirm that the folder has been created in the Explorer.  
![Open the created project](/img/dotnet/csharp_vscode/csharp_vscode10.png)

Open the created project in Visual Studio Code.  
![Created project opened](/img/dotnet/csharp_vscode/csharp_vscode11.png)

If you see the files and folders under the project folder displayed, it’s OK.  
![Build the project](/img/dotnet/csharp_vscode/csharp_vscode12.png)

Since you’ve created the project, you’d want to run it, right? In the terminal, type:

```bash
dotnet build
```
![Run the project](/img/dotnet/csharp_vscode/csharp_vscode13.png)

After the build finishes, in the terminal type:

```bash
dotnet run
```
![Hello, World! displayed](/img/dotnet/csharp_vscode/csharp_vscode14.png)

Hello, World! was displayed.  
![Change the message](/img/dotnet/csharp_vscode/csharp_vscode15.png)

Change the message displayed in the console, save, and run it. As before, run:

```bash
dotnet build
dotnet run
```
![The message has changed](/img/dotnet/csharp_vscode/csharp_vscode16.png)

When you ran it, the message changed.  
![Create a Web App](/img/dotnet/csharp_vscode/csharp_vscode17.png)

### Creating a Web App

Up to this point it’s a console app, which might feel a bit lacking. So next, let’s create a web app.

In the terminal, run the following command (the word after `new` specifies the type of project). Adjust the directory and project name as needed.

```bash
dotnet new web -o C:\Development\SampleWeb
```

The above is for Windows, so on Mac run the following command (adjust the directory and project name as needed).

```bash
dotnet new web -o /dev/SampleWeb
```

![Confirm Web project creation](/img/dotnet/csharp_vscode/csharp_vscode18.png)

Confirm that the project has been created in the Explorer.  
![Open the created project](/img/dotnet/csharp_vscode/csharp_vscode19.png)

From the menu, choose “Open Folder” and select the folder of the project you created.  
![Created project opened](/img/dotnet/csharp_vscode/csharp_vscode20.png)

The web app project is displayed.  
![Run the project](/img/dotnet/csharp_vscode/csharp_vscode21.png)

Add an arbitrary string to “Hello World” and try running it. To run it, type the following in the terminal:

```bash
dotnet build
dotnet run
```
![Check the localhost URL](/img/dotnet/csharp_vscode/csharp_vscode22.png)

Unfortunately, when running from Visual Studio Code, IIS Express does not automatically start and a browser window does not automatically open to display the page.

Visual Studio, however, automatically opens the browser for you.

Open the `launchSettings.json` in the Properties folder, check the URL, and enter that URL into your browser.  
![Confirm operation on localhost](/img/dotnet/csharp_vscode/csharp_vscode23.png)

If it displays correctly, you’re all set.

## Conclusion

After setting up a C# development environment with VS Code, I felt once again that Visual Studio is convenient and easy. It’s almost entirely GUI-based, after all.

That said, you can set up the development environment with VS Code without too much difficulty (the installation takes a while, but that’s to be expected when installing Visual Studio or C#).
