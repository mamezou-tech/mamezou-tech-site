---
title: Javaエンジニアが始めるTypeScript入門！Javaとの比較で基礎をマスター
author: masato-ubata
date: 2024-09-06
tags: [typescript, java]
image: true
---

## はじめに

当記事はフロントからバックエンドまで採用率の高いTypeScript[^1]の基本を、Javaエンジニアに習得してもらうことを目的としています。  
Javaの知識を活かしてTypeScriptを習得して頂けるように、Javaとの比較を交えながら説明しています。  
これを足掛かりにスキルの幅を広げて頂けたら幸いです。  

## 記述内容の補足

* 「javaではどうなるか」
  * TypeScriptと対応する形で掲載しているJavaのコード例です。
  * コード中に登場する変数などの名称を合わせているので、それをもとに対応付けてご確認ください。  

## コンテンツ

* [変数](/blogs/2024/09/06/introduction-to-typescript-for-java-engineer_variable)［let、const、var、型注釈、型推論］
* 型
  * [プリミティブ型](/blogs/2024/09/06/introduction-to-typescript-for-java-engineer_primitive-type)［number、bigint、string、boolean、symbol、null、undefined］
  * その他の基本型［any、unknown、void、never、enum］※作成中
  * 集合を扱う型［array、tuple、Set、Map］※作成中
  * 特殊な型［union、intersection、literal、index signature］※作成中
* 関数　※作成中
* オブジェクト［インターフェイス、タイプエイリアス、クラス］※作成中
* ジェネリクス　※作成中

## 執筆時の環境

|名称|バージョン|
|---|---|
|npm|10.5.0|
|node|20.12.2|
|TypeScript|5.5.4|
|Java|21.0.2|

## 環境構築

npm, nodeはインストールされているものとして説明します。

1. 各種インストール
  ```sh
  # TypeScriptをインストール
  npm install typescript
  # tsconfig.jsonを作成
  npx tsc --init
  # ts-nodeをインストール: tscからnodeコマンドの実行を担ってくれるパッケージ
  npm install -D ts-node
  # ts-node-devをインストール: ソースコードの変更を検知したタイミングで再実行してくれるパッケージ
  npm install -D ts-node-dev
  # install rimraf: ビルドしたファイルのハウスキーピング
  npm install -D rimraf
  ```
2. 各種設定

```json: tsconfig.json
{
  "compilerOptions": {
    "target": "ES2023", //bigintを使用する場合、2020以上に設定してください。
    "outDir": "./dist", //ファイルの出力先
  }
}
```

```json: package.json
{
  "main": "dist/index.js", //実行対象のjsファイルを設定
  "scripts": {
    "dev": "ts-node src/index.ts",
    "dev:watch": "ts-node-dev --respawn src/index.ts",
    "clean": "rimraf dist",
    "tsc": "tsc",
    "build": "npm run clean && tsc", 
    "start": "node .",
  },
}
```

## 環境の動作確認

1. index.tsを作成して、1文記述
  ```ts: index.ts
  console.log("Hello, World.");
  ```
2. 起動
  コンソールに`Hello, World`と表示されることを確認してください。
  ```sh
  npm run dev:watch
  ```
3. index.tsを変更
  コンソールに`Hello, TypeScript`と表示されることを確認してください。
  ```ts: index.ts
  console.log("Hello, TypeScript.");
  ```

## その他のコマンド

```sh
# コンパイル＆実行
npm run dev
# クリーン：ビルドしたリソースを削除
npm run clean
# コンパイル
npm run tsc
# クリーン＆コンパイル
npm run build
# ビルド済のリソースを実行
npm run start
```

[^1]: TypeScriptとは
2012年10月1日にMicrosoftから公開されたJavaScriptのスーパーセットとなるプログラミング言語で、JavaScriptのすべての機能を包含しています。
一番の特徴はJavaScriptに静的型付けを追加している点。
TypeScriptで書かれたコードはJavaScriptにトランスパイルされ、各種環境で動作します。
オープンソースとして公開されており、Apache License2.0で提供されています。（[TypeScriptリポジトリ](https://github.com/microsoft/TypeScript)）
