---
title: クラウドに頼らないAI体験：LM Studio＋LangChain＋StreamlitでつくるローカルRAG環境
author: shuichi-takatsu
date: 2025-10-14
tags: [lmstudio, LangChain, Streamlit, gemma, LLM, 生成AI, RAG]
image: true
---

## はじめに

[前回](/blogs/2025/09/21/gemma_on_lm_studio/)は、LM Studio＋Gemmaでクラウドに頼らないAI環境を構築しました。  

本記事では、**LM Studio** を使ってローカルでLLM（例：Gemma 3 4B）を動かし、さらに **LangChain** と **Streamlit** を組み合わせて、クラウドに頼らずに動作する **RAG（Retrieval-Augmented Generation）** 環境を構築します。  

題材として、誰もが知っている「桃太郎」の物語を使い、自分で用意した知識ベースを読み込む **ローカルAIチャットボット** を作っていきます。

今回のゴールは以下です。  
- **LM Studio**でローカルLLMをAPIサーバーとして動かす
- **LangChain**でRAG（検索＋生成）パイプラインを構築する
- **Streamlit**でチャットUIを作成する

すべて自分のPC上で完結し、インターネット接続がなくても動作します。
まさに「自分だけのAI」を作る第一歩です。

---

## LangChainとは

LangChain は、**大規模言語モデル（LLM）を外部データと統合して活用するためのフレームワーク** です。  
特に、**RAG（Retrieval-Augmented Generation）** の構築を容易にする仕組みを提供します。  

今回作成するRAG環境では次の4つの処理を組み合わせて、より正確で文脈に基づいた回答を生成します。  
| ステップ | 処理内容 | LangChainの機能 |
|-----------|------------|----------------|
| ① テキスト分割 | ドキュメントを小さなチャンクに分割 | `TextSplitter` |
| ② 埋め込み生成 | テキストをベクトル化 | `Embeddings` |
| ③ 検索 | 質問と類似したチャンクを検索 | `VectorStore`（FAISS, Chromaなど） |
| ④ 回答生成 | 検索結果＋質問をLLMに入力 | `RetrievalQA` や `Chain` |

---

## Streamlitとは

**Streamlit（ストリームリット）** は、**Pythonコードだけで簡単にWebアプリを作成できるフレームワーク** です。  
データ分析・機械学習・LLMアプリ（例：RAGチャットボット）などのUI構築に広く利用されています。

| 特徴 | 説明 |
|------|------|
| **簡単な構文** | HTMLやJavaScriptを使わず、PythonのみでUIが書ける |
| **即時実行型** | コードを保存すると自動でWeb画面が更新される |
| **データ可視化に強い** | `matplotlib`、`plotly`、`pandas`などと連携可能 |
| **インタラクティブUI** | テキスト入力・スライダー・ボタン・チャットUIなどを簡単に実装できる |
| **ローカル or クラウド両対応** | `streamlit run app.py` でローカル実行、または共有用にクラウド公開可能 |

---

## LM Studio サーバの起動

最初のステップとして、モデルを動かすための「APIサーバー」をLM Studioで起動します。  
これによって、PythonプログラムがLLMと会話できるようになります。

