---
title: MATLAB/SimulinkとArduinoによるLED点滅制御（Lチカ）に挑戦する
author: shuichi-takatsu
date: 2025-09-18
tags: [MATLAB, simulink, arduino, led, model]
image: true
---

## はじめに：SimulinkとArduinoで始める「Lチカ」

**「Lチカ」（LEDの点滅）** は、ハードウェア制御の入門として最も基本的な実験です。  
本記事では、**MATLAB/SimulinkとArduinoを連携させ**、LEDを点滅させるプログラムの作成方法を解説します。

---

## 開発環境の準備

- **ソフトウェア**
  - MATLAB（バージョン：R2025a）
  - Simulink（バージョン：25.1）
- **アプリ（for Simulink）**
  - Simulink Support Package for Arduino Hardware（バージョン：25.1.0）
- **ハードウェア**
  - Arduino Uno/Nano（または互換機）
  - USBケーブル（PCとArduinoの通信用）
- **（オプション）**
  - LED + 抵抗（330Ω程度）
  - ブレッドボード、ジャンパワイヤ

### 環境構築の詳細手順：

#### 1. MATLAB と Simulink をインストール
- MathWorks の公式サイトからインストーラをダウンロードします  
- ライセンス認証を行い、MATLAB と Simulink をインストールします  
- インストール時に「Simulink」コンポーネントを忘れずにチェックします  

