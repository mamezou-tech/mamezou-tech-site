---
title: ATtiny13Aを使ってボタン電池で動く シーリングライト リモコン を作ってみた【開発編】
author: shuji-morimoto
date: 2025-03-28
tags: [電子工作, IRリモコン, arduino, ATtiny13A, AVR]
image: true
---

![](/img/blogs/2025/0328_ir-remote-control-with-attiny13a/ir_remocon_breadboard.png)

前回の記事はこちら[【準備編】](../ir-remote-control-with-attiny13a_epi1/)

ここまででやっと前準備ができました。ここから本題の回路設計とプログラム開発となります。

# 自作赤外線リモコンの目標

目標は以下としました。
- できるだけリモコン(HK9493)の機能を盛り込む
- ボタン電池(3V)駆動
- 省電力
- 部品コストを抑える


# リモコン操作ボタン仕様
[【準備編】で赤外線送信データの解析](../ir-remote-control-with-attiny13a_epi1/#%E8%B5%A4%E5%A4%96%E7%B7%9A%E9%80%81%E4%BF%A1%E3%83%87%E3%83%BC%E3%82%BF%E3%81%AE%E8%A7%A3%E6%9E%90)を行った結果、ボタンに対する送信データ(コマンド)は以下のようになりました。


|コマンド配列  |   ch1          |      ch2       |       ch3      |長押し|
|:-------------|:--------------:|:--------------:|:--------------:|:----:|
|暖かい色      |0x9139522C(0xA8)|0x9539522C(0xAC)|0x9939522C(0xA0)|〇|
|白い色        |0x9039522C(0xA9)|0x9439522C(0xAD)|0x9839522C(0xA1)|〇|
|点灯          |0x2D09522C(0x24)|0x3509522C(0x3C)|0x3D09522C(0x34)| |
|消灯          |0x2F09522C(0x26)|0x3709522C(0x3E)|0x3F09522C(0x36)| |
|明るい        |0x2A09522C(0x23)|0x3209522C(0x3B)|0x3A09522C(0x33)|〇|
|暗い          |0x2B09522C(0x22)|0x3309522C(0x3A)|0x3B09522C(0x32)|〇|
|常夜灯        |0x2E09522C(0x27)|0x3609522C(0x3F)|0x3E09522C(0x37)| |
|全灯          |0x2C09522C(0x25)|0x3409522C(0x3D)|0x3C09522C(0x35)| |
|おやすみ30分  |0xA139522C(0x98)|0xAA39522C(0x93)|0xB339522C(0x8A)| |
|チャンネル確定|0xDA39522C(0xE3)|0xDB39522C(0xE2)|0xDC39522C(0xE5)| |

(0xNN)はパリティデータで `長押し` はボタンの長押しに対応したコマンドでボタンを押し続けることで調光できます。
チャンネルは3チャンネルあり、対応するチャンネル確定ボタンを押すことでそのチャンネルのコマンドのみ受け付けるようになります。

# 回路図

![回路図](/img/blogs/2025/0328_ir-remote-control-with-attiny13a/schematic.png)

左側にリモコン制御用のスイッチ(SW)が8つあり中央のモジュール(エンコーダー)を介してATtiny13Aに繋いでいます。
赤外線LEDには50mAから100mA程の大きな電流を流しますがATtiny13Aから直接おおきな電流を流すことができないためトランジスタを介しています。
スイッチ数の多さと中央のモジュールを介してATtiny13Aに繋ぐため配線数が多くなっています。

## スイッチのON/OFF
回路図左にはスイッチが8つ並んでいます。これがリモコンの点灯・消灯などのボタンにあたります。
回路設計について初学者(私もその一人です)には不思議に思うかもしれませんので上記に似た3つの回路を表してみました。SWをON/OFFしたときのOUT電圧の違いがわかりますか？

![pull_up](/img/blogs/2025/0328_ir-remote-control-with-attiny13a/three_circuites.png)

__左__
SWをONにすると電源電圧3VがOUTに掛かり電流が流れます。SWをOFFにするとOUTは0Vとなり・・・・・ません！！ 0Vではなくどこにも繋がっていない状態ですので不定な状態です。このような状態を「浮いた状態」とか「ハイインピーダンス」と呼ばれておりあってはならない状態で必ず0Vか電圧が掛かった状態にしなければいけません。

__中央__
SWがOFFの状態のときは電源電圧3VがOUTに掛かります。OUTには電源電圧と抵抗値Rに応じた電流(V/R)が流れます。SWをONにするとOUTは0Vになります。
もしも抵抗Rがない場合は電源の+極と-極が接触することになり大きな電流が流れてしまいショートしてしまいます。
ところが抵抗Rを挿入すると電流が流れにくくなるので抵抗値が大きいとき(10Kから数Mオーム)はほとんで電流が流れなくなりショートしません。このとき抵抗Rの+極側は3Vとなり-極側は0VとなるためOUTは0Vとなります。
このときの抵抗Rをプルアップ抵抗、この回路をプルアップ回路といいます。

__右__
中央の回路から抵抗RとSWの位置を入れ替えたものです。
SWがOFFのときOUTは電源の-極に繋がっているので0Vとなります。
SWがONのときは先ほどと同じように抵抗Rの+極側は3Vとなり-極側は0VとなるためOUTは3Vとなります。
このときの抵抗Rをプルダウン抵抗、この回路をプルダウン回路といいます。

回路図のボタンはすべてプルアップ回路となっています。


## ピン数問題
ATtiny13Aで入力としてピン数がPB0からPB5までの6本ですがPB5はリセットを兼ねておりプログラム書き込み時に利用します。プログラムの書き込み時やリモコン操作時に不具合が発生する(未確認)かもしれないため使わないようにしました。
そのため5本(1:RESET, 4:GND, 8:VCC以外)しか利用できません。またそのうち1本は赤外線送信時のLED点灯用に出力ピンとするため実質入力ピンは4本のみとなります。

4本のピンで8つのスイッチのうちどのスイッチが押されたか[^1]を判定する必要がありますがどうすべきか？以下の方法を検討しました。

__A:AD変換する__
1本のピンをアナログ入力モードにしてスイッチ毎に異なる抵抗値を介して電圧値を計測し、その値からどのスイッチが押されたかを判定する

__B:エンコーダーを利用する__
8本の入力ラインをエンコーダーに入力し、3本か4本の出力ラインで受け取りバイナリ(3または4bitの数値)として判定する

__C:IOエキスパンダーを利用する__
8本の入力ラインをIOエキスパンダーに入力し、IOエキスパンダーとATtiny13AはI2C(2本の線)で通信してどのスイッチが押されたかを判定する


Aを実施してみたところAD変換は8bitなので入力電圧(Max 3V)を0から255までの値として取得できますがSWは8個あるため、異なる抵抗値を使って8つの範囲の電圧を作る必要があります。閾値の範囲を作るのが面倒で精度もイマイチで誤認識することが多いため却下しました。

BはSN74HC148Nというエンコーダー回路で実現できATtiny13Aに接続するピン数もピッタリです。

CはI2C通信用のプログラム作成が面倒で本筋から外れる＆プログラムサイズが圧迫するので現実的ではないと判断しました。

というわけでBを採用しました。

:::info
IOエキスパンダーはその名の通り入出力のピンの数を拡張する(増やす)ための回路
:::

:::info
I2C(Inter Integrated Circuit)は2本の線(データ線とクロック線)だけで複数のモジュールと通信できる通信プロトコルで液晶ディスプレイや簡単なセンサーなどとの通信で一般的に利用されています。「アイスクエアードシー」とか「アイツーシー」と発音します。
:::


SN74HC148Nのデータシート\(仕様書\)[^2]を見ると入力と出力の対応は以下の表となります。

![function table](/img/blogs/2025/0328_ir-remote-control-with-attiny13a/sn74hc148_function_table.png)

水色の枠ではINPUTSの0から7のH/L値とOUTPUTSのA0からA2のH/L値を見ることでどのスイッチが押されているかが判ります[^3]。

しかしINPUTSの0のみがLとき(最終行)と0から7がすべてH(2行目)のときでOUTPUTSのA0からA2が同じ値(すべてH)となりINPUTSの0に対応するスイッチが押されているときと何も押されていないときが同じOUTPUTSとなるため判定できません。

そのため赤色の枠のようにINPUTSとしてEIも追加(ただし常にL状態)し入力ラインが9本、OUTPUTSにGSを追加することで出力ラインが4本となっています。
このようにすることで4bitで9通りのどれかの出力パターンとなります。
OUTPUTSのEOがLのときは何もスイッチが押されていないことを表すのでこちらを見て判定もできますが、どちらにせよ出力ラインが4本必要なのは変わりありません。

なお、入力ピンは入力がない場合はH状態にしておく必要がある(=Low Active)ためプルアップ\([前述:スイッチのON/OFF](#スイッチのon-off)\)しておきます。

だったら最初から8本ピンが使えるマイコン使えよとツッコミが入りそうですがATtiny13Aを使った何かを作りたかったので「こんなこともできるよ」ということで捉えていただけたらと思います😅。


## パスコン
コンデンサ(C)はなくてもおそらく動作しますが以下の効果があります。
- 電圧変化を緩やかにする(ノイズ除去)
- 急な消費電力の増加時に電力を供給する

:::info
電源(V)とグランド(GND)の間に回路に並列にコンデンサを入れるとノイズがバイパスさせるためバイパスコンデンサ(略してパスコン)と呼ばれています。
:::

定常時はほとんど電力を消費しない(0.1uA以下)ようにプログラムしています(後述)が、いざリモコンのスイッチをONにすると赤外線LEDが点灯します。赤外線は目には見えないですが普通のLEDと同じように光を放ちます。リモコンで利用するので数メートル離れた本体の赤外線受信機に届くように普通のLEDよりも強い光を発光させる必要があり、50から100mA程の電流を流します[^4]。そのため急激に電力消費が増加し電圧が低下します。

電池駆動の場合、最初は新品の電池ですので問題ありませんが電力を消費すると少しずつ電圧が低下していきます。電圧低下により電圧がマイコンの最低動作電圧付近になるとマイコンが不安定になりますがパスコンを入れておくことで粘りがでてくるので電池をより長く(効率的に)使えるようになります。


# プログラム
プログラム行数は全体で280行ほどです。
- ヘッダinclude、define定義、データ配列の定義で90行ほど
- setup()で90行ほど
- loop()で70行ほど

制御ロジック(setup(),loop(),その他関数)は100行を超えますが処理毎にコメント記述や中かっこブロックで囲っており、レジスタ設定のビット演算もビットごとに改行しているため行数の割には内容はシンプルです。


```cpp
#include <avr/io.h>
#include <util/delay.h>
#include <util/delay_basic.h>
#include <avr/interrupt.h>
#include <avr/sleep.h>
#include <wiring_private.h>
#include <avr/pgmspace.h>
#include <avr/eeprom.h>

#define IR_COMMAND_WARMER   0 // 暖かい色 
#define IR_COMMAND_WHITER   1 // 白い色   
#define IR_COMMAND_ON       2 // 点灯     
#define IR_COMMAND_OFF      3 // 消灯     
#define IR_COMMAND_BRIGHTER 4 // 明るい   
#define IR_COMMAND_DARKER   5 // 暗い     
#define IR_COMMAND_NIGHT    6 // 常夜灯   
#define IR_COMMAND_FULL     7 // 全灯     
#define IR_COMMAND_NONE    15 // なし

#define HEADERMARK       1035 // 8T(3450us)
#define HEADERSPACE       510 // 4T(1700us)
#define DATAMARK          135 // 1T(450us)
#define ONESPACE          390 // 3T(1300us)
#define ZEROSPACE         135 // 1T(450us)

#define COMMAND_SIZE  5

// 照明操作
const byte command_1ch_0[] PROGMEM = {0x91, 0x39, 0x52, 0x2C, 1};
const byte command_1ch_1[] PROGMEM = {0x90, 0x39, 0x52, 0x2C, 1};
const byte command_1ch_2[] PROGMEM = {0x2D, 0x09, 0x52, 0x2C, 0};
const byte command_1ch_3[] PROGMEM = {0x2F, 0x09, 0x52, 0x2C, 0};
const byte command_1ch_4[] PROGMEM = {0x2A, 0x09, 0x52, 0x2C, 1};
const byte command_1ch_5[] PROGMEM = {0x2B, 0x09, 0x52, 0x2C, 1};
const byte command_1ch_6[] PROGMEM = {0x2E, 0x09, 0x52, 0x2C, 0};
const byte command_1ch_7[] PROGMEM = {0x2C, 0x09, 0x52, 0x2C, 0};
const byte command_2ch_0[] PROGMEM = {0x95, 0x39, 0x52, 0x2C, 1};
const byte command_2ch_1[] PROGMEM = {0x94, 0x39, 0x52, 0x2C, 1};
const byte command_2ch_2[] PROGMEM = {0x35, 0x09, 0x52, 0x2C, 0};
const byte command_2ch_3[] PROGMEM = {0x37, 0x09, 0x52, 0x2C, 0};
const byte command_2ch_4[] PROGMEM = {0x32, 0x09, 0x52, 0x2C, 1};
const byte command_2ch_5[] PROGMEM = {0x33, 0x09, 0x52, 0x2C, 1};
const byte command_2ch_6[] PROGMEM = {0x36, 0x09, 0x52, 0x2C, 0};
const byte command_2ch_7[] PROGMEM = {0x34, 0x09, 0x52, 0x2C, 0};
const byte command_3ch_0[] PROGMEM = {0x99, 0x39, 0x52, 0x2C, 1};
const byte command_3ch_1[] PROGMEM = {0x98, 0x39, 0x52, 0x2C, 1};
const byte command_3ch_2[] PROGMEM = {0x3D, 0x09, 0x52, 0x2C, 0};
const byte command_3ch_3[] PROGMEM = {0x3F, 0x09, 0x52, 0x2C, 0};
const byte command_3ch_4[] PROGMEM = {0x3A, 0x09, 0x52, 0x2C, 1};
const byte command_3ch_5[] PROGMEM = {0x3B, 0x09, 0x52, 0x2C, 1};
const byte command_3ch_6[] PROGMEM = {0x3E, 0x09, 0x52, 0x2C, 0};
const byte command_3ch_7[] PROGMEM = {0x3C, 0x09, 0x52, 0x2C, 0};

// チャンネル確定
const byte command_channel_1[] PROGMEM = {0xDA, 0x39, 0x52, 0x2C, 0};
const byte command_channel_2[] PROGMEM = {0xDB, 0x39, 0x52, 0x2C, 0};
const byte command_channel_3[] PROGMEM = {0xDC, 0x39, 0x52, 0x2C, 0};

// おやすみ30分
const byte command_sleep30_1[] PROGMEM = {0xA1, 0x39, 0x52, 0x2C, 0};
const byte command_sleep30_2[] PROGMEM = {0xAA, 0x39, 0x52, 0x2C, 0};
const byte command_sleep30_3[] PROGMEM = {0xB3, 0x39, 0x52, 0x2C, 0};

// 赤外線送信データ一覧
const byte * const commands[] PROGMEM = {
    command_1ch_0,
    command_1ch_1,
    command_1ch_2,
    command_1ch_3,
    command_1ch_4,
    command_1ch_5,
    command_1ch_6,
    command_1ch_7,
    command_2ch_0,
    command_2ch_1,
    command_2ch_2,
    command_2ch_3,
    command_2ch_4,
    command_2ch_5,
    command_2ch_6,
    command_2ch_7,
    command_3ch_0,
    command_3ch_1,
    command_3ch_2,
    command_3ch_3,
    command_3ch_4,
    command_3ch_5,
    command_3ch_6,
    command_3ch_7,
    command_channel_1,
    command_channel_2,
    command_channel_3,
    command_sleep30_1,
    command_sleep30_2,
    command_sleep30_3,
};

// チャンネル切り替え用オフセット
byte command_offset = 0;

void setup() {
    // ポート設定
    {
        sbi(DDRB, DDB1);

        sbi(PORTB, PORTB0);
        sbi(PORTB, PORTB2);
        sbi(PORTB, PORTB3);
        sbi(PORTB, PORTB4);
    }

    // タイマー設定 
    {
        TCCR0A =
            (0 << COM0A1)
          | (0 << COM0A0)
          | (0 << COM0B1)
          | (0 << COM0B0)
          | (1 << WGM01)
          | (1 << WGM00)
          ; 

        TCCR0B =
            (0 << FOC0A)
          | (0 << FOC0B)
          | (1 << WGM02)
          | (0 << CS02)
          | (0 << CS01)
          | (1 << CS00)
          ;

        OCR0A = 31;
        OCR0B = 11;
        TIMSK0 = 0;
    }

    // 省電力設定
    {
        sbi(PRR, PRADC);
    }

    // チャンネル設定のRead/Write, チャンネル設定の送信
    {
        uint8_t eeprom_address = 0x00;
        uint8_t read_data = eeprom_read_byte(&eeprom_address);

        if (read_data == 0 || read_data == 8 || read_data == 16) {
            command_offset = read_data;
        } else {
            command_offset = 0;
            eeprom_update_byte(&eeprom_address, command_offset);
        }

        _delay_ms(20);

        byte command_no = get_command_no();

        if (command_no == IR_COMMAND_ON) {
            read_data = 0;
            command_no = 0;
        } else if (command_no == IR_COMMAND_FULL) {
            read_data = 8;
            command_no = 1;
        } else if (command_no == IR_COMMAND_NIGHT) {
            read_data = 16;
            command_no = 2;
        } else {
            read_data = command_offset;
        }

        if (read_data != command_offset) {
            command_offset = read_data;
            eeprom_update_byte(&eeprom_address, command_offset);

            byte buffer[COMMAND_SIZE] = {0};
            command_offset = 24;
            get_command_data(command_no, buffer);
            ir_send(buffer);
            command_offset = read_data;
        }
    }

    // 割り込み設定とスリープ設定 
    cli();
    {
        sbi(GIMSK, PCIE);

        sbi(PCMSK, PCINT0);
        sbi(PCMSK, PCINT2);
        sbi(PCMSK, PCINT3);
        sbi(PCMSK, PCINT4);

        set_sleep_mode(SLEEP_MODE_PWR_DOWN);
    }
    sei();
}

void loop() {
    sleep_mode();

    _delay_ms(20);

    byte command_no;
    byte buffer[COMMAND_SIZE] = {0};
    byte *longPress = &buffer[4];

    do {
        if (*longPress) {
            _delay_ms(100);
        }

        command_no = get_command_no();

        if (command_no == IR_COMMAND_NONE) {
            return;
        }

        get_command_data(command_no, buffer);
        ir_send(buffer);
    } while (*longPress);
}

// コマンドNo取得
byte get_command_no() {
    return
          ((bit_is_set(PINB, PINB4) ? 1 : 0) << 3)
        | ((bit_is_set(PINB, PINB2) ? 1 : 0) << 2)
        | ((bit_is_set(PINB, PINB0) ? 1 : 0) << 1)
        | ((bit_is_set(PINB, PINB3) ? 1 : 0) << 0)
        ;
}

// 指定したコマンドNoの赤外線送信データを取得
void get_command_data(byte command_no, byte *out) {
    memcpy_P(out, (byte *)pgm_read_byte(
                &commands[command_offset + command_no]), COMMAND_SIZE);
}

// 赤外線送信
void ir_send(byte *command) {
    // データ部生成
    uint32_t data =
          ((uint32_t)command[0] << 24)
        | ((uint32_t)command[1] << 16)
        | ((uint32_t)command[2] <<  8)
        | ((uint32_t)command[3] <<  0)
        ;

    // パリティ計算
    byte parity = command[0] ^ command[1];

    // リーダ部送信
    sbi(TCCR0A, COM0B1);
    _delay_loop_2(HEADERMARK);
    cbi(TCCR0A, COM0B1);
    _delay_loop_2(HEADERSPACE);

    // データ部送信
    for (uint8_t i = 0; i < 32; i++) {
        sbi(TCCR0A, COM0B1);
        _delay_loop_2(DATAMARK);
        cbi(TCCR0A, COM0B1);
        _delay_loop_2((data>>i) & 1 ? ONESPACE : ZEROSPACE);
    }
    
    // パリティ送信
    for (uint8_t i = 0; i < 8; i++) {
        sbi(TCCR0A, COM0B1);
        _delay_loop_2(DATAMARK);
        cbi(TCCR0A, COM0B1);
        _delay_loop_2((parity>>i) & 1 ? ONESPACE : ZEROSPACE);
    }

    // トレーラ部送信
    sbi(TCCR0A, COM0B1);
    _delay_loop_2(DATAMARK);
    cbi(TCCR0A, COM0B1);
    _delay_loop_2(ZEROSPACE);
}
```

## コンパイル(ヒューズ)設定
省電力化するために以下を変更しました。
- BOD (Brown Out Detection) をDisable
- クロック周波数を1.2MHzに変更


__BODをDisable__
電源電圧は3Vですが電源電圧がマイコンの動作電圧(ATtiny13Aの場合1.8V)を下回ると誤動作を引き起こす可能性があります。BODは電圧低下を感知してマイコンにリセットを掛けてマイコンを停止させる仕組みです。

恐らくマイコンが誤動作を引き起こすよりも前に電圧不足で赤外線送信ができなくなる(LEDを点灯させるための順電圧が足りない)かと思います。またBODをDisableにしたときの消費電力が少なくなり省電力化に著しく寄与しました。


__クロック周波数変更__
基本的にはAVRマイコンはクロック周波数が低いほど低電圧で動作させることができます。
またデフォルトのクロック周波数は9.6MHzですが赤外線送信するのに必要な38KHzの変調と精度が450usec程度の遅延(待ち処理)が作り出せればよいので高周波は必要ありません。
タイマーはクロック周波数に依存するため38KHzの変調を作り出すときや遅延時間算出のために計算する必要がありますが時間を掛けたくなかったのでネットでよく使われている1.2MHzに合わせました。


## データ宣言
ヘッダファイルのインクロード、定数の定義に続いて各コマンドを配列で定義しています。

照明操作用のコマンドはパリティを含めないで1つ4Byteで30コマンドあります。そのためデータとしては120Byteあります。前述の通りSRAMは64Byteしかないため全く足りないので工夫する必要があります。

```cpp
const byte command_1ch_0[] PROGMEM = {0x91, 0x39, 0x52, 0x2C, 1};
```
配列の最後の要素は長押し対応の場合は1,そうでない場合は0を指定するようにして長押し対応コマンドか判定します。

[PROGMEM](https://www.arduino.cc/reference/tr/language/variables/utilities/progmem/) はArduinoスケッチの特別なキーワードでデータをSRAMではなくフラッシュメモリ(プログラム領域)に格納します。これによりSRAM容量以上のデータを定義することができました。 その分プログラムサイズが増えましたがギリギリフラッシュメモリの容量以内に収めることができました。

コンパイル時のログ
```
最大1024バイトのフラッシュメモリのうち、スケッチが972バイト（94%）を使っています。
最大64バイトのRAMのうち、グローバル変数が1バイト（1%）を使っていて、ローカル変数で63バイト使うことができます。
```


## setup() 処理

ここではレジスタの設定を行います。データシートを見てどのレジスタにどのような設定をするかを知っている必要があるのでプログラムを見ただけでは何をしている理解できないかと思います。詳細はデータシートを参照して頂くこととして簡単な説明に留めます。


`sbi(レジスタ, ビット)` で指定のレジスタの指定のビットを1にします。`cbi(レジスタ, ビット)` で指定のレジスタの指定のビットを0にします。

__ポート設定__
- PB1(pin6)に赤外線LEDを接続しているため出力ポートに設定
- エンコーダに接続されている8つのボタンはOFFのときHIGHが出力(LOW Active)なので PB0,PB2,PB3,PB4の出力をHIGHに設定


__タイマー設定__
38KHz変調(38KHzでON/OFFを繰り返す信号)を生成するための設定します。

- 波形生成種別を高速PWMに設定
- OCR0A = 31 は (( 1.2MHz / 38kHz ) / 1(分周) ) - 1 = 30.6 より算出
- OCR0B = 11 は duty比を1/3にする ( 1.2MHz / 38kHz ) / 3 = 10.5 より算出

38KHz変調の波形の生成はマイコンのタイマーで実施しているためプログラム(loop関数内)からはPB1(pin6)に出力する/しないを指定しているだけで非常に簡単に制御しています。

実際に簡易オシロスコープで波形を計測したものが下の画像です。矩形波が36.7MHzで出力されています。38KHzになっていませんがこれくらいの誤差であれば問題なく赤外線送信できます。

![](/img/blogs/2025/0328_ir-remote-control-with-attiny13a/38khz.png)

__省電力設定__
A/D変換器電力削減の設定をしていますが Active時とset_sleep_mode(SLEEP_MODE_IDLE)のときのみ有効らしいので必要ないかもしれません。本プログラムでのスリープモードはset_sleep_mode(SLEEP_MODE_PWR_DOWN)を指定しています。


__赤外線送信チャンネル設定のRead/Write__
リモコンにはチャンネル切り替えスイッチ(3値)と確定ボタンがあるのですが一度設定すればほとんど利用しないため最初は実装しない予定でしたが、プログラム領域に余裕があったため実装しました。ただし、ATtiny13Aのポートはすべて使用済みのため空いていません。どのように切り替えに対応しようか悩んだ末、電源(ボタン電池を取り付けたとき)を入れてsetup関数が呼ばれたときに押していたボタンの種別でチャンネル設定をすることにしました。

|ボタン        | チャンネル設定         |
|:------------:|:----------------------:|
|押してないとき| 保存していたチャンネル |
|点灯 ボタン   |     1ch                |
|常夜灯 ボタン |     2ch                |
|全灯 ボタン   |     3ch                |

チャンネル設定はEEPROMに書き込んでいるためボタン電池を交換したとしても設定したチャンネルが復元できるようにしています。


__割り込み設定とスリープ設定__

- 割り込みの種類をピンの状態が変化したときに割り込みが発生するように設定
- エンコーダーの出力(PB0,PB2,PB3,PB4)にピン変化割り込み許可を設定
- スリープモードをSLEEP_MODE_PWR_DOWNに設定

スリープモードは SLEEP_MODE_IDLE, SLEEP_MODE_ADC, SLEEP_MODE_PWR_DOWN の3種類があり下記表のような動作となっています。

![](/img/blogs/2025/0328_ir-remote-control-with-attiny13a/sleep_mode.png)

SLEEP_MODE_PWR_DOWN に設定するとすべてのクロックが停止し、発信回路も停止するためマイコンは深い深い眠りにつくモードとなります。割り込みの状態を感知すること以外の活動が一切停止するため消費電力が0.1uA以下となりほぼ電力を消費しなくなります。
眠りから目覚める方法は以下の方法のみです。
- INT0による外部割込みかピン変化割り込み
- ウォッチドッグタイマー割り込み

エンコーダーの出力(PB0,PB2,PB3,PB4)にピン変化割り込み許可を設定したのでピン変化、つまりボタンを押したときにピンの状態が変化して目覚めるようにしました。


## loop() 処理

__ループ処理__
プログラムのメインルーチンになります。
1. sleep_mode()関数でスリープに入るためボタンが押されるまでここでプログラムは停止しています
2. ボタンが押されてピン変化割り込みにより目覚めたらチャタリング防止のため20msec待ちます
3. 押されたボタンを特定し、ボタンに対応するコマンドデータを取得して赤外線送信(赤外線LEDの点滅処理を実施)します
4. このとき押されたボタンが長押し対応ボタンの場合は100msec待って同じ処理を繰り返します
5. loop()関数を抜けるとすぐにまたloop()関数がコールされるため 1 に戻ります

:::info
チャタリングとはボタンやスイッチをON/OFFすると機械的な振動を起こす現象です。短い時間ON/OFFが繰り返されるためピン変化通知などで割り込みを発生させた場合ボタンを1回ONにすると何度も割り込みが発生してしまうことがあります。
:::


__コマンドNo取得__
エンコーダーの出力(PB0,PB2,PB3,PB4)値をシフト演算して4bitの数値に変換して返します。この数値がコマンドNoとなります。


__指定したコマンドNoの赤外線送信データを取得__
[データ宣言](#%E3%83%87%E3%83%BC%E3%82%BF%E5%AE%A3%E8%A8%80)時にコマンドデータはフラッシュメモリに格納するようにしましたのでここでフラッシュメモリに格納したコマンドデータを取得しています。


__赤外線送信__

1. コマンドデータ配列から送信データを生成
    シフト演算して32bitデータを作成します
2. パリティ計算
    パリティはデータコードを排他的論理和(xor) `data[0] ^ data[1]` で計算します
3. リーダ部送信
    ONを8T間送信しOFFにして4T間待つ
4. データ部送信
    コマンドデータを右シフトして最下位ビットの値を見て 送信クリア待ち時間を決定します
5. パリティ送信
    リーダ部送信と同じことをパリティデータに関しても実施します
6. トレーラ部送信
    本来OFFは最小8ms必要らしいが下記でも問題ないらしい

IRremoteライブラリで計測した結果 T=450[usec]となりましたが、この時間を計測するにはATTiny13Aの `util/delay_basic.h` に定義されている `_delay_loop_2(loop_count)` を利用します。
データシートより `_delay_loop_2(1)` は4CPUサイクル消費されるため CPU周波数(F_CPU) が 1.2MHzのときは1,200,000[Hz]/4[cycle] = 300,000なので 300,000で1[sec]待つことになります。
引数は16bitカウンタ(65,536まで)なので30,000のとき、`_delay_loop_2(30000)` で100[msec]待ちとなります。

ここから1T=450[usec]待つには `_delay_loop_2(135)` となります。8T, 4T, 3Tを求めると `loop_count` の値は以下となります。
```cpp
#define headerMark  1035 // 8T(3450us):3450*30000/100000 = 345*3 = 1035
#define headerSpace  510 // 4T(1700us):1700*30000/100000 = 170*3 =  510
#define dataMark     135 // 1T(450us) : 450*30000/100000    45*3 =  135
#define oneSpace     390 // 3T(1300us):1300*30000/100000 = 130*3 =  390
#define zeroSpace    135 // 1T(450us) : 450*30000/100000 =  45*3 =  135
```

# まとめ
試行錯誤がありましたが目標に掲げたマイコンの機能をフル活用、省電力、低コストが実現でき、loop()関数もシンプルに記述できたかと思います。1点心残りなのが `おやすみ30分`コマンドの呼び出しができていないことですが別の機会にでもチャレンジしたいです。
次回は[【基板・ケース作成編】](../ir-remote-control-with-attiny13a_epi3/)となります。


[^1]:スイッチの複数同時押しは考慮せずに検討しました
[^2]:[SN74HC148Nのデータシート](https://www.ti.com/lit/ds/symlink/sn74hc148.pdf)。秋月電子での価格は30円と非常に安いです
[^3]:Xは判定には関係ない値
[^4]:実際は38KHzのパルスとしてON/OFFが繰り返されるため連続的な点灯ではなく高速に点滅を繰り返しています
