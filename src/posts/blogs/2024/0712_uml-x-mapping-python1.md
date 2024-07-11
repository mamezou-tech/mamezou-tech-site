---
title: UMLをプログラミング言語で実装するには？ Python編
author: takayuki-oguro
date: 2024-07-12
tags: [UML, Python]
image: true
---

# はじめに

UML表記法やUMLモデリングのセミナー講師をしていると、「自分の言語ではどのように実装すればよいのか」というご質問を受けることがあります。また、講師側としても、受講生が使っているプログラミング言語でUMLを説明すると、すんなりと分かって頂ける経験が幾度となくあります。多くのプログラマがUMLモデリングに興味を持って頂けているようですが、UMLのモデルをどのようにソースコードにするかについては意外と知られていません。これが、UMLモデリングが広まらない原因の1つではないかと考えています。

UMLからソースコードへの変換を「マッピング」といい、プログラミング言語名を付けて、「UML/C++マッピング」のように呼びます。このシリーズは、さまざまなプログラミング言語への「UML/Xマッピング」を紹介して、馴染みのあるプログラミング言語からUMLを逆に理解して貰えるように企画したものです。ただし、マッピングは様々なマッピング方法を考える事が可能です。ご紹介するものは、その具体例の1つだとお考え下さい。

# この記事を理解するために必要な基本的な知識

この記事は、最小限のUML表記法が分かることを前提としています。例えば、クラス図では属性/操作や関連端名/多重度および可視性の読み方、汎化関係/実現関係の意味、シーケンス図のメッセージとクラスの操作の対応関係、を理解していることが前提です。

# この記事のマッピングの方針

Pythonは可視性を変数やメソッドの前のアンダースコアで表現しますが、UMLのクラスの操作名や属性名にはPythonを意識したアンダースコアを付けないこととします。可視性は+や-などで表現されているためです。提示するUMLのダイアグラムはプログラミング言語のサポートに関わらず提示し、サンプルコード内にサポート外である旨を記載します。
 :::column:豆知識!
 
Pythonでは、変数名やメソッド名の前のアンダースコアの数で、可視性を記述します。
private - : __member1 (※アンダースコア2つ)
protected # ：_member1 (※アンダースコア1つ。アンダースコアでpublicではないとの意思表明だけで、実際はアクセス可能)
public + ： member1 (※アンダースコアなし)
package ~ ：(※Pythonは、UMLの可視性packageはサポートしていません)

 :::

# クラスの基本要素(クラス,属性,操作)のマッピング

![クラス属性操作](/img/blogs/2024/uml-x-mapping/01_classattmethod.png)

A.py
```python
class A:
    def __init__(self, member1: int, member2: str, member3: int):
        # メンバー変数の初期化
        self.__member1 = member1  # プライベート (Private)
        self._member2 = member2   # プロテクト (Protected)
        self.member3 = member3    # パブリック (Public)
        # member4 パッケージ (Package)は、pythonは実装できません
    
    def __method1(self) -> None:
        # プライベートメソッドの実装
        pass
    
    def _method2(self) -> str:
        # プロテクトメソッドの実装
        return "プロテクトメソッド"
    
    def method3(self) -> None:
        # パブリックメソッドの実装
        print("パブリックメソッド")
        
    # method4 パッケージ (Package)は、pythonでは実装できません
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
    # クラス属性 (Class Attribute)
    __member1 = 0  # プライベートクラス属性

    @classmethod
    def method1(cls) -> int:
        # クラス操作 (Class Operation)
        cls.__member1 = 42  # クラス属性に代入
        return cls.__member1
```

main.py
```python
# 各クラスをインポート
from A import A
from B import B
from C import C

def main():
    # クラスAのインスタンスを作成
    a_instance = A(1, "member2", 3, "member4")
    
    # クラスBのインスタンスを作成
    b_instance = B()
    
    # クラスCのクラス操作を実行
    print(C.method1())  # 42を出力
    
    # クラスCのクラス属性に直接アクセスしようとするとエラーが発生
    # print(C.__member1)  # AttributeError: type object 'C' has no attribute '__member1'

if __name__ == "__main__":
    main()
```

