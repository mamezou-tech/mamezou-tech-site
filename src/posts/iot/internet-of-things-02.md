---
title: IoT を使ってみる（その２：AWS IoT モノの準備編）
author: shuichi-takatsu
date: 2022-09-18
tags: AWS 
---

[前回](/iot/internet-of-things-01/)は、AWS IoTの簡単接続手順(チュートリアル)を実行してIoTデバイス(Raspberry Pi)とAWS IoTの通信を行ってみました。  
今回はチュートリアルを使わずに、AWS IoTコンソールを使って最初から「モノ」を登録していきましょう。

[[TOC]]

## 前置き

前回使用したIoTデバイス(Raspberry Pi)に”電圧降下エラー”が頻発するようになってしまい、動作が不安定になってしまいました。   
おそらく電源アダプタの劣化か、USBコネクタの不良あたりが原因でしょう。  
そのため、今後は別のIoTデバイス”ESP32”または”Arduino”(前回紹介)などの小型マイコンを使っていこうと思います。

## ESP32 とは

IoTデバイスにはいくつかの種類がありますが、前回説明したRaspberry PiやArduinoの他にSTM32、ESP32などのマイコンの系列があります。  
Raspberry PiやArduino、ESP32、STM32を物凄く簡単に説明すると  
- Raspberry Pi: イギリスの「ラズベリーパイ財団」によって開発されているマイコンで、ARM系CPUを搭載している
- Arduino: イタリアの「Arduinoプロジェクト」によって開発されているマイコンで、ARM系やその他のCPUに対応している
- STM32: STMicroelectronics社が開発したマイコンで、ARM Cortex系CPUを搭載している
- ESP32: Espressif Systems社が開発したマイコンで、安価な割にWi-Fiを内蔵している

のような感じでしょうか。  
今回は非常に安価でありながらWi-Fiも使える超お得(？)マイコンである「ESP32」をIoTデバイスとして使ってみたいと思います。  
(機種選定は完全に筆者の好みと予算の都合です。本当はRaspberry Pi 4が欲しい…)

今回「モノの登録」に使用するESP32は以下の「LOLIN D32」です。この機種はAmazonで1000円未満で購入できました。  

