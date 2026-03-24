---
title: 使用 C# 和 Razor 开启高效 Web 开发！附示例代码的全面解读
author: yoshihiro-tamori
date: 2025-08-25T00:00:00.000Z
tags:
  - dotnet
  - csharp
image: true
translate: true

---

C# 具备一种非常强大的视图引擎 Razor。使用 Razor 可以实现非常高效的 Web 开发。

在 2010 年代前半期，那时我还是初学者。.NET MVC 出现后，我从 WebForm 迁移过去，但感觉开发效率并未显著提升。

后来 Razor 登场，我尝试使用后，觉得效率极高，十分出色。从那时起，我一直非常喜欢 Razor。

这次，我将为以下各类读者——热爱 Razor 的我，将结合示例代码详细讲解 Razor 的使用方法。希望大家能够熟练掌握 Razor，实现高效的开发。

- C# 开发经验较少的读者
  - 作为 IT 工程师经验较浅的读者
  - 曾使用其他语言，但因转职或项目分配的原因需要使用 C# 的读者
- 有 C# 开发经验但很少使用 Razor 的读者

## 什么是 Razor

Razor 是 ASP.NET 中用于创建网页时可使用的视图引擎。使用 Razor 可以提升网页开发效率。

Razor 的特点是可以在同一文件中同时编写 C# 与 HTML。仅凭这一点就已经非常高效。

首先给出示例代码。在名为 .cshtml 的视图文件（即编写 HTML 和脚本代码的文件）中，写入如下代码：

```cs
@if (DateTime.DaysInMonth(DateTime.Now.Year, DateTime.Now.Month) == 31)
{
    <p>本月有31天。</p>
}
else
{
    <p>本月不超过30天。</p>
}
```

这种写法类似于一般脚本片段的简化版本，但其便利之处在于可以在脚本片段内部同时编写 C# 和 HTML。

通常若要编写 HTML，需要先关闭脚本片段。然而在 Razor 中无需进行此类繁琐操作。

Razor 可以显著提升页面开发效率，但由于其特性，也有可能让你在复杂布局的页面中胡乱编写，导致代码可读性下降。

因此，为了保证代码可读性，请尽量避免过度使用。如果编写的代码过于强行，应考虑重新设计架构。

## 本文示例数据

先展示本文示例代码将使用的数据。为了便于简单试验，采用 CSV 文件。

数据内容为定食店的菜单及其项目。数据中存在诸多可调侃之处，但请谅解，仅作示例之用。

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
1,1,白饭
1,2,味噌汤
1,3,盐烤鲑鱼
1,4,泡菜
2,1,白饭
2,2,味噌汤
2,3,炸鸡块
2,4,沙拉
3,1,白饭
3,2,味噌汤
3,3,生鱼片
3,4,泡菜
4,1,白饭
4,2,味噌汤
4,3,天妇罗
4,4,泡菜
5,1,白饭
5,2,味噌汤
5,3,炸马鲛鱼
5,4,沙拉
```

下面展示模型类代码。

```cs:Menu.cs
namespace RazorSample.Models
{
    public class Menu
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public Decimal Price { get; set; }
        public List<MenuItem> Items { get; set; } = new List<MenuItem>();
    }
}
```

```cs:MenuItem.cs
namespace RazorSample.Models
{
    public class MenuItem
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
    }
}
```

## Razor 基本语法

### 文件结构

首先解释一下 Razor 的文件结构。

如下图所示，Razor 页面由视图和代码隐藏（code-behind）组成。这与 ASP.NET WebForm 或 Windows Form 应用的结构类似。

![Razor 页面结构](/img/dotnet/csharp_razor/RazorStructure.png)

以前（.NET Framework v4.x 时代），采用视图与控制器分离的 MVC 结构，而在 ASP.NET Core 之后则如上图所示。

### 布局文件

在介绍完 Razor 页面结构后，接下来讲解布局文件。

在创建 Razor 页面时通常无需特别关注，但如果想调整全局的设计或布局，就需要修改布局文件。

创建 ASP.NET Core Web 应用（或包含 Razor 页面的项目）后，会生成一个名为 `Pages/Shared/_Layout.cshtml` 的文件。

该文件作为页面模板，其中包含了 JavaScript 和 CSS 的引用及整体布局。

在该文件中间位置有 `@RenderBody()` 这一行。在创建 Razor 页面后，应用运行时会将页面内容嵌入到这里。

```html:_Layout.cshtml
<div class="container">
    <main role="main" class="pb-3">
        @RenderBody()
    </main>
