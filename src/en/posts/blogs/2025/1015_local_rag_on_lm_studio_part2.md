---
title: >-
  Cloud-Free AI Experience: Building a Local RAG with Multi-Document Persistence
  Using LM Studio, LangChain, and Streamlit
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

## Introduction

In the [previous article](/blogs/2025/10/14/local_rag_on_lm_studio/), we built a simple RAG (Retrieval + Generation) setup targeting a **single text file (Momotaro Story)**.  
This time, as an extension, we will create a **persistent local RAG app that can load, retain, and delete multiple documents**.

---

## Overall Structure

### Directory Structure

```bash
project/
├─ app2.py              # Main application
├─ vectorstore/         # Directory for persisting the vector store
│   ├─ faiss_index/     # FAISS index files
│   ├─ metadata.json    # List of loaded files
│   └─ temp_docs/       # Temporary storage for uploaded documents
```

In the new app (`app2.py`), the following enhancements are introduced:

| Feature                   | Description                                                                                       |
|---------------------------|---------------------------------------------------------------------------------------------------|
| **Multi-Document Support**| Ability to ingest multiple files simultaneously, including PDF, Word, PowerPoint, and text       |
| **Persistent Storage**    | Store the vector DB (FAISS) locally so that you don't need to rebuild after restart               |
| **Individual File Deletion** | Delete a specific file and rebuild the DB                                                       |
| **Enhanced UI**           | Use the Streamlit sidebar to list files, delete individual files, or delete all                   |
| **Improved Accuracy**     | Improve retrieval accuracy by converting queries into multiple variations using MultiQueryRetriever |

When you launch the app, the necessary folders under `vectorstore/` are created automatically.  
When you add files, the vector DB and metadata are persisted to disk.

### Required Libraries

Install the required libraries with the following command:

```bash
pip install langchain langchain-openai langchain-community langchain-huggingface sentence-transformers streamlit faiss-cpu pypdf python-docx python-pptx pydantic cryptography unstructured docx2txt
```

### Full Program

The main source code is as follows. Comments within the code describe each processing step. Since there are many lines, we'll explain the key parts of the program afterward.

