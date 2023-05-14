---
title: GitHub Actions Runner Controller (ARC) - セルフホストなランナーを Kubernetes でオンデマンド実行する
author: masahiro-kondo
date: 2023-05-14
tags: [GitHub, CI/CD, k8s]
---

先日 GitHub Actions の Runner Controller (ARC) のパブリックベータがアナウンスされました。

[GitHub Actions - Actions Runner Controller Public Beta | GitHub Changelog](https://github.blog/changelog/2023-05-10-github-actions-actions-runner-controller-public-beta/)

## ARC 導入の利点
これまで、GitHub Actions のセルフホストランナーは、ローカルの PC や VM に構築するものでした。そのため、CI/CD ワークフローの実行時に Runner 用のマシンをプロビジョニングしてワークフロー終了時にマシンを破棄するということが難しく、常に起動状態にしておく必要がありました。

:::info
GitHub Actions のセルフホストランナーをローカルマシンで実行する方法については以下の記事を参照してください。

[GitHub Actions のセルフホストランナーを M1 Mac で動かす](/blogs/2022/08/05/setup-github-actions-self-hosted-runner/)
:::

Kubernetes クラスターに ARC をデプロイすると、セルフホストな GitHub Actions Runner (実体は Pod) がオートスケーリングで起動して実行できます。ワークフロー開始時にランナーの Pod が起動されワークフロー終了後に破棄されるため、専用の VM を用意する必要がなく、ランニングコストを下げることが可能です。

ARC のドキュメントは以下にあります。

[Quickstart for Actions Runner Controller - GitHub Docs](https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners-with-actions-runner-controller/quickstart-for-actions-runner-controller)

## ARC のデプロイ
ARC は Azure の マネージド Kubernetes である AKS で使えるとのことです[^1]。

[^1]: 他のパブリッククラウドのマネージド Kubernetes については明記されていませんが使えるのではないかと思います。

今回はローカルの Docker Desktop for Mac + [kind](https://kind.sigs.k8s.io/) の構成で試してみました。

:::info
ローカル実行では Minikube と kind が利用可能とのことです。筆者は Apple Silicon の MacBook を使っているのですが、Intel Mac のように Hyperkit がドライバーとして使用できません。QEMU ドライバーサポートは未だ安定せず docker ドライバー が必要です。Docker Desktop をドライバーとして利用する場合、Minikube よりも、コンテナをノードとして利用することに特化した kind の方がオーバーヘッドが少ないのではないかと思っています。Minikube の QEMU ドライバーについては以下の記事で紹介しています。

[Minikube に QEMU ドライバーサポートが追加 - M1 Mac で利用可能になったけど...](/blogs/2022/06/28/minikube-with-qemu-driver-support/)
:::

ARC の GitHub リポジトリは以下です。コンテナイメージも Package Registry で公開されています。

[GitHub - actions/actions-runner-controller: Kubernetes controller for GitHub Actions self-hosted runners](https://github.com/actions/actions-runner-controller)

ARC は、arc と arc-runner-set の2つの Helm Chart をデプロイすることで利用可能になります。ドキュメントに倣って namespace `arc-systems` に arc をインストールしました。

```shell
helm install arc \
  --namespace arc-systems \
  --create-namespace \
  oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set-controller
```

これで、ARC の実行に必要な CRD (Custom Resource Definition) と Controller がデプロイされます。

```shell
$ kubectl get po -n arc-systems
NAME                                                   READY   STATUS    RESTARTS   AGE
arc-gha-runner-scale-set-controller-755f574df6-5hx9z   1/1     Running   0          25s
```

ARC で Runner の Pod を実行して、リポジトリ用の Runner として登録するには PAT (Personal Access Token) の作成が必要になります。PAT の scope としては、`repo` と `workflow` を指定しておけばよさそうです。

ARC の Runner を使いたい GitHub リポジトリと PAT を指定して、arc-runner-set の Helm chart をインストールします。以下の例では、`GITHUB_CONFIG_URL` でリポジトリの URL を `GITHUB_PAT` に PAT を環境変数として指定しています。arc とは別の runners 用の namespace (ここでは `arc-runners`) にインストールするのがよさそうです。

```shell
GITHUB_CONFIG_URL="https://github.com/<your_account/repo>"
GITHUB_PAT="<PAT>"
helm install arc-runner-set \
    --namespace arc-runners \
    --create-namespace \
    --set githubConfigUrl="${GITHUB_CONFIG_URL}" \
    --set githubConfigSecret.github_token="${GITHUB_PAT}" \
    oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set
```

インストールすると、ターゲットのリポジトリに Runner が `arc-runner-set` ラベルでオンライン状態になります。

![GitHub Runners](https://i.gyazo.com/b5028dac829a18b4e500fd5a3f4cd798.png)

この時点で、namespace `arc-runners` 配下には Pod は作成されていません。

```shell
$ kubectl get pods -n arc-runners
No resources found in arc-runners namespace.
```

## ARC のランナーでワークフローを動かす

それでは、ARC のランナーを指定してワークフローを実行してみます。ドキュメント通り以下のようなワークフローファイルをリポジトリの `.github/workflows` 配下に作成しました。`runs-on` で `arc-runner-set` ラベルを指定しています。

- arc-demo.yml
```yaml
name: Actions Runner Controller Demo
on:
  workflow_dispatch:

jobs:
  Explore-GitHub-Actions:
    # You need to use the INSTALLATION_NAME from the previous step
    runs-on: arc-runner-set
    steps:
    - run: echo "🎉 This job uses runner scale set runners!"
```

このワークフローを手動実行。ARC の Runner が作成されてジョブが実行されました。

![workflow log](https://i.gyazo.com/1aac5db8d2f05070efa5be575a72d80c.png)

ワークフローが実行されている間に arc-runner-set をインストールした namespace `arc-runners` で Pod 一覧を watch しました。

```shell
kubectl get pods -n arc-runners -w
```

```
NAME                                READY   STATUS    RESTARTS   AGE
arc-runner-set-t9flz-runner-9q6k5   0/1     Pending   0          0s
arc-runner-set-t9flz-runner-9q6k5   0/1     Pending   0          0s
arc-runner-set-t9flz-runner-9q6k5   0/1     ContainerCreating   0          0s
arc-runner-set-t9flz-runner-9q6k5   1/1     Running             0          1s
arc-runner-set-t9flz-runner-9q6k5   0/1     Completed           0          27s
arc-runner-set-t9flz-runner-9q6k5   0/1     Terminating         0          27s
arc-runner-set-t9flz-runner-9q6k5   1/1     Terminating         1 (1s ago)   28s
arc-runner-set-t9flz-runner-9q6k5   0/1     Terminating         1 (2s ago)   29s
arc-runner-set-t9flz-runner-9q6k5   0/1     Terminating         1 (2s ago)   29s
arc-runner-set-t9flz-runner-9q6k5   0/1     Terminating         1 (2s ago)   29s
```

ワークフローの起動に応じて、runner-set の Pod が作成されて、`Running` になり、ワークフローの終了とともに、`Terminating` になり破棄されました。

namespace `arc-systems` にデプロイされた Listener の Pod のログを見てみると、ワークフローの実行に応じて、Runner の起動がリクエストされて、Runner が起動されジョブにアサインされる様子を追うことができました。

```shell
kubectl logs arc-runner-set-754b578d-listener -n arc-systems
```

```
2023-05-14T11:01:19Z	INFO	refreshing token	{"githubConfigUrl": "https://github.com/kondoumh/iac-dev"}
2023-05-14T11:01:19Z	INFO	getting runner registration token	{"registrationTokenURL": "https://api.github.com/repos/kondoumh/iac-dev/actions/runners/registration-token"}
2023-05-14T11:01:19Z	INFO	getting Actions tenant URL and JWT	{"registrationURL": "https://api.github.com/actions/runner-registration"}
2023-05-14T11:01:21Z	INFO	auto_scaler	current runner scale set statistics.	{"statistics": "{\"totalAvailableJobs\":0,\"totalAcquiredJobs\":0,\"totalAssignedJobs\":0,\"totalRunningJobs\":0,\"totalRegisteredRunners\":0,\"totalBusyRunners\":0,\"totalIdleRunners\":0}"}
2023-05-14T11:01:21Z	INFO	service	waiting for message...
2023-05-14T11:23:28Z	INFO	service	process message.	{"messageId": 1, "messageType": "RunnerScaleSetJobMessages"}
2023-05-14T11:23:28Z	INFO	service	current runner scale set statistics.	{"available jobs": 1, "acquired jobs": 0, "assigned jobs": 0, "running jobs": 0, "registered runners": 0, "busy runners": 0, "idle runners": 0}
2023-05-14T11:23:28Z	INFO	service	process batched runner scale set job messages.	{"messageId": 1, "batchSize": 1}

# 中略

2023-05-14T11:24:49Z	INFO	service	job completed message received.	{"RequestId": 174, "Result": "succeeded", "RunnerId": 23, "RunnerName": "arc-runner-set-t9flz-runner-nz4z8"}
2023-05-14T11:24:49Z	INFO	auto_scaler	acquiring jobs.	{"request count": 0, "requestIds": "[]"}
2023-05-14T11:24:49Z	INFO	service	try scale runner request up/down base on assigned job count	{"assigned job": 0, "decision": 0, "min": 0, "max": 2147483647, "currentRunnerCount": 1}
2023-05-14T11:24:49Z	INFO	KubernetesManager	Created merge patch json for EphemeralRunnerSet update	{"json": "{\"spec\":{\"replicas\":null}}"}
2023-05-14T11:24:49Z	INFO	KubernetesManager	Ephemeral runner set scaled.	{"namespace": "arc-runners", "name": "arc-runner-set-t9flz", "replicas": 0}
2023-05-14T11:24:50Z	INFO	auto_scaler	deleted message.	{"messageId": 4}
2023-05-14T11:24:50Z	INFO	service	waiting for message...
```

サンプルのワークフローは、メッセージをエコーするだけの簡単なものでしたので、もう少し現実的なワークフローを動かしてみます。以下のワークフローでは次のステップでジョブを実行しています。

- Electron アプリのソースコードをチェックアウト
- Node.js 環境を setup
- npm install を実行
- electron-builder バイナリーをビルド
- ビルドしたバイナリーを成果物としてアップロード

```yaml
name: Build electron app Linux installer with Actions Runner Controller

on:
  workflow_dispatch:

jobs:
  build:

    runs-on: arc-runner-set

    steps:
    - uses: actions/checkout@v3
      with:
        repository: 'mamezou-tech/electron-example-browserview'
        path: electron-example-browserview      
    - name: Setup nodejs
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    - name: Install dependencies
      run: |
        cd electron-example-browserview
        npm install
    - name: Package
      run: |
        cd electron-example-browserview
        npx electron-builder --dir
      env:
        GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    - name: Upload artifact
      uses: actions/upload-artifact@v3
      with:
        name: electron-example-browserview
        path: electron-example-browserview/dist/**
```

`runs-on` には `arc-runner-set` を指定しています。このワークフローを実行すると、無事にビルドが完了して、成果物が Summary ページにアップロードされました。

![build electron app](https://i.gyazo.com/2e4929fa9d6bc49d98685239e1483cdc.png)

:::info
このワークフローでビルドしているのは、以下の記事で作成した Electron アプリです。

[Electron - WebView から BrowserView に移行する](/blogs/2022/01/07/electron-browserview/)
:::

## 最後に
以上、パブリックベータになった GitHub Actions Runner Controller の紹介でした。ワークフローの実行時にセルフホストランナーをオンデマンドでプロビジョニングして終了時に破棄でき、オートスケーリングも可能なことから、CI/CD 用のランナーの VM を常時起動させる必要がなくなり、ランニングコストの削減が期待できます。

VM に構築したセルフホストランナーはイミュータブルではなくクリーンアップが課題でしたが、Pod で起動するランナーはその課題も解決されています。

セルフホストランナーを多用しているプロジェクトでは正式公開が待ち遠しい機能ではないかと思います。
