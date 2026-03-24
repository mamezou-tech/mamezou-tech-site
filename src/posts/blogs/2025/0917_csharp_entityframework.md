---
title: C#とEntity Frameworkで生産性アップ！基本から実践まで徹底解説
author: yoshihiro-tamori
date: 2025-09-17
tags: [dotnet, csharp, ORマッパー]
image: true
---

C#で開発する場合、ORマッパーはEntity Frameworkが定番です。Entity Frameworkは理解が多少難しい点は否めないですが、開発効率が高いという特徴があります。

さらにはASP.NET Coreの時代となってから、Entity FrameworkもEntity Framework Coreとなり、さらに開発効率が上がりました。

今回の記事を書くにあたって久々にEntity Frameworkを使ってみたのですが、驚くほど簡単に開発できると実感しました。これなら生産性も大幅に向上しそうです。

そんなわけでEntity Frameworkのセットアップから使い方まで、サンプルコードとともに解説します。

Entity Frameworkの使い方を知りたい方はもちろん、開発プロジェクトにEntity Frameworkの導入を検討している方にも参考になれば幸いです。

## Entity Frameworkの概要と環境構築

Entity FrameworkはORマッパーです。C#を使用してSQL ServerやSQLite、MySQL、PostgreSQL、Azure Cosmos DBなどにアクセスできます。

一般的なORマッパー同様に、DBのテーブルに対応するモデルクラスを作成し、Entity Frameworkが用意しているSelectやInsertなどのメソッドを使用してDBを操作します。

### Entity Frameworkのインストール

Entity Frameworkを使用するためには、インストールを行う必要があります。

Visual Studioをお使いの場合はNuGetから以下をインストールしてください。なお今回のサンプルではSQL Server Expressを使用しております。

- EntityFrameworkCore
- EntityFrameworkCore.SqlServer
- EntityFrameworkCore.Tools

EntityFrameworkCoreをインストールしてください。Coreじゃない方のEntityFrameworkは.NET v4.x用です。

VSCodeをお使いの場合は、プロジェクトのフォルダに移動してから以下のコマンドを打ってインストールしてください。

```
dotnet add package Microsoft.EntityFrameworkCore
dotnet add package Microsoft.EntityFrameworkCore.SqlServer
dotnet add package Microsoft.EntityFrameworkCore.Tools
```

dotnetコマンドが見つからないなど、VSCodeでC#の開発環境ができていない場合は、こちらの記事を参考に環境構築してください。

