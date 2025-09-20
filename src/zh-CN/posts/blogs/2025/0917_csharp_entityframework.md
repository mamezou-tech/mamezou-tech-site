---
title: 用 C# 和 Entity Framework 提升生产效率！从基础到实战的彻底解说
author: yoshihiro-tamori
date: 2025-09-17T00:00:00.000Z
tags:
  - dotnet
  - csharp
  - ORマッパー
image: true
translate: true

---

在使用 C# 进行开发时，ORM 映射器里最常用的是 Entity Framework。虽然不可否认 Entity Framework 在理解上有一定难度，但它的开发效率非常高。

此外，自进入 ASP.NET Core 时代后，Entity Framework 也演进为 Entity Framework Core，开发效率进一步提升。

在撰写本文之际，我时隔已久再次使用 Entity Framework，真切感受到开发竟然如此简单。这样一来生产效率应该也会大幅提高。

因此，接下来将配合示例代码，从 Entity Framework 的设置到使用方法进行讲解。

希望本文能为想了解 Entity Framework 用法的人，以及正在考虑在开发项目中引入 Entity Framework 的人提供参考。

## Entity Framework 概述与环境搭建

Entity Framework 是一款 ORM 映射器。可使用 C# 访问 SQL Server、SQLite、MySQL、PostgreSQL、Azure Cosmos DB 等。

与一般 ORM 映射器类似，需要创建与数据库表对应的模型类，然后使用 Entity Framework 提供的 Select、Insert 等方法来操作数据库。

### 安装 Entity Framework

要使用 Entity Framework，需要先进行安装。

如果使用 Visual Studio，请通过 NuGet 安装以下包。本示例使用 SQL Server Express。

- EntityFrameworkCore
- EntityFrameworkCore.SqlServer
- EntityFrameworkCore.Tools

请安装 EntityFrameworkCore。非 Core 版本的 EntityFramework 适用于 .NET v4.x。

如果使用 VSCode，请在项目文件夹中运行以下命令进行安装。

```
dotnet add package Microsoft.EntityFrameworkCore
dotnet add package Microsoft.EntityFrameworkCore.SqlServer
dotnet add package Microsoft.EntityFrameworkCore.Tools
```

如果提示找不到 dotnet 命令，或尚未在 VSCode 中配置好 C# 开发环境，请参考下述文章进行环境搭建。

