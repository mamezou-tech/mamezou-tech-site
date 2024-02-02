---
title: GitHub Actions Runner Controller (ARC) をk3sにインストール 
author: shigeki-shoji
date: 2024-02-02
tags: [k3s, iot, scala]
image: true
---

こんにちは、[庄司](https://github.com/edward-mamezou)です。

[k3s](https://docs.k3s.io/installation/requirements) は現在 x86_64、armhf、arm64/aarch64 と s390x アーキテクチャをサポートしています。また、[GitHub Actions Runner Controller](https://github.com/actions/runner/pkgs/container/actions-runner) (ARC) の runner イメージは linux/amd64 (つまり x86_64) と linux/arm64 (つまり arm64/aarch64) をサポートしています。

したがって x86_64 または arm64/aarch64 の k3s 環境であれば ARC の実行が可能です。

GitHub Actions Runner Controller については別の記事「[GitHub Actions Runner Controller (ARC) - セルフホストなランナーを Kubernetes でオンデマンド実行する](/blogs/2023/05/14/github-actions-runner-controller/)」も参照してください。

:::info
Self-Hosted Runner ではなく、なぜ ARC なのかを説明しておく必要があるでしょう。IoT の世界にもコンテナ化したいというニーズは確実に存在しています。そして、IoT の世界ではコンピューティングリソースだけでなく、さまざまな外部デバイスを扱う場合が多くあります。例えばカメラや GPU というようにです。これらの外部デバイスを使用するアプリケーションが Kubernetes 環境で動作するかを検証する必要があります。そのため、単純な Self-Hosted Runner ではなく、実際に使用する k3s 環境の利用にこだわりました。
:::

## ARC のデプロイ

ARC のデプロイは helm を使用します。これは紹介した記事で説明されている手順とほとんど違いはありません。

唯一の違いは helm コマンドを実行する前に環境変数 `KUBECONFIG` を設定しておくことです。

```text
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
```

ARC をインストールします。

```shell
helm install arc \
  --namespace arc-systems \
  --create-namespace \
  oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set-controller
```

次に、`actions-runner` をインストールします。インストールには、紹介した近藤氏の記事にある通り GitHub の Personal Access Token (PAT) が必要です。

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

## 独自の `actions-runner` イメージを使用する

GitHub で提供されている `actions-runner` イメージは基本的なバイナリだけを含むものとなっています。大抵は通常の GitHub Actions のワークフローの定義のまま動作すると考えています。しかし、筆者は `sbt` コマンドの実行を含むワークフローを実行しようとしてエラーになりました。少し調べると、GitHub 管理の Ubuntu と `actions-runner` イメージの `/usr/bin` ディレクトリ内のファイル数が大きく異なっていることに気づきました。そこで、GitHub 管理の Ubuntu イメージに倣って独自の `actions-runner` イメージを作成することにしました。

Dockerfile は次の通りです。

```dokerfile
FROM ghcr.io/actions/actions-runner:2.312.0

USER root

RUN apt update && apt install -y curl && \
    curl -fLo /tmp/sbt.tgz https://github.com/sbt/sbt/releases/download/v1.9.8/sbt-1.9.8.tgz && \
    tar zxf /tmp/sbt.tgz -C /usr/share && ln -s /usr/share/sbt/bin/sbt /usr/bin/sbt && rm -f /tmp/sbt.tgz

WORKDIR /home/runner
USER runner
```

この Dockerfile を GitHub Actions を使ってビルドし [GitHub Packages](https://github.com/orgs/takesection-sandbox/packages?repo_name=self-hosted-action) にプッシュしました。

独自のコンテナイメージを使う `actions-runner` は次の実行でインストールできます。

```shell
export GITHUB_CONFIG_URL="https://github.com/<your_account/repo>"
export GITHUB_PAT="<PAT>"
helm install self-hosted \
    --namespace arc-runners \
    --create-namespace \
    --set githubConfigUrl="${GITHUB_CONFIG_URL}" \
    --set githubConfigSecret.github_token="${GITHUB_PAT}" \
    --set template.spec.containers[0].name="runner" \
    --set template.spec.containers[0].image="ghcr.io/takesection-sandbox/actions-runner:latest" \
    --set template.spec.containers[0].command[0]="/home/runner/run.sh" \
    oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set
```

## おわりに

IoT の開発では特別な周辺機器を利用する場合もあると考えています。このような場合、GitHub Actions が標準で提供しているようなクラウド環境ではなく、よりプロダクション環境に近いところで継続的インテグレーション (CI) したいこともあるでしょう。Kubernetes には外部デバイスを扱うための [Device Plugins](https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/) があります。USB デバイスを扱うこともできます。このような環境で独自の `actions-runner` を用いた ARC が役立つと考えています。

## 参考記事

- [GitHub Actions Runner Controller (ARC) - セルフホストなランナーを Kubernetes でオンデマンド実行する](/blogs/2023/05/14/github-actions-runner-controller/)
