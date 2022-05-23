---
title: ADFSとCognito Userpoolsの連携
author: shigeki-shoji
date: 2022-05-23
tags: [aws, "認証/認可"]
---

ブラウザなどの UI からアクセスするマイクロサービスでは JWT 認証 ([OpenID Connect](https://openid.net/specs/openid-connect-core-1_0.html) 等) を利用することが一般的です。AWS を利用している場合には、[Amazon Cognito user pools](https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/cognito-user-identity-pools.html) で JWT の発行が可能です。

Cognito Userpools を利用する場合には、システムにアクセスするユーザーをこのサービスに登録する必要があります。しかし、組織内の Active Directory を ADFS ([Active Directory フェデレーションサービス](https://docs.microsoft.com/ja-jp/windows-server/identity/active-directory-federation-services)) を使用して SAML2 の IdP (identity provider) として実行し、Cognito Userpools に ADFS を [ID プロバイダーに追加](https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/cognito-user-pools-saml-idp.html)することで、ユーザー情報の移行が不要になります。

この記事では、ADFS と Cognito Userpools の属性の連携について説明します。

Cognito Userpools の ID プロバイダーに ADFS を設定する方法については、参考記事を最後の方にリストしていますので、そちらを参照してください。

## ADFS の設定

Cognito Userpools では、多くの場合 `email` 属性を必須にします。したがって、Active Directory に登録されているユーザーの電子メールアドレスを連携するように ADFS を設定する必要があります。ここでは、Windows Server にインストールされた ADFS を例に説明します。

「AD FS の管理」から「証明書利用者信頼」にある「要求発行ポリシーの編集」をクリックし、画面にある「規則の追加(A)...」ボタンをクリックします。

![](/img/blogs/2022/0523_adfs-1.png)

ステップ「規則の種類の選択」では、「LDAP 属性を要求として送信」を選択します。

![](/img/blogs/2022/0523_adfs-2.png)

要求規則名は任意ですが、この例では「Email」と入力します。属性ストアは「Active Directory」を選択します。LDAP 属性は「E-Mail-Addresses」を選択し、出力方向の要求の種類は「電子メールアドレス」とします。

出力方向の要求の種類には、後述する属性マッピングで使用する URI を入力することもできます。例えば、`Title` (役職) を `urn:custom:jobTitle` とする場合は、出力方向の要求の種類には「urn:custom:jobTitle」と入力します。

![](/img/blogs/2022/0523_adfs-3.png)

ここまでのように、規則を作成することで属性を連携することが可能になります。Cognito Userpools でカスタム属性を使用している場合には、これらの属性のマッピングも必要になります。マッピング可能な例としては、 `Department` (部署)、`Title` (役職) や `EmployeeNumber` (社員番号) など Active Directory で管理している LDAP 属性があります。どのような属性があるかについては「[PowerShellによるActiveDirectory管理 
― ユーザー管理編](https://codezine.jp/article/detail/6109)」等を参照してください。

## Cognito Userpools の設定

Cognito Userpools の `username` にマッピングされる属性は「[Specifying identity provider attribute mappings for your user pool](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-specifying-attribute-mapping.html)」にある通り規定されています。SAML を使う ADFS の場合は、`NameID` がマッピングされます。

ADFS で設定した属性を Cognito Userpools にマッピングする時には、AWS コンソールの Cognito の「ユーザープールの管理」でユーザープールを選択し、「フェデレーション」にある「属性マッピング」から、「SAML」タブで SAML プロバイダー名を選択して、「SAML 属性」に ADFS で設定した出力方向の要求の種類を表す URL を設定し、ユーザープール属性には、Cognito Userpools の属性を設定します。

例えば、出力方向の要求の種類が「電子メールアドレス」の場合は、「[The Role of Claims](https://docs.microsoft.com/en-us/windows-server/identity/ad-fs/technical-reference/the-role-of-claims)」から SAML 属性に設定する URI は `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress` になり、ユーザープール属性に「Email」を選択します。

出力方向の要求の種類に「urn:custom:jobTitle」を使用し、Cognito Userpools にカスタム属性として `custom:jobTitle` を設定している場合は、SAML 属性に `urn:custom:jobTitle`、ユーザープール属性に「custom:jobTitle」を選択します。

:::column:Cognito Userpools のトークン生成前の Lambda トリガーの活用

AWS の特徴として Lambda を使ってさまざまなイベントに対処できる点があります。Cognito Userpools も例外ではなく、いくつかのイベントに対応する Lambda を定義できます。

ここでは、その中から「[トークン生成前の Lambda トリガー](https://docs.aws.amazon.com/ja_jp/cognito/latest/developerguide/user-pool-lambda-pre-token-generation.html)」のユースケースを例示します。

トークン生成前の Lambda トリガーは、OpenID Connect 仕様にある ID トークンの生成前に実行される Lambda を定義します。この Lambda により、ID トークンをカスタマイズできます。

トークン生成前の Lambda トリガーのリクエストには、マッピングされた属性値が含まれます。したがって、属性値によって管理者とゲストのようにロールを割り当てるようなロジックを定義できます。そして、次のようなレスポンスを返す Lambda を定義することで、ID トークンのペイロードに `"custom:role": "Admin"` を追加するような要件に対処できます。

```json
{
    // 省略

    "response": {
        "claimsOverrideDetails": {
            "claimsToAddOrOverride": {
                "custom:role": "Admin"
            }
        }
    }
}
```
:::

## まとめ

この記事では、ADFS と Cognito Userpools で属性の連携について説明しました。[Okta](https://www.okta.com/)、[Auth0](https://auth0.com/)などの IDaaS や [Keycloak](https://www.keycloak.org/) などでも Cognito と同様に属性のマッピング機能を使用可能です。

## Cognito Userpools の ID プロバイダーに ADFS を設定する方法

- [Amazon Cognito ユーザープールを使用して AD FS を SAML ID プロバイダーとして設定するにはどうしたらよいですか?](https://aws.amazon.com/jp/premiumsupport/knowledge-center/cognito-ad-fs-saml/)
- [ADFSをSAML IdPとしてCognitoユーザープールと連携する](https://dev.classmethod.jp/articles/cognito-saml-idp/)

## 参考

- [マイクロサービスの Active Directory の活用](/blogs/2021/12/18/active-directory/)
- [Active Directory: Designing, Deploying, and Running Active Directory](https://www.amazon.co.jp/dp/B00CBM1WES/)
- [脱オンプレミス! クラウド時代の認証基盤 Azure Active Directory 完全解説](https://www.amazon.co.jp/dp/B01IB6Q79W/)
