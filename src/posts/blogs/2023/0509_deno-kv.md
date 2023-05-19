---
title: Deno のビルトイン key-value データベース Deno KV が登場
author: masahiro-kondo
date: 2023-05-09
tags: [Deno]
---

4月末の Deno 1.33 のリリースで、ビルトインの key-value データベースである Deno KV が 導入されました。

[Deno 1.33: Deno 2 is coming](https://deno.com/blog/v1.33)

5月に入って Deno KV の正式なアナウンスがありました。

[Announcing Deno KV](https://deno.com/blog/kv)

公式サイトもローンチしています。

[Deno KV - a global database for global apps](https://deno.com/kv)

## Deno KV の概要
[アナウンスのブログ](https://deno.com/blog/kv)によると Deno KV は以下の特徴を備えるソリューションです。

- Deno ランタイムにシームレスに統合
- ローカルでの開発時は SQLite が使われる
- マネージド(Deno Deploy)では、現在世界の35の地域でレプリケートされ低レイテンシーを実現
- シンプルな操作、JavaScript で構造化されたシリアライズ可能な値を保存
- アトミックなトランザクションをサポート
- 強力な一貫性とパフォーマンス保証

ライブラリのインポートなしでどこでも使えて、Deno Deploy にデプロイすれば低遅延のデータストアを備えたバックエンドが構築できるというものです。

:::info
記事執筆時点では Deno KV はベータ版で Deno Deploy での利用はクローズドベータになっています。参加するには waiting list に登録しておく必要があります。
:::

以下のプレイグラウンドでは、グローバルに一貫性のある永続的なカウンターの実装コードが非常に簡単に実装できることが示されています。この例では、アトミックなトランザクションが使用されています。

[getting-started-with-kv - Deno Playground](https://dash.deno.com/playground/getting-started-with-kv)

[「ユースケースと例」](https://deno.com/blog/kv#use-cases-and-examples)のセクションに、リアルタイム性の高いマルチプレイヤーゲームやコラボレーション、ユーザー生成データの管理、認証などが挙げられており、いくつかのデモも紹介されています。

## Deno KV のドキュメント
Deno Manual のランタイムの章に Deno KV の説明があります。

[Deno KV | Manual | Deno](https://deno.com/manual@v1.33.2/runtime/kv)

Deno.Kv のメソッド一覧です。

| メソッド | 機能         |
|:------:|:-------------|
| get    | キーによる値取得 |
| list   | セレクターにマッチする値のリスト取得 |
| set    | キーと値を指定して値を保存。キーが存在すれば上書き |
| delete | キーを指定して値を削除 |
| sum    | キーを指定して値を加算。キーが存在しない場合は指定された値で作成 |
| min    | キーを指定して、現在値と入力値の小さい方を採用して更新 |
| max    | キーを指定して、現在値と入力値の大きい方を採用して更新 |

以下のページにそれぞれのコードサンプルが載っています。

[Operations | Manual | Deno](https://deno.com/manual@v1.33.2/runtime/kv/operations)

アトミックトランザクションの利用方法については以下にあります。

[Transactions | Manual | Deno](https://deno.com/manual@v1.33.2/runtime/kv/transactions)

値による検索をサポートするためにセカンダリーインデックスを作成する方法については以下にあります。

[Secondary indexes | Manual | Deno](https://deno.com/manual@v1.33.2/runtime/kv/secondary_indexes)

Deno は キーと値とバージョンスタンプの組み合わせによるフラットな名前空間を構成します。キーと値の構造については以下にあります。

[Key Space | Manual | Deno](https://deno.com/manual@v1.33.2/runtime/kv/key_space)

## REST API のデータストアとして使ってみる
Deno KV は Deno 1.33 以降であればローカルでは利用できます。簡単な REST API で使ってみました。書籍情報を登録・取得する非常に簡単なものです。

```typescript
import { serve } from "https://deno.land/std@0.185.0/http/server.ts";

// Deno KV をオープン
const kv = await Deno.openKv();

// 事前にいくつかデータを登録
await kv.set(["books", "978-1-09-123456-2"], { title: "The Great Gatsby", author: "F. Scott Fitzgerald" });
await kv.set(["books", "978-1-09-123456-3"], { title: "The Grapes of Wrath", author: "John Steinbeck" });
await kv.set(["books", "978-1-09-123456-4"], { title: "Nineteen Eighty-Four", author: "George Orwell" }); 

// リクエストパスの定義
const BOOKS = new URLPattern({ pathname: "/books" });
const BOOKS_ISBN = new URLPattern({ pathname: "/books/:isbn" });

// ハンドラーの定義
async function handler(req: Request): Promise<Response> {
  const matchIsbn = BOOKS_ISBN.exec(req.url);
  const matchBooks = BOOKS.exec(req.url);

  if (matchIsbn) {
    const isbn = matchIsbn.pathname.groups.isbn;
    if (req.method === "GET") {
      // キーで取得する
      const res = await kv.get(["books", isbn]);  // ["books", isbn] がキー
      if (res.value) {
        return new Response(JSON.stringify(res.value), { status: 200 });
      }
      return new Response("Not found", { status: 404 });
    } else if (req.method === "DELETE") {
      // キーで削除
      await kv.delete(["books", isbn]); // キーが存在しない場合は no-op
      return new Response("OK", { status: 200 });
    }
  } else if (matchBooks) {
    if (req.method === "GET") {
      // 最大100件のリストを返却
      const iter = await kv.list({ prefix: ["books"] }, { limit: 100 });
      const books = [];
      for await (const res of iter) {
        books.push(res.value);
      }
      return new Response(JSON.stringify(books), { status: 200 });
    } else if (req.method === "POST") {
      // 入力データを登録
      const body = await req.json();
      const res = await kv.set(["books", body.isbn], { title: body.title, author: body.author });
      return new Response(res.versionstamp, { status: 201 }); // versionstamp を返却
    }
  }

  return new Response("Bad Request", { status: 400 });
}

serve(handler);
```

起動時に `Deno.openKv()` で KV を用意しサンプルデータを登録しています。ランタイムの API なので外部ライブラリの import なしに利用できていることがわかります。リクエストに応じて `get`/`set`/`list` の各メソッドを使ってデータの取得や登録を行なっています[^1]。

[^1]: 同時実行制御を考慮すると、登録のところはアトミックトランザクションを使った方がよいかもしれません。

:::info
このサンプルでは短く書くために URLPattern でリクエストをルーティングしています。
本来であれば router を書いて handler をリクエスト単位に分割すべきです。
:::

このコードを実行するには、以下のようにします。Deno.Kv は不安定版なので --unstable フラグをつけて起動します。

```shell
deno run --unstable --allow-net --watch mod.ts
```

curl での API 呼び出しは以下のようになります。

```shell
# リストで取得
$ curl localhost:8000/books | jq .
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100   177  100   177    0     0  26347      0 --:--:-- --:--:-- --:--:-- 88500
[
  {
    "title": "The Great Gatsby",
    "author": "F. Scott Fitzgerald"
  },
  {
    "title": "The Grapes of Wrath",
    "author": "John Steinbeck"
  },
  {
    "title": "Nineteen Eighty-Four",
    "author": "George Orwell"
  }
]

# キーで取得
$ curl localhost:8000/books/978-1-09-123456-2 | jq .
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100    59  100    59    0     0   7439      0 --:--:-- --:--:-- --:--:-- 59000
{
  "title": "The Great Gatsby",
  "author": "F. Scott Fitzgerald"
}

# 登録
$ curl -X POST -H "Content-Type: application/json" localhost:8000/books -d '{"isbn":"978-1-09-123456-5","title":"hoge", "author":"mh"}'
00000000000001cd0000

# 削除
$ curl -X DELETE localhost:8000/books/978-1-09-123456-5                               
OK
```

プロジェクトの全体は以下のリポジトリにあります。

[GitHub - kondoumh/deno-serve-kv: Deno REST API example with Deno.Kv](https://github.com/kondoumh/deno-serve-kv)

## Deno Deploy におけるマネージド実行
Deno Deploy おいては Deno KV は、Deno 社によるマネージド環境で運用されます。Apple が開発する ACID トランザクションをサポートする分散データベース FaundationDB が使用されているそうです。

[FoundationDB | Home](https://www.foundationdb.org/)

Deno Deploy における Deno KV の一貫性やレイテンシー、レプリケーションの仕様については以下のドキュメントにあります。

[Deno KV | Deploy Docs](https://deno.com/deploy/docs/kv)

## 最後に
以上、Deno KV の紹介でした。JavaScript のデータ構造を素直に扱えるので実装はシンプルですし、Deno Deploy でスケールアウトできる点が魅力的だと思いました。

Cloudflare も [D1 で SQLite の実行をサポート](https://blog.cloudflare.com/ja-jp/introducing-d1-ja-jp/)しましたが、Deno.Kv は Deno ランタイムと統合されデータベースの存在をあまり意識することなく実装できる印象です[^2]。

[^2]: パフォーマンスチューニングの段階では思いっきり意識すると思いますが。

クローズドベータが使えるようになったら Deno Deploy で試してみたいと思います。

:::info:2023.05.19追記
Deno KV を Deno Deploy で試した記事を書きました

[Deno KV を Deno Deploy で使う](/blogs/2023/05/18/deno-kv-on-deno-deploy/)
:::
