---
title: Google Test を使ってみる（その４：VSCode拡張機能編）
author: shuichi-takatsu
date: 2022-11-20
tags: [テスト, googletest, vscode]
---

[前回](/blogs/2022/11/14/google-test-03/)は Google Test のテストフィクスチャを使うことで、テストケースを実行する前に、データをテストケースに渡すことができることを確認しました。  
今回はテストケースの実行をサポートするVSCode拡張機能「GoogleTest Adapter」の設定や使い方を紹介したいと思います。   


## VSCode拡張機能「GoogleTest Adapter」 とは

VSCode(Visual Studio Code)は拡張機能をインストールすることで便利な機能を追加できるようになっています。  
「GoogleTest Adapter」も拡張機能の１つです。

![](https://gyazo.com/a68413e7cdc363f38d29f242502f6996.png)

GoogleTest Adapter は Google Test のテストケースの階層構造表示をサポートし、テストケース・テスト名毎の個別実行やテスト結果の色分け表示もサポートします。  

## GoogleTest Adapter のインストール

VSCodeの「拡張機能」タブを選択し、検索窓から「GoogleTest Adapter」を検索します。

![](https://gyazo.com/70bd5cebde82eaa1281f45f2c01bbb0c.png)

検索された「GoogleTest Adapter」を選択し、「インストール」を押して拡張機能をインストールします。

![](https://gyazo.com/8afe2562ea813e46f5e5388c672207ec.png)

インストールが成功すると、VSCodeの左側に以下のような「テスト」アイコンが表示されます。

![](https://gyazo.com/fec094b7e58d13787e24603464747492.png)

## 設定

上記のテストアイコンをクリックしただけでは、Google Test のテストケースは認識されません。  
テストケースを拡張機能に認識させるためにはVSCodeの「起動ファイル」を作成する必要があります。  

「.vscode」フォルダの下に、以下の「起動ファイル」(launch.json)の雛形を作成します。  
```json
{
    // IntelliSense を使用して利用可能な属性を学べます。
    // 既存の属性の説明をホバーして表示します。
    // 詳細情報は次を確認してください: https://go.microsoft.com/fwlink/?linkid=830387
    "version": "0.2.0",
    "configurations": [
        // ここに起動設定を追加していく
    ]
}
```

「configurations」の中で「Ctrl＋スペース」を押すと、以下のような選択肢が表示されます。  

![](https://gyazo.com/83b83a17a1179162d3b5f0e1dc75ec51.png)

「C/C++: (gdb) 起動」を選択します。 
以下のような設定が追加されました。  

```json
{
    // IntelliSense を使用して利用可能な属性を学べます。
    // 既存の属性の説明をホバーして表示します。
    // 詳細情報は次を確認してください: https://go.microsoft.com/fwlink/?linkid=830387
    "version": "0.2.0",
    "configurations": [
        {
            "name": "(gdb) 起動",
            "type": "cppdbg",
            "request": "launch",
            "program": "プログラム名を入力してください (例: ${workspaceFolder}/a.exe)",
            "args": [],
            "stopAtEntry": false,
            "cwd": "${fileDirname}",
            "environment": [],
            "externalConsole": false,
            "MIMode": "gdb",
            "miDebuggerPath": "/path/to/gdb",
            "setupCommands": [
                {
                    "description": "gdb の再フォーマットを有効にする",
                    "text": "-enable-pretty-printing",
                    "ignoreFailures": true
                },
                {
                    "description":  "逆アセンブリ フレーバーを Intel に設定",
                    "text": "-gdb-set disassembly-flavor intel",
                    "ignoreFailures": true
                }
            ]
        }
    ]
}
```

上記の起動ファイルの次の部分を変更します。  
- program : デバッグしたいプログラムのパスに変更します。
- cwd : "`${fileDirname}`" となっていますが、"`${workspaceFolder}`" に変更します。  
- miDebuggerPath : gdbへのパスに変更します。

今回、筆者の環境では、デバッグ対象のプログラムは「counter2.exe」であり、gdbへのパスは「C:/gcc/mingw64/bin/gdb.exe」でしたので、最終的には次のようになりました。  

```json
{
    // IntelliSense を使用して利用可能な属性を学べます。
    // 既存の属性の説明をホバーして表示します。
    // 詳細情報は次を確認してください: https://go.microsoft.com/fwlink/?linkid=830387
    "version": "0.2.0",
    "configurations": [
        {
            "name": "(gdb) 起動",
            "type": "cppdbg",
            "request": "launch",
            "program": "${workspaceFolder}/counter2.exe",
            "args": [],
            "stopAtEntry": false,
            "cwd": "${workspaceFolder}",
            "environment": [],
            "externalConsole": false,
            "MIMode": "gdb",
            "miDebuggerPath": "C:/gcc/mingw64/bin/gdb.exe",
            "setupCommands": [
                {
                    "description": "gdb の再フォーマットを有効にする",
                    "text": "-enable-pretty-printing",
                    "ignoreFailures": true
                },
                {
                    "description":  "逆アセンブリ フレーバーを Intel に設定",
                    "text": "-gdb-set disassembly-flavor intel",
                    "ignoreFailures": true
                }
            ]
        }
    ]
}
```

次に「設定ファイル」(settings.json)を作成します。  
今回、テスト結果を色分けして表示したいので以下のように作成しました。  

```json
{
    "editor.tokenColorCustomizations": {
        "textMateRules": [
            {
                "scope": "googletest.failed",
                "settings": {
                    "foreground": "#f00"
                }
            },
            {
                "scope": "googletest.passed",
                "settings": {
                    "foreground": "#0f0"
                }
            },
            {
                "scope": "googletest.run",
                "settings": {
                    "foreground": "#0f0"
                }
            }
        ]
    },
    "gtest-adapter.debugConfig": [],
    "gtest-adapter.supportLocation": true
}
```

次にVSCodeの「テスト」を選択した状態で、上部に表示される「Switch Test Cofiguration」ボタンを押します。  
右側に表示されるデバッグ設定選択ダイアログで「(gdb)起動」を選択し、「OK」ボタンを押します。  
ここで選択した「(gdb)起動」は先程の launch.json で作成したデバッグ設定です。  

![](https://gyazo.com/2eedd3ccb4b22721e1dcfeff627d18eb.png)

テストの「更新」を押すと、以下のようにテストケースが表示されます。

![](https://gyazo.com/b921e0c30965ec6727dfae4e39bd0513.png)

## 実行

以下はテストケース「CounterTest」の「Both」テストのみを選択して実行したときの結果です。

![](https://gyazo.com/cea16f239bd040afbda71b84f8a03e41.png)

すべてを一度に実行することもできます。  

![](https://gyazo.com/2f6093cc696eb8ec92f4e04e01c2f2a0.png)

## 複数の起動設定を登録する

起動ファイル(launch.json)に複数のgdb起動設定を登録し、複数のテストケースをテストすることもできます。  
複数登録した場合は以下のように表示されます。  
(ただし、テストケース名をユニークにする必要があります)

![](https://gyazo.com/27d182305f133e94c3f8bccb5144b055.png)

## まとめ

今回はテストケースの実行をサポートするVSCode拡張機能「GoogleTest Adapter」の設定や使い方を紹介しました。  
次回は Google Test の詳細な部分や Mockフレームワークについて解説していきたいと思います。

[ソフトウェアテストに関する技法やテクニックをまとめています。](/testing/)

テストに活用していただければ幸いです。
