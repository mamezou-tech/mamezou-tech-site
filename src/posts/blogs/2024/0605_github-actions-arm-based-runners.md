---
title: 高コスパで電力効率のよい Arm ベースの GitHub Actions Runner を使っていく
author: masahiro-kondo
date: 2024-06-05
tags: [GitHub, CI/CD]
image: true
---

## はじめに

Arm ベースの Actions Runner がパブリックベータになりました。Arm ベースの Linux / Windows ランナーが提供されます。


[Actions: Arm-based linux and windows runners are now in public beta](https://github.blog/changelog/2024-06-03-actions-arm-based-linux-and-windows-runners-are-now-in-public-beta/)

GitHub のブログでは、Arm テクノロジーがデータセンターの電力消費を削減することが記載されています。Windows ランナーについては、GitHub と Arm が提携して Windows VM イメージを提供しているようです[^1]。

[^1]: Arm ベースの Windows PC はかなり昔発売されたことがありましたが、パワー不足だったのか価格の問題があったのか普及しなかったですね。

[Arm64 on GitHub Actions: Powering faster, more efficient build systems](https://github.blog/2024-06-03-arm64-on-github-actions-powering-faster-more-efficient-build-systems/)

我々ユーザーにとっての魅力は x64のランナーに比べ37%も安いその価格です。価格表は以下にあります。

[Per-minute rates | About billing for GitHub Actions - GitHub Docs](https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions#per-minute-rates)

:::info:2024.09.05追記
Arm 版の Linux / Windows Runner が GA になりました。

[GitHub Actions: arm64 Linux and Windows runners are now generally available · GitHub Changelog](https://github.blog/changelog/2024-09-03-github-actions-arm64-linux-and-windows-runners-are-now-generally-available/)
:::

## Arm ベースの Runner をオーガニゼーションに登録する
Arm ベースの Runner は有料プラン(Team 以上)のオーガニゼーションで利用できます。

オーガニゼーションの Settings -> Actions -> Runners を選択し、Runners のページで `New runner` ボタンをクリックします。

![Manage runners](https://i.gyazo.com/7e69112a982438b91d4fb64fa1a47acf.png)

`New GitHub-hosted runner` をクリックします。

![New GitHub-hosted runner](https://i.gyazo.com/3fe7a35f6faab82f5763bca0ce1de191.png)

Runner 作成の UI が表示されます。`Linux ARM64` と `Windows ARM64` が Beta として選択できるようになっています。

![Create new runner](https://i.gyazo.com/a87926697ae2a32b1e2ada1692b54a38.jpg)

ひとまず最小スペックの Linux ARM 64、Ubuntu 22.04、2-core 8GB RAM のマシンに設定し `linux-arm64` という名前にして `Create runner` をクリックしました。


![Create Linux Arm64 Runner](https://i.gyazo.com/b77ad12ecd825f8cf702b8a8a2f9d1d5.jpg)

すぐに Runner がセットアップされ利用可能になりました。

![Linux Arm64 Runner created](https://i.gyazo.com/c76d2b9dba9399af5384592951ecfeee.png)

## 速度比較
上記の Arm Runner に合わせて最小構成の x64 Runner を比較用として `linux-x64` という名前で作成しました。

![Linux-x64 runner](https://i.gyazo.com/bdedd9789d23dbbb285861606d492cd8.png)

:::info
今回の比較は private リポジトリで行いました。最初 x64 Runner については `ubuntu-latest` を指定しようかと思ったのですが、GitHub の日本語ドキュメントには private リポジトリ用 Runner のスペックが記載されているのに対し、英語版では見つけられませんでした。そこで比較用に同等スペックで作成することにしました。
:::

以前の記事「[GitHub Actions でハイスペックな Larger runners を試す](/blogs/2023/06/09/github-actions-larger-runners/)」で使ったのと同様のワークフローをベンチマーク用に準備しました。

### Electron アプリのビルド

Electron アプリのビルドを行うワークフローです。前掲の記事と同様、[mamezou-tech で公開している Electron のサンプル](https://github.com/mamezou-tech/electron-example-browserview)をビルドするフローとなっており、`linux-x64`, `linux-arm64` の Runner でそれぞれ実行する構成になっています。

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

主要ステップのビルド時間を表にしました。2回計測した平均(単位:秒)です。

| | Linux x64 | Linux arm64|
|:--|:--|:--|
| Setup nodejs | 8.5 | 5.0 |
| Install dependencies | 10.0  | 5.5 |
| Package | 24.0 | 23.5 |
| Upload artifacts | 15.5 | 12.0 | 

パッケージングに要した時間はほぼ互角でしたが、Node.js セットアップ、npm install、成果物アップロードは差がついており、Arm 版 Runner の方がフロー全体のスループットが高い結果となりました。

### Go のバッチ処理

[sbgraph](https://developer.mamezou-tech.com/oss-intro/sbgraph/) を使ったバッチ処理の比較です。sbgraph をビルドし、Scrapbox のプロジェクトからページデータをフェッチして、集計やグラフ構造生成を実行しています。これも `linux-x64` と `linux-arm64` の Runner でそれぞれ実行するようにしました。

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

主要ステップの比較です。これも2回計測した平均(単位:秒)です。Stup Go やデータフェッチは x64 の方がやや速いですが、Arm は go install がかなり速く、全体としては Arm Runner のスループットが高い結果となりました。

| | Linux x64 | Linux arm64|
|:--|:--|:--|
| Setup Go   | 4.0 | 7.5 |
| Install    | 35.5 | 19.5 |
| Fetch data | 3.0 | 4.5 |
| Aggregate  | 0 | 0 |
| Generate graph  | 0 | 0 |
| Upload     | 1.5 | 1.0 |


## さいごに
簡単なベンチマークでしたが、Arm Runner は x64 Runner に遜色なく(上回ることもある)結果となりました。価格も安いのでできるだけ Arm Runner を採用したくなります。

Arm アーキテクチャでは動かないソフトウェアもあるので、全てのフローを置き換えられるわけではありませんが、利用できるケースでは使っていきたいと思っています。
