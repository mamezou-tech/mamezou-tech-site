---
title: GitHub Copilotの使い方と導入前に知っておきたいこと
author: kenta-ishihara
date: 2024-12-17
tags: [GitHub Copilot, advent2024]
image: true　
---

これは[豆蔵デベロッパーサイトアドベントカレンダー2024](/events/advent-calendar/2024/)第17日目の記事です。

## はじめに
前を向きたいときに[バーガーキングのビッグベット](https://app.burgerking.co.jp/bkad/bigbet/index.html)を食べる石原です。
最近現場の方で[GitHub Copilot](https://docs.github.com/ja/copilot)(以後Copilotと略称)を使えるようになったので、使い方と導入前に知っておきたいことをまとめてみました。
Copilotの導入を検討している方や、現在利用している方の一助になれば幸いです。
(本記事はWindows + IntelliJ環境での記事になります。予めご了承ください)

## 導入方法
1. GitHubアカウントで以下Copilotサブスクリプションに登録する。(参照：[GitHub Copilot のサブスクリプション プラン](https://docs.github.com/ja/copilot/about-github-copilot/subscription-plans-for-github-copilot))
   - GitHub Copilot Individual(個人向け)
   - GitHub Copilot Business(中小規模のチームや企業向け)
   - GitHub Copilot Enterprise(大規模のチームや企業向け)
2. Copilotプラグインをインストールする。
   1. IntelliJ から「Ctrl + Alt + S」で設定ダイアログを開く。
   2. 「プラグイン」から「GitHub Copilot」を検索してインストールする。
3. IntelliJとGitHubアカウントを連携する。(参照：[jetbrains-ide-での-github-copilot-のインストール](https://docs.github.com/ja/copilot/managing-copilot/configure-personal-settings/installing-the-github-copilot-extension-in-your-environment?tool=jetbrains#jetbrains-ide-%E3%81%A7%E3%81%AE-github-copilot-%E3%81%AE%E3%82%A4%E3%83%B3%E3%82%B9%E3%83%88%E3%83%BC%E3%83%AB))

## ランニングコスト
※2024/12時点の価格です。あくまで参考値として時価については[公式ドキュメント](https://docs.github.com/ja/billing/managing-billing-for-your-products/managing-billing-for-github-copilot/about-billing-for-github-copilot)を参照してください。
- GitHub Copilot Individual(個人向け)を利用する場合は10＄/月または100＄/年
- GitHub Copilot Business(中小規模のチームや企業向け)を利用する場合は19＄/月
- GitHub Copilot Enterprise(大規模のチームや企業向け)を利用する場合は39＄/月

## ざっくりとした使い方
大まかな使い方としては以下の2つです。

### 入力補完機能
1. IDEの入力補完機能のように、コーディング中に後の実装を提案してくれます。 提案を受け入れる際は「Tab」、受け入れない際は「Esc」を押します。
2. 提案が複数ある際には「Alt + ]」（次の提案を表示）または「Alt + [」（前の提案を表示）で選択できます。
3. 自動入力補完の候補はステップ単位(複数ステップ含む)で提案してきます。部分的に提案を受け入れる場合は以下参照。
    - 「Ctrl + →」で単語単位に受け入れ
    - 「Ctrl + Alt + →」でステップ単位に受け入れ
4. コメントで実装内容を具体的にすればより正確な提案をしてくれます。

### AIチャット機能
1. IntelliJの「Copilot Chat」アイコンをクリックし、プロンプトを入力します。
2. プロンプト送信時に参考ファイルを選択できます。
    - 明示的に指定する意外にもIntelliJで現在開いているファイルもCopilotは参考にします。現在開いているファイルについてのプロンプトならば指定しなくてもOK
    - 対象ファイルの一部分を示したい場合については、対象箇所を選択した状態で質問することによりCopilotが参照してくれます。

## ChatGPTとの違いについて
基本的にはChatGPTを利用したとしてもCopilotに求めることは概ね解決できるのではと思います。
しかし前提条件を含むプロンプトの入力やリアルタイムで候補を提案してくれる効率性についてはCopilotの方が断然使いやすい印象です。

## 利用シーン
- コーディングのサポート
- ペアプロ、モブプロのナビゲータのサポート
- コードの説明
  - 可読性が低いコードについて「/explain」で処理内容を説明してもらう。
- リファクタリングのお供に 
  - 「/fix」で修正箇所の提案をしてもらう。実装後に改善点がないか確認するのにも良いかも。
- テストコードの作成
  - 対象ファイルを開いている状態でCopilot Chatに「/test」と入力して送信すればテストコードを提案してくれます。
- スキルが浅い言語やライブラリの実装
  - 理解が浅いプログラミング言語やライブラリ学習/実装のスタートアップとしてはコードの一例を挙げてくれるのは心強いです。
  （提案してくれたコードが全て正しく動くかはまた別問題ですが）
- エラー原因と対策
  - ぱっとエラー原因が思いつかない場合にとりあえず聞いてみる。（あくまで参考までに）

## 利用者の声
- プロンプトを考える＆入力する手間が省けてChatGPTよりも楽に使えた。
- たまに頓珍漢な提案をしてくる。(該当コードで不要コメントが残っていたり、コメントが間違っていたのが原因？)
- 内容は単純だけど実装量が多い場合にCopilotを用いると大変効率よく作業できた。
- 仕様書作成時に既存クラスから項目の洗い出しをするのに助かった。
- 実装で悩んだ時に、とりあえず聞いてみる相談相手として重宝している。

## AIが進んだ未来の開発現場でありそうなこと
- 新人「AIが作ったのでバグの原因わかりません」からの 上司「お前が書いたコードだろー！」
    - 自分が書いたコードに責任は持とう。AIは責任まで持ってくれない。
- 上司「AIに頼んだ方が楽」というAIハラスメント
    - 心に思っても言葉にはしないようにしましょう。
    - 過信するのも良くないですが、使える環境であれば新人ほどCopilotを上手く利用しながら作業した方が効率良く作業出来るかも。

## 終わりに
ChatGPTやCopilotをコーディング中の調べもので使うのが割と当たり前になりつつあるなか、「ググる」とか「ggrks」とかはもう死語になりつつあるのかなとふと思いました。
(怖くて聞けない)AIにしてもGoogle先生にしても、利用者自身が考え、書いたコードに責任をもつことについてはいつの時代も変わらないのかもしれないですね。