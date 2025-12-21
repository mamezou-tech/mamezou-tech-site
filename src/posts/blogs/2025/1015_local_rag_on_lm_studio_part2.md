---
title: クラウドに頼らないAI体験：LM Studio＋LangChain＋StreamlitでつくるローカルRAGのマルチドキュメント・永続化対応
author: shuichi-takatsu
date: 2025-10-15
tags: [lmstudio, LangChain, Streamlit, FAISS, LLM, 生成AI, RAG]
image: true
---

## はじめに

[前回](/blogs/2025/10/14/local_rag_on_lm_studio/)の記事では、**1つのテキストファイル（桃太郎物語）** を対象にした単純なRAG（検索＋生成）環境を構築しました。  
今回はその拡張として、**複数のドキュメントを読み込み・保持・削除できる永続化対応のローカルRAGアプリ**を構築します。

---

## 全体構成

### ディレクトリ構造

```bash
project/
├─ app2.py              # 本体アプリケーション
├─ vectorstore/         # ベクトルストアの永続化ディレクトリ
│   ├─ faiss_index/     # FAISSのインデックスファイル
│   ├─ metadata.json    # 読み込まれたファイル一覧
│   └─ temp_docs/       # アップロードされたドキュメントの一時保存場所
```

新しいアプリ（`app2.py`）では次のような進化があります。

| 機能 | 内容 |
|------|------|
| **マルチドキュメント対応** | PDF, Word, PowerPoint, テキストなど複数ファイルを同時に学習可能 |
| **永続化ストレージ** | ベクトルDB（FAISS）をローカル保存し、再起動後も再構築不要 |
| **個別ファイル削除** | 特定のファイルだけを削除し、DBを再構築 |
| **UI強化** | Streamlitのサイドバーでファイル一覧・削除・全削除操作が可能 |
| **精度向上** | MultiQueryRetrieverで質問を多角的に変換して検索精度を改善 |

アプリを起動すると、`vectorstore/`以下に自動で必要なフォルダが作成されます。  
ファイルを追加すると、ベクトルDBとメタデータがディスクに永続化されます。

### 必要なライブラリ

必要なライブラリを以下のコマンドでインストールします。  

```python
pip install langchain langchain-openai langchain-community langchain-huggingface sentence-transformers streamlit faiss-cpu pypdf python-docx python-pptx pydantic cryptography unstructured docx2txt
```

### プログラム全体

本体ソースコードは以下です。  
ソースコード中のコメントに処理内容を記載しています。
かなり行数が多いので、プログラムの主要な部分についてはこの後解説します。  

