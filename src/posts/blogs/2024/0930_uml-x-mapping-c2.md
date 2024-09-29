---
title: UMLをプログラミング言語で実装するには？ C言語(インスタンス対応)編
author: takayuki-oguro
date: 2024-09-30
tags: [UML, C言語]
image: false
---

# はじめに

UML表記法やUMLモデリングのセミナー講師をしていると、「自分の言語ではどのように実装すればよいのか」というご質問を受けることがあります。また、講師側としても、受講生が使っているプログラミング言語でUMLを説明すると、すんなりと分かって頂ける経験が幾度となくあります。多くのプログラマがUMLモデリングに興味を持って頂けているようですが、UMLのモデルをどのようにソースコードにするかについては意外と知られていません。これが、UMLモデリングが広まらない原因の1つではないかと考えています。

UMLからソースコードへの変換を「マッピング」といい、プログラミング言語名を付けて、「UML/C++マッピング」のように呼びます。このシリーズは、さまざまなプログラミング言語への「UML/Xマッピング」を紹介して、馴染みのあるプログラミング言語からUMLを逆に理解して貰えるように企画したものです。ただし、マッピングは様々なマッピング方法を考える事が可能です。ご紹介するものは、その具体例の1つだとお考え下さい。

# この記事を理解するために必要な基本的な知識

この記事は、最小限のUML表記法が分かることを前提としています。例えば、クラス図では属性/操作や関連端名/多重度および可視性の読み方、汎化関係/実現関係の意味、シーケンス図のメッセージとクラスの操作の対応関係、を理解していることが前提です。

# この記事のマッピングの方針

この記事は、現在C言語で開発しており、C++への移行はハードルが高いが、C言語でもクラスを再利用したコーディングをしたい、という人向けに、疑似的にクラスのインスタンス化を実現するマッピングを紹介します。

基本的には、属性群と操作群（変数群と関数群）を分ける考え方を採ります。クラスの属性群をまとめたstructを宣言し、そのstruct型を用いてインスタンスの数だけ実体を宣言します。
操作群は、クラス＝.cファイルとして、.cファイル内に関数宣言します。関数の引数に、struct型の変数を渡すことで、疑似的にインスタンス化します。関数名の先頭には「クラス名_」を付けます。

# クラスの基本要素(クラス,属性,操作)のマッピング

![クラス属性操作](/img/blogs/2024/uml-x-mapping/01_classattmethod.png)

A.h
```c
#ifndef A_H
#define A_H

typedef struct {
    int member1;
    char member2[50];
    int member3;
    char member4[50];
} A;

// コンストラクタとデストラクタ
A* A_create(int member1, const char* member2, int member3, const char* member4);
void A_destroy(A* a);

// メソッド
void A_method1(A* a);
char* A_method2(A* a);
void A_method3(A* a);
char* A_method4(A* a);

#endif
```

A.c
```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "A.h"

// コンストラクタ
A* A_create(int member1, const char* member2, int member3, const char* member4) {
    A* a = (A*)malloc(sizeof(A));
    if (a == NULL) {
        return NULL; // メモリ確保失敗
    }
    a->member1 = member1;
    strncpy(a->member2, member2, sizeof(a->member2) - 1);
    a->member2[sizeof(a->member2) - 1] = '\0';
    a->member3 = member3;
    strncpy(a->member4, member4, sizeof(a->member4) - 1);
    a->member4[sizeof(a->member4) - 1] = '\0';
    return a;
}

// デストラクタ
void A_destroy(A* a) {
    free(a);
}

// メソッド
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
    // メンバーなし
} B;

// コンストラクタとデストラクタ
B* B_create();
void B_destroy(B* b);

// メソッド
char* B_method1();
char* B_hookMethod();

#endif
```

B.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "B.h"

// コンストラクタ
B* B_create() {
    B* b = (B*)malloc(sizeof(B));
    if (b == NULL) {
        return NULL; // メモリ確保失敗
    }
    return b;
}

// デストラクタ
void B_destroy(B* b) {
    free(b);
}

// メソッド
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
    int member1;
} C;

// コンストラクタとデストラクタ
C* C_create(int member1);
void C_destroy(C* c);

// メソッド
int C_method1(C* c);

#endif
```

C.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "C.h"

// コンストラクタ
C* C_create(int member1) {
    C* c = (C*)malloc(sizeof(C));
    if (c == NULL) {
        return NULL; // メモリ確保失敗
    }
    c->member1 = member1;
    return c;
}

// デストラクタ
void C_destroy(C* c) {
    free(c);
}

// メソッド
int C_method1(C* c) {
    printf("C::method1 called\n");
    return c->member1;
}
```

