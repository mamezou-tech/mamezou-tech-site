---
title: 開発環境
description: 快適な開発環境を実現するTips
date: git Last Modified
---

快適な開発環境はプロジェクトの成功に欠かすことができない要素です。

近年は、従来のように重厚な手順書に沿って開発環境を作成するのではなく、あらかじめ用意されたイメージを使ってセットアップする現場も増えています。
さらに、テレワークの普及に伴って、各種IDEのリモート機能や専用のサービスを使って、クラウド環境上に開発環境を構築することも増えていると感じます。

もちろん、開発環境に必要なのはデベロッパー個人の環境だけではありません。
Github等のVCSはもちろんのこと、チャットやポータルサイト等のチーム内外の情報共有ツールがあるとチームの生産性は大きく向上します。

ここでは、そんな開発環境の改善に関する記事をまとめていきます。

## 開発環境を構築する

### ローカル環境

- [Windows への Docker CLI のインストール](/blogs/2021/12/27/install-dockercli-for-windows/)
- [lima 紹介](/blogs/2022/01/21/lima/)
- [Rancher Desktop 紹介](/blogs/2022/01/29/rancher-desktop/)
- [Windows、macOS で sshfs を使用する](/blogs/2022/05/17/sshfs/)
- [macOS 上で Podman を動かす](/blogs/2022/02/23/podman-machine/)
- [OpenLibertyとVSCodeによるコンテナを用いた開発環境の構築](/blogs/2022/05/26/openliberty-devcontainer/)
- [Kubernetesチュートリアル ローカル開発環境準備 - 実行環境(minikube)](/containers/k8s/tutorial/app/minikube/)
- [Kubernetesチュートリアル ローカル開発環境準備 - 自動化ツール(Skaffold)](/containers/k8s/tutorial/app/minikube/)
- [Kubernetesチュートリアル ローカル開発環境準備 - ローカルAWS(LocalStack)](/containers/k8s/tutorial/app/minikube/)

### リモート環境

- [JetBrains Gateway の Gitpod 統合を使って IntelliJ IDEA でリモート開発する](/blogs/2022/05/09/jetbrains-gateway-with-gitpod/)
- [GitHub Codespaces を使いはじめる](/blogs/2022/05/18/start-using-codespaces/)

## VCS(バージョン管理)の機能を活用する

- [GitHub のリリースノート自動生成機能を使う](/blogs/2022/03/11/github-automatically-generated-release-notes/)
- [GitHub issue からブランチ作成する新機能 - issue と PR を自動リンク](/blogs/2022/03/28/github-create-branch-from-issue/)
- [GitHub の Dependabot version updates で依存ライブラリを継続的に更新する](/blogs/2022/06/19/github-enable-dependabot-version-updates/)
- [GitHub Projects の Automated kanban で issue 管理を楽にする](/blogs/2022/07/12/using-github-projects-automated-kanban/)
- [GitHub Projects がリニューアル - スプレッドシートのビューが利用可能に](/blogs/2022/07/28/github_projects_spreadseets_view/)

## チーム内外のコミュニケーションを促進する

- [非公式 Scrapbox アプリを開発している話](/blogs/2021/12/15/developing-unofficial-scrapbox-app/)
- [Scrapbox の社内導入](/blogs/2022/01/05/installing-scrapbox/)
- [sb2md - Scrapbox ページを Markdown に変換する CLI](/blogs/2022/01/11/sb2md/)
- [Backstageで開発者ポータルサイトを構築する - 導入編](/blogs/2022/04/29/backstage-intro/)
- [Backstageで開発者ポータルサイトを構築する - カタログ作成](/blogs/2022/05/05/backstage-catalog/)