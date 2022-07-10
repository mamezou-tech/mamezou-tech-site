---
title: npm モジュールを GitHub Actions で GitHub Pakcages にデプロイする
author: shigeki-shoji
date: 2022-07-11
tags: [npm, "openapi-generator", GitHub]
---

GitHub Packages は、Docker イメージ、npm (JavaScript/TypeScript)、Maven (Java)、NuGet (C# 等)、RubyGems (Ruby) などのさまざまな言語で書かれたパッケージをインハウスリポジトリとして管理できます。

この記事では、[OpenAPI Generator](https://github.com/OpenAPITools/openapi-generator) で生成した TypeScript モジュールを GitHub Actions を使って GitHub Packagese にデプロイする方法を説明します。

## OpenAPI Generator

ここでは、OpenAPI の定義 ([openapi.yml](https://github.com/edward-mamezou/use-openapi-generator/blob/feature/openapi-generator-6/openapi.yml)) から OpenAPI Generator で axios を使うモジュールのコードを生成します。

OpenAPI の定義を `openapi.yml` ファイルに記述します。

OpenAPI Generator の設定ファイル [`client.yaml`](https://github.com/edward-mamezou/use-openapi-generator/blob/feature/openapi-generator-6/client.yaml) は次の通りです。

```yaml
inputSpec: 'openapi.yml'
generatorName: typescript-axios
outputDir: modules/client
additionalProperties:
  npmName: "@edward-mamezou/example-client"
  npmRepository: https://github.com/edward-mamezou/use-openapi-generator.git
  snapshot: true
```

`generatorName` で、どの言語のクライアント用かサーバー用かを指定できます。ここでは、`typescript-axios` を指定しています。

npm ではスコープ単位で npm リポジトリの URL を指定できます。そのため、`npmName` でスコープ (`@edward-mamezou`) を付与したパッケージ名にしています。

OpenAPI Generator を使ってコード生成するコマンドは次のようになります。

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

GitHub Actions の `actions/setup-node@v3` で GitHub リポジトリのルートに `.npmrc` ファイルを生成します。

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
//npm.pkg.github.com/:email=shigeki-shoji@mamezou.com
//npm.pkg.github.com/:always-token=true
```

生成されたコードをビルドするために、依存ライブラリを `node_modules` にダウンロードします。

```shell
npm install
```

npm の `publish` コマンドで、ビルドと GitHub Packages にデプロイします。

```shell
npm publish
```

この一連の処理を実行する GitHub Actions の定義は次のようになります。

```yaml
- run: (cd modules/client; npm install)
- run: (NPM_CONFIG_USERCONFIG=`pwd`/.npmrc cd modules/client; npm publish)
  env:
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

OpenAPI Generator の設定により、コードは `modules/client` ディレクトリに生成されています。そのため、`npm install` の前に `cd modules/client` でカレンとディレクトリを移動しています。

さらに、GitHub Actions は GitHub リポジトリのルートに `.npmrc` ファイルを生成するため、環境変数 `NPM_CONFIG_USERCONFIG` で GitHub リポジトリのルートにある `.npmrc` ファイルを使用するよう設定します。

`npm publish` で使用する `_authToken` は GitHub Actions から取得して環境変数 `NODE_AUTH_TOKEN` に設定しています。

## パッケージの使用方法

「[GitHub「Personal access tokens」の設定方法](https://qiita.com/kz800/items/497ec70bff3e555dacd0)」等の記事を参照して、Personal Access Token を取得してください。

```text
@edward-mamezou:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:always-token=true
//npm.pkg.github.com/:email=shigeki-shoji@mamezou.com
//npm.pkg.github.com/:_authToken=<PERSONAL ACCESS TOKEN>
```

GitHub Packages に登録したパッケージの取得を試すために、`npm init` で test プロジェクトを作成しましょう。

```shell
npm init
```

作成したプロジェクトに、登録したパッケージの依存を追加して、取得します。

```shell
npm install --save @edward-mamezou/example-client
```

`package.json` は次のようになり、`node_modules` ディレクトリには依存ライブラリがインストールされます。

```json
{
  "name": "test",
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

ここで説明した全体のコードは、[GitHub リポジトリ](https://github.com/edward-mamezou/use-openapi-generator/tree/feature/openapi-generator-6) にあります。

## 最後に 

この記事では、GitHub Actions を使って GitHub Packages に npm パッケージを登録、使用する方法を説明しました。

npm パッケージをインハウスのレジストリ (Sonatype Nexus や JFrog Artifactory、あるいは GitLab Packages & Registries 等) に登録して共有したい場合も `.npmrc` ファイルの設定方法自体は GitHub Packages を使う場合と同じです。

