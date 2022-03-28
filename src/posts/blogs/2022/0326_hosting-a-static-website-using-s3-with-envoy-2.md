---
title: S3 の静的 Web サイトをセキュアに Envoy でホスティング 
author: shigeki-shoji
date: 2022-03-26
tags: [aws]
---

モダンな UI のフレームワークは静的なコンテンツとしてパッケージングされることが主流となっています。これは変化の激しい UI とそれと比較すれば比較的変化のスピードが遅くてよいバックエンドとの関係で理にかなっています。UI のこうした静的なコンテンツの配信では多くの SaaS 製品で CloudFront のような CDN が利用されています。しかし、エンタープライズで利用されるフロントエンドの場合には VPN を通じたアクセスのみを許可している場合が多くあります。このような場合にまで世界中の多数のユーザに低レイテンシーな配信を目的としている CDN を利用することは本来の用途外であるというだけでなく、セキュリティ要件のために CDN の利点を失わせる方向で無用な修正やオーバーヘッドを加えることにもつながります。

2022年2月16日の前回の記事「[S3 の静的 Web サイトを Envoy でホスティング](https://developer.mamezou-tech.com/blogs/2022/02/16/hosting-a-static-website-using-s3-with-envoy/)」では、説明を簡略化するために S3 バケットのパブリックアクセスを有効にして [Envoy proxy](https://www.envoyproxy.io/) を使った S3 上の静的コンテンツのホスティングについて説明しました。

この記事でも、本来はパブリックアクセスを許可せず、VPC 内に閉じて運用すると説明したものの、そのための方法について踏み込むことはしませんでした。

そこで、今回は、VPC 内で Envoy proxy のコンテナイメージを [AWS Fargate](https://aws.amazon.com/fargate/) で実行するようにし、[Amazon S3](https://aws.amazon.com/s3/) へのアクセスには、[AWS PrivateLink](https://aws.amazon.com/privatelink/) の VPC エンドポイント (Gateway) を利用することで通信をインターネットに公開しないようにした構成で説明します。

ブラウザから VPC 内のこれらリソースにアクセスするために、[Application Load Balancer](https://aws.amazon.com/elasticloadbalancing/application-load-balancer/) を利用することとします。

これらから、構成は図のようになります:

![](https://github.com/takesection-sandbox/envoyproxy-examples/blob/main/image/envoy-s3-fargate.png?raw=true)

このように構成した場合、S3 バケットへのアクセスは他の AWS サービスの API を利用する場合と同様になります。つまり、Fargate の [TaskRole](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html) など IAM を使ったアクセスポリシーが有効になります。

S3 バケットへのアクセスには、IAM の認証情報を使った署名が必要になりますが、Envoy proxy には [AWS Request Signing](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/aws_request_signing_filter) という、署名をするフィルターが含まれています。

このフィルターを利用する設定例は次のようになります:

```yaml
  - name: envoy.filters.http.aws_request_signing
    typed_config:
      '@type': type.googleapis.com/envoy.extensions.filters.http.aws_request_signing.v3.AwsRequestSigning
      service_name: s3
      region: ${AWS_REGION} 
      use_unsigned_payload: true
      host_rewrite: ${BUCKET_URL}
```

前の記事では、ホスト名のリライトもルート設定で行っていましたが、署名時にリライト後のホスト名が必要なため、ルート設定で行っていたリライトはやめて、署名フィルターでリライトするようにしています。

また、インデックスアクセス (URL の末尾が '/' となるアクセス) のパスもルート (route) 設定で `regex_rewrite` を使って `index.html` にリライトしていました。ただし、そうすると、署名時のパス (path) と実際の S3 バケットのパスが異なることになり、署名の検証に失敗してしまいます。

これを回避するため、ルート設定での `regex_rewrite` の使用をやめて、署名フィルターの前にパスをリライトするために Lua スクリプトを使う[フィルター](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter)を追加しました:

```yaml
  - name: envoy.filters.http.lua
    typed_config:
      '@type': type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
      inline_code: |
        function envoy_on_request(request_handle)
          path = request_handle:headers():get(":path"):gsub("/$", "/index.html")
          request_handle:headers():replace(":path", path)
        end
```

ここで紹介した[設定ファイル](https://github.com/takesection-sandbox/envoyproxy-examples/blob/main/front-proxy-s3/docker/front-envoy.tmp)、Fargate 上で実行するためのコンテナイメージ用の [Dockerfile](https://github.com/takesection-sandbox/envoyproxy-examples/blob/main/front-proxy-s3/Dockerfile)、図の構成を構築する [Cloudformation テンプレート](https://github.com/takesection-sandbox/envoyproxy-examples/blob/main/front-proxy-s3/aws-cloudformation/cloudformation.yaml) 等の全体は [GitHub リポジトリ](https://github.com/takesection-sandbox/envoyproxy-examples/tree/main/front-proxy-s3) にあります。

# まとめ

この一連の記事では、Envoy proxy を静的に設定していますが、[AWS App Mesh](https://aws.amazon.com/app-mesh/) や [Istio](https://istio.io/latest/about/service-mesh/) などのサービスメッシュ製品が持つコントロールプレーンによる構成やファイルを使用する[動的構成](https://www.envoyproxy.io/docs/envoy/latest/start/quick-start/configuration-dynamic-filesystem) を採用することもできます。このような動的な構成 (configuration) を採用することで、Envoy proxy の再起動を必要とせず、設定変更を反映させることができます ([Feature Toggle](https://martinfowler.com/articles/feature-toggles.html)、A/B テスト、Blue/Green デプロイ、カナリアなどに対応できることを意味します)。

Envoy proxy にはさまざまな機能があります。フィルターの[ページ](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/http_filters)だけをみても、[AWS Lambda](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/aws_lambda_filter) を呼ぶようなものまであります。

# 参考

* [EnvoyをFront Proxyとして利用する](https://tech.uzabase.com/entry/2020/09/28/140046)
* [S3 の静的 Web サイトを Envoy でホスティング](https://developer.mamezou-tech.com/blogs/2022/02/16/hosting-a-static-website-using-s3-with-envoy/)
* [Envoy を使用して ID Token (OIDC) を検証する](https://developer.mamezou-tech.com/blogs/2022/02/20/envoy-authn/)
* [Envoy と Open Policy Agent を使用した認可](https://developer.mamezou-tech.com/blogs/2022/02/20/envoy-authz/)
* [Envoy Docs](https://www.envoyproxy.io/docs/envoy/latest/about_docs)
    * [HTTP route components](https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto#config-route-v3-routeaction)
    * [AWS Request Signing](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/aws_request_signing_filter) 
    * [Lua](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter)