# 関連（片方向 多重度0..1）のマッピング

![関連_片方向関連](/img/blogs/2024/uml-x-mapping/02_01_singlerel.png)

A.py
```python
from B import B

class A:
    def __init__(self, roleB: B = None):
        # クラスBのインスタンスを保持するメンバー変数
        self.__roleB = roleB  # 多重度0..1を表現するためにデフォルト値をNoneに設定

    def get_roleB(self) -> B:
        # roleBのゲッターメソッド
        return self.__roleB
    
    def set_roleB(self, roleB: B) -> None:
        # roleBのセッターメソッド
        self.__roleB = roleB

    def display_roleB(self) -> None:
        # roleBの情報を表示するメソッド
        if self.__roleB:
            print(f"RoleB: {self.__roleB}")
        else:
            print("RoleB is not set.")

```

B.py
```python
class B:
    def __init__(self, name: str):
        # クラスBのメンバー変数
        self.__name = name

    def get_name(self) -> str:
        # nameのゲッターメソッド
        return self.__name

    def __str__(self) -> str:
        # クラスBの文字列表現を返す
        return self.__name

```

main.py
```python
# 各クラスをインポート
from A import A
from B import B

def main():
    # クラスBのインスタンスを作成
    b_instance = B("ExampleB")
    
    # クラスAのインスタンスを作成し、roleBとしてb_instanceを設定
    a_instance = A(b_instance)
    
    # クラスAのroleBを表示
    a_instance.display_roleB()
    
    # クラスAのroleBを変更
    a_instance.set_roleB(None)
    
    # クラスAのroleBを再度表示
    a_instance.display_roleB()

if __name__ == "__main__":
    main()

```

# 関連（双方向 多重度0..1）のマッピング

![関連_双方向関連](/img/blogs/2024/uml-x-mapping/02_02_doublerel.png)

A.py
```python
from B import B

class A:
    def __init__(self, roleB: B = None):
        self.__roleB = None  # 初期化時はNoneに設定
        if roleB:
            self.set_roleB(roleB)  # 初期化時にroleBを設定
    
    def get_roleB(self) -> B:
        return self.__roleB
    
    def set_roleB(self, roleB: B) -> None:
        if self.__roleB is not None:
            # 現在のroleBからこのインスタンスへの参照を解除
            self.__roleB.set_roleA(None)
        
        self.__roleB = roleB
        
        if roleB is not None and roleB.get_roleA() is not self:
            # roleBが設定され、roleBからの参照がこのインスタンスでない場合、参照を設定
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
        self.__roleA = None  # 初期化時はNoneに設定
        if roleA:
            self.set_roleA(roleA)  # 初期化時にroleAを設定
    
    def get_roleA(self) -> A:
        return self.__roleA
    
    def set_roleA(self, roleA: A) -> None:
        if self.__roleA is not None:
            # 現在のroleAからこのインスタンスへの参照を解除
            self.__roleA.set_roleB(None)
        
        self.__roleA = roleA
        
        if roleA is not None and roleA.get_roleB() is not self:
            # roleAが設定され、roleAからの参照がこのインスタンスでない場合、参照を設定
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
    # クラスAのインスタンスを作成
    a_instance = A()
    
    # クラスBのインスタンスを作成し、roleAとしてa_instanceを設定
    b_instance = B(a_instance)
    
    # クラスAのroleBとしてb_instanceを設定
    a_instance.set_roleB(b_instance)
    
    # クラスAのroleBを表示
    a_instance.display_roleB()
    
    # クラスBのroleAを表示
    b_instance.display_roleA()

    # roleBを解除して相互参照を更新
    a_instance.set_roleB(None)
    
    # クラスAのroleBを表示
    a_instance.display_roleB()
    
    # クラスBのroleAを表示
    b_instance.display_roleA()

if __name__ == "__main__":
    main()

```

# 関連（片方向関連 多重度1）のマッピング

![関連_多重度1](/img/blogs/2024/uml-x-mapping/02_03_multi_1.png)

