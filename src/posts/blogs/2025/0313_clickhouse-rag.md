---
title: ClickHouse入門 ~分析データベースをRAGインデックスとして使ってみる~ 
author: shohei-yamashita
date: 2025-03-13
tags: [clickhouse, sql, bentoml, RAG, LLM, Python]
image: true
---

ビジネスソリューション事業部の山下です。
今回は、分析用データベースの1つであるClickHouseをサンプル付きで紹介していきます。
ClickHouseはSQLに対応しており、標準のSQLはもちろん、便利な組み込み関数がソフトウェアとして組み込まれています。
本記事では、RAGのようなサンプルを通して、ClickHouseを紹介しようと思います。

## ClickHouseとは
@[og](https://clickhouse.com/jp)

ClickHouseはDBMSの1つです。大規模なデータセットの扱いを得意とし、高速なクエリ処理と効 率的なストレージ管理が実現可能です。
ClickHouseはOSSとして開発されており、運用する際にも開発者自身で構築できるほか、専用クラウドによるマネージドサービスでも運用できます。

特長をざっくりとまとめると、次のようになります。
- RedshiftやGoogle BigQuery等と同様、列指向のデータベースである。
- SQLでデータをクエリできる。
- 多種多様なデータ形式をサポートしている。
- ストレージサイズ、クエリ速度ともに、他の類似データベースに勝るとも劣らない性能である[^1]。
- 1TBレベルのデータを扱うのであれば、他のデータベース製品よりも安い価格で運用できる[^2]。

[^1]: [https://clickhouse.com/blog/json-bench-clickhouse-vs-mongodb-elasticsearch-duckdb-postgresql](https://clickhouse.com/blog/json-bench-clickhouse-vs-mongodb-elasticsearch-duckdb-postgresql)

[^2]: [https://clickhouse.com/blog/cost-predictable-logging-with-clickhouse-vs-datadog-elastic-stack#cost-comparisons](https://clickhouse.com/blog/cost-predictable-logging-with-clickhouse-vs-datadog-elastic-stack#cost-comparisons)

なお、少数のデータの取り扱いには向いておらず、OLTP用途には不向きとされているようです。
公式からは以下の4つがユースケースとして取り上げられています。

- リアルタイム分析
- 機械学習と生成AI
- ビジネスインテリジェンス
- ログ、イベント、トレース

## 今回のサンプルリポジトリ
今回紹介する記事のリポジトリは以下のリンクにあります。
@[og](https://github.com/shohei-yamashit/clickhouseVector)

コンテナを立ち上げる処理を除けば、基本的にスクリプト(bash)だけで動作を確認できます。
シェルを実行できない場合には適切な権限を予め与えておいてください。

```shell
$ chmod +x *.sh
```

## データベースのセットアップ
### 今回のサンプルについて

ClickHouseをローカルで試す方法はいくつかありますが、ClickHouseには公式のコンテナイメージが提供されています。

[https://hub.docker.com/_/clickhouse](https://hub.docker.com/_/clickhouse)

簡単に試す程度であればコンテナで充分なので、他のツールのインストールは行わず、コンテナからClickHouseを使っていきます。
リポジトリ直下にあるcompose.yamlをもとにコンテナを立ち上げてみましょう。

```shell
$ docker compose up -d
```

```yaml:compose.yaml
services:
  clickhouse:
    image: clickhouse:25.1.5
    container_name: clickhouse_container
    environment:
      CLICKHOUSE_PASSWORD: changeme
    ports:
      - "18123:8123"
      - "19000:9000"
    volumes:
      - clickhouse_data:/var/lib/clickhouse
    ulimits:
      nofile:
        soft: 262144
        hard: 262144
  bentoml:
    build:
      context: ./bentoML
      dockerfile: Dockerfile
    container_name: bentoml_container
    ports:
      - "13000:3000"
    volumes:
      - ./bentoML:/app 
volumes:
  clickhouse_data:
```

docker psなどのコマンドで、ClickHouseコンテナが確認できれば問題ありません。
ClickHouseではない別のコンテナもありますが、後のサンプルで使うので残してください。
また、ClickHouseはHTTPリクエストでクエリを受けつけられます。
本記事では、スクリプト越しにはなりますが、curlを使ってクエリを投げようと思います。
Windows環境等、curlがインストールされていない場合には、curlのインストールやその他の代替ツールの導入を検討してください[^3]。

[^3]: curlのダウンロードページ：[https://curl.se/download.html](https://curl.se/download.html)

:::info:ハンズオンに必要なツールまとめ
最低限以下のものさえ用意できれば、サンプルの動作が確認できます。
- Docker: 実行環境として利用
- curl:  HTTPを通じてデータ転送するためのツール
- jq : データの整形用ツール
:::

### DBの疎通確認
以下のクエリを実行してバージョンが返ってくれば、データベースを起動できている証拠です。

```sql:query/X0_version.sql
SELECT version()
```

下記のコマンドを実行してバージョンが表示されれば問題ありません。

```sql
$ curl 'http://localhost:18123/?password=changeme' --data-binary @query/X0_version.sql
25.1.5.31
```

:::info:ClickHouseのクライアントについて
2025年3月11日現在、以下の言語でクライアントが実装されているので、アプリケーションコードへの統合も可能です。

```yaml
- Node.js 
- Java
- Python
- Go
```

もちろん、ClickHouseが提供しているCLIクライアントもあります。
@[og](https://clickhouse.com/docs/interfaces/cli)
:::

## RAGとインデックス
### RAGとはなんなのか
タイトルに書いてあるRAGについて簡単に説明していきます。
RAGはRetrieval Augmented Generationを略したもので、「検索による知識の拡張」と訳されます。
学習時に持っていない情報を外部から与えることにより、LLM (Large Language Model)による推論の精度を上げる手法です。

RAGにおける重要なキーワードのうち、今回の記事で出てくる用語を簡単に列挙していきます。

- チャンク (Chunk): 文書を意味のある単位で分割したもの。RAGでは扱いやすい大きさに分割する。
- Embedding: テキストを数値ベクトルに変換したもの。テキストの意味的な特徴を表現し、近い意味
であれば同じような向きになる。
- インデックス: 検索対象を永続化したり、効率的に検索する機能を備えたデータストア。
- トークナイズ: テキストを単語や文字などの単位（トークン）に分割すること。

一般的にRAGを使う前には、適切な下準備をする必要があります。
- 参照する情報をチャンクというかたまりに分割する
- そのチャンクをEmbeddingに変換する
- チャンクとEmbeddingをインデックスに保管する

そして、推論時は次の流れに従って実行されます。
- クエリをEmbeddingに変換する
- クエリのEmbeddingを元に、関連と思われるデータを取得する
- LLMの推論時に事前情報として、LLMへのリクエストに含める

デベロッパーサイト内でもRAGに関する記事がいくつか存在するので、併せてみてもらえればと思います。
@[og](https://developer.mamezou-tech.com/tags/rag/)

### RAGにおけるインデックスについて
上に述べた話を総合すると、RAGのインデックスには、以下の機能が備わっていればよさそうです。

- 検索対象のデータ（テキスト）
- 検索対象を表現するベクトルであるEmbedding
- その他の追加メタデータ

さらに、ベクトル検索を高速にできるインデックス機能を有していれば、より実用的なものになります。
ざっと調べてみただけでも、以下に示す系統のものが選定されるようです。

- ベクトルデータベース（Milvus, Weaviate等）: ベクトル検索に特化したデータベースで、効率的な類似度検索が可能
- 全文検索エンジン（Elasticsearch, OpenSearch等）: テキスト検索とベクトル検索の両方をサポート
- 組み込み型ベクトルストア（ChromaDB, FAISS等）: アプリケーションに直接組み込める軽量なソリューション（やライブラリ）
- その他、DBの拡張機能を利用

今回は、ClickHouseにRAGインデックスのような働きをさせてみようと思います。

## ハンズオン
### 今回のサンプル
データセットとしてライブドアニュースのコーパスを使っています。
@[og](https://www.rondhuit.com/download.html)

今回のハンズオンでは、全てのデータを使う必要はありません。
一部のデータのみを抜き出しつつ、必要に応じて整形したCSVにしています。
カラムのスキーマは以下のように定義していきます。

```yaml
- id                # ID(String)
- chunk_id          # チャンクID(何番目のチャンクなのか)
- url               # 記事のURL
- time_stamp        # 記事の投稿日時
- document_path     # 記事のファイルパス
- caption           # 記事の見出し
- caption_tokens    # 見出しのトークン配列
- caption_embedding # 見出しのベクトル表現
- chunk_text        # 記事本文の分割テキスト
- chunk_tokens      # 分割テキストのトークン配列
- chunk_embedding   # 分割テキストのベクトル表現
- all_text          # 記事の全テキスト
- all_embedding     # 全テキストのベクトル表現
```

:::info:データ作成用コードについて
CSV生成用コードはサンプルリポジトリ内datagenディレクトリに格納されています。
uvと呼ばれるパッケージ管理ツールを使っているので、動かす際には注意してください。
datagen/requirements.txtを使ってライブラリをインストールしても動くはずです。
[https://docs.astral.sh/uv/guides/install-python/](https://docs.astral.sh/uv/guides/install-python/)
::::

:::info:推論サポート用のコンテナについて
BentoMLと呼ばれるサービスを利用してHTTPのAPIエンドポイントを作っています。BentoMLは機械学習の推論用エンドポイントをDockerで手軽に構築・ホスティングできるサービスです。BentoMLにより、コンテナさえ動かせれば、どんな環境でもHTTP経由で手軽に推論モデルを利用できます。

@[og](https://www.bentoml.com/)

今回のサンプルでは、以下3つのエンドポイントを用意しています。

- hello: 疎通確認用のエンドポイント
- tokenize: 文字列をトークナイズするエンドポイント
- embedding: 文字列をEmbeddingに変換するエンドポイント

コード自体はサンプルリポジトリ直下の./bentoMLフォルダにまとめてあります。
トークナイズおよびembeddingの計算については以下のモデルを採用していますが、同様の働きができれば、任意のモデルでも問題なく動くはずです。
@[og](https://huggingface.co/cl-nagoya/ruri-large)
::::

### サンプルデータの挿入
早速、インデックスに必要なデータを入れていきます。
ほぼSQLそのままの構文でテーブルの構築からデータの挿入までの操作ができます。また、CSVからデータを挿入できるのもいいですね。

```sql
-- データベースおよびテーブルのリセット
DROP DATABASE IF EXISTS mame_db;
CREATE DATABASE IF NOT EXISTS mame_db;

-- テーブルの作成
CREATE TABLE IF NOT EXISTS mame_db.vector_sample
(
    id String,
    chunk_id Int32,
    url String,
    timestamp DateTime,
    document_path String,
    caption_text String,
    caption_tokens Array(String),
    caption_embedding Array(Float32),
    chunk_text String,
    chunk_tokens Array(String),
    chunk_embedding Array(Float32),
    all_text String
)
ENGINE = MergeTree()
ORDER BY id;

-- データの挿入
INSERT INTO mame_db.vector_sample FORMAT CSV;

-- データの確認
SELECT 
  * 
FROM 
  mame_db.vector_sample
ORDER BY id
LIMIT 1;
```

実際には、以下のシェルスクリプトから実行でき、レコードが出力に表示されていれば成功です。

```shell
$ ./0_initialize.sh
```

:::info:0_initialize.shについて
シェルにおいて、前述の5つのSQL文をcurl経由で流しています。初期データを挿入する際にはcurlの引数にバイナリデータとして、csvの内容を送り込んでいます。

```sql:0_initialize.sh
#!/bin/bash
# 初期化スクリプトを実行
curl 'http://localhost:18123/?password=changeme' --data-binary @query/00_drop_db.sql
curl 'http://localhost:18123/?password=changeme' --data-binary @query/01_init_db.sql
curl 'http://localhost:18123/?password=changeme' --data-binary @query/02_init_table.sql
# 圧縮されたCSVファイルを解凍してデータを挿入
gzip -d -c data/sample.csv.gz | 
  curl "http://localhost:18123/?password=changeme&query=$(cat query/03_insert_csv.sql | sed "s/ /+/g")" --data-binary @-
# データの確認
curl 'http://localhost:18123/?password=changeme' --data-binary @query/04_select_one.sql
```
:::

### LIKE句による文字列検索
まずは文字列のLIKE検索を試してみましょう。
一例として、”1日あたりにパソコンを使える時間”という単語が含まれるドキュメントを検索していきます。
実際に実行したいクエリは以下の通りであり、普通のSQLとなんら変わりはありません。

```sql
SELECT
  chunk_text
FROM
  mame_db.vector_sample
WHERE
  chunk_text LIKE '%1日あたりにパソコンを使える時間%'
```

1_string_sample.shに”1日あたりにパソコンを使える時間”という引数を与えて実行すると、所定の文字列が含まれるテキストを取得できました。

```shell
$ ./1_string_sample.sh 1日あたりにパソコンを使える時間
1日あたりにパソコンを使える時間や、使える時間帯を設定できるまた勉強に励んでほしい親御さんは、時間設定を利用すると、平日（月〜金）と週末（土・日）で1日あたりにパソコンを使える時間や、使える時間帯を、事細かに設定することができる。
```

:::info:1_string_sample.shについて
シェル内では以下の手順を踏んでクエリしています。

- 05_select_string_sample.sqlを読み込む
- ```__VAR__```となっているところをシェルの第一引数に置換する
- curlでリクエストを送る

```bash:1_string_sample.sh
#!/bin/bash
INPUT=$1
cat ./query/05_select_string_sample.sql | 
  sed "s/__VAR__/${INPUT}/" |
  curl 'http://localhost:18123/?password=changeme' --data-binary @-
```

```sql:query/05_select_string_sample.sql
SELECT
  chunk_text
FROM
  mame_db.vector_sample
WHERE
  chunk_text LIKE '__VAR__'
```
:::

### hasSubStrによる文字列検索
ClickHouseには標準なSQLに無い関数も存在します。一例として、hasSubStr関数をあげてみます。hasSubStrはArray型の引数を2つとり、片方のリストがもう片方のリストを正しい順序で含んでいるかを調べる関数です。

```sql
hasSubstr(array1, array2)
SELECT hasSubstr([1.0, 2, 3, 4], [1, 3]) // false
SELECT hasSubstr(['a', 'b'], ['a']) // true
SELECT hasSubstr(['a', 'b' , 'c'], ['a', 'b']) // true
SELECT hasSubstr(['a', 'b' , 'c'], ['a', 'c']) // false
```

先ほどは「1日あたりにパソコンを使える時間」という文字が含まれるチャンクを検索する際に```LIKE %1日あたりにパソコンを使える時間%```という表現を使っていました。
対して、この例ではまず、「1日あたりにパソコンを使える時間」をトークナイズします。chunk_tokensカラムに、トークナイズしたものがそのままの順序で含まれているかどうかを検索していきます。
SQL（のテンプレート）は以下の通りです。

```sql:query/06_select_list_template.sql
SELECT
  chunk_text
FROM
  mame_db.vector_sample
WHERE
  hasSubstr(chunk_tokens, __VAR__)
```

下記のコマンドを実行すると、”1日あたりにパソコンを使える時間”を含んだチャンクが結果として返ってきていることがわかります。

```shell
$ ./2_list_sample.sh 1日あたりにパソコンを使える時間
1日あたりにパソコンを使える時間や、使える時間帯を設定できるまた勉強に励んでほしい親御さんは、時間設定を利用すると、平日（月〜金）と週末（土・日）で1日あたりにパソコンを使える時間や、使える時間帯を、事細かに設定することができる。
```

このように、標準のDBMSにはあまり実装されていないような関数が実装されています。詳しくは以下のリンクをご確認ください。
@[og](https://clickhouse.com/docs/sql-reference/functions)

:::info:2_list_sample.shについて
シェル内の実装においては、以下の手順を踏んでクエリを投げています。
- bentoMLに対して疎通確認
- bentoMLのコンテナでトークナイズ
- トークナイズされた結果を前述のSQLに代入
- それをHTTPリクエストとして渡すことでクエリ

```bash:2_list_sample.sh
#!/bin/bash
INPUT=$1
TEST_URL="http://localhost:13000/hello"
ENDPOINT_URL="http://localhost:13000/tokenize"
# URLが利用可能になるまでポーリング
while true; do
    response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$TEST_URL" \
        -H "accept: text/plain" \
        -H "Content-Type: application/json" \
        )
    
    if [ "$response" -eq 200 ]; then
        break
    else
        echo "Error: Unable to reach $TEST_URL. Retrying in 5 seconds..."
        sleep 5  # 5秒待機してから再試行
    fi
done
tokens=$(curl -s -X 'POST' \
    "$ENDPOINT_URL" \
    -H "accept: text/plain" \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"${INPUT}\"}" | jq -c | sed "s/\"/'/g")
cat ./query/06_select_list_template.sql | 
  sed "s/__VAR__/${tokens}/" |
  curl 'http://localhost:18123/?password=changeme' --data-binary @-
```
:::

### システムテーブルへのアクセス
ClickHouseにもシステムテーブルのようなものがあり、systemというデータベース内に保存されています。systemデータベースには、個別の用途に応じたテーブルが存在しています。

今回は活用例として、先ほど実行したクエリの時間や履歴を抽出していきたいと思います。
実行するSQLは次のとおりであり、hasSubStrとLIKE検索にかかった時間を列挙しています。

```sql:query/07_query_log_string.sql
WITH hassubstr_table AS (
    SELECT
        row_number() OVER (ORDER BY query_start_time DESC) AS row_number,
        'hasSubstr' AS type,
        query_start_time,
        query_duration_ms
    FROM
        system.query_log
    WHERE
        query LIKE '%hasSubstr%'
        AND query NOT LIKE '%system.query_log%'
        AND query_duration_ms > 0
    ORDER BY
        query_start_time DESC
    LIMIT 4
),
like_table AS (
    SELECT
        row_number() OVER (ORDER BY query_start_time DESC) AS row_number,
        'liketable' AS type,
        query_start_time,
        query_duration_ms
    FROM
        system.query_log
    WHERE
        query LIKE '%LIKE%'
        AND query NOT LIKE '%system.query_log%'
        AND query_duration_ms > 0
    ORDER BY
        query_start_time DESC
    LIMIT 4
)
SELECT
    hassubstr_table.row_number,
    hassubstr_table.query_start_time,
    hassubstr_table.query_duration_ms,
    like_table.query_start_time,
    like_table.query_duration_ms
FROM
    hassubstr_table
JOIN
    like_table
ON
    hassubstr_table.row_number = like_table.row_number
ORDER BY
    hassubstr_table.row_number
LIMIT 4
```

前述のスクリプトを複数回実行した後、3_query_watch.shを実行すれば、目的の値を取得できます。

```shell
$ ./1_string_sample.sh 世界最大のSNS
$ ./2_list_sample.sh 世界最大のSNS
$ ./1_string_sample.sh 世界最大のSNS
$ ./2_list_sample.sh 世界最大のSNS
$ ./1_string_sample.sh 世界最大のSNS
$ ./2_list_sample.sh 世界最大のSNS
$ ./1_string_sample.sh 世界最大のSNS
$ ./2_list_sample.sh 世界最大のSNS
$ ./3_query_watch.sh
1       hasSubstr       2025-03-11 06:28:09     5       liketable       2025-03-11 06:28:08  2
2       hasSubstr       2025-03-11 06:28:09     5       liketable       2025-03-11 06:28:08  2
3       hasSubstr       2025-03-11 06:28:07     5       liketable       2025-03-11 06:28:06  2
4       hasSubstr       2025-03-11 06:28:07     5       liketable       2025-03-11 06:28:06  9
```

### CosineDistanceによる距離計算
最後はRAGらしく、意味的に近い文章をインデックスから取得する例をやっていきます。
ClickHouseでは```cosineDistance```関数内で2つのベクトルを受けとって距離を計算できます。
今回は「サッカーが大好き」という文章に類似したドキュメントをクエリしていきます。
SQLは相変わらずの標準SQLの構文で表記でき、```__VAR__```となっているところに実際のベクトルが代入されます。

```sql:query/08_select_semtantic_template.sql
SELECT chunk_text FROM mame_db.vector_sample
ORDER BY
  cosineDistance(chunk_embedding, __VAR__) ASC
LIMIT 5
```

以下のコマンドの結果を確認すると、確かに「サッカーが大好き」に近い文章が出てきていますね。

```shell
$ ./04_semantic_sample.sh サッカーが大好き  
そのプレーのレベルの高さだけでも、すでに女子サッカー界のレジェンド的存在であるが、何よりも特筆すべきはその精神力だ。自著『ほまれ』の中では、その精神力を証明する驚異的な逸話を明かしている。
今でこそヴァンフォーレ甲府のエースとして活躍するも、横浜F・マリノス、アビスパ福岡、サガン鳥栖時代は、目立った成績を残せず、不安と迷いの日々だったというハーフナー。「4年目までこれといった結果もなくて、これから先、プロでやっていけるのかって」と、当時を振り返るも、「ちゃんとした練習場がないっていうのが驚き。シャワーが外にあったり、転々と練習場を移動したり。メンタル的にも絶対やらなきゃ、結果を残さないといけないと思うようになった」と語り、J2の環境下で鍛えられたメンタル面にも触れた。
そんな折、今年の8月には、日本代表にも選出され、タジキスタン戦では2ゴールを挙げた。「（ザッケローニ監督からは）ワントップで出ているので守備はしっかりと。攻撃の面では、味方からボールがきたら、一回簡単に捌いてゴール前に入っていけと。それはできていたと思います」と評価しつつ、「気持ちを強くもって戦うことが大事ですし、ミスとかしても、気を落とさずポジティブに教訓にしてどんどん成長していくのはメンタルとかも大事」と語る。
第35節現在、勝ち点71でJ2首位を走るFC東京にとっては、引き分け以上でJ1復帰が決まる運命の一戦。東京サポーターにとっては、なにがなんでも、その瞬間を見届け、喜びをわかち合いたいのだ。
・新エース誕生？ハーフナー・マイクの魅力と可能性を探る！
```

:::info:04_semantic_sample.shについて

シェルスクリプトの中では先ほどの例と同様に、bentoMLコンテナでEmbedding計算した値をHTTPリクエストとしてClickHouseに渡しています。

```bash:04_semantic_sample.sh
#!/bin/bash
INPUT=$1
tokens=$(curl -s -X 'POST' \
    "http://localhost:13000/get_embeddings" \
    -H "accept: text/plain" \
    -H "Content-Type: application/json" \
    -d "{
    \"text\": \"${INPUT}\"
}")
cat ./query/08_select_semtantic_template.sql | 
  sed "s/__VAR__/${tokens}/" |
  curl 'http://localhost:18123/?password=changeme' --data-binary @-
```

:::

## まとめ
今回は分析用データベースの1つであるClickHouseについて紹介させていただきました。
RAGインデックスとしての利用に限定したサンプルとなってしまいましたが、ここでは紹介しきれなかった機能も多数紹介します。
興味がある方はドキュメントや開発者ブログなども覗いてみてください。