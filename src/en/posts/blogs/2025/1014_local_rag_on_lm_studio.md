---
title: >-
  Cloud-Free AI Experience: Building a Local RAG Environment with LM Studio +
  LangChain + Streamlit
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

## Introduction

In [the previous article](/blogs/2025/09/21/gemma_on_lm_studio/), we built a cloud-free AI environment using LM Studio + Gemma.  

In this article, we’ll use **LM Studio** to run an LLM (e.g., Gemma 3 4B) locally, and then combine **LangChain** and **Streamlit** to create a **RAG (Retrieval-Augmented Generation)** environment that operates entirely on your PC without relying on the cloud.

As our example, we’ll use the well-known “Momotaro” folk tale to build a **local AI chatbot** that loads a custom knowledge base.

Our goals for this tutorial are:  
- Run a local LLM as an API server with **LM Studio**  
- Build a RAG (retrieval + generation) pipeline with **LangChain**  
- Create a chat UI with **Streamlit**  

Everything runs completely on your own PC and works without an internet connection. It’s truly the first step toward creating “your very own AI.”

---

## What is LangChain?

LangChain is a framework for integrating large language models (LLMs) with external data. It especially provides mechanisms to make building **RAG (Retrieval-Augmented Generation)** systems easier.  

In our RAG setup, we combine the following four processes to generate more accurate, context-aware answers:

| Step | Process | LangChain Feature |
|------|---------|-------------------|
| ① Text Splitting       | Split documents into small chunks                   | `TextSplitter`                              |
| ② Embedding Generation | Vectorize the text                                  | `Embeddings`                                |
| ③ Retrieval            | Search for chunks similar to the query               | `VectorStore` (FAISS, Chroma, etc.)         |
| ④ Answer Generation    | Input the retrieved results plus the query into the LLM | `RetrievalQA` or `Chain`                   |

---

## What is Streamlit?

**Streamlit** is a framework that lets you build web apps easily using only Python code. It’s widely used for constructing UIs for data analysis, machine learning, and LLM applications (e.g., RAG chatbots).

| Feature               | Description                                                        |
|-----------------------|--------------------------------------------------------------------|
| **Simple Syntax**     | Write UIs purely in Python, without HTML or JavaScript            |
| **Instant Execution** | The web interface updates automatically when you save your code   |
| **Strong Visualization** | Integrates with `matplotlib`, `plotly`, `pandas`, etc.         |
| **Interactive UI**    | Easily implement text inputs, sliders, buttons, chat UIs, and more |
| **Local or Cloud**    | Run locally with `streamlit run app.py` or publish to the cloud    |

---

## Starting the LM Studio Server

The first step is to start an “API server” in LM Studio to run the model. This allows your Python programs to communicate with the LLM.