```python
import streamlit as st
import os
import tempfile
from pathlib import Path
import shutil
import json
import uuid 

# --- LangChain関連ライブラリのインポート ---
# LLM（大規模言語モデル）および埋め込みモデルを利用したRAG（Retrieval-Augmented Generation）構成に使用
from langchain_openai import ChatOpenAI  # OpenAI互換LLM（例：LM Studio/Ollama）との接続用
from langchain_huggingface import HuggingFaceEmbeddings  # HuggingFaceの埋め込みモデル（ベクトル化用）
from langchain.text_splitter import RecursiveCharacterTextSplitter  # 文書をチャンク単位に分割
from langchain_community.vectorstores import FAISS  # 高速ベクトル検索エンジン（ローカル永続化対応）
from langchain.chains import RetrievalQA  # 検索と回答生成を結合したRAGチェーン
from langchain_community.document_loaders import (
    PyPDFLoader, Docx2txtLoader, TextLoader, UnstructuredPowerPointLoader
)  # 各種ファイル形式のローダー
from langchain.prompts import PromptTemplate  # LLMへのプロンプトテンプレート
from langchain.retrievers.multi_query import MultiQueryRetriever  # 複数クエリ拡張による検索精度向上

# ============================================================
# 永続化関連のパス設定
# ============================================================
DB_DIR = "vectorstore"  # ベクトルストア保存ディレクトリ
DB_FAISS_PATH = Path(DB_DIR) / "faiss_index"  # FAISSベクトルインデックスファイル
DB_METADATA_PATH = Path(DB_DIR) / "metadata.json"  # メタデータ保存ファイル
TEMP_DOCS_DIR = Path(DB_DIR) / "temp_docs"  # 一時的なアップロードファイルの保存先

# ============================================================
# file_uploader のキーを初期化
# ============================================================
# file_uploaderを再初期化するためのユニークキーを設定
if 'file_uploader_key' not in st.session_state:
    st.session_state['file_uploader_key'] = str(uuid.uuid4())

# ============================================================
# ファイル読み込み関数
# ============================================================
def load_document(file_path):
    """拡張子に応じて適切なLangChainローダーで文書を読み込む"""
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        loader = PyPDFLoader(str(file_path))
    elif ext == ".docx":
        loader = Docx2txtLoader(str(file_path))
    elif ext == ".pptx":
        loader = UnstructuredPowerPointLoader(str(file_path))
    else:
        loader = TextLoader(str(file_path), encoding="utf-8")
    return loader.load()  # LangChain Document形式で返却

# ============================================================
# 埋め込みモデル初期化（キャッシュ利用）
# ============================================================
# 埋め込みモデルをキャッシュして再利用する関数
@st.cache_resource(show_spinner=False)
def get_embeddings():
    """HuggingFaceのSentence-BERTモデルを一度だけロードしキャッシュ"""
    return HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# ============================================================
# ベクトルDB構築関数
# ============================================================
# ベクトルDBを構築し、ファイルリストと共にディスクに保存する関数
@st.cache_resource(show_spinner=False)
def build_and_save_db(documents, file_metadata_list):
    """文書群からFAISSベクトルDBを構築し、メタデータと共に保存"""
    if not documents:
        # 文書が空の場合は既存DBを削除
        if Path(DB_DIR).is_dir():
            shutil.rmtree(DB_DIR)
        return None
    
    # 文書を小さなチャンクに分割（500文字単位で100文字重複）
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500, 
        chunk_overlap=100, 
        length_function=len
    )
    docs = text_splitter.split_documents(documents) # 分割実行
    # 埋め込みモデルの初期化 (Sentence-BERTベースのモデルを使用)
    embeddings = get_embeddings()  # 埋め込みモデルの取得

    # FAISSベクトルストアの新規構築
    db = FAISS.from_documents(docs, embeddings)
    
    # 永続化ディレクトリ作成と保存
    Path(DB_FAISS_PATH).parent.mkdir(parents=True, exist_ok=True)
    db.save_local(str(DB_FAISS_PATH))

    # メタデータをJSONとして保存
    with open(DB_METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(file_metadata_list, f, ensure_ascii=False, indent=4)

    return db

# ============================================================
# RAGチェーン構築関数
# ============================================================
# 保存されたDBをロードし、RAGチェーンを作成する関数
def create_rag_chain_from_db(db):
    """既存DBからRAGチェーン（Retrieval＋LLM）を構築"""
    llm = ChatOpenAI(
        model_name="local-model",                       # LM Stduioに読み込まれているモデルを指定（モデル名は特定していない）
        openai_api_base="http://localhost:1234/v1",     # LM StduioサーバのURL
        openai_api_key="not-needed",                    # API-keyは無し
        temperature=0.1,                                # 高い確率の単語を優先的に選ぶ
        max_tokens=512                                  # 最大512トークンに制限
    )

    # 検索精度向上のため、質問を複数クエリに拡張するRetriever
    # MultiQueryRetrieverを設定: 質問をLLMに渡し、複数の質問に言い換えて検索精度を向上させる
    # search_kwargs={"k": 2} で取得する文書チャンク数を2つに制限し、応答速度を改善    
    retriever = MultiQueryRetriever.from_llm(
        retriever=db.as_retriever(search_kwargs={"k": 2}),
        llm=llm
    )

    # RAGプロンプト定義（回答方針）
    prompt_template = """
        以下の参考文章を元に、質問に日本語で回答してください。
        参考文章に答えが見つからない場合は、「分かりません」と回答してください。
        参考文章: {context}
        質問: {question}
    """
    PROMPT = PromptTemplate(
        template=prompt_template, 
        input_variables=["context", "question"]
        )

    # RetrievalQAチェーンを生成（検索→回答生成の一連の流れ）
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",  # 検索結果を全てプロンプトに詰め込む方式
        retriever=retriever,
        return_source_documents=True, # 回答の根拠となった文書（ソース）を返す設定
        chain_type_kwargs={"prompt": PROMPT} # カスタムプロンプトを適用
        )
    return qa_chain

# ============================================================
# 個別ファイル削除とDB再構築
# ============================================================
# 個別ファイル削除とDB再構築のロジック
def delete_single_file(file_id_to_delete):
    """指定されたファイルIDを削除し、残りの文書でDBを再構築"""
    if not DB_METADATA_PATH.exists():
        st.error("メタデータが見つかりません。全体削除を推奨します。")
        return

    with open(DB_METADATA_PATH, "r", encoding="utf-8") as f:
        current_metadata = json.load(f)
    
    # 削除対象を特定
    file_to_remove = next((item for item in current_metadata if item["id"] == file_id_to_delete), None)
    if not file_to_remove:
        st.error("削除対象のファイルIDが見つかりませんでした。")
        return

    # 一時ファイルを削除
    temp_path = Path(file_to_remove["temp_path"])
    if temp_path.exists():
        os.remove(temp_path)

    # 残りのファイルでDBを再構築
    new_metadata = [item for item in current_metadata if item["id"] != file_id_to_delete]
    all_documents = []

    with st.spinner(f"ファイルを削除し、残りのデータでAIを再構築中..."):
        # 残ったすべてのファイルを再ロード
        for item in new_metadata:
            doc_path = Path(item["temp_path"])
            if doc_path.exists():
                documents = load_document(doc_path)
                all_documents.extend(documents)
        
        # 既存キャッシュをクリアしてDB再構築
        if "rag_chain" in st.session_state:
            del st.session_state["rag_chain"]
        build_and_save_db.clear()

        # 残りの文書でDBを再構築し、保存
        db = build_and_save_db(all_documents, new_metadata)

        # 再構築後の状態更新
        if db:
            st.session_state.rag_chain = create_rag_chain_from_db(db)
            st.session_state.current_files = new_metadata
            st.toast(f"✅ ファイル '{file_to_remove['name']}' を削除し、DBを更新しました。", icon="🗑️")
        else:
            # 全削除された場合の後処理
            keys_to_delete = ["rag_chain", "messages", "current_files", "file_identifiers"]
            for key in keys_to_delete:
                if key in st.session_state:
                    del st.session_state[key]
            st.toast("✅ 全てのファイルを削除しました。", icon="🗑️")
            st.session_state['file_uploader_key'] = str(uuid.uuid4())

    st.rerun()  # Streamlit再実行でUI更新

# ============================================================
# 全体削除処理
# ============================================================
def delete_all_data():
    """DBディレクトリとセッション変数を全削除"""
    if Path(DB_DIR).is_dir():
        try:
            shutil.rmtree(DB_DIR)
            st.toast("✅ 全ての読み込みデータを削除しました。", icon="🗑️")
        except OSError as e:
            st.error(f"データの削除中にエラーが発生しました: {e}")
            return

    # セッション変数をクリア
    keys_to_delete = ["rag_chain", "messages", "current_files", "file_identifiers"]
    for key in keys_to_delete:
        if key in st.session_state:
            del st.session_state[key]
    # file_uploader のキーをリセット
    st.session_state['file_uploader_key'] = str(uuid.uuid4())
    st.rerun()

# ============================================================
# Streamlit UI 構築
# ============================================================
st.title("📄 ドキュメント Chatbot")
st.write("複数のPDF, DOCX, PPTX, テキストファイルをアップロードして、内容について質問してください。")

# --- サイドバー: ファイルアップロード ---
uploaded_files = st.sidebar.file_uploader(
    "ファイルをアップロード（既存DBに追加・上書き）",
    type=["pdf", "docx", "pptx", "txt", "md"],
    accept_multiple_files=True,
    key=st.session_state['file_uploader_key']
)

# --- DB存在チェック ---
db_exists = DB_FAISS_PATH.exists()
metadata_exists = DB_METADATA_PATH.exists()
current_file_identifiers = [(f.name, f.size) for f in uploaded_files]

# ----------------------------------------------------------------------
# 初期化ロジック (既存データと新規データの結合処理)
# ----------------------------------------------------------------------

# 1. 新しいファイルがアップロードされた場合 (追加/新規構築＆保存)
if uploaded_files:
    
    # 既存のメタデータ（ファイルリスト）をロード
    existing_metadata = []
    if metadata_exists:
        with open(DB_METADATA_PATH, "r", encoding="utf-8") as f:
            existing_metadata = json.load(f)
    
    # 既存のファイル名（name）のセットを作成（重複チェック用）
    existing_names = {meta['name'] for meta in existing_metadata}

    # ----------------------------------------------------
    # 新規アップロードファイルの処理
    # ----------------------------------------------------
    newly_uploaded_files = []
    
    # アップロードされたファイルの中から、既存ファイル名と重複しないものだけを選択
    for uploaded_file in uploaded_files:
        if uploaded_file.name not in existing_names:
            newly_uploaded_files.append(uploaded_file)
        else:
             # 既存ファイルと同じ名前の場合はスキップ（上書きは行わない）
             pass 
    
    if newly_uploaded_files:
        
        all_documents = []
        new_metadata_list = []
        
        TEMP_DOCS_DIR.mkdir(parents=True, exist_ok=True)
        
        with st.spinner("新しいファイルを読み込んでいます..."):
            for uploaded_file in newly_uploaded_files:
                unique_id = str(uuid.uuid4())
                
                # 新しい一時ファイルとして保存
                temp_path = TEMP_DOCS_DIR / f"{unique_id}_{uploaded_file.name}"
                temp_path.write_bytes(uploaded_file.getvalue())
                
                # 新しいファイルのメタデータを生成
                new_metadata_list.append({
                    "id": unique_id, # 一意なID
                    "name": uploaded_file.name,
                    "temp_path": str(temp_path)
                })

                documents = load_document(temp_path)
                all_documents.extend(documents) # ドキュメントリストに追加
        
        # ----------------------------------------------------
        # 既存データと新規データの結合
        # ----------------------------------------------------
        
        # 既存のファイルを再度ロードし、全ドキュメントリストに結合
        for meta in existing_metadata:
             doc_path = Path(meta["temp_path"])
             if doc_path.exists():
                 documents = load_document(doc_path)
                 all_documents.extend(documents)
             
        # メタデータリストを結合
        combined_metadata = existing_metadata + new_metadata_list

        with st.spinner("AIのデータ統合と再構築をしています..."):
            
            # 古いキャッシュをクリア
            if "rag_chain" in st.session_state:
                del st.session_state["rag_chain"]
            build_and_save_db.clear()

            # 全文書と全メタデータでDBを再構築し、保存
            db = build_and_save_db(all_documents, combined_metadata)
            st.session_state.rag_chain = create_rag_chain_from_db(db)
            st.session_state.current_files = combined_metadata # セッションに新しいファイルリストを保存
        
        st.session_state.messages = []
        st.info("新しいデータが既存のデータに追加され、AIの準備が完了しました。")

        # DB構築成功後、アップローダーのリスト（赤枠部分）をクリアするためにリセット
        st.session_state['file_uploader_key'] = str(uuid.uuid4())
        st.rerun() 

    else:
        # アップロードはされたが、すべて既存ファイル名と同じだった場合
        st.info("アップロードされたファイルはすべて既に読み込まれているファイル名と同じだったため、処理をスキップしました。")
        # スキップされた場合も、手動での削除を防ぐためにアップローダーをリセット
        st.session_state['file_uploader_key'] = str(uuid.uuid4())
        st.rerun() 

# 2. アップロードがなく、既存DBファイルが存在する場合 (高速ロード)
elif not uploaded_files and db_exists and "rag_chain" not in st.session_state:
    with st.spinner("既存のAIデータ（DB）を読み込んでいます..."):
        # 埋め込みモデルをロード
        embeddings = get_embeddings()
        # 既存のFAISS DBをディスクからロード
        db = FAISS.load_local(str(DB_FAISS_PATH), embeddings, allow_dangerous_deserialization=True)
        st.session_state.rag_chain = create_rag_chain_from_db(db)
        
        # 既存のメタデータ（ファイルリスト）をロード
        if metadata_exists:
            with open(DB_METADATA_PATH, "r", encoding="utf-8") as f:
                loaded_metadata = json.load(f)
            st.session_state.current_files = loaded_metadata
            st.success("既存のドキュメントでチャット可能です。")
        else:
            st.session_state.current_files = []
            st.warning("既存のドキュメントでチャット可能ですが、元のファイル名リストが見つかりませんでした。")
        
        st.session_state.messages = []


# 3. 初期メッセージの表示
if "rag_chain" not in st.session_state and not db_exists:
    st.info("ファイルをアップロードするか、過去に保存したデータが存在すれば自動的にロードされます。")

# ----------------------------------------------------------------------
# 表示ロジック: 現在読み込まれているファイル名の表示と削除ボタン 
# ----------------------------------------------------------------------
if "current_files" in st.session_state:
    st.sidebar.markdown("---")
    st.sidebar.subheader("現在読み込まれているファイル")
    
    if st.session_state.current_files:
        for file_meta in st.session_state.current_files:
            col1, col2 = st.sidebar.columns([0.8, 0.2])
            
            # ファイル名を表示
            col1.markdown(f"- **{file_meta['name']}**")
            
            # 個別削除ボタンのUI (ポップオーバーで確認)
            with col2.popover("🗑️", help="このファイルを削除します"):
                st.write(f"ファイル **{file_meta['name']}** を削除し、DBを再構築しますか？")
                if st.button("削除を確定", key=f"delete_{file_meta['id']}", type="secondary"):
                    delete_single_file(file_meta['id'])
    else:
        st.sidebar.markdown("- ファイルがありません。")

    st.sidebar.markdown("---")
    if Path(DB_DIR).is_dir():
        # 全体削除ボタン
        if st.sidebar.button("🗑️ 全ての読み込みデータを削除", type="secondary"):
            delete_all_data()

# ============================================================
# チャット処理
# ============================================================
if "rag_chain" in st.session_state:
    # 履歴表示
    if "messages" in st.session_state:
        for message in st.session_state.messages:
            with st.chat_message(message["role"]):
                st.markdown(message["content"])

    # ユーザー入力受付
    if prompt := st.chat_input("ドキュメントについて質問をどうぞ"):
        with st.chat_message("user"):
            st.markdown(prompt)
        st.session_state.messages.append({"role": "user", "content": prompt})

        rag_chain = st.session_state.rag_chain
        with st.spinner("考え中..."):
            # RAG実行（検索＋回答生成）
            response = rag_chain.invoke({"query": prompt})
            answer = response["result"]

        # 回答表示と参照ソース展開
        with st.chat_message("assistant"):
            st.markdown(answer)
            with st.expander("参考にした文章"):
                for doc in response["source_documents"]:
                    st.markdown(f"--- \n {doc.page_content}")

        st.session_state.messages.append({"role": "assistant", "content": answer})
```

