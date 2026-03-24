---
title: GOLDEN Kubestronaut Achievement Report
author: takashi-sato
date: 2026-01-12T00:00:00.000Z
tags:
  - k8s
translate: true

---

After earning the title of Kubestronaut in January 2025, I obtained the title of GOLDEN Kubestronaut in December of the same year, so I’m compiling a record of that.

The flow is as follows.

- **What is GOLDEN Kubestronaut:** A brief description of GOLDEN Kubestronaut
- **Scope of this article:** A description of the scope covered in this article
- **Characteristics and relationships of the exams:** A description of the characteristics and relationships of the exams required to obtain GOLDEN Kubestronaut
- **Study methodology:** A description of my study methodology
- **Reflections:** My impressions after completing the GOLDEN Kubestronaut
- **Approach to each exam:** A description of my activities and impressions for each exam

## What is GOLDEN Kubestronaut

GOLDEN Kubestronaut is a title earned by passing all CNCF certified exams and LFCS. The prerequisite title before GOLDEN Kubestronaut is Kubestronaut, which is awarded after passing any five of these exams.

Below are the requirements for Kubestronaut and the additional requirements for GOLDEN Kubestronaut (listed in the order I took them).

- Kubestronaut requirements
  - Certified Kubernetes Application Developer (CKAD-JP)
  - Certified Kubernetes Administrator (CKA-JP)
  - Certified Kubernetes Security Specialist (CKS-JP)
  - Kubernetes and Cloud Native Associate (KCNA-JP)
  - Kubernetes and Cloud Native Security Associate (KCSA)
- Additional requirements for GOLDEN Kubestronaut
  - OpenTelemetry Certified Associate (OTCA)
  - Istio Certified Associate (ICA)
  - Cilium Certified Associate (CCA)
  - Certified Argo Project Associate (CAPA)
  - GitOps Certified Associate (CGOA)
  - Prometheus Certified Associate (PCA)
  - Certified Backstage Associate (CBA)
  - Kyverno Certified Associate (KCA)
  - Certified Cloud Native Platform Engineering Associate (CNPA)
  - Linux Foundation Certified System Administrator (LFCS-JP)

In this way, you need five certifications for Kubestronaut and a total of fifteen for GOLDEN Kubestronaut. The Kubestronaut title is lost if any of its five certifications expire, but the GOLDEN Kubestronaut title is valid for life.

The above requirements are updated whenever CNCF adds a new certification exam. Specifically, it has been announced that the Certified Cloud Native Platform Engineer (CNPE) exam will be added to the GOLDEN Kubestronaut requirements on 2026/03/01. However, once you have achieved GOLDEN Kubestronaut, you do not need to pass any newly added exams.

By the way, you can get most exams at roughly 40%–50% off the list price by using frequent sales and coupons.

## Scope of this article

In this article, I will mainly cover the additional certification exams required to step up from Kubestronaut to GOLDEN Kubestronaut. Since there is already a lot of information published about the exams needed for Kubestronaut, I will omit those here.

## Characteristics and relationships of the exams

### Characteristics of the exams

Looking at the additional required exams as a whole, I think their characteristics are as follows.

- Cloud native–related topics are broadly covered: If you look at each exam individually, most of them test knowledge and skills related to a specific product (CGOA and CNPA being exceptions). However, when you look at them collectively, they cover key cloud native aspects widely: from security to observability and governance, as well as GitOps, delivery, and IDPs.
- Most are multiple-choice exams (in English): Except for ICA, LFCS, and the upcoming CNPE, all are multiple-choice. Therefore, if you can read English reasonably well, they are relatively easy. However, CGOA and CNPA, which do not target a specific product, have more complex problem statements that test principles and concepts, so they do require a bit more English reading ability.

### Relationships among the exams

The products and technical domains covered in each exam have similarities and relationships, so information gained for one exam can be useful for another. The following image shows the technical domains each exam targets and how I felt they relate to each other in the order I took them.

![Exam relationships](/img/blogs/2026/0106_golden-kubestronaut/6f42a8dd-be93-4826-b56f-75018ba50b3f.png)

By the way, the numbers in "()" indicate the order in which I took them, and my approach was as follows.

