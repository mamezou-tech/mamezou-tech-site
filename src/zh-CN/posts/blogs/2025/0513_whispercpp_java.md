---
title: 在 Java 本地环境中使用 Whisper 进行语音数据转写
author: kotaro-miura
date: 2025-05-13T00:00:00.000Z
tags:
  - whisper
  - whisper
  - OpenBLAS
  - java
  - JNI
image: true
translate: true

---

# 前言

在许多场景中，都存在将语音数据转写为文字的需求。OpenAI 以开源软件形式提供的 [Whisper](https://github.com/openai/whisper) 是一款备受关注的高精度语音识别模型，在 Python 环境中可以比较轻松地使用。然而，出于业务或现有系统的需要，也可能存在希望从 Java 环境中使用 Whisper 的情况。

我本人曾在一个基于 Java 的项目中需要对语音数据进行转写，于是开始探索是否能从 Java 调用 Whisper。在调研过程中，了解到用 C++ 实现的轻量级 Whisper 实现 [whisper.cpp](https://github.com/ggml-org/whisper.cpp) 以及用于从 Java 调用它的 JNI（Java Native Interface）包装库 [WhisperJNI](https://github.com/GiviMAD/whisper-jni)，并实际进行了尝试。另外，whisper.cpp 支持使用线性代数运算库 [OpenBLAS](http://www.openmathlib.org/OpenBLAS/) 进行编码，因此我还验证了在仅能使用 CPU 的环境中，是否能通过该库来加速处理。

本文总结了在此过程中进行的调研和实现代码等，希望能为想在 Java 中使用 Whisper 的朋友提供参考。

:::info:运行环境
- 操作系统：Windows 11 (24H2)
- CPU：Intel Core i7-1185G7 (4 核 8 线程)
- 内存容量：16GB
- 显卡：无

此次在 Windows 环境下，仅使用 CPU 进行验证。  
:::

# 使用 whisper.cpp 的 CLI 进行测试

**（想要马上查看 WhisperJNI 实现的读者可以跳过本节）**

在使用 WhisperJNI 之前，先直接使用 whisper.cpp 来确认语音转写的运行效果。下面使用 whisper.cpp 提供的 `whisper-cli` 在命令行执行语音转写测试。

要使用此命令，需要进行构建操作，因此首先执行以下命令。（事前需安装 CMake）

```sh
git clone https://github.com/ggml-org/whisper.cpp.git
cd whisper.cpp
cmake -B build
cmake --build build --config Release
```

:::info
当前使用 whisper.cpp 最新版 1.7.5。  
:::

如无问题完成后，会生成 build/bin/Release/whisper-cli.exe。

接下来获取 Whisper 模型数据。

在 whisper.cpp 中，需要以 ggml 格式读取 Whisper 模型数据。以下链接的 Huggingface 上已发布了相关数据，可进行下载。

[ggerganov/whisper.cpp](https://huggingface.co/ggerganov/whisper.cpp/tree/main)

这次使用 `ggml-large-v3-turbo.bin` 和 `ggml-base.bin`。

:::info
上述网站中还有 `ggml-large-v3-turbo-q5_0.bin`、`ggml-base.en-q5_1.bin` 等经量化轻量化后的模型数据，可根据环境内存容量选择合适的模型。  
量化模型也可自行创建，可使用 whisper.cpp 提供的 `build/bin/quantize.exe` 命令进行生成。（参考 Quantization）  
:::

## 运行结果

那么，开始进行语音转写。

### 日语音频

这次作为日语音频文件，使用以下公开的示例音频。  
[示例音频/免费下载](https://pro-video.jp/voice/announce/)

使用 G-08 号音频进行测试。

首先使用 `large-v3-turbo` 进行执行。在选项中将线程数指定为当前运行环境可同时执行的最大值 8。

```sh
$ .\build\bin\Release\whisper-cli.exe -m c:\Path\to\ggml-large-v3-turbo.bin -f c:\Path\to\g_08.mp3 -t 8

输出省略...

[00:00:00.000 --> 00:00:07.500]   那么接下来介绍一下本公司的概要和业务
[00:00:07.500 --> 00:00:19.420]   目前在全球范围内对保护地球环境、减少 CO2 等呼声日益高涨，但事实上进展仍不够
[00:00:20.700 --> 00:00:32.340]  我们公司开发了一套通过公司独有的合理化技术实现 FA 设备开发·制造省力化和可视化的 Fine 程序系统
[00:00:32.340 --> 00:00:39.740]  通过可视化消除材料浪费，并发挥出优异的环境保护效果


whisper_print_timings:     load time =  2288.43 ms
whisper_print_timings:     fallbacks =   0 p /   0 h
whisper_print_timings:      mel time =    75.10 ms
whisper_print_timings:   sample time =  1114.81 ms /   858 runs (     1.30 ms per run)
whisper_print_timings:   encode time = 87389.90 ms /     2 runs ( 43694.95 ms per run)
whisper_print_timings:   decode time =    66.43 ms /     6 runs (    11.07 ms per run)
whisper_print_timings:   batchd time =  6460.72 ms /   845 runs (     7.65 ms per run)
whisper_print_timings:   prompt time =   611.46 ms /    79 runs (     7.74 ms per run)
whisper_print_timings:    total time = 98183.85 ms
```

使用高级模型的缘故，转写精度非常好。然而，对于 43 秒的音频数据，转写处理却花费了约 98 秒，给人一种速度较慢的印象。

接下来使用更轻量的 `base` 模型进行测试。

```sh
$ .\build\bin\Release\whisper-cli.exe -m c:\Path\to\ggml-base.bin -f c:\Path\to\g_08.mp3 -t 8

输出省略...

[00:00:00.000 --> 00:00:02.000]   [Music]
[00:00:02.000 --> 00:00:08.000]   Now, let's introduce the concept of the world's technology and the environment of the world.
[00:00:08.000 --> 00:00:20.000]   Now, the world's technology and the environment of the world are being created, but it is still not yet born.
[00:00:20.000 --> 00:00:40.000]   In the meantime, we will introduce the development of the FAA technology and the development of the world's technology, the development of the fine program system, and the development of the materials that are not limited to the material.


whisper_print_timings:     load time =   358.50 ms
whisper_print_timings:     fallbacks =   2 p /   4 h
whisper_print_timings:      mel time =    49.53 ms
whisper_print_timings:   sample time =  2290.90 ms /  2044 runs (     1.12 ms per run)
whisper_print_timings:   encode time =  6582.85 ms /     2 runs (  3291.42 ms per run)
whisper_print_timings:   decode time =   718.40 ms /   116 runs (     6.19 ms per run)
whisper_print_timings:   batchd time =  8721.99 ms /  1914 runs (     4.56 ms per run)
whisper_print_timings:   prompt time =   416.69 ms /   114 runs (     3.66 ms per run)
whisper_print_timings:    total time = 19184.52 ms
```

处理时间缩短到 19 秒左右，但转写结果却莫名地变成了英文翻译版本。看来语言的自动检测并未正常工作。

可以通过选项指定语言，这里指定为日语后再执行一次。

```sh
$ .\build\bin\Release\whisper-cli.exe -m c:\Path\to\ggml-base.bin -f c:\Path\to\g_08.mp3 -l ja -t 8

输出省略...

[00:00:00.000 --> 00:00:08.800]  那么，接下来为您介绍本公司的概要和业务。
[00:00:08.800 --> 00:00:12.800]  当前在全球范围内正在呼吁保护地球环境、
[00:00:12.800 --> 00:00:15.800]  CO2作言等正在被呼喊，但，
[00:00:15.800 --> 00:00:20.800]  我们公司通过地社独有的合理化技术，
[00:00:20.800 --> 00:00:27.560]  开发了用于使 FA 危机器的开发、制造实现勝力化和可视化的 Fine 程序系统。
[00:00:27.560 --> 00:00:33.000]  通过可视化消除材料浪费，
[00:00:33.000 --> 00:00:36.800]  发挥出优异的环境保护效果。


whisper_print_timings:     load time =   199.81 ms
whisper_print_timings:     fallbacks =   0 p /   0 h
whisper_print_timings:      mel time =    42.57 ms
whisper_print_timings:   sample time =   983.68 ms /   994 runs (     0.99 ms per run)
whisper_print_timings:   encode time =  4951.69 ms /     2 runs (  2475.84 ms per run)
whisper_print_timings:   decode time =   174.13 ms /    22 runs (     7.92 ms per run)
whisper_print_timings:   batchd time =  3349.06 ms /   965 runs (     3.47 ms per run)
whisper_print_timings:   prompt time =   205.75 ms /    83 runs (     2.48 ms per run)
whisper_print_timings:    total time =  9940.29 ms
```

虽有汉字错误等，但大体得到了正确的结果。

### 英语音频

由于想在英语音频上也进行测试，这里使用以下公开的示例音频 "AUDIO SAMPLE 1"。  
[音频示例](https://global.oup.com/us/companion.websites/9780195300505/audio/audio_samples/)

```sh
$ .\build\bin\Release\whisper-cli.exe -m c:\Path\to\ggml-large-v3-turbo.bin -f c:\Path\to\EnglishSample.mp3 -t 8

输出省略...

[00:00:00.000 --> 00:00:05.320]   Your hands lie open in the long fresh grass. The finger points look through like rosy blooms.
[00:00:05.320 --> 00:00:12.440]   Your eyes smile peace. The pasture gleams and glooms neath billowing skies that scatter and amass.
[00:00:12.440 --> 00:00:18.760]   All round our nest, far as the eye can pass, are golden king cup fields with silver edge,
[00:00:18.760 --> 00:00:24.740]   where the cow parsley skirts the hawthorn hedge. Tis visible silence still is the hourglass.
[00:00:25.800 --> 00:00:31.200]   Your hands lie open in the long fresh grass. The finger points look through like rosy blooms.
[00:00:31.200 --> 00:00:38.640]   Your eyes smile peace. The pasture gleams and glooms neath billowing skies that scatter and amass.
[00:00:38.640 --> 00:00:45.560]   All round our nest, far as the eye can pass, are golden king cup fields with silver edge,
[00:00:45.560 --> 00:00:52.220]   where the cow parsley skirts the hawthorn hedge. Tis visible silence still as the hourglass.
[00:00:55.800 --> 00:01:25.780]   Thank you.


whisper_print_timings:     load time =  2132.47 ms
whisper_print_timings:     fallbacks =   0 p /   0 h
whisper_print_timings:      mel time =    94.88 ms
whisper_print_timings:   sample time =  1050.25 ms /   979 runs (     1.07 ms per run)
whisper_print_timings:   encode time = 118303.53 ms /     3 runs ( 39434.51 ms per run)
whisper_print_timings:   decode time =    51.89 ms /     4 runs (    12.97 ms per run)
whisper_print_timings:   batchd time =  7149.02 ms /   966 runs (     7.40 ms per run)
whisper_print_timings:   prompt time =   603.97 ms /    99 runs (     6.10 ms per run)
whisper_print_timings:    total time = 129573.25 ms
```

我认为也获得了高精度的结果。对于 57 秒的音频数据，转写处理大约耗时 130 秒。

接下来尝试轻量级的 `base` 模型。

```sh
$ .\build\bin\Release\whisper-cli.exe -m c:\Path\to\ggml-base.bin -f c:\Path\to\EnglishSample.mp3

输出省略...

[00:00:00.000 --> 00:00:02.880]   Your hands lie open in the long-fresh grass.
[00:00:02.880 --> 00:00:05.720]   The finger points look through like rosy blooms.
[00:00:05.720 --> 00:00:07.600]   Your eyes smile peace.
[00:00:07.600 --> 00:00:09.440]   The pasture gleams and glooms
[00:00:09.440 --> 00:00:13.080]   beneath billowing skies that scatter and amass.
[00:00:13.080 --> 00:00:16.280]   All round our nest far as the eye can pass.
[00:00:16.280 --> 00:00:19.160]   Our golden king cup feels with silver edge
[00:00:19.160 --> 00:00:21.960]   where the cow partially skirts the Hawthorn hedge
[00:00:21.960 --> 00:00:25.760]   to his visible silence still is the hourglass.
[00:00:25.760 --> 00:00:28.520]   Your hands lie open in the long-fresh grass.
[00:00:28.520 --> 00:00:31.640]   The finger points look through like rosy blooms.
[00:00:31.640 --> 00:00:33.880]   Your eyes smile peace.
[00:00:33.880 --> 00:00:35.920]   The pasture gleams and glooms
[00:00:35.920 --> 00:00:39.400]   beneath billowing skies that scatter and amass.
[00:00:39.400 --> 00:00:42.680]   All round our nest far as the eye can pass.
[00:00:42.680 --> 00:00:46.080]   Our golden king cup feels with silver edge
[00:00:46.080 --> 00:00:49.120]   where the cow partially skirts the Hawthorn hedge
[00:00:49.120 --> 00:00:52.600]   to his visible silence still is the hourglass.


whisper_print_timings:     load time =   199.79 ms
whisper_print_timings:     fallbacks =   0 p /   0 h
whisper_print_timings:      mel time =    55.89 ms
whisper_print_timings:   sample time =  1127.34 ms /  1035 runs (     1.09 ms per run)
whisper_print_timings:   encode time =  5306.84 ms /     2 runs (  2653.42 ms per run)
whisper_print_timings:   decode time =     0.00 ms /     1 runs (     0.00 ms per run)
whisper_print_timings:   batchd time =  4121.73 ms /  1028 runs (     4.01 ms per run)
whisper_print_timings:   prompt time =   382.59 ms /   121 runs (     3.16 ms per run)
whisper_print_timings:    total time = 11235.30 ms
```

在英语音频上即便使用 base 模型也能正常转写，处理在 11 秒内完成，非常快。

# 试用 whisper.cpp 的 JNI 包装库

虽然只是简单地通过 whisper.cpp 的 CLI 验证了语音转写的处理结果，接下来将试用可通过 JNI 调用 whisper.cpp 的库 [WhisperJNI](https://github.com/GiviMAD/whisper-jni)。

在该库的最新版中，默认已经包含了 whisper.cpp v1.7.1 的本地库（Windows 平台为 `whisper.dll`），因此只需将该 JNI 库导入到 Java 项目中即可使用。

在 `pom.xml` 中添加以下依赖以导入：

```xml:pom.xml
        <dependency>
            <groupId>io.github.givimad</groupId>
            <artifactId>whisper-jni</artifactId>
            <version>1.7.1</version>
        </dependency>
```

## 执行代码

下面列出一个读取 whisper 模型文件和音频数据文件，并将转写结果保存到文本文件的程序。

由于接口是在 C++ 端按函数粒度提供的，所以从文件读取到传递给本地函数以及输出处理等需要自行实现一些细粒度的控制。

在 `modelPath` 变量中指定 whisper 模型文件的路径，在 `audioPath` 变量中指定音频文件的路径。

上文 CLI 验证中使用的音频数据为 mp3 格式，但当前 WhisperJNI 仅支持采样位深为 16bit 的 wav 格式，所以需要使用 ffmpeg 命令进行转换，如下：

```sh
ffmpeg -i g_08.mp3 -ar 16000 -ac 1 -c:a pcm_s16le g_08.wav
```

以下是用于语音转写的 Java 代码。执行时指定语言为日语，并使用 8 个线程。

```java
public class Main {
    public static void main(String[] args) {
        var modelPath = "ggml-large-v3-turbo.bin";
        var audioPath = "g_08.wav";

        try {
            WhisperJNI.loadLibrary();
        } catch (IOException e) {
            e.printStackTrace();
        }
        WhisperJNI.setLibraryLogger(null); // 捕获/禁用 whisper.cpp 日志
        var whisper = new WhisperJNI();
        float[] samples = readAudio(new File(audioPath));
        try (var ctx = whisper.init(Path.of(modelPath))) {
            var params = new WhisperFullParams();
            params.language = "ja"; // 日语
            params.nThreads = 8; // 线程数

            int result = whisper.full(ctx, params, samples, samples.length);

            if (result != 0) {
                throw new RuntimeException("Transcription failed with code " + result);
            }

            int numSegments = whisper.fullNSegments(ctx);

            for (int i = 0; i < numSegments; i++) {
                String text = whisper.fullGetSegmentText(ctx, i);
                saveAppend(text);
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private static float[] readAudio(File file) {
        // 样本为 16 位整数、16000 Hz、Little Endian 的 wav 文件
        try (AudioInputStream audioInputStream = AudioSystem.getAudioInputStream(file)) {
            // 将所有可用数据读取到 Little Endian 捕获缓冲区
            ByteBuffer captureBuffer = ByteBuffer.allocate(audioInputStream.available());
            captureBuffer.order(ByteOrder.LITTLE_ENDIAN);
            int read = audioInputStream.read(captureBuffer.array());
            if (read == -1) {
                throw new IOException("Empty file");
            }
            // 获取 16 位整数音频采样，Java 中为 short 类型
            var shortBuffer = captureBuffer.asShortBuffer();
            // 将采样值转换为 f32 格式
            float[] samples = new float[captureBuffer.capacity() / 2];
            var i = 0;
            while (shortBuffer.hasRemaining()) {
                samples[i++] = Float.max(-1f, Float.min(((float) shortBuffer.get()) / (float) Short.MAX_VALUE, 1f));
            }
            return samples;
        } catch (IOException | UnsupportedAudioFileException e) {
            e.printStackTrace();
        }
        return new float[0];
    }

    public static void saveAppend(String text) {
        try (FileWriter writer = new FileWriter("output.txt", StandardCharsets.UTF_8, true)) {
            writer.write(text  + "\n");
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
```

:::info:参考代码
[测试代码](https://github.com/GiviMAD/whisper-jni/blob/main/src/test/java/io/github/givimad/whisperjni/WhisperJNITest.java) 可作为实现参考。

从音频文件读取并传递给本地函数时，由于音频文件的采样位深为 16bit，需要以 Java 的 short（16 位）类型为单位读取文件，并以 -1~1 范围规范化为 float 数组后再传递。上述代码中的 `readAudio` 函数即完成了该转换处理。
:::

## 运行结果

执行后，转写结果将输出到文件。文件内容如下：

```plaintext:output.txt
那么接下来介绍本公司的概要和业务
目前在全球范围内对保护地球环境
正在呼吁 CO2 减排等
但实际上都尚未取得实质性进展
我们公司通过独有的合理化技术进行 FA 设备的开发和制造
开发了实现省力化和可视化的 Fine 程序系统
通过可视化消除材料浪费
发挥出优异的环境保护效果
 Vertraue und glaube, es hilft, es heilt die göttliche Kraft!
```

每行输出一个分段。  
最后一个分段输出了与实际音频无关的单词。无论执行多少次结果都相同，似乎并不是概率性波动，而是由于音频文件的最后几秒仅播放背景音乐且无语音，这部分可能对结果产生了影响。

在英语音频文件的情况下，执行结果如下。

```plaintext:output.txt
 Your hands lie open in the long, fresh grass.
 The finger points look through like rosy blooms.
 Your eyes smile peace.
 The pasture gleams and glooms neath billowing skies that scatter and amass.
 All round our nest, far as the eye can pass,
 are golden king-cup fields with silver edge.
 Where the cow parsley skirts the hawthorn hedge,
 tis visible silence still is the hourglass.
 Your hands lie open in the long, fresh grass.
 The finger points look through like rosy blooms.
 Your eyes smile peace.
 The pasture gleams and glooms neath billowing skies that scatter and amass.
 All round our nest, far as the eye can pass,
 are golden king-cup fields with silver edge.
 Where the cow parsley skirts the hawthorn hedge,
 tis visible silence still as the hourglass.
 The pasture gleams and glooms neath.
 The pasture gleams and glooms neath.
 The pasture gleams and glooms neath.
 The pasture gleams and glooms neath.
 The pasture gleams and glooms neath.
 The pasture gleams and glooms neath.
```

在该文件中，同样由于最后几秒没有语音而是静音，因此转写结果里也输出了无关的文本。

上述输出结果与 CLI 执行的结果不同，但由于版本不同，无法进行简单对比，因此就先到此为止。

# 基于 OpenBLAS 的加速验证

Java 的执行速度与 CLI 相比并无明显差异。如在 CLI 运行结果中所述，`large-v3-turbo` 模型精度虽高，但处理时间较长。

查看 whisper.cpp 的文档后，发现其中写有使用线性代数运算库 [OpenBLAS](http://www.openmathlib.org/OpenBLAS/) 进行编码的步骤，下面进行尝试。（参考 [BLAS CPU support via OpenBLAS](https://github.com/ggml-org/whisper.cpp/tree/master?tab=readme-ov-file#blas-cpu-support-via-openblas)）

执行以下步骤：

> 1. 从 OpenBLAS 官网“Binary Packages”链接下载并解压 `OpenBLAS-0.3.29_x64_64.zip`。  
> 2. 将解压后的文件中的 `bin` 文件夹加入环境变量 `PATH`。  
> 3. 在终端中切换到 whisper.cpp 仓库目录。  
> 4. 执行以下命令，在启用 OpenBLAS 的状态下构建 whisper.cpp。因为后续会从 Java 进行验证，所以在当前 WhisperJNI 支持的 whisper.cpp v1.7.1 状态下进行构建。  
>     ```sh
>     git checkout v1.7.1
>     cmake -B build -DGGML_BLAS=1 -DBLAS_LIBRARIES=C:\Path\to\OpenBLAS-0.3.29_x64_64\lib\libopenblas.lib -DBLAS_INCLUDE_DIRS=C:\Path\to\OpenBLAS-0.3.29_x64_64\include
>     cmake --build build -j --config Release
>     ```  
> 5. 将 `build\bin\Release` 下生成的 `whisper.dll` 和 `ggml.dll` 放置在环境变量 `PATH` 指向的任意位置。

WhisperJNI 会自动加载 `PATH` 中存在的本地库，因此在此状态下执行上述 Java 程序即可在启用 OpenBLAS 的情况下运行。

## 运行结果

使用音频数据为前面使用的 43 秒日语音频。下面总结 Java 程序执行的处理时间。这次针对 `large-v3-turbo`、`medium` 和 `base` 模型，比较启用与不启用 OpenBLAS 时的耗时。

| 模型               | 不启用 OpenBLAS | 启用 OpenBLAS | 缩短率 |
|--------------------|----------------|--------------|-------|
| large-v3-turbo     | 107 秒         | 74 秒        | 30%   |
| medium             | 85 秒          | 63 秒        | 20%   |
| base               | 10 秒          | 8 秒         | 20%   |

启用 OpenBLAS 后大约缩短了 20%～30% 的处理时间。虽然不能说速度有了飞跃性的提升，但模型越大，缩短的时间越多，因此这一效果也值得高兴。

# 结语

本文介绍了在 Java 环境中使用 Whisper 进行语音数据转写的验证过程，采用 WhisperJNI 进行测试。对于 Python 以外的环境，尤其是像 Java 这样的在业务系统中广泛使用的语言，whisper.cpp 及其 JNI 包装器是一个强有力的选择。

另外，通过使用 OpenBLAS 进行的加速验证，也简单地介绍了提升推理处理性能的方法。在实际运营场景中，这类优化尤其重要。whisper.cpp 也支持基于 NVIDIA GPU 的推理处理，因此能否进一步加速也是值得关注的点。

能够让 Java 也能使用像 Whisper 这样高精度的语音识别技术，期望在更多场景中得到应用。未来随着新库的出现和功能的改进，相信还会有更多进展，需要持续关注。

希望本文能为同样课题的相关人员提供帮助。
