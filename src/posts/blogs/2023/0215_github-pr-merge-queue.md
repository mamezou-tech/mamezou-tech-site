---
title: GitHub Pull Request マージキュー(beta)を試す
author: masahiro-kondo
date: 2023-02-15
tags: [GitHub, CI/CD]
---

GitHub で PR のマージキューがパブリックベータになりました。

[Pull request merge queue (public beta) | GitHub Changelog](https://github.blog/changelog/2023-02-08-pull-request-merge-queue-public-beta/)

## マージキューの概要
ブランチを作成してから PR を作成するまでに発生した main ブランチの変更を取り込む必要があるケースはけっこうあります。特に規模の大きい開発ではマージの作業コストは大きくなります。マージキューの ChangeLog の文章には以下のように書かれています。

> 開発者はマージ前に PR ブランチを更新して、マージ時に変更が main ブランチを壊さないようにする必要がしばしばありました。PR ブランチ更新のたびに、CI によるチェックの新たなラウンドが発生し、開発者がマージを試みる前に終了する必要がありました。別の PR がマージされた場合、すべての開発者はプロセスを再度実行する必要があります。
> マージキューは、マージのためにキューに入れられた各 PR がキュー内の先行する PR でビルドされるようにすることで、このプロセスを自動化します。

つまり、PR を作成したらマージする代わりにマージキューに投入することで、投入された PR の順に必要なチェックを実行し main ブランチが壊れないようマージしてくれます。

## リポジトリでマージキューを有効化する
ブランチプロテクションルールに `Require merge queue` が Beta ラベル付きで追加されています。

:::info
パブリックベータの段階では、有償プラン・無償プランを問わず Organization の public リポジトリでの利用が可能なようです。
:::

リポジトリの Settings > Branches と開き、`Add branch protection rule` をクリックします。

![Add branch protection rule](https://i.gyazo.com/6217d3295f694abac1ac0fada253d9b0.png)

Branch name pattern に `main` を入力。

![branch name pattern](https://i.gyazo.com/bc0ae07d0e773d196813f5568acebdf2.jpg)

`Require merge queue` にチェックを入れます。Merge method は `Squash and merge` か `Rebase and merge` を選択する必要があります。`Only merge non-failing pull requests` もチェックを入れないと CI が通らない PR がマージされてしまいます。

![Require merge queue](https://i.gyazo.com/5efe31573af60092c797f9ee0408f380.png)

`Create` をクリックすると、Branch protection rules が main ブランチに追加されます。

![Rule created](https://i.gyazo.com/8554fbe51e0eb8c53865d3bd75861d72.png)

## GitHub Actions ワークフローの準備
GitHub Actions ワークフローのトリガーに `merge_group` が追加されています。このトリガーを使うと PR がマージキューに追加されたときにワークフローを起動できます。

[マージキューの管理 - GitHub Docs](https://docs.github.com/ja/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue)

以下のように、ワークフローファイルを作成しました[^1]。トリガーとして、`pull_request` と `merge_group` を追加し、PR 作成時とマージキュー投入時にテストが実行されるようにしています。

[^1]: このお試し用リポジトリでは、Deno のコードをビルド・テストしています。

- .github/workflows/ci.yml

```yaml
name: CI

on:
  pull_request:
  merge_group:

jobs:
  build:

    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3
    - name: Setup Deno
      uses: denoland/setup-deno@v1
      with:
        deno-version: v1.x
    - name: Test
      run: deno test
```

## PR を作ってマージキューに投入してみる

PR を作ると、従来の `Merge Pull Request` ボタンが、`Merge when ready` になっています。

![Merge when ready](https://i.gyazo.com/62c512dce129acef55115a1dc29ca438.png)

`Merge when ready` をクリックしさらに `Confirm merge when ready` をクリックすると、マージキューに入り、しばらくするとマージが終わります。

![Queued to merge...](https://i.gyazo.com/2e9d1e727a1fcd43b54e623e949eee67.png)

:::info
後続の PR が先行の PR とコンフリクトする時は、マージキューから自動的に除外されます。この場合、開発者がコンフリクトを解消する必要があります。コンフリクトを解消したら、`Merge when ready` がクリックできるようになります。

![has conflicts](https://i.gyazo.com/67b273275a6eb29620c1fae1a345e64b.png)
:::

## 複数の PR をマージキューに投入する
複数の PR を矢継ぎ早に投入してキューの様子を見てみます。

キューに先に投入する1つ目の PR です。

![PR#9](https://i.gyazo.com/11b424a0ef28667bc543ed8e9f181177.png)

2つ目の PR です。

![PR#10](https://i.gyazo.com/75ab24d94cee669fcf7929f8e16828f8.png)

2つの PR をマージキューに入れて Merge queue の画面を見てみました。

![Merge queue](https://i.gyazo.com/74448cfd3e9e8cb6c01acf4a1873bb16.png)

サンプルプロジェクトではテストがあっという間に終わるので、一瞬で2つの PR がマージされていました。時間のかかる CI なら、自分の PR がどの辺にいるかをこの画面で確認することになります。

2つの PR をキューに投入した時のワークフローの実行履歴です。2つの PR を作成したので、PR 作成時とマージキューへの投入時で4つの履歴ができるかと思いましたが、それぞれ1度ずつ2つでした。

![Action History](https://i.gyazo.com/a08240a1074d2564e80a4d4b4fd37147.png)

PR のタイムラインにはマージキュー投入後にチェックがパスしたとあります。推測ですが、PR 作成時のワークフローをリランしているのではないかと思います。

![timeline](https://i.gyazo.com/b5b9760c919b288f3e3e51bbb872628b.png)

## 最後に
以上、GitHub の Pull Request マージキューを設定して試してみました。実際のプロジェクトで使ってみないと実感はしづらいですが、PR を作って CI が通ってしまえばあとはキューに入れて順番待ちというのはかなり精神的に楽だろうなあと思います。
