---
title: How to Implement UML in a Programming Language? Go Language Edition
author: takayuki-oguro
date: 2024-07-01T00:00:00.000Z
tags:
  - UML
  - go
image: true
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/blogs/2024/07/01/uml-x-mapping-go1/).
:::



# Introduction

When I conduct seminars on UML notation and UML modeling, I often receive questions like, "How should I implement this in my language?" Additionally, as an instructor, I have repeatedly experienced that explaining UML in the programming language used by the students makes it easier for them to understand. It seems that many programmers are interested in UML modeling, but surprisingly, they are not well informed about how to translate UML models into source code. I believe this is one of the reasons why UML modeling has not become widespread.

The conversion from UML to source code is called "mapping," and it is referred to with the programming language name, such as "UML/C++ mapping." This series introduces "UML/X mapping" for various programming languages to help you understand UML from the programming language you are familiar with. However, there are various ways to think about mapping. Consider the ones introduced here as just one of the concrete examples.

# Basic Knowledge Required to Understand This Article

This article assumes that you have a minimal understanding of UML notation. For example, it assumes you understand how to read attributes/operations and association end names/multiplicities and visibility in class diagrams, the meaning of generalization/realization relationships, and the correspondence between messages in sequence diagrams and class operations.

# Mapping Policy in This Article

Go language is not an OOP language and does not support the class concept or some visibility (private/protected) of UML. Therefore, in this article, classes are represented by a combination of structs and functions. Also, visibility is limited to what Go language supports. The UML diagrams presented will be shown regardless of the programming language support, and it will be noted within the sample code if it is unsupported.

:::column:豆知識!

When running a program that includes multiple source files in Go language, you need to specify all the necessary files using the `go run` command.
Example: `go run main.go A.go B.go`

:::

# Mapping Basic Elements of Classes (Class, Attributes, Operations)

![Class Attributes Operations](/img/blogs/2024/uml-x-mapping/01_classattmethod.png)

A.go
```go
package main

// A struct is an example of a class with various access levels of members.
type A struct {
    // member1 int: Go language does not support private (-)
    // member2 string: Go language does not support protected (#)
    Member3 int    // public (+) is capitalized
    member4 string // package (~) is lowercase
}

// private method: Go language does not support private (-)
// func (a *A) method1() {}

// protected method: Go language does not support protected (#)
// func (a *A) method2() string { return "" }

// public (+) is capitalized
func (a *A) Method3() {}

// package (~) is lowercase
func (a *A) method4() string { return "" }

```

B.go
```go
package main

// B struct is an example of a class.
type B struct {}

// public method. Accessible from anywhere.
func (b *B) Method1() string { return "" }

// public method.
func (b *B) HookMethod() string { return "" }
```

C.go
```go
package main

// C struct is another example of a class.
type C struct {
   // member1 int // Go language does not support static variables
}

// public method. Go language does not support static methods
// func (c *C) Method1() int { return 0 }
```

main.go
```go
package main

import "fmt"

func main() {
    // Create instances of A, B, and C, and use their methods and variables.
    a := A{Member3: 20, member4: "World"}
    b := B{}
    c := C{}

    // Output public variables of A and results of methods of B.
    fmt.Println(a.Member3)
    fmt.Println(a.member4)
    fmt.Println(b.Method1())
}
```

# Mapping Association (Unidirectional Multiplicity 0..1)

![Association_Unidirectional](/img/blogs/2024/uml-x-mapping/02_01_singlerel.png)

A.go
```go
package main

// A struct optionally holds an instance of B struct
type A struct {
	roleB *B  // Field holding a pointer to B. If B is not associated, it will be nil.
}

// NewA is a constructor function that creates an instance of A.
// Takes *B as an argument and sets it to the roleB field of A.
func NewA(b *B) *A {
	return &A{roleB: b}
}

// SetB sets a new *B value to the roleB field of A.
func (a *A) SetB(b *B) {
	a.roleB = b
}

// GetB returns the value of the roleB field of A.
// Returns a reference to an instance of B, or nil if not set.
func (a *A) GetB() *B {
	return a.roleB
}
```

