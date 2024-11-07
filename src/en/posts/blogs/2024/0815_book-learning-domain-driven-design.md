---
title: Introducing 'Learning Domain-Driven Design'
author: masahiro-kondo
date: 2024-08-15T00:00:00.000Z
tags:
  - DDD
  - BookReview
image: true
translate: true

---




## Introduction

In July, O'Reilly Japan published "Learning Domain-Driven Design."

[Learning Domain-Driven Design ― Practical Techniques for Connecting Software Implementation and Business Strategy by Vlad Khononov, translated by Toru Masuda and Takuma Watahiki: O'Reilly Japan](https://www.oreilly.co.jp/books/9784814400737/)

![Book Image](https://www.oreilly.co.jp/books/images/picture_large978-4-8144-0073-7.jpeg)

This is the Japanese translation of [Learning Domain-Driven Design](https://www.oreilly.com/library/view/learning-domain-driven-design/9781098100124/) published in 2021.

I received a copy from one of the translators, Takuma Watahiki[^1], and had the pleasure of reading it. I would like to introduce the structure and overview of this book.

[^1]: I have been indebted to him for many years in my work.

## Impressions of the Book

It's been 13 years since the Japanese translation of the Evans book[^2] was released. "Learning Domain-Driven Design" digests and clearly explains the domain-driven design presented in the Evans book, and also organizes its relationship with technologies such as application architecture and microservices. Each chapter is concisely summarized, making it easy to read. You can check your understanding with the exercises at the end of the chapters. The translation is smooth, making it a recommended book for comprehensively understanding domain-driven design.

[^2]: [Domain-Driven Design: Tackling Complexity in the Heart of Software by Eric Evans, translated by Ukei Wachi and Yuko Makino](https://www.amazon.co.jp/dp/4798121967)

## Part I: Basic Design Principles

The basic concepts of domain-driven design are explained.

### Chapter 1: Analyzing Business Activities

A business (domain) is broken down into business areas (subdomains), which are categorized into "core"[^3], "generic," and "supporting." Business areas are positioned as collections of related use cases determined by business policies rather than software design. "Business experts" familiar with the activities of business areas are also introduced.

[^3]: Known as "core domain" in the Evans book. Business areas that create differentiation and competitive advantage over other companies.

### Chapter 2: Discovering Business Knowledge

The foundation of domain-driven design, "the same language"[^4], is explained. It is said that the model of business activities grows by nurturing "the same language."

[^4]: Known as "ubiquitous language" in the Evans book.

### Chapter 3: Tackling the Complexity of Business Activities

There may be different ways business experts perceive business activities, and "the same language" may have different meanings. To eliminate such inconsistencies and maintain the consistency of "the same language," "bounded contexts"[^5] are introduced. From a software design perspective, software engineers decide on these. "Bounded contexts" have different life cycles and serve as boundaries for physical divisions like subsystems or microservices.

[^5]: Known as "bounded context" in the Evans book.

### Chapter 4: Interconnecting Bounded Contexts

The relationships between "bounded contexts" are organized.

- Tight Cooperation
  - Good Partners
  - Shared Model[^6]
- Customer and Supplier
  - Dependent Relationship
  - Model Transformation Device[^7]
  - Shared Service[^8]

[^6]: Known as "shared kernel" in the Evans book.

[^7]: Known as "anticorruption layer" in the Evans book.

[^8]: Known as "open host service" in the Evans book.

A "context map" is introduced to visualize the relationships between "bounded contexts."

:::column: Thoughts on "the same language"

In this book, there are some places where different translations are used compared to the Evans book. By using "the same language" instead of "ubiquitous language," the impression of simplicity has indeed increased. However, the nuance of "ubiquity" is diminished, and the combination of the ordinary words "same" and "language" tends to get buried in the text, making it noticeable due to its repetition.

:::

## Part II: Choosing Implementation Methods

Implementation methods based on domain-driven design are explained. Sample code is written in C#, so a little knowledge of C# is required.

### Chapter 5: Implementing Simple Business Logic

Simple business logic appears in the implementation of "generic" and "supporting" business areas, which are implemented using transaction scripts or active records. Active records are adopted when the data structure is complex. Transaction scripts are not that simple when considering distributed systems, and idempotency needs to be considered.

### Chapter 6: Tackling Complex Business Logic

The "domain model" for implementing core business areas is explained. The domain model consists of "value objects," "aggregates," and "business services"[^9]. Aggregates form the boundary of transactions and are responsible for ensuring data consistency. The entity at the root of the aggregate acts as the interface exposed to the outside. Events occurring in the lifecycle of an aggregate are distributed as messages to components outside the aggregate as "business events." Logic that is unnatural to implement in value objects or aggregates is implemented in stateless "business services."

[^9]: Entities are positioned as part of aggregates.

### Chapter 7: Modeling Over Time

Aggregates in the domain model represent the latest state and emit business events. The "event-sourced domain model" explained in this chapter achieves event sourcing and is an implementation that can meet more advanced business requirements (business analysis and optimization, audit records). All business events are recorded, and models can be flexibly projected according to purpose.

### Chapter 8: Technical Approaches

How to structure the entire application (application architecture) is introduced, including "layered architecture," "ports and adapters," and "CQRS." "Layered architecture" is said to be suitable for transaction scripts and active records. Since the business logic layer in layered architecture depends on the data access layer, it is said that without conscious effort, it is difficult to achieve independence of business logic from infrastructure. "Ports and adapters," also known as hexagonal architecture or onion architecture, are said to be suitable for implementing domain models because the principle of dependency inversion allows the business logic layer to not depend on the infrastructure layer.

:::info

Related discussions are also developed in the first article of the [2024 Summer Relay Series](/events/season/2024-summer/), "Why Does DDD Often Appear Together with Onion Architecture? I Asked Internally"(/blogs/2024/07/29/why-ddd-onion/), which was held on this site until recently. The author (me) appears as "KD-san," and looking back now, I feel like I said something out of place.

:::

### Chapter 9: Communication

Communication methods between "bounded contexts" are introduced, corresponding to the collaboration methods organized in Chapter 4. "Model Transformation Device" and "Shared Service" are mapped to methods such as proxies, API gateways, data streams, and BFFs. "Outbox," saga, and process managers are explained as collaborations between aggregates.

:::info

These are communication methods used even when not adopting domain-driven design, and understanding their correspondence with domain-driven design helps maintain "bounded contexts."

:::

## Part III: Practicing Domain-Driven Design

Practical methods for leveraging domain-driven design in actual software development are explained.

### Chapter 10: Design Guidelines

If "bounded contexts" are cut incorrectly, it becomes troublesome later. Guidelines such as "it's better to cut large at first and then divide later" are presented. A flowchart is provided to determine whether to adopt transaction scripts, active records, or domain models. A flowchart is also provided to determine which to choose among layered architecture, ports and adapters, and CQRS.

:::info

Guidelines for choosing test strategies (pyramid, diamond, inverted pyramid) are also presented. The domain model is said to be suitable for a unit-focused pyramid model. Indeed, unit tests are suitable for testing business logic independent of infrastructure.

:::

### Chapter 11: Evolving Design

Business changes rapidly, and even the categories of business areas ("core," "generic," "supporting") change. As the system grows, the formation of a large mud ball progresses. This chapter explains methods for changing implementation methods (transaction script → active record → domain model → event-sourced domain model) and migration methods. Changes in development organizations are also touched upon.

### Chapter 12: Event Storming

The workshop "Event Storming," where people involved in domain-driven design collaboratively model, is explained. The focus is on offline methods, but remote implementation using tools like Miro is also touched upon given the current situation.

### Chapter 13: Domain-Driven Design in the Real World

Methods for applying domain-driven design to existing systems consisting of code bases of "big mud balls," which are troublesome and risky to change, are described. It starts with understanding business activities and the structure of existing systems, drawing "the big picture," and starting small towards the ToBe. Methods such as the strangler pattern (similar to Blue/Green deployment in system updates) and refactoring are mentioned.

:::info

The following sentence from this chapter is something to remember:

> Implementing aggregates and value objects is not domain-driven design. Domain-driven design is about driving software "design" decisions with "business activities (domain)."

:::

## Part IV: Relationships with Other Methodologies and Design Techniques

The relationships with other methodologies such as microservices, event-driven, and data analytics are described.

### Chapter 14: Microservices

The appropriate granularity of microservices is explained from the perspective of overall optimization. For the boundary between domain-driven design and microservices, it is said that cutting by "business area" is more appropriate than "bounded context" or "aggregate." It is also said that "deep services" with small public interfaces that hide complex business logic are preferable. "Shared Service" and "Model Transformation Device" are also implemented as independent services, which can be well understood when looking at API gateways or BFFs.

### Chapter 15: Event-Driven Architecture

Event-driven architecture is an architecture where changes occurring in business areas are published as events, and other components subscribe to those events to perform actions in response. Here, the types of events including business events, levels of consistency, and designs to ensure them are explained.

### Chapter 16: Data Mesh

Analytical data models such as star schemas and analytical data platforms like data warehouses and data lakes are explained. Challenges of these platforms include the proliferation of ETL scripts and poor compatibility with domain-driven design (continuously updating data models) due to tight coupling with business data. To solve these challenges, data mesh is introduced. It is positioned as domain-driven design for analytical data, explaining an approach to align data not with monolithic and large data models but with "bounded contexts." It provides analytical models to "bounded contexts" by treating data as a product.

:::info

I didn't know anything about data mesh, so it was a good opportunity to gain related knowledge. However, I felt that realizing this requires high literacy as a development organization and is a high-level content.

:::

## Conclusion

The original Evans book was published in 2004, and until the Japanese translation was released in 2011, the term DDD refugees existed. The Evans book is one of the few books I read twice[^10], and I remember consciously designing and implementing it in projects I was involved in at the time[^11].

[^10]: Compared to this book, the Evans book seemed to explain core domain implementation more code-centrically, expressed with words like "distillation."

[^11]: After that, I saw many projects with unfortunate code where DDD was treated like an implementation pattern, and I became wary of projects that naively claimed to do DDD. This book also states that the domain model should be adopted for core business areas that differentiate from other companies, and the Evans book also wrote that core domains should be focused on and the most talented developers assigned.

This book provides a good opportunity to revisit domain-driven design. Especially Part IV, which describes the relationship with current mainstream technologies and architectures from an overview perspective, was very informative. The appendix, which includes the author's real experiences, including failures, in a startup, also helps in understanding.

It's gratifying that such a book is now available in Japanese.
