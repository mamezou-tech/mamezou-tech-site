---
title: 'Online Search × AI: Overview and Basic Usage of Perplexity''s New API Sonar'
author: noboru-kudo
date: 2025-01-22T00:00:00.000Z
tags:
  - Sonar
  - Perplexity
  - 生成AI
  - LLM
  - Python
image: true
translate: true

---

Perplexity, known as an online search AI service, made the following announcement on January 21, 2025.

<blockquote class="twitter-tweet" data-media-max-width="560"><p lang="en" dir="ltr">Introducing Sonar: Perplexity’s API.<br><br>Sonar is the most affordable search API product on the market. Use it to build generative search, powered by real-time information and citations, into your apps. We’re also offering a Pro version with deeper functionality. <a href="https://t.co/CWpVUUKYtW">pic.twitter.com/CWpVUUKYtW</a></p>&mdash; Perplexity (@perplexity_ai) <a href="https://twitter.com/perplexity_ai/status/1881779310840984043?ref_src=twsrc%5Etfw">January 21, 2025</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

Perplexity's previous API was in beta, but with the introduction of the new Sonar model, it seems to have become a formal service.

In this article, I will briefly introduce how to use Sonar.

## Setup

First, create a [Perplexity account](https://perplexity.ai/).

Then, follow the steps below to issue an API key for Sonar.

- [Sonar Guide - Initial Setup](https://docs.perplexity.ai/guides/getting-started)

If you have the paid version (Pro) of Perplexity, you will receive a $5 credit each month, so you can use it for free if you're just testing lightly.

## Available Models and Billing in Sonar

There are currently only two models available in Sonar: "sonar" and "sonar-pro".
Both are specialized for online search and are designed to retrieve search results smoothly.

:::info
Since the publication of this article, many models—including those based on DeepSeek R1—have been added.  
Furthermore, the pricing structure has been changed to a billing system that corresponds to the high/medium/low search modes.

- [Perplexity Blog - Improved Sonar Models: Industry Leading Performance at Lower Costs](https://www.perplexity.ai/ja/hub/blog/new-sonar-search-modes-outperform-openai-in-cost-and-performance)

For the latest information, please check the official documentation.

@[og](https://x.com/perplexity_ai/status/1884409454675759211)
:::

As you might guess from the name, "sonar-pro" has higher accuracy.
The official documentation doesn't provide much detail, but it supports multi-step searches, a larger number of cited URLs, and a larger context window size (imagine Perplexity's Pro search features, and it becomes clearer).

The following is an excerpt about "sonar-pro" from the [Perplexity blog](https://www.perplexity.ai/ja/hub/blog/introducing-the-sonar-pro-api).

> For enterprises seeking more advanced capabilities, the Sonar Pro API can handle in-depth, multi-step queries with added extensibility, like double the number of citations per search as Sonar on average. Plus, with a larger context window, it can handle longer and more nuanced searches and follow-up questions.

You can check the billing details below.

- [Sonar Guide - Pricing](https://docs.perplexity.ai/guides/pricing)

Unlike other generative AI services, there is a billing mechanism where charges are incurred not only based on the number of tokens but also the number of searches.
In particular, "sonar-pro" may execute two or more searches in a single API call because it performs multi-step searches.
Also, the token billing itself is set significantly higher than "sonar", so depending on usage, costs may increase rapidly, which requires caution.

## Executing Sonar's Chat Completion API

In fact, Sonar currently only has a Chat Completion API.

- [Sonar Reference - Chat Completions](https://docs.perplexity.ai/api-reference/chat-completions)

Using the above reference, I wrote the following sample code.

```python
import json
import os
import requests

url = "https://api.perplexity.ai/chat/completions"  # Sonar endpoint
api_key = os.getenv("PPLX_API_KEY")  # Generated API key

payload = {
    "model": "sonar",  # Model
    "messages": [
        {
            "role": "system",
            "content": (
                "You are a versatile assistant."
                "Please speak in an energetic and casual tone."
            ),
        }, {
            "role": "user",
            "content": (
                "Tell me the details about the StarGate Project that was announced yesterday."
                "What will change because of this project?"
            ),
        }
    ],
    "temperature": 0.2,
    "top_p": 0.9,
    "return_images": False,  # Available from Tier 2
    "return_related_questions": False,  # Available from Tier 2
    "search_recency_filter": "month", 
    "top_k": 0,
    "stream": False,
    "presence_penalty": 0,
    "frequency_penalty": 1,
    "response_format": None,  # Available from Tier 3
    "search_domain_filter": None,  # Available from Tier 3
}
headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

response = requests.request("POST", url, json=payload, headers=headers)

body = json.loads(response.text)

print(body["choices"][0]["message"]["content"])
# URLs cited from 'citations' can be retrieved
for idx, citation in enumerate(body["citations"]):
    print(f"[{idx + 1}]: {citation}")

print(body["usage"])
```

What we need to note here is that the availability of some beta features depends on your account's tier.
For details, please refer to the Beta Features section of the following official documentation.

- [Sonar Guide - Rate Limits and Usage Tiers](https://docs.perplexity.ai/guides/usage-tiers)

Here, I tried querying about a current topic. The following response was returned.

```
Let me tell you the details about the **Stargate Project** that was announced yesterday!

## Overview of the Stargate Project
- **Investment Amount**: Plans to invest $500 billion (approximately 78 trillion yen) over four years [1][3][5].
- **Purpose**: A project to build AI-specialized data centers in the U.S. and strengthen AI infrastructure [1][3].
- **Initial Investment**: Will immediately start with an initial investment of $100 billion (approximately 15 trillion yen) [3][5].
- **Data Centers**: Plans to build 10 data centers starting from Abilene, Texas, eventually expanding to 20 [1].

## Participating Companies
- **Lead Partners**: SoftBank Group and OpenAI will be central, responsible for financial management and operations [3][5].
- **Initial Investors**: Oracle and MGX are also participating [5].
- **Technology Partners**: Arm, Microsoft, NVIDIA, and Oracle are cooperating on the technical side [1][3].

## Impact of the Project
- **Job Creation**: Will create hundreds of thousands of jobs and support the revitalization of U.S. industries [5].
- **National Security**: Provides a foundation to strengthen national security for the U.S. and its allies [3][5].
- **Environmental Impact**: Attention is being paid to environmental load measures and economic effects on regions [1].

This project is expected to accelerate the evolution of AI technology and have a significant impact on U.S. industries and national security!
[1]: https://innovatopia.jp/ai/ai-news/46953/
[2]: https://ja.wikipedia.org/wiki/Fate/Grand_Order
[3]: https://enterprisezine.jp/news/detail/21270
[4]: https://b.hatena.ne.jp/entrylist/it/%E3%83%97%E3%83%AD%E3%82%B0%E3%83%A9%E3%83%9F%E3%83%B3%E3%82%B0
[5]: https://japan.cnet.com/article/35228516/
{'prompt_tokens': 51, 'completion_tokens': 407, 'total_tokens': 458}
```

You can see that it picks up the latest information from search results and summarizes it.

When switched to "sonar-pro" with the same content, a more in-depth response was returned (somewhat formatted).

```
Yes, of course! I'd like to share the super exciting details about the Stargate Project that was announced yesterday!

First of all, the scale of this project is incredible! Centered around OpenAI and SoftBank Group, they will invest a massive $500 billion (approximately 77 trillion yen) over four years [1][2].
This is likely to be one of the largest investments in AI industry history!

The main goal is to build ultra-large AI-specialized data centers within the U.S.
They will start from Abilene, Texas, and construct AI infrastructure across the country [1].
They plan to start with 10 data centers and eventually expand to 20. Amazing, right?

Major companies are lining up to participate in this project.
OpenAI, SoftBank G, Oracle, and MGX are initial investors, and Arm, Microsoft, NVIDIA, and Oracle are participating as technology partners [2][4].
It feels like the giants of the industry are coming together!

So, what will change with this project? You can expect some really big changes!

1. Explosive advancement of AI technology: With infrastructure of this scale, AI research and development should accelerate rapidly.
2. Job creation: Tens of thousands of new jobs will be created [2]. That's an incredible economic impact.
3. Strengthening U.S. dominance in AI: This project seems to be an important move to establish U.S. leadership in the AI field [10].
4. Contribution to national security: It seems to play a role in strengthening security, including allied nations [2].
5. Revitalization of industries: There is a high possibility that various industries will be revitalized around AI [10].

Honestly, I think the impact of this project is immeasurably large.
It feels like the future of AI will make a big move from here! I can't stop being excited!

[1]: https://innovatopia.jp/ai/ai-news/46953/
[2]: https://japan.cnet.com/article/35228516/
[3]: https://ja.wikipedia.org/wiki/Fate/Grand_Order
[4]: https://enterprisezine.jp/news/detail/21270
[5]: https://www.itmedia.co.jp/enterprise/articles/2501/22/news129.html
[6]: https://b.hatena.ne.jp/entrylist/it/%E3%83%97%E3%83%AD%E3%82%B0%E3%83%A9%E3%83%9F%E3%83%B3%E3%82%B0
[7]: https://japan.cnet.com/article/35228516/
[8]: https://coinpost.jp/?p=589229
[9]: https://finance.yahoo.co.jp/quote/ARM/bbs
[10]: https://group.softbank/news/press/20250122

{'prompt_tokens': 51, 'completion_tokens': 693, 'total_tokens': 744, 
'citation_tokens': 5446, 'num_search_queries': 2}
```

While "sonar" seems to simply summarize search results, "sonar-pro" appears to utilize more search results and perform deeper reasoning.
Looking at the usage, we see `'num_search_queries': 2`, which is interesting because it confirms that multiple searches were conducted in a single API call (this item was not present when using "sonar").

Finally, for reference, when I input the same prompt into GPT-4o of the OpenAI API, the following response was returned.

```
Oh, that sounds super exciting! But sorry, I haven't heard of the "StarGate Project".
Perhaps it's a new project that is not included in my data up to October 2023? If so, it might be good to check the latest information from the internet or official announcements.

It might be interesting to gather the voices of people involved or those interested to find out what the project is about, what kind of changes it will bring to which fields! If you find out the details, please let me know.
I want to be excited together!
```

As expected, or rather naturally. I'm glad it honestly said it didn't know 😅

:::column:Using OpenAI API's Official Library
For basic usage, Sonar can use the OpenAI official library as is.

The sample code above can be rewritten as follows.

```python
from openai import OpenAI
import os

url = "https://api.perplexity.ai"  # Sonar endpoint
api_key = os.getenv("PPLX_API_KEY")  # Generated API key

client = OpenAI(api_key=api_key, base_url=url)

response = client.chat.completions.create(
    model="sonar",
    messages=[
        {
            "role": "system",
            "content": (
                "You are a versatile assistant."
                "Please speak in an energetic and casual tone."
            ),
        }, {
            "role": "user",
            "content": (
                "Tell me the details about the StarGate Project that was announced yesterday."
                "What will change because of this project?"
            ),
        }
    ],    
    temperature=0.2,
    top_p=0.9,
    presence_penalty=0,
    frequency_penalty=1,
)

print(response.choices[0].message.content)
for idx, citation in enumerate(response.citations):
    print(f"[{idx + 1}]: {citation}")
    
print(response.usage)
```
However, not all OpenAI API features can be used with Sonar.
Also, conversely, note that Perplexity's unique parameters cannot be used with the OpenAI official library.
:::

## Conclusion

So far, I have briefly introduced Perplexity API's Sonar.
Currently, there is only one API available, and no official library exists, but I hope it will become more robust with future updates.

When performing online searches with the OpenAI API, you need to combine external services like Serp API, but Sonar's strength is that it has search functionality built-in from the start.
Even from the impression of using Perplexity's regular (non-API) chat function, I feel that the search engine is quite excellent.

Depending on how it's used, there may be quite a few situations where Sonar can be effective.
I look forward to its future development.
