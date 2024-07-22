---
title: KRaft モードの Kafka をコンテナ環境にデプロイする
author: masahiro-kondo
date: 2024-06-24
tags: [Kafka, container]
image: true
---

## はじめに

今年の初めに「[KRaft による ZooKeeper レス Kafka クラスター構成](/blogs/2024/01/22/kraft-kafka-without-zk/)」という記事でローカル環境で KRaft モードで Kafka を実行する方法について書きました。

この時は Docker や Kubernetes などコンテナ環境でのサポートが追いついておらず、設定にはかなりの手作業が必要でした。現在では手軽に構築できるようになっています。

macOS Sonoma / OrbStack 1.6.2 の環境で試しました。

:::info
OrbStack については以下の記事で取り上げています。

- [OrbStack - macOS 専用の高速軽量なコンテナ &amp; Linux VM 環境](/blogs/2023/06/21/orbstack/)
- [OrbStack 1.0 付属の Kubernetes を試す](/blogs/2023/09/25/orbstack-with-k8s/)
:::

## Docker の場合
Bitnami の Docker サイトにドキュメントがあります。

[https://hub.docker.com/r/bitnami/kafka](https://hub.docker.com/r/bitnami/kafka)

KRaft コントローラーと Kafka ブローカーを兼用するシングルノードのミニマム構成を docker compose で起動させる例です。kafka-kraft というディレクトリ配下に compose.yml を作成しました。

```yaml:kafka-kraft/compose.yml
services:
  kafka:
    image: 'bitnami/kafka:latest'
    environment:
      - KAFKA_CFG_NODE_ID=0
      - KAFKA_CFG_CONTROLLER_BROKER_ID=0 #1
      - KAFKA_CFG_PROCESS_ROLES=controller, broker #2
      - KAFKA_CFG_LISTENERS=PLAINTEXT://:9092, CONTROLLER://:9093 #3
      - KAFKA_CFG_LISTENERS_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT #4
      - KAFKA_CFG_CONTROLLER_QUORUM_VOTERS=0@kafka:9093 #5
      - KAFKA_CFG_CONTROLLER_LISTENER_NAMES=CONTROLLER #6
```
environment に KRaft の設定が必要になっています。

1. コントローラーになるブローカーのID を指定します。(シングルノードなので `KAFKA_CFG_NODE_ID` と同じ `0` を指定)
2. ノードにコントローラーとブローカー両方のロールを付与します。
3. ブローカーとコントローラーのリスナーを定義しています。それぞれ 9092、9093 ポートを割り当てています。
4. リスナー用のセキュリティプロトコルマップの指定。PLAINTEXT にしています。
5. Quorum voters として `0@kafka:9093` を指定しています。`{id}@{host}:{port}` の形式で指定します。
6. コントローラーのリスナー名を指定します。

:::alert
この例ではプロトコルに PLAINTEXT を指定していますが、プロダクション環境では SASL などの認証メカニズムとプロトコルを利用しましょう。
:::

compose.yml があるディレクトリ(ここでは kafka-kraft) で docker compose で実行します。

```shell
docker compose up -d
```

Kafka のコンテナが起動されていることを確認。

```shell
$ docker compose ps
NAME                  IMAGE                  COMMAND                   SERVICE   CREATED          STATUS          PORTS
kafka-kraft-kafka-1   bitnami/kafka:latest   "/opt/bitnami/script…"   kafka     10 minutes ago   Up 10 minutes   9092/tcp
```

起動中のコンテナ `kafka-kraft-kafka-1` に入って kafka-topics.sh でトピック一覧を表示します。

```shell
docker exec -it  kafka-kraft-kafka-1 kafka-topics.sh --list --bootstrap-server kafka:9092
```

まだトピックはないので、エラーが出ずコマンドが終了すれば接続成功です。

開発時に便利なように、ホストマシンから接続できるようにし、kafka-ui も使えるようにしてみましょう。

```yaml:compose.yml
services:
  kafka:
    image: 'bitnami/kafka:latest'
    ports:
      - '9094:9094' #1
    environment:
      - KAFKA_CFG_NODE_ID=0
      - KAFKA_CFG_CONTROLLER_BROKER_ID=0
      - KAFKA_CFG_PROCESS_ROLES=controller,broker
      - KAFKA_CFG_LISTENERS=PLAINTEXT://:9092,CONTROLLER://:9093,EXTERNAL://:9094 #2
      - KAFKA_CFG_ADVERTISED_LISTENERS=PLAINTEXT://kafka:9092,EXTERNAL://localhost:9094 #3
      - KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,EXTERNAL:PLAINTEXT,PLAINTEXT:PLAINTEXT #4
      - KAFKA_CFG_CONTROLLER_QUORUM_VOTERS=0@kafka:9093
      - KAFKA_CFG_CONTROLLER_LISTENER_NAMES=CONTROLLER

  kafka-ui:
    image: 'provectuslabs/kafka-ui:latest'
    ports:
      - '8080:8080'
    depends_on:
      - kafka
    environment:
      - KAFKA_CLUSTERS_0_NAME=local #5
      - KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS=kafka:9092 #6
```

1. コンテナ外部からポート9094で Kafka Broker に接続できるようにします。
2. 外部接続(EXTERNAL) のポート(9094)を追加します。
3. EXTERNAL のホスト名を追加します。
4. EXTERNAL のプロトコルを指定します。
5. kafka-ui の管理対象のクラスターの名前をつけます。
6. kafka-ui の管理対象のクラスターの bootstrap-server のホスト名とポートを指定します。

:::info
kafka-ui については以下の記事で紹介しています。

「[Kafka の Web UI を提供する kafka-ui を試す](/blogs/2023/01/05/kafka-ui/)
:::

ホストマシンには、Homebrew などで kafka をインストールして、kafka の管理用コマンドが使えるようにしておきます。ホストマシンで kafka-topics.sh を実行してトピック一覧を表示します。

```shell
kafka-topics --bootstrap-server localhost:9094 --list
```
エラーなしでコマンドが終了すれば、接続成功です。

ホストマシンのブラウザから localhost:8080 にアクセスすると kafka-ui のダッシュボードが表示されます。

![kafka-ui](https://i.gyazo.com/b6b5365b6894c07e8c96c6867e4189c0.png)


:::info
コントローラーとブローカーを複数のサービスに分離する、より本格的な構成については bitnami の GitHub リポジトリの README にサンプルがあります。

[containers/bitnami/kafka/README.md at main · bitnami/containers](https://github.com/bitnami/containers/blob/main/bitnami/kafka/README.md)

Bitnami ではなく Confluent のイメージを使いたい場合は、以下のリポジトリにサンプルがあります。

[kafka-images/examples/confluent-server-kraft/docker-compose.yml at master · confluentinc/kafka-images](https://github.com/confluentinc/kafka-images/blob/master/examples/confluent-server-kraft/docker-compose.yml)
:::

## Kubernetes の場合
Artifact Hub の Bitnami の Helm chart のページにドキュメントがあります。

[kafka 29.3.4 · bitnami/bitnami](https://artifacthub.io/packages/helm/bitnami/kafka)

Bitnami の Helm chart では KRaft モードがデフォルトで有効化され、ZooKeeper は無効化されています。

```yaml
kraft:
  ## @param kraft.enabled Switch to enable or disable the KRaft mode for Kafka
  ##
  enabled: true

zookeeper:
  ## @param zookeeper.enabled Switch to enable or disable the ZooKeeper helm chart. Must be false if you use KRaft mode.
  ##
  enabled: false
```

このため、オプション指定なしで helm install を実行すれば KRaft モードで Kafka クラスターが作成されます。Kafka client の Pod から簡易に接続確認するため、`listeners.client.protocol` に `PLAINTEXT` を指定した設定ファイルを用意しました。

```yaml:values.yaml
listeners:
  client:
    protocol: PLAINTEXT
```

`kafka` namespace を作成し、この設定ファイルを指定して helm install します。

```shell
kubectl create ns kafka
helm install my-kafka oci://registry-1.docker.io/bitnamicharts/kafka -n kafka -f values.yaml
```

作成されたオブジェクトを見てみましょう。

```shell
$ kubectl get po,svc,sts -n kafka
NAME                        READY   STATUS    RESTARTS   AGE
pod/my-kafka-controller-1   1/1     Running   0          14m
pod/my-kafka-controller-2   1/1     Running   0          14m
pod/my-kafka-controller-0   1/1     Running   0          14m

NAME                                   TYPE        CLUSTER-IP        EXTERNAL-IP   PORT(S)                      AGE
service/my-kafka-controller-headless   ClusterIP   None              <none>        9094/TCP,9092/TCP,9093/TCP   14m
service/my-kafka                       ClusterIP   192.168.194.159   <none>        9092/TCP                     14m

NAME                                   READY   AGE
statefulset.apps/my-kafka-controller   3/3     14m
```

コントローラー兼ブローカーの Pod (my-kafka-controller-*) が3つ起動しています[^1]。もちろん ZooKeeper の Pod は起動していません。bootstrap-server に指定する (ClusterIP を持つ) Service と、broker / controller 個別の IP を返すための Headless Service が作られています。

[^1]: `controller.replicaCount` のデフォルト値は3です。

接続確認をしてみます。Kafka クライアント用の Pod を起動します。

```shell
kubectl -n kafka run kafka-client --restart='Never' --image docker.io/bitnami/kafka --command -- sleep infinity
```

my-kafka:9092 を bootstrap-server に指定して、kafka-topics でリスト表示を実行します。何も表示されずコマンドが終了すれば成功です。

```shell
kubectl -n kafka exec -i kafka-client -- bash << 'EOS'
  kafka-topics.sh --bootstrap-server my-kafka:9092 --list
EOS
```

### おまけ(ホストマシンからの接続設定)

おまけとして、Pod に入らなくても Kafka に接続できるよう、ホストマシンからの接続設定をしてみましょう。上記で作成した Kafka クラスターを削除します。

```shell
helm uninstall my-kafka -n kafka
```

設定ファイルに `externalAccess` の設定を追加します。LoadBalancer や Ingress による設定も可能ですが、ここでは NodePort を使用しています(コントローラーとブローカー両方)。

```yaml:values.yaml
externalAccess:
  enabled: true
  controller:
    service:
      type: NodePort
  broker:
    service:
      type: NodePort
  autoDiscovery:
    enabled: true

rbac:
  create: true

controller:
  automountServiceAccountToken: true

broker:
  automountServiceAccountToken: true

listeners:
  client:
    protocol: PLAINTEXT
  external:
    protocol: PLAINTEXT
```

ランダムなポートを利用できるよう、`autoDiscovery.enabled` を true にしています。このオプションでは Kubernetes API を使用してポートの割り当てを行うため、`rbac.create` を `true` にして`controller.automountServiceAccountToken`、`broker.automountServiceAccountToken` も `true` にする必要があります。

`listeners.client` と `listeners.external` のプロトコルは簡便のため PLAINTEXT にしました。

この設定ファイルを指定して helm install を実行します。

```shell
helm install my-kafka oci://registry-1.docker.io/bitnamicharts/kafka -n kafka -f values.yml
```

Service を表示すると、3つの Pod に対応する NodePort が作成されています。

```shell
$ kubectl get svc -n kafka
NAME                             TYPE        CLUSTER-IP        EXTERNAL-IP   PORT(S)                      AGE
my-kafka-controller-headless     ClusterIP   None              <none>        9094/TCP,9092/TCP,9093/TCP   2m6s
my-kafka                         ClusterIP   192.168.194.201   <none>        9092/TCP,9095/TCP            2m6s
my-kafka-controller-1-external   NodePort    192.168.194.185   <none>        9094:31512/TCP               2m6s
my-kafka-controller-2-external   NodePort    192.168.194.217   <none>        9094:32077/TCP               2m6s
my-kafka-controller-0-external   NodePort    192.168.194.230   <none>        9094:31943/TCP               2m6s
```

ホストマシンからは bootstrap-server に3つの NodePort [31512, 32077, 31943] のいずれかを指定して接続可能です。

```shell
 kafka-topics --bootstrap-server localhost:31512 --list
```

## さいごに
以上、KRaft モードの Kafka をコンテナ環境で利用する方法の紹介でした。ローカルでも Docker や Kubernetes を使って簡単に利用できるようになっているので、開発環境構築がより楽になりますね。

Kafka 4.0 では ZooKeeper は削除される予定ですので、本番環境の移行が必要になります。Kafka のドキュメントにはすでにマイグレーション手順の記載が追加されています。

[https://kafka.apache.org/documentation/#kraft_zk_migration](https://kafka.apache.org/documentation/#kraft_zk_migration)
