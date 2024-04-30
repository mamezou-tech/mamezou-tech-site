---
title: Google Apps Scriptを使ってAWS管理コンソールにアクセスする
author: shigeki-shoji
date: 2024-04-30
tags: ["Google Apps Script", AWS]
---

こんにちは、[庄司](https://github.com/edward-mamezou)です。

過去の記事の中で Google Apps Script (GAS) を使って AWS にアクセスするコードを説明してきました。過去の記事では XML のパースや署名のためにサードパーティのライブラリを利用するため、パッケージングに Webpack を使っていました。
この記事では、サードパーティのライブラリを全く使用せず、したがって GAS のエディタを使ったコーディングだけでAWS管理コンソールにアクセスする方法を説明します。

## 準備

Google Drive を開いて、「+ 新規」から「Google Apps Script」をクリックして作成しましょう。

## スクリプトコード (Code.gs)

詳細は後で説明します。コードの全体は次のとおりです。

```javascript
function getToken() {
  const properties = PropertiesService.getScriptProperties();
  const roleArn = properties.getProperty('ROLE_ARN');
  const token = ScriptApp.getIdentityToken();
  const body = token.split('.')[1];
  const base64 = Utilities.base64DecodeWebSafe(body, Utilities.Charset.UTF_8);
  const decoded = Utilities.newBlob(base64).getDataAsString();
  const payload = JSON.parse(decoded);
  return {
    'token': token,
    'role_arn': roleArn,
    'payload': payload
  };
}

function assumeRoleWithWebIdentity(roleArn, sessionName, oidcToken) {
  const role_arn = encodeURIComponent(roleArn);
  const role_session_name = encodeURIComponent(sessionName);
  const token = encodeURIComponent(oidcToken);
  const formData = `Action=AssumeRoleWithWebIdentity&RoleSessionName=${role_session_name}&RoleArn=${role_arn}&WebIdentityToken=${token}&DurationSeconds=3600&Version=2011-06-15`;

  const res = UrlFetchApp.fetch('https://sts.amazonaws.com/', {
    'method': 'post',
    'payload': formData
  });
  const xml = XmlService.parse(res.getContentText());
  const root = xml.getRootElement();
  const ns = root.getNamespace();
  const assumeRoleWithWebIdentityResult = root.getChild('AssumeRoleWithWebIdentityResult', ns);
  const credentials = assumeRoleWithWebIdentityResult.getChild('Credentials', ns);
  const roleCreds = {
    'sessionId': credentials.getChildText('AccessKeyId', ns),
    'sessionKey': credentials.getChildText('SecretAccessKey', ns),
    'sessionToken': credentials.getChildText('SessionToken', ns)
  };
  return roleCreds;
}

function getSigninToken(credentials) {
  // credentials { sessionId: '', sessionKey: '', sessionToken: '' }
  const req = "https://signin.aws.amazon.com/federation" +
      "?Action=getSigninToken" +
      "&SessionDuration=43200" +
      "&Session=" + encodeURIComponent(JSON.stringify(credentials));
  const res = UrlFetchApp.fetch(req);
  return JSON.parse(res.getContentText())['SigninToken'];
}

function getUrl() {
  const token = getToken();
  const roleCreds = assumeRoleWithWebIdentity(token.role_arn, token.payload.email, token.token);
  const signinToken = getSigninToken(roleCreds);
  const distination = encodeURIComponent('https://console.aws.amazon.com');
  return `https://signin.aws.amazon.com/federation?Action=login&Issuer=gmail.com&Destination=${distination}&SigninToken=${signinToken}`;
}

