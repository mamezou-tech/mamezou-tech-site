---
title: DBアクセスフレームワークDoma2の紹介
author: koshiro-fukushima
date: 2022-07-26
tags: [Doma2,DAO,OSS, ORマッパー]
---

業務で使用させていただいおりますDBアクセスフレームワーク[Doma2](https://doma.readthedocs.io/en/latest/)を紹介させていただきます。（とても重宝しております。）導入方法等の詳細については[公式サイト](https://doma.readthedocs.io/en/latest/)をご覧ください。


## 特徴（公式から引用）
- 注釈処理を使用して コンパイル時 にコードの生成やコードの検証をする
- データベース上のカラムの値を振る舞いを持った Java オブジェクトにマッピングできる
- 2-way SQL と呼ばれる SQL テンプレートを利用できる
- Java 8 の java.time.LocalDate や java.util.Optional や java.util.stream.Stream を利用できる
- JRE 以外のライブラリへの依存が一切ない

## 導入
ちょっと試したい人向けに、ひな型プロジェクトが提供されております。（詳しい導入手順は公式サイトに載っておりますのでそちらを参考に）

- [Doma2 Getting started](https://doma.readthedocs.io/en/latest/getting-started/)

```shell
 git clone https://github.com/domaframework/simple-boilerplate.git
```

検索クエリはSQLファイルと１対１のインターフェースを用意するだけで実装できます。

インターフェース側（サンプルより抜粋）
```java
@Dao(config = AppConfig.class)
public interface EmployeeDao {
  // (中略)
    @Select
    Employee selectById(Integer id);
  // (中略)
```

SQLファイル（サンプルより抜粋）
```sql
select
    /*%expand*/*
from
    employee
where
    id = /* id */0
```
→ /* id */ の部分はメソッドのパラメータid と置き換えられて実行されます。


単一エンティティの更新・挿入・削除操作はインターフェースを用意し、エンティティクラスを引数に、@Insert/@Update/@Deleteのアノテーションを設定するだけでOKです。（SQLファイルを準備する必要はありません）

インターフェース側（サンプルより抜粋）
```java
@Dao(config = AppConfig.class)
public interface EmployeeDao {
  // (中略)
    @Insert
    int insert(Employee employee);

    @Update
    int update(Employee employee);

    @Delete
    int delete(Employee employee);
  // (中略)
```


## 便利機能のご紹介
以上のように、いろいろ便利なのですが個人的に便利だと思った機能をかいつまんで紹介させていただきます。

- 2-way SQL
SQLテンプレートの文法はSQLのブロックコメント /* */ をベースにしたもので あるためコメントアウトされたものとして 静的な SQL としても実行できます。

- [Doma-Gen2](https://doma-gen.readthedocs.io/en/latest/) を使ったエンティティの自動生成
わざわさ自分でエンティティを作成しなくても付属のツールでDDLから自動で作成してくれます。（なんと便利な）

- 条件式の構築でIF文やFOR文が使える。
条件が不一致でwhere句以降の構文が出力されない場合、where は自動的に除去されます。次のサンプルにはありませんが、複数条件の and が出力されなかった場合も自動的に除去されます。[参考：条件ディレクティブの句の削除](https://doma.readthedocs.io/en/latest/sql/#removal-of-clauses-on-the-condition-directive)

```sql
-- IF文
select * from employee where
/*%if employeeId != null */
    employee_id = /* employeeId */99
/*%end*/
```

```sql
-- FOR文
select * from employee where
/*%for name : names */
employee_name like /* name */'hoge'
  /*%if name_has_next */
/*# "or" */
  /*%end */
/*%end*/
```




## 最後に
環境構築についてはかなり端折って書きました。通常は Spring Framework 等のDIコンテナと組み合わせるのがメジャーな使い方です。とても便利なDBアクセスフレームワークです。よかったら選択肢の１つとしていかがでしょうか。