手順は以下です。  
- LM Studioを開きます。
- 左側のメニューから、「開発者」タブを選びます。
![](https://gyazo.com/471db6fd8682e9e503b98079a007cee4.png)

- 画面の上部にあるドロップダウンメニューで、gemma-3 4B モデルを選択し、読み込みます。  
（モデルは前回も使用したものです）
![](https://gyazo.com/c000e01467899cb556bcf3ab4e0c6be1.png)

- 「Start Server」 ボタンをクリックします。  
![](https://gyazo.com/7b0b193e81a81d11daf8cb79073ac155.png)

- サーバーが起動します。 
![](https://gyazo.com/e778e5645f5570aef21743184d78daa6.png)

- ログに以下のようなメッセージが出力されます。  
サーバが「`http://localhost:1234`」で動作していることがわかります。  
![](https://gyazo.com/07d41506e4d609c2e0e94183c9881415.png)

- 以下のAPIが確認できます。  
（OpenAI互換APIです）  
![](https://gyazo.com/7dd1a38941fcf7d41f2801b56d255588.png)

---

## RAGパイプラインの構築

次は、**RAG（Retrieval-Augmented Generation）** という仕組みを作ります。  
これは、**LLMが外部の知識（今回はテキストファイル）を参照しながら回答を生成するための技術**です。  
身近な例で言うと、「教科書を見ながらテスト問題を解く」 に似ています。

- 教科書 ＝ 事前に用意するデータ（今回はテキストファイルを用います）
- テスト問題 ＝ ユーザーからの質問
- 問題を解く人 ＝ LLM

この仕組みを作るために、まずはPythonの環境を整える必要があります。  
いくつか専門のライブラリ（便利な道具セットのようなもの）をインストールします。  
ターミナル（WindowsならコマンドプロンプトやPowerShell）を開いて、以下のコマンドを実行します。

```python
pip install langchain langchain-community langchain-openai langchain-huggingface streamlit faiss-cpu
```

---

## RAGの教科書

まず、LLMが読み込む「教科書」（知識ベース）を作成します。（単純なテキストファイルとします）  
Python スクリプトを作成する予定のフォルダーと同じフォルダーに、`knowledge.txt`という名前の新しいテキストファイルを作成します。
教科書データとして、桃太郎に関する次の短編小説をコピーしてテキストファイルに貼り付け、保存します。  
このファイルが **ローカル ナレッジ ベース** になります。


```text
むかしむかし、あるところにおじいさんとおばあさんが住んでいました。
おじいさんは山へ芝刈りに、おばあさんは川へ洗濯に行きました。
おばあさんが川で洗濯をしていると、大きな桃がどんぶらこ、どんぶらこと流れてきました。
おばあさんはその桃を拾い上げて、家に持ち帰りました。
家に帰って桃を割ってみると、中から元気な男の子の赤ちゃんが出てきました。
桃から生まれたので、その子を「桃太郎」と名付けました。
桃太郎はすくすくと育ち、やがて鬼ヶ島へ鬼退治に行くと言い出しました。
おばあさんからきびだんごをもらい、桃太郎は旅に出ます。
旅の途中で、犬、猿、雉を家来にしました。
そして、みんなで力を合わせて鬼を退治し、宝物を持って家に帰りました。
```

---

## Streamlitアプリを作成する

本体のプログラムを作成します。  
先ほど作った `knowledge.txt` と同じフォルダに、`app.py` という名前で新しいファイルを作成します。  
そして、以下のコードをすべてコピーして、`app.py` ファイルに貼り付けます。

```python
import streamlit as st
from langchain_openai import ChatOpenAI
from langchain.text_splitter import CharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA

# =============================
# --- LLMとRAGのセットアップ ---
# =============================

# ドキュメントを読み込んでRAGパイプラインを作成する関数
def create_rag_chain(document_path):
    # ドキュメントを読み込む
    with open(document_path, 'r', encoding='utf-8') as f:
        document_text = f.read()

    # 1. ドキュメントを小さな「チャンク」に分割する
    # これにより、モデルが関連情報を見つけやすくなります。
    text_splitter = CharacterTextSplitter(
        separator="\n",
        chunk_size=200,      # 各チャンクのサイズ（文字数）
        chunk_overlap=50,    # チャンク同士の重なり
        length_function=len
    )
    docs = text_splitter.split_text(document_text)

    # 2. 各チャンクの「埋め込みベクトル」を作成する
    # 埋め込み（Embeddings）は、テキストをコンピュータが意味を理解できる数値のベクトルに変換する技術です。
    # all-MiniLM-L6-v2は、文章をコンピュータが理解できる数値（ベクトル）に変換することに特化した、小型で高速なモデルです。
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    # 3. ベクトルストア（FAISS）を作成し、埋め込みを保存・検索できるようにする
    # これは、私たちの「教科書」に検索可能な索引を作るようなものです。
    db = FAISS.from_texts(docs, embeddings)

    # 4. ローカルLLMサーバー（LM Studio）への接続を設定する
    llm = ChatOpenAI(
       # ↓↓↓ LM Studioの「API Identifier」をここに貼り付けてください ↓↓↓
        model_name="local-model",            # ローカルモデルを使用するように指定
        base_url="http://localhost:1234/v1", # LM Studioサーバーのアドレス
        api_key="not-needed",                # ローカルサーバーなのでAPIキーは不要
        temperature=0.1                      # temperatureを低く設定して、「参考文章から外れず、最も確実な回答をしなさい」とAIに指示している
    )

    # 5. RetrievalQAチェーンを作成する
    # このチェーンは、検索役（FAISSの索引）とLLMを組み合わせます。
    # 質問をすると、まず最も関連性の高いテキストチャンクを見つけ出し、
    # それを質問と一緒にLLMに渡して、回答を生成させます。
    retriever = db.as_retriever()
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff", # "stuff"は、関連するチャンクをすべてプロンプトに「詰め込む」方式
        retriever=retriever,
        return_source_documents=True
    )
    return qa_chain

# knowledge.txtを使ってRAGチェーンを作成
rag_chain = create_rag_chain("knowledge.txt")

# =============================
# --- Streamlit UI ---
# =============================

st.title("🍑 桃太郎チャットボット")
st.write("桃太郎の物語について、質問してください！")

# チャット履歴を初期化する
if "messages" not in st.session_state:
    st.session_state.messages = []

# 履歴にあるメッセージを再表示する
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# ユーザーの入力に反応する
if prompt := st.chat_input("質問をどうぞ"):
    # ユーザーのメッセージを表示
    with st.chat_message("user"):
        st.markdown(prompt)
    # ユーザーのメッセージを履歴に追加
    st.session_state.messages.append({"role": "user", "content": prompt})

    # LLMの応答を取得
    response = rag_chain.invoke({"query": prompt})
    answer = response["result"]

    # アシスタントの応答を表示
    with st.chat_message("assistant"):
        st.markdown(answer)
    # アシスタントの応答を履歴に追加
    st.session_state.messages.append({"role": "assistant", "content": answer})
```

ソースコード中のコメントでプログラムの解説をしていますが、概略を以下にまとめます。  

### 前半：頭脳の準備パート (`create_rag_chain` 関数) 

ここは、LLMが **「賢い司書」** になるための準備をする部分です。

1.  **本を読む:** まず、教科書ファイル「桃太郎の物語」 (`knowledge.txt`) の内容をすべて読み込みます。
2.  **付箋を貼る:** 物語を短い文章（チャンク）に区切って、内容ごとにたくさんの付箋を貼っていくようなイメージです。(`CharacterTextSplitter`)
3.  **索引を作る:** コンピュータが「どの付箋にどんな内容が書いてあるか」をすぐに見つけられるように、特殊な索引（ベクトルストア）を作ります。(`Embeddings`, `FAISS`)
4.  **LLMと連携:** 最後に、「質問が来たら、まず索引を使って関連する付箋を探し、その内容を参考にして答える」という**ルール**（`RetrievalQA`）を決め、LM StudioのLLMと連携させます。

この準備によって、LLMはただの物知りではなく、**資料（教科書データ）に基づいて**回答できる専門家になります。  

:::info
`all-MiniLM-L6-v2`はどこから来るのか？  
上記のモデルは、初めてプログラムを実行したときに、インターネット上にある **「Hugging Face Hub」** という巨大なAIモデルの保管庫から、自動的にダウンロードされます。  
一度ダウンロードされると、PC内の特別なフォルダ（キャッシュと呼ばれます）に保存されます。  
2回目以降にプログラムを実行するときは、もう一度ダウンロードするのではなく、PCに保存されたそのファイルから直接読み込まれます。
:::

### 後半：アプリ画面パート (Streamlit UI) 

ここは、ユーザーが実際に触るチャット画面を作る部分です。

1.  **画面の表示:** 「🍑 桃太郎チャットボット」というタイトルを表示します。
2.  **入力欄の用意:** ユーザーが質問を入力するためのチャットボックスを用意します。
3.  **応答の処理:**
    * ユーザーが質問を入力すると、その質問を **前半で作った「賢い司書」** に渡します。
    * 司書（RAG）が資料を調べて作った回答を受け取ります。
    * その回答をチャット画面に表示します。


ざっくり言うと、**「前半で資料を読み込んで賢くなったAIを用意し、後半でそのAIと会話するためのチャット画面を作る」** という2段構成になっています。

---

## アプリケーションを実行 

アプリケーション（チャットボット）を起動します。

1.  **LM Studio**のサーバーが起動していることを確認します。
2.  `app.py` と `knowledge.txt` を保存したフォルダを、ターミナル（コマンドプロンプト）で開きます。
3.  ターミナルで、以下のコマンドを入力して実行します。
```bash
streamlit run app.py
```

上記コマンドを実行すると、自動的にWebブラウザで新しいタブが開きます。  
（デフォルトでは「 `http://localhost:8501/` 」でアプリケーションが起動しています）  

ブラウザの右上にRAGを用意していることを示す進捗が数秒間表示されます。  
![](https://gyazo.com/235845d37b197ab03e38411d4a1c83aa.png)

少しの時間の後「🍑 桃太郎チャットボット」の画面が表示されるはずです。  
![](https://gyazo.com/edd8758e3c9c3c72aac96de5ace4c426.png)

---

## 質問をする

チャットボットに質問をしてみます。  
質問は以下です。
- 「桃太郎とは何者ですか？」
- 「桃太郎は何をしましたか？」

![](https://gyazo.com/d7aa9662b9d64b0676038f0936942a4f.png)

教科書データに載っている内容を回答していることがわかります。

---

## 教科書データの内容を一部変えてみる

教科書データの内容を一部変えてみます。

以下の
```text
旅の途中で、犬、猿、雉を家来にしました。
```
の部分を
```text
旅の途中で、猫、亀、鶴を家来にしました。
```
に変えて実行してみましょう。  
結果は以下のようになりました。  
![](https://gyazo.com/67569fcb30e20b2a92e8f74db31f59b5.png)

正しく**家来が入れ替わって解釈されている**ことがわかります。

---

## 教科書データに無いことを聞いてみる

教科書データに無いことを聞いてみます。  
AIが勝手に物語を拡張していないことを確認します。  
![](https://gyazo.com/ec3e055969254e12660e7ca1b04abbf1.png)

用意した教科書データ以外の内容については答えられないことがわかります。

---

## 参考にした元の文章の表示

回答と一緒に「参考にした元の文章」も表示するように機能を追加します。  

ソースコードの以下の部分
```python
    with st.chat_message("assistant"):
        st.markdown(answer)
```
に機能を追加します。  
変更後のソースコードは以下です。  
```python
   with st.chat_message("assistant"):
        st.markdown(answer)
        
        # --- ここから追加 ---
        with st.expander("参考にした文章"):
            for doc in response["source_documents"]:
                st.markdown(f"--- \n {doc.page_content}")
        # --- ここまで追加 ---
```

アプリケーションを実行すると、以下のように参考にした文章も一緒に表示されるようになりました。  
![](https://gyazo.com/94f879740f46ffbe9d6e19079eebbb84.png)

---

## まとめ

今回紹介した手順では、**LM Studio × LangChain × Streamlit** を組み合わせることで、**クラウドに依存しないローカルRAG環境**を構築しました。

ポイントを振り返ると次の通りです。
- **LM Studio** でローカルLLMをOpenAI互換APIとして動作
- **LangChain** で文書を分割・ベクトル化・検索・回答生成を自動化
- **Streamlit** で対話的なUIを構築し、ブラウザから手軽に利用可能
- **教科書データ**を変更すると、AIの回答内容も動的に変化

この仕組みにより、「自分の持つ知識ファイル」をAIが読み込み、AIが **“自分専用の知識アシスタント”** のように振る舞います。  
より複雑なナレッジや複数ファイル対応、さらには検索精度向上やUI改善などに発展させることもできます。

自分のデータを自分の環境で活かす、新しいAI活用の形を試すことができました。

<style>
img {
    border: 1px gray solid;
}
</style>