![](https://gyazo.com/abe78dbf3a86ef677035c0dd15f89d80.png)

リチウムイオン電池給電での運用も想定しているのか、バッテリー接続端子が付いています(今回は使用しませんが)。  
ESP32とPCとの接続は、機器本体にあるマイクロUSB端子とPC側のUSB端子をマイクロUSB変換ケーブルで繋ぎます。  
ESP32とPCを接続するときの注意点としては、安価なマイクロUSB変換ケーブルだと充電にしか対応していないケーブルがあるので、ちゃんと通信に対応したケーブルを使いましょう。  
筆者はケーブルのチェックを怠ったばかりに、CH340ドライバ(USBポートをCOMポートとして認識させArduino IDEと通信させるためのドライバ)やArduino IDEを再インストールしたりするなど、無駄に時間を使ってしまいました。

↓ 通信に対応したマイクロUSB変換ケーブル  
![](https://gyazo.com/917fbdd23c7100eec67a2f8c0c13f14a.png)

今回は「モノの登録」までを解説します。
(次回以降、ESP32側にプログラムを登録し、AWS IoT側と通信させます)

## 準備「モノの作成、証明書とキーの取得、ポリシーの作成・設定」

手順は以下の解説の流れに従います。

[AWS サーバーレスと ESP32 を使用して AWS IoT Core デバイスを構築する](https://aws.amazon.com/jp/blogs/compute/building-an-aws-iot-core-device-using-aws-serverless-and-an-esp32/)

![](https://gyazo.com/3145cd5a16708b0d69460125fa417992.png)

### モノの作成

ESP32をAWS IoTに登録していきます。

AWS IoTのコンソールから「管理」－「すべてのデバイス」－「モノ」を選択して、「モノを作成」を押します。

![](https://gyazo.com/7b53448d1af14409041d8cccd8f9aa6a.png)

「一つのもの」を選択し「次へ」を押します。  

![](https://gyazo.com/063bd417194ab6ca053d5b602c687b02.png)

「モノのプロパティを指定」で「モノの名前」を指定します。  
ここでは”モノの名前”は「ESP32-LOLIN-D32」としました。  
他の項目はデフォルトのままにして「次へ」を押します。  

![](https://gyazo.com/8abe8ddc95de5e698d2c1e169cf2aca1.png)

「デバイス証明書を設定 - オプション」で「新しい証明書を自動生成(推奨)」を選択し「次へ」を押します。  

![](https://gyazo.com/274e88b3a0d45f7a93e4cf42cc7a35af.png)

「証明書にポリシーをアタッチ - オプション」で「モノを作成」を押します。  

![](https://gyazo.com/ac15f875948c6125614c0a54eb9e3e44.png)

### 証明書とキーの取得

証明書とキーのダウンロードダイアログが表示されるので、ダイアログを操作して      
- デバイス証明書
- キーファイル
- ルートCA証明書（CA1だけでOKです）

の３つをダウンロードします。  
キーファイルはこのタイミングでしかダウンロードできないので、ダウンロードは必須です。  
「完了」ボタンを押します。

![](https://gyazo.com/09219126c85f45d02a1d368ba18fe120.png)

モノが作成されました。  
「管理」－「モノ」で作成された”モノ”が確認できます。  

![](https://gyazo.com/7b3e5dcbff7229981c847904730e075f.png)

### ポリシーの作成・設定

次に「ポリシー」を作成します。  
「セキュリティ」－「ポリシー」で「ポリシーを作成」を押します。  

![](https://gyazo.com/f77d4731717bdd880cb5c787f6adab5c.png)

ポリシー名を「ESP32-LOLIN-D32-Policy」にします。  

![](https://gyazo.com/58aa5f28e8ce615e7549be0d6c5a22fb.png)

「ポリシードキュメント」を「JSON」にして、以下のデータを設定します。  
データのうち、以下の項目は各自の環境に合わせて変更してください。  
- REGION: 自分のアカウントのリージョン名（例：ap-northeast-1）
- ACCOUNT_ID: AWSのアカウントID
- <モノの名前>: この例では「ESP32-LOLIN-D32」

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "iot:Connect",
      "Resource": "arn:aws:iot:REGION:ACCOUNT_ID:client/<モノの名前>"
    },
    {
      "Effect": "Allow",
      "Action": "iot:Subscribe",
      "Resource": "arn:aws:iot:REGION:ACCOUNT_ID:topicfilter/esp32/sub"
    },
	{
      "Effect": "Allow",
      "Action": "iot:Receive",
      "Resource": "arn:aws:iot:REGION:ACCOUNT_ID:topic/esp32/sub"
    },
    {
      "Effect": "Allow",
      "Action": "iot:Publish",
      "Resource": "arn:aws:iot:REGION:ACCOUNT_ID:topic/esp32/pub"
    }
  ]
}
```

個々の”Action”の詳細については以下のサイトの説明を御覧ください。  
[AWS IoT Core ポリシーアクション](https://docs.aws.amazon.com/ja_jp/iot/latest/developerguide/iot-policy-actions.html)

詳しい説明は次回以降に行いますが、この設定によって
- esp32/pub : パブリッシュ
- esp32/sub : サブスクライブ

のエントリーポイントを指定しています。  
「作成」ボタンを押します。

![](https://gyazo.com/c13c6c737da21b8746e796af5ae86191.png)

ポリシーが作成されました。  

![](https://gyazo.com/b0469afe49f720c24dd617daf24c1954.png)


### モノにポリシーをアタッチ

次に、モノにポリシーをアタッチします。
「管理」－「すべてのデバイス」－「モノ」で対象のモノ「ESP32-LOLIN-D32」を選択して  
「証明書タブ」をクリックし、証明書を選択します。

![](https://gyazo.com/a3a3812825007a49d648a3a330e40378.png)

「ポリシーをアタッチ」を選択します。  

![](https://gyazo.com/e6dc3182098e4e0aaa84aa3d3c5f2016.png)

先程作成したポリシー「ESP32-LOLIN-D32-Policy」を選択し「ポリシーをアタッチ」を押します。  

![](https://gyazo.com/f8d9996069c3d3e86af14df807f093e3.png)

以下のようにポリシーにアタッチできました。

![](https://gyazo.com/5b94eb3169c50ba510e04beedd279090.png)

## まとめ

AWS IoTコンソールから「モノの作成」「証明書の取得」「ポリシーの作成・設定」の操作をそれぞれ行いました。  
証明書とキーのファイルは再ダウンロードができないので、証明書とキーを無くしてしまうとAWS IoTへの接続ができなくなってしまいますので、大切に保管しておいてください。  

次回以降、IoTデバイス(ESP32)側にプログラムを登録し、簡単なPub/Sub通信を行っていきます。

過去記事インデックス：  
- [IoT を使ってみる（その１：AWS IoT チュートリアル編）](/iot/internet-of-things-01/)
