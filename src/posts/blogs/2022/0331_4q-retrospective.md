---
title: 豆蔵デベロッパーサイトローンチから4ヶ月のふりかえり
author: masahiro-kondo
date: 2022-03-31
---

本サイトもローンチから4ヶ月経ちました。

[「豆蔵デベロッパーサイト」ローンチのお知らせ | 豆蔵デベロッパーサイト](https://developer.mamezou-tech.com/blogs/site-launch/)

この期間の活動を軽くふりかえってみます。

[[TOC]]

# 継続的な記事公開
当初からある「コンテナ」カテゴリー。

[コンテナ | 豆蔵デベロッパーサイト](https://developer.mamezou-tech.com/container/)

Kubernetes チュートリアルが、環境構築編、開発編を経て運用編に突入。ハンズオン形式で実践的な内容になっていると思います。チュートリアル以外の活用編の記事を含めると30本近くの記事を公開しています。

「マイクロサービス」カテゴリーが新規に追加されました。

[マイクロサービス | 豆蔵デベロッパーサイト](https://developer.mamezou-tech.com/msa/)

このカテゴリーの皮切りとしてマイクロサービスフレームワーク MicroProfile についての連載が開始されました。Spring と違って情報の少ない Jakarta EE ベースのフレームワークを扱っていて、エンタープライズシステム構築を支援している弊社らしいユニークなコンテンツだと思います。

[逆張りのMicroProfile ～ Helidonで始めるマイクロサービスへの一歩 ～](http://developer.mamezou-tech.com/tags/逆張りのMicroProfile//)

連載記事以外のブログは30本に達しました。

[ブログ | 豆蔵デベロッパーサイト](https://developer.mamezou-tech.com/blogs/)

比較的記事が多いのは以下のタグです。

- [“CI/CD”タグの記事 | 豆蔵デベロッパーサイト](https://developer.mamezou-tech.com/tags/ci/cd/)
- [“scrapbox”タグの記事 | 豆蔵デベロッパーサイト](https://developer.mamezou-tech.com/tags/scrapbox/)
- [“AWS”タグの記事 | 豆蔵デベロッパーサイト](https://developer.mamezou-tech.com/tags/aws/)

Google の検索ランキングもかなり上がって、クリック数も上昇してきました。

- ローンチ時点からあるコンテンツが継続的に検索にヒットしている
- 更新頻度を維持している
- かなり読まれた記事が何本かあり認知度が高くなってきた
- ローンチ以降 UX を改善している

などなど、複数の要因があると思います。

# 継続的なサイト改善

以下のような改善・機能追加を積み重ねてきました。

- 公開直後にデザインリニューアル。豆蔵のキャラクター「豆くん」をシルエットにしたロゴも新調
- ソーシャルボタン追加
- 長い記事を読みやすく構造化するための目次機能の追加
- ベータ版から使用している SSG の [Eleventy](https://www.11ty.dev/) を GA バージョンに移行
  - このサイトは [Netlify](https://www.netlify.com/) でホストしてますが [Eleventy が Netlify のスポンサーを受けた](https://www.11ty.dev/blog/eleventy-oss/)ようですね。今後の継続と発展に期待できます。
- 記事内のコードスニペットをクリップボードコピーする機能の追加
  - これは 独立した Eleventy プラグインとして OSS 化されました。
    - [eleventy-plugin-code-clipboard](https://www.npmjs.com/package/eleventy-plugin-code-clipboard)
- 記事タイトルから OGP イメージを自動生成する機能の追加
  - 記事投稿の Pull Request を作成すると GitHub Actions でイメージが生成されます。
- 校正チェックツールとして textlint を導入
- 情報ボックス(注意喚起やコラム的な文章)を挿入する機能の追加
- Mermaid 記法のサポート
  - GitHub の Markdown でも使えるようになったので。いくつかの記事で活用されてます。
- Google Search Console からのエクスペリエンスの指摘対応

Kubernetes チュートリアルを執筆している工藤さんがサイト自体の改善も中心にやってくれています。読者・執筆者双方の体験がよくなってきていると思います。

# 社外アピール
公式 Twitter アカウント [@MamezouDev](https://twitter.com/MamezouDev) を開設しました。RSS フィードからの自動投稿のほか、時折フォローアップ的なツイートをしています。

豆蔵本家のトップページにもバナーを置いています。

[ホーム | 株式会社豆蔵](https://www.mamezou.com/)

月次でホームページのニュースでも人気記事を集計して紹介するようにしました。

[ニュース | 株式会社豆蔵](https://www.mamezou.com/news)

[豆蔵デベロッパーサイト2022年2月の人気記事](https://www.mamezou.com/news/techinfo/20220302)

同内容は Facebook の豆蔵ページにも投稿しています。

[株式会社豆蔵 | Facebook](https://www.facebook.com/mamezou.jp)

# 社内アピール
今は立ち上げ期で、スタッフのモチベーションが高く更新も活発ですが、持続可能な活動にするため参加者を増やしていく必要があります。折にふれて Scrapbox や Slack などで地道にアピールしています。

- 月次レポートを Scrapbox に掲載
  - 当月の記事紹介
  - 新しく執筆陣に加わった人をフィーチャー
  - Google Analytics、Google Search Console、Twitter Analytics サマリー
  - 月次レポートは Slack の #random チャネルで宣伝
- Slack に誰でも入れるデベロッパーサイト専用チャネルを作成
  - 記事執筆時のレビュー依頼や意見交換、新着記事の通知などに活用
- 社内イベントに参加して宣伝
  - 案件・技術パネル展
  - ハッカソン

継続的に記事を書いてる人は当初の2名から4名に、1度以上記事をかいた人は7名になりました。

# まとめ
以上、ローンチ以降の記事執筆、サイト改善、社内外へのアピールなどの活動についてふりかえってみました。自社メディアを立ち上げるのは初の経験なので試行錯誤しながらも楽しく活動できています。
4月からは実質的に2クール目を迎えます。さらに開発に役立つサイトとして育っていきたいと考えてます。
引き続き豆蔵デベロッパーサイトをよろしくお願いいたします。
