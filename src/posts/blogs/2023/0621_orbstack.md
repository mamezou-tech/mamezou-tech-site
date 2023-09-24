---
title: OrbStack - macOS 専用の高速軽量なコンテナ & Linux VM 環境
author: masahiro-kondo
date: 2023-06-21
tags: [orbstack, docker, container]
---

## OrbStack とは
OrbStack は macOS 専用の高速で軽量なコンテナ環境と Linux VM 環境です。

[OrbStack · Fast, light, simple Docker &amp; Linux on macOS](https://orbstack.dev/)

以下のような特徴が謳われています。

- 超高速: 2秒で起動し、最適化されたネットワークとディスク、Rosetta による x86 エミュレーション
- 超軽量: CPU とディスク使用率が低く、少ないメモリで動作。Swift によるネイティブアプリなのでバッテリーにも優しい
- 超シンプル: セットアップが最小限、macOS と VM 双方向の CLI 統合とファイルアクセス、VPN サポート、VS Code Remote 機能サポート、SSH agent 機能
- 超強力: Docker コンテナと完全な Linux ディストリビューションをシームレスに実行、Kubernetes も近い将来サポート予定、メニューバーからアプリを開いてコンテナを管理可能

3月23日に public beta のアナウンスがありました。

> 🚀 Introducing OrbStack
> A new way to run Docker & Linux on macOS
>
> ⚡️ Fast: Starts instantly, fast network, Rosetta
> 💨 Light: 0.1% CPU, native Mac app
> 🍰 Simple: Seamless integration, easy UI
> 🔨 Powerful: Supercharged WSL + Docker Desktop
> Try it out 👇
> [orbstack.dev](http://orbstack.dev)

[https://twitter.com/kdrag0n/status/1638917691036803073](https://twitter.com/kdrag0n/status/1638917691036803073)

公式ドキュメントは以下です。

[What is OrbStack? · OrbStack Docs](https://docs.orbstack.dev/)

他の環境(Docker Desktop、Colima、UTM[^1])との比較がドキュメント内にあります。ユースケース、パフォーマンス、効率、使いやすさ、ネットワーク、Docker と Linux のサポートの観点から比較されています。かなり自信満々な比較表となっています。

- [OrbStack vs. Docker Desktop · OrbStack Docs](https://docs.orbstack.dev/compare/docker-desktop)
- [OrbStack vs. Colima · OrbStack Docs](https://docs.orbstack.dev/compare/colima)
- [OrbStack vs. UTM · OrbStack Docs](https://docs.orbstack.dev/compare/utm)

[^1]: UTM はコンテナ環境を提供しないため、仮想マシンのホスト環境としての性能比較となります。

:::info
Beta 期間は無料で利用できますが、正式公開後は有料化が予定されています。

[Is OrbStack free? | Frequently asked questions · OrbStack Docs](https://docs.orbstack.dev/faq#free)

> (個人使用とビジネス使用、サブスクリプションと永久ライセンス、価格設定、OSS と学生割引など) についてはまだ検討中であり、発売が近づき次第、より多くの情報を共有する予定です。
> 価格やライセンスについてアイデアがありましたら、お知らせください。私たちは、OrbStack が誰でもアクセスできるようにしながら、持続可能で収益性を確保したいと考えており、それにはコストが大きな役割を果たす可能性があることを理解しています。
> 私たちは、OrbStack のパフォーマンス、速度、信頼性、シンプルさ、潜在的なコスト削減により、価格に見合う価値があることを期待しています。
(Google 翻訳)

サブスクリプションか永久ライセンスかについても検討中のようです。IntelliJ のような年間サブスクリプションになる可能性もありそうです。
:::

:::column:2023.09.25追記
OrbStack v1.0 が[リリース](https://orbstack.dev/blog/orbstack-1.0)されました。Free プランと Pro プランがあり、Pro プランは月額10ドル(年払いだと20%オフ)となっています。Free プランは個人の非商用利用に限ります。

[Pricing · OrbStack](https://orbstack.dev/pricing)
:::

## インストール
以下のページから Apple Silicon 版をダウンロードしてインストールしました。

[Download OrbStack · Fast, light, simple Docker &amp; Linux on macOS](https://orbstack.dev/download)

バージョンダイアログを確認したところ、0.12.0 (1771) でした。

![version](https://i.gyazo.com/fe495e157eccdace2277943d136e46fd.png)

起動するとダイアログが開くので `Next` をクリックします。

![Welcome dialog](https://i.gyazo.com/9fdbfb83f8457e956bbeb0d47828fe83.png)

Docker か Linux かどちらを起動するかを選択する画面がでます。Docker を選択しました。Linux の利用も後でできます。

![Docker / Linux](https://i.gyazo.com/73a4c9e0f6ad2f4f72b6479b3da33770.png)

## Docker の利用

Docker 環境が起動するので、試運転で `Getting started with an example` で表示されているコマンドを入力しました。

```shell
docker run -it -p 80:80 docker/getting-started
```

`localhost` をブラウザで開くと Docker のチュートリアルドキュメントが表示されます。`Containers` タブに実行中のコンテナが表示されています。

![Containers](https://i.gyazo.com/e9553863d96105f9c93b7776da12a478.png)

コンテナイメージのビルドも問題なくできました。OrbStack ではコンテナのビルドに [BuildKit](https://docs.docker.com/build/buildkit/) を利用して高速なビルドを実現しているそうです。

Kubernetes は未提供ですが、別途 kind 起動するとちゃんと使えました。

```shell
$ kind create cluster
Creating cluster "kind" ...
 ✓ Ensuring node image (kindest/node:v1.27.1) 🖼 
 ✓ Preparing nodes 📦  
 ✓ Writing configuration 📜 
 ✓ Starting control-plane 🕹️ 
 ✓ Installing CNI 🔌 
 ✓ Installing StorageClass 💾 
Set kubectl context to "kind-kind"
You can now use your cluster with:

kubectl cluster-info --context kind-kind
```

Docker の利用方法についてはドキュメントの以下の章にありますが、Docker Desktop などに慣れていれば問題なく使えるでしょう。

[Docker · OrbStack Docs](https://docs.orbstack.dev/docker/)

:::info:OrbStack の Docker ネットワーク機能

Docker Desktop ではホストの macOS で動作するサービスへの接続には `host.docker.internal` というドメインを利用しますが、OrbStack では `host.internal` というドメインになります。

[Connecting to servers on Mac | Docker networking · OrbStack Docs](https://docs.orbstack.dev/docker/network#connecting-to-servers-on-mac)

`--net=host` オプションで起動すると、Host networking モードになり、ポートフォワーディングせずにコンテナで実行しているアプリに `localhost` で接続でき、コンテナからホストへの接続も `host.internal` ではなく `localhost` で可能になります。

```shell
docker run -it --rm --net=host nginx
```

[Host networking | Docker networking · OrbStack Docs](https://docs.orbstack.dev/docker/network#host-networking)
:::

## Linux machine
次に Linux の VM を使ってみます。

`Machines` タブの `New Machine` をクリックします。

![New Machine](https://i.gyazo.com/1a0b253b39aef34a6ef82211ba46cdbb.png)

マシン名、Linux ディストリビューションとバージョン、CPU type を指定します。Ubuntu 22.04 LTS の Intel CPU 版を指定してみました。

![Ubuntu intel](https://i.gyazo.com/b5312a7e0f13f3654392928f8e365d0f.png)

`Creating` 状態になります。

![Creating](https://i.gyazo.com/9b576a4b90c5be7ffffb284a1225d690.png)

数分で起動しました。ディストリビューションはダウンロードしていると思うので、GUI がないとしてもかなり短時間です。

![Running](https://i.gyazo.com/3b9e7ab08044d654d00e7720286d5cc1.png)

:::info
マシンの CPU やメモリサイズなどのスペックを決めて作成するオプションは今のところなさそうです。

起動されたマシンでは、8GB 程度のメモリになっていました。
```shell
$ free -h
               total        used        free      shared  buff/cache   available
Mem:           7.8Gi       529Mi       1.1Gi       0.0Ki       6.1Gi       6.9Gi
Swap:          9.8Gi          0B       9.8Gi
```

CPU に関してはホストマシンのコア数がそのまま表示されました。Docker Desktop などが論理 CPU 数を指定させるのに対して、macOS と共有しているようです。WSL と同様の実行モデルです。(ファイルシステムもシームレスに使えますし)。

ドキュメントにアーキテクチャの解説があります。やはり従来型の完全な VM ではなく軽量 VM として実装されているようです。
[Architecture · OrbStack Docs](https://docs.orbstack.dev/architecture)
:::

起動した VM に入るには以下のように SSH を利用します。

```shell
ssh orb
```

デフォルトのマシンに SSH 接続できます。もちろんマシン名を指定して接続も可能です。VS Code の [Remote - SSH](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh) 拡張も使えます。

[SSH access · OrbStack Docs](https://docs.orbstack.dev/machines/ssh)

Mac の ファイルシステムも macOS と同じパスでアクセスできます。

[File sharing · OrbStack Docs](https://docs.orbstack.dev/machines/file-sharing)

Linux VM で起動している API についてはポートフォワーディング不要で `localhost` で接続できます。

[Running servers | Linux networking · OrbStack Docs](https://docs.orbstack.dev/machines/network#running-servers)

Express で簡単なサーバーを作って試しましたが確かに `localhost` で接続できました。

:::info
GUI や Linux デスクトップを使う機能は未提供です。利用したい場合、XQuartz のような X11 サーバや Xrdp のようなリモートデスクトップのソフトウェアを使う必要があります。

[Graphical apps | Linux machines · OrbStack Docs](https://docs.orbstack.dev/machines/#graphical-apps)
:::

今回は Intel CPU で起動しましたので Rosetta が頑張っていると思いますが、非常に軽快に動作します。

VirtualBox などの Apple Silicon 対応に時間がかかっているため、M1 Mac にスイッチしてから仮想マシンをローカルで使わなくなっていました。ですが、やはり使えると色々便利です。本物の Linux での動作確認や普段使っていないバージョンの開発環境を試すなどが気軽にできますね。

:::info
コマンドのチートシートが、`Commands` タブにあります。ドキュメントをいちいち確認しなくてもいいので便利ですね。

![Command cheat sheat](https://i.gyazo.com/f49b93c00252664eddbccb3d514ed918.png)

[Commands · OrbStack Docs](https://docs.orbstack.dev/machines/commands)
:::

## リソース使用状況
コンテナや Linux VM でワークロードがない状態(ただ起動させているだけの状態)で、CPU 利用率はM1 Mac で0.1%前後と非常に低い値になるとのことです。実際、アクティビティモニタで OrbStack がトップに来ることはほぼなく、検索しないと見つからないぐらいです。Docker Desktop や Minikube だと起動しているだけでリソースを使用し続けるので、OrbStack はかなり軽量なプロセスであると言えるでしょう。

![CPU](https://i.gyazo.com/2fe75755afa262e93ebf5f1e535c1098.png)

![Memory](https://i.gyazo.com/6f91d5e36972517ec83da13d106b6447.png)


## 最後に
以上、OrbStack をインストールして試してみました。宣伝通り軽量で使いやすい環境でした。

筆者はこれまで Docker Desktop と kind を使っていましたが、OrbStack と kind の組み合わせに移行しようと思います。
