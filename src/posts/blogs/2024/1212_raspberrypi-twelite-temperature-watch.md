---
title: Raspberry pi と TWELITE で作る室温・湿度監視システムの構築
author: matsumoto-minoru
date: 2024-12-12
tags: [raspberry-pi, TWELITE, 無線監視, advent2024]
image: true
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2024/
---

これは[豆蔵デベロッパーサイトアドベントカレンダー2024](/events/advent-calendar/2024/)第9日目の記事です。

こんにちは。毎回、超小型コンピュータ Raspberry pi の記事を書いていますが、今回もこれにちなんだ記事です。

Raspberry pi は小型で扱いやすいコンピュータではあるのですが、部屋の温湿度を監視させる場合、以下の課題があります。

- 商用電源を必要とする
- 数をばらまくにはちょっと高価
- 無線 LAN で親機・子機を切り替えるのが面倒
- 筐体からジャンパ線を出すとカッコ悪い

そこで、

- 乾電池駆動が可能
- コンパクト
- 無線通信可能

という条件でうまい部品がないか探していたところ、[TWELITE](https://mono-wireless.com/jp/products/twelite/index.html)という製品に出会いました。
TWELITE と raspberry pi を組み合わせて部屋の温湿度測定値を収集し、更に Web サーバでデータの記録・表示する簡易システムを製作しましたので、報告させていただきます。

同様の製作記事はインターネット上にもあるようですが、報告年次が古く、少し検索した限りでは利用アプリ・ライブラリが最新になっていなかったので、改めてアップデートの注意点を示したいと思います。

以下に製作したシステムの概要図を示します。

![structure](/img/blogs/2024/1212_raspberrypi-twelite-temperature-watch/structure.png)

# TWELITE とは

TWELITE とは、[モノワイヤレス社](https://mono-wireless.com/)が販売している RISC-V ベースのワンチップマイコンです。
ワンチップの中に CPU, IO, 無線インタフェース(物理層のみ IEEE 802.15.4, スタックは独自)を内蔵しています。
極めて低い電力で動作でき、乾電池２本で動作します。

開発および書き込みは専用ソフトで実行します。いつの間にか Raspberry PI + TWE Writer のオプションが追加されていましたが、今回は Windows 版を使用しました。

# TWELITE と温湿度センサーの接続（電子工作）

温湿度センサーとしては、手元にあった [SHT-31](https://sensirion.com/jp/products/product-catalog/SHT31-DIS-B)を SIP 形状に拡張したモジュールを使用しました。 [^1]

SHT-31 の通信インタフェースは I2C なので、TWELITE のサンプルアプリの I2C ライブラリを使えば簡単にプログラミングできるのですが、勉強がてら独自に実装してみました。 [^2]

[^1]:現在は入手できないようなので、空気圧も測定可能な [BME-280](https://www.bosch-sensortec.com/products/environmental-sensors/humidity-sensors-bme280/) で製作した方が良いかもしれません。
[^2]:以前 I2C 崩れの SHT-11 ベースのモジュールを持っていたことも I2C を調べる動機となりました。

# TWELITE を本システム用に書き換え（電文構成）

元々の TWELITE では人間にもわかりやすい構文を使用していますが、python での解析効率を上げるため、HEX 表記を使用することとしました。

|オフセット|サイズ|意味|
|---------:|:------|:------------------------------------------|
|+00      |バイト|":" 、文字固定                              |
|+01      |バイト|送信元の論理番号                              |
|+02      |バイト|デバイス種別(SHT31 では0x04固定)            |
|+03      |バイト|部屋番号                                   |
|+04      |バイト|デバイスステータス(0で正常)                 |
|+05      |2バイト整数|温度                                  |
|+07      |2バイト整数|湿度                                  |
|+09      |バイト|チェックサム(足し算の2の補数)               |
|+10      |2バイト| "\r\n固定"                              |

送信元の論理番号は元々デバイスを区別するものだったのですが、部屋番号を作ったので、意味がなくなってしまいました。

タイマーに１分を設定し、タイムアウトでコールドリセットがかかるようにします。測定が終わると直ちにタイマーを設定してタイマー以外の部品への給電を止めます。このようなプログラムを組むことで、単３乾電池で半年くらい持つようになりました。

# Mono-stick による raspberry pi でのデータ受信

TWELITE で測定したデータは、親機となる raspberry pi に集めます。TWELITE のデータを受信するため、[mono-stick](https://mono-wireless.com/jp/products/MoNoStick/index.html)を利用しました。

## Mono-stick とは

Mono-stick は TWELITE の親機として動作し、raspberry pi とは USB で接続します。
Raspberry pi OS からはシリアルインタフェースとして見えるため、/dev/ttyUSB0 等が利用できます。

## 受信データの実際の温室度への変換

受信した温度・湿度を摂氏や%に変換するにはもう一工夫必要になります。

温度の変換式は以下のようになります。
```
temp = -45.0 + 175.0 * 測定値 / (2^16 - 1)
```

湿度の変換式は以下のようになります。
```
hum = 100.0 * 測定値 / (2^16 - 1)
```

デバイスによって変換式が異なりますが、受信プログラム側で変換することにしました。

# Web サーバ側 API の用意

Raspberry pi で集めたデータはクラウドの Web サーバに集積し、測定データとして蓄積します。
データを JSON 化してサーバに送信します。

```
{
    "type": "sht31",
    "datetime: "<経過時間>",
    "current": "<現在時刻>",
    "from": <部屋番号>,
    "presence": 128,
    "status": <デバイスが返してきたステータス>,
    "temperature": <温度>
    "humidity": <湿度>
}
```

Raspberry pi 側のプログラムは python3 で、Web サーバ側のプログラムは PHP で記述しました。

## Raspberry pi からの送信

最初はデータを受信する度、Web サーバにデータ転送するプログラムを組んでいたのですが、部屋数が多くなるとスケールしなくなります。
そこで、通信間隔を１分とし、その間 TWELITE から受信した電文をキューに蓄積することとしました。
そのため、受信時刻（タイムスタンプ）はデータを受信時に押してしまいます。

```python

def dataPoster(js):
    jse = js.encode()
    urllib.request.urlopen("<url>", data=jse)

queue = []
lasttime = time.time()
s = serial.Serial(port="/dev/ttyUSB0", baudrate=1152000, timeout=30)
while True:
    data = s.readline()
    parsed = parse(data)
    ctime = time.time()
    if ctime - lasttime >= 60:
        if len(queue) > 0:
            dataPoster(json.dumps(queue))
        queue = []
        lasttime = ctime
```

## Web サーバでの受信

Web サーバ側では受信したデータを解析し、データベース\(Sqlite3\)に蓄積します。一度に複数のデータを受信する可能性を考慮する必要があることに注意するほかは通常の API のコーディングになります。
温度がある閾値\(26度\)を超えて上昇したり、逆に別の閾値\(18度\)を超えて下降したりした場合、メールでスレッショルド経過通知を投げるようにしました。

# Web サーバ側でのグラフ表示

蓄積されたデータをいつでも見られるよう、Web サーバに GUI を追加します。
部屋番号、表示間隔、現在のデバイス状態、データ収集開始からの経過時間等を入力すると、対応するグラフが表示されます。
グラフ表示には Google Charts を使うことにしました。

![log](/img/blogs/2024/1212_raspberrypi-twelite-temperature-watch/log.png)

Google Charts は時期に依って使い方が大きく異なるのですが、2024/12/10 時点の使い方を紹介します。

```html
<html>
    <head>
        <!-- URL が変更されました -->
        <script src="https://www.gstatic.com/charts/loader.js"></script>
        <script>
            google.charts.load('current', {'packages': ['corechart']});
            google.charts.setOnLoadCallback(drawChart);
            current_room = '60';  // 部屋番号

            function drawChart() {
                let temperature = [['time', toName(current_room)]]; // 部屋番号から部屋名に変換
                const lines = getData(current_room); // DB から　[ {<time>: <温度>} ] のデータを読み出す
                for (const line in lines) {
                    temperature.splice(1, 0, [line[0], line[1]]);
                }
                const option_temp = {
                    "title": "Temperature",
                };
                const chart_temp = new google.visualization.LineChart(document.getElementById("temp_div"));
                const table_temp = new google.visualization.arrayToTable(temperature);
                chart_temp.draw(table_temp, option_temp);
            }
        </script>
    </head>
    <body>
        <div id="temp_div"></div>
    </body>
</html>
```


# さいごに

本記事では Raspberry pi と TWELITE を使った部屋の温湿度監視システムを構築しました。TWELITE は乾電池２個で動き、動作不要な時はタイマー以外のすべての電源を切ることができるので、理論上は単３乾電池で半年以上動作させることが可能です。
最近は圧力を測ることのできるセンサーが出てきているので、６時間後の天気予想をするなどというアソビもできるのではないかと妄想しています。
