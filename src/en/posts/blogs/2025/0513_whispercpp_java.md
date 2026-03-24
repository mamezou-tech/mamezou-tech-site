---
title: Using Whisper Locally to Transcribe Audio Data in Java
author: kotaro-miura
date: 2025-05-13T00:00:00.000Z
tags:
  - whisper
  - OpenBLAS
  - java
  - JNI
image: true
translate: true

---

# Introduction

There is a demand for transcribing audio data into text in many scenarios. Whisper, provided as open source by OpenAI, has attracted attention as a high-accuracy speech recognition model and is relatively easy to use in a Python environment. However, there may be cases where you want to use Whisper from a Java environment due to business or existing system constraints.

In my own work, I encountered a situation where I wanted to transcribe audio data in a Java-based project, so I explored ways to use Whisper from Java. During my research, I discovered whisper.cpp, a lightweight C++ implementation of Whisper, and WhisperJNI, a JNI (Java Native Interface) wrapper library for calling it from Java, and decided to give them a try. Also, since whisper.cpp supports encoding using the OpenBLAS linear algebra library, I tested whether it could accelerate processing even in environments limited to using only the CPU.

In this article, I summarize the research and implementation code from that process. I hope this will serve as a reference for those who want to use Whisper from Java.

:::info:Execution Environment
- OS: Windows 11 (24H2)
- CPU: Intel Core i7-1185G7 (4 cores, 8 threads)
- Memory: 16GB
- Graphics Card: None

This time, we will conduct the tests in a Windows environment using only the CPU.
:::

# Testing whisper.cpp via CLI

**(If you want to jump straight to the WhisperJNI implementation, you can skip this section.)**

Before using WhisperJNI, let's directly use whisper.cpp to verify the audio transcription functionality. We will run audio transcription from the command line using the whisper-cli provided by whisper.cpp.

To use this command, we need to build it first. Execute the following commands (CMake must be installed in advance):

```sh
git clone https://github.com/ggml-org/whisper.cpp.git
cd whisper.cpp
cmake -B build
cmake --build build --config Release
```

:::info
We will use the latest whisper.cpp version 1.7.5 available at this time.
:::

If it completes without any issues, build/bin/Release/whisper-cli.exe will be created.

Next, let's obtain the Whisper model data.

Whisper model data needs to be in ggml format to be loaded by whisper.cpp. The data prepared in this format is available on Hugging Face, so download it from the following link:

https://huggingface.co/ggerganov/whisper.cpp/tree/main

This time, we will try using ggml-large-v3-turbo.bin and ggml-base.bin.

:::info
There are also quantized, lightweight model data such as ggml-large-v3-turbo-q5_0.bin and ggml-base.en-q5_1.bin on the site above, so please choose the one that fits your environment's memory capacity. You can also create your own quantized models by using the build/bin/quantize.exe command provided by whisper.cpp. (For reference: Quantization)
:::

## Execution Results

Now, let's perform the transcription.

### Japanese Audio