[VS Codeで始める！わかる＆できるC#開発環境の構築【2025年版マニュアル】](https://developer.mamezou-tech.com/blogs/2025/07/05/csharp_vscode/)

### SQL Server Expressのインストール

今回のサンプルではSQL Server Expressを使用します。SQL Serverをインストールしていない方はインストールしてください。Microsoftのダウンロードサイトはこちらです。

[https://www.microsoft.com/ja-jp/download/details.aspx?id=104781](https://www.microsoft.com/ja-jp/download/details.aspx?id=104781)

続いてSQL Server Management Studioをインストールします。Microsoftのダウンロードサイトはこちらです。

[https://learn.microsoft.com/ja-jp/ssms/install/install](https://learn.microsoft.com/ja-jp/ssms/install/install)

Management Studioをインストールしたらログインしてみましょう。

サーバ名はlocalhost\sqlexpress、認証の種類はWindows認証、サーバ証明書を信用するにチェックを付けてください。

![Management StudioからSQL Server Expressにログインする](/img/dotnet/csharp_entityframework/ManagementStudioLogin.png)

:::info
補足ですがSQL Serverの認証方式は3種類あります。
1つ目がWindowsのユーザでログインするWindows認証、2つ目がDBに登録したユーザとパスワードでログインする一般的な方式であるSQL Server認証、3つ目が両者を使う混合認証です。
ローカルでの開発ならWindows認証が簡単です。
:::

## データとDBアクセス処理の準備

### この記事で扱うサンプルデータ

この記事では定食屋のメニューをサンプルデータとして扱います。突っ込みどころの多いデータですが、サンプルですのでご容赦ください。

CSVデータを掲載します。

```csv:menu.csv
menu_id,menu_name,price
1,焼き魚定食,1000
2,唐揚げ定食,900
3,刺身定食,1200
4,天ぷら定食,1100
5,アジフライ定食,1100
```

```csv:menu_item.csv
menu_id,menu_item_id,menu_item_name
1,1,ご飯
1,2,みそ汁
1,3,鮭の塩焼き
1,4,漬物
2,1,ご飯
2,2,みそ汁
2,3,鳥の唐揚げ
2,4,サラダ
3,1,ご飯
3,2,みそ汁
3,3,刺身
3,4,漬物
4,1,ご飯
4,2,みそ汁
4,3,天ぷら
4,4,漬物
5,1,ご飯
5,2,みそ汁
5,3,アジフライ
5,4,サラダ
```

### サンプルデータのDDL

サンプルデータを投入するテーブルを作成するDDLは以下です。

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

サンプルデータを投入するSQLは以下です。

```sql:insert_date.sql
-- menu
insert into menu values (1, '焼き魚定食', 1000);
insert into menu values (2, '唐揚げ定食', 900);
insert into menu values (3, '刺身定食', 1200);
insert into menu values (4, '天ぷら定食', 1100);
insert into menu values (5, 'アジフライ定食', 1100);

-- menu_item
insert into menu_item values (1, 1, 'ご飯');
insert into menu_item values (1, 2, 'みそ汁');
insert into menu_item values (1, 3, '鮭の塩焼き');
insert into menu_item values (1, 4, '漬物');
insert into menu_item values (2, 1, 'ご飯');
insert into menu_item values (2, 2, 'みそ汁');
insert into menu_item values (2, 3, '鳥の唐揚げ');
insert into menu_item values (2, 4, 'サラダ');
insert into menu_item values (3, 1, 'ご飯');
insert into menu_item values (3, 2, 'みそ汁');
insert into menu_item values (3, 3, '刺身');
insert into menu_item values (3, 4, '漬物');
insert into menu_item values (4, 1, 'ご飯');
insert into menu_item values (4, 2, 'みそ汁');
insert into menu_item values (4, 3, '天ぷら');
insert into menu_item values (4, 4, '漬物');
insert into menu_item values (5, 1, 'ご飯');
insert into menu_item values (5, 2, 'みそ汁');
insert into menu_item values (5, 3, 'アジフライ');
insert into menu_item values (5, 4, 'サラダ');
```

### Dbコンテキストとモデル

プロジェクト直下に`Models`というフォルダを作成し、その中にDbコンテキストとモデルを配置する想定で進めます。Dbコンテキスト、モデルともにcsファイルとして作成すればよいです。

![Dbコンテキストとモデルを配置する場所](/img/dotnet/csharp_entityframework/SolutionExplorerModels.png)

コードを掲載します。

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
            // 接続文字列を設定
            // Trusted_Connection=TrueはWindows認証を使用するための設定
            // localhostで開発するならこれが楽
            optionsBuilder.UseSqlServer("Server=localhost\\SQLEXPRESS;Database=SampleDB;Trusted_Connection=True;TrustServerCertificate=Yes;");
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // 複合主キーを使う場合、ここでキー項目を記述しないとデータを正しく取得できない（0件になるなど）
            modelBuilder.Entity<MenuItem>().HasKey(mi => new { mi.MenuId, mi.MenuItemId });
        }

        // アクセスしたいテーブルの分だけモデルを記述する
        public DbSet<Menu> Menu { get; set; }
        public DbSet<MenuItem> MenuItem { get; set; }
    }
}
```

ここではローカル環境での動作確認を前提として、Windows認証を使うように接続文字列に記述しています。

複合主キーを使うテーブルがある場合、`OnModelCreating`メソッドにキー項目を記述します。こうしないと複合主キーであることをEntity Frameworkが理解できないため、データを正しく取得できないので気を付けてください。

Dbコンテキストの使い方についても解説します。

DBアクセス処理を記述するクラスに以下のように記述して使います。Dbコンテキストからモデルにアクセスすることで、CRUD操作をします。

```cs
internal class MenuRepository
    {
        SampleContext _context = new SampleContext();

        public IList<Menu> SelectMenus()
        {
            // Includeメソッドを使えば、関連するテーブルのデータも一緒に取得できる
            return _context.Menu.Include(menu => menu.MenuItemList)
                .ToList();
        }
    }
