---
title: 「Universal Robots」のUR+でURCap開発
author: kazuki-ogawa
date: 2023-04-11
tags: [UR, Universal Robots, ロボット, URCaps, UR+]
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
URCapはURロボットのグラフィカルプログラミングインターフェースである「PolyScope」に統合され、URロボットのティーチペンダントからその製品の機能を制御できます。  

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
[URのシミュレータを起動する](#URのシミュレータを起動する)の通りにeシリーズのシミュレータを起動します。  

「Program」タブに移動すると左のリストに「URCaps」の項目が加わっており、「Hello World」のプログラムノードが利用可能となっています。  
「Hello World」のプログラムノードを選択するとプログラムツリーにコマンドを挿入できます。  
プログラムを実行すると「Hello World」のポップアップが表示されます。(プログラムを実行するにはPolyScope画面左下からロボットをパワーオンする必要があります。)  

![](/img/blogs/2023/0411_urcap-development09.png)

また、「Installation」タブに移動すると「URCaps」の項目が加わっており、「Hello World」のインストレーションノードが利用可能となっています。  
ここでは「Hello World」コマンドを実行した際のポップアップタイトルを変更できます。  

![](/img/blogs/2023/0411_urcap-development10.png)


## URCapの実装について
前章でURCapのサンプルを動作させるまでの手順を紹介しました。 
サンプルはGithubでも公開されています。([こちら](https://github.com/UniversalRobots/HelloWorldSwing/tree/master/com.ur.urcap.examples.helloworldswing/src/main/java/com/ur/urcap/examples/helloworldswing/impl))  

URの公式サイトではデジタルI/Oを制御するURCapをいちから作成する例が紹介されています。([こちら](https://www.universal-robots.com/articles/ur/urplus-resources/urcap-my-first-urcap/))  
今回紹介した「Hello World」のサンプルや公式サイトのURCap作成例はプログラムノードやインストレーションノードになります。  
[URCapの基本](https://www.universal-robots.com/articles/ur/urplus-resources/urcap-basics/)にある通り、他にもPolyScope画面右上のツールバーを追加したり、バックグラウンドで動くデーモンサービスを提供できます。  

URCapは[OSGi](https://www.osgi.org/)のフレームワークを利用して機能を拡張する仕組みを提供しており、実装の基本としては[アクティベータ](https://github.com/UniversalRobots/HelloWorldSwing/blob/master/com.ur.urcap.examples.helloworldswing/src/main/java/com/ur/urcap/examples/helloworldswing/impl/Activator.java)が複数のサービスをバンドルしてPolyScopeに機能群を提供します。  

![](/img/blogs/2023/0411_urcap-development11.png)

[サービス](https://github.com/UniversalRobots/HelloWorldSwing/blob/master/com.ur.urcap.examples.helloworldswing/src/main/java/com/ur/urcap/examples/helloworldswing/impl/HelloWorldInstallationNodeService.java)はビューとコントリビューションを持っています。(デーモンサービスはそれらを持たず、コントリビューションのコンストラクタに渡される->[例](https://github.com/UniversalRobots/MyDaemonSwing/blob/master/com.ur.urcap.examples.mydaemonswing/src/main/java/com/ur/urcap/examples/mydaemonswing/impl/Activator.java))  

![](/img/blogs/2023/0411_urcap-development12.png)

[ビュー](https://github.com/UniversalRobots/HelloWorldSwing/blob/master/com.ur.urcap.examples.helloworldswing/src/main/java/com/ur/urcap/examples/helloworldswing/impl/HelloWorldInstallationNodeView.java)はPolyScopeに表示されるUIの生成を担い、[コントリビューション](https://github.com/UniversalRobots/HelloWorldSwing/blob/master/com.ur.urcap.examples.helloworldswing/src/main/java/com/ur/urcap/examples/helloworldswing/impl/HelloWorldInstallationNodeContribution.java)は機能の制御を担います。  

今回は基本的な実装について紹介しました。  
APIは[こちら](https://plus.universal-robots.com/apidoc/40237/overview-summary.html)をご参照ください。  
紹介した内容は「com.ur.urcap.api.contribution」パッケージのAPIを用いた実装となっています。  

## まとめ
UR+のエコシステムは[こちら](https://www.universal-robots.com/blog/the-benefits-of-an-ecosystem/)にもある通り、URとURのパートナーがそれぞれの得意分野を活かした製品開発をできるビジネスモデルであり、これからもっと幅を広げていくのだろうと感じています。  

以上、お疲れ様でした。