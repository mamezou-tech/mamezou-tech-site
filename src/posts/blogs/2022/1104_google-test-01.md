---
title: Google Test を使ってみる（その１：準備編）
author: shuichi-takatsu
date: 2022-11-04
tags: [テスト]
---

これから数回に分けて「Google Test」についてご紹介したいと思います。  
Windows＋VSCode(Visual Studio Code)環境で Google Test を紹介している例があまり無かったので、今回は Google Test をソースコードで取得してビルドし、Google Test環境を準備するところまでご紹介します。  

[[TOC]]

## Google Test とは

[Google Test](https://github.com/google/googletest) は、正式には「Google C++ Testing Framework」と言います。  
Google Test は、xUnitアーキテクチャベースのC++言語用の単体テストフレームワークです。  
C++用として開発されましたが、C言語用としても利用できます。

その他のC/C++用の単体テストフレームワークとしては [CppUnit](https://github.com/cpputest/cpputest) や [Unity](https://github.com/ThrowTheSwitch/Unity/)(ゲームエンジンのUnityではない方) などがあります。  
CppUnitはCとC++に利用できますが、UnityはC専用のようです。

## 準備(Windows環境)

### Windows Mingw w64 のインストール

最近のWindowsPCはほぼ64bit版だと思いますので、64bit版OSを前提にご説明します。  
Windowsで Google Test をソースコードからビルドするためにはビルド環境が必要です。  
LinuxやmacOSなら[GCC](http://gcc.gnu.org/)(GNU Compiler Collection)が標準で装備されていますが、Windowsの場合は自前で導入するしかありません。  
Windows環境用のGCCとしてはMinGWが有名です。  
MinGWは32bit版なので、64bit版の MinGW-w64 をインストールします。  

[MinGW-w64](https://www.mingw-w64.org/)のサイトを開きます。    
![](https://gyazo.com/ab1facf680a582a8719d7e2c53994d1a.png)  

ページの左にある [Download](https://www.mingw-w64.org/downloads/) のリンクをクリックします。  
ダウンロードページの下の方にある「MingW-W64-builds」をクリックします。  
![](https://gyazo.com/a5564a6c5b936725a3d1685d40136eac.png)  

[MinGWのGithub](https://github.com/niXman/mingw-builds-binaries/releases)のサイトに遷移します。  
今回は以下のファイルを選択し、ダウンロードしました。  
`x86_64-12.2.0-release-posix-seh-rt_v10-rev0.7z`

![](https://gyazo.com/202b1ac2154eb21d85a7e004d9f77635.png)  

ここには数種類の7zファイルが格納されていますが、ファイル名の意味は以下になります。  
- i686/x86_64 : アーキテクチャを示します。  
    - i686 : 32bit版  
    - x86_64 : 64bit版  
- 12.2.0 : GCCのバージョンを示します。  
- release : リリースバージョンであること示します。  
- win32/posix : スレッドモデルを示します。  
    - win32 : Windows スレッドモデルのみをサポートします。C++11以降の thread, mutex, future が使えません。  
    - posix : POSIXスレッドをサポートしています。Unix、Linux、Windowsで使用できます。  
- dwarf/sjlj/seh : 例外処理ハンドリングを示します。  
    - dwarf : 32bitバイナリのみサポートします。  
    - sjlj : C++標準ライブラリを使用した例外処理をサポートします。  
    - seh : Windows特化の構造化例外処理をサポートします。  
- rt_v10-rev0 : ランタイムのビルドバージョンを示します。特に指定がなければ最新のものを選びます。  

:::alert
Google Test をソースコードからビルドするには MinGW-w64のposix版 をダウンロードしなくてはなりません。win32版ではスレッドモデルの違いでビルドができませんでした。[こちら](https://github.com/microsoft/LightGBM/issues/2608)に情報があります。  
:::

ダウンロードしたファイルを解凍し、適当なフォルダに配置します。(私は C:\gcc の下に配置しました)  
ビルド時にGCCにパスが通っている必要があるので、環境変数に    
`C:\gcc\mingw64\bin`  
を追加しました。  

### CMake のインストール

今回は Google Test をソースコードで取得してビルドを行うので、[CMake](https://cmake.org/) があると楽ちんです。

CMake は、コンパイラに依存しないビルド自動化のためのソフトウェアです。  
様々なOSに移植されています。  
CMake 自体はビルドを実施せず、実際のビルドには環境依存のビルドシステムを利用します。Windows環境では Visual StudioやMinGW、macOS環境では XCode、Linux/Unix環境では make などのネイティブのビルド環境が利用されます。

では、CMake をインストールします。  

[ここ](https://cmake.org/download/)からCMakeのインストーラーをダウンロードします。  
![](https://gyazo.com/139cf36910cbfaf00eacee5e75c3bedc.png)  
  
ダウンロードしたMSIファイルを実行し、「環境変数にパスを登録する」を選んで、残りの選択肢はデフォルトの設定でインストールを行います。  
(筆者はスペースを含んだフォルダパスが嫌いなので、C:\CMake にインストールしました)  

### VSCode の拡張機能のインストール

VSCodeに以下の拡張機能を追加しました。  

必須なのは C/C++ と CMake くらいだと思います。  
(筆者の環境は、あれこれインストールしているうちに、こんなになってしまいました)  
![](https://gyazo.com/c4ebdf529f72dcae27893aac37825d08.png)

また、追加すると便利な拡張機能は以下のものでした。  
Google Test で書いたテストランナーを起動してくれます。

![](https://gyazo.com/c3776a46272d7198c7003e9122e6bfd7.png)

## Google Test のインストール

[Google Test](https://github.com/google/googletest) をインストールします。  

次のコマンドで Google Test のソースコードをダウンロードします。  
(2022/11/03時点での最新版は v1.12.1 でした。以下、ソースコードは googletest フォルダに配置されているとして話を進めます)  
`git clone https://github.com/google/googletest.git -b release-1.12.1`  

VSCode で Google Test のフォルダを選択し、拡張機能「CMake」でビルドを実行します。    
![](https://gyazo.com/35a5e6fcba6f98423635c266e9a4c49f.png)

VSCode の CMake拡張機能を使うとビルドが非常に楽ちんです。  

![](https://gyazo.com/6bf9ab78486b39f2c85e28271703a171.png)

ビルドが成功すると以下のバイナリが生成されます。  

生成物：  
```shell
\googletest\build\lib  
 libgmock.a
 libgmock_main.a
 libgtest.a
 libgtest_main.a
```
上記の４つのバイナリファイルを以下のフォルダ
`C:\gcc\mingw64\x86_64-w64-mingw32\lib`  
下にコピーします。(パスは各自がMinGW-w64をインストールしたパスに合わせてください)

次にIncludeファイルをコピーします。
Google Test の Gtest,Gmock のIncludeフォルダ
`\googletest\googletest\include\gtest`  
`\googletest\googlemock\include\gmock`
を「gtest」「gmock」フォルダごと  
`C:\gcc\mingw64\x86_64-w64-mingw32\include`  
下にコピーします。  

ここまでで Google Test を実行する環境が整いました。

## まとめ

今回は Google Test をソースコードで取得してビルドし、Google Test を実行できる環境を整えました。  
次回は簡単なサンプルプログラムを実行して、Google Test が動作するところを確認していきたいと思います。

[ソフトウェアテストに関する技法やテクニックをまとめています。](/testing/)

テストに活用していただければ幸いです。
