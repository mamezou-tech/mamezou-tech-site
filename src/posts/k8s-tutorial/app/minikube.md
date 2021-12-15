---
title: ローカル開発環境準備 - 実行環境(minikube)
author: noboru-kudo
date: 2021-12-19
prevPage: ./src/posts/k8s-tutorial/storage/efs.md
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

また、今回はDocker Desktopは使用しませんが、コンテナのビルド・ランタイムエンジンとしてDockerを使用しますので、Docker CLIは別途インストールしてください[^3]。

[^3]: 未検証ですが、Docker CLIと互換性がある[Podman](https://podman.io/)はminikubeにも対応しています(この場合はランタイムエンジンはcri-oを選択)。

```shell
brew install docker
```

Windowsの場合は、Docker DesktopではなくDocker CLI単体でインストールできませんので、WSLでの利用を検討してください。

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

minikubeが実行されている様子が分かります。minikubeの実行状況は以下のコマンドで確認できます。

```shell
minikube status
```
```
minikube
type: Control Plane
host: Running
kubelet: Running
apiserver: Running
kubeconfig: Configured
```

`minikube start`実行時には、kubectlの認証情報(kubeconfig)も自動で設定されます(`minikube`)ので、このまますぐに使い始めることができます。

```shell
kubectl cluster-info
```
```
Kubernetes control plane is running at https://192.168.64.2:8443
CoreDNS is running at https://192.168.64.2:8443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy
```

## サンプルアプリのデプロイ

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
EXPOSE 8000
CMD ["/sample-app"]
```

前半部分でGo言語のコンテナ(`golang:1.16`)でソースファイルをビルドして実行可能ファイル(`sample-app`)を作成し、後半部分でランタイム環境(`scratch`)にビルドした実行可能ファイルを配置しています。
このままビルドしてもローカル環境のdockerにイメージ作成されるだけで、そのままminikubeにデプロイすることはできません。
minikubeの仮想環境でビルドしてコンテナイメージを配置するには以下のコマンドを実行します。

```shell
eval $(minikube docker-env)
```

これでdockerコマンドがminikubeの仮想環境で実行されるようになります。
なお、この設定はターミナルごとになりますので別ターミナルで実行する場合は都度実行してください。

それではコンテナイメージを作成しましょう。ソースコードとDockerfileが配置されているディレクトリで以下を実行します。

```shell
docker build -t sample-app .
```
```
Sending build context to Docker daemon  4.608kB
Step 1/8 : FROM golang:1.16 as builder
 ---> 9a2e805e6c23
Step 2/8 : WORKDIR /src
 ---> Running in 9ce0ac31d9e4
Removing intermediate container 9ce0ac31d9e4
 ---> 914f510587dd
Step 3/8 : COPY main.go /src
 ---> d093dbb49063
Step 4/8 : RUN CGO_ENABLED=0 GOOS=linux go build -o sample-app main.go
 ---> Running in 8389a9a71749
Removing intermediate container 8389a9a71749
 ---> 879b8a48fefe
Step 5/8 : FROM scratch
 ---> 
Step 6/8 : COPY --from=builder /src/sample-app /sample-app
 ---> 393ff1a44f9c
Step 7/8 : EXPOSE 8000
 ---> Running in 6e7dcd74429b
Removing intermediate container 6e7dcd74429b
 ---> 6edfaed02a17
Step 8/8 : CMD ["/sample-app"]
 ---> Running in 74068b0d42e0
Removing intermediate container 74068b0d42e0
 ---> 4405853be83d
Successfully built 4405853be83d
Successfully tagged sample-app:latest
```

dockerによりコンテナイメージがビルドされていることが確認できます。
以下のコマンドでdockerに登録されているイメージを確認することができます。

```shell
docker images | grep sample-app
```
```
sample-app                                latest    6d6438c79960   About a minute ago   6.12MB
```

sample-appという名前でイメージが作成されています。バージョンには省略時のデフォルト値である`latest`となっていることも確認できます。

では、ここでビルドしたイメージをminikubeにデプロイしましょう。
まずはk8sのDeployment/Serviceリソースのマニフェストファイルを準備します。ここでは`app.yaml`として作成しました。

```yaml
apiVersion: v1
kind: Service
metadata:
  name: sample-app
spec:
  selector:
    app: sample-app
  ports:
    - port: 80
      targetPort: http
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sample-app
spec:
  selector:
    matchLabels:
      app: sample-app
  template:
    metadata:
      labels:
        app: sample-app
    spec:
      containers:
        - name: sample-app
          # ビルドしたコンテナイメージ
          image: sample-app:latest
          imagePullPolicy: Never
          ports:
            - name: http
              containerPort: 8000
```

先程ビルドしたアプリを配置するDeploymentとアクセス経路を定義するServiceを定義しています。
公開イメージを利用していた以前とは異なり、Deploymentの`containers`フィールドの`image`に、先程ビルドした際に指定したイメージとバージョン(`sample-app:latest`)を指定しています。
また、`imagePullPolicy`には`Never`を指定しています。これは今回はコンテナレジストリではなく、minikubeでビルドしたイメージを使うためです。
もちろん実際の運用環境で使う場合はこのような設定ではなく、キャッシュ済みでない場合はコンテナレジストリからpullする`IfNotPresent`を指定します。

さて、これをminikubeに投入しましょう。使用するコマンドは通常のクラスタ環境と同様です。

```shell
kubectl apply -f app.yaml
```

実行後はPodの状態を確認しましょう。

```shell
kubectl get pod
```

```
# 一部省略
NAME                             READY   STATUS    RESTARTS   AGE
pod/sample-app-69678c555-fbfs4   1/1     Running   0          10m

NAME                 TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)   AGE
service/sample-app   ClusterIP   10.98.148.105   <none>        80/TCP    12m
```

アプリがデプロイされ、80番ポートで公開されていることが分かります。

## Ingressアドオン有効化

このアプリをIngressでホストOS側からテストしましょう。minikubeは仮想環境上で起動していますので、そのまま`localhost`で利用することはできません[^4]。 
[^4]: Docker Desktopを利用している場合は、任意のIngress Controllerを導入することで`localhost`でKubernetesクラスタにアクセス可能です。

minikubeは仮想環境のIPアドレスはターミナルから`minikube ip`を利用することで取得することができます。
したがって、Serviceリソースを[NodePort](https://kubernetes.io/docs/concepts/services-networking/service/#type-nodeport)にすれば、仮想環境のIPアドレス経由でアクセス可能ではありますが、Ingress経由でアクセスすることが実態に近く理想的です。
Ingress経由とする場合、ホスト名とIPアドレスのマッピングを解決するためのDNSが必要となりますが、ローカル環境の場合は`/etc/hosts`等で都度設定が必要です（もしくはリクエストのHostヘッダを修正）。
minikubeでは、これを容易に実現するためのDNSアドオンが用意されていますので、これを導入しましょう。

まず、ターミナルから`minikube addons`コマンドで以下を実行し、Ingress ControllerとDNSを有効にします。

```shell
# NGINX Ingress Controller
minikube addons enable ingress
# minikube DNS
minikube addons enable ingress-dns
```

上記を有効にするとminikube内にNGINX Ingress ControllerとIngress用のDNSがインストールされます。
Ingress Controllerは以下で確認できます。

```shell
kubectl get pod -n ingress-nginx
```
```
NAME                                        READY   STATUS      RESTARTS   AGE
ingress-nginx-admission-create--1-wjqrk     0/1     Completed   0          20h
ingress-nginx-admission-patch--1-7r44l      0/1     Completed   0          20h
ingress-nginx-controller-5f66978484-hzjvk   1/1     Running     0          20h
```

Ingress DNSは以下で確認できます。

```shell
kubectl get pod -n kube-system -l app=minikube-ingress-dns
```
```
NAME                        READY   STATUS    RESTARTS   AGE
kube-ingress-dns-minikube   1/1     Running   0          20h
```

これはminikube内に入ってきたリクエストをIngressに振り向けるためのDNSです。

次にホストOS側のDNSを設定します。以下はMacの場合の設定になります。
Mac以外の場合は[こちら](https://minikube.sigs.k8s.io/docs/handbook/addons/ingress-dns/#installation)を参考にホストOS側のDNS設定をしてください。

```shell
sudo mkdir /etc/resolver
cat << EOF | sudo tee /etc/resolver/minikube-test
domain local-k8s.dev
nameserver $(minikube ip)
search_order 1
timeout 5
EOF
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