---
title: AWS上に継続的デリバリ環境を構築してみた 第１回：VPC作成～Apacheインストール
author: ryosuke-kono
date: 2022-12-19
templateEngineOverride: md
tags: [CI/CD, AWS, advent2022]
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2022/
---

これは、[豆蔵デベロッパーサイトアドベントカレンダー2022](https://developer.mamezou-tech.com/events/advent-calendar/2022/)第19日目の記事です。


私は今入社2年目で、主にアプリケーション開発に携わってきました。
AWSやCI/CDについては、概要は知っていても自分ではほとんど触ったことのない分野でした。
しかし、その知識はアプリケーション開発をする上でも必要であると感じ、実際に簡単な継続的デリバリ環境を構築したので、構築した環境の構成と手順を紹介します。

継続的デリバリ環境は、開発したプログラムを利用環境へリリースする作業を自動化できます。
今回私はAWSのサービスやGitLabなどを使用し簡単な継続的デリバリ環境を構築しました。
作成した環境の構成図は以下の図の通りです。

![パイプライン構成図](https://gyazo.com/1dfaf7eb056de8dcc27dd7f41367befc.png)

この環境は、HTMLを静的サイトジェネレーターでビルドしてデプロイすることを目的としています。
まず、開発者がGitLabにpushしたHTMLのソースをCodeCommitへミラーリングします。その変更がCodePipelineに検知されると、CodeDeployがCodeCommitからソースを取得し、Apacheサーバーへデプロイする、といった構成となっています。
第１回では、

* 仮想ネットワークであるVPCの作成

* Apache(Apache HTTP Server)用サーバーに使用するEC2インスタンスの作成

* 作成したEC2にSSH接続しApacheインストール

の３つの手順を説明しています。


## １．VPC作成

AWSのマネジメントコンソールからVPCのコンソールを開き、「VPCを作成」からVPCを作成できます。
今回の構築では、リージョンはアジアパシフィック（東京）を選択しました。
ここで選択したVPCの設定は以下の画像の通りです。

![vpc設定1](https://gyazo.com/7754c134ed10b2c545ffb256faabca50.png)
![vpc設定2](https://gyazo.com/e30d8e9925623c874e6807557265b06e.png)

今回はシンプルな構成にするため、プライベートサブネットは0、NATゲートウェイ、VPCエンドポイントはなしとしています。
設定した構成は、右のプレビューに図として表示されているため、問題がないことを確認できたら「VPCを作成」を押下します。
VPCのコンソールから、作成したVPCの状態がAvailableとなっていれば作成完了です。

## ２．Apache用EC2作成

次に、デプロイ先となるApache用のEC2を作成しました。
AWSのマネジメントコンソールからEC2を選択し、「インスタンスを起動」を押下しEC2インスタンスを作成できます。
ここで私が選択した設定は以下の通りです。

![ec2設定1](https://gyazo.com/14f1fedca59d1f0b197f0a7100bb7ee4.png)

アプリケーションおよび OS イメージ (Amazon マシンイメージ)は、RedHatを使用しました。
今回の構築ではApache用サーバーに性能を必要としないため、インスタンスタイプはt2.microを選択しています。
これらの設定の中で重要なものが２つあります。

１つ目はキーペアです。「新しいキーペアの作成」を押下し、任意のキーペア名を入力します。
キーペアのタイプはRSA、プライベートキーファイル形式は.pemを使用しています。
必要項目を入力したら、「キーペアを作成」を押下します。プライベートキーファイルがダウンロードされます。
プライベートキーファイルは後の工程で使用するため、誤って削除しないよう注意が必要です。

![キーペア設定](https://gyazo.com/4199e41639819de1ef807efa6d6f1d9f.png)

２つ目は、Network settingsです。1で作成したVPC内にEC2インスタンスを作成するため、先ほど作成したVPCを選択しています。
パブリック IP の自動割り当ても、デフォルトでは無効化になっているので有効化を択しています。

![ec2設定2](https://gyazo.com/96cd818b557b228c52a04d9a82af0f3d.png)

また、HTTP接続用にセキュリティグループルールから80番ポートも開けています。

![ec2設定3](https://gyazo.com/fc59a82d130626c992acab13b5bf1708.png)

ストレージは、動作を安定させるため30GBに変更しています。
他にも設定項目はありますが、簡易な環境を構築するため全てデフォルトとしています。
設定が終わり、確認ができたら「インスタンスを起動」を押下し、画面に「成功」と表示されたら、Apache用EC2作成は完了です。

## ３．Apacheインストール

次に、作成したApache用EC2にSSH接続し、Apacheインストールを行います。
まず、ターミナルからApache用EC2にSSH接続します。
今回の構築用にフォルダを作成し、先ほどダウンロードしたプライベートキーファイルを配置します。
ターミナルで該当ディレクトリに移動し、以下のコードを使ってSSH接続します。

` ssh -i 公開鍵 ec2-user@IPアドレス`

![Apacheインストール1](https://gyazo.com/cfd7fc6d9483bf8c555289b350fb517e.png)

公開鍵は.pemファイル、EC2コンソールから確認できるパブリック IPv4 DNSを使用しています。
RedHatではデフォルトユーザーがec2-userとなっています。接続確認でyesを入力し、上の画像の状態になればSSH接続完了です。

次に、以下のコマンドを使用してパッケージをアップデートしておきます。Complete!と表示されれば完了です。

`sudo yum update -y`

いよいよApacheのインストールです。以下のコマンドを使用してインストールを行います。こちらもComplete!と表示されれば完了です。

`sudo yum install -y httpd`

Apacheを以下のコマンドで起動します。エラーが発生しなければ、問題なく起動しています。

`sudo systemctl start httpd`

Apacheが起動しているかの確認します。以下のコマンドを入力し、Activeと表示されていればApacheが起動しています。

`sudo systemctl status httpd`

![Apacheインストール2](https://gyazo.com/63b74aa4d75902ee7edb8d7450c8ac6c.png)

Apacheの自動起動設定をします。以下のコマンドを実行することで自動起動するよう設定できます。

`sudo systemctl enable httpd`

Apacheの自動起動設定が有効か確認をします。以下のコマンドを実行し、httpd.serviceがenableになっていることを確認できれば自動起動設定は有効化されています。

`sudo systemctl list-unit-files -t service | grep httpd`

![Apacheインストール3](https://gyazo.com/dfd3479814a76dccdb6011c7bb81ac1f.png)

## さいごに

今回は、VPCを作成し、その中に配布先であるApacheをインストールしたEC2インスタンスを準備しました。
次回はpush先のGitLab用のEC2作成、docker-composeを使用したGitLab導入した際に実施した手順について整理します。
