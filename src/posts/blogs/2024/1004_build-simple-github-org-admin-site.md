---
title: GitHub オーガニゼーションのメンバーを把握するための（手抜き）サイトを作る
author: masahiro-kondo
date: 2024-10-04
tags: [Bun, GraphQL, GitHub, typescript, CI/CD]
image: true
---

## はじめに
筆者は会社の GitHub オーガニゼーション管理者の一人です。最近はオーガニゼーションのメンバーも増えてきて、誰が使っているか把握するのが難しくなってきました。具体的には以下のような情報を把握したくなりました。

- オーガニゼーションメンバーと、社員情報(氏名、所属)の紐付け
- 誰が管理者権限を持っているのか

管理者権限は、必要に応じて一時的に付与することもあるので、誰が持っているのかを把握することも必要になります[^1]。これら情報の変更やメンバー追加や削除についても把握したいと思いました。

[^1]: 一応、リポジトリの people ページで確認はできますが。

## 作るもの
サイトを建てたり、アプリを作るのは面倒なので、以下のような Markdown ファイルを作ってプライベートな GitHub リポジトリにコミットすれば、それなりに見栄えのいいプレビューが出るのでそれでいいやということにして、この Markdown ファイルを自動で作る方法を検討することにしました。

```markdown
# mamezou-tech organization members
2 users

| login    | name           | role   | emp_name | dept     |
| -------- | -------------- | ------ | -------- | -------- |
| mametaro | Mamezou Taro   | Admin  | 豆蔵太郎  | ほげ事業部 |
| mamehana | Mameda Hanako  | Member | 豆田花子  | ふが事業部 |
```

GitHub API を使えばオーガニゼーションメンバーを取得できます。定期的に取得したメンバー情報とローカルの社員情報とマージして Markdown テーブルを更新し、変更があったら Pull Request を作るようにすればいいかなと思いました。

## 技術選定
技術選定というほど大袈裟な話ではないですが GitHub API 呼び出しや Markdown ファイル生成の部分は TypeScript を使おうと思いました。別に JavaScript でもいいのですがこれからはなるべく TypeScript を使おうと思っていたためです。

:::info
本サイトでも Java エンジニアを対象にした TypeScript 入門が連載中です！

[Javaエンジニアが始めるTypeScript入門](/frontend/#javaエンジニアが始めるtypescript入門)
:::

TypeScript を使う場合、Node.js だと初期設定が必要だったりするので、Bun を選んでみました。Bun だと Out of the box で TypeScript を使えて実行速度も速いからです。

Deno でもよかったのですが、Bun の方がプロジェクト構成が Node.js に似ていて CLI を npm から bun に置き換えるだけでよいため、あまり悩まなくてパッと作業できるということが大きな理由です。

GitHub Acitons でワークフローを書くことになりますが、Bun 環境を構築する Action も公式から出ています[^2]。

[Install and run Bun in GitHub Actions | Bun Examples](https://bun.sh/guides/runtime/cicd)

[^2]: もちろん Deno でも同様の Action は公式から提供されています。

:::info
Bun については以下にも記事があります。

- [開発環境の Node.js を Bun に置き換えてみる | 豆蔵デベロッパーサイト](https://developer.mamezou-tech.com/blogs/2023/11/21/replace-nodejs-with-bun-in-devenv/)
- [Bun で実行可能バイナリをクロスコンパイルできるようになりました | 豆蔵デベロッパーサイト](https://developer.mamezou-tech.com/blogs/2024/05/20/bun-cross-compile/)
:::

## GitHub API でオーガニゼーションメンバーを取得する

最初 GitHub の REST API を使って書いていました。REST API だと、オーガニゼーションメンバーの GitHub ユーザー名や、オーガニゼーションでのロールが1発で取れず、ユーザー毎に詳細情報を問い合わせる必要がありました。

ページネーションを使って繰り返しリクエストを投げて、全メンバーを取得する例です。API の Response などの型注釈は省略しています。

ユーザー毎にユーザー名や組織のメンバーシップ情報を得るために2つの URL にリクエストを投げています。

- `https://api.github.com/users/${username}`
- `https://api.github.com/orgs/${orgName}/memberships/${username}`


```typescript
async function getOrganizationMembers(orgName: string) {
    try {
        let members = [];
        let page: number = 1;
        const perPage: number = 30;
        let hasMore: boolean = true;

        while (hasMore) {
            const response = await fetch(`https://api.github.com/orgs/${orgName}/members?per_page=${perPage}&page=${page}`, {
                headers: {
                    Authorization: `token ${GITHUB_TOKEN}`,
                },
            });

            if (!response.ok) {
                throw new Error(`Error fetching organization members: ${response.statusText}`);
            }

            const basicMembers = await response.json();

            for (const member of basicMembers) {
                const detailedMember = await getUserDetails(orgName, member.login);
                if (detailedMember) {
                    members.push(detailedMember);
                }
            }

            if (basicMembers.length < perPage) {
                hasMore = false;
            } else {
                page++;
            }
        }
        return members;
    } catch (error) {
        console.error('Error fetching organization members:', error);
        return [];
    }
}

