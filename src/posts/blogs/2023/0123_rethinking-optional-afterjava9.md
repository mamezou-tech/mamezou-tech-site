---
title: Optionalの見直し – Java9で追加された便利なメソッド
author: toshio-ogiwara
date: 2023-01-23
tags: [java]
---
OptionalクラスはJava8で追加された当初はStream APIやラムダと同じように大いに話題になり、ネットで取り上げられることも多かったですが、その後はOptionalクラスがJavaの標準APIとして定着するに従い、注目されることもなくなっていきました。そんなOptionalクラスですが地味にJava9で便利なメソッドが追加され進化していることに(今さら)気がつきました。

ということで、今回はJava9でOptionalに追加されたメソッドの便利な使い方を自分の備忘兼ねて紹介したいと思います。

## or - フォールバック処理が断然見やすくなる
プログラムでは「ある処理が期待どおりでなかった場合は別の処理を行い、その処理も期待どおりでなかった場合はさらに別の処理を行う」といったフォールバック処理を書くことがよくあります。

旧来はこのような処理はif文で分岐しながら記述する必要がありましたが、Java9で追加された`Optional#or`メソッドを使うことで分岐を使わずスッキリと処理を記述できるようになりました。

例えば「ファイル、classpathリソース、URLの順で引数で渡されたパスの解決を試み、最初に解決できたパスから値を取得する」といった処理があった場合、旧来はif文で次のように処理を記述する必要がありました。

- if文を使った旧来の例
```java
public String resolveValue(String path, String defaultValue) {
    Optional<String> val = fromFilePath(path);
    if (val.isPresent()) {
        return val.get();
    }
    val = fromResourcePath(path);
    if (val.isPresent()) {
        return val.get();
    }
    val = fromUrlPath(path);
    if (val.isPresent()) {
        return val.get();
    }
    return defaultValue;
}
private Optional<String> fromFilePath(String path) {
    return path.startsWith("file:") 
            ? Optional.of("file value") 
            : Optional.empty();
}
private Optional<String> fromResourcePath(String path) {
    return path.startsWith("jar:") 
            ? Optional.of("jar value") 
            : Optional.empty();
}
private Optional<String> fromUrlPath(String path) {
    return path.startsWith("http:") 
            ? Optional.of("url value") 
            : Optional.empty();
}
// --- 利用コードイメージ
var val1 = resolveValue("jar:file:/foo/bar/target", "unknown value");
var val2 = resolveValue("net:/foo/bar/target", "unknown value");
```

別のやり方としてif文を使わずすごく頑張ってOptionalを使って記述した場合、次のような`orElseGet`メソッドが入れ子になったパズルのような実装になります。

- `Optional#orElseGet`メソッドで頑張り過ぎた例
```java
public String resolveValue(String path, String defaultValue) {
    return fromFilePath(path)
            .orElseGet(() -> fromResourcePath(path)
                    .orElseGet(() -> fromUrlPath(path)
                            .orElse(defaultValue))

            );
}
...
```

いずれもイマイチでしたが、これを`Optional#or`メソッドを使って書くと次のようにスッキリと記述することができます。（気持ちイイぃー

- `Optional#or`メソッドでスッキリした例
```java
public String resolveValue(String path, String defaultValue) {
    return fromFilePath(path)
            .or(() -> fromResourcePath(path))
            .or(() -> fromUrlPath(path))
            .orElse(defaultValue);
}
...
```

`orElseGet`メソッドと`or`メソッドは一見同じようなことをしているように見えますが戻り値が異なります。`orElseGet`メソッドの戻り値は型パラメータのT、例の場合はStringとなるため、returnする時点で戻す値を決定する必要があるのに対して、`or`メソッドはOptionalを返せるため「値がなかったら」の分岐をメソッドチェーンで繋げていくことができるようになっています。

これはすごく便利ですので、Java9以上を使っている人は必須で覚えるべきコーディングスタイルといえるでしょう。

## ifPresentOrElse – 値がなかった場合の処理も書ける
Java8でもOptinalの値がなかった場合のConsumer処理(値を戻さない処理)を`ifPresent`メソッドで記述することができましたが「なかったら」に相当するelse句はOptionalのメソッドで書くことができませんでした。

このため「値があったらその値をコンソールに出力し、値がなかった場合は固定の文字列を出力する」といった処理が合った場合、次の例のようにif文を使って記述する必要がありました。

- if文を使った例
```java
public void outputValue(String path) {
    Optional<String> value = fromFilePath(path);
    if (value.isPresent()) {
        System.out.println(value.get());
    } else {
        System.out.println("unknown value");
    }
}
...
```

これもイマイチといいますか、`ifPresent`メソッドでthen句の相当する処理が書けるなら、else句も同じように書きたいなぁ～と思っていたところ、Java9で追加された`ifPresentOrElse`メソッドで次のように記述できるようになっていました。

- `ifPresentOrElse`メソッドを使った例
```java
public void outputValue(String path) {
    fromFilePath(path).ifPresentOrElse(
            System.out::println,                        // then句の処理
            () -> System.out.println("unknown value")); // else句の処理
}
...
```

