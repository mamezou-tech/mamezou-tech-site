---
title: I Attended JJUG CCC 2024 Fall
author: toshio-ogiwara
date: 2024-10-28T00:00:00.000Z
tags:
  - java
image: true
translate: true

---

Yesterday (10/27), I attended the [JJUG CCC 2024 Fall](https://ccc2024fall.java-users.jp/) held at [Bellesalle Shinjuku Grand](https://www.bellesalle.co.jp/shisetsu/shinjuku/bs_shinjukuconference/) in Shinjuku. I'm quite a homebody, so I don't often participate in offline events, but this time there was a session I really wanted to hear, so I participated from the morning. I'd like to introduce a few of the sessions that I found interesting.

Please note that this is more of a personal reflection than a report. Please be aware of that in advance. I've included links to the presentation materials that I could find at this point. If you're interested in the content rather than my impressions, please refer to those.

## Tackling Cold Starts in Java x Spring Boot Applications! ~Trying Various Approaches to Warm-Up~

The first session I wanted to hear was this warm-up session. It started at 10 AM, and I arrived 10 minutes early, full of enthusiasm, securing a seat near the front in the middle. Before the talk, I was feeling a bit low-energy since it was early in the morning, reminiscent of university morning classes, but the speaker was very skilled, and I quickly became alert.

Regarding the main topic, I've been developing in Java for over 20 years, and warm-up discussions come up quite often. However, as the speaker mentioned, "It's a topic in development environments, but there's not much information on how to handle warm-ups," which I completely agree with. (That's why I wanted to hear about others' warm-up strategies!)

The content was about how there are various warm-up methods. Among them, using E2E and typing tools to actually operate before starting service to users is common. It's not too difficult for reference systems, but it's challenging for update systems.

I've worked on projects with warm-ups in the past, but we only did it for reference systems, not update systems. I didn't even have the idea of warming up update systems, but it makes sense to do so. I remembered thinking, "Sorry, but your first order will save many others later, so please forgive me!" when the first order processing was very slow.

Returning to the main topic, when doing update systems, data actually gets registered, so how do you handle that? Various methods were introduced, and I listened with interest.

Incidentally, warm-ups were also a topic in my recent project. The conclusion was that since most of the classes used by the application (mainly Java standard libraries like String and Map) are loaded during the application server's startup, warm-ups were deemed unnecessary. I don't feel that the application is particularly slow right after startup, so I don't think it's necessary.

However, this might be due to the characteristics of my project's application, so I don't think warm-ups are always unnecessary for all applications. In fact, for applications using JSP, it's still better to perform warm-ups. So, if warm-ups become necessary, I'll refer to this session.

- <https://speakerdeck.com/kazu_kichi_67/java-x-spring-bootzhi-apurikesiyonnokorudosutatonili-tixiang-kau>

## In-House Development Community Activities ~Batch Processing Design and Batch Development with Spring Boot~
The session I most wanted to attend at this event was this one. It's not an exaggeration to say that I came all the way to Nishi-Shinjuku on a precious Sunday just for this.

Currently, I'm considering how to design batch architecture on the cloud for work, and I'm facing many challenges. Since the renowned NRI was going to teach about batch processing using Spring Boot, I definitely wanted to attend.

The content included aspects of NRI's products and services, but even with that, I personally gained a lot. Here are two things that left an impression on me.

### 1. Not Using Spring Batch
The first point is "We don't use Spring Batch!" This was somewhat shocking.

The reason for not using it is that "When creating a batch with Spring Batch, you need to follow the architecture model of Reader, Processor, Writer, which is a high hurdle for design. You might think of using Tasklet for more freedom, but if so, there's no need to use Spring Batch." I couldn't help but agree 120% with this.

It's really true. Spring Batch seems good at first glance, but the more you think about it, the more it feels like a burden. I thought it was just my lack of effort, so I couldn't say it out loud before, but now I can proudly say, "Even NRI doesn't use it."

### 2. Consistency in Terminology is Important
In the speaker's department, they have two guides: a "Design Guide" for what to consider in batch applications without relying on implementation, and a "Development Guide" for implementing batch applications using Spring Boot without Spring Batch. In the introduction of the "Design Guide," it was mentioned that defining and aligning terminology is crucial when designing batches.

For example, the term "batch" dictionary-wise means "processing together," but in practice, processing done at a single point in time is also classified as batch processing. So, even if it's called a batch, it might mean different things to different people.

There was also talk about how parallel processing, multi-processing, job and job net, task and group can be referred to differently depending on the organization or culture, making it very important to align terminology.

I was thinking, "That's so true," as I listened. I'm influenced by JP1, so I use JP1 terminology, which is perfectly understood by those familiar with JP1, but I often struggle to explain it to those who aren't. So, if there were such a wonderful glossary, I'd definitely want to use it.

In the final Q&A session, I boldly asked about my concern, "How does the guide address the differences in batch creation between cloud and on-premises?" and received a very thorough response.

The speaker's department is working on preparing the guides and developing a batch framework using Spring Boot for public release. I look forward to referring to it when it's available.

## Hitting the “Refresh” Button on Your Spring Web Application
This session was conducted entirely in English, both the materials and the presentation. I'm not very good at English, but since someone from Broadcom (VMware) was introducing cool and useful Spring features, I decided to attend, thinking that code is universal and I might understand some of it.

Indeed, I somewhat understood the content, but it was quite nerve-wracking.

The staff kindly said in Japanese that the code might be hard to see from the back, so please come to the front. I forgot my glasses, so I moved to the very front center, but this was a mistake in a way...

In sessions, speakers often check the audience's reactions, and it felt like they were focusing on me. Honestly, I didn't understand even 10% of what was being said, but I had to pretend to understand, fearing they might ask, "Are you okay? What's unclear?" So, I just kept nodding along.

Moreover, there were several instances where they asked the audience to raise their hands if something applied to them, but I didn't understand the question. I was worried about raising my hand alone or not raising it when everyone else did, so I just raised my hand anyway and thought, "Phew, everyone else is raising their hands too."

It was an unsettling session due to my own reasons, but the content introduced four recommended features of Spring Boot 3 and later:

- Support for Virtual Threads introduced in Java 21 (explained in detail)
- A new reactive RestClient (briefly mentioned)
- Service Connections that make Docker and docker-compose more convenient (seemed to be a favorite feature)
- Faster startup with CDS and convenient Spring features (also seemed to be a favorite feature)

At the end, the speaker introduced the GitHub repository used for the demo, so I'll include it here. Just looking at this seems educational, so getting this URL was a gain. Despite the nervousness, it was worth attending.
- <https://github.com/snicoll/ops-status>

## Reviewing Recent Convenient Features of Spring Boot!
I attended a session by making-san, who is very famous in the Spring community and works at Broadcom. The content is available in the materials, so please take a look there, but from both Stefan's and making-san's sessions, I understood that @ServiceConnection and speed-up with CDS are must-use features.

- <https://bit.ly/jjug24fmaki>

These were my impressions from attending the event.
