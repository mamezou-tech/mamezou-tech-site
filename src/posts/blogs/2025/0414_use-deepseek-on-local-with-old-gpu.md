---
title: CUDA、cuDNN、CMake地獄を乗り越えて、激古GPU＋llama.cppで量子化DeepSeekモデルを動かすまでの戦い
author: shuichi-takatsu
date: 2025-04-14
tags: [LLM, gpu, llama]
image: true
---

今回は、**型落ち・中古の激安GPU搭載PCでも、話題の大規模言語モデル「DeepSeek」シリーズをローカルで動かしてみよう**という挑戦記です。

ただ、DeepSeekネタは 豆蔵デベロッパーサイトの記事として既に以下の記事が公開されています。  
- [Ollamaを使ってオープンソースLLMをローカルホストしてみよう](/blogs/2025/02/20/ollama_local_llm/)

また、今回使用を予定している「llama」についてはPython版が既に以下の記事で公開されています。  
- [ローカルLLMを使ったボイドシミュレーション（llama.cpp、llama-cpp-python）](/blogs/2024/12/19/ai_boid_simulation/)

同じことをやっても面白くありません。なので、ちょっと別のルート「C++版LLMフレームワーク」で構築してみる、にトライしてみたいと思います。   
（まあ、こういうルートを選択すると大抵の場合、ハマるんですけどね）

「CUDA？cuDNN？CMake？なんか色々必要なんでしょ？」  
――そうです。必要です。しかも、古いGPUでやろうとすると、**公式サポートの壁と、バージョン地獄に苦しめられます**。  

本記事では、**この超ロースペック環境でllama.cppを使って量子化DeepSeekモデルをGPU動作させるまでのハマりポイントと回避策**を丁寧に紹介していきます。

## 環境構築の動機

理由はひとつ。**趣味だから（笑）**。  
古いマシンでも「まだ戦える」と証明したかったんです。

根っからの技術オタクなので、使えそうなネタがあれば使ってみたい派です。  
以前、以下の記事で LLM について調べました。
- [ChatGPTのベースになった自然言語処理モデル「Transformer」を調べていたら「Hugging Face」に行き着いた](/blogs/2023/03/20/using-transformer-01/)
- [ChatGPTに自然言語処理モデル「GPT2-Japanese」の使用方法を聞きながら実装したら想像以上に優秀だった件](/blogs/2023/03/22/using-transformer-02/)
- [ChatGPT先生に教わりながら「Transformerの肝」である「注意機構（Attention機構）」を可視化する](/blogs/2023/03/26/using-transformer-03/)

あれから技術の進歩はすさまじく、生成AIの利用が一般的な世の中になりました。  
どうせなら今回は、色々と話題に上っている DeepSeek というLLMを使ってみたいと思いました。  

今回、試行に使ったPCスペックは以下です。  
- CPU: Intel(R) Core(TM) i5-4690 CPU @ 3.50GHz
- RAM: 16.0 GB
- ストレージ: 238 GB SSD, 466 GB HDD
- GPU: NVIDIA GeForce GTX 970 (4 GB)
- OS: Windows 10 pro
- **合計コスト**：中古で全部揃えて **1万円台**！

（数十万もするGPU搭載マシンなんて購入できない！）  

ですが、それでも「**ちゃんと動く**」んです。  
「とにかく安く手に入る中古PC」ってことで検討しました（笑）  
一応、筐体はミドルタワーで、ATX電源出力は750W以上あるので、今後上位のGPU（当然中古ですけどね）に置き換えも考え中。  
サクッと CUDA を使ってみる分には入門編として 古いGPU でも十分と思っています。  

### 量子化モデルって何

まず知っておきたいのが「**量子化（Quantization）モデル**」です。  
DeepSeekのような大規模言語モデル（LLM）は、基本的に数十億〜数百億のパラメータ（重み）を持ち、通常はfloat32（32bit浮動小数点）で表現されます。  
ですがこの形式では、メモリ（特にVRAM）を大量に消費し、**GTX 970のような4GBクラスのGPUではとても載りません。**

