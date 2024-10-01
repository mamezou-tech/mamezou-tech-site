---
title: Springの小話 - @RestControllerをJavaConfigでBean登録したい！
author: toshio-ogiwara
date: 2024-10-02
tags: [java, spring, spring-boot, Springの小話]
image: true
---
皆さん@RestControllerをJavaConfigでBean登録したいと思ったことはありませんか？私は共通コンポーネント的なものを作ることが多いため、これはよく思ったりします。今回のSpringの小話はそんなお悩みに対するTipsの紹介となります。

## なぜJavaConfigでBean登録したいか？
皆さんもご存じのとおり@RestControllerは@Componentを含むメタアノテーションのため、@RestControllerのクラスがコンポーネントスキャンのパス上に存在する場合、いやおうなくBean登録されてしまいます。これがアプリのクラスであれば問題になることはないですが、共通コンポーネントとして作成する場合は問題となります。

共通コンポーネントとする場合、ライブラリに含めるがそれを使うか、つまりBeanとして登録するかはJavaConfigで利用者側で選択できるようにしたいことが多々ありますが、その一方で、SpringにRestControllerとして認識してもらうには@Componentを含む@RestControllerを付けるしかなく、次のようなJavaConfigによる登録はできません。

```java
@Bean
@RestController // ← これはできない！
JavaConfigurableController controller() {
    return new JavaConfigurableController();
}
```
<br>

できないものはしょうがないと「Bean登録したくないときはアプリで@ComponentScanの指定で除外してください」というのもエレガントさに欠けるためできれば避けたいです。

:::column:共通化で一番困るのは@RestControllerAdvice
今回の記事は多くの方に馴染みがあると思われる@RestControllerを取り上げて説明していますが、RESTのコントローラーを共通コンポーネント化したいことはあまりありません。このため@RestControllerの共通化で困ることは実際はありませんが、一番困るのは例外ハンドルを行う@RestControllerAdviceだったりします。

例外ハンドルは対向システムや発生するエラー条件により各アプリで共通になることが多くあるため、これを共通化してアプリに提供したいことはよくあります。しかし@RestControllerAdviceも@RestControllerと同じように@Componentを内包するメタアノテーションのため、JavaConfigで登録することができません。

このことからも分かるように今回のTipsは@RestControllerだけでなく@Componentを内包したすべてのメタアノテーションに対して使えるものとなります。
:::

## どうやってJavaConfigでBean登録するか
そんな@Componentを内包したメタアノテーションを付けたクラスをコンポーネントスキャンのBean登録の対象にせず、どうやってJavaConfigでBean登録可能にするかですが、結論からいうとその方法は「Conditionで@Componentの作用を常に無効化する」です。

例えば次のようなRESTのControllerがあったとします。
```java
@RestController
public class JavaConfigurableController {
    @GetMapping("/javaconfig")
    public String hello() {
        return "called javaconfig";
    }
}
```
<br>

このクラスがコンポーネントスキャンの対象に入っている場合、このままではBean登録されてしまうため、常にBean登録を無効化する次のConditionクラスを用意します。
```java
public class AlwaysFalseCondition implements Condition {
    @Override
    public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
        return false; // 常に条件に合致しない⇒Bean登録しない
    }
}
---
@Target({ ElementType.TYPE })
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Conditional(AlwaysFalseBootCondition.class)
public @interface SkipRegistration {
}
```
<br>

用意した無効化ConditionをControllerクラスに付けます。こうすることで常にコンポーネントスキャンによるBean登録は無効化されます。
```java
@RestController
@SkipRegistration
public class JavaConfigurableController {
    @GetMapping("/javaconfig")
    public String hello() {
        return "called javaconfig";
    }
}
```
<br>

これで@RestControllerはついているがコンポーネントスキャンはされないBeanクラスができたので、あとはこのBeanクラスを使いたいときにJavaConfigで登録するだけです。
```java
@Bean
JavaConfigurableController controller() {
    return new JavaConfigurableController();
}
```

:::info:Spring BootのSpringBootConditionを使った例
Spring Frameworkの範囲でもできるように素のConditionクラスを使った実装例を紹介しましたが、もちろんSpringBootConditionを使ってConditionEvaluationReportの対象とすることもできます（意味があるかは別として..）
```java
public class AlwaysFalseBootCondition extends SpringBootCondition {
    @Override
    public ConditionOutcome getMatchOutcome(ConditionContext context, AnnotatedTypeMetadata metadata) {
        ConditionMessage message = ConditionMessage
                .forCondition("AlwaysFalseCondition")
                .because("Condition always returns false");
        return ConditionOutcome.noMatch(message);
    }
}
```
:::

## おわりに
同様なことは他にも例えば@Profileの機能を使ってもできたりしますが、このためだけにプロファイルを増やすことには抵抗があります。ですので、@Profileを使うよりも今回の無効化作戦の方がエレガントだとは思っていたりします。ただ、その一方で強引に無効化する若干ハックまがいな手段であることは筆者自身も感じたりはしていますが、それなりに使っていても問題になることはないため、これが正解！と思うようになってきました。（あと他に妙案もないし・・）

とはいえ、本音はコンポーネントを意味する@ComponentとRESTのコントローラーであることを意味する@RestControllerは別々に定義できるようにしてくれればいいのにSpringさん、、と思うところではあります。

