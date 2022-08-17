---
title: ソフトウェアサプライチェーンセキュリティのための GitHub Actions ワークフロー
author: masahiro-kondo
tags: [Security, GitHub, CI/CD]
date: 2022-08-17
---

昨今 OSS をソフトウェア開発で使用するのは当たり前になっているため、依存しているアップストリームの OSS の脆弱性によりアプリケーションが侵害されるリスクは常にあります。直接使用している OSS のみならず間接的に依存しているものもあります。我々開発者は、Maven / NPM などの公式パッケージレジストリを経由して OSS コードに由来するバイナリやコンポーネントを取得して使用します。パッケージマネージャーによって管理しますが、通常規模のプロジェクトでも数百のオーダーに達することも珍しくありません。それら全ての成果物を把握し、不正なコードが混入していないかを人手で確認するのは、事実上不可能です。
この記事では、GitHub と Sigstore の署名技術によってソフトウェアの出所を透明性のあるものにする GitHub Actions ワークフローについて見ていきます。

[[TOC]]

## ソフトウェアサプライチェーンとそのセキュリティリスク
アプリケーションのソースコード、使用する全ての OSS のコンポーネントを含め、ビルド・パッケージングしてプロダクション環境にデプロイされるまでの一連の流れをソフトウェアサプライチェーンと捉え、このサプライチェーンへの攻撃に対抗するセキュリティ対策を施すことの重要性が認識され始めました。ソフトウェアサプライチェーンには、ビルドやパッケージスクリプト、CI/CD パイプラインのコード、実行されるインフラストラクチャーの構築コードなどアプリケーションコード以外のコードも含まれます。

ソフトウェアサプライチェーンのセキュリティ対策として、既知の脆弱性に対するパッチ適用があり、これらは GitHub の Dependabot のようなサービスでかなりの部分が自動化されています。

ソフトウェアサプライチェーンに対する攻撃は、パッケージレジストリから取得したコンポーネントが、そのソフトウェアの作者が実際に作成しリポジトリにプッシュしたコードに由来することが必ずしも保証されていない点を利用します。改ざんされ、正規のビルドや CI/CD パイプラインを経由せずチェックインされたものである可能性があります。

## コンテナイメージへの署名を可能にする Publish Docker Container ワークフロー
この危険性を防止する手段として、OSS 開発者が成果物に署名して利用者が署名を検証可能にするという方法が考えられます。

昨年、GitHub はコンテナイメージの利用者が検証できる署名を付与することができる GitHub Actions ワークフローの雛形を提供しました。

