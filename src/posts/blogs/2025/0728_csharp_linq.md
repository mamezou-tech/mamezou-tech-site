---
title: 現場で迷わない！C#のLINQをサンプルコード付きで徹底攻略
author: yoshihiro-tamori
date: 2025-07-28
tags: [dotnet, csharp]
image: true
---

C#のLINQはとても便利ですが、構文が特殊で分かりづらいという悩ましい問題もあります。

まだ私が若くて駆け出しの頃です。当時はC#でMVCやLINQ、EntityFramework、Razorなど次々に新しい技術が出てきました。

その頃の私はLINQが全く分からなくて苦労していました。しかも詳しい先輩がいつも客先に終日外出していて、聞くこともできず、ひたすらググっては悩んでいました。

でもあなたはそんな苦労をしなくてよいです。この記事で私がかつて苦労したことをすべてサンプルコード付きで解説します。

LINQを使いこなして効率的な開発をバリバリとやってくださいね。

## LINQとは何か

C#のLINQはコレクションをSQLライクに扱う技術です。Microsoftは言語統合クエリと呼んでいます。

[言語統合クエリ (LINQ)](https://learn.microsoft.com/ja-jp/dotnet/csharp/linq/)

### LINQでできること

**先ほどLINQはコレクションをSQLライクに扱えると書きました。つまりCSVやXML、JSONなどのデータはもちろん、O/R Mapperを通したSQLの実行結果も扱えるのです。**

もちろんコレクションですからListのような一覧形式のデータや、Dictionaryのようなキー・バリュー形式のデータも扱えます。

これらのコレクションをSQLのようにselectやfrom、whereと書いて処理できるのです。

### LINQの便利さ

LINQを使えば、ifやfor、ラムダ式を使うよりも楽にコレクションのデータを成型したり、特定の条件のデータだけ抽出したりできます。

**またここが重要な点ですが、LINQはSQLライクに書ける技術であるため、複数のコレクションをまとめて処理するときに威力を発揮します。このような処理はラムダ式でも複雑になりやすいでしょう。**

## この記事で扱うサンプルデータ

先にこの記事のサンプルコードで使うデータを掲載しておきます。簡単に試せるようCSVファイルとしています。

突っ込みどころが多いデータですが、容赦してください。常連客を管理しているパン屋ということで。

```csv:product.csv
product_id,product_name,category,price
1,猫パン,パン,250
2,犬パン,パン,250
3,食パン,パン,400
4,あんぱん,パン,200
5,フィナンシェ,菓子,300
6,クッキー,菓子,500
7,卵サンド,サンドイッチ,300
8,ツナサンド,サンドイッチ,350
9,緑茶,飲み物,150
10,天然水,飲み物,100
```

```csv:customer.csv
customer_id,customer_name,prefecture,registration_date
1,サンプル　太郎,東京都,2025/01/30
2,見本　次郎,神奈川県,2025/02/25
3,例題　三郎,大阪府,2025/03/16
4,テスト　史郎,福岡県,2025/04/09
```

```csv:sales.csv
sales_id,customer_id,product_id,sales_date,quantity
1,1,1,2025/02/06,1
2,1,2,2025/02/06,1
3,2,3,2025/03/04,2
4,3,5,2025/03/20,3
5,3,6,2025/03/20,3
6,4,7,2025/04/11,1
7,4,8,2025/04/11,1
8,4,9,2025/04/11,1
```

## LINQの基本

それではここからはサンプルコード付きでLINQを解説していきます。

上記3つのCSVファイルの内容は、以下のようにListにして読み込んだ前提で話を進めていきます。CSVファイルの1行分のモデルクラスを作り（Customer、Product、Sales）、各カラムはモデルクラスにプロパティで持つことにします。

```cs
CsvReader csvReader = new CsvReader();
IList<Customer> customerList = csvReader.ReadCustomer();
IList<Product> productList = csvReader.ReadProduct();
IList<Sales> salesList = csvReader.ReadSales();
```

CSVファイルの読み込みについては本記事では説明を割愛します。

### LINQのクエリ構文

LINQの基本的な構文はFROMから始まり、WHERE、SELECTという順になります。

例えばサンプルデータを使って価格が300円以上の商品を選択してみましょう。

```cs
var result = from p in productList
             where p.Price >= 300
             select p;

foreach (var one in result)
{
    Console.WriteLine(string.Format("商品ID:{0}, 商品名:{1}, 価格:{2}円",
        one.ProductId, one.ProductName, one.Price));
}
```

~~~
商品ID:3, 商品名:食パン, 価格:400円
商品ID:5, 商品名:フィナンシェ, 価格:300円
商品ID:6, 商品名:クッキー, 価格:500円
商品ID:7, 商品名:卵サンド, 価格:300円
商品ID:8, 商品名:ツナサンド, 価格:350円
~~~

FROM、WHERE、SELECTが出てくるなんてSQLっぽいですよね。このような形でコレクションを簡単に扱える技術がLINQです。

余談ですがSQLでは最初にSELECT、次にFROM、その後にWHEREという順になります。しかしFROMとJOINが決まらないと、SELECTしたい項目も決まらないです。

LINQはその点も問題なくて、FROMやJOIN、WHEREを書いて一番最後にSELECTを書くような構文になっています。

このようにfrom、where、selectを使ってSQLっぽく書く構文をクエリ構文と呼びます。

### LINQのメソッド構文

LINQにはクエリ構文に対してメソッド構文と呼ばれるラムダ式を用いた構文もあります。LINQはコレクションを操作するものですので、ラムダ式も使えるのです。

お好みでどちらを使ってもいいです。私は両方とも使います。

先ほどのクエリ構文をメソッド構文にすると、次のようになります。

```cs
// LINQのメソッド構文
var result = productList.Where(p => p.Price >= 300);

foreach (var one in result)
{
    Console.WriteLine(string.Format("商品ID:{0}, 商品名:{1}, 価格:{2}円",
        one.ProductId, one.ProductName, one.Price));
}
```

~~~
商品ID:3, 商品名:食パン, 価格:400円
商品ID:5, 商品名:フィナンシェ, 価格:300円
商品ID:6, 商品名:クッキー, 価格:500円
商品ID:7, 商品名:卵サンド, 価格:300円
商品ID:8, 商品名:ツナサンド, 価格:350円
~~~

### 匿名型について

LINQを使う上で避けて通れないものが匿名型です。これはややこしいので解説しておきます。

**匿名型とは簡単に言ってしまうと動的に定義される型です。事前の定義なしで、そのとき代入した値で型が決まります。**

詳しく知りたい場合はMicrosoftの解説記事を読んでください。

[匿名型 - C# | Microsoft Learn](https://learn.microsoft.com/ja-jp/dotnet/csharp/fundamentals/types/anonymous-types)

**LINQで匿名型を使うシーンは、データやカラムを複数個指定したいときです。**

最初に上げたサンプルコードを再掲しますが、このように商品という1種類のデータだけselect句で指定する場合は不要です。

```cs
    // LINQのクエリ構文
    var result = from p in productList
                 where p.Price >= 300
                 select p;

    foreach (var one in result)
    {
        Console.WriteLine(string.Format("商品ID:{0}, 商品名:{1}, 価格:{2}円",
            one.ProductId, one.ProductName, one.Price));
    }
```

複数のデータを結合して、それぞれのデータをselect句に指定したい場合には匿名型を使います。new { aaa, bbb, ccc }のように書きます。

```cs
var result = from sales in salesList
             join customer in customerList on sales.CustomerId equals customer.CustomerId
             join product in productList on sales.ProductId equals product.ProductId
             select new
             {
                 Sales = sales,
                 Customer = customer,
                 Product = product
             };
```

余談ですがselect句に匿名型を使う場合、左辺にはvarが隠れているようなものだと思ってください。上記のサンプルコードなら、select句は以下のようになっているようなものです。

```cs
var Sales = sales;
var Customer = customer;
var Product = product;
```

また結合条件に複数カラムを使いたい場合も匿名型で複数カラムを指定します。次のサンプルコードですと、key1とkey2という2つのカラムを指定しています。

```cs
new { a.key1, a.key2 } equals new { b.key1, b.key2 }
```

その他GROUP BYやORDER BYをやる際に複数カラムを指定したいときにも使えます。

```cs
group new { sales, product } by sales.SalesDate into g
```

## LINQの主要な操作の例

ここからはSQLでよく使うデータ操作をLINQでやる方法をサンプルコード付きで解説していきます。

### INNER JOINのやり方

INNER JOINの例として売上データ、商品データ、顧客データを結合してみましょう。

INNER JOINすなわち内部結合をしたい場合は、以下のようにjoin、on、equalsを使います。

```cs
// LINQでのINNER JOINのやり方
var result = from sales in salesList
             join customer in customerList on sales.CustomerId equals customer.CustomerId
             join product in productList on sales.ProductId equals product.ProductId
             select new
             {
                 Sales = sales,
                 Customer = customer,
                 Product = product
             };

foreach (var one in result)
{
    Console.WriteLine(string.Format(
        "販売日:{0}, 顧客名:{1}, 商品名:{2}, 価格:{3}",
        one.Sales.SalesDate, one.Customer.CustomerName,
        one.Product.ProductName, one.Product.Price));
}
```

~~~
販売日:2025/02/06 0:00:00, 顧客名:サンプル　太郎, 商品名:猫パン, 価格:250
販売日:2025/02/06 0:00:00, 顧客名:サンプル　太郎, 商品名:犬パン, 価格:250
販売日:2025/03/04 0:00:00, 顧客名:見本　次郎, 商品名:食パン, 価格:400
販売日:2025/03/20 0:00:00, 顧客名:例題　三郎, 商品名:フィナンシェ, 価格:300
販売日:2025/03/20 0:00:00, 顧客名:例題　三郎, 商品名:クッキー, 価格:500
販売日:2025/04/11 0:00:00, 顧客名:テスト　史郎, 商品名:卵サンド, 価格:300
販売日:2025/04/11 0:00:00, 顧客名:テスト　史郎, 商品名:ツナサンド, 価格:350
販売日:2025/04/11 0:00:00, 顧客名:テスト　史郎, 商品名:緑茶, 価格:150
~~~

この例では結合条件となるカラムは1つだけです。もし結合条件に複数のカラムを指定する場合は、次のサンプルコードのように匿名型を使用してください。
```cs
new { a.key1, a.key2 } equals new { b.key1, b.key2 }
```

実は私は最初、INNER JOINのやり方が分からず試行錯誤を何度も繰り返しました。そして以下のようにWhereメソッドを使ってやっていました。これでもできるにはできますが、joinを使った方がスマートです。

```cs
var result = from sales in salesList
             from customer in customerList.Where(customer => customer.CustomerId == sales.CustomerId)
             from product in productList.Where(product => product.ProductId == sales.ProductId)
             select new
             {
                 Sales = sales,
                 Customer = customer,
                 Product = product
             };
```

### LEFT OUTER JOINのやり方

LEFT OUTER JOINの例として先ほどのINNER JOINと同様に売上データ、商品データ、顧客データを結合してみましょう。

LEFT OUTER JOINのやり方はINNER JOINにintoが加わるだけです。intoの後ろに書くのは一時的にJOINしたデータを入れておく変数です。

そして次の行でcg.DefaultIfEmpty()のような書き方をしています。これは結合先にキーが一致するデータがなかったらデフォルト値すなわちnullとするという意味です。

LEFT OUTER JOINでも結合先にキーが一致するデータがなかったら値はnullになりますよね。それと同様です。

```cs
// LINQでのLEFT OUTER JOINのやり方
var result = from sales in salesList
             join customer in customerList on sales.CustomerId equals customer.CustomerId into cg
             from customerSub in cg.DefaultIfEmpty()
             join product in productList on sales.ProductId equals product.ProductId into pg
             from productSub in pg.DefaultIfEmpty()
             select new
             {
                 Sales = sales,
                 Customer = customerSub,
                 Product = productSub
             };

foreach (var one in result)
{
    Console.WriteLine(string.Format(
        "販売日:{0}, 顧客名:{1}, 商品名:{2}, 価格:{3}",
        one.Sales.SalesDate, one.Customer.CustomerName,
        one.Product.ProductName, one.Product.Price));
}
```

~~~
販売日:2025/02/06 0:00:00, 顧客名:サンプル　太郎, 商品名:猫パン, 価格:250
販売日:2025/02/06 0:00:00, 顧客名:サンプル　太郎, 商品名:犬パン, 価格:250
販売日:2025/03/04 0:00:00, 顧客名:見本　次郎, 商品名:食パン, 価格:400
販売日:2025/03/20 0:00:00, 顧客名:例題　三郎, 商品名:フィナンシェ, 価格:300
販売日:2025/03/20 0:00:00, 顧客名:例題　三郎, 商品名:クッキー, 価格:500
販売日:2025/04/11 0:00:00, 顧客名:テスト　史郎, 商品名:卵サンド, 価格:300
販売日:2025/04/11 0:00:00, 顧客名:テスト　史郎, 商品名:ツナサンド, 価格:350
販売日:2025/04/11 0:00:00, 顧客名:テスト　史郎, 商品名:緑茶, 価格:150
~~~

### 集計関数の使い方

続いてSQLでもおなじみの集計関数の使い方を見ていきましょう。

```cs
// 平均
var average = salesList.Average(x => x.Quantity);
Console.WriteLine(string.Format("平均販売個数:{0}", average.ToString()));

// 合計
var sum = salesList.Sum(x => x.Quantity);
Console.WriteLine(string.Format("合計販売個数:{0}", sum.ToString()));

// 最大
var max = productList.Max(x => x.Price);
Console.WriteLine(string.Format("最高値:{0}", max));

// 最小
var min = productList.Min(x => x.Price);
Console.WriteLine(string.Format("最安値:{0}", min));

// 件数
var count = productList.Count(x => x.Price > 200);
Console.WriteLine(string.Format("200円超の商品の個数:{0}", count.ToString()));
```

~~~
平均販売個数:1.625
合計販売個数:13
最高値:500
最安値:100
200円超の商品の個数:7
~~~

集計の種類についてはメソッド名通りです。メソッドに渡す引数には集計に使いたい項目を指定します。

### GROUP BYのやり方

GROUP BYの例として日別売上を集計してみましょう。

GROUP BYをやりたい場合は、group、by、intoを使います。ちょっと面倒なので落ち着いてサンプルコードを読んでください。

```cs
// GROUP BY
var groupList = from sales in salesList
            join product in productList on sales.ProductId equals product.ProductId
            group new { sales, product } by sales.SalesDate into g
            select new
            {
                SalesDate = g.Key,
                TotalSales = g.Sum(x => x.product.Price * x.sales.Quantity)
            };

Console.WriteLine("日別売上");
foreach (var group in groupList)
{
    Console.WriteLine(string.Format("日付:{0}, 販売額合計:{1}", group.SalesDate, group.TotalSales));
}
```

~~~
日別売上
日付:2025/02/06 0:00:00, 販売額合計:500
日付:2025/03/04 0:00:00, 販売額合計:800
日付:2025/03/20 0:00:00, 販売額合計:2400
日付:2025/04/11 0:00:00, 販売額合計:800
~~~

まずgroupの次にselectしたい項目を指定します。この場合ですと日別売上に必要な項目は販売日、価格、販売個数です。よって売上データ(Sales)と商品データ(Product)が該当します。

それからbyを書いて、グループ化の単位としたい項目を指定します。この場合ですと販売日(SalesDate)があればできます。

そしてintoを書いて、グループ化した値を保持する変数名を指定します。この場合ですと"g"が該当します。intoに指定するのは一時的に使う変数ですので、仮の名前でも十分です。

そして最後にselect句を書いて、g.Keyで集計に使ったキー、g.Sum(集計項目)で集計した値を取得します。

### ORDER BYのやり方

ORDER BYをやりたい場合、orderbyを使います。SQL同様にデフォルトで昇順となっており、降順にしたい場合はdescendingと記述します。

```cs
// ORDER BY ASC
var orderAsc = from product in productList
                orderby product.Price
                select product;

Console.WriteLine("価格が安い順");
foreach (var one in orderAsc)
{
    Console.WriteLine(string.Format("商品ID:{0}, 商品名:{1}", one.ProductId, one.ProductName));
}

// ORDER BY DESC
var orderDesc = from product in productList
                orderby product.Price descending
                select product;

Console.WriteLine("価格が高い順");
foreach (var one in orderDesc)
{
    Console.WriteLine(string.Format("商品ID:{0}, 商品名:{1}", one.ProductId, one.ProductName));
}
```

~~~
価格が安い順
商品ID:10, 商品名:天然水
商品ID:9, 商品名:緑茶
商品ID:4, 商品名:あんぱん
商品ID:1, 商品名:猫パン
商品ID:2, 商品名:犬パン
商品ID:5, 商品名:フィナンシェ
商品ID:7, 商品名:卵サンド
商品ID:8, 商品名:ツナサンド
商品ID:3, 商品名:食パン
商品ID:6, 商品名:クッキー
価格が高い順
商品ID:6, 商品名:クッキー
商品ID:3, 商品名:食パン
商品ID:8, 商品名:ツナサンド
商品ID:5, 商品名:フィナンシェ
商品ID:7, 商品名:卵サンド
商品ID:1, 商品名:猫パン
商品ID:2, 商品名:犬パン
商品ID:4, 商品名:あんぱん
商品ID:9, 商品名:緑茶
商品ID:10, 商品名:天然水
~~~

### 最初あるいは最後の1件の取得方法

最初の1件を取得する場合はFirst()またはFirstOrDefault()を使います。結果が0件だった場合を考慮する必要があるならFirstOrDefault()を使いましょう。もちろんnullの扱いには気を付けてくださいね。

```cs
var firstOne = productList.FirstOrDefault();
Console.WriteLine("最初の1個");
Console.WriteLine(string.Format("商品ID:{0}, 商品名:{1}", firstOne.ProductId, firstOne.ProductName));
```

~~~
最初の1個
商品ID:1, 商品名:猫パン
~~~

最後の1件を取得する場合はLast()またはLastOrDefault()を使います。こちらも最初の1件同様に結果が0件の場合を考慮する必要があるならLastOrDefault()を使い、nullの扱いには気を付けてください。

```cs
var lastOne = productList.LastOrDefault();
Console.WriteLine("最後の1個");
Console.WriteLine(string.Format("商品ID:{0}, 商品名:{1}", lastOne.ProductId, lastOne.ProductName));
```

~~~
最後の1個
商品ID:10, 商品名:天然水
~~~

## LINQの注意点

### 遅延実行される

**実はLINQは遅延実行されます。DBからデータを取得する処理をLINQで書いて、DBにはSQL Serverを使い、Profilerを起動しながらデバッグしてみると分かります。**

LINQの個所を過ぎてもSQLが実行されないのです。ToList()などでLINQの結果をコレクションに変換するなど、実際にLINQの結果を使うタイミングでLINQの式が実行されます。

O/R Mapperに対してLINQを使うLINQ to SQLなら、LINQの結果を使うタイミング（ToList()でコレクションに変換するタイミングなど）でSQLが実行されます。

LINQを書いた個所すべてでSQLが実行されるのと、最終的に結果を使用する個所だけでSQLが実行されるのとでは、後者の方がI/Oの回数が少ない分だけパフォーマンスで有利になる可能性があります。

### 即時実行する方法

**実はLINQの遅延実行にも注意点があります。ToList()などでLINQが実行されるまで、データソースがコード中に登場する都度、データソースの走査が行われてしまうのです。**

Microsoftのサイトにもその話が書かれています。保留中の個所を読んでみてください。foreachを使った場合などはループする度にデータソースからデータがフェッチされるとのことです。件数によっては凄いことになりそうです。

[C での LINQ クエリの概要#](https://learn.microsoft.com/ja-jp/dotnet/csharp/linq/get-started/introduction-to-linq-queries)

また恐ろしい事象が書かれた記事もありました。シンプルなコードですが3333億回も実行され、30分以上かかってしまったとのことです。

[【C#】【LINQ】遅延評価の落とし穴！？](https://tech.kentem.jp/entry/2023/10/16/155415)

よってネストしないようにするなど、データソースを走査する回数を抑えるようなコードを書くよう気を付ける必要があります。

そういう意味ではなんでも遅延実行ではなく、ときにはToList()などで意図的に即時実行することも考慮する必要があるでしょう。

## 終わりに

今回はよく使うデータ操作のLINQでの書き方をサンプルコード付きで解説しました。

LINQはとても便利ですが、プロジェクト内に有識者がいないと分かりづらいという難点があります。その有識者の代わりをこの記事で補えたら幸いです。