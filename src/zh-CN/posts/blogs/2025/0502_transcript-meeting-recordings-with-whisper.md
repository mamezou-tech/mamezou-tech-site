---
title: 尝试使用 Whisper 对会议音频数据进行文字转录
author: masahiro-kondo
date: 2025-05-02T00:00:00.000Z
tags:
  - whisper
  - transcription
  - LLM
image: true
translate: true

---

## 引言

过去，会议纪要通常由年轻员工认真撰写，然后由资深同事审核后提交给客户……这是一项颇为费力的工作。

最近，无论是 Zoom 还是 Google Meet，都可以借助 AI 从录音到撰写会议纪要全部自动完成。系统还能结合账户信息进行发言人识别，准确度也在不断提升（尽管有时归纳的结果略显奇怪）。在线会议的会议纪要逐渐可以交由 AI 大部分处理。

但是，并非所有会议都在这种环境下进行，有时需要从本地录制的音频数据生成会议纪要。虽然也有一些在线服务可以对音频文件进行转录，但从保密角度考虑，有时无法将音频文件上传；或者会议太长，音频文件大小超过服务的上传限制[^1]。

[^1]: 根据不同方案，ChatGPT 的上传限制为 25MB。

本文将本地使用 OpenAI 开发的 OSS 自动语音识别工具 Whisper[^2]。

[^2]: 作者在 MacBook Pro (M2 Max 12-core) 环境下使用。

