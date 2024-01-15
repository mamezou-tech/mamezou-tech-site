---
title: GitHub Octokit の新しい生成ベースの SDK を使ってみる
author: masahiro-kondo
date: 2024-01-15
tags: [GitHub]
image: true
---

## はじめに

GitHub は WebUI だけでなく多くの API が提供されており、リポジトリのファイルや issue などの情報を API 経由で取得・更新できます。また、多くのプログラミング言語から GitHub の API を利用するための API クライアント [Octokit](https://github.com/octokit) も提供されています。筆者も JavaScript 版の Octokit はリリース作業の自動化などで何度かお世話になっています。

先日 Octokit が生成ベースの SDK に移行するという発表がありました。

[Our move to generated SDKs](https://github.blog/2024-01-03-our-move-to-generated-sdks/)

Microsoft の Kiota という OpenAPI で記述された API のクライアントを生成する CLI ツールを利用して SDK を生成するようです。生成ベースに移行することで、SDK への新機能の提供を早くすることが可能とのことです。

[GitHub - microsoft/kiota: OpenAPI based HTTP Client code generator](https://github.com/microsoft/kiota)

新しい SDK のリポジトリとして、Go SDK と .NET SDK が公開されています。

[GitHub - octokit/go-sdk: A generated Go SDK from GitHub&#39;s OpenAPI specification.](https://github.com/octokit/go-sdk)

[GitHub - octokit/dotnet-sdk](https://github.com/octokit/dotnet-sdk)

## Go SDK
Go SDK をインストールしてサンプルを動かしてみます。

筆者の環境では、Go の v1.20.4 が入っていました。

```shell
$ go version
go version go1.20.4 darwin/arm64
```

まず、プロジェクトを作成します。

```shell
mkdir hello-go-sdk && cd hello-go-sdk
go mod init
```

プロジェクトに main.go ファイルを追加し、以下のコードを書きます。Octocat のアスキーアートを取得する API を呼び出しています。

```go
package main

import (
	"context"
	"fmt"
	"log"

	abstractions "github.com/microsoft/kiota-abstractions-go"
	http "github.com/microsoft/kiota-http-go"
	auth "github.com/octokit/go-sdk/pkg/authentication"
	"github.com/octokit/go-sdk/pkg/github"
	"github.com/octokit/go-sdk/pkg/github/octocat"
)

func main() {
	tokenProvider := auth.NewTokenProvider(
		auth.WithUserAgent("octokit-study/hello-go-sdk"),
	)
	adapter, err := http.NewNetHttpRequestAdapter(tokenProvider)
	if err != nil {
		log.Fatalf("Error creating request adapter: %v", err)
	}

	client := github.NewApiClient(adapter)

	s := "Hello Octokit Go SDK"

	headers := abstractions.NewRequestHeaders()
	_ = headers.TryAdd("Accept", "application/vnd.github.v3+json")

	octocatRequestConfig := &octocat.OctocatRequestBuilderGetRequestConfiguration{
		QueryParameters: &octocat.OctocatRequestBuilderGetQueryParameters{
			S: &s,
		},
		Headers: headers,
	}
	cat, err := client.Octocat().Get(context.Background(), octocatRequestConfig)
	if err != nil {
		log.Fatalf("error getting octocat: %v", err)
	}
	fmt.Printf("%v\n", string(cat))
}
```

パッケージをインストールします。

```shell
go mod tidy
```

コードを実行します。

```shell
go run main.go
```

無事レスポンスを取得できました。

```
               MMM.           .MMM
               MMMMMMMMMMMMMMMMMMM
               MMMMMMMMMMMMMMMMMMM      ______________________
              MMMMMMMMMMMMMMMMMMMMM    |                      |
             MMMMMMMMMMMMMMMMMMMMMMM   | Hello Octokit Go SDK |
            MMMMMMMMMMMMMMMMMMMMMMMM   |_   __________________|
            MMMM::- -:::::::- -::MMMM    |/
             MM~:~ 00~:::::~ 00~:~MM
        .. MMMMM::.00:::+:::.00::MMMMM ..
              .MM::::: ._. :::::MM.
                 MMMM;:::::;MMMM
          -MM        MMMMMMM
          ^  M+     MMMMMMMMM
              MMMMMMM MM MM MM
                   MM MM MM MM
                   MM MM MM MM
                .~~MM~MM~MM~MM~~.
             ~~~~MM:~MM~~~MM~:MM~~~~
            ~~~~~~==~==~~~==~==~~~~~~
             ~~~~~~==~==~==~==~~~~~~
                 :~==~==~==~==~~
```

## .NET SDK
次に .NET SDK も試してみます。

利用するには .NET 8.0 のインストールが必要です。

[.NET 8.0 (Linux&#x3001;macOS&#x3001;Windows) &#x3092;&#x30C0;&#x30A6;&#x30F3;&#x30ED;&#x30FC;&#x30C9;&#x3059;&#x308B;](https://dotnet.microsoft.com/ja-jp/download/dotnet/8.0)

筆者は、macOS の Arm64 のインストーラーをダウンロードして利用しました。

```shell
$ dotnet --version
8.0.100
```

コンソールアプリのプロジェクトを作成します。

```shell
dotnet new console -n HelloDotnetSdk
```

プロジェクトに Octkit.NET.SDK をインストールします。

```shell
cd HelloDotnetSDK
dotnet add package Octokit.NET.SDK
```

パッケージがダウンロードされ、HelloDotnetSdk.csproj に以下のようにパッケージ参照が追加されます。

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <!-- 中略 -->

  <ItemGroup>
    <PackageReference Include="Octokit.NET.SDK" Version="0.0.4" />
  </ItemGroup>

</Project>
```

Program.cs に以下のようなコードを書きます。リポジトリを指定してプルリクエストのリストを取得して一覧表示しています。

```cs
using GitHub;
using GitHub.Client;
using GitHub.Authentication;

var token = Environment.GetEnvironmentVariable("GITHUB_TOKEN") ?? "";
var request = RequestAdapter.Create(new TokenAuthenticationProvider("Octokit.Gen", token));
var gitHubClient = new GitHubClient(request);

var pullRequests = await gitHubClient.Repos["octokit"]["octokit.net"].Pulls.GetAsync();

foreach (var pullRequest in pullRequests)
{
    Console.WriteLine($"#{pullRequest.Number} {pullRequest.Title}");
}
```

:::info
コンソールアプリのプロジェクトに `class Program` とか `static void Main(string[] args)` とか書かなくてよくなっているんですね。.NET 6 で変更されたようです。

[.NET 6+ での C# コンソール アプリ テンプレートの変更 - .NET](https://learn.microsoft.com/ja-jp/dotnet/core/tutorials/top-level-templates)
:::

GitHub の PAT を環境変数 `GITHUB_TOKEN` に指定して、プログラムを実行します。

```shell
export GITHUB_TOKEN=your-personal-access-token
dotnet run Program.cs
```

```
#2849 build(deps): bump xunit from 2.6.4 to 2.6.5
#2847 [feat] Add Rocket & Eyes reactions to `ReactionSummary`
#2844 Fixes PushId datatype to not overflow (fix user activity exception)
#2787 Rate Limit Handling
#2686 Variables API
```

無事に取得できました。

## さいごに
以上、OctoKit が生成ベースの SDK に移行するということで Go SDK と .NET SDK を使ってみました。

まだバージョンが若いので正式リリースは当面先だと思いますが JavaScript 版が出たら使ってみたいと思います。

Octokit/Rest については生成ベースになりますが、GraphQL に関してはどのような扱いになるのか気になるところです。