B.go
```go
package main

type B struct {
	// Define attributes and methods of B here
}
```

main.go
```go
package main

import "fmt"

func main() {
	b := &B{}  // Create an instance of B
	a := NewA(b)  // Create an instance of A and associate it with an instance of B

	fmt.Println(a.GetB())  // Get the instance of B from A and output its address

	a.SetB(nil)  // Remove the association of B from A
	fmt.Println(a.GetB())  // Confirm that nil is output
}
```

# Mapping Association (Bidirectional Multiplicity 0..1)

![Association_Bidirectional](/img/blogs/2024/uml-x-mapping/02_02_doublerel.png)

A.go
```go
package main

// A struct holds a reference to B struct
type A struct {
	roleB *B  // Reference to B
}

// NewA creates a new instance of A and associates it with B if necessary
func NewA(b *B) *A {
	a := &A{roleB: b}
	if b != nil {
		b.roleA = a // Set reference to A in B
	}
	return a
}

// SetB updates the reference to B and removes the reference to A in the old B
func (a *A) SetB(b *B) {
	if a.roleB != nil {
		a.roleB.roleA = nil // Remove reference to A in the old B
	}
	a.roleB = b
	if b != nil {
		b.roleA = a // Set reference to A in the new B
	}
}
```

B.go
```go
package main

// B struct holds a reference to A struct
type B struct {
	roleA *A  // Reference to A
}

// NewB creates a new instance of B and associates it with A if necessary
func NewB(a *A) *B {
	b := &B{roleA: a}
	if a != nil {
		a.roleB = b // Set reference to B in A
	}
	return b
}

// SetA updates the reference to A and removes the reference to B in the old A
func (b *B) SetA(a *A) {
	if b.roleA != nil {
		b.roleA.roleB = nil // Remove reference to B in the old A
	}
	b.roleA = a
	if a != nil {
		a.roleB = b // Set reference to B in the new A
	}
}
```

main.go
```go
package main

import "fmt"

func main() {
	a := NewA(nil) // Create an instance of A, B is not set
	b := NewB(nil) // Create an instance of B, A is not set

	a.SetB(b) // Set B in A and set A in B

	fmt.Printf("A's roleB: %p\n", a.roleB) // Display reference to B from A
	fmt.Printf("B's roleA: %p\n", b.roleA) // Display reference to A from B

	// Try to remove the reference
	a.SetB(nil)

	fmt.Printf("After disconnection - A's roleB: %p\n", a.roleB) // Reference to B from A after disconnection
	fmt.Printf("After disconnection - B's roleA: %p\n", b.roleA) // Reference to A from B after disconnection
}
```

# Mapping Association (Unidirectional Multiplicity 1)

![Association_Multiplicity 1](/img/blogs/2024/uml-x-mapping/02_03_multi_1.png)

A.go
```go
package main

// A struct must hold a reference to B struct
type A struct {
	roleB B  // Instance of B. Multiplicity is 1, so it is mandatory
}

// NewA creates a new instance of A.
// Takes a mandatory instance of B as an argument and incorporates it into A.
func NewA(b B) *A {
	return &A{roleB: b}
}

// GetB returns the instance of B held by A
func (a *A) GetB() B {
	return a.roleB
}
```

B.go
```go
package main

// B struct can have its own attributes and methods
type B struct {
	// Define attributes and methods of B
}
```

main.go
```go
package main

import "fmt"

func main() {
	b := B{}  // Create an instance of B
	a := NewA(b)  // Create an instance of A and incorporate B

	fmt.Println(a.GetB())  // Output the instance of B held by A
}
```

# Mapping Association (Unidirectional Multiplicity 0..*)

![Association_Multiplicity 0..*](/img/blogs/2024/uml-x-mapping/02_04_multi_0astah.png)

