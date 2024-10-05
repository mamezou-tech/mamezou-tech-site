---
title: >-
  How to Implement UML in a Programming Language? C Language (Instance Support)
  Edition
author: takayuki-oguro
date: 2024-09-30T00:00:00.000Z
tags:
  - UML
  - C言語
image: true
translate: true

---

# Introduction

When teaching seminars on UML notation and UML modeling, I often receive questions like, "How should I implement this in my language?" Additionally, as an instructor, I've had numerous experiences where explaining UML in the programming language that the students use leads to a clear understanding. Many programmers seem to be interested in UML modeling, but surprisingly, not many know how to translate UML models into source code. I believe this is one of the reasons why UML modeling hasn't become widespread.

The conversion from UML to source code is called "mapping," and it's referred to by adding the programming language name, like "UML/C++ Mapping." This series is designed to introduce "UML/X Mapping" for various programming languages, allowing you to understand UML from familiar programming languages in reverse. However, there are various mapping methods possible. Please consider what we introduce as just one concrete example.

# Basic Knowledge Required to Understand This Article

This article assumes that you have a minimal understanding of UML notation. For example, it assumes you understand how to read attributes/operations, association end names/multiplicity, and visibility in class diagrams, the meaning of generalization/realization relationships, and the correspondence between messages in sequence diagrams and class operations.

# Mapping Policy of This Article

This article introduces a mapping that pseudo-realizes class instantiation for those who are currently developing in C language and find transitioning to C++ challenging but still want to code with class reuse in C language.

The basic idea is to separate attribute groups and operation groups (variable groups and function groups). Declare a struct that summarizes the class's attribute group and declare as many instances as needed using that struct type. The operation group is declared as functions within a .c file, treating the class as a .c file. By passing a struct type variable as a function argument, pseudo-instantiation is achieved. The function name is prefixed with "ClassName_".

# Mapping of Basic Class Elements (Class, Attributes, Operations)

![Class Attributes Operations](/img/blogs/2024/uml-x-mapping/01_classattmethod.png)

A.h
```c
#ifndef A_H
#define A_H

typedef struct {
    int member1;
    // char member2[50]; // protected is not supported
    int member3;
    // char member4[50]; // package is not supported
} A;

// Constructor and Destructor
A* A_create(int member1, const char* member2, int member3, const char* member4);
void A_destroy(A* a);

// Methods
void A_method1(A* a);
// char* A_method2(A* a); // protected is not supported
void A_method3(A* a);
// char* A_method4(A* a); // package is not supported

#endif
```

A.c
```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "A.h"

// Constructor
A* A_create(int member1, const char* member2, int member3, const char* member4) {
    A* a = (A*)malloc(sizeof(A));
    if (a == NULL) {
        return NULL; // Memory allocation failed
    }
    a->member1 = member1;
    // strncpy(a->member2, member2, sizeof(a->member2) - 1); // protected is not supported
    // a->member2[sizeof(a->member2) - 1] = '\0';
    a->member3 = member3;
    // strncpy(a->member4, member4, sizeof(a->member4) - 1); // package is not supported
    // a->member4[sizeof(a->member4) - 1] = '\0';
    return a;
}

// Destructor
void A_destroy(A* a) {
    free(a);
}

// Methods
void A_method1(A* a) {
    printf("A::method1 called\n");
}

char* A_method2(A* a) {
    printf("A::method2 called\n");
    return a->member2;
}

void A_method3(A* a) {
    printf("A::method3 called\n");
}

char* A_method4(A* a) {
    printf("A::method4 called\n");
    return a->member4;
}
```

B.h
```c
#ifndef B_H
#define B_H

typedef struct {
    // No members
} B;

// Constructor and Destructor
B* B_create();
void B_destroy(B* b);

// Methods
char* B_method1();
char* B_hookMethod();

#endif
```

B.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "B.h"

// Constructor
B* B_create() {
    B* b = (B*)malloc(sizeof(B));
    if (b == NULL) {
        return NULL; // Memory allocation failed
    }
    return b;
}

// Destructor
void B_destroy(B* b) {
    free(b);
}

// Methods
char* B_method1() {
    printf("B::method1 called\n");
    return "B::method1 return value";
}

char* B_hookMethod() {
    printf("B::hookMethod called\n");
    return "B::hookMethod return value";
}
```

C.h
```c
#ifndef C_H
#define C_H

typedef struct {
    // Not included in struct as they are static variables
} C;

// Constructor and Destructor
C* C_create();
void C_destroy(C* c);

// Methods
int C_method1();

