---
title: IoT を使ってみる（その１０：FreeRTOSタスク編）
author: shuichi-takatsu
date: 2022-12-12
---

[前回](/iot/internet-of-things-09/)はESP32などの安価なIoTデバイスで利用できる「FreeRTOS」を紹介しました。  
今回はFreeRTOSの詳細に入っていきたいと思います。


## FreeRTOSのタスク

FreeRTOS では処理を実行する単位を「タスク」として構造化します。  
各タスクは、システム内の他のタスクやスケジューラ自体に依存することなく、独自のコンテキスト内で実行されます。  
任意の時点で実行できるタスクは 1 つだけであり、FreeRTOS スケジューラがどのタスクを実行させるかを決定します。  
タスク自身は、スケジューラがどのタイミングで自分に処理を実行させるつもりなのかを知りません。  
逆にいうと、タスク自身はいつ自分が起動すべきかということをタスク自身で制御する必要はありません。  
タスクをサスペンド、ブロック、実行させる責務はスケジューラにあります。

## タスクの状態遷移

FreeRTOSのタスクは、次のいずれかの状態を取ります。

![](https://gyazo.com/c447d410afc67642737665bfc4326106.png)

- Running  
  Running状態とは、タスクが実行されている状態です。このときタスクはプロセッサを使用しています。FreeRTOS が実行されているプロセッサにコアが 1 つしかない場合、任意の時点で実行中状態にあるタスクは 1 つだけです。  

- Ready  
  Ready状態とは、実行可能 (BlockedまたはSuspendedではない) であるが、同等またはより高い優先度の別のタスクが既に実行状態にあるため、現在実行されていない状態を言います。

- Blocked  
  Blocked状態とは、一時的なイベントまたは外部イベントのいずれかを待機している状態です。例えばタスクが vTaskDelay() を呼び出した場合、遅延期間 (一時的なイベント) が期限切れになるまでブロックされます。また、タスクは、キュー、セマフォなどのイベントを待機する場合もブロックされます。通常、Blockedのタスクには「タイムアウト」が設定されます。タイムアウト時間を経過したタスクは、待機していたイベントが発生していなくてもブロックが解除されます。Blocked状態のタスクは処理時間を消費せず、選択して実行状態にすることはできません。

- Suspended  
  Suspended状態は、処理を中断している状態です。Blocked状態のタスクと同様に、Suspended状態のタスクを選択してRunning状態にすることはできません。しかしSuspended状態のタスクにはタイムアウトがありません。タスクは、vTaskSuspend() および xTaskResume() API 呼び出しを介して明示的に命令された場合にのみ、Suspended状態に移行または終了します。

## コルーチン とは

FreeRTOSには”コルーチン”という概念があります。  
もともとは非常に小さなデバイスで使用するために実装されたようですが、最近では使用されることほとんど無いようです。  
今回、コルーチンについては詳しく言及しません。  
コルーチンの状態遷移は以下のようになります。  

![](https://gyazo.com/c70fc81a4bc3c1659cec076a183c1e61.png)

## タスクの実装

### タスクの宣言

以下のようにタスク(関数)の宣言をします。

```c
void Task_sample( void *pvParameters );
```

### タスクの実装

タスク(関数)は void を返し、void ポインタを唯一のパラメータとして受け取る関数として定義されます。  
タスクは基本は無限ループとして実装されます。  
ただし、優先度の低いタスクに処理時間の割当がされるように、何らかのイベントで処理がブロックされるように実装します。  
(以下のサンプルでは無意味にディレイを繰り返すだけです)

pvParameters にはタスクの起動時に渡される引数が入ります。

```c
void Task_sample(void *pvParameters)
{
  (void) pvParameters;
  
  for (;;) // 無限ループ
  {
    // 処理
    vTaskDelay(500);  // 実際には意味のある実装をする
  }
}
```

### タスクの呼び出し

ESP32シリーズのFreeRTOSで実装されている
`xTaskCreatePinnedToCore`メソッド  
を見ていきます。

以下はタスク呼び出しの実装例です。  

```c
  xTaskCreatePinnedToCore(
    Task_sample             // 関数名
    ,  "Task_sample"        // 識別名
    ,  1024                 // スタックサイズ
    ,  NULL                 // 
    ,  0                    // 優先度
    ,  NULL                 // 
    ,  ARDUINO_RUNNING_CORE
  );

```

上記の呼び出しにおいて、さきほど実装した「Task_sample」が呼び出されています。

xTaskCreatePinnedToCore関数の定義を  
`freertos/FreeRTOS-Kernel/include/freertos/task.h`  
で確認します。

```c
BaseType_t xTaskCreatePinnedToCore( 
  TaskFunction_t pxTaskCode,
  const char * const pcName,
  const configSTACK_DEPTH_TYPE usStackDepth,
  void * const pvParameters,
  UBaseType_t uxPriority,
  TaskHandle_t * const pvCreatedTask,
  const BaseType_t xCoreID );
```

引数の意味を以下に示します。  

- pxTaskCode  
タスクエントリ関数へのポインタです。  
タスクは決して戻らないように実装する(つまり無限ループ)か、vTaskDelete 関数を使用して終了する必要があります。

- pcName  
タスクにつける識別名です。  
これは主にデバッグを容易にするために使用されます。  

- usStackDepth  
バイト数として指定されたタスクのスタックサイズです。  

- pvParameters  
作成されるタスクのパラメータへのポインタです。

- uxPriority  
タスクを実行する優先度です。  
(configMAX_PRIORITIES - 1) が最大値であり、最小値は0として定義されています。今回のESP32実装では最大値は3のようです。  

- pvCreatedTask  
作成されたタスクを参照できるハンドルを返すために使用されます。

- xCoreID  
タスクが固定される CPU のインデックス番号を示します。  
ESP32実装の場合「CONFIG_FREERTOS_UNICORE」が定義されていた場合は0、それ以外は1が設定されるようです。

## Lチカを無理やりマルチタスク

今回はLチカを”無理やり”マルチタスクで組んでみます。  
(Lチカごときにマルチタスクを用いる必要はまったくないのですが)

今回の実装で重要な点はタスクの「優先度」だけです。  
今回はタスクを２つ用意し、両方のタスクの優先度を「２」に統一しました。

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
    ,  2  // Priority, with 3 (configMAX_PRIORITIES - 1) being the highest, and 0 being the lowest.
    ,  NULL 
    ,  ARDUINO_RUNNING_CORE);

  xTaskCreatePinnedToCore(
    Task_BlinkLow
    ,  "Task_BlinkLow"   // A name just for humans
    ,  1024  // This stack size can be checked & adjusted by reading the Stack Highwater
    ,  NULL
    ,  2  // Priority, with 3 (configMAX_PRIORITIES - 1) being the highest, and 0 being the lowest.
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
    vTaskDelay(500);  // one tick delay (15ms) in between reads for stability
  }
}

void Task_BlinkLow(void *pvParameters)  // This is a task.
{
  (void) pvParameters;

  for (;;) // A Task shall never return or exit.
  {
    digitalWrite(LED_BUILTIN, LOW);    // turn the LED off by making the voltage LOW
    Serial.println("LOW");
    vTaskDelay(500);  // one tick delay (15ms) in between reads for stability
  }
}
```

## 実行

上記のプログラムを実行した結果は以下のようになりました。  
(結果はCOMポートから出力されるログで確認します)

![](https://gyazo.com/1721c1d7f165aa2173ea82b7057e4f04.png)

んん？なんか変ですね。  
同じ処理が２回づつ実行されているように見えます。
タスクを正しく切り替えて実行させていくために必要な処理については、次回以降に説明します。

## まとめ

今回はFreeRTOSのタスク状態とタスク実装方法、タスク呼び出しの引数の意味を確認しました。  
次回はタスクの挙動やFreeRTOSの構造をもう少し詳しく見ていきたいと思います。

[IoTに関するチュートリアルや実践テクニックをまとめています。](/iot/)

IoT活用の参考になれば幸いです。
