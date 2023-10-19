---
title: Open62541によるOPC-UAサーバ開発
author: hayato-ota
date: 2023-10-31
tag: [iot, opcua]
---

# OPC-UAとは
[ToDo]OPC-UAの概略について述べる

## ロボット開発におけるOPC-UA
[ToDo]ロボット開発においてOPC-UAがどのように使用されているかを述べる

## Open62541とは
[ToDo]OPC-UAのライブラリであるOpen62541の詳細について述べる。
- 何ができるのか
- 言語は何か？ <- C言語


# 開発環境構築
先述したOpen62541を使用して，OPC-UAの開発環境を構築していきます。

:::info
開発に当たって，下記のツールを使用します。
インストールされていない場合は，インストールしましょう。

- Visual Studio
    - 本記事ではVisual Studio 2022 Communityを使用しています
- OpenSSL
- CMake
- Python3
- UaExpert
    - OPC-UAクライアントツール

:::


## Visual Studioソリューションの作成
Visual Stdioソリューションを作成し，プロジェクトを作成するための準備を行います。

Visual Studioを起動し，「新しいプロジェクトを作成する」を選択します。

プロジェクトテンプレートでは，「空のソリューション」を選択します。

![aaa](/img/robotics/opcua/open62541/visualstudio_startup.PNG)   ![bbb](/img/robotics/opcua/open62541/visualstudio_create_void_solution.PNG)

任意の場所にソリューションを生成します。
本記事では下記のように設定しました。

```
ソリューションフォルダ作成ディレクトリ: C:\Mamezou
ソリューション名: open62541_ws
```

![](/img/robotics/opcua/open62541/visualstudio_solution_setting.png)

`C:\Mamezou\open62541_ws\open62541_ws.sln` が生成されました。

:::info

以降では，`C:\Mamezou\open62541_ws`をソリューションディレクトリと呼ぶこととします。

本記事と異なるディレクトリとした場合は，適宜読み替えてください。

:::

以上でソリューションの作成は完了です。
後ほどソリューション内にプロジェクトを生成します。

:::column: Visual Studioのソリューションとプロジェクトについて
[ToDo](Visual Studioのソリューションとプロジェクトについて，クラス図を用いて説明する)
:::



## Open62541のインストール
ソリューションディレクトリ内に「deps」フォルダを作成します。
その中にopen62541リポジトリをクローンします。
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
下記以外の詳細については，Open62541のドキュメント内の「3.2 Build Options」を参照してください。

| オプション名 | 設定値 | 説明 |
| ---- | ---- | ---- |
| BUILD_SHARED_LIBS                         | ON        | 共有ライブラリ（.dll）を生成するか |
| CMAKE_BUILD_TYPE                          | Release   | ビルドタイプの設定<br>【Debug/Release/MinSizeRel/RelWithDebInfo】|
| UA_BUILD_EXAMPLES                         | OFF       | サンプルプログラムを生成するか |
| UA_ENABLE_PUBSUB                          | ON        | Publish/Subscribeを有効/無効にする |
| UA_ENABLE_SUBSCRIPTIONS                   | ON        | Subscriptionの有効/無効 |
| UA_ENABLE_ENCRYPTION                      | OPENSSL   | 暗号化に使用するバックエンドの指定 <br>【OFF/MBEDTLS/OPENSSL/LIBRESSL】|
| UA_ENABLE_PUBSUB_INFORMATIONMODEL         | ON        | [ToDo]Publish/Subscribe設定の情報モデル表現を有効/無効にする |
| UA_ENABLE_PUBSUB_INFORMATIONMODEL_METHODS | ON        | [ToDo]情報モデルによる |

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

```
$(SolutionDir)include
```

と設定します。

設定したら、画面右下の「適用」をクリックしましょう。

![プロジェクトインクルード設定](/img/robotics/opcua/open62541/visualstudio_project_include_setting.PNG)


:::info: Visual Studioで使用可能なマクロについて

[ToDo]使用可能なマクロについて述べる

| マクロ名 | 説明 |
| ---- | ---- |
| SolutionDir | |
| SolutionName | |
| ProjectDir | |
| ProjectName | |
| Configuration | |

![参考リンク](https://learn.microsoft.com/ja-jp/cpp/build/reference/common-macros-for-build-commands-and-properties?view=msvc-170)

:::


### ライブラリディレクトリの設定
左側の欄から

「構成プロパティ」→「リンカ―」→「全般」

を選択する

右側の「追加のライブラリディレクトリ」に

```
$(SolutionDir)lib
```
と設定する。

設定したら、「適用」をクリックしましょう。

![プロジェクト ライブラリディレクトリ設定](/img/robotics/opcua/open62541/visualstudio_project_library_directory_setting.PNG)


### 依存ファイル設定
左側の欄から

「構成プロパティ」→「リンカ―」→「入力」

を選択する

右側の「追加の依存ファイル」に

```
$(SolutionDir)lib\open62541.lib
```
を追記する。
ここで、設定値のセパレータはセミコロンです。

設定したら、「適用」をクリックしましょう。

![プロジェクト_依存ファイル設定](/img/robotics/opcua/open62541/visualstudio_project_dependent_file_setting.PNG)



### 出力ディレクトリ設定
左側の欄から

「構成プロパティ」→「全般」

を選択する。

右側の「出力ディレクトリ」の横に表示される
三角形のアイコンをクリックし、「編集...」ボタンをクリックして編集画面を開く。

![プロジェクト_出力ディレクトリ設定](/img/robotics/opcua/open62541/visualstudio_project_outputdirectory_setting.PNG)



編集画面にて、下記のように設定する。

```
$(SolutionDir)bin\$(ProjectName)\$(Configuration)\
```

設定したら、「適用」をクリックしましょう。


### dllファイルコピー設定
プログラムをビルドした後に実行する場合、アプリケーションの既往時にopeb62541.dllをリンクする必要があります。

ここでは、ビルド後にdllファイルをexeファイルに自動的にコピーするように設定します。


左側の欄から

「構成プロパティ」→「ビルドイベント」→「ビルド後のイベント」

を選択する。

右側の「コマンドライン」に下記の2行を入力する

```
robocopy $(SolutionDir)bin\ $(TargetDir) open62541.dll
IF %ERRORLEVEL% LSS 8 EXIT 0
```

![プロジェクト_ビルド後のイベント](/img/robotics/opcua/open62541/visualstudio_post_build_event_setting.PNG)


設定出来たら、OKボタンをクリックしてプロパティ画面を閉じます。

以上がプロジェクトの設定となります。



## サンプルプログラムの実装
[https://github.com/open62541/open62541/tree/v1.3.8/examples]内のtutorial_server_variable.cを参考にする


## 動作確認
(UaExpertを事前にインストールしておく)


[ToDo]本記事でどこまで説明するか？