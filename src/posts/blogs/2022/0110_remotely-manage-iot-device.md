---
title: AWS を利用して遠隔地にあるサーバを管理する 
author: shigeki-shoji
date: 2022-01-10
tags: [AWS, iot] 
---

遠隔地にサーバや Raspberry Pi や Jetson Nano などの IoT デバイスを配置する場合、これらのメンテナンスのためのアクセス手段をセキュアに構築する方法を考えることは頭の痛い課題の一つです。特に、このために ssh ポートを開放することは攻撃者に絶好の口を提供することになります。

この記事では、AWS Systems Manager を使って、リモートで Shell コマンドの実行や Ansible Playbook の適用ができるようにするため、[以前の記事](/blogs/2022/01/03/dapr-on-jetson-nano-with-k3s/) で紹介した Jetson Nano に amazon-ssm-agent をインストールする方法と Run Command の使い方を概説します。

# サポートされているオペレーティングシステム

2022年1月10日の現時点では、macOS はハイブリッド環境ではサポートされていません。Windows Server、Raspberry Pi OS、複数の Linux ディストリビューションがサポートされています。サポート状況の詳細は、「[ハイブリッド環境で AWS Systems Manager を設定する](https://docs.aws.amazon.com/ja_jp/systems-manager/latest/userguide/systems-manager-managedinstances.html)」を参照してください。

# IAM サービスロール

「[ステップ 2: ハイブリッド環境に IAM サービスロールを作成する](https://docs.aws.amazon.com/ja_jp/systems-manager/latest/userguide/sysman-service-role.html)」に書かれている手順で作成しても良いですが、私はすでにあった `AmazonEC2RunCommandRoleForManagedInstances` を使用しました。S3 バケットポリシーは追加せず、代わりに `CloudWatchAgentServerPolicy` を追加しました。

従って、`AmazonEC2RunCommandRoleForManagedInstances` にアタッチされたポリシーは次の3つです。

* `CloudWatchAgentServerPolicy`
* `AmazonSSMManagedInstanceCore`
* `AmazonSSMDirectoryServiceAccess`

# アクティベーションの作成

「[ステップ 4: ハイブリッド環境のマネージドインスタンスのアクティベーションを作成する](https://docs.aws.amazon.com/ja_jp/systems-manager/latest/userguide/sysman-managed-instance-activation.html)」の手順でアクティベーションを作成し、アクティベーションコードと ID を記録しておきます。

# SSM Agent のインストール

「[ステップ 5: ハイブリッド環境に SSM Agent をインストールする (Linux)](https://docs.aws.amazon.com/ja_jp/systems-manager/latest/userguide/sysman-install-managed-linux.html)」に書かれている手順通りですが、この記事では Jetson Nano に特化して詳しく説明したいと思います。

## Jetson Nano にログイン

Jetson Nano にログインします。そして、`/tmp/ssm` ディレクトリを次のように作成します。

```shell
mkdir /tmp/ssm
```

## SSM Agent のパッケージのダウンロード

AWS から SSM Agent のパッケージをダウンロードします。私は、大阪リージョンに登録するため、大阪リージョン (ap-northeast-3) を使用しました。

```shell
sudo curl https://s3.ap-northeast-3.amazonaws.com/amazon-ssm-ap-northeast-3/latest/debian_arm64/amazon-ssm-agent.deb -o /tmp/ssm/amazon-ssm-agent.deb
```

## SSM Agent のインストール

```shell
sudo dpkg -i /tmp/ssm/amazon-ssm-agent.deb
```

## マネージドインスタンスの登録

アクティベーションの作成で、記録した「アクティベーションコード」と「ID」を使って登録します。ここでの例では、リージョンは大阪 (ap-northeast-3) を使用しています。

```shell
sudo systemctl stop amazon-ssm-agent
sudo amazon-ssm-agent -register -code “<アクティベーションコード>” -id “<ID>” -region “ap-northeast-3”
sudo systemctl start amazon-ssm-agent
```

## インスタンスの確認

AWS のコンソールの `AWS Systems Manager` の `ノード管理 | フリートマネージャー` で登録したマネージドインスタンスがオンライン状態等を確認することができます。

## Run Command を使用

1. AWS コンソールの `AWS Systems Manager` の `ノード管理 | Run Command` を選択して、「Run command」ボタンをクリックします。
2. 検索のテキストボックスに、「RunShell」とタイプして検索します。
3. `AWS-RunShellScript` を選択します。
4. コマンドのパラメータのテキストボックスに、`docker images` とタイプします。
5. ターゲットで、「インスタンスを手動で選択する」を選択し、リストボックスで登録したインスタンスを選択します。
6. 出力オプションでは、「S3 バケットへの書き込みを有効化する」のチェックを解除して、代わりに、「CloudWatch 出力」をチェックします。
7. 最後に「実行」ボタンをクリックして、実行を開始します。

コマンドが成功すると、コマンド履歴のタブの実行したコマンドの行のステータスが「成功」と表示されます。

CloudWatch Logs のロググループ `/aws/ssm/AWS-RunShellScript` にコマンドの実行時の出力が記録されているので確認します。

# まとめ

この記事で紹介した Run Command を利用することで、シェルスクリプトの実行や Ansible Playbook の適用等も可能です。遠隔地で実行しているサーバの状態確認、アップグレード、インストールされた証明書の更新等のユースケースの実行を安全に行うことができます。

さらに、ここでは説明しませんでしたが、追加の料金を支払うことで、セッションマネージャーを使ったターミナルログイン等の機能を有効にすることもできます。
