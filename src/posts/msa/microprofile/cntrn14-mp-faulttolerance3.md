---
title: 第14回 MicroProfile Fault Tolerance(3) - 例で理解する設定編
author: toshio-ogiwara
date: 2022-10-24
tags: ["逆張りのMicroProfile"]
prevPage: ./src/posts/msa/mp/cntrn13-mp-faulttolerance2.md
---
今回のテーマはマイクロサービスでは定番のタイムアウトやリトライ、サーキットブレーカーなどの耐障害性に関する機能を提供するMicroProfile Fault Tolerance(MP Fault Tolerance)です。MP Fault ToleranceはMicroProfileランタイムから提供される機能をコンフィグレーションして利用する形態となるため基本的に作りものはありません。このため、今回は少しテイストを変えてMP Fault Toleranceから提供される機能とその設定を「こんなことをしたい」的な利用シーンごとに説明していきたいと思います。なお、MP Fault Toleranceの機能は豊富なため説明は今回の基本機能編、非同期編(<span style="color:red">Coming Soon!</span>)、設定編(<span style="color:red">Coming Soon!</span>)の3回に分けて行います。

記事はコードの抜粋を記載します。全体を見たい場合や動作を確認したい場合は以下のGitHubリポジトリを参照ください。
- <https://github.com/extact-io/contrarian-microprofile-sample/tree/main/08-fault_tolerance>

