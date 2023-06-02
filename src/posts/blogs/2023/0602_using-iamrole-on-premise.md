---
title: "オンプレミスのサーバでIAMロールを使用する"
author: shigeki-shoji
date: 2023-06-02
tags: [AWS]
---

こんにちは、[庄司](https://github.com/edward-mamezou)です。

EC2 に配置したアプリケーションで S3 や DynamoDB 等のサービスを利用する場合、永続的クレデンシャル (アクセスキーやシークレット) を使用せずインスタンスプロファイルによる IAM ロールの利用がベストプラクティスとなっています。

では、オンプレミスのサーバに配置されているアプリケーションの場合はどうすればいいのでしょうか ?

先に結論から書くと、SSM Agent のインストールが可能なサーバであれば EC2 と同様に一時的なクレデンシャルが利用可能となります。

昨年「[AWS を利用して遠隔地にあるサーバを管理する](/blogs/2022/01/10/remotely-manage-iot-device/)」という記事を書きました。
この記事では、Jetson Nano を使用してリモート管理の方法を紹介しました。

今回は arm64 の Raspbian を稼働している Raspberry Pi 3 を使用します。SSM Agent のインストール手順は Jetson Nano の場合と同じですので割愛します。

各種 OS に SSM Agent をインストールする方法は公式ドキュメントの「[ハイブリッドおよびマルチクラウド環境に Systems Manager をセットアップする](https://docs.aws.amazon.com/ja_jp/systems-manager/latest/userguide/systems-manager-managedinstances.html)」をご覧ください。

## AWS CLI のインストール

AWS Systems Manager の「[ハイブリッド環境の設定 - ステップ 1: ハイブリッドおよびマルチクラウド環境に IAM サービスロールを作成する](https://docs.aws.amazon.com/ja_jp/systems-manager/latest/userguide/sysman-service-role.html)」に書かれている通りアクティベートのためにまず IAM サービスロールを作成する必要があります。

この IAM サービスロールは EC2 がインスタンスプロファイルから渡される IAM ロールと同等のものです。

サービスロールで許可したサービスのみ使用可能な一時的なクレデンシャルは SSM Agent によって提供されます。

確認のため、AWS CLI をインストールしましょう。

まず、AWS CLI のアーカイブをダウンロードします。

```shell
curl -O 'https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip'
```

次に、unzip して install スクリプトを実行します。

```shell
unzip awscli-exe-linux-aarch64.zip
sudo ./aws/install
```

## S3 バケット一覧の取得

S3 バケット一覧を取得するコマンドを実行してみましょう。

```shell
aws s3api list-buckets
```

コマンドの実行結果はエラーとなり、次のように表示されます。

```text
Unable to locate credentials. You can configure credentials by running "aws configure".
```

次に、sudo で同じコマンドを実行してみましょう。

```shell
sudo aws s3api list-buckets
```

エラーになりますが、次のように表示されます。

```text
An error occurred (AccessDenied) when calling the ListBuckets operation: Access Denied
```

ここで、AWS 管理コンソールからアクティベーションで使用したサービスロールに「許可の追加」で AmazonS3ReadOnlyAccess ポリシーを追加して再度コマンドを実行してみましょう。

```shell
sudo aws s3api list-buckets
```

今度はエラーとならずバケット一覧が表示されます。

## おわりに

SSM Agent が稼働しているサーバの `/root/.aws/credentials` ファイルに一時的なクレデンシャルが書き込まれています。

アプリケーションはこの一時的なクレデンシャルでサービスの利用が可能となり、オンプレミスであってもセキュアに運用できます。
