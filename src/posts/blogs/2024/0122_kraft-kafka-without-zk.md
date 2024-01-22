---
title: KRaft による ZooKeeper レス Kafka クラスター構成
author: masahiro-kondo
date: 2024-01-22
tags: [Kafka]
image: true
---

## はじめに
Kafka では ZooKeeper がトピック管理やブローカーのリーダー選出などを行なう構成になっています。

![ZooKeeper mode](https://i.gyazo.com/81b5b33831acdddf2d6b80c24a3b72af.png)

(以前の記事「[Strimzi - Kubernetes で Kafka を運用するための Operators](/blogs/2022/05/25/strimzi-kafka-operators/)」から再掲)

ZooKeeper に様々な管理をオフロードすることで、Kafka の実装はシンプルになります。しかし運用の観点からは2種類のクラスター管理など構成が複雑であり、ZooKeeper がボトルネックになるリスクなどが課題となっていました。

## KRaft とは

KRaft は Kafka クラスターが自律的に Raft プロトコル[^1]によるクラスター管理を行う構成です。リーダー選出やメタデータ管理を ZooKeeper に依存することなく Kafka クラスター自体が行います。

[^1]: [Raft (algorithm) - Wikipedia](https://en.wikipedia.org/wiki/Raft_(algorithm))

KRaft モードで動作する Kafka クラスターにおいて Kafka ノードは従来のブローカーに加えコントローラーの役割も担います。コントローラー役のノードは ZooKeeper が行なっていたトピック管理やリーダー選出を引き受けます。クラスターのメタデータは、Kafka 専用のメタデータトピックに格納されコントローラー間のイベント処理で使用されます。

![KRaft mode](https://i.gyazo.com/35a804ebc419335724af27ffb28f6973.png)

上の図では各ノードがブローカーとコントローラーに分けられていますが、1つのノードにブローカーとコントローラーの両方を割り当てることもできます。

:::info
KRaft モードにおけるコントローラーは Quorum(クオラム) コントローラーと呼ばれるサービスで、Raft のコンセンサスプロトコルにより動作します。
:::

KRaft モードでは ZooKeeper との通信オーバーヘッドがなくなり、Kafka ノードのメモリー内でメタデータにアクセスできるなどパフォーマンス的にも有利になっています。このようにアーキテクチャが大幅に見直された結果、デプロイの簡素化、スケーラビリティの強化、パフォーマンスの向上などのメリットがもたらされました。

## KRaft モードへのマイグレーション

KIP-833 によると、KRaft は Kafka 3.3で Production Ready になりました。3.5以降 ZooKeeper は非推奨になっています。4.0以降は ZooKeeper は削除され KRaft モードのみがサポートされる予定です。

[KIP-833: Mark KRaft as Production Ready - Apache Kafka - Apache Software Foundation](https://cwiki.apache.org/confluence/display/KAFKA/KIP-833%3A+Mark+KRaft+as+Production+Ready)

Kafka のドキュメントによると早ければ 今年2024年の4月には削除されるようです。

[https://kafka.apache.org/documentation/#zk_depr](https://kafka.apache.org/documentation/#zk_depr)

KRaft モードは ZooKeeper モードとの互換性がないため、プロダクション環境における既存の Kafka クラスターではマイグレーション作業が必要となります。

公式ドキュメントにはマイグレーションは3.6で可能になると記述されています。2024年1月現在、すでに3.6.1がリリースされていますが、公式ドキュメントには手順が記載されていません。

KIP-866 でマイグレーションの要件や仕様が管理されています。マイグレーションの最終段階まで ZooKeeper への切り戻しを可能にし、マイグレーションモードでは KRaft と ZooKeeper への二重書き込みを行うとのことです。クラスターのダウンタイムを最小限にすることを目指しています。

[KIP-866 ZooKeeper to KRaft Migration - Apache Kafka - Apache Software Foundation](https://cwiki.apache.org/confluence/display/KAFKA/KIP-866+ZooKeeper+to+KRaft+Migration)

:::info
Confluent のサイトには独自に Confluent プラットフォーム(Kafka のクラウドサービス)におけるマイグレーション手順が紹介されています。2024年1月時点では、EA(アーリーアクセス)機能とされており、評価やテスト、フィードバック目的である旨の注意書きがあります。

[Migrate from ZooKeeper to KRaft (EA) &#124; Confluent Documentation](https://docs.confluent.io/platform/current/installation/migrate-zk-kraft.html)
:::

## Homebrew で導入した Kafka を KRaft で動作させる
開発環境については単純に KRaft モードに切り替えても作業を継続できるケースが多いでしょう。これから Kafka を使って開発を開始する場合は KRaft の環境を作っておくとよさそうです。

Homebrew における kafka formula(パッケージ)は、2024年1月現在の Kafka 3.6.1 では openjdk と zookeeper の formula に依存しています。

[kafka | Homebrew Formulae](https://formulae.brew.sh/formula/kafka)

したがって Homebrew でインストールすると 自動的に ZooKeeper を使用する構成で Kafka クラスターが起動されます。

Kafka ドキュメントの Quick Start > Kafka with KRaft セクションに KRaft による構築手順[^2]があります。

[Apache Kafka QuickStart](https://kafka.apache.org/quickstart)

[^2]: JDK と Kafka のバイナリをダウンロードして手動でインストールする際の手順となっています。

以下は、Homebrew で macOS にインストールした Kafka を ZooKeeper 構成から KRaft 構成に変更する際に筆者が実施した手順です。

まず既存の Kafka と ZooKeeper のサービスを停止します。

```shell
brew services stop kafka
brew services stop zookeeper
```

KRaft で動作する Kafka クラスター ID を kafka-storage コマンドにより生成します。

```shell
KAFKA_CLUSTER_ID=$(kafka-storage random-uuid)
```
Homebrew のインストールディレクトリ[^3]を brew --prefix コマンドで取得して環境変数に格納します。

```shell
BREW_PREFIX=$(brew --prefix)
```

[^3]: 現在は /opt/homebrew です。

念のため既存の Kafka の server.properties をバックアップします。

```shell
cp $BREW_PREFIX/etc/kafka/server.properties $BREW_PREFIX/etc/kafka/server.properties.old
```

Kafka の server.properties を KRaft の server.properties に置き換えます。

```shell
cp $BREW_PREFIX/etc/kafka/kraft/server.properties $BREW_PREFIX/etc/kafka/server.properties
```

ログディレクトリのメタデータを KRaft の構成に基づき変更します。

```shell
$ kafka-storage format -t $KAFKA_CLUSTER_ID -c $BREW_PREFIX/etc/kafka/server.properties
Formatting /opt/homebrew/var/lib/kraft-combined-logs with metadata.version 3.6-IV2.
```

以上で Kafka を KRaft モード(ZooKeeper レス)で起動できます。

```shell
brew services start kafka
```

:::info
おそらく Kafka 4.0 以降は Homebrew でインストールするだけでこのセットアップが行われると思います。
:::

## コンテナ環境における KRaft モード構成

Docker で KRaft モードを動作させる記事はいくつかあります。現状は若干手作業が多そうです。

- [Install Apache Kafka KRaft cluster in docker container](https://wbarillon.medium.com/install-apache-kafka-kraft-cluster-in-docker-container-0f8214ba3e1e)
- [KRaft Kafka Cluster with Docker](https://levelup.gitconnected.com/kraft-kafka-cluster-with-docker-e79a97d19f2c)

Kubernetes で KRaft モードを構成する手順は以下の記事が参考になります。Bitnami の Helm Charts を利用する手順が記載されています。

[Deploy Kafka without ZooKeeper on Kubernetes](https://msazure.club/deploy-kafka-without-zookeeper/)

「[Strimzi - Kubernetes で Kafka を運用するための Operators](/blogs/2022/05/25/strimzi-kafka-operators/)」で紹介した Strimzi では KRaft に対応するための KafkaNodePools がアルファ版として実装されています。

[Kafka Node Pools: Supporting KRaft (ZooKeeper-less Apache Kafka)](https://strimzi.io/blog/2023/09/11/kafka-node-pools-supporting-kraft/)

## さいごに
以上、KRaft とローカル環境での KRaft モード設定手順の紹介でした。プロダクション環境での移行はこれからという段階です。

構成がシンプルになることで開発環境もシンプルになり、フットプリントが小さくなるなどメリットがあります。

## 参考

- [The Evolution of Kafka Architecture: From ZooKeeper to KRaft](https://romanglushach.medium.com/the-evolution-of-kafka-architecture-from-zookeeper-to-kraft-f42d511ba242)
- [KRaft - Apache Kafka Without ZooKeeper](https://developer.confluent.io/learn/kraft/)

