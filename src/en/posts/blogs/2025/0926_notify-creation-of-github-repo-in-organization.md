---
title: >-
  Creating a GitHub Actions Workflow to Notify of Repository Creation in a
  GitHub Organization
author: masahiro-kondo
date: 2025-09-26T00:00:00.000Z
tags:
  - GitHub
  - CI/CD
image: true
translate: true

---

## Introduction
As Mamezou's GitHub organization has grown and members have increased, it's become difficult to keep track of the many repositories.

It has also become necessary to check the details of newly created repositories. Since we sometimes handle highly confidential information, it's important to ensure that repository visibility isn't set to public by mistake.

In this article, I'll share the trial-and-error process of building a mechanism to notify repository creations in the organization.

:::info
Mamezou is on the Team plan, but with the Enterprise plan you can restrict members from creating repositories and have organization administrators create them on a request basis.  
Personally, I don't really want to impose such constraints, as it could hinder developers' proactive activities.
:::

## Receiving GitHub Event Notifications via Slack Incoming Webhook (Doesn't Work)
Slack has a generic mechanism called the Incoming Webhook app for receiving notifications via webhooks.

![Incoming Webhook](https://i.gyazo.com/a995b0a95192c72ed6ecddc5fce06e17.png)

At first, I thought it would be fine to have GitHub send event notifications to Slack via an Incoming Webhook. So I installed an Incoming Webhook in the Slack channel where I wanted to receive notifications.

![Install incoming webhook](https://i.gyazo.com/99c9ee1df1e03b23a7fef81a1957582c.png)

In the organization's GitHub Settings, go to Webhooks > Add webhook to configure it.

Specify the option to select which events to notify.

![Add webhook](https://i.gyazo.com/d58a491edd807126c78b05cd9df0aea7.png)

By selecting "Repositories", you can receive notifications for events such as repository creation, archiving, and visibility changes.

![Select events](https://i.gyazo.com/e49e8e29261139bcf75bb25f013c21ba.png)

Then I specified the Slack Incoming Webhook URL to complete the setup.

After setting this up and some time had passed, I learned that a colleague had created a repository, but no notification appeared in the channel.

On the GitHub side, it tried to send the event, but it failed. The status was 400, indicating that the request data was invalid.

![Request](https://i.gyazo.com/ce9b56cf923e09c9cf7615b1c4936b1d.png)

The response contains the message `missing_text_orfallback_or_attachments`.

![Response](https://i.gyazo.com/d13a0366d469ecf66317d2bdb05d394d.png)

Looking at the request, there were indeed no fields like text. It seems you need an intermediary service to convert the message for the Incoming Webhook. So directly connecting GitHub notifications to Slack's Incoming Webhook won't work.

## What About Using the GitHub Slack App? (Doesn't Work)
Slack also has an official GitHub app, so I thought maybe I could use that.

![GitHub App](https://i.gyazo.com/cb2b2d6683ff1d7c64fc958c0cac9294.png)

The repository for the GitHub app is:

@[og](https://github.com/integrations/slack)

Reading the README.md, it seems you can subscribe at the organization level, not just per repository. I tried subscribing the channel to the organization.

![gitbu subscribe org](https://i.gyazo.com/7035e878746ca6366926555624b4ce7c.png)

It turned out that only the events listed in the screenshot are notified, meaning only issue and PR events and the like for repositories within the organization. So this method didn't work either.

:::info
I've covered using the GitHub App for repository event notifications in the following article:

@[og](/blogs/2022/12/12/notify-github-actions-workflow-to-slack/)
:::

## Detecting New Repositories by Creation Date with GitHub Actions
The last resort is to periodically check using the GitHub API and a GitHub Actions workflow, and send notifications to Slack. It's not real-time, but if you get notifications once a day, it's sufficient for practical purposes.

Previously, I set up a workflow in a repository for tracking organization members, so I decided to add a new workflow to that repository.

@[og](/blogs/2024/10/04/build-simple-github-org-admin-site/)

As with that article, we're using Bun for the runtime and TypeScript for the script.

The workflow is scheduled to run at midnight JST; we use GitHub GraphQL to fetch each repository's name, URL, creation date, and visibility, then filter for those created the previous day.

I prepared the following workflow file:

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

Here's what each step does:

1. Trigger at 15:00 UTC (00:00 JST)  
2. Set up the Bun environment  
3. Run bun install to install octokit/graphql  
4. Set the PAT (with organization read permissions) from secrets  
5. Set the Slack channel's Incoming Webhook URL from secrets  
6. Set the organization name  
7. Execute the Bun script  

Here's an excerpt of the Bun script that runs.

First, load the environment variables:

```typescript
const org = process.env.GITHUB_ORG;
const token = process.env.GH_PAT;
const slackWebhook = process.env.SLACK_WEBHOOK_URL;
```

GraphQL part. This query fetches 50 repositories ordered by creation date (CREATED_AT) in descending (DESC) order. It retrieves the fields repository name, URL, creation date, and visibility.

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

This is the process to fetch the list of repositories via GraphQL using Octokit.

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

To get repositories created one day ago, we create the previous day's date in JST, and filter the list of repositories fetched from GraphQL where the creation date matches the previous day.

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

Finally, we construct and send a message to the Slack webhook URL. If any repositories were created, we include the `@here` mention so they stand out in Slack. This is done by including `<!here>` in the message.

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

The repository creation notification appears in the channel like this (since this was run manually, the timestamp is around 10:30 AM):

![notification by incoming-webhook](https://i.gyazo.com/e8df068ac5572c819f965bf71be75b7a.png)

## Conclusion
That covers the methods I tried to detect repository creations within the organization. Ideally, I would still like Slack's GitHub app to support notifications for repository lifecycle events.
