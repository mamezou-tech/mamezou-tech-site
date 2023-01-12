---
title: IoT を使ってみる（その５：MQTT編）
author: shuichi-takatsu
date: 2022-10-02
---

このIoTの連載の中で何度も「MQTT」という言葉が出てきました。  
これまでMQTTの詳細について何も触れてこなかったので、今回はMQTTとは何かについて確認していきたいと思います。


## MQTT とは

MQTTとは「Message Queue Telemetry Transport」の略で、パブリッシュ/サブスクライブ(publish/subscribe)型データ配信モデルのメッセージプロトコルです。  
MQTTはTCP/IPを使っており、非常に軽量なプロトコルとして設計されています。  

MQTTはIBMが開発した「IBM MQ」がベースになっているようです。  
IMB MQからMQTTへの変遷については[Wikipedia](https://ja.wikipedia.org/wiki/MQTT)等に詳しく記載されています。
 
## パブリッシュ/サブスクライブ(publish/subscribe)型データ配信モデル

MQTTはパブリッシュ/サブスクライブ(publish/subscribe)型のデータ配信モデル(以降、PUB/SUBモデルと略す)を採用しています。

PUB/SUBモデルは以下の３つの要素で構成されています。  
- パブリッシャー(publisher): メッセージ送信側クライアント 
- サブスクライバー(subscriber): メッセージ受信側クライアント
- ブローカー(broker): MQTT基地局としてのサーバ

MQTTではブローカーがパブリッシャーとサブスクライバーの間に入ってメッセージを仲介し、パブリッシャーとサブスクライバー同士が直接メッセージのやり取りをしないことが特徴です。  

MQTT通信の構造

![](https://gyazo.com/bf15fdc8fc05c19eb2c664525f9385bc.png)

上記の例では、トピック「A」で、パブリッシャー(送信側)がMQTTブローカーにPublishし、サブスクライバー(受信側)がMQTTブローカーにSubscribeしています。  

## トピック

MQTTでメッセージの送受信に使われる通信エンドポイントのことを「トピック」と言います。  
HTTP通信のURLのようなものだとお考えください。

トピックの形は[前回の記事](/iot/internet-of-things-04/)で使用した  
`esp32/sub`  
や  
`esp32/pub`  
のように文字列を「/」(スラッシュ)で連結した階層構造を取ることができます。

パブリッシャーは送信先エンドポイント(トピック)を指定し、サブスクライバーは受信先エンドポイント(トピック)を指定します。
HTTP通信ではメッセージの送受信は1対1ですが、MQTTの場合は多対多の送受信が可能です。

## メッセージ保証レベル

MQTTでは以下の「メッセージ保証レベル(QoS)」を定義しています。  

QoSは”Quality of Service”の略であり、メッセージの送達保証レベルを示します。

|QoS|保証内容|
|:---:|:---:|
|0|最大1回のメッセージ送信が保証されます。<br>メッセージ受信は保証されません。|
|1|最低1回のメッセージ送信が保証されます。<br>メッセージ受信は保証されますが、<br>メッセージが重複して受信される可能性があります。|
|2|確実に1回のメッセージ送受信が保証されます。<br>未送信や重複受信はありません。|

QoS0は一番簡単で通信コストも低いですが、メッセージ送受信の確実性はありません。  
QoS1はメッセージが受信されることを保証しますが、通信が不安定な環境だと受信側アプリケーションに多重受信に対する処理が必要になります。  
QoS2は確実なメッセージ送受信を実現しますが、通信負荷はかなり上がります。送受信するIoTデバイスの数が少ない場合は問題ないでしょうが、多数のIoTデバイス間でメッセージ送受信をする場合は問題になるかもしれません。

## HTTPとの違い

MQTTはよくHTTPと比較されます。  
HTTPが安定したネットワーク環境での通信を前提にしているのに対し、MQTTは不安定なネットワーク環境や非力なデバイスでも動作するように設計されています。  

MQTT通信

![](https://gyazo.com/c9b1b5b53e4429b79974604e543b7b20.png)

HTTP通信

![](https://gyazo.com/2a839f1fa809df5d7e5c405a1984c166.png)

|比較項目|MQTT|HTTP|
|:---:|:---:|:---:|
|同期有無|非同期|同期|
|送受信の対象|多対多|１対１|
|通信モデル|パブリッシャー／サブスクライバー型|サーバ／クライアント型|

MQTTは非同期プロトコルであり、MQTTブローカーを経由することで多対多の通信を実現できます。ネットワークが不安定な環境でも利用可能です。  
HTTPは同期プロトコルであり、サーバとクライアントは1対1で通信を行う必要があります。基本的に安定したネットワーク環境で運用されることを想定しています。  

IoTのように多数のIoTデバイスが相互にメッセージをやり取りし、接続が不安定なネットワーク環境での利用が想定される場合にはMQTTが適していると考えられます。

## MQTTサンプルプログラム(ESP32用)

[前回](/iot/internet-of-things-04/)はAWS IoTのMQTTクライアントを利用してPUB/SUB通信を試しましたが、毎回AWSアカウントを利用するのは負荷が高いので、今回は簡単にMQTT通信を試すプログラムを用意しました。

Arduino IDEから以下のプログラムをIoTデバイス(以前使用した”ESP32 LOLIN D32”)に登録します。

```c
#include <WiFi.h>
#include <PubSubClient.h>

// WiFi
const char ssid[] = "XXXXX";
const char passwd[] = "xxxxxx";

// Pub/Sub MQTTブローカー
const char* mqttHost = "<IPアドレス or ホスト名>"; // MQTTのIPかホスト名
const int mqttPort = 1883;       // MQTTのポート
const int QOS = 0;                // QoS

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

const char* topic_pub = "topic_pub";     // 送信先のトピック名
const char* topic_sub = "topic_sub";     // 受信先のトピック名
const char* payload_pub = "payload - ESP32 LOLIN D32";  // 送信するデータ

void setup() {
  Serial.begin(115200);

  // initialize digital pin LED_BUILTIN as an output.
  pinMode(LED_BUILTIN, OUTPUT);

  // Connect WiFi
  connectWiFi();

  // Connect MQTT
  connectMqtt();
}

void loop() {

  // 送信処理 topic, payloadは定数で定義
  mqttClient.publish(topic_pub, payload_pub);
  digitalWrite(LED_BUILTIN, HIGH);   // turn the LED on (HIGH is the voltage level)
  delay(500);                       // wait for a second
  digitalWrite(LED_BUILTIN, LOW);    // turn the LED off by making the voltage LOW
  delay(500);                       // wait for a second

  // WiFi
  if ( WiFi.status() == WL_DISCONNECTED ) {
    connectWiFi(); 
  }
  // MQTT
  if ( ! mqttClient.connected() ) {
    connectMqtt();
  }
  mqttClient.loop();  

}

/**
 * CallBack
 */
void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  for (int i = 0; i < length; i++) {
    Serial.print((char)payload[i]);
  }
  Serial.println();
}

/**
 * Connect WiFi
 */
void connectWiFi()
{
  WiFi.begin(ssid, passwd);
  Serial.print("WiFi connecting...");
  while(WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(100);
  }
  Serial.print(" connected. ");
  Serial.println(WiFi.localIP());
}

/**
 * Connect MQTT
 */
void connectMqtt()
{
  mqttClient.setServer(mqttHost, mqttPort);
  mqttClient.setCallback(callback);
  while( ! mqttClient.connected() ) {
    Serial.println("Connecting to MQTT...");
    String clientId = "ESP32-" + String(random(0xffff), HEX);
    if ( mqttClient.connect(clientId.c_str()) ) {
      Serial.println("connected"); 
    }
    mqttClient.subscribe(topic_sub, QOS);
    delay(1000);
    randomSeed(micros());
  }
}
```

以下のWifiの設定に、自宅／職場で利用できるSSID／パスワードを指定してください。  
```c
// WiFi
const char ssid[] = "XXXXX";
const char passwd[] = "xxxxxx";
```

以下のPUB/SUB MQTTブローカーの設定に、利用できるMQTTブローカーのIPアドレスまたはホスト名を指定してください。  
今回はMQTTブローカーとして「[Mosquitto](https://mosquitto.org/)」を使用しました。  
（Mosquittoについては別の回で紹介します）
```c
// Pub/Sub MQTTブローカー
const char* mqttHost = "<IPアドレス or ホスト名>"; // MQTTのIPかホスト名
const int mqttPort = 1883;       // MQTTのポート
const int QOS = 0;                // QoS
```

トピック名と送信するメッセージについて以下のように設定しました。(任意のトピック名とメッセージを指定可能です)
```c
const char* topic_pub = "topic_pub";     // 送信先のトピック名
const char* topic_sub = "topic_sub";     // 受信先のトピック名
const char* payload_pub = "payload - ESP32 LOLIN D32";  // 送信するデータ
```

ESP32でプログラムが実行される(LEDがチカチカと点滅します)と、MQTTブローカーにメッセージが送信されます。  

MQTTブローカーのトピック「topic_pub」をサブスクライブした結果、以下のメッセージが受信されました。

![](https://gyazo.com/b58829f29570be2d395f9804b27cfd8e.png)

また、MQTTブローカーのトピック「topic_sub」にメッセージ「"hello! MQTT"」をパブリッシュした結果、ESP32側に以下のメッセージが受信されたことが確認できました。（Arduino IDEのシリアルモニタで確認）

![](https://gyazo.com/6621dc41aabd194d5c3c61771dabccca.png)

## まとめ

MQTTの仕組みと特徴をご説明しました。  
またIoTデバイスにESP32を使用し、簡単なMQTTパブリッシャーとサブスクライバーを実装しました。  
次回は、MQTTブローカー「[Mosquitto](https://mosquitto.org/)」についてご紹介したいと思います。

[IoTに関するチュートリアルや実践テクニックをまとめています。](/iot/)

IoT活用の参考になれば幸いです。