### コード全体の構造

`app2.py`の構成を俯瞰すると以下のようになります。

```text
1.  ドキュメントローダー関数群
2.  ベクトルDB構築・保存・ロード関数
3.  RAGチェーン生成関数（MultiQueryRetrieverによる検索精度向上）
4.  ファイル削除ロジック
5.  Streamlit UI構成
    - サイドバー: アップロード・削除・一覧表示
    - メイン画面: チャットUI
```

この分離構造により、RAG処理とUIが明確に分かれ、拡張性が高い設計になっています。

---

## 主要コンポーネントの説明

この章では、`app2.py` の内部構造をさらに掘り下げ、各関数やモジュールがどのように連携して RAG (Retrieval-Augmented Generation) 環境を構築しているのかを詳しく解説します。

---

### 1. ドキュメントローダー（Document Loader）

この部分はシステムの「入力ゲート」として機能します。アップロードされたファイルを受け取り、LangChain が扱える `Document` オブジェクトに変換します。これにより、後続のベクトル化処理や検索が統一的に実施できます。  
内部では拡張子を基に適切なローダークラスを選択し、PDF・Word・PowerPoint・テキストの各形式に対応しています。  
ローダーは単にテキストを抽出するだけでなく、ページ情報などのメタデータも付与します。  


`load_document()`関数で、PDF・DOCX・PPTX・TXTなどのファイル形式を自動判別して読み込みます。  
LangChainの各種ローダーを活用しています。

