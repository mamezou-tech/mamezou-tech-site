---
title: 対戦型ロボットゲームで楽しくJavaプログラミング学習「Robocode」（その１：準備編）
author: shuichi-takatsu
date: 2023-09-10
tags: [robocode, java, プログラミング, 学習]
---

かなり昔、Javaのプログラミング教材として「[Robocode](https://robocode.sourceforge.io/)」というオープンソースソフトウェアが公開されました。（Wikipediaによると初版は2001年に公開されているとのこと。もう20年以上も前ですね）  
一時期はほとんど更新が止まっていたのですが、最近になって最新版が公開されていることを発見しました。  
つい懐かしくなってダウンロードして遊んでみました。

## Robocode とは

[Robocode](https://robocode.sourceforge.io/) は、対戦型のロボットシミュレーションゲームです。  
ロボット（戦車型ロボット）をプログラミングして、他の人が作ったロボットコードと対戦させることが可能です。  
ロボットを動作させるフレームワークが用意されているので、ロボットコードの作成に専念することができます。  
対戦で勝ち残るために色々と工夫してプログラミングしていくことで、楽しくプログラミングが学習できるようになっています。  
当初、プログラミング言語には Java が採用されていましたが、最新版では .NET（C#など）もサポートされていて、[JavaScriptで作る](https://qiita.com/abemaki29/items/84e3ac3d797ea5a6b263)こともできるようです。

今回は Java版を使用していきます。  
また、既存のプラットフォームではなく、[現在開発中である新しいプラットフォーム](https://github.com/robocode-dev/tank-royale)を導入して、Robocode の世界に触れてみたいと思います。

## 事前準備（JDK）

Robocode の実行にはJDK（バージョン11以降）が必要です。  
各自の環境に合わせてJDKをインストールしておいてください。  
（私は OpenJDK 11 をインストールしました）

Java のバージョン確認方法
```shell
java -version
```

## 環境セットアップ

[robocode-de/tank-royal](https://github.com/robocode-dev/tank-royale) から、開発中の最新版パッケージをダウンロードします。  
2023/09/09時点での最新版は [0.20.0](https://github.com/robocode-dev/tank-royale/releases/tag/v0.20.0) です。

[公式ドキュメント](https://robocode-dev.github.io/tank-royale/articles/installation.html)を参照して環境をインストールしていきます。  

まず Robocode のGUIアプリケーションをダウンロードします。  
GUIアプリケーションは[最新版リリースサイト](https://github.com/robocode-dev/tank-royale/releases/latest)にある Assets セクションの「GUI Application (jar)」をダウンロードします。  
ダウンロードした JARファイルを適当なフォルダの下に格納します。  
私は Windows のドキュメントフォルダの下に「bots」フォルダを作成して、その下に JARファイルを格納しました。

```shell
C:\Users\＜ユーザ名＞\Documents\bots\robocode-tankroyale-gui-0.20.0.jar
```

次にサウンドファイルをダウンロードします。  
このサウンドファイルのインストールはオプションですので、ゲームの効果音が不要な場合、セットアップしなくて大丈夫です。  

サウンドファイルは[Robocode音源のリリースサイト](https://github.com/robocode-dev/sounds/releases/latest)にある Assets セクションの「sounds.zip」をダウンロードします。  
2023-09-09時点での最新版は [1.0.0](https://github.com/robocode-dev/sounds/releases/tag/v1.0.0) です。 

ダウンロードした Zipファイルを解凍して取得した「sound」フォルダを、先ほど作成した「bots」フォルダの下に置きます。  
（soundフォルダの下にはいくつかの wavファイルが格納されています）  
```shell
C:\Users\＜ユーザ名＞\Documents\bots\sounds
```

ここまで出来たら、ロボットの実行環境を起動させてみます。  
コマンドプロンプトにて、ディレクトリを「C:\Users\＜ユーザ名＞\Documents\bots」に移動し、次のコマンドを実行します。  
```shell
java -jar robocode-tankroyale-gui-0.20.0.jar
```

以下のようなGUIアプリケーションが起動すれば、インストールは成功です。  
![](https://gyazo.com/c959c8652c3d28af1a4abb671605b86e.png)

環境設定にてロボットのソースコードを配置するルートフォルダを設定します。  
GUIアプリケーションの「Config」-「Bot Root Directories」を選択します。  
![](https://gyazo.com/2f396481a46f3e7192e6d8223248d8ce.png)

Bot Root Directories Config ダイアログが表示されるので、「Add」ボタンからルートフォルダを設定します。  
（ルートフォルダは「C:\Users\＜ユーザ名＞\Documents\bots」とします）  
![](https://gyazo.com/52b01966a04ea333d5c9c45124cfe220.png)

「OK」ボタンを押してダイアログを閉じます。  

GUIアプリケーションを終了する場合は、右上の「✕」ボタンを押して終了させます。

## サンプルBotの実行

サンプルBot は[最新版リリースサイト](https://github.com/robocode-dev/tank-royale/releases/latest)にある Assets のセクションから「Sample bots for Java (zip)」をダウンロードします。

ダウンロードした Zipファイルを解凍し「bots」フォルダの下に置きます。  
「bots」フォルダの下は以下のようになっているはずです。  
![](https://gyazo.com/d67cafaf40c1a79e06020be49b4b7766.png)

以下のコマンドを実行し、GUIアプリケーションを起動します。

```shell
java -jar robocode-tankroyale-gui-0.20.0.jar
```

GUIアプリケーションが起動したら「Battle」-「Start Battle」を選択します。  
![](https://gyazo.com/4d42a880009f0d3931466652c104a697.png)

Select Bots for Battle ダイアログが表示されます。  
Bot Directories（local only）にサンプルBotたちが表示されれば、正しくサンプルBotのセットアップが出来ています。  
![](https://gyazo.com/83fcc3a087ffad18cee4207a6278937f.png)

サンプルBotの中の「MyFirstBot」と「MyFirstDroid」を選択し、「Boot」ボタンを押して、選択したBotを「Booted Bots（local only）」に入れます。  
すると、BootしたBotが「Joind Bots（local/remote）」に表示されます。  
![](https://gyazo.com/4efafcfeadae88d69b57b9a4c7a1349f.png)

「Joind Bots（local/remote）」に表示されているBotを選択し、「Add」ボタンを押して、選択したBotを「Selected Bots（battle participants）」（バトルに参加）にセットします。  

バトルに参加するBotが決まると、ダイアログの一番下にある「Start Battle」ボタンが有効になるので「Start Battle」ボタンを押してバトルに参加します。  
![](https://gyazo.com/1b50311b9c09063c03de78cc15c3af8c.png)

フィールドに戦車型ロボットが２台表示されます。  
一台は棒立ちしていて（MyFirstDroid）、もう一台が敵戦車をスキャンしながら、砲塔から弾を発射して敵戦車を攻撃します（MyFirstBot）。  
何度か攻撃して敵戦車が破壊されると、Roundが更新されて次のバトルが始まります。  
![](https://gyazo.com/2d0ffecfac085afd061c33099f7ae0b9.png)

バトルを一時停止する場合は「Pause」ボタンを、終了する場合は「Stop」ボタンを押します。

意外と効果音の音量が大きいので、効果音を止めたい場合は「Config」-「Sound Options」から効果音をOFFにすることが出来ます。

## サンプルソースコード「MyFirstBot」を覗いてみる

サンプルソースコードにある「MyFirstBot.java」ファイルを覗いてみます。  
ソースコードは「MyFirstBot」フォルダの下にあります。  

```java
import dev.robocode.tankroyale.botapi.*;
import dev.robocode.tankroyale.botapi.events.*;

// ------------------------------------------------------------------
// MyFirstBot
// ------------------------------------------------------------------
// A sample bot original made for Robocode by Mathew Nelson.
// Ported to Robocode Tank Royale by Flemming N. Larsen.
//
// Probably the first bot you will learn about.
// Moves in a seesaw motion, and spins the gun around at each end.
// ------------------------------------------------------------------
public class MyFirstBot extends Bot {

    // The main method starts our bot
    public static void main(String[] args) {
        new MyFirstBot().start();
    }

    // Constructor, which loads the bot config file
    MyFirstBot() {
        super(BotInfo.fromFile("MyFirstBot.json"));
    }

    // Called when a new round is started -> initialize and do some movement
    @Override
    public void run() {
        // Repeat while the bot is running
        while (isRunning()) {
            forward(100);
            turnGunRight(360);
            back(100);
            turnGunRight(360);
        }
    }

    // We saw another bot -> fire!
    @Override
    public void onScannedBot(ScannedBotEvent e) {
        fire(1);
    }

    // We were hit by a bullet -> turn perpendicular to the bullet
    @Override
    public void onHitByBullet(HitByBulletEvent e) {
        // Calculate the bearing to the direction of the bullet
        var bearing = calcBearing(e.getBullet().getDirection());

        // Turn 90 degrees to the bullet direction based on the bearing
        turnLeft(90 - bearing);
    }
}
```

MyFirstBotは「Bot」クラスを継承して作成されています。  
![](https://gyazo.com/c0878a7aad24317155a7a5934ba748e1.png)

いくつかのメソッドがオーバーライドされています。  
このあたりのメソッドに独自のコードを追加してロボットをアップデートしていくことになるようです。

## まとめ

強い戦車型ロボットを作って、世界中の人と対戦できるのはとても楽しそうですね。
次回以降、Robocode の世界をさらに探検してみようと思います。
