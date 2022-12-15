---
title: AWS Glueを社内システムに導入した話
author: masafumi-kondo
date: 2022-12-16
tags: [advent2022]
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2022/
---
これは、[豆蔵デベロッパーサイトアドベントカレンダー2022](https://developer.mamezou-tech.com/events/advent-calendar/2022/)第16日目の記事です。
先日社内システム(Sales Support System 以下SSS)にAWS Glueを導入したため、その経緯と構築の流れを紹介させて頂きます。    

## 背景 
それまでSSSでは案件に関する情報をcsvとして出力する機能があり、これはプロジェクトの実績を確認、今後の見通しの予測に用いるための分析用途として使われておりましたが、それはユーザが人の手でExcelで行っているものでした。この度、分析部分を外部ツールであるTableauへ移譲し、そこへのデータ連携を自動化するためにGlue + Athenaを用いる事になりました。この組み合わせを選定した理由としては既にSSSがAWS上にデプロイされており、そこへのETL処理であれば同じAWS Serviceであれば比較的容易に行えることが予想された事と、SSS開発メンバーの中でGlueとAthenaを触れたことがいる者がいなかったため、その習熟を狙ったためです。

## アーキテクチャについて
以下はアーキテクチャとGlue、aurora、S3の連携部分のイメージ図です。
![アーキテクチャ](/img/sss/glue_for_analisis.png "アーキテクチャ図")  

こちらが今回構築したものとなります。GlueからENIを経由しS3に接続する必要があるためプライベートサブネットに対するVPCエンドポイントの設定をしています。 ENIはGlue Job実行時にDPU数分作成され処理完了後破棄されます。  
![glue](/img/sss/glue.png "glue")

## 構築の流れ
Glueを構築するにあたり以下の設定を行いました。  
- Connection設定
  - auroraへの接続設定を登録します
- Crawler設定
  - データのメタデータを収集しデータカタログとして作成するために必要になります。
- Job設定
  - 実際にETL処理を定義する場所になります。

### Connection設定に関して
以下はGlueのConnectionの設定画面です。こちらでは接続先DBのURL、認証情報、Glueが動作するSubnetや適用するSecurity groupsを登録します。認証情報に関してはSecrets Managerを参照させることもできますが、今回ハードコーディングとしました。また、こちらで登録するSecurity groupsには[こちら](https://docs.aws.amazon.com/ja_jp/glue/latest/dg/setup-vpc-for-glue-access.html)の手順通り、自己参照ルールを追加しています。接続のテストに関しては記載現在レガシーページ上からのみ可能なようです。   
![glue connection](/img/sss/glue_connection.png "glue connection")

### Crawlerの設定に関して
以下はGlueのCrawlerの設定画面です。こちらでは手順に従い利用するconnection設定の選択、参照するスキーマ、クロールのためのスケジュール設定等を行っています。
![glue crawler](/img/sss/glue_crawler.png "glue crawler")

### Glue Job部分の設定に関して  
今回は以下のような形で構築しています。    

| 項目           | 詳細                                               |
|--------------|--------------------------------------------------|
| Type         | Spark                                            |
| version      | Glue 3.0 - Supports spark 3.1, Scala 2, Python 3 |
| DPU数         | 2                                                |
| Job Bookmark | Disable                                          |
| source code  | Python 3                                         |

pysparkを用いてETL処理を実装しています。Glue Jobでは簡易的なETL処理であればGUIで作成可能でそこからpysparkのscriptへの変換が可能です。今回それをベースとし処理の詳細をコーディングしたためpysparkを用いています。  

また、データ数がさほど多くないことからDPU数は2とし、Job Bookmarkは有効にすることでInputデータ(今回だとaurora部分)に発生したデータ差分のみをOutput側(今回だとS3部分)へ連携する事が可能となるのですが、今回は無効としました。    

Job Bookmarkを無効とした理由としてはJob BookmarkはInsert分のみを差分と伝達するのですが、私達がInputとしたいデータはDeleteやUpdateが発生します。そうした更新差分をBookmarkでは扱えなかったため無効とし、都度全件洗替する形としました。  
S3上既存データ削除に関してはPython Script上で削除処理をさせるように記述しました。

以下はGlue JobのGUI上で作成した段階のイメージ図です。実際にはここからscriptへ変換、Custom Transformの場所で細かいデータ変換部分を作り込んでいます。作成したScriptはGlue Jobの画面からスケジュール設定可能なため夜間帯にS3に連携されるようにしています。
![Glue job イメージ](/img/sss/glue_job_image.png "Glue Job イメージ")
![Glue job Schedule](/img/sss/glue_job_scedule.png "Glue job Schedule")
:::alert
Glue Jobの編集に関してGUI → Python Scriptへは変換可能ですが、Python Script → GUIへは変換不可能なため注意ください。
:::

## 実行結果の確認
Jobの実行結果はGlue JobのRunsタブから確認可能です。Runsの画面からは実行結果や実行時間、各種ログへの遷移が可能です。  
![Glue job Runs](/img/sss/glue_job_run_after.png "Glue job Runs")

## 構築過程で発生した問題についてご紹介  
今回、構築を進める過程でDBへの接続情報をSecrets Managerから取得しようとした所、Jobの実行時に以下のようなエラーが表示されました。    

![Glue job 実行時エラー](/img/sss/glue_jobs_run_error.png "Glue job 実行時エラー")
このエラーだけでは何がなんだか分からないのでエラーログを見てみます。

```log
1668406098287,"22/11/14 06:08:18 ERROR ProcessLauncher: Error from Python:Traceback (most recent call last):
  File ""/tmp/for-developer-site-dummy.py"", line 33, in <module>
    transformation_ctx=""projecttable_node1"",
  File ""/opt/amazon/lib/python3.6/site-packages/awsglue/dynamicframe.py"", line 787, in from_catalog
    return self._glue_context.create_dynamic_frame_from_catalog(db, table_name, redshift_tmp_dir, transformation_ctx, push_down_predicate, additional_options, catalog_id, **kwargs)
  File ""/opt/amazon/lib/python3.6/site-packages/awsglue/context.py"", line 186, in create_dynamic_frame_from_catalog
    makeOptions(self._sc, additional_options), catalog_id),
  File ""/opt/amazon/spark/python/lib/py4j-0.10.9-src.zip/py4j/java_gateway.py"", line 1305, in __call__
    answer, self.gateway_client, self.target_id, self.name)
  File ""/opt/amazon/spark/python/lib/pyspark.zip/pyspark/sql/utils.py"", line 111, in deco
    return f(*a, **kw)
  File ""/opt/amazon/spark/python/lib/py4j-0.10.9-src.zip/py4j/protocol.py"", line 328, in get_return_value
    format(target_id, ""."", name), value)
py4j.protocol.Py4JJavaError: An error occurred while calling o89.getCatalogSource.
: java.util.NoSuchElementException: None.get
	at scala.None$.get(Option.scala:349)
	at scala.None$.get(Option.scala:347)
	at com.amazonaws.services.glue.util.DataCatalogWrapper.$anonfun$getJDBCConf$1(DataCatalogWrapper.scala:218)
	at scala.util.Try$.apply(Try.scala:209)
	at com.amazonaws.services.glue.util.DataCatalogWrapper.getJDBCConf(DataCatalogWrapper.scala:209)
	at com.amazonaws.services.glue.GlueContext.getGlueNativeJDBCSource(GlueContext.scala:487)
	at com.amazonaws.services.glue.GlueContext.getCatalogSource(GlueContext.scala:320)
	at com.amazonaws.services.glue.GlueContext.getCatalogSource(GlueContext.scala:185)
	at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
	at sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:62)
	at sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
	at java.lang.reflect.Method.invoke(Method.java:498)
	at py4j.reflection.MethodInvoker.invoke(MethodInvoker.java:244)
	at py4j.reflection.ReflectionEngine.invoke(ReflectionEngine.java:357)
	at py4j.Gateway.invoke(Gateway.java:282)
	at py4j.commands.AbstractCommand.invokeMethod(AbstractCommand.java:132)
	at py4j.commands.CallCommand.execute(CallCommand.java:79)
	at py4j.GatewayConnection.run(GatewayConnection.java:238)
	at java.lang.Thread.run(Thread.java:750)

"
```
JDBCConf周りでエラーが出ていることが分かります。 この事から何かしらの理由でGlueからDBの接続設定が取得できないのではと推測しました。ただ、DB接続設定は正しいものをしていしており、Glue Crawler単体では動作できます。   

## 確認した点    

### Secrets Manager用のVPCエンドポイント設定追加  
これはJobがCrawlerと別の場所で動きSecrets Managerにアクセスできないのではという推測の元に行ったことですが、結果としては解決には至りませんでした。今回はGlue Connectionに設定しているのと同じくDB用サブネットの値を設定しましたが、ただ現状Jobが動く場所が不明であるため、エンドポイントに設定するサブネットの値が間違っている可能性があります。この辺り今回の活動で詰めきれなかったので追っていきたい箇所です。 

### Glue用ロールのポリシー変更
当初Glue用のポリシーとしてかなり絞られた権限設定を行っていたのですが、AdministratorAccess 権限を用いても変化が無かったため、権限関連の問題ではないと考えます。  

## 暫定解決策
再度設定項目の見直しと変更を行っていたところ、GlueのConnectorにてSecrets Managerを使わずユーザ名とパスワードを直書きしたところJobが正常に動作する事を確認しました。根本的な対応方法は不明なままですが一旦DBへの認証情報は手打ちする形で本機能のリリースとなりました。    

## まとめ 
今回、初めてGlueを導入するに至った背景と動作までの流れ、躓いた点などを紹介させていただきました。Glueのサンプルはそれなりに存在するのですが今回のようにプライベートサブネット内のDBが起点となるケースが少なく、Glueやその周辺サービスへの理解の大切さが身にしみました。


