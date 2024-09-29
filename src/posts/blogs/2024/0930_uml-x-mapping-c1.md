---
title: UMLをプログラミング言語で実装するには？ C言語(超シンプル版)編
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

この記事は、UMLを使っているものの、普段はC言語を使っているため、「クラス」や「インスタンス」といった概念に馴染みがなくて戸惑っている方を対象にしています。クラスとインスタンスの区別をせず、すべてのインスタンスをクラスとして扱ったクラス図を描き、その図をマッピングに基づいて変換するというアプローチを紹介します。

UMLのprotected、package、汎化関係、多重度については対応せず、マッピングの方法は基本的に変数名や関数名の先頭に「クラス名_」を付けるだけです。

この方法のメリットは、「クラスとインスタンスの概念を理解する必要がないため、導入のハードルが低い」という点です。たとえば、クラス図には「モータ」クラスではなく、「右モータ」と「左モータ」という2つのクラスを描きます。

一方、デメリットとしては、「同じクラスが複数存在する場合、ほぼコピペのモジュールを作ることになる」という点です。たとえば、「右モータ.c」「左モータ.c」といったファイルを作成し、それぞれに同じ「スタート関数」のコードを書くことになります。そのため、不具合の修正や機能追加を行う際には、各ファイルに個別に対応する必要があります。

以上の方針により、この記事では多くのUML表記法に対応せず、限られた表記法のみを使ってクラス図を作成した上で、コードにマッピングしてください。

# クラスの基本要素(クラス,属性,操作)のマッピング

![クラス属性操作](/img/blogs/2024/uml-x-mapping/01_classattmethod.png)

A.h
```c
#ifndef A_H
#define A_H

// public 属性
extern int A_member3;  // 変数には、外部リンケージであることを明示するためのexternを付ける

// public メソッド
void A_method3();      // 関数宣言には、デフォルトで暗黙的にexternが付いているため、一般的にexternを付けません

#endif
```

A.c
```c
#include "A.h"
#include <stdio.h>
#include <string.h>

// private 属性
static int A_member1;  // privateの場合は、staticを付けます

// protected 属性
// static char member2[100]; // protectedには、対応しません

// public 属性
int A_member3;  // publicの場合は、static不要です

// package 属性
// char A_member4[100];  // packageには、対応しません

// private メソッド
static void A_method1() { // privateの場合は、staticを付けます
    // private メソッド method1 の実装
}

// protected メソッド
// char* A_method2() {  // protectedには、対応しません
//    // protected メソッド method2 の実装
//    return member2;
// }

// public メソッド
void A_method3() {  // publicの場合は、static不要です
    // public メソッド method3 の実装
    printf("A_method3 が呼ばれました\n");
}

// package メソッド
// void A_method4(char* output) { // packageには、対応しません
//    // package/private メソッド method4 の実装
//    strcpy(output, A_member4);
// }
```

B.h
```c
#ifndef B_H
#define B_H

// public メソッド
char* B_method1();

// public抽象メソッド
// char* B_hookMethod();  // 抽象メソッドは対応しません

#endif
```

B.c
```c
#include "B.h"
#include <string.h>

// public メソッド
char* B_method1() {
    // method1 の実装
    strcpy(result1, "B_method1 の結果");
    return result1;
}

// public抽象 メソッド
// char* B_hookMethod() {
//    // hookMethod の実装
//    strcpy(result2, "B_hookMethod の結果");
//    return result2;
// }
```

C.h
```c
#ifndef C_H
#define C_H

// public メソッド
int C_method1();

#endif
```

C.c
```c
#include "C.h"

// private 属性
static int C_member1;

// public メソッド
int C_method1() {
    // method1 の実装
    return C_member1;
}
```

# 関連（片方向 多重度0..1）のマッピング

![関連_片方向関連](/img/blogs/2024/uml-x-mapping/02_01_singlerel.png)

インスタンス化を考慮しない方針のため、多重度には対応しません。クラス図を描く際には、0..1 や n..m の多重度は記載しないようにします。

# 関連（双方向 多重度0..1）のマッピング

![関連_双方向関連](/img/blogs/2024/uml-x-mapping/02_02_doublerel.png)

インスタンス化を考慮しない方針のため、多重度には対応しません。クラス図を描く際には、0..1 や n..m の多重度は記載しないようにします。

# 関連（片方向関連 多重度1）のマッピング

![関連_多重度1](/img/blogs/2024/uml-x-mapping/02_03_multi_1.png)

このマッピング方針では、クラス間の連携は、ほぼこれだけです。双方向であっても同じマッピングになります。

