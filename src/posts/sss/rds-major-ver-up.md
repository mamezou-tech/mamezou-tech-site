---
title: TerraformでのAmazon Aurora PostgreSQLのメジャーバージョンアップ手順
author: tadashi-nakamura
date: 2023-09-01
tags: [tips, SSS, IaC, AWS, RDS, Aurora, PostgreSQL]
---

[営業支援システム(Sales Support System)](/in-house-project/sss/intro/)で実施したAmazon Aurora PostgreSQLのメジャーバージョンアップ手順について紹介します。


# 前提事項

ここで紹介する手順では以下のことを前提としています。

- Amazon Aurora PostgreSQLをTerraformを利用してIaC化されていること
- 実施に先立ってデータのバックアップされていること
- カスタムパラメタグループを利用していること
- バージョンは12.12でバージョンアップ先は14.8
- データベースの再起動が可能であること
- terraformおよびAWS CLIがインストールされていること

# 手順の詳細

## 実施前

実施前のIaCコード（抜粋）は以下のようになっているとします。

```
...
resource "aws_rds_cluster_parameter_group" "this" {
	...
	family = "aurora-postgresql12"
	...
}

resource "aws_rds_cluster" "this" {
	...
    apply_immediately               = true
    allow_major_version_upgrade     = true 
	engine_version                  = "12.12"
    db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.this.name
	...
}

resource "aws_db_parameter_group" "this" {
	...
	family = "aurora-postgresql12"
	...
}

resource "aws_rds_cluster_instance" "this" {
	...
    apply_immediately       = true
    cluster_identifier      = aws_rds_cluster.this.id
	engine_version          = "12.12"
    db_parameter_group_name = aws_db_parameter_group.this.name
	...
}
...
```

ポイントとなるのは以下の2つのフラグ値です。

- `apply_immediately`
- `allow_major_version_upgrade`

1つ目は適用を即時反映するためのものです。
2つ目は今回のメジャーバージョンをアップすることを許可するためのものです。

## STEP.1 パラメタグループをデフォルトに変更する

```
...
resource "aws_rds_cluster" "this" {
	...
    db_cluster_parameter_group_name = "default.aurora-postgresql12"
	...
}
...
resource "aws_rds_cluster_instance" "this" {
	...
    db_parameter_group_name = "default.aurora-postgresql12"
	...
}
...
```

この内容をterraformで反映します。反映されるとこの時点では以下のようになります。

- エンジンバージョンは12系のまま
- パラメタグループは12系のデフォルト

## STEP.2 メジャーバージョンを更新する

対象となるのはクラスタとインスタンスのパラメタグループのファミリー名とエンジンバージョンです。
実際には、カスタムパラメタグループとエンジンはこの時点では関連していないので、同時に更新する必要はありません。
しかし、どちらも更新する必要があるので、まとめて行っています。

```
...
resource "aws_rds_cluster_parameter_group" "this" {
	...
	family = "aurora-postgresql14"
	...
}

resource "aws_rds_cluster" "this" {
	...
	engine_version                  = "14.8"
	...
}

resource "aws_db_parameter_group" "this" {
	...
	family = "aurora-postgresql14"
	...
}

resource "aws_rds_cluster_instance" "this" {
	...
	engine_version          = "14.8"
	...
}
...
```

ここで注意するのは、各エンジンバージョンから利用できるエンジンバージョンが限定されているということです。自分が利用しているエンジン（`aurora-postgresql`）とバージョン（`12.12`）に対して確認する場合には以下のコマンドを実行します。

```bash
aws rds describe-db-engine-versions --engine aurora-postgresql  --engine-version 12.12 --query "DBEngineVersions[*].ValidUpgradeTarget[*].{EngineVersion:EngineVersion}" --output text
```

上記内容を適用すると、データベースの状態が以下のように変更されます。

![RDSの状態](/img/sss/rds_st.png)

日本語だと残念な表示となっていますが、更新されていることが分かるかと思います。この状態から**利用可能状態に戻るまでに約20分ほど**かかります。また、この時点では以下のようになっています。

- エンジンバージョンは14系に更新
- パラメタグループは14系のデフォルトに更新

## STEP.3 パラメタグループをデフォルトからカスタムに戻す

```
...
resource "aws_rds_cluster" "this" {
    ...
    db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.this.name
    ...
}
...
resource "aws_rds_cluster_instance" "this" {
    ...
    db_parameter_group_name      = aws_db_parameter_group.this.name
	...
}
...
```

この内容を適用すると新しいメジャーバージョンの状態となります。しかし、ライターインスタンスの設定を確認すると以下の2つが「再起動を保留中」となっています。

- DBインスタンスパラメータグループ
- DBクラスターのパラメータグループ

## STEP.4 「ライターインスタンス」を再起動する

最後に**AWS管理コンソールで**「ライターインスタンス」を再起動します。

これでAmazon Aurora PostgreSQLのメジャーバージョンアップは完了となります。
