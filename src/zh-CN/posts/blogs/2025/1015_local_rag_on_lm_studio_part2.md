---
title: 不依赖云的AI体验：使用LM Studio+LangChain+Streamlit构建本地RAG的多文档与持久化支持
author: shuichi-takatsu
date: 2025-10-15T00:00:00.000Z
tags:
  - lmstudio
  - LangChain
  - Streamlit
  - FAISS
  - LLM
  - 生成AI
  - RAG
image: true
translate: true

---

## 介绍

[上一篇](/blogs/2025/10/14/local_rag_on_lm_studio/)的文章中，我们构建了一个针对**单个文本文件（桃太郎物語）**的简单RAG（检索+生成）环境。  
这次作为扩展，我们将构建一个**支持加载、保留和删除多个文档的持久化本地RAG应用**。

---

## 整体架构

### 目录结构

```bash
project/
├─ app2.py              # 主应用程序
├─ vectorstore/         # 向量存储持久化目录
│   ├─ faiss_index/     # FAISS 索引文件
│   ├─ metadata.json    # 已加载的文件列表
│   └─ temp_docs/       # 上传文档的临时保存位置
```

新的应用（`app2.py`）具有以下演进。

| 功能 | 内容 |
|------|------|
| **多文档支持** | 可同时学习 PDF、Word、PowerPoint、文本等多种文件 |
| **持久化存储** | 向量数据库（FAISS）本地保存，重启后无需重建 |
| **单个文件删除** | 删除指定文件后重建数据库 |
| **UI增强** | 在 Streamlit 侧边栏可进行文件列表、删除、全部删除操作 |
| **精度提升** | 通过 MultiQueryRetriever 多角度转换问题，提高检索精度 |

启动应用后，会在 `vectorstore/` 下自动创建所需文件夹。  
添加文件后，向量数据库和元数据将持久化到磁盘。

### 所需库

使用以下命令安装所需库。  

```bash
pip install langchain langchain-openai langchain-community langchain-huggingface sentence-transformers streamlit faiss-cpu pypdf python-docx python-pptx pydantic cryptography unstructured docx2txt
```

### 程序整体

主源码如下。  
注释中说明了处理内容。  
源码行数较多，主要部分将在后面进行解释。  

