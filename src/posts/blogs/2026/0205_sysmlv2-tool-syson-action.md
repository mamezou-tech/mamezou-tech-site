---
title: 無料のOSSツールSysONで始めるSysMLv2モデリング（５）〜 Actionの作成
author: yasumasa-takahashi
date: 2026-02-05
tags: [SysON,SysMLv2,MBSE,モデリング]
---

これまでの記事では、Part Definitionと Part Usage、Packageの作成をご紹介しました。

@[og](/blogs/2026/01/29/sysmlv2-tool-syson-partusage/)

本記事から振る舞いのモデリングを行います。

執筆時点における SysONの安定版は v2025.12.0が最新ですが、本記事では引き続き v2025.8.0を使用します。
ざっとドキュメントを見る限りでは、v2025.8.0と v2025.12.0の間に大きな機能追加はなさそうです。
ただし、今後を含めた最新リリースの挙動は一部異なる可能性がありますのでご了承ください。

## Parameterを持つAction Definitionを作成する
"[Intro to the SysML v2 Language-Graphical Notation.pdf](https://github.com/Systems-Modeling/SysML-v2-Release/blob/2025-12/doc/Intro%20to%20the%20SysML%20v2%20Language-Graphical%20Notation.pdf)" スライド50の図を作成してみましょう。

![](/img/blogs/2026/0205_sysmlv2-tool-syson-action/slide-50.png)

General Viewを開き、エディタ画面を右クリックでしてンテキストメニューから"Behavior" > "New Action Definition"を選択します。

![New Action Definition](/img/blogs/2026/0205_sysmlv2-tool-syson-action/01.png)

作成した Action Definitionの名前を"ProvidePower"に変更しましょう。
変更方法は以前の記事を参照してください。

次にParameterを追加します。

"ProvidePower"を右クリックしてコンテキストメニューから"Structure" > "New Item In"を選択します。

![New Item In](/img/blogs/2026/0205_sysmlv2-tool-syson-action/02.png)

追加された Itemを"pwrCmd : PwrCmd"に変更します。
このとき、左サイドバーのツリーに"PwrCmd"が追加されたことに着目してください。
これは、"pwrCmd"のItem Definitionです。
ツリーにある"PwrCmd"をエディタ画面にドラッグ＆ドロップしたら"pwrCmd"との間に definitionが表示されます。

![](/img/blogs/2026/0205_sysmlv2-tool-syson-action/03.png)

再び "ProvidePower"を選択し、名前の右にマウスカーソルを移動すると表示される目のアイコンをクリックします。
表示された"Manage Visibility"のコンテキストメニューで、"parameters"のチェックをON、"pwrCmd : PwrCmd"のチェックをOFFにします。

![](/img/blogs/2026/0205_sysmlv2-tool-syson-action/04.png)

pwrCmdのitemを（モデルではなく）図から削除します。

![](/img/blogs/2026/0205_sysmlv2-tool-syson-action/05.png)

同様の方法で、"torque : Torque"を追加しましょう。
”pwrCmd : PwrCmd”の場合と同様、左サイドバーのツリーに"Torque"が追加されます。

Parameterのin, out, inout, noneは、右サイドバーのDetailsにある"Direction"のラジオボタンで変更できます。

題材は"torque"が配列になっています。
"torque : Torque"を"torque[\*] : Torque"に変更してください。
右サイドバーのツリーの"torque"に"LiteralInfinity"の入った"MultiplicityRange"が追加されます。

![](/img/blogs/2026/0205_sysmlv2-tool-syson-action/06.png)

題材では"torque : Torque [\*]"となっていますが、v2025.8.0のSysONではこの表記だと多重度が無視されてしまいました。

## Action DefinitionからAction Usageを作成する
エディタ画面を右クリックでコンテキストメニューから"Behavior" > "New Action"を選択します。
作成した Action Usageの名前を"providePower"に変更しましょう。

![](/img/blogs/2026/0205_sysmlv2-tool-syson-action/07.png)

"providePower"を選択し、要素４辺の外側に表示された"＞"を"ProvidePower"までドラッグ＆ドロップします。
表示されたコンテキストメニューから"New Feature Typing"を選択します。

![](/img/blogs/2026/0205_sysmlv2-tool-syson-action/08.png)

Action DefinitionにParameterを追加したのと同様にして、Action Usageである"providePower"にもItemを追加します。

![](/img/blogs/2026/0205_sysmlv2-tool-syson-action/09.png)

"Manage Visibility"で"item1In"を非表示にし、"item1In"を"fuelCmd : FuelCmd :>> pwrCmd"に変更します。

![](/img/blogs/2026/0205_sysmlv2-tool-syson-action/10.png)

見た目にはいくつか差異がありますが、意味的には同じものが出来ました。

## Action UsageのDecomposition
"[Intro to the SysML v2 Language-Graphical Notation.pdf](https://github.com/Systems-Modeling/SysML-v2-Release/blob/2025-12/doc/Intro%20to%20the%20SysML%20v2%20Language-Graphical%20Notation.pdf)" スライド51の図を作成してみましょう。

![](/img/blogs/2026/0205_sysmlv2-tool-syson-action/slide-51.png)

4つのAction Usage("generateTorque", "amplifyTorque", "distributeTorque", "transferTorque")を作成します。

![](/img/blogs/2026/0205_sysmlv2-tool-syson-action/11.png)

Action Usageの Decompositionはエディタ画面で作図できませんでした。
（今後はできるようになるかもしれません）

左サイドバーのツリーで先程作成した4つのAction Usageを選択し、"providePower"にドラッグ＆ドロップします。
すると、ドラッグ＆ドロップした4つのAction Usageと"providePower"間にDecompositionが表示されます。

![](/img/blogs/2026/0205_sysmlv2-tool-syson-action/12.png)

referenceにしたい場合は、対象のAction Usageを選択します。
右サイドバーで"Advance"タグを選択し、"Is Composite"のチェックをOFFにします。
対象のAction Usageのステレオタイプが"action"から"ref action"に変わり、"providePower"側の黒塗りひし形が白塗りに変わります。

![](/img/blogs/2026/0205_sysmlv2-tool-syson-action/13.png)

## Action DefinitionとAction UsageのDecompsition
SysMLv2仕様では、Action UsageをAction Definitionの部品とすることも出来ます。

先程のスライド51の図の、"providePower"をAction Definitionである"ProvidePower"に変更してみましょう。

左サイドバーのツリーにある"ProvidePower"をエディタ画面にドラッグ＆ドロップします。
次に、左サイドバーのツリーで"provodePower"内にあった４つのAction Usageを"ProvidePower"に移動します。
"Manage Visibility"でポートをダイアグラムから削除すると下図のようになります。

![](/img/blogs/2026/0205_sysmlv2-tool-syson-action/14.png)

## SysON起動時にエラーした場合の対応

これまで何度か SysONの起動と終了を繰り返してきました。
その中で、SysON起動時にエラーが発生して起動しないケースが偶に発生します。
こんな時は以下のコマンドでDockerの使われていないリソースを削除してみてください。

```bash
docker system prune
```

削除後に再度 Dockerで SysONを起動します。

## 次回予告
本記事では、Action Definitionと Action Usageを作成しました。
また、Decompositionで Actionを分割することをモデルで表現しました。

次回は、Action Usageをつなげて Action Flowを作成します。
