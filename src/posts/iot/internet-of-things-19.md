---
title: IoT を使ってみる（その１９：ESP32の LightSleep 機能で省電力運転に挑戦する）
author: shuichi-takatsu
date: 2025-05-11
tags: [esp32, lightsleep, esp-idf, vscode]
image: true
---

## はじめに

[以前の記事](/iot/internet-of-things-15/)では ESP32 の DeepSleep 機能を活用して、長時間のバッテリー駆動を実現する方法を紹介しました。  
今回はその発展として、**LightSleep（ライトスリープ）機能**に挑戦します。

LightSleep は DeepSleep ほどの電力削減はできないものの、システムの状態やメモリを保持したまま短時間で復帰できるのが特徴です。たとえば、外部入力にすばやく反応しながら電力も節約したい、というようなユースケースに向いています。

この記事では、VSCodeとESP-IDF (Ver 5.4.1) を使用した開発環境で、ESP32のLightSleep機能を活用する方法を、具体的なサンプルコードとともに解説します。

---

## 開発環境

開発環境は以下の通りです。
- OS: Ubuntu 24.04（WSL2）
- IDE: Visual Studio Code
- ESP-IDF 拡張機能「Espressif IDF」: 1.10.0
- ESP-IDF バージョン: **v5.4.1**
- ターゲット: ESP32 開発ボード（ESP-WROOM-32等）

---

## ESP32の動作モード

ESP32には、動作モードに応じて複数の省電力モードが用意されています。

* アクティブモード: 通常動作時。全ての機能が利用可能ですが、消費電力は最も大きくなります。
* Modem Sleep: Wi-Fi/Bluetoothモデムの電源をOFFにし、CPUは動作し続けるモード。消費電力を抑えつつ、CPU処理は継続したい場合に利用します。
* **Light Sleep**: CPU、RAM、一部ペリフェラルの状態を保持したまま、多くのデジタルペリフェラルとRFモジュールのクロックをゲート（停止）または電源をOFFにします。CPUは一時停止しますが、RAMの内容は保持されるため、ウェイクアップ（復帰）が非常に高速です。アクティブモードより大幅に消費電力を削減しつつ、DeepSleepより速く処理を再開できます。
* Deep Sleep: CPUやほとんどのRAM、デジタルペリフェラルの電源をOFFにします。RTC（リアルタイムクロック）コントローラとULP（超低電力）コプロセッサのみ動作可能です。消費電力は最も小さくなりますが、ウェイクアップ後はリセットシーケンスからプログラムが開始されるため、状態の復元に工夫が必要です。

---

## LightSleep とは

LightSleepモードは、ESP32がCPUを一時停止させ、主要なクロックを停止することで消費電力を削減する省電力モードです。  
重要なのは、CPUのレジスタやRAMの内容が保持される点で、ウェイクアップ時にはスリープ直前の状態から処理を再開できます。  
これにより、DeepSleepのように起動シーケンス全体を実行する必要がなく、非常に高速な復帰が可能です。

### LightSleepのメリット

* 高速なウェイクアップ： マイクロ秒オーダーでの復帰が可能で、イベントへの応答性が求められる用途に適しています。
* 状態保持： RAMの内容やCPUのコンテキストが保持されるため、スリープ前の変数の値などをそのまま利用できます。
* 多様なウェイクアップ要因： GPIO、タイマー、UART、Wi-Fi、Bluetooth LE、タッチパッドなど、多彩な要因でウェイクアップできます。
* 中程度の省電力効果： アクティブモードと比較して大幅な電力削減が見込めます。

### LightSleepのデメリット・考慮点

* DeepSleepよりは消費電力が大きい： 超低消費電力を追求する用途ではDeepSleepが有利です。
* ペリフェラルの状態： LightSleep中も一部ペリフェラルは電力を消費する可能性があり、システム全体の消費電力は周辺回路にも依存します。

## DeepSleep との比較

