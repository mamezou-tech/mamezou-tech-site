---
title: Developing an OPC-UA Client with Open62541
author: hayato-ota
date: 2024-01-31T00:00:00.000Z
tags:
  - iot
  - OPC-UA
translate: true

---

:::info
To reach a broader audience, this article has been translated from Japanese.
You can find the original version [here](https://developer.mamezou-tech.com/robotics/opcua/opcua_open62541_client/).
:::



# Introduction
## Previous Article
In the previous article ([here](https://developer.mamezou-tech.com/robotics/opcua/opcua_open62541_server/)), we explained the overview of OPC-UA and how to install Open62541.
Please take a look before reading this article.

## Purpose of This Article
In this article, we will explain the following items:
- Creating an OPC-UA Client sample
- Reading and writing variables registered on the server
- Calling functions registered on the server

# Development Environment
## Required Libraries & Tools
For development, we use the following libraries and tools:

- Visual Studio
  - This article uses Visual Studio 2022 Community
- OpenSSL
  - This article uses OpenSSL 3.0.7
- CMake
  - This article uses CMake 3.25.0-rc2
- Python3
  - This article uses Python 3.12.0
- UaExpert
  - OPC-UA client tool
  - Used to check the values registered on the server

# Creating and Configuring the Project
We will explain how to create and configure a project for the OPC-UA client.

:::check
The content of this chapter is the same as the previous article, so if you are already familiar with it, feel free to skip.
:::

## Creating a New Project
Open Visual Studio and open the "open62541_ws" solution.
From the top left tab, select "File" → "New" → "Project".

Select "Console App" for C++.

Configure the project as follows:
The project will be created inside the src folder.

```
Project name: SimpleClient
Location: <Solution Directory>/src
Solution: Add to the solution
```

## Project Configuration
To make development easier in Visual Studio, configure the project.
Right-click "SimpleClient" in the Solution Explorer and select properties.

Configure the project settings on this screen.

Set "Configuration" at the top of the SimpleClient property page to "All Configurations".

### Include Configuration
From the left "Configuration Properties" column,

Select "Configuration Properties" → "C/C++" → "General".

In the right column, set "Additional Include Directories" to

```shell
$(SolutionDir)include
```

Click "Apply" after setting.

:::info: About Macros Available in Visual Studio

Convenient macros can be used in settings.
For more details, see [here](https://learn.microsoft.com/ja-jp/cpp/build/reference/common-macros-for-build-commands-and-properties?view=msvc-170).
:::

### Library Directory Configuration
From the left column,

Select "Configuration Properties" → "Linker" → "General".

In "Additional Library Directories", set

```
$(SolutionDir)lib
```

Click "Apply" after setting.

### Dependency File Configuration
From the left column,

Select "Configuration Properties" → "Linker" → "Input".

In "Additional Dependencies", append

```shell
$(SolutionDir)lib\open62541.lib
```
The separator for setting values here is a semicolon.

Click "Apply" after setting.

### Output Directory Configuration
From the left column,

Select "Configuration Properties" → "General".

Next to "Output Directory", click the triangle icon and click the "Edit..." button to open the edit screen.

Set as follows:

```shell
$(SolutionDir)bin\$(ProjectName)\$(Configuration)\
```

Click "Apply" after setting.

### DLL File Copy Configuration
When executing the program after building, it is necessary to link open62541.dll at the application startup.

Here, we set to copy the dll file to the output directory after building.

From the left column,

Select "Configuration Properties" → "Build Events" → "Post-Build Event".

Enter the following 2 lines in "Command Line":

```shell
robocopy $(SolutionDir)bin\ $(TargetDir) open62541.dll
IF %ERRORLEVEL% LSS 8 EXIT 0
```
The second line is a command to suppress errors that occur when the robocopy command is successful.
For more details, see [here](https://learn.microsoft.com/ja-jp/windows-server/administration/windows-commands/robocopy).

Click OK to close the property screen after setting.

This completes the project configuration.

# Client Implementation
## List of Nodes Registered on the Server
In the previous article, we registered the following two nodes on the server:
- An integer variable `SampleVariable`
- A function `IncreaseVariable(int delta)` that adds the value of the argument to `SampleVariable`

We will implement a client that accesses these two nodes in this article.

## Implementation Code
Write the following code inside the created SimpleClient.cpp.
The code implemented in this article is also posted [here](https://github.com/hayat0-ota/open62541_ws/blob/main/src/SimpleClient/SimpleClient.cpp).

[Code omitted for brevity, please refer to the original article for the full code]

## Code Details
### Reading the Value of a Variable
[Explanation of the code for reading a variable's value]

### Writing a Value to a Variable
[Explanation of the code for writing a value to a variable]

### Executing a Function Registered on the Server
[Explanation of the code for executing a function]

### `main` Function
[Explanation of the `main` function]

# Execution Results
## Preparations
- Launch the OPC-UA server created in the previous article
- Start UaExpert and connect to the OPC-UA server
- Store any value in SampleVariable
  - This time, it was changed to `100`

## Launching the Created Client
Launch the created client and confirm that the screen like the one below is displayed.
[Client launch screen]

Press the Enter key and read the current value of the variable.
As a result of the execution, confirm that it has become the value changed earlier.
[Client after reading the variable]

Press the Enter key again, and try to change the value of the variable.
As a result of the execution, confirm that the value has become the value written in the code (-1).
[Client after writing the variable]

Finally, press the Enter key again and try to execute the function on the server.
Here, the contents of the function were written to add the value passed as an argument (this time `32`).
As a result of the execution, confirm that the value has become the correct value (`-1 + 32 = 31`).
[Client after invoking the method]

# Conclusion
This article did not introduce it, but Open62541 provides features such as encryption and PubSub communication, and samples are published on the official GitHub repository.
Why not try using Open62541 for OPC-UA server and client development?
[Open62541 sample program collection](https://github.com/open62541/open62541/tree/master/examples)

:::info
Open62541 is implemented in full C language (C99).
If you prefer to develop in C++ rather than C, a C++ wrapper developed by volunteers might be a good option.
:::

[open62541pp](https://github.com/open62541pp/open62541pp)
