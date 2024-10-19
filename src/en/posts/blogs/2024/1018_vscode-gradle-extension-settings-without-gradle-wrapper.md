---
title: VS Code Gradle Extension Settings When Gradle Wrapper is Unavailable
author: masahiro-kondo
date: 2024-10-18T00:00:00.000Z
tags:
  - gradle
  - vscode
  - java
  - tips
image: true
translate: true

---

## Introduction
Gradle Wrapper and Maven Wrapper are convenient because they download the necessary version of the binary even if Gradle or Maven is not installed on the system.

Gradle binaries are distributed via URLs like `service.gradle.org/distributions/gradle-8.xx.x-bin.zip`. In environments with access restrictions, such as within a company, the download may fail, resulting in a build error.

## Building the Project Itself
If Gradle binaries are distributed on an internal site, you can build the project by setting the `distributionUrl` in the project's gradle/gradle-wrapper.properties.

[Gradle Wrapper Reference](https://docs.gradle.org/current/userguide/gradle_wrapper.html)

If such a site does not exist, you will need to manually install Gradle. Instead of using the gradlew command within the project, you can build using the gradle command that is in your path.

[Gradle | Installation](https://gradle.org/install/)

## VS Code Gradle Extension Settings
In VS Code, the [Gradle Extension](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-gradle) refers to the project's gradle/gradle-wrapper.properties by default. Therefore, if Gradle Wrapper is distributed on an internal site, it will download and build the binary specified by the `distributionUrl`.

If the Gradle binary cannot be obtained, the Gradle build will fail, and the Java extension will fail to construct the project information.

![No Java projects found](https://i.gyazo.com/dc858e327a31025191ece2c5e6320ffd.png)

You can edit the code, but code completion, JavaDoc hover display, and refactoring will not work properly.

Therefore, let's change the Gradle extension settings to use the local gradle command instead of the Gradle Wrapper.

Search for `gradle` in the settings and uncheck `Java > Import > Gradle > Wrapper: Enabled` to prevent it from referring to maven/gradle-wrapper.properties. Next, set the path where Gradle is installed in `Java > Import > Gradle: Home`.

![Gradle settings](https://i.gyazo.com/eacc2679adc8e35b5b4aaed41e6182e8.png)

In this example, it is set in the workspace, and since the Spring Boot project folder is opened directly in VS Code, .vscode/settings.json is created as follows. You can also edit this file directly.

```json:.vscode/settings.json
{
  "java.import.gradle.version": "",
  "java.import.gradle.wrapper.enabled": false,
  "gradle.nestedProjects": false,
  "java.import.gradle.home": "/Users/kondoh/lib/gradle-8.10.2"
}
```

:::info
If `gradle.nestedProjects` in settings.json is set to true, it will manage not only the root project but also projects placed in subdirectories.

For recommended Java environment setups in VS Code, please refer to the following article.

[2024 Edition! Setting Up a Java Development Environment with VS Code](/blogs/2024/07/18/write-java-with-vscode-2024/)
:::

Reopening the project with this setting will result in a successful Gradle build, and the project information will be successfully loaded.

![Build success](https://i.gyazo.com/acd95ffbc2812759536e438b33833b75.png)

## Conclusion
This was an introduction to how to handle the situation on the VS Code side when the Gradle Wrapper is unavailable.

I haven't tried it with Maven, but there seems to be a configuration value like `Maven > Executable: Prefer Maven Wrapper` in the Maven extension, so it seems manageable.

![VS Code mvnw setting](https://i.gyazo.com/f989498b3243507d776c30a2c071e7b4.png)
