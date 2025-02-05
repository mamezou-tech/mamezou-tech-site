---
title: 使用JSDoc(+Docdash)生成基于Markdown的文档技术
author: shuji-morimoto
date: 2024-12-09T00:00:00.000Z
tags:
  - javascript
  - jsdoc
  - markdown
  - advent2024
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2024/
image: true
translate: true

---

这是[is开发者网站2024年Advent Calendar](/events/advent-calendar/2024/)第9天的文章。

我记录会议笔记、TODO列表、技术笔记等都会使用Markdown格式。Git仓库的根目录（主页）的README及本文也使用Markdown编写。此外，也有与Markdown兼容的任务管理工具。

文本文件中用Markdown编写的部分比普通文本多得多。

基本上，我使用习惯的编辑器（vim）进行编写。熟悉了Markdown语法后，文档的排版变得更简单。此外，语法高亮会用颜色区分文本结构，这点非常方便，一目了然。

![](/img/blogs/2024/1209_documentation-with-jsdoc/vim.png)

编辑器虽然不会直接进行文档排版，但通过颜色高亮代码，显示效果就完全不一样。编辑完成后，我会用Markdown查看器（稍后介绍）确认排版结果。


# 使用Markdown编写文档

提供给客户的软件设计文档通常以Word文档的形式交付，但在某些项目中，由于对软件设计文档的格式没有特别要求，并且客户希望能够在线查看，因此我们使用Markdown编写设计文档。

然而，作为设计文档，通常需要记录UML图和相关说明。如果所有内容都写在一个文件（一个页面）中，可读性会变得很差。因此，希望能按章节创建文件并用Markdown编写。

需求如下：

- 将多个Markdown文件合并为HTML
- 从用JavaScript编写的源文件生成API参考
- 生成目录结构和标题，能够通过点击目录链接跳转到各章内容

作为示例，我们创建了一个名为FizzBuzzBear的JavaScript程序来解决FizzBuzz问题的二维动画程序，并为其撰写了一份软件说明书（雏形）。


# 使用JSDoc显示文档

