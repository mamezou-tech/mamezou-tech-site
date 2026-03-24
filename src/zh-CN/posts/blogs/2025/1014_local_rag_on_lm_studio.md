---
title: 无需依赖云端的 AI 体验：使用 LM Studio＋LangChain＋Streamlit 构建本地 RAG 环境
author: shuichi-takatsu
date: 2025-10-14T00:00:00.000Z
tags:
  - lmstudio
  - LangChain
  - Streamlit
  - gemma
  - LLM
  - 生成AI
  - RAG
image: true
translate: true

---

## 引言

[上次](/blogs/2025/09/21/gemma_on_lm_studio/)我们使用 LM Studio＋Gemma 构建了无需依赖云端的 AI 环境。  

在本篇文章中，我们将使用 **LM Studio** 在本地运行 LLM（例如：Gemma 3 4B），并结合 **LangChain** 与 **Streamlit**，构建无需依赖云端即可运行的 **RAG（Retrieval-Augmented Generation，检索增强生成）** 环境。  

以众所周知的“桃太郎”故事为例，制作一个能够读取自定义知识库的 **本地 AI 聊天机器人**。  

本次的目标如下。  
- 使用 **LM Studio** 将本地 LLM 作为 API 服务器运行  
- 使用 **LangChain** 构建 RAG（检索＋生成）流水线  
- 使用 **Streamlit** 创建聊天 UI  

所有流程均在本地电脑完成，无需网络连接。  
这正是构建“专属 AI”的第一步。  

---

## 什么是 LangChain

LangChain 是一个**将大规模语言模型（LLM）与外部数据集成并加以利用的框架**。  
它特别提供了**简化构建 RAG（检索增强生成）** 的机制。  

在本次创建的 RAG 环境中，将结合以下四个处理步骤，以生成更加准确且基于上下文的回答。  
| 步骤 | 处理内容 | LangChain 功能 |
|------|----------|---------------|
| ① 文本切分 | 将文档拆分为小块 | `TextSplitter` |
| ② 嵌入生成 | 将文本向量化 | `Embeddings` |
| ③ 检索 | 搜索与问题相似的文本块 | `VectorStore`（FAISS、Chroma 等） |
| ④ 回答生成 | 将检索结果＋问题输入 LLM | `RetrievalQA` 或 `Chain` |

---

## 什么是 Streamlit

**Streamlit** 是一个**仅需 Python 代码即可轻松创建 Web 应用的框架**。  
广泛用于数据分析、机器学习、LLM 应用（例如：RAG 聊天机器人）等的 UI 构建。

| 特点 | 说明 |
|------|------|
| **简洁的语法** | 无需使用 HTML 或 JavaScript，仅需 Python 即可编写 UI |
| **即时执行** | 保存代码后会自动更新网页界面 |
| **擅长数据可视化** | 可与 `matplotlib`、`plotly`、`pandas` 等配合使用 |
| **交互式 UI** | 可轻松实现文本输入、滑块、按钮、聊天 UI 等 |
| **支持本地或云端** | 通过 `streamlit run app.py` 本地运行，也可发布到云端共享 |

---

## 启动 LM Studio 服务器

第一步，在 LM Studio 中启动用于运行模型的“API 服务器”。  
这样，Python 程序就能与 LLM 对话。

