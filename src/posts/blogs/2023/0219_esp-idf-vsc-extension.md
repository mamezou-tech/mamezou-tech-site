---
title: VSCodeのESP-IDF拡張機能「Espressif IDF」を使ってみる
author: shuichi-takatsu
date: 2023-02-19
tags: [vscode, esp32]
---

以前のIoT記事にて[Arduino IDE](/iot/internet-of-things-03/)を紹介しましたが、いつも使用しているVSCode(Visual Studio Code)でESP32のプログラムを作成できたら便利だなと思っていました。  
今回はVSCodeでESP32のプログラムが作成できる ESP-IDF拡張機能「Espressif IDF」を紹介します。  

## ESP-IDF とは

ESP-IDF は”ESP-IoT Development Framework” の略です。  
ESP32を開発した Espressif Systems 社が公開しているESP32向け開発環境です。  
今回はこの「ESP-IDF」をVSCodeから使用してみます。  

## ESP-IDF拡張機能「Espressif IDF」

VSCode で ESP-IDF拡張機能「Espressif IDF」を検索してインストールします。  
![](https://gyazo.com/e6907fdf370e880b421162876de53d16.png)

VSCodeを起動すると「ESP-IDF Setup」が表示されます。  
![](https://gyazo.com/70202ee08d80f89e783ed914eef57c81.png)

上記の画面が表示されない場合はVSCodeのコマンドパレットで「>ESP」と入力します。  
以下のような選択肢が表示されますので `ESP-IDF Welcome` を選択します。  
![](https://gyazo.com/03daba75f9edc197b27208384724c7a9.png)

次に「configure extension」を選択します。  
![](https://gyazo.com/6321e561c2d0b62775c550c874afbb34.png)

「choose a setup mode」で `EXPRESS` を選択します。 
![](https://gyazo.com/70202ee08d80f89e783ed914eef57c81.png)

以下の画面にて
- Select download server
- Select ESP-IDF version
- Enter ESP-IDF directory (IDF_PATH)
- Enter ESP-IDF Tools directory (IDF_TOOLS_PATH)

を設定します。  
![](https://gyazo.com/a6ae0cfd294aa556bb8bff608178c35e.png)

今回は以下のように設定しました。  
|項目|値|
|:----|:----|
|download server|Github|
|ESP-IDF version|v5.0|
|ESP-IDF directory (IDF_PATH)|C:\Users\<ログインユーザ>\esp|
|ESP-IDF Tools directory (IDF_TOOLS_PATH)|C:\Espressif|

![](https://gyazo.com/da38f82c09ef5f2725ac77ae8459b618.png)

上記の設定でインストールします。  
![](https://gyazo.com/d1df15b93361b36cc6b651a8b0196466.png)

インストールが完了するまでに10分ほど時間を要します。  
![](https://gyazo.com/375ecb4156afdc1799a71a95ad898c13.png)

上記のような画面になればインストール完了です。  

## ESP32「Hello World」サンプル作成

Welcome画面から「Show examples」を選択します。  
![](https://gyazo.com/bd94db17a72a08ccd68d4a672ccc592e.png)

現環境の「ESP-IDF」のパスを選択します。  
![](https://gyazo.com/17c359125d0d47581e7652a2466816a8.png)

「hello world」サンプルを選択し、プロジェクトを作成します。  
![](https://gyazo.com/a0a62a03e78b64d2c65a3ff901917165.png)

以下のようなプロジェクトが作成されます。  
![](https://gyazo.com/158d155854fa8185525a0fb6b4c66b27.png)

画面左下の「ESP-IDF Set Espressif device target」をクリックします。  
![](https://gyazo.com/ad1a9ca4736c97d645ed2506b9865e91.png)

「esp32」を選択します。(接続しているIoTデバイスはESP32 LOLIN D32です)
![](https://gyazo.com/50ff53ee4b879db82336f3a1fc2323ca.png)

「ESP32 chip」を選択します。  
![](https://gyazo.com/1de74112478a4b7049d9927e2c103b0e.png)

「ESP-IDF Build project」をクリックします。  
![](https://gyazo.com/958d8b389f1f0ed39f91b9bf2c3dd90e.png)

Buildが開始されます。(初回はかなり時間がかかります)   
![](https://gyazo.com/0ac3a61a771b96389c08d351816c27fc.png)

Buildが完了したら、「ESP-IDF Flash device」をクリックします。  
![](https://gyazo.com/aed24441ac2dbfbf0552a6aa4dc3d2b8.png)

「ESP-IDF select Flash method」で「UART」が選択されていない場合は「UART」を選択します。（ESP32とPCはUSBで接続しています）  
![](https://gyazo.com/21358f5ea7c7059280c0a76a1d4cc634.png)

USB(仮想COMポート)経由でプログラムがESP32のメモリに書き込まれます。  

モニターで動作を確認します。  
「ESP-IDF Monitor deivce」をクリックします。  
![](https://gyazo.com/7638626002637560c50fefc1e8dd7a64.png)

仮想COMポート経由で「hello, world!」の文字列が出力されているのがわかります。  
![](https://gyazo.com/55a70f40f70eef14188f69f1f110f5d0.png)

## ソースコードを覗いてみる

hello world のCプログラムを覗いてみます。  

```c
/*
 * SPDX-FileCopyrightText: 2010-2022 Espressif Systems (Shanghai) CO LTD
 *
 * SPDX-License-Identifier: CC0-1.0
 */

#include <stdio.h>
#include "sdkconfig.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_chip_info.h"
#include "esp_flash.h"

void app_main(void)
{
    printf("Hello world!\n");

    /* Print chip information */
    esp_chip_info_t chip_info;
    uint32_t flash_size;
    esp_chip_info(&chip_info);
    printf("This is %s chip with %d CPU core(s), WiFi%s%s, ",
           CONFIG_IDF_TARGET,
           chip_info.cores,
           (chip_info.features & CHIP_FEATURE_BT) ? "/BT" : "",
           (chip_info.features & CHIP_FEATURE_BLE) ? "/BLE" : "");

    unsigned major_rev = chip_info.revision / 100;
    unsigned minor_rev = chip_info.revision % 100;
    printf("silicon revision v%d.%d, ", major_rev, minor_rev);
    if(esp_flash_get_size(NULL, &flash_size) != ESP_OK) {
        printf("Get flash size failed");
        return;
    }

    printf("%uMB %s flash\n", flash_size / (1024 * 1024),
           (chip_info.features & CHIP_FEATURE_EMB_FLASH) ? "embedded" : "external");

    printf("Minimum free heap size: %d bytes\n", esp_get_minimum_free_heap_size());

    for (int i = 10; i >= 0; i--) {
        printf("Restarting in %d seconds...\n", i);
        vTaskDelay(1000 / portTICK_PERIOD_MS);
    }
    printf("Restarting now.\n");
    fflush(stdout);
    esp_restart();
}
```

ヘッダ部分を見るとFreeRTOSが利用されているのがわかります。  
こんなところでもFreeRTOSは利用されているのですね。  

## まとめ

ここまで VSCode拡張機能「Espressif IDF」を”すんなり”インストールできたように見えますが、この環境を構築するまで色々と問題がありました。  
[ここ](https://dl.espressif.com/dl/esp-idf/)から単独のESP-IDFインストーラーをダウンロードできますが、最初からESP-IDF開発環境をインストールしているとVSCode拡張機能が正しく動作しませんでした。  
理由はわかっていませんが、ESP-IDFがインストールされていない状態でVSCode拡張機能をセットアップすると、セットアップ中にESP-IDFのランタイム部分がインストールされるようです。  
(回避策が分かるまで筆者は何度もインストール・アンインストールを繰り返すことになりました)  
単にESP32のCプログラムを作成したいだけなら Arduino IDEで十分だなと感じました。  
ESP32+Rustの開発環境が構築できたらご報告したいと思います。
