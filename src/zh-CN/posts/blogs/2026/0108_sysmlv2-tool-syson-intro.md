---
title: 使用免费的开源软件 SysON 开始 SysML v2 建模（1）〜 SysON 初体验
author: yasumasa-takahashi
date: 2026-01-08T00:00:00.000Z
tags:
  - SysON
  - SysMLv2
  - MBSE
  - モデリング
image: true
translate: true

---

2025年9月，SysML Version 2.0（SysML v2）已正式发布。

也许你有过这样的经历：想“试用 SysML v2”时，发现支持该版本的工具价格昂贵，或者使用通用的绘图工具创建 SysML v2 模型，却总觉得不太对劲。

本文将介绍在“想试试 SysML v2 的图形化记法是什么样的”时推荐使用的工具 SysON。

## 什么是 SysON
SysON（读作“シスオン”或“スィスオン”）是一款用于创建和编辑 SysML v2 图形化记法的工具。  
这个名称据说一方面有“system on”（开启系统）的意思，另一方面又暗示“系统建模的新季”（season 与 syson 发音相近）这两层含义。

SysON 的源代码在 [GitHub](https://github.com/eclipse-syson/syson) 上公开发布。  
其许可证为 EPL-2.0。  
正如 GitHub 仓库名（eclipse-syson / syson）所示，该工具由 Eclipse 基金会的 SysON 项目负责开发与维护。  
该 SysON 项目由法国的 OBEO 公司和 CEA（法国原子能及替代能源委员会）主导，实际开发由 OBEO 公司承担。

顺便提一句，一提到“开源工具、法国、Eclipse 基金会”，大家可能会想到 UML2 建模工具 [Papyrus](https://projects.eclipse.org/projects/modeling.papyrus)。  
由于该工具在日本的知名度较低，不知道它的人可能还挺多的。  
事实上，Papyrus 的开发也是由与 SysON 相同的 OBEO 公司承担的。  
Papyrus 支持 SysML v1，所以如果想使用 SysML v1，就选择 Papyrus；想使用 SysML v2，则选择 SysON，大概就有了这样的区分。

## SysON 的构成
SysON 是一个 Web 应用程序。  
用户在客户端 PC 的 Web 浏览器中访问 SysON 服务器。  
用户在 Web 浏览器中对模型所做的操作会在 SysON 服务器上执行。

![SysON 的构成](/img/blogs/2026/sysmlv2-tool-syson-intro/system.png)

它支持多用户建模，并且 SysML v2 规范中也对 REST API 有要求，因此采用 Web 应用程序是合适的。  
但另一方面，在网络环境不佳时可能会出现响应缓慢、显示不能及时更新等缺点，当对建模操作比较熟悉后，可能会感到有些压力。

手册中列出的支持浏览器为 Google Chrome 和 Firefox 的最新稳定版。  
如果使用 Safari、Microsoft Edge、Opera 等其他浏览器，建议先进行可用性验证。

虽然是英文，但也有 SysON 的[用户手册相应文档](https://doc.mbse-syson.org/syson/main/)。

## 安装
### 事前准备
首先决定要安装哪个发行版。

发行版信息列在 [Eclipse SysON 的官方网站](https://projects.eclipse.org/projects/modeling.syson/governance) 上。  
查看 [GitHub 的 Tags](https://github.com/eclipse-syson/syson/tags)，会发现很多 Tag，但末尾带有“.0”的就是稳定版。

本文中安装的是稳定版 v2025.8.0。

安装方法详见 [手册（v2025.8.0）](https://doc.mbse-syson.org/syson/v2025.8.0/installation-guide/how-tos/install.html)。  
手册中记载了四种安装方法，大致可分为本地测试用和生产环境用两种。  
如果不考虑安全性，则使用本地测试用；若在需要考虑安全性的环境，则采用生产环境的方法进行安装。

本文假设是试用 SysML v2，因此将进行[Basic Local Test Setup](https://doc.mbse-syson.org/syson/v2025.8.0/installation-guide/how-tos/install/local_test.html) 的安装。

SysON 本地测试用安装使用 Docker Engine。  
Docker Desktop 是收费的，但 Docker Engine 遵循 Apache License 2.0，因此可以免费使用。  
此处省略 Docker Engine 的安装方法。  
笔者在 Windows 11 及其 WSL2（Debian/Linux）上安装了 Docker Engine。

在 Docker Engine 安装完成后即可开始安装 SysON。

### 获取 docker-compose.yml
在 Web 浏览器中访问 [GitHub 上的 SysON 页面](https://github.com/eclipse-syson/syson/tree/v2025.8.0)，下载 docker-compose.yml。

使用 curl 命令下载 docker-compose.yml 的方式如下。

```bash
curl -OL https://raw.githubusercontent.com/eclipse-syson/syson/refs/tags/v2025.8.0/docker-compose.yml
```

### 启动 docker
在启动 Docker Engine 服务之前，先确认一下当前状态。

使用 service 命令查看 docker 服务的状态。

```bash
sudo service docker status
```

如果 docker 服务未启动，会显示以下信息。

```
Docker is not running ... failed!
```

启动 Docker Engine 服务。

```bash
sudo service docker start
```

再次检查服务状态。

```bash
Docker is running.
```

docker 服务已启动。

在刚才下载的 docker-compose.yml 文件所在的文件夹中执行以下命令。

```bash
docker compose up
```

当 SysON 服务器 boot 时，控制台日志中会输出以下 Logo。

```bash
app-1       |     _____               ____   _   __
app-1       |    / ___/ __  __ _____ / __ \ / | / /
app-1       |    \__ \ / / / // ___// / / //  |/ /
app-1       |   ___/ // /_/ /(__  )/ /_/ // /|  /
app-1       |  /____/ \__, //____/ \____//_/ |_/
app-1       |        /____/
app-1       |
app-1       |  :: Spring Boot ::         (v3.5.0)
app-1       |
```

启动正常完成后，会显示以下信息。

```bash
app-1       | 2025-12-01T06:45:59.914Z  INFO 1 --- [           main] o.s.b.w.embedded.tomcat.TomcatWebServer  : Tomcat started on port 8080 (http) with context path '/'
app-1       | 2025-12-01T06:45:59.937Z  INFO 1 --- [           main] org.eclipse.syson.SysONApplication       : Started SysONApplication in 18.896 seconds (process running for 19.808)
```

`Tomcat started on port 8080 (http)` 表示作为 Web 服务器的 Apache Tomcat 已启动。

SysON 服务器启动后，就可以在 Web 浏览器中访问该服务器了。

### 初始界面
启动 Web 浏览器，访问 `http://localhost:8080`。

若出现以下主页面，即表示准备就绪。

![SysON 的初始界面](/img/blogs/2026/sysmlv2-tool-syson-intro/homepage.png)

顺便提一下，该界面 Existing Projects 列表里的 "Batmobile" 是以那位美漫英雄使用的战车为主题的示例。

## 结束
在启动 SysON 服务器的 shell 窗口按 Ctrl + C 即可停止 SysON 服务器。

若要停止 docker 服务，请执行以下命令。

```bash
sudo service docker stop
```

## 下次预告

至此，使用 SysON 进行建模的准备工作已经就绪。

从下次起，就要正式展示使用 SysON 进行 SysML v2 建模的操作了。
