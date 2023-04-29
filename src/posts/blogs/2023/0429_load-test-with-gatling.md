---
title: Gatling - DSL で API の負荷テストを書いて実行する
author: masahiro-kondo
date: 2023-04-29
tags: [performance, gatling, テスト]
---

Gatling は JMeter と同様な Web サービスの負荷テストツールです。

[Gatling - Professional Load Testing Tool](https://gatling.io/)

エンタープライズ向けの有償サービス(オンプレ/クラウド)もありますが、バイナリをダウンロードして利用することも可能です。

JMeter より後発なのでモダンになっています。JMeter では XML で負荷テストのシナリオを作成しますが、Gatling では Java / Kotlin / Scala の DSL でシナリオを作成し実行します。ノンブロッキングなアーキテクチャで実現されており、何千もの仮想ユーザーを同時実行可能です。

この記事では簡単な REST API のロードテストを実行する方法を紹介します。

## Gatling のインストール

Gatling の実行に必要なのは 64bit の JDK version 8/11/17 のいずれかです。

https://gatling.io/docs/gatling/tutorials/installation/

筆者は macOS 上の Azul 版 OpenJDK 17.0.5 を使用しました。

```shell
$ java --version
openjdk 17.0.5 2022-10-18 LTS
OpenJDK Runtime Environment Zulu17.38+21-CA (build 17.0.5+8-LTS)
OpenJDK 64-Bit Server VM Zulu17.38+21-CA (build 17.0.5+8-LTS, mixed mode, sharing)
```

Gatling の ZIP ファイルをダウンロードして展開し、bin ディレクトリにパスを通せば利用可能になります。

ダウンロードは以下のページの `Download Now` リンクからです。

[Open Source Load Testing - Gatling](https://gatling.io/open-source/)

![Download](https://i.gyazo.com/8b5fc11dbb2d1eaff5f73389df992eff.png)

記事執筆時点では、v3.9.3 のバイナリが降ってきました。

gatling-charts-highcharts-bundle-3.9.3-bundle.zip

これを任意のディレクトリに展開して bin ディレクトリにパスを通します。筆者は `$HOME/dev/gatling` 配下に展開して以下のようにパスを通しました。

- $HOME/.zshrc
```shell
export PATH="$PATH:$HOME/dev/gatling/bin"
```

## シナリオファイル配置先・レポートファイル出力先の指定

Gatling のディレクトリ構成は以下のようになっています。実行ファイルは bin 配下にあります。ユーザーが作成するシナリオは user-files 配下に配置し、結果レポートファイルは results 配下に出力されます。

```shell
.
├── bin
├── conf
├── lib
├── results
├── target
└── user-files
```

ただ、シナリオファイルはこの user-files 配下ではなくテスト対象のプロジェクト配下など任意の場所に配置したりしたくなります。同様にレポートファイルの場所も変えたくなります。以下のように gatling.sh の起動時に `-sf(--simulation-folder)` オプションと `-rf(--results-folder)` オプションを指定すれば、それぞれディレクトリを指定できます。

```shell
gatling.sh -sf path/to/my/senarios -rf path/to/my/results
```

conf/gatling.conf を編集して以下のように設定することも可能です。

- conf/gatling.conf
```shell
gatling {
  core {
    directory {
      # シナリオファイル用ディレクトリ
      simulations = "path/to/my/senarios"
    }
  }
}
```

## シナリオを書く
 Scala の DSL でシナリオを書いてみます。シナリオファイルを拡張子 `.scala` で用意します。 

:::info
冒頭で述べたように Gatling では Java / Kotlin / Scala でシナリオを記述できます。Scala はハードルが高いイメージがありますが、簡潔に書けて保守性も高そうなので選択してみました。
:::

- ExampleLoadTest.scala
```scala
import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class ExampleLoadTest extends Simulation {  // 1
  
  val httpProtocol = http                   // 2
    .baseUrl("http://localhost:3000")
    .acceptHeader("application/json")       // 3
  
  val scn = scenario("Express load test")   // 4
    .repeat(100) {                          // 5
      exec(http("get customers")            // 6 
        .get("/customer")                   // 7
        .check(status.is(200)))             // 8
      .pause(1 second)                      // 9
    }

  setUp(                                    // 10
    scn.inject(atOnceUsers(10))             // 11
  ).protocols(httpProtocol)                 // 12
}
```

1. Simulation クラスを継承するクラスを宣言
2. HTTP リクエストの共通設定
3. 共通のリクエストヘッダー定義
4. シナリオ定義
5. 繰り返し数(100)
6. 結果レポートに表示される HTTP リクエストのネーミング
7. リクエストのパス
8. HTTP レスポンスのステータスコードが200であることをチェック
9. リクエストのリピート間隔(1秒)
10. シナリオ実行の設定
11. 同時接続数(10)でシナリオをインジェクト
12. 2で定義された HTTP 設定をアタッチ

定型的なコードなのでさほど難しくないと思います。

:::info
シナリオの DSL については、ドキュメントの [Simulation](https://gatling.io/docs/gatling/reference/current/core/simulation/) を参照してください。

画面のある Web アプリの場合は、recorder.sh を実行して操作を記録しシナリオのスクリプトを生成することができます。詳細は以下を参照してください。

[https://gatling.io/docs/gatling/tutorials/quickstart/#using-the-recorder](https://gatling.io/docs/gatling/tutorials/quickstart/#using-the-recorder)

実際のシナリオでは、想定される同時接続ユーザーより多めのユーザー数を指定して性能を見ることになると思います。ただ、API の暖気運転が完了していない状態でいきなり最大ユーザー数で開始したくない場合もありますし、実際のユーザー数も徐々に増える傾向があります。このため Gatling では rumpUsers というメソッドが用意されて Ramp Up 期間を設定することができます。

以下は、10名の通常ユーザーと2名の管理者がいて、10秒間 Ramp Up する例です。

```scala
setUp(
  users.inject(rampUsers(10).during(10)),
  admins.inject(rampUsers(2).during(10))
).protocols(httpProtocol)
```

詳細は、ドキュメントの Advanced Tutorial を参照してください。
[Advanced Tutorial](https://gatling.io/docs/gatling/tutorials/advanced/)

Ramp Up 期間を設けた場合、結果レポートの該当期間は本来見たい性能になっていないことに注意が必要です。
:::

## 負荷テストを実行する
今回は Node.js/Express で簡単な REST APIを書いてローカル起動しました。時間がかかる処理を模擬するため、リクエストを受けて1秒間待機しランダムなデータを JSON で返却する API を作りました[^1]。Gatling もローカルで起動しました。

[^1]: 固定値を返すとキャッシュされて HTTP ステータスコードが 304 になってしまうため。

:::info
本来は負荷テスト対象の API のデプロイ先と Gatling の実行環境は別マシンにするべきです。同じマシンのリソースを使ってしまうとリソース利用状況の解釈などが難しくなります。
:::

`$HOME/dev/gatling-trial/senarios` というディレクトリにシナリオを配置し、`$HOME/dev/gatling-trial/results` にレポートが出力されるよう、次のように実行しました。

```shell
gatling.sh -sf ~/dev/gatling-trial/senarios -rf ~/dev/gatling-trial/results
```

以下に実行結果を示します。最初に Gatling の実行方法を選択します。今回は `[1] Run the Simulation locally` ということで、1を入力しています。次にシナリオを選択します。今回は、シナリオファイルは1個だけですので、`[0] ExampleLoadTest` が表示されており、0を入力しています。オプション指定なしで実行すると、進捗状況が出力され、最後に統計情報とレポートの出力先が表示されます。

```shell
GATLING_HOME is set to /Users/masahiro-kondo/dev/gatling
Do you want to run the simulation locally, on Gatling Enterprise, or just package it?
Type the number corresponding to your choice and press enter
[0] <Quit>
[1] Run the Simulation locally
[2] Package and upload the Simulation to Gatling Enterprise Cloud, and run it there
[3] Package the Simulation for Gatling Enterprise
[4] Show help and exit
1 # 1を選択
12:42:45.963 [WARN ] i.g.c.ZincCompiler$ - -target is deprecated: Use -release instead to compile against the correct platform API.
12:42:46.739 [WARN ] i.g.c.ZincCompiler$ - one warning found
Choose a simulation number:
     [0] ExampleLoadTest
0 # 0を選択
Select run description (optional) # そのまま Enter
Simulation ExampleLoadTest started...

================================================================================
2023-04-29 12:52:07                                           5s elapsed
---- Requests ------------------------------------------------------------------
> Global                                                   (OK=20     KO=0     )
> get customers                                            (OK=20     KO=0     )

---- Example load test ---------------------------------------------------------
[--------------------------------------------------------------------------]  0%
          waiting: 0      / active: 10     / done: 0     
================================================================================

# 途中省略

================================================================================
2023-04-29 12:55:24                                         201s elapsed
---- Requests ------------------------------------------------------------------
> Global                                                   (OK=1000   KO=0     )
> get customers                                            (OK=1000   KO=0     )

---- Example load test ---------------------------------------------------------
[##########################################################################]100%
          waiting: 0      / active: 0      / done: 10    
================================================================================

Simulation ExampleLoadTest completed in 201 seconds
Parsing log file(s)...
Parsing log file(s) done
Generating reports...

================================================================================
---- Global Information --------------------------------------------------------
> request count                                       1000 (OK=1000   KO=0     )
> min response time                                   1002 (OK=1002   KO=-     )
> max response time                                   1048 (OK=1048   KO=-     )
> mean response time                                  1014 (OK=1014   KO=-     )
> std deviation                                          9 (OK=9      KO=-     )
> response time 50th percentile                       1012 (OK=1012   KO=-     )
> response time 75th percentile                       1019 (OK=1019   KO=-     )
> response time 95th percentile                       1034 (OK=1034   KO=-     )
> response time 99th percentile                       1044 (OK=1044   KO=-     )
> mean requests/sec                                   4.95 (OK=4.95   KO=-     )
---- Response Time Distribution ------------------------------------------------
> t < 800 ms                                             0 (  0%)
> 800 ms <= t < 1200 ms                               1000 (100%)
> t >= 1200 ms                                           0 (  0%)
> failed                                                 0 (  0%)
================================================================================

Reports generated in 0s.
Please open the following file: file:///Users/masahiro-kondo/dev/gatling-trial/results/exampleloadtest-20230429035201301/index.html
```

## レポートを眺める
出力された HTML 形式のレポートを見ます。Global と Details のタブがありますが、シナリオ(シミュレーション)が1個だけなので Global の方で見ていきます。

:::alert
ネットワークのレイテンシーやデータベース処理もないため、実際の負荷テストと結果とはかなりかけ離れたものになっているのでご注意ください。
:::

Response Time Ranges は、ヒストグラムになっています。この結果では、800ms から 1200ms の間に全てのリクエストが収まっています。また、リクエストの結果は全て OK でした。レスポンスタイムのパーセンタイルは、99%までが1048ms に入っていることがわかります。

![Ranges-Stats](https://i.gyazo.com/1352db2b008b54f1231696c04da1b836.png)

実行中のアクティブユーザーの推移は常に10で変動していません。その下のヒストグラムではレスポンスタイムの分布を見ることができます。

![Active Users](https://i.gyazo.com/2c0b02841b06a168bdc77452b5fee179.png)

レスポンスタイムのパーセンタイルの時間経過に伴う推移です。

![Response Time Percentils](https://i.gyazo.com/19e1eea15fd360f10e27944fc85edb7e.png)

レスポンス数の時間経過に伴う推移です。全てのレスポンスと、OK/KO で色分けしたグラフが表示されています。12:52:34-12:52:37 と 12:54:35-12:55:02 の2つの区間でレスポンス数が減少していました。理由はわかりませんがこの区間では API の処理能力がやや下がっていたようです。上記のパーセンタイルの推移でも同区間にグラフが出ています。

![Number of responses per second](https://i.gyazo.com/4bf59018bbed5210d7f1b6eed990f5c1.png)

以上のように Gatling のレポートは結果が見やすく可視化されていることがわかります。

## 最後に
以上、Gatling の使用例でした。DSL で宣言的にシナリオを書けて Git での管理も簡単です。レポートもリッチで見やすいので積極的に使っていきたいところです。
