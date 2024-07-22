---
title: How to Implement UML in a Programming Language? Python Edition
author: takayuki-oguro
date: 2024-07-12T00:00:00.000Z
tags:
  - UML
  - Python
image: true
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/blogs/2024/07/12/uml-x-mapping-python1/).
:::



# Introduction

As an instructor of UML notation and UML modeling seminars, I often receive questions like, "How should I implement this in my language?" Additionally, as an instructor, I have repeatedly experienced that explaining UML in the programming language that the students use helps them understand it smoothly. Many programmers seem to be interested in UML modeling, but surprisingly, they are not well-versed in how to convert UML models into source code. I believe this is one of the reasons why UML modeling has not become widespread.

The conversion from UML to source code is called "mapping," and it is referred to with the programming language name, such as "UML/C++ Mapping." This series introduces "UML/X Mapping" for various programming languages, aiming to help you understand UML from familiar programming languages. However, it is possible to consider various mapping methods. Please think of the ones introduced here as specific examples.

# Basic Knowledge Required to Understand This Article

This article assumes that you understand the minimum UML notation. For example, in class diagrams, it is assumed that you understand how to read attributes/operations, association end names/multiplicity, and visibility, the meanings of generalization/realization relationships, and the correspondence between messages in sequence diagrams and class operations.

# Mapping Policy in This Article

Python expresses visibility with underscores before variables and methods, but we will not add underscores to the operation names or attribute names of UML classes considering Python. This is because visibility is expressed with symbols like + or -. The UML diagrams presented will be shown regardless of programming language support, and it will be noted in the sample code if it is not supported.
 :::column:豆知識!
 