</div>
```

此外在文件末尾还有 `@await RenderSectionAsync("Scripts", required: false)`。

稍后会讲解，若要在 Razor 页面中书写 JavaScript，需要定义一个脚本专用的 Section，运行时会将其嵌入到此处。

### Razor 语法

在 Razor 中使用 @ 和 {} 来编写代码。可以在 @ 之后直接写 C# 代码，也可以在 @{ } 中编写多行 C# 代码。

同时，在 Razor 页面开头使用 @ 即可声明模型和需要的 using 引用，比如指定 @model、@using 等。

顺便提一下，“Razor 语法”（Razor 構文）和“Razor 表达式”（Razor 式）的区别：前者指 Razor 的整体语法，后者指 Razor 中单个 C# 表达式的写法。

下面给出示例页面。

```cs:BasicSample.cshtml
@page
@using RazorSample.Utils
@model RazorSample.Pages.BasicSampleModel
@{
    // 使用 ViewData 来指定页面标题
    ViewData["Title"] = "Basic Sample Page";
}

<h1>@ViewData["Title"]</h1>
<h2>Razor 表达式写法 1：@ 符号后直接跟 C# 代码</h2>
@if (DateTime.DaysInMonth(DateTime.Now.Year, DateTime.Now.Month) == 31)
{
    <p>本月有31天。</p>
}
else
{
    <p>本月不超过30天。</p>
}

<h2>Razor 表达式写法 2：使用 @{ } 包含多行</h2>
@{
    int num1 = 100;
    int num2 = 200;
    <text>合计是 @num1+@num2</text>
}
```

页面显示如下。

![Razor 语法示例](/img/dotnet/csharp_razor/BasicSample1.png)

### 函数的使用

在 Razor 页面中还可以定义并使用函数。示例代码如下。

```cs:BasicSample.cshtml
@page
@using RazorSample.Utils
@model RazorSample.Pages.BasicSampleModel

<h2>函数使用示例</h2>
@functions {
    public string GetGreeting()
    {
        return "你好，Razor！";
    }

    public int Add(int a, int b)
    {
        return a + b;
    }
}

<p>@GetGreeting()</p>
<p>1 + 2 = @Add(1, 2)</p>
```

页面显示如下。

![在 Razor 中定义并使用函数的示例](/img/dotnet/csharp_razor/BasicSample2.png)

### HtmlHelper 的使用

在 Razor 页面中，可以使用 `HtmlHelper` 来生成文本框等常见的 HTML 组件。

写法是 `@Html.Xxx`。若要将模型的值显示在页面上或将页面输入绑定到模型，请使用 `@Html.XxxFor` 系列方法。

下面给出示例代码。在下拉列表的内容中使用了 `SelectList`，本示例将 `enum` 转换为 `SelectList`。

```cs:BasicSample.cshtml
@page
@using RazorSample.Utils
@model RazorSample.Pages.BasicSampleModel

<h2>HtmlHelper 使用示例</h2>
<div class="form-group">
    @Html.DisplayName("名称")
    @Html.TextBoxFor(model => model.Name, new { @class = "form-control" })
</div>
<div class="form-group">
    @Html.CheckBoxFor(model => model.IsNew, new { @class = "form-check-input" })
    @Html.DisplayName("新商品请勾选")
</div>
<div class="form-group">
    <div class="form-group">
        @Html.DisplayName("类别")
    </div>
    <label class="form-check-label" for="lbl-category">
        @Html.RadioButtonFor(model => model.Category, Category.和食, new { @class = "form-check-input" })
        @Html.DisplayName(Category.和食.ToString())
    </label>
    <label class="form-check-label" for="lbl-category">
        @Html.RadioButtonFor(model => model.Category, Category.洋食, new { @class = "form-check-input" })
        @Html.DisplayName(Category.洋食.ToString())
    </label>
    <label class="form-check-label" for="lbl-category">
        @Html.RadioButtonFor(model => model.Category, Category.中華, new { @class = "form-check-input" })
        @Html.DisplayName(Category.中華.ToString())
    </label>
</div>
<div class="form-group">
    @Html.DisplayName("都道府县")
    @Html.DropDownListFor(model => model.Region, new SelectList(Enum.GetValues(typeof(Region))), new { @class = "form-control" })
</div>
<div class="form-group">
    @Html.DisplayName("说明")
    @Html.TextAreaFor(model => model.Description, new { @class = "form-control", rows = 3 })