```

続いてモデルのコードを掲載します。

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

ここで1つ注意点を解説しておきます。

実はEntity FrameworkがDBのテーブルとモデルをマッピングするとき、モデルのクラス名ではなくDbコンテキストに書かれたプロパティ名でマッピングしています。

サンプルコードで解説すると以下のようになります。

```cs:SampleContext.csを一部抜粋
// これはmenuという名前のテーブルとマッピングされる
public DbSet<Menu> Menu { get; set; }
// これはmenuitemという名前のテーブルとマッピングされる
public DbSet<MenuItem> MenuItem { get; set; }
// これはmenu_itemという名前のテーブルとマッピングされる（本当はプロパティにアンダースコアを入れることはNG）
public DbSet<MenuItem> Menu_Item { get; set; }
```

テーブル名にアンダースコアを含まない場合、例えばテーブル名が`menu`でモデル名が`Menu`の場合は、プロパティ名も`Menu`にするでしょうから問題になりにくいです。

しかし`menu_item`テーブルのように、名前にアンダースコアを含むテーブルは注意が必要です。プロパティ名を`MenuItem`にしてしまうと「オブジェクト名'MenuItem'が無効です」のような実行時例外が出ます。

Entity Frameworkが`menuitem`という名前のテーブルを探してしまうのです。

![モデル名とEntity Frameworkによるマッピング](/img/dotnet/csharp_entityframework/ModelMappingError.png)

プロパティ名にアンダースコアを入れて`Menu_Item`にすれば、例外は発生しなくなります。

しかしC#の命名規則ではプロパティ名にアンダースコアを入れることがNGですので、`Table`アノテーションを使って、テーブル名を指定する必要があります。

```cs:Tableアノテーションを使う例
[Table("menu_item")]
internal class MenuItem
```

## 基本的な操作

### Select処理

最初にSelect処理からやっていきましょう。

まずはDBからデータを取得する処理を作成しましょう。プロジェクト直下に`Repositories`というフォルダを作成し、`MenuRepository.cs`というDBアクセス処理を作成する想定で進めます。

![DBアクセス処理を配置する場所](/img/dotnet/csharp_entityframework/SolutionExplorerRepositories.png)

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
            // Includeメソッドを使えば、関連するテーブルのデータも一緒に取得できる
            return _context.Menu.Include(menu => menu.MenuItemList)
                .ToList();
        }
    }
}
```

ここで1つ補足しておきます。テーブルの結合が必要な場合、LINQでJOINを行ってもよいのですが、`Include`メソッドを使う方が圧倒的に楽です。これ1つで結合先のテーブルのキーが一致するデータを取得してくれます。この楽さは衝撃的です。

`Include`メソッドで結合先テーブルの値を正しく取得できない場合は、以下の個所に記述ミスや記述漏れがないか確認してください。
- モデルの`Table`アノテーション
- モデルの`Column`アノテーション
- Dbコンテキストの`OnModelCreating`メソッド

`Program.cs`から`MenuRepository#SelectMenus`を呼び出すように記述して実行しましょう。

```cs:Program.cs
using EntityFrameworkSample.Dtos;
using EntityFrameworkSample.Models;
using EntityFrameworkSample.Repositories;

MenuRepository menuRepository = new MenuRepository();

// Selectのサンプル
var menus = MenuRepository.SelectMenus();
foreach (var menu in menus)
{
    Console.WriteLine($"メニュー名: {menu.MenuName}, 価格: {menu.Price}円");
    foreach (var item in menu.MenuItemList)
    {
        Console.WriteLine($"  品目: {item.MenuItemName}");
    }
}
```

実行結果は以下のようになります。