```python
from langchain_community.document_loaders import (
    PyPDFLoader, Docx2txtLoader, TextLoader, UnstructuredPowerPointLoader
)
```

### 2. ベクトルDB（FAISS）永続化

RAG の根幹を担うのがこの部分です。分割・埋め込み・保存の3工程で構成され、アップロードした複数の文書を検索可能な形に変換します。

- **分割**：`RecursiveCharacterTextSplitter` により、文脈の自然な区切りを保ったままテキストをチャンク化。
- **埋め込み**：`HuggingFaceEmbeddings` によるSentence-BERTモデル（`all-MiniLM-L6-v2`）を使用し、文意を数値ベクトルに変換。
- **保存**：FAISSによってベクトル空間を構築し、インデックスファイルとしてローカル保存。

これらを組み合わせることで、アプリを再起動しても同一の知識ベースを即座に再利用できる「永続化RAG」が実現しています。

分割したドキュメントチャンクを埋め込み（ベクトル化）し、FAISSで保存します。  
保存先は`vectorstore/faiss_index/`です。  
また、読み込んだファイル情報（UUID、ファイル名、保存パス）は`metadata.json`に保持します。

これにより、アプリを再起動しても**同じ知識ベースを即座に再利用**できます。

また、アプリの中で特に処理時間が長くなりやすいのが、**埋め込みモデルのロード**や**FAISSベクトルDBの構築**です。  
これらを毎回ゼロから実行すると、ユーザー体験が大きく損なわれます。  