[VS Code 入门！易学可用的 C# 开发环境搭建【2025 年版手册】](https://developer.mamezou-tech.com/blogs/2025/07/05/csharp_vscode/)

### 安装 SQL Server Express

本示例使用 SQL Server Express。未安装 SQL Server 的请先安装。Microsoft 下载地址如下：

[https://www.microsoft.com/ja-jp/download/details.aspx?id=104781](https://www.microsoft.com/ja-jp/download/details.aspx?id=104781)

接着安装 SQL Server Management Studio。Microsoft 下载地址如下：

[https://learn.microsoft.com/ja-jp/ssms/install/install](https://learn.microsoft.com/ja-jp/ssms/install/install)

安装 Management Studio 后，尝试登录。

服务器名称填写 localhost\sqlexpress，认证类型选择 Windows 身份验证，勾选“信任服务器证书”。

![从 Management Studio 登录 SQL Server Express](/img/dotnet/csharp_entityframework/ManagementStudioLogin.png)

:::info
补充说明，SQL Server 有三种认证方式。  
第一种是使用 Windows 用户登录的 Windows 身份验证；第二种是使用在数据库中注册的用户和密码登录的一般方式，即 SQL Server 验证；第三种是结合两者的混合验证。  
对于本地开发来说，Windows 身份验证最简单。  
:::

## 数据和数据库访问处理准备

### 本文中使用的示例数据

本文将把一家定食店的菜单作为示例数据。数据虽然有很多值得吐槽的地方，但毕竟是示例，请多包涵。

下面列出 CSV 数据。

```csv:menu.csv
menu_id,menu_name,price
1,烤鱼定食,1000
2,炸鸡定食,900
3,生鱼片定食,1200
4,天妇罗定食,1100
5,炸马鲛鱼定食,1100
```

```csv:menu_item.csv
menu_id,menu_item_id,menu_item_name
1,1,米饭
1,2,味噌汤
1,3,盐烤鲑鱼
1,4,泡菜
2,1,米饭
2,2,味噌汤
2,3,炸鸡块
2,4,沙拉
3,1,米饭
3,2,味噌汤
3,3,生鱼片
3,4,泡菜
4,1,米饭
4,2,味噌汤
4,3,天妇罗
4,4,泡菜
5,1,米饭
5,2,味噌汤
5,3,马鲛鱼炸
5,4,沙拉
```

### 示例数据的 DDL

创建用于插入示例数据的表的 DDL 如下。

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

插入示例数据的 SQL 如下。

```sql:insert_date.sql
-- menu
insert into menu values (1, '烤鱼定食', 1000);
insert into menu values (2, '炸鸡定食', 900);
insert into menu values (3, '生鱼片定食', 1200);
insert into menu values (4, '天妇罗定食', 1100);
insert into menu values (5, '炸马鲛鱼定食', 1100);

-- menu_item
insert into menu_item values (1, 1, '米饭');
insert into menu_item values (1, 2, '味噌汤');
insert into menu_item values (1, 3, '盐烤鲑鱼');
insert into menu_item values (1, 4, '泡菜');
insert into menu_item values (2, 1, '米饭');
insert into menu_item values (2, 2, '味噌汤');
insert into menu_item values (2, 3, '炸鸡块');
insert into menu_item values (2, 4, '沙拉');
insert into menu_item values (3, 1, '米饭');
insert into menu_item values (3, 2, '味噌汤');
insert into menu_item values (3, 3, '生鱼片');
insert into menu_item values (3, 4, '泡菜');
insert into menu_item values (4, 1, '米饭');
insert into menu_item values (4, 2, '味噌汤');
insert into menu_item values (4, 3, '天妇罗');
insert into menu_item values (4, 4, '泡菜');
insert into menu_item values (5, 1, '米饭');
insert into menu_item values (5, 2, '味噌汤');
insert into menu_item values (5, 3, '马鲛鱼炸');
insert into menu_item values (5, 4, '沙拉');
```

### Db 上下文和模型

假设在项目根目录下创建一个名为 `Models` 的文件夹，将 Db 上下文和模型放在其中。Db 上下文和模型都可以以 .cs 文件的形式创建。

![放置 Db 上下文和模型的位置](/img/dotnet/csharp_entityframework/SolutionExplorerModels.png)

示例代码如下。

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
            // 设置连接字符串
            // Trusted_Connection=True 是使用 Windows 身份验证的设置
            // 如果在 localhost 开发，这样做很方便
            optionsBuilder.UseSqlServer("Server=localhost\\SQLEXPRESS;Database=SampleDB;Trusted_Connection=True;TrustServerCertificate=Yes;");
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // 使用复合主键时，如果不在这里写出键字段，将无法正确获取数据（会变成0件等）
            modelBuilder.Entity<MenuItem>().HasKey(mi => new { mi.MenuId, mi.MenuItemId });
        }

        // 为要访问的每个表编写模型
        public DbSet<Menu> Menu { get; set; }
        public DbSet<MenuItem> MenuItem { get; set; }
    }
}
```

这里假设是在本地环境进行运行确认，所以在连接字符串中使用了 Windows 身份验证。

如果存在使用复合主键的表，需要在 `OnModelCreating` 方法中写出键字段。否则 Entity Framework 无法识别复合主键，会导致无法正确获取数据，请注意。

下面也介绍一下 Db 上下文的使用方法。

在编写数据库访问处理的类中，如下所示使用 Db 上下文来访问模型，进行 CRUD 操作。

```cs
internal class MenuRepository
{
    SampleContext _context = new SampleContext();

