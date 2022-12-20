---
title: できるだけ簡単にAWS上に静的サイトを構築する
author: yuta-masuda
date: 2022-12-20
tags: [advent2022]
adventCalendar: https://developer.mamezou-tech.com/events/advent-calendar/2022/
---

これは、[豆蔵デベロッパーサイトアドベントカレンダー2022](https://developer.mamezou-tech.com/events/advent-calendar/2022/) 第20日目の記事です。

AWSについて個人で学習していると、サービスの名前や役割はなんとなく理解できたり覚えられるようになりますが、実際にサービスを使う機会がないことは割とあるかと思います。学習においては座学も重要ですが、やはり実践して覚えるのが一番です。

そこで、AWSを実際に利用して理解を深める第一歩として、簡単なホームページやブログのような静的なサイト（以下、サイトと記述）をAWS上に構築することにトライしました。サイトを作って公開するだけなら最適なサービスが世の中にたくさんあるので、あえてAWS上に構築するメリットは少ないと思いますが、学習と理解のためにAWSを使って構築しましたのでそのやり方をまとめます。なお、本記事では構築手順に主眼を置いており、各サービスについての説明や関連知識についての説明は極力省きます。

[[TOC]]

## 構成

AWS上にサイトを構築するパターンはいくつかあるようですが、今回は以下の構成を取りました。

![](/img/blogs/2022/1220_architecture.png)

1. [Amazon S3](https://aws.amazon.com/jp/s3/)
   -  サイトのリソース（HTMLファイルなど）の保存先
2. [Amazon CloudFront](https://aws.amazon.com/jp/cloudfront/)
   - リソースの配信
   - HTTPS化に必要
3. [Amazon Route 53](https://aws.amazon.com/jp/route53/)
   - ドメインの取得
   - DNSの設定
4. [AWS Certificate Manager](https://aws.amazon.com/jp/certificate-manager/)
   - SSL証明書の取得

タイトルの「できるだけ簡単に」というのはかなり主観的な表現ですが、ポイントの1つとして「AWSのみで完結させる」という目的があります。と言いますのは、後述するようにドメインとSSL証明書（以下、証明書と記述）の取得にそれぞれRoute 53とCertificate Managerを使っています。これらはAWS以外のサービスでも取得可能なので必ずしもAWSを使う必要が無いものではありますが、AWSだけですべてが実現できるのはとてもシンプルで良いと思います。何より、AWSのサービスを実際に利用して理解することが主目的なので、今回はこれらのサービスを利用することにしました。

また、せっかく公開する以上はHTTPSを利用したいところです。「できるだけ簡単に」公開するだけならHTTPでも良い（この場合はS3だけで実現可能）のですが、GoogleではHTTPのページを開こうとすると警告が出ますし、実運用するうえではHTTPS対応は必須かと思います。

## 1. Route 53でドメインを取得する

サイトを公開するにあたって、ドメインが必要となります[^1]。AWSコンソールからRoute 53のダッシュボードを開き、「Register domain」内の入力欄に取得したいドドメイン名を入力し、Checkを選択します。

![](/img/blogs/2022/1220_Route53_01.png)

入力したドメイン名が利用可能か調べてくれます。利用不可の場合は代替案を提案してくれます。また、ドメイン名やトップレベルドメイン[^2]を変更して再検索もできます。ドメインが決まったら「Add to cart」を選択し、次に進みます。

![](/img/blogs/2022/1220_Route53_02.png)

連絡先情報を入力します。個人で利用するドメインなので「Contact Type」は「Person」を選択します。

![](/img/blogs/2022/1220_Route53_03.png)

入力した内容の確認画面に移ります。「Do you want to automatically renew your doimain?」は1年後（有効期限が切れるとき）にドメインの自動更新をするかどうかの選択です。Route 53のダッシュボードから後で変更することもできます。

Terms and Conditionsを読んで、「I have read and agree to the AWS Domain Name Registration Agreement」にチェックをして購入を完了させます。

![](/img/blogs/2022/1220_Route53_04.png)

「登録受付しました」の旨が画面に表示されます。10〜15分程度で登録が完了します[^3]。登録中のドメインは「Pending requests」に表示されます。登録が完了すれば「Registered domains」に表示されます。

![](/img/blogs/2022/1220_Route53_05.png)

## 2. S3バケットを作成し、コンテンツをアップロードする

### バケットの作成

公開するサイトのコンテンツ（HTMLなど）をS3にアップロードしますが、アップロードするためにはバケットを作成する必要があります。

バケット作成画面で必要項目を入力します。Bucket nameは分かりやすさのため、取得したドメイン名と同一名のバケットを作成します。Regionは自身の住んでいるところに近いもの（国内なら東京リージョンか大阪リージョン）を選べばいいと思います。

その他の項目はデフォルトでOKです。

### コンテンツのアップロード

作成したバケット直下にindex.htmlをアップロードします。アップロード画面にファイルをドラッグ&ドロップでアップロードできます。

![](/img/blogs/2022/1220_S3_01.png)

## 3. Certificate Managerで証明書を取得する

HTTPSを使用するための証明書を取得します。Certificate Managerを開き、「Request a certificate」を選択します。ここでの注意点として、今回の構成のようにCloudFrontを利用する場合、**証明書の発行は米国東部（バージニア北部）リージョン（us-east-1）で行わければなりません**[^4]。今回一番ハマったポイントがここでした。

画面右上のリージョンが「N. Virginia（米国東部（バージニア北部））」になっていることを確認し、「Request a certificate」を選択します。

![](/img/blogs/2022/1220_CertificateManager_01.png)

「Request a public certificate」を選択します。

![](/img/blogs/2022/1220_CertificateManager_02.png)

Domain namesのFully qualified domain nameにRoute 53で取得したドメイン名を入力します。その他の項目はデフォルトでOKです。

![](/img/blogs/2022/1220_CertificateManager_03.png)

証明書の発行には結構な時間がかかります（数時間）。その間のステータスは「Pending validation（検証待ち）」となります。これが「Issued（発行済）」になればOKです。

![](/img/blogs/2022/1220_CertificateManager_04.png)

## 4. CloudFrontのディストリビューションを作成する

CloudFront を使用してコンテンツを配信する場合、ディストリビューションを作成する必要があります。ディストリビューションについては[こちら](https://docs.aws.amazon.com/ja_jp/AmazonCloudFront/latest/DeveloperGuide/distribution-overview.html)を参考にしてください。

マネジメントコンソールからCloudFrontのダッシュボードを開き、「Create distribution」を選択します。

![](/img/blogs/2022/1220_CloudFront_01.png)

### Origin

S3の設定が正しく出来ていれば、Origin domainの選択肢として`[作成したバケット名].s3.amazonaws.com`が表示されますので、これを選択します。選択するとNameに値がセットされます。

![](/img/blogs/2022/1220_CloudFront_02.png)

Origin accessはデフォルトで「Public」となっていますが、「Origin access control settings (recommended)」を選択します。これにより、S3バケット（オリジン）へのアクセスを特定のCloudFrontディストリビューションからのアクセスのみに制限することができます。本項目を選択すると「Create control setting」のボタンが表示されるので、選択すると以下のダイアログが表示されます。特に変更せずにCraeteを選べばOKです。

![](/img/blogs/2022/1220_CloudFront_03.png)

他項目はデフォルトでOKです。なお、ディストリビューション作成後にS3のバケットポリシーを変更し、CloudFrontからのアクセスを許可する必要があります。その手順は後述します。

### Default cache behavior / Function associations

基本的にデフォルトのままでOKですが、HTTPSを利用するのでDefault cache behavior→Viewer→Viewer protocol policyの値は「Redirect HTTP to HTTPS」か「HTTPS only」を選択します。HTTPアクセスをHTTPSにリダイレクトさせたい場合は前者を、HTTPSのみを許可したい場合は後者をそれぞれ選択してください。

### Settings

Price classは国内からのアクセスのみを想定するのであれば「Use North America, Europe, Asia, Middle East, and Africa」を選択すれば良いと思います。

Alternate domain name (CNAME)に、Route 53で取得したドメイン名を入力します。

Certificate Managerで証明書取得が完了していれば、Custom SSL certifiateにデフォルトでその証明書が選択されているかと思います。ここにも

> The certificate must be in the US East (N. Virginia) Region (us-east-1).

とある通り、CloudFrontで利用する証明書は米国東部（バージニア北部）リージョンにてリクエストしなければならないのでご注意ください。

その他の項目はデフォルトでOKです。「Create distribution」でディストリビューションを作成します。

![](/img/blogs/2022/1220_CloudFront_04.png)

作成したディストリビューションのステータスが「Enabled」になればOKです。

![](/img/blogs/2022/1220_CloudFront_05.png)

### S3のバケットポリシーを設定し、CloudFrontからのアクセスを許可する

CloudFrontのディストリビューション一覧から作成したディストリビューションを選択し、Originsタブから指定したオリジンを選択し、「Edit」を選択します。オリジンの編集画面に「Copy policy」ボタンがありますので、これを選ぶとバケットポリシーをコピーすることができます。コピー後に「Go to S3 bucket permission」をクリックすれば該当オリジンの編集画面に遷移できます。便利ですね。

![](/img/blogs/2022/1220_CloudFront_06.png)

ちなみに設定するバケットポリシーは以下のような構成となります。

```json
{
  "Version": "2008-10-17",
  "Id": "PolicyForCloudFrontPrivateContent",
  "Statement": [
      {
          "Sid": "AllowCloudFrontServicePrincipal",
          "Effect": "Allow",
          "Principal": {
              "Service": "cloudfront.amazonaws.com"
          },
          "Action": "s3:GetObject",
          "Resource": "arn:aws:s3:::[使用するドメイン名]/*",
          "Condition": {
              "StringEquals": {
                "AWS:SourceArn": "arn:aws:cloudfront::[AWSアカウントID]:distribution/[ディストリビューションID]"
              }
          }
      }
  ]
}
```

## 5. Route 53でDNSを設定する

Route 53でDNSの設定をし、登録したドメインへのアクセス（トラフィック）をCloudFrontにルーティングします。

Route 53のHosted zonesから登録したドメイン（リンクになっている）を選択します。

![](/img/blogs/2022/1220_Route53_DNS_01.png)

初期状態ではDNSレコードタイプ「NS」と「SOA」の2つが存在しています。ここでは、「A」レコードを追加します。「Create record」を選択してください。

![](/img/blogs/2022/1220_Route53_DNS_02.png)

「Simple routing」を選択します（この画面が表示されなかった場合、「Switch to wizard」が右上に出ているのでそれを選ぶとこの画面になります）。

![](/img/blogs/2022/1220_Route53_DNS_03.png)

「Define simple record」を選択するとダイアログが表示されますので、以下のように設定します。ルートドメインに対し設定したいので、subdomainは空欄にします。

Record typeは「A - Routes traffic to an IPv4 address and some AWS resources」を選択します。

CloudFrontディストリビューションが正しく作成出来ていれば、「Value/Route traffic to」を「Alias to CloudFront distribution」にするとChoose distributionから作成したディストリビューションを選択できます。

![](/img/blogs/2022/1220_Route53_DNS_04.png)

値を確認して「Define simple record」を選ぶと元画面に戻るので、「Create record」を選択してDNSレコードを作成します。なお、`www.[作成したドメイン]`へのアクセスをルーティングしたい場合、別でDNSレコードを新規作成し、上記手順で空にしたサブドメインに`www`を指定し、その他の値は同じにすればOKです。

![](/img/blogs/2022/1220_Route53_DNS_05.png)

## 6. アクセス確認

お使いのブラウザで`https://[取得したドメイン]/index.html`を開いてみましょう。index.htmlの内容が表示されれば成功です。ついでにプロトコルを`http`にして、アクセスしてみましょう。CloudFrontの設定でHTTPSにリダイレクトする設定になっていればHTTPSでページが開き、HTTPSのみの設定にしていれば以下のようにアクセスが拒否されます。

![](/img/blogs/2022/1220_404.png)

## 料金について

個人開発で気になるのはコストだと思いますが、トップレベルドメイン`.com`の場合12ドルが初回にかかりました。これは年間の費用で、1年後に更新する場合は再度このコストが発生します（なお、更新時には価格が変動している可能性があります）。

また、今回の構成でアクセスがほぼ無い状態で1ヶ月放置した結果、ランニングコストは0.5ドル＋消費税となりました。

## おわりに

今回はAWSを実際に利用して理解を深めることを目的として、静的サイトをAWSを使って公開する方法をまとめました。まとめてみると非常に単純な内容だなぁと思いますが、実際にゼロから構築するときはそれなりに時間がかかりました。ネットでやり方はいくらでも調べられますが、実際に自分の手でやるとどこが分かっていないのかが明確になって勉強になりました。

このサイトを足がかりにして、以下のように利用するサービスを増やして、更に理解を深めていきたいと思います。

- 「デフォルトのままでいい」とした設定の詳細を調べる
- バックエンドとのやり取りを実装（EC2）
- RDBを使ったコンテンツを実装（Aurora）
- CI/CD環境を構築する（GitHubにコミット→S3に自動配信）

ここまで読んでいただきありがとうございました。読んだ方の参考になれば幸いです。

[^1]: 公開するだけであればドメインは不要ですが、さすがにあったほうがいいと思います。
[^2]: トップレベルドメインによって値段が異なります。色々なドメインの値段を比べてみめるのも面白いです。
[^3]: 余談ですが、AWSに登録しているクレジットカードが失効しているとドメイン登録に失敗します。私はAWSアカウントを2017年に取得したのですが、その後ずっと放置しており、今年になって使い始めたらアカウント作成時に持っていたクレジットカードだったので失効しており、失敗しました・・・。再登録したところ、Cost Explorer上は2回分の登録料が表示されてしまいましたが、実際に請求されるのは登録に成功した1回分だけでした。
[^4]: オリジンにElastic Load Balancer（ELB）を利用する場合は任意のリージョンで良いそうです。詳細は[こちら](https://docs.aws.amazon.com/ja_jp/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html#https-requirements-certificate-issuer)。