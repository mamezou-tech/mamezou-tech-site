---
title: WPFに学ぶMVVM
author: kazuki-ogawa 
date: 2025-09-12 
summerRelayUrl: https://developer.mamezou-tech.com/events/season/2025-summer/
tags: [gui, csharp, wpf, mvvm, 画面開発, summer2025]
---

この記事は夏のリレー連載2025 10日目の記事です。

お久しぶりです。小川です。

最近開発でWPFを扱ったので初学者の開発Tips的なものを備忘録感覚で記していきたいと思います。

`WPF（Windows Presentation Foundation）`はWindowsデスクトップアプリ開発の選択肢として候補に挙がるものです。  
まずはUIのロジックを作る主要な方法としての`コードビハインド`と`MVVM（Model-View-ViewModel）`についてベタに触れていきます。  
`DI(Dependency Injection)`を導入して少しわかった気になりながら、陥りがちなアンチパターンやC#の便利で少し学習コストが高かったことなどまとめていければと思います。  
一応ロボット開発に携わる身なのでWPF/3D開発でつまづきそうなところも触れたいです。

# コードビハインドとMVVM

時折比較されたり、メリット・デメリットが議論されます。   
コードビハインドは「家を建てるための道具や手作業」、MVVMは「家の構造や配管・配線の設計図の描き方」です。  
規模や複雑さに応じてMVVMの設計を取り入れましょう。  
WPFを理解する第一歩として、まずコードビハインドを知ることが大切です。  

## コードビハインド

### 概要
コードビハインドは`UIレイアウト`をXAML（\*.xaml）で記述し、その`動作ロジック`をC#（\*.xaml.cs）で記述します。  
XAMLの裏側にあるコードという意味でCode-Behind（コードビハインド）と呼ばれます。

### サンプル
簡単なカウントアップアプリを実装してみます

```xml:MainWindow.xaml
<Window
    x:Class="CounterSample.MainWindow"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    xmlns:d="http://schemas.microsoft.com/expression/blend/2008"
    xmlns:local="clr-namespace:CounterSample"
    xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
    Title="Counter"
    Width="250"
    Height="150"
    mc:Ignorable="d">
    <Grid>
        <StackPanel HorizontalAlignment="Center" VerticalAlignment="Center">
            <TextBlock x:Name="CounterTextBlock" FontSize="30" Text="0" />
            <Button Click="CountUpButton_Click" Content="Count up" />
        </StackPanel>
    </Grid>
</Window>

```

```csharp:MainWindow.xaml.cs
using System.Windows;

namespace CounterSample
{
    public partial class MainWindow : Window
    {
        private int _count = 0;

        public MainWindow()
        {
            InitializeComponent();
        }
        private void CountUpButton_Click(object sender, RoutedEventArgs e)
        {
            _count++;
            CounterTextBlock.Text = _count.ToString();
        }
    }
}
```

UI要素（`x:Name="CounterTextBlock`）を名前で直接参照して操作しているのが特徴です。

:::column:なぜ`partial`(部分)なのか
WPF のコードビハインドは`public partial class MainWindow `のように`partial`が付いています。
これは`XAML`から自動生成されるコードと、開発者が書くコードをひとつのクラスにまとめるためです。

実際、ビルドすると`MainWindow.g.i.cs`というファイルが生成され、`XAML`の要素定義や`InitializeComponent`が自動的に追加されます。
`partial`があることで、これらのファイルと`MainWindow.xaml.cs`を同じクラスとして扱えるようになっています。

:::

上記コードでカウントアップするアプリケーションができました

