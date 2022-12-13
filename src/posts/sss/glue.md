---
title: AWS Glueを社内システムに導入しようとしてハマったことと対応
author: masafumi-kondo
date: 2022-12-16

---

先日社内システム(Sales Support System 以下SSS)にAWS Glueを導入しようとしたところ躓いたため、    
生じた問題点と対応に関して紹介いたします。  
結論から申し上げますと今回根本原因が不明であったため暫定対応を取ったという話になっております。    

## アーキテクチャについて  
&nbsp;  
![アーキテクチャ](/img/sss/glue_for_analisis.png "アーキテクチャ図")  
<div>図. アーキテクチャ</div>
&nbsp;
&nbsp;

今回、SSSで保持している案件に関する情報からAWS外部の分析ツールにて分析し、  
プロジェクトの実績を確認、今後の見通しの予測に用いるためGlue + Athena の環境を構築しました。　　
こちらの図は当初の想定です。  
GlueのJobとCrawlerは定期的にプライベートサブネット内のauroraにアクセスしデータの収集を行います。  
DBへの接続設定に関してはGlue Connector内からSecrets Managerを参照する形としました。  

### Glue Jobの設定に関して  
今回は以下のような形で構築しました  

| 項目          | 詳細                                               |
|-------------|--------------------------------------------------|
| Type        | Spark                                            |
| version     | Glue 3.0 - Supports spark 3.1, Scala 2, Python 3 |
| source code | Python 3                                         |

&nbsp;
![Glue job イメージ](/img/sss/glue_job_image.png "Glue Job イメージ")  
<div>図. Glue Jobのイメージ</div>
&nbsp;
&nbsp;

こちらはJobのおおよそのイメージとなります。
実際にはデータ加工がある程度複雑となったためPythonでScriptを手書きしています。  

## 発生した問題について  
構築を完了し、Jobを実行したところ以下のようなエラーが実行画面に表示されました。    

&nbsp;
![Glue job 実行時エラー](/img/sss/glue_jobs_run_error.png "Glue job 実行時エラー")
<div>図. Glue Jobの実行画面</div>
&nbsp;
&nbsp;

このエラーだけでは何がなんだか分からないのでエラーログを見てみます。  

&nbsp;
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
&nbsp;

JDBCConf周りでエラーが出ていることが分かります。
この事から何かしらの理由でGlueからDBの接続設定が取得できないのではと推測しました。  

## 確認と試した点

### DB接続設定の内容確認
![Glue Connectors](/img/sss/glue_jobs_run_error.png "Glue Connectors")
<div>図. Glue Connectorsの設定画面</div>
&nbsp;
&nbsp;

初歩的なミスを疑い、Secrets Managerの選択間違いを疑いましたが  
こちらは間違いなくDB用の項目を選択していました。  
JDBC URLも間違い無いものです。  
(Amazon AuroraでpostgresのDBを選択するとJDBC URLがmysqlとなるのは何故だろう...)  

また、Glue Connectorsの接続テスト及びCrawlerの手動実行においてもDBへアクセスできることを確認しました。    
状況としてはDBの接続設定は正しく、Crawlerは動くがJobからは動かない事になります。    
この辺りGlueのアーキテクチャを正しく理解できていないのですが、    
CrawlerとJobの動く場所がそれぞれ異なるように感じます。  

### Secrets Manager用のVPCエンドポイント設定追加  
これはJobがCrawlerと別の場所で動きSecrets Managerにアクセスできないのではという推測の元に行ったことですが、  
結果としては解決には至りませんでした。
今回はGlue Connectionに設定しているのと同じくDB用サブネットの値を設定しましたが、
ただ現状Jobが動く場所が不明であるため、エンドポイントに設定するサブネットの値が間違っている可能性があります。   

### Glue用ロールのポリシー変更
当初Glue用のポリシーとしてかなり絞られた権限設定を行っていたのですが、    
AdministratorAccess 権限を用いても変化が無かったため、    
権限関連の問題ではないと考えます。  

## 暫定解決策
再度設定項目の見直しと変更を行っていたところ、  
GlueのConnectorにてSecrets Managerを使わずユーザ名とパスワードを直書きしたところJobが正常に動作する事を確認しました。  
根本的な対応方法は不明なままですが一旦DBへの認証情報は手打ちする形で本機能のリリースとなりました。    

## まとめ 
今回、初めてGlueを触り躓いた箇所を記載させていただきました。  
Glueのサンプルはそれなりに存在するのですが今回のようにプライベートサブネット内のDBが起点となるケースが少なく、    
Glueやその周辺サービスへの理解の大切さが身にしみました。


