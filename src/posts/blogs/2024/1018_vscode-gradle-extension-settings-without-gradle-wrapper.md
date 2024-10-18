---
title: Gradle Wrapper が利用できない時の VS Code Gradle 拡張設定
author: masahiro-kondo
date: 2024-10-18
tags: [gradle, vscode, java, tips]
image: true
---

## はじめに
Gradle Wrapper や Maven Wrapper はシステムに Gradle や Maven がインストールされていなくても必要なバージョンのバイナリ本体をダウンロードしてくれるので便利です。

Gradle のバイナリ本体は `service.gradle.org/distributions/gradle-8.xx.x-bin.zip` のような URL で配布されており、社内などアクセス制限がある環境では、ダウンロードに失敗してビルドエラーになります。

## プロジェクト自体のビルド
Gradle のバイナリが社内サイトなどで配布されている場合は、プロジェクトの gradle/gradle-wrapper.properties で `distributionUrl` を設定することでビルドが可能です。

[Gradle Wrapper Reference](https://docs.gradle.org/current/userguide/gradle_wrapper.html)

そういうサイトがない場合は Gradle を手動でインストールして対応することになります。プロジェクト内の gradlew コマンドではなく、パスの通った gradle コマンドを使ってビルドすれば OK です。

[Gradle | Installation](https://gradle.org/install/)

## VS Code Gradle 拡張の設定
VS Code で [Gradle 拡張](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-gradle)は、デフォルト設定でプロジェクトの gradle/gradle-wrapper.properties を参照しているため、上記のように Gradle Wrapper が社内サイトなどで配布されている場合、`distributionUrl` で指定された URL のバイナリをダウンロードしてビルドしてくれます。

Gradle のバイナリが取得できない場合、Gradle のビルドが失敗し、Java 拡張によるプロジェクト情報の構築に失敗します。

![No Java projects found](https://i.gyazo.com/dc858e327a31025191ece2c5e6320ffd.png)

コードの編集は可能ですが、コード補間や JavaDoc のホバー表示が効かず、リファクタリングなどもうまくできません。

ということで、Gradle 拡張の設定を変更して Gradle Wrapper ではなくローカルの gradle コマンドを使うように設定しましょう。

設定で `gradle` を検索し `Java > Import > Gradle > Wrapper: Enabled` のチェックを外して、maven/gradle-wrapper.properties を参照しないようにします。
次に `Java > Import > Gradle: Home` に Gradle のインストール先のパスを設定します。

![Gradle settings](https://i.gyazo.com/eacc2679adc8e35b5b4aaed41e6182e8.png)

この例では、ワークスペースの設定になっており、Spring Boot のプロジェクトフォルダを直接  VS Code で開いているため、.vscode/settings.json が以下のように作成されます。このファイルを直接編集しても OK です。

```json:.vscode/settings.json
{
  "java.import.gradle.version": "",
  "java.import.gradle.wrapper.enabled": false,
  "gradle.nestedProjects": false,
  "java.import.gradle.home": "/Users/kondoh/lib/gradle-8.10.2"
}
```

:::info
settings.json の `gradle.nestedProjects` が true になっていると、ルートのプロジェクトだけでなく、サブディレクトリに配置したプロジェクトも管理してくれます。

VS Code の Java おすすめ環境構築については以下の記事もご参照ください。

[2024年版！VS Code で Java 開発環境を構築する](/blogs/2024/07/18/write-java-with-vscode-2024/)
:::

この設定でプロジェクトを開き直すと、Gradle ビルドが成功し、無事プロジェクト情報が読み込まれます。

![Build success](https://i.gyazo.com/acd95ffbc2812759536e438b33833b75.png)

## さいごに
以上、Gradle Wrapper が利用できない場合の VS Code 側の対応方法の紹介でした。

Maven の方は試していませんが、Maven 拡張に `Maven > Exectutable: Prefer Maven Wrapper` のような設定値があるのでなんとかなりそうな感じです。

![VS Code mvnw setting](https://i.gyazo.com/f989498b3243507d776c30a2c071e7b4.png)