```python
import streamlit as st
import os
import tempfile
from pathlib import Path
import shutil
import json
import uuid

# --- Import LangChain-related Libraries ---
# Used for RAG (Retrieval-Augmented Generation) setup with LLM (large language model) and embeddings
from langchain_openai import ChatOpenAI  # Connection to OpenAI-compatible LLM (e.g., LM Studio/Ollama)
from langchain_huggingface import HuggingFaceEmbeddings  # HuggingFace embedding model (for vectorization)
from langchain.text_splitter import RecursiveCharacterTextSplitter  # Split documents into chunks
from langchain_community.vectorstores import FAISS  # Fast vector search engine (with local persistence)
from langchain.chains import RetrievalQA  # RAG chain combining retrieval and answer generation
from langchain_community.document_loaders import (
    PyPDFLoader, Docx2txtLoader, TextLoader, UnstructuredPowerPointLoader
)  # Loaders for various file formats
from langchain.prompts import PromptTemplate  # Prompt template for LLM
from langchain.retrievers.multi_query import MultiQueryRetriever  # Improve retrieval accuracy with multiple query variations

# ============================================================
# Persistence-related path configuration
# ============================================================
DB_DIR = "vectorstore"  # Directory for storing the vector store
DB_FAISS_PATH = Path(DB_DIR) / "faiss_index"  # FAISS vector index files
DB_METADATA_PATH = Path(DB_DIR) / "metadata.json"  # Metadata storage file
TEMP_DOCS_DIR = Path(DB_DIR) / "temp_docs"  # Temporary storage for uploaded documents

# ============================================================
# Initialize the file_uploader key
# ============================================================
# Set a unique key to reinitialize file_uploader
if 'file_uploader_key' not in st.session_state:
    st.session_state['file_uploader_key'] = str(uuid.uuid4())

# ============================================================
# Document loading function
# ============================================================
def load_document(file_path):
    """Load a document using the appropriate LangChain loader based on file extension"""
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        loader = PyPDFLoader(str(file_path))
    elif ext == ".docx":
        loader = Docx2txtLoader(str(file_path))
    elif ext == ".pptx":
        loader = UnstructuredPowerPointLoader(str(file_path))
    else:
        loader = TextLoader(str(file_path), encoding="utf-8")
    return loader.load()  # Returns a list of LangChain Documents

# ============================================================
# Embedding model initialization (with caching)
# ============================================================
@st.cache_resource(show_spinner=False)
def get_embeddings():
    """Load and cache the Sentence-BERT embedding model from HuggingFace"""
    return HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# ============================================================
# Vector DB build and save function
# ============================================================
@st.cache_resource(show_spinner=False)
def build_and_save_db(documents, file_metadata_list):
    """Build a FAISS vector DB from a list of documents and save it along with metadata"""
    if not documents:
        # If no documents, remove existing DB
        if Path(DB_DIR).is_dir():
            shutil.rmtree(DB_DIR)
        return None

    # Split documents into smaller chunks (500 characters with 100 characters overlap)
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=100,
        length_function=len
    )
    docs = text_splitter.split_documents(documents)
    # Initialize embeddings model (using a Sentence-BERT-based model)
    embeddings = get_embeddings()

    # Build a new FAISS vector store
    db = FAISS.from_documents(docs, embeddings)

    # Create persistence directory and save
    Path(DB_FAISS_PATH).parent.mkdir(parents=True, exist_ok=True)
    db.save_local(str(DB_FAISS_PATH))

    # Save metadata as JSON
    with open(DB_METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(file_metadata_list, f, ensure_ascii=False, indent=4)

    return db

# ============================================================
# RAG chain creation function
# ============================================================
def create_rag_chain_from_db(db):
    """Create a RAG (Retrieval + LLM) chain from an existing DB"""
    llm = ChatOpenAI(
        model_name="local-model",                       # Specify the model loaded into LM Studio
        openai_api_base="http://localhost:1234/v1",     # LM Studio server URL
        openai_api_key="not-needed",                    # No API key needed
        temperature=0.1,                                # Favor higher probability tokens
        max_tokens=512                                  # Limit to 512 tokens
    )

    # Use MultiQueryRetriever to improve search accuracy by generating multiple query variations
    retriever = MultiQueryRetriever.from_llm(
        retriever=db.as_retriever(search_kwargs={"k": 2}),
        llm=llm
    )

    # Define the RAG prompt template (answer policy)
    prompt_template = """
        Based on the following reference documents, answer the question in English.
        If the answer is not found in the reference documents, respond with "I don't know."
        Reference Documents: {context}
        Question: {question}
    """
    PROMPT = PromptTemplate(
        template=prompt_template,
        input_variables=["context", "question"]
    )

    # Create a RetrievalQA chain (retrieval -> answer generation)
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",  # Fill all retrieved results into the prompt
        retriever=retriever,
        return_source_documents=True,  # Return source documents used for the answer
        chain_type_kwargs={"prompt": PROMPT}  # Apply custom prompt
    )
    return qa_chain

# ============================================================
# Single file deletion and DB rebuild
# ============================================================
def delete_single_file(file_id_to_delete):
    """Delete the specified file ID and rebuild the DB using remaining documents"""
    if not DB_METADATA_PATH.exists():
        st.error("Metadata not found. It is recommended to delete all data.")
        return

    with open(DB_METADATA_PATH, "r", encoding="utf-8") as f:
        current_metadata = json.load(f)

    # Identify the file to remove
    file_to_remove = next((item for item in current_metadata if item["id"] == file_id_to_delete), None)
    if not file_to_remove:
        st.error("The specified file ID to delete was not found.")
        return

    # Delete the temporary file
    temp_path = Path(file_to_remove["temp_path"])
    if temp_path.exists():
        os.remove(temp_path)

    # Rebuild the DB with remaining files
    new_metadata = [item for item in current_metadata if item["id"] != file_id_to_delete]
    all_documents = []

    with st.spinner(f"Deleting file and rebuilding AI with remaining data..."):
        # Reload all remaining files
        for item in new_metadata:
            doc_path = Path(item["temp_path"])
            if doc_path.exists():
                documents = load_document(doc_path)
                all_documents.extend(documents)

        # Clear existing cache and rebuild DB
        if "rag_chain" in st.session_state:
            del st.session_state["rag_chain"]
        build_and_save_db.clear()

        # Build and save DB with remaining documents and metadata
        db = build_and_save_db(all_documents, new_metadata)

        # Update session state after rebuild
        if db:
            st.session_state.rag_chain = create_rag_chain_from_db(db)
            st.session_state.current_files = new_metadata
            st.toast(f"✅ File '{file_to_remove['name']}' deleted and DB updated.", icon="🗑️")
        else:
            # Cleanup after all files are deleted
            keys_to_delete = ["rag_chain", "messages", "current_files", "file_identifiers"]
            for key in keys_to_delete:
                if key in st.session_state:
                    del st.session_state[key]
            st.toast("✅ All files have been deleted.", icon="🗑️")
            st.session_state['file_uploader_key'] = str(uuid.uuid4())

    st.rerun()  # Rerun Streamlit to update the UI

# ============================================================
# Delete all data
# ============================================================
def delete_all_data():
    """Delete the entire DB directory and clear session variables"""
    if Path(DB_DIR).is_dir():
        try:
            shutil.rmtree(DB_DIR)
            st.toast("✅ All loaded data has been deleted.", icon="🗑️")
        except OSError as e:
            st.error(f"Error occurred while deleting data: {e}")
            return

    # Clear session variables
    keys_to_delete = ["rag_chain", "messages", "current_files", "file_identifiers"]
    for key in keys_to_delete:
        if key in st.session_state:
            del st.session_state[key]
    # Reset the file_uploader key
    st.session_state['file_uploader_key'] = str(uuid.uuid4())
    st.rerun()

# ============================================================
# Streamlit UI setup
# ============================================================
st.title("📄 Document Chatbot")
st.write("Upload multiple PDF, DOCX, PPTX, and text files and ask questions about their content.")

# --- Sidebar: File upload ---
uploaded_files = st.sidebar.file_uploader(
    "Upload files (add or overwrite existing DB)",
    type=["pdf", "docx", "pptx", "txt", "md"],
    accept_multiple_files=True,
    key=st.session_state['file_uploader_key']
)

# --- Check for existing DB ---
db_exists = DB_FAISS_PATH.exists()
metadata_exists = DB_METADATA_PATH.exists()
current_file_identifiers = [(f.name, f.size) for f in uploaded_files]

# ----------------------------------------------------------------------
# Initialization logic (merge existing data with new uploads)
# ----------------------------------------------------------------------

# 1. When new files are uploaded (add to or rebuild & save DB)
if uploaded_files:

    # Load existing metadata (file list)
    existing_metadata = []
    if metadata_exists:
        with open(DB_METADATA_PATH, "r", encoding="utf-8") as f:
            existing_metadata = json.load(f)

    # Create a set of existing file names for duplicate checking
    existing_names = {meta['name'] for meta in existing_metadata}

    # ----------------------------------------------------
    # Process newly uploaded files
    # ----------------------------------------------------
    newly_uploaded_files = []

    for uploaded_file in uploaded_files:
        if uploaded_file.name not in existing_names:
            newly_uploaded_files.append(uploaded_file)
        else:
            # Skip files with the same name as existing ones (no overwrite)
            pass

    if newly_uploaded_files:

        all_documents = []
        new_metadata_list = []

        TEMP_DOCS_DIR.mkdir(parents=True, exist_ok=True)

        with st.spinner("Loading new files..."):
            for uploaded_file in newly_uploaded_files:
                unique_id = str(uuid.uuid4())

                # Save as a new temporary file
                temp_path = TEMP_DOCS_DIR / f"{unique_id}_{uploaded_file.name}"
                temp_path.write_bytes(uploaded_file.getvalue())

                # Generate metadata for the new file
                new_metadata_list.append({
                    "id": unique_id,  # Unique ID
                    "name": uploaded_file.name,
                    "temp_path": str(temp_path)
                })

                documents = load_document(temp_path)
                all_documents.extend(documents)  # Add to document list

        # ----------------------------------------------------
        # Merge existing data with new data
        # ----------------------------------------------------

        # Reload existing files and add to the document list
        for meta in existing_metadata:
            doc_path = Path(meta["temp_path"])
            if doc_path.exists():
                documents = load_document(doc_path)
                all_documents.extend(documents)

        # Merge metadata lists
        combined_metadata = existing_metadata + new_metadata_list

        with st.spinner("Integrating and rebuilding AI data..."):

            # Clear old cache
            if "rag_chain" in st.session_state:
                del st.session_state["rag_chain"]
            build_and_save_db.clear()

            # Rebuild and save the DB with all documents and metadata
            db = build_and_save_db(all_documents, combined_metadata)
            st.session_state.rag_chain = create_rag_chain_from_db(db)
            st.session_state.current_files = combined_metadata  # Save new file list in session

        st.session_state.messages = []
        st.info("New data has been added to existing data and AI is ready.")

        # Reset uploader to clear the file list UI
        st.session_state['file_uploader_key'] = str(uuid.uuid4())
        st.rerun()

    else:
        # Files were uploaded but all had the same names as existing files
        st.info("All uploaded files have names matching existing files, so processing was skipped.")
        # Reset the uploader to prevent accidental deletions
        st.session_state['file_uploader_key'] = str(uuid.uuid4())
        st.rerun()

# 2. No uploads, existing DB exists, and rag_chain not in session (fast load)
elif not uploaded_files and db_exists and "rag_chain" not in st.session_state:
    with st.spinner("Loading existing AI data (DB)..."):
        # Load embedding model
        embeddings = get_embeddings()
        # Load existing FAISS DB from disk
        db = FAISS.load_local(str(DB_FAISS_PATH), embeddings, allow_dangerous_deserialization=True)
        st.session_state.rag_chain = create_rag_chain_from_db(db)

        # Load existing metadata (file list)
        if metadata_exists:
            with open(DB_METADATA_PATH, "r", encoding="utf-8") as f:
                loaded_metadata = json.load(f)
            st.session_state.current_files = loaded_metadata
            st.success("You can now chat with the existing documents.")
        else:
            st.session_state.current_files = []
            st.warning("Documents are loaded, but the original file name list was not found.")

        st.session_state.messages = []

# 3. Display initial message
if "rag_chain" not in st.session_state and not db_exists:
    st.info("Upload files or existing saved data will be loaded automatically.")

# ----------------------------------------------------------------------
# Display logic: show loaded file names and delete buttons
# ----------------------------------------------------------------------
if "current_files" in st.session_state:
    st.sidebar.markdown("---")
    st.sidebar.subheader("Currently Loaded Files")

    if st.session_state.current_files:
        for file_meta in st.session_state.current_files:
            col1, col2 = st.sidebar.columns([0.8, 0.2])

            # Show file name
            col1.markdown(f"- **{file_meta['name']}**")

            # Individual delete button UI (popover for confirmation)
            with col2.popover("🗑️", help="Delete this file"):
                st.write(f"Delete file **{file_meta['name']}** and rebuild the DB?")
                if st.button("Confirm Delete", key=f"delete_{file_meta['id']}", type="secondary"):
                    delete_single_file(file_meta['id'])
    else:
        st.sidebar.markdown("- No files.")

    st.sidebar.markdown("---")
    if Path(DB_DIR).is_dir():
        # Delete all data button
        if st.sidebar.button("🗑️ Delete All Loaded Data", type="secondary"):
            delete_all_data()

# ============================================================
# Chat interaction
# ============================================================
if "rag_chain" in st.session_state:
    # Show chat history
    if "messages" in st.session_state:
        for message in st.session_state.messages:
            with st.chat_message(message["role"]):
                st.markdown(message["content"])

    # User input
    if prompt := st.chat_input("Ask a question about the documents"):
        with st.chat_message("user"):
            st.markdown(prompt)
        st.session_state.messages.append({"role": "user", "content": prompt})

        rag_chain = st.session_state.rag_chain
        with st.spinner("Thinking..."):
            # Run RAG (retrieval + answer generation)
            response = rag_chain.invoke({"query": prompt})
            answer = response["result"]

        # Display answer and expand source documents
        with st.chat_message("assistant"):
            st.markdown(answer)
            with st.expander("Source Documents"):
                for doc in response["source_documents"]:
                    st.markdown(f"--- \n {doc.page_content}")

        st.session_state.messages.append({"role": "assistant", "content": answer})
```