```python
import streamlit as st
import os
import tempfile
from pathlib import Path
import shutil
import json
import uuid 

# --- 引入 LangChain 相关库 ---
# 用于构建基于 LLM（大型语言模型）和嵌入模型的 RAG（检索增强生成）结构
from langchain_openai import ChatOpenAI  # 用于与兼容 OpenAI 的 LLM（例如：LM Studio/Ollama）连接
from langchain_huggingface import HuggingFaceEmbeddings  # HuggingFace 嵌入模型（用于向量化）
from langchain.text_splitter import RecursiveCharacterTextSplitter  # 将文档分割为块
from langchain_community.vectorstores import FAISS  # 高速向量检索引擎（支持本地持久化）
from langchain.chains import RetrievalQA  # 将检索和回答生成结合的 RAG 链
from langchain_community.document_loaders import (
    PyPDFLoader, Docx2txtLoader, TextLoader, UnstructuredPowerPointLoader
)  # 各种文件格式加载器
from langchain.prompts import PromptTemplate  # 用于 LLM 的提示模板
from langchain.retrievers.multi_query import MultiQueryRetriever  # 通过多查询扩展提高检索精度

# ============================================================
# 持久化相关路径配置
# ============================================================
DB_DIR = "vectorstore"  # 向量存储保存目录
DB_FAISS_PATH = Path(DB_DIR) / "faiss_index"  # FAISS 向量索引文件
DB_METADATA_PATH = Path(DB_DIR) / "metadata.json"  # 元数据保存文件
TEMP_DOCS_DIR = Path(DB_DIR) / "temp_docs"  # 临时上传文件保存路径

# ============================================================
# 初始化 file_uploader 的键
# ============================================================
# 设置唯一键以重新初始化 file_uploader
if 'file_uploader_key' not in st.session_state:
    st.session_state['file_uploader_key'] = str(uuid.uuid4())

# ============================================================
# 文件加载函数
# ============================================================
def load_document(file_path):
    """根据扩展名使用合适的 LangChain 加载器加载文档"""
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        loader = PyPDFLoader(str(file_path))
    elif ext == ".docx":
        loader = Docx2txtLoader(str(file_path))
    elif ext == ".pptx":
        loader = UnstructuredPowerPointLoader(str(file_path))
    else:
        loader = TextLoader(str(file_path), encoding="utf-8")
    return loader.load()  # 返回 LangChain Document 格式

# ============================================================
# 嵌入模型初始化（使用缓存）
# ============================================================
# 用于缓存并重用嵌入模型的函数
@st.cache_resource(show_spinner=False)
def get_embeddings():
    """仅加载一次 HuggingFace 的 Sentence-BERT 模型并缓存"""
    return HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# ============================================================
# 构建向量数据库函数
# ============================================================
# 构建向量数据库并将文件列表一起保存到磁盘的函数
@st.cache_resource(show_spinner=False)
def build_and_save_db(documents, file_metadata_list):
    """从文档集合构建 FAISS 向量数据库并保存元数据"""
    if not documents:
        # 如果文档为空，则删除现有数据库
        if Path(DB_DIR).is_dir():
            shutil.rmtree(DB_DIR)
        return None
    
    # 将文档分割成小块（每块500字符，重叠100字符）
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500, 
        chunk_overlap=100, 
        length_function=len
    )
    docs = text_splitter.split_documents(documents)  # 执行分割
    # 初始化嵌入模型（使用基于 Sentence-BERT 的模型）
    embeddings = get_embeddings()  # 获取嵌入模型

    # 构建新的 FAISS 向量存储
    db = FAISS.from_documents(docs, embeddings)
    
    # 创建持久化目录并保存
    Path(DB_FAISS_PATH).parent.mkdir(parents=True, exist_ok=True)
    db.save_local(str(DB_FAISS_PATH))

    # 将元数据以 JSON 格式保存
    with open(DB_METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(file_metadata_list, f, ensure_ascii=False, indent=4)

    return db

# ============================================================
# 构建 RAG 链函数
# ============================================================
# 从保存的数据库加载并创建 RAG 链的函数
def create_rag_chain_from_db(db):
    """从现有数据库构建 RAG 链（检索+LLM）"""
    llm = ChatOpenAI(
        model_name="local-model",                       # 指定已加载到 LM Studio 的模型（未指定具体名称）
        openai_api_base="http://localhost:1234/v1",     # LM Studio 服务端的 URL
        openai_api_key="not-needed",                    # 无需 API key
        temperature=0.1,                                # 优先选择高概率词汇
        max_tokens=512                                  # 限制最大 512 tokens
    )

    # 为提高检索精度，将问题扩展为多个查询的 Retriever
    # 设置 MultiQueryRetriever：将问题传给 LLM，进行多种方式重述以提高检索精度
    # 通过 search_kwargs={"k": 2} 将获取的文档块数量限制为 2，以提升响应速度
    retriever = MultiQueryRetriever.from_llm(
        retriever=db.as_retriever(search_kwargs={"k": 2}),
        llm=llm
    )

    # 定义 RAG 提示（回答策略）
    prompt_template = """
        请基于以下参考文档，用中文回答问题。
        如果在参考文档中找不到答案，请回答“不知道”。
        参考文档: {context}
        问题: {question}
    """
    PROMPT = PromptTemplate(
        template=prompt_template, 
        input_variables=["context", "question"]
    )

    # 生成 RetrievalQA 链（检索→回答生成 的完整流程）
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",  # 将所有检索结果直接放入提示的方式
        retriever=retriever,
        return_source_documents=True,  # 返回作为回答依据的文档（source）
        chain_type_kwargs={"prompt": PROMPT}  # 应用自定义提示
    )
    return qa_chain

# ============================================================
# 单个文件删除与数据库重建
# ============================================================
# 单个文件删除与数据库重建逻辑
def delete_single_file(file_id_to_delete):
    """删除指定文件 ID，并用剩余文档重建数据库"""
    if not DB_METADATA_PATH.exists():
        st.error("未找到元数据。建议执行全部删除。")
        return

    with open(DB_METADATA_PATH, "r", encoding="utf-8") as f:
        current_metadata = json.load(f)
    
    # 确定要删除的对象
    file_to_remove = next((item for item in current_metadata if item["id"] == file_id_to_delete), None)
    if not file_to_remove:
        st.error("未找到要删除的文件 ID。")
        return

    # 删除临时文件
    temp_path = Path(file_to_remove["temp_path"])
    if temp_path.exists():
        os.remove(temp_path)

    # 用剩余文件重建数据库
    new_metadata = [item for item in current_metadata if item["id"] != file_id_to_delete]
    all_documents = []

    with st.spinner(f"正在删除文件，并用剩余数据重建 AI..."):
        # 重新加载所有剩余文件
        for item in new_metadata:
            doc_path = Path(item["temp_path"])
            if doc_path.exists():
                documents = load_document(doc_path)
                all_documents.extend(documents)
        
        # 清除现有缓存并重建数据库
        if "rag_chain" in st.session_state:
            del st.session_state["rag_chain"]
        build_and_save_db.clear()

        # 用剩余文档重建并保存数据库
        db = build_and_save_db(all_documents, new_metadata)

        # 重建后更新状态
        if db:
            st.session_state.rag_chain = create_rag_chain_from_db(db)
            st.session_state.current_files = new_metadata
            st.toast(f"✅ 已删除文件 '{file_to_remove['name']}'，并更新了数据库。", icon="🗑️")
        else:
            # 如果全部文件被删除，后续处理
            keys_to_delete = ["rag_chain", "messages", "current_files", "file_identifiers"]
            for key in keys_to_delete:
                if key in st.session_state:
                    del st.session_state[key]
            st.toast("✅ 已删除所有文件。", icon="🗑️")
            st.session_state['file_uploader_key'] = str(uuid.uuid4())

    # 通过 Streamlit 再次执行以更新 UI
    st.rerun()

# ============================================================
# 全量删除处理
# ============================================================
def delete_all_data():
    """删除整个数据库目录和会话变量"""
    if Path(DB_DIR).is_dir():
        try:
            shutil.rmtree(DB_DIR)
            st.toast("✅ 已删除所有加载的数据。", icon="🗑️")
        except OSError as e:
            st.error(f"删除数据时发生错误: {e}")
            return

    # 清除会话变量
    keys_to_delete = ["rag_chain", "messages", "current_files", "file_identifiers"]
    for key in keys_to_delete:
        if key in st.session_state:
            del st.session_state[key]
    # 重置 file_uploader 的键
    st.session_state['file_uploader_key'] = str(uuid.uuid4())
    st.rerun()

# ============================================================
# 构建 Streamlit UI
# ============================================================
st.title("📄 文档 聊天机器人")
st.write("上传多个 PDF、DOCX、PPTX、文本文件，然后提问内容相关问题。")

# --- 侧边栏：文件上传 ---
uploaded_files = st.sidebar.file_uploader(
    "上传文件（添加到现有数据库或覆盖）",
    type=["pdf", "docx", "pptx", "txt", "md"],
    accept_multiple_files=True,
    key=st.session_state['file_uploader_key']
)

# --- 检查数据库是否存在 ---
db_exists = DB_FAISS_PATH.exists()
metadata_exists = DB_METADATA_PATH.exists()
current_file_identifiers = [(f.name, f.size) for f in uploaded_files]

# ----------------------------------------------------------------------
# 初始化逻辑（现有数据与新数据的合并处理）
# ----------------------------------------------------------------------

# 1. 当上传了新文件时（追加/新建构建并保存）
if uploaded_files:
    
    # 加载现有元数据（文件列表）
    existing_metadata = []
    if metadata_exists:
        with open(DB_METADATA_PATH, "r", encoding="utf-8") as f:
            existing_metadata = json.load(f)
    
    # 创建现有文件名集合（用于去重）
    existing_names = {meta['name'] for meta in existing_metadata}

    # ----------------------------------------------------
    # 处理新上传文件
    # ----------------------------------------------------
    newly_uploaded_files = []
    
    # 从上传文件中筛选出与现有文件名不重叠的
    for uploaded_file in uploaded_files:
        if uploaded_file.name not in existing_names:
            newly_uploaded_files.append(uploaded_file)
        else:
            # 如果与现有文件同名则跳过（不覆盖）
            pass 
    
    if newly_uploaded_files:
        
        all_documents = []
        new_metadata_list = []
        
        TEMP_DOCS_DIR.mkdir(parents=True, exist_ok=True)
        
        with st.spinner("正在加载新文件..."):
            for uploaded_file in newly_uploaded_files:
                unique_id = str(uuid.uuid4())
                
                # 保存为新的临时文件
                temp_path = TEMP_DOCS_DIR / f"{unique_id}_{uploaded_file.name}"
                temp_path.write_bytes(uploaded_file.getvalue())
                
                # 生成新文件的元数据
                new_metadata_list.append({
                    "id": unique_id,  # 唯一 ID
                    "name": uploaded_file.name,
                    "temp_path": str(temp_path)
                })

                documents = load_document(temp_path)
                all_documents.extend(documents)  # 添加至文档列表
        
        # ----------------------------------------------------
        # 合并现有数据与新数据
        # ----------------------------------------------------
        
        # 重新加载现有文件，并合并到所有文档列表
        for meta in existing_metadata:
            doc_path = Path(meta["temp_path"])
            if doc_path.exists():
                documents = load_document(doc_path)
                all_documents.extend(documents)
             
        # 合并元数据列表
        combined_metadata = existing_metadata + new_metadata_list

        with st.spinner("正在整合并重建 AI 数据..."):
            
            # 清除旧缓存
            if "rag_chain" in st.session_state:
                del st.session_state["rag_chain"]
            build_and_save_db.clear()

            # 用所有文档和元数据重建并保存数据库
            db = build_and_save_db(all_documents, combined_metadata)
            st.session_state.rag_chain = create_rag_chain_from_db(db)
            st.session_state.current_files = combined_metadata  # 将新文件列表保存到会话
        
        st.session_state.messages = []
        st.info("新数据已添加至现有数据，AI 已准备就绪。")

        # 构建成功后，为清空上传列表（红框部分）重置上传键
        st.session_state['file_uploader_key'] = str(uuid.uuid4())
        st.rerun() 

    else:
        # 虽上传了文件，但均与现有文件同名时
        st.info("上传的文件均与已加载文件同名，已跳过处理。")
        # 即使跳过，也为防误删除重置上传键
        st.session_state['file_uploader_key'] = str(uuid.uuid4())
        st.rerun() 

# 2. 未上传新文件，但存在现有数据库（快速加载）
elif not uploaded_files and db_exists and "rag_chain" not in st.session_state:
    with st.spinner("正在加载现有 AI 数据（数据库）..."):
        # 加载嵌入模型
        embeddings = get_embeddings()
        # 从磁盘加载现有 FAISS 数据库
        db = FAISS.load_local(str(DB_FAISS_PATH), embeddings, allow_dangerous_deserialization=True)
        st.session_state.rag_chain = create_rag_chain_from_db(db)
        
        # 加载现有元数据（文件列表）
        if metadata_exists:
            with open(DB_METADATA_PATH, "r", encoding="utf-8") as f:
                loaded_metadata = json.load(f)
            st.session_state.current_files = loaded_metadata
            st.success("已加载现有文档，可进行聊天。")
        else:
            st.session_state.current_files = []
            st.warning("已加载现有文档，但未找到原始文件名列表。")
        
        st.session_state.messages = []


# 3. 显示初始消息
if "rag_chain" not in st.session_state and not db_exists:
    st.info("上传文件或存在已保存数据时将自动加载。")

# ----------------------------------------------------------------------
# 显示逻辑：当前已加载文件名列表及删除按钮
# ----------------------------------------------------------------------
if "current_files" in st.session_state:
    st.sidebar.markdown("---")
    st.sidebar.subheader("当前已加载的文件")
    
    if st.session_state.current_files:
        for file_meta in st.session_state.current_files:
            col1, col2 = st.sidebar.columns([0.8, 0.2])
            
            # 显示文件名
            col1.markdown(f"- **{file_meta['name']}**")
            
            # 单个删除按钮 UI（确认弹出）
            with col2.popover("🗑️", help="删除此文件"):
                st.write(f"是否删除文件 **{file_meta['name']}** 并重建数据库？")
                if st.button("确认删除", key=f"delete_{file_meta['id']}", type="secondary"):
                    delete_single_file(file_meta['id'])
    else:
        st.sidebar.markdown("- 无文件。")

    st.sidebar.markdown("---")
    if Path(DB_DIR).is_dir():
        # 全量删除按钮
        if st.sidebar.button("🗑️ 删除所有加载数据", type="secondary"):
            delete_all_data()

# ============================================================
# 聊天处理
# ============================================================
if "rag_chain" in st.session_state:
    # 显示历史记录
    if "messages" in st.session_state:
        for message in st.session_state.messages:
            with st.chat_message(message["role"]):
                st.markdown(message["content"])

    # 接受用户输入
    if prompt := st.chat_input("请输入文档相关问题"):
        with st.chat_message("user"):
            st.markdown(prompt)
        st.session_state.messages.append({"role": "user", "content": prompt})

        rag_chain = st.session_state.rag_chain
        with st.spinner("思考中..."):
            # 执行 RAG（检索+回答生成）
            response = rag_chain.invoke({"query": prompt})
            answer = response["result"]

        # 显示回答及参考来源
        with st.chat_message("assistant"):
            st.markdown(answer)
            with st.expander("参考文档"):
                for doc in response["source_documents"]:
                    st.markdown(f"--- \n {doc.page_content}")

        st.session_state.messages.append({"role": "assistant", "content": answer})
```

