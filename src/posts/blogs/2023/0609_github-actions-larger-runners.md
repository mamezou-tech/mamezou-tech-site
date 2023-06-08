---
title: GitHub Actions - Larger runners を試す
author: masahiro-kondo
date: 2023-06-08
tags: [GitHub, CI/CD]
---

## Larger runners
GitHub Actions では GitHub-hosted runners と呼ばれるGitHub がホストする VM でワークフローを実行します。これまで Runner のスペックが足りない場合は、セルフホストランナーでハイスペックマシンを使うしかありませんでした。今後は、通常の Runner よりお高くなりますが CPU コアやメモリを多く搭載したハイスペックな Larger runners が利用可能になります。

:::info
記事執筆時点では Larger runners は GitHub Teams または GitHub Enterprise Cloud プランのオーガニゼーションでベータ版です。利用するには waitlist へのサインアップが必要です。

[Using larger runners - GitHub Docs](https://docs.github.com/en/actions/using-github-hosted-runners/using-larger-runners)

後述の Faster macOS runners についてはパブリックベータのため全ユーザーが利用できます。
:::

## Faster macOS runners
4月に macOS のハイスペックな runner がパブリックベータとして全ユーザーに解放されました。

[GitHub Actions&#058; Faster macOS runners are now available in open public beta! | GitHub Changelog](https://github.blog/changelog/2023-04-24-github-actions-faster-macos-runners-are-now-available-in-open-public-beta/)

以下のページに macOS runners のスペックが記載されています。

[About GitHub-hosted runners - GitHub Docs](https://docs.github.com/en/actions/using-github-hosted-runners/about-github-hosted-runners#supported-runners-and-hardware-resources)

通常の macOS ruuner は以下のようなスペックの3コアの VM です。

- 3-core CPU (x86_64)
- 14 GB of RAM
- 14 GB of SSD space

ハイスペックな macOS runner は メモリ30GBの12コアの VM ということです。

- 12-core CPU (x86_64)
- 30 GB of RAM
- 14 GB of SSD space

以下のページによると、macOS の3コア版、12コア版の利用料金はそれぞれ、0.08USD/min、0.32USD/min です。コア数に応じた課金になっていますね。

[About billing for GitHub Actions - GitHub Docs](https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions#per-minute-rates)

筆者はパブリックベータ開始当初に試してみたのですが、runner が全く Available にならなかったので諦めてそのまま忘れていました。

:::column:macOS runners の母艦は？
余談ですが、macOS runner (VM) は大量の Mac mini を使って稼働していると何かで読んだことがあります。Faster runners も Intel CPU なので旧 Mac Pro などを使っているのでしょうか？
:::

## Electron アプリビルド比較 (macOS runners)
まず macOS runner から試します。特に設定は不要で、ワークフローで `macos-latest-xl` のラベルを指定するだけで 12コアの runner が有効になります。

Electron アプリをビルドして、バイナリをアップロードするワークフローを作り、通常の 3コア runner (macos-latest) と12コアの runner (macos-latest-xl) を strategy.matrix で指定して実行しました。

- .github/workflows/build-electron-app.yml
{% raw %}
```yaml
name: Build Electron App

on:
  workflow_dispatch:

jobs:
  build:

    runs-on: ${{ matrix.os }}

    strategy:
      fail-fast: false
      matrix:
        os: [macos-latest, macos-latest-xl]

    steps:
    - uses: actions/checkout@v3
      with:
        repository: 'mamezou-tech/electron-example-browserview'
        path: electron-example-browserview      
    - name: Setup nodejs
      uses: actions/setup-node@v3
      with:
        node-version: '18'
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
      uses: actions/upload-artifact@v3
      with:
        name: package-${{ matrix.os }}
        path: electron-example-browserview/dist/*
```
{% endraw %}

ワークフローのステップとしては、以下のようになります。

- ソースコードのチェックアウト
- Node.js セットアップ
- NPM パッケージのインストール
- electron-builder によるバイナリ作成
- 作成したバイナリのアップロード

:::info
上記のワークフローでは以下の Electron サンプルアプリを利用しています。

[GitHub - mamezou-tech/electron-example-browserview: Example of Electron app that registers and switches between multiple BrowserViews.](https://github.com/mamezou-tech/electron-example-browserview)
:::

実行結果(ワークフローを2回実行した平均値)です。Faster runner でビルドした方が1分以上早く完了しています。

| macos-latest | macos-latest-xl|
|:----|:----|
| 3m 33s | 2m 22s |

主要なステップの比較です。Node.js セットアップからバイナリ生成までは Faster runner では1秒以下で完了していました(ちょっと速すぎ？)。処理時間のほとんどを占めるバイナリアップロードも Faster runner は1分以上早く終わっていました。

| | macos-latest | macos-latest-xl|
|:----|:----|:----|
| setup node  | 1s | 0s |
| npm install | 9.5s | 0s |
| package     | 23s | 0s |
| Upload  | 2m 52s  | 1m 14s |

Electron のビルドはマルチコアの恩恵はあまりないかと思っていましたが、この結果を見るとかなり短縮できることがわかりました。

## Larger runners の設定
Larger runners にサインアップして1ヶ月以上経って使えるようになりました。

![Runners Settings](https://i.gyazo.com/7b9de1af239f1991bd6085d7e741fe4b.png)

早速セットアップしていきます。Linux(Ubuntu 22.04)と Windows(Windows Server 2022)の Runner がセットアップできます。

![new runners](https://i.gyazo.com/57da5828a540afda8a9cb335e8c80121.png)

Runner Group として `Default Larger Runners` というグループ名で、ubuntu-latest-m、windows-latest-l のラベルの runner が登録され `Ready` になりました。

![Added runners](https://i.gyazo.com/afab43fce8595f00f11cf1d613b33ee6.png)

ubuntu-latest-m はミドルクラスの VM で 4-cores 16GB です。windows-latelst-l の方は 8-core 32GB の VM なので、Ubuntu も 8-core 32GB にして ubuntu-latest-l というラベルにして登録しました。

![Add ubunts runner](https://i.gyazo.com/28cd9d32f94a9e3fe3839c9f21b3e33a.png)

![Large group](https://i.gyazo.com/f907695276cd939192ba1821b974570d.png)

各 runner には同時実行数の設定ができます。ubuntu-latest-m のデフォルト値は10になっていました。runner が使用されると、Active なワークフローが一覧表示されます。

![Active jobs](https://i.gyazo.com/3ef448a016d4dabdbf076ee4c55e97c9.png)

:::alert
Larger runners は public リポジトリに対してはデフォルトでは無効になっています。public リポジトリでも無料ではないことに注意が必要です。
:::

## Electron アプリビルド比較 (Linux / Windows runners)
macOS runners で試した Electron アプリのビルドを、Linux / Windows runners でも試しました。ワークフローの strategy.matrix の部分を以下のようにしています。2回実行して平均を取得しました。

{% raw %}
```yaml
jobs:
  build:

    runs-on: ${{ matrix.os }}

    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, ubuntu-latest-l, windows-latest, windows-latest-l]
```
{% endraw %}

Linux runner の比較です。

| ubuntu-latest | ubuntu-latest-l|
|:----|:----|
| 1m 6s | 48.5s |

| | ubuntu-latest | ubuntu-latest-l|
|:----|:----|:----|
| setup node  | 0s | 6s |
| npm install | 6s | 3.5s |
| package     | 11s | 7.5s |
| Upload  | 41.5s  | 27s |

筆者は普段 Ubuntu のデスクトップは使用しませんが、Electron アプリのビルドは通常の runner でもかなり速いです。8コアの Larger runner の方がやはり2割程度は速い結果となりました。

Windows runner の比較。

| windows-latest | windows-latest-l |
|:----|:----|
| 2m 22s | 1m 32.5s |

| | windows-latest | windows-latest-l|
|:----|:----|:----|
| setup node  | 18s | 6.5s |
| npm install | 11s | 18s |
| package     | 1m 30.5s | 32s |
| Upload  | 46.5s  | 36.5s |

Windows も macOS ほどではないですが Electron アプリビルドが遅いです。Larger runner を使うと4割程度短縮できました。

最後に比較した全ての runner におけるトータルビルド時間を再掲します。

|    | Normal runners | Larger runner |
|:---|:---|:---|
| macOS | 3m 33s | 2m 22s |
| Linux | 1m 6s | 48.5s |
| Windows | 2m 22s | 1m 32.5s |

通常のワークフローでは Linux(ubuntu-latest) を指定することがほとんどですが、ネイティブアプリのビルドなど、macOS や Windows を選択せざるを得ない場合 Larger runners を使うとビルド時間をかなり短縮できそうです。

## Go のバッチ処理で比較
おまけで、Go で書いたバッチ処理の比較もしてみました。Scrapbox のデータをダウンロードして集計、ドキュメント間のグラフ構造を抽出する処理を拙作 sbgraph で実行したものです。

[GitHub - mamezou-tech/sbgraph: Fetch Scrapbox project data and visualize activities.](https://github.com/mamezou-tech/sbgraph)

{% raw %}
```yaml
name: Fetch Scrapbox data

on:
  workflow_dispatch:

jobs:

  buid:
    name: Gen data and publish
    runs-on: ubuntu-latest-l

    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-go@v4
    - name: Install sbgraph
      run: |
        go install github.com/mamezou-tech/sbgraph@latest
        sbgraph init
        sbgraph project -p scrapbox-project
    - name: Fetch data
      run: sbgraph fetch
      env:
        API_KEY: ${{ secrets.API_KEY }}
    - name: Aggragate
      run: sbgraph aggregate -s=true
    - name: Generate Graph data
      run: sbgraph graph -i=true -j=true
```
{% endraw %}

ワークフローのステップとしては以下のようになります。

- Go 環境のセットアップ
- sbgraph インストールと初期設定
- Scrapbox データのダウンロード
- 集計処理
- グラフ構造の生成

Scrapbox データのダウンロードは goroutine(WaitGroup)で3多重実行しています。

Linux の Normal runner と Larger runner (8コア)で実行した結果です。トータルで20秒程度短縮されました。

| ubuntu-latest | ubuntu-latest-l|
|:----|:----|
| 4m 15s | 3m 52.5s |

各ステップの比較。ダウンロードはさほど差がありませんでした。3多重程度ではあまりコアを使えてないということでしょうか。

| | ubuntu-latest | ubuntu-latest-l|
|:----|:----|:----|
| setup go  | 1s | 5.5s |
| install | 27s | 9s |
| download  | 3m 17s | 3m 9s |
| aggragate | 7s  | 6s |
| gen graph | 9s  | 7.5s |

## 最後に
これまではハイスペックな Runner を使用したい場合、セルフホストランナーを使うという選択肢しかありませんでした。セルフホストランナーは GitHub 料金はかかりませんが、別途クラウドの VM の費用がかかったりプロビジョニングが面倒であるという難点もあります。利用時間に応じて課金される Larger runners をうまく利用することでビルド時間の短縮やランニングコストの削減も期待できます。プロジェクトで必要なスペックや料金をよく見極めて活用したいものです。

:::info
セルフホストランナーのプロビジョニングに関しては、Kubernetes で GitHub Actions Runner Controller (ARC)を導入することでオートスケーリングにも対応できます。ARC については以下の記事で紹介しています。

[GitHub Actions Runner Controller (ARC) - セルフホストなランナーを Kubernetes でオンデマンド実行する](/blogs/2023/05/14/github-actions-runner-controller/)

Amazon EC2 でセルフホストランナーをオートスケーリングで作成・破棄する Terraform module もあります。

[GitHub - philips-labs/terraform-aws-github-runner: Terraform module for scalable GitHub action runners on AWS](https://github.com/philips-labs/terraform-aws-github-runner)
:::