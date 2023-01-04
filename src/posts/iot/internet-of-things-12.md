---
title: IoT を使ってみる（その１２：FreeRTOS排他制御編）
author: shuichi-takatsu
date: 2023-01-05
---

[前回](/iot/internet-of-things-11/)は「FreeRTOS」のタスク優先度を考察しました。  
今回は「排他制御」について見ていきたいと思います。  

[[TOC]]

## 排他制御とは

複数のタスクが並列実行するプログラムにおいて、複数のタスクから利用される”共有資源"が存在する場合、複数のタスクが同時に”共有資源”にアクセスすると、”共有資源”に不整合が発生する場合があります。  
”共有資源”には、メモリや外部機器などが該当します。  

一定の条件下で一つのタスクに”共有資源”を優先利用させ、他のタスクからは”共有資源”を利用させないようにすることを”排他制御”と言います。  
このようにすることで”共有資源”の整合性を保ちます。

## サンプルプログラム

基本的に[前回](/iot/internet-of-things-11/)と同じです。

COMポートに”HIGH”、”LOW”の文字を出力する２つのタスクを用意しました。  
タスクの優先度は初期値として両方とも「２」を設定しています。  
タスクには以下の２つの処理
- COMポートへの”HIGH”または”LOW”の文字出力
- LEDの点灯または消灯（COMポート以外に視覚的に挙動を確認するため）

が実装されています。  

今回、”共有資源”は、  
`COMポートへの”HIGH”または”LOW”の文字出力`  
`LEDの点灯または消灯（COMポート以外に視覚的に挙動を確認するため）`  
になります。  

これら”共有資源”の排他制御に「セマフォ」を使用します。

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
#define SEM_BLOCK_TIME  portMAX_DELAY // セマフォのブロック時間 (portMAX_DELAY は待ち時間無し)

// Declare a mutex Semaphore Handle which we will use to manage the Serial Port.
// It will be used to ensure only one Task is accessing this resource at any time.
SemaphoreHandle_t xSerialSemaphore;

// define two tasks for Blink & AnalogRead
void Task_BlinkHigh( void *pvParameters );
void Task_BlinkLow( void *pvParameters );

// the setup function runs once when you press reset or power the board
void setup() {
  
  // initialize serial communication at 115200 bits per second:
  Serial.begin(115200);

  // Semaphores are useful to stop a Task proceeding, where it should be paused to wait,
  // because it is sharing a resource, such as the Serial port.
  // Semaphores should only be used whilst the scheduler is running, but we can set it up here.
  if ( xSerialSemaphore == NULL )  // Check to confirm that the Serial Semaphore has not already been created.
  {
    xSerialSemaphore = xSemaphoreCreateMutex();  // Create a mutex semaphore we will use to manage the Serial Port
  }

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
    // See if we can obtain or "Take" the Serial Semaphore.
    // If the semaphore is not available, wait blocktime ticks of the Scheduler to see if it becomes free.
    //Serial.println("Wait Take Semaphore - HIGH");
    if ( xSemaphoreTake( xSerialSemaphore, ( TickType_t ) SEM_BLOCK_TIME ) == pdTRUE )
    {
      digitalWrite(LED_BUILTIN, HIGH);   // turn the LED on (HIGH is the voltage level)
      Serial.println("HIGH");
      vTaskDelay(TASK_DELAY);  // one tick delay (15ms) in between reads for stability

      xSemaphoreGive( xSerialSemaphore ); // Now free or "Give" the Serial Port for others.
    } else {
      Serial.println("Not Take Semaphore - HIGH");
    }
  }
}

