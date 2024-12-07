---
title: >-
  Took the AWS Certified Machine Learning Engineer - Associate Beta Exam and
  Completed All 15 AWS Certifications
author: kazuyuki-shiratani
date: 2024-12-06T00:00:00.000Z
tags:
  - AWS認定
  - advent2024
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2024/
image: true
translate: true

---

This is the 6th day article for the [Mamezou Developer Site Advent Calendar 2024](/events/advent-calendar/2024/).

## Introduction

Recently, I took the "AWS Certified Machine Learning Engineer - Associate Beta" exam, so I’ve summarized my preparation and impressions.

:::info
Due to the [Non-Disclosure Agreement (NDA)](https://aws.amazon.com/jp/certification/certification-agreement/), I cannot discuss specific details of the exam. Thank you for your understanding.
:::

## About the Exam

The [AWS Certified Machine Learning Engineer - Associate (hereafter referred to as Machine Learning Engineer)](https://aws.amazon.com/jp/certification/certified-machine-learning-engineer-associate/) is described as follows:

- Exam Overview (as of 2024/12/6)
  - The AWS Certified Machine Learning Engineer - Associate (MLA-C01) exam validates the candidate's ability to build, operationalize, deploy, and maintain machine learning (ML) solutions and pipelines using AWS Cloud.
  - Category: Associate
  - Exam Duration: 130 minutes
  - Number of Questions: 65
  - Passing Score: 720
  - Exam Fee: $150 (20,000 yen + tax)

The beta version was 170 minutes with 85 questions, so the number of questions has been reduced.

## Preparation

Similar to the AWS Certified AI Practitioner, I watched the relevant lectures on Skill Builder to gain knowledge about AWS services and generative AI.

### Exam Guide

- Read the [Exam Guide](https://d1.awsstatic.com/ja_JP/training-and-certification/docs-machine-learning-engineer-associate/AWS-Certified-Machine-Learning-Engineer-Associate_Exam-Guide.pdf) to understand the exam scope, format, and passing criteria.
  - Questions are drawn from four domains:
    - 1. Data Preparation for Machine Learning (ML) (28%)
    - 2. ML Model Development (26%)
    - 3. Deployment and Orchestration of ML Workflows (22%)
    - 4. Monitoring, Maintenance, and Security of ML Solutions (24%)

### Books

- Read books related to machine learning services to learn how to use and apply relevant services and best practices.
  - [Amazon Bedrock 生成AIアプリ開発入門 [AWS深掘りガイド]](https://www.amazon.co.jp/dp/4815626448)
  - [実践 AWSデータサイエンス ―エンドツーエンドのMLOpsパイプライン実装](https://www.amazon.co.jp/dp/4873119685)
- Books I wanted to read but couldn’t:
  - [AWSではじめる生成AI　RAGアプリケーション開発から、基盤モデルの微調整、マルチモーダルAI活用までを試して学ぶ](https://www.amazon.co.jp/dp/4814400721)

### Skill Builder

- Watched relevant lectures on Skill Builder to gain knowledge about AWS services and generative AI.
  - [Standard Exam Prep Plan: AWS Certified Machine Learning - Associate (MLA-C01)](https://explore.skillbuilder.aws/learn/learning_plan/view/2191/plan)
    - Only available in English, but I used browser-based subtitles to translate into Japanese.
  - [Enhanced Exam Prep Plan: AWS Machine Learning - Associate (MLA-C01)](https://explore.skillbuilder.aws/learn/learning_plan/view/2192/plan)
    - Only available in English, but I used browser-based subtitles to translate into Japanese.
    - A subscription is required.

### Official Practice Questions

- Solved official practice questions to assess my understanding and familiarize myself with the exam format.
  - [AWS Certified Machine Learning Engineer - Associate Official Question Set (MLA-C01 - English)](https://explore.skillbuilder.aws/learn/course/internal/view/elearning/19688/exam-prep-official-practice-question-set-aws-certified-machine-learning-engineer-associate-mla-c01-english)
    - Contains 20 sample questions.
    - Since it’s only available in English, I used browser translation features while solving.
    - The browser translation often produces literal translations, making some parts difficult to interpret.
  - [Official Pretest: AWS Certified Machine Learning Engineer - Associate (MLA-C01)](https://explore.skillbuilder.aws/learn/course/internal/view/elearning/19742/exam-prep-official-pretest-aws-certified-machine-learning-engineer-associate-mla-c01-english)
    - Contains 65 sample questions.
    - A subscription is required.
    - Since it’s only available in English, I used browser translation features while solving.
    - The browser translation often produces literal translations, making some parts difficult to interpret.

### About Skill Builder Subscriptions

Here are some things I learned after subscribing to Skill Builder. For details, refer to [here](https://skillbuilder.aws/subscriptions).

- Costs $29/month.
- Billed via the AWS account.
- Event-issued credits cannot be used.
- The subscription fee for the registration month is prorated based on the registration date.

## Points to Note

- I realized that the following knowledge is essential rather than just knowledge of generative AI:
  - Knowledge of machine learning services like SageMaker
  - Methods for evaluating fine-tuned AI
  - Knowledge of responsible AI
- Similar to other exam categories, it is important to understand the best practices for AWS services.
- It is necessary to organize which services to choose based on constraints in the questions (e.g., time required for analysis, real-time requirements).
  - For processes exceeding 15 minutes, choose ECS or Batch instead of Lambda.
  - For real-time requirements, choose Glue for ETL.
  - If data processing can wait until the next day, store it in S3 and process it with Spot Instances.

## Exam

Compared to the AWS Certified Machine Learning – Specialty, the questions were shorter, but the difficulty level didn’t feel much different.

I felt there were more questions that made me hesitate compared to the official practice questions.

The translation quality was easier to read compared to browser translation tools.

Although the exam duration was 170 minutes, I completed it in about 120 minutes as I only lightly reviewed my answers.

As announced in the [addition of new exam question types](https://aws.amazon.com/jp/blogs/news/aws-certification-new-exam-question-types/), one question of a new format different from traditional ones was included. These are also present in the official practice questions, so I recommend experiencing them beforehand.

## After the Exam

The results were not available immediately; I received an email after 7 PM, and I could check the results on the portal site.

The score was comfortably above the passing mark.

## Summary

- I successfully obtained all 15 AWS certifications currently available.
- The exam itself shouldn’t feel too difficult if you’ve already obtained other AWS certifications at the Associate level or higher.
- Given current trends, you might feel inclined to prepare for generative AI knowledge, but keep in mind that the focus is on machine learning and responsible AI knowledge.

I hope this brief summary will be helpful for those planning to take the exam.
