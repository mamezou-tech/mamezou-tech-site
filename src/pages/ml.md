---
title: 機械学習・生成AI
description: 機械学習・生成AI に関する解説・実践テクニック
date: git Last Modified
icon: https://api.iconify.design/eos-icons/machine-learning.svg?color=%23730099&height=28
enTitle: Machine Learning / Generative AI
---

機械学習(Machine Learning)はアカデミック分野にとどまらず、産業界全体を巻き込んで我々の生活を大きく変革しています。システム開発においても、機械学習モデルの活用を前提とするケースが増えています。さらに生成AIはソフトウェア開発そのものも変革しています。

機械学習アルゴリズム、生成AI、MLOps など機械学習にまつわる幅広い内容の記事を集めていきます。

## 生成AI

### LLM
- [独自のデータに基づくAzure OpenAI機能を使ってみた](/ml/llm/llm-azure-openai-your-data/)
- [大規模言語モデル初心者がハリーポッター対話モデルを作ってみた](/ml/llm/1006_llm-harry-potter/)
- [RAGを利用して国会会議録に基づいて質問に回答するLLMを作る方法](/ml/llm/llm-part1/)
- [日本語GPTで雑談対話モデルを作ろう](/blogs/2023/08/07/llm_chat_model/)
- [自然言語処理初心者が「GPT2-japanese」で遊んでみた](/blogs/2022/07/08/gpt-2-japanese/)
- [ChatGPTのベースになった自然言語処理モデル「Transformer」を調べていたら「Hugging Face」に行き着いた](/blogs/2023/03/20/using-transformer-01/)
- [ChatGPTに自然言語処理モデル「GPT2-Japanese」の使用方法を聞きながら実装したら想像以上に優秀だった件](/blogs/2023/03/22/using-transformer-02/)
- [ChatGPT先生に教わりながら「Transformerの肝」である「注意機構（Attention機構）」を可視化する](/blogs/2023/03/26/using-transformer-03/)
- [日本語GPTで雑談対話モデルを作ろう](/blogs/2023/08/07/llm_chat_model/)
- [「アテンションが全て」ではなかった？GPT2 small(124M)から学ぶLLMの仕組み](/blogs/2025/09/03/attention/)

### LLM をローカル環境で動かす
LLM をローカル環境で動かすにはマシンパワーが必要ですが、課金を気にせず使えて機密情報の扱いも容易などのメリットがあります。

- [ローカルLLMを使ったボイドシミュレーション（llama.cpp、llama-cpp-python）](/blogs/2024/12/19/ai_boid_simulation/)
- [CUDA、cuDNN、CMake地獄を乗り越えて、激古GPU＋llama.cppで量子化DeepSeekモデルを動かすまでの戦い](/blogs/2025/04/14/use-deepseek-on-local-with-old-gpu/)
- [Ollamaを使ってオープンソースLLMをローカルホストしてみよう](/blogs/2025/02/20/ollama_local_llm/)
- [AWSで自分だけのLLM環境を！EC2 GPUインスタンスとOllamaでAIを動かす実践ガイド](/blogs/2025/08/21/ec2-gpu-demo/)
- [クラウドに頼らないAI体験：LM Studioで始めるローカルLLM入門（Gemma 3）](/blogs/2025/09/21/gemma_on_lm_studio/)
- [クラウドに頼らないAI体験：LM Studio＋LangChain＋StreamlitでつくるローカルRAG環境](/blogs/2025/10/14/local_rag_on_lm_studio/)
- [クラウドに頼らないAI体験：LM Studio＋LangChain＋StreamlitでつくるローカルRAGのマルチドキュメント・永続化対応](/blogs/2025/10/15/local_rag_on_lm_studio_part2/)

### 生成AIをソフトウェア開発に適用する
IDE 上のコード補完から始まった生成AI活用ですが、Agentic Coding / Vibe Coding が流行し、要件定義や設計の領域に関しても適用が始まっています。

#### KiroでAI開発革命!? アルバムアプリをゼロから作ってみた

- [【その1:要件定義・設計・実装計画】](/blogs/2025/08/19/kiro-album-app-1/)
- [【その2:プロジェクト構造の作成】](/blogs/2025/08/20/kiro-album-app-2/)
- [【その3:バックエンドの実装-前編+Steering機能】](/blogs/2025/08/22/kiro-album-app-3/)
- [【その4:バックエンドの実装-後編】](/blogs/2025/08/27/kiro-album-app-4/)
- [【その5:フロントエンドの実装-前編】](/blogs/2025/08/28/kiro-album-app-5/)
- [【その6:フロントエンドの実装-後編+まとめ】](/blogs/2025/08/30/kiro-album-app-6/)

#### 設計への適用
- [最新LLMで“バイブコーディング”を実践（要件定義〜機能実装①）](/blogs/2025/08/19/vibe-coding/)
- [Kiro×AWSアーキテクチャ、どこまでWAできる？生成AIでクラウド設計やってみた！](/blogs/2025/09/04/aws-wa-and-kiro/)
- [Kiroで実現する仕様駆動IaC開発を試してみた](/blogs/2025/09/08/kiro-spec-terraform-iac/)

#### プルリクエストのレビュー
- [SlackとOpenAI Assistants APIでGitHubのPRレビューを効率化する](/blogs/2023/12/06/slack-github-assistantsapi/)
- [Copilotのプルリクレビューのすすめ — カスタム命令と日本語化の実践](/blogs/2025/09/10/github_copilot_pull_request/)

