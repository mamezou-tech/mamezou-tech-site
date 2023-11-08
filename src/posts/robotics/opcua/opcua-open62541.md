---
title: Open62541を使用したOPC-UAサーバ開発
author: hayato-ota
date: 2023-10-31
tags: [iot, OPC-UA]
---

# はじめに
## 本記事の目的
本記事では，下記の事項について説明します。
- OPC-UAの概要について
- Open62541のインストール方法
- Visual Studioでの開発環境構築
- OPC-UA Serverのサンプル作成

## OPC-UAとは
OPC-UA（正式名称: OPC Unified Architecture）は，2008年にOPC Foundationから発表され，その後"IEC 62541"として国際標準化されたアーキテクチャ技術仕様です。
産業用の通信規格の1つであり、機器間のデータ交換に用いられます。

1996年にマイクロソフト社が発表した，OPC(<u>O</u>bject Linking and Embedding for <u>P</u>rocess <u>C</u>ontrol) Classicをベースとしています。



OPC-UAの特徴として下記が挙げられます。

- オープンな規格である点
    - 特定のベンダーに依存しない
- 豊富なデータモデルを有している点
    - オブジェクト指向をベースとした情報モデル
    - アドレス空間による表現
- セキュリティ
    - TLSによるデータ暗号化
    - クライアント/サーバ間の相互認証
    - 証明書ベースのセキュリティ
- プラットフォーム非依存性
    - OPC ClassicではWindowsのみ対応
    - OPC-UAではWindowsのみならず，Linux, 組み込みデバイスでも使用可能
- 通信方式
    - 従来のClient-Server方式のみならず，Publish-Subscribe方式にも対応

上記以外にも，リアルタイム性を高めるためにTSN(Time Sensitive Network)の採用も進められるなど，
産業用で使用される通信規格のデファクトスタンダードとなりつつあります。

