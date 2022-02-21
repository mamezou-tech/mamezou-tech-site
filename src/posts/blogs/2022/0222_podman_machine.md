---
title: macOS 上で Podman を動かす
author: satoshi-kawasaki
date: 2022-02-22
tags: [container]
---
2022年1月31日で Docker Desktop の移行期間が終了し、企業での使用は無償使用の条件に該当しない限り全て有償化されました。 
有償化による金額の大小に関わらず、大企業での作業には予算の認可に時間が掛かったり、中小企業だとそもそも年度の予算が足りなかったりなど、さまざまな理由でライセンス料を支払う事が難しいケースもあります。

そこで Docker Desktop の代替となるツールの候補として、Podman について調査してみました。

### 検証環境
- MacBook Pro (14 inch 2022 M1 Pro)
- macOS Monterey
- zsh

### Podman のインストール方法
- Homebrew にてインストール可能です。
```
    % brew install podman
    % podman --version
    podman version 3.4.4
```
- このインストールにより、podman, podman-remote, gvproxy コマンドが `$(brew --prefix)/bin/` にリンクされます。

### Podman machine の初期設定
- Podman を実行する前に、Linux 仮想環境である Podman machine を起動します。
- Podman 自体は Linux 上で動作することが前提条件です。従って Linux 以外の OS で動作させる場合、Linux 仮想マシンを実行する機能は別途必要となってきます。
- しかしながら macOS では Windows の WSL2 のような OS 標準で提供されている LInux 実行環境がありません。podman を macos 上で動作させる為に必要な Linux 仮想環境が Podman machine となります。

- まずは初期化を実行します。初回実行時は Mac 上で動かす Linux の 仮想マシンのイメージをダウンロードします。
```code:zsh
    % podman machine init
```
- ホームディレクトリの配下に仮想マシンのイメージファイルが配置されます。
```
    % ls -lh ~/.local/share/containers/podman/machine/qemu
    total 4492056
    -rw-r--r--  1 kawasakis  staff   597M  2 12 19:12 fedora-coreos-35.20220131.2.0-qemu.aarch64.qcow2.xz
    -rw-------  1 kawasakis  staff   1.5G  2 12 19:12 podman-machine-default_fedora-coreos-35.20220131.2.0-qemu.aarch64.qcow2
    -rw-r--r--  1 kawasakis  staff    64M  2 12 19:12 podman-machine-default_ovmf_vars.fd
```
- Fedora-coreOS の仮想マシン・イメージがダウンロードされました。

- 以下のサンプルのように、初期化が完了したらリストを出して Linux 仮想マシンのイメージがダウンロードされている事を確認することができます。
```
    % podman machine list
    NAME                     VM TYPE     CREATED        LAST UP        CPUS        MEMORY      DISK SIZE
    podman-machine-default*  qemu        3 minutes ago  3 minutes ago  1           2.147GB     10.74GB
```

### Podman machine の起動
- podman machine を起動します。
```
    % podman machine start
    INFO[0000] waiting for clients...
    INFO[0000] listening tcp://127.0.0.1:7777
    INFO[0000] new connection from  to /var/folders/np/q_3j2qd51z5d_mqxdsfhfwmc0000gn/T/podman/qemu_podman-machine-default.sock
    Waiting for VM ...
    Machine "podman-machine-default" started successfully
```

- 問題無く起動しました。続いて以下のコマンドで起動を確認してみます。
```
    % podman machine ls
    NAME                     VM TYPE     CREATED       LAST UP            CPUS        MEMORY      DISK SIZE
    podman-machine-default*  qemu        14 hours ago  Currently running  1           2.147GB     10.74GB
```
- LAST UP の項目が`Currently running`になっていれば正常に起動している状態となります。

### Podman machine の停止
- podman machine の停止する場合は以下のコマンドを実行してください。
```
    % podman machine stop
```

