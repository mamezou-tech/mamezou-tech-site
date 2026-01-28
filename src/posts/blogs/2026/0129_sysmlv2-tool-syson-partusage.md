---
title: 無料のOSSツールSysONで始めるSysMLv2モデリング（４）〜 Part Usageの作成
author: yasumasa-takahashi
date: 2026-01-29
tags: [SysON,SysMLv2,MBSE,モデリング]
image: true
---

前回の記事「無料のOSSツールSysONで始めるSysMLv2モデリング（３）〜 Part Definitionの作成」では、Part Definitionを作成しました。

@[og](/blogs/2026/01/22/sysmlv2-tool-syson-partdef/)

本記事では、Part Usageを作成します。

本記事で使用する SysONは前回同様、v2025.8.0です。
SysONは現在も進化中ですので最新リリースの挙動とは異なる可能性があります。
ご了承ください。

モデリングの題材は、SysMLv2の仕様書 A Annex: Example Modelから拝借します。
"Figure 63. Variant engine4Cyl"を作成してみましょう。

![Figure 63](/img/blogs/2026/0129_sysmlv2-tool-syson-partusage/fig.63.png)

## 新規のPart Usageを作成する
General Viewを右クリックして表示されるコンテキストメニューから "Structure" > "New Part"を選択すると、General Viewに "part1"が追加されます。

![新規Part Usageコンテキストメニュー](/img/blogs/2026/0129_sysmlv2-tool-syson-partusage/01.png)

要素を追加する方法はもう１つあります。
左サイドバーのツリーでパッケージなどの要素の右にあるケバブアイコン（︙）をクリックします。
表示されたダイアログで Partを選択し、"CREATE"ボタンを押下することで指定した要素の中に新たな要素を追加できます。

![新規Part Usageダイアグラム](/img/blogs/2026/0129_sysmlv2-tool-syson-partusage/02.png)

追加した要素を General Viewにドラッグ＆ドロップすれば、グラフィカル記法で表示できます。

## Part DefinitionとPart Usageの間にdefinitionを作成する
前回の記事の手順でPart Definitionを作成し、"Engine"に名前を変更します。
次に、Part Usageを作成し、"engine"に名前を変更します。

"engine"を選択し、４つの辺の外に表示された三角（＞）を"Engine"までドラッグ＆ドロップすると、コンテキストメニューが表示されます。
コンテキストメニューで"New Feature Typing"を選択すると、Part DefinitionとPart Usageの間にdefinitionを作成できます。

![definition作成](/img/blogs/2026/0129_sysmlv2-tool-syson-partusage/03.png)

definitionは白抜き三角と２つの点が付いた線であらわします。
もう１セット、Part Definitionの"Cylinder"と Part Usageの"cylinders"も作成しましょう。

![definition作成済](/img/blogs/2026/0129_sysmlv2-tool-syson-partusage/04.png)

## Part Usage間にcomposite-feature-membershipを作成する
"engine"と"cylinders"間にcomposite-feature-membershipを作成します。

"engine"を選択し、４つの辺の外に表示された三角（＞）を"cylinder"までドラッグ＆ドロップし、コンテキストメニューを表示します。
コンテキストメニューで"Add as nested Part"を選択すると、Part Usage間にcomposite-feature-membershipを作成できます。

![composite作成](/img/blogs/2026/0129_sysmlv2-tool-syson-partusage/05.png)

"cylinders"から"engine"にドラッグ＆ドロップの操作をした場合、コンテキストメニューで"Become nested Part"を選択すると同様に作成できます。

![composite](/img/blogs/2026/0129_sysmlv2-tool-syson-partusage/06.png)

左サイドバーのツリー上で、”cylinders”を"engine"にドラッグ＆ドロップすることによっても作成できます。

![composite drag&drop](/img/blogs/2026/0129_sysmlv2-tool-syson-partusage/07.png)

composite-feature-membershipは黒塗りひし形の付いた線であらわします。

![composite](/img/blogs/2026/0129_sysmlv2-tool-syson-partusage/08.png)

## Part Usage間にnoncomposite-feature-membershipを作成する
"engine"と"cylinders"間のrelationshipをnoncomposite-feature-membershipにします。