### Overall Code Structure

A high-level overview of the structure of `app2.py` is as follows:

```text
1. Document loader functions
2. Vector DB build, save, and load functions
3. RAG chain creation function (with search accuracy improvement using MultiQueryRetriever)
4. File deletion logic
5. Streamlit UI setup
    - Sidebar: upload, delete, list display
    - Main screen: chat UI
```

This separation clearly divides the RAG processing and the UI, resulting in a highly extensible design.

---

## Explanation of Key Components

In this chapter, we dive deeper into the internal structure of `app2.py` and explain in detail how each function and module collaborate to build the RAG (Retrieval-Augmented Generation) environment.

---

### 1. Document Loader

This part functions as the system's "input gate." It receives uploaded files and converts them into `Document` objects that LangChain can handle, allowing subsequent vectorization and retrieval processes to be performed uniformly. Internally, it selects the appropriate loader class based on the file extension, supporting PDF, Word, PowerPoint, and text formats. The loader not only extracts text but also attaches metadata such as page information.

The `load_document()` function automatically detects and loads file formats such as PDF, DOCX, PPTX, and TXT by leveraging various LangChain loaders:

```python
from langchain_community.document_loaders import (
    PyPDFLoader, Docx2txtLoader, TextLoader, UnstructuredPowerPointLoader
)
```

