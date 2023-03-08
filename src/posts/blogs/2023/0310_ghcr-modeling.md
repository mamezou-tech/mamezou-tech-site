---
title: GitHub Packages Container Registryをモデリングしてみた – 理解の道具としてのUML
author: toshio-ogiwara
date: 2023-03-10
tags: [GitHub, container, docker]
---
コンテナイメージのコンテナレジストリとしてGitHub Packages Container Registryを使っていますが、コンテナイメージとリポジトリの関係やコンテナイメージ登録時の初期設定などが直観的でなく毎回？？となるため、理解の整理と今後の備忘を兼ねGitHub Packages Container Registryの構造とコンテナイメージ登録時の挙動に関係する者たちをUMLでモデリングしてみました。今回はこのモデルを使ったGitHub Packages Container Registryの説明と併せて筆者が日ごろどんな感じでUMLを使っているかについても少し触れたいと思います。

## Container Registryの構造
まずはContainer Registryでコンテナイメージ(イメージ)が誰にどの単位で管理されるかなどの関係をモデルにしたものが次のクラス図になります。

![model1](/img/blogs/2023/0310_resource-model.drawio.svg)

クラス図だけを見てもモデルの意図が読み切れないところがあると思うので、このモデルをもとにコンテナイメージの管理のされ方を文章で説明すると次のとおりになります。

- コンテナイメージとAccountとの関係
  - コンテナイメージを管理するContainerRegistryはPersonaアカウントまたはOrganizationアカウントごとに1つ存在する
  - ImageIDを持つコンテナイメージの実体(Image)はそのイメージ名(ImageName)で集約され ContainerRegistryによって管理される。
  - よって、コンテナイメージ(Image)にはその持ち主であるAccountが常に存在する。
  - また、これらを具体例で示すとImageID が`ba877dcd60ad`のコンテナイメージ(Image)に対し`extact-io/hello-world:latest`の(Dockerでいうところの)コンテナ名とタグが付けられていた場合、`extact-io`がAccount、`hello-world`がImageName、`latest`がTagのインスタンスとなる。
<br/>

- コンテナイメージとRepositoryとの関係
  - コンテナイメージ(Image)とRepositoryとの間に直接的な関係はないが、コンテナイメージから直接行き来できるRepositoryへのショートカット的な関係(Connect)を1つ持つことができる。
  - このコンテナイメージとRepositoryの関係は手動で作らない限り存在しない場合もある。
  - よって、コンテナイメージからRepositoryへの関係はAccountとは異なり常に存在するわけではない。なお、このConnectが作られる条件等は次のイベントモデルで詳しく説明する。

★TODO:コラム

## コンテナイメージ登録時の挙動
コンテナイメージの管理単位が分かったところで、次のお題としてコンテナイメージ登録時の挙動を分析した結果は次のとおりになります。このモデルで表したかったのはコンテナイメージ登録時にGitHubにより行われる初期設定とそれに関係するものとなります。

![model2](/img/blogs/2023/0310_event-model.drawio.svg)

今回も先ほどと同じようにモデルに対する文章での説明を付けてみます。


- Permissionの種類とRepositoryとの関係
  - コンテナイメージの初回登録時にはコンテナイメージを集約する枠的なものとしてImageNameが作られる。
  - コンテナイメージの登録にはそれに対するPermissionが必要となる。このPermissionを持っているモノとしてPersonaアカウントごとに払い出されるPersonal Access Token(PAT)とRepositoryが払い出すGITHUB_TOKENの２つがある。
  - PATはAccount単位で払い出されるものとなるため、特定のRepositoryに紐づくものでなく、ざっくりいうとAccountが持つすべてのRepositoryに対して操作が可能なものとなる。このため、PATにはRepositoryの色はない。
  - 一方のGITHUB_TOKENがRepository単位で払い出されるものとなるため、GITHUB_TOKENで操作できるのは、それを払い出したRepositoryのみとなる。よって、GITHUB_TOKENでアクセスされた場合、その対象としているRepositoryを特定できる。

初期設定の挙動は、大きく登録時に使われたPermissionと初回登録時のコンテナイメージに`org.opencontainers.image.source`のLABEL(OCIではAnnotation)の有無で異なります。

- Connectの作成(コンテナイメージとRepositoryとの紐づけ)
  - 初回登録時のPermissionにGITHUB_TOKENが使われた場合、GITHUB_TOKENを払い出したRepository、つまりGitHub Actionsのワークフローを実行しているRepositoryとコンテナイメージを紐づけるConnectが作られる。
  - これとは別にPATを使った登録でも、初回登録時のコンテナイメージに`org.opencontainers.image.source`のLABELが設定されている場合は、そのvalueに設定されているRepositoryに対するConnectが作られる。
  - なお、初期登録時の条件に当てはまらずConnectが作成されなかった場合でも画面から手動で任意のRepositoryに対するConnectが作成することができるが、1度作られたConnectは削除することはできない。これはコンテナイメージとRepositoryとの関係を1度設定した後はその関係を変えることはできないことを意味する。
<br/>

- 可視性の初期設定
  - コンテナイメージは公開(PUBLIC) / 非公開(PRIVATE)の可視性があるが、この可視性は初回登録時のPermissionにより決定される。
  - 登録時にGITHUB_TOKENが使われた場合、そのGITHUB_TOKENのRepositoryと同じ可視性がコンテナイメージに初期設定される。つまり、GITHUB_TOKENを使ってGitHub Actionsのワークフローで初回登録を行った場合、そのワークフローを実行したリポジトリと同じ可視性が設定される。
  - もう一方のPATが使われた場合、GitHubは可視性をどちらにすればよいか判断がつかないため、初期設定としては非公開(PRIVATE)が設定される。
  - なお、可視性はいつでも変更が可能となっている。

## 最後に(理解の道具としてのUML)
モデルをもとに説明を読むと意外とスッと理解していただけたのではないでしょうか？

設計成果物としてUMLを使う機会は依然よりも少なりましたが、筆者が所属する会社では設計意図や「こんな感じ」といった設計意図を伝えるコミュニュケーション手段としてUMLは今でも普通に使っています。

UMLやモデリングというと敷居が高そうな感じがしますが、誤解を恐れずに言うとコミュニケーションの道具として使う分には細かいことに拘る必要はありません。たとえ荒削りの図でもコミュニュケーションの手助けとしては十分価値をハッキリすると思います。
なので、筆者は入社したばかりでUMLに慣れていないメンバーには、UMLとしてではなくまずは説明の"図"として使っていくと良いと思うよとアドバイスしています。

UMLはなぁ～と思われている方はコレを契機にまずはコミュニュケーションの道具としてUMLを使い始めてみてはいかがでしょうか。令和の時代になってもUMLはお勧めです！

★TODO:注意事項