#endif
```

C.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "C.h"

// Static variables (shared across the class)
static int member1;

// Constructor
C* C_create() {
    C* c = (C*)malloc(sizeof(C));
    if (c == NULL) {
        return NULL; // Memory allocation failed
    }

    // Set initial value for static variable (maintained across the class, not per instance)
    member1 = 100;

    return c;
}

// Destructor
void C_destroy(C* c) {
    free(c);
}

// Methods
// In the class diagram, operation names are underlined (indicating static operations), but in this mapping, all operations are implemented as static operations, so there is no particular difference.
int C_method1() {
    printf("C::method1 called\n");
    return member1;
}
```

main.c
```c
#include <stdio.h>
#include "A.h"
#include "B.h"
#include "C.h"

int main() {
    // Create an instance of class A and test methods
    //  ※ Error handling for instance creation failure in main() is omitted
    A* a = A_create(10, "Hello", 20, "World");
    A_method1(a);
    printf("A::method2 returns: %s\n", A_method2(a));
    A_method3(a);
    printf("A::method4 returns: %s\n", A_method4(a));
    A_destroy(a);

    // Create an instance of class B and test methods
    B* b = B_create();
    printf("B::method1 returns: %s\n", B_method1());
    printf("B::hookMethod returns: %s\n", B_hookMethod());
    B_destroy(b);

    // Create an instance of class C and test methods
    C* c = C_create();
    printf("C::method1 returns: %d\n", C_method1(c));
    C_destroy(c);

    return 0;
}
```

# Mapping of Associations (Unidirectional Multiplicity 0..1)

![Association_Unidirectional](/img/blogs/2024/uml-x-mapping/02_01_singlerel.png)

A.h
```c
#ifndef A_H
#define A_H

#include "B.h"

typedef struct {
    B* roleB;  // Reference to class B (association 0..1)
} A;

// Constructor and Destructor
A* A_create();
void A_destroy(A* a);

// Methods
void A_setRoleB(A* a, B* b);

// Newly added public method
void A_publicMethod(A* a);

#endif
```

A.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "A.h"
#include "B.h"

// Constructor
A* A_create() {
    A* a = (A*)malloc(sizeof(A));
    if (a == NULL) {
        return NULL; // Memory allocation failed
    }
    a->roleB = NULL; // Initially, no association
    return a;
}

// Destructor
void A_destroy(A* a) {
    if (a->roleB != NULL) {
        B_destroy(a->roleB);  // Release if B is associated
    }
    free(a);
}

// Set roleB
void A_setRoleB(A* a, B* b) {
    a->roleB = b;  // Set association to class B
}

// Newly added public method
void A_publicMethod(A* a) {
    if (a->roleB != NULL) {
        // If roleB is set, call its method
        printf("A::publicMethod is calling B::method1\n");
        int result = B_method1(a->roleB);
        printf("Result from B::method1: %d\n", result);
    } else {
        // If roleB is not set
        printf("A::publicMethod: roleB is not set.\n");
    }
}
```

B.h
```c
#ifndef B_H
#define B_H

typedef struct {
    int member1;  // Example member
} B;

// Constructor and Destructor
B* B_create(int member1);
void B_destroy(B* b);

// Methods
int B_method1(B* b);

#endif
```

B.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "B.h"

// Constructor
B* B_create(int member1) {
    B* b = (B*)malloc(sizeof(B));
    if (b == NULL) {
        return NULL; // Memory allocation failed
    }
    b->member1 = member1;
    return b;
}

// Destructor
void B_destroy(B* b) {
    free(b);
}

// Methods
int B_method1(B* b) {
    printf("B::method1 called\n");
    return b->member1;
}
```

main.c
```c
#include <stdio.h>
#include "A.h"
#include "B.h"

int main() {
    // Create an instance of class A
    //  ※ Error handling for instance creation failure in main() is omitted
    A* a = A_create();

    // Create an instance of class B and associate with A
    B* b = B_create(100);
    A_setRoleB(a, b);

    // Call A's publicMethod to invoke roleB's method
    A_publicMethod(a);

    // Destroy classes A and B
    A_destroy(a);  // B is also released in A_destroy

    return 0;
}
```

# Mapping of Associations (Bidirectional Multiplicity 0..1)

![Association_Bidirectional](/img/blogs/2024/uml-x-mapping/02_02_doublerel.png)

A.h
```c
#ifndef A_H
#define A_H

#include "B.h"

typedef struct {
    B* roleB;  // Reference to class B (association 0..1)
} A;

// Constructor and Destructor
A* A_create();
void A_destroy(A* a);

// Methods
void A_setRoleB(A* a, B* b);

// Public method of class A
void A_publicMethod(A* a);

// Method called by class B
void A_calledByB(A* a);

#endif
```

A.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "A.h"
#include "B.h"

// Constructor
A* A_create() {
    A* a = (A*)malloc(sizeof(A));
    if (a == NULL) {
        return NULL; // Memory allocation failed
    }
    a->roleB = NULL; // Initially, no association
    return a;
}