### 完整代码结构

从宏观上看，`app2.py` 的结构如下。

```text
1. 文档加载器函数群
2. 向量数据库构建、保存、加载函数
3. RAG 链生成函数（基于 MultiQueryRetriever 提高检索精度）
4. 文件删除逻辑
5. Streamlit UI 构建
    - 侧边栏：上传、删除、列表显示
    - 主界面：聊天 UI
```

这种分离结构使 RAG 处理和 UI 明确分离，设计具有高度可扩展性。

---

## 主要组件说明

本章将深入探讨 `app2.py` 的内部结构，详细说明各函数和模块如何协同构建 RAG (检索增强生成) 环境。

---

### 1. 文档加载器（Document Loader）

该部分充当系统的“输入门”。接受上传的文件，并将其转换为 LangChain 可处理的 `Document` 对象。这样后续的向量化处理和检索可以统一进行。  
内部根据扩展名选择合适的加载类，支持 PDF、Word、PowerPoint、文本等格式。  
加载器不仅仅提取文本，还会附加页码等元数据。  

通过 `load_document()` 函数，自动识别并加载 PDF、DOCX、PPTX、TXT 等文件格式。  
利用了 LangChain 的各种加载器。

```python
from langchain_community.document_loaders import (
    PyPDFLoader, Docx2txtLoader, TextLoader, UnstructuredPowerPointLoader
)
```

