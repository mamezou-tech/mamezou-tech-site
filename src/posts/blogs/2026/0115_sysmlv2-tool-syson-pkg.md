---
title: 無料のOSSツールSysONで始めるSysML v2モデリング（２） 〜 Packageの作成
author: yasumasa-takahashi
date: 2026-01-15
tags: [SysON,SysMLv2,MBSE,モデリング]
---

前回の記事「無料のOSSツールSysONで始めるSysML v2モデリング（１） 〜 はじめてのSysON」では、SysONをインストールして Webブラウザでホーム画面を表示しました。

@[og](/blogs/2026/01/08/sysmlv2-tool-syson-intro/)

本記事では、新しいプロジェクトとパッケージを作成してみましょう。  
（本記事で使用する SysONは Release 2025.8.0です）

ホーム画面はプロジェクトブラウザ画面とも呼びます。
プロジェクトブラウザ画面の上側にはプロジェクトを作成するアイコンが並びます。
その下側には既存のプロジェクトのリストが表示されます。

![プロジェクトブラウザ画面](/img/blogs/2026/sysmlv2-tool-syson-pkg/browser.png)

## プロジェクトを作成する
新しい SysMLv2プロジェクトを作るには、"Create a new project"にある左から２番目の"SysMLv2"と記載されたアイコン（SysMLv2テンプレート）を選択します。

選択すると、プロジェクトエディタ画面が表示されます。

エディタ画面は、画面上部の「ツールバー」、左側の「左サイドバー」、右側の「右サイドバー」、左右サイドバーの間にある「エディタ」の４つから構成されます。

![プロジェクトエディタ画面](/img/blogs/2026/sysmlv2-tool-syson-pkg/editor.png)

## プロジェクト名を変更する
プロジェクト名は、ツールバーの中央にある"SysMLv2"です。

まずはプロジェクトの名前を変更しましょう。
ツールバーにあるプロジェクト名横のケバブボタン（︙）をクリックし"Rename"を選択すると、"Rename the project"のダイアログが表示されます。
今回は"SysMLv2.trial"と入力して"RENAME"ボタンを押下します。

![プロジェクト名変更](/img/blogs/2026/sysmlv2-tool-syson-pkg/project.1.png)

## ビューを表示する
左サイドバーのツリーで"General View"を選択すると、エディタに図を描く画面が表示されます。
グラフィカル記法でモデルを作成する場合は、ここに図を描いていきます。

![ビュー](/img/blogs/2026/sysmlv2-tool-syson-pkg/project.2.png)

## ビューを追加する
新たにビューを追加したい場合は、左サイドバーのツリーにあるパッケージなどの要素に付いているケバブアイコン（︙）をクリックします。
表示されたコンテキストメニューから"New representation"を選択するとビューを追加するためのダイアログが表示されます。
このダイアログで名前を入力しビューの種類を指定して"CREATE"ボタンを押すとビューを追加できます。

![ビュー追加ダイアログ](/img/blogs/2026/sysmlv2-tool-syson-pkg/project.3.png)

## プロジェクトブラウザ画面に戻る
プロジェクトブラウザ画面に戻る場合は、画面上部ツールバーの右端にあるハンバーガーボタン（≡）をクリックして"Projects"を選択します。

![ハンバーガーボタン](/img/blogs/2026/sysmlv2-tool-syson-pkg/hamburger.png)

ツールバーの左端にある立方体のアイコンをクリックしても、プロジェクトブラウザ画面に戻ります。

## 新規のPackage要素を作成する
最初に Packageを作成してみます。

中央のエディタで空きスペースを右クリックすると、図に配置できる要素のカテゴリ一覧がコンテキストメニューに表示されます。

![エディタコンテキストメニュー](/img/blogs/2026/sysmlv2-tool-syson-pkg/package.01.png)

"Structure"を選択すると、コンテキストメニューの表示が図に配置できる"Structure"の要素の一覧に切り替わるので、"New Package"を選択します。

![パッケージ追加コンテキストメニュー](/img/blogs/2026/sysmlv2-tool-syson-pkg/package.02.png)

すると、エディタに Package要素が表示され、左サイドバーのツリーに Package要素が追加されます。
このとき、左サイドバーのツリーをみると、新しく追加した"Package1"は"General View"がある"Package1"の中に追加されていることがわかります。
右サイドツリーの"Details"にある"Declared Name"にも"Package1"と記載されています。

![パッケージとエディタ画面](/img/blogs/2026/sysmlv2-tool-syson-pkg/package.03.png)

ここでもうひとつ、”Package1”を作成したのと同じ手順で"Package2"を追加します。

