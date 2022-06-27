---
title: Minikube に QEMU ドライバーサポートが追加 - M1 Mac で利用可能になったけど...
author: masahiro-kondo
tags: [minikube]
date: 2022-06-28
---

M1 Mac で Minikube を使う場合、Hyperkit のドライバーが未サポートなので、Docker Desktop を導入して Driver に Docker を指定するか、有料の Parallels の仮想マシンを指定する必要がありました。Hyperkit のサポートについては、issue が登録されています。

[Mac M1: hyperkit not supported. · Issue #11885 · kubernetes/minikube](https://github.com/kubernetes/minikube/issues/11885)

:::info
この issue のコメントによると Hyperkit サポートは暫定で2022年第2四半期終わりに予定されているようです。

[https://github.com/kubernetes/minikube/issues/11885#issuecomment-1022670840](https://github.com/kubernetes/minikube/issues/11885#issuecomment-1022670840)
:::

先月 issue に以下のコメントが付きました。

> We just released minikube v1.26.0-beta.0 that supports the QEMU driver --driver=qemu2.

[https://github.com/kubernetes/minikube/issues/11885#issuecomment-1126554194](https://github.com/kubernetes/minikube/issues/11885#issuecomment-1126554194)

v1.26.0-beta.0 のリリースノート(Pre-release)を見ると確かに QEMU driver サポートが Features に入っています。

[Release v1.26.0-beta.0 · kubernetes/minikube](https://github.com/kubernetes/minikube/releases/tag/v1.26.0-beta.0)

![](https://i.gyazo.com/4273b4fc5a0e38c38f8bcbb9bdb1f9ab.png)

[QEMU](https://www.qemu.org/) は Hyperkit と同様に仮想マシンを実行する技術で Docker Desktop Apple Silicon 版や [Podman](/blogs/2022/02/23/podman-machine/) などでも採用されています。

Minikube v1.26.0 が正式リリースされたので、QEMU ドライバーで Minikube を使ってみました。

まず、HomeBrew で qemu をインストールします。

```shell
brew install qemu
```

HomeBrew で Minikube をインストールまたはアップデートします。

```shell
brew install minikube
```

バージョンを確認。

```shell
minikube version
```
```
minikube version: v1.26.0
commit: f4b412861bb746be73053c9f6d2895f12cf78565
```

デフォルトのドライバーを qemu2 に設定しました。

```shell
minikube config set driver qemu2
```

その他の設定は以下のようにしました。

```shell
minikube config view
```
```
- memory: 4096
- cpus: 4
- driver: qemu2
- kubernetes-version: 1.24.2
```

minikube start すると初回は qemu2 ドライバーと VM ブートイメージがダウンロードされ、その後クラスターが起動しました。qemu2 ドライバーは「実験的」となっています。

```shell
minikube start
```
```
😄  Darwin 12.4 (arm64) 上の minikube v1.26.0
✨  ユーザーの設定に基づいて qemu2 (実験的) ドライバーを使用します
💿  VM ブートイメージをダウンロードしています...
    > minikube-v1.26.0-arm64.iso....: 65 B / 65 B [----------] 100.00% ? p/s 0s
    > minikube-v1.26.0-arm64.iso: 317.70 MiB / 317.70 MiB  100.00% 8.53 MiB p/s
👍  minikube クラスター中のコントロールプレーンの minikube ノードを起動しています
🔥  qemu2 VM (CPUs=4, Memory=4096MB, Disk=20000MB) を作成しています...
🐳  Docker 20.10.16 で Kubernetes v1.24.2 を準備しています...
    ▪ 証明書と鍵を作成しています...
    ▪ コントロールプレーンを起動しています...
    ▪ RBAC のルールを設定中です...
🔎  Kubernetes コンポーネントを検証しています...
    ▪ gcr.io/k8s-minikube/storage-provisioner:v5 イメージを使用しています
🌟  有効なアドオン: storage-provisioner, default-storageclass
🏄  終了しました！kubectl がデフォルトで「minikube」クラスターと「default」ネームスペースを使用するよう設定されました
```

Docker も仮想マシンの Docker Engine により利用可能です。

```shell
eval $(minikube docker-env)
docker version
```
```
Client:
 Cloud integration: v1.0.24
 Version:           20.10.14
 API version:       1.41
 Go version:        go1.16.15
 Git commit:        a224086
 Built:             Thu Mar 24 01:49:20 2022
 OS/Arch:           darwin/arm64
 Context:           default
 Experimental:      true

Server: Docker Engine - Community
 Engine:
  Version:          20.10.16
  API version:      1.41 (minimum version 1.12)
  Go version:       go1.17.10
  Git commit:       f756502
  Built:            Thu May 12 09:18:24 2022
  OS/Arch:          linux/arm64
  Experimental:     false
 containerd:
  Version:          v1.6.4
  GitCommit:        212e8b6fa2f44b9c21b2798135fc6fb7c53efc16
 runc:
  Version:          1.1.1
  GitCommit:        52de29d7e0f8c0899bd7efb8810dd07f0073fa87
 docker-init:
  Version:          0.19.0
  GitCommit:        de40ad0
```

仮想マシンのプロセス(qemu-system-aarch64)を見ると、ワークロードを実行していない状態では Hyperkit と同程度の負荷のようです。

![](https://i.gyazo.com/87bba3d8d451ea6a444e730ffead91cb.png)

![](https://i.gyazo.com/4fe0279fdeab3f7b023464bcbea3950d.png)

さて、QUEM ドライバーで構築したクラスターで PostgreSQL や MySQL などの StatefulSet なワークロードを実行すると Pod が起動してこないという現象に遭遇しました[^1]。

[^1]: StatufulSet ではなく Deployment であれば正常に動作しました。

```shell
$ helm install hoge-db bitnami/postgresql -n hoge
$ kubectl get po -n hoge -w
```
```
NAME                   READY   STATUS              RESTARTS   AGE
hoge-db-postgresql-0   0/1     ContainerCreating   0          12s
hoge-db-postgresql-0   0/1     Error               0          19s
hoge-db-postgresql-0   0/1     Error               1 (2s ago)   20s
hoge-db-postgresql-0   0/1     CrashLoopBackOff    1 (2s ago)   21s
hoge-db-postgresql-0   0/1     Error               2 (16s ago)   35s
hoge-db-postgresql-0   0/1     CrashLoopBackOff    2 (8s ago)    42s
```

イベントには、PVC のエラーが出力されています。

```shell
$ kubectl -n hoge describe po hoge-db-postgresql-0
```
```
Name:         hoge-db-postgresql-0
Namespace:    hoge
   :
Tolerations:                 node.kubernetes.io/not-ready:NoExecute op=Exists for 300s
                             node.kubernetes.io/unreachable:NoExecute op=Exists for 300s
Events:
  Type     Reason            Age                 From               Message
  ----     ------            ----                ----               -------
  Warning  FailedScheduling  105s                default-scheduler  0/1 nodes are available: 1 pod has unbound immediate PersistentVolumeClaims.
  Normal   Scheduled         103s                default-scheduler  Successfully assigned hoge/hoge-db-postgresql-0 to minikube
  Normal   Pulling           103s                kubelet            Pulling image "docker.io/bitnami/postgresql:14.2.0-debian-10-r33"
  Normal   Pulled            87s                 kubelet            Successfully pulled image "docker.io/bitnami/postgresql:14.2.0-debian-10-r33" in 15.870941839s
  Normal   Created           47s (x4 over 87s)   kubelet            Created container postgresql
  Normal   Started           47s (x4 over 86s)   kubelet            Started container postgresql
  Normal   Pulled            47s (x3 over 86s)   kubelet            Container image "docker.io/bitnami/postgresql:14.2.0-debian-10-r33" already present on machine
```

しかし、実際には、PVC は Bound になっています。

```shell
$ kubectl get pvc -n hoge
```
```
NAME                        STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
data-hoge-db-postgresql-0   Bound    pvc-e4c5db59-7ad5-4cb7-9b5c-c2132c0aec4b   8Gi        RWO            standard       4m32s
```

どうやらバグのようです。PV を自動で割り当ててくれる storage-provisioner との通信がうまくいっていないなどの不具合なのでしょうか？

類似の issue はないようですが、以下の issue を見るとまだかなり問題が残っているようです。

[Known QEMU2 Driver Issues · Issue #14146 · kubernetes/minikube](https://github.com/kubernetes/minikube/issues/14146)

ということでこのバージョンでは QEMU ドライバーサポートはまだ実験的でした。これがちゃんと動くようになると、Docker Desktop も不要になり M1 Mac に作業を移行できるのですが、もう少し時間がかかりそうです。

今回遭遇した不具合も issue 登録して様子を見ようと思います。
