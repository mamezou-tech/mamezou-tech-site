---
title: AWSのコスト見直しに！myApplicationsでリソースをまとめて可視化する
author: kohei-tsukano
date: 2024-12-11
summerRelayUrl: https://developer.mamezou-tech.com/events/advent-calendar/2024/
tags: [aws, advent2024]
image: true
---

これは[豆蔵デベロッパーサイトアドベントカレンダー2024](/events/advent-calendar/2024/)第8日目の記事です。

## はじめに

ビジネスソリューション事業部の塚野です。最近AWSを個人的にも使いはじめ、円安の折もあり月々のかかるコストが気になってきました。
毎月費用については確認していたのですが、各サービスごとに料金体系も異なり、サービスの中には実際のメトリクスを取らないと最適な料金プランが分からなかったりするものもあったりと、見直しにもそれなりの気合が必要です。
ここは年末の大掃除…と思ってコストの見直しを決意し、色々調べたところAWSマネージメントコンソールから利用できるmyApplicationという機能がいい感じそうだったのでご紹介したいと思います。

## コスト配分タグ君ってさぁ…

今回、コストの見直しをしようと思いまずはコスト最適化のベストプラクティスを調べてみました。
AWSから出されているホワイトペーパーのうち、AWSアーキテクチャ設計のベストプラクティスとしてAWS Well-Architectedフレームワークというものが公開されています。
このフレームワークは6つの柱によって支えられており、そのうちの一つに`コスト最適化の柱`があります。
@[og](https://docs.aws.amazon.com/ja_jp/wellarchitected/latest/cost-optimization-pillar/welcome.html?ref=wellarchitected-wp)

コスト最適化の柱が示すベストプラクティスは5つあり、その中に`クラウド財務管理を実施する`というものがあります。
クラウドとオンプレではそのコスト管理方法も異なってくるため、クラウドソリューションではそれに適した方法でコストの管理、最適化、計画を行います。
AWSでは[クラウド財務管理のためのフレームワーク(Cloud Financial Management (CFM))](https://aws.amazon.com/jp/blogs/news/aws-cost-optimization-guidebook/)を公開しており、その中でCFMの実践にはまず「クラウド利用費用の可視化」が必要だとしています。

AWSサービスの利用量を可視化するには、一般的には以下のようなCost Explorerを使用するかと思います。
![Billing and Cost ManagementのCost Explorer](https://gyazo.com/febee5bacb05270c6331c51683422bbd)

ただし、同一アカウント内の全リソースが一度に表示されてしまうため、例えばアプリAで使っているECSではいくら、アプリBで使っているECSではいくらコストがかかっている等、アプリごとにリソースを分けてコストを表示するにはコスト配分タグという機能を使う必要がありました。

このコスト分配タグ、リソースにタグをつけられる機能を利用したものです。そのため、これを使いたいリソース毎にコスト配分用のタグを作成し貼り付けていく必要がありました。
また、タグをつけただけでは機能せず、コスト配分タグのメニューからアクティベートをしなければ使えません。
Terraformなどを使ったIaCを導入している場合そこまでかもしれませんが、マネージメントコンソールから行う場合これがかなり面倒で、リソースの数が増えればタグの付け漏れもおきます。
そんなちょっとアレなコスト配分タグ君に代わって、コストの可視化に使える機能がマネージメントコンソールのmyApplicationsです

## myApplicationsを使ってみよう！

myApplicationsはre:Invent2023で発表された機能です。マネージメントコンソールの一番目立つ所にいつの間にか↓のようなウェジットが追加されていましたが、ここから設定が行えます。
![お前だったのか…myApplicationsというのは](https://gyazo.com/76ad0c9dd4dd0481af78ba1276ee36c7)

「アプリケーション」としてリソースをまとめ、まとめたリソース群ごとにコストが算出できるようになります。これでいちいちリソースにタグをつけて回る必要はありません。
「アプリケーションの作成」を行います。

まずはアプリケーション名を付けます。今回は「sample_app」としました。
アプリケーションとしてまとめるために既存のタグやService Catalogの属性グループを使うこともできます。その場合この画面下のオプションで指定しましょう。
次に進みます。
![アプリケーションの作成](https://gyazo.com/fcef7305ff2191b3efd2033dc357c0c4)

リソースの追加画面になります。ここで、Resuorce Explorerをアクティベートしていない場合は有効化をしておきましょう。
![リソースの追加にはResource Explorerが必要](https://gyazo.com/fcef7305ff2191b3efd2033dc357c0c4)

Resource Explorerはリージョン横断でリソースが検索できるサービスで、利用料金は無料です。[^2]
リソースの追加には手動で追加する方法と既存のタグから追加する方法[^3]がありますが、手動での追加にこのResource Explorerを使用します。
Resource ExplorerではすべてのAWSリソースが検索できるわけではありません。例えばAPIGatewayではREST APIのみのサポートだったりします。検索できるサービスは[こちら](https://docs.aws.amazon.com/ja_jp/resource-explorer/latest/userguide/supported-resource-types.html?icmp=docs_re_console_supported-resource-types)を確認してください。
Resource Explorerのアクティベートには「アグリゲータインデックスリージョン」を指定する必要があります。どのリージョンにリソース情報を集めるか？ということですね。
今回東京リージョンを指定しました。ちなみにアグリゲータインデックスは1アカウントに1つまでしか作れません。

![リソースの追加](https://gyazo.com/373fea5623c68e012147520a480e6b41)
「リソースを選択」からアプリケーションに含めるリソースを追加していきます。`リソースタイプ = ecs:service`のようにクエリキーワードでリソースを検索し、追加していきます。or条件で一気にリソースの検索ができないので1つずつ「追加」　→　「リソースの選択」でリソースを追加します。

![追加したリソース一覧](https://gyazo.com/1f230200deab225b7b044eb58f1e42e0)
リソースの追加が終わったらレビュー画面で確認して、「アプリケーションを作成」します。
無事リソースの追加が完了するとマネージメントコンソールに作成したアプリケーションが追加されます。

![作成したアプリケーションがマネコンに追加されていますね](https://gyazo.com/f1cf7e1625a7e9bd0e28bb17fc070e00)

このリソースの追加では自動的に`awsApplication`タグの付与が行われます。このタグのvalueはアプリケーションのARNです。厳密には後述しますがResource Groupsというリソースになります。
私が試した際はタグの自動付与に失敗したリソースがありました。その際は直接当該リソースへこの`awsApplication`タグを付与すればリソース一覧へ追加してくれます。

![myApplicationsのウィジット](https://gyazo.com/0255fc963ab067d450d2ad8c3df16f07)

myApplicationsウィジットではアプリケーションのコストのほか、アラームやメトリクスの表示もできます。
ちなみに、メトリクスの表示にはAmazon CloudWatch Application Signalsというこれまたre:Invent2023で登場したサービスを利用します[^4]。料金は毎月初回10TBまでは0.35 USD/GBなので気にならない方はONにするといいかもしれません。

myApplicationsではタグ付けしてから遡ってコストを取得してくれるような機能はないようで、当月のコストは0 USDと予想されるコストも表示されていません。
この点でいえばコスト配分タグは最近のアップデートによって、タグ付けしてから12か月分の利用状況を遡って取得してくれます。myApplicationsでもバックフィルをリクエストできるようになるアップデートを待ちましょう。
作成したアプリケーションのコストをCost Explorerで表示したい場合は、画面右側のフィルターの「タグ」でアプリケーションの`awsApplication`タグを選択すればよいです。

[^2]:Resource Explorerはこちらの解説記事で詳しく解説されています。[[新機能] リージョン・サービスを横断してリソースを検索できる AWS Resource Explorer が使えるようになっていました - DevelopersIO](https://dev.classmethod.jp/articles/aws-resource-explorer-new/)
[^3]:タグからリソースを追加する方法はこちらで解説されています。指定したタグをつけたリソースが新たに作られると自動的にアプリケーションのリソースへ登録してくれるそうです。[[アップデート] myApplication でカスタムタグを使ったリソースの追加と、タグ同期機能によるリソースの自動追加が出来るようになりました - DevelopersIO](https://dev.classmethod.jp/articles/myapplications-tag-sync/)
[^4]:Amazon CloudWatch Application Signalsについてはこちら。[Amazon CloudWatch Application Signals 徹底解説 - Qiita](https://qiita.com/AoTo0330/items/4d3cf0f6126f1a2a76c5)

## myApplicationsで作られるアプリケーションの実体は？

ここで気になるのはmyApplicationsで作られる「アプリケーション」とは具体的にどのようなリソースなのか？です。`awsApplication`タグのvalueとしてアプリケーションのARNを指定しますが、これは前述したようにResource GroupsというリソースのARNになります。
Resource Groupsは文字通り複数のリソースをグループ化し管理するためのリソースです。myApplicationsはこのResource GroupsをService Catalogの力を借りて作成します。
myApplicationsウィジットでアプリケーションを作成した際に作られるリソースは以下の3つです。

- Service Catalog App RegistryのApplication
- Resource Groups（AppTags）
- Resource Groups（Application）　←これが`awsApplication`タグのvalueで指定されるARNのリソース

myApplicationsで作成されるアプリケーションは端的に言ってしまえばService Catalog App RegistryのApplicationになります。実際にService Catalog App RegistryではmyApplicationsで作成したアプリケーションが表示されており、この画面からでもアプリケーションの作成が行えます。
Service Catalog App RegistryのApplicationはリソースをまとめるためにResource Groupsリソースを作成します。名前にそれぞれAppTags、ApplicationとつくResource Groupsが作成されますが、まとめられたリソースが紐づけられているのはAppTagsの方で、Applicationの方はAppTagsへの参照を持つだけです。
`awsApplication`タグのvalueで指定されるARNのリソースはApplicationのResource Groupsリソースです。AppTagsを直接紐づけて依存しないようにしています。
上記の内容はこちらの記事で詳しく解説されています。興味があればご覧ください。
@[og](https://qiita.com/hiramax/items/00dd304a311ba40acc63)

## おわりに

簡単にアプリケーションごとのダッシュボードが作成できるmyApplicationsについてご紹介しました。アプリケーションを作成してすぐにはコストの表示ができないのが少し残念ですが、コストの可視化以外にも様々なウィジットが作成できるため活用してみてはいかがでしょうか。
元々の目的であるコストの見直しは今回できなかったのですが、コスト削減法についても勉強でき、特にmyApplicationsと同じくre:Invent2023で発表された[The Frugal Architect](https://thefrugalarchitect.com/laws/)と呼ばれるコスト最適化フレームワークについて勉強してみようと思いました。

