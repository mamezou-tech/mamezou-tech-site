---
title: MATLAB/SimulinkとArduinoで学ぶ ― S-Functionブロック自作によるデバイス連携
author: shuichi-takatsu
date: 2025-09-22
tags: [MATLAB, simulink, arduino, s-function]
image: true
---

## はじめに：SimulinkとArduinoで始めるS-Functionブロックの自作

Arduinoで利用可能なデバイスは多岐にわたりますが、Simulinkで直接サポートされていないセンサーやディスプレイも数多く存在します。  
そこで有効なのが **S-Function** を使った自作ブロックです。  
本記事では、**OLEDディスプレイ SSD1306** を例に、Simulink用のS-Functionブロックを自作し、Arduinoで動作させる手順を紹介します。  

---

## 開発環境の準備

- **ソフトウェア**
  - MATLAB（バージョン：R2025a）
  - Simulink（バージョン：25.1）
- **アプリ（for Simulink）**
  - Simulink Support Package for Arduino Hardware（バージョン：25.1.0）
- **ハードウェア**
  - Arduino Uno（または互換機）
  - USBケーブル（PCとArduinoの通信用）
  - HC-SR04（超音波距離センサ）
  - OLED SSD1306（I2C接続ディスプレイ）

### 環境構築の詳細手順：

#### 1. MATLAB/Simulink と 基本パッケージの導入
MATLAB と Simulink、Arduino Support Package の導入については、[前回の記事](/blogs/2025/09/18/matlab_simulink_arduino_led_on_off/)を参照してください。

