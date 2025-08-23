---
title: C#とRazorで始める効率的なWeb開発！サンプルコード付きで徹底解説
author: yoshihiro-tamori
date: 2025-08-25
tags: [dotnet, csharp]
image: true
---

C#にはRazorというとても強力なビューエンジンがあります。Razorを使えばとても効率的なWeb開発ができます。

2010年代前半頃、私がまだ駆け出しの頃のことです。.NET MVCが登場し、WebFormから移行したのですが、開発効率は目立って上がっていないと感じていました。

そこにRazorが登場したので使ってみたら、とても効率的で素晴らしいと感じました。それ以来、私はずっとRazorを気に入っています。

今回は以下のような方のために、Razor大好きな私がRazorの使い方をサンプルコードとともに解説します。Razorを使いこなして効率的な開発をバリバリとやってくださいね。

- C#の開発経験が浅い方
  - ITエンジニアとしての経験が浅い方
  - 他の言語を経験してきたけど転職や配属プロジェクトの都合などでC#をやることになった方
- C#の開発経験はあるけどRazorをあまり使ったことがない方

## Razorとは

RazorはASP.NETでWebページを作成する際に使用できるビューエンジンです。Razorを使うとWeb画面の開発効率を高めることができます。

Razorの特徴はC#とHTMLをまとめて書いても動作することです。これだけでも反則的な雰囲気がしてきます。

まずはサンプルコードを掲載します。cshtmlというビュー用のファイル、つまりHTMLとスクリプトレットを書くファイルに以下のようなコードを書きます。

```cs
@if (DateTime.DaysInMonth(DateTime.Now.Year, DateTime.Now.Month) == 31)
{
    <p>今月は31日あります。</p>
}
else
{
    <p>今月は30日以下です。</p>
}
```

書き方は一般的なスクリプトレットをちょっとシンプルにしたようなものですが、スクリプトレット内にC#とHTMLをまとめて書いてもよいところが楽なのです。

普通はHTMLを書きたければスクリプトレットをいったん閉じる必要があります。しかしRazorならそんな面倒な作業は不要です。

Razorを使えば画面の開発効率が高くなるのですが、その性質上、複雑なレイアウトの画面も強引に作れてしまいます。

そのためコードの可読性を落とさないよう、強引なことはやらないようにしましょう。強引なコードを書くくらいなら設計を見直すべきですから。

## この記事で扱うサンプルデータ

先にこの記事のサンプルコードで使うデータを掲載しておきます。簡単に試せるようCSVファイルとしています。

データの内容は定食屋のメニューと、その内訳としての品目です。突っ込みどころが多いデータですが、サンプルですので容赦してください。

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

モデルクラスのコードも掲載します。

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

## Razorの基本文法

### ファイルの構造

最初にRazorのファイル構造について解説します。

以下の図のように、Razorページはビューとコードビハインドのセットになっています。ASP.NET WebFormやWindows Formアプリと同様の構造です。

![Razorページの構造](/img/dotnet/csharp_razor/RazorStructure.png)

一昔前（.NET Framework v4.xの頃）ですと、ビューとコントローラーに分かれているMVC構造でしたが、ASP.NET Core以降は上記の図のようになっています。

### レイアウトファイル

Razorページの構造の次はレイアウトファイルについて解説します。

Razorページを作成する上で特に意識しなくてもよいのですが、全画面に関するデザインやレイアウトを調整したい場合にレイアウトファイルの修正が必要になります。

ASP.NET Core WebアプリなどRazorページを含むプロジェクトを作成すると、`Pages/Shared/_Layout.cshtml`というファイルが作成されます。

このファイルが画面テンプレートとなっており、JavaScriptやCSSの読み込み、レイアウトなどが記述されています。

このファイルの真ん中あたりに`@RenderBody()`という記述があります。Razorページを作成すると、アプリを実行時にここへ埋め込まれます。

```html:_Layout.cshtml
<div class="container">
    <main role="main" class="pb-3">
        @RenderBody()
    </main>
</div>
```

また最後の方には`@await RenderSectionAsync("Scripts", required: false)`という記述があります。

後で解説しますが、JavaScriptをRazorページに記述する際にはScript用のセクションを記述します。するとここへ埋め込まれるというわけです。

### Razor構文