### 2. 向量数据库（FAISS）持久化

RAG 的核心在于这一部分。由分割、嵌入、保存三步构成，将上传的多个文档转换为可检索的形式。

- **分割**：使用 `RecursiveCharacterTextSplitter`，在保持语境自然断点的情况下将文本分块。  
- **嵌入**：使用 `HuggingFaceEmbeddings` 的 Sentence-BERT 模型（`all-MiniLM-L6-v2`），将语义转换为数值向量。  
- **保存**：通过 FAISS 构建向量空间，并作为索引文件本地保存。

通过结合这些步骤，实现了即使重启应用也能立即重用相同知识库的“持久化RAG”。  

将分割后的文档块进行嵌入（向量化），并使用 FAISS 保存。  
保存路径为 `vectorstore/faiss_index/`。  
同时，将加载的文件信息（UUID、文件名、保存路径）保存在 `metadata.json` 中。  

这样，即使重启应用，也能**立即重用相同的知识库**。  

此外，应用中最耗时的往往是**加载嵌入模型**和**构建 FAISS 向量数据库**。  
如果每次都从零开始执行这些，会严重影响用户体验。  

因此使用了 Streamlit 的 `@st.cache_resource` 装饰器。  
它会缓存函数的返回值（模型或数据库等“资源”），以便重复使用。  
这是对以前 `@st.cache` 的升级，能够更安全高效地处理资源级缓存。

