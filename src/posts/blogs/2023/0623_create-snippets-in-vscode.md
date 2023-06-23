---
title: VS Code でユーザー定義スニペットを作って使う
author: masahiro-kondo
date: 2023-06-23
tags: [vscode]
---

## VS Code のスニペット

VS Code ではプログラミング言語毎にビルトインのスニペットが利用できます。例えば、JavaScript を書いていて `foreach` と入力するとforeach を使う構文のテンプレートが挿入され、`array` や `element` のようなプレースホルダをタブキーで移動しながら書き換えることで素早くコードを書くことができます。(この例では GitHub Copilot のサジェストも出てしまっていますが。)

![](https://i.gyazo.com/b675d8a8c6cebb527938599bd337b7e8.gif)

VS Code が対応していない言語についてもその言語に対応した拡張をインストールすることで、スニペットも利用可能になる場合があります。

## 今回作ったスニペット
スニペットは、ユーザー自身が定義して利用することも可能です。今回はプログラミング言語ではなく Markdown 用のスニペットを作成しました。豆蔵デベロッパーサイトの記事を執筆する際、以下のような YAML 形式の front matter を  Markdown ファイルのヘッダーに書く必要があります。この情報を SSG である Eleventy がビルド時に HTML に埋め込んでくれます。

```yaml
---
title: 記事タイトル
author: 著者名
date: 公開日付
tags: [tag1, tag2]
---
```
この front matter ブロックを毎回既存の記事からコピペして書き換えるのが地味に面倒なのでスニペット化してみました。完成したスニペットを使っている様子です。front matter の yaml 部分だけでなく、本文見出しも入れました。

![](https://i.gyazo.com/876bfeaa877bb1ebd616470f0d1008bd.gif)

## 作成方法
公式ドキュメントは以下にあります。

[Snippets in Visual Studio Code](https://code.visualstudio.com/docs/editor/userdefinedsnippets)

VS Code 用の設定メニューから`ユーザースニペットの構成`を選択します。

![menu](https://i.gyazo.com/c27bd93d941c6b05d8bcaa9faf933128.png)

どのスコープでスニペットを作成するのかを選択するモードになります。グローバル、開いているプロジェクト、各言語から選びます。

![select creation](https://i.gyazo.com/8440229c2d9448c24464a3ba47012eb2.png)

今回は、Markdown ファイルを対象とするので、検索して選択します。

![select markdown](https://i.gyazo.com/5babb494f532d35f0b8ea949eb88c60d.png)

雛形の JSON ファイルが `Users/<user>/Library/Application Support/Code/User/snippets/markdown.json` として作成されますのでこれを編集します。

以下のように定義しました。スニペット名 `Front Matter` としています。

- $HOME/Library/Application Support/Code/User/snippets/markdown.json
```json
{
	"Front Matter": {
		"prefix": ["fm", "front-matter"],
		"body": [
			"---",
			"title: ${1:your title}",
			"author: ${2:masahiro-kondo}",
			"date: $CURRENT_YEAR-$CURRENT_MONTH-$CURRENT_DATE",
			"tags: [${3:tag1}, ${4:tag2}]",
			"---\n",
			"## ${5:Intro}\n",
			"## ${6:chapter1}\n",
			"## ${7:chapter2}\n",
			"## ${8:Outro}\n",
		],
		"description": "Insert front matter"
	}
}
```

`prefix` はスニペットを呼び出す時の名前です。プログラミング言語であれば prefix の一部をタイプし始めるとスニペットが起動されます。Markdown ファイルの場合はコマンドパレットから`スニペットの挿入`を選択すると候補として表示されます。`description` は prefix の下に表示される説明です。

![Command palette](https://i.gyazo.com/4ada66051b41401a10fe1cb2e900c646.png)

![select prefix](https://i.gyazo.com/3b7ff06ed03b77d57e4bfc8541476c69.png)

`body` に実際に挿入するスニペット本体を配列で書きます。

`$1`、`$2` などはプレースホルダでタブでジャンプして入力できる部分です。`${1:name}` のように書くことでプレースホルダのデフォルト値を指定できます。

日付の部分は、VS Code で用意している `CURRENT_YEAR` などの日付用変数で組み立てています。他にも多くの変数が用意されています。

[Variables | Snippets in Visual Studio Code](https://code.visualstudio.com/docs/editor/userdefinedsnippets#_variables)

スニペットの書き方自体はさほど難しくないことがお分かりいただけると思います。

## 最後に
筆者はかなり前に VS Code の拡張を作って Marketplace に放流したことがあります。その時はスニペットも拡張に含めていました。スニペットを広く公開したい場合や、特定のプログラミング言語向けにコードハイライトやスニペットをセットで提供したいときは拡張を作る必要がありますが、自分で使うだけのスニペットは簡単に作成できることがわかりました。

最近は Copilot がサジェストしてくれるコード片を確定するだけの場合も結構ありますが、定型的な入力を素早く行いたい場合に今もスニペットは有効です。自分用の便利スニペットを作ってみてはいかがでしょうか。
