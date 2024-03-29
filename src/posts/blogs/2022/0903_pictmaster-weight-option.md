---
title: ペアワイズ法テストケース生成ツール「PictMaster」の重みを使う
author: shuichi-takatsu
date: 2022-09-03
tags: [テスト, pairwise, pict, pictmaster]
---

[前回](/blogs/2022/08/08/pictmaster-alias-option/)はペアワイズ法テストケース生成ツール「PictMaster」の”エイリアス”について紹介しました。  
今回はPictMasterの”重み”機能について紹介したいと思います。


## 組み合わせの一部を他より多くテストしたい場合

２因子網羅のテストケースを効率よく生成するペアワイズ法ですが、特定の因子・水準データだけを他の組み合わせよりも多くテストしたい場合、テストケースの生成方法に工夫が必要になります。  
例えば、特に重要な因子・水準は他の因子・水準よりも重点的にテストしたい場合などが該当します。

以前使用したテストケースの例題で考えてみましょう。  
例題は以下のような因子・水準でした。  
・OS (Windows, Linux, macOS)  
・ブラウザ (Firefox, Chrome)  
・Java (バージョン8, バージョン11)  

デフォルトの設定でテストケースを生成した場合は以下のようになります。

![](https://gyazo.com/4c35e7b9029c59b970a647c6560242c5.png)

全テストケース数は6個になります。

今回、多くのユーザが使用するChromeを他の因子・水準よりも多くテストケース上に出現させたい場合を考えます。  
それではPictMasterを使ってテストケースを作ってみましょう。

## 重みの設定

要求を「Chromeが登場するテストケースの数を、Firefoxの2倍にしたい」とします。  
PictMasterのパラメータ／値シートに以下のようにデータを設定します。

・OS (Windows, Linux, macOS)  
・ブラウザ (Firefox, Chrome(2))  
・Java (バージョン8, バージョン11)  

![](https://gyazo.com/8e55134720cac5aca04ffdcac0d67207.png)

パラメータ「ブラウザ」の「値」の部分を次のように記述しています。  
`Firefox, Chrome(2)`

テストケース上にChromeが出現する組み合わせをFirefoxのそれよりも2倍多くしたい場合、対象の因子・水準の値の後ろに「（２）」のように重みの値を追記します。  
(ただし、場合によって希望する倍数のテストケースが生成できないケースもあります。理由は後述します)

この設定でテストケースを生成すると以下の結果が出力されました。

![](https://gyazo.com/bf245152314784e0076944a208f57e82.png)

全テストケース数は7個になりました。

このようにChromeが登場するテストケース数がFirefoxのそれよりも数が多くなりました。  
しかし、Chromeの出現回数が指定した2倍の数になっていません。  
- Chrome : 4回
- Firefox: 3回

これはどういうことなのでしょうか。

## 重複した組み合わせテストケースは削除される

PictMaterの取扱説明書によると  
「重複した組み合わせのうち１つを残して他の組み合わせを削除します。そのため重複した組み合わせが存在する場合は、結果的に重み付けで指定した数値より少ない重み付けとなります。」  
とあります。  
パラメータ／値のセットによっては、組み合わせテストケースを生成した時に重複したテストケースが生成され、重複したテストケースは１つを残してその他が削除されるようです。  
何個のテストケースが削除されたかを知るには、環境設定フォームで「統計情報を表示」を指定することで確認することができます。  

環境設定で「統計情報を表示」をチェックしておきます。  

![](https://gyazo.com/e8ddfd6d7f916c0dcec415bd8b095639.png)

この状態でテストケース生成を実行すると、次のようなダイアログが表示されます。

![](https://gyazo.com/4f0779239bc09343ff93421c24b126f7.png)

上記の情報によると、もともと生成されたテストケース数は9個であり、そこから重複を取り除いた結果として、最終的にテストケース数は7個になったということがわかります。

PictMaterの取扱説明書によると  
「重み付けの数値が正確に反映された生成結果が得られるのは、他のパラメータの数が多い場合か、他のパラメータで値の数が多い場合です。この場合は重複が起こらず、生成されるテストケース数も重み付けを行なわない場合と比べてそれほど増加することはありません。そうでない場合、重み付けの数値は目安的な意味合いを持ちます。」  
とあります。  
重み設定はあくまで”目安”と考えた方が良いようです。

重複が発生しない組み合わせを考えてみましょう。  
以下のようなパラメータ／値を考えてみます。  

![](https://gyazo.com/525e8b9fbdff9bd8d6b6237bcf88a625.png)

パラメータbの値「b3」の重みを「2」に指定しています。  
上記の組み合わせテストケース生成の結果は以下のようになりました。

![](https://gyazo.com/74426f9a509ec23edd779e4ea4ea741a.png)

パラメータbのそれぞれの値の出現回数は  
- b1: 2回
- b2: 2回
- b3: 4回

となっています。  
b3は、b1,b2より2倍多くテストケースに出現しています。  
また統計情報として重複削除前と重複削除後の生成数はそれぞれ8回となっており、重複が発生していないことがわかります。

![](https://gyazo.com/72138e12867a486f74f163e1951808c8.png)

## まとめ

「重み」機能を使うことによって、重点的にテストしたい組み合わせを他のテストケースよりも多く生成することが出来ました。  
しかしテストケースが重複した場合、重複分のテストケースは削除されるので、重複がどれだけ発生したかについて知るには、統計情報の表示オプションを使って確認する必要があることがわかりました。  
PICTには他にも色々なオプションが用意されていて、PictMasterから利用可能です。  
次回も別のオプションを紹介していきたいと思います。

[ソフトウェアテストに関する技法やテクニックをまとめています。](/testing/)

テストに活用していただければ幸いです。
