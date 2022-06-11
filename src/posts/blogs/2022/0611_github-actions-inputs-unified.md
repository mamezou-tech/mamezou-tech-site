---
title: GitHub Actions - 再利用可能ワークフローと手動トリガーで入力値の扱いを統一
author: masahiro-kondo
date: 2022-06-11
---

これまで、GitHub Actions の手動トリガー(workflow_dispatch)では、入力値を扱う際、`github.event.inputs.foo` のように event コンテキストから値を取り出す必要がありました。
以前紹介した[再利用可能ワークフロー](/blogs/2022/03/08/github-actions-reuse-workflows/)(workflow_call)では、入力値を `inputs.foo` のように inputs コンテキストから取得します。

このようにトリガーの種類によって入力値の扱いが異なると、両方のトリガーで起動するワークフローが書きづらい問題があります。

先日この問題を解消するリリースが行われ、手動トリガーと再利用可能ワークフローの入力値の扱いが統一されました。

[GitHub Actions&#058; Inputs unified across manual and reusable workflows | GitHub Changelog](https://github.blog/changelog/2022-06-10-github-actions-inputs-unified-across-manual-and-reusable-workflows/)

現在では workflow_dispatch の入力値も inputs コンテキストから取得可能です。

:::info
event コンテキストからの取得も互換性のため残されています。
:::

では、以前の書き方の手動トリガーのジョブを動かしてみます。inputs の logLevel や tags などを github.event.inputs から取得してログに出力するワークフローです。
{% raw %}
```yaml
on: 
  workflow_dispatch:
    inputs:
      logLevel:
        description: 'Log level'     
        required: true
        default: 'warning'
      tags:
        description: 'Test scenario tags'

jobs:
  printInputs:
    runs-on: ubuntu-latest
    steps:
    - run: |
        echo "Log level: ${{ github.event.inputs.logLevel }}"
        echo "Tags: ${{ github.event.inputs.tags }}" 
```
{% endraw %}
Run workflow で入力値を指定して実行。

![](https://i.gyazo.com/b9c79355aa1856f12e2966bdf6c4a44e.png)

実行結果。この書き方でも入力値が取得できることがわかります。

![](https://i.gyazo.com/fce67782d676d0933ed95e4e60c46dad.png)

このワークフローを入力値を inputs コンテキストから取得するように書き換えます。
{% raw %}
```diff
    - run: |
-       echo "Log level: ${{ github.event.inputs.logLevel }}"
-       echo "Tags: ${{ github.event.inputs.tags }}" 
+       echo "Log level: ${{ inputs.logLevel }}"
+       echo "Tags: ${{ inputs.tags }}" 
```
{% endraw %}
実行します。

![](https://i.gyazo.com/8fd4a699de9c1b2b9e9eecea3d419390.png)

実行結果。この書き方でも入力値が正しく取得できました。

![](https://i.gyazo.com/9b0b43cb2f4b72d34d4f4089b3436ef1.png)

それでは、workflow_dispatch と workflow_call の両方をトリガーに持つワークフローを書いてみます。2つのトリガーでそれぞれほぼ同じ inputs を定義し、ジョブでは、inputs コンテキストから取り出した入力値を echo 出力しています。
{% raw %}
```yaml
name: Manual and Callee

on:
  workflow_dispatch:
    inputs:
      logLevel:
        description: 'Log level'
        required: true
        default: 'warning'
        type: choice
        options:
        - info
        - warning
        - debug
      tags:
        description: 'Test scenario tags'
        required: false
        type: boolean

  workflow_call:
    inputs:
      logLevel:
        description: 'Log level'
        required: true
        default: 'warning'
        type: string
      tags:
        description: 'Test scenario tags'
        required: false
        type: boolean

jobs:
  log-the-inputs:
    runs-on: ubuntu-latest
    steps:
      - run: |
          echo "Log level: $LEVEL"
          echo "Tags: $TAGS"
        env:
          LEVEL: ${{ inputs.logLevel }}
          TAGS: ${{ inputs.tags }}
```
{% endraw %}
workflow_dispach は入力フォームが使用できるため、logLevel を選択できるよう `type: choice` を指定し、`options` で選択肢を列挙しています。

workflow_call の方は、値を呼び出し側ジョブのコードで渡すため、logLevel は `type: string` にしています。

:::info
`type: choice` を指定すると invalid value としてエラーになります。
:::


まず、手動トリガーで実行します。

![](https://i.gyazo.com/f88da54e7ead3dcf6b45a0d2818e10e1.png)

実行結果。

![](https://i.gyazo.com/c2828fc2f1462f4fa9faf8ac36e9340e.png)


次に、呼び出し用のワークフローを作成します。上記のワークフローファイルを指定し、with で入力値を渡します。

```yaml
name: Caller Job
on: [workflow_dispatch]

jobs:
  Reuse:
    uses: ./.github/workflows/dispatch_and_call_inputs.yml
    with:
      loglevel: info
      tags: false
```

呼び出し側のワークフローを手動実行します。入力値はコードで渡すため、実行するだけです。

![](https://i.gyazo.com/a59ce549af6575374995427aed5f9fe4.png)

実行結果。

![](https://i.gyazo.com/865756108c41e9d090bba8c25bca3784.png)


以上、入力値の扱いが統一されたため、再利用可能ワークフローを単体で動かすことが簡単になり、複数のトリガーから同じジョブを実行できるようになりました。