そこで Streamlit の `@st.cache_resource` デコレータを利用しています。  
これは、関数の戻り値（モデルやデータベースなどの「リソース」）をキャッシュし、再利用可能にする仕組みです。  
以前の `@st.cache` の後継であり、リソース指向のキャッシュをより安全かつ効率的に扱うことができます。  

### 3. MultiQueryRetrieverによる検索精度向上

標準的なRAGでは、ユーザーの質問を1つのクエリに変換して検索しますが、このプログラムでは LangChain の `MultiQueryRetriever` を採用し、LLMが質問を複数の言い換えに自動変換します。

たとえば「品質管理とは何か？」という質問に対して、LLMは内部で以下のような複数クエリを生成します：

- 品質管理の定義とは？
- ソフトウェア品質保証との違いは？
- 品質を維持・改善する方法とは？

これにより、文書中の言い換え表現や別の文脈にもマッチしやすくなり、検索精度が大幅に向上します。

単一の質問に対し、LLMが複数の検索クエリを自動生成し、類似文書を多角的に探索します。  
これにより、**言い換えや表現の揺れ**に強いRAGが実現できます。

```python
from langchain.retrievers.multi_query import MultiQueryRetriever

retriever = MultiQueryRetriever.from_llm(
    retriever=db.as_retriever(search_kwargs={"k": 2}),
    llm=llm
)
```

