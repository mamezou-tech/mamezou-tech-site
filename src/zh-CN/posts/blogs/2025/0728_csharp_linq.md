---
title: 实战不迷路！C# LINQ示例代码全面攻略
author: yoshihiro-tamori
date: 2025-07-28T00:00:00.000Z
tags:
  - dotnet
  - csharp
image: true
translate: true

---

C# 的 LINQ 非常方便，但语法特殊，令人难以理解。

那是在我还年轻、刚入门的时候。当时 C# 领域不断涌现 MVC、LINQ、EntityFramework、Razor 等新技术。

那时我完全不懂 LINQ，非常苦恼。而且懂行的前辈整天都去客户现场，没法请教，只能不停地上网搜索并烦恼。

不过你无需经历这样的折腾。本文将附上示例代码，全面讲解我曾经费力摸索的内容。

希望你能熟练掌握 LINQ，尽情高效地开发。

## 什么是 LINQ

C# 的 LINQ 是一种以类似 SQL 的方式处理集合的技术，Microsoft 将其称为语言集成查询。

[语言集成查询 (LINQ)](https://learn.microsoft.com/ja-jp/dotnet/csharp/linq/)

### LINQ 能做什么

**刚才写到 LINQ 可以以类似 SQL 的方式处理集合。也就是说，除了 CSV、XML、JSON 等数据，甚至可以直接处理通过 O/R Mapper 执行 SQL 的结果。**

当然，由于是集合，还可以处理类似 List 的列表形式数据以及类似 Dictionary 的键值对形式数据。

可以像在 SQL 中那样，用 select、from、where 等关键词来处理这些集合。

### LINQ 的便利之处

使用 LINQ，比起用 if、for 或 lambda 表达式，更轻松地对集合数据进行成型，或仅抽取符合特定条件的数据。

**此外，这一点很重要：由于 LINQ 可以以类似 SQL 的方式编写，当需要同时处理多个集合时，它会展现强大威力。而此类处理即便使用 lambda 表达式也容易变得非常复杂。**

## 本文示例数据

先在此展示本文示例代码中使用的数据，为了方便试用，采用了 CSV 文件。

这些数据可能有不少槽点，还请见谅。就当作是一家管理常客的面包店吧。

```csv:product.csv
product_id,product_name,category,price
1,猫面包,面包,250
2,狗面包,面包,250
3,吐司,面包,400
4,红豆面包,面包,200
5,费南雪,糕点,300
6,曲奇,糕点,500
7,鸡蛋三明治,三明治,300
8,金枪鱼三明治,三明治,350
9,绿茶,饮料,150
10,天然水,饮料,100
```

```csv:customer.csv
customer_id,customer_name,prefecture,registration_date
1,样本 太郎,东京都,2025/01/30
2,样本 次郎,神奈川县,2025/02/25
3,例题 三郎,大阪府,2025/03/16
4,测试 史郎,福冈县,2025/04/09
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

## LINQ 基础

接下来将通过示例代码讲解 LINQ。

此前提是：已将上述三个 CSV 文件的内容读取到 List 中。为每个 CSV 文件的每行创建对应的模型类（Customer、Product、Sales），并将各列作为模型类的属性。

```cs
CsvReader csvReader = new CsvReader();
IList<Customer> customerList = csvReader.ReadCustomer();
IList<Product> productList = csvReader.ReadProduct();
IList<Sales> salesList = csvReader.ReadSales();
```

关于 CSV 文件的读取，本文不再赘述。

### LINQ 查询语法

LINQ 的基本语法从 FROM 开始，然后是 WHERE、SELECT。

例如，我们用示例数据选择价格在 300 日元以上的商品。

```cs
var result = from p in productList
             where p.Price >= 300
             select p;

foreach (var one in result)
{
    Console.WriteLine(string.Format("商品ID:{0}, 商品名称:{1}, 价格:{2}日元",
        one.ProductId, one.ProductName, one.Price));
}
```

~~~
商品ID:3, 商品名称:吐司, 价格:400日元
商品ID:5, 商品名称:费南雪, 价格:300日元
商品ID:6, 商品名称:曲奇, 价格:500日元
商品ID:7, 商品名称:鸡蛋三明治, 价格:300日元
商品ID:8, 商品名称:金枪鱼三明治, 价格:350日元
~~~

看到 FROM、WHERE、SELECT，是不是很像 SQL？LINQ 就是以这种方式简化地处理集合的技术。

额外一提，在 SQL 中顺序是先 SELECT、再 FROM，最后 WHERE。但若没有确定 FROM 和 JOIN，就无法决定要 SELECT 哪些字段。

LINQ 在这方面没有问题，它允许你先写 FROM、JOIN、WHERE，最后再写 SELECT。

如此使用 from、where、select 来类似 SQL 编写的语法，称为查询语法（Query Syntax）。

### LINQ 方法语法

LINQ 除了查询语法外，还提供了称为方法语法（Method Syntax）的基于 lambda 表达式的写法。由于 LINQ 是操作集合的技术，自然也支持 lambda 表达式。

你可根据喜好选用，我两者都会使用。

将刚才的查询语法改写为方法语法，如下所示。

```cs
// LINQ 的方法语法
var result = productList.Where(p => p.Price >= 300);

foreach (var one in result)
{
    Console.WriteLine(string.Format("商品ID:{0}, 商品名称:{1}, 价格:{2}日元",
        one.ProductId, one.ProductName, one.Price));
}
```

~~~
商品ID:3, 商品名称:吐司, 价格:400日元
商品ID:5, 商品名称:费南雪, 价格:300日元
商品ID:6, 商品名称:曲奇, 价格:500日元
商品ID:7, 商品名称:鸡蛋三明治, 价格:300日元
商品ID:8, 商品名称:金枪鱼三明治, 价格:350日元
~~~

### 关于匿名类型

在使用 LINQ 时无法回避的就是匿名类型。这比较复杂，下面详细说明。

**简单来说，匿名类型就是动态定义的类型，无需事先定义，类型由当时赋值决定。**

如需深入了解，请参阅 Microsoft 的说明文章。

[匿名型 - C# | Microsoft Learn](https://learn.microsoft.com/ja-jp/dotnet/csharp/fundamentals/types/anonymous-types)

**在 LINQ 中使用匿名类型的场景，是希望在 select 中指定多个数据或列时。**

重申前面的示例代码，如果只在 select 子句中指定单一类型的数据（如商品），则无需使用匿名类型。

```cs
// LINQ 查询语法
var result = from p in productList
             where p.Price >= 300
             select p;

foreach (var one in result)
{
    Console.WriteLine(string.Format("商品ID:{0}, 商品名称:{1}, 价格:{2}日元",
        one.ProductId, one.ProductName, one.Price));
}
```

若要将多个数据合并，并在 select 子句中指定它们，则需要使用匿名类型，用法类似：new { aaa, bbb, ccc }。

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

额外一提，若在 select 子句中使用匿名类型，可将其视为在左侧隐式使用了 var。以上示例代码的 select 子句等同于：

```cs
var Sales = sales;
var Customer = customer;
var Product = product;
```

若要在连接条件中使用多列，也可用匿名类型指定多个列。如下示例中，指定了 key1 和 key2 两列：

```cs
new { a.key1, a.key2 } equals new { b.key1, b.key2 }
```

同样，在进行 GROUP BY 或 ORDER BY 时若需指定多列，也可使用匿名类型。

```cs
group new { sales, product } by sales.SalesDate into g
```

## LINQ 主要操作示例

接下来将通过示例代码，介绍如何用 LINQ 实现在 SQL 中常用的数据操作。

### INNER JOIN 的实现

以 INNER JOIN 为例，将销售数据、商品数据和客户数据进行合并。

若要执行内部连接（INNER JOIN），可像下面这样使用 join、on、equals。

```cs
// LINQ 中的 INNER JOIN 示例
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
        "销售日期:{0}, 客户名:{1}, 商品名称:{2}, 价格:{3}日元",
        one.Sales.SalesDate, one.Customer.CustomerName,
        one.Product.ProductName, one.Product.Price));
}
```

~~~
销售日期:2025/02/06 0:00:00, 客户名:样本 太郎, 商品名称:猫面包, 价格:250日元
销售日期:2025/02/06 0:00:00, 客户名:样本 太郎, 商品名称:狗面包, 价格:250日元
销售日期:2025/03/04 0:00:00, 客户名:样本 次郎, 商品名称:吐司, 价格:400日元
销售日期:2025/03/20 0:00:00, 客户名:例题 三郎, 商品名称:费南雪, 价格:300日元
销售日期:2025/03/20 0:00:00, 客户名:例题 三郎, 商品名称:曲奇, 价格:500日元
销售日期:2025/04/11 0:00:00, 客户名:测试 史郎, 商品名称:鸡蛋三明治, 价格:300日元
销售日期:2025/04/11 0:00:00, 客户名:测试 史郎, 商品名称:金枪鱼三明治, 价格:350日元
销售日期:2025/04/11 0:00:00, 客户名:测试 史郎, 商品名称:绿茶, 价格:150日元
~~~

在此示例中，连接条件仅有一列。若要指定多列作为连接条件，请像下面示例那样使用匿名类型。

```cs
new { a.key1, a.key2 } equals new { b.key1, b.key2 }
```

其实我一开始也不知道如何进行 INNER JOIN，不断试错，一度使用 Where 方法来实现，如下所示。虽然也能实现，但使用 join 要更优雅一些。

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

### LEFT OUTER JOIN 的实现

以 LEFT OUTER JOIN 为例，同样将销售数据、商品数据和客户数据进行合并。

LEFT OUTER JOIN 的做法只是在 INNER JOIN 的基础上添加 into。into 后面指定的是一个临时变量，用来存放 JOIN 后的数据。

接着在下一行使用 cg.DefaultIfEmpty()。这表示若连接端没有匹配的记录，则用默认值（即 null）。

LEFT OUTER JOIN 中，连接端若无匹配，也会返回 null，作用相同。

```cs
// LINQ 中的 LEFT OUTER JOIN 示例
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
        "销售日期:{0}, 客户名:{1}, 商品名称:{2}, 价格:{3}日元",
        one.Sales.SalesDate, one.Customer.CustomerName,
        one.Product.ProductName, one.Product.Price));
}
```

~~~
销售日期:2025/02/06 0:00:00, 客户名:样本 太郎, 商品名称:猫面包, 价格:250日元
销售日期:2025/02/06 0:00:00, 客户名:样本 太郎, 商品名称:狗面包, 价格:250日元
销售日期:2025/03/04 0:00:00, 客户名:样本 次郎, 商品名称:吐司, 价格:400日元
销售日期:2025/03/20 0:00:00, 客户名:例题 三郎, 商品名称:费南雪, 价格:300日元
销售日期:2025/03/20 0:00:00, 客户名:例题 三郎, 商品名称:曲奇, 价格:500日元
销售日期:2025/04/11 0:00:00, 客户名:测试 史郎, 商品名称:鸡蛋三明治, 价格:300日元
销售日期:2025/04/11 0:00:00, 客户名:测试 史郎, 商品名称:金枪鱼三明治, 价格:350日元
销售日期:2025/04/11 0:00:00, 客户名:测试 史郎, 商品名称:绿茶, 价格:150日元
~~~

### 聚合函数的使用

接下来看看在 SQL 中常见的聚合函数的用法。

```cs
// 平均
var average = salesList.Average(x => x.Quantity);
Console.WriteLine(string.Format("平均销售数量:{0}", average.ToString()));

