---
title: GitHub オーガニゼーションのリポジトリ作成を通知する GitHub Actions ワークフローを作る
author: masahiro-kondo
date: 2025-09-26
tags: [CI/CD, GitHub]
image: true
---

## はじめに
豆蔵の GitHub オーガニゼーションもメンバーが増えて、多くのリポジトリを把握するのが困難になってきました。

新規のリポジトリ作成の内容をチェックすることも必要になってきました。機密性の高い情報を扱う場合もあるため、リポジトリの可視性が public になっていないかを確認することは重要です。

この記事では、オーガニゼーションのリポジトリ作成を通知する仕組みを構築しようと試行錯誤した内容をお届けします。

:::info
豆蔵では Team プランで契約していますが、Enterprise プランならメンバーのリポジトリの作成を制限し、オーガニゼーションの管理者が依頼ベースで作成する運用も可能です。
開発者の自発的活動を阻害してしまうことにも繋がるため、個人的にはあまりこのような制約はかけたくはありませんが。
:::

## GitHub のイベント通知を Slack の Incoming Webhook で受ける(ダメ)

Slack には Incoming Webhook というアプリで Webhook 経由の通知を受け取る汎用的な仕組みがあります。

![Incoming Webhook](https://i.gyazo.com/a995b0a95192c72ed6ecddc5fce06e17.png)

最初 GitHub から Incoming Webgook でイベント通知すればいいのでと考えました。そこで、通知したい Slack チャンネルに Incoming Webhook を導入。

![Install incoming webhook](https://i.gyazo.com/99c9ee1df1e03b23a7fef81a1957582c.png)

GitHub の オーガニゼーションの Settings で Webhooks > Add webhook で設定します。

通知するイベントを選択するオプションを指定。

![Add webhook](https://i.gyazo.com/d58a491edd807126c78b05cd9df0aea7.png)

「Repositories」を指定すると、リポジトリの作成・アーカイブ・可視性変更といったイベントを通知できます。

![Select events](https://i.gyazo.com/e49e8e29261139bcf75bb25f013c21ba.png)

Slack の Incoming Webhook の URL を指定して、設定を完了しました。

この設定をしてからしばらくして、同僚の人がリポジトリを作ったことを知りましたが、チャンネルには通知が来ていませんでした。

GitHub 側では、イベントを通知しようとしていましたが、失敗していました。ステータス400ということで、リクエストのデータが不正だったようです。

![Request](https://i.gyazo.com/ce9b56cf923e09c9cf7615b1c4936b1d.png)

Response には `missing_text_orfallback_or_attachments` というメッセージが格納されています。

![Response](https://i.gyazo.com/d13a0366d469ecf66317d2bdb05d394d.png)

リクエストを見ると確かに text などのフィールドはありません。Incoming Webhook 用のメッセージに変換する中継サービスがないとダメそうです。ということで、GitHub の通知と Slack の Incoming Webhook を直接繋ぐのは無理でした。

## GitHub の Slack アプリはどうか(ダメ)
Slack には GitHub 公式のアプリもあるので、これが使えないかと考えました。

![GitHub App](https://i.gyazo.com/cb2b2d6683ff1d7c64fc958c0cac9294.png)

GitHub アプリのリポジトリは以下です。

@[og](https://github.com/integrations/slack)

この README.md を読んだところ、リポジトリ単位ではなく、オーガニゼーション単位のサブスクライブも可能なようです。試しに、チャンネルから、オーガニゼーションにサブスクライブしてみました。

![gitbu subscribe org](https://i.gyazo.com/7035e878746ca6366926555624b4ce7c.png)

通知されるイベントはスクリーンショットで列挙されているものだけのようで、オーガニゼーション内のリポジトリの Issue や PR などに関するイベントしか通知されません。ということでこの方法も NG でした。

:::info
GitHub App を使ったリポジトリイベントの通知に関しては以下の記事で紹介しています。

@[og](/blogs/2022/12/12/notify-github-actions-workflow-to-slack/)
:::

## GitHub Actions でリポジトリの作成日時から検出する
最後の手段は、GitHub API と GitHub Actions ワークフローで定期的にチェックして Slack に通知を飛ばす方法です。リアルタイム性はないですが、1日1回程度通知されれば実用上は十分でしょう。

以前、オーガニゼーションのメンバーを把握するためのワークフローを設置したリポジトリに新たにワークフローを追加することにしました。

@[og](/blogs/2024/10/04/build-simple-github-org-admin-site/)

この記事の時と同様、ランタイムは Bun、スクリプトは TypeScript を採用します。

ワークフローを JST で0時に起動して、GitHub の GraphQL でリポジトリの名前・URL・作成日時・可視性を取得し、作成日時が前日になっているものでフィルターするのがよさそうです。

以下のようなワークフローファイルを用意しました。

```yaml
name: Notify New Repos to Slack

on:
  schedule:
    - cron: '0 15 * * *'  #1
  workflow_dispatch:

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2  #2

      - name: Install dependencies
        run: bun install --no-save  #3

      - name: Notify new repos to Slack
        env:
          GH_PAT: ${{ secrets.ORG_REPO_PAT }}. #4
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }} #5
          GITHUB_ORG: ${{ vars.ORG_NAME }} #6
        run: bun run src/notify-new-repos.ts #7
```

各ステップの処理は以下のようになっています。

1. UTC の15時(JST の0時)に起動
2. Bun 環境をセットアップ
3. bun install で octokit/graphql をインストール
4. オーガニゼーションの参照権限を付与した PAT をシークレットから設定
5. Slack チャンネルの Incoming Webhook の URL をシークレットから設定
6. オーガニゼーション名を設定
7. Bun スクリプトを実行

実行される Bun スクリプトを抜粋します。

最初に環境変数を読み込んでおきます。

```typescript
const org = process.env.GITHUB_ORG;
const token = process.env.GH_PAT;
const slackWebhook = process.env.SLACK_WEBHOOK_URL;
```

GraphQL 部分。リポジトリを50件、作成日時(CREATED_AT)の降順(DESC)で取得するクエリーです。フィールドとして、リポジトリ名、URL、作成日時、可視性を取得しています。

```typescript
const query = `
  query($org: String!) {
    organization(login: $org) {
      repositories(first: 50, orderBy: {field: CREATED_AT, direction: DESC}) {
        nodes {
          name
          url
          createdAt
          visibility
        }
      }
    }
  }
`;
```

Octkit を使って GraphQL でリポジトリのリストを取得する処理です。

```typescript
let repos: { name: string; url: string; createdAt: string; visibility: string }[] = [];
try {
  const data = await graphql<{ organization: { repositories: { nodes: typeof repos } } }>(query, {
    org,
    headers: { authorization: `token ${token}` }
  });
  repos = data.organization.repositories.nodes;
} catch (err) {
  console.error('GitHub GraphQL API error:', err);
  process.exit(1);
}
```

1日前に作られたリポジトリを取得するため、JST の前日の日付を作成し、GraphQL で取得したリポジトリのリストの作成日時が前日になっているものを抽出します。

```typescript
const now = new Date();
const JST_OFFSET = 9 * 60;
const jstNow = new Date(now.getTime() + (JST_OFFSET - now.getTimezoneOffset()) * 60000);
const yesterday = new Date(jstNow);
yesterday.setDate(jstNow.getDate() - 1);
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const yesterdayJSTDate = ymd(yesterday);

const newRepos = repos.filter(r => {
  const created = new Date(r.createdAt);
  const jstCreated = new Date(created.getTime() + JST_OFFSET * 60000);
  return ymd(jstCreated) === yesterdayJSTDate;
});
```

最後に Slack の Webhook URL 向けにメッセージを作成し、送信します。
リポジトリが作成された場合、Slack への投稿に気づけるように `@here` メンションをつけています。これはメッセージに `<!here>` を含めることで実現できます。

```typescript
let message: string;
if (newRepos.length) {
  message = "<!here>\nList of newly created repositories:\n" +
    newRepos.map(r => `• <${r.url}|${r.name}> (created at ${r.createdAt.slice(0,10)} ${r.visibility})`).join('\n');
} else {
  message = "No new repositories were created yesterday.";
}

try {
  const resp = await fetch(slackWebhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message }),
  });
  if (!resp.ok) {
    console.error('Slack notification failed:', await resp.text());
    process.exit(1);
  }
  console.log('Slack notification succeeded:', message);
} catch (err) {
  console.error('Slack notification failed:', err);
  process.exit(1);
}
```

以下のような感じで、リポジトリ作成通知がチャンネルに届きます(手動実行したため、時刻は午前10時30分ごろになっています)。

![notification by incoming-webhook](https://i.gyazo.com/e8df068ac5572c819f965bf71be75b7a.png)

## さいごに
以上、オーガニゼーション内のリポジトリ作成を検知するために実施した方法の紹介でした。
やはり、Slack の GitHub アプリでリポジトリのライフサイクルイベントを通知してほしいところですね。
