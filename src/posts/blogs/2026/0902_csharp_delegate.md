---
title: 動くサンプルで理解！C#デリゲート入門 ～Func/Action/eventの違いと使いどころまで
author: yoshihiro-tamori
date: 2026-09-02
tags: [dotnet, csharp]
image: true
---
私はC#が好きなのですが、デリゲートを使ったことがないと気付きました。

昔やったプロジェクトでデリゲートを見たことはありますし、先輩が使っているのを見たこともあります。しかし自分自身が使ったことはなくて、食わず嫌いしていたかもと思えてきました。

そこでデリゲートをコードを書きながら学ぼうと考えたのが今回の記事です。私が書いて動かしたコードで解説していきます。

## デリゲート（delegate）とは
デリゲートとは委譲という意味です。

委譲とはコトバンクによると「権利・権限などを他の人・機関に譲って任せること」となっています。つまり自分がやることを他人に任せることです。例えば上司が部下に仕事を振ることなどはいい例でしょう。

[https://kotobank.jp/word/%E5%A7%94%E8%AD%B2-432326](https://kotobank.jp/word/%E5%A7%94%E8%AD%B2-432326)

ならばプログラミングにおいてはやることは処理です。処理の実行を他の機能に任せるということになります。

しかしこれだけだとなんのこっちゃか分かりません。そこでもう少し具体的に言うと、処理（メソッド）の参照を代入して、値ではなく処理（メソッド）を渡すことで、他の機能（クラス）から処理（メソッド）を実行できるようにするとなります。

![デリゲートのイメージ](/img/dotnet/csharp_delegate/DelegateImage.png)

例えばある処理が完了したらコールバック処理を呼び出してもらうときに使えます。

## 事前準備
この記事のサンプルコードを動かすにはVisual StudioまたはVisual Studio CodeでC#開発ができるようセットアップを行ってください。Visual Studio Codeでのセットアップはこちらの記事を参照してください。

[VS Codeで始める！わかる＆できるC#開発環境の構築【2025年版マニュアル】](https://developer.mamezou-tech.com/blogs/2025/07/05/csharp_vscode/)

IDEのセットアップができたら、次はコンソールアプリのプロジェクトを作成してください。この記事のサンプルコードは手軽に動作確認するためにコンソールアプリで作っています。

## デリゲートの基本をサンプルコードで解説
### デリゲートの基本的な書き方
早速ですがコードを書いて動きを確認していきます。

動かせるサンプルコードを掲載します。`DelegateSample`というクラスを作り、以下のコードを書いてください。

```cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DelegateApp
{
    internal class DelegateSample
    {
        // デリゲートを宣言
        // デリゲート型のメソッドを宣言しているようなもの
        delegate void SampleDelegate(string message);

        // サンプルの実行
        public void ExecSample()
        {
            // 宣言したデリゲートを型としてメソッドを引数に渡す
            // 違和感ある書き方だが、メソッド型のインスタンスを作ってメソッドを代入しているようなイメージ
            SampleDelegate sampleDelegate = new SampleDelegate(Console.WriteLine);

            // 試しにメッセージを出してみる
            // Console.WriteLineを代入したので、デリゲートを実行するとConsole.WriteLineが実行される
            sampleDelegate("テストメッセージです");

            // 次は独自に作ったメソッド（コンソールに文字列を出すだけだが）を代入してみる
            sampleDelegate = TestMessage;
            sampleDelegate("カレーとサラダ");

            Console.WriteLine();
        }

        void TestMessage(string message)
        {
            Console.WriteLine($"今夜の夕食は{message}の予定です。");
        }
    }
}
```

そして`Program.cs`には以下のように書いてください。

```cs
using DelegateApp;
using DelegateApp.Models;

Console.WriteLine("デリゲートを開始します");

DelegateSample delegateSample = new DelegateSample();
delegateSample.ExecSample();
```

このコードを実行すると、次のようにメッセージが表示されます。

![デリゲートのサンプルの実行結果](/img/dotnet/csharp_delegate/DelegateSampleSingle.png)

デリゲート初心者には分かりづらいとか違和感があると感じたかもしれません。

デリゲートの宣言は`delegate`型のメソッドを定義することです。そして次に宣言したメソッドを型としたインスタンスを作成します。型がメソッドだなんて一瞬意味が分からなく感じますよね。

そして`delegate`型のインスタンスにはメソッドを代入できます。メソッドを実行するための仕組みなので、このようになります。メソッドを代入するということ自体が慣れない行為ですよね。

でもここまで見てみると、引数さえ合っていれば、色んなメソッドを代入して実行可能だろうと分かりますね。

複数のメソッドをまとめるマルチキャストデリゲートというものもあります。例えば先ほどの`DelegateSample`クラスに次のようにコードを追加してみましょう。

```cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DelegateApp
{
    internal class DelegateSample
    {
        // デリゲートを宣言
        // デリゲート型のメソッドを宣言しているようなもの
        delegate void SampleDelegate(string message);

        // サンプルの実行
        public void ExecSample()
        {
            // 宣言したデリゲートを型としてメソッドを引数に渡す
            // 違和感ある書き方だが、メソッド型のインスタンスを作ってメソッドを代入しているようなイメージ
            SampleDelegate sampleDelegate = new SampleDelegate(Console.WriteLine);

            // 試しにメッセージを出してみる
            // Console.WriteLineを代入したので、デリゲートを実行するとConsole.WriteLineが実行される
            sampleDelegate("テストメッセージです");

            // 次は独自に作ったメソッド（コンソールに文字列を出すだけだが）を代入してみる
            sampleDelegate = TestMessage;
            sampleDelegate("カレーとサラダ");

            Console.WriteLine();

            // ここから追加
            // 実はメソッドの追加が可能
            sampleDelegate += TestMessageLunch;
            sampleDelegate("カレーとサラダ");

            Console.WriteLine();

            // 追加済みメソッドの削除も可能
            sampleDelegate -= TestMessage;
            sampleDelegate("カレーとサラダ");
            // ここまで
        }

        void TestMessage(string message)
        {
            Console.WriteLine($"今夜の夕食は{message}の予定です。");
        }

        // 昼食用のメソッドを追加
        void TestMessageLunch(string message)
        {
            Console.WriteLine($"今夜の昼食は{message}でした。");
        }
    }
}
```

`Program.cs`を実行すると以下のようになります。

![マルチキャストデリゲートのサンプルの実行結果](/img/dotnet/csharp_delegate/DelegateSampleMulti.png)

このコードにはデリゲートに対してメソッドを加算及び減算しています。**なんと`delegate`型のインスタンスには複数のメソッドの追加や追加したメソッドの削除ができるのです。**

これをマルチキャストデリゲートと呼びます。

### デリゲートの進化の歴史を知る
実は先ほど書いたデリゲートのやり方は昔ながらのやり方でした。それがもう少し進化し、C# 2.0の時代には匿名メソッドが使えるようになりました。

匿名メソッドのサンプルコードを掲載します。`DelegateSampleAnonymous`というクラスを作り、以下のコードを書いてください。

```cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DelegateApp
{
    internal class DelegateSampleAnonymous
    {
        // デリゲートを宣言
        // デリゲート型のメソッドを宣言しているようなもの
        delegate void SampleDelegate(string message);

        // サンプルの実行
        public void ExecSample()
        {
            // 次は独自に作ったメソッド（コンソールに文字列を出すだけだが）を代入してみる
            // 定義されたメソッドだけでなく、匿名メソッドも代入可能
            SampleDelegate sampleDelegate = delegate(string message)
            {
                Console.WriteLine($"今夜の夕食は{message}の予定です。");
            };
            sampleDelegate("カレーとサラダ");

            Console.WriteLine();

            // 匿名メソッドを追加してみる
            sampleDelegate += delegate(string message)
            {
                Console.WriteLine($"今夜の昼食は{message}でした。");
            };
            sampleDelegate("カレーとサラダ");

            Console.WriteLine();

            // ちなみに匿名メソッドで追加すると削除できない
            // このように一度別のインスタンスに入れてから追加する必要がある
            SampleDelegate workDelegate = delegate(string message)
            {
                Console.WriteLine($"今夜の朝食は{message}でした。");
            };
            sampleDelegate += workDelegate;
            sampleDelegate("カレーとサラダ");


            Console.WriteLine();
            sampleDelegate -= workDelegate;
            sampleDelegate("カレーとサラダ");
        }
    }
}
```

そして`Program.cs`には以下のように書いてください。

```cs
using DelegateApp;
using DelegateApp.Models;

Console.WriteLine("デリゲートを開始します");

Console.WriteLine();
Console.WriteLine("匿名メソッドのサンプルです");
Console.WriteLine();

DelegateSampleAnonymous delegateSampleAnonymous = new DelegateSampleAnonymous();
delegateSampleAnonymous.ExecSample();
```

実行すると以下のようになります。

![デリゲートで匿名メソッドを使うサンプルの実行結果](/img/dotnet/csharp_delegate/DelegateSampleAnonymouspng.png)

ここでちょっと厄介なことは、匿名メソッドを使った場合は追加したメソッドの削除ができないことです。どうしても削除したければ、一度インスタンスに入れてから追加する必要があるのです。

上記のサンプルで言うと`workDelegate`が該当します。

現在はラムダ式を使うのが主流となっています。ラムダ式を使うサンプルコードを掲載します。`DelegateSampleLambda`というクラスを作り、以下のコードを書いてください。

```cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DelegateApp
{
    internal class DelegateSampleLambda
    {
        // デリゲートを宣言
        // デリゲート型のメソッドを宣言しているようなもの
        delegate void SampleDelegate(string message);

        // サンプルの実行
        public void ExecSample()
        {
            // 次は独自に作ったメソッド（コンソールに文字列を出すだけだが）を代入してみる
            // 定義されたメソッドだけでなく、ラムダ式も代入可能
            SampleDelegate sampleDelegate = (string message) =>
            {
                Console.WriteLine($"今夜の夕食は{message}の予定です。");
            };
            sampleDelegate("カレーとサラダ");

            Console.WriteLine();

            // ラムダ式を追加してみる
            sampleDelegate += (string message) =>
            {
                Console.WriteLine($"今夜の昼食は{message}でした。");
            };
            sampleDelegate("カレーとサラダ");

            Console.WriteLine();

            // ちなみにラムダ式で追加すると削除できない
            // このように一度別のインスタンスに入れてから追加する必要がある
            SampleDelegate workDelegate = (string message) =>
            {
                Console.WriteLine($"今夜の朝食は{message}でした。");
            };
            sampleDelegate += workDelegate;
            sampleDelegate("カレーとサラダ");


            Console.WriteLine();
            sampleDelegate -= workDelegate;
            sampleDelegate("カレーとサラダ");
        }
    }
}
```

そして`Program.cs`には以下のように書いてください。

```cs
using DelegateApp;
using DelegateApp.Models;

Console.WriteLine("デリゲートを開始します");

Console.WriteLine();
Console.WriteLine("ラムダ式のサンプルです");
Console.WriteLine();

DelegateSampleLambda delegateSampleLambda = new DelegateSampleLambda();
delegateSampleLambda.ExecSample();
```

実行すると以下のようになります。

![デリゲートでラムダ式を使うサンプルの実行結果](/img/dotnet/csharp_delegate/DelegateSampleLambda.png)

**ラムダ式になるともはや`delegate`という記述すらなくなります。一番シンプルな書き方です。**

## FuncとActionを使えば宣言不要
### 戻り値がない処理ならAction
ここまでのやり方は`delegate`型のメソッドを宣言して、そのインスタンスにメソッドを代入するというものでした。わざわざ宣言しているので、用途別にデリゲートを作成する必要がありました。

**そこで汎用型として戻り値がない場合は`Action`、戻り値がある場合は`Func`というものが登場しました。**

`Action`を使ったサンプルコードを掲載します。`DelegateSampleAction`というクラスを作り、以下のコードを書いてください。

このようにジェネリックで引数の型を指定します。わざわざ`delegate`型のメソッドを宣言する必要がないので、コードもシンプルになります。

```cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DelegateApp
{
    internal class DelegateSampleAction
    {
        public void ExecSample()
        {
            // Actionデリゲートを使用するサンプル
            // Actionデリゲートは戻り値がvoidで、引数の型を指定できる
            Action<string> actionDelegate = (message) =>
            {
                Console.WriteLine($"今夜の夕食は{message}の予定です。");
            };
            actionDelegate("カレーとサラダ");
        }
    }
}
```

そして`Program.cs`には以下のように書いてください。

```cs
using DelegateApp;
using DelegateApp.Models;

Console.WriteLine("デリゲートを開始します");

Console.WriteLine();
Console.WriteLine("Actionのサンプルです");
Console.WriteLine();

DelegateSampleAction delegateSampleAction = new DelegateSampleAction();
delegateSampleAction.ExecSample();
```

実行すると以下のようになります。

![デリゲートでActionを使うサンプルの実行結果](/img/dotnet/csharp_delegate/DelegateSampleAction.png)

ちなみにメソッドの追加や削除については`delegate`を使う場合と同様に+や-などの演算子を使ってください。また匿名メソッドやラムダ式では削除ができないことも同様ですので、削除したいときは一度インスタンスに入れてから追加してください。

### 戻り値がある処理ならFunc
`Func`を使ったサンプルコードを掲載します。`DelegateSampleFunc`というクラスを作り、以下のコードを書いてください。ジェネリックの型指定で、<引数の型, 戻り値の型>というように指定します。

```cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DelegateApp
{
    internal class DelegateSampleFunc
    {
        public void ExecSample()
        {
            // Actionデリゲートを使用するサンプル
            // Actionデリゲートは戻り値がvoidで、引数の型を指定できる
            Func<int, string> funcDelegate = (num) =>
            {
                return $"入力された値は{num}です。";
            };
            Console.WriteLine(funcDelegate(5));
        }
    }
}
```

そして`Program.cs`には以下のように書いてください。

```cs
using DelegateApp;
using DelegateApp.Models;

Console.WriteLine("デリゲートを開始します");

Console.WriteLine();
Console.WriteLine("Funcのサンプルです");
Console.WriteLine();

DelegateSampleFunc delegateSampleFunc = new DelegateSampleFunc();
delegateSampleFunc.ExecSample();
```

実行すると以下のようになります。

![デリゲートでFuncを使うサンプルの実行結果](/img/dotnet/csharp_delegate/DelegateSampleFunc.png)

`Func`もメソッドの追加や削除については`delegate`を使う場合と同様です。

## デリゲートの本当の使い道
### コールバック処理
コールバック処理のサンプルコードを掲載します。

`DelegateSampleAction`というクラスを作り、以下のコードを書いてください。

```cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DelegateApp
{
    internal class CallbackSample
    {
        // コールバックのサンプル
        // ここでは、処理が終わった後に呼び出されるメソッドをデリゲートとして渡す
        // デリゲートを使うことで、処理が終わった後に呼び出されるメソッドを自由に変更できる
        public void ExecSample(string message, Action<string> callback)
        {
            Console.WriteLine($"処理中: {message}");
            // 処理が終わった後にコールバックを呼び出す
            callback?.Invoke($"処理が完了しました: {message}");
        }
    }
}
```

そして`Program.cs`には以下のように書いてください。

```cs
using DelegateApp;
using DelegateApp.Models;

Console.WriteLine("デリゲートを開始します");

Console.WriteLine();
Console.WriteLine("コールバックのサンプルです");
Console.WriteLine();

CallbackSample callbackSample = new CallbackSample();
callbackSample.ExecSample("カレーとサラダ", (result) =>
{
    Console.WriteLine(result);
});
```

実行すると以下のようになります。

![デリゲートでコールバックするサンプルの実行結果](/img/dotnet/csharp_delegate/DelegateSampleCallback.png)

このようにメソッドの引数に`Func`や`Action`を定義することで処理を受け取ります。そして`Invoke`メソッドで処理を実行します。

### 条件に応じた処理の差し替え
実はLINQの`Where`は引数が`Func`になっています。つまり`Where`メソッドの中ではデリゲートを使っているのです。

では`Func`の内容次第で結果が異なる例を作ってみましょう。`DelegateSampleLinq`というクラスを作り、以下のコードを書いてください。

```cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DelegateApp
{
    internal class DelegateSampleLinq
    {
        public void ExecSample()
        {
            List<int> numbers = new List<int> { 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 };

            // まずは偶数だけを抽出してみる
            var evenNumbers = FilterNumbers(numbers, (num) => num % 2 == 0);
            Console.WriteLine("偶数のリスト:");
            Console.WriteLine(evenNumbers.Count > 0 ? string.Join(", ", evenNumbers) : "該当する値はありません。");

            // 続いて奇数を抽出してみる
            var oddNumbers = FilterNumbers(numbers, (num) => num % 2 != 0);
            Console.WriteLine("奇数のリスト:");
            Console.WriteLine(oddNumbers.Count > 0 ? string.Join(", ", oddNumbers) : "該当する値はありません。");
        }

        /// <summary>
        /// 引数として渡されたFuncを実行し、条件に一致する値だけを返す
        /// </summary>
        /// <param name="numbers"></param>
        /// <param name="predicate"></param>
        /// <returns></returns>
        static List<int> FilterNumbers(List<int> numbers, Func<int, bool> predicate)
        {
            List<int> resultList = new List<int>();
            foreach (var number in numbers)
            {
                if (predicate(number))
                {
                    resultList.Add(number);
                }
            }
            return resultList;
        }
    }
}
```

そして`Program.cs`には以下のように書いてください。

```cs
using DelegateApp;
using DelegateApp.Models;

Console.WriteLine("デリゲートを開始します");

Console.WriteLine();
Console.WriteLine("条件を切り替えるサンプルです");
Console.WriteLine();

DelegateSampleLinq delegateSampleLinq = new DelegateSampleLinq();
delegateSampleLinq.ExecSample();
```

実行すると以下のようになります。

![デリゲートでFuncの内容に応じて結果が異なるサンプルの実行結果](/img/dotnet/csharp_delegate/DelegateSampleLinq.png)

## デリゲートの脆弱性を補うためのevent
ここまでデリゲートの使い方について色々と見てきました。

しかし便利な反面、危険も伴います。何せ代入次第で何とでも処理内容を変えられます。また`Invoke`メソッドによって好きなところで実行が可能です。脆弱な面があることは否めません。

下手すると不具合の元になるのはもちろん、セキュリティ面での脆弱性も怖いところです。**そこで`event`というキーワードを付けることで、外部クラスからの代入や実行ができなくなります。**

`event`を使ったサンプルコードを掲載します。`DelegateSampleEvent`というクラスを作り、以下のコードを書いてください。

```cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DelegateApp
{
    internal class DelegateSampleEvent
    {
        // パブリックだから他のクラスからアクセス可能
        public event Func<int, string> SampleEvent;
    }

    internal class DelegateSampleExternal
    {
        public void ExecSample()
        {
            DelegateSampleEvent sample = new DelegateSampleEvent();

            // 外部クラスからのデリゲートの代入は不可
            sample.SampleEvent = (int x) => $"入力された値は{x}です。";

            // 外部クラスからのデリゲートの追加と削除は可能
            sample.SampleEvent += (int x) => $"入力された値は{x}です。";
            Func<int, string> func = (int x) => $"今日はコーヒーを{x}杯飲みました。";
            sample.SampleEvent += func;
            sample.SampleEvent -= func;

            // 外部クラスからの実行は不可
            sample.SampleEvent.Invoke(99);
        }
    }
}
```

上記のようにコードを書くと、以下のスクリーンショットのように代入と`Invoke`メソッドのところでコンパイルエラーが発生します。

![デリゲートでeventを使ったサンプル](/img/dotnet/csharp_delegate/DelegateEvent.png)

ひとまず先ほどのコードでコンパイルエラーが出ている個所はコメントアウトしてください。

## フードコートでの注文を例にデリゲートを試す

デリゲートのやり方が分かったところで、現実世界をイメージして練習してみたいと思います。そこでフードコードのスイーツ屋をテーマに扱います。ただ文字の表示や計算をするよりは楽しい内容になるし、委譲をイメージしやすいと考えたためです。

業務フローは以下の図のようになります。

![フードコートでの注文を例にデリゲートを使ったサンプルの業務フロー図](/img/dotnet/csharp_delegate/WorkflowFoodCourt.png)

ここではコードをかなり端折って解説します。本当は注文内容だって明細を持てるようにしたり、注文内容も動的に変えられるようにしたりする必要がありますが、今回はそこが主題でないため簡易的なメッセージで済ませます。

それではソースコードを掲載します。`Models`というフォルダに作って、その中に以下の5つのクラスを作成してください。

```cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DelegateApp.Models
{
    internal class Buzzer
    {
        public int No { get; set; }

        public Buzzer(int no)
        {
            No = no;
        }

        public void Ring()
        {
            Console.WriteLine($"ピー！ピー！ピー！{No}番のブザーが鳴っています！");
        }
    }
}
```

```cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DelegateApp.Models
{
    internal class Cook
    {
        public void CookOrder(Order order)
        {
            Console.WriteLine($"料理人が注文を受け取りました: {order.OrderContent}");
            Console.WriteLine("料理を作っています...");
            Console.WriteLine("料理が完成しました！");
        }
    }
}
```

```cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DelegateApp.Models
{
    internal class Customer
    {
        private Buzzer Buzzer { get; set; }

        public Order MakeOrder()
        {
            Console.WriteLine("お客様が注文しました。");
            return new Order("パンケーキとコーヒーのセット");
        }

        public void Pay()
        {
            Console.WriteLine("お会計を済ませました。");
        }

        public void PickUpBuzzer(Buzzer buzzer)
        {
            Buzzer = buzzer;
            Console.WriteLine($"お客様が{buzzer.No}番のブザーを受け取りました。");
        }

        public void PickUpFood()
        {
            Console.WriteLine($"お客様が{Buzzer.No}番のブザーを渡しました。");
            Console.WriteLine("お客様が料理を受け取りました。");
        }
    }
}
```

```cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DelegateApp.Models
{
    internal class Order
    {
        public string? OrderContent { get; set; }
        public Order(string? orderContent)
        {
            OrderContent = orderContent;
        }
    }
}
```

```cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DelegateApp.Models
{
    internal class Staff
    {
        private delegate void BuzzerRingHandler();
        private IDictionary<int, BuzzerRingHandler> _buzzerHandlers = new Dictionary<int, BuzzerRingHandler>();

        public void TakeOrder(Order order)
        {
            Console.WriteLine($"スタッフが注文を受け取りました: {order.OrderContent}");
            Console.WriteLine("お会計は1,500円になります。");
        }

        public Buzzer HandOverBuzzer(int no)
        {
            Buzzer buzzer = new Buzzer(no);
            Console.WriteLine($"スタッフが{no}番のブザーを渡しました。");
            _buzzerHandlers.Add(no, buzzer.Ring);
            return buzzer;
        }

        public void RingBuzzer(int no)
        {
            if (_buzzerHandlers.TryGetValue(no, out var buzzer))
            {
                buzzer.Invoke();
                _buzzerHandlers.Remove(no);
            }
        }
    }
}
```

そして`Program.cs`には以下のように書いてください。

```cs
using DelegateApp;
using DelegateApp.Models;

Console.WriteLine("デリゲートを開始します");

Console.WriteLine();
Console.WriteLine("フードコートで料理が出来たらブザーを鳴らすサンプルです");
Console.WriteLine();

Customer customer = new Customer();
Staff staff = new Staff();
Cook cook = new Cook();

Order order = customer.MakeOrder();
// 注文とお会計
staff.TakeOrder(order);
customer.Pay();

// ブザーを渡す
int no = 1;
Buzzer buzzer = staff.HandOverBuzzer(no);
customer.PickUpBuzzer(buzzer);

// 調理
cook.CookOrder(order);

// ブザーを鳴らして料理を渡す
staff.RingBuzzer(no);
customer.PickUpFood();
```

実行すると以下のようになります。

![フードコートでの注文を例にデリゲートを使ったサンプルの実行結果](/img/dotnet/csharp_delegate/DelegateSampleFoodCourt.png)

**ポイントとしては店員がどのお客さんに何番のブザーを渡したかを管理しているということです。**

プログラムとしては`Staff`クラスが`Dictionary`で番号とブザーを鳴らすメソッドの組み合わせを持っています。

こうすることで、料理ができたときに店員が顧客の手元にあるブザーを鳴らせるようにできます。

## おわりに

コードを書いて動かしてみることで、デリゲートとは何かが少し分かりました。やっぱり書いて動かしてみるのが一番ですね。

デリゲートが分からないという方はこの記事のフードコートみたいなものを作ってみてください。