// Destructor
void A_destroy(A* a) {
    if (a->roleB != NULL) {
        B_setRoleA(a->roleB, NULL);  // Break bidirectional association
    }
    free(a);
}

// Set roleB
void A_setRoleB(A* a, B* b) {
    a->roleB = b;
    if (b != NULL) {
        B_setRoleA(b, a);  // Set bidirectional association
    }
}

// A's public method (calls roleB's method)
void A_publicMethod(A* a) {
    if (a->roleB != NULL) {
        printf("A::publicMethod is calling B::method1\n");
        int result = B_method1(a->roleB);
        printf("Result from B::method1: %d\n", result);
    } else {
        printf("A::publicMethod: roleB is not set.\n");
    }
}

// Method of A called by B
void A_calledByB(A* a) {
    printf("A::calledByB: Called by B\n");
}
```

B.h
```c
#ifndef B_H
#define B_H

#include "A.h"

typedef struct {
    A* roleA;  // Reference to class A (association 0..1)
    int member1;
} B;

// Constructor and Destructor
B* B_create(int member1);
void B_destroy(B* b);

// Methods
void B_setRoleA(B* b, A* a);
A* B_getRoleA(B* b);
int B_method1(B* b);

// Public method of class B
void B_publicMethod(B* b);

#endif
```

B.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "B.h"
#include "A.h"

// Constructor
B* B_create(int member1) {
    B* b = (B*)malloc(sizeof(B));
    if (b == NULL) {
        return NULL; // Memory allocation failed
    }
    b->roleA = NULL; // Initially, no association
    b->member1 = member1;
    return b;
}

// Destructor
void B_destroy(B* b) {
    if (b->roleA != NULL) {
        A_setRoleB(b->roleA, NULL);  // Break bidirectional association
    }
    free(b);
}

// Set roleA
void B_setRoleA(B* b, A* a) {
    b->roleA = a;
}

// Get roleA
A* B_getRoleA(B* b) {
    return b->roleA;
}

// Method of B
int B_method1(B* b) {
    printf("B::method1 called\n");
    return b->member1;
}

// Public method of B
void B_publicMethod(B* b) {
    if (b->roleA != NULL) {
        printf("B::publicMethod is calling A::calledByB\n");
        A_calledByB(b->roleA);  // Call if roleA is set
    } else {
        printf("B::publicMethod: roleA is not set.\n");
    }
}
```

main.c
```c
#include <stdio.h>
#include "A.h"
#include "B.h"

int main() {
    // Create instances of classes A and B
    //  ※ Error handling for instance creation failure in main() is omitted
    A* a = A_create();
    B* b = B_create(100);

    // Associate class A with class B, and class B with class A
    A_setRoleB(a, b);

    // Call roleB's method from class A
    A_publicMethod(a);

    // Call roleA from class B's publicMethod
    B_publicMethod(b);

    // Destroy classes A and B
    A_destroy(a);
    B_destroy(b);

    return 0;
}
```

# Mapping of Associations (Unidirectional Association Multiplicity 1)

![Association_Multiplicity1](/img/blogs/2024/uml-x-mapping/02_03_multi_1.png)

A.h
```c
#ifndef A_H
#define A_H

#include "B.h"

typedef struct {
    B* roleB;  // Reference to class B (always holds one)
} A;

// Constructor and Destructor
A* A_create(B* b);  // Accepts an instance of class B as an argument
void A_destroy(A* a);

// Methods
void A_publicMethod(A* a);

#endif
```

A.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "A.h"
#include "B.h"

// Constructor
A* A_create(B* b) {
    if (b == NULL) { // Since multiplicity is fixed at 1, b must exist from creation
        return NULL;  // Error if class B instance is NULL
    }

    A* a = (A*)malloc(sizeof(A));
    if (a == NULL) {
        return NULL;  // Memory allocation failed
    }

    // Set the passed instance of class B to roleB
    a->roleB = b;

    return a;
}

// Destructor
void A_destroy(A* a) {
    // Class A itself does not manage class B (managed externally)
    free(a);
}

// A's public method (calls roleB's method)
void A_publicMethod(A* a) {
    if (a->roleB != NULL) {
        printf("A::publicMethod is calling B::method1\n");
        int result = B_method1(a->roleB);
        printf("Result from B::method1: %d\n", result);
    } else {
        printf("A::publicMethod: roleB is not set.\n");
    }
}
```

B.h
```c
#ifndef B_H
#define B_H

typedef struct {
    int member1;
} B;

// Constructor and Destructor
B* B_create(int member1);
void B_destroy(B* b);

// Methods
int B_method1(B* b);

