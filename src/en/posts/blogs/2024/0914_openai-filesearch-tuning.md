---
title: Analyzing and Tuning the Results of OpenAI's File Search
author: noboru-kudo
date: 2024-09-14T00:00:00.000Z
tags:
  - RAG
  - OpenAI
  - 生成AI
image: true
translate: true

---

In OpenAI's Assistants API, the File Search (RAG) tool can be used[^1]. By using this, you can add your own knowledge to the AI just by uploading files. This eliminates the need to prepare your own vector database or implement vectorization and vector search using the Embedding API.

[^1]: For all available tools, refer to the [official documentation](https://platform.openai.com/docs/assistants/tools).

When File Search was first introduced, it was a black box and could not be tuned, but it has been updated several times, and the situation is changing.

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">We just rolled out enhanced controls for File Search in the Assistants API to help improve the relevance of your assistant&#39;s responses. You can now inspect the search results returned by the tool and configure their rankings. <a href="https://t.co/MW9ehuLYiC">https://t.co/MW9ehuLYiC</a></p>&mdash; OpenAI Developers (@OpenAIDevs) <a href="https://twitter.com/OpenAIDevs/status/1829259020437475771?ref_src=twsrc%5Etfw">August 29, 2024</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

Here, I would like to analyze the results of OpenAI's File Search and actually try tuning it.

:::info

The Assistants API's File Search discussed in this article is introduced in this article. Please refer to it if you are interested.

- [Using the New File Search (Vector Stores) in OpenAI Assistants API(v2)](/blogs/2024/04/21/openai-file-search-intro/)

:::

## Preparations

This time, I am using OpenAI's [Python library](https://pypi.org/project/openai), but the same can be done with the [Node.js library](https://www.npmjs.com/package/openai). First, issue an OpenAI [API key](https://platform.openai.com/api-keys) and set it in the environment variable (`OPENAI_API_KEY`).

First, create a vector database using the Vector Store API.

```python
import os

import openai
from openai.types.beta import *

client = openai.OpenAI()

store = client.beta.vector_stores.create(name='My Vector Store')
```

This creates an empty vector database within OpenAI. Here, I will register blog articles (markdown files) published on this site this year as knowledge for the AI.

```python
article_dir = '/path/to/posts/blogs/2024'
files = [
    open(os.path.join(article_dir, file_name), 'rb')
    for file_name in os.listdir(article_dir)
    if file_name.endswith('.md')
]

client.beta.vector_stores.file_batches.upload_and_poll(store.id, files=files)
```

This will vectorize and register the files (blog articles).

:::column:Changing Chunk Settings

OpenAI does not vectorize uploaded files as they are but divides them into chunks of a certain size to improve search efficiency.

You can specify the chunk size (`max_chunk_size_tokens`) and overlap size (`chunk_overlap_tokens`) used to maintain context.

- [OpenAI Doc - File Search - Customizing File Search settings](https://platform.openai.com/docs/assistants/tools/file-search/customizing-file-search-settings)

Since nothing is specified this time, the default `auto` is used. Currently, `auto` uses a chunk size of 800 tokens and an overlap size of 400 tokens. When actually tuning, this can also be a consideration depending on the nature of the search documents and the search purpose.

Here are some insights from ChatGPT on appropriate chunk sizes.

> When changing the chunk size, consider the following points:
>
> 1. Nature of the data: If the data is long, a larger chunk size will maintain context and make it easier to obtain relevant results. For short data, small chunks are sufficient.
> 2. Search accuracy: Smaller chunks often increase accuracy but may lack context. Conversely, larger chunks retain broader context but may reduce search accuracy.
> 3. Purpose of the application: For example, if the goal is summarization or detailed information retrieval, the balance of chunk size and overlap is important.

:::

## Chatting Using File Search

To see how File Search works, let's try using it without tuning.

Link the vector database created earlier to the assistant and execute the Assistants API thread.

```python
# Create assistant linked to vector database
assistant = client.beta.assistants.create(
    name='My Assistant',
    model='gpt-4o-mini',
    # Enable File Search tool
    tools=[FileSearchToolParam(type='file_search')],
    # Link vector database
    tool_resources=assistant_create_params.ToolResources(
        file_search=assistant_create_params.ToolResourcesFileSearch(vector_store_ids=[store.id])
    )
)

# Create thread & message
thread = client.beta.threads.create(messages=[
    thread_create_params.Message(role='user', content='Organize the future trends of generative AI')
])

# Execute thread
run = client.beta.threads.runs.create_and_poll(
    assistant_id=assistant.id,
    temperature=0, # Minimize response randomness here
    thread_id=thread.id,
    tool_choice=AssistantToolChoiceParam(type='file_search') # Force File Search
)

# Retrieve message
messages = client.beta.threads.messages.list(run_id=run.id, thread_id=thread.id)
print(messages.data[0].content[0].text.value)
# Output annotations quoted from search results
for annotation in messages.data[0].content[0].text.annotations:
    print(annotation)
```

I deliberately input an abstract prompt like "Organize the future trends of generative AI" that doesn't completely match any article. The following response was output here.

```
Regarding the future trends of generative AI, the following points have been organized.
1. **Technological evolution and diversification**:
   Generative AI is rapidly evolving, with technological innovations particularly noticeable in the fields of natural language processing and image generation. The introduction of new models and APIs enables more accurate and diverse outputs【6:10†source】.
2. **API improvements and new feature additions**:
   Companies like OpenAI are expanding API features. For example, the introduction of batch processing APIs allows multiple requests to be processed at once, achieving cost reduction and efficiency【6:13†source】.
3. **Improvement of user experience**:
   The addition of streaming response functions makes interaction with users smoother, enabling real-time dialogue. This is expected to significantly improve UX【6:10†source】.
4. **Ethical issues and responsibility**:
   As the use of generative AI progresses, the responsibility for AI-generated content is being questioned. In particular, risk management is emphasized when AI generates incorrect information【6:15†source】.
5. **Applications in education and business**:
   Generative AI is also being utilized in education and business, especially in customer support and content generation, where its effects are expected. By leveraging AI, it will be possible to improve operational efficiency and create new value【6:19†source】.
These trends suggest that generative AI will continue to play an important role in many fields. As technology evolves, our lifestyles and work styles may change significantly.
FileCitationAnnotation(end_index=148, file_citation=FileCitation(file_id='file-9X3k81YMdpnWuXd4yMiKfbUQ'), start_index=135, text='【6:10†source】', type='file_citation')
FileCitationAnnotation(end_index=276, file_citation=FileCitation(file_id='file-7Ew9dsPpvzT2S9NwWciAmDGF'), start_index=263, text='【6:13†source】', type='file_citation')
FileCitationAnnotation(end_index=402, file_citation=FileCitation(file_id='file-9X3k81YMdpnWuXd4yMiKfbUQ'), start_index=389, text='【6:10†source】', type='file_citation')
FileCitationAnnotation(end_index=525, file_citation=FileCitation(file_id='file-5IT9waCExliwH8YJdwy6gGQX'), start_index=512, text='【6:15†source】', type='file_citation')
FileCitationAnnotation(end_index=662, file_citation=FileCitation(file_id='file-1TcwNreI2zJBMvSRz9L66LCY'), start_index=649, text='【6:19†source】', type='file_citation')
```

Regardless of the accuracy of the message, five annotations (FileCitationAnnotation) have been output in addition to the message. It can be seen that several chunks (fragments of articles) from the search results were input, and five of them were used to generate the AI message.

## Analyzing the Results of File Search

Let's check what the results of the previous File Search were. This can be obtained from the Run Step of the thread execution result.

```python
# Retrieve Run Step
run_steps = client.beta.threads.runs.steps.list(
    thread_id=thread.id,
    run_id=run.id
)

# Retrieve the last Run Step including the results of File Search
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

To obtain the results of File Search execution, you need to include `client.beta.threads.runs.steps.retrieve` in `include`. The following was output here (omitting the content of the chunk as it is long).

```
>>>>>>>>>>>>>>>>>>>>
score: 0.5351579011234938
fileId: file-u6PgVlpEXfumdBJegxCtzpxB
fileName: 0805_cognitive-load.md
content: (omitted)
<<<<<<<<<<<<<<<<<<<<
>>>>>>>>>>>>>>>>>>>>
score: 0.5235138881719105
fileId: file-Yh5ncCFz3snOSNqIwp3LY0iU
fileName: 0710_anomalydetection.md
content: (omitted)
<<<<<<<<<<<<<<<<<<<<
>>>>>>>>>>>>>>>>>>>>
score: 0.506333274348135
fileId: file-usaTetP7SPLZpGHUD9ah1CLD
fileName: 0810_openai-structured-output-intro.md
content: (omitted)
<<<<<<<<<<<<<<<<<<<<
>>>>>>>>>>>>>>>>>>>>
score: 0.504122831527741
fileId: file-SEkjJF1AMf0rq9qeWSXuajQR
fileName: 0701_2024-1q-retrospective.md
content: (omitted)
<<<<<<<<<<<<<<<<<<<<
(omitted)
>>>>>>>>>>>>>>>>>>>>
score: 0.4211797142828447
fileId: file-mivxRrMUe9OJbAOUJTpWZ9kW
fileName: 0809_rpi5-indivisual-recognintion.md
content: (omitted)
<<<<<<<<<<<<<<<<<<<<
>>>>>>>>>>>>>>>>>>>>
score: 0.4181294275626974
fileId: file-Yh5ncCFz3snOSNqIwp3LY0iU
fileName: 0710_anomalydetection.md
content: (omitted)
<<<<<<<<<<<<<<<<<<<<
```

The results (chunks) of File Search input to the model are displayed in order of high scores (values between 0-1), with 20 items shown. Since I input a prompt that doesn't completely match any of them, there are subtle scores around 0.5. These results were input into the AI model.

From what I tried a few times, it seems that those with higher scores are preferentially used in the model[^2].

[^2]: There seemed to be some fluctuations in scores and rankings even with the same prompt and threshold.

## Adjusting File Search Parameters

Currently, you can specify the score threshold, maximum number of results, and ranking algorithm (ranker) to input into the model.

Let's try changing the score threshold and number of items. File Search parameters are specified when executing the thread.

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
                ranker='auto'  # Currently, auto or default_2024_08_21
            )
        ))],
    tool_choice=AssistantToolChoiceParam(type='file_search')
)
```

In `tools.file_search`, the following parameters of File Search are set.

- `max_num_results`: Number of search results input into the model (default for `gpt-4*` is 20)
- `ranking_options.score_threshold`: Score threshold for cutoff (default is 0, meaning no cutoff)

Here, to prevent low-score search results from being used in AI response generation, `max_num_results` is set to 3 and `ranking_options.score_threshold` to 0.5.

The other tuning point, `ranking_options.ranker`, is currently only `auto` or `default_2024_08_21`. I compared both settings, but there was no significant difference. `auto` is a specification where OpenAI selects which ranker to use, and currently, it seems to be selecting `default_2024_08_21`. I hope that more variations will be added in the future, expanding the options.

After changing these settings and re-executing, the response changed as follows.

```
Regarding the future trends of generative AI, the following points can be raised.
1. **Technological evolution and diversification**:
   Generative AI is rapidly evolving and is being utilized for various tasks such as anomaly detection, object detection, and segmentation. In particular, models that learn using only normal data are attracting attention in anomaly detection【4:2†source】.
2. **Increase in cognitive load**:
   As generative AI evolves, the cognitive load on development teams is increasing. This has led to the emergence of new professional frameworks and changes in the form of division of labor. Stream-aligned teams are expected to play an important role in agile development【4:1†source】.
3. **Need for new approaches**:
   The evolution of generative AI requires a review of traditional development processes and team structures. In particular, minimizing handoffs and strengthening communication between teams is important【4:1†source】.
These trends suggest that generative AI will have a significant impact on future technological innovation and business models.
FileCitationAnnotation(end_index=161, file_citation=FileCitation(file_id='file-Yh5ncCFz3snOSNqIwp3LY0iU'), start_index=149, text='【4:2†source】', type='file_citation')
FileCitationAnnotation(end_index=300, file_citation=FileCitation(file_id='file-u6PgVlpEXfumdBJegxCtzpxB'), start_index=288, text='【4:1†source】', type='file_citation')
FileCitationAnnotation(end_index=419, file_citation=FileCitation(file_id='file-u6PgVlpEXfumdBJegxCtzpxB'), start_index=407, text='【4:1†source】', type='file_citation')
```

The response has become simpler than before. Next, let's check how the results of File Search have changed.

```
>>>>>>>>>>>>>>>>>>>>
score: 0.5405211726424688
fileId: file-ZeeCpkOhO3zKJ4jgo58m6DcC
fileName: 0821_boid_life_simulation.md
content: (omitted)
<<<<<<<<<<<<<<<<<<<<
>>>>>>>>>>>>>>>>>>>>
score: 0.5351579011234938
fileId: file-u6PgVlpEXfumdBJegxCtzpxB
fileName: 0805_cognitive-load.md
content: (omitted)
<<<<<<<<<<<<<<<<<<<<
>>>>>>>>>>>>>>>>>>>>
score: 0.5235138881719105
fileId: file-Yh5ncCFz3snOSNqIwp3LY0iU
fileName: 0710_anomalydetection.md
content: (omitted)
<<<<<<<<<<<<<<<<<<<<
```

As tuned, it is narrowed down to three search results with a score of 0.5 or higher, which are input into the AI model[^3].

[^3]: It's a mystery why the content of the top-scoring article was not used in the response.

Honestly, just looking at this result, it's hard to tell if the search accuracy has improved, but by repeating trials along with improving the quality and quantity of input files, you may find a sweet spot.

## Summary

It has become possible to understand the status of the previously black-boxed results of the Assistants API's File Search, and several tuning points are now provided. I think it is important to perform appropriate tuning while conducting regular monitoring in addition to when introducing File Search.
