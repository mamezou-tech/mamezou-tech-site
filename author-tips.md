# 記事執筆に関するTips集

## 画像
画像を貼り付けたい場合はgyazo等にアップロードしたリンクを使うか、`src/img/`配下に適当なディレクトリを掘ってそこに配置した画像をマークダウンでリンクしてください。

```markdown
アップロード画像へのリンク(png等の画像リンクにしてください)
![](https://i.gyazo.com/a6fc0564284c2a417db133a24a3a8432.png)

src/imgに配置した画像へのリンク
![](/img/sample/cool.png)
```

## 目次(Table of Contents)
長い記事になる場合は目次を最初につけたいこともあるでしょう。
その場合は、挿入したいところに以下を入れると記事の内容から目次が生成されます（h1/h2タグが対象になります）。

```markdown
[[TOC]]
```

なお、目次は表示範囲の狭いモバイルではCSSで非表示にしています。

## 情報ボックス

本文には入れたくないけど、フットノートではなく、ユーザーに目立つようにしたいことありますよね。

そんな時は、マークダウン上に以下のように記述してください。

```markdown
:::info
お知らせメッセージです
:::

:::alert
緩い警告メッセージです
:::

:::stop
強い警告メッセージです
:::

:::check
任意の追加情報です。
:::

:::column:豆知識！
追加のコラム文章です。
コロンの後に任意の文字を入れるとタイトルとして設定することができます（他の種類も同じです）。
:::
```

上記は、以下のように表示されます。

![](https://i.gyazo.com/0a10e00098674a544d7d4aca77c4a159.png)

## Mermaid(UML)

[Mermaid](https://mermaid-js.github.io/mermaid/#/)で図を書きたい！という通なあなたはこちらを参考にしてください。

- [/src/pages/mermaid-sample.md](/src/pages/mermaid-sample.md)

## KaTeX(数式)

数式を記事に載せたいというマニアなあなたはKaTeXをサポートしています。こちらを参考にしてください。

- [/src/pages/katex-sample.md](/src/pages/katex-sample.md)