#endif
```

B.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "B.h"

// Constructor
B* B_create(int member1) {
    B* b = (B*)malloc(sizeof(B));
    if (b == NULL) {
        return NULL;  // Memory allocation failed
    }
    b->member1 = member1;
    return b;
}

// Destructor
void B_destroy(B* b) {
    free(b);
}

// Methods
int B_method1(B* b) {
    printf("B::method1 called\n");
    return b->member1;
}
```

main.c
```c
#include <stdio.h>
#include "A.h"
#include "B.h"

int main() {
    // Create an instance of class B
    //  ※ Error handling for instance creation failure in main() is omitted
    B* b = B_create(100);

    // Create an instance of class A and pass the instance of class B
    A* a = A_create(b);

    // Call A's publicMethod to invoke roleB's method
    A_publicMethod(a);

    // Destroy class A (destruction of class,A is done externally)

    A_destroy(a);

    // Destroy class B
    B_destroy(b);

    return 0;
}
```

# Mapping of Associations (Unidirectional Association Multiplicity 0..*)

![Association_Multiplicity0..*](/img/blogs/2024/uml-x-mapping/02_04_multi_0astah.png)

A.h
```c
#ifndef A_H
#define A_H

#include "B.h"

#define MAX_B_INSTANCES 10  // Define the maximum number of instances for class B

typedef struct {
    B* roleB[MAX_B_INSTANCES];  // Array holding instances of class B
    int numRoleB;               // Current number of instances held
} A;

// Constructor and Destructor
A* A_create();
void A_destroy(A* a);

// Methods
int A_addRoleB(A* a, B* b);
void A_removeRoleB(A* a, int index);
void A_publicMethod(A* a);

#endif
```

A.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "A.h"
#include "B.h"

// Constructor
A* A_create() {
    A* a = (A*)malloc(sizeof(A));
    if (a == NULL) {
        return NULL; // Memory allocation failed
    }
    a->numRoleB = 0;  // Initially, there are 0 instances of class B
    for (int i = 0; i < MAX_B_INSTANCES; i++) {
        a->roleB[i] = NULL;  // Initialize array with NULL
    }
    return a;
}

// Destructor
void A_destroy(A* a) {
    for (int i = 0; i < a->numRoleB; i++) {
        if (a->roleB[i] != NULL) {
            B_destroy(a->roleB[i]);  // Free instances of class B
        }
    }
    free(a);
}

// Add an instance of class B
int A_addRoleB(A* a, B* b) {
    if (a->numRoleB >= MAX_B_INSTANCES) {
        // Cannot add more instances if the limit is reached
        printf("A::addRoleB: Cannot add more B instances (limit reached)\n");
        return -1;  // Cannot add
    }
    // Add new instance at the first NULL position
    for (int i = 0; i < MAX_B_INSTANCES; i++) {
        if (a->roleB[i] == NULL) {
            a->roleB[i] = b;
            a->numRoleB++;
            return 0;
        }
    }
    return -1;  // Should not reach here theoretically
}

// Remove an instance of class B
void A_removeRoleB(A* a, int index) {
    if (index < 0 || index >= MAX_B_INSTANCES || a->roleB[index] == NULL) {
        printf("A::removeRoleB: Invalid index\n");
        return;
    }
    // Remove the instance of class B at the specified index
    B_destroy(a->roleB[index]);
    a->roleB[index] = NULL;

    // Compact the array (move elements left from the index onwards)
    for (int i = index; i < MAX_B_INSTANCES - 1; i++) {
        a->roleB[i] = a->roleB[i + 1];
    }
    a->roleB[MAX_B_INSTANCES - 1] = NULL;  // Set the last element to NULL
    a->numRoleB--;
}

// Access instances of class B and call their methods
void A_publicMethod(A* a) {
    // Call methods of all instances of class B held by class A
    for (int i = 0; i < MAX_B_INSTANCES; i++) {
        if (a->roleB[i] != NULL) {
            printf("A::publicMethod is calling B::method1 for instance %d\n", i);
            int result = B_method1(a->roleB[i]);
            printf("Result from B::method1 (instance %d): %d\n", i, result);
        }
    }
}
```

B.h
```c
#ifndef B_H
#define B_H

typedef struct {
    int member1;
} B;

// Constructor and Destructor
B* B_create(int member1);
void B_destroy(B* b);

// Methods
int B_method1(B* b);

#endif
```

B.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "B.h"

// Constructor
B* B_create(int member1) {
    B* b = (B*)malloc(sizeof(B));
    if (b == NULL) {
        return NULL; // Memory allocation failed
    }
    b->member1 = member1;
    return b;
}

// Destructor
void B_destroy(B* b) {
    free(b);
}

// Methods
int B_method1(B* b) {
    printf("B::method1 called\n");
    return b->member1;
}
```

