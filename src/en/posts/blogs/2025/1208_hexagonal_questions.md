---
title: >-
  In-Depth Dissection of the 'Unease' in Hexagonal Architecture! Clear
  Understanding of Three Questions and the Essence with Diagrams
author: toshio-ogiwara
date: 2025-12-08T00:00:00.000Z
tags:
  - ソフトウェア設計
  - advent2025
image: true
translate: true

---

This is the article for Day 8 of the [Mamezou Developer Site Advent Calendar 2025](/events/advent-calendar/2025/).

Hexagonal Architecture (Ports & Adapters) may feel somewhat understandable, but isn't there something that doesn't quite sit right? In my case, it boiled down to these three points:

- They say "dependencies go from outside → inside," but why does the dependency between **input ports and implementations** appear reversed? Is that okay?
- It feels odd that **input adapters do not implement ports** while **output adapters do implement ports**.
- And fundamentally, **what is the difference from Onion Architecture**?

In this article, I'll explain, with examples, the notes I made when clarifying these uncertainties.

## 1. Hexagonal Configuration Used in the Example

First, for this article, we will use a Spring Boot TODO application with the following "textbook-style Hexagonal" package structure as an example.

```text
com.example.todohex
├─ TodoHexApplication        … @SpringBootApplication
│
├─ domain                    … Domain model (pure Java)
│   └─ Task.java
│
├─ application
│   ├─ port
│   │   ├─ in                … Input ports (UseCase IF)
│   │   │   ├─ CreateTaskUseCase.java
│   │   │   └─ GetTaskUseCase.java
│   │   └─ out               … Output ports (Repo/Gateway IF)
│   │       ├─ SaveTaskPort.java
│   │       └─ LoadTaskPort.java
│   └─ service               … Use case implementation
│       └─ TaskService.java
│
├─ adapter
│   ├─ in
│   │   └─ web                … REST adapter (input side)
│   │       ├─ TaskController.java
│   │       ├─ TaskRequest.java
│   │       └─ TaskResponse.java
│   └─ out
│       └─ persistence        … Persistence adapter (output side)
│           ├─ TaskEntity.java
│           ├─ SpringDataTaskRepository.java
│           └─ TaskPersistenceAdapter.java
└─ ...
````

## 2. Is It Okay That Some Dependencies Are Reversed?

Now, let's dive straight into the first point of confusion. Where does it look "reversed"? If you derive the UseCase and Service in a textbook manner, their dependency[^1] is actually reversed. In the following diagram based on our example, the red dependency arrows run from right to left.

![01](/img/blogs/2025/1208_hexagonal_four_questions/01_port-in.drawio.svg)

[^1]: In UML, the term "dependency" refers to a temporary relationship between two entities, but here we are not using it in the UML sense; we simply use "dependency" to mean a one-way usage relationship.

On the other hand, many popular explanations of Hexagonal Architecture state that "module dependencies should go from outside → inside." At this point, you might think, "Wait, the dependency between `port` and `service` is pointing opposite of outside → inside, so is that okay?"

So, returning for a moment to the primary source, what does Alistair Cockburn himself say? In his original article [1], he essentially states the following:

> * The application interacts with the outside through **Ports**.  
> * The protocol of those **Ports** takes the form of the application's API.

By "API" here, he means it could be a method call, HTTP, a messaging protocol, or anything else—he's speaking at a very abstract level. At least in the original, he does not say Java-specific "best practices" like:

* Split input ports into **interfaces and implementation classes**.  
* Always point module dependency arrows **from outside to inside**.

In his more recent slide deck [2], aimed at typed languages, he goes as far as:

> * Declare "required interfaces."  
> * Prepare folders for Port declarations.

but he **does not go into rules about dependency arrow directions.**

:::column: Conclusion: The notion that dependencies should go from outside to inside is just an urban legend
Alistair Cockburn doesn’t say anything about the direction of dependencies. In fact, since he tells you to expose interfaces for ports, it is natural for the dependency relationship between a port and its implementation to be reversed. I think this notion arose as an urban legend when Hexagonal Architecture was discussed in the same context as Clean Architecture, which explicitly states "only allow dependencies from the outer rings to the inner rings."  
However, if you consider `port.in` and `service` as a single "application core bundle," you get an outside → inside structure of `adapter.in` → (port.in + service) → domain, so I think it’s perfectly valid to view it as a kind of Clean Architecture.
:::

[^2]: I am in the camp that thinks what Uncle Bob calls Clean Architecture is merely a conceptual "this is what a clean architecture should be!" idea and that no architecture called Clean Architecture actually exists. Therefore, in this article, "Clean Architecture" is used to mean a "clean architecture" where the domain is separated and isolated from technical details.

## 3. Don’t Adapters Implement Ports?

The next point of confusion is this:

* The input-side adapter (e.g., controllers) does not implement `port.in` (red dependency)  
* The output-side adapter (DB or external APIs) does implement `port.out` (blue dependency)

It’s hard to understand with words alone, so in the diagram it looks like this:

![02](/img/blogs/2025/1208_hexagonal_four_questions/02_adapter.drawio.svg)

It's odd that with the same adapters, sometimes they implement ports and sometimes they don’t, and it's not symmetrical at all—kind of unsettling, right? Honestly, was I the only one who thought, "Is this really correct?"

When in doubt, let's refer to Cockburn's original article [1] once more to see what he says. He calls Hexagonal Architecture Ports & Adapters, but here, "Port" and "Adapter" are simply role names.

* Port:  
  * A **logical contact point** that expresses "what the conversation is for"  
* Adapter:  
  * A **converter** that connects that Port to a specific technology (HTTP / CLI / DB / email / file …)

And in his slides [2], he categorizes Ports into:

* Driving Ports (the side that "drives" the application)  
* Driven Ports (the side by which the application is "driven")

From this perspective:

* On the Driving Port side  
  * Adapters (UI / REST / Batch …) are **clients** that invoke according to the Port definition  
* On the Driven Port side  
  * Adapters (DB / email / external APIs …) are **servers** that satisfy the Port definition and process

Therefore, the asymmetry of:

* input-side adapters not implementing ports  
* output adapters implementing ports

is actually **natural**.

:::column: Conclusion: Adapters and Ports Are Role Names, Not Syntactic Patterns
The names Port / Adapter aren’t about a syntax pattern of "input = implements, output = implements"; they simply refer to the roles of **"a window expressing the purpose of communication"** and **"a converter to the outside world."** Viewed this way, the asymmetry of whether implementations are present or not becomes far less concerning.
:::

## 4. What’s the Difference from Onion Architecture?

The last point of confusion is this:

> After all, what exactly is the difference between Hexagonal and Onion?

So, to understand that difference, let’s look at the overall structure of each.

### First, Onion Architecture

When you sketch the Onion Architecture roughly, it looks like this:

![03](/img/blogs/2025/1208_hexagonal_four_questions/03_onion.drawio.svg)

<br>

The main focus of Onion Architecture (though it’s hard to see from the diagram above...) is:

* To create concentric layers centered on the domain  
* Ensure dependencies go from outside → inside  
* **Protect the domain**

### Next, the Structure of Hexagonal Architecture

On the other hand, Hexagonal (Ports & Adapters) can be said to be an architecture **focused on boundaries (Ports)**.

![04](/img/blogs/2025/1208_hexagonal_four_questions/04_hexagonal.drawio.svg)

Putting the two side by side like this, structurally, Hexagonal Architecture takes the application part and its boundaries of Onion Architecture and breaks them down further into `port.in` / `port.out` and `adapter.in` / `adapter.out`, making it possible to see it as an approach that **emphasizes the I/O boundaries (where things come in and where they go out)**.

In other words, to put it in one phrase:

- Onion Architecture: an architecture that protects the inner layers with concentric layers  
- Hexagonal Architecture: an architecture that emphasizes boundaries via ports and adapters  

And the goals they aim for are actually quite similar:

* Domain-centric  
* Independence from the outside world (UI/DB/external systems)  
* Improved testability

:::column: Conclusion: Hexagonal is an Advanced Version of Onion (One Could Say)
From a structural perspective, you could say "Hexagonal = Onion's application + boundary parts, decomposed into ports and adapters to create an 'I/O boundary–emphasized' version."  
However, while Onion Architecture is characterized by its layered structure from outside to inside, Hexagonal Architecture is characterized by structuring it as outside → inside → outside, as shown by the blue arrows in the diagram, to structurally emphasize "where things enter and where they exit." Therefore, the original concepts are different.
:::

## 5. Conclusion

Adopting Hexagonal Architecture can certainly achieve a clean architecture, but it comes with costs. Cockburn himself also mentions the following in his slides [2]:

* Each Port requires additional fields and DI configuration  
* In typed languages, you need interfaces and folder structures for Ports  
* You need to design a Configurator (the configuration root)

In other words, Hexagonal Architecture increases the number of classes and interfaces in exchange for cleanliness. Personally, if you just want to separate the domain, Onion Architecture is often sufficient.

What's good isn't always the right choice in every situation. It's important in architecture design to consider what you actually need and choose an architecture that fits.

[1]: https://alistair.cockburn.us/hexagonal-architecture?utm_source=chatgpt.com "hexagonal-architecture - Alistair Cockburn"  
[2]: https://alistaircockburn.com/Hexagonal%20Budapest%2023-05-18.pdf?utm_source=chatgpt.com "Hexagonal Architecture ( Ports & Adapters )"