main.c
```c
#include <stdio.h>
#include "A.h"
#include "B.h"
#include "C.h"

int main() {
    // クラスAのインスタンス作成とメソッドのテスト
    A* a = A_create(10, "Hello", 20, "World");
    A_method1(a);
    printf("A::method2 returns: %s\n", A_method2(a));
    A_method3(a);
    printf("A::method4 returns: %s\n", A_method4(a));
    A_destroy(a);

    // クラスBのインスタンス作成とメソッドのテスト
    B* b = B_create();
    printf("B::method1 returns: %s\n", B_method1());
    printf("B::hookMethod returns: %s\n", B_hookMethod());
    B_destroy(b);

    // クラスCのインスタンス作成とメソッドのテスト
    C* c = C_create(100);
    printf("C::method1 returns: %d\n", C_method1(c));
    C_destroy(c);

    return 0;
}
```

# 関連（片方向 多重度0..1）のマッピング

![関連_片方向関連](/img/blogs/2024/uml-x-mapping/02_01_singlerel.png)

A.h
```c
#ifndef A_H
#define A_H

#include "B.h"

typedef struct {
    B* roleB;  // クラスBへの参照 (0..1の関連)
} A;

// コンストラクタとデストラクタ
A* A_create();
void A_destroy(A* a);

// メソッド
void A_setRoleB(A* a, B* b);
B* A_getRoleB(A* a);

// 新しく追加するpublicメソッド
void A_publicMethod(A* a);

#endif
```

A.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "A.h"
#include "B.h"

// コンストラクタ
A* A_create() {
    A* a = (A*)malloc(sizeof(A));
    if (a == NULL) {
        return NULL; // メモリ確保失敗
    }
    a->roleB = NULL; // 初期状態では関連なし
    return a;
}

// デストラクタ
void A_destroy(A* a) {
    if (a->roleB != NULL) {
        B_destroy(a->roleB);  // 関連するBがあれば解放
    }
    free(a);
}

// roleBの設定
void A_setRoleB(A* a, B* b) {
    a->roleB = b;  // クラスBへの関連を設定
}

// roleBの取得
B* A_getRoleB(A* a) {
    return a->roleB;  // クラスBへの関連を取得
}

// 新しく追加するpublicメソッド
void A_publicMethod(A* a) {
    if (a->roleB != NULL) {
        // roleBが設定されている場合、そのメソッドを呼び出す
        printf("A::publicMethod is calling B::method1\n");
        int result = B_method1(a->roleB);
        printf("Result from B::method1: %d\n", result);
    } else {
        // roleBが設定されていない場合
        printf("A::publicMethod: roleB is not set.\n");
    }
}
```

B.h
```c
#ifndef B_H
#define B_H

typedef struct {
    int member1;  // 例としてのメンバー
} B;

// コンストラクタとデストラクタ
B* B_create(int member1);
void B_destroy(B* b);

// メソッド
int B_method1(B* b);

#endif
```

B.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "B.h"

// コンストラクタ
B* B_create(int member1) {
    B* b = (B*)malloc(sizeof(B));
    if (b == NULL) {
        return NULL; // メモリ確保失敗
    }
    b->member1 = member1;
    return b;
}

// デストラクタ
void B_destroy(B* b) {
    free(b);
}

// メソッド
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
    // クラスAのインスタンスを作成
    A* a = A_create();

    // クラスBのインスタンスを作成してAに関連付け
    B* b = B_create(100);
    A_setRoleB(a, b);

    // AのpublicMethodを呼び出して、roleBのメソッドを呼ぶ
    A_publicMethod(a);

    // クラスAとBを破棄
    A_destroy(a);  // A_destroyでBも解放される

    return 0;
}
```

# 関連（双方向 多重度0..1）のマッピング

![関連_双方向関連](/img/blogs/2024/uml-x-mapping/02_02_doublerel.png)

A.h
```c
#ifndef A_H
#define A_H

#include "B.h"

typedef struct {
    B* roleB;  // クラスBへの参照 (0..1の関連)
} A;

// コンストラクタとデストラクタ
A* A_create();
void A_destroy(A* a);

// メソッド
void A_setRoleB(A* a, B* b);
B* A_getRoleB(A* a);

// クラスAのpublicメソッド
void A_publicMethod(A* a);

// クラスBから呼び出されるメソッド
void A_calledByB(A* a);

#endif
```

