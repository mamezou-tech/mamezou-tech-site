---
title: TypeORMのスキーママイグレーションを使う
author: noboru-kudo
date: 2023-02-22
tags: [type-orm, typescript, ORマッパー]
---

少し前ですがJavaScript/TypeScript版ORマッパーの[TypeORM](https://typeorm.io/)の[導入記事](/blogs/2022/07/27/typeorm-with-typescript/)を書きました。
この記事は予想に反して(？)多くのアクセスをいただいており、JavaScript/TypeScriptでのORマッパーの需要は結構高いのかなと思いました。

そこで今回は、その時に紹介できなかったTypeORMのスキーママイグレーションの機能についてご紹介しようと思います。

- [TypeORM Doc - Migrations](https://typeorm.io/migrations)

一般的にRDBではスキーマのバージョン管理は非常に重要です。
スキーマバージョンの内容は、新機能追加によるテーブルやカラム追加だけでなく、インデックス追加や正規化または非正規化等、非機能要件による変更もあります。
このようなスキーマ変更を適切な順序で一貫性を持って適用していくことはRDBの運用業務では重要です。
TypeORMはビルトインでこれをサポートしています。

:::info
本記事ではTypeORM自体のセットアップや使い方には触れません。興味のある方は以下の前回記事をご参照ください。

- [ORマッパーのTypeORMをTypeScriptで使う](/blogs/2022/07/27/typeorm-with-typescript/)
:::

:::info
本記事で利用しているTypeORMのバージョンは、現時点で最新の0.3.12で確認しています。
:::

## データソース設定

まずはTypeORMのデータソース設定です。この設定をマイグレーションからも使えるようにモジュールとして切り出しておきます。
以下のように指定しました。

```typescript
export default new DataSource({
  type: "postgres", // 利用するデータベース
  host: "localhost",
  username: "typeorm-tester",
  password: process.env.POSTGRES_PASS!,
  port: 5432,
  database: "sample",
  entities: ["src/entities/*.ts"], // エンティティソースコード
  migrations: ["migrations/*.ts"] // マイグレーションスクリプトの格納場所
});
```

ここでのポイントは`migrations`です。TypeORMはここに合致するファイルをマイグレーション対象として検知します。
今回はプロジェクトルート直下の`migrations`ディレクトリ配下のTypeScriptファイルを指定しました。

なお、ここではTypeORMのマイグレーション機能を使いますので、開発向け設定の`synchronize`や`dropSchema`は使いません。

TypeORMのデータソース設定の詳細は、以下公式ドキュメントを参照してください。

- [TypeORM Doc - Data Source Options](https://typeorm.io/data-source-options)

## 初期構築

ここでは1からDDLを作成するのではなく、エンティティ定義をベースにスキーマのマイグレーションをする方法を試してみます。
事前に、先程のデータソース設定に指定したPostgreSQLの空のデータベース(`sample`)を用意しておきます。

以下のエンティティを考えます（[前回記事](/blogs/2022/07/27/typeorm-with-typescript/)からの流用です）。

```typescript
@Entity()
export class Article extends BaseEntity {
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

ブログ記事を管理することを想定したシンプルなArticleエンティティです。

ここから初期構築DDLを生成しますが、その前にTypeORMの実行コマンドを設定しておきます。
package.jsonに以下スクリプトを追加しておきます。

```json
{
  "scripts": {
    "typeorm": "typeorm-ts-node-commonjs"
  }
}
```

デフォルトの`typeorm`コマンドはJavaScriptファイルをもとにマイグレーションを実行するため、TypeScriptファイルのコンパイルが必要になります。
ここでは、その手間を減らすためにTypeORMで用意してくれている`typeorm-ts-node-commonjs`コマンド[^1]に置き換えています。
こちらを使うと、1つのコマンドでts-nodeで各種コマンドが実行されるようになります。

[^1]: プロジェクトがESModuleの場合は、`typeorm-ts-node-esm`コマンドを指定します。

ではDDLを生成してみます。
`migration:generate`サブコマンドに先程切り出したデータソースファイルと生成するマイグレーション名を指定します。

```shell
npm run typeorm migration:generate -- --dataSource src/datasource.ts --pretty migrations/InitialSchema
```
```
query: SELECT * FROM current_schema()
query: SELECT version();
query: SELECT * FROM current_schema()
query: SELECT * FROM current_database()
query: SELECT "table_schema", "table_name" FROM "information_schema"."tables" WHERE ("table_schema" = 'public' AND "table_name" = 'article')
query: SELECT * FROM "information_schema"."tables" WHERE "table_schema" = 'public' AND "table_name" = 'typeorm_metadata'
Migration /Users/noboru-kudo/workspace/typeorm-work/migrations/1677030260510-InitialSchema.ts has been generated successfully.
```

出力内容からTypeORMが実際にDBに接続し、エンティティのソースコードとスキーマを比較している様子が分かります。
そこから生成されたマイグレーションファイルは、以下のようになりました。

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1677030260510 implements MigrationInterface {
  name = 'InitialSchema1677030260510'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "article" (
                "id" SERIAL NOT NULL,
                "url" character varying NOT NULL,
                "title" character varying NOT NULL,
                "content" text NOT NULL,
                "note" character varying,
                "star" integer NOT NULL DEFAULT '0',
                "created" TIMESTAMP NOT NULL,
                CONSTRAINT "UQ_b99fa71c07cc9a8421bd36bb1db" UNIQUE ("url"),
                CONSTRAINT "PK_40808690eb7b915046558c0f81b" PRIMARY KEY ("id")
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "article"
        `);
  }
}
```
これがTypeORMのマイグレーションファイルです。
upメソッドには、CREATE TABLE文が記述されています。エンティティ定義から自動生成されたものです。
一方で、downメソッドにはその逆の操作(DROP TABLE文)のスクリプトも出力されています。
このように、TypeORMのマイグレーション機能は前進だけでなく、ロールバックも考慮されたものとなっています。

マイグレーションファイル名にはCLIで指定したものそのままではなく、タイムスタンプ(Unixタイム)がプレフィックスとして追加されます。
このタイムスタンプはマイグレーションの実行順序を決定するものですので、注意が必要です。
デフォルトではマイグレーションファイル作成時のタイムスタンプがファイルに付与されますが、`--timestamp`オプションで個別指定も可能です。詳細は[TypeORMのドキュメント](https://typeorm.io/migrations#timestamp-option)を参照してください。
 
:::column:自作でDDLを作成する場合
ここではエンティティからDDLを生成する方法を使っていますが、もちろん自作も可能です。
その場合は、以下のコマンドで空のマイグレーションファイルを作成します。

```shell
npm run typeorm migration:create -- <path/to/migration>
```

ここで生成されたマイグレーションファイルに対して、DDLまたはTypeORMが提供する各種APIを用いてマイグレーションスクリプトを記述していきます。
TypeORMが提供するマイグレーション用APIは、以下公式ドキュメントを参照してください。

- [TypeORM Doc - Using migration API to write migrations](https://typeorm.io/migrations#using-migration-api-to-write-migrations)

もちろん自作の場合は、スキーマとエンティティの定義がずれないように注意が必要です。
:::

このマイグレーションファイルをそのまま実行します。
マイグレーションの実行は`migration:run`サブコマンドを使います。

```shell
npm run typeorm migration:run -- --dataSource src/datasource.ts 
```
```
query: SELECT * FROM current_schema()
query: SELECT version();
query: SELECT * FROM "information_schema"."tables" WHERE "table_schema" = 'public' AND "table_name" = 'migrations'
query: CREATE TABLE "migrations" ("id" SERIAL NOT NULL, "timestamp" bigint NOT NULL, "name" character varying NOT NULL, CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY ("id"))
query: SELECT * FROM "migrations" "migrations" ORDER BY "id" DESC
0 migrations are already loaded in the database.
1 migrations were found in the source code.
1 migrations are new migrations must be executed.
query: START TRANSACTION
query: 
            CREATE TABLE "article" (
                "id" SERIAL NOT NULL,
                "url" character varying NOT NULL,
                "title" character varying NOT NULL,
                "content" text NOT NULL,
                "note" character varying,
                "star" integer NOT NULL DEFAULT '0',
                "created" TIMESTAMP NOT NULL,
                CONSTRAINT "UQ_b99fa71c07cc9a8421bd36bb1db" UNIQUE ("url"),
                CONSTRAINT "PK_40808690eb7b915046558c0f81b" PRIMARY KEY ("id")
            )
        
