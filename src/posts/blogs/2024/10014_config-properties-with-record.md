---
title: Springの小話 - ConfigurationPropertiesにrecordクラスを使ってみた
author: toshio-ogiwara
date: 2024-10-14
tags: [java, spring, spring-boot, Springの小話]
image: true
---
Java16でrecordクラスが正式化されてからそれなりに時間が経ち、今ではすっかり普通に使われるようになりました。筆者はデータクラスの実装にLombokを使っていますが、そろそろ若干の後ろめたさを感じてきました。そんなこともあり最近重い腰をやっと上げ、まずはSpring Bootの`@ConfigurationPropeties`のバインドクラスをLombokからrecordクラスに変えてみました。今回はそこで得たrecordクラスの利用法や使用感を紹介したいと思います。最初に結論をいってしまうと、recordクラス、Lombokの`@Data`と遜色なく使えて便利でお勧めです。

:::info
この記事はSpring Boot 3.3.4で動作を確認しています。また記事で説明したコードはGitHubの[こちら](https://github.com/extact-io/configurationproperties-with-record)にアップしています。
:::

# Lombokの`@Data`を使った例
実装法や使用感は従来のLombokを使ったバインドクラスをrecordクラスに変えてみるのがわかりやすいと思います。ということで、今回は次の設定とクラスを例にrecordクラスではどうなるかを説明していきます。

- `@ConfigurationPropeties`でバインドする設定
```yaml
test:
  jwt-issuer:
    enable: true
    private-key: classpath:/jwt.key
    clock:
      type: FIXED
      fixed-datetime: 2024-02-01T12:30 # typeがSYSTEMの場合は無視される
    claim:
      issuer: JwtIssuerProperties
      exp: 30 # 有効期限（分単位）
```

- `@ConfigurationPropeties`で設定をバインドするクラス
```java
@ConfigurationProperties(prefix = "test.jwt-issuer")
@Validated // (1)
@Data // Lombokでgetter/setterを生成
public class JwtIssuerDataProperties {

    private boolean enable = false; // (2)
    @NotNull // (3)
    private RSAPrivateKey privateKey;
    private ClockProperties clock = new ClockProperties(); // (4)
    private Claim claim = new Claim(); // (5)

    @Data
    public static class ClockProperties {
        enum Type {
            SYSTEM,
            FIXED
        }
        private Type type = Type.SYSTEM; // (6)
        private LocalDateTime fixedDatetime;
        public Clock getClock() { // (7)
            return switch (type) {
                case SYSTEM -> Clock.systemDefaultZone();
                case FIXED -> Clock.fixed(getFixedInstant(), ZoneId.systemDefault());
            };
        }
        public Instant getFixedInstant() { // (8)
            return fixedDatetime.atZone(ZoneId.systemDefault()).toInstant();
        }
    }

    @Data
    public static class Claim {
        private String issuer;
        @PositiveOrZero // (9)
        private int exp = 60;  // (10)
        public Instant getExpirationTime(Instant creationTime) { // (11)
            return creationTime.plusSeconds(exp * 60);
        }
    }
}
```

`@ConfigurationPropeties`がもつ機能をある程度網羅する例を使いたかったため、アプリで実際に使っているJWTの設定クラスを使っていることもあり若干難しく見えますが、`@ConfigurationPropeties`での利用を前提とした場合、注目するポイントは次になります。（逆にいうと他はあまり気にしなくてもOKです）
1. バインドする設定が存在しなかった場合の初期値を定義している → (2)(6)(10)
2. ネストしたオブジェクトを持っている → (4)(5)
3. バインドされた値をもとにした導出メソッドを持っている → (7)(8)(11)
4. BeanValidationによる設定値の検証を行っている → (1)(3)(9)
5. Stringの設定値から`RSAPrivateKey`型[^1]やenum型、`LocalDateTime`型などへの型変換が自動で行われる

[^1]: `RsaKeyConversionServicePostProcessor`のBeanが登録されていればパス(String)から`RSAPrivateKey`の型変換を自動で行うことができます。通常このPostProcesorは`@EnableWebSecurity`で登録されます。なおサンプルでは秘密鍵をクラスパス上に置いていますが、非常に重要なデータなので、本番環境ではセキュリティが確保された安全な場所に配置しましょう。

:::column: 設定値のバインドはフィールドアクセスで行われる
`@ConfigurationPropeties`は設定キーにマッチするフィールドにキーに対する設定値をバインドする機能ですが、この設定値のバインドはプロパティアクセス(setter呼び出し)ではなくフィールドアクセスで行われます。したがって、実はバインドクラスにgetter/setterがなくても設定値はフィールドにバインドされます。

これを考えるとバインドクラスに用いるLombokのアノテーションはgetter/setterの両方を生成する`@Data`ではなく、getterしか生成しないイミュータブルな`@Value`がよい気がしますが1点だけ難点があります。それは初期値を持つフィールドに`@NonFinal`が必要になることです。

```java
@ConfigurationProperties(prefix = "test.jwt-issuer")
@Validated
@Value
public class JwtIssuerDataProperties {
    private @NonFinal boolean enable = false; // ← @NonFinalが必要
    ...
```

`@Value`はデフォルトですべてのフィールドをfinalにするため、`@NonFinal`を付けないとインスタンス生成時にフィールドの値が初期値でfixされてしまいます。筆者はこの点が好みではないため、作法的にはイミュータブルな`@Value`がよいと思いつつ、ミュータブルな`@Data`を使っています。（賛否両論あると思いますが）
:::

# recordクラスを使う場合のキモ
では、先ほどのLombokのバインドクラスをrecordクラスの実装に変えてみたいと思いますが、ここでキモとなるのが初期値の設定です。

recordクラスはフィールドを宣言しないため、「普通のクラス」のようにフィールド宣言時に初期値を設定することはできません。また、recordクラスで初期値を定義する場合は次のように外から指定する値だけを引数に持つコンストラクタを新たに定義し、それを呼び出すことが定石ですが`@ConfigurationPropeties`で使うことができるコンストラクタは１つだけです。よって、この定石も使えません。

```java
@ConfigurationProperties(prefix = "test.jwt-issuer")
@Validated
public record JwtIssuerRecordProperties2(
        boolean enable,
        RSAPrivateKey privateKey,
        ClockProperties clock,
        Claim claim) {

    public JwtIssuerRecordProperties2 (
            RSAPrivateKey privateKey,
            ClockProperties clock,
            Claim claim) {
        // コンストラクタをオーバーロードして初期値を設定
        this(false, privateKey, clock, claim); 
    }
    ...
```

# recordクラスを使った例
そこで登場するのが`@DefaultValue`です。Spring Bootにはrecordクラスの初期値の設定として`@DefaultValue`が用意されています。この`@DefaultValue`を使ったrecordクラスの実装は次のようになります。

```java
@ConfigurationProperties(prefix = "test.jwt-issuer")
@Validated
public record JwtIssuerRecordProperties(

        @DefaultValue("false") // (1)
        boolean enable,
        @NotNull
        RSAPrivateKey privateKey,
        @DefaultValue // (2)
        ClockProperties clock,
        @DefaultValue // (3)
        Claim claim) {

    public static record ClockProperties(
            @DefaultValue("SYSTEM") // (4)
            Type type,
            LocalDateTime fixedDatetime) {
        enum Type {
            SYSTEM, FIXED
        }
        public Clock clock() {
            return switch (type) {
                case SYSTEM -> Clock.systemDefaultZone();
                case FIXED -> Clock.fixed(getFixedInstant(), ZoneId.systemDefault());
            };
        }
        public Instant getFixedInstant() {
            return fixedDatetime.atZone(ZoneId.systemDefault()).toInstant();
        }
    }

    public static record Claim(
            String issuer,
            @DefaultValue("60") // (5)
            @PositiveOrZero
            int exp) {
        public Instant expirationTime(Instant creationTime) {
            return creationTime.plusSeconds(exp * 60);
        }
    }
}
```

## 値フィールドに対する`@DefaultValue`の指定
recordクラスでは(1)(4)(5)のように初期値を設定したいコンストラクタ引数に`@DefaultValue`で初期値を指定します。

Spring Bootはrecordクラスのコンストラクタを呼び出す際、引数にバインドする設定がない場合にnullを設定しますが、引数に`@DefaultValue`が付けられている場合は、アノテーションに指定されている文字列をSpring Frameworkが持つ型変換サービス(ConversionService)を使って引数の型に変換し、変換した値を設定することで初期値の設定を実現しています。

## ネストしたオブジェクトに対する`@DefaultValue`の指定
同じ`@DefaultValue`の指定でも(2)と(3)は上述の初期値の設定とは少し意味合いが異なります。

(2)と(3)の`@DefaultValue`の指定はデフォルトでネストしたクラスの空のインスタンスを生成する意味となります。この空のインスタンスが生成される際も(4)と(5)の初期値の設定は有効となります。逆に(2)と(3)の`@DefaultValue`指定がなく、かつそれぞれが持つフィールドに対する設定が1つも存在しなかった場合は`clock`フィールドと`claim`フィールドはnullとなります。

## 導出メソッドの定義や型変換など
導出メソッドの定義や型変換、BeanValidationによる検証はLombokの`@Data`クラスや「普通のクラス」と全く同じように行うことができます。

# recordクラスではできないこと
ここまでの内容を見るとrecordクラスは「普通のクラス」と遜色なく`@ConfigurationPropeties`のバインドクラスとして使うことができるように見えますが、筆者が知る限り1つだけrecordクラスにできないことがあります。

それはJavaConfigによるバインドプロパティの指定です。Lombokの`@Data`クラスなど「普通のクラス」の場合、次のようにすることでバインドプロパティを実行時に決定することができます。

- JavaConfigを使いバインドプロパティを実行時に決定する例
```java
@Bean
@ConfigurationProperties(prefix = "test.jwt-issuer")
JwtIssuerDataProperties jwtIssuerDataProperties() {
    // JwtIssuerDataPropertiesには@ConfigurationPropertiesを付けない
    return new JwtIssuerDataProperties(); 
}
```
<br>

このような使い方はプレフィックスが異なるだけの設定が複数ある場合に使ったりしますが、これはrecordクラスではできません。

上述のコラム欄にも書きましたが「普通のクラス」ではバインドクラスのインスタンスが生成された後にフィールドアクセスによる値の設定が行われますが、recordクラスのフィールドは内部的にfinalであるため、インスタンス生成後にフィールドの値を変更することはできません。これがrecordクラスではできない理由となります。

# さいごに
最後に説明したJavaConfigによるバインドプロパティの指定はrecordクラスではできませんが、このケースが必要となるのは筆者の経験上、かなり稀です。

recordクラスはJavaの言語仕様に含まれる標準機能でかつ、Lombokの`@Data`に比べても機能的に大きな遜色はなく、イミュータブルなデータクラスを簡潔に記述できることから、`@ConfigurationPropeties`には原則recordクラスにし、JavaConfigによるバインドプロパティの指定など、recordクラスではできないケースがある場合にのみLombokを使うようにするのがよいのではないかと思います。