Razorを記述するには`@`と`{}`を使います。`@`の後ろにC#コードを書いても、`@{}`の中にC#コードを書いてもよいです。

またモデルの指定やC#コードで使いたいクラス・ライブラリなどのusingはRazorページの冒頭に`@`を使って記述すればよいです。

ちなみにRazor構文とRazor式という言葉がありますが、前者はRazorの文法、後者はRazorでのC#の式1つ1つと思ってください。

サンプルページを掲載します。

```cs:BasicSample.cshtml
@page
@using RazorSample.Utils
@model RazorSample.Pages.BasicSampleModel
@{
    // タイトルの指定にはViewDataを使用
    ViewData["Title"] = "Basic Sample Page";
}

<h1>@ViewData["Title"]</h1>
<h2>Razor式の書き方その１：アットマークのすぐ後ろにC#コードを書く</h2>
@if (DateTime.DaysInMonth(DateTime.Now.Year, DateTime.Now.Month) == 31)
{
    <p>今月は31日あります。</p>
}
else
{
    <p>今月は30日以下です。</p>
}

<h2>Razor式の書き方その２：アットマークと{}で囲う</h2>
@{
    int num1 = 100;
    int num2 = 200;
    <text>合計は @num1+@num2 です</text>
}
```

画面表示は次のようになります。

![Razor構文のサンプル](/img/dotnet/csharp_razor/BasicSample1.png)

### 関数の使い方

Razorページでは関数を定義して使うこともできます。サンプルコードを掲載します。

```cs:BasicSample.cshtml
@page
@using RazorSample.Utils
@model RazorSample.Pages.BasicSampleModel

<h2>関数の使用サンプル</h2>
@functions {
    public string GetGreeting()
    {
        return "こんにちは、Razor!";
    }

    public int Add(int a, int b)
    {
        return a + b;
    }
}

<p>@GetGreeting()</p>
<p>1 + 2 = @Add(1, 2)</p>
```

画面表示は次のようになります。

![Razor構文で関数を定義して使うサンプル](/img/dotnet/csharp_razor/BasicSample2.png)

### HtmlHelperの使い方

Razorページでは`HtmlHelper`というものを使って、テキストボックスなどのHTMLページによくある部品を作成できます。

書き方は`@Html.Xxx`です。モデルの値を画面に表示したり、画面入力値をモデルにセットしたりしたい場合は、`@Html.XxxFor`というメソッドを使ってください。

サンプルコードを掲載します。ドロップダウンリストの内容には`SelectList`を使ってください。このサンプルでは`enum`を`SelectList`に変換しています。

```cs:BasicSample.cshtml
@page
@using RazorSample.Utils
@model RazorSample.Pages.BasicSampleModel

<h2>HtmlHelperの使用サンプル</h2>
<div class="form-group">
    @Html.DisplayName("名称")
    @Html.TextBoxFor(model => model.Name, new { @class = "form-control" })
</div>
<div class="form-group">
    @Html.CheckBoxFor(model => model.IsNew, new { @class = "form-check-input" })
    @Html.DisplayName("新商品の場合はチェック")
</div>
<div class="form-group">
    <div class="form-group">
        @Html.DisplayName("カテゴリー")
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
    @Html.DisplayName("都道府県")
    @Html.DropDownListFor(model => model.Region, new SelectList(Enum.GetValues(typeof(Region))), new { @class = "form-control" })
</div>
<div class="form-group">
    @Html.DisplayName("説明")
    @Html.TextAreaFor(model => model.Description, new { @class = "form-control", rows = 3 })
</div>
```

コードビハインドも掲載します。モデルの項目や、カテゴリと都道府県の`enum`を記述しています。

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
            // 実は値がnullの項目をcshtmlで使ってNullReferenceExceptionが出る場合、初期化する。
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

画面表示は次のようになります。

![RazorでHTML部品を作成するサンプル](/img/dotnet/csharp_razor/BasicSample3.png)

## Razorによる動的ページの作成方法

### ビューにデータを渡す方法

画面表示時の処理をコードビハインドで行って、その結果をビューに表示するには、モデルに値をセットすればよいです。

モデル以外には`ViewData`というものが使用でき、任意の値をセットできます。

