---
title: UMLをプログラミング言語で実装するには？ Go言語編
author: takayuki-oguro
date: 2024-07-01
tags: [UML, go]
image: true
---

# はじめに

UML表記法やUMLモデリングのセミナー講師をしていると、「自分の言語ではどのように実装すればよいのか」というご質問を受けることがあります。また、講師側としても、受講生が使っているプログラミング言語でUMLを説明すると、すんなりと分かって頂ける経験が幾度となくあります。多くのプログラマがUMLモデリングに興味を持って頂けているようですが、UMLのモデルをどのようにソースコードにするかについては意外と知られていません。これが、UMLモデリングが広まらない原因の1つではないかと考えています。

UMLからソースコードへの変換を「マッピング」といい、プログラミング言語名を付けて、「UML/C++マッピング」のように呼びます。このシリーズは、さまざまなプログラミング言語への「UML/Xマッピング」を紹介して、馴染みのあるプログラミング言語からUMLを逆に理解して貰えるように企画したものです。ただし、マッピングは様々なマッピング方法を考える事が可能です。ご紹介するものは、その具体例の1つだとお考え下さい。

# この記事を理解するために必要な基本的な知識

この記事は、最小限のUML表記法が分かることを前提としています。例えば、クラス図では属性/操作や関連端名/多重度および可視性の読み方、汎化関係/実現関係の意味、シーケンス図のメッセージとクラスの操作の対応関係、を理解していることが前提です。

# この記事のマッピングの方針

Go言語はOOP言語ではなく、UMLのクラス概念や一部の可視性（private/protected）をサポートしていません。そのため、この記事では、structと関数の組み合わせでクラスを表現します。また、可視性はGo言語がサポートしている範囲のみを対象とします。提示するUMLのダイアグラムはプログラミング言語のサポートに関わらず提示し、サンプルコード内にサポート外である旨を記載します。

 :::column:豆知識!
 
Go言語で複数のソースファイルを含むプログラムを実行する場合、go run コマンドを使用して、必要なすべてのファイルを指定する必要があります。
例：go run main.go A.go B.go

 :::

# クラスの基本要素(クラス,属性,操作)のマッピング

![クラス属性操作](/img/blogs/2024/uml-x-mapping/01_classattmethod.png)

A.go
```go
package main

// A structは、さまざまなアクセスレベルのメンバーを持つクラスの例です。
type A struct {
    // member1 int ：Go言語はprivate(-)はサポート外
    // member2 string ： Go言語はprotected(#)はサポート外
    Member3 int    // public(+）は先頭が大文字
    member4 string // package(~)は、先頭が小文字
}

// privateメソッド ： Go言語はprivate(-)はサポート外
// func (a *A) method1() {}

// protectedメソッド ： Go言語はprotected(#)はサポート外
// func (a *A) method2() string { return "" }

// public(+）は先頭が大文字
func (a *A) Method3() {}

// package(~)は、先頭が小文字
func (a *A) method4() string { return "" }

```

B.go
```go
package main

// B structは、クラスの例です。
type B struct {}

// publicメソッド。どこからでもアクセス可能。
func (b *B) Method1() string { return "" }

// publicメソッド。
func (b *B) HookMethod() string { return "" }
```

C.go
```go
package main

// C structは、別のクラスの例です。
type C struct {
   // member1 int // go言語はstatic変数はサポート外です
}

// publicメソッド。go言語はstaticメソッドはサポート外です
// func (c *C) Method1() int { return 0 }
```

main.go
```go
package main

import "fmt"

func main() {
    // A, B, Cの各インスタンスを作成し、それぞれのメソッドや変数を利用する例。
    a := A{Member3: 20, member4: "World"}
    b := B{}
    c := C{}

    // Aのpublic変数、Bのメソッドの結果を出力。
    fmt.Println(a.Member3)
    fmt.Println(a.member4)
    fmt.Println(b.Method1())
}
```

# 関連（片方向 多重度0..1）のマッピング

![関連_片方向関連](/img/blogs/2024/uml-x-mapping/02_01_singlerel.png)

A.go
```go
package main

// A struct は B struct のインスタンスをオプショナルで持つ
type A struct {
	roleB *B  // Bのポインタを保持するフィールド。Bが関連づけられていない場合はnilになる。
}

// NewA は Aのインスタンスを作成するコンストラクタ関数。
// 引数に *B を取り、Aの roleB フィールドに設定する。
func NewA(b *B) *A {
	return &A{roleB: b}
}

// SetB は Aの roleB フィールドに新しい *B の値を設定する。
func (a *A) SetB(b *B) {
	a.roleB = b
}

// GetB は Aの roleB フィールドの値を返す。
// Bのインスタンスへの参照を返すが、設定されていない場合はnilを返す。
func (a *A) GetB() *B {
	return a.roleB
}
```

