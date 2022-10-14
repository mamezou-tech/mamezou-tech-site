---
title: IoT を使ってみる（その７：MQTTクライアント paho編）
author: shuichi-takatsu
date: 2022-10-15
---

[前回](/iot/internet-of-things-06/)記事でMQTTブローカー「Mosquitto」を紹介しました。  
今回はMQTTクライアント「paho」について紹介したいと思います。  

[[TOC]]

## paho とは

[paho](https://www.eclipse.org/paho/index.php?page=clients/python/index.php)はPython製の通信ライブラリです。  
2022/10/14の段階でMQTT v5.0、MQTT v3.1.1、および v3.1 をサポートしています。  
Python 2.7系、3.x系で使用できます。  

## paho インストール

使い方は非常に簡単です。  
pip または conda でインストールします。  
condaの場合、チャンネルに「conda-forge」を指定します。

pipでのインストール
```shell
pip install paho-mqtt
```

conda でのインストール
```shell
conda install -c conda-forge paho-mqtt
```

## パブリッシャー／サブスクライバーのサンプル実装

Pythonでパブリッシャー／サブスクライバーのクライアントプログラムを作成してみましょう。  

サブスクライバー：  
```python
import paho.mqtt.client as mqtt

# 定数定義
host = '127.0.0.1'
port = 1883
topic = 'topic/data'

# 接続
def on_connect(client, userdata, flags, rc):
    # 戻り値チェック
    print("Connected with result code " + str(rc))
    # サブスクライブ
    client.subscribe(topic)

# 受信
def on_message(client, userdata, msg):
    print('topic:[' + msg.topic + '] payload:[' + str(msg.payload) + ']')

if __name__ == '__main__':
    # プロトコルを v3.1.1 を指定
    client = mqtt.Client(protocol=mqtt.MQTTv311)
    # ハンドラー設定
    client.on_connect = on_connect
    client.on_message = on_message
    # 接続
    client.connect(host, port=port, keepalive=60)
    # 受信ループ
    client.loop_forever()
```

パブリッシャー：  
```python
import paho.mqtt.client as mqtt

# 定数定義
host = '127.0.0.1'
port = 1883
topic = 'topic/data'
payload = 'Hello MQTT!'

# プロトコルを v3.1.1 を指定
client = mqtt.Client(protocol=mqtt.MQTTv311)
# 接続
client.connect(host, port=port, keepalive=60)
# パブリッシュ
client.publish(topic, payload)
# 切断
client.disconnect()
```

定数として、以下を指定しています。  
皆さんの環境にあわせて変更してください。  
- host: MQTTブローカーが稼働しているサーバのIPアドレスを指定  
- port: MQTTブローカーが稼働しているサーバのポート番号を指定
- topic: パブリッシュ/サブスクライブするトピック名を指定
- payload: メッセージを指定（パブリッシャーのみ）

## 実行

ローカルにMQTTブローカーがインストールされており、ポートが1883に設定されている前提で、上記のプログラムを実行させます。  
サブスクライバー・パブリッシャーを実行させると、以下のようにメッセージがコンソールに表示されます。

![](https://gyazo.com/b7e18332587495aa89bfc409140da625.png)

## まとめ

MQTTクライアント「paho」を用いて、サブスクライバーとパブリッシャーの実装を行い、MQTTメッセージ通信を試すことができました。  
pahoは導入が非常に簡単なので、MQTT環境構築後の通信チェックに有用だと思います。  

[IoTに関するチュートリアルや実践テクニックをまとめています。](/iot/)

IoT活用の参考になれば幸いです。