noncomposite-feature-membershipはusageが参照的であることをあらわします。
したがって、参照されている側のusageの設定を変更します。

参照されている"cylinders"を選択して、右サイドバーのDetailsにあるAdvancedタグを選択します。
ここにある Is Compositeのチェックを外してください。
すると Is Referenceにチェックが付き、エディタ上の"cylinders"のステレオタイプが"«ref part»"に変わります。
これと共に、"engine"と"cylinders"の間のrelationshipがnoncomposite-feature-membrship（白抜きのひし形）に変わります。

![noncomposite](/img/blogs/2026/0129_sysmlv2-tool-syson-partusage/09.png)

戻す場合は、Is Compositeにチェックを付けます。

## UsageにMultiplicityを設定する
”cylinders”のMultiplicityを"4..8"に設定します。

"cylinders"を選択して、F2キーやEditで直接編集できるようにします。
次に、"cylinders"を"cylinders[4..8]"に変更します。
すると、左サイドバーのツリーの"cylinders"内にMultiplicityRangeが追加されます。
MultiplicityRangeの中にはLiteralIntegerが２つあり、１つのValueは”4”、もう１つは"8"が設定されます。

![multiplicity](/img/blogs/2026/0129_sysmlv2-tool-syson-partusage/10.png)

"cylinders"を編集した際、"cylinders[4..8] : ShapeItems::Cylinder"に変わることがあります。
このとき ShapeItems Libraryの"Cylinder"がdefinitionとして選択されている状態になっています。
この場合は以下の手順で修正できます。

1. 右サイドバーのDetailにある Typed byで設定されている"Cylinder"を削除
2. 左サイドバーのツリーにある"cylinders"内の"FeatureTyping"をモデルから削除
3. "cylinders[4..8]"と"Cylinder"の間にdefinitionを再作成

## Part Usage間にsubsettingを作成する
"engine"と"engine4Cyl"の間にsubsettingを作成します。

Part Usageを作成し、名前を"engine4Cyl"に変更します。
”engine4Cyl”を選択して外側に表示された三角（＞）を"engine : Engine"までドラッグ＆ドロップします。
表示されたコンテキストメニューで”New Subsetting”を選択します。

![subsetting contextmenu](/img/blogs/2026/0129_sysmlv2-tool-syson-partusage/11.png)

subsettingは白抜き三角が付いた線であらわします。

![subsetting](/img/blogs/2026/0129_sysmlv2-tool-syson-partusage/12.png)


## Part Usage間にredefinitionを作成する
"cylinders[4]"のPart Usageを作成し、"cylinders[4..8]"との間にredefinitionを作成します。

"cylinders[4]"を選択し、外側に表示された三角（＞）を”cylinders[4..8]”までドラッグ＆ドロップします。
表示されたコンテキストメニューで"New Redifinition"を選択します。

![redifinition contextmenu](/img/blogs/2026/0129_sysmlv2-tool-syson-partusage/13.png)

redefinitionは白抜き三角と１本線が付いた線であらわします。

![redifinition](/img/blogs/2026/0129_sysmlv2-tool-syson-partusage/14.png)

## Viewを完成させる
"cylinder1[1]", "cylinder2[1]", "cylinder3[1]", "cylinder4[1]"の４つのPart Usageを作成します。
作成した４つのPart Usageと"cylinders[4]"の間にsubsettingを作成します。
また、先の４つのPart Usageに加えて、"cylinders[4]"と"engine4Cyl"の間にcomposite-feature-membershipを作成します。

"engine4Cyl"と"cylinders[4]"の間のcomposite-feature-membershipを選択します。
右クリックでコンテキストメニューを表示し、”Show/Hide” > "Hide"を選択します。

”Engine”と"Cylinder"の２つのPart Definitionを（モデルから削除ではなく）ダイアグラムから削除すると、下図のようになります。

![view](/img/blogs/2026/0129_sysmlv2-tool-syson-partusage/15.png)

題材と「全く同じ」とはいきませんが、等価なモデルが作成できました。

## 次回予告
本記事では、Part Usage要素を作成し、構造をモデル化しました。

次回は、振る舞いのモデル要素である Action Definitionと Action Usageを作成します。
