---
title: 在库开发中充分利用 yalc
author: masato-ubata
date: 2026-03-25T00:00:00.000Z
tags:
  - typescript
  - yalc
image: true
translate: true

---

## 引言

当将公共功能或 API 模式等制作为库并使用时，通常会将模块化的内容发布，然后将其集成到各个应用程序中。  
虽然应该通过测试代码来进行功能验证，但在实际集成时仍可能会发生些微的修正。  
当使用相对引用文件时，dist 目录下的结构发生变化，导致入口文件的位置改变等问题也让人头疼。  
这里将介绍帮助解决这些烦恼的 [yalc](https://github.com/wclr/yalc) 的使用方法。

## 什么是 yalc

yalc 是一个工具，可以将本地开发的 npm 包发布到本地，并像使用 GitHub Packages 等公开包一样，将其集成到应用程序中进行开发。

### 与同样具有相似功能的 `npm link` / `npm pack` 的区别

| 对比项目            | yalc                                           | npm link                            | npm pack                         |
|---------------------|----------------------------------------------|-------------------------------------|----------------------------------|
| 依赖引用的实际形式  | 在 `.yalc` 和 `node_modules` 中展开（更接近常规使用形态） | 符号链接                            | 手动创建/部署 tarball            |
| 更改反映便利性      | 通过 `yalc push` 传递到使用端                 | 依赖链接目标，容易产生环境差异      | 每次都需要 pack/install          |
| 适用场景            | 便于在多个应用中同时验证                       | 适用于小规模/临时验证              | 适用于检查分发物                  |
| 防止意外            | 可通过 `yalc check` 检测混入                   | 默认不检测混入                       | 需注意步骤的个人依赖性           |

## 使用步骤

以下将说明使用 yalc 进行开发的流程。

以以下结构进行说明。  
* 库  
  * 目录: packages/math-utils  
  * 包名: @sample-yalc/math-utils  
  * 版本: 1.0.0  
* 使用该库的项目  
  * 目录: demo-app  

**常用命令一览**  
| 命令                            | 说明                                 |
|---------------------------------|--------------------------------------|
| `yalc publish`                  | 将包发布到 yalc 存储                 |
| `yalc push`                     | 重新发布包，将更改传递到使用方       |
| `yalc add <package>`            | 添加包                               |
| `yalc update`                   | 更新已添加的包                       |
| `yalc remove <package>`         | 删除包                               |
| `yalc remove --all`             | 删除所有 yalc 包                     |
| `yalc installations show <package>`  | 显示包的使用位置               |
| `yalc installations clean <package>` | 清理包的使用位置               |

### 快速试用（3 分钟）

1. 在库端发布  
    ```sh
    cd packages/math-utils
    yalc publish
    ```
2. 在使用端添加  
    ```sh
    cd demo-app
    yalc add @sample-yalc/math-utils
    ```
3. 库修改后反映  
    ```sh
    cd packages/math-utils
    yalc push
    ```

基本上就这么简单。  
下面将通过图示说明详细流程，请一并确认。

### 事前准备

首先安装 yalc。

1. 安装  
    ```sh
    npm install -g yalc
    ```

### 从本地发布库到使用的流程

将本地开发中的库发布到本地并进行使用的流程如下。

![包的使用](/img/blogs/2026/0325_dev-lib-efficiently-using-yalc/use-package-example.drawio.png)

1. 将包发布到本地（库端）

    执行 publish 后，包会被保存到本地的 yalc 存储中。  
    * 将包复制到 yalc 存储  
    * yalc.sig：从包内容计算得出的识别信息，用于判定库是否有变更  
    * yalc 存储中的 package.json：添加了 yalcSig 信息

    ```sh
    $ cd packages/math-utils
    $ yalc publish
    @sample-yalc/math-utils@1.0.0 published in store.
    ```
    :::info
    **yalc 存储**  
    使用 yalc publish 后，包公开到的地方。  
    * Windows: `%LOCALAPPDATA%\Yalc`（例如 `C:\Users\sample-user\AppData\Local\Yalc`）  
    * mac/Linux: `~/.yalc`

    可以通过 `yalc dir` 查看实际目录。  
    ```sh
    $ yalc dir
    C:\Users\sample-user\AppData\Local\Yalc
    ```
    :::

2. 向项目添加包（使用端）

    执行 add 后，会引入包并更新依赖关系。  
    * installations.json：添加安装目标  
    * package.json：依赖关系的添加/修改  
      ```json
      "dependencies": {
        // 包的引用路径会更改为 .yalc 下
        "@sample-yalc/math-utils": "file:.yalc/@sample-yalc/math-utils"
      },
      ```  
    * `.yalc`：从 yalc 存储复制包  
    * node_modules/{包作用域/包名}：从 .yalc 复制包  
    * yalc.lock：新建

    ```sh
    $ cd demo-app
    $ yalc add @sample-yalc/math-utils
    Package @sample-yalc/math-utils@1.0.0 added ==> C:\Users\sample-user\demo-app\node_modules\@sample-yalc\math-utils
    ```

到此为止，就可以像使用远程发布的包一样地使用它了。

### 传递库的更改

将库的更改传递到使用端的步骤如下。

![更改的传递](/img/blogs/2026/0325_dev-lib-efficiently-using-yalc/update-package-example.drawio.png)

1. 修改库的代码（库端）  
2. 传递更改（库端）

    执行 push 后，会将更改内容传递到使用端。  
    * 重新在 yalc 存储中发布包  
    * 将更新后的包的更改反映到使用端（可能因配置不当而失败）

    ```sh
    $ cd packages/math-utils
    $ yalc push
    ```

### 结束库的使用

移除与 yalc 包的依赖的步骤如下。

![移除与 yalc 包的依赖](/img/blogs/2026/0325_dev-lib-efficiently-using-yalc/remove-package-example.drawio.png)

1. 删除 yalc 包（使用端）

    执行 remove 后，会删除使用端复制的库。  
    * `package.json`：删除依赖关系  
    * `.yalc`：删除目录  
    * `node_modules/{包作用域/包名}`：删除目录  
    * `yalc.lock`：删除依赖关系  
      * 如果所有 yalc 包都被移除，则整个锁文件也会被删除。  
    * yalc 存储中的包：**不会被删除**

    ```sh
    $ cd demo-app
    $ yalc remove @sample-yalc/math-utils # 指定包来删除 yalc 包
    $ yalc remove --all # 删除所有的 yalc 包
    ```

## 附录. 使用注意事项等

### 将与 yalc 相关的文件从 git 管理中排除

* 由于 yalc 只是开发时使用的工具，因此在使用 yalc 时，应将相关文件添加到 `.gitignore` 中。
```gitignore
# yalc
.yalc/
yalc.lock
```

### 提交前通过 `yalc check` 防止混入

如果 `.yalc` 引用（`file:.yalc/...` 或 `link:.yalc/...`）残留在 `package.json` 中并被提交，容易在 CI 或其他环境中引发问题。

```sh
# 检查 package.json 中是否残留 yalc 依赖
yalc check
```

建议在 pre-commit 钩子中执行此操作，以防止误提交。

### 包未更新

* 请先删除 yalc 包，然后重新添加。  
  ```sh
  # 清除缓存后重新添加
  yalc remove @sample-yalc/math-utils
  yalc add @sample-yalc/math-utils
  ```
* （如果删除 yalc 包后仍无法生效）请删除 node_modules 并重新添加。  
  ```sh
  # 删除 node_modules 并重新安装
  rm -rf node_modules
  # Remove-Item -Recurse -Force node_modules # PowerShell 下
  npm install
  yalc add @sample-yalc/math-utils
  ```
* （如果仍然无法生效）安装路径可能有误。请确认并在错误时修正路径。  
  ```sh
  # 查看特定包的信息
  yalc installations show @sample-yalc/math-utils
  ```

## 总结

能够在开发库的同时进行功能验证是非常有帮助的。  
如果有遇到类似问题的朋友，不妨将其集成到开发流程中试试。