A.h
```c
#ifndef A_H
#define A_H

// public メソッド
void A_executeSomething();  // サンプルコードとして、クラスBの関数呼び出しが含まれています。

#endif
```
A.c
```c
#include "A.h"
#include "B.h"  // クラスBのメソッドを利用するためにインクルード

// public メソッド
void A_executeSomething() {
    // 処理を実装
    B_executeSomething();  // クラスBのメソッドを呼び出し
}
```

B.h
```c
#ifndef B_H
#define B_H

// public メソッド
void B_executeSomething();  // 呼び出されるクラスBのメソッド

#endif
```
B.c
```c
#include "B.h"

// public メソッド
void B_executeSomething() {
    // 処理を実装
}
```

# 関連（片方向関連 多重度0..*）のマッピング

![関連_多重度0..*](/img/blogs/2024/uml-x-mapping/02_04_multi_0astah.png)

インスタンス化を考慮しない方針のため、多重度には対応しません。クラス図を描く際には、0..1 や n..m の多重度は記載しないようにします。

# 関連（集約）のマッピング

![関連_集約](/img/blogs/2024/uml-x-mapping/02_05_aggrigate.png)

マッピングは「# 関連（片方向関連 多重度1）」のマッピングと同じです。ただし、クラス図では全体-部分の関係を示すことができるため、集約を使った表現も無意味ではありません。

# 関連（コンポジション）のマッピング

![関連_コンポジション](/img/blogs/2024/uml-x-mapping/02_06_composition.png)

コンポジションは、ライフサイクル制約により、全体概念のインスタンスが消滅すと、そこに含まれる部分概念のインスタンスも消滅する関係を示します。
しかし、インスタンス化を考慮しない方針のため、インスタンスの消滅は発生しません。
したがって、マッピングは「# 関連（集約）のマッピング」と同様に「# 関連（片方向関連 多重度1）」のマッピングと同じになります。

# 関連（限定子）のマッピング

![関連_限定子](/img/blogs/2024/uml-x-mapping/02_07_qualifier.png)

インスタンス化を考慮しない方針のため、多重度のあるケースに該当する限定子も対応しません。クラス図を描く際には、限定子は記載しないようにします。

# 汎化関係のマッピング（継承でのマッピング）
言語的に継承の仕組みがある言語では継承で実装しますが、言語的に継承の仕組みがない言語では埋め込みで実装します。

![汎化関係_継承で実装](/img/blogs/2024/uml-x-mapping/03_01_general_inheri.png)

汎化関係そのものは、C言語では対応できません。

# 汎化関係のマッピング（委譲でのマッピング）
継承による実装は基底クラスと派生クラスの結合度がより強くなるため、意図的に結合度を下げるために委譲による実装を使うことがあります。

![汎化関係_委譲で実装](/img/blogs/2024/uml-x-mapping/03_02_general_delegate.png)

外部からクラスA側の関数を呼び出されたときに、クラスBとして振舞うことは出来ません。
外部からクラスB側の関数を呼び出されたときに、クラスBの内部でクラスAの関数を呼び出す形での実装は可能です。
「# 関連（片方向関連 多重度1）」のマッピングと方向が逆なだけのコードになります。

# 実現関係のマッピング

![実現関係](/img/blogs/2024/uml-x-mapping/04_realize.png)

実現関係のインタフェースは.hファイルに対応し、実現クラスは.cファイルに対応します。
このクラス図では、「クラスB」しかありませんが、同じ「インタフェースInterfaceA」を実現する別の.cファイルを作ることも可能です。
実現クラスを差し替える場合は、リンカーで差し替えます。

InterfaceA.h
```c
#ifndef INTERFACEA_H
#define INTERFACEA_H

// InterfaceAに対応するメソッドのプロトタイプ宣言
int InterfaceA_method1();

#endif
```

B.c
```c
#include "A.h"

// インターフェースのメソッドをBで実装
int InterfaceA_method1() {
    // InterfaceA_method1 の実装
    return 0;
}
```

C.c
```c
#include "A.h"

// インターフェースのメソッドをCで実装
int InterfaceA_method1() {
    // InterfaceA_method1 の実装
    return 1;
}
```

# パッケージ図の依存のマッピング

![パッケージ図](/img/blogs/2024/uml-x-mapping/05_package_dependency.png)

パッケージをコードでは実現できませんが、代わりにフォルダでファイルを整理することで実現できます。

# おわりに

本記事は、今後も更新していく可能性があります。ご利用の際は、最新の情報をご覧ください。