@[og](https://openai.com/ja-JP/index/whisper/)

:::column:使用 Google AI Studio (Gemini) 进行文字转录
如果组织已经订阅了 Google Apps，那么可以将文件上传到 [Google AI Studio](https://aistudio.google.com/) 进行转录。由于项目会创建在组织的 Google 云端硬盘中，因而可以上传相当大尺寸的文件，转录精度也很高。我到最近还一直方便地在使用，但是前阵子发生了严重的“幻觉”，生成了并不存在的对话内容，所以目前已停止使用。正是因为这件事，才促使我尝试构建本地转录环境。
:::

## 安装 Whisper

Whisper 是 OpenAI 于 2022 年发布的 OSS，使用 Python 编写。

@[og](https://github.com/openai/whisper)

:::info
据悉，ChatGPT 提供的转录不仅仅使用 Whisper 本身，还通过使用 LLM 进行补充，以提高可读性。
:::

首先准备 Python 环境。在作者的环境 (macOS) 中，已经通过 Homebrew 安装了 Python3 (3.11.3)。

安装用于处理音频的 FFmpeg：

```shell
brew install ffmpeg
```

虽然可以直接在 Python3 环境中安装，但为了避免破坏全局环境，使用 venv 创建用于运行 Whisper 的 Python 环境，这里命名为 whisper-env：

```shell
python3 -m venv whisper-env
```

激活 whisper-env 环境后，Shell 提示符会显示 (whisper-env) 这样的环境名称：

```shell
$ source whisper-env/bin/activate
(whisper-env)
```

以下操作均在该 whisper-env 环境中进行。根据需要更新 pip：

```shell
pip install -U pip
```

安装 Whisper：

```shell
pip install git+https://github.com/openai/whisper.git
```

## 使用 Whisper

在 Whisper 的 README 中，以下小节总结了可用的模型和语言列表表格：

[Available models and languages](https://github.com/openai/whisper?tab=readme-ov-file#available-models-and-languages)

由于支持多语言，这里选择了大约需要 5GB VRAM 的 medium 模型。指定目标音频文件，使用 `--language` 选项指定 Japanese（即日语），使用 `--task` 选项指定 transcribe（转录），使用 `--model` 选项指定 medium，执行如下命令：

```shell
whisper hoge.mp3 --language Japanese --task transcribe --model medium
```

上述示例指定了 MP3 文件，但也可以处理 WAV、FLAC 等格式。

首先会下载 medium 模型：

```
100%|█████████████████████████████████████| 1.42G/1.42G [09:21<00:00, 2.72MiB/s]
```

在转录开始前，出现了如下警告：

```
/whisper/transcribe.py:132: UserWarning: FP16 is not supported on CPU; using FP32 instead warnings.warn("FP16 is not supported on CPU; using FP32 instead")
```

由于仅在 CPU 上运行，因此会使用 32 位浮点数（FP16 是 GPU 使用的 16 位浮点数）。

尽管出现了警告，终端开始显示带时间戳的转录文本：

```
[00:00.000 --> 00:12.000] 差不多就是这样吧，作为成员来说。今天突然把大家召集过来，XXX 先生不在。
[00:12.000 --> 00:20.000] 嗯，有点不知道该怎么推进。
[00:20.000 --> 00:40.000] 关于这个经过，或者说关于 xxxxxxx，
  :
```

准确度也相当不错。

不过，由于在 CPU 上运行，几乎相当于会议的实时，对于一小时左右的会议就要花费接近一小时的时间，速度相当慢。如果在搭载 NVIDIA GPU 的机器上运行，应该会很流畅。另外，还可以选择使用 tiny 或 base 等小尺寸模型来追求速度。

## 安装 whisper.cpp

在继续试用 Python 版转录时，稍微搜索了一下，发现了一个叫 whisper.cpp 的 OSS。

@[og](https://github.com/ggml-org/whisper.cpp)

whisper.cpp 是将 Whisper 的模型移植到 C/C++ 的实现。它支持多种平台，似乎可以在 macOS、Windows、Android 以及 Raspberry Pi 上运行。由于可以构建成原生代码并直接执行，因此在运行速度方面也值得期待。

安装按照 README 中的 [Quick start](https://github.com/ggml-org/whisper.cpp?tab=readme-ov-file#quick-start) 进行。

:::info
需要事先根据平台安装相应的 C/C++ 工具链。macOS 上需要 Xcode Command Line Tools 和 cmake，Windows 上需要 MSVC 工具集和 MinGW 等。
:::

克隆仓库：

```shell
git clone https://github.com/ggml-org/whisper.cpp.git
```

进入仓库目录并编译：

```shell
cd whisper.cpp
cmake -B build
cmake --build build --config Release
```

下载 medium 模型：

```shell
./models/download-ggml-model.sh medium
```

如果出现如下消息，则模型下载成功：

```
Done! Model 'medium' saved in '/Users/kondoh/dev/whisper.cpp/models/ggml-medium.bin'
```

## 使用 whisper.cpp

使用构建好的可执行文件 (whisper-cli) 进行转录。通过 `-m` 选项指定下载的模型；通过 `-f` 指定音频文件；通过 `-l` 选项指定日语；通过 `-o` 指定输出格式，这里同时指定了普通文本格式和 SRT 格式：

```shell
./build/bin/whisper-cli -m ./models/ggml-medium.bin -f hoge.mp3 -l ja -otxt -osrt
```

:::info
SRT 格式是一种用于字幕的文件格式，每条发言都会输出一个序号、时间戳和发言内容。

```
1
00:00:00,000 --> 00:00:11,000
差不多就是这样吧，作为成员来说。今天突然把大家召集过来，XXX 先生不在。

2
00:00:11,000 --> 00:00:17,000
嗯，有点不知道该怎么推进。

3
00:00:17,000 --> 00:00:40,000
关于这个经过，或者说关于 xxxxxxx，
```
:::

这次测试的音频文件（约 1 小时左右的会议）转录用时约 4 分 30 秒，速度非常实用。利用多核，将 `-p` 选项指定处理器数量为 8 进行测试：

```shell
./build/bin/whisper-cli -m ./models/ggml-medium.bin  -p 8 -f hoge.mp3 -l ja -otxt -osrt
```

使用该选项后，约 2 分 8 秒即可完成。给人一种非常高效利用 CPU 核心的印象[^3]。

[^3]: 在活动监视器中观察到，wisper-cli 的线程数保持在 12（与 CPU 核心数一致）。

## 结语

以上就是使用 Whisper 构建会议音频数据转文本环境的经验。虽然看起来更推荐 whisper.cpp，但如果是在搭载 NVIDIA GPU 的 PC 上，官方的 Whisper 也许更合适。

一旦变成文本数据，就很容易使用 ChatGPT 或 Gemini 来生成会议纪要或摘要了。作为无法使用转录服务时的备选方案，我认为足够实用。
