---
title: エアーギャップ環境のエッジデバイスにk3sをインストールする 
author: shigeki-shoji
date: 2024-01-30
tags: [k3s, iot]
image: true
---

こんにちは、[庄司](https://github.com/edward-mamezou)です。

筆者は遠隔地にある事務所の PC にソフトウェアをインストールする仕事をしていたことがあります。この時代インターネットはなく、何枚ものフロッピーディスクを持って事務所を訪問し、手順書をもとに数時間かけてインストールしていました。この記事のタイトルにあるエアーギャップ環境とはこのような環境をいいます。インターネットに常時接続された環境が一般的となり、ネットワークにつながっていない環境の方が特殊となりエアーギャップ環境と呼ばれるようになりました。

現在でもセキュリティ等の理由からインターネットと完全に分離されたエアーギャップ環境はたくさん存在します。このような環境でも Kubernetes は利用できます。通常 Kubernetes は複数のサーバ (ノードといいます) で運用しますが、IoT デバイス用の k3s は1台のサーバから運用できます。ここでは、エアーギャップ環境にある Raspberry Pi (arm64) を想定して k3s をインストールする手順を紹介します。

## インストールに利用するファイルの準備

インストールに利用するファイルを現地に持ち込むため、なんらかのストレージに保存しなければなりません。ここではUSBメモリを利用することにしました。

### ダウンロード

[GitHub リポジトリのリリース](https://github.com/k3s-io/k3s/releases)からインストールするバージョンの Assets を開き、`k3s-arm64`、`k3s-airgap-images-arm64.tar.zst` をダウンロードしてUSBメモリに保存します。

`install.sh` ファイルは次のコマンドでダウンロードしてUSBメモリに保存します (例は mac の場合です)。

```text
curl -sfL https://get.k3s.io > install.sh
```

## インストール

Raspberry Pi を Raspbian (64bit版) で使用している場合、`/boot/cmdline.txt` に `cgroup_memory=1 cgroup_enable=memory` を追記し再起動が必要です。必ず改行せずに追記してください。筆者の `/boot/cmdline.txt` は下の通りです。外付けのUSBディスクで起動するため `root=` のところに `PARTUUID=870ea24b-02` を設定してUSBディスクのパーティションUUIDを設定しています。

```text
console=serial0,115200 console=tty1 root=PARTUUID=870ea24b-02 rootfstype=ext4 fsck.repair=yes rootwait init=/usr/lib/raspberrypi-sys-mods/firstboot cfg80211.ieee80211_regdom=JP cgroup_memory=1 cgroup_enable=memory
```

:::info
USBディスクのパーティションUUIDを知りたい場合は、`lsblk --output +PARTUUID` を実行してください。
:::

### インストールの準備

[公式サイト](https://docs.k3s.io/installation/airgap)のドキュメントを少し読み替えながら進めることにします。

まず、USBメモリをマウントしましょう。USBメモリが `/dev/sda1` として進めます。

```text
sudo mount /dev/sda1 /mnt
```

- `/usr/local/bin` に `k3s` をコピーします。

```text
sudo cp /mnt/k3s-arm64 /usr/local/bin/k3s
```

- Airgap イメージを `/var/lib/rancher/k3s/agent/images/` にコピーします。

```text
sudo mkdir -p /var/lib/rancher/k3s/agent/images/
sudo cp k3s-airgap-images-arm64.tar.zst /var/lib/rancher/k3s/agent/images/
```

- インストール

```text
INSTALL_K3S_SKIP_DOWNLOAD=true ./install.sh
```

もし、インストールに失敗したときは、一度 `sudo k3s-uninstall` コマンドを実行してアンインストールした後、手順等を見直して再度インストールにトライしてください。

### 確認

`sudo k3s kubectl get nodes` を実行してインストールしたサーバの情報が表示されれば成功です。

```text
sudo k3s kubectl get nodes
NAME        STATUS   ROLES                  AGE   VERSION
raspberrypi Ready    control-plane,master   62s   v1.29.1-rc2+k3s1
```

## おわりに

この記事では Raspberry Pi を使って説明しました。Jetson などの arm64 アーキテクチャのサーバにも同様な手順でインストールできます。さらに k3s は高可用性 (High Availability) のために複数サーバのクラスタの構成も可能です。

## 参考

- [k3s](https://k3s.io/)
- [Raspberry Pi](https://www.raspberrypi.com/)
- [NVIDIA](https://www.nvidia.com/ja-jp/autonomous-machines/)