`search_kwargs={"k": 2}` の **「k」** は、Retriever が検索時に**取得する類似文書チャンクの件数（トップK件）** を表します。  
つまり、「最も関連度の高い文書を上位2件だけ取得する」という設定です。

LangChain の Retriever は、ユーザーの質問と文書をベクトル空間上で比較し、**コサイン類似度が高い順に K 件の文書チャンクを返します**。

| パラメータ | 意味 |
|-------------|------|
| `k` | 類似度上位 K 件の文書を取得する |
| `search_kwargs` | 検索時の動作パラメータをまとめた辞書 |
| `db.as_retriever()` | ベクトルDB（FAISSなど）を検索エンジンとして利用する設定 |

なぜ「2」を選んでいるのかは、**検索精度・処理速度・トークン消費**のバランスを最適化するためです。

| 観点 | kが大きい場合 | kが小さい場合（例：2） |
|------|----------------|------------------------|
| **検索精度** | 多くの文書を参照できるが、関係ない文も混ざりやすい | 関連度の高い文脈に限定できる |
| **処理速度** | 応答が遅くなる（特にローカル実行時） | 高速で軽量に動作する |
| **トークン消費** | 多文書入力により増加 | 少なく済むため効率的 |
| **適用場面** | 大規模RAGや多分野文書 | 小規模・単一テーマのRAG（本アプリに最適） |

