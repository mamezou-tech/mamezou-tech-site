---
title: "CI/CD"
description: CI/CDツールの紹介や使い方に関するチュートリアルやTips
---

ここでは、様々なツールに焦点を当てた記事やチュートリアルをご紹介します。

CI/CDパイプラインは、現代のソフトウェア開発に必要不可欠なものです。
その背景には、マイクロサービス時代の到来があります。
目まぐるしく変わるビジネス要求に対して、短いリードタイムで確実にサービスを提供し続ける必要があります。
このような状況では、ビルドやデプロイを手動で実施していくのは非効率で、すぐに破綻します。専用ツールのパイプラインで自動化されたプロセスが欠かせません。

![cicd pipeline](https://i.gyazo.com/e1f7840066777e0bee3c1b8f0ba08504.png)

幅広いCI/CDツールを充実させていく予定ですので、ご参考いただければ幸いです。

[[TOC]]

## GitHub Actions
[GitHub Actions](https://github.com/features/actions)は[GitHub](https://github.com/)が提供するCI/CDサービスです。
今やGitHubでホスティングされているプロジェクトでは、かなりの割合で利用されているのではないでしょうか？
制限はありますが、無料で使い始められるところも大きな魅力ですね。
各種ユースケースに対応したカスタムActionも幅広く公開されており、ほとんどのプロジェクトはこれ1つでカバーできると言っても過言ではないでしょう。
今後ますますの拡がりが期待できます。

- [GitHub Actions ワークフローにおけるジョブ制御](/blogs/2022/02/20/job-control-in-github-actions/)
- [GitHub Actions - 再利用可能ワークフローを使う](/blogs/2022/03/08/github-actions-reuse-workflows/)
- [GitHub のリリースノート自動生成機能を使う](/blogs/2022/03/11/github-automatically-generated-release-notes/)
- [GitHub Actions ワークフローで個別ジョブのリランが可能に](/blogs/2022/04/14/github-actions-workflow-rerun-individual-jobs/)
- [GitHub Actions ジョブサマリー機能を使う](/blogs/2022/05/14/github-actions-job-summaries/)
- [GitHub Actions - 再利用可能ワークフローと手動トリガーで入力値の扱いを統一](/blogs/2022/06/11/github-actions-inputs-unified/)
- [GitHub Actions のセルフホストランナーを M1 Mac で動かす](/blogs/2022/08/05/setup-github-actions-self-hosted-runner/)
- [ソフトウェアサプライチェーンセキュリティのための GitHub Actions ワークフロー](/blogs/2022/08/17/github-actions-workflows-for-software-supply-chain-security/)

豆蔵有志でも、特定ユースケースに対応したActionをOSSとして公開しています。

- [buildpacks-action](/oss-intro/buildpacks-action/)
- [monorepo-update-checker](/oss-intro/monorepo-update-checker/)
- [setup-helmfile](/oss-intro/setup-helmfile/)

## Flux
[Flux](https://fluxcd.io/)は、今では様々な領域で普及しているGitOpsのプラクティスを提唱した[Weaveworks](https://www.weave.works/)社が開発した継続的デリバリツールです。
CIとしての機能はありませんが、KubernetesでGitOpsを実践するなら是非抑えておきたいツールです。

- [Kubernetesチュートリアル - 継続的デリバリ - Flux](/containers/k8s/tutorial/delivery/flux/)

## ArgoCD
[ArgoCD](https://argoproj.github.io/cd/)はFluxと並んでGitOpsを体現する継続的デリバリツールです。
直感的なUIが魅力で、GitOpsツールとしてかなり有力な選択肢になっているものです。
弊社の社内システムでも、ArgoCDを使ったGitOpsを採用しています。

- [Kubernetesチュートリアル - 継続的デリバリ - ArgoCD](/containers/k8s/tutorial/delivery/argocd/)

## Dagger
Docker開発者によって作成されたツールの[Dagger](https://dagger.io/)。
他のCIツールとは違い、コンテナが動く環境であればどんなツールにも組み込むことが可能です。 例えば、GitHub Actions上でDaggerのパイプラインを動かすなんてこともでき、他のCI/CD製品とは一線を画すツールと言えます。
かなり新しいツールですが、パイプラインの新時代を先取りしてみてはいかがでしょうか？

- [話題の CI/CD ツール Dagger を体験してみる](/blogs/2022/04/21/try-running-dagger/)