// 总和
var sum = salesList.Sum(x => x.Quantity);
Console.WriteLine(string.Format("销售总数量:{0}", sum.ToString()));

// 最大值
var max = productList.Max(x => x.Price);
Console.WriteLine(string.Format("最高价格:{0}", max));

// 最小值
var min = productList.Min(x => x.Price);
Console.WriteLine(string.Format("最低价格:{0}", min));

// 个数
var count = productList.Count(x => x.Price > 200);
Console.WriteLine(string.Format("200日元以上的商品数量:{0}", count.ToString()));
```

~~~
平均销售数量:1.625
销售总数量:13
最高价格:500
最低价格:100
200日元以上的商品数量:7
~~~

### GROUP BY 的实现

以 GROUP BY 为例，对每日销售额进行汇总。

要执行 GROUP BY，需要使用 group、by、into。稍微有点复杂，请耐心阅读示例代码。

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

Console.WriteLine("每日销售额");
foreach (var group in groupList)
{
    Console.WriteLine(string.Format("日期:{0}, 销售总额:{1}", group.SalesDate, group.TotalSales));
}
```

~~~
每日销售额
日期:2025/02/06 0:00:00, 销售总额:500
日期:2025/03/04 0:00:00, 销售总额:800
日期:2025/03/20 0:00:00, 销售总额:2400
日期:2025/04/11 0:00:00, 销售总额:800
~~~

