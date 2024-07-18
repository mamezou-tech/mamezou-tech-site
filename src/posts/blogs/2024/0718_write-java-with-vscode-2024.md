---
title: VS Code で Java 開発環境を整える - 2024年版
author: masahiro-kondo
date: 2024-07-18
tags: [vscode, java]
image: true
---

## はじめに
Java デベロッパーの皆さんは IntelliJ IDEA や Eclipse を使ってる方が多いのではないでしょうか。筆者は VS Code を使っています。業務では長らく Java から離れていたのですが、ここ数年はけっこう書いています。かつては IntelliJ IDEA に課金してましたが Java 再開を機に VS Code の環境を整えました。この記事では、定番の拡張やワークスペースの使い方についてご紹介したいと思います。

## Microsoft Extension Pack for Java の利用
結論から言うと 「Microsoft の Extension Pack for Java を入れましょう。」で終わりです。

[Extension Pack for Java - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-java-pack)

Extension Pack はその名の通り複数の拡張の集合体で、現状は6つの拡張がインストールされます。少しこの中身を見ていきましょう。

1つ目は Java 言語サポート拡張です。この拡張だけ RedHat 提供です。コードハイライト、コード補完、コンパイルエラー表示、メソッドなどでの JavaDoc ホバー表示など Language Server Protocol を利用して Java IDE としてのコア機能を提供しています。

[Language Support for Java(TM) by Red Hat - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=redhat.java)

2つ目は Microsoft 提供のデバッガー拡張です。VS Code 上でブレークポイントを設定してデバッグが可能です。筆者はあまりデバッガー使わないので利用してません[^1]。

[^1]: というか設定を確認したら無効化してました。

[Debugger for Java - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-java-debug)

3つ目は Microsoft 提供の自動テスト用拡張。JUnit4 / JUnit5 / TestNG をサポートしています。テストの実行・デバッグ実行、結果の表示ができます。

[Test Runner for Java - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-java-test)

4つ目は Microsoft 提供の Maven 用拡張。Java 標準のビルドツールはやはり Maven。ということで、Extension Pack にも含まれています。

[Maven for Java - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-maven)

5つ目は Microsoft 提供の Project Manager 拡張。RedHat の Launguage Support と連動して、VS Code の Java Project のビューを提供します。

[Project Manager for Java - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-java-dependency)

Java Project ビューはエクスプローラーと似ていますが、Project Manager が提供する UI です。