以前使用した「[DeepSleep](/iot/internet-of-things-15/)」との比較表は以下のようになります。  
| モード | 消費電力 | 復帰速度 | メモリ保持 | 外部割り込み対応 |
|--------|------------|------------|-------------|-------------------|
| LightSleep | 中程度     | 非常に高速 | ○           | ○                 |
| DeepSleep  | 非常に低い | 数ms〜数百ms | ×         | ○（GPIO/タイマ） |

LightSleepは以下のような、適度な省電力と迅速な応答性が求められるアプリケーションに適しています。  
- 普段はスリープし、センサー値の変化やユーザー入力があった場合、即座に処理を開始するデバイス。  
- 定期的に短時間のデータ処理や通信をして、それ以外の時間はスリープするシステム。  
- バッテリー駆動でありながら、ユーザー操作への即時反応が求められるリモコンやウェアラブルデバイスの一部機能。
  
---

## サンプル回路図

LightSleep 動作を目視で確認できるように 赤色LED を ESP32 に接続した回路を作りました。  

以下の回路は、GPIO23 から出力される信号で LED を点灯させる構成です。  
GPIO出力が HIGH のときに LED が点灯する シンプルな **プッシュプル（電源とGNDの間に負荷を接続する）構成**です。

```text
ESP32
GPIO23 o────┐
            │ 
         [330Ω]（抵抗）
            │  
           |>| （赤色LED）
            │
           GND
```
- `|>|` は赤色LEDを表しています（アノードが上、カソードが下）
- GPIO23 を `HIGH` にすると、電流が GND に流れて LED が点灯します
- GPIO23 を `LOW` にすると、電流が流れず LED は消灯します

## サンプルプログラム（C言語）

さっそくプログラムを作って、LightSleepを体験してみましょう。

### プロジェクトの構造

ESP32のLightSleep機能プロジェクトのディレクトリ構造（VSCode＋ESP-IDF拡張機能）を以下に示します。
```text
esp32_light_sleep/
├── CMakeLists.txt
├── sdkconfig.defaults
├── main/
│   ├── CMakeLists.txt
│   └── main.c
```
- `CMakeLists.txt`: プロジェクト全体のビルド設定
- `sdkconfig.defaults`: 初期設定のKconfig（省電力設定含む）
- `main/`: アプリケーション本体
  - `main.c`: GPIOやLightSleep制御を記述したメインコード
  - `CMakeLists.txt`: `main.c` をビルド対象に登録

必要に応じて `components/` ディレクトリや `Kconfig` を追加して拡張も可能です。

### 定義ファイル

`sdkconfig.defaults` の定義を以下に示します。
```ini
CONFIG_PM_ENABLE=y
CONFIG_PM_DFS_INIT_AUTO=y
CONFIG_PM_LIGHTSLEEP_RTC_OSC_CAL_INTERVAL=1
```
- `CONFIG_PM_ENABLE`: 電源管理機能を有効化。
- `DFS_INIT_AUTO`: 周波数スケーリングを自動初期化。
- `RTC_OSC_CAL_INTERVAL`: RTCクロックの補正間隔（1秒ごと）を設定。

CMakeLists.txt については内容のみ記載し、同様の解説は[こちら](/blogs/2025/05/03/esp-idf-vsc-extension-2/)で詳しくしているので、ここでは割愛します。  

`CMakeLists.txt`
```cmake
cmake_minimum_required(VERSION 3.5)
include($ENV{IDF_PATH}/tools/cmake/project.cmake)
project(esp32_light_sleep)
```

`main/CMakeLists.txt`
```cmake
idf_component_register(SRCS "main.c"
                    INCLUDE_DIRS ".")
```

### プログラムファイル

メインプログラムを以下に示します。  

