---
title: ClickHouse入门 ～尝试将分析型数据库作为RAG索引使用～
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

我是业务解决方案事业部的山下。  
本次我们将带着示例介绍一种用于分析的数据库 ClickHouse。  
ClickHouse 支持 SQL，不仅支持标准 SQL，还内置了许多实用的函数。  
本文计划通过类似 RAG 的示例来介绍 ClickHouse。

## 什么是 ClickHouse
@[og](https://clickhouse.com/jp)

ClickHouse 是一种 DBMS，擅长处理大规模数据集，能够实现高速的查询处理和高效存储管理。  
ClickHouse 以 OSS 的形式开发，不仅可由开发者自行搭建运行，还可以在专用云的托管服务中运行。

大致来说，其特点可以概括如下。  
- 如同 Redshift 和 Google BigQuery 等，它是一种面向列的数据库。  
- 可以使用 SQL 查询数据。  
- 支持多种多样的数据格式。  
- 在存储尺寸和查询速度方面，其性能不输于其他类似的数据库[^1]。  
- 如果处理的数据达到 1TB 级别，则运营成本比其他数据库产品更低[^2]。

[^1]: [https://clickhouse.com/blog/json-bench-clickhouse-vs-mongodb-elasticsearch-duckdb-postgresql](https://clickhouse.com/blog/json-bench-clickhouse-vs-mongodb-elasticsearch-duckdb-postgresql)

[^2]: [https://clickhouse.com/blog/cost-predictable-logging-with-clickhouse-vs-datadog-elastic-stack#cost-comparisons](https://clickhouse.com/blog/cost-predictable-logging-with-clickhouse-vs-datadog-elastic-stack#cost-comparisons)

另外，据说其并不适合处理少量数据，也不适用于 OLTP 应用。  
官方列举了以下四种应用场景。

- 实时分析  
- 机器学习与生成 AI  
- 商业智能  
- 日志、事件、追踪

## 本次的示例仓库
本次介绍的文章仓库可在以下链接找到。  
@[og](https://github.com/shohei-yamashit/clickhouseVector)

除去启动容器的处理外，基本上只需通过脚本 (bash) 就可以确认运行情况。  
如果无法执行 shell，请提前给予适当的权限。

```shell
$ chmod +x *.sh
```

## 数据库的设置
### 关于本次示例

虽然有几种在本地试用 ClickHouse 的方法，但 ClickHouse 提供了官方的容器镜像。

[https://hub.docker.com/_/clickhouse](https://hub.docker.com/_/clickhouse)

如果只是简单体验，容器就足够，因此无需安装其他工具，而是直接通过容器使用 ClickHouse。  
让我们基于仓库根目录下的 compose.yaml 启动容器。

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

如果使用 docker ps 等命令能确认到 ClickHouse 容器，则没有问题。  
虽然还有其他不是 ClickHouse 的容器，但由于后续示例会用到，请保留它们。  
此外，ClickHouse 可以通过 HTTP 请求来接受查询。  
在本文中，虽然是通过脚本，但我们将使用 curl 来发送查询。  
在 Windows 环境等未安装 curl 的情况下，请考虑安装 curl 或使用其他替代引具[^3]。

[^3]: curl 下载页面：[https://curl.se/download.html](https://curl.se/download.html)

:::info:动手实践所需工具汇总
只要准备好以下基本工具，就可以确认样本的运行情况。
- Docker: 作为运行环境使用
- curl: 用于通过 HTTP 数据传输的工具
- jq : 用于数据整理的工具
:::

### 数据库互通性检查
如果执行以下查询并返回版本号，则证明数据库已启动。

```sql:query/X0_version.sql
SELECT version()
```

执行下面的命令，如果显示版本，则没有问题。

```sql
$ curl 'http://localhost:18123/?password=changeme' --data-binary @query/X0_version.sql
25.1.5.31
```

:::info:关于 ClickHouse 客户端
截至2025年3月11日，已经实现了以下语言的客户端，因此也可集成到应用程序代码中。

```yaml
- Node.js 
- Java
- Python
- Go
```

当然，ClickHouse 也提供 CLI 客户端。  
@[og](https://clickhouse.com/docs/interfaces/cli)
:::

## RAG 与索引
### 什么是 RAG
将简单说明标题中提到的 RAG。  
RAG 是 Retrieval Augmented Generation 的缩写，可译为「通过检索扩展知识」。  
这是一种通过从外部提供学习时所缺乏的信息，从而提升 LLM (大语言模型) 推理精度的方法。

在 RAG 中的一些关键术语，本次文章将简单列举出来。

- Chunk（块）：指将文档分割成有意义的单元。在 RAG 中会分割成易于处理的大小。  
- Embedding：将文本转换为数值向量，用来表示文本的语义特征，相近语义的向量方向也会相近。  
- 索引：具有将搜索目标持久化或高效搜索功能的数据存储。  
- Tokenize（分词）：将文本按照单词或字符等单位（Token）进行分割。

通常在使用 RAG 之前，需要做适当的前期准备。  
- 将参考信息分割成块  
- 将这些块转换为 Embedding  
- 将块和其 Embedding 存入索引中

然后，在推理时按以下流程执行。  
- 将查询转换为 Embedding  
- 基于查询的 Embedding，获取相关的数据  
- 在 LLM 推理时，将其作为先验信息包含在请求中

开发者网站内也存在关于 RAG 的相关文章，推荐大家一并阅读。  
@[og](https://developer.mamezou-tech.com/tags/rag/)

### 关于 RAG 中的索引

综合上文，RAG 的索引似乎应具备以下功能。

- 用于搜索的数据（文本）  
- 用于表示搜索目标的向量，即 Embedding  
- 其他附加的元数据

此外，若拥有能够高速进行向量搜索的索引功能则更为实用。  
经过初步调研，似乎允许选择以下几类。

- 向量数据库（如 Milvus, Weaviate 等）：专门用于向量搜索的数据库，可以高效地进行相似度搜索  
- 全文搜索引擎（如 Elasticsearch, OpenSearch 等）：支持文本搜索和向量搜索  
- 嵌入式向量存储（如 ChromaDB, FAISS 等）：可以直接嵌入到应用程序中的轻量级解决方案（或库）  
- 其他的则利用数据库的扩展功能

本次，我们尝试让 ClickHouse 充当 RAG 索引的角色。

## 动手实验
### 本次示例
数据集使用的是 Livedoor 新闻语料库。  
@[og](https://www.rondhuit.com/download.html)

在本次动手实践中，无需使用全部数据。  
仅抽取部分数据，并根据需要整理为 CSV 格式。  
列的模式定义如下。

```yaml
- id                # ID(String)
- chunk_id          # 块ID（第几块）
- url               # 文章的 URL
- time_stamp        # 文章发布时间
- document_path     # 文章的文件路径
- caption           # 文章标题
- caption_tokens    # 标题的分词数组
- caption_embedding # 标题的向量表示
- chunk_text        # 文章正文分块文本
- chunk_tokens      # 分块文本的分词数组
- chunk_embedding   # 分块文本的向量表示
- all_text          # 全文
- all_embedding     # 全文的向量表示
```

:::info:关于数据生成用代码
用于生成 CSV 的代码存放在示例仓库内的 datagen 目录中。  
由于使用了名为 uv 的包管理工具，因此运行时请注意。  
应该可以通过 datagen/requirements.txt 安装依赖库后正常运行。  
[https://docs.astral.sh/uv/guides/install-python/](https://docs.astral.sh/uv/guides/install-python/)
::::

:::info:关于推理支持用的容器
利用名为 BentoML 的服务构建了 HTTP API 端点。BentoML 是一项提供机器学习推理端点的服务，可轻松通过 Docker 构建和托管。借助 BentoML，只要容器能运行，无论在何种环境下，都可以通过 HTTP 轻松使用推理模型。

@[og](https://www.bentoml.com/)

在本次示例中，准备了以下三个端点。

- hello: 用于连通性确认的端点  
- tokenize: 用于对字符串进行分词的端点  
- embedding: 用于将字符串转换为 Embedding 的端点

代码本身汇总在示例仓库根目录下的 ./bentoML 文件夹中。  
至于分词和 embedding 的计算，采用了以下模型，但只要能实现同样的功能，任何模型都应该可以正常运行。  
@[og](https://huggingface.co/cl-nagoya/ruri-large)
::::

### 插入示例数据
立即开始插入索引所需数据。  
基本上可以使用几乎原生的 SQL 语法从构建表到插入数据。此外，还可从 CSV 文件中插入数据，这也很不错。

```sql
-- 重置数据库及表
DROP DATABASE IF EXISTS mame_db;
CREATE DATABASE IF NOT EXISTS mame_db;

-- 创建表
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

-- 插入数据
INSERT INTO mame_db.vector_sample FORMAT CSV;

-- 检查数据
SELECT 
  * 
FROM 
  mame_db.vector_sample
ORDER BY id
LIMIT 1;
```

实际上，可以通过以下 shell 脚本执行，如果记录显示在输出中则视为成功。

```shell
$ ./0_initialize.sh
```

:::info:关于 0_initialize.sh
在 shell 中，通过 curl 流式传输了前述的 5 条 SQL 语句。  
在插入初始数据时，将 CSV 内容作为二进制数据通过 curl 参数发送。

```sql:0_initialize.sh
#!/bin/bash
# 执行初始化脚本
curl 'http://localhost:18123/?password=changeme' --data-binary @query/00_drop_db.sql
curl 'http://localhost:18123/?password=changeme' --data-binary @query/01_init_db.sql
curl 'http://localhost:18123/?password=changeme' --data-binary @query/02_init_table.sql
# 解压已压缩的 CSV 文件并插入数据
gzip -d -c data/sample.csv.gz | 
  curl "http://localhost:18123/?password=changeme&query=$(cat query/03_insert_csv.sql | sed "s/ /+/g")" --data-binary @-
# 检查数据
curl 'http://localhost:18123/?password=changeme' --data-binary @query/04_select_one.sql
```
:::

### 使用 LIKE 子句进行字符串搜索
首先试试字符串的 LIKE 搜索。  
例如，搜索包含“1日あたりにパソコンを使える時間”这一短语的文档。  
实际要执行的查询如下，与普通 SQL 没有任何区别。

```sql
SELECT
  chunk_text
FROM
  mame_db.vector_sample
WHERE
  chunk_text LIKE '%1日あたりにパソコンを使える時間%'
```

当向 1_string_sample.sh 脚本提供参数“1日あたりにパソコンを使える時間”执行后，即可获得包含该字符串的文本。

```shell
$ ./1_string_sample.sh 1日あたりにパソコンを使える時間
1日あたりにパソコンを使える時間や、使える時間帯を設定できるまた勉強に励んでほしい親御さんは、時間設定を利用すると、平日（月〜金）と週末（土・日）で1日あたりにパソコンを使える時間や、使える時間帯を、事細かに設定することができる.
```

:::info:关于 1_string_sample.sh
在 shell 中采用了以下步骤进行查询。
- 读取 05_select_string_sample.sql  
- 将标记为 ```__VAR__``` 的部分替换为 shell 的第一个参数  
- 使用 curl 发送请求
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

### 使用 hasSubStr 进行字符串搜索
ClickHouse 中存在一些标准 SQL 中没有的函数。例如，hasSubStr 函数。  
hasSubStr 接受两个 Array 类型的参数，用于检查一个列表是否以正确的顺序包含另一个列表。

```sql
hasSubstr(array1, array2)
SELECT hasSubstr([1.0, 2, 3, 4], [1, 3]) // false
SELECT hasSubstr(['a', 'b'], ['a']) // true
SELECT hasSubstr(['a', 'b' , 'c'], ['a', 'b']) // true
SELECT hasSubstr(['a', 'b' , 'c'], ['a', 'c']) // false
```

刚才在搜索包含“1日あたりにパソコンを使える時間”的块时，使用了 ```LIKE %1日あたりにパソコンを使える時間%``` 这种表达方式。  
而在此示例中，首先将“1日あたりにパソコンを使える時間”进行分词，然后在 chunk_tokens 列中查找分词后的结果是否以相同顺序包含。  
SQL（模板）如下：

```sql:query/06_select_list_template.sql
SELECT
  chunk_text
FROM
  mame_db.vector_sample
WHERE
  hasSubstr(chunk_tokens, __VAR__)
```

执行下面的命令，可以看到包含“1日あたりにパソコンを使える時間”的块被作为结果返回。

```shell
$ ./2_list_sample.sh 1日あたりにパソコンを使える時間
1日あたりにパソコンを使える時間や、使える時間帯を設定できるまた勉強に励んでほしい親御さんは、時間設定を利用すると、平日（月〜金）と週末（土・日）で1日あたりにパソコンを使える時間や、使える時間帯を、事細かに設定することができる.
```
 
这样一来，实现了一些在标准 DBMS 中很少见到的函数。详细信息，请参阅以下链接。  
@[og](https://clickhouse.com/docs/sql-reference/functions)

:::info:关于 2_list_sample.sh
在 shell 脚本中，采用以下步骤发送查询。
- 对 bentoML 进行连通性检查  
- 在 bentoML 容器中进行分词  
- 将分词结果代入到前述 SQL 中  
- 作为 HTTP 请求发送查询
```bash:2_list_sample.sh
#!/bin/bash
INPUT=$1
TEST_URL="http://localhost:13000/hello"
ENDPOINT_URL="http://localhost:13000/tokenize"
# 轮询直到 URL 可用
while true; do
    response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$TEST_URL" \
        -H "accept: text/plain" \
        -H "Content-Type: application/json" \
        )
    
    if [ "$response" -eq 200 ]; then
        break
    else
        echo "Error: Unable to reach $TEST_URL. Retrying in 5 seconds..."
        sleep 5  # 等待5秒后重试
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

### 访问系统表
ClickHouse 也有类似系统表的东西，存储在名为 system 的数据库中。  
system 数据库中存在根据不同用途定义的各类表。

这次作为应用示例，将抽取刚才执行的查询的时间和记录。  
要执行的 SQL 如下，列举了 hasSubStr 和 LIKE 搜索所耗费的时间。

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

在多次执行前述脚本后，运行 3_query_watch.sh 即可获取目标值.

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

### 使用 CosineDistance 计算距离
最后，以 RAG 的方式，从索引中检索语义上相近的文本示例。  
在 ClickHouse 中，`cosineDistance` 函数接受两个向量并计算距离。  
这次将查询与“サッカーが大好き”相似的文档。  
SQL 仍然可以用标准 SQL 语法表示，其中标记为 `__VAR__` 的部分将被实际的向量替换。

```sql:query/08_select_semtantic_template.sql
SELECT chunk_text FROM mame_db.vector_sample
ORDER BY
  cosineDistance(chunk_embedding, __VAR__) ASC
LIMIT 5
```

查看以下命令的结果，可以确认确实返回了与“サッカーが大好き”相似的文本。

```shell
$ ./04_semantic_sample.sh サッカーが大好き  
そのプレーのレベルの高さだけでも、すでに女子サッカー界のレジェンド的存在であるが、何よりも特筆すべきはその精神力だ。自著『ほまれ』の中では、その精神力を証明する驚異的な逸話を明かしている。
今でこそヴァンフォーレ甲府のエースとして活躍するも、横浜F・マリノス、アビスパ福岡、サガン鳥栖時代は、目立った成績を残せず、不安と迷いの日々だったというハーフナー。「4年目までこれといった結果もなくて、これから先、プロでやっていけるのかって」と、当時を振り返るも、「ちゃんとした練習場がないっていうのが驚き。シャワーが外にあったり、転々と練習場を移動したり。メンタル的にも絶対やらなきゃ、結果を残さないといけないと思うようになった」と語り、J2の環境下で鍛えられたメンタル面にも触れた。
そんな折、今年の8月には、日本代表にも選出され、タジキスタン戦では2ゴールを挙げた。「（ザッケローニ監督からは）ワントップで出ているので守備はしっかりと。攻撃の面では、味方からボールがきたら、一回簡単に捌いてゴール前に入っていけと。それはできていたと思います」と評価しつつ、「気持ちを強くもって戦うことが大事ですし、ミスとかしても、気を落とさずポジティブに教訓にしてどんどん成長していくのはメンタルとかも大事」と語る。
第35節現在、勝ち点71でJ2首位を走るFC東京にとっては、引き分け以上でJ1復帰が決まる運命の一戦。東京サポーターにとっては、なにがなんでも、その瞬間を見届け、喜びをわかち合いたいのだ。
・新エース誕生？ハーフナー・マイクの魅力と可能性を探る！
```

:::info:关于 04_semantic_sample.sh
在 shell 脚本中，与前面的例子类似，将在 bentoML 容器中计算得到的 Embedding 值作为 HTTP 请求传递给 ClickHouse.
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

## 总结
本次介绍了 ClickHouse，这是一种用于分析的数据型数据库。  
虽然示例仅限于用作 RAG 索引，但还有许多此处未能介绍的功能。  
感兴趣的读者请参考官方文档和开发者博客。
