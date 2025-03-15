---
title: 'Introduction to ClickHouse: Using an Analytical Database as a RAG Index'
author: shohei-yamashita
date: 2025-03-13T00:00:00.000Z
tags:
  - clickhouse
  - sql
  - bentoml
  - RAG
  - LLM
  - Python
image: true
translate: true

---

This is Yamashita from the Business Solutions Division.  
In this article, I will introduce ClickHouse—one of the analytical databases—with an accompanying sample.  
ClickHouse supports SQL and includes not only standard SQL but also a variety of convenient built-in functions.  
In this article, I intend to introduce ClickHouse through a sample that demonstrates RAG.

## What is ClickHouse
@[og](https://clickhouse.com/jp)

ClickHouse is a DBMS. It excels at handling large datasets, enabling fast query processing and efficient storage management.  
ClickHouse is developed as open source software, so you can either build it yourself or run it as a managed service via a dedicated cloud offering.

In short, its features can be summarized as follows:
- Like Redshift and Google BigQuery, it is a column-oriented database.
- Data can be queried using SQL.
- It supports a wide variety of data formats.
- In terms of both storage size and query speed, its performance is comparable to or even superior to other similar databases[^1].
- When handling data at the 1TB level, it can be operated at a lower cost than other database products[^2].

[^1]: [https://clickhouse.com/blog/json-bench-clickhouse-vs-mongodb-elasticsearch-duckdb-postgresql](https://clickhouse.com/blog/json-bench-clickhouse-vs-mongodb-elasticsearch-duckdb-postgresql)

[^2]: [https://clickhouse.com/blog/cost-predictable-logging-with-clickhouse-vs-datadog-elastic-stack#cost-comparisons](https://clickhouse.com/blog/cost-predictable-logging-with-clickhouse-vs-datadog-elastic-stack#cost-comparisons)

Note that ClickHouse is not well suited for handling small amounts of data and is generally considered unsuitable for OLTP use cases.  
According to the official documentation, the following four use cases are highlighted:

- Real-time analysis
- Machine Learning and Generative AI
- Business Intelligence
- Logs, events, and traces

## The Sample Repository for This Article
The repository for this article is available at the link below.  
@[og](https://github.com/shohei-yamashit/clickhouseVector)

Except for the container startup process, you can generally verify the operation using only bash scripts.  
If you are unable to execute the shell scripts, please ensure that they have the appropriate permissions beforehand.

```shell
$ chmod +x *.sh
```

## Database Setup
### About This Sample

There are several ways to try out ClickHouse locally, but ClickHouse provides an official container image.

[https://hub.docker.com/_/clickhouse](https://hub.docker.com/_/clickhouse)

For simple trials, a container is sufficient. Instead of installing other tools, we will run ClickHouse directly from the container.  
Let’s start the container using the compose.yaml located at the root of the repository.

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

If you can confirm the ClickHouse container using commands like docker ps, you’re all set.  
There are other containers besides ClickHouse’s, so please keep them as they will be used later in the samples.  
Also, ClickHouse can accept queries via HTTP requests.  
In this article, although it is done indirectly via scripts, I will send queries using curl.  
If you’re in a Windows environment or any situation where curl is not installed, please consider installing curl or another alternative tool[^3].

[^3]: curl download page: [https://curl.se/download.html](https://curl.se/download.html)

:::info: Tools Required for the Hands-on
As long as you have at least the following, you can verify that the sample works:
- Docker: used as the runtime environment
- curl: a tool for transferring data over HTTP
- jq : a tool for data formatting
:::

### Verifying Database Connectivity
Execute the following query—if the version is returned, it means the database is up and running.

```sql:query/X0_version.sql
SELECT version()
```

If you run the command below and see the version displayed, everything is functioning correctly.

```sql
$ curl 'http://localhost:18123/?password=changeme' --data-binary @query/X0_version.sql
25.1.5.31
```

:::info: About ClickHouse Clients
As of March 11, 2025, clients have been implemented in the following languages, making it possible to integrate them into your application code:

```yaml
- Node.js 
- Java
- Python
- Go
```

Of course, ClickHouse also provides its own CLI client.  
@[og](https://clickhouse.com/docs/interfaces/cli)
:::

## RAG and Indexes
### What is RAG?
Here is a brief explanation of RAG mentioned in the title.  
RAG stands for Retrieval Augmented Generation, which can be translated as "knowledge augmentation through search."  
It is an approach that improves the inference accuracy of LLMs (Large Language Models) by providing external information that was not available during training.

Below are some key terms in RAG that are used in this article:

- Chunk: A document divided into semantically meaningful pieces. In RAG, documents are split into manageable chunks.
- Embedding: A conversion of text into a numerical vector. It captures the semantic features of the text so that semantically similar texts have similar vectors.
- Index: A datastore that preserves searchable data and provides efficient search functionality.
- Tokenize: The process of splitting text into units (tokens), such as words or characters.

Generally, before using RAG, proper preprocessing is required:
- Split the reference information into chunks.
- Convert those chunks into embeddings.
- Store both the chunks and their embeddings in an index.

Then, during inference, the process is as follows:
- Convert the query into an embedding.
- Retrieve data that is likely relevant based on the query's embedding.
- Include this information as context in the request when invoking the LLM.

There are several other articles about RAG on our developer site—feel free to check them out as well.  
@[og](https://developer.mamezou-tech.com/tags/rag/)

### About Indexing in RAG
Based on the above discussion, a RAG index should have the following functionalities:

- The data (text) to be searched.
- The embeddings, which are vectors representing the searchable content.
- Other additional metadata.

Furthermore, if the index is capable of performing vector searches quickly, it becomes even more practical.  
From a quick survey, the following types of solutions are commonly chosen:

- Vector databases (Milvus, Weaviate, etc.): Databases specifically designed for efficient similarity search.
- Full-text search engines (Elasticsearch, OpenSearch, etc.): Systems that support both text and vector search.
- Embedded vector stores (ChromaDB, FAISS, etc.): Lightweight solutions or libraries that can be directly integrated into an application.
- Others, using the extension capabilities of traditional databases.

In this article, I will try to use ClickHouse as a RAG index.

## Hands-on
### This Sample
The dataset used in this sample is the Livedoor News corpus.  
@[og](https://www.rondhuit.com/download.html)

For this hands-on exercise, it is not necessary to use the entire dataset.  
A subset has been extracted and formatted into a CSV file as needed.  
The column schema is defined as follows:

```yaml
- id                # ID(String)
- chunk_id          # Chunk ID (indicating the chunk number)
- url               # Article URL
- time_stamp        # Article publication datetime
- document_path     # Article file path
- caption           # Article headline
- caption_tokens    # Array of tokens for the headline
- caption_embedding # Vector representation of the headline
- chunk_text        # Split text from the article body
- chunk_tokens      # Array of tokens from the split text
- chunk_embedding   # Vector representation of the split text
- all_text          # Full text of the article
- all_embedding     # Vector representation of the full text
```

:::info: About the Data Generation Code
The code for generating the CSV is stored in the datagen directory within the sample repository.  
Since it uses a package management tool called uv, please be cautious when running it.  
It should work if you install the required libraries using datagen/requirements.txt.  
[https://docs.astral.sh/uv/guides/install-python/](https://docs.astral.sh/uv/guides/install-python/)
::::

:::info: About the Inference Support Container
We are using a service called BentoML to create HTTP API endpoints.  
BentoML is a service that makes it easy to build and host machine learning inference endpoints using Docker.  
With BentoML, as long as the container is running, you can conveniently use inference models via HTTP in any environment.

@[og](https://www.bentoml.com/)

In this sample, three endpoints have been set up:

- hello: an endpoint for connectivity testing
- tokenize: an endpoint for tokenizing strings
- embedding: an endpoint for converting strings into embeddings

The code is organized in the ./bentoML folder at the root of the sample repository.  
For tokenization and embedding calculations, the following model is used; however, any model that performs similarly should work fine.  
@[og](https://huggingface.co/cl-nagoya/ruri-large)
::::

### Inserting Sample Data
Let’s begin by inserting the data necessary for the index.  
The operations from table creation to data insertion can be performed almost exactly as in SQL. Also, it’s convenient that you can insert data from a CSV file.

```sql
-- Reset database and table
DROP DATABASE IF EXISTS mame_db;
CREATE DATABASE IF NOT EXISTS mame_db;

-- Create table
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

-- Insert data
INSERT INTO mame_db.vector_sample FORMAT CSV;

-- Check data
SELECT 
  * 
FROM 
  mame_db.vector_sample
ORDER BY id
LIMIT 1;
```

In practice, you can execute the following shell script, and if records are displayed in the output, the process has succeeded.

```shell
$ ./0_initialize.sh
```

:::info: About 0_initialize.sh
In the shell script, the five SQL statements mentioned above are sent via curl. When inserting the initial data, the CSV content is sent as binary data using curl’s arguments.

```sql:0_initialize.sh
#!/bin/bash
# Execute initialization script
curl 'http://localhost:18123/?password=changeme' --data-binary @query/00_drop_db.sql
curl 'http://localhost:18123/?password=changeme' --data-binary @query/01_init_db.sql
curl 'http://localhost:18123/?password=changeme' --data-binary @query/02_init_table.sql
# Decompress the compressed CSV file and insert data
gzip -d -c data/sample.csv.gz | 
  curl "http://localhost:18123/?password=changeme&query=$(cat query/03_insert_csv.sql | sed "s/ /+/g")" --data-binary @-
# Verify data
curl 'http://localhost:18123/?password=changeme' --data-binary @query/04_select_one.sql
```
:::

### String Search Using the LIKE Clause
First, let’s try searching for text using the SQL LIKE operator.  
As an example, we will search for documents that contain the phrase "1日あたりにパソコンを使える時間".  

When you execute 1_string_sample.sh with the argument "1日あたりにパソコンを使える時間", it retrieves text containing the specified string.

```shell
$ ./1_string_sample.sh 1日あたりにパソコンを使える時間
1日あたりにパソコンを使える時間や、使える時間帯を設定できるまた勉強に励んでほしい親御さんは、時間設定を利用すると、平日（月〜金）と週末（土・日）で1日あたりにパソコンを使える時間や、使える時間帯を、事細かに設定することができる.
```

:::info: About 1_string_sample.sh
Within the shell script, the following steps are performed to execute the query:
- Read the file 05_select_string_sample.sql
- Replace the placeholder ```__VAR__``` with the first argument passed to the shell
- Send the request via curl

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

### String Search Using hasSubStr
ClickHouse provides functions that are not part of standard SQL. One example is the hasSubStr function.  
The hasSubStr function takes two Array-type arguments and checks whether one of the lists contains the other in the correct order.

```sql
hasSubstr(array1, array2)
SELECT hasSubstr([1.0, 2, 3, 4], [1, 3]) // false
SELECT hasSubstr(['a', 'b'], ['a']) // true
SELECT hasSubstr(['a', 'b' , 'c'], ['a', 'b']) // true
SELECT hasSubstr(['a', 'b' , 'c'], ['a', 'c']) // false
```

Previously, we used the condition `LIKE '%1日あたりにパソコンを使える時間%'` to search for chunks containing that phrase.  
In contrast, this example first tokenizes "1日あたりにパソコンを使える時間" and then checks whether the tokenized sequence exists in the `chunk_tokens` column in the same order.

The SQL template is as follows:

```sql:query/06_select_list_template.sql
SELECT
  chunk_text
FROM
  mame_db.vector_sample
WHERE
  hasSubstr(chunk_tokens, __VAR__)
```

When you run the command below, you will see that the chunks containing "1日あたりにパソコンを使える時間" are returned.

```shell
$ ./2_list_sample.sh 1日あたりにパソコンを使える時間
1日あたりにパソコンを使える時間や、使える時間帯を設定できるまた勉強に励んでほしい親御さんは、時間設定を利用すると、平日（月〜金）と週末（土・日）で1日あたりにパソコンを使える時間や、使える時間帯を、事細かに設定することができる.
```

As you can see, functions that are not commonly implemented in standard DBMS are available in ClickHouse. For more details, please refer to the link below.  
@[og](https://clickhouse.com/docs/sql-reference/functions)

:::info: About 2_list_sample.sh
In this shell script, the following steps are taken to execute the query:
- Verify connectivity with the BentoML service
- Tokenize the input using the BentoML container
- Substitute the tokenized result into the SQL template
- Send the resulting query via an HTTP request

```bash:2_list_sample.sh
#!/bin/bash
INPUT=$1
TEST_URL="http://localhost:13000/hello"
ENDPOINT_URL="http://localhost:13000/tokenize"
# Poll until the URL becomes available
while true; do
    response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$TEST_URL" \
        -H "accept: text/plain" \
        -H "Content-Type: application/json" \
        )
    
    if [ "$response" -eq 200 ]; then
        break
    else
        echo "Error: Unable to reach $TEST_URL. Retrying in 5 seconds..."
        sleep 5  # Wait 5 seconds before retrying
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

### Accessing System Tables
ClickHouse also includes system tables, which are stored in the `system` database.  
In the `system` database, there are tables for different purposes.

In this example, we will extract the execution times and histories of the queries executed earlier.  
The SQL below lists the execution times for queries using hasSubStr and LIKE searches.

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

After running the previous scripts several times, executing 3_query_watch.sh will display the desired values.

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

### Distance Calculation Using CosineDistance
Finally, in true RAG fashion, let’s retrieve documents from the index that are semantically similar.  
ClickHouse’s `cosineDistance` function takes two vectors and computes the distance between them.  
This time, we will query for documents similar to the sentence "サッカーが大好き" (I love soccer).  
The SQL is written in standard syntax, with the actual vector being substituted in place of `__VAR__`.

```sql:query/08_select_semtantic_template.sql
SELECT chunk_text FROM mame_db.vector_sample
ORDER BY
  cosineDistance(chunk_embedding, __VAR__) ASC
LIMIT 5
```

If you inspect the result of the following command, you will indeed see documents that are similar to "サッカーが大好き".

```shell
$ ./04_semantic_sample.sh サッカーが大好き  
そのプレーのレベルの高さだけでも、すでに女子サッカー界のレジェンド的存在であるが、何よりも特筆すべきはその精神力だ。自著『ほまれ』の中では、その精神力を証明する驚異的な逸話を明かしている。
今でこそヴァンフォーレ甲府のエースとして活躍するも、横浜F・マリノス、アビスパ福岡、サガン鳥栖時代は、目立った成績を残せず、不安と迷いの日々だったというハーフナー。「4年目までこれといった結果もなくて、これから先、プロでやっていけるのかって」と、当時を振り返るも、「ちゃんとした練習場がないっていうのが驚き。シャワーが外にあったり、転々と練習場を移動したり。メンタル的にも絶対やらなきゃ、結果を残さないといけないと思うようになった」と語り、J2の環境下で鍛えられたメンタル面にも触れた。
そんな折、今年の8月には、日本代表にも選出され、タジキスタン戦では2ゴールを挙げた。「（ザッケローニ監督からは）ワントップで出ているので守備はしっかりと。攻撃の面では、味方からボールがきたら、一回簡単に捌いてゴール前に入っていけと。それはできていたと思います」と評価しつつ、「気持ちを強くもって戦うことが大事ですし、ミスとかしても、気を落とさずポジティブに教訓にしてどんどん成長していくのはメンタルとかも大事」と語る.
第35節現在、勝ち点71でJ2首位を走るFC東京にとっては、引き分け以上でJ1復帰が決まる運命の一戦。東京サポーターにとっては、なにがなんでも、その瞬間を見届け、喜びをわかち合いたいのだ.
・新エース誕生？ハーフナー・マイクの魅力と可能性を探る！
```

:::info: About 04_semantic_sample.sh
In this shell script, just as in the previous example, the embedding computed by the BentoML container is passed to ClickHouse as an HTTP request.

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

## Summary
In this article, I introduced ClickHouse, one of the analytical databases.  
Although the sample was limited to demonstrating its use as a RAG index, ClickHouse offers many other features that were not covered here.  
If you’re interested, please take a look at the documentation and developer blogs.