A.py
```python
from B import B

class A:
    def __init__(self, roleB: B):
        # クラスBのインスタンスを保持するメンバー変数
        # 多重度1を表現するために、Noneを許可せず必ずBのインスタンスを持ちます。
        self.__roleB = roleB
    
    def get_roleB(self) -> B:
        # roleBのゲッターメソッド
        return self.__roleB
    
    def set_roleB(self, roleB: B) -> None:
        # roleBのセッターメソッド
        self.__roleB = roleB
    
    def display_roleB(self) -> None:
        # roleBの情報を表示するメソッド
        print(f"RoleB: {self.__roleB}")
    
    def __str__(self) -> str:
        # クラスAの文字列表現を返す
        return "Instance of A"

```

B.py
```python
class B:
    def __init__(self, name: str):
        # クラスBのメンバー変数
        self.__name = name
    
    def get_name(self) -> str:
        # nameのゲッターメソッド
        return self.__name

    def set_name(self, name: str) -> None:
        # nameのセッターメソッド
        self.__name = name
    
    def __str__(self) -> str:
        # クラスBの文字列表現を返す
        return self.__name

```

main.py
```python
# 各クラスをインポート
from A import A
from B import B

def main():
    # クラスBのインスタンスを作成
    b_instance = B("ExampleB")
    
    # クラスAのインスタンスを作成し、roleBとしてb_instanceを設定
    a_instance = A(b_instance)
    
    # クラスAのroleBを表示
    a_instance.display_roleB()
    
    # クラスAのroleBを変更
    new_b_instance = B("NewExampleB")
    a_instance.set_roleB(new_b_instance)
    
    # クラスAのroleBを再度表示
    a_instance.display_roleB()

    # クラスBのインスタンスの名前を変更
    new_b_instance.set_name("UpdatedExampleB")
    
    # クラスAのroleBを再度表示
    a_instance.display_roleB()

if __name__ == "__main__":
    main()

```

# 関連（片方向関連 多重度0..*）のマッピング

![関連_多重度0..*](/img/blogs/2024/uml-x-mapping/02_04_multi_0astah.png)

A.py
```python
from B import B

class A:
    def __init__(self):
        # クラスBのインスタンスをリストで保持するメンバー変数
        # 多重度0..*を表現するために、Bのインスタンスを格納するリストを使用
        self._roleB = []
    
    def add_roleB(self, roleB: B) -> None:
        # roleBをリストに追加するメソッド
        self._roleB.append(roleB)
    
    def remove_roleB(self, roleB: B) -> None:
        # roleBをリストから削除するメソッド
        if roleB in self._roleB:
            self._roleB.remove(roleB)
    
    def display_roleB(self) -> None:
        # roleBの情報を表示するメソッド
        if self._roleB:
            print("RoleB List:")
            for b in self._roleB:
                print(f"  - {b}")
        else:
            print("No RoleB instances.")
    
    def __str__(self) -> str:
        # クラスAの文字列表現を返す
        return "Instance of A"

```

B.py
```python
class B:
    def __init__(self, name: str):
        # クラスBのメンバー変数
        self.__name = name
    
    def get_name(self) -> str:
        # nameのゲッターメソッド
        return self.__name
    
    def __str__(self) -> str:
        # クラスBの文字列表現を返す
        return self.__name

```

main.py
```python
# 各クラスをインポート
from A import A
from B import B

def main():
    # クラスAのインスタンスを作成
    a_instance = A()
    
    # クラスBのインスタンスを作成
    b_instance1 = B("ExampleB1")
    b_instance2 = B("ExampleB2")
    
    # クラスAにクラスBのインスタンスを追加
    a_instance.add_roleB(b_instance1)
    a_instance.add_roleB(b_instance2)
    
    # クラスAのroleBリストを表示
    a_instance.display_roleB()
    
    # クラスAからクラスBのインスタンスを削除
    a_instance.remove_roleB(b_instance1)
    
    # クラスAのroleBリストを再度表示
    a_instance.display_roleB()

if __name__ == "__main__":
    main()

```

# 関連（集約）のマッピング

![関連_集約](/img/blogs/2024/uml-x-mapping/02_05_aggrigate.png)

