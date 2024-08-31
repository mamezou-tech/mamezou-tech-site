---
title: PythonからPowerPointのスライドショーのイベント処理をする
author: kotaro-miura
date: 2024-09-02
tags:  [Python,tips,pywin32]
image: true
---

# はじめに

最近、私が所属するデジタル戦略支援事業部で[AI博覧会](https://aismiley.co.jp/ai_hakurankai/2024_summer_visitor/)というイベントに出展しておりました。
私は弊社の出展ブースでディスプレイに流すPowerPointの準備をしていたのですが、スライドショーのページが切り替わるたびロボットにスライド内容を話してもらうことになりました。
（来場していただいた方には「あーあれか」と分かってもらえると思います）
その中でPythonでPowerPointのイベント処理をするプログラムを実装したので、勉強したこと等含めてまとめさせていただきたいと思います。


# サンプルコード

さっそくですが、今回実装したプログラムについての説明です。

PowerPointのスライドショー表示において、以下のタイミングで標準出力にメッセージが表示されるプログラムとなります。

- スライドショーが始まったとき：「SlideShow Started」
- スライドショーを終了したとき：「SlideShow Ended」
- スライドショーのページが切り替わったとき：「Slide Changed: {切り替え後のスライド番号}, Notes: {切り替え後のスライドのノート内容}」

実装には[`pywin32`](https://pypi.org/project/pywin32/)というPythonライブラリを利用します。
このライブラリによってPythonからWin32 APIを呼び出せるようになります。

:::info:動作環境
動作環境OSはWindowsを前提としています。
:::

最初に`pywin32`を以下のコマンドでインストールしてください。

```sh
pip install pywin32
```

実装コードは以下です。

```python
import pythoncom
import win32com.client
from time import sleep

class PowerPointEventHandler:
    def __init__(self):
        self.current_slide_index = None

    def OnSlideShowBegin(self, Wn):
        print("SlideShow Started")
        self.current_slide_index = None

    def OnSlideShowEnd(self, Pres):
        print("SlideShow Ended")
        self.current_slide_index = None

    def send_slide_info(self, Wn):
        slide_index = Wn.View.CurrentShowPosition
        if slide_index > 0 and slide_index != self.current_slide_index:
            self.current_slide_index = slide_index
            print(slide_index)
            slide = Wn.Presentation.Slides(slide_index)
            try:
                notes_text = slide.NotesPage.Shapes.Placeholders(2).TextFrame.TextRange.Text
            except Exception as e:
                notes_text = f"No notes, error: {e}"
            message = f"Slide Changed: {slide_index}, Notes: {notes_text}"
            print(message)

def main():
    powerpoint = win32com.client.DispatchWithEvents("PowerPoint.Application", PowerPointEventHandler)
    print("Monitoring PowerPoint events...")

    event_handler = PowerPointEventHandler()

    while True:
        pythoncom.PumpWaitingMessages()
        try:
            slide_show_windows = powerpoint.SlideShowWindows
            if slide_show_windows.Count > 0:
                slide_show_window = slide_show_windows(1)
                event_handler.send_slide_info(slide_show_window)
            else:
                event_handler.__init__()
        except Exception as e:
            print(f"Error: {e}")
        sleep(0.5)

if __name__ == "__main__":
    main()
```

# 解説

上記のコードについて、とくに`pywin32`を用いた主要な処理について説明をしていきたいと思います。

Win32 APIやCOMについて何も知らない状態から勉強したので、まとめている内容に間違いがあるかもしれませんが参考程度にお読みいただけると幸いです。

## インポートモジュールについて

- `pythoncom` : OLE(Object Linking and Embedding)オートメーションAPIを利用するためのモジュールです[^pythoncom]。今回のプログラムでは発生したイベントの処理実行するために使います。
- `win32com.client` : COMクライエントを作成・利用するためのモジュールです[^win32comclient]。COMはOLEの基盤技術であり、COMクライアントからOLEのイベントをハンドリングできます。今回のプログラムではPowerPointのイベントハンドリングするCOMオブジェクトを作成するために使います。

[^pythoncom]:pythoncomモジュールドキュメント：[Module pythoncom](https://mhammond.github.io/pywin32/pythoncom.html)
[^win32comclient]:win32comモジュールドキュメン[github-pywin32/com/win32com/readme.html](https://github.com/mhammond/pywin32/blob/main/com/win32com/readme.html)

## `PowerPointEventHandler`クラス

このクラスはPowerPointのイベントをハンドリングするためのものです。特にスライドショーの開始、終了、ページ変更に関連するイベントを処理します。


- `OnSlideShowBegin`: スライドショーが開始した際に呼び出されるイベントハンドラメソッドです。
- `OnSlideShowEnd`: スライドショーが終了した際に呼び出されるイベントハンドラメソッドです。
- `send_slide_info`: 現在表示されているスライドの情報を取得して出力します。スライドのインデックスを取得し、前回のスライドと異なる場合にそのスライド番号とノートの内容を表示します。
（とある事情により上記2つのイベントハンドラとは違ってmain関数上で明示的な呼び出しをします。事情に関しては下記。）

イベントハンドラとするメソッド名にはルールがあり、処理したいイベント名の先頭に`On`を付けた名前にする必要があります。
今回の最初2つのハンドラのメソッド名もそれに倣い、`PowerPoint.Application`オブジェクトが持つイベント名の先頭に`On`を付けた名前としています。

`PowerPoint.Application`オブジェクトに他にもどんなイベントがあるか、イベントの引数名やデータ型は何かなどの仕様を以下ページから確認できます。

[アプリケーション オブジェクト (PowerPoint)#イベント](https://learn.microsoft.com/ja-jp/office/vba/api/powerpoint.application#events)

:::alert:ページ切り替えイベントハンドラを用いなかった理由
スライドショーのページ切り替えイベントとして`SlideShowNextSlide`が存在しておりますが今回は利用しませんでした。
というのもこのイベントを利用したとき、キーボードやマウスを使って手動でページ切り替えしたときには正常に反応したのですが、自動再生機能を使ってスライドショーをページ切り替えする場合に反応しなかったためです。
環境要因もあるかもしないのですが原因が特定できず、イベントハンドリング方式ではなく表示中のページ位置をポーリングしてページ切り替えを検知する方式で実装することにしました。
:::

:::column
リンク先としてOffice VBAの仕様を紹介しました通り、win32comについて欲しい情報が見つからない時、VBAについての情報がよく参考になります。
:::

## `main`関数

-  ```python
    powerpoint = win32com.client.DispatchWithEvents("PowerPoint.Application", PowerPointEventHandler)
    ```

このコードでは`PowerPoint.Application`オブジェクトを作成し、`PowerPointEventHandler`をイベントハンドラとして登録します。これにより、起動中のPowerPointでイベントが発生すると、このクラスの対応するメソッドが呼び出されるようになります。[^DispatchWithEvents]

[^DispatchWithEvents]:詳細はこのメソッドのdocstringが参考になります。[ソースコード-DispatchWithEvents](https://github.com/mhammond/pywin32/blob/main/com/win32com/client/__init__.py#L265)

`PowerPoint.Application`オブジェクトが持つメソッドやプロパティは以下をご参照ください
[アプリケーション オブジェクト (PowerPoint)](https://learn.microsoft.com/ja-jp/office/vba/api/powerpoint.application)


-   ```python
    pythoncom.PumpWaitingMessages()
    ```

このコードでは、待機中のイベントを実行します。[^pumpwaitingmessages][^eventloop]
今回のプログラムではスライドショーの開始と終了イベントが発生したときにハンドラメソッド内の処理が実行されるようになります。

[^pumpwaitingmessages]:このメソッドのドキュメント: [pythoncom.PumpWaitingMessages](https://mhammond.github.io/pywin32/pythoncom__PumpWaitingMessages_meth.html)
[^eventloop]:イベント処理方式や「ポンプ」とは何かについて: [Wikipedia-イベントループ](https://ja.wikipedia.org/wiki/%E3%82%A4%E3%83%99%E3%83%B3%E3%83%88%E3%83%AB%E3%83%BC%E3%83%97)


- 残りの処理は、スライドショーで表示中のページ位置を取得して、ページの切り替えがあるとそのページのインデックスやノートを取得して出力する処理を無限ループするものになります。
  `PowerPoint.Application`オブジェクトのプロパティを調べ方がわかっていれば特別難しいことはないかなと思うので説明は以上です。

# さいごに

今回、PowerPointのイベント処理をpywin32を用いて実装しました。
Win32 APIやCOMなどWindowsで古くから用いられている技術について個人的に少しだけ理解が進んだかなと思います。
今回のプログラムは最初にベースだけChatGPTに書いてもらいました。pywin32をまったく触ったことのなかった状態の私にとって大きな時間の短縮になりとても助かりました。

# 参考情報

- [Python for Win32 Extensions Help](https://mhammond.github.io/pywin32/)
- [Wikipedia-Component Object Model](https://ja.wikipedia.org/wiki/Component_Object_Model)
- [Wikipedia-Object Linking and Embedding](https://ja.wikipedia.org/wiki/Object_Linking_and_Embedding)
- [COMクライアントとCOMサーバーについて](https://learn.microsoft.com/ja-jp/windows/win32/com/com-clients-and-servers)