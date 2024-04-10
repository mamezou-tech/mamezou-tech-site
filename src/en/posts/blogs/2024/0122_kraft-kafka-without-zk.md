---
title: 'Configuring Kafka Clusters with KRaft: The ZooKeeper-less Approach'
author: masahiro-kondo
date: 2024-01-22T00:00:00.000Z
tags:
  - Kafka
image: true
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/blogs/2024/01/22/kraft-kafka-without-zk/).
:::



## Introduction
In Kafka, ZooKeeper has been responsible for topic management and broker leader election, among other tasks.

![ZooKeeper mode](https://i.gyazo.com/81b5b33831acdddf2d6b80c24a3b72af.png)

(Reposted from the previous article "[Strimzi - Operators for Running Kafka on Kubernetes](/blogs/2022/05/25/strimzi-kafka-operators/)")

By offloading various management tasks to ZooKeeper, the implementation of Kafka has been simplified. However, from an operational standpoint, having to manage two types of clusters and other complexities, along with ZooKeeper becoming a bottleneck, have been challenges.

## What is KRaft?

KRaft is a configuration where the Kafka cluster autonomously manages the cluster using the Raft protocol[^1], without depending on ZooKeeper for leader election or metadata management.

[^1]: [Raft (algorithm) - Wikipedia](https://en.wikipedia.org/wiki/Raft_(algorithm))

In a Kafka cluster operating in KRaft mode, Kafka nodes serve not only as brokers but also take on the role of controllers. Nodes acting as controllers take over topic management and leader election, tasks previously managed by ZooKeeper. Cluster metadata is stored in a dedicated metadata topic for Kafka and used for event processing between controllers.

![KRaft mode](https://i.gyazo.com/35a804ebc419335724af27ffb28f6973.png)

In the above diagram, nodes are divided into brokers and controllers, but it is also possible to assign both roles to a single node.

:::info
The controller in KRaft mode operates as a Quorum controller service, functioning based on Raft's consensus protocol.
:::

KRaft mode eliminates the overhead of communicating with ZooKeeper, allowing Kafka nodes to access metadata in-memory, which is a performance advantage. This significant architectural revision has resulted in benefits such as simplified deployment, enhanced scalability, and improved performance.

## Migrating to KRaft Mode

According to KIP-833, KRaft became production-ready with Kafka 3.3. ZooKeeper has been deprecated from version 3.5 onwards, and starting from version 4.0, only KRaft mode will be supported.

[KIP-833: Mark KRaft as Production Ready - Apache Kafka - Apache Software Foundation](https://cwiki.apache.org/confluence/display/KAFKA/KIP-833%3A+Mark+KRaft+as+Production+Ready)

According to Kafka's documentation, ZooKeeper might be removed as early as April 2024.

[https://kafka.apache.org/documentation/#zk_depr](https://kafka.apache.org/documentation/#zk_depr)

Since KRaft mode is not compatible with ZooKeeper mode, migration work is necessary for existing Kafka clusters in production environments.

The official documentation states that migration will be possible with version 3.6. As of January 2024, version 3.6.1 has already been released, but the documentation does not yet include instructions.

KIP-866 manages the requirements and specifications for migration. It aims to minimize cluster downtime by allowing rollback to ZooKeeper during the final stages of migration and performing dual writes to KRaft and ZooKeeper during migration mode.

[KIP-866 ZooKeeper to KRaft Migration - Apache Kafka - Apache Software Foundation](https://cwiki.apache.org/confluence/display/KAFKA/KIP-866+ZooKeeper+to+KRaft+Migration)

:::info
Confluent's website introduces a migration procedure for the Confluent Platform (Kafka's cloud service). As of January 2024, it is listed as an Early Access (EA) feature, with a note that it is intended for evaluation, testing, and feedback purposes.

[Migrate from ZooKeeper to KRaft (EA) &#124; Confluent Documentation](https://docs.confluent.io/platform/current/installation/migrate-zk-kraft.html)
:::

## Running Kafka with KRaft via Homebrew
For development environments, simply switching to KRaft mode may allow you to continue working in many cases. If you're starting development with Kafka, it seems advisable to set up a KRaft environment.

As of January 2024, the kafka formula in Homebrew for Kafka 3.6.1 depends on the openjdk and zookeeper formulas.

[kafka | Homebrew Formulae](https://formulae.brew.sh/formula/kafka)

Therefore, installing Kafka via Homebrew automatically starts a Kafka cluster using ZooKeeper.

The Kafka documentation's Quick Start > Kafka with KRaft section contains instructions for setting up KRaft[^2].

[Apache Kafka QuickStart](https://kafka.apache.org/quickstart)

[^2]: These instructions are for manual installation using downloaded JDK and Kafka binaries.

Below are the steps I took to switch a Kafka installation on macOS via Homebrew from a ZooKeeper configuration to a KRaft configuration.

First, stop the existing Kafka and ZooKeeper services.

```shell
brew services stop kafka
brew services stop zookeeper
```

Generate a Kafka cluster ID for KRaft mode using the kafka-storage command.

```shell
KAFKA_CLUSTER_ID=$(kafka-storage random-uuid)
```
Store the Homebrew installation directory[^3] in an environment variable using the brew --prefix command.

```shell
BREW_PREFIX=$(brew --prefix)
```

[^3]: Currently, it is /opt/homebrew.

Back up the existing Kafka server.properties file just in case.

```shell
cp $BREW_PREFIX/etc/kafka/server.properties $BREW_PREFIX/etc/kafka/server.properties.old
```

Replace Kafka's server.properties with the server.properties for KRaft.

```shell
cp $BREW_PREFIX/etc/kafka/kraft/server.properties $BREW_PREFIX/etc/kafka/server.properties
```

Change the metadata of the log directory based on the KRaft configuration.

```shell
$ kafka-storage format -t $KAFKA_CLUSTER_ID -c $BREW_PREFIX/etc/kafka/server.properties
Formatting /opt/homebrew/var/lib/kraft-combined-logs with metadata.version 3.6-IV2.
```

Now you can start Kafka in KRaft mode (ZooKeeper-less).

```shell
brew services start kafka
```

:::info
Presumably, starting with Kafka 4.0, this setup will be done automatically with a Homebrew installation.
:::

## KRaft Mode Configuration in Container Environments

There are several articles about running KRaft mode in Docker, though it seems to involve a bit of manual work at the moment.

- [Install Apache Kafka KRaft cluster in docker container](https://wbarillon.medium.com/install-apache-kafka-kraft-cluster-in-docker-container-0f8214ba3e1e)
- [KRaft Kafka Cluster with Docker](https://levelup.gitconnected.com/kraft-kafka-cluster-with-docker-e79a97d19f2c)

The following article is useful for configuring KRaft mode in Kubernetes, detailing the process using Bitnami's Helm Charts.

[Deploy Kafka without ZooKeeper on Kubernetes](https://msazure.club/deploy-kafka-without-zookeeper/)

The Strimzi Operators for running Kafka on Kubernetes, introduced in "[Strimzi - Operators for Running Kafka on Kubernetes](/blogs/2022/05/25/strimzi-kafka-operators/)", have implemented KafkaNodePools in alpha version to support KRaft.

[Kafka Node Pools: Supporting KRaft (ZooKeeper-less Apache Kafka)](https://strimzi.io/blog/2023/09/11/kafka-node-pools-supporting-kraft/)

## Conclusion
This article introduced KRaft and the procedure for setting up KRaft mode in a local environment. Migration in production environments is still in the early stages.

Simplifying the architecture not only simplifies the development environment but also reduces the footprint, among other benefits.

## References

- [The Evolution of Kafka Architecture: From ZooKeeper to KRaft](https://romanglushach.medium.com/the-evolution-of-kafka-architecture-from-zookeeper-to-kraft-f42d511ba242)
- [KRaft - Apache Kafka Without ZooKeeper](https://developer.confluent.io/learn/kraft/)