### 3. 使用 MultiQueryRetriever 提升检索精度

在标准 RAG 中，用户问题会被转换为单个查询进行检索，而本程序采用了 LangChain 的 `MultiQueryRetriever`，让 LLM 自动将问题转换为多个等效问法。

例如对于“什么是质量管理？”这一问题，LLM 内部可能生成如下多个查询：  
- 质量管理的定义是什么？  
- 与软件质量保证有什么区别？  
- 如何保持和改进质量？  

这样可以更容易匹配文档中的同义或不同上下文，大幅提升检索精度。

针对单一问题，LLM 会自动生成多个检索查询，从多个角度探索相似文档。  
由此实现了**对同义和表述差异**具有鲁棒性的 RAG。

```python
from langchain.retrievers.multi_query import MultiQueryRetriever

retriever = MultiQueryRetriever.from_llm(
    retriever=db.as_retriever(search_kwargs={"k": 2}),
    llm=llm
)
```

`search_kwargs={"k": 2}` 中的 **“k”** 表示 Retriever 在检索时**获取的相似文档块数量（Top K）**。  
即该设置表示“仅获取最相关的前 2 个文档块”。

LangChain 的 Retriever 会在向量空间中比较用户问题和文档，**按余弦相似度高低返回 K 个文档块**。

