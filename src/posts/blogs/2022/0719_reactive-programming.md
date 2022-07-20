---
title: リアクティブプログラミング (Reactive Programming)
author: shigeki-shoji
date: 2022-07-19
tags: [FRP, "reactive-streams"]
---

リアクティブプログラミング (Reactive Programming) とは、データストリームとその変更の伝搬を関心事とする宣言的プログラミングパラダイムです。

次のような命令型プログラミングによるコードがあったとします。

```text
int a = 3;
int b = 5;
int c = a + b; // c ===> 8
int a = 5; // c ===> 8
```

この命令型プログラミングは、処理が先頭から順に進み、最終行で変数 a の値を変更しても変数 c の値は変化しません。

リアクティブプログラミングでは、変数 a または変数 b の値が変更されるとその変更が伝播され、変数 c の値は再計算された値となります。

```text
int a = 3;
int b = 5;
def c = a + b; // c ===> 8
int a = 5; // c ===> 10
```

変数が、この例のように少ない場合はどちらかの変数の変化を監視して再計算するコードを書くのも容易でしょう。しかし、監視すべき変数が増えそれぞれの変数の値が異なるタイミングで変更されるとした場合、これまでの命令型プログラミングパラダイムではコードは非常に複雑になり、解決すべきドメインに集中できない結果をもたらします。

:::info
[SWEBOK](https://www.computer.org/education/bodies-of-knowledge/software-engineering) では、次のプログラミングパラダイムが挙げられています。

* 非構造化プログラミング (Unstructured Programming)
* 構造化/手続き型/ 命令型プログラミング (Structured/Procedural/ Imperative Programming)
* オブジェクト指向プログラミング (Object-Oriented Programming)
* アスペクト指向プログラミング (Aspect-Oriented Programming)
* 関数型プログラミング (Functional Programming)

リアクティブプログラミングは、新たなプログラミングパラダイムに分類されるだろうと考えています。
:::

次に、リアクティブプログラミングを複数の走行するロボットの衝突回避のために適切な速度を保つためのブレーキ操作で考えてみましょう。
衝突を回避するための安全な距離 (m) は速度 (km/h) と同じで、また停止時には 10 cm の間隔を保持したいため、速度 (speed) + 0.1 m の間隔を保つことを目標にブレーキ判定することとします。 

```text
def brakeOn = speed > distance + 0.1;
```

brakeOn を無限ループで評価できますが、実際上は speed と distance のどちらかに変化があった場合に再計算すれば良いため、リアクティブプログラミングでは再計算に必要な変数の変化を監視 (Observe) することが一般的です。

リアクティブプログラミングを実現するアプローチは、関数型リアクティブプログラミング (FRP - Functional Reactive Programming) やアクターベース (Actor Based) 等があります。また、標準化されたパターンとして、リアクティブストリーム ([Reactive Streams](https://www.reactive-streams.org/)) があります。
