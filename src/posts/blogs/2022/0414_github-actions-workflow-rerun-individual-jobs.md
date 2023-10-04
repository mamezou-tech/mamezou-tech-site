---
title: GitHub Actions ワークフローで個別ジョブのリランが可能に
author: masahiro-kondo
date: 2022-04-14
tags: [CI/CD, GitHub]
---

先月、GitHub Actions でワークフロー内のジョブを個別にリランできる機能がリリースされました。

[GitHub Actions&#058; Re-run only failed or individual jobs | GitHub Changelog](https://github.blog/changelog/2022-03-17-github-actions-re-run-only-failed-or-individual-jobs/)


以前の [GitHub Actions ワークフローにおけるジョブ制御](/blogs/2022/02/20/job-control-in-github-actions/)の記事で作ったサンプルのワークフローを利用して試してみました。


実行結果のジョブリストをマウスでホバーするとリランボタンが `Re-run this job` というポップアップと共に表示されます。

![](https://i.gyazo.com/329c5defc64fe0bee4a2924c88edc5c6.png)

従来のリランボタンも、`Re-run failed jobs` と `Re-run all jobs` を選択できるようになっています。

![](https://i.gyazo.com/adf6c58b2f93366fb83624d4a3e5f7a3.png)

失敗している TestB のリランボタンをクリックすると TestB 及び依存している Notify のジョブが実行されることを伝えるダイアログが表示されます。

![](https://i.gyazo.com/74136e0330b8db549fd049c3e0cee13f.png)

TestB は失敗するように作っているので、リランすると TestB はやはり失敗します。

![](https://i.gyazo.com/29fd5268302ef698d5fb64f1729d5262.png)

この状態で実行されなかった `Deploy` を個別に実行すると依存している TestB の再実行から開始されます。従って、実際のリリースワークフローでもデプロイジョブの依存にテストジョブが入っていれば、テスト失敗した状態で誤ってデプロイされてしまうことはありません。

strategy matrix を使うとジョブの steps の定義は1個で、matrix に指定した条件により複数のジョブが起動されます。下記の例では、Node.js のバージョンやサイト名などが matrix の属性になっており、2つのジョブが実行されます。

```yaml
name: Node.js CI
on: [workflow_dispatch]
jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
       include:
         - node-version: 10.x
           site: "prod"
           datacenter: "site-a"
         - node-version: 12.x
           site: "dev"
           datacenter: "site-b"
    steps:
      - name: Echo site details
        env:
          SITE: ${{ matrix.site }}
          DATACENTER: ${{ matrix.datacenter }}
        run: echo $SITE $DATACENTER
```

この場合も、実行結果のジョブリストから特定の条件のジョブだけ個別に再実行できます。

![](https://i.gyazo.com/07be0b5aae5f5c6498385082f82d731c.png)

個別リランが役立つのは、やはりリリース用のジョブの時でしょう。リランすれば成功することがわかっている場合[^1]は、成功したジョブを含めて最初からやり直ししなくてもよいので時間を節約できます。

[^1]: プロダクトコードやテストコードが原因ではなく、確率的に発生するエラーや、ワークフローに設定したシークレットが誤っていたなど環境に起因するエラーと特定できている状況。
