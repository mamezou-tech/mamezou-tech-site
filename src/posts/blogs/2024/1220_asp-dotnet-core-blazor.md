---
title: はじめての ASP.NET Core Blazor アプリ（概要編）
author: yasunori-shiota
date: 2024-12-20
tags: [dotnet, advent2024]
image: true
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2024/
---

これは[豆蔵デベロッパーサイトアドベントカレンダー2024](/events/advent-calendar/2024/)第20日目の記事です。

そう言えば「最近の.NETってどうなっているのかなぁ？」と気になりだしたので、最新のLTS版である.NET 8.0に関した記事を書きたいと思います。

ここ数年の開発プロジェクトではJavaを利用する機会が多く、筆者が.NETに触れるのは約10年ぶりとなります。
この10年の間で.NETも大きな進化を遂げ、Windowsに限定された.NETは、.NET Core[^1]のリリースによってクロスプラットフォームにも対応されました。

[^1]: 「.NET Core」という名称は、バージョン 5.0のリリースと共に「.NET」に改名されました（名称から「Core」が外されました）。

その中でも今回は、10年前には存在しなかったASP.NET Core Blazor（以下、Blazor）というものについて取り上げたいと思います。

:::info
つい先月、2024年11月12日には.NET 9.0がリリースされましたが、これはSTS（**S**tandard **T**erm **S**upport）版となりますので、本投稿においては先述のとおり、LTS版の.NET 8.0を利用させていただきます。
なお、.NET 9.0で追加された新機能につきましては、次の公式サイトをご参照いただければと思います。