```
メニュー名: 焼き魚定食, 価格: 1000円
  品目: ご飯
  品目: みそ汁
  品目: 鮭の塩焼き
  品目: 漬物
メニュー名: 唐揚げ定食, 価格: 900円
  品目: ご飯
  品目: みそ汁
  品目: 鳥の唐揚げ
  品目: サラダ
メニュー名: 刺身定食, 価格: 1200円
  品目: ご飯
  品目: みそ汁
  品目: 刺身
  品目: 漬物
メニュー名: 天ぷら定食, 価格: 1100円
  品目: ご飯
  品目: みそ汁
  品目: 天ぷら
  品目: 漬物
メニュー名: アジフライ定食, 価格: 1100円
  品目: ご飯
  品目: みそ汁
  品目: アジフライ
  品目: サラダ
```

### Insert処理

Insert処理はとても簡単です。Dbコンテキストを使って、モデルにオブジェクトを追加するだけです。

ここでは例として、天丼を新メニューとして追加します。

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
            // 新しいメニューを追加する
            _context.Menu.Add(menu);
            _context.SaveChanges();
        }
    }
}
```

`Program.cs`から`MenuRepository#InsertMenu`を呼び出すように記述して実行しましょう。

```cs:Program.cs
using EntityFrameworkSample.Dtos;
using EntityFrameworkSample.Models;
using EntityFrameworkSample.Repositories;

MenuRepository menuRepository = new MenuRepository();

// Createのサンプル
var newMenu = new Menu
{
    MenuId = 6,
    MenuName = "天丼",
    Price = 1000,
    MenuItemList = new List<MenuItem>
    {
       new MenuItem { MenuId = 6, MenuItemId = 1, MenuItemName = "天丼" },
       new MenuItem { MenuId = 6, MenuItemId = 2, MenuItemName = "みそ汁" },
       new MenuItem { MenuId = 6, MenuItemId = 3, MenuItemName = "漬物" }
    }
};
MenuRepository.InsertMenu(newMenu);
```

Management StudioからDBを確認し、以下のように3件追加されていればOKです。

![Entity FrameworkでInsertするサンプルの実行結果](/img/dotnet/csharp_entityframework/CreateResult.png)

### Update処理

Update処理も簡単です。Dbコンテキストを使って、モデルの`Update`メソッドを使うだけです。

ここでは例として、唐揚げ定食の味噌汁を豚汁に変え、価格も50円上げます。

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
            // 特定のIDのメニューを取得する
            return _context.Menu.Include(menu => menu.MenuItemList).Where(menu => menu.MenuId == menuId)
                .FirstOrDefault();
        }

        public void UpdateMenu(Menu menu)
        {
            // 既存のメニューを更新する
            _context.Menu.Update(menu);
            _context.SaveChanges();
        }
    }
}
```

`Program.cs`ではまず`MenuRepository#SelectMenuById`を呼び出して更新対象を取得します。そして値を変更してから`MenuRepository#UpdateMenu`を呼び出してDBに反映します。コードが書けたら実行しましょう。

```cs:Program.cs
using EntityFrameworkSample.Dtos;
using EntityFrameworkSample.Models;
using EntityFrameworkSample.Repositories;

MenuRepository menuRepository = new MenuRepository();

// Updateのサンプル
// 唐揚げ定食を取得
var targetMenu = MenuRepository.SelectMenuById(2);
if (targetMenu != null)
{
   // みそ汁を豚汁に変える代わりに50円値上げする（900円→950円）
   targetMenu.Price = 950;
   targetMenu.MenuItemList.Where(item => item.MenuItemName == "みそ汁")
       .ToList()
       .ForEach(item => item.MenuItemName = "豚汁");
   MenuRepository.UpdateMenu(targetMenu);
}
```

Management StudioからDBを確認し、以下のように更新されていればOKです。

![Entity FrameworkでUpdateするサンプルの実行結果](/img/dotnet/csharp_entityframework/UpdateResult.png)

### Delete処理

Delete処理も簡単です。Dbコンテキストを使って、モデルの`Remove`メソッドを使うだけです。

ここでは例として、先ほどInsertの例で追加した天丼を削除します。定食屋が丼ものを始めても、あまり人気が出なくて売れ行きがよくなかったようです。

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
            // メニューを削除する
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