</div>
```

同时给出代码隐藏文件，定义了模型属性、类别枚举和都道府县枚举。

```cs:BasicSample.cshtml.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace RazorSample.Pages
{
    public class BasicSampleModel : PageModel
    {
        public void OnGet()
        {
        }

        public string Name { get; set; }
        public string Category { get; set; }
        public bool IsNew { get; set; }
        public string Region { get; set; }
        public string Description { get; set; }
        public BasicSampleModel()
        {
            // 若 cshtml 中使用值为 null 的属性导致 NullReferenceException，则在此处初始化
            Name = "";
            Category = "";
            Region = "";
            Description = "";
        }
    }
    public enum Category
    {
        和食,
        洋食,
        中華
    }
    public enum Region
    {
        東京都,
        神奈川県,
        千葉県,
        埼玉県
    }
}
```

页面显示如下。

![使用 Razor 创建 HTML 组件的示例](/img/dotnet/csharp_razor/BasicSample3.png)

## 使用 Razor 创建动态页面

### 向视图传递数据的方法

要在页面显示时执行后台逻辑并将结果显示到视图，只需将值设置到模型即可。

除了模型外，还可以使用 `ViewData`，向其设置任意值。

这里示例将一条消息赋值给 `ViewData` 并显示在页面上。

```cs:CodeBehind
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using RazorSample.Models;
using RazorSample.Readers;
using System.Text;

namespace RazorSample.Pages
{
    public class RegisterMenuModel : PageModel
    {
        public void OnGet(int id)
        {
            ViewData["SampleMessage"] = "这是菜单注册页面。";
        }
    }
}
```

```cs:View
@page
@model RazorSample.Pages.RegisterMenuModel
@{
    ViewData["Title"] = "菜单注册";
}

<h1>@ViewData["Title"]</h1>
<p>@ViewData["SampleMessage"]</p>
```

页面显示如下。

![使用 Razor 在视图中显示后台处理结果示例](/img/dotnet/csharp_razor/ViewData.png)

### 表单数据的提交方法

要将表单中输入的数据发送到服务器，请使用 HtmlHelper。示例代码如下。

首先展示页面截图。

![使用 Razor 提交表单数据示例](/img/dotnet/csharp_razor/MenuEdit.png)

先看视图部分。使用 `@using` 和 `HtmlHelper` 的 `Html.BeginForm` 方法创建 form 标签。

然后使用 HtmlHelper 创建各个输入项。若要将输入绑定到模型，请使用 `@Html.XxxFor` 方法。

```cs:View
@page
@model RazorSample.Pages.RegisterMenuModel
@{
    ViewData["Title"] = "菜单注册";
}

<h1>@ViewData["Title"]</h1>
<p>@ViewData["SampleMessage"]</p>
@using (Html.BeginForm("RegisterMenu", "Menu", FormMethod.Post))
{
    @Html.HiddenFor(model => model.Menu.Id)
    <div class="form-group">
        @Html.DisplayName("菜单名")
        @Html.TextBoxFor(model => model.Menu.Name, new { @class = "form-control" })
    </div>
    <div class="form-group">
        @Html.DisplayName("价格")
        @Html.TextBoxFor(model => model.Menu.Price, new { @class = "form-control" })
    </div>
    <div class="form-group">
        @Html.DisplayName("项目名")
    </div>
    @for (int i = 0; i < Model.Menu.Items.Count; i++)
    {
        @Html.HiddenFor(item => Model.Menu.Items[i].Id)
        <div class="form-group">
            @Html.TextBoxFor(model => Model.Menu.Items[i].Name, new { @class = "form-control" })
        </div>
    }
    <button type="submit" class="btn btn-primary">注册</button>
}
```

顺便提到，本例中菜单项目与菜单是一对多的关系。

我在以前提交此类项目时，服务器端无法正确接收参数而苦战过。因此特意在此展示该示例。

对于此类列表项目，请使用 for 循环而非 foreach。因需指定模型列表中的索引，否则在代码隐藏端无法正确接收。

下面说明原因。Razor 会将模型属性名设置到 HTML 的 id 和 name 属性中。当使用 foreach 循环时，浏览器开发者工具中看到的 HTML 如下。

![使用 Razor foreach 显示列表示例](/img/dotnet/csharp_razor/MenuEditForeach.png)

可以看到 input 标签的 id 和 name 属性中均未包含索引，仅为属性名本身。这样服务器端无法判断这是列表中的哪个元素，自然也就无法正确接收。

因此，若希望将列表项目正确映射到模型，for 循环是必需的。但若仅为显示而循环，则可使用 foreach。

接下来介绍代码隐藏部分。

本例在接收包含菜单 ID 的请求参数后，从 CSV 文件中获取对应的菜单数据并显示在页面上，这就是 `OnGet` 方法。

随后提交后，会调用 `OnPost` 方法。

要在代码隐藏中接收表单提交的值，请在用于保存输入值的属性上添加 `BindProperty` 注解。这样在 POST 时，表单输入的值会自动绑定到此属性。

```cs:CodeBehind
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using RazorSample.Models;
using RazorSample.Readers;
using System.Text;

namespace RazorSample.Pages
{
    public class RegisterMenuModel : PageModel
    {
        CsvReader csvReader = new CsvReader();

        // 在用于页面输入的模型属性上添加 BindProperty 注解
        [BindProperty]
        public Menu Menu { get; set; }

