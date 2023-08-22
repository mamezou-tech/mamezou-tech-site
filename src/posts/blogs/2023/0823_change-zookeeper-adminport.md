---
title: Homebrew で導入した ZooKeeper の admin port を変更する方法
author: masahiro-kondo
date: 2023-08-23
tags: [zookeeper, tips]
---

## はじめに
ZooKeeper は分散システムにおいて構成情報の維持、同期処理、ネーミング、グルーピングなどのサービスを提供するソフトウェアです。

[Apache ZooKeeper](https://zookeeper.apache.org/)

:::info
ネーミングの由来は Zoo (動物園)に由来しています。分散システムの調整は動物園を維持管理するように大変なタスクという意味なのでしょうか。

> ZooKeeper: Because coordinating distributed systems is a Zoo

[Index - Apache ZooKeeper - Apache Software Foundation](https://cwiki.apache.org/confluence/display/ZOOKEEPER/Index)
:::

ZooKeeper は Apache Hadoop や Apache Kafka で利用されており、分散システムのリソース管理の複雑さをこれらのソフトウェアから分離して専用の関心事に注力させる役割を担っています。

## ZooKeeper の admin port とは何か・なぜ変更したいのか
ZooKeeper は 管理のための REST API を公開しており `ZOOKEEPER_HOST:ADMIN_PORT/commands/monitor` などのエンドポイントからサービスの構成や状態を取得できます。

そもそも、どうしてこの ADMIN_PORT を変更したいのか。それは、このポートのデフォルト値が8080だからです。ローカルで動作している場合は、`http://localhost:8080/commands` にアクセスするとインデックスページが開きます。

![index](https://i.gyazo.com/9107a091131b60dee6088b33a04be88b.png)

8080ポートは Web アプリのローカル開発のデフォルト値としてよく採用されます。なので、ZooKeeper が起動されている状態で、Web アプリ開発を行うと別ポートで開いたり、最悪起動に失敗することになります。また、ZooKeeper を起動するときに、別の開発用 WebServer を起動していると ZooKeeper の起動に失敗してしまいます。これは地味にストレスです。ZooKeeper が不要な Web アプリ開発の時は ZooKeeper を停止すれば済みますが、ZooKeeper が必要な場合は、なんとかする必要があります。

## 変更方法
ということで、ようやく本題です。

ZooKeeper の設定ファイルは zoo.cfg に書かれています。

[ZooKeeper Administrator's Guide](https://zookeeper.apache.org/doc/r3.5.1-alpha/zookeeperAdmin.html#sc_adminserver_config)

筆者は macOS に Homebrew で ZooKeeper をインストールしました。ちょっと前だと、ZooKeeper の設定ファイルは、`/usr/local/etc/zookeeper/` 配下にあったのですが、今は Homebrew 自体のディレクトリが移動しています。以下のコマンドでわかるように `/opt/homebrew` になっています。

```shell
$ brew --prefix                                                          
/opt/homebrew
```

zoo.cfg は `/opt/homebrew/etc/zookeeper/zoo.cfg` にありました。

このファイルを開いて以下の行を追加・保存します。

```shell
admin.serverPort=9999 # 8080 以外のポート番号
```

ZooKeeper の管理が不要な場合は以下のように無効化設定を入れるのもありです。

```shell
admin.enableServer=false
```

zoo.cfg を書き換えたら ZooKeeper を再起動します。

```shell
brew services restart zookeeper
```

これで、ポート8080が開放されました。

## 最後に
以上、Homebrew でインストールした ZooKeeper の admin ポートを変更する方法でした。8080 が占有されて不便な場合は試してみてください。