`main/main.c`
```c
#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"
#include "esp_sleep.h"
#include "esp_log.h"
#include "esp_rom_gpio.h"

#define TAG "LightSleep"

#define WAKEUP_GPIO GPIO_NUM_0        // BOOTボタン
#define LED_GPIO    GPIO_NUM_23       // LEDピン

void configure_gpio()
{
    // LED設定
    esp_rom_gpio_pad_select_gpio(LED_GPIO);
    gpio_set_direction(LED_GPIO, GPIO_MODE_OUTPUT);

    // Wakeupピン設定
    esp_rom_gpio_pad_select_gpio(WAKEUP_GPIO);
    gpio_set_direction(WAKEUP_GPIO, GPIO_MODE_INPUT);
    gpio_pulldown_en(WAKEUP_GPIO);  // 安定化のため
    gpio_pullup_dis(WAKEUP_GPIO);
}

void enter_light_sleep()
{
    ESP_LOGI(TAG, "設定: GPIO %d の LOW レベルで復帰", WAKEUP_GPIO);
    ESP_ERROR_CHECK(esp_sleep_enable_gpio_wakeup());
    gpio_wakeup_enable(WAKEUP_GPIO, GPIO_INTR_LOW_LEVEL);

    ESP_LOGI(TAG, "LightSleep に入ります。BOOTボタンを押してください。");
    gpio_set_level(LED_GPIO, 0);  // LED消灯

    // LightSleep突入
    ESP_ERROR_CHECK(esp_light_sleep_start());
}

void app_main(void)
{
    configure_gpio();

    while (1) {
        enter_light_sleep();

        // 復帰後の処理
        ESP_LOGI(TAG, "復帰しました！");
        gpio_set_level(LED_GPIO, 1);  // LED点灯

        // 5秒間起動状態を維持
        vTaskDelay(pdMS_TO_TICKS(5000));
    }
}
```

## プログラムの解説

LED点灯用のGPIOには23番ピンを使用しました。  
GPIO 0 は通常、ESP32開発ボード上の **BOOTボタン** に接続されています。  
BOOTボタンを押すと GPIO0 が **LOW** になります。  
本プロジェクトでは、この LOW をトリガとして LightSleep から復帰します。  

個々の関数の詳細について以下に解説します。  

### GPIO 設定（`configure_gpio`）

GPIOピンの `LED_GPIO` と `WAKEUP_GPIO` のモード設定をします。

```c
esp_rom_gpio_pad_select_gpio(LED_GPIO);
gpio_set_direction(LED_GPIO, GPIO_MODE_OUTPUT);
```
`LED_GPIO` ピンの設定をします。  
- `esp_rom_gpio_pad_select_gpio()`  
  → ピンを GPIO として使用するように設定します（他のペリフェラル機能からの切り替え）。
- `gpio_set_direction(..., GPIO_MODE_OUTPUT)`  
  → ピンの方向を出力に設定。LED を点灯・消灯するために使用します。

```c
esp_rom_gpio_pad_select_gpio(WAKEUP_GPIO);
gpio_set_direction(WAKEUP_GPIO, GPIO_MODE_INPUT);
gpio_pulldown_en(WAKEUP_GPIO);
gpio_pullup_dis(WAKEUP_GPIO);
```
`WAKEUP_GPIO` ピンの設定をします。  
- `esp_rom_gpio_pad_select_gpio()`  
  → ピンを GPIO として使用するように設定します（他のペリフェラル機能からの切り替え）。
- `gpio_set_direction(..., GPIO_MODE_INPUT)`  
  → ピンを入力モードに設定し、外部信号（ボタン押下）を検出できるようにします。
- `gpio_pulldown_en()`  
  → プルダウン抵抗を有効化。ボタンが押されていないときにピンが LOW に保たれ、ノイズやフローティングを防止します。
- `gpio_pullup_dis()`  
  → プルアップ抵抗を無効化。プルアップとプルダウンは同時使用しないのが基本です。

### スリープ移行と復帰処理（`enter_light_sleep`）

