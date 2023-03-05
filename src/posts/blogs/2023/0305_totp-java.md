---
title: Javaコードで理解するTOTPの仕組み
author: shigeki-shoji
date: 2023-03-05
tags: [Security, "認証/認可", java]
---

[庄司](https://github.com/edward-mamezou)です。

システムやサービスへのアクセスでユーザ名とパスワードだけの認証はセキュリティが弱く、多くのサービスでは多要素認証 (Multi-Factor Authentication) の利用が一般的になっています。

例えば AWS アカウントのルートユーザーアクセスでは多要素認証 (MFA) の利用が強く推奨され、企業のポリシー等でも MFA の利用が強制されることも増えています。

多要素認証では、TOTP (Time-Based One-Time Password) を利用するもの以外にも SMS や生体認証を用いるものなどいくつかありますが、この記事では TOTP の仕組みについて解説します。

## 仕様

TOTP の仕様は次のドキュメントがあります。

- [TOTP: Time-Based One-Time Password Algorithm](https://tools.ietf.org/html/rfc6238)

このドキュメントの [Appendix A](https://www.rfc-editor.org/rfc/rfc6238#appendix-A) には Java を使ったサンプルコードがあり、テストデータは [Appendix B](https://www.rfc-editor.org/rfc/rfc6238#appendix-B) にあります。

また、さまざまなサービスの MFA でサポートされているアプリケーション Google Authenticator のソースコードは [GitHub リポジトリ](https://github.com/google/google-authenticator)に公開されています。

## Secret

MFA を有効にするとき、最初にQRコード[^1]を読んで初期化することが多いでしょう。読み込むと次のような URI が書かれています。

```text
otpauth://totp/{user}@{servicename}?secret={secret}
```

TOTP で使用するのは、シークレット (`secret`) の部分になります。このシークレットは、[Base32](https://www.rfc-editor.org/rfc/rfc4648#section-6) フォーマットによりエンコードされているため、Java 標準ライブラリでデコードできません。

かわりに [Apache Commons Codec](https://commons.apache.org/proper/commons-codec/) の Base32 が使用可能です。

```java
import org.apache.commons.codec.binary.Base32;

byte[] decodedSecret = new Base32().decode(secret);
```

## 時間

TOTP で使用する時間は、エポック秒 (1970年1月1日午前0時0分0秒からの経過秒数) を 30 で割って求め、これをバイト配列に変換します。バイト配列のサイズは、long 値であるため 8 バイトです。

```java
import java.time.Instant;
import java.nio.ByteBuffer;

long t = Instant.now.getEpochSecond / 30;
byte[] time = ByteBuffer.allocate(8).putLong(t).array();
```

## HMAC

これで生成する準備が整いました。では、シークレットと時間を使って One-Time Password の元となるハッシュ値を求めます。

```java
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

Mac hmac = Mac.getInstance("HmacSHA1");
SecretKeySpec keySpec = new SecretKeySpec(decodedSecret, "RAW");
hmac.init(keySpec);
byte[] hash = hmac.doFinal(time);
```

## ワンタイムパスワードコード

ワンタイムパスワードの生成には RFC4226 も関連しています。RFC4226 の「[5.3. Generating an HOTP Value](https://www.rfc-editor.org/rfc/rfc4226#section-5.3)」の手順を確認します。

Step 1 の値は HMAC のところで求めました。

Step 2 では、このバイト配列のオフセットを動的に決定します。バイト配列 (`HmacSHA1` のハッシュ値のバイト配列サイズは 20 byte) の最後にある下位の 4 bit を取得します。

```java
int offset = hash[19] & 0xf;
```

このオフセットの値を使って、4 byte のバイト配列を取得して int に変換しますが、マイナス値にならないよう、最上位は 0x7f でマスクします。

```java
int binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);
```

必要な桁数 (ここでは 6 桁) を余剰を使って求めます。

```java
int otp = binary % 1000000;
```

Step 3 に書かれているように文字列に変換します。

```java
System.println(String.format("%06d", otp));
```

## おわりに

この記事で、TOTP のコード生成では一方向ハッシュを用いていること、取り出す値の位置はハッシュ値から動的に決定して固定の位置の値ではないことをコードを使って解説しました。

このような仕組みであるためコードから一意のシークレットを求めることは非常に困難です。ただしシークレットの取り扱いには注意が必要です。

## 参考

- [AWSではじめるクラウドセキュリティ: クラウドで学ぶセキュリティ設計/実装](https://www.amazon.co.jp/dp/4910313036)

[^1]: QRコードは株式会社デンソーウェーブの登録商標です。