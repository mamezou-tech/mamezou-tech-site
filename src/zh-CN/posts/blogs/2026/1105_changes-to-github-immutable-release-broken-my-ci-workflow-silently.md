---
title: 修复了设置 GitHub Immutable Releases 的仓库中悄然损坏的发布流水线
author: masahiro-kondo
date: 2026-11-05T00:00:00.000Z
tags:
  - GitHub
  - CI/CD
  - electron
  - Security
image: true
translate: true

---

## 引言
为了尝试能够防止发布内容被篡改、保障软件供应链安全的 Immutable releases，我在一年前将其应用到了个人开发的 Electron 应用仓库中。

@[og](https://developer.mamezou-tech.com/blogs/2025/11/16/github-immutable-releases/)

之后过去了相当长的时间，但由于 eMudhra 事件，不能继续放置旧版 Electron 应用不管，因此进行了发布工作。

笔者的 Electron 应用仓库如下。

@[og](https://github.com/kondoumh/sbe)

:::info:关于 eMudhra 的安全事件
> 认证机构“eMudhra”的“emSign G3”层级中，8 个中间 CA 密钥（6 个用于 TLS、2 个用于代码签名）以脆弱到足以被恢复的方式生成的问题。

*摘自窓の杜的文章*

@[og](https://forest.watch.impress.co.jp/docs/news/2152996.html)

正如 Jack 先生博客中所述，Electron 内置了 Chromium 的证书存储，除非更新 Chromium 或 Node 并重新构建，否则该存储不会更新。也就是说，如果持续分发使用旧版本 Electron 制作的应用，就会一直信任本应不再受信任的根证书。

@[og](https://blog.jxck.io/entries/2026-10-25/emudhra.html)

由于 Electron 应用会包含构建时的根证书，因此仍使用旧版 Electron 构建的应用存在持续信任本应失效证书的风险。
:::


## 发布工作流发生错误
接下来，在完成应用的细微修正和 Electron 版本升级后，进入了发布阶段。该仓库设置为：创建并 push 新版本标签时，启动用于发布的工作流。正如开头文章中所写，使用 strategy.matrix 在各个平台的 Actions Runner 上生成 macOS / Windows / Linux 二进制文件，并使用用于创建 GitHub 发布的 [softprops/action-gh-release](https://github.com/softprops/action-gh-release) 来进行发布。

这次，将应用版本 bump 至 v3.9.0，并在时隔一年后启动该工作流时，因如下错误而失败。

```shell
Found release v3.9.0 (with id=432353934)
⚠️ Unexpected error fetching GitHub release for tag refs/tags/v3.9.0: HttpError: Validation Failed: {"resource":"Release","code":"custom","field":"target_commitish","message":"target_commitish cannot be changed when release is immutable"} - https://docs.github.com/rest/releases/releases#update-a-release
Error: Validation Failed: {"resource":"Release","code":"custom","field":"target_commitish","message":"target_commitish cannot be changed when release is immutable"} - https://docs.github.com/rest/releases/releases#update-a-release
```

这似乎是与 Immutable releases 有关的错误。

经过调查，发现 v3.9.0 标签似乎创建了两个发布对象。

- id=432353876(draft, immutable=false)：资产所需的文件（sbe-Setup-3.9.0.exe、sbe-3.9.0-universal.dmg、sbe-3.9.0.AppImage）已全部齐备。而且尚未成为 Immutable
- id=432353934(published, prerelease, immutable=true)：在资产数为 0 的状态下被确定为 Immutable，并占用了相同的标签名

## 初始工作流的实现
发生错误时的工作流文件如下。通过 strategy.matrix，在各平台 Runner 的作业中一并进行构建和发布。

```yaml:Release.yml（发生错误时）
name: Release

on:
  push:
    branches:
      - "!*"
    tags:
      - "v*"

jobs:
  build:

    runs-on: ${{ matrix.os }}

    strategy:
      fail-fast: false
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]

    steps:
    - uses: actions/checkout@v4
    - name: Setup nodejs
      uses: actions/setup-node@v4
      with:
        node-version: '20'
    - name: Install dependencies
      run: npm install
    - name: Package (Windows / Linux)
      if: matrix.os != 'macos-latest'
      run: npm run dist
      env:
        GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    - name: Package (macOS)
      if: matrix.os == 'macos-latest'
      run: npx electron-builder --mac --universal
      env:
        GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    - name: Publish
      uses: softprops/action-gh-release@v2
      with:
        files: |
          dist/**/*.exe
          dist/**/*.deb
          dist/**/*.AppImage
          dist/**/*.dmg
        prerelease: true ## 以 Pre-release 状态创建
```

由于为 action-gh-release 的参数指定了 `prerelease: true`，因此该工作流会在各个 Runner 中将构建产物添加至 Pre-release。

当时，使用该设置似乎确实创建了草稿发布。文章中也写道：

> 将 `prerelease` 设为 `true` 后，会创建草稿发布。

即先在草稿中确认附件文件和差异，然后点击 Publish，遵循由人工在最后明确公开的流程。

## 只能舍弃失败的 Pre-release
这次，我认为在 v3.9.0 重复创建的发布中，如果删除那个在空状态下就被 immutable 化的发布，便可以 publish 另一个（资产齐全的）草稿，因此删除了空发布。然而，在草稿页面点击 `publish` 按钮后，这次又出现了如下错误。

> There was an error creating your Release: tag name was used by an immutable release.

即使是 Pre-release，一旦标签名被用于 immutable 发布，即便删除该发布，仓库侧似乎仍会将其持续记录为“已使用”（作为防篡改的设计，这很合理）。v3.9.0 这个标签本身已经无法再使用，因此决定提升版本并以 v3.9.1 重新开始。

## 避免竞争条件
作为对策，最初考虑的是消除由 strategy.matrix 在三个独立进程中执行 publish 所导致的竞争。并行的 matrix 作业会执行，每个作业都会分别调用 softprops/action-gh-release，尝试创建或更新同一个 v3.9.0 标签的发布。由于请求几乎同时发出，可能导致针对同一标签创建了多个发布对象。因此，将构建和发布拆分为不同的作业，只在矩阵中执行构建。此外，通过为生成二进制文件的 electron-builder 选项添加 `--publish never`，阻止隐式发布。

```yaml
name: Release

on:
  push:
    branches:
      - "!*"
    tags:
      - "v*"

jobs:
  build:

    runs-on: ${{ matrix.os }}

    strategy:
      fail-fast: false
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]

    steps:
    - uses: actions/checkout@v4
    - name: Setup nodejs
      uses: actions/setup-node@v4
      with:
        node-version: '20'
    - name: Install dependencies
      run: npm install
    - name: Package (Windows / Linux)
      if: matrix.os != 'macos-latest'
      run: npm run dist -- --publish never
    - name: Package (macOS)
      if: matrix.os == 'macos-latest'
      run: npx electron-builder --mac --universal --publish never # 阻止 electron-builder 的隐式发布
    - name: Upload artifacts
      uses: actions/upload-artifact@v4
      with:
        name: dist-${{ matrix.os }}
        path: |
          dist/**/*.exe
          dist/**/*.exe.blockmap
          dist/**/*.deb
          dist/**/*.AppImage
          dist/**/*.dmg
          dist/**/*.dmg.blockmap
          dist/**/*.zip
          dist/**/*.zip.blockmap
          dist/latest*.yml
        if-no-files-found: ignore

  publish:
    needs: build
    runs-on: ubuntu-latest

    steps:
    - name: Download artifacts
      uses: actions/download-artifact@v4
      with:
        path: dist
        pattern: dist-*
        merge-multiple: true
    - name: Publish
      uses: softprops/action-gh-release@v2
      with:
        files: |
          dist/*.exe
          dist/*.deb
          dist/*.AppImage
          dist/*.dmg
          dist/*.zip
        prerelease: true
```

由于设置了 `fail-fast: false`，会在所有 Runner 的作业结束后，才执行后续的 publish 作业。

## Pre-release 本身变成了 immutable
使用拆分作业后的工作流重新 push v3.9.1 标签后，3 个 Runner 的构建作业全部成功。然而，最后 publish 作业的 Publish 步骤本身，这次却因如下错误而失败。

> Cannot upload asset sbe-3.9.1-universal-mac.zip to an immutable release.

本应已整合为一个作业，却出现了 4 个资产（exe、dmg、zip、AppImage）中前 3 个可以上传，只有最后 1 个被拒绝的半途失败。原因写在 softprops/action-gh-release 自身输出的错误消息中。

> GitHub only allows asset uploads before a release is published, but draft prereleases publish with the release.published event instead of release.prereleased. If you need prereleases with assets on an immutable-release repository, keep the release as a draft with draft: true, then publish it later from that draft and subscribe downstream workflows to release.published.

也就是说，在启用了 Immutable releases 的仓库中，如果仅指定 `prerelease: true`，会在创建发布的同时触发 `release.published` 事件，并立即公开和 immutable 化。虽然开始几乎同时上传 4 个资产，但在上传过程中发布被锁定，因此只有来不及上传的资产被拒绝。

因此，如下通过 softprops/action-gh-release 的选项指定 `draft: true`，修改为不创建 Pre-release，而是以草稿形式创建发布。

```yaml:Release.yml
    - name: Publish
      uses: softprops/action-gh-release@v2
      with:
        files: |
          dist/*.exe
          dist/*.deb
          dist/*.AppImage
          dist/*.dmg
          dist/*.zip
        prerelease: true
        draft: true # 以草稿模式创建发布
```

v3.9.1 标签也已被用于那个在空状态下 immutable 化的发布，因此同样无法复用。最终，又以 v3.9.2 重新 push 标签，终于创建出了包含 4 个资产的草稿发布。由于草稿状态仍可修改，删除了不需要的 `.blockmap` 文件等内容，确认后点击 `publish`，顺利完成发布。

## 发生了什么变化
在 softprops/action-gh-release 当前最新版 @v3 的文档中，有如下说明。

> GitHub only allows asset uploads before a release is published, but draft prereleases publish with the release.published event instead of release.prereleased. If you need prereleases with assets on an immutable-release repository, keep the release as a draft with draft: true, then publish it later from that draft.

也就是说，目前仅设置 prerelease: true 时，会立即通过 release.published 事件公开并 immutable 化。

- 一年前，即便 `prerelease: true`，在人工点击“Publish”之前也不会公开、不会锁定（实际上行为与 draft 相同）
- 现在，仅设置 `prerelease: true` 就会立即公开并锁定，只有显式设置 `draft: true` 才能获得相同的行为。

也就是说，多个作业并行向同一个发布写入的结构本身，一年前就没有改变。当时即使如此也没有损坏，是因为“Pre-release 在人工手动 Publish 前不会被锁定”这一规格，使并行写入在发生冲突前还有缓冲时间。GitHub 在这段时间里将规格严格化为“Pre-release 也会立即锁定”（可能是为了堵住这样的漏洞：如果没有人手动 publish，发布就会永久保持可变状态，从而使 immutable release 的保证形同虚设）。而这次时隔一年再次执行，似乎正好受到了这一变更的影响。

:::info
以上为推测，未能找到明确记载此规格变更的 GitHub 官方 Changelog 博客条目。请了解，这只是基于高度可信的旁证（笔者过去博客中的描述、softprops/action-gh-release 文档当前的注意事项）作出的推断。
:::

## 结语
以上便是由于 Immutable releases 的规格变更，发布构建流水线在不知不觉间损坏的经过。

这次是从 v3.8.0 更新至 v3.9.2，但 v3.9.0 和 v3.9.1 由于标签名被 immutable 发布占用而成为一次性版本。实际应用代码的变更仅包括修复 CWE-918（SSRF）等轻微修改。其余全部都是因修复此工作流相关问题而消耗的版本号。

Matrix 构建是将作业并行化的有效手段，但可以看出，在与 Immutable Releases 这类会固定资源的功能一起使用时需要注意。我认为 Immutable Release 本身变得更加安全了，因此可以放心使用。