この関数は GPIO による復帰設定を行い、安全に LightSleep に突入させます。  
GPIO の LOW 信号（BOOTボタン押下）で復帰するため、ユーザーインタラクションと連携したスリープ制御が可能です。  

```c
ESP_ERROR_CHECK(esp_sleep_enable_gpio_wakeup());
gpio_wakeup_enable(WAKEUP_GPIO, GPIO_INTR_LOW_LEVEL);
```
- `esp_sleep_enable_gpio_wakeup()`  
  → GPIO を用いたスリープからの復帰を有効にします（APIの事前呼び出しが必須）。
- `gpio_wakeup_enable(..., GPIO_INTR_LOW_LEVEL)`  
  → 指定したピン（BOOTボタン）に **LOW レベル** の信号が入ったときに復帰するよう設定します。

```c
gpio_set_level(LED_GPIO, 0);  // LED消灯
```
- スリープ中は無駄な電力を消費しないよう、LED を消灯します。

```c
ESP_ERROR_CHECK(esp_light_sleep_start());
```
- この関数を呼び出すと、ESP32 は LightSleep モードに入ります。
  復帰トリガ（この場合は GPIO0 の LOW）を検知するまで処理はブロックされます。
  復帰後はこの関数から復帰し、続きの処理が `app_main()` 側で再開されます。

### メイン処理（`app_main`）

```c
configure_gpio();
```
- アプリケーションの開始時に、GPIO（LED・BOOTボタン）の設定をします。
- この初期化を行うことで、LED の制御やスリープ復帰の検出が可能になります。

```c
enter_light_sleep();
```
- GPIO 復帰条件を設定し、LED を消灯した状態で LightSleep に入ります。
- BOOTボタンの押下で復帰するまで、この関数内でブロックされます。

```c
gpio_set_level(LED_GPIO, 1);  // LED点灯
```
- LED を点灯して「動作中」であることを視覚的に示します。

```c
vTaskDelay(pdMS_TO_TICKS(5000));
```
- FreeRTOS のタスク遅延関数を使用して、他タスクへの CPU 時間の譲渡も含めて5秒間待機します。

## 電力消費量の比較

今回作成した回路で アクティブモード と LightSleep モードでの電力消費量を比較してみました。

結果は以下のようになりました。
- アクティブ： 72 mW
- LightSleep： **13 mW**

※アクティブ時にはLEDの点灯にかなり電力を取られていると思いますので、消費電力は参考程度にしてください。

アクティブ時
![](https://gyazo.com/731d5849c4066def082b157df18c4f91.png)

LightSleep
![](https://gyazo.com/cfbe9ba3d46e70e1f9e9b65d16ad05a9.png)

※画像では分かりづらいですが、アクティブ時にはLEDが点灯しています。

以前の DeepSleep を使った時よりはかなり電力を消費していますが、それでもかなり省電力になっていることがわかると思います。

## 応用例

LightSleep 機能は以下のような用途に向いています。
- ボタンやセンサー入力待機時に最小限の消費電力で待機
- 短時間で応答するインタラクティブな機器（例：タッチパネル機器）
- 外部イベントに即時反応する必要があるセンサー端末

## 注意点

LightSleep 使用時は UART 通信が途切れるため、シリアルログを確認する際は、出力タイミングに注意が必要です。  
GPIO 割り込みの条件設定（Lowレベル or Highレベル）はボードの実装に依存します。  

## まとめ

今回は ESP32 の **LightSleep 機能**を利用して、省電力かつ高応答性のアプリケーションを実現する方法を紹介しました。  
DeepSleep より電力消費は多いものの、外部イベントに対する即時復帰が求められる用途には最適です。  
今後は、**LightSleepとWi-Fi通信の連携**や、**複数の復帰条件を組み合わせた高度な省電力設計**にも触れてみたいと思います。

[IoTに関するチュートリアルや実践テクニックをまとめています。](/iot/)

IoT活用の参考になれば幸いです。

<style>
img {
    border: 1px gray solid;
}
</style>
