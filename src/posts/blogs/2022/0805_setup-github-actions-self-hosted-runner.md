---
title: GitHub Actions のセルフホストランナーを M1 Mac で動かす
author: masahiro-kondo
tags: [GitHub, CI/CD]
date: 2022-08-05
---

GitHub Actions では、GitHub 側で Linux / Mac / Windows のランナーが実行のたびにプロビジョニングされ使用されます。通常はこれで十分ですが、オンプレの PC や AWS の EC2 インスタンスなどに自前のランナーを用意して実行することもできます。

[About self-hosted runners - GitHub Docs](https://docs.github.com/ja/actions/hosting-your-own-runners/about-self-hosted-runners)

この記事では、M1 Mac をセルフホストランナーとしてセットアップしワークフローを実行する手順を紹介します。

[[TOC]]

## セルフホストランナーのメリット・デメリット

セルフホストランナーを使用するメリットは以下のような点があります。

- M1 Mac など現状提供されていない環境で CI を行える
- ランナーに対する料金が発生しないので、ロングランなど実行時間の長いワークフローを流せる
- 自前で用意できる強力なマシンパワー(CPU、メモリ、GPU など)を利用できる
- GitHub からアクセスできないオンプレやクラウド環境のリソースを使ったワークフローを実行できる

デメリットとしては以下が挙げられます。

- ワークフロー実行に必要なソフトウェアは(当然)自前でインストールする必要がある
- ワークフロー実行毎にクリーンな環境がプロビジョニングされない。そのため、前回実行の影響で失敗することがあり得る

## セルフホストランナーの動作要件

2022年8月現在、セルフホストランナーの動作が保証されている OS は以下です。

- Linux
  - Red Hat Enterprise Linux 7 or later
  - CentOS 7 or later
  - Oracle Linux 7
  - Fedora 29 or later
  - Debian 9 or later
  - Ubuntu 16.04 or later
  - Linux Mint 18 or later
  - openSUSE 15 or later
  - SUSE Enterprise Linux (SLES) 12 SP2 or later
- Windows
  - Windows 7 64-bit
  - Windows 8.1 64-bit
  - Windows 10 64-bit
  - Windows Server 2012 R2 64-bit
  - Windows Server 2019 64-bit
- macOS
  - macOS 10.13 (High Sierra) or later

CPU アーキテクチャは以下です。

- x64 - Linux, macOS, Windows.
- ARM64 - Linux only.
- ARM32 - Linux only.

ARM64 は Linux only と書いてありますが、macOS (Monterey) も OK です。

:::info
Runner はクロスプラットフォームで動作する .NET Core で実装されています。

[GitHub - actions/runner: The Runner for GitHub Actions](https://github.com/actions/runner)
:::

## リポジトリへのセルフホストランナーの登録

セルフホストランナーを使用するには、まずリポジトリの設定でセルフホストランナーの登録を行います。

Actions > Runners タブの `New self-hosted runner` をクリックします。

![設定画面で追加](https://i.gyazo.com/fab36c77fccd6b7f83d81cb7c03e62c5.png)

Runner image で macOS を選択し、Architecture で ARM64 を選択します。

![アーキテクチャ選択](https://i.gyazo.com/ea2dc3c3120d2f3ea1117f58ddc7ca25.png)

選択結果に応じて、ランナーの導入手順のコマンドが表示されます。

![インストール手順の表示](https://i.gyazo.com/164b70ba9d342a1a73847cea68099f37.png)

リポジトリの設定画面での作業は、あくまで手順と必要なトークンの払い出しです。次に行う対象マシンでのランナーのインストールと設定が完了するまで、登録は完了しません。

:::info
今回は、単独のリポジトリを対象にしましたが、オーガニゼーションレベルでも登録でき、各リポジトリのワークフローから利用可能です。各リポジトリのワークフローではランナーに付与したラベルで指定できます。
:::

## セルフホストランナーのインストールと設定
表示された手順通りに、ランナーをインストールするマシン上でインストーラをダウンロード・展開します。

```shell
mkdir actions-runner && cd actions-runner
curl -o actions-runner-osx-arm64-2.294.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.294.0/actions-runner-osx-arm64-2.294.0.tar.gz
tar xzf ./actions-runner-osx-arm64-2.294.0.tar.gz
```

導入手順には、リポジトリ固有のテンポラリなトークンが生成され表示されますので、それを使って、リポジトリを指定して、config.sh を実行します。

```shell
./config.sh --url https://github.com/<account>/<repo> --token xxxxxxxxxxxxxxxxx
```

:::info
トークンの寿命はけっこう短いので、404 エラーになった場合はもう一度作成画面で手順を表示してトークンを再生成します。
:::

成功すると、対話モードで設定を入力することができます。ランナーの名前、ワークフローで指定するためのラベルなどを入力します。

```
--------------------------------------------------------------------------------
|        ____ _ _   _   _       _          _        _   _                      |
|       / ___(_) |_| | | |_   _| |__      / \   ___| |_(_) ___  _ __  ___      |
|      | |  _| | __| |_| | | | | '_ \    / _ \ / __| __| |/ _ \| '_ \/ __|     |
|      | |_| | | |_|  _  | |_| | |_) |  / ___ \ (__| |_| | (_) | | | \__ \     |
|       \____|_|\__|_| |_|\__,_|_.__/  /_/   \_\___|\__|_|\___/|_| |_|___/     |
|                                                                              |
|                       Self-hosted runner registration                        |
|                                                                              |
--------------------------------------------------------------------------------

# Authentication


√ Connected to GitHub

# Runner Registration

Enter the name of the runner group to add this runner to: [press Enter for Default] 

Enter the name of runner: [press Enter for kondoh-macbook] mh-local

This runner will have the following labels: 'self-hosted', 'macOS', 'ARM64' 
Enter any additional labels (ex. label-1,label-2): [press Enter to skip] 

√ Runner successfully added
√ Runner connection is good

# Runner settings

Enter name of work folder: [press Enter for _work] 

√ Settings Saved.
```

## セルフホストランナーの起動

設定が保存されたら、ランナーを起動できます。

```shell
./run.sh
```

ランナーのバージョンが表示された後に、ジョブの投入待ち状態に入ります。

```
√ Connected to GitHub

Current runner version: '2.294.0'
2022-08-05 00:48:41Z: Listening for Jobs
```

:::info
ランナーはアイドリング時にセルフでアップデートもしてくれます。
:::

ランナーが無事起動したら、対象リポジトリに、登録したランナーの名前とラベル、状態が表示されます。

![接続された Runner](https://i.gyazo.com/7d3218486be178dde19f12d3c5cbde1e.png)

:::info
Runner をサービスとして実行することで、ターミナルを開いていなくても、GitHub Actions と通信して実行するようにできます。インストールしたディレクトリにサービス登録、スタート、停止、状態表示のシェルスクリプトが含まれています。利用方法は以下をご覧ください。

[セルフホストランナーアプリケーションをサービスとして設定する - GitHub Docs](https://docs.github.com/ja/actions/hosting-your-own-runners/configuring-the-self-hosted-runner-application-as-a-service)
:::

## セルフホストランナーを利用するワークフローの作成と実行

さっそく、セルフホストランナーを使ったワークフローを作ってみましょう。

`runs-on` でセルフホストランナーに付与されたラベルを指定します。この例では、デフォルトで付与される `self-hosted` を指定しました。ジョブは、メッセージをエコーするだけの内容です。

```yaml
name: Self-hosted runner job

on: [workflow_dispatch]

jobs:
  Build:
    runs-on: self-hosted
    steps:
    - run: echo 'This job is running on self-hosted runner!!'
```

:::info
もし同じラベルの複数のランナーがあるときは、利用可能なランナーで実行されます。
:::

通常のジョブと同様に実行されます。

![ジョブの実行](https://i.gyazo.com/7660b18d6f32bbb3278234c581d1a96d.png)

Runner のコンソールにジョブの実行ログが流れます。

```
√ Connected to GitHub

Current runner version: '2.294.0'
2022-08-05 00:48:41Z: Listening for Jobs
2022-08-05 01:11:21Z: Running job: Build
2022-08-05 01:11:27Z: Job Build completed with result: Succeeded
```
## セルフホストを含む複数のランナーで同じワークフローを実行する
様々なプラットフォーム(OS / CPU)で同じワークフローを実行したいケースでは、セルフホストランナーや GitHub のランナーを複数使って実行しますが、strategy.matrix を使って、1つのワークフローファイルで実行できます。

以下のように、`runs-on` を matrix にしたワークフローファイルを準備します。`runner` には、GitHub Actions の utuntu-latest、macos-latest に加えてセルフホストランナーを含めています。

{% raw %}
```yaml
jobs:
  Build:
    runs-on: ${{ matrix.runner }}
    strategy:
      matrix:
        runner: [ubuntu-latest, macos-latest, self-hosted]

    steps:
    - run: echo 'This job is running on ${{ matrix.runner }} runner!!'
```
{% endraw %}

これを実行すると、3つのランナーが起動して、別々にジョブが実行されます。

![マトリクスジョブの実行結果](https://i.gyazo.com/9511a7158f74cdb84c5e64b6dfb20303.png)

## まとめ
M1 Mac にセルフホストランナーを構築して、ワークフローを実行する手順を紹介しました。

冒頭のデメリットのところで挙げたクリーンな環境が用意できない件について、Docker で実行するという手段も考えられますが、GitHub Actions のメリットである手軽さが失われてしまうという問題があります。ジョブの前後にクリーンアップ処理を入れるなどの工夫で凌ぐのが現実的でしょう。そのためのフックも用意されています。

[Running scripts before or after a job - GitHub Docs](https://docs.github.com/ja/actions/hosting-your-own-runners/running-scripts-before-or-after-a-job)
