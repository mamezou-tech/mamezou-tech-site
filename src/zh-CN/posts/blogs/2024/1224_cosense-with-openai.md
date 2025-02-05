---
title: 在内共享知识及诀窍中的生成式AI应用
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

这是[is开发者网站Advent Calendar 2024](/events/advent-calendar/2024/)第24天的文章。

大家好。我是已经完全被[Cosense](http://cosen.se)（旧称Scrapbox）[^1]魅力所俘虏的牟田。今天是平安夜。不知不觉中，2024年也即将结束了。

[^1]: [Scrapbox已改名为Cosense](https://corp.helpfeel.com/news/pressrelease-20240521)。（~~虽然个人还有些依恋，不想改名~~）

这次，我将介绍我们公司内在共享知识和诀窍方面对生成式AI的应用。

## 用于知识与诀窍共享的Cosense应用

自从2019年7月将Cosense正式引入为公司内工具以来，已经过去5年了。Cosense现已成为全体员工日常使用的工具，并牢牢确立为公司内的门户网站。

![](https://i.gyazo.com/9f66dcad9f0c37a203d50ea1bc35f41e.png)

关于在引入Cosense前的课题、如何利用Cosense解决这些问题，以及由此带来的效果，可以参考以下文章。

@[og](https://developer.mamezou-tech.com/blogs/2022/01/05/installing-scrapbox/)

## 使用Cosense时目前面临的问题

截至2024年12月，总页面数已超过14,000页，并且依然在不断新增信息。
然而，随着信息量的急剧增加，可搜索性[^2]及信息利用的便捷性成为了问题。

[^2]: Cosense提供了“QuickSearch”、“关联页面”、“2 hop search”和“全文搜索”等便捷的搜索功能。但是，当信息规模超过1万页时，找到目标页面还是变得十分困难。

![](https://i.gyazo.com/aca4b2a833d40992963d4f13d141cca9.png)

为解决这一问题，同时积累关于生成式AI（[OpenAI API](https://openai.com/index/openai-api/)）的知识，我们决定以一种狗粮测试的形式尝试解决问题。

![](https://i.gyazo.com/b59b768d7dc9151752b4fbe37b9659b8.png)

## 使用生成式AI实现信息提取的机制

大致上，以如下图所示方式实现。

![](https://i.gyazo.com/dc581040bbc19d4741d5b361cb65427e.png)

从信息输入到提取的流程如下：
1. 信息输入
2. 信息获取（筛选）
3. 信息传输及RAG生成指示
4. 提问输入
5. 请求
6. 响应
7. 回答显示

以下，对具体内容进行逐一解说。

### (1) 信息输入  
只需在Cosense中进行信息输入。正如前面所述，已有高质量且充分的信息集。

### (2) 信息获取（筛选）  
[GitHub Actions](https://github.co.jp/features/actions)定期自动获取在(1)中输入到Cosense的信息，剔除包含特定链接[^3]的页面后进行筛选。  
[^3]: 客户和项目等带有敏感信息的链接页面不在获取范围之内。

### (3) 信息传输及RAG生成指示  
然后，GitHub Actions将(2)中提取的信息发送至OpenAI API，并指示更新向量数据库[^4]。  
[^4]: RAG是Retrieve and Generate（检索与生成）的缩写，即同时进行信息检索和生成的一种AI模型。然而，在OpenAI的文档中并未使用RAG这个术语，而是将知识库称为VectorStore，将其用于搜索的功能称为File Search。

### (4) 提问输入  
信息提取通过公司内部的沟通工具[Slack](https://slack.com/)完成。具体来说，通过Slack应用（@mame-kun）进行提问。

### (5) 请求  
Slack将请求（提问）发送至OpenAI API。

### (6) 响应  
OpenAI API返回响应（回答）到Slack。

### (7) 回答显示  
在Slack上，以对提问消息的线程回复形式显示回答。

## 实际运行的样子

以下是通过Slack进行提问的实际演示。

![](https://i.gyazo.com/a9a9f84d48a75dab814c1b05aa9e3104.png)

可以看出，结合Cosense中的信息和一般信息回答问题，并作为消息显示在线程中。此外，还显示了Cosense的信息来源，通过链接可以直接访问相应页面。  
进一步来说，在线程中进行追加提问时，它能够理解最初的提问上下文并给出回答。  
就像是在与熟悉公司内情的资深人士交流一样。

## 设计要点

本次尝试的设计要点如下：

 - 利用OpenAI的助手API
   - 设置性格不同的两种角色
     - mame-kun：在掌握Cosense信息的基础上，以轻松方式回答问题的角色
     - mameka：对一般性问题以积极、开朗的方式回答的角色  
     ![](https://i.gyazo.com/92ff185ff11411c67dd9e405e0d77b81.png)  
     - 将Slack的线程与OpenAI的对话线程同步化，实现符合对话上下文的自然响应
    
 
 - 知识库（Cosense）访问
   - 利用OpenAI的[File Search](https://platform.openai.com/docs/assistants/tools/file-search)实现高效信息获取
     - 语义搜索与关键词搜索的混合方法
     - 定期引入并更新Cosense内的信息
   - 由于是公司内部信息，禁止外部用户访问
	 - 通过Slack用户信息进行判定（通过GitHub的访问会抑制）

 
 - 网络搜索 / 浏览
    - 为了获取最新信息和抑制幻觉，实施了Perplexity搜索和浏览功能
      - 不仅是简单的URL获取，还利用实际浏览器操作（[Playwright](https://playwright.dev/)）支持基于JavaScript的动态网站（如SPA等）
        - 关于此点改进详情，请参阅[相关文章](/blogs/2024/07/19/lambda-playwright-container-tips/)
    - Perplexity搜索使用了[Perplexity API](https://docs.perplexity.ai/home)
    - 借助[Function Calling](https://platform.openai.com/docs/assistants/tools/function-calling)，将实际的使用判断交由AI助手处理
 
 
 - 多模态
    - 对Slack的附件图片，通过与OpenAI API的Storage服务关联实现图片输入功能
      - 使用OpenAI的[Vision](https://platform.openai.com/docs/guides/vision)
      - 音频输入目前尚未实现

## 本次尝试带来的效果

通过本次尝试，公司内部生成式AI的应用得到促进，不仅加深了对AI技术的理解，同时也带来了以下效果：

 - 意外信息的发现（惊喜）
   - 借助生成式AI的问答功能，可以更高效地提取Cosense中的信息。而且，最重要的是，在信息提取的过程中，发现了意想不到的信息及其关联的乐趣。
 - 自己录入的知识能够帮助他人
   - 感受到以上效果的每位员工，更加积极地为公司内部知识与诀窍的积累（即录入Cosense）做贡献，从而产生了进一步共享知识与诀窍的动力。这种良性循环开始形成。

![](https://i.gyazo.com/70165e2d3ee478457c5efd6e877dde2e.png)

## 总结
你觉得如何？

生成式AI虽然在提高生产力、优化工作效率等方面的应用依然是主流，但通过本次尝试，我们确认生成式AI也能为组织文化带来些许变化。

希望本文能为大家在未来更好地利用生成式AI提供一些提示。
