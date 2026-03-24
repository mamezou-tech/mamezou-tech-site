---
title: Using Whisper to Transcribe Meeting Audio Data
author: masahiro-kondo
date: 2025-05-02T00:00:00.000Z
tags:
  - whisper
  - transcription
  - LLM
image: true
translate: true

---

## Introduction

In the past, it was common for junior employees to diligently create meeting minutes, which were then reviewed by their seniors before being submitted to the client. It was a rather labor-intensive task.

Nowadays, whether it's Zoom or Google Meet, AI can handle everything from transcription of the recordings to drafting the meeting minutes. It even identifies speakers by linking to account information, and its accuracy keeps improving (although the summaries can sometimes be a bit off). We're approaching a point where AI can largely take over note-taking for online meetings.

However, not all meetings take place in such environments, and there are cases where you have to generate minutes from audio data recorded locally. There are several online services that transcribe audio files, but there are situations where you can't upload audio files due to confidentiality concerns, or where the meeting is so long that the audio file size exceeds the service's upload limit[^1].

[^1]: ChatGPT, depending on the plan, has a 25MB limit.

In this article, we'll use Whisper, the open-source automatic speech recognition tool developed by OpenAI, in a local environment[^2].

[^2]: The author used it on a MacBook Pro (M2 Max 12-core) environment.

@[og](https://openai.com/ja-JP/index/whisper/)

:::column:Transcription Using Google AI Studio (Gemini)
If your organization subscribes to Google Apps, you can upload files to [Google AI Studio](https://aistudio.google.com/) and have them transcribed. Since projects are created in your organization's Google Drive, you can upload very large files, and the transcription accuracy is high. I had been using it conveniently until recently, but it produced a severe hallucination, generating entirely fictitious conversation content, so I have suspended its use. This incident prompted me to set up a local transcription environment.
:::

## Installing Whisper

Whisper is an open-source software released by OpenAI in 2022 and is written in Python.

@[og](https://github.com/openai/whisper)

:::info
The transcription provided by ChatGPT seems to enhance readability not only by using Whisper alone but also by supplementing it with an LLM.
:::

First, prepare the Python environment. On the author's environment (macOS), Python3 (3.11.3) was already installed via Homebrew.

Install FFmpeg to handle audio.

```shell
brew install ffmpeg
```

You could set up directly in the global Python3 environment, but to avoid breaking the global environment, create a Python environment for running Whisper using venv. Here, it's called whisper-env.

```shell
python3 -m venv whisper-env
```

Activate the whisper-env environment; the shell prompt will show (whisper-env).

```shell
$ source whisper-env/bin/activate
(whisper-env)
```

From here, we'll work in this whisper-env. Install pip as needed.

```shell
pip install -U pip
```

Install Whisper.

```shell
pip install git+https://github.com/openai/whisper.git
```

## Using Whisper

The table of available models and languages is summarized in the following section of the Whisper README:

[Available models and languages](https://github.com/openai/whisper?tab=readme-ov-file#available-models-and-languages)

It supports multiple languages, and I decided to use the medium model, which requires about 5GB of VRAM. Specify the target audio file, set the language to Japanese with the `--language` option, the task to transcribe with `--task`, and medium with `--model`:

```shell
whisper hoge.mp3 --language Japanese --task transcribe --model medium
```

In the above example, an MP3 file is specified, but it can also handle WAV, FLAC, and other formats.

First, the medium model is downloaded:

```
100%|█████████████████████████████████████| 1.42G/1.42G [09:21<00:00, 2.72MiB/s]
```

Before transcription begins, the following warning was displayed:

```
/whisper/transcribe.py:132: UserWarning: FP16 is not supported on CPU; using FP32 instead warnings.warn("FP16 is not supported on CPU; using FP32 instead")
```

Since it's running on CPU only, it informed that it will use 32-bit floating point (FP16 is the 16-bit floating point used on GPUs).

Despite the warning, the converted text began streaming in the terminal with timestamps:

```
[00:00.000 --> 00:12.000] Is this about right for the members? They were gathered on short notice today, and XXX isn't here.
[00:12.000 --> 00:20.000] Yes, I'm not sure what the best way to proceed is.
[00:20.000 --> 00:40.000] Regarding this background, in relation to xxxxxxx,
  :
```

The accuracy is also quite good.

However, since it's running on CPU, it's near real-time; a one-hour meeting takes nearly an hour to transcribe, which is quite slow. I imagine it runs much faster on a machine with an NVIDIA GPU. There's also the option to use smaller models like tiny or base instead of medium if you want to prioritize speed.

## Installing whisper.cpp

While the Python version was still running the transcription, I did some research and found an OSS called whisper.cpp.

@[og](https://github.com/ggml-org/whisper.cpp)

whisper.cpp is a port of the Whisper model to C/C++. It supports many platforms and seems to run on macOS, Windows, Android, and Raspberry Pi. Because it compiles to native code, you can expect good performance.

Installation follows the Quick start in the README.

:::info
You need to pre-install a C/C++ toolchain suitable for your platform. On macOS, Xcode Command Line Tools and cmake; on Windows, an MSVC toolset or MinGW, etc.
:::

Clone the repository:

```shell
git clone https://github.com/ggml-org/whisper.cpp.git
```

Change to the repository directory and build:

```shell
cd whisper.cpp
cmake -B build
cmake --build build --config Release
```

Download the medium model:

```shell
./models/download-ggml-model.sh medium
```

If you see a message like the following, the model download succeeded:

```
Done! Model 'medium' saved in '/Users/kondoh/dev/whisper.cpp/models/ggml-medium.bin'
```

## Using whisper.cpp

Use the built binary (`whisper-cli`) to transcribe. Specify the downloaded model with `-m`, the audio file with `-f`, Japanese with `-l`, and set the output formats to plain text and SRT with `-otxt` and `-osrt`.

```shell
./build/bin/whisper-cli -m ./models/ggml-medium.bin -f hoge.mp3 -l ja -otxt -osrt
```

:::info
SRT format is a subtitle file format that outputs a sequence number, timestamp, and spoken content for each utterance.

```
1
00:00:00,000 --> 00:00:11,000
Is this about right for the members? They were gathered on short notice today, and XXX isn't here.

2
00:00:11,000 --> 00:00:17,000
Yes, I'm not sure what the best way to proceed is.

3
00:00:17,000 --> 00:00:40,000
Regarding this background, in relation to xxxxxxx,
```
:::

The audio file I tested (about a one-hour meeting) took about 4 minutes and 30 seconds to transcribe. That's a sufficiently practical speed. I leveraged multiple cores by running with the `-p` option to use 8 processors:

```shell
./build/bin/whisper-cli -m ./models/ggml-medium.bin  -p 8 -f hoge.mp3 -l ja -otxt -osrt
```

With this option, it completed in about 2 minutes and 8 seconds. It seems to utilize CPU cores quite efficiently[^3].

[^3]: Looking at Activity Monitor, the thread count for wisper-cli remained at 12 (matching the number of CPU cores).

## Conclusion

That concludes the story of setting up an environment to convert meeting audio data to text using Whisper. It might look like I'm recommending whisper.cpp, but if you have a PC with an NVIDIA GPU, the official Whisper might be better.

Once you have text data, it's easy to have ChatGPT or Gemini create meeting minutes or summaries. I think it's a fully practical option for situations where you can't use transcription services.
