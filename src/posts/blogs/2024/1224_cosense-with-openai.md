---
title: 社内ノウハウ・ノウフー共有における生成AIの活用
author: yoshihisa-muta
date: 2024-12-24
image: true
tags: [scrapbox, OpenAI, 生成AI, advent2024]
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2024/
---

これは[豆蔵デベロッパーサイトアドベントカレンダー2024](/events/advent-calendar/2024/)第24日目の記事です。

みなさま、こんにちは。[Cosense](http://cosen.se) (旧Scrapbox)[^1] の魅力にすっかり取り付かれている牟田です。今日はクリスマス・イブ。気がつけばもう 2024 年も終わりですね。

[^1]: [Scrapbox は Cosense に改名](https://corp.helpfeel.com/news/pressrelease-20240521)されています。(~~個人的には愛着もあったし変えないでほしかった。~~)

今回は、弊社内のノウハウ・ノウフー共有における生成 AI の活用について紹介します。

## ノウハウ・ノウフー共有のための Cosense 活用

2019 年 7 月に Cosense を弊社内での公式ツール化してから、早 5 年が経過しました。Cosense は社員全員が毎日のように活用するツールとなり、社内ポータルとして定着しています。

![](https://i.gyazo.com/9f66dcad9f0c37a203d50ea1bc35f41e.png)

なお Cosense 導入前の課題と、それを Cosense を使ってどのように解決したのか、そしてその効果については 下記記事を参照ください。

@[og](https://developer.mamezou-tech.com/blogs/2022/01/05/installing-scrapbox/)

## Cosense 活用における現在の課題

2024 年 12 月現在、総ページ数は 14,000 ページを超えており、今もなお新しい情報が増え続けています。
一方で、情報量が増えすぎたこともあり、検索性[^2]と情報活用のしやすさが課題となっています。

[^2]: Cosense には 「QuickSearch」、「関連ページ」、「2 hop search」「全文検索」といった便利な検索機能が用意されています。しかし流石に 1 万ページを超えるような大規模な情報量になると、目的のページを見つけ出すのが困難になります。

![](https://i.gyazo.com/aca4b2a833d40992963d4f13d141cca9.png)

そこで、生成 AI ([OpenAI API](https://openai.com/index/openai-api/)) に関する知見の獲得を兼ね、ドッグフーディング的にこの課題を解消できないか、ということで今回の取り組みを実施することにしました。

![](https://i.gyazo.com/b59b768d7dc9151752b4fbe37b9659b8.png)

## 生成 AI を使った情報の引き出しの仕組み

ざっくりと、以下のような図の形で実現しています。

![](https://i.gyazo.com/dc581040bbc19d4741d5b361cb65427e.png)

情報の入力から引き出しまでの流れは以下の通りです。
1. 情報入力
2. 情報取得 (絞り込み)
3. 情報転送 & RAG 生成の指示
4. 質問入力
5. リクエスト
6. レスポンス
7. 回答表示

以下、それぞれについて、詳しく解説します。
### (1) 情報入力  
情報の入力は、Cosense に対して実施するだけ。実にシンプルです。前述の通り、既に質の高い十分な情報が集まっています。

### (2) 情報取得 (絞り込み)  
[GitHub Actions](https://github.co.jp/features/actions) が定期的に (1) で入力された Cosense の情報を自動取得し、特定のリンク[^3]を含むページを除外した上で絞り込みます。  
[^3]:顧客、プロジェクトといったリンクが付いている機微情報については情報取得の対象から除外しています。

### (3) 情報転送 & RAG 生成の指示  
次に GitHub Actions が (2) で取得した情報を OpenAI API に送信し、ベクトルデータベース更新[^4]を指示します。  
[^4]: RAG は Retrieve and Generate の略で、情報取得と生成を同時に行う AI モデルです。なお、OpenAI のドキュメントには RAG という表現はなく、ナレッジベースのことを VectorStore、それを使った検索を File Search と呼んでいます。

### (4) 質問入力  
情報の引き出しは、社内のコミュニケーションツールである [Slack](https://slack.com/) を使って行います。具体的には Slack App (@mame-kun) に対して質問を投げかけます。

### (5) リクエスト  
Slack が OpenAI API に対しリクエスト (質問) を送信します。

### (6) レスポンス  
OpenAI API によってレスポンス (回答) が Slack に戻されます。

### (7) 回答表示  
Slack 上で、質問メッセージのスレッドに対する返信として回答が表示されます。

## 実際の動作の様子

以下は実際に Slack 上で質問をしている様子です。

![](https://i.gyazo.com/a9a9f84d48a75dab814c1b05aa9e3104.png)

Cosense からの情報取得と、一般的な情報をうまく組み合わせた上で、質問に対する回答がスレッドの中でメッセージとして表示されているのが分かります。また、Cosense の情報ソースも表示されており、このリンクから該当ページへ直接アクセスできます。  
さらに、スレッド上で追加の質問をすると、最初の質問のコンテキストを理解した上で回答してくれます。  
まるで社内事情をよく知る有識者と会話しているかのようです。

## 設計ポイント

この取り組みの設計ポイントは以下です。

 - OpenAI のアシスタント API の活用
   - 性格の異なるキャラクターを 2 種類用意
     - mame-kun: Cosense の情報を把握した上で、質問に対してフランクに回答するキャラクター
     - mameka: 一般的な質問に対してポジティブで元気に回答するキャラクター  
     ![](https://i.gyazo.com/92ff185ff11411c67dd9e405e0d77b81.png)  
     - Slack 上でのスレッドと OpenAI の会話スレッドを同化させ、会話の文脈に沿った自然な応答
    
 
 - ナレッジベース(Cosense)アクセス
   - OpenAI の[File Search](https://platform.openai.com/docs/assistants/tools/file-search)を利用した効率的な情報取得
     - セマンティック検索とキーワード検索のハイブリッド方式
	 - Cosense の情報は定期的に取り込んで最新化
   - 社内情報のため、社外ユーザーからのアクセスを禁止
	 - Slack ユーザー情報から判定(GitHub 経由の場合は抑止)

 
 - Web 検索 / ブラウジング
    - 最新情報取得やハルシネーション抑制のため Perplexity 検索やブラウジング機能を実装
      - 単なる URL フェッチでなく、実ブラウザによる操作 ([Playwright](https://playwright.dev/) 利用) で JavaScript ベース(SPA 等)の Web サイトにも対応
        - この工夫については、[別記事](/blogs/2024/07/19/lambda-playwright-container-tips/)を参照
    - Perplexity 検索は [Perplexity API](https://docs.perplexity.ai/home) を利用
    - [Function Calling](https://platform.openai.com/docs/assistants/tools/function-calling) を使用して実際の利用判断は AI アシスタントに委ねる
 
 
 - マルチモーダル
    - Slack の添付画像については OpenAI API の Storage サービスに連携することで画像入力を実現
      - OpenAI の [Vision](https://platform.openai.com/docs/guides/vision) を使用
      - 音声入力については現時点で未対応

## 今回の取り組みによる効果

今回の取り組みにより、社内での生成 AI の利用が促進されることとなり、AI 技術への理解が深まったのはもちろんですが、同時に以下の効果がありました。

 - 思いがけない情報の発見 (喜び)
   - 生成 AI による質問応答により、Cosense の情報をより効率的に引き出せるようになりました。そして何より、その情報引き出しの過程の中で、思いがけない情報や情報同士の繋がりを発見する喜びが生まれました。
 - 自分の書き込んだノウハウが誰かの役に立つと自覚
   - 各社員が上記効果を実感することで、社内ノウハウ・ノウフーの蓄積 (＝Cosense への書き込み) に積極的に貢献するようになり、ノウハウ・ノウフー共有のさらなるモチベーションが生まれました。これにより、情報のインプットとアウトプットを結ぶ好循環のループができつつあります。

![](https://i.gyazo.com/70165e2d3ee478457c5efd6e877dde2e.png)

## まとめ
いかがでしたか。

生成 AI は、開発生産性の向上といった業務効率向上での活用がまだまだ主流のように感じています。今回の取り組みを通じ、生成 AI が組織文化のちょっとした変化にも寄与できるとの確認ができました。

本記事が、みなさまの生成 AI 活用の今後のヒントとなれば嬉しいです。