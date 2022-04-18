---
title: Minikube のプロファイルを使いこなす
author: masahiro-kondo
date: 2022-04-18
---

Minikube を使ってコンテナアプリを開発してると、目的別にクラスターを切り替えて使いたくなることがあります。

- ふだんアプリ開発に使っているクラスターと別のクリーンなクラスターで作業をしたい
- テストのため、特定のバージョンの  kubernetes でクラスターを構成したい
- Docker 以外のコンテナランタイムを試したい

など。Minikube はデフォルトで `minikube` というプロファイルでクラスターを起動します。minikube profile コマンドで、現在のプロファイル名や起動構成を確認できます。

```shell
$ minikube profile
minikube
$ minikube profile list
|----------|-----------|---------|--------------|------|---------|---------|-------|
| Profile  | VM Driver | Runtime |      IP      | Port | Version | Status  | Nodes |
|----------|-----------|---------|--------------|------|---------|---------|-------|
| minikube | hyperkit  | docker  | 192.168.64.8 | 8443 | v1.22.2 | Running |     1 |
|----------|-----------|---------|--------------|------|---------|---------|-------|
```

Minikube ではプロファイルを指定し start することで異なる環境のクラスターを起動できます。

新しいプロファイル `hoge` でクラスターを作成するにはプロファイル名を指定して minikube start します。プロファイルはデフォルト構成[^1] を引き継いで起動します。ここでは、kubernetes のバージョン v1.23.3 を指定して起動しています。

[^1]: 本記事で使用した環境は macOS にインストールした Minikube v1.25.2 です。minikube config で driver `hyperkit` を指定しています。

```shell
$ minikube start -p hoge --kubernetes-version=v1.23.3
😄  Darwin 12.3.1 上の [hoge] minikube v1.25.2
✨  ユーザーの設定に基づいて hyperkit ドライバーを使用します
👍  hoge クラスター中のコントロールプレーンの hoge ノードを起動しています
🔥  hyperkit VM (CPUs=2, Memory=4096MB, Disk=20000MB) を作成しています...
🐳  Docker 20.10.12 で Kubernetes v1.23.3 を準備しています...
    ▪ kubelet.housekeeping-interval=5m
    ▪ 証明書と鍵を作成しています...
    ▪ コントロールプレーンを起動しています...
    ▪ RBAC のルールを設定中です...
🔎  Kubernetes コンポーネントを検証しています...
    ▪ gcr.io/k8s-minikube/storage-provisioner:v5 イメージを使用しています
🌟  有効なアドオン: storage-provisioner, default-storageclass
🏄  完了しました！ kubectl が「"hoge"」クラスタと「"default"」ネームスペースを使用するよう構成されました
```

hoge プロファイルのクラスターが起動され、kubernetes のバージョンが指定通りの v1.23.3 になっています。

```shell
$ minikube profile list 
|----------|-----------|---------|---------------|------|---------|---------|-------|
| Profile  | VM Driver | Runtime |      IP       | Port | Version | Status  | Nodes |
|----------|-----------|---------|---------------|------|---------|---------|-------|
| hoge     | hyperkit  | docker  | 192.168.64.11 | 8443 | v1.23.3 | Running |     1 |
| minikube | hyperkit  | docker  | 192.168.64.8  | 8443 | v1.22.2 | Stopped |     1 |
|----------|-----------|---------|---------------|------|---------|---------|-------|
```

クラスター起動時に kubectl の config はプロファイル hoge のクラスターを指すように構成されますが、Minikube のカレントプロファイルは、minikube のままです。切り替えるには profile コマンドでプロファイル名を指定します。

```shell
$ minikube profile hoge
✅  無事 minikube のプロファイルが hoge に設定されました
```

プロファイル hoge のクラスターでコンテナランタイムに containerd を指定したい場合は、start のオプションで指定します。

:::info:minikube config とプロファイル
minikube config コマンドで指定する起動構成はグローバルなデフォルト値です。プロファイルごとのデフォルト値は指定できません。
:::

プロファイル hoge のクラスターをコンテナランタイムを指定せずに起動したので、同じプロファイル名で起動構成を変更するには一度このクラスターを削除する必要があります。カレントのプロファイルが hoge に切り替わっていない場合 stop や start ではオプションにプロファイルを指定する必要があります。

```shell
$ minikube stop -p hoge
✋  「hoge」ノードを停止しています...
🛑  1 台のノードが停止しました。

$ minikube delete -p hoge 
🔥  hyperkit の「hoge」を削除しています...
💀  クラスター「hoge」の全てのトレースを削除しました。
```
:::alert
プロファイルをデフォルトから切り替えずにプロファイル無指定で delete するとデフォルトのクラスターが削除されてしまいます。delete するときは常にプロファイルを明示的に指定する方が安全です。
:::

hoge クラスターを削除するとプロファイルはデフォルト(minikube)に戻ります。

それでは、コンテナランタイムに containerd を指定してプロファイル hoge のクラスターを起動します。

```shell
$ minikube start -p hoge --container-runtime=containerd --kubernetes-version=v1.23.3
😄  Darwin 12.3.1 上の [hoge] minikube v1.25.2
✨  ユーザーの設定に基づいて hyperkit ドライバーを使用します
👍  hoge クラスター中のコントロールプレーンの hoge ノードを起動しています
💾  Kubernetes v1.23.3 のダウンロードの準備をしています
    > preloaded-images-k8s-v17-v1...: 572.66 MiB / 572.66 MiB  100.00% 8.63 MiB
🔥  hyperkit VM (CPUs=2, Memory=4096MB, Disk=20000MB) を作成しています...
📦  containerd 1.4.12 で Kubernetes v1.23.3 を準備しています...
    ▪ kubelet.housekeeping-interval=5m
    ▪ 証明書と鍵を作成しています...
    ▪ コントロールプレーンを起動しています...
    ▪ RBAC のルールを設定中です...
🔗  bridge CNI (コンテナーネットワークインターフェース) を設定中です...
🔎  Kubernetes コンポーネントを検証しています...
    ▪ gcr.io/k8s-minikube/storage-provisioner:v5 イメージを使用しています
🌟  有効なアドオン: default-storageclass, storage-provisioner
🏄  完了しました！ kubectl が「"hoge"」クラスタと「"default"」ネームスペースを使用するよう構成されました
```

プロファイル hoge のコンテナランタイムが conatainerd で構成され起動しました。

```shell
$ minikube profile list
|----------|-----------|------------|---------------|------|---------|---------|-------|
| Profile  | VM Driver |  Runtime   |      IP       | Port | Version | Status  | Nodes |
|----------|-----------|------------|---------------|------|---------|---------|-------|
| hoge     | hyperkit  | containerd | 192.168.64.12 | 8443 | v1.23.3 | Running |     1 |
| minikube | hyperkit  | docker     | 192.168.64.8  | 8443 | v1.22.2 | Stopped |     1 |
|----------|-----------|------------|---------------|------|---------|---------|-------|
```

以上のように Minikube におけるプロファイルはクラスターとほぼ同義で、クラスターと同じライフサイクルを持ち、クラスターを削除したときに削除されます。デフォルトと異なる起動構成で新規プロファイルのクラスターを起動したい場合は start のオプションで指定します。
