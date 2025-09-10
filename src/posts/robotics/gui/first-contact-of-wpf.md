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

CommunityToolkit.MvvmはMicrosoft公式のMVVM補助ライブラリ。
`INotifyPropertyChanged`や`ICommand`実装を自動生成してくれます。
手書きでは冗長になる`OnPropertyChanged`呼び出しや`RelayCommand`の実装になります。
  
`NuGet`から`CommunityToolkit.Mvvm`を追加してください

![](/img/robotics/gui/communitytoolkit-mvvm.png)

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
MVVMではClickイベントやx:Nameが不要になり、代わりにBindingを使います。
UI（View）とロジック（ViewModel）が分離されるので再利用性があがり、テストがしやすくなります。

あれ、Modelは?  
単なるカウントアップを保持するだけのシンプルなサンプルだと、Modelをわざわざ分ける必要はありません。  

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
        public void Decrement() => Value--;
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

TODO:DIの話


第2部: 現場で役立つC#開発Tips備忘録
ここからは、日々のWPF/C#開発、特に3Dアプリケーション開発において役立つTipsをいくつかご紹介します。
…

1.【重要】IEnumerableの罠 - 遅延評価を理解する
LINQは非常に強力ですが、その遅延評価 (Deferred Execution) という特性を理解していないと、思わぬバグやパフォーマンス問題を引き起こします。

// 3D空間上の点(Point3D)のリストがあるとします
List<Point3D> allPoints = GetVeryLargeListOfPoints(); 

// Y座標が0より大きい点だけをフィルタリングするクエリ
// ★この時点では、フィルタリングはまだ実行されていない！
var positiveYPointsQuery = allPoints.Where(p => p.Y > 0);

// ... 何か他の処理 ...

// allPointsリストから一部の点を削除する
RemoveSomePoints(allPoints);

// ★ここで初めてクエリが実行される！
// しかし、この時点のallPointsは中身が変わってしまっている
foreach (var point in positiveYPointsQuery)
{
    // 意図しない結果になる可能性がある
    Console.WriteLine(point);
}

IEnumerable<T>を返すLINQメソッド（Where, Selectなど）は、foreachで列挙されたり、ToList()のようなメソッドが呼ばれたりするまで実行されません。

対策: クエリの結果を特定の時点で確定させたい場合は、ToList()やToArray()を使って即時実行し、結果を新しいコレクションに格納しましょう。

// ToList()を呼んだ時点でクエリが実行され、結果が新しいリストに格納される
List<Point3D> positiveYPoints = allPoints.Where(p => p.Y > 0).ToList();

// この後で元のallPointsが変更されても、positiveYPointsには影響しない
RemoveSomePoints(allPoints); 

1. よく使うLINQ逆引きリファレンス
毎回調べてしまいがちな基本的なLINQメソッドをまとめました。

やりたいこと

メソッド

例

フィルタリング

Where

points.Where(p => p.Z > 10.0)

変換・射影

Select

points.Select(p => p.X) (X座標のリストに変換)

ソート

OrderBy, OrderByDescending, ThenBy

points.OrderBy(p => p.X).ThenBy(p => p.Y)

最初の要素取得

First, FirstOrDefault

points.FirstOrDefault(p => p.Name == "Origin")

存在確認

Any

points.Any(p => p.IsSelected)

グループ化

GroupBy

points.GroupBy(p => p.LayerName)

平坦化

SelectMany

layers.SelectMany(l => l.Points) (全レイヤーの点を一つのリストに)

3. NuGetパッケージ管理のヒント：これだけは入れておきたい！
NuGetは.NET開発に不可欠です。特に以下のライブラリはWPF/MVVM開発の効率を劇的に向上させます。

CommunityToolkit.Mvvm (旧称: MVVM Toolkit)

Microsoft公式がメンテナンスしているMVVMライブラリ。

INotifyPropertyChangedやICommandの実装を属性ベースで自動化してくれます。

もう手動でOnPropertyChangedを実装する必要はありません。

導入前 (Before):

public class MyViewModel : INotifyPropertyChanged
{
    private string _name;
    public string Name
    {
        get => _name;
        set
        {
            _name = value;
            OnPropertyChanged(nameof(Name));
        }
    }
    // ICommandやINotifyPropertyChangedの実装が別途必要...
}

導入後 (After):

// CommunityToolkit.Mvvm.ComponentModelをインポート
public partial class MyViewModel : ObservableObject
{
    [ObservableProperty]
    private string _name;

    [RelayCommand]
    private void DoSomething()
    {
        // ...
    }
}

コード量が劇的に減り、本質的なロジックに集中できます。

Serilog / NLog

高機能なロギングライブラリ。ファイルやコンソール、外部サービスなど、様々な場所に出力をカスタマイズできます。3Dアプリケーションの複雑な状態変化を追跡するのに必須です。

FluentAssertions

ユニットテストの結果を検証するためのライブラリ。「期待値はこうあるべきだ (Should().Be())」という自然言語に近い形で記述でき、テストコードの可読性が向上します。

4. HelixToolkitでの小さなつまづきポイント
UIスレッド外からのモデル操作

バックグラウンドスレッドで重い計算（例: メッシュ生成）を行い、その結果を3Dシーンに追加しようとすると、InvalidOperationExceptionが発生します。HelixToolkitのモデルコレクションはUIスレッドでしか操作できないためです。

対策: Dispatcherを使ってUIスレッドに処理を委譲します。

// バックグラウンドスレッド内
var newModel = CreateComplex3DModel();

// UIスレッドでモデルを追加する
Application.Current.Dispatcher.Invoke(() =>
{
    Viewport3D.Children.Add(newModel);
});

座標変換

マウスでクリックした2Dスクリーン座標を、3D空間上の座標に変換する、といった処理は頻出します。HelixToolkitはこれを簡単にするユーティリティメソッドを提供しています。

Viewport3DHelper.FindNearestPoint や HitTest メソッドを調べてみましょう。

まとめ
WPFによるデスクトップアプリケーション開発、特に3Dを扱う領域は非常に奥が深く、挑戦的です。堅牢なアーキテクチャとしてMVVMを採用し、C#のモダンな機能や便利なライブラリを使いこなすことで、複雑さに立ち向かうことができます。

この記事で紹介したMVVMの考え方やC#のTipsが、これからWPF開発を始める方や、現在開発で奮闘している方々の助けになれば幸いです。

以上、お疲れ様でした。 