B.go
```go
package main

type B struct {
	// Bの属性をここに定義
}
```

main.go
```go
package main

import "fmt"

func main() {
	b := &B{}  // Bのインスタンスを作成
	a := NewA(b)  // Aのインスタンスを作成し、Bのインスタンスを関連付ける

	fmt.Println(a.GetB())  // AからBのインスタンスを取得し、そのアドレスを出力

	a.SetB(nil)  // AからBの関連を削除
	fmt.Println(a.GetB())  // nilが出力されることを確認
}
```

# 関連（双方向 多重度0..1）のマッピング

![関連_双方向関連](/img/blogs/2024/uml-x-mapping/02_02_doublerel.png)

A.go
```go
package main

// A struct は B struct への参照を持つ
type A struct {
	roleB *B  // Bへの参照
}

// NewA は Aの新しいインスタンスを作成し、必要に応じて B と関連付ける
func NewA(b *B) *A {
	a := &A{roleB: b}
	if b != nil {
		b.roleA = a // BにAの参照を設定
	}
	return a
}

// SetB は Bへの参照を更新し、古いBのAへの参照を解除する
func (a *A) SetB(b *B) {
	if a.roleB != nil {
		a.roleB.roleA = nil // 古いBのAへの参照を解除
	}
	a.roleB = b
	if b != nil {
		b.roleA = a // 新しいBにAの参照を設定
	}
}
```

B.go
```go
package main

// B struct は A struct への参照を持つ
type B struct {
	roleA *A  // Aへの参照
}

// NewB は Bの新しいインスタンスを作成し、必要に応じて A と関連付ける
func NewB(a *A) *B {
	b := &B{roleA: a}
	if a != nil {
		a.roleB = b // AにBの参照を設定
	}
	return b
}

// SetA は Aへの参照を更新し、古いAのBへの参照を解除する
func (b *B) SetA(a *A) {
	if b.roleA != nil {
		b.roleA.roleB = nil // 古いAのBへの参照を解除
	}
	b.roleA = a
	if a != nil {
		a.roleB = b // 新しいAにBの参照を設定
	}
}
```

main.go
```go
package main

import "fmt"

func main() {
	a := NewA(nil) // Aのインスタンスを作成、Bは未設定
	b := NewB(nil) // Bのインスタンスを作成、Aは未設定

	a.SetB(b) // AにBを設定し、BにAを設定

	fmt.Printf("A's roleB: %p\n", a.roleB) // AからBの参照を表示
	fmt.Printf("B's roleA: %p\n", b.roleA) // BからAの参照を表示

	// 参照の解除を試す
	a.SetB(nil)

	fmt.Printf("After disconnection - A's roleB: %p\n", a.roleB) // 解除後のAのBへの参照
	fmt.Printf("After disconnection - B's roleA: %p\n", b.roleA) // 解除後のBのAへの参照
}
```

# 関連（片方向関連 多重度1）のマッピング

![関連_多重度1](/img/blogs/2024/uml-x-mapping/02_03_multi_1.png)

A.go
```go
package main

import "errors"

// A structはB structへの参照を持つ
type A struct {
    roleB *B  // Bへの参照。Bが存在することが前提
}

// NewAはAの新しいインスタンスを作成するコンストラクタ関数
// Bのインスタンスがnilでないことを保証
func NewA(b *B) (*A, error) {
    if b == nil {
        return nil, errors.New("Bのインスタンスは必須です")
    }
    return &A{roleB: b}, nil
}

// GetBはAが持つBの参照を返す
func (a *A) GetB() *B {
    return a.roleB
}

// SetBはAのBへの参照を設定または変更する
// Bのインスタンスがnilでないことを保証
func (a *A) SetB(b *B) error {
    if b == nil {
        return errors.New("Bのインスタンスは必須です")
    }
    a.roleB = b
    return nil
}
```

B.go
```go
package main

// B structは独自の属性を持つ
type B struct {
    // ここにBの属性を定義
}
```

main.go
```go
package main

import "fmt"

func main() {
    b := &B{}   // Bのインスタンスを作成
    a, err := NewA(b)  // Aのインスタンスを作成し、Bを参照させる
    if err != nil {
        fmt.Println("Error:", err)
        return
    }

    fmt.Printf("B from A: %p\n", a.GetB())  // Aが持つBの参照を表示

    newB := &B{}  // 別のBのインスタンスを作成
    err = a.SetB(newB)  // Aが新しいBを参照するように変更
    if err != nil {
        fmt.Println("Error:", err)
        return
    }

    fmt.Printf("New B from A: %p\n", a.GetB())  // Aが持つ新しいBの参照を表示
}
```