本アプリでは「ローカル実行」「FAISS永続化」「中〜小規模ドキュメント」を前提としているため、**過剰な文脈を含めずに回答の精度と速度を両立させる**ことが重要です。

- LLM（LM Studio / Ollamaなど）のコンテキスト長に収まるよう調整  
- StreamlitのUI上で応答をスムーズに返すため、処理時間を短縮  
- ノイズ文書を除去して、より一貫性のある回答を生成  

チューニングの目安は以下です。

| k値 | 特徴 | 想定用途 |
|-----|------|----------|
| 1 | 最速・最小トークン。文脈が単純な場合に最適。 | 短文中心・単一テーマ |
| 2〜3 | 精度と速度のバランスが良い。 | 通常のRAG（本アプリ推奨） |
| 5以上 | 網羅的だが遅い。長文・百科事典的な用途に適する。 | 多分野・長文RAG |

このように、**`k=2` は「精度・速度・軽量性の最適点」** を狙った実装上の設計判断です。

### 4. ファイル削除操作

永続化されたデータを扱う場合、部分的な削除や再構築の制御が不可欠です。  
このアプリでは2段階の削除ロジックを実装しています：  

1. **個別削除**：特定のファイルIDを基に、そのファイルに対応する一時保存データとメタ情報を削除し、残りのデータからDBを再構築します。
2. **全削除**：`vectorstore/`ディレクトリ全体を削除し、完全な初期化を行います。

削除処理はすべてStreamlitのセッション状態と連動しており、削除後に`st.rerun()`でアプリを再描画することで、UIが即時更新されます。

アプリは、ファイルアップロード時に自動でベクトルDBを再構築します。  
また、以下の2種類の削除機能を備えています。

| 操作 | 動作 |
|------|------|
| 個別削除 | 特定ファイルを削除し、残りのデータでDBを再構築 |
| 全削除 | `vectorstore/`ディレクトリ全体を削除して完全初期化 |

削除後は自動でUIがリフレッシュされ、状態が更新されます。

### 5. Streamlit UI の特徴

アプリケーションの操作性を担うフロントエンド部分です。Streamlitのコンポーネントを駆使し、シンプルながら実用的なチャットUIを構築しています。特筆すべき点は次の通りです。

