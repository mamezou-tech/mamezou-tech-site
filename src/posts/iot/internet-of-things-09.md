---
title: IoT を使ってみる（その９：FreeRTOS基本編）
author: shuichi-takatsu
date: 2022-12-04
---

今回はESP32などの安価なIoTデバイスで利用できるRTOS(Real Time Operating System)の「FreeRTOS」を紹介したいと思います。


## FreeRTOS とは

[FreeRTOS](https://www.freertos.org/)はフリーに利用できるRTOS(Real Time Operating System)です。  
上記の説明ではただ単語に分解しただけなので、もう少し詳しく説明しましょう。

FreeRTOS は以前は”例外条項付きGPL”の下で配布されていましたが、現在はAmazonが権利を保有しています。  
現在はオープンソースのMITライセンスで公開されています。  

FreeRTOSは「RTOS」という名前の通り「リアルタイム処理」に特化したOSであり、私達が一般的に使用しているWindows、macOS、Linuxとは適用分野が異なります。  
主に組み込み系で使用されており、多種多様なアーキテクチャのCPU向けに移植されています。  

## RTOS とは

昨今の代表的なOS(オペレーティングシステム)は、複数のプログラムを同時に実行させることができます。  
Windows、macOS、Liunxでは音楽を聞きながら、エディタでプログラムを書きつつ、その裏でファイルをコピーしたり、ソースコードをコンパイルしたりなど、いくつものプログラムを同時に実行することができます。  

上記のように複数のプログラムが同時に動作することを「マルチタスク」と言います。

しかし実際には、CPUの各コアは１度に１つのプログラムしか実行できません。  
複数のプログラムが同時に実行している”ように”見えるのは、OSが各々のプログラムの実行を高速で切り替えて、あたかも全てのプログラムが同時に動いているかのように見せているだけです。  
プログラムの実行を管理するOSの機能を「スケジューラ」と呼びます。

複数のプログラムがすべて同じ優先度で実行されるべきものなら、CPUの処理時間を各々のプログラムに均等に割り振ってプログラムを順番に実行させていけば問題は起こりません。  
しかし一部のプログラムが担当する処理が緊急を要する処理だった場合、「処理の順番が回ってくるのを待つ」では必要な処理が必要なタイミングで実行できないことになってしまいます。  

例えば、私達がパソコンで文書を記述したいとき、なかなかエディタが起動しなかったとしても「ちょっと処理が遅くなった」程度で、エディタの起動を待ってから文章を記述していけば大きな問題にはなりません。 
しかし、走行中の自動車が前方に歩行者を検知して、衝突回避機能が働いたときに「その処理はちょっと待っててね」なんて事になったら大事故になってしまいます。

多くの RTOS では、実行するプログラムに「優先順位」を割り当てることができるようになっています。
RTOS のスケジューラが優先順位を判断して、次に実行すべきプログラムを指定します。

## FreeRTOS以外のRTOS

FreeRTOS には２つの派生OSがあります。  
１つは「SafeRTOS」と呼ばれています。SafeRTOS は産業、医療、自動車業界などの厳しい要件を満たすための FreeRTOS カーネルの派生バージョンです。  
もう１つは「OpenRTOS」と呼ばれています。OpenRTOS は専用サポートを含む FreeRTOS カーネルの商用ライセンス版です。FreeRTOSとコードベースを共有しています。

その他に ITRON というRTOSもあります。  
ITRONは国産OSで、このOSも様々なデバイスで利用されています。  
昔のガラケーを知っている人ならば「iモード」という言葉を聞いたことがあるでしょう。このiモードでITRONは随分と活躍したようです。
ITRON仕様の技術開発成果を出発点とした「TOPPERSプロジェクト」もあります。  

私が社会人になったばかりの頃は VxWorks や QNX などをよく使用しましたが、当時から30年以上が経過して RTOS の選択肢もかなり増えました。

## ESP32 LOLIN で RTOS

今回は「基本編」として、本「IoTを使ってみる」シリーズで使用している ESP32 LOLIN という小型IoTデバイス上で FreeRTOS のサンプルを実行させてみましょう。

開発環境には Arduino IDE を使用します。（IDEのインストール説明は[こちら](/iot/internet-of-things-03/)）  

Arduino IDE を起動します。  
「ファイル」－「スケッチ例」－「ESP32」－「FreeRTOS」を選択します。

![](https://gyazo.com/101db38b82e3dbfd13694c6619d5fd71.png)

以下のような「スケッチ」の雛形が作成されます。

![](https://gyazo.com/61f9ec4dce26886c450cd43fca867355.png)

## Lチカ と COM出力 サンプル

まず、ESP32 LOLIN デバイスを Arduino IDE が起動しているPCにUSBで接続します。  
デバイスをUSBケーブルで接続すると、仮想COMポートがデバイスマネージャに登録されます。

先程作成したスケッチの雛形を以下のソースコードで置き換えてください。  

```c
#if CONFIG_FREERTOS_UNICORE
#define ARDUINO_RUNNING_CORE 0
#else
#define ARDUINO_RUNNING_CORE 1
#endif

#ifndef LED_BUILTIN
#define LED_BUILTIN 13
#endif

// define two tasks for Blink & AnalogRead
void TaskBlink( void *pvParameters );
void TaskAnalogReadA3( void *pvParameters );

// the setup function runs once when you press reset or power the board
void setup() {
  
  // initialize serial communication at 115200 bits per second:
  Serial.begin(115200);
  
  // Now set up two tasks to run independently.
  xTaskCreatePinnedToCore(
    TaskBlink
    ,  "TaskBlink"   // A name just for humans
    ,  1024  // This stack size can be checked & adjusted by reading the Stack Highwater
    ,  NULL
    ,  2  // Priority, with 3 (configMAX_PRIORITIES - 1) being the highest, and 0 being the lowest.
    ,  NULL 
    ,  ARDUINO_RUNNING_CORE);

  xTaskCreatePinnedToCore(
    TaskAnalogReadA3
    ,  "AnalogReadA3"
    ,  1024  // Stack size
    ,  NULL
    ,  1  // Priority
    ,  NULL 
    ,  ARDUINO_RUNNING_CORE);

  // Now the task scheduler, which takes over control of scheduling individual tasks, is automatically started.
}

void loop()
{
  // Empty. Things are done in Tasks.
}

/*--------------------------------------------------*/
/*---------------------- Tasks ---------------------*/
/*--------------------------------------------------*/

void TaskBlink(void *pvParameters)  // This is a task.
{
  (void) pvParameters;

/*
  Blink
  Turns on an LED on for one second, then off for one second, repeatedly.
    
  If you want to know what pin the on-board LED is connected to on your ESP32 model, check
  the Technical Specs of your board.
*/

  // initialize digital LED_BUILTIN on pin 13 as an output.
  pinMode(LED_BUILTIN, OUTPUT);

  for (;;) // A Task shall never return or exit.
  {
    digitalWrite(LED_BUILTIN, HIGH);   // turn the LED on (HIGH is the voltage level)
    vTaskDelay(500);  // one tick delay (15ms) in between reads for stability
    digitalWrite(LED_BUILTIN, LOW);    // turn the LED off by making the voltage LOW
    vTaskDelay(500);  // one tick delay (15ms) in between reads for stability
  }
}

void TaskAnalogReadA3(void *pvParameters)  // This is a task.
{
  (void) pvParameters;
  
/*
  AnalogReadSerial
  Reads an analog input on pin A3, prints the result to the serial monitor.
  Graphical representation is available using serial plotter (Tools > Serial Plotter menu)
  Attach the center pin of a potentiometer to pin A3, and the outside pins to +5V and ground.

  This example code is in the public domain.
*/

  for (;;)
  {
    // read the input on analog pin A3:
    int sensorValueA3 = analogRead(A3);
    // print out the value you read:
    Serial.println(sensorValueA3);
    vTaskDelay(1000);  // one tick delay (15ms) in between reads for stability
  }
}
```

その後、コンパイルと書き込み を実行します。  

![](https://gyazo.com/39ae44596111cde3ab44888db90d1a98.png)

プログラムがコンパイルされ、ESP32 LOLIN デバイスに書き込みが完了します。  

## 実行確認

プログラムの書き込みが完了すると、すぐにプログラムが実行されます。  
細かい説明は次回以降に持ち越しますが、以下の２点が確認できればプログラムは正常に動作しています。

- ESP32 LOLIN デバイスのLEDが0.5秒間隔で点灯・消灯を繰り返す。
- COMポートから1秒間隔で数値が出力されている。

接続しているCOMポートの番号はPCの環境によって変わりますので、デバイスマネージャで確認してください。  
また、今回アナログ入力を接続していないので、COMポートから出力される数値は「０」になっていると思います。（筆者の環境ではCOM7に出力されました）

![](https://gyazo.com/d3758e9d623ddc8fc206942e0a6a597e.png)

## まとめ

ESP32などの安価なIoTデバイスを使ってFreeRTOSを動作させることができました。  
次回以降、FreeRTOSの構造やタスクの設計方法などを紹介していきたいと思います。

[IoTに関するチュートリアルや実践テクニックをまとめています。](/iot/)

IoT活用の参考になれば幸いです。