### ORDER BY 的实现

若要执行 ORDER BY，可使用 orderby。默认同 SQL 为升序，若需降序，则加上 descending。

```cs
// ORDER BY ASC
var orderAsc = from product in productList
                orderby product.Price
                select product;

Console.WriteLine("价格升序");
foreach (var one in orderAsc)
{
    Console.WriteLine(string.Format("商品ID:{0}, 商品名称:{1}", one.ProductId, one.ProductName));
}

// ORDER BY DESC
var orderDesc = from product in productList
                orderby product.Price descending
                select product;

Console.WriteLine("价格降序");
foreach (var one in orderDesc)
{
    Console.WriteLine(string.Format("商品ID:{0}, 商品名称:{1}", one.ProductId, one.ProductName));
}
```

~~~
价格升序
商品ID:10, 商品名称:天然水
商品ID:9, 商品名称:绿茶
商品ID:4, 商品名称:红豆面包
商品ID:1, 商品名称:猫面包
商品ID:2, 商品名称:狗面包
商品ID:5, 商品名称:费南雪
商品ID:7, 商品名称:鸡蛋三明治
商品ID:8, 商品名称:金枪鱼三明治
商品ID:3, 商品名称:吐司
商品ID:6, 商品名称:曲奇
价格降序
商品ID:6, 商品名称:曲奇
商品ID:3, 商品名称:吐司
商品ID:8, 商品名称:金枪鱼三明治
商品ID:5, 商品名称:费南雪
商品ID:7, 商品名称:鸡蛋三明治
商品ID:1, 商品名称:猫面包
商品ID:2, 商品名称:狗面包
商品ID:4, 商品名称:红豆面包
商品ID:9, 商品名称:绿茶
商品ID:10, 商品名称:天然水
~~~

