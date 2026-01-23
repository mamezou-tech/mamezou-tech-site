---
title: 無料のOSSツールSysONで始めるSysMLv2モデリング（３）〜 Part Definitionの作成
author: yasumasa-takahashi
date: 2026-01-22
tags: [SysON,SysMLv2,MBSE,モデリング]
image: true
---

前回の記事では、新しいプロジェクトとPackage要素を作成しました。

@[og](/blogs/2026/01/15/sysmlv2-tool-syson-pkg/)

本記事では、構造定義の要の１つである Part Definitionを作成します。

執筆時点における SysONの安定版は v2025.12.0が最新ですが、本記事では前回同様 v2025.8.0を使用します。
最新リリースの挙動は一部異なる可能性がありますのでご了承ください。

モデリングの題材は、SysMLv2の仕様書 A Annex: Example Modelから拝借します。
"Figure 59. Axle and its Subclass FrontA"を作成してみましょう。

![Figure 59](/img/blogs/2026/0122_sysmlv2-tool-syson-partdef/fig.59.png)

## 新規のPart Definitionを作成する
前回と同じように General Viewを表示し、右クリックで表示されるコンテキストメニューから "Structure" > "New Part Definition"を選択します。

![新規Part Definition](/img/blogs/2026/0122_sysmlv2-tool-syson-partdef/partdef.01.png)

すると、General Viewに Part Definitionが表示されます。

## Part Definitionの名前を変更する
作成した Part Definitionの名前を"Axle"に変更しましょう。

名前を変更する方法は２つあります。
後述しますが、この２つの方法はくわしくみると動作が異なります。

### 変更方法その１
１つは右サイドバーで変更する方法です。
対象の要素（PartDefinition1）を選択すると右サイドバーに Detailsが表示されます。
その Declared Nameの欄に表示されている名前を直接編集します。

![右サイドバーで名前を変更](/img/blogs/2026/0122_sysmlv2-tool-syson-partdef/partdef.02.png)

### 変更方法その２
もう１つは要素のコンテキストメニューやファンクションキーで変更する方法です。
コンテキストメニューを表示して上部に並んでいるアイコンの中で最も左にあるペンアイコンをクリックします。

![コンテキストメニューで名前を変更](/img/blogs/2026/0122_sysmlv2-tool-syson-partdef/partdef.03.png)

ペンアイコンをクリックすると、要素内に表示された名前を直接編集できるようになります。
コンテキストメニューで、ペンアイコンではなく "Edit" > "Edit"を選択しても同様に名前を直接編集できるようになります。

![Fキーで名前を変更](/img/blogs/2026/0122_sysmlv2-tool-syson-partdef/partdef.04.png)

要素を選択して F2キーを押下しても同様に名前を直接編集できます。

## Part DefinitionにAttributeを追加する
次は、"Axle"の attributesに"mass"を追加しましょう。

"Axle"を選択してコンテキストメニューを表示し、"Structure" > "New Attribute"を選択します。
"Axle"にattributes区画が表示され、その区画に"attribute1"が追加されます。

![新規Attribute](/img/blogs/2026/0122_sysmlv2-tool-syson-partdef/attribute.01.png)

追加された"attribute1"を選択し、その名前を"mass :> ISQBase::mass"に変更します。

コンテキストメニューかファンクションキーを用いた方法で変更した場合、右サイドバーの Detailsに Subsetsの項目があらわれ、そこに massが表示されます。

![Attributeをsubsetにする](/img/blogs/2026/0122_sysmlv2-tool-syson-partdef/attribute.02.png)

"attribute1"の名前を左サイドバーの Detailsにある Declared Nameで変更した場合、図の見た目は同じですが Detailsに Subsetsの項目はあらわれません。

これはどういうことでしょうか。

前者（コンテキストメニューなどで変更）の場合は、subsetsの記号（:>）が解釈されて massが ISQBase::massの subsetsになります。
一方後者（Declared Nameで名前を変更）の場合は、単純に名前が"mass :> ISQBase::mass"に変更されます。

この違いは図の見た目だけではわからないため注意してください。

## Part Definition間にSubclassificationを設定する
Axleと同様の手順でもう１つ Part Definitionを作成して名前を"FrontAxle"にします。

"FrontAxle"を選択した時に要素の上下左右に表示される三角（＞）の位置にマウスをあわせるとマウスのポインタが十字（＋）に変わります。
この状態で"Axle"にドラッグ＆ドロップすると、relationshipを選択するコンテキストメニューが表示されます。

![2つのPart Definition](/img/blogs/2026/0122_sysmlv2-tool-syson-partdef/partdef.05.png)

ここで、"New Subclassification"を選択すると、Subclassificationをあらわす白抜き矢印の線が表示されます。
加えて、"FrontAxle"の名前が"FrontAxle :> Axle"に変更されます。

![subclassification](/img/blogs/2026/0122_sysmlv2-tool-syson-partdef/partdef.06.png)

Subclassificationを設定するもう１つの方法があります。
それは、"FrontAxle"をコンテキストメニューもしくはファンクションキーで"FrontAxle :> Axle"に変更する方法です。
変更すると、"FrontAxle"の表示が変わるとともに、Axleとの間に Subclassificationをあらわす線が表示されます。

"FrontAxle"に"steering"の attributeを追加します。

![作成した図](/img/blogs/2026/0122_sysmlv2-tool-syson-partdef/partdef.07.png)

SysMLv2仕様書の"Figure 59. Axle and its Subclass FrontA"と等価な図ができました。

## テキスト記法を用いたPart Definitionの追加
ここまで作図でモデルを作成してきましたが、Packageと同様テキスト記述を用いたモデル作成もできます。

```
part def Axle {
	attribute mass:>ISQ::mass;
}
part def FrontAxle :> Axle {
	attribute steeringAngle :> ISQ::angularMeasure;
}
```

作成された Axleと FrontAxleを General Viewにドラッグ＆ドロップします。

attribute区画を表示するにはまず、Part Definitionの名前の右にマウスカーソルをあわせた際に表示される目のアイコンをクリックします。
表示された"Manage Visibility"コンテキストメニューの"attribute"にチェックを入れます。

![attribute区画の表示](/img/blogs/2026/0122_sysmlv2-tool-syson-partdef/partdef.08.png)

## 次回予告
本記事では、Part Definition要素を作成し要素間に Subclassificationを設定しました。

次回は、Part Usageを作成し、Part Definitionとの関連付けを行います。
