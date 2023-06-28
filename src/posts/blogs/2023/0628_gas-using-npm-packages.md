---
title: "Google Apps ScriptからAWSにアクセスするための署名の実装"
author: shigeki-shoji
date: 2023-06-28
tags: ['Google Apps Script', AWS]
---

こんにちは、[庄司](https://github.com/edward-mamezou)です。

[Google Forms](https://www.google.com/forms/about/) や [Google Sheets](https://www.google.com/sheets/about/) 等の Google アプリケーションを活用していて、例えば Google Sheets に入力された特定の範囲のデータを AWS の S3 にアップロードしたいと思いました。

単純に考えると [AWS SDK for JavaScript](https://aws.amazon.com/jp/sdk-for-javascript/) の利用が真っ先に思い浮かびますが、残念ながらこれは使用できません。Google Apps Script の実行環境は Node.js とは異なる独自のものだからです。

この記事では、Google Apps Script 環境でも動作する npm モジュール を利用して S3 にファイルをアップロード (PutObject) できるようにするコード作成の方法を説明します。

## Signature Version 4

AWS API との通信では、[Signature Version 4](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_aws-signing.html) を使った署名によって正当性を検証します。

この署名のみを行う、[`@aws-sdk/signature-v4`](https://github.com/aws/aws-sdk-js-v3) というモジュールも AWS から公開されていますが、残念ながらこれも Google Apps Script 環境では実行できません。

AWS SDK が対応していない環境や言語の開発者向けに「[Authenticating Requests (AWS Signature Version 4)](https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-authenticating-requests.html)」等いくつかのドキュメントが提供されています。

## npm モジュールの利用

Google Apps Script では Node.js のような依存モジュールのコードを単一のコードにパッケージしなければなりません。この目的で、ここでは webpack を使用することにします。

## 環境構築

では、開発環境の構築から説明します。

Google Apps Script を GitHub でコード管理をするため Google から提供される cli ツール [clasp](https://github.com/google/clasp) をインストールします。

```shell
npm install -g @google/clasp
```

### プロジェクトの初期化

作成するプロジェクトのディレクトリを作成し、そのディレクトリで次の初期化コマンドを実行します。

```shell
npm init
```

### webpack 等のインストール

webpack、jest (テストツール) をインストールします。

```shell
npm i --save-dev webpack webpack-cli gas-webpack-plugin jest
```

package.json ファイルの scripts を次のように記述します。

```json
  "scripts": {
    "test": "jest",
    "webpack": "webpack"
  }
```

webpack.config.js ファイルを次の内容で作成します。

```javascript
const path = require('path');
const GasPlugin = require('gas-webpack-plugin');

module.exports = {
    mode: 'production',
    entry: {
        main: path.resolve('./src', 'Code.js')
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'Code.js',
        library: {
            name: 'Code',
            type: 'var'
        }
    },
    plugins: [new GasPlugin()]
}
```

### Google Apps Script の初期化

dist ディレクトリを Google Apps Script のプロジェクトとして初期化します。

dist ディレクトリに移動します。

```shell
mkdir dist
cd dist
```

```shell
clasp login
clasp create --title 'gas-example'
```

```shell
cd ..
```

## 開発

### 検証方法の確立

まず、正しい署名とはどのような値で、それをどうやって検証するかから始めます。

これには、AWS から提供される署名モジュール `@aws-sdk/signature-v4` を利用します。さらに暗号化に必要な `@aws-crypto/sha256-js` もインストールします。

```shell
npm i --save-dev @aws-sdk/signature-v4 @aws-crypto/sha256-js
```

src ディレクトリに `put-object.test.js` ファイルを次の内容で作成します。

```javascript
const { SignatureV4 } = require('@aws-sdk/signature-v4');
const { Sha256 } = require('@aws-crypto/sha256-js');

test ('sign', async () => {
    const signerInit = {
        service: 's3',
        region: 'ap-northeast-3',
        'sha256': Sha256,
        credentials: {
            accessKeyId: 'foo',
            secretAccessKey: 'bar'
        }
    };

    const signer = new SignatureV4(signerInit);
    const bucketName = 'mybucket';
    const contentType = 'application/json';

    const request = {
        'method': 'PUT',
        'protocol': 'https:',
        'path': '/my.json',
        'headers': {
            'host': `${bucketName}.${signerInit.service}.${signerInit.region}.amazonaws.com`,
            'Content-Type': contentType,
            'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD',
            'X-Amz-Security-Token': 'baz'
        },
        'hostname': `${bucketName}.${signerInit.service}.${signerInit.region}.amazonaws.com`
    };

    const signingDate = new Date('2000-01-01T00:00:00.000Z');
    const { headers } = await signer.sign(
        request,
        { 'signingDate': signingDate }
    );
    
    console.log(headers);

    /*
    const Signature = require('./signature-v4');
    const target = new Signature(signerInit.service
        ,signerInit.region
        ,signerInit.credentials.accessKeyId
        ,signerInit.credentials.secretAccessKey);

    const res = target.sign(signingDate, {
        method: 'PUT',
        protocol: 'https:',
        path: request.path,
        headers: {
            'host': `${bucketName}.${signerInit.service}.${signerInit.region}.amazonaws.com`,
            'Content-Type': contentType,
            'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD',
            'X-Amz-Security-Token': 'baz'
        },
        'hostname': `${bucketName}.${signerInit.service}.${signerInit.region}.amazonaws.com`
    });

    console.log(res.headers);

    expect(res.headers['Authorization']).toEqual(headers['authorization']);
    */
});
```

このコードをテスト実行すると、S3 にファイルをアップロード (PutObject) 時に署名を含む追加のヘッダが表示されます。

これを足がかりに同じヘッダが生成されるようにコードを作成します。

### 暗号モジュールのインストール

Google Apps Script で動作する暗号モジュールを依存関係に追加します。

```shell
npm i --save crypto-js
```

src ディレクトリに `signature-v4.js` ファイルを次の内容で作成します。

```javascript
const sha256 = require('crypto-js/sha256');
const hmac = require('crypto-js/hmac-sha256');
const hex = require('crypto-js/enc-hex');

class Signature {
    
    constructor(service, region, access_key_id, secret_access_key) {
        this.service = service;
        this.region = region;
        this.access_key_id = access_key_id;
        this.secret_access_key = secret_access_key;
    }
    
    addZero(s) {
        return (Number(s) < 10 ? '0' : '') + String(s);
    }

    dateStringFull(d) {
        return String(d.getUTCFullYear()) + this.addZero(d.getUTCMonth()+1) + this.addZero(d.getUTCDate()) + "T" + this.addZero(d.getUTCHours()) + this.addZero(d.getUTCMinutes()) + this.addZero(d.getUTCSeconds()) + 'Z';
    }
   
    dateStringShort(d) {
        return String(d.getUTCFullYear()) + this.addZero(d.getUTCMonth()+1) + this.addZero(d.getUTCDate());
    }
    
    getSignatureKey(key, dateStamp, regionName, serviceName) {
        var kDate = hmac(dateStamp, "AWS4" + key);
        var kRegion = hmac(regionName, kDate);
        var kService = hmac(serviceName, kRegion);
        var kSigning = hmac("aws4_request", kService);

        return kSigning;
    }
    
    fixedEncodeURIComponent(str) {
        return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
          return '%' + c.charCodeAt(0).toString(16).toUpperCase();
        });
    }

    headers(h) {
        return Object.keys(h).sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : 1).reduce((acc, k) => {
            acc += k.toLowerCase() + ':' + h[k] + '\n';
            return acc;
        }, '');
    }

    signedHeaders(h) {
        return Object.keys(h).sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : 1).reduce((acc, k) => {
            if (acc) {
                acc += ';' + k.toLowerCase();
            } else {
                acc = k.toLowerCase();
            }
            return acc;
        }, '');
    }

    query(q) {
        return Object.entries(q).sort((a, b) => a[0] < b[0] ? -1 : 1).reduce((acc, [key, value]) => {
            if (acc) {
                acc += '&' + key + '=' + this.fixedEncodeURIComponent(value);
            } else {
                acc = key + '=' + this.fixedEncodeURIComponent(value);
            }
            return acc;
        }, '');
    }

    sign(signingDate, request) {
        const dateStringFull = this.dateStringFull(signingDate);
        const dateStringShort = this.dateStringShort(signingDate);

        request['headers']['X-Amz-Date'] = this.dateStringFull(signingDate);
        
        const algorithm = 'AWS4-HMAC-SHA256';
        const scope = dateStringShort + '/' + this.region + '/' + this.service + '/aws4_request';

        const headers = this.headers(request.headers);
        const signedHeaders = this.signedHeaders(request.headers);
        
        const query = this.query(request.query ? request.query : {});

        const canonicalString = request.method + '\n'
            + request.path + '\n'
            + query + '\n'
            + headers + '\n'
            + signedHeaders + '\n'
            + request.headers['X-Amz-Content-Sha256'];
       
        const canonHash = hex.stringify(sha256(canonicalString));

        const stringToSign = algorithm + '\n'
            + dateStringFull + '\n'
            + scope + '\n'
            + canonHash;
       
        const key = this.getSignatureKey(this.secret_access_key, dateStringShort, this.region, this.service);
        const signature = hex.stringify(hmac(stringToSign, key));

        request.headers['Authorization'] = `${algorithm} Credential=${this.access_key_id}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
        return request;
    }
}

module.exports = Signature;
```

### テスト

前述のコードの検証をするため、`put-object.test.js` の後ろの方にある `/*` と `*/` を削除してコメント解除します。

コードは次のようになります。

```javascript
const { SignatureV4 } = require('@aws-sdk/signature-v4');
const { Sha256 } = require('@aws-crypto/sha256-js');

test ('sign', async () => {
    const signerInit = {
        service: 's3',
        region: 'ap-northeast-3',
        'sha256': Sha256,
        credentials: {
            accessKeyId: 'foo',
            secretAccessKey: 'bar'
        }
    };

    const signer = new SignatureV4(signerInit);
    const bucketName = 'mybucket';
    const contentType = 'application/json';

    const request = {
        'method': 'PUT',
        'protocol': 'https:',
        'path': '/my.json',
        'headers': {
            'host': `${bucketName}.${signerInit.service}.${signerInit.region}.amazonaws.com`,
            'Content-Type': contentType,
            'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD',
            'X-Amz-Security-Token': 'baz'
        },
        'hostname': `${bucketName}.${signerInit.service}.${signerInit.region}.amazonaws.com`
    };

    const signingDate = new Date('2000-01-01T00:00:00.000Z');
    const { headers } = await signer.sign(
        request,
        { 'signingDate': signingDate }
    );
    
    console.log(headers);

    const Signature = require('./signature-v4');
    const target = new Signature(signerInit.service
        ,signerInit.region
        ,signerInit.credentials.accessKeyId
        ,signerInit.credentials.secretAccessKey);

    const res = target.sign(signingDate, {
        method: 'PUT',
        protocol: 'https:',
        path: request.path,
        headers: {
            'host': `${bucketName}.${signerInit.service}.${signerInit.region}.amazonaws.com`,
            'Content-Type': contentType,
            'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD',
            'X-Amz-Security-Token': 'baz'
        },
        'hostname': `${bucketName}.${signerInit.service}.${signerInit.region}.amazonaws.com`
    });

    console.log(res.headers);

    expect(res.headers['Authorization']).toEqual(headers['authorization']);
});
```

このテストコードは、最終行の `expect` で AWS SDK モジュールを使って生成された `authorization` ヘッダと、前述のコードが生成した `Authorization` が同値か確認しています。

### ライブラリとして使用できるようにする

Google Apps Script のライブラリに作成したコードを利用できるようにするため、`Code.js` ファイルを次の内容で作成します。

```javascript
global.Signature = require('./signature-v4');
```

### デプロイ

作成したコードを Google Drive にデプロイする手順は次のとおりです。

```shell
npm run webpack
cd dist
clasp push
cd ..
```

## おわりに

この記事から少し拡張したコード全体が [GitHub リポジトリ](https://github.com/takesection-sandbox/gas-example)にあります。

署名には認証情報 (ACCESS KEY ID と SECRET ACCESS KEY) が必要になります。

IAM ユーザに関連づけられた認証情報は、永続的な認証情報と呼ばれるものです。永続的な認証情報は公開すると短時間のうちに悪用されます。このようなインシデントも頻繁に発生しています。有効な認証情報をコードに絶対含めないでください。

IAM ロールを使用して一時的な認証情報を取得し、またロールにアタッチするポリシーでアクセス可能なリソースは最小限にしてください (最小権限の原則)。

## 参考

- [AWS でゼロトラストを実現するためのアプローチ(AWS-39)](https://youtu.be/mkxyqEmgi8w)
