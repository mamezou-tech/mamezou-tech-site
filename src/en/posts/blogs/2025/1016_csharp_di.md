---
title: >-
  Introduction to C# DI Containers: Basics and Usage of
  Microsoft.Extensions.DependencyInjection
author: yoshihiro-tamori
date: 2025-10-16T00:00:00.000Z
tags:
  - dotnet
  - csharp
image: true
translate: true

---

I had been away from C# for about seven years, and I recently started using C# again for a developer site. That led me to wonder: what DI containers are available in modern C#?

When I used it before, there were Castle Windsor, Unity (not to be confused with the Unity game engine), Seasar, and so on (in fact, there once was a .NET version of Seasar).

Castle Windsor page  
[https://www.castleproject.org/projects/windsor/](https://www.castleproject.org/projects/windsor/)

Since .NET Core, it seems that Microsoft’s own DI container has appeared. There also appear to be AUTOFAC and Ninject.

AUTOFAC page  
[https://autofac.org/](https://autofac.org/)

Ninject page  
[http://www.ninject.org/](http://www.ninject.org/)

There are various options, but I thought Microsoft’s offering would be the easiest to get started with, and indeed it was.

Therefore, in this article, I will explain how to use Microsoft’s Microsoft.Extensions.DependencyInjection with sample code.

## What is a DI Container?

Let’s review what a DI (Dependency Injection) container is.

DI (Dependency Injection) containers are libraries that automate object creation, lifecycle management, and dependency injection. They decouple code, making it easier to modify and test.

The main benefits of using a DI container are:

- Reduces the effort required to make changes when specifications change.
- Makes testing easier by replacing classes with test-specific ones (known as mocks).
- Clarifies which components depend on which, making the system structure easier to understand.

For example, consider the following sample code where object creation is hard-coded:

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

It’s simple code, so you might not mind, but imagine you want to replace the `SampleWriter` class with a different class.

Then you’d have to review every location where a `SampleWriter` object is used (the scope of revisions depends on the specifications).

This is where DI containers come in. Think of a DI container as a “universal warehouse” that provides all the objects you need.

You configure the DI container by telling it “for this interface, use this class.” The DI container then automatically creates and supplies the required objects based on those settings.

For example, you can modify the sample code as follows:

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

You receive the object from the DI container as a constructor parameter and use the interface `ISampleWriter` as the type.

Even if you replace the `SampleWriter` class with another class, since you depend on the `ISampleWriter` interface, you only need to change the DI container configuration.

## What is Microsoft.Extensions.DependencyInjection?

Microsoft.Extensions.DependencyInjection is Microsoft’s official DI container. You can start using it immediately by installing it from NuGet. There is also extensive official documentation from Microsoft.

It provides all the essential features, is lightweight and simple, and above all, I found coding with it very straightforward. You only need to add a few lines to the auto-generated `Program.cs` when creating your project.

Microsoft.Extensions.DependencyInjection is a DI container with a low barrier to entry for C#.

```cs:WebAppSample
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllersWithViews();
builder.Services.AddTransient<ISampleProc, SamplePoc>();

var app = builder.Build();
```

## Key Concepts

### Services

A service is an instance that is injected as a dependency.

For example, if you configure the interface `ISampleProc` to receive an instance of the `SampleProc` class, then a `SampleProc` instance is the service.

Services have the following three lifecycles:

|Type|Overview|
|----|--------|
|Transient|Literally “temporary.”<br>A new instance is created each time the service is requested.<br>Suitable for services that perform transient operations or should not hold state.|
|Scoped|An instance is created only once within a specific scope.<br>For example, an HTTP request in a web app (request scope) or the entire application (application scope).|
|Singleton|An instance is created only once for the entire application.|

### Container

The container is where you register the mappings between interfaces and objects (and their scopes), such as saying “if `ISampleProc` is requested, provide a `SampleProc` instance.”

### Service Provider

The service provider resolves dependencies based on the registrations in the container.

When creating an object of a class, if that class has an interface that needs dependency injection, the service provider will create and inject the object.

Words are abstract, so let’s look at code.

Consider the case where the service provider creates an object of the `DiSample` class.

This class depends on `ISampleProc`. When the service provider instantiates `DiSample`, it sees `ISampleProc` in the constructor and creates a `SampleProc` instance as well.

```cs:DiSample
public class DiSample
{
    private ISampleProc _sampleProc;

    // Constructor injection
    public DiSample(ISampleProc sampleProc)
    {
        _sampleProc = sampleProc;
    }
}
```

Furthermore, the service provider resolves dependencies by chaining them. Consider the case where `SampleProc` has an `IDbConnection`.

```cs:DiSample
public class SampleProc
{
    private IDbConnection _dbConnection;

    // Constructor injection
    public SampleProc(IDbConnection dbConnection)
    {
        _dbConnection = dbConnection;
    }
}
```

When the service provider creates `DiSample`, as mentioned before, it sees `ISampleProc` and determines it needs to create `SampleProc`.

Then it sees that `SampleProc` has an `IDbConnection` and decides that a `DbConnection` needs to be created.

In this way, the service provider resolves dependencies in a chain and creates the objects. How convenient!

## How to Register Services

### AddSingleton

To register a service with the Singleton lifecycle, write:

```cs:SingletonSample
services.AddSingleton<ISampleProc, SampleProc>();
```

### AddScoped

To register a service with the Scoped lifecycle, write:

```cs:ScopedSample
services.AddScoped<ISampleProc, SampleProc>();
```

### AddTransient

To register a service with the Transient lifecycle, write:

```cs:TransientSample
services.AddTransient<ISampleProc, SampleProc>();
```

### How to Register Multiple Objects

Microsoft.Extensions.DependencyInjection allows you to register multiple implementations for the same interface. In that case, the settings added later overwrite earlier ones, and the last one added is used.

However, if you resolve using `IEnumerable<{SERVICE}>`, you can obtain all registered objects.

Let’s look at sample code. First, register two implementations for `ISampleProc`:

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
        // In this case, a SampleProcess object is passed
    }
}
```

```cs:ResolveSampleEnumerable
public class ResolveSample
{
    public ResolveSample(IEnumerable<ISampleProc> sampleProcs)
    {
        // In this case, the IEnumerable contains both SampleProc and SampleProcess objects
        // In other words, it’s passed as a collection with two items
    }
}
```

## Practical Explanation with Sample Code

### Interfaces and Classes to Register as Services

First, let’s present sample code for the interfaces and classes to register as services.

By changing the class of the injected object for a single interface, we can switch between displaying Hello World and Morning World. We also include a sample that registers multiple classes for one interface using `IEnumerable`.

Below is the sample code for the interface and classes that display Hello World and Morning World. The namespace is `DIConsoleApp`, but adjust it to match your project or directory name.

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

Next, here’s sample code that injects these classes via the constructor:

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

Here’s sample code for when multiple classes are registered for one interface and you want to retrieve multiple objects:

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

### Console App

Let’s try DI in a console app first, because starting with something simple makes it easier to understand.

Create a console app project, then create the interfaces and classes and copy and paste the sample code provided above.

Once that’s done, write the DI configuration in `Program.cs`:

```cs:Program.cs
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using DIConsoleApp;

// Create the builder
HostApplicationBuilder builder = Host.CreateApplicationBuilder(args);

// Register services
builder.Services.AddTransient<ISampleProc, SampleProc>();
builder.Services.AddTransient<ISampleProc, SampleProcEnumerable>();
builder.Services.AddTransient<IMessageCreator, MessageCreatorHello>();
builder.Services.AddTransient<IMessageCreator, MessageCreatorMorning>();

// Build the host
IHost host = builder.Build();

// Retrieve and use the service
ISampleProc sampleProc = host.Services.GetRequiredService<ISampleProc>();
sampleProc.DisplayMessage();
```

Try running with the service registration section changed like the following, using the class that doesn’t use `IEnumerable`:

```cs:Program.cs (excerpt)
// Register services
builder.Services.AddTransient<ISampleProc, SampleProc>();
//builder.Services.AddTransient<ISampleProc, SampleProcEnumerable>();
builder.Services.AddTransient<IMessageCreator, MessageCreatorHello>();
//builder.Services.AddTransient<IMessageCreator, MessageCreatorMorning>();
```

If “Hello, World!” appears in the console, you’re good.

Now change it to use the Morning World class and run:

```cs:Program.cs (excerpt)
// Register services
builder.Services.AddTransient<ISampleProc, SampleProc>();
//builder.Services.AddTransient<ISampleProc, SampleProcEnumerable>();
//builder.Services.AddTransient<IMessageCreator, MessageCreatorHello>();
builder.Services.AddTransient<IMessageCreator, MessageCreatorMorning>();
```

This time, “Morning, World!” is displayed.

Next, let’s register both the Hello World class and the Morning World class:

```cs:Program.cs (excerpt)
// Register services
builder.Services.AddTransient<ISampleProc, SampleProc>();
//builder.Services.AddTransient<ISampleProc, SampleProcEnumerable>();
builder.Services.AddTransient<IMessageCreator, MessageCreatorHello>();
builder.Services.AddTransient<IMessageCreator, MessageCreatorMorning>();
```

In this case, it’s last-wins, so “Morning, World!” is displayed.

Next, let’s try `IEnumerable`. Change the code as follows and run:

```cs:Program.cs (excerpt)
// Register services
//builder.Services.AddTransient<ISampleProc, SampleProc>();
builder.Services.AddTransient<ISampleProc, SampleProcEnumerable>();
builder.Services.AddTransient<IMessageCreator, MessageCreatorHello>();
builder.Services.AddTransient<IMessageCreator, MessageCreatorMorning>();
```

In `SampleProcEnumerable`, it uses the object at index 0, as shown below. Therefore, the first-registered `MessageCreatorHello` object is injected. If you change the index to 1, the second-registered class object will be injected:

```cs:SampleProcEnumerable.cs (excerpt)
public SampleProcEnumerable(IEnumerable<IMessageCreator> messageCreators)
{
    _messageCreator = messageCreators.ToArray()[0];
}
```

### Web App

#### DI Configuration for a Web App

Let’s try it with a web app this time. In reality, there are probably more web app projects, so you should know how to use DI in a web app.

In this article, we’ll use Razor Pages for the explanation. For what Razor is, refer to this article:

[Efficient Web Development with C# and Razor! Thorough Guide with Sample Code](https://developer.mamezou-tech.com/blogs/2025/08/25/csharp_razor/)

Create a Razor Pages app project, then create the interfaces and classes, and copy and paste the sample code provided above.

Then open `Program.cs`. It should look like this:

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

Surprisingly, in a Razor Pages app project’s `Program.cs`, the builder used by Microsoft.Extensions.DependencyInjection is already set up. Razor Pages are registered as services just like other DI settings.

This highlights how easy it is to get started with Microsoft.Extensions.DependencyInjection. Its mechanisms are unified with commonly used C# technologies like Razor Pages.

Write the DI settings before registering Razor Pages. Here’s the sample code. The part commented “// Register services” corresponds to this:

```cs:Program.cs
using DIConsoleApp;

var builder = WebApplication.CreateBuilder(args);

// Register services
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

#### Verifying the Web App

For a web app, you need to create pages for verification. Modify Index and create two Razor Pages named SampleProc and SampleProcEnumerable. The page navigation flow looks like this:

![Sample page navigation for the web app](/img/dotnet/csharp_di/SamplePageStructure.png)  
*Sample page navigation for the web app*

Here’s the sample code. First, add two anchor tags to `Index.cshtml`:

```cs:Index.cshtml
<div class="text-center">
    <h1 class="display-4">Welcome</h1>
    <p>Learn about <a href="https://learn.microsoft.com/aspnet/core">building Web apps with ASP.NET Core</a>.</p>
    <p><a href="/SampleProc">SampleProc</a></p>
    <p><a href="/SampleProcEnumerable">SampleProcEnumerable</a></p>
</div>
```

Then create SampleProc (the “last-wins” page) and SampleProcEnumerable (the IEnumerable page). First, here’s the sample code for SampleProc:

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

Next, here’s the sample code for SampleProcEnumerable (the page using IEnumerable):

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

When you start debugging, the Index page is displayed first.

Then access SampleProc and SampleProcEnumerable and verify, as with the console app earlier, that the last-wins behavior and IEnumerable functionality work as expected.

## Conclusion

I felt that while C# has very useful technologies like LINQ and Razor, its DI containers weren’t that great.

However, after trying Microsoft.Extensions.DependencyInjection, I realized that C# does have a DI container that is easy to work with.

Back when I used Castle Windsor, I had to write more complex code in the class corresponding to today’s `Program.cs` in .NET MVC, and I wrote verbose DI configurations in XML.

Compared to that, Microsoft.Extensions.DependencyInjection makes it clear where to write the configuration and keeps it simple. With this, the barrier to adoption is low.

If you’re unsure which DI container to use when developing in C#, why not try Microsoft.Extensions.DependencyInjection? I hope this article helps you get started.
