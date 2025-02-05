---
title: 在线搜索×AI：Perplexity新API Sonar的概要及基本用法
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

作为在线搜索型AI服务而闻名的Perplexity，于2025年1月21日发布了以下内容。

<blockquote class="twitter-tweet" data-media-max-width="560"><p lang="en" dir="ltr">Introducing Sonar: Perplexity’s API.<br><br>Sonar is the most affordable search API product on the market. Use it to build generative search, powered by real-time information and citations, into your apps. We’re also offering a Pro version with deeper functionality. <a href="https://t.co/CWpVUUKYtW">pic.twitter.com/CWpVUUKYtW</a></p>&mdash; Perplexity (@perplexity_ai) <a href="https://twitter.com/perplexity_ai/status/1881779310840984043?ref_src=twsrc%5Etfw">January 21, 2025</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

Perplexity的传统API一直处于测试版状态，而此次随着新Sonar模型的引入，正式成为服务的一部分。

本文将简单介绍Sonar的使用方法。

## 设置

首先创建[Perplexity账户](https://perplexity.ai/)。

然后按照以下步骤生成Sonar的API密钥。

- [Sonar Guide - Initial Setup](https://docs.perplexity.ai/guides/getting-started)

如果订阅了Perplexity的付费版(Pro)，每月会赠送5美元的额度，轻度测试使用是免费的。

## Sonar可用模型及收费说明

目前Sonar可用的模型只有两种：“sonar”和“sonar-pro”。  
它们都专注于在线搜索，并设计成能够顺畅地获得搜索结果。

:::info
2025年1月29日新增了“sonar-reasoning”模型。  
该模型是基于热门的DeepSeek Reasoning模型的在线搜索（单次搜索）模型。  
根据Perplexity的官方声明，这一模型部署于美国的数据中心，因此未受到审查的影响。

感兴趣的话不妨试试。

@[og](https://x.com/perplexity_ai/status/1884409454675759211)
:::

正如名字所暗示，“sonar-pro”的精确度更高。  
虽然官方文档中没有详细说明，但它支持多步搜索、引用的URL数量更多以及上下文窗口更大（与Perplexity的Pro搜索功能类似，会更容易理解）。

以下为[Perplexity博客](https://www.perplexity.ai/ja/hub/blog/introducing-the-sonar-pro-api)中摘录的有关sonar-pro的说明：

> For enterprises seeking more advanced capabilities, the Sonar Pro API can handle in-depth, multi-step queries with added extensibility, like double the number of citations per search as Sonar on average. Plus, with a larger context window, it can handle longer and more nuanced searches and follow-up questions.

关于收费可参考以下链接。

- [Sonar Guide - Pricing](https://docs.perplexity.ai/guides/pricing)

与其他生成式AI服务不同的是，Sonar不仅按令牌（token）数量收费，还会依据搜索次数收费。  
特别是“sonar-pro”可能会触发多步搜索，因此一次API调用可能会执行两次以上的搜索。此外，相较于sonar，“sonar-pro”的令牌收费设置也更高。根据使用量的不同，费用可能会急剧增高，需要注意。

## 使用Sonar执行Chat Completion API

实际上，Sonar目前只有“Chat Completion API”。

- [Sonar Reference - Chat Completions](https://docs.perplexity.ai/api-reference/chat-completions)

以下是参考上述文档编写的示例代码。

```python
import json
import os
import requests

url = "https://api.perplexity.ai/chat/completions" # Sonar端点
api_key = os.getenv("PPLX_API_KEY") # 生成的API密钥

payload = {
    "model": "sonar", # 模型
    "messages": [
        {
            "role": "system",
            "content": (
                "你是一个多功能助理。"
                "请用充满活力的语气随意谈话。"
            ),
        }, {
            "role": "user",
            "content": (
                "请告诉我昨天发布的StarGate Project的详情。"
                "这个项目将会带来哪些变化？"
            ),
        }
    ],
    "temperature": 0.2,
    "top_p": 0.9,
    "return_images": False,  # 从Tier2开始可用
    "return_related_questions": False,  # 从Tier2开始可用
    "search_recency_filter": "month",
    "top_k": 0,
    "stream": False,
    "presence_penalty": 0,
    "frequency_penalty": 1,
    "response_format": None, # 从Tier3开始可用
    "search_domain_filter": None, # 从Tier3开始可用
}
headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

response = requests.request("POST", url, json=payload, headers=headers)

body = json.loads(response.text)

print(body["choices"][0]["message"]["content"])
# 可以从citations获取引用的URL
for idx, citation in enumerate(body["citations"]):
    print(f"[{idx + 1}]: {citation}")

print(body["usage"])
```

需要注意的是，部分测试功能是否可用取决于账户的Tier等级。  
详细信息可以参考以下官方文档中的Beta Features部分。

- [Sonar Guide - Rate Limits and Usage Tiers](https://docs.perplexity.ai/guides/usage-tiers)

在这里，我们尝试查询了关于时事话题。返回了以下响应结果。

```
昨天发布的**Stargate Project**的详细信息如下！

## Stargate Project概要
- **投资金额**：计划在4年内投资5,000亿美元（约78万亿日元）[1][3][5]。
- **目标**：建设专注于AI的数据中心以强化AI基础设施[1][3]。
- **初期投资**：立即启动1,000亿美元（约15万亿日元）[3][5]。
- **数据中心**：从德克萨斯州阿比林开始建设10个数据中心，最终扩展到20个[1]。

## 参与企业
- **主导合作伙伴**：由软银集团和OpenAI主导进行财务管理和运营[3][5]。
- **初期投资者**：Oracle和MGX也参与其中[5]。
- **技术合作伙伴**：Arm、Microsoft、NVIDIA、Oracle提供技术合作[1][3]。

## 项目影响
- **创造就业**：实现数十万个就业机会，支持美国的产业复兴[5]。
- **国家安全保障**：为美国及其盟友的国家安全提供基础[3][5]。
- **环境影响**：关注其环境负荷及对地方经济的效益[1]。

通过这个项目，AI技术的发展将得到加速，并对美国的产业和国家安全做出巨大贡献！
[1]: https://innovatopia.jp/ai/ai-news/46953/
[2]: https://ja.wikipedia.org/wiki/Fate/Grand_Order
[3]: https://enterprisezine.jp/news/detail/21270
[4]: https://b.hatena.ne.jp/entrylist/it/%E3%83%97%E3%83%AD%E3%82%B0%E3%83%A9%E3%83%9F%E3%83%B3%E3%82%B0
[5]: https://japan.cnet.com/article/35228516/
{'prompt_tokens': 51, 'completion_tokens': 407, 'total_tokens': 458}
```

从搜索结果来看，它能够提取最新信息并进行总结。

将同一内容切换至sonar-pro后，返回了更深入的内容（部分已整理）。

```
当然！以下是关于Stargate Project带来的令人兴奋的详细信息！

首先，这个项目的规模相当惊人！OpenAI和软银集团为中心，计划在4年内投资5,000亿美元（约77万亿日元）。这是AI行业有史以来最大的投资之一……

[完整返回内容省略，仅显示片段]
```

## 最后

通过本文简单介绍了Perplexity的Sonar API。  
目前Sonar仅支持一种API，且尚未有官方库，但可以期待后续更新带来更多功能。   
未来，Sonar可能在许多场景得到广泛应用，其潜力值得期待！
