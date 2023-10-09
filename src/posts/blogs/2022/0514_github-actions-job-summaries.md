---
title: GitHub Actions ジョブサマリー機能を使う
author: masahiro-kondo
date: 2022-05-14
tags: [CI/CD, GitHub]
---

GitHub Actions のジョブサマリー機能がリリースされました。

[Supercharging GitHub Actions with Job Summaries | The GitHub Blog](https://github.blog/2022-05-09-supercharging-github-actions-with-job-summaries/)

ワークフロー内で、`GITHUB_STEP_SUMMARY` 環境変数を用いてワークフロー実行中の情報を出力できます。出力内容はワークフロー実行のサマリーページに表示されます。[GitHub Flavored Markdown](https://github.github.com/gfm/) が使えますので、表現力は十分でしょう。

さっそく [GitHub Actions のジョブ制御の記事](/blogs/2022/02/20/job-control-in-github-actions)で作成したワークフローに組み込んでみます。

各ジョブの最後で Slackに通知する情報を出力しているので、同じ場所でジョブサマリーにも出力します。

```yaml
  TestA:
    runs-on: ubuntu-latest
    needs: Build
    outputs:
      done: ${{ steps.check.outputs.message }}
    name: Run Test A
    steps:
    - name: Test A
      run: echo Test A
    - id: check
      if: ${{ always() }}
      run: |
        echo "::set-output name=message::Test A ${{ (job.status == 'success' && '✅') || '❌' }}"
        echo "- TestA : ${{ (job.status == 'success' && '✅') || '❌' }}" >> $GITHUB_STEP_SUMMARY
```

ワークフローを実行して、サマリーページを確認すると、下の3つのセクションにワークフローで出力したジョブサマリーが表示されました (この例だと元々表示されているものから情報量は全く増えていませんが)。

![](https://i.gyazo.com/b70cc89903aa60c2c449b4bf45ffc010.png)

リッチなサマリーページを作るには、echo コマンドで頑張るのではなく、ジョブサマリー機能を使った Action を利用する想定のようです。そのため、JavaScript Action 作成用 NPM パッケージ [@actions/core](https://www.npmjs.com/package/@actions/core) に Markdown 出力用のヘルパーユーティリティが追加された模様です。

上記ブログには、ジョブの詳細情報を Markdown のテーブルに出力したサンプル画像が掲載されています。

![](https://github.blog/wp-content/uploads/2022/05/image-3.png)

今後、ジョブサマリーの機能を使った Action が開発されサマリーページにジョブ実行に関する有益な情報を表示できるようになっていくことでしょう。
また、そのような Action の登場を待たなくても echo だけで手軽にサマリーページに付加情報を表示できるので機会があれば利用してみてはいかがでしょうか。
