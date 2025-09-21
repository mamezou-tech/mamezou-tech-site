---
title: >-
  Boost Productivity with C# and Entity Framework! A Comprehensive Guide from
  Basics to Practice
author: yoshihiro-tamori
date: 2025-09-17T00:00:00.000Z
tags:
  - dotnet
  - csharp
  - ORマッパー
image: true
translate: true

---

When developing with C#, Entity Framework is the standard ORM. While Entity Framework can be somewhat difficult to understand, it offers high development efficiency.

Furthermore, since the advent of ASP.NET Core, Entity Framework has evolved into Entity Framework Core, further increasing development efficiency.

When writing this article, I used Entity Framework again after a long time and realized just how easy development can be. This should significantly improve productivity.

Therefore, I will explain everything from setting up Entity Framework to how to use it, along with sample code.

I hope this article is helpful not only for those who want to learn how to use Entity Framework, but also for those considering introducing Entity Framework into their development projects.

## Overview of Entity Framework and Environment Setup

Entity Framework is an ORM. It allows you to access SQL Server, SQLite, MySQL, PostgreSQL, Azure Cosmos DB, and more using C#.

Like typical ORMs, you create model classes corresponding to database tables and use methods provided by Entity Framework, such as Select and Insert, to manipulate the database.

### Installing Entity Framework

To use Entity Framework, you need to install it.

If you are using Visual Studio, install the following packages from NuGet. In the sample for this article, we are using SQL Server Express.

- EntityFrameworkCore
- EntityFrameworkCore.SqlServer
- EntityFrameworkCore.Tools

Install EntityFrameworkCore. The non-Core EntityFramework package is for .NET v4.x.

If you are using VSCode, navigate to your project folder and run the following commands to install:

```
dotnet add package Microsoft.EntityFrameworkCore
dotnet add package Microsoft.EntityFrameworkCore.SqlServer
dotnet add package Microsoft.EntityFrameworkCore.Tools
```

If the `dotnet` command is not found or you haven't set up a C# development environment in VSCode, please refer to this article for environment setup:

