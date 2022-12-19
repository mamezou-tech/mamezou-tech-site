---
title: IoT を使ってみる（その１１：FreeRTOSタスク優先度編）
author: shuichi-takatsu
date: 2022-12-19
---

[前回](/iot/internet-of-things-10/)は「FreeRTOS」のタスクを紹介しました。  
今回は前回説明できなかったタスクの挙動が優先度でどのように変わるのかを見ていきたいと思います。  

[[TOC]]

## サンプルプログラム

COMポートに”HIGH”、”LOW”の文字を出力する２つのタスクを用意しました。  
タスクの優先度は初期値として両方とも「２」を設定しています。  
タスクには以下の２つの処理
- COMポートへの”HIGH”または”LOW”の文字出力
- LEDの点灯または消灯（COMポート以外に視覚的に挙動を確認するため）

が実装され、処理が終わった後は自発的にBlocked状態に移行します。  
前回説明しましたが、Blocked状態は、一時的なイベントまたは外部イベントのいずれかを待機している状態です。  
例えばタスクが vTaskDelay() を呼び出した場合、遅延期間 (一時的なイベント) が期限切れになるまでブロックされます。  
今回のプログラムでは、タスクの待ち時間(遅延期間)は1000チック時間を設定しています。  

```c
#if CONFIG_FREERTOS_UNICORE
#define ARDUINO_RUNNING_CORE 0
#else
#define ARDUINO_RUNNING_CORE 1
#endif

#ifndef LED_BUILTIN
#define LED_BUILTIN 13
#endif

// 変更する値
#define PRI_HIGH  2 // タスクHIGHの優先度
#define PRI_LOW  2  // タスクLOWの優先度
#define TASK_DELAY  1000 // タスクの待ち時間

// define two tasks for Blink & AnalogRead
void Task_BlinkHigh( void *pvParameters );
void Task_BlinkLow( void *pvParameters );

// the setup function runs once when you press reset or power the board
void setup() {
  
  // initialize serial communication at 115200 bits per second:
  Serial.begin(115200);

  // initialize digital LED_BUILTIN on pin 13 as an output.
  pinMode(LED_BUILTIN, OUTPUT);
  
  // Now set up two tasks to run independently.
  xTaskCreatePinnedToCore(
    Task_BlinkHigh
    ,  "Task_BlinkHigh"   // A name just for humans
    ,  1024  // This stack size can be checked & adjusted by reading the Stack Highwater
    ,  NULL
    ,  PRI_HIGH  // Priority, with 3 (configMAX_PRIORITIES - 1) being the highest, and 0 being the lowest.
    ,  NULL 
    ,  ARDUINO_RUNNING_CORE);

  xTaskCreatePinnedToCore(
    Task_BlinkLow
    ,  "Task_BlinkLow"   // A name just for humans
    ,  1024  // This stack size can be checked & adjusted by reading the Stack Highwater
    ,  NULL
    ,  PRI_LOW  // Priority, with 3 (configMAX_PRIORITIES - 1) being the highest, and 0 being the lowest.
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

void Task_BlinkHigh(void *pvParameters)  // This is a task.
{
  (void) pvParameters;
  
  for (;;) // A Task shall never return or exit.
  {
    digitalWrite(LED_BUILTIN, HIGH);   // turn the LED on (HIGH is the voltage level)
    Serial.println("HIGH");
    vTaskDelay(TASK_DELAY);  // one tick delay (15ms) in between reads for stability
  }
}

void Task_BlinkLow(void *pvParameters)  // This is a task.
{
  (void) pvParameters;

  for (;;) // A Task shall never return or exit.
  {
    digitalWrite(LED_BUILTIN, LOW);    // turn the LED off by making the voltage LOW
    Serial.println("LOW");
    vTaskDelay(TASK_DELAY);  // one tick delay (15ms) in between reads for stability
  }
}
```

## 同じ優先度で実行

２つのタスクを同じ優先度「２」で実行してみます。   
```c
#define PRI_HIGH  2 // タスクHIGHの優先度
#define PRI_LOW  2  // タスクLOWの優先度
```

