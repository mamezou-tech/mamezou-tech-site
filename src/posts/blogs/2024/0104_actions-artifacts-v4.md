---
title: GitHub Actions の Artifacts Action v4 で成果物が即時ダウンロード可能に
author: masahiro-kondo
date: 2024-01-04
tags: [GitHub, CI/CD]
image: true
---

## はじめに

GitHub Actions ワークフローで成果物アップロード、ダウンロードに使用する actions/upload-artifact、actions/download-artifact の v4 が GA になりました。

[GitHub Actions - Artifacts v4 is now Generally Available](https://github.blog/changelog/2023-12-14-github-actions-artifacts-v4-is-now-generally-available/)

アップロードが高速化され、ワークフロー全体が終了していなくてもアップロードが完了すればダウンロード可能になるなどの改善が施されました。

## 重要な変更点

1. 成果物はワークフローのスコープではなくジョブのスコープで扱われる
1. 成果物は以前のバージョンとの互換性がない
1. 成果物の不変性が保障され、アップロード・ダウンロードの性能が向上、同時アップロードでよく発生する破損からも保護される
1. 1つのジョブで最大10個の成果物をアップロード可能

1番目について、特に Matrix strategy などを使ってジョブを並列に実行するワークフローにおいて、従来はワークフロー全体が終了しないと成果物のダウンロードができなかったのですが、ジョブが成功した時点でダウンロード可能になりました。これにより、時間がかかるジョブを並行で動かしている場合でも、終了したジョブの成果物を即時ダウンロードして検証できます。

2番目について、依存関係のあるジョブ間で成果物をやり取りする際、upload-artifact と download-artifact のバージョンは揃えておく必要があります。

3番目について、同じ名前の成果物を複数回アップロードすることができなくなりました。複数のジョブを実行して同じ名前で成果物を生成し、最後に実行されたジョブの成果物を利用しているようなフローは修正が必要です。

変更点についての詳細は、以下を参照してください。

[v4 -whats-new](https://github.com/actions/upload-artifact?tab=readme-ov-file#v4---whats-new)

## 適用してみる

では早速既存のジョブに適用してみます。以下は、[筆者が個人的に開発している Electron アプリ](/blogs/2021/12/15/developing-unofficial-scrapbox-app/)のバイナリを各プラットフォーム(Windows / macOS / Ubuntu)別にビルドしてアップロードするワークフローです。strategy/matrix を利用してターゲットの OS 毎にジョブを実行しています。各ジョブの最終ステップで upload-artifact を使ってビルドしたバイナリをアップロードしています。

```yaml
name: Build binaries

on:
  workflow_dispatch:
    inputs:
      beta:
        description: 'Build with Electron beta' # Electron の beta バージョンを利用するかを指定するパラメータ
        required: true
        default: 'false'

jobs:
  build:

    runs-on: ${{ matrix.os }}

    strategy:
      fail-fast: false
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest] # ターゲットの OS(Runner)

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
      run: npm run pack # npm script で electron-builder を実行
      env:
        GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    - name: Upload artifacts
      uses: actions/upload-artifact@v3
      with:
        name: package-${{ matrix.os }}
        path: dist/**  # dist 配下の成果物をアップロード
```

:::info
このフローでは、成果物名にターゲットの OS 名を含めていることでジョブ毎にユニークな成果物名になっています。

`fail-fast: false` に設定することで、いずれかのジョブが失敗しても他のジョブはキャンセルされず、成功したジョブの成果物はアップロードされます。
:::

まず従来の v3 で実行します。ビルドサマリーのページではターゲット OS ごとの進捗が表示されますが、いずれかのジョブが完了しても成果物は表示されません。

![Job Summary in progress](https://i.gyazo.com/b15967237a39a0ca01a607c0ef44b8a6.png)

成果物は全てのジョブが完了するまでダウンロード可能になりませんでした。

![Job Summary completed](https://i.gyazo.com/8221a10ce5894105ef0a81af7f1fb79d.png)

ではワークフローの最終ステップ部分を upload-artifact v4 にアップデートしてみましょう。

```yaml
    - name: Upload artifacts
      uses: actions/upload-artifact@v4
      with:
        name: package-${{ matrix.os }}
        path: dist/**  # dist 配下の成果物をアップロード
```

v4 を指定してワークフローを実行すると完了したジョブの成果物から随時ダウンロード可能になりました。

![](https://i.gyazo.com/2e861755a7d168e241e7a44cbd92ea2f.png)

:::info
画面はリロードしなくてもリアルタイムで更新されます。
:::

## さいごに
以上 Artifacts Action v4 を試しました。成果物のビルドに時間がかかる場合でもワークフローの終了を待たずに利用できるのは便利です。アップロード自体のパフォーマンスも向上しているようですし、なるべく早期に移行したいですね。

