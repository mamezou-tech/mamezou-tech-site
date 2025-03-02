---
title: 'Understanding LangMem''s Long-Term Memory: Overview and Usage'
author: noboru-kudo
date: 2025-02-26T00:00:00.000Z
tags:
  - 長期記憶
  - LangMem
  - LangChain
  - 生成AI
  - LLM
  - Python
image: true
translate: true

---

A little while ago, an interesting product was released by LangChain, a provider of LLM frameworks.

@[og](https://blog.langchain.dev/langmem-sdk-launch/)

LangMem is an SDK that enables AI agents to manage long-term memory. Long-term memory complements short-term memory (threads) and RAG, offering a novel approach to enhancing LLM memory management.

In this article, we will summarize the mechanisms and usage of LangMem’s long-term memory.

## What is Long-Term Memory?

Long-term memory is a mechanism that retains user information and context even as time passes.

Traditional LLMs had the following issues:
- LLMs reset information after each interaction (context is lost)
- While conversation history is maintained on a per-thread basis, memory is reset when conversations span multiple threads

In contrast, long-term memory retains conversation history and user preferences across threads. LLMs can leverage this to achieve more natural, human-like conversations.

The LangMem SDK offered by LangChain provides APIs to efficiently manage long-term memory, promoting its use in AI agents.

:::column: Long-Term Memory Categories
LangMem categorizes long-term memory into the following three types.

1. Semantic
2. Episodic
3. Procedural

When using LangMem, it is important to clearly define which type of long-term memory is required. For more details on these, please refer to the official documentation below.

- [LangMem Doc - Core Concept - Types of Memory](https://langchain-ai.github.io/langmem/concepts/conceptual_guide/#memory-types)

Note that this article mainly focuses on the Semantic/Episodic types of long-term memory.
:::

## APIs Provided by LangMem

Let us summarize the representative APIs provided by LangMem.

### Core API

It provides APIs to efficiently manage long-term memory using LLMs. The Core API is a stateless transformation API, without persistence features.

#### Memory Manager

The Memory Manager is an API that uses LLMs to extract important information from conversations and manage it as long-term memory. It provides the following functionalities:

- Add new memory
- Update existing memory
- Delete unnecessary memory

The following code is an example of reflecting a user's food preferences in long-term memory.

```python
from pydantic import BaseModel, Field, conint
from langmem import create_memory_manager


class UserFoodPreference(BaseModel):
    """Detailed information on the user's food preferences"""
    food_name: str = Field(..., description="Dish name")
    cuisine: str | None = Field(
        None, description="Type of cuisine (e.g., Japanese, Western, Chinese, etc.)"
    )
    preference: conint(ge=0, le=100) | None = Field(
        None, description="Degree of liking (expressed as a score between 0 and 100)"
    )
    description: str | None = Field(
        None, description="Additional information (for example, specific flavors or ingredients)"
    )


# Create Memory Manager
manager = create_memory_manager(
    "openai:gpt-4o-2024-11-20",  # Model used for memory extraction and update
    schemas=[UserFoodPreference],
    instructions="Please extract the user's preferences in detail. If the `preference` should be updated to 0, delete it from memory (RemoveDoc)",
    enable_inserts=True,  # Memory addition: default True
    enable_updates=True,  # Memory update: default True
    enable_deletes=True,  # Memory deletion: default False
)
# Continue
```

[create_memory_manager](https://langchain-ai.github.io/langmem/reference/memory/#langmem.create_memory_manager) is the API that creates a Memory Manager. The structure (schemas) used for long-term memory can be specified as any custom schema with Pydantic, as shown above. By default, memory is treated as a string, but by defining a concrete data structure, it becomes easier for the agent to organize information properly. Here, we created and applied the UserFoodPreference schema, which represents a user's food preferences.

The Memory Manager updates long-term memory using LLM tool calls. Therefore, it is necessary to specify the LLM model as the first argument. Depending on the chosen model, the accuracy of long-term memory can vary significantly. In some trials, less powerful models resulted in insufficient summarization of the information.

Below is the part where memory is actually updated.

```python
def print_memory(num: int, memories: list):
    """Output long-term memory"""
    print(f"### conversation:{num}")
    for m in memories:
        print(m)

# Addition
conversation = [
    {"role": "user", "content": "I love ramen!!"},
    {"role": "user", "content": "I also like pasta"}
]
# Apply long-term memory
memories = manager.invoke({"messages": conversation})
print_memory(1, memories)

# Update or delete
conversation = [
    {"role": "user", "content": "I like miso ramen"},
    {"role": "user", "content": "I have grown to dislike pasta"},
]
# Apply long-term memory (update/delete existing memory)
memories = manager.invoke({"messages": conversation, "existing": memories})
print_memory(2, memories)
```

Updating long-term memory is performed using the invoke (synchronous) or ainvoke (asynchronous) methods. At that time, the relevant user messages are specified in the `messages` property. In addition, if updating or deleting existing memory, pass the current memory in the `existing` property. Since the Memory Manager is a stateless API, the update result is returned as the return value.

Below is the output of the above code (formatted and with comments added).

```
### conversation:1
### conversation:1
# Addition
ExtractedMemory(id='1b7abda8-ad7e-41a1-a485-fd2eb26f2303',
  content=UserFoodPreference(food_name='Ramen',
    cuisine='Japanese cuisine', preference=100, description='I love ramen')
)
ExtractedMemory(id='3b841c9a-ca87-466d-927f-525f5314fd01',
  content=UserFoodPreference(food_name='Pasta',
  cuisine='Western cuisine', preference=80, description='I also like pasta')
)
### conversation:2
# Update
ExtractedMemory(id='1b7abda8-ad7e-41a1-a485-fd2eb26f2303',
  content=UserFoodPreference(food_name='Ramen',
    cuisine='Japanese cuisine', preference=100, description='I love miso ramen')
)
# Delete (RemoveDoc)
ExtractedMemory(id='3b841c9a-ca87-466d-927f-525f5314fd01',
 content=RemoveDoc(json_doc_id='3b841c9a-ca87-466d-927f-525f5314fd01')
)
```

We can see that the updates and deletions have been executed as expected. As mentioned earlier, since updating long-term memory uses LLM tool calls, the results may not always be the same.

Also, note that deletion is only marked by RemoveDoc, and it does not actually delete the memory. The deletion method (physical or logical) is left up to the API user.

#### Prompt Optimizer

The Prompt Optimizer is a feature that leverages past conversation history and feedback to continuously improve the system prompt.

- [LangMem Doc - Prompt Optimization API Reference](https://langchain-ai.github.io/langmem/reference/prompt_optimization/)

In typical LLM operations, it is common to analyze successful interactions and revise the system prompt to elicit better responses. By using the Prompt Optimizer, you can delegate this optimization process to the LLM itself, automating prompt improvements.

For more details on how to use it, please refer to the official guides below.

- [LangMem Doc - Guide - How to Optimize a Prompt](https://langchain-ai.github.io/langmem/guides/optimize_memory_prompt/)
- [LangMem Doc - Guide - How to Optimize Multiple Prompts](https://langchain-ai.github.io/langmem/guides/optimize_compound_system/)

### Storage API

While the Core API provides memory transformation capabilities, in actual deployment, a storage persistence feature is required to retain memory over a long period. To achieve this, LangMem utilizes LangGraph's persistence feature ([BaseStore](https://langchain-ai.github.io/langgraph/reference/store/#langgraph.store.base.BaseStore)) as a storage backend, providing APIs for persisting long-term memory.

In this article, we use InMemoryStore, an in-memory implementation of BaseStore, for simple testing[^1].

[^1]: According to the current official documentation, for production use, the PostgreSQL-based [AsyncPostgresStore](https://langchain-ai.github.io/langgraph/reference/store/#langgraph.store.postgres.AsyncPostgresStore) is recommended.

#### Store Manager

The Store Manager is similar to the Memory Manager, but it is an API for updating the actual long-term memory storage.

Below is an implementation of the Memory Manager code using the Store Manager version (duplicates, such as the schema definitions, have been omitted).

```python
from langgraph.func import entrypoint
from langgraph.store.memory import InMemoryStore
from pydantic import BaseModel, Field, conint
from langmem import create_memory_store_manager


class UserFoodPreference(BaseModel):
    # (omitted)

# Create Store Manager
manager = create_memory_store_manager(
    "openai:gpt-4o-2024-11-20",  # Model used for memory extraction and update
    namespace=("chat", "{user_id}"),  # Manage memories for each UserId
    schemas=[UserFoodPreference],
    instructions="Please extract the user's preferences in detail. If the `preference` should be updated to 0, delete it from memory (RemoveDoc)",
    enable_inserts=True,  # Default True
    enable_deletes=True,  # Default False (do not delete)
)
```

[create_memory_manager](https://langchain-ai.github.io/langmem/reference/memory/#langmem.create_memory_store_manager) is the API that creates a Store Manager. Similar to the Memory Manager, the structure (schemas) for long-term memory can be specified using any Pydantic schema.

Also, by specifying a namespace, the Memory Manager allows memory data to be managed in a hierarchical structure. In this example, the first level is `chat` (a fixed value), and the second level is the user ID (as a placeholder), allowing memory management for each user.

For more on integration with LangGraph's persistence feature, please refer to the official documentation.

- [LangGraph Doc - Persistence - MemoryStore](https://langchain-ai.github.io/langgraph/concepts/persistence/#memory-store)

Below is the part where memory is updated in practice.

```python
# Create an in-memory store (BaseStore) for LangGraph
store = InMemoryStore(
    index={
        "dims": 1536,
        "embed": "openai:text-embedding-3-small", # Model for vectorization
    }
)

# LangGraph workflow (Functional API)
@entrypoint(store=store)
def app(params: dict):
    # Since the Store is obtained from LangGraph's context, the 'existing' field is not needed as in the Memory Manager
    manager.invoke({"messages": params["messages"]}, config={"configurable": {"user_id": params["user_id"]}})

# Addition
conversation = [
    {"role": "user", "content": "I love ramen!!"},
    {"role": "user", "content": "I also like pasta"}
]
# Apply long-term memory
app.invoke({"messages": conversation, "user_id": "MZ0001"})
memories = store.search(("chat", "MZ0001"))
print_memory(1, memories)

# Update or delete
conversation = [
    {"role": "user", "content": "I like miso ramen"},
    {"role": "user", "content": "I have grown to dislike pasta"},
]
# Apply long-term memory (update/delete existing memory)
app.invoke({"messages": conversation, "user_id": "MZ0001"})
memories = store.search(("chat", "MZ0001"))
print_memory(2, memories)
```

Using @entrypoint, a LangGraph workflow is defined to manage the long-term memory of the respective user. In this workflow, instead of calling an LLM, the Store Manager is used to update long-term memory. Like the Memory Manager, invoke (synchronous) and ainvoke (asynchronous) methods are available here.

Below is the output of the above code (formatted and with comments added).

```
### conversation:1
# Addition
Item(namespace=['chat', 'MZ0001'], key='69240f7f-3b19-4b96-b51d-9e4da7270eec',
    value={'kind': 'UserFoodPreference',
          'content': {'food_name': 'Ramen', 'cuisine': 'Japanese cuisine', 'preference': 100, 'description': 'love it'}},
     created_at='2025-02-26T01:58:08.175579+00:00', updated_at='2025-02-26T01:58:08.175582+00:00', score=None
)
Item(namespace=['chat', 'MZ0001'], key='d94790e4-8ee5-467b-b1fa-65b56a140b62',
     value={'kind': 'UserFoodPreference',
            'content': {'food_name': 'Pasta', 'cuisine': 'Western cuisine', 'preference': 80, 'description': 'like'}},
     created_at='2025-02-26T01:58:09.338439+00:00', updated_at='2025-02-26T01:58:09.338453+00:00', score=None
)
### conversation:2
# Update
Item(namespace=['chat', 'MZ0001'], key='69240f7f-3b19-4b96-b51d-9e4da7270eec',
     value={'kind': 'UserFoodPreference',
            'content': {'food_name': 'Ramen', 'cuisine': 'Japanese cuisine', 'preference': 100, 'description': 'like miso ramen'}},
     created_at='2025-02-26T01:58:15.138250+00:00', updated_at='2025-02-26T01:58:15.138261+00:00', score=None
)
# Delete -> Physical deletion (Pasta)
```

Even though it is in-memory, you can observe that the long-term memory is being updated. Unlike with the Memory Manager, here the deletion actually physically removes the memory.

#### Memory Tools

While the Store Manager explicitly uses invoke/ainvoke to update long-term memory, Memory Tools integrates this as an LLM tool call.

- [create_manage_memory_tool](https://langchain-ai.github.io/langmem/reference/tools/#langmem.create_manage_memory_tool): for adding, updating, and deleting long-term memory
- [create_search_memory_tool](https://langchain-ai.github.io/langmem/reference/tools/#langmem.create_search_memory_tool): for searching long-term memory

Note that while converting tool call formats for each vendor may be necessary separately, these tools can be used outside of LangGraph workflows as well[^2].

[^2]: <https://langchain-ai.github.io/langmem/guides/use_tools_in_custom_agent/>

## Combining LLMs with Long-Term Memory

So far, we have looked over the APIs provided by LangMem. Finally, let's see how to use long-term memory in conjunction with an LLM.

LangMem defines the following two implementation patterns for long-term memory:

- [LangMem Doc - Hot Path (Conscious Formation)](https://langchain-ai.github.io/langmem/concepts/conceptual_guide/#conscious-formation)
  A method in which long-term memory is updated in real time with each conversation; suitable for scenarios requiring immediate memory updates.
- [LangMem Doc - Background (Subconcious Formation)](https://langchain-ai.github.io/langmem/concepts/conceptual_guide/#subconcious-formation)
  A method that updates memory asynchronously after a certain period; suitable for scenarios where large amounts of information need to be processed and stored efficiently.

Here, we will implement the Hot Path pattern and try out a conversation utilizing long-term memory.

In the following code, a user's food preferences are saved in long-term memory, and the LLM responds based on that.

```python
from langchain.chat_models import init_chat_model
from langgraph.func import entrypoint
from langgraph.store.memory import InMemoryStore
from pydantic import BaseModel, Field, conint
from langmem import create_memory_store_manager


class UserFoodPreference(BaseModel):
    # (omitted)


store = InMemoryStore(
    index={
        "dims": 1536,
        "embed": "openai:text-embedding-3-small",
    }
)

manager = create_memory_store_manager(
    "anthropic:claude-3-7-sonnet-latest",
    namespace=("chat", "{user_id}"),
    schemas=[UserFoodPreference],
    instructions="Please extract the user's preferences in detail",
    enable_inserts=True,
    enable_deletes=False,
)

llm = init_chat_model("anthropic:claude-3-7-sonnet-latest")


@entrypoint(store=store)
def app(params: dict):
    messages = params["messages"]
    user_id = params["user_id"]
    # 1. Retrieve the long-term memory of the user from storage
    memories = store.search(("chat", user_id))
    # 2. Set the long-term memory as a system message
    system_msg = f"""You are a helpful assistant.

## Memories
<memories>
{memories}
</memories>
"""
    response = llm.invoke([
        {
            "role": "system",
            "content": system_msg,
        }, *messages
    ])

    # 3. Reflect the conversation in long-term memory
    manager.invoke({"messages": messages + [response]}, config={"configurable": {"user_id": user_id}})
    return response.content
```

The key points are as follows.

1. Long-term memory retrieval  
   Retrieve the user's long-term memory from storage (store.search)
2. Add long-term memory to the system message  
   Embed the previously stored information so that the LLM can reference it.
3. Reflect the conversation content in long-term memory  
   Add the user's utterances and the LLM's response to memory (manager.invoke).

The following code demonstrates this execution.

```python
# ---- Update Long-Term Memory ----
conversation = [
    {"role": "user", "content": "I love soy sauce ramen!!"},
]
app.invoke({"messages": conversation, "user_id": "MZ0001"})

# ---- Retrieve Long-Term Memory ----
conversation = [
    {"role": "user", "content": "What should I eat for lunch today?"},
]
message = app.invoke({"messages": conversation, "user_id": "MZ0001"})
print("### LLM:\n", message)

memories = store.search(("chat", "MZ0001"))
print("### Memories:\n", [m for m in memories])
```

To verify long-term memory, purposely, conversation history (short-term memory) is not carried over between the two LLM invocations. The results are as follows (formatted partially).

```
### LLM: 
Hello! It seems you're having a lunch dilemma.
Previously, you mentioned that you like soy sauce ramen. How about trying it for today's lunch? That deep soy sauce flavor and aroma is perfect for lunchtime, in my opinion.
I can also suggest a few other options depending on your mood:
1. If you prefer other Japanese-style dishes, maybe noodles like udon or soba.
2. If you're in the mood for something lighter, perhaps a combination of a rice ball and miso soup.
3. If you're really hungry, options like a tempura bowl or oyakodon might be suitable.

How are you feeling today?

### Memories:
Item(namespace=['chat', 'MZ0001'], key='66846bc7-7335-4e3c-b77a-1a65f03b9be4',
  value={'kind': 'UserFoodPreference',
         'content': { 'food_name': 'Soy Sauce Ramen', 'cuisine': 'Japanese cuisine', 'preference': 90,
                      'description': "A type of ramen described as 'love it'" }
  }, created_at='2025-02-26T06:05:47.887150+00:00', updated_at='2025-02-26T06:05:47.887153+00:00', score=None
)
```

Utilizing long-term memory yields a nice response that reflects the user's preferences, doesn't it?

:::column: Background Scenario
This scenario is not covered here, but with the Hot Path, long-term memory is updated with every interaction, which may not be very efficient in terms of processing. Furthermore, because LLMs are used for updating long-term memory, the cost can be a concern. If real-time long-term memory updates are not essential, you might prefer to adopt a batch processing scenario in the background.

For those interested, please refer to the official guides below.

- [LangMem Doc - Background Quickstart Guide](https://langchain-ai.github.io/langmem/background_quickstart/)
- [LangMem Doc - Delayed Background Memory Processing](https://langchain-ai.github.io/langmem/guides/delayed_processing/)
- [LangMem Doc - ReflectionExecutor](https://langchain-ai.github.io/langmem/reference/utils/#langmem.ReflectionExecutor)

In this scenario, long-term memory is updated in batch after the conversation between the user and the LLM has settled (updates are canceled while the conversation is ongoing). I haven't tried it, but based on the implementation of ReflectionExecutor, it appears to support remote execution.
::: 

## Conclusion

In this article, we have organized an overview and basic usage of LangMem. LangMem is an SDK designed to achieve more natural and advanced conversations by maintaining consistent memory across threads.

In scenarios involving LLMs, combining this with RAG or short-term memory (conversation history within a thread) enables more context-aware dialogue. By introducing long-term memory, an agent can retain past interactions and user preferences, enabling continuous learning and adaptation that mimics human behavior.

As AI agents rapidly evolve, the integration of long-term memory is likely to become a crucial element in expanding their potential.

It has just been released, and its future development is certainly something to watch.