# 関連（片方向関連 多重度0..*）のマッピング

![関連_多重度0..*](/img/blogs/2024/uml-x-mapping/02_04_multi_0astah.png)

A.go
```go
package main

// A struct は B struct のインスタンスのスライスを持つ
type A struct {
	roleBs []B  // Bのスライス。Aは0個以上のBインスタンスを持てる
}

// NewA は Aの新しいインスタンスを作成する。
func NewA() *A {
	return &A{roleBs: []B{}}
}

// AddB は Aに新しい B のインスタンスを追加する
func (a *A) AddB(b B) {
	a.roleBs = append(a.roleBs, b)
}

// GetBs は Aが持つすべての B のインスタンスを返す
func (a *A) GetBs() []B {
	return a.roleBs
}
```

B.go
```go
package main

// B struct は独自の属性を持つことができる
type B struct {
	// Bの属性を定義
}
```

main.go
```go
package main

import "fmt"

func main() {
	a := NewA()  // Aのインスタンスを作成
	b1 := B{}    // Bのインスタンスを作成
	b2 := B{}    // 別のBのインスタンスを作成

	a.AddB(b1)  // AにBを追加
	a.AddB(b2)  // Aにもう一つBを追加

	fmt.Println(a.GetBs())  // Aが持つBのインスタンスを出力
}
```

# 関連（集約）のマッピング

![関連_集約](/img/blogs/2024/uml-x-mapping/02_05_aggrigate.png)

A.go
```go
package main

// A struct は集約の「全体」として、B struct への参照を持つ
type A struct {
    roleB *B  // Bへの参照。BのライフサイクルはAに依存しない
}

// NewA は Aの新しいインスタンスを作成する。
func NewA(b *B) *A {
    return &A{roleB: b}
}

// GetB は Aが持つ B のインスタンスを返す
func (a *A) GetB() *B {
    return a.roleB
}

// SetB は Aに新しい B のインスタンスを関連付ける
func (a *A) SetB(b *B) {
    a.roleB = b
}
```

B.go
```go
package main

// B struct は独自の属性を持つことができる
type B struct {
    // Bの属性を定義
}
```

main.go
```go
package main

import "fmt"

func main() {
    b := &B{}  // Bのインスタンスを作成
    a := NewA(b)  // Aのインスタンスを作成し、Bを集約

    fmt.Printf("B from A: %p\n", a.GetB())  // Aが持つBのインスタンスのアドレスを出力

    // Bのインスタンスを変更する
    anotherB := &B{}
    a.SetB(anotherB)

    fmt.Printf("New B from A: %p\n", a.GetB())  // 変更後のBのインスタンスのアドレスを出力
}
```

# 関連（コンポジション）のマッピング

![関連_コンポジション](/img/blogs/2024/uml-x-mapping/02_06_composition.png)

A.go
```go
package main

// A struct は B struct のインスタンスを完全に所有する
type A struct {
    roleB *B  // Bへのポインタ。コンポジションの関係を形成
}

// NewA は Aの新しいインスタンスを作成し、Bの新しいインスタンスも内部で生成する
func NewA() *A {
    return &A{roleB: &B{}}
}

// GetB は Aが持つ B のインスタンスを返す
func (a *A) GetB() *B {
    return a.roleB
}

// Clear は Aの持つ B への参照を解除し、Bのインスタンスをガービッジコレクションの対象とする
func (a *A) Clear() {
    a.roleB = nil  // Bへの参照をnilに設定
}
```

B.go
```go
package main

// B struct は Aによって完全に所有される
type B struct {
    // Bの属性をここに定義
}
```

main.go
```go
package main

import "fmt"

func main() {
    a := NewA()  // Aのインスタンスを作成
    fmt.Printf("Before clear: %p\n", a.GetB())  // Clear前のBのインスタンスのアドレスを出力
    a.Clear()  // AからBへの参照を解除
    fmt.Printf("After clear: %p\n", a.GetB())  // Clear後にnilが出力されることを確認
}
```

# 関連（限定子）のマッピング

![関連_限定子](/img/blogs/2024/uml-x-mapping/02_07_qualifier.png)

A.go
```go
package main

// A struct はキーを使って特定の B struct への参照を管理する
type A struct {
    roles map[string]*B  // キーとBのインスタンスのマッピング
}

// NewA は Aの新しいインスタンスを作成する
func NewA() *A {
    return &A{roles: make(map[string]*B)}
}

// SetB は指定されたキーで B のインスタンスを A に関連付ける
func (a *A) SetB(key string, b *B) {
    a.roles[key] = b
}

// GetB は指定されたキーに関連付けられた B のインスタンスを返す
func (a *A) GetB(key string) *B {
    return a.roles[key]
}

// RemoveB は指定されたキーに関連付けられた B のインスタンスの参照を削除する
func (a *A) RemoveB(key string) {
    delete(a.roles, key)
}
```