void Task_BlinkLow(void *pvParameters)  // This is a task.
{
  (void) pvParameters;

  for (;;) // A Task shall never return or exit.
  {
    // See if we can obtain or "Take" the Serial Semaphore.
    // If the semaphore is not available, wait blocktime ticks of the Scheduler to see if it becomes free.
    //Serial.println("Wait Take Semaphore - LOW");
    if ( xSemaphoreTake( xSerialSemaphore, ( TickType_t ) SEM_BLOCK_TIME ) == pdTRUE )
    {
      digitalWrite(LED_BUILTIN, LOW);    // turn the LED off by making the voltage LOW
      Serial.println("LOW");
      vTaskDelay(TASK_DELAY);  // one tick delay (15ms) in between reads for stability

      xSemaphoreGive( xSerialSemaphore ); // Now free or "Give" the Serial Port for others.
    } else {
      Serial.println("Not Take Semaphore - LOW");
    }    
  }
}
```

## セマフォとは

セマフォは、複数の並列実行されるタスクが”共有資源”にアクセスする際に、”共有資源”の使用権を制御する仕組みです。  
セマフォを使用することで、複数のタスクから同時に利用すると不整合が発生してしまう”共有資源”を、不整合を発生させることなく利用できます。  

タスクは”共有資源”の使用権を得るためにセマフォを「獲得」する必要があります。  
タスクがセマフォを獲得すると、獲得している間だけ”共有資源”を優先的に利用します。  
他のタスクはセマフォが「解放」されるまで待つことになります。  
”共有資源”を優先利用しているタスクは”共有資源”の利用が終わったときにセマフォを”明示的”に解放します。  

上記のプログラム中でセマフォを「生成」「獲得」「解放」している部分を見ていきましょう。

## セマフォ生成

プログラムの以下の部分でセマフォを生成しています。  

```c
if ( xSerialSemaphore == NULL )
{
  xSerialSemaphore = xSemaphoreCreateMutex();
}
```

xSemaphoreCreateMutex() コマンドはセマフォを生成し、戻り値としてセマフォ・ハンドルを返します。

## セマフォ獲得

プログラムの以下の部分でセマフォを獲得しています。  

```c
if ( xSemaphoreTake( xSerialSemaphore, ( TickType_t ) SEM_BLOCK_TIME ) == pdTRUE )
{
  // 処理
}
```

xSemaphoreTake() コマンドは引数に
- セマフォ・ハンドル
- ブロック時間

を受け取ります。  
セマフォ・ハンドルは xSemaphoreCreateMutex() で生成したものを渡します。  
ブロック時間には Tick秒 もしくは portMAX_DELAY を指定できます。  
Tick秒が指定された場合、Tick秒が経過するまでにセマフォを獲得できなかった場合、この関数はFalseを戻します。  
portMAX_DELAY を指定した場合は、セマフォを獲得するまでこの関数から戻らずに無限にブロックされます。

セマフォを獲得できた場合、この関数はTrueを戻します。  
プログラムでは「セマフォが獲得できた」＝「共有資源へのアクセスが許可された」としてその後の処理を実行しています。  

## セマフォ解放

プログラムの以下の部分でセマフォを解放しています。  

```c
xSemaphoreGive( xSerialSemaphore );
```

xSemaphoreGive() コマンドは引数に
- セマフォ・ハンドル

を受け取ります。  

プログラムは共有資源の利用が終わったら、xSemaphoreGive() コマンドを実行して”明示的”にセマフォを解放します。  
解放を忘れると他のタスクが共有資源にアクセスができなくなってしまいます。  

## プログラム実行(タスク優先度：同じ)

前回と同様に、タスクの優先度を同じ（優先度：２）にしてタスクを実行します。  
HIGH と LOW の文字列が交互に出力されることを期待します。  

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
…(以下繰り返し)セマフォハンドル
```

期待した実行結果と合致しています。  
共有資源が正しく”排他制御”されて、２つのタスク間で交互に利用されていることがわかります。

## プログラム実行(タスク優先度：異なる)

タスクの優先度を以下のように変更してみます。  
どのような実行結果になるか予想してみてください。

```c
#define PRI_HIGH  2 // タスクHIGHの優先度
#define PRI_LOW  3  // タスクLOWの優先度
```

実行結果を確認します。  
出力結果は以下のようになりました。  

```
LOW
LOW
LOW
LOW
LOW
LOW
LOW
LOW
…(以下繰り返し)
```

共有資源が ”LOWタスク”にのみ集中してしまいました。  
これは何故なのでしょうか？

## タスクの挙動確認

プログラム中の以下の２行のコードのコメントを外してコードを有効化します。  
プログラムを実行し、セマフォの獲得の状況を確認します。  

```c
Serial.println("Wait Take Semaphore - HIGH");
```

```c
Serial.println("Wait Take Semaphore - LOW");
```

実行結果を確認します。  
出力結果は以下のようになりました。  

```
Wait Take Semaphore - LOW
LOW
Wait Take Semaphore - HIGH
Wait Take Semaphore - LOW
LOW
Wait Take Semaphore - LOW
LOW
Wait Take Semaphore - LOW
LOW
Wait Take Semaphore - LOW
LOW
```

上記を見る限り、  
`Wait Take Semaphore - HIGH`
が出力されていますので、HIGHタスクはセマフォを獲得しようとしていることがわかります。  
しかし、セマフォの獲得に至らずに獲得待ち状態のようです。  

その代わりに、LOWタスクは毎回セマフォを獲得して処理を実行できています。  
なぜ、このような動作になるのでしょうか？

各々のタスクは、セマフォを獲得している間、  
　vTaskDelay(TASK_DELAY);   
コマンドで Blocked状態に移行しますが、Blocked状態中もセマフォを獲得したままなので、もう片方のタスクはセマフォ獲得待ちのままで処理を先に進めることが出来ません。  
そして Blocked状態から復帰したときには、LOWタスクの方が優先度が高く設定されているので、やはりLOWタスク側が優先して実行されてしまいます。

## まとめ

今回はFreeRTOSの共有資源を制御する「セマフォ」を見てみました。  
次回は、ESP32に外部機器を接続してデータを取得してみたいと思います。

[IoTに関するチュートリアルや実践テクニックをまとめています。](/iot/)

IoT活用の参考になれば幸いです。
