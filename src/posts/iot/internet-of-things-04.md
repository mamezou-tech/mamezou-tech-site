---
title: IoT を使ってみる（その４：AWS IoT MQTT PUB/SUB編）
author: shuichi-takatsu
date: 2022-09-19
tags: AWS 
---

[前々回(AWS IoT モノの準備編)](/iot/internet-of-things-02/)、[前回(AWS IoT プログラム編)](/iot/internet-of-things-03/)で、AWS IoTとIoTデバイスを接続するための準備ができました。  
今回は双方向にデータ通信をさせて、IoT接続が確立していることを確認していきましょう。

[[TOC]]

## AWS IoT MQTTテストクライアント

[初回](/iot/internet-of-things-01/)のチュートリアルでも使用した「AWS IoT MQTTテストクライアント」を使用します。

![](https://gyazo.com/5252a4f67641bd7ec2b9cefe95d00e26.png)

[前回](/iot/internet-of-things-03/)作成したプログラムを書き込んだIoTデバイス(ESP32 LOLIN D32)をPCのUSBポートに接続します。  
仮想COMポートが何番に割り当てられているかは個々の環境によって異なると思いますが、私の環境ではCOM7に割り当てられていました。

![](https://gyazo.com/51017f37822bfd6131ed88b8de8825b9.png)

## サブスクリプション（IoTデバイス → AWS IoT）

IoTデバイス上で動作しているプログラムにおいて、パブリッシング(送信)を担当するコードは以下の部分です。  

```c
void publishMessage()
{
  StaticJsonDocument<200> doc;
  doc["time"] = millis();
  doc["sensor_a0"] = analogRead(0);
  char jsonBuffer[512];
  serializeJson(doc, jsonBuffer); // print to client

  client.publish(AWS_IOT_PUBLISH_TOPIC, jsonBuffer);
}
```
- time: 時刻
- sensor_a0: アナログ入力

がJSONフォーマットに変換されて AWS_IOT_PUBLISH_TOPIC で定義されたトピック（="esp32/pub"）に送出されます。

データを受信してみましょう。  
MQTTテストクライアントに以下のように設定します。  

「トピックをサブスクライブする」タブを選択し、「トピックのフィルター」に「esp32/pub」を設定し、「サブスクライブ」ボタンを押します。  
サブスクリプションのリストに「esp32/pub」が登録されます。  
(※サブスクリプションするのに「esp32/pub」を設定するのは、IoTデバイス側が”esp32/pub”トピックにメッセージを送出するので、このトピックでサブスクライブする必要があるためです)

![](https://gyazo.com/95caac5781721a27c24eb8301f2ead1b.png)

IoTデバイス(ESP32 LOLIN D32)が正常に動いていれば(Lチカで動作の確認ができます)、約１秒間隔で以下のようなログがページの右側に表示されるのが確認できます。  

![](https://gyazo.com/741c853a67fcea58f80f9cafcce8e9c7.png)

これでIoTデバイス側からAWS IoT側にMQTTでメッセージが送信されていることが確認できました。

## パブリッシング（AWS IoT → IoTデバイス）

次にAWS IoT(クラウド)側からIoTデバイスにメッセージを送出してみます。  

IoTデバイスはデータを受信したらCOMポートに受信データを出力するようにしています。  
出力フォーマットは
`"incoming: " + <トピック名> + " - " + <送信データ>`  
です。

```c
void messageHandler(String &topic, String &payload) {
  Serial.println("incoming: " + topic + " - " + payload);

//  StaticJsonDocument<200> doc;
//  deserializeJson(doc, payload);
//  const char* message = doc["message"];
}
```

受信データを確認するために、Arduino IDEの「シリアルモニタ」を起動します。  

![](https://gyazo.com/bbeaa5f6deef76fd7cb2a453837a0f20.png)

シリアルモニタのダイアログが表示されました。  
ダイアログの上部に今回の監視対象であるCOMポート番号が表示されていることを確認します。  

![](https://gyazo.com/ecc392d459553ffe87ade6ea30e3a608.png)

次はAWS IoT側の準備をします。  
「トピックを公開する」タブを以下のように設定します。  
- トピック名: esp32/sub
- メッセージのペイロード: 任意の文字列

(※パブリッシングするのに「esp32/sub」を設定するのは、IoTデバイス側が”esp32/sub”トピックでサブスクライブしているので、このトピックにパブリッシングする必要があるためです)

![](https://gyazo.com/a847b40d6b1f1904b339ceae7f5a7e1e.png)

「発行」ボタンを押します。  
AWS IoTクラウドからメッセージが送出され、IoTデバイスがメッセージを受信すると、シリアルモニタに受信したメッセージが出力されます。

![](https://gyazo.com/403687f1df35f1bf14f085cf20e346ca.png)

これでAWS IoT側からIoTデバイス側にMQTTでメッセージが送信されていることが確認できました。

## まとめ

AWS IoTとIoTデバイス間で、MQTTを用いてPUB/SUBメッセージ通信をさせることができました。  
MQTTは多対多のメッセージを効率よくやり取りでき、IoT時代のメッセージ通信と言われています。  
今後もIoTに関する話題をお届けしていこうと思います。

過去記事インデックス：  
- [IoT を使ってみる（その１：AWS IoT チュートリアル編）](/iot/internet-of-things-01/)
- [IoT を使ってみる（その２：AWS IoT モノの準備編）](/iot/internet-of-things-02/)
- [IoT を使ってみる（その３：AWS IoT プログラム編）](/iot/internet-of-things-03/)
