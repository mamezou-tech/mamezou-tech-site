---
title: 在 VSCode 中显示校对工具提示 - problem matcher 解析
author: shohei-yamashita
date: 2025-01-24T00:00:00.000Z
tags:
  - textlint
  - regex
  - vscode
image: true
translate: true

---

## 引言
我是来自商务解决方案事业部的山下。这次，我将讲解在 Visual Studio Code (VSCode) 的任务功能中可以设定的 Problem Matcher。  
在日常开发中，由于代码检查功能通常由编辑器或其扩展提供，所以你可能不会过于在意。  
然而，也会出现你想要在编辑器中查看自己从零开始开发的 CLI 工具输出的情况。  
这次在 VSCode 开发过程中，通过同时使用 Task 和 problem matcher，介绍一种轻松显示自制工具输出结果提示的步骤。  
关于本文的示例代码，已发布在下面的仓库中。  
@[og](https://github.com/shohei-yamashit/lint-sample-vscode)

## 背景
在 isデベロッパーサイト上发布文章之前，规定必须针对文章中的 Markdown 使用 lint 工具。[^1]  
Lint 工具已注册为 deno 的任务，可以通过以下命令执行。  
[^1]: 在 isデベロッパーサイト上，如同[过去的文章](https://developer.mamezou-tech.com/blogs/2022/03/31/4q-retrospective/#%E7%B6%99%E7%B6%9A%E7%9A%84%E3%81%AA%E3%82%B5%E3%82%A4%E3%83%88%E6%94%B9%E5%96%84)中所述，使用 textlint 来进行文档校正。

```sh
deno task lint ${mdファイルのパス}
```

运行此命令后，会在标准输出中检测到校对结果。

```sh
/.../mamezou-tech-site/src/posts/blogs/2025/0117_cycle-postgres.md
   10:19  error  "で" が連続して2回使われています。                                                                                                                                                                ja-no-successive-word
   // (略)                                                                                   
   12:11  error  【dict2】 "することのできること"は冗長な表現です。"することの"を省き簡潔な表現にすると文章が明瞭になります。 解説: https://github.com/textlint-ja/textlint-rule-ja-no-redundant-expression#dict2  ja-no-redundant-expression
  128:3   error  文末が"。"で終わっていません。                                                                                                                                                                    ja-no-mixed-period
✖ 7 problems (7 errors, 0 warnings)      
```

基本上是从控制台输出中确定修正部分，但当修正量较多时，检查工作也会相当辛苦。  
因此经过研究，我最终采用了 Task 和 problem matcher 的联合使用这一方法。  
如下面的画面所示，修正部分能一目了然地作为提示显示。

![56417c0c0a1767ea8c321da603c590d8.png](https://i.gyazo.com/56417c0c0a1767ea8c321da603c590d8.png)

## VSCode 的 Task 与 problem matcher

### 关于 Task
Task 是 VSCode 提供的标准功能之一，简单来说，它是 VSCode 的标准功能，可以指定命令操作的别名等。  
通过在 tasks.json 文件中做适当的定义，可以为各种命令或脚本指定别名。  
指定了别名的命令不仅可以在 GUI 界面上执行，还可以分配快捷键[^2]。  
在 tasks.json 中，不仅可以对命令本身或执行方式进行配置，还可以设置如后续所述基于命令触发的附加操作。  
[^2]: [https://code.visualstudio.com/docs/editor/tasks#_binding-keyboard-shortcuts-to-tasks](https://code.visualstudio.com/docs/editor/tasks#_binding-keyboard-shortcuts-to-tasks)

### problem matcher
problem matcher 是 tasks.json 中的设置项之一，用于捕获由指定别名的命令输出，并在编辑器上显示为提示。  
本章中介绍了官方发布的示例[^3]。  
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

关注 problem matcher 后，你应该能看到以下四个属性：

```sh
- owner
- fileLocation
- source
- pattern
```

首先，除 pattern 之外的三个属性做个概述说明。  
- **owner**: 描述违反了什么[^4]。（例如：语言名称或标准等）  
- **fileLocation**: 问题被检测到的文件位置的解释方式。（例如：绝对路径、相对路径）  
- **source**: 输出问题的工具（例如：linter 名称、工具名称、编译器等）  

[^4]: 在官方页面中有 "The problem is owned by … ." 这样的描述。因为这种表达不太常见，所以加入了自己的理解。

接下来，将深入探讨主要的设置项 pattern。为了解释，仅关注 pattern 的配置，以下展示内容。

```javascript
{
  "version": "2.0.0",
  "tasks": [
    {
      // （略）
      "problemMatcher": {
        // （略）
        "pattern": {
          "regexp": "^(.*):(\\d+):(\\d+):\\s+(warning|error):\\s+(.*)$",
          "file": 1, // 第一个捕获组表示文件
          "line": 2, // 同上
          "column": 3, //
          "severity": 4, //
          "message": 5 //
        }
      }
    }
  ]
}
```

关于 pattern，为了说明，接下来将其分为 regexp 和其他部分进行展示。  
首先，在 regexp 中，指定包含必要信息的模式的正则表达式。  
在此过程中，请指定合适的捕获组，以便从正则表达式中以适当的粒度提取所需信息。  
例如，考虑这样一个从输出中提取信息的例子。

```sh
helloWorld.c:5:3: warning: implicit declaration of function ‘prinft’
```

可以确认这一行包含了以下信息：

```sh
- ファイル名
- 行番号
- 列番号
- 重要度
- エラー内容
```

在刚才的例子中，似乎可以通过下面这样的正则表达式来捕获输出[^5].

```js
"^(.*):(\\d+):(\\d+):\\s+(warning|error):\\s+(.*)$"
```

[^5]: 正则表达式的检查可以尝试使用 [Regex Playground](https://regex101.com/) 等工具。

接下来，只要指定每个捕获组对应的内容，就可以将作为提示所需的信息传递给编辑器了。  
因此，除了 regexp 以外，还需要进行设置。配置了适当项的 problemMatcher 如下所示。

```javascript
{
  "version": "2.0.0",
  "tasks": [
    {
      //(略)
      "problemMatcher": {
        "owner": "cpp",
        "fileLocation": ["relative", "${workspaceFolder}"],
        "source": "gcc",
        "pattern": {
          "regexp": "^(.*):(\\d+):(\\d+):\\s+(warning|error):\\s+(.*)$",
          "file": 1, // 第一个捕获组表示文件
          "line": 2, // 同上
          "column": 3, //
          "severity": 4, //
          "message": 5 //
        }
      }
    }
  ]
}
```

另一方面，根据工具的不同，输出可能跨越多行。

```sh
test.js
  1:0   error  Missing "use strict" statement                 strict
  1:9   error  foo is defined but never used                  no-unused-vars
  2:5   error  x is defined but never used                    no-unused-vars
  2:11  error  Missing semicolon                              semi
  3:1   error  "bar" is not defined                           no-undef
  4:1   error  Newline required at end of file but not found  eol-last
```

即使是这样的输出，只要按下面设置 problemMatcher，就可以解析错误。

```javascript
{
  "version": "2.0.0",
  "tasks": [
    {
      //(略)
      "problemMatcher": {
        "owner": "cpp",
        "fileLocation": ["relative", "${workspaceFolder}"],
        "source": "gcc",
        "pattern": [
          {
            "regexp": "^([^\\s]+\\.\\w+)$",
            "file": 1
          },
          {
            "regexp": "^\\s*(\\d+):(\\d+)\\s*\\S?\\s*(error|warning)\\s+(.*)\\s+(.*)$",
            "line": 1,
            "column": 2,
            "severity": 3,
            "message": 4,
            "code": 5,
            "loop": true
          }
        ]
      }
    }
  ]
}
```

具体来说，首先准备了两种模式，①用于检测文件名，②用于检测其它部分。  
在后者中添加了 “loop”: true，通过这种方式解析输出，即 [文件名] → [其他部分（重复）].

## 实现结果
在 isデベロッパーサイト中使用的 Lint 工具的输出结果形式为“基本为文件的绝对路径 → 修正部分重复出现”。

```sh
/.../mamezou-tech-site/src/posts/blogs/2025/0117_cycle-postgres.md
   10:19  error   "で" が連続して2回使われています。                                                                                                                                                                ja-no-successive-word
   11:4   error ✔︎ 漢字が7つ以上連続しています: 漢字七文字以上                                                                                                                                                       max-kanji-continuous-len
   12:11  error  【dict2】 "することのできること"は冗長な表現です。"することの"を省き簡潔な表現にすると文章が明瞭になります。 解説: https://github.com/textlint-ja/textlint-rule-ja-no-redundant-expression#dict2  ja-no-redundant-expression
  128:3   error   文末が"。"で終わっていません。                                                                                                                                                                    ja-no-mixed-period
```

若以通用记法描述，大致如下。

```sh
${ファイルの絶対パス}
(複数の空白)${行番号}:${列番号}(複数の空白)$(0or1文字)(複数の空白)${重要度}(複数の空白)${エラーメッセージ}(複数の空白)${エラーの識別子}
以下繰り返し
```

因此，预期只要按照如下指定 problemMatcher，就可以捕获相关信息。

```javascript
    {
      "label": "deno lint Manual",
      // （略）
      "problemMatcher": {
        "owner": "md",
        "fileLocation": [
          "absolute",
        ],
        "pattern": [
          {
            "regexp": "^([^\\s]+\\.\\w+)$",
            "file": 1
          },
          {
            "regexp": "^\\s*(\\d+):(\\d+)\\s*\\S?\\s*(error|warning)\\s+(.*)\\s+(.*)$",
            "line": 1,
            "column": 2,
            "severity": 3,
            "message": 4,
            "code": 5,
            "loop": true
          }
        ]
      },
    }
```

在这里，我们来看看示例。再次附上仓库的链接。  
@[og](https://github.com/shohei-yamashit/lint-sample-vscode)

在示例仓库上运行校对处理后，会在编辑文件的界面中显示提示，如下所示。

![ed0f92a0da10cefa2ce10ef1b1f72acf.png](https://i.gyazo.com/ed0f92a0da10cefa2ce10ef1b1f72acf.png)

然而，这并不意味着万事皆遂，还发现了以下需要改进之处。  
- 项目特有的语法，例如“:::”，也被纳入了校对范围  
- 无法充分解析错误

这些问题的解决超出了 problem matcher 的范畴，请在其他文章中补充说明。

## 总结
这次通过控制 VSCode 的 Task 中的 problem matcher 属性，实现了从 CLI 工具反馈结果的功能。  
只要准备好相应工具，只需编辑 tasks.json，即可在编辑器上将工具的结果可视化。
