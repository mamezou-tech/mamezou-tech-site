---
title: ローカル開発環境準備 - Kubernetes(minikube)
author: noboru-kudo
date: 2021-12-19
---

それではここからはアプリケーションの開発編に入っていきましょう。

チームでKubernetesで動作するアプリケーションを開発する場合に、どうやって各開発者がコンテナ環境で動作するアプリケーションを実装・テストすればよいでしょうか？
各個人にクラウド上にクラスタ環境を準備するのが理想的ですが、コスト的に難しいというのが一般的かと思います。
そのような場合は、コンテナ以前の開発ように各ローカルマシンでアプリケーションプロセスを起動して実装や動作確認を行い、実際のクラスタ環境での確認は結合試験等で実施することになります。
これでもいいのですが[^1]、クイックフィードバックが得られるローカル環境で、コンテナ内のアプリの振る舞いやKubernetesのリソース(DeploymentやService等)の定義を確認できる方が断然効率的です。

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

また、今回はDocker Desktopは使用しませんが、コンテナのビルド・ランタイムエンジンとしてDockerを使用しますので、Docker単体は別途インストールしてください。

```shell
brew install docker
```

Windowsの場合は、Docker DesktopではなくDocker単体でインストールできませんので、WSLでの利用を検討してください。

## minikube起動

minikubeを起動する前にminikubeの設定を変更しておきましょう。

```shell
# minikubeを起動するDriver。HyperKit以外のドライバーの場合は設定値を変更してください
minikube config set driver hyperkit
# minikubeに割り当てるCPU。デフォルトは2。マシンスペックに応じて変更してください
minikube config set cpus 4
# minikubeに割り当てるメモリ。デフォルトは2G。マシンスペックに応じて変更してください
minikube config set memory 8Gi
```

後は起動するだけです。以下のコマンドを実行するだけで起動することができます。

```shell
minikube start
```
```
😄  minikube v1.24.0 on Darwin 12.0.1
    ▪ MINIKUBE_ACTIVE_PODMAN=minikube
✨  Using the hyperkit driver based on user configuration
👍  Starting control plane node minikube in cluster minikube
🔥  Creating hyperkit VM (CPUs=4, Memory=8192MB, Disk=20000MB) ...
🐳  Preparing Kubernetes v1.22.3 on Docker 20.10.8 ...
    ▪ Generating certificates and keys ...
    ▪ Booting up control plane ...
    ▪ Configuring RBAC rules ...
🔎  Verifying Kubernetes components...
    ▪ Using image gcr.io/k8s-minikube/storage-provisioner:v5
🌟  Enabled addons: storage-provisioner, default-storageclass
🏄  Done! kubectl is now configured to use "minikube" cluster and "default" namespace by default
```

minikubeが実行されている様子が分かります。
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
以前のようにパブリックリポジトリのイメージではなく、実際の開発イメージを掴むためにソースコードからビルドしたコンテナイメージをデプロイするフローで実施します。

今回は動作確認用にGo言語のREST APIアプリを作成します。任意のディレクトリに、`main.go`というファイルを作成し、以下を記述します。

```go
package main

import (
	"fmt"
	"net/http"
)

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Hello minikube app!!!")
	})
	http.ListenAndServe(":8000", nil)
}
```

8000番ポートでHTTPリクエストを受けると、`Hello minikube app!!!`というメッセージを返すだけのアプリです。
次にコンテナのビルドするためのDockerfileを記述します。
ソースコードと同じディレクトリに`Dockerfile`というファイルを作成し以下を記述します。

```dockerfile
FROM golang:1.16 as builder
WORKDIR /src
COPY main.go /src
RUN CGO_ENABLED=0 GOOS=linux go build -o sample-app main.go

FROM scratch
COPY --from=builder /src/sample-app /sample-app
CMD ["/sample-app"]
```

前半でGo言語のコンテナ(`golang:1.16`)でソースファイルをビルドして実行可能ファイル(`sample-app`)を作成し、後半部分でランタイム環境にビルドした実行可能ファイルを配置しています。
このままコンテナイメージをビルドしてもローカル環境に作成されるだけです。minikubeの仮想環境でビルドするには以下のコマンドを実行します。

```shell
eval $(minikube docker-env)
```

これでdockerコマンドがminikubeの仮想環境で実行されるようになります。
それではコンテナイメージを作成しましょう。ソースコードとDockerfileが配置されているディレクトリで以下を実行します。

```shell
docker build -t sample-app .
```
```
Sending build context to Docker daemon  6.068MB
Step 1/7 : FROM golang:1.16 as builder
1.16: Pulling from library/golang
5e0b432e8ba9: Pull complete 
a84cfd68b5ce: Pull complete 
e8b8f2315954: Pull complete 
0598fa43a7e7: Pull complete 
ae9442ff4ff8: Pull complete 
dd56cb6d5926: Pull complete 
0b5f424b4861: Pull complete 
Digest: sha256:16b78b82eb0ee19c15fdafd98c94f44e307a068933a505ea9c9a9be1fa99f987
Status: Downloaded newer image for golang:1.16
 ---> 9a2e805e6c23
Step 2/7 : WORKDIR /src
 ---> Running in fdb77c105d4c
Removing intermediate container fdb77c105d4c
 ---> 73733132f3c4
Step 3/7 : COPY main.go /src
 ---> c7d8e66b8024
Step 4/7 : RUN CGO_ENABLED=0 GOOS=linux go build -o sample-app main.go
 ---> Running in 5d2d4950f2f5
Removing intermediate container 5d2d4950f2f5
 ---> cc8a6412f24d
Step 5/7 : FROM scratch
 ---> 
Step 6/7 : COPY --from=builder /src/sample-app /sample-app
 ---> c086559b444f
Step 7/7 : CMD ["/sample-app"]
 ---> Running in a53b8171b3a0
Removing intermediate container a53b8171b3a0
 ---> 6d6438c79960
Successfully built 6d6438c79960
Successfully tagged sample-app:latest
```

dockerによりコンテナイメージがビルドされていることが確認できます。
以下のコマンドで実際に作成されたイメージを確認することができます。

```shell
docker images | grep sample-app
```
```
sample-app                                latest    6d6438c79960   About a minute ago   6.12MB
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