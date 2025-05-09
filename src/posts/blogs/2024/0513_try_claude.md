---
title: Claude 3 を使ってみたら「こんなアプリ作れたらいいなぁ」と温めていたアイデアがこいつですんじゃいました。
author: tadahiro-imada
date: 2024-05-13
tags: ["生成AI", Claude]
image: true
---

# はじめに
こんにちは、今田です。
豆蔵社内のイベントで、AWSの生成AI勉強会があるというので、Claude 3 をちょっと触ってみようと思いました。

ChatGPTの情報はちょこちょこ追っていたので、「普通に人に頼むように口語で話しかけたら、人間みたいに返してくれるんだろうな」という感じで30分くらい使いました。

「何を頼もうか？」と思ったときに、「そういえば昔考えて温めていたスマホアプリのアイデアがあったんだけど、それってAIでもできちゃうんじゃないか？」と思いついたので試してみたら、できちゃったという話です。
数年前に「このアイデアいいじゃん」と自画自賛してた間に、AIにやられてしまったという話です。

そのアイデアがこちら。
**原材料表示をスマホカメラで間違いなくチェックできるアプリがあったら便利だし、外国語にも対応したら旅行でも助かるし、輸入商品やお土産もチェックできて超安心じゃないか！**

## 背景（読み飛ばしOK）
うちの家族は、
- 奥さんがエビカニなどの甲殻類アレルギー
- 上の娘が卵、魚卵、タコなどのアレルギー
- 下の娘が（今は克服したものの）、数年前まで乳製品アレルギー

と、いろいろなアレルギー持ちで構成されており、食べるものには大変気を使います。
そして、買い物するときに原材料表示をじっくり確認するのですが、見逃してしまってうっかり食べてしまい、下痢・嘔吐・呼吸困難などになってしまったこともあります。本当に危ない。

見逃すというのもいろいろとパターンがあり、気を付けることが多くて大変です。
- 原材料表示に書いてあったけど、目に入らなかった→別の人も見てダブルチェックするようにしました
- 王将の冷凍餃子には卵成分が入っていないので、冷凍されていない餃子を買って原材料表示を見なかったら、実は冷凍されてない方には卵成分が入っていた→同じ店の同系列の商品でもチェックするようにしました
- 昔聞いたときは入っていなかったので、同じメニューを頼んで食べたら、いつからか卵を使うようになっていた

さらに、製品が小さいと原材料表示の場所も小さいので、字が小さくて読めないという老眼泣かせ問題もあります。

といろいろ雑談を書きましたが、
**原材料表示をスマホカメラで間違いなくチェックできるアプリがあったら便利だし、外国語にも対応したら旅行でも助かるし、輸入商品やお土産もチェックできて超安心じゃないか！（再掲）**
今だったらスマホのカメラで撮影したらテキスト化できるOCR機能もありそうだし、外国語を日本語に翻訳する機能もありそう。
「自分や家族のアレルギー情報を登録しといてカメラでパッとチェック出来たら需要あるんじゃないか！？」と思ったのです。
あと、こういうのって勉強のお題にもなりそうだから、「社員何人かでユースケース書いたりクラス図モデリングしつつ、議論して揉んだり、Flutterとかでちゃちゃっとアプリ作ったら楽しそう！」と思ったりしてました。
私はアイデア考えたり設計とか実装とか主要なところをやるのは好きなんだけど、ちゃんとやり遂げるのは面倒なので、「だれか一緒にやんないかな～」と思ってるうちにコロナでいったんそれどころじゃなくなって、今に至ります。

# やりたかったこと
ちょっと落書きしてみました。

![落書きクラス図](/img/blogs/2024/0513_try_claude/model.png)

- アレルゲンはあらかじめ登録しておきます
- 原材料画像をスマホカメラとかで入力にします
- 原材料画像をOCRで原材料テキストに変換します
- 原材料テキストが自国語じゃなかったら翻訳します
- 原材料テキスト（自国語）にアレルゲンが含まれるか判定します
- できたらいいこと
  - 直接は記載されていないんだけど、アレルゲンとセットで含まれることが多い材料があったら警告してくれる

