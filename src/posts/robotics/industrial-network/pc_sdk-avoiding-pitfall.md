---
title: 🤖ABBロボットコントローラにPC-SDKで連携するときの落とし穴10選🕳️
author: shuji-morimoto
tags: [ロボット, PC-SDK, ABB]
date: 2026-03-26
image: true
---

2025年10月8日、ロボット産業を揺るがす大きなニュースが飛び込んできました。
ソフトバンクグループがスイスの重電大手 ABB[^a] から、ロボティクス部門を買収する記事でした。

ちょうどそのころ私はABBのロボットコントローラと連携するプログラムの開発で日夜格闘していました。
ロボット制御APIである PC-SDK[^b] を使った連携を試みましたが、何度も落とし穴に落ちました。
まさに「死にゲー」をプレイしている感じです。何度も失敗を繰り返しながら、APIの動作を確認し、使い方を覚え、最適な手順を考えて１つ１つ問題やタスクを解決していきました。

この体験は今となってはPC-SDK攻略のための私のノウハウになっています。そこで印象に残った落とし穴を10個ピックアップしました。どのような落とし穴があるのか、どのようにして回避したのかを備忘録も兼ねて公開したいと思います。

:::info:ロボット開発の前提知識
オフラインティーチングやロボット制御APIとは何かを知りたい場合は「[産業用ロボットの教示方法とその応用](https://developer.mamezou-tech.com/blogs/2025/09/09/robot-teaching-and-applications/)」をご覧ください。
:::


# PC-SDKとは
ここで紹介するPC-SDKとは、PCからABBのロボットコントローラ/ロボットを制御・監視するための開発キット(ライブラリ)を指します。
.NET Frameworkを使用して、Windows PC上で動作するカスタムアプリケーションを作成できます。.NET Framework依存かつ後述する通信ドライバがWindows専用のためLinuxには対応していないようです。

**主な機能**
- コントローラ状態アクセス: ロボットコントローラの実行状態、ロボットの姿勢取得、I/O信号の読み書き
- プログラム操作: プログラムのロード、開始、停止
- データアクセス: ロボットプログラムの変数の読み書き
- ファイル転送: PCとロボットコントローラ間でのファイル送受信処理


:::info:シミュレータ環境での利用
開発時に使用するツールとしては PC-SDK の他に RobotStudio[^d] があります。RobotStudioは仮想ロボットコントローラを内包し、GUIアプリケーションでオフラインティーチングが行えるアプリケーションです。PC-SDKは、この仮想ロボットコントローラに対しても接続できるためRobotStudioがあれば実機が無くてもPC-SDKによる開発ができます。
:::


# 落とし穴 ティア表
PC-SDK利用時に遭遇する落とし穴をダメージレベルごとにランク付けしました。これをベースに落とし穴を評価します。

|ランク|ダメージレベル|
|:----:|----|
|<span style="font-weight: bold; color: white;background-color: #E63946; padding: 4px 10px; border-radius: 6px;">S</span>|あり得ないだろ！？どうやって回避するの？精神的ダメージを受けるレベル|
|<span style="font-weight: bold; color: white;background-color: #F4A261; padding: 4px 10px; border-radius: 6px;">A</span>|え、何で？びっくりしたー。た、たぶん・・・なんとかなるよねレベル|
|<span style="font-weight: bold; color: white;background-color: #2A9D8F; padding: 4px 10px; border-radius: 6px;">B</span>|なるほど、まあよくあるよね。やられたなぁレベル|
|<span style="font-weight: bold; color: white;background-color: #457B9D; padding: 4px 10px; border-radius: 6px;">C</span>|事前に回避可能 または 落ちても痛くないレベル|

あくまでも個人の感想です。



# 🕳️1. Web上の情報が少ない <span style="font-weight: bold; color: white;background-color: #2A9D8F; padding: 4px 10px; border-radius: 6px;">B</span>
**落とし穴**
オープンソースのライブラリを使っているとき、解らないことがあればネットで検索しますよね。同じ要領でPC-SDKに関する情報やAPIを検索すると、ほとんど情報がなくABBのサイトかStack Overflowのようなプログラミングに関する題材を扱う英語のQAサイトが表示されます。

日本語で書かれた個人サイトやABB以外のテック企業による説明などはほとんどありません。ABBのサイトもサンプルコードは非常に少ないです。そのため、英語のQAサイトを丹念に調べ、翻訳[^c] しながら内容を確認します。
ただし、あまり有用な情報が得られない場合や5年～10年前の古い情報だったりすることもあります。

**対策**
オフィシャルサイト(またはネット検索)からAPIリファレンスや取説などがPDFファイルでダウンロードできます。手元に置いておき１次資料としてザックリと内容を把握しておき、解らないことがあればそこから調べます。

最近はGoogleのNotebookLMを使ったりしています。APIリファレンスや取説のPDF、情報として有益なサイトをNotebookLMに登録しておけば、プロンプトで質問ができます。また要約してくれてエビデンスも表示されるので自分で検索するよりも簡単に情報にアクセスできます。


# 🕳️2. AIが頻繁にハルシネーションを起こす <span style="font-weight: bold; color: white;background-color: #2A9D8F; padding: 4px 10px; border-radius: 6px;">B</span>
**落とし穴**
最近は何か解らないことがあれば検索ではなくAIに問い合わせることが多いのですが、  
「PC-SDKのAPI xxxx について使い方を教えて」  
「xxxxを使ってxxxxxの処理のサンプルを提示して」  
などプロンプト入力すると先ほどの「🕳️1. Web上の情報が少ない」の影響か、存在しないAPIや引数が間違えているコードサンプルを出力します。

さらっと自然に嘘をつきます。誤りを指摘しつつ再度プロンプト入力すると、今度は別の引数が間違っていたり、古いコードで動作しないものが出力されたりしてほとんど役に立たないことがあります。

**対策**
- Visual Studioなどでプロジェクトを作成し、PC-SDKのライブラリを参照させ、オブジェクトブラウザでAPIを確認する
- PC-SDKに付属する `abb.robotics.controllers.pc.xml` をエディタで開きAPIに関する説明情報を参考とする


# 🕳️3. ロボットコントローラが見つからないことがある <span style="font-weight: bold; color: white;background-color: #F4A261; padding: 4px 10px; border-radius: 6px;">A</span>
**落とし穴**
APIではローカルネットワーク上で動作しているロボットコントローラを検索(UDPブロードキャスト)し、見つかったロボットコントローラに対してログインしてロボットコントローラに接続します。
RobotStudioはローカルPC上で動作しているため一瞬で接続できますが、運用環境ではロボットコントローラの検索でタイムアウトになったり、２回目の検索で検知するといった謎の現象が発生しました。

**対策**
ネットワークインタフェース(NIC)が複数ある環境(4とか8とか)ではどのネットワークを探せばよいのかわからないため検索時にタイムアウトとなり見つからない現象が発生していました。これを解決するには検索する前にロボットコントローラのIPアドレスを指定してあげます。

```cs:実機ロボットコントローラへの接続例
var scanner = new NetworkScanner();

// ロボットコントローラのIPアドレスを直接指定して、スキャナの探索リストに登録する
// これにより、どのNICを通すべきかPC-SDKが判断する
NetworkScanner.AddRemoteController("xxx.xxx.xxx.xxx");

// 事前に取得しておいたロボットコントローラのUUIDを指定して検索する
var systemId = Guid.Parse("xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx");
// systemId, 待ち時間[msec], リトライ数
var controllerInfo = scanner.Find(systemId, 1000,3);

if (controllerInfo == null)
{
    throw new Exception("コントローラが見つかりませんでした。");
}

// 実機に接続
_controller = Controller.Connect(controllerInfo, ConnectionType.Standalone);
```

IPアドレスを指定するのならFind()を使う意義は薄いと思いますが、これで解決します。


# 🕳️4. 制御権の獲得し忘れ <span style="font-weight: bold; color: white;background-color: #457B9D; padding: 4px 10px; border-radius: 6px;">C</span>
**落とし穴**
ロボットコントローラに接続し、下記のような状態変更を促す処理を行うとエラーになります。
- RAPID[^e]変数の値を更新する
- サーボモーターをOnにする
- RAPIDプログラムをロード(タスク割り当て)する
- RAPIDプログラムを開始する

**対策**
コントローラにMastershipのリクエスト(書き込み権限のリクエスト)して取得してから更新します。サンプルコードや検索すれば例はいくらでも出てきますので慌てることはありません。

```cs:Mastershipのリクエスト
using (Mastership.Request(_controller))
{
    // ここで更新処理を記述
}
```

ただし、Mastershipのリクエストに失敗することがあります。リトライ処理を入れたり、例外処理でエラー処理を記述するなどの仕組みが必要です。
なお、コントローラの状態の取得やRAPID変数の値取得などReadOnlyなものはMastershipのリクエストは必要ありません。


# 🕳️5. 運用環境でロボットコントローラと接続できない <span style="font-weight: bold; color: white;background-color: #E63946; padding: 4px 10px; border-radius: 6px;">S</span>
**落とし穴**
開発環境でRobotStudio上の仮想ロボットコントローラには接続できています。しかし、運用環境でロボットコントローラに接続するとIPアドレス等が正しく `ping` も通るのにロボットコントローラの状態が取得できない。

開発環境の構成
![](/img/robotics/industrial-network/pc_sdk-avoiding-pitfall/development_env.png)

運用環境の構成
![](/img/robotics/industrial-network/pc_sdk-avoiding-pitfall/production_env.png)

**対策**
RobotStudioをインストールすると、(裏で)ロボットコントローラと通信するためのドライバもインストールされます。これがないと通信できません。

運用環境ではRobotStudioは不要なのでインストールせず、PC-SDK(ライブラリ)だけを利用するとドライバがインストールされていないのでエラーになります。

ABBのサイトから `RobotWare_Tools_and_Utilities_x.x.x.zip` (x.x.xはバージョン)をダウンロードし、展開して `RobotCommunicationRuntime/ABB Industrial Robot Communication Runtime.msi` を実行するとドライバがインストールされPC-SDKで接続できるようになります。こんなん解らんて。


# 🕳️6. リモートPCから RobotStudio に接続できない <span style="font-weight: bold; color: white;background-color: #457B9D; padding: 4px 10px; border-radius: 6px;">C</span>
**落とし穴**
先ほどの「🕳️5. 運用環境でロボットコントローラと接続できない」を開発環境で検証しました。
1. PCを2台用意する
2. 一方(Aとする)をアプリケーション動作環境とする
3. もう一方(Bとする)をロボットコントローラとみなしてRobotStudio(仮想ロボットコントローラ)をインストールする
4. AとBに `RobotWare_Tools_and_Utilities_x.x.x.zip` のドライバをインストールする
5. AからPC-SDKでBの仮想コントローラに接続する

接続テスト環境の構成
![](/img/robotics/industrial-network/pc_sdk-avoiding-pitfall/connection_test_env.png)

上記を試みましたが、あえなく撃沈。接続できせんでした。


**対策**
RobotStudioはローカルPC上からのアクセスしか受け付けないためリモートPCからの接続はできない仕様のようです。
これはライセンスが絡んでいる(1 RobotStudio 1ライセンス)からではないでしょうか。仕方がないですね。


# 🕳️7. 運用環境でRAPID を実行できない <span style="font-weight: bold; color: white;background-color: #F4A261; padding: 4px 10px; border-radius: 6px;">A</span>
**落とし穴**
RobotStudio上ではログインして問題なくRAPIDのロードや実行ができます。しかし、運用環境ではコントローラに接続できましたが、RAPIDのロードや実行を指示すると例外が発生します。何で？


**対策**
ロボットコントローラに接続する際のデフォルトユーザーは `Default User` ですが RobotStudioと運用環境とで権限が異なっています。
様々な権限がありますが実行権限とプログラムのロード権限に違いがありました。

| 権限     |RobotStudio|実機|
|----------|:---------:|:--:|
|実行権限  |あり|なし|
|ロード権限|あり|なし|

`Default User`でもRobotStudioではさまざまな権限が最初から付与されているようですが、実機では権限が付与されていないものがありました。
そのため、実機上に新しくユーザーを作成し、RobotStudio上と同じことができるように権限を付与し、そのユーザーでログインしたところ実行できました。

なお、RobotStudio上での仮想コントローラではユーザーの作成や権限を付与する機能はなく、実機コントローラでのみ可能となっているのもハマった理由として挙げられます。



# 🕳️8. デジタル出力ができない <span style="font-weight: bold; color: white;background-color: #2A9D8F; padding: 4px 10px; border-radius: 6px;">B</span>
**落とし穴**
ロボットコントローラには各種デバイスとデジタル信号(0 or 1)で連携するための物理インタフェース(I/Oポート)があります。この出力ポートに0または1を書き出すと例外が発生し、出力できませんでした。

**対策**
ABB ロボットコントローラではI/O設定で物理インタフェースのどこにデジタル出力を割り当てるかを指定します。このとき `Access Level` を指定します。デフォルト値では `Default` となっています。

`Access Level` はレベル毎に制御する側のコンテキストでRead/Writeが有効かどうかが異なっています。

|Access Level|Rapid|Local Client<br>in Auto Mode|Remote Client<br>in Auto Mode|
|----|-----|---------------------------|--------------------------|
|All|Write Enabled|Write Enabled|Write Enabled|
|AWACCESS|Write Enabled|Write Enabled|Read Only|
|Default|Write Enabled|Read Only|Read Only|
|Internal|Read Only|Read Only|Read Only|
|ReadOnly|Read Only|Read Only|Read Only|

`Auto Mode` とは人が操作するのではなくプログラムでロボットを動かすモードを指します。
ロボットコントローラが `Auto Mode` のとき、ロボットコントローラの外部からアクセスしてI/Oを操作するときは一番右の `Remote Client in Auto Mode` 列となります。
ロボットプログラムの実行は`Rapid`列に相当します。

今回はPC-SDKを利用して外部からロボットコントローラをプログラムで制御しているので `Remote Client in Auto Mode` となっています。
`Access Level` は `Default` 行となり、動作モードは `Remote Client in Auto Mode` 列となります。その重なり部分は `Read Only` となっていることがわかります。
つまり `Access Level` が `Default` だったので書き込みができない状況でした。 `Access Level` が `All`でないと書き込みできません。厳しいですね。

というわけで、デジタル出力を割り当てるときの `Access Level` を `All` にすることで無事書き込めるようになりました。

:::info
`Access Level` は新しく追加もできるようです。
:::


# 🕳️9. 配列のデータ転送が遅い <span style="font-weight: bold; color: white;background-color: #F4A261; padding: 4px 10px; border-radius: 6px;">A</span>
**落とし穴**

RAPID側での配列の定義
```cs
MODULE MainModule
    PERS num dataArray{100};
ENDMODULE
```

配列に値を書き込む一般的な記述は下記となります。
```cs
// 最初に1回だけ取得しておく
RapidData rd = _controller.Rapid.GetRapidData(
        "T_ROB1", "MainModule", "dataArray");
  :
using (Mastership.Request(_controller))
{
    for (int i = 0; i < 100; i++)
    {
        rd.WriteItem(new Num(i), i);
    }
}
```
このとき、rd.WriteItem()をコールするたびにネットワークアクセスします。そのためトータルで数百[msec]～数[sec]掛かります。


**対策**
なるべくrd.WriteItem()のコール回数を少なくし、一括でデータを設定するようにします。
RAPID側で `RECORD型` で構造体を定義します。

```cs
MODULE MainModule
    RECORD StructData
        num value1;
        num value2;
        num value3;
        num value4;
        num value5;
    ENDRECORD
    :
ENDMODULE
```

C#側はその構造体をUserDefined型として参照できます。
UserDefined型に値を設定するときは以下のようにします。

```cs
// 最初に1回だけ取得しておく(RAPID側のStructDataのコピーを作成)
UserDefined ud = new UserDefined(_controller.Rapid.GetRapidDataType(
            "T_ROB1","MainModule","StructData"));
// 最初に1回だけ取得しておく(RAPID側のStructDataの参照を作成)
RapidData rd = _controller.Rapid.GetRapidData(
            "T_ROB1","MainModule","StructData");
  :
using (Mastership.Request(_controller))
{
    int value1 = 1;
    int value2 = 2;
    int value3 = 3;
    int value4 = 4;
    int value5 = 5;

    // UserDefinedに設定するデータを作成
    structData = $"[{value1},{value2},{value3},{value4},{value5}]";

    // UserDefinedにデータを設定
    ud.FillFromString2(structData);

    // ロボットコントローラにデータ転送
    rd.Value = ud;
}
```

また、RAPIDのデータ型であるrobtargetやjointtargetは非常にデータサイズが大きいです。一部のデータのみ更新するのであればその値のみ転送し、RAPID側でデータを更新して利用することも有効です。

:::alert
ud.FillFromString2("[0,1,2,3,4,5,.....]") のように文字列リテラルで全要素を直接設定できます。しかし、巨大な構造体や配列の場合、途中までしか値が設定されていないことがありましたので注意が必要です。また、パース処理に時間が掛かりますがネットワークアクセスに比べると無視できるレベルです。
:::

:::alert
AIでサンプルを提示してもらうと、おそらく古いAPIかと思われますが、存在しないAPIが提示されコンパイルエラーとなりました。
:::


# 🕳️10. 実機でRAPIDを実行すると実行時エラーになる <span style="font-weight: bold; color: white;background-color: #E63946; padding: 4px 10px; border-radius: 6px;">S</span>
**落とし穴**
RobotStudio上のシミュレータでRAPIDを実行しても問題なく動作し、プログラムの構文チェックも問題なくパスするのに、同じものを実機で動作させると実行時にエラーとなってしまう。
下記の例外が出力されたら要注意!!

```
Operation is illegal in current execution state
```
実行時エラーなので状態に起因することは分かっていますが、何の状態なのかがさっぱりわかりません。コントローラのログを見ても直接的な原因が記述されていません。
「制御あるある」ですが原因不明の実行時エラーが一番辛いです。

**対策**
シミュレータ上では動くことから、運用環境との環境設定の違いに原因がありそうだと直感的にわかります。プログラムの開始からどこまで進むとエラーになるかをRAPIDプログラムのソースコードを全コメントアウトし、バイナリサーチ的にコメントアウトを解除して再実行する手順で探しました。(もしかしたらステップ実行で行けたかもしれません)

結果、２つ問題がありました。
1. I/Oの定義が実機ではされていなかった
    - シミュレータ上で定義してあったI/Oの名前(参照するときは文字列で指定)が見つけられずに実行時エラーとなっていた
2. 割り込みタイマーのトリガー時間が実機では早すぎた
    - 10[msec]としていてシミュレータ上では動作していたが、実機では実行時エラーとなっていた

上記の問題の修正自体は簡単でしたが、見つけるのに手間が掛かりました。環境の違いに起因する実行時エラーにはご注意を。



# リスクを軽減するための開発スケジュール
いかがだったでしょうか？大半は開発環境(RobotStudioのシミュレータ)で問題の無かったものが、運用環境(実機コントローラ)で問題となって現れたものとなっています。しかも、穴から這い上がったと思ったらまたすぐに落とされる状況がありました。挫けそうになりますよね。

開発環境では仮想コントローラに接続するユーザーに対して、セキュリティは緩く、大きな権限を持たせています。一方、運用環境ではセキュリティは厳しく、権限も最小限にしているため不具合発生するパターンがよくありました。

運用環境が遠隔地にある場合、現地での対応には人員、時間、移動距離、金銭の面で多大なコストを要する課題があります。そのため、開発・動作確認を開発環境で行い、システムテストのみを運用環境で一括実施する計画を立てた場合、不測の事態によって進捗に遅延が生じる懸念があります。

リスクを回避するため、スケジュール内に複数のマイルストーンを設け、現地での動作確認を段階的に実施することを強く推奨します。また、現地のエンジニアに検証を委託すること(なかなか難しいですが)も、費用対効果の観点から非常に有効な手段であると考えられます。

# まとめ
日本ではFANUCや安川電機(YASKAWA)といった世界トップクラスのロボティクスメーカーのマーケットシェアが高いため、欧州の雄ABBのシェアは数%程度だそうです。

ABBのロボット開発拠点はスイスにあるため、高度な技術課題については日本国内のサポートを経由し、本国の技術者へエスカレーションする場合があります。その際、時差や拠点間の連携プロセスにより、回答までに時間を要した経緯がありました。

PC-SDKについて辛口の内容ではありましたが、ロボットやロボットコントローラの機能や性能は素晴らしく、RobotStudioでのオフラインティーチング環境もトップレベルで使いやすいです。ABBのロボット部門がソフトバンクグループとなったことで日本でのシェア拡大を狙っていてもおかしくはありません。そうなると営業やサポート部門の規模や質もより重厚になると思われます。今後のABBロボット事業の展開に期待します。

今回はPC-SDKの落とし穴と題して幾つか挙げましたがRAPIDにも落とし穴が潜んでいます。機会があればそちらも記事にできればと思います。


[^a]:エー・ビー・ビーと呼びます。Asea社とBrown Boveri社の合弁で設立(アセア・ブラウン・ボベリ)
[^b]:PCからABB ロボットコントローラに接続するためのSDK(ライブラリ)
[^c]:DeepL, Google翻訳, ブラウザで右クリックして「日本語に翻訳」など
[^d]:ABBが提供しているオフラインティーチング(シミュレーション)ソフトウェア
[^e]:ABBの産業用ロボットを制御するために開発された専用のプログラミング言語