| 参数 | 含义 |
|------|------|
| `k` | 获取相似度最高的 K 个文档 |
| `search_kwargs` | 检索时的行为参数字典 |
| `db.as_retriever()` | 将向量数据库（例如 FAISS）用作检索引擎的设置 |

之所以选择“2”，是为了在**检索精度、处理速度、Token 消耗**之间达到最佳平衡。

| 视角 | k 较大时 | k 较小时（如 2） |
|------|----------|------------------|
| **检索精度** | 可引用更多文档，但容易夹杂无关内容 | 可限定在高度相关的上下文 |
| **处理速度** | 响应变慢（尤其本地运行时） | 运行高速轻量 |
| **Token 消耗** | 文档输入越多，消耗越大 | 消耗较少，效率更高 |
| **适用场景** | 大规模 RAG 或多领域文档 | 小规模、单主题 RAG（本应用最佳） |

本应用以“本地运行”“FAISS 持久化”“中小规模文档”为前提，因此**在不包含过多上下文的情况下兼顾回答精度与速度**尤为重要。

- 调整以适应 LLM（如 LM Studio / Ollama 等）的上下文长度  
- 缩短处理时间，以在 Streamlit UI 上平滑返回响应  
- 去除噪声文档，生成更具一致性的回答  

调优参考如下：

| k 值 | 特点 | 预期用途 |
|------|------|----------|
| 1 | 最快、最少 Token。适用于上下文简单场景。 | 以短文为主、单一主题 |
| 2〜3 | 精度与速度平衡良好。 | 常规 RAG（推荐本应用使用） |
| 5 以上 | 全面但较慢。适合长文或百科全书场景。 | 多领域、长文本 RAG |

由此，**`k=2` 是在实现上针对“精度、速度与轻量性优化点”所做的设计选择**。

### 4. 文件删除操作

在处理持久化数据时，部分删除和重建的控制至关重要。  
本应用实现了两阶段的删除逻辑：  

1. **单个删除**：基于特定文件 ID，删除对应的临时保存数据和元信息，然后用剩余数据重建数据库。  
2. **全量删除**：删除整个 `vectorstore/` 目录，进行完全初始化。

所有删除操作均与 Streamlit 会话状态联动，删除后通过 `st.rerun()` 重新渲染应用以即时更新 UI。