:::info
その他の詳細な機能については，OPC Foundationの[公式ページ](https://jp.opcfoundation.org/about/opc-technologies/opc-ua/)をご覧ください。
:::

## ロボット開発におけるOPC-UA
産業通信用の規格として策定されたOPC-UAですが，ロボット業界でも注目を浴びています。
2019年に発表されたOPC-UAの仕様の1つである「OPC-UA for Robotics」では，
産業用ロボットとその周辺機器を対象としたインタフェースの共通化を目指すことが記されています。

また，工作機械を対象としたインタフェース規格「umati（**U**niversal **M**achine **T**echnology **I**nterface）」[^1]でも，OPC-UAが推奨規格として定められています。

[^1]: [umati](https://umati.org/)

ロボットメーカーの最大手であるFANUC[^2]，ABB[^3]，安川電機[^4]，KUKA社[^5]でも，産業用ロボットのOPC-UA対応が進められています。


[^2]: [ファナックロボットのOPC UA通信対応](https://www.fanuc.co.jp/ja/product/new_product/2020/202005_opcua.html)

[^3]: [IoTゲートウェイを使ったロボット接続 - OPC UAまたはMQTT](https://new.abb.com/products/robotics/ja/%E3%82%B3%E3%83%B3%E3%83%88%E3%83%AD%E3%83%BC%E3%83%A9/iot-gateway)

[^4]: [データ収集して何をすればいい？データ収集・活用の事例を知りたい！](https://www.e-mechatronics.com/mailmgzn/backnumber/201808/mame.html)

[^5]: [KUKAとともに、デジタルファクトリーへ](https://www.kuka.com/ja-jp/future-production/industrie-4-0/%E3%83%87%E3%82%B8%E3%82%BF%E3%83%AB%E3%83%95%E3%82%A1%E3%82%AF%E3%83%88%E3%83%AA%E3%83%BC)


このように、様々な分野でのインタフェースの統一化に向けた活動においてOPC-UAが推奨されています。


## Open62541とは
OPC-UA Server/Clientを実装するためのツール群を有するライブラリです。
Windows/Linux/VxWorks/QNX/Androidでの動作をサポートしています。

ライブラリはC言語にて記述されており，Server/Clientの実装やPublish/Subscribe通信をサポートしています。
本記事では，こちらを使用してOPC-UA Serverの実装していきます。

:::info
詳細な機能についてはOpen62541の[公式ページ](https://www.open62541.org/)、[GitHubリポジトリ](https://github.com/open62541/open62541/)，もしくは[公式ドキュメント](https://www.open62541.org/doc/master/toc.html)をご覧ください。
:::





# 開発環境構築
先述したOpen62541を使用して，OPC-UAの開発環境を構築していきます。

## 必要なライブラリ・ツール
開発に当たって，下記のライブラリ・ツールを使用します。
インストールされていない場合は，インストールしましょう。

- Visual Studio
    - 本記事ではVisual Studio 2022 Communityを使用しています
- OpenSSL
    - 本記事ではOpenSSL 3.0.7を使用しています
- CMake
    - 本記事ではCMake 3.25.0-rc2を使用しています
- Python3
    - 本記事ではPython 3.12.0を使用しています
- UaExpert
    - OPC-UAクライアントツール
    - ダウンロードページは[こちら](https://www.unified-automation.com/products/development-tools/uaexpert.html)
        - インストール時に会員登録が必要です


## Visual Studioソリューションの作成
Visual Stdioソリューションを作成し，プロジェクトを作成するための準備をします。

Visual Studioを起動し，「新しいプロジェクトを作成する」を選択します。
![VisualStudio_CreateNewProject](/img/robotics/opcua/open62541/visualstudio_startup.PNG)

プロジェクトテンプレートでは，「空のソリューション」を選択します。
![VisualStudio_SelectTemplate](/img/robotics/opcua/open62541/visualstudio_create_void_solution.PNG)

任意の場所にソリューションを生成します。
本記事では下記のように設定しました。

```
ソリューションフォルダ作成ディレクトリ: C:\Mamezou
ソリューション名: open62541_ws
```

![](/img/robotics/opcua/open62541/visualstudio_solution_setting.png)

「OK」ボタンを押下すると、`C:\Mamezou\open62541_ws\open62541_ws.sln` が生成されます。

:::info
以降では，`C:\Mamezou\open62541_ws`をソリューションディレクトリと呼ぶことにします。
本記事と異なるディレクトリを選択した場合は適宜読み替えてください。
:::

以上でソリューションの作成は完了です。
後ほどソリューション内にプロジェクトを生成します。



## Open62541のインストール
ソリューションディレクトリ内に「deps」フォルダを作成し、その中にopen62541リポジトリをクローンします。

バージョンには，2023/10/15時点で最新である「v1.3.8」を指定します。

また，リポジトリ内にサブモジュールも含まれるため，`--recursive`オプションを付与します。

```shell
$ cd <ソリューションディレクトリ>
$ mkdir deps
$ cd deps
$ git clone -b v1.3.8 --recursive git@github.com:open62541/open62541.git
```

Open62541をCMakeを使用してビルド，インストールします。
クローンしたリポジトリに移動し，ConfigurationとGenerateを行います。

```shell
$ cd ./open62541
$ cmake -S . -B build_VS2022 -G "Visual Studio 17 2022" -DUA_ENABLE_PUBSUB=ON -DUA_ENABLE_SUBSCRIPTIONS=ON -DUA_ENABLE_ENCRYPTION=OPENSSL -DUA_ENABLE_PUBSUB_INFORMATIONMODEL=ON -DUA_ENABLE_PUBSUB_INFORMATIONMODEL_METHODS=ON -DBUILD_SHARED_LIBS=ON -DUA_BUILD_EXAMPLES=OFF -DCMAKE_BUILD_TYPE=Release
```

:::info: CMake時に付与したオプション詳細

CMake時に付与できるオプションは，`cmake-gui`コマンドにて確認できます。
下記以外の詳細については，[Open62541ドキュメント](https://www.open62541.org/documentation/)内の「3.2 Build Options」を参照してください。

| オプション名 | 本記事での設定値 | 説明 |
| ---- | ---- | ---- |
| BUILD_SHARED_LIBS                         | ON        | 共有ライブラリ（.dll）を生成するか |
| CMAKE_BUILD_TYPE                          | Release   | ビルドタイプの設定<br>【Debug/Release/MinSizeRel/RelWithDebInfo】|
| UA_BUILD_EXAMPLES                         | OFF       | サンプルプログラムを生成するか |
| UA_ENABLE_PUBSUB                          | ON        | Publish/Subscribeを有効/無効にする |
| UA_ENABLE_SUBSCRIPTIONS                   | ON        | Subscriptionの有効/無効 |
| UA_ENABLE_ENCRYPTION                      | OPENSSL   | 暗号化に使用するバックエンドの指定 <br>【OFF/MBEDTLS/OPENSSL/LIBRESSL】|
| UA_ENABLE_PUBSUB_INFORMATIONMODEL         | ON        | Publish/Subscribe設定の情報モデル表現を有効/無効にする |
| UA_ENABLE_PUBSUB_INFORMATIONMODEL_METHODS | ON        | Publish/Subscribe設定のうち，メソッドの情報モデル表現を有効/無効にする |

:::


次に，下記を実行してビルドとインストールを行います。
インストール先には先ほど作成したソリューションディレクトリとしています。

```shell
$ cmake --build build_VS2022 --config Release
$ cmake --install build_VS2022 --prefix ../..
```

ソリューションディレクトリ内に「bin」「include」「lib」「share」フォルダが生成されます。
また，「bin」フォルダ内に「open62541.dll」が，「lib」フォルダ内に「open62541.lib」が生成されています。

以上でopen62541のインストールが完了しました。

# プロジェクトの作成と設定
## プロジェクトの新規作成
Visual Studioを開き，「open62541_ws」ソリューションを開きます。
左上のタブから「ファイル」→「新規作成」→「プロジェクト」を選択します。

![](/img/robotics/opcua/open62541/visualstudio_create_new_project.png)

C++の「コンソールアプリ」を選択します。
![](/img/robotics/opcua/open62541/visualstudio_select_project_template.png)

プロジェクトの設定を行います。
下記のように設定します。
プロジェクトはsrcフォルダ内に作成することとします。

```
プロジェクト名: SimpleServer
場所: <ソリューションディレクトリ>/src
ソリューション: ソリューションに追加
```

![](/img/robotics/opcua/open62541/visualstudio_project_setting.png)



## プロジェクトの設定
Visual Studioでの開発を行いやすくするために，プロジェクトの設定を行います。
ソリューションエクスプローラー内の「SimpleServer」を右クリックし，プロパティを選択します。

この画面でプロジェクトの設定を行います。

![](/img/robotics/opcua/open62541/visualstudio_project_property.png)


SimpleServerプロパティページの上部にある「構成」を「すべての構成」に設定します。

![](/img/robotics/opcua/open62541/visualstudio_project_property1.png)


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

![プロジェクトインクルード設定](/img/robotics/opcua/open62541/visualstudio_project_include_setting.PNG)


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

![プロジェクト ライブラリディレクトリ設定](/img/robotics/opcua/open62541/visualstudio_project_library_directory_setting.PNG)


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

![プロジェクト_依存ファイル設定](/img/robotics/opcua/open62541/visualstudio_project_dependent_file_setting.PNG)



### 出力ディレクトリ設定
左側の欄から

「構成プロパティ」→「全般」

を選択します。

右側の「出力ディレクトリ」の横に表示される
三角形のアイコンをクリックし、「編集...」ボタンをクリックして編集画面を開きます。

![プロジェクト_出力ディレクトリ設定](/img/robotics/opcua/open62541/visualstudio_project_outputdirectory_setting.PNG)



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

![プロジェクト_ビルド後のイベント](/img/robotics/opcua/open62541/visualstudio_post_build_event_setting.PNG)


設定出来たら、OKボタンをクリックしてプロパティ画面を閉じます。

以上がプロジェクトの設定となります。



## サンプルプログラムの実装
実際にOPC-UAサーバを実装してみます。
本サンプルでは，下記のようなサーバを実装してみます。

- 「SampleVariable」という名前のInt32型の変数を定義
- 引数に指定した数だけ変数の値に加算するメソッドを持つ


作成したSimpleServer.cpp内に下記のコードを記述します。

```cpp
#include <open62541/plugin/log_stdout.h>
#include <open62541/server.h>
#include <open62541/server_config_default.h>

#include <signal.h>
#include <stdlib.h>

/// <summary>
/// OPC-UAサーバに変数を追加する
/// </summary>
static void addSampleVariable(UA_Server* server) {
    // SampleVariable変数ノードの属性を定義する
    UA_VariableAttributes attr = UA_VariableAttributes_default; // 属性のデフォルト値を設定
    UA_Int32 sampleVarInitValue = 42;    // 初期値の設定
    UA_Variant_setScalar(&attr.value, &sampleVarInitValue, &UA_TYPES[UA_TYPES_INT32]);  // 変数に初期値を設定
    
    // 属性値の設定
    attr.description = UA_LOCALIZEDTEXT((char*)"en-US", (char*)"Sample Variable for mamezou-tech"); // 変数の説明
    attr.displayName = UA_LOCALIZEDTEXT((char*)"en-US", (char*)"Sample Variable");  // 表示名
    attr.dataType = UA_TYPES[UA_TYPES_INT32].typeId;    // データ型
    attr.accessLevel = UA_ACCESSLEVELMASK_READ | UA_ACCESSLEVELMASK_WRITE;  // アクセス属性

    // Variable Nodeを情報モデルに追加する
    UA_NodeId sampleVarNodeId = UA_NODEID_STRING(1, (char*)"SampleVarNodeId");  // ノードIDの定義
    UA_QualifiedName sampleVarName = UA_QUALIFIEDNAME(1, (char*)"SampleVar");   // ブラウザ名の定義
    UA_NodeId parentNodeId = UA_NODEID_NUMERIC(0, UA_NS0ID_OBJECTSFOLDER);      // 親ノードのID
    UA_NodeId parentReferenceNodeId = UA_NODEID_NUMERIC(0, UA_NS0ID_ORGANIZES); // 親参照ノードID

    // 定義したVariableNodeをServerに追加する
    UA_Server_addVariableNode(server, sampleVarNodeId, parentNodeId,
        parentReferenceNodeId, sampleVarName,
        UA_NODEID_NUMERIC(0, UA_NS0ID_BASEDATAVARIABLETYPE), attr, NULL, NULL);
}


/// <summary>
/// メソッドのコールバック関数
/// 変数の値に引数で指定した数だけ加算する
/// </summary>
static UA_StatusCode increaseVariableCallback(UA_Server* server,
    const UA_NodeId* sessionId, void* sessionContext,
    const UA_NodeId* methodId, void* methodContext,
    const UA_NodeId* objectId, void* objectContext,
    size_t inputSize, const UA_Variant* input,
    size_t outputSize, UA_Variant* output)
{
    // 引数の値を取得する
    UA_Int32* delta = (UA_Int32*)input[0].data;

    // 変数の値を取得する
    UA_Variant sampleVar;
    UA_NodeId sampleVarNodeId = UA_NODEID_STRING(1, (char*)"SampleVarNodeId");
    UA_Server_readValue(server, sampleVarNodeId, &sampleVar);
    UA_Int32 sampleVarValue = ((UA_Int32*)sampleVar.data)[0];

    // 変数に引数の値を加える
    UA_Variant newVar;
    UA_Int32 newVarValue = sampleVarValue + *delta;
    UA_Variant_init(&newVar);
    UA_Variant_setScalar(&newVar, &newVarValue, &UA_TYPES[UA_TYPES_INT32]);

    // 加算後の値をServerに書き込む
    UA_StatusCode retval = UA_Server_writeValue(server, sampleVarNodeId, newVar);

    if (retval != UA_STATUSCODE_GOOD) {
        return retval;
    }

    return UA_STATUSCODE_GOOD;
}



/// <summary>
/// 新規にメソッド をOPC-UAサーバに追加する
/// </summary>
static void addIncreaseVariableMethod(UA_Server* server) {
    // 入力引数の生成
    UA_Argument inputArg;

    // 引数の設定
    UA_Argument_init(&inputArg);
    inputArg.description = UA_LOCALIZEDTEXT((char*)"en-US", (char*)"How much increase the number of the variable");
    inputArg.name = UA_STRING((char*)"delta");
    inputArg.dataType = UA_TYPES[UA_TYPES_INT32].typeId;
    inputArg.valueRank = UA_VALUERANK_SCALAR;

    // Methodノードの追加
    UA_MethodAttributes incAttr = UA_MethodAttributes_default;
    incAttr.description = UA_LOCALIZEDTEXT((char*)"en-US", (char*)"Increase the value of a variable by the number of arguments");
    incAttr.displayName = UA_LOCALIZEDTEXT((char*)"en-US", (char*)"IncreaseVariable");
    incAttr.executable = true;
    incAttr.userExecutable = true;
    UA_Server_addMethodNode(server, UA_NODEID_STRING(1, (char*)"addIncreaseVarNodeId"),
        UA_NODEID_NUMERIC(0, UA_NS0ID_OBJECTSFOLDER),
        UA_NODEID_NUMERIC(0, UA_NS0ID_HASCOMPONENT),
        UA_QUALIFIEDNAME(1, (char*)"IncreaseVariable"),
        incAttr, &increaseVariableCallback,
        1, &inputArg, 0, NULL,
        NULL, NULL);
}



static volatile UA_Boolean running = true;

/// <summary>
/// 中止シグナルハンドラ
/// </summary>
static void stopHandler(int sign) {
    UA_LOG_INFO(UA_Log_Stdout, UA_LOGCATEGORY_SERVER, "received ctrl-c");
    running = false;
}

/// <summary>
/// メイン関数
/// </summary>
int main(void) {
    signal(SIGINT, stopHandler);
    signal(SIGTERM, stopHandler);

    // サーバの生成
    UA_Server* server = UA_Server_new();
    UA_ServerConfig_setDefault(UA_Server_getConfig(server));
    UA_ServerConfig* config = UA_Server_getConfig(server);
    config->verifyRequestTimestamp = UA_RULEHANDLING_ACCEPT;

    // 変数の追加
    addSampleVariable(server);

    // メソッドをサーバに追加する
    addIncreaseVariableMethod(server);

    // runningがTrueの間サーバを起動する
    UA_StatusCode retval = UA_Server_run(server, &running);

    // サーバの削除
    UA_Server_delete(server);

    return retval == UA_STATUSCODE_GOOD ? EXIT_SUCCESS : EXIT_FAILURE;
}
```

## コードの詳細
上記に示したコードの詳細について説明します。


### 変数の登録

```cpp
/// <summary>
/// OPC-UAサーバに変数を追加する
/// </summary>
static void addSampleVariable(UA_Server* server) {
    // SampleVariable変数ノードの属性を定義する
    UA_VariableAttributes attr = UA_VariableAttributes_default; // 属性のデフォルト値を設定
    UA_Int32 sampleVarInitValue = 42;    // 初期値の設定
    UA_Variant_setScalar(&attr.value, &sampleVarInitValue, &UA_TYPES[UA_TYPES_INT32]);  // 変数に初期値を設定
    
    // 属性値の設定
    attr.description = UA_LOCALIZEDTEXT((char*)"en-US", (char*)"Sample Variable for mamezou-tech"); // 変数の説明
    attr.displayName = UA_LOCALIZEDTEXT((char*)"en-US", (char*)"Sample Variable");  // 表示名
    attr.dataType = UA_TYPES[UA_TYPES_INT32].typeId;    // データ型
    attr.accessLevel = UA_ACCESSLEVELMASK_READ | UA_ACCESSLEVELMASK_WRITE;  // アクセス属性

    // Variable Nodeを情報モデルに追加する
    UA_NodeId sampleVarNodeId = UA_NODEID_STRING(1, (char*)"SampleVarNodeId");  // ノードIDの定義
    UA_QualifiedName sampleVarName = UA_QUALIFIEDNAME(1, (char*)"SampleVar");   // ブラウザ名の定義
    UA_NodeId parentNodeId = UA_NODEID_NUMERIC(0, UA_NS0ID_OBJECTSFOLDER);      // 親ノードのID
    UA_NodeId parentReferenceNodeId = UA_NODEID_NUMERIC(0, UA_NS0ID_ORGANIZES); // 親参照ノードID

    // 定義したVariableNodeをServerに追加する
    UA_Server_addVariableNode(server, sampleVarNodeId, parentNodeId,
        parentReferenceNodeId, sampleVarName,
        UA_NODEID_NUMERIC(0, UA_NS0ID_BASEDATAVARIABLETYPE), attr, NULL, NULL);
}
```

- `UA_VariableAttributes`型のデータに変数の属性を定義していきます。
- 変数の追加時には，親のノードIDと参照ノードIDを設定し，どのノードと関連を持つのかを明確に指定する必要があります。
    - 親ノードの情報を変更すると，登録するノードの位置が変わります。



### メソッドの定義
```cpp
/// <summary>
/// メソッドのコールバック関数
/// 変数の値に引数で指定した数だけ加算する
/// </summary>
static UA_StatusCode increaseVariableCallback(UA_Server* server,
    const UA_NodeId* sessionId, void* sessionContext,
    const UA_NodeId* methodId, void* methodContext,
    const UA_NodeId* objectId, void* objectContext,
    size_t inputSize, const UA_Variant* input,
    size_t outputSize, UA_Variant* output)
{
    // 引数の値を取得する
    UA_Int32* delta = (UA_Int32*)input[0].data;

    // 変数の値を取得する
    UA_Variant sampleVar;
    UA_NodeId sampleVarNodeId = UA_NODEID_STRING(1, (char*)"SampleVarNodeId");
    UA_Server_readValue(server, sampleVarNodeId, &sampleVar);
    UA_Int32 sampleVarValue = ((UA_Int32*)sampleVar.data)[0];

    // 変数に引数の値を加える
    UA_Variant newVar;
    UA_Int32 newVarValue = sampleVarValue + *delta;
    UA_Variant_init(&newVar);
    UA_Variant_setScalar(&newVar, &newVarValue, &UA_TYPES[UA_TYPES_INT32]);

    // 加算後の値をServerに書き込む
    UA_StatusCode retval = UA_Server_writeValue(server, sampleVarNodeId, newVar);

    if (retval != UA_STATUSCODE_GOOD) {
        return retval;
    }

    return UA_STATUSCODE_GOOD;
}
```

- メソッドの引数は，関数の引数`input`から取得できます。
- メソッドの戻り値は，関数の引数`output`に設定します。
- 変数の値を取得する場合は，`UA_Server_readValue`関数にて対象とするノードのノードIDを指定する必要があります。
- 変数の値を設定する場合は，`UA_Server_writeValue`関数を使用します。


### メソッドの登録

```cpp
/// <summary>
/// 新規にメソッド をOPC-UAサーバに追加する
/// </summary>
static void addIncreaseVariableMethod(UA_Server* server) {
    // 入力引数の生成
    UA_Argument inputArg;

    // 引数の設定
    UA_Argument_init(&inputArg);
    inputArg.description = UA_LOCALIZEDTEXT((char*)"en-US", (char*)"How much increase the number of the variable");
    inputArg.name = UA_STRING((char*)"delta");
    inputArg.dataType = UA_TYPES[UA_TYPES_INT32].typeId;
    inputArg.valueRank = UA_VALUERANK_SCALAR;

    // Methodノードの追加
    UA_MethodAttributes incAttr = UA_MethodAttributes_default;
    incAttr.description = UA_LOCALIZEDTEXT((char*)"en-US", (char*)"Increase the value of a variable by the number of arguments");
    incAttr.displayName = UA_LOCALIZEDTEXT((char*)"en-US", (char*)"IncreaseVariable");
    incAttr.executable = true;
    incAttr.userExecutable = true;
    UA_Server_addMethodNode(server, UA_NODEID_STRING(1, (char*)"addIncreaseVarNodeId"),
        UA_NODEID_NUMERIC(0, UA_NS0ID_OBJECTSFOLDER),
        UA_NODEID_NUMERIC(0, UA_NS0ID_HASCOMPONENT),
        UA_QUALIFIEDNAME(1, (char*)"IncreaseVariable"),
        incAttr, &increaseVariableCallback,
        1, &inputArg, 0, NULL,
        NULL, NULL);
}
```
- 引数と戻り値のデータ型として`UA_Variant`型を使用します。
- `UA_Server_addMethod`関数について
    - メソッドのノードIDは第2引数に指定します。
    - メソッドノードの配置位置を第3引数で指定します。
    - メソッドの属性は第6引数に指定します。
    - メソッドがコールされた際に実行されるコールバック関数は第7引数で指定します。
    - 引数もしくは戻り値を定義する場合は第8引数～第11引数で指定します。



### メイン関数
```cpp
/// <summary>
/// メイン関数
/// </summary>
int main(void) {
    signal(SIGINT, stopHandler);
    signal(SIGTERM, stopHandler);

    // サーバの生成
    UA_Server* server = UA_Server_new();
    UA_ServerConfig_setDefault(UA_Server_getConfig(server));
    UA_ServerConfig* config = UA_Server_getConfig(server);
    config->verifyRequestTimestamp = UA_RULEHANDLING_ACCEPT;

    // 変数の追加
    addSampleVariable(server);

    // メソッドをサーバに追加する
    addIncreaseVariableMethod(server);

    // runningがTrueの間サーバを起動する
    UA_StatusCode retval = UA_Server_run(server, &running);

    // サーバの削除
    UA_Server_delete(server);

    return retval == UA_STATUSCODE_GOOD ? EXIT_SUCCESS : EXIT_FAILURE;
}
```

- サーバの生成と起動を行います。
- 上記で定義した変数の定義やメソッドの定義を行います。
- `UA_Server_run`関数では、第2引数であるrunningの値が`True`である間、サーバを実行します。


## 動作確認
## サーバへの接続
プロジェクトのビルドを行い，ビルドが成功したら実際に起動してみます。
コンソールに下図のように出力されていたら成功です。

![サーバの実行結果](/img/robotics/opcua/open62541/launch_sample_server.png)

サーバが起動できたら，OPC-UAクライアントツールであるUaExpertを起動します。

起動後，左上の「Add Server」ボタン（"＋"状のアイコン）をクリックし，サーバ選択画面を表示させます。

![UaExpert_AddServerButton](/img/robotics/opcua/open62541/UaExpert_AddServerButton.png)

PC上にサーバを建てているため，「Local」→「open62541-based OPC UA Application」→「None」が表示されます。
こちらを選択状態にし，画面右下のOKを押下しましょう。

![UaExpert_AddServer](/img/robotics/opcua/open62541/UaExpert_AddServer.png)

:::info
本サンプルでは，セキュリティを考慮していないため選択可能な項目が「None」のみとなっています。
セキュリティの処理を加えることで，選択できる項目が増えます。
:::

サーバを追加すると，画面の左下のProject欄内の「Servers」に先ほど選択したサーバが追加されています。
サーバを選択状態にしたまま，画面上部の「Connect Server」ボタンを押してサーバに接続します。

![UaExpert_ConnectToServer](/img/robotics/opcua/open62541/UaExpert_ConnectServer.png)


### 変数へのアクセス
サーバに接続すると，画面左側の「Address Space」欄にサーバが所有するノード一覧が表示されます。
その中で，「Objects」フォルダ内に存在する「Sample Variable」ノードを選択し，画面中央の「Data Access View」欄にドラッグ&ドロップしましょう。

![UaExpert_AddVariableToDataAccessView](/img/robotics/opcua/open62541/UaExpert_AddVariableToDataAccessView.png)

D&Dすると，DataAccessViewにSampleVariableの詳細が表示されます。
値を見てみると，上記のコードで設定した`42`という値が設定されているはずです。

![UaExpert_SeeVar](/img/robotics/opcua/open62541/UaExpert_SeeVariable.png)

:::info
Value欄内の数字をダブルクリックすると，値を自由に書き換えることができます。
また、画面右側のAttribute欄でノードの詳細な情報を閲覧できます。
:::


### メソッドへのアクセス
上記コード内にて定義したメソッド「IncreaseValue」を実行してみましょう。
「Address Space」欄にある「IncreaseVariable」を右クリックし，Callを選択します。

![UaExpert_CallMethodButton](/img/robotics/opcua/open62541/UaExpert_CallMethodButton.png)

引数の入力画面が表示されるため，引数に好きな数字を入れ，右下のCallボタンを押下します。

![UaExpert_Call_Argument](/img/robotics/opcua/open62541/UaExpert_Call_Argument.png)

:::info
今回定義したメソッドには戻り値が無いため，画面下部の「Result」欄は空白となっています。
戻り値を定義した場合は，メソッドの戻り値が表示されます。
:::

メソッドが実行され，SampleVariableの値が指定した分だけ加算されます。

![UaExpert_AfterCallMethod](/img/robotics/opcua/open62541/UaExpert_AfterCallMethod.png)


# おわりに
本記事では下記の事項について説明しました。
- Open62541のインストール方法
- Visual Studioでの開発環境構築
- OPC-UA Serverのサンプル作成

次回はOPC-UA Clientを実装し，Serverと通信してみます。