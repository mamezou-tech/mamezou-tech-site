---
title: 理解LangMem长期记忆的概述与使用方法
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

不久前，从提供LLM框架的LangChain发布了一个有趣的产品。

@[og](https://blog.langchain.dev/langmem-sdk-launch/)

LangMem是一个使AI代理能够管理长期记忆的SDK。  
长期记忆可以补充短期记忆（线程）和RAG，是一种增强LLM记忆管理的全新方法。

本文将整理LangMem的长期记忆的机制和使用方法。

## 什么是长期记忆？

长期记忆是指即使时间流逝，也能保持用户的信息和上下文的机制。

传统的LLM存在以下问题：
- LLM每次对话后都会重置信息（上下文会丢失）
- 虽然可以按线程保存历史，但跨线程时记忆会被重置
 
相反，长期记忆能够跨线程保存交流历史和用户喜好等。LLM利用这一点可以实现更贴近人类的自然对话。

由LangChain提供的LangMem SDK提供了用于高效管理这一长期记忆的API，并促进在AI代理中的应用。

:::column:长期记忆的分类
在LangMem中，长期记忆分为以下三种类型。

1. Semantic（语义记忆）
2. Episodic（情节记忆）
3. Procedural（过程记忆）

在使用LangMem时，明确需要哪种类型的长期记忆非常重要。  
有关详细信息，请参见以下官方文档。

- [LangMem Doc - Core Concept - Types of Memory](https://langchain-ai.github.io/langmem/concepts/conceptual_guide/#memory-types)

此外，本文主要关注Semantic/Episodic类型的长期记忆。
:::

## LangMem 提供的 API

整理一下LangMem提供的代表性API。

### Core API

提供利用LLM高效管理长期记忆的API。  
Core API 是一个无副作用的转换API，没有持久化功能等。

#### Memory Manager

Memory Manager 是一个利用LLM从对话中提取关键信息，并将其作为长期记忆进行管理的API。  
提供以下功能：

- 添加新的记忆
- 更新现有记忆
- 删除不需要的记忆

以下代码是一个将用户的饮食偏好反映到长期记忆中的示例。

```python
from pydantic import BaseModel, Field, conint
from langmem import create_memory_manager


class UserFoodPreference(BaseModel):
    """用户饮食偏好的详细信息"""
    food_name: str = Field(..., description="菜名")
    cuisine: str | None = Field(
        None, description="料理类型（和食、洋食、中餐等）"
    )
    preference: conint(ge=0, le=100) | None = Field(
        None, description="喜好程度（以0～100的分数表示）")
    description: str | None = Field(
        None, description="其他补充说明（例如，特定的调味或配料等）"
    )


# 生成 Memory Manager
manager = create_memory_manager(
    "openai:gpt-4o-2024-11-20",  # 用于记忆提取和更新的模型
    schemas=[UserFoodPreference],
    instructions="请详细提取用户的偏好。如果将偏好中的`preference`更新为0，则从记忆中删除(RemoveDoc)",
    enable_inserts=True,  # 添加记忆: 默认为True
    enable_updates=True,  # 更新记忆: 默认为True
    enable_deletes=True,  # 删除记忆: 默认为False
)
# 继续
```

[create_memory_manager](https://langchain-ai.github.io/langmem/reference/memory/#langmem.create_memory_manager) 是生成 Memory Manager 的 API。  
用于长期记忆的结构（schemas）可以像上面这样使用 Pydantic 指定任意的 schema。  
默认情况下，记忆被视为字符串，但通过定义具体的数据结构，可以使代理更容易地整理信息。  
这里创建并应用了表示用户饮食偏好的 UserFoodPreference schema。

Memory Manager 使用LLM的工具调用来更新长期记忆。  
因此，需要将LLM模型作为第一个参数传入。  
根据选择的模型，长期记忆的准确性会有很大差异。经过多次尝试，在一些轻量级模型下信息摘要可能不够充分的情况也出现过。

以下是实际更新记忆的部分。

```python
def print_memory(num: int, memories: list):
    """输出长期记忆"""
    print(f"### conversation:{num}")
    for m in memories:
        print(m)

# 添加
conversation = [
    {"role": "user", "content": "我非常喜欢拉面!!"},
    {"role": "user", "content": "我也喜欢意面"},
]
# 长期记忆反映
memories = manager.invoke({"messages": conversation})
print_memory(1, memories)

# 更新 or 删除
conversation = [
    {"role": "user", "content": "我喜欢味噌拉面"},
    {"role": "user", "content": "我不喜欢意面了"},
]
# 长期记忆反映（更新/删除现有长期记忆）
memories = manager.invoke({"messages": conversation, "existing": memories})
print_memory(2, memories)
```

长期记忆的更新通过invoke（同步）或ainvoke（异步）方法执行。  
此时，将目标用户消息指定在`messages`属性中。  
此外，在更新或删除现有记忆时，请将当前记忆传递给`existing`属性。  
由于Memory Manager是无副作用的API，因此更新结果将作为返回值返回。

以下是上述代码的执行结果（经过格式化，并添加了注释）。

```
### conversation:1
# 添加
ExtractedMemory(id='1b7abda8-ad7e-41a1-a485-fd2eb26f2303', 
  content=UserFoodPreference(food_name='拉面',
    cuisine='和食', preference=100, description='非常喜欢拉面')
)
ExtractedMemory(id='3b841c9a-ca87-466d-927f-525f5314fd01', 
  content=UserFoodPreference(food_name='意面',
    cuisine='洋食', preference=80, description='也喜欢意面')
)
### conversation:2
# 更新
ExtractedMemory(id='1b7abda8-ad7e-41a1-a485-fd2eb26f2303', 
  content=UserFoodPreference(food_name='拉面',
    cuisine='和食', preference=100, description='非常喜欢味噌拉面')
)
# 删除(RemoveDoc)
ExtractedMemory(id='3b841c9a-ca87-466d-927f-525f5314fd01', 
  content=RemoveDoc(json_doc_id='3b841c9a-ca87-466d-927f-525f5314fd01')
)
```

可以看出更新和删除操作已按预期执行。如前所述，由于长期记忆的更新使用了LLM的工具调用，因此执行结果不一定相同。

另外，删除只是被标记为RemoveDoc，并不代表实际删除。删除方法（物理或逻辑）由使用API的一方决定。

#### Prompt Optimizer

Prompt Optimizer 是一个利用过往对话历史和反馈，不断改进系统提示的功能。

- [LangMem Doc - Prompt Optimization API Reference](https://langchain-ai.github.io/langmem/reference/prompt_optimization/)

在一般的LLM运营中，通常会分析成功的对话，以便改进系统提示以获得更好的响应。  
通过使用Prompt Optimizer，可以将这一优化流程交给LLM本身，实现提示自动改进。

具体用法详情请参见以下官方指南。

- [LangMem Doc - Guide - How to Optimize a Prompt](https://langchain-ai.github.io/langmem/guides/optimize_memory_prompt/)
- [LangMem Doc - Guide - How to Optimize Multiple Prompts](https://langchain-ai.github.io/langmem/guides/optimize_compound_system/)

### Storage API

Core API提供了记忆转换功能，但在实际运用中，需要持久化存储长期保存记忆的存储功能。  
为此，LangMem利用了LangGraph的持久化功能([BaseStore](https://langchain-ai.github.io/langgraph/reference/store/#langgraph.store.base.BaseStore))作为存储后端，并提供用于长期记忆持久化的API。

本文为了便于验证，使用了BaseStore的内存实现InMemoryStore[^1].

[^1]: 根据现阶段的官方文档，在实际运用中推荐使用基于PostgreSQL的[AsyncPostgresStore](https://langchain-ai.github.io/langgraph/reference/store/#langgraph.store.postgres.AsyncPostgresStore).

#### Store Manager

Store Manager与Memory Manager类似，但用于更新实际的长期记忆存储。

以下是将Memory Manager的代码以Store Manager版本实现的示例（省略了重复部分例如schema）。

```python
from langgraph.func import entrypoint
from langgraph.store.memory import InMemoryStore
from pydantic import BaseModel, Field, conint
from langmem import create_memory_store_manager


class UserFoodPreference(BaseModel):
    # 省略

# 生成 Store Manager
manager = create_memory_store_manager(
    "openai:gpt-4o-2024-11-20",  # 用于记忆提取和更新的模型
    namespace=("chat", "{user_id}"),  # 按UserId进行记忆管理
    schemas=[UserFoodPreference],
    instructions="ユーザーの好みを詳細に抽出してください。好みの`preference`を0に更新する場合は記憶から削除(RemoveDoc)してください",
    enable_inserts=True,  # 默认True
    enable_deletes=True,  # 默认False（不删除）
)
```

[create_memory_manager](https://langchain-ai.github.io/langmem/reference/memory/#langmem.create_memory_store_manager) 是生成 Store Manager 的 API。  
与Memory Manager类似，用于长期记忆的结构（schemas）可以通过Pydantic指定任意的schema。

此外，通过指定namespace，Memory Manager可以以分层结构管理记忆数据。  
在此例中，第一层为`chat`（固定值），第二层为用户ID（占位符），从而使得可以针对每个用户管理记忆。

有关与LangGraph持久化功能的集成，请参见以下官方文档。

- [LangGraph Doc - Persistence - MemoryStore](https://langchain-ai.github.io/langgraph/concepts/persistence/#memory-store)

以下是实际更新记忆的部分。

```python
# 生成 LangGraph 内存存储 (BaseStore)
store = InMemoryStore(
    index={
        "dims": 1536,
        "embed": "openai:text-embedding-3-small", # 用于向量化的模型
    }
)

# LangGraph工作流程(Functional API)
@entrypoint(store=store)
def app(params: dict):
    # 从 LangGraph 上下文中获取 Store，因此不需要像 Memory Manager 一样传入 existing
    manager.invoke({"messages": params["messages"]}, config={"configurable": {"user_id": params["user_id"]}})

# 添加
conversation = [
    {"role": "user", "content": "我非常喜欢拉面!!"},
    {"role": "user", "content": "我也喜欢意面"},
]
# 长期记忆反映
app.invoke({"messages": conversation, "user_id": "MZ0001"})
memories = store.search(("chat", "MZ0001"))
print_memory(1, memories)

# 更新 or 删除
conversation = [
    {"role": "user", "content": "我喜欢味噌拉面"},
    {"role": "user", "content": "我不喜欢意面了"},
]
# 长期记忆反映（更新/删除现有长期记忆）
app.invoke({"messages": conversation, "user_id": "MZ0001"})
memories = store.search(("chat", "MZ0001"))
print_memory(2, memories)
```

通过使用@entrypoint定义了LangGraph的工作流程，实现了针对特定用户的长期记忆管理。  
在此工作流程中，并不调用LLM，而仅使用Store Manager来更新长期记忆。同样地，也提供了invoke（同步）/ainvoke（异步）方法，类似于Memory Manager。

以下是上述代码的执行结果（经过格式化并添加了注释）。

```
### conversation:1
# 添加
Item(namespace=['chat', 'MZ0001'], key='69240f7f-3b19-4b96-b51d-9e4da7270eec', 
     value={'kind': 'UserFoodPreference',
            'content': {'food_name': '拉面', 'cuisine': '日式料理', 'preference': 100, 'description': '非常喜欢'}},
     created_at='2025-02-26T01:58:08.175579+00:00', updated_at='2025-02-26T01:58:08.175582+00:00', score=None
)
Item(namespace=['chat', 'MZ0001'], key='d94790e4-8ee5-467b-b1fa-65b56a140b62', 
     value={'kind': 'UserFoodPreference',
            'content': {'food_name': '意面', 'cuisine': '西式料理', 'preference': 80, 'description': '喜欢'}},
     created_at='2025-02-26T01:58:09.338439+00:00', updated_at='2025-02-26T01:58:09.338453+00:00', score=None
)
### conversation:2
# 更新
Item(namespace=['chat', 'MZ0001'], key='69240f7f-3b19-4b96-b51d-9e4da7270eec', 
     value={'kind': 'UserFoodPreference',
            'content': {'food_name': '拉面', 'cuisine': '日式料理', 'preference': 100, 'description': '喜欢味噌拉面'}},
     created_at='2025-02-26T01:58:15.138250+00:00', updated_at='2025-02-26T01:58:15.138261+00:00', score=None
)
# 删除 -> 物理删除(意面)
```

虽然是内存存储，但可以看到长期记忆已经被更新。不同于Memory Manager，此处删除是物理删除。

#### Memory Tools

虽然Store Manager通过显式调用invoke/ainvoke来更新长期记忆，但Memory Tools将其整合为LLM的工具调用。

- [LangMem Doc - Memory Tools](https://langchain-ai.github.io/langmem/guides/memory_tools/)

提供以下两种工具：

- [create_manage_memory_tool](https://langchain-ai.github.io/langmem/reference/tools/#langmem.create_manage_memory_tool): 添加、更新、删除长期记忆
- [create_search_memory_tool](https://langchain-ai.github.io/langmem/reference/tools/#langmem.create_search_memory_tool): 搜索长期记忆

另外，各供应商的工具调用格式转换是另外需要处理的，但也可以在LangGraph工作流之外使用[^2].

[^2]: <https://langchain-ai.github.io/langmem/guides/use_tools_in_custom_agent/>

## 将 LLM 与长期记忆结合使用

到目前为止，我们已经概览了LangMem提供的API。  
最后，我们尝试将长期记忆与LLM结合使用。

在LangMem中，长期记忆的实现模式定义了以下两种：

- [LangMem Doc - Hot Path(Conscious Formation)](https://langchain-ai.github.io/langmem/concepts/conceptual_guide/#conscious-formation)  
  一种在每次对话时实时更新长期记忆的方法。适用于要求即时记忆反映的场景。

- [LangMem Doc - Background(Subconcious Formation)](https://langchain-ai.github.io/langmem/concepts/conceptual_guide/#subconcious-formation)  
  另一种是在经过一定时间后以异步方式更新记忆的方法。适用于高效处理和存储大量信息的场景。

这里我们将实现Hot Path模式，尝试利用长期记忆进行对话。

以下代码将把用户饮食偏好存储到长期记忆中，并基于此让LLM作出响应。

```python
from langchain.chat_models import init_chat_model
from langgraph.func import entrypoint
from langgraph.store.memory import InMemoryStore
from pydantic import BaseModel, Field, conint
from langmem import create_memory_store_manager


class UserFoodPreference(BaseModel):
    # (省略)


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
    instructions = "请详细抽取用户的偏好",
    enable_inserts=True,
    enable_deletes=False,
)

llm = init_chat_model("anthropic:claude-3-7-sonnet-latest")


@entrypoint(store=store)
def app(params: dict):
    messages = params["messages"]
    user_id = params["user_id"]
    # 1. 从存储中搜索对应用户的长期记忆
    memories = store.search(("chat", user_id))
    # 2. 将长期记忆设定为系统消息
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

    # 3. 将对话内容反映至长期记忆
    manager.invoke({"messages": messages + [response]}, config={"configurable": {"user_id": user_id}})
    return response.content
```

关键点如下：

1. 搜索长期记忆  
   从存储（store.search）中获取与用户关联的长期记忆
2. 在系统消息中添加长期记忆  
   预先嵌入记忆信息，使LLM可参考
3. 将对话内容反映至长期记忆  
   将用户的发言与LLM的回应添加到记忆中（manager.invoke）。

下面的代码执行这一过程。

```python
# ---- 更新长期记忆 ----
conversation = [
    {"role": "user", "content": "我非常喜欢酱油拉面!!"},
]
app.invoke({"messages": conversation, "user_id": "MZ0001"})

# ---- 参考长期记忆 ----
conversation = [
    {"role": "user", "content": "今天的午餐该吃什么呢？"},
]
message = app.invoke({"messages": conversation, "user_id": "MZ0001"})
print("### LLM:\n", message)

memories = store.search(("chat", "MZ0001"))
print("### Memories:\n", [m for m in memories])
```

为了确认长期记忆，有意在连续两次LLM调用之间不保持对话历史（短期记忆）。  
结果如下（部分格式化）。

```
### LLM: 
你好！你关于午餐的问题来了。

之前听说你喜欢酱油拉面。今天的午餐如何呢？
那浓郁的酱油风味和香气，非常适合午餐时间。

如果你还想要一些其他建议，这里有几个选择：

1. 其他日式料理，例如乌冬面或荞麦面等面条
2. 如果你想吃得清淡，可以选择饭团搭配味噌汤
3. 如果你想吃得丰盛一些，可以考虑天妇罗盖饭或鸡蛋盖饭等盖饭

今天你的心情如何呢？

### Memories:
[Item(namespace=['chat', 'MZ0001'], key='66846bc7-7335-4e3c-b77a-1a65f03b9be4',
      value={'kind': 'UserFoodPreference',
             'content': {
                 'food_name': '酱油拉面', 'cuisine': '日式料理', 'preference': 90,
                 'description': '被描述为「非常喜欢」的拉面一种'
             }
             }, created_at='2025-02-26T06:05:47.887150+00:00', updated_at='2025-02-26T06:05:47.887153+00:00',
      score=None)]
```

通过利用长期记忆，LLM返回了很好地反映了用户偏好的响应。

:::column:后台场景
这里没有讨论，但由于Hot Path在每次交流时都会更新长期记忆，因此处理效率并不高。  
另外，由于长期记忆的更新需要使用LLM，因此成本也是令人关注的问题。  
如果不是必须要实时反映长期记忆，我们可以采用后台批量处理场景。  

对此感兴趣的朋友请参见以下官方指南。

- [LangMem Doc - Background Quickstart Guide](https://langchain-ai.github.io/langmem/background_quickstart/)
- [LangMem Doc - Delayed Background Memory Processing](https://langchain-ai.github.io/langmem/guides/delayed_processing/)
- [LangMem Doc - ReflectionExecutor](https://langchain-ai.github.io/langmem/reference/utils/#langmem.ReflectionExecutor)

在这种场景下，只有在用户与LLM的对话平静下来之后，长期记忆才会统一更新（在对话持续时会被取消）。  
虽然没有尝试，但从ReflectionExecutor的实现来看，它似乎也支持远程执行。
::: 

## 总结

本文整理了LangMem的概述和基本使用方法。  
LangMem是一个通过跨线程保持一致记忆，从而实现更自然和更高级对话的SDK。

在利用LLM的场景中，与RAG或短期记忆（线程内历史记录）结合使用，可以实现更考虑上下文的对话。  
引入长期记忆后，代理可以保留过去的交流和用户的偏好，从而仿佛像人类一样进行持续的学习和适应。

在AI代理迅速进化的过程中，长期记忆的引入可能成为进一步扩展其潜力的重要因素。

虽然它刚刚发布，但未来的发展令人期待。
