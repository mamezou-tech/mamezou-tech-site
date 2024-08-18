---
title: Do You Gain a Little by Knowing? The World of Java's Obsolete Terms
author: toshio-ogiwara
date: 2024-04-12T00:00:00.000Z
tags:
  - java
  - 新人向け
image: true
translate: true

---

:::info
To reach a broader audience, this article has been translated from Japanese.
You can find the original version [here](https://developer.mamezou-tech.com/blogs/2024/04/12/death-lang-java/).
:::



Spring is here. I believe many people are starting to learn the Java language at companies and schools. Java, which many people are starting to learn now, has a reasonably deep history, so terms that are no longer used or have been replaced by others still appear on the internet.

Old-timers who have been doing Java for a long time can ignore such old terms or mentally convert them to other terms, but I don't think that's the case for those who have just started. To avoid being worn out by such obsolete terms, this time I will explain about three representative obsolete terms that you still see today, why they became obsolete, and how to deal with them.

Note, this is not a Java history textbook, so I will explain the historical aspects briefly and with a bit of humor, so please view it in that spirit.

## Obsolete Term #1: J2SE
### Explanation of the Term
The leadoff batter has to be this one, J2SE! This is what is now called Java Standard Edition (Java SE), but a long time ago, it was called Java2 Standard Edition, abbreviated as J2SE. The most sinful part of this naming is the "Java2" part.

Java versions evolved from 1.0 to 1.1 to 1.2 in the late 1990s, and the "2" in "Java2" referred to versions from Java 1.2 onwards.

Why was it called Java2 from Java1.2 onwards? In Java1.2, Java's functionality was greatly expanded, including the Collection framework such as List and Map. Therefore, to imply that Java1.1 and 1.2 were different entities, a new term, Java2, was created, distinguishing versions from Java1.2 onwards as Java2 Standard Edition, or J2SE.

The term J2SE fell out of use when Java changed to Java SE 5 (or 5.0) from version 1.5, but the version naming continued to be chaotic up to Java9, sometimes referred to as Java 1.8 or Java8.

### How to Deal With It
- Currently, there is no need to remember this term, and you should not use it, definitely.
- If you come across this term in old documents, just mentally convert it to "what is now called Java SE."
- If you see the term J2SE in a job posting, stay away (I won't say more, but please understand).

## Obsolete Term #2: J2EE
### Explanation of the Term
The next obsolete term that cannot be missed is J2EE. It was very commonly used together with J2SE, and you still see it nowadays.

In addition to the previously explained Standard Edition, Java has an Enterprise Edition that defines and includes APIs necessary for creating enterprise applications, such as the Servlet API, based on the Standard Edition.

As you might have guessed, J2EE stands for Java2 Platform, Enterprise Edition, meaning the Enterprise Edition based on the Standard Edition from Java2 onwards.

The versions of J2EE followed similarly to J2SE, from J2EE 1.2 to 1.3 to 1.4, but like J2SE, it changed to Java EE 5 from version 1.4 onwards and is no longer used today.

Currently, Java EE has been replaced by Jakarta EE. Although Java EE versions like Java EE 7 or Java EE 8 are still actively used, the term Java EE is still commonly used today, even though it has been replaced by Jakarta EE (not an obsolete term).

### How to Deal With It
- There is no need to know the term J2EE in the mid-2020s.
- If you hear an old man loudly saying "J2EE's Servlet in the topic of Spring MVC," you can raise your stock by telling him "It's Jakarta EE now." However, be careful how you say it as you might receive a persistent backlash.
- If you come across this term in old documents, just mentally convert it to "what is now called Jakarta EE (Java EE)."
- The term J2EE is still often seen in job postings. It's unlikely that they are actually developing using J2EE in this era, so it's probably just that they haven't updated their job posting page. However, it's wise to avoid companies that still use this term as is.

## Obsolete Term #3: EJB
### Explanation of the Term
Following J2EE, we must not forget EJB, the synonym for J2EE, which once swept the world?

EJB stands for Enterprise Java Beans, a technology for creating enterprise Java Beans included in J2EE. At that time, distributed object technology, which distributed objects and made them work together to realize application functions, was considered the most sublime and valuable.

However, before J2EE appeared, Java had bare distributed object technologies like RMI, but they were not integrated with essential business application technologies like transactions and distributed object search, and they could not be used nicely together. Until J2EE appeared, Java was ridiculed by some high-minded people saying, "Java is just a toy, right?" or "You can't create serious business applications with Java, right?"

In such an environment, EJB made its grand entrance. EJB integrated various hefty and complex specifications like JTA, which realized distributed transactions, and JNDI, which performed searches for distributed objects, each of which was sublime technology at that time, making it sufficient to create serious business applications.

However, EJB, while being highly functional, became too complex and difficult to handle. For example, because the foundation was distributed objects, it required steps like inheriting the promised interfaces and base classes, and generating stubs and skeletons to be deployed on the client and server separately from Java's compilation, such as ejbc.

I also, without doubting it when Sun Microsystems said this is the era of EJB, received it like a divine oracle and devoted myself to studying it day and night, sparing no time for sleep, and to the hell of debugging distributed objects. But then, I suddenly realized, "What's so great about EJB, anyway?"

The selling point of EJB was "With EJB, you can distribute objects to create scalable and robust systems! And, EJB runs anywhere as long as it's an EJB container compliant with the J2EE specification. Thus, you can distribute the business components (EJB) you create based on this componentization technology!"

However, most apps don't need to be that robust, and if needed, other means like load balancers could be used. Also, a business component of App A cannot be used as is in the business of App B.

With these factors, although the concept and items of EJB were good, they were over-spec for many apps created with Java, and gradually some engineers started to faintly think, "Sun Microsystems says this is the era of EJB, but who benefits from this?"

Then, the Spring Framework, which has become the de facto standard today, made its dashing appearance. Rod Johnson, in his book "[Expert One-to-One J2EE Development without EJB](https://www.amazon.co.jp/exec/obidos/ASIN/0764558315/ryoasai-22/)," along with the message "What we're trying to do with EJB can be done more simply. Actually, do we even need EJB?" introduced the prototype of the Spring Framework as a framework to realize that. This book and the appearance of Spring quickly eradicated the EJB faith, and the world of Java enterprise applications was rapidly painted in the colors of Spring.

I also read this book, and at that time, when using checked exceptions was considered orthodox and using unchecked exceptions was considered heretical, seeing him loudly say, "Checked exceptions are vulnerable to change and make the code verbose, so we should use unchecked exceptions!" was a very refreshing feeling for me, who had been tormented by checked exceptions.

With all these developments, EJB was splendidly eradicated by the Spring Framework and ceased to be used. Later, EJB3, which was incorporated into Java EE 5, made it a bit easier to use, but it was nowhere near as convenient as the Spring Framework.

The EJB specification is still included in Jakarta EE today, but the leading componentization technology in Jakarta EE is now CDI, and EJB has completed its role. Some may say, "Don't end it on your own!" but frankly, there is no reason to use EJB, right?

### How to Deal With It
- There is absolutely no need to understand EJB, including its internals, from now on. If you have to study EJB, you might as well learn CDI.
- The only time you need to remember it is when you have to maintain a current application that uses EJB.
- Although it is no longer used, EJB contains many element technologies such as distributed objects, distributed transactions, and transaction monitors, which are worth knowing as an engineer.
- I understand the feeling of disappointment when you have to maintain EJB now, but take it as a valuable chance to learn the element technologies contained in EJB. I believe it will help you step up as an engineer with solid foundational skills.

I would like to introduce other obsolete terms such as MVC2 and POJO, but the article has become long, so I will end here. I hope to introduce more in the future if there is an opportunity.
