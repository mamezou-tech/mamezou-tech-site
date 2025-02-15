---
title: 彻底攻略Go语言并发处理！直观学习Mutex和Channel
author: shohei-yamashita
date: 2025-01-10T00:00:00.000Z
tags:
  - go
  - 並行処理
image: true
translate: true

---
## 引言
我是业务解决方案事业部的山下。在我个人编写Go语言程序时，因为在理解并发处理上遇到了困难，所以写了这篇文章投稿。  
在这里，我打算利用图示整理Go语言并发处理中重要的概念——Mutex和Channel。  
即使对Go语言不太了解，也希望能传达出其中的含义。另外，如果有兴趣的话，也可以试运行[示例代码](https://github.com/shohei-yamashit/Go_concurrent_with_git)。

## Go语言并发处理的基本概念
### goroutine（协程）
goroutine（协程）是由Go运行时管理的轻量级线程。  
无需关注程序执行所依赖的内核，就可以实现跨内核的并发处理。  
为了理解协程，请看以下示例。  
此处先以串行处理执行计数，然后再用协程执行相同的处理。  
如实现例所示，可以通过 `go  {処理}` 的形式来定义并执行协程。

```go
package main
import (
	"sync"
	"time"
)
func main() {
	println("直列処理による実行")
	for i := 1; i <= 5; i++ {
		println(i)
		time.Sleep(1 * time.Second)
	}
	println("Goルーチンによる実行")
	
	// 定义等待组
	var wg sync.WaitGroup
	// 用协程输出从1到5的数字
	for i := 1; i <= 5; i++ {
		wg.Add(1) // 增加等待组计数器
		// 定义为协程执行处理
		go func(i int) {
			defer wg.Done() // 协程结束时减去等待组计数器的一个计数
			println(i)
			time.Sleep(1 * time.Second)
		}(i)
	}
	wg.Wait() // 等待直到等待组计数器归零
}
```

运行后查看标准输出，会发现串行处理和并发处理都被正确执行。

```sh
直列処理による実行
2025/01/08 07:55:59 1
2025/01/08 07:56:00 2
2025/01/08 07:56:01 3
2025/01/08 07:56:02 4
2025/01/08 07:56:03 5
Goルーチンによる実行
2025/01/08 07:56:04 2
2025/01/08 07:56:04 5
2025/01/08 07:56:04 4
2025/01/08 07:56:04 3
2025/01/08 07:56:04 1
```

效果图如下所示。  
![49d535e5c949d840114dd82e2dae0a2a.png](https://i.gyazo.com/49d535e5c949d840114dd82e2dae0a2a.png)

:::info
WaitGroup (wg) 是用于追踪及等待多个协程完成的机制。主要使用以下三个方法：
- **wg.Add(delta)**：增加WaitGroup的计数器。通常在启动新的协程前使用。
- **wg.Done()**：减少计数器1个。协程处理完成时调用。
- **wg.Wait()**：阻塞直到计数器变为0。用于等待所有协程完成。  
在此例中，通过WaitGroup等待所有并发处理完成后，函数才结束。
:::

总之，只要知道协程是用于并发处理的线程就没问题了[^1].  
[^1]: 本文省略了协程的详细内容。有兴趣的读者可以搜索“go routine M:N hybrid threading”等关键词。

另外，此后所描述的图示中，协程用如下所示的面部图标进行表示。  
![7b918d84e19edc2d05c6bb1ec3543689.png](https://i.gyazo.com/7b918d84e19edc2d05c6bb1ec3543689.png)

## 在协程中实现线程安全的数据处理方法

### 利用Mutex保护共享内存
首先可以介绍的是利用Mutex保护变量的方法。  
Mutex 是一种允许多个协程安全访问同一变量的机制。

如下示意图：  
![25ebe69b70202377981d0abca881f620.png](https://i.gyazo.com/25ebe69b70202377981d0abca881f620.png)

然而，根据Go官方的建议，更推荐使用下面所示的通过channel进行控制的方法。

### channel（通道）
Go语言中内置有一种叫做channel（通道）的机制，它类似于一个能安全传递值的通信通道。  
通过使用通道，可以在不使用Mutex的情况下安全地处理变量，实现线程安全。  
![650b4c607420bd5927931bd61757a651.png](https://i.gyazo.com/650b4c607420bd5927931bd61757a651.png)

## 实现例子
这里将对[示例]((https://github.com/shohei-yamashit/Go_concurrent_with_git))进行说明。  
这个工具用于将Git提交对象的文件列表以Json格式输出。  
也就是说，它将`git —diff —cached —name-only`的结果列表映射为如下形式：

```sh
.vscode/tasks.json
code/git/channel.go
code/git/mutex.go
code/git/no_mutex.go
code/go.sum
code/util/encoding.go
code/util/map.go
docs/dummy.txt
```

↓

```json
{
  ".vscode": {
    "tasks.json": "tasks.json"
  },
  "code": {
    "git": {
      "channel.go": "channel.go",
      "mutex.go": "mutex.go",
      "no_mutex.go": "no_mutex.go"
    },
    "go.sum": "go.sum",
    "util": {
      "encoding.go": "encoding.go",
      "map.go": "map.go"
    }
  },
  "docs": {
    "dummy.txt": "dummy.txt"
  }
}
```

在这个工具中，对 `git —diff —cached —name-only` 的结果合并为一个 Map 的过程中，使用了并发处理。  
让我们按以下顺序查看实现[^2]。

- ① 串行处理版（不使用并发处理的实现）
- ② 使用Mutex版
- ③ 使用通道版

[^2]: 虽然依赖执行环境或机器情况，但最快的处理速度是串行处理版。

### 串行处理版（不使用并发处理的实现）

不使用并发处理的实现如下：

```go
// OutputMapFromGitCommand 将Git命令的结果转换为Map
// 以串行处理方式执行，不使用协程
func (executer *serializeExecuter) OutputMapFromGitCommand(resultMap *map[string]interface{}) {
	result := executer.GitCommand()
	start := time.Now()
	// 按换行符分割
	lines := strings.Split(result, "\n")
	// 对每一行执行处理
	for _, line := range lines {
		if line == "" {
			continue
		}
		// 将路径字符串转换为Map
		sampleMap := util.MakeObjectFromPathString(line)
		// 合并Map
		util.MergeMaps(resultMap, sampleMap)
	}
	elapsed := time.Since(start)
	fmt.Printf("実行時間: %s\n", elapsed)
}
```

### 使用Mutex版

在进行代码说明之前，先展示示意图。  
![0c8742222bca09d90e9fc6eb9682ca3d.png](https://i.gyazo.com/0c8742222bca09d90e9fc6eb9682ca3d.png)

前述函数接收参数 resultMap（的指针）。  
为了确保多个协程访问此 Map 时不会发生竞争，进行了 Mutex 保护。  
基于串行处理示例中的代码，可以如下实现。

```go
// OutputMapFromGitCommand 将Git命令的结果转换为Map
// 使用Mutex的实现
func (executer *mutexExecuter) OutputMapFromGitCommand(resultMap *map[string]interface{}) {
	result := executer.GitCommand()
	start := time.Now()
	// 追加1：用于互斥控制的Mutex
	var mu sync.Mutex
	// 追加2：用于等待协程完成的WaitGroup
	var wg sync.WaitGroup
	// 按换行符分割
	lines := strings.Split(result, "\n")
	// 对每一行执行处理
	for _, line := range lines {
		if line == "" {
			continue
		}
		// 追加3：将等待组计数器增加1
		wg.Add(1)
		// 追加4：启动协程
		go func(line string) {
			// 追加5：协程结束时调用Done
			defer wg.Done()
			// 追加6：对Map更新进行互斥控制
			mu.Lock()
			// 将路径字符串转换为Map
			singleMap := util.MakeObjectFromPathString(line)
			util.MergeMaps(resultMap, singleMap) // 合并Map
			// 追加6：对Map更新进行互斥控制
			mu.Unlock()
		}(line)
	}
	// 追加7：等待所有协程结束
	wg.Wait()
	elapsed := time.Since(start)
	fmt.Printf("実行時間: %s\n", elapsed)
}
```

对新增部分的说明：
- 追加1：用于互斥控制的Mutex —— 定义一个用于控制共享内存同时访问的Mutex，从而防止多个协程同时更新 Map。  
- 追加2：用于等待协程完成的WaitGroup —— 定义一个等待组来等待所有协程完成，确保所有处理结束后再退出主函数。  
- 追加3：在循环中增加等待组的计数，跟踪正在执行的处理数量。  
- 追加4：使用 go func 定义协程，开启并发处理。  
- 追加5：使用 defer wg.Done() 在协程结束时减少等待组计数。  
- 追加6：在更新 Map 前后使用 mu.Lock() 和 mu.Unlock() 来保证互斥访问，从而保持数据一致性。  
- 追加7：使用 wg.Wait() 等待所有协程结束。

### 使用通道版

接下来展示使用通道的实现模式。  
这个例子中，为避免多个线程同时访问一个变量，需要准备一个存储 Map 的通道。  
首先，可以创建如下所示的协程和通道。

![b38ef754780680e1839ff2f7f6c1d3a8.png](https://i.gyazo.com/b38ef754780680e1839ff2f7f6c1d3a8.png)

接下来还剩下两个问题：①如何确定通道中初始值[^3]，②如何将对应于路径的字符串传递给协程。  
[^3]: 因为最先执行的协程可能无法从通道中获取Map，所以需要一个初始值。

对于①通道中初始值的问题，只需在开始处理时放入一个空 Map 即可。  
另一方面，对于②，只需在定义协程时传递字符串，为每个路径定义一个协程即可。

结合这些，预期实现的示意图如下所示。  
![0b8da4643285eb5770de7efc2d341ece.png](https://i.gyazo.com/0b8da4643285eb5770de7efc2d341ece.png)

具体实现如下：

```go
// OutputMapFromGitCommand 将Git命令的结果转换为Map
// 使用通道的实现
func (executer *channelExecuter) OutputMapFromGitCommand(resultMap *map[string]interface{}) {
	result := executer.GitCommand()
	start := time.Now()
	// 追加1：定义通道（程序结束时关闭通道）
	channel := make(chan map[string]interface{}, 1)
	// 追加2：将初始值赋给管理Map的通道
	initMap := make(map[string]interface{})
	channel <- initMap
	// 定义用于等待协程完成的WaitGroup
	var wg sync.WaitGroup
	// 按换行符分割
	lines := strings.Split(result, "\n")
	// 对每一行执行处理
	for _, line := range lines {
		if line == "" {
			continue
		}
		// 增加等待组计数器1
		wg.Add(1)
		go func(line string) {
			// 协程结束时调用Done
			defer wg.Done()
			// 追加3：从通道中获取当前的Map
			tmpMap := <-channel
			// 从路径字符串创建Map
			singleMap := util.MakeObjectFromPathString(line)
			util.MergeMaps(&tmpMap, singleMap) // 合并Map
			// 追加4：将合并后的Map写入通道
			channel <- tmpMap
		}(line)
	}
	// 等待所有协程结束
	wg.Wait()
	// 追加5：接收最终结果
	*resultMap = <-channel
	// 追加6：关闭通道
	close(channel)
	elapsed := time.Since(start)
	fmt.Printf("実行時間: %s\n", elapsed)
}
```

关于使用通道实现，重点说明如下：
- **追加1：定义通道** —— 创建一个用于发送和接收Map的通道，程序结束时记得关闭通道。  
- **追加2：向通道赋初值** —— 如果不赋初值，协程将无法从通道中获取值，因此在这里放入一个空 Map。  
- **追加3：从通道中接收Map** —— 从通道中获取处理中间的Map。  
- **追加4：向通道发送Map** —— 每个协程将处理后的行转换并合并后的Map发送到通道。  
- **追加5：接收最终结果到Map** —— 最终合并的Map留在通道中，将其收集后作为函数输出结果。  
- **追加6：关闭通道** —— 所有处理完成后，适时关闭通道。

与前面Mutex的实现相比，可以看出：  
① 各个协程都可以独立运行而不需要关注其他协程，  
② 数据流的处理更加直观易懂。

## 应该使用哪一种？
从Go语言官方的观点来看，基本上强烈推荐使用通道。  
在 [A Tour of Go (Goroutines)](https://go-tour-jp.appspot.com/concurrency/1) 中有如下描述：

> 由于goroutine在同一地址空间内执行，因此对共享内存的访问必须同步。虽然sync包提供了许多有用的同步方法，但有其他方式可以实现同步，所以它并不是绝对必要的。  
> 例如，Mutex（即sync包中所描述的）被认为并不是非常必要。

另一方面，根据书籍「**Learn Concurrent Programming with Go**」所述，Mutex和通道的使用可以区分如下[^4]。

[^4]: 作为翻译版存在《Go言語で学ぶ並行プログラミング　他言語にも適用できる原則とベストプラクティス》。（[インプレス社リンク](https://book.impress.co.jp/books/1123101144)）

- 程序的可读性：因为不需要考虑其他协程，使用通道的方法更容易写出简单的程序  
- 低耦合性：通常使用Mutex实现的方式容易导致程序紧耦合，而使用通道则更容易实现松耦合的程序  
- 内存消耗：由于通道需要传输数据的拷贝，使用Mutex保护的方式在内存消耗上会更节省  
- 传输效率：基于上述原因，避免拷贝开销的Mutex方式在效率上更高  

综上所述，可以得出如下结论：

- 从程序松耦合和代码简洁性的角度来看，一般推荐使用通道。  
- 但如果希望提高性能，也可以考虑使用Mutex。

总之，需要综合判断具体处理的特点来慎重选择采用哪一种。

## 总结

本文解说了Go语言并发处理中重要的Mutex及Channel（通道）。  
- **Mutex**：通过互斥控制，使多个协程能够安全访问共享内存。  
- **Channel**：利用在协程间传递线程安全的数据，以实现安全的并发处理。  

官方虽然推荐使用通道，但根据不同的解决方案，也可以考虑使用Mutex。  

本文参考的书籍「**Learn Concurrent Programming with Go**」内容即使对Go语言不精通的人也能充分理解。有兴趣的朋友不妨一读。  
@[og](https://www.manning.com/books/learn-concurrent-programming-with-go)
