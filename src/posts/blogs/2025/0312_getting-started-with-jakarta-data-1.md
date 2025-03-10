---
title: Jakarta EE 11 の新機能 Jakarta Data 1.0 を押さえておこう
author: naotsugu-kobayashi
date: 2025-03-12
tags: [java]
image: true
---


## Jakarta data とは

Jakarta Data 1.0 は、2025年2Qにリリース予定(？)の Jakarta EE 11 に新たに追加される仕様です。
Jakarta Data は、Jakarta Persistence や Jakarta NoSQL などを通じたデータ操作に対する抽象を提供し、データ アクセスを簡素化します。

Spring Data のように、リポジトリインターフェースを定義することで、データ アクセスの詳細がプラットフォームに応じて自動実装されます。

開発者は、例えば以下のようなリポジトリインターフェースを用意するだけです。

```java
@Repository
public interface BookRepository extends BasicRepository<Book, UUID> {

    @Find
    @OrderBy("id")
    Page<Book> bookByTitle(String title, PageRequest pageRequest);
  
    @Query("UPDATE BOOKS SET summary = :summary WHERE id = :id")  
    int update(UUID id, String summary);  
  
    @Save  
    Author addAuthor(Author entity);  
  
}
```

このリポジトリインターフェースは、CDIでインジェクトして以下のように使うことができます。

```java
@Inject  
private BookRepository repository;  
  
public List<Book> findAll() {
    return repository.findAll().toList();
}
 
public Optional<Book> getById(UUID id) {
    return repository.findById(id);
}
 
public Book create(Book book) {
    return repository.save(book);
}

public Page<Book> findBy(String title, PageRequest pageRequest) {  
    return repository.bookByTitle(title, pageRequest);
}
```

Jakarta Data の仕様策定初期は、Spring Data のようなインターフェースのメソッド名の命名規則によりクエリ構築(Query by Method Name)するのが主のような雰囲気がありましたが、この仕様は現在、拡張仕様となり将来削除される予定です。

Jakarta Data では、メソッド名によるクエリ(Query by Method Name)ではなく、メソッドのパラメータに基づく自動クエリ(Parameter-based automatic query methods)と注釈付きクエリメソッド(Annotated Query methods)を使ってクエリ操作します。

この辺りの用語は分かりにくいので以下にまとめておきます。

- Parameter-based automatic query methods ：`@Find`/`@Delete` アノテーションを付けたメソッドにおいて、メソッドの引数と戻り値に応じて自動的にクエリを構築する(**メソッド名は何でもよい**)
- Annotated Query methods：`@Query` により Jakarta Data Query Language(JDQL) でクエリを記述し、メソッドの引数でパラメータを指定する(**メソッド名は何でもよい**)
- Query by Method Name：いわゆる Spring Data 方式で、この仕様は既存のアプリケーションからの移行パスとしてのみ提供される(**メソッド名の命名規則でクエリ**)

Jakarta Data を大雑把に説明すれば、リポジトリインターフェースに`@Repository`でアノテートし、`@Find` または `@Query` で検索し、`@Insert`、`@Update`、`@Save`、`@Delete`  でデータを操作するメソッドを定義すればOK、加えて、Spring Data みたいにメソッド名でクエリ定義できるけど、これオプションだからね、となります。



## リポジトリ

リポジトリは、アプリケーションのドメイン ロジックと、RDB や NoSQL などのデータソースとの仲介役です。
Jakarta Data  は、リポジトリを介して Jakarta Persistence や Jakarta NoSQL を利用したデータアクセスに対する抽象を提供します。

Jakarta Data では `@Repository` アノテーションを付けたインターフェースでリポジトリを定義し、永続ストア内のデータを表すエンティティクラスのインスタンスに対するクエリ、取得、および変更の操作を公開することで、データ操作に対する合理化されたアプローチを提供します。

リポジトリは、Jakarta Data が組み込みで提供する `BasicRepository`(後述) などを継承して定義できます。

```java
@Repository
public interface BookRepository extends BasicRepository<Book, UUID> { }
```

`BasicRepository`には基本的なメソッドがあらかじめ定義されているので、簡単な Entity 操作であればこれだけで完結します。

リポジトリは、特定の命名規則や特定のエンティティに縛られない(複数のエンティティ操作を1つのリポジトリに束ねることもできる)ため、`BasicRepository` を継承せずに自由に定義することもできます。

```java
@Repository
public interface Garage {

    @Insert
    Car park(Car car);

    @Delete
    void unpark(Car car);
}
```

リポジトリを定義する上で、押さえておきたいのが、プライマリ エンティティ タイプという考え方です。
上記の `Garage` インターフェースのメソッドは、メソッドの引数で対象とするエンティティの型が決定できます。この型がプライマリ エンティティ タイプとなります。

しかし以下のようなケースでは、プライマリ エンティティ タイプが決定できません。

```java
@Delete
void unpark(String registration);
```

このようなメソッドは、以下のように、組み込みの DataRepository などのリポジトリ スーパーインターフェースを継承し、最初の型変数としてプライマリ エンティティの型を指定する必要があります。

```java
@Repository
interface Garage extends DataRepository<Car, Long> {
    @Delete
    void unpark(String registration);
}
```

プライマリ エンティティ タイプ は以下のように決定されます。


- `@Insert`、`@Update`、`@Save`、または `@Delete` でアノテーションされたリポジトリメソッドでは、エンティティタイプはメソッドのパラメータタイプから決定される
- 戻り値の型がエンティティ、エンティティの配列、または `List<E>` や `Page<E>` などのパラメータ化された型の find メソッドおよび delete メソッドでは、メソッドの戻り値の型から決定される
- 上記に該当しない場合は、リポジトリ スーパーインターフェースの型引数から決定される



リポジトリインターフェースには以下のメソッドを定義できます(`default`メソッドも定義できます)。

- エンティティインスタンスのライフサイクルメソッド
- 注釈付きクエリメソッド(Annotated Query methods)
- パラメータベースの自動クエリメソッド(Parameter-based automatic query methods)
- メソッド名によるクエリ(Query by Method Name)
- リソース アクセサ メソッド

