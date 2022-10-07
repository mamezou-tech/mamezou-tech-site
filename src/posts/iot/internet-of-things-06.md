---
title: IoT を使ってみる（その６：MQTTブローカー Mosquitto編）
author: shuichi-takatsu
date: 2022-10-08
---

[前回](/iot/internet-of-things-05/)記事でMQTTを紹介しました。  
今回はMQTTブローカー「Mosquitto」について説明したいと思います。

[[TOC]]

## MQTT通信のおさらい

MQTTはパブリッシュ/サブスクライブ(publish/subscribe)型のデータ配信モデル(以降、PUB/SUBモデルと略す)を採用したメッセージ通信プロトコルです。  

PUB/SUBモデルは以下の３つの要素で構成されています。  
- パブリッシャー(publisher): メッセージ送信側クライアント 
- サブスクライバー(subscriber): メッセージ受信側クライアント
- ブローカー(broker): MQTT基地局としてのサーバ

MQTT通信構成図：

![](https://gyazo.com/c9b1b5b53e4429b79974604e543b7b20.png)

MQTTではブローカーがパブリッシャーとサブスクライバーの間に入ってメッセージを仲介します。  
パブリッシャーとサブスクライバー同士が直接メッセージのやり取りをしないことが特徴です。  
ブローカーは、どのIoTデバイスがどのメッセージを購読しているのかを判断し、メッセージのフィルタリングを行い、多対多の通信を行います。  

## Mosquitto とは

「[Mosquitto](https://mosquitto.org/)(Broker)」は上図のMQTTブローカーのオープンソース実装です。  
PUB/SUB通信を行うクライアント部分の「Mosquitto Client」も提供されています。  

クラウドで提供されるMQTTブローカーにはAWSのAmazon MQ（MQTT以外のプロトコルもサポートしている）などがありますが、Amazon MQを利用するにはAWSアカウントが必要であり、ちょっとMQTTを試したいと思っても敷居が高いのが難点です。

その点、MosquittoはPCやRaspberry PiなどのIoTデバイスにインストールでき、簡単にMQTTブローカー環境を構築できます。  

## Raspberry PiにMosquittoをインストールする

Raspberry Pi(3B+)へMosquittoをインストールするは非常に簡単です。  
以下のコマンドを実行してインストールします。  

```shell
sudo apt-get install mosquitto
```

状態を確認するには、以下のコマンドを実行します。  

```shell
sudo service mosquitto status
```

サービスの状態が次のように出力されればインストールは成功です。

![](https://gyazo.com/844389088fcd5edaea2cb3e99b13db25.png)

MQTTクライアントもインストールしてみましょう

```shell
sudo apt-get install mosquitto-clients
```

## サブスクライブ

MQTTクライアントでサブスクライブしてみます。  
Raspberry Piのターミナルから以下のコマンドを実行します。  

```shell
mosquitto_sub -h localhost -t topic
```

上記のコマンドの意味を以下に示します。  
- mosquitto_sub：サブスクライブコマンド
- -h localhost：MQTTブローカーのホストに”localhost”を指定
- -t topic：サブスクライブするトピックに”topic”を指定

## パブリッシュ

MQTTクライアントでパブリッシュしてみます。  
Raspberry Piのターミナルから以下のコマンドを実行します。  

```shell
mosquitto_pub -h localhost -t topic -m "hello! MQTT"
```

上記のコマンドの意味を以下に示します。  
- mosquitto_pub：パブリッシュコマンド
- -h localhost：MQTTブローカーのホストに”localhost”を指定
- -t topic：パブリッシュするトピックに”topic”を指定
- m "hello! MQTT"：送信するメッセージに”hello! MQTT”を指定

メッセージをパブリッシュすると、サブスクライブしている側のターミナルに以下のメッセージが出力されました。

![](https://gyazo.com/21621503207f42514c94c7aca0ebb038.png)

## 複数台のIoTデバイスからパブリッシュ

この連載で使用しているIoTデバイスの ESP32 LOLIN D32 と、もう一台のデバイス ESP32 DevKitc V4 から同一トピックにメッセージを送信し、Mosquittoクライアントでメッセージを受信してみます。

送信している2台のIoTデバイス：  

![](https://gyazo.com/007a1958ec8d777dfdf5eff81fe7998c.png)

それぞれのIoTデバイスは次のメッセージを約1秒間隔で送信しています。   

- ESP32 LOLIN D32： ”payload - ESP32 LOLIN D32”
- ESP32 Devkitc V4：”payload - ESP32 Devkitc V4”

サブスクライブしているターミナル上に、上記のメッセージが1秒毎で交互に受信されているのが確認できました。

![](https://gyazo.com/a33f81a6b64019dc9fcf07cce89d0670.png)


## まとめ

MQTTブローカーのオープンソース実装である「Mosquitto」をご紹介しました。  
MosquittoをRaspberry Piにインストールして、複数台のIoTデバイスからメッセージをパブリッシュし、Mosquittoクライアントでメッセージが受信できていることを確認しました。

[IoTに関するチュートリアルや実践テクニックをまとめています。](/iot/)

IoT活用の参考になれば幸いです。