main.c
```c
#include <stdio.h>
#include "A.h"
#include "B.h"

int main() {
    // Create an instance of class A
    //  ※ Error handling for instance creation failure in main() is omitted
    A* a = A_create();

    // Create multiple instances of class B and add them to class A
    B* b1 = B_create(100);
    B* b2 = B_create(200);
    B* b3 = B_create(300);

    A_addRoleB(a, b1);
    A_addRoleB(a, b2);
    A_addRoleB(a, b3);

    // Call A's publicMethod to invoke roleB's methods
    A_publicMethod(a);

    // Remove the second B instance
    A_removeRoleB(a, 1);

    // Call publicMethod again to verify
    A_publicMethod(a);

    // Destroy class A (internal class B instances are also destroyed)
    A_destroy(a);

    return 0;
}
```

# Mapping of Associations (Aggregation)

![Association_Aggregation](/img/blogs/2024/uml-x-mapping/02_05_aggrigate.png)

A.h
```c
#ifndef A_H
#define A_H

#include "B.h"

typedef struct {
    B* roleB;  // Aggregation to class B (one instance)
} A;

// Constructor and Destructor
A* A_create(B* b);  // Accepts an instance of class B as an argument
void A_destroy(A* a);

// Methods
void A_publicMethod(A* a);

#endif
```

A.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "A.h"
#include "B.h"

// Constructor
A* A_create(B* b) {
    if (b == NULL) { // Since multiplicity is fixed at 1, b must exist from creation
        return NULL;  // Error if class B instance is NULL
    }

    A* a = (A*)malloc(sizeof(A));
    if (a == NULL) {
        return NULL;  // Memory allocation failed
    }

    // Set the passed instance of class B to roleB
    a->roleB = b;

    return a;
}

// Destructor
void A_destroy(A* a) {
    // In aggregation, the instance of class B is not freed (managed externally)
    free(a);
}

// A's public method (calls roleB's method)
void A_publicMethod(A* a) {
    if (a->roleB != NULL) {
        printf("A::publicMethod is calling B::method1\n");
        int result = B_method1(a->roleB);
        printf("Result from B::method1: %d\n", result);
    } else {
        printf("A::publicMethod: roleB is not set.\n");
    }
}
```

B.h
```c
#ifndef B_H
#define B_H

typedef struct {
    int member1;
} B;

// Constructor and Destructor
B* B_create(int member1);
void B_destroy(B* b);

// Methods
int B_method1(B* b);

#endif
```

B.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "B.h"

// Constructor
B* B_create(int member1) {
    B* b = (B*)malloc(sizeof(B));
    if (b == NULL) {
        return NULL;  // Memory allocation failed
    }
    b->member1 = member1;
    return b;
}

// Destructor
void B_destroy(B* b) {
    free(b);
}

// Methods
int B_method1(B* b) {
    printf("B::method1 called\n");
    return b->member1;
}
```

main.c
```c
#include <stdio.h>
#include "A.h"
#include "B.h"

int main() {
    // Create an instance of class B
    //  ※ Error handling for instance creation failure in main() is omitted
    B* b = B_create(100);

    // Create an instance of class A and pass the instance of class B
    A* a = A_create(b);

    // Call A's publicMethod to invoke roleB's method
    A_publicMethod(a);

    // Destroy class A (in aggregation, class B destruction is done externally)
    A_destroy(a);

    // Destroy class B
    B_destroy(b);

    return 0;
}
```

# Mapping of Associations (Composition)

![Association_Composition](/img/blogs/2024/uml-x-mapping/02_06_composition.png)

A.h
```c
#ifndef A_H
#define A_H

#include "B.h"

typedef struct {
    B* roleB;  // Composition to class B (one instance)
} A;

// Constructor and Destructor
A* A_create(B* b);   // Accepts an instance of class B in the constructor
void A_destroy(A* a);

// Methods
void A_setRoleB(A* a, B* b);    // Set roleB to a new class B
void A_removeRoleB(A* a);       // Remove roleB
void A_publicMethod(A* a);

#endif
```

A.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "A.h"
#include "B.h"

// Constructor
A* A_create(B* b) {
    if (b == NULL) {
        return NULL;  // Error if class B instance is NULL
    }

    A* a = (A*)malloc(sizeof(A));
    if (a == NULL) {
        return NULL;  // Memory allocation failed
    }

    // Set the passed instance of class B to roleB
    a->roleB = b;

    return a;
}

// Destructor
void A_destroy(A* a) {
    if (a->roleB != NULL) { // In composition, the part is destroyed when the whole is destroyed
        B_destroy(a->roleB);  // Free the instance of class B
    }
    free(a);
}

// Set a new instance of class B
void A_setRoleB(A* a, B* b) {
    if (a->roleB != NULL) {
        B_destroy(a->roleB);  // Free the existing instance of class B
    }
    a->roleB = b;  // Set the new class B
}

