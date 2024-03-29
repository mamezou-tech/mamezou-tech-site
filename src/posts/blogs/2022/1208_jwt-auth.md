---
title: 基本から理解するJWTとJWT認証の仕組み
author: toshio-ogiwara
date: 2022-12-08
tags: [Security, "認証/認可", advent2022]
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2022/
image: true
---
 
これは、[豆蔵デベロッパーサイトアドベントカレンダー2022](https://developer.mamezou-tech.com/events/advent-calendar/2022/)第8日目の記事です。

JSON Web Token(JWT)の単語を目にすることがよくあると思いますが、それと一緒に認証と認可や、RSAの署名や暗号化、そしてOpenIDConnectやOAuth2.0までと難しそうな用語とセットで説明されることも多いため、JWTって難しいなぁと思われがちです。しかし、JWT自体はシンプルで分かりやすいものです。そこで今回は素のJWTの説明からJWS、そしてJWT(JWS)を使った認証を段階的に説明していきます。

おな、この記事はJWT全体の仕組みや使い方の理解を目的としているため、以下の説明は行いません。
- RSAやHMACなど暗号化やアルゴリズムの細かい説明
- JWTを暗号化するJWEとJSONの暗号鍵表現のJWKについて
- OpenIDConnectとOAuth2.0について

記事は上記のような内容を理解したいけど、その前にその前提となるJWTやJWSの仕組みや用途を理解したい方を対象としています。また説明は正確性よりも分かりやすさを優先しています。正確な定義や情報を知りたい方は他の文献等を参考にしていただければと思います。

:::info: Javaを使ったJWT実装の紹介
この記事の続編としてJavaを使ったJWTの実装を以下の記事で紹介しています。興味がある方は併せてこちらも是非どうぞ。
- [Auth0 java-jwtを使った素のJWT認証](/blogs/2022/12/10/java-jwt-auth/) 
- [続・Auth0 java-jwtを使った素のJWT認証 - 公開鍵方式でやってみた](/blogs/2022/12/25/rsa-java-jwt/)
:::



# JWTとは
早速JWTについてですが、JWTのRFC上の定義を要約すると次のとおりになります。

> HTTPヘッダーやクエリパラメータなどスペースに制約がある環境で使うことを前提に、JSON形式のデータをURLセーフでコンパクトな形式にしたもの

これは言い換えるとJWTはHTTPヘッダーやクエリパラメータにJSONデータをうまく載せられるように

- JSONデータをURLセーフする方法を規定したもの
- JSONデータをコンパクトにする方法を規定したもの

といえます

では実際これらがどのようにRFCで規定されているかをみてみると、JWTの仕様として次のように定義されています。
- URLセーフする方法
  - JSONデータをBASE64URLエンコードする
- コンパクトにする方法
  - よく使われるデータ項目の名称を省略形にすることでJSONのキー名を短くする。またこれによりJSONデータをコンパクトにする

後者を補足すると、JWTの仕様として次の省略名が予約されています(RFC上の定義は[こちら](https://tex2e.github.io/rfc-translater/html/rfc7519.html#4-1--Registered-Claim-Names))


|省略名 | 項目名  | 説明 |
|:----:|---------|-----|
| iss | issuer  | JWTの発行者 |
| sub | subject | ユーザの識別子などJWTの主体 |
| aud | audience | JWTの受信者 |
| exp | expiration time | JWTの有効期限 |
| nbf | Not Before | JWTの有効開始日時 |
| iat | Issued At | JWTの発行日時 |
| jti | JWT ID | JWTの一意な識別子 |

省略名を予約することでどのような効果を期待しているかというと、例えば、発行者と主体と有効期限を表すJSONデータを作る場合、JWT仕様がなければ一般的にはデータの意味が分かるように次のようなキー名を付けたりすると思います。

```json
{
  "issuer": "io.exact.sample.jwt",
  "subject": "saumple",
  "expiration-time": 1670085336
}
```

これに対し予約されている省略名を使うことで次のようにキー名が短くなり、JSONデータ全体としてのサイズを小さくですることができます。
```json
{
  "iss": "io.exact.sample.jwt",
  "sub": "saumple",
  "exp": 1670085336
}
```

省略名の予約登録についてRFCでは「有用でアプリケーション間で相互運用可能な項目名のセットを提供する目的がある」といっていますが、これと同時に「この主たる目的は項目データをコンパクトにすることだ」ともRFCではいっています。このことから、JWTの「JSONデータをコンパクトにする方法」の1つに、省略名の予約が含まれていることが分かります。

RFCからみたJWTの概観を理解したところで、ここからはJWTにおける重要な用語の説明に移ります。

今までJSONのデータ項目といっていたJSONのキーと値のペアはJWTでは「クレーム(Claim)」と呼び、キー名は「クレーム名」、値は「クレーム値」と呼ばれます。下の図のようにその実体はJSONのデータ項目以上でも以下でもないのですが、JWTではクレームという用語が使われますので必ず覚えてください。この記事でも以降は「データ項目」は「クレーム」と呼びます。

![claim](/img/blogs/2022/1208_claim.drawio.svg)

先ほど挙げた`iss`や`sub`などJWTで予約されているクレーム名は「登録クレーム名(Registered Claim Names)」と呼ばれます。JWTでは必須とする登録クレームを規定していません。JWTとしては登録クレームの利用はすべて任意のため、必須とするクレームはJWTを利用するアプリケーション間で決めることとなっています。

また、登録クレーム以外にもアプリケーション間で利用する任意のクレームをJWTに含めることも可能です。例えば、発行者と件名の他にメールアドレス(email)とグループ名(groups)を含んだ以下のようなJSONも問題なくJWTとして扱えます。

```json
{
  "iss": "io.exact.sample.jwt",
  "sub": "saumple",
  "exp": 1670085336,
  "email": "sample@extact.io",
  "groups": "member, admin"
}
```

ここまでの説明をもとに「JWTとは」をまとめると次のようになります。
- JWTとは、JSONをBase64URLエンコードしたもの
- JWTとは、よく利用されるキー名を省略名で予約登録しているもの

この理解をもとに具体例で「JWTとは」を説明すると下の図の左側のJSONデータを右側の文字列にしたものがJWTとなります。

![claim-jwt](/img/blogs/2022/1208_claim-jwt.drawio.svg)

JWTの説明は以上となります。

JWTの説明と一緒に良く出てくる認証や暗号化の話は、ここまで一切でてきていません。このことからも分かるようにJWT自体は認証や暗号化に関してなにも規定していません。単にスペースに制約のあるHTTPヘッダーにJSONを載せるために、URLセーフでデータを小さくするJSONのデータフォーマット(表現形式)を決めているだけです。

後ほど出てくる話ですが、参考までに先にお伝えしてくと、JWTと認証の関係は、アプリケーション間で認証データをやり取りする伝達手段としてJWTが都合が良いために使われているだけで、JWTと認証は本来なんら関係はありません。

# JWSとは
JWTはHTTPヘッダーで利用することを前提としたJSONの表現方法を定めているだけで、セキュリティについてはなにも考慮していません。データは単にBase64URLエンコードしているだけで、Base64URLデコードすることで簡単に内容を見ること(盗聴)ができます。また、デコードしたデータを修正してエンコードし直すことで簡単にデータを改ざんすることもできます。このため、JWT単独で重要なデータを扱うには問題があります。

このJWTの改ざんを防止する手段としてJSON Web Signature(JWS)[^1]があります。ただし、改ざん防止といってもデータを改ざんできないようにするのではなく、JWSはデータが改ざんされたらそれを検知する仕組み、もっというと受け取ったJWTが本物かどうかを確認する仕組みとなります。

[^1]: JWT側でもJWTをセキュアにする仕組みとしてJWSが説明されているため、厳密にここからここまでがJWTの仕様でここからがJWSの仕様などと綺麗に線引きできるものではなく、一部お互いに被る部分があります。今回は細かい定義を説明することが目的ではないた、JSONの表現方式を規定しているのがJWT、JWTの改ざんを検知する仕組みがJWSというスタンスで説明します。

改ざん防止という説明から改ざんできない仕組み、つまり暗号化の仕組み？とよく混同しがちですが、JWSはあくまでも改ざんは可能だが、改ざんされた場合、それを検知することができる仕組みとなります。

JWTを暗号化し中身自体を見られなくする仕組みとしてJSON Web Encryption(JWE)がありますが、これは今回の範囲外のため、説明は割愛します。

## JWSの署名
改ざん防止で登場するのが暗号鍵を使ったデータの署名です。

暗号鍵を使ったJWTの署名は次の図をもとに説明します。なお、説明は理解を容易にするため、暗号化する側と復号化する側の双方が同じ鍵を使う共通鍵方式(秘密鍵方式)を前提にしています。公開鍵方式の説明は共通鍵で全体の仕組みを解説した後に簡単に行います。

![jwt-sign](/img/blogs/2022/1208_jwt-sign.drawio.svg)

JWSのデータは図のようにヘッダー、ペイロード、シグニチャの3つから構成されます。

まず真ん中のペイロードがJWTのクレームセットになります。

その左がペイロードの種類[^2]や署名アルゴリズムを表明するヘッダーとなります。ヘッダーに設定するJSONのキー名はJWS仕様で複数定義されていますが、特に重要なキーが`alg`です。`alg`はヘッダーとペイロードをどのアルゴリズムで署名(暗号化)したかを表します。この設定がないとデータを受け取った側はどのアルゴリズムで検証(復号化)すればよいか分かりません。よって`alg`の設定は必須となります。

[^2]: JWSでは署名する対象、つまりペイロードに含めるデータをJSONに限定していません。このため、ヘッダーでペイロードのデータ種別を表明する必要があります。ただし、これはJWSの仕様上の話であり、JSON以外が使われることは実際ないと思われます。

他にヘッダー項目でよく見るものとして`typ`があります。`typ`はペイロードのデータ種別を表すものとなりますが必須ではありません。JWS仕様には他にもいくつかヘッダー項目が定義されていますが`alg`と`typ`の2つ以外はあまり目にすることはないため、でてきたらその都度調べる程度で問題はありません。

最後が右のシグニチャです。ここにはヘッダーとペイロードを暗号鍵を使って署名(暗号化)した結果が入ります。

JWSの概要を説明してきましたが、その生成手順は下記のとおりになります。JWSは最終的に下記の手順で生成した1つの文字列となりますが、この文字列を生成する手順を「JWSコンパクトシリアライゼーション」と呼びます。

1. ペイロードをBASE64URLエンコードする
2. ヘッダーをBASE64URLエンコードする
3. BASE64URL エンコードした1と2の結果を`.`(ドット)で繋ぐ
4. 3の結果を暗号鍵とalgに指定された方式で署名(暗号化)し、その結果をさらにBASE64URLエンコードする
5. 3(ヘッダー+ペイロード)と4(シグニチャ)の結果を`.`(ドット)で繋ぐ

この手順のポイントは4.になります。4.で生成されたシグニチャは暗号化されていますが、その中身はヘッダーとペイロードと同じに内容になっています。したがって、シグニチャを復号化した場合、その結果は1文字も異なることなく3の手順で作成したものと一致します。この前提をもとに次はJWSの検証について説明していきます。

## JWSの検証
`.`で連結されたJWS文字列の3つ目のシグニチャは暗号鍵を持っていない限り中身をみることはできませんが、ヘッダーとペイロードはBASE64デコードすることで簡単に中身をみることができます。

JWSの冒頭で説明したとおり、JWSは盗聴を防ぐものではないため悪意をもった第三者に中身が見られる可能性があることは許容範囲なのですが、では、ペイロードを書き換えられたとした場合はどうでしょう？

自分の都合のよいJSONデータをBASE64URLエンコードするだけでペイロードは簡単に書き換えることができます。さらに、これを受け取った人がペイロードを単にBASE64URLデコードしただけでその値を使った場合、まんまと改ざんされた値を使わされることになります。

このため、JWTで重要なデータを受け取る場合、そのJWTが確かに自分が信頼する相手が作成したデータのままであるかを確認する必要があります。そこで登場するのが暗号鍵によるシグニチャの検証です。

JWS文字列と暗号鍵には次の前提があります。

- 暗号鍵は信頼している相手しか持っていない
- 暗号化した内容は同じ暗号鍵を持っている人しか同じ内容に復号化することはできない
- 相手と同じ暗号鍵でシグニチャを復号化した場合、その結果は暗号化する前の内容と同じになる

このことから、信頼した相手からのJWSであれば、暗号鍵を使って復号化した結果とヘッダーとペイロードをBASE64URLエンコードした結果は一致するハズです。これが異なるということは、そのペイロードは改ざんされていることになります。

![jwt-verify](/img/blogs/2022/1208_jwt-verify.drawio.svg)

JWSではこのようにシグニチャを復号化した結果とヘッダーとペイロードを比較し、改ざんされていないかを検証します。

暗号化する側と復号化する側が同じ鍵を共有する共通鍵方式(秘密鍵方式)を前提に説明してきましたが、ここまでの理解があれば公開鍵方式を理解するのは簡単です。

共通鍵方式との違いは、シグニチャを作成する側はその人の秘密鍵で署名(暗号化)し、それを受け取る側は秘密鍵に対する公開鍵でシグニチャを検証(復号化してヘッダーとペイロードと比較)するだけです。この仕組みは秘密鍵で暗号化したものはその秘密鍵から作成された公開鍵でしか復号化できない特性にもとづいています。

:::check: ハッシュ値による署名と検証
記事ではBASE64URLエンコードされた文字列を暗号鍵で直接暗号化する説明をしていますが、一般的に利用される署名アルゴリズムではデータ量を少なくするため、BASE64URLエンコードされた文字列ではなく、その文字列に対するハッシュ値に対して暗号化を行っています。

この場合のシグニチャの中身はハッシュ値となるため、復号化して得ることができるのは当然としてハッシュ値になります。しかし、ハッシュ値は不可逆ですので、シグニチャを復号化してもハッシュ化前のヘッダーとペイロードに復元することはできません。

したがって、この場合における記事本文の「シグニチャの中身はヘッダーとペイロードと同じ」の説明は正しくは「同じハッシュ値」となり、JWS検証でシグニチャと比較されるのはJWSのBASE64URLエンコードされたヘッダ－とペーロードの文字列ではなく、その文字列から生成されたハッシュ値となります。
:::

:::column: JWTの中身の簡単な見方
デバックをしている時などJWSのヘッダーやペイロードを見たい場合はよくあります。そんなときは[jwt.io](https://jwt.io/#debugger-io)のサイトでJWSの中身をお手軽便利にみることができます。

![jwt-io](/img/blogs/2022/1208_jwt-io.png)

使い方は簡単でサイトにアクセスして開いた画面の左側のEncodedのエリアに中身を見たいJWS文字列をコピペするだけです。そうすると右側のDecodedのエリアにJSONの中身が出力されます。この状態で今度はDecodedのJSONを修正するとその結果が左側のEncodedに反映されたりとラウンドトリップにJSONとJWS文字列の対応を確認することができます。また、暗号鍵を入力することでシグニチャの検証もできたりもします。ただし、他のサイトにJWSや暗号鍵を入力することになるため、秘匿性の高い情報は使わないなど、セキュリティへの配慮は必要となります。

最後に図で使っているJWS文字列と共通鍵を記載しておきますので、試したい方はどうぞ。

```shell
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJpby5leGFjdC5zYW1wbGUuand0Iiwic3ViIjoic2F1bXBsZSIsImV4cCI6MTY3MDA4NTMzNiwiZW1haWwiOiJzYW1wbGVAZXh0YWN0LmlvIiwiZ3JvdXBzIjoibWVtYmVyLCBhZG1pbiJ9.wZRzbwWIclydco4ta069uPSaaimTtRFECIXksB81sdo
```
- Algorithm:`HS256`
- secret(暗号鍵):`mamezou`
:::


# 用語の整理
次のJWT認証の説明に入る前に一旦ここまでの内容を元に用語を整理してみます。各用語に対して説明をしてきましたが、それぞれの意味は結局のところ次のとおりになります。

- クレーム(claim)
  - JSONのデータ項目をJWTのコンテキストで説明するときの用語。実体としてはJSONのデータ項目と同じ
  - 複数のクレーム集合をクレームセットといい、これがJSONデータの全体に相当する
- JWT(JSON Web Token)
  - JWSによりエンコードされたクレームセット[^3]
  - 言い方を変えるとJWSのペイロードになるものがJWTともいえる
- JWSコンパクトシリアライゼーション
  - ヘッダーとペイロード(JWT)とシグニチャをBASE64URLエンコードして`.`(ドット)で連結すること
- JWS(JSON Web Signature)
  - JWTをJWSコンパクトシリアライゼーションしたもの
  - つまりJWSとはJWSコンパクトシリアライゼーションした次の文字列を指す`BASE64URLエンコード(ヘッダー) + . + BASE64URLエンコード(ペイロード) + . + BASE64URLエンコード(シグニチャ)`

RFC的にJWSのデータ部に相当するものをJWTと呼ぶ定義となっているため、JWTとJWSは相互に依存した概念[^4]となっています。このため、JWTやJWSの説明が難しくなっていますが、実際のところ、JWTはJSONの表現形式で、そのJWTをセキュアにやり取りできるようにJWSシリアライゼーションした文字列がJWSと理解して困ることはありません。

また、JWTはJWSの部分に対する呼び方のため、概念としてJWTが単独で存在することはありませんが、一般的にJWSのことをJWTとして呼んでいることも多くあります。ですので、次の[JWTによる認証](#jwtによる認証)では一般的な呼び方にならいJWSはJWTとして説明します。

[^3]: 他にもJWTをエンコードするものとしてJSONデータ自体を暗号化するJWE(JSON Web Encryption)がありますが、JWEは本記事の対象外のため、触れていません。
[^4]: JWTとJWSが直接ガッツリ依存しあってる訳でなく、正しくはJWTとJWSの間を取り持つ仕様としてJOSE(Javascript Object Signing and Encryption)があります。この説明はもうお腹いっぱいだと思われるため割愛しておきます。


# JWTによる認証
ここまでの説明で気がついた方もいるかも知れませんが、JWT認証とは認証情報が設定されたJWTをもとにユーザ認証を行うことです。

もっと、平たくいうと、ユーザの認証方式として、自身のIDとそのユーザしか知り得ないパスワードを提示ししてもらうことでそのユーザが確かにIDに対する本人であることを識別するユーザログインが一般的ですが、JWT認証はIDとパスワードの代わりに自身が信頼していているアプリが発行した認証情報のJWTを提示してもらい、そのJWTを信頼したアプリと取り交わした鍵情報で検証することで、JWTに書かれているユーザ本人だと確認することとなります。

これの流れを図にすると次のようになります。

![jwt-auth](/img/blogs/2022/1208_jwt-auth.drawio.svg)

他のアプリに代わりユーザを認証し、その認証情報に対するJWTを発行するアプリを一般的にIDプロバイダーと呼びます。最近は色々なサイトでGoogleやfacebookなどの認証情報でシングルサインオンができるようになりましたが、これらの仕組みの背後にはここで説明したJWT認証の仕組みがベースとして使われています(コレだけではないですが)。また、このようにIDプロバイダーが認証したJWTを他のサイトに連携し、連携されたサイトはそのJWTを検証し受け入れることを「IDフェデレーション」と呼び、この際にやり取りされる認証情報付きJWTは「IDトークン」とも呼ばれます。それぞれ一度は耳にされたことがあるかと思います。

「[JWTとは](#jwtとは)」の最後にチラッと「JWTで認証がよく出てくるのはJWTが認証に都合が良いからだ」といいましたが、その理由は正にこのIDフェデレーションにおけるIDトークンとしてJWT(JWS)を利用するのが適しているためとなります[^5]。

[^5]:IDフェデレーションでよく利用される認証トークンとしてはSAMLもあります。

JWTからみた仕組みを説明してきましたが、最後にアプリの観点でJWT認証を利用することのメリットを挙げると次のものがあります。
- 自分のアプリでパスワードなどの認証情報を管理しなくてよい
- ユーザログインは一般的にIDとパスワードを管理するDBへアクセスする必要があるが、JWT認証ではその必要がない
- これにより認証処理をプレゼンテーションで完結することができるとともにDBアクセスが不要となることで認証処理の性能を向上させることができる
- クライアントからリクエストの都度、認証されたJWTを送信してもらい、それを検証することでユーザをセキュアに識別できるため、セッションでユーザ情報を維持する必要がない

# まとめ
署名と検証、そして認証など一見難しそうにみえる内容もそれぞれの位置づけと役割が分かればそれほど難しいものではないことを理解いただけたでしょうか。

今回はJWTの盗聴を防止するJWEは説明しませんでしたが、JWEはJWT全体を暗号化して中身を見られなくする技術です。JWEを理解するにはその元データとなるJWTや関連するJWSへの理解が必要です。また、OpenIDConnectやOAuth2.0は主にアプリがIDプロバイダーからJWTのIDトークンを取得するまでの一連の流れを規定しているものとなります。よって、今回のベーシックなJWT認証の仕組みに対する理解なくしてOpenIDConnectやOAuth2.0の理解はおぼつきません。この記事がこれらの理解のきっかけとなったら幸いです。

なお、今回はJWT認証の実装は説明しませんでしたが、冒頭でも紹介したとおりAuth0のjava-jwtを使ったJWT認証の実装を[こちら(共有鍵方式)](/blogs/2022/12/10/java-jwt-auth/)と[こちら(公開鍵方式)](/blogs/2022/12/25/rsa-java-jwt/)で紹介しています。実装にも興味がある方は是非こちらもどうぞ。
