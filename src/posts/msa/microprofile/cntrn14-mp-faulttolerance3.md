---
title: 第14回 MicroProfile Fault Tolerance(3) - 例で理解する設定編
author: toshio-ogiwara
date: 2022-10-22
tags: ["逆張りのMicroProfile"]
prevPage: ./src/posts/msa/microprofile/cntrn13-mp-faulttolerance2.md
nextPage: ./src/posts/msa/microprofile/cntrn15-mp-metrics.md
---
MicroProfile Fault Tolerance(MP Fault Tolerance)を紹介する最後は設定によるフォールトトレランス機能の指定です。今回も前回同様、MP Fault Toleranceから提供される機能とその設定を「こんなことをしたい」的な利用シーンごとに説明していきます。なお、MP Fault Toleranceの機能は豊富なため説明は前々回の[基本機能編](/msa/mp/cntrn12-mp-faulttolerance1/)、前回の[非同期編](/msa/mp/cntrn13-mp-faulttolerance2/)、そして今回の設定編と3回に分けて行っています。

記事はコードの抜粋を記載します。全体を見たい場合や動作を確認したい場合は以下のGitHubリポジトリを参照ください。
- <https://github.com/extact-io/contrarian-microprofile-sample/tree/main/08-fault_tolerance>

MicroProfileをテーマにブログを連載しています。他の記事もよければ以下のリンクからどうぞ！
- [逆張りのMicroProfile ～ Helidonで始めるマイクロサービスへの一歩 ～](/msa/#逆張りのmicroprofile-～-helidonで始めるマイクロサービスへの一歩-～)

[[TOC]]

:::info
この記事はJava17+Helidon 3.0.1 + MicroProfile Fault Tolerance 4.0をもとに作成しています。
MicroProfile Fault Toleranceの詳細は[公式マニュアル](https://download.eclipse.org/microprofile/microprofile-fault-tolerance-4.0/microprofile-fault-tolerance-spec-4.0.html)を参照くだい。
:::

# 設定機能の概要
MP Fault Toleranceに対する指定は前回まで見てきたとおり、すべてアノテーションで行うことができますが、全体に対する指定やアノテーションで指定した属性値の上書きなどはMicroProfile Config[^1]の設定ファイルで行うことができます。今回はこのMP Fault Toleranceの設定機能を設定例を交えながら説明していきます。

[^1]: MicroProfile Config(MP Config)は[第6回 お手軽便利MicroProfile Config](/msa/mp/cntrn06-mp-config/)で詳しく説明しています。

# アノテーションで指定した設定を上書きしたい
次の3つのレベルでアノテーションで指定した属性値を上書きできます。
- メソッドに指定されている個々のアノテーションに対する属性値の上書き
- クラスに指定されているアノテーションに対する属性値の上書き
- アプリケーション全体のアノテーションに対する属性値の上書き

上書きする際の設定キーの書式は以下になります。
`<classname>/<methodname>/<annotation>/<parameter>`

上記は一番細かいレベルのメソッドに指定されているアノテーション設定を上書きする書式となります。クラスに指定されているものを上書きする場合は`<classname>`が、アプリケーション全体の場合は`<classname>`と`<methodname>`の指定が不要となります。

それでは、以下のコードを題材にそれに対する設定例をみていきましょう。

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

このコードに対し以下の設定をした場合、実行時に`execB`の`maxDuration`属性の値が10000(msec)で上書きされます。なお、ここでの設定はすべてMicroProfile Config標準の`microprofile-config.properties`に対する例となります。
```shell
io.extact.sample.FtClient/execB/Retry/maxDuration=10000
```

次に以下の設定をした場合はクラスに指定されている`@Timeout`の`value`属性の値が10000(msec)で上書きされ、結果、実行時に`execA`, `execB`, `execC`のタイムアウト値が10000(msec)になります。
```shell
io.extact.sample.FtClient/Timeout/value=10000
```

最後にアプリケーション全体に対する指定は次のとおりになります。この場合はすべての`@Retry`に対する`maxRetries`属性の値が1で上書きされ、結果、アプリケーション全体でリトライ回数が1回に統一されます。
```shell
Retry/maxRetries=1
```

:::alert:上書きできるものはアノテーションに指定がある属性のみ
設定で上書きできるのはあくまでもアノテーションに指定したもののみで、アノテーションに指定されていない属性を足したりすることできません。例えば次のようなアノテーション指定と設定があった場合、実行時の内容は`@Retry(maxRetries = 3, delay = 1000)`のままで、`maxDuration=10000`が追加されることはありません。

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
}
```
```shell
io.extact.sample.FtClient/execA/Retry/maxDuration=10000
```

また、これはクラス指定にも同様にいえることで、次のように設定してもFtClientクラス全体に`@Bulkhead(3)`が追加されることはありません。

```shell
Bulkhead/value=3
```

設定は指定されたレベルで一致するアノテーション属性があった場合にその属性値を単純に上書きするのみで、ソースコードに指定されていない属性を追加することはありません。また、該当がない要素に対する設定は無視されます[^2]。
:::

[^2]: 無視されるのはいいのですが、Helidonの現状の実装では警告ログもでないため、 設定誤りに気づきづらいのが難点です。

# フォールトトレランス機能を個別に無効化したい
アプリケーションの稼働環境などによりタイムアウトやリトライなどのフォールトトレランス機能を無効化したい場合があります。このような場合は設定で個別に機能を無効化することができます。

この無効化する設定キーの書式は以下になります。
`<classname>/<methodname>/<annotation>/enabled=false`

設定方法は先ほどの[アノテーションを上書きする場合](#アノテーションで指定した設定を上書きしたい)と同じです。
```shell
# 1. メソッド単位で無効化
io.extact.sample.FtClient/execC/Retry/enabled=false
# 2. クラス単位で無効化
io.extact.sample.FtClient/Retry/enabled=false
# 3. アプリケーション単位で無効化
Retry/enabled=false
```

1.はメソッド個別に無効化する例で、2.はクラス、3.はアプリケーション全体で機能を無効化する例となります。

なお、無効化されている機能を環境変数などで有効化する場合は`true`を指定します。


# フォールバック機能以外をすべて無効化したい
サービスメッシュなどアプリケーション外部の仕組みでフォールトトレランス機能を代替することを想定し、機能個別ではなくフォールバック以外の機能を一括して無効化する設定が用意されています。無効化対象からフォールバック機能が除かれるのはフォールバック処理はアプリケーションロジックであるため、アプリケーション外部の機能では代替できないことを想定してのためです。

この指定を行う場合は以下を設定します。
`MP_Fault_Tolerance_NonFallback_Enabled=false`

先ほどの個別の無効化機能で明示的に`true`で有効化されている機能がある場合は、そちらが優先されます。つまり、次のような設定がされている場合、フォールバック機能に加えバルクヘッド機能も有効となります。

```shell
MP_Fault_Tolerance_NonFallback_Enabled=false
Bulkhead/enabled=true
```

# まとめ
MicroProfile Configの設定（機能）を使っているため、リトライ回数やタイムアウトなどの条件を環境変数を使って上書きすることができます。この辺りの値は最初から一発で決まるものではなく、また環境によっても調整が必要になることからリビルドせずに条件を変更できるのはとても便利です。また、このようなことを簡単にできるのがマイクロサービスに必要な仕様を一貫して提供するMicroProfileの利点といえます。

