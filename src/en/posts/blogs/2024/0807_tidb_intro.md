---
title: Introducing the NewSQL Distributed Database TiDB with a Hands-on Approach
author: shohei-yamashita
date: 2024-08-07T00:00:00.000Z
tags:
  - mysql
  - tidb
  - summer2024
  - Python
summerRelayUrl: https://developer.mamezou-tech.com/events/season/2024-summer/
image: true
translate: true
---

:::alert
This article has been automatically translated.
The original article is [here](/blogs/2024/08/07/tidb_intro/).
:::

This article is the 8th entry in the [Summer Relay Series 2024](/events/season/2024-summer/).

# Introduction

Hello, I'm Yamashita from the Business Solutions Division. When you hear "distributed database," many people might think it's difficult, cumbersome to manage, or impressive. In this article, I aim to dispel all but the last impression by introducing TiDB, a NewSQL distributed database system. By the way, "Ti" is pronounced "Tai."

# What is TiDB?

TiDB is an open-source database management system developed by PingCAP as a distributed NewSQL. It can almost fully utilize the MySQL-compatible SQL protocol, balancing scalability and consistency.

:::info

PingCAP's Github page is [here](https://github.com/pingcap). The repositories related to tools are under the Apache License 2.0 (as of August 1, 2024, some are under the MIT License). TiDB itself is a collection of multiple services, so it's not contained within a single repository[^1]. The implementation is written in Go and Rust.

:::

[^1]: There is a repository with the obvious name TiDB, but it is the repository for the TiDB node (in the narrow sense of TiDB) introduced later.

## Features of TiDB

TiDB is often characterized by the following features:

- Strong Consistency: Supports distributed transactions, enabling complex transaction processing.

- Horizontal Scalability: Easily scales out by adding nodes and supports write scaling.

- Availability: Adopts a highly available architecture, allowing continuous service provision even during failures. Also, it can recover with minimal downtime without requiring complex operations.

- Support for Analytical Processing: Contains columnar storage, efficiently handling analytical processing. It can also perform analytical processing (OLAP) concurrently with transaction processing (OLTP).

- MySQL Compatibility: TiDB is compatible with the MySQL protocol and can communicate with MySQL clients. Therefore, if you are using MySQL in your existing database, you can migrate almost as is.

# Introduction to TiDB Architecture

Here, I will explain the architecture of the entire distributed system. Below is the TiDB architecture diagram[^2].

