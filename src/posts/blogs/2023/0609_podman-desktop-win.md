---
title: Podman Desktopがv1.0になったのでwindows版を試してみたところ、気付いたらv1.1に上がるくらいに機能豊富だった話
author: shinichiro-iwaki
date: 2023-06-09
tags: [container]
---

少し前にRedHatからPodman Desktopのv1.0がリリースされました。Podmanは[当Developer Siteでも紹介](/blogs/2022/02/23/podman-machine/)されていますが、デーモンレスに動作する[^1]という特色を持つコンテナの開発/実行/管理ツールです。  

[^1]:　[公式](https://www.redhat.com/ja/topics/containers/what-is-podman)に曰く、デーモンレスに動作することで管理者(root)権限を付与せずにコンテナの操作が可能なためセキュリティ上のメリットが謳われています。  

より身近な関心毎として、Podman Desktopはオープンソースであり、2022年に有償化されてしまったDocker Desktopの代替[^2]として活用できる可能性があります。  

[^2]:　当Developer SiteでもMac向けの[lima](/blogs/2022/01/21/lima/)/[Finch](/blogs/2022/12/05/finch-intro/)や、Mac/Windowsの両方に対応したGUIツールの[Rancher Desktop](/blogs/2022/01/29/rancher-desktop/)などの紹介がありますし、Windowsであればwsl2上でdockerを動作させて[Windows Terminalなどを介して操作](https://learn.microsoft.com/ja-jp/windows/wsl/install)することもできます。  

筆者が普段業務利用しているのはWindowsマシンですので、普段はRancher Desktopを使用してdockerコマンドを利用可能[^3]なようにしていますが、ちょっと気になる点[^4]も残っているためにより簡便に利用できる代替ツールを探していました。  

[^3]:　wsl2を利用していない理由は、普段利用するターミナルが圧倒的にGit bashだからです。切り替えれば済む話ではありますが、なかなか慣れたターミナルって変え難いものがあります。(よね?)  

[^4]:　RancherはKaaS(Kubernetes as a Service)プロダクトなこともあり、Rancher Desktopの起動時にはk3sのクラスターが構成されます。軽量なk3sとはいえそこそこリソースを消費してくれます。電気代の高騰著しい昨今、docker利用のためだけにリソースを無駄遣いするのは避けたいところです。  

今回はやってみる記事ですので、鮮度を優先[^5]したため内容が薄い/偏っていることはご承知おきください。  

[^5]:　と、言っておきながら筆者が遅筆、かつ触ってみたい機能が多かったため、書き終わる前に1.1がリリースされていたのでタイトルが変わってしまいました。。。  

## ツールの導入

Windowsの場合、Podman Desktopは[公式サイト](https://podman-desktop.io/)の提示するインストーラを実行[^6]すればインストール可能です。  

[^6]:　他の手段として、[ダウンロード情報](https://podman-desktop.io/downloads)を参照するとオフラインインストーラやパッケージ管理ツールを介したインストール手段も提供されています。  

Podman DesktopはPodmanを介してコンテナを操作するためのUIのみを提供するツールですので、利用するためにはPodmanのインストールと初期設定が必要になります。未インストールの場合は[Podmanのインストールガイド](https://podman.io/docs/installation)に従ってインストールします。執筆時点では、Windowsの場合は[WSLを有効化](https://learn.microsoft.com/ja-jp/windows/wsl/install)した後に[Windows版のリリースページ](https://github.com/containers/podman/releases)からダウンロードしたインストーラを実行すれば可能です。  

PodmanはLinux上で動作しますので、Windowsでは動作に必要な仮想環境を作成する必要があります。この初期設定はPodman DesktopのGUI上から1クリックで実行[^7]可能です。  

[^7]:　実行すると`podman-machine-default`という名前のpodmanが動作するwsl2のFedraディストリビューションが追加され、起動されます。Podmanの[CLIからも同様の初期化処理は可能](https://github.com/containers/podman/blob/main/docs/tutorials/podman-for-windows.md#installing-podman)ですが、せっかくなので可能な限りGUIを利用して設定してみています。  

![初期化処理](/img/blogs/2023/0609-podman-initial-ui.jpg)  

podmanが起動すると、GUIからのコンテナ操作も可能になりますし、ターミナルツールからのコマンドライン操作も可能になります。面白いところではDocker APIを解釈できる[^8]ようですのでdockerの代替としても利用可能です。  

[^8]:　Fedraディストリビューション上にdockerも含まれている可能性は完全には否定できないですが、`docker info`の出力情報を見る限りバージョン情報がdockerにしてはあまりに古いバージョン(podmanのバージョンと同じ)になっています。podmanがdockerのサーバとして動作しているようです。  

![CLI操作](/img/blogs/2023/0609-podman-cli.jpg)  

:::info:スリープ時などの動作不安定化
発生条件などは詰め切れていませんが、Podman Desktopを起動状態でPCがスリープした場合など、wslのpodman-machine-defaultの状態とPodman Desktop上のPodman Machineのステータスがずれることがあるようです。  
podman-machine-defaultが起動しているにもかかわらずPodman Desktop側で認識していない場合は、以下のように連携エラーにより上手く動作しないことがありました。  
![CLI操作](/img/blogs/2023/0609-podman-error.jpg)  

筆者の環境ではいったんwsl側で停止(`wsl -t podman-machine-default`)させた後再度起動することで復旧しましたが、このような異常ケースでのトラブルは多少残っている模様です。  
:::

## コンテナ/ポッド管理機能

GUI上からコンテナ、ポッド、イメージ、ボリュームの管理ができます。例えばイメージ管理のペインからはローカルに取得したイメージの情報参照や取得(pull)、削除(remove/prune)ができますし、パラメータを設定して起動(run)なども可能です。  

![イメージ管理画面](/img/blogs/2023/0609-podman-images.jpg)  

![イメージpull画面](/img/blogs/2023/0609-podman-pull.jpg)  

![コンテナ起動画面](/img/blogs/2023/0609-podman-run.jpg)  

筆者の好みではありますが、UIは直観的に理解し易いように感じます。  

## ローカルクラスター環境

Podman DesktopはKind(Kubernetes in docker=コンテナ内に構築するKubernetesクラスタ)との統合をサポートしています。  

[公式ドキュメント](https://podman-desktop.io/docs/kubernetes/kind/configuring-podman-for-kind-on-windows)で提示されているように、Kindを利用するにはroofulモードでの実行が必要なようなのでpodman-machine-defaultの設定を変更して再起動します。  

```bash
podman machine stop
podman machine set --rootful
podman machine start
```

モードを変更すると、Settings/ResourcesからKindのクラスター作成が可能になります。  

![クラスタ作成画面](/img/blogs/2023/0609-podman-kind-cluster.jpg)  

作成が終了すると`kind-(指定したクラスタ名)`というクラスタが作成され、GUIからpodの作成などが可能です。  

![クラスタ操作画面](/img/blogs/2023/0609-podman-kind-pod.jpg)  

現時点ではGUI上からあまり細かい操作はできないようですので、必要があれば[kindのcliツールやkubectlを利用して操作する](https://kind.sigs.k8s.io/docs/user/quick-start/)形になりそうです。  

クラスタ自体の停止/起動や削除などはリソース画面から可能です。  

![クラスタ作成画面](/img/blogs/2023/0609-podman-kind-cluster-manage.jpg)  

Kind以外にも、Openshift localやDeveloper Sandboxとも統合可能なようです。まだあまり試せていませんが、Kubernetes/OpenShiftにデプロイするシステムのローカル開発環境としてはかなり簡易に、かつ柔軟に操作ができそうな印象です。  

## 設定機能

前述のクラスターリソースの操作以外にリモートレジストリの設定やプロキシ設定などがGUI上から可能です。  

会社LAN内からなどの「インターネット接続に制約がある環境」でコンテナを利用する際にプロキシ設定の手間はなかなかですので、GUIで簡便にプロキシ設定できることは大きな魅力だと思います。  

検証用にローカルにプロキシを建ててコマンドラインからpullを実行してみましたが、GUI設定のみでプロキシを介した通信が実現できる模様[^9]です。  

[^9]:　断言できていないのは[podman-machine-default側にも名前解決のための設定変更が必要](https://future-architect.github.io/articles/20221227a/)というV1リリース前の記事を発見したからです。今回のパターンだとプロキシが同一マシン上にあるため、この事象が改善していると断言はできなそうです。  

![プロキシ経由でのpull](/img/blogs/2023/0609-podman-proxy.jpg)  

## 補足:コンテナビルドツールとの統合

podmanがdockerのAPIを解釈するということは、JibやCloudnative Buildpacksなどのコンテナビルドツールと組み合わせての利用可否が気になるところです。  

現時点で詳細な検証はできていませんが、簡単なサンプルプロジェクトでコンテナビルドの可否を確認してみたところ、上記2ツールに関しては問題なくdocker daemonを必要とする処理が動いています。  

ただし、ビルド成功したイメージがcli(`podman images`)ではリストアップされるのにGUI上では確認できないケースがある等、少し不安定な部分は残っていそうです。  

![cliとguiの結果差異](/img/blogs/2023/0609-podman-gui-cli-difference.jpg)  

## まとめ

Podman DesktopのWindowsへの導入と簡単な機能を紹介しました。  

現時点で詳細な検証はできていませんが、Windows版に関しては使用感も良く、かつ色々な機能を選択して利用できるためリソースの無駄遣い感もありません。以下のような用途であればかなり期待できるツールだと思います。  
 * コンテナ操作(docker/podman)コマンドをOS(Windows)のターミナルから実行するためのツール  
 * プロキシ/利用リポジトリなどの設定管理を支援するツール  
 * ローカルで開発用クラスター(kindやOpenShift local)を利用するためのツール  
