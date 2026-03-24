---
title: 使用 GitHub Actions 工作流程通知 GitHub 组织的新仓库创建
author: masahiro-kondo
date: 2025-09-26T00:00:00.000Z
tags:
  - GitHub
  - CI/CD
image: true
translate: true

---

## 简介
is 的 GitHub 组织随着成员增多，越来越难以掌握众多仓库。

同时也需要检查新建仓库的内容。由于有时需要处理高度机密的信息，确认仓库的可见性是否被设为了 public 非常重要。

本文将分享在构建通知组织仓库创建机制时的各种试行过程。

:::info
is 采用 Team 计划进行签约，但如果是 Enterprise 计划，就可以限制成员创建仓库，由组织管理员按需创建。  
由于这可能会阻碍开发者的自主活动，个人并不希望施加这样的限制。  
:::

## 使用 Slack 的 Incoming Webhook 接收 GitHub 事件通知（不可行）
Slack 上有一个名为 Incoming Webhook 的应用，提供了通过 Webhook 接收通知的通用机制。

![Incoming Webhook](https://i.gyazo.com/a995b0a95192c72ed6ecddc5fce06e17.png)

最开始想的做法是让 GitHub 通过 Incoming Webhook 发送事件通知。因此，在需要接收通知的 Slack 频道中安装了 Incoming Webhook。

![Install incoming webhook](https://i.gyazo.com/99c9ee1df1e03b23a7fef81a1957582c.png)

在 GitHub 组织的 Settings 中，通过 Webhooks > Add webhook 进行设置。

指定要通知的事件选项。

![Add webhook](https://i.gyazo.com/d58a491edd807126c78b05cd9df0aea7f.png)

选择「Repositories」后，就能接收到仓库创建、归档、可见性更改等事件的通知。

![Select events](https://i.gyazo.com/e49e8e29261139bcf75bb25f013c21ba.png)

指定 Slack Incoming Webhook 的 URL，完成了设置。

设置完成后过了一会，得知同事创建了一个仓库，但频道中并没有收到通知。

在 GitHub 端尝试发送事件通知时失败了。由于状态码是 400，看来请求数据不合法。

![Request](https://i.gyazo.com/ce9b56cf923e09c9cf7615b1c4936b1d.png)

在 Response 中包含了 `missing_text_orfallback_or_attachments` 的消息。

![Response](https://i.gyazo.com/d13a0366d469ecf66317d2bdb05d394d.png)

查看请求，确实没有 text 等字段。看来需要一个中转服务将消息转换为 Incoming Webhook 格式。也就是说，无法直接将 GitHub 通知与 Slack Incoming Webhook 连接起来。

## GitHub 的 Slack 应用如何（不可行）
Slack 上也有官方的 GitHub 应用，于是想看看能否使用它。

![GitHub App](https://i.gyazo.com/cb2b2d6683ff1d7c64fc958c0cac9294.png)

GitHub 应用的仓库如下：

@[og](https://github.com/integrations/slack)

阅读 README.md 后发现，不仅可以按仓库订阅，也可以按组织订阅。于是尝试从频道中订阅该组织。

![gitbu subscribe org](https://i.gyazo.com/7035e878746ca6366926555624b4ce7c.png)

然而，通知的事件仅限于截图中列出的那些，只会通知组织内仓库的 Issue 或 PR 等相关事件。因此，这种方法也不可行。

:::info
关于使用 GitHub App 通知仓库事件，可以参考以下文章。

@[og](/blogs/2022/12/12/notify-github-actions-workflow-to-slack/)
:::

## 使用 GitHub Actions 根据仓库创建时间进行检测
最后的手段是使用 GitHub API 和 GitHub Actions 工作流程定期检查并向 Slack 发送通知的方法。虽然不具实时性，但每天一次的通知对实际应用足够了。

之前，在一个用于掌握组织成员的仓库中已经设置了一个工作流程，这次决定向该仓库添加新的工作流程。

@[og](/blogs/2024/10/04/build-simple-github-org-admin-site/)

同本文之前一样，运行时使用 Bun，脚本使用 TypeScript。

工作流程在 JST 零点启动，通过 GitHub 的 GraphQL 获取仓库名称、URL、创建时间和可见性，然后过滤出创建时间为前一天的仓库即可。

准备了如下的工作流程文件。

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

各步骤的处理如下：

1. 在 UTC 15 时（JST 0 时）触发  
2. 设置 Bun 环境  
3. 通过 bun install 安装 octokit/graphql  
4. 从 secrets 中设置具有组织读取权限的 PAT  
5. 从 secrets 中设置 Slack 频道的 Incoming Webhook URL  
6. 设置组织名称  
7. 执行 Bun 脚本  

执行的 Bun 脚本节选如下。

首先读取环境变量。

```typescript
const org = process.env.GITHUB_ORG;
const token = process.env.GH_PAT;
const slackWebhook = process.env.SLACK_WEBHOOK_URL;
```

GraphQL 部分。一个按创建时间（CREATED_AT）降序（DESC）获取 50 条仓库的查询。字段包括仓库名、URL、创建时间、可见性。

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

使用 Octokit 通过 GraphQL 获取仓库列表的处理。

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

为了获取一天前创建的仓库，会先构造 JST 的前一天日期，然后从 GraphQL 获取的仓库列表中筛选出创建时间为前一天的仓库。

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

最后构造发送到 Slack Webhook URL 的消息并发送。  
若有仓库创建，为了让大家注意到，会添加 `@here` 提及。可通过在消息中包含 `<!here>` 实现。

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

以下示例展示了手动执行时大约在上午 10:30 收到的仓库创建通知。

![notification by incoming-webhook](https://i.gyazo.com/e8df068ac5572c819f965bf71be75b7a.png)

## 结语
以上就是介绍用于检测组织内仓库创建的各种方法。  
还是希望 Slack 的 GitHub 应用能直接通知仓库生命周期事件。