A.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "A.h"
#include "B.h"

// コンストラクタ
A* A_create() {
    A* a = (A*)malloc(sizeof(A));
    if (a == NULL) {
        return NULL; // メモリ確保失敗
    }
    a->roleB = NULL; // 初期状態では関連なし
    return a;
}

// デストラクタ
void A_destroy(A* a) {
    if (a->roleB != NULL) {
        B_setRoleA(a->roleB, NULL);  // 双方向の関連を解除
    }
    free(a);
}

// roleBの設定
void A_setRoleB(A* a, B* b) {
    a->roleB = b;
    if (b != NULL) {
        B_setRoleA(b, a);  // 双方向で関連を設定
    }
}

// roleBの取得
B* A_getRoleB(A* a) {
    return a->roleB;
}

// Aのpublicメソッド (roleBのメソッドを呼ぶ)
void A_publicMethod(A* a) {
    if (a->roleB != NULL) {
        printf("A::publicMethod is calling B::method1\n");
        int result = B_method1(a->roleB);
        printf("Result from B::method1: %d\n", result);
    } else {
        printf("A::publicMethod: roleB is not set.\n");
    }
}

// Bから呼び出されるAのメソッド
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
    A* roleA;  // クラスAへの参照 (0..1の関連)
    int member1;
} B;

// コンストラクタとデストラクタ
B* B_create(int member1);
void B_destroy(B* b);

// メソッド
void B_setRoleA(B* b, A* a);
A* B_getRoleA(B* b);
int B_method1(B* b);

// クラスBのpublicメソッド
void B_publicMethod(B* b);

#endif
```

B.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "B.h"
#include "A.h"

// コンストラクタ
B* B_create(int member1) {
    B* b = (B*)malloc(sizeof(B));
    if (b == NULL) {
        return NULL; // メモリ確保失敗
    }
    b->roleA = NULL; // 初期状態では関連なし
    b->member1 = member1;
    return b;
}

// デストラクタ
void B_destroy(B* b) {
    if (b->roleA != NULL) {
        A_setRoleB(b->roleA, NULL);  // 双方向の関連を解除
    }
    free(b);
}

// roleAの設定
void B_setRoleA(B* b, A* a) {
    b->roleA = a;
}

// roleAの取得
A* B_getRoleA(B* b) {
    return b->roleA;
}

// Bのメソッド
int B_method1(B* b) {
    printf("B::method1 called\n");
    return b->member1;
}

// Bのpublicメソッド
void B_publicMethod(B* b) {
    if (b->roleA != NULL) {
        printf("B::publicMethod is calling A::calledByB\n");
        A_calledByB(b->roleA);  // roleAが設定されていれば呼び出す
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
    // クラスAとBのインスタンスを作成
    A* a = A_create();
    B* b = B_create(100);

    // クラスAにクラスBを関連付け、クラスBにもクラスAを関連付ける
    A_setRoleB(a, b);

    // クラスAからroleBのメソッドを呼び出す
    A_publicMethod(a);

    // クラスBのpublicMethodからroleAを呼び出す
    B_publicMethod(b);

    // クラスAとBを破棄
    A_destroy(a);
    B_destroy(b);

    return 0;
}
```

# 関連（片方向関連 多重度1）のマッピング

![関連_多重度1](/img/blogs/2024/uml-x-mapping/02_03_multi_1.png)

A.h
```c
#ifndef A_H
#define A_H

#include "B.h"

typedef struct {
    B* roleB;  // クラスBへの参照 (必ず1つ保持)
} A;

// コンストラクタとデストラクタ
A* A_create(B* b);  // クラスBのインスタンスを引数として受け取る
void A_destroy(A* a);

// メソッド
void A_publicMethod(A* a);

#endif
```

A.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "A.h"
#include "B.h"

// コンストラクタ
A* A_create(B* b) {
    if (b == NULL) {
        return NULL;  // クラスBのインスタンスがNULLならエラー
    }

    A* a = (A*)malloc(sizeof(A));
    if (a == NULL) {
        return NULL;  // メモリ確保失敗
    }

    // 渡されたクラスBのインスタンスをroleBに設定
    a->roleB = b;

    return a;
}

// デストラクタ
void A_destroy(A* a) {
    // クラスA自体はクラスBの管理はしない（外部で管理）
    free(a);
}

