---
title: 'Agile in Business Systems Part 4: Open Sourcing Knowledge'
author: makiko-nakasato
date: 2023-12-08T00:00:00.000Z
prevPage: ./src/posts/agile/bs-agile_03.md
translate: true
---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/agile/bs-agile_04/).
:::



## Introduction
This is Nakasato.

In my closing remarks last time, I wrote that "next time we will discuss 'connoisseurship'". This time, strictly speaking, it's not about agile development. However, in the process of consulting and coaching on agile, I have come to think that the fundamental issue is this, so I will write about it as part of this series.

## Sometimes, let's talk about the past
Please bear with me as I delve into some old stories.
I specialized in linguistics during my student days, meaning I was completely in the liberal arts. Yet, somehow, I was assigned to the Information Systems Department when I joined a machinery manufacturer as a new graduate.

I was assigned to this department without knowing much about computers or programming, and the first language I was taught was mainframe COBOL.
Mainframes and COBOL are often criticized as typical legacy systems, but I subsequently experienced various platforms such as minicomputers, Unix, and Windows servers, relatively quickly. Fortunately, I was able to acquire a "sense" of various development environments from mainframes to open systems over about ten years.

Having experienced system development on multiple platforms, there was something I didn't realize at the time but came to recognize later.
It was that what needed to be open wasn’t just the systems.

## Development on Mainframes
System development in the world of mainframes is actually quite "easy" in a sense.
When I was developing on mainframes and encountered something I didn’t understand technically, I had only one option: "ask a senior". There was almost never a time when this didn't provide an answer.

If it was something outside of the senior’s knowledge regarding infrastructure, I would ask the mainframe manufacturer’s SE who was assigned to us. By the way, this SE was almost daily at the company I belonged to. In an era without email or mobile phones, asking directly was the fastest way, and the SE knew this, so they visited every day.
Therefore, in the beginning, I couldn't distinguish between employees of my own company and those from other companies. In other words, people from outside the company were almost like "inside people".

In an era when the internet was not commonly used, the solution to anything you didn’t understand was to ask someone, and if they didn’t know, they would tell you, "probably that person knows". It was a world where everything could be resolved this way.

Moreover, the world of mainframes involved heavily customizing within the company. Even if another company used the same manufacturer's mainframe, the development and operation environment could be completely different.
Therefore, even if an experienced person changed jobs to another company at that time, it would naturally take a considerable amount of time to get used to the environment of the new company. This was one reason why there were few job changers.

In a way, both "people" and "knowledge" were in a closed world (I thought this was normal).
Currently, the difficulty of migrating legacy core systems is often mentioned, but I think it's not so much a problem with the COBOL language as it is the difficulty of transitioning from an environment that each company has uniquely developed.

## The Wave of Openness Arrived

Now, the wave of openness and multi-vendor systems arrived.
The system I was in charge of ran on HP-UX OS, with Oracle installed, and the clients operated programs in Visual Basic on Windows OS.

Since it involved combining technologies from various vendors, it was no longer sufficient to just ask an SE from a specific vendor.
Moreover, since our team was at the forefront of adopting open systems internally, there was no one within the company who knew the answers. This is when I finally learned the skill of "Googling".
I also began attending external seminars around this time to acquire knowledge.

## What Became "Open"
After moving from this machinery manufacturer (user side) to the vendor side, I felt a sense of discomfort when consulting with various companies about "in-house production and agile development".

It was that these companies were indeed using Linux and other open systems, but their people and knowledge were not open.
They did not know external information, nor did they actively seek it by participating in seminars or events. Instead, they asked the "vendors" who came and went. In other words, they behaved just like in the mainframe era.

Of course, those asked would only talk about things that were convenient for them, things they knew.
If you only rely on such information and do not actively gather information externally, problems like those mentioned earlier arise. You can't judge the validity of what the vendors are saying.

Please realize that when the term "openness" was touted, not only languages, OS, and development environments but also "knowledge" had become open.

## What Does "In-House Production" Mean?
That is to say, even in today's age where using open system technologies is a given, if there are companies that restrict developers' PCs from accessing the internet, it's like saying in the mainframe era, "develop without asking any questions to knowledgeable seniors". If there are still companies doing this, please understand what this analogy means.

Agile development often comes up in consultations as part of in-house production. However, it's necessary to properly discuss "what constitutes in-house production".

I don't think "in-house production" means "all programs are written by employees". The current systems are too complex, and there are many technologies to combine.
However, it is necessary to be able to judge each technology, and for this, it is essential to keep up with the latest technologies, understand their necessity based on past experiences, and judge the validity of what vendors say.
For this, you need to continuously obtain external information, actively participate in seminars, read technical books, and sometimes create your own environment to run at least tutorial-level sample programs.
This behavior must continue, not just be completed with temporary "reskilling" training.

Managers and HR departments need to hire and develop personnel capable of this (otherwise, motivated individuals will leave).
Please consider in-house production, including the development of such people, not just system development.

## Conclusion
This time, I shared some personal stories.
While the content may slightly deviate from agile development, I felt it was something I needed to say now, based on the concerns I hear from clients today and my own experience with development, including on mainframes.

Next time, I plan to return to a proper discussion of agile development.
