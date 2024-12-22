---
title: 'Introduction to Blazor: The Latest Web Development Starting with ASP.NET Core'
author: yasunori-shiota
date: 2024-12-20T00:00:00.000Z
tags:
  - dotnet
  - advent2024
image: true
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2024/
translate: true

---

This is the article for Day 20 of the [Mamezou Developer Site Advent Calendar 2024](/events/advent-calendar/2024/).

Come to think of it, I started wondering, "What's been happening with .NET lately?", so I'd like to write an article related to the latest LTS version, .NET 8.0.

In the past few years, I've had many opportunities to use Java in development projects, and it's been about 10 years since I last touched .NET. During this decade, .NET has evolved significantly; the .NET limited to Windows became cross-platform with the release of .NET Core[^1].

[^1]: The name ".NET Core" was renamed to ".NET" with the release of version 5.0 (the "Core" was dropped from the name).

Among them, this time I would like to focus on ASP.NET Core Blazor (hereafter referred to as Blazor), which did not exist 10 years ago.

:::info
Just last month, on November 12, 2024, .NET 9.0 was released, but since this is an STS (**S**tandard **T**erm **S**upport) version, in this post, as mentioned earlier, I will use the LTS version .NET 8.0.

For the new features added in .NET 9.0, please refer to the following official sites:

