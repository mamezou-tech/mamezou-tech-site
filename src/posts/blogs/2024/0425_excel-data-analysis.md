---
title: Excelを使って簡単にオープンデータを分析する
author: shinichiro-iwaki
date: 2024-04-25
tags: [ 新人向け, 小技]
image: true
---

少し前までは防寒着が手放せなかったのですが、すっかり暖かくなりましたね。外に出るとピカピカのランドセルやパリッとしたスーツを身に纏い、新生活に心躍らせていそうな人の姿が目にも眩しく映ります。今でこそマナー、ナニソレな言動が多くなりつつある(らしい)筆者ではありますが、ン年前[^1]の新社会人時代にはビジネスマナーやら文書作成やら、ビジネススキルを含む研修に右往左往していたことを懐かしく思い出します。  

さて、新人研修でよく登場するツールにみんな大好き表計算ツールのExcelがあるかと思います。ビジネスユースのWindowsPCにはほぼインストールされていることもあり、ユーザーの好きが高じてプロジェクト管理ツールやお絵描き/モデリングツール[^2]として本来のツール機能外で活躍することもあるかと思います。しかし、このツールの本来のウリは、表形式のデータに対する加工/分析をサポートする柔軟な機能[^3]にあるはずです。  

[^1]: 年齢を隠したいわけではないですよ。来年以降もこの記事に辿り着いた人が誤解しないようにとの配慮です(ということにしておいてくださいネ)  

[^2]: 簡易に図を作れる機能は便利ですし、超絶技巧でExcelお絵描きする話題は定期的に目にします。お仕事をしているとExcelで書かれたフローチャートやらシーケンスのような図を目にすることもあります(よね？)。個人的にはUMLモデルのような継続的に変更されていく図を描ならばExcelよりは専用のツールをお勧めしたいところではあります。ただの「絵」だと影響箇所を漏らさずに更新する作業なども大変ですしね  

[^3]: 分析手段などが定まっていれば分析処理を作成したりしてしまったほうが効率は良いですが、視点を変えながら「こういう見方をすると、、、な傾向が見えるのか」といった作業をするにあたっては、非常に強力なツールです  

ということで、社会人の初心を思い出しながら、比較的簡単に使えるデータ分析ツールをExcelの機能で実現してみます。分析するデータは何でも良いのですが、せっかく「デベロッパー」サイトですのでWebから取得可能なデータを題材としてみましょう。  

## 分析対象のデータ取得
まずは分析対象となるデータをExcelに入力していきます。特定のソースからデータを取得する手段として、ExcelにはPowerQueryという機能が組み込まれていますのでローコードで[^4]データの入力処理を定義できます。筆者の環境(Office365 V2403)では「データ」メニューからの操作[^5]が可能です。リボンメニューから「データの取得」を選択すると、ファイルやデータベース、APIなどの様々なデータソースを設定可能なことが分かります。  

![DataSource](/img/blogs/2024/0425_excel-data-analysis/datasource-menu.jpg)

[^4]: 簡単なデータの取得/加工処理であればGUI操作だけで設定ができます。処理の実体はPower Query M式言語(M言語)と呼ばれる関数型言語で記録されるため、GUIからの設定では実現できないような凝った処理を実現したい場合などには直接M言語のコードを編集してデータの取得処理を作成可能です。  

[^5]: Excel2016以上のバージョンであれば標準機能として組み込まれているようですので、見た目やメニュー位置などに多少の違いはあるかもしれませんが同様のことが可能だと思います。  

筆者がよく使うGitホスティングサービスのGitlabはREST形式などのAPIを公開[^6]しており、これを介して様々な情報を取得可能です。例えば`/projects`にリクエストを送ることでプロジェクトの一覧データをjson形式のデータで応答してくれます。  

![ApiSample](/img/blogs/2024/0425_excel-data-analysis/api-example.jpg)

