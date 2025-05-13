---
title: IoT を使ってみる（その２０：MicroPythonで始めるESP32プログラミング”超”入門）
author: shuichi-takatsu
date: 2025-05-14
tags: [vscode, esp32, micropython, pymakr]
image: true
---

## はじめに

この「IoTを使ってみる」シリーズでは主に [PlatformIO](https://platformio.org/) や [ESP-IDF](https://idf.espressif.com/) という開発環境を使ってきました。  
VSCodeを使えば開発がかなり楽になるとはいえ、中には C/C++言語よりももっとサクサク開発したいと思った方も多いのではないでしょうか。  
そこで今回は `ESP32`上に `MicroPython` という扱いやすい軽量Python実装を導入して、プログラム開発する方法をやさしくご紹介します。  

### この記事でわかること
- VSCode + PyMakr を使ったESP32プログラミングの第一歩（”Lチカ”プログラム）
- MicroPythonファームウェアの書き込み方法（開発環境の準備）
- REPLやファイルアップロードなどの基本操作（実際の画面と手順付き）

### 対象読者
- 「ESP32ってよく聞くけど、実際どう使うのか」と気になっている方
- C/C++よりPythonで開発してみたい方

---

## 開発環境

開発環境は以下を使用します。
- OS: Windows 11 （ローカル環境）
- Python: v3.11.7
- IDE: Visual Studio Code
- PyMakr: VSCode拡張機能（Ver 2.25.2）
- ターゲット: ESP32 開発ボード（ESP-WROOM-32等）

※PyMakrは 2022年頃から更新がストップしていますが、MicroPython開発環境としてまだ利用できるので、今回はこのPyMakrを使って進めていきます。

### PyMakr（VSCode拡張機能）のインストール
VSCodeの拡張機能から「[PyMakr](https://github.com/pycom/pymakr-vsc)」で検索してインストールします。
![](https://gyazo.com/da19970e28e72a8dd9f6c0b5d5c95932.png)

※インストールしたのは Preview版ですが、私の環境では安定版の方が不安定だったので、Preview版を採用しました。
  GUIでの操作が不要なら「[mpremote](https://docs.micropython.org/en/latest/reference/mpremote.html
  )」というツールも使えます。

---

## MicroPythonファームウェアの書き込み

ESP32で MicroPython を使用する場合には、事前にMicroPythonファームウェアを ESP32上にインストールしておく必要があります。

### 1. MicroPythonファームウェアのダウンロード

こちらの[公式サイト](https://micropython.org/download/esp32/)からファームウェアをダウンロードします。  
![](https://gyazo.com/f8cec67caa8c4ce2d577f22a2b07f9b9.png)

※例では「`ESP32_GENERIC-20250415-v1.25.0.bin`」をダウンロードしました。

### 2. `esptool` のインストール

MicroPythonファームウェアを ESP32 に書き込むためのツールとして「esptool」を使用します。
`esptool` をローカル環境にインストールします。

```bash
pip install esptool
```

### 3. ESP32のFlashメモリの初期化

事前に ESP32 のFlashメモリを初期化します。（例: COM6の場合）
```bash
esptool --port COM6 erase_flash
```

### 4. ESP32へのファームウェア書き込み

先ほどダウンロードした MicroPythonファームウェアを ESP32に書き込みます。（例: COM6の場合）

```bash
esptool --chip esp32 --port COM6 --baud 460800 write_flash -z 0x1000 ESP32_GENERIC-20250415-v1.25.0.bin
```

※COMポート番号はOSによって異なる場合があります。（Linux: `/dev/ttyUSB0` など）

---

## PyMakrでの開発

ESP32 を USB-COMで接続しておきます。
PyMakrでプロジェクトを作成し、ESP32 と USB-COM で接続し、プログラムを ESP32 にアップロードします。

### 1. プロジェクトを作成

「PyMakr」をクリックして「PYMAKR: PROJECTS」の右の「＋」ボタンを押します。
![](https://gyazo.com/4cd285e0573bfcaa7497e07b3bd6b65e.png)

プロジェクトのベースフォルダを選択し、プロジェクト名を入力します。
![](https://gyazo.com/400796c205c07b6253cce035d96ff0ef.png)

格納先の選択を求められるので「プロジェクト名」側を選択します。
![](https://gyazo.com/9dbf51ed9e869eadbcd973d66bbab400.png)

空のプロジェクト「empty」を選択します。
![](https://gyazo.com/9265d2b30244f5a9a656c1e385b9222a.png)

ESP32が接続している USB-COMポート（例ではCOM6）を選択し、OKを押します。  
（※この時、VSCodeの仕様によりワークスペースが自動作成されますが今は無視でいいです）  
![](https://gyazo.com/b258d80506db3159637a96c358bd6bb1.png)

プロジェクト（my-proj）には以下のファイルが作成されています。
```text
my-proj/
├── boot.py
├── main.py
├── pymakr.conf
```

「boot.py」「main.py」にはまだプログラムは記述されていません。  
「pymakr.conf」も最小限の定義のみされています。  

boot.py
```python
# boot.py -- run on boot-up
```

main.py
```python
# main.py -- put your code here!
```

pymakr.conf
```conf
{
  "py_ignore": [
    ".vscode",
    ".gitignore",
    ".git",
    "env",
    "venv"
  ],
  "name": "my-proj"
}
```

### 2. 接続の確認

「PYMAKR: PROJECTS」リストに、接続される USB-COMポートが表示されています。  
USB-COMポートを選択し「connect device」ボタンを押します。
![](https://gyazo.com/87f898d74ecd47b9dc259af79aadbcf1.png)

ESP32 が接続されます。  
![](https://gyazo.com/35302fff452b95d1aa89e1ff9d24a785.png)

「open device in file explorer」をクリックすると、シリアル通信経由でESP32内部に格納されている Pythonファイルが確認できるようになります。  
画像では「boot.py」のみ格納されているのがわかります。  
（※またワークスペースが開きましたが、とりあえずは気にせず進めて構いません）
![](https://gyazo.com/e01966aadc239ed9c5a74b5c6f328eec.png)

### 3. プログラムを作成（例：LED点滅）

ローカル側で以下のPythonファイル「blink.py」を作成します。  
（LEDを点灯させるためのGPIOピンは23番に設定してあります）

blink.py
```python
from machine import Pin
from time import sleep

led = Pin(23, Pin.OUT)

while True:
    led.value(not led.value())
    sleep(0.5)
```

### 4. プログラムのアップロード

作成したプログラムを ESP32側にアップロードします。

接続したUSB-COMポートの「Upload」「Download」ボタンで、ローカル側のファイルを ESP32 側にアップロードしたり、ESP32側のファイルをローカル側にダウンロードできます。  
![](https://gyazo.com/2fdd0e04a42355200db7003a542ff0d9.png)

ファイル単位で「右クリック」→「Upload」操作もできます。（ファイル単位の場合、Download はできません）

以下は一括でファイルをデバイス（ESP32）側にアップロードした例です。  
![](https://gyazo.com/ded6382d32ddefdbc3bd33fe1df2b81b.png)

### 5. プログラムの実行

ファイル単位で「右クリック」→「Run」操作ができます。  
「blink.py」をRunすると、LEDが1秒間隔で点滅を繰り返します。
（無限ループになっているため、終了するには ESP32 側のリセットボタンを押してください）

また以下のように「Create terminal」ボタンをクリックすると、ESP32側で REPL が起動します。
![](https://gyazo.com/3bdefdb43980249884a3faa4131998a7.png)

**REPL** とは「Read–Eval–Print Loop（読み取り・評価・出力・繰り返し）」のそれぞれの頭文字をとった言葉です。  
| 項目        | 内容                |
| --------- | ----------------- |
| **Read**  | 入力（コード）を読み取る      |
| **Eval**  | 入力されたコードを実行（評価）する |
| **Print** | 結果を出力（表示）する       |
| **Loop**  | このサイクルを繰り返す       |

REPL上にて以下のように指示を出します。
![](https://gyazo.com/4e2dd54b970889f5f3397f490c8324d3.png)

LEDが1秒間隔で点滅を繰り返します。
（点滅を終了させるには「Ctrl＋C」で REPL の実行を終了させます）

---

## boot.py と main.py の違い

プロジェクトの「boot.py」「main.py」にはまだ何も書かれていませんが、以下のような役割があります。

| ファイル | タイミング | 用途 |
|----------|------------|------|
| `boot.py` | 起動時最初に実行 | Wi-Fi初期化、設定など |
| `main.py` | `boot.py` のあと | ユーザーロジック |

### boot時にパーティション情報を取得する

ESP32の起動時にパーティション情報を取得するようにしてみます。
パーティション情報を取得するには、MicroPython が持っている「esp32.Partition」を使用します。  
しかし、`Partition.find()` が factory しか返さないので、全パーティション情報を取得するにはちょっと工夫が必要です。  
かなり強引な方法ですが、定義されているタイプの数分ループして情報を取得します。  

boot.pyに以下のプログラムを記述します。
```python
from esp32 import Partition

# サイズを "4K" や "2M" などに変換する関数
def human_readable_size(size):
    if size >= 1024 * 1024:
        return "{}M".format(size // (1024 * 1024))
    elif size >= 1024:
        return "{}K".format(size // 1024)
    else:
        return "{}B".format(size)

# 探索対象の type, subtype の組み合わせ（代表的なもの）
PARTITION_TYPES = {
    0: 'APP',      # アプリケーション
    1: 'DATA',     # データ
}

PARTITION_SUBTYPES = {
    0: 'factory',
    1: 'ota_0',
    2: 'ota_1',
    16: 'test',
    32: 'nvs',
    33: 'phy',
    34: 'nvs_keys',
    129: 'fat',
    130: 'spiffs',
}

print("[BOOT] Scanning partitions...")

found_labels = set()
for type_id, type_name in PARTITION_TYPES.items():
    for subtype_id, subtype_name in PARTITION_SUBTYPES.items():
        try:
            parts = Partition.find(type_id, subtype_id)
            for part in parts:
                info = part.info()
                label = info[4]
                if label not in found_labels:
                    found_labels.add(label)
                    size = info[3]
                    print(" - type={}({}) subtype={}({}) label='{}' offset={} size={} ({}) readonly={}".format(
                        type_id, type_name,
                        subtype_id, subtype_name,
                        label,
                        hex(info[2]),
                        hex(size), human_readable_size(size),
                        info[5]
                    ))
        except Exception:
            continue
```

blink.pyと同様の方法で ESP32 にプログラムをアップロードします。  
ESP32 をリセットすると REPL上に 次のようなログが出力されました。  
```text
rst:0x1 (POWERON_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)
configsip: 0, SPIWP:0xee
clk_drv:0x00,q_drv:0x00,d_drv:0x00,cs0_drv:0x00,hd_drv:0x00,wp_drv:0x00
mode:DIO, clock div:2
load:0x3fff0030,len:4892
ho 0 tail 12 room 4
load:0x40078000,len:14896
load:0x40080400,len:4
load:0x40080404,len:3372
entry 0x400805b0
[BOOT] Scanning partitions...
 - type=0(APP) subtype=0(factory) label='factory' offset=0x10000 size=0x1f0000 (1M) readonly=False
 - type=1(DATA) subtype=1(ota_0) label='phy_init' offset=0xf000 size=0x1000 (4K) readonly=False
 - type=1(DATA) subtype=2(ota_1) label='nvs' offset=0x9000 size=0x6000 (24K) readonly=False
 - type=1(DATA) subtype=129(fat) label='vfs' offset=0x200000 size=0x200000 (2M) readonly=False
MicroPython v1.25.0 on 2025-04-15; Generic ESP32 module with ESP32
Type "help()" for more information.
>>>
```

パーティション情報を表にします。
| ラベル (label) | タイプ (type)         | アドレス範囲             | サイズ             |
|----------------|------------------------|---------------------------|--------------------|
| nvs            | DATA (subtype=2)       | 0x0009000 - 0x000EFFF     | 0x006000 (24K)     |
| phy_init       | DATA (subtype=1)       | 0x000F000 - 0x000FFFF     | 0x001000 (4K)      |
| factory        | APP  (subtype=0)       | 0x0010000 - 0x020FFFF     | 0x1F0000 (1M)      |
| vfs            | DATA (subtype=129/FAT) | 0x0200000 - 0x03FFFFF     | 0x200000 (2M)      |

起動時に boot.py が実行されていることがわかります。

---

## USB-COMポート経由で直接 ESP32上の Pythonプログラムを変更する

MicroPython + PyMakr 環境の大きな強みのひとつが **リモート側プログラムの”直接編集”＆”即実行”機能** です。

通常、組み込み開発では「コードをPCで書いて → コンパイルして → ビルドして → デバイスに書き込んで → 再起動して確認して…」という流れが当たり前です。  
ところが PyMakr では、**ESP32 上にあるファイルを直接エディタで開き、そのまま編集＆保存して即実行**できます。

これはまるで、ESP32 を「リモートファイルサーバー」や「ライブPython環境」として使えるような感覚です。

### デバイス上のファイルを直接編集するには

1. 「PYMAKR: PROJECTS」 で接続済みデバイスを選びます  
2. 「Open device in file explorer」をクリック  
3. ESP32 内部のファイル（たとえば `main.py` や `boot.py`）がエクスプローラーとして表示されます  
4. そのままファイルを編集して `Ctrl+S` で保存すると、すぐに ESP32 側が更新されます  

![](https://gyazo.com/359bbf18cf684e8dd14e68e04bca4cfb.png)

### なぜ便利なのか

- **転送不要・即実行**：編集 → 保存だけでESP32が反映してくれる
- **現地修正**が可能：リモートでデバッグや微修正する場合にも便利
- **動作確認しながら開発**：main.pyに試し書きし、動いたらローカルにダウンロードしてGithub等で共有可能

```text
今までは：
    ローカルで編集 → アップロード → 実行 → デバッグ → 修正 → 再アップロード

これからは：
    デバイス上で編集 → 保存 → 即実行！
```

VSCodeの「REPL」や「ファイルエクスプローラー」と連携させることで、まるでローカルファイルを編集するかのように ESP32 上のファイルを管理できます。  
これに慣れると、もう従来の開発スタイルには戻れないかもしれません。  

## 今後の展望

MicroPython のESP32対応版には以下のような機能も備わっていますので、色々な応用が考えられます。
- DHT温湿度センサとの接続
- Wi-Fi経由でデータ送信（HTTP / MQTT）
- WebREPLで無線からアクセス

---

## まとめ

今回は、**MicroPython + VSCode + PyMakr** を使った ESP32 プログラミングを紹介しました。  
`MicroPython` は扱いやすく、軽量で高速な開発が可能です。  
ESP32プログラミングの敷居をぐっと下げてくれると思います。  

[IoTに関するチュートリアルや実践テクニックをまとめています。](/iot/)

IoT活用の参考になれば幸いです。

---

<style>
img {
    border: 1px gray solid;
}
</style>
