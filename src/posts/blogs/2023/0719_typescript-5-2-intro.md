---
title: TypeScript v5.2で導入されるusing宣言とDecorator Metadataを使ってみる
author: noboru-kudo
date: 2023-07-19
tags: [typescript]
---

少し前にTypeScript v5.2のベータバージョンがリリースされました。

- [Announcing TypeScript 5.2 Beta](https://devblogs.microsoft.com/typescript/announcing-typescript-5-2-beta/)

いくつか注目機能の導入がありましたので、試してみた結果をご紹介します。

:::alert
今回紹介するものは、現時点ではJavaScriptランタイム環境でサポートが追いついていないものがほとんどです。
このため、ここでのサンプルソースコードはCoreJSでPolyfillしたものを使っています。

また、v5.2のベータバージョンを使っていますので、利用する場合は最新の状況を確認してください(安定版は2023-08リリース予定です)。
:::

## using宣言によるリソース解放(クリーンアップ)

以下ECMAScriptプロポーザルのTypeScript実装です。

- [TC39 Proposal - ECMAScript Explicit Resource Management](https://github.com/tc39/proposal-explicit-resource-management)

try-finallyを使わなくとも、確実にリソースの解放をしてくれます。
Javaのtry-with-resourceやC#のusing構文など、他の言語ではかなり前からありましたが、(意外にも)JavaScript/TypeScriptにはありませんでした。

この機能自体は、以下Zennの記事で非常に詳しく説明されています。詳しく知りたい方はこちらを読むのが一番良いと思います。

- [TypeScript 5.2で予告されているusingをいじってみる](https://zenn.dev/ventus/articles/ts5_2-using-preview)

本記事はポイントのみ紹介します。

いきなりですが、以下のようなソースコードになります。

```typescript
class Connection implements Disposable {

  database: string | null; // サンプルのリソース管理対象

  constructor() {
    this.database = 'my database';
    console.log('initialize!!')
  }
  update(): void {
    this.database = 'foo database'
    console.log('update my database!!')
  }
  // Disposableの実装
  [Symbol.dispose]() {
    // クリーンアップ処理
    this.database = null;
    console.log('connection released!!')
  }
}

function updateDB() {
  // v5.2で追加されたusing宣言
  using conn = new Connection();
  conn.update();
} // スコープを抜けると[Symbole.dispose]()が実行されてクリーンアップされる
```

リソース解放するオブジェクトは、Disposableインターフェースをimplementsする必要があります。
Disposableインターフェースの定義は、以下のようになっています。

```typescript
interface Disposable {
    [Symbol.dispose](): void;
}
```

`[Symbol.dispose]()`のみが定義されています。ここでクリーンアップ処理を実装します。
このオブジェクトを新たに追加された`using`を使って変数宣言すると、スコープを抜けるタイミングでこのクリーンアップ処理が実行されます。

もちろん非同期用のAsyncDisposableインターフェースも用意されています。

```typescript
interface AsyncDisposable {
    [Symbol.asyncDispose](): PromiseLike<void>;
}
```

クリーンアップ処理が非同期な場合は、こちらを使うことになります。
この場合は、以下のように`using`の前に`await`をつける必要があります。

```typescript
async function updateDB() {
  await using conn = new Connection();
  conn.update();
}
```

:::column:DisposableStackでクリーンアップ処理を記述する
個別にDisposableを実装せずに、もっと柔軟にクリーンアップ処理を記述するDisposableStack(またはAsyncDisposableStack)もサポートされます。
対象オブジェクトを直接変更できない場合や、複数のクリーンアップ処理をまとめるなど柔軟な使い方ができます。

これはGo言語やSwiftで使われるDefer構文を使ったクリーンアップ処理と似ています。
先ほどのソースコードをDisposableStackで書き直すと、以下のようになります。

```typescript
function updateDB() {
  let database: string | null = 'my database';
  using cleanup = new DisposableStack()
  cleanup.defer(() => {
    // クリーンアップ処理
    database = null;
    console.log('connection released!!')
  })
  // update
  database = 'foo database'
} // スコープを抜けるタイミングでdeferが実行される
```

`using`宣言で`DisposableStack`を生成し、これの`defer`にクリーンアップ処理を実装します。
この場合でもDisposableStackのインスタンスがスコープを抜けるタイミングで、クリーンアップ処理が実行されます。つまりDisposableStackがDisposableインターフェースを実装しています。
検証していませんが、DisposableStackには`defer`以外も様々なメソッドが用意されていますので、様々なユースケースに対応するクリーンアップ処理が実装できそうです。
:::

## Decorator Metadata

以下の記事でも紹介していますが、Decorator(Stage 3)自体はv5.0で正式に導入されています。

- [TypeScript5で導入されたStage 3のDecoratorを眺めてみる](/blogs/2023/02/15/typescript5-decorator-intro/)

ですが、この時点でメタデータAPIは別プロポーザルに切り出されて先送りされていました。
このメタデータAPIがStage 3となり、TypeScript v5.2で導入されることになりました。

- [TC39 Proposal - Decorator Metadata](https://github.com/tc39/proposal-decorator-metadata)

早速ソースコードを書いてみます。
以下のように仮想ORマッパーのエンティティクラスを想定してみます。

```typescript
class Blog {
  @Column({ name: 'ID', type: 'int', notNull: true })
  id: number;
  @Column({ name: 'TITLE', type: 'varchar', notNull: true })
  title: string;
  @Column({ name: 'CONTENT', type: 'varchar', notNull: true })
  content: string;
  @Column({ name: 'STAR', type: 'int', notNull: false })
  star: number;

  constructor(id: number, title: string, content: string, star: number) {
    this.title = title;
    this.id = id;
    this.content = content;
    this.star = star;
  }
}
```

フィールドにDecorator(`@Column`)がついています。引数としてカラム属性を設定しています。
今回はこの属性をメタデータとして利用するものとします。

対応するDecoratorの関数は以下のようになります。

```typescript
type Attr = { name: string, type: 'varchar' | 'char' | 'int', notNull: boolean }

function Column(attr: Attr) {
  return function(target: any, context: ClassFieldDecoratorContext) {
    context.metadata[context.name] = attr;
  };
}
```

地味ですが、メタデータAPIとして`context.metadata`が追加されました。
このメターデータの型は`DecoratorMetadata`で、以下の定義となっています。

```typescript
declare type PropertyKey = string | number | symbol;
type DecoratorMetadataObject = Record<PropertyKey, unknown> & object;

type DecoratorMetadata =
    typeof globalThis extends { Symbol: { readonly metadata: symbol } } ? DecoratorMetadataObject : DecoratorMetadataObject | undefined;
```

条件付きタイプが使われていて、少し分かりにくいですが`Record<PropertyKey, unknown>`となっているところを見るとキーバリュー形式で使えるものと思って良さそうです。
このメターデータは、該当クラスの全てのDecorator関数で同じものが使われます。
ここでは、シンプルにメタデータに引数として渡されている属性情報を保存しています。

次に外部からこのメタデータにアクセスしてみます。

```typescript
const metadata = Blog[Symbol.metadata] ?? {};
Object.keys(metadata).forEach((key) => {
  console.log(`${key} -> ${JSON.stringify(metadata[key])}`);
});
// id -> {"name":"ID","type":"int","notNull":true}
// title -> {"name":"TITLE","type":"varchar","notNull":true}
// content -> {"name":"CONTENT","type":"varchar","notNull":true}
// star -> {"name":"STAR","type":"int","notNull":false}
```

メタデータはクラスに紐づいていますので、上記のようにクラスの`Symbol.metadata`から取得できます(`Symbol.metadata`もv5.2で追加されました)。
ここでは取得したメタデータをそのままログに出力しています。

:::column:メタデータをプライベートに扱う
上記コードはメタデータはパブリック扱いです(どこからでもクラスから参照できる)。
冒頭の[TypeScriptブログ](https://devblogs.microsoft.com/typescript/announcing-typescript-5-2-beta/)や[TC39プロポーザル](https://github.com/tc39/proposal-decorator-metadata)ではWeakMapを使ってメタデータの格納をプライベートにする方法を紹介しています。

この場合は以下のようなソースコードになります。
```typescript
// エンティティのソースコードは変更なし

// 仮想プライベートな変数
const ATTRIBUTES = new WeakMap();
function Column(attr: Attr) {
  return function(target: any, context: ClassFieldDecoratorContext) {
    // メタデータをキーとしてクラスに紐づくメタデータを取得
    // コンテキストのメタデータには何も格納してない
    let metadata = ATTRIBUTES.get(context.metadata);

    if (!metadata) {
      metadata = {};
      ATTRIBUTES.set(context.metadata, metadata);
    }

    metadata[context.name] = attr;
  };
}

// クラスに紐づくメタデータを取得
const metadata = ATTRIBUTES.get(Blog[Symbol.metadata] ?? {});
Object.keys(metadata).forEach((key) => {
  console.log(`${key} -> ${JSON.stringify(metadata[key])}`);
});
```

この場合はDecorator関数では、メタデータ(`context.metadata`)ではなくプライベートな変数(上記では`ATTRIBUTES`)に保存しています。
:::

## まとめ

using宣言などTypeScript v5.2も重要なECMAScriptプロポーザルが導入されています。
一般的に使われ出すのはもう少し先になりますが、乗り遅れないようしっかり予習しておきたいものですね。