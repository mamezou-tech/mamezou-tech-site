---
 title: 【2025年度版】VS CodeでC#の開発環境を構築する手順を解説
 author: yoshihiro-tamori
 date: 2025-07-05
 tags: [vscode, dotnet, csharp, 開発環境]
 image: true
---

みなさん、C#の開発には何を使っていますか。仕事ではおそらくVisual Studio Professional、プライベートではVisual Studio Communityが定番ですよね。

C#の開発環境として定番のツールはVisual Studioですが、もしかしてVS CodeでもC#の開発ができるのでは。そう思って調べてみたら、やはりできました。

この記事ではVS CodeでC#の開発環境を構築する手順を解説します。基本的には拡張機能をインストールしてコマンドを打つだけです。

VS Codeに慣れているからC#での開発もVS Codeでやりたいという方や、Visual Studioは価格が高いからVS Codeでの開発を検討している方などの参考になれば幸いです。

## VS Codeのダウンロードとインストール

まずはオフィシャルサイトからVS Codeをダウンロードしてインストールしましょう。

[Download Visual Studio Code - Mac, Linux, Windows](https://code.visualstudio.com/download)

## 拡張機能のインストール

VS Codeをインストールしたら次は拡張機能のインストールです。

早速VS Codeを起動しましょう。ちなみに拡張機能のインストールについての参考記事はこちらです。Microsoft公式の記事です。

[https://learn.microsoft.com/ja-jp/training/modules/install-configure-visual-studio-code/5-exercise-configure-visual-studio-code](https://learn.microsoft.com/ja-jp/training/modules/install-configure-visual-studio-code/5-exercise-configure-visual-studio-code)

まずはVS Code上で拡張機能のアイコンをクリックします。

![拡張機能アイコンの場所](/img/dotnet/csharp_vscode/csharp_vscode1.png)

すると検索ボックスが出てくるので、C#と入力します。
![検索ボックスにC#と入力](/img/dotnet/csharp_vscode/csharp_vscode2.png)

検索結果が表示されたら、C# Dev Kitを選択してインストールボタンを押下します。
![C# Dev Kitを選択してインストール](/img/dotnet/csharp_vscode/csharp_vscode3.png)

続いてIntelliCode for C# Dev Kitをインストールします。IntelliCode（インテリコード）はインテリセンスよりも強力です。C#とVisual Studioと言えばインテリセンスの入力補完機能が強力であることはよく知られていますが、より進化したものがあるのです。
![表示メニューからコマンドパレットを選択](/img/dotnet/csharp_vscode/csharp_vscode4.png)

詳細はこちらの記事を読んでみてください。
[https://qiita.com/yossy6954/items/f4c8b5f5f8f4c7a843c6](https://qiita.com/yossy6954/items/f4c8b5f5f8f4c7a843c6)

続いて表示メニューからコマンドパレットを選択します。
![.NET: Install Newと打つ](/img/dotnet/csharp_vscode/csharp_vscode5.png)

.NET: Install Newと打ち、.NET: Install New .NET SDKを探します。
![.NET SDKをインストール](/img/dotnet/csharp_vscode/csharp_vscode6.png)

インストールボタンを押下して.NET SDKをインストールします。
![.NET SDKのインストールを確認](/img/dotnet/csharp_vscode/csharp_vscode7.png)
インストールが完了したら、Visual Studio Codeを再起動します。再起動後、dotnet --versionと打ってインストールできたことを確認します。エラーが起きることなく、バージョンが表示されればOKです。
![プロジェクトを新規作成](/img/dotnet/csharp_vscode/csharp_vscode8.png)

ここまででインストールは完了です。

## C#プロジェクトの作成

次はC#プロジェクトを作成してみましょう。

### コンソールアプリの作成

まずはコンソールアプリを作成してみましょう。

以下のコマンドをターミナルで打つことで、プロジェクトを新規作成します（ディレクトリやプロジェクト名は適宜変えてください）。

`dotnet new console -o C:\Development\SampleProject`

![プロジェクト作成を確認](/img/dotnet/csharp_vscode/csharp_vscode9.png)


エクスプローラー上でフォルダが作成されたことを確認します。
![作成したプロジェクトを開く](/img/dotnet/csharp_vscode/csharp_vscode10.png)

作成したプロジェクトをVisual Studio Codeで開きます。
![作成したプロジェクトを開いた状態](/img/dotnet/csharp_vscode/csharp_vscode11.png)

プロジェクトフォルダ以下のファイルやフォルダが表示されればOKです。
![プロジェクトをビルド](/img/dotnet/csharp_vscode/csharp_vscode12.png)

せっかくプロジェクトを作成できたから、動かしてみたいですよね。ターミナルでdotnet buildと打ちましょう。
![プロジェクトを実行](/img/dotnet/csharp_vscode/csharp_vscode13.png)

ビルドが完了したら、ターミナルでdotnet runと打ちましょう。
![Hello, World!が表示された](/img/dotnet/csharp_vscode/csharp_vscode14.png)

Hello, Worldが表示されました。
![メッセージを変えてみる](/img/dotnet/csharp_vscode/csharp_vscode15.png)

コンソールに表示するメッセージを書き換えて保存し、実行してみましょう。先ほど同様に、ターミナルでdotnet buildとdotnet runを打ちます。
![メッセージが変わった](/img/dotnet/csharp_vscode/csharp_vscode16.png)

実行したらメッセージが変わりました。
![Webアプリを作成](/img/dotnet/csharp_vscode/csharp_vscode17.png)

### Webアプリの作成

ここまでだとコンソールアプリなので、ちょっと物足りないと感じます。そこで次はWebアプリを作ってみましょう。

ターミナルで以下のコマンドを打ちます（newの後ろに指定する文字がプロジェクトの種類です）。ディレクトリやプロジェクト名は適宜変えてください。

`dotnet new web -o C:\Development\SampleWeb`

![Wプロジェクト作成を確認](/img/dotnet/csharp_vscode/csharp_vscode18.png)

エクスプローラー上でプロジェクトが作成されたことを確認します。
![作成したプロジェクトを開く](/img/dotnet/csharp_vscode/csharp_vscode19.png)

メニューでフォルダを開くを選び、作成したプロジェクトのフォルダを選びましょう。
![作成したプロジェクトを開いた状態](/img/dotnet/csharp_vscode/csharp_vscode20.png)

Webアプリのプロジェクトが表示されます。
![プロジェクトを実行](/img/dotnet/csharp_vscode/csharp_vscode21.png)

Hello Worldに適当な文字列を追加して実行してみましょう。実行するにはdotnet buildとdotnet runをターミナルで打ちます。
![localhostのURLを確認](/img/dotnet/csharp_vscode/csharp_vscode22.png)

残念ながらVisual Studio Codeからの実行では、自動的にIIS Expressが立ち上がって、自動的にブラウザが起動して画面が表示されるということはないようです。

Visual Studioからなら自動的にブラウザ表示までしてくれるのですけどね。

PropertiesフォルダのlaunchSettings.jsonを見て、URLを確認し、そのURLをブラウザに入力しましょう。
![localhostでの動作確認](/img/dotnet/csharp_vscode/csharp_vscode23.png)

無事に表示されればOKです。

## 終わりに
VS CodeでC#の開発環境を構築してみて感じたことは、やはりVisual Studioって便利で楽だなと感じました。ほぼGUIで完結していますからね。

とはいえVS Codeでもそんなに難しくなく開発環境を構築できました（インストール時間は長かったですが、Visual StudioやC#のインストールはそんなもの）。