B.go
```go
package main

// B struct は独自の属性を持つことができる
type B struct {
    // Bの属性をここに定義
}
```

main.go
```go
package main

import "fmt"

func main() {
    a := NewA()
    b := &B{}
    
    // Bをキー'key1'でセットする
    a.SetB("key1", b)
    fmt.Printf("B from A by key 'key1': %p\n", a.GetB("key1"))
    
    // Bの参照を削除する
    a.RemoveB("key1")
    fmt.Printf("B from A by key 'key1' after removal: %p\n", a.GetB("key1"))
}
```

# 汎化関係のマッピング（継承でのマッピング）
言語的に継承の仕組みがある言語では継承で実装しますが、言語的に継承の仕組みがない言語では埋め込みで実装します。

![汎化関係_継承で実装](/img/blogs/2024/uml-x-mapping/03_01_general_inheri.png)

Go言語は、言語的に継承の仕組みがないため、基底クラスを埋め込んだ実装を紹介します。

A.go
```go
package main

// A は基底クラスとしての機能を持つ
type A struct {
    Name string
}

func (a *A) Greet() string {
    return "Hello, " + a.Name
}
```

B.go
```go
package main

// B は A を埋め込んで、A の機能を継承する
type B struct {
    A // Aの機能を埋め込むことで継承する
}

// NewB はBの新しいインスタンスを作成する
func NewB(name string) *B {
    return &B{A: A{Name: name}}
}
```

main.go
```go
package main

import "fmt"

func main() {
    b := NewB("Alice")
    fmt.Println(b.Greet())  // "Hello, Alice" を出力
}
```

# 汎化関係のマッピング（委譲でのマッピング）
継承による実装は基底クラスと派生クラスの結合度がより強くなるため、意図的に結合度を下げるために委譲による実装を使うことがあります。

![汎化関係_委譲で実装](/img/blogs/2024/uml-x-mapping/03_02_general_delegate.png)

A.go
```go
package main

// A struct はいくつかの基本的な機能を持っています。
type A struct {
    Name string
}

// Greet は A の挨拶メソッドです。
func (a *A) Greet() string {
    return "Hello, I'm " + a.Name
}
```

B.go
```go
package main

// B は A を含んで委譲の関係を形成します。
type B struct {
    a A
}

// NewB は Bのインスタンスを生成し、内部でAのインスタンスを初期化します。
func NewB(name string) *B {
    return &B{
        a: A{Name: name},
    }
}

// Greet は内部の A の Greet メソッドを呼び出します。
func (b *B) Greet() string {
    return b.a.Greet()  // AのGreetを呼び出す
}
```

main.go
```go
package main

import "fmt"

func main() {
    b := NewB("Alice")
    fmt.Println(b.Greet())  // Bを通じてAのGreetメソッドを実行
}
```

# 実現関係のマッピング

![実現関係](/img/blogs/2024/uml-x-mapping/04_realize.png)

interface_a.go
```go
package main

// InterfaceA はmethod1を持つインターフェイスです。
type InterfaceA interface {
    Method1() int
}

```

b.go
```go
package main

// B は InterfaceA インターフェイスを実装します。
type B struct{}

// Method1 は InterfaceA の要件を満たすため、B に実装されています。
func (b B) Method1() int {
    // ここで何らかの計算や操作を行い、整数を返します。
    return 42 // 例として 42 を返す固定値です。
}

```

main.go
```go
package main

import "fmt"

func main() {
    var a InterfaceA // InterfaceA インターフェイスの変数を宣言します。
    a = B{}          // Bのインスタンスを InterfaceA 型の変数に代入します。

    // Bが実装する Method1 を呼び出し、結果を出力します。
    fmt.Println(a.Method1()) // 出力: 42
}

```

# パッケージ図の依存のマッピング

![パッケージ図](/img/blogs/2024/uml-x-mapping/05_package_dependency.png)

package1/package1.go
```go
package package1

import (
    "fmt"
    "package2" // 同一モジュール内のパッケージなので、モジュール名は不要
)

// UsePackage2 は Package2 の機能を使用します
func UsePackage2() {
    fmt.Println(package2.ProvideData())
}
```

package2/package2.go
```go
package package2

// ProvideData は何らかのデータを提供する関数です
func ProvideData() string {
    return "Data from Package2"
}
```

main.go
```go
package main

import (
    "package1" // 同一モジュール内の相対パスによるインポート
)

func main() {
    package1.UsePackage2()
}
```

# おわりに

本記事は、今後も更新していく可能性があります。ご利用の際は、最新の情報をご覧ください。

 