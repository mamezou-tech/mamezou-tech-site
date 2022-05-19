---
title: 11tyで生成したマークダウン記事の画像を拡大する
author: noboru-kudo
date: 2022-05-19
tags: [SSG, 11ty]
---

早いものでデベロッパーサイトを開設して半年ほど経過しました。継続的に記事も公開し、もうすぐ100本に到達します。
今後は記事の執筆と並行して、サイト自体のUI/UX改善にも取り組んでいきたいと思います。

今回は改善要望として上がっていた記事の画像のズーム機能について対応しました。デベロッパーサイトなのでここではそのやり方も記事として紹介したいと思います。
現在このデベロッパーサイトでは、SSGツールの[eleventy](https://www.11ty.dev/)で、マークダウン記事をHTMLへと変換しています。
この中で表示サイズが大きい画像を使うと、解像度の低い端末やモニターではかなり見にくいです。
当初は画像をクリックすると別タブでオリジナル画像を表示をすることを考えましたが、やはり同一タブ内で見れる方がUX的に望ましいと思います。
これを実現するためのライブラリを探し、以下にたどり着きました。

- <https://github.com/dimsemenov/PhotoSwipe>

ドキュメントを眺めてみると機能的に十分で、依存ライブラリもなく軽量です（GitHubスター数も20000を超えていてます）。
このPhotoSwipeを導入することにしました。

[[TOC]]

## PhotoSwipeのインストール

まずはPhotoSwipeをインストールします。

```shell
npm install -D photoswipe
```

そのままではサイトからPhotoSwipeが見つかりません。11tyのビルド時に、PhotoSwipeをHTMLと一緒に静的リソース内として入れる必要があります。

11tyのエントリーポイントの`.eleventy.js`で、このライブラリをコピーするようにします。

```shell
eleventyConfig.addPassthroughCopy({ "./node_modules/photoswipe/dist": "photoswipe" });
```

`addPassthroughCopy`は、変換処理はせずにそのまま`photoswipe`というディレクトリにコピーする11tyのメソッドです。

## マークダウンパーサーのカスタマイズ

PhotoSwipeを導入する場合は、特定のHTMLタグや属性を設定する必要があります。

- [PhotoSwipe - Required HTML markup](https://photoswipe.com/getting-started/#required-html-markup)

imgをaタグでラップし、そのaタグに専用のカスタム属性(`data-pswp-width`/`data-pswp-height`)を追加して、PhotoSwipeが扱うイメージのサイズ指定が必要です。
サイズはイメージによって異なりますし、執筆者に個別に指定させることは避けたいです。
このため、ここではimgタグのaタグラップのみにして、カスタム属性はページロード時に動的に設定することにします。

11tyではマークダウンパーサーに[markdown-it](https://github.com/markdown-it/markdown-it)を使います。こちらのデフォルトルール(imgタグのみ)を変更します。
再び`.eleventy.js`を修正します。以下関連部分を抜粋します。

```javascript
const markdownLibrary = markdownIt({
  html: true,
  breaks: true,
}).use((md) => {
    const originalRule = md.renderer.rules.image;
    md.renderer.rules.image = function (tokens, idx, options, env, self) {
      const imageTag = originalRule(tokens, idx, options, env, self);
      const token = tokens[idx];
      return `<a id="image-swipe-${idx}" class="image-swipe" href="${token.attrs[token.attrIndex("src")][1]}" target="_blank" rel="noopener noreferrer">${imageTag}</a>`;
    }
  });

eleventyConfig.setLibrary("md", markdownLibrary);
```

ここではmarkdown-itのレンダラーの`md.renderer.rules.image`ルールを上書きし、元々のimgタグをaタグでラップするようにしました。
また、後続のPhotoSwipeの初期化で、この要素をルックアップする必要があるため、idやclass属性を指定しました。

markdown-itのカスタムルールの書き方は、以下のドキュメントやソースコードを参考にしました。

- <https://github.com/markdown-it/markdown-it/blob/master/docs/architecture.md>
- <https://github.com/markdown-it/markdown-it/blob/master/lib/renderer.js>

## PhotoSwipe初期化

これでPhotoSwipeを使う準備ができました。ページロード時にPhotoSwipeを初期化します。
11tyの記事で使っているベーステンプレートに以下を追加します。

```html
  <script type="module">
    import PhotoSwipeLightbox from '/photoswipe/photoswipe-lightbox.esm.js';
    window.onload = function() {
      const anchors = document.querySelectorAll('a.image-swipe');
      anchors.forEach((el) => {
        const img = el.querySelector('img');
        el.setAttribute('data-pswp-width', img.naturalWidth);
        el.setAttribute('data-pswp-height', img.naturalHeight);
        new PhotoSwipeLightbox({
          gallery: `#${el.id}`,
          pswpModule: () => import('/photoswipe/photoswipe.esm.js'),
        }).init();
      })
    }
  </script>
```

先程markdown-itのカスタムルールで追加したaタグを全て取得し、それぞれの要素でPhotoSwipeを初期化しています。
この中でPhotoSwipe向けのカスタム属性(`data-pswp-width`/`data-pswp-height`)を追加し、実際のイメージサイズに応じてPhotoSwipeが表示するサイズを動的に設定しています。

初期化の実装には、以下PhotoSwipeのドキュメントを参考にしました[^1]。

- [PhotoSwipe - Open each image individually](https://photoswipe.com/getting-started/#open-each-image-individually)

[^1]: 将来的には、このJavaScriptのソースコードはミニファイしようと思います。

最後に、PhotoSwipeの動作にはCSSも必要です。こちらはPhotoSwipeのモジュール内に同梱されていますので、テンプレートのheadタグ内にいれておきます。

```html
<link rel="stylesheet" href="/photoswipe/photoswipe.css">
```

## 動作確認

最後に実際に動かして確認します。
サイズの大きい画像のあるサンプル記事を作成して見てました。以下画像クリック時の動画です。

<video width="100%" autoplay muted loop playsinline controls>
<source src="https://i.gyazo.com/aa2b284d7f8866217f3b087fe831e7f2.mp4" type="video/mp4" />
</video>

画像をクリックするとPhotoSwipeがズームやスワイプをやってくれているのが分かります。これを自前で実装するのはかなり大変ですね。PhotoSwipeありがとうございます。

上記で使用した画像はこちらです。同じように動作するはずです。

![sample image](https://i.gyazo.com/7ee2980d2d93f5fbb2bb4700f491eb20.jpg)

今後も継続的にUI/UXを改善し、参考になりそうなものは記事として投稿したいと思います。