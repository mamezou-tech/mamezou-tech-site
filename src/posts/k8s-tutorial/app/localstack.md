---
title: ローカル開発環境準備 - ローカルAWS(LocalStack)
author: noboru-kudo
date: 2021-12-19
prevPage: ./src/posts/k8s-tutorial/app/skaffold.md
---

これまでローカルでKubernetesを実行する環境として[minikube](https://minikube.sigs.k8s.io/)、開発からデプロイまでを自動化するツールとして[Skaffold](https://skaffold.dev/)を導入し、いよいよ開発が始められる状況が整ってきました。

最後にアプリケーションが外部プロダクトに依存する場合を考えてみましょう。
一般的にアプリケーションはそれのみで完結することはほとんどなく、DBやキャッシュ等他のプロダクトを利用することが大半です。

ここでは開発対象のアプリケーションがS3やDynamoDB等のAWSのサービスを使うことを想定してみましょう。
開発者が少ない場合は、ローカル環境から直接AWSのサービスを使うことも可能ですが、数十名以上の規模になってくるとAWS利用料が重くのしかかってきます。
回避案としてローカル環境はモック/スタブを使うということが考えられますが、これはバグ発見の先送りに過ぎず効率的な解決策とは言えません。

やはりAWSのサービスについてもローカル環境で動かして確認することが品質面で理想的です。
今回は(程度はありますが)主要なサービス[^1]に対応している[LocalStack](https://localstack.cloud/)のCommunity Edition[^2]を導入してローカル環境でAWSを利用したアプリケーションの開発をする準備をしましょう。
[^1]: LocalStackで対応しているサービスは[こちら](https://docs.localstack.cloud/aws/feature-coverage/)を参照してください。
LocalStackの実行はコンテナが前提となっています。既にminikube(Docker Desktopでも構いません)でローカル環境でKubernetesが動くようになっていますので、ここに入れてしまうのが効率的です。
[^2]: Pro Edition/Enterprise Editionを使用すると利用できるサービスの範囲も広がります。プロジェクトの必要に応じてこちらを検討するのも良いかと思います。

## 事前準備

未作成の場合はローカル環境のKubernetesを準備しておきましょう。
実施内容は[前回](/containers/k8s/tutorial/app/skaffold/#事前準備)と同様です。

また、LocalStackのインストールには[helm](https://helm.sh/)を利用します。
未セットアップの場合は[こちら](https://helm.sh/docs/intro/install/) を参考にv3以降のバージョンをセットアップしてください。

## LocalStackインストール

LocalStackにはHelmチャートが用意されていますので、迷わずこちらを使いましょう。
- <https://github.com/localstack/helm-charts>

まずはHelmのリポジトリを追加します。

```shell
helm repo add localstack-charts https://localstack.github.io/helm-charts
helm update
```
