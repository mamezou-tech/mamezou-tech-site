---
title: 使用 GitHub 的 Immutable releases 将发布设为不可更改
author: masahiro-kondo
date: 2025-11-16T00:00:00.000Z
tags:
  - GitHub
  - Security
image: true
translate: true

---

## 简介
上个月，Immutable releases 已进入 GA（正式可用）阶段。

@[og](https://github.blog/changelog/2025-10-28-immutable-releases-are-now-generally-available/)

这样就可以确保发布在公开后没有被更改，从而避免篡改或意外更改。

## 不可更改发布的特点
可以在以下文档中查看。

@[og](https://docs.github.com/ja/code-security/supply-chain-security/understanding-your-software-supply-chain/immutable-releases)

不可更改发布具有以下特点：

- **无法移动或删除 Git 标签**：与发布关联的 Git 标签会被锁定到特定提交，无法更改或删除。
- **无法更改或删除发布资产**：附加到发布的所有文件都受到保护，无法更改或删除。

发布的配置证明会自动生成，可以验证发布标签、提交 SHA、资产等。

当不可更改发布生效后，即使删除该仓库并创建同名新仓库，也无法重用原仓库中与不可更改发布关联的标签。这是一项强大的保护功能。

## 试用
我在自己维护的第三方 Cosense 应用 [sbe](https://github.com/kondoumh/sbe) 的仓库中进行了设置尝试。

![Enable release immiutability](https://i.gyazo.com/b351baf2f4f29e26c64597ec1d75aa90.png)

:::info
Immutable releases 可以在仓库级别或组织级别进行设置。
:::

由于发布后即使是仓库提交者也无法更改，建议按照以下步骤在草稿发布中进行操作：

- 创建草稿发布
- 将所有资产附加到草稿发布
- 将草稿发布设为正式发布

正好 sbe 的更改积累了一些，我按照最佳实践创建一个发布草稿。

![Create draft release](https://i.gyazo.com/c7fcc3d69b5bb2f6f6dbef04ae2d05a5.jpg)

保存的草稿发布仍然是非公开的，可以修改。

![Draft release](https://i.gyazo.com/a69962e36213d6f0820ba38b6bea38dd.png)

:::info
在此应用的发布工作流中，使用创建标签作为触发条件来生成发布。  
我们使用了名为 [softprops/action-gh-release](https://github.com/softprops/action-gh-release) 的 Action。它也负责附加发布产物。通过将 `prerelease` 设置为 `true`，它会创建草稿发布。

```yaml
    - name: Publish
      uses: softprops/action-gh-release@v2
      with:
        files: |
          dist/**/*.exe
          dist/**/*.deb
          dist/**/*.AppImage
          dist/**/*.dmg
        prerelease: true
```
:::

检查附加文件和差异后，发布正式版本。

![Publish release](https://i.gyazo.com/c6ba06e4e593492a3d301f5f5c60c27f.png)

启用 Immutable releases 后会弹出确认对话框。

![Confirm to publish](https://i.gyazo.com/2dc74c05ef35a8631210c4475aafea27.png)

发布的版本带有 Immutable 标记。

![Immutable mark](https://i.gyazo.com/c7643b4b1199ee15394c3bc50f06fbbc.png)

资产中还新增了发布的 attestation（证明）的 JSON 文件。

![Release attestation](https://i.gyazo.com/b32ab0187a63223535352a5478133ef6.png)

在编辑界面，可以编辑发布说明等，但会显示标签和资产无法编辑的信息。

![Cannot Edit tag or asset](https://i.gyazo.com/ba4249ba6e4e2110f45c67a7a3be7ae1.png)

## 验证发布
使用者可以通过 GitHub CLI 验证由 Immutable releases 创建的不可更改发布。

@[og](https://docs.github.com/ja/code-security/supply-chain-security/understanding-your-software-supply-chain/verifying-the-integrity-of-a-release?utm_medium=changelog&utm_campaign=universe25)

要验证发布是否存在且不可变，可在克隆的仓库目录中运行以下命令：

```shell
gh release verify RELEASE-TAG
```

验证 sbe 的 v3.8.0 发布时，将使用 GitHub API 读取并显示证明。

```shell
$ gh release verify v3.8.0

Resolved tag v3.8.0 to sha1:1f3f380d33f022230046a3200a67950ea027c8a1
Loaded attestation from GitHub API
✓ Release v3.8.0 verified!

Assets
NAME                     DIGEST                                                                 
sbe-3.8.0-universal.dmg  sha256:ab1c2595601136bf82aa7594d48bc764fe6f226ed1071c52441eb531f34e0252
sbe-3.8.0.AppImage       sha256:de1797b12152531df71e78519d660e32e1a79dca203bc3201d85b2facfe4b5a9
sbe-Setup-3.8.0.exe      sha256:a4a8d6fe8ddde6e1a2005a29d7e2759511cb537427e4a0ff03440c5e9f48fb94
```

要验证本地的产物与发布产物完全一致，可使用以下命令：

```shell
gh release verify-asset RELEASE-TAG ARTIFACT-PATH
```

我尝试从发布资产下载适用于 macOS 的通用安装程序二进制文件进行验证。

```shell
$ gh release verify-asset v3.8.0 ~/Downloads/sbe-3.8.0-universal.dmg 
Calculated digest for sbe-3.8.0-universal.dmg: sha256:ab1c2595601136bf82aa7594d48bc764fe6f226ed1071c52441eb531f34e0252
Resolved tag v3.8.0 to sha1:1f3f380d33f022230046a3200a67950ea027c8a1
Loaded attestation from GitHub API

✓ Verification succeeded! sbe-3.8.0-universal.dmg is present in release v3.8.0
```

:::info
资产的证明使用了 Sigstore 的签名技术。这是一种可以验证软件来源信息、提高软件供应链安全性的技术。虽然是很早之前的文章，但可以在以下地址查看：

@[og](https://developer.mamezou-tech.com/blogs/2022/08/17/github-actions-workflows-for-software-supply-chain-security/)
:::

## 最后
以上就是对 Immutable releases 的介绍。在拥有一定数量用户的 OSS 中，采用不可更改发布会更好。

在 GitHub Actions 中，当使用第三方 Action 时，也会指定到提交哈希而不仅仅是版本号以避免意外更改的影响。如果提供不可更改发布的 Action 越来越多，那么使用者也会更加安心。