Steps:  
- Open LM Studio.  
- From the left-hand menu, select the “Developer” tab.  
![](https://gyazo.com/471db6fd8682e9e503b98079a007cee4.png)  

- In the dropdown at the top of the screen, select the gemma-3 4B model to load.  
  (This is the same model we used previously.)  
![](https://gyazo.com/c000e01467899cb556bcf3ab4e0c6be1.png)  

- Click the “Start Server” button.  
![](https://gyazo.com/7b0b193e81a81d11daf8cb79073ac155.png)  

- The server will start.  
![](https://gyazo.com/e778e5645f5570aef21743184d78daa6.png)  

- You’ll see a log message like the following, indicating the server is running at `http://localhost:1234`.  
![](https://gyazo.com/07d41506e4d609c2e0e94183c9881415.png)  

- You can confirm the available APIs (these are OpenAI-compatible).  
![](https://gyazo.com/7dd1a38941fcf7d41f2801b56d255588.png)  

---

## Building the RAG Pipeline

Next, we’ll build a system called **RAG (Retrieval-Augmented Generation)**. This technique lets an LLM generate answers by referring to external knowledge (in this case, a text file). It’s similar to “solving test questions using your textbook.”

- Textbook = pre-prepared data (we’ll use a text file)  
- Test questions = user’s queries  
- Test taker = the LLM  

To set this up, first prepare the Python environment. You’ll need to install some specialized libraries. Open a terminal (or Command Prompt/PowerShell on Windows) and run:

```bash
pip install langchain langchain-community langchain-openai langchain-huggingface streamlit faiss-cpu
```

---

## The RAG “Textbook”

First, we’ll create the “textbook” (knowledge base) that the LLM will read. This will be a simple text file. In the same folder where you plan to create your Python scripts, create a new text file named `knowledge.txt`. Copy and paste the following short story about Momotaro into it and save. This file will serve as your **local knowledge base**.

```text
Once upon a time, in a certain place, there lived an old man and an old woman.
The old man went to the mountain to cut grass, and the old woman went to the river to do laundry.
While the old woman was washing clothes in the river, a large peach came floating down the stream.
The old woman picked up the peach and brought it home.
When she split the peach open, a healthy baby boy emerged from inside.
Since he was born from a peach, she named him "Momotaro."
Momotaro grew up quickly and eventually said he would go to Onigashima to defeat the oni.
He received millet dumplings from the old woman and set off on his journey.
Along the way, he made a dog, a monkey, and a pheasant his companions.
Then, together they combined their strengths to defeat the oni and returned home with treasure.
```

---

## Creating the Streamlit App

Now we’ll create the main program. In the same folder where you saved `knowledge.txt`, create a new file named `app.py` and paste the following code into it:

```python
import streamlit as st
from langchain_openai import ChatOpenAI
from langchain.text_splitter import CharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA

# =============================
# --- LLM and RAG Setup ---
# =============================

# Function that loads the document and creates the RAG pipeline
def create_rag_chain(document_path):
    # Load the document
    with open(document_path, 'r', encoding='utf-8') as f:
        document_text = f.read()

    # 1. Split the document into small "chunks"
    # This makes it easier for the model to find relevant information.
    text_splitter = CharacterTextSplitter(
        separator="\n",
        chunk_size=200,      # Chunk size (in characters)
        chunk_overlap=50,    # Overlap between chunks
        length_function=len
    )
    docs = text_splitter.split_text(document_text)

    # 2. Create "embedding vectors" for each chunk
    # Embeddings convert text into numerical vectors that computers can understand semantically.
    # all-MiniLM-L6-v2 is a small, fast model specialized in converting text into vectors.
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    # 3. Create a vector store (FAISS) to save and search embeddings
    # This is like creating a searchable index for our "textbook."
    db = FAISS.from_texts(docs, embeddings)

    # 4. Configure connection to the local LLM server (LM Studio)
    llm = ChatOpenAI(
        # ↓↓↓ Paste LM Studio's "API Identifier" here ↓↓↓
        model_name="local-model",            # Specify to use the local model
        base_url="http://localhost:1234/v1", # Address of the LM Studio server
        api_key="not-needed",                # No API key needed for a local server
        temperature=0.1                      # Low temperature to stick to reference text for reliable answers
    )

    # 5. Create the RetrievalQA chain
    # This chain combines a retriever (FAISS index) with the LLM.
    # When given a query, it first finds the most relevant text chunks,
    # then passes them along with the query to the LLM to generate an answer.
    retriever = db.as_retriever()
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",  # "stuff" means stuffing all relevant chunks into the prompt
        retriever=retriever,
        return_source_documents=True
    )
    return qa_chain

# Create the RAG chain using knowledge.txt
rag_chain = create_rag_chain("knowledge.txt")

# =============================
# --- Streamlit UI ---
# =============================

st.title("🍑 Momotaro Chatbot")
st.write("Ask me anything about the story of Momotaro!")

# Initialize chat history
if "messages" not in st.session_state:
    st.session_state.messages = []

# Redisplay messages from history
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# Respond to the user's input
if prompt := st.chat_input("Enter your question"):
    # Display the user's message
    with st.chat_message("user"):
        st.markdown(prompt)
    # Add the user's message to history
    st.session_state.messages.append({"role": "user", "content": prompt})

    # Get the LLM's response
    response = rag_chain.invoke({"query": prompt})
    answer = response["result"]

    # Display the assistant's response
    with st.chat_message("assistant"):
        st.markdown(answer)
    # Add the assistant's response to history
    st.session_state.messages.append({"role": "assistant", "content": answer})
```

Below is a concise summary of what the code does.

### First Part: Brain Preparation (`create_rag_chain` function)

This section prepares the LLM to become a **“smart librarian.”**

1.  **Read the book:** First, load the entire contents of the textbook file (“Momotaro Story” `knowledge.txt`).  
2.  **Stick Post-it Notes:** Split the story into short chunks and imagine placing Post-it notes on each section. (`CharacterTextSplitter`)  
3.  **Create an Index:** Build a special index (vector store) so the computer can quickly find which chunk contains what information. (`Embeddings`, `FAISS`)  
4.  **Connect with the LLM:** Finally, set the **rule** (`RetrievalQA`) that “upon receiving a query, first search the index for relevant chunks and then reference them to answer,” and link this rule with the LLM in LM Studio.

With this setup, the LLM becomes not just a repository of facts but a specialist that answers **based on reference materials (the textbook data).**

:::info
Where does `all-MiniLM-L6-v2` come from?  
This model is automatically downloaded from the **Hugging Face Hub**, a massive repository of AI models on the internet, the first time you run the program.  
Once downloaded, it’s stored in a special folder on your PC called a cache.  
On subsequent runs, the program loads it directly from your local cache instead of downloading it again.
:::

### Second Part: App Interface (Streamlit UI)

This section creates the chat interface that the user interacts with.

1.  **Display the Screen:** Show the title “🍑 Momotaro Chatbot.”  
2.  **Prepare the Input Field:** Provide a chat box for the user to enter a query.  
3.  **Response Processing:**  
    * When the user enters a question, pass it to the **“smart librarian”** we set up earlier.  
    * Receive the answer that the librarian (RAG) creates by consulting the materials.  
    * Display that answer in the chat interface.

In short, it’s a two-step structure: **prepare an AI that’s read the materials and become smart in the first part, then build a chat interface in the second part to talk with that AI.**

---

## Running the Application

Let’s launch the application (chatbot).

1.  Ensure the **LM Studio** server is running.  
2.  Open the folder containing `app.py` and `knowledge.txt` in a terminal (or Command Prompt).  
3.  In the terminal, run:
```bash
streamlit run app.py
```

Running that command will automatically open a new tab in your web browser. (By default, the app runs at `http://localhost:8501/`.)

You’ll see a progress indicator in the top right of the browser showing that RAG is being initialized.  
![](https://gyazo.com/235845d37b197ab03e38411d4a1c83aa.png)

After a moment, you should see the “🍑 Momotaro Chatbot” interface.  
![](https://gyazo.com/edd8758e3c9c3c72aac96de5ace4c426.png)

---

## Asking Questions

Let’s ask the chatbot some questions. Here are the queries:
- “Who is Momotaro?”
- “What did Momotaro do?”

![](https://gyazo.com/d7aa9662b9d64b0676038f0936942a4f.png)

You can see it’s answering based on the knowledge from the textbook data.

---

## Modifying Part of the Textbook Data

Let’s modify a part of the textbook data. Change the following line:

```text
Along the way, he made a dog, a monkey, and a pheasant his companions.
```

to:

```text
Along the way, he made a cat, a turtle, and a crane his companions.
```

and run it. The result is shown below:  
![](https://gyazo.com/67569fcb30e20b2a92e8f74db31f59b5.png)

You can see that the **companions have been updated and interpreted correctly.**

---

## Asking About Something Not in the Textbook Data

Let’s ask something that’s not in the textbook data to confirm the AI isn’t making up extra story details.  
![](https://gyazo.com/ec3e055969254e12660e7ca1b04abbf1.png)

You can see it cannot answer anything beyond the prepared textbook data.

---

## Displaying the Source Texts Used as References

Let’s add a feature to display the “source texts” used as references alongside the answer. In the following part of the source code:

```python
    with st.chat_message("assistant"):
        st.markdown(answer)
```

we’ll add functionality. The updated source code is shown below:

```python
   with st.chat_message("assistant"):
        st.markdown(answer)
        
        # --- Addition starts here ---
        with st.expander("Source Texts Used"):
            for doc in response["source_documents"]:
                st.markdown(f"--- \n {doc.page_content}")
        # --- Addition ends here ---
```

When you run the app, you’ll see that the reference texts are displayed alongside the answers:  
![](https://gyazo.com/94f879740f46ffbe9d6e19079eebbb84.png)

---

## Conclusion

In the procedure we covered, by combining **LM Studio × LangChain × Streamlit**, we built a **local RAG environment that doesn’t depend on the cloud**.

Let’s recap the key points:
- Run a local LLM as an OpenAI-compatible API with **LM Studio**  
- Automate document splitting, vectorization, retrieval, and answer generation with **LangChain**  
- Build an interactive UI with **Streamlit**, making it easy to use via a browser  
- Change the **textbook data**, and the AI’s responses change dynamically  

With this mechanism, the AI reads your personal knowledge files and behaves like **“your own personal knowledge assistant.”** You can extend it to handle more complex knowledge bases, multiple files, improve search accuracy, refine the UI, and more.

You’ve now tried a new way to leverage your own data in your own environment.

<style>
img {
    border: 1px gray solid;
}
</style>
