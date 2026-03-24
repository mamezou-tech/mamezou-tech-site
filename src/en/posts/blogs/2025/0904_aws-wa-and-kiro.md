---
title: >-
  Kiro×AWS Architecture: How Far Can We Go with WA? Experimenting with Cloud
  Design Using Generative AI!
author: hirokazu-niwa
date: 2025-09-04T00:00:00.000Z
tags:
  - Kiro
  - AWS
  - summer2025
image: true
translate: true

---

## 1. Introduction
Have you ever struggled with how to properly evaluate an AWS architecture design? With so many services intertwined, it’s easy to get lost about what to look at and where. (At least, I often get confused.)

In this article, I’ll first organize the basic design principles you’re bound to encounter when you start working with AWS—the AWS Well-Architected Framework (hereafter referred to as WA)—and the methods for evaluating architectures based on it.

Then, we’ll take one step further and see if we can use the generative AI tool “Kiro” to create an architecture compliant with WA. Let’s explore together how well a generative AI can understand and reflect WA principles in an architecture!

## 2. Article Premise
In the following content, I won’t go deeply into the general design principles of WA or the details of its six pillars. The official WA documentation is very comprehensive, so if you want to learn more, please refer to it.  
[Official Documentation: AWS Well-Architected Framework](https://docs.aws.amazon.com/ja_jp/wellarchitected/latest/framework/welcome.html)

The main focus of this article is: “Can we use a generative AI tool to create an architecture that follows WA?” I’ll explore this possibility, sharing my firsthand impressions using Kiro and the tool’s characteristics.

## 3. General Design Principles and the Six Pillars
### 3.1 General Design Principles
Although I said I wouldn't dive into details, some of you might wonder what WA actually entails, so I’d like to give a brief summary.

WA includes the following general design principles for creating high-quality architectures in the cloud. These serve as universal design guidelines (some expressions are paraphrased for clarity).

- **Architecture that doesn’t require capacity forecasting**  
  Does the design leverage the flexibility of the cloud to use only the resources needed, when needed?

- **Architecture that can be tested at production scale**  
  Can you easily set up a test environment under real user load to identify production issues in advance?

- **Ability to experiment through automation**  
  Is the architecture managed as code so you can repeat experiments and improvements?

- **Ability to evolve the architecture continuously**  
  Can the system be flexibly updated to adapt to changing business needs?

- **Data-driven decision making**  
  Is there a mechanism to judge the quality of the design based on data rather than intuition or experience?

- **Train with game days (simulated failure days)**  
  Do you deliberately induce failures to train the team on how to respond when problems occur?

### 3.2 The Six Pillars and Best Practices
Building on the general design principles, WA is composed of six “pillars” used to evaluate an architecture:

  1. Operational Excellence: Focuses on efficient operational processes and continuous improvement.

  2. Security: Protects data, manages access, and handles incidents to enhance system safety.

  3. Reliability: The ability of the service to continue functioning during and after failures.

  4. Performance Efficiency: Concepts for using resources efficiently to meet changing demands.

  5. Cost Optimization: Focuses on delivering maximum business value at minimum cost.

  6. Sustainability: Designing with a long-term perspective to minimize environmental impact.

If we summarize sections 3.1 and 3.2 visually, it looks something like this:  
![Conceptual diagram of WA](/img/blogs/2025/0904_learn-wa-arch-kiro/wa-image.png)

Also, each of these six pillars includes several “best practices.” For details, please see [Official Documentation: AWS Well-Architected Framework](https://docs.aws.amazon.com/ja_jp/wellarchitected/latest/framework/welcome.html).

## 4. How to Evaluate
Now that we’ve outlined WA, I wondered, “I understand it serves as a guideline for building AWS resources, but how do I actually use it? And how do I perform the evaluation?”

While researching, I discovered that there’s a service called the “AWS Well-Architected Tool” which lets you see how well your AWS architecture meets WA. So I tried using it. Below are some key points from my hands-on experience.

**Checking compliance with pillar best practices**  
![WA Tool interface](/img/blogs/2025/0904_learn-wa-arch-kiro/wa-tool-image.png)

**Improvement suggestions for pillar best practices**  
![WA Tool improvement screen](/img/blogs/2025/0904_learn-wa-arch-kiro/wa-fix-screen.png)

**How to improve pillar best practices**  
![Improvement steps](/img/blogs/2025/0904_learn-wa-arch-kiro/wa-fix-step.png)

The workflow for using this Tool follows the steps shown above:
- From the questions (options) provided for each of the six pillars’ best practices, select whether your architecture meets them
- It lists the items that need improvement
- Click on the link for the improvement items you feel are necessary under “Recommended improvement items”
- Follow the “Implementation guidance” to make the improvements

You repeat this flow for the best practices of each of the six pillars.

Of course, you can’t fully satisfy all best practices (there are nearly 300 questions), since trade-offs occur (e.g., wanting to minimize cost while maintaining high availability). You need to flexibly assess according to the architecture’s requirements at that time.

By evaluating your existing AWS architecture with this tool, it becomes clear “to what extent your architecture meets WA standards” and “which items need improvement.”

However, when I used the WA Tool, I found it somewhat lacking in the following aspects:
- While it can identify areas for architecture improvement, the evaluation and improvement are entirely manual (answer questions → improve)
- Clicking through the options one by one is time-consuming

I started looking into ways to reduce the burden of these time-consuming tasks, and came across a tool called “Kiro.” Using this tool, I want to:
- Have it first generate an AWS architecture that complies with WA
- Have it check whether the generated architecture truly complies with WA

I decided to give this a try!

## 5. A Brief Introduction to Kiro
I’ll briefly introduce “Kiro.” In a nutshell, it’s a specification-driven generative AI IDE that supports development. As introduced in AWS’s official blog “[Introducing Kiro](https://aws.amazon.com/jp/blogs/news/introducing-kiro/)”, you can simply give instructions in natural language, and it will define requirements, design the architecture, create a task list, and generate the deliverables accordingly. (More and more tools like this are appearing…)

For more details, check out “[Introducing Kiro](https://aws.amazon.com/jp/blogs/news/introducing-kiro/)” or the article posted on our developer site below, which explain Kiro’s features and how to use it!

**Reference article**  
[KiroでAI開発革命!? アルバムアプリをゼロから作ってみた【その1:要件定義・設計・実装計画】](https://developer.mamezou-tech.com/blogs/2025/08/19/kiro-album-app-1/)

## 6. Let’s Create an Architecture Aligned with WA
Let’s dive in and use Kiro to build a WA-compliant AWS architecture.

Here’s the environment I used when working with Kiro:
- **Environment**: Windows 11, PowerShell
- **Kiro (0.2.13)**: Installed the Windows version ([download here](https://kiro.dev/downloads/)) and used it

If you plan to use it on WSL2, you may want to refer to this article: [How to connect Kiro to WSL](https://zenn.dev/beagle/articles/f1774d19cefd1b)

For this experiment, I instructed Kiro to create an architecture for running a simple task management app (for testing) that complies with WA. However, I will not cover the creation process, all deliverables (specifications, design documents, task lists, code, etc.), or application details. (You can find details about how Kiro builds the application in the article mentioned above.)

In this article, I’m focusing solely on whether Kiro can create a WA-compliant AWS architecture, so I’ll minimize discussion of Kiro’s behavior.

### 6.1 The Resulting AWS Architecture
Through interacting with Kiro, the following AWS architecture was generated in CloudFormation template format.  
![AWS architecture diagram](/img/blogs/2025/0904_learn-wa-arch-kiro/aws-architecture-diagram.drawio.svg)

Briefly explaining the resources and setup defined in the CloudFormation template:

**Resources used**

**Computing**
- **Amazon EC2**: Application servers (Auto Scaling Group)
- **Application Load Balancer (ALB)**: Load balancing and HTTPS termination
- **Auto Scaling**: Automatic scaling based on demand

**Network**
- **Amazon VPC**: Private network environment
- **Subnets**: Separated into public, private, and database subnets
- **NAT Gateway**: Internet access for private subnets
- **Internet Gateway**: Internet connectivity for public subnets

**Database**
- **Amazon RDS (PostgreSQL)**: Managed database in a Multi-AZ configuration
- **RDS Parameter Group**: Database setting optimization
- **RDS Subnet Group**: Dedicated database subnets

**Security**
- **AWS KMS**: Key management for database encryption
- **Security Groups**: Network-level firewalls
- **IAM Roles**: Access control based on the principle of least privilege

**Monitoring & Logging**
- **Amazon CloudWatch**: Metrics monitoring and alerts
- **CloudWatch Logs**: Application and system logs
- **CloudWatch Dashboard**: Unified monitoring dashboard
- **Amazon SNS**: Alert notifications

**About the configuration**

**High Availability Design**
- **Multi-AZ configuration**: Distributes resources across two availability zones
- **Redundancy**: ALB, NAT Gateway, and RDS support Multi-AZ
- **Automatic recovery**: Auto Scaling Group automatically replaces failed instances

**Security Design**
- **Network segmentation**: Separates public, private, and database subnets within the VPC
- **Encryption**: Implements at-rest encryption for RDS, EBS, and S3
- **Access control**: Applies the principle of least privilege with IAM roles and security groups
- **HTTPS communication**: SSL/TLS termination at the ALB (certificate configured separately)

That’s the gist of it.

### 6.2 How I Prompted It (Prompt Details)
<details><summary>Prompt Instructions (click to expand)</summary>

```
# Instructions
- I want to build the application described in disire-app.md on AWS.
- Please define the architecture to satisfy as many of the criteria defined in well-arch.md as possible.

# Conditions
- It is not necessary to satisfy all criteria in well-arch.md.
- Keep the application and architecture configurations minimal.
```
</details>

The “well-arch.md” referenced above is the document that organizes the WA evaluation criteria.  
<details><summary>well-arch.md (click to expand)</summary>

```
# Overview of the AWS Well-Architected Framework

## 1. General Design Principles
These are six key principles for designing and operating systems.

* **Eliminate the need to forecast capacity**: Design to leverage the cloud’s flexibility, scaling resources up and down as needed.
* **Test at production scale**: Easily build a test environment equivalent to production to validate with reduced risk and cost.
* **Experiment frequently through automation**: Manage infrastructure and configurations as code and automate to rapidly and safely try different designs.
* **Evolve your architecture continuously**: Build flexible systems that can be improved continuously to meet changing business and technology needs.
* **Make decisions based on data**: Use concrete data from your system (performance, cost, etc.) to guide improvements rather than gut feelings.
* **Practice game days to improve**: Conduct regular simulated failure drills to prepare your team to respond swiftly during real incidents.

---

## 2. The Six Pillars and Best Practices
The AWS Well-Architected Framework assesses and improves system quality based on the following six pillars.

### ① Operational Excellence
The ability to run and monitor systems effectively and continuously improve processes.

* **Organization**: Establish a structure where the entire team shares goals and collaborates effectively.
* **Prepare**: Develop response plans for incidents and improve preparedness through training.
* **Operate**: Streamline daily operations and set up processes for rapid issue resolution.
* **Evolve**: Use lessons learned from operations to continually refine systems and processes.

---

### ② Security
The ability to protect data and systems from threats and strengthen security.

* **Identity and Access Management**: Implement strict access controls to manage who can access what.
* **Detect**: Use logs and metrics to continuously monitor for unusual activity and detect issues quickly.
* **Infrastructure Protection**: Multi-layer protection for network and server infrastructure.
* **Data Protection**: Protect critical data through classification, encryption, and backups.
* **Incident Response**: Prepare response procedures in advance to minimize damage from security events.
* **Application Security**: Integrate security measures into all stages of application development.

---

### ③ Reliability
The ability of a system to recover from failures and continue to function.

* **Foundations**: Properly manage service quotas and limits to build a stable system foundation.
* **Workload Architecture**: Design (e.g., microservices) so that failures in one component don’t affect the entire system.
* **Change Management**: Automate system changes to minimize impact and enable fast rollbacks.
* **Failure Management**: Assume failures will happen; implement automated recovery and regular backup tests.

---

### ④ Performance Efficiency
The ability to use computing resources efficiently to meet system requirements.

* **Selection**: Choose the right resource types and configurations to maximize performance.
* **Compute**: Select compute services that match application characteristics.
* **Data Management**: Choose efficient data storage and access methods based on data type and usage patterns.
* **Network and Content Delivery**: Use network configurations and CDNs to improve responsiveness.
* **Processes and Culture**: Foster a culture of continuous performance improvement across the team.

---

### ⑤ Cost Optimization
The ability to run systems at the lowest cost while delivering the desired business value.

* **Implement Cloud Financial Management**: Establish teams and processes to manage costs.
* **Cost and Usage Awareness**: Make costs transparent to identify wasteful spending.
* **Cost-Effective Resources**: Choose optimal pricing models (On-Demand, Reserved, etc.) for resources.
* **Manage Demand and Supply**: Automatically adjust resources based on demand to eliminate waste.
* **Optimize Continuously**: Periodically review new technologies and services to improve cost efficiency.

---

### ⑥ Sustainability
The ability to minimize environmental impact through efficient resource use.

* **Region Selection**: Choose service locations considering environmental impact.
* **Right-Sizing**: Operate resources only when needed to reduce energy consumption.
* **Software and Architecture**: Optimize designs and code to reduce power usage.
* **Data Management**: Select efficient data storage and delete unnecessary data.
* **Hardware and Services**: Use efficient hardware and managed services.
* **Processes and Culture**: Build a team culture focused on environmentally responsible operations.
```
</details>

I won’t cover “desire-app.md.” Broadly speaking, the task management app I aimed to create is a basic app using Flask, HTML/CSS, and JavaScript. Here are some screenshots just to show how it behaves:

**Home**  
![Home screen](/img/blogs/2025/0904_learn-wa-arch-kiro/top.png)

**Add Task**  
![Add task screen](/img/blogs/2025/0904_learn-wa-arch-kiro/add-task-image.png)

**Task List**  
![Task list](/img/blogs/2025/0904_learn-wa-arch-kiro/watch-task-list.png)

### 6.3 Generating Evaluation Items and Actual Checks
Using the method described in 6.2, we were able to create an AWS architecture to run a WA-compliant task management app. Here, I’ll outline what I did to check whether this architecture actually aligns with WA evaluation criteria.

1. Generate a checklist based on “well-arch.md”  
   <details><summary>Initial Checklist (click to expand)</summary>

   ```
   AWS Well-Architected Framework Checklist
   1. Operational Excellence

   Organization
   [ ] Establish a structure where the entire team understands common goals and collaborates effectively
   [ ] Clarify operational responsibilities

   Preparation
   [ ] Develop incident response plans
   [ ] Improve team preparedness through training
   [ ] Implement Infrastructure as Code
   [ ] Experiment with designs through automation

   Operations
   ...
   ```
   </details>

2. Refine because it included items not in “well-arch.md”  
   **<Correction Guidelines>**  
   - Added items not in the original (“well-arch.md”) – Do not add items based on personal interpretation  
   - Avoid mixing evaluation scopes – Do not include organizational or cultural items that can’t be evaluated with CloudFormation  
   - Instead of using “well-arch.md,” directly generate a list of questions that satisfy each pillar’s best practices  
   - As in the following example  
     <details><summary>Sample question list (click to expand)</summary>
     
     ```
     (Example) Cost Optimization

      - Cost-effective resources
        - COST 5. How do you evaluate cost when selecting services?
          [ ] COST05-BP01 Identify organizational cost requirements
          [ ] COST05-BP02 Analyze all components of the workload
          [ ] COST05-BP03 Perform detailed analysis of each component
          [ ] COST05-BP04 Select software that provides cost-efficient licensing
          [ ] COST05-BP05 Choose workload components so that costs are optimized according to organizational priorities
          [ ] COST05-BP06 Perform time-based cost analysis for different usage levels
     ```
     </details>

3. The resulting checklist  
   <details><summary>Checklist (click to expand)</summary>

   ```
   # AWS Well-Architected Framework Checklist
   ## CloudFormation Template Technical Evaluation Items

   ---

   ## Operational Excellence

   ### Preparation
   - OPS 4. How can you implement observability in your workload?
     - [ ] OPS04-BP01 Identify key performance indicators
     - [ ] OPS04-BP02 Implement application telemetry
     - [ ] OPS04-BP04 Implement dependency telemetry
     - [ ] OPS04-BP05 Implement distributed tracing

   - OPS 5. How do you reduce defects, simplify remediation, and improve the flow to production?
     - [ ] OPS05-BP01 Use version control
     - [ ] ...
   ```
   </details>

4. Actual Evaluation Example  
   <details><summary>Actual Evaluation Example (click to expand)</summary>

   ```
   ## Security

   ### Security Foundations
   - SEC 1. How can you operate your workload securely?
     - [○] SEC01-BP01 Use separate accounts to isolate workloads - Implemented VPC and subnet separation
     - [○] SEC01-BP06 Automate deployment of standard security controls - Automated security groups and IAM roles

   ### Identity and Access Management
   - SEC 2. How should you manage authentication for humans and machines?
     - [○] SEC02-BP02 Use temporary credentials - Used IAM roles and instance profiles
     - [×] SEC02-BP03 Securely store and use secrets - Secrets Manager not used (specified directly via parameters)

   ...

   ## Overall Evaluation

   | Pillar                    | Score | Percentage |
   |---------------------------|-------|------------|
   | Operational Excellence    | 11/12 | 92%        |
   | Security                  | 12/14 | 86%        |
   | Reliability               | 18/19 | 95%        |
   | Performance Efficiency    | 10/10 | 100%       |
   | Cost Optimization         | 10/15 | 67%        |
   | Sustainability            | 10/10 | 100%       |

   **Overall Score: 71/80 (89%)**

   ## Main Improvement Points

   ### High Priority
   1. **SEC02-BP03** - Manage credentials with AWS Secrets Manager
   2. **COST02-BP05** - Cost control with AWS Budgets
   3. **COST03-BP05** - Cost monitoring with Cost Explorer

   ### Medium Priority
   4. **OPS04-BP05** - Distributed tracing with AWS X-Ray
   5. **SEC06-BP01** - Vulnerability management with Amazon Inspector
   6. **REL01-BP04** - Service Quotas monitoring

   ### Low Priority
   7. **COST07-BP02** - Optimize region selection
   8. **COST08-BP03** - Implement CDN with CloudFront
   ```
   </details>

### 6.4 Reflections on Kiro’s Checks
In 6.3, I outlined the flow of having Kiro check whether the generated AWS architecture meets WA evaluation criteria. While some tweaking was needed, I generally felt that “using generative AI to build a WA-compliant AWS architecture” is feasible.

Compared to the AWS WA Tool on the management console, this approach eliminates manual checking, which I think would significantly reduce the burden. Also, although I didn’t try it this time, you could easily feed the “improvement points” output from the check into a prompt to automate updates to the CloudFormation template. I feel this is another advantage over the AWS WA Tool on the management console.

However, you still need to organize the [official documentation’s questions](https://docs.aws.amazon.com/ja_jp/wellarchitected/latest/framework/appendix.html) in advance for checklist generation and craft prompt conditions, so there’s still a barrier to full automation. *Note: I also had the generative AI help organize the official documentation’s questions for satisfying best practices to some extent.*

## 7. Conclusion
In this article, I introduced how to evaluate architectures using the AWS Well-Architected Framework, as well as the generation of architectures with the generative AI tool “Kiro” and evaluations based on WA. The fact that Kiro can understand WA’s best practices and generate architectures reflecting them strongly suggests the potential of generative AI in future cloud design.

However, I didn’t show the task management app development process, but errors did occur and code didn’t run flawlessly. Considering that Kiro initially mixed in its own evaluations during the WA check, it’s still difficult to entrust everything to Kiro. The developer’s skills and understanding of AWS are essential.

In that sense, Kiro remains a tool that supports the design process (requirements definition, architecture design, task identification), or a mentor that offers insights, and it’s still incomplete for outsourcing design through development and evaluation entirely.

While I find it incomplete, it performs well enough to improve the efficiency of the design process, development, and evaluation. I believe the current compromise is to understand how to use it correctly and leverage it. Through proper interaction with generative AI, I also aim to keep up with the domain so I can create high-quality requirements definitions and architectures more quickly.

Moving forward, I want to further explore how to efficiently create and operate “generic AWS architectures that satisfy WA”! Thank you for reading to the end.