![Java Project View](https://i.gyazo.com/ee405baf231296d59b4830351fd3f6b8.png)

このビューに Project が認識されていれば、エディタ上でコード補完や JavaDoc ホバー表示などが有効になります。

6つ目は、Microsoft 提供の IntelliCode 拡張。AI アシスト用の拡張で Java 以外に TypeScript、JavaScript、Python がサポートされています。Copilot 用の拡張ではないようです[^2]。

[^2]: この拡張がどのように機能しているのかは筆者は把握していません。

[IntelliCode - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=VisualStudioExptTeam.vscodeintellicode)

以上が Extension Pack の内容でした。Maven を使っている場合はこれで必要十分な環境が整います。

## その他の拡張

筆者は Gradle を使っているので、Extension Pack for Java に加え Gradle 拡張を入れています。

[Gradle for Java - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-gradle)

この他、Spring Boot、MicroProfile、Quarkus などメジャーなフレームワークをサポートする拡張もあります。

[Spring Boot Extension Pack - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=vmware.vscode-boot-dev-pack)

[Extension Pack for MicroProfile - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=MicroProfile-Community.vscode-microprofile-pack)

[Quarkus - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-quarkus)

アプリケーションサーバを使う場合は Tomcat や Jetty 用拡張もあります。WAR パッケージの操作が可能です。

[Tomcat for Java - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=adashen.vscode-tomcat)

[Jetty for Java - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=SummerSun.vscode-jetty)

## VS Code ワークスペースの利用
開発対象の Java プロジェクトが単独の場合はそのままプロジェクトフォルダーを開けばいいのですが、昨今はマイクロサービス化などで複数の Java プロジェクトを扱うことが多いと思います。プロジェクト毎にリポジトリが分かれているマルチレポ構成の場合、git clone した複数のリポジトリのディレクトリを VS Code の1つのワークスペースに纏めます。

:::info
複数の Java プロジェクトを1つのリポジトリで管理しているモノレポの場合、プロジェクトルートフォルダを読み込む方式だと、一部のプロジェクトが Java プロジェクトとして認識されなかったりする問題があります。したがってモノレポの場合でもワークスペースを作るのがおすすめです。
:::

ワークスペースの情報は拡張子 `code-workspace` のファイルに格納されます。`folders` の配列に各プロジェクトのパスが格納されます。

```json:my-project.code-workspace
{
	"folders": [
		{
			"path": "/path/to/app1-service"
		},
		{
			"path": "/path/to/app2-service"
		},
		{
			"path": "/path/to/app3-service"
		}
	],
	"settings": {
		"workbench.colorTheme": "Tomorrow Night Blue"
	}
}
```

VS Code の設定は、ユーザー単位(グローバル) / ワークスペース単位 / フォルダー単位という3つのスコープがあります。ワークスペースのタブで設定を追加するとワークスペースファイルに設定が追加されます[^3]。上記のワークスペースファイル (my-project.code-workspace) の例では VS Code のテーマをユーザー単位とは変えています。

[^3]: フォルダー単位の場合は、ルートに `.vscode/settings.json` が作られます。

![Workspace settings](https://i.gyazo.com/6d2bae58a5d7698a38121154be5e7eed.png)

拡張もワークスペース単位で有効化・無効化できるので、使用しない他の言語用拡張などを読み込まないようにすることでメモリの節約が可能です。

![Disable extentions](https://i.gyazo.com/f8c00abe06ee107b61de27a7e2c61b1b.png)

ワークスペースを新しく作るには、VS Code でファイルやフォルダを開いていない状態でファイルメニューから「名前を付けてワークスペースを保存」をクリックします。

![New Workspace](https://i.gyazo.com/4712484cc0cd303b0b608d804b29a691.png)

保存したいフォルダーを指定して保存すれば、ワークスペースファイルを保存して読み込んだ状態になります。

![Save Workspace](https://i.gyazo.com/be34cdc3515be91556d010b1d1a8a704.png)

Java プロジェクトをワークスペースに追加するには、ファイルメニューやエクスプローラーのコンテキストメニューから「フォルダーをワークスペースに追加」をクリックして、Java プロジェクトのフォルダを指定します。

![Add folder to workspace](https://i.gyazo.com/bfce1c02b2b74195a4cb9f5393ba44a3.png)

:::column:ワークスペースファイルの管理
筆者はワークスペースファイルはリポジトリでの管理には適さないと考えます。同じチームでも人によって使用するプロジェクトや設定の好みが異なることが多いはずです。基本的に個人のローカル環境で管理するのがよいでしょう。
:::

## Spring Boot 拡張
Spring Boot のアプリはよく作っているのですが、この記事を書き始めるまで Spring Boot 拡張の存在を知りませんでした。

Spring 公式では、Spring Tools 4 for Visual Studio Code として紹介されています。

[https://spring.io/tools](https://spring.io/tools)

実際には Spring Boot Extension Pack という名前の拡張の集合であり、3つの拡張が含まれます。

[Spring Boot Extension Pack - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=vmware.vscode-boot-dev-pack)

1つ目は Spring Boot Tools です。

[Spring Boot Tools - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=vmware.vscode-spring-boot)

- REST API のマッピング定義などソースコード上の Spring 特有のシンボルにジャンプ
- マッピング定義に対応する実行中アプリを選択
- `@GetMapping` などのテンプレートやコード補完強化
- ソースコードの `@Active` アノテーションに実行中アプリのアクティブなプロファイルをホバー表示

などなど、沢山のアプリを実行しながらコードを書く人には便利そうな機能が万歳です。

2つ目は、プロジェクト作成用の拡張です。

[Spring Initializr Java Support - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-spring-initializr)

筆者は Spring Boot プロジェクトを作成するときは昔から [Spring Initializr](https://start.spring.io) のサイトに行ってポチポチ入力しダウンロードしています。この拡張を使えば VS Code のコマンドパレット上で Spring Boot プロジェクトが作れます。

![Create Boot Project](https://i.gyazo.com/476648992ef056384735b13ae1a86d4d.png)

出来上がったプロジェクトをワークスペースに追加するかどうかを聞いてくれたりもします。

![Add to workspace](https://i.gyazo.com/d7ce5e687c149f35c4416a9dd9532820.png)

3つ目はダッシュボード拡張です。

[Spring Boot Dashboard - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-spring-boot-dashboard)

以下のような機能があります。

- 実行中のアプリを表示
- アプリの起動と終了
- アプリのデバッグ
- Bean や Endpoint の一覧表示
- Bean の依存関係可視化

IntelliJ IDEA Ultimate のような機能性で至れり尽くせりといった感じです。まあ、個人的には、Spring Boot アプリをそこまでガシガシ書かないのでなくても大丈夫という印象でした。お好みでといったところでしょうか。

## さいごに
ここにあげたもの以外ではやはり GitHub Copilot ですね。お客さんの環境では使用できないですが、個人環境ではとても重宝しています。Java のコードもサクサクと生成してくれます。
