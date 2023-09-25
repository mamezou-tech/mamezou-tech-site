---
title: OrbStack 1.0 付属の Kubernetes を試す
author: masahiro-kondo
date: 2023-09-25
tags: [orbstack, k8s]
---

## OrbStack 1.0 リリース

6月の記事「[OrbStack - macOS 専用の高速軽量なコンテナ & Linux VM 環境](/blogs/2023/06/21/orbstack/)」で紹介した OrbStack ですが、1.0 がリリースされました。

[OrbStack 1.0: Fast, light, easy way to run Docker containers and Linux](https://orbstack.dev/blog/orbstack-1.0)

:::info
価格も判明しました。非商用の個人利用の場合は無償です。

[Pricing · OrbStack](https://orbstack.dev/pricing)

商用利用可能な Pro は月10ドル(年払いは月8ドル)と Docker Desktop の Pro 月7ドル(年払いは月5ドル)より高いですが、Docker Desktop にはさらに Team や Business など上位グレードがあり、Team が月11ドル(年払いは月9ドル)なので、ターゲットはこちらかもしれません。
:::

上記のアナウンスブログを見ると、Kubernetes も使えるようになっています。筆者は、ベータ版を更新し続けて使っていましたが、この機能追加には気づいておらず、別途 [Kind](https://kind.sigs.k8s.io/) を起動して使っていました。

:::info
ベータが始まった時点では Kubernetes は「近い将来サポート予定」となっていました。8月末の v0.17.0 でリリースされ、改善が続いていました。

[What's new · OrbStack Docs](https://docs.orbstack.dev/release-notes#v0-17-0)
:::

## Kubernetes を有効化する
さっそく、Kubernetes 機能を確認していきます。

Service タブで `Turn On` をクリックします。

![Turn on](https://i.gyazo.com/5551a8173592bf7b88f9cd59d1be9f0e.png)

クラスター構築が開始されます。

![Creating cluster](https://i.gyazo.com/b24bc4a278f933e5f9e4a8d0dd3c7461.png)

1分もかからず、クラスター構築が完了しました。

![Cluster created](https://i.gyazo.com/f48e2ae0d2ff801cb405fd58e3b736a9.png)

クラスター情報をプリントしてみました。正常に起動しています。

```shell
$ kubectl cluster-info
Kubernetes control plane is running at https://127.0.0.1:26443
CoreDNS is running at https://127.0.0.1:26443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy

To further debug and diagnose cluster problems, use 'kubectl cluster-info dump'.
```

## OrbStack の Kubernetes サポート
公式ドキュメントで Kubernetes サポートを確認してみます。

[Kubernetes · OrbStack Docs](https://docs.orbstack.dev/kubernetes/)

OrbStack に組み込まれた Kubernetes は軽量なシングルノードのクラスターであり、GUI が提供され、ホスト OS のネットワークとの統合が実現されています。

コンテナイメージは、OrbStack の Docker エンジンを利用しており、ローカルでビルドしたイメージをそのまま Pod として起動できます。

:::info
これは、Docker Desktop でも同様です。Kind を使う場合はコンテナイメージを `kind load docker-image` でクラスターにロードする必要があったのでここは楽になりました。
:::

Nginx をデプロイしてみます。

```shell
$ kubectl create deployment nginx --image nginx
deployment.apps/nginx created
```

Pod の一覧が UI で確認できます。インフォメーションのアイコンをクリックすると、Status などが確認できます。

![Pods tab](https://i.gyazo.com/a2274b2f04aca8899718f8e7cc30e64e.png)

Logs ボタンをクリックすると Pod のログが確認できます。

![Logs](https://i.gyazo.com/9194469df183d1b392a19fd4984853aa.png)

Terminal ボタンをクリックすると Pod にログインできます。

![Terminal](https://i.gyazo.com/289ad131d3e0f2039319fac9b73da49e.png)

UI でも表示されていましたが、Pod IP を確認します。

```shell
$ kubectl get po -o wide
NAME                     READY   STATUS    RESTARTS   AGE     IP              NODE       NOMINATED NODE   READINESS GATES
nginx-77b4fdf86c-5ljw2   1/1     Running   0          9m48s   192.168.194.6   orbstack   <none>           <none>
```

macOS のターミナルから Pod IP を叩いてみます。

```shell
$ curl -I 192.168.194.6
HTTP/1.1 200 OK
Server: nginx/1.25.2
Date: Mon, 25 Sep 2023 06:39:29 GMT
Content-Type: text/html
Content-Length: 615
Last-Modified: Tue, 15 Aug 2023 17:03:04 GMT
Connection: keep-alive
ETag: "64dbafc8-267"
Accept-Ranges: bytes
```

レスポンスが帰ってきました。Pod IP がホストネットワークに統合されておりダイレクトにアクセスできます。

NodePort を指定して、サービスを公開します。

```shell
$ kubectl expose pod nginx-77b4fdf86c-5ljw2 --type=NodePort --port=80
service/nginx-77b4fdf86c-5ljw2 exposed
```

Services タブに表示されました。

![Services tab](https://i.gyazo.com/061fff1b8e4b4eedd55657eee28ed52f.png)

NodePort は `localhost:PORT` でアクセスできます。

```shell
$ curl -I localhost:32445
HTTP/1.1 200 OK
Server: nginx/1.25.2
Date: Mon, 25 Sep 2023 07:04:29 GMT
Content-Type: text/html
Content-Length: 615
Last-Modified: Tue, 15 Aug 2023 17:03:04 GMT
Connection: keep-alive
ETag: "64dbafc8-267"
Accept-Ranges: bytes
```

UI でも表示されていましたが、ClusterIP を確認します。

```shell
$ kubectl get svc nginx-77b4fdf86c-5ljw2
NAME                     TYPE       CLUSTER-IP        EXTERNAL-IP   PORT(S)        AGE
nginx-77b4fdf86c-5ljw2   NodePort   192.168.194.177   <none>        80:32445/TCP   9m5s
```

ClusterIP もホストマシンから直接アクセスできます。

```shell
$ curl -I 192.168.194.177
HTTP/1.1 200 OK
Server: nginx/1.25.2
Date: Mon, 25 Sep 2023 07:06:03 GMT
Content-Type: text/html
Content-Length: 615
Last-Modified: Tue, 15 Aug 2023 17:03:04 GMT
Connection: keep-alive
ETag: "64dbafc8-267"
Accept-Ranges: bytes
```

ポートフォワーディングは不要です。OrbStack では開発体験を重視して Kubernetes の IP をホストネットワークに統合しています。

:::info
OrbStack の Kubernetes クラスターにデプロイした NodePorts や LoadBalancer はローカルホストからのみ利用可能ですが、LAN に公開するオプションの提供も予定されているようです。
:::

Kubernetes クラスターは UI だけでなく orb CLI で開始、停止、再開、削除ができます。

```shell
# Start
orb start k8s
# Stop
orb stop k8s
# Restart
orb restart k8s
# Delete
orb delete k8s
```

削除後 Start すると Kubernetes クラスターが新規に構築されます。

## 最後に
Apple Silicon の Mac では Hyperkit がないため、Doker Desktop より軽量な Minikube を使うことができませんでした[^1]。その状況も軽量・高速でオールインワンの OrbStack の登場により変化しました。コンテナを利用する開発も捗るようになっていくと思います。シンプルですが Pod や Service 用の UI も提供されており、CLI を叩かなくても状態を把握できるのも開発体験という意味ではメリットがあると思います。

[^1]: もちろん Docker ドライバーを利用すれば動かすことはできますが、Docker Desktop などが別途必要になりオーバーヘッドが大きいのが課題でした。QEMU ドライバーサポートの開発が続いていますが、難航している模様です([こちらの記事](https://developer.mamezou-tech.com/blogs/2022/06/28/minikube-with-qemu-driver-support/)で紹介しています)。

OrbStack はクローズドソースであり、透明性やコミュニティによる貢献などの観点で懸念の声もあるようです。

[⭐️ Open Source Code Request 🤩 · Issue #359 · orbstack/orbstack](https://github.com/orbstack/orbstack/issues/359)

しかし OrbStack は開発環境であり、Docker Desktop もクローズドソースであること、macOS のような商用ベースの OS に特化したソフトウェアであることから、OSS でないこと自体はさほど採用の障壁にはならないと考えます[^2]。

:::info
OrbStack を構成するすべてのソフトウェアがクローズというわけではなく、OrbStack 用に修正された Linux kernel などは OSS 化されています。

[GitHub - orbstack/linux-macvirt: Modified Linux kernel for OrbStack (one of the core components) — to request the latest version, email oss@orbstack.dev](https://github.com/orbstack/linux-macvirt)
:::

[^2]: issue もそのようなコメントで閉じられていました。
