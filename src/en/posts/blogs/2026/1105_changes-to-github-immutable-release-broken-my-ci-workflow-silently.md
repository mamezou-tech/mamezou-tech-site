---
title: >-
  How I Fixed a Release Pipeline That Quietly Broke in a Repository Configured
  with GitHub Immutable Releases
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

## Introduction
A year ago, I applied Immutable releases to the repository of an Electron app I develop personally, in order to try out this feature for preventing release tampering and ensuring software supply chain security.

@[og](https://developer.mamezou-tech.com/blogs/2025/11/16/github-immutable-releases/)

Quite some time has passed since then, but due to the eMudhra incident, I decided that it would not be good to leave an old Electron app unattended, so I performed a release.

The repository for my Electron app is below.

@[og](https://github.com/kondoumh/sbe)

:::info:About the eMudhra security incident
> An issue in which eight intermediate CA keys (six for TLS and two for code signing) in the “emSign G3” hierarchy of the certificate authority “eMudhra” were generated so weakly that they could be recovered.

*From an article by Forest Watch*

@[og](https://forest.watch.impress.co.jp/docs/news/2152996.html)

As described in Jack's blog, Electron bundles Chromium's certificate store, and the store is not updated unless Chromium or Node is updated and rebuilt. In other words, if you continue distributing an app built with an old version of Electron, it will continue trusting root certificates that should no longer be trusted indefinitely.

@[og](https://blog.jxck.io/entries/2026-10-25/emudhra.html)

Because Electron apps contain the root certificates present at build time, apps that remain built with old Electron versions have the risk of continuing to trust certificates that should be revoked.
:::


## An Error Occurred in the Release Workflow
After making minor fixes to the app and upgrading Electron, it was time for the release. This repository is configured so that a release workflow starts when a new version tag is created and pushed. As described in the article mentioned at the beginning, binaries for macOS / Windows / Linux are generated on Actions Runners for each platform using strategy.matrix, and releases are created using [softprops/action-gh-release](https://github.com/softprops/action-gh-release).

This time, I bumped the app version to v3.9.0 and ran this workflow for the first time in a year, but it failed with the following error.

```shell
Found release v3.9.0 (with id=432353934)
⚠️ Unexpected error fetching GitHub release for tag refs/tags/v3.9.0: HttpError: Validation Failed: {"resource":"Release","code":"custom","field":"target_commitish","message":"target_commitish cannot be changed when release is immutable"} - https://docs.github.com/rest/releases/releases#update-a-release
Error: Validation Failed: {"resource":"Release","code":"custom","field":"target_commitish","message":"target_commitish cannot be changed when release is immutable"} - https://docs.github.com/rest/releases/releases#update-a-release
```

It appeared to be an error related to Immutable releases.

Upon investigation, it seemed that two release objects had been created for the v3.9.0 tag.

- id=432353876 (draft, immutable=false): All required asset files (sbe-Setup-3.9.0.exe, sbe-3.9.0-universal.dmg, sbe-3.9.0.AppImage) were present. It had not yet become Immutable.
- id=432353934 (published, prerelease, immutable=true): It was finalized as Immutable with zero assets, and had claimed the same tag name.

## Initial Workflow Implementation
The workflow file at the time the error occurred looked as follows. It built and released everything in one go within the Runner job for each platform using strategy.matrix.

```yaml:Release.yml(At the time of the error)
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
        prerelease: true ## Create in the pre-release state
```

Because `prerelease: true` is specified as a parameter for action-gh-release, this workflow adds the build artifacts to a Pre-release from each Runner.

At the time, this configuration appeared to properly create a draft release. The article also stated:

> Setting `prerelease` to `true` creates a draft release.

This meant that I followed a procedure where a human explicitly performed the final publication step by reviewing the attached files and differences in the draft, then clicking Publish.

## The Failed Pre-release Could Only Be Discarded
This time, among the duplicate releases created for v3.9.0, I thought that deleting the one that had become immutable while still empty would allow me to publish the other draft, which had all the assets. So, I deleted the empty release. However, when I clicked the `publish` button from the draft page, I got the following error instead.

> There was an error creating your Release: tag name was used by an immutable release.

Even though it was a Pre-release, it appears that a tag name once used by an immutable release continues to be recorded as “used” on the repository side even after that release is deleted. This makes sense as a design for preventing tampering. Since the v3.9.0 tag itself could no longer be used, I decided to bump the version and start over with v3.9.1.

## Avoiding the Race Condition
The first countermeasure I considered was resolving the race caused by publish being executed by three independent processes in strategy.matrix. Parallel matrix jobs run, and each job independently calls softprops/action-gh-release to create or update a release for the same v3.9.0 tag. Perhaps requests arrived at nearly the same time, resulting in multiple release objects being created for the same tag. Therefore, I separated the build and release jobs so that only the build would run in the matrix. I also suppressed implicit publishing by adding `--publish never` to the electron-builder options used to generate binaries.

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
      run: npx electron-builder --mac --universal --publish never # Prevent implicit releases by electron-builder
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

Because `fail-fast: false` is specified, the subsequent publish job runs only after the jobs on all Runners have finished.

## The Pre-release Itself Had Become Immutable
When I pushed the v3.9.1 tag again using the workflow with separated jobs, the build jobs on all three Runners succeeded. However, the Publish step of the final publish job itself failed this time with the following error.

> Cannot upload asset sbe-3.9.1-universal-mac.zip to an immutable release.

Although the jobs should have been consolidated into one, it was an incomplete failure: three of the four assets (exe, dmg, zip, AppImage) could be uploaded, while only the final one was rejected. The cause was written in the error message output by softprops/action-gh-release itself.

> GitHub only allows asset uploads before a release is published, but draft prereleases publish with the release.published event instead of release.prereleased. If you need prereleases with assets on an immutable-release repository, keep the release as a draft with draft: true, then publish it later from that draft and subscribe downstream workflows to release.published.

In other words, in repositories where Immutable releases is enabled, when only `prerelease: true` is specified, the `release.published` event is triggered at the same time the release is created, causing it to be published and made immutable immediately. The four assets began uploading almost simultaneously, but the release was locked midway through, so only the assets that did not finish in time were rejected.

Therefore, I changed the configuration as follows, specifying `draft: true` in the softprops/action-gh-release options to create the release as a draft rather than a Pre-release.

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
        draft: true # Create the release in draft mode
```

The v3.9.1 tag had also been used by a release that became immutable while empty, so it could not be reused either. In the end, I pushed the tag once more as v3.9.2, and finally a draft release containing all four assets was created. Since it remained editable as a draft, I deleted unnecessary `.blockmap` files and other items, checked the contents, then clicked `publish`, successfully completing the release.

## What Changed?
The documentation for the current latest version of softprops/action-gh-release, @v3, states the following.

> GitHub only allows asset uploads before a release is published, but draft prereleases publish with the release.published event instead of release.prereleased. If you need prereleases with assets on an immutable-release repository, keep the release as a draft with draft: true, then publish it later from that draft.

In other words, at this point, `prerelease: true` causes the release to be published and made immutable immediately through the release.published event.

- A year ago, even with `prerelease: true`, the release was not published or locked until a human clicked “Publish” (it effectively behaved like a draft).
- Now, using only `prerelease: true` causes immediate publication and locking. The previous behavior does not occur unless `draft: true` is explicitly specified.

In other words, the structure in which jobs write to the same release in parallel has not changed since a year ago. The reason it did not break then was that there was a grace period before parallel writes collided, thanks to the behavior whereby “a Pre-release is not locked until a human manually publishes it.” During that time, GitHub appears to have tightened the specification so that “Pre-releases are also locked immediately,” probably to close a loophole where the guarantees of immutable releases would be undermined because releases could remain mutable forever if nobody manually published them. It seems that running the workflow for the first time in a year caused me to be affected by that change.

:::info
The above is an inference, and I was unable to find an official GitHub Changelog blog entry explicitly documenting this specification change. Please be aware that this is a deduction based on highly credible circumstantial evidence: descriptions in my past blog post and the current note in the softprops/action-gh-release documentation.
:::

## Conclusion
This was the story of how a release build pipeline had silently broken due to a change in the Immutable releases specification.

This update went from v3.8.0 to v3.9.2, but v3.9.0 and v3.9.1 became disposable because their tag names were claimed by immutable releases. The actual changes to the app code were only minor fixes, such as a fix for CWE-918 (SSRF). All remaining version consumption was caused by fixes around this workflow.

Matrix builds are an effective way to parallelize jobs, but I learned that care is needed when using them together with features such as Immutable Releases that lock resources. I believe Immutable Releases itself has become more secure, so you can use it with confidence.