// Remove the instance of class B
void A_removeRoleB(A* a) {
    if (a->roleB != NULL) {
        B_destroy(a->roleB);  // Free the instance of class B
        a->roleB = NULL;      // Set roleB to NULL
    }
}

// A's public method (calls roleB's method)
void A_publicMethod(A* a) {
    if (a->roleB != NULL) {
        printf("A::publicMethod is calling B::method1\n");
        int result = B_method1(a->roleB);
        printf("Result from B::method1: %d\n", result);
    } else {
        printf("A::publicMethod: roleB is not set.\n");
    }
}
```

B.h
```c
#ifndef B_H
#define B_H

typedef struct {
    int member1;
} B;

// Constructor and Destructor
B* B_create(int member1);
void B_destroy(B* b);

// Methods
int B_method1(B* b);

#endif
```

B.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "B.h"

// Constructor
B* B_create(int member1) {
    B* b = (B*)malloc(sizeof(B));
    if (b == NULL) {
        return NULL;  // Memory allocation failed
    }
    b->member1 = member1;
    return b;
}

// Destructor
void B_destroy(B* b) {
    free(b);
}

// Methods
int B_method1(B* b) {
    printf("B::method1 called\n");
    return b->member1;
}
```

main.c
```c
#include <stdio.h>
#include "A.h"
#include "B.h"

int main() {
    // Create an instance of class B
    //  ※ Error handling for instance creation failure in main() is omitted
    B* b1 = B_create(100);

    // Create an instance of class A and pass the instance of class B
    A* a = A_create(b1);

    // Call A's publicMethod to invoke roleB's method
    A_publicMethod(a);

    // Create another class B and reset in A
    B* b2 = B_create(200);
    A_setRoleB(a, b2);

    // Call publicMethod again to invoke roleB's method
    A_publicMethod(a);

    // Remove roleB
    A_removeRoleB(a);

    // After removing roleB, call publicMethod to confirm
    A_publicMethod(a);

    // Destroy class A (class B is already removed)
    A_destroy(a);

    return 0;
}
```

# Mapping of Associations (Qualifier)

![Association_Qualifier](/img/blogs/2024/uml-x-mapping/02_07_qualifier.png)

A.h
```c
#ifndef A_H
#define A_H

#include "B.h"

#define MAX_ENTRIES 10  // Maximum number of key-value pairs

typedef struct {  // Qualifiers are equivalent to std::map in C++ libraries or Java's Map<key,value>, but are implemented with two arrays.
    int keys[MAX_ENTRIES];  // Array of keys
    B* roleB[MAX_ENTRIES];  // Array of instances of class B
    int count;              // Current number of registered pairs
} A;

// Constructor and Destructor
A* A_create();
void A_destroy(A* a);

// Methods
int A_addRoleB(A* a, int key, B* b);     // Add roleB with a key
B* A_getRoleB(A* a, int key);            // Get roleB using a key
void A_removeRoleB(A* a, int key);       // Remove roleB using a key
void A_publicMethod(A* a, int key);      // Call roleB's method using a key

#endif
```

A.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "A.h"
#include "B.h"

// Constructor
A* A_create() {
    A* a = (A*)malloc(sizeof(A));
    if (a == NULL) {
        return NULL;  // Memory allocation failed
    }

    a->count = 0;  // Initially, there are 0 entries
    for (int i = 0; i < MAX_ENTRIES; i++) {
        a->keys[i] = -1;  // Initialize (unused keys are indicated by -1)
        a->roleB[i] = NULL;  // Initialize instances of class B with NULL
    }

    return a;
}

// Destructor
void A_destroy(A* a) {
    for (int i = 0; i < MAX_ENTRIES; i++) {
        if (a->roleB[i] != NULL) {
            B_destroy(a->roleB[i]);  // Free instances of class B
        }
    }
    free(a);
}

// Add roleB using a key
int A_addRoleB(A* a, int key, B* b) {
    if (a->count >= MAX_ENTRIES) {
        printf("A::addRoleB: Maximum entries reached.\n");
        return -1;
    }

    // Find an empty index
    for (int i = 0; i < MAX_ENTRIES; i++) {
        if (a->keys[i] == -1) {  // Find an empty entry
            a->keys[i] = key;
            a->roleB[i] = b;
            a->count++;
            return 0;
        }
    }

    return -1;  // No empty space
}

// Get roleB using a key
B* A_getRoleB(A* a, int key) {
    for (int i = 0; i < MAX_ENTRIES; i++) {
        if (a->keys[i] == key) {
            return a->roleB[i];  // Return class B corresponding to the key
        }
    }
    return NULL;  // Not found
}