次は、左サイドバーのツリーにある"Package2"をツリーにある"Package1"の中にドラッグ＆ドロップで移動します。
その後、"Package1"を右クリックしてコンテキストメニューを表示します。

表示されたコンテキストメニューから "Related Elements" > "Add existing nested elements"を選択します。
すると、"Package1"の中に"Package2"が表示されます。

![パッケージの入れ子](/img/blogs/2026/sysmlv2-tool-syson-pkg/package.04.png)

このとき、"Package1"の外に表示されている"Package2"に変化はありません。

SysMLv2仕様をみると、"Package1"と"Package2"の間に owned-membershipを表示するのがよさそうです。
今後のリリースで owned-membershipを表示するように変更されるかもしれません。

## Packageをビューから削除する
"General View"には"Package2"が２つ表示されています。
このうち"Package1"の外にある"Package2"をビューから削除します。

"Package2"を選択した状態で右クリックしてコンテキストメニューを表示します。
コンテキストメニューの上部に並んでいるアイコンの中で左から４つ目にある四角に斜線が入ったアイコンをクリックします。

![非表示とコンテキストメニュー](/img/blogs/2026/sysmlv2-tool-syson-pkg/package.05.png)

"Package2"はビューから削除されますが、左サイドバーのツリーには"Package2"が残っています。

## Packageをビューに配置する
左サイドバーのツリーの"Package2"をエディタにドラッグ＆ドロップしてください。

ふたたび、ビューに"Package2"が表示されます。

![パッケージをビューに配置](/img/blogs/2026/sysmlv2-tool-syson-pkg/package.06.png)

## PackageをImportする
左サイドバーのツリーでPackage右側のケバブアイコン（︙）をクリックします。
表示されたコンテキストメニューの"New object"を選択すると"Create a new object"のダイアログが表示されます。
ダイアログの"Object type"で"Namespace Import"を選択します。

![Namespace Import](/img/blogs/2026/sysmlv2-tool-syson-pkg/package.07.png)

すると、ツリーで先に選択したPackageの中に”Namespace Import”が追加されます。
追加された”Namespace Import”を選択すると右サイドバーの"Details"にその詳細が表示されます。
左サイドバーに表示される"Datails"の"Imported Namespace"でImportするPackageを選択するとImportの設定は完了です。

![ImportされるPackageの設定](/img/blogs/2026/sysmlv2-tool-syson-pkg/package.08.png)

図のPackageを右クリックし、コンテキストメニューから "Related Elements" > "Add existing nested elements"を選択します。
Packageの中に表示された点線のPackageがImportをあらわします。

![Importと可視性](/img/blogs/2026/sysmlv2-tool-syson-pkg/package.09.png)

左サイドバーの"Details"にある"Visibility"でImportされたPackageの可視性を変更できます。

## Packageをモデルから削除する
"Package1"をモデルから削除します。

"Package2"をビューから削除したのと同様の手順でコンテキストメニューを表示します。
表示したコンテキストメニュー上部のアイコンの中で、今度は左から２つ目にあるゴミ箱アイコンをクリックします。

![削除とコンテキストメニュー](/img/blogs/2026/sysmlv2-tool-syson-pkg/package.10.png)

すると、削除してよいかを確認するダイアログが表示されます。

![削除時警告ダイアログ](/img/blogs/2026/sysmlv2-tool-syson-pkg/package.11.png)

”DELETE”ボタンを押下すると"Package1"の中にあった"Package2"ごと左サイドバーのツリーから削除され、"Package1"と"Package2"がビューから消えます。

## テキスト記法を用いたPackageの追加
SysONは SysML v2の特徴であるテキスト記法を扱うこともできます。

左サイドバーのツリーで、"Package1"の右にあるケバブアイコン（︙）をクリックして、表示されたメニューから"New objects from text"を選択します。
すると、上部に"Enter or paste SysMLv2 text to create new objects in the model"と記載されたダイアログが表示されます。

![テキスト入力ダイアログ](/img/blogs/2026/sysmlv2-tool-syson-pkg/package.12.png)

ダイアログに以下を入力して"CREATE OBJECTS"のボタンを押下します。

```
package Package2 {
	package 'Package 3' {
	}
}
package 'パッケージ' {
}
```

左サイドバーのツリーに"Package2", "Package3", "パッケージ"の３つのパッケージが追加されます。
続けて追加しない場合は"CLOSE"ボタンでダイアログを閉じます。

![ツリー](/img/blogs/2026/sysmlv2-tool-syson-pkg/package.13.png)

テキスト記法では、パッケージ名をシングルクオート（'）で囲むと日本語や半角スペースを入れた文字列を使うことができます。

## 次回予告
本記事では、新しいプロジェクトを作成し、パッケージを追加しました。

次回は Part Definition要素を作成します。
