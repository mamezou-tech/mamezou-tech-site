---
title: QtWidgets vs QtQuick
author: kazuki-ogawa
date: 2023-09-30
tags: [gui, qt, 画面開発]
---

ロボットシステムを構成する機器としてティーチングペンダントは欠かせない存在です。  
弊社ではティーチングペンダントのGUI開発フレームワークとして[Qt](https://www.qt.io/ja-jp/)を採用することが多いです。  
Qtは[QtWidgets](https://doc.qt.io/qt-6/QtWidgets-index.html)と[QtQuick](https://doc.qt.io/qt-6/qtquick-index.html)という2つのユーザインタフェースを提供しており、GUI開発を担当する身としては、どちらを採用するかたびたび悩まされます。  
今回はそんなQtWidgetsとQtQuickを比較していきたいと思います。  

# QtWidgetsの概要
## QtWidgetsとは何か
QtWidgetsは、クラシックなデスクトップスタイルのユーザインタフェースを提供するフレームワークです。ウィジェットはGUIコンポーネント（ボタン、ウィンドウ、テキストボックスなど）を表し、これらのウィジェットを組み合わせてアプリケーションを作成します。  

![](/img/robotics/gui/qt_basic_layout.png)

## QtWidgetsの特徴と利点
- ネイティブな外観と操作性
  - QtWidgetsで作成されるアプリケーションはユーザになじみのある、ネイティブなウィンドウと操作を提供します。
- レガシーコードとの互換性
  - 既存のQtWidgetsアプリケーションを簡単に移植および拡張できます。
- プラグインと拡張性
  - QtWidgetsはプラグインベースのアーキテクチャを採用しており、独自のカスタムウィジェットを作成できます。

# QtQuickの概要
## QtQuickとは何か
QtQuickはモダンなUI設計を可能にするフレームワークで、QMLというCSSに似たシンタックスを持つ言語を使用します。  
QtQuickはアニメーション、トランジション、視覚効果といった豊富なUXを提供します。

![](/img/robotics/gui/qt_to_do_list.png)


## QtQuickの特徴と利点
- モダンなユーザーインターフェースの設計
  - QtQuickは現代的なユーザインタフェースを設計するためのツールと機能を提供します。
- アニメーションとデザインの自由度
  - QMLによりアニメーションやトランジションを直感的に設定できます。
- JavaScriptとの統合
  - QtQuickアプリケーションはJavaScriptコードと統合でき、動的なUIを作成できます。

# QtWidgetsとQtQuickの比較
簡単なアプリケーションをQtWidgetsとQtQuickで作成し、比較します。
ボタン押下で、テキストエリアの文字をラベルに反映してアニメーションするアプリケーションを作成しました。

![](/img/robotics/gui/qt_sample_app.gif)


## ユーザーインターフェースの設計と開発
それぞれのUI開発方法について紹介します。  
  
### QtWidgets
QtWidgetsでUIを作成するには[Qt Designer](https://doc.qt.io/qt-6/qtdesigner-manual.html)を利用します。
ウィジットをウィンドウにドラッグアンドドロップで配置でき、簡単にUIを作成できます。
![](/img/robotics/gui/qt_ui_designer.png)

作成したUIはxml形式のui拡張子のファイルとして自動生成されます。
![](/img/robotics/gui/qt_ui_file.png)

また、このファイルは直接編集不可となっています。
![](/img/robotics/gui/qt_unable_to_edit.png)

### QtQuick
QtQuickでUIを作成するにはQMLファイルを編集します。
オブジェクトの型宣言の後に波括弧が続き、波括弧内にオブジェクトのプロパティを宣言できます。
![](/img/robotics/gui/qt_qml_file.png)

QMLの学習難度は高くないですが、QtWidgetsはノーコードでUIを生成できるため、初心者でも簡単です。
リッチなUI機能を必要としないシンプルな画面生成においてはQtWidgetsが良いと考えます。

:::column:QtQuickデザイナ
QtQuickもQtQuitckデザイナを利用することでドラッグアンドドロップの編集は可能です。
しかし、QtWidgetsのフォームデザイナに比べて処理が遅く、使い勝手はあまり良くないです。

![](/img/robotics/gui/qt_quick_designer.png)

:::

## アニメーションの作成と保守性
各フレームワークで作成したアプリケーションのコードを比較します。
アニメーションの作成方法について紹介します。

### QtWidgets
QtWidgetsはuiファイルで宣言したウィジット要素をC++のコードで参照し、アニメーションを記述します。
このコードではQtの特徴的な要素といえるシグナルスロットの仕組みを用いて、アニメーションを実行するコードとなっています。

**MainWindow.cpp**
```cpp
#include "mainwindow.h"
#include "ui_mainwindow.h"

MainWindow::MainWindow(QWidget *parent)
    : QMainWindow(parent)
    , ui(new Ui::MainWindow)
{
    ui->setupUi(this);

    lineEdit = findChild<QLineEdit*>("lineEdit");
    pushButton = findChild<QPushButton*>("pushButton");
    label = findChild<QLabel*>("label");

    setBaseSize(400, 200);

    animation = new QPropertyAnimation(label, "geometry");
    animation->setDuration(2000);

    connect(pushButton, &QPushButton::clicked, this, &MainWindow::startAnimation); // ボタン押下でアニメーションスタート
}

MainWindow::~MainWindow()
{
    delete ui;
}

void MainWindow::startAnimation()
{
    QString text = lineEdit->text();
    label->setText(text);

    int labelWidth = label->fontMetrics().boundingRect(text).width();

    animation->setStartValue(QRect(0, 0, labelWidth, label->height()));
    animation->setEndValue(QRect(400, 0, labelWidth, label->height()));
    animation->start();
}

```

### QtQuick
QtQuickではタイプを宣言したQMLのファイル内にアニメーションも記述します。
このコードではButtonタイプのクリックシグナルを受信するonClickedハンドラーの宣言内にクリック時の挙動を記述します。

**Main.qml**
```js
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ApplicationWindow {
    visible: true
    width: 400
    height: 200
    title: "MainWindow"

    ColumnLayout {
        anchors.fill: parent

        Label {
            id: label
            text: "TextLabel"
            Layout.leftMargin: 10
            PropertyAnimation {
                id:animation
                duration: 2000
            }
        }

        TextField {
            id: textField
            text: "Mamezou"
            Layout.fillWidth: true
            Layout.leftMargin: 10
            Layout.rightMargin: 10
        }

        Button {
            text: "pushButton"
            Layout.fillWidth: true
            Layout.leftMargin: 10
            Layout.rightMargin: 10
            onClicked: { // ボタン押下時の処理
                label.text = textField.text;
                animation.target = label;
                animation.property = "x";
                animation.from = -label.x;
                animation.to = 400;
                animation.start();
            }
        }
    }
}

```

QtWidgetsはUIとプレゼンテーションロジックを分けて記述できますが、UIファイルの可読性が低いです。
また、UIファイルを編集するためにはQtDesginerが必須となります。
QtQuickはUIとプレゼンテーションロジックが共存しているため、コード内参照はしやすいです。
ただし、複雑になる可能性があるため、コード設計に気を遣う必要があります。

## カスタムコンポーネントの作成と拡張性
同じ機能を持つカスタムコンポーネントをそれぞれ作成します。  
今回はテキストエリアに入力履歴の機能を追加しました。

![](/img/robotics/gui/qt_input_history.gif)

### QtWidgets
まずは新しいファイルを追加するウィザードからC++のクラスを選択します。

![](/img/robotics/gui/qt_create_file_wizard.png)

作成するカスタムウィジェットの名前を入力し、基底クラスとしてQWidgetを指定します。

![](/img/robotics/gui/qt_define_class.png)

QLineEditを継承した入力履歴機能を持つCustomLineEditを実装します。

**CustomLineEdit.h**
```cpp
#ifndef CUSTOMLINEEDIT_H
#define CUSTOMLINEEDIT_H

#include <QLineEdit>
#include <QKeyEvent>
#include <QVector>

class CustomLineEdit : public QLineEdit
{
    Q_OBJECT

public:
    CustomLineEdit(QWidget *parent = nullptr);

protected:
    void keyPressEvent(QKeyEvent *event) override;

private:
    QVector<QString> inputHistory;
    int historyIndex;

    void updateHistory();
};

#endif // CUSTOMLINEEDIT_H

```

**CustomLineEdit.cpp**
```cpp
#include "CustomLineEdit.h"

CustomLineEdit::CustomLineEdit(QWidget *parent)
    : QLineEdit(parent), historyIndex(-1)
{
    connect(this, &QLineEdit::returnPressed, this, &CustomLineEdit::updateHistory);
}

void CustomLineEdit::keyPressEvent(QKeyEvent *event)
{
    if (event->key() == Qt::Key_Up) {
        if (historyIndex >= 0 && historyIndex < inputHistory.size()) {
            setText(inputHistory[historyIndex]);
            historyIndex--;
        }
    } else if (event->key() == Qt::Key_Down) {
        if (historyIndex >= -1 && historyIndex < inputHistory.size() - 1) {
            historyIndex++;
            setText(inputHistory[historyIndex]);
        } else if (historyIndex == inputHistory.size() - 1) {
            historyIndex = -1;
            clear();
        }
    } else {
        QLineEdit::keyPressEvent(event);
    }
}

void CustomLineEdit::updateHistory()
{
    const QString currentText = text().trimmed();
    if (!currentText.isEmpty()) {
        if (inputHistory.isEmpty() || inputHistory.last() != currentText) {
            inputHistory.append(currentText);
        }
        historyIndex = inputHistory.size() - 1;
    }
}

```

デザイナに戻り、lineEditを右クリックから「格上げ先を指定...」を選択します。
![](/img/robotics/gui/qt_promote_widget.png)

作成したカスタムウィジェットのファイル名を入力し、追加し、格上げします。
![](/img/robotics/gui/qt_promote_wizard.png)

uiファイルにQLineEditを拡張したCustomLineEditが定義されていることがわかります。
![](/img/robotics/gui/qt_promote_result.png)


:::column:カスタムウィジェットプロジェクト
今回は格上げによって、カスタムウィジェットを実現しました。
他にもカスタムウィジェットのプロジェクトを作成、実装することでカスタムウィジェットをドロップダウンリストに追加できます。

![](/img/robotics/gui/qt_add_widget.png)

:::

### QtQuick
まずは新しいファイルを追加するウィザードからqmlファイルを選択します。

![](/img/robotics/gui/qt_create_qml_file.png)

作成するカスタムQMLタイプの名前を入力し、作成します。

![](/img/robotics/gui/qt_create_custom_qml.png)

TextFiledを拡張し、カスタムQMLタイプを実装します。

**CustomTextFiled.qml**
```js
import QtQuick 2.15
import QtQuick.Controls 2.15

TextField {
    property var inputHistory: []
    property int historyIndex: -1

    Keys.onReleased: {
        if (event.key === Qt.Key_Up) {
            if (historyIndex >= 0) {
                text = inputHistory[historyIndex];
                if (historyIndex > 0) historyIndex--;
            }
        } else if (event.key === Qt.Key_Down) {
            if (historyIndex < inputHistory.length - 1) {
                historyIndex++;
                text = inputHistory[historyIndex];
            } else if (historyIndex === inputHistory.length - 1) {
                historyIndex = -1;
                text = "";
            }
        } else if (event.key === Qt.Key_Return || event.key === Qt.Key_Enter) {
            if (text.trim() !== "") {
                if (inputHistory.length === 0 || inputHistory[inputHistory.length - 1] !== text) {
                    inputHistory.push(text);
                    historyIndex = inputHistory.length - 1;
                }
            }
        }
    }
}
```

実装したカスタムコンポーネントをTextFieldと差し替えます。

**Main.qml**
```js
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ApplicationWindow {
    visible: true
    width: 400
    height: 200
    title: "MainWindow"

    ColumnLayout {
        anchors.fill: parent

        Label {
            id: label
            text: "TextLabel"
            Layout.leftMargin: 10
            PropertyAnimation {
                id:animation
                duration: 2000
            }
        }

        CustomTextField {
            id: textField
            text: "12345"
            Layout.fillWidth: true
            Layout.leftMargin: 10
            Layout.rightMargin: 10
        }

        Button {
            text: "pushButton"
            Layout.fillWidth: true
            Layout.leftMargin: 10
            Layout.rightMargin: 10
            onClicked: {
                label.text = textField.text;
                animation.target = label;
                animation.property = "x";
                animation.from = -label.x;
                animation.to = 400;
                animation.start();
            }
        }
    }
}

```

どちらも再利用性のあるコンポーネントを作成でき、手順も簡便です。
拡張のしやすさに大きな差がつくとは言えません。

簡単なアプリケーションを作成し、コードやツールを通して比較しましが、組み込み系でC++を扱う方であればQtWidgetsのほうが使いやすい印象を持つのではないかと思います。
またQMLはデザイナがあるものの使い勝手が良くなく手書きとなり、開発コストがかさむ要因になりえます。

# 結局どちらを採用するか
さて、この記事を書くにあたって資料をあさっていたのですが、その矢先にQtWidgetsとQtQuickを比較する[Qt公式のビデオ](https://www.qt.io/resources/videos/qt-widgets-or-qt-quick)を発見してしまい、意気消沈しました。
他にも調べると比較記事やブログは結構出てきます。
そして結論（極論）は出ています。
「クラシックならQtWidgets、モダンならQtQuick、お客さんの要望に合わせて選んでください。」

はい、終わりとはさすがに行きません。

タイトル詐欺になってしまい申し訳ございませんが、ここからが本題です。
ロボット開発に携わっている、いちGUI開発者としての肌感をお伝えできればと思います。

## ティーチングは熟練技
ティーチングペンダントはロボットシステムを構成する1つの機器にすぎません。  
画面の仕様を理解したからといってロボットはうまく動いてくれません。  
ロボット工学、座標系、安全管理など前提とする知識が多いです。
また、ロボットの具備する機能が多く、マニュアルを読み始めたら日が暮れてしまいます。
ゆえに初学者がティーチングできるようになるにはかなりの時間、教育が必要になります。
そこでユーザー企業はティーチングマンを外注するわけです。

自身が携わった案件で展示会用にティーチングを行っていた際、大変だった記憶から当時見ていた記事で印象に残っているものを紹介します。
[ティーチングマンが足りない？ロボット導入後の落とし穴とは？](https://linkwiz.co.jp/topics/column/teachingman_20200306/)

## ティーチングペンダントからの脱却
もっと簡単にティーチングを行いたい。
そんな要望からセンサや画像処理を用いたロボットの制御、ダイレクトティーチングなどが実現されています。
はたまた自然言語によってロボットを制御するなど、AIの活用は避けては通れないでしょう。
[PaLM-E: An Embodied Multimodal Language Model](https://palm-e.github.io/)

ただ、それらのセンサや認識する物体の設定はどこから行うのでしょうか。
ダイレクトティーチングで調整しきれない数mmはどうやって動かすのでしょうか。
ロボット導入済の企業にAIは現状必要なのでしょうか。

やはり人間とロボットをつなぐインターフェースとしてティーチングペンダントは切っても切れないのです。

## わかりやすい画面を
ティーチングペンダントに求める一番の要望は「わかりやすい画面を」です。
ロボット開発を依頼する企業の多くは現状のティーチングペンダントに不満を抱いており、「画面がわかりづらい」、「初学者でもわかりやすい画面が良い」という要望はやみません。
ここでいう、わかりにくい画面というのはQtWidgetsで実装されそうな古き良きUIであることが多いです。
ロボットの展示会に行っても、そういった声を形にしたスマホライクなUIを開発しているロボットベンダーをよく見かけます。
今後はさらにデジタルネイティブ、Z世代が企業の中心的存在となったとき、クラシックなUIは淘汰されていくのでしょうか。

## わかりやすさの限界
わかりやすさを求めた先にある問題と突き当ります。
いつの間にか、UIのわかりやすさを実現するために、ロボットが具備する機能を制限しているのです。
[ティーチングは熟練技](#ティーチングは熟練技)に示したようにロボットを動かすには知識と機能の理解が必要です。
初学者が簡単にロボットを動かせるという本質はUIのわかりやすさよりも機能の制限によって実現されていることが多いです。
わかりやすいUIというのは目に入る情報量を減らしたり、直感的な理解のために文字よりジェスチャーやアニメーションを多く取り入れます。
必然的に限られたティーチングペンダントのスペースには機能を削った、幅を取る視覚的にわかりやすい情報だけが残るのです。

## ユーザとともに成長するUI
今回QtWidgetsとQtQuickを比較して、「クラシックならQtWidgets、モダンならQtQuick」という結論はあまりにも横暴なことに気が付きます。
現在ロボットベンダーの中には、スマホライクなUIを提供しつつ、以前のUIにも切り替えられるように「初学者用UI」、「熟練者用UI」を用意してわかりやすさの限界に対応しています。
目指すべきティーチングペンダントのUIは「初学者用UI」から「熟練者用UI」の中間をいくつか用意し、ユーザの熟練度に応じて段階的にUIも成長していくものが良いと考えています。
自転車がギアを徐々にあげてスピードを出すように、ユーザとともに成長するUIを実現できたら面白いのではないかと思っています。

## 結論
技術的にQtWidgetsとQtQuickの共存は可能ですが、1つに絞るのであればQtQuickを選択するかと思います。
この結論はあくまでもユーザとともに成長するUIを実現する場合に限るものです。
用途要件に合わせて選択されるべきであり、どちらか一方のフレームワークを推奨するものではありません。

以上、お疲れ様でした。