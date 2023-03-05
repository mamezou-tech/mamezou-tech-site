---
title: Pytestを使ってみる（その２：VSCode拡張機能編）
author: shuichi-takatsu
date: 2023-03-05
tags: [テスト, pytest, vscode]
---

[前回](/blogs/2023/03/01/using-pytest-01/)はPytestのインストールと簡単なサンプルを実行してみました。  
今回はPytestを便利に使うVSCodeの拡張機能「Python Test Explorer for Visual Studio Code」を紹介したいと思います。  

## 拡張機能のインストール

VSCodeを起動して「拡張機能」から「Python Test Explorer for Visual Studio Code」を検索して、インストールします。  
![](https://gyazo.com/c3917d8e4fd416d53d2c2163846e6fed.png)

VSCodeの左側のパネルの「テスト」を選択します。  
![](https://gyazo.com/e1483f03f512688532074e7c6d2fc0e9.png)

## 設定

「Configure Python Tests」というボタンが表示されるので「Configure Python Tests」を選択します。  
![](https://gyazo.com/7e5fda446440e0ae2e77ef623d856583.png)

テスティングフレームワークとして
- unittest
- pytest

の２つの選択肢が表示されますので「Pytest pytest framework」を選択します。  
![](https://gyazo.com/2df1040a414cc31b9c9d49f1bd6726db.png)

次にテストケースファイルが含まれているディレクトリを選択します。  
「ルートディレクトリ」を選択します。  
このディレクトリには[前回](/blogs/2023/03/01/using-pytest-01/)作成したテストケースのファイル(test_sample.py)が格納されていると仮定します。  
![](https://gyazo.com/14c52c379ca66db6d612c357141d5255.png)

正しくテストケースが認識されると「テストエクスプローラ」にPytestのサンプルが表示されます。  
![](https://gyazo.com/b272754bb07b2d997bd1f94ee92e6e91.png)

## 実行

テストテクスプローラ上にマウスカーソルをかざすと以下のような実行ボタンが表示されます。  
![](https://gyazo.com/77abd644744ae2557316d5e608ac72e1.png)

実行ボタンを押してテストを実行します。  
以下のように結果をビジュアルに表示してくれます。  
![](https://gyazo.com/9a0a35b92571a491cf7f6ca0fbaac49c.png)

個別に１つづつテストを実行させたい場合は特定のテストケース上の「Run」ボタンを押します。  
![](https://gyazo.com/a98a034126e2dba5fcc4c09c6e05d545.png)

## デバッグ

テストケースにブレークポイントを設定して、デバッグボタンを押すと、コードをデバッグすることも可能です。  
![](https://gyazo.com/ca4d31a4ac9a8772c545429683dca3de.png)

## 注意

これは最初の「ハマりポイント」かもしれませんが、本拡張機能はテストケースファイル名が「test_」で始まっている必要があります。  
「test_」で始まっていないテストケースファイル名はテストケースとして認識されず、テストエクスプローラ上に表示すらされません。  
本拡張機能を使ってPytestを実行したい場合はファイル名規則を守る必要があります。  

## まとめ

今回は「Pytest」を便利に使うVSCode拡張機能を紹介しました。
今後もいろいろなPytestの使い方を紹介していきたいと思います。  

[ソフトウェアテストに関する技法やテクニックをまとめています。](/testing/)

テストに活用していただければ幸いです。