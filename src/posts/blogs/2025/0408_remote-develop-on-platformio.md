---
title: みんな大好きVSCodeと組み込みソフトウェア開発環境PlatformIOでリモート開発をしてみる（Arduino編）
author: shuichi-takatsu
date: 2025-04-08
tags: [arduino, remote, platformio]
image: true
---

組み込みソフトウェア開発をするなら [PlatformIO](https://platformio.org/) が大変便利です。
これまでも、以下の記事で PlatformIOを紹介してきました。
- [ESP32開発ボードをESP-PROGとPlatformIOを使ってデバッグする](/blogs/2024/01/03/esp32-debug-by-esp-prog/)
- [Raspberry Pi PicoをRaspberry Pi デバッグプローブとPlatformIOを使ってデバッグする](/blogs/2024/01/07/raspberry-pi-pico-debug-by-debug-probe/)
- [STM32マイコンボード（STM32F103C8T6）をST-Link V2互換品とPlatformIOを使ってデバッグする](/blogs/2024/01/29/stm32-debug-by-st-link/)

さて、今日のお題は「マイコンがネットワーク上の別PCに接続されていた場合、どうやってマイコンにプログラムを転送するか」です。  

一つの方法としては、リモート側PC上に事前にマイコンの開発環境を作っておき、ホスト側PCのVSCodeからリモート側PCにSSHで接続して、リモート側PC上の開発環境を利用して開発を行うことができるとは思います。
ただ、リモート側PCに開発環境が用意できないとか、十分なリソースがない場合は利用できません。

今回は PlatformIO を使って、ネットワーク上のリモート側PCにUSB接続されているマイコンにLチカプログラム（LEDがチカチカするだけのプログラム）をUploadする方法をご紹介したいと思います。  
プログラムの転送先マイコンには、みんな大好き [Arduinoマイコン](https://www.arduino.cc/) を使っていきます。

## PlatformIOのインストール（ホスト側）

まず、PlatformIO を VSCode にインストールする方法は、[こちら](/iot/internet-of-things-14/#開発環境「platform-io」)でも軽く紹介していますが、ざっとおさらいしておきます。  
インストールは簡単です。  
VSCodeの拡張機能マーケットプレースで「platformio」と検索します。
以下の拡張機能が見つかったら、拡張機能をインストールするだけです。  
![](https://gyazo.com/776073d3f7845c935eb8ce0b102df75f.png)

VSCodeの拡張機能に次のアイコンが表示されたら、インストールされています。  
![](https://gyazo.com/a577112c4f2e0a119d491db38e146de0.png)

## PlatformIO Core（CLI）のインストール（リモート側）

今回リモート側はIDEを用意する必要はないので [Core（CLI）](https://docs.platformio.org/en/latest/core/index.html)のみインストールします。

リモート側PCとして以下の２つを用意しました。
- Windows 10 pro
- Raspberry Pi 3B+

PlatformIO は Pythonを使用しますので、Pythonを事前にPCにインストールしておきます。  
Pythonの準備方法については、ネット上にたくさん情報がありますので、ここでは割愛します。  
（VSCodeの拡張機能でインストールした場合は、Platform IDE と一緒に仮想環境Pythonもインストールされます）  

Core（CLI）のインストールは[ここ](https://docs.platformio.org/en/latest/core/installation/methods/installer-script.html)で示されている手順でインストールします。

私はローカルに「get-platformio.py」ファイルをダウンロードする方法でインストールしました。
![](https://gyazo.com/95ea981eb1752123d83238b5fa010350.png)

今後、pioコマンドを使っていきますので、PlatformIOがインストールされたパスを環境変数Pathに追加しておきます。

Windowsの場合はpath環境変数に以下を追加
```shell
C:\Users\＜ユーザーID＞\.platformio\penv\Scripts
```

Raspberry Piの場合は .bashrc の最後に以下を追加
```shell
export PATH=$PATH:$HOME/.platformio/penv/bin
```

### 99-platformio-udev.rules 設定（Raspberry Pi側のみ必要）

ここで Raspberry Pi側のみ以下の設定を実行しておきます。  
これを実行しないと Raspberry Pi側に Arduinoマイコンを接続した時に Arduinoマイコン通信用COMポートが認識されず、後々ハマります。  

設定方法は[ここ](https://docs.platformio.org/en/latest/core/installation/udev-rules.html)の手順に従います。

shellに以下のコマンドを入力します。  
```shell
curl -fsSL https://raw.githubusercontent.com/platformio/platformio-core/develop/platformio/assets/system/99-platformio-udev.rules | sudo tee /etc/udev/rules.d/99-platformio-udev.rules
```

その後、「udev」管理ツールを再起動します。
```shell
sudo service udev restart
```

## PlatformIOアカウントに登録・ログインが必要（ホスト／リモート双方）

### PlatformIOアカウント登録（1回だけ必要）

PlatformIOのリモート機能を使うには、PlatformIO アカウントへの登録とログインが必要です。 
[こちら](https://community.platformio.org/)からアカウント登録をします。  
![](https://gyazo.com/d7dddfcae32e126dee02a9d3660c0115.png)

登録が終わったら、ホスト側、リモート側の両方でログインします。

### ホスト側PlatformIOアカウントのログイン

VSCode上のPlatformIOで以下のように「PIO Account」をクリックします。  
Username または メールアドレス と PASSWORD を入力します。  
![](https://gyazo.com/056de1adaef9603af6506937417621bc.png)  

ログインできたことがわかります。  
![](https://gyazo.com/b59f15d72c45b4f381afb945e9f10bc8.png)  

### リモート側PlatformIOアカウントのログイン

コマンドラインで以下のコマンドを入力します。
```shell
pio account login
```

するとユーザIDとパスワードを聞かれるので、それらを入力します。
ログインに成功すると、「Successfully logged in!」とメッセージが表示されます。  
（一番最初のログイン時には、いくつかのPythonモジュールがダウンロード／インストールされます）

## Lチカプログラムを用意（ホスト側）

Lチカプログラムは何度も紹介してますし、ネットでググっても出てきますが、以下に載せておきます。  
今回、このLチカプログラムをリモート側PCに接続した Arduinoマイコン にアップロードします。

```cpp
#include <Arduino.h>

static int T_DELAY = 1000;

void setup()
{
  // initialize LED digital pin as an output.
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop()
{
  // turn the LED on (HIGH is the voltage level)
  digitalWrite(LED_BUILTIN, HIGH);
  // wait for a second
  delay(T_DELAY);
  // turn the LED off by making the voltage LOW
  digitalWrite(LED_BUILTIN, LOW);
   // wait for a second
  delay(T_DELAY);
}
```

## リモートエージェント起動（リモート側）

リモート開発をするためには「Agent」を起動しておく必要があります。  
リモート側PCで、以下のコマンドを入力し、リモートエージェントを起動します。  
（※注意：以下のコマンドは同時に2台のリモート側PCで実行しないでください。実行する場合は「name」の部分を別々の名称にしてください）

```shell
pio remote agent start --name slave
```

今回、リモート側の名前は「slave」としました。  
この名前がリモート環境を区別する識別子になります。  

起動が成功すると、つぎのようなメッセージが出ます。  
![](https://gyazo.com/8998b79b4356fc30002bfe88f033665f.png)

## リモート側COMポート確認（ホスト側）

では、ホスト側PCから リモートPC上のCOMポート（実際には Arduinoマイコン を接続したUSB-COMポート）を確認します。  

Project Taskから「Remote Devices」をクリックすると、ターミナルに「pio remote device list」コマンドが発行され、出力が表示されます。  

### Windows側にArduinoマイコンを接続

Windows側に Arduinoマイコン を接続します。  
今回、リモート側エージェント「slave」側に COM3 と COM5 ポートがあることがわかります。  
COM5ポートが Arduinoマイコン を接続したCOMポートです。  
![](https://gyazo.com/b237cd878a9bed1b7e55eede556068ce.png)

### Raspberry Pi側にArduinoマイコンを接続

先ほど「リモートコマンドは同時に2台のリモート側PCで実行しないでください」と言いましたが、リモート先の名称を変えて、ちょっとやってみましょう。  
リモート名称を以下のようにします。  
- Windows側：slave-win
- Raspberry Pi側：slave-pi

そして Raspberry Pi側に Arduinoマイコン を接続します。  
今回、リモート側エージェント「slave-pi」側に /dev/ttyACM0, /dev/ttyAMA0 ポートがあることがわかります。  
ディスクリプションから /dev/ttyACM0 側が Arduinoマイコン 側だと分かります。
![](https://gyazo.com/21ffeded5d77362eb2e25f2a56e7d68c.png)

## リモート側にプログラムをアップロード（ホスト側）

ここまでくれば、リモート側に接続した Arduinoマイコンにプログラムをアップロードするのは簡単です。  
「Rmote Upload」をクリックするだけです。  
実行すると以下のようにプログラムがアップロードされます。  
![](https://gyazo.com/e02e917af92d895b2cc848b16cae01fb.png)

正しくプログラムがアップロードされた場合は、ArduinoのLEDが1秒間隔でチカチカと点滅しているはずです。

### Arduinoマイコン にアップロードできないとき

PlatformIOは自動でアップロード対象のCOMポートを識別してプログラムを転送してくれますが、うまく転送先を認識できない時があります。
そういう時は、転送先のポート名を「platformio.ini」に記述します。

「/dev/ttyACM0」が転送先として認識されなかった場合は、次のように platformio.ini を「upload_port」を追記します。
```ini
[env:uno]
platform = atmelavr
framework = arduino
board = uno
upload_port = /dev/ttyACM0
```

### 特定のリモート先を指定する場合

「Remote Upload」をクリックすると、複数のリモート先を何度も検索してしまうので、コマンドラインから特定のリモート先を指定してプログラムのアップロードをしてみましょう。
以下のコマンドを入力します。（転送先は Raspberry Pi側の想定）
```shell
pio remote --agent slave-pi run --target upload
```

このようにすることで、特定のリモート先に対してプログラムのアップロードができるようになります。  
agent指定は複数設定できるようです。  
例えば以下のように書くこともできます。  
```shell
pio remote --agent slave-pi --agent slave-win run --target upload
```

## リモート側のエージェントのログを確認する（リモート側）

念のため、リモート側のエージェントのログも確認してみましょう。
![](https://gyazo.com/f5fff34e7fcd79086454b17b504bfa09.png)

このようにデバイスリストの要求とか、同期のログが表示されていれば成功です。

## まとめ

いかがだったでしょうか。意外と簡単にリモートPCに接続されたマイコンにプログラムをアップロードできたかと思います。  
今後は、他のマイコン（ESP32や Raspberry Pi Pico、STM）や WSL上のPlatformIO環境でのリモート開発なども執筆していきたいと思います。  

<style>
img {
    border: 1px gray solid;
}
</style>
