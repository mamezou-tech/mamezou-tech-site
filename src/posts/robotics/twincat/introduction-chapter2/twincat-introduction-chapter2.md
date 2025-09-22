---
title: TwinCATで始めるソフトウェアPLC開発（その2：ST言語でのプログラミング）
author: hayato-ota
tags: [PLC, TwinCAT]
date: 2025-09-30
image: true
---

# 記事草案
## ソリューション作成
Visual Studio もしくは XAE Shellを開く。  
（今回はVisual Studioを選択）

「新しいプロジェクトの作成」を選択する。
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/create-twincat-solution-1.png)

プロジェクトテンプレートには「TwinCAT XAE Project (XML format)」を選択する。
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/create-twincat-solution-2.png)

プロジェクト名とソリューション名を指定する。
「ソリューションとプロジェクトを同じディレクトリに配置する」にチェックを入れておく。（個人の好み）
プロジェクト名・ソリューション名は「TwinCAT-Tutorial」とする。
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/create-twincat-solution-3.png)

## PLCプロジェクト作成
ソリューションエクスプローラーにて「PLC」を右クリック。「新しい項目の追加」をクリック。
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/create-plc-project-1.png)

※ ToDo : ソリューションエクスプローラーの表示方法を記載する

「Standard PLC Project」を選択し，プロジェクト名を指定する。追加ボタンを押す。
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/create-plc-project-2.png)


## MAINプログラムを編集してみる
「POUs」フォルダ内にある「MAIN(PRG)」をクリックして編集画面を開く。
編集画面の上半分はプログラムの定義スペース，下半分はプログラムの実装スペース。
（C++で例えるなら，上半分がヘッダファイル，下半分がソースファイルを記述するスペース。）
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/create-plc-project-3.png)

定義スペース（上半分）には下記のように記述する。
変数定義時は「変数名 : 型」のように記述する。
ToDo : データ型にはどのようなものがあるのかを簡単に記述。リンクを張るか？

```
PROGRAM MAIN
VAR
	/// プログラム呼び出し回数
	CycleCount : DINT;
END_VAR
```
実装スペース（下半分）は下記のように記述する。

```
// 変数をインクリメントする
CycleCount := CycleCount + 1;
```

※ 代入の演算子は「:=」である。「=」は同値評価である点に注意。


## プロジェクトの書き込みとログインによるプログラム動作確認
（ToDo : 実機を使用して書き込む手順と，ログインして値を確認した結果を記載する）
CycleCount変数の値が1秒当たり100増えることを確認する。


## タスクの実行周期を変えてみる
理解を深めるために，プロジェクト生成時に自動で追加されたタスクを消してみる。
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/create-new-task-1.png)

新しいタスクを作成する。「SYSTEM」>「タスク」を右クリックして「新しい項目の追加」を押す。
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/create-new-task-2.png)

タイプは「TwinCATタスク」を選択して，名前を「MainTask」として「OK」を押す。
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/create-new-task-3.png)

作成したタスクの詳細設定画面が開く。「サイクルティック」を10 → 100に変更する。
これによりタスクの実行周期が100msとなる。
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/create-new-task-4.png)

:::info
サイクルティック1つ当たりの時間はデフォルトでは1msだが，CPUのコア設定で変更可能。
詳細についてはこちらを確認。（ToDo : リンクを貼る）
:::

タスクを作成したら，どのプログラムを呼び出すかを設定する。
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/create-new-task-5.png)

割り当て可能なタスクが表示されるので，先ほど作成した「MainTask」を指定して「Open」を押す。
「タスク参照」の項目が生成される。
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/create-new-task-6.png)

生成した「タスク参照」を右クリックして，下記の項目を選択する。
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/create-new-task-7.png)

タスクから呼び出すプログラムを選択する。先ほどコードを修正した「MAIN」プログラムを選択してOKを押す。
![image](../../../../img/robotics/twincat/twincat-introduction-chapter2/create-new-task-8.png)

この状態で，再度プロジェクトを書き込んで動作を確認する。
CycleCount変数の値が1秒当たり10だけ増えることを確認する。

# Function Blockを使用したプログラム