---
title: Terraformコードのリファクタリング
author: tadashi-nakamura
date: 2024-10-30
tags: [terraform, IaC, AWS, s3, sss, tips]
---

# はじめに

Terraform のコードに対してリネームやリソースのモジュール間で移動すると、 `terraform apply`した際にリネームしたリソースの削除／再生成が行われてしまいます。
そこで、実際のインフラに影響を与えずにリソース名の変更およびリソースのモジュール間の移動するための手順を紹介します。

なお、今回の内容は一般的なものですが、豆蔵社内で開発・運用している [営業支援システム(Sales Support System)](/in-house-project/sss/intro/)（以下、SSS）での知見ということで、以下の前提の下で確認しています。

- 既存の AWS 環境が Terraform の IaC で管理されている。
- Terraform のコードが複数のディレクトリ（モジュール）で分割されている。
- Terraform の状態が AWS S3 バケットに保存されている。

SSS では、AWS S3 への Terraform 状態の保存のため、以下のようなファイルを定義し、Terraform の実行時に引数で指定しています。

```terraform:backend.hcl
bucket = "<Terraformの状態管理ファイルのAWS S3バケット名>"
key    = "<Terraformの状態管理ファイルのAWS S3オブジェクト名>"
region = "<AWS S3を配置するリージョン>"
```

# リソース確認

Terraform で管理されているリソースを確認する場合は以下のコマンドを実行します。

```bash
terraform state list
```

表示された一覧からリソース名の変更またはモジュール間で移動するリソースを特定します。

# リソース名の変更

同じモジュール内でリソースの名称を変更する場合は以下のコマンドを実行します。

```bash
terraform state mv "<変更前のリソース名>" "<変更後のリソース名>"
```

例えば以下のような感じになります。

```bash
terraform state mv "module.application.aws_ecs_task_definition.one" "module.application.aws_ecs_task_definition.the_other"
```

これは以下のように`application`のモジュール内の`aws_ecs_task_definition`リソース種別の`one`というリソースを`the_other`に変更します。

```terraform:application/main.tf(before)
resource "aws_ecs_task_definition" "one" {
  ...
}
```

```terraform:application/main.tf(after)
resource "aws_ecs_task_definition" "the_other" {
  ...
}
```

# モジュール間のリソースの移動

モジュール間のリソースの移動も基本的にはリソース名の変更と同じコマンド（Unix 系のシェルコマンドの`mv`と同じく、リネームと移動が出来ます）を使用します。
異なるのは Terraform の管理下内での移動ではなく、ファイルを経由するということです。

以下のような流れになります。

1. 移動対象のリソースを移動元のモジュールの Terraform 管理下から状態のエクスポート用ファイルに移動する
2. 移動対象のリソースを移動先のモジュールの状態をファイルに出力する
3. 移動対象のリソースを状態のエクスポート用ファイルから移動先の状態ファイルに移動する
4. 更新された移動先の状態ファイルの内容を移動先のモジュールの Terraform 管理下に取り込む

では、実際に個々のコマンドを見ていきましょう。

まずは Terraform 管理下からファイルにリソースを移動します。

```bash
terraform state mv -state-out=<エクスポート用ファイル名> "<移動対象のリソース名>" "<移動対象のリソース名>"
```

ここで、リソース名の変更のように最後のパラメタの値を「移動対象のリソース名」から別の名称に変更すると同時にリソース名の変更もすることになります。

次に、移動先の状態をファイルに出力します。

```bash
terraform state pull > <移動先モジュールの状態ファイル名>
```

続いて、ファイル間でリソースの移動をします。

```bash
terraform state mv -state=<エクスポート用ファイル名> -state-out=<移動先モジュールの状態ファイル名> "<移動対象のリソース名>" "<移動対象のリソース名>"
```

最後に、更新された状態ファイルを Terraform 管理下に戻します。

```bash
terraform state push <移動先モジュールの状態ファイル名>
```

## まとめてリソースを移動するためのシェルスクリプト

最後に一括で移動するためのシェルスクリプトのテンプレートを以下に示して終わりにしたいと思います。

```bash:move_resources.sh
#!/usr/bin/bash

# Variables
RESOURCES=(
    # リソース名を列挙
    "aws_vpc.this" # 例
    "aws_vpc.that" # 例
    ...
)

SOURCE_DIR=<移動元のモジュールのディレクトリ名>
TARGET_DIR=<移動先のモジュールのディレクトリ名>
EXPORTED=<エクスポート用ファイル名>
TARGET_STATE=<移動先モジュールの状態ファイル名>

# Move out
cd $SOURCE_DIR
terraform init -backend-config=backend.hcl
for RESOURCE in ${RESOURCES[@]}; do
    echo Copy $RESOURCE Key File
    terraform state mv -state-out=$EXPORTED $RESOURCE $RESOURCE
done
terraform state list
cd ..

# Move in
cd $TARGET_DIR
terraform init -backend-config=backend.hcl
terraform state pull > $TARGET_STATE
for RESOURCE in ${RESOURCES[@]}; do
    echo Copy $RESOURCE Key File
    terraform state mv -state=$EXPORTED -state-out=$TARGET_STATE $RESOURCE $RESOURCE
done
terraform state push $TARGET_STATE
terraform state list
rm $TARGET_STATE $EXPORTED
cd ..
```
