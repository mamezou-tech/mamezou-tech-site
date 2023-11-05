---
title: 対戦型ロボットゲームで楽しくJavaプログラミング学習「Robocode」（その２：ゲームルール編）
author: shuichi-takatsu
date: 2023-11-06
tags: [robocode, java, プログラミング, 学習]
---

[前回](/blogs/2023/09/10/playing-robocode-01/)の「[Robocode](https://robocode.sourceforge.io/)」の紹介記事を書いてから約２ヶ月も間が空いてしまいました。申し訳ありません。  
今回は Robocode のゲーム内ルールやバトルフィールド（戦場）、 Bot（戦車）構造を解説していきたいと思います。  

## ゲームのルール

「Battle」－「Setup Rules」をクリックします。  
![](https://gyazo.com/bb59e588d4b5e0dc6556fdc62a7d405c.png)

ゲームのルールを確認します。（詳細は[こちら](https://robocode-dev.github.io/tank-royale/articles/gui.html#setup-rules)）    
![](https://gyazo.com/533be20de22315c95db8558bafad009e.png)  

詳細を説明していきます。  
- Game type: (デフォルト: classic)  
classic の他には「1v1」「melee」「custom」が存在します。  
  - 「1v1」は、1対1対戦モードです。敵が1台のみなので、その他の Bot を相手にしない分、攻撃と防御のアルゴリズムが簡単ですみます。  
  - 「melee」は、近接攻撃モードです。classicよりもバトルフィールドが大きめに設定されています。  
  - 「custom」はカスタム攻撃モードです。任意のゲームタイプを設定することができます。  

- Min. Number of Participants: (デフォルト: 2)  
バトルフィールドに投入できる最小の Bot の数です。デフォルトは「２」が設定されています。つまり少なくとも2台の Bot をバトルフィールドに配置しないとバトルを開始できません。  

- Max. Number of Participants: (デフォルト: 設定なし)  
バトルフィールドに投入できる最大の Bot の数です。デフォルトは設定されていません。    

- Number of Rounds: (デフォルト: 10)  
バトルが終了するまでのラウンド数です。デフォルトは「１０」が設定されています。  
バトルが開始されると、ここで設定したラウンドを戦って勝ち負けを競います。  
全ラウンドが終了すると全ラウンドを通した総合成績が表示されます。

- Gun Cooling Rate: (デフォルト: 0.1)
砲身の冷却速度です。 Bot が砲身から弾丸を発射すると砲身は熱を帯びます。  
その後、砲身はターン毎にここで設定した冷却値で冷却されます。   
（[ここ](https://robocode-dev.github.io/tank-royale/articles/gui.html#setup-rules)の説明では「ラウンドごとの熱量の減少」と書かれていますが、ラウンド毎では説明がつかないので、おそらくターン毎の減少量だと思います）  
弾丸の威力などの数値情報については、プログラムを作成していく過程で解説していきます。  

- Max. Inactivity Turns: (デフォルト: 450)   
バトル開始後に Bot が敵から攻撃を受けず、エネルギーが減少しない状態が許可されるターン数です。  
このターン数を経過すると、どの Bot もターン数に応じたエネルギーが減少していきます。攻撃をしない Bot や攻撃を受けないで逃げ続ける Bot が居た場合でも、ラウンドを終了させるための措置です。

- Ready timeout (μs): (デフォルト: 1000000)  
サーバが Bot から「Bot Ready」メッセージを受信するまでに、Bot に許可される最大マイクロ秒数です。
（詳細は割愛します）  

- Turn timeout (μs): (デフォルト: 30000)  
サーバが Bot から「Bot Intent」メッセージを受信するまでに、Bot に許可される最大マイクロ秒数です。それ以外の場合、Bot はターンをスキップします。  
（詳細は割愛します）  

- Arena Size Width: (デフォルト: 800)  
バトルフィールドの幅です。デフォルトは「８００」が設定されています。

- Arena Size Height: (デフォルト: 600)  
バトルフィールドの高さです。デフォルトは「６００」が設定されています。

## バトルフィールド座標系

バトルフィールドの座標系を確認します。（詳細は[ここ](https://robocode-dev.github.io/tank-royale/articles/coordinates-and-angles.html)を参照）  
左下が（０，０）であり、右上が（X座標の最大値，Y座標の最大値）になっています。    
![](https://gyazo.com/4749ff6632e723b4f18fdaa3bc7f4415.png)

次に方向（direction）を確認します。  
車体や砲塔、レーダーの向きを決める角度は、以下のようにX軸方向を0度として、反時計回りに角度が計算されます。([オリジナルバージョンのRobocodeの方向の考え方](https://robowiki.net/wiki/Robocode/Game_Physics#Coordinates_and_directions)とは異なっていますので注意が必要です)  
![](https://gyazo.com/67ae12c91a368f7afebd52ea1197cbce.png)

## Bot（戦車）の情報

Bot（戦車）は以下の構造をしています。
- 車体（Body）
- 砲塔（Gun）
- レーダー（Rader）  

![](https://gyazo.com/461dea8dcafedecf5a9f6d96acaae245.png)

車体のサイズは「幅：36、高さ：36」となっています。  
車体の中心は（18, 18）であり、敵の弾丸が着弾したかや壁にぶつかったかの判定も、弾丸や壁がこの半径18の円の内側にあるか、そうでないかで判定します。  
![](https://gyazo.com/176c20ed93730e90c8c3804b58a98b01.png)

車体は前進、後退、回転ができます。  
砲塔、レーダーは回転のみできます。  

デフォルトでは車体を回転させると、砲塔とレーダーも同期して回転します。  
また、砲塔を回転させるとレーダーも同期して回転します。  
（設定によって独立して回転させることが可能です）   

レーダーの照射距離（索敵距離）は 1200 です。（バトルフィールドのデフォルトサイズが (800, 600) の場合はフィールドのすべてをカバーできる距離です）  
レーダーで敵を発見するにはレーダーの走査線上に敵を映す必要があります。

## バトル中の Bot の情報を確認する

バトル中の Bot の情報は「プロパティ」で確認します。  
（バトル中にバトルフィールドの右に表示される各Botの名称をクリックします）  
![](https://gyazo.com/a4ee085e3d73e1db4e8547b7847323e9.png)

各 Bot の詳細ダイアログが表示されますので「Properties」タブを選択します。   
（例：X,Yデータから Bot の位置が確認できます）   
![](https://gyazo.com/54663bbfbf2344e4b029bffb844a0ac6.png)

## Bot の基本操作コマンド

Bot の基本操作コマンドを紹介します。

|操作種類|引数|コマンド|
|:----|:----|:----|
|車体前進|距離|forward()|
|車体後退|距離|back()|
|車体回転(右)|角度|turnRight()|
|車体回転(左)|角度|turnLeft()|
|砲塔回転(右)|角度|turnGunRight()|
|砲塔回転(左)|角度|turnGunLeft()|
|レーダー回転(右)|角度|turnRaderRight()|
|レーダー回転(左)|角度|turnRaderLeft()|
|砲撃|火力|fire()|

コマンド名だけで大体の動作はイメージできると思います。  
車体は前進、後退が可能です。  
車体、砲塔、レーダーは左右に回転が可能です。  

砲撃については、弾丸にエネルギー(火力)を設定しています。  
砲撃後に砲身が加熱されるので、次の砲撃を実行する前に少し時間を開けて砲身を冷却する必要があります。  
砲撃時のエネルギーが大きいほど加熱も激しいので、次の砲撃に移るまでに時間がかかります。  
ここでの詳細説明は割愛しますが、連続して何発も砲撃できるわけではないことを覚えておいてください。

## MyFirstBot ソースコード解説

前回記事でソースコードだけを紹介した「MyFirstBot」の中身を解説していきます。

「MyFirstBot」Javaソースコード
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

では、ソースコードの各部について説明します。  

```java
    public static void main(String[] args) {
        new MyFirstBot().start();
    }
```
JavaのMain関数部分です。  
「MyFirstBot」クラスを生成し、インスタンスの「start」メソッドを呼び出しています。  
これにより、MyFirstBot が起動されます。

```java
    MyFirstBot() {
        super(BotInfo.fromFile("MyFirstBot.json"));
    }
```
「MyFirstBot」のコンストラクタです。  
「MyFirstBot」フォルダ中に格納されている「MyFirstBot」のJSONファイルを読み込み、Bot の環境情報を取得します。  

```java
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
```
インターフェイス「IBot」の「run」メソッドの実装部分です。  
このメソッドは引数を取りません。  
Bot の実行中は、この「run」が呼び出され続けます。  
Bot の状態が「Running」（稼働中）であることを確認し、車体の前進と後退、砲塔の回転のコマンドを実行しています。  
初期設定では、車体と砲塔、砲塔とレーダーは同期しているので、砲塔が回転するとレーダーも回転します。  
つまり砲塔を回転させることで敵戦車をレーダーの走査線上に捉えることができます。  

```java
    @Override
    public void onScannedBot(ScannedBotEvent e) {
        fire(1);
    }
```
インターフェイス「IBaseBot」の「onScannedBot」イベントハンドラの実装部分です。  
このイベントハンドラは引数に「ScannedBotEvent」オブジェクトを取ります。  
このオブジェクトにはスキャン(走査)された敵戦車の情報が格納されています。  
ここでは敵戦車の情報を利用せず、エネルギー１の弾丸を発射しています。  
敵戦車の情報を使わなくても良い理由は、砲塔を回転させて敵戦車を走査しているので、敵戦車を捕捉できたということは砲身も敵戦車の方向を向いているという想定があります。  

```java
    @Override
    public void onHitByBullet(HitByBulletEvent e) {
        // Calculate the bearing to the direction of the bullet
        var bearing = calcBearing(e.getBullet().getDirection());

        // Turn 90 degrees to the bullet direction based on the bearing
        turnLeft(90 - bearing);
    }
```
インターフェイス「IBaseBot」の「onHitByBullet」イベントハンドラの実装部分です。
このイベントハンドラは引数に「HitByBulletEvent」オブジェクトを取ります。  
このオブジェクトには Bot(自機) に当たった弾丸の情報が格納されています。  
次のコード部分で、弾丸が飛んできた方向から自機の座標系の角度を計算します。  
```java
var bearing = calcBearing(e.getBullet().getDirection());
```
そして、次のコード部分で、敵戦車からの次の砲撃を最も受けにくい方向に自機を回転させています。（つまり砲撃された方向に対して90度の方向を向く）
```java
turnLeft(90 - bearing);
```

他にも多くのコマンドやイベントハンドラがありますが、詳細はまた別の機会に説明します。

## Bot 戦略の基本

敵に多くのダメージを与えることで、スコアを獲得し、スコアが一番多い戦車が勝者になります。  

敵戦車を倒して生き残るための基本戦略は以下のようになります。  

- 敵戦車よりも早く敵戦車を発見する。
- 敵戦車の移動方向・移動速度などを考慮して、もっとも着弾する可能性の高い方向に弾丸を発射し、弾丸を敵戦車に当てる。
- 敵戦車から発射された弾丸に当たらない。
- 敵戦車に衝突されない。
- 壁に衝突しない。

簡単に言うと、自機へのダメージを最小にしつつ、敵戦車へ与えるダメージを最大にすることです。  

敵戦車や壁に接触することでもダメージを受けます。  
ただし、自機が前進して敵戦車に”体当たり”した場合は、攻撃がヒットしたとして”体当たり”した側の Bot にスコアが加算されます。  

勝敗は敵に与えたダメージ量（スコア）で決まります。  
スコア計算の方法は少々ややこしいのでここでは詳細説明は割愛します。

１対１のバトルの場合にはレーダーで捕捉した敵戦車の方向だけに注意を払えばよいのですが、複数の乱打戦の場合は索敵や敵戦車への砲撃、回避行動が非常に難しくなります。  

攻撃を後回しにして”逃げ回る”戦略も考えられます。  
生き残り戦略も大事ですが、Robocode では「攻撃」することで多くのスコアを得ることができる仕様になっています。  
これは「全戦車が逃げ回る」だけのつまらないバトルにならないようにする配慮のようです。

サンプルで提供されているすべての Bot をバトルフィールドに展開してバトルを開始してみます。  

![](https://gyazo.com/902baca4ff61f6bd554265e6885317b5.png)

## まとめ

サンプル Bot をいくつか対戦させるだけでも、色々な戦略があることに気づきます。  
これらの戦略を参考にしつつ、あなただけのオリジナル戦車を作ってみてはいかがでしょうか。
