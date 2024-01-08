---
title: 開発者体験(DX)を進化させるJetBrainsのAIアシスタント機能の紹介
author: noboru-kudo
date: 2023-12-09
tags: [ JetBrains, OpenAI, GPT ]
image: true
---

先日JetBrains社から[AIアシスタント](https://www.jetbrains.com/ai/)機能の一般公開が発表されました。

- [Introducing JetBrains AI and the In-IDE AI Assistant](https://blog.jetbrains.com/blog/2023/12/06/introducing-jetbrains-ai-and-the-in-ide-ai-assistant/)
- [JetBrains AI と IDE 内での AI Assistant のご紹介](https://blog.jetbrains.com/ja/blog/2023/12/06/introducing-jetbrains-ai-and-the-in-ide-ai-assistant/)

今回はこれを試してみましたので、その使いどころをご紹介したいと思います。
なお、本記事ではIDEとして`IntelliJ IDEA 2023.3 (Ultimate Edition)`を使用しています。

AIアシスタント機能の公式ドキュメントは[こちら](https://www.jetbrains.com/help/idea/ai-assistant.html)です。

## JetBrainsのAIアシスタントとは？

JetBrainsのIDEノウハウとLLMを組み合わせて、開発ワークフローを効率化する[JetBrains AI](https://www.jetbrains.com/ai/)の機能です。
リファクタリングやコード生成に加えて、ドキュメント作成やソースコード上の問題点検出までいろんなことをしてくれます。
類似サービスとしては[GitHub Copilot](https://github.com/features/copilot)が挙げられると思います。

現時点ではほとんどのAI機能はOpenAIを使用していますが、将来的にはJetBrainsカスタムモデルやGoogle等もサポートする予定とのことです。
以下[公式ページ](https://www.jetbrains.com/ai/)からの引用です。

> There is also an ongoing track with other providers (e.g. Google and others) regarding their models. Still, for the majority of use cases, OpenAI is our current LLM provider.
> For the on-premises scenario, we will serve the provider included in the cloud platform (AWS Anthropic, Google PaLm 2, or Azure OpenAI).

(DeepLで翻訳)

> 現在、ほとんどのAIアシスタント機能はOpenAIを使用していますが、JetBrainsによって学習された新しいコード補完モデルのリリースを準備しています。
> また、他のプロバイダー（Googleなど）とのモデルに関するトラックも進行中です。それでも、大半のユースケースでは、OpenAIが現在のLLMプロバイダーです。
> オンプレミスのシナリオでは、クラウドプラットフォームに含まれるプロバイダー（AWS Anthropic、Google PaLm 2、Azure OpenAI）を利用する予定です。

利用するにはIDEとは別にサブスクリプション形式のライセンス購入が必要です。
現時点だと個人では年額13,000円程度です。

- [JetBrains AI - Plans and Pricing](https://www.jetbrains.com/ai/#plans-and-pricing)

もちろん日本の総代理店のサムライズムさん経由での購入も可能です。

- [サムライズム - JetBrains - AI Assistant](https://samuraism.com/jetbrains/ai-assistant)

## プロダクトコード生成

AIの使い方としては王道の機能でしょうかね。
プロンプトで生成したいコードの説明を入力すると、AIアシスタントがコードを生成してくれます。

<a href="https://gyazo.com/91d6061f531f24772ef24b2d0ba48893"><video width="100%" autoplay muted loop playsinline controls><source src="https://i.gyazo.com/91d6061f531f24772ef24b2d0ba48893.mp4" type="video/mp4"/></video></a>

差分で表示してくれるので、どう変わるのかが見やすいですね。
気に入らなければ「Specify」で追加指示ができます。「Accept All」でAIが生成したコードを取り込みます。

## リファクタリング提案

指定した範囲のソースコードでリファクタリングを提案してくれます。

<a href="https://gyazo.com/e35accc9e9aac604a4c0dbefc37ad72f"><video width="100%" autoplay muted loop playsinline controls><source src="https://i.gyazo.com/e35accc9e9aac604a4c0dbefc37ad72f.mp4" type="video/mp4"/></video></a>

先ほどと同様に、提案されたコードは差分で確認できるので取り込み有無を判断するのに便利です。
この辺りはJetBrainsのノウハウを感じます。

## 問題検知

指定した範囲のソースコードに問題がないかを確認します。

<a href="https://gyazo.com/cad311d4e0760772d7766ccfbe228796"><video width="100%" autoplay muted loop playsinline controls><source src="https://i.gyazo.com/cad311d4e0760772d7766ccfbe228796.mp4" type="video/mp4"/></video></a>

問題の有無だけでなく、チャットで改善方法まで聞けるので楽ですね。
もはやソースコードレベルのレビューはAIアシスタントにお任せできそうです。

:::info
ここでは設定でAIアシスタントのレスポンスを日本語に変更できました。
「Settings」 -> 「Tools」 -> 「AI Assistant」 -> 「User Prompts Library」 -> 「Find Problems」でプロンプトに追加指示しました。

![](https://i.gyazo.com/bcecb08d1dc8da53358e25d8f8d97b8b.png)
:::

## テストコード生成
もはやAIのコード生成ではお馴染みの機能になったでしょうか。
プロダクトコードの内容を解析してそれに適したテストコードを生成してくれます。

<a href="https://gyazo.com/06a2a836adbb839ac4a811a79d63f57f"><video width="100%" autoplay muted loop playsinline controls><source src="https://i.gyazo.com/06a2a836adbb839ac4a811a79d63f57f.mp4" type="video/mp4"/></video></a>

一度作ったら終わりでなく、自分の好みに合うように追加指示で改善していけるところがいいですね。
使用するテスティングフレームワークやライブラリの指示等も「Specify」からできます（今後はあらかじめ指定できるようになりそうな気もしますが）。

## ソースコード要約

結構重宝する気がします。任意のソースコードを要約してくれます。

<a href="https://gyazo.com/503fe78b7b627350a711ab079628b778"><video width="100%" autoplay muted loop playsinline controls><source src="https://i.gyazo.com/503fe78b7b627350a711ab079628b778.mp4" type="video/mp4"/></video></a>

心が折れそうなレガシーなコードやOSS等を読む際に一度実行したい感じですね。
気になる部分はチャットで追加質問すればコード理解も深まります。

## コミットコメント生成

地味に便利だなと思ったのはこれです。AIが変更点から適切なコミットコメントを提案してくれます。

<a href="https://gyazo.com/b3d0005ea570722677a73ab8d376a37a"><video width="100%" autoplay muted loop playsinline controls><source src="https://i.gyazo.com/b3d0005ea570722677a73ab8d376a37a.mp4" type="video/mp4"/></video></a>

変更点を要約してくれるので、コミットする方としてもこんな変更したんだと振り返えれます[^1]。
ちなみに、現時点では日本語でコメントを生成するようにプロンプトのカスタマイズはできませんでした。

[^1]: 良くないことは分かっていますが、勢いで変更してしまうことが多くてコミット時に何を変更したのか分からなくなるのです。

## 変数名の提案

こちらも地味に便利です。AIがコードのコンテキストを理解して適切な変数名候補を提案してくれます。

<a href="https://gyazo.com/f7c7dc5f96932be049295c3f8d190590"><video width="100%" autoplay muted loop playsinline controls><source src="https://i.gyazo.com/f7c7dc5f96932be049295c3f8d190590.mp4" type="video/mp4"/></video></a>

英語が苦手な私はいつもネーミングに悩むことが多いのでとても助かります。
現時点では候補を上げてくれるのはin-place形式の名前変更のみで、ダイアログ形式の名前変更時にはなぜか提案してくれませんでした。今後のアップデートに期待します。

## ドキュメント生成

これもとても便利ですね。いつも書くのが面倒ですが、AIが対象のソースコードを要約してドキュメント作ってくれます。

<a href="https://gyazo.com/35647f90d3d3f1a9fa5ea2183b818b53"><video width="100%" autoplay muted loop playsinline controls><source src="https://i.gyazo.com/35647f90d3d3f1a9fa5ea2183b818b53.mp4" type="video/mp4"/></video></a>

これに慣れちゃうとサボり癖がついちゃいそうですが。。変更した時に常に実行するようにしておけばメンテされない状態のドキュメントになるのは防げますねw

## カスタムプロンプト

ここまではAIアシスタントの定型機能を使いましたが、カスタムプロンプトも作成できます。

ここではブログ記事用のカスタムプロンプトを作成してみました。
カスタムプロンプトは「Settings」 -> 「Tools」 -> 「AI Assistant」 -> 「User Prompts Library」 から指定できます。
以下のように「Check Blog」という名前でブログ記事の校正とタイトルを提案するプロンプトを作成してみました。

![](https://i.gyazo.com/7e188fb1ce386e983d4b580e7b14ef0c.png)

`$SELECTION`で選択した内容を埋め込んでいます。

試しに以前書いた[記事](/blogs/2023/12/06/slack-github-assistantsapi/)でこれを実行すると以下のようになります。

<a href="https://gyazo.com/ed86cca6a3bb1ef90b78b6bec1c1fd80"><video width="100%" autoplay muted loop playsinline controls><source src="https://i.gyazo.com/ed86cca6a3bb1ef90b78b6bec1c1fd80.mp4" type="video/mp4"/></video></a>

通常は[textlint](https://github.com/textlint/textlint)で文章をチェックしていたりするのですが、これを使うとさらに深い観点でチェックしてくれます。
いつも記事のタイトルに悩むのですが、少し(?)盛ったタイトルも提案してくれて新しい発見もありますね。

## まとめ

まだ使いこなしているとは言えませんが、AIアシスタントの主要機能を使ってみました。
開発作業のあらゆるシーンでAIアシスタントと協業している感覚ですね。

ここでは紹介しませんでしたが、他にも以下のような機能もあります。
- [インラインコード補完](https://www.jetbrains.com/help/idea/use-ai-in-editor.html#enable-inline-code-completion)
- [他言語への変換](https://www.jetbrains.com/help/idea/convert-files-to-another-language.html)
- [ランタイムエラー解析](https://www.jetbrains.com/help/idea/use-prompts-to-explain-and-refactor-your-code.html#ai-explain-runtime-error)

今後もあらゆるシーンでAIアシスタントが使えるように拡張されてくるのだろうと思います。

私見ですが、JetBrainsユーザーであればサブスクリプション料金を払っても使い続ける価値はあると感じました。

