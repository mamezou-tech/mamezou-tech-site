---
title: >-
  Complete Mastery of Concurrency in Go Language! Visually Learning Mutexes and
  Channels
author: shohei-yamashita
date: 2025-01-10T00:00:00.000Z
tags:
  - go
  - 並行処理
image: true
translate: true

---
## Introduction
I'm Yamashita from the Business Solutions Division. While writing Go programs personally, I struggled to understand concurrency, so I decided to write this article.
Here, I plan to organize the important concepts of Mutex and Channel in Go concurrency using visual images.
Even if you're not familiar with Go language, I hope the nuances will come across. Also, if you're interested, please try running the [sample code](https://github.com/shohei-yamashit/Go_concurrent_with_git).

## Basic Concepts of Concurrency in Go
### goroutine (Goroutine)
A goroutine is a lightweight thread managed by the Go runtime.
You can implement concurrency across kernels without being aware of the kernel executing the program.
Please see the following sample to understand goroutines.
Here, we execute a count-up using sequential processing, and then execute the same process using goroutines.
As shown in the implementation example, you can define and execute a goroutine with `go  {process}`.

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
	
	// Definition of WaitGroup
	var wg sync.WaitGroup
	// Output numbers from 1 to 5 using goroutines
	for i := 1; i <= 5; i++ {
		wg.Add(1) // Increase the WaitGroup counter
		// Define the process as a goroutine
		go func(i int) {
			defer wg.Done() // Decrease the WaitGroup counter at the end of the routine
			println(i)
			time.Sleep(1 * time.Second)
		}(i)
	}
	wg.Wait() // Wait until the WaitGroup counter reaches 0
}
```

When you execute and check the standard output, you can see that both sequential processing and concurrent processing are executed appropriately.

```sh
Execution using sequential processing
2025/01/08 07:55:59 1
2025/01/08 07:56:00 2
2025/01/08 07:56:01 3
2025/01/08 07:56:02 4
2025/01/08 07:56:03 5
Execution using goroutines
2025/01/08 07:56:04 2
2025/01/08 07:56:04 5
2025/01/08 07:56:04 4
2025/01/08 07:56:04 3
2025/01/08 07:56:04 1
```

The image is as follows.
![49d535e5c949d840114dd82e2dae0a2a.png](https://i.gyazo.com/49d535e5c949d840114dd82e2dae0a2a.png)

:::info
WaitGroup (wg) is a mechanism to track and wait for the completion of multiple goroutines. It mainly uses the following three methods.
- **wg.Add(delta)**: Increases the WaitGroup counter. Usually used before starting a new goroutine.
- **wg.Done()**: Decreases the counter by one. Called when a goroutine's processing is completed.
- **wg.Wait()**: Blocks until the counter reaches zero. Used to wait for all goroutines to complete.
In this example, you can wait for the function to exit until all concurrent processes are completed using WaitGroup.
:::

Anyway, as long as you understand that goroutines are threads for concurrent processing, that's fine[^1].
[^1]: In this article, we have omitted the details of goroutines. If you're interested, please look up keywords like "go routine M:N hybrid threading".

In the images that follow, we represent goroutines as the following face icon.

![7b918d84e19edc2d05c6bb1ec3543689.png](https://i.gyazo.com/7b918d84e19edc2d05c6bb1ec3543689.png)

## How to Handle Values in a Thread-safe Manner with Goroutines

### Protecting Shared Memory with Mutex
The first method is to protect variables with a Mutex.
Mutex is a mechanism that allows multiple goroutines to safely access a single variable.

The image is as follows.
![25ebe69b70202377981d0abca881f620.png](https://i.gyazo.com/25ebe69b70202377981d0abca881f620.png)

However, according to the official recommendations of Golang, control using channels, as shown next, is recommended.

### channel (Channel)
Go language has something called channels, which are like communication paths that can safely pass values.
By using channels, it's possible to handle thread-safe variables without using Mutex.
![650b4c607420bd5927931bd61757a651.png](https://i.gyazo.com/650b4c607420bd5927931bd61757a651.png)

## Implementation Examples
Here, I will explain the [sample]((https://github.com/shohei-yamashit/Go_concurrent_with_git)).
This tool outputs a list of files to be committed in Git as JSON.
In other words, it maps the result list of `git —diff —cached —name-only` in the following form:

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

In this tool, concurrency is used in the process of merging the result of `git —diff —cached —name-only` into a single Map.
Let's check the implementations in the following order[^2].

- ① Sequential processing version (implementation without concurrency)
- ② Version using Mutex
- ③ Version using channels

[^2]: Depending on the execution environment or machine condition, the fastest processing was the sequential processing version.

### Sequential Processing Version (Implementation without Concurrency)

The implementation without concurrency is as follows.

```go
// OutputMapFromGitCommand converts the results of the Git command into a Map
// Executes sequentially without using goroutines
func (executer *serializeExecuter) OutputMapFromGitCommand(resultMap *map[string]interface{}) {
	result := executer.GitCommand()
	start := time.Now()
	// Split by newline
	lines := strings.Split(result, "\n")
	// Process each line
	for _, line := range lines {
		if line == "" {
			continue
		}
		// Convert path string into Map
		sampleMap := util.MakeObjectFromPathString(line)
		// Merge Maps
		util.MergeMaps(resultMap, sampleMap)
	}
	elapsed := time.Since(start)
	fmt.Printf("実行時間: %s\n", elapsed)
}
```

### Version using Mutex

Before explaining the code, let me show an image.
![0c8742222bca09d90e9fc6eb9682ca3d.png](https://i.gyazo.com/0c8742222bca09d90e9fc6eb9682ca3d.png)

The previous function holds resultMap (pointer) as an argument.
It protects the Map with a Mutex so that multiple routines accessing this Map do not cause conflicts.
Based on the code shown in the sequential processing example, it can be implemented as follows.

```go
// OutputMapFromGitCommand converts the result of the Git command into a Map
// Implementation using Mutex
func (executer *mutexExecuter) OutputMapFromGitCommand(resultMap *map[string]interface{}) {
	result := executer.GitCommand()
	start := time.Now()
	// Addition 1: Mutex for mutual exclusion
	var mu sync.Mutex
	// Addition 2: WaitGroup to wait for goroutines to complete
	var wg sync.WaitGroup
	// Split by newline
	lines := strings.Split(result, "\n")
	// Process each line
	for _, line := range lines {
		if line == "" {
			continue
		}
		// Addition 3: Increment WaitGroup
		wg.Add(1)
		// Addition 4: Start a goroutine
		go func(line string) {
			// Addition 5: Call Done when the goroutine finishes
			defer wg.Done()
			// Addition 6: Exclusive control of map updates
			mu.Lock()
			// Convert path string to Map
			singleMap := util.MakeObjectFromPathString(line)
			util.MergeMaps(resultMap, singleMap) // Merge maps
			// Addition 6: Exclusive control of map updates
			mu.Unlock()
		}(line)
	}
	// Addition 7: Wait for all goroutines to finish
	wg.Wait()
	elapsed := time.Since(start)
	fmt.Printf("実行時間: %s\n", elapsed)
}
```

I will briefly explain the added parts.
- **Addition 1: Mutex for mutual exclusion** - Define a Mutex to control simultaneous access to shared memory. This prevents multiple goroutines from updating the map at the same time.
- **Addition 2: WaitGroup to manage goroutines** - Define a WaitGroup to wait for all goroutines to complete. This ensures that the main function does not exit until all processing is complete.
- **Addition 3: Increment WaitGroup counter** - Increment the WaitGroup counter inside the for loop to track the number of ongoing processes.
- **Addition 4: Concurrency using goroutines** - Define as a goroutine with go func.
- **Addition 5: Notify completion of processing** - Use defer wg.Done() to decrement the WaitGroup counter by one when each goroutine finishes processing.
- **Addition 6: Map updates with mutual exclusion** - Protect map updates with Lock/Unlock to maintain data integrity.
- **Addition 7: Wait for all processes to complete** - Use wg.Wait() to wait for all goroutines to finish.

This allows multiple goroutines to safely access shared memory while enabling concurrency with goroutines.

### Version using Channels

Next, I'll show an implementation pattern using channels.
In this example, instead of allowing multiple threads to access a single variable, we need to prepare a channel that holds the map.
For the time being, it seems we can create goroutines and channels as follows.

![b38ef754780680e1839ff2f7f6c1d3a8.png](https://i.gyazo.com/b38ef754780680e1839ff2f7f6c1d3a8.png)

After that, two problems remain: ① What initial value to put into the channel[^3], and ② How to pass the corresponding path strings to the routines.
[^3]: An initial value is needed because the first goroutine to execute cannot receive a map from the channel.

For the initial value to put into the channel, it seems good to put an empty map at the start of processing.
As for ②, it seems sufficient to pass the strings when defining the goroutines and define a goroutine for each path.

Complementing these, the implementation image can be as follows.

![0b8da4643285eb5770de7efc2d341ece.png](https://i.gyazo.com/0b8da4643285eb5770de7efc2d341ece.png)

The specific implementation is as follows.

```go
// OutputMapFromGitCommand converts the result of the Git command into a Map
// Implementation using channels
func (executer *channelExecuter) OutputMapFromGitCommand(resultMap *map[string]interface{}) {
	result := executer.GitCommand()
	start := time.Now()
	// Addition 1: Define a channel (close the channel when the program ends)
	channel := make(chan map[string]interface{}, 1)
	// Addition 2: Assign an initial value to the channel concerning the Map
	initMap := make(map[string]interface{})
	channel <- initMap
	// WaitGroup to wait for the completion of goroutines
	var wg sync.WaitGroup
	// Split by newline
	lines := strings.Split(result, "\n")
	// Process each line
	for _, line := range lines {
		if line == "" {
			continue
		}
		// Increment WaitGroup
		wg.Add(1)
		go func(line string) {
			// Call Done when the goroutine finishes
			defer wg.Done()
			// Addition 3: Receive the current Map from the channel
			tmpMap := <-channel
			// Create a map from the path string
			singleMap := util.MakeObjectFromPathString(line)
			util.MergeMaps(&tmpMap, singleMap) // Merge maps
			// Addition 4: Write the merged Map back to the channel
			channel <- tmpMap
		}(line)
	}
	// Wait until all goroutines have finished
	wg.Wait()
	// Addition 5: Receive the final result
	*resultMap = <-channel
	// Addition 6: Close the channel
	close(channel)
	elapsed := time.Since(start)
	fmt.Printf("実行時間: %s\n", elapsed)
}
```

I will explain the main parts of the implementation using channels.
- **Addition 1: Defining the channel** - Create a channel to send and receive messages of type `map[string]interface{}`.
- **Addition 2: Assign an initial value to the channel** - Without assigning an initial value, the routines cannot receive values from the channel, so we assign an initial value here.
- **Addition 3: Receive the map from the channel** - Receive the map that's being processed from the channel.
- **Addition 4: Send the map to the channel** - Each goroutine converts the processing target line and sends the merged map to the channel.
- **Addition 5: Receive the final result into the map** - The finally merged map remains in the channel, so retrieve it and output it as the function's result.
- **Addition 6: Close the channel** - After all processing is completed, close the channel appropriately.

Compared to the previous implementation using Mutex, you'll notice that ① each goroutine operates without being aware of other goroutines, and ② it's easier to understand the data flow.

## Which Should You Use?
Looking at Go's official standpoint, the use of channels is strongly recommended.
In [A Tour of Go (Goroutines)](https://go-tour-jp.appspot.com/concurrency/1), it is mentioned as follows.

> Because goroutines run in the same address space, access to shared memory must be synchronized. The sync package provides useful primitives for synchronization, but there are other ways, so it's not needed that much.

They assert that Mutexes (expressed as the sync package) aren't needed that much.

On the other hand, according to the book "**Learn Concurrent Programming with Go**", you can use Mutexes and channels differently as follows[^4].

[^4]: There is a translated version titled "Go言語で学ぶ並行プログラミング　他言語にも適用できる原則とベストプラクティス" ([Impress Publisher link](https://book.impress.co.jp/books/1123101144)).

- Readability of the program: Since you don't need to think about other goroutines, using channels tends to result in simpler programs.
- Coupling: Generally, using Mutexes makes the program more tightly coupled, while using channels tends to make the program loosely coupled.
- Memory consumption: Since channels send data copies, protecting with Mutexes can reduce memory consumption.
- Communication efficiency: For the above reason, protecting with Mutexes is more efficient because there is no overhead of copying.

Summing up the above, we can conclude as follows.

- From the perspective of program decoupling and code simplicity, the use of channels is generally recommended.
- However, if you want to improve performance, using Mutexes is also an option.

In any case, it seems necessary to carefully consider which to adopt based on a comprehensive assessment of the characteristics of the processing.

## Conclusion
In this article, we explained the important concepts of Mutex and Channel in Go concurrency.
- **Mutex**: Performs mutual exclusion so that multiple goroutines can safely access shared memory.
- **Channel**: Achieves safe concurrency by passing thread-safe data between goroutines.

Although the use of channels is recommended officially, using Mutexes might also be considered depending on the solution.

The book "**Learn Concurrent Programming with Go**", which was referenced in this article, is understandable even if you are not familiar with Go language. If you're interested, please have a look.
@[og](https://www.manning.com/books/learn-concurrent-programming-with-go)