This time, for Japanese audio, we will use the sample audio published at the following link: [Sample Audio/Free Download](https://pro-video.jp/voice/announce/)

We will use audio number G-08.

First, let's run with the large-v3-turbo model. We will specify the number of threads with the -t option, setting it to the maximum of 8 that can run concurrently on the current environment.

```sh
$ .\build\bin\Release\whisper-cli.exe -m c:\Path\to\ggml-large-v3-turbo.bin -f c:\Path\to\g_08.mp3 -t 8

Output truncated...

[00:00:00.000 --> 00:00:07.500]   Now, let's introduce our company's overview and business operations.
[00:00:07.500 --> 00:00:19.420]   These days, calls for global environmental protection and CO2 reduction are being made worldwide, but none have progressed sufficiently yet.
[00:00:20.700 --> 00:00:32.340]   Our company has developed the Fine Program System, which streamlines and visualizes the development and manufacturing of FA equipment using our proprietary rationalization technology.
[00:00:32.340 --> 00:00:39.740]   By visualizing processes, it eliminates material waste and demonstrates excellent effects in environmental conservation.


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

The transcription accuracy is very good, probably because we are using a higher-level model. However, I was left with the impression that it was slow, taking about 98 seconds to process a 43-second audio clip.

Next, let's try using the lighter base model.

```sh
$ .\build\bin\Release\whisper-cli.exe -m c:\Path\to\ggml-base.bin -f c:\Path\to\g_08.mp3 -t 8

Output truncated...

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

Processing time was significantly reduced to 19 seconds, but for some reason the transcription result ended up in English. It seems the automatic language detection didn't work correctly.

Since we can specify the language with an option, let's specify Japanese and run it.

```sh
$ .\build\bin\Release\whisper-cli.exe -m c:\Path\to\ggml-base.bin -f c:\Path\to\g_08.mp3 -l ja -t 8

Output truncated...

[00:00:00.000 --> 00:00:08.800]  Now, I will introduce our company's overview and business operations.
[00:00:08.800 --> 00:00:12.800]  Currently, on a global scale, the protection of the global environment,
[00:00:12.800 --> 00:00:15.800]  and CO2 reduction are being called for,
[00:00:15.800 --> 00:00:20.800]  but progress is still far from sufficient in all areas.
[00:00:20.800 --> 00:00:27.560]  At our company, we have developed the Fine Program System that streamlines and visualizes the development and manufacturing of FA equipment using our proprietary rationalization technology.
[00:00:27.560 --> 00:00:33.000]  By visualizing processes, it eliminates material waste
[00:00:33.000 --> 00:00:36.800]  and demonstrates excellent effects in environmental conservation.


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

Since we also want to test English audio data, we'll use "AUDIO SAMPLE 1" from the sample audio published at the following link: [Audio Samples](https://global.oup.com/us/companion.websites/9780195300505/audio/audio_samples/)

```sh
$ .\build\bin\Release\whisper-cli.exe -m c:\Path\to\ggml-large-v3-turbo.bin -f c:\Path\to\EnglishSample.mp3 -t 8

Output truncated...

[00:00:00.000 --> 00:00:05.320]   Your hands lie open in the long fresh grass. The finger points look through like rosy blooms.
[00:00:05.320 --> 00:00:12.440]   Your eyes smile peace. The pasture gleams and glooms neath billowing skies that scatter and amass.
[00:00:12.440 --> 00:00:18.760]   All round our nest, far as the eye can pass, are golden king cup fields with silver edge,
[00:00:18.760 --> 00:00:24.740]   where the cow parsley skirts the hawthorn hedge. Tis visible silence still is the hourglass.
[00:00:25.800 --> 00:01:25.780]   Thank you.


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

I believe we also obtained high-precision results here. It took about 130 seconds to transcribe a 57-second audio clip.

Next, let's try the lighter base model.

```sh
$ .\build\bin\Release\whisper-cli.exe -m c:\Path\to\ggml-base.bin -f c:\Path\to\EnglishSample.mp3

Output truncated...

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

For the English audio, I think the base model handled transcription without issues. It completed in 11 seconds, which is fast.

# Testing whisper.cpp’s JNI Wrapper Library

Now that we've briefly verified the transcription results using the whisper.cpp CLI, let's try a library called WhisperJNI that allows us to use whisper.cpp via JNI.

In the latest version of this library, the whisper.cpp v1.7.1 native library (whisper.dll on Windows) is embedded by default, so you can use it simply by importing this JNI library into your Java project.

Add the following to your pom.xml to import it:

```xml:pom.xml
        <dependency>
            <groupId>io.github.givimad</groupId>
            <artifactId>whisper-jni</artifactId>
            <version>1.7.1</version>
        </dependency>
```

## Execution Code

Below is the program that reads in the whisper model file and audio data file, and saves the transcription results to a text file.

Since the interface is at the C++ function level, it was necessary to implement some detailed control ourselves, such as file reading, passing data to the native function, and output handling.

We specify the path to the whisper model file in the `modelPath` variable and the path to the audio file in the `audioPath` variable.

The audio data used in the CLI test above was in mp3 format, but the current WhisperJNI only supports 16-bit sample wav format, so we convert it using the `ffmpeg` command as follows:

```sh
ffmpeg -i g_08.mp3 -ar 16000 -ac 1 -c:a pcm_s16le g_08.wav
```

Below is the Java code for performing the audio transcription. In the execution options, the language is set to Japanese and 8 threads are specified.

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
[Test code](https://github.com/GiviMAD/whisper-jni/blob/main/src/test/java/io/github/givimad/whisperjni/WhisperJNITest.java) is helpful as an implementation reference.

When reading the audio file and passing it to the native function, since the audio file sample bit depth is 16-bit, it seems you need to read the file in Java's short (16-bit) units and pass it as a float array normalized to the range -1 to 1. The function `readAudio` in the code above performs this conversion.
:::

## Execution Results

When executed, the transcription results are output to a file. The file contents were as follows:

```plaintext:output.txt
Now, I will introduce our company's overview and business operations
These days, calls for global environmental protection
and CO2 reduction are being made,
but none have progressed much yet.
Our company has developed the Fine Program System
that streamlines and visualizes the development and manufacturing of FA equipment using our proprietary rationalization technology.
By visualizing processes, it eliminates material waste
and demonstrates excellent effects in environmental conservation.
 Vertraue und glaube, es hilft, es heilt die göttliche Kraft!
```

One segment is output per line. You can see that the last segment contains words unrelated to the actual audio. Since the result is the same every time I run it, it seems there is little variability due to probabilistic fluctuations. I thought this might be due to the fact that in the actual audio file the last few seconds contain only background music with no voice.

Here is the result when running with the English audio file:

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

In this file too, since the last few seconds were silent with no audio, the transcription result included unrelated sentences.

The output above differs from the CLI execution result, but since the versions are also different and a simple comparison is not possible, I'll leave it at that for now.

# Verifying Performance Improvement with OpenBLAS

The execution speed in Java was not significantly different from the CLI execution. As mentioned in the CLI results, while the large-v3-turbo model has good accuracy, it gives the impression of taking a long time to process.

Looking at the whisper.cpp documentation, there are instructions for encoding using the OpenBLAS linear algebra library, so I decided to give it a try. (Reference: BLAS CPU support via OpenBLAS)

Perform the following steps:

1. Download and extract "OpenBLAS-0.3.29_x64_64.zip" from the "Binary Packages" link on OpenBLAS's homepage.
2. Add the extracted `bin` folder to your PATH environment variable.
3. Navigate to the whisper.cpp repository in the terminal.
4. Execute the following to build whisper.cpp with OpenBLAS enabled. Since I plan to verify it from Java, build at the state of whisper.cpp v1.7.1 supported by the current WhisperJNI:
   ```sh
   git checkout v1.7.1
   cmake -B build -DGGML_BLAS=1 -DBLAS_LIBRARIES=C:\Path\to\OpenBLAS-0.3.29_x64_64\lib\libopenblas.lib -DBLAS_INCLUDE_DIRS=C:\Path\to\OpenBLAS-0.3.29_x64_64\include
   cmake --build build -j --config Release
   ```
5. Place the `whisper.dll` and `ggml.dll` created under `build\bin\Release` in any location included in your PATH environment variable.

WhisperJNI automatically loads native libraries located in a directory on the PATH, so if you run the Java program above in this state, it will execute with OpenBLAS enabled.

## Execution Results

We will use the 43-second Japanese audio data used above. Below is a summary of the processing time when running the Java program. This time, we compare the time for the large-v3-turbo, medium, and base models with and without OpenBLAS.

| Model           | Without OpenBLAS | With OpenBLAS | Reduction |
| --------------- | ---------------- | ------------- | --------- |
| large-v3-turbo  | 107s             | 74s           | 30%       |
| medium          | 85s              | 63s           | 20%       |
| base            | 10s              | 8s            | 20%       |

When OpenBLAS was enabled, we saw roughly a 20–30% reduction in processing time. It may not be a dramatic speed-up, but the larger the model, the more time is saved, so this effect is still welcome.

# Conclusion

In this article, we introduced the process of verifying the use of Whisper from a Java environment using WhisperJNI for audio data transcription. As a means of leveraging Whisper in environments other than Python, especially in languages like Java commonly used in enterprise systems, whisper.cpp and its JNI wrapper can be a powerful option.

We also briefly touched on methods to improve inference performance by verifying acceleration with OpenBLAS. In actual production use, such optimizations will likely become especially important in many scenarios. Since whisper.cpp also supports inference using NVIDIA GPUs, it's worth exploring whether further acceleration can be achieved.

By making high-precision speech recognition technology like Whisper accessible from Java, we can expect it to be applied in many more scenarios. As new libraries emerge and features improve, it's something to keep an eye on in the future.

I hope this article will be of help to those tackling similar challenges.