A.py
```python
from B import B

class A:
    def __init__(self, roleB: B):
        # クラスBのインスタンスを保持するメンバー変数
        # 多重度1を表現するために、Noneを許可せず必ずBのインスタンスを持ちます。
        self.__roleB = roleB
    
    def get_roleB(self) -> B:
        # roleBのゲッターメソッド
        return self.__roleB
    
    def set_roleB(self, roleB: B) -> None:
        # roleBのセッターメソッド
        self.__roleB = roleB
    
    def display_roleB(self) -> None:
        # roleBの情報を表示するメソッド
        print(f"RoleB: {self.__roleB}")
    
    def __str__(self) -> str:
        # クラスAの文字列表現を返す
        return "Instance of A"

```

B.py
```python
class B:
    def __init__(self, name: str):
        # クラスBのメンバー変数
        self.__name = name
    
    def get_name(self) -> str:
        # nameのゲッターメソッド
        return self.__name

    def set_name(self, name: str) -> None:
        # nameのセッターメソッド
        self.__name = name
    
    def __str__(self) -> str:
        # クラスBの文字列表現を返す
        return self.__name

```

main.py
```python
# 各クラスをインポート
from A import A
from B import B

def main():
    # クラスBのインスタンスを作成
    b_instance = B("ExampleB")
    
    # クラスAのインスタンスを作成し、roleBとしてb_instanceを設定
    a_instance = A(b_instance)
    
    # クラスAのroleBを表示
    a_instance.display_roleB()
    
    # クラスAのroleBを変更
    new_b_instance = B("NewExampleB")
    a_instance.set_roleB(new_b_instance)
    
    # クラスAのroleBを再度表示
    a_instance.display_roleB()

    # クラスBのインスタンスの名前を変更
    new_b_instance.set_name("UpdatedExampleB")
    
    # クラスAのroleBを再度表示
    a_instance.display_roleB()
    
    # 集約関係: クラスAがクラスBのインスタンスを所有しているが、クラスBのライフサイクルはクラスAとは独立している。このため、クラスBのインスタンスはクラスAが削除されてもそのまま存在することができる。

    # クラスAのインスタンスを削除
    del a_instance

    # クラスBのインスタンスがまだ存在することを確認
    print(f"RoleB after deleting A: {new_b_instance}")

if __name__ == "__main__":
    main()

```

# 関連（コンポジション）のマッピング

![関連_コンポジション](/img/blogs/2024/uml-x-mapping/02_06_composition.png)

A.py
```python
from B import B

class A:
    def __init__(self, roleB_name: str):
        # クラスBのインスタンスをコンポジションとして保持するメンバー変数
        # コンポジション (Composition): クラスAがクラスBのインスタンスを所有し、そのライフサイクルを管理します。
        self.__roleB = B(roleB_name)
    
    def get_roleB(self) -> B:
        # roleBのゲッターメソッド
        return self.__roleB
    
    def set_roleB(self, roleB: B) -> None:
        # roleBのセッターメソッド
        # コンポジション (Composition): 部分要素を差し替えることが可能です。
        self.__roleB = roleB
    
    def display_roleB(self) -> None:
        # roleBの情報を表示するメソッド
        print(f"RoleB: {self.__roleB}")
    
    def __str__(self) -> str:
        # クラスAの文字列表現を返す
        return "Instance of A"

    def __del__(self):
        # クラスAが削除されると、roleBも削除される
        # (Pythonのガベージコレクションによって自動的に管理されるが、明示的に示す)
        print(f"Deleting {self} and its roleB {self.__roleB}")
        del self.__roleB

```

B.py
```python
class B:
    def __init__(self, name: str):
        # クラスBのメンバー変数
        self.__name = name
    
    def get_name(self) -> str:
        # nameのゲッターメソッド
        return self.__name
    
    def __str__(self) -> str:
        # クラスBの文字列表現を返す
        return self.__name

```

