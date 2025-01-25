---
title: Display Proofreading Tool Hints in VSCode - Explanation of Problem Matcher
author: shohei-yamashita
date: 2025-01-24T00:00:00.000Z
tags:
  - textlint
  - regex
  - vscode
image: true
translate: true

---

## Introduction
I am Yamashita from the Business Solutions Division. This time, I would like to explain about the Problem Matcher, which can be set in the task function of Visual Studio Code (VSCode).
In usual development, since code check functions are provided by the editor and its extensions, you may not be very conscious of it.
However, there may be cases where you want to check the output of a CLI tool developed from scratch within the editor.
This time, I will introduce the procedure to easily display the output results of your own tool as hints by using Tasks and problem matcher in development on VSCode.
The sample code related to this article is posted in the following repository.
@[og](https://github.com/shohei-yamashit/lint-sample-vscode)

## Background
Before posting an article on the Mamezou Developer Site, it is required to run a lint tool on the article's markdown[^1].
The lint tool is registered as a task in Deno and can be executed with the following command.
[^1]: On the Mamezou Developer Site, as mentioned in a [past article](https://developer.mamezou-tech.com/blogs/2022/03/31/4q-retrospective/#%E7%B6%99%E7%B6%9A%E7%9A%84%E3%81%AA%E3%82%B5%E3%82%A4%E3%83%88%E6%94%B9%E5%96%84), textlint has been adopted for document proofreading.

```sh
deno task lint ${path to md file}
```

When you execute this command, the proofreading results are output to the standard output.

```sh
/.../mamezou-tech-site/src/posts/blogs/2025/0117_cycle-postgres.md
   10:19  error  '"で"' is used consecutively 2 times.                                                                                                                            ja-no-successive-word
   // (omitted)                                                                                   
   12:11  error  【dict2】 "することのできること" is a redundant expression. By omitting "することの", the expression becomes concise and the sentence becomes clearer. Explanation: https://github.com/textlint-ja/textlint-rule-ja-no-redundant-expression#dict2  ja-no-redundant-expression
  128:3   error  The sentence does not end with "。".                                                                                                                                                                    ja-no-mixed-period
✖ 7 problems (7 errors, 0 warnings)      
```

Basically, we identify the locations to fix from the console output, but when there are many corrections, the verification work becomes quite laborious.
Therefore, as a result of research, we arrived at the method of combining Tasks and problem matcher.
As shown in the screen below, the correction points can be seen at a glance as hints.

![56417c0c0a1767ea8c321da603c590d8.png](https://i.gyazo.com/56417c0c0a1767ea8c321da603c590d8.png)

## VSCode's Task and problem matcher

### About Task
Task is one of the standard features built into VSCode, and in short, it's a standard VSCode feature that allows you to specify aliases, etc., for command operations.
By appropriately defining in the `tasks.json` file, you can assign aliases to various commands and scripts.
Commands with assigned aliases can be executed via the GUI and can have shortcut keys assigned[^2].
In `tasks.json`, not only can you configure settings related to the command itself and execution method, but you can also set additional operations triggered by commands, as explained next.
[^2]: [https://code.visualstudio.com/docs/editor/tasks#_binding-keyboard-shortcuts-to-tasks](https://code.visualstudio.com/docs/editor/tasks#_binding-keyboard-shortcuts-to-tasks)

### problem matcher
Problem matcher is one of the configuration items in `tasks.json`, and it is a setting item for capturing the output of commands defined with aliases and displaying them as hints in the editor.
In this chapter, I will introduce a sample[^3] published in the official documentation.
[^3]: [https://code.visualstudio.com/docs/editor/tasks#_defining-a-problem-matcher](https://code.visualstudio.com/docs/editor/tasks#_defining-a-problem-matcher)

```javascript
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "build",
      "command": "gcc",
      "args": ["-Wall", "helloWorld.c", "-o", "helloWorld"],
      "problemMatcher": {
        "owner": "cpp",
        "fileLocation": ["relative", "${workspaceFolder}"],
        "source": "gcc",
        "pattern": {
          "regexp": "^(.*):(\\d+):(\\d+):\\s+(warning|error):\\s+(.*)$",
          "file": 1,
          "line": 2,
          "column": 3,
          "severity": 4,
          "message": 5
        }
      }
    }
  ]
}
```

Focusing on the problem matcher, you should be able to see the following four attributes:

```sh
- owner
- fileLocation
- source
- pattern
```

First, I'll briefly explain the three attributes other than `pattern`.

- **owner**: Describes what the problem violates[^4]. (e.g., language name or standard)
- **fileLocation**: How to interpret the location of the file where the problem was detected. (e.g., absolute path, relative path)
- **source**: The tool that output the problem (e.g., linter name, tool name, compiler, etc.)

[^4]: The official page states "The problem is owned by...". Since it was an unfamiliar expression, I added my own interpretation.

Next, let's delve into the main setting item, `pattern`. For explanation, I will present only the pattern below.

```javascript
{
  "version": "2.0.0",
  "tasks": [
    {
      // (omitted)
      "problemMatcher": {
        // (omitted)
        "pattern": {
          "regexp": "^(.*):(\\d+):(\\d+):\\s+(warning|error):\\s+(.*)$",
          "file": 1, // The first capture group is the file
          "line": 2, // Ditto
          "column": 3, //
          "severity": 4, //
          "message": 5 //
        }
      }
    }
  ]
}
```

For `pattern`, we will separate the explanation into `regexp` and other parts for convenience.
First, in `regexp`, you specify a regular expression that indicates the pattern containing the necessary information.
At this time, please specify appropriate capture groups so that you can extract the necessary information from the regular expression