function doGet() {
  const payload = getToken()['payload'];
  console.log('aud: ' + payload.aud + ' sub: ' + payload.sub + ' (' + payload.email + ')');

  var template = HtmlService.createTemplateFromFile('index.html');
  template.name = payload.name;
  const html = template.evaluate();
  var output = HtmlService.createHtmlOutput(html);
  output.setTitle("AWS管理コンソール");
  return output;
}
```

## index.html

このスクリプトは Web アプリとしてデプロイします。doGet 関数でテンプレートに指定している `index.html` を作成します。HTML のコードは次のとおりです。

```html
<!DOCTYPE html>
<html>
  <head>
    <base target="_top">
  </head>
  <body>
    <div>ようこそ <?= name ?> さん</div>
    <button id="btn">AWS管理コンソール</button>
  </body>
  <script>
    document.getElementById('btn').addEventListener('click', () => {
      google.script.run.withSuccessHandler((url) => {
        window.open(url, '_blank');
      }).withFailureHandler((err) => {
        alert(err);
      }).getUrl();
    });
  </script>
</html>
```

HTML 中の script タグで GAS の getUrl 関数の呼び出しがあります。[google.script.run](https://developers.google.com/apps-script/guides/html/reference/run)[^1] によりブラウザからサーバーにある getUrl 関数が呼び出せるようになっています。

## appsscript.json

GAS のエディタでこのファイルを編集するためには、歯車のアイコンをクリックして「プロジェクトの設定」の「全般設定」から「「appsscript.json」マニフェストファイルをエディタで表示する」をチェックします。

`appsscript.json` は次のとおりです。

```json
{
  "timeZone": "Asia/Tokyo",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "openid",
    "profile",
    "email",
    "https://www.googleapis.com/auth/script.external_request"
  ]
}
```

## スクリプトコードの解説

ここからコードを説明します。

### getToken

`const roleArn = properties.getProperty('ROLE_ARN');` は、GAS の歯車アイコンのクリックで表示される「プロジェクトの設定」にある「スクリプトプロパティ」に設定されたプロパティ「ROLE_ARN」の値を読みます。`ROLE_ARN`には AWS の IAM ロールの ARN を設定します。IAM ロールの作成方法、ARN については[後](#aws-iam-ロールの作成)で説明します。
token は JWT が設定され、payload は JWT の payload 部分を JSON としてパースした値が設定されます。

```javascript
function getToken() {
  const properties = PropertiesService.getScriptProperties();
  const roleArn = properties.getProperty('ROLE_ARN');
  const token = ScriptApp.getIdentityToken();
  const body = token.split('.')[1];
  const base64 = Utilities.base64DecodeWebSafe(body, Utilities.Charset.UTF_8);
  const decoded = Utilities.newBlob(base64).getDataAsString();
  const payload = JSON.parse(decoded);
  return {
    'token': token,
    'role_arn': roleArn,
    'payload': payload
  };
}
```

### assumeRoleWithWebIdentity

AWS Security Token Service (AWS STS) のエンドポイントに GAS で取得したトークン (JWT) とロール (ARN) をリクエストして一時的な認証情報 (クレデンシャル) を取得します。レスポンスは XML になっているため、GAS の [XmlService](https://developers.google.com/apps-script/reference/xml-service) を使って必要な値 (sessionId, sessionKey, sessionToken) を取得します [^2]。

```javascript
function assumeRoleWithWebIdentity(roleArn, sessionName, oidcToken) {
  const role_arn = encodeURIComponent(roleArn);
  const role_session_name = encodeURIComponent(sessionName);
  const token = encodeURIComponent(oidcToken);
  const formData = `Action=AssumeRoleWithWebIdentity&RoleSessionName=${role_session_name}&RoleArn=${role_arn}&WebIdentityToken=${token}&DurationSeconds=3600&Version=2011-06-15`;

  const res = UrlFetchApp.fetch('https://sts.amazonaws.com/', {
    'method': 'post',
    'payload': formData
  });
  const xml = XmlService.parse(res.getContentText());
  const root = xml.getRootElement();
  const ns = root.getNamespace();
  const assumeRoleWithWebIdentityResult = root.getChild('AssumeRoleWithWebIdentityResult', ns);
  const credentials = assumeRoleWithWebIdentityResult.getChild('Credentials', ns);
  const roleCreds = {
    'sessionId': credentials.getChildText('AccessKeyId', ns),
    'sessionKey': credentials.getChildText('SecretAccessKey', ns),
    'sessionToken': credentials.getChildText('SessionToken', ns)
  };
  return roleCreds;
}
```

### getSigninToken

GAS で取得した ID を使って AWS 管理コンソールにアクセスするために「[Enabling custom identity broker access to the AWS console](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_enable-console-custom-url.html)」に書かれている方法で、カスタム URL を作成しなければなりません。getSigninToken 関数はここで説明されているカスタム URL に必要なトークンを作成して返します。

```javascript
function getSigninToken(credentials) {
  // credentials { sessionId: '', sessionKey: '', sessionToken: '' }
  const req = "https://signin.aws.amazon.com/federation" +
      "?Action=getSigninToken" +
      "&SessionDuration=43200" +
      "&Session=" + encodeURIComponent(JSON.stringify(credentials));
  const res = UrlFetchApp.fetch(req);
  return JSON.parse(res.getContentText())['SigninToken'];
}
```

### getUrl

GAS で取得した JWT を使って AWS STS から一時的認証情報を取得、それを getSigninToken 関数で取得したトークンを使用してカスタム URL を作成して返します。この関数は `index.html` に書かれた「AWS管理コンソール」ボタンがクリックされた時に、ブラウザ側のスクリプトから呼び出されます。

```javascript
function getUrl() {
  const token = getToken();
  const roleCreds = assumeRoleWithWebIdentity(token.role_arn, token.payload.email, token.token);
  const signinToken = getSigninToken(roleCreds);
  const distination = encodeURIComponent('https://console.aws.amazon.com');
  return `https://signin.aws.amazon.com/federation?Action=login&Issuer=gmail.com&Destination=${distination}&SigninToken=${signinToken}`;
}
```

## AWS IAM ロールの作成

GAS を Web アプリとしてデプロイした時に発行される URL にアクセスすると、GAS の doGet 関数が実行されます。この関数内で GAS で取得した JWT をパースして Audience (aud) と Subject (sub)、メールアドレスをログ出力しています。

デプロイした Web アプリにアクセスして GAS のログを確認して `aud` と `sub` の値を記録しておきます。`aud` の値は、コードを修正してデプロイをしても変化しません。

AWS IAM ロールの作成で、「ウェブアイデンティティ」を選択し、「アイデンティティプロバイダー」に「Google」を選択します。「Audience」にログに表示された `aud` の内容を入力し「条件を追加」をクリックして「キー」に「accounts.google.com:sub」を選択「条件」を「StringEquals」とし「値」に `sub` の値を設定して、「次へ」をクリックしてロールの作成を進めます。

ロールを作成したら、ARN をコピーして GAS のスクリプトプロパティに設定します。

## おわりに

ここで作成したスクリプトは、先日公開した記事「[スクラム入門の勉強会を開催しました](/blogs/2024/04/18/introduction-to-scrum/)」で使用しました。必要な AWS 環境に IAM ユーザを作成しパスワードをユーザに連携し、その IAM ユーザまたは IAM グループに必要な IAM ポリシーを割り当て、不要になった時に IAM ポリシーの解除、IAM ユーザの削除をするのは煩雑でミスを起こしやすいでしょう。このスクリプトを使った仕組みにより、必要な期間だけアクセス可能なリージョンやサービスに制限された環境を特定ユーザに提供することが非常に簡単になりました。

## 参考

- [基本から理解するJWTとJWT認証の仕組み](/blogs/2022/12/08/jwt-auth/)

[^1]: `google.script.run` のようなドメイン名と同じ形式の文字列をブラウザの検索ボックスに入力するのは危険です。DNS にこの名前で IP アドレスが割り当てられており悪意のあるサイトにつながる可能性があります。
[^2]: 過去の記事では XML のパースに `fast-xml-parser` というサードパーティのライブラリを使用していました。
