---
title: GitHub Packages Container Registryをモデリングしてみた – UMLを理解の道具として
author: toshio-ogiwara
date: 2023-03-09
tags: [GitHub, container, docker, モデリング]
---
コンテナイメージのコンテナレジストリとしてGitHub Packages Container Registryを使っていますが、コンテナイメージとリポジトリの関係やコンテナイメージ登録時の初期設定などが直観的でなく毎回？となるため、理解の整理と今後の備忘を兼ねGitHub Packages Container Registryの構造とコンテナイメージ登録時の挙動に関係する者たちをUMLでモデリングしてみました。今回はこのモデルを使ったGitHub Packages Container Registryの説明に加えて日ごろ筆者がどのような感じでUMLを使っているかも少し触れてみたいと思います。

## Container Registryの構造
まずはContainer Registryがどこでどのようにコンテナイメージを管理しているかの関係をモデルにしたものが次のクラス図になります。

![model1](/img/blogs/2023/0309_resource-model.drawio.svg)(クリックすると拡大します)

クラス図だけを見てもモデルの意図を読み切れないと思うため、このモデルに対する補足を文章で加えると次のようになります。

- コンテナイメージとAccountとの関係
  - コンテナイメージを管理するContainerRegistryはPersonalアカウントまたはOrganizationアカウントごとに1つ存在する。
  - ImageIDを持つコンテナイメージの実体(Image)はそのイメージ名(ImageName)ごとに集約され ContainerRegistryによって管理される。
  - よって、コンテナイメージ(Image)とAccountの関係は常に存在する。
  - また、それぞれのクラスの具体例を示すとImageIDが`ba877dcd60ad`のコンテナイメージ(Image)に対して`extact-io/hello-world:latest`の(Dockerでいうところの)イメージ名とタグが付けられていた場合、`extact-io`がAccount,`hello-world`がImageName,`latest`がTagのインスタンスとなる。
<br/>

- コンテナイメージとRepositoryとの関係
  - コンテナイメージ(Image)とRepositoryの間に直接的な関係はないが、コンテナイメージからRepositoryへの行き来を可能にするショートカット的な関係(Connect)を1つ持つことができる。
  - このコンテナイメージとRepositoryとの関係は多重度に表されているように場合によっては存在しないこともある。
  - よって、コンテナイメージとRepositoryとの関係は常に存在するわけではなく、Accountとはこの点が異なる。なお、このConnectが作られる条件等は次のモデルで詳しく説明する。