- **サイドバー**：ファイル管理・削除・リスト表示の制御を集中化。
- **チャットエリア**：`st.chat_message` を使い、ユーザーとAIの会話履歴を対話形式で可視化。
- **再現性**：Streamlitの`session_state`を活用することで、状態保持と再初期化を両立しています。

さらに、チャットの背後ではRAGチェーン（`RetrievalQA`）が動作しており、質問ごとに検索→生成の2段階推論を行います。

#### サイドバー

- ファイルアップロード（複数対応）
- 現在読み込まれているファイル一覧
- 各ファイルの削除ボタン
- 「全削除」ボタン

#### メイン画面

- チャット履歴の表示
- 「ドキュメントについて質問をどうぞ」入力欄
- AI回答と「参考にした文章」の展開パネル

---

## 実行方法

1. LM Studioで `http://localhost:1234` サーバを起動（事前にLLMをロードしておく）  
2. ターミナルで以下を実行：

```bash
streamlit run app2.py
```

ブラウザ（通常は `http://localhost:8501`）でアプリが開きます。  
![](https://gyazo.com/25fdfd8852aaa899fcca65d14596b7c4.png)

初回起動時は「ファイルをアップロードしてください」というメッセージが表示されます。  
PDFやテキストをアップロードすると、自動的に学習・永続化が行われます。

---

## 例：複数ドキュメントを活用したRAG

前回の「桃太郎」のほかに「かぐや姫」の物語をRAGに読み込ませます。  
かぐや姫の物語は以下のようにしました。

```text
むかしむかし、竹を取って暮らす翁（おきな）と、その妻が住んでいました。
ある日、翁が山で光る竹を見つけ、その竹を割ると中から小さな女の子が出てきました。
翁はその子を家に連れ帰り、妻とともに「かぐや姫」と名付けて大切に育てました。
かぐや姫は美しく成長し、そのうつくしさは都にまで広まりました。
多くの貴族が求婚しましたが、かぐや姫は誰の申し出も受けず、難しい宝を求めて試しました。
誰一人として成功する者はいませんでした。
やがて帝もかぐや姫を愛しましたが、彼女の心は月の国にありました。
十五夜の夜、月の使者が迎えに来て、かぐや姫は涙を流しながら月へ帰っていきました。
翁と妻は深く悲しみ、いつまでも夜空を見上げてかぐや姫を思いました。
```

「桃太郎」と「かぐや姫」の2つのテキストをアップロードした場合、両者の内容を組み合わせた質問にも正確に回答できます。  

それぞれを読み込ませます。  
![](https://gyazo.com/1c2152476622b44233757c7f19bc9376.png)

> 質問例：「桃太郎とかぐや姫にはどんな共通点がありますか？」

RAGはそれぞれの物語から類似する文脈を抽出し、両者を比較した回答を生成します。

回答として以下のような文章が出力されました。  
![](https://gyazo.com/440c40bf9bd04d8309a808038ef671ab.png)

回答の中の「どちらも最終的に元の場所へ帰っていくという結末」は、双方が元居た場所に戻るというところを関連付けているのが面白いです。  
（桃太郎はおじいさん、おばあさんの元へ。かぐや姫は月へ）  

---

## まとめ

今回の拡張版では、ローカルRAG環境をより実践的な形に進化させました。  

| 改善点 | 効果 |
|--------|------|
| **FAISS永続化** | 再起動後もDB再構築不要で高速起動 |
| **MultiQueryRetriever** | 検索精度の向上 |
| **ファイル管理UI** | アップロード・削除を視覚的に操作可能 |
| **複数ファイル形式対応** | PDF/DOCX/PPTX/TXTを混在学習可能 |

ローカル環境で完結しながらも、実用的な知識アシスタントを実現できるようになりました。  
次回は、**文書の要約・分類機能の追加**や、**OpenAI互換API以外のモデル（例：Ollama, Llama.cpp）対応**にも拡張していく予定です。

<style>
img { border: 1px solid gray; }
</style>