    public IList<Menu> SelectMenus()
    {
        // 使用 Include 方法可以同时获取关联表的数据
        return _context.Menu.Include(menu => menu.MenuItemList)
            .ToList();
    }
}
```

接下来列出模型的代码。

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

在此说明一个注意点。

实际上，Entity Framework 在将数据库表和模型映射时，并不是根据模型的类名，而是根据 Db 上下文中写的属性名来映射。

用示例代码说明如下：

```cs:SampleContext.csを一部抜粋
// 这会与名为 menu 的表映射
public DbSet<Menu> Menu { get; set; }
// 这会与名为 menuitem 的表映射
public DbSet<MenuItem> MenuItem { get; set; }
// 这会与名为 menu_item 的表映射（实际上在属性名中使用下划线是不推荐的）
public DbSet<MenuItem> Menu_Item { get; set; }
```

如果表名不包含下划线，例如表名为 `menu` 且模型名为 `Menu` 时，属性名也会设为 `Menu`，因此很少成为问题。

但是对于像 `menu_item` 这样名称中包含下划线的表，需要多加注意。如果将属性名设置为 `MenuItem`，就会出现类似 “对象名 'MenuItem' 无效” 的运行时异常。

因为 Entity Framework 会去查找名为 `menuitem` 的表。

![模型名与 Entity Framework 映射](/img/dotnet/csharp_entityframework/ModelMappingError.png)

如果在属性名中添加下划线，改为 `Menu_Item`，异常就不会发生。

但是在 C# 的命名规范中，属性名中不得使用下划线，因此需要使用 `Table` 注解来指定表名。

```cs:Tableアノテーションを使う例
[Table("menu_item")]
internal class MenuItem
```

## 基本操作

### Select 操作

首先从 Select 操作开始。

首先，创建一个从数据库获取数据的处理。在项目根目录下新建名为 `Repositories` 的文件夹，然后创建名为 `MenuRepository.cs` 的数据库访问处理文件。

![放置数据库访问处理的位置](/img/dotnet/csharp_entityframework/SolutionExplorerRepositories.png)

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
            // 使用 Include 方法可以同时获取关联表的数据
            return _context.Menu.Include(menu => menu.MenuItemList)
                .ToList();
        }
    }
}
```

这里补充一点，如果需要对表进行连接，虽然可以使用 LINQ 进行 JOIN，但使用 `Include` 方法要轻松得多。只需这一个方法就能获取与连接表键匹配的数据，这种简单度令人震撼。

如果在使用 `Include` 方法时无法正确获取连接表的值，请检查以下位置是否有书写错误或遗漏：
- 模型的 `Table` 注解
- 模型的 `Column` 注解
- Db 上下文的 `OnModelCreating` 方法

在 `Program.cs` 中调用 `MenuRepository#SelectMenus` 并执行。

```cs:Program.cs
using EntityFrameworkSample.Dtos;
using EntityFrameworkSample.Models;
using EntityFrameworkSample.Repositories;

MenuRepository menuRepository = new MenuRepository();

// Select 的示例
var menus = MenuRepository.SelectMenus();
foreach (var menu in menus)
{
    Console.WriteLine($"菜单名: {menu.MenuName}, 价格: {menu.Price}日元");
    foreach (var item in menu.MenuItemList)
    {
        Console.WriteLine($"  项目: {item.MenuItemName}");
    }
}
```

执行结果如下所示。

```
菜单名: 烤鱼定食, 价格: 1000日元
  项目: 米饭
  项目: 味噌汤
  项目: 盐烤鲑鱼
  项目: 泡菜
菜单名: 炸鸡定食, 价格: 900日元
  项目: 米饭
  项目: 味噌汤
  项目: 炸鸡块
  项目: 沙拉
菜单名: 生鱼片定食, 价格: 1200日元
  项目: 米饭
  项目: 味噌汤
  项目: 生鱼片
  项目: 泡菜
菜单名: 天妇罗定食, 价格: 1100日元
  项目: 米饭
  项目: 味噌汤
  项目: 天妇罗
  项目: 泡菜
菜单名: 炸马鲛鱼定食, 价格: 1100日元
  项目: 米饭
  项目: 味噌汤
  项目: 马鲛鱼炸
  项目: 沙拉
```

### Insert 操作

Insert 操作非常简单。只需使用 Db 上下文将对象添加到模型即可。

这里以添加一条天妇罗盖饭作为新菜单的示例。

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
            // 添加新菜单
            _context.Menu.Add(menu);
            _context.SaveChanges();
        }
    }
}
```

在 `Program.cs` 中调用 `MenuRepository#InsertMenu` 并执行。

```cs:Program.cs
using EntityFrameworkSample.Dtos;
using EntityFrameworkSample.Models;
using EntityFrameworkSample.Repositories;

MenuRepository menuRepository = new MenuRepository();

// Create 的示例
var newMenu = new Menu
{
    MenuId = 6,
    MenuName = "天妇罗盖饭",
    Price = 1000,
    MenuItemList = new List<MenuItem>
    {
       new MenuItem { MenuId = 6, MenuItemId = 1, MenuItemName = "天妇罗盖饭" },
       new MenuItem { MenuId = 6, MenuItemId = 2, MenuItemName = "味噌汤" },
       new MenuItem { MenuId = 6, MenuItemId = 3, MenuItemName = "泡菜" }
    }
};
MenuRepository.InsertMenu(newMenu);
```

在 Management Studio 中确认数据库，如果出现以下新增的 3 条记录，则表示成功。

![使用 Entity Framework 执行 Insert 操作示例的结果](/img/dotnet/csharp_entityframework/CreateResult.png)