:::column:クラス図だけですべて伝わる？
クラス図だけ書いてモデリングできた！(ﾄﾞﾔｯと見せてくる人がたまにいますが、エスパーじゃないのでクラス図だけでそのモデルの目的や内容をすべて理解することはできません、少なくとも筆者は。

モデルを作る目的の一つに対象を他人に理解してもらうことがあります。なので、いくらキレイなソレっぽいモデルを作っても相手が理解できなければ意味はありません(と、もう20年以上前のことですが豆蔵に入りたての頃に諸先輩方から沢山ご指導ご鞭撻いただきました)。このため、分かりやすいモデルを作ることはもちろんですが、それに加えて意図がキチンと伝わるように筆者はモデルの説明もセットで付けるようにしています。

ちなみにモデルの説明は文章ではなくUMLの制約やOCL(Object Constraint Language)で表すという手もありますが、読み手側が理解できることは少ないため筆者は制約表記は余り使わず文章で補足するようにしています。(これには筆者がOCLは苦手、、という本音もありますが)

またクラス図とは別にシーケンス図などの動的モデルで内容を補足するという手もあります。これはケースバイケースで使う場合もあります。シーケンス図を書くのはそれなりに手間が掛かるため、手間をあまり掛けず文章よりも分かりやすく説明できるような場合にはザックりしたシーケンス図を作ったりします。
:::
## コンテナイメージ登録時の挙動
コンテナイメージの管理のされ方が分かったところで、次のお題としてコンテナイメージ登録時の挙動を分析した結果が次のクラ図になります。このモデルで表したかったことはコンテナイメージ登録時に GitHub Packages により行われる初期設定とそれに関係するものとなります。

![model2](/img/blogs/2023/0309_event-model.drawio.svg)(クリックすると拡大します)

今回も先ほどと同じようにモデルに対する補足を文章で付けてみます。

- Permissionの種類とRepositoryとの関係
  - コンテナイメージの初回登録時にはコンテナイメージを集約する枠的なものとしてImageNameが作られる。
  - コンテナイメージの登録にはPermissionが必要となる。このPermissionにはPersonalアカウントごとに払い出されるPersonal Access Token(PAT)とRepositoryが払い出すGITHUB_TOKENの２つがある。
  - PATはAccount単位で払い出されるため、特定のRepositoryに紐づくものでなくAccountが持つすべてのRepositoryに対するものとなる。このためPATにRepositoryの色はない。
  - 一方のGITHUB_TOKENはRepository単位で払い出されるめ、GITHUB_TOKENで操作できるのはそれを払い出したRepositoryのみとなる。よって、GITHUB_TOKENが使われた場合、対象としているRepositoryを特定できる。


次に初回登録時の挙動を補足すると、以下に説明するとおり、その挙動は登録時に使われたPermissionと登録時のコンテナイメージのLABELの有無で変わってきます。

- Connectの作成(コンテナイメージとRepositoryとの紐づけ)
  - 初回登録時のPermissionにGITHUB_TOKENが使われた場合、GITHUB_TOKENを払い出したRepository、つまりGitHub Actionsのワークフローを実行しているRepositoryに対するConnectが作られる。
  - PATを使った場合でもコンテナイメージに`org.opencontainers.image.source`のLABEL(OCIではAnnotation)[^1]が設定されている場合は、そのvalueに設定されているRepositoryに対するConnectが作られる。
  - 上記の条件に当てはまらず初回登録時にConnectが作成されなかった場合でも画面から手動で任意のRepositoryに対するConnectを作成することができる。
  - ただし、1度作られたConnectは削除することはできない。これはコンテナイメージとRepositoryの関係を1度設定した後はその関係を変えることができないことを意味する。
<br/>
[^1]: LABEL設定の詳細についてはGitHub公式マニュアルの[こちら](https://docs.github.com/ja/packages/learn-github-packages/connecting-a-repository-to-a-package#connecting-a-repository-to-a-container-image-using-the-command-line)を参照

- 可視性の初期設定
  - コンテナイメージは公開(PUBLIC) / 非公開(PRIVATE)の可視性を持つが、この可視性は初回登録時のPermissionにより決定される。
  - 登録時にGITHUB_TOKENが使われた場合、そのGITHUB_TOKENのRepositoryと同じ可視性がコンテナイメージに初期設定される。つまり、GITHUB_TOKENを使ってGitHub Actionsのワークフローでコンテナイメージを初回登録した場合、そのワークフローを実行したリポジトリと同じ可視性が設定される。
  - 一方のPATが使われた場合、GitHub Packagesはどちらの可視性にすればよいか判断がつかないため、初期設定として非公開(PRIVATE)が設定される。
  - なお、可視性はConnectとは異なりいつでも変更が可能となっている。

## 最後に(理解の道具としてのUML)
モデルをもとに説明を読むと意外とスッと理解していただけたのではないでしょうか？

設計成果物としてUMLを使う機会は以前よりも少なくなりましたが、筆者が所属する豆蔵では「こんな感じ」と設計意図を伝えるコミュニケーション手段としてUMLは今でも身近に使われています。

UMLやモデリングというと敷居が高そうな感じがしますが、誤解を恐れずに言うとコミュニケーションの道具として使う分には細かいことに拘る必要はありません。たとえ荒削りの図でもコミュニケーションの手助けとしては十分効果を発揮してくれます。
なので、UMLに慣れていないメンバーには、UMLとしてではなくまずは説明の"図"として使っていくとそのうちに自然に使えるようになると思うよと筆者はアドバイスしています。

もしUMLはなぁ～と思われている方がいたらコレを機会にまずはコミュニケーションの道具としてUMLを使い始めてみてはいかがでしょうか？令和の時代になってもUMLはお勧めです！

:::alert:今回紹介している内容について
今回の記事ではUMLをコミュニケーションの道具として紹介していますが、ドメインによっては要求を設計、実装に繋げる設計成果物として使用する場合もあります。現に筆者が所属する豆蔵の他のチームではそのような使い方を実践し多くの実績を残しています。今回の記事はあくまでも筆者が所属する業務アプリを扱う部署近辺での様子となるため、その点は誤解のないようお願いいたします。
:::
