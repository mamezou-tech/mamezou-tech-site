---
title: Don't Get Lost On-Site! Thorough C# LINQ Guide with Sample Code
author: yoshihiro-tamori
date: 2025-07-28T00:00:00.000Z
tags:
  - dotnet
  - csharp
image: true
translate: true

---

C#'s LINQ is extremely convenient, but its unique syntax can be confusing.

Back when I was young and just starting out, new technologies like MVC, LINQ, EntityFramework, and Razor kept emerging in C#.

I struggled because I had no understanding of LINQ at all. On top of that, the senior colleague who knew the details was always out at client sites all day, so I couldn’t ask him anything—I just kept Googling and worrying.

But you don’t have to go through that pain. In this article, I’ll explain everything I once struggled with, complete with sample code.

Harness LINQ to power through efficient development.

## What is LINQ

LINQ in C# is a technology that lets you handle collections in an SQL-like way. Microsoft calls it Language Integrated Query.

[Language Integrated Query (LINQ)](https://learn.microsoft.com/ja-jp/dotnet/csharp/linq/)

### What You Can Do with LINQ

Earlier, I wrote that LINQ lets you handle collections in an SQL-like manner. That means you can work with CSV, XML, JSON, and also the results of SQL execution via an O/R Mapper.

Naturally, as collections, you can work with tabular data like List or key–value data like Dictionary.

You can process these collections by writing select, from, where just like in SQL.

### The Convenience of LINQ

Using LINQ makes it easier to shape collection data or extract only data that meets certain conditions than using if statements, for loops, or lambda expressions.

Also—and this is important—because LINQ can be written in an SQL-like way, it shines when you need to process multiple collections together. Such processing can easily become complex even with lambda expressions.

## Sample Data Used in This Article

First, I’ll present the data used in the sample code for this article. To make it easy to try out, it’s in CSV files.

This data has many oddities, but please bear with me. Imagine it’s a bakery managing regular customers.

```csv:product.csv
product_id,product_name,category,price
1,Cat Bread,Bread,250
2,Dog Bread,Bread,250
3,White Bread,Bread,400
4,Red Bean Bun,Bread,200
5,Financier,Sweets,300
6,Cookie,Sweets,500
7,Egg Sandwich,Sandwich,300
8,Tuna Sandwich,Sandwich,350
9,Green Tea,Beverage,150
10,Natural Water,Beverage,100
```

```csv:customer.csv
customer_id,customer_name,prefecture,registration_date
1,Sample Taro,Tokyo,2025/01/30
2,Sample Jiro,Kanagawa,2025/02/25
3,Example Saburo,Osaka,2025/03/16
4,Test Shirou,Fukuoka,2025/04/09
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

## LINQ Basics

From here, I’ll explain LINQ with sample code.

I’ll assume that the contents of the above three CSV files have been read into Lists as shown below. We’ll create model classes for each row of the CSV file (Customer, Product, Sales), and each column will correspond to a property in the model class.

```cs
CsvReader csvReader = new CsvReader();
IList<Customer> customerList = csvReader.ReadCustomer();
IList<Product> productList = csvReader.ReadProduct();
IList<Sales> salesList = csvReader.ReadSales();
```

I will omit the explanation of CSV file reading in this article.

### LINQ Query Syntax

The basic LINQ syntax starts with FROM, then WHERE, then SELECT.

For example, let’s select products priced at 300 yen or more using the sample data.

```cs
var result = from p in productList
             where p.Price >= 300
             select p;

foreach (var one in result)
{
    Console.WriteLine(string.Format("Product ID:{0}, Product Name:{1}, Price:{2} yen",
        one.ProductId, one.ProductName, one.Price));
}
```

~~~
Product ID:3, Product Name:White Bread, Price:400 yen
Product ID:5, Product Name:Financier, Price:300 yen
Product ID:6, Product Name:Cookie, Price:500 yen
Product ID:7, Product Name:Egg Sandwich, Price:300 yen
Product ID:8, Product Name:Tuna Sandwich, Price:350 yen
~~~

Seeing FROM, WHERE, and SELECT makes it look SQL-like, doesn’t it? LINQ is the technology that lets you handle collections this easily.

As a side note, in SQL you first write SELECT, then FROM, then WHERE. But unless you know the FROM and JOIN parts, you can’t decide what to SELECT. LINQ has no such issue: you write FROM, JOIN, and WHERE first, then write SELECT at the very end.

This style of writing SQL-like syntax using from, where, select is called query syntax.

### LINQ Method Syntax

LINQ also has a method syntax, which uses lambda expressions, in contrast to query syntax. Since LINQ operates on collections, you can also use lambda expressions.

You can use either one depending on your preference. I use both.

Converting the previous query syntax into method syntax looks like this.

```cs
// LINQ method syntax
var result = productList.Where(p => p.Price >= 300);

foreach (var one in result)
{
    Console.WriteLine(string.Format("Product ID:{0}, Product Name:{1}, Price:{2} yen",
        one.ProductId, one.ProductName, one.Price));
}
```

~~~
Product ID:3, Product Name:White Bread, Price:400 yen
Product ID:5, Product Name:Financier, Price:300 yen
Product ID:6, Product Name:Cookie, Price:500 yen
Product ID:7, Product Name:Egg Sandwich, Price:300 yen
Product ID:8, Product Name:Tuna Sandwich, Price:350 yen
~~~

### About Anonymous Types

Anonymous types are something you can’t avoid when using LINQ. They can be tricky, so I’ll explain them.

In simple terms, an anonymous type is a type defined dynamically. Without any prior definition, the type is determined by the values assigned at that moment.

If you want to know more details, please read the Microsoft documentation.

[Anonymous Types - C# | Microsoft Learn](https://learn.microsoft.com/ja-jp/dotnet/csharp/fundamentals/types/anonymous-types)

You use anonymous types in LINQ when you want to specify multiple data items or columns.

I’ll restate the sample code I mentioned earlier: anonymous types are unnecessary when you only specify a single type of data (like Product) in the select clause.

```cs
// LINQ query syntax
var result = from p in productList
             where p.Price >= 300
             select p;

foreach (var one in result)
{
    Console.WriteLine(string.Format("Product ID:{0}, Product Name:{1}, Price:{2} yen",
        one.ProductId, one.ProductName, one.Price));
}
```

When you want to join multiple pieces of data and specify each in the select clause, you use anonymous types. You write something like new { aaa, bbb, ccc }.

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

As an aside, when you use an anonymous type in the select clause, think of it as if var is hidden on the left side. In the sample code above, the select clause is conceptually like this:

```cs
var Sales = sales;
var Customer = customer;
var Product = product;
```

You also use anonymous types to specify multiple columns in join conditions. In the sample code below, two columns, key1 and key2, are specified.

```cs
new { a.key1, a.key2 } equals new { b.key1, b.key2 }
```

You also use it when you want to specify multiple columns for GROUP BY or ORDER BY.

```cs
group new { sales, product } by sales.SalesDate into g
```

## Examples of Major LINQ Operations

From here, I’ll explain how to perform data operations commonly used in SQL with LINQ, complete with sample code.

### How to Perform an INNER JOIN

For the INNER JOIN example, let’s join the sales data, product data, and customer data.

To perform an INNER JOIN (i.e., inner join), use join, on, and equals as shown below.

```cs
// How to perform INNER JOIN with LINQ
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
        "Sales Date:{0}, Customer Name:{1}, Product Name:{2}, Price:{3}",
        one.Sales.SalesDate, one.Customer.CustomerName,
        one.Product.ProductName, one.Product.Price));
}
```

~~~
Sales Date:2025/02/06 0:00:00, Customer Name:Sample Taro, Product Name:Cat Bread, Price:250
Sales Date:2025/02/06 0:00:00, Customer Name:Sample Taro, Product Name:Dog Bread, Price:250
Sales Date:2025/03/04 0:00:00, Customer Name:Sample Jiro, Product Name:White Bread, Price:400
Sales Date:2025/03/20 0:00:00, Customer Name:Example Saburo, Product Name:Financier, Price:300
Sales Date:2025/03/20 0:00:00, Customer Name:Example Saburo, Product Name:Cookie, Price:500
Sales Date:2025/04/11 0:00:00, Customer Name:Test Shirou, Product Name:Egg Sandwich, Price:300
Sales Date:2025/04/11 0:00:00, Customer Name:Test Shirou, Product Name:Tuna Sandwich, Price:350
Sales Date:2025/04/11 0:00:00, Customer Name:Test Shirou, Product Name:Green Tea, Price:150
~~~

In this example, the join condition uses only one column. If you need to specify multiple columns in the join condition, use anonymous types as in the following sample code.

```cs
new { a.key1, a.key2 } equals new { b.key1, b.key2 }
```

Actually, at first I didn’t know how to do an INNER JOIN, so I went through a lot of trial and error. I ended up doing it with the Where method like this. It does work, but using join is more elegant.

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

### How to Perform a LEFT OUTER JOIN

For the LEFT OUTER JOIN example, let’s similarly join the sales data, product data, and customer data as in the INNER JOIN.

The way to do a LEFT OUTER JOIN is just to add into to the INNER JOIN. What you write after into is a variable that temporarily holds the joined data.

Then in the next line you see cg.DefaultIfEmpty(). This means if there is no matching key in the joined data, use the default value, i.e., null.

In a LEFT OUTER JOIN, if there is no matching key in the join target, the result is null as well. It’s the same here.

```cs
// How to perform LEFT OUTER JOIN in LINQ
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
        "Sales Date:{0}, Customer Name:{1}, Product Name:{2}, Price:{3}",
        one.Sales.SalesDate, one.Customer.CustomerName,
        one.Product.ProductName, one.Product.Price));
}
```

~~~
Sales Date:2025/02/06 0:00:00, Customer Name:Sample Taro, Product Name:Cat Bread, Price:250
Sales Date:2025/02/06 0:00:00, Customer Name:Sample Taro, Product Name:Dog Bread, Price:250
Sales Date:2025/03/04 0:00:00, Customer Name:Sample Jiro, Product Name:White Bread, Price:400
Sales Date:2025/03/20 0:00:00, Customer Name:Example Saburo, Product Name:Financier, Price:300
Sales Date:2025/03/20 0:00:00, Customer Name:Example Saburo, Product Name:Cookie, Price:500
Sales Date:2025/04/11 0:00:00, Customer Name:Test Shirou, Product Name:Egg Sandwich, Price:300
Sales Date:2025/04/11 0:00:00, Customer Name:Test Shirou, Product Name:Tuna Sandwich, Price:350
Sales Date:2025/04/11 0:00:00, Customer Name:Test Shirou, Product Name:Green Tea, Price:150
~~~

### How to Use Aggregate Functions

Next, let’s look at how to use aggregate functions familiar from SQL.

```cs
// Average
var average = salesList.Average(x => x.Quantity);
Console.WriteLine(string.Format("Average quantity sold:{0}", average.ToString()));