- Take exams of interest first: Because I was interested in observability, I took OTCA first. PCA covers the same domain, but learning Prometheus’s query language (PromQL) seemed tedious, so I postponed it.
- Take hands-on exams (likely more difficult) early: Hands-on exams are more challenging than multiple-choice, so I took the hands-on ICA early. LFCS is also hands-on, but it has a different flavor, so I took it later.
- Take closely related exams consecutively: I took ICA and CCA, which cover the same domain, consecutively, as well as CAPA and CGOA, both dealing with GitOps.
- Postpone exams with limited resources: I postponed PCA, CBA, and KCA, for which knowledge was limited, and CNPA, which was added later and had little information available.

Overall, I found that the knowledge I gained from studying for CKS was the most helpful for other exams.

On the other hand, CNPA required broad knowledge that is covered in many other exams. In reverse, this means that if you take CNPA first, the knowledge you gain there can help with many other exams. Whether you take CNPA early or late depends on the individual, but since the English in CNPA exam questions is difficult, if you’re not strong in English like me, it’s probably better to take it later.

## Study methodology

My study methodology was basically the same pattern I used when I took the Kubestronaut-required certifications:

- **e-learning:** Take courses on KodeKloud and Udemy that cover each exam’s curriculum.
- **Practice exams:** Take the practice exams included with the KodeKloud and Udemy courses, and purchase additional practice exam content on Udemy.
- **Hands-on:** Set up a Kubernetes environment on my personal Linux PC and practice the curriculum content. For some exams, Killercoda provided a hands-on environment, which I also used.
- **Reference review:** Consult the official reference documentation of the exam products and check the parts covered in the exam curriculum.

### e-learning

I primarily took the exam preparation courses offered on KodeKloud and Udemy. Besides those, I also reviewed any free e-learning content from the Linux Foundation and Tetrate Academy that seemed relevant to the exams.

A drawback was that almost none had Japanese subtitles. Some of the Kubestronaut-required exam courses had Japanese subtitles, but this time it was almost all in English. The exams I took early on were in domains I already had some knowledge of, so I was able to keep up with the e-learning. However, as I moved into domains where my knowledge was thinner, my learning efficiency dropped.

So, halfway through the 10 additional exams―after completing 5 of them―I adopted a study method of transcribing the audio from the videos and summarizing it. For transcription, I used a Whisper-based app I created with Vibe Coding.

![Transcription device](/img/blogs/2026/0106_golden-kubestronaut/2a85e1e9-2fee-4555-8c64-04da1c3f98fb.jpeg)

Using the transcription app, I first transcribed each lesson immediately after watching it, then used AI to correct the English text, translate it into Japanese, and summarize it. I then copied the summary into my self-hosted Wiki and quickly reviewed it. This method was effective because I could review right after the lesson. The downside was that it took about 1.5 times longer than just watching the videos, but I prioritized deep understanding.

![Transcribed to Wiki for review](/img/blogs/2026/0106_golden-kubestronaut/f611291e-d62b-4fe9-8cb5-ca97ef8061eb.png)

This workflow―“watch video”→“transcribe”→“polish English”→“translate & summarize”→“copy to Wiki & review”―became my solid study pattern.

Initially, I aimed to have simultaneous interpretation so I could watch the e-learning videos with live transcription, but I abandoned that for the following reasons and limited the app’s function to transcription only:

- The translation lags slightly.
- It struggles with nonstandard specialized terms.
- You can’t really read the translated terminal output and the video at the same time.

One minor annoyance was that when I gave ChatGPT large amounts of text to polish, it became sloppy and unusable. As a rule of thumb, when the video exceeded 15 minutes, this often happened. In such cases, I had Claude Code (which I’m subscribed to) polish the English, then fed the results in smaller segments to ChatGPT for translation.

### Practice exams

Most KodeKloud and Udemy courses include practice exams, so I took those first. In addition, there are Udemy courses solely for practice exams, which I purchased and took. Generally, these practice exams were a bit easier than the real ones, but they served to prepare my mindset.

Since the Golden Kubestronaut program was launched, I’ve noticed a proliferation of relevant practice exam courses. However, when I started studying, appropriate practice content was scarce, and some seemingly available content was discontinued. As a workaround, I created an app with Vibe Coding that uses AI to generate practice exam questions.

![Mock exam app following exam format](/img/blogs/2026/0106_golden-kubestronaut/373fc925-04d7-4ee0-a61d-4ef062fbfcfe.png)

I used that app in the early period of my studies, but as the AI-generated questions were too easy and Udemy’s practice exam content improved, I didn’t need it later on.

### Hands-on

Except for OTCA and those exams without a direct product (CGOA and CNPA), I set up environments on my personal Linux PC to cover the curriculum scope.

