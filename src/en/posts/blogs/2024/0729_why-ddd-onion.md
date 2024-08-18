---
title: >-
  Why does DDD come up alongside Onion Architecture and others? I asked within
  the company
author: toshio-ogiwara
date: 2024-07-29T00:00:00.000Z
tags:
  - DDD
  - ソフトウェア設計
  - summer2024
image: true
summerRelayUrl: https://developer.mamezou-tech.com/events/season/2024-summer/
translate: true

---

:::info
To reach a broader audience, this article has been translated from Japanese.
You can find the original version [here](https://developer.mamezou-tech.com/blogs/2024/07/29/why-ddd-onion/).
:::


This article is the first piece of the [Summer Relay Series 2024](/events/season/2024-summer/).

As part of the Summer Relay Series project, this time I would like to change the usual approach and introduce the exchange that occurred when I asked on our internal Slack, "Why does DDD come up alongside Onion Architecture and others?" The purpose of this article is not only to output what I found technically interesting but also to give a glimpse of the atmosphere at Mamezou. I hope that readers can sense a bit of Mamezou's corporate culture through this.

## TL;DR
For those who want to quickly know the conclusion of why this is the case, I summarize my perspective as follows:

- DDD does not require a specific architecture.
- What is needed is an architecture that can separate technical concerns from business concerns.
- To directly realize the separation of technical and business concerns, the Dependency Inversion Principle (DIP) is necessary.
- Therefore, architectural styles based on DIP, such as Onion, Hexagonal, and Clean Architecture, fit this requirement.
- From this, it seems that DDD and architectures based on DIP are often discussed together.

Additionally, I understood that layered architecture is not incompatible with DDD; rather, Onion, Hexagonal, and Clean Architecture are more favorable options, and this does not negate the use of layered architecture in DDD.

## The Trigger Was a Question from a Customer
This all started when I was discussing the software architecture of a certain cloud application with a customer, and they suddenly asked:

"I believe that DDD (Domain-Driven Design) is a design methodology, so strictly speaking, there is no architecture specified by DDD. However, Onion Architecture and Clean Architecture are often talked about together with DDD. Is Onion Architecture really the trend these days?"

I had been thinking along the same lines, but I didn't have a definitive answer, so I replied, "In the original book, Evans' [Domain-Driven Design](https://www.shoeisha.co.jp/book/detail/9784798121963) introduces layered architecture, so why is that?" and left it at that.

While I left it at that, personally, I was more bothered by the fact that I couldn't answer the customer's question than anything else. I thought, "Now that you mention it, why is that?" and it lingered in my mind.

At that moment, I thought, "That's right! I should ask within the company!" There are many people in our company who are knowledgeable about DDD and architecture.

:::check
In this article, four architectural styles are mentioned: Layered Architecture, Hexagonal Architecture, Onion Architecture, and Clean Architecture, but their details are not explained. If you want to know what they are, I recommend referring to [What is a Trendy Architecture? | SOMPO Systems Co., Ltd. Official Note](https://note.sompo-sys.com/n/n62fdd17a7dc4). Each overview is explained in an easy-to-understand manner.
:::

## I Quickly Asked on Slack
At Mamezou, accounts on Slack are provided to those who wish, and almost everyone has a Slack account. It has now become a well-established communication tool within the company, facilitating not only communication and reporting within projects but also various discussions and conversations that transcend organizations, from technical matters to hobbies.

I would like to share a part of the actual content of my question on our internal Slack, slightly deformed for presentation.

:::column: Introduction of Characters
**Author**: A mid-forties engineer who has been creating enterprise Java applications for 25 years. In recent years, in addition to developing a JakartaEE full-stack framework supporting large-scale core systems, I have been focusing on development with Spring Boot.
**IM**: A project leader for a financial core system. A nice guy in his forties who handles everything from requirements definition to modeling and implementation.
**SZ**: A super engineer who solves various customer issues as a technical consultant for Agile and Cloud Architecture. Probably in his late thirties to early forties.
**IN**: A prominent figure in the object-oriented community, active both inside and outside the company. It feels a bit awkward to call someone from our company a prominent figure, but there probably aren’t many who would disagree with that title.
**KD**: Although he seems to be doing managerial work, that is just a facade; he is also the author of a certain free software and a super programmer who loves programming and is now in his fifties.
:::

**Author**: 【Looking for information】If anyone knows, please let me know.
Does anyone know why Onion Architecture and Clean Architecture are often discussed together with DDD?

Recently, it seems that online information frequently discusses architectural patterns (architectural styles) such as Onion and Hexagonal Architecture, which use the Dependency Inversion Principle, alongside DDD. On the other hand, I understand that DDD itself focuses on design and implementation patterns and does not mention how to approach the overall architecture of software. Rather, in the original work by Eric Evans, the layered architecture is introduced as an architecture to realize DDD.

The reason I want to know this is that a customer asked me about the current relevance of layered architecture.

Whether it’s layered architecture or Clean Architecture, it’s fine to decide based on the purpose and respective pros and cons; that in itself doesn’t matter. However, I would like to comment based on an understanding of DDD and its sources. I found that in "[Practical Domain-Driven Design](https://www.shoeisha.co.jp/book/detail/9784798131610)," Hexagonal Architecture is introduced as a better example than layered architecture, but I couldn’t find sources discussing Onion and Clean Architecture alongside DDD...

Does anyone know? (I think it might be that Onion, Clean Architecture, and Hexagonal are often discussed together because they are similar.)

**IM**: How about this? [I Completely Understood Clean Architecture](https://gist.github.com/mpppk/609d592f25cab9312654b39f1b357c60)
> (The explanation that Hexagonal Architecture, Onion Architecture, and Clean Architecture are essentially the same is well articulated in [What is the Easiest Architecture to Start Implementing DDD? - little hands' lab](https://little-hands.hatenablog.com/entry/2017/10/04/231743).)

Thank you for the information!

**Author**: Thank you for the information! I was already aware of the information in the link you provided, and I thought, "Yes, that makes sense!" However, I still don’t understand why each architecture is discussed alongside DDD and why that is favorable. It feels like I’m just in the realm of my own architectural theory, making it weak to reference in explanations.

**IM**:
- Mapping business rules to domain knowledge,
- Explaining that it’s good to implement DDD with layers,
- Various architectures have evolved to round out the layers,
- So we can understand that they are all basically the same.

That’s what I think. However, I couldn’t find the source.

**SZ**: How about [Learning Domain-Driven Design](https://www.amazon.co.jp/dp/B09J2CMJZY/)?

**Author**: This book is great. I quickly skimmed it on O'Reilly's e-learning[^1]. It mentions Hexagonal Architecture, but regardless of how favorable that is, I understood why it is better than layered architecture in DDD.

The key point is that DDD, as the name suggests, focuses on the domain, so keeping the domain clean is important. In that sense, Hexagonal Architecture, which uses Dependency Inversion, is better than layered architecture.

While the source is unclear, it seems that Onion and Clean Architecture are discussed together in the context of keeping the domain clean, which resonates with me.

[^1]: At Mamezou, as part of employee education, employees can choose either an account for [O'Reilly's e-learning](https://www.oreilly.co.jp/online-learning/) that allows unlimited reading of foreign books and some Japanese books or an account for [Udemy Business](https://business.udemy.com/ja/) that allows access to a vast number of courses.

**IN**: I just did a quick search within O'Reilly, but how about [Patterns, Principles, and Practices of Domain-Driven Design](https://www.oreilly.com/library/view/patterns-principles-and/9781118714706/c08.xhtml)? In the "8 Application Architecture" section, it states, "DDD does not require a specific architecture—only one that can separate the technical concerns from the business concerns."

**Author**: This book is also good. It clearly outlines the responsibilities of each layer and why they are necessary. Even just a quick read helped me confirm my previous understanding and realize some things.

Among the books related to DDD, it feels the most practical. As IN pointed out,

> DDD does not require a specific architecture—only one that can separate the technical concerns from the business concerns.

This really sums up why DDD is not about layered architecture but rather about Onion and Hexagonal. It feels good to have it stated so clearly. Thank you for the information.

**KD**: I don’t think there’s a direct connection to DDD, but in the context of microservices, Hexagonal Architecture, which separates business logic from external communication adapters, seems to frequently come up.

Richardson's [Microservices Patterns](https://book.impress.co.jp/books/1118101063) discusses Hexagonal Architecture extensively, and DDD aggregates are often utilized when extracting microservices.

While layered architecture focuses on the internal structure of the application, Hexagonal architecture seems to make it easier to visualize the collaboration of microservices separated by aggregate units.

Thus, I wonder if DDD and Hexagonal Architecture are often discussed together in the context of microservices. (I might be saying something very arbitrary since I don't even understand the differences between Onion, Hexagonal, and Clean. This is just my personal impression.)

**Author**: By the way, another question I received from the customer is, "Why are microservices and Clean Architecture often discussed together?" This is precisely what KD mentioned.

However, I believe that the key to microservices is how to split the services, and the bounded contexts and context maps of DDD fit well with that. Therefore, in that connection:
- When it comes to microservices, it’s about DDD's bounded contexts.
- When it comes to DDD, using the Dependency Inversion Principle is advisable.
- When it comes to the Dependency Inversion Principle, it’s about the three brothers: Onion, Hexagonal, and Clean.

I thought this syllogism explains the emergence of microservices and Clean Architecture, but it does make sense that Hexagonal also fits architecturally.

Layered architecture was a perfect fit for applications that completed with screens + BL + DB before REST came along, but honestly, I’ve felt uneasy about where to place the RestClient processing in today's REST-dominated environment.

So, thinking about it that way, Hexagonal seems appropriate, and it’s easy to understand extracting microservices by aggregate units. I read Richardson's chocolate book before, but I had completely forgotten about that, so I’ll study it again.

**KD**: The term "bounded context" also came up. It seems to fit well as a representation method for distributed systems, like Hexagonal Architecture.

It might have been mentioned before, but a few years ago, an article titled "[There is No Clean Architecture](https://yyyank.blogspot.com/2021/06/there-is-no-clean-architecture.html)" was published.

<br>
~ From this point, the conversation gradually shifted to other topics, and the enjoyable discussion continued, but I will conclude the introduction of the Slack exchanges here. ~

## Finally
I have introduced the Slack exchanges in a somewhat raw manner; how was it? Mamezou has many engineers who love and value technology. If you think you would like to work in such an environment, please click on the banner for the mid-career recruitment site at the bottom of the page (Is that where we end up?).