- [.NET 9 の新機能](https://learn.microsoft.com/ja-jp/dotnet/core/whats-new/dotnet-9/overview)
- [ASP.NET Core 9.0 の新機能](https://learn.microsoft.com/ja-jp/aspnet/core/release-notes/aspnetcore-9.0?view=aspnetcore-9.0)

:::

## Blazorとは

まず、Blazorとは何かについて説明させていただきます。

簡単に言ってしまえば、C#でWeb UIを開発するためのフレームワークです。
Blazorでは、JavaScriptやTypeScriptの代わりに、C#と.NETを使ってリッチかつインタラクティブなWeb UIを構築することが可能となります。

このように、Blazorの登場によってフロントエンドからバックエンドまでをひとつのプログラミング言語、つまりC#のみで開発できるのは開発者にとって大きなメリットと言えるでしょう。

## Blazorの2つの実行モデル

Blazorには、「Blazor WebAssembly」と「Blazor Server」の2つの実行モデルがあります。
Blazorの特徴としては、ほぼ同じコードでこの2つの異なるモデルを動作させることができます。

2つの実行モデルのイメージを示したものが次の図となります。

![Blazorの2つの実行モデル](https://i.gyazo.com/4ba0bb914c6f958b6f71fdc394ca5765.png)

Blazor WebAssemblyは、クライアント中心の実行モデルとなります。WebAssemblyという標準技術に基づいてBlazorアプリケーションがブラウザ上で動作します。
Blazorアプリケーションと、依存関係のあるライブラリをブラウザにダウンロードするため、初期起動には若干のオーバーヘッドが発生します。ですが、一度起動してしまえば、ネットワークとの常時接続を必要としません。

一方、Blazor Serverはその名のとおり、サーバー中心の実行モデルとなります。文書ツリー（DOM）だけがブラウザに返却され、UI上の操作に応じてサーバーサイドへ処理を要求します。
「SignalR」と呼ばれるリアルタイム通信のライブラリによって、クライアントとサーバー間の変更は互いに即時反映することが可能となります。この性質上、初期起動は高速な反面、ネットワークとの常時接続は必要となります。

## .NET ８.0で追加されたBlazor United

Blazor Unitedとは、.NET 8.0から導入された機能で、ページや一部のコンポーネントごとに4つのレンダリングモードを切り替えることが可能となりました。
Blazor Unitedにおける4つのレンダリングモードは次のとおりです。

1. 静的 Server Side Rendering（Static SSR）
2. 対話型サーバー（Interactive Server）
3. 対話型WebAssembly（Interactive WebAssembly）
4. 対話型オート（Interactive Auto）

これまで、BlazorでWebアプリケーションを開発する際には、先述の2つの実行モデルのうち、アプリケーションの単位でどちらか一方を選択する必要がありました。
これがBlazor Unitedの導入によって、ひとつのアプリケーションで複数のレンダリングモードを使い分けることができるようになりました。

:::info:対話型とは？
対話型とは、ユーザーによる画面操作などに対して、即座にアプリケーションが何らかの処理を行うことを指しています。
たとえば、ボタンを押下したときやテキストボックスへの入力のタイミングで処理を行うケースにおいては、対話型のレンダリングモードを選択する必要があります。
:::

:::alert
「Blazor United」というのは俗称のようで、.NET 8.0の開発時に付けられた名称のようです。
Microsoftの公式サイトや.NET 8.0の製品ドキュメントなど、現在のBlazorにはこの名称が使用されていない点にご注意ください。
なお、本投稿においては、Blazor WebAssemblyやBlazor Serverと区別するために、Blazor Unitedの名称を使用させていただきます。
ご理解いただきたく存じます。
:::

## Blazor Unitedのレンダリングモード

それでは、Blazor Unitedにおけるそれぞれのレンダリングモードについて見ていくことにしましょう。

### 1．Static SSR

Static SSRは、Blazorが登場する前のASP.NET MVCのRazorページに近いレンダリングモードとなります。
サーバーサイドで一度だけレンダリング処理が行われて、それがクライアントに返却されるというものです。
ページの表示後に対話的な操作が不要なページで利用することができます。

![StaticSSR](https://i.gyazo.com/5f5c414f6de992a9a481c497e4514056.png)

### 2．Interactive Server

従来のBlazor Serverとほぼ同じ実行モデルで、Razorページのコードブロック（C#のコード部分）がサーバーサイドで実行されます。
クライアントとサーバー間はSignalR回線によって連携され、描画はクライアントサイドのブラウザ側で行われます。

.NET 8.0からはBlazor Unitedによって、SignalRの回線をページやコンポーネントの単位に指定することができます。
以前は、ブラウザの起動から終了までの同一セッションにおいて、SignalR回線を張り続けていました。これが.NET 8.0で改善され、ページが切り替わるタイミングでSignalR回線と、それに関連するサーバーリソースが解放されるようになりました。

![InteractiveServer](https://i.gyazo.com/5b2faf8ae97ad00cf07c4923b4dd973a.png)

### 3．Interactive WebAssembly

従来のBlazor Assemblyとほぼ同じ実行モデルで、WebAssemblyを使ってブラウザ内で処理が行われます。
アプリケーション全体でこのモードしか利用しないケースでは、サーバーサイドの処理が完全に不要になるため、静的なWebサーバー上にBlazorアプリケーションを配置することもできます。

![InteractiveWasm](https://i.gyazo.com/79ef926f0c64bd6b8bebf759fab9dd32.png)

### 4．Interactive Auto

Blazor WebAssemblyでは、初回の起動が遅いという問題がありましたが、これを解決するのがInteractive Autoとなります。

初回のページが呼び出された際はInteractive Serverモードで動作しながら、バックグラウンドでWebAssemblyモジュールがダウンロードされます。
ブラウザ側にすべてのWebAssemblyモジュールがキャッシュされると、その後はブラウザ内で動作します。

![InteractiveAuto](https://i.gyazo.com/0aa3a95fd757c4c152e0bb3db65b5e5e.png)

## Blazorアプリの開発の進め方

Blazor Unitedが導入されたことで、従来のBlazor WebAssemblyやBlazor Serverでアプリケーションを開発することはなくなったかと言うと、そんなことはありません。
.NET 8.0においても、従来の開発モデルを選択することは可能ですし、開発プロジェクトやシステムの特性に応じて最適な開発モデルを選択するのが良いと考えます。

ここでは、Visual Studioを用いて、各Blazorアプリケーションの開発の進め方についてご紹介したいと思います。

|開発モデル|概要|
|:----|:----|
|Blazor WebAssembly型|クライアントサイドのレンダリングモードのみを用いて開発する方法|
|Blazor Server型|サーバーサイドのレンダリングモードのみを用いて開発する方法|
|Blazor United型|1つのアプリケーションの中で複数のレンダリングモードを組み合わせて開発する方法|

誠に勝手ながら今回は、Visual Studioのプロジェクトテンプレートによる、Blazorアプリケーションの開発準備までとさせていただきます。
このため、プロジェクト構成や個々の要素につきましては、改めましてまたの機会に説明させていただきます。

:::info
Visual Studioには、無償版の「Visual Studio Community 2022」を利用させていただきます。
現在、「Visual Studio for Mac」が廃止となったため、Visual StudioはWindows環境のみに限定されます。
Windows外の環境ではコードエディターのVisual Studio Codeを利用することで、Visual Studioと同等のことが行えます。
こちらにつきましても、またの機会に紹介させていただきます。
:::

### Blazor WebAssembly型アプリ

Visual Studioを用いて、従来のBlazor WebAssembly型のアプリケーションを開発するには、プロジェクトテンプレートに「Blazor WebAssembly アプリ」を選択します。

![Blazor WebAssembly プロジェクト](https://i.gyazo.com/0fc00c934151a063e1b31a8d91bda4e1.png)

追加情報は次のとおり、デフォルトのままで構いません。
「Include sample pages」を選択することで、プロジェクトの作成時にサンプルアプリケーションが追加されます。

![Blazor WebAssembly 追加情報](https://i.gyazo.com/61131f268b9e098675f68120b1504f07.png)

Blazor WebAssembly型のプロジェクト構成は、次のようになります。
なお、先述のとおり、プロジェクト内の個々の要素につきましては、またの機会に説明させていただきます。

![Blazor WebAssembly ソリューション](https://i.gyazo.com/a95bbe67b3caad6ecb4638c72f43427a.png)

何も手を加えずにそのままを実行すると、次のようなWebアプリケーションが起動します。

![Blazor WebAssembly アプリ](https://i.gyazo.com/8d0b77f1ad537f61a6f4856116e38d21.png)

### Blazor Server型アプリ

従来のBlazor Server型のアプリケーションを開発するには、プロジェクトテンプレートに「Blazor Web App」を選択します。

![Blazor Server プロジェクト](https://i.gyazo.com/866909fcc6b1c0c494801102e9f4775a.png)

この他に、「Blazor Server アプリ」というプロジェクトテンプレートがありますが、こちらは.NET 8.0ではサポートされていませんのでご注意ください。

![Blazor Server 旧プロジェクト](https://i.gyazo.com/da0c3436b984b2b5d8a714185469af7c.png)

追加情報では、次の2つを選択してください。これにより、サーバーサイドのレンダリングモードのみのBlazorアプリケーションを開発することができます。

- Interactive render mode : `Server`
- Interactivity location : `Global`

![Blazor Server 追加情報](https://i.gyazo.com/6ecf5d9aed918924efaf6bac9cbba493.png)

Blazor Server型のプロジェクト構成は、次のようになります。

![Blazor Server ソリューション](https://i.gyazo.com/acb35cd66b2caca273bd5424b5b62814.png)

Blazor WebAssembly型と比較すると、サーバー固有の`Routes.razor`、`appsettings.json`と、エラーページの`Error.razor`が追加されました。

なお、起動するWebアプリケーションはBlazor WebAssembly型と同様であるため、割愛させていただきます。

### Blazor United型アプリ

.NET 8.0で導入されたBlazor United型のアプリケーションを開発するには、プロジェクトテンプレートに「Blazor Web App」を選択します。

![Blazor United プロジェクト](https://i.gyazo.com/866909fcc6b1c0c494801102e9f4775a.png)

追加情報では、次の2つを選択してください。これにより、4種類のレンダリングモードを組み合わせたBlazorアプリケーションを開発することができます。

- Interactive render mode : `Auto(Server and WebAssembly)`
- Interactivity location : `Per page/component`

![Blazor United 追加情報](https://i.gyazo.com/6730f8851679db92bf7f612664563b11.png)

Blazor United型のプロジェクト構成は、次のようになります。

![Blazor United ソリューション](https://i.gyazo.com/a808e392768fcc832020430c81d0c3ea.png)

Blazor WebAssembly型やBlazor Server型のプロジェクト構成と比べると、2つのプロジェクトが作成されているのがわかると思います。

なお、起動するWebアプリケーションは他と同様であるため、割愛させていただきます。

:::info
「Blazor Web App」のプロジェクトテンプレートで、次の追加情報により、クライアントサイドのレンダリングモードのみのBlazorアプリケーションを開発することができます。

- Interactive render mode : `WebAssembly`
- Interactivity location : `Global`

ですが、先述の「Blazor WebAssembly アプリ」のプロジェクトテンプレートを用いたときと実行時の動作が異なるため、双方の仕組みを理解したうえで適切な方を選択してください。
なお、こちらに関しましても、またの機会に詳しく説明したいと考えています。
:::

## 最後に

今回は、ASP.NET Core Blazorの概要について書かせていただきました。

.NET 8.0でBlazor Unitedが導入され、フルスタックなWeb UIフレームワークに進化したと言われています。
今はまだ少ないですが、近い将来、Webアプリケーションを開発するうえでの選択肢にBlazorが含まれることを願いたいと思います。

その一方で、Blazor Unitedの導入によって幾分、複雑化した印象も受けました。
以前は、筆者のようなエンジニアでも.NETであれば迷うことなく開発できたと記憶していましたが、現在のBlazorにおいては一定の設計方針やガイドラインなどの必要性を感じました。
このあたりの選定基準や考え方につきましては、次回以降の投稿で明らかにしていきたいと思います。

それでは、最後までご覧いただきありがとうございました。次回を楽しみにお待ちいただけると幸いでございます。

:::info
当初の予定ではBlazorの概要を説明したうえで、Blazorアプリケーションのプロジェクト構成や個々の要素に対する説明を加えたかったのですが、今回はASP.NET Core 8.0におけるBlazorの概要を整理するだけで力尽きてしまいました。
また、冒頭にも書きましたとおり、.NETに触れるのが約10年ぶりというのもあって、Blazorの周辺技術となるSignalRやRazor Pagesなどにも多く時間を費やしてしまいました。
概要だけですと、Blazorアプリケーションの実装イメージを持てないと思いますので、引き続きBlazorに関する記事を定期的に投稿していきたいと考えています。
:::