When I took the Kubestronaut-required exams, the CKAD and CKA curriculum included cluster installation and upgrades, so I had to set up full k8s environments for review, which was a hassle. This time, there was no need for that, and I could easily spin up simple environments with minikube or kind for each exam, which was convenient.

For LFCS, since it’s not focused on cloud native products but rather on Linux environment operations, I used libvirt (which is included in the LFCS curriculum) to create virtual machines and practiced across the board on them.

### Reference review

This took the least amount of time compared to the other three methods. Up through ICA, CCA, and CAPA—before I introduced transcription—I supplemented my e-learning with reference documentation to cover contents I hadn’t fully grasped.

After adopting transcription, my understanding from e-learning became sufficient, so I rarely needed to delve into the references. However, because some exam questions ask about settings not explained in e-learning or default values, when there was a gap between study and exam dates I checked relevant sections in the docs.

## Reflections

Since so many additional exams were required for GOLDEN Kubestronaut, and almost all of them are in English, I expected it would be quite difficult to reach. However, the exams themselves are not that hard, and with focused effort, you can clear each one in about one to two weeks. Also, after taking ten exams, you’ll get used to the English in the questions.

When I reached Kubestronaut, I felt that I had not only improved my k8s skills but, through studying for CKS, had gained a solid understanding of cloud security. Through the additional requirements for GOLDEN Kubestronaut, I feel I expanded my knowledge of cloud native platforms, including GitOps, progressive delivery, observability, and IDPs.

Looking ahead, it’s already clear that CNPE will be added to the GOLDEN Kubestronaut requirements. Judging by the curriculum, I expect it will test hands-on skills related to the products I studied for the additional requirements this time. Since I’ve already earned the GOLDEN Kubestronaut title, I don’t need to pass that exam, but I’d definitely like to challenge it once information becomes available.

## Approach to each exam

In January 2025, I cleared the five certifications required to obtain Kubestronaut. Shortly after, the GOLDEN Kubestronaut program was launched. From July to December 2025, I cleared the ten additional certifications required for GOLDEN Kubestronaut.

Initially, I planned to take my time and study through the end of FY2025, but for the following reasons, I accelerated my schedule and finished within the year 2025:

- If I took too long, I’d forget what I’d learned.
- CNPE was joining the requirements on 2026/03/01, and I expected it to raise the difficulty significantly.
- I wanted to enjoy the year-end and New Year holidays.

### OpenTelemetry Certified Associate (OTCA)

