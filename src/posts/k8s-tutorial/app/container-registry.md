---
title: クラスタ環境デプロイ - プライベートコンテナレジストリ(ECR)
author: noboru-kudo
date: 2022-01-15
prevPage: ./src/posts/k8s-tutorial/app/batch.md
---

さて、ここまででWeb・バッチアプリケーションの開発が終わり、ローカル環境で動作確認ができました。
いよいよここからは、AWS EKSにアプリケーションをデプロイしていきます。

その前に、アプリケーションをEKSにデプロイする際、コンテナイメージはどこで管理すべきでしょうか？
今まではコンテナのビルドと実行が同一環境(ローカル環境)のため、イメージビルド後にそのまま実行できていました[^1]。
ローカル環境での開発はこれで問題ありませんが、その後のテスト・商用環境では、イメージのビルドはCI/CDパイプラインで、その実行はKubernetesと分離することが一般的です。

ここで利用するのがコンテナレジストリです。コンテナレジストリはコンテナイメージをバージョン管理し、必要なイメージを各実行環境に配布する役目を担います[^2]。
コンテナレジストリとして、代表的なものだと[Docker Hub](https://hub.docker.com/)を思いつく方が多いでしょう。
Docker Hubは最も古いコンテナレジストリで、パブリックなリポジトリは無料で作成できますし、利用方法も簡単で今でも最も多く利用されているであろうと思います[^3]。

[^1]: Podのマニフェストで`imagePullPolicy`を`Never`にしていました。

[^2]: 昨今はコンテナイメージの脆弱性スキャンに力を入れる製品・サービスが増えてきました。

[^3]: 2020-11-20よりDockerHubからイメージのPULLにはRateLimitがかけられるようになりました。詳細は[こちら](https://www.docker.com/increase-rate-limits)を参照してください。

Docker Hub以外にも、コンテナレジストリには多くのサービスやプロダクトがあり、よく知られているものだけでも以下のようなものがあります。

- [Amazon Elastic Container Registry(ECR)](https://aws.amazon.com/ecr/)
- [Google Container Registry(GCR)](https://cloud.google.com/container-registry/) / [Google Artifact Registry(GAR)](https://cloud.google.com/artifact-registry/)
- [Azure Container Registry(ACR)](https://azure.microsoft.com/services/container-registry/)
- [Red Hat Quay.io](https://quay.io/)
- [GitHub Packages](https://github.com/features/packages)
- [GitLab Container Registry](https://docs.gitlab.com/ee/user/packages/container_registry/)
- [Nexus SonarType](https://www.sonatype.com/)
- [JFrog Artifactory](https://jfrog.com/artifactory/)
- [Harbor](https://goharbor.io/)

このように現状多くの選択肢がありますが、プライベートのコンテナレジストリが必要であれば、組織的な制約がない限り、各クラウドプロバイダで提供されているものを利用するのが手っ取り早いでしょう。
今回はAWS EKSをアプリケーションのホスティング先として選択しますので、AWSマネージドサービスであるコンテナレジストリのECRを使用します[^4]。

[^4]: ECRを使うことで、リポジトリへのアクセス許可(Pull/Push)をIAMで制限でき、他のAWSリソースとの一貫性を確保できます。

[[TOC]]

## 事前準備

コンテナとしてビルド対象のアプリケーションのソースコードやDockerfileは前回同様にGitHubにあげていますので、未実施の場合はクローンしてください。

```shell
git clone https://github.com/mamezou-tech/k8s-tutorial.git
```

また、今回AWSリソースのプロビジョニングには[Terraform](https://www.terraform.io/)を利用します[^5]。
未インストールの場合は、以下よりTerraformのCLIをセットアップしてください。

- <https://learn.hashicorp.com/tutorials/terraform/install-cli>

[^5]: CloudFormationやAWS CLIでももちろん対応可能ですが、個人的な好みもありTerraformとしました。

## ECRのインストール

ライフサイクル系も。

## イメージビルド/プッシュ

## 動作確認

## まとめ