        public void OnGet(int id)
        {
            ViewData["SampleMessage"] = "这是菜单注册页面。";
            // 若指定了菜单 ID，则获取该菜单
            var menus = csvReader.ReadMenu();
            Menu = menus.FirstOrDefault(m => m.Id == id) ?? new Menu();
            // 获取菜单项目
            Menu.Items = csvReader.GetMenuItems(Menu.Id);
        }

        public IActionResult OnPost()
        {
            // 处理 POST 提交的数据
            if (ModelState.IsValid)
            {
                // 检查值
                Console.WriteLine("菜单 ID: {0}, 菜单名: {1}, 价格: {2} 元", Menu.Id, Menu.Name, Menu.Price);
                StringBuilder sb = new StringBuilder();
                sb.AppendLine("菜单项目:");
                foreach (var one in Menu.Items)
                {
                    sb.AppendLine(one.Name);
                }
                Console.WriteLine(sb.ToString());
            }
            return Page(); // 若有错误则重新显示同一页面
        }
    }
}
```

在 URL 后加上 `?id=3` 访问该页面，然后如图修改值并点击注册按钮。

![使用 Razor 提交表单值示例](/img/dotnet/csharp_razor/MenuEditResult.png)

控制台会输出如下内容：

```
菜单 ID: 3, 菜单名: 刺身定食豪华版, 价格: 1500 元
菜单项目:
五谷饭
沙丁鱼丸子汤
豪华生鱼片拼盘
泡菜
```

### JavaScript 的使用

在 Razor 中使用 JavaScript 时，需要定义脚本专用的 Section。

下面给出页面初始渲染时弹出 Hello World 的示例代码。

```cs:JSSample.cshtml
@page
@model RazorSample.Pages.JSSampleModel
@{
}

<p id="sample-message"></p>
<button onclick="getMessage()">异步处理测试</button>

@section Scripts {
    <script>
        $(function () {
            alert("Hello World!");
        });
    </script>
}
```

通过定义 `@section Scripts{}`，即可在此处书写 `<script>` 标签并执行 JavaScript。

显示上述视图后，效果如下。

![Razor 中执行 JavaScript 示例](/img/dotnet/csharp_razor/JSSample1.png)

### 使用 JavaScript 实现异步处理

这里也介绍在 Razor 中使用 JavaScript 实现异步处理的方法。

与之前执行 JavaScript 相同，先定义脚本 Section，然后编写异步处理函数即可。

```cs:JSSample.cshtml
@page
@model RazorSample.Pages.JSSampleModel
@{
}

<p id="sample-message"></p>
<button onclick="getMessage()">异步处理测试</button>

@section Scripts {
    <script>
        $(function () {
            alert("Hello World!");
        });

        function getMessage() {
            fetch('/JSSample?handler=Message')
                .then((response) => response.json())
                .then((data) => {
                    $('#sample-message').text(data.message);
                })
                .catch((error) => {
                    $('#sample-message').text('获取失败。');
                });
        }
    </script>
}
```

注意上面 `fetch` 参数中传入的 URL。如果希望 Razor 的代码隐藏处理 JavaScript 异步请求，需要指定页面名和 handler。

页面名即 cshtml 文件名。本示例文件名为 JSSample.cshtml，因此页面名为 JSSample。

然后将 `OnGetXxx` 方法的 `Xxx` 部分作为 handler 值传入。

在本例中调用 `OnGetMessage` 方法，因此 URL 为 `/JSSample?handler=Message`。

在代码隐藏中，通过返回 `JsonResult` 来返回简单消息。可使用匿名类型构造键值对后传入 `JsonResult` 构造函数，生成 JSON 对象。

```cs:JSSample.cshtml.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace RazorSample.Pages
{
    public class JSSampleModel : PageModel
    {
        public void OnGet()
        {
        }

        public JsonResult OnGetMessage()
        {
            return new JsonResult(new { Message = "这是 JavaScript 示例页面。" });
        }
    }
}
```

显示页面后点击“异步处理测试”按钮，效果如下。

![使用 Razor 的 JavaScript 异步处理示例](/img/dotnet/csharp_razor/JSSample2.png)

## 结语

本文详细讲解了 C# Razor 的使用方法，并分享了我喜欢 Razor 的理由以及在实践中遇到的坑。

Razor 的语法需要一定学习成本，但熟练掌握后可以实现非常高效的 Web 开发。希望大家能够充分利用！

此外，最近还出现了用于前端开发的框架 Blazor。is开发者网站上也发布了解读文章，欢迎阅读。

[Blazor入門：ASP.NET Coreで始める最新Web開発](https://developer.mamezou-tech.com/blogs/2024/12/20/asp-dotnet-core-blazor/)
