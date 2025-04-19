---
title: >-
  CUDA, cuDNN, CMake Hell Overcome: The Battle to Run Quantized DeepSeek Models
  on a Very Old GPU + llama.cpp
author: shuichi-takatsu
date: 2025-04-14T00:00:00.000Z
tags:
  - LLM
  - gpu
  - llama
image: true
translate: true

---

This time, it's a challenge report on running the trending large language model "DeepSeek" series locally, even on a budget, second-hand PC equipped with an outdated GPU.

However, DeepSeek content has already been published on the Mamezou Developer Site in the following article.
- [Let's host an open-source LLM locally using Ollama](/blogs/2025/02/20/ollama_local_llm/)

Additionally, the Python-based version of "llama", which we plan to use this time, has already been published in the following article.
- [Void simulation using a local LLM (llama.cpp, llama-cpp-python)](/blogs/2024/12/19/ai_boid_simulation/)

Doing the same thing wouldn't be interesting. So I want to try building through a slightly different route: a C++-based LLM framework.  
(Well, choosing a route like this usually means you get stuck somewhere.)

"CUDA? cuDNN? CMake? You need all sorts of things, right?"  
— Yes. You do. And if you try to use an old GPU, you'll suffer from the wall of official support and version hell.

In this article, I'll carefully introduce the sticking points and workarounds for getting a quantized DeepSeek model to run on the GPU using llama.cpp in this super low-spec environment.

## Motivation for Environment Setup

The reason is simple: it's a hobby (lol).  
I wanted to prove that an old machine can still hold its own.

Being a hardcore tech geek, I like to try out any topics that seem usable.  
Previously, I researched LLMs in the following articles:
- [I researched the natural language processing model "Transformer" that forms the basis of ChatGPT and ended up at "Hugging Face"](/blogs/2023/03/20/using-transformer-01/)
- [I implemented the natural language processing model "GPT2-Japanese" by asking ChatGPT how to use it, and it was more impressive than I imagined](/blogs/2023/03/22/using-transformer-02/)
- [Visualizing the "attention mechanism," the core of the Transformer, with ChatGPT as my teacher](/blogs/2023/03/26/using-transformer-03/)

Since then, technological progress has been tremendous, and the use of generative AI has become commonplace.  
While we're at it, this time I wanted to try using an LLM called DeepSeek, which has been making the rounds.

The PC specs I used for this experiment are as follows:
- CPU: Intel(R) Core(TM) i5-4690 CPU @ 3.50GHz
- RAM: 16.0 GB
- Storage: 238 GB SSD, 466 GB HDD
- GPU: NVIDIA GeForce GTX 970 (4 GB)
- OS: Windows 10 pro
- Total cost: all used, came together for the low price of around 10,000 yen!

(I can't afford a GPU-equipped machine that costs hundreds of thousands!)

However, it still "works properly."  
I opted for a "used PC that's ridiculously cheap" (lol).  
As a side note, the case is a mid-tower and the ATX power supply is over 750W, so I'm considering swapping in a higher-end GPU (also second-hand, of course) in the future.  
I think an old GPU is perfectly fine as an introduction to playing around with CUDA.

### What Is a Quantized Model?

First off, you need to know about "quantized models."  
Large language models (LLMs) like DeepSeek typically have tens to hundreds of billions of parameters (weights) and are usually represented in float32 (32-bit floating point).  
However, this format consumes a massive amount of memory, especially VRAM, and simply won't fit on a 4GB-class GPU like the GTX 970.

Enter the quantized model. This is a lightweight version with somewhat reduced precision and a **compressed model size**.

- Going from 32-bit to 4-bit yields about **1/8 the size**
- It uses much less VRAM
- It's optimized for lightweight frameworks like llama.cpp, Ollama, LM Studio, and so on

In other words, "**to run an LLM on a super old GPU, quantized models are essential.**"

### Lightweight LLM Framework

There are LLM frameworks like LangChain, LlamaIndex, and OpenLLM, but this time I want to try the lightweight LLM framework llama.cpp.  
llama.cpp is a tool well-suited to using quantized models.  
There are also other options like LM Studio and Ollama. (For Ollama, check out [this article](/blogs/2025/02/20/ollama_local_llm/).)

llama.cpp is the original local LLM framework, written in C++ and open source.  
I believe it's a good match for DeepSeek's quantized (GGUF format) models.

## Building the CUDA Development Environment

### Sticking Point #1

Experienced users might know this from the start, but it's crucial to align versions across the CUDA Toolkit, cuDNN, CMake, and MSBuild.  
Before setting up the LLM+CUDA environment on this PC, I had already built a PyTorch+CUDA environment with CUDA Toolkit 11.3 + cuDNN 8.2.1.  
(There were also various issues when building with that combo, due to CUDA-enabled PyTorch and Python version mismatches.)

When I proceeded with that environment for the CUDA Toolkit and cuDNN, errors exploded everywhere.  
After investigating the errors, spending almost a whole day, I discovered that "CUDA 12.4 or higher is required for the CMake + MSBuild environment," so I ended up proceeding with the following configuration (as of 2025-04-12):
- CUDA Toolkit: 12.8 update 1
- cuDNN: 9.8.0

I'm sure there's some workaround, but I was completely burned out and didn't pursue it further.  
Anyone building a CUDA development environment should be careful with their CUDA versions.

This is roughly how I think you should align versions:

1) Check the CUDA version supported by the LLM library you want to use, and install it.  
   Currently, CUDA broadly exists as either the 11.x or 12.x series.  
   The llama.cpp used this time apparently works on the CUDA 12.x series too. ([See here](https://github.com/ggml-org/llama.cpp/releases))  
   However, if you're using something like PyTorch, the 11.x series may be recommended.

2) From the [official NVIDIA site](https://docs.nvidia.com/deeplearning/cudnn/backend/latest/reference/support-matrix.html#abstract), find and install the cuDNN version corresponding to the CUDA you chose.  
   For example, if CUDA is 12.8, then cuDNN would be version 9.8.

3) Install a stable CMake version 3.16 or later, and set the install path in your environment variables.  
   If you're building llama.cpp, a stable version 3.28 or later is probably safe. (I didn't try CMake 4.x this time… the latest can be a bit much.)

4) Install MSBuild or Visual Studio 2022.  
   Enable the "Desktop development with C++" workload in the installation options.  
   Here is the [compatibility matrix](https://docs.nvidia.com/deeplearning/cudnn/backend/latest/reference/support-matrix.html#windows).

The setup steps are as follows.

### Installing the CUDA Toolkit

Since I want to use the GPU (in fact, that's even the goal this time), installing the CUDA Toolkit is a must.  
For installation instructions, I referred to [this guide](https://zenn.dev/headwaters/articles/c42799b2f27d52).

First, from NVIDIA's [CUDA official page](https://developer.nvidia.com/cuda-downloads), find and install "CUDA 12.8 update 1".

Click through the prompts according to your environment, and the download button will appear along with the installation instructions.  
![](https://gyazo.com/30c38b6f2440b1622e34dbbe58283a75.png)

After installation, there was no need to manually add the path to your environment variables.  
The following environment variables were registered automatically:
- CUDA_PATH
- CUDA_PATH_V12_8

### Installing cuDNN

Next, install cuDNN.  
From NVIDIA's [cuDNN official page](https://developer.nvidia.com/cudnn-downloads), find and install "cuDNN 9.8.0".

Similarly, click through according to your environment, and the download button and installation instructions will appear.  
![](https://gyazo.com/2db93a51cbecbc3215d8ecb69bf2b5c0.png)

In the case of version 9.8.0, there was an installer, but in older versions you might download a ZIP file, unzip it yourself, and manually copy the resulting bin, include, and lib folders into the CUDA Toolkit directory. ([Reference](https://zenn.dev/headwaters/articles/c42799b2f27d52#cudnn-%E3%82%92%E3%83%80%E3%82%A6%E3%83%B3%E3%83%AD%E3%83%BC%E3%83%89))

## Building the CMake Build Environment

Feel free to skip this if you've already installed CMake and MSBuild tools.

### Installing CMake

Download the "Windows Installer (cmake-x.y.z-windows-x86_64.msi)" from the [official CMake download page](https://cmake.org/download/).  
I downloaded "cmake-3.31.7-windows-x86_64.msi".  
Run the installer, select "Add CMake to the PATH environment variable", and install.

After installation, run:
```shell
cmake --version
```
If you see output like the following, the installation succeeded:
```shell
cmake version 3.31.7
CMake suite maintained and supported by Kitware (kitware.com/cmake).
```

### Installing Visual Studio Build Tools

Download "Build Tools" from the [official Visual Studio Build Tools page](https://visualstudio.microsoft.com/ja/visual-cpp-build-tools/).  
Click the "Download Build Tools" button, and an executable named "vs_BuildTools.exe" will download.

Launch the installer.  
![](https://gyazo.com/e2ac26da5211dc1df7bc80f98d1d723d.png)

Once the installer environment is ready, the following dialog appears; turn on "Desktop development with C++" and install.  
![](https://gyazo.com/67b7add24353b71be3d70ff731ca113b.png)

Start the installation, then reboot when it completes.  
After rebooting, run:
```shell
cl
```
If you see output like this, the installation was successful:
```shell
Microsoft(R) C/C++ Optimizing Compiler Version 19.43.34810 for x64
Copyright (C) Microsoft Corporation.  All rights reserved.
```

## Building the Lightweight LLM "llama.cpp" Environment

### Downloading & Building llama.cpp

First, clone the llama.cpp repository locally.
```shell
git clone https://github.com/ggml-org/llama.cpp
```

Next, build llama.cpp.  
(Be sure to turn on the flag to use the GPU.)
```shell
cd llama.cpp
cmake -B build -S . -DGGML_CUDA=on
cmake --build build --config Release
```

Your build probably failed for some of you when running the above.  
I'll introduce a few sticking points.

### Sticking Point #2

Actually, this is mentioned in the llama.cpp [documentation](https://github.com/ggml-org/llama.cpp/blob/master/docs/build.md), but for some reason—perhaps due to poor integration between the CUDA Toolkit and MSBuild—some files required for the build aren't being copied from the CUDA Toolkit to the MSBuild side, causing the build to fail.

Here's how to fix it.  
Open the following folder (for CUDA Toolkit 12.8):
```shell
C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.8\extras\visual_studio_integration\MSBuildExtensions
```
The four files below are stored in that folder.  
![](https://gyazo.com/3f496247119b9ae3a2abdc752d13e537.png)
Copy all four of these files into the following folder:
```shell
C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\MSBuild\Microsoft\VC\v170\BuildCustomizations
```
This was also discussed [here](https://github.com/NVlabs/tiny-cuda-nn/issues/164) and [here](https://www.insurtechlab.net/run_llm_on_localmachine_using_lama_cpp_python/).  
Interestingly, the four files mentioned earlier were stored in "C:\Program Files (x86)\MSBuild\Microsoft.Cpp\v4.0\BuildCustomizations", but…  
It seems some configuration is missing for a proper installation.

### Sticking Point #3

If you could build with the above, great, but in my environment I got an error saying "libcurl not found!", and the build failed.  
There's a warning that says, "If you don't want to use CURL, add the -DLLAMA_CURL=OFF option," so I did the following and the build succeeded.
```shell
cmake -B build -S . -DGGML_CUDA=on -DLLAMA_CURL=OFF
cmake --build build --config Release
```
However, with this setup the llama command can't download models from the network while running the LLM.  
In other words, you'd have to manually download the model to your local PC every time before using the LLM.  
I didn't want that, so I looked for a way to install the curl library.  
Apparently, you can use something called "vcpkg" to install the curl library.  
Using the information from [here](https://kinoshita-hidetoshi.github.io/Programing-Items/C++/network/curl.html#1-2._Windows), I installed the library.

First, clone the vcpkg repository.
```shell
git clone https://github.com/Microsoft/vcpkg.git
```
Next, generate the vcpkg executable.
```shell
cd vcpkg
bootstrap-vcpkg.bat
```
Install the curl library.
```shell
vcpkg install curl:x64-windows
```
You might think you're done, but integration with Visual Studio is still missing, so run integration.
```shell
vcpkg integrate install
```
After doing this, curl will finally be usable by MSBuild.

Just to be sure, verify the presence of the library by running:
```shell
vcpkg list
```
If CURL appears in the list, it seems ready to use.
![](https://gyazo.com/f211bdfdb6aaabcb96bc181653b735b7.png)

However, when building the curl library with vcpkg I saw a message saying, "You need to specify the toolchain file to use the library."  
It seems you need to add `-DCMAKE_TOOLCHAIN_FILE="<path to cloned vcpkg>/scripts/buildsystems/vcpkg.cmake"` to the CMake arguments.  
Since I put vcpkg in "C:/ProgramData/vcpkg", I did the following:
```shell
-DCMAKE_TOOLCHAIN_FILE="C:/ProgramData/vcpkg/scripts/buildsystems/vcpkg.cmake"
```
Congratulations!  
You've finally emerged from the very long tunnel.  
The final commands that succeeded in the build were:
```shell
git clone https://github.com/ggml-org/llama.cpp
cd llama.cpp
cmake -B build -S . -DGGML_CUDA=on -DCMAKE_TOOLCHAIN_FILE="C:/ProgramData/vcpkg/scripts/buildsystems/vcpkg.cmake"
cmake --build build --config Release
```

### Sticking Point – Aside

llama.cpp can also run without a GPU.  
At first, I built it without the `-DGGML_CUDA=on` flag, and while llama.cpp did run, I wondered why the GPU wasn't being used at all.  
Always read the [documentation](https://github.com/ggml-org/llama.cpp/blob/master/docs/build.md) properly, right? (Lesson learned.)

### Sticking Point – Aside #2

Have you all noticed yet...?  
I downloaded and installed vcpkg myself, but it turns out that when I installed the MSBuild Tools, vcpkg was already included.  
![](https://gyazo.com/eaed4071ce7e0d98495afa8ced17961f.png)  
However, since I had already done the build above, I didn't re-adjust.  
Next time I set up an environment (if there is a next time), I'll be more careful.

## Downloading and Running the DeepSeek Model

At this point, I'm already full from all the environment setup, but let's pull ourselves together and move forward.  
It's finally time to use the DeepSeek model.  
Considering the VRAM limitation of the GPU in use (GTX 970), a 7B quantized model is the realistic option.  
Search for models on HuggingFace.  
The [R1 7B-Q3_K_M model](https://huggingface.co/roleplaiapp/DeepSeek-R1-Distill-Qwen-7B-Q3_K_M-GGUF) looks just right.  
Download the file below from the above page:  
`DeepSeek-R1-Distill-Qwen-7B-Q3_K_M.gguf`  
Place this file in the `llama.cpp/models` folder.

Alright, finally it's time to run!  
Run the following command to start the DeepSeek model:
```shell
cd llama.cpp
.\build\bin\release\llama-run .\models\DeepSeek-R1-Distill-Qwen-7B-Q3_K_M.gguf
```
If the text output in the terminal becomes garbled, it's likely an issue with UTF-8 and Shift-JIS.  
Running the command below seems to resolve those UTF-8 and SJIS problems.  
(I'm being pretty forceful about the workaround at this point.)
```shell
chcp 65001
```
As soon as you run the DeepSeek model, a prompt appears.  
I hadn't prepared anything, so I typed whatever came to mind.  
(Pretty unplanned, I know.)  
My prompt was: "Tell me what you know about Momotaro."  
![](https://gyazo.com/9b10107f20560501dcfb48cade5eb4f8.png)  
I got a pretty out-there answer.  
It was a "I have no idea what it's saying" situation.

Maybe the llama.cpp build was incomplete, maybe my GPU is too weak, maybe the parameters I gave are insufficient, or maybe I picked the wrong model.  
Let's try a different model for comparison.  
I had ChatGPT pick a random model. The chosen model is `Llama-3.2-1B-Instruct-Q4_K_M.gguf`.  
Download this one from HuggingFace as well.  
Then let's run it.  
![](https://gyazo.com/1b5d6727f8c51a22c94189031114921b.png)  
Hmm. This is a bit more coherent, but it's still pretty bad.  
The "battle" part might be somewhat correct. (He’s supposed to fight demons, but who on earth is this Momotaro fighting?)

At this point, I'm getting more interested in the content than the environment setup.  
(It also didn't help that it was past 2 AM when I was testing.)

Let's do a comparison using Ollama, referring to [this article](/blogs/2025/02/20/ollama_local_llm/) on the Mamezou Developer Site.  
(I'll omit the Ollama installation steps.)

Run the llama3.2 model and ask the same question:
```shell
ollama run llama3.2
```
![](https://gyazo.com/21b59fb80b56a1b340e2cbaf4658d3b7.png)  
**Wahahahaha! LOL!**  
(It's a little scary to be laughing alone past 2 AM, though.)  
Maybe Momotaro = battle is the image it has.

Ah, no, no, that's not what I wanted to do.

Let's try the same with the DeepSeek model using Ollama.
```shell
ollama run deepseek-r1:1.5b
```
![](https://gyazo.com/ccc079d92e6b7eeea479afda5e5a79a8.png)  
Hmm. It answered entirely in Chinese.  
I can understand some Chinese, but it seems unrelated to the story of Momotaro.

### Putting the System Under Load

Since I went through all the effort to get the environment running on a GPU, I want to see if adding load affects the response speed.  
I asked ChatGPT "How can I put load on the GPU?" and it suggested running the command below.  
Let's try running it.
```shell
.\build\bin\release\llama-run .\models\DeepSeek-R1-Distill-Qwen-7B-Q3_K_M.gguf -t 8 -ngl 99
```
![](https://gyazo.com/9323f728a4df633fe239189dcc9f01e0.png)  
The answer quality was still terrible, but the response speed only dropped slightly.  
![](https://gyazo.com/2abb798088685f73f4071419c8293f38.png)  
I have the mid-tower PC right next to me, and the GPU board's fan was spinning like crazy.  
Even so, I could use the rest of the system with no particular lag.  
GPU is truly formidable.

## Summary

Due to my lack of knowledge, I realized that there are issues with model selection and operation.  
However, I believe I have gained a certain level of insight into building an environment using a GPU.

As for "Did I benefit from using the GPU?", that's a bit debatable.  
However, the overall performance degradation of the PC was less than when running on the CPU (no surprise, since the GPU was doing the work).  
When I ran everything on the CPU, I often couldn't even move the mouse smoothly, but when I let the GPU handle it, I experienced no particular lag even over remote desktop.  
With a higher-end GPU, performance would probably be even better.  
Since the main goal this time was "trying out the environment setup" (kind of forced), I'll conduct practical tests after acquiring a more powerful GPU.

Regarding llama.cpp, unless you master CUDA Toolkit configuration, I think you're much better off using Ollama or llama-cpp-python.

And I strongly felt that setting up a development environment on Windows is really cumbersome.  
The PC I used for testing is running Windows 10, so after support for Windows 10 ends, I plan to switch the OS to Ubuntu and build a new environment there.

<style>
img {
    border: 1px gray solid;
}
</style>
