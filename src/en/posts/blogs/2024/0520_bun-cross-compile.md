---
title: Bun Now Supports Cross-Compiling Executable Binaries
author: masahiro-kondo
date: 2024-05-20T00:00:00.000Z
tags:
  - Bun
  - javascript
image: true
translate: true

---

:::info
To reach a broader audience, this article has been translated from Japanese.
You can find the original version [here](https://developer.mamezou-tech.com/blogs/2024/05/20/bun-cross-compile/).
:::



## Introduction

When Bun reached version 1.0 last September, I wrote an article about introducing it into the development environment.

[Replacing Node.js with Bun in the Development Environment](/blogs/2023/11/21/replace-nodejs-with-bun-in-devenv/)

Later, with Bun 1.1, Windows support was added, achieving true cross-platform compatibility.

[Bun 1.1 | Bun Blog](https://bun.sh/blog/bun-v1.1)

While the feature to generate executable binaries was already provided, the cross-compiling feature was implemented in version 1.1.5.

[Bun v1.1.5 | Bun Blog](https://bun.sh/blog/bun-v1.1.5)

:::info:Promotion - Contributed to the Bun Feature in Software Design June 2024 Issue
Inspired by the article introduced at the beginning, I had the opportunity to contribute to the second feature on Bun in the June 2024 issue of Software Design. It covers everything from an overview of Bun to how to use it and performance comparisons with Node.js.

- Chapter 1: Grasping the Big Picture of Bun
- Chapter 2: Let's Use Bun
- Chapter 3: Thorough Comparison of Bun and Node.js

I was responsible for writing Chapter 2. I wrote about installing Bun, introducing its features, how to use it, and debugging methods. At the time of writing, it was just after the release of Bun 1.1, so I didn't touch on cross-compiling. However, I did introduce how to create executable binaries.
Chapter 3 includes interesting content such as deploying Node.js and Bun code to AWS Lambda for speed comparisons.

<a href="https://gihyo.jp/magazine/SD/archive/2024/202406" target=_blank><img src="https://gihyo.jp/assets/images/cover/2024/thumb/TH160_642406.jpg" alt="SD202406" /></a>

[Software Design June 2024 Issue](https://gihyo.jp/magazine/SD/archive/2024/202406)
:::

## Advantages of Single Binary and Cross-Compiling
The benefits of creating a single binary include not only the convenience of distribution to users but also the following advantages:

- Saves time and memory as there is no need for import resolution, transpiling, or code generation at runtime.
- Enables lightweight containers as binaries can be containerized without a runtime by simply copying the binary.
- Simplifies the CI pipeline as the binary can be executed by just downloading and setting the path, saving execution time.

Additionally, cross-compiling offers the following advantages:

- No need to prepare a build environment for each target environment.
- Can build executable binaries for all targets with a single CI pipeline.

Therefore, with the implementation of the cross-compiling feature in Bun, which originally boasts an all-in-one approach, the development experience has significantly improved as the bun CLI alone can handle everything from development to cross-platform executable binary distribution.

## Trying Bun's Cross-Compiling
Let's try generating and cross-compiling an executable binary with Bun. I am performing this on a macOS Sonoma / Bun 1.1.8 environment.

Create a Bun project.

```shell
mkdir simple-server && cd simple-server
bun init -y
```

I wrote a simple HTTP server that listens on port 3000 and returns a message.

```typescript:index.ts
Bun.serve({
  port: 3000,
  fetch(req) {
    return new Response('Hello, Bun!')
  }
});
```

This code can be executed with the following command.

```shell
bun index.ts
```

Let's create an executable binary.

```shell
$ bun build --compile ./index.ts --outfile simpleServer
   [2ms]  bundle  1 modules
 [104ms] compile  simpleServer
```

The build completes in about 0.1 seconds, generating a 51MB executable binary targeting the macOS machine.

```shell
$ ls -lh simpleServer
-rwxrwxrwx  1 kondoh  staff    51M  5 20 14:50 simpleServer
```

It can be executed without the bun CLI as follows.

```shell
./simpleServer
```

In the above example, the target was not specified, but the platform can be specified with the `--target` option. Let's generate a binary for Windows.

```shell
$ bun build --compile ./index.ts --target=bun-windows-x64 --outfile simpleServer.exe
   [3ms]  bundle  1 modules
[4.302s] compile  simpleServer.exe bun-windows-x64-v1.1.8
```

Including the download of necessary libraries, the build completes in about 4.3 seconds. The file size is around 100MB.

```shell
$ ls -lh simpleServer.exe
-rwxrwxrwx  1 kondoh  staff   105M  5 20 14:55 simpleServer.exe
```

The `--target` specification is as follows.

| Platform | `--target` Value |
|:--|:--|
| Linux x64   | `bun-linux-x64` |
| Linux ARM   | `bun-linux-arm64` |
| Windows x64 | `bun-windows-x64` |
| macOS x64   | `bun-darwin-x64` |
| macOS Apple Silicon | `bun-darwin-arm64` |

When deploying to production, it is also recommended to specify `--minify` and `--sourcemap`.

```shell
bun build --compile --minify --sourcemap ./path/to/my/app.ts --outfile myapp
```

Specifying the `--minify` option can reduce the size of the transpiled code. Specifying the `--sourcemap` option allows error information to be output at the location of the original source code.

Additionally, embedding assets and embedding SQLite databases are also supported. For more details, refer to the documentation.

[Single-file executable – Runtime | Bun Docs](https://bun.sh/docs/bundler/executables#cross-compile-to-other-platforms)

## Implementation Status in Major Runtimes
Executable binary generation is also implemented in Node.js and Deno, and cross-compiling is already implemented in Deno.

- [deno compile, standalone executables | Deno Docs](https://docs.deno.com/runtime/manual/tools/compiler#cross-compilation)
- [Single executable applications | Node.js v22.2.0 Documentation](https://nodejs.org/api/single-executable-applications.html)

| | Deno | Bun | Node.js |
|:--|:--:|:--:|:--:|
| Executable Binary Generation | ⚪︎ | ⚪︎ | ⚪︎ (Active development) |
| Cross-Compiling      | ⚪︎ | ⚪︎ | - | 

Regarding Node.js Single Executable Applications, it is currently in the `stability: 1.1 - Active development` status and cannot be considered stable at this point. The situation is that the newer runtimes Deno and Bun are on par.

:::info
Although it's an article from last year, our site has covered Node.js Single Executable Applications in the following article.

[Creating Standalone Executable Files with Node.js v19.7 Experimental Single Executable Applications](/blogs/2023/03/01/node19-sea-intro/)
:::

## Conclusion
We have tried cross-compiling executable binaries implemented in Bun.
The ability to reduce the footprint and speed up the startup in the deployment environment with executable binaries is a significant advantage.
Ultimately, it is necessary to conduct end-to-end tests for each target platform in CI, but it is nice that the development environment only needs to be for one platform thanks to the cross-compiling feature.
