---
title: Go言語の並行処理を完全攻略！MutexとChannelを視覚的に学ぶ
author: shohei-yamashita
date: 2025-01-10
tags: [go, 並行処理]
image: true
---
## 初めに
ビジネスソリューション事業部の山下です。個人でGo言語のプログラムを記述している最中に並行処理の理解に苦戦したので、記事として投稿いたしました。
ここでは、Go言語の並行処理において重要な概念であるMutexとChannelについて、イメージを用いて整理しようと思います。
Go言語がよくわからなくても、ニュアンスが伝われば幸いです。また、興味があれば[サンプルコード](https://github.com/shohei-yamashit/Go_concurrent_with_git)も動かしてみてください。

## Goの並行処理の基本概念
### goroutine(ゴルーチン)
goroutine(ゴルーチン)はGoランタイムが管理する軽量スレッドです。
プログラムを実行するカーネルを意識せずに、カーネルを跨いだ並行処理を実装できます。
ゴルーチンの理解のため、以下のサンプルをご覧ください。
ここでは、直列処理によりカウントアップを実行した後に、同様の処理をゴルーチンを使って実行します。
実装例にあるように、`go  {処理}`という形でゴルーチンを定義し実行できます。

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
	
	// Waiting Groupの定義
	var wg sync.WaitGroup
	// 1から5までの数値をゴルーチンで出力
	for i := 1; i <= 5; i++ {
		wg.Add(1) // Waiting Groupのカウンタを増やす
		// ゴルーチンとして処理を定義
		go func(i int) {
			defer wg.Done() // ルーチンの最後にWgのカウンタを１つ取り除く
			println(i)
			time.Sleep(1 * time.Second)
		}(i)
	}
	wg.Wait() // Waiting Groupのカウンタが0になるまで待機
}
```

実行して標準出力を確認すると、直列処理と並行処理の両方が適切に実行されていることがわかります。

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

イメージとしては以下のようになります。
![49d535e5c949d840114dd82e2dae0a2a.png](https://i.gyazo.com/49d535e5c949d840114dd82e2dae0a2a.png)

:::info
WaitGroup (wg) は、複数のゴルーチンの完了を追跡・待機するための仕組みです。主に以下の3つのメソッドを使用します。
- **wg.Add(delta)**: WaitGroupのカウンターを増やす。通常、新しいゴルーチンを開始する前に使用する。
- **wg.Done()**: カウンターを1つ減らす。ゴルーチンの処理が完了したときに呼び出す。
- **wg.Wait()**: カウンターが0になるまでブロックする。全てのゴルーチンの完了を待つために使用する。
この例では、WaitGroupにより全ての並行処理が完了するまで関数の終了を待機できます。
:::

いずれにせよ、ゴルーチンは並行処理用のスレッドであることだけわかっていれば問題ありません[^1]。
[^1]: 本記事ではゴルーチンの詳細は割愛しています。興味のある方は「go routine M:N hybrid threading」等のキーワードで調べてみてください。

なお、以降に記載するイメージではgoroutineを以下のような顔のマークで表現しています。

![7b918d84e19edc2d05c6bb1ec3543689.png](https://i.gyazo.com/7b918d84e19edc2d05c6bb1ec3543689.png)

## ゴルーチンでスレッドセーフに値を扱う方法

### Mutexによる共有メモリの保護
1つ目として、Mutexで変数を保護する方法があげられます。
複数のゴルーチンから1つの変数に安全にアクセスできる仕組みがMutexです。

以下がイメージとなります。
![25ebe69b70202377981d0abca881f620.png](https://i.gyazo.com/25ebe69b70202377981d0abca881f620.png)

しかしながら、Golang公式の推奨事項として、次で示すchannelによる制御が推奨されています。

### channel(チャネル)
Go言語には、channel(チャネル)と呼ばれる安全に値を受け渡しできる通信経路のようなものが備わっています。
チャネルを利用することでMutexを使わないスレッドセーフな変数の扱いが可能になります。
![650b4c607420bd5927931bd61757a651.png](https://i.gyazo.com/650b4c607420bd5927931bd61757a651.png)

## 実装例
ここで、[サンプル]((https://github.com/shohei-yamashit/Go_concurrent_with_git))の説明をします。
このツールはGitのコミット対象となるファイルの一覧を、Jsonとして出力するツールです。
要するに`git —diff —cached —name-only`の結果一覧を以下のような形でマッピングしています。

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

このツールでは、`git —diff —cached —name-only`の結果を1つのMapにマージする過程で並行処理を使っています。
以下の順で実装を確認してみましょう[^2]。

- ①直列処理ver(並行処理をしない実装)
- ②Mutexを使うver
- ③チャネルを使うver

[^2]: 実行環境やマシンの状態にもよりますが、一番処理が早かったのは直列処理verでした。

### 直列処理ver(並行処理をしない実装)

並行処理を使わない実装は以下のとおりです。

```go
// OutputMapFromGitCommand はGitコマンドの結果をMapに変換する
// Goルーチンを使わずに直列処理で実行する
func (executer *serializeExecuter) OutputMapFromGitCommand(resultMap *map[string]interface{}) {
	result := executer.GitCommand()
	start := time.Now()
	// 改行区切りで分割
	lines := strings.Split(result, "\n")
	// lineごとに処理を実行
	for _, line := range lines {
		if line == "" {
			continue
		}
		// パスの文字列をMapに変換
		sampleMap := util.MakeObjectFromPathString(line)
		// Mapをマージ
		util.MergeMaps(resultMap, sampleMap)
	}
	elapsed := time.Since(start)
	fmt.Printf("実行時間: %s\n", elapsed)
}
```

### Mutexを使うver

コードの説明をする前にイメージを示しておきます。
![0c8742222bca09d90e9fc6eb9682ca3d.png](https://i.gyazo.com/0c8742222bca09d90e9fc6eb9682ca3d.png)

前述の関数は引数としてresultMap（のポインタ）を保持しています。
このMapに複数のルーチンからアクセスしても競合しないよう、Mutexによる保護をおこなっています。
直列処理の例で示したコードをベースに、以下のように実装できます。

```go
// OutputMapFromGitCommand はGitコマンドの結果をMapに変換する
// Mutexを使った実装
func (executer *mutexExecuter) OutputMapFromGitCommand(resultMap *map[string]interface{}) {
	result := executer.GitCommand()
	start := time.Now()
	// 追加１：排他制御用のMutex
	var mu sync.Mutex
	// 追加２：ゴルーチンの完了を待つためのWaitGroup
	var wg sync.WaitGroup
	// 改行区切りで分割
	lines := strings.Split(result, "\n")
	// lineごとに処理を実行
	for _, line := range lines {
		if line == "" {
			continue
		}
		// 追加３：WaitingGroupを１つ増やす
		wg.Add(1)
		// 追加４：ゴルーチンを起動
		go func(line string) {
			// 追加５：ゴルーチンが終了したらDoneを呼ぶ
			defer wg.Done()
			// 追加６：マップの更新を排他制御
			mu.Lock()
			// パスの文字列をMapに変換
			singleMap := util.MakeObjectFromPathString(line)
			util.MergeMaps(resultMap, singleMap) // マップをマージ
			// 追加６：マップの更新を排他制御
			mu.Unlock()
		}(line)
	}
	// 追加７：全てのゴルーチンが終了するまで待つ
	wg.Wait()
	elapsed := time.Since(start)
	fmt.Printf("実行時間: %s\n", elapsed)
}
```

追加した部分について軽く説明します。
- **追加１：排他制御用のMutex** - 共有メモリへの同時アクセスを制御するMutexを定義する。これにより、複数のゴルーチンが同時にマップを更新することを防ぐ。
- **追加２：ゴルーチンを管理するためのWaitGroup** - 全てのゴルーチンの完了を待つためのWaitGroupを定義する。これにより、すべての処理が完了してからメイン関数が終了することを保証する。
- **追加３：WaitGroupのカウントアップ** - for文の中でWaitGroupのカウンターを増やすことで、実行中の処理数を追跡する。
- **追加４：ゴルーチンによる並行処理** - go funcでゴルーチンとして定義する。
- **追加５：処理完了の通知** - defer wg.Done()で各ゴルーチンの処理完了時にWaitGroupのカウンターを1つ減らす。
- **追加６：排他制御によるマップ更新** - Lock/Unlockでマップの更新を保護し、データの整合性を維持する。
- **追加７：全処理の完了待ち** - wg.Wait()で全てのゴルーチンの完了を待つ。
これにより、複数のゴルーチンが安全に共有メモリにアクセスしつつ、ゴルーチンによる並行処理が可能になります。

### チャネルを使うver
今度はチャネルを使う実装パターンを示します。
この例では複数のスレッドから1つの変数にアクセスさせず、マップを保持するチャネルを用意しなければなりません。
ひとまず、次のようなゴルーチンとチャネルを作成すれば良さそうです。

![b38ef754780680e1839ff2f7f6c1d3a8.png](https://i.gyazo.com/b38ef754780680e1839ff2f7f6c1d3a8.png)

あとは①チャネルに入れる初期値をどうするのか[^3]、②パスに対応する文字列をどうルーチンに渡すのかという2つの問題が残ります。
[^3]: 一番はじめに実行されるゴルーチンがチャネルからマップを受け取れなくなるため、初期値が必要になります。

①チャネルに入れる初期値については、処理開始時に空のマップを入れてあげれば良さそうです。
一方、②についてはゴルーチンを定義する際に文字列を渡して、パスごとにゴルーチンを定義すれば良さそうです。

これらを補うと、次のような実装イメージが想定できます。
![0b8da4643285eb5770de7efc2d341ece.png](https://i.gyazo.com/0b8da4643285eb5770de7efc2d341ece.png)

具体的な実装は次のようになります。

```go
// OutputMapFromGitCommand はGitコマンドの結果をMapに変換する
// チャネルを使った実装
func (executer *channelExecuter) OutputMapFromGitCommand(resultMap *map[string]interface{}) {
	result := executer.GitCommand()
	start := time.Now()
	// 追加１：チャネルの定義(プログラム終了時にチャネルを閉じる)
	channel := make(chan map[string]interface{}, 1)
	// 追加２：Mapに関するチャネルに初期値を代入
	initMap := make(map[string]interface{})
	channel <- initMap
	// ゴルーチンの完了を待つためのWaitGroup
	var wg sync.WaitGroup
	// 改行区切りで分割
	lines := strings.Split(result, "\n")
	// lineごとに処理を実行
	for _, line := range lines {
		if line == "" {
			continue
		}
		// WaitingGroupを１つ増やす
		wg.Add(1)
		go func(line string) {
			// ゴルーチンが終了したらDoneを呼ぶ
			defer wg.Done()
			// 追加３：チャネルから現在のMapを受領
			tmpMap := <-channel
			// パス文字列からマップを作成
			singleMap := util.MakeObjectFromPathString(line)
			util.MergeMaps(&tmpMap, singleMap) // マップをマージ
			// 追加４：マージされたMapをチャネルに書き込み
			channel <- tmpMap
		}(line)
	}
	// 全てのゴルーチンが終了するまで待つ
	wg.Wait()
	// 追加５：最終的な結果を受け取る
	*resultMap = <-channel
	// 追加６：チャネルを閉じる
	close(channel)
	elapsed := time.Since(start)
	fmt.Printf("実行時間: %s\n", elapsed)
}
```

チャネルを使用した実装について、主要な部分を説明します。
- **追加１：チャネルの定義** - string型のメッセージを送受信するためのチャネルを作成する。
- **追加２：チャネルに初期値を代入** - 初期値を代入しないとルーチンがチャネルから値を取り込めないため、ここで初期値を代入する。
- **追加３：チャネルからマップを受領** - 処理途中のマップをチャネルから受領する。
- **追加４：チャネルにマップを送信** - 各ゴルーチンから処理対象の行を変換し、マージしたマップをチャネルに送信する。
- **追加５：最終的な結果をマップに受領** - 最終的にマージされたマップがチャネルに残っているので回収して、関数の出力結果とする。
- **追加６：チャネルのクローズ** - すべての処理が完了した後、チャネルを適切に閉じる。

先ほどのMutexによる実装と比較しても、①各ゴルーチンが別のゴルーチンを意識せず動作していること、および、②データの流れを理解しやすいことが見て取れます。

## どちらを使うべきか
Go言語の公式見解を見ると、基本的にはチャネルの利用が強く推奨されているようです。
[A Tour of Go (Goroutines)](https://go-tour-jp.appspot.com/concurrency/1)では以下のように言及されています。

> goroutineは、同じアドレス空間で実行されるため、共有メモリへのアクセスは必ず同期する必要があります。syncパッケージは同期する際に役に立つ方法を提供していますが、別の方法があるためそれほど必要ありません。 
Mutex(syncパッケージと表現されているもの)はあまり必要ないと断言されてしまっています。

一方、書籍「**Learn Concurrent Programming with Go**」によれば、以下のようにMutexとチャネルを使い分けできるようです[^4]。

[^4]: 翻訳版として「Go言語で学ぶ並行プログラミング　他言語にも適用できる原則とベストプラクティス」があります。（[インプレス社リンク](https://book.impress.co.jp/books/1123101144)）

- プログラムの読みやすさ：別のゴルーチンのことを考える必要がないため、チャネルを使った方がシンプルなプログラムになりやすい
- 結合度：一般的に、Mutexを使う方式にするとプログラムが密結合になりやすく、チャネルを使えば疎結合なプログラムになりやすい
- メモリの消費量：チャネルはデータのコピーを送信する都合上、Mutexで保護する方がメモリの消費量は抑えられる
- 通信の効率性：前述の理由より、コピーする手間がない分Mutexで保護する方が効率的である

上記の話をまとめると、以下のように結論づけられます。

- プログラムの疎結合化やコードのシンプルさの観点から、一般的にはチャネルの利用が推奨される。
- ただ、パフォーマンスを上げたい場合にはMutexの利用も視野に入る

いずれにせよ、処理の特性などを総合的に判断したうえで、どちらを採用すべきかを吟味する必要がありそうです。

## まとめ

本記事では、Go言語の並行処理で重要なMutexとChannel(チャネル)について解説しました。
- **Mutex**：共有メモリに対して複数のゴルーチンが安全にアクセスできるよう、排他制御を行う
- **Channel**：ゴルーチン間でスレッドセーフなデータを受け渡しすることで、安全に並行処理を実現する

公式ではチャネルの利用が推奨されていますが、ソリューションによってはMutexを使うことも視野に入れてもいいかもしれません。

本記事で参考にした書籍「**Learn Concurrent Programming with Go**」は、Go言語に精通していなくても十分理解できる内容になっています。興味のある方はぜひ手に取ってみてください。
@[og](https://www.manning.com/books/learn-concurrent-programming-with-go)