![TiDB Architecture](https://i.gyazo.com/44bff72b01214b2418ceccd8ae86a6ca.png)

[^2]: Quoted from [TiDB Architecture (PingCAP Official Site)](https://docs.pingcap.com/ja/tidbcloud/tidb-architecture)

The configuration of TiDB is very simple, as follows:

1. TiDB Cluster (Cluster that directly interacts with MySQL clients)

2. Storage Cluster

3. Placement Driver Cluster

As long as you have the above in mind, you can execute the hands-on without any problems. If you want to try it as soon as possible, feel free to jump to the [Hands-on](./#tidbを体験してみよう).

## 1. TiDB Cluster

The TiDB Cluster is a cluster that accepts SQL from client services.

### 1.1. TiDB

The TiDB Cluster includes TiDB nodes. TiDB nodes serve as the gateway, accepting SQL requests from clients.

The actual storage layer of TiDB is essentially a large key-value map. TiDB nodes accept SQL from clients and convert it into queries against the key-value map.

:::column:About SQL Parser

The SQL parser used in TiDB is also open source. TiDB claims MySQL compatibility, but if you want to know which functions are supported, check out the following repository (the parser itself is parser.y).

- [https://github.com/pingcap/tidb/tree/master/pkg/parser](https://github.com/pingcap/tidb/tree/master/pkg/parser)

:::

:::column:Query Optimization

In TiDB, as with other DBMSs, after parsing the SQL statement, it is converted into a physical execution plan, referring to statistical information, etc. As of August 2024, the execution plan is determined with reference to what is called the System R model. For details, please check the following links.

- [Planner Page (TiDB Developer Guide)](https://pingcap.github.io/tidb-dev-guide/understand-tidb/planner.html)

- [A summary of the above page (Zenn)](https://zenn.dev/bohnen/articles/8eb4bf2a50d7a3)

- [Slides on the System R model (docswell)](https://www.docswell.com/s/kumagi/KENNPE-selinger-optimizer)

:::

## 2. Storage Cluster

Nodes belonging to the Storage Cluster include TiKV and TiFlash.

### 2.1. TiKV

TiKV functions as a distributed key-value store, serving as a large map storage. TiKV nodes synchronize data using a distributed consensus algorithm called the Raft algorithm.

:::column:Raft Algorithm

The Raft algorithm has concepts of Leader and Follower, where Followers follow the Leader's values. It is a type of distributed consensus algorithm, where the Leader and Follower dynamically switch roles depending on the situation, synchronizing the information held by each node. Here are some reference pages.

- [An animation explaining the Raft algorithm in an easy-to-understand manner](https://thesecretlivesofdata.com/raft/)

- [Understanding the distributed consensus algorithm Raft (Qiita)](https://qiita.com/torao@github/items/5e2c0b7b0ea59b475cce)

- [[Paper Introduction] TiDB: a Raft-based HTAP database (Zenn)](https://zenn.dev/tzkoba/articles/4e20ad7a514022)

:::

:::column:RocksDB

TiKV does not store Key Value data directly in storage. It manages data using a storage engine called RocksDB, which is an LSM tree. Not only the data itself but also information related to Raft control is stored in RocksDB. Combined with the previously mentioned Raft algorithm, it enables synchronization processing that supports both read and write scaling.

- [How RocksDB is used in TiDB](https://docs.pingcap.com/ja/tidb/stable/rocksdb-overview)

- [RocksDB wiki](https://github.com/facebook/rocksdb/wiki)

:::

### 2.2. TiFlash

While TiKV had a row-oriented storage format, the TiFlash Server has a columnar storage format. The ability to perform transaction processing and analytical processing simultaneously is considered a strength of TiDB, as stated by PingCAP, and this analytical processing is realized by TiFlash.

:::column:Position of TiFlash in Raft

TiFlash is not independent of the Raft that synchronizes TiKV but is properly integrated into the Raft algorithm ecosystem. Specifically, it is referred to as a Raft learner.

- [Overview page of TiFlash](https://docs.pingcap.com/ja/tidb/stable/tiflash-overview)

- [etcd page explaining Learner in more detail](https://etcd.io/docs/v3.6/learning/design-learner/)

:::

## 3. Placement Driver Cluster

The Placement Driver is a cluster that manages KV nodes.

### 3.1. PD Server

The Placement Driver (PD) node is a central node for cluster management in a distributed system and plays an important role in TiDB.

PD nodes manage the TiKV cluster mainly through the following two processes:

1. Collecting information from the cluster

2. Controlling TiKV nodes (including relocation)

:::column:Fault Tolerance and Response in Raft

The Raft algorithm, as shown in the [previous Qiita article](https://qiita.com/torao@github/items/5e2c0b7b0ea59b475cce#障害モデル), has Crash-Recovery tolerance but not Byzantine tolerance. In other words, it cannot handle situations where a node starts behaving erratically, such as removing itself from the schedule. Therefore, a mechanism is needed to strictly manage the behavior of KV nodes. Here are some reference links.

- [About scheduling in TiDB](https://www.pingcap.com/blog/tidb-internal-scheduling/)

:::

# Let's Experience TiDB

## 1. About tiup playground

There is a suite of software called tiup for deploying these TiDB clusters on computing resources. The tiup playground included in this toolset is a demo app that allows you to easily deploy TiDB in a local environment. Although there are differences from production behavior, we will use this for the demo this time.

:::info:Execution Environment of the Author

The environment used by the author for verification is as follows:

- MacBook Air (Apple M2)

- OS: macOS Ventura ver13.5

- Memory: 16GB

:::

## 2. Installing tiup

As of August 2024, you can install tiup with the following command.

```sh

curl --proto '=https' --tlsv1.2 -sSf https://tiup-mirrors.pingcap.com/install.sh | sh

```

Please also add tiup to your PATH at this time.

## 3. Setting Up the Database

Once you have confirmed that tiup is installed, execute the following command to start the cluster.

```sh

tiup playground v6.5.1 --tag demo --db 2 --pd 3 --kv 3 --tiflash 1

```

If successful, you can start the test cluster.

```

> tiup playground v6.5.1 --tag demo --db 2 --pd 3 --kv 3 --tiflash 1

Start pd instance:v6.5.1

Start pd instance:v6.5.1

Start pd instance:v6.5.1

Start tikv instance:v6.5.1

Start tikv instance:v6.5.1

Start tikv instance:v6.5.1

Start tidb instance:v6.5.1

Start tidb instance:v6.5.1

Waiting for tidb instances ready

127.0.0.1:58012 ... Done

127.0.0.1:58014 ... Done

Start tiflash instance:v6.5.1

Waiting for tiflash instances ready

127.0.0.1:3930 ... Done



🎉 TiDB Playground Cluster is started, enjoy!



Connect TiDB: mysql --comments --host 127.0.0.1 --port 58014 -u root

Connect TiDB: mysql --comments --host 127.0.0.1 --port 58012 -u root

TiDB Dashboard: http://127.0.0.1:58007/dashboard

Grafana: http://127.0.0.1:59401

```

Prepare another terminal separate from the one where you started tiup playground, and if you can access the output port (in this case, ```58012 or 58014```), the cluster startup is successful.

```

> mysql -u root -P 58014 -h 127.0.0.1

Welcome to the MySQL monitor. Commands end with ; or \g.

Your MySQL connection id is 415

Server version: 5.7.25-TiDB-v6.5.1 TiDB Server (Apache License 2.0) Community Edition, MySQL 5.7 compatible



Copyright (c) 2000, 2024, Oracle and/or its affiliates.



Oracle is a registered trademark of Oracle Corporation and/or its

affiliates. Other names may be trademarks of their respective

owners.



Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.



mysql>

```

:::info

Depending on the state of the machine (such as the port usage status), the cluster startup may fail.

```

Start tidb instance:v6.5.1

Waiting for tidb instances ready

127.0.0.1:58731 ... Error

127.0.0.1:58733 ... Error

```

In that case, completely delete the test cluster with the following command and then execute the startup command again.

```sh

tiup clean demo

```

:::

## 4. Creating a Test Table

Let's create a table using your MySQL client.

The DDL is as follows.

```sql

-- User privilege settings

CREATE USER IF NOT EXISTS 'newuser'@'%' IDENTIFIED BY 'newpassword';

GRANT ALL PRIVILEGES ON *.* TO 'newuser'@'%';

FLUSH PRIVILEGES;



-- Create database

CREATE DATABASE IF NOT EXISTS test;

USE test;



-- Drop users table if it exists

DROP TABLE IF EXISTS users;



-- Create users table

CREATE TABLE users (

id INT AUTO_INCREMENT PRIMARY KEY,

name VARCHAR(255) NOT NULL,

birthday DATE,

created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

);

```

Execute the above SQL using the appropriate method[^3].

```sql

mysql -u root -P 58014 -h 127.0.0.1 < sample_ddl.sql

```

[^3]: Although a CLI-based MySQL client is used in this hands-on, the method of executing SQL is not limited.

If you can confirm that you can access with the test user and that the database and table have been created, it's OK.

```

> mysql -u newuser -p -P 58014 -h 127.0.0.1

Enter password: (Enter "newpassword")

Welcome to the MySQL monitor. Commands end with ; or \g.

Your MySQL connection id is 419

Server version: 5.7.25-TiDB-v6.5.1 TiDB Server (Apache License 2.0) Community Edition, MySQL 5.7 compatible



Copyright (c) 2000, 2024, Oracle and/or its affiliates.



Oracle is a registered trademark of Oracle Corporation and/or its

affiliates. Other names may be trademarks of their respective

owners.



Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.



mysql> SHOW DATABASES;

+--------------------+

| Database |

+--------------------+

| INFORMATION_SCHEMA |

| METRICS_SCHEMA |

| PERFORMANCE_SCHEMA |

| mysql |

| test |

+--------------------+

5 rows in set (0.00 sec)

mysql> SHOW TABLES in test;

+----------------+

| Tables_in_test |

+----------------+

| users |

+----------------+

1 row in set (0.00 sec)

```

## 5. Preparing and Running the Client

Next, prepare a script to insert data into the table. This time, we have prepared a Python script that automatically inserts data. The Python version is ```3.12.0```, and the library versions are as follows.

```py

# requirements.txt

mysql-connector==2.2.9

numpy==2.0.1

python-dotenv==1.0.1

```

Then, install the libraries[^4].

[^4]: There are several ways to install Python libraries. The simplest method is to save the list of libraries in a file called ```requirements.txt``` and install them using the pip command. For details, see [link](https://www.cfxlog.com/python-requirements-txt/#rtoc-8).

Next, prepare a file describing the environment variables (the file name is ```.env```) and a Python script[^5] (save them in the same hierarchy). Also, you need to rewrite TIDB_PORT and TIDB_PORT2 in ```.env``` to those displayed in the output when starting the cluster.

[^5]: As you can see from the code, it is the same as accessing a regular MySQL database engine.

The .env file is as follows.

```py

#.env file

TIDB_HOST="localhost"

TIDB_PORT=58014 # Modify as appropriate for your environment

TIDB_PORT2=58012 # Modify as appropriate for your environment

TIDB_PORT3=4002 # dummy

TIDB_USER="newuser"

TIDB_NAME="test"

TIDB_PASSWORD="newpassword"

TIDB_N_PORT= 2

```

The Python code is as follows.

```py

# tidb_test_client.py

from dotenv import load_dotenv

import uuid

import numpy as np

from mysql.connector import pooling, conversion, Error

import random

from datetime import datetime, timedelta

import time

import os



# Load the .env file

load_dotenv()



# Get environment variables from the .env file

HOST = os.environ.get("TIDB_HOST")

PORT = os.environ.get("TIDB_PORT")

PORT2 = os.environ.get("TIDB_PORT2")

PORT3 = os.environ.get("TIDB_PORT3")

USER = os.environ.get("TIDB_USER")

DB_NAME = os.environ.get("TIDB_NAME")

PASSWORD = os.environ.get("TIDB_PASSWORD")

N_PORT = int(os.environ.get("TIDB_N_PORT"))



NUM_RECORDS = 1_000

CHUNK_SIZE = 100



num_chunks = int(np.ceil(NUM_RECORDS / CHUNK_SIZE))



START_DATE = datetime(1980, 1, 1)

END_DATE = datetime(2024, 1, 1)

WAIT_TIME = 0.1



# Generate random birthday

def get_random_birthday():

random_days = random.randint(0, (END_DATE - START_DATE).days)

birthday = START_DATE + timedelta(days=random_days)

return birthday



# Create data to insert with SQL

# Usernames are generated using random numbers, and birthdays are generated using the get_random_birthday function

values = [[str(uuid.uuid4()), get_random_birthday()] for _ in range(NUM_RECORDS)]



# Create database connection settings with port as an argument

def makeDBConfig (port):

return {

"host": HOST,

"port": port,

"user": USER,

"database": DB_NAME,

"password":PASSWORD

}



# Create a list of ports to connect to according to N_PORT

DB_PORTS = [PORT, PORT2, PORT3][:N_PORT]



# Create database connection settings for each port

configs = [makeDBConfig(port) for port in DB_PORTS]



# Class to convert Datetime64 type to MySQL DATETIME type

class Datetime64Converter(conversion.MySQLConverter):

def _timestamp_to_mysql(self, value):

return value.strftime('%Y-%m-%d %H:%M:%S').encode('utf-8')



# Get a database connection from the config object

def get_connection(config):

db_pool = pooling.MySQLConnectionPool(**config)

conn = db_pool.get_connection()

conn.set_converter_class(Datetime64Converter)

return conn



# Split data into chunks and insert each chunk into a randomly selected port

for i, chunk in enumerate(np.array_split(values, num_chunks)):

data = [tuple(x) for x in chunk]

while,```py
True:
    # Randomly select an integer from 0 to len(configs) - 1
    i_config = random.randint(0, len(configs) - 1)
    
    # Get the configuration of the randomly selected port
    config = configs[i_config]
    print("----------------------------------")
    print("ACCESSING PORT: ", config["port"])
    
    try:
        # Connect to the database
        conn = get_connection(config)
        
        # Insert data into the database
        cursor = conn.cursor()
        sql = "INSERT INTO users (name, birthday) VALUES (%s, %s)"
        cursor.executemany(sql, data)
        
        # Commit to the database
        conn.commit()
        
        # Get and display the number of records inserted into the database
        cursor.execute("SELECT COUNT(*) FROM users")
        count = cursor.fetchone()[0]
        print(f"The number of records in the 'users' table: {count}")
        
        # Close the database connection
        conn.close()
        time.sleep(WAIT_TIME)
        
        # If the database connection is successful, proceed to the next chunk
        break
    
    # If an error occurs, try connecting to the next port
    except Error as err:
        print(f"Something went wrong: {err}")
```

Make sure to rewrite the .env file as needed, and then run the Python script. If you see output like the following, everything is working correctly.

```
> python tidb_test_client.py
----------------------------------
ACCESSING PORT:  58014
The number of records in the 'users' table: 100
----------------------------------
ACCESSING PORT:  58012
The number of records in the 'users' table: 200
----------------------------------
ACCESSING PORT:  58012
The number of records in the 'users' table: 300
...
ACCESSING PORT:  58014
The number of records in the 'users' table: 1000
```

:::info:About the Python Code Presented in This Article

The process is roughly as follows:

1. Preparation of connection settings and insertion data
2. Actual data insertion processing

The actual data insertion processing is handled as follows:

1. Randomly specify the TiDB node (actually the port) to connect to
2. Execute queries to insert data and retrieve the number of records
3. If the connection fails, reselect the connection port

Currently, pseudo-nodes are assigned to ports on the localhost. Accessing the port associated with TiDB can be interpreted as accessing the TiDB node.

:::

## 6. Checking the Dashboard

Here, I will introduce the dashboard function equipped with TiDB. When you check the console output where tiup playground was launched, you will see a URL for the dashboard like this:

```
🎉 TiDB Playground Cluster is started, enjoy!

Connect TiDB:    mysql --comments --host 127.0.0.1 --port 58014 -u root
Connect TiDB:    mysql --comments --host 127.0.0.1 --port 58012 -u root
TiDB Dashboard:  http://127.0.0.1:58007/dashboard ← Here!!!!!!!!!!!!!!!
Grafana:         http://127.0.0.1:59401
```

You can access the dashboard app from the link in this console. You can log in with the username root and no password. TiDB Dashboard allows you to check metrics on the cluster, query history, and other information.

![Dashboard](https://i.gyazo.com/720b07b6ec1cb3f6c595ec14faf86daf.png)

## 7. Scaling TiDB Nodes

In tiup playground, you can scale nodes with command operations. Please open another terminal again.

Let's try scaling out a TiDB node, which is a storage cluster, by one.

```sh
tiup playground scale-out --db 1
```

If the creation of the DB node is successful, you will see standard output like this, and you can check the port information of the new DB cluster.

```
> tiup playground scale-out --db 1
To connect new added TiDB: mysql --comments --host 127.0.0.1 --port 56139 -u root -p (no password)
```

Check the execution result of the tiup playground command to confirm that the DB node has increased.

```
> tiup playground display
Pid    Role     Uptime
---    ----     ------
43104  pd       45m16.224283625s
43105  pd       45m16.21012975s
43106  pd       45m16.197087458s
43107  tikv     45m16.186158792s
43108  tikv     45m16.172459416s
43109  tikv     45m16.160307916s
43110  tidb     45m16.149157s 
43111  tidb     45m16.139087333s
80169  tidb     1m50.744301584s ← Here!!!!!!!!!!!!!!!
43322  tiflash  45m1.901124666s
```

Next, go back to the .env file and change TIDB_PORT3 to the port number of the new TiDB node, and change TIDB_N_PORT from 2 to 3.

```sh
#.env
TIDB_HOST="localhost"
TIDB_PORT=58014
TIDB_PORT2=58012
TIDB_PORT3=56139 #4002 ← Here!!!!!!!!!!!!!!!
TIDB_N_PORT=3 #2 ← Here!!!!!!!!!!!!!!!
TIDB_USER="newuser"
TIDB_NAME="test"
TIDB_PASSWORD="newpassword"
```

Now, run the Python script again, and you will see that you can access the new port.

```sh
----------------------------------
ACCESSING PORT:  58012
The number of records in the 'users' table: 1100
----------------------------------
...
----------------------------------
ACCESSING PORT:  56139
The number of records in the 'users' table: 1700
----------------------------------
...
```

In this way, we were able to increase the nodes that interact with the client.

## 8. Scaling TiKV Nodes

Now let's control the TiKV cluster as well.

Similarly, let's scale out a TiKV, which is a storage cluster, by one.

```sh
tiup playground scale-out --kv 1
```

Next, let's scale in the KV cluster. When you look at the output result of tiup playground display, you can see the process ID on the left. Specify the process ID with Role tikv and execute the following command.

```sh
tiup playground scale-in --pid 43107 
```

When you look at the output result of tiup playground display, you can see that one cluster (process) has disappeared.

```
> tiup playground display
Pid    Role     Uptime
---    ----     ------
43104  pd       1h3m11.156905s
43105  pd       1h3m11.142751291s
43106  pd       1h3m11.129707333s ↓ Pid 43107 has disappeared
43108  tikv     1h3m11.105076833s
43109  tikv     1h3m11.092921208s
80382  tikv     11m14.4069426845s
43110  tidb     1h3m11.081761667s
43111  tidb     1h3m11.071691958s
80169  tidb     19m45.676906459s
43322  tiflash  1h2m56.833724875s
```

Even if you run the previous script, data is inserted without any problems. In this way, it was confirmed that the client could still interact even after scaling in one storage node.

:::info

However, due to the nature of the TiKV synchronization algorithm (Raft), please prepare at least two TiKV nodes. Although communication with the client and data persistence is possible with just one TiKV node (in tiup playground), it is not a desirable state as it nullifies the meaning of distributed storage.

:::

## 9. Ending tiup playground

When you're done, execute the following cleanup command.

```sh
tiup clean demo
```

Since test data is persisted in storage, if you do not execute this command, extra storage will be consumed.

## A. Cheat Sheet for tiup playground

Here is a cheat sheet of the commands that have appeared so far. Note that it is assumed that you can start the tiup command with "tiup."

### Starting the TiDB Cluster

```sh
tiup playground ${version} --tag ${tag_name} --db ${number_of_DBs} --pd ${number_of_PDs} --kv ${number_of_KVs} --tiflash ${number_of_TiFlashes}
```

The command executed in this example is as follows.

```sh
tiup playground v6.5.1 --tag demo --db 2 --pd 3 --kv 3 --tiflash 1
```

[^3]: For detailed options, refer to the [documentation](https://docs.pingcap.com/tidb/stable/tiup-playground#tiup-playground-overview).

### Displaying Cluster Information

```sh
tiup playground display
```

### Scaling Out the KV Cluster

```sh
tiup playground scale-out --kv 1
```

### Scaling Out the DB Cluster

```sh
tiup playground scale-out --db 1
```

### Scaling In the Cluster

```sh
tiup playground scale-in --pid ${ps_id}
```

※ Check the process ID with ```tiup playground display```.

### Ending the Deployed TiDB Cluster

```sh
tiup clean ${tag_name_used_at_startup}
```

# TiDB Execution Environment

Finally, here are links to various references on how to deploy clusters more practically.

## Using Your Own Machines or VMs as Clusters

→ [Deploy a TiDB Cluster Using TiUP](https://docs.pingcap.com/tidb/stable/production-deployment-using-tiup)

Instead of tiup playground, you can deploy clusters using a tool called tiup cluster.

## Using a Test Environment Kubernetes Execution Environment

→ [Get Started with TiDB on Kubernetes](https://docs.pingcap.com/tidb-in-kubernetes/stable/get-started)

TiDB can build clusters on Kubernetes. The link introduces procedures using kind, which can build a test Kubernetes cluster.

## Using Kubernetes Execution Environments on Various Cloud Services

→ [Deploy TiDB on AWS EKS](https://docs.pingcap.com/tidb-in-kubernetes/stable/deploy-on-aws-eks)

→ [Deploy TiDB on Google Cloud GKE](https://docs.pingcap.com/tidb-in-kubernetes/stable/deploy-on-gcp-gke)

→ [Deploy TiDB on Azure AKS](https://docs.pingcap.com/tidb-in-kubernetes/stable/deploy-on-azure-aks)

## Using Managed Services

PingCAP, the developer of TiDB, offers a managed service (DBaaS) for TiDB called TiDB Cloud. There are two types of TiDB Cloud: a fully managed type that is automatically scaled and a type where you can manage cluster settings yourself.

If you want to use only what you need without being conscious of management:

→ [TiDB Serverless](https://pingcap.co.jp/tidb-serverless/)

If you don't want to build or manage a cluster environment but want to decide at least the cluster settings:

→ [TiDB Dedicated](https://pingcap.co.jp/tidb-dedicated/)

# Conclusion

This concludes the introduction of the distributed database system TiDB. If you want to learn more, please check the official documentation.
