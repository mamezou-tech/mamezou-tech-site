---
title: 通过可运行示例理解！C#委托入门 ～Func/Action/event的区别及使用场景
author: yoshihiro-tamori
date: 2026-09-02T00:00:00.000Z
tags:
  - dotnet
  - csharp
image: true
translate: true

---
我很喜欢C#，但突然意识到自己从未使用过委托。

在以前参与的项目中我见过委托，也看到前辈们在使用，但自己从未动手，也许只是有些排斥而已。

于是我决定通过编写并运行代码来学习委托。这篇文章将以我亲自编写并运行的代码为例进行讲解。

## 委托(delegate)是什么
“Delegate”一词在日语中意为“委托”。根据词典，委托指的是“将权利、权限等转让给他人或机构并委由其办理”。也就是将自己要做的事情交给别人来做。例如上司将工作交给下属就是典型的委托。

https://kotobank.jp/word/%E5%A7%94%E8%AD%B2-432326

在编程中，被委托的“事情”指的是某段处理（方法）。将处理的执行交给其他功能来完成。

但这样说可能还很抽象。更具体地说，就是将一个处理（方法）的引用赋值，然后不是传递值，而是传递处理（方法），以便其他功能（类）能够执行这段处理（方法）。

![委托示例的执行结果](/img/dotnet/csharp_delegate/DelegateImage.png)

例如在某个处理完成后，调用回调方法时就可以使用委托。

## 事前准备
要运行本文的示例代码，请在 Visual Studio 或 Visual Studio Code 中完成 C# 开发环境的搭建。若在 VS Code 中搭建，可参考以下文章：