main.py
```python
# 各クラスをインポート
from A import A
from B import B

def main():
    # クラスAのインスタンスを作成し、roleBの名前を指定
    a_instance = A("ExampleB")
    
    # クラスAのroleBを表示
    a_instance.display_roleB()
    
    # クラスAのroleBを差し替え
    new_b_instance = B("NewExampleB")
    a_instance.set_roleB(new_b_instance)
    
    # クラスAのroleBを再度表示
    a_instance.display_roleB()
    
    # クラスAのインスタンスを削除
    # クラスAが削除されると、コンポジションによりroleBも削除される
    del a_instance

if __name__ == "__main__":
    main()

```

# 関連（限定子）のマッピング

![関連_限定子](/img/blogs/2024/uml-x-mapping/02_07_qualifier.png)

A.py
```python
from B import B

class A:
    def __init__(self):
        # クラスBのインスタンスを保持するメンバー変数
        # 限定子 (Qualifier): クラスBのインスタンスを一意に識別するためのキー
        self._roleB = {}

    def add_roleB(self, key: str, roleB: B) -> None:
        # roleBを追加するメソッド。キーを使って一意に識別します。
        self._roleB[key] = roleB

    def get_roleB(self, key: str) -> B:
        # 指定されたキーに対応するroleBを取得するメソッド
        return self._roleB.get(key, None)

    def remove_roleB(self, key: str) -> None:
        # 指定されたキーに対応するroleBを削除するメソッド
        if key in self._roleB:
            del self._roleB[key]

    def display_roleB(self) -> None:
        # すべてのroleBの情報を表示するメソッド
        if self._roleB:
            print("RoleB List:")
            for key, b in self._roleB.items():
                print(f"  Key: {key}, RoleB: {b}")
        else:
            print("No RoleB instances.")

    def __str__(self) -> str:
        # クラスAの文字列表現を返す
        return "Instance of A"

```

B.py
```python
class B:
    def __init__(self, name: str):
        # クラスBのメンバー変数
        self.__name = name
    
    def get_name(self) -> str:
        # nameのゲッターメソッド
        return self.__name
    
    def __str__(self) -> str:
        # クラスBの文字列表現を返す
        return self.__name

```

main.py
```python
# 各クラスをインポート
from A import A
from B import B

def main():
    # クラスAのインスタンスを作成
    a_instance = A()
    
    # クラスBのインスタンスを作成
    b_instance1 = B("ExampleB1")
    b_instance2 = B("ExampleB2")
    
    # クラスAにクラスBのインスタンスを追加
    a_instance.add_roleB("key1", b_instance1)
    a_instance.add_roleB("key2", b_instance2)
    
    # クラスAのroleBリストを表示
    a_instance.display_roleB()
    
    # キーを使用して特定のroleBを取得
    print(a_instance.get_roleB("key1"))
    
    # クラスAから特定のroleBを削除
    a_instance.remove_roleB("key1")
    
    # クラスAのroleBリストを再度表示
    a_instance.display_roleB()

if __name__ == "__main__":
    main()

```

# 汎化関係のマッピング（継承でのマッピング）
言語的に継承の仕組みがある言語では継承で実装しますが、言語的に継承の仕組みがない言語では埋め込みで実装します。

![汎化関係_継承で実装](/img/blogs/2024/uml-x-mapping/03_01_general_inheri.png)

A.py
```python
class A:
    def __init__(self, name: str):
        # クラスAのメンバー変数
        self.__name = name
    
    def get_name(self) -> str:
        # nameのゲッターメソッド
        return self.__name
    
    def __str__(self) -> str:
        # __str__メソッドは、オブジェクトの文字列表現を返します。
        # これはprint()関数やstr()関数で呼び出されます。
        return self.__name

```

B.py
```python
from A import A

class B(A):
    def __init__(self, name: str, age: int):
        # スーパークラスAのコンストラクタを呼び出す
        super().__init__(name)
        # クラスBのメンバー変数
        self.__age = age
    
    def get_age(self) -> int:
        # ageのゲッターメソッド
        return self.__age
    
    def __str__(self) -> str:
        # クラスBの文字列表現を返す
        return f"{super().__str__()}, Age: {self.__age}"

```

