---
title: WarpStream - A Kafka Compatible Data Streaming Platform Acquired by Confluent
author: masahiro-kondo
date: 2024-10-22T00:00:00.000Z
tags:
  - WarpStream
  - Kafka
image: true
translate: true

---

## Introduction
WarpStream is an Apache Kafka compatible data streaming platform.

It is composed solely of object storage like S3 and a single binary agent, featuring no networking costs between availability zones (AZ), no need for disk management, and high scalability.

[WarpStream - An Apache Kafka Compatible Data Streaming Platform](https://www.warpstream.com/)

This September, it was announced that WarpStream was acquired by Confluent, which provides cloud services for Kafka.

[Confluent acquires WarpStream | Confluent](https://www.confluent.io/blog/confluent-acquires-warpstream/)

The co-founder of WarpStream wrote about the acquisition process in their blog.

[WarpStream is Dead, Long Live WarpStream](https://www.warpstream.com/blog/warpstream-is-dead-long-live-warpstream)

The official documentation for WarpStream is available here.

[Introduction | WarpStream](https://docs.warpstream.com/warpstream)

It seems it's not production-ready yet, but I would like to explore it a bit and look into its architecture.

:::info
Redpanda, which I introduced in a previous article, is also a Kafka compatible streaming platform. It features simple deployment with a single binary, high speed, and fault tolerance.

[Kafka Compatible High-Efficiency Data Streaming Platform Redpanda](https://developer.mamezou-tech.com/blogs/2023/10/04/redpanda/)
:::

## Preparation for Testing: Installing WarpStream Agent / CLI
To run demos or the Playground for WarpStream, you need to install the WarpStream Agent / CLI.

Binaries are provided for Linux and macOS on amd64/arm64. You can also try it with Docker. Since it's provided as a single binary, you just need to download the one suitable for your platform and add it to your path.

[Install the WarpStream Agent / CLI | WarpStream](https://docs.warpstream.com/warpstream/getting-started/install-the-warpstream-agent)

Below is an example of installing the binary for an Apple Silicon Mac.

```shell
curl -LO https://warpstream-public-us-east-1.s3.amazonaws.com/warpstream_agent_releases/warpstream_agent_darwin_arm64_latest.tar.gz
tar xfz warpstream_agent_darwin_arm64_latest.tar.gz
sudo mv warpstream_agent_darwin_arm64 /usr/local/bin/warpstream
```

## Trying Out the Playground
Let's try running the Playground using the CLI.

[Run the Agents Locally | WarpStream](https://docs.warpstream.com/warpstream/byoc/run-the-agent-locally)

```shell
warpstream playground
```

Sign up for a temporary account for the Playground, and the agent will start locally as follows.

```
WARNING, RUNNING IN PLAYGROUND MODE. All data and state is ephemeral. Server will shutdown automatically after: 4h0m0s

Signing up for temporary account...
Done signing up for temporary account
Starting local agent...

started agent, HTTP server on port: 8080 and kafka server on port: 9092

open the developer console at: https:/console.warpstream.com/login?warpstream_redirect_to=virtual_clusters%2Fvci_4ef27467_0885_4e6c_991c_a95ebba854a4%2Foverview&warpstream_session_key=sks_908e60e40aa2ed27ca59a46289e005144377785ca2b8ea111dad65459d72825e


Keep in mind that playground accounts are heavily ratelimited
```

In this state, test the connection from another terminal using the kcmd subcommand.

```shell
warpstream kcmd -type diagnose-connection -bootstrap-host localhost -bootstrap-port 9092
```

```
running diagnose-connection sub-command with bootstrap-host: localhost and bootstrap-port: 9092


Broker Details
---------------
  LOcALHOST:9092 (NodeID: 597523006) [playground]
    ACCESSIBLE ✅


GroupCoordinator: LOcALHOST:9092 (NodeID: 597523006)
```
The connection to the broker has been confirmed.

You can see the state of clusters and topics by accessing the developer console URL displayed at startup.

![Console](https://i.gyazo.com/0407e6a876009d7ec610577f62417cfd.png)

The agent is running locally, but the WarpStream cluster's Control Plane is deployed on AWS.

![Clusters](https://i.gyazo.com/f3889d098a577015079cb55c90d60b45.png)

## Creating Topics and Communication
Let's try creating topics and communicating while the Playground is running.

["Hello World" for Apache Kafka | WarpStream](https://docs.warpstream.com/warpstream/getting-started/hello-world-using-kafka)

Create a topic by specifying `create-topic` with the warpstream subcommand kcmd.

```shell
warpstream kcmd --type create-topic --topic hello-warpstream
```

```
running create-topic sub-command with bootstrap-host: localhost and bootstrap-port: 9092
created topic "hello-warpstream" successfully, topic ID: MgAAAAAAAAAAAAAAAAAAAA==
```

The topic has been created. It is also displayed in the console.

![Topic](https://i.gyazo.com/72126a4969dafb6ad1305d148cd565b2.png)

Let's try sending a message to the topic. Specify `produce` with kcmd.

```shell
warpstream kcmd --type produce --topic hello-warpstream --records "world,,world"
```

```shell
running produce sub-command with bootstrap-host: localhost and bootstrap-port: 9092

result: partition:0 offset:0 value:"world" 
result: partition:0 offset:1 value:"world" 
```

It seems the message has been sent. For receiving, specify `fetch` with kcmd.

```shell
warpstream kcmd --type fetch --topic hello-warpstream --offset 0
```

```shell
running fetch sub-command with bootstrap-host: localhost and bootstrap-port: 9092

consuming topic:"hello-warpstream" partition:0 offset:0
result: partition:0 offset:0 key:"hello" value:"world"
result: partition:0 offset:1 key:"hello" value:"world"
```

The message was received. It seems that the default key for messages in kcmd produce is "hello".

Let's also try receiving with a Kafka consumer.

```shell
kafka-console-consumer --bootstrap-server localhost:9092 --topic hello-warpstream --property print.key=true --property key.separator="-" --from-beginning
```

In kafka-console-consumer, the message key is hidden by default, so I specified it with property to connect with -.

```
hello-world
hello-world
```

It was also received here.

## Running the Demo Environment
Let's stop the Playground and try running the demo. In the demo environment, topics are automatically created, and WASM versions of Consumer / Producer are automatically started to send and receive messages periodically, allowing you to see traffic on the Console screen.

[Run the Demo | WarpStream](https://docs.warpstream.com/warpstream/getting-started/demo)

Start the demo.

```shell
warpstream demo
```

Like the Playground, the demo environment starts while logged into a temporary account. It will automatically shut down after one hour.

```
Demo will automatically shutdown after: 1h0m0s

Signing up for temporary account...
Done signing up for temporary account
Created temporary data directory: /var/folders/w9/4fztxrrj6lq3tstsk4qt6xlh0000gn/T/warpstream_demo2619599535
Starting local agent...

started agent, HTTP server on port: 8080 and kafka server on port: 9092
Creating local kafka client...
Done creating local kafka client
Creating demo topic
Done creating demo stream
Starting demo producers and consumers

opening developer console in browser: https:/console.warpstream.com/login?warpstream_redirect_to=virtual_clusters%2Fvci_edbd2502_fabd_47b6_b671_3d8673b5430f%2Foverview&warpstream_session_key=sks_71fe21c5081d1da10680c09029d826a2d138a4ac7ab6f832a556ddf8ecd7cfed

opening data directory in browser: /var/folders/w9/4fztxrrj6lq3tstsk4qt6xlh0000gn/T/warpstream_demo2619599535

run this command in a separate terminal to see the agents form a cluster together:

WARPSTREAM_AVAILABILITY_ZONE=DEMO WARPSTREAM_LOG_LEVEL=warn warpstream agent \
       :
```

The demo topics, producers, and consumers start, and periodic sending and receiving of demo messages begin.

The console screen automatically opens in the browser. The storage folder for the demo environment also opens. Since demo messages are automatically sent and received, the Overview displays the throughput status.

![Console](https://i.gyazo.com/9b8ba475f9d4ddbf8622585f3cdd5f7f.png)

![folder](https://i.gyazo.com/1ee25173ab8fd06c460cf414e9f77fd2.png)

Only one agent for the demo is currently running. The number of CPUs matches the number of CPU cores (12) on the host machine.

![Single Agent](https://i.gyazo.com/ca4384d418513e2ed4bb9064fc3c65ba.png)

Let's add an agent according to the startup message.

```shell
WARPSTREAM_AVAILABILITY_ZONE=DEMO WARPSTREAM_LOG_LEVEL=warn warpstream agent \
				--defaultVirtualClusterID=vci_edbd2502_fabd_47b6_b671_3d8673b5430f \
				--agentKey=aks_axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx \
				--bucketURL=file:///var/folders/w9/4fztxrrj6lq3tstsk4qt6xlh0000gn/T/warpstream_demo2619599535 \
				--metadataURL=https://metadata.playground.us-east-1.warpstream.com \
				--httpPort=8081 \
				--kafkaPort=9093 \
				--enableClusterWideEnvironment \
				--clusterWideEnvironmentPort=9081 \
				--gracefulShutdownDuration=0s
```

![Dual Agents](https://i.gyazo.com/6a6322cd94fb74f716ab86e2542dfdca.png)

A second agent has been added. Both agents show usage, indicating that processing is distributed within the cluster.

## WarpStream Architecture
So far, we've run the Playground and Demo, but how does WarpStream operate? Let's refer to the architecture section of the official documentation.

[Architecture | WarpStream](https://docs.warpstream.com/warpstream/overview/architecture)

Nodes that make up an Apache Kafka cluster are paired with storage and managed as stateful workloads. In contrast, WarpStream requires no local disk and consists only of stateless agents communicating with object storage, with all cluster state management offloaded to the Control Plane of WarpStream Cloud. The architecture diagram is quoted from the official documentation.

![Architecture](https://i.gyazo.com/c8fe165021dcf7864d345650e732fc92.webp)

User data in WarpStream is sent and received only within the user's VPC, with only metadata for cluster management sent to WarpStream Cloud.

WarpStream separates storage and computing, which are integrated in Kafka nodes, separates data and metadata, and separates the Control Plane as a cloud service, making user agents stateless. This makes auto-scaling easier.

## Conclusion
There was an article stating that Kafka has reached a turning point, facing various architectural challenges as its use cases increase[^1].

[Kafka Has Reached a Turning Point](https://medium.com/@yingjunwu/kafka-has-reached-a-turning-point-649bd18b967f)

WarpStream is said to reduce the execution cost of Kafka to 1/10. The Pricing page states it is 80% cheaper than Kafka.

[Pricing - WarpStream - Stream More, Manage Less](https://www.warpstream.com/pricing)

It is possible to configure not only with S3 but also with S3 compatible storage like MinIO or R2.

We can see a future where Kafka cluster management is unnecessary, and a streaming environment that is cheap and easy to scale is available.

[^1]: The author learned about WarpStream from this article.