[^6]: 具体的に説明しだすと日が暮れる量になりますので、詳細は[公式ドキュメント](https://docs.gitlab.com/ee/api/rest/)などを参照して下さい  

上記のように誰でも自由にアクセス可能なAPIもありますが、ほとんどのAPIはアクセスに際して認証が必要となりますので、事前準備としてGitlabにサインインしてread-api(以上の)操作を許可したアクセストークンを発行し、控えておきます。  

![Token](/img/blogs/2024/0425_excel-data-analysis/gitlab-token.jpg)

PowerQueryのデータ取得元として「その他のデータソース」->「web」と選択するとURLを入力するダイアログが起動します。認証不要なAPIであればURLを入力するだけでも良いのですが、ここでは例として筆者アカウントで作成したプロジェクトの一覧(`/users/:ユーザーID:/projects`)を取得してみます。ダイアログ上で「詳細設定」を選択するとアクセス先のURL以外に送信するヘッダ情報などが設定可能ですので、GitlabのAPI仕様に従ってPRIVATE-TOKENヘッダでGitlabのアクセストークンを送信するように設定します。  
なお、詳細設定ではアクセス先のURLの値を複数行に分割して設定可能ですので、サンプルでは人によって変わるユーザーIDが1行になるように設定していますが(この時点では)分かりやすくする以外の意味合いはありません。  

![RequestSetting](/img/blogs/2024/0425_excel-data-analysis/datasource-setting.jpg)

必要な内容を設定して「OK」するとPowerQueryエディタ画面に切り替わって、APIから取得したデータが表形式で表示されます。Gitlabが返却するデータはjsonフォーマットのデータのため「Record」が並んだ表になっていますが、このRecordごとにプロジェクトのjsonデータが含まれています。試しにどれか1Recordをクリックすると選択したRecordの内容が確認できます。  

![DataRecord](/img/blogs/2024/0425_excel-data-analysis/datasource-record.jpg)

PowerQueryエディタ画面上での操作はデータに対する処理ステップとして記録されるため、エディタ右下の「適用したステップ」欄は「ソース」と「ナビゲーション」が記録されているはずです。「ソース」はAPIからのデータ取得、「ナビゲーション」はクリックしたデータの内容表示です。「ナビゲーション」は確認用の操作ですので、ステップの左側に表示される✘アイコンで削除できます。    

さて、せっかく取得したデータもjson形式のままではExcelでの分析には向きませんので、データを表形式に変換していきます。これはエディタの「変換」メニューから「テーブルへの変換」で実行できます。変換の際に区切り文字や余分な列の処理方法を選択できますが、今回のデータは特に区切り文字での分割やエラー処理も必要ないのでデフォルト設定で変換します。  
変換後の状態はパッと見では変化がないようにも見えますが、先頭行の見た目がテーブルデータに変わっています。この状態でRecordを選択するとデータが表形式に変わっていることが確認できます。  

![DataTable](/img/blogs/2024/0425_excel-data-analysis/datasource-table.jpg)

データをテーブルに変換した後は、Record中の各行の値を列に展開できるようになります。テーブル右上のアイコンをクリックすると展開したい行(データ項目名)を選択できますので、必要な行を指定して展開するとRecordの内容が列に展開されます。  

![DataExtract](/img/blogs/2024/0425_excel-data-analysis/datasource-extracting.jpg)

また、エディタ上でデータのフィルタリング、ソートや変換などの操作も可能です。例えば、Gitlabから取得した「作成日時」などの日付データは`2023-06-22T12:13:43.053Z`のような標準時間[^7]を表す文字列ですが、文字列のままだと分析がし辛いので日付や時刻のデータに変換したりできます。  

![DataConversion](/img/blogs/2024/0425_excel-data-analysis/datasource-conversion.jpg)

[^7]: 最後の「Z」が標準時間(UTC)を意味しています。これは時差を1時間ごとにアルファベットで(時差+1時間をA、・・・-12時間をY)した表記から来ており、時差0の標準時間はZで表記されます。時差を考慮する必要があるシステムなどでよく使われる表記で、Zの通信コードのZuluをとってズールー時間と呼ばれたりもします。以上、ただの雑学でした  

エディタ上で「閉じて読み込む」ことで取得したデータをExcel上に読み込ませることができるので、Excelの機能を活用したデータの分析に繋げることができます。ここまでの操作は「クエリ」として記録されるので、Gitlab側のデータに変更があった際にはデータを「更新」することで最新のデータを反映できます。  

![DataExtract](/img/blogs/2024/0425_excel-data-analysis/extract-table.jpg)

## ピボットテーブルを使ったデータの分析
表形式のデータを眺めて分析を進めることもできますが、Excelには分析をサポートするピボットテーブル[^8]という機能があります。今回の例はデータ量も少ないのでそのまま眺めても良いのですが、データ量が多くなった際などには膨大な表を眺めて分析をするのは辛いものがありますよね。そんな時にUI操作で簡単にデータの集計などが可能です。  

[^8]: 多機能で自由度の高いツールですので、真面目に説明すると本が書けると思います。様々な方が技術情報を紹介していますので詳細はそちらに譲り、本稿では基本的な使い方を紹介します  

Excel上のテーブルに対するピボットテーブル分析もできますが、せっかくですので取得したデータをそのままピボットテーブルに表示してみましょう。先程作成したクエリの右クリックメニューでデータの読込先を変更できます。  

![PivotImport](/img/blogs/2024/0425_excel-data-analysis/pivot-import.jpg)

読込先をピボットテーブルにすると、取得データに対するピボットテーブルの設定メニューが表示されます。ピボットテーブルは選択した項目の値(合計値、平均値など)や個数を、縦軸(行)と横軸(列)に選択した項目の単位で集計した表を作成します。また、入力データのうち表に含む範囲をフィルタで絞り込むような設定も可能です。試しに`Column1.id`のデータを「値」欄に、`Cloumn1.created_at`のデータを「行」欄にドラッグしてみると、Gitlabから取得したプロジェクトデータのIDを作成日時ごとに集計したテーブルが作成できます。  

![PivotInitSetting](/img/blogs/2024/0425_excel-data-analysis/pivot-create.jpg)　

利用するExcelのバージョンにより多少の違いはあるかと思いますが、選択したデータに応じて集計する内容や値のグループ化が自動的に行われます。筆者の環境ではID(数値)は合計値で集計され、作成日時(日付)は年/四半期/月でグルーピングされました。この設定は右クリックメニューなどから自由に変更可能ですので、意図した内容と違っている場合には簡単に変更できます。  

![PivotConfig](/img/blogs/2024/0425_excel-data-analysis/pivot-config.jpg)  
![PivotTable](/img/blogs/2024/0425_excel-data-analysis/pivot-table.jpg)  

今回の集計ではIDの合計値を見てもあまり意味がないので集計をデータの個数に変更しました。データ量も少ないので四半期ごとのグルーピングも解除しています。  
また、作成したピボットテーブルのグラフ化もリボンメニューの「ピボットグラフ」から実行できます。せっかくなので横軸やフィルタも設定してグラフ化すると、月ごとに作詞したGitlabプロジェクトの集計結果が簡単にまとめられます。  

![PivotConfig](/img/blogs/2024/0425_excel-data-analysis/pivot-graph.jpg)

## まとめ
GitlabのAPIから取得できるデータを題材に、Excelの機能を使った簡単なデータ分析の手法を紹介しました。簡単なサンプルですので、作られる表やグラフは手作業で作成することも簡単なのですが、データ量が多いケースやデータの更新が頻繁なケースなどでは非常に有用です。  
データ分析には有用なツールも多いですし、本格的な分析をするのであれば処理をコーディングしてしまったほうが効率的かもしれません。しかし、簡単にデータを分析したり分かり易い見せ方をしたい[^9]際にはExcelだけでも実現可能ですので、便利に普段使いできます。  
簡単な紹介をしようと思ったのですが意外に長い記事になってしまいました。PowerQueryの機能を使い込んで(多少はコーディングもして)データ分析を作り込んでいく部分については改めて紹介します(反響があれば、、、)。  

[^9]: 分析したグラフを持っていった時に、「いやワタシはjsonのほうが頭に入るから生データを見せてくれ」って言う人は多分いませんよね。「こういう見方もしてみたいんだけど」なんて時にはピボットテーブルのデータをチョコチョコと操作して見比べることもできるので、先輩の評価も爆上がりになること間違いなし だと思いますヨ  