query: INSERT INTO "migrations"("timestamp", "name") VALUES ($1, $2) -- PARAMETERS: [1677030260510,"InitialSchema1677030260510"]
Migration InitialSchema1677030260510 has been  executed successfully.
query: COMMIT
```

TypeORMがDBに接続し、upメソッドに記述したCREATE TABLE文を実行している様子が分かります。

また、それだけでなくmigrationsというテーブルを作成し、マイグレーション結果を挿入しています。
これがTypeORMでスキーマの適用状況を管理しているテーブルです[^2]。

[^2]: データソースの設定(`migrationsTableName`)でテーブル名は自由に変更できます。

このmigrationsテーブルの内容を確認してみます。

```sql
select * from migrations;
```
```
 id |   timestamp   |            name            
----+---------------+----------------------------
  1 | 1677030260510 | InitialSchema1677030260510
(1 row)
```

TypeORMでは、このテーブルで現在のスキーマバージョンを把握し、未適用のマイグレーションファイルをタイムスタンプ順に適用するようです。

:::column:アプリケーション起動時にマイグレーションを実行する
今回はCLI(`migration:run`)からマイグレーションを実行していますが、データソースオプションで`migrationsRun`をtrueに指定すると、アプリケーション起動時(データソース作成時)にマイグレーションも同時に実行してくれます。
:::

## テーブル変更/追加(スキーママイグレーション)

しばらく運用後に機能拡張があり、エンティティを以下のように修正する必要があったと仮定します。

```typescript
@Entity()
export class Article extends BaseEntity {
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

