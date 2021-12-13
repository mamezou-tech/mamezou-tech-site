---
title: ローカル開発環境準備 - Kubernetes(minikube)
author: noboru-kudo
date: 2021-12-19
---

それではここからはアプリケーションの開発編に入っていきましょう。

チームでKubernetesで動作するアプリケーションを開発する場合に、どうやって各開発者がコンテナ環境で動作するアプリケーションを実装・テストすればよいでしょうか？
各個人にクラウド上にクラスタ環境を準備するのが理想的ですが、コスト的に難しいというのが一般的かと思います。
そのような場合は、コンテナ以前の開発ように各ローカルマシンでアプリケーションプロセスを起動して実装や動作確認を行い、実際のクラスタ環境での確認は結合試験等で実施することになります。
これでもいいのですが[^1]、クイックフィードバックが得られるローカル環境で、コンテナ内のアプリの振る舞いやKubernetesのリソース(DeploymentやService等)の定義を確認できる方が圧倒的に効率的です。

[^1]: ローカルマシンのスペックや企業別のセキュリティポリシー等、様々な制約により実際このような開発スタイルとなることも多いことと思います。

ここではローカル環境でスモールバージョンのKubernetesを導入して、実装の段階でより品質の高いコンテナ型アプリケーションを作り込むことを目指していきましょう。
以下に列挙するように、ローカル環境でKubernetesを動かす方法は多くあります。
- [Docker DesktopのKubernetes](https://docs.docker.com/desktop/kubernetes/)
- [kind](https://kind.sigs.k8s.io/)
- [minikube](https://minikube.sigs.k8s.io/)
- [MicroK8s](https://microk8s.io/)
- [k3d](https://github.com/rancher/k3d)

上記だとDocker Desktopが最も使いやすく人気があると思いますが、残念ながら2021/8/31より個人やスモールビジネス向けを除き有償化されてしまいました[^2]。

[^2]: <https://www.docker.com/blog/updating-product-subscriptions/>

これがネックとなり導入が難しい開発現場もあると思いますので、今回は上記の中でDocker Desktopを使用していないminikubeを導入しましょう。
minikubeはKubernetes公式コミュニティ(SIGs)で開発・運用されているソフトウェアで、ローカル環境向けのKubernetesとして最も歴史が古く成熟度の高いツールと言えます。

**なお、ここでの作業はDocker DesktopのKubernetesでも代用可能ですので、Docker Desktop導入済みの場合はスキップしても構いません。**

## minikubeセットアップ

こちらは以下の公式ドキュメントに従って準備します。
- <https://minikube.sigs.k8s.io/docs/start/>

ここではMacBook Proを使って説明しますが、minikubeはWindowsにも対応していますので、上記ドキュメントに従ってセットアップしてください(動作は未検証です)。

まずはminikubeが動作する仮想環境ソフトウェアを導入する必要があります。
ここではHyperKitを選択しますが、Docker等他のドライバーでも可能です。
[こちら](https://minikube.sigs.k8s.io/docs/drivers/)を参考に任意のドライバーをセットアップしてください。

HyperKitはHomeBrewからインストールできます。

```shell
brew install hyperkit
```

次にminikube本体を導入します。こちらもHomeBrewからインストール可能です。

```shell
brew install minikube
```

ターミナルから`minikube`コマンドが使えない場合は、以下を実行します。

```shell
brew unlink minikube
brew link minikube
```

`minikube`コマンドが使えるかを確認しましょう。

```shell
minikube version
```

minikubeのバージョンが出力されていればインストール完了です。ここでは現時点で最新の`1.24.0`をセットアップしました。

## minikube起動

minikubeを起動する前にminikubeの設定を変更しておきましょう。

```shell
# minikubeを起動するDriver。HyperKit以外のドライバーの場合は設定値を変更してください
minikube config set driver hyperkit
# minikubeに割り当てるCPU。デフォルトは2。マシンスペックに応じて変更してください
minikube config set cpus 4
# minikubeに割り当てるメモリ。デフォルトは2G。マシンスペックに応じて変更してください
minikube config set memory 8Gi
# コンテナランタイム
minikube config set container-runtime containerd
```

後は起動するだけです。以下のコマンドを実行するだけで起動することができます。
HyperKit以外のドライバーの場合は`--driver`オプションの設定値を変更してください。

```shell
minikube start
```
```
😄  minikube v1.24.0 on Darwin 12.0.1
✨  Using the hyperkit driver based on user configuration
💾  Downloading driver docker-machine-driver-hyperkit:
    > docker-machine-driver-hyper...: 65 B / 65 B [----------] 100.00% ? p/s 0s
    > docker-machine-driver-hyper...: 8.35 MiB / 8.35 MiB  100.00% 8.12 MiB p/s
🔑  The 'hyperkit' driver requires elevated permissions. The following commands will be executed:

💿  Downloading VM boot image ...
    > minikube-v1.24.0.iso.sha256: 65 B / 65 B [-------------] 100.00% ? p/s 0s
    > minikube-v1.24.0.iso: 225.58 MiB / 225.58 MiB  100.00% 71.41 MiB p/s 3.4s
👍  Starting control plane node minikube in cluster minikube
💾  Downloading Kubernetes v1.22.3 preload ...
    > preloaded-images-k8s-v13-v1...: 919.22 MiB / 919.22 MiB  100.00% 57.01 Mi
🔥  Creating hyperkit VM (CPUs=4, Memory=8192MB, Disk=20000MB) ...
📦  Preparing Kubernetes v1.22.3 on containerd 1.4.9 ...
    ▪ Generating certificates and keys ...
    ▪ Booting up control plane ...
    ▪ Configuring RBAC rules ...
🔗  Configuring bridge CNI (Container Networking Interface) ...
🔎  Verifying Kubernetes components...
    ▪ Using image gcr.io/k8s-minikube/storage-provisioner:v5
🌟  Enabled addons: storage-provisioner, default-storageclass
🏄  Done! kubectl is now configured to use "minikube" cluster and "default" namespace by default
```

minikubeがダウンロードされ、実行されている様子が分かります。
このときkubectlの認証情報(kubeconfig)も自動で設定されます(`minikube`)ので、このまますぐに使い始めることができます。

```shell
kubectl cluster-info
```
```
Kubernetes control plane is running at https://192.168.64.2:8443
CoreDNS is running at https://192.168.64.2:8443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy
```

## 動作確認

それではminikubeで起動したKubernetesにサンプルアプリをデプロイしてみましょう。
ここではDockerHub等のパブリックリポジトリのイメージではなく、実際の作業を想定しカスタムのコンテナイメージをデプロイします。

```dockerfile

```

## クリーンアップ

minikubeを安全に停止するためには以下のコマンドを実行します。

```shell
minikube stop
```

これで次回は`minikube start`で前回の続きから再開することができます。
完全にクラスタを削除する場合は以下のコマンドです。最初からやり直したい場合に使用します。

```shell
minikube delete
```

---
参照資料

- minikube: <https://minikube.sigs.k8s.io/docs/>