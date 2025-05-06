---
title: 開発環境
description: 快適な開発環境を実現するTips
date: git Last Modified
icon: https://api.iconify.design/material-symbols/laptop-mac-outline.svg?color=%23730099&height=28
enTitle: Development Environment
---

快適な開発環境はプロジェクトの成功に欠かせない要素です。

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
- [Podman Desktopがv1.0になったのでwindows版を試してみたところ、気付いたらv1.1に上がるくらいに機能豊富だった話](/blogs/2023/06/09/podman-desktop-win/)
- [WSL2上にUbuntu-22.04LTSを導入し、Dockerをインストールしようとしたら、いろいろとハマった件](/blogs/2023/09/09/docker_ubuntu_on_wsl2/)
- [OrbStack - macOS 専用の高速軽量なコンテナ & Linux VM 環境](/blogs/2023/06/21/orbstack/)
- [OrbStack 1.0 付属の Kubernetes を試す](/blogs/2023/09/25/orbstack-with-k8s/)
- [WindowsでRust開発環境を作ってみる(VSCode＋BuildTools＋rustup)](/blogs/2023/02/12/using-rust-01/)
- [VSCodeのESP-IDF拡張機能「Espressif IDF」を使ってみる](/blogs/2023/02/19/esp-idf-vsc-extension/)
- [ESP32開発ボードをESP-PROGとPlatform IOを使ってデバッグする](/blogs/2024/01/03/esp32-debug-by-esp-prog/)
- [Raspberry Pi PicoをRaspberry Pi デバッグプローブとPlatform IOを使ってデバッグする](/blogs/2024/01/07/raspberry-pi-pico-debug-by-debug-probe/)
- [STM32マイコンボード（STM32F103C8T6）をST-Link V2互換品とPlatform IOを使ってデバッグする](/blogs/2024/01/29/stm32-debug-by-st-link/)
- [2024年版！VS Code で Java 開発環境を構築する](/blogs/2024/07/18/write-java-with-vscode-2024/)
- [VSCode & PlatformIOで始める！WSL×組み込み開発環境構築の完全ガイド](/blogs/2025/04/10/develop-on-vscode-platformio-and-wsl/)
- [ESP-IDFプロジェクトの構成とCMakeの仕組みを徹底解説！（VSCode＋ESP-IDF拡張機能）](/blogs/2025/05/03/esp-idf-vsc-extension-2/)
- [IDF Component ManagerとKconfig設定でハマった話（VSCode＋ESP-IDF拡張機能）](/blogs/2025/05/06/esp-idf-vsc-extension-3/)

### リモート環境

- [JetBrains Gateway の Gitpod 統合を使って IntelliJ IDEA でリモート開発する](/blogs/2022/05/09/jetbrains-gateway-with-gitpod/)
- [GitHub Codespaces を使いはじめる](/blogs/2022/05/18/start-using-codespaces/)
- [GitHub Codespaces の Prebuilding で開発環境をカスタマイズして共有する](/blogs/2022/07/30/prebuilding-github-codespaces/)
- [全ユーザーに公開された GitHub Codespaces で Codespace Templates を使ってみる](/blogs/2022/11/11/github-codespce-templates/)
- [GitHub CodespacesによるJavaのチーム開発環境の作り方](/blogs/2023/06/26/codespaces-for-java/)
- [みんな大好きVSCodeと組み込みソフトウェア開発環境PlatformIOでリモート開発をしてみる（Arduino編）](/blogs/2025/04/08/remote-develop-on-platformio/)

## VCS(バージョン管理)の機能を活用する

- [GitHub のリリースノート自動生成機能を使う](/blogs/2022/03/11/github-automatically-generated-release-notes/)
- [GitHub issue からブランチ作成する新機能 - issue と PR を自動リンク](/blogs/2022/03/28/github-create-branch-from-issue/)
- [GitHub の Dependabot version updates で依存ライブラリを継続的に更新する](/blogs/2022/06/19/github-enable-dependabot-version-updates/)
- [GitHub Projects の Automated kanban で issue 管理を楽にする](/blogs/2022/07/12/using-github-projects-automated-kanban/)
- [GitHub Projects がリニューアル - スプレッドシートのビューが利用可能に](/blogs/2022/07/28/github_projects_spreadseets_view/)
- [GitHub の外部サービス自動リンク参照で英数字の識別子が利用可能に](/blogs/2022/09/02/github-autolinks-with-alphanumeric/)
- [GitHub Projects に Roadmaps が登場 - issue や PR をタイムラインで管理しよう](/blogs/2023/03/28/github-projects-new-roadmaps-layout/)

## チーム内外のコミュニケーションを促進する

- [非公式 Scrapbox アプリを開発している話](/blogs/2021/12/15/developing-unofficial-scrapbox-app/)
- [Scrapbox の社内導入](/blogs/2022/01/05/installing-scrapbox/)
- [sb2md - Scrapbox ページを Markdown に変換する CLI](/blogs/2022/01/11/sb2md/)
- [Backstageで開発者ポータルサイトを構築する - 導入編](/blogs/2022/04/29/backstage-intro/)
- [Backstageで開発者ポータルサイトを構築する - カタログ作成](/blogs/2022/05/05/backstage-catalog/)
- [ScrapboxでMermaid記法を可視化するUserScriptを作った話](/blogs/2023/08/08/mermaid-in-scrapbox/)