async function getUserDetails(orgName: string, username: string) {
    try {
       const userResponse = await fetch(`https://api.github.com/users/${username}`, {
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
            },
        });

        if (!userResponse.ok) {
            throw new Error(`Error fetching details for user ${username}: ${userResponse.statusText}`);
        }

        const userDetails = await userResponse.json();

        const membershipResponse = await fetch(`https://api.github.com/orgs/${orgName}/memberships/${username}`, {
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
            },
        });

        if (!membershipResponse.ok) {
            throw new Error(`Error fetching membership for user ${username}: ${membershipResponse.statusText}`);
        }

        const membershipData = await membershipResponse.json();
        userDetails.role = membershipData.role;

        return userDetails;
    } catch (error) {
        console.error(`Error fetching details for user ${username}:`, error);
        return null;
    }
}
```

このコードで豆蔵オーガニゼーションの全メンバー(70名超)を取得すると、体感で30秒以上かかっていました。表示しない不要なデータも沢山取ってきているので無駄な通信も発生しています。

こういう時は GraphQL 使うよねということで、GitHub GraphQL API で書き換えました。上記の REST の例では使うのを忘れてましたが、GitHub では API のクライアントライブラリ [Octokit](https://github.com/octokit) が提供されています。Octokit の GraphQL クライアントを使いました。JSON ファイルに出力するところまで実装してます。

```typescript:get-members.ts
import { graphql } from '@octokit/graphql';
import fs from 'fs';

if (!process.env.GITHUB_ORG_NAME) {
  throw new Error('GITHUB_ORG_NAME is not defined');
}
if (!process.env.GITHUB_TOKEN) {
  throw new Error('GITHUB_TOKEN is not defined');
}

const GITHUB_TOKEN: string = process.env.GITHUB_TOKEN;
const ORG_NAME: string = process.env.GITHUB_ORG_NAME;

const endpoint = 'https://api.github.com/graphql';

const query = `
  query($orgName: String!, $cursor: String) {
    organization(login: $orgName) {
      membersWithRole(first: 100, after: $cursor) {
        pageInfo {
          endCursor
          hasNextPage
        }
        edges {
          node {
            login
            name
          }
          role
        }
      }
    }
  }
`;

async function getOrganizationMembers(orgName: string) {
  let members: any[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    const result = await graphql({
      query,
      orgName,
      cursor,
      headers: {
        authorization: `token ${GITHUB_TOKEN}`,
      },
    });

    const { edges, pageInfo } = result.organization.membersWithRole;
    const nodesWithRole = edges.map((edge: any) => ({
      ...edge.node,
      role: edge.role,
    }));

    members = members.concat(nodesWithRole);
    cursor = pageInfo.endCursor;
    hasNextPage = pageInfo.hasNextPage;
  }

  return members;
}

async function saveMembersToFile(members: any, filePath: string) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(members, null, 2));
    console.log(`Members saved to ${filePath}`);
  } catch (error) {
    console.error('Error saving members to file:', error);
  }
}

const members = await getOrganizationMembers(ORG_NAME);
await saveMembersToFile(members, 'data/members.json');
```

ポイントは、クエリーの `edges` の中身で、`node` がメンバーの詳細情報(ログイン名や名前など)、`role` がオーガニゼーション内部でのメンバーの役割を要求しています。

GitHub の GraphQL のオブジェクト構造は以下のドキュメントにありますが、今回は Copilot さんに教えてもらって時短しました。

[オブジェクト - GitHub Docs](https://docs.github.com/ja/graphql/reference/objects)

これで取得すると、体感1秒以内で欲しい情報が取れました。取得される JSON ファイルもシンプルでサイズが小さくなりました。

:::info
最初は REST API のデフォルトに合わせて30件ずつ取得していましたが、呼び出し回数が少ないほど早く終わるので、大きめ(100件)に調整しました。
:::

## 社員情報と紐付けて Markdown ファイルを生成する

以下のような社員情報の JSON ファイルを用意して、GitHub から取得した情報とマージして Markdown に出力します。

```json:emp.json
[
  {
    "login": "mametaro",
    "emp_name": "豆蔵太郎",
    "dept": "ほげ事業部"
  },
  {
    "login": "mamehana",
    "emp_name": "豆田花子",
    "dept": "ふが事業部"
  }
]
```

GitHub API で取得した JSON ファイルと社員情報の JSON ファイルを結合して、Markdown を生成するスクリプトです。

```typescript:gen-members-md.ts
import * as fs from 'fs';

