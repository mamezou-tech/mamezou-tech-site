---
title: C#×TwinCAT ADSでPLCデータを自在に操る！ハンズオンで学ぶ連携の基本
author: shuji-morimoto
tags: [#csharp, ADS, TwinCAT]
date: 2026-03-09
image: true
---

本記事ではC#によるADS通信を使ってTwinCAT上にあるPLCデータと連携する方法についてご紹介します。

# ロボット制御ではC#が人気？
システム開発では様々なプログラミング言語が利用されています。
Python, JavaScript(Node.js, Neno), C#, Java, C++, C 等がメジャーですね。最近だとRustやGoなども人気があるようです。

ロボット制御や工場の自動化においても同様に多くの言語が利用されています。
サービスや機器を提供するベンダーは自社製品をシステムに提供する際、APIやライブラリも同時に提供します。
そのため、利用者が多いプログラミング言語であったりオープンな規格で提供することが望まれます。
AI関連やオープンソースのものはPythonモジュールでの提供が非常に多いですがライセンスビジネスではC#でのライブラリ提供が多いと感じています。

理由は下記が挙げられるかと思います。
- 利用者が多い
- 使い方が簡単(プログラミング言語の敷居が低い)
- 便利なライブラリが豊富(組み合わせることで開発コスト削減)
- ベンダーが提供したWindows上のGUIアプリやシミュレータ(C#で開発)との連携で相性が良い
- ベンダー自体もライブラリの開発がし易い
- クローズドソース(ライセンスビジネスなどを想定)
- Linux(.NET Core)でも動作する

Pythonモジュールでの提供もありますが、この場合はコアとなるライブラリは(クローズドソースや高速化のため)C++などのライブラリとし、Pythonはそのライブラリを利用するためのWrapperとして提供されます。


# ADS通信とは
ADS(Automation Device Specification)はBeckhoff Automation社が開発した独自の通信プロトコルです。
TCP/IPやUDP/IPの上で動作しTwinCATシステム内外のソフトウェアモジュール間でのデータ交換で利用されます。 

C#(.NET)のライブラリが提供されており、TwinCATの環境が整っていればすぐに利用することができます。

TwinCATおよびADS通信に関しては連載記事「TwinCATで始めるソフトウェアPLC開発」
「[第1回：環境構築編](https://developer.mamezou-tech.com/robotics/twincat/introduction/twincat-introduction/)」
をご覧ください。

TwinCATがハブとなりADSプロトコルでTwinCAT PLC変数の監視・操作などができるようになります。


# TwinCAT ADSを利用したシステム構成例

![image](../../../../img/robotics/industrial-network/cs-ads-communication/SystemConfigurationUsingADS.png)

TwinCAT PLCを中心にシステムが構成されます。そのためXAR(実行環境)が必要になります。またアプリケーション1-3をADS通信で TwinCATと連携させるためXAE(開発環境)が必要となります。

**連携方式**
TwinCATがハブとなりデバイスやアプリケーションが産業用ネットワークやADSで接続され、TwinCATを介してデータ連携することができます。
- TwinCAT PLC と アプリケーション1-3 は `ADS` で接続
- TwinCAT PLC と Device1 は `EtherCAT` で接続
- TwinCAT PLC と Device2 は `EtherNet/IP` で接続

:::info: その他のデータ連携方式
TwinCAT PLCは専用のハードウェアモジュールを追加することで温度計などで計測した温度をアナログ値として電圧値で受信することも可能です。
またネットワーク通信用のソフトウェアライセンスを購入することでソケット通信でのデータ受信なども可能です。
:::


**用途**
TwinCAT PLC上にグローバル変数を定義しておくと以下のような用途で利用することができます。
- センサー制御
- センサーデータの受信
- TwinCAT PLC変数の監視・操作
- デバイスやロボット等との連携
- TwinCAT PLC上のプログラム(Function Block)へのRPC
- TwinCAT を介したプロセス間通信

TwinCAT PLC上のグローバル変数への値の設定は TwinCAT 上のプログラムで設定します。

グローバル変数の定義・値の設定に関しては連載記事「TwinCATで始めるソフトウェアPLC開発」
「[第2回：ST言語でのプログラミング（1/2）](https://developer.mamezou-tech.com/robotics/twincat/introduction-chapter2/twincat-introduction-chapter2/)」
をご覧ください。


# ライブラリのインストール
NuGetパッケージマネージャーで `Beckhoff.TwinCAT.Ads` を インストールしプロジェクトの参照に設定してください。アップデートサイクル(主にバグフィクス)が比較的早く数カ月毎にマイナーバージョンがアップしています。何度かアップデートしましたが後方互換性があるので既存のコードは問題なく動作しています。

# TwinCATのデータ型とC#のデータ型の対応
TwinCATのデータ型とC#のデータ型の対応表は以下。
INTが16bitなど幾つか注意が必要です。
|TwinCATデータ型|ビット幅   |C#データ型 |説明|
|:-------------:|:---------:|:---------:|----|
|BOOL           |8 bit      |byte       |真偽値/bool 1bitとの記載もあるが内部的には1byteで扱われる (**要注意**)|
|BYTE           |8 bit      |byte       |符号なし 8bit 整数|
|SINT           |8 bit      |sbyte      |符号あり 8bit 整数|
|USINT          |8 bit      |byte       |符号なし 8bit 整数|
|INT            |16 bit     |short      |符号あり 16bit 整数 (**要注意**)|
|UINT           |16 bit     |ushort     |符号なし 16bit 整数|
|DINT           |32 bit     |int        |符号あり 32bit 整数|
|UDINT          |32 bit     |uint       |符号なし 32bit 整数|
|LINT           |64 bit     |long       |符号あり 64bit 整数|
|ULINT          |64 bit     |ulong      |符号なし 64bit 整数|
|REAL           |32 bit     |float      |単精度浮動小数点数 (**要注意**)|
|LREAL          |64 bit     |double     |倍精度浮動小数点数|
|ENUM           |16 bit     |short      |符号あり 16bit 整数 (**要注意**)|
|STRING         |1 byte/char|string     |1文字1バイトのバイト列 + 終端の NULL(0)文字 (**要注意**)|
|TIME           |32 bit     |TimeSpan   |ミリ秒単位の符号なし整数|


# TwinCAT側の設定
以下の条件で変数を登録します
- `PlcProject プロジェクト` - `GVLs` に グローバル変数リスト名 `GVL_Test` を定義(名前は任意)
- 変数名 `TestData` データ型 `DINT` とする

```cs: TwinCAT側の設定
{attribute 'qualified_only'}
VAR_GLOBAL
    TestData : DINT;
END_VAR
```

それではC#からTestData変数にアクセスしてみましょう。


# AdsClientによる変数アクセス
AdsClientはTwinCATとアクセスする際の窓口になります。
数値データはすべて同じ方法でRead/Writeできます。

```cs: AdsClient生成の例
using System;
using TwinCAT.Ads;

namespace AdsComponent
{
    class Program
    {
        static void Main(string[] args)
        {
            // AdsClientのインスタンス作成
            AdsClient client = new AdsClient();

            // TwinCATへの接続
            // 第1引数: AmsNetId文字列
            // 第2引数: ポート番号 (TwinCAT3 PLCの場合は851)
            client.Connect("192.168.1.101.1.1", 851);

            // TwinCATのグローバル変数を参照するためのハンドルを作成
            // TwinCAT側で定義した "グローバル変数リスト名.変数名"で指定する
            uint handle = client.CreateVariableHandle("GVL_Test.TestData");

            // 書き込み操作
            int writeValue = 123;
            client.WriteAny(handle, writeValue);

            // 読み取り操作
            int readValue = (int)client.ReadAny(handle, typeof(int));
            Console.WriteLine($"read:{readValue}");

            // ハンドルの解放
            client.DeleteVariableHandle(handle);

            // 接続を閉じて、リソース解放
            client.Close();
            client.Dispose();
        }
    }
}
```

:::alert:読みやすさ優先のため例外処理や定数の定義等を省いています
:::

:::info:AmsNetIdの指定
連載記事「TwinCATで始めるソフトウェアPLC開発」
「[第1回：環境構築編](https://developer.mamezou-tech.com/robotics/twincat/introduction/twincat-introduction/)」の「ADS通信ルート設定」で表示されているAmsNetIdを指定してください
:::

:::info:コネクションは繋ぎっぱなしでもOKですが使い終わったら必ずリソースを解放してください
:::

:::info:AdsClientはSystem.IDisposableインタフェースを実装しているためusingステートメントを使うことができます
:::


# データ変更コールバック通知

TwinCAT側の `GVL_Test.TestData` 変数が変化したかどうかを監視するにはReadAny()による定期的なポーリングは効率が悪く、スレッドも独自で管理する必要があります。これを解決するための手段として値が変化した際に、自動でクライアント側へコールバック通知を飛ばす仕組みがあります。

```cs: データ変更コールバック通知の例
private AdsClient _adsClient;  // インスタンス生成、コネクション接続済みとする
private uint _handleNotification = 0;

// データ変更通知開始
public void StartValueChangeNotification()
{
    // イベントハンドラの登録
    _adsClient.AdsNotificationEx += OnAdsNotified;

    // データ変更通知ハンドルの登録(通知開始)
    _handleNotification = _adsClient.AddDeviceNotificationEx(
            "GVL_Test.TestData",
            // 50[msec]毎に変更があったときに通知する
            // 最大遅延時間を0[msec]とする
            new NotificationSettings(AdsTransMode.OnChange, 50, 0),
            null,
            typeof(int));
}

// イベント受信
private void OnAdsNotified(object sender, AdsNotificationExEventArgs evn)
{
    if (evn.Handle != _handleNotification)
    {
        return;
    }

    var data = (int)evn.Value;
    Console.WriteLine($"notified:{data}");
}

// データ変更通知停止
public void StopValueChangeNotification()
{
    // データ変更通知ハンドルの削除(通知停止)
    _adsClient.DeleteDeviceNotification(_handleNotification);                 
    _handleNotification = 0;

    // イベントハンドラの登録解除
    _adsClient.AdsNotificationEx -= OnAdsNotified;
}

```

`StartValueChangeNotification()` を実施した後、TwinCAT側で `GVL_Test.TestData` の値が更新されるとC#側で `OnAdsNotified()` がコールバックされます。
なお、コールバック通知処理を終える場合は必ず `StopValueChangeNotification()` を実施しハンドルを解放してください。

:::info:`GVL_Test.TestData` の値を更新するには
グローバル変数の定義・値を手動で更新するには連載記事「TwinCATで始めるソフトウェアPLC開発」
「[第2回：ST言語でのプログラミング（1/2）](https://developer.mamezou-tech.com/robotics/twincat/introduction-chapter2/twincat-introduction-chapter2/)」の「3.3 ログインによる動作確認」よりPLCにログインして該当変数の値を直接書き換えてください
:::


# コールバック周期通知

データ変更コールバック通知のパラメータを変えることで周期的な通知も可能です。

```cs: コールバック周期通知の例
// 定期的な通知開始
public void StartCyclicNotification()
{
    // イベントハンドラの登録
    _adsClient.AdsNotificationEx += OnAdsNotified;

    // 周期通知ハンドルの登録(通知開始)
    _handleNotification = _adsClient.AddDeviceNotificationEx(
            "GVL_Test.TestData",
            // 10[msec]毎に通知する
            // 最大遅延時間を1[msec]とする
            new NotificationSettings(AdsTransMode.Cyclic, 10, 1),
            null,
            typeof(int));
}
```
`AdsTransMode.Cyclic` を指定することで周期的な通知となります。通知タイミングを10[msec]、最大遅延時間を1[msec]とした場合、1[msec]の遅延が発生する場合が稀にありますが、ほぼ正確に10[msec]毎に通知されました。
TwinCAT側はカーネルモードで動作しているため正確な周期で値の通知が可能かと思われますが、C#側は普通のWindowsアプリでWindows OSのスケジューリングの精度やネットワークドライバの受信処理などによる遅延が発生するかと思いますが不思議な現象です。いつか調査してみたいと思います。


# 構造体の定義
Read/Writeするデータやコールバック通知のデータ型は構造体も可能です。

まずは例としてTwinCAT側で構造体 `DUT_Sample` を定義します。構造体はネストも可能です。

```cs: TwinCAT側の構造体設定
// DUT_Sample構造体定義
TYPE DUT_Sample :
STRUCT
    IsValid : BOOL;      // BOOL型
    Height : DINT;       // DINT型
    CurrentMode : EMode; // ENUM型
    Status : DUT_Status; // 構造体
END_STRUCT
END_TYPE

// EMode ENUM型定義
{attribute 'strict'}
{attribute 'to_string'}
TYPE EMode :
(
    Vertical := 0,
    Horizontal := 1
);
END_TYPE

// DUT_Status構造体定義
TYPE DUT_Status :
STRUCT
    Status1 : DINT;
    Status2 : DINT;
END_STRUCT
END_TYPE
```

グローバル変数リスト `GVL_Test` に `Sample` を追加します。

```cs: TwinCAT側のグローバル変数設定
{attribute 'qualified_only'}
VAR_GLOBAL
    TestData : DINT;
    Sample : DUT_Sample;
END_VAR
```

グローバル変数 `GVL_Test.Sample` をC#側でも扱えるようにC#側でも同じ構造体を定義します。
ただし、アライメントの問題(メモリ上でのデータを配置する際の整列ルール)がありますので注意が必要です。
TwinCAT 3では、デフォルトで8byteのアライメントが採用されているため、これにあわせてC#側の構造体を定義する必要があります。

- 構造体には 属性 `[StructLayout(LayoutKind.Sequential, Pack = 8)]` を付与する
- 構造体以外のデータ型は 「[TwinCATのデータ型とC#のデータ型の対応](#twincat%E3%81%AE%E3%83%87%E3%83%BC%E3%82%BF%E5%9E%8B%E3%81%A8c#%E3%81%AE%E3%83%87%E3%83%BC%E3%82%BF%E5%9E%8B%E3%81%AE%E5%AF%BE%E5%BF%9C)」 に合わせる
- 変数の定義順序はTwinCAT側と合わせる

なお、変数や構造体の名前はTwinCAT側と合わせる必要はありませんが合わせておくと対応関係が明らかですのでお勧めします。

```cs: C#側の構造体の定義の例
// Sample構造体
[StructLayout(LayoutKind.Sequential, Pack = 8)]
public struct Sample
{
    public byte   IsValid;     // BOOL型 => byte
    public int    Height;      // DINT型 => int
    public EMode  CurrentMode; // ENUM型 => EMode
    public Status Status;      // 構造体 => Status
}

// Emode定義
public enum EMode : short     // ENUM型 => short
{
    Vertical,
    Horizontal,
}

// Status構造体
[StructLayout(LayoutKind.Sequential, Pack = 8)]
public struct Sample
{
    public Status1; // DINT => int
    public Status2; // DINT => int
}
```

`int readValue = (Sample)client.ReadAny(handle, typeof(Sample));` のように キャスト や `typeof()` を使うことでプリミティブ型と同じAPIが使えます。


# 文字列(string)のRead/Write

TwinCAT 側ではSTRING型で文字列を扱うことができます。しかし、1文字1バイトのASCII文字コード(Latin-1)として扱われるためそのままでは日本語を書き込むと文字化けします。また、バイト数を指定して定義する必要があります。そのためUTF-8でエンコードするように指定して定義します。

```cs: TwinCAT側の設定
{attribute 'qualified_only'}
VAR_GLOBAL
    TestData : DINT;
    Sample : DUT_Sample;

    // 積層アプリケーション送信データ
    {attribute 'TcEncoding':='UTF-8'}
    Message : STRING(1024);
END_VAR
```

- 変数定義に `{attribute 'TcEncoding':='UTF-8'}` を付与することで文字コードをUTF-8と解釈させる
- 文字サイズはバイト数で指定する
- 文字サイズは終端のNULL(0)文字まで含めたサイズ

UTF-8の場合、1文字のバイト数は可変長(1～4バイト)となります。一般的な日本語は3バイトとなりますので余裕のあるバイトサイズを指定してください。

```cs: 文字列(string)Read/Writeの例
using System.Text;

private const int STRING_SIZE = 1024;
private AdsClient _adsClient; // インスタンス生成、コネクション接続済みとする
private uint _handle; // 'GVL_Test.Message' を指しているものとする

// 文字列の書き込み
public void WriteMessage(string message)
{
    // UTF-8の文字列をバイト配列に変換
    byte[] utf8Bytes = Encoding.UTF8.GetBytes(message);

    // バイトサイズチェック
    if (utf8Bytes.Length > STRING_SIZE)
    {
         throw new Exception($"バイト数オーバー");
    }

    // バッファの初期状態はNULL(0)文字で埋められている
    byte[] targetBuffer = new byte[STRING_SIZE];
    // 変換したバイト配列を、固定長配列の先頭からコピーする
    Buffer.BlockCopy(utf8Bytes, 0, targetBuffer, 0, utf8Bytes.Length);

    _adsClient.WriteAny(_handle, targetBuffer);
}

// 文字列の読み取り
public string ReadMessage()
{
    // 固定長のバイト配列を取得する(終端のNULL文字も含む)
    var byteArray = (byte[])_adsClient.ReadAny(
            _handle, typeof(byte[]), new int[] {STRING_SIZE});

    // バイト配列の中から最初のNULL文字(0)を探す
    int nullCharIndex = Array.IndexOf(byteArray, (byte)0);

    // NULL文字が見つかった場合は、そこまでを文字列とする
    if (nullCharIndex >= 0)
    {
        // GetString(バイト配列, 開始インデックス, 長さ)
        return Encoding.UTF8.GetString(byteArray, 0, nullCharIndex);
    }

    // NULL文字が見つからない場合 (バッファが文字列で満たされている) は、
    // 配列全体を変換する
    return Encoding.UTF8.GetString(byteArray);
}

```

UTF-8文字列の扱いは他のデータ型に比べて少し冗長なコードになります。
文字列は定義時のバイトサイズの配列で送受信されるため、1文字だけ送りたい場合でも残りはNULL文字で埋めてバッファサイズ分データ転送されることになります。


# まとめ
ADS通信で様々なデータ型の扱い方とコールバック通知の方法を理解できたかと思います。これを応用することでRPCやプロセス間通信ができます。
`PC1上のプロセスA` と `PC2上のプロセスB` とで連携するとき、データ型をJSON文字列(STRING(1024)など)で定義すれば汎用的なデータで分散処理システムを構築できます。またコールバック通知の仕組みを上手く使えばTwinCAT上の変数をTopicとみなすPublish/Subscribe型のシステムも実現できるのではないでしょうか？

BeckhoffはADSの通信プロトコル仕様をWebサイト上で公開しており、オープンソースのADS通信ライブラリもあるそうです。そのためPython, Node.js, GoなどからもADS通信ができるようです。ただし、当然これらオープンソースのライブラリはBeckhoffからのサポートが受けられない点に注意する必要があります。


