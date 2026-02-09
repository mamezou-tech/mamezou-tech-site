---
title: DJIドローン開発Tips - カスタムペイロードデバイスの Application Binding
author: masayuki-kono
date: 2026-02-10
tags: [Robot, Drone, DJI, Payload SDK, 太陽光発電パネル, 清掃ロボット]
image: true
---

## はじめに

豆蔵では太陽光発電パネルの清掃ロボットシステムの開発に取り組んでいます。

本システムでは太陽光発電パネルを清掃するロボットとロボットを搬送するドローンで構成されています。本記事では、ドローン側の開発技術である [Payload SDK](https://developer.dji.com/doc/payload-sdk-tutorial/en/tutorial-map.html) における [Application Binding](https://developer.dji.com/doc/payload-sdk-tutorial/en/quick-start/quick-guide/bind-application.html) について紹介します。

Payload SDK については以下の記事でもご紹介していますので併せて参照して下さい。

@[og](https://developer.mamezou-tech.com/robotics/solar-panel-clean-robot/dji-drone-psdk-introduction/)

## Application Binding について

一部の機体ではペイロードデバイスを使用する前に Application Binding という以下の手順が必要となります。

1. 機体とペイロードデバイスを接続し Payload SDK で開発されたアプリケーションを起動する
    - Payload SDK の初期化シーケンスで機体とのバインド待ちとなる
2. 機体とPCを接続し DJI Assistant 2 を起動する
    - バインド待ちとなっているペイロードデバイスの一覧が表示される
3. DJI Assistant 2 で機体とペイロードデバイスをバインドする
    - SDK の初期化シーケンスで機体が応答を返すようになり SDK の API を利用可能となる

バインドしたペイロードデバイスの情報は機体内に永続化され、以降は対象のペイロードデバイスを使用可能となります。

## Application Binding が必要な機体

以下は、現行機体が提供している拡張ポートの一覧です。[Standard Hardware Port Introduction](https://developer.dji.com/doc/payload-sdk-tutorial/en/quick-start/drone-port.html#standard-hardware-port-introduction) より抜粋。

| Aircraft | Port Name | Supports App Binding |
| -------- | ----------- | -------------------- |
| FlyCart 100 | E-Port Lite | – |
| FlyCart 30 | E-Port Lite | – |
| Matrice 4D/4TD | E-Port, E-Port Lite | ✓ |
| Matrice 4E/4T | E-Port, E-Port Lite | ✓ |
| Matrice 3D/3TD | E-Port, E-Port Lite | – |
| Matrice 30/30T | E-Port | – |
| Mavic 3E/3T | E-Port | – |
| M400 | E-Port V2 | ✓ |
| M350 RTK | E-Port | – |
| M350 RTK | Gimbal Port | ✓ |
| M300 RTK | OSDK Port | – |
| M300 RTK | Gimbal Port | ✓ |

`Supports App Binding` にチェックが入っている機体の拡張ポートへペイロードデバイスを接続する場合はバインドが必要です。

E-Port、E-Port V2、Gimbal Portで接続するペイロードデバイスが対象ですが、Matrice 系では
Matrice 4E/4T 以降のモデルから必要となっています。今後発売される機体では（E-Port Lite を除けば）基本的にはペイロードデバイスに対するバインドが必要になってくるものと思われます。

## SDK 認証チップ

バインドするカスタムペイロードデバイスには DJI SDK 認証チップ（略称 DJI SDK CC）を取り付ける必要があります。

[DJIストア](https://store.dji.com/product/dji-sdk-certified-chip) から50個セットのものを購入できます。

以下の写真のパッケージングされた細長いシート状のものが購入した認証チップです。
袋の上に置いてあるのは認証チップを取り付けるためのアダプタです（後述）。

![認証チップ](/img/robotics/solar-panel-clean-robot/dji-sdk-certified-chip.png)

認証チップは機体とサードパーティ製ペイロードデバイス間の通信を認証・暗号化するハードウェアセキュリティモジュールです。

この認証チップにより機体側が各ペイロードデバイスを識別可能となり、バインド済のペイロードデバイスの情報（認証チップの情報）が機体内に永続化されます。

このチップはサードパーティ向けに提供されているものですが DJI製のペイロードデバイスにも同様の認証チップ或いはこれに準ずる仕組みが組み込まれているものと思います。

## SDK 認証チップの接続

[SDK Certified Chip Quick Start](https://developer.dji.com/doc/payload-sdk-tutorial/en/payload-quick-start/quick-guide/sdk-cc.html) に `Raspberry Pi 4B` を対象とした接続例が記載されていますので、これをベースに解説致します。

### SDK 認証チップのインターフェイス

認証チップは I2C インターフェースでホスト（ `Raspberry Pi` ）と通信します。

下図は認証チップのピン配置です。

![認証チップのピン配置](/img/robotics/solar-panel-clean-robot/dji-sdk-certified-chip-pin.png)

- VCC: 電源入力ピン（動作電圧範囲: 1.62 V - 5.5 V）
- GND: グランドピン
- NRST: 外部リセットピン
- I2C_SCL: I²Cバスインターフェースピン（クロック信号の伝送用）
- I2C_SDA: I²Cバスインターフェースピン（データ転送用）

チップのパッケージタイプは DFN8 2x3 です。
外径サイズが 2mm x 3mm と非常に小型であるため、これに直接配線することは困難です。
そのため、以下の写真のような DIP8 ソケットにつなげる変換アダプタを使用します。

![認証チップ用アダプタ](/img/robotics/solar-panel-clean-robot/dji-sdk-certified-chip-adapter.png)

## SDK 認証チップと Raspberry Pi の接続

Raspberry Pi の [40-pin GPIO header](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#gpio) のピンと認証チップを接続します。

![40-pin GPIO header](/img/robotics/solar-panel-clean-robot/dji-sdk-certified-chip-connect-to-raspberry-pi.png)

認証チップと GPIO のピン対応は以下のとおりです。

| 認証チップ | GPIO |
| ------------- | ------------ |
| 1pin(7816IO) | (NC) |
| 2pin(Vcc) | 1pin(3.3V power) |
| 3pin(7816CLK) | (NC) |
| 4pin(GND) | 9pin(Ground) |
| 5pin(I2C_SDA) | 3pin(GPIO2:SDA) |
| 6pin(NC) | (NC) |
| 7pin(I2C_SCL) | 5pin(GPIO3:SCL) |
| 8pin(NRST) | 7pin(GPIO4:GPCLK0) |
| 9pin(GND) | 9pin(Ground) |

デバイスツリーで I²C を有効化した後に i2cdetect コマンドなどで I²C のアドレスが表示されればOKです。

以下の例だと認証チップに割り当たっているデバイスは `/dev/i2c-1` です。

```
$ ls /dev/i2c-*
/dev/i2c-1  /dev/i2c-20  /dev/i2c-21
```

認証チップの Vcc に 3.3V が給電されただけでは反応しません。

```
$ sudo i2cdetect -y 1
     0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f
00:                         -- -- -- -- -- -- -- -- 
10: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- 
20: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- 
30: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- 
40: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- 
50: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- 
60: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- 
70: -- -- -- -- -- -- -- --
```

以下のように GPIO4（認証チップの NRST と接続）を LOW にして HIGH にすると認証チップがリセットされ、I²C アドレス 0x2a が検出されます。

```
$ sudo gpioset gpiochip0 4=0
$ sudo i2cdetect -y 1
     0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f
00:                         -- -- -- -- -- -- -- -- 
10: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- 
20: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- 
30: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- 
40: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- 
50: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- 
60: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- 
70: -- -- -- -- -- -- -- --                         

$ sudo gpioset gpiochip0 4=1
$ sudo i2cdetect -y 1
     0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f
00:                         -- -- -- -- -- -- -- -- 
10: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- 
20: -- -- -- -- -- -- -- -- -- -- 2a -- -- -- -- -- 
30: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- 
40: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- 
50: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- 
60: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- 
70: -- -- -- -- -- -- -- --
```

## DJIのデベロッパーセンターで Payload SDK アプリケーションを登録する

バインドする前に Payload SDK アプリケーションを [DJIのデベロッパーセンター](https://developer.dji.com/user/apps/) で登録する必要があります。

アプリケーションの情報を入力します。

![アプリケーションの登録](/img/robotics/solar-panel-clean-robot/dji-sdk-create-app.png)

アプリケーションの登録後に Send Email を押下するとアクティベーションのインビテーションメールが送信されます。

![アクティベーション前](/img/robotics/solar-panel-clean-robot/dji-sdk-activate.png)

メールのリンク先を開くとアクティベーションが完了し ID や KEY が表示されます。

![アクティベーション後](/img/robotics/solar-panel-clean-robot/dji-sdk-activated.png)

ページに記載されている通り、デフォルトでは対象のペイロードデバイスは最大で20台までにしかバインドできません。

Application Verification のページで会社の説明やペイロードデバイスのテストレポートなど様々な書類を用意して審査が完了すると、台数の制約が解除されます。開発初期にはこの台数の制約は問題になりませんが、ペイロードデバイスを量産するフェーズではテストレポートを用意して申請しましょう。

![Application Verification](/img/robotics/solar-panel-clean-robot/dji-sdk-application-verification.png)

## Payload SDK アプリケーションの設定

ここでは Payload SDK の Raspberry Pi 向けのサンプルアプリケーションを例にして SDK への設定内容を説明します。

DJIのデベロッパーセンターで登録したアプリケーション情報を以下のファイルへ設定します。

[Payload-SDK/samples/sample_c++/platform/linux/raspberry_pi/application/dji_sdk_app_info.h](https://github.com/dji-sdk/Payload-SDK/blob/326b8698dd98d5451fc14cfc952976795d37bd66/samples/sample_c%2B%2B/platform/linux/raspberry_pi/application/dji_sdk_app_info.h#L35)

```
/* Exported constants --------------------------------------------------------*/
// ATTENTION: User must goto https://developer.dji.com/user/apps/#all to create your own dji sdk application, get dji sdk application
// information then fill in the application information here.
#define USER_APP_NAME               "your_app_name"
#define USER_APP_ID                 "your_app_id"
#define USER_APP_KEY                "your_app_key"
#define USER_APP_LICENSE            "your_app_license"
#define USER_DEVELOPER_ACCOUNT      "your_developer_account"
#define USER_BAUD_RATE              "460800"
```

| 定数名 | 説明 | 例 |
| ------ | ---- | -- |
| USER_APP_NAME | DJIのデベロッパーセンターの登録情報の `App Name` が対応します | DockingControl |
| USER_APP_ID | DJIのデベロッパーセンターの登録情報の `App ID` が対応します | - |
| USER_APP_KEY | DJIのデベロッパーセンターの登録情報の `App Key` が対応します | - |
| USER_APP_LICENSE | DJIのデベロッパーセンターの登録情報の `App Basic License` が対応します | - |
| USER_DEVELOPER_ACCOUNT | DJIのデベロッパーセンターのアカウント名です | masayuki-kono |

サンプルアプリケーションを実行して以下のログが延々と出力されれば OK です（バインド待ちの状態です）。

```
[Error]	dji_auth_sha256_rsa_verify.c:137  The DJI SDK CC has not binded. Please check the bind state of the DJI SDK CC and bind it.
```

:::info
Raspberry Pi 向けのサンプルコードはメンテナンスされていないようで、そのままでは以下のようなエラーが出力されて認証チップと通信に失敗します。

```
Connect DJI SDK CC device failed, errno: 0x30000002
```

アドレス 0x2A への書き込みで ioctl(I2C_RDWR) が -1 を返し、スレーブが ACK を返していないのが原因です。
`HalI2c_ResetDevice()` で GPIO4 を LOW→25ms→HIGH とリセットした直後に、即座にデバイスを開いて書き込みしています。チップがリセットから復帰しきる前に初回トランザクションが走っているのが原因と考えられます。リセット解放後、チップが I²C に応答できるまでに必要な待ち時間が不足しているようなので、リセット解放後 50ms 待ってから I²C アクセスを行うように変更して改善しました。

[Payload SDKをフォークしたリポジトリ](https://github.com/masayuki-kono/Payload-SDK/pull/3) に修正したコードをアップしていますので参考にして下さい。デバッグログの出力も追加しているのでどのようなデータをチップと送受信しているか観測すると理解が深まると思います。
:::

## 機体とペイロードデバイスを接続する

今回は Matrice 4E を使用しました。

各機器の接続イメージは以下の通りです。

![機体とペイロードの接続構成](/img/robotics/solar-panel-clean-robot/dji-sdk-binding-hardware-structure.png)

- [Matrice 4E](https://enterprise.dji.com/matrice-4-series)
    - Application Binding が必要な機体
- [E-Port Development Kit](https://store.dji.com/product/dji-e-port-development-kit)
    - 機体とペイロードデバイスを接続するためのアダプタボード
- UART-USB Adapter
    - Raspberry Pi のGPIO（UART ピン）へ直接接続する場合は不要
- Raspberry Pi
    - Payload SDK アプリケーションの動作環境
- PC
    - [DJI Assistant 2](https://www.dji.com/downloads/softwares/assistant-dji-2-for-matrice) の動作環境
    - DJI Assistant 2 は機体によってバリエーションがあり、Matrice 4Eの場合は Enterprise Series を使用する
    - DJI Assistant 2 は DJI のクラウドサービスと通信するためインターネットに接続する必要がある

### E-Port Development Kit

Development Kit の基盤上に `E-Port switch` というディップスイッチがあり、これを ON にします。

`USB ID switch(Device|Host)` のディップスイッチは、USB で RNDIS や Bulk 転送する場合に Host を設定する必要があります。今回は UART のみを使用するため、設定不要（どちらでも良い）です。

E-Port のコネクタはHW的にはリバーシブルですが、機体の E-Port コネクタと Development Kit を接続する際に機体側と開発キット側のコネクタの向きに指定があります。

[Connect Development Board to E-Port](https://developer.dji.com/doc/payload-sdk-tutorial/en/payload-quick-start/device-connect.html#connect-development-board-to-e-port) からの抜粋です。

```
Note: The E-Port coaxial USB-C cable doesn't have a foolproof design, allowing A/B side to be reversibly connected.
Due to pin layout differences in the aircraft's USB-C, if the coaxial cable is reversed, the other end also needs to be flipped correspondingly.
If not flipped correspondingly, the E-Port Development Kit can not power up and communicate.
```

以下の写真のようにコネクタに A/B が印字されており、機体側が A なら開発キット側は B 、機体側が B なら開発キット側は A のようにフリップする必要があります。

![E-Port コネクタの向き](/img/robotics/solar-panel-clean-robot/e-port-connector-direction.png)

DJI のページの記載では、どの向きが正しいのか判断できないため、結局、どちらも試して動作する向きを特定しました（写真は動作した時の組み合わせです）。

## Application Binding を行う

Payload SDK アプリケーションから以下のログが延々と出力される状態（バインド待ち）にします。

```
[Error]	dji_auth_sha256_rsa_verify.c:137  The DJI SDK CC has not binded. Please check the bind state of the DJI SDK CC and bind it.
```

この状態で 機体と E-Port Lite で接続した PC 上で DJI Assistant 2 を開くと Payload SDK メニューに以下が表示されます。

![DJI Assistant 2 - Unbound](/img/robotics/solar-panel-clean-robot/dji-sdk-binding-dji-assistant2-unbound.png)

Bind ボタンを押下すると、バインドが完了します。

![DJI Assistant 2 - Bound](/img/robotics/solar-panel-clean-robot/dji-sdk-binding-dji-assistant2-bound.png)

バインドが完了すると、サンプルアプリケーションの起動時のログは以下のようになります。

```
0.016	            core	[Info]	               dji_core.c:113  Payload SDK Version : V3.15.0-beta.0-build.2318 Dec 10 2025 17:27:05
1.075	         adapter	[Info]	     dji_access_adapter.c:351  Identify mount position type is Extension Port Type
1.075	         adapter	[Info]	     dji_access_adapter.c:371  Identify aircraft series is Matrice 4 Series
1.578	         adapter	[Info]	     dji_access_adapter.c:493  Identity uart0 baudrate is 921600 bps
1.582	            core	[Info]	    dji_identity_verify.c:627  Updating dji sdk policy file...
2.582	            core	[Info]	    dji_identity_verify.c:635  Update dji sdk policy file successfully
2.627	            core	[Info]	               dji_core.c:261  Identify AircraftType = Matrice 4E, MountPosition = Extension Port, SdkAdapterType = None
2.748	            auth	[Info]	        dji_sdk_cc_auth.c:86   Get DJI SDK CC serial num: 99PDN73EUB13J3
4.812	          linker	[Warn]	            dji_command.c:1025 <0xd5d0>Command async send retry: index = 0, retryTimes = 1, 0x0A06->0x0F01(0x002F) 0x3C13
5.945	          linker	[Warn]	            dji_command.c:910  Received invalid ack,<0xd5d0> 0x0F01(0x002F)->0x0A06(0x00CA) 0x3C13
6.322	         adapter	[Info]	    dji_identity_verify.c:257  the license level is basic
6.322	            core	[Info]	       dji_product_info.c:187  Set alias: PSDK_APPALIAS
6.942	            user	[Info]	            test_widget.c:141  widget file: /home/dev/DockingController/third_party/Payload-SDK/samples/sample_c/module_sample/widget/widget_file/en_big_screen
6.952	            user	[Info]	    test_widget_speaker.c:594  Set widget speaker volume: 60
6.952	            user	[Warn]	    test_widget_speaker.c:613  No audio device found, please add audio device and init speaker volume here!!!
12.455	            core	[Info]	               dji_core.c:328  Start dji sdk application
12.455	            user	[Info]	          application.cpp:372  Application start.

| Available commands:                                                                              |
| [0] Fc subscribe sample - subscribe quaternion and gps data                                      |
| [1] Flight controller sample - you can control flying by PSDK                                    |
| [2] Hms info manager sample - get health manger system info by language                          |
| [a] Gimbal manager sample - you can control gimbal by PSDK                                       |
| [c] Camera stream view sample - display the camera video stream                                  |
| [d] Stereo vision view sample - display the stereo image                                         |
| [e] Run camera manager sample - you can test camera's functions interactively                    |
| [f] Start rtk positioning sample - you can receive rtk rtcm data when rtk signal is ok           |
| [g] Request Lidar data sample - Request Lidar data and store the point cloud data as pcd files   |
| [h] Request Radar data sample - Request radar data                                               |
| [l] Run widget states manager sample, control widget states on other payload                     |
```

:::info
I²C への読み書きする [hal_i2c.c](https://github.com/masayuki-kono/Payload-SDK/blob/fd45dd882e035599163fa70546c615fb724dfed9/samples/sample_c%2B%2B/platform/linux/raspberry_pi/hal/hal_i2c.c#L43) で通信データをログ出力すると分かりますが、SDK は初期化完了後も周期的に認証チップと通信しており、毎回異なるデータを送受信しています。

公式のプロトコル仕様は公開されていないため以下は推測ですが、チャレンジ・レスポンス型の認証として次のような流れと考えられます。

1. 機体 → 認証チップ: チャレンジデータ送信（ランダム値やタイムスタンプを含む）
2. 認証チップ → 機体: 署名済みレスポンス返送（認証チップ固有の秘密鍵を使用）
3. 機体側が認証チップの公開鍵で署名を検証

これによりサードパーティが販売したペイロードデバイスを機体が正規のものとして識別でき、バインド済みのデバイスのみが Payload SDK を利用可能になっているようです。
:::

バインド完了後に、DJIのデベロッパーセンターを開くと `1 Payloads` が表示されカウントが増えていることが確認できるはずです。

![Bound Payload Device](/img/robotics/solar-panel-clean-robot/dji-sdk-bound-one-payload.png)

![Bound Payload Device - Detailed](/img/robotics/solar-panel-clean-robot/dji-sdk-bound-one-payload-detailed.png)

## まとめ

Application Binding は Matrice 4E/4T（2025年1月発売）以降で登場した比較的新しい仕様です。
そのため DJI の公式サイトを見ても全体像の把握が難しく、具体的な手順が分かりづらい状況にあります。

本記事では、Application Binding が必要な機体の一覧、SDK 認証チップの接続方法（Raspberry Pi を例に）、デベロッパーセンターでのアプリケーション登録を説明しました。
さらに、機体・ペイロード・PC を接続したうえで DJI Assistant 2 からバインドするまでの流れを一通り紹介しました。

Application Binding は今後発売される機体では標準となる可能性が高いです。
カスタムペイロードの開発に取り組まれる方は、本記事を手がかりにぜひ試してみてください。