ここで登場するのが「量子化モデル」。これは、精度をある程度落として、**モデルサイズを圧縮した軽量版**です。

- 32bit → 4bit にすれば、**約1/8のサイズ**
- VRAMも少なくて済む
- llama.cppやOllama、LM Studioなどの軽量フレームワークに最適化

つまり、「**激古GPUでLLMを動かすには、量子化モデルが必須**」なのです。

### 軽量LLMフレームワーク

LLMフレームワークには [LangChain](https://www.langchain.com/) や [LlamaIndex](https://www.llamaindex.ai/) 、[OpenLLM](https://openllm.ai/) などがありますが、今回は軽量LLMフレームワークである [llama.cpp](https://github.com/ggml-org/llama.cpp) を使ってみようと思います。  
「llama.cpp」は、量子化モデルを使ってみるのに適したツールです。  
他に、LM Studioや Ollama っていうのもあるみたいです。（Ollamaについては、[こちら](/blogs/2025/02/20/ollama_local_llm/)の記事をどうぞ）

llama.cpp は元祖ローカルLLMフレームワークで、C++で書かれたオープンソースです。  
DeepSeekの、特に「量子化済み（GGUF形式）」のモデルであれば、llama.cpp との相性はいいと考えています。

## CUDA開発環境の構築

### ハマりポイント その１

慣れた人なら最初から分かっていたことですが、CUDA Toolkit、cuDNN、CMake、MSBuild のそれぞれの間で「バージョン整合」が重要です。  
私は、本PCで LLM＋CUDA開発環境を作る前に Pytorch＋CUDA開発環境を作っており、CUDA Toolkit、cuDNNは「CUDA Toolkit 11.3＋cuDNN 8.2.1」の組み合わせの環境を構築していました。  
（この組み合わせで構築するときも、CUDA版Pytorchと Pythonのバージョンの問題で、色々とありました）  

CUDA Toolkit、cuDNNを上記の環境ままで構築を進めると、あちこちでエラーが噴出しました。  
エラーの内容を調べ、ほぼ丸一日かけて「Cmake＋MSBuild環境ではCUDAは12.4以上が必要」ってことがわかり、結局以下の構成で進めることにしました。（2025-04-12 時点）  
- CUDA Toolkit: 12.8 update 1
- cuDNN: 9.8.0

きっと何らかの回避策はあると思うのですが、もう精根尽き果ててしまい、これ以上追及しませんでした。  
CUDA開発環境を構築する人は、CUDAのバージョンには注意した方がいいと思います。  

バージョンのそろえ方としては以下の感じかな？って思ってます。  

１）使いたい LLM ライブラリが対応する CUDA バージョンを確認し、インストールする。  
　今のところ CUDAには大きく 11.ｘ系、12.ｘ系が存在します。  
　今回使用する llama.cpp は CUDA 12.x系でも動くらしいです。（[ここ](https://github.com/ggml-org/llama.cpp/releases)を見ると12.4が推奨なのかもしれない）
　ただし、Pytorchなどを利用する場合は 11.x系を推奨する場合もあるようです。  

２）上記で選択した CUDA に対応した cuDNN を [NVIDIA公式](https://docs.nvidia.com/deeplearning/cudnn/backend/latest/reference/support-matrix.html#abstract) から探してインストールする。  
　CUDAのバージョンが 12.8 なら cuDNNのバージョンは 9.8 って感じです。

３）CMakeは 3.16以降の安定版を入れて インストールパスを 環境変数に設定する。
   llama.cpp をビルドするなら 3.28以降の安定版が無難でしょう。（今回 Cmake 4.xは試していないです。もう最新はちょっとコリゴリです…）

４）MSBuild もしくは Visual Studio は 2022 をインストールする。
　インストールオプションの「C++によるデスクトップ開発」ワークロードをONにする。
　こちらが [対応表](https://docs.nvidia.com/deeplearning/cudnn/backend/latest/reference/support-matrix.html#windows) です。  

環境構築手順は以下です。  

### CUDA Toolkit インストール

GPUを使いたいので（今回はこれが目的とすらある）、CUDA Toolkit のインストールは必須です。  
インストール方法については、[こちら](https://zenn.dev/headwaters/articles/c42799b2f27d52)を参考にしました。  

まず、NVIDIAの[CUDA公式ページ](https://developer.nvidia.com/cuda-downloads)から「CUDA 12.8 update 1」を探してインストールします。

環境に合わせてポチポチとクリックしていくと、ダウンロードボタンを表示され、インストール方法も示されます。  
![](https://gyazo.com/30c38b6f2440b1622e34dbbe58283a75.png)

インストール後、手動で環境変数にパスを通す必要はありませんでした。  
自動で以下の環境変数が登録されました。  
- CUDA_PATH
- CUDA_PATH_V12_8

### cuDNN インストール

次は cuDNN をインストールします。  
NVIDIAの[cuDNN公式ページ](https://developer.nvidia.com/cudnn-downloads)から「cuDNN 9.8.0」を探してインストールします。

こちらも、CUDAと同じように環境に合わせてポチポチとクリックしていくと、ダウンロードボタンを表示されインストール方法も示されます。  
![](https://gyazo.com/2db93a51cbecbc3215d8ecb69bf2b5c0.png)

今回の9.8.0版ではインストーラになっていましたが、古いバージョンだとZipファイルがダウンロードされ、自分でZipを解凍したのち、作成された bin, include, lib フォルダをCUDA Toolkit上に自力でコピーする必要があるものもあります。（[参考](https://zenn.dev/headwaters/articles/c42799b2f27d52#cudnn-%E3%82%92%E3%83%80%E3%82%A6%E3%83%B3%E3%83%AD%E3%83%BC%E3%83%89)）  

## CMakeビルド環境の構築

CMake や MSBuildツールの導入が済んでいる方はスキップしてかまいません。

### CMake インストール

こちらの[公式CMakeダウンロードページ](https://cmake.org/download/)から「Windows Installer (cmake-x.y.z-windows-x86_64.msi)」をダウンロードします。  
私は「cmake-3.31.7-windows-x86_64.msi」をダウンロードしました。  
インストーラを起動し「Add CMake to the PATH environment variable」を選択して、インストールします。

インストール完了後に、以下のコマンドを実行します。
```shell
cmake --version
```
以下のように出力されればインストールは成功です。  
```shell
cmake version 3.31.7
CMake suite maintained and supported by Kitware (kitware.com/cmake).
```

### Visual Studio Build Toolsのインストール

こちらの[Visual Studio Build Tools公式ページ](https://visualstudio.microsoft.com/ja/visual-cpp-build-tools/)から「Build Tools」をダウンロードします。  
「Build Tools のダウンロード」ボタンをクリックすると、「vs_BuildTools.exe」というEXEファイルがダウンロードされます。  

インストーラーを起動します。  
![](https://gyazo.com/e2ac26da5211dc1df7bc80f98d1d723d.png)

インストーラ環境が整うと、次のようなダイアログが表示されますので、「C++によるデスクトップ開発」をONにして、インストールします。    
![](https://gyazo.com/67b7add24353b71be3d70ff731ca113b.png)

インストールを開始して、完了後に再起動します。  
再起動後に、以下のコマンドを実行します。
```shell
cl
```
以下のように出力されればインストールは成功です。  
```shell
Microsoft(R) C/C++ Optimizing Compiler Version 19.43.34810 for x64
Copyright (C) Microsoft Corporation.  All rights reserved.
```

## 軽量LLM「llama.cpp」環境の構築

### llama.cpp のダウンロード ＆ ビルド

まず、[llama.cpp](https://github.com/ggml-org/llama.cpp) のリポジトリをローカルにClone（ダウンロード）します。  
```shell
git clone https://github.com/ggml-org/llama.cpp
```

次に、llama.cpp をビルドします。  
（GPUを使用するフラグをONしてビルドすること）

```shell
cd llama.cpp
cmake -B build -S . -DGGML_CUDA=on
cmake --build build --config Release
```

たぶん、上記を実施した時に、何人かの方はビルドが失敗したと思います。  
いくつかの「ハマりポイント」をご紹介します。  

### ハマりポイント その２

実は、llama.cppの[ドキュメント](https://github.com/ggml-org/llama.cpp/blob/master/docs/build.md)にも書かれているのですが、CUDA Toolkit と MSBuild との連携が悪いからなのか不明です。  
どうやら、ビルドに必要な一部のファイルが CUDA Toolkit 側から MSBuild 側にコピーされず、ビルドが失敗するようです。  

対処方法は以下です。  
以下のフォルダを開きます（CUDA Toolkit 12.8の場合）  
```shell
C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.8\extras\visual_studio_integration\MSBuildExtensions
```
上記のフォルダに以下の４つのファイルが格納されています。  
![](https://gyazo.com/3f496247119b9ae3a2abdc752d13e537.png)

これらの4つのファイル全部を以下のフォルダにコピーします。  
```shell
C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\MSBuild\Microsoft\VC\v170\BuildCustomizations
```

上記の情報は [ここ](https://github.com/NVlabs/tiny-cuda-nn/issues/164) や [ここ](https://www.insurtechlab.net/run_llm_on_localmachine_using_lama_cpp_python/) でも議論されていました。
不思議なことに、先に示した4つのファイルは「C:\Program Files (x86)\MSBuild\Microsoft.Cpp\v4.0\BuildCustomizations」には格納されていたのですが…。  
正しくインストールするには、設定が足りないのかもしれません。  

### ハマりポイント その３

上記でビルドが出来ればOKなのですが、私の環境では「libcurlが無い！」という旨のエラーが出て、ビルドが失敗しました。  
一応「CURLを使用しないなら、「-DLLAMA_CURL=OFF」オプションを付けてね」って警告が出ているので、以下のようにすれば、ビルドは成功しました。  
```shell
cmake -B build -S . -DGGML_CUDA=on -DLLAMA_CURL=OFF 
cmake --build build --config Release
```
ただし、このままだと llamaコマンドで ネットからモデルをダウンロードしつつ LLMを実行できません。  
つまり、毎回自力でモデルをローカルPCにダウンロードしてから LLM を使用することになってしまいます。  
それは嫌なので、curlライブラリをインストールする方法を探しました。  
どうやら「vcpkg」というものを使えば curlライブラリをインストールできるようです。  
[こちら](https://kinoshita-hidetoshi.github.io/Programing-Items/C++/network/curl.html#1-2._Windows)の情報を頼りにして、ライブラリをインストールします。

まず、vcpkgリポジトリをクローンしてきます。
```shell
git clone https://github.com/Microsoft/vcpkg.git
```

次に vcpkg実行ファイルを生成します。
```shell
cd vcpkg
bootstrap-vcpkg.bat
```

curlライブラリをインストールします。
```shell
vcpkg install curl:x64-windows
```

で、これで終わったかと思いきや、まだ Visual Studioへの組み込みが未なので、組み込みを実行します。  
```shell
vcpkg integrate install
```
ここまで実施して、やっと MSBuild で curlライブラリが使えるようになりました。  

念のため、ライブラリの存在を確認します。以下のコマンドを実行します。  
```shell
vcpkg list
```
リストに CURL が出てきたら使える状態のようです。  
![](https://gyazo.com/f211bdfdb6aaabcb96bc181653b735b7.png)

ただし、vcpkg で curlライブラリをビルドしたときに「ライブラリを使用するにはツールチェインを指定せよ」っていう文言が表示されました。  
cmakeの引数に「-DCMAKE_TOOLCHAIN_FILE="＜vcpkgをCloneしたフォルダ＞/scripts/buildsystems/vcpkg.cmake"」をつけてやる必要があるようです。  
私は「C:/ProgramData/vcpkg」にvcpkgを入れたので、以下のようにしました。  
```shell
-DCMAKE_TOOLCHAIN_FILE="C:/ProgramData/vcpkg/scripts/buildsystems/vcpkg.cmake"
```

おめでとうございます！  
ようやく長い長いトンネルを抜けました。  
最終的にビルドに成功したコマンド群は以下になりました。  

```shell
git clone https://github.com/ggml-org/llama.cpp
cd llama.cpp
cmake -B build -S . -DGGML_CUDA=on -DCMAKE_TOOLCHAIN_FILE="C:/ProgramData/vcpkg/scripts/buildsystems/vcpkg.cmake"
cmake --build build --config Release
```

### ハマりポイント 番外編

llama.cpp は GPU無しでも利用できます。  
私は最初「-DGGML_CUDA=on」を付けずにビルドしてしまい、llama.cpp は確かに動くんだけど、なぜ GPU が全然使われないのだろうかと悩むことになりました。  
ちゃんと[ドキュメント](https://github.com/ggml-org/llama.cpp/blob/master/docs/build.md)は読むものですねぇ。（反省）  

### ハマりポイント 番外編 その２

皆様、もうお気づきだろうか…。
私は自分で vcpkg をダウンロード＆インストールしましたが、MSBuild Toolをインストールしたときに、実はもう vcpkg は入っていたんです。  
![](https://gyazo.com/eaed4071ce7e0d98495afa8ced17961f.png)

ただ、すでに上記でビルドしてしまった後であったので、再調整はしておりません。  
次に環境構築するときには（あるかどうかは分からないですが）、気を付けようと思います。

## DeepSeek モデルのダウンロードと実行

もう、環境構築だけでおなか一杯状態ですが、気を取り直して先に進めます。  
やっと、DeepSeekモデルを使用する番です。  
使用するGPU（GTX 970）のVRAM制限を考慮すると、運用可能な量子化されたモデルは「7Bモデル」が現実的な選択肢となります。  
[HaggingFace](https://huggingface.co/)でモデルを探します。  
[R1の7B-Q3_K_Mモデル](https://huggingface.co/roleplaiapp/DeepSeek-R1-Distill-Qwen-7B-Q3_K_M-GGUF)あたりがちょうどよさそうです。
上記から以下のファイルをダウンロードします。  
「DeepSeek-R1-Distill-Qwen-7B-Q3_K_M.gguf」

このファイルを「llama.cpp/models」フォルダに格納します。  

さあ、やっと実行です！  
以下のコマンドを実行し、DeepSeekモデルを動かしてみましょう。  
```shell
cd llama.cpp
.\build\bin\release\llama-run .\models\DeepSeek-R1-Distill-Qwen-7B-Q3_K_M.gguf
```
ターミナルに出力された文字が文字化けする場合は、UTF-8 と SJISまわりの問題だと思われます。  
以下のコマンドを実行すると、UTF-8、SJISまわりの問題が対処されるようです。
（もう、かなり強引に対処しにいってます）    
```shell
chcp 65001
```

DeepSeekモデルを実行するとすぐに「プロンプト」が出てきます。  
何も考えていなかったので、思いついた文章を入力してみました。  
（かなり無計画ですが）  
プロンプトへのお題は「桃太郎について知っていることを教えてください」です。
![](https://gyazo.com/9b10107f20560501dcfb48cade5eb4f8.png)

かなりぶっ飛んでいる答えが返ってきました。  
「ちょっと何言っているかわからない」状態です。  

llama.cpp のビルドが不完全なのか、私の環境のGPUが貧弱なのか、与えるパラメータが不足なのか、モデルの選定ミスか。
比較のために違うモデルも使ってみましょう。  
ChatGPTに適当なモデルを選んでもらいました。選択したモデルは「Llama-3.2-1B-Instruct-Q4_K_M.gguf」です。
こちらも HaggingFace からダウンロードします。  
そして実行してみます。  
![](https://gyazo.com/1b5d6727f8c51a22c94189031114921b.png)

うーん。これは少しまともになりましたけど、なんか全然駄目ですね。  
戦うところは、ある程度あってはいるかもしれません。（本来は鬼と戦うはずだけど、この桃太郎は誰と戦っているんだろうか？）

もう環境構築そっちのけで、だんだん面白くなってきたところです。  
（試していた時間帯が深夜の2時を過ぎていたというものありますし）

同じ豆蔵デベロッパーサイトに掲載されていた [ここ]((/blogs/2025/02/20/ollama_local_llm/)) を参考にして ollama を使って比較してみましょう。
（ollama 自体のインストールは割愛します）

llama3.2モデルを実行して、同じ問いかけをしてみます。  
```shell
ollama run llama3.2
```
![](https://gyazo.com/21b59fb80b56a1b340e2cbaf4658d3b7.png)

**わはははは！爆笑！**  
（深夜の2時過ぎに一人で笑っている構図は、ちょっと怖いですが）  
桃太郎＝戦い のイメージなんですかね。  

あ、いやいや、そんなことをしたいんじゃなかった。  

同じことを ollama を使って DeepSeekモデルでも試します。  
```shell
ollama run deepseek-r1:1.5b
```
![](https://gyazo.com/ccc079d92e6b7eeea479afda5e5a79a8.png)

うーん。めっちゃ中国語で回答されました。  
多少中国語は理解できますが、桃太郎の物語とは異なるようです。  

### 負荷をかけてみる

せっかくGPUで動く環境を作ったのだから、負荷をかけて応答速度に変化があるのか確認してみたいと思います。  
ChatGPTに「GPUに負荷をかける方法を教えてください」と聞いたところ、以下のように実行してみてください、とのことでした。  
実行してみます。  

```shell
.\build\bin\release\llama-run .\models\DeepSeek-R1-Distill-Qwen-7B-Q3_K_M.gguf -t 8 -ngl 99
```
![](https://gyazo.com/9323f728a4df633fe239189dcc9f01e0.png)

回答の精度は全然ダメだけど、応答速度はちょっと低下したくらいでした。  
![](https://gyazo.com/2abb798088685f73f4071419c8293f38.png)

自分の真横にミドルタワーPCを置いていますが、GPUボードのファンがガンガンに回っている感じでした。  
それでも、その他の操作は特にストレスなく使用できました。  
GPU恐るべし。

## まとめ

筆者の知識不足のため、モデルの選定と運用方法に難があることはわかりました。  
しかし、GPUを使った環境構築については、ある程度の知見は得られたと思います。  

「GPUの恩恵はあったのか？」については、微妙ってところです。  
ですが、CPUで実行したときよりは、パソコン自体の性能劣化は少なかったです（それもそのはず、GPUが仕事をしてくれているので）。  
CPUでガリガリ実行したときは、マウスの操作すらままならない時が多かったですが、GPUで処理させた場合はリモートデスクトップから遠隔で操作しても特に操作自体にストレスを感じることは無かったです。  
もっと上位のGPUなら、もっと性能は上がるのでしょうけど。  
今回は「環境構築してみる」っていうのがメイン（無理やり）なので、実務的な利用については、もっと性能の高いGPUを入手した後に実施してみようと思います。  

llama.cppについては、CUDAツールキットの設定をマスターするとかで無ければ、その他の ollamaや llama-cpp-python を使った方がずっと簡単かと思いました。  

それから、やっぱり Windowsで開発環境を入れるのって面倒だなぁ、と強く感じました。  
試行で使ったPCはWindows10機なので、Windows10のサポートが切れた後にOSを Ubuntu に乗せ換えて、そっちで新しく環境構築してみようと思います。  

<style>
img {
    border: 1px gray solid;
}
</style>