// Aのpublicメソッド (roleBのメソッドを呼び出す)
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

// コンストラクタとデストラクタ
B* B_create(int member1);
void B_destroy(B* b);

// メソッド
int B_method1(B* b);

#endif
```

B.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "B.h"

// コンストラクタ
B* B_create(int member1) {
    B* b = (B*)malloc(sizeof(B));
    if (b == NULL) {
        return NULL;  // メモリ確保失敗
    }
    b->member1 = member1;
    return b;
}

// デストラクタ
void B_destroy(B* b) {
    free(b);
}

// メソッド
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
    // クラスBのインスタンスを作成
    B* b = B_create(100);

    // クラスAのインスタンスを作成し、クラスBのインスタンスを渡す
    A* a = A_create(b);

    // AのpublicMethodを呼び出して、roleBのメソッドを呼ぶ
    A_publicMethod(a);

    // クラスAを破棄（クラスBの破棄は外部で行う）
    A_destroy(a);

    // クラスBを破棄
    B_destroy(b);

    return 0;
}
```

# 関連（片方向関連 多重度0..*）のマッピング

![関連_多重度0..*](/img/blogs/2024/uml-x-mapping/02_04_multi_0astah.png)

A.h
```c
#ifndef A_H
#define A_H

#include "B.h"

#define MAX_B_INSTANCES 10  // クラスBの最大インスタンス数を定義

typedef struct {
    B* roleB[MAX_B_INSTANCES];  // クラスBのインスタンスを保持する配列
    int numRoleB;               // 現在保持しているクラスBのインスタンス数
} A;

// コンストラクタとデストラクタ
A* A_create();
void A_destroy(A* a);

// メソッド
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

// コンストラクタ
A* A_create() {
    A* a = (A*)malloc(sizeof(A));
    if (a == NULL) {
        return NULL; // メモリ確保失敗
    }
    a->numRoleB = 0;  // 初期状態ではクラスBのインスタンスは0
    for (int i = 0; i < MAX_B_INSTANCES; i++) {
        a->roleB[i] = NULL;  // 配列をNULLで初期化
    }
    return a;
}

// デストラクタ
void A_destroy(A* a) {
    for (int i = 0; i < a->numRoleB; i++) {
        if (a->roleB[i] != NULL) {
            B_destroy(a->roleB[i]);  // クラスBのインスタンスを解放
        }
    }
    free(a);
}

// クラスBのインスタンスを追加
int A_addRoleB(A* a, B* b) {
    if (a->numRoleB >= MAX_B_INSTANCES) {
        // インスタンスの数が上限に達すると、追加はできません。
        printf("A::addRoleB: Cannot add more B instances (limit reached)\n");
        return -1;  // 追加できない場合
    }
    a->roleB[a->numRoleB] = b;  // インスタンスを追加
    a->numRoleB++;
    return 0;
}

// クラスBのインスタンスを削除
void A_removeRoleB(A* a, int index) {
    if (index < 0 || index >= a->numRoleB) {
        printf("A::removeRoleB: Invalid index\n");
        return;
    }
    if (a->roleB[index] != NULL) {
        B_destroy(a->roleB[index]);  // インスタンスを解放
        a->roleB[index] = NULL;

        // 指定されたインデックスのクラスBのインスタンスを削除し、配列を詰めて再配置します。
        for (int i = index; i < a->numRoleB - 1; i++) {
            a->roleB[i] = a->roleB[i + 1];
        }
        a->roleB[a->numRoleB - 1] = NULL;
        a->numRoleB--;
    }
}

// クラスBのインスタンスにアクセスし、メソッドを呼び出す
void A_publicMethod(A* a) {
    // クラスAが保持する全てのクラスBのインスタンスのメソッドを呼び出します。
    for (int i = 0; i < a->numRoleB; i++) {
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

// コンストラクタとデストラクタ
B* B_create(int member1);
void B_destroy(B* b);

// メソッド
int B_method1(B* b);

#endif
```

B.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "B.h"

// コンストラクタ
B* B_create(int member1) {
    B* b = (B*)malloc(sizeof(B));
    if (b == NULL) {
        return NULL; // メモリ確保失敗
    }
    b->member1 = member1;
    return b;
}

// デストラクタ
void B_destroy(B* b) {
    free(b);
}

