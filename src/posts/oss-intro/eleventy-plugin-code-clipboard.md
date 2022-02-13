---
title: "eleventy-plugin-code-clipboard"
author: noboru-kudo
date: 2022-01-06
tags: [SSG]
---

[eleventy-plugin-code-clipboard](https://github.com/mamezou-tech/eleventy-plugin-code-clipboard)は、静的サイトジェネレータツールの1つである[eleventy](https://www.11ty.dev/)(以下11ty)のカスタムプラグインです。

このプラグインは、マークダウンのコードブロックで生成されたものに対して、クリップボードコピー機能を提供するもので、本サイトでも使用されています。

プラグインは以下の2つの機能で構成されます。

## markdown-it カスタムレンダラー

11tyのマークダウンパーサー [markdown-it](https://markdown-it.github.io/)のカスタムレンダラーです。
マークダウンで以下のようなコードブロック[^1]を記述すると...。

```shell
echo "show clipboard button on code block"
```

このプラグインは、以下のようなHTMLに変換します(見やすくなるように一部改行しています)。

```html
<div style="position: relative">
  <pre class="language-shell">
    <code id="code-3" class="language-shell">
      <span class="token builtin class-name">echo</span> <span class="token string">"show clipboard button on code block"</span>
    </code>
  </pre>

  <button class="code-copy " data-clipboard-target="#code-3" 
          style="position: absolute; top: 7.5px; right: 6px; cursor: pointer; outline: none; opacity: 0.8;" 
          title="Copy">
    <span>
      <span style="font-size: 15px; opacity: 0.8;" class="mdi mdi-content-copy"></span>
    </span>
  </button>
</div>
```

オリジナルのHTML([@11ty/eleventy-plugin-syntaxhighlight](https://www.11ty.dev/docs/plugins/syntaxhighlight/)で生成されたもの)の中に、クリップボードアイコンのボタンを配置します。

[^1]: 現状は言語なしのコードブロックや[Indented code blocks](https://spec.commonmark.org/0.28/#indented-code-blocks) には対応していません。

## 11ty shortcode Function(`initClipboardJS`)

11tyでは[Shortcode](https://www.11ty.dev/docs/shortcodes/)と呼ばれるテンプレートエンジンを拡張する仕組みがあります。
このプラグインでは`initClipboardJS`というShortcodeを提供しています。
これは、HTMLロード時にクリップボードライブラリ([clipboard.js](https://clipboardjs.com/))を初期化し、ボタンクリック時にクリップボードコピーをするソースコードを生成します。
また、クリップボードコピーに成功するとツールチップメッセージ(デフォルトは`Copied!`)を表示します。

使い方は以下の通りです。下記は[Nunjucks](https://mozilla.github.io/nunjucks/)テンプレートを利用しています（他のテンプレートも使えるはずですが未検証です）。

{% raw %}
```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <link href="{{ '/css/style.css' | url }}" rel="stylesheet" />
  <body>
    {{ content | safe }}

    {% initClipboardJS %}
  </body>
</html>
```
`{% initClipboardJS %}`部分でプラグインのShortcodeを実行しています。
{% endraw %}
これで静的サイトを生成すると、以下のようにソースコードが生成されます。

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <link href="{{ '/css/style.css' | url }}" rel="stylesheet" />
  <body>
    <div>
      <-- Site Contents... -->
    </div>

    <script>
      function toggleTooltip(el, msg) {
        if (!el.trigger.className.includes('tooltipped')) {
          el.trigger.children[0].className = 'tooltipped tooltipped-s';
          el.trigger.children[0].ariaLabel = msg;
        }
        setTimeout(() => {
          el.trigger.children[0].className = '';
          el.trigger.children[0].ariaLabel = '';
        }, 2000);
      }
  
      window.onload = () => {
        const clipboard = new ClipboardJS('.code-copy');
        clipboard.on('success', (e) => toggleTooltip(e, 'Copied!'));
        clipboard.on('error', (e) => toggleTooltip(e, 'Failed...'));
      };
    </script>
    <script src="https://cdn.jsdelivr.net/npm/clipboard@2.0.8/dist/clipboard.js"></script>
  </body>
</html>
```

見やすさのために圧縮前のものを載せていますが、実際にはJavaScriptソースコード部分は[UglifyJS](https://github.com/mishoo/UglifyJS)で圧縮されたものになります。

## 導入方法

基本的にはプロジェクトの`devDependencies`へのプラグインインストールと、`.eleventy.js`に以下を追加するだけで利用可能になります。
具体的な設定については、リポジトリの[example](https://github.com/mamezou-tech/eleventy-plugin-code-clipboard/tree/main/example)を参照してください。

```javascript
const syntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight');
const codeClipboard = require('eleventy-plugin-code-clipboard');
const markdownIt = require('markdown-it');

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(syntaxHighlight); // 必須ライブラリ
  eleventyConfig.addPlugin(codeClipboard); // プラグイン有効化

  eleventyConfig.addPassthroughCopy('./src/css');

  // その他の設定
  
  /* Markdown Overrides */
  const markdownLibrary = markdownIt({
    html: true,
    breaks: true,
  }).use(codeClipboard.markdownItCopyButton); // プラグインのカスタムレンダラー設定

  eleventyConfig.setLibrary('md', markdownLibrary);

  return {
    passthroughFileCopy: true,
    dir: {
      input: 'src',
    },
  };
};
```

上記の他にも、外部CSSライブラリ(アイコン/ツールチップ)のセットアップが必要になります。
詳しくは [README](https://github.com/mamezou-tech/eleventy-plugin-code-clipboard/blob/main/README.md) を参照してください。

本サイト向けに作成したものをnpmパッケージ化しただけで、まだまだ汎用性が低いですが、時間を見つけて改善していきたいと思います。