優先度が同じなので、両方のタスクがBlocked状態からReady状態に移行したときに、呼び出されるタスクの優先度に優劣はありません。  

![](https://gyazo.com/c447d410afc67642737665bfc4326106.png)

前回説明しましたが、Ready状態は、実行可能 (BlockedまたはSuspendedではない) であるが、同等またはより高い優先度の別のタスクが既に実行状態にあるため、現在実行されていない状態を言います。  

２つのタスクの処理時間(待ち時間を含め)はほぼ同じなので、COMポートへの出力結果は以下のようになると予想しました。  
```
HIGH
LOW
HIGH
LOW
HIGH
LOW
HIGH
LOW
…(以下繰り返し)
```

実行結果を確認します。  
出力結果は以下のようになりました。  
```
HIGH
LOW
LOW
HIGH
HIGH
LOW
LOW
HIGH
…(以下繰り返し)
```
プログラムを実行する前に予想した出力結果とは異なります。  

プログラム実行時の出力として、  
最初に
```
HIGH
LOW
```
が出力された後、
```
LOW
HIGH
```
が出力され、以降は上記の２つのパターンの繰り返しとなりました。  
２つのタスクは
- 優先度も同じ
- 待ち時間も同じ
- 内部処理も(ほぼ)同じ

なので、プログラムを記述した順番で交互に実行されると考えましたが、実際は想定とは異なりました。  
同じ優先度のタスクの実行順番を、待ち時間や処理時間で予測することは難しいようです。  
このあたりの挙動はFreeRTOSのスケジューラの実装に依存するのかもしれません。(そもそも、タスクの記述の順番で起動順序を予測するなんて邪道ですね)

## 異なる優先度で実行

次に、優先度を変えて実行してみます。  
タスクHIGHを優先度「２」、タスクLOWを優先度「１」で実行してみます。  
```c
#define PRI_HIGH  2 // タスクHIGHの優先度
#define PRI_LOW  1  // タスクLOWの優先度
```

今回の設定の場合、タスクHIGHがRunning状態からBlocked状態を経てReady状態になれば、タスクLOWと競合したとしても、タスクHIGHの方がタスクLOWより”必ず”優先的に実行されるはずです。  
FreeRTOSのスケジューラがそのように制御してくれます。  

実行結果を確認します。  
出力結果は以下のようになりました。  
```
HIGH
LOW
HIGH
LOW
HIGH
LOW
HIGH
LOW
…(以下繰り返し)
```

予想通り、HIGH → LOW が定期的に繰り返されました。  

## 特別な優先度「０（ゼロ）」

今度は１つのタスクの優先度を「０（ゼロ）」に設定してみます。    
タスクHIGHを優先度「２」、タスクLOWを優先度「０」で実行してみます。  
```c
#define PRI_HIGH  2 // タスクHIGHの優先度
#define PRI_LOW  0  // タスクLOWの優先度
```

実行結果を確認します。  
出力結果は以下のようになりました。  
```
HIGH
HIGH
HIGH
HIGH
HIGH
HIGH
HIGH
HIGH
…(以下繰り返し)
```

タスクLOWが一切実行されなくなってしまいました。  
これはどういうことでしょうか？  
FreeRTOSの説明書を確認すると、タスク優先度が「０」のタスクは「アイドル・タスク」に分類されるようです。  
アイドル・タスクはアクティブな機能は持っていないので、アイドル設定をするとタスクを実行させることができません。  
(アイドル・タスクフックという機能を使うとアイドル・タスクをアプリケーションで使用できるようですが、今回は本機能の説明はしません)

ちなみに、
```c
#define PRI_HIGH  0 // タスクHIGHの優先度
#define PRI_LOW  0  // タスクLOWの優先度
```
と設定しプログラムを実行すると、結果がまったく出力がされなくなりました。

## まとめ

今回はFreeRTOSのタスクの優先度を変えることによってタスクの挙動がどのようになるかを解説しました。  
タスクの実行を制御する方法は優先度だけではありません。次回はタスクの実行を制御する”排他制御”についてご説明したいと思います。  

[IoTに関するチュートリアルや実践テクニックをまとめています。](/iot/)

IoT活用の参考になれば幸いです。