// メソッド
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
    // クラスAのインスタンスを作成
    A* a = A_create();

    // クラスBのインスタンスを複数作成してクラスAに追加
    B* b1 = B_create(100);
    B* b2 = B_create(200);
    B* b3 = B_create(300);

    A_addRoleB(a, b1);
    A_addRoleB(a, b2);
    A_addRoleB(a, b3);

    // AのpublicMethodを呼び出して、roleBのメソッドを呼ぶ
    A_publicMethod(a);

    // 2番目のBインスタンスを削除
    A_removeRoleB(a, 1);

    // 再度publicMethodを呼び出して確認
    A_publicMethod(a);

    // クラスAを破棄（内部のクラスBも破棄される）
    A_destroy(a);

    return 0;
}
```

# 関連（集約）のマッピング

![関連_集約](/img/blogs/2024/uml-x-mapping/02_05_aggrigate.png)

A.h
```c
#ifndef A_H
#define A_H

#include "B.h"

typedef struct {
    B* roleB;  // クラスBへの集約 (1つのインスタンス)
} A;

// コンストラクタとデストラクタ
A* A_create(B* b);  // クラスBのインスタンスを引数として受け取る
void A_destroy(A* a);

// メソッド
void A_publicMethod(A* a);

#endif
```

A.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "A.h"
#include "B.h"

// コンストラクタ
A* A_create(B* b) {
    if (b == NULL) {
        return NULL;  // クラスBのインスタンスがNULLならエラー
    }

    A* a = (A*)malloc(sizeof(A));
    if (a == NULL) {
        return NULL;  // メモリ確保失敗
    }

    // 渡されたクラスBのインスタンスをroleBに設定
    a->roleB = b;

    return a;
}

// デストラクタ
void A_destroy(A* a) {
    // 集約関係ではクラスBのインスタンスを解放しない（外部管理）
    free(a);
}

// Aのpublicメソッド (roleBのメソッドを呼び出す)
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

// コンストラクタとデストラクタ
B* B_create(int member1);
void B_destroy(B* b);

// メソッド
int B_method1(B* b);

#endif
```

B.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "B.h"

// コンストラクタ
B* B_create(int member1) {
    B* b = (B*)malloc(sizeof(B));
    if (b == NULL) {
        return NULL;  // メモリ確保失敗
    }
    b->member1 = member1;
    return b;
}

// デストラクタ
void B_destroy(B* b) {
    free(b);
}

// メソッド
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
    // クラスBのインスタンスを作成
    B* b = B_create(100);

    // クラスAのインスタンスを作成し、クラスBのインスタンスを渡す
    A* a = A_create(b);

    // AのpublicMethodを呼び出して、roleBのメソッドを呼ぶ
    A_publicMethod(a);

    // クラスAを破棄（コンポジションではなく集約の場合、クラスBの破棄は外部で行う）
    A_destroy(a);

    // クラスBを破棄
    B_destroy(b);

    return 0;
}
```

# 関連（コンポジション）のマッピング

![関連_コンポジション](/img/blogs/2024/uml-x-mapping/02_06_composition.png)

A.h
```c
#ifndef A_H
#define A_H

#include "B.h"

typedef struct {
    B* roleB;  // クラスBへのコンポジション (1つのインスタンス)
} A;

// コンストラクタとデストラクタ
A* A_create(B* b);   // コンストラクタでクラスBのインスタンスを受け取る
void A_destroy(A* a);

// メソッド
void A_setRoleB(A* a, B* b);    // roleBを新しいクラスBに設定
void A_removeRoleB(A* a);       // roleBを削除する
void A_publicMethod(A* a);

#endif
```

A.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "A.h"
#include "B.h"

// コンストラクタ
A* A_create(B* b) {
    if (b == NULL) {
        return NULL;  // クラスBのインスタンスがNULLならエラー
    }

    A* a = (A*)malloc(sizeof(A));
    if (a == NULL) {
        return NULL;  // メモリ確保失敗
    }

    // 渡されたクラスBのインスタンスをroleBに設定
    a->roleB = b;

    return a;
}

// デストラクタ
void A_destroy(A* a) {
    if (a->roleB != NULL) {
        B_destroy(a->roleB);  // クラスBのインスタンスを解放
    }
    free(a);
}

// クラスBのインスタンスを新しく設定
void A_setRoleB(A* a, B* b) {
    if (a->roleB != NULL) {
        B_destroy(a->roleB);  // 既存のクラスBのインスタンスを解放
    }
    a->roleB = b;  // 新しいクラスBを設定
}

// クラスBのインスタンスを削除
void A_removeRoleB(A* a) {
    if (a->roleB != NULL) {
        B_destroy(a->roleB);  // クラスBのインスタンスを解放
        a->roleB = NULL;      // roleBをNULLに設定
    }
}

// Aのpublicメソッド (roleBのメソッドを呼び出す)
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

// コンストラクタとデストラクタ
B* B_create(int member1);
void B_destroy(B* b);

// メソッド
int B_method1(B* b);

#endif
```

