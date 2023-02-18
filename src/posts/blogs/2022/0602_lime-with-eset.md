---
title: セキュリティソフト ESET を利用している環境で Rancher Desktop (lima) を使う
author: shigeki-shoji
date: 2022-06-02
tags: [k8s, container, macOS, "rancher-desktop"]
---

[庄司](https://github.com/edward-mamezou)です。

皆さんは mac でセキュリティ対策ソフトウェアに何をお使いでしょうか。私は [ESET](https://eset-info.canon-its.jp/) を使用しています。

ESET のファイアウォール機能を有効にして Docker Desktop の代替として [Rancher Desktop](https://developer.mamezou-tech.com/blogs/2022/01/29/rancher-desktop/) や [lima](https://developer.mamezou-tech.com/blogs/2022/01/21/lima/) を使用していると、イメージを pull するときにエラーが発生し困ったことがあり、その回避方法について調べてみました。

:::stop
この記事では、ファイアウォールにアプリケーションを許可する方法で回避する手順を示しています。所属する組織の運用ポリシーに照らして適切でない場合は、適用しないでください。
:::

```shell
$ nerdctl run -it --rm ubuntu
docker.io/library/ubuntu:latest: resolving      |--------------------------------------| 
elapsed: 9.9 s                   total:   0.0 B (0.0 B/s)                                         
INFO[0010] trying next host                              error="failed to do request: Head \"https://registry-1.docker.io/v2/library/ubuntu/manifests/latest\": dial tcp: lookup registry-1.docker.io on 10.0.2.3:53: read udp 10.0.2.100:55034->10.0.2.3:53: i/o timeout" host=registry-1.docker.io
FATA[0010] failed to resolve reference "docker.io/library/ubuntu:latest": failed to do request: Head "https://registry-1.docker.io/v2/library/ubuntu/manifests/latest": dial tcp: lookup registry-1.docker.io on 10.0.2.3:53: read udp 10.0.2.100:55034->10.0.2.3:53: i/o timeout 
```

回避策を要約すると、ホスト PC と仮想 Linux である lima との通信に使用している 127.0.0.1 に対する着信を許可すればよいということがわかりました。

:::stop
この記事よりさらに厳格にトラフィック制御したい場合は、より詳細にトラフィックを分析して設定してください。
:::

ESET には対話モードがあります。対話モードでは、アプリケーションを実行した時、ルールにない通信を検出すると許可するか拒否するかを確認するダイアログが表示されます。ここで確認したルールを ESET のファイアウォールのルールとして保存もできます。

ESET の対話モードで実行して、Rancher Desktop で docker pull 等を行ってルールを生成させた場合でも、この記事の説明とほとんど同じルールを作成できます。

## 手順

* ESET の「詳細設定...」を開きます。
* 「アクセス制御」にある、ネットワークのアイコンをクリックします。
* 「ルール」タブを選択します。
* 「次のプロファイルで使用するルールを表示する:」で「パブリック」を選択します。
* ルールの「追加...」ボタンをクリックします。
* 「アプリケーション/サービス」のダイアログに次のように入力して「次へ」ボタンをクリックします。
  * 名前: 127.0.0.1 [TCP & UDP]の通信を許可
  * 「参照...」ボタンをクリックして「Rancher Desktop.app」を選択します。

:::info
lima を単体で使用している場合は「すべてのアプリケーション」をチェックします。
:::

* 「アクション/方向」のダイアログに次のように入力して「次へ」ボタンをクリックします。
  * アクション: 許可
  * 方向: 内向き
* 「プロトコル/ポート」のダイアログに次のように入力して「次へ」ボタンをクリックします。
  * プロトコル: TCP & UDP
  * ポート: リモート
  * リモートポート: すべて
* 「宛先」のダイアログに次のように入力して「終了」ボタンをクリックします。
  * 宛先: IPアドレス
  * IP/IPv6 アドレス: 127.0.0.1

## 最後に

特に lima で使用する場合に「すべてのアプリケーション」をチェックすることには不安があります。より安全性の高い設定が見つかればフォローする記事を投稿します。

この記事では2022年6月2日現在の以下のバージョンを使っています。

* ESET: 6.11.2.0
* Rancher Desktop: 1.3.0
* lima: 0.11.0
