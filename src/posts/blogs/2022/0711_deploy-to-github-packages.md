---
title: npm モジュールを GitHub Actions で GitHub Packages にデプロイする
author: shigeki-shoji
date: 2022-07-11
tags: [npm, "openapi-generator", GitHub]
---

[庄司](https://github.com/edward-mamezou)です。

GitHub Packages は、Docker イメージ、npm、Maven、NuGet、RubyGems などさまざまな言語で書かれたモジュール/パッケージを管理できます。

この記事では、[OpenAPI Generator](https://github.com/OpenAPITools/openapi-generator) で生成した TypeScript モジュールを GitHub Actions を使って GitHub Packages にデプロイする方法を説明します。

:::info
npm パッケージには本来 SNAPSHOT の概念はありませんが、この記事で説明するとおり、OpenAPI Generator で `snapshot: true` を設定することで、タイムスタンプ付きのパッケージを生成できます。
:::

## OpenAPI Generator

このサンプルでは OpenAPI の定義 ([openapi.yml](https://github.com/edward-mamezou/use-openapi-generator/blob/2023-02-03/openapi.yml)) から OpenAPI Generator で axios を使うモジュールのコードを生成します。

:::info
OpenAPI のような Schema 定義言語によって規定して開発する SDD (スキーマ駆動開発) は、[日本CTO協会](https://cto-a.org/)が監修・編纂している[DX Criteria](https://dxcriteria.cto-a.org/)でも良いプラクティスとして [SYSTEM-5-4](https://dxcriteria.cto-a.org/f82bd9d0e8344db29cb4e32522fb8957) 等であげられています。
:::

OpenAPI の定義を `openapi.yml` ファイルに記述します。

OpenAPI Generator の設定ファイル [`client.yaml`](https://github.com/edward-mamezou/use-openapi-generator/blob/2023-02-03/client.yaml) は次の通りです。

```yaml
inputSpec: 'openapi.yml'
generatorName: typescript-axios
outputDir: modules/client
additionalProperties:
  npmName: "@edward-mamezou/example-client"
  npmRepository: https://github.com/edward-mamezou/use-openapi-generator.git
  snapshot: true
```

`generatorName` で、どの言語のクライアント用か、またはサーバー用かを指定できます。

ここでは、`typescript-axios` で言語に TypeScript、ライブラリに axios を使うクライアントコードの生成を指定しています。

npm はスコープ単位で npm リポジトリの URL を指定できます。`npmName` でスコープ (`@edward-mamezou`) を付与したパッケージ名にしています。

コード生成のコマンドは次のようになります。

```shell
java -jar openapi-generator-cli.jar generate -c client.yaml --git-user-id=edward-mamezou --git-repo-id=use-openapi-generator
```

生成される package.json にデプロイ先の GitHub Packages のユーザーIDとリポジトリIDを出力するため、`git-user-id` と `git-repo-id` をオプションで設定します。

生成された package.json は次のようになります。

```json
{
  "name": "@edward-mamezou/example-client",
  "version": "0.6.0-SNAPSHOT.202207101913",
  "description": "OpenAPI client for @edward-mamezou/example-client",
  "author": "OpenAPI-Generator Contributors",
  "repository": {
    "type": "git",
    "url": "https://github.com/edward-mamezou/use-openapi-generator.git"
  },
  "keywords": [
    "axios",
    "typescript",
    "openapi-client",
    "openapi-generator",
    "@edward-mamezou/example-client"
  ],
  "license": "Unlicense",
  "main": "./dist/index.js",
  "typings": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc --outDir dist/",
    "prepare": "npm run build"
  },
  "dependencies": {
    "axios": "^0.26.1"
  },
  "devDependencies": {
    "@types/node": "^12.11.5",
    "typescript": "^4.0"
  },
  "publishConfig": {
    "registry": "https://github.com/edward-mamezou/use-openapi-generator.git"
  }
}
```

OpenAPI Generator の設定で `snapshot` を true にしたため、バージョンにはタイムスタンプが付加されています。

## GitHub Actions

GitHub Actions の `actions/setup-node@v3` で GitHub 上に `.npmrc` ファイルが生成されます。

```yaml
- name: Use Node.js
  uses: actions/setup-node@v3
  with:
    node-version: '16.x'
    registry-url: 'https://npm.pkg.github.com'
    scope: '@edward-mamezou'
```

生成される `.npmrc` ファイルは次のようなイメージになります。

```text
@edward-mamezou:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

:::info
`actions/setup-node` の設定と生成される `.npmrc` ファイルの関係の詳細は、[GitHub リポジトリ](https://github.com/actions/setup-node/blob/main/action.yml)を参照するとよいでしょう。

`registry-url` については、次のように書かれています。
>Optional registry to set up for auth. Will set the registry in a project level .npmrc and .yarnrc file, and set up auth to read in from env.NODE_AUTH_TOKEN.

>認証のためのオプションの設定。プロジェクトレベルの .npmrc と .yarnrc ファイルにレジストリが設定される。環境変数 NODE_AUTH_TOKEN を読み込む認証が設定される。
:::

一連の処理を実行する GitHub Actions の定義は次のようになります。
```yaml
- run: (cd modules/client; npm install)
- run: (cd modules/client; npm publish)
  env:
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
OpenAPI Generator の設定により、コードは `modules/client` ディレクトリに生成されています。そのため、`npm install` の前に `cd modules/client` でディレクトリを移動しています。

`npm install` で依存ライブラリを `node_modules` にインストール (ダウンロード) します。

GitHub Actions (setup-node) が生成する `.npmrc` ファイルのパスは、環境変数 `NPM_CONFIG_USERCONFIG` に設定されます。

`npm publish` で使用する `_authToken` は GitHub から取得して環境変数 `NODE_AUTH_TOKEN` に設定しています。

`npm publish` コマンドで、ビルドと GitHub Packages にデプロイします。

ここで説明した全体のコードは、[GitHub リポジトリ](https://github.com/edward-mamezou/use-openapi-generator/tree/2023-02-03) にあります。

## パッケージの使用方法

先に GitHub の Personal Access Token を取得しておいてください。

:::info
Personal Access Token を取得する手順は次のようになります。

1. GitHub にサインインして、アカウントにある「Settings」をクリックします。
2. 左側のメニューの一番下にある「Developer settings」をクリックします。
3. 「Personal access tokens」をクリックします。
4. 「Generate new token」ボタンをクリックします。
5. 「Note」に任意の値を入力し、少なくとも `public_repo` と `read:packages` を選択しておきます。
6. 「Generate token」ボタンをクリックして、表示されるトークンを記録しておきます。
:::

GitHub Packages に登録したパッケージの取得を試すために、`npm init` で example プロジェクトを作成しましょう。

```shell
npm init
```

example プロジェクトに、次の内容の `.npmrc` ファイルを作成します。

```text
@edward-mamezou:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:always-token=true
//npm.pkg.github.com/:email={Email Address}
//npm.pkg.github.com/:_authToken={PERSONAL ACCESS TOKEN}
```

作成したプロジェクトに、パッケージの依存を追加して、取得します。

```shell
npm install --save @edward-mamezou/example-client
```

`package.json` は次のようになり、`node_modules` ディレクトリには依存ライブラリがインストールされます。

```json
{
  "name": "example",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "author": "",
  "license": "ISC",
  "dependencies": {
    "@edward-mamezou/example-client": "^0.6.0-SNAPSHOT.202207100617"
  }
}
```

## 最後に 

この記事では、GitHub Actions を使って GitHub Packages に npm パッケージを登録、使用する方法を説明しました。

npm パッケージをインハウスのレジストリ ([AWS CodeArtifact](https://aws.amazon.com/jp/codeartifact/)、Sonatype Nexus、JFrog Artifactory、あるいは GitLab Packages & Registries 等) に登録して共有したい場合も `.npmrc` ファイルの設定等の基本的な部分は GitHub Packages を使う場合と同じです。

## 参考

- [第1回 OpenAPI Generator を使ったコード生成](/blogs/2022/06/04/openapi-generator-1/)
- [第2回 イベントストーミングとドメイン駆動設計の戦略的設計](/blogs/2022/06/09/openapi-generator-2/)
- [第3回 OpenAPI Generator 利用時の Generation Gap パターンの適用](/blogs/2022/06/17/openapi-generator-3/)
- [第4回 ドメイン層の実装とサービスの完成](/blogs/2022/06/24/openapi-generator-4/)
- [第5回 Open Policy Agent とサイドカーパターンによる認可の実装](/blogs/2022/07/01/openapi-generator-5/)