`Program.cs`から`MenuRepository#DeleteMenu`を呼び出すように記述して実行しましょう。

```cs:Program.cs
using EntityFrameworkSample.Dtos;
using EntityFrameworkSample.Models;
using EntityFrameworkSample.Repositories;

MenuRepository menuRepository = new MenuRepository();

// Deleteのサンプル
// 天丼を削除する
MenuRepository.DeleteMenu(6);
```

Management StudioからDBを確認し、以下のように天丼が取得できなければOKです。

![Entity FrameworkでDeleteするサンプルの実行結果](/img/dotnet/csharp_entityframework/DeleteResult.png)

## 実践的な操作

### 複数件のInsert処理

まずは複数件のデータをまとめてDBにInsertしてみましょう。

ここでは例として定食メニューを3件追加します。

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
            // 複数のメニューを一度に追加する
            _context.Menu.AddRange(menus);
            _context.SaveChanges();
        }
    }
}
```

1件だけInsertするときは`Add`メソッドでモデルに追加しましたが、複数件のデータをInsertしたいときは`AddRange`メソッドを使えばいいです。しかも引数は`List`をそのまま渡せます。わざわざ`foreach`で1件ずつ処理して1件ずつ`Add`する必要はないです。

続いて`Program.cs`から`MenuRepository#InsertManyMenus`を呼び出すように記述して実行しましょう。

```cs:Program.cs
using EntityFrameworkSample.Dtos;
using EntityFrameworkSample.Models;
using EntityFrameworkSample.Repositories;

MenuRepository menuRepository = new MenuRepository();

// InsertManyのサンプル
var newMenuList = new List<Menu>
{
   new Menu
   {
       MenuId = 7,
       MenuName = "煮魚定食",
       Price = 1000,
       MenuItemList = new List<MenuItem>
       {
           new MenuItem { MenuId = 7, MenuItemId = 1, MenuItemName = "ご飯"},
           new MenuItem { MenuId = 7, MenuItemId = 2, MenuItemName = "みそ汁"},
           new MenuItem { MenuId = 7, MenuItemId = 3, MenuItemName = "魚の煮付け"},
           new MenuItem { MenuId = 7, MenuItemId = 4, MenuItemName = "漬物"}
       }
   },
   new Menu
   {
       MenuId = 8,
       MenuName = "エビフライ定食",
       Price = 1300,
       MenuItemList = new List<MenuItem>
       {
           new MenuItem { MenuId = 8, MenuItemId = 1, MenuItemName = "ご飯"},
           new MenuItem { MenuId = 8, MenuItemId = 2, MenuItemName = "みそ汁"},
           new MenuItem { MenuId = 8, MenuItemId = 3, MenuItemName = "エビフライ"},
           new MenuItem { MenuId = 8, MenuItemId = 4, MenuItemName = "サラダ"}
       }
   },
   new Menu
   {
       MenuId = 9,
       MenuName = "とんかつ定食",
       Price = 1250,
       MenuItemList = new List<MenuItem>
       {
           new MenuItem { MenuId = 9, MenuItemId = 1, MenuItemName = "ご飯"},
           new MenuItem { MenuId = 9, MenuItemId = 2, MenuItemName = "みそ汁"},
           new MenuItem { MenuId = 9, MenuItemId = 3, MenuItemName = "とんかつ"},
           new MenuItem { MenuId = 9, MenuItemId = 4, MenuItemName = "サラダ"}
       }
   }
};
MenuRepository.InsertManyMenus(newMenuList);
```

Management StudioからDBを確認し、以下のように3件の定食が取得できればOKです。

![Entity Frameworkで複数件のデータをInsertするサンプルの実行結果](/img/dotnet/csharp_entityframework/InsertManyResult.png)

### 複数件のUpdate処理

次は複数件のデータをまとめてUpdateしてみましょう。

