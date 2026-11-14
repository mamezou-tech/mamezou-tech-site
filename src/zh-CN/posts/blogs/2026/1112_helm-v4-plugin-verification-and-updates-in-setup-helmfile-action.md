---
title: 随着 GitHub Actions Runner 迁移至 Helm 4 系，setup-helmfile Action 的应对
author: masahiro-kondo
date: 2026-11-12T00:00:00.000Z
image: true
tags:
  - GitHub Actions
  - oss
  - CI/CD
translate: true

---

## 前言

is 的 GitHub 组织（mamezou-tech）发布了一个用于 GitHub Actions 的 Action——setup-helmfile。

@[og](https://github.com/marketplace/actions/setup-helmfile)

这是一个能够在 GitHub Actions 工作流中使用 helmfile 的 Action。helmfile 可用于集中安装多个 Helm chart。

:::info
setup-helmfile 也在以下文章中介绍过。

@[og](https://developer.mamezou-tech.com/oss-intro/setup-helmfile/)
:::

setup-helmfile 的默认行为是安装 Helm plugin：helm-diff、helm-s3。

## GitHub Actions Runner 的 helm CLI 迁移至 v4 系

前些天，在合并 PR 并进行发布工作时，使用 GitHub Actions Runner 预安装 helm CLI 的测试用例发生了错误。

setup-helmfile 将所使用的 helm CLI 版本固定为 v3 系，只有当使用者指定 `install-helm: no` 时，才会跳过 helm CLI 的安装，并使用 Runner 中已安装的 helm CLI。

这次，在通过 `install-helm: no` 进行安装的测试用例中，插件安装失败了。经查明，这是由于 Runner 预安装的 helm CLI 已迁移至 v4 系所导致的。

## Helm v4 中引入的插件验证

Helm v4 为 plugin install 命令新增了 `--verify` 标志，并且默认设置为启用（true）。因此，在安装插件时，会默认执行 PGP 签名（provenance 文件）的验证。这是 Helm 开发社区为保障供应链安全而采取的措施。

对于主流插件，由于维护者最终会支持签名，因此通常只需执行 helm plugin install，验证便会运行并顺利完成安装。

不过，在签名尚未普及的过渡阶段，或对于维护不太活跃的插件，也会出现希望禁用 verify 后仍然进行安装的场景。

预计在一段时间内，需要固定所使用插件的版本，并禁用 verify 来应对。

```shell
# Helm v4 时代的常见命令（跳过验证 + 固定版本）
helm plugin install <URL> --version <TAG> --verify=false
```

## setup-helmfile 中的应对

为了不破坏现有用户的 CI，默认 helm 版本目前仍固定（PIN）在 v3 系。

安装插件时，会通过 `--verify=false` 执行安装；如果发生 `unknown flag: verify` 错误，则会在不使用 verify 选项的情况下进行安装。

```javascript
async function installHelmPlugin(plugin) {
  let stderr = "";
  const exitCode = await exec.exec(`helm plugin install ${plugin} --verify=false`, [], {
    ignoreReturnCode: true,
    listeners: {
      stderr: (data) => { stderr += data.toString(); },
    },
  });
  if (exitCode === 0) {
    return;
  }
  if (/unknown flag:\s*--verify/.test(stderr)) {
    // 仅在出现未知标志错误时，才不带标志重试
    await exec.exec(`helm plugin install ${plugin}`);
    return;
  }
  // 对于其他错误，不重试并抛出错误
  throw new Error(`helm plugin install ${plugin} failed:\n${stderr}`);
}
```

这样一来，即使 Helm 4 系成为主流，也无需修改代码，只需提升默认版本即可。

## 结语

GitHub Actions Runner（ubuntu-latest）最近也已更新到 Ubuntu 26.04，各类软件的版本同样得到了升级。Helm 的生态系统也正在逐步转向更安全的方向。

setup-helmfile 也会顺应这一趋势，持续进行维护。
