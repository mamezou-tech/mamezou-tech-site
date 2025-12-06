---
title: >-
  Modeling Forum 2025 Participation Report: Looking Ahead to Shin Modeling in
  the Era of AI Agents!
author: masahiro-kondo
date: 2025-12-05T00:00:00.000Z
tags:
  - modeling
  - advent2025
image: true
translate: true

---

This is the Day 5 article of the [Mamezou Developer Site Advent Calendar 2025](/events/advent-calendar/2025/).

## Introduction
On the 26th of last month, the Modeling Forum 2025 organized by UMTP was held.

@[og](https://umtp-japan.org/event-seminar/mf2025/76554)

This year, under the theme “What is Shin Data Modeling in the AI Era?”, the forum featured numerous presentations and panel discussions.

I also participated via Zoom on the day and watched the sessions. In this article, I would like to share the content and my impressions of several of the presentations.

:::info:
You can watch the presentations and panel discussions from Modeling Forum 2025 on the [UMTP YouTube channel](https://www.youtube.com/@umtpjapan4501).

UMTP (UML Modeling Promotion Council), the organization that hosts the Modeling Forum, carries out activities to popularize modeling techniques through the UML Modeling Skills Certification Exam and to disseminate "Model-Based Thinking" for strengthening analytical skills, creativity, and imagination. UMTP is chaired by Hanyuda from Mamezou.

@[og](https://umtp-japan.org/greeting)

The Mamezou Developer Site also publishes articles on UMTP certification exams, so those aiming to obtain certification may find them helpful.

@[og](/blogs/2023/12/11/umtp_l3_challenge/)
:::

## Opening Declaration
Mr. Hanyuda, Chairman of UMTP, announced the “UMTP Shin Modeling Declaration.”

![Shin Modeling Declaration](https://i.gyazo.com/cd1614e916c13011cf7d25b05dba8039.png)  
*The UMTP Shin Modeling Declaration presented on the day: screenshot from the presentation materials*

> "The fundamental literacies of the coming era are 'reading, writing, AI, and modeling.'"

The declaration emphasized modeling’s role in visualization, hypothesis testing and dialogue with Agile AI, model-based development, and more. Finally, it positioned modeling as a liberal art, establishing it as a fundamental literacy.

## Keynote: Models in Scientific Thinking: Explanation, Creation, and Toward Conceptual Engineering
Associate Professor Ryo Uehara of the Interfaculty Initiative in Information Studies and the Graduate School of Interdisciplinary Information Studies at The University of Tokyo delivered the keynote.

:::info: Here are links to the YouTube video and materials of the keynote:
[MM2025-01 Keynote: Models in Scientific Thinking: Explanation, Creation, and Toward Conceptual Engineering](https://www.youtube.com/watch?v=RhOSe8538m8)  
[MF2025 Keynote Materials - UMTP NPO UML Modeling Promotion Council](https://umtp-japan.org/download/mf2025-keynote)
:::

In Professor Uehara’s book '科学的思考入門', in Chapter 5 “What Does It Mean to Explain Scientifically?”, models are discussed.[^1]

- [科学的思考入門 (講談社現代新書 2765) | 植原 亮 |本 | 通販 | Amazon](https://www.amazon.co.jp/dp/406538771X)

[^1]: This book is said to be an introductory work on the philosophy of science, masquerading as a practical guide for general readers under the concept of acquiring “everyday science.”

In the presentation, he defined "science in the narrow sense" and "science in the broad sense (everyday science)" as areas of inquiry, and explained the characteristics of the models used in each. As an example of the former, he pointed to molecular models of genes, where the model directly corresponds to explaining and understanding mechanisms; as an example of the latter, he mentioned railway route maps, which simplify a complex reality into a format easily handled by the human mind. He explained that abstraction and idealization are the two main features in both cases.

In the second half, he explained conceptual engineering. Conceptual engineering deals with concepts through the process: (1) analysis and evaluation → (2) revision → (3) social implementation, and he discussed revisions of concepts like free will and creativity.

**Impressions:**  
Conceptual engineering was completely new to me. While software engineering models specialize in solving specific business problems, the cycle of refining (or evolving?) through analysis and validation seems similar. It felt like I was attending an undergraduate liberal arts lecture for the first time in a long while (just my humble take).

## Technical Presentation: Data Modeling for AI-Ready Data Preparation
This presentation was delivered by Tadashi Mano, President and Representative Director of Data Architect Inc.

:::info: The YouTube video of the presentation is available here:
[MF2025-02 Technical Presentation 1: Data Modeling for AI-Ready Data Preparation](https://www.youtube.com/watch?v=UQK-TynF2r0)
:::

He is the author of '実践的データモデリング入門' (nostalgic DB Magazine reference).

- [実践的デ-タモデリング入門 (DB Magazine SELECTION) | 真野 正 |本 | 通販 | Amazon](https://www.amazon.co.jp/dp/4798103853)

He emphasized that data management is crucial when supplying enterprise data to generative AI for utilization, and the talk focused on how to advance enterprise data modeling. In particular, he explained that corporate data usage now includes not only structured data in Systems of Record (SoR) but also growing amounts of unstructured data, and he described the necessity of constructing a coherent data architecture across systems and how to approach it. As a future outlook, he suggested a scenario in which AI agents take on the roles of maintaining data architecture and guaranteeing quality, and data management is operated as an autonomous process by AI agents.

**Impressions:**  
Even in real AI implementation projects, there's a tug-of-war between those who expect wonderful results just by feeding data to AI and the more level-headed ones who say, “If you don't prepare your data first, it's just garbage in, garbage out.” This was the same during the era of BI, and it will likely remain a critical issue going forward. After all, the volume of data is enormous and the number of systems is large, so we need AI to help organize it, or it's impossible.

## Domain Modeling in the Era of Generative AI – Beyond OOP and FP
This presentation was by Yoshitaka Kawashima, Representative Director of Wolf Chief Inc.

:::info: The YouTube video of the presentation is available here:
[MM2025-03 Technical Talk 2: Domain Modeling in the Era of Generative AI – Beyond OOP and FP](https://www.youtube.com/watch?v=G2P7VbVUU6w)
:::

:::info  
It appears that Kawashima-san is a frequent user of Cosense, and the topics covered in this presentation are also summarized there.  
@[og](https://scrapbox.io/kawasima/)  
:::

He distinguishes three levels of domain modeling: conceptual, specification, and implementation, and defines the components of a specification model as follows:

> A specification domain model is made up of business  
> - Data  
> - Behavior  
> described at a fine-grained level of abstraction.

Then, a method for writing specifications based on Liskov’s procedural abstraction was introduced.

- Input (data abstraction)  
- Output (data abstraction)  
- requires: write the conditions for inputs when they are not total[^2]  
- modifies: specify the inputs that are modified  
- effects: describe the behavior concerning the inputs used  

[^2]: Totality: For every possible input, there exists a corresponding output (behavior can be defined as a function).

@[og](https://scrapbox.io/kawasima/%E3%82%BD%E3%83%95%E3%83%88%E3%82%A6%E3%82%A7%E3%82%A2%E3%80%81%E5%A4%96%E3%81%8B%E3%82%89%E4%BD%9C%E3%82%8B%E3%81%8B%3F%E5%86%85%E3%81%8B%E3%82%89%E4%BD%9C%E3%82%8B%E3%81%8B%3F)

Then, he talked about specification model-driven design.

**Outside-In Development:**  
Designing and developing based on screen-driven or table-driven approaches without understanding the core business concepts → tends to result in wiring programming.

**Inside-Out Development:**  
- ① Write the specification model (by humans)  
- ② Write the Presentation model (screen) based on the specification model (by AI)  
- ② Write the Persistence model (DB) based on the specification model (by AI)

**Impressions:**  
This feels like Design by Contract (DbC). Instead of struggling to achieve a good design in the implementation language, it seems sensible for humans to focus on writing the specification, have AI review it, and let AI write the code in the implementation language. It would be a world where those who can write specifications without thinking about the implementation language are strong. We need a specification description language. There are still SIers writing endless detailed design documents under the guise of detailed design, not noticing the bugs in them; it would be great if such practices could be eradicated. I’ll buy Kawashima-san’s book on specification model-driven design when it comes out.

## Dimensional Modeling Learned through Excel Data Analysis – Toward Agile Data Modeling
This talk was delivered by Yuzutaso (Sho Yokoyama), President and Representative Director of Kazaneya Inc.

:::info: The YouTube video of the presentation is available below:
[MF2025-04 Technical Presentation 3: Dimensional Modeling Learned through Excel Data Analysis—Toward Agile Data Modeling](https://www.youtube.com/watch?v=_OtBFLOfnl4)
:::

[科学専門書) | ローレンス・コル, ジム・スタグニット, 打出紘基, 佐々木江亜, 土川稔生, 濱田大](https://www.amazon.co.jp/dp/B0DXDR2N2M/)

The topic was dimensional modeling. He discussed how to define facts and dimensions, and emphasized that agile data preparation is crucial in an era where business requirements continuously pivot. He also noted that while data scientists are expensive, one can now expect substantial output from AI agents in data analysis. If you prepare reliable data sources, having AI agents do the work is cheaper and faster.

**Impressions:**  
This is similar to Mano-san’s talk on enterprise data modeling, but the focus on “agile data modeling” is distinctive. I understand that once data preparation is done, data analysis can be handled by AI agents.

## Hello! Data Modeling
This talk was delivered by Akihiro Hanyu, Representative Director of A Clipper Inc.

:::info: The YouTube video of the presentation is available here:
[MF2025-05 Technical Talk 4: Hello! Data Modeling](https://www.youtube.com/watch?v=Xxh4owGmsoQ&t)
:::

He is the author of "楽々ERDレッスン". He has apparently written a new book on requirements definition.

- [こんにちは！要件定義①【情報活用とデータベース編】 (ビジネス×IT企画) 単行本（ソフトカバー）](https://www.amazon.co.jp/dp/4297152371/)

With the advent of AI, it has become possible to create applications at low cost for domains that could not previously be targeted for IT. We are in an era of front-loading where humans handle the upstream processes. Upstream processes and requirements definition have become even more important. According to the IPA’s Digital Skill Standard, database design is positioned as a literacy that all business personnel should understand. Hanyu-san is currently supporting efforts to improve digital literacy among digital talent, and he mentioned that there are many people who have never worked in IT but find themselves appointed with comments like, “You’re knowledgeable about digital matters, so you’ll lead DX,” which causes them distress.

**Impressions:**  
So DX talent is really in short supply, huh (deadpan).

## Placing the Model at the Core of Requirements Definition and Taking Responsibility for LLM-Generated Requirements
This presentation was by Zenji Kanzaki, President and CEO of Value Source Inc.

:::info: The YouTube video of the presentation is available here:
[MF2025-06 Technical Talk 5: Placing the Model at the Core of Requirements Definition and Taking Responsibility for LLM-Generated Requirements](https://www.youtube.com/watch?v=G7D9uukCUxI)
:::

Kanzaki-san was a former Mamezou employee and was my boss when I joined. He advocates and implements RDRA, a model-based method for visualizing business and systems.

@[og](https://www.rdra.jp/%E3%83%9B%E3%83%BC%E3%83%A0)

He said that in recent projects, he has shifted to entrusting AI agents with all requirements definition, reaching a stage where the human role is to visualize the AI-generated requirements and validate them. He mentioned that the challenge lies in how to provide appropriate context to the AI and how to understand and correct its output. For visualizing requirements, he used RDRA Graph in his explanations.

[RDRA - RDRAGraph Tool](https://www.rdra.jp/rdra%E3%83%84%E3%83%BC%E3%83%AB/rdragraph%E3%83%84%E3%83%BC%E3%83%AB)

**Impressions:**  
Kanzaki-san really masters using AI agents.  
The movement of the RDRA viewer was so interesting that I couldn’t absorb the content.

## Conclusion
I had to leave and couldn't listen to the subsequent presentations and panel discussions,[^3] but all the ones I did watch were fascinating and convinced me that the importance of modeling has increased in the era of AI agents. Personally, Kawashima-san’s talk was a hit for me.

[^3]: The YouTube video of the panel discussion is also available [here](https://www.youtube.com/watch?v=q_WI-KmQXSU&t).

I believe that the importance of language proficiency in collaborative work with AI agents such as Vibe Coding is recognized, but if sharing models with AI can improve the quality of AI output and reduce misunderstandings, then it may be worthwhile to engage in modeling.

The term "specification-driven development" has emerged, but perhaps we are heading into an era of model-based specification-driven development.
