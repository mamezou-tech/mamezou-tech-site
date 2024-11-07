---
title: Creating a (Quick) Site to Track GitHub Organization Members
author: masahiro-kondo
date: 2024-10-04T00:00:00.000Z
tags:
  - Bun
  - GraphQL
  - GitHub
  - typescript
  - CI/CD
image: true
translate: true

---

## Introduction
I am one of the administrators of our company's GitHub organization. Recently, the number of organization members has increased, making it difficult to keep track of who is using it. Specifically, I wanted to track the following information:

- Linking organization members with employee information (name, department)
- Identifying who has administrative privileges

Administrative privileges may be temporarily granted as needed, so it's also necessary to keep track of who has them[^1]. I also wanted to be aware of any changes, additions, or deletions of members.

[^1]: You can check this on the repository's people page, though.

## What to Create
Setting up a site or creating an app is cumbersome, so I decided it would be sufficient to create a Markdown file like the one below and commit it to a private GitHub repository for a decent preview. Thus, I considered a method to automatically create this Markdown file.

```markdown
# mamezou-tech organization members
2 users

| login    | name           | role   | emp_name | dept     |
| -------- | -------------- | ------ | -------- | -------- |
| mametaro | Mamezou Taro   | Admin  | 豆蔵太郎  | ほげ事業部 |
| mamehana | Mameda Hanako  | Member | 豆田花子  | ふが事業部 |
```

Using the GitHub API, you can retrieve organization members. I thought it would be good to periodically obtain member information, merge it with local employee information, update the Markdown table, and create a Pull Request if there are changes.

## Technology Selection
It's not a grand discussion, but I decided to use TypeScript for calling the GitHub API and generating the Markdown file. Although JavaScript would suffice, I wanted to use TypeScript as much as possible moving forward.

:::info
We also have a TypeScript introduction series for Java engineers on this site!

[Introduction to TypeScript for Java Engineers](/frontend/#javaエンジニアが始めるtypescript入門)
:::

When using TypeScript, Node.js requires initial setup, so I chose Bun. Bun allows you to use TypeScript out of the box and has a fast execution speed.

Deno was also an option, but Bun's project structure is similar to Node.js, and you only need to replace the CLI from npm to bun, making it easy to start without much hassle.

We will write the workflow in GitHub Actions, and there is an official action for setting up a Bun environment[^2].

[Install and run Bun in GitHub Actions | Bun Examples](https://bun.sh/guides/runtime/cicd)

[^2]: Of course, a similar action is also provided officially for Deno.

:::info
There are also articles about Bun:

- [Replacing Node.js with Bun in the Development Environment | Mamezou Developer Site](https://developer.mamezou-tech.com/blogs/2023/11/21/replace-nodejs-with-bun-in-devenv/)
- [Cross-Compiling Executable Binaries with Bun | Mamezou Developer Site](https://developer.mamezou-tech.com/blogs/2024/05/20/bun-cross-compile/)
:::

## Retrieving Organization Members with the GitHub API

Initially, I wrote using GitHub's REST API. With the REST API, you can't get the GitHub usernames of organization members or their roles in the organization in one go, so you need to query detailed information for each user.

Here is an example of repeatedly sending requests using pagination to retrieve all members. Type annotations for API responses, etc., are omitted.

Requests are sent to two URLs to obtain usernames and membership information for each user.

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

When retrieving all members (over 70) of the Mamezou organization with this code, it took over 30 seconds in my experience. Unnecessary data that is not displayed is also retrieved, resulting in unnecessary communication.

In such cases, you would use GraphQL, so I rewrote it using the GitHub GraphQL API. In the REST example above, I forgot to use it, but GitHub provides an API client library called [Octokit](https://github.com/octokit). I used Octokit's GraphQL client. It is implemented up to the point of outputting to a JSON file.

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

The key point is that in the query's `edges`, `node` requests detailed member information (login name, name, etc.), and `role` requests the member's role within the organization.

GitHub's GraphQL object structure is documented in the link below, but this time I saved time by asking Copilot.

[Objects - GitHub Docs](https://docs.github.com/ja/graphql/reference/objects)

With this, the desired information was retrieved in less than a second in my experience. The retrieved JSON file also became simpler and smaller in size.

:::info
Initially, I was retrieving 30 items at a time to match the REST API default, but since it finishes faster with fewer calls, I adjusted it to a larger size (100 items).
:::

## Linking Employee Information and Generating a Markdown File

Prepare a JSON file of employee information like the one below, merge it with the information obtained from GitHub, and output it to Markdown.

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

This is a script that combines the JSON file obtained from the GitHub API with the employee information JSON file and generates Markdown.

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

The code and JSON files are managed in the following directory structure.

```
data
  emp.json
  members.json
src
  gen-members-md.ts
  get-members.ts
```

## Creating Periodic Update PRs with GitHub Actions

Finally, here is the GitHub Actions workflow.

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

The key points are as follows:

1. Manual or scheduled trigger (every Monday at 9 AM JST)
2. Grant permissions to update repository files and create PRs
3. Install Bun using the setup-bun action
4. Use `--no-save` option to suppress bun.rockb generation to prevent changes during bun install
5. Use a PAT to retrieve organization members (GITHUB_TOKEN cannot retrieve them)
6. The organization name is stored in an organization-level configuration variable, so it is used
7. Change detection with git diff
8. Create a PR if there are changes

:::info
There is no GitHub Actions variable that can retrieve the organization name. It is possible to retrieve it from the repository name. This time, I used the organization-level configuration variables registered in the following article.

[GitHub Actions - Organizing Configuration Variables (Environment Variables) for External Settings](/blogs/2023/01/16/github-actions-configuration-variables/)
:::

If there are changes in members.json or emp.json, a PR will be created.

![bot PR](https://i.gyazo.com/ea5a6606c603c6d818d203846c3d69ab.png)

## Conclusion
This was a discussion on building a simple mechanism to track GitHub organization members. I felt that using an all-in-one JavaScript runtime like Bun fits well when you want to automate without much effort.
