---
title: WindowsでRust開発環境を作ってみる(VSCode＋BuildTools＋rustup)
author: shuichi-takatsu
date: 2023-02-12
tags: [rust]
---

最近はRustが人気と聞き、”技術ミーハー”な筆者としてはRustの開発環境を構築してみたくなりました。  
Rustはプログラムの実行が高速であり、C/C++が不得意であったメモリの安全性を確保するなどの特徴を持ち、C/C++に取って代わるプログラミング言語になりえるステータスを持っています。  

今回はWindows10＋VSCode＋BuildTools＋rustupでRustの開発環境を構築してみようと思います。  
開発環境が構築できたら、RustをESP32(IoTデバイス)用のプログラミング言語にしてプログラムを作ってみたいと考えています。  
環境構築の流れは基本的に[ここ](https://learn.microsoft.com/ja-jp/windows/dev-environment/rust/setup)を参考にしました。  

## Microsoft C++ Build Tools をインストールする

BuildシステムとしてVisual Studioか C++ Build Toolsのどちらかをインストールする必要がありますが、筆者の環境にはVisual Studio Codeがインストールされているので、今回は C++ Build Tools をインストールします。

Microsoft C++ Build Tools を[ここ](https://visualstudio.microsoft.com/ja/visual-cpp-build-tools/)からダウンロードして、インストーラーを実行します。  

必要なワークロードは以下の３つです。    
- .NET デスクトップビルドツール
- C++ によるデスクトップ開発
- ユニバーサル Windows プラットフォームビルドツール

![](https://gyazo.com/e297086a48c77d346c59d422abdc6f0b.png)

インストールにはかなり時間がかかりました。(15分程度)  
インストールが完了すると以下のダイアログが表示されます。  
![](https://gyazo.com/d07718b8e707f3f2886367dda4f4003e.png)

インストーラーの表示が以下のようになればインストールは完了です。  
![](https://gyazo.com/6e5e2d3d583d52de3165b670af5205c1.png)

## rustup をインストールする

次に「rustup」をインストールします。  
rustupは[ここ](https://www.rust-lang.org/ja/tools/install)からダウンロードします。  
筆者のWindowsは64ビット版なので64ビット版のインストーラーをダウンロードします。  

![](https://gyazo.com/8169e65200fd2dc8ee6221d752ce8bd8.png)

インストーラーを起動します。  
コマンドウインドウが表示されます。  
１番目(デフォルト)を選択します。  

![](https://gyazo.com/9ee0603dbbabd70bb6416919a80cf13f.png)

インストールが開始されます。  

![](https://gyazo.com/8f14eb1e5820b6615e06eb7f4addef73.png)

インストールが完了すると「Press the Enter Key to continue」と表示されますので、Enterキーを押してコマンドウインドウを閉じます。  

![](https://gyazo.com/8f9b73f7f87eff43912ab1bca170c170.png)

## VSCode拡張機能のインストール

今回使用するプラグインは以下の２つです。
- rust-analyzer 拡張機能
- CodeLLDB 拡張機能

Marketplaceで拡張機能を検索してインストールします。  
![](https://gyazo.com/1f3b2740f4e3e5fb781c4c6c93db1e26.png)
![](https://gyazo.com/1411d274187bb17449a5b055dd4dd94b.png)

ここまで出来たら、Rustのプログラムを作成する準備は整いました。

## はじめてのRustプロジェクト作成

簡単なRustプロジェクトを作成してみます。  
任意のフォルダに移動し、以下のコマンドをコマンドラインで実行します。

```shell
cargo new testproj
```

testprojというプロジェクトが作成されました。

![](https://gyazo.com/5387823933806f91b32ecb54ef2f27d2.png)

上記で作成したフォルダ「testproj」をVSCodeで開きます。  
「testproj」フォルダ配下に以下のようなフォルダとファイルが作成されていました。  

![](https://gyazo.com/a35f8ea142d64eaca480d0d748eec68e.png)

VSCodeで `src>main.rs` ファイルを開きます。  
Rustのソースコードが右側のペインに表示されます。  

![](https://gyazo.com/5c354635c839444515b4427267a6f867.png)

RSファイルを開くと以下のファイルやフォルダが作成されました。  
- Cargo.lock ファイル
- target フォルダ

またプラグインの機能により、以下のように「Run」や「Debug」というボタンがコード上に表示されます。

![](https://gyazo.com/e4a6105c289657dae932cb2fb222637d.png)

Runボタンを押します。

![](https://gyazo.com/86a51515a7f53760973de4850dceed64.png)

プログラムが実行され、コマンドライン上に「Hello, World！」と表示されました。  
実行されたプログラムは  
`target\debug\testproj.exe`  
のようです。

次にデバッグを実行してみます。  
プログラム中の  
`println!("Hello, world!");`  
の部分にブレークポイントを設定し、Debugボタンを押します。

![](https://gyazo.com/971cb51a340c664bbee8ad60df28fa5b.png)

ブレークポイントを設定した行でプログラムが一時停止しました。  
正常にデバッグできているようです。  

## まとめ

今回はWindows10にRustの開発環境を構築してみました。  
本当はRust＋ESP32(IoTデバイス)の開発環境を構築するところまで掲載したかったのですが、ESP-IDF(Espressif Systems社製ESP32向け公式開発環境)とRustの連携に苦戦していて、まだESP32側への設定が出来ていません。  
(Arduino IDEではRust開発はできないようなので、別途ESP-IDFのインストールに挑戦しています)  

ESP-IDF単体では以下のようにサンプルプログラム(C言語)のビルドとESP32デバイスへの書き込みも成功しています。  
![](https://gyazo.com/8691f7463888823d9d74d515b0d98a04.png)

ESP32まわりの問題が片付いたら、次回の記事で報告したいと思います。
