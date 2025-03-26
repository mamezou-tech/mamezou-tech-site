---
title: LangMemの長期記憶の概要と使い方を理解する
author: noboru-kudo
date: 2025-02-26
tags: [長期記憶, LangMem, LangChain, 生成AI, LLM, Python]
image: true
---

少し前に、LLMフレームワークを提供するLangChainから興味深いプロダクトがリリースされました。

@[og](https://blog.langchain.dev/langmem-sdk-launch/)

LangMemは、AIエージェントが長期的な記憶を管理できるようにするSDKです。
長期記憶は、短期記憶(スレッド)やRAGを補完し、LLMの記憶管理を強化する新たなアプローチといえます。

本記事では、LangMemの長期記憶の仕組みや使い方について整理していきます。

## 長期記憶とは？

長期記憶とは、時間が経過してもユーザーの情報やコンテキストを保持できる仕組みのことです。

従来のLLMには以下のような課題がありました。
- LLMは1回の対話ごとに情報をリセットする（コンテキストが失われる）
- スレッド単位で履歴を保持できるが、スレッドをまたぐと記憶がリセットされる
 
これに対して長期記憶は、スレッドをまたがってやり取りの履歴やユーザーの好み等を保持します。
LLMはこれを利用することで、より人間に近い自然な会話を実現できます。

LangChainが提供するLangMem SDKは、この長期記憶を効率的に管理するためのAPIを提供し、AIエージェントでの利用を促進します。

:::column:長期記憶の分類
LangMemでは長期記憶を以下の3種類に分類しています。

1. Semantic (意味記憶)
2. Episodic (経験記憶)
3. Procedural (手続き記憶)

LangMemを利用する際は、どのタイプの長期記憶が必要かを明確にすることが重要です。
これらの詳細は以下公式ドキュメントをご参照ください。

- [LangMem Doc - Core Concept - Types of Memory](https://langchain-ai.github.io/langmem/concepts/conceptual_guide/#memory-types)

なお、本記事では主にSemantic/Episodicタイプの長期記憶に焦点を当てています。
:::

## LangMemが提供するAPI

LangMemが提供する代表的なAPIを整理します。

### Core API

LLMを利用して長期記憶を効率的に管理するためのAPIを提供します。
Core APIは副作用のない変換APIで、永続化機能等はありません。

#### Memory Manager

Memory ManagerはLLMを活用して、会話から重要な情報を抽出し、長期記憶として管理するためのAPIです。  
次の機能を提供します。

- 新しい記憶を追加
- 既存の記憶を更新
- 不要な記憶を削除

以下のコードは、ユーザーの食の好みを長期記憶に反映する例です。

```python
from pydantic import BaseModel, Field, conint
from langmem import create_memory_manager


class UserFoodPreference(BaseModel):
    """ユーザーの食の好みの詳細情報"""
    food_name: str = Field(..., description="料理名")
    cuisine: str | None = Field(
        None, description="料理のタイプ（和食、洋食、中華など）"
    )
    preference: conint(ge=0, le=100) | None = Field(
        None, description="好きの度合い（0～100のスコアで表現）")
    description: str | None = Field(
        None, description="その他の補足説明（例えば、特定の味付けや具材など）"
    )


# Memory Manager生成
manager = create_memory_manager(
    "openai:gpt-4o-2024-11-20",  # 記憶抽出や更新に使うモデル
    schemas=[UserFoodPreference],
    instructions="ユーザーの好みを詳細に抽出してください。好みの`preference`を0に更新する場合は記憶から削除(RemoveDoc)してください",
    enable_inserts=True,  # 記憶追加: デフォルトTrue
    enable_updates=True,  # 記憶更新: デフォルトTrue
    enable_deletes=True,  # 記憶削除: デフォルトFalse
)
# 続く
```

[create_memory_manager](https://langchain-ai.github.io/langmem/reference/memory/#langmem.create_memory_manager)がMemory Managerを生成するAPIです。
長期記憶に利用する構造(schemas)は上記のようにPydanticで任意のスキーマを指定できます。
デフォルトでは記憶は文字列として扱われますが、具体的なデータ構造を定義することで、エージェントが情報を適切に整理しやすくなります。
ここではユーザーの食の好みを表すUserFoodPreferenceスキーマを作成・適用しました。

Memory ManagerはLLMのツールコールを使って長期記憶を更新します。
このため、第一引数としてLLMのモデルを指定する必要があります。
選択するモデルによって、長期記憶の精度が大きく異なります。何度か試行したところ一部の軽量モデルでは情報の要約が不十分になったケースもありました。

以下は実際に記憶を更新する部分です。

```python
def print_memory(num: int, memories: list):
    """長期記憶を出力"""
    print(f"### conversation:{num}")
    for m in memories:
        print(m)

# 追加
conversation = [
    {"role": "user", "content": "ラーメンが大好きです!!"},
    {"role": "user", "content": "パスタも好きです"}
]
# 長期記憶反映
memories = manager.invoke({"messages": conversation})
print_memory(1, memories)

# 更新 or 削除
conversation = [
    {"role": "user", "content": "ラーメンは味噌ラーメンが好き"},
    {"role": "user", "content": "パスタは嫌いになりました"},
]
# 長期記憶反映(既存の長期記憶更新・削除)
memories = manager.invoke({"messages": conversation, "existing": memories})
print_memory(2, memories)
```

長期記憶の更新は、invoke(同期)またはainvoke(非同期)メソッドで実行します。
このとき、対象となるユーザーメッセージを`messages`プロパティに指定します。
また、既存の記憶を更新・削除する場合は、`existing`プロパティに現在の記憶を渡します。
Memory Managerは副作用のないAPIなので、更新結果は戻り値として受け取ります。

以下は上記コードの実行結果です(整形、コメント追記しています)。

```
### conversation:1
# 追加
ExtractedMemory(id='1b7abda8-ad7e-41a1-a485-fd2eb26f2303', 
  content=UserFoodPreference(food_name='ラーメン', 
    cuisine='和食', preference=100, description='ラーメンが大好き')
)
ExtractedMemory(id='3b841c9a-ca87-466d-927f-525f5314fd01', 
  content=UserFoodPreference(food_name='パスタ', 
    cuisine='洋食', preference=80, description='パスタも好き')
)
### conversation:2
# 更新
ExtractedMemory(id='1b7abda8-ad7e-41a1-a485-fd2eb26f2303', 
  content=UserFoodPreference(food_name='ラーメン', 
    cuisine='和食', preference=100, description='味噌ラーメンが大好き')
)
# 削除(RemoveDoc)
ExtractedMemory(id='3b841c9a-ca87-466d-927f-525f5314fd01', 
  content=RemoveDoc(json_doc_id='3b841c9a-ca87-466d-927f-525f5314fd01')
)
```

期待通りに更新や削除が実行されていることが分かります。前述の通り、長期記憶の更新はLLMのツールコールを利用していますので、実行結果は同じになるとは限りません。

なお、削除はRemoveDocでマークされるだけで、実際に削除される訳ではありません。削除方法(物理 or 論理)はAPIを利用する側に委ねられます。

#### Prompt Optimizer

Prompt Optimizerは、過去の会話履歴やフィードバックを活用し、システムプロンプトを継続的に改善する機能です。

- [LangMem Doc - Prompt Optimization API Reference](https://langchain-ai.github.io/langmem/reference/prompt_optimization/)

一般的な LLM運用では、成功したやり取りを分析し、より良い応答を引き出せるようシステムプロンプトを見直すということはよくやりますね。
Prompt Optimizerを使うことで、この最適化プロセスをLLM自体に任せ、プロンプトの改善を自動化できます。

具体的な使い方の詳細は、以下公式ガイドをご参照ください。

- [LangMem Doc - Guide - How to Optimize a Prompt](https://langchain-ai.github.io/langmem/guides/optimize_memory_prompt/)
- [LangMem Doc - Guide - How to Optimize Multiple Prompts](https://langchain-ai.github.io/langmem/guides/optimize_compound_system/)

### Storage API

Core APIは記憶の変換機能を提供しますが、実際に運用するには、記憶を長期間保持できるストレージの永続化機能が必要です。
これを実現するために、LangMemはLangGraphの永続化機能([BaseStore](https://langchain-ai.github.io/langgraph/reference/store/#langgraph.store.base.BaseStore))をストレージバックエンドとして利用し、長期記憶を永続化するためのAPIを提供しています。

本記事では簡単に検証できるよう、BaseStoreのインメモリ実装であるInMemoryStoreを利用します。


:::info
公式ドキュメントでは、実運用する場合はPostgreSQLベースのストアが推奨されています。
これについては、以下記事をご参照ください。

@[og](/blogs/2025/03/12/langmem-aurora-pgvector/)
:::

#### Store Manager

Store ManagerはMemory Managerと似ていますが、実際の長期記憶ストレージを更新する ためのAPIです。

以下は、Memory ManagerのコードをStore Managerバージョンで実装したものです（スキーマなどの重複部分は省略）。

```python
from langgraph.func import entrypoint
from langgraph.store.memory import InMemoryStore
from pydantic import BaseModel, Field, conint
from langmem import create_memory_store_manager


class UserFoodPreference(BaseModel):
    # 省略

# Store Manager生成
manager = create_memory_store_manager(
    "openai:gpt-4o-2024-11-20",  # 記憶抽出や更新に使うモデル
    namespace=("chat", "{user_id}"),  # UserId単位に記憶を管理
    schemas=[UserFoodPreference],
    instructions="ユーザーの好みを詳細に抽出してください。好みの`preference`を0に更新する場合は記憶から削除(RemoveDoc)してください",
    enable_inserts=True,  # デフォルトTrue
    enable_deletes=True,  # デフォルトFalse(削除しない)
)
```

[create_memory_manager](https://langchain-ai.github.io/langmem/reference/memory/#langmem.create_memory_store_manager)がStore Managerを生成するAPIです。
Memory Manager同様に長期記憶に利用する構造(schemas)はPydanticで任意のスキーマを指定できます。

また、Memory Managerにはnamespaceを指定することで、記憶データを階層構造で管理できます。
この例では、第一階層が`chat`(固定値)、第二階層がユーザーID(プレースホルダー)として、各ユーザーごとに記憶を管理できるようにしています。

LangGraphの永続化機能との連携については、以下の公式ドキュメントを参照してください。

- [LangGraph Doc - Persistence - MemoryStore](https://langchain-ai.github.io/langgraph/concepts/persistence/#memory-store)

以下は実際に記憶を更新する部分です。

```python
# LangGraphのインメモリストア(BaseStore)生成
store = InMemoryStore(
    index={
        "dims": 1536,
        "embed": "openai:text-embedding-3-small", # ベクトル化用のモデル
    }
)

# LangGraphワークフロー(Functional API)
@entrypoint(store=store)
def app(params: dict):
    # LangGraphのコンテキストからStoreを取得するのでMemory Managerのようにexistingは不要
    manager.invoke({"messages": params["messages"]}, config={"configurable": {"user_id": params["user_id"]}})

# 追加
conversation = [
    {"role": "user", "content": "ラーメンが大好きです!!"},
    {"role": "user", "content": "パスタも好きです"}
]
# 長期記憶反映
app.invoke({"messages": conversation, "user_id": "MZ0001"})
memories = store.search(("chat", "MZ0001"))
print_memory(1, memories)

# 更新 or 削除
conversation = [
    {"role": "user", "content": "ラーメンは味噌ラーメンが好き"},
    {"role": "user", "content": "パスタは嫌いになりました"},
]
# 長期記憶反映(既存の長期記憶更新・削除)
app.invoke({"messages": conversation, "user_id": "MZ0001"})
memories = store.search(("chat", "MZ0001"))
print_memory(2, memories)
```

@entrypointを利用してLangGraphのワークフローを定義し、該当ユーザーの長期記憶を管理する仕組みになっています。
このワークフローでは、LLMの呼び出しはせずにStore Managerを使って長期記憶を更新しているだけです。こちらもMemory Manager同様にinvoke(同期)/ainvoke(非同期)が用意されています。

以下は上記コードの実行結果です(整形、コメント追記しています)。

```
### conversation:1
# 追加
Item(namespace=['chat', 'MZ0001'], key='69240f7f-3b19-4b96-b51d-9e4da7270eec', 
  value={'kind': 'UserFoodPreference', 
    'content': {'food_name': 'ラーメン', 'cuisine': '和食', 'preference': 100, 'description': '大好き'}}, 
      created_at='2025-02-26T01:58:08.175579+00:00', updated_at='2025-02-26T01:58:08.175582+00:00', score=None
)
Item(namespace=['chat', 'MZ0001'], key='d94790e4-8ee5-467b-b1fa-65b56a140b62', 
  value={'kind': 'UserFoodPreference', 
    'content': {'food_name': 'パスタ', 'cuisine': '洋食', 'preference': 80, 'description': '好き'}},
      created_at='2025-02-26T01:58:09.338439+00:00', updated_at='2025-02-26T01:58:09.338453+00:00', score=None
)
### conversation:2
# 更新
Item(namespace=['chat', 'MZ0001'], key='69240f7f-3b19-4b96-b51d-9e4da7270eec', 
  value={'kind': 'UserFoodPreference', 
    'content': {'food_name': 'ラーメン', 'cuisine': '和食', 'preference': 100, 'description': '味噌ラーメンが好き'}}, 
      created_at='2025-02-26T01:58:15.138250+00:00', updated_at='2025-02-26T01:58:15.138261+00:00', score=None
)
# 削除 -> 物理削除(パスタ)
```

インメモリですが、長期記憶が更新されている様子が分かります。Memory Managerの時は違い、削除は物理的に消されていることも分かります。

#### Memory Tools

Store Managerは明示的にinvoke/ainvokeを使って長期記憶を更新しますが、Memory ToolsはこれをLLMのツールコールとして統合します。

- [LangMem Doc - Memory Tools](https://langchain-ai.github.io/langmem/guides/memory_tools/)

以下の2つのツールが提供されています。

- [create_manage_memory_tool](https://langchain-ai.github.io/langmem/reference/tools/#langmem.create_manage_memory_tool): 長期記憶の追加・更新・削除
- [create_search_memory_tool](https://langchain-ai.github.io/langmem/reference/tools/#langmem.create_search_memory_tool): 長期記憶の検索

なお、各ベンダー向けのツールコールフォーマット変換は別途必要ですが、LangGraphのワークフロー以外からでも利用可能です[^1]。

[^1]: <https://langchain-ai.github.io/langmem/guides/use_tools_in_custom_agent/>

## LLMと長期記憶を組み合わせる

ここまでは、LangMemが提供するAPIを概要を見てきました。
最後に実際に長期記憶をLLMと組み合わせて利用してみます。

LangMemでは長期記憶の実装パターンとして以下の2つを定義しています。

- [LangMem Doc - Hot Path(Conscious Formation)](https://langchain-ai.github.io/langmem/concepts/conceptual_guide/#conscious-formation)
会話のたびにリアルタイムで長期記憶を更新する方法。即時の記憶反映が求められるシナリオ。

- [LangMem Doc - Background(Subconcious Formation)](https://langchain-ai.github.io/langmem/concepts/conceptual_guide/#subconcious-formation)
一定期間経過後に非同期で記憶を更新する方法。大量の情報を効率的に処理・保存するシナリオ。

ここでは、Hot Pathのパターンを実装し、長期記憶を活用した対話を試してみます。

以下のコードでは、ユーザーの食の好みを長期記憶に保存し、それをもとにLLMが応答するようにします。

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
    instructions="ユーザーの好みを詳細に抽出してください",
    enable_inserts=True,
    enable_deletes=False,
)

llm = init_chat_model("anthropic:claude-3-7-sonnet-latest")


@entrypoint(store=store)
def app(params: dict):
    messages = params["messages"]
    user_id = params["user_id"]
    # 1. ストレージから該当ユーザーの長期記憶を検索
    memories = store.search(("chat", user_id))
    # 2. 長期記憶をシステムメッセージとして設定
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

    # 3. 対話を長期記憶に反映
    manager.invoke({"messages": messages + [response]}, config={"configurable": {"user_id": user_id}})
    return response.content
```

ポイントは以下です。

1. 長期記憶検索
  ユーザーに紐づく長期記憶をストレージから取得(store.search)
2. システムメッセージに長期記憶を追加
  事前に記憶された情報を埋め込み、LLMがこれを参考にできるようにする
3. 対話内容を長期記憶に反映
  ユーザーの発言とLLMの応答を記憶に追加(manager.invoke)。

以下のコードでこれを実行します。

```python
# ---- 長期記憶更新 ----
conversation = [
    {"role": "user", "content": "醤油ラーメンが大好きです!!"},
]
app.invoke({"messages": conversation, "user_id": "MZ0001"})

# ---- 長期記憶参照 ----
conversation = [
    {"role": "user", "content": "今日のランチは何を食べようかな？"},
]
message = app.invoke({"messages": conversation, "user_id": "MZ0001"})
print("### LLM:\n", message)

memories = store.search(("chat", "MZ0001"))
print("### Memories:\n", [m for m in memories])
```

長期記憶を確認するために、意図的に2回のLLM呼び出し間で会話履歴(短期記憶)は引き継がないようにしています。
結果は以下の通りです(一部整形)。

```
### LLM: 
こんにちは！ランチのお悩みですね。

以前、醤油ラーメンがお好きとのことでしたね。今日のランチにいかがでしょうか？
あの深い醤油の風味と香りは、ランチタイムにぴったりだと思います。

他にも気分に合わせていくつか提案させていただきますと：

1. 他の和食系なら、うどんやそばなどの麺類
2. 軽めがご希望なら、おにぎりと味噌汁の組み合わせ
3. がっつり食べたい気分なら、天丼や親子丼などの丼物

今日はどのような気分でしょうか？
### Memories:
[Item(namespace=['chat', 'MZ0001'], key='66846bc7-7335-4e3c-b77a-1a65f03b9be4', 
value={'kind': 'UserFoodPreference', 
  'content': {
    'food_name': '醤油ラーメン', 'cuisine': '和食', 'preference': 90, 
    'description': '「大好き」と表現されているラーメンの一種'
  }
}, created_at='2025-02-26T06:05:47.887150+00:00', updated_at='2025-02-26T06:05:47.887153+00:00', score=None)]
```

長期記憶の活用でユーザーの好みを反映したいい感じのレスポンスになっていますね。

:::column:バックグラウンドシナリオ
ここでは取り上げていませんが、Hot Pathはやり取りの都度長期記憶が更新されますので、処理効率があまり良くありません。
また、長期記憶の更新にはLLMが使われますのでコストも気になるところです。
リアルタイムでの長期記憶反映が必須でない場合は、バックグラウンドでの一括処理シナリオを採用したいところです。

こちらに興味がある方は、以下の公式ガイドをご参照ください。

- [LangMem Doc - Background Quickstart Guide](https://langchain-ai.github.io/langmem/background_quickstart/)
- [LangMem Doc - Delayed Background Memory Processing](https://langchain-ai.github.io/langmem/guides/delayed_processing/)
- [LangMem Doc - ReflectionExecutor](https://langchain-ai.github.io/langmem/reference/utils/#langmem.ReflectionExecutor)

こちらのシナリオでは、ユーザーとLLMとの会話が落ち着いた後で、まとめて長期記憶が更新されます(会話が続くうちはキャンセルされる)。
試していませんが、ReflectionExecutorの実装を見るとリモート実行にも対応しているようです。
::: 

## まとめ

本記事では、LangMemの概要と基本的な使い方を整理しました。
LangMemは、スレッドをまたいで一貫した記憶を保持することで、より自然で高度な対話を実現するためのSDKです。

LLMを活用するシナリオでは、RAGや短期記憶(スレッド内の履歴)と組み合わせることで、より文脈を考慮した対話が可能になります。
長期記憶を導入することで、エージェントは過去のやり取りやユーザーの好みを保持し、まるで人間のように継続的な学習と適応ができるようになります。

AIエージェントが急速に進化する中で、長期記憶の導入はその可能性をさらに広げる重要な要素になりそうです。

まだリリースされたばかりですが、今後の展開が気になるところです。
