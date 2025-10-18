---
title: 【C# DI容器入门】Microsoft.Extensions.DependencyInjection的基本与用法
author: yoshihiro-tamori
date: 2025-10-16T00:00:00.000Z
tags:
  - dotnet
  - csharp
image: true
translate: true

---

我大约有7年没用C#了，最近又开始在开发者网站上使用C#。这时我突然想：现在的C#都有哪些DI容器呢。

以前用的时候，有Castle Windsor、Unity（与游戏引擎Unity无关）、Seasar等。（事实上，曾经存在过针对.NET的Seasar。）

Castle Windsor的页面  
[https://www.castleproject.org/projects/windsor/](https://www.castleproject.org/projects/windsor/)

自从进入.NET Core后，也出现了微软出品的DI容器。此外还有AUTOFAC和Ninject。

AUTOFAC的页面  
[https://autofac.org/](https://autofac.org/)

Ninject的页面  
[http://www.ninject.org/](http://www.ninject.org/)

虽然有很多选择，但我觉得微软出品的最容易入手，于是试用了一下，果然真的很容易上手。

因此，本文将结合示例代码，介绍微软出品的Microsoft.Extensions.DependencyInjection的使用方法。

## DI容器是什么

先来确认一下DI容器究竟是什么。

DI（依赖注入）容器是一个自动化管理对象创建、生命周期管理和依赖关系注入的库。它可以让代码变得松耦合，更易于修改和测试。

使用DI容器的主要优点有以下几点：
- 即使发生需求变更，也能减少修改工作量。
- 在测试时，通过替换为测试用类（称为Mock），可以使测试更加方便。
- 能清楚地了解哪个组件依赖于哪个组件，使系统结构更加清晰。

例如，假设下面的示例代码中，对象的创建被硬编码了。

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

虽然这是简单的代码，不会让人太在意，但考虑将`SampleWriter`类替换为另一个类的情况。

此时，就必须重新审视使用`SampleWriter`类对象的地方（需要审视的范围取决于需求）。

此时DI容器登场了。DI容器可以比作“将所需对象集中提供的万能仓库”。

我们将告诉DI容器：这个接口对应注入这个类。然后DI容器会根据该设置自动创建并提供所需对象。

例如，可以将之前的示例代码修改为如下：

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

通过构造函数参数从DI容器接收对象。并将`SampleWriter`的类型定义为接口。

即便要将`SampleWriter`类替换为其他类，由于使用了`ISampleWriter`接口，只需修改DI容器的配置即可。

## Microsoft.Extensions.DependencyInjection是什么

Microsoft.Extensions.DependencyInjection是微软出品的DI容器。只需从NuGet安装即可立即使用。而且微软官方的文章也非常丰富。

它具备了必需且充分的功能，轻量且简洁。最重要的是，实际操作中编码非常简单。只需要在项目创建时自动生成的`Program.cs`里稍作添加即可。

可以说，Microsoft.Extensions.DependencyInjection是一个在C#中使用时门槛很低的DI容器。

```cs:WebAppSample
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllersWithViews();
builder.Services.AddTransient<ISampleProc, SamplePoc>();

var app = builder.Build();
```

## 主要概念

### 服务

服务是指作为依赖关系注入的实例。

例如，如果将`ISampleProc`接口配置为注入`SampleProc`类的实例，那么`SampleProc`类的实例就属于服务。

服务有以下三种生命周期。

|种类|概述|
|----|----|
|Transient|意为临时。<br>每次请求服务时都会创建一个新的实例。<br>适合执行临时操作的服务或不应持有状态的服务。|
|Scoped|在特定范围内只创建一个实例。<br>例如Web应用中的HTTP请求（请求范围）或<br>整个应用程序（应用程序范围）。|
|Singleton|整个应用程序只创建一个实例。|

### 容器

容器是用来注册接口与对象对应关系（例如当请求`ISampleProc`时提供`SampleProc`实例）以及它们的作用域的。

### 服务提供者

服务提供者根据在容器中注册的内容来解决依赖关系。

当某个类的对象被创建时，如果该类的构造函数需要注入依赖的接口，服务提供者就会创建并注入相应的对象。

用语言描述比较抽象，那我们来看代码。

考虑服务提供者生成名为`DiSample`的类对象的场景。

这个类有一个对`ISampleProc`的依赖。服务提供者在生成`DiSample`时，会看到构造函数需要`ISampleProc`，然后自动创建`SampleProc`并注入。

```cs:DiSample
public class DiSample
{
    private ISampleProc _sampleProc;

    // 构造函数注入
    public DiSample(ISampleProc sampleProc)
    {
        _sampleProc = sampleProc;
    }
}
```

此外，服务提供者还会进行依赖关系的链式解析。考虑`SampleProc`需要`IDbConnection`的情况。

```cs:DiSample
public class SampleProc
{
    private IDbConnection _dbConnection;

    // 构造函数注入
    public SampleProc(IDbConnection dbConnection)
    {
        _dbConnection = dbConnection;
    }
}
```

服务提供者生成`DiSample`后，会先判断需要生成`SampleProc`，然后再判断`SampleProc`需要`IDbConnection`，进而生成相应的对象。

就这样，服务提供者通过链式解析生成对象。真是太方便了。

## 注册服务的方法

### AddSingleton

要使用Singleton生命周期注册服务，可以这样书写：

```cs:SingletonSample
services.AddSingleton<ISampleProc, SampleProc>();
```

### AddScoped

要使用Scoped生命周期注册服务，可以这样书写：

```cs:ScopedSample
services.AddScoped<ISampleProc, SampleProc>();
```

### AddTransient

要使用Transient生命周期注册服务，可以这样书写：

```cs:TransientSample
services.AddTransient<ISampleProc, SampleProc>();
```

### 注册多个对象的方法

Microsoft.Extensions.DependencyInjection允许对同一个接口注册多个对象。这种情况下，后添加的配置会覆盖前面的，最终使用最后添加的配置。

但是，如果使用`IEnumerable<{SERVICE}>`来解析，就可以生成所有注册的对象。

来看示例代码。首先对`ISampleProc`注入两个对象进行注册。

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
        // 在这种情况下，会传入SampleProcess的对象
    }
}
```

```cs:ResolveSampleEnumerable
public class ResolveSample
{
    public ResolveSample(IEnumerable<ISampleProc> sampleProcs)
    {
        // 在这种情况下，会将SampleProc和SampleProcess的对象都放入IEnumerable并传入
        // 也就是说作为包含两个值的集合传入
    }
}
```

## 通过示例代码实践并讲解

### 作为服务注册的接口和类

首先提供要注册为服务的接口和类的示例代码。

通过对同一接口注入不同对象类，可以切换显示Hello World和Morning World。此外，还展示了使用`IEnumerable`对同一接口注册多个类并使用的示例。

以下是用于显示Hello World和Morning World的接口和类的示例代码。命名空间为`DIConsoleApp`，请根据项目名或目录名调整。

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

接下来展示将这些类通过构造函数进行注入的示例代码。

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

以下是当一个接口注册了多个类时，获取多个类对象的示例代码。

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

### 控制台应用程序

首先在控制台应用程序中尝试DI。因为从简单的入手更容易理解。

请创建一个控制台应用程序项目，创建接口和类，并将之前贴出的示例代码复制粘贴进去。

完成后在`Program.cs`中编写DI配置。

```cs:Program.cs
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using DIConsoleApp;

// 创建构建器
HostApplicationBuilder builder = Host.CreateApplicationBuilder(args);

// 注册服务
builder.Services.AddTransient<ISampleProc, SampleProc>();
builder.Services.AddTransient<ISampleProc, SampleProcEnumerable>();
builder.Services.AddTransient<IMessageCreator, MessageCreatorHello>();
builder.Services.AddTransient<IMessageCreator, MessageCreatorMorning>();

// 构建主机
IHost host = builder.Build();

// 获取并使用服务
ISampleProc sampleProc = host.Services.GetRequiredService<ISampleProc>();
sampleProc.DisplayMessage();
```

将服务注册部分改为以下不使用`IEnumerable`的那个类，然后执行。

```cs:Program.cs（部分摘录）
// 注册服务
builder.Services.AddTransient<ISampleProc, SampleProc>();
//builder.Services.AddTransient<ISampleProc, SampleProcEnumerable>();
builder.Services.AddTransient<IMessageCreator, MessageCreatorHello>();
//builder.Services.AddTransient<IMessageCreator, MessageCreatorMorning>();
```

如果控制台显示Hello World就完成了。

接着将其改为用于Morning World的类并执行。

```cs:Program.cs（部分摘录）
// 注册服务
builder.Services.AddTransient<ISampleProc, SampleProc>();
//builder.Services.AddTransient<ISampleProc, SampleProcEnumerable>();
//builder.Services.AddTransient<IMessageCreator, MessageCreatorHello>();
builder.Services.AddTransient<IMessageCreator, MessageCreatorMorning>();
```

这次会显示Morning World。

那么接下来同时注册Hello World类和Morning World类试试。

```cs:Program.cs（部分摘录）
// 注册服务
builder.Services.AddTransient<ISampleProc, SampleProc>();
//builder.Services.AddTransient<ISampleProc, SampleProcEnumerable>();
builder.Services.AddTransient<IMessageCreator, MessageCreatorHello>();
builder.Services.AddTransient<IMessageCreator, MessageCreatorMorning>();
```

在这种情况下，后注册的会胜出，显示Morning World。

接下来尝试`IEnumerable`。将代码修改如下并执行。

```cs:Program.cs（部分摘录）
// 注册服务
//builder.Services.AddTransient<ISampleProc, SampleProc>();
builder.Services.AddTransient<ISampleProc, SampleProcEnumerable>();
builder.Services.AddTransient<IMessageCreator, MessageCreatorHello>();
builder.Services.AddTransient<IMessageCreator, MessageCreatorMorning>();
```

在`SampleProcEnumerable`中，按照如下方式使用索引为0的对象。因此会注入先前注册的`MessageCreatorHello`对象。如果将索引设为1，则会注入第二个注册的类的对象。

```cs:SampleProcEnumerable.cs（部分摘录）
public SampleProcEnumerable(IEnumerable<IMessageCreator> messageCreators)
{
    _messageCreator = messageCreators.ToArray()[0];
}
```

### Web应用程序

#### Web应用程序的DI设置

这次在Web应用程序中试试。毕竟在实际中Web应用项目很多，所以想了解在Web应用中的使用方法。

本文将使用Razor页面进行讲解。关于Razor是什么，请参阅这篇文章。

[使用 C# 和 Razor 开始高效 Web 开发！附示例代码的彻底解说](https://developer.mamezou-tech.com/blogs/2025/08/25/csharp_razor/)

请创建一个 Razor 页面应用程序项目，然后创建接口和类，并将之前展示的示例代码复制粘贴进去。

然后打开`Program.cs`。内容如下。

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

令人惊讶的是，Razor 页面应用项目的`Program.cs`中，从一开始就写有用于 Microsoft.Extensions.DependencyInjection 的构建器。Razor 页面也已作为服务注册进来，如同 DI 设置一样。

这就是 Microsoft.Extensions.DependencyInjection 易于引入之处。它与 Razor 页面等 C# 常用技术实现了通用化。

在注册 Razor 页面之前编写 DI 设置。示例代码如下。注释标示为“服务注册”的地方就是相关位置。

```cs:Program.cs
using DIConsoleApp;

var builder = WebApplication.CreateBuilder(args);

// 注册服务
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

#### Web应用程序的运行确认

对于 Web 应用，需要创建一个用于确认的页面。请修改`Index`并创建名为`SampleProc`和`SampleProcEnumerable`的 Razor 页面。页面跳转结构如下图所示。

![Web 应用示例的页面跳转](/img/dotnet/csharp_di/SamplePageStructure.png)
*Web 应用示例的页面跳转*

下面展示示例代码。首先在`Index.cshtml`中按如下方式添加两个锚点标签。

```cs:Index.cshtml
<div class="text-center">
    <h1 class="display-4">Welcome</h1>
    <p>Learn about <a href="https://learn.microsoft.com/aspnet/core">building Web apps with ASP.NET Core</a>.</p>
    <p><a href="/SampleProc">SampleProc</a></p>
    <p><a href="/SampleProcEnumerable">SampleProcEnumerable</a></p>
</div>
```

接着创建`SampleProc`（用于后注册胜出的页面）和`SampleProcEnumerable`（用于`IEnumerable`的页面）。首先展示`SampleProc`的示例代码。

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

接下来展示`SampleProcEnumerable`（使用`IEnumerable`的页面）的示例代码。

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

调试启动后，首先会显示Index页面。

然后访问`SampleProc`和`SampleProcEnumerable`，与之前的控制台应用相同，请执行并确认后注册胜出以及`IEnumerable`的情况。

## 结语

我曾觉得C#虽然有LINQ、Razor等非常实用的技术，但DI容器总感觉不尽如人意。

但是这次使用Microsoft.Extensions.DependencyInjection后，我才知道C#也有易于使用的DI容器。

曾经当我使用Castle Windsor时，在.NET MVC中相当于现在`Program.cs`的类里，写了更复杂的代码，并在XML中写了冗长的DI配置。

与之相比，Microsoft.Extensions.DependencyInjection明确了需要编写的地方，写法也很简单。这样引入的门槛就很低了。

如果在C#开发时对DI容器感到迷茫的话，不妨试试Microsoft.Extensions.DependencyInjection。希望本文能对您有所帮助。
