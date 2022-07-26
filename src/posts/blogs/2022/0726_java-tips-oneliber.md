---
title: DTOとエンティティの変換コードをfluentなワンライナーで書いてみる
author: toshio-ogiwara
date: 2022-07-26
tags: [java]
templateEngineOverride: md
---

昨今のJavaアプリケーションではレイヤーアーキテクチャにしろ、Clean Architectureにしろ、DTOとエンティティを変換するコードが多く登場します。今回は冗長となりがちなDTOとエンティティの変換コードをラムダとインタフェースを使ってfluent(流暢)なワンライナーで書けるようにする小ネタを紹介します。

## 変更前のちょっと残念な変換コード
外部からの入力などをDTOで受け取り、それをエンティティに変換してサービスに渡す。逆にサービスから取得したエンティティを変換し外部へDTOとして出力するといった次のようなコードを皆さんも目にされたことがあると思います。

```java
public PersonDto getPerson(int id) {
    // 取得したエンティティをDTOに変換し結果として返却
    return convertToDto(service.getPerson(id));
}
public PersonDto updatePerson(PersonDto dto) {
    // DTOをエンティティに変換して更新
    var updatedEntity = service.updatePerson(convertToEntity(dto));
    // 更新後のエンティティをDTOに変換して結果として返却
    return convertToDto(updatedEntity);
}

private PersonDto convertToDto(Person entity) {
    return PersonDto.of(entity.getId(), entity.getName());
}
private Person convertToEntity(PersonDto dto) {
    return Person.of(dto.getId(), dto.getName());
}
```

呼び出した結果を変換する処理を素直に実装すると、例のようにカッコを書いてその中にメソッド呼び出しを書いて・・となり、コードを書くリズムがなにか良くないんだよなぁと思われたことはないでしょうか？また評価の順も右に行ってから左に行ってという感じとなり、直観的に理解もしずらいと感じたことはないでしょうか？

## fluentなワンライナーなコードへの改善
自然に読め、また流れるような(fluentな)感じでリズム良く書きるようにコードは左から右にドットで繋げて書いていきたいですよね。ということで、今回はこのコードをラムダ(メソッド参照)とインタフェースを使ってfluentな実装に変更してみます。

まずはDTOとエンティティの変換ですが、その変換知識はDTO自身が知っていればよいので、変換実装は次のようにDTOに持って行きます。(実装はLombokを利用した例となっています)

```java
@Getter
@AllArgsConstructor(staticName = "of")
static class PersonDto {
    private int id;
    private String name;
    Person toEntity() {
        return Person.of(this.id, this.name);
    }
    static PersonDto toDto(Person source) {
        return PersonDto.of(source.getId(), source.getName());
    }
}
```

次にfluentな気持ちでコードをどう読みたいかというと「サービスから取得したエンティティをDTOに変換する」な感じにしたいので、エンティティ自体に「XXXに変換」する責務を持たせる次のインタフェースを導出します。

```java
public interface Transformable {
    @SuppressWarnings("unchecked")
    default <T, R> R transform(Function<T, R> func) {
        return func.apply((T) this);
    }
}
```

そして導出したインタフェースを`Person`エンティティに`implements`します。

```java
@Getter
@AllArgsConstructor(staticName = "of")
static class Person implements Transformable {
    private int id;
    private String name;
}
```

これで準備は整ったので元のコードをTransformableインタフェースとメソッド参照を使って、fluentなワンライナーな実装にしてみます。
```java
public PersonDto getPerson(int id) {
    return service.getPerson(id).transform(PersonDto::toDto);
}
public PersonDto updatePerson(PersonDto dto) {
    return service.updatePerson(dto.toEntity()).transform(PersonDto::toDto);
}
```


冒頭でも触れましたが、昨今のJavaのアプリケーションではDTOとエンティティの変換のようなコードは至る所にでてきます。今回説明したように変換コードはDTO自体に、そして変換処理はインタフェースを切った上で変換対象であるエンティティに持たせることで、処理のまとまり（凝集性）もよくなり、またコードも読みやすくなります。
