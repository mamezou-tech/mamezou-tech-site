---
title: >-
  Supporting setup-helmfile Action for GitHub Actions Runner's Migration to Helm
  4
author: masahiro-kondo
date: 2026-11-12T00:00:00.000Z
image: true
tags:
  - GitHub Actions
  - oss
  - CI/CD
translate: true

---

## Introduction

Mamezou's GitHub Organization (mamezou-tech) publishes setup-helmfile, an Action for GitHub Actions.

@[og](https://github.com/marketplace/actions/setup-helmfile)

This Action enables you to use helmfile, which installs multiple Helm charts together, within GitHub Actions workflows.

:::info
setup-helmfile is also introduced in the following article.

@[og](https://developer.mamezou-tech.com/oss-intro/setup-helmfile/)
:::

By default, setup-helmfile installs the Helm plugins helm-diff and helm-s3.

## The helm CLI on GitHub Actions Runners Migrates to v4

The other day, while merging PRs and performing release work, an error occurred in a test case that uses the helm CLI preinstalled on the GitHub Actions Runner.

setup-helmfile fixes the version of the helm CLI it uses to the v3 series. Only when a user specifies `install-helm: no` does it skip installing the helm CLI and use the helm CLI installed on the Runner.

This time, plugin installation failed in a test case that installs with `install-helm: no`. It turned out that this was because the helm CLI preinstalled on the Runner had migrated to the v4 series.

## Plugin Verification Introduced in Helm v4

Helm v4 adds the `--verify` flag to the `plugin install` command, and it is enabled (`true`) by default. As a result, PGP signature (provenance file) verification is performed by default when installing plugins. This is an initiative by the Helm development community to ensure supply chain security.

Major plugins will eventually be signed by their maintainers, so it is expected that they can be installed successfully with verification simply by running `helm plugin install` as usual.

However, during the transition period until signatures become widespread, or for plugins that are not actively maintained, there will be situations where you still want to install them with verification disabled.

It is likely that, for some time, users will pin the versions of the plugins they use and disable verification as a workaround.

```shell
# A common command in the Helm v4 era (skip verification + pin version)
helm plugin install <URL> --version <TAG> --verify=false
```

## Support in setup-helmfile

To avoid breaking existing users' CI, the default Helm version is still pinned to the v3 series.

When installing plugins, it first attempts installation with `--verify=false`. If an `unknown flag: verify` error occurs, it installs the plugin without the verify option.

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
    // Retry without the flag only when an unknown-flag error occurs
    await exec.exec(`helm plugin install ${plugin}`);
    return;
  }
  // For other errors, do not retry; throw an error
  throw new Error(`helm plugin install ${plugin} failed:\n${stderr}`);
}
```

With this approach, even when the Helm 4 series becomes mainstream, all that is needed is to raise the default version without changing the code.

## Conclusion

GitHub Actions Runner (`ubuntu-latest`) was also recently updated to Ubuntu 26.04, and various software packages have been upgraded as well. The Helm ecosystem is also shifting toward greater security.

setup-helmfile will continue to be maintained in line with this trend.
