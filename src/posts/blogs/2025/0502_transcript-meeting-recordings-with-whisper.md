---
title: Whisper を使って会議の音声データを文字起こししてみる
author: masahiro-kondo
date: 2025-05-02
tags: [whisper, transcription, LLM]
image: true
---

## はじめに

一昔前は、打合せ議事録は若手社員が一生懸命作成し、先輩方が確認した上でお客様に提出する・・というのが一般的でした。地味に労力がかかる作業でもありました。

最近は Zoom でも Google Meet でも録音を元に文字起こしから議事録作成まで全て AI がやってくれるようになりました。アカウント情報と紐付けて話者特定もされますし、精度もどんどん上がっています（若干微妙な纏めになることもありますが）。オンライン会議の議事録は AI にかなりお任せできる状況になりつつあります。

ただし、すべての会議がそのような環境下で行われるわけではなく、ローカルで録音した音声データから議事録を起こさなければいけないケースもあるかと思います。音声ファイルから文字起こししてくれるオンラインサービスもいくつかありますが、機密保護の観点から音声ファイルをアップロードできないケースや、会議が長すぎて音声ファイルのサイズがサービスのアップロード制限を超えてしまうといったケースもあります[^1]。

[^1]: ChatGPT はプランにもよりますが、25MB の制限があります。

この記事では OpenAI が開発した OSS の自動音声認識 Whisper をローカル環境で使用します[^2]。

[^2]: 筆者は MacBook Pro (M2 Max 12-core) の環境で利用しました。