[Safeguard your containers with new container signing capability in GitHub Actions | The GitHub Blog](https://github.blog/2021-12-06-safeguard-container-signing-capability-actions/)

Dockerfile を含むリポジトリへのワークフロー追加時にサジェストされる Publish Docker Container ワークフローを使うことでコンテナイメージに署名するワークフローを簡単に構築できます。

![Publish Docker Container action](https://i.gyazo.com/04c85772c58eb940ff28aa5b6d86c908.png)

これは以下のリポジトリで管理されるスターターワークフローです。

[GitHub - actions/starter-workflows: Accelerating new GitHub Actions workflows](https://github.com/actions/starter-workflows)

ワークフローのコードは以下にあります。

[starter-workflows/docker-publish.yml at main · actions/starter-workflows](https://github.com/actions/starter-workflows/blob/main/ci/docker-publish.yml)

ワークフローの定義を抜粋します。コンテナレジストリへのログインのステップは省略しています[^1]。

[^1]: サードパーティ製 Action を使用していることから、Action の更新による挙動変更を避けるため、コミットハッシュを指定して Action をチェックアウト・実行するようになっています。

```yaml
name: Docker

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

jobs:
  build:

    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v3

      # Install the cosign tool except on PR
      - name: Install cosign
        if: github.event_name != 'pull_request'
        uses: sigstore/cosign-installer@7e0881f8fe90b25e305bbf0309761e9314607e25
        with:
          cosign-release: 'v1.9.0'

      # Login against a Docker registry except on PR

      # Build and push Docker image with Buildx (don't push on PR)
      - name: Build and push Docker image
        id: build-and-push
        uses: docker/build-push-action@ac9327eae2b366085ac7f6a2d02df8aa8ead720a
        with:
          context: .
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}

      # Sign the resulting Docker image digest except on PRs.
      # This will only write to the public Rekor transparency log when the Docker
      # repository is public to avoid leaking data.  If you would like to publish
      # transparency data even for private images, pass --force to cosign below.
      # https://github.com/sigstore/cosign
      - name: Sign the published Docker image
        if: ${{ github.event_name != 'pull_request' }}
        env:
          COSIGN_EXPERIMENTAL: "true"
        # This step uses the identity token to provision an ephemeral certificate
        # against the sigstore community Fulcio instance.
        run: echo "${{ steps.meta.outputs.tags }}" | xargs -I {} cosign sign {}@${{ steps.build-and-push.outputs.digest }}
```

通常の docker build / push に加えて以下のステップが追加されています。

- イメージに署名をするための Sigstore Cosign をインストール
- 公開したイメージに署名を追加(実験的な実装であるパスワードレス署名を使用)

PR 作成以外のトリガーでワークフローが実行されると、コンテナイメージのビルド・プッシュ時のダイジェストに署名してイメージに添付します。パスワードレス署名は環境変数 `COSIGN_EXPERIMENTAL` を有効化することで利用可能になります。

実際に、Dockerfile をリポジトリに含めて上記のワークフローを実行し、GitHub のコンテナレジストリに署名付きイメージをプッシュしてみました。ワークフローの実行ログです。Cosign がインストールされ、プッシュされたイメージに署名が行われたことがわかります。

![ワークフロー実行ログ](https://i.gyazo.com/dcd77028c6e96b254fd59853bcbbabf7.png)

署名付きのイメージがコンテナレジストリに登録されました。

![署名付きイメージ](https://i.gyazo.com/ac06b108988006c19763d2b4de041e86.png)

パスワードレス署名ではなく自前で秘密鍵と公開鍵のペアを生成管理して署名に使用することも可能ですが、長期間開発を続けていくソフトウェアでは、その管理が問題になります。OIDC トークンにより発行されたエフェメラルな証明書を使って署名することで、GitHub 提供のランナーで実行している限りは証明書の管理が不要なワークフローになっています[^2]。

[^2]: セルフホストランナーで実行しても署名の正当性が保証されないことには注意が必要です。

署名に使われている Sigstore Cosign で署名の検証をしてみます。Go 開発環境があれば　go install でインストール可能です。

```shell
go install github.com/sigstore/cosign/cmd/cosign@latest
```

事前に、Docker Desktop など docker CLI が使える環境で ghcr.io にログインしておきます。レジストリの読み取り権のある Personal Access Token を生成して使用します。

```shell
PAT=<YOUR_PERSONAL_ACCESS_TOKEN>
USER=<your_account>
echo $PAT | docker login ghcr.io -u $USER --password-stdin
```

ワークフロー同様、環境変数で `COSIGN_EXPERIMENTAL` を有効にして cosign verify コマンドを実行します。

```shell
COSIGN_EXPERIMENTAL=1 cosign verify ghcr.io/kondoumh/deno-container:v0.1.0 | jq .
```

```
Verification for ghcr.io/kondoumh/deno-container:v0.1.0 --
The following checks were performed on each of these signatures:
  - The cosign claims were validated
  - Existence of the claims in the transparency log was verified offline
  - Any certificates were verified against the Fulcio roots.
[
  {
    "critical": {
      "identity": {
        "docker-reference": "ghcr.io/kondoumh/deno-container"
      },
      "image": {
        "docker-manifest-digest": "sha256:9d9b85ed94925a85df9f06f781f4379af2d63f5bf8b345731ecf6c8ab378f53a"
      },
      "type": "cosign container image signature"
    },
    "optional": {
      "1.3.6.1.4.1.57264.1.2": "push",
      "1.3.6.1.4.1.57264.1.3": "61b084f90d26d1cfe1e6589bd30b2e39cc119c1a",
      "1.3.6.1.4.1.57264.1.4": "Docker",
      "1.3.6.1.4.1.57264.1.5": "kondoumh/deno-container",
      "1.3.6.1.4.1.57264.1.6": "refs/tags/v0.1.0",
      "Bundle": {
        "SignedEntryTimestamp": "MEYCIQDWMPovvUmSlVeBL3hKAft0qLMQH9iyistdUQX2hsXpEgIhAJ1yrY7OL86MLPUIFWL/7Kw7QRFWxfVnR5+mvb4S5Qu5",
        "Payload": {
          "body": "eyJhcGlWZXJzaW9uIjoiMC4wLjEiLCJraW5kIjoiaGFzaGVkc...",
          "integratedTime": 1660576876,
          "logIndex": 3187780,
          "logID": "c0d23d6ad406973f9559f3ba2d1ca01f84147d8ffc5b8445c224f98b9591801d"
        }
      },
      "Issuer": "https://token.actions.githubusercontent.com",
      "Subject": "https://github.com/kondoumh/deno-container/.github/workflows/docker-publish.yml@refs/tags/v0.1.0"
    }
  }
]
```

署名されたコンテナイメージのクレームとして、リポジトリ名、コミットハッシュ、ワークフロー名とトリガー、対象のタグ、OIDC Token の発行者が、GitHub のものであることなどが検証されました。

![検証されたクレーム](https://i.gyazo.com/6eab370d3b8a3fa6103362ca565ea9de.png)

実際に docker pull すると Digest とも一致しています。

```shell
$ docker pull ghcr.io/kondoumh/deno-container:v0.1.0 

v0.1.0: Pulling from kondoumh/deno-container
59ce1b6c0c82: Pull complete
b409c372dbf2: Pull complete
cffb2f600bdc: Pull complete
Digest: sha256:9d9b85ed94925a85df9f06f781f4379af2d63f5bf8b345731ecf6c8ab378f53a
Status: Downloaded newer image for ghcr.io/kondoumh/deno-container:v0.1.0
ghcr.io/kondoumh/deno-container:v0.1.0
```

以上のように、コンテナイメージに添付された署名により、コードが存在するリポジトリ、ビルド履歴などを利用者が確認して使うことが可能になっています。

## Sigstore が提供するテクノロジー

[Sigstore](https://www.sigstore.dev/) は、上記のワークフローで使用される、署名と検証の一連の作業を支援するシステムを提供しています。

- [Cosign](https://github.com/sigstore/cosign): コンテナと OCI レジストリの署名と検証に使う CLI
- [Fulcio](https://github.com/sigstore/fulcio):　OIDC から署名に使う短命な証明書を利用可能にするルート CA
- [Rekor](https://github.com/sigstore/rekor): (コンテナイメージのような)ソフトウェア成果物の出所を検証できる署名イベントのログ('Record'のギリシャ語に由来)

これにより開発者は CI/CD パイプラインを通してコンテナイメージへに署名でき、独自の秘密鍵を管理することから解放されます。Rekor の公開透明性ログには、GitHub　のユーザー名、オーガニゼーション名、リポジトリ名、ワークフロー名が出力され公開されます[^3]。

[^3]: private リポジトリでは、リポジトリ名の漏洩を防ぐためにデフォルトで無効化されており、--force オプションを付けることで出力されます。

## Go モジュールに署名可能な SLSA Go Releaser ワークフロー

今年4月に Go のバイナリにも署名できる SLSA Go Releaser がワークフローの雛形として提供されています。

[Achieving SLSA 3 Compliance with GitHub Actions and Sigstore for Go modules | The GitHub Blog](https://github.blog/2022-04-07-slsa-3-compliance-with-github-actions/)

Go のプロジェクトにワークフローを追加する時にサジェストされるようになっています。

![SLSA Go releaser ワークフローテンプレート](https://i.gyazo.com/35e328b05b5b4ed6f7f8f8c8b9182373.png)

このワークフローは、リリースページの作成をトリガーとして実行され、ビルドしたバイナリと署名時 Rekor に保存された出所データ(provenance)をリリースページにアップロードします。

```yaml
name: SLSA Go releaser
on:
  release:
    types: [created]

permissions: read-all

jobs:
  build:
    permissions:
      id-token: write # To sign.
      contents: write # To upload release assets.
      actions: read   # To read workflow path.
    uses: slsa-framework/slsa-github-generator/.github/workflows/builder_go_slsa3.yml@v1.2.0
    with:
      go-version: 1.17
```

:::info
このワークフローは、slsa-framework/slsa-github-generator リポジトリにある再利用可能ワークフローを使って Go のバイナリをビルドします。再利用可能ワークフローについては、以下の記事で紹介しています。
- [GitHub Actions - 再利用可能ワークフローを使う](/blogs/2022/03/08/github-actions-reuse-workflows/)
- [GitHub Actions - 再利用可能ワークフローと手動トリガーで入力値の扱いを統一](/blogs/2022/06/11/github-actions-inputs-unified/)
:::

ワークフローの利用手順は以下の README に書かれています。

[slsa-github-generator/README.md at main · slsa-framework/slsa-github-generator](https://github.com/slsa-framework/slsa-github-generator/blob/main/internal/builders/go/README.md)

プロジェクトのルートに以下のような YAML ファイルを `.slsa-goreleaser.yml` という名前で作成します。主に Go のターゲットプラットフォームやバイナリの名前などを指定しています。

{% raw %}
```yaml
# Version for this file.
version: 1

# (Optional) List of env variables used during compilation.
env:
  - GO111MODULE=on
  - CGO_ENABLED=0

# (Optional) Flags for the compiler.
flags:
  - -trimpath
  - -tags=netgo

# The OS to compile for. `GOOS` env variable will be set to this value.
goos: linux

# The architecture to compile for. `GOARCH` env variable will be set to this value.
goarch: amd64

# (Optional) Entrypoint to compile. (Optional)
# main: ./path/to/main.go

# (Optional) Working directory. (default: root of the project)
# dir: /path/to/dir

# Binary output name.
# {{ .Os }} will be replaced by goos field in the config file.
# {{ .Arch }} will be replaced by goarch field in the config file.
binary: gocli-example-{{ .Os }}-{{ .Arch }}

# (Optional) ldflags generated dynamically in the workflow, and set as the `evaluated-envs` input variables in the workflow.
# ldflags:
#   - "-X main.Version={{ .Env.VERSION }}"
#   - "-X main.Commit={{ .Env.COMMIT }}"
#   - "-X main.CommitDate={{ .Env.COMMIT_DATE }}"
#   - "-X main.TreeState={{ .Env.TREE_STATE }}"
```
{% endraw %}

Go の 簡単な CLI のプロジェクトを作り、この SLSA Go Releaser ワークフローと `.slsa-goreleaser.yml` を追加しました。

[GitHub - kondoumh/gocli-example](https://github.com/kondoumh/gocli-example)

タグを作成してリリースページを作ると、ワークフローが実行され、リリースページにバイナリファイルと JSONL 形式の provenance ファイルがアップロードされました。

![リリースページ](https://i.gyazo.com/bf4b2de49c2ed3fb478c150e136a30e9.png)

バイナリと provenance の検証には、SLSA Framework で提供されている slsa-verifier を使用します[^4]。

[^4]: slsa-verifier は Cosign を内部的に利用しています。

slsa-verifier インストールします。

```shell
go install github.com/slsa-framework/slsa-verifier@v1.2.0
```

リリースページの2つのファイルをダウンロードして検証します。

```shell
slsa-verifier \
     --artifact-path ./gocli-example-linux-amd64 \
     --provenance ./gocli-example-linux-amd64.intoto.jsonl \
     --source github.com/kondoumh/gocli-example \
     --branch "main" \
     --tag v0.1.0
```

```
Verified signature against tlog entry index 3192769 at URL: https://rekor.sigstore.dev/api/v1/log/entries/f8fc0f9e6d3df0a64a449c37d64dc637811f0398d4e10d9042e151eed7fdb539
Verified build using builder https://github.com/slsa-framework/slsa-github-generator/.github/workflows/builder_go_slsa3.yml@refs/tags/v1.2.0 at commit d92af3fcbe107867817eba3fda26794158597540
PASSED: Verified SLSA provenance
```

検証成功しました。

provenance ファイルには証明書が含まれています。

```
{
  "payloadType": "application/vnd.in-toto+json",
  "payload": "eyJfdHlwZSI6Imh0...",
  "signatures": [
    {
      "keyid": "",
      "sig": "MEYCIQCOvwJC9tQFGuM8cArhT2uwXx67gkf5Dj0+BsU2j/rLLgIhAJChPpxOFWpTDQaEQY5J+LmEathpIyHr82Dz2X6oECde",
      "cert": "-----BEGIN CERTIFICATE-----\nMIIDNDCCArqgAwIBAgIUANXSqmg3LncvqGOxHK9TaRC6KCYwCgYIKoZIzj0EAwMw\nKjEVMBMGA1UEChMMc2lnc3RvcmUuZGV2MREwDwYDVQQDEwhzaWdzdG9yZTAeFw0y\nMjA4MTYwNTE2NTRaFw0yMjA4MTYwNTI2NTNaMAAwWTATBgcqhkjOPQIBBggqhkjO\nPQMBBwNCAASYz6Doa+x2u92atNc/KMJUk8FiuouKYuRvUNgNfdOaAK3LUL0iT874\nwK1CHRH7PARUwy9GsxhprDcKRFvfg9Vuo4IB5jCCAeIwDgYDVR0PAQH/BAQDAgeA\nMBMGA1UdJQQMMAoGCCsGAQUFBwMDMAwGA1UdEwEB/wQCMAAwHQYDVR0OBBYEFHH7\nhY2zb3aIIVOROg3hEQ+SBDQAMB8GA1UdIwQYMBaAFFjAHl+RRaVmqXrMkKGTItAq\nxcX6MH0GA1UdEQEB/wRzMHGGb2h0dHBzOi8vZ2l0aHViLmNvbS9zbHNhLWZyYW1l\nd29yay9zbHNhLWdpdGh1Yi1nZW5lcmF0b3IvLmdpdGh1Yi93b3JrZmxvd3MvYnVp\nbGRlcl9nb19zbHNhMy55bWxAcmVmcy90YWdzL3YxLjIuMDA2BgorBgEEAYO/MAED\nBChkOTJhZjNmY2JlMTA3ODY3ODE3ZWJhM2ZkYTI2Nzk0MTU4NTk3NTQwMDkGCisG\nAQQBg78wAQEEK2h0dHBzOi8vdG9rZW4uYWN0aW9ucy5naXRodWJ1c2VyY29udGVu\ndC5jb20wHgYKKwYBBAGDvzABBAQQU0xTQSBHbyByZWxlYXNlcjAkBgorBgEEAYO/\nMAEFBBZrb25kb3VtaC9nb2NsaS1leGFtcGxlMBUGCisGAQQBg78wAQIEB3JlbGVh\nc2UwHgYKKwYBBAGDvzABBgQQcmVmcy90YWdzL3YwLjEuMDAKBggqhkjOPQQDAwNo\nADBlAjEA+H0VAjDDYlxvso+M13ulxEUhqcNm1CGbSRGxNZ2vgeyPTZk0ffKjjhHg\nnY8bgDnZAjA9hdF8CyLciG2aFA+emnXtteK2AcPJ2sldULYFXTcVzcF9IdzFsoeq\n+4yfhF3fgPY=\n-----END CERTIFICATE-----\n"
    }
  ]
}
```

この証明書をファイルに保存して OpenSSL で検証してみます。

```shell
openssl x509 -text -noout -in hoge.crt
```

```
Certificate:
    Data:
        Version: 3 (0x2)
        Serial Number:
            d5:d2:aa:68:37:2e:77:2f:a8:63:b1:1c:af:53:69:10:ba:28:26
    Signature Algorithm: ecdsa-with-SHA384
        Issuer: O=sigstore.dev, CN=sigstore
        Validity
            Not Before: Aug 16 05:16:54 2022 GMT
            Not After : Aug 16 05:26:53 2022 GMT
        Subject: 
        Subject Public Key Info:
            Public Key Algorithm: id-ecPublicKey
                Public-Key: (256 bit)
                pub: 
                    04:98:cf:a0:e8:6b:ec:76:bb:dd:9a:b4:d7:3f:28:
                    c2:54:93:c1:62:ba:8b:8a:62:e4:6f:50:d8:0d:7d:
                    d3:9a:00:ad:cb:50:bd:22:4f:ce:f8:c0:ad:42:1d:
                    11:fb:3c:04:54:c3:2f:46:b3:18:69:ac:37:0a:44:
                    5b:df:83:d5:6e
                ASN1 OID: prime256v1
                NIST CURVE: P-256
        X509v3 extensions:
            X509v3 Key Usage: critical
                Digital Signature
            X509v3 Extended Key Usage: 
                Code Signing
            X509v3 Basic Constraints: critical
                CA:FALSE
            X509v3 Subject Key Identifier: 
                71:FB:85:8D:B3:6F:76:88:21:53:91:3A:0D:E1:11:0F:92:04:34:00
            X509v3 Authority Key Identifier: 
                keyid:58:C0:1E:5F:91:45:A5:66:A9:7A:CC:90:A1:93:22:D0:2A:C5:C5:FA

            X509v3 Subject Alternative Name: critical
                URI:https://github.com/slsa-framework/slsa-github-generator/.github/workflows/builder_go_slsa3.yml@refs/tags/v1.2.0
            1.3.6.1.4.1.57264.1.3: 
                d92af3fcbe107867817eba3fda26794158597540
            1.3.6.1.4.1.57264.1.1: 
                https://token.actions.githubusercontent.com
            1.3.6.1.4.1.57264.1.4: 
                SLSA Go releaser
            1.3.6.1.4.1.57264.1.5: 
                kondoumh/gocli-example
            1.3.6.1.4.1.57264.1.2: 
                release
            1.3.6.1.4.1.57264.1.6: 
                refs/tags/v0.1.0
    Signature Algorithm: ecdsa-with-SHA384
         30:65:02:31:00:f8:7d:15:02:30:c3:62:5c:6f:b2:8f:8c:d7:
         7b:a5:c4:45:21:a9:c3:66:d4:21:9b:49:11:b1:35:9d:af:81:
         ec:8f:4d:99:34:7d:f2:a3:8e:11:e0:9d:8f:1b:80:39:d9:02:
         30:3d:85:d1:7c:0b:22:dc:88:6d:9a:14:0f:9e:9a:75:ed:b5:
         e2:b6:01:c3:c9:da:c9:5d:50:b6:05:5d:37:15:cd:c1:7d:21:
         dc:c5:b2:87:aa:fb:8c:9f:84:5d:df:80:f6
```

`X509v3 Subject Alternative Name` にリポジトリの情報やビルダー、ワークフローの情報が記載されています。

![証明書](https://i.gyazo.com/e4eb92eec5a55b683db2489b35453aaf.png)

:::info
SLSA とは Supply-chain Levels for Software Artifacts というフレームワークで、開発ライフサイクル全体でのソフトウェア成果物の end-to-end の整合性を向上させることを目的にNIST(アメリカ国立標準技術研究所)によって構築されたものです。
:::

## まとめ
以上、コンテナイメージや、Go アプリケーションに 成果物の出所を検証可能な署名を付与するワークフローを利用してみました。

今月 GitHub では、Sigstore を用いて NPM のセキュリティを改善するための RFC をオープンにしました。NPM にも Sigstore による署名が適用される流れになりそうです。

[New request for comments on improving npm security with Sigstore is now open | The GitHub Blog](https://github.blog/2022-08-08-new-request-for-comments-on-improving-npm-security-with-sigstore-is-now-open/)

[rfcs/0000-link-packages-to-source-and-build.md at link-packages-to-source-and-build · npm/rfcs](https://github.com/npm/rfcs/blob/link-packages-to-source-and-build/accepted/0000-link-packages-to-source-and-build.md)

ソフトウェアサプライチェーンのセキュリティについては、従来の脆弱性パッチ適用に加え、レジストリやCI/CD パイプラインなどの出所情報を透明性のあるログとして保存し誰もが検証可能な状態にすることが求められる時代になっていくことが予想されます。

---
参考

- [Linux Foundation Sigstoreがコード署名の暗号化を目指す](https://www.infoq.com/jp/news/2021/05/sigstore-crypto-supply-chain/)
- [改ざんできないビルドでソフトウェア サプライ チェーンのセキュリティを改善する](https://developers-jp.googleblog.com/2022/05/improving-software-supply-chain.html)
- [General Availability of SLSA 3 Go native builder for GitHub Actions](https://slsa.dev/blog/2022/06/slsa-github-workflows)