### 获取第一条或最后一条记录

若要获取第一条记录，可使用 First() 或 FirstOrDefault()。若需考虑结果为空的情况，应使用 FirstOrDefault()，并注意处理 null。

```cs
var firstOne = productList.FirstOrDefault();
Console.WriteLine("第一条记录");
Console.WriteLine(string.Format("商品ID:{0}, 商品名称:{1}", firstOne.ProductId, firstOne.ProductName));
```

~~~
第一条记录
商品ID:1, 商品名称:猫面包
~~~

若要获取最后一条记录，可使用 Last() 或 LastOrDefault()。同样，若需考虑结果为空的情况，应使用 LastOrDefault()，并注意 null。

```cs
var lastOne = productList.LastOrDefault();
Console.WriteLine("最后一条记录");
Console.WriteLine(string.Format("商品ID:{0}, 商品名称:{1}", lastOne.ProductId, lastOne.ProductName));
```

~~~
最后一条记录
商品ID:10, 商品名称:天然水
~~~

## LINQ 的注意事项

### 延迟执行

**实际上，LINQ 是延迟执行的。若使用 LINQ 编写从数据库获取数据的逻辑，在 SQL Server 上开启 Profiler 调试，就能发现这一点。**

在代码中经过 LINQ 的部分并不会立即触发 SQL 执行，只有在使用 ToList() 等方法将 LINQ 结果转换为集合，或在实际使用 LINQ 结果的时刻，LINQ 表达式才会被执行。

若使用 LINQ to SQL 等对 O/R Mapper 提供 LINQ 支持的技术，也会在使用 LINQ 结果的时刻（如 ToList() 转换为集合时）执行 SQL。

与在每写一次 LINQ 都执行 SQL 相比，仅在最终使用结果的地方执行 SQL，可显著减少 I/O 次数，从而有可能获得更好的性能。

### 如何立即执行

**其实延迟执行也有需要注意的地方：在调用 ToList() 等方法执行 LINQ 之前，每次在代码中访问数据源时，数据源都会被遍历一次。**

Microsoft 官方文档中也有相关说明，可阅读“保留中”的部分。指出在使用 foreach 等方式时，每次循环都会从数据源获取数据，数据量大时后果会比较严重。

[C# 中 LINQ 查询概述](https://learn.microsoft.com/ja-jp/dotnet/csharp/linq/get-started/introduction-to-linq-queries)

还有一篇文章描述了更可怕的现象：一段简单代码竟被执行了3333亿次，耗时超过 30 分钟。

[【C#】【LINQ】延迟评估的陷阱！？](https://tech.kentem.jp/entry/2023/10/16/155415)

因此，需要注意编写代码时避免嵌套，尽量减少对数据源的重复遍历次数。

从这个角度看，并非所有场景都适合延迟执行，有时也应考虑通过 ToList() 等方法有意触发立即执行。

## 结束语

这次用示例代码讲解了常用数据操作的 LINQ 写法。

LINQ 非常便利，但若项目中没有熟悉它的专家，就会难以理解。希望本文能在一定程度上替代这位专家，帮助你更好地掌握 LINQ。