B.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "B.h"

// コンストラクタ
B* B_create(int member1) {
    B* b = (B*)malloc(sizeof(B));
    if (b == NULL) {
        return NULL;  // メモリ確保失敗
    }
    b->member1 = member1;
    return b;
}

// デストラクタ
void B_destroy(B* b) {
    free(b);
}

// メソッド
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
    // クラスBのインスタンスを作成
    B* b1 = B_create(100);

    // クラスAのインスタンスを作成し、クラスBのインスタンスを渡す
    A* a = A_create(b1);

    // AのpublicMethodを呼び出して、roleBのメソッドを呼ぶ
    A_publicMethod(a);

    // 別のクラスBを作成し、Aに再設定
    B* b2 = B_create(200);
    A_setRoleB(a, b2);

    // 再度publicMethodを呼び出して、roleBのメソッドを呼ぶ
    A_publicMethod(a);

    // roleBを削除
    A_removeRoleB(a);

    // roleBを削除した後、publicMethodを呼び出して確認
    A_publicMethod(a);

    // クラスAを破棄（クラスBはすでに削除されている）
    A_destroy(a);

    return 0;
}
```

# 関連（限定子）のマッピング

![関連_限定子](/img/blogs/2024/uml-x-mapping/02_07_qualifier.png)

A.h
```c
#ifndef A_H
#define A_H

#include "B.h"

#define MAX_ENTRIES 10  // 最大のキーと値のペア数

typedef struct {
    int keys[MAX_ENTRIES];  // キーの配列
    B* roleB[MAX_ENTRIES];  // クラスBのインスタンスの配列
    int count;              // 現在の登録されているペア数
} A;

// コンストラクタとデストラクタ
A* A_create();
void A_destroy(A* a);

// メソッド
int A_addRoleB(A* a, int key, B* b);     // キー付きでroleBを追加
B* A_getRoleB(A* a, int key);            // キーを使ってroleBを取得
void A_removeRoleB(A* a, int key);       // キーを使ってroleBを削除
void A_publicMethod(A* a, int key);      // キーを使ってroleBのメソッドを呼ぶ

#endif
```

A.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "A.h"
#include "B.h"

// コンストラクタ
A* A_create() {
    A* a = (A*)malloc(sizeof(A));
    if (a == NULL) {
        return NULL;  // メモリ確保失敗
    }

    a->count = 0;  // 初期状態でエントリは0
    for (int i = 0; i < MAX_ENTRIES; i++) {
        a->keys[i] = -1;  // 初期化 (未使用のキーは-1で示す)
        a->roleB[i] = NULL;  // クラスBのインスタンスをNULLで初期化
    }

    return a;
}

// デストラクタ
void A_destroy(A* a) {
    for (int i = 0; i < MAX_ENTRIES; i++) {
        if (a->roleB[i] != NULL) {
            B_destroy(a->roleB[i]);  // クラスBのインスタンスを解放
        }
    }
    free(a);
}

// キーを使ってroleBを追加
int A_addRoleB(A* a, int key, B* b) {
    if (a->count >= MAX_ENTRIES) {
        printf("A::addRoleB: Maximum entries reached.\n");
        return -1;
    }

    // 空いているインデックスを探す
    for (int i = 0; i < MAX_ENTRIES; i++) {
        if (a->keys[i] == -1) {  // 空きエントリを見つける
            a->keys[i] = key;
            a->roleB[i] = b;
            a->count++;
            return 0;
        }
    }

    return -1;  // 空きがない場合
}

// キーを使ってroleBを取得
B* A_getRoleB(A* a, int key) {
    for (int i = 0; i < MAX_ENTRIES; i++) {
        if (a->keys[i] == key) {
            return a->roleB[i];  // キーに対応するクラスBを返す
        }
    }
    return NULL;  // 見つからなかった場合
}

// キーを使ってroleBを削除
void A_removeRoleB(A* a, int key) {
    for (int i = 0; i < MAX_ENTRIES; i++) {
        if (a->keys[i] == key) {
            if (a->roleB[i] != NULL) {
                B_destroy(a->roleB[i]);  // クラスBのインスタンスを解放
                a->roleB[i] = NULL;
            }
            a->keys[i] = -1;  // エントリを無効化
            a->count--;
            return;
        }
    }
    printf("A::removeRoleB: Key %d not found\n", key);
}

// キーを使ってroleBのメソッドを呼び出す
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

// コンストラクタとデストラクタ
B* B_create(int member1);
void B_destroy(B* b);

// メソッド
int B_method1(B* b);

#endif
```

