---
title: 2025 Edition! Building a Java Development Environment with VS Code
author: yasuhiro-endo
date: 2025-10-13T00:00:00.000Z
tags:
  - vscode
  - java
image: true
translate: true

---

## Introduction
Time moves quickly, and since [the 2024 Edition! Setting up a Java Development Environment with VS Code](https://developer.mamezou-tech.com/blogs/2024/07/18/write-java-with-vscode-2024/) introduced how to configure a Java environment in VS Code, several improvements have been made. This time, we will introduce those.

## Using Extension Pack for Java Auto Config
Once again, to cut to the chase, it all boils down to “Just install the Extension Pack for Java Auto Config.”

[Extension Pack for Java Auto Config - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=Pleiades.java-extension-pack-jdk)

This extension pack consists of the following:
- Automatic JDK configuration
- [Extension Pack for Java - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-java-pack)
- [Spring Boot Extension Pack - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=vmware.vscode-boot-dev-pack)
- Additional extensions

By simply installing the Extension Pack for Java Auto Config on a vanilla VS Code, you’re almost done preparing to create Java apps or Spring Boot apps. You could say it’s a VS Code version of “Pleiades All in One” (in fact, this extension is developed by the Pleiades team).

The Extension Pack for Java and Spring Boot Extension Pack were explained in the 2024 Edition, so their explanations are omitted here.

## Automatic JDK Configuration
This is the main feature of the extension. Internally, it includes multiple JDKs (at least three LTS versions and the latest version). When you open a folder containing a Maven project, for example, it automatically configures the optimal JDK for you. It also includes Maven and Gradle, so you can start development without installing them separately.

When launching a terminal from VS Code, you can also open a terminal tailored to each JDK environment.

![terminal](https://raw.githubusercontent.com/cypher256/java-extension-pack/main/image/terminal.png)

## Preventing Garbled Japanese Characters in Windows Environments
When running Java applications on Windows, log output to the terminal can sometimes appear garbled, so here are some fixes.

### Using JDK 18 or Later
The default character encoding for JDK 18 and later is UTF-8, whereas the terminal’s default encoding is MS932, which can cause garbled characters. To fix this, force the terminal encoding to UTF-8. Launch the Registry Editor and open the following key:
\HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Command Processor

Create the following value here:
- Value name: Autorun
- Value data: chcp 65001 > nul

![regedit](/img/blogs/2025/1013_write-java-with-vscode-2025/regedit.png)

Be careful that the last part is “nul”, not “null”.

### Using JDK 17 or Earlier
If you use JDK 17 or earlier with the above settings, the JDK’s encoding will be MS932 while the terminal is UTF-8, causing garbled characters. To address this, set the following environment variable to enforce UTF-8 encoding for the JDK:

JAVA_TOOL_OPTIONS=-Dfile.encoding=UTF-8

![environment](/img/blogs/2025/1013_write-java-with-vscode-2025/environment.png)

## Additional Extensions
Let’s take a look at the other extensions that Extension Pack for Java Auto Config adds.

### [XML - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-xml)
Provides input assistance for XML. For example, hovering the cursor over a tag displays documentation from the schema.  
![maven_parent](/img/blogs/2025/1013_write-java-with-vscode-2025/maven_parent.png)

### [Code Spell Checker - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker)
Checks spelling in code and comments.  
![spell_checker](/img/blogs/2025/1013_write-java-with-vscode-2025/spell_checker.png)

### [TODO Tree - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=Gruntfuggly.todo-tree)
Displays a list of TODOs and FIXMEs in the source code.  
![todo_tree](/img/blogs/2025/1013_write-java-with-vscode-2025/todo_tree.png)

### [Live Server - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
A simple server useful for previewing HTML, CSS, and more. With an HTML file open, click “Go Live” in the bottom right corner to display it in your browser. Thanks to the Live Reload feature, changes to the HTML are reflected in the browser without reloading.  
![live_server](/img/blogs/2025/1013_write-java-with-vscode-2025/live_server.png)

### [Trailing Spaces - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=shardulm94.trailing-spaces)
Highlights and removes trailing spaces.  
![trailing_spaces](/img/blogs/2025/1013_write-java-with-vscode-2025/trailing_spaces.png)

### [indent-rainbow - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=oderwat.indent-rainbow)
Highlights indent levels.  
![indent_colored](/img/blogs/2025/1013_write-java-with-vscode-2025/indent_colored.png)

### [Rainbow CSV - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=mechatroner.rainbow-csv)
Highlights CSV files.  
![csv_colored](/img/blogs/2025/1013_write-java-with-vscode-2025/csv_colored.png)

## Conclusion
Thanks to the Extension Pack for Java Auto Config, just installing this one package makes setting up a development environment for Java apps or Spring Boot apps much more convenient. While it may be inferior in features compared to IDEs like Eclipse or IntelliJ IDEA, VS Code is free, lightweight, and integrates AI features faster than those IDEs, so I think using VS Code as a Java development environment is a viable option.