操作步骤如下：  
- 打开 LM Studio。  
- 在左侧菜单中选择“开发者”标签页。  
![](https://gyazo.com/471db6fd8682e9e503b98079a007cee4.png)

- 在界面顶部的下拉菜单中选择 gemma-3 4B 模型并加载。  
  （与上次使用的模型相同）  
![](https://gyazo.com/c000e01467899cb556bcf3ab4e0c6be1.png)

- 点击“Start Server”按钮。  
![](https://gyazo.com/7b0b193e81a81d11daf8cb79073ac155.png)

- 服务器启动后会显示。  
![](https://gyazo.com/e778e5645f5570aef21743184d78daa6.png)

- 日志中会输出以下信息，可看到服务器正在 `http://localhost:1234` 上运行。  
![](https://gyazo.com/07d41506e4d609c2e0e94183c9881415.png)

- 可以看到以下 API。（兼容 OpenAI API）  
![](https://gyazo.com/7dd1a38941fcf7d41f2801b56d255588.png)

---

## 构建 RAG 管道

接下来，我们将搭建**RAG（检索增强生成）**机制。  
它是一种**LLM 在回答时参考外部知识（本例为文本文件）的技术**。  
可类比为“参考教科书做考试题”。

- 教科书 = 事先准备的数据（本次使用文本文件）  
- 考题 = 用户提出的问题  
- 答题人 = LLM

为了搭建此机制，首先需要配置 Python 环境。安装一些专业库（类似实用工具集）。  
在终端（Windows 可使用命令提示符或 PowerShell）中执行以下命令：

```python
pip install langchain langchain-community langchain-openai langchain-huggingface streamlit faiss-cpu
```

---

## RAG 教科书

首先，创建 LLM 将要读取的“教科书”（知识库）（采用简单的文本文件）。  
在将创建 Python 脚本的同一文件夹下，新建名为 `knowledge.txt` 的文本文件。  
将关于桃太郎的以下短篇小说复制并粘贴到该文件中，然后保存。  
此文件即为**本地知识库**。

```text
很久很久以前，在某个地方住着一对老夫妻。
老爷爷去山上砍柴，老奶奶到河边洗衣。
当老奶奶在河边洗衣时，一个大桃子“哗啦哗啦”地顺流而下。
老奶奶捡起那个桃子，带回家中。
回到家后，她剖开桃子，发现里面蹦出一个健康的男婴。
因他从桃子中诞生，于是给他取名为“桃太郎”。
桃太郎茁壮成长，不久就说要去鬼之岛降妖除魔。
老奶奶给了他黍米团子，桃太郎便踏上旅程。
旅途中，他收编了狗、猴子和雉鸡作为家臣。
最后，大家齐心协力战胜了鬼怪，带着宝物回到了家中。
```

---

## 创建 Streamlit 应用

开始编写主程序。在与 `knowledge.txt` 相同的文件夹中新建 `app.py` 文件。  
然后将以下代码全部复制粘贴到 `app.py` 文件中。

```python
import streamlit as st
from langchain_openai import ChatOpenAI
from langchain.text_splitter import CharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA

# =============================
# --- LLM 与 RAG 的设置 ---
# =============================

# 从文档创建 RAG 管道的函数
def create_rag_chain(document_path):
    # 读取文档
    with open(document_path, 'r', encoding='utf-8') as f:
        document_text = f.read()

    # 1. 将文档拆分为小“块”（chunk）
    # 这样可以让模型更容易找到相关信息。
    text_splitter = CharacterTextSplitter(
        separator="\n",
        chunk_size=200,      # 每个块的大小（字符数）
        chunk_overlap=50,    # 块之间的重叠量
        length_function=len
    )
    docs = text_splitter.split_text(document_text)

    # 2. 为每个块创建“嵌入向量”
    # 嵌入（Embeddings）是一种将文本转换为计算机可理解的数值向量的技术。
    # all-MiniLM-L6-v2 是一个专门用于将文本转换为计算机可理解数值（向量）的轻量且高速的模型。
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    # 3. 创建向量存储（FAISS），以便保存和检索嵌入
    # 这就像为我们的“教科书”创建一个可搜索的索引。
    db = FAISS.from_texts(docs, embeddings)

    # 4. 设置与本地 LLM 服务器（LM Studio）的连接
    llm = ChatOpenAI(
       # ↓↓↓ 在此处粘贴 LM Studio 的“API Identifier” ↓↓↓
        model_name="local-model",            # 指定使用本地模型
        base_url="http://localhost:1234/v1", # LM Studio 服务器地址
        api_key="not-needed",                # 因为是本地服务器，所以无需 API 密钥
        temperature=0.1                      # 将 temperature 设置较低，以指示 AI “不要偏离参考文本，给出最可靠的回答”
    )

    # 5. 创建 RetrievalQA 链
    # 该链将搜索组件（FAISS 索引）与 LLM 结合。
    # 当有查询时，首先找到最相关的文本块，
    # 然后将其与查询一起传递给 LLM 以生成回答。
    retriever = db.as_retriever()
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff", # "stuff" 是将相关块全部“填充”到提示中的方式
        retriever=retriever,
        return_source_documents=True
    )
    return qa_chain

# 使用 knowledge.txt 创建 RAG 链
rag_chain = create_rag_chain("knowledge.txt")

# =============================
# --- Streamlit 界面 ---
# =============================

st.title("🍑 桃太郎 聊天机器人")
st.write("请就桃太郎的故事提问！")

# 初始化聊天历史
if "messages" not in st.session_state:
    st.session_state.messages = []

# 重新显示历史消息
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# 响应用户输入
if prompt := st.chat_input("请提问"):
    # 显示用户消息
    with st.chat_message("user"):
        st.markdown(prompt)
    # 将用户消息添加到历史
    st.session_state.messages.append({"role": "user", "content": prompt})

    # 获取 LLM 响应
    response = rag_chain.invoke({"query": prompt})
    answer = response["result"]

    # 显示助手响应
    with st.chat_message("assistant"):
        st.markdown(answer)
    # 将助手响应添加到历史
    st.session_state.messages.append({"role": "assistant", "content": answer})
```

源代码中的注释对程序进行了说明，概括如下。

### 前半：头脑准备阶段（`create_rag_chain` 函数）

这里是让 LLM 成为**“聪明的图书管理员”**的准备部分。

1.  **阅读资料：** 首先读取教科书文件“桃太郎的故事”（`knowledge.txt`）的全部内容。  
2.  **贴便签：** 将故事分割为短小的文本块（chunk），就像为每段内容贴便签一样。(`CharacterTextSplitter`)  
3.  **创建索引：** 构建特殊的索引（向量存储），让计算机可以快速找到对应标签中的内容。(`Embeddings`, `FAISS`)  
4.  **与 LLM 联动：** 最后，制定“当收到问题时，先使用索引查找相关标签，再参考这些内容进行回答”的**规则**（`RetrievalQA`），并与 LM Studio 的 LLM 集成。  

通过这些准备，LLM 不再是单纯的知识库，而是**基于资料**进行回答的专家。  

:::info
all-MiniLM-L6-v2 是从哪里来的？  
上述模型在第一次运行程序时，会从互联网上的 **「Hugging Face Hub」** —— 一个大型 AI 模型存储库 —— 中自动下载。  
下载完成后，会保存在电脑内一个特殊文件夹（称为缓存）中。  
在第二次及以后运行程序时，就不会再次下载，而是直接从本地缓存载入该文件。  
:::

### 后半：应用界面部分 (Streamlit UI)

此部分负责创建用户实际交互的聊天界面。

1.  **界面显示：** 展示标题“🍑 桃太郎聊天机器人”。  
2.  **输入框准备：** 提供供用户输入问题的聊天框。  
3.  **响应处理：**  
    - 当用户输入问题时，将其传递给**前半创建的“聪明的图书管理员”**。  
    - 接收由图书管理员（RAG）检查资料后生成的答案。  
    - 将该回答显示在聊天界面中。  

---

## 运行应用程序

启动应用程序（聊天机器人）。

1. 确保 **LM Studio** 服务器已启动。  
2. 在终端（命令提示符）中打开保存 `app.py` 和 `knowledge.txt` 的文件夹。  
3. 在终端输入以下命令并运行：
```bash
streamlit run app.py
```

执行以上命令后，会自动在 Web 浏览器中打开新标签页。  
（默认在 `http://localhost:8501/` 启动应用程序）

浏览器右上方会显示 RAG 准备进度，持续几秒钟。  
![](https://gyazo.com/235845d37b197ab03e38411d4a1c83aa.png)

稍等片刻后，应会显示“🍑 桃太郎聊天机器人”界面。  
![](https://gyazo.com/edd8758e3c9c3c72aac96de5ace4c426.png)

---

## 提问

尝试向聊天机器人提问。  
提问示例：  
- “桃太郎是什么？”
- “桃太郎做了什么？”

![](https://gyazo.com/d7aa9662b9d64b0676038f0936942a4f.png)

可以看出，回答依据的是教科书数据中所载内容。

---

## 修改教科书数据的一部分

尝试部分修改教科书数据内容。

将原文：
```text
旅途中，他收编了狗、猴子和雉鸡作为家臣。
```
修改为：
```text
旅途中，他收编了猫、乌龟和鹤作为家臣。
```
并运行看看。  
结果如下：  
![](https://gyazo.com/67569fcb30e20b2a92e8f74db31f59b5.png)

可见，家臣已正确替换并被正确识别。

---

## 询问教科书数据中不存在的内容

尝试询问教科书数据中不存在的内容，以确认 AI 并未擅自扩展故事。  
![](https://gyazo.com/ec3e055969254e12660e7ca1b04abbf1.png)

可见，对于教科书数据以外的内容，AI 无法回答。

---

## 显示参考的原始文本

添加功能，使回答同时显示“参考的原始文本”。

在源码的以下部分：
```python
    with st.chat_message("assistant"):
        st.markdown(answer)
```
添加以下功能。  
修改后的源码如下：
```python
   with st.chat_message("assistant"):
        st.markdown(answer)
        
        # --- 从这里开始添加 ---
        with st.expander("参考的文章"):
            for doc in response["source_documents"]:
                st.markdown(f"--- \n {doc.page_content}")
        # --- 添加结束 ---
```

运行应用程序后，就能像下面这样同时显示参考的文章。  
![](https://gyazo.com/94f879740f46ffbe9d6e19079eebbb84.png)

---

## 总结

本篇介绍的步骤通过结合 **LM Studio × LangChain × Streamlit**，构建了**不依赖云端的本地 RAG 环境**。

回顾要点如下：  
- 使用 **LM Studio** 将本地 LLM 作为兼容 OpenAI 的 API 运行  
- 使用 **LangChain** 自动化文档切分、向量化、检索与回答生成  
- 使用 **Streamlit** 构建交互式 UI，可通过浏览器方便使用  
- 更改 **教科书数据** 后，AI 的回答内容也会动态变化  

通过此机制，AI 可加载“自己拥有的知识文件”，并表现得像**“专属知识助手”**。  
还可以扩展到更复杂的知识、多文件支持，甚至提升检索精度和优化 UI 等。  

我们尝试了在自己的环境中利用自己的数据，这是一种全新的 AI 应用方式。  

<style>
img {
    border: 1px gray solid;
}
</style>