- **Exam date:** 2025/07/06
- **Study duration:** 5 days
- **Resources used:**
  - [OpenTelemetry Foundations: Hands-On Guide to Observability](https://www.udemy.com/course-dashboard-redirect/?course_id=6195287)
    - e-learning
  - [OpenTelemetry Certified Associate (OTCA) Practice Exams](https://www.udemy.com/course/otca-practice-exams/)
    - practice exams
    - discontinued

I hadn’t decided whether to aim for GOLDEN Kubestronaut. However, I had a 50% off coupon from the Kubestronaut perk and, intrigued by OpenTelemetry, I tried the OTCA exam.

The e-learning was brief and, having touched on Hubble while studying Cilium in CKS, I found it easy to understand. The content covered metrics and the basics of OpenTelemetry. I did the e-learning and practice exams during the week, then took the exam on the weekend and passed.

Since I could pass with just a quick study, I felt the difficulty was not high. I thought that if the other exams were similar, I could earn all the certifications, so I decided to go for GOLDEN Kubestronaut at that point.

### Istio Certified Associate (ICA)

- **Exam date:** 2025/08/23
- **Study duration:** 48 days
- **Resources used:**
  - [Istio Hands-On for Kubernetes](https://www.udemy.com/course/istio-hands-on-for-kubernetes/)
    - e-learning (Japanese subtitles available)
  - [Learn Istio Fundamentals](https://academy.tetrate.io/courses/istio-fundamentals)
    - e-learning
    - free
  - <https://killercoda.com/ica>
    - hands-on

I took OTCA quickly, but I anticipated that ICA would be more difficult because it’s hands-on, so I prepared over a longer period. In addition to e-learning and hands-on, I translated reference docs for areas where my understanding was weak to deepen my comprehension.

Though Istio is included in the CKS curriculum, CKS tends to focus more on Cilium, so I hadn’t studied Istio in depth. However, my understanding of Cilium’s service mesh side helped me learn smoothly. Also, since I had already taken OTCA, I already understood observability products like Kiali and Jaeger, which was helpful.

What was difficult to grasp was the basics of Istio traffic control, such as VirtualService and DestinationRule. I struggled to connect the names to their behaviors and had a hard time understanding them. I ended up accepting them as Istio-specific terms.

For ICA, there is no simulation environment like Killer.sh for the CKA/CKAD/CKS hands-on exams. The Killercoda hands-on exercises were helpful as practice.

When I was about to register for the exam, a surprise announcement said that the ICA curriculum would be updated (which I missed on the registration page). I had planned to take it right before my summer break, but that period coincided with the curriculum transition, so I couldn’t take the exam then. I postponed the exam until after my break, but it was a bit annoying to check the updates and avoid forgetting what I’d learned.

![Quick analysis of ICA update contents](/img/blogs/2026/0106_golden-kubestronaut/e6940ac5-7ebf-44c6-9309-14966898c5af.png)

The exam itself didn’t change significantly, so it was fine. I felt the difficulty was about the same or slightly easier than CKA or CKAD.

### Cilium Certified Associate (CCA)

- **Exam date:** 2025/09/23
- **Study duration:** 31 days
- **Resources used:**
  - [Introduction to Cilium (LFS146)](https://training.linuxfoundation.org/training/introduction-to-cilium-lfs146/)
    - e-learning
    - free
  - [Prep Course - Cilium Certified Associate (CCA) Certification](https://kodekloud.com/courses/cilium-certified-associate-cca)
    - e-learning

I had a complicated impression of Cilium from my CKS studies, largely due to the complexity of the Cilium reference documentation.

However, during the e-learning, the knowledge I gained from CKS and ICA helped. In CKS I learned about CiliumNetworkPolicy, mTLS, and Hubble, and my knowledge of eBPF from studying Falco was useful. Regarding ICA, I had some understanding of Istio’s Ambient mode, which seemed similar to Cilium’s approach, and that helped too.

I had planned to purchase a Udemy practice exam for CCA, but it was discontinued, which was an unexpected setback. Since I wanted mental preparation, I created my own practice exam app during my summer break—partway through ICA studies—and used it here. I also intended to review the reference after e-learning like I did for ICA, but as mentioned above, the reference structure was too convoluted to organize effectively.

Some exam questions dealt with fairly detailed content, but I don’t think there were too many of those.

### Certified Argo Project Associate (CAPA)

- **Exam date:** 2025/10/12
- **Study duration:** 19 days
- **Resources used:**
  - [Argo Workflows: The Complete Practical Guide : Unlock DevOps](https://www.udemy.com/course/argo-workflows-the-complete-practical-guide-unlock-devops/)
    - e-learning
  - [Argo CD Essential Guide for End Users with Practice](https://www.udemy.com/course/argo-cd-essential-guide-for-end-users-with-practice/)
    - e-learning
  - [Mastering Argo Rollouts: Progressive Delivery in Kubernetes](https://www.udemy.com/course/mastering-argo-rollouts-progressive-delivery-in-kubernetes/)
    - e-learning
  - <https://killercoda.com/argo>
    - hands-on

CAPA covers all four Argo products (Workflows, CD, Rollouts, Events). I couldn’t find a single e-learning course specifically for CAPA, but there were Udemy courses on Workflows, CD, and Rollouts, so I watched the lessons relevant to the CAPA curriculum. For Events, since there was no e-learning, I learned from the official docs within the exam scope. As Events has a small share of the overall exam, I judged this was sufficient.

Personally, I was most familiar with Argo CD and Argo Workflows, so learning those two was easy. Still, since I’d only used them superficially in private projects, I deepened my understanding of topics like Argo CD’s Projects and RBAC. Rollouts was new to me, but I already had some knowledge of progressive delivery, so it wasn’t hard to understand. My traffic-shifting knowledge from ICA helped me visualize Rollouts’ traffic controls.

The tricky part of CAPA was “losing track of which product a learned item belonged to.” Since I studied four products simultaneously, I sometimes couldn’t recall which one a specific detail applied to.

After e-learning, I did hands-on work: Killercoda’s content for Argo CD and Workflows was extensive, so I used that for a quick run-through. For Rollouts and Events, I set up my own environment and practiced. There were no practice exam courses I found, so I used my self-made app to prepare mentally for CAPA as well.

By the way, for Argo Workflows, you can also refer to [this article](https://developer.mamezou-tech.com/containers/k8s/tutorial/advanced/argo-workflows/).

### GitOps Certified Associate (CGOA)

- **Exam date:** 2025/10/19
- **Study duration:** 7 days
- **Resources used:**
  - [Prep Course - GitOps Certified Associate (CGOA)](https://learn.kodekloud.com/user/courses/gitops-certified-associate-cgoa)
    - e-learning
  - [Introduction to GitOps (LFS169)](https://trainingportal.linuxfoundation.org/learn/course/introduction-to-gitops-lfs169/gitops-concepts/gitops-concepts-overview)
    - e-learning
  - <https://www.udemy.com/course/certified-gitops-associate-cgoa/>
    - practice exam
    - discontinued

CGOA is not product-specific but focuses on the theme of GitOps. Since I had just learned Argo CD (a GitOps product) in CAPA, I had roughly acquired GitOps knowledge. So I breezed through the e-learning and practice exam and went straight to the exam.

I passed, but my success rate was the lowest among the fifteen exams. The cause seemed to be my English ability rather than a lack of GitOps understanding. As noted above, product-agnostic exams like CGOA replace simple questions about product features with relatively complex questions, making the English in the problems difficult to comprehend. CGOA made me realize “product-agnostic exams can be surprisingly tricky.”

### Prometheus Certified Associate (PCA)

- **Exam date:** 2025/11/09
- **Study duration:** 21 days
- **Resources used:**
  - [Prep Course - Prometheus Certified Associate (PCA) Certification](https://learn.kodekloud.com/user/courses/prometheus-certified-associate-pca)
    - e-learning
  - [Prometheus Certified Associate Practice Exams](https://www.udemy.com/course/prometheus-certified-associate-practice-exams/)
    - practice exams

I had tried to explore Prometheus several times before but each time backed off because of the perceived complexity of PromQL. But here, there was no avoiding it, so I tackled it.

Having realized my English weaknesses from CGOA, I created the transcription app the day I passed CGOA and started using it for PCA study. As a result, my understanding in the e-learning improved significantly.

For PCA, the knowledge of metrics and exporters gained in OTCA was helpful. Prometheus also has unique alert triggering and notification features beyond metric collection, but those mechanisms were easy to grasp. However, there are detailed points like the differences between Histogram and Summary, Relabel Config behaviors, and operators, so I referred to the documentation to commit those to memory.

Crucially, for PCA’s distinct feature—its custom language PromQL—I deepened my understanding through hands-on practice in my local Prometheus environment. Using the Expression Browser, I wrote queries repeatedly, learning the language specification through syntax errors.

### Certified Backstage Associate (CBA)

- **Exam date:** 2025/11/23
- **Study duration:** 14 days
- **Resources used:**
  - [Prep Course - Certified Backstage Associate (CBA) Certification](https://learn.kodekloud.com/user/courses/certified-backstage-associate-cba)
    - e-learning
  - [Introduction to Backstage: Developer Portals Made Easy (LFS142)](https://training.linuxfoundation.org/training/introduction-to-backstage-developer-portals-made-easy-lfs142/)
    - e-learning
    - free
  - [Certified Backstage Associate (CBA): Tests December 2025](https://www.udemy.com/course/certified-backstage-associate-cba-tests-explanations/)
    - practice exams

CBA focuses on Backstage, an IDP (Internal Developer Portal) product, and had a slightly different flavor from the other exams. The Platform as a Product concepts I learned here were of great value later in CNPA.

Backstage itself is a monorepo-based React app using Material UI for its design system. Thus, CBA tests knowledge of IDP concepts, Backstage features, and implementing React apps with Material UI. Since I already had familiarity with Material UI and React, this wasn’t a problem. The e-learning course included sessions on app development and felt a bit different from other exam prep courses.

Backstage can be run locally, so practicing was straightforward. I tried implementing plugins and customizing designs to understand how they work.

By the way, for Backstage, you can also see [these articles](https://developer.mamezou-tech.com/tags/backstage/).

### Kyverno Certified Associate (KCA)

- **Exam date:** 2025/12/07
- **Study duration:** 14 days
- **Resources used:**
  - [Prep Course - Kyverno Certified Associate (KCA) Certification](https://kodekloud.com/courses/kyverno-certified-associate)
    - e-learning
  - [KCA - Kyverno Certified Associate - Mock Exams](https://www.udemy.com/course/kca-kyverno-certified-associate-mock-exams)
    - practice exams

I recall that when I started studying, there was no e-learning or practice exam content for KCA, so I postponed its order. At that point, I planned to learn from Kyverno’s product site, but by the time the program launched, the content was available, so I used it.

In KCA study, the policy knowledge from CKS was helpful. CKS covers OPA/Gatekeeper, but the concepts and mechanisms are similar to Kyverno. OPA/Gatekeeper uses Rego for policy coding, which is hard to grasp, whereas Kyverno policies are basically written in YAML and JSON, making them easier to understand. The e-learning instructor’s slow pace also made comprehension easy.

Before the exam, I set up a k8s environment for hands-on practice, checking policy specifications and controller behaviors. Since background scanning and report generation can be a bit complex, I ran them to observe their operation.

### Certified Cloud Native Platform Engineering Associate (CNPA)

- **Exam date:** 2025/12/13
- **Study duration:** 6 days
- **Resources used:**
  - [Prep Course - Certified Cloud Native Platform Engineering Associate (CNPA)](https://kodekloud.com/courses/certified-cloud-native-platform-engineering-associate-cnpa)
    - e-learning
  - [CNPA- Cloud Native Platform Associate - Mock Exams](https://www.udemy.com/course/cnpa-cloud-native-platform-associate-mock-exams)
    - practice exams

CNPA wasn’t initially a requirement; it was added later. As with KCA, there was initially no e-learning or practice exam content, so I planned to take it last, after LFCS. Later, content became available, so I changed my plan and took it before LFCS. By then, I really wanted to finish within the year, so I tackled it one week after KCA.

Like CGOA, CNPA is not product-specific. Its scope is quite broad, covering topics such as GitOps, DevSecOps development and operations, and Platform as a Product concepts. Of all the exams I had taken, the knowledge from CKS, CGOA, and CBA was most useful here.

The e-learning instructor spoke very quickly, making understanding difficult. I used AI for translation and summarization to finally grasp the content.

What was challenging in the CNPA exam was the high **number of questions** and the **difficulty of the English**. Regarding question count, whereas other multiple-choice exams have 60 questions in 90 minutes, CNPA has 85 questions in 120 minutes. The e-learning said “60 questions,” so I assumed a display bug and expected it to end then, but it kept going, and I answered all 85. As a result, my concentration wavered and I had little time to review. As for English difficulty, being product-agnostic means the question and answer texts are longer and more complex—about 1.5 to 2 times longer than other exams. I felt that CNPA’s difficulty depends heavily on one’s English proficiency.

Having studied for six months up to CNPA, I thought I’d be fine, but both the e-learning and the exam gave me more trouble than expected (mainly due to English).

### Linux Foundation Certified System Administrator (LFCS-JP)

- **Exam date:** 2025/12/28
- **Study duration:** 15 days
- **Resources used:**
  - [Linux Foundation Certified Systems Administrator - LFCS](https://www.udemy.com/course/linux-foundation-certified-systems-administrator-lfcs/)
    - e-learning
  - <https://killercoda.com/lfcs>
    - hands-on

The last exam I took was LFCS, which tests hands-on Linux skills. Although I use Linux (Ubuntu) regularly, I don’t use many advanced features in personal use, so I learned the missing parts through e-learning and hands-on on my Linux PC.

For LFCS, as with CKAD, CKA, and CKS, you can use the Killer.sh simulator twice before the exam. It was extremely effective for preparation. I used it once a week before the exam. From past experience, I find the simulator slightly harder than the real exam, so I gauged the scope and predicted the real exam’s difficulty. Then, the day before the exam, I used it a second time and felt fully prepared.

A feature of the LFCS exam is that, unlike other hands-on exams (CKAD, CKA, CKS, ICA), you cannot refer to online manuals during the test. The only references available are man pages and help on the terminal. For preparation, familiarize yourself with man usage and learn how to reach the relevant man or help pages for likely topics.

Also, if the task target is clearly defined, man and help can help, but if it’s vague like “What was that command?” you can’t locate it. To prepare for such situations, I recommend practicing ways to find the target, such as:

- Use Tab completion to narrow down candidates. For example, for a date-related task, type “time” or “date” and press Tab to list options and pick the right command.
- Use the “SEE ALSO” section in man pages to find related commands. Open a likely man page and check its See Also for leads.
- Grep recursively under /etc for related keywords to find plausible configuration files.

I felt confident answering all questions and was sure I had passed when the exam ended. The pass notification, which should have arrived within 24 hours, was delayed, but I eventually got it. Soon after, I received the GOLDEN Kubestronaut notification and could welcome the new year with peace of mind.