### 2. Persistent Vector DB (FAISS)

This part forms the core of RAG. It consists of three processes—splitting, embedding, and saving—and transforms multiple uploaded documents into a searchable format.

- Splitting: Use `RecursiveCharacterTextSplitter` to chunk text while preserving natural context boundaries.  
- Embedding: Use the Sentence-BERT model (`all-MiniLM-L6-v2`) via `HuggingFaceEmbeddings` to convert semantics into numerical vectors.  
- Saving: Build the vector space using FAISS and save it locally as index files.

By combining these processes, you can achieve "persistent RAG," which allows you to reuse the same knowledge base immediately even after restarting the app. Document chunks are embedded (vectorized) and saved with FAISS in `vectorstore/faiss_index/`. Metadata (UUID, file name, storage path) is stored in `metadata.json`, enabling immediate reuse of the same knowledge base upon app restart.

Loading the embedding model and building the FAISS vector DB can be time-consuming. To avoid running these from scratch every time, we use Streamlit's `@st.cache_resource` decorator, which safely and efficiently caches resources like models and databases.

### 3. Improved Retrieval Accuracy with MultiQueryRetriever

In standard RAG, a user's question is converted into a single query for retrieval. In this program, however, we adopt LangChain's `MultiQueryRetriever`, which automatically generates multiple paraphrased queries using an LLM. For example, given the question "What is quality management?", the LLM internally generates multiple queries such as:

- What is the definition of quality management?  
- How does it differ from software quality assurance?  
- What are the methods for maintaining and improving quality?

This approach allows matching paraphrased expressions or different contexts in the documents, greatly improving retrieval accuracy.

```python
from langchain.retrievers.multi_query import MultiQueryRetriever

retriever = MultiQueryRetriever.from_llm(
    retriever=db.as_retriever(search_kwargs={"k": 2}),
    llm=llm
)
```

The **"k"** in `search_kwargs={"k": 2}` indicates the number of similar document chunks the retriever will fetch (top K results). In other words, it is set to retrieve only the top 2 most relevant document chunks. LangChain's retriever compares the user's question and documents in vector space and returns the top K document chunks ordered by **highest cosine similarity**.

| Parameter           | Meaning                                                      |
|---------------------|--------------------------------------------------------------|
| k                   | Retrieve the top K most similar document chunks             |
| search_kwargs       | Dictionary of parameters that control search behavior        |
| db.as_retriever()   | Configure the vector DB (e.g., FAISS) as a retriever         |

Choosing **k=2** optimizes the balance between **retrieval accuracy, processing speed, and token consumption**:

| Aspect               | Large k                                           | Small k (e.g., 2)                                  |
|----------------------|---------------------------------------------------|----------------------------------------------------|
| **Retrieval Accuracy** | Can reference many documents but may include irrelevant ones | Limits to highly relevant contexts                |
| **Processing Speed**   | Slower response (especially in local execution)   | Fast and lightweight                              |
| **Token Consumption**  | Increased due to multiple document inputs        | Efficient with fewer tokens                       |
| **Use Cases**          | Large-scale RAG or multi-domain documents        | Small to medium-sized RAG (ideal for this app)    |

Given the assumptions of local execution, FAISS persistence, and small to medium-sized documents, it is important to balance accuracy and speed without including excessive context:

- Adjust to fit within the context length of the LLM (e.g., LM Studio / Ollama)  
- Reduce processing time to return responses smoothly in the Streamlit UI  
- Remove noisy documents to generate more coherent answers  

Tuning guidelines:

| k Value | Characteristics                                    | Intended Use                               |
|---------|-----------------------------------------------------|---------------------------------------------|
| 1       | Fastest, minimal tokens. Ideal for simple contexts. | Short text, single theme                    |
| 2–3     | Good balance of accuracy and speed.                | Standard RAG (recommended for this app)     |
| 5+      | Comprehensive but slow. Suitable for long-form or encyclopedia use. | Multi-domain, long-form RAG                 |

### 4. File Deletion Operations

