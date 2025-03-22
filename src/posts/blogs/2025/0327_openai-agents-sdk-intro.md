---
title: OpenAI Agents SDKでエージェントオーケストレーションを手早く開発する
author: noboru-kudo
date: 2025-03-27
tags: [AIエージェント, OpenAI, 生成AI]
image: true
---

少し前に、OpenAIからAIエージェント機能に関連する以下の発表がありました。

- [OpenAI News - New tools for building agents](https://openai.com/index/new-tools-for-building-agents/)

Responses APIや各種ビルトインツールの発表はもちろん、最も注目されたのはAIエージェント構築フレームワークのAgents SDKではないでしょうか。

本記事では、このAgents SDKの概要と使い方を整理します。

@[og](https://github.com/openai/openai-agents-python)

- [ドキュメント - OpenAI Agents SDK](https://openai.github.io/openai-agents-python/)

Agents SDKはPythonベースのOSSですが、去年OpenAIが公開した[Swarm](https://github.com/openai/swarm/tree/main)というOSSがベースになっています。
Swarmは教育や実験としての位置付けでしたが、今回リリースされたAgents SDKはResponses APIへの対応はもちろん、より簡単・柔軟にAIエージェント開発ができるように、その機能を大幅に強化しています。
また、トレーシングやガードレール等の運用周りの対応も追加されていて、プロダクトレベルで利用を想定したものになっています。

:::info
Swarmは、去年に本サイトの記事で紹介しています。Agents SDKの仕組みもこの考え方をベースとして作られています。
興味のある方は是非ご参考ください。

@[og](/blogs/2024/12/04/openai-swarm-multi-agent-intro/)
:::

## セットアップ

Agents SDKはPythonの[パッケージ](https://pypi.org/project/openai-agents/)として提供されています。
自分の環境に合った方法でインストールしておきます。

```shell
pip install openai-agents
```

本記事では現時点で最新の0.0.6を使っています。

## エージェントを作成する

まずは、Agents SDKを使った単独エージェントの作成方法を確認します。

```python
from agents import Agent

agent = Agent(
    name='simple agent', # 必須
    instructions='入力された文章をそのまま返してください',
    model='gpt-4o-mini' # 現時点では未指定の場合`gpt-4o`
)
```

Swarmとほとんど同じです。
Agents SDKが提供するAgentクラスのインスタンスを作成します。
この時にパラメータとして、エージェント名(name)やシステム・デベロッパーメッセージ(instructions)等を指定します。

他にも多くのパラメータがあります。全てのパラメータは以下公式リファレンスを参照してください。
- [OpenAI Agents SDK - API Reference - Agents](https://openai.github.io/openai-agents-python/ref/agent/)

早速このエージェントを実行してみます。

```python
import asyncio
from agents import Runner

async def main():
    result = await Runner.run(agent, 'おはよう!!')
    print(result)

if __name__ == '__main__':
    asyncio.run(main())
```

Agents SDKが提供するAgentクラスのrunスタティックメソッドを使用します。
ここでは最初に実行するエージェントや入力テキストを指定します。

このrunメソッドでエージェントが実行されます。
この中でエージェントは、最終的なレスポンスが取得できるまで(デフォルトでは最大10回ループ)、LLMとのやり取りやツール実行、またはタスクを他のエージェントに引き継ぎ(以下Handoff)ます。
今回はツールやHandoffは指定してませんので、ループは1度限りになります。

ここでの出力は以下の通りになりました。

```
RunResult:
- Last agent: Agent(name="simple agent", ...)
- Final output (str):
    おはよう!! 今日はどんな予定ですか？
- 1 new item(s)
- 1 raw response(s)
- 0 input guardrail result(s)
- 0 output guardrail result(s)
(See `RunResult` for more details)
```

最後に実行したエージェント(Last agent)や実行結果(Final output)等が確認できます。

なお、runメソッドは非同期ですが、同期バージョンのrun_syncやストリームレスポンスに対応するrun_streamedメソッドもあります。
各種メソッドやパラメータの詳細は、以下公式リファレンスを参照してください。

- [OpenAI Agents SDK - API Reference - Runner](https://openai.github.io/openai-agents-python/ref/run/)

## ツールを使う

先ほどのエージェントはLLMとチャットするだけのもので、定められたタスクを自律的に遂行するエージェントと言えるようなものではありませんでした。
ここではツールを使ってエージェントらしく改良していきたいと思います。

### ビルトインツール

まずはビルトインツールを使います。今回Agents SDKとともにビルトインツールとして以下の3つのツールが発表されています。

- [OpenAI Doc - Built-in tools - Web Search](https://platform.openai.com/docs/guides/tools-web-search?api-mode=responses)
- [OpenAI Doc - Built-in tools - File Search](https://platform.openai.com/docs/guides/tools-file-search)
- [OpenAI Doc - Built-in tools - Computer Use](https://platform.openai.com/docs/guides/tools-computer-use)

ちょうど少し前に、File Searchツールの仕組みを紹介する記事を公開しました。

@[og](/blogs/2025/03/19/openai-responses-api-filesearch/)

せっかくなので、ここではこのFile Searchを使ったエージェントを作成してみます。

```python
import asyncio
from agents import Agent, Runner, FileSearchTool
agent = Agent(
    name='file search agent',
    instructions='あなたはテックブログ運営者です。file_searchツールを使ってブログファイルを検索してください',
    model='gpt-4o-mini',
    tools=[FileSearchTool(
        # Vector StoreオブジェクトのID
        vector_store_ids=['vs_xxxxxxxxxxxxxxx'],
        max_num_results=3, # 最大の検索結果数(任意)
        # 検索結果の詳細(スコア、テキスト)を含める場合は以下を有効にする
        # include_search_results=True
        # メタデータフィルタリングを指定する場合は以下に記述
        # filters={...}
    )]
)

async def main():
    result = await Runner.run(
        agent,
        'AI関連の記事を簡単に紹介して'
    )
    print(result)
    
if __name__ == '__main__':
    asyncio.run(main())
```

ツールを使う場合は、エージェント作成時のtoolsパラメータに指定します。
ビルトインツールは、Agents SDKに対応するクラスが含まれていますのでそのインスタンスを指定するだけです。
ここではFileSearchToolクラスにVector StoreのIDを指定しています。

```
RunResult:
- Last agent: Agent(name="file search agent", ...)
- Final output (str):
    以下はAI関連の記事の簡単な紹介です。
    
    1. **オンライン検索×AI：Perplexity新API Sonarの概要と基本的な使い方**
       - **日付**: 2025年1月22日
       - **内容**: Perplexityが新しく導入したSonar APIについての概要。生成AIやLLMを活用した検索機能を提供し、リアルタイム情報と引用を利用してアプリに組み込むことができます。新しい料金体系やモデルについても紹介されています。
    
    2. **OpenAI Responses API の新しい File Search (Vector Stores) 機能**
       - **日付**: 2025年3月19日
       - **内容**: OpenAIのResponses APIにFile Search機能が新たに追加され、メタデータフィルタリングが強化されました。この機能はAIエージェントの開発者にとって有用なツールとなります。
    
    3. **LangMemによるLLMの長期記憶の概要**
       - **日付**: 2025年2月26日
       - **内容**: LangChainが開発したLangMem SDKが紹介されており、AIエージェントがユーザー情報や会話履歴を保持する方法について述べられています。これにより、より人間的な会話が実現可能になります。
    
    これらの記事は、最新のAI技術やツールの活用に関する洞察を提供しています。興味がある方は詳細をぜひご覧ください。
- 2 new item(s)
- 1 raw response(s)
- 0 input guardrail result(s)
- 0 output guardrail result(s)
```

Vector Storeに保存された本サイトの記事が検索されている様子が確認できます。

他のビルトインツールに対応するクラスもAgents SDKに含まれていますので、気軽に利用できるようになっています。

### カスタムツール(Function calling)

ビルトインツールはOpenAI側でホストされるツールのため、クライアント側での制御はパラメータの範囲に制限されます。
次は、クライアント側で自由に関数を定義するFunction callingをツールとして利用します。

以下はユーザー情報を取得する関数です。

```python
from dataclasses import dataclass, asdict
import json
from agents import Agent, RunContextWrapper, Runner, function_tool
import asyncio

@dataclass
class LoginUser:
    id: str

@dataclass
class Customer:
    id: str
    location: str
    name: str

@function_tool
def fetch_customer(ctx: RunContextWrapper[LoginUser], customer_id: str) -> str:
    """顧客情報を取得します。

    Args:
        customer_id (str): 取得する顧客のID。
    Returns:
        str: 顧客情報(JSON)。
    """
    print(f'[audit]fetched by {ctx.context.id}')
    user = Customer(
        id=customer_id,
        location='東京都新宿区西新宿二丁目1番1号 新宿三井ビルディング34階',
        name='株式会社豆蔵'
    )
    return json.dumps(asdict(user), ensure_ascii=False)
```

通常のPython関数ですが、@function_toolでデコレートします。
こうすることで、Agents SDKは関数シグニチャーやdocstringからFunction callingのスキーマを生成します。
上記関数の場合は、以下のスキーマが生成されていました。

```json
{
  "name": "fetch_customer",
  "parameters": {
    "properties": {
      "customer_id": {
        "description": "取得する顧客のID。",
        "title": "Customer Id",
        "type": "string"
      }
    },
    "required": [
      "customer_id"
    ],
    "title": "fetch_customer_args",
    "type": "object",
    "additionalProperties": false
  },
  "strict": true,
  "type": "function",
  "description": "顧客情報を取得します。"
}
```
LLMはこの情報をもとに引数を作成して、クライアントに関数実行を要求します。

また、関数の第一引数(ctx)では任意のコンテキスト情報が取得できます。
このコンテキストは一連のエージェントワークフロー全体で共有できるものです。ここでは監査情報として顧客情報を取得したユーザーIDをログに出力しています。

第二引数以降はLLMが生成するFunction callingの引数に該当します。プリミティブ以外でもTypedDictやPydantic等にも対応しています。

ビルトインツールと同じように、後は対象のエージェントのtoolsにこの関数を追加するだけです。

```python
agent = Agent(
    name='customer agent',
    instructions='fetch_customerツールで顧客情報を取得してください',
    # カスタムツールを追加
    tools=[fetch_customer],
    model='gpt-4o-mini'
)
```

最後にこのエージェントを実行します。今回は実行時に実行コンテキスト(ログインユーザー情報)を一緒に渡します。

```python
async def main():
    result = await Runner.run(
        agent,
        '顧客の住所を教えて。\nID:CUSTOMER_0001',
        # ワークフローで共有する実行コンテキスト
        context=LoginUser('MZ0001'))
    print(result)

if __name__ == '__main__':
    asyncio.run(main())
```

ここでの実行結果は以下の通りです。

```
[audit]fetched by MZ0001
RunResult:
- Last agent: Agent(name="customer agent", ...)
- Final output (str):
    顧客の住所は以下の通りです：
    
    **住所**: 東京都新宿区西新宿二丁目1番1号 新宿三井ビルディング34階  
    **会社名**: 株式会社豆蔵
- 3 new item(s)
- 2 raw response(s)
- 0 input guardrail result(s)
- 0 output guardrail result(s)
(See `RunResult` for more details)
```

カスタムツールとしてFunction callingが実行されている様子が確認できます。
また、コンテキスト情報としてログインユーザーの情報(MZ0001)もツール内で取得できていることもわかります。

:::info
この例では、Pythonの関数をそのままツールとして使いましたが、FunctionToolクラスを使うとより細かい制御ができます。
詳細は公式リファレンスを参照してください。

- [OpenAI Agents SDK - Docs - Custom function tools](https://openai.github.io/openai-agents-python/tools/#custom-function-tools)
- [OpenAI Agents SDK - API Reference - FunctionTool](https://openai.github.io/openai-agents-python/ref/tool/#agents.tool.FunctionTool)
:::
 
:::column:Agent as tools
ここでは割愛しましたが、もう1つのツールの使い方として、エージェント自体をツールとして使うという方法も紹介されています。

- [OpenAI Agents SDK - Docs - Tools - Agents as tools](https://openai.github.io/openai-agents-python/tools/#agents-as-tools)

エージェントワークフロー制御を次のエージェントに引き継ぐ(Handoff)のではなく、ツールとしてエージェントにタスクを実行させる形を取ります。
中央集権的なエージェントが、配下のエージェントを統括する使い方の場合はこちらの方が良さそうですね。
:::

## ガードレールで入力・出力をチェックする

Agents SDKには、エージェントの入力または出力をチェックする仕組みがビルトインで備わっています。
こちらを使ってみます。

まず、ガードレールを適用するエージェントとして、以下の旅行プラン立案エージェントを作成しました。

```python
import asyncio
from pydantic import BaseModel
from agents import Agent, Runner

class TripPlan(BaseModel):
    """エージェントの出力スキーマ"""
    departure_location: str
    destination: str
    days: int
    schedule: str
    budget: int

agent = Agent(
    name='trip planner',
    instructions='指定された出発地と行き先、日数から旅行プランを日本語で提案してください',
    output_type=TripPlan,
)


async def main():
    result = await Runner.run(agent, '出発地:東京\n行き先:沖縄\n日数:3')
    # final_output_asで出力スキーマにタイプキャスト
    print(result.final_output_as(TripPlan).model_dump_json(indent=2))

if __name__ == '__main__':
    asyncio.run(main())
```

今回はエージェントの出力スキーマを指定しています。この場合はoutput_typeに型を指定します。

こちらの実行結果は以下のようになります。

```
{
  "departure_location": "東京",
  "destination": "沖縄",
  "days": 3,
  "schedule": "\n\n1日目:\n- 出発: 午前中に羽田空港から沖縄那覇空港へ\n- 昼食: 空港近くの地元レストランでアグー豚を堪能\n- 那覇市内観光: 首里城や国際通りを散策\n- 夕食: 国際通り周辺の居酒屋で沖縄料理を楽しむ\n- ホテルチェックイン: 那覇市内\n\n2日目:\n- 朝食: ホテルでの朝食\n- 美ら海水族館: 沖縄の海洋生物を見学\n- 昼食: 水族館周辺のレストランで昼食\n- 古宇利島観光: 古宇利大橋やティーヌ浜（ハートロック）を訪問\n- 夕食: 地元の海鮮料理を味わう\n- ホテル: 名護市内\n\n3日目:\n- 朝食: ホテルでの朝食\n- 首里城: もう一度観光（希望があれば）\n- 昼食: 空港周辺で軽食\n- 帰路: 那覇空港から羽田空港へ",
  "budget": 80000
}
```

これに対してガードレールを適用します。

まずは入力に日数が指定されていることをチェックしてみます。この場合は入力ガードレールを指定します。

```python
@input_guardrail
def validate_trip_input(context: RunContextWrapper[None], agent: Agent, user_input: str):
    '''入力ガードレール'''
    days_match = re.search(r'日数[:：]\s*(\d+)', user_input)

    if not days_match:
        return GuardrailFunctionOutput(
            tripwire_triggered=True,
            output_info='日数をちゃんと指定してね！（例：日数:3）'
        )
    return GuardrailFunctionOutput(
        tripwire_triggered=False,
        output_info='OK'
    )

agent = Agent(
    name='trip planner',
    instructions='指定された出発地と行き先、日数から旅行プランを日本語で提案してください',
    output_type=TripPlan,
    # 入力ガードレール指定
    input_guardrails=[validate_trip_input]
```

入力ガードレールは@input_guradrailでデコレートしたPython関数です。
ガードレールは引数として実行コンテキスト、エージェント、ユーザー入力を受け取り、[GuardrailFunctionOutput](https://openai.github.io/openai-agents-python/ref/guardrail/#agents.guardrail.GuardrailFunctionOutput)を戻り値として返却します。
ここで、tripwire_triggeredにTrueを指定すると、Agents SDKはワークフロー内でエラーを発生させます。

後は作成した入力ガードレールをエージェントのinput_guardrailsに指定するだけです。

今回は以下のように実行して、意図的にガードレールでエラーを発生させます。

```python
async def main():
    try:
        result = await Runner.run(agent, '出発地:東京\n行き先:沖縄')
        print(result.final_output_as(TripPlan).model_dump_json(indent=2))
    except InputGuardrailTripwireTriggered as e:
        # 入力ガードレール違反
        print(e.guardrail_result.output)
```
意図的にガードレールに違反するように、入力から日数を除いています。
入力ガードレールに違反した場合は、[InputGuardrailTripwireTriggered](https://openai.github.io/openai-agents-python/ref/exceptions/#agents.exceptions.InputGuardrailTripwireTriggered)が発生します。

ここでの実行は以下のようになります(読みやすいように整形してます)。
```
GuardrailFunctionOutput(
  output_info='日数をちゃんと指定してね！（例：日数:3）', 
  tripwire_triggered=True
)
```

出力ガードレールについても、基本的な方法は同じです。ここでは立案した旅行プランの予算が10万を超える場合をチェックするようにします。

```python
# 前略(出力スキーマ、入力ガードレール)

@output_guardrail
def validate_trip_output(context: RunContextWrapper[None], agent: Agent, agent_output: TripPlan):
    '''出力ガードレール'''
    if agent_output.budget > 200000:
        return GuardrailFunctionOutput(
            tripwire_triggered=True,
            output_info=f'予算オーバーだよ！もう少し手頃なプランをお願い！ 予算:{agent_output.budget}'
        )
    return GuardrailFunctionOutput(
        tripwire_triggered=False,
        output_info='OK'
    )


agent = Agent(
    name='trip planner',
    instructions='指定された出発地と行き先、日数から旅行プランを日本語で提案してください',
    output_type=TripPlan,
    # 入力ガードレールと出力ガードレールを指定
    input_guardrails=[validate_trip_input],
    output_guardrails=[validate_trip_output]
)

async def main():
    try:
        # 出力ガードレール違反になるよう指定（予算オーバー）
        result = await Runner.run(agent, '出発地:東京\n行き先:ニューヨーク\n日数:14')
        print(result.final_output_as(TripPlan).model_dump_json(indent=2))
    except InputGuardrailTripwireTriggered as e:
        # 入力ガードレール違反
        print(e.guardrail_result.output)
    except OutputGuardrailTripwireTriggered as e:
        # 出力ガードレール違反
        print(e.guardrail_result.output)

if __name__ == '__main__':
    asyncio.run(main())
```

出力ガードレールの場合は@output_guardrailでデコレートした関数を用意します。
それ以外は入力ガードレールとほとんど同じですが、出力値に対するチェックなので、引数としてユーザー入力値でなく対象エージェントの出力結果を受け取ります。
後は、対象エージェントのoutput_guardrailsに出力ガードレール関数を指定すれば完成です。

出力ガードレールの違反時に発生するエラーは[OutputGuardrailTripwireTriggered](https://openai.github.io/openai-agents-python/ref/exceptions/#agents.exceptions.OutputGuardrailTripwireTriggered)です。ここでは、入力に加えてこのエラーも捕捉して出力するようにしています。

```
GuardrailFunctionOutput(
  output_info='予算オーバーだよ！もう少し手頃なプランをお願い！ 予算:300000', 
  tripwire_triggered=True
)
```

出力ガードレールのチェックが動作していることが分かります。

なお、複数エージェントに跨るワークフローの場合は、全てのエージェントのガードレールが実行される訳ではありません。
入力ガードレールは最初、出力ガードレールは最後のエージェントにのみ適用されます。

## マルチエージェントを使う(Handoff)

## トレーシング

## まとめ
