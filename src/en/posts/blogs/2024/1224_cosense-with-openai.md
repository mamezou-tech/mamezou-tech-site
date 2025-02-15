---
title: Utilizing Generative AI in Sharing Internal Know-How and Know-Who
author: yoshihisa-muta
date: 2024-12-24T00:00:00.000Z
image: true
tags:
  - scrapbox
  - OpenAI
  - 生成AI
  - advent2024
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2024/
translate: true

---

This is the article for Day 24 of the [Mamezou Developer Site Advent Calendar 2024](/events/advent-calendar/2024/).

Hello, everyone. I'm Muta, completely captivated by the charm of [Cosense](http://cosen.se) (formerly Scrapbox)[^1]. Today is Christmas Eve. Before we know it, 2024 is almost over.

[^1]: [Scrapbox was renamed to Cosense](https://corp.helpfeel.com/news/pressrelease-20240521). (~~Personally, I was fond of the old name and wished they didn't change it.~~)

This time, I will introduce the utilization of generative AI in sharing internal know-how and know-who within our company.

## Utilizing Cosense for Sharing Know-How and Know-Who

It's been five years since we officially adopted Cosense as a tool within our company in July 2019. Cosense has become a tool that all employees use almost every day and has established itself as an internal portal.

![](https://i.gyazo.com/9f66dcad9f0c37a203d50ea1bc35f41e.png)

Please refer to the following article for the issues before introducing Cosense, how we resolved them using Cosense, and the effects.

@[og](https://developer.mamezou-tech.com/blogs/2022/01/05/installing-scrapbox/)

## Current Issues in Utilizing Cosense

As of December 2024, the total number of pages exceeds 14,000, and new information continues to increase. On the other hand, due to the excessive amount of information, searchability[^2] and ease of information utilization have become issues.

[^2]: Cosense provides convenient search functions such as "QuickSearch," "Related Pages," "2 hop search," and "Full-text Search." However, when the amount of information reaches over 10,000 pages, it becomes difficult to find the desired page.

![](https://i.gyazo.com/aca4b2a833d40992963d4f13d141cca9.png)

So, aiming to gain knowledge about generative AI ([OpenAI API](https://openai.com/index/openai-api/)), we decided to tackle this issue through dogfooding to see if we can resolve it.

![](https://i.gyazo.com/b59b768d7dc9151752b4fbe37b9659b8.png)

## Mechanism of Information Retrieval Using Generative AI

Roughly speaking, we realized it in the form of the diagram below.

![](https://i.gyazo.com/dc581040bbc19d4741d5b361cb65427e.png)

The flow from information input to retrieval is as follows:

1. Information Input
2. Information Retrieval (Narrowing Down)
3. Information Transfer & Instruction to Generate RAG
4. Question Input
5. Request
6. Response
7. Answer Display

Below, I will explain each in detail.

### (1) Information Input  
Information input is simply carried out on Cosense. It's really simple. As mentioned earlier, we already have a sufficient amount of high-quality information accumulated.

### (2) Information Retrieval (Narrowing Down)  
[GitHub Actions](https://github.co.jp/features/actions) regularly automatically retrieves the information input into Cosense in (1), and narrows it down after excluding pages containing specific links[^3].  
[^3]: Confidential information with links such as clients or projects is excluded from the information retrieval targets.

### (3) Information Transfer & Instruction to Generate RAG  
Next, GitHub Actions sends the information retrieved in (2) to the OpenAI API and instructs it to update the vector database[^4].  
[^4]: RAG stands for Retrieve and Generate, which is an AI model that simultaneously retrieves and generates information. Note that in OpenAI's documentation, the term RAG is not used; the knowledge base is referred to as VectorStore, and searches using it are called File Search.

### (4) Question Input  
Information retrieval is done using our internal communication tool, [Slack](https://slack.com/). Specifically, we ask questions to the Slack App (@mame-kun).

### (5) Request  
Slack sends a request (question) to the OpenAI API.

### (6) Response  
The OpenAI API returns a response (answer) to Slack.

### (7) Answer Display  
The answer is displayed on Slack as a reply to the question message thread.

## Example of Actual Operation

Below is an example of actually asking a question on Slack.

![](https://i.gyazo.com/a9a9f84d48a75dab814c1b05aa9e3104.png)

You can see that the answer to the question is displayed as a message within the thread, cleverly combining information retrieved from Cosense and general information. The information source from Cosense is also displayed, and you can directly access the relevant page from this link.  
Furthermore, if you ask additional questions on the thread, it will answer while understanding the context of the initial question.  
It's like having a conversation with an expert who knows internal affairs well.

## Design Points

The design points of this initiative are as follows.

 - Utilization of OpenAI's Assistant API
   - Prepare two types of characters with different personalities
     - mame-kun: a character that has grasped Cosense's information and answers questions in a frank manner
     - mameka: a character that answers general questions positively and cheerfully  
     ![](https://i.gyazo.com/92ff185ff11411c67dd9e405e0d77b81.png)  
     - Synchronize the threads on Slack with the conversation threads on OpenAI to provide natural responses in line with the conversation context

 - Knowledge Base (Cosense) Access
   - Efficient information retrieval using OpenAI's [File Search](https://platform.openai.com/docs/assistants/tools/file-search)
     - Hybrid method of semantic search and keyword search
     - Cosense's information is regularly imported and updated
   - Prohibit access from external users as it is internal information
     - Determine based on Slack user information (suppressed if accessed via GitHub)

 - Web Search / Browsing
   - Implemented Perplexity search and browsing functions to obtain the latest information and suppress hallucinations
     - Not just simple URL fetching, but actual browser operations using [Playwright](https://playwright.dev/), supporting JavaScript-based websites (SPA, etc.)
       - Refer to [another article](/blogs/2024/07/19/lambda-playwright-container-tips/) for this ingenuity
   - Perplexity search uses the [Perplexity API](https://docs.perplexity.ai/home)
   - Use [Function Calling](https://platform.openai.com/docs/assistants/tools/function-calling) and delegate the actual usage judgment to the AI assistant

 - Multimodal
   - Realize image input by linking Slack's attached images with OpenAI API's Storage service
     - Use OpenAI's [Vision](https://platform.openai.com/docs/guides/vision)
     - Voice input is currently not supported

## Effects of This Initiative

As a result of this initiative, not only was the use of generative AI within the company promoted and understanding of AI technology deepened, but also the following effects were observed.

 - Discovery of Unexpected Information (Joy)
   - Through question-and-answer with generative AI, we became able to extract Cosense's information more efficiently. And above all, in the process of extracting that information, we experienced the joy of discovering unexpected information and connections between pieces of information.
 - Realizing that the know-how they write is useful to someone
   - As each employee experiences the above effects, they become more actively involved in accumulating internal know-how and know-who (i.e., writing to Cosense), leading to further motivation for sharing know-how and know-who. This is creating a virtuous cycle that connects information input and output.

![](https://i.gyazo.com/70165e2d3ee478457c5efd6e877dde2e.png)

## Conclusion
How was it?

I feel that generative AI is still mainly used for improving work efficiency, such as increasing development productivity. Through this initiative, we confirmed that generative AI can contribute to subtle changes in organizational culture.

I hope this article will provide hints for your future utilization of generative AI.