![](https://gyazo.com/0504619cbdd989ff9c36a202cf8440b3.gif)


## MVVM

### 概要
MVVMは、UIとビジネスロジックを分離するための設計パターンです。アプリケーションを以下の3つのコンポーネントに分割します。
- Model: アプリケーションのデータとビジネスロジックを担当。
- View: UIそのもの。XAMLで記述され、ユーザーに情報を表示し、入力を受け取ります。
- ViewModel: ViewとModelの橋渡し役。Viewに表示すべきデータをプロパティとして公開し、Viewからの操作をコマンドとして受け取ります。

### サンプル

同様のカウントアップアプリを実装してみます

:::check
**`MVVMToolkit`の導入**

CommunityToolkit.MvvmはMicrosoft公式のMVVM補助ライブラリです。
`INotifyPropertyChanged`や`ICommand`実装を自動生成してくれます。  
手書きでは冗長になる`OnPropertyChanged`呼び出しや`RelayCommand`の実装になります。
  
`NuGet`から`CommunityToolkit.Mvvm`を追加してください

![](/img/robotics/gui/communitytoolkit-mvvm-nuget.png)

:::


- View
```xml:MainWindow.xaml
<Window
    x:Class="CounterSample.MainWindow"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    xmlns:d="http://schemas.microsoft.com/expression/blend/2008"
    xmlns:local="clr-namespace:CounterSample"
    xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
    Title="Counter"
    Width="250"
    Height="150"
    mc:Ignorable="d">
    <Window.DataContext>
        <local:MainViewModel />
    </Window.DataContext>

    <Grid>
        <StackPanel HorizontalAlignment="Center" VerticalAlignment="Center">
            <TextBlock FontSize="30" Text="{Binding Count}" />
            <Button Command="{Binding CountUpCommand}" Content="Count up" />
        </StackPanel>
    </Grid>
</Window>
```
=> MVVMではClickイベントやx:Nameが不要になり、代わりにBindingを使います。

```csharp:MainWindow.xaml.cs
using System.Windows;

namespace CounterSample
{
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();
        }
    }
}
```

- ViewModel
```csharp:MainViewModel.cs
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

namespace CounterSample
{
    public partial class MainViewModel : ObservableObject
    {
        [ObservableProperty]
        private int count = 0;

        [RelayCommand]
        private void CountUp()
        {
            Count++;
        }
    }
}
```
UI（View）とロジック（ViewModel）が分離されるので再利用性があがり、テストがしやすくなります。

あれ、Modelは?  
単なるカウントアップを保持するだけのシンプルなサンプルだと、Modelをわざわざ分ける必要はありません。  

### サンプルVer2

カウントアップに追加して、リセットを追加してみましょう。  
カウンターの値をセーブ、ロードするサービスも作ってみます。  


- Model
```csharp:CounterModel.cs
namespace CounterSample.Models
{
    internal class CounterModel(int initialValue = 0)
    {
        public int Value { get; private set; } = initialValue;
        public void Increment() => Value++;
        public void Reset() => Value = 0;
        public void SetValue(int value) => Value = value;
    }
}
```

- Service
```csharp:CounterService.cs
using CounterSample.Models;

namespace CounterSample.Services
{
    internal class CounterStorageService
    {
        private int _storedValue;

        public void Save(CounterModel model)
        {
            _storedValue = model.Value;
        }

        public void Load(CounterModel model)
        {
            model.SetValue(_storedValue);
        }
    }
}
```

- ViewModel
```csharp:CounterViewModel.cs
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using CounterSample.Models;
using CounterSample.Services;

namespace CounterSample.ViewModels
{
    internal partial class CounterViewModel : ObservableObject
    {
        private readonly CounterStorageService _service;
        private readonly CounterModel _model = new();

        [ObservableProperty]
        private int count;

        public CounterViewModel(CounterStorageService service)
        {
            _service = service;
            Count = _model.Value;
        }

        [RelayCommand]
        private void CountUp()
        {
            _model.Increment();
            Count = _model.Value;
        }

        [RelayCommand]
        private void Reset()
        {
            _model.Reset();
            Count = _model.Value;
        }

        [RelayCommand]
        private void Save()
        {
            _service.Save(_model);
        }

        [RelayCommand]
        private void Load()
        {
            _service.Load(_model);
            Count = _model.Value;
        }
    }
}
```
- View
```xml:MainWindow.xaml
<Window
    x:Class="CounterSample.MainWindow"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    xmlns:d="http://schemas.microsoft.com/expression/blend/2008"
    xmlns:local="clr-namespace:CounterSample"
    xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
    Title="Counter"
    Width="250"
    Height="150"
    mc:Ignorable="d">
    <Grid>
        <StackPanel HorizontalAlignment="Center" VerticalAlignment="Center">
            <TextBlock HorizontalAlignment="Center" FontSize="30" Text="{Binding Count}" />
            <StackPanel HorizontalAlignment="Center" Orientation="Horizontal">
                <Button Margin="2" Command="{Binding CountUpCommand}" Content="Count up" />
                <Button Margin="2" Command="{Binding ResetCommand}" Content="Reset" />
                <Button Margin="2" Command="{Binding SaveCommand}" Content="Save" />
                <Button Margin="2" Command="{Binding LoadCommand}" Content="Load" />
            </StackPanel>
        </StackPanel>
    </Grid>
</Window>
```

```csharp:MainWindow.xaml.cs
using CounterSample.Services;
using CounterSample.ViewModels;
using System.Windows;

namespace CounterSample
{
    public partial class MainWindow : Window
    {
        private readonly CounterStorageService _service = new();
        public MainWindow()
        {
            InitializeComponent();
            DataContext = new CounterViewModel(_service);
        }
    }
}
```

少しそれっぽい感じになりました。  
![](https://gyazo.com/04f7ac799522f8baecbcdd285f7a3fb0.gif)


## DI（Dependency Injection）
ちょうど良さそうなサンプルになったのでDI（Dependency Injection）を使ってみたいです。  

:::check
**`DependencyInjection`の導入**

WPFでMVVMを活用するなら、Microsoft.Extensions.DependencyInjectionを使ったDependency Injection（DI）が便利です。  
DIを導入すると、ViewModelやサービスを必要な場所で簡単に受け渡すことができ、テストや保守がしやすくなります。

`ServiceCollection`にサービスやViewModelを登録し、`ServiceProvider`から取得するだけで依存関係を解決できます。
Viewや他のViewModelから直接newする必要がなくなり、テストも容易になります。

![](/img/robotics/gui/communitytoolkit-mvvm-nuget.png)

:::

### サンプルVer3

サンプルVer2を元にDIを導入したサンプルを作ってみます。

`CounterStorageService`と`CounterViewModel`をサービス登録します。
StartupUriでApp.xamlとコード上から2つウィンドウを起動してみます。  
```csharp:App.xaml.cs
using CommunityToolkit.Mvvm.DependencyInjection;
using CounterSample.Services;
using CounterSample.ViewModels;
using Microsoft.Extensions.DependencyInjection;
using System.Windows;

namespace CounterSample
{
    public partial class App : Application
    {
        protected override void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);

            // ServiceCollection でサービスを登録
            ServiceCollection services = new();
            services.AddSingleton<CounterStorageService>();
            services.AddTransient<CounterViewModel>();

            // Ioc.Default に登録
            Ioc.Default.ConfigureServices(services.BuildServiceProvider());

            // 2つWindowを起動
            MainWindow window = new();
            window.Show();
        }
    }
}
```

登録したサービスを取得します。
`CounterViewModel`のインスタンスを要求すると、コンストラクタで`CounterStorageService`が要求されるのでDIコンテナからインスタンスを持ってきてくれます。  
```csharp:MainWindow.xaml.cs
using CommunityToolkit.Mvvm.DependencyInjection;
using CounterSample.ViewModels;
using System.Windows;

namespace CounterSample
{
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();
            DataContext = Ioc.Default.GetRequiredService<CounterViewModel>();
        }
    }
}
```
```csharp:サンプルVer2(抜粋)
private readonly CounterStorageService _service = new();
public MainWindow()
{
    InitializeComponent();
    DataContext = new CounterViewModel(_service);
}
```

実行するとこんな感じです。  
![](https://gyazo.com/0d7a7e3f1ef370b201f04ff2f6b62edd.gif)

あれ、別の画面なのに最後に`Save`したやつが別画面で`Load`されるぞ
その秘密はサービス登録時のコードにあります。
`services.AddSingleton<CounterStorageService>();`

呼び出すメソッドによってライフサイクルが異なります。  

|メソッド|ライフサイクル|
| --- | --- |
| AddSingleton | アプリケーションで1つのインスタンス |
| AddScoped | 1つの要求の間で1つのインスタンス |
| AddTransient | 都度新しいインスタンス |

AddSingletonで登録されていたのでサービスのインスタンスが1つだったので、同じ内部の保持値を見ていたわけです
AddTransientに変えると以下の動作になります。  
![](https://gyazo.com/5933393f12aaaf675b99049c56a832d1.gif)


第2部: 現場で役立つC#開発Tips備忘録
ここからは、日々のWPF/C#開発、特に3Dアプリケーション開発において役立つTipsをいくつかご紹介します。
…

### まとめ

以上、お疲れ様でした。 