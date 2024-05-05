---
title: Using Google Apps Script to Access the AWS Management Console
author: shigeki-shoji
date: 2024-04-30T00:00:00.000Z
tags:
  - Google Apps Script
  - AWS
  - 認証/認可
  - Security
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/blogs/2024/04/30/accessing-aws-using-gas/).
:::



Hello, I'm [Shoji](https://github.com/edward-mamezou).

In past articles, I have explained how to access AWS using Google Apps Script (GAS). Previous articles used third-party libraries for XML parsing and signing, so we used Webpack for packaging. This article explains how to access the AWS Management Console using only GAS editor coding without using any third-party libraries.

## Preparation

Open Google Drive, click "+ New" and then "Google Apps Script" to create.

## Script Code (Code.gs)

Details will be explained later. The complete code is as follows:

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
  the root = xml.getRootElement();
  const ns = root.getNamespace();
  const assumeRoleWithWebIdentityResult = root.getChild('AssumeRoleWithWebIdentityResult', ns);
  the credentials = assumeRoleWithWebIdentityResult.getChild('Credentials', ns);
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
  output.setTitle("AWS Management Console");
  return output;
}
```

## index.html

This script is deployed as a web app. The doGet function creates `index.html` specified in the template. The HTML code is as follows:

```html
<!DOCTYPE html>
<html>
  <head>
    <base target="_top">
  </head>
  <body>
    <div>Welcome <?= name ?> </div>
    <button id="btn">AWS Management Console</button>
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

The script tag in the HTML calls the getUrl function in GAS. [google.script.run](https://developers.google.com/apps-script/guides/html/reference/run)[^1] allows the getUrl function on the server to be called from the browser.

## appsscript.json

To edit this file in the GAS editor, click the gear icon and check "Show 'appsscript.json' manifest file in editor" under "General Settings" in "Project Settings".

`appsscript.json` is as follows:

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

## Explanation of Script Code

From here, I will explain the code.

### getToken

`const roleArn = properties.getProperty('ROLE_ARN');` reads the value of the property 'ROLE_ARN' set in the 'Script Properties' shown by clicking the gear icon in GAS project settings. 'ROLE_ARN' is set with the ARN of an AWS IAM role. The method of creating an IAM role and ARN will be explained [later](#aws-iam-ロールの作成).
The token is set with JWT, and the payload is set with the value parsed as JSON from the JWT payload part.

### assumeRoleWithWebIdentity

AWS Security Token Service (AWS STS) endpoint is requested with the token (JWT) and role (ARN) obtained in GAS to get temporary credentials (credentials). The response is in XML, so necessary values (sessionId, sessionKey, sessionToken) are obtained using GAS's [XmlService](https://developers.google.com/apps-script/reference/xml-service) [^2].

### getSigninToken

To access the AWS Management Console using the ID obtained in GAS, you must create a custom URL as described in "[Enabling custom identity broker access to the AWS console](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_enable-console-custom-url.html)". The getSigninToken function creates and returns the token needed for the custom URL described here.

### getUrl

Using the JWT obtained in GAS, temporary credentials are obtained from AWS STS, and a custom URL is created using the token obtained in the getSigninToken function. This function is called by the script on the browser side when the "AWS Management Console" button in `index.html` is clicked.

## Creation of AWS IAM Role

When the URL issued when deploying GAS as a web app is accessed, the GAS doGet function is executed. This function parses the JWT obtained in GAS and logs the Audience (aud) and Subject (sub), and email address.

Record the values of `aud` and `sub` by checking the GAS log. The value of `aud` does not change even if you modify the code and redeploy.

In creating the AWS IAM role, select "Web Identity," choose "Google" as the "Identity Provider," enter the content of `aud` shown in the log in "Audience," click "Add Condition," select "accounts.google.com:sub" as "Key," set "Condition" to "StringEquals," and set the value to the value of `sub`, then click "Next" to proceed with the creation of the role.

Once the role is created, copy the ARN and set it in the GAS script properties.

## Conclusion

The script created here was used in the recently published article "[We held a study session on Introduction to Scrum](/blogs/2024/04/18/introduction-to-scrum/)". Creating an AWS environment with necessary IAM policies assigned to an IAM user or IAM group, and removing IAM policies and deleting IAM users when no longer needed can be cumbersome and prone to errors. This script-based mechanism makes it very easy to provide a specific user with an environment restricted to only the necessary period and services.

## References

- [Understanding JWT and JWT Authentication from the Basics](/blogs/2022/12/08/jwt-auth/)

[^1]: Entering a string in the form of a domain name like `google.script.run` in the browser's search box is dangerous. An IP address may be assigned to this name in DNS, potentially connecting to a malicious site.
[^2]: In past articles, a third-party library called `fast-xml-parser` was used for XML parsing.
