---
title: Trying Out the New Generation-Based SDK for GitHub Octokit
author: masahiro-kondo
date: 2024-01-15T00:00:00.000Z
tags:
  - GitHub
image: true
translate: true

---

:::info
To reach a broader audience, this article has been translated from Japanese.
You can find the original version [here](https://developer.mamezou-tech.com/blogs/2024/01/15/octokit-move-to-generated-sdk/).
:::



## Introduction

GitHub not only offers a WebUI but also provides many APIs, allowing you to retrieve and update information such as repository files and issues via API. Additionally, API clients for using GitHub's API from many programming languages, [Octokit](https://github.com/octokit), are also available. I have used the JavaScript version of Octokit several times for automating release processes.

Recently, there was an announcement about Octokit transitioning to a generation-based SDK.

[Our move to generated SDKs](https://github.blog/2024-01-03-our-move-to-generated-sdks/)

It seems that the SDK will be generated using Microsoft's Kiota, a CLI tool for generating API clients from APIs described in OpenAPI. Moving to a generation-based approach allows for faster provision of new features to the SDK.

[GitHub - microsoft/kiota: OpenAPI based HTTP Client code generator](https://github.com/microsoft/kiota)

As new SDK repositories, Go SDK and .NET SDK have been released.

[GitHub - octokit/go-sdk: A generated Go SDK from GitHub's OpenAPI specification.](https://github.com/octokit/go-sdk)

[GitHub - octokit/dotnet-sdk](https://github.com/octokit/dotnet-sdk)

## Go SDK
Let's install the Go SDK and run a sample.

In my environment, Go v1.20.4 was installed.

```shell
$ go version
go version go1.20.4 darwin/arm64
```

First, create a project.

```shell
mkdir hello-go-sdk && cd hello-go-sdk
go mod init
```

Add a main.go file to the project and write the following code. It calls an API to get an ASCII art of Octocat.

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

Install the packages.

```shell
go mod tidy
```

The go.mod file specified the dependent libraries as follows.

```
require (
	github.com/microsoft/kiota-abstractions-go v1.5.3
	github.com/microsoft/kiota-http-go v1.1.1
	github.com/octokit/go-sdk v0.0.4
)
```

Execute the code.

```shell
go run main.go
```

Successfully received the response.

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
Next, let's try the .NET SDK.

You need to install .NET 8.0.

[Download .NET 8.0 (Linux, macOS, Windows)](https://dotnet.microsoft.com/ja-jp/download/dotnet/8.0)

I downloaded and used the macOS Arm64 installer.

```shell
$ dotnet --version
8.0.100
```

Create a console app project.

```shell
dotnet new console -n HelloDotnetSdk
```

Install Octokit.NET.SDK to the project.

```shell
cd HelloDotnetSDK
dotnet add package Octokit.NET.SDK
```

The package is downloaded, and the package reference is added to HelloDotnetSdk.csproj as follows.

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <!-- Omitted for brevity -->

  <ItemGroup>
    <PackageReference Include="Octokit.NET.SDK" Version="0.0.4" />
  </ItemGroup>

</Project>
```

Write the following code in Program.cs. It specifies a repository and retrieves and displays a list of pull requests.

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
You no longer need to write `class Program` or `static void Main(string[] args)` in the console app project. It seems this was changed in .NET 6.

[Changes to the C# console app template in .NET 6+ - .NET](https://learn.microsoft.com/ja-jp/dotnet/core/tutorials/top-level-templates)
:::

Specify your GitHub PAT in the environment variable `GITHUB_TOKEN` and execute the program.

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

Successfully retrieved.

## Conclusion
In this article, we tried the Go SDK and .NET SDK as OctoKit transitions to a generation-based SDK. Both are at version 0.0.4, which might be the version generated by Kiota.

Although the official release might still be a while away, I would like to try the JavaScript version when it comes out.

While Octokit/Rest will become generation-based, it's interesting to see how GraphQL will be handled.