#### 2. Arduino Support Package を導入
- MATLAB を起動 → メニューから **「アドオン」 → 「ハードウェアサポートパッケージの入手」** を選択します（アドオンエクスプローラーが起動します）  
![](https://gyazo.com/9ceee87178adfec2db1a1532234d9f4b.png)

- 検索ボックスで **「Arduino」** と入力し、`Simulink Support Package for Arduino Hardware` を選択します  
![](https://gyazo.com/1ac037a6c8cb0717eb32b943603c6279.png)

- **Install** をクリックし、パッケージを導入します  
- 導入完了後、Simulinkライブラリに「Simulink Support Package for Arduino Hardware」のブロックが追加されます  
![](https://gyazo.com/ef646001e6b629551be16d102fbc76a5.png)

#### 3. Arduino のシリアル通信確認
- ArduinoボードをUSBでPCに接続すると、自動的にドライバが認識されます  
- 認識されない場合は、デバイスマネージャ（Windowsの場合）や `ls /dev/tty*`（Mac/Linuxの場合）でポートを確認します（※下図はCOM7に接続した例）  
![](https://gyazo.com/3a1f36c3ded15efa1a0b255064fe8720.png)

---

## 回路の接続

Arduino の **13番ピン** と GND に LED + 抵抗を接続します。  
（内蔵LEDを使う場合は外部配線は不要です）

回路図イメージ：
```
(Arduino 13) ----[抵抗330Ω]----|>|(LED)---- (GND)
```

---

## Simulinkモデルの作成

### 新規モデルを作成

1. Simulink を起動し、新しい「空のモデル」を作成します
![](https://gyazo.com/cdace23527b4c533399601303b5f7b57.png)

2. ブロックライブラリから以下を配置します：
   - Pulse Generator（パルス波形を生成）
![](https://gyazo.com/6b0df6c3e58e40f2e98a1b5bb224a2b4.png)

   - Digital Output（Arduinoのピン出力）：このブロックは「Simulink Support Package for Arduino Hardware」に含まれています。
![](https://gyazo.com/20a0754c9292245eaa1a7f85244011cd.png)

   - 配置したブロックを接続します：
![](https://gyazo.com/47ca7f677e8222acc896e822bf5926ed.png)

### パラメータ設定
先ほど配置したブロックのパラメータを設定します。

- **Pulse Generator**
  - パルスタイプ：「サンプルベース」
  - 時間：「シミュレーション時間を使用」
  - 振幅：１
  - 周期（サンプル数）：1000
  - パルス幅（サンプル数）：500
  - 位相遅延（サンプル数）：0
  - サンプル時間：0.001
  - ベクトルパラメータを1次元として解釈：チェックON
![](https://gyazo.com/6b876f9cb98643fcac7181116f861c6b.png)

- **Digital Output**
  - Pin番号：13
![](https://gyazo.com/7186e934cc55fcf82814ba0c01067c47.png)

:::info
サンプル時間が「0.001」(秒)で、サンプル周期が「1000」なので、周期(時間)は「1（秒）」になります。  
パルス幅を「500」にしているので、この設定では500ミリ秒毎にLEDがON/OFFを繰り返します。
:::

### モデル設定
ハードウェア実行を以下のように設定します。  
（今回、Arduino Nano互換機を使用しました。互換機のブートローダーが旧版だったため、アプリケーションダウンロードのボーレートが低くなっています）  
  - ハードウェア実行
![](https://gyazo.com/032099d6556f02ee155fe6e574bf984d.png)

---

## パルスジェネレータの出力確認
Arduinoにアプリケーションをアップロードする前に、パルスが正しく出力されているか確認します。  

1. 信号のログを設定します（接続線をクリックし、「信号のログ」を設定）
![](https://gyazo.com/31f387eef75d6c23817b4b73db1cd534.png)↓
信号のログが設定されたことをアイコンで確認できます
![](https://gyazo.com/b69de6f744961a53bb98befb214be63a.png)

2. シミュレーションを実行します
![](https://gyazo.com/bc9cba6c4fc136cf9fe37732c72bdb4e.png)

3. データインスペクタでパルス波形を確認できます
![](https://gyazo.com/916a9aacabd53bddc703740a90b0c8fc.png)

---

## 監視と調整（USBポート経由での実行確認）
USB経由でArduino Nanoにプログラムを転送し、正しくプログラムが動くか確認します。

1. ハードウェアタブから「監視と調整」を実行します（終了時間には「inf」を設定します。停止操作をするまで実行を続けます）
![](https://gyazo.com/762cd9896aebc396b0be64f9772ba9cb.png)

2. Arduino の内蔵LEDが1秒周期で点滅すればモデルは正しく実行されています
![](https://gyazo.com/a6d9b1019ceb29cc92523ad3bd6890b9.png)

---

## Arduinoへの書き込みと実行
プログラムをArduinoにアップロードし、自動実行できるようにします。

1. Simulink の「ビルド、展開起動」を実行します
![](https://gyazo.com/e3b97bb638ba9f6f7c68296969acfeef.png)

2. コンパイル → Arduinoへ転送
　転送が成功すると、以下のログが出力されます。    
　LEDが1秒ごとに点滅すれば、転送は成功です。  
![](https://gyazo.com/b2f102adc2e50a980ae93b782e7aef66.png)

---

## 実行結果と考察

- わずか2つのブロックを接続するだけで、簡単にLED点滅プログラムを作成できました。 
- 周期を短くすると「高速点滅」します（例えば、周期を100、パルス幅を50 など）。
- パルス幅（Duty比）を変更することで、**明るさの制御（PWMの基本）** にも応用できます。

---

## まとめ

- MATLAB/SimulinkとArduinoを組み合わせることで、**ブロック線図ベースで直感的に制御プログラムを開発できる** ことがわかりました。     
- LED点滅は単純な例ですが、PWM制御・センサ入力・モータ制御などへ拡張可能です。  

ただLEDを点滅させるだけだったら、Arduino IDEやPlatformIOなどの開発環境でプログラミングした方が早いと思いますが、今後複雑なプログラミングをしていく上で、MATLAB/SimulinkはMBD開発の強力なツールになると感じました。  
今後は、自作ライブラリを作ったり、高度な周辺機器をつないで細かいプログラミングに挑戦していきたいと思います。   

---

<style>
img {
    border: 1px gray solid;
}
</style>