A.go
```go
package main

// A struct holds a slice of instances of B struct
type A struct {
	roleBs []B  // Slice of B. A can hold 0 or more instances of B
}

// NewA creates a new instance of A.
func NewA() *A {
	return &A{roleBs: []B{}}
}

// AddB adds a new instance of B to A
func (a *A) AddB(b B) {
	a.roleBs = append(a.roleBs, b)
}

// GetBs returns all instances of B held by A
func (a *A) GetBs() []B {
	return a.roleBs
}
```

B.go
```go
package main

// B struct can have its own attributes and methods
type B struct {
	// Define attributes and methods of B
}
```

main.go
```go
package main

import "fmt"

func main() {
	a := NewA()  // Create an instance of A
	b1 := B{}    // Create an instance of B
	b2 := B{}    // Create another instance of B

	a.AddB(b1)  // Add B to A
	a.AddB(b2)  // Add another B to A

	fmt.Println(a.GetBs())  // Output instances of B held by A
}
```

# Mapping Association (Aggregation)

![Association_Aggregation](/img/blogs/2024/uml-x-mapping/02_05_aggrigate.png)

A.go
```go
package main

// A struct holds a reference to B struct as the "whole" in aggregation
type A struct {
    roleB *B  // Reference to B. The lifecycle of B does not depend on A
}

// NewA creates a new instance of A.
func NewA(b *B) *A {
    return &A{roleB: b}
}

// GetB returns the instance of B held by A
func (a *A) GetB() *B {
    return a.roleB
}

// SetB associates a new instance of B with A
func (a *A) SetB(b *B) {
    a.roleB = b
}
```

B.go
```go
package main

// B struct can have its own attributes and methods
type B struct {
    // Define attributes and methods of B
}
```

main.go
```go
package main

import "fmt"

func main() {
    b := &B{}  // Create an instance of B
    a := NewA(b)  // Create an instance of A and aggregate B

    fmt.Printf("B from A: %p\n", a.GetB())  // Output the address of the instance of B held by A

    // Change the instance of B
    anotherB := &B{}
    a.SetB(anotherB)

    fmt.Printf("New B from A: %p\n", a.GetB())  // Output the address of the new instance of B
}
```

# Mapping Association (Composition)

![Association_Composition](/img/blogs/2024/uml-x-mapping/02_06_composition.png)

A.go
```go
package main

// A struct completely owns an instance of B struct
type A struct {
    roleB *B  // Pointer to B. Forms a composition relationship
}

// NewA creates a new instance of A and also generates a new instance of B internally
func NewA() *A {
    return &A{roleB: &B{}}
}

// GetB returns the instance of B held by A
func (a *A) GetB() *B {
    return a.roleB
}

// Clear removes the reference to B held by A, making the instance of B subject to garbage collection
func (a *A) Clear() {
    a.roleB = nil  // Set reference to B to nil
}
```

B.go
```go
package main

// B struct is completely owned by A
type B struct {
    // Define attributes and methods of B here
}
```

main.go
```go
package main

import "fmt"

func main() {
    a := NewA()  // Create an instance of A
    fmt.Printf("Before clear: %p\n", a.GetB())  // Output the address of the instance of B before clear
    a.Clear()  // Remove the reference to B from A
    fmt.Printf("After clear: %p\n", a.GetB())  // Confirm that nil is output after clear
}
```

# Mapping Association (Qualifier)

![Association_Qualifier](/img/blogs/2024/uml-x-mapping/02_07_qualifier.png)

A.go
```go
package main

// A struct manages references to specific instances of B struct using keys
type A struct {
    roles map[string]*B  // Mapping of keys to instances of B
}

// NewA creates a new instance of A
func NewA() *A {
    return &A{roles: make(map[string]*B)}
}

// SetB associates an instance of B with A using the specified key
func (a *A) SetB(key string, b *B) {
    a.roles[key] = b
}

// GetB returns the instance of B associated with the specified key
func (a *A) GetB(key string) *B {
    return a.roles[key]
}

// RemoveB removes the reference to the instance of B associated with the specified key
func (a *A) RemoveB(key string) {
    delete(a.roles, key)
}
```

