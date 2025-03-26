---
title: 尝试使用 Ollama 在本地主机上运行开源 LLM
author: kotaro-miura
date: 2025-02-20T00:00:00.000Z
tags:
  - LLM
  - 生成AI
  - AI
  - Ollama
  - DeepSeek
image: true
translate: true

---

# 引言

这次想尝试在本地 PC 上启动开源 LLM 的方法。如今已有许多种类的开源 LLM，无论是参数量较小的模型，还是最近备受关注的由中国企业推出的推理模型 DeepSeek-R1 等，都让人好奇它们能够给出怎样的回答，因此本文将从启动方法到回答结果全面验证一番。

# 什么是 Ollama

此次用于在本地启动开源 LLM 的软件是名为 [Ollama](https://ollama.com/) 的工具，它提供了处理 LLM 的各种工具。  
即使没有 GPU，也可以仅用 CPU 来运行 LLM，因此对于参数量较小的模型来说，可以轻松启动。

# 安装 Ollama

:::info:运行环境
- OS : Windows 10 (22H2)
- CPU Intel Core i7-1185G7
- 内存容量：16GB
- 显卡：无
- GPU：Intel Iris Xe（内置于 CPU）
  
此次将在 Windows 环境下仅使用 CPU 进行测试。
:::

首先安装 Ollama。

从[官方网站](https://ollama.com/download)下载适用于 Windows 的安装程序并安装。

安装完成后，启动 Windows Terminal 或命令提示符，运行以下命令即可完成设置。

```sh:PowerShell
$ ollama --version
ollama version is 0.5.7
```

# 启动 LLM

接下来试着启动 LLM。

执行命令只需在 `ollama run` 后面附上模型名称。可运行的模型可在 [ollama.com](https://ollama.com/search) 中查找。[^models]

[^models]: 在 GitHub 仓库的 [README](https://github.com/ollama/ollama?tab=readme-ov-file#model-library) 中的模型列表，也可以和模型大小一起查看，非常直观。

例如，此处启动的是 Meta 公司公开的模型 [Llama3.2 3B](https://ollama.com/library/llama3.2)。

```sh:PowerShell
$ ollama run llama3.2
pulling manifest
pulling dde5aa3fc5ff... 100% ▕████████████████████████████████████████████████████████▏ 2.0 GB
pulling 966de95ca8a6... 100% ▕████████████████████████████████████████████████████████▏ 1.4 KB
pulling fcc5a6bec9da... 100% ▕████████████████████████████████████████████████████████▏ 7.7 KB
pulling a70ff7e570d9... 100% ▕████████████████████████████████████████████████████████▏ 6.0 KB
pulling 56bb8bd477a5... 100% ▕████████████████████████████████████████████████████████▏   96 B
pulling 34bb5ab01051... 100% ▕████████████████████████████████████████████████████████▏  561 B
verifying sha256 digest
writing manifest
success
>>>  Send a message (/? for help)
```

在首次启动时，模型会先进行下载，接着若启动顺利完成，就会进入提示符等待输入。这个命令行界面类似于 Docker，不仅有 `run` 命令，还有仅用于下载模型的 `pull` 命令，以及用于将自定义模型发布至 ollama.com 的 `push` 命令等。

那么，试着打个招呼吧。

```
>>> こんにちは
こんにちは！どういたしてお待ちしておりますか？

>>> すごいですね。
ありがとうございます！私はここからどんなことができますでしょうか？
```

虽然日语有些怪异，但总体上输出的回答相当自然。

接下来还试着问一个关于编程的简单问题。

<pre style="height: 500px;">
<code>>>> Javaのサンプルコードを出力してください
Javaはオブジェクト指向プログラミング言語なので、例としてサンプルコードを示します。

### 例: Hello World!

Javaでは、次のような基本的な "Hello World!" のプログラムを作成できます。

```java
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
```

このコードは、`main` メソッド内で `System.out.println` を使用して "Hello, World!" を出力します。

### 例: 数値の合計

次のようなプログラムを実行すると、2 つの数値の合計が表示されます。

```java
public class Sum {
    public static void main(String[] args) {
        int num1 = 5;
        int num2 = 10;

        int result = num1 + num2;
        System.out.println("数字の合計は" + result + "です。");
    }
}
```

### 例: 式に値を代入する

次のようなプログラムでは、式に値を代入して結果を出力します。

```java
public class Example {
    public static void main(String[] args) {
        int a = 5;
        int b = 3;

        int sum = a + b;
        System.out.println("a + b = " + sum);
    }
}
```

これらのコードは、Java の基本的な構造と機能を示しています。
</code></pre>

源代码等也输出得很好呢。

当要结束等待输入时，请输入 `/bye`。

综上所述，仅启动 ollama.com 上注册的模型就显得非常简单。

# REST API 调用

使用 Ollama 启动 LLM 的同时，也提供了 REST API。[^rest-api]

[^rest-api]:[https://github.com/ollama/ollama?tab=readme-ov-file#rest-api](https://github.com/ollama/ollama?tab=readme-ov-file#rest-api)

启动 Ollama 后，打开另一个终端，通过发送 HTTP 请求即可提问。

```sh:PowerShell
$ curl.exe http://localhost:11434/api/chat -d '{
>>   ""model"": ""llama3.2"",
>>   ""messages"": [
>>     { ""role"": ""user"", ""content"": ""こんにちは"" }
>>   ]
>> }'
{"model":"llama3.2","created_at":"2025-02-11T15:33:28.0907887Z","message":{"role":"assistant","content":"こんにちは"},"done":false}
{"model":"llama3.2","created_at":"2025-02-11T15:33:28.1702247Z","message":{"role":"assistant","content":"！"},"done":false}
{"model":"llama3.2","created_at":"2025-02-11T15:33:28.2608251Z","message":{"role":"assistant","content":"どう"},"done":false}
{"model":"llama3.2","created_at":"2025-02-11T15:33:28.347122Z","message":{"role":"assistant","content":"いた"},"done":false}
{"model":"llama3.2","created_at":"2025-02-11T15:33:28.4304461Z","message":{"role":"assistant","content":"しま"},"done":false}
{"model":"llama3.2","created_at":"2025-02-11T15:33:28.5122336Z","message":{"role":"assistant","content":"して"},"done":false}
{"model":"llama3.2","created_at":"2025-02-11T15:33:28.5970052Z","message":{"role":"assistant","content":"？"},"done":false}
{"model":"llama3.2","created_at":"2025-02-11T15:33:28.698315Z","message":{"role":"assistant","content":" ("},"done":false}
{"model":"llama3.2","created_at":"2025-02-11T15:33:28.7806767Z","message":{"role":"assistant","content":"Oh"},"done":false}
{"model":"llama3.2","created_at":"2025-02-11T15:33:28.8596621Z","message":{"role":"assistant","content":"ay"},"done":false}
{"model":"llama3.2","created_at":"2025-02-11T15:33:28.9427096Z","message":{"role":"assistant","content":"ou"},"done":false}
{"model":"llama3.2","created_at":"2025-02-11T15:33:29.0272743Z","message":{"role":"assistant","content":" go"},"done":false}
{"model":"llama3.2","created_at":"2025-02-11T15:33:29.124338Z","message":{"role":"assistant","content":"z"},"done":false}
{"model":"llama3.2","created_at":"2025-02-11T15:33:29.209143Z","message":{"role":"assistant","content":"aim"},"done":false}
{"model":"llama3.2","created_at":"2025-02-11T15:33:29.2949922Z","message":{"role":"assistant","content":"asu"},"done":false}
{"model":"llama3.2","created_at":"2025-02-11T15:33:29.3898005Z","message":{"role":"assistant","content":"!)"},"done":false}
{"model":"llama3.2","created_at":"2025-02-11T15:33:29.4850401Z","message":{"role":"assistant","content":" Would"},"done":false}
{"model":"llama3.2","created_at":"2025-02-11T15:33:29.5910074Z","message":{"role":"assistant","content":" you"},"done":false}
{"model":"llama3.2","created_at":"2025-02-11T15:33:29.6953205Z","message":{"role":"assistant","content":" like"},"done":false}
{"model":"llama3.2","created_at":"2025-02-11T15:33:29.7988221Z","message":{"role":"assistant","content":" to"},"done":false}
{"model":"llama3.2","created_at":"2025-02-11T15:33:29.8746928Z","message":{"role":"assistant","content":" chat"},"done":false}
{"model":"llama3.2","created_at":"2025-02-11T15:33:29.9631774Z","message":{"role":"assistant","content":" about"},"done":false}
{"model":"llama3.2","created_at":"2025-02-11T15:33:30.045542Z","message":{"role":"assistant","content":" something"},"done":false}
{"model":"llama3.2","created_at":"2025-02-11T15:33:30.1307175Z","message":{"role":"assistant","content":" in"},"done":false}
{"model":"llama3.2","created_at":"2025-02-11T15:33:30.2206491Z","message":{"role":"assistant","content":" particular"},"done":false}
{"model":"llama3.2","created_at":"2025-02-11T15:33:30.3027965Z","message":{"role":"assistant","content":" or"},"done":false}
{"model":"llama3.2","created_at":"2025-02-11T15:33:30.3878668Z","message":{"role":"assistant","content":" just"},"done":false}
{"model":"llama3.2","created_at":"2025-02-11T15:33:30.4735707Z","message":{"role":"assistant","content":" have"},"done":false}
{"model":"llama3.2","created_at":"2025-02-11T15:33:30.5559478Z","message":{"role":"assistant","content":" a"},"done":false}
{"model":"llama3.2","created_at":"2025-02-11T15:33:30.6429033Z","message":{"role":"assistant","content":" casual"},"done":false}
{"model":"llama3.2","created_at":"2025-02-11T15:33:30.724751Z","message":{"role":"assistant","content":" conversation"},"done":false}
{"model":"llama3.2","created_at":"2025-02-11T15:33:30.807616Z","message":{"role":"assistant","content":"?"},"done":false}
{"model":"llama3.2","created_at":"2025-02-11T15:33:30.8884414Z","message":{"role":"assistant","content":""},"done_reason":"stop","done":true,"total_duration":4323876100,"load_duration":63547700,"prompt_eval_count":26,"prompt_eval_duration":1447000000,"eval_count":33,"eval_duration":2800000000}
```

默认是流式输出呢。

此外，还提供了兼容 OpenAI API 的接口，使用起来非常方便。  
[OpenAI compatibility](https://ollama.com/blog/openai-compatibility)

```sh:PowerShell
$ curl.exe http://localhost:11434/v1/chat/completions `
>>     -H ""Content-Type: application/json"" `
>>     -d '{
>>         ""model"": ""llama3.2"",
>>         ""messages"": [
>>             {
>>                 ""role"": ""system"",
>>                 ""content"": ""あなたは優秀なアシスタントです""
>>             },
>>             {
>>                 ""role"": ""user"",
>>                 ""content"": ""ありがとう！""
>>             }
>>         ]
>>     }'
{"id":"chatcmpl-377","object":"chat.completion","created":1739289063,"model":"llama3.2","system_fingerprint":"fp_ollama","choices":[{"index":0,"message":{"role":"assistant","content":"どういたしろ～？何かサポートしてあげることができることあるでしょうか？"},"finish_reason":"stop"}],"usage":{"prompt_tokens":38,"completion_tokens":20,"total_tokens":58}}
```

<br>

到目前为止，我们已经了解了如何启动模型和输入提示，接下来也想试试除 Llama3.2 之外的其他模型。

# 推理模型(DeepSeek-R1)

接下来试用最近备受关注的 [DeepSeek-R1](https://github.com/deepseek-ai/DeepSeek-R1)。该模型具备推理功能，在回答前会验证回答内容的合理性，从而输出更高准确度的回答，就像 OpenAI 的 o1 模型一样。

这个模型也可以通过 Ollama 轻松启动。（[模型链接](https://ollama.com/library/deepseek-r1)）

使用如下命令启动 deepseek-r1 7B 模型。

```sh:PowerShell
$ ollama run deepseek-r1
```

首先先打个招呼试试。

```
>>> こんにちは
<think>

</think>

¡Hola! ¿Cómo estás?

>>> 日本語で答えてください。
<think>
Alright, the user has switched from Japanese to Japanese again. They might be trying to see if I can handle
different languages or just being persistent.

Since they asked for a response in Japanese before and got one in English, this time they're asking me to respond
in Japanese. Maybe it's a test or they want consistent language support.

I should make sure my response is clear and friendly in Japanese, just like the previous message was in English.
</think>

こんにちは！
```

最初的「こんにちは」输入没有得到日语回复；当指定「请用日语回答」后，虽然推理部分仍以英文输出，但最终切换为日语回答。

接下来，试着问一个关于编程的简单问题。

<pre style="height: 500px;">
<code>>>> Javaのサンプルコードを1つ教えてください。
&lt;think&gt;
那么，用户要求提供一个 Java 的示例代码。首先，需要确认 Rust 的基本语法和特点，并选择一个简单的例子。例如，从 Hello World 这样简单的程序开始比较好。另外，包含类型指定、引用/借用等重要元素也能便于说明。需要判断用户是 Rust 新手还是已有一定知识，并相应调整难度。另外，需要用日语进行讲解，因此可能需要对代码的每个部分做出易于理解的注释。
ユーザーがRust初心者なのか、それともある程度の知識を持っているのか判断して、適切な難易度に合わせる必要があります。また、日本語での解説が必要なので、コードの各部分を分かりやすくコメントする必要があるかもしれません。
&lt;/think&gt;

Rustの基本的なHello Worldプログラムを一つご紹介します：

```rust
fn main() {
    println!("Hello, world!");
}
```

このコードの特徴と解説：
1. `main()`関数：実行時のエントリーポイント
2. `println!`マクロ：出力用の標準組み込み機能
3. メモリ安全：参照/バッキング管理を自動化
4. 安定言語：型推論と静的型付けによる予防的措置

日本語で解説すると：
- `fn main()`: 結合子の実行部分
- `println!`: 情報表示用の組み込み機能
- Rustの特徴を体現するシンプルな例
- 安定性と予防的な型チェックを備えた現代言語

コンパイル方法：
rustc 5.0以降で`cargo build --release`などで実行可能。
</code></pre>

# Vision 模型(Llava-Phi3)

接下来使用 Vision 模型，通过图片一起输入提示进行提问。

这次将使用名为 [Llava-Phi3](https://ollama.com/library/llava-phi3) 的模型试试。

将与下图一起提问。

![book](/img/blogs/2025/0220_ollama_local_llm/book_gijutsusyo_it_set_small.png)
引用：[いらすとや](https://www.irasutoya.com/2018/07/blog-post_18.html)

当与图片一起提问时，请使用以下命令启动。

```sh:PowerShell
$ ollama run llava-phi3 "この画像には何が書いてありますか？ C:\develop\ollama\book_gijutsusyo_it_set_small.png"
Added image 'C:\develop\ollama\book_gijutsusyo_it_set_small.png'

1. AI (Artificial Intelligence)
2. Web (World Wide Web)
3. Programming
```

回答虽简单，但基于图片内容得到了相应的回答。

# 关于利用 GPU 加速

到目前为止，以上所有的测试均仅使用 CPU 进行。

虽然所用的 PC 内置有 CPU 集成的 GPU，但 Ollama 默认并未调用，因此所有操作都是在常规内存中运行。  
由于这种限制，只能使用参数量较小的模型，但能够取得相当不错的回答准确度，也是一个不错的发现。  
（似乎也有方法让系统识别 Intel 制 GPU，将来有机会试试。）

关于响应速度，在上述测试中，Llama3.2 3B 模型的流式输出大约需 5 秒才能开始回答，而且输出速度约为每秒 10 个 token，因此并不会让人感到太大压力。  
相反，当使用 DeepSeek-R1 14B 模型时，感觉速度较慢：流式输出大约需 10 秒才能开始回答，且 token 输出速度仅为每秒 1~2 个，导致整个回答输出完毕需要等待较长时间。

据说 LLM 使用 GPU 可以大幅加速，于是在以下配置的机器上运行了 DeepSeek-R1 32B 模型。  
结果正如预期，速度明显提升。虽然没有详细的测试记录，但感觉输出速度超过了每秒 10 个 token。

:::info:配备 GPU 的机器规格
- OS：Windows 11
- Intel Core i9-10920X
- 内存：32GB
- GPU：NVIDIA GeForce RTX 3060
- GPU 内存：12GB
:::

只需安装 Ollama 和 NVIDIA 驱动，无需其他设置即可启用 GPU。  
（只要有合适的机器）如此便捷的加速方式真让人赞叹。

# 结束语

这次尝试了使用 Ollama 在本地主机上运行开源 LLM 的方法。  
启动过程非常简单，而且即使是参数量较小的模型也能够输出自然的回答，因此我认为它可以很轻松地被集成到各种软件中。  
关于 GPU 的使用，如果是 NVIDIA 设备，则配置简单、使用便捷；但如果使用 Intel 的 GPU，则可能需要额外的步骤，今后也希望能尝试一下。