if文と`ifPresentOrElse`メソッドを使った例を見比べると「if文の方が直観的でいい気がするんですが・・」という声が聞こえてきそうですが、筆者もif文の方が良いかなぁ～と若干思ったりもします。

とは言うもののthen句とelse句に記述する処理が短ければ、やはり`ifPresentOrElse`メソッドの方がスッキリしていると思いますし、なにより`ifPresentOrElse`メソッドではラムダが使えるので例のようにメソッド参照を使うことで少しかっこよく書くことができます。


## isEmpty – 地味だがメソッド参照で威力を発揮
Optionalには「値が存在するか」を調べる`isPresent`メソッドは当初からあったため、その反対の「値が存在しないこと」を調べることについても困ることはありませんでした。しかし、メソッドの対称性やListやMapなどのメソッドとの一貫性からそもそも論として`isEmpty`メソッドもあった方がベターでした。ただ、それ以上にStream APIで存在しなかった場合に否定条件が簡潔に書けなくなるのが個人的にイマイチでした。

例えばリスト要素に含まれる空要素をカウントしようとした場合、次のようにラムダ式で書く必要がありました。
- `isPresent`メソッドを使った例
```java
List<Optional<String>> optList = List.of(Optional.of("1"), Optional.empty(), Optional.of("3"));
long nullCount = optList.stream()
        .filter(v -> !v.isPresent()) // ラムダで否定条件を記述
        .count();
```

このコードになんの不満があるの？と思う方もいるかも知れませんが、この`filter`メソッドの条件が「存在するか？」の肯定条件だった場合、`Optional::isPresent`とメソッド参照で簡潔に書くことができます。これを否定形にするだけで冗長な記述にならざるを得ないことに筆者は不満でした。

と思っていましたが、Java9から追加された`isEmpty`メソッドを使うことで次のようにメソッド参照を使ってスッキリ記述することができるようになりました。

- `isEmpty`メソッドを使った例
```java
List<Optional<String>> optList = List.of(Optional.of("1"), Optional.empty(), Optional.of("3"));
long nullCount = optList.stream()
        .filter(Optional::isEmpty) // メソッド参照で記述可能
        .count();
```

ちなみに`Stream#filter`メソッドで否定条件を使うと記述が冗長になることはOptionalクラス以外でもよく起きていたため、その対処としてJava11から`Predicate.not`メソッドが追加され、この問題は全体的に緩和されています。参考までに先ほどの例を`Predicate.not`メソッドを使って書き直すと次のようになります

- `Predicate.not`メソッドを使った例
```java
List<Optional<String>> optList = List.of(Optional.of("1"), Optional.empty(), Optional.of("3"));
long nullCount = optList.stream()
        .filter(Predicate.not(Optional::isPresent)) // notメソッドの利用
        .count();
```

## orThrow – 例外送出をショートカット
値がなかった場合にOptionalで例外を送出するには次のように`orThrow`メソッドの引数に例外の送出処理を記述する必要がありました。

- `orThrow`メソッドで送出処理を渡す例
```java
public String getValue2(String path) {
    return fromFilePath(path)
            .orElseThrow(IllegalArgumentException::new); // 例外送出(コントラクタ参照)
}
```

値がなかった場合に行う例外送出は捕捉処理で必要となる情報を設定するといったことは余りなく、単に処理を中断したいだけということが往々にしてあります。このような場合にもJava8までは上記例のようになんらかの例外送出処理を記述する必要がありました。

これに対してJava9から追加された引数なし`orThrow`メソッドを使うことで次のように簡潔に例外を送出させることができます。

- 引数なし`orThrow`メソッドで送出処理を渡す例
```java
public String getValue(String path) {
    return fromFilePath(path).orElseThrow(); // 引数不要
}
// 送出例外のスタックトレース
Exception in thread "main" java.util.NoSuchElementException: No value present
	at java.base/java.util.Optional.orElseThrow(Optional.java:377)
    ...
```

ただしこれは単に処理を中断させたいだけの場合は使うことができますが、エラー原因が分かりやすいように引数の情報を例外メッセージに設定するといった例外個別の処理を行いたい場合には使うことができません。このような場合は従来どおり次のように`orThrow`メソッドに例外の送出処理を記述する必要があります。

- `orThrow`メソッドで例外メッセージを設定する場合の例
```java
public String getValue2(String path) {
    return fromFilePath(path)
            .orElseThrow(() -> new IllegalArgumentException("path=" + path)); // メッセージを設定
}
```

## まとめ
OptionalやStreamを使っているとifを見ると消したくなるといった衝動にかられ、むやみやたらにOptionalやStreamでなんとかしたくなりますが、大事なのはスッキリしているか？エレガントか？です。Optionalを頑張って使ってif文をなくしたからといって常にエレガントになるとは限りません。かえって不細工になることもあります。ですので、用法、用量に気を付けて使いましょう！