B.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "B.h"

// コンストラクタ
B* B_create(int member1) {
    B* b = (B*)malloc(sizeof(B));
    if (b == NULL) {
        return NULL;  // メモリ確保失敗
    }
    b->member1 = member1;
    return b;
}

// デストラクタ
void B_destroy(B* b) {
    free(b);
}

// メソッド
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
    // クラスAのインスタンスを作成
    A* a = A_create();

    // クラスBのインスタンスを複数作成してキーとともに追加
    B* b1 = B_create(100);
    B* b2 = B_create(200);
    B* b3 = B_create(300);

    A_addRoleB(a, 1, b1);
    A_addRoleB(a, 2, b2);
    A_addRoleB(a, 3, b3);

    // AのpublicMethodを呼び出して、キーを使ってroleBのメソッドを呼ぶ
    A_publicMethod(a, 1);
    A_publicMethod(a, 2);

    // roleBを削除
    A_removeRoleB(a, 2);

    // 削除後、再度確認
    A_publicMethod(a, 2);

    // クラスAを破棄（クラスBも内部で解放される）
    A_destroy(a);

    return 0;
}
```

# 汎化関係のマッピング（継承でのマッピング）
言語的に継承の仕組みがある言語では継承で実装しますが、言語的に継承の仕組みがない言語では埋め込みで実装します。

![汎化関係_継承で実装](/img/blogs/2024/uml-x-mapping/03_01_general_inheri.png)

汎化関係そのものは、C言語では対応できません。

# 汎化関係のマッピング（委譲でのマッピング）
継承による実装は基底クラスと派生クラスの結合度がより強くなるため、意図的に結合度を下げるために委譲による実装を使うことがあります。

![汎化関係_委譲で実装](/img/blogs/2024/uml-x-mapping/03_02_general_delegate.png)

A.h
```c
#ifndef A_H
#define A_H

typedef struct {
    int member1;
} A;

// コンストラクタとデストラクタ
A* A_create(int member1);  // クラスAのインスタンスを作成
void A_destroy(A* a);

// メソッド
int A_method1(A* a);       // クラスAのメソッド

#endif
```

A.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "A.h"

// コンストラクタ
A* A_create(int member1) {
    A* a = (A*)malloc(sizeof(A));
    if (a == NULL) {
        return NULL;  // メモリ確保失敗
    }
    a->member1 = member1;
    return a;
}

// デストラクタ
void A_destroy(A* a) {
    free(a);
}

// メソッド
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
    A* delegate;  // クラスAのインスタンス (基底クラス)
} B;

// コンストラクタとデストラクタ
B* B_create(int member1);   // クラスBがクラスAのインスタンスを作成。クラスAを継承しているのでクラスAの初期化に必要なパラメータも、ここで渡される。
void B_destroy(B* b);

// メソッド
void B_publicMethod(B* b);  // クラスAに処理を委譲するメソッド

#endif
```

B.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "B.h"
#include "A.h"

// コンストラクタ
B* B_create(int member1) {
    B* b = (B*)malloc(sizeof(B));
    if (b == NULL) {
        return NULL;  // メモリ確保失敗
    }

    // クラスAのインスタンスを生成し、delegateに設定
    // 基底クラス部分のインスタンスを生成している
    b->delegate = A_create(member1);  // クラスAのコンストラクタにパラメータを渡す

    if (b->delegate == NULL) {
        free(b);  // クラスAの作成が失敗した場合、クラスBも解放
        return NULL;
    }

    return b;
}

// デストラクタ
void B_destroy(B* b) {
    if (b->delegate != NULL) {
        A_destroy(b->delegate);  // クラスAのインスタンスを解放
    }
    free(b);
}