When handling persisted data, it is essential to control partial deletions and rebuilds. This app implements a two-stage deletion logic:

1. **Individual Deletion**: Delete the temporary file and metadata corresponding to a specific file ID, then rebuild the DB from the remaining data.  
2. **Delete All**: Remove the entire `vectorstore/` directory for a full reset.

These deletion operations are tied to Streamlit's session state, and `st.rerun()` is used after deletion to re-render the app for immediate UI updates. The following table summarizes the operations:

| Operation               | Action                                                       |
|-------------------------|--------------------------------------------------------------|
| Individual Deletion     | Remove a specific file and rebuild the DB with remaining data |
| Delete All              | Delete the entire `vectorstore/` directory for a full reset |

After deletion, the UI is automatically refreshed and the state is updated.

### 5. Features of the Streamlit UI

This is the front-end part that handles the app's usability. It leverages Streamlit components to create a simple yet functional chat UI. Key points include:

- **Sidebar**: Centralized control for file management, deletion, and list display.  
- **Chat Area**: Use `st.chat_message` to visualize the conversation history between the user and AI in a dialog format.  
- **Reproducibility**: Leverages Streamlit's `session_state` to maintain and reset state seamlessly.

Behind the chat, a RAG chain (`RetrievalQA`) performs retrieval and generation in two stages for each question.

#### Sidebar

- File upload (multiple files supported)  
- List of currently loaded files  
- Delete button for each file  
- "Delete All" button  

#### Main Screen

- Display of chat history  
- Input field: "Ask a question about the documents"  
- AI response and an expander panel showing "Source Documents"  

---

## How to Run

1. Start the LM Studio server at `http://localhost:1234` (make sure the LLM is loaded beforehand)  
2. Run the following in your terminal:

```bash
streamlit run app2.py
```

The app will open in your browser (usually at `http://localhost:8501`).  
![](https://gyazo.com/25fdfd8852aaa899fcca65d14596b7c4.png)

On the first launch, you will see a message saying "Please upload files." When you upload a PDF or text file, learning and persistence occur automatically.

---

## Example: RAG with Multiple Documents

In addition to the "Momotaro" story from the previous example, let's load the story of "Kaguya-hime" into the RAG.

The story of Kaguya-hime is as follows:

```text
Once upon a time, an old man who made his living cutting bamboo and his wife lived together.
One day, the old man found a shining stalk of bamboo in the mountain, and when he split it open, a small girl appeared.
The old man took her home, and with his wife, named her "Kaguya-hime" and raised her with great care.
Kaguya-hime grew into a beautiful woman, and her beauty became known even in the capital.
Many nobles proposed marriage, but Kaguya-hime accepted none of their proposals and set them difficult tasks in search of precious treasures.
No one succeeded.
Eventually, even the emperor fell in love with her, but her heart belonged to the Moon Kingdom.
On the night of the full moon, a messenger from the moon came to take her back, and Kaguya-hime returned to the moon in tears.
The old man and his wife were deeply saddened and gazed at the night sky forever, thinking of Kaguya-hime.
```

When you upload the two texts "Momotaro" and "Kaguya-hime", the system can accurately answer questions that combine the content of both.

> Example question: "What commonalities do Momotaro and Kaguya-hime share?"

The RAG system extracts similar contexts from each story and generates a comparative answer. The following answer was generated:

![](https://gyazo.com/440c40bf9bd04d8309a808038ef671ab.png)

In the answer, the observation that "both ultimately return to their original homes" is interesting, as it links their respective endings.  
(Momotaro returns to his grandfather and grandmother; Kaguya-hime returns to the moon.)

---

## Conclusion

In this extended version, we have evolved the local RAG environment into a more practical form.

| Improvement                | Benefit                                                        |
|----------------------------|----------------------------------------------------------------|
| **FAISS Persistence**      | Fast startup without needing to rebuild the DB after restart    |
| **MultiQueryRetriever**    | Improved retrieval accuracy                                    |
| **File Management UI**     | Visual control for uploading and deleting                      |
| **Multi-Format Support**   | Ability to ingest a mix of PDF, DOCX, PPTX, and TXT            |

This makes it possible to implement a practical knowledge assistant that runs entirely in a local environment. Next time, we plan to extend it with **document summarization and classification features** and support for **models beyond OpenAI-compatible APIs (e.g., Ollama, Llama.cpp)**.

<style>
img { border: 1px solid gray; }
</style>
