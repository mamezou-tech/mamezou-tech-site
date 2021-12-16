---
title: ローカル開発環境準備 - 自動化ツール(Skaffold)
author: noboru-kudo
date: 2021-12-16
prevPage: ./src/posts/k8s-tutorial/app/minikube.md
---

[前回](/containers/k8s/tutorial/app/minikube/)は、minikubeを使ってローカル環境内でコンテナアプリケーションを実行する環境を整えました。

しかし、サンプルアプリのデプロイを通して、ソースコードに加えて、コンテナイメージのビルドやKubernetesマニフェストの反映等、手順が煩雑だと感じられた方も多かったのではないでしょうか？
コンテナ以前のアプリ開発だと、任意のIDEを利用してソースコードを記述し、IDEまたはコマンドからそのままローカル環境で実行・確認していた方が多いと思います。
Kubernetesに載せるためには、追加手順としてコンテナのビルドやマニフェスト反映が必要となり、これを手動でやっていては間違いなく開発効率が悪くなることでしょう。

今回はこれを解決するために、Google社で開発・運用しているKubernetes向けの自動化ツールの[Skaffold](https://skaffold.dev/)を導入し、この面倒な手順を自動化してしまいましょう。
なお、Skaffold自体はローカル環境の自動化だけを目的としてしているツールという訳ではありません。
今回はローカル環境の自動化を目的として利用していますが、CI/CDパイプラインで実行できるようにビルド、テスト、デプロイといった粒度の細かいコマンドも提供されていますので、興味がある方はそちらも試してみると良いかと思います。

## 事前準備

事前にローカル環境のKubernetesを準備しておきましょう。
ここでは、[minikube](https://minikube.sigs.k8s.io/)または[Docker Desktop](https://docs.docker.com/desktop/kubernetes/)を前提とします。

### minikube
minikubeについては[前回](/containers/k8s/tutorial/app/minikube/)を参考にminikubeのインストールとIngressアドオンのセットアップをしてください。

また、未実施の場合は実行するターミナルのDocker CLIがminikubeのDockerで実行されるようにしておきましょう。

```shell
eval $(minikube docker-env)
```

### Docker Desktop
Docker Desktopの場合は、以下を参考にインストールしてください。インストール後は`Preferences->Kubernetes`でKubernetesが有効になっていることを確認してください。
- <https://docs.docker.com/get-docker/>

また、以下を参考にNGINX Ingress ControllerをDocker DesktopのKubernetes内に別途セットアップしてください。
- <https://kubernetes.github.io/ingress-nginx/deploy/#quick-start>

既にセットアップ済みの場合は、kubectlがDocker DesktopのKubernetes(`docker-desktop`コンテキスト)を利用するように設定を切り替えておきましょう。

```shell
kubectl config use-context docker-desktop
```

## Skaffoldセットアップ

利用する環境に応じて以下公式ドキュメントに従って、ローカル環境にSkaffoldインストールしてください。

- <https://skaffold.dev/docs/install/>

インストール後は以下で`skaffold`コマンドが利用できることを確認してください。

```shell
skaffold version
```

今回は現時点で最新バージョンの`v1.35.1`を利用しました。

## Skaffold定義ファイルの作成

まずは、Skaffoldパイプラインが実行するビルドやデプロイステージの定義を作成する必要があります。

これの確認用のアプリケーションとして、前回minikubeで動作確認したGo言語のアプリをそのまま使用します。
未作成の場合は[こちら](/containers/k8s/tutorial/app/minikube/#サンプルアプリのデプロイ)を参考に作成してください。
以下のような構成となっているはずです。

```
.
├── Dockerfile
├── app.yaml
├── ingress.yaml
└── main.go
```

以下のコマンドで定義ファイルのテンプレートを作成しましょう。

```shell
skaffold init --force
```

ディレクトリ直下に、以下の内容で`skaffold.yaml`が作成されます。

```yaml
apiVersion: skaffold/v2beta26
kind: Config
metadata:
  name: sample
build:
  artifacts:
  - image: sample-app
    docker:
      dockerfile: Dockerfile
deploy:
  kubectl:
    manifests:
    - app.yaml
    - ingress.yaml
```

Skaffoldがディレクトリ内のファイルを解析して、ビルドステージ(`build`)にはDocker、デプロイステージ(`deploy`)にはkubectlで初期状態として作成してくれます[^1]。
[^1]: Skaffoldにはビルドとデプロイ以外にもコンテナのテストについてもサポートしています。詳細は[こちら](https://skaffold.dev/docs/pipeline-stages/testers/)を参照してください。

今回はここから修正する必要はありませんので、定義ファイルの作成はこれで完了となります。実運用ではアプリの構成変更に応じて、この定義を修正していくことになります。
また、Skaffoldには特定の環境に応じて振る舞いを変えるプロファイル機能についてもサポートされていますので、環境に応じて定義を変えたい場合は[こちら](https://skaffold.dev/docs/environment/profiles/)を参照してください。

## 動作確認

それではSkaffoldでイメージビルド -> Kubernetesへデプロイを実施してみましょう。
[前回](/containers/k8s/tutorial/app/minikube/#サンプルアプリのデプロイ)minikubeで既にアプリをデプロイ済みの場合は、以下を実行して削除しておきましょう。

```shell
kubectl delete -f ingress.yaml
kubectl delete -f app.yaml
```

あとは、`skaffold.yaml`が配置されたディレクトリで以下のコマンドを打つだけです。

```yaml
skaffold dev
```

前回minikubeで手動で実施していた、イメージビルドやKubernetesマニフェストの反映が、Skaffoldによって実行されていることが分かります(Ingressアドオンのセットアップは除く)。
この状態で別ターミナルから`curl http://sample-app.minikube.local`[^2]を実行すると期待通りの結果(`Hello minikube app!!!`)が返ってくることが確認できるはずです。

[^2]: Docker Desktopで実施する場合は、minikubeのようにIngress DNSがないため、`/etc/hosts`等で`localhost`を`sample-app.minikube.
local`にマッピングを追加してください。
Macの場合は`echo "localhost sample-app.minikube.local" | sudo tee -a /etc/hosts`を実行すれば追加できます。

また、Skaffoldではこの状態でソースコードやマニフェストファイルの変更を監視し、変更を検知すると自動で反映までしてくれます。
試しにアプリが返す固定レスポンスの内容を変更したり、app.yamlでレプリカ数を増やしてみてください。
ファイルの変更が検知されると、Skaffoldのパイプラインが実行され、新しいバージョンのアプリケーションやKubernetes設定をローカルのKubernetes環境に反映してくれることが分かると思います。

`skaffold dev`は便利なコマンドですが、変更の都度ビルドやデプロイが実行されるとローカル環境に負荷がかかりすぎるという場合もあるかと思います。
そのような場合は、ソースコード変更監視を実施しない以下のコマンドを実行します。

```shell
# コンテナログを表示する場合は--tailオプションを追加してください
skkafold run
```

ソースコード変更を反映する場合は、上記コマンドを再度実行すれば新しいアプリケーションがデプロイされます。

## クリーンアップ

`skaffold dev`で起動した場合は、Ctr+Cでプロセスを終了することでアンデプロイされます。
一方で、`skaffold run`で起動した場合は、手動で以下を実行する必要があります。

```shell
skkafold delete
```

また、Skaffoldで変更を監視していると未使用のイメージが溜まりますので、定期的にDockerの不要なリソースは削除しておくとよいでしょう。

```shell
docker image prune -a
docker system prune --force
```

---
参照資料

- Skaffold: <https://skaffold.dev/docs/>