### Update 操作

Update 操作同样简单。只需使用 Db 上下文的 `Update` 方法。

这里以将炸鸡定食的味噌汤改为猪肉汤，并将价格提高 50 日元为例。

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
            // 获取指定 ID 的菜单
            return _context.Menu.Include(menu => menu.MenuItemList).Where(menu => menu.MenuId == menuId)
                .FirstOrDefault();
        }

        public void UpdateMenu(Menu menu)
        {
            // 更新现有菜单
            _context.Menu.Update(menu);
            _context.SaveChanges();
        }
    }
}
```

在 `Program.cs` 中先调用 `MenuRepository#SelectMenuById` 获取更新对象，然后修改值后调用 `MenuRepository#UpdateMenu` 将更新反映到数据库。代码编写完成后执行。

```cs:Program.cs
using EntityFrameworkSample.Dtos;
using EntityFrameworkSample.Models;
using EntityFrameworkSample.Repositories;

MenuRepository menuRepository = new MenuRepository();

// Update 的示例
// 获取炸鸡定食
var targetMenu = MenuRepository.SelectMenuById(2);
if (targetMenu != null)
{
   // 将味噌汤改为猪肉汤，并提高 50 日元（900日元→950日元）
   targetMenu.Price = 950;
   targetMenu.MenuItemList.Where(item => item.MenuItemName == "味噌汤")
       .ToList()
       .ForEach(item => item.MenuItemName = "猪肉汤");
   MenuRepository.UpdateMenu(targetMenu);
}
```

在 Management Studio 中确认数据库，如果出现以下更新结果，则表示成功。

![使用 Entity Framework 执行 Update 操作示例的结果](/img/dotnet/csharp_entityframework/UpdateResult.png)

### Delete 操作

Delete 操作同样简单。只需使用 Db 上下文的 `Remove` 方法。

这里以删除在 Insert 示例中添加的天妇罗盖饭为例。虽然定食屋开始提供盖饭类，但似乎并不受欢迎，销量不佳。

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
            // 删除菜单
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

在 `Program.cs` 中调用 `MenuRepository#DeleteMenu` 并执行。

```cs:Program.cs
using EntityFrameworkSample.Dtos;
using EntityFrameworkSample.Models;
using EntityFrameworkSample.Repositories;

MenuRepository menuRepository = new MenuRepository();

// Delete 的示例
// 删除天妇罗盖饭
MenuRepository.DeleteMenu(6);
```

在 Management Studio 中确认数据库，如果无法查询到天妇罗盖饭的数据，则表示成功。

![使用 Entity Framework 执行 Delete 操作示例的结果](/img/dotnet/csharp_entityframework/DeleteResult.png)

## 实践操作

### 批量 Insert 操作

首先尝试将多条数据一次性插入到数据库。

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
            // 一次性添加多条菜单记录
            _context.Menu.AddRange(menus);
            _context.SaveChanges();
        }
    }
}
```

当仅插入一条记录时使用 `Add` 方法添加到模型，而当想插入多条数据时，可使用 `AddRange` 方法。其参数可直接传入 `List`，无需特意使用 `foreach` 一条条地调用 `Add`。

在 `Program.cs` 中调用 `MenuRepository#InsertManyMenus` 并执行。

```cs:Program.cs
using EntityFrameworkSample.Dtos;
using EntityFrameworkSample.Models;
using EntityFrameworkSample.Repositories;

MenuRepository menuRepository = new MenuRepository();

// InsertMany 的示例
var newMenuList = new List<Menu>
{
   new Menu
   {
       MenuId = 7,
       MenuName = "煮鱼定食",
       Price = 1000,
       MenuItemList = new List<MenuItem>
       {
           new MenuItem { MenuId = 7, MenuItemId = 1, MenuItemName = "米饭"},
           new MenuItem { MenuId = 7, MenuItemId = 2, MenuItemName = "味噌汤"},
           new MenuItem { MenuId = 7, MenuItemId = 3, MenuItemName = "炖鱼"},
           new MenuItem { MenuId = 7, MenuItemId = 4, MenuItemName = "泡菜"}
       }
   },
   new Menu
   {
       MenuId = 8,
       MenuName = "炸虾排定食",
       Price = 1300,
       MenuItemList = new List<MenuItem>
       {
           new MenuItem { MenuId = 8, MenuItemId = 1, MenuItemName = "米饭"},
           new MenuItem { MenuId = 8, MenuItemId = 2, MenuItemName = "味噌汤"},
           new MenuItem { MenuId = 8, MenuItemId = 3, MenuItemName = "炸虾排"},
           new MenuItem { MenuId = 8, MenuItemId = 4, MenuItemName = "沙拉"}
       }
   },
   new Menu
   {
       MenuId = 9,
       MenuName = "炸猪排定食",
       Price = 1250,
       MenuItemList = new List<MenuItem>
       {
           new MenuItem { MenuId = 9, MenuItemId = 1, MenuItemName = "米饭"},
           new MenuItem { MenuId = 9, MenuItemId = 2, MenuItemName = "味噌汤"},
           new MenuItem { MenuId = 9, MenuItemId = 3, MenuItemName = "炸猪排"},
           new MenuItem { MenuId = 9, MenuItemId = 4, MenuItemName = "沙拉"}
       }
   }
};
MenuRepository.InsertManyMenus(newMenuList);
```

