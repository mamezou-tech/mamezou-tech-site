---
title: >-
  Using High Cost-Performance and Power-Efficient Arm-Based GitHub Actions
  Runner
author: masahiro-kondo
date: 2024-06-05T00:00:00.000Z
tags:
  - GitHub
  - CI/CD
image: true
translate: true

---




## Introduction

Arm-based Actions Runner has entered public beta. Arm-based Linux / Windows runners are now available.

[Actions: Arm-based linux and windows runners are now in public beta](https://github.blog/changelog/2024-06-03-actions-arm-based-linux-and-windows-runners-are-now-in-public-beta/)

GitHub's blog mentions that Arm technology helps reduce data center power consumption. For Windows runners, it seems that GitHub and Arm are partnering to provide Windows VM images[^1].

[^1]: Arm-based Windows PCs were released quite some time ago, but they did not become popular, possibly due to lack of power or pricing issues.

[Arm64 on GitHub Actions: Powering faster, more efficient build systems](https://github.blog/2024-06-03-arm64-on-github-actions-powering-faster-more-efficient-build-systems/)

The appeal for us users is its price, which is 37% cheaper compared to x64 runners. The pricing table is available below.

[Per-minute rates | About billing for GitHub Actions - GitHub Docs](https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions#per-minute-rates)

## Registering Arm-Based Runner to Organization
Arm-based Runner is available for organizations on paid plans (Team and above).

Select Organization Settings -> Actions -> Runners, and click the `New runner` button on the Runners page.

![Manage runners](https://i.gyazo.com/7e69112a982438b91d4fb64fa1a47acf.png)

Click `New GitHub-hosted runner`.

![New GitHub-hosted runner](https://i.gyazo.com/3fe7a35f6faab82f5763bca0ce1de191.png)

The UI for creating a runner will be displayed. `Linux ARM64` and `Windows ARM64` can be selected as Beta.

![Create new runner](https://i.gyazo.com/a87926697ae2a32b1e2ada1692b54a38.jpg)

For now, I set it to the minimum spec Linux ARM 64, Ubuntu 22.04, 2-core 8GB RAM machine, named it `linux-arm64`, and clicked `Create runner`.

![Create Linux Arm64 Runner](https://i.gyazo.com/b77ad12ecd825f8cf702b8a8a2f9d1d5.jpg)

The runner was set up and available immediately.

![Linux Arm64 Runner created](https://i.gyazo.com/c76d2b9dba9399af5384592951ecfeee.png)

## Speed Comparison
In addition to the above Arm Runner, I created a minimum configuration x64 Runner named `linux-x64` for comparison.

![Linux-x64 runner](https://i.gyazo.com/bdedd9789d23dbbb285861606d492cd8.png)

:::info
This comparison was conducted in a private repository. Initially, I thought of specifying `ubuntu-latest` for the x64 Runner, but I couldn't find the specs for private repository runners in GitHub's English documentation, even though they are listed in the Japanese documentation. Therefore, I decided to create it with equivalent specs for comparison.
:::

I prepared the same workflow used in the previous article "[Trying High-Spec Larger Runners in GitHub Actions](/blogs/2023/06/09/github-actions-larger-runners/)" for benchmarking.

### Building an Electron App

This workflow builds an Electron app. As in the previous article, it builds the [Electron sample published by mamezou-tech](https://github.com/mamezou-tech/electron-example-browserview) and runs it on `linux-x64` and `linux-arm64` runners.

```yaml:build-electron-app.yml
name: Build Electron App

on:
  workflow_dispatch:

jobs:
  build:

    runs-on: ${{ matrix.os }}

    strategy:
      fail-fast: false
      matrix:
        os: [linux-x64, linux-arm64]

    steps:
    - uses: actions/checkout@v4
      with:
        repository: 'mamezou-tech/electron-example-browserview'
        path: electron-example-browserview      
    - name: Setup nodejs
      uses: actions/setup-node@v4
      with:
        node-version: '20'
    - name: Install dependencies
      run: |
        cd electron-example-browserview
        npm install
    - name: Package
      run: |
        cd electron-example-browserview
        npx electron-builder --dir
      env:
        GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    - name: Upload artifacts
      uses: actions/upload-artifact@v4
      with:
        name: package-${{ matrix.os }}
        path: electron-example-browserview/dist/*
```

I tabulated the build times for the main steps. The average of two measurements (unit: seconds).

| | Linux x64 | Linux arm64|
|:--|:--|:--|
| Setup nodejs | 8.5 | 5.0 |
| Install dependencies | 10.0  | 5.5 |
| Package | 24.0 | 23.5 |
| Upload artifacts | 15.5 | 12.0 | 

The time taken for packaging was almost equal, but there were differences in Node.js setup, npm install, and artifact upload, with the Arm version runner showing higher throughput overall.

### Go Batch Processing

This is a comparison of batch processing using [sbgraph](https://developer.mamezou-tech.com/oss-intro/sbgraph/). It builds sbgraph, fetches page data from a Scrapbox project, and performs aggregation and graph structure generation. This was also run on both `linux-x64` and `linux-arm64` runners.

```yaml:bench.yml
name: sbgraph benchmark

on:
  workflow_dispatch:

jobs:

  build:
    runs-on: ${{ matrix.os }}

    strategy:
      fail-fast: false
      matrix:
        os: [linux-x64, linux-arm64]

    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-go@v5
      with:
        go-version: 1.22
    - name: Install sbgraph
      run: |
        go install github.com/mamezou-tech/sbgraph@latest
        sbgraph init
        sbgraph project -p help-jp
    - name: Fetch data
      run: sbgraph fetch
    - name: Aggregate
      run: sbgraph aggregate -s=true
    - name: Generate Graph data
      run: sbgraph graph -i=true -j=true
    - name: Upload result
      uses: actions/upload-artifact@v4
      with:
        name: help-jp-result-${{ matrix.os }}
        path: _work/help-jp*
```

Here is the comparison of the main steps. The average of two measurements (unit: seconds). Setup Go and data fetch were slightly faster on x64, but Arm was significantly faster for go install, resulting in higher throughput overall for the Arm runner.

| | Linux x64 | Linux arm64|
|:--|:--|:--|
| Setup Go   | 4.0 | 7.5 |
| Install    | 35.5 | 19.5 |
| Fetch data | 3.0 | 4.5 |
| Aggregate  | 0 | 0 |
| Generate graph  | 0 | 0 |
| Upload     | 1.5 | 1.0 |

## Conclusion
Although it was a simple benchmark, the Arm runner performed comparably to (and sometimes better than) the x64 runner. Given its lower cost, it makes sense to adopt the Arm runner as much as possible.

There are some software that do not run on the Arm architecture, so not all workflows can be replaced, but I intend to use it where applicable.
