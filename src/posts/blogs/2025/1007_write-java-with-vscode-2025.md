---
title: 2025年版！VS Code で Java 開発環境を構築する
author: yasuhiro-endo
date: 2025-10-07
tags: [vscode, java]
image: true
---

## はじめに
時代の流れは速いもので、[「2024年版！VS Code で Java 開発環境を構築する」](https://developer.mamezou-tech.com/blogs/2024/07/18/write-java-with-vscode-2024/)で、VS CodeのJava環境構築が紹介されてからのいくつかの改善がなされました。今回はそれらを紹介します。


## Extension Pack for Java Auto Configの利用
今回も結論から言ってしまうと 「Extension Pack for Java Auto Config を入れましょう」で終わりです。

[Extension Pack for Java Auto Config - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=Pleiades.java-extension-pack-jdk)

この拡張パックの内訳は以下のようになっています。
- JDKの自動構成
- [Extension Pack for Java - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-java-pack)
- [Spring Boot Extension Pack - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=vmware.vscode-boot-dev-pack)
- 追加の拡張

素のVS Codeに「Extension Pack for Java Auto Config」を入れるだけで、Javaアプリor SpringBootアプリを作るための準備はほぼ完了です。言ってしまえばVS Code版「Pleiades All in One」という内容になっています（実際にこの拡張はPleiadesチームによって開発されています）。

「Extension Pack for Java」と「Spring Boot Extension Pack」は[2024年版](https://developer.mamezou-tech.com/blogs/2024/07/18/write-java-with-vscode-2024/)で解説されているので説明は割愛します。


## JDKの自動構成

この拡張のメインの機能です。この拡張は内部に複数のJDK（少なくとも 3 つの LTS バージョンと最新バージョン）を含んでいます。フォルダを開いたときにMavenプロジェクトなどが含まれている場合は、最適なJDKを使うように自動的に構成されます。またmavenやgradleも含まれているので、これらをインストールしなくても開発を始めることができます。

VS Codeからターミナルを起動するときも、各JDK環境に合わせたターミナルを立ち上げることができます。

![terminal](https://raw.githubusercontent.com/cypher256/java-extension-pack/main/image/terminal.png)

## Windows環境での日本語文字化け対策

Windows環境でJavaアプリを実行するとターミナルへのログの出力が文字化けすることがあるので、対策をします。

### JDK18以降を使っている場合

JDK18以降のデフォルトの文字コードはUTF-8です。一方でターミナルのデフォルトの文字コードはMS932のため文字化けが起こることがあります。
これを解消するには、ターミナルの文字コードを強制的にUTF-8にします。
レジストリエディタを立ち上げて
\HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Command Processor
を開きます。

ここに以下のような値を作成します。
- 値の名前：Autorun
- 値のデータ：chcp 65001 > nul

![regedit](/img/blogs/2025/1007_write-java-with-vscode-2025/regedit.png)

最後の部分は「null」ではなく「nul」であることに気を付けてください。

### JDK17以前を使う場合

上記の設定をしたままでJDK17以前を使うと、JDKの文字コードはMS932で、ターミナルはUTF-8なので文字化けが起こります。
そこで以下のような環境変数を設定してJDKの文字コードをUTF-8にします。

JAVA_TOOL_OPTIONS=-Dfile.encoding=UTF-8

![environment](/img/blogs/2025/1007_write-java-with-vscode-2025/environment.png)


## 追加の拡張

Extension Pack for Java Auto Configが追加するその他の拡張について見ていきます。

### [XML - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-xml)

XMLの入力支援をしてくれます。例えば、タグの上にマウスカーソルをホバーさせるとスキーマにかかれたドキュメンテーションを表示するなどの機能があります。
![maven_parent](/img/blogs/2025/1007_write-java-with-vscode-2025/maven_parent.png)

### [Code Spell Checker - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker)

コードやコメントのスペルチェックをしてくれます。
![spell_checker](/img/blogs/2025/1007_write-java-with-vscode-2025/spell_checker.png)


### [TODO Tree - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=Gruntfuggly.todo-tree)

ソースコード中のTODOやFIXMEを一覧表示してくれます。
![todo_tree](/img/blogs/2025/1007_write-java-with-vscode-2025/todo_tree.png)

### [Live Server - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)

HTMLやCSSなどの確認に便利な簡易サーバーです。
HTMLファイルを開いた状態で、画面右下の「Go Live」を押すと、ブラウザでHTMLを表示してくれます。
Live Reload機能によりHTMLを書き換えるとリロードなしでブラウザに修正が繁栄されます。
![live_server](/img/blogs/2025/1007_write-java-with-vscode-2025/live_server.png)


### [Trailing Spaces - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=shardulm94.trailing-spaces)

末尾空白のハイライト表示と削除をしてくれます。
![trailing_spaces](/img/blogs/2025/1007_write-java-with-vscode-2025/trailing_spaces.png)


### [indent-rainbow - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=oderwat.indent-rainbow)

インデントのハイライト表示をします。
![indent_colored](/img/blogs/2025/1007_write-java-with-vscode-2025/indent_colored.png)

### [Rainbow CSV - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=mechatroner.rainbow-csv)

CSVファイルのハイライト表示をします。
![csv_colored](/img/blogs/2025/1007_write-java-with-vscode-2025/csv_colored.png)






## さいごに

Extension Pack for Java Auto Configによって、これ1つインストールするだけで、Javaアプリ/SpringBootアプリの開発環境が整うのは便利になったと思います。
ElipseやIntelliJ IDEAなどの統合環境に比べると機能面で劣るところもあります。一方、VS Codeは無料で動作が軽く、しかもAI対応が統合環境よりも早いことを考えると、Java開発環境としてVS Codeを使うのもありだろうと思います。