ここでは`ViewData`にサンプルメッセージを代入し、画面に表示するサンプルコードを掲載します。

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
            ViewData["SampleMessage"] = "メニュー登録ページです。";
        }
    }
}
```

```cs:View
@page
@model RazorSample.Pages.RegisterMenuModel
@{
    ViewData["Title"] = "メニュー登録";
}

<h1>@ViewData["Title"]</h1>
<p>@ViewData["SampleMessage"]</p>
```

画面表示は次のようになります。

![Razorでコードビハインドの処理結果をビューに表示するサンプル](/img/dotnet/csharp_razor/ViewData.png)

### フォームデータの送信方法

フォームに入力したデータをサーバに送信するには`HtmlHelper`を使います。サンプルコードを掲載します。

まずは画面イメージを掲載します。

![Razorを使ったフォームデータを送信するサンプル](/img/dotnet/csharp_razor/MenuEdit.png)

まずはビューからです。`@using`と`HtmlHelper`の`Html.BeginForm`メソッドを使ってformタグを作成します。

それから`HtmlHelper`で各入力項目を作成します。入力項目の値をモデルにセットしたい場合は、`@Html.XxxFor`というメソッドを使ってください。

```cs:View
@page
@model RazorSample.Pages.RegisterMenuModel
@{
    ViewData["Title"] = "メニュー登録";
}

<h1>@ViewData["Title"]</h1>
<p>@ViewData["SampleMessage"]</p>
@using (Html.BeginForm("RegisterMenu", "Menu", FormMethod.Post))
{
    @Html.HiddenFor(model => model.Menu.Id)
    <div class="form-group">
        @Html.DisplayName("メニュー名")
        @Html.TextBoxFor(model => model.Menu.Name, new { @class = "form-control" })
    </div>
    <div class="form-group">
        @Html.DisplayName("価格")
        @Html.TextBoxFor(model => model.Menu.Price, new { @class = "form-control" })
    </div>
    <div class="form-group">
        @Html.DisplayName("品目名")
    </div>
    @for (int i = 0; i < Model.Menu.Items.Count; i++)
    {
        @Html.HiddenFor(item => Model.Menu.Items[i].Id)
        <div class="form-group">
            @Html.TextBoxFor(model => Model.Menu.Items[i].Name, new { @class = "form-control" })
        </div>
    }
    <button type="submit" class="btn btn-primary">登録</button>
}
```

ちなみにこの例ではメニュー品目というメニューに対して1:Nで紐づいている項目があります。

私は昔、こういう項目をサブミットしたときにサーバ側で上手く受け取れなくて苦戦したことがあります。だからあえてこの記事にこのような例を書いています。

こういう項目は`foreach文`ではなく`for文`を使ってください。モデル内の一覧のうち、何番目かを指定しないと、コードビハインドで正しく受け取れません。

理由を説明しておきます。Razorはモデルの項目名をHTMLのid属性とname属性に設定します。そして`foreach文`で作った一覧をブラウザの開発者ツールで見ると、以下のようなHTMLになっています。

![Razorでforeachを使って一覧を表示するサンプル](/img/dotnet/csharp_razor/MenuEditForeach.png)

なんとinputタグのid属性、name属性ともに一覧内のインデックスがなく、項目名だけなのです。これでは一覧の何番目かが分かりませんよね。だからサーバ側で一覧の値を正しく受け取れません。

続いてコードビハインドに移りましょう。

この例ではリクエストパラメータとしてメニューIDを受け取ったら、該当するメニューのデータをCSVファイルから取得し、画面に表示しています。それが`OnGet`メソッドです。

そして画面に入力された値を`OnPost`メソッドで受け取っています。

フォームに入力した値をコードビハインドで受け取るためには、入力した値を保持するプロパティに`BindProperty`アノテーションを付けてください。するとPOST時にはフォームに入力した値が自動的にセットされます。

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

        // 画面入力項目に使うモデルにBindPropertyアノテーションを付ける
        [BindProperty]
        public Menu Menu { get; set; }

        public void OnGet(int id)
        {
            ViewData["SampleMessage"] = "メニュー登録ページです。";
            // メニューIDが指定された場合、そのメニューを取得する
            var menus = csvReader.ReadMenu();
            Menu = menus.FirstOrDefault(m => m.Id == id) ?? new Menu();
            // メニュー内訳の品目を取得
            Menu.Items = csvReader.GetMenuItems(Menu.Id);
        }

        public IActionResult OnPost()
        {
            // POSTされたデータを処理する
            if (ModelState.IsValid)
            {
                // 値を確認する
                Console.WriteLine("メニューID: {0}, メニュー名: {1}, 価格: {2}円", Menu.Id, Menu.Name, Menu.Price);
                StringBuilder sb = new StringBuilder();
                sb.AppendLine("メニュー品目:");
                foreach (var one in Menu.Items)
                {
                    sb.AppendLine(one.Name);
                }
                Console.WriteLine(sb.ToString());
            }
            return Page(); // エラーがある場合は同じページを再表示
        }
    }
}
```