  // フィールド追加!!
  @Column()
  updated!: Date;
  
  @OneToMany(() => Tag, (tag) => tag.article, { cascade: true })
  tags!: Tag[];
}

// 新規追加!!
@Entity()
export class Tag {
  constructor(name: string) {
    this.name = name;
  }
  @PrimaryColumn()
  name!: string;

  @ManyToOne(() => Article, (article) => article.tags)
  article!: Article;
}
```

以下の変更をしています。
1. Articleエンティティにフィールド(`updated`)を追加
2. Tagエンティティ追加、Articleエンティティとの関連追加

ここで先程のマイグレーションファイルの生成コマンドを再度実行します。

```shell
npm run typeorm migration:generate -- --dataSource src/datasource.ts --pretty migrations/AddTag
```

生成されたマイグレーションファイルは以下です。

```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTag1677043583519 implements MigrationInterface {
  name = 'AddTag1677043583519'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "tag" (
                "name" character varying NOT NULL,
                "articleId" integer,
                CONSTRAINT "PK_6a9775008add570dc3e5a0bab7b" PRIMARY KEY ("name")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "article"
            ADD "updated" TIMESTAMP NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "tag"
            ADD CONSTRAINT "FK_f0d122075d3287f7f57b2a02a93" FOREIGN KEY ("articleId") REFERENCES "article"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "tag" DROP CONSTRAINT "FK_f0d122075d3287f7f57b2a02a93"
        `);
    await queryRunner.query(`
            ALTER TABLE "article" DROP COLUMN "updated"
        `);
    await queryRunner.query(`
            DROP TABLE "tag"
        `);
  }
}
```

TypeORMが、初期構築時のスキーマとの差分を分析し、DDLを生成してくれました。
新規テーブル追加や既存テーブルへのカラム追加、外部キー追加と全部です。あとは適用するだけ、便利ですね。

マイグレーション実行方法は先程の初期構築と同じです。

```shell
npm run typeorm migration:run -- --dataSource src/datasource.ts 
```

```
query: SELECT * FROM current_schema()
query: SELECT version();
query: SELECT * FROM "information_schema"."tables" WHERE "table_schema" = 'public' AND "table_name" = 'migrations'
query: SELECT * FROM "migrations" "migrations" ORDER BY "id" DESC
1 migrations are already loaded in the database.
2 migrations were found in the source code.
InitialSchema1677030260510 is the last executed migration. It was executed on Wed Feb 22 2023 10:44:20 GMT+0900 (Japan Standard Time).
1 migrations are new migrations must be executed.
query: START TRANSACTION
query: 
            CREATE TABLE "tag" (
                "name" character varying NOT NULL,
                "articleId" integer,
                CONSTRAINT "PK_6a9775008add570dc3e5a0bab7b" PRIMARY KEY ("name")
            )
        
query: 
            ALTER TABLE "article"
            ADD "updated" TIMESTAMP NOT NULL
        
query: 
            ALTER TABLE "tag"
            ADD CONSTRAINT "FK_f0d122075d3287f7f57b2a02a93" FOREIGN KEY ("articleId") REFERENCES "article"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        
query: INSERT INTO "migrations"("timestamp", "name") VALUES ($1, $2) -- PARAMETERS: [1677043583519,"AddTag1677043583519"]
Migration AddTag1677043583519 has been  executed successfully.
query: COMMIT
```

前回のマイグレーション履歴(migrationsテーブル)をもとに未適用のマイグレーションファイルを検出して、適用していることが分かります。

## ロールバック

ここで、このリリースに致命的なバグがあってスキーマを戻す場合を考えてみます。
この場合は`migration:revert`サブコマンドを使います。

```shell
npm run typeorm migration:revert -- --dataSource src/datasource.ts
```
```
query: SELECT * FROM current_schema()
query: SELECT version();
query: SELECT * FROM "information_schema"."tables" WHERE "table_schema" = 'public' AND "table_name" = 'migrations'
query: SELECT * FROM "migrations" "migrations" ORDER BY "id" DESC
2 migrations are already loaded in the database.
AddTag1677043583519 is the last executed migration. It was executed on Wed Feb 22 2023 14:26:23 GMT+0900 (Japan Standard Time).
Now reverting it...
query: START TRANSACTION
query: 
            ALTER TABLE "tag" DROP CONSTRAINT "FK_f0d122075d3287f7f57b2a02a93"
        
query: 
            ALTER TABLE "article" DROP COLUMN "updated"
        
query: 
            DROP TABLE "tag"
        
query: DELETE FROM "migrations" WHERE "timestamp" = $1 AND "name" = $2 -- PARAMETERS: [1677043583519,"AddTag1677043583519"]
Migration AddTag1677043583519 has been  reverted successfully.
query: COMMIT
```

1つ前のマイグレーションをロールバックしています。
該当マイグレーションファイルのdownメソッドの実行と、TypeORMのmigrationsテーブルから該当レコードを削除しています。

もちろんこのロールバックは既に入っているデータを削除してしまうので、実際にやる場合は事前にデータバックアップしておく等の配慮が必要です。

## スキーマ適用状況確認

最後に、TypeORMから現在のスキーマ適用状況を確認します。
これには`migration:show`サブコマンドを使います。

```shell
npm run typeorm migration:show  -- --dataSource src/datasource.ts
```
```
[X] 1 InitialSchema1677030260510
[ ] AddTag1677043583519
```

初期構築で利用した`InitialSchema1677030260510`は適用済み(`[X]`)で、先程ロールバックした`AddTag1677043583519`は未適用(`[ ]`)であることが分かります。
実際のマイグレーション前に、予期しないものが含まれていないかを確認すると良さそうです。

## まとめ

TypeORMのスキーママイグレーション機能についてご紹介しました。
単純なマイグレーション管理だけでなく、エンティティからの自動生成やロールバック機能等、必要十分な機能がある印象です。


実際に商用環境でTypeORMを使う場合は、有効に活用できるとスキーマ管理が楽になりそうですね。