main.py
```python
# 各クラスをインポート
from A import A
from B import B

def main():
    # クラスAのインスタンスを作成
    a_instance = A("BaseClassInstance")
    
    # クラスBのインスタンスを作成
    b_instance = B("DerivedClassInstance", 25)
    
    # クラスAの情報を表示
    print(f"A Instance: {a_instance}")
    
    # クラスBの情報を表示
    print(f"B Instance: {b_instance}")

if __name__ == "__main__":
    main()

```

# 汎化関係のマッピング（委譲でのマッピング）
継承による実装は基底クラスと派生クラスの結合度がより強くなるため、意図的に結合度を下げるために委譲による実装を使うことがあります。

![汎化関係_委譲で実装](/img/blogs/2024/uml-x-mapping/03_02_general_delegate.png)

A.py
```python
class A:
    def __init__(self, name: str):
        # クラスAのメンバー変数
        self.__name = name
    
    def get_name(self) -> str:
        # nameのゲッターメソッド
        return self.__name
    
    def perform_action(self) -> str:
        # クラスAのアクションメソッド
        return f"Action performed by {self.__name}"
    
    def __str__(self) -> str:
        # クラスAの文字列表現を返す
        return self.__name

```

B.py
```python
from A import A

class B:
    def __init__(self, delegate: A):
        # クラスAのインスタンスを委譲として保持するメンバー変数
        self._delegate = delegate
    
    def perform_delegate_action(self) -> str:
        # 委譲されたアクションを実行するメソッド
        # クラスAのperform_actionメソッドを呼び出します。
        return self._delegate.perform_action()
    
    def get_delegate_name(self) -> str:
        # クラスAのインスタンスの名前を取得するメソッド
        return self._delegate.get_name()
    
    def __str__(self) -> str:
        # クラスBの文字列表現を返す
        return f"Instance of B, Delegate: {self._delegate}"

```

main.py
```python
# 各クラスをインポート
from A import A
from B import B

def main():
    # クラスAのインスタンスを作成
    a_instance = A("DelegateA")
    
    # クラスBのインスタンスを作成し、委譲先のインスタンスを指定
    b_instance = B(a_instance)
    
    # クラスBを通じて委譲されたアクションを実行
    print(b_instance.perform_delegate_action())
    
    # クラスBの委譲先の名前を表示
    print(b_instance.get_delegate_name())
    
    # クラスBの情報を表示
    print(b_instance)

if __name__ == "__main__":
    main()

```

# 実現関係のマッピング

![実現関係](/img/blogs/2024/uml-x-mapping/04_realize.png)

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
        # 具体的な実装
        return 42

```

main.py
```python
# インターフェースと実装クラスをインポート
from InterfaceA import InterfaceA
from B import B

def main():
    # InterfaceAの型でインスタンスを保持
    a_instance: InterfaceA = B()
    
    # method1を呼び出して結果を表示
    result = a_instance.method1()
    print(f"Result from method1: {result}")

if __name__ == "__main__":
    main()

```

# パッケージ図の依存のマッピング

![パッケージ図](/img/blogs/2024/uml-x-mapping/05_package_dependency.png)

Package1/module1.py
```python
# Package2のmodule2.pyからClassBをインポート
from Package2.module2 import ClassB

# Pythonでは、パッケージ内のモジュール、クラス、関数などの具体的な内容を示して依存を実装する必要があります。
class ClassA:
    def __init__(self, name: str):
        self.name = name
        self.b_instance = ClassB(name)

    def perform_action(self):
        # クラスBのメソッドを呼び出して、依存関係を示す
        return self.b_instance.action()

    def __str__(self):
        return f"ClassA with name: {self.name}"

```

Package2/module2.py
```python
# クラスBの定義
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
# Package1のmodule1.pyからClassAをインポート
from Package1.module1 import ClassA

def main():
    # クラスAのインスタンスを作成
    a_instance = ClassA("ExampleName")
    
    # クラスAを通じてクラスBのアクションを実行
    print(a_instance.perform_action())
    
    # クラスAの情報を表示
    print(a_instance)

if __name__ == "__main__":
    main()

```

# おわりに

本記事は、今後も更新していく可能性があります。ご利用の際は、最新の情報をご覧ください。

 