- [.NET 9 New Features](https://learn.microsoft.com/ja-jp/dotnet/core/whats-new/dotnet-9/overview)
- [What's New in ASP.NET Core 9.0](https://learn.microsoft.com/ja-jp/aspnet/core/release-notes/aspnetcore-9.0?view=aspnetcore-9.0)

:::

## What is Blazor

First, let me explain what Blazor is.

In simple terms, it's a framework for developing Web UIs using C#. With Blazor, you can build rich and interactive Web UIs using C# and .NET instead of JavaScript or TypeScript.

In this way, with the advent of Blazor, being able to develop from frontend to backend using a single programming language—namely, C#—can be considered a great advantage for developers.

## The Two Execution Models of Blazor

Blazor has two execution models: "Blazor WebAssembly" and "Blazor Server." A feature of Blazor is that it can run these two different models with almost the same code.

The following diagram illustrates the two execution models.

![The Two Execution Models of Blazor](https://i.gyazo.com/4ba0bb914c6f958b6f71fdc394ca5765.png)

Blazor WebAssembly is a client-centric execution model. Based on the standard technology called WebAssembly, Blazor applications run on the browser. Since the Blazor application and its dependent libraries are downloaded to the browser, there is some overhead during initial startup. However, once started, a constant connection to the network is not required.

On the other hand, Blazor Server, as its name suggests, is a server-centric execution model. Only the Document Object Model (DOM) is returned to the browser, and processing requests are made to the server-side in response to operations on the UI. Using a real-time communication library called "SignalR," changes between the client and server can be reflected immediately to each other. Due to this nature, initial startup is fast, but a constant connection to the network is required.

## Blazor United Added in .NET 8.0

Blazor United is a feature introduced in .NET 8.0 that allows switching between four rendering modes for each page or some components. The four rendering modes in Blazor United are as follows:

1. Static Server Side Rendering (Static SSR)
2. Interactive Server
3. Interactive WebAssembly
4. Interactive Auto

Until now, when developing web applications with Blazor, you had to choose one of the two execution models mentioned earlier at the application level. With the introduction of Blazor United, it has become possible to use multiple rendering modes within a single application.

:::info What is 'Interactive'?
'Interactive' refers to the application immediately performing some processing in response to user actions on the screen. For example, in cases where processing is performed when a button is pressed or during input into a textbox, it is necessary to select an interactive rendering mode.
:::

:::alert
Please note that the term "Blazor United" seems to be a colloquial term, apparently used during the development of .NET 8.0. This name is not currently used in Microsoft's official sites or .NET 8.0 product documentation for Blazor. In this post, I will use the name Blazor United to distinguish it from Blazor WebAssembly and Blazor Server. Thank you for your understanding.
:::

## The Rendering Modes of Blazor United

Now, let's take a look at each of the rendering modes in Blazor United.

### 1. Static SSR

Static SSR is a rendering mode similar to the Razor pages of ASP.NET MVC before Blazor appeared. It means that the rendering process is performed only once on the server side and then returned to the client. It can be used on pages where interactive operations are not required after the page is displayed.

![StaticSSR](https://i.gyazo.com/5f5c414f6de992a9a481c497e4514056.png)

### 2. Interactive Server

This is almost the same execution model as the conventional Blazor Server, where the code blocks (C# code parts) of Razor pages are executed on the server side. Communication between the client and server is linked via a SignalR connection, and rendering is performed on the client-side browser.

From .NET 8.0, with Blazor United, you can specify the SignalR connection at the page or component level. Previously, the SignalR connection was maintained throughout the same session from the browser's startup to shutdown. This has been improved in .NET 8.0 so that the SignalR connection and related server resources are released when the page switches.

![InteractiveServer](https://i.gyazo.com/5b2faf8ae97ad00cf07c4923b4dd973a.png)

### 3. Interactive WebAssembly

This execution model is almost the same as the conventional Blazor Assembly, where processing is performed within the browser using WebAssembly. In cases where only this mode is used throughout the application, server-side processing becomes completely unnecessary, allowing you to deploy the Blazor application on a static web server.

![InteractiveWasm](https://i.gyazo.com/79ef926f0c64bd6b8bebf759fab9dd32.png)

### 4. Interactive Auto

In Blazor WebAssembly, there was an issue where the initial startup was slow, and Interactive Auto solves this problem.

When the first page is called, it operates in Interactive Server mode while the WebAssembly modules are downloaded in the background. Once all the WebAssembly modules are cached on the browser side, it operates within the browser thereafter.

![InteractiveAuto](https://i.gyazo.com/0aa3a95fd757c4c152e0bb3db65b5e5e.png)

## How to Proceed with Blazor App Development

With the introduction of Blazor United, it doesn't mean that developing applications with the traditional Blazor WebAssembly or Blazor Server is no longer done. Even in .NET 8.0, it is possible to choose the traditional development models, and I think it's best to select the optimal development model according to the characteristics of the development project or system.

Here, I would like to introduce how to proceed with the development of each Blazor application using Visual Studio.

| Development Model        | Overview                                                                      |
|--------------------------|-------------------------------------------------------------------------------|
| Blazor WebAssembly Type  | A method of development using only the client-side rendering mode             |
| Blazor Server Type       | A method of development using only the server-side rendering mode             |
| Blazor United Type       | A method of development combining multiple rendering modes in one application |

I apologize, but this time I will limit the content to the preparation for Blazor application development using Visual Studio's project templates. Therefore, I will explain the project structure and individual elements at another opportunity.

:::info
For Visual Studio, I will use the free version, "Visual Studio Community 2022." Currently, since "Visual Studio for Mac" has been discontinued, Visual Studio is limited to Windows environments. In environments outside Windows, you can perform the same tasks as Visual Studio by using the code editor Visual Studio Code. I will introduce this on another occasion as well.
:::

### Blazor WebAssembly Type App

To develop a traditional Blazor WebAssembly type application using Visual Studio, select "Blazor WebAssembly App" in the project templates.

![Blazor WebAssembly Project](https://i.gyazo.com/0fc00c934151a063e1b31a8d91bda4e1.png)

For the additional information, you can leave it as default. By selecting "Include sample pages," sample applications will be added when the project is created.

![Blazor WebAssembly Additional Information](https://i.gyazo.com/61131f268b9e098675f68120b1504f07.png)

The project structure of Blazor WebAssembly type is as follows. As mentioned earlier, I will explain the individual elements within the project at another opportunity.

![Blazor WebAssembly Solution](https://i.gyazo.com/a95bbe67b3caad6ecb4638c72f43427a.png)

If you run it as is without making any changes, a web application like the following will start.

![Blazor WebAssembly App](https://i.gyazo.com/8d0b77f1ad537f61a6f4856116e38d21.png)

### Blazor Server Type App

To develop a traditional Blazor Server type application, select "Blazor Web App" in the project templates.

![Blazor Server Project](https://i.gyazo.com/866909fcc6b1c0c494801102e9f4775a.png)

There is also a project template called "Blazor Server App," but please note that this is not supported in .NET 8.0.

![Blazor Server Old Project](https://i.gyazo.com/da0c3436b984b2b5d8a714185469af7c.png)

In the additional information, please select the following two options. This allows you to develop a Blazor application using only the server-side rendering mode.

- Interactive render mode: `Server`
- Interactivity location: `Global`

![Blazor Server Additional Information](https://i.gyazo.com/6ecf5d9aed918924efaf6bac9cbba493.png)

The project structure of Blazor Server type is as follows.

![Blazor Server Solution](https://i.gyazo.com/acb35cd66b2caca273bd5424b5b62814.png)

Compared to the Blazor WebAssembly type, server-specific `Routes.razor`, `appsettings.json`, and the error page `Error.razor` have been added.

Note that the web application that starts is the same as the Blazor WebAssembly type, so I will omit it.

### Blazor United Type App

To develop a Blazor United type application introduced in .NET 8.0, select "Blazor Web App" in the project templates.

![Blazor United Project](https://i.gyazo.com/866909fcc6b1c0c494801102e9f4775a.png)

In the additional information, please select the following two options. This allows you to develop a Blazor application that combines four types of rendering modes.

- Interactive render mode: `Auto(Server and WebAssembly)`
- Interactivity location: `Per page/component`

![Blazor United Additional Information](https://i.gyazo.com/6730f8851679db92bf7f612664563b11.png)

The project structure of Blazor United type is as follows.

![Blazor United Solution](https://i.gyazo.com/a808e392768fcc832020430c81d0c3ea.png)

Compared to the project structures of Blazor WebAssembly type and Blazor Server type, you can see that two projects have been created.

Note that the web application that starts is the same as the others, so I will omit it.

:::info
By using the following additional information in the "Blazor Web App" project template, you can develop a Blazor application using only the client-side rendering mode.

- Interactive render mode: `WebAssembly`
- Interactivity location: `Global`

However, since the runtime behavior differs from when you use the "Blazor WebAssembly App" project template mentioned earlier, please choose the appropriate one after understanding both mechanisms. Regarding this, I also plan to explain it in detail on another occasion.
:::

## In Conclusion

This time, I wrote about an overview of ASP.NET Core Blazor.

With the introduction of Blazor United in .NET 8.0, it is said to have evolved into a full-stack web UI framework. Although it's still limited now, I hope that Blazor will be included as an option when developing web applications in the near future.

On the other hand, I also got the impression that it has become somewhat more complex with the introduction of Blazor United. Previously, I remember that even engineers like me could develop with .NET without hesitation, but with the current Blazor, I felt the need for certain design policies and guidelines. I would like to clarify these selection criteria and ways of thinking in future posts.

Thank you very much for reading to the end. I hope you look forward to the next post.

:::info
Initially, I planned to explain the overview of Blazor and then add explanations about the project structure and individual elements of Blazor applications, but this time I exhausted myself just organizing the overview of Blazor in ASP.NET Core 8.0. Also, as I wrote at the beginning, since it's been about 10 years since I touched .NET, I also spent a lot of time on SignalR and Razor Pages, which are peripheral technologies of Blazor. I think that with just the overview, you might not get an implementation image of Blazor applications, so I plan to continue posting articles related to Blazor regularly.
:::
