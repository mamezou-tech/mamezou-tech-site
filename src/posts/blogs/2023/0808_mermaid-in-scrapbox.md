---
title: ScrapboxでMermaid記法を可視化するUserScriptを作った話
author: noriyuki-yagi
date: 2023-08-08
tags: [scrapbox, Mermaid, summer2023]
summerRelayUrl: https://developer.mamezou-tech.com/events/season/2023-summer/
---

この記事は[夏のリレー連載2023](/events/season/2023-summer/)第12日目の記事です。

弊社豆蔵では、[Helpfeel社](https://corp.helpfeel.com/) による [Scrapbox](https://scrapbox.io/) を社内公式ツールとして導入しています。
Scrapboxはそのままでも十分に便利で面白いツールなのですが、UserScriptを使うことでさらに自由度の高いカスタマイズができます。

今回は、Scrapbox上でMermaid記法のコードを可視化して表示するUserScriptを作成した話をしたいと思います。

## UserScriptで扱えるオブジェクトを見てみよう

まずはUserScriptでどんなオブジェクトを扱えるかを調べてみようと思います。

ブラウザで任意のScrapboxのページを開き、デベロッパーツールのコンソール上で『window』と入力すると、そのページ上で定義されているグローバル変数の一覧が表示されます。
ここで表示されているグローバル変数は基本的にUserScriptで扱うことができます。

![デベロッパーツールのコンソール上で『window』と入力](/img/blogs/2023/0808_mermaid-in-scrapbox_01.png)

ここで抑えておきたいポイントは、jQueryが使えることと、scrapboxグローバル変数にScrapboxのページ情報が格納されているところです。

![jQuery](/img/blogs/2023/0808_mermaid-in-scrapbox_02.png)

![scrapboxグローバル変数](/img/blogs/2023/0808_mermaid-in-scrapbox_03.png)

scrapboxグローバル変数の構造は大まかに下図のようになっています。

![scrapboxクラス図](/img/blogs/2023/0808_mermaid-in-scrapbox_04.png)

ページ内のコードブロックはscrapbox.Page.linesを辿ることで取得できそうですね。
コードで書くと下記のような感じでしょうか。

```js
const result = [];
let text = "";
for (const line of scrapbox.Page.lines) {
   if (line.codeBlock && line.codeBlock.lang === "mermaid") {
      if (line.codeBlock.start) {
         text = "";
      } else {
         text += "\n" + line.text;
      }
      if (line.codeBlock.end) {
         text = text.trim();
         result.append(text);
      }
   }
}
```

## Mermaidライブラリの読み込みと呼び出し

Mermaidライブラリの読み込みは、下記のようにjQueryのgetScript関数を使うことで簡単に読み込めます。

```js
 $(() => {
 	$.getScript("https://cdnjs.cloudflare.com/ajax/libs/mermaid/8.14.0/mermaid.min.js")
       .done((script, textStatus) => {
         mermaid.mermaidAPI.initialize({ startOnLoad: false })
         /** Mermaidを使った処理を記述(詳細割愛) **/
       })
       .fail((jqxhr, settings, exception) => {
         console.error(exception)
       })
```

今回の記事で使用しているMermaidライブラリのバージョンは8.14.0です。
Mermaidの新しいバージョンとは互換性が無いと思うので参考にする場合は注意してください。

下記のようにAPIを呼び出すことで、Mermaidコードからダイアグラム(SVG形式)を生成できます。

```js
const svgId = /* SVG要素のidとなる一意の値 */
const mermaidCode = /* Mermaidコード */
const svg = mermaid.mermaidAPI.render(svgId, mermaidCode);
```

ScrapboxではLineのidの先頭に"L"をつけた値がLineを表示するHTML要素のidと一致するため、下記のようにすることでダイアログラムをコードの下部に表示させることができます。

```js
const mermaidCodeLastLineId = /* Mermaidコードの最終行のid */
$("#L" + mermaidCodeLastLineId).after(svg)
```

また、下記のようにダイアグラムのClickイベントを拾ったり、マウスカーソルのアイコンを変更したりもできます。

```js
$("#" + svgId).on("click", () => onSvgClicked()).css("cursor","pointer")
```


## 最終的なコードリスト

今回のUserScriptを作る上での基本的なポイントは以上になります。

最終的には下記の機能をUserScriptに埋め込みました。

* ページ表示後にMermaidコードブロックを探してダイアグラムを生成
* ページ編集時に差分を検知して、Mermaidコードブロックが変更されたらそれに対応するダイアグラムのみ再生成
* ダイアグラムのマウスクリックでMermaidコードブロックの表示/非表示の切替(デフォルト非表示)

コードリストは下記になります。

```js
$(() => {
   $.getScript("https://cdnjs.cloudflare.com/ajax/libs/mermaid/8.14.0/mermaid.min.js")
      .done((script, textStatus) => {
         mermaid.mermaidAPI.initialize({
            startOnLoad: false
         })
         const mermaidViewer = new MermaidViewer()
         mermaidViewer.onScrapboxPageChanged()
         scrapbox.on("page:changed", () => mermaidViewer.onScrapboxPageChanged())
         scrapbox.on("lines:changed", () => mermaidViewer.onScrapboxLinesChanged())
      })
      .fail((jqxhr, settings, exception) => {
         console.error(exception)
      })

   const MermaidViewer = function () {
      const DEFAULT_SHOW_CODE = false
      this.recentMermaidCodes = new Map()
      this.codeViewStatusRepository = new MermaidCodeViewStatusRepository()

      this.onScrapboxLinesChanged = function () {
         if (scrapbox.Page.lines) {
            this.updateDiagrams()
         }
      }

      this.onScrapboxPageChanged = function () {
         if (scrapbox.Page.lines) {
            this.updateDiagrams()
            this.setAllCodeViewStatus(DEFAULT_SHOW_CODE)
         }
      }

      // すべてのコードブロックの表示ステータスを変更
      // 引数: value 表示ステータス (true|false)
      this.setAllCodeViewStatus = function (value) {
         for (const [id, code] of this.recentMermaidCodes) {
            code.setCodeViewStatus(value)
         }
      }

      // 変更があればダイアグラムを更新
      this.updateDiagrams = function () {
         const newCodes = this.findMermaidCodes()
         const diff = MermaidViewerUtils.diffMermaidCodes(this.recentMermaidCodes, newCodes)
         for (const item of diff) {
            if (item.op === "delete") {
               item.code.deleteDiagram()
            } else {
               item.code.updateDiagram()
            }
         }
         this.recentMermaidCodes = newCodes
      }

      // mermaidコードをページ内から検索
      // 戻り値: Map型
      //         キー: コードブロックのID(最初の行ID)
      //         値: MermaidCode
      this.findMermaidCodes = function () {
         const result = new Map()
         var text, filename, id, lastLineId, lineIds
         for (const line of scrapbox.Page.lines) {
            if (line.codeBlock && line.codeBlock.lang === "mermaid") {
               if (line.codeBlock.start) {
                  text = ""
                  id = line.id
                  lineIds = new Set()
               } else {
                  text += "\n" + line.text
               }
               lineIds.add(line.id)
               if (line.codeBlock.end) {
                  lastLineId = line.id
                  text = text.trim()
                  result.set(id, new MermaidCode(id, text, lastLineId, lineIds, this.codeViewStatusRepository))
               }
            }
         }
         return result
      }
   }

   const MermaidCode = function (id, text, lastLineId, lineIds, codeViewStatusRepository) {
      const MERMAID_SVG_ID_PREFIX = "mermaid-"
      this.id = id
      this.text = text
      this.lastLineId = lastLineId
      this.lineIds = lineIds
      this.codeViewStatusRepository = codeViewStatusRepository
      this.svgId = MERMAID_SVG_ID_PREFIX + id

      // mermaidダイアグラムを更新
      this.updateDiagram = function () {
         try {
            const svg = mermaid.mermaidAPI.render(this.svgId, this.text)
            $("#" + this.svgId).remove()
            $("#L" + this.lastLineId).after(svg)
         } catch (e) {
            console.error(e)
            $("#L" + this.lastLineId).after($("#" + this.svgId))
         }
         $("#" + this.svgId)
            .on("click", () => this.onSvgClicked())
            .css("cursor", "pointer")
      }

      // mermaidダイアグラムを削除
      this.deleteDiagram = function () {
         $("#" + this.svgId).remove()
      }

      // mermaidダイアグラム(SVG)がクリックされたときのイベントハンドラ
      // コードブロックの表示ステータスを変更
      this.onSvgClicked = function () {
         this.codeViewStatusRepository.changeStatus(this.id)
         this.applyCodeView()
      }

      // コードブロックの表示ステータスを適用
      this.applyCodeView = function () {
         const status = this.codeViewStatusRepository.getStatus(this.id)
         for (const lineId of this.lineIds) {
            if (status) {
               $("#L" + lineId).show(100)
            } else {
               $("#L" + lineId).hide(100)
            }
         }
      }

      // コードブロックの表示ステータスを変更
      this.setCodeViewStatus = function (value) {
         this.codeViewStatusRepository.setStatus(this.id, value)
         this.applyCodeView()
      }
   }

   const MermaidCodeViewStatusRepository = function () {
      this.status = new Map()
      this.defaultValue = true

      this.changeStatus = function (id) {
         const old = this.status.has(id) ? this.status.get(id) : this.defaultValue
         this.status.set(id, !old)
      }

      this.getStatus = function (id) {
         return this.status.has(id) ? this.status.get(id) : this.defaultValue
      }

      this.setStatus = function (id, value) {
         this.status.set(id, value)
      }
   }

   const MermaidViewerUtils = {}
   // ２つのMap型に格納されたコードの差分を返す
   // 引数: oldMap 古い値(Map型)
   // 引数: newMap 新しい値(Map型)
   MermaidViewerUtils.diffMermaidCodes = function (oldMap, newMap) {
      const result = []
      const intersection = new Set()
      for (const [key, val] of newMap) {
         if (!oldMap.has(key)) {
            result.push({
               op: "new",
               key: key,
               code: newMap.get(key)
            })
         } else {
            intersection.add(key)
         }
      }
      for (const [key, val] of oldMap) {
         if (!newMap.has(key)) {
            result.push({
               op: "delete",
               key: key,
               code: oldMap.get(key)
            })
            intersection.delete(key)
         }
      }
      for (const key of intersection) {
         const oldVal = oldMap.get(key)
         const newVal = newMap.get(key)
         if (oldVal.text !== newVal.text) {
            result.push({
               op: "changed",
               key: key,
               code: newMap.get(key)
            })
         }
      }
      return result;
   }
})
```

## デモ動画

このUserScriptを使うと下のデモ動画のような感じでMermaidコードを表示できます。

![デモ動画](/img/blogs/2023/0808_mermaid-in-scrapbox_demo.gif)

## おわりに

今回作成したUserScripは[ここ](https://scrapbox.io/customize/Mermaid%E8%A8%98%E6%B3%95%E5%8F%AF%E8%A6%96%E5%8C%96UserScript)で公開しています。

ScrapboxでMermaid記法を可視化するUserScriptを作った話は以上となります。

