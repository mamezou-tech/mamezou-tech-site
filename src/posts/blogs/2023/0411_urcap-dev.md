---
title: 「Universal Robots」のUR+でURCap開発
author: kazuki-ogawa
date: 2023-04-11
---

こんにちは。[小川](https://developer.mamezou-tech.com/authors/kazuki-ogawa/)です。  
今回は[Universal Robots](https://www.universal-robots.com/)社が提供する[Universal Robots+(UR+)](https://www.universal-robots.com/ja/plus/)の紹介と[URCap](https://www.universal-robots.com/articles/ur/urplus-resources/urcap-basics/)の開発についてご紹介します。

## Universal Robotsについて
Universal Robots(ユニバーサルロボット)はデンマークに拠点を置く、協働ロボットのメーカーです。
設立は2005年で協働ロボット市場では名の知れた企業です。  
ChatGPTに聞いてみましたが一番に挙げられていました。(ちょっと日本語おかしくなっていますが。)

![](/img/blogs/2023/0411_urcap-development00.png)
  
協働ロボットは従来の産業用ロボットのように安全柵を設けることなく人と協働して作業ができます。
そのため、大きな工場を持たない中小企業でも導入のハードルが低く、幅広い分野での活躍が期待できます。  
  
## UR+とは
UR+はURロボットと組み合わせて使える周辺機器の製品群及びその開発プラットフォームを指します。  
UR社から提供されるSDKで開発し、認証を受けるとUR+製品として販売できます。(UR+製品一覧は[こちら](https://www.universal-robots.com/plus/products/))  
  
![](/img/blogs/2023/0411_urcap-development01.png)

## URCapとは

UR+の製品はURCapと呼ばれるJavaベースのプラグインによって実現されます。  
URCapはURロボットのグラフィカルプログラミングインターフェースである「PolyScope」に統合され、URロボットのティーチングペンダント[^1]からその製品の機能を制御できます。  

URCapの開発においては[ユーザーフォーラム](https://forum.universal-robots.com/)が用意されており、質問するとURのオペレータや有志のデベロッパーから回答が返ってきます。  
※ユーザーフォーラムを利用するにはUR+への登録が必要です。

:::info
UR+への登録方法
[UR+のサイト](https://www.universal-robots.com/ja/plus/)にアクセスし、"デベロッパーチームに参加"ボタンから登録します。  
![](/img/blogs/2023/0411_urcap-development02.png)
:::

## URCapの開発
URCapはUbuntu上で開発します。  
今回はWindows環境(ホストPC)からUbuntuの仮想マシンを立ち上げてURCapのサンプルを動作させるまでの手順を紹介します。  

### 動作環境 
PolyScopeではロボットの3Dを描画するため、実際の開発ではWindowsが遅くならない程度にできるだけ仮想マシン側にメモリを割り当てると良いです。   
よって、推奨環境ではありませんのでご留意ください。 
- Windows 10(4コア,16GBメモリ)
  - Virtual Box 7.0.6
- Ubuntu 16.04(2コア,8GBメモリ割当)
  - URCap SDK 1.13.0
  - URSim 5.11.0
  - URSim 3.15.0
  - openjdk 1.8.0_242
  - Maven 3.3.9
  - Eclipse IDE for Java Developers 2020-03(4.15.0)

### Virtual Boxのダウンロード
仮想マシンを作成するためのソフトウェアをダウンロードします。  
今回はVirtual Box(Ver7.0.6 ※2023/04時点で最新)をダウンロードします。

### スターターパッケージのダウンロード
[URのダウンロードセンター](https://www.universal-robots.com/articles/ur/urplus-resources/urcap-download-center/)から「URCAP STARTER PACKAGE」(Version1.13.0 ※2023/04時点で最新)をダウンロードします。  

![](/img/blogs/2023/0411_urcap-development03.png)

スターターパッケージにはURCapのSDKを含め、EclipseやMavenなど必要なソフトがプリインストールされているためすぐに開発をスタートできます。  
よって、[動作環境](#動作環境)で示したソフトウェアはインストール不要です。  

ova形式のファイルでサイズは約10GBになります。

![](/img/blogs/2023/0411_urcap-development04.png)

### OVAのインポート
ダウンロードしたスターターパッケージをVirtual Boxにインポートします。  
詳細は割愛します。  

### URのシミュレータを起動する
Virtual Boxからスターターパッケージを起動させるとURロボットが壁紙のデスクトップが起動します。  
![](/img/blogs/2023/0411_urcap-development05.png)

URロボットのシミュレータを起動するには下記いずれかのディレクトリ内にある「start-ursim.sh」を実行します。  
- /home/ur/ursim/ursim-3.15.0.106151
  - CBシリーズのシミュレータが起動
- /home/ur/ursim/ursim-5.11.0.108249
  - eシリーズのシミュレータが起動

起動するとPolyScopeの画面が表示されます。(画像はeシリーズ起動時のもの。)  

![](/img/blogs/2023/0411_urcap-development06.png)


### URCapサンプルのデプロイ
前述した通りURCapはプラグインとしてPolyScopeに統合されます。  
URCapのSDKにサンプルが含まれていますので、実際にデプロイしてみます。  

下記ファイルを開き、赤線の内容(eシリーズのシミュレータがあるディレクトリ)を追記します。
   - /home/ur/sdk/sdk-1.13.0/samples/html/com.ur.urcap.examples.helloworld/pom.xml
![](/img/blogs/2023/0411_urcap-development07.png)
  
上記の「pom.xml」があるディレクトリにて、下記コマンドを実行し、サンプルのビルドとシミュレータへのデプロイを行います。  
- mvn install -P ursim
  - 「pom.xml」内に"ursim"のProfileが宣言されており、シミュレータにURCapがデプロイされます。

![](/img/blogs/2023/0411_urcap-development08.png)

### デプロイされたURCapの確認
[URのシミュレータを起動する](#urのシミュレータを起動する)の通りにeシリーズのシミュレータを起動します。  

「Program」タブに移動すると左のリストに「URCaps」の項目が加わっており、「Hello World」のプログラムノードが利用可能となっています。  
「Hello World」のプログラムノードを選択するとプログラムツリーにコマンドを挿入できます。  
プログラムを実行すると「Hello World」のポップアップが表示されます。(プログラムを実行するにはPolyScope画面左下からロボットをパワーオンする必要があります。)  

![](/img/blogs/2023/0411_urcap-development09.png)

また、「Installation」タブに移動すると「URCaps」の項目が加わっており、「Hello World」のインストレーションノードが利用可能となっています。  
ここでは「Hello World」コマンドを実行した際のポップアップタイトルを変更できます。  

![](/img/blogs/2023/0411_urcap-development10.png)


## URCapの実装について
前章でURCapのサンプルを動作させるまでの手順を紹介しました。 
サンプルはGitHubでも公開されています。([こちら](https://github.com/UniversalRobots/HelloWorldSwing/tree/master/com.ur.urcap.examples.helloworldswing/src/main/java/com/ur/urcap/examples/helloworldswing/impl))  

今回紹介した「Hello World」サンプルのプログラムノードやインストレーションノードはサービスと呼ばれます。  
これらのサービスはPolyScope起動時にアクティベータによって登録され、ユーザーに機能を提供します。[^2]  
![](/img/blogs/2023/0411_urcap-development11.png)

「Hello World」のサンプルを例に、各サービスのインターフェースと実装について簡単に説明します。  

### プログラムノード
プログラムノードは[SwingProgramNodeService](https://plus.universal-robots.com/apidoc/40237/index.html?com/ur/urcap/api/contribution/program/swing/SwingProgramNodeService.html)を実装することでサービスを提供可能にします。  
[SwingProgramNodeView](https://plus.universal-robots.com/apidoc/40237/com/ur/urcap/api/contribution/program/swing/swingprogramnodeview.html)はプログラムノードのUIを提供します。  
[ProgramNodeContribution](https://plus.universal-robots.com/apidoc/40237/com/ur/urcap/api/contribution/programnodecontribution.html)はプログラムノードのロジックを提供し、ユーザーが新しいプログラムノードを挿入するたびに新しいインスタンスを返します。[^2]  
![](/img/blogs/2023/0411_urcap-development12.png)  

「Hello World」サンプルのプログラムノードでは以下のような実装がされています。  
- [HelloWorldProgramNodeService](https://github.com/UniversalRobots/HelloWorldSwing/blob/master/com.ur.urcap.examples.helloworldswing/src/main/java/com/ur/urcap/examples/helloworldswing/impl/HelloWorldProgramNodeService.java)
  - getId()
    - プログラムノードの種別を識別するためのIDを返しています。
  - configureContribution()
    - このプログラムノードが子ノードを持つことができるかなど、ノードの構成を設定しています。
  - getTitle()
    - プログラムノードの名前をシステムの言語に合わせて返しています。
  - createView()
    - このプログラムノードが初めて使用されるときに一度だけHelloWorldProgramNodeViewのインスタンスを作成して返しています。
  - createNode()
    - プログラムノードをプログラムツリーに挿入するたび、HelloWorldProgramNodeContributionのインスタンスを作成して返しています。
- [HelloWorldProgramNodeView](https://github.com/UniversalRobots/HelloWorldSwing/blob/master/com.ur.urcap.examples.helloworldswing/src/main/java/com/ur/urcap/examples/helloworldswing/impl/HelloWorldProgramNodeView.java)
  - buildUI()
    - プログラムノードのUIを生成しています。
- [HelloWorldProgramNodeContribution](https://github.com/UniversalRobots/HelloWorldSwing/blob/6987d3563ce474feae32356c7cca60edd7729e57/com.ur.urcap.examples.helloworldswing/src/main/java/com/ur/urcap/examples/helloworldswing/impl/HelloWorldProgramNodeContribution.java)
  - openView()
    - プログラムノードが選択された際に呼ばれ、プレビューの内容を更新しています。(この際にインストレーションノードの内容を参照しています。)
  - closeView()
    - プログラムノードのUIから離れる際に呼ばれます。
  - isDefined()
    - プログラムノードが実行可能かどうかを返しています。
      - falseを返す場合はプログラムツリーのアイコンが黄色く表示され、プログラムの実行はできません。
  - getTitle()
    - プログラムツリーに表示されるプログラムノードの名前を返しています。
  - genarateScript()
    - プログラム実行時の命令を[URScript](https://s3-eu-west-1.amazonaws.com/ur-support-site/32554/scriptManual-3.5.4.pdf)[^3]で記述しています。サンプルでは入力内容に応じたポップアップを表示しています。

![](/img/blogs/2023/0411_urcap-development13.png)  


### インストレーションノード
インストレーションノードは[SwingInstallationNodeService](https://plus.universal-robots.com/apidoc/40237/com/ur/urcap/api/contribution/installation/swing/swinginstallationnodeservice.html)を実装することでサービスを提供可能にします。  
[SwingInstallationNodeView](https://plus.universal-robots.com/apidoc/40237/com/ur/urcap/api/contribution/installation/swing/SwingInstallationNodeView.html)はインストレーションノードのUIを提供し、[InstallationNodeContribution](https://plus.universal-robots.com/apidoc/40237/com/ur/urcap/api/contribution/installationnodecontribution.html)はインストレーションノードのロジックを提供します。[^2]  
![](/img/blogs/2023/0411_urcap-development14.png)  

「Hello World」サンプルのインストレーションノードでは以下のような実装がされています。  
- [HelloWorldInstallationNodeService](https://github.com/UniversalRobots/HelloWorldSwing/blob/master/com.ur.urcap.examples.helloworldswing/src/main/java/com/ur/urcap/examples/helloworldswing/impl/HelloWorldInstallationNodeService.java)
  - getTitle()
    - インストレーションノードの名前を返しています。
  - configureContribution()
    - インストレーションノードの構成を設定します。
  - createView()
    - サービス登録後に一度だけHelloWorldInstallationNodeViewのインスタンスを作成して返しています。
  - createInstallationNode()
    - サービス登録後に一度だけHelloWorldInstallationNodeContributionのインスタンスを作成して返しています。
- [HelloWorldInstallationNodeView](https://github.com/UniversalRobots/HelloWorldSwing/blob/master/com.ur.urcap.examples.helloworldswing/src/main/java/com/ur/urcap/examples/helloworldswing/impl/HelloWorldInstallationNodeView.java)
  - buildUI()
    - インストレーションノードのUIを生成しています。
- [HelloWorldInstallationNodeContribution](https://github.com/UniversalRobots/HelloWorldSwing/blob/6987d3563ce474feae32356c7cca60edd7729e57/com.ur.urcap.examples.helloworldswing/src/main/java/com/ur/urcap/examples/helloworldswing/impl/HelloWorldInstallationNodeContribution.java)
  - openView()
    - インストレーションノードが選択された際に呼ばれ、ポップアップのタイトルを設定しています。
  - closeView()
    - インストレーションノードのUIから離れる際に呼ばれます。
  - genarateScript()
    - プログラム開始時または保存時に呼ばれ、[URScript](https://s3-eu-west-1.amazonaws.com/ur-support-site/32554/scriptManual-3.5.4.pdf)[^3]で記述した命令を実行します。サンプルでは入力内容に応じたポップアップのタイトルをグローバル変数に保存してプログラムノードから参照できるようにしています。

![](/img/blogs/2023/0411_urcap-development15.png)  

## まとめ
今回はURCapの実装までをざっくりと紹介しました。  
URの公式サイトではデジタルI/Oを制御するURCapをステップバイステップで作成する例が紹介されていますのでご参照ください。([こちら](https://www.universal-robots.com/articles/ur/urplus-resources/urcap-my-first-urcap/))  
また、URCapの基本について記事では触れられていない部分もありますので、URの公式サイトをご参照ください。([こちら](https://www.universal-robots.com/articles/ur/urplus-resources/urcap-basics/))  

このURCapの開発を通したUR+のエコシステムは[こちら](https://www.universal-robots.com/blog/the-benefits-of-an-ecosystem/)にもある通り、URとそのパートナーが得意分野を活かした製品開発をできるビジネスモデルであり、これからもっと幅を広げていくことでしょう。  

以上、お疲れ様でした。

[^1]:ロボットの位置姿勢や動き方を教示するための外部装置のことで、ティーチペンダントまたは教示ペンダントとも呼ぶ。
[^2]:[URCAP - PRINCIPLE OF URCAPS IN POLYSCOPE](https://www.universal-robots.com/articles/ur/urplus-resources/urcap-principle-of-urcaps-in-polyscope/)より画像を参照。
[^3]:URロボットを制御するUR独自のスクリプト言語。