在 Management Studio 中确认数据库，如果能查询到以下 3 条定食记录，则表示成功。

![使用 Entity Framework 批量插入数据示例的结果](/img/dotnet/csharp_entityframework/InsertManyResult.png)

### 批量 Update 操作

接下来尝试将多条数据一次性更新。

这里以考虑到近期物价上涨，对菜单进行涨价为例。

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
            // 使用 Include 方法可以同时获取关联表的数据
            return _context.Menu.Include(menu => menu.MenuItemList)
                .ToList();
        }

        public void UpdateManyMenus(IList<Menu> menus)
        {
            // 一次性更新多条菜单记录
            _context.Menu.UpdateRange(menus);
            _context.SaveChanges();
        }
    }
}
```

使用 `UpdateRange` 方法进行批量更新。与 Insert 时类似，Update 时也提供了可将多条数据打包传入的 `List` 方法。

在 `Program.cs` 中调用 `MenuRepository#SelectMenus` 获取列表并修改价格，然后调用 `MenuRepository#UpdateManyMenus` 并执行。

```cs:Program.cs
using EntityFrameworkSample.Dtos;
using EntityFrameworkSample.Models;
using EntityFrameworkSample.Repositories;

MenuRepository menuRepository = new MenuRepository();

// UpdateMany 的示例
var targetList = MenuRepository.SelectMenus();
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
MenuRepository.UpdateManyMenus(targetList);
```

在 Management Studio 中确认数据库，如果价格如图所示已更新，则表示成功。

![使用 Entity Framework 批量更新数据示例的结果](/img/dotnet/csharp_entityframework/UpdateManyResult.png)

### 根据搜索界面输入内容进行处理

接下来尝试编写在搜索界面根据输入条件进行查询的处理。关键点在于仅将已输入的项作为查询条件。

首先创建查询条件类。在项目根目录下新建名为 `Dtos` 的文件夹，并创建 `MenuSearchCriteria` 类。

![放置查询条件类的位置](/img/dotnet/csharp_entityframework/SolutionExplorerDtos.png)

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
        // 菜单名（部分匹配）
        public string? MenuName { get; set; } = string.Empty;
        // 价格（含以上）
        public decimal? Price { get; set; }
        // 菜单项名称（部分匹配）
        public string? MenuItemName { get; set; } = string.Empty;
    }
}
```

然后在 `MenuRepository` 中，如下根据各查询条件项是否有值来调用 `Where` 方法进行筛选。

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
            // 编写获取数据的查询，但不调用 ToList 方法时不会发送 SQL
            var resultList = _context.Menu.Include(menu => menu.MenuItemList).AsQueryable();
            // 如果查询条件已输入，则进行筛选
            // 菜单名
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
                // 按菜单列表 → 菜单项列表的顺序使用 Lambda 表达式访问
                // 如果菜单项名称中包含任意一条查询条件“菜单项名称”，则将其作为目标
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

这里的关键在于，最初获取数据时不会发送 SQL，随后调用 `Where` 方法筛选时也不会发送 SQL。只有在执行最后的 `ToList` 方法时才会发送 SQL。

如果在最初获取数据或添加查询条件时就执行了 SQL，会增加对数据库的 I/O，导致性能大幅下降。数据量在数十到数百条时可能不会太在意，但一旦达到数万条，就会明显拉长处理时间，无法忽视。

将这种在执行 `ToList` 方法之前都不发送 SQL 的机制称为延迟执行。详情请参见以下 LINQ 文章中的 “LINQ 的注意点”。

[实战不迷路！带示例代码的 C# LINQ 全面攻略](https://developer.mamezou-tech.com/blogs/2025/07/28/csharp_linq/#linq%E3%81%AE%E6%B3%A8%E6%84%8F%E7%82%B9)

最后修改 `Program.cs`，调用 `MenuRepository#SearchMenus` 并执行。这里以价格在 1200 以上且菜单项包含沙拉的菜单为例进行查询。

