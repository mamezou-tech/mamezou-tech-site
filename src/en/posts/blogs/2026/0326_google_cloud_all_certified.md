---
title: >-
  Conquering All Google Cloud Certifications! The True Story of Being Thwarted
  Just One Step from the Finish Line
author: kazuyuki-shiratani
date: 2026-03-26T00:00:00.000Z
tags:
  - Google Cloud
  - Google Cloud認定
image: true
translate: true

---

## Introduction
I have previously written several articles on the Mamezou Developer Site about AWS certifications (such as achieving 12 crowns in 2022 and obtaining new certifications since then). Currently, I have obtained all AWS certifications except for the latest “Generative AI Developer – Professional (AIP-C01).”

As someone so focused on AWS, this time I took on the challenge of “conquering all Google Cloud certifications.” To cut to the chase: I attempted to complete them all in about two months, but I was stopped just one step short. In this article, I summarize why I aimed for Google Cloud certifications, my impressions from the short, intensive exam period, my recommended exam order, and why I ultimately fell short.

:::info
Due to a non-disclosure agreement (NDA), I cannot cover detailed exam content; please understand.  
Also, the information provided is as of March 2026.
:::

## The Motivation to Pursue Google Cloud Certifications
It all started with a project I was involved in during the summer of 2025. That project was being developed on Google Cloud, but since my role was API development on the AWS side, I didn’t actually work with the Google Cloud environment. However, I thought, “It would be good to know this for the future,” so as part of my studies I took and passed the Google Cloud Associate Cloud Engineer (ACE) exam.

At that time, the timing overlapped with my AWS certification renewals, so I prioritized those first. Then, after I met the requirements for “Japan AWS All Certifications Engineers” in December 2025, I began seriously aiming to conquer all Google Cloud certifications.

## The Two-Month Exam Blitz and Test Center Inside Stories
Starting with the Professional Cloud Architect exam at the end of December 2025, I powered through all the remaining certifications over January and February 2026—about two months in total.

Below is my exam history. I’ve included the Associate Cloud Engineer exam I had already passed.