In Python, visibility is described by the number of underscores before variable or method names.
private - : __member1 (※ two underscores)
protected # ：_member1 (※ one underscore. Just an indication that it is not public, but actually accessible)
public + ： member1 (※ no underscore)
package ~ ：(※ Python does not support UML's package visibility)

 :::

# Mapping Basic Elements of a Class (Class, Attribute, Operation)

![Class Attribute Operation](/img/blogs/2024/uml-x-mapping/01_classattmethod.png)

A.py
```python
class A:
    def __init__(self, member1: int, member2: str, member3: int):
        # Initialize member variables
        self.__member1 = member1  # Private
        self._member2 = member2   # Protected
        self.member3 = member3    # Public
        # member4 Package cannot be implemented in Python
    
    def __method1(self) -> None:
        # Implement private method
        pass
    
    def _method2(self) -> str:
        # Implement protected method
        return "Protected Method"
    
    def method3(self) -> None:
        # Implement public method
        print("Public Method")
        
    # method4 Package cannot be implemented in Python
```

B.py
```python
class B:
    def method1(self) -> str:
        return "method1"
    
    def hookMethod(self) -> str:
        return "hookMethod"
```

C.py
```python
class C:
    # Class Attribute
    __member1 = 0  # Private class attribute

    @classmethod
    def method1(cls) -> int:
        # Class Operation
        cls.__member1 = 42  # Assign to class attribute
        return cls.__member1
```

main.py
```python
# Import each class
from A import A
from B import B
from C import C

def main():
    # Create an instance of class A
    a_instance = A(1, "member2", 3, "member4")
    
    # Create an instance of class B
    b_instance = B()
    
    # Execute class operation of class C
    print(C.method1())  # Outputs 42
    
    # Attempting to access class attribute of class C directly causes an error
    # print(C.__member1)  # AttributeError: type object 'C' has no attribute '__member1'

if __name__ == "__main__":
    main()
```

# Mapping Association (Unidirectional Multiplicity 0..1)

![Association_Unidirectional](/img/blogs/2024/uml-x-mapping/02_01_singlerel.png)

A.py
```python
from B import B

class A:
    def __init__(self, roleB: B = None):
        # Member variable to hold an instance of class B
        self.__roleB = roleB  # Set default value to None to express multiplicity 0..1

    def get_roleB(self) -> B:
        # Getter method for roleB
        return self.__roleB
    
    def set_roleB(self, roleB: B) -> None:
        # Setter method for roleB
        self.__roleB = roleB

    def display_roleB(self) -> None:
        # Method to display information of roleB
        if self.__roleB:
            print(f"RoleB: {self.__roleB}")
        else:
            print("RoleB is not set.")

```

B.py
```python
class B:
    def __init__(self, name: str):
        # Member variable of class B
        self.__name = name

    def get_name(self) -> str:
        # Getter method for name
        return self.__name

    def __str__(self) -> str:
        # Return string representation of class B
        return self.__name

```

main.py
```python
# Import each class
from A import A
from B import B

def main():
    # Create an instance of class B
    b_instance = B("ExampleB")
    
    # Create an instance of class A and set b_instance as roleB
    a_instance = A(b_instance)
    
    # Display roleB of class A
    a_instance.display_roleB()
    
    # Change roleB of class A
    a_instance.set_roleB(None)
    
    # Display roleB of class A again
    a_instance.display_roleB()

if __name__ == "__main__":
    main()

```

# Mapping Association (Bidirectional Multiplicity 0..1)

![Association_Bidirectional](/img/blogs/2024/uml-x-mapping/02_02_doublerel.png)

A.py
```python
from B import B

class A:
    def __init__(self, roleB: B = None):
        self.__roleB = None  # Set to None initially
        if roleB:
            self.set_roleB(roleB)  # Set roleB during initialization
    
    def get_roleB(self) -> B:
        return self.__roleB
    
    def set_roleB(self, roleB: B) -> None:
        if self.__roleB is not None:
            # Remove reference to this instance from current roleB
            self.__roleB.set_roleA(None)
        
        self.__roleB = roleB
        
        if roleB is not None and roleB.get_roleA() is not self:
            # If roleB is set and reference from roleB is not this instance, set reference
            roleB.set_roleA(self)
    
    def display_roleB(self) -> None:
        if self.__roleB:
            print(f"RoleB: {self.__roleB}")
        else:
            print("RoleB is not set.")
    
    def __str__(self) -> str:
        return "Instance of A"
```

B.py
```python
from A import A

class B:
    def __init__(self, roleA: A = None):
        self.__roleA = None  # Set to None initially
        if roleA:
            self.set_roleA(roleA)  # Set roleA during initialization
    
    def get_roleA(self) -> A:
        return self.__roleA
    
    def set_roleA(self, roleA: A) -> None:
        if self.__roleA is not None:
            # Remove reference to this instance from current roleA
            self.__roleA.set_roleB(None)
        
        self.__roleA = roleA
        
        if roleA is not None and roleA.get_roleB() is not self:
            # If roleA is set and reference from roleA is not this instance, set reference
            roleA.set_roleB(self)
    
    def display_roleA(self) -> None:
        if self.__roleA:
            print(f"RoleA: {self.__roleA}")
        else:
            print("RoleA is not set.")
    
    def __str__(self) -> str:
        return "Instance of B"

```

main.py
```python
from A import A
from B import B

def main():
    # Create an instance of class A
    a_instance = A()
    
    # Create an instance of class B and set a_instance as roleA
    b_instance = B(a_instance)
    
    # Set b_instance as roleB of class A
    a_instance.set_roleB(b_instance)
    
    # Display roleB of class A
    a_instance.display_roleB()
    
    # Display roleA of class B
    b_instance.display_roleA()

    # Remove roleB and update mutual references
    a_instance.set_roleB(None)
    
    # Display roleB of class A
    a_instance.display_roleB()
    
    # Display roleA of class B
    b_instance.display_roleA()

if __name__ == "__main__":
    main()

```

# Mapping Association (Unidirectional Multiplicity 1)

![Association_Multiplicity1](/img/blogs/2024/uml-x-mapping/02_03_multi_1.png)

A.py
```python
from B import B

class A:
    def __init__(self, roleB: B):
        # Member variable to hold an instance of class B
        # To express multiplicity 1, None is not allowed and must always have an instance of B.
        self.__roleB = roleB
    
    def get_roleB(self) -> B:
        # Getter method for roleB
        return self.__roleB
    
    def set_roleB(self, roleB: B) -> None:
        # Setter method for roleB
        self.__roleB = roleB
    
    def display_roleB(self) -> None:
        # Method to display information of roleB
        print(f"RoleB: {self.__roleB}")
    
    def __str__(self) -> str:
        # Return string representation of class A
        return "Instance of A"

```

B.py
```python
class B:
    def __init__(self, name: str):
        # Member variable of class B
        self.__name = name
    
    def get_name(self) -> str:
        # Getter method for name
        return self.__name

    def set_name(self, name: str) -> None:
        # Setter method for name
        self.__name = name
    
    def __str__(self) -> str:
        # Return string representation of class B
        return self.__name

```

main.py
```python
# Import each class
from A import A
from B import B

def main():
    # Create an instance of class B
    b_instance = B("ExampleB")
    
    # Create an instance of class A and set b_instance as roleB
    a_instance = A(b_instance)
    
    # Display roleB of class A
    a_instance.display_roleB()
    
    # Change roleB of class A
    new_b_instance = B("NewExampleB")
    a_instance.set_roleB(new_b_instance)
    
    # Display roleB of class A again
    a_instance.display_roleB()

    # Change the name of the instance of class B
    new_b_instance.set_name("UpdatedExampleB")
    
    # Display roleB of class A again
    a_instance.display_roleB()

if __name__ == "__main__":
    main()

```

# Mapping Association (Unidirectional Multiplicity 0..*)

![Association_Multiplicity0..*](/img/blogs/2024/uml-x-mapping/02_04_multi_0astah.png)

A.py
```python
from B import B

class A:
    def __init__(self):
        # Member variable to hold instances of class B in a list
        # To express multiplicity 0..*, a list is used to store instances of B.
        self._roleB = []
    
    def add_roleB(self, roleB: B) -> None:
        # Method to add roleB to the list
        self._roleB.append(roleB)
    
    def remove_roleB(self, roleB: B) -> None:
        # Method to remove roleB from the list
        if roleB in self._roleB:
            self._roleB.remove(roleB)
    
    def display_roleB(self) -> None:
        # Method to display information of roleB
        if self._roleB:
            print("RoleB List:")
            for b in self._roleB:
                print(f"  - {b}")
        else:
            print("No RoleB instances.")
    
    def __str__(self) -> str:
        # Return string representation of class A
        return "Instance of A"

```

B.py
```python
class B:
    def __init__(self, name: str):
        # Member variable of class B
        self.__name = name
    
    def get_name(self) -> str:
        # Getter method for name
        return self.__name
    
    def __str__(self) -> str:
        # Return string representation of class B
        return self.__name

```

main.py
```python
# Import each class
from A import A
from B import B

def main():
    # Create an instance of class A
    a_instance = A()
    
    # Create instances of class B
    b_instance1 = B("ExampleB1")
    b_instance2 = B("ExampleB2")
    
    # Add instances of class B to class A
    a_instance.add_roleB(b_instance1)
    a_instance.add_roleB(b_instance2)
    
    # Display roleB list of class A
    a_instance.display_roleB()
    
    # Remove an instance of class B from class A
    a_instance.remove_roleB(b_instance1)
    
    # Display roleB list of class A again
    a_instance.display_roleB()

if __name__ == "__main__":
    main()

```

# Mapping Association (Aggregation)

![Association_Aggregation](/img/blogs/2024/uml-x-mapping/02_05_aggrigate.png)

A.py
```python
from B import B

class A:
    def __init__(self, roleB: B):
        # Member variable to hold an instance of class B
        # To express multiplicity 1, None is not allowed and must always have an instance of B.
        self.__roleB = roleB
    
    def get_roleB(self) -> B:
        # Getter method for roleB
        return self.__roleB
    
    def set_roleB(self, roleB: B) -> None:
        # Setter method for roleB
        self.__roleB = roleB
    
    def display_roleB(self) -> None:
        # Method to display information of roleB
        print(f"RoleB: {self.__roleB}")
    
    def __str__(self) -> str:
        # Return string representation of class A
        return "Instance of A"

```

B.py
```python
class B:
    def __init__(self, name: str):
        # Member variable of class B
        self.__name = name
    
    def get_name(self) -> str:
        # Getter method for name
        return self.__name

    def set_name(self, name: str) -> None:
        # Setter method for name
        self.__name = name
    
    def __str__(self) -> str:
        # Return string representation of class B
        return self.__name

```

main.py
```python
# Import each class
from A import A
from B import B

def main():
    # Create an instance of class B
    b_instance = B("ExampleB")
    
    # Create an instance of class A and set b_instance as roleB
    a_instance = A(b_instance)
    
    # Display roleB of class A
    a_instance.display_roleB()
    
    # Change roleB of class A
    new_b_instance = B("NewExampleB")
    a_instance.set_roleB(new_b_instance)
    
    # Display roleB of class A again
    a_instance.display_roleB()

    # Change the name of the instance of class B
    new_b_instance.set_name("UpdatedExampleB")
    
    # Display roleB of class A again
    a_instance.display_roleB()
    
    # Aggregation: Class A owns an instance of class B, but the lifecycle of class B is independent of class A. Therefore, the instance of class B can still exist even if class A is deleted.

    # Delete the instance of class A
    del a_instance

    # Confirm that the instance of class B still exists
    print(f"RoleB after deleting A: {new_b_instance}")

if __name__ == "__main__":
    main()

```

# Mapping Association (Composition)

![Association_Composition](/img/blogs/2024/uml-x-mapping/02_06_composition.png)

A.py
```python
from B import B

class A:
    def __init__(self, roleB_name: str):
        # Member variable to hold an instance of class B as composition
        # Composition: Class A owns an instance of class B and manages its lifecycle.
        self.__roleB = B(roleB_name)
    
    def get_roleB(self) -> B:
        # Getter method for roleB
        return self.__roleB
    
    def set_roleB(self, roleB: B) -> None:
        # Setter method for roleB
        # Composition: It is possible to replace the part element.
        self.__roleB = roleB
    
    def display_roleB(self) -> None:
        # Method to display information of roleB
        print(f"RoleB: {self.__roleB}")
    
    def __str__(self) -> str:
        # Return string representation of class A
        return "Instance of A"

    def __del__(self):
        # When class A is deleted, roleB is also deleted
        # (Automatically managed by Python's garbage collection, but explicitly shown)
        print(f"Deleting {self} and its roleB {self.__roleB}")
        del self.__roleB

```

B.py
```python
class B:
    def __init__(self, name: str):
        # Member variable of class B
        self.__name = name
    
    def get_name(self) -> str:
        # Getter method for name
        return self.__name
    
    def __str__(self),```python
        # Return string representation of class B
        return self.__name

```

main.py
```python
# Import each class
from A import A
from B import B

def main():
    # Create an instance of class A and specify the name of roleB
    a_instance = A("ExampleB")
    
    # Display roleB of class A
    a_instance.display_roleB()
    
    # Replace roleB of class A
    new_b_instance = B("NewExampleB")
    a_instance.set_roleB(new_b_instance)
    
    # Display roleB of class A again
    a_instance.display_roleB()
    
    # Delete the instance of class A
    # When class A is deleted, roleB is also deleted due to composition
    del a_instance

if __name__ == "__main__":
    main()

```

# Mapping Association (Qualifier)

![Association_Qualifier](/img/blogs/2024/uml-x-mapping/02_07_qualifier.png)

A.py
```python
from B import B

class A:
    def __init__(self):
        # Member variable to hold instances of class B
        # Qualifier: Key to uniquely identify instances of class B
        self._roleB = {}

    def add_roleB(self, key: str, roleB: B) -> None:
        # Method to add roleB. Uniquely identified by key.
        self._roleB[key] = roleB

    def get_roleB(self, key: str) -> B:
        # Method to get roleB corresponding to the specified key
        return self._roleB.get(key, None)

    def remove_roleB(self, key: str) -> None:
        # Method to remove roleB corresponding to the specified key
        if key in self._roleB:
            del self._roleB[key]

    def display_roleB(self) -> None:
        # Method to display information of all roleBs
        if self._roleB:
            print("RoleB List:")
            for key, b in self._roleB.items():
                print(f"  Key: {key}, RoleB: {b}")
        else:
            print("No RoleB instances.")

    def __str__(self) -> str:
        # Return string representation of class A
        return "Instance of A"

```

B.py
```python
class B:
    def __init__(self, name: str):
        # Member variable of class B
        self.__name = name
    
    def get_name(self) -> str:
        # Getter method for name
        return self.__name
    
    def __str__(self) -> str:
        # Return string representation of class B
        return self.__name

```

main.py
```python
# Import each class
from A import A
from B import B

def main():
    # Create an instance of class A
    a_instance = A()
    
    # Create instances of class B
    b_instance1 = B("ExampleB1")
    b_instance2 = B("ExampleB2")
    
    # Add instances of class B to class A
    a_instance.add_roleB("key1", b_instance1)
    a_instance.add_roleB("key2", b_instance2)
    
    # Display roleB list of class A
    a_instance.display_roleB()
    
    # Get specific roleB using key
    print(a_instance.get_roleB("key1"))
    
    # Remove specific roleB from class A using key
    a_instance.remove_roleB("key1")
    
    # Display roleB list of class A again
    a_instance.display_roleB()

if __name__ == "__main__":
    main()

```

# Mapping Generalization (Inheritance)

For languages that have an inheritance mechanism, it is implemented using inheritance. For languages that do not have an inheritance mechanism, it is implemented using embedding.

![Generalization_Inheritance](/img/blogs/2024/uml-x-mapping/03_01_general_inheri.png)

A.py
```python
class A:
    def __init__(self, name: str):
        # Member variable of class A
        self.__name = name
    
    def get_name(self) -> str:
        # Getter method for name
        return self.__name
    
    def __str__(self) -> str:
        # __str__ method returns the string representation of the object.
        # This is called by the print() function and str() function.
        return self.__name

```

B.py
```python
from A import A

class B(A):
    def __init__(self, name: str, age: int):
        # Call the constructor of superclass A
        super().__init__(name)
        # Member variable of class B
        self.__age = age
    
    def get_age(self) -> int:
        # Getter method for age
        return self.__age
    
    def __str__(self) -> str:
        # Return string representation of class B
        return f"{super().__str__()}, Age: {self.__age}"

```

main.py
```python
# Import each class
from A import A
from B import B

def main():
    # Create an instance of class A
    a_instance = A("BaseClassInstance")
    
    # Create an instance of class B
    b_instance = B("DerivedClassInstance", 25)
    
    # Display information of class A
    print(f"A Instance: {a_instance}")
    
    # Display information of class B
    print(f"B Instance: {b_instance}")

if __name__ == "__main__":
    main()

```

# Mapping Generalization (Delegation)

Using delegation instead of inheritance is sometimes employed to intentionally reduce the coupling between the base class and the derived class.

![Generalization_Delegation](/img/blogs/2024/uml-x-mapping/03_02_general_delegate.png)

A.py
```python
class A:
    def __init__(self, name: str):
        # Member variable of class A
        self.__name = name
    
    def get_name(self) -> str:
        # Getter method for name
        return self.__name
    
    def perform_action(self) -> str:
        # Action method of class A
        return f"Action performed by {self.__name}"
    
    def __str__(self) -> str:
        # Return string representation of class A
        return self.__name

```

B.py
```python
from A import A

class B:
    def __init__(self, delegate: A):
        # Member variable to hold an instance of class A as delegation
        self._delegate = delegate
    
    def perform_delegate_action(self) -> str:
        # Method to perform delegated action
        # Calls the perform_action method of class A.
        return self._delegate.perform_action()
    
    def get_delegate_name(self) -> str:
        # Method to get the name of the instance of class A
        return self._delegate.get_name()
    
    def __str__(self) -> str:
        # Return string representation of class B
        return f"Instance of B, Delegate: {self._delegate}"

```

main.py
```python
# Import each class
from A import A
from B import B

def main():
    # Create an instance of class A
    a_instance = A("DelegateA")
    
    # Create an instance of class B and specify the delegate instance
    b_instance = B(a_instance)
    
    # Perform delegated action through class B
    print(b_instance.perform_delegate_action())
    
    # Display the name of the delegate of class B
    print(b_instance.get_delegate_name())
    
    # Display information of class B
    print(b_instance)

if __name__ == "__main__":
    main()

```

# Mapping Realization

![Realization](/img/blogs/2024/uml-x-mapping/04_realize.png)

InterfaceA.py
```python
from abc import ABC, abstractmethod

class InterfaceA(ABC):
    @abstractmethod
    def method1(self) -> int:
        pass

```

B.py
```python
from InterfaceA import InterfaceA

class B(InterfaceA):
    def method1(self) -> int:
        # Concrete implementation
        return 42

```

main.py
```python
# Import the interface and implementation class
from InterfaceA import InterfaceA
from B import B

def main():
    # Hold instance as type InterfaceA
    a_instance: InterfaceA = B()
    
    # Call method1 and display the result
    result = a_instance.method1()
    print(f"Result from method1: {result}")

if __name__ == "__main__":
    main()

```

# Mapping Dependencies in Package Diagrams

![Package Diagram](/img/blogs/2024/uml-x-mapping/05_package_dependency.png)

Package1/module1.py
```python
# Import ClassB from module2.py in Package2
from Package2.module2 import ClassB

# In Python, dependencies must be implemented by specifying the concrete content of modules, classes, functions, etc., within the package.
class ClassA:
    def __init__(self, name: str):
        self.name = name
        self.b_instance = ClassB(name)

    def perform_action(self):
        # Call method of class B to show dependency
        return self.b_instance.action()

    def __str__(self):
        return f"ClassA with name: {self.name}"

```

Package2/module2.py
```python
# Definition of class B
class ClassB:
    def __init__(self, name: str):
        self.name = name

    def action(self):
        return f"Action performed by ClassB with name: {self.name}"

    def __str__(self):
        return f"ClassB with name: {self.name}"

```

main.py
```python
# Import ClassA from module1.py in Package1
from Package1.module1 import ClassA

def main():
    # Create an instance of class A
    a_instance = ClassA("ExampleName")
    
    # Perform action of class B through class A
    print(a_instance.perform_action())
    
    # Display information of class A
    print(a_instance)

if __name__ == "__main__":
    main()

```

# Conclusion

This article may be updated in the future. Please refer to the latest information when using it.
