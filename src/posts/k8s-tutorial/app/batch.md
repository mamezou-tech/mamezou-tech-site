---
title: Kubernetesマニフェスト作成 - バッチアプリケーション
author: noboru-kudo
date: 2022-01-30
prevPage: ./src/posts/k8s-tutorial/app/web-app.md
---

[前回](/containers/k8s/tutorial/app/web-app/)は、ローカル環境のKubernetesでタスク管理ツールのWebアプリケーションを動かすことができました。

今回は日次でタスク完了レポートを出力するバッチアプリケーションを作成してみましょう。
Kubernetesは、セルフヒーリングや負荷分散等、持続的(long-running)なアプリケーションの実行基盤のイメージが強く、Webアプリケーション用のものと想像する方も多いかと思いますが、ワンショットのジョブにも対応することができます。

今回作成するレポート出力機能は以下の構成になります。

![](https://i.gyazo.com/33e539dccf8bb554919cb2ddc034f0b9.png)

WebアプリケーションでDynamoDBに蓄積したタスク情報から、前日完了したタスクをレポート(CSVファイル)として作成し、S3に保管するものです。

それでは早速開始しましょう。

[[TOC]]

## 事前準備

Webアプリケーションが構築されていることが前提となります。
未構築の場合は[前回](/containers/k8s/tutorial/app/web-app/)を参考に、ローカル環境をセットアップしてください。

## 利用するKubernetesリソース

今回はCronJobリソース(オブジェクト)を使用してジョブをセットアップします。
CronJobリソースはJobリソースを指定時間に実行するものですので、まずはJobを抑えておきましょう。

### Job
ワンショットなアプリケーションの実行し、そのステータスを管理します。
ワンショットなアプリケーション自体はPodを作成するだけでも実行可能ですが、異常終了した場合の考慮や並列実行をするとなると、Pod作成以外にも多くの考慮が必要になります。
Jobを利用すると、管理対象のアプリケーションの状態を管理し、リトライや並列実行(複数レプリカ)を実施することができます。

Deploymentと違い、JobはPodが正常に終了した場合(exit code=0)は、再起動等は行いません。

<https://kubernetes.io/docs/concepts/workloads/controllers/job/>

### CronJob

<https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/>

## 環境セットアップ

## マニフェストファイル作成

## アプリケーションのデプロイ
skaffold??これは違うよね？

## 動作確認

## まとめ

## クリーンアップ