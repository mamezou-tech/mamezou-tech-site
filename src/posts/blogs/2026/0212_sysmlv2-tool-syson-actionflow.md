---
title: 無料のOSSツールSysONで始めるSysMLv2モデリング（６）〜 ActionFlowの作成
author: yasumasa-takahashi
date: 2026-02-12
tags: [SysON,SysMLv2,MBSE,モデリング]
---

前回の記事では、Action Definitionと Action Usageを作成しました。

@[og](/blogs/2026/02/05/sysmlv2-tool-syson-action/)

本記事ではそれらを用いて ActionFlowを作成します。

SysMLv2には標準で Action間の接続を表示するための ActionFlowViewが用意されています。
ActionFlowを作成するにはこの ActionFlowViewを使うのが順当でしょう。
しかし、SysONのドキュメントにある Action Flow Viewのページには「開発中（under development）」とあります。
この連載で使用してきた v2025.8.0はもちろん、執筆時点の最新版である mainでも同様でした。

そこで今回は、要素の Graphical Compartmentに ActionFlowを作成します。
Graphical Compartmentは、Partや Actionの枠内にグラフィカルなビューを表示する区画のことです。

本記事では、主に作成の流れをご紹介します。
要素の追加方法といった操作方法については、本連載のこれまでの記事を参照してください。

## Action Flowを作成する（その１）

"[Introduction to the SysML v2 Language Textual Notation](https://github.com/Systems-Modeling/SysML-v2-Release/blob/2025-12/doc/Intro%20to%20the%20SysML%20v2%20Language-Textual%20Notation.pdf)" スライド30の図を作成してみましょう。

![slide30](/img/blogs/2026/0212_sysmlv2-tool-syson-actionflow/slide30.png)

General Viewを開き、Action Definitionを３つ作成します。
作成した Action Definitionの名前をそれぞれ、"Focus", "Shoot", "TakePicture"に変更します。

![Three action definitions](/img/blogs/2026/0212_sysmlv2-tool-syson-actionflow/01.png)

"TakePicture"に入力と出力の Itemを１つずつ追加します。
入力 Itemの名前を"scene : Scene"に、出力 Itemの名前を"picture : Picture"に変更します。

![Two items in the action](/img/blogs/2026/0212_sysmlv2-tool-syson-actionflow/02.png)

"TakePicture"のManage Visibilityコンテキストメニューを表示し、"action flow"のチェックをONにします。
これにより、"TakePicture"に Action Flow Viewを表示する Graphical Compartmentが表示されます。

![Graphical Compartment in the TakePicture](/img/blogs/2026/0212_sysmlv2-tool-syson-actionflow/03.png)

"TakePicture"にある action flowの区画を右クリックし、コンテキストメニューから Action Usageを２つ作成します。
作成した Action Usageの名前をそれぞれ"focus : Focus"と"shoot : Shoot"に変更します。

![Two Action Usage in the TakePicture](/img/blogs/2026/0212_sysmlv2-tool-syson-actionflow/04.png)

Action Usageの"focus"に入力 Itemと出力 Itemを１つずつ追加します。
入力 Itemの名前を"scene"、出力 Itemの名前を"image"に変更します。

同じように、Action Usageの"shoot"に入力と出力の Itemを１つずつ追加します。
入力 Itemと出力 Itemの名前をそれぞれ"image"と"picture"に変更します。

![Two Action Usage with I/O items](/img/blogs/2026/0212_sysmlv2-tool-syson-actionflow/05.png)

"TakePicture"の入力 Itemである"scene"を選択します。
その外側に表示される"＞"をドラッグし"focus"の入力 Itemでドロップすると、接続の種別を選択するメニューが表示されます。
メニューで"New Binding Connector As Usage (bind)"を選択してください。

![flow context menu](/img/blogs/2026/0212_sysmlv2-tool-syson-actionflow/06.png)

２つの Item間を結ぶ線（コネクタ）が追加されます。
また、このコネクタの近傍に"="が表示されます。
これが Binding Connectionです。

Action Usage"shoot"の出力 Itemと"TakePicture"の出力 Itemである"picture"も同様にコネクタでつなぎましょう。