これらについて以下で詳しく見ていきましょう(メソッド名によるクエリについては本ポストでは説明しません。[Query by Method Name Extension](https://jakarta.ee/specifications/data/1.0/jakarta-data-addendum-1.0.html)を参照してください)(リソースアクセサメソッドについても本ポストでは説明しません。[Resource accessor methods](https://jakarta.ee/specifications/data/1.0/jakarta-data-1.0.html#_resource_accessor_methods)を参照してください)。



## ライフサイクルメソッド

リポジトリ インターフェースにはエンティティ インスタンスのライフサイクルメソッドを定義できます。
ライフサイクルメソッドは、以下のライフサイクルアノテーションを付与します。

| アノテーション | 説明                             |
| -------------- | -------------------------------- |
| `@Insert`      | 1 つ以上のエンティティの状態をデータベースに追加することを示す |
| `@Update`      | 1 つ以上のエンティティの状態を更新することを示す               |
| `@Save`        | 存在する場合は更新し、そうでない場合は挿入する                 |
| `@Delete`      | 1 つ以上のエンティティの状態を削除することを示す               |

以下のような実装になります。

```java
@Insert
Book insert(Book book);

@Update
Book update(Book book);

@Save
Book save(Book book);

@Delete
void delete(Book book);
```

メソッドシグネチャには以下の制約があります。

- ライフサイクルアノテーションを付与するメソッドは、引数に `E`,  `List<E>`,  `E[]` のいずれかのパラメータが1つだけ必要
- 戻り値は、`void` またはパラメータと同じ型でなければならない(`@Delete`は `void` のみ)

`@Delete` はライフサイクルアノテーションですが、後述のパラメータベースの自動クエリメソッドとして使うこともできます。パラメータベースの自動クエリメソッドとして使われた場合は、上記の引数や戻り値の制限には当てはまりません。

Jakarta Persistence で使う場合は、`@Save` と `@Delete` だけを使えば事足ります。




## 注釈付きクエリメソッド(Annotated query methods)

リポジトリインターフェースのメソッドに `@Query` でクエリを指定したものが注釈付きクエリメソッド(Annotated query methods)です。
クエリには`select`, `update`, `delete` 文を指定できます。

クエリは Jakarta Data Query Language(JDQL) または Jakarta Persistence Query Language(JPQL) を使って指定します。

:::info:JDQL vs JPQL
JDQL は NoSQL での利用を考慮した JPQL のサブセットです。移植性を維持する場合は JDQL を使う必要があります。
JDQL については [jakarta_data_query_language](https://jakarta.ee/specifications/data/1.0/jakarta-data-1.0.html#_jakarta_data_query_language) を参照してください。
:::


注釈付きクエリメソッドは以下のアノテーションを使用します。

| アノテーション    | 説明                                               |
| ---------- | ------------------------------------------------ |
| `@Query`   | JDQL または JPQL でクエリ条件を定義する                        |
| `@Param`   | JDQL または JPQL のパラメータをメソッドの引数で指定する                |
| `@OrderBy` | JDQL または JPQL クエリ中で`ORDER BY` 句が指定されている場合は使用できない |


パラメータは、位置パラメータ、名前付きパラメータ、`@Param` アノテーションで以下のように指定します(名前付きパラメータで指定する場合には、コンパイルオプション `javac -parameters` によりパラメータ名がクラス ファイル内に保持されている必要があります)。

```java
// 位置パラメータ
@Query("where firstName = ?1 and lastName = ?2")
@OrderBy("lastName")
@OrderBy("firstName")
List<Person> byName(String first, String last);

// 名前付きパラメータ
@Query("where firstName || ' ' || lastName like :pattern")
List<Person> byName(String pattern);

// @Param 名前付きパラメータ
@Query("where firstName || ' ' || lastName like :pattern")
List<Person> byName(@Param("pattern") String nameLike);
```

メソッドシグネチャには以下の制約があります。

- メソッド名に特定の命名規則はない
- 引数にはクエリパラメータの他、後述の `Limit`, `Order`, `PageRequest`, `Sort` を指定可能
- `update` または `delete` 文の戻り値は、`void`, `int`, `long` のいずれか
- `select` 文の戻り値は以下の通り
    - 単一結果を返す場合 `R` (レコードが存在しない場合は`EmptyResultException`)
    - 最大1件の結果を返す場合 `Optional<R>`
    - 複数結果を返す場合 `List<R>`, `R[]`, `Stream<R>`, `Page<R>`, `CursoredPage<R>`


注釈付きクエリメソッド(`@Query`)では、文字列でクエリを指定するため、タイポなどのエラーが心配になります。
しかし Hibernate メタモデルプロセッサ は、アノテーションプロセッサ処理の中でチェックが行われるため、例えば `id` を `idx` と誤って記述していた場合、

```java
@Query("UPDATE BOOKS SET summary = :summary WHERE idx = :id")  
int update(UUID id, String summary);
```

以下のように対象メソッドがエラーとして報告され、コンパイルまで到達することはありません。

```
Could not interpret path expression 'idx'
```

なかなか良いです。



## パラメータベースの自動クエリメソッド(Parameter-based automatic query methods)

リポジトリインターフェースのメソッドに `@Find` または `@Delete` を付与したものがパラメータベースの自動クエリメソッド(Parameter-based automatic query methods)です。

注釈付きクエリメソッドでは以下のアノテーションを使用します。

| アノテーション    | 説明                                                                   |
| ---------- | -------------------------------------------------------------------- |
| `@Find`    | メソッドパラメータによりクエリ条件を定義する                                               |
| `@By`      | 永続フィールドとのマッピングを定義(`id(this)`という特別な表記はIDフィールドとのマッピングを意味する)(複合名は`_`連結) |
| `@OrderBy` | 並び替え条件を指定。複数指定時には指定された順序に従う                                          |

パラメータベースの自動クエリメソッドでは、メソッドの引数が自動的にクエリ条件として適用されます。
パラメータ名がクラスファイル内に保持されていないケース(`javac -parameters` でコンパイルされていない)では、`@By` にて永続フィールドとのマッピングを指定します。


```java
@Find
List<Person> findNamed(String firstName, String lastname);

@Find 
Person findByCity(String address_city);

@Find
@OrderBy("lastName")
@OrderBy("firstName")
Person findByCity(@By("address.city") String city);
```

複合名を連結する場合は、`_` で連結します(JDQLの場合は`.`で連結する点とは異なります)(`@By`及び`@OrderBy` は `_` と `.` のどちらでも可)。

メソッドシグネチャには以下の制約があります。

- メソッド名に特定の命名規則はない
- 引数にはクエリ条件の他、後述の `Limit`, `Order`, `PageRequest`, `Sort` を指定可能
- 引数のクエリ条件が無い場合は全件選択となる
- `@Delete` メソッドの戻り値は、`void`, `int`, `long` のいずれか
- `@Find` メソッドの戻り値は以下の通り
    - 単一結果を返す場合 `R` (レコードが存在しない場合は`EmptyResultException)
    - 最大1件の結果を返す場合 `Optional<R>`
    - 複数結果を返す場合 `List<R>`, `R[]`, `Stream<R>`, `Page<R>`, `CursoredPage<R>`


`@Find` による自動クエリメソッドはシンプルで使いやすいですが、例えば、部分一致や大なり小なりの条件指定は、Jakarta Data 1.0 時点ではサポートされていません(`@Pattern`アノテーションを追加するなどが検討されており、次期仕様のなかでサポートされる予定です)。
現在の所は、`@Query` にて JDQL を用いて条件を指定することになります。


注釈付きクエリメソッドの項で、JDQL のエラー検出について述べましたが、自動クエリメソッドでも同様です。
`Book` エンティティに `name` 属性が存在しない場合、

```java
@Find  
List<Book> bookByTitle(String name);
```

上記定義はアノテーションプロセッサ処理中に以下のようなエラーとなり、コンパイルが通ることはありません。

```
no matching field named 'name' in entity class 'example.Book'
```

こちらも、安心ですね。



## クエリの追加条件(Limit, Sort, Order, PageRequest)

`@Query` `@Find` `@Delete` でアノテートしたメソッドの引数には、以下のクエリ追加条件を指定できます。

| クラス        | 説明                                                       |
| ------------- | ---------------------------------------------------------- |
| `Limit`       | 取得される結果の数の制限を指定  |
| `Sort`        | エンティティ属性に基づいて並べ替えを要求。優先順位は基準リスト内の位置に応じて決る  |
| `Order`       | `Sort`を組み合わせてエンティティ属性に基づいてソートを要求。`@OrderBy`アノテーションによる静的ソートと同時に使用された場合、静的ソート基準が最初に適用され、その後に`Order`の条件が適用される |
| `PageRequest` | クエリ結果に指定された単一のページを要求する |

`Limit` は以下のように指定することで結果件数を制限します。

```java
products.findByNameLike(pattern, Limit.of(50)); // 結果数の最大値を制限
products.findByNameLike(pattern, Limit.range(51, 100)); // 開始位置と終了位置を制限
```


ソート条件は以下のように指定します。
```java
Employee[] findByYearHired(int yearHired, Sort<?>... sortBy);

employees.findByYearHired(2025, Sort.desc("salary"), Sort.asc("lastName")); // Sort
```

```java
Employee[] findByYearHired(int yearHired, Order<?> orderBy);

employees.findByYearHired(2025, 
    Order.by(Sort.desc("salary"), Sort.asc("lastName"))); // Order
```

ソートプロパティで複合名を指定するには、`.` または `_` で連結します(ソート条件は後述する Jakarta Data 静的メタモデルを使うことでタイプセーフな指定が可能になります)。


`PageRequest` はページサイズとページ数を指定して単一のページを要求します。

```java
@OrderBy("id")
Page<Person> findAll(PageRequest pageRequest);

Page<Person> page = people.findAll(PageRequest.ofPage(1).size(2)); // PageRequest
var results = page.content();

while (page.hasNext()) {
    var next = page.nextPageRequest();
    page = people.findAll(next);
    results = page.content();
}
```

`PageRequest` は `Limit` と合わせて指定することはできません。




## ページングサポート

Jakarta Data は2種類のページング操作をサポートします。

| インターフェース       | 説明                                                                     |
| -------------- | ---------------------------------------------------------------------- |
| `Page`         | オフセットベースのページング。固定ページサイズを使用し、ページ番号とサイズに基づいてデータを取得 |
| `CursoredPage` | カーソルベースのページング。エンティティの一意のキーの値により次ページまたは前ページを決定する |

カーソルベースのページングは、オフセットベースのページングと比較して、ページ要求間でデータベースにレコードが挿入、削除、または更新されたときに、結果が欠落したり重複したりする可能性が減ります(完全に防ぐことはできません)。

以下のように(`Page` と同じように)使うことができます。

```java
@OrderBy("lastName")
@OrderBy("firstName")
@OrderBy("id")
CursoredPage<Employee> findBy(int hours, PageRequest pageRequest);

page = employees.findByHoursWorkedGreaterThan(1500, PageRequest.ofSize(50));
page = employees.findByHoursWorkedGreaterThan(1500, page.nextPageRequest());
```
この時、次ページの要求は、現在のページの最後の結果を識別しているキー値に基づいて行われます。

明示的に最後のキーを指定することもできます。

```java
Employee emp = ...
PageRequest pageRequest = PageRequest.ofPage(5).size(50)
        .afterCursor(Cursor.forKey(emp.lastName, emp.firstName, emp.id));
page = employees.findBy(1500, pageRequest);
```

`PageRequest` や `Page` などが標準仕様として提供された意義は大きいと思います。毎回手作りが必要でしたしね。




## 組み込みのリポジトリスーパータイプ

Jakarta Data では組み込みのリポジトリインターフェースが提供されています。

| インターフェース        | 説明                                                                 |
| ----------------------- | -------------------------------------------------------------------- |
| `DataRepository<T, K>`  | リポジトリのルート階層。エンティティ型とそのキー型をタイプパラメータとして定義 |
| `BasicRepository<T, K>` | `DataRepository` を継承し、一般的な検索(`@Find`)、削除(`@Delete`)、保存(`@Save`)操作を提供 |
| `CrudRepository<T, K>`  | `BasicRepository` を継承し、insert と update 操作を追加 |

`DataRepository` は単なるマーカーインターフェースです。型引数として、プライマリ エンティティ タイプとエンティティIDの型を指定します。

```java
public interface DataRepository<T, K> { }
```

`BasicRepository` は単一のタイプのエンティティに適用される最も一般的な操作(`save` `find` `delete`)を提供します。

```java
public interface BasicRepository<T, K> extends DataRepository<T, K> {  
    @Save <S extends T> S save(S entity);  
    @Save <S extends T> List<S> saveAll(List<S> entities);  
  
    @Find Optional<T> findById(@By("id(this)") K id);  
    @Find Stream<T> findAll();  
    @Find Page<T> findAll(PageRequest pageRequest, Order<T> sortBy);  
  
    @Delete void deleteById(@By("id(this)") K id);  
    @Delete void delete(T entity);  
    @Delete void deleteAll(List<? extends T> entities);  
}
```

`CrudRepository` は、`BasicRepository`を継承し、`insert()`と`update()` を追加することで、CRUD 操作を提供します。

```java
public interface CrudRepository<T, K> extends BasicRepository<T, K> {
    @Insert <S extends T> S insert(S entity);
    @Insert <S extends T> List<S> insertAll(List<S> entities);
  
    @Update <S extends T> S update(S entity);
    @Update <S extends T> List<S> updateAll(List<S> entities);
}
```

Jakarta Persistence で使う場合は、`BasicRepository` を継承して自身のリポジトリインターフェースを定義することになるでしょう。



## Jakarta Data 静的メタモデル

Jakarta Data では、Jakarta Data 静的メタモデルがサポートされます。
Jakarta Data 静的メタモデルは、Jakarta Persistence の静的メタモデルが `Book` エンティティに対して `Book_.java` を生成するのに対して、`_Book.java` というクラスを生成します。

以下のような 静的メタモデル がアノテーションプロセッサにより自動生成されます。

```java
public interface _Book {

	String SUMMARY = "summary";
	String TITLE = "title";
	String ISBN = "isbn";
	String ID = "id";

	TextAttribute<Book> summary = new TextAttributeRecord<>(SUMMARY);
	TextAttribute<Book> title = new TextAttributeRecord<>(TITLE);
	TextAttribute<Book> isbn = new TextAttributeRecord<>(ISBN);
	SortableAttribute<Book> id = new SortableAttributeRecord<>(ID);
}
```

この静的メタモデルを使うことで `Sort.asc("title")` ではなく、`_Book.title.asc()` のようにソート条件を指定できます( `Sort.asc(_Book.title.name())` や `Sort.asc(_Book.TITLE)` のようにも書けます)。

```java
Page<Book>> findBy(PageRequest pageRequest, Order<Book> orderBy);
 ...
page = books.findBy(PageRequest.ofSize(10),
        Order.by(_Book.title.asc(), _Book.isbn.desc()));
```

現在 Jakarta Data 静的メタモデルはソートをタイプセーフに書けるという限定的なものですが、将来的には以下のようなクエリ条件のヘルパとして機能する提案も出ています(`between` ヘルパ)。

```java
repo.find(_Book.title.like("Jakarta Data%"), 
          _Book.publicationDate.between(pastDate, LocalDate.now())
```



## Jakarta Data 1.0 を試してみよう

ここまでで、Jakarta Data 1.0 の仕様について見てきましたが、実際に動かすのが一番でしょう。

Jakarta EE 11 プラットホームは正式リリース前ですが、2025年2月時点では、Wildfly, Quarkus, OpenLiberty 辺りで Jakarta Data を試すことができます(ただし、Jakarta Data は公開されて間もなく、いずれもプレビュー機能の域にあり、すんなり動かないこともあります)。

:::info:EclipseLink の動き
Hibernate は Jakarta Data 仕様をサポートしますが、EclipseLink は今のところ Jakarta Data 仕様をサポートする動きがありません。
そのため Glassfish や Payara は、Jakarta Data サポートが遅れています。
Jakarta Data をサポートする Eclipse JNoSQL から実装をポートするといった話はあるようです。
:::


ということで、ここでは Wildfly を使って Jakarta Data を動かす環境を作ってみましょう。



### プロジェクト作成


Wildfly では、開発を簡単に始められるように、Maven  Archetype が提供されています。

以下の Archetype があります。

- wildfly-jakartaee-webapp-archetype : Web Archive (war) 用の Maven project を作成
- wildfly-jakartaee-ear-archetype :  Entreprise Archive (ear) 用の Maven project を作成(warモジュールを含む)
- wildfly-subsystem-archetype : Wildflyサブシステム開発用の Maven project を作成
- wildfly-getting-started-archetype : 簡単なRESTサービスのサンプルコードを含む Maven project を作成

ここでは `wildfly-jakartaee-webapp-archetype` を使ってプロジェクトを作成しましょう。

```shell
mvn archetype:generate \
  -DgroupId=example \
  -DartifactId=jakarta-data-example \
  -Dversion=1.0-SNAPSHOT \
  -DarchetypeGroupId=org.wildfly.archetype \
  -DarchetypeArtifactId=wildfly-jakartaee-webapp-archetype \
  -DarchetypeVersion=35.0.1.Final
```

:::info:Windows環境での改行エスケープ
Windows コマンドプロンプトの場合は改行を `^` でエスケープします。
Windows ターミナル(PowerShell)の場合は改行を `` ` `` でエスケープします。
:::


プロジェクトが作成できれば、以下のように war を生成できます。 

```shell
cd jakarta-data-example
mvn package
```

ここではまだ実装がないので、空の war が生成されるだけです。次に進みましょう。


### pom.xml の編集

作成したプロジェクトの pom.xml を編集していきます。

ここで行うことは以下になります。

- Wildfly プレビュー機能を構成する
- Jakarta Data API とその他必要な Jakarta EE の依存を追加する
- Hibernate の静的メタモデルプロセッサでメタモデルを生成できるようにする
- Wildfly Glow で Wildfly サーバを構成する



#### Wildfly プレビュー機能を構成

Wildfly の Jakarta Data サポートは、プレビュー機能として公開されているため、BOM の定義など プレビュー版を利用するように編集します。

125行目付近の BOM依存の artifactId を `wildfly-ee-with-tools` から `wildfly-ee-preview-with-tools` に変更します。

```xml
    <dependency>
        <groupId>org.wildfly.bom</groupId>
        <artifactId>wildfly-ee-preview-with-tools</artifactId> <!-- ココを変更 -->
        <version>${version.wildfly.bom}</version>
        <type>pom</type>
        <scope>import</scope>
    </dependency>
```

Wildfly Maven プラグイン `wildfly-maven-plugin` の設定変更も必要ですが、これは後述の Wildfly Glow の設定の中で行います。


#### Jakarta EE の依存を追加

`wildfly-jakartaee-webapp-archetype` を使って生成したプロジェクトには、Jakarta EE の代表的な API の依存があらかじめ定義されていますが、不足する Jakarta Data API など追加の依存を追加します。

以下の3つを `dependencies` 配下に追加します。

```xml
    <dependencies>
    ...
        <dependency>
            <groupId>jakarta.data</groupId>
            <artifactId>jakarta.data-api</artifactId>
            <scope>provided</scope>
        </dependency>

        <dependency>
            <groupId>jakarta.transaction</groupId>
            <artifactId>jakarta.transaction-api</artifactId>
            <scope>provided</scope>
        </dependency>

        <dependency>
            <groupId>jakarta.validation</groupId>
            <artifactId>jakarta.validation-api</artifactId>
            <scope>provided</scope>
        </dependency>
    </dependencies>
```


#### Hibernate メタモデルプロセッサを構成

Jakarta Data ならびに Jakarta Persistence ではアノテーションプロセッサで生成した静的メタモデルを利用します。
また、Hibernate では、`Repository` の実装コードをアノテーションプロセッサで生成するため、`maven-compiler-plugin` の `configuration` 配下に `hibernate-jpamodelgen` を追加します。

```xml
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-compiler-plugin</artifactId>
            <version>${version.compiler.plugin}</version>
            <configuration>
                <annotationProcessorPaths>
                    <path>
                        <groupId>org.hibernate.orm</groupId>
                        <artifactId>hibernate-jpamodelgen</artifactId>
                    </path>
                </annotationProcessorPaths>
            </configuration>
        </plugin>
```

Hibernate が生成する `Repository` の実装コードは、Hibernate に依存するため、Hibernate への依存も追加します。

```xml
    <dependencies>
    ...
        <dependency>
            <groupId>org.hibernate.orm</groupId>
            <artifactId>hibernate-core</artifactId>
            <scope>provided</scope>
        </dependency>
    </dependencies>
```


#### Wildfly Glow で Wildfly サーバを構成

Wildfly は Galleon というプロビジョニングツールでサーバを構成できます。
コンテナでの利用時などにおいて、Wildfly の不必要な機能を削減することで、イメージサイズを削減することが Galleon の主な目的になります。

`wildfly-maven-plugin` では、Galleon にて必要な機能パックを選択することで Wildfly サーバを構成できますが、この指定が面倒でした。
そこで登場したのが Wildfly Glow です。
Wildfly Glow は、war の中身をスキャンすることで、自動的に Galleon の機能パックを選択するもので `<discover-provisioning-info>` として定義します。

初期生成された `pom.xml` の `wildfly-maven-plugin` は以下のようなシンプルなものです。

```xml
    <plugin>
        <groupId>org.wildfly.plugins</groupId>
        <artifactId>wildfly-maven-plugin</artifactId>
        <version>${version.wildfly.maven.plugin}</version>
    </plugin>
```

ここに Wildfly Glow の設定を追加します(`<discover-provisioning-info>`)。

```xml
        ...
        <configuration>
            <discover-provisioning-info>
                <version>35.0.1.Final</version>
                <preview>true</preview>
                <add-ons>
                    <add-on>h2-database:default</add-on>
                </add-ons>
            </discover-provisioning-info>
        </configuration>
    </plugin>
```

Wildfly の `version` を指定し、`preview` でプレビュー機能を有効化しています。

今回は、データベースに H2 を使うことにして、`add-on` として `h2-database` を指定します(`persistence.xml` は初期生成されたものをそのまま使います)。

加えて、Maven の `package` ゴールで `wildfly-maven-plugin` が実行されるように以下の定義を追加します。

```xml
            ...
		</configuration>
		<executions>
			<execution>
				<goals>
					<goal>package</goal>
				</goals>
			</execution>
		</executions>
```

これで  pom.xml の定義は完了です。

全体としては以下のようになります(少し長いですが、全体を貼り付けておきます)。

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!--
    JBoss, Home of Professional Open Source
    Copyright 2015, Red Hat, Inc. and/or its affiliates, and individual
    contributors by the @authors tag. See the copyright.txt in the
    distribution for a full listing of individual contributors.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
-->
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <groupId>example</groupId>
    <artifactId>jakarta-data-example</artifactId>
    <version>1.0-SNAPSHOT</version>

    <packaging>war</packaging>
    <name>jakarta-data-example</name>
    <description>Insert description for your project here.</description>

    <properties>
        <!-- Explicitly declaring the source encoding eliminates the following
            message: -->
        <!-- [WARNING] Using platform encoding (UTF-8 actually) to copy filtered
            resources, i.e. build is platform dependent! -->
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>

        <!-- JBoss dependency versions -->
        <version.wildfly.maven.plugin>5.1.1.Final</version.wildfly.maven.plugin>

        <!-- Define the version of the JBoss BOMs we want to import to specify tested stacks. -->
        <version.wildfly.bom>35.0.1.Final</version.wildfly.bom>

        <!--Use JUnit 5 here - the WildFly bom still brings 4.x -->
        <version.junit5>5.10.1</version.junit5>

        <!-- other plugin versions -->
        <version.compiler.plugin>3.13.0</version.compiler.plugin>
        <version.failsafe.plugin>3.5.2</version.failsafe.plugin>
        <version.war.plugin>3.4.0</version.war.plugin>

        <!-- maven-compiler-plugin -->
        <maven.compiler.release>17</maven.compiler.release>
    </properties>

    <!--
    Repositories are defined in the order that they should be used.
    (1) Maven central, (2) JBoss community
    By default maven central is used last, so it is redefined here to
    force it to be used first.
    -->
    <repositories>
        <repository>
            <id>central</id>
            <name>Main Apache Maven Repository</name>
            <url>https://repo.maven.apache.org/maven2/</url>
            <layout>default</layout>
            <releases>
                <enabled>true</enabled>
                <updatePolicy>never</updatePolicy>
            </releases>
            <snapshots>
                <enabled>false</enabled>
                <updatePolicy>never</updatePolicy>
            </snapshots>
        </repository>
        <repository>
            <releases>
                <enabled>true</enabled>
                <updatePolicy>never</updatePolicy>
            </releases>
            <snapshots>
                <enabled>true</enabled>
                <updatePolicy>never</updatePolicy>
            </snapshots>
            <id>jboss-public-repository-group</id>
            <name>JBoss Public Repository Group</name>
            <url>https://repository.jboss.org/nexus/content/groups/public/</url>
            <layout>default</layout>
        </repository>
    </repositories>
    <pluginRepositories>
        <pluginRepository>
            <id>central</id>
            <name>Main Apache Maven Repository</name>
            <url>https://repo.maven.apache.org/maven2/</url>
            <releases>
                <enabled>true</enabled>
                <updatePolicy>never</updatePolicy>
            </releases>
            <snapshots>
                <enabled>false</enabled>
                <updatePolicy>never</updatePolicy>
            </snapshots>
        </pluginRepository>
        <pluginRepository>
            <releases>
                <enabled>true</enabled>
            </releases>
            <snapshots>
                <enabled>true</enabled>
            </snapshots>
            <id>jboss-public-repository-group</id>
            <name>JBoss Public Repository Group</name>
            <url>https://repository.jboss.org/nexus/content/groups/public/</url>
        </pluginRepository>
    </pluginRepositories>

    <dependencyManagement>
        <dependencies>
            <!-- JBoss distributes a complete set of Jakarta EE APIs including
                a Bill of Materials (BOM). A BOM specifies the versions of a "stack" (or
                a collection) of artifacts. We use this here so that we always get the correct
                versions of artifacts (you can read this as the WildFly stack of the Jakarta EE APIs,
                with some extras tools for your project, such as Arquillian for testing) -->
            <dependency>
                <groupId>org.wildfly.bom</groupId>
                <artifactId>wildfly-ee-preview-with-tools</artifactId>
                <version>${version.wildfly.bom}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>

            <!--Define the JUnit5 bom. WildFly BOM still contains JUnit4, so we have to declare a version here -->
            <dependency>
                <groupId>org.junit</groupId>
                <artifactId>junit-bom</artifactId>
                <version>${version.junit5}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>

    <dependencies>

        <!-- Import the CDI API, we use provided scope as the API is included in WildFly / JBoss EAP -->
        <dependency>
            <groupId>jakarta.enterprise</groupId>
            <artifactId>jakarta.enterprise.cdi-api</artifactId>
            <scope>provided</scope>
        </dependency>

        <!-- Bean Validation Implementation
           Provides portable constraints such as @Email
           Hibernate Validator is shipped in WildFly / JBoss EAP -->
        <dependency>
            <groupId>org.hibernate.validator</groupId>
            <artifactId>hibernate-validator</artifactId>
            <scope>provided</scope>
        </dependency>

        <!-- Import the JPA API, we use provided scope as the API is included in WildFly / JBoss EAP -->
        <dependency>
            <groupId>jakarta.persistence</groupId>
            <artifactId>jakarta.persistence-api</artifactId>
            <scope>provided</scope>
        </dependency>

        <!-- Import the JSF API, we use provided scope as the API is included in WildFly / JBoss EAP -->
        <dependency>
            <groupId>jakarta.faces</groupId>
            <artifactId>jakarta.faces-api</artifactId>
            <scope>provided</scope>
        </dependency>

        <!-- Import the JAX-RS API, we use provided scope as the API is included in WildFly / JBoss EAP -->
        <dependency>
            <groupId>jakarta.ws.rs</groupId>
            <artifactId>jakarta.ws.rs-api</artifactId>
            <scope>provided</scope>
        </dependency>

        <!-- Servlet API -->
        <dependency>
            <groupId>jakarta.servlet</groupId>
            <artifactId>jakarta.servlet-api</artifactId>
            <scope>provided</scope>
        </dependency>

        <!-- Import the EJB API, we use provided scope as the API is included in WildFly / JBoss EAP -->
        <dependency>
            <groupId>jakarta.ejb</groupId>
            <artifactId>jakarta.ejb-api</artifactId>
            <scope>provided</scope>
        </dependency>
        <!-- Required for e.g. "javax.annotation.PostConstruct" -->
        <dependency>
            <groupId>jakarta.annotation</groupId>
            <artifactId>jakarta.annotation-api</artifactId>
            <scope>provided</scope>
        </dependency>

        <!-- Test scope dependencies -->
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter</artifactId>
            <scope>test</scope>
        </dependency>

        <!-- Optional, but highly recommended -->
        <!-- Arquillian allows you to test enterprise code such as EJBs and
            Transactional(JTA) JPA from JUnit/TestNG -->
        <dependency>
            <groupId>org.jboss.arquillian.junit5</groupId>
            <artifactId>arquillian-junit5-container</artifactId>
            <scope>test</scope>
        </dependency>

        <dependency>
            <groupId>jakarta.data</groupId>
            <artifactId>jakarta.data-api</artifactId>
            <scope>provided</scope>
        </dependency>

        <dependency>
            <groupId>jakarta.transaction</groupId>
            <artifactId>jakarta.transaction-api</artifactId>
            <scope>provided</scope>
        </dependency>

        <dependency>
            <groupId>jakarta.validation</groupId>
            <artifactId>jakarta.validation-api</artifactId>
            <scope>provided</scope>
        </dependency>

        <dependency>
            <groupId>org.hibernate.orm</groupId>
            <artifactId>hibernate-core</artifactId>
            <scope>provided</scope>
        </dependency>

    </dependencies>

    <build>
        <!-- Tell Maven that the resulting file should not have a file name containing the version -
             a non versioned name is required e.g. when building a deployable artifact using the ShrinkWrap API -->
        <finalName>${project.artifactId}</finalName>

        <plugins>
            <!--Configuration of the maven-compiler-plugin -->
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>${version.compiler.plugin}</version>
                <configuration>
                    <annotationProcessorPaths>
                        <path>
                            <groupId>org.hibernate.orm</groupId>
                            <artifactId>hibernate-jpamodelgen</artifactId>
                        </path>
                    </annotationProcessorPaths>
                </configuration>
            </plugin>

            <!--Build configuration for the WAR plugin: -->
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-war-plugin</artifactId>
                <version>${version.war.plugin}</version>
                <configuration>
                    <!-- Jakarta EE doesn't require web.xml, Maven needs to catch up! -->
                    <failOnMissingWebXml>false</failOnMissingWebXml>
                </configuration>
            </plugin>

            <!-- The WildFly plugin deploys your war to a local JBoss AS container -->
            <plugin>
                <groupId>org.wildfly.plugins</groupId>
                <artifactId>wildfly-maven-plugin</artifactId>
                <version>${version.wildfly.maven.plugin}</version>
                <configuration>
                    <discover-provisioning-info>
                        <version>35.0.1.Final</version>
                        <preview>true</preview>
                        <add-ons>
                            <add-on>h2-database:default</add-on>
                        </add-ons>
                    </discover-provisioning-info>
                </configuration>
                <executions>
                    <execution>
                        <goals>
                            <goal>package</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>
        </plugins>
    </build>


    <profiles>
        <profile>
            <!-- All the modules that require nothing but WildFly or JBoss EAP -->
            <id>default</id>
            <activation>
                <activeByDefault>true</activeByDefault>
            </activation>
        </profile>

        <profile>
            <!-- An optional Arquillian testing profile that executes tests in your WildFly / JBoss EAP instance.
                 This profile will start a new WildFly / JBoss EAP instance, and execute the test, shutting it down when done.
                 Run with: mvn clean verify -Parq-managed -->
            <id>arq-managed</id>
            <dependencies>
                <dependency>
                    <groupId>org.wildfly.arquillian</groupId>
                    <artifactId>wildfly-arquillian-container-managed</artifactId>
                    <scope>test</scope>
                </dependency>
            </dependencies>
            <build>
                <plugins>
                    <plugin>
                        <groupId>org.apache.maven.plugins</groupId>
                        <artifactId>maven-failsafe-plugin</artifactId>
                        <version>${version.failsafe.plugin}</version>
                        <executions>
                            <execution>
                                <goals>
                                    <goal>integration-test</goal>
                                    <goal>verify</goal>
                                </goals>
                            </execution>
                        </executions>
                        <configuration>
                            <!-- Configuration for Arquillian: -->
                            <systemPropertyVariables>
                                <!-- Defines the container qualifier in "arquillian.xml" -->
                                <arquillian.launch>managed</arquillian.launch>
                            </systemPropertyVariables>
                        </configuration>
                    </plugin>
                </plugins>
            </build>
        </profile>

        <profile>
            <!-- An optional Arquillian testing profile that executes tests in a remote JBoss EAP instance.
                 Run with: mvn clean verify -Parq-remote -->
            <id>arq-remote</id>
            <dependencies>
                <dependency>
                    <groupId>org.wildfly.arquillian</groupId>
                    <artifactId>wildfly-arquillian-container-remote</artifactId>
                    <scope>test</scope>
                </dependency>
            </dependencies>
            <build>
                <plugins>
                    <plugin>
                        <groupId>org.apache.maven.plugins</groupId>
                        <artifactId>maven-failsafe-plugin</artifactId>
                        <version>${version.failsafe.plugin}</version>
                        <executions>
                            <execution>
                                <goals>
                                    <goal>integration-test</goal>
                                    <goal>verify</goal>
                                </goals>
                            </execution>
                        </executions>
                        <configuration>
                            <!-- Configuration for Arquillian: -->
                            <systemPropertyVariables>
                                <!-- Defines the container qualifier in "arquillian.xml" -->
                                <arquillian.launch>remote</arquillian.launch>
                            </systemPropertyVariables>
                        </configuration>
                    </plugin>
                </plugins>
            </build>
        </profile>
    </profiles>

</project>
```


### エンティティの作成

今回は以下のエンティティを作成することにしましょう。

```shell
touch src/main/java/example/Book.java
touch src/main/java/example/Author.java
```

それぞれ以下のように実装します。

```java
package example;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToMany;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.io.Serializable;
import java.util.List;
import java.util.UUID;

@Entity(name = Book.NAME)
public class Book implements Serializable {

    public static final String NAME = "BOOKS";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @NotBlank
    @Size(max = 200)
    @Column(length = 200, nullable = false)
    private String title;

    private String summary;

    @Size(max = 13)
    @Column(length = 13)
    private String isbn;

    @ManyToMany(fetch = FetchType.EAGER)
    private List<Author> authors;

    protected Book() {
    }

    public Book(String title, String summary, String isbn, List<Author> authors) {
        this.title = title;
        this.summary = summary;
        this.isbn = isbn;
        this.authors = authors;
    }

    public UUID getId() {
        return id;
    }    
    public String getTitle() {
        return title;
    }
    public List<Author> getAuthors() {
        return authors;
    }
    public String getSummary() {
        return summary;
    }
    public String getIsbn() {
        return isbn;
    }
}
```


```java
package example;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.io.Serializable;
import java.util.UUID;

@Entity(name = Author.NAME)
public class Author implements Serializable {

    public static final String NAME = "AUTHORS";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotBlank
    @Size(max = 100)
    @Column(length = 100, nullable = false)
    private String name;

    protected Author() {
    }
    public Author(String name) {
        this.name = name;
    }
    public UUID getId() {
        return id;
    }
    public String getName() {
        return name;
    }
}
```

何の変哲も無いエンティティです。


### リポジトリの作成

今回のポイントのリポジトリです。

```shell
touch src/main/java/example/BookRepository.java
```

単純な例として、`Book` のISBNでの検索と `Author` の保存メソッドを定義します。

```java
package example;

import jakarta.data.repository.BasicRepository;
import jakarta.data.repository.Find;
import jakarta.data.repository.Repository;
import jakarta.data.repository.Save;
import java.util.List;
import java.util.UUID;

@Repository
public interface BookRepository extends BasicRepository<Book, UUID> {

	@Find  
	Book findByIsbn(String isbn);

    @Save
    void save(Author author);

}
```

`BasicRepository` を継承したので、`Book` エンティティに対する基本的な `@Save` `@Delete` `@Find` 操作が提供されます。
加え、ISBN による完全一致検索と、`Author` の保存メソッドを追加しました。

リポジトリの実装はこれだけです。



### リソースの作成

JAX-RS でリソースを作成します。

```shell
touch src/main/java/example/RsApplication.java
touch src/main/java/example/BookResource.java
```

JAX-RS のアプリケーション定義と、

```java
package example;

import jakarta.ws.rs.ApplicationPath;
import jakarta.ws.rs.core.Application;

@ApplicationPath("/rs")
public class RsApplication extends Application { }
```

Book リソースを作成します。

```java
package example;

import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;

@Path("/books")
@RequestScoped
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class BookResource {

    @Inject
    private BookRepository repository;

    @GET
    public List<Book> list() {
        return repository.findAll().toList();
    }

    @GET
    @Path("/search")
    public Book list(@QueryParam("isbn") String isbn) {
        return repository.findByIsbn(isbn);
    }

    @GET
    @Path("/init")
    @Transactional
    public Response create() {
        repository.save(new Book("The Boys of Riverside", "", "9780385549875", List.of(repository.save(new Author("Thomas Fuller")))));
        repository.save(new Book("The God of the Woods", "", "9780008663834", List.of(repository.save(new Author("Liz Moore")))));
        repository.save(new Book("James", "", "9780385550888", List.of(repository.save(new Author("Percival Everett")))));
        return Response.ok().entity("OK").build();
    }
}
```


### アプリケーションの実行

`package` ゴールで `wildfly-maven-plugin` が動き、Wildfly Galleon がサーバを構成するので、以下のコマンドでアプリケーションを実行できます。


```shell
mvn clean package
./target/server/bin/standalone.sh
```

`BookResource` で定義したリソースにアクセスしてみましょう。

初期データ生成し、

```shell
curl "http://localhost:8080/jakarta-data-example/rs/books/init"
OK
```

全件取得。


```shell
curl "http://localhost:8080/jakarta-data-example/rs/books" -H "Accept: application/json" | jq
[
  {
    "authors": [
      {
        "id": "48b6984c-6baf-4cbf-9073-05525bd156b2",
        "name": "Thomas Fuller"
      }
    ],
    "id": "1be8274c-06da-40a3-a6fa-186ccbb37151",
    "isbn": "9780385549875",
    "summary": "",
    "title": "The Boys of Riverside"
  },
  {
    "authors": [
      {
        "id": "5bff3e39-66f7-4e0f-b522-98c8aa0638f5",
        "name": "Liz Moore"
      }
    ],
    "id": "936cec9b-4f16-4be3-b3f7-7d99c87127d5",
    "isbn": "9780008663834",
    "summary": "",
    "title": "The God of the Woods"
  },
  {
    "authors": [
      {
        "id": "08da7561-5a5b-46d5-be5f-3884d5e42cbe",
        "name": "Percival Everett"
      }
    ],
    "id": "d556d9c4-d62a-4cb1-9973-cc0fdd282799",
    "isbn": "9780385550888",
    "summary": "",
    "title": "James"
  }
]
```

ISBNによる検索。

```shell
curl "http://localhost:8080/jakarta-data-example/rs/books/search?isbn=9780385550888" -H "Accept: application/json" | jq
{
  "authors": [
    {
      "id": "08da7561-5a5b-46d5-be5f-3884d5e42cbe",
      "name": "Percival Everett"
    }
  ],
  "id": "d556d9c4-d62a-4cb1-9973-cc0fdd282799",
  "isbn": "9780385550888",
  "summary": "",
  "title": "James"
}
```

動いていますね。



## まとめ

リリース間近の Jakarta EE 11 に追加される新仕様、Jakarta Data 1.0 について見てきました。

- Jakarta Data では、`@Repository` アノテーションでリポジトリインターフェースを定義する
- クエリは `@Query` アノテーションで JDQL を使って書くことができる
- `@Find` アノテーションでメソッドパラメータに基づく自動クエリを構成できる
- ページングなどの一般的な操作が組み込みで提供される

Jakarta EE アプリケーションサーバで簡単に動かせることを示しました。


1.0 に到達したばかりの若い仕様であり、不足する部分もまだまだあります(例えば Jakarta Persistence の Entity Graph は使えないなど)。

が、すでに Jakarta EE 12 に向けての検討も活発に動いており、今後の発展に期待していきたいところです。



