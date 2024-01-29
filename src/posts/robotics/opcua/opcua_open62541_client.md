---
title: Open62541を使用したOPC-UAクライアント開発
autor: hayato-ota
date: 2024-01-28
tags: [iot, OPC-UA]
---

# はじめに
## 前回の記事
前回の記事（[こちら](https://developer.mamezou-tech.com/robotics/opcua/opcua-open62541/)）では、OPC-UAの概要やOpen62541のインストール方法について説明しました。
本記事を読む前にをご覧ください。


## 本記事の目的
本記事では、下記の事項について説明します。
- OPC-UA Clientのサンプル作成
- サーバに登録した変数への読み書き
- サーバに登録した関数の呼び出し

## GitHubリンク
本記事で実装するコードはGitHubリポジトリ[^1]に記載しています。  


# 開発環境
## 必要なライブラリ・ツール
開発にあたって、下記のライブラリ・ツールを使用します。

- Visual Studio
  - 本記事ではVisual Studio 2022 Communityを使用しています
- OpenSSL
  - 本記事ではOpenSSL 3.0.7を使用しています
- CMake
  - CMake 3.25.0-rc2
- Python3
  - 本記事ではPython 3.12.0を使用しています
- UaExpert
  - OPC-UAクライアントツール
  - サーバに登録された値を確認するために使用しています

# プロジェクトの作成と設定（前回記事と同様）
OPC-UAクライアント用プロジェクトの作成と設定について説明します。
ちなみに、内容は前回記事と同じのため既にご存知の方は飛ばして頂いて構いません。


## プロジェクトの新規作成
Visual Studioを開き，「open62541_ws」ソリューションを開きます。
左上のタブから「ファイル」→「新規作成」→「プロジェクト」を選択します。

![](/img/robotics/opcua/open62541_client/visualstudio_create_new_project.png)

C++の「コンソールアプリ」を選択します。
![](/img/robotics/opcua/open62541_client/visualstudio_select_project_template.png)

プロジェクトの設定を行います。
下記のように設定します。
プロジェクトはsrcフォルダ内に作成することとします。

```
プロジェクト名: SimpleServer
場所: <ソリューションディレクトリ>/src
ソリューション: ソリューションに追加
```

![](/img/robotics/opcua/open62541_client/visualstudio_project_setting.png)



## プロジェクトの設定
Visual Studioでの開発を行いやすくするために，プロジェクトの設定を行います。
ソリューションエクスプローラー内の「SimpleServer」を右クリックし，プロパティを選択します。

この画面でプロジェクトの設定を行います。

![](/img/robotics/opcua/open62541_client/visualstudio_project_property.png)


SimpleServerプロパティページの上部にある「構成」を「すべての構成」に設定します。

![](/img/robotics/opcua/open62541_client/visualstudio_project_property1.png)


### インクルード設定
左側の「構成プロパティ」欄から

「構成プロパティ」→「C/C++」→「全般」

を選択します。

右側の欄にある「追加のインクルードディレクトリ」に

```shell
$(SolutionDir)include
```

と設定します。

設定したら、画面右下の「適用」をクリックしましょう。

![プロジェクトインクルード設定](/img/robotics/opcua/open62541_client/visualstudio_project_include_setting.PNG)


:::info: Visual Studioで使用可能なマクロについて

設定では便利なマクロが使用できます。
詳細は[こちら](https://learn.microsoft.com/ja-jp/cpp/build/reference/common-macros-for-build-commands-and-properties?view=msvc-170)をご覧ください。
:::


### ライブラリディレクトリの設定
左側の欄から

「構成プロパティ」→「リンカ―」→「全般」

を選択します。

右側の「追加のライブラリディレクトリ」に

```
$(SolutionDir)lib
```
と設定します。

設定したら、「適用」をクリックしましょう。

![プロジェクト ライブラリディレクトリ設定](/img/robotics/opcua/open62541_client/visualstudio_project_library_directory_setting.PNG)


### 依存ファイル設定
左側の欄から

「構成プロパティ」→「リンカ―」→「入力」

を選択します。

右側の「追加の依存ファイル」に

```shell
$(SolutionDir)lib\open62541.lib
```
を追記します。
ここで、設定値のセパレータはセミコロンです。

設定したら、「適用」をクリックしましょう。

![プロジェクト_依存ファイル設定](/img/robotics/opcua/open62541_client/visualstudio_project_dependent_file_setting.PNG)



### 出力ディレクトリ設定
左側の欄から

「構成プロパティ」→「全般」

を選択します。

右側の「出力ディレクトリ」の横に表示される
三角形のアイコンをクリックし、「編集...」ボタンをクリックして編集画面を開きます。

![プロジェクト_出力ディレクトリ設定](/img/robotics/opcua/open62541_client/visualstudio_project_outputdirectory_setting.PNG)



編集画面にて、下記のように設定します。

```shell
$(SolutionDir)bin\$(ProjectName)\$(Configuration)\
```

設定したら、「適用」をクリックしましょう。


### dllファイルコピー設定
プログラムをビルドした後に実行する際、アプリケーションの起動時にopeb62541.dllをリンクする必要があります。

ここでは、ビルド後にdllファイルを出力ディレクトリにコピーするように設定します。


左側の欄から

「構成プロパティ」→「ビルドイベント」→「ビルド後のイベント」

を選択します。

右側の「コマンドライン」に下記の2行を入力します。

```shell
robocopy $(SolutionDir)bin\ $(TargetDir) open62541.dll
IF %ERRORLEVEL% LSS 8 EXIT 0
```
2行目は，robocopyコマンドがコピー成功時に発生するエラーを抑止するためのコマンドです。
詳細は[こちら](https://nanamasuhoshi.hatenadiary.org/entry/20150902/1441181518)をご覧ください。

![プロジェクト_ビルド後のイベント](/img/robotics/opcua/open62541_client/visualstudio_post_build_event_setting.PNG)


設定出来たら、OKボタンをクリックしてプロパティ画面を閉じます。

以上がプロジェクトの設定となります。



# クライアントの実装
## サーバに登録したノード一覧
前回記事では、下記2つのノードをサーバに登録しました。
- Int型の変数`SampleVariable`
- `SampleVariable`に引数の値を加算する関数`IncreaseVariable`

![Serverに登録したノード一覧](/img/robotics/opcua/open62541_client/PreviousSiteResult.png)

本記事では、この2つのノードにアクセスするクライアントを実装してみます。

作成したSimpleClient.cpp内に下記のコードを記述します。 
本記事で実装するコードはこちら[^1]にも記載しています。  


```cpp
/*
下記の2つのノードにアクセスするClient
    - 変数 ... SampleVariable : int
    - 関数 ... IncreaseVariable(int) : int
*/

#include <iostream>
#include <open62541/client_config_default.h>
#include <open62541/client_highlevel.h>
#include <open62541/plugin/log_stdout.h>


/// <summary>
/// 変数の値を読みだす
/// </summary>
/// <param name="client">クライアントインスタンスアドレス</param>
void readSampleVariable(UA_Client* client) {
    UA_Int32 value = 0;
    UA_Variant* var = UA_Variant_new();
    UA_StatusCode retval = UA_Client_readValueAttribute(client, UA_NODEID_STRING(1, (char*)"SampleVarNodeId"), var);    // NodeIdを指定する
    
    if (retval == UA_STATUSCODE_GOOD && UA_Variant_isScalar(var) &&
        var->type == &UA_TYPES[UA_TYPES_INT32])
    {
        value = *(UA_Int32*)var->data;
        printf("the value of SampleVariable: %d\n", value);
    }
    else {
        printf("Failed to read SampleVariable\n");
    }
}


/// <summary>
/// 変数の値を書き込む
/// </summary>
/// <param name="client">クライアントインスタンスアドレス</param>
/// <param name="data">書き換える値</param>
UA_StatusCode writeSampleVariable(UA_Client* client, UA_Int32 newValue) {
    UA_Variant newValueVariant;
    UA_Variant_setScalar(&newValueVariant, &newValue, &UA_TYPES[UA_TYPES_INT32]);
    UA_StatusCode retval = UA_Client_writeValueAttribute(client, UA_NODEID_STRING(1, (char*)"SampleVarNodeId"), &newValueVariant);

    if (retval != UA_STATUSCODE_GOOD) {
        printf("Failed to write sample variable value, returned %x\n", retval);
    }
    return retval;
}



/// <summary>
/// サーバに登録している関数を実行する
/// </summary>
void invokeMethod(UA_Client* client) {
    UA_Variant input;
    UA_Int32 argValue = 32; // 追加する値（delta）

    UA_Variant_init(&input);
    UA_Variant_setScalarCopy(&input, &argValue, &UA_TYPES[UA_TYPES_INT32]);

    // 戻り値用の変数
    size_t outputSize;
    UA_Variant* output;
    
    // 関数を呼び出す
    UA_StatusCode retval = UA_Client_call(
        client, 
        UA_NODEID_NUMERIC(0, UA_NS0ID_OBJECTSFOLDER),   // オブジェクトID
        UA_NODEID_STRING(1, (char*)"addIncreaseVarNodeId"), // メソッドのID
        1,              // 入力個数 
        &input,         // 入力データ配列
        &outputSize,    // 出力データ個数
        &output         // 出力データ配列
    );

    if (retval == UA_STATUSCODE_GOOD) {
        printf("Method call was successful, and %lu returned values available.\n", (unsigned long)outputSize);
        UA_Array_delete(output, outputSize, &UA_TYPES[UA_TYPES_VARIANT]);
    }
    else {
        printf("Method call was unsuccessful, and %x returned values available.\n", retval);
    }
    UA_Variant_clear(&input);
}


/// <summary>
/// メイン関数
/// </summary>
int main()
{
    // Clientインスタンスの生成
    UA_Client* client = UA_Client_new();
    UA_ClientConfig_setDefault(UA_Client_getConfig(client));
    UA_StatusCode retval = UA_Client_connect(client, "opc.tcp://localhost:4840");
    if (retval != UA_STATUSCODE_GOOD) {
        UA_LOG_INFO(UA_Log_Stdout, UA_LOGCATEGORY_USERLAND,
            "The connection failed with status code %s\n",
            UA_StatusCode_name(retval));
        UA_Client_delete(client);
        return 0;
    }

    // 変数の現在の値を読み出す
    printf("Press any key to Read Sample Variable\n");
    std::cin.get();
    readSampleVariable(client); // 値を取得する

    // 任意の値を書き込む
    printf("Press any key to Write Sample Variable\n");
    std::cin.get();
    int targetValue = -1;
    writeSampleVariable(client, targetValue);
    readSampleVariable(client); // 書き込んだ結果を出力する

    // 関数にアクセスする
    printf("Press any key to invoke method\n");
    std::cin.get();
    invokeMethod(client);
    readSampleVariable(client); // 結果を出力する


    printf("Press any key to exit ...\n");
    std::cin.get();

    return EXIT_SUCCESS;
}
```


## コードの詳細
### 変数の値を読み出す
```cpp
/// <summary>
/// 変数の値を読みだす
/// </summary>
/// <param name="client">クライアントインスタンスアドレス</param>
void readSampleVariable(UA_Client* client) {
    UA_Int32 value = 0;
    UA_Variant* var = UA_Variant_new();
    UA_StatusCode retval = UA_Client_readValueAttribute(client, UA_NODEID_STRING(1, (char*)"SampleVarNodeId"), var);    // NodeIdを指定する
    
    if (retval == UA_STATUSCODE_GOOD && UA_Variant_isScalar(var) &&
        var->type == &UA_TYPES[UA_TYPES_INT32])
    {
        value = *(UA_Int32*)var->data;
        printf("the value of SampleVariable: %d\n", value);
    }
    else {
        printf("Failed to read SampleVariable\n");
    }
}
```

- `UA_Variant`型の変数を生成します
- `UA_Client_readValueAttribute()`を使用してServer上の変数にアクセス可能な`UA_Variant`を生成する
  - 第1引数にClientインスタンスのポインタを渡す
  - 第2引数に取得したいノードIDを渡す
  - 第3引数に設定する`UA_Variable`インスタンスを渡す
- 設定済みの`UA_Variable`インスタンスから値を取得する
  - `UA_Variable`インスタンスが指し示す方がスカラ型かつ`Int32`型の場合にのみ取得

### 変数に値を書き込む
```cpp
/// <summary>
/// 変数の値を書き込む
/// </summary>
/// <param name="client">クライアントインスタンスアドレス</param>
/// <param name="data">書き換える値</param>
UA_StatusCode writeSampleVariable(UA_Client* client, UA_Int32 newValue) {
    UA_Variant newValueVariant;
    UA_Variant_setScalar(&newValueVariant, &newValue, &UA_TYPES[UA_TYPES_INT32]);
    UA_StatusCode retval = UA_Client_writeValueAttribute(client, UA_NODEID_STRING(1, (char*)"SampleVarNodeId"), &newValueVariant);

    if (retval != UA_STATUSCODE_GOOD) {
        printf("Failed to write sample variable value, returned %x\n", retval);
    }
    return retval;
}
```
- 書き込み用の`UA_Variant`型インスタンスを生成する
- `UA_Int32`は`int32_t`のエイリアス
- `UA_Variant_setScalar()`を使用して値をセットする
- `UA_Client_writeValueAttribute()`を使用して値書き込み

### サーバに登録した関数を実行する
```cpp
/// <summary>
/// サーバに登録している関数を実行する
/// </summary>
void invokeMethod(UA_Client* client) {
    UA_Variant input;
    UA_Int32 argValue = 32; // 追加する値（delta）

    UA_Variant_init(&input);
    UA_Variant_setScalarCopy(&input, &argValue, &UA_TYPES[UA_TYPES_INT32]);

    // 戻り値用の変数
    size_t outputSize;
    UA_Variant* output;
    
    // 関数を呼び出す
    UA_StatusCode retval = UA_Client_call(
        client, 
        UA_NODEID_NUMERIC(0, UA_NS0ID_OBJECTSFOLDER),   // オブジェクトID
        UA_NODEID_STRING(1, (char*)"addIncreaseVarNodeId"), // メソッドのID
        1,              // 入力個数 
        &input,         // 入力データ配列
        &outputSize,    // 出力データ個数
        &output         // 出力データ配列
    );

    if (retval == UA_STATUSCODE_GOOD) {
        printf("Method call was successful, and %lu returned values available.\n", (unsigned long)outputSize);
        UA_Array_delete(output, outputSize, &UA_TYPES[UA_TYPES_VARIANT]);
    }
    else {
        printf("Method call was unsuccessful, and %x returned values available.\n", retval);
    }
    UA_Variant_clear(&input);
}
```
- 関数の入力（引数）と出力（戻り値）用の`UA_Variant`型インスタンスを生成する
- `UA_Client_call()`を使用してServer上の関数を実行する
  - 第4引数に入力データ配列個数を渡す
  - 第5引数に入力データ配列を渡す
  - 第6引数に出力データ配列個数が返る
  - 第7引数に入力データ配列が返る
- `UA_Array_delete()`でメモリ開放


### `main`関数
```cpp
int main()
{
    // クライアントインスタンスの生成
    UA_Client* client = UA_Client_new();
    UA_ClientConfig_setDefault(UA_Client_getConfig(client));
    UA_StatusCode retval = UA_Client_connect(client, "opc.tcp://localhost:4840");
    if (retval != UA_STATUSCODE_GOOD) {
        UA_LOG_INFO(UA_Log_Stdout, UA_LOGCATEGORY_USERLAND,
            "The connection failed with status code %s\n",
            UA_StatusCode_name(retval));
        UA_Client_delete(client);
        return 0;
    }

    // 変数の現在の値を読み出す
    printf("Press any key to Read Sample Variable\n");
    std::cin.get();
    readSampleVariable(client); // 値を取得する

    // 任意の値を書き込む
    printf("Press any key to Write Sample Variable\n");
    std::cin.get();
    int targetValue = -1;
    writeSampleVariable(client, targetValue);
    readSampleVariable(client); // 書き込んだ結果を出力する

    // 関数にアクセスする
    printf("Press any key to invoke method\n");
    std::cin.get();
    invokeMethod(client);
    readSampleVariable(client); // 結果を出力する


    printf("Press any key to exit ...\n");
    std::cin.get();

    return EXIT_SUCCESS;
}
```


# 実行結果
## 事前準備
- 前回記事にて作成したOPC-UAサーバを起動する
- UaExpertを起動し，OPC-UAサーバに接続する
- SampleVariableに任意の値を格納しておく
  - 今回は`100`に書き換えました
![UaExpertによる値の書き換え](/img/robotics/opcua/open62541_client/UaExpert_changeValue.PNG)


## 作成したクライアントを起動する
作成したクライアントを起動し，下図のような画面が表示されることを確認します。
![クライアント起動直後](/img/robotics/opcua/open62541_client/Client_Step1.png)

Enterキーを押し，変数の現在値を読み出してみます。
実行の結果，先ほど書き換えた値になっていることを確認します。
![クライアント値読み出し直後](/img/robotics/opcua/open62541_client/Client_AfterReadVariable.png)

再度Enterキーを押し，変数の値を書き換えてみます。
実行の結果，値がコードに記載した値（-1）になっていることを確認します。
![クライアント書き込み直後](/img/robotics/opcua/open62541_client/Client_AfterWriteVariable.png)

最後にもう一度Enterキーを押し，サーバ上の関数を実行してみます。
ここで，関数の中身は引数に渡した値（今回は`32`）を加算する処理を記載していました。
実行の結果，値が正しい値（`-1 + 32 = 31`）になっていることを確認します。
![クライアント関数呼び出し直後](/img/robotics/opcua/open62541_client/Client_AfterInvokeMethod.png)


# おわりに
本記事では下記の事項について説明しました。

- OPC-UA クライアントのサンプル作成
- クライアントから変数を読み出す
- クライアントから変数へ書き込む
- クライアントからサーバに登録した関数を呼び出す

これ以外にも，暗号化，PubSub通信が機能として提供されており，サンプルが公式GitHubリポジトリ[^2]にて公開されています。
OPC-UAサーバ，クライアント開発にOpen62541を使用してみてはいかかでしょうか。

:::info
Open62541はフルC言語（C99）で実装されています。
有志によってC++ラッパー[^3]が開発されており，
C言語ではなくC++言語で開発したい方はこちらを使用すると良いかもしれません。
:::

[^1]: [サンプルクライアントのコード](https://github.com/hayat0-ota/open62541_ws/blob/main/src/SimpleClient/SimpleClient.cpp)
[^2]: [open62541サンプルプログラム集](https://github.com/open62541/open62541/tree/master/examples)
[^3]: [open62541pp](https://github.com/open62541pp/open62541pp)