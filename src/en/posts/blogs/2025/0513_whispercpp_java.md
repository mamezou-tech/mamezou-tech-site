---
title: Transcribing Audio Data Locally in Java with Whisper
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

# Introduction

There is a high demand in many situations for transcribing audio data into text. OpenAI's OSS [Whisper](https://github.com/openai/whisper) has garnered attention as a high-precision speech recognition model and is relatively easy to use in a Python environment. However, there may be cases where you need to use Whisper from a Java environment due to business requirements or existing systems.

I myself encountered a situation in a Java-based project where I wanted to transcribe audio data, and I explored whether I could somehow use Whisper from Java. During my investigation, I discovered the lightweight C++ implementation of Whisper called [whisper.cpp](https://github.com/ggml-org/whisper.cpp) and a JNI (Java Native Interface) wrapper library called [WhisperJNI](https://github.com/GiviMAD/whisper-jni) for calling it from Java, so I decided to give it a try. Also, since whisper.cpp supports encoding using the OpenBLAS linear algebra library [OpenBLAS](http://www.openmathlib.org/OpenBLAS/), I verified whether using this library could accelerate processing in a CPU-only environment.

In this article, I summarize the research and implementation code conducted during that process. I hope this will serve as a reference for those looking to use Whisper from Java.

:::info:Execution Environment
- OS: Windows 11 (24H2)
- CPU: Intel Core i7-1185G7 (4 cores, 8 threads)
- Memory capacity: 16GB
- Graphics card: None

This time, we will conduct the verification in a Windows environment using only the CPU.
:::

# Trying whisper.cpp via CLI

**(If you want to see the implementation of WhisperJNI right away, feel free to skip this section.)**

Before using WhisperJNI, let's directly try whisper.cpp to confirm the transcription functionality. We will use the `whisper-cli` provided by whisper.cpp to perform transcription from the command line.

To use this command, you need to build it first by executing the following. (CMake must be installed in advance.)

```sh
git clone https://github.com/ggml-org/whisper.cpp.git
cd whisper.cpp
cmake -B build
cmake --build build --config Release
```

:::info
We are using the latest version 1.7.5 of whisper.cpp at the time of writing.
:::

If it completes without issues, `build/bin/Release/whisper-cli.exe` will be created.

Next, let's obtain the Whisper model data.

In whisper.cpp, Whisper model data must be in the ggml format. Pre-converted data is available on Huggingface, so download it from the following:

[ggerganov/whisper.cpp](https://huggingface.co/ggerganov/whisper.cpp/tree/main)

This time, we will try `ggml-large-v3-turbo.bin` and `ggml-base.bin`.

:::info
On the above site, there are also quantized and lightweight model data such as `ggml-large-v3-turbo-q5_0.bin` and `ggml-base.en-q5_1.bin`, so choose the one that matches your environment's memory capacity. You can also create your own quantized models using the `build/bin/quantize.exe` command provided by whisper.cpp. (See [Quantization](https://github.com/ggml-org/whisper.cpp?tab=readme-ov-file#quantization))
:::

## Results

Now, let's try transcribing.

### Japanese Audio

This time, we will use the sample Japanese audio publicly available here:  
[Sample Audio/Free Download](https://pro-video.jp/voice/announce/)  

We will use track G-08.

First, let's run with the `large-v3-turbo` model. Specify the number of threads as 8, which is the maximum supported by the current environment.

```sh
$ .\build\bin\Release\whisper-cli.exe -m c:\Path\to\ggml-large-v3-turbo.bin -f c:\Path\to\g_08.mp3 -t 8

... (output truncated) ...

[00:00:00.000 --> 00:00:07.500]   では当社の概要と業務についてご紹介いたします
[00:00:07.500 --> 00:00:19.420]   今世界的規模で地球環境の保護 CO2削減などが叫ばれていますがいずれもまだまだ進んでいないのが現状です
[00:00:20.700 --> 00:00:32.340]  当社ではFA機器の開発・製造を自社独自の合理化技術により省力化・見える化するファインプログラムシステムを開発
[00:00:32.340 --> 00:00:39.740]  見える化することにより材料の無駄をなくし環境保全に優れた効果を発揮します


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

The higher-end model yields very good transcription accuracy. However, it took about 98 seconds to transcribe a 43-second audio clip, which feels slow.

Next, let's try the lighter `base` model.

```sh
$ .\build\bin\Release\whisper-cli.exe -m c:\Path\to\ggml-base.bin -f c:\Path\to\g_08.mp3 -t 8

... (output truncated) ...

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

The processing time dropped to 19 seconds, but the transcription was inexplicably translated into English. It seems automatic language detection didn't work correctly.

Since you can specify the language via an option, let's set it to Japanese.

```sh
$ .\build\bin\Release\whisper-cli.exe -m c:\Path\to\ggml-base.bin -f c:\Path\to\g_08.mp3 -l ja -t 8

... (output truncated) ...

[00:00:00.000 --> 00:00:08.800]  それでは、当社の概要と業務についてご紹介いたします。
[00:00:08.800 --> 00:00:12.800]  今、世界的規模で、地球環境の保護、
[00:00:12.800 --> 00:00:15.800]  CO2作言などが避けばれていますが、
[00:00:15.800 --> 00:00:20.800]  いずれもまだまだ進んでいないのが現状です。
[00:00:20.800 --> 00:00:27.560]  当社では,FA危機器の開発、製造を、地社独自の合理化技術により、
[00:00:27.560 --> 00:00:33.000]  勝力化、見える化する、ファインプログラムシステムを開発。
[00:00:33.000 --> 00:00:36.800]  見える化することにより、材料の無駄を無くし、
[00:00:36.800 --> 00:00:40.800]  環境保全に優れた効果を発揮します。


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

There are some kanji errors, but the results are roughly correct.

### English Audio

Let's also try with English audio using "AUDIO SAMPLE 1" available here:  
[Audio Samples](https://global.oup.com/us/companion.websites/9780195300505/audio/audio_samples/)

```sh
$ .\build\bin\Release\whisper-cli.exe -m c:\Path\to\ggml-large-v3-turbo.bin -f c:\Path\to\EnglishSample.mp3 -t 8

... (output truncated) ...

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

This also produced high-accuracy results. Transcribing a 57-second audio clip took about 130 seconds.

Next, let's try the lighter `base` model.

```sh
$ .\build\bin\Release\whisper-cli.exe -m c:\Path\to\ggml-base.bin -f c:\Path\to\EnglishSample.mp3

... (output truncated) ...

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

The `base` model handled English audio without issues, and it finished in 11 seconds, which is fast.

# Trying the whisper.cpp JNI Wrapper Library

Having confirmed the transcription results using the whisper.cpp CLI, let's now try the library [WhisperJNI](https://github.com/GiviMAD/whisper-jni), which allows using whisper.cpp via JNI in Java.

The latest version of this library includes the native whisper.cpp library (on Windows, `whisper.dll`) for **whisper.cpp v1.7.1** by default, so you can use it by simply importing this JNI library into your Java project.

Add the following to `pom.xml` to import it:

```xml:pom.xml
        <dependency>
            <groupId>io.github.givimad</groupId>
            <artifactId>whisper-jni</artifactId>
            <version>1.7.1</version>
        </dependency>
```

## Execution Code

Below is a program that reads the whisper model file and the audio data file, and saves the transcription results to a text file.

Because the interface is at the level of individual C++ functions, you need to implement detailed control yourself for reading files, passing them to native functions, and output processing.

Specify the path to the whisper model file in the `modelPath` variable, and the path to the audio file in the `audioPath` variable.

The audio data used in the CLI verification above was in mp3 format, but the current WhisperJNI only supports wav files with a sample bit depth of 16 bits, so convert it using the `ffmpeg` command as follows:

```sh
ffmpeg -i g_08.mp3 -ar 16000 -ac 1 -c:a pcm_s16le g_08.wav
```

Here is the Java code for transcription. The execution options specify Japanese (`ja`) and use 8 threads.

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
        WhisperJNI.setLibraryLogger(null); // capture/disable whisper.cpp log
        var whisper = new WhisperJNI();
        float[] samples = readAudio(new File(audioPath));
        try (var ctx = whisper.init(Path.of(modelPath))) {
            var params = new WhisperFullParams();
            params.language = "ja"; // Japanese
            params.nThreads = 8; // Number of threads

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
        // sample is a 16 bit int 16000hz little endian wav file
        try (AudioInputStream audioInputStream = AudioSystem.getAudioInputStream(file)) {
            // read all the available data to a little endian capture buffer
            ByteBuffer captureBuffer = ByteBuffer.allocate(audioInputStream.available());
            captureBuffer.order(ByteOrder.LITTLE_ENDIAN);
            int read = audioInputStream.read(captureBuffer.array());
            if (read == -1) {
                throw new IOException("Empty file");
            }
            // obtain the 16 int audio samples, short type in java
            var shortBuffer = captureBuffer.asShortBuffer();
            // transform the samples to f32 samples
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

:::info:Reference Code
The [test code](https://github.com/GiviMAD/whisper-jni/blob/main/src/test/java/io/github/givimad/whisperjni/WhisperJNITest.java) is helpful as an implementation reference.

When reading the audio file and passing data to the native function, since the audio file's sample bit depth is 16 bits, you need to read the file in Java shorts (16-bit) and pass it as a float array normalized to the range -1 to 1. The conversion is done in the `readAudio` function above.
:::

## Results

Executing this will output the transcription results to a file. The file contents were as follows:

```plaintext:output.txt
Now, let me introduce our company's overview and business.
On a global scale, the protection of the Earth's environment
and CO2 reduction are being called for,
but in reality, neither is progressing sufficiently.
At our company, we have developed the Fine Program System to streamline and visualize
the development and manufacturing of FA equipment using our proprietary rationalization technology.
By visualizing processes, we eliminate material waste
and achieve excellent effects in environmental conservation.
 Vertraue und glaube, es hilft, es heilt die göttliche Kraft!
```

One segment is output per line. An unrelated phrase appears in the last segment. Since running it multiple times yields the same result, the variance seems low, but because the last few seconds of the audio contain only background music and no voice, I suspect that part influenced the output.

Here is the result when running it with the English audio file:

```plaintext:output.txt
 Your hands lie open in the long, fresh grass.
 The finger points look through like rosy blooms.
 The eyes smile peace.
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

Again, because the last few seconds were silent, unrelated text was output in the transcription.

The above results differ from the CLI execution due to version differences, so I will leave the investigation at this point.

# Accelerated Performance Testing with OpenBLAS

The execution speed in Java was not significantly different from running via the CLI. As mentioned in the CLI results, the `large-v3-turbo` model provides good accuracy but has a long processing time.

Looking at the whisper.cpp documentation, I found instructions for using the [OpenBLAS] linear algebra library to accelerate encoding, so I decided to try it. (Reference [BLAS CPU support via OpenBLAS])

Perform the following steps:
> 1. Download and extract "OpenBLAS-0.3.29_x64_64.zip" from the "Binary Packages" link on OpenBLAS's homepage.
> 2. Add the `bin` folder from the extracted files to the `PATH` environment variable.
> 3. In a terminal, navigate to the whisper.cpp repository.
> 4. Execute the following to build whisper.cpp with OpenBLAS enabled. Since I plan to verify from Java, build version v1.7.1 of whisper.cpp, which is supported by the current WhisperJNI.
>     ```sh
>     git checkout v1.7.1
>     cmake -B build -DGGML_BLAS=1 -DBLAS_LIBRARIES=C:\Path\to\OpenBLAS-0.3.29_x64_64\lib\libopenblas.lib -DBLAS_INCLUDE_DIRS=C:\Path\to\OpenBLAS-0.3.29_x64_64\include
>     cmake --build build -j --config Release
>     ```
> 5. Place `whisper.dll` and `ggml.dll` generated under `build\bin\Release` in any directory included in the `PATH` environment variable.

WhisperJNI will automatically load native libraries found in directories on the PATH, so running the above Java program in this state will execute with OpenBLAS enabled.

## Results

The audio data used is the same 43-second Japanese clip used above. The processing times for the Java program are summarized below. We compare the `large-v3-turbo`, `medium`, and `base` models with and without OpenBLAS enabled:

| Model           | Without OpenBLAS | With OpenBLAS | Reduction |
| ---             | ---              | ---           | ---       |
| large-v3-turbo  | 107s             | 74s           | 30%       |
| medium          | 85s              | 63s           | 20%       |
| base            | 10s              | 8s            | 20%       |

Enabling OpenBLAS reduced processing time by approximately 20–30%. While not a dramatic speedup, larger models benefit more, making this improvement welcome.

# Conclusion

In this article, I presented the process of verifying the use of WhisperJNI for transcribing audio data with Whisper in a Java environment. As a way to leverage Whisper in environments other than Python—particularly in business systems where Java is widely used—whisper.cpp and its JNI wrapper can be a strong option.

I also touched on how to improve inference performance using OpenBLAS. When considering real-world deployments, such optimizations are often critical.

Since whisper.cpp also supports inference using NVIDIA GPUs, I am curious whether even greater speed improvements can be achieved.

Making high-precision speech recognition technologies like Whisper accessible from Java opens up more opportunities for utilization. With new libraries emerging and ongoing feature improvements, I plan to continue monitoring developments.

I hope this article helps those working on similar challenges.