#### IDE 統合
- [開発者体験(DX)を進化させるJetBrainsのAIアシスタント機能の紹介](/blogs/2023/12/09/jetbrains-ai-assistant-intro/)
- [VS Code の Copilot Edits で効率的にリファクタリングを行う](/blogs/2025/02/15/refactor-code-with-github-copilot-edits/)
- [GitHub Copilot のエージェントモード(パブリックプレビュー)を試す](/blogs/2025/02/16/try-github-copilot-agent/)
- [超簡単！OpenSearch MCPでClaude Codeの検索性を拡張する](/blogs/2025/09/02/opensearch_mcp/)
- [JetBrainsのJunieを使ってみた（導入編）](/blogs/2025/09/11/jetbrains-junie/)

### OpenAI 動向
- [OpenAIのChat APIに追加されたFunction callingを使ってみる](/blogs/2023/06/14/gpt-function-calling-intro/)
- [独自のデータに基づくAzure OpenAI機能を使ってみた](/ml/llm/llm-azure-openai-your-data/)
- [OpenAIのAssistants API(ベータ版)を試す](/blogs/2023/11/08/openai-assistants-api-intro/)
- [OpenAI Assistants APIのストリームレスポンスでUXを改善する](/blogs/2024/04/10/openai-assistants-api-stream/)
- [新しく導入されたOpenAIのバッチAPIを使ってみる](/blogs/2024/04/17/openai-batch-api-intro/)
- [OpenAI Assistants API(v2)で新しくなったFile Search(Vector Stores)を使う](/blogs/2024/04/21/openai-file-search-intro/)
- [OpenAIのStructured Outputsを使ってAIの出力スキーマを定義する](/blogs/2024/08/10/openai-structured-output-intro/)
- [OpenAIの File Search の結果を分析してチューニングする](/blogs/2024/09/14/openai-filesearch-tuning/)
- [新登場の OpenAI の Realtime API でAIと音声会話する](/blogs/2024/10/07/openai-realtime-api-intro/)
- [OpenAI の Realtime API で音声を使って任意の関数を実行する(Function calling編)](/blogs/2024/10/09/openai-realtime-api-function-calling/)
- [OpenAI の Realtime API を使ってAIと音声会話するWebアプリを実装してみる](/blogs/2024/10/16/openai-realtime-api-nuxt/)
- [OpenAI の Swarm でエージェントオーケストレーションの仕組みを理解する](/blogs/2024/12/04/openai-swarm-multi-agent-intro/)
- [OpenAI Realtime API の音声会話アプリを WebRTC を使って実装する](/blogs/2024/12/21/openai-realtime-api-webrtc/)
- [OpenAI Realtime APIのWebRTCでロボットを操作する](/robotics/ai/voice-operation/)
- [正式版になったOpenAIのVector Store / File Searchツールを使う](/blogs/2025/03/19/openai-responses-api-filesearch/)
- [OpenAI Agents SDKを使ったAIエージェント開発の概要と使い方を理解する](/blogs/2025/03/23/openai-agents-sdk-intro/)
- [OpenAI APIに新しく追加されたツールを使う 〜 リモートMCP・画像生成・コードインタープリター 〜](/blogs/2025/06/01/openai-new-tools-mcp-image-code/)

### LangChain
- [LangChainのJava用ライブラリLangChain4jを使ってみる](/blogs/2024/05/13/langchain4j/)
- [LangMemの長期記憶の概要と使い方を理解する](/blogs/2025/02/26/langmem-intro/)
- [LangMemの長期記憶をPostgreSQL(pgvector)に永続化する](/blogs/2025/03/12/langmem-aurora-pgvector/)

### 応用
- [Microsoft Presidio: 個人情報保護に特化したオープンソースツール](/blogs/2025/01/04/presidio-intro/)
- [Whisper を使って会議の音声データを文字起こししてみる](/blogs/2025/05/02/transcript-meeting-recordings-with-whisper/)
- [Javaでもローカル環境でWhisperを使って音声データ書き起こしをしたい](/blogs/2025/05/13/whispercpp_java/)

### その他
- [社内ノウハウ・ノウフー共有における生成AIの活用](/blogs/2024/12/24/cosense-with-openai/)
- [生成 AI 時代の新人さん向け「自分のコードに責任を持てる力」をつけるために](/blogs/2025/05/07/for-newcomer-in-the-age-of-generative-ai/)
- [素人が生成AIについて理解できたことをまとめてみた](/blogs/2025/09/05/ai-overview/)

## 機械学習
### 画像解析
- [ディープラーニング初心者がOpenVINOを使ってみる（その１：インストール編）](/blogs/2023/01/09/openvino-01/)
- [ディープラーニング初心者がOpenVINOを使ってみる（その２：MobileNet画像分類編）](/blogs/2023/01/14/openvino-02/)
- [Rust でML に挑戦してみた](/blogs/2023/08/04/ml-challenge-by-rust/)
- [画像AIで異常検知：事例に合わせたモデル選定と実践](/blogs/2024/07/10/anomalydetection/)

### 機械学習モデル
- [ディープラーニングモデルのオープンフォーマット「ONNX（Open Neural Network Exchange）」を使ってみる](/blogs/2023/02/01/onnx-01/)
- [機械学習モデル可視化ツール「Netron」を使ってみる](/blogs/2023/02/06/ml-model-visualizer-netron/)

### その他
- [機械学習と倫理の話](/blogs/2024/12/25/machine-learning-and-ethics/)
