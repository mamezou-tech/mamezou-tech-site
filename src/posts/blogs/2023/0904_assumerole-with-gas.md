---
title: "Google Apps ScriptのOIDCトークンを使ったAWSアクセス"
author: shigeki-shoji
date: 2023-09-04
tags: [AWS, "aws-sts", "Google Apps Script"]
---

[庄司](https://github.com/edward-mamezou)です。

6月28日に「[Google Apps ScriptからAWSにアクセスするための署名の実装](/blogs/2023/06/28/gas-using-npm-packages/)」という記事を公開しました。この記事で Google Apps Script で SigV4 による AWS へのアクセス方法を解説しました。

本記事では、Google で発行される OIDC トークンを使って一時的な認証情報を取得するコードを説明します。

## 一時的な認証情報

AWS リソースにプログラムによるアクセスをする場合には、IAM の認証情報とそれを使った署名を付したヘッダ等が必要です。

IAM ユーザでもアクセスキー等の認証情報を生成できますが、この認証情報は無効化したり削除するまで有効なものとして残り続けます。そのため永続的な認証情報と呼ばれることがあります。

IAM ロールを引き受ける (AssumeRole) 場合は短時間だけ有効な一時的な認証情報を得ることができます。

前述した記事は、IAM ユーザの永続的な認証情報を使って AWS リソースにアクセスするサンプルコードとなっています。IAM ロールを引き受けて取得した一時的な認証情報を使って AWS リソースにアクセスすることでセキュリティを向上できます。

## IAM ロールの引き受け

IAM ロールを引き受ける Google Apps Script のコードは次のようになります。

```javascript
const xmlparser = require('fast-xml-parser');

global.doGet = () => {
    const properties = PropertiesService.getScriptProperties();
    const role_arn = properties.getProperty('ROLE_ARN'); 
    const role_session_name = 'app1';
    
    const oidcToken = ScriptApp.getIdentityToken();

    const token = encodeURIComponent(oidcToken);
    const formData = `Action=AssumeRoleWithWebIdentity&RoleSessionName=${role_session_name}&RoleArn=${role_arn}&WebIdentityToken=${token}&Version=2011-06-15`;
    const res = UrlFetchApp.fetch("https://sts.amazonaws.com/", {
        'method': 'post',
        "payload": formData
    });

    const xml = res.getContentText();
    const json = new xmlparser.XMLParser().parse(xml);
    const text = JSON.stringify(json);

    const credentials = json['AssumeRoleWithWebIdentityResponse']['AssumeRoleWithWebIdentityResult']['Credentials'];
    const access_key_id = credentials['AccessKeyId'];
    const secret_access_key = credentials['SecretAccessKey'];
    const session_token = credentials['SessionToken'];
    const temporary_security_credentials = {
        "ACCESS_KEY_ID": access_key_id,
        "SECRET_ACCESS_KEY": secret_access_key,
        "SESSION_TOKE": session_token
    };

    return ContentService.createTextOutput(JSON.stringify(temporary_security_credentials)).setMimeType(ContentService.MimeType.JSON);
};
```

### 概要

ロールの引き受けには、AWS Security Token Service (AWS STS) を使用します。

Google 等の OIDC トークンを使用してロールを引き受ける場合は、OIDC トークンを WebIdentityToken に指定します。
Action に AssumeRoleWithWebIdentity を指定し、引き受けたい IAM ロールの ARN を RoleArn に指定します。
他に、RoleSessionName を指定し、Version には 2011-06-15 を指定します。

これをデータとして、`https://sts.amazonaws.com/` に POST メソッドでリクエストすることで、一時的な認証情報を含むレスポンスが得られます。

### OIDC トークンの取得

Google Apps Script は、`ScriptApp.getIdentityToken()` で OIDC トークンを取得できます。

このメソッドで取得できるのは、Web アプリとしてデプロイした場合に限られます。Google Forms や Sheets 等の埋め込みスクリプト等では機能しません。

さらに、appsscript.json の oauthScopes には、次のスコープが必要です。

```json
  "oauthScopes": [
    "openid",
    "profile",
    "email"
  ]
```

### 一時的な認証情報の使い方

全体のコードは、[GitHub リポジトリ](https://github.com/takesection-sandbox/gas-example)にあります。

一時的な認証情報を使って S3 にアップロードする[サンプルコード](https://github.com/takesection-sandbox/gas-example/blob/bcc1dd0309b5b6a4e99d443a9963843569825eb0/src/Code.js#L35-L41)があります。

## おわりに

Google の OIDC トークンを使用する場合、IAM での ID プロバイダの追加は不要です。

IAM ロールの作成時「信頼されたエンティティを選択」で、「ウェブアイデンティティ」を選択し、アイデンティティプロバイダーで「Google」を選択して、進めていくだけです。

Web アプリとしてデプロイした Google Apps Script から、Forms の回答や Sheets にアクセスできるので、それらの集計や分析で AWS との連携に役立てたいと考えています。

## 参考

- [基本から理解するJWTとJWT認証の仕組み](https://developer.mamezou-tech.com/blogs/2022/12/08/jwt-auth/)
