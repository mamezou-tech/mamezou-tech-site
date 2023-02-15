---
title: TypeScript5で導入されたStage 3のDecoratorを眺めてみる
author: noboru-kudo
date: 2023-02-15
tags: [typescript]
---

TypeScriptでDecoratorって使っていますか？

DecoratorはJava等のオブジェクト指向言語ではお馴染みのアノテーションです。DI/AOP等のメタプログラミングでよく使われているものです。
Decorator自体はECMAScriptの仕様の1つで、ドラフトバージョンとしてかなり前から存在していました。
現時点(v4.9)のTypeScriptでサポートしているDecoratorはStage 2(Draft)の仕様です。
仕様策定が難航していたDecoratorですが、一部を除いて2022-03にようやくStage 3(Candidate)へと昇格し、TypeScript v5.0(2023-03)からサポートされる予定です。

- [Announcing TypeScript 5.0 Beta](https://devblogs.microsoft.com/typescript/announcing-typescript-5-0-beta/)

Decoratorは、AngularやNestJS、TypeORM等のライブラリを使う場合にMustで使うことになりますが、それ以外のケースだとほとんど見かけることがなくなってきたと感じます(そもそもクラスの人気がない)。
とはいえ、ようやく仕様が固まってデフォルトで有効になったので、今後はもう少し注目度が上がってくるかもしれません。

そんな新しくなったDecoratorを、TypeScript v5.0のベータバージョンを使って簡単に眺めてみます。

なお、正式リリースではまだ変更があるかもしれません。利用する際はTypeScriptの公式ドキュメントを参照してください。

## デフォルト有効(experimentalDecorators不要)

v4.9まではDecoratorを使う場合、tsconfig.jsonで以下のように指定する必要がありました。
```json
{
  "compilerOptions": {
      "experimentalDecorators": true,
  }
}
```

v5.0以降ではこの設定は不要で、デフォルトでStage 3のDecoratorが利用できます。
互換性のためexperimentalDecoratorsを指定するStage 2のDecoratorも当面は維持されるようですが、これを指定するとStage 3のDecoratorは動作しませんでした。混在はできなそうです。

とはいえ、現時点でDecoratorを提供するライブラリはStage 2です。
そのようなライブラリに依存する場合は、ライブラリ側でStage 3対応が終わるまでは、従来のStage 2のDecoratorを使い続ける(つまりexperimentalDecoratorsを指定する)必要がありそうです。

:::info
Stage 2で上記と合わせて指定されることの多いメタデータ出力(`emitDecoratorMetadata`)については、今回のStage 3には含まれません。
v5.0時点でこの機能を使う場合は、Stage 3ではなく、従来通りStage 2のDecoratorを使う必要があります。
なお、メタデータAPIの仕様については現在Stage 2として仕様策定が進められています。

- [GitHub - Decorator Metadata](https://github.com/tc39/proposal-decorator-metadata)
:::

## Decoratorが指定可能なポイント

現段階ではDecoratorの利用側にとっては、Stage 2/3で大きく変わりません。
Stage 3 Decoratorが指定可能なポイントは以下の通りです。

1. クラス(Class)
2. フィールド
3. Auto-Accessor(v4.9より導入)
4. Getter/Setter
5. メソッド

```typescript
@classDecorator
class Foo {
  @fieldDecorator
  name: string = "foo";

  @accessorDecorator
  accessor hoge: number = 0;

  @getterDecorator
  get bar(): string {
    return "bar";
  }

  @setterDecorator
  set bar(v: string) {
  }

  @methodDecorator
  greet() {
    console.log("hello!!")
  }
}
```

1点注意が必要です。
Stage 2のDecoratorでは、コンストラクタやメソッドの引数にもDecoratorを指定できましたが、Stage 3ではこのParameter Decoratorがまだサポートされていません。
Parameter Decoratorは、Decorator本体のProposalから分離されて、現在も議論が進められている状況です。

- [GitHub Issue - Parameter decorators](https://github.com/tc39/proposal-decorators/issues/47)

Parameter DecoratorはAngularのようなDIフレームワークでは特に望まれるものだと思いますが、まだ時間がかかりそうですね。

## Decorator関数の基本構造

Stage 3 Decoratorの作成方法を見てみます。Decoratorは関数(function)として作成しますが、Stage 2とシグニチャが異なります。

例えば、Stage 2のメソッドDecoratorだと以下のようになります。

```typescript
function methodDecorator(target: any, 
                         propertyKey: string, 
                         descriptor: PropertyDescriptor) {
  // ...
};
```

Stage 3では以下のようになります。

```typescript
function methodDecorator(target: Function, 
                         context: ClassMethodDecoratorContext) {
  // ...
};
```

いろいろ変わっています。
そうです。Stage 2とStage 3ではDecorator関数のAPI互換は全くありません。個人的にはStage 3でより分かりやすいインターフェースになったと思いますが。

Stage 3では、1つ目の引数にデコレートする対象(ここではメソッド自体)、2つ目の引数にデコレート対象のコンテキストオブジェクトを指定します。
このスタイルはメソッド以外のDecoratorでも同様です(設定される内容は変わってきますが)。

ここでコンテキストとして使っているClassMethodDecoratorContextの型定義は以下のようになっていました。

```typescript
interface ClassMethodDecoratorContext<
    This = unknown,
    Value extends (this: This, ...args: any) => any = (this: This, ...args: any) => any,
> {
    readonly kind: "method";
    readonly name: string | symbol;
    readonly static: boolean;
    readonly private: boolean;
    readonly access: {
        has(object: This): boolean;
        get(object: This): Value;
    };
    addInitializer(initializer: (this: This) => void): void;
}
```

メソッド以外のDecoratorでも対応するコンテキストの型がそれぞれ用意されていますので、それを使う形になります。

なお、Decorator関数の戻り値はvoid(つまり何も返さない)か、新しいデコレート対象を返します。
新しいデコレート対象を返すと、実際の呼び出しは置き換えられます。

## Method Decoratorを作成する

Stage 3 のDecoratorを使って、メソッドに適用するMethod Decoratorを作成してみます。
まずは、メソッドの実行時間をログに出力する単純なDecoratorを実装してみます。

```typescript
function timeLogged<This, Args extends any[], Return>(
  target: (this: This, ...args: Args) => Return,
  { name }: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>
) {
  const methodName = String(name);

  return function(this: This, ...args: Args): Return {
    console.time(methodName);
    try {
      return target.call(this, ...args);
    } finally {
      console.timeLog(methodName);
    }
  };
}
```

型アノテーションを付けているので、先程見た形と違って見えますが同じものです。
ここではデコレート対象のメソッドをラップした新しい関数を返しています。
実装としてはオリジナル関数の呼び出し前後で実行時間を計測して出力するだけのシンプルなものです。

これを使うクラスは以下のようになります。

```typescript
class Person {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  @timeLogged
  greet() {
    console.log(`Hello, ${this.name}.`);
  }
}

new Person('mamezou').greet(); // 実行！
```

これを実行すると、greetメソッド実行後に実行時間が出力されます[^1]。

[^1]: ちなみにこの実装では、asyncメソッドでは期待通りの実行時間を得られませんのであしからず。

```
Hello, mamezou.
greet: 4.572ms
```

もちろん、Decorator関数自体への引数の指定もできます。
これの実装方法はStage 2と同じです。Decorator関数自身を返すFactory関数を作成します(Decorator Factories)。
Decorator関数の引数はこのFactory関数で受け取ります。

例えば、先程のDecoratorを`withArgs: true`と指定すると、実行時間と一緒に引数も出力するようにしてみます。

```typescript
function timeLogged<This, Args extends any[], Return>({ withArgs = false }) {
  return function(
    target: (this: This, ...args: Args) => Return,
    { name }: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>
  ) {
    const methodName = String(name);

    return function(this: This, ...args: Args): Return {
      console.time(methodName);
      try {
        return target.call(this, ...args);
      } finally {
        console.timeLog(methodName, withArgs ? args : undefined);
      }
    };
  };
}
```

functionのネストが深くて見にくいかもしれませんが、先程のDecorator関数をFactory関数でラップしています。
外側の関数で引数に`{ withArgs: boolean }`をもらい、内部のDecorator関数内で引数の出力有無を制御しています。

利用する側は以下のようにします。

```typescript
class Person {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  @timeLogged({ withArgs: true })
  greetWith(message: string) {
    console.log(`${message}, ${this.name}.`);
  }
}

new Person('mamezou').greetWith('こんにちは！');
```

`@timeLogged`の引数に`{ withArgs: true }`を指定しています。
これを実行すると以下のように出力されます。

```
こんにちは！, mamezou.
greetWith: 0.06ms [ 'こんにちは！' ]
```

実行時間とともに、メソッド引数の内容も出力されました。

## まとめ

TypeScript v5.0時点でのStage 3 Decoratorは、メタデータAPIやParameter Decoratorがなかったりと、まだ不完全な印象があります。
この辺りが充実しない限り、既存のStage 2のDecoratorは引き続き利用せざるを得ない状況が続くと思われ、普及にはもう少し時間がかかるのかなと思います。

とはいえ、Experimentalフラグの指定なくデフォルトで使えるようになったことで、導入のハードルは下がったと思います。

不足部分の追加とライブラリ側の対応も進んでくると、JavaScript/TypeScriptでDecoratorを利用するケースも増えてくるかもしれませんね。

---
参考資料

- [JavaScript metaprogramming with the 2022-03 decorators API](https://2ality.com/2022/10/javascript-decorators.html#history-of-decorators)