ここでは例として、昨今の物価高を考慮してメニューを値上げします。

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
            // Includeメソッドを使えば、関連するテーブルのデータも一緒に取得できる
            return _context.Menu.Include(menu => menu.MenuItemList)
                .ToList();
        }

        public void UpdateManyMenus(IList<Menu> menus)
        {
            // 複数のメニューを一度に更新する
            _context.Menu.UpdateRange(menus);
            _context.SaveChanges();
        }
    }
}
```

`UpdateRange`メソッドを使って一括更新を行います。Insert時同様にUpdate時も複数件のデータをまとめて`List`で渡せるメソッドが用意されているのです。

続いて`Program.cs`から`MenuRepository#SelectMenus`を呼び出して価格を変更しましょう。そして`MenuRepository#UpdateManyMenus`を呼び出すように記述して実行しましょう。

```cs:Program.cs
using EntityFrameworkSample.Dtos;
using EntityFrameworkSample.Models;
using EntityFrameworkSample.Repositories;

MenuRepository menuRepository = new MenuRepository();

// UpdateManyのサンプル
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

Management StudioからDBを確認し、以下のように価格が変更されていればOKです。

![Entity Frameworkで複数件のデータをUpdateするサンプルの実行結果](/img/dotnet/csharp_entityframework/UpdateManyResult.png)

### 検索画面での入力内容に応じた処理

次は検索画面において入力した条件で検索する処理を作ってみましょう。重要なポイントは、入力された項目だけ検索条件に反映することです。

まずは検索条件クラスを作ります。プロジェクト直下に`Dtos`というフォルダを作り、`MenuSearchCriteria`というクラスを作りましょう。

![検索条件を配置する場所](/img/dotnet/csharp_entityframework/SolutionExplorerDtos.png)

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
        // メニュー名（部分一致）
        public string? MenuName { get; set; } = string.Empty;
        // 価格（以上）
        public decimal? Price { get; set; }
        // メニュー品目名（部分一致）
        public string? MenuItemName { get; set; } = string.Empty;
    }
}
```

そして`MenuRepository`において、以下のように検索条件となる項目に値が入っている場合だけ`Where`メソッドで絞り込んでいきます。

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
            // データを取得するクエリを書くが、ToListメソッドを使わないことでSQLは発行されない
            var resultList = _context.Menu.Include(menu => menu.MenuItemList).AsQueryable();
            // 検索条件が入力されていたら絞り込みを行う
            // メニュー名
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
                // メニュー一覧　→　メニュー品目一覧の順にラムダ式でアクセスする
                // メニュー品目名に検索条件「メニュー品目名」を1個でも含んだら、対象とする
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

ここでのポイントは最初にデータを取得したときにSQLが発行されないことです。そしてその後の`Where`メソッドで絞り込むときにもSQLは発行されません。SQLが発行されるのは最後の`ToList`メソッドが実行されるときです。

もし最初にデータを取得するときも、検索条件を追加するときもSQLが実行されていたら、DBへのI/Oが増えてパフォーマンスがとても悪くなってしまいます。数十～数百件だったら気にするほどではないかもしれませんが、数万件ともなれば見逃せないほど処理時間が伸びてしまうでしょう。

このように`ToList`メソッドの実行までSQLが発行されない仕様を遅延実行と呼びます。詳細はこちらのLINQの記事にある「LINQの注意点」を参照してください。