// クラスAのメソッドを呼び出して処理を委譲
void B_publicMethod(B* b) {
    if (b->delegate != NULL) {
        printf("B::publicMethod is delegating to A::method1\n");
        int result = A_method1(b->delegate);  // クラスAのメソッドを呼び出す
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
    // クラスBのインスタンスを作成（基底クラスであるクラスAのインスタンスも内部で作成される）
    B* b = B_create();

    // BのpublicMethodを呼び出して、クラスAに処理を委譲
    B_publicMethod(b);

    // クラスBを破棄（集約ではなくコンポジションなので、クラスAも内部で解放される）
    B_destroy(b);

    return 0;
}
```

# 実現関係のマッピング

![実現関係](/img/blogs/2024/uml-x-mapping/04_realize.png)

C++のように純粋にインタフェースに対応できませんが、分かりやすく工夫し、インタフェースを実現クラスを差し替えるクラスとして実装した例です。
実現クラスの数だけインタフェースクラスがインスタンスを保持するため、freeが必要な場合は追加してください。

InterfaceA.h
```c
#ifndef INTERFACEA_H
#define INTERFACEA_H

#include "B.h"

// InterfaceAの定義
typedef struct {
    B* b_ref;  // クラスBへの参照
    // B以外の実現クラスが出来た場合は、追加する
} InterfaceA;

// コンストラクタとデストラクタ
InterfaceA* InterfaceA_create();  // InterfaceAのインスタンスを作成
void InterfaceA_destroy(InterfaceA* a);  // InterfaceAのインスタンスを破棄

// メソッド
void InterfaceA_setB(InterfaceA* a, B* b);  // クラスBの参照をセット
int InterfaceA_method1(InterfaceA* a);      // クラスBのmethod1を呼び出す

#endif
```

InterfaceA.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "InterfaceA.h"

// コンストラクタ
InterfaceA* InterfaceA_create() {
    InterfaceA* a = (InterfaceA*)malloc(sizeof(InterfaceA));
    if (a == NULL) {
        return NULL;  // メモリ確保失敗
    }
    a->b_ref = NULL;  // 初期状態ではクラスBの参照はNULL
    return a;
}

// デストラクタ
void InterfaceA_destroy(InterfaceA* a) {
    free(a);  // クラスBは別の場所で解放されるためここでは解放しない
}

// クラスBの参照をセット
void InterfaceA_setB(InterfaceA* a, B* b) {
    a->b_ref = b;  // クラスBへの参照をセット
}

// 実現クラスのmethod1を呼び出す
int InterfaceA_method1(InterfaceA* a) {
    if (a->b_ref != NULL) {
        printf("InterfaceA::method1 is calling B::method1\n");
        return B_method1(a->b_ref);  // クラスBのmethod1を呼び出す
    } else {
        printf("InterfaceA::method1: B reference is not set.\n");
        return -1;
    }
    // クラスB以外が増えた場合は、elseの前に if else を追加して呼び出す
}
```

B.h
```c
#ifndef B_H
#define B_H

typedef struct {
    int value;  // クラスB固有のメンバー
} B;

// コンストラクタとデストラクタ
B* B_create(int value);  // クラスBのインスタンスを作成
void B_destroy(B* b);    // クラスBのインスタンスを破棄

// メソッド
int B_method1(B* b);     // クラスBのmethod1

#endif
```

B.c
```c
#include <stdio.h>
#include <stdlib.h>
#include "B.h"

// コンストラクタ
B* B_create(int value) {
    B* b = (B*)malloc(sizeof(B));
    if (b == NULL) {
        return NULL;  // メモリ確保失敗
    }
    b->value = value;
    return b;
}

// デストラクタ
void B_destroy(B* b) {
    free(b);
}

// クラスBのmethod1の実装
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
    // クラスBのインスタンスを作成
    B* b = B_create(100);

    // InterfaceAのインスタンスを作成
    InterfaceA* a = InterfaceA_create();

    // InterfaceAにクラスBの参照をセット
    InterfaceA_setB(a, b);

    // InterfaceAのmethod1を呼び出し、クラスBのmethod1を通して処理を実行
    int result = InterfaceA_method1(a);
    printf("Result from InterfaceA::method1: %d\n", result);

    // インスタンスを破棄
    InterfaceA_destroy(a);
    B_destroy(b);

    return 0;
}
```

# パッケージ図の依存のマッピング

![パッケージ図](/img/blogs/2024/uml-x-mapping/05_package_dependency.png)

パッケージをコードでは実現できませんが、代わりにフォルダでファイルを整理することで実現できます。

# おわりに

本記事は、今後も更新していく可能性があります。ご利用の際は、最新の情報をご覧ください。