[Getting Started with VS Code! A Clear & Practical C# Development Environment Setup [2025 Edition Manual]](https://developer.mamezou-tech.com/blogs/2025/07/05/csharp_vscode/)

### Installing SQL Server Express

This sample uses SQL Server Express. If you have not installed SQL Server, please install it. Microsoft’s download site is here:

https://www.microsoft.com/ja-jp/download/details.aspx?id=104781

Next, install SQL Server Management Studio. Microsoft’s download site is here:

https://learn.microsoft.com/ja-jp/ssms/install/install

Once you have installed Management Studio, let's log in.

For Server name, enter `localhost\sqlexpress`; for Authentication type, select Windows Authentication; and check Trust Server Certificate.

![Logging into SQL Server Express from Management Studio](/img/dotnet/csharp_entityframework/ManagementStudioLogin.png)

:::info
As a note, there are three types of SQL Server authentication methods.
1. Windows Authentication, which logs in using a Windows user.
2. SQL Server Authentication, the general method that logs in with a database-registered user and password.
3. Mixed Mode Authentication, which uses both.
For local development, Windows Authentication is easiest.
:::

## Preparing Data and DB Access Processes

### Sample Data Used in This Article

In this article, we will use a set meal restaurant’s menu as sample data. The data may have some curious points, but please bear with it since it's just a sample.

Here is the CSV data:

```csv:menu.csv
menu_id,menu_name,price
1,Grilled Fish Set Meal,1000
2,Fried Chicken Set Meal,900
3,Sashimi Set Meal,1200
4,Tempura Set Meal,1100
5,Fried Horse Mackerel Set Meal,1100
```

```csv:menu_item.csv
menu_id,menu_item_id,menu_item_name
1,1,Rice
1,2,Miso Soup
1,3,Salt-Grilled Salmon
1,4,Pickles
2,1,Rice
2,2,Miso Soup
2,3,Fried Chicken
2,4,Salad
3,1,Rice
3,2,Miso Soup
3,3,Sashimi
3,4,Pickles
4,1,Rice
4,2,Miso Soup
4,3,Tempura
4,4,Pickles
5,1,Rice
5,2,Miso Soup
5,3,Fried Horse Mackerel
5,4,Salad
```

### DDL for Sample Data

The DDL to create the tables for inserting the sample data is as follows:

```sql:DDL.sql
create table menu (
    menu_id int not null primary key,
    menu_name nvarchar(50),
    price decimal(5,0)
);

create table menu_item (
    menu_id int not null,
    menu_item_id int not null,
    menu_item_name nvarchar(50),
    constraint PK_menu_item primary key clustered(menu_id, menu_item_id)
);
```

The SQL to insert the sample data is as follows:

```sql:insert_date.sql
-- menu
insert into menu values (1, 'Grilled Fish Set Meal', 1000);
insert into menu values (2, 'Fried Chicken Set Meal', 900);
insert into menu values (3, 'Sashimi Set Meal', 1200);
insert into menu values (4, 'Tempura Set Meal', 1100);
insert into menu values (5, 'Fried Horse Mackerel Set Meal', 1100);

-- menu_item
insert into menu_item values (1, 1, 'Rice');
insert into menu_item values (1, 2, 'Miso Soup');
insert into menu_item values (1, 3, 'Salt-Grilled Salmon');
insert into menu_item values (1, 4, 'Pickles');
insert into menu_item values (2, 1, 'Rice');
insert into menu_item values (2, 2, 'Miso Soup');
insert into menu_item values (2, 3, 'Fried Chicken');
insert into menu_item values (2, 4, 'Salad');
insert into menu_item values (3, 1, 'Rice');
insert into menu_item values (3, 2, 'Miso Soup');
insert into menu_item values (3, 3, 'Sashimi');
insert into menu_item values (3, 4, 'Pickles');
insert into menu_item values (4, 1, 'Rice');
insert into menu_item values (4, 2, 'Miso Soup');
insert into menu_item values (4, 3, 'Tempura');
insert into menu_item values (4, 4, 'Pickles');
insert into menu_item values (5, 1, 'Rice');
insert into menu_item values (5, 2, 'Miso Soup');
insert into menu_item values (5, 3, 'Fried Horse Mackerel');
insert into menu_item values (5, 4, 'Salad');
```

### DbContext and Models

Assume you create a folder named `Models` directly under the project and place the DbContext and model files there. Create each as a .cs file.

![Location where DbContext and models are placed](/img/dotnet/csharp_entityframework/SolutionExplorerModels.png)

Here is the code:

```cs:SampleContext.cs
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace EntityFrameworkSample.Models
{
    internal class SampleContext : DbContext
    {
        public SampleContext()
        {
        }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            // Configure the connection string
            // Trusted_Connection=True is a setting to use Windows Authentication
            // This is convenient for local development on localhost
            optionsBuilder.UseSqlServer("Server=localhost\\SQLEXPRESS;Database=SampleDB;Trusted_Connection=True;TrustServerCertificate=Yes;");
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // When using a composite primary key, you must specify the key properties here,
            // otherwise data may not be retrieved correctly (e.g., zero records).
            modelBuilder.Entity<MenuItem>().HasKey(mi => new { mi.MenuId, mi.MenuItemId });
        }

        // Define a model (DbSet) for each table you want to access
        public DbSet<Menu> Menu { get; set; }
        public DbSet<MenuItem> MenuItem { get; set; }
    }
}
```

Here, the connection string is set to use Windows Authentication, assuming a local development environment.

If you have tables with composite primary keys, specify the key properties in the `OnModelCreating` method. Otherwise, Entity Framework cannot understand the composite primary key, and you may not retrieve data correctly.

Next, I'll explain how to use the DbContext.

```cs
internal class MenuRepository
{
    SampleContext _context = new SampleContext();

    public IList<Menu> SelectMenus()
    {
        // By using the Include method, you can retrieve related table data together
        return _context.Menu.Include(menu => menu.MenuItemList)
            .ToList();
    }
}
```

Next, here is the code for the models:

```cs:Menu.cs
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace EntityFrameworkSample.Models
{
    internal class Menu
    {
        [Column("menu_id")]
        public int MenuId { get; set; }
        [Column("menu_name")]
        public string MenuName { get; set; } = string.Empty;
        public Decimal Price { get; set; }
        public IList<MenuItem> MenuItemList { get; set; } = new List<MenuItem>();
    }
}
```

```cs:MenuItem.cs
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace EntityFrameworkSample.Models
{
    [Table("menu_item")]
    internal class MenuItem
    {
        [Column("menu_id")]
        public int MenuId { get; set; }
        [Column("menu_item_id")]
        public int MenuItemId { get; set; }
        [Column("menu_item_name")]
        public string MenuItemName { get; set; } = string.Empty;
        public Menu Menu { get; set; } = new Menu();
    }
}
```

I would like to point out one thing here.

In fact, when Entity Framework maps a database table to a model, it uses the property name in the DbContext rather than the model's class name.

In the sample code, it looks like this:

```cs:SampleContext.cs snippet
// This maps to a table named menu
public DbSet<Menu> Menu { get; set; }
// This maps to a table named menuitem
public DbSet<MenuItem> MenuItem { get; set; }
// This maps to a table named menu_item (actually, using an underscore in a property name is against conventions)
public DbSet<MenuItem> Menu_Item { get; set; }
```

If the table name does not contain an underscore—for example, table name `menu` and model name `Menu`—you would likely name the property `Menu` as well, so it's not problematic.

However, for tables that include an underscore in their name, like `menu_item`, caution is needed. If you name the property `MenuItem`, you will get a runtime exception such as “Invalid object name 'MenuItem'”.

Entity Framework will look for a table named `menuitem`.

![Mapping between model names and Entity Framework](/img/dotnet/csharp_entityframework/ModelMappingError.png)

By adding an underscore to the property name as `Menu_Item`, the exception no longer occurs.

However, since adding an underscore to property names goes against C# naming conventions, you need to use the `Table` annotation to specify the table name.

```cs:Example of using the Table annotation
[Table("menu_item")]
internal class MenuItem
```

## Basic Operations

### Select Operations

Let's start with the Select operation.

First, let's create a process to retrieve data from the DB. Assuming you create a folder named `Repositories` directly under the project and create a DB access class named `MenuRepository.cs`.

![Location where DB access processes are placed](/img/dotnet/csharp_entityframework/SolutionExplorerRepositories.png)

```cs:MenuRepository.cs
using EntityFrameworkSample.Dtos;
using EntityFrameworkSample.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace EntityFrameworkSample.Repositories
{
    internal class MenuRepository
    {
        SampleContext _context = new SampleContext();

        public IList<Menu> SelectMenus()
        {
            // Using the Include method allows you to retrieve related table data together
            return _context.Menu.Include(menu => menu.MenuItemList)
                .ToList();
        }
    }
}
```

Let me add one note here. If you need to join tables, you could use a LINQ JOIN, but using the `Include` method is overwhelmingly easier. With just this method, it retrieves data where the keys of the related tables match. The convenience is astonishing.

If you are unable to properly retrieve the values of joined tables with the Include method, check the following for any mistakes or omissions:
- The model's `Table` annotation
- The model's `Column` annotations
- The DbContext's `OnModelCreating` method

Modify `Program.cs` to call `MenuRepository#SelectMenus`, then run it.

```cs:Program.cs
using EntityFrameworkSample.Dtos;
using EntityFrameworkSample.Models;
using EntityFrameworkSample.Repositories;

MenuRepository menuRepository = new MenuRepository();

// Sample for Select
var menus = menuRepository.SelectMenus();
foreach (var menu in menus)
{
    Console.WriteLine($"Menu Name: {menu.MenuName}, Price: {menu.Price} yen");
    foreach (var item in menu.MenuItemList)
    {
        Console.WriteLine($"  Item: {item.MenuItemName}");
    }
}
```

The output will be as follows:

```
Menu Name: Grilled Fish Set Meal, Price: 1000 yen
  Item: Rice
  Item: Miso Soup
  Item: Salt-Grilled Salmon
  Item: Pickles
Menu Name: Fried Chicken Set Meal, Price: 900 yen
  Item: Rice
  Item: Miso Soup
  Item: Fried Chicken
  Item: Salad
Menu Name: Sashimi Set Meal, Price: 1200 yen
  Item: Rice
  Item: Miso Soup
  Item: Sashimi
  Item: Pickles
Menu Name: Tempura Set Meal, Price: 1100 yen
  Item: Rice
  Item: Miso Soup
  Item: Tempura
  Item: Pickles
Menu Name: Fried Horse Mackerel Set Meal, Price: 1100 yen
  Item: Rice
  Item: Miso Soup
  Item: Fried Horse Mackerel
  Item: Salad
```

### Insert Operations

The Insert operation is very simple. You just add an object to the model using the DbContext.

As an example, let's add a Tempura Rice Bowl as a new menu:

```cs:MenuRepository.cs
using EntityFrameworkSample.Dtos;
using EntityFrameworkSample.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace EntityFrameworkSample.Repositories
{
    internal class MenuRepository
    {
        SampleContext _context = new SampleContext();

        public void InsertMenu(Menu menu)
        {
            // Add a new menu
            _context.Menu.Add(menu);
            _context.SaveChanges();
        }
    }
}
```

In `Program.cs`, call `MenuRepository#InsertMenu` and run it:

```cs:Program.cs
using EntityFrameworkSample.Dtos;
using EntityFrameworkSample.Models;
using EntityFrameworkSample.Repositories;

MenuRepository menuRepository = new MenuRepository();

// Sample for Create
var newMenu = new Menu
{
    MenuId = 6,
    MenuName = "Tempura Rice Bowl",
    Price = 1000,
    MenuItemList = new List<MenuItem>
    {
       new MenuItem { MenuId = 6, MenuItemId = 1, MenuItemName = "Tempura Rice Bowl" },
       new MenuItem { MenuId = 6, MenuItemId = 2, MenuItemName = "Miso Soup" },
       new MenuItem { MenuId = 6, MenuItemId = 3, MenuItemName = "Pickles" }
    }
};
menuRepository.InsertMenu(newMenu);
```

Check the DB from Management Studio, and if three records have been added as shown below, you're all set.

![Sample execution result of Insert with Entity Framework](/img/dotnet/csharp_entityframework/CreateResult.png)

### Update Operations

Update operations are also simple. You just use the model's `Update` method via the DbContext.

As an example, let's change the Miso Soup in the Fried Chicken Set Meal to Pork Miso Soup and raise the price by 50 yen.

```cs:MenuRepository.cs
using EntityFrameworkSample.Dtos;
using EntityFrameworkSample.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace EntityFrameworkSample.Repositories
{
    internal class MenuRepository
    {
        SampleContext _context = new SampleContext();

        public Menu SelectMenuById(int menuId)
        {
            // Retrieve the menu with the specified ID
            return _context.Menu.Include(menu => menu.MenuItemList).Where(menu => menu.MenuId == menuId)
                .FirstOrDefault();
        }

        public void UpdateMenu(Menu menu)
        {
            // Update an existing menu
            _context.Menu.Update(menu);
            _context.SaveChanges();
        }
    }
}
```

In `Program.cs`, first call `MenuRepository#SelectMenuById` to fetch the target for update. Then modify the values and call `MenuRepository#UpdateMenu` to apply changes to the DB. Once the code is written, run it.

```cs:Program.cs
using EntityFrameworkSample.Dtos;
using EntityFrameworkSample.Models;
using EntityFrameworkSample.Repositories;

MenuRepository menuRepository = new MenuRepository();

// Sample for Update
// Retrieve the Fried Chicken Set Meal
var targetMenu = menuRepository.SelectMenuById(2);
if (targetMenu != null)
{
   // Change Miso Soup to Pork Miso Soup and increase price by 50 yen (900 yen -> 950 yen)
   targetMenu.Price = 950;
   targetMenu.MenuItemList.Where(item => item.MenuItemName == "Miso Soup")
       .ToList()
       .ForEach(item => item.MenuItemName = "Pork Miso Soup");
   menuRepository.UpdateMenu(targetMenu);
}
```

Check the DB from Management Studio, and if the data has been updated as shown below, you're all set.

![Sample execution result of Update with Entity Framework](/img/dotnet/csharp_entityframework/UpdateResult.png)

### Delete Operations

Delete operations are also simple. You just use the model's `Remove` method via the DbContext.

Here, as an example, let's delete the Tempura Rice Bowl we added in the previous Insert example. Even though the restaurant started offering rice bowl dishes, they didn't become very popular and didn't sell well.

```cs:MenuRepository.cs
using EntityFrameworkSample.Dtos;
using EntityFrameworkSample.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace EntityFrameworkSample.Repositories
{
    internal class MenuRepository
    {
        SampleContext _context = new SampleContext();

        public void DeleteMenu(int menuId)
        {
            // Delete a menu
            var menu = _context.Menu.Find(menuId);
            if (menu != null)
            {
                _context.Menu.Remove(menu);
                _context.SaveChanges();
            }
        }
    }
}
```

In `Program.cs`, call `MenuRepository#DeleteMenu` and run it:

```cs:Program.cs
using EntityFrameworkSample.Dtos;
using EntityFrameworkSample.Models;
using EntityFrameworkSample.Repositories;

MenuRepository menuRepository = new MenuRepository();

// Sample for Delete
// Delete the Tempura Rice Bowl
menuRepository.DeleteMenu(6);
```

Check the DB from Management Studio, and if the Tempura Rice Bowl can no longer be retrieved as shown below, you're all set.

![Sample execution result of Delete with Entity Framework](/img/dotnet/csharp_entityframework/DeleteResult.png)

## Practical Operations

### Bulk Insert Operations

First, let's try inserting multiple records into the DB at once.

Here, as an example, we will add three set meal menus.

```cs:MenuRepository.cs
using EntityFrameworkSample.Dtos;
using EntityFrameworkSample.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace EntityFrameworkSample.Repositories
{
    internal class MenuRepository
    {
        SampleContext _context = new SampleContext();

        public void InsertManyMenus(IList<Menu> menus)
        {
            // Add multiple menus at once
            _context.Menu.AddRange(menus);
            _context.SaveChanges();
        }
    }
}
```

When inserting a single record, we used the `Add` method, but when inserting multiple records, you can use the `AddRange` method. You can even pass the `List` directly as an argument. There's no need to loop with `foreach` to call `Add` for each item.

Next, modify `Program.cs` to call `MenuRepository#InsertManyMenus` and run it:

```cs:Program.cs
using EntityFrameworkSample.Dtos;
using EntityFrameworkSample.Models;
using EntityFrameworkSample.Repositories;

MenuRepository menuRepository = new MenuRepository();

// Sample for InsertMany
var newMenuList = new List<Menu>
{
   new Menu
   {
       MenuId = 7,
       MenuName = "Simmered Fish Set Meal",
       Price = 1000,
       MenuItemList = new List<MenuItem>
       {
           new MenuItem { MenuId = 7, MenuItemId = 1, MenuItemName = "Rice"},
           new MenuItem { MenuId = 7, MenuItemId = 2, MenuItemName = "Miso Soup"},
           new MenuItem { MenuId = 7, MenuItemId = 3, MenuItemName = "Simmered Fish"},
           new MenuItem { MenuId = 7, MenuItemId = 4, MenuItemName = "Pickles"}
       }
   },
   new Menu
   {
       MenuId = 8,
       MenuName = "Fried Shrimp Set Meal",
       Price = 1300,
       MenuItemList = new List<MenuItem>
       {
           new MenuItem { MenuId = 8, MenuItemId = 1, MenuItemName = "Rice"},
           new MenuItem { MenuId = 8, MenuItemId = 2, MenuItemName = "Miso Soup"},
           new MenuItem { MenuId = 8, MenuItemId = 3, MenuItemName = "Fried Shrimp"},
           new MenuItem { MenuId = 8, MenuItemId = 4, MenuItemName = "Salad"}
       }
   },
   new Menu
   {
       MenuId = 9,
       MenuName = "Pork Cutlet Set Meal",
       Price = 1250,
       MenuItemList = new List<MenuItem>
       {
           new MenuItem { MenuId = 9, MenuItemId = 1, MenuItemName = "Rice"},
           new MenuItem { MenuId = 9, MenuItemId = 2, MenuItemName = "Miso Soup"},
           new MenuItem { MenuId = 9, MenuItemId = 3, MenuItemName = "Pork Cutlet"},
           new MenuItem { MenuId = 9, MenuItemId = 4, MenuItemName = "Salad"}
       }
   }
};
menuRepository.InsertManyMenus(newMenuList);
```

Check the DB from Management Studio, and if you can retrieve the three set meals as shown below, you're all set.

![Sample execution result of bulk Insert with Entity Framework](/img/dotnet/csharp_entityframework/InsertManyResult.png)

### Bulk Update Operations

Next, let's try updating multiple records at once.

Here, as an example, we'll raise the prices of the menu items in consideration of recent price increases.

```cs:MenuRepository.cs
using EntityFrameworkSample.Dtos;
using EntityFrameworkSample.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace EntityFrameworkSample.Repositories
{
    internal class MenuRepository
    {
        SampleContext _context = new SampleContext();

        public IList<Menu> SelectMenus()
        {
            // Using the Include method allows you to retrieve related table data together
            return _context.Menu.Include(menu => menu.MenuItemList)
                .ToList();
        }

        public void UpdateManyMenus(IList<Menu> menus)
        {
            // Update multiple menus at once
            _context.Menu.UpdateRange(menus);
            _context.SaveChanges();
        }
    }
}
```

Use the `UpdateRange` method to perform batch updates. Like with Insert, there is a method that allows you to pass a `List` of multiple records for Update.

Next, call `MenuRepository#SelectMenus` from `Program.cs` to change the prices. Then call `MenuRepository#UpdateManyMenus` and run it:

```cs:Program.cs
using EntityFrameworkSample.Dtos;
using EntityFrameworkSample.Models;
using EntityFrameworkSample.Repositories;

MenuRepository menuRepository = new MenuRepository();

// Sample for UpdateMany
var targetList = menuRepository.SelectMenus();
foreach (var menu in targetList)
{
   switch (menu.MenuId)
   {
       case 1:
           menu.Price = 1100;
           break;
       case 2:
           menu.Price = 1050;
           break;
       case 3:
           menu.Price = 1350;
           break;
       case 4:
           menu.Price = 1200;
           break;
       case 5:
           menu.Price = 1200;
           break;
   }
}
menuRepository.UpdateManyMenus(targetList);
```

Check the DB from Management Studio, and if the prices have been changed as shown below, you're all set.

![Sample execution result of bulk Update with Entity Framework](/img/dotnet/csharp_entityframework/UpdateManyResult.png)

### Processing Based on Input in a Search Screen

Next, let's create a process that searches based on the conditions entered in a search screen. The important point is to apply only the fields that have been entered as search criteria.

First, create a search criteria class. Create a folder named `Dtos` directly under the project, and create a class named `MenuSearchCriteria`.

![Location where search criteria are placed](/img/dotnet/csharp_entityframework/SolutionExplorerDtos.png)

```cs:MenuSearchCriteria.cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace EntityFrameworkSample.Dtos
{
    internal class MenuSearchCriteria
    {
        // Menu name (partial match)
        public string? MenuName { get; set; } = string.Empty;
        // Price (greater than or equal)
        public decimal? Price { get; set; }
        // Menu item name (partial match)
        public string? MenuItemName { get; set; } = string.Empty;
    }
}
```

Then, in `MenuRepository`, filter with the `Where` method only when the properties in the search criteria have values, as shown below:

```cs:MenuRepository.cs
using EntityFrameworkSample.Dtos;
using EntityFrameworkSample.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace EntityFrameworkSample.Repositories
{
    internal class MenuRepository
    {
        SampleContext _context = new SampleContext();

        public IList<Menu> SearchMenus(MenuSearchCriteria criteria)
        {
            // Write the query to retrieve data, but by not calling ToList, no SQL is executed
            var resultList = _context.Menu.Include(menu => menu.MenuItemList).AsQueryable();
            // Filter if search criteria have been entered
            // Menu name
            if (!string.IsNullOrWhiteSpace(criteria.MenuName))
            {
                resultList = resultList.Where(p => p.MenuName.Contains(criteria.MenuName));
            }
            if (criteria.Price.HasValue)
            {
                resultList = resultList.Where(p => p.Price >= criteria.Price);
            }
            if (!string.IsNullOrWhiteSpace(criteria.MenuItemName))
            {
                // Access via menu list -> menu item list in the lambda
                // If the menu item name contains the search criteria even once, include it
                resultList = resultList.Where(
                    p => p.MenuItemList.Where(
                        i => i.MenuItemName.Contains(criteria.MenuItemName)
                    ).Count() > 0);
            }
            return resultList.ToList();
        }
    }
}
```

The key point here is that no SQL is executed when you initially retrieve the data, and no SQL is executed when you apply subsequent `Where` filters. SQL is only generated when the final `ToList` method is executed.

If SQL were executed both when initially retrieving data and when adding search criteria, it would increase I/O to the DB and severely degrade performance. While you might not notice it for dozens or hundreds of records, for tens of thousands of records, the processing time would become unacceptable.

This feature, where SQL isn't generated until the `ToList` method is executed, is called deferred execution. For more details, refer to the “LINQ Cautions” section in this LINQ article:

[Don't Get Lost in the Field! Thoroughly Master C# LINQ with Sample Code](https://developer.mamezou-tech.com/blogs/2025/07/28/csharp_linq/#linqの注意点)

Finally, modify `Program.cs` to call `MenuRepository#SearchMenus` and run it. As an example, we'll search for menus with a price of 1200 yen or more and that include Salad as a menu item.

```cs:Program.cs
using EntityFrameworkSample.Dtos;
using EntityFrameworkSample.Models;
using EntityFrameworkSample.Repositories;

MenuRepository menuRepository = new MenuRepository();

// Search screen processing
MenuSearchCriteria criteria = new MenuSearchCriteria
{
   Price = 1200,
   MenuItemName = "Salad"
};
var searchResultList = menuRepository.SearchMenus(criteria);
foreach (var menu in searchResultList)
{
   Console.WriteLine($"Menu Name: {menu.MenuName}, Price: {menu.Price} yen");
   foreach (var item in menu.MenuItemList)
   {
       Console.WriteLine($"  Item: {item.MenuItemName}");
   }
}
```

The output will be as follows:

```
■ Search Criteria
Menu Name: Fried Horse Mackerel Set Meal, Price: 1200 yen
  Item: Rice
  Item: Miso Soup
  Item: Fried Horse Mackerel
  Item: Salad
Menu Name: Fried Shrimp Set Meal, Price: 1300 yen
  Item: Rice
  Item: Miso Soup
  Item: Fried Shrimp
  Item: Salad
Menu Name: Pork Cutlet Set Meal, Price: 1250 yen
  Item: Rice
  Item: Miso Soup
  Item: Pork Cutlet
  Item: Salad
```

### Asynchronous Operations

If operations take a long time, asynchronous processing is an option. Below, I'll explain how to implement asynchronous processing.

Implement the data retrieval process from the DB as follows. This alone makes the process asynchronous:

- Use the `ToListAsync` method.
- Prefix the method name with the `async` modifier.
- Set the return type of the method to `Task<DesiredReturnType>`.

Let's look at the sample code:

```cs:MenuRepository.cs
using EntityFrameworkSample.Dtos;
using EntityFrameworkSample.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace EntityFrameworkSample.Repositories
{
    internal class MenuRepository
    {
        SampleContext _context = new SampleContext();

        public async Task<List<Menu>> SelectMenusAsync()
        {
            // Using the Include method allows you to retrieve related table data together
            return await _context.Menu.Include(menu => menu.MenuItemList)
                .ToListAsync();
        }
    }
}
```

Since the return type is now a `Task`, a bit of adjustment is needed in `Program.cs`. Let's look at the sample code:

```cs:Program.cs
using EntityFrameworkSample.Dtos;
using EntityFrameworkSample.Models;
using EntityFrameworkSample.Repositories;

MenuRepository menuRepository = new MenuRepository();

// Retrieval with asynchronous processing
var asyncResultList = menuRepository.SelectMenusAsync();
foreach (var menu in asyncResultList.Result)
{
   Console.WriteLine($"Menu Name: {menu.MenuName}, Price: {menu.Price} yen");
   foreach (var item in menu.MenuItemList)
   {
       Console.WriteLine($"  Item: {item.MenuItemName}");
   }
}
```

Because `MenuRepository#SelectMenusAsync` returns a `Task`, you need to reference the `Result` property to get the data.

### Change Tracking

Entity Framework tracks changes to data retrieved from the DB. Change tracking occurs at the property level, meaning it tracks changes both at the row and column levels.

When you call the `SaveChanges` method, it examines the changes and executes SQL such as Insert, Update, or Delete.

For details, refer to Microsoft's article:

[Change Tracking in EF Core](https://learn.microsoft.com/ja-jp/ef/core/change-tracking)

This means that both the original and current values are kept in memory, which increases memory usage.

Therefore, for read-only data, you have the option to turn off change tracking.

Here is the sample code. It's easy—just call the model's `AsNoTracking` method:

```cs:MenuRepository.cs
using EntityFrameworkSample.Dtos;
using EntityFrameworkSample.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace EntityFrameworkSample.Repositories
{
    internal class MenuRepository
    {
        SampleContext _context = new SampleContext();

        public IList<Menu> SelectMenusAsNoTracking()
        {
            // Using the Include method allows you to retrieve related table data together
            return _context.Menu.AsNoTracking().Include(menu => menu.MenuItemList)
                .ToList();
        }
    }
}
```

```cs:Program.cs
using EntityFrameworkSample.Dtos;
using EntityFrameworkSample.Models;
using EntityFrameworkSample.Repositories;

MenuRepository menuRepository = new MenuRepository();

// Retrieval without tracking
var noTrackingResultList = menuRepository.SelectMenusAsNoTracking();
foreach (var menu in noTrackingResultList)
{
    Console.WriteLine($"Menu Name: {menu.MenuName}, Price: {menu.Price} yen");
    foreach (var item in menu.MenuItemList)
    {
        Console.WriteLine($"  Item: {item.MenuItemName}");
    }
}
```

If you're working with a large number of records or large data (such as audio or video) in a read-only scenario, consider turning off change tracking.

## Conclusion

It's been a while (the last time I used it professionally was about seven years ago), so I revisited Entity Framework and explained the environment setup steps and the code I wrote and ran.

I felt that with development this easy, productivity is bound to increase. The Include method, in particular, is powerful.

I hope you can use this article to improve your C# skills and as a reference for your development projects.