JSDoc用于生成JavaScript API参考，还可以用于写文档（称为tutorial）。
@[og](https://github.com/jsdoc/jsdoc/)

文档以Markdown格式编写。支持文档之间的链接功能（链接会自动转为HTML文件的URL），并可以创建标题。由于最终会生成静态网页，因此也可以作为在线文档供参考。

虽然JSDoc可以满足上述需求，但其默认的外观设计略显不足。


### README（主页）示例
![](/img/blogs/2024/1209_documentation-with-jsdoc/jsdoc_default.png)
- 目录显示在页面右侧
- 页眉显示为“Home”😞
- 每个文档的目录标题显示为“Tutorials”😞
- 目录根据文档文件名顺序显示😞
    - 使用配置手动指定文件名和显示名的对应关系

### 文档（tutorial）示例
![](/img/blogs/2024/1209_documentation-with-jsdoc/jsdoc_default_article.png)
- 文档内容如下所示，显示方式显得冗长😞
    ```text:class_structure.md
    # クラス構成

    クラス図を記述します。
    ```

### API参考示例
![](/img/blogs/2024/1209_documentation-with-jsdoc/jsdoc_default_classes.png)
- 类别名称过大，属性名或方法名过小，显得难以辨认😞


# 使用Docdash显示文档

JSDoc的默认模板有不少不满意的地方。为了解决这些问题，我们引入了Docdash。
@[og](https://github.com/clenemt/docdash/)
Docdash是一个与JSDoc配套使用的模板。通过使用这个模板，可以显著改变外观，并进行定制化。

JSDoc的默认模板不够直观，而Docdash可以很好地解决这些问题。

### README（主页）示例

![](/img/blogs/2024/1209_documentation-with-jsdoc/jsdoc_docdash.png)

- 目录移动到页面左侧
- 通过JavaScript，可隐藏页眉等内容进行自定义😊
- 目录按预定顺序展示😊

### 文档（tutorial）示例
![](/img/blogs/2024/1209_documentation-with-jsdoc/jsdoc_docdash_article.png)
- 直接按Markdown的排版方式显示😊
    - 用JavaScript隐藏了标题部分

### API参考示例
![](/img/blogs/2024/1209_documentation-with-jsdoc/jsdoc_docdash_classes.png)
- 属性名或方法名清晰易读😊
- 左侧菜单显示方法名😊
    - 该显示可根据配置选择开启或关闭
- 搜索框可以用来搜索API
    - 也可以禁用搜索框


# 安装与运行

请先安装Node.js。
@[og](https://nodejs.org/)
[安装程序下载链接](https://nodejs.org/en/download/prebuilt-installer)。

:::alert
以下步骤适用于Windows。请注意，如果在Windows PowerShell中执行，可能会出现脚本执行错误。建议使用命令提示符（cmd.exe）或Git Bash（bash.exe）。
:::

### 下载示例应用（FizzBuzzBear）
```console
curl -L -O https://github.com/shuji-morimoto/FizzBuzzBear/archive/refs/heads/main.zip
tar -xf main.zip
```
- 解压main.zip后会生成FizzBuzzBear-main文件夹

:::info
Windows 10版本1809（2018年10月更新）及之后的版本支持curl和tar命令，并支持通过tar解压zip文件。
:::


### 安装所需模块
```console
cd FizzBuzzBear-main
set NODE_OPTIONS="--dns-result-order=ipv4first"
npm install
```
- 此时会安装package.json中定义的与`JSDoc`、`Docdash`相关的模块

:::alert
在IPv6环境中，可能会出现脚本无法下载的问题。这时可以通过`set NODE_OPTIONS="--dns-result-order=ipv4first"`优先使用IPv4来解决。
:::


### 生成文档
```console
npm run docs
```
- 运行package.json中定义的`docs`脚本


### 在浏览器中运行FizzBuzzBear应用
```console
start src/index.html
```

### 在浏览器中打开软件设计文档
```console
start docs/_site/index.html
```

:::alert
请注意，由于Markdown文档没有纸张尺寸和页面分隔概念，因此不适合生成PDF文件或打印。
:::


# 使用Docdash模板的配置文件(jsdoc.json)

[JSDoc配置详细信息](https://jsdoc.app/about-configuring-jsdoc)

[Docdash模板配置详细信息](https://github.com/clenemt/docdash?tab=readme-ov-file#options)

```json:jsdoc.json
{
    "source": {
        "include": ["./src"],
        "includePattern": ".+\\.js$"
    },
    "plugins": [
        // 指定Markdown编辑所需的插件
        "plugins/markdown"
    ],
    "templates": {
        "cleverLinks": true,
        "monospaceLinks": true,
        "default": {
            "includeDate": false,
            // 指定需要加载的资源
            "staticFiles": {
                "include": ["./docs/articles"],
                "includePattern": ".+\\.(png|jpg|gif|ico|css|js)$"
            }
        }
    },
    "opts": {
        // 指定使用docdash模板
        "template": "./node_modules/docdash",
        // 输出目录
        "destination": "./docs/_site",
        // 指定README文件（主页展示）
        "readme": "./docs/README.md",
        "encoding": "utf8",
        "recurse": true,
        // 定义文档文件夹
        "tutorials": "./docs/articles"
    },

    // docdash配置
    "docdash": {
        "static": true,
        "sort": false,
        "sectionOrder": [
             "Classes",
             "Modules",
             "Externals",
             "Events",
             "Namespaces",
             "Mixins",
             "Interfaces"
        ],
        "search": true,
        "commonNav": false,
        "collapse": true,
        "wrap": false,
        "typedefs": true,
        "navLevel": 0,
        "private": false,
        // 指定应用于每个文档的脚本与样式表
        "scripts": [
            "scripts/local_settings.css",
            "scripts/local_settings.js"
        ],
        // 菜单中的标题设置
        "menu": {
            // xxxx.md文件最终会生成tutorial-xxxx.html
            // 因此href字段需指定转换后的HTML文件名
            "起动方法": {
                "href":"tutorial-run_app.html",
                "target":"_self",
                "class":"menu-item",
                "id":"website_link"
            },
            "类结构": {
                "href":"tutorial-class_structure.html",
                "target":"_self",
                "class":"menu-item",
                "id":"website_link"
            },
            "机制": {
                "href":"tutorial-mechanism.html",
                "target":"_self",
                "class":"menu-item",
                "id":"website_link"
            },
            "TODO": {
                "href":"tutorial-todo.html",
                "target":"_self",
                "class":"menu-item",
                "id":"website_link"
            }
        }
    }
}
```

```css:scripts/local_settings.css
h1.page-title {
    display: none;
}
```
- 将指定的元素隐藏

```javascript:scripts/local_settings.js
if (window.location.pathname.split('/').pop().startsWith('tutorial-')) {
    var h = document.querySelector("html > body > div#main > section > header");
    if (h != null) {
        h.style.display = "none";
    }
}
```
- 如果资源名以tutorial-开头，则在文档中隐藏匹配的元素


# 使用浏览器查看Markdown文档
在确认Markdown排版效果时，我使用Markdown Viewer在浏览器（Chrome）中预览。该工具支持多种浏览器扩展功能。
@[og](https://github.com/simov/markdown-viewer/)

启用该工具后，可将Markdown文件拖放到浏览器中直接查看解析结果。

在其[内容选项](https://github.com/simov/markdown-viewer#table-of-contents)中，将autoreload设为true后，编辑器中保存的内容会实时反映到浏览器上。工具还会记住当前的显示位置，便于快速预览。此外，它还支持生成目录功能。
