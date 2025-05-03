---
title: ESP-IDFプロジェクトの構成とCMakeの仕組みを徹底解説！（VSCode＋ESP-IDF拡張機能）
author: shuichi-takatsu
date: 2025-05-03
tags: [vscode, esp32, esp-idf, cmake, sdkconfig, kconfig]
image: true
---

## はじめに

以前、「[VSCodeのESP-IDF拡張機能「Espressif IDF」を使ってみる](/blogs/2023/02/19/esp-idf-vsc-extension/)」という記事を書いてから随分と時間が経過してしまいました。  
今回は「**ESP-IDFプロジェクトがどう組み立てられているか**」「**CMakeの仕組みはどうなっているのか**」に注目して解説していきます。  

[ESP-IDF](https://www.espressif.com/en/products/sdks/esp-idf) は、[**CMake**](https://cmake.org/) という「ビルドシステムジェネレーター」を採用しています。  
CMakeにより、ビルドプロセスを特定の環境やツールに依存しない形で記述・管理できます（クロスプラットフォーム対応）。  
普段あまり触れない `CMakeLists.txt` や ESP-IDF 独自の `sdkconfig`、`idf.py` の仕組みをきちんと理解することで、より柔軟で拡張性の高い開発ができるようになります。  

また、今回の記事と直接関係ありませんが、ESP-IDFではビルドシステムに [**Ninja（ニンジャ）**](https://github.com/ninja-build/ninja) を使用できます。  
Ninja がインストールされていれば、デフォルトで Ninjaが使用されます。  
Ninja は超高速なビルドシステムです。CMakeなどのビルド生成ツールが作ったビルドルールを元に、効率的にソースコードをコンパイル・リンクして実行可能ファイルなどを作成します。  

これまで [PlatformIO](https://platformio.org/) を多用していましたが、細かい設定等は ESP-IDF の機能を呼び出す必要がるので、最近は ESP-IDF を勉強中です。  
以前、ESP-IDF を使っていたとき、ビルドの遅さに辟易しておりましたが、Ninja を使うようになってビルドがとても高速化されたので、ストレスなく使えます。  

## 開発環境バージョン

本記事で使用した主な環境のバージョンは以下です。
- ESP-IDF: 5.4.1
- CMake: 3.28.3
- Ninja: 1.11.1
- OS: Ubuntu 24.04 (on WSL2)

## 対象読者

- ESP32開発を ESP-IDF で始めたばかりの方
- `CMakeLists.txt` の編集に不安がある方
- 自作ライブラリや再利用可能な部品をプロジェクトに追加したい方

## ESP-IDFプロジェクトの基本構成

[以前の記事](/blogs/2023/02/19/esp-idf-vsc-extension/)で ESP-IDF開発環境のインストールは済んでいる前提で話を進めます。  

「New Project」を選択し、プロジェクトを作成します。
![](https://gyazo.com/0f8409da6b0708eeff090ca384d80cc4.png)

「プロジェクト名」「プロジェクト・ディレクトリ」「ボード」「シリアル通信ポート」をそれぞれ設定します。  
（コンポーネントディレクトリは設定しなくてOKです）  
![](https://gyazo.com/01c447e5486618f2121dab6f985d470a.png)

「template-app」を選択し「Create project using template template-app」をクリックします。
![](https://gyazo.com/499a7b7cef96f964c0df80ee2954100e.png)

作成された ESP-IDFのプロジェクト構成は以下のようになります。  
```makefile
my_project/ 
├── CMakeLists.txt      ← プロジェクト全体のCMake設定 
├── sdkconfig           ← menuconfigの設定内容が反映される設定ファイル 
├── build/              ← ビルド出力が格納される（自動生成） 
├── main/ 
│ ├── CMakeLists.txt    ← ソースファイル指定のCMake設定
│ └── main.c            ← エントリーポイント（メインプログラム）
├── .gitignore          ← git除外設定
```

## main/CMakeLists.txt の意味

main/CMakeLists.txt はデフォルトでは以下のようになっています。  
```cmake
idf_component_register(SRCS "main.c"
                       INCLUDE_DIRS "")
```

この idf_component_register() が重要です。  
idf_component_register() は 現在のCMakeLists.txt が属するコンポーネントの情報を登録するための関数です。  

以下のような意味を持ちます。  
| 引数 | 指定された値 | 内容・説明 |
| ------------- | ---------- | :--------- |
| `SRCS`           | `"main.c"`     | このコンポーネントを構成する**C/C++ソースファイル**を指定します。<br>この例では、`main.c` というファイルがこのコンポーネントのソースファイルとして登録されます。<br>複数のファイルを指定することも可能です。 <br>ESP-IDFでは main も「コンポーネント」として扱われます。|
| `INCLUDE_DIRS`   | `""`           | このコンポーネントのソースファイル(`main.c`)をコンパイルする際に必要となる**プライベートなヘッダーファイル**が格納されているディレクトリを指定します。<br>ここで指定されたディレクトリは、他のコンポーネントからは通常参照されません。<br>この例では `""`（空文字列）が指定されており、このコンポーネント内部だけで参照するようなインクルードディレクトリは特にない、ということを意味します。 |

## プロジェクトルートの CMakeLists.txt の意味

プロジェクトルートの CMakeLists.txt はデフォルトでは以下のようになっています。
```cmake
cmake_minimum_required(VERSION 3.5)
include($ENV{IDF_PATH}/tools/cmake/project.cmake)
project(my_project)
```

以下のような意味を持ちます。  
| コマンド | 内容・説明 |
| ---------- | :------------ |
| `cmake_minimum_required(VERSION 3.5)`             | この `CMakeLists.txt` ファイルを処理するために必要となるCMakeの**最低バージョン**を指定します。<br>この例では、バージョン3.5以上のCMakeが必要です。もしインストールされているCMakeのバージョンがこれより古い場合、エラーが発生して処理が停止します。 |
| `include($ENV{IDF_PATH}/tools/cmake/project.cmake)` | ESP-IDFのビルドシステムを動作させるために不可欠な、**基本的な設定やカスタム関数・マクロ**を定義したCMakeスクリプトファイルを読み込みます。<br>`$ENV{IDF_PATH}` はESP-IDFがインストールされているディレクトリを示す**環境変数 `IDF_PATH`** の値を参照します。<br>このため、ビルドを実行する前に `IDF_PATH` が正しく設定されている必要があります。<br>この `include` コマンドによって、`idf_component_register` のようなESP-IDF固有の関数が使えるようになります。 |
| `project(my_project)`                             | ビルド対象となる**プロジェクトの名前**を定義します。<br>この例では、プロジェクト名は `my_project` となります。<br>このコマンドを実行すると、CMakeはプロジェクト名 (`PROJECT_NAME`)、プロジェクトのソースディレクトリ (`PROJECT_SOURCE_DIR`)、ビルドディレクトリ (`PROJECT_BINARY_DIR`) といった重要な変数を設定します。 |

通常このファイルは編集不要ですが、カスタム設定を追加したいときに変更します。  

## sdkconfig の意味

sdkconfig は、ESP-IDF プロジェクトの設定ファイルで、開発時のビルドオプションや機能の有効・無効を管理する中心的なファイルです。
sdkconfig は Kconfig システム を使って生成されます。（「Kconfig システム」については後述しますので、今はとりあえず「開発時のビルドオプションや機能の有効・無効を管理するファイル」とだけ思っておいてください）  

sdkconfig には以下のように書かれていますので、手動での変更はやめた方が良いです。
```ini
#
# Automatically generated file. DO NOT EDIT.
# Espressif IoT Development Framework (ESP-IDF) 5.4.1 Project Configuration
#
```

以下の menuconfig サブコマンドで設定すると、内容が sdkconfig に反映されます。（idf.pyコマンドについては後述します）
```bash
idf.py menuconfig 
```
また、VSCodeの以下のメニューからも「menuconfig」が操作できます。
![](https://gyazo.com/e6bffd630e0c18a8f6dd440a8d5e6f2c.png)

VSCodeの menuconfig はGUIで簡単に操作できるようになっています。  
設定内容を保存するには「Save」ボタンを押します。  
![](https://gyazo.com/c7a6a0f2e04e6201a71b58f59489498a.png)


sdkconfig に設定されている内容は以下のようなものです。（ESP-IDFのバージョンによっては多少違うかもしれません）  
たとえばUARTのボーレートや、Wi-Fiの有効化などがここで定義されます。  
| カテゴリ               | 設定例                                              |
| :---------------------- | :----------------------------------------------------- |
| ボードやチップ関連     | チップ種別（ESP32/ESP32-S3など）                    |
| 周辺機能               | UART, SPI, I2C, Wi-Fi, BLEなどの有効化              |
| FreeRTOS設定           | タスク数、スタックサイズ、Tick周期など              |
| ログ出力               | LOG_LEVEL の設定（DEBUG, INFO, WARNなど）           |
| コンポーネントごとの設定 | 例：SPIFFSを使うかどうか、Wi-Fiの最大接続数など       |

※ sdkconfig に独自の定義を追加することも出来ます（追加方法は後述します）。  

### 条件付きコンパイル

ビルドシステム（CMake）は sdkconfig に設定した内容をもとにソースコードを条件付きでコンパイルします。

たとえば、sdkconfig に以下のような設定があるとします。  
```ini
CONFIG_MY_LED_ENABLE=y
CONFIG_MY_LED_GPIO=2
```

以下のように、コード中で条件付きコンパイルに使えます。  
```c
#include <stdio.h>
#include "driver/gpio.h"

void app_main(void)
{
#ifdef CONFIG_MY_LED_ENABLE
    gpio_reset_pin(CONFIG_MY_LED_GPIO);
    gpio_set_direction(CONFIG_MY_LED_GPIO, GPIO_MODE_OUTPUT);
    gpio_set_level(CONFIG_MY_LED_GPIO, 1);  // LED ON
#endif
}
```

### 関連ファイルとビルドへの影響

sdkconfig ファイル以外に、関係の深いファイルが２つあります。
| ファイル | 内容 |
|------|------|
| sdkconfig (設定ファイル本体) | 実際の設定値がここに保存される |
| sdkconfig.defaults | 初期値（チーム開発など、初期設定をリポジトリで管理したいときに便利） |
| build/config/sdkconfig.h | コンパイル時に参照されるヘッダ（sdkconfig から自動生成される） |

チームで開発し、成果物をGit管理するときなど、チームで必要な初期設定を `sdkconfig.defaults` に抜粋するのがお勧めです。

### sdkconfig.defaults の概要

sdkconfig.defaults は、`idf.py menuconfig` や `idf.py build` を実行したとき、まだ sdkconfig が存在しない場合にのみ初期値を適用します。  
sdkconfig がすでに存在する場合は、sdkconfig.defaults は**完全に無視**され、sdkconfig が**優先**されます。  
たとえ sdkconfig にない設定項目が sdkconfig.defaults にあっても、それは読み込まれないので注意が必要です。  

```
your_project/
├── sdkconfig.defaults        ← 初期設定はここに書く（sdkconfig が無いときだけ利用される）
├── sdkconfig                 ← menuconfig などで生成される実際の設定ファイル
├── main/
│   ├── CMakeLists.txt
│   └── ...
```

書き方・内容は sdkconfig と同じ形式です。
たとえば以下のように書きます。  
```ini
CONFIG_LOG_DEFAULT_LEVEL=3
CONFIG_PROJECT_USE_LED=y
CONFIG_MY_DRIVER_GPIO_NUM=13
```

### Kconfig システムとは

Kconfig システムとは「ユーザーが選んだ構成オプション（例：Wi-Fiを使う／使わない）をもとに、自動的に sdkconfig を生成する仕組み」です。  

Kconfig ファイルは、各コンポーネントやディレクトリに作成し、どんな設定項目が使えるかを定義します。  

以下は自作LEDドライバ用の Kconfig ファイルの例です。  
（一般のESP32の LED GPIOは 2番ですが、 ESP32 LOLIN D32 では 5番なので「5」と指定しています）
```ini
menu "My LED Driver Configuration"

    config MY_LED_ENABLE
        bool "Enable LED driver"
        default y
    
    config MY_LED_GPIO
        int "GPIO number for LED"
        default 5
        depends on MY_LED_ENABLE
    
endmenu
```

`idf.py menuconfig` とすると、sdkconfig に設定が自動生成されます。  
ユーザーが menuconfig で設定した内容は、最終的に sdkconfig ファイルに書き出され、ビルドに反映されます。  

menuconfig 画面で以下のように設定し、Saveします。  
![](https://gyazo.com/6a72d4365b82a30bcd8c07f293a5ea4d.png)


sdkconfig ファイルに以下のように定義が作成されました。  
```ini
#
# My LED Driver Configuration
#
CONFIG_MY_LED_ENABLE=y
CONFIG_MY_LED_GPIO=5
# end of My LED Driver Configuration
# end of Component config
```

### Kconfig と Kconfig.projbuild の違い

Kconfig ファイルには「Kconfig」「Kconfig.projbuild」の2種類があります。

#### Kconfig ファイル

Kconfigは以下のように使用します。  
- 各コンポーネントに置く
- menuconfig に表示され、ユーザーが設定を選択する

以下はコンポーネント側の「Kconfig」ファイルの例です。  
```ini
menu "My Custom Driver Configuration"

    config USE_MY_DRIVER
        bool "Use my custom driver"
        default y
    
endmenu
```

#### Kconfig.projbuild ファイル

Kconfig.projbuild は以下のように使用します。  
- main/ ディレクトリや任意のプロジェクトスコープで使う
- そのプロジェクトで 追加の設定項目を一括で定義したい場合に使う
- ビルド時に自動で読み込まれ、menuconfig に反映される

以下はmain側の「Kconfig.projbuild」ファイルの例です。  
```ini
menu "Project-wide Options"

    config PROJECT_USE_LED
        bool "Enable LED feature for the whole project"
        default y

endmenu
```

#### 記述時の注意

Kconfig や Kconfig.projbuild に「USE_XXXX」と定義したとき、sdkconfig には「CONFIG_USE_XXXX」と登録されます。（sdkconfig 展開時に自動的に「CONFIG_」という接頭語が付加されます）  

### Kconfig と Kconfig.projbuild の挙動の違い

| 特徴                        | `Kconfig`                          | `Kconfig.projbuild`                            |
|-----------------------------|------------------------------------|------------------------------------------------|
| 読み込み元                  | 各コンポーネントの `CMakeLists.txt` | `main` ディレクトリ配下の自動読み込み対象       |
| 主な用途          | コンポーネントごとの設定項目定義      | プロジェクト全体に関わる設定項目の定義         |
| 自動で使われるか            | `idf_component_register()` 必須    | 自動読み込み（`main` にあれば）                |
| menuconfig 表示   | 自動で表示（コンポーネントが使われていれば） | 自動で表示（`main/` にあるだけでOK）        |
| 対象スコープ      | コンポーネント単位                    | プロジェクト全体、またはアプリケーション層     |

使い分けは以下のようにします。  
- ライブラリ・再利用可能な部品 ： Kconfig
- プロジェクト固有の設定 ： Kconfig.projbuild

```makefile
my_project/
├── main/
│   ├── CMakeLists.txt
│   ├── my_code.c
│   └── Kconfig.projbuild   ← ※プロジェクト固有の設定
├── components/
│   └── my_led_driver/
│       ├── Kconfig         ← ※コンポーネントの設定
│       └── CMakeLists.txt
├── sdkconfig
└── build/
    └── config/
        └── sdkconfig.h
```

## idf.py の概要

ESP-IDFのプロジェクトでは、idf.py が ビルド・フラッシュ・モニタなどの一括管理ツールとして中心的な役割を担っています。  
これはPython製のCLI（コマンドラインインタフェース）であり、内部で CMake や Ninja などの各種ツールを呼び出しています。  

よく使う idf.py のサブコマンドの例を以下に示します。  
| サブコマンド               | 内容                                |
| ------------------------- | --------------------------------- |
| `idf.py set-target esp32` | ターゲットチップ（ESP32, ESP32-C3など）を設定    |
| `idf.py menuconfig`       | `sdkconfig` をGUI形式で編集（Kconfigベース） |
| `idf.py build`            | `CMake`と`Ninja`を使ってビルド実行          |
| `idf.py flash`            | コンパイルしたバイナリをESP32に書き込み            |
| `idf.py monitor`          | シリアルモニタでUARTログを確認                 |
| `idf.py flash monitor`    | フラッシュとモニタをまとめて実行                  |
| `idf.py menuconfig`       | 設定画面を開く（ncursesベース）   |

このように、idf.py はESP-IDF開発の「ハブ」のような存在であり、各種ツールの橋渡しやプロジェクト管理をシンプルにしてくれます。

VSCode拡張機能では、以下の画面から同様のサブコマンドを呼び出せます。  
![](https://gyazo.com/04b198b3123485b7d7326433eef68964.png)

## カスタムコンポーネントを作成する場合の構成

たとえば components/my_led_driver/ という カスタムコンポーネント（自作LEDドライバ）を作成する場合を考えてみます。  

ディレクトリ構成を以下のようにします。  
```makefile
components/
└── my_led_driver/
    ├── CMakeLists.txt
    ├── my_led_driver.c
    └── include/
        └── my_led_driver.h
```

components/my_led_driver/CMakeLists.txt を以下のように設定します。  
```cmake
idf_component_register(SRCS "my_led_driver.c"
                    INCLUDE_DIRS "include"
                    REQUIRES ＜必要なライブラリ。無ければ REQUIRES は不要＞)
```

このカスタムコンポーネントを呼び出す main.c には以下をインクルードします。  
```c
#include "my_led_driver.h"
```

main/CMakeLists.txt には以下のように「REQUIRES my_led_driver」と設定し、カスタムコンポーネントを指定します。  
```cmake
idf_component_register(SRCS "main.c"
                    INCLUDE_DIRS "."
                    REQUIRES my_led_driver)
```

## Lチカ・サンプルプログラム（カスタムコンポーネント使用版）

以下は、ESP-IDF用のカスタムコンポーネント my_led_driver のシンプルなサンプルコードです。  
LEDをGPIOで制御（LEDをチカチカさせる）する基本的な構成（通称「Lチカ」）です。  

カスタムコンポーネントを含んだプロジェクト構成図の例を以下に示します。  
```
my_project/
├── CMakeLists.txt          ← プロジェクト全体を定義するエントリポイント
├── Makefile                ← CMakeビルドを呼び出すだけのラッパー
├── sdkconfig               ← menuconfigで設定されたビルドオプション
├── build/                  ← ビルド生成物（自動生成される）
├── main/
│   ├── CMakeLists.txt      ← このディレクトリのビルド対象（例：main.c）を定義
│   └── main.c              ← アプリケーションのエントリポイント
│   └── Kconfig.projbuild   ← プロジェクト固有定義
├── components/             ← カスタムコンポーネントの配置場所
│   └── my_led_driver/
│       ├── CMakeLists.txt  ← カスタムコンポーネントのビルド設定
│       ├── my_led_driver.c
│       ├── Kconfig         ← カスタムコンポーネント定義
│       └── include/
│           └── my_led_driver.h
```

### カスタムコンポーネントサンプル

「Kconfig」「ヘッダ」「Cファイル」「CMakeLists.txt」のそれぞれを以下に示します。  

components/my_led_driver/Kconfig  
（LEDのGPIOを 5 に設定しています）  
```ini
menu "My LED Driver Configuration"

    config MY_LED_GPIO
        int "GPIO number for LED"
        default 5
    
endmenu
```

components/my_led_driver/my_led_driver.h
（「my_led_init」「my_led_on」「my_led_off」の3つの関数を定義しています）  
```c
#pragma once

#include "driver/gpio.h"

#ifdef __cplusplus
extern "C" {
#endif

// 初期化関数
void my_led_init(gpio_num_t gpio_num);

// ON/OFF制御
void my_led_on(void);
void my_led_off(void);

#ifdef __cplusplus
}
#endif
```

components/my_led_driver/my_led_driver.c
（GPIO操作部分の実装です）  
```c
#include "my_led_driver.h"

static gpio_num_t led_gpio = GPIO_NUM_NC;

void my_led_init(gpio_num_t gpio_num)
{
    led_gpio = gpio_num;

    gpio_config_t io_conf = {
        .pin_bit_mask = 1ULL << led_gpio,
        .mode = GPIO_MODE_OUTPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE,
    };
    gpio_config(&io_conf);

    my_led_off(); // 初期状態OFF
}

void my_led_on(void)
{
    if (led_gpio != GPIO_NUM_NC) {
        gpio_set_level(led_gpio, 1);
    }
}

void my_led_off(void)
{
    if (led_gpio != GPIO_NUM_NC) {
        gpio_set_level(led_gpio, 0);
    }
}
```

components/my_led_driver/CMakeLists.txt
（GIPOを操作するので esp_driver_gpio ライブラリの設定が必要です）  
```cmake
idf_component_register(SRCS "my_led_driver.c"
                       INCLUDE_DIRS "include"
                       REQUIRES esp_driver_gpio)
```


### メインプログラムサンプル

「Kconfig.projbuild」「Cファイル」「CMakeLists.txt」のそれぞれを以下に示します。  

main/Kconfig.projbuild
（LED操作有無フラグを定義します）  
```ini
menu "My LED Driver Configuration"

    config MY_LED_ENABLE
        bool "Enable LED driver"
        default y
   
endmenu
```

main/main.c
（カスタムコンポーネントを呼び出しています）  
```c
#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "my_led_driver.h"

void app_main(void)
{
    my_led_init(CONFIG_MY_LED_GPIO);

    #ifdef CONFIG_MY_LED_ENABLE
    while (1) {
        my_led_on();
        vTaskDelay(pdMS_TO_TICKS(500));
        my_led_off();
        vTaskDelay(pdMS_TO_TICKS(500));
    }
    #endif    
}
```

main/CMakeLists.txt
（カスタムコンポーネント を REQUIRES します）  
```cmake
idf_component_register(SRCS "main.c"
                    INCLUDE_DIRS "."
                    REQUIRES my_led_driver)
```

このようにすると、components/my_led_driver がカスタムコンポーネントとしてESP-IDFビルドに組み込まれ、拡張性のあるプロジェクト構造になります。

## まとめ

本記事では、ESP-IDFプロジェクトの構成要素とその役割、そして idf.py コマンドの位置付け、カスタムコンポーネント作成方法について解説しました。  
ESP-IDFプロジェクトは、CMakeLists.txt や sdkconfig を中心に構成されており、ビルドや設定が柔軟に管理できます。  
また、初心者にとっては idf.py を使うことで環境依存やCMakeの煩雑さを気にせず、手軽に開発を始めることができます。  

PlatformIO に比べて ESP-IDF は一見とっつきにくい印象がありますが、各ファイルやツールの意味を理解すれば、自信をもって開発に取り組めると思います。  

IoT開発の助けになれば幸いです。