interface User {
  login: string;
  name: string;
  role: string;
}

interface Employee {
  login: string;
  emp_name: string;
  dept: string;
}

interface MergedData extends User, Employee {}

function readJsonFile(filePath: string): any {
  const data = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(data);
}

function mergeData(users: User[], employees: Employee[]): MergedData[] {
  const sortedUsers = users.sort((a, b) => a.login.localeCompare(b.login));
  return sortedUsers.map(user => {
    const employee = employees.find(emp => emp.login === user.login);
    return { ...user, ...employee };
  });
}

function convertToMarkdownTable(data: MergedData[]): string {
  const headers = ['login', 'name', 'role', 'emp_name', 'dept'];
  
  let markdownTable = '| ' + headers.join(' | ') + ' |\n';
  markdownTable += '| ' + headers.map(() => '---').join(' | ') + ' |\n';

  data.forEach(row => {
    markdownTable += '| ' + headers.map(header => row[header] || '').join(' | ') + ' |\n';
  });

  return markdownTable;
}

function writeMarkdownToFile(markdownTable: string, userCount: number, filePath: string): void {
  const title = '# mamezou-tech organization members\n';
  const count = `${userCount} users\n\n`;
  const content = title + count + markdownTable;
  fs.writeFileSync(filePath, content, 'utf8');
}

const usersFilePath = 'data/members.json';
const employeesFilePath = 'data/emp.json';
const outputFilePath = 'members.md';

const users: User[] = readJsonFile(usersFilePath);
const employees: Employee[] = readJsonFile(employeesFilePath);

const mergedData = mergeData(users, employees);
const markdownTable = convertToMarkdownTable(mergedData);

writeMarkdownToFile(markdownTable, users.length, outputFilePath) ;

console.log(`Markdown table has been written to ${outputFilePath}`);
```

コードや JSON ファイルは以下のようなディレクトリ構造で管理してます。

```
data
  emp.json
  members.json
src
  gen-members-md.ts
  get-members.ts
```

## GitHub Actions で定期的に更新 PR を作る

最後に GitHub Actions ワークフローです。

```yaml
name: Update org members list

on: # 1
  schedule:
    - cron: '0 0 * * MON'
  workflow_dispatch:

jobs:
  Update-members:
    runs-on: ubuntu-latest

    permissions: #2
      id-token: write
      contents: write
      pull-requests: write

    steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Setup Bun #3
      uses: oven-sh/setup-bun@v2

    - name: Install dependencies
      run: bun install --no-save #4

    - name: Get org members
      run: bun run src/get-members.ts
      env:
        GITHUB_TOKEN: ${{ secrets.ORG_MEMBER_PAT }} #5
        GITHUB_ORG_NAME: ${{ vars.ORG_NAME }} #6

    - name: Generate members.md
      run: bun run src/gen-members-md.ts

    - name: Check for changes
      id: check_changes
      run: git diff --exit-code || echo "has_changes=true" >> $GITHUB_ENV #7

    - name: Commit and create Pull Request #8
      if: env.has_changes == 'true'
      uses: peter-evans/create-pull-request@v6
      with:
        commit-message: "Update org member list"
        author: github-actions[bot] <github-actions[bot]@users.noreply.github.com>
        branch: update-members
        delete-branch: true
        title: 'Update Org Members List'
        body: 'Org members updated.'
        reviewers: kondoumh
        labels: bot
```

ポイントは以下のようになります。

1. 手動またはスケジュール起動(毎週月曜日の JST で午前9時)
2. リポジトリのファイルの更新と PR 作成の権限を付与
3. setup-bun アクションで Bun をインストール
4. bun install で bun.rockb が更新されて変更が発生しないよう、`--no-save` オプションで bun.rockb の生成を抑止
5. オーガニゼーションのメンバーを取得するため PAT を使用。(GITHUB_TOKEN では取得不能)
6. オーガニゼーション名は、オーガニゼーションレベルの構成変数に格納しているのでそれを利用
7. git diff で変更判定
8. 変更があったら PR を作成

:::info
オーガニゼーション名を取得可能な GitHub Acitons の変数はありません。リポジトリ名から取得することは可能です。今回は、以下の記事で登録していたオーガニゼーションレベルの構成変数を使用しました。

[GitHub Actions - 構成変数(環境変数)が外部設定できるようになったので用途を整理する](/blogs/2023/01/16/github-actions-configuration-variables/)
:::

members.json か emp.json に変更があると、PR が作られます。

![bot PR](https://i.gyazo.com/ea5a6606c603c6d818d203846c3d69ab.png)

## さいごに
以上、GitHub オーガニゼーションのメンバーを把握するための簡易な仕組みを構築した話でした。あまり手をかけずに自動化をしたいので Bun のようにオールインワンの JavaScript ランタイムを使うのはフィットする気がしました。
