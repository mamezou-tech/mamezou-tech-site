---
title: ORマッパーのTypeORMをTypeScriptで使う
author: noboru-kudo
date: 2022-07-27
tags: [type-orm, typescript, ORマッパー]
templateEngineOverride: md
---

Node.jsの普及によって、JavaScript/TypeScriptはフロントエンドだけの実装言語ではなくなりました。
Express等のWebサーバーや、Lambda等のサーバーレス環境でバックエンド処理として使われることが当たり前になりました。

最近はもっとバリエーションが増えていますが、一般的にバックエンドサービスだとRDBアクセスが定番モノと言えます。
ここでは、そんなJavaScript/TypeScript向けのORマッパーの[TypeORM](https://typeorm.io/)をご紹介します。
TypeORMはフルスタックのORマッパーで、特に実装言語としてTypeScriptを利用すると、その型付け機能をフル活用できます[^1]。
もちろん、PostgreSQL、MySQL、Oracle、SQL Server等のメジャーなRDBはフルサポートされています。
また、実験的(experimental)ではありますが、JavaScriptで人気のあるMongoDBもサポートしています。

TypeORMは非常に多機能ですので、今回は基本的な機能をピックアップして紹介します。

[^1]: 新規導入する場合で素のJavaScriptを使うメリットはほぼないと思いますが、興味のある方は[こちら](https://typeorm.io/usage-with-javascript)を参照してください。

[[TOC]]

## セットアップ

公式ドキュメントに従ってTypeORMを導入します。ここでは現時点で最新の`0.3.7`を使用します。
また、今回は接続するRDBとしてPostgreSQLを事前に用意しました。

- [TypeORM - Installation](https://typeorm.io/#installation)

```shell
# TypeORM / postgres driver
npm install --save typeorm reflect-metadata pg
# TypeScript関連
npm install typescript @types/node ts-node
# tsconfig.json作成
npx tsc --init
```

TypeORMはTypeScriptのデコレーターを使ってメタデータを収集していますので、tsconfig.jsonに以下を追加します。

```json
{
  "compilerOptions": {
    // (省略)
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
  // (省略)
}
```

## シンプルなエンティティを定義する

まずはシンプルなエンティティを定義します。これはクラスとして作成します。
ここでは以下のArticle(記事)クラスを作成しました。

```typescript
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Article {
  @PrimaryGeneratedColumn()
  id!: string;

  @Column({
    unique: true,
  })
  url!: string;

  @Column()
  title!: string;

  @Column("text")
  content!: string;

  @Column("varchar", {
    nullable: true,
  })
  note!: string | null;

  @Column({
    default: 0,
  })
  star!: number;

  @Column()
  created!: Date;
}
```

TypeORMのエンティティ(テーブル)はこのようになります。
まずは、クラスに対して[@Entity](https://typeorm.io/decorator-reference#entity)を指定し、TypeORMにこれがエンティティであることを示します。オプションでテーブル名等も指定可能です。

そして、カラムとなるフィールドを作成し、TypeScriptの各種デコレーターを指定します。
基本は[@Column](https://typeorm.io/decorator-reference#column)を使用してテーブルのカラム定義を記述します。
ここでは型やNotNull属性(nullable)やデフォルト値(default)等を記述することで、実際のテーブル定義と一致させることができます。
指定可能なオプションは多数ありますので、詳細は[APIレファレンス](https://typeorm.io/decorator-reference#column)を参照してください。

[@PrimaryGeneratedColumn](https://typeorm.io/decorator-reference#primarygeneratedcolumn)は、主キーとして自動生成のサロゲートキーとなることを示します。
PostgreSQLの場合はデフォルトでシーケンスによる採番となります。PKが自然キーの場合は[@PrimaryColumn](https://typeorm.io/decorator-reference#primarycolumn)を使います。

:::column:便利なカラムデコレーター
TypeORMでは実運用でよく見る以下のようなカラムに対応する便利なデコレーターも提供されます。

- [@CreateDateColumn](https://typeorm.io/decorator-reference#createdatecolumn): レコード作成日時の自動設定
- [@UpdateDateColumn](https://typeorm.io/decorator-reference#updatedatecolumn): レコード更新日時の自動設定
- [@DeleteDateColumn](https://typeorm.io/decorator-reference#deletedatecolumn): レコード論理削除日時の自動設定
- [@VersionColumn](https://typeorm.io/decorator-reference#versioncolumn): 楽観的排他制御で使う自動インクリメントバージョン
:::

上記は、PostgreSQLでは以下のテーブル定義にマッピングされました。

```
                                       Table "public.article"
 Column  |            Type             | Collation | Nullable |               Default               
---------+-----------------------------+-----------+----------+-------------------------------------
 id      | integer                     |           | not null | nextval('article_id_seq'::regclass)
 url     | character varying           |           | not null | 
 title   | character varying           |           | not null | 
 content | text                        |           | not null | 
 note    | character varying           |           |          | 
 star    | integer                     |           | not null | 0
 created | timestamp without time zone |           | not null | 
Indexes:
    "PK_40808690eb7b915046558c0f81b" PRIMARY KEY, btree (id)
    "UQ_b99fa71c07cc9a8421bd36bb1db" UNIQUE CONSTRAINT, btree (url)
```

:::column:エンティティからスキーマ定義を分離する
エンティティにデコレーターで多数のスキーマを指定していくと、エンティティのソースコードが見にくくなってきます。
このような理由から、スキーマ定義はエンティティから分離させることを好む方も多いかと思います。
TypeORMはEntitySchemaを作成することで、デコレーターではないスキーマ定義もサポートしています。
詳細は以下公式ドキュメントを参考にしてください。

- [TypeORM - Separating Entity Definition](https://typeorm.io/separating-entity-definition#)
:::

## データベースに接続する
まずはDBへの接続です。
TypeORMでは、[DataSource](https://typeorm.io/data-source)でコネクションを作成します。
以下のように記述します。

```typescript
// https://stackoverflow.com/questions/49618719/why-does-typeorm-need-reflect-metadata
import "reflect-metadata";
import { DataSource } from "typeorm";
import { Article } from "./Article";

const datasource = new DataSource({
  type: "postgres", // これに応じて設定項目が変わる(TypeScriptの型が変わる)
  host: "localhost",
  username: "typeorm-tester",
  password: process.env.POSTGRES_PASS!, // 環境変数より取得
  port: 5432,
  logging: true, // SQLログ
  database: "sample",
  synchronize: true, // DBとのスキーマ同期(開発用)
  dropSchema: true, // スキーマ削除(開発用)
  entities: [Article], // 利用するエンティティ。パスでの指定も可能
});

datasource.initialize()
  .then(async (ds) => {
    console.log("datasource is initialized!!");
    // データベースアクセス処理を記述
    // ....
    await datasource.destroy();
  })
  .catch((error) => {
    console.log(error);
  });
```

最初にDataSourceを作成し、PostgreSQLの接続情報や起動オプションを指定しています。
接続情報については自明な内容ですので、説明は不要かと思います。
起動オプションとしては、今回はローカル検証用にエンティティとスキーマの同期(synchronize)や、スキーマの初期化(dropSchema)、詳細なログの出力を有効にしています。
接続情報に加えて、この辺りも環境によって切り替えできるようにしておくと良いかと思います。

また、`entities`で使用するエンティティを指定しています。ここでは直接クラス名を指定していますが、`entity/*.js`等のパス指定も可能です。

DataSourceで指定できるオプションは、他にも多数ありますので、詳細は以下公式ドキュメントを参照しくてださい。

- [TypeORM - Data Source Options](https://typeorm.io/data-source-options#postgres--cockroachdb-data-source-options)

DataSource作成後はinitializeメソッドで初期化します。このときにデータベースへの接続が実施され、接続プールが作成されます。
また、データベースアクセスが終わった際には、destroyメソッドで接続を破棄するようにします。

## CRUD操作を実行する
それでは、作成したエンティティのCRUD操作をしてみます。
データアクセス用のソースコードは、以下のようになります。

```typescript
// DataSourceよりRepository取得
const repo = datasource.getRepository(Article);

// Create
const newArticle = repo.create({
  url: "/blog/2022/07/26/typeorm-intro",
  title: "TypeScriptでTypeORMを使ってみよう！",
  content:
    "TypeORMはフルスタックなORマッパーです。\n今回はTypeORMを使って...",
  created: new Date(),
  star: 10,
});
const persisted = await repo.save(newArticle);

// Read
// see https://typeorm.io/find-options
const foundById = await repo.findOneBy({
  id: persisted.id,
});
console.log(foundById);
const foundByCondition = await repo.find({
  where: {
    created: Between(new Date("2022-07-01"), new Date("2022-07-31")),
  },
  order: {
    created: "ASC",
  },
});
assert.equal(foundByCondition.length, 1);
console.log(foundByCondition);

// Update
persisted.note = "7/27公開予定";
await repo.save(persisted);
// or
// await repo.update({ id: persisted.id }, { note: "7/27公開予定" });

// Delete
await repo.remove(persisted);
/// or
// await repo.delete({ id: persisted.id });
```

こちらも実施している内容は自明です。データベースのInsert/Select/Update/Delete操作をしています。
ポイントは、先程生成したDataSourceから[Repository](https://typeorm.io/repository-api)を取得しているところくらいです。
ここではDataSource.getRepositoryメソッドを使用していますが、内部的にはDataSourceから[EntityManger](https://typeorm.io/entity-manager-api)を取得し、そこからRepositoryを取得するショートカットメソッドになっています。

RepositoryとEntityMangerは共にデータベースアクセスの基本操作を提供しますが、Repositoryの場合は対応するエンティティの型に制限します。
ここでは、Repository取得時にエンティティの型を第1引数に指定し、取得するRepositoryを該当エンティティで型付けするようにしています。
これより、以降でフィールドの指定やその値を設定する際には、IDEのコードアシストが有効になるため、リズムよく実装できるようになります。

:::column:クエリビルダーを使って複雑なクエリを記述する
ここでは記載していませんが、クエリビルダーを利用するとSQLに近い方法でデータアクセス操作を記述できます。
複雑なクエリを記述する場合には、こちらを利用することになるかと思います。
詳細は以下の公式ドキュメントを参照してください。

- [TypeORM - Select using Query Builder](https://typeorm.io/select-query-builder)
:::
 
## トランザクションを使う

先程のコードは全てのオペレーションでトランザクションが分かれていました。
これでは、途中で失敗すると中途半端な状態となってしまいます。ここでは、RDB最大(?)のメリットのトランザクションを使ってみます。
トランザクションを使って書き換えると以下のようになります。

```typescript
await datasource.transaction(async (entityManager) => {
  // TransactionalなEntityManagerよりRepository取得
  const repo = entityManager.getRepository(Article);

  // Create
  const newArticle = repo.create({
    url: "/blog/2022/07/26/typeorm-intro",
    title: "TypeScriptでTypeORMを使ってみよう！",
    content:
      "TypeORMはフルスタックなORマッパーです。\n今回はTypeORMを使って...",
    created: new Date(),
    star: 10,
  });
  const persisted = await repo.save(newArticle);
  // (以下データアクセス操作。省略)
});
```

最初にDataSource.transactionメソッドを使って、その中にデータアクセス操作をコールバック関数として記述します。この関数がトランザクション境界になります。
以降の実装は基本的には先程と同じですが、Repositoryの取得には引数として渡されるトランザクショナルなEntityMangerを使わなければなりません。
これだけで、この関数内でエラーが発生した場合には、TypeORMが自動でロールバック処理を実施し、一貫性を確保してくれます(自動トランザクション)。

:::column:手動でトランザクションを制御する
自動トランザクションではなく、QueryRunnerを使うと手動で細かくトランザクション制御ができます。
中間コミット等、細かいトランザクション管理を利用したい場合はこちらを使うことになります。
こちらの詳細は、以下公式ドキュメントを参照しくてださい。

- [TypeORM - Using QueryRunner to create and control state of single database connection](https://typeorm.io/transactions#using-queryrunner-to-create-and-control-state-of-single-database-connection)
:::

## 関連のあるエンティティを定義する

今まで1テーブルのみを対象としていましたが、RDBらしく外部キーを使ってテーブル間に関連をつけてみます。
今回は著者(Author)テーブルを追加して、先程の記事(Article)テーブルに関連をつけます。

新規で作成するAuthorエンティティは以下の通りとしました。

```typescript
@Entity()
export class Author {
  @PrimaryColumn()
  employeeNumber!: string;

  @Column()
  name!: string;

  @OneToMany(() => Article, (article) => article.author)
  articles!: Article[];
}
```

ポイントは[@OneToMany](https://typeorm.io/decorator-reference#onetomany)です。
ここでAuthorエンティティはArticleエンティティと1:nの関係を持つことを指定しています。第1引数にフィールドの型、第2引数にArticle側から見た場合の取得方法を定義します。
次にArticleエンティティ側にも追記します。以下修正点のみを抜粋します。

```typescript
@Entity()
export class Article {
  
  // (省略)

  @ManyToOne(() => Author, (author) => author.articles, { eager: true })
  author!: Author;
}
```

こちらでは先ほどとは逆の[@ManyToOne](https://typeorm.io/decorator-reference#manytoone)を指定します。
引数の内容は先程と同様ですが、第3引数に`eager: true`というオプションを指定しました。
これはArticleを取得する際は、Authorも合わせて取得する指定です。該当エンティティを利用する場合に、参照頻度が高いフィールドに対して指定しておくと良いかと思います。

:::column:その他の関連デコレーター
今回は@OneToMeny/@ManyToOneを利用しましたが、もちろんそれ以外の関連を示すデコレーターは存在します。
詳細は以下公式ドキュメントを参照してください。

- [TypeORM - One-to-one relations](https://typeorm.io/one-to-one-relations)
- [TypeORM - Many-to-many relations](https://typeorm.io/many-to-many-relations)
:::

この場合のテーブル定義は、以下のようになりました。

- articleテーブル
```
                                             Table "public.article"
        Column        |            Type             | Collation | Nullable |               Default               
----------------------+-----------------------------+-----------+----------+-------------------------------------
 id                   | integer                     |           | not null | nextval('article_id_seq'::regclass)
 url                  | character varying           |           | not null | 
 title                | character varying           |           | not null | 
 content              | text                        |           | not null | 
 note                 | character varying           |           |          | 
 star                 | integer                     |           | not null | 0
 created              | timestamp without time zone |           | not null | 
 authorEmployeeNumber | character varying           |           |          | 
Indexes:
    "PK_40808690eb7b915046558c0f81b" PRIMARY KEY, btree (id)
    "UQ_b99fa71c07cc9a8421bd36bb1db" UNIQUE CONSTRAINT, btree (url)
Foreign-key constraints:                                
    "FK_ddd610ac65da18fdce8680aa930" FOREIGN KEY ("authorEmployeeNumber") REFERENCES author("employeeNumber")
```
- authorテーブル
```
                        Table "public.author"
     Column     |       Type        | Collation | Nullable | Default 
----------------+-------------------+-----------+----------+---------
 employeeNumber | character varying |           | not null | 
 name           | character varying |           | not null | 
Indexes:
    "PK_8f056f5963d53b543e91ba74fc0" PRIMARY KEY, btree ("employeeNumber")
Referenced by:
    TABLE "article" CONSTRAINT "FK_ddd610ac65da18fdce8680aa930" FOREIGN KEY ("authorEmployeeNumber") REFERENCES author("employeeNumber")
```

Articleテーブル側にauthorEmployeeNumberカラムが追加され、外部キー制約(FK_xxxx)が追加されています。

これに対して記事、著者のデータを登録します。

```typescript
await datasource.transaction(async (entityManager) => {
  const articleRepo = entityManager.getRepository(Article);
  const authorRepo = entityManager.getRepository(Author);

  const newAuthor = authorRepo.create({
    employeeNumber: "123",
    name: "豆蔵 太郎",
  });
  const persistedAuthor = await authorRepo.save(newAuthor);
  const newArticle = articleRepo.create({
    url: "/blog/2022/07/26/typeorm-intro",
    title: "TypeScriptでTypeORMを使ってみよう！",
    content:
      "TypeORMはフルスタックなORマッパーです。\n今回はTypeORMを使って...",
    created: new Date(),
    star: 10,
    author: newAuthor,
  });
  const persistedArticle = await articleRepo.save(newArticle);
});
```

登録については、先程とあまり変わりません。それぞれのエンティティにデータを設定して、Repositoryを使って登録します。

:::column:Cascadeオプションを使用する
ここでは使用しませんでしたが、デコレーターでCascadeオプションを利用すると、1つのRepositoryで関連エンティティ含めて登録できます。
Cascadeオプションの詳細は以下を参照してください。

- [TypeORM - Cascade Options](https://typeorm.io/relations#cascades)
:::

一方で、登録したデータの照会は以下のようになります。

```typescript
const foundAuthor = await authorRepo.findOne({
  where: {
    employeeNumber: persistedAuthor.employeeNumber,
  },
  relations: {
    articles: true,
  },
});
console.log(foundAuthor?.articles);

const foundArticle = await articleRepo.findOneBy({
  id: persistedArticle.id,
});
console.log(foundArticle?.author);
```

Authorエンティティ側ではarticlesフィールドに`eager: true`を付けなかったため、デフォルトではarticlesフィールドは何も設定されません。
ここでは、RepositoryのfindOneメソッドの引数で`relations`プロパティで明示的にarticlesの関連も取得するように指定します。
こうすることで、内部的にはテーブルJOINが実施され、Authorエンティティのarticlesフィールドには取得したデータが設定されます。

一方で、Articleエンティティ側ではauthorフィールドに`eager: true`を指定しましたので、明示的に`relations`の指定は不要です。
このため、こちらの方がシンプルな記述でAuthorエンティティ含めたデータが取得できます。

:::column:関連エンティティを非同期(lazy)に取得する
eagerの他にも非同期で関連エンティティの取得も可能です。取得コストがかかる場合はこちらの利用を検討することになります。
こちらの詳細は以下公式ドキュメントを参照してください。

- [TypeORM - Lazy relations](https://typeorm.io/eager-and-lazy-relations#lazy-relations)
:::

## まとめ

今回はTypeORMを使ってRDBを使う方法をご紹介しました。
使い方も簡単でTypeScriptの力をフルに活用できる点は、TypeORMの大きなメリットだと感じました。

ここでは触れませんでしたが、TypeORMにはスキーマのマイグレーション機能もあります。
- [TypeORM - Migrations](https://typeorm.io/migrations)
 
このようにTypeORMはORマッパーとしての機能性については申し分ないと感じます。
RDBを採用する際の候補として検討してみてはいかがでしょうか。