# Claudeで試してみたこと
こんな質問をしてみました。

**私**：お菓子の原材料が記載してある部分を写真に撮ってアップロードしたら、そこにアレルゲンが含まれているか確認できますか？

**クロード**：はい、お菓子の原材料表示を写真に撮ってアップロードしていただければ、その写真からアレルゲン物質が含まれているかを確認することができます。ただし、実際の写真がこの対話にアップロードされていないので、もしアップロードしていただけましたら、その写真から原材料を読み取り、アレルゲンの有無をお伝えします。

やっぱりできるんだ！！

ここで、適当に原材料が表示されているドレッシングの画像を見つけてきて、無言でアップロードしてみました（以下の画像は私が作成したイメージです）。

![ドレッシングの原材料表示画像](/img/blogs/2024/0513_try_claude/ingredientsLabel1.png)

**クロード**：この商品の原材料表示から、アレルゲン物質として卵、乳製品、小麦が含まれていることがわかります。アレルギーのある方は、卵、乳製品、小麦に対して気をつける必要がありそうです。そのほか、主な原材料として植物油脂、砂糖、チーズ、レモン果汁なども使われています。

すげぇ丁寧…。
こりゃ多分外国語でも行けるな…、ということで次の質問。

**私**：ありがとう。外国語の表示でも卵が含まれているかわかるかな？

**クロード**：はい、外国語の表示でも卵が含まれているかどうかを確認することができます。多くの国で、食品アレルゲンの表示は法律で義務付けられており、卵はその主要なアレルゲン物質の1つとしてリストアップされています。
例えば英語表記では "eggs" や "egg"、フランス語では "oeufs"、スペイン語では "huevos"、中国語では "蛋"や"鸡蛋"など、言語は違えど卵を表す単語が原材料欄に記載されていれば、卵が含まれているということがわかります。
ですので、外国語の原材料表示でも、言語に関係なく卵を表す単語があれば、その製品に卵が使われていると判断することができるでしょう。

すげぇぇぇぇ！
聞いたこと以上にいい感じの補足情報もくれるじゃん。

ここで、なんか外国語の原材料表示画像がないかと探して適当に無言でアップロードしてみました（以下の画像は私が作成したイメージです）。

![なんか外国語の食品ラベル画像](/img/blogs/2024/0513_try_claude/ingredientsLabel2.png)

**クロード**：この画像は、新しい栄養成分表示ラベルの見本を、以前のラベルと比較する形で示しています。主な変更点として、新ラベルでは添加糖の量が独立して表示されるようになり、タンパク質の量も追加されています。また、一部の栄養素について、1日の推奨摂取量に対する割合が%で表示されるようになっています。卵が特に含まれているかどうかは、この画像からは確認できませんが、食品ラベルの情報がより詳細になり、消費者にとってわかりやすくなる変更点が確認できます。

あ、原材料表示じゃなくて栄養成分表示だったのか…。丁寧に教えてくれたし、この画像からは確認できないってことと、この画像で確認できることを教えてくれた。

また別の画像を探して無言でアップロード（以下の画像は私が作成したイメージです）。

![なんか外国語の食品ラベル画像2](/img/blogs/2024/0513_try_claude/ingredientsLabel3.png)

**クロード**：この製品の原材料リストを確認したところ、卵が含まれていることがわかります。具体的には"EGG YOLKS"と記載があり、これは英語で卵黄を意味します。ですので、この製品には卵が使用されている可能性が高いので、卵アレルギーのある方は注意が必要です。その他の主な原材料としては小麦粉、食塩、ミルクプロテイン濃縮物などが確認できます。

す、素晴らしすぎる…。具体的にこの表記だよって教えてくれるのも親切だなぁ。

# おわりに

ということで、私が作りたかったアプリは作る必要がなく、スマホにClaudeアプリを入れればOKということがわかりました。
今度娘が修学旅行で海外に行くので、教えてあげようと思います。