URLに`?id=3`を付けてこの画面にアクセスしてみましょう。そして次のように値を書き換えてサブミットします。

![Razorでフォームの値をサブミットするサンプル](/img/dotnet/csharp_razor/MenuEditResult.png)

コンソールに次のような値が出ます。

```
メニューID: 3, メニュー名: 刺身定食豪華版, 価格: 1500円
メニュー品目:
五穀ご飯
イワシつみれ汁
刺身豪華盛り
漬物
```

### JavaScriptの使い方

RazorでJavaScriptを使うには、スクリプト用のセクションを記述します。

画面を初期表示時にHello Worldを表示するサンプルコードを掲載します。

```cs:JSSample.cshtml
@page
@model RazorSample.Pages.JSSampleModel
@{
}

<p id="sample-message"></p>
<button onclick="getMessage()">非同期処理のテスト</button>

@section Scripts {
    <script>
        $(function () {
            alert("Hello World!");
        });
    </script>
}
```

`@section Scripts{}`と記述することで、scriptタグを書いてJavaScriptを実行できます。

上記のビューを表示すると、以下のようになります。

![RazorでJavaScriptを実行するサンプル](/img/dotnet/csharp_razor/JSSample1.png)

### Ajaxを使った非同期処理の実装方法

RazorでAjaxを使って非同期処理を実装する方法についても解説しておきます。

先ほどのJavaScriptの実行と同様にスクリプト用のセクションを作成し、Ajaxの処理を記述するだけです。

```cs:JSSample.cshtml
@page
@model RazorSample.Pages.JSSampleModel
@{
}

<p id="sample-message"></p>
<button onclick="getMessage()">非同期処理のテスト</button>

@section Scripts {
    <script>
        $(function () {
            alert("Hello World!");
        });

        function getMessage() {
            $.ajax({
                url: '/JSSample?handler=Message',
                method: 'GET',
                dataType: 'json',
                success: function (data) {
                    $('#sample-message').text(data.message);
                },
                error: function () {
                    $('#sample-message').text('取得に失敗しました。');
                }
            });
        }
    </script>
}
```

上記のコードの`url`の個所に気を付けてください。RazorのコードビハインドでAjaxを受け付けるには、ページ名とハンドラーを指定します。

ページ名はcshtmlファイルの名前です。このサンプルだとページファイルの名前がJSSample.cshtmlですので、ページ名はJSSampleになります。

そして`OnGetXxx`メソッドのXxxの部分をAjaxの`url`の`handler`に指定します。

この例だと`OnGetMessage`メソッドを呼び出すために、Ajaxで`url`に`/JSSample?handler=Message`と指定しています。

コードビハインドでは単純なメッセージをJSONで返します。匿名型を使ってキー・バリュー形式にして`JsonResult`の引数に渡せば、JSONオブジェクトを作成できます。

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
            return new JsonResult(new { Message = "JavaScriptのサンプルページです。" });
        }
    }
}
```

## 終わりに

C#のRazorについて、私が気に入っている理由と苦戦した個所なども含め、使い方を解説しました。

Razorは文法の学習がいくらか必要ですが、慣れればとても効率的にWeb開発ができます。ぜひ使いこなしてくださいね。

また最近はBlazorというフロントエンド用のフレームワークも登場しています。豆蔵デベロッパーサイトでも解説記事を書いていますので、ぜひ読んでください。

[Blazor入門：ASP.NET Coreで始める最新Web開発](https://developer.mamezou-tech.com/blogs/2024/12/20/asp-dotnet-core-blazor/)