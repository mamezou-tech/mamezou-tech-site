---
title: OpenAIの File Search の結果を分析してチューニングする
author: noboru-kudo
date: 2024-09-14
tags: [RAG, OpenAI, "生成AI", GPT]
image: true
---

OpenAIの Assistants API では、ツールとして File Search(RAG) が利用できます[^1]。
これを使えば、ファイルをアップロードするだけでAIに独自のナレッジを追加できます。
自前でベクトルデータベースを用意したり、Embedding API を使ったベクトル化やベクトル検索の実装が不要になります。

[^1]: 利用可能な全てのツールは[公式ドキュメント](https://platform.openai.com/docs/assistants/tools)を参照してください。

この File Search 登場時は、中身はブラックボックスでチューニングもできませんでしたが、何度かアップデートされており状況が変わってきています。

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">We just rolled out enhanced controls for File Search in the Assistants API to help improve the relevance of your assistant&#39;s responses. You can now inspect the search results returned by the tool and configure their rankings. <a href="https://t.co/MW9ehuLYiC">https://t.co/MW9ehuLYiC</a></p>&mdash; OpenAI Developers (@OpenAIDevs) <a href="https://twitter.com/OpenAIDevs/status/1829259020437475771?ref_src=twsrc%5Etfw">August 29, 2024</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

ここでは、OpenAIの File Search の結果を分析して、実際にチューニングしてみたいと思います。

:::info
本記事で扱っている Assistants API の File Search 自体はこちらの記事で紹介しています。
興味があればご参照ください。

- [OpenAI Assistants API(v2)で新しくなったFile Search(Vector Stores)を使う](/blogs/2024/04/21/openai-file-search-intro/)
:::

## 事前準備

今回はOpenAI公式の[Pythonライブラリ](https://pypi.org/project/openai/)を使っていますが、[Node.jsライブラリ](https://www.npmjs.com/package/openai)でも同様のことができます。
事前にOpenAIの[APIキー](https://platform.openai.com/api-keys)を発行して、環境変数(`OPENAI_API_KEY`)に設定しておきます。

まず、Vector Store APIを使ってベクトルデータベースを作成します。

```python
import os

import openai
from openai.types.beta import *

client = openai.OpenAI()

store = client.beta.vector_stores.create(name='My Vector Store')
```

これでOpenAI内に空のベクトルデータベースを作成されます。
ここでは、本サイトで今年公開されたブログ記事(マークダウンファイル)をAIに与えるナレッジとして登録しておきます。

```python
article_dir = '/path/to/posts/blogs/2024'
files = [
    open(os.path.join(article_dir, file_name), 'rb')
    for file_name in os.listdir(article_dir)
    if file_name.endswith('.md')
]

client.beta.vector_stores.file_batches.upload_and_poll(store.id, files=files)
```

これでファイル(ブログ記事)はベクトル化されて登録されます。

:::column:チャンク設定を変更する
OpenAIはアップロードされたファイルをそのままベクトル化するのではなく、検索効率向上のために一定サイズのチャンクに分割しています。

この時に使用するチャンクサイズ(`max_chunk_size_tokens`)や文脈維持のためのオーバーラップサイズ(`chunk_overlap_tokens`)を指定できます。

- [OpenAI Doc - File Search - Customizing File Search settings](https://platform.openai.com/docs/assistants/tools/file-search/customizing-file-search-settings)

今回は未指定ですので、デフォルトの`auto`が使われます。現時点で`auto`は800トークンのチャンクサイズ、400トークンのオーバラップサイズが利用されています。
実際のチューニングの際は、検索ドキュメントの性質や検索目的によってここも考慮点になってきます。

以下はChatGPTで聞いた適切なチャンクサイズの勘所です。

> チャンクサイズを変更する際には、以下の点を考慮します：
> 
> 1. データの性質: データが長文である場合、チャンクサイズを大きくすると文脈が保たれ、関連性のある結果が得やすくなります。短いデータなら小さいチャンクで十分です。
> 2. 検索精度: 小さいチャンクは精度が高まることが多いですが、文脈が欠落する可能性があります。逆に、大きいチャンクは広い文脈を保持しますが、検索精度が低くなることがあります。
> 3. アプリケーションの目的: 例えば、要約や詳細な情報検索を目的とするなら、チャンクサイズやオーバーラップのバランスが重要です。

:::

## File Search を使ってチャットする

File Search の動きを見るために、チューニングをせずに使ってみます。

先ほど作成したベクトルデータベースをアシスタントに紐づけてAssistants APIのスレッドを実行します。

```python
# ベクトルデータベースを関連付けてアシスタント生成
assistant = client.beta.assistants.create(
    name='My Assistant',
    model='gpt-4o-mini',
    # File Searchツール有効化
    tools=[FileSearchToolParam(type='file_search')],
    # ベクトルデータベースを紐付け
    tool_resources=assistant_create_params.ToolResources(
        file_search=assistant_create_params.ToolResourcesFileSearch(vector_store_ids=[store.id])
    )
)

# スレッド&メッセージ生成
thread = client.beta.threads.create(messages=[
    thread_create_params.Message(role='user', content='生成AIの今後の動向を整理して')
])

# スレッド実行
run = client.beta.threads.runs.create_and_poll(
    assistant_id=assistant.id,
    temperature=0, # ここではレスポンスのランダム性は極力排除
    thread_id=thread.id,
    tool_choice=AssistantToolChoiceParam(type='file_search') # File Searchを強制
)

# メッセージ取得
messages = client.beta.threads.messages.list(run_id=run.id, thread_id=thread.id)
print(messages.data[0].content[0].text.value)
# 検索結果から引用した注釈も出力
for annotation in messages.data[0].content[0].text.annotations:
    print(annotation)
```

「生成AIの今後の動向を整理して」というどの記事にも完全にマッチしないような抽象的なプロンプトを敢えて入れています。
ここでは以下のレスポンスが出力されました。

```
生成AIの今後の動向について、以下のポイントを整理しました。
1. **技術の進化と多様化**:
   生成AIは急速に進化しており、特に自然言語処理や画像生成の分野での技術革新が目立ちます。新しいモデルやAPIの導入により、より高精度で多様な出力が可能になっています【6:10†source】。
2. **APIの改善と新機能の追加**:
   OpenAIなどの企業は、APIの機能を拡充しています。例えば、バッチ処理APIの導入により、複数のリクエストを一括で処理できるようになり、コスト削減や効率化が図られています【6:13†source】。
3. **ユーザー体験の向上**:
   ストリーミングレスポンス機能の追加により、ユーザーとのインタラクションがよりスムーズになり、リアルタイムでの対話が可能になっています。これにより、UXが大幅に改善される見込みです【6:10†source】。
4. **倫理的な課題と責任の所在**:
   生成AIの利用が進む中で、AIが生成したコンテンツに対する責任の所在が問われるようになっています。特に、AIが誤った情報を生成した場合のリスク管理が重要視されています【6:15†source】。
5. **教育やビジネスへの応用**:
   生成AIは教育やビジネスの現場でも活用が進んでおり、特にカスタマーサポートやコンテンツ生成においてその効果が期待されています。AIを活用することで、業務の効率化や新たな価値創造が可能になるでしょう【6:19†source】。
これらの動向は、生成AIが今後も多くの分野で重要な役割を果たすことを示唆しています。技術の進化に伴い、私たちの生活や仕事のスタイルも大きく変わる可能性があります。
FileCitationAnnotation(end_index=148, file_citation=FileCitation(file_id='file-9X3k81YMdpnWuXd4yMiKfbUQ'), start_index=135, text='【6:10†source】', type='file_citation')
FileCitationAnnotation(end_index=276, file_citation=FileCitation(file_id='file-7Ew9dsPpvzT2S9NwWciAmDGF'), start_index=263, text='【6:13†source】', type='file_citation')
FileCitationAnnotation(end_index=402, file_citation=FileCitation(file_id='file-9X3k81YMdpnWuXd4yMiKfbUQ'), start_index=389, text='【6:10†source】', type='file_citation')
FileCitationAnnotation(end_index=525, file_citation=FileCitation(file_id='file-5IT9waCExliwH8YJdwy6gGQX'), start_index=512, text='【6:15†source】', type='file_citation')
FileCitationAnnotation(end_index=662, file_citation=FileCitation(file_id='file-1TcwNreI2zJBMvSRz9L66LCY'), start_index=649, text='【6:19†source】', type='file_citation')
```

メッセージの正確性はともかく、メッセージに加えて5つの注釈(FileCitationAnnotation)が出力されています。
検索結果からいくつかのチャンク(記事の断片)がインプットされ、その中から5つがAIのメッセージ生成に使われていることが分かります。

## File Search の結果を分析する

先ほどの File Search がどのような結果だったのかを確認します。
これはスレッド実行結果の Run Step から取得できます。

```python
# Run Stepを取得
run_steps = client.beta.threads.runs.steps.list(
    thread_id=thread.id,
    run_id=run.id
)

# 最後のRun StepからFile Searchの実行結果を含めて取得する
run_step = client.beta.threads.runs.steps.retrieve(
    thread_id=thread.id,
    run_id=run.id,
    step_id=run_steps.data[-1].id,
    include=["step_details.tool_calls[*].file_search.results[*].content"]
)
for result in run_step.step_details.tool_calls[0].file_search.results:
    print(f""">>>>>>>>>>>>>>>>>>>>
score: {result.score}
fileId: {result.file_id}
fileName: {result.file_name}
content: {result.content[0].text}
<<<<<<<<<<<<<<<<<<<<
""")
```

File Search の実行結果を取得する場合は、`include`に`client.beta.threads.runs.steps.retrieve`を含める必要があります。
ここでは以下のように出力されました(長くなるのでチャンクの中身(`content`)を省略してます)。

```
>>>>>>>>>>>>>>>>>>>>
score: 0.5351579011234938
fileId: file-u6PgVlpEXfumdBJegxCtzpxB
fileName: 0805_cognitive-load.md
content: (省略)
<<<<<<<<<<<<<<<<<<<<
>>>>>>>>>>>>>>>>>>>>
score: 0.5235138881719105
fileId: file-Yh5ncCFz3snOSNqIwp3LY0iU
fileName: 0710_anomalydetection.md
content: (省略)
<<<<<<<<<<<<<<<<<<<<
>>>>>>>>>>>>>>>>>>>>
score: 0.506333274348135
fileId: file-usaTetP7SPLZpGHUD9ah1CLD
fileName: 0810_openai-structured-output-intro.md
content: (省略)
<<<<<<<<<<<<<<<<<<<<
>>>>>>>>>>>>>>>>>>>>
score: 0.504122831527741
fileId: file-SEkjJF1AMf0rq9qeWSXuajQR
fileName: 0701_2024-1q-retrospective.md
content: (省略)
<<<<<<<<<<<<<<<<<<<<
(中略)
>>>>>>>>>>>>>>>>>>>>
score: 0.4211797142828447
fileId: file-mivxRrMUe9OJbAOUJTpWZ9kW
fileName: 0809_rpi5-indivisual-recognintion.md
content: (省略)
<<<<<<<<<<<<<<<<<<<<
>>>>>>>>>>>>>>>>>>>>
score: 0.4181294275626974
fileId: file-Yh5ncCFz3snOSNqIwp3LY0iU
fileName: 0710_anomalydetection.md
content: (省略)
<<<<<<<<<<<<<<<<<<<<
```

モデルにインプットされた File Search の結果(チャンク)が、スコア(0-1の値)の高い順に20件表示されています。
どれにも完全マッチしないようなプロンプトを入力したので、0.5前後の微妙なスコアが並んでいます。
この結果がAIモデルに投入されたことになります。

いくつか試してみた感じだと、スコアの高いものが優先的にモデルで使われているようです[^2]。

[^2]: 同じプロンプトや閾値でもスコアや順位に多少の変動があるようでした。

## File Search のパラメータを調整する

現時点ではモデルにインプットするスコアの閾値と最大件数、ランキングアルゴリズム(ranker)を指定できます。

試しにスコアの閾値と件数を変えてみます。
File Search のパラメータ調整はスレッドを実行する際に指定します。

```python
run = client.beta.threads.runs.create_and_poll(
    assistant_id=assistant.id,
    temperature=0,
    thread_id=thread.id,
    tools=[FileSearchToolParam(
        type='file_search',
        file_search=file_search_tool_param.FileSearch(
            max_num_results=3,
            ranking_options=file_search_tool_param.FileSearchRankingOptions(
                score_threshold=0.5,
                ranker='auto'  # 現時点では auto または default_2024_08_21
            )
        ))],
    tool_choice=AssistantToolChoiceParam(type='file_search')
)
```
`tools.file_search`で File Search の以下のパラメータを設定しています。

- `max_num_results`: モデルにインプットする検索結果件数(`gpt-4*`のデフォルトは20)
- `ranking_options.score_threshold`: 足切りするスコア閾値(デフォルト0。つまり足切りしない)

ここでは、低スコアの検索結果をAIのレスポンス生成に使われないように、`max_num_results`を3件、`ranking_options.score_threshold`を0.5にしています。

もう1つのチューニングポイントの`ranking_options.ranker`は、現時点では`auto`または`default_2024_08_21`のみです。
両方設定して比較してみましたが大きな違いはありませんでした。`auto`はOpenAIがどのrankerを使うのかを選択する指定で、現在は`default_2024_08_21`を選択しているようです。
今後もっとバリエーションが増えて選択肢が広がることを期待したいですね。

以上の設定を変更して再実行したところ、以下のようなレスポンスに変わりました。

```
生成AIの今後の動向について、以下のポイントが挙げられます。
1. **技術の進化と多様化**:
   生成AIは急速に進化しており、異常検知や物体検出、セグメンテーションなど、さまざまなタスクに活用されています。特に、異常検知においては、正常データのみを使用して学習するモデルが注目されています【4:2†source】。
2. **認知負荷の増大**:
   生成AIの進化に伴い、開発チームの認知負荷が増大しています。これにより、新しい職能の枠が誕生し、分業の形態が変化しています。アジャイル開発の中で、ストリームアラインドチームが重要な役割を果たすと考えられています【4:1†source】。
3. **新しいアプローチの必要性**:
   生成AIの進化により、従来の開発プロセスやチーム構成の見直しが求められています。特に、ハンドオフを最小化し、チーム間のコミュニケーションを強化することが重要です【4:1†source】。
これらの動向は、生成AIが今後の技術革新やビジネスモデルに大きな影響を与えることを示唆しています。
FileCitationAnnotation(end_index=161, file_citation=FileCitation(file_id='file-Yh5ncCFz3snOSNqIwp3LY0iU'), start_index=149, text='【4:2†source】', type='file_citation')
FileCitationAnnotation(end_index=300, file_citation=FileCitation(file_id='file-u6PgVlpEXfumdBJegxCtzpxB'), start_index=288, text='【4:1†source】', type='file_citation')
FileCitationAnnotation(end_index=419, file_citation=FileCitation(file_id='file-u6PgVlpEXfumdBJegxCtzpxB'), start_index=407, text='【4:1†source】', type='file_citation')
```

先ほどよりもシンプルなレスポンスになりました。
次に、File Search の実行結果がどう変わったのか確認してみます。

```
>>>>>>>>>>>>>>>>>>>>
score: 0.5405211726424688
fileId: file-ZeeCpkOhO3zKJ4jgo58m6DcC
fileName: 0821_boid_life_simulation.md
content: (省略)
<<<<<<<<<<<<<<<<<<<<
>>>>>>>>>>>>>>>>>>>>
score: 0.5351579011234938
fileId: file-u6PgVlpEXfumdBJegxCtzpxB
fileName: 0805_cognitive-load.md
content: (省略)
<<<<<<<<<<<<<<<<<<<<
>>>>>>>>>>>>>>>>>>>>
score: 0.5235138881719105
fileId: file-Yh5ncCFz3snOSNqIwp3LY0iU
fileName: 0710_anomalydetection.md
content: (省略)
<<<<<<<<<<<<<<<<<<<<
```

チューニングした通り、スコアが0.5以上の検索結果3件に絞られてAIモデルにインプットされているのが分かります[^3]。

[^3]: なぜスコア1位の記事の内容がレスポンスに使われなかったのかは謎です

正直、この結果を見ただけで検索精度が向上したのかはよく分かりませんが、入力ファイルの質・量の改善と合わせて試行を繰り返してみるとちょうどいいところが見つかるかもしれませんね。

## まとめ

今までブラックボックスだったAssistants APIの File Search の結果の状況が把握でき、いくつかのチューニングポイントが提供されるようになりました。
File Search導入時に加えて定期的なモニタリングをしていく中で、適宜チューニングをしていくことが大事なのかなと思います。
