---
title: AWSが提供するFinchでコンテナのビルド、実行をする
author: noboru-kudo
date: 2022-12-07
tags: [advent2022]
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2022/
---

これは、[豆蔵デベロッパーサイトアドベントカレンダー2022](https://developer.mamezou-tech.com/events/advent-calendar/2022/)第7日目の記事です。

今回はAWSが2022/11/22に公開したコンテナ開発ツール[Finch](https://github.com/runfinch/finch)を使ってみた感想を述べたいと思います。

- [Introducing Finch: An Open Source Client for Container Development](https://aws.amazon.com/jp/blogs/opensource/introducing-finch-an-open-source-client-for-container-development/)
- [(邦訳)コンテナ開発用のオープンソースクライアント「Finch」のご紹介](https://aws.amazon.com/jp/blogs/news/introducing-finch-an-open-source-client-for-container-development/)

Finchはコンテナのビルドから実行までをサポートするDocker Desktopの代替ツールです。OSSとして公開されており、無償で使うことができます。
現時点では、Mac(Intel/M1アーキテクチャ)のみをサポートしていますが、今後はWindows／Linuxにも対応する予定のようです。

内部的には関連する各種OSSを利用しており、Finchはこれらをオールインワンで管理するツールの位置づけのようです。

- コンテナランタイム: [containerd](https://containerd.io/)
- CLI: [nerdctl](https://github.com/containerd/nerdctl)
- 仮想マシン: [Lima](https://github.com/lima-vm/lima)
- イメージビルド: [BuildKit](https://github.com/moby/buildkit)

なお、FinchではDocker DesktopのようなGUIは提供していません[^1]

[^1]: とはいえ、Docker DesktopユーザーもほとんどはGUIを使っていないのではとは思いますが。

[[TOC]]

## Finchをインストールする

GitHubリリースページよりインストールパッケージをダウンロードして、展開するだけです。

- [GitHub - Finch release](https://github.com/runfinch/finch/releases)

使っているMacのCPUアーキテクチャによってダウンロード対象は異なります。

- Intel: Finch-v<x.x.x>-x86_64.pkg
- Apple Silicon M1: Finch-v<x.x.x>-aarch64.pkg

ここではIntel Mac(macOS Monterey)でv0.1.0のバージョンをインストールしました。

```shell
finch version
> finch version v0.1.0
```

## 仮想マシンのセットアップ

まず、コンテナを実行する仮想マシンを初期化して起動します。

Finchの設定は`${HOME}/.finch/finch.yaml`に格納されます。インストール直後は存在しませんが、何かしらのfinchコマンドを実行すると作成されます。

ここでは以下のようにファイルが作成されていました。

```yaml
cpus: 3
memory: 8GiB
```

現時点ではこの2つのみです。ここではコンテナランタイムのLima仮想マシンに割り当てるCPUコア/メモリサイズです。
初期値はホストOSの空きスペックを考慮して動的に決定されるようです。もちろん必要に応じて変更可能です。

それでは、まず仮想マシンを初期化・実行します。

```shell
finch vm init

> INFO[0000] Initializing and starting Finch virtual machine...
> INFO[0097] Finch virtual machine started successfully
```

少し時間がかかりますが、無事成功しました。
ここでは仮想マシンの初期化とともに開始処理も実行されました。

ここまで実施すると、コンテナの実行やビルドが可能な状態となります。

:::column:仮想マシンを停止・削除する
作成した仮想マシンを停止・削除する場合は以下のコマンドを実行します。

```shell
# 停止
finch vm stop
# 削除
finch vm remove
```

停止状態で削除していない場合は`finch vm start`で再開できます。
:::

## コンテナイメージを実行する

ここではDockerHubに公開されている[nginxの公式イメージ](https://hub.docker.com/_/nginx)を実行してみます。
また、Nginxで公開するコンテンツはローカル環境側に配置したものをボリュームとしてマウントします。

```shell
# カレントディレクトリのcontents配下に任意のindex.htmlを配置
finch run --name nginx -p 8080:80 -d \
  -v $(pwd)/contents:/usr/share/nginx/html:ro nginx:latest
> docker.io/library/nginx:latest:                                                   resolved       |++++++++++++++++++++++++++++++++++++++| 
> index-sha256:e209ac2f37c70c1e0e9873a5f7231e91dcd83fdf1178d8ed36c2ec09974210ba:    done           |++++++++++++++++++++++++++++++++++++++| 
> manifest-sha256:6ad8394ad31b269b563566998fd80a8f259e8decf16e807f8310ecc10c687385: done           |++++++++++++++++++++++++++++++++++++++| 
> config-sha256:88736fe827391462a4db99252117f136b2b25d1d31719006326a437bb40cb12d:   done           |++++++++++++++++++++++++++++++++++++++| 
> layer-sha256:90cfefba34d7c6a81fe1dfbb4a579998c65ff49092052967f63ddc48f6be85d9:    done           |++++++++++++++++++++++++++++++++++++++| 
> (省略)
> elapsed: 18.3s                                                                    total:  54.2 M (3.0 MiB/s)                                       
> df4f0dc64496cbae501ff5cb5f4542a3410dd36ba808e17bc5bcd9664613a878
```

実行はDocker CLIとほとんど変わりません。違いはコマンドがdockerではなくfinchに変わったくらいです。



上記はローカル環境の8080ポートにポートフォワードしていますので、以下のようにアクセスできます。

```shell
curl localhost:8080
```
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Finch</title>
</head>
<body>
  <h1>Hello Finch!!</h1>
</body>
</html>
```

仮想マシンを意識せずにDocker Desktopを使っているのと同じようにlocalhostでコンテナにアクセスできました。

## Composeで複数コンテナを実行する

## コンテナイメージをビルド・公開する

## 最後に

