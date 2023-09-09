---
title: WSL2上にUbuntu-22.04LTSを導入し、Dockerをインストールしようとしたら、いろいろとハマった件
author: shuichi-takatsu
date: 2023-09-09
tags: [wsl, docker, ubuntu]
---

仕事で Ubuntu ＋ Docker を使うシーンが出てきて環境を構築したので、備忘録を兼ねて環境構築方法を記録しておこうと思います。  
これまで何度も Ubuntu ＋ Docker 環境を作ってきましたが、Windowsの WSL（Windows Subsystem for Linux）で Ubuntu ＋ Docker 環境を構築するのは初だったので思った以上にハマってしまいました。  
WSLのバージョン、Ubuntuのバージョンによって難易度が左右されることを思い知らされました。

## Windows環境と Linuxディストリビューション、Docker

今回 Ubuntu ＋ Docker 環境を構築するベースになるWindows環境は以下です。

- OS: Windows 10 pro
- OSバージョン: 22H2
- OSビルド: 19045.3324

導入したい Linuxディストリビューションは以下です。  

- Linux: Ubuntu-22.04 LTS

Docker については Ubuntu-22.04 で利用できる最新版をインストールすることにします。

## WSL2 Linuxカーネルの更新

WSL2 の Linuxカーネル更新プログラムを[このサイト](https://learn.microsoft.com/ja-jp/windows/wsl/install-manual#step-4---download-the-linux-kernel-update-package)からダウンロードしてインストールします。

![](https://gyazo.com/1dbd00b17f5922e9b2f0bb4689c1c497.png)

## 規定の WSLバージョンとして WSL2 を設定

更新プログラムをインストールしたあと、WSL2 を既定のバージョンとして設定します。（WSLにはバージョン１とバージョン２があります）

```shell
wsl --set-default-version 2
```

## WSL2 の更新

WSL2 を更新します。

```shell
wsl --update
```

<strong style="color:red;">【ハマりポイント：その１】</strong>  
ここで WSL2 を更新しておかないと、Ubuntu-22.04 LTS を正常にインストールすることが出来ず、インストール途中でエラーになってしまいました。  

## WSL2 でインストール可能なLinuxディストリビューションを確認

以下のコマンドで、インストール可能な Linuxディストリビューションを検索します。

```shell
wsl --list --online
```

次のように結果が表示されました。  
![](https://gyazo.com/29d4e4746749a04e553bfc37cd8ee355.png)

今回はリストに表示された中の「Ubuntu-22.04（Ubuntu 22.04 LTS）」をインストールすることにします。

## WSL2 で Ubuntu-22.04 をインストール

以下のコマンドで、Ubuntu-22.04 をインストールします。

```shell
wsl --install -d Ubuntu-22.04
```

インストールが完了すると、username と password の入力を求められます。  
![](https://gyazo.com/0a6487dec5531d8e86b44f5b6ca04eed.png)

username と password を入力してインストールを終了します。 
（ここでは username と password を「ubuntu」と設定したとして話を進めます）  
![](https://gyazo.com/5e65b5055c491bdf2ca0531c3058cd5a.png)

（※Ubuntu 22.04 を指定しましたが、インストールされたバージョンは 22.04.2 のようです）

Microsoft Store から Ubuntu-22.04 をインストールすることができます。  
![](https://gyazo.com/60d4c7371e9fde545f4a2076286e5a1b.png)

## WSL2 で Ubuntu-22.04 をデフォルトのディストリビューションに設定

他にも Linuxがインストールされている場合、インストールした Ubuntu-22.04 をデフォルトのディストリビューションに設定します。

```shell
wsl --set-default Ubuntu-22.04
```

## Linuxディストリビューション のネットワーク設定

会社のPC等を使用していてVPNを利用している場合は、DNS で名前解決が出来ないという問題が発生する場合があります。  
そこで DNS のネームサーバを記述している「/etc/resolv.conf」ファイルを編集したいのですが、WSL2 のデフォルト設定では、WSL2 を再起動したときに WSL2 が「/etc/resolv.conf」ファイルを自動生成してしまい、「/etc/resolv.conf」ファイルを編集した内容が上書きされて消えてしまいます。  
そのため、WSL2 が「/etc/resolv.conf」を自動生成しないように設定しておく必要があります。  

Ubuntu-22.04 にログインして「/etc/wsl.conf」ファイルを編集します。

```shell
sudo vim /etc/wsl.conf
```
(vi や vim の使い方は[こちら](https://prograshi.com/general/editor/vi-vim-editor/)などを参照してください)

「/etc/wsl.conf」ファイルの末尾に以下を２行を追記します。  

```text
[network]
generateResolvConf = false
```

次に「/etc/resolv.conf」ファイルを更新します。

```shell
sudo vim /etc/resolv.conf
```

「/etc/resolv.conf」ファイルの中の「nameserver」の項目を次のように変更します。  
<strong style="color:red;">（注意：後の章で解説しますが、ここでの設定は実は反映されません。後の章で対処方法を説明します）</strong>  

```text
nameserver 8.8.8.8
```

今回は、VPN 有効時と無効時の両方で使える DNS サーバとして「8.8.8.8」を指定しました。  
「8.8.8.8」は Google Public DNS です。  

次に WSL2 を終了させます。

```shell
wsl --shutdown
```

## resolv.conf が消えてしまう問題

<strong style="color:red;">【ハマりポイント：その２】</strong>  
Ubuntu を再起動したときに「/etc/resolv.conf」ファイルが綺麗に消えていました。  
同じように悩んでいる方がいたのでそちらの[記事](https://www.charasite.net/memo/win11-22h2-wls-network/#toc6)を紹介します。  

【対応策】  
消えてしまった「/etc/resolv.conf」ファイルを作成しましょう。  
（注意：今後、WSL2 が更新されていった場合、対処方法が変わってくる可能性があります）  

元になる「/etc/resolv.conf」ファイルをコピーしてきます。  
```shell
sudo cp /mnt/wsl/resolv.conf /etc/resolv.conf
```

先ほど設定した nameserver の設定が反映されていないはずなので再度設定します（「nameserver 8.8.8.8」に変更）。  

また「/etc/resolv.conf」ファイルが消されてしまわないように属性を変更しておきます。  

```shell
sudo chattr +i /etc/resolv.conf
```

再度 Linuxディストリビューションを再起動して DNS の設定を確認します。

ようやく Docker をインストールする前準備が整いました。  

## Ubuntu-22.04 のパッケージ更新

Ubuntu-22.04 を起動して、パッケージを更新します。

```shell
sudo apt update
sudo apt upgrade -y
```
## Docker インストールの準備

Docker をインストールする前に、必要なパッケージをインストールしておきます。  

```shell
sudo apt install ca-certificates curl gnupg lsb-release -y
```

## Docker の公式GPGキーの追加

Docker の公式GPGキー（Ubuntu）を以下のコマンドで追加します。

```shell
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
```

## APTソースリストの更新

Docker のリポジトリを APTソースリストに追加します。  
（APTは「Advanced Package Tool (アドバンスド パッケージ ツール)」の略です）  

```shell
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

この段階で Update を実施します。  

```shell
sudo apt update
```

<strong style="color:red;">【ハマりポイント：その３】</strong>  
先ほどの「/etc/resolv.conf」ファイルの設定が出来ていないと、Updateでエラーがバンバン出ます。  
このエラーの原因が「/etc/resolv.conf」にあると気がつくまで、私は何度も sources.list を確認することになってしまいました。

## Docker インストール

Docker に必要なパッケージをインストールしていきます。  
（Docker 本体は「docker-ce」パッケージです）

```shell
sudo apt install docker-ce docker-ce-cli containerd.io docker-compose-plugin -y
```

## 一般ユーザが Docker コマンドを利用できるようにする

一般ユーザが Docker コマンドを利用できるように Group へ追加します。  
（※一般ユーザを「ubuntu」として登録しています）

```shell
sudo usermod -a -G docker ubuntu
```

## Docker の自動起動設定

Docker が自動起動されるように systemctlコマンドで設定します。  

```shell
sudo systemctl enable docker
```

## Docker の起動

Dockerサービスを起動させます。

```shell
sudo service docker start
```

## Docker daemon が動かない・・・

Docker が起動できていることを確認するために、docker psコマンドを実行します。

```shell
docker ps
```

docker psコマンドを実行すると以下のようなエラーが発生しました。

```text
Cannot connect to the Docker daemon at unix:///var/run/docker.sock.
```

<strong style="color:red;">【ハマりポイント：その４】</strong>  
どうやら Linuxディストリビューションが Ubuntu 20.10 以降の場合に見られる現象のようです。  
[こちらのサイトの情報](https://github.com/microsoft/WSL/issues/6655)を参考にして、以下を設定を行いました。  

```shell
sudo update-alternatives --set iptables /usr/sbin/iptables-legacy
sudo update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy
```

WSL2 Kernel が nftables をサポートしていないことが原因らしいので、WSL2 が更新されていけば解決する可能性があります。  
調べてみると、他にもエラーの解消方法は色々とあるようですが、上記の設定で動いているので良しとします。  

## Docker 版 Hello World！

Docker が正しく動作するか確認します。  
以下のコマンドを Ubuntu-22.04 上で実行します。  

```shell
docker run hello-world
```

次のように出力されれば、Docker のインストールは成功です。  
お疲れ様でした。  
![](https://gyazo.com/5dc1f5ed8af9807595835a1049ecc729.png)

## まとめ

久しぶりに WSL2 を使いましたが何度も詰まってしまいました。  
この記事が WSL2 + Ubuntu + Docker 環境を構築する人の手助けになれば幸いです。
