---
title: Javaでもローカル環境でWhisperを使って音声データ書き起こしをしたい
author: kotaro-miura
date: 2025-05-13
tags: [whisper, whisper, OpenBLAS, java, JNI]
image: true
---

# はじめに

音声データを文字起こししたいというニーズは多くの場面で存在します。OpenAIがOSSで提供する [Whisper](https://github.com/openai/whisper) は高精度な音声認識モデルとして注目を集めており、Python環境では比較的手軽に利用できます。しかし、業務や既存システムの都合でJava環境からWhisperを使いたいというケースもあるのではないでしょうか。

私自身、Javaベースのプロジェクトで音声データの書き起こしを行いたい場面があり、WhisperをなんとかJavaから使えないかと模索しました。調査を進める中で、C++で実装された軽量なWhisperの実装「[whisper.cpp](https://github.com/ggml-org/whisper.cpp)」と、それをJavaから呼び出すためのJNI（Java Native Interface）ラッパーライブラリの[WhisperJNI](https://github.com/GiviMAD/whisper-jni) の存在を知り、実際に試してみることにしました。
また、whisper.cppは線形代数演算ライブラリである [OpenBLAS](http://www.openmathlib.org/OpenBLAS/) を用いたエンコードに対応しているため、CPUしか使えない環境でもこのライブライリを用いて高速化できるか検証もしてみました。

本記事では、その際に行った調査や実装コードなどをまとめています。JavaからWhisperを使いたいと考えている方の参考になれば幸いです。

:::info:実行環境
- OS : Windows 11 (24H2)
- CPU Intel Core i7-1185G7 (4コア 8スレッド)
- メモリ容量：16GB
- グラフィックボード：なし

今回はWindows環境でCPUのみを使って検証していきます。
:::

# whisper.cppのCLIで試す

**（WhisperJNIの実装をすぐに見たいという方はこのセクションは読み飛ばしてもらって大丈夫です）**

WhisperJNIを使う前に、音声書き起こしの動作確認としてwhisper.cppを直接使ってみます。
whisper.cppで用意されている `whisper-cli` を用いてコマンドラインから音声書き起こしを実行してみます。

このコマンドを利用するにはビルド作業が必要なのでまず以下を実行します。（事前にCMakeの導入が必要です）

```sh
git clone https://github.com/ggml-org/whisper.cpp.git
cd whisper.cpp
cmake -B build
cmake --build build --config Release
```

:::info
現時点でのwhisper.cppの最新版1.7.5を用います。
:::

問題なく完了すれば `build/bin/Release/whisper-cli.exe` が作成されます。

次にWhisperモデルデータを取得しておきます。

Whisperモデルデータはwhisper.cppではggml形式にして読み込む必要があります。以下Huggingfaceに作成済みのデータが公開されているのでダウンロードします。

[ggerganov/whisper.cpp](https://huggingface.co/ggerganov/whisper.cpp/tree/main)

今回は `ggml-large-v3-turbo.bin` と `ggml-base.bin` を使ってみます。

:::info
上記サイトに`ggml-large-v3-turbo-q5_0.bin`、`ggml-base.en-q5_1.bin`など量子化して軽量化したモデルデータなどもありますので環境のメモリ容量に合わせて適切なものをお選びください。
量子化モデルは自分でも作成できて、whisper.cppが提供している `build/bin/quantize.exe` コマンドを用いて作成できます。（参考[Quantization](https://github.com/ggml-org/whisper.cpp?tab=readme-ov-file#quantization)）
:::

## 実行結果

では、音声書き起こしをしてみましょう。

### 日本語音声

今回は日本語の音声ファイルとして以下で公開されているサンプル音声を使います。
[サンプル音声/無料ダウンロード](https://pro-video.jp/voice/announce/)

G-08番の音声を使ってみます。

最初は `large-v3-turbo` を使って実行してみます。オプションでスレッド数を今の実行環境で同時に実行できる最大の8に指定します。

```sh
$ .\build\bin\Release\whisper-cli.exe -m c:\Path\to\ggml-large-v3-turbo.bin -f c:\Path\to\g_08.mp3 -t 8

出力途中省略...

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

上位モデルを使っているのもあって書き起こしの精度はとても良いと思います。しかし43秒の音声データに対して書き起こし処理に約98秒かかるというのは遅いなという印象です。

次に軽いモデルの`base`モデルを使ってみます。

```sh
$ .\build\bin\Release\whisper-cli.exe -m c:\Path\to\ggml-base.bin -f c:\Path\to\g_08.mp3 -t 8

出力途中省略...

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

処理時間は19秒とかなり短くなりましたが、書き起こし結果がなぜか英語翻訳されたものになってしまいました。
言語の自動判別が上手くいかないようです。

オプションで言語指定ができるので日本語を指定して実行してみます。

```sh
$ .\build\bin\Release\whisper-cli.exe -m c:\Path\to\ggml-base.bin -f c:\Path\to\g_08.mp3 -l ja -t 8

出力途中省略...

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

漢字間違いなどありますが大体合っている結果が得られました。

### 英語音声

英語音声データでも試してみたいので以下で公開されているサンプル音声の「AUDIO SAMPLE 1」を使います。
[Audio Samples](https://global.oup.com/us/companion.websites/9780195300505/audio/audio_samples/)

```sh
$ .\build\bin\Release\whisper-cli.exe -m c:\Path\to\ggml-large-v3-turbo.bin -f c:\Path\to\EnglishSample.mp3 -t 8

出力途中省略...

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

こちらも高い精度の結果が得られたと思います。57秒の音声データに対して書き起こし処理に約130秒かかりました。

次に軽いモデルの`base`モデルを使ってみます。

```sh
$ .\build\bin\Release\whisper-cli.exe -m c:\Path\to\ggml-base.bin -f c:\Path\to\EnglishSample.mp3

出力途中省略...

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

英語の方ではbaseモデルでも問題なく書き起こしできていると思います。11秒で処理が完了して速いです。

# whisper.cppのJNIラッパライブラリを試す

簡単にではありますがwhisper.cppのCLIを使って音声書き起こしの処理結果を確認できたところで、続いてwhisper.cppをJNI経由で利用できるようにする [WhisperJNI](https://github.com/GiviMAD/whisper-jni) というライブラリを試したいと思います。

このライブラリの最新版では**whisper.cpp v1.7.1**のネイティブライブラリ(Windowsの場合`whisper.dll`)がデフォルトで組み込まれているので、このJNIライブラリをJavaプロジェクトにインポートするだけで利用できるようになります。

`pom.xml`に以下を追加してインポートします。

```xml:pom.xml
        <dependency>
            <groupId>io.github.givimad</groupId>
            <artifactId>whisper-jni</artifactId>
            <version>1.7.1</version>
        </dependency>
```


## 実行コード

以下にwhisperモデルファイルと音声データファイルを読込み、音声書き起こし結果をテキストファイルに保存するプログラムを掲載します。

C++側の関数単位でのインターフェースとなっていてるのでファイル読込みからネイティブ関数への引き渡しや出力処理など、少し細かい制御を自前で実装する必要がありました。

`modelPath` 変数にwhisperモデルファイルへのパス、`audioPath` 変数に音声ファイルへのパスを指定しています。

上記CLIの検証で利用した音声データはmp3形式でしたが、現状のWhisperJNIは対応している音声ファイル形式はサンプルビット数が16bitのwav形式のみだったので以下のように`ffmpeg`コマンドを使って変換します。

```sh
ffmpeg -i g_08.mp3 -ar 16000 -ac 1 -c:a pcm_s16le g_08.wav
```

以下が音声書き起こしするJavaコードです。実行オプションで言語は日本語、8スレッド利用する指定をしています。

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
            params.language = "ja"; // 日本語
            params.nThreads = 8; // スレッド数

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

:::info:参考コード
[テストコード](https://github.com/GiviMAD/whisper-jni/blob/main/src/test/java/io/github/givimad/whisperjni/WhisperJNITest.java) が実装の参考になります。

音声ファイルを読み込んでネイティブ関数に渡すときは、音声ファイルのサンプルビット数が16bitということで、Javaのshort(16ビット)型の単位でファイルを読込み、-1～1の範囲で規格化したfloat配列として渡す必要があるようです。上記コード内の関数`readAudio`にて変換処理を行っています。
:::

## 実行結果

実行すると書き起こし結果がファイル出力されます。ファイル内容は以下となりました。

```plaintext:output.txt
それでは当社の概要と業務についてご紹介いたします
今世界的規模で地球環境の保護
CO2削減などが叫ばれていますが
いずれもまだまだ進んでいないのが現状です
当社ではFA機器の開発製造を自社独自の合理化技術により
省力化・見える化するファインプログラムシステムを開発
見える化することにより材料の無駄をなくし
環境保全に優れた効果を発揮します
 Vertraue und glaube, es hilft, es heilt die göttliche Kraft!
```

1行ごとに1つのセグメントを出力しています。
最後のセグメントに実際の音声とは関係のない単語が出力されていますね。何度実行しても同じ結果となるので確率的な結果のブレとかは少ないみたいなのですが、音声ファイルの内容的に最後の数秒間BGMだけが流れて声が入っていない部分があるので、その部分の影響があるのなと思いました。

英語音声ファイルの場合でも実行した結果が以下です。

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

こちらのファイルでも最後の数秒が音声の入っていない無音だったためか書き起こし結果にも関係のない文章が出力されてしまいました。

上記出力結果はCLI実行した結果と違っていますがバージョンも違っていて単純な比較ができないのでとりあえずこんなものなのかというところで調査は留めておきます。

# OpenBLASによる高速化検証

Javaによる実行速度はCLI実行の場合と大きくは変わりありませんでした。CLI実行結果でも述べたように`large-v3-turbo`モデルは精度が良い反面処理時間が長いなという印象です。

whisper.cppのドキュメントを見てみると、線形代数演算ライブラリの[OpenBLAS](http://www.openmathlib.org/OpenBLAS/)を用いてエンコードするための手順が書いてあったので試してみたいと思います。
（参考 [BLAS CPU support via OpenBLAS](https://github.com/ggml-org/whisper.cpp/tree/master?tab=readme-ov-file#blas-cpu-support-via-openblas)）

以下の手順を実施します。

> 1. OpenBLASの[HP](http://www.openmathlib.org/OpenBLAS/)の「Binary Packages」のリンク先から「OpenBLAS-0.3.29_x64_64.zip」をダウンロード&展開します。
> 1. 展開されたファイルの中の `bin` フォルダを環境変数`PATH`に追加します。
> 1. ターミナル上でwhisper.cppのリポジトリに移動します。
> 1. 以下を実行してOpenBLASを有効にした状態でwhisper.cppをビルドします。動作確認をJavaから行おうと思うので、現行のWhisperJNIが対応しているwhisper.cpp v1.7.1の状態でビルドします。
>     ```sh
>     git checkout v1.7.1
>     cmake -B build -DGGML_BLAS=1 -DBLAS_LIBRARIES=C:\Path\to\OpenBLAS-0.3.29_x64_64\lib\libopenblas.lib -DBLAS_INCLUDE_DIRS=C:\Path\to\OpenBLAS-0.3.29_x64_64\include
>     cmake --build build -j --config Release
>     ```
> 1. `build\bin\Release`下に作成される `whisper.dll` と `ggml.dll` を環境変数 `PATH` に設定されている場所ならどこでもいいので配置します。

WhisperJNIはPATHが通っている場所に存在するネイティブライブラリを自動で読み込んでくれるのでこの状態で上記のJavaプログラムの実行をすればOpenBLASが有効化された状態で処理実行されます。

## 実行結果

利用する音声データは上でも利用した43秒の日本語データを用います。
Javaプログラム実行した処理時間を以下にまとめます。今回は`large-v3-turbo`、`medium`、`base`モデルに関して、OpenBLASありとなしの場合のその時間を比較しています。

| モデル | OpenBLASなし | OpenBLASあり | 短縮率 |
| --- | --- | --- | --- |
| large-v3-turbo | 107秒 | 74秒 | 30% |
| medium | 85秒 | 63秒 | 20% |
| base | 10秒 | 8秒 | 20% |

OpenBLASを有効化した場合におおよそ20～30%処理時間が短縮される結果が得られました。劇的に速くなったとは言えないかもですが大きなモデル程短縮される時間が増えるのでこの効果でも嬉しいですね。

# おわりに

本記事では、Java環境でWhisperを使って音声データの書き起こしを行うために、WhisperJNIを用いた検証の過程をご紹介しました。Python以外の環境、とりわけJavaのような業務システムで多く使われる言語でWhisperを活用できる手段として、whisper.cppとそのJNIラッパーは有力な選択肢となり得ます。

また、OpenBLASを用いた高速化の検証を通じて、推論処理のパフォーマンスを向上させる手法についても簡単に触れました。実運用を見据えた際には、こうした最適化が特に重要になってくる場面も多いと思われます。
whisper.cppはNVIDIA GPUを用いた推論処理にも対応しているのでより高速化できるのかどうかも気になるところです。

Whisperのような高精度な音声認識技術を、Javaからでも扱えるようにすることで、より多くの場面での活用が期待できます。今後も新しいライブラリの登場や機能改善が進んでいくと思われるので、引き続きウォッチしていきたいところです。

本記事が、同様の課題に取り組む方の一助となれば幸いです。