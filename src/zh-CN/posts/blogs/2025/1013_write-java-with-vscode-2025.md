---
title: 2025 年版！在 VS Code 中构建 Java 开发环境
author: yasuhiro-endo
date: 2025-10-13T00:00:00.000Z
tags:
  - vscode
  - java
image: true
translate: true

---

## 前言
时代的发展变化迅速，自从[「2024年版！在 VS Code 中构建 Java 开发环境」](https://developer.mamezou-tech.com/blogs/2024/07/18/write-java-with-vscode-2024/)中介绍了 VS Code 的 Java 环境搭建后，已经进行了一些改进。本文将介绍这些改进。

## 使用 Extension Pack for Java Auto Config
这次的结论也是——“只要安装 Extension Pack for Java Auto Config 就行了”。

[Extension Pack for Java Auto Config - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=Pleiades.java-extension-pack-jdk)

该扩展包包含以下内容：
- JDK 的自动配置
- [Extension Pack for Java - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-java-pack)
- [Spring Boot Extension Pack - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=vmware.vscode-boot-dev-pack)
- 其他扩展

只要在原生 VS Code 中安装 Extension Pack for Java Auto Config，便几乎完成了构建 Java 应用或 SpringBoot 应用所需的一切准备。可以说，这就是 VS Code 版的 “Pleiades All in One”（实际上该扩展由 Pleiades 团队开发）。

“Extension Pack for Java”和“Spring Boot Extension Pack”已在[2024年版](https://developer.mamezou-tech.com/blogs/2024/07/18/write-java-with-vscode-2024/)中讲解，这里略去说明。

## JDK 的自动配置
这是该扩展的主要功能。该扩展内部包含多个 JDK（至少 3 个 LTS 版本以及最新版本）。当打开包含 Maven 项目的文件夹时，会自动配置为使用最适合的 JDK。同时还包含 Maven 和 Gradle，因此无需安装这些工具就可以开始开发。

从 VS Code 启动终端时，也可以根据各 JDK 环境启动相应的终端。

![terminal](https://raw.githubusercontent.com/cypher256/java-extension-pack/main/image/terminal.png)

## Windows 环境下的日语乱码对策
在 Windows 环境下运行 Java 应用时，终端日志输出有时会出现乱码，因此需要进行相应的对策。

### 使用 JDK18 及以上版本时
JDK18 及以上版本的默认字符编码是 UTF-8，但终端的默认字符编码是 MS932，可能会导致乱码。要解决此问题，需要强制将终端的字符编码设置为 UTF-8。  
打开注册表编辑器，定位到  
\HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Command Processor  

在该位置创建如下值：
- 值名称：Autorun
- 值数据：chcp 65001 > nul

![regedit](/img/blogs/2025/1013_write-java-with-vscode-2025/regedit.png)

请注意，最后部分不是“null”，而是“nul”。

### 使用 JDK17 及以下版本时
在保留上述设置的情况下使用 JDK17 及以下版本时，JDK 的字符编码为 MS932，而终端为 UTF-8，会出现乱码。这时，需要设置以下环境变量，将 JDK 的字符编码改为 UTF-8：

JAVA_TOOL_OPTIONS=-Dfile.encoding=UTF-8

![environment](/img/blogs/2025/1013_write-java-with-vscode-2025/environment.png)

## 其他扩展
下面来看一下 Extension Pack for Java Auto Config 所添加的其他扩展。

### [XML - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-xml)
它为 XML 提供输入辅助功能。例如，将鼠标悬停在标签上时，会显示模式（schema）中编写的文档说明。  
![maven_parent](/img/blogs/2025/1013_write-java-with-vscode-2025/maven_parent.png)

### [Code Spell Checker - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker)
它可以对代码和注释进行拼写检查。  
![spell_checker](/img/blogs/2025/1013_write-java-with-vscode-2025/spell_checker.png)

### [TODO Tree - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=Gruntfuggly.todo-tree)
它会列出源代码中的 TODO 和 FIXME。  
![todo_tree](/img/blogs/2025/1013_write-java-with-vscode-2025/todo_tree.png)

### [Live Server - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
这是一个便于检查 HTML、CSS 等内容的简易服务器。在打开 HTML 文件的状态下，点击右下角的 “Go Live” 按钮，即可在浏览器中显示 HTML。借助 Live Reload 功能，对 HTML 进行修改后，无需手动刷新浏览器，修改会立即生效。  
![live_server](/img/blogs/2025/1013_write-java-with-vscode-2025/live_server.png)

### [Trailing Spaces - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=shardulm94.trailing-spaces)
它可以高亮显示并删除行尾空白。  
![trailing_spaces](/img/blogs/2025/1013_write-java-with-vscode-2025/trailing_spaces.png)

### [indent-rainbow - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=oderwat.indent-rainbow)
它可以高亮显示缩进。  
![indent_colored](/img/blogs/2025/1013_write-java-with-vscode-2025/indent_colored.png)

### [Rainbow CSV - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=mechatroner.rainbow-csv)
它可以高亮显示 CSV 文件。  
![csv_colored](/img/blogs/2025/1013_write-java-with-vscode-2025/csv_colored.png)

## 最后
通过 Extension Pack for Java Auto Config，只需安装这一项，即可搭建 Java 应用/SpringBoot 应用的开发环境，这样做确实很方便。与 Eclipse 或 IntelliJ IDEA 等集成环境相比，在功能方面还是逊色一些。另一方面，考虑到 VS Code 免费且运行轻快，而且在 AI 支持方面比集成环境更快速，因此将 VS Code 用作 Java 开发环境也是一个不错的选择。
