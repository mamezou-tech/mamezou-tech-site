---
title: 【C# DIコンテナ入門】Microsoft.Extensions.DependencyInjectionの基本と使い方
author: yoshihiro-tamori
date: 2025-10-22
tags: [dotnet, csharp]
image: true
---

C#から7年ほど遠ざかり、久々にデベロッパーサイト向けにC#をやり出しました。そこでふと疑問が出てきました。最近のC#ではDIコンテナはどんなのがあるんだろうと。

以前やっていたときは、Castle WindsorやUnity（ゲーム制作ツールのUnityとは別物）、Seasarなどがありました（実は.NET用のSeasarなんてものがかつては存在しました）。

Castle Windsorのページ
[https://www.castleproject.org/projects/windsor/](https://www.castleproject.org/projects/windsor/)

.NET CoreになってからMicrosoft製のDIコンテナも登場しているようです。他にはAUTOFACというものやNinjectというものもあるようです。

AUTOFACのページ
[https://autofac.org/](https://autofac.org/)

Ninjectのページ
[http://www.ninject.org/](http://www.ninject.org/)

色々ありますが、Microsoft製のものが一番とっつきやすいかなと思って使ってみたところ、本当にとっつきやすかったです。

そのためこの記事ではMicrosoft製のMicrosoft.Extensions.DependencyInjectionの使い方について、サンプルコード付きで解説します。

## DIコンテナとは

あらためてDIコンテナとは何かについて確認します。

DI（Dependency Injection）コンテナはオブジェクトの生成、ライフサイクルの管理、依存関係の注入を自動化するライブラリです。コードを疎結合化し、修正やテストをしやすくします。

例えば以下のサンプルコードのように、オブジェクトの生成がハードコードされているとします。

```cs
public class Sample
{
    private readonly SampleWriter _sampleWriter = new();

    protected override SampleResult ExecuteSample()
    {
        return _sampleWriter.Write($"Execute sample at: {DateTimeOffset.Now}");
    }
}
```

シンプルなコードなので気にならないと思いますが、`SampleWriter`クラスを別のクラスで置き換えることを考えてみましょう。

すると`SampleWriter`クラスのオブジェクトを使っている個所を見直さなければいけなくなります（見直す範囲は仕様次第ですが）。

そこで登場するのがDIコンテナです。DIコンテナは例えるなら「必要なオブジェクトをまとめて提供してくれる万能な倉庫」です。

このインターフェイスにはこのクラスを代入してくださいという設定をDIコンテナに教えます。するとDIコンテナはその設定に基づいて必要なオブジェクトを自動的に作成し、渡してくれます。

例えば先ほどのサンプルコードは次のように修正できます。

```cs
public class Sample()
{
    public Sample(ISampleWriter sampleWriter)
    {
        _sampleWriter = sampleWriter;
    }

    private readonly ISampleWriter _sampleWriter;

    protected override SampleResult ExecuteSample()
    {
        return _sampleWriter.Write($"Execute sample at: {DateTimeOffset.Now}");
    }
}
```

コンストラクタの引数としてDIコンテナからオブジェクトを受け取ります。そして`SampleWrite`の型をインターフェイスとしています。

`SampleWriter`クラスを別のクラスで置き換えるにしても、インターフェイスを使って`ISampleWriter`としているので、DIコンテナの設定だけ変えればよくなります。

## Microsoft.Extensions.DependencyInjectionとは

Microsoft.Extensions.DependencyInjectionはMicrosoft製のDIコンテナです。NuGetからインストールするだけですぐ使えます。またMicrosoft公式の記事も充実しています。

必要十分な機能を備えており、軽量でシンプルです。そして何より実際にやってみてコーディングが簡単でした。プロジェクト作成時に自動生成される`Program.cs`に少し追加するだけなのです。

Microsoft.Extensions.DependencyInjectionはC#で使うには導入のハードルが低いDIコンテナと言ってよいでしょう。

```cs:WebAppSample
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllersWithViews();
builder.Services.AddTransient<ISampleProc, SamplePoc>();

var app = builder.Build();
```

## 主要な概念

### サービス

サービスは依存関係として注入するインスタンスのことです。

例えば`IsampleProc`というインターフェイスに`SampleProc`というクラスのインスタンスを注入するよう設定した場合、`SampleProc`というクラスのインスタンスがサービスに該当します。

サービスには以下の3つのライフサイクルがあります。

|種類|概要|
|----|----|
|Transient|一時的という意味。<br>サービスが要求されるたびに、新しいインスタンスが生成される。<br>一時的な操作を行うサービスや状態を持つべきでないサービスに適している。|
|Scoped|特定のスコープ内でインスタンスが1つだけ生成される。<br>例えばリクエストスコープやアプリケーションスコープ。|
|Singleton|アプリケーション全体でインスタンスが1つだけ生成される。|

### コンテナ

`ISampleProc`が要求されたら`SampleProc`のインスタンスを渡すというインターフェイスとオブジェクトの紐付けや、そのスコープを登録しておくものがコンテナです。

### サービスプロバイダー

サービスプロバイダーはコンテナに登録された内容に基づいて依存関係の解決を行います。

あるクラスのオブジェクトが生成されるとき、そのクラスに依存関係の注入が必要なインターフェイスがあったら、オブジェクトを生成して注入します。

言葉だと抽象的なので、コードで見てみましょう。

`DiSample`というクラスのオブジェクトをサービスプロバイダーが生成するケースを考えます。

このクラスには`ISampleProc`があります。サービスプロバイダーが`DiSample`を生成したとき、コンストラクタに`ISampleProc`があるのを見て`SampleProc`も生成してくれるのです。

```cs:DiSample
public class DiSample
{
    private ISampleProc _sampleProc;

    // コンストラクタでインジェクション
    public DiSample(ISampleProc sampleProc)
    {
        _sampleProc = sampleProc;
    }
}
```

さらにサービスプロバイダーは依存関係を連鎖解決してくれます。`SampleProc`に`IDbConnection`がある場合を考えてみましょう。

```cs:DiSample
public class SampleProc
{
    private IDbConnection _dbConnection;

    // コンストラクタでインジェクション
    public SampleProc(IDbConnection dbConnection)
    {
        _dbConnection = dbConnection;
    }
}
```

サービスプロバイダーが`DiSample`を生成すると、先ほど書いた通り`ISampleProc`があるのを見て`SampleProc`も生成が必要だと判断します。

すると次は`SampleProc`に`IDbConnection`があるのを見て、`DbConnection`の生成が必要だと判断します。

こうしてサービスプロバイダーは連鎖解決してオブジェクトを生成してくれます。なんて便利なのでしょう。

## サービスの登録方法

### AddSingleton

ライフサイクルをSingletonにしてサービスを登録するには、下記のように記述します。

```cs:SingletonSample
services.AddSingleton<ISampleProc, SampleProc>();
```

### AddScoped

ライフサイクルをScopedにしてサービスを登録するには、下記のように記述します。

```cs:ScopedSample
services.AddScoped<ISampleProc, SampleProc>();
```

### AddTransient

ライフサイクルをTransientにしてサービスを登録するには、下記のように記述します。

```cs:TransientSample
services.AddTransient<ISampleProc, SampleProc>();
```

### 複数のオブジェクトを登録する方法

Microsoft.Extensions.DependencyInjectionは1つのインターフェイスに対して複数のオブジェクトを登録できます。その場合は後から追加した設定で上書きされ、最後に追加された設定が使われます。

ただし`IEnumerable<{SERVICE}>`を使って解決すれば、登録したオブジェクトすべてを生成できます。

サンプルコードを見てみましょう。まずは`ISampleProc`に注入するオブジェクトを2つ登録します。

```cs:DiEnumerable
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllersWithViews();
builder.Services.AddTransient<ISampleProc, SampleProc>();
builder.Services.AddTransient<ISampleProc, SampleProcess>();

var app = builder.Build();
```

```cs:ResolveSample
public class ResolveSample
{
    public ResolveSample(ISampleProc sampleProc)
    {
        // この場合はSampleProcessのオブジェクトが渡される
    }
}
```

```cs:ResolveSampleEnumerable
public class ResolveSample
{
    public ResolveSample(IEnumerable<ISampleProc> sampleProcs)
    {
        // この場合はIEnumerableにSampleProcとSampleProcessのオブジェクトが入って渡される
        // つまり値が2つあるコレクションとして渡される
    }
}
```

## サンプルコードで実践しつつ解説

### サービスとして登録するインターフェイスとクラス

まずはサービスとして登録するインターフェイスとクラスのサンプルコードを提示します。

1つのインターフェイスに対して、インジェクションするオブジェクトのクラスを変えることで、Hello WorldとMorning Worldの表示を切り替えます。また`IEnumerable`を使って1つのインターフェイスに複数のクラスを登録し、利用するサンプルも掲載します。

以下はHello WorldとMorning Worldを表示するためのインターフェイスとクラスのサンプルコードです。`namespace`が`DIConsoleApp`になっていますが、プロジェクト名やディレクトリ名に合わせてください。

```cs:IMessageCreator.cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DIConsoleApp
{
    public interface IMessageCreator
    {
        string CreateMessage();
    }
}
```

```cs:MessageCreatorHello.cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DIConsoleApp
{
    internal class MessageCreatorHello : IMessageCreator
    {
        public string CreateMessage()
        {
            return "Hello, World!";
        }
    }
}
```

```cs:MessageCreatorMorning.cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DIConsoleApp
{
    internal class MessageCreatorMorning : IMessageCreator
    {
        public string CreateMessage()
        {
            return "Morning, World!";
        }
    }
}
```

続いてこれらのクラスをコンストラクタからインジェクションするサンプルコードを掲載します。

```cs:ISampleProc.cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DIConsoleApp
{
    internal interface ISampleProc
    {
        void DisplayMessage();
    }
}
```

```cs:SampleProc.cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DIConsoleApp
{
    internal class SampleProc : ISampleProc
    {
        private IMessageCreator _messageCreator;

        public SampleProc(IMessageCreator messageCreator)
        {
            _messageCreator = messageCreator;
        }

        public void DisplayMessage()
        {
            Console.WriteLine(_messageCreator.CreateMessage());
        }
    }
}
```

こちらは1つのインターフェイスに複数のクラスが登録されている場合に、複数のクラスのオブジェクトを取得するサンプルコードです。

```cs:SampleProcEnumerable.cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DIConsoleApp
{
    internal class SampleProcEnumerable : ISampleProc
    {
        private IMessageCreator _messageCreator;

        public SampleProcEnumerable(IEnumerable<IMessageCreator> messageCreators)
        {
            _messageCreator = messageCreators.ToArray()[0];
        }

        public void DisplayMessage()
        {
            Console.WriteLine(_messageCreator.CreateMessage());
        }
    }
}
```

### コンソールアプリ

まずはコンソールアプリでDIを試してみましょう。理由はシンプルなものから見ていった方が理解しやすいからです。

コンソールアプリプロジェクトを作ってください。そしてインターフェイスやクラスを作成し、先ほど掲載したサンプルコードをコピペしてください。

それができたら`Program.cs`にDI設定を記述します。

```cs:Program.cs
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using DIConsoleApp;

// ビルダーの作成
HostApplicationBuilder builder = Host.CreateApplicationBuilder(args);

// サービスの登録
builder.Services.AddTransient<ISampleProc, SampleProc>();
builder.Services.AddTransient<ISampleProc, SampleProcEnumerable>();
builder.Services.AddTransient<IMessageCreator, MessageCreatorHello>();
builder.Services.AddTransient<IMessageCreator, MessageCreatorMorning>();

// ホストの構築
IHost host = builder.Build();

// サービスの取得と使用
ISampleProc sampleProc = host.Services.GetRequiredService<ISampleProc>();
sampleProc.DisplayMessage();
```

サービス登録の個所を以下のように、`IEnumerable`を使わない方のクラスにして実行してみましょう。

```cs:Program.cs（一部抜粋）
// サービスの登録
builder.Services.AddTransient<ISampleProc, SampleProc>();
//builder.Services.AddTransient<ISampleProc, SampleProcEnumerable>();
builder.Services.AddTransient<IMessageCreator, MessageCreatorHello>();
//builder.Services.AddTransient<IMessageCreator, MessageCreatorMorning>();
```

コンソールにHello Worldが表示されればOKです。

これを以下のようにMorningWorld用のクラスに変えて実行してみましょう。

```cs:Program.cs（一部抜粋）
// サービスの登録
builder.Services.AddTransient<ISampleProc, SampleProc>();
//builder.Services.AddTransient<ISampleProc, SampleProcEnumerable>();
//builder.Services.AddTransient<IMessageCreator, MessageCreatorHello>();
builder.Services.AddTransient<IMessageCreator, MessageCreatorMorning>();
```

今度はMorning Worldが表示されます。

それではHello WorldのクラスもMorning Worldのクラスも両方とも登録してみましょう。

```cs:Program.cs（一部抜粋）
// サービスの登録
builder.Services.AddTransient<ISampleProc, SampleProc>();
//builder.Services.AddTransient<ISampleProc, SampleProcEnumerable>();
builder.Services.AddTransient<IMessageCreator, MessageCreatorHello>();
builder.Services.AddTransient<IMessageCreator, MessageCreatorMorning>();
```

この場合は後勝ちとなってMorning Worldが表示されます。

その次は`IEnumerable`を試してみましょう。コードを次のように変えて実行します。

```cs:Program.cs（一部抜粋）
// サービスの登録
//builder.Services.AddTransient<ISampleProc, SampleProc>();
builder.Services.AddTransient<ISampleProc, SampleProcEnumerable>();
builder.Services.AddTransient<IMessageCreator, MessageCreatorHello>();
builder.Services.AddTransient<IMessageCreator, MessageCreatorMorning>();
```

`SampleProcEnumerable`では、以下のようにインデックスが0のオブジェクトを使うようになっています。そのため先に登録された`MessageCreatorHello`のオブジェクトがインジェクションされます。インデックスを1にすれば2番目に登録されたクラスのオブジェクトがインジェクションされます。

```cs:SampleProcEnumerable.cs（一部抜粋）
public SampleProcEnumerable(IEnumerable<IMessageCreator> messageCreators)
{
    _messageCreator = messageCreators.ToArray()[0];
}
```

### Webアプリ

今度はWebアプリで試してみましょう。やっぱり現実的にはWebアプリのプロジェクトが多いでしょうから、Webアプリでの使い方を知っておきたいところです。

この記事ではRazorページを使って解説していきます。Razorとは何かについてはこちらの記事を参照してください。

[C#とRazorで始める効率的なWeb開発！サンプルコード付きで徹底解説](https://developer.mamezou-tech.com/blogs/2025/08/25/csharp_razor/)

Razorページアプリプロジェクトを作ってください。そしてインターフェイスやクラスを作成し、先ほど掲載したサンプルコードをコピペしてください。

そしたら`Program.cs`を開いてみてください。次のようになっています。

```cs:Program.cs
var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddRazorPages();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthorization();

app.MapRazorPages();

app.Run();
```

なんとRazorページアプリプロジェクトの`Program.cs`には、最初からMicrosoft.Extensions.DependencyInjectionで使うビルダーが記述されているのです。RazorページがDI設定同様にサービスとして登録されているのです。

ここがMicrosoft.Extensions.DependencyInjectionの導入のしやすさなのでしょう。仕組みがRazorページのようなC#でよく使う技術と共通化されているわけですね。

Razorページの登録前にDI設定を記述します。サンプルコードは以下です。コメントで「サービスの登録」と記述した個所が該当します。

```cs:Program.cs
using DIConsoleApp;

var builder = WebApplication.CreateBuilder(args);

// サービスの登録
builder.Services.AddTransient<ISampleProc, SampleProc>();
builder.Services.AddTransient<ISampleProc, SampleProcEnumerable>();
builder.Services.AddTransient<IMessageCreator, MessageCreatorHello>();
builder.Services.AddTransient<IMessageCreator, MessageCreatorMorning>();

// Add services to the container.
builder.Services.AddRazorPages();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthorization();

app.MapRazorPages();

app.Run();
```

Webアプリの場合は確認用の画面を作る必要もあります。`Index`を修正し、`SampleProc`と`SampleProcEnumerable`というRazorページを作ってください。サンプルコードを掲載します。

まずは`Index.cshtml`に以下のようにアンカータグを2ページ分追加します。

```cs:Index.cshtml
<div class="text-center">
    <h1 class="display-4">Welcome</h1>
    <p>Learn about <a href="https://learn.microsoft.com/aspnet/core">building Web apps with ASP.NET Core</a>.</p>
    <p><a href="/SampleProc">SampleProc</a></p>
    <p><a href="/SampleProcEnumerable">SampleProcEnumerable</a></p>
</div>
```

そしたら`SampleProc`（後勝ち用のページ）と`SampleProcEnumerable`（`IEnumerable`用のページ）を作ります。まずは`SampleProc`のサンプルコードを掲載します。

```cs:SampleProc.cshtml
@page
@model DIWebApp.Pages.SampleProcModel
@{
}

<h2>SampleProc</h2>
<p>@Model.DisplayMessage()</p>
```

```cs:SampleProc.cshtml.cs
using DIWebApp;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace DIWebApp.Pages
{
    public class SampleProcModel : PageModel
    {
        private IMessageCreator _messageCreator;

        public SampleProcModel(IMessageCreator messageCreator)
        {
            _messageCreator = messageCreator;
        }

        public string DisplayMessage()
        {
            return _messageCreator.CreateMessage();
        }

        public void OnGet()
        {
        }
    }
}
```

続いて`SampleProcEnumerable`（`IEnumerable`を使うページ）のサンプルコードを掲載します。

```cs:SampleProcEnumerable.cshtml
@page
@model DIWebApp.Pages.SampleProcEnumerableModel
@{
}

<h2>SampleProcEnumerable</h2>
<p>@Model.DisplayMessage()</p>
```

```cs:SampleProcEnumerable.cshtml.cs
using DIWebApp;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace DIWebApp.Pages
{
    public class SampleProcEnumerableModel : PageModel
    {
        private IMessageCreator _messageCreator;

        public SampleProcEnumerableModel(IEnumerable<IMessageCreator> messageCreatora)
        {
            _messageCreator = messageCreatora.ToArray()[0];
        }

        public string DisplayMessage()
        {
            return _messageCreator.CreateMessage();
        }

        public void OnGet()
        {
        }
    }
}
```

先ほどのコンソールアプリ同様に、後勝ちであることや`IEnumerable`について実行して確認してみてください。


## おわりに

私はC#にはLINQやRazorなどとても便利な技術があるのに、DIコンテナはいまいちだなぁと感じていました。

しかし今回Microsoft.Extensions.DependencyInjectionを使ってみて、C#にも簡単に扱えるDIコンテナがあるんだと知りました。

かつて私がCastle Windsorを使ったときは、.NET MVCで今の`Program.cs`に該当するクラスにもっと複雑なコードを書いていました。そしてXMLに冗長なDI設定を書いていました。

それと比べるとMicrosoft.Extensions.DependencyInjectionは書くべき個所が明確ですし、書き方も簡単ですね。これなら導入のハードルは低いです。

もしC#で開発する際のDIコンテナに迷っているようでしたら、Microsoft.Extensions.DependencyInjectionを使ってみてはいかがでしょうか。その際にこの記事が参考にされば幸いです。