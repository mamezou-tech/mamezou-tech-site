---
title: S3で疑似的にフォルダを管理する方式の検討と実装
author: ryo-nakagaito
date: 2022-12-23
tags: [aws, s3, advent2022]
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2022/
---
これは、[豆蔵デベロッパーサイトアドベントカレンダー2022](https://developer.mamezou-tech.com/events/advent-calendar/2022/)第23日目の記事です。

# はじめに
2022年4月に豆蔵に入社しました、BS第二グループの中垣内と申します。今回は、店舗決済系サービスの保守開発案件に携わり、AWSのS3周りの機能改修にて工夫した点をまとめ、デベロッパーサイトに初めて寄稿させていただきます。

# Amazon S3 とは
S3はAWSにて提供されているオブジェクトストレージサービスであり、今や多くの開発案件で使用されているかと思います。

[Amazon S3 とは](https://docs.aws.amazon.com/ja_jp/AmazonS3/latest/userguide/Welcome.html)

高い可用性と耐久性を誇り、容量は無制限であり、データのバックアップやWebサービスにおける静的コンテンツの保管、ビッグデータ分析におけるデータレイクなど非常に幅広い用途で利用できるサービスです。

キーバリューストアの方式でデータを保管しており、保存されるデータは一意なキー（フルパス名）で識別されます。ここがファイルストレージと異なる部分であり、キーとなるフルパス名は「/」で区切られているので一見フォルダによる階層構造があるように思えますが、S3にフォルダや階層という概念はありません。ここが開発時に一番悩まされた部分でした・・・。

| キー（フルパス名） | バリュー（ファイルの内容） |
|---------|---------|
| hoge/foo.txt | hogehoge |

# 機能要件
さて、実際の業務にて求められた機能要件について説明します。
Web画面にてマスタメンテナンスを行う機能の改修を行いました。元々の機能は以下のようなものです。

### 既存機能
- 特定の店舗のマスタデータをzipファイルにまとめS3に保管する
- S3に保管したマスタデータのzipファイルを他店舗にコピーする

この機能により、新規追加する商品のデータを一括して複数の店舗に配信するといったことが実現されておりました。
そして今回、店舗数の増大や業務形態の多様化により、マスタデータをフォルダで管理するという以下ような新規機能が求められました。

### 新規機能
- 任意にフォルダを作成し、マスタデータをフォルダ別に管理したい
- フォルダの名称を変更したい
- フォルダの削除（配下のマスタデータも全て削除）を行いたい

これらの要求を満たせるような方式をいくつか考えました。

# 案1. AWSのAPIを使用する
まずは素直にAWSのAPIを使用して実現する方法を考えました。
S3の[APIリファレンス](https://docs.aws.amazon.com/AmazonS3/latest/API/API_Operations_Amazon_Simple_Storage_Service.html)を見ると、S3にフォルダという概念が無いので当然と言えば当然なのですが、フォルダを作成するというAPIは見当たりませんでした。

しかし、オブジェクトを保存する際に使用する`PutObject`が使用できるのではないかと考え、試行錯誤してみました。

実際のアプリはJavaで作っているのですが、ここではAWS CLIのコマンドを例に説明します。

まずは普通にファイルを保存する方法です。`Key`にフルパスを指定し、`body`に保存するファイルを指定します。

```powershell
echo TEST > test.txt

aws s3api put-object --bucket gaitobucket --key "folder001/test.txt" --body test.txt
{
    "ETag": "\"9b1168b29272aeff17c058e4994a9526\""
}
```

`list-objects`で保存したファイルを確認してみると、指定したKeyでファイルが保存できていることが確認できます。

```powershell
aws s3api list-objects --bucket gaitobucket
{
    "Contents": [
        {
            "Key": "folder001/test.txt",
            "LastModified": "2022-12-18T04:41:48+00:00",
            "ETag": "\"9b1168b29272aeff17c058e4994a9526\"",
            "Size": 7,
            "StorageClass": "STANDARD",
            "Owner": {
                "DisplayName": "-",
                "ID": "-"
            }
        }
    ]
}
```

ここで、`Key`に「/」で終わるフォルダ名を指定し、`body`を指定しなければ空のフォルダ（らしきもの）が作成できるのではないかと考えました。

```powershell
aws s3api put-object --bucket gaitobucket --key "folder002/"
{
    "ETag": "\"d41d8cd98f00b204e9800998ecf8427e\""
}

aws s3api list-objects --bucket gaitobucket
{
    "Contents": [
        {
            "Key": "folder002/",
            "LastModified": "2022-12-18T04:53:44+00:00",
            "ETag": "\"d41d8cd98f00b204e9800998ecf8427e\"",
            "Size": 0,
            "StorageClass": "STANDARD",
            "Owner": {
                "DisplayName": "-",
                "ID": "-"
            }
        }
    ]
}
```
コマンドは実行できました。どうやら、`folder002/`というKeyで、Sizeが0のオブジェクトとして保存されるようです。

この方式でフォルダ管理の仕組みを実装する方法もできなくはなさそうですが、`put-object`の使用方法がAWS側が想定しているものと異なることによって何か不具合が起こる可能性を考慮したことと、「空フォルダの削除 / 名称変更」と「配下に1点以上ファイルが存在するフォルダの削除 / 名称変更」で処理方法を微妙に変える必要があることを考え、別の方式を検討することにしました。

# 案2. フォルダが存在するように見せかける
こちらが、実際に実装した方式となります。
そもそもS3にはフォルダという概念が無いので、画面側から操作した時にあたかもフォルダがあるかのように見える仕組みを構築できれば良いと考えました。具体的な実装方式は以下のような感じです。

### フォルダ新規作成
- [画面から指定したフォルダ名]/.dummyというKeyで画面からは見えないダミーファイルを作成する

```powershell
aws s3api put-object --bucket gaitobucket --key "folder003/.dummy"
{
    "ETag": "\"9b1168b29272aeff17c058e4994a9526\""
}

aws s3api list-objects --bucket gaitobucket
{
    "Contents": [
        {
            "Key": "folder003/.dummy",
            "LastModified": "2022-12-18T05:19:12+00:00",
            "ETag": "\"9b1168b29272aeff17c058e4994a9526\"",
            "Size": 0,
            "StorageClass": "STANDARD",
            "Owner": {
                "DisplayName": "-",
                "ID": "-"
            }
        }
    ]
}
```

フォルダ新規作成時にはこのダミーファイルを必ず作成するようにしました。
そして、このフォルダ配下にマスタデータを保存するという操作をした場合は、以下のようにKeyとなるパスの前方部分（フォルダ名にあたる部分）が一致するようにしました。

```powershell
aws s3api list-objects --bucket gaitobucket | jq ".Contents[].Key"
"folder003/.dummy"
"folder003/masterdata001.zip"
"folder003/masterdata002.zip"
"folder003/masterdata003.zip"
```

これにより、Keyの前方部分が「folder003/」と一致するオブジェクトは最低1点存在することが保証され、フォルダ削除機能の実装方式がシンプルになりました。

### フォルダ削除
- 画面から指定したフォルダ名とKeyの前方が一致するオブジェクトをリストアップし、繰り返し処理で削除する（`DeleteObject`）

そして、一癖あったのがフォルダ名称変更機能です。S3のAPIには、オブジェクトのKeyを書き換えるようなものは用意されていません。そこで、以下の実装方式にしました。

### フォルダ名称変更
- 対象のフォルダのオブジェクトを名称変更後のフォルダ名をKeyとしてコピーする（`CopyObject`）
- コピー元のフォルダのオブジェクトを削除する（`DeleteObject`）

例として、「folder003」というフォルダを「folder004」に名称変更する場合は以下のような流れになります。

名称変更前
```powershell
aws s3api list-objects --bucket gaitobucket | jq ".Contents[].Key"
"folder003/.dummy"
"folder003/masterdata001.zip"
"folder003/masterdata002.zip"
"folder003/masterdata003.zip"
```

名称変更後のフォルダ名をKeyとしてコピー
```powershell
aws s3api list-objects --bucket gaitobucket | jq ".Contents[].Key"
"folder003/.dummy"
"folder003/masterdata001.zip"
"folder003/masterdata002.zip"
"folder003/masterdata003.zip"
"folder004/.dummy"
"folder004/masterdata001.zip"
"folder004/masterdata002.zip"
"folder004/masterdata003.zip"
```

コピー元のオブジェクトを削除
```powershell
aws s3api list-objects --bucket gaitobucket | jq ".Contents[].Key"
"folder004/.dummy"
"folder004/masterdata001.zip"
"folder004/masterdata002.zip"
"folder004/masterdata003.zip"
```

無理矢理感は否めませんが、これらの方式で実装することにより、画面から見ると、マスタデータをフォルダ別に管理できているように"見せかける"ことが実現できました。

ひとまず実現はできたのですが、これがベストな方式だったかと問われると少し疑問が残る状態です。
具体的な問題点として、名称変更を別名でコピーする方式で実装したことにより、ファイルの更新日時が変わってしまうという点が挙げられます。更新日時が一定期間より以前のファイルは削除するといったライフサイクル管理の方式を取っている場合、名称変更処理によって更新日時が変わり、削除までの期間が延長されてしまうことになります。

後にチームの先輩からいくつか他の実装方式を紹介していただいたので以下に記載します。

# 案3. DBにフォルダの情報を持たせる

私が開発を担当しているアプリケーションでは、データベースとして[Amazon RDS](https://aws.amazon.com/jp/rds/)を使用しております。RDSにてマスタデータ管理用のテーブルを作成し、マスタデータのKeyとフォルダ名を紐付ければ、S3以外のサービスに依存することにはなるものの、フォルダ管理の仕組みが実現できるということを一案として教えていただきました。

# 案4. タグかメタデータを使用する

S3に保存したオブジェクトには、[タグ](https://docs.aws.amazon.com/ja_jp/AmazonS3/latest/userguide/object-tagging.html)や[メタデータ](https://docs.aws.amazon.com/ja_jp/AmazonS3/latest/userguide/UsingMetadata.html)という形で任意の情報を付加できます。タグかメタデータにフォルダの情報を付加すれば、S3が持つ機能の中で完結させた形で、フォルダ管理の仕組みを実装できるということもアドバイスとしていただきました。
タグ / メタデータを付与した際はコピーした時と同様にファイルの更新日時が書き変わるのですが、更新日時の情報もタグ / メタデータに持たせて管理すれば、案2. にて挙げたライフサイクル管理の問題も回避することができます。

# 最後に
振り返ってみると先輩から提示していただいた案3. か案4. の実装方式の方が仕組みとしてシンプルで分かりやすく、今後フォルダ名以外の情報（マスタデータを配信 / 削除する未来の日時、更新者の名前 等）を管理する必要が出てきた場合に対応できるという点で拡張性があって良いと思いました。

様々な実装方式が考えられるかと思いますが、私が今回寄稿した内容がS3を利用したアプリ開発のヒントか何かになれば幸いです。また、更に良い方式などあれば知りたいと思っています。

余談ではありますが、S3はWebのマネジメントコンソールの画面からアクセスすると、「フォルダの作成」というボタンがありフォルダを作成できます。（実際にはSizeが0のオブジェクトが作成されます。）
また、画面上部にはパンくずリストがあり、フォルダの階層を辿ることができるようになっています。
マネジメントコンソールの画面においても、実際はフォルダという仕組みは無いにもかかわらず、フォルダという仕組みがあるように見せかけているということだと思いますが、このような操作がAPIとして提供されると良いのにと思いました。