// Sum
var sum = salesList.Sum(x => x.Quantity);
Console.WriteLine(string.Format("Total quantity sold:{0}", sum.ToString()));

// Max
var max = productList.Max(x => x.Price);
Console.WriteLine(string.Format("Highest price:{0}", max));

// Min
var min = productList.Min(x => x.Price);
Console.WriteLine(string.Format("Lowest price:{0}", min));

// Count
var count = productList.Count(x => x.Price > 200);
Console.WriteLine(string.Format("Number of products over 200 yen:{0}", count.ToString()));
```

~~~
Average quantity sold:1.625
Total quantity sold:13
Highest price:500
Lowest price:100
Number of products over 200 yen:7
~~~

The types of aggregation correspond to the method names. You pass the field you want to aggregate as the argument to each method.

### How to Do GROUP BY

As an example of GROUP BY, let’s aggregate daily sales.

To do GROUP BY, use group, by, and into. It’s a bit tricky, so please read the sample code carefully.

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

Console.WriteLine("Daily Sales");
foreach (var group in groupList)
{
    Console.WriteLine(string.Format("Date:{0}, Total Sales:{1}", group.SalesDate, group.TotalSales));
}
```

~~~
Daily Sales
Date:2025/02/06 0:00:00, Total Sales:500
Date:2025/03/04 0:00:00, Total Sales:800
Date:2025/03/20 0:00:00, Total Sales:2400
Date:2025/04/11 0:00:00, Total Sales:800
~~~