[現場で迷わない！C#のLINQをサンプルコード付きで徹底攻略](https://developer.mamezou-tech.com/blogs/2025/07/28/csharp_linq/#linq%E3%81%AE%E6%B3%A8%E6%84%8F%E7%82%B9)

最後に`Program.cs`から`MenuRepository#SearchMenus`を呼び出すように修正して実行してみましょう。ここでは例として、価格が1200円以上かつメニュー品目にサラダを含むメニューを検索します。

```cs:Program.cs
using EntityFrameworkSample.Dtos;
using EntityFrameworkSample.Models;
using EntityFrameworkSample.Repositories;

MenuRepository menuRepository = new MenuRepository();

// 検索画面の処理
MenuSearchCriteria criteria = new MenuSearchCriteria
{
   Price = 1200,
   MenuItemName = "サラダ"
};
var searchResultList = MenuRepository.SearchMenus(criteria);
foreach (var menu in searchResultList)
{
   Console.WriteLine($"メニュー名: {menu.MenuName}, 価格: {menu.Price}円");
   foreach (var item in menu.MenuItemList)
   {
       Console.WriteLine($"  品目: {item.MenuItemName}");
   }
}
```

実行結果は以下のようになります。

```
■検索条件
メニュー名: アジフライ定食, 価格: 1200円
  品目: ご飯
  品目: みそ汁
  品目: アジフライ
  品目: サラダ
メニュー名: エビフライ定食, 価格: 1300円
  品目: ご飯
  品目: みそ汁
  品目: エビフライ
  品目: サラダ
メニュー名: とんかつ定食, 価格: 1250円
  品目: ご飯
  品目: みそ汁
  品目: とんかつ
  品目: サラダ
```

### 非同期処理

処理時間が長い場合、非同期処理を使うのも1つの手です。そこで非同期処理の実装方法も解説します。

以下のようにDBからデータを取得する処理を実装します。これだけで非同期処理になります。

- `ToListAsync`メソッドを使う。
- メソッド名の前に`async`修飾子を付ける。
- メソッドの戻り値の型を`Task<戻り値にしたい型>`とする。

サンプルコードを見てみましょう。

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
            // Includeメソッドを使えば、関連するテーブルのデータも一緒に取得できる
            return await _context.Menu.Include(menu => menu.MenuItemList)
                .ToListAsync();
        }
    }
}
```

戻り値が`Task`型となってので、`Program.cs`もちょっと工夫が必要です。サンプルコードを見てみましょう。

```cs:Program.cs
using EntityFrameworkSample.Dtos;
using EntityFrameworkSample.Models;
using EntityFrameworkSample.Repositories;

MenuRepository menuRepository = new MenuRepository();

// 非同期処理での取得
var asyncResultList = MenuRepository.SelectMenusAsync();
foreach (var menu in asyncResultList.Result)
{
   Console.WriteLine($"メニュー名: {menu.MenuName}, 価格: {menu.Price}円");
   foreach (var item in menu.MenuItemList)
   {
       Console.WriteLine($"  品目: {item.MenuItemName}");
   }
}
```

`MenuRepository#SelectMenusAsync`が`Task`型を返すので、データを取得するには`Result`プロパティを参照する必要があります。

### 変更の追跡

Entity FrameworkはDBから取得したデータの変更を追跡しています。変更の追跡はプロパティレベルです。つまり行・列ともに変更を追跡しています。

そして`SaveChanges`メソッドを呼び出した際に変更内容を確認して、Insert、Update、DeleteなどのSQLを実行します。

詳細はMicrosoftの記事を参照してください。

[EF Core での変更の追跡](https://learn.microsoft.com/ja-jp/ef/core/change-tracking)

ということは変更前の値と現在の値をメモリ上に持つため、メモリへの負荷が上がります。

そこで読み取り専用のデータについては変更の追跡をOffにするという選択肢もあります。

サンプルコードを掲載します。モデルの`AsNoTracking`メソッドを呼び出すだけなので簡単です。

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
            // Includeメソッドを使えば、関連するテーブルのデータも一緒に取得できる
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

// 追跡なしでの取得
var noTrackingResultList = MenuRepository.SelectMenusAsNoTracking();
foreach (var menu in noTrackingResultList)
{
    Console.WriteLine($"メニュー名: {menu.MenuName}, 価格: {menu.Price}円");
    foreach (var item in menu.MenuItemList)
    {
        Console.WriteLine($"  品目: {item.MenuItemName}");
    }
}
```

件数が多い、あるいは容量が大きいデータ（音声や動画など）を読み取り専用で使う場合は、変更の追跡をOffにすることも検討してみてください。

## 終わりに

久々に（それこそ前回仕事でやったのは7年くらい前）Entity Frameworkをやって、そのときにやった環境構築手順や書いて動かしてみたコードを解説してみました。

これだけ楽に開発できるなら生産性もきっと高くなると感じました。特にIncludeメソッドは強力です。

C#のスキルアップにも、開発プロジェクトのリファレンスにも、この記事を活用していただければ幸いです。