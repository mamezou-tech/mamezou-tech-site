---
title: GitHub における PR レビュープロセス - conversation の活用
author: masahiro-kondo
date: 2022-06-29
tags: [GitHub]
---

GitHub の PR(Pull Request) レビューのプロセスは、開発チームによってバリエーションはあると思いますが、おおよそ次のようになると思います。

```mermaid
flowchart TB
subgraph レビューイ
  ブランチ作成-->コード修正-->PR作成-->レビュアーアサイン
  subgraph レビュー対応
    コメント確認-->コメント箇所修正-->rep[conversation リプライ]
  end
  レビュー対応-->再レビューリクエスト
end
subgraph レビュアー
  レビュー-->CH{Conversation<br>がない or<br>全て resolved}-->|yes|approve-->マージ
  CH-->|no|RC[Request changes]
  subgraph レビュー
    cv[インラインコメント<br>conversation 開始]
  end
  subgraph 再レビュー
    rcv[修正箇所確認<br>conversation resolve<br> or リプライ]
  end
end
RC-->レビュー対応
レビュアーアサイン-->レビュー
再レビューリクエスト-->再レビュー-->CH
```

レビューイは PR を作って、レビュアーをアサインし、アサインされたレビュアーが、ソースコードにインラインコメントしてレビューを完了します。レビューイは指摘があれば対応、再レビューリクエストし、レビュアーの再レビューで問題なければ承認(approve)、マージという流れです。

:::info
このフローではレビュアーが approve 後にマージしていますが、approve 後であれば、レビューイがマージしても構いません。特にレビュアーが複数の場合は、レビューイがマージする方が分かりやすいでしょう。

また、このフローでは PR 作成してすぐにレビュアーアサインしていますが、Draft で PR を作成し準備ができるまで、レビュアーのアサインやレビュー自体ができない状態にすることも可能です[^1]。

[^1]: Draft の PR は Organization と Public リポジトリで利用可能です。

![](https://i.gyazo.com/04856266b4698f7fd8d42d7337d01e12.png)

Draft の PR で準備が完了したら、`Ready for review` をクリックしてレビュアーをアサイン可能にします。

![](https://i.gyazo.com/6177e5cd631f1116dca717d0c799762e.png)
:::

フローに登場する、コメントを起点とする conversation について少し詳しめに説明します。

GitHub のレビューでは、コードにインラインでコメントしますが、PRに対して最初のコメントを記入し、`Start a review` ボタンをクリックすることでレビュー中状態に移行します。

![](https://i.gyazo.com/5078c72d5468ac3a5f7586eacec69e12.png)

インラインコメントは、即時にレビューイに開示されるのではなく、Pending 状態になり、レビューを完了するまでは、レビュアーにのみ見えています。レビュー中はコメントを何度編集しても edited のようなマークはつきません。

![](https://i.gyazo.com/5a7470e15b8131d1aa887a58865a3d00.png)

コードに対する1つのコメントを起点としたコメント-リプライのセットが1つの conversation として管理されます。

レビュアーはコメントの記入が終わったら、`Finish your review` をクリックしてレビュー完了のコメントを残すとともに、ラジオボタンから、レビュー結果を選択します。

![](https://i.gyazo.com/59458e7f43230ff09d381e3c4a417e97.png)

一人のレビュアーにとっては、PR(アサイン後)の状態は以下のように遷移します。
```mermaid
flowchart TB
未レビュー-->|最初のコメント記入|レビュー中
レビュー中-->|Finish - Comment|comp[レビュー完了-Comment]
レビュー中-->|Finish - Approve|comp1[レビュー完了-Approve]
レビュー中-->|Finish - Request changes|comp2[レビュー完了-Request changes]
```

Approve は PR を承認した状態で、レビュアーの右にチェックマークが付きます。

![](https://i.gyazo.com/1a8bc6f072accae3bbac593c018ec3b3.png)

Request changes はレビューイに PR の修正を要求、Comment は単にコメントして完了です。いずれも、レビュアーの右に状態とともに、`Re-request review` のリロードのようなボタンが表示されます。

![](https://i.gyazo.com/dcdcd51722f3604f3df7da9540e8800e.png)

レビューイは、approve でない場合はコードを修正し push した上で conversation にリプライすることでレビュアーに対応内容を返信します。レビュアーは再レビュー時に conversation と修正箇所を個別に確認し、問題なければ resolve します[^2]。

[^2]: スクリーンショットはすでに resolve した conversation を開いたものなので、ボタンが Unresolve になっています。

![](https://i.gyazo.com/688f38a53646010b84236231188415bf.jpg)

Conversation が全て resolve されるとレビュー完了で approve ということになります。

![](https://i.gyazo.com/9b95d7e1833f6c184920b1850922edb7.png)

つまり、レビューとその対応の中で、

- レビューイはコードを修正するだけでなく、conversation にリプライする
- レビュアーはリプライとコード修正を確認して問題なければ、conversation を resolve する

のように conversation 単位でやり取りを完結するようにします。

conversation にリプライせず、コードを push しただけで再レビュー依頼をする人がよくいますが、レビュアーからすると修正されたのか、修正されていない場合コメントを見逃しているのか、それとも修正不要と判断したのか、などがぱっとわかりません。指摘箇所が多い場合はかなりの労力で、無駄に再レビューの回数も増えたりします。

conversation の存在はあまり意識していない人も多いかもしれませんが、このように対話が成立するように使うとレビューの進捗が分かりやすく、レビューイ、レビュアーがお互いにストレスなく作業できると思います。