![Add bind connection](/img/blogs/2026/0212_sysmlv2-tool-syson-actionflow/07.png)

"focus"の出力 Itemと"shoot"の入力 Itemをつなぎます。
この場合もドラッグ＆ドロップで接続の種別を選択するメニューを出しますが、今度はメニューから"New Flow (flow)"を選択します。

片側に矢印の付いた線が追加されます。
これが flow connectionです。

![Add flow connection](/img/blogs/2026/0212_sysmlv2-tool-syson-actionflow/08.png)

不要な要素を非表示にすれば作図終了です。

![slide30 action flow](/img/blogs/2026/0212_sysmlv2-tool-syson-actionflow/09.png)

## Action Flowを作成する（その２）

今回は、もう１つ作図してみます。

"[Intro to the SysML v2 Language-Graphical Notation.pdf](https://github.com/Systems-Modeling/SysML-v2-Release/blob/2025-12/doc/Intro%20to%20the%20SysML%20v2%20Language-Graphical%20Notation.pdf)" スライド58の図です。
分岐やマージなど、いくつかの Control Nodeが使われています。

![slide58](/img/blogs/2026/0212_sysmlv2-tool-syson-actionflow/slide58.png)

General Viewを開き、Action Usageを追加します。
追加した Action Usageの名前を"transportPassenger"に変更します。

"transportPassenger"の Manage Visibilityで"action flow"にチェックを付けます。
表示された action flowの区画に Action Usageを追加していきます。
題材にあわせて11個の Action Usageを追加し、それぞれの名前を変更します。

![11 action usages](/img/blogs/2026/0212_sysmlv2-tool-syson-actionflow/11.png)

action flowの区画を右クリックし、表示されたコンテキストメニューの"Behavior"から必要な Control Nodeを追加します。

![Add control nodes](/img/blogs/2026/0212_sysmlv2-tool-syson-actionflow/12.png)

Decision Nodeや Marge Nodeのサイズを変更したり、Fork Nodeや Join Nodeを縦長に変更できないようです。

Control Nodeや Action Usageを選択した際、外側に表示される"＞"をドラッグ＆ドロップして、Control Nodeや Action Usageをフローで接続します。
接続する際は、コンテキストメニューから”New Transition”を選択します。

![flow context menu](/img/blogs/2026/0212_sysmlv2-tool-syson-actionflow/13.png)

action flowの要素を配置しなおして、フローを記述するところまでは出来ました。

![Action flow with flow connection](/img/blogs/2026/0212_sysmlv2-tool-syson-actionflow/14.png)

あとはガードを付ければ作図終了なのですが、この手順が見つかりませんでした。

## テキスト記法で Action Flowを作成する
テキスト記法を用いれば、ガード条件も追加できます。

SysMLv2仕様書 p.92の表に記載されたテキスト記法を参考に以下を作成しました。
ガードはBooleanでなければならないため、attributeとして追加しました。
terminateは表示されないため、doneに変更しました。

```
action act {
	attribute guard1 : ScalarValues::Boolean;
	attribute guard2 : ScalarValues::Boolean;

	first start;
	then fork fork1;
		then action1;
		then action2;
	action action1;
		then join1;
	action action2;
		then join1;
	join join1;
	then decide decision1;
		if guard2 then action3;
		if guard1 then action4;
	action action3;
		then merge1;
	action action4;
		then merge1;
	merge merge1;
	then done;
}
```

これを SysONに読ませてオブジェクトを生成し、General Viewで表示、整形すると下図のようになります。

![Action flow created by text](/img/blogs/2026/0212_sysmlv2-tool-syson-actionflow/15.png)

## まとめと次回予告
SysMLv2の仕様書には他にも Action Flowの例が載っています。
また、本連載の題材にしているドキュメントにも上記の他に Action Flowが記載されています。
しかし本連載で使用した SysONでは、これらすべての Action Flowをグラフィカル記法で表現することは出来ません。
その一方、GitHubのコミットログをみると、日々 SysONの開発が進められていることがわかります。
Action Flow Viewを含め、今後のリリースに期待しましょう。

次回は、State Definitionと State Usageを作成します。
Stateもまだまだ開発中だと思いますが、どこまで出来るのか試してみましょう。

