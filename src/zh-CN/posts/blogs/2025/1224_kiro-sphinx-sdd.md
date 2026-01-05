---
title: 使用 Kiro × Sphinx 提高项目开发效率的方法
author: noriyuki-yagi
date: 2025-12-24T00:00:00.000Z
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2025/
tags:
  - Kiro
  - Sphinx
  - AIエージェント
  - 仕様駆動
  - advent2025
image: true
translate: true

---

这是[is开发者网站降临节日历2025](/events/advent-calendar/2025/)的第24天文章。

## 前言

AWS在2025年11月18日宣布正式提供AI代理型 IDE[Kiro(https://kiro.dev)](https://kiro.dev)。

笔者之前使用预览版撰写了[评测文章](/blogs/2025/08/19/kiro-album-app-1/)。从那时起就成了 Kiro 的粉丝，现在在实际工作中也在使用 Kiro。

AI代理型 IDE “Kiro” 的出现，极大地提升了个人开发和原型制作的速度。但是，随着开发规模的增大，也产生了一个新的课题：如何管理对 AI 的指示（上下文）。

为了解决这一课题，笔者引入了文档构建工具“Sphinx”。目前这一尝试进展顺利。这次将介绍这种开发风格。

## 1. 传统 Kiro 开发中的“规模壁垒”

Kiro 非常优秀，但在尝试应用到较大规模的开发项目时，会在以下两点上遭遇上下文管理的极限。

**① requirements.md 文件的膨胀与混乱**

Kiro 的基本用法是在 `.kiro/specs` 目录下的 `requirements.md` 中编写需求。但是，随着功能增加，这个文件会膨胀到数百行、甚至数千行，AI 会丢失上下文，人类维护也变得困难。

**② 目录拆分的两难问题**

为此方案是在 `.kiro/specs` 目录下根据功能创建子目录，并将 `requirements.md` 分散到各个子目录中。但是，这存在 **“先有鸡还是先有蛋”的问题**。在开发初期的需求分析阶段，最佳的功能划分尚不明确。在希望与 Kiro 通过对话来细化需求的阶段，提前确定目录结构并非理想，这会损失灵活性。

## 2. 解决方案：通过 Sphinx 进行结构化文档管理

在此提出的方案是将作为 Python 语言文档工具而闻名的 **Sphinx** 作为需求规格书和设计书的管理与构建平台。

Sphinx 不仅仅是一个手册制作工具。由于它能够基于文本管理结构化文档，因此与 Kiro 的亲和性极高。

## 3. 引入 Sphinx 的五大优点

将需求规格书和设计书作为 Sphinx 项目进行管理，可以获得如下具体效果。

1.  **提高人类可读性（HTML/PDF 输出）**
    * 可以对多个文本文件进行构建并输出成易于阅读的 HTML 或 PDF
    * 开发者和利益相关者可以在浏览器中以整理好的“规格说明书”形式查看整体，而不是像代码那样的文本文件

2.  **通过文档结构整理上下文**
    * 利用 Sphinx 的 `toctree` 功能，可以按功能或层级划分文件进行管理，同时将它们整合为一个系统化的文档
    * 在给 Kiro 下达指示时，也可以明确限定范围，例如“这次请参考 `auth.rst` （认证功能）”

3.  **基于文本，Kiro 可以读取**
    * Sphinx 的源文件是纯文本，因此 Kiro 可以直接读取并理解项目内的文档
    * “规格说明书本身”就能作为 AI 的提示信息

4.  **通过图解（图片）共享上下文**
    * Kiro 可以识别放置在 Sphinx 项目中的界面原型图、ER 图、分析模型等图片
    * 通过“请按照此图进行实现”的指示，可以共享仅文本难以传达的细微含义

:::alert
如果图片尺寸过大，可能无法读取。（根据笔者的实际经验）
:::

5.  **从概要到详细规格的自动生成流程**
    * 人员可以粗略地撰写“系统概要”或“业务流程”，然后基于此向 Kiro 请求“创建各功能的用例描述”
    * 让 AI 自身撰写文档，在确定规格后再进行实现，从而实现“上游流程的自动化”

## 4. 实践：Kiro × Sphinx

下面介绍具体示例，说明如何向 Kiro 下达指示。

### 4.1. 新建项目时的初始提示示例

在 Spec 模式中输入如下提示。

```text
我想创建一个相册应用。

请在 docs/requirements 中使用 Sphinx 创建需求规格书。
HTML 主题请使用 sphinx-rtd-theme。
请创建 Dockerfile 以及用于构建 HTML 和 PDF 的批处理文件，以便在 Podman 上能够构建。
Dockerfile 的基础镜像请使用 sphinxdoc/sphinx-latexpdf。
```

Kiro 会开始一个用于创建需求规格书的项目。

![1-requirements](/img/blogs/2025/1224_kiro-sphinx-sdd/1-requirements.png)

如果对需求规格书中要写的内容已有一定想象，也可以指示文档结构。

```text
请用日语编写 requirements.md 和需求规格书
文档结构如下

index.rst      # 总目录
├ overview/
│  └ index.rst # 系统概要
├ usecase/
│  ├ index.rst         # 用例目录
│  ├ uc01-login        # UC01_登录
│  ├ uc02-browse       # UC02_浏览相册
│  ├ uc03-upload       # UC03_上传内容
│  ├ uc04-edit         # UC04_编辑内容
│  ├ uc05-delete       # UC05_删除内容
│  └ uc06-manage-users # UC06_管理用户
├ screen/
│  ├ index.rst         # 界面规格目录
│  ├ login.rst         # 登录界面
│  ├ main.rst          # 主界面
│  ├ edit.rst          # 编辑界面
│  └ manage-users.rst  # 用户管理界面
└ changelog/
   └ index.rst         # 版本更新记录
```

:::info
需求规格书中要写的内容会因项目而异。
并非必须严格遵循此结构，请灵活应对。
:::

根据上述指示生成的规格书如下。虽然并未输入任何需求，但 AI 会自行想象并撰写规格。

![2-requirements](/img/blogs/2025/1224_kiro-sphinx-sdd/2-requirements.png)

批处理文件虽然需要做些微调，但一旦构建成 HTML 或 PDF，输出效果很漂亮。

![3-requirements](/img/blogs/2025/1224_kiro-sphinx-sdd/3-requirements.png)

![4-requirements](/img/blogs/2025/1224_kiro-sphinx-sdd/4-requirements.png)

PDF 中的样式可能有些不太自然，但若与 Kiro 协商进行，就算没有专业的 TeX 知识也能进行修正。

### 4.2. 修改需求规格书的提示示例

需求规格书的修改除了可以手动修改外，也可以像下面这样在 Spec 模式中列举需求来进行修改。

```text
关于 docs/requirements 中相册应用的规格，希望如下

使用 Google 账户进行用户认证。
只有具有管理员权限的用户可以添加或删除可登录用户。
具有管理员权限的用户可以在后端应用程序的配置文件中执行操作。
不仅可以上传照片，还要能够上传视频。
可上传文件的大小上限为 100MB。
可上传文件的扩展名为 JPG、PNG、HEIC、MP4、MOV。
从文件的元信息中获取日期，创建『/data/pict/<YYYYMMDD>』模式的目录，并将文件保存其中。
创建文件的缩略图，并创建『/data/thumb/<YYYYMMDD>』模式的目录，将缩略图保存其中。
照片列表显示缩略图。
缩略图大小的纵向和横向均不超过 300 像素。
```

### 4.3. 创建设计书的提示示例

完成需求规格书后也要创建设计书。在 Spec 模式中发出以下指示。

```text
请基于 docs/requirements 中相册应用的规格，
在 docs/design 中使用 Sphinx 创建架构设计书。

前端使用 Angular，后端使用 ASP.NET Core。
运行环境和开发环境需在 Podman 容器中运行。
```

根据上述指示生成的设计书如下。

![5-design](/img/blogs/2025/1224_kiro-sphinx-sdd/5-design.png)

由于 Docker 镜像中已安装 sphinxcontrib-mermaid 扩展功能，构建文档时 Kiro 生成的 Mermaid 图也一并显示出来了。

![6-design](/img/blogs/2025/1224_kiro-sphinx-sdd/6-design.png)

### 4.4. 实现阶段的提示示例

在实现阶段，通过 Spec 模式给出如下指示。

```text
请参考 docs\requirements 中的需求规格书和
docs\design 中的设计书，
实现相册应用的登录功能
```

仅凭这几句指示，Kiro 就会查找实现登录功能所需的信息并生成 requirements.md。

![7-impl](/img/blogs/2025/1224_kiro-sphinx-sdd/7-impl.png)

之后只需按照下图的流程继续进行到实现阶段即可。

![dev-flow](/img/blogs/2025/1224_kiro-sphinx-sdd/dev-flow.png)

## 总结

引入 Sphinx 后，可以同时以“人类易读的形式”和“AI 易处理的形式”来管理需求规格书和设计书。

如果采用此次介绍的方法，即使是在大规模项目中，也能更方便地使用 Kiro。

希望本篇文章能为今后的开发提供参考。