First, after group, you specify the items you want to select. In this case, the items needed for daily sales are sales date, price, and quantity sold. Therefore, the sales data (Sales) and product data (Product) apply.

Then you write by and specify the item you want to use as the grouping key. In this case, sales date (SalesDate).

Then you write into and specify the variable name that holds the grouped values. In this case, “g”. Since the variable specified in into is only used temporarily, a placeholder name is fine.

Finally, write the select clause to retrieve the key used for grouping via g.Key, and the aggregated value via g.Sum(aggregation expression).

### How to Do ORDER BY

To do ORDER BY, use orderby. Just like in SQL, the default is ascending order, and to specify descending order, add descending.

```cs
// ORDER BY ASC
var orderAsc = from product in productList
               orderby product.Price
               select product;

Console.WriteLine("Sorted by Low Price");
foreach (var one in orderAsc)
{
    Console.WriteLine(string.Format("Product ID:{0}, Product Name:{1}", one.ProductId, one.ProductName));
}

// ORDER BY DESC
var orderDesc = from product in productList
                orderby product.Price descending
                select product;

Console.WriteLine("Sorted by High Price");
foreach (var one in orderDesc)
{
    Console.WriteLine(string.Format("Product ID:{0}, Product Name:{1}", one.ProductId, one.ProductName));
}
```

