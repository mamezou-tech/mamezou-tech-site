---
title: 分散トレーシング(OpenTelemetry / Jaeger)
author: noboru-kudo
tags: [aws]
prevPage: ./src/posts/k8s-tutorial/ops/cloudwatch.md
date: 2022-04-20
---

今回はアプリケーションのパフォーマンスに焦点を当てます。
アプリケーションのパフォーマンスを分析するにはどのようにすれば良いでしょうか？
従来はレスポンス時間等をログに残し、これを抽出、集計することも多かったと思います。
単一サービスで構成されるシステムではこれで事足りることが多いですが、多数のサービスで構成されるマイクロサービスとなるとそうはいきません。
また、1つのリクエストが複数サービスを経由することになると、どのサービスでどれくらいのパフォーマンスが出ているかを可視化することが重要となります。



[[TOC]]

## 事前準備

アプリケーションは以下で実装したものを使います。事前にEKS環境を準備し、アプリケーションのセットアップしておきましょう。

- [クラスタ環境デプロイ - コンテナレジストリ(ECR)](/containers/k8s/tutorial/app/container-registry/)
- [クラスタ環境デプロイ - EKSクラスタ(AWS環境準備)](/containers/k8s/tutorial/app/eks-1/)
- [クラスタ環境デプロイ - EKSクラスタ(Kustomize導入)](/containers/k8s/tutorial/app/eks-2/)
- [クラスタ環境デプロイ - EKSクラスタ(デプロイ)](/containers/k8s/tutorial/app/eks-3/)

## XXXX

## クリーンアップ

HelmでインストールしたJaegerは以下で削除します。

```shell
helm uninstall xxxx 
```

それ以外のリリース削除については、以下を参照してください。

- [クラスタ環境デプロイ - EKSクラスタ(デプロイ)](/containers/k8s/tutorial/app/eks-3/#クリーンアップ)

## まとめ

---
参照資料

- [Jaegerドキュメント](https://www.jaegertracing.io/docs/)