// Remove roleB using a key
void A_removeRoleB(A* a, int key) {
    for (int i = 0; i < MAX_ENTRIES; i++) {
        if (a->keys[i] == key) {
            if (a->roleB[i] != NULL) {
                B_destroy(a->roleB[i]);  // Free the instance of class B
                a->roleB[i] = NULL;
            }
            a->keys[i] = -1;  // Invalidate entry
            a->count--;
            return;
        }
    }
    printf("A::removeRoleB: Key %d not found\n", key);
}

// Call roleB's method using a key
void A_publicMethod(A* a, int key) {
    B* b = A_getRoleB(a, key);
    if (b != NULL) {
        printf("A::publicMethod is calling B::method1 for key %d\n", key);
        int result = B_method1(b);
        printf("Result from B::method1 (key %d): %d\n", key, result);
    } else {
        printf("A::publicMethod: No instance found for key %d\n", key);
    }
}
```

B.h
```c
#ifndef B_H
#define B_H

typedef struct {
    int member1;
} B;

// Constructor and Destructor
B* B_create(int member1);
void B_destroy(B* b);

// Methods
int B_method1(B* b);

#endif
```

B.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "B.h"

// Constructor
B* B_create(int member1) {
    B* b = (B*)malloc(sizeof(B));
    if (b == NULL) {
        return NULL;  // Memory allocation failed
    }
    b->member1 = member1;
    return b;
}

// Destructor
void B_destroy(B* b) {
    free(b);
}

// Methods
int B_method1(B* b) {
    printf("B::method,```c
B::method1 called\n");
    return b->member1;
}
```

main.c
```c
#include <stdio.h>
#include "A.h"
#include "B.h"

int main() {
    // Create an instance of class A
    //  ※ Error handling for instance creation failure in main() is omitted
    A* a = A_create();

    // Create multiple instances of class B and add them with keys
    B* b1 = B_create(100);
    B* b2 = B_create(200);
    B* b3 = B_create(300);

    A_addRoleB(a, 1, b1);
    A_addRoleB(a, 2, b2);
    A_addRoleB(a, 3, b3);

    // Call A's publicMethod to invoke roleB's method using keys
    A_publicMethod(a, 1);
    A_publicMethod(a, 2);

    // Remove roleB
    A_removeRoleB(a, 2);

    // Verify after removal
    A_publicMethod(a, 2);

    // Destroy class A (class B instances are also freed internally)
    A_destroy(a);

    return 0;
}
```

# Mapping of Generalization Relationships (Inheritance Mapping)
In languages that support inheritance, it is implemented using inheritance. In languages that do not support inheritance, it is implemented using embedding.

![Generalization_Inheritance](/img/blogs/2024/uml-x-mapping/03_01_general_inheri.png)

Generalization relationships themselves cannot be directly represented in C.

# Mapping of Generalization Relationships (Delegation Mapping)
Delegation is sometimes used to intentionally reduce coupling by implementing with delegation, as inheritance increases the coupling between the base class and derived class.

![Generalization_Delegation](/img/blogs/2024/uml-x-mapping/03_02_general_delegate.png)

A.h
```c
#ifndef A_H
#define A_H

typedef struct {
    int member1;
} A;

// Constructor and Destructor
A* A_create(int member1);  // Create an instance of class A
void A_destroy(A* a);

// Methods
int A_method1(A* a);       // Method of class A

#endif
```

A.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "A.h"

// Constructor
A* A_create(int member1) {
    A* a = (A*)malloc(sizeof(A));
    if (a == NULL) {
        return NULL;  // Memory allocation failed
    }
    a->member1 = member1;
    return a;
}

// Destructor
void A_destroy(A* a) {
    free(a);
}

// Methods
int A_method1(A* a) {
    printf("A::method1 called\n");
    return a->member1;
}
```

B.h
```c
#ifndef B_H
#define B_H

#include "A.h"

typedef struct {
    A* delegate;  // Instance of class A (base class)
} B;

// Constructor and Destructor
B* B_create(int member1);   // Class B creates an instance of class A. Since class B inherits class A, parameters needed for initializing class A are passed here.
void B_destroy(B* b);

// Methods
void B_publicMethod(B* b);  // Method that delegates processing to class A

#endif
```

B.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "B.h"
#include "A.h"

// Constructor
B* B_create(int member1) {
    B* b = (B*)malloc(sizeof(B));
    if (b == NULL) {
        return NULL;  // Memory allocation failed
    }

    // Create an instance of class A and set it to delegate
    // Generate an instance of the base class part
    b->delegate = A_create(member1);  // Pass parameters to the constructor of class A

    if (b->delegate == NULL) {
        free(b);  // If creation of class A fails, free class B as well
        return NULL;
    }

    return b;
}

// Destructor
void B_destroy(B* b) {
    if (b->delegate != NULL) {
        A_destroy(b->delegate);  // Free the instance of class A
    }
    free(b);
}

// Call the method of class A and delegate processing
void B_publicMethod(B* b) {
    if (b->delegate != NULL) {
        printf("B::publicMethod is delegating to A::method1\n");
        int result = A_method1(b->delegate);  // Call the method of class A
        printf("Result from A::method1: %d\n", result);
    } else {
        printf("B::publicMethod: delegate is not set.\n");
    }
}
```

main.c
```c
#include <stdio.h>
#include "A.h"
#include "B.h"

int main() {
    // Create an instance of class B (an instance of the base class, class A, is also created internally)
    //  ※ Error handling for instance creation failure in main() is omitted
    B* b = B_create(100);

    // Call B's publicMethod to delegate processing to class A
    B_publicMethod(b);

    // Destroy class B (since it is composition, class A is also freed internally)
    B_destroy(b);

    return 0;
}
```

# Mapping of Realization Relationships

![Realization_Relationship](/img/blogs/2024/uml-x-mapping/04_realize.png)

While pure interfaces like in C++ cannot be directly represented, this example creatively implements an interface as a "class that substitutes implementation classes." If there are multiple implementation classes, add free as needed.

InterfaceA.h
```c
#ifndef INTERFACEA_H
#define INTERFACEA_H

#include "B.h"

// Definition of InterfaceA
typedef struct {
    B* b_ref;  // Reference to class B
    // Add more implementation classes if they are created
} InterfaceA;

// Constructor and Destructor
InterfaceA* InterfaceA_create();  // Create an instance of InterfaceA
void InterfaceA_destroy(InterfaceA* a);  // Destroy an instance of InterfaceA

// Methods
void InterfaceA_setB(InterfaceA* a, B* b);  // Set reference to class B
int InterfaceA_method1(InterfaceA* a);      // Call method1 of class B

#endif
```

InterfaceA.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "InterfaceA.h"

// Constructor
InterfaceA* InterfaceA_create() {
    InterfaceA* a = (InterfaceA*)malloc(sizeof(InterfaceA));
    if (a == NULL) {
        return NULL;  // Memory allocation failed
    }
    a->b_ref = NULL;  // Initially, the reference to class B is NULL
    return a;
}

// Destructor
void InterfaceA_destroy(InterfaceA* a) {
    free(a);  // Class B is freed elsewhere, so it is not freed here
}

// Set reference to class B
void InterfaceA_setB(InterfaceA* a, B* b) {
    a->b_ref = b;  // Set reference to class B
}

// Call method1 of the implementation class
int InterfaceA_method1(InterfaceA* a) {
    if (a->b_ref != NULL) {
        printf("InterfaceA::method1 is calling B::method1\n");
        return B_method1(a->b_ref);  // Call method1 of class B
    } else {
        printf("InterfaceA::method1: B reference is not set.\n");
        return -1;
    }
    // If more than class B is added, add if-else before else to call
}
```

B.h
```c
#ifndef B_H
#define B_H

typedef struct {
    int value;  // Member specific to class B
} B;

// Constructor and Destructor
B* B_create(int value);  // Create an instance of class B
void B_destroy(B* b);    // Destroy an instance of class B

// Methods
int B_method1(B* b);     // Method1 of class B

#endif
```

B.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "B.h"

// Constructor
B* B_create(int value) {
    B* b = (B*)malloc(sizeof(B));
    if (b == NULL) {
        return NULL;  // Memory allocation failed
    }
    b->value = value;
    return b;
}

// Destructor
void B_destroy(B* b) {
    free(b);
}

// Implementation of method1 of class B
int B_method1(B* b) {
    printf("B::method1 called, value = %d\n", b->value);
    return b->value;
}
```

main.c
```c
#include <stdio.h>
#include "InterfaceA.h"
#include "B.h"

int main() {
    // Create an instance of class B
    //  ※ Error handling for instance creation failure in main() is omitted
    B* b = B_create(100);

    // Create an instance of InterfaceA
    InterfaceA* a = InterfaceA_create();

    // Set reference to class B in InterfaceA
    InterfaceA_setB(a, b);

    // Call method1 of InterfaceA and execute processing through method1 of class B
    int result = InterfaceA_method1(a);
    printf("Result from InterfaceA::method1: %d\n", result);

    // Destroy instances
    InterfaceA_destroy(a);
    B_destroy(b);

    return 0;
}
```

# Mapping of Package Diagram Dependencies

![Package_Diagram](/img/blogs/2024/uml-x-mapping/05_package_dependency.png)

While packages cannot be implemented in code, they can be realized by organizing files into folders.

# Conclusion

This article may be updated in the future. Please check for the latest information when using it.
