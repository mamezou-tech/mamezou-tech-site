---
title: Immediate Download of Artifacts with Artifacts Action v4 in GitHub Actions
author: masahiro-kondo
date: 2024-01-04T00:00:00.000Z
tags:
  - GitHub
  - CI/CD
image: true
translate: true

---

:::info
To reach a broader audience, this article has been translated from Japanese.
You can find the original version [here](https://developer.mamezou-tech.com/blogs/2024/01/04/actions-artifacts-v4/).
:::



## Introduction

The v4 of actions/upload-artifact and actions/download-artifact, used for uploading and downloading artifacts in GitHub Actions workflows, is now generally available (GA).

[GitHub Actions - Artifacts v4 is now Generally Available](https://github.blog/changelog/2023-12-14-github-actions-artifacts-v4-is-now-generally-available/)

Improvements include faster uploads and the ability to download artifacts as soon as the upload is complete, even if the entire workflow has not finished.

## Key Changes

1. Artifacts are now treated within the scope of a job, not the workflow
2. Artifacts are not backward compatible with previous versions
3. Artifact immutability is guaranteed, upload and download performance is improved, and protection against corruption that often occurs with simultaneous uploads is provided
4. Up to 10 artifacts can be uploaded in a single job

For the first point, especially in workflows that execute jobs in parallel using the Matrix strategy, it was not possible to download artifacts until the entire workflow had finished. Now, artifacts can be downloaded as soon as the job succeeds. This allows for immediate download and verification of artifacts from jobs that have finished, even when running time-consuming jobs in parallel.

Regarding the second point, when exchanging artifacts between dependent jobs, it is necessary to use the same version of upload-artifact and download-artifact.

For the third point, it is no longer possible to upload artifacts with the same name multiple times. Flows that generate artifacts with the same name in multiple jobs and use the artifacts from the last job executed will need to be revised.

For more details on the changes, please refer to the following.

[v4 -whats-new](https://github.com/actions/upload-artifact?tab=readme-ov-file#v4---whats-new)

## Trying it Out

Let's apply it to an existing job. Below is a workflow for building and uploading binaries for an Electron app I'm developing personally for different platforms (Windows / macOS / Ubuntu), using strategy/matrix to execute jobs for each target OS. The final step in each job uses upload-artifact to upload the built binaries.

```yaml
name: Build binaries

on:
  workflow_dispatch:
    inputs:
      beta:
        description: 'Build with Electron beta' # Parameter to specify whether to use the Electron beta version
        required: true
        default: 'false'

jobs:
  build:

    runs-on: ${{ matrix.os }}

    strategy:
      fail-fast: false
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest] # Target OS (Runner)

    steps:
    - uses: actions/checkout@v4
    - name: Setup nodejs
      uses: actions/setup-node@v4
      with:
        node-version: '18'
    - name: Install dependencies
      run: npm install
    - name: Install Electron beta
      if: github.event.inputs.beta == 'true'
      run: npm install electron@beta
    - name: Package
      run: npm run pack # Execute electron-builder with npm script
      env:
        GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    - name: Upload artifacts
      uses: actions/upload-artifact@v3
      with:
        name: package-${{ matrix.os }}
        path: dist/**  # Upload artifacts under dist
```

:::info
In this flow, including the target OS name in the artifact name ensures that the artifact names are unique for each job.

Setting `fail-fast: false` ensures that if one job fails, the other jobs are not cancelled, and the artifacts from successful jobs are uploaded.
:::

Initially executing with v3, the build summary page shows the progress for each target OS, but artifacts are not displayed until a job is completed.

![Job Summary in progress](https://i.gyazo.com/b15967237a39a0ca01a607c0ef44b8a6.png)

Artifacts were not available for download until all jobs had completed.

![Job Summary completed](https://i.gyazo.com/8221a10ce5894105ef0a81af7f1fb79d.png)

Now, let's update the final step of the workflow to use upload-artifact v4.

```yaml
    - name: Upload artifacts
      uses: actions/upload-artifact@v4
      with:
        name: package-${{ matrix.os }}
        path: dist/**  # Upload artifacts under dist
```

With v4 specified, artifacts from completed jobs became available for download immediately.

![](https://i.gyazo.com/2e861755a7d168e241e7a44cbd92ea2f.png)

:::info
The screen updates in real-time without needing to reload.
:::

## Conclusion
We tried Artifacts Action v4. It's convenient to be able to use artifacts without waiting for the workflow to finish, especially when building artifacts takes time. The performance of uploads has also improved, so it's something we'd like to migrate to as soon as possible.
