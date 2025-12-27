---
title: >-
  Three Years After Achieving 12 AWS Certifications: Renewal and New
  Certification Categories
author: kazuyuki-shiratani
date: 2025-12-23T00:00:00.000Z
tags:
  - AWS認定
  - advent2025
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2025/
image: true
translate: true

---

This is the Day 23 article of the [Mamezou Developer Site Advent Calendar 2025](https://developer.mamezou-tech.com/events/advent-calendar/2025/).

## Introduction

It has been three years since I posted the article “[I Completed All 12 AWS Certifications, so I'll Summarize What I Studied](/blogs/2022/12/12/aws_all_certified/)” on December 12, 2022. In this article, I will summarize the changes that have occurred over the past three years and the newly added certification categories.

:::info
Due to the [Non-Disclosure Agreement (NDA)](https://aws.amazon.com/jp/certification/certification-agreement/), please understand that I cannot discuss detailed exam content.
:::

## A Look Back Over Three Years

It has been three years since I achieved the 12 AWS certifications in October 2022. During this period, several certifications reached their expiration dates and required renewal.

### Certification Renewal

AWS certifications have a validity period of three years. The certifications obtained in 2022 needed to be renewed in 2025. This time, five certifications were subject to renewal.

#### Renewal of Two Professional-Level Certifications

Because renewing the two professional-level certifications (Solutions Architect and DevOps Engineer) also renews their prerequisite certifications, I renewed them in January, well ahead of the June expiration. A benefit of professional-level certifications is that they also renew the lower associate-level certifications (Solutions Architect – Associate, Developer – Associate, SysOps Administrator – Associate) at the same time, allowing you to maintain multiple certifications with a single renewal.

- AWS Certified Solutions Architect – Professional  
  - The content was unchanged from before, requiring broad knowledge of architecture centered around Organizations, security, operations, and so on  
  - Many questions were related to enterprise-level design topics, such as multi-account strategies, governance, cost optimization, and disaster recovery  
  - As usual, the question stems were very long, requiring you to read while organizing the requirements  

- AWS Certified DevOps Engineer – Professional  
  - Similarly unchanged from before; the knowledge studied was applicable when taking it alongside the Solutions Architect exam  
  - The main topics covered design of CI/CD pipelines, infrastructure automation, monitoring, and log management  
  - CodeCommit, which was supposed to be deprecated, appeared on the exam, and I wondered, “Is there any point in asking about this now?” but since the deprecation was withdrawn, it made sense  

#### Reacquisition of Three Specialty Certifications

I allowed plenty of preparation time for the three specialty certifications (Security, Machine Learning, Advanced Networking) and reacquired them sequentially after they expired, without worrying about the expiration date. Unlike professional certifications, specialty certifications are not included in the renewal of lower-level certifications, so they must be renewed individually. I struggled with Advanced Networking and ended up relying on the [retake campaign](https://pages.awscloud.com/GLOBAL-other-GC-Traincert-Global-Retake-Registration-2025.html?gc-language=ja-jp).

- AWS Certified Security – Specialty  
  - At the time I took it, it was SCS-C02, and I did not notice any significant changes from before  
  - It tested a broad range of security knowledge, including IAM, security groups, network ACLs, WAF, GuardDuty, Security Hub, and more  
  - Many questions were related to security governance in multi-account environments and designing to meet compliance requirements  
  - It seems that SCS-C03 will include more generative AI-related security, so the coverage will likely expand  

- AWS Certified Machine Learning – Specialty  
  - It was announced to be retired on March 31, 2026  
  - The content was unchanged, focusing on machine learning  
  - The main topics were constructing machine learning pipelines centered on Amazon SageMaker, model training and deployment, and monitoring  
  - Basic machine learning knowledge was also required, such as data preprocessing, feature engineering, and model evaluation methods  

- AWS Certified Advanced Networking – Specialty  
  - It felt like this one changed the most in this renewal  
  - Whereas previous exams focused on Direct Connect and VPN connections, this time there were more questions on global network services like AWS Global Accelerator, CloudFront, and Route 53  
  - Many questions were related to network design in multi-region environments and connectivity in hybrid cloud environments  
  - There was also an increase in questions about relatively new services like Transit Gateway and Gateway Load Balancer  

#### Discontinued Specialty Certifications

These certifications were discontinued and were invalidated on the day three years after the date of acquisition. They were retired due to integration into new certification categories and the reorganization of the AWS certification program. They remained valid as certifications until their expiration dates, but there was no opportunity for renewal, and they naturally lapsed.

- AWS Certified Database – Specialty  
- AWS Certified Data Analytics – Specialty  
- AWS Certified SAP on AWS – Specialty  

### Experiences Gained Over Three Years

In the 2022 article, I wrote, “Since I haven't actually used AWS to build systems, I want to acquire skills that can be applied in actual system construction going forward.” Over the past three years, I have had opportunities to utilize AWS in real projects, but so far it has been limited to the design of simple application architectures.

#### Practical Use of AWS in Projects

In actual projects, the knowledge I learned through AWS certifications has been useful in the following scenarios:

- **Understanding Existing Systems**  
  - When trying to understand an existing running AWS system, the certification knowledge was extremely helpful  
  - When trying to understand which AWS services were being used and how the services interacted, the certification knowledge of each service's features and usage was a valuable reference  
  - Having the certification knowledge when reading system diagrams or documentation made understanding smoother  

- **System Operation Verification and Troubleshooting**  
  - During system operation verification and troubleshooting of existing systems, the certification knowledge was helpful  
  - Even when checking IAM roles or security group settings, the certification knowledge aided comprehension  

- **Design Review and Document Comprehension**  
  - When reviewing AWS architectures designed by other team members or understanding documentation of existing systems, the certification knowledge was beneficial  
  - Having learned best practices and security principles through the certifications made it easier to grasp design intentions and important considerations  

#### Gaps Between Certification Knowledge and Practical Work

I also realized that there are a few gaps between the certification knowledge and actual work:

- **In actual work, you need to combine multiple services**  
  - Certification exams test individual services, but in practice, you construct systems by combining multiple services  
  - You need more practical knowledge of service integrations and data flow design  

- **Balancing Cost and Performance**  
  - Certification exams often ask you to choose the “optimal solution,” but in real projects you must consider the balance between cost and performance  
  - In actual projects, factors not considered in exams—such as budget constraints and compatibility with existing systems—are highly important  

- **Lack of Actual Build and Operations Experience**  
  - The certification knowledge is mainly about design and concepts, and I still lack hands-on experience in building and operating systems  
  - Going forward, I plan to gain experience by actually building and operating systems on AWS  

## About New Certification Categories

Since 2022, AWS Certification has added four new categories. Three of them have already been obtained, and I’ve written articles on the developer site about them:

- [March 23, 2024: AWS Certified Data Engineer – Associate](/blogs/2024/03/23/aws-certified-data-engineer-associate/)  
- [September 26, 2024: AWS Certified AI Practitioner](/blogs/2024/09/26/aws-certified-ai-practitioner/)  
- [December 6, 2024: AWS Certified Machine Learning Engineer – Associate](/blogs/2024/12/06/aws-certified-machine-learning-engineer/)  

This time, I will discuss the fourth new certification category, Generative AI Developer – Professional.

### AWS Certified Generative AI Developer – Professional

[AWS Certified Generative AI Developer – Professional](https://aws.amazon.com/jp/certification/certified-generative-ai-developer-professional/) is a professional-level certification that validates advanced skills in building and deploying production-grade AI solutions using AWS services such as Amazon Bedrock.

#### Exam Overview

- Category: Professional  
- Beta exam duration: 205 minutes  
- Beta exam format: 85 questions, single-choice and multiple-choice  
- Beta exam fee: 150 USD (22,000 yen including tax in Japan)  
- Beta exam languages: English and Japanese  

Note that you cannot use the retake campaign, but you can use the regular half-price voucher.

#### Target Candidates

This certification is ideal for developers with over two years of cloud experience looking to advance their careers. Eligible candidates should meet the following requirements:

- Over two years of experience building production-grade applications on AWS or with open source technologies  
- General AI/ML or data engineering experience  
- One year of hands-on experience implementing generative AI solutions  
- Experience with AWS compute, storage, and networking services  
- Understanding of AWS security best practices and identity management  
- Experience with AWS deployment and Infrastructure as Code tools  
- Knowledge of AWS monitoring and observability services  
- Understanding of AWS cost optimization principles  

#### About the Beta Exam

Since this is a beta exam, I prepared according to the exam guide, just as I did for the Machine Learning Engineer – Associate and AI Practitioner exams.

A beta exam is taken before the exam content and format are finalized and before questions are used in the standard version. AWS Certification uses beta exams to validate the quality of exam questions before they appear in the official exam. Beta exam passers are among the first to earn the new certification.

The first 5,000 participants receive a special Early Adopter badge upon passing. Therefore, it’s important to thoroughly review the exam guide, understand the scope, and prepare accordingly.

#### Preparation Methods

For beta exam preparation, I studied in the following ways:

- **Reviewing the Exam Guide**  
  - Checked the exam scope and domain weightings to identify areas to focus on  
  - For Generative AI Developer – Professional, key services included Amazon Bedrock, Amazon SageMaker, AWS Lambda, and Amazon API Gateway  

- **Official Documentation and Hands-On Labs**  
  - Studied the Amazon Bedrock documentation to understand its main features and usage  
  - Completed relevant AWS Skill Builder courses and hands-on labs to get practical experience  
  - Learned generative AI application design patterns and best practices  

- **Leveraging Knowledge from Related Certifications**  
  - Applied knowledge from the AI Practitioner and Machine Learning Engineer – Associate certifications  
  - Used architecture design knowledge from Solutions Architect – Professional  
  - Security and monitoring knowledge was also necessary for generative AI application design  

- **Applying Practical Experience**  
  - Although my practical experience has been limited to designing simple application architectures, that experience helped me understand some exam scenarios  
  - However, due to the limited scope of my hands-on experience, I needed to study the full breadth of the exam guide  

#### Taking the Exam

I took the exam. Despite my thorough preparation, the actual content differed from my expectations.

Exam Difficulty and Characteristics

- **Number of Questions and Time**  
  - With 85 questions in 205 minutes, you have about 2.4 minutes per question  
  - The question stems and choices were very long, and it took time to picture architecture diagrams from the text  
  - Many questions involved complex scenarios combining multiple services, making it time-consuming to grasp the overall picture  

- **Content Characteristics**  
  - Many questions focused on building generative AI applications centered on Amazon Bedrock  
  - Design considerations for production environments (scalability, security, cost optimization, etc.) were emphasized  
  - Numerous questions had multiple options that seemed correct, requiring judgments based on best practices  
  - Operational concerns such as error handling, monitoring, and log management were also heavily featured  

- **Time Management Challenges**  
  - I used nearly all the time and hardly had any left for review  
  - I always feel I need to improve my speed in reading long passages  
  - I realized that quickly understanding long, detailed questions and organizing key points is crucial  

Results and Future Strategies

I often see passing announcements on X (formerly Twitter), but unfortunately I did not pass. Before the official release, I plan to improve in the following areas:

- **Handling Long Questions**  
  - Practice quickly reading question stems and organizing key points  
  - Develop the ability to quickly visualize architecture and design diagrams  

- **Strengthening Practical Knowledge**  
  - Gain hands-on experience building applications with Amazon Bedrock  
  - Study design patterns that consider production environment operations  

- **Deepening Understanding of Related Services**  
  - Deepen knowledge of services commonly used in generative AI applications, such as AWS Lambda, Amazon API Gateway, and Amazon CloudFront  
  - Learn best practices from security, monitoring, and cost optimization perspectives  

## Maintaining Motivation for Certification

To maintain certifications over three years, continuous learning is essential. I have kept my motivation through the following methods:

### Continuous Learning Methods

- **Regularly Catching Up on AWS Services**  
  - I regularly watch AWS official blog posts and re:Invent session videos to catch up on new services and features  
  - I use AWS Skill Builder courses to systematically update my knowledge  
  - Especially for generative AI services (Amazon Bedrock, Amazon Q, etc.), frequent updates require ongoing learning  

- **Applying AWS in Real Projects**  
  - By using AWS in real projects, I apply the knowledge gained from certifications and deepen my understanding  
  - Solving challenges encountered in practical work helps me learn new knowledge and best practices  
  - Realizing that certification knowledge is useful in practice helps maintain my motivation  

- **Challenging New Certification Categories**  
  - When new certification categories are added, I actively challenge them as opportunities to learn new knowledge  
  - Participating in beta exams gives me a chance to be among the first to earn a new certification  
  - Challenging new certification categories is a great motivator for learning  

### Sources of Motivation

Additionally, meeting the criteria for the [2026 Japan All AWS Certifications Engineers](https://aws.amazon.com/jp/blogs/psa/2026-japan-all-aws-certifications-engineers-criteria/) program has been a major motivation. I qualified in 2023, 2024, and 2025, and my goal is to continue holding all AWS certifications.

To achieve this goal, I need to:

- **Plan Certification Renewals**  
  - Manage certification expiration dates and identify those requiring renewal in advance  
  - Prioritize renewing professional certifications since they also renew lower-level certifications  
  - Plan and prepare individually for specialty certification renewals  

- **Respond to New Certification Categories**  
  - When new categories are added, aim to obtain them as soon as possible  
  - Participating in beta exams can enable early acquisition  
  - Responding to new certification categories is necessary to maintain all AWS certifications  

- **Engage with the Community**  
  - Exchange information with others who share the same goals on X (formerly Twitter) and tech blogs  
  - Share certification experiences and study methods to maintain motivation  
  - Community interaction is an important factor in sustaining continuous learning  

## Conclusion

Three years have passed since I achieved all 12 AWS certifications in 2022, and several certifications required renewal. In the meantime, new certification categories have been added, broadening the AWS certification options.

Obtaining certifications is not an end in itself but a trigger for continuous learning. I plan to continue challenging new technologies and certification categories in the future.
