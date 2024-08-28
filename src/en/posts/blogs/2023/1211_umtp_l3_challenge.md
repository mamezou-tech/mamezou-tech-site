---
title: I took the UMTP certification from L1 to L3, so I'll summarize it
author: kazuyuki-shiratani
date: 2023-12-11T00:00:00.000Z
tags:
  - UML
  - UMTP
  - モデリング
  - UMTP認定試験
  - advent2023
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2023/
image: true
translate: true

---



This is the article for the 11th day of the Mamezou Developer Site Advent Calendar 2023.

## Introduction

It's Shiratani, back after a year.

In my first year of joining the company in 2022, I achieved 12 AWS certifications and was feeling a bit burned out, but I felt a sense of crisis that I did not have the modeling skills essential at Mamezou, so I decided to challenge the UMTP certification while studying modeling.

I will summarize the preparation for the examination.

## What is UMTP Certification?

The UMTP certification exam is operated by the NPO UML Modeling Promotion Council (UMTP) and certifies skills in UML modeling.

There are classifications from L1 to L4, and each level has a defined body of knowledge and skill set required. [See official website](https://umtp-japan.org/about_exam)

| Level | Modeling Skill | Description |
| - | - | - |
| L4 | Can instruct modeling based on practice | ・Has L3 skills and has experience practicing modeling in development projects for a certain number or period |
| L3 | Can practice modeling in actual work | ・Can define high-quality models in terms of scalability and ease of change<br>・Has specialized knowledge for business modeling, analysis, architectural design, and embedded development (selective areas) |
| L2 | Can read and write UML models normally (has modeling literacy) | ・Can model part of the development scope<br>・Can understand the meaning of other people's models |
| L1 | Understands the meaning of simple UML models | ・Has the minimum knowledge required for modeling using UML, etc. |

:::info
Certification for levels L2 to L4 used to require lower-level certification, but it has been announced that lower-level certification will no longer be necessary in the future.
[Notice of certification digitization and changes in passing/certification philosophy](https://umtp-japan.org/cat-exam/13858)
:::

:::info
I applied for the exam at Pearson VUE, but perhaps because I forgot to enter my Japanese name during user registration, I could not register a Japanese address for the delivery of the certification. I contacted Pearson VUE, and they responded by allowing me to change the name by sending an image of an identification document (such as a driver's license).
However, since the certification is likely to be digitized, a Japanese address may no longer be necessary.
[Notice of certification digitization and changes in passing/certification philosophy](https://umtp-japan.org/cat-exam/13858)
:::

## UMTP Level 1

The exam tests the following skill level. [L1 exam](https://umtp-japan.org/about_exam/exam_gaiyo/l1)

- Has the minimum knowledge required for modeling using UML, etc.
- Tests introductory skills and knowledge of OO modeling and OO iterative development processes using UML.

The exam is a computer-based test (CBT) with 30 multiple-choice questions in 80 minutes. If you understand the basics of UML, you should have no problem.

Since I did not even have the basics of UML, I watched the [UML Modeling Skills Certification Exam L1 Preparation Seminar](https://youtu.be/DRBJoWGMzoM?si=54Kv8BYYwBzu-qK3) and studied the "[UML Modeling Skills Certification Exam Introductory Level (L1) Workbook](https://gihyo.jp/book/2007/978-4-7741-3245-7)" thoroughly before taking the exam.

I scored 96% (with 80% being the passing line).

:::info
The "[UML Modeling Skills Certification Exam Introductory Level (L1) Workbook](https://gihyo.jp/book/2007/978-4-7741-3245-7)" includes two exams, "L1-T1 (Basic Knowledge)" and "L1-T2 (Junior Modeling)".
Currently, L1-T1 is no longer conducted, and L1-T2 has become the L1 exam.
:::

## UMTP Level 2

The exam tests the following skill level. [L2 exam](https://umtp-japan.org/about_exam/exam_gaiyo/l2)

- Can read and write UML models normally.
- Can model part of the development scope and understand the meaning of other people's models.

The exam is a CBT with 15 questions (actually 22-24 questions as some are divided into multiple sub-questions) in 85 minutes, multiple-choice style.

I looked for reference books for the L2 exam, but most were out of print, and the only one I could find was the "[Thorough Guide UML Modeling Skills Certification Exam L2 Corresponding Workbook](https://book.impress.co.jp/books/2662)", which I solved thoroughly before taking the exam.

I scored 81% (with 65% being the passing line).

In my previous job, I used notation methods according to project-specific rules without using UML, but while solving the problems, I thought, "I could have written it like this using UML," and "Using this diagram would make it easier to express," which helped me understand by applying it to past designs.

## UMTP Level 3

The exam tests the following skill level. [L3 exam](https://umtp-japan.org/about_exam/exam_gaiyo/l3)

- Can effectively implement modeling in actual work and properly review models created by others.
- Can define high-quality models in terms of scalability and ease of change.
- Has specialized knowledge in one of the areas required for business modeling, requirement analysis, architectural design, or embedded development.

The exam is a CBT with 3 modeling essay questions (actually about 10 questions as some are divided into multiple sub-questions) and 5 multiple-choice questions on basic knowledge in 120 minutes.

The L3 exam has been in a new format since December 2022, where you take the exam on your own PC.

There was little information online about this new format, and it was confusing at first, such as not knowing when I could take the exam after applying.

When I was wondering what to do, the certification with the required L2 certification number arrived, so I just applied. The process was as follows:
- Refer to [Exam Environment Setup](https://umtp-japan.org/download/l3%e5%8f%97%e9%a8%93%e7%92%b0%e5%a2%83%e8%a8%ad%e5%ae%9a%e3%80%80ver-1) and perform an operation check
- Go to [Application Form](https://umtp-japan.org/l3entry) and enter the necessary information
- Receive an email with a link to the "L3 Exam Payment Page", complete the payment
  - Receive an email with a receipt after payment
- Receive an email with "L3 Exam ID" (probably the next day)
	- This email states, "Please take the exam within one month according to the L3 exam procedure."
- Take the exam according to the [Exam Procedure](https://umtp-japan.org/download/l3%e5%8f%97%e9%a8%93%e6%89%8b%e9%a0%86%e3%80%80ver-1)

So, I had to take the exam within a month after applying.

There are no reference books for the L3 exam, and the only resources are the official [Sample Questions](https://umtp-japan.org/about_exam/exam_sample) 4 questions.

Since I only solved workbooks for the L2 exam, I wanted to input knowledge on how to proceed with modeling, so I quickly bought the used "[UML Modeling L2 [2nd Edition]](https://www.shoeisha.co.jp/book/detail/9784798109831)".

Also, although not directly related to the UMTP certification exam, the following books were helpful:
- "[The Essence of UML Modeling 3rd Edition](https://www.shoeisha.co.jp/book/detail/9784798107950)"
- "[Thorough Use of UML by Diagram 2nd Edition](https://www.shoeisha.co.jp/book/detail/9784798118444)"
- "[UML Modeling Lessons](https://bookplus.nikkei.com/atcl/catalog/08/P83490/)"

After inputting the knowledge thoroughly, I considered where to take the exam, and I thought the best time would be late at night on a holiday when the children were asleep, so I took the exam overnight.

The result was 78% (with 77% being the passing line). The score was displayed at the end of the exam, and a PDF with the score was sent the next morning.

## Summary

It took 37 days from taking the L1 exam to taking the L3 exam. I am still impatient and not good at long-term studies, as always.
Considering that the result of L3 was just on the edge, I realized that I still need to gain more experience.
However, learning UML notation had many advantages.
- In situations where I used to wonder how to express something, I can now express it easily using UML.
- It's easier to output for organizing my thoughts.
- There are many tools that handle UML, so I don't have to worry about how to express it.
- When creating documents in markdown, I can describe simple diagrams using Mermaid.

Furthermore, UMTP certification goes up to [L4 exam](https://umtp-japan.org/about_exam/exam_gaiyo/l4). As stated in the [2023 L4 Exam Implementation Guidelines](https://umtp-japan.org/cat-exam/13852), the application deadline for the 2023 fiscal year is the publication date of this article (12/11). Unlike the AWS certification, I never thought of rushing through it, so I want to gain modeling experience to reach the level where I can take the exam.