@[og](https://openai.com/ja-JP/index/whisper/)

:::column:Google AI Studio (Gemini) を使った文字起こし
Google Apps を契約している組織であれば、[Google AI Studio](https://aistudio.google.com/) にファイルをアップロードして、文字起こししてもらうこともできます。自組織の Google ドライブにプロジェクトを作るのでかなり大きなサイズのファイルもアップロードできますし、文字起こし精度も高いです。筆者は最近まで便利に利用していたのですが、この前ひどいハルシネーションを起こし、ありもしない会話内容が生成されたので、今は利用を停止しています。
:::

## Whisper のインストール
Whisper は OpenAI が2022年に発表した OSS で Python で書かれています。

@[og](https://github.com/openai/whisper)

:::info
ChatGPT が提供する文字起こしでは Whisper 単体だけではなく、さらに LLM を使って補完することで読みやすさを向上させているようです。
:::

まずは、Python 環境の準備をします。筆者の環境(macOS)では、あらかじめ Homebrew で Python3 (3.11.3) を導入していました。

音声を扱うためのソフトウェア FFmpeg をインストールします。

```shell
brew install ffmpeg
```

Whisper を稼働させるための Python 環境を venv で作成します。ここでは、whisper-env という名前にしました。

```shell
python3 -m venv whisper-env
```

whisper-env 環境を立ち上げると、シェルのプロンプトに (whisper-env) という環境名が表示されます。

```shell
$ source whisper-env/bin/activate
(whisper-env)
```

以下は、この whisper-env で作業します。必要に応じて pip をインストールします。

```shell
dev pip install -U pip
```

Whisper をインストールします。

```shell
pip install git+https://github.com/openai/whisper.git
```

## Whisper の利用
Whisper の README の以下のセクションに利用可能なモデルと言語のテーブルが纏められています。

[Available models and languages](https://github.com/openai/whisper?tab=readme-ov-file#available-models-and-languages)

マルチリンガル対応で、VRAM が 5GB 程度必要な medium モデルを使うことにしました。対象の音声ファイルを指定し、`--language` オプションで日本語を指定、`--task` オプションで音声のテキスト変換(transcribe)、`--model` オプションに medium を指定して実行します。

```shell
whisper hoge.mp3 --language Japanese --task transcribe --model medium
```

上記の例では、MP3 ファイルを指定していますが、WAV や FLAC 形式なども扱えます。

最初に medium のモデルがダウンロードされます。
```
100%|█████████████████████████████████████| 1.42G/1.42G [09:21<00:00, 2.72MiB/s]
```

文字起こしが始まる前に、以下のようなワーニングが表示されました。

```
/whisper/transcribe.py:132: UserWarning: FP16 is not supported on CPU; using FP32 instead warnings.warn("FP16 is not supported on CPU; using FP32 instead")
```

CPU のみで実行されるため、32ビット浮動小数点数を利用すると言われました（FP16 は GPU に採用される16ビット浮動小数点数）。

ワーニングは出たものの、ターミナルで変換されたテキストがタイムスタンプ付きで流れ始めます。

```
[00:00.000 --> 00:12.000] これくらいですかね、メンバーとしては。今日急にお集まりいただいてて、XXXさんがいなくて。
[00:12.000 --> 00:20.000] はい、ちょっとどういう進め方いいかわかんないですけど。
[00:20.000 --> 00:40.000] この経緯といいますか、xxxxxxx に関して、
  :
```

精度もなかなかいい感じです。

ただ、CPU で実行しているため、会議の実時間に近い感じで、1時間程度の会議なら1時間近くかかり、かなり遅いです。NVIDIA の GPU を積んだマシンで実行するとサクサクなのだと思います。また、Medium ではなく tiny や base などの小さいサイズのモデルを使って速度を重視するという選択肢もあります。

## whisper.cpp のインストール
Python 版の文字起こしが続いている間に、ちょっと調べて、whisper.cpp という OSS を見つけました。

@[og](https://github.com/ggml-org/whisper.cpp)

whisper.cpp は Whisper のモデルを C/C++ に移植したものです。多くのプラットフォームをサポートしており、macOS や Windows、Android や Raspberry Pi でも動作するようです。ネイティブコードにビルドし実行可能なので、動作速度にも期待できます。

インストールは README の [Quick start](https://github.com/ggml-org/whisper.cpp?tab=readme-ov-file#quick-start) にある通りです。

:::info
事前にプラットフォームに合わせた C/C++ のツールチェインを導入しておく必要があります。macOS の場合 Xcode Command Line Tools や cmake、Windows の場合 MSVC ツールセットと MinGW など。
:::

リポジトリを clone します。

```shell
git clone https://github.com/ggml-org/whisper.cpp.git
```

リポジトリ配下に移動してビルドします。

```shell
cd whisper.cpp
cmake -B build
cmake --build build --config Release
```

medium モデルをダウンロードします。

```shell
./models/download-ggml-model.sh medium
```

以下のようなメッセージが出れば、モデルのダウンロードに成功しています。

```
Done! Model 'medium' saved in '/Users/kondoh/dev/whisper.cpp/models/ggml-medium.bin'
```
## whisper.cpp の利用

ビルドされたバイナリ(wisper-cli)を使って文字起こしします。`-m` オプションでダウンロードしたモデルを指定。`-f` で音声ファイルを指定。`-l` オプションで日本語を指定。`-o` で出力形式に通常のテキスト形式と、SRT形式を指定しました。

```shell
./build/bin/whisper-cli -m ./models/ggml-medium.bin -f hoge.mp3 -l ja -otxt -osrt
```

:::info
SRT 形式は 字幕用のファイル形式で、発言ごとに通し番号、タイムスタンプ、発言内容が出力されます。

```
1
00:00:00,000 --> 00:00:11,000
これくらいですかね、メンバーとしては。今日急にお集まりいただいてて、XXXさんがいなくて。

2
00:00:11,000 --> 00:00:17,000
はい、ちょっとどういう進め方いいかわかんないですけど。

3
00:00:17,000 --> 00:00:40,000
この経緯といいますか、xxxxxxx に関して、
```
:::

今回試した音声ファイル(1時間程度の会議)の文字起こしに要した時間は約4分30秒でした。十分実用的なスピードです。マルチコアを活かして `-p` オプションで利用するプロセッサ数を 8 にして実行してみました。

```shell
./build/bin/whisper-cli -m ./models/ggml-medium.bin  -p 8 -f hoge.mp3 -l ja -otxt -osrt
```
このオプション付きだと、約2分8秒で完了しました。かなり効率よく CPU コアを利用してくれる印象です[^3]。

[^3]: アクティビティモニタで見ると、wisper-cli のスレッド数は12（CPU コア数と一致）で推移していました。

## さいごに
以上、Whisper を使って会議の音声データのテキスト変換の環境を構築した話でした。テキストデータになってしまえば、ChatGPT や Gemini で議事録や要約を作成させることも容易ですね。文字起こしサービスを利用できない場合の選択肢として十分実用的だと思います。