#### 2. Rensselaer Arduino Support Package Library を導入
- MATLAB を起動 → メニューから **「アドオン」 → 「ハードウェアサポートパッケージの入手」** を選択します（アドオンエクスプローラーが起動します）  
![](https://gyazo.com/9ceee87178adfec2db1a1532234d9f4b.png)

- 検索ボックスで **「Arduino」** と入力し、`Rensselaer Arduino Support Package Library (RASPLib)` を選択します  
![](https://gyazo.com/6db08037f57ab46fcbb8e890303561fc.png)

- **Install** をクリックし、パッケージを導入します  
- 導入完了後、Simulinkライブラリに「Rensselaer Arduino Support Package Library」のブロックが追加されます  
![](https://gyazo.com/26ec9b2aa134084e6941e2a0160df2c4.png)  
↓  
その中に「超音波距離センサ HC-SR04」用のブロックがあります。HC-SR04を動かすために、このブロックを使用します。  
![](https://gyazo.com/6c44a0005da7c96def362ca02e115847.png)

---

## 回路の接続

### HC-SR04
- **VCC** → Arduino 5V  
- **GND** → Arduino GND  
- **Trig** → Arduino デジタルピン 7（例）  
- **Echo** → Arduino デジタルピン 8（例）  

### OLED SSD1306 (I2C)
- **VCC** → Arduino 3.3V または 5V  
- **GND** → Arduino GND  
- **SCL** → Arduino A5 (Unoの場合)  
- **SDA** → Arduino A4 (Unoの場合)  

## SSD1306用のS-Functionブロックの作成

HC-SR04はRASPLibでサポートされていますが、SSD1306については専用ブロックが見つからなかったため、S-Functionブロックで自作します。  

ここで重要なのは、**Simulinkで直接サポートされていない機能はArduinoライブラリを呼び出して補う** という点です。  
ArduinoのライブラリはC/C++で書かれたデバイス制御用関数群であり、S-Functionを介してSimulinkモデルから呼び出すことが可能です。  
これにより、Simulinkでサポート外のデバイスでも、**Arduinoの豊富なライブラリエコシステムを活用して動作させることができる**のです。  

### ArduinoのOLED SSD1306用ライブラリ選定
Arduino向けOLEDライブラリとして有名なのは以下です。  

- [Adafruit_SSD1306](https://github.com/adafruit/Adafruit_SSD1306)
- [Adafruit-GFX-Library](https://github.com/adafruit/Adafruit-GFX-Library)

ただし、UnoのFlashに収まらない場合があるため、より軽量な **[U8g2_Arduino](https://github.com/olikraus/U8g2_Arduino)** を採用します。  
U8g2は多機能ですが、Unoでのメモリ制約を考慮し、今回は **U8x8テキストモードのみ** を利用します。  

### プロジェクトの作成

S-Function Builderは単体でも使えますが、複数のS-Functionを扱う場合は **Simulinkプロジェクト機能** を利用すると便利です。  

1. **新しいプロジェクトを作成**  
   - MATLABの「新規 → プロジェクト → 空のプロジェクト」を選択します  
   - 保存先フォルダが「プロジェクトフォルダ」となります
   ![](https://gyazo.com/0c37e868197d917b5f829704eee53608.png)  

この方法を取れば、複数のデバイスを扱う場合でも整理しやすくなり、再利用性も向上します。  

### ライブラリの作成

1. **新しいSimulinkライブラリを作成**  
   - MATLABを起動し、`simulink` コマンドでSimulinkライブラリブラウザを開く  
   - メニューから「新規 → ライブラリ」を選択し、空のライブラリファイルを作成  
   - ここに自作ブロックを追加していきます  
   ![](https://gyazo.com/90fbd29baeed34dfbe69bf563d8fa22e.png)

2. **S-Function Builderブロックの配置**  
   - 新しいライブラリに「S-Function Builder」ブロックを配置  
   - 生成される `.cpp` ファイルや `.tlc` ファイルがライブラリと連動するように管理されます。  
   ![](https://gyazo.com/bb80ee8ec993e02ab03a4393e6beb5aa.png)

3. **外部ライブラリの準備**  
   - Arduinoで利用する `Wire.h` や `U8x8lib.h` がインクルードできるように準備  
   - `U8g2_Arduino` を `C:\ProgramData\MATLAB\thirdpartylibs\U8g2_Arduino` などに配置  
   - 環境に応じて Support Package のパスも確認しておきます  

### S-Function Builder でブロックを自作

今回は、仕様を簡単にし、少ないメモリでも動作する設計にします。  
U8g2 の U8x8 テキストモードで、SSD1306 128×64 (I²C) に1行のASCII文字列（最大16文字）を表示する仕様です。

プロジェクト名：`sfun_ssd1306_u8x8_display_block`  
S-Function名：`sfun_ssd1306_u8x8_display`  
言語：C++  

- ソースコード：  
```cpp
/* Includes_BEGIN */
#ifndef MATLAB_MEX_FILE
  #include <Arduino.h>
  #include <Wire.h>
  #include <U8x8lib.h>
  // SSD1306 128x64 via hardware I2C, no reset pin (UNO: SCL=A5, SDA=A4)
  static U8X8_SSD1306_128X64_NONAME_HW_I2C u8x8(/* reset = */ U8X8_PIN_NONE);
  static bool isDisplayInitialized_u8x8 = false;
#endif
/* Includes_END */

/* Externs_BEGIN */
/* extern double func(double a); */
/* Externs_END */

void sfun_ssd1306_u8x8_display_Start_wrapper(void)
{
/* Start_BEGIN */
#if !defined(MATLAB_MEX_FILE)
  if (!isDisplayInitialized_u8x8) {
    u8x8.begin();
    u8x8.setPowerSave(0);
    // 文字フォント（ASCII用の軽量フォント）
    u8x8.setFont(u8x8_font_chroma48medium8_r);
    // 必要ならI2Cアドレス指定（一般的な0x3Cを8bit表現で）
    // u8x8.setI2CAddress(0x3C << 1);  // 何も出ない時だけ試す
    u8x8.clearDisplay();
    isDisplayInitialized_u8x8 = true;
  }
#endif
/* Start_END */
}

void sfun_ssd1306_u8x8_display_Outputs_wrapper(const uint8_T *u)
{
/* Output_BEGIN */
#if !defined(MATLAB_MEX_FILE)
  if (!isDisplayInitialized_u8x8) return;

  // 入力ベクトル長に合わせて調整
  const uint8_t MAX_STR = 16;

  char buf[MAX_STR + 1];
  uint8_t i = 0;
  for (; i < MAX_STR; ++i) {
    uint8_t b = u[i];
    buf[i] = (char)b;
    if (b == 0) break;
  }
  buf[(i < MAX_STR) ? i : MAX_STR] = '\0';

  // 1行目(行=0)にASCII文字列を表示
  u8x8.clearLine(0);
  u8x8.drawString(0, 0, buf);
#endif
/* Output_END */
}

void sfun_ssd1306_u8x8_display_Terminate_wrapper(void)
{
/* Terminate_BEGIN */
#if !defined(MATLAB_MEX_FILE)
// nothing
#endif
/* Terminate_END */
}
```

- 端子とパラメーター：  
![](https://gyazo.com/ea0dbe48e6d3233855778a86d4675f36.png)

- 外部コード：  
必要な「U8g2_Arduino」を以下のパスにGitでCloneしておきます。  
`C:\ProgramData\MATLAB\thirdpartylibs\U8g2_Arduino`  
Arduino Support Package のパスは以下になっていました。（MATLABをインストールした環境に依存しますので、皆さんの環境では、Support Packageのパスを確認してください）  
`C:\ProgramData\MATLAB\SupportPackages\R2025a\aCLI\data\packages\arduino`  
![](https://gyazo.com/7a55a525705dc828420b22d7b0bcc929.png)

### ビルドとライブラリ登録

S-Functionをビルドすると、以下のファイルが生成されます：  
![](https://gyazo.com/9c7c577deac87dc0f46806d49d4cebae.png)

- `.cpp`（本体ソース）  
- `_wrapper.cpp`（ラッパコード）  
- `.tlc`（ターゲット言語コンパイラ用）  
- `.mexw64`（Windows用バイナリ）  

```text
### Output folder is 'C:\Users\<ユーザ名>\Documents\MATLAB\sfun_ssd1306_u8x8_display_block'
### 'sfun_ssd1306_u8x8_display.cpp' は正常に作成されました
### 'sfun_ssd1306_u8x8_display_wrapper.cpp' は正常に作成されました
### 'sfun_ssd1306_u8x8_display.tlc' は正常に作成されました
### S-Function 'sfun_ssd1306_u8x8_display.mexw64' が正常に作成にされました
```

さらに、ライブラリブラウザに登録するには以下のファイルを用意します：  
- `slblocks.m` （必須）
- `setup.m` （推奨）
- `INSTALL.m` （任意）※プロジェクトを配布するときに便利です

slblocks.m
```text
function blkStruct = slblocks
% この関数は、指定したライブラリを
% Simulinkライブラリブラウザに表示するために定義します。

    % --- ライブラリの登録情報 ---
    % Browser.Library には、ライブラリのファイル名（拡張子なし）を指定します。
    Browser.Library = 'ssd1306_u8x8_display_lib';

    % Browser.Name には、ライブラリブラウザに表示したい名前を指定します。
    Browser.Name = 'Arduino SSD1306 U8x8 display library';

    % --- 構造体にまとめる ---
    blkStruct.Browser = Browser;

end
```

setup.m
```text
function setup
addpath(fileparts(mfilename('fullpath')));   % #ok<MCAP> 自フォルダをPATHへ
try
    lb = LibraryBrowser.LibraryBrowser2;
    refresh(lb);
catch
    sl_refresh_customizations;
end
% 依存チェック（例：Arduinoサポート）
% assert(exist('arduino','file')~=0, 'Install MATLAB Support Package for Arduino');
end
```

INSTALL.m
```text
%% Add library to path
addpath(pwd);
savepath;

%% Refresh library browser
lb = LibraryBrowser.LibraryBrowser2;
refresh(lb);
```

パスの設定でパスを登録します。  
![](https://gyazo.com/55d95206419a8887fb0f15cfabd96797.png)

登録が成功すると、Simulinkライブラリに自作のSSD1306用ブロックが追加されます。  
![](https://gyazo.com/a47f143e62810d41c68b31462262ada1.png)

---

## メインのSimulinkモデルの作成

### 新規モデルを作成

1. Simulink を起動し、新しい「空のモデル」を作成します
![](https://gyazo.com/cdace23527b4c533399601303b5f7b57.png)

2. ブロックライブラリから以下を配置します：
   - HC-SR04ブロック（RASPLib）  
   - SSD1306表示用S-Functionブロック（自作）  
   - 文字列処理ブロック（定数文字列、数値⇒文字列変換、文字列結合、文字列⇒ASCII変換）  
   - 表示用ブロック（デバッグ確認）
   ![](https://gyazo.com/7037b58004ce62bf5e537ad5ff25c714.png)

### パラメータ設定

「ハードウェア設定」－「ハードウェア実行」を以下のように設定します。  
  - ハードウェア実行
![](https://gyazo.com/cfbfb0463f4056e55a6ba8d234547e90.png)


---

## Arduinoへの書き込みと実行
プログラムをArduinoにアップロードし、自動実行できるようにします。

1. Simulink の「ビルド、展開起動」を実行します
![](https://gyazo.com/e3b97bb638ba9f6f7c68296969acfeef.png)

2. コンパイル → Arduinoへ転送
　転送が成功すると、以下のログが出力されます。    
![](https://gyazo.com/7df4cece5f2ae23f56b1d61a728261cf.png)

超音波距離センサで計測した物体との距離がOLED上に表示されるようになりました。  
![](https://gyazo.com/7cbb2ebfaeab8ae4df766cd18d58d664.png)  
（少し数値が読み取りづらいですが、7(cm)くらいの距離に障害物を置いています）

---

## 実行結果と考察

- HC-SR04で取得した距離を即座にOLEDに表示でき、センサとディスプレイをSimulink経由で統合できました  
- Unoのメモリ制約によりU8g2のフルバッファ機能は利用困難ですが、U8x8モードは軽量かつ実用的です  
- 今回の構成で **センサ入力 → 文字列変換 → ディスプレイ出力** を直感的に構築できました  
- 今後は **行位置・列位置の可変表示** や **フォント切替**、**I²Cアドレス指定** などのパラメータ化を進めることで、より汎用的なブロックに発展させられます  

---

## まとめ

- **HC-SR04** は RASPLib を利用すればSimulink上で簡単に利用可能です。  
- **SSD1306** は自作S-Functionを作ることで表示機能を拡張できます。  
- **U8g2ライブラリ** を活用し、メモリ制約に配慮してU8x8モードを利用するのが実用的です。 
- プロジェクト機能＋slblocks/setup/INSTALLを組み合わせれば、ライブラリとして管理・配布も容易です。  

- 今回の取り組みにより、Arduinoを用いた **複数デバイス統合の一例** を示すことができました。  
- 将来的には他のセンサやアクチュエータにも同様の方法を展開し、ライブラリを充実させることで、モデルベース開発の適用範囲をさらに広げられます。  

---

<style>
img {
    border: 1px gray solid;
}
</style>