应用在文件上传时会自动重建向量数据库。  
此外，具备以下两种删除功能：

| 操作 | 动作 |
|------|------|
| 单个删除 | 删除指定文件，并用剩余数据重建数据库 |
| 全量删除 | 删除整个 `vectorstore/` 目录并完全初始化 |

删除后 UI 会自动刷新，状态得到更新。

### 5. Streamlit UI 特点

是负责应用操作性的前端部分。利用 Streamlit 组件，构建了简洁且实用的聊天 UI。值得一提的点如下：

- **侧边栏**：集中管理文件操作、删除及列表显示。  
- **聊天区域**：使用 `st.chat_message` 可视化用户与 AI 的对话历史。  
- **可重现性**：利用 Streamlit 的 `session_state` 同时实现状态保持与重新初始化。

此外，聊天背后运行着 RAG 链（`RetrievalQA`），对每个问题执行检索→生成的两步推理。

#### 侧边栏

- 文件上传（支持多文件）  
- 当前已加载文件列表  
- 各文件的删除按钮  
- “全量删除”按钮

#### 主界面

- 聊天历史显示  
- “请输入文档相关问题”输入框  
- AI 回答及“参考文档”展开面板

---

## 运行方法

1. 在 LM Studio 中启动 `http://localhost:1234` 服务（提前加载好 LLM）  
2. 在终端执行：

```bash
streamlit run app2.py
```

在浏览器（通常是 `http://localhost:8501`）中打开应用。  
![](https://gyazo.com/25fdfd8852aaa899fcca65d14596b7c4.png)

首次启动时会显示“请上传文件”的消息。  
上传 PDF 或文本后，将自动进行学习和持久化。

---

## 示例：使用多文档的 RAG

除了上一节的“桃太郎”外，还将「かぐや姫」的故事加载到 RAG 中。  
かぐや姫 的故事如下。

```text
很久很久以前，有一位以采竹为生的翁（老翁）和他的妻子居住在一起。
某日，翁在山中发现一根发光的竹子，当他劈开竹子时，里面走出一个小女孩。
翁将她带回家，与妻子一起将她取名为「かぐや姫」，珍惜地抚养她长大。
かぐや姫美丽地成长，她的美貌传遍了京都。
许多贵族前来求婚，但かぐや姫没有接受任何人的求婚，而是提出了要完成困难宝物的条件。
没有人能够成功。
后来，帝也爱上了かぐや姫，但她的心属于月亮之国。
在十五夜之夜，月亮的使者前来接她，かぐや姫流着眼泪回到了月亮。
翁和妻子深感悲伤，久久仰望夜空思念かぐや姫。
```

如果上传“桃太郎”和“かぐや姫”这两份文本，也能准确回答结合两者内容的问题。  

将它们各自加载后。  
![](https://gyazo.com/1c2152476622b44233757c7f19bc9376.png)

> 示例提问：“桃太郎和かぐや姫有哪些共同点？”

RAG 会从各自的故事中提取相似的上下文，并生成比较两者的回答。

作出回答后，输出了以下文本。  
![](https://gyazo.com/440c40bf9bd04d8309a808038ef671ab.png)

回答中“二者最终都回到原来的地方这一结局”很有趣，将两者都回到最初所在地的结局联系起来。  
（桃太郎回到了爷爷、奶奶身边；かぐや姫回到了月亮。）

---

## 总结

在本次的扩展版中，本地 RAG 环境得到了更实用的进化。  

| 改进点 | 效果 |
|--------|------|
| **FAISS 持久化** | 重启后无需重建数据库，实现高速启动 |
| **MultiQueryRetriever** | 提升检索精度 |
| **文件管理 UI** | 通过上传/删除实现可视化操作 |
| **多文件格式支持** | 可混合学习 PDF/DOCX/PPTX/TXT 文件 |

在本地环境中完成所有流程，同时实现了实用的知识助手。  
下次计划扩展**文档摘要与分类功能**，以及支持**OpenAI 兼容 API 以外的模型（如 Ollama、Llama.cpp）**。

<style>
img { border: 1px solid gray; }
</style>