```cs:Program.cs
using EntityFrameworkSample.Dtos;
using EntityFrameworkSample.Models;
using EntityFrameworkSample.Repositories;

MenuRepository menuRepository = new MenuRepository();

// 搜索功能的示例
MenuSearchCriteria criteria = new MenuSearchCriteria
{
   Price = 1200,
   MenuItemName = "沙拉"
};
var searchResultList = MenuRepository.SearchMenus(criteria);
foreach (var menu in searchResultList)
{
   Console.WriteLine($"菜单名: {menu.MenuName}, 价格: {menu.Price}日元");
   foreach (var item in menu.MenuItemList)
   {
       Console.WriteLine($"  项目: {item.MenuItemName}");
   }
}
```

执行结果如下所示。

```
■ 查询条件
菜单名: 炸马鲛鱼定食, 价格: 1200日元
  项目: 米饭
  项目: 味噌汤
  项目: 马鲛鱼炸
  项目: 沙拉
菜单名: 炸虾排定食, 价格: 1300日元
  项目: 米饭
  项目: 味噌汤
  项目: 炸虾排
  项目: 沙拉
菜单名: 炸猪排定食, 价格: 1250日元
  项目: 米饭
  项目: 味噌汤
  项目: 炸猪排
  项目: 沙拉
```

### 异步处理

当处理时间较长时，使用异步处理也是一种手段。因此也介绍异步处理的实现方法。

如下实现从数据库获取数据的处理。仅此即可实现异步处理。

- 使用 `ToListAsync` 方法。  
- 在方法名前添加 `async` 修饰符。  
- 将方法的返回类型设为 `Task<所需的返回类型>`。  

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
            // 使用 Include 方法可以同时获取关联表的数据
            return await _context.Menu.Include(menu => menu.MenuItemList)
                .ToListAsync();
        }
    }
}
```

由于返回类型变为 `Task`，对 `Program.cs` 也需要做一些处理。看下面示例代码。

```cs:Program.cs
using EntityFrameworkSample.Dtos;
using EntityFrameworkSample.Models;
using EntityFrameworkSample.Repositories;

MenuRepository menuRepository = new MenuRepository();

// 异步方式获取
var asyncResultList = MenuRepository.SelectMenusAsync();
foreach (var menu in asyncResultList.Result)
{
    Console.WriteLine($"菜单名: {menu.MenuName}, 价格: {menu.Price}日元");
    foreach (var item in menu.MenuItemList)
    {
        Console.WriteLine($"  项目: {item.MenuItemName}");
    }
}
```

### 变更追踪

Entity Framework 会追踪从数据库获取的数据的更改。更改追踪是属性级别的，也就是说会追踪行和列的变更。

在调用 `SaveChanges` 方法时，会检查更改内容并执行 Insert、Update、Delete 等 SQL。

详情请参见 Microsoft 文章。

[EF Core 中的变更追踪](https://learn.microsoft.com/ja-jp/ef/core/change-tracking)

也就是说，因为要在内存中同时保存更改前和当前的值，会增加内存负担。

因此对于只读数据，也可以考虑将更改追踪关闭。

以下示例代码，仅需调用模型的 `AsNoTracking` 方法即可，非常简单。

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
            // 使用 Include 方法可以同时获取关联表的数据
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

// 无追踪方式获取
var noTrackingResultList = MenuRepository.SelectMenusAsNoTracking();
foreach (var menu in noTrackingResultList)
{
    Console.WriteLine($"菜单名: {menu.MenuName}, 价格: {menu.Price}日元");
    foreach (var item in menu.MenuItemList)
    {
        Console.WriteLine($"  项目: {item.MenuItemName}");
    }
}
```

当数据量较多或容量较大的数据（如音频、视频等）以只读方式使用时，可考虑关闭更改追踪。

## 最后说明

时隔多年（上一次用大概还是 7 年前的工作中），再次体验了 Entity Framework，讲解了当时搭建环境的步骤以及编写并运行的代码。

如果能如此轻松地进行开发，生产力肯定也会大幅提升。尤其是 Include 方法非常强大。

希望本文能在提升 C# 技能或作为开发项目参考方面对您有所帮助。