| No | Exam Date  | Certification Name                                                                 | Abbreviation | Exam Language | Result   |
| :-:| :-:        | -                                                                                   | :-:          | :-:           | :-:      |
| 1  | 2025-09-15 | [Associate Cloud Engineer](https://cloud.google.com/certification/cloud-engineer)     | ACE          | Japanese      | Passed   |
| 2  | 2025-12-27 | [Professional Cloud Architect](https://cloud.google.com/certification/cloud-architect) | PCA          | Japanese      | Passed   |
| 3  | 2026-01-12 | [Professional Cloud Developer](https://cloud.google.com/certification/cloud-developer) | PCD          | Japanese      | Passed   |
| 4  | 2026-01-17 | [Professional Cloud DevOps Engineer](https://cloud.google.com/certification/cloud-devops-engineer) | PCDOE        | Japanese      | Passed   |
| 5  | 2026-01-25 | [Professional Cloud Network Engineer](https://cloud.google.com/certification/cloud-network-engineer) | PCNE         | Japanese      | Passed   |
| 6  | 2026-01-29 | [Cloud Digital Leader](https://cloud.google.com/certification/cloud-digital-leader)  | CDL          | Japanese      | Passed   |
| 7  | 2026-01-31 | [Professional Cloud Security Engineer](https://cloud.google.com/certification/cloud-security-engineer) | PCSE         | Japanese      | Passed   |
| 8  | 2026-01-31 | [Professional Security Operations Engineer](https://cloud.google.com/learn/certification/security-operations-engineer) | PSOE         | English       | **Failed** |
| 9  | 2026-02-05 | [Associate Google Workspace Administrator](https://cloud.google.com/certification/associate-google-workspace-administrator) | AGWA         | Japanese      | Passed   |
| 10 | 2026-02-08 | [Associate Data Practitioner](https://cloud.google.com/learn/certification/data-practitioner) | ADP          | Japanese      | Passed   |
| 11 | 2026-02-08 | [Generative AI Leader](https://cloud.google.com/learn/certification/generative-ai-leader) | GAIL         | Japanese      | Passed   |
| 12 | 2026-02-11 | [Professional Data Engineer](https://cloud.google.com/certification/data-engineer)   | PDE          | Japanese      | Passed   |
| 13 | 2026-02-13 | [Professional Cloud Database Engineer](https://cloud.google.com/certification/cloud-database-engineer) | PCDBE        | English       | Passed   |
| 14 | 2026-02-21 | [Professional Machine Learning Engineer](https://cloud.google.com/certification/machine-learning-engineer) | PMLE         | Japanese      | Passed   |

Note that the exam provider for Google Cloud certifications was Kryterion until February 23, 2026; from March onward it switched to Pearson VUE.

In my region, during the Kryterion era there was only one test center option, but after the switch to Pearson VUE multiple centers became available. Also, with Kryterion you couldn’t change your exam date within 72 hours (unless you paid a fee), whereas with Pearson VUE you can reschedule up to 24 hours before—great news for test-takers.

By the way, I visited the same test center 11 times in those two months (twice on the same day), so the staff had completely memorized my face. When I chatted with them, I heard they were preparing to support Pearson VUE as well, and indeed from mid-March they began, so I’ll be able to keep using my familiar center going forward.

### Note on Payment in US Dollars
One more tangent related to test centers: what really struck me when taking so many exams in a short period was the difference in the exam fee currency. AWS certification fees are settled in Japanese yen (JPY), but Google Cloud certification fees are paid in US dollars (USD) on the provider’s screen. Professional-level exams cost $200 each, so taking many in a short period means your credit card bill is directly affected by exchange rates. If you use your company’s certification support for expense reimbursement, I recommend building in some buffer for currency fluctuations when applying for your budget.

## Overall Difficulty: Comparison with AWS Certifications
The reason I was able to pass so many exams in such a short time was that most of the certifications I passed could be cleared by reusing AWS knowledge. Additionally, I found that having a solid grasp of Google’s proposed SRE (Site Reliability Engineering) concepts is crucial.

There was also a difference in the volume of text. AWS Certifications at the Professional and Specialty levels have lengthy problem statements and answer choices, making them hard to parse, whereas Google Cloud Professional exams mostly have question lengths similar to AWS Associate-level, so they weren’t too difficult to read.

### The Key to Google Cloud Exams: Core Concepts of SRE
Across multiple exams (especially Cloud Architect and DevOps Engineer), Google’s core SRE concepts appear frequently as a common language. Mastering these lets you immediately pick the “correct action” that Google Cloud recommends in scenario questions.

- **SLI / SLO / SLA Differences**: Understanding the roles of Service Level Indicator (SLI)—the metric for measuring service reliability; Service Level Objective (SLO)—the shared target between development and operations teams; and Service Level Agreement (SLA)—the business contract with customers.
- **Error Budget**: Rather than aiming for 100% availability, you define an “allowable budget for failures”—if you’re within budget you prioritize new feature releases, and if the budget is exhausted you focus on improving reliability (bug fixes, etc.).
- **Toil Reduction**: The practice of minimizing manual, repetitive, non-self-healing operational work (“toil”) by systematizing or automating processes.
- **Blameless Postmortem**: After an incident, instead of blaming individuals you analyze system or process deficiencies and focus on building mechanisms to prevent recurrence in your own environment.

## Conceptual Differences Between AWS and Google Cloud (Points to Note for Exams)
While many questions can be solved with AWS knowledge, there are some critical differences in basic architecture concepts that the exams test. Here are a few representative examples:

- **Scope of VPC**: In AWS, a VPC is created within a specific region, whereas in Google Cloud a VPC is a global resource. Subnets you create under the VPC are tied to individual regions, so the approach to building multi-region networks differs significantly.
- **Resource Management Units (Account vs. Project)**: AWS uses the “AWS account” boundary to separate environments and permissions, while Google Cloud uses “projects” as the basic unit, which are organized hierarchically under “folders” and “organizations.”
- **Load Balancer Placement**: AWS’s main load balancers (such as ALB) are regional resources, whereas Google Cloud’s global load balancer (Cloud Load Balancing) can use a single Anycast IP address to route traffic from users worldwide to the nearest region.

## Impressions of Each Level and Notable Exams
Google Cloud certifications don’t have a mechanism like AWS’s “higher certification automatically renews lower ones.” Therefore, you must individually renew each certification before its expiration (2 or 3 years). However, for those whose certifications are approaching expiry, Google offers a special **Recertification Exam**, which differs from a usual new exam, so at renewal time you’ll follow the official guidance and take that.

### Foundation Level
50–60 questions. 90 minutes. $99 (excluding tax). Valid for 3 years.

Cloud Digital Leader (CDL) and Generative AI Leader (GAIL) mainly cover basic content like which Google Cloud services are available and general AI overviews. Although the allotted time is 90 minutes, the volume can be completed in about 45 minutes.

### Associate Level
50–60 questions. 120 minutes. $125 (excluding tax). Valid for 3 years.

Associate Cloud Engineer (ACE) and Associate Data Practitioner (ADP) can be quickly solved by rehashing AWS knowledge. Even though you have 120 minutes, you can finish in under an hour.

A slightly different flavor is Associate Google Workspace Administrator (AGWA). As the name suggests, it doesn’t cover Google Cloud, but focuses on Google Workspace administration (audit handling, offboarding, onboarding, tasks needed for corporate mergers, etc.). I already managed my own domain email and had migrated to Google Workspace to use Gemini, so I was familiar with the concepts and handled it smoothly.

### Professional Level
50–60 questions. 120 minutes. $200 (excluding tax). Valid for 2 years.

As mentioned, the problem statements are about the length of AWS Associate-level, so they aren’t too hard to read. However, occasionally longer passages appear, so don’t let your guard down.

### Notable Question Types
In Professional Cloud Architect (PCA), there was a case-study question where about half the screen (adjustable) displayed the example company’s description, and you select answers based on that. Note that this exam format is scheduled to be updated on March 30, 2026, so the format may change in the future.

Also, Professional Cloud Network Engineer (PCNE) featured the maximum number of questions (60) officially stated for any exam. Because of the higher question count, maintaining concentration was a tougher physical challenge. I realized the total number of questions at question 39, which was psychologically jarring. I recommend checking the total number of questions at the start.

## The One Wall: The Difficulty of PSOE and Lessons Learned
My undefeated streak came to an end at the midpoint exam, Professional Security Operations Engineer (PSOE), where I failed.

While other exams (AWS certifications and Google Cloud exams apart from PSOE) mainly ask “how to design,” PSOE focuses on “how to respond when incidents occur.” The security tools covered are specialized, and above all I made the mistake of trying to understand and solve the English-only questions despite not being strong in English.

PSOE is not available in Japanese. I had hoped it would be localized when the exams moved to Pearson VUE, but there’s no sign of that yet. I managed to get by with the English-only Professional Cloud Database Engineer (PCDBE) because its content was straightforward, but the complex scenarios in PSOE gave me a tough time.

## Shifting Study Methods and Utilizing "Google Cloud Skills Boost"
Until now, I had been using third-party materials (like Udemy practice questions) to prepare. However, some of the Udemy materials I relied on were removed, so I’m changing my approach going forward.

From now on, I plan to fully utilize the official learning platform, **Google Cloud Skills Boost**.

### What Is Google Cloud Skills Boost?
Google Cloud Skills Boost is an on-demand learning platform officially provided by Google Cloud. Its main features include:

- Practical hands-on labs: Use a temporary Google Cloud environment to learn by working directly in the console and CLI.  
- Certification-focused learning paths: Courses and quests systematically organized around each exam’s scope.  
- Conceptual explanations in Japanese: Abundant videos and documentation explaining service concepts and best practices in Japanese.

For exams like PSOE that require practical troubleshooting, you need to know actual behavior, not just memorize information. Therefore, I realized it’s best to follow this sequence: **“First grasp the concepts and response methods in Japanese → then practice reading them in English.”** Using Skills Boost’s hands-on labs enables exactly that.

## Recommended Exam Order and Difficulty (Entirely Subjective)
For those aiming for Google Cloud certifications, here is my recommended exam order and subjective difficulty (★ out of 5). The basic strategy is to proceed in the order of **Infrastructure → Data → Machine Learning → Administration**. By thoroughly understanding network boundaries and security in the infrastructure phase, you can directly apply that knowledge in the data and later phases.

Looking back (though I haven’t fully conquered all certifications yet), I feel I followed a very logical exam order.

| Exam No | Domain         | Certification Name                                   | Difficulty | Notes / Reasons                                                                                     |
| :-:     | :-:            | -                                                    | :-:        | -                                                                                                   |
| 1       | Infrastructure | Cloud Digital Leader                                 | ★☆☆☆☆     | Anytime.<br/>If taken before ACE, it provides a brief introduction.<br/>If taken after higher certifications, you can pass with almost no study. |
| 2       | Infrastructure | Associate Cloud Engineer                             | ★★☆☆☆     |                                                                                                     |
| 3       | Infrastructure | Professional Cloud Architect                         | ★★★☆☆     |                                                                                                     |
| 4       | Infrastructure | Professional Cloud Developer                         | ★★★☆☆     |                                                                                                     |
| 5       | Infrastructure | Professional Cloud DevOps Engineer                   | ★★★☆☆     |                                                                                                     |
| 6       | Infrastructure | Professional Cloud Network Engineer                  | ★★★★☆     |                                                                                                     |
| 7       | Infrastructure | Professional Cloud Security Engineer                 | ★★★☆☆     |                                                                                                     |
| 8       | Infrastructure | Professional Security Operations Engineer            | ★★★★★     | English only.                                                                                       |
| 9       | Data           | Associate Data Practitioner                          | ★★☆☆☆     |                                                                                                     |
| 10      | Data           | Professional Data Engineer                           | ★★★★☆     |                                                                                                     |
| 11      | Data           | Professional Cloud Database Engineer                 | ★★★☆☆     | English only.<br/>Anytime.<br/>I recommend this around the PDE stage since it also deals with data. |
| 12      | Machine Learning | Generative AI Leader                                | ★☆☆☆☆     | Anytime.<br/>If taken before PMLE, it provides a brief introduction.<br/>If taken after PMLE, you can pass with almost no study. |
| 13      | Machine Learning | Professional Machine Learning Engineer              | ★★★★★     |                                                                                                     |
| 14      | Administration | Associate Google Workspace Administrator              | ★★☆☆☆     | Anytime.                                                                                            |

## Conclusion
My goal of “conquering all certifications undefeated in about two months” was thwarted only by PSOE, but I proved that with an AWS knowledge base, catching up on Google Cloud is remarkably smooth.

I initially planned a revenge attempt in March, but due to various circumstances and material revisions, I postponed it to April. In April, I will use the new study approach with Skills Boost to challenge PSOE again, and I’ll do my best so I can finally publish an article titled “All Google Cloud Certifications Achieved”!