### Podman machine の削除
- ダウンロードした  Linux 仮想マシンの削除を行いたい場合、以下のコマンドを実行します。
```
    # 仮想マシンのイメージを全て削除
    % podman machine rm
```
- イメージファイルの削除を行う場合、以下の形式で名前やオプションを指定して削除することも可能です。詳細は [こちら](https://docs.podman.io/en/latest/markdown/podman-machine-rm.1.html) を参照してください。
```
    % podman machine rm [options][name]
```

- `podman machine rm`を実行した後は、ローカル環境で起動するイメージファイルが削除される為、再度`podman machine init`を実行する必要があります。

### 起動する Linux 仮想マシンのリソース設定
- `podman machine init`コマンドで初期化を行った場合、デフォルトで 2 GB のメモリと 1 コアの CPU が Linux 仮想マシンに割り当てられています。
- 使用する CPU のコア数やメモリサイズを調整するには、`podman machine init`で初期設定を行う際にオプションを指定する必要があります。設定可能な項目については、[Podman machine のヘルプ](https://docs.podman.io/en/latest/markdown/podman-machine-init.1.html) を参照してください。
```
    % podman machine init --cpus 2 --memory 2048
```

- 既にLinux 仮想マシンのイメージがダウンロードされている場合、上記のコマンドを実行してもエラーとなります。
- 仮想マシンイメージの削除コマンドを実行するか、仮想マシンのイメージに別名を付けて初期化してください。
```
    # 別名を付けて仮想マシンイメージを保存
    % podman machine init --cpus 2 --memory 2048 podman-machine-2
```

### Linux 仮想マシンに ssh 接続する
- 起動している Linux 仮想マシンは ssh コマンドでログインできます。
```
    % podman machine ssh
```

### Podman を実行する
- nginx の Docker イメージを pull して動作を確認します。
```
    % podman pull nginx
    % podman run --rm -d --name nginx -p 8080:80 nginx
    % podman ps
    CONTAINER ID  IMAGE                           COMMAND               CREATED        STATUS            PORTS                 NAMES
    1606cf4afe53  docker.io/library/nginx:alpine  nginx -g daemon o...  5 seconds ago  Up 5 seconds ago  0.0.0.0:8080->80/tcp  nginx
```

- Nginx の Docker イメージが pull され、ローカル環境で起動しています。
- 起動した Docker イメージにアクセスして動作を確認します。
```
    % curl http://127.0.0.1:8080
    <!DOCTYPE html>
    <html>
    <head>
    <title>Welcome to nginx!</title>
    <style>
    html { color-scheme: light dark; }
    body { width: 35em; margin: 0 auto;
    font-family: Tahoma, Verdana, Arial, sans-serif; }
    </style>
    </head>
    <body>
    <h1>Welcome to nginx!</h1>
    <p>If you see this page, the nginx web server is successfully installed and
    working. Further configuration is required.</p>

    <p>For online documentation and support please refer to
    <a href="http://nginx.org/">nginx.org</a>.<br/>
    Commercial support is available at
    <a href="http://nginx.com/">nginx.com</a>.</p>

    <p><em>Thank you for using nginx.</em></p>
    </body>
    </html>
```

- [Podman の公式サイト](https://podman.io/) では、今まで Docker で使用していたコマンド`docker`を`podman`に置き換えるだけでコンテナの操作が可能との記載がありました。
- >What is Podman? Podman is a daemonless container engine for developing, managing, and running OCI Containers on your Linux System. Containers can either be run as root or in rootless mode. Simply put: alias docker=podman.  


また、本稿を執筆するにあたり、以下のサイトを参考にさせて頂きました。

- [【podman machine】macOS上でPodmanを実行する新コマンドの紹介](https://rheb.hatenablog.com/entry/podman-machine)
- [macOSでPodmanをDockerの代わりに使う](https://zenn.dev/polyomino/articles/podman-introduction)
- [macOSでPodmanを動かす](https://tech.virtualtech.jp/entry/2021/11/15/182523)