MicroProfileをテーマにブログを連載しています。他の記事もよければ以下のリンクからどうぞ！
- [逆張りのMicroProfile ～ Helidonで始めるマイクロサービスへの一歩 ～](/msa/#逆張りのmicroprofile-～-helidonで始めるマイクロサービスへの一歩-～)

[[TOC]]

:::info
この記事はJava17+Helidon 3.0.1 + MicroProfile Fault Tolerance 4.0をもとに作成しています。
MicroProfile Fault Toleranceの詳細は[公式マニュアル](https://download.eclipse.org/microprofile/microprofile-fault-tolerance-4.0/microprofile-fault-tolerance-spec-4.0.html#circuitbreaker)を参照くだい。
:::

# 説明に利用するサンプル
今回は次の簡単なRESTアプリケーションを使って説明していきます。

![overview](../../../img/mp/12-1_faulttolerance.drawio.svg)

説明に利用するRESTアプリケーションはHelloクライアントアプリが受け取った挨拶依頼(/client)をMicroProfile RestClientのHelloRestClientインタフェース[^1]を使って後段のHelloサービスアプリに委譲するアプリケーションとなります。記事のなかではHelloクライアントアプリのHelloFautlToleranceServiceに色々な設定をしながら説明を行っていきます。

[^1]: MicroProfile RestClientは[第7回 らくらくMicroProfile RestClient](/msa/mp/cntrn07-mp-restclient/)で取り上げています

それではこのアプリを使ってMP Fault Toleranceの各機能を説明していきます。

# 設定編
MP Fault Toleranceに対する指定はここまで見てきたとおり、すべてアノテーションで行うことができますが、全体に対する指定やアノテーションで指定した属性値のオーバーライドなどをMP Config[^6]の設定ファイルで行うこともできます。ここでは、MP Fault Toleranceの設定機能について見ていきます。

[^6]: MicroProfile Config(MP Config)は[第6回 お手軽便利MicroProfile Config](/msa/mp/cntrn06-mp-config/)で詳しく説明しています。

## アノテーションで指定した設定をオーバーライドしたい
次の3つのレベルでアノテーションで指定した値をオーバーライドできます。
- メソッドに指定されている個々のアノテーションの属性値をオーバーライドする
- クラスに指定されているアノテーションの属性値をオーバーライドする
- アプリケーション全体でアノテーションの属性値をオーバーライドする

オーバーライドする際の設定キーの書式は以下になります。
`<classname>/<methodname>/<annotation>/<parameter>`

上記は一番細かいレベルのメソッドに指定されているアノテーション設定をオーバーライドする際の書式となります。クラスに指定されているものをオーバーライドする場合は`<classname>`が、アプリケーション全体の場合は`<classname>`と`<methodname>`の指定が不要となります。

それでは、以下のコードに対する具体的な設定例をみていきましょう。

```java
package io.extact.sample;
...
@ApplicationScoped
@Timeout(500)
public class FtClient {
    @Retry(maxRetries = 3, delay = 1000)
    public void execA(String param) {
        workA(param);
    }
    @Retry(maxRetries = 2, maxDuration = 100)
    public String execB() {
        return workB();
    }
    @Retry(maxRetries = 5)
    @Fallback(fallbackMethod = "fallback")
    public int execC(int count) {
        return workC();
    }
    ...
}
```

このコードに対して、次の設定がされていた場合、実行時には`execB`の`maxDuration`の属性値が10000(msec)でオーバーライドされます。なお、ここでの設定はすべてMP Config標準の`microprofile-config.properties`に対する例となります。
```shell
io.extact.sample.FtClient/execB/Retry/maxDuration=10000
```

次の設定がされている場合はクラスに指定されている`@Timeout`の`value`属性値が10000(msec)でオーバーライドされ、結果、実行時には`execA`, `execB`, `execC`のタイムアウト値が10000(msec)になります。
```shell
io.extact.sample.FtClient/Timeout/value=10000
```

最後にアプリケーション全体に対する設定は次のとおりになります。この場合はすべての`@Retry`の`maxRetries`属性値が1でオーバーライドされ、結果、アプリケーション全体でリトライする場合の回数は1回に統一されます。
```shell
Retry/maxRetries=1
```

:::alert:オーバーライドできるものはアノテーションに指定がある要素のみ
設定でオーバーライドできるのはあくまでもアノテーションに指定があるもののみで、アノテーションで指定されていない属性を足したりすることはしません。例えば次のようなアノテーション指定と設定があった場合、実行時の内容は`@Retry(maxRetries = 3, delay = 1000)`のままで、`maxDuration=10000`が追加されることはありません。

```java
package io.extact.sample;
...
public class FtClient {
    @Retry(maxRetries = 3, delay = 1000)
    public void execA(String param) {
        workA(param);
    }
}
```
```shell
io.extact.sample.FtClient/execA/Retry/maxDuration=10000
```

また、これは同様にクラス指定にも言えることで、次のように設定しても、FtClientクラス全体に`@Bulkhead(3)`が追加されることはありません。

```shell
Bulkhead/value=3
```

設定は指定されたアノテーション要素に一致するものがあった場合にそれを単純にオーバーライドするのみで、ソースコードに存在しない要素を追加することはありません。また、該当がない要素に対する設定は無視されるだけで気がつきづらいため設定を行う際は注意が必要です。
:::

:::column:実行時に環境変数を使って動作の変更が可能←★これをまとめに持って行くか！？
MP Configの設定（機能）を使っているため、リトライ回数やタイムアウト値などの条件を実行時に環境変数を使ってオーバーライドすることができます。この辺りの値は最初から一発で決まるものではなく、また環境によっても調整が必要になることから、リビルドせずに条件を変更できるのは大きな利点となります。
:::

## フォールトトレランス機能を個別に無効化したい
他の仕組みで代替する場合や障害調査などでタイムアウトやリトライなどのフォールトトレランス機能を無効化したい場合、設定で個別に機能を無効化することができます。

無効化する設定キーの書式は以下になります。
`<classname>/<methodname>/<annotation>/enabled=false`

設定方法は先ほどの[アノテーションをオーバーライドする場合](#アノテーションで指定した設定をオーバーライドしたい)と同じです。
```shell
# 1. メソッド単位で無効化
io.extact.sample.FtClient/execC/Retry/enabled=false
# 2. クラス単位で無効化
io.extact.sample.FtClient/Retry/enabled=false
# 3. アプリケーション単位で無効化
Retry/enabled=false
```

1.はメソッド個別に無効化する例で、2.はクラス、3.はアプリケーション全体でリトライ機能を無効化する例となります。

なお、設定ファイルで無効化されている機能を環境変数などで有効化する場合はtrueを指定します。

## フォールバック機能以外はすべて無効化したい
MP Fault Toleranceにはその機能をサービスメッシュなどのアプリケーション外部の仕組みで代替することを想定し、機能個別ではなくフォールバック以外の機能を一括して無効化する設定が用意されています。フォールバック機能が除かれるのはフォールバック処理はアプリケーションロジックであるため、アプリケーションの外部機能では代替できないためです。

この指定を行う場合は以下を設定します。
`MP_Fault_Tolerance_NonFallback_Enabled=false`

先ほどの個別機能の無効化機能を使い明示的に有効化されている機能がある場合は、そちらが優先されます。つまり、次のような設定がされていた場合、バルクヘッド機能とフォールバック機能が有効となります。

```shell
MP_Fault_Tolerance_NonFallback_Enabled=false
Bulkhead/enabled=true
```

# まとめ
T.B.D.
