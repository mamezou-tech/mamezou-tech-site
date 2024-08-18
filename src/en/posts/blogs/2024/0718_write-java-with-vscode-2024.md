---
title: 2024 Edition! Building a Java Development Environment with VS Code
author: masahiro-kondo
date: 2024-07-18T00:00:00.000Z
tags:
  - vscode
  - java
image: true
translate: true
---

:::info
To reach a broader audience, this article has been translated from Japanese.
You can find the original version [here](https://developer.mamezou-tech.com/blogs/2024/07/18/write-java-with-vscode-2024/).
:::

## Introduction
Many Java developers likely use IntelliJ IDEA or Eclipse. I use VS Code. I had been away from Java for a long time in my work, but I have been writing quite a bit in recent years. I used to pay for IntelliJ IDEA, but with my return to Java, I set up an environment in VS Code. In this article, I would like to introduce some standard extensions and how to use workspaces.

## Using Microsoft Extension Pack for Java
To conclude, "Let's install the Microsoft Extension Pack for Java."

[Extension Pack for Java - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-java-pack)

As the name suggests, the Extension Pack is a collection of multiple extensions, and currently, it installs six extensions. Let's take a look at what these are.

The first is the Java Language Support extension. This extension is provided solely by RedHat. It offers core features as a Java IDE using the Language Server Protocol, such as code highlighting, code completion, displaying compile errors, and JavaDoc hover displays for methods.

[Language Support for Java(TM) by Red Hat - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=redhat.java)

The second is the debugger extension provided by Microsoft. It allows you to set breakpoints and debug within VS Code. I don't use the debugger much, so I haven't utilized it[^1].

[^1]: In fact, I found out that it was disabled when I checked the settings.

[Debugger for Java - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-java-debug)

The third is the automated testing extension provided by Microsoft. It supports JUnit4, JUnit5, and TestNG. You can run tests, debug tests, and view results.

[Test Runner for Java - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-java-test)

The fourth is the Maven extension provided by Microsoft. Maven is indeed the standard build tool for Java, so it is included in the Extension Pack.

[Maven for Java - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-maven)

The fifth is the Project Manager extension provided by Microsoft. It works in conjunction with RedHat's Language Support to provide a Java Project view in VS Code.

[Project Manager for Java - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-java-dependency)

The Java Project view is similar to the Explorer but is a UI provided by the Project Manager.

![Java Project View](https://i.gyazo.com/ee405baf231296d59b4830351fd3f6b8.png)

If the Project is recognized in this view, code completion and JavaDoc hover displays will be enabled in the editor.

The sixth is the IntelliCode extension provided by Microsoft. This AI assist extension supports TypeScript, JavaScript, and Python in addition to Java. It does not seem to be an extension for Copilot[^2].

[^2]: I am not aware of how this extension functions.

[IntelliCode - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=VisualStudioExptTeam.vscodeintellicode)

That concludes the contents of the Extension Pack. If you are using Maven, this setup is sufficient.

## Other Extensions

Since I use Gradle, I have added the Gradle extension in addition to the Extension Pack for Java.

[Gradle for Java - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-gradle)

Additionally, there are extensions that support major frameworks like Spring Boot, MicroProfile, and Quarkus.

[Spring Boot Extension Pack - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=vmware.vscode-boot-dev-pack)

[Extension Pack for MicroProfile - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=MicroProfile-Community.vscode-microprofile-pack)

[Quarkus - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-quarkus)

If you are using an application server, there are also extensions for Tomcat and Jetty. You can manage WAR packages.

[Tomcat for Java - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=adashen.vscode-tomcat)

[Jetty for Java - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=SummerSun.vscode-jetty)

## Using VS Code Workspaces
If you have a single Java project, you can simply open the project folder, but nowadays, with the trend towards microservices, it is common to handle multiple Java projects. In a multi-repo structure where repositories are separated for each project, you can consolidate the directories of multiple cloned repositories into a single workspace in VS Code.

:::info
In the case of a monorepo where multiple Java projects are managed in a single repository, using the project root folder might cause some projects not to be recognized as Java projects. Therefore, it is recommended to create a workspace even for monorepos.
:::

Workspace information is stored in a file with the `.code-workspace` extension. The paths of each project are stored in the `folders` array.

```json:my-project.code-workspace
{
	"folders": [
		{
			"path": "/path/to/app1-service"
		},
		{
			"path": "/path/to/app2-service"
		},
		{
			"path": "/path/to/app3-service"
		}
	],
	"settings": {
		"workbench.colorTheme": "Tomorrow Night Blue"
	}
}
```

VS Code settings can be applied at three scopes: user-level (global), workspace-level, and folder-level. When you add settings in the workspace tab, they are added to the workspace file[^3]. In the example of the above workspace file (my-project.code-workspace), the theme for VS Code is changed from the user level.

[^3]: In the case of folder-level, a `.vscode/settings.json` is created in the root.

![Workspace settings](https://i.gyazo.com/6d2bae58a5d7698a38121154be5e7eed.png)

Extensions can also be enabled or disabled at the workspace level, allowing you to avoid loading extensions for other languages that you do not use, thus saving memory.

![Disable extensions](https://i.gyazo.com/f8c00abe06ee107b61de27a7e2c61b1b.png)

To create a new workspace, click "Save Workspace As" from the file menu while no files or folders are open in VS Code.

![New Workspace](https://i.gyazo.com/4712484cc0cd303b0b608d804b29a691.png)

Specify the folder you want to save and save it, and the workspace file will be saved and loaded.

![Save Workspace](https://i.gyazo.com/be34cdc3515be91556d010b1d1a8a704.png)

To add a Java project to the workspace, click "Add Folder to Workspace" from the file menu or the context menu in the Explorer, and specify the folder of the Java project.

![Add folder to workspace](https://i.gyazo.com/bfce1c02b2b74195a4cb9f5393ba44a3.png)

:::column: Managing Workspace Files
I believe that workspace files are not suitable for management in a repository. Even within the same team, preferences for projects and settings often differ among individuals. It is generally better to manage them in your local environment.
:::

## Spring Boot Extensions
I often create Spring Boot applications, but I was unaware of the existence of Spring Boot extensions until I started writing this article.

It is officially introduced as Spring Tools 4 for Visual Studio Code.

[https://spring.io/tools](https://spring.io/tools)

In reality, it is a collection of extensions called the Spring Boot Extension Pack, which includes three extensions.

[Spring Boot Extension Pack - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=vmware.vscode-boot-dev-pack)

The first is Spring Boot Tools.

[Spring Boot Tools - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=vmware.vscode-spring-boot)

- Jump to Spring-specific symbols in source code, such as REST API mapping definitions
- Select the running application corresponding to the mapping definition
- Enhanced templates and code completion for `@GetMapping` and others
- Hover display of the active profile of the running application for the `@Active` annotation in the source code

These features seem very convenient for those who write code while running multiple applications.

The second is an extension for creating projects.

[Spring Initializr Java Support - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-spring-initializr)

When I create a Spring Boot project, I have traditionally gone to the [Spring Initializr](https://start.spring.io) site to fill in the details and download it. With this extension, you can create a Spring Boot project from the command palette in VS Code.

![Create Boot Project](https://i.gyazo.com/476648992ef056384735b13ae1a86d4d.png)

It even asks if you want to add the created project to the workspace.

![Add to workspace](https://i.gyazo.com/d7ce5e687c149f35c4416a9dd9532820.png)

The third is a dashboard extension.

[Spring Boot Dashboard - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-spring-boot-dashboard)

It has the following features:

- Display running applications
- Start and stop applications
- Debug applications
- List Beans and Endpoints
- Visualize Bean dependencies

It feels very feature-rich, similar to IntelliJ IDEA Ultimate. Personally, I don't write Spring Boot applications that extensively, so I feel it's not absolutely necessary. It depends on your preference.

## Conclusion
Aside from what I've mentioned here, there's also GitHub Copilot. I can't use it in client environments, but it's very useful in my personal environment. It generates Java code smoothly.