~~~
Sorted by Low Price
Product ID:10, Product Name:Natural Water
Product ID:9, Product Name:Green Tea
Product ID:4, Product Name:Red Bean Bun
Product ID:1, Product Name:Cat Bread
Product ID:2, Product Name:Dog Bread
Product ID:5, Product Name:Financier
Product ID:7, Product Name:Egg Sandwich
Product ID:8, Product Name:Tuna Sandwich
Product ID:3, Product Name:White Bread
Product ID:6, Product Name:Cookie
Sorted by High Price
Product ID:6, Product Name:Cookie
Product ID:3, Product Name:White Bread
Product ID:8, Product Name:Tuna Sandwich
Product ID:5, Product Name:Financier
Product ID:7, Product Name:Egg Sandwich
Product ID:1, Product Name:Cat Bread
Product ID:2, Product Name:Dog Bread
Product ID:4, Product Name:Red Bean Bun
Product ID:9, Product Name:Green Tea
Product ID:10, Product Name:Natural Water
~~~

### How to Retrieve the First or Last Item

To retrieve the first item, use First() or FirstOrDefault(). If you need to consider the case where the result might be empty, use FirstOrDefault(). Of course, be careful with null handling.

```cs
var firstOne = productList.FirstOrDefault();
Console.WriteLine("First Item");
Console.WriteLine(string.Format("Product ID:{0}, Product Name:{1}", firstOne.ProductId, firstOne.ProductName));
```

~~~
First Item
Product ID:1, Product Name:Cat Bread
~~~

To retrieve the last item, use Last() or LastOrDefault(). As with the first item, if you need to account for the result being empty, use LastOrDefault(), and be careful with null handling.

```cs
var lastOne = productList.LastOrDefault();
Console.WriteLine("Last Item");
Console.WriteLine(string.Format("Product ID:{0}, Product Name:{1}", lastOne.ProductId, lastOne.ProductName));
```

~~~
Last Item
Product ID:10, Product Name:Natural Water
~~~

## Points to Note with LINQ

### Deferred Execution

In fact, LINQ is executed lazily. If you write LINQ to retrieve data from the database, use SQL Server on the DB side, launch the Profiler, and debug, you will see that SQL isn’t executed until you actually enumerate the LINQ expression. The LINQ expression runs at the moment you actually use its result, such as when you call ToList() to convert it to a collection.

For LINQ to SQL, which lets you use LINQ against an O/R Mapper, the SQL is executed at the moment you use the LINQ result (for example, when you call ToList() to convert it to a collection).

Executing SQL at every point where LINQ is written versus executing it only at the point where you finally use the result— the latter can be more performance-friendly, since it reduces the number of I/O operations.

### How to Force Immediate Execution

There is a caveat with LINQ’s deferred execution: until you force execution with something like ToList(), each time the data source appears in the code, the data source is iterated again.

This is also discussed on Microsoft’s site. Please read the section on deferred parts. It says that when using foreach, the data source is fetched on each loop iteration. Depending on the number of items, that could be disastrous.

[Overview of LINQ Queries in C#](https://learn.microsoft.com/ja-jp/dotnet/csharp/linq/get-started/introduction-to-linq-queries)

There was also an article describing a horrifying incident. A simple code was executed 333 billion times and took more than 30 minutes.

[C#][LINQ] The Pitfalls of Lazy Evaluation?!(https://tech.kentem.jp/entry/2023/10/16/155415)

Therefore, you need to be careful to write code that minimizes the number of times the data source is iterated, for example by avoiding nesting.

In that sense, rather than always relying on deferred execution, sometimes you need to intentionally force immediate execution with ToList(), etc.

## Conclusion

In this article, I explained how to write common data operations in LINQ with sample code.

LINQ is very convenient, but it can be hard to understand if there’s no knowledgeable person in the project. I hope this article substitutes for that expert.