B.go
```go
package main

// B struct can have its own attributes and methods
type B struct {
    // Define attributes and methods of B here
}
```

main.go
```go
package main

import "fmt"

func main() {
    a := NewA()
    b := &B{}
    
    // Set B with the key 'key1'
    a.SetB("key1", b)
    fmt.Printf("B from A by key 'key1': %p\n", a.GetB("key1"))
    
    // Remove the reference to B
    a.RemoveB("key1")
    fmt.Printf("B from A by key 'key1' after removal: %p\n", a.GetB("key1"))
}
```

# Mapping Generalization Relationship (Implementation with Inheritance)
In languages that have inheritance mechanisms, it is implemented with inheritance, but in languages that do not have inheritance mechanisms, it is implemented with embedding.

![Generalization_Implementation with Inheritance](/img/blogs/2024/uml-x-mapping/03_01_general_inheri.png)

Since Go language does not have an inheritance mechanism, the implementation with embedding the base class is introduced.

A.go
```go
package main

// A has the functionality of a base class
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

// B embeds A to inherit its functionality
type B struct {
    A // Inherit functionality by embedding A
}

// NewB creates a new instance of B
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
    fmt.Println(b.Greet())  // Output "Hello, Alice"
}
```

# Mapping Generalization Relationship (Implementation with Delegation)
Implementation with inheritance results in a stronger coupling between the base class and the derived class, so delegation implementation is sometimes used to intentionally reduce the coupling.

![Generalization_Implementation with Delegation](/img/blogs/2024/uml-x-mapping/03_02_general_delegate.png)

A.go
```go
package main

// A struct has some basic functionalities.
type A struct {
    Name string
}

// Greet is a greeting method of A.
func (a *A) Greet() string {
    return "Hello, I'm " + a.Name
}
```

B.go
```go
package main

// B contains A and forms a delegation relationship.
type B struct {
    a A
}

// NewB generates an instance of B and initializes an instance of A internally.
func NewB(name string) *B {
    return &B{
        a: A{Name: name},
    }
}

// Greet calls the Greet method of the internal A.
func (b *B) Greet() string {
    return b.a.Greet()  // Call Greet of A
}
```

main.go
```go
package main

import "fmt"

func main() {
    b := NewB("Alice")
    fmt.Println(b.Greet())  // Execute the Greet method of A through B
}
```

# Mapping Realization Relationship

![Realization Relationship](/img/blogs/2024/uml-x-mapping/04_realize.png)

interface_a.go
```go
package main

// InterfaceA is an interface with method1.
type InterfaceA interface {
    Method1() int
}

```

b.go
```go
package main

// B implements the InterfaceA interface.
type B struct{,```go
}

// Method1 is implemented in B to satisfy the requirements of InterfaceA.
func (b B) Method1() int {
    // Perform some calculation or operation here and return an integer.
    return 42 // This is a fixed value as an example.
}

```

main.go
```go
package main

import "fmt"

func main() {
    var a InterfaceA // Declare a variable of type InterfaceA.
    a = B{}          // Assign an instance of B to the variable of type InterfaceA.

    // Call Method1 implemented by B and output the result.
    fmt.Println(a.Method1()) // Output: 42
}

```

# Mapping Dependencies in Package Diagrams

![Package Diagram](/img/blogs/2024/uml-x-mapping/05_package_dependency.png)

package1/package1.go
```go
package package1

import (
    "fmt"
    "package2" // No need for module name since it's within the same module
)

// UsePackage2 uses the functionality of Package2
func UsePackage2() {
    fmt.Println(package2.ProvideData())
}
```

package2/package2.go
```go
package package2

// ProvideData is a function that provides some data
func ProvideData() string {
    return "Data from Package2"
}
```

main.go
```go
package main

import (
    "package1" // Import using relative path within the same module
)

func main() {
    package1.UsePackage2()
}
```

# Conclusion

This article may be updated in the future. Please refer to the latest information when using it.