[VS Code入门！易懂&实用的C#开发环境搭建【2025年版手册】](https://developer.mamezou-tech.com/blogs/2025/07/05/csharp_vscode/)

完成 IDE 搭建后，请新建一个控制台应用项目。本文示例为便于验证，均基于控制台应用。

## 通过示例代码讲解委托基础
### 委托的基本写法
下面开始编写代码并验证运行效果。

请新建一个名为 `DelegateSample` 的类，写入以下代码：

```cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DelegateApp
{
    internal class DelegateSample
    {
        // 声明委托
        // 有点像声明一种委托类型的方法
        delegate void SampleDelegate(string message);

        // 执行示例
        public void ExecSample()
        {
            // 将声明的委托作为类型，将方法传入参数
            // 这种写法有些违和，可以想象成创建一个方法类型的实例并给它赋值方法
            SampleDelegate sampleDelegate = new SampleDelegate(Console.WriteLine);

            // 试着输出一条消息
            // 因为赋值了Console.WriteLine，所以执行委托时会调用Console.WriteLine
            sampleDelegate("测试消息");

            // 接下来尝试赋值自定义方法（只是向控制台输出字符串）
            sampleDelegate = TestMessage;
            sampleDelegate("咖喱和沙拉");

            Console.WriteLine();
        }

        void TestMessage(string message)
        {
            Console.WriteLine($"今晚的晚餐预计是{message}。");
        }
    }
}
```

然后在 `Program.cs` 中这样写：

```cs
using DelegateApp;
using DelegateApp.Models;

Console.WriteLine("开始演示委托");

DelegateSample delegateSample = new DelegateSample();
delegateSample.ExecSample();
```

运行此代码后，会显示如下消息：

![委托示例的执行结果](/img/dotnet/csharp_delegate/DelegateSampleSingle.png)

对于委托初学者来说，可能觉得不太好理解或有些违和感。

声明委托就是定义一个 `delegate` 类型的方法。接着用该声明的类型创建一个实例。把类型看作方法这一点，乍一看可能让人不知所云。

而且 `delegate` 类型的实例可以赋值为方法。因为它是用于执行方法的机制，所以可以这样使用。将方法赋值给实例，本身也是不常见的操作。

不过看到这里就会发现，只要参数匹配，就可以赋值并执行各种不同的方法。

还有一种可以将多个方法汇总的多播委托（multicast delegate）。比如，在之前的 `DelegateSample` 类中，追加如下代码：

```cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DelegateApp
{
    internal class DelegateSample
    {
        // 声明委托
        // 有点像声明一种委托类型的方法
        delegate void SampleDelegate(string message);

        // 执行示例
        public void ExecSample()
        {
            // 将声明的委托作为类型，将方法传入参数
            // 这种写法有些违和，可以想象成创建一个方法类型的实例并给它赋值方法
            SampleDelegate sampleDelegate = new SampleDelegate(Console.WriteLine);

            // 试着输出一条消息
            // 因为赋值了Console.WriteLine，所以执行委托时会调用Console.WriteLine
            sampleDelegate("测试消息");

            // 接下来尝试赋值自定义方法（只是向控制台输出字符串）
            sampleDelegate = TestMessage;
            sampleDelegate("咖喱和沙拉");

            Console.WriteLine();

            // 从这里开始追加
            // 实际上可以追加方法
            sampleDelegate += TestMessageLunch;
            sampleDelegate("咖喱和沙拉");

            Console.WriteLine();

            // 也可以删除已追加的方法
            sampleDelegate -= TestMessage;
            sampleDelegate("咖喱和沙拉");
            // 到这里结束
        }

        void TestMessage(string message)
        {
            Console.WriteLine($"今晚的晚餐预计是{message}。");
        }

        // 添加一个用于午餐的方法
        void TestMessageLunch(string message)
        {
            Console.WriteLine($"今晚的午餐是{message}。");
        }
    }
}
```

再次运行 `Program.cs`，结果如下：

![多播委托示例的执行结果](/img/dotnet/csharp_delegate/DelegateSampleMulti.png)

这段代码对委托使用了加号和减号运算符。**`delegate` 类型的实例竟然可以添加多个方法，也可以删除已添加的方法。**

这就是所谓的多播委托。

### 了解委托的演进历史
实际上，刚才演示的委托写法是传统做法。随着演进，到 C# 2.0 时代，可以使用匿名方法。

下面给出匿名方法的示例代码。创建 `DelegateSampleAnonymous` 类，写入以下内容：

```cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DelegateApp
{
    internal class DelegateSampleAnonymous
    {
        // 声明委托
        // 有点像声明一种委托类型的方法
        delegate void SampleDelegate(string message);

        // 执行示例
        public void ExecSample()
        {
            // 接下来尝试赋值自定义方法（只是向控制台输出字符串）
            // 不仅可以赋值已定义的方法，还可以赋值匿名方法
            SampleDelegate sampleDelegate = delegate(string message)
            {
                Console.WriteLine($"今晚的晚餐预计是{message}。");
            };
            sampleDelegate("咖喱和沙拉");

            Console.WriteLine();

            // 试着追加匿名方法
            sampleDelegate += delegate(string message)
            {
                Console.WriteLine($"今晚的午餐是{message}。");
            };
            sampleDelegate("咖喱和沙拉");

            Console.WriteLine();

            // 顺带一提，通过匿名方法追加后无法删除
            // 必须像这样先放到另一个实例里再追加
            SampleDelegate workDelegate = delegate(string message)
            {
                Console.WriteLine($"今晚的早餐是{message}。");
            };
            sampleDelegate += workDelegate;
            sampleDelegate("咖喱和沙拉");


            Console.WriteLine();
            sampleDelegate -= workDelegate;
            sampleDelegate("咖喱和沙拉");
        }
    }
}
```

在 `Program.cs` 中这样写：

```cs
using DelegateApp;
using DelegateApp.Models;

Console.WriteLine("开始演示委托");

Console.WriteLine();
Console.WriteLine("匿名方法示例");
Console.WriteLine();

DelegateSampleAnonymous delegateSampleAnonymous = new DelegateSampleAnonymous();
delegateSampleAnonymous.ExecSample();
```

运行结果如下：

![使用匿名方法的委托示例执行结果](/img/dotnet/csharp_delegate/DelegateSampleAnonymouspng.png)

这里有点麻烦，如果使用匿名方法追加后，就无法删除方法。如果一定要删除，必须先将其赋给一个实例再追加。

在上述示例中，`workDelegate` 就起到了这个作用。

现在主流是使用 Lambda 表达式。下面给出使用 Lambda 的示例代码。创建 `DelegateSampleLambda` 类，写入以下内容：

```cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DelegateApp
{
    internal class DelegateSampleLambda
    {
        // 声明委托
        // 有点像声明一种委托类型的方法
        delegate void SampleDelegate(string message);

        // 执行示例
        public void ExecSample()
        {
            // 接下来尝试赋值自定义方法（只是向控制台输出字符串）
            // 不仅可以赋值已定义的方法，还可以赋值 Lambda 表达式
            SampleDelegate sampleDelegate = (string message) =>
            {
                Console.WriteLine($"今晚的晚餐预计是{message}。");
            };
            sampleDelegate("咖喱和沙拉");

            Console.WriteLine();

            // 试着追加 Lambda 表达式
            sampleDelegate += (string message) =>
            {
                Console.WriteLine($"今晚的午餐是{message}。");
            };
            sampleDelegate("咖喱和沙拉");

            Console.WriteLine();

            // 顺带一提，通过 Lambda 表达式追加后无法删除
            // 必须像这样先放到另一个实例里再追加
            SampleDelegate workDelegate = (string message) =>
            {
                Console.WriteLine($"今晚的早餐是{message}。");
            };
            sampleDelegate += workDelegate;
            sampleDelegate("咖喱和沙拉");


            Console.WriteLine();
            sampleDelegate -= workDelegate;
            sampleDelegate("咖喱和沙拉");
        }
    }
}
```

在 `Program.cs` 中这样写：

```cs
using DelegateApp;
using DelegateApp.Models;

Console.WriteLine("开始演示委托");

Console.WriteLine();
Console.WriteLine("Lambda 表达式示例");
Console.WriteLine();

DelegateSampleLambda delegateSampleLambda = new DelegateSampleLambda();
delegateSampleLambda.ExecSample();
```

运行结果如下：

![使用 Lambda 表达式的委托示例执行结果](/img/dotnet/csharp_delegate/DelegateSampleLambda.png)

**使用 Lambda 表达式后，连 `delegate` 关键字都不用写了。这是最简洁的写法。**

## 使用 Func 和 Action 无需声明
### 如果没有返回值使用 Action
到目前为止的做法都是先声明一种 `delegate` 类型的方法，然后将方法赋给其实例。因为要额外声明，需要为不同用途创建不同的委托。

**因此，作为通用类型，如果没有返回值就使用 `Action`，如果有返回值就使用 `Func`。**

下面给出使用 `Action` 的示例代码。创建 `DelegateSampleAction` 类，写入以下内容：

```cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DelegateApp
{
    internal class DelegateSampleAction
    {
        public void ExecSample()
        {
            // 使用 Action 委托示例
            // Action 委托的返回值为 void，可以指定参数类型
            Action<string> actionDelegate = (message) =>
            {
                Console.WriteLine($"今晚的晚餐预计是{message}。");
            };
            actionDelegate("咖喱和沙拉");
        }
    }
}
```

在 `Program.cs` 中这样写：

```cs
using DelegateApp;
using DelegateApp.Models;

Console.WriteLine("开始演示委托");

Console.WriteLine();
Console.WriteLine("Action 示例");
Console.WriteLine();

DelegateSampleAction delegateSampleAction = new DelegateSampleAction();
delegateSampleAction.ExecSample();
```

运行结果如下：

![使用 Action 的委托示例执行结果](/img/dotnet/csharp_delegate/DelegateSampleAction.png)

顺便提一下，方法的添加和删除同样可以使用 `+` 或 `-` 运算符，就像使用 `delegate` 时一样。同时，匿名方法和 Lambda 表达式也无法直接删除，所以如果想删除，请先将方法赋给一个实例再添加。

### 如果有返回值使用 Func
下面给出使用 `Func` 的示例代码。创建 `DelegateSampleFunc` 类，写入以下内容。泛型类型参数以 `<参数类型, 返回值类型>` 的方式指定。

```cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DelegateApp
{
    internal class DelegateSampleFunc
    {
        public void ExecSample()
        {
            // 使用 Func 委托示例
            // Func 委托是有返回值的，且可以指定参数类型和返回值类型
            Func<int, string> funcDelegate = (num) =>
            {
                return $"输入的值是{num}。";
            };
            Console.WriteLine(funcDelegate(5));
        }
    }
}
```

在 `Program.cs` 中这样写：

```cs
using DelegateApp;
using DelegateApp.Models;

Console.WriteLine("开始演示委托");

Console.WriteLine();
Console.WriteLine("Func 示例");
Console.WriteLine();

DelegateSampleFunc delegateSampleFunc = new DelegateSampleFunc();
delegateSampleFunc.ExecSample();
```

运行结果如下：

![使用 Func 的委托示例执行结果](/img/dotnet/csharp_delegate/DelegateSampleFunc.png)

`Func` 的方法添加和删除与使用 `delegate` 时相同。

## 委托的真正用途
### 回调处理
下面给出回调处理的示例代码。创建 `CallbackSample` 类，写入以下内容：

```cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DelegateApp
{
    internal class CallbackSample
    {
        // 回调示例
        // 在这里，将处理完成后要调用的方法作为委托传入
        // 使用委托后，可以自由更改处理完成后要调用的方法
        public void ExecSample(string message, Action<string> callback)
        {
            Console.WriteLine($"处理中: {message}");
            // 处理完成后调用回调
            callback?.Invoke($"处理已完成: {message}");
        }
    }
}
```

在 `Program.cs` 中这样写：

```cs
using DelegateApp;
using DelegateApp.Models;

Console.WriteLine("开始演示委托");

Console.WriteLine();
Console.WriteLine("回调示例");
Console.WriteLine();

CallbackSample callbackSample = new CallbackSample();
callbackSample.ExecSample("咖喱和沙拉", (result) =>
{
    Console.WriteLine(result);
});
```

运行结果如下：

![使用委托进行回调的示例执行结果](/img/dotnet/csharp_delegate/DelegateSampleCallback.png)

通过在方法参数中定义 `Func` 或 `Action`，可以接收外部传入的处理。然后通过 `Invoke` 方法执行该处理。

### 根据条件替换处理
事实上，LINQ 的 `Where` 接受的是 `Func` 类型参数。也就是说，在 `Where` 方法内部使用了委托。

那么让我们做一个示例，根据不同的 `Func` 内容获得不同的结果。创建 `DelegateSampleLinq` 类，并编写以下代码：

```cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DelegateApp
{
    internal class DelegateSampleLinq
    {
        public void ExecSample()
        {
            List<int> numbers = new List<int> { 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 };

            // 首先尝试只抽取偶数
            var evenNumbers = FilterNumbers(numbers, (num) => num % 2 == 0);
            Console.WriteLine("偶数列表:");
            Console.WriteLine(evenNumbers.Count > 0 ? string.Join(", ", evenNumbers) : "没有符合条件的值。");

            // 接着抽取奇数
            var oddNumbers = FilterNumbers(numbers, (num) => num % 2 != 0);
            Console.WriteLine("奇数列表:");
            Console.WriteLine(oddNumbers.Count > 0 ? string.Join(", ", oddNumbers) : "没有符合条件的值。");
        }

        /// <summary>
        /// 执行传入的 Func，只返回符合条件的值
        /// </summary>
        /// <param name="numbers"></param>
        /// <param name="predicate"></param>
        /// <returns></returns>
        static List<int> FilterNumbers(List<int> numbers, Func<int, bool> predicate)
        {
            List<int> resultList = new List<int>();
            foreach (var number in numbers)
            {
                if (predicate(number))
                {
                    resultList.Add(number);
                }
            }
            return resultList;
        }
    }
}
```

在 `Program.cs` 中这样写：

```cs
using DelegateApp;
using DelegateApp.Models;

Console.WriteLine("开始演示委托");

Console.WriteLine();
Console.WriteLine("根据条件切换示例");
Console.WriteLine();

DelegateSampleLinq delegateSampleLinq = new DelegateSampleLinq();
delegateSampleLinq.ExecSample();
```

运行结果如下：

![根据 Func 的内容不同结果不同的示例执行结果](/img/dotnet/csharp_delegate/DelegateSampleLinq.png)

## 使用 event 以补强委托的脆弱性
到目前为止，我们已经看了各种委托的用法。

然而，便利的同时也伴随着危险。因为只要重新赋值，就能改变处理内容；还可以通过 `Invoke` 在任意位置执行，的确存在漏洞。

一旦使用不当，可能导致缺陷，并且存在安全隐患。**在此，通过添加 `event` 关键字，就禁止了外部类的赋值和执行。**

下面给出使用 `event` 的示例代码。创建 `DelegateSampleEvent` 和 `DelegateSampleExternal` 两个类，写入以下内容：

```cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DelegateApp
{
    internal class DelegateSampleEvent
    {
        // 因为是 public，所以其他类可以访问
        public event Func<int, string> SampleEvent;
    }

    internal class DelegateSampleExternal
    {
        public void ExecSample()
        {
            DelegateSampleEvent sample = new DelegateSampleEvent();

            // 无法从外部类为委托赋值
            sample.SampleEvent = (int x) => $"输入的值是{x}。";

            // 可以从外部类添加和删除委托
            sample.SampleEvent += (int x) => $"输入的值是{x}。";
            Func<int, string> func = (int x) => $"今天喝了{x}杯咖啡。";
            sample.SampleEvent += func;
            sample.SampleEvent -= func;

            // 无法从外部类执行
            sample.SampleEvent.Invoke(99);
        }
    }
}
```

如上所示，当编译时会在赋值和 `Invoke` 方法处出现编译错误，如下截图所示：

![使用 event 的委托示例](/img/dotnet/csharp_delegate/DelegateEvent.png)

暂且将上述代码中出现编译错误的部分注释掉。

## 以美食广场的点餐为例来试用委托
既然了解了委托的用法，下文将以现实场景为例进行练习。以美食广场的甜品店为主题，比单纯的文字输出或计算更有趣，也更容易想象委托的“委托”含义。

业务流程如下图所示：

![以美食广场点餐为例的委托示例业务流程图](/img/dotnet/csharp_delegate/WorkflowFoodCourt.png)

这里对代码做了大幅简化。实际上需要对订单内容进行明细管理、支持动态更改订单等功能，但本次重点不在此处，因此只用简化的消息表示。

下面贴出源代码。在 `Models` 文件夹中创建以下 5 个类。

```cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DelegateApp.Models
{
    internal class Buzzer
    {
        public int No { get; set; }

        public Buzzer(int no)
        {
            No = no;
        }

        public void Ring()
        {
            Console.WriteLine($"嘟！嘟！嘟！{No}号呼叫器正在响！");
        }
    }
}
```

```cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DelegateApp.Models
{
    internal class Cook
    {
        public void CookOrder(Order order)
        {
            Console.WriteLine($"厨师已接收订单：{order.OrderContent}");
            Console.WriteLine("正在制作菜品...");
            Console.WriteLine("菜品已完成！");
        }
    }
}
```

```cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DelegateApp.Models
{
    internal class Customer
    {
        private Buzzer Buzzer { get; set; }

        public Order MakeOrder()
        {
            Console.WriteLine("顾客已下单。");
            return new Order("松饼和咖啡套餐");
        }

        public void Pay()
        {
            Console.WriteLine("完成付款。");
        }

        public void PickUpBuzzer(Buzzer buzzer)
        {
            Buzzer = buzzer;
            Console.WriteLine($"顾客已领取{buzzer.No}号呼叫器。");
        }

        public void PickUpFood()
        {
            Console.WriteLine($"顾客交还了{Buzzer.No}号呼叫器。");
            Console.WriteLine("顾客已领取菜品。");
        }
    }
}
```

```cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DelegateApp.Models
{
    internal class Order
    {
        public string? OrderContent { get; set; }
        public Order(string? orderContent)
        {
            OrderContent = orderContent;
        }
    }
}
```

```cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DelegateApp.Models
{
    internal class Staff
    {
        private delegate void BuzzerRingHandler();
        private IDictionary<int, BuzzerRingHandler> _buzzerHandlers = new Dictionary<int, BuzzerRingHandler>();

        public void TakeOrder(Order order)
        {
            Console.WriteLine($"工作人员已接收订单：{order.OrderContent}");
            Console.WriteLine("结账金额为1,500日元。");
        }

        public Buzzer HandOverBuzzer(int no)
        {
            Buzzer buzzer = new Buzzer(no);
            Console.WriteLine($"工作人员交付了{no}号呼叫器。");
            _buzzerHandlers.Add(no, buzzer.Ring);
            return buzzer;
        }

        public void RingBuzzer(int no)
        {
            if (_buzzerHandlers.TryGetValue(no, out var buzzer))
            {
                buzzer.Invoke();
                _buzzerHandlers.Remove(no);
            }
        }
    }
}
```

然后在 `Program.cs` 中这样写：

```cs
using DelegateApp;
using DelegateApp.Models;

Console.WriteLine("开始演示委托");

Console.WriteLine();
Console.WriteLine("美食广场示例：菜品制作完成后响铃");
Console.WriteLine();

Customer customer = new Customer();
Staff staff = new Staff();
Cook cook = new Cook();

Order order = customer.MakeOrder();
// 下单并结账
staff.TakeOrder(order);
customer.Pay();

// 交付呼叫器
int no = 1;
Buzzer buzzer = staff.HandOverBuzzer(no);
customer.PickUpBuzzer(buzzer);

// 烹饪
cook.CookOrder(order);

// 响铃并交付菜品
staff.RingBuzzer(no);
customer.PickUpFood();
```

运行结果如下：

![以美食广场点餐为例的委托示例执行结果](/img/dotnet/csharp_delegate/DelegateSampleFoodCourt.png)

**重点在于店员管理着给哪个顾客分配了什么号码的呼叫器。**

在程序中，`Staff` 类使用 `Dictionary` 来存储号码与呼叫器响铃方法的映射关系。

这样一来，当菜品制作完成时，店员就能响起顾客手中的呼叫器。

## 结语
通过编写并运行代码，对委托的概念有了更深入的理解。果然还是动手编写并运行最有效。

对于还不理解委托的读者，请动手尝试实现类似本文中的美食广场示例。
