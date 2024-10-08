---
title: Javaエンジニアが始めるTypeScript入門（第1回：イントロダクション）
author: masato-ubata
date: 2024-09-06
tags: [typescript, java]
nextPage: ./src/posts/typescript-intro/introduction-to-typescript-for-java-engineer_variable.md
---

## はじめに

当記事はフロントからバックエンドまで採用率の高いTypeScriptの基本を、Javaエンジニアに習得してもらうことを目的としています。  
Javaの知識を活かしてTypeScriptを習得して頂けるように、Javaとの比較を交えながら説明しています。  
これを足掛かりにスキルの幅を広げて頂けたら幸いです。  

:::info
記事の中でTypeScriptと比較する形でJavaのコード例を掲載しています。  
コード中に登場する変数名などの名称を合わせているので、それをもとに対応付けてご確認ください。

  ```TypeScript: TypeScript
  let sample1 = 10;
  let sample2: number;
  ```
  ```java: Javaではどうなるか
  var sample1 = 10;
  int sample2;
  ```
:::

:::column:What's TypeScript

2012年10月1日にMicrosoftから公開されたJavaScriptのスーパーセットとなるプログラミング言語で、JavaScriptのすべての機能を包含しています。
一番の特徴はJavaScriptに静的型付けを追加している点です。
TypeScriptで書かれたコードはJavaScriptにトランスパイルされ、各種環境で動作します。
オープンソースとして公開されており、Apache License2.0で提供されています。（[TypeScriptリポジトリ](https://github.com/microsoft/TypeScript)）
:::


## コンテンツ

以下のようなコンテンツを予定してます。

* [変数](/typescript-intro/introduction-to-typescript-for-java-engineer_variable)：let、const、var、型注釈、型推論
* 型
  * [プリミティブ型](/typescript-intro/introduction-to-typescript-for-java-engineer_primitive-type)：number、bigint、string、boolean、symbol、null、undefined
  * [その他の基本型](/typescript-intro/introduction-to-typescript-for-java-engineer_other-basic-type)：any、object、unknown、void、never、enum、型アサーション、型ガード、
  スプレッド演算子、分割代入
  * [集合を扱う型](/typescript-intro/introduction-to-typescript-for-java-engineer_collection-type)：array、tuple、Set、Map
  * [特殊な型](/typescript-intro/introduction-to-typescript-for-java-engineer_special-type)：union、intersection、literal、template literal type、object literal、mapped type、conditional type、
  index signature
* [関数](/typescript-intro/introduction-to-typescript-for-java-engineer_function)
* オブジェクト：インターフェイス、タイプエイリアス、クラス　※作成中
* ジェネリクス　※作成中

## 執筆時の環境

本記事は下記のバージョンのソフトウェアで動作を確認しています。

|名称|バージョン|
|---|---|
|npm|10.5.0|
|node|20.12.2|
|TypeScript|5.5.4|
|Java|21.0.2|

## 環境構築

TypeScriptの動作検証をするための環境構築手順は以下の通りです。  
npm, nodeはインストールされているものとして省略しています。

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
    "target": "ES2023", //bigintを使用する場合、2020以上に設定してください
    "outDir": "./dist", //ファイルの出力先を設定してください
  }
}
```

```json: package.json
{
  "main": "dist/index.js", //実行対象のjsファイルを設定してください
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

構築した環境の動作確認手順は以下の通りです。

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

環境構築で設定した`dev:watch`以外のコマンドは以下の通りです。

```sh
# コンパイル＆実行（1回だけ実行したい）
npm run dev
# クリーン＆コンパイル（JavaScriptへトランスパイルした結果を確認したい）
npm run build
# ビルド済のリソースを実行（ビルドした結果を実行したい）
npm run start
```
