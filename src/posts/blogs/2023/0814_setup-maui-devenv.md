---
title: VS Code で .NET MAUI の開発環境を構築する(macOS/iOS)
author: masahiro-kondo
date: 2023-08-14
tags: [maui, .net, vscode]
---

## はじめに
先日終了した[夏のリレー連載2023](/events/season/2023-summer/)において[社内 Hackathon の紹介記事](/blogs/2023/07/25/hackathon/)が投稿されましたが、その後[年1回のオフラインイベント](https://note.com/mamezou_info/n/n3f7a83419c0f)が開催されました。最近ネタ切れ気味の筆者も参加して .NET MAUI の開発環境を構築してみたので記事にさせていただきます。

.NET MAUI は .NET Xamarin 後継のクロスプラットフォームなネイティブアプリケーションフレームワークです。iOS / Android のアプリはもちろん、Windows / Mac のデスクトップアプリケーションも開発できます。Xamarin 同様、XAML による宣言的な UI 定義と C# の partial class でアプリを構築します[^1]。

[^1]: XAML から生成されるコードと C# のコードで1つのクラスになります。

[.NET MAUI とは - .NET MAUI](https://learn.microsoft.com/ja-jp/dotnet/maui/what-is-maui)

:::info
.NET MAUI には、C# で Web アプリを開発できる Blazor というフレームワークも含まれてるそうです。Blazor は Web 標準のテクノロジー WASM(WebAssembly) で .NET の CLR を丸ごと動かすという力技で実現されています。元々は、ASP.NET の ビューエンジン Razor を使ってレンダリングを行っていました。MAUI に統合されてももこれは変わらない模様です。

[.NET MAUIBlazor Hybrid アプリを構築する | Microsoft Learn](https://learn.microsoft.com/ja-jp/aspnet/core/blazor/hybrid/tutorials/maui?view=aspnetcore-7.0&pivots=macos)
:::

:::column:XAML ファミリーの歴史
筆者は Visual C++ の時代から Microsoft の開発環境育ちで豆蔵に入ってからも .NET Framework を採用するプロジェクトにかなり参画しました。そのため Java エンジニアが主流の豆蔵で .NETer として異彩を放っていた(?)時期がありました。XAML を使った初のネイティブアプリフレームワーク WPF (Windows Presentation Foundation) が登場した時はそのモダンなプログラミングモデルに感動しましたし、ブラウザで動作するリッチクライアント[^2]フレームワーク Silverlight が登場した時もかなり技術投資していたものです(遠い目)。

[^2]: リッチクライアントという言葉もすっかり死語になってしまいました。

現在 WPF は現役なものの未だ Windows Forms を駆逐できておらず、Silverlight、Windows ストアアプリ・・と登場しては消えていった歴史があります[^3]。Xamarin も消えたのかと思いましたが MAUI へと発展進化したという位置付けのようです。

[^3]: Windows ストアアプリは UWP (Universal Windows Platform) として残っているらしいです。
:::


## .NET MAUI のインストール

Apple Silicon の MacBook Pro に環境を構築しました。iOS / iPadOS のアプリを開発するには、事前に Xcode と Xcode コマンドラインツールのインストールが必要です。Xcode コマンドラインツールのインストールは以下のコマンドで可能です[^4]。

```shell
xcode-select --install
```

[^4]: 一度も Xcode を起動していないとライセンスの承諾が未完了の状態なので Xcode コマンドラインツールのインストールに失敗するケースがあります。

:::info
Android をターゲットにする場合、別途 JDK と Android Studio のインストールが必要になります。
:::

次に環境に合わせた .NET をインストールします。

[macOS に .NET をインストールする - .NET](https://learn.microsoft.com/ja-jp/dotnet/core/install/macos)

以下のダウンロードページから、.NET 7.0 の macOS Arm64 のインストーラーをダウンロードして使用しました。

[https://dotnet.microsoft.com/ja-jp/download/dotnet/7.0](https://dotnet.microsoft.com/ja-jp/download/dotnet/7.0)

さらに MAUI の開発環境をインストールします。筆者の環境では sudo で実行する必要がありました。

```shell
sudo dotnet workload install maui
```

大量のアセンブリをダウンロードインストールするため、5分以上はかかりました。

以上で、.NET と .NET MAUI の準備は完了です。

:::info
後述の VS Code 用 .NET MAUI 拡張 をインストールした後に、ステップバイステップのインストラクションが出るのでそれに従えば環境は構築できるはずです。筆者は ESC キーを押してしまいインストラクションを見失ってしまいました。
:::

## VS Code の .NET MAUI 拡張をインストール

Xamarin 時代までは、ネイティブアプリの開発には VS Code ではなく本家 Visual Studio (for Windows / for Mac[^5]) が必要でした。当然 Visual Studio は MAUI 開発をサポートしていますが、VS Code の MAUI 拡張も提供され、Visual Studio は必須ではなくなりました[^6]。

[^5]: Visual Studio for Mac は Microsoft が買収した Xamarin の Xamarin Studio をベースにしていました。

[^6]: Linux 上でも開発ができることになります。

[Announcing the .NET MAUI extension for Visual Studio Code - Visual Studio Blog](https://devblogs.microsoft.com/visualstudio/announcing-the-dotnet-maui-extension-for-visual-studio-code/)

:::info
VS Code の .NET MAUI 拡張は、記事執筆時点ではプレビュー版となっています。
:::

.NET MAUI 拡張をインストールすると、依存する C# 拡張と C# Dev Kit 拡張もインストールされます。

![VS Code Extentions](https://i.gyazo.com/976bef132d50c369cece4f38139ab403.png)

## プロジェクト作成
プロジェクト作成は、.NET MAUI 拡張の機能を使っても可能ですが、筆者は dotnet CLI で作成しました。`MyMauiApp` というプロジェクト名で作成しています。

```shell
dotnet new maui -n "MyMauiApp"
```

作成したプロジェクトを VS Code で開くと、Visual Studio のようなソリューションエクスプローラーも追加されてコードをブラウズできます。通常のエクスプローラーは XAML と CS ファイルがフラットに並びますが、ソリューションエクスプローラーは XAML 配下に CS コードが展開される Visual Studio ユーザーにはお馴染みの形になっています。しかし XAML ファイルを開いても本家のように UI プレビューがレンダリングされたりはしませんでした。

![Solution Explorer](https://i.gyazo.com/3aa0a6c7e197be4bcdcb0aebaed14a08.png)

## アプリのデバッグ
デバッグボタンから、アプリの実行ができます。

![debug](https://i.gyazo.com/a0bea88e401d38a582dd405e39f2fa6f.png)

初回実行時には、デバッガーの選択メニューが出ますので、`.NET MAUI` を選びます。

![select debugger](https://i.gyazo.com/bc9f694474e5b387fd7aa0715d6b269d.png)

MAUI のアプリが起動します。

![MAUI App](https://i.gyazo.com/115ff2016e9edab94d6adf0e61a1ff5f.png)

`Click me` ボタンをクリックするとクリック回数がカウントアップされていきます。このボタンのイベントは、partial class である MainPage.xaml.cs の OnCounterClicked メソッドで実装されています。この箇所にブレークポイントを置きます。

![set break point](https://i.gyazo.com/469daffe328a207215d36b6f5c3ccbeb.png)

この状態でアプリの `Click me` ボタンをクリックすると、ブレークポイントで実行が止まりコールスタックを見たり、ウォッチ式で値を確認したりできます。

![break stop](https://i.gyazo.com/412bd73a370f967bec3afc4cf44a2cab.png)

## Simulator を使用した実行

dotnet CLI を使って iOS / iPadOS の Simulator でアプリを実行できます。以下のように実行します。

```shell
dotnet build -t:Run -f net7.0-ios
```

Simulator 起動後にアプリが立ち上がってきます。

![runs on simulator](https://i.gyazo.com/5fa622be942d1a724e1e82f48f6bf8df.png)

## ビルドエラーが発生した場合

筆者の環境では、最初 VS Code でも dotnet CLI でもビルドエラーになっていました。

```
MSBuild version 17.6.8+c70978d4d for .NET
  復元対象のプロジェクトを決定しています...
  /Users/kondoh/dev/MyMauiApp/MyMauiApp.csproj を復元しました (316 ms)。
/usr/local/share/dotnet/packs/Microsoft.iOS.Sdk/16.4.7089/tools/msbuild/iOS/Xamarin.Shared.targets(1746,3): error : Could not find a valid Xcode app bundle at '/Library/Developer/CommandLineTools'. Please update your Apple SDK location in Visual Studio's preferences (Projects > SDK Locations > Apple > Apple SDK). [/Users/kondoh/dev/MyMauiApp/MyMauiApp.csproj::TargetFramework=net7.0-ios]
/usr/local/share/dotnet/packs/Microsoft.iOS.Sdk/16.4.7089/tools/msbuild/iOS/Xamarin.Shared.targets(1746,3): error :          [/Users/kondoh/dev/MyMauiApp/MyMauiApp.csproj::TargetFramework=net7.0-ios]

ビルドに失敗しました。

/usr/local/share/dotnet/packs/Microsoft.iOS.Sdk/16.4.7089/tools/msbuild/iOS/Xamarin.Shared.targets(1746,3): error : Could not find a valid Xcode app bundle at '/Library/Developer/CommandLineTools'. Please update your Apple SDK location in Visual Studio's preferences (Projects > SDK Locations > Apple > Apple SDK). [/Users/kondoh/dev/MyMauiApp/MyMauiApp.csproj::TargetFramework=net7.0-ios]
/usr/local/share/dotnet/packs/Microsoft.iOS.Sdk/16.4.7089/tools/msbuild/iOS/Xamarin.Shared.targets(1746,3): error :          [/Users/kondoh/dev/MyMauiApp/MyMauiApp.csproj::TargetFramework=net7.0-ios]
    0 個の警告
    1 エラー

経過時間 00:00:00.19
```

Xcode コマンドラインツールを再インストールしようとしてもすでにインストールされているというメッセージで終了してしまいます。

```shell
xcode-select: error: command line tools are already installed, use "Software Update" in System Settings to install updates
```

GitHub の MAUI のリポジトリに次のような issue がありました。

[Error : Could not find a valid Xcode app bundle at &#39;/Library/Developer/CommandLineTools&#39; · Issue #3888 · dotnet/maui](https://github.com/dotnet/maui/issues/3888)

この [issue のコメント](https://github.com/dotnet/maui/issues/3888#issuecomment-1003880709) に Apple Developer Forums のスレッドがリンクされています。

[Command Line Tools | Apple Developer Forums](https://developer.apple.com/forums/thread/660649)

このスレッドは、Xamarin / Visual Studio 時代の話のようです。

このスレッドのコメントに「Xcode の設定で、コマンドラインツールのロケーションのセレクトボックスが空白だとエラーになるので、選択して Visual Studio を再起動しよう」といったことが書いてありました。

> After much ado, I discovered in Xcode > Preferences > Locations > Command Line Tools, that the drop down was blank.
> When I selected the drop down, the Command line Tools that were just installed were available, and when I selected that and rebooted Visual Studio, that the error message went away.

筆者の環境で Xcode の Settings > Locations を開くとコマンドラインツールのセレクトボックスはちゃんと選択されていました。

![Xcode options](https://i.gyazo.com/fe73985ccdd71ca44999e8034e210662.png)

ダメもとでこのセレクトボックスをクリックして選択し直してみました。するとなぜかビルドが成功するようになりました。謎すぎる[^7]。

[^7]: おそらく、どこかの設定が足りなくてこの操作により書き込まれたのだと思いますが。

## 最後に
開発環境もモダンになった .NET MAUI。React Native や Flutter などと並んで選択肢の1つになっていくのでしょうか。

今回生成したコードは、従来の WPF や Xamarin と同じく、XAML と partial class による MVVM (Model View ViewModel) パターンでした。

MAUI には Vuew も C# のコードで宣言的に書く MVU(Model View Update) パターンをサポートする MauiReactor というライブラリがあります。React や Flutter にインスパイアされたコンポーネントベースライブラリのようです。

[MauiReactor を使用した .NET MAUI のコンポーネント ベースの UI](https://learn.microsoft.com/ja-jp/shows/on-net/component-based-ui-for-dotnet-maui-with-mauireactor)

このライブラリも別の機会に紹介できたらと思います。
