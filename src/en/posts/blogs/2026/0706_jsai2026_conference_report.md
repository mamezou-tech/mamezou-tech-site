---
title: >-
  JSAI2026 Attendance Report — Presentations and AI Research Trends Observed at
  the Conference
author: masato-todo
date: 2026-07-06T00:00:00.000Z
tags:
  - AI
  - 生成AI
translate: true

---

## Introduction

I’m Todo from the AI Technical Sector. Since the sector became an independent organization, initiatives to expand AI utilization across the company have been in full swing. Against that backdrop, in June I participated in the [40th JSAI2026](#jsai2026).

In the first half, I’ll briefly touch on ShigyoBench, the LLM benchmark for professional qualification exams that I presented as a poster, and share some impressions on the practical implementation of AI.

In the second half, I’ll note the presentations that left an impression on me at the Japanese Society for Artificial Intelligence and share my thoughts on future AI research.

---

## What the Paper Is About

ShigyoBench is an LLM benchmark dataset **targeted at Japanese professional qualification exams**. We standardized 8,979 multiple-choice questions from eight exams—Real Estate Transaction Agent, Administrative Scrivener, Patent Attorney, Judicial Scrivener, Bar Examination (including the preliminary examination), Real Estate Appraiser, and Certified Public Accountant—into a unified format and conducted evaluation experiments on multiple LLMs. The dataset is publicly available on [Hugging Face](#本研究（shigyobench）).

The paper is positioned as research that quantitatively evaluates domain-specific knowledge using exam questions. The motivation is to fill the gap in the professional qualification domain (Administrative Scrivener, Patent Attorney, Real Estate Transaction Agent, Real Estate Appraiser, Judicial Scrivener, etc.) and for all CPA subjects, where there has been no reproducible common benchmark until now.

The evaluation results showed significant differences depending on the model and exam: while Gemini-3-Pro exceeded the passing threshold in some exams, many models and subjects still fell short. That is the conclusion of this research.

For example, there is the following question. Below is an example that `google/gemma-4-26B-A4B-it` answered incorrectly.

### Bar Examination, Reiwa 2 (2020) – Civil Code Question 8

**Question**

> Among the statements (A) through (E) below concerning acquisition by immediate transfer, which combination of statements is incorrect when viewed in light of case law?
> 
> A. A sold a jewel he owned to B and delivered it. B then sold the jewel to C and delivered it. Later, A canceled the sales contract with B on the grounds that B had used duress. In this case, C cannot acquire ownership of the jewel by immediate transfer.
> 
> B. Minor A sold a jewel he owned to B and delivered it. Afterwards, A canceled the sales contract with B on the grounds that he was a minor. In this case, B cannot acquire ownership of the jewel by immediate transfer.
> 
> C. A borrowed a jewel owned by B and received delivery, and deposited the jewel with C. A then sold the jewel to D, instructed C to hold the jewel on D’s behalf, and D accepted. In this case, even if D believes the jewel is owned by A and has no negligence in that belief, D cannot acquire ownership of the jewel by immediate transfer.
> 
> D. A found a jewel that B had left behind and took it home under the belief, without negligence, that it was his own property. In this case, A cannot acquire ownership of the jewel by immediate transfer.
> 
> E. A stole a jewel that B had borrowed from C and gifted it to D. If D, without negligence, believes the jewel is A’s property and receives delivery, then B can request recovery of the jewel from D for two years from the time of theft.
> 
> 1. A C   2. A D   3. B C   4. B E   5. D E

**Answer by `google/gemma-4-26B-A4B-it`**

```
This question requires us to judge the correctness of statements A through E regarding "acquisition by immediate transfer" under Article 192 of the Civil Code, and select the combination of incorrect statements.

### Examination of Each Statement

**A. Correct**
For acquisition by immediate transfer to be established, a "disposition act" (sale, gift, etc.) is required. In the case of cancellation by B due to duress, the contract is retroactively voided. However, case law holds that for a third party (C) who received the item from the party whose rights were lost by cancellation (A) to acquire by immediate transfer, the transaction must have occurred **before the cancellation**. In this problem, C received the item before A's cancellation, since the timeline is "A→B (sale)→C (sale)" and only afterwards does "A cancels." The key point is that cancellation due to duress, unlike cancellation due to fraud, retroactively voids rights, but from the perspective of the requirement for a "valid transaction," B becomes a non-rights holder upon cancellation. Nevertheless, the spirit of the case law (and the prevailing view) is that cancellation due to duress is effective even against a bona fide third party without negligence (C), so C cannot acquire by immediate transfer. Therefore, the statement "C cannot acquire ownership by immediate transfer" is correct.

**B. Incorrect**
For acquisition by immediate transfer to be established, the transferee must obtain possession from a non-rights holder, but the disposition act itself must still be valid. Cancellation of a contract by a minor due to lack of capacity does not prevent acquisition by immediate transfer. If B is a bona fide transferee without negligence, B can acquire ownership by immediate transfer. Therefore, the statement "B cannot acquire ownership by immediate transfer" is incorrect.

**C. Correct**
Acquisition by immediate transfer requires a direct transfer of possession, such as "transfer of possession." In this problem, A deposited the jewel with C and then sold it to D, instructing C to hold possession on behalf of D (constitutum possessorium). Case law denies acquisition by immediate transfer through constitutum possessorium. Therefore, the statement "D cannot acquire ownership by immediate transfer" is correct.

**D. Correct**
Immediate transfer arises when possession is obtained through a disposition act (sale, gift, etc.). In this problem, taking someone else’s property home under the belief that it is one’s own (a quasi-possession without a disposition act) does not constitute a disposition act. Thus, acquisition by immediate transfer does not occur. Therefore, the statement is correct.

**E. Incorrect**
Under Article 193 of the Civil Code, the possessor of a stolen or lost item may demand its return from an acquirer by immediate transfer within **two years** from the time of theft or loss. However, in this problem, D is unaware (bona fide and without negligence) that A’s item was stolen, so acquisition by immediate transfer is established. Once acquisition by immediate transfer is established, D validly acquires ownership. Even within the two-year period of Article 193, the original owner B cannot demand return from D because acquisition by immediate transfer is recognized as valid regardless of Article 193. Therefore, the statement is incorrect.

### Summary
- A: Correct
- B: Incorrect
- C: Correct
- D: Correct
- E: Incorrect

The incorrect statements are **B** and **E**.  
Checking the options, the combination of B and E corresponds to "4".

<answer>4</answer>
```

**Correct Answer**: 1

For details on methods and results, please see the [paper](#本研究（shigyobench）).

## The Path to Practical Implementation

With the advent of LLMs, using the same exam questions as humans to measure the specialized knowledge of LLMs, as in ShigyoBench, has become established as a standard for AI evaluation. As a result, it is known that various exams—such as the International Mathematical Olympiad, entrance exams for the University of Tokyo, and the national medical licensing exam—are being solved by frontier LLMs. I believe that by combining techniques like RAG (Retrieval-Augmented Generation), it is quite possible to reach the passing score on professional qualification exams. In the poster discussion and several sessions, there was active debate on whether human jobs would disappear.

On the other hand, there is now debate that being able to solve exam questions and achieving practical application are separate issues. One of the most advanced fields in this regard is healthcare. In a 2025 systematic review by Gong et al., 39 medical LLM benchmarks were compiled. In knowledge-based evaluations modeled on national exams (USMLE), prior models have achieved accuracy rates of 84–90%. In contrast, practice-based evaluations closer to clinical settings only reach about 45–69% (the so-called knowledge-practice gap). I’ve heard from a physician acquaintance that "being able to solve exam questions and directly delivering LLM outputs to patients are different." I think this is not just a medical issue, but that practical application involves several steps. The focus of discussion has been on what is required in practical benchmarks, such as free-form reasoning, uncertainty management, multi-turn dialogue, context integration, and safety.

In software development, the situation is somewhat different. It seems that coding assistance tools and agents have begun entering the field even before fully discussing this "gap between exams and real-world practice." Perhaps because code can be easily tested and iterated, and feedback is quick. There may also be a difference in that, unlike in medicine or law, a single mistake is less likely to lead to irreparable consequences. However, there are also risks that cannot be seen by test pass rates alone, such as how to maintain the quality of complex code and documentation for a single system. In my own experience using LLMs on real projects, I have felt both their convenience and their precariousness.

---

## Expectations for Physical AI

At JSAI2026, there were numerous presentations related to robotics and Physical AI. Due to work constraints, I could only attend one of the sessions, but I felt that researchers and students in Japan are gathering great interest.

The most impressive presentation was "[Design of a World Hand-Off Consistency Metric for Multi-View Video Generation for Autonomous Driving](#学会で印象に残った発表)" in the "Physical AI in the Era of Foundation Models" session. Diffusion-based video generation models have emerged and are being used to create synthetic data for autonomous driving. Such models can produce footage as if captured by multiple cameras from different viewpoints, but physical inconsistencies can occur between those camera views (for example, a car that appears as a sedan in one view may appear as a different model in another). This paper seeks to quantitatively evaluate such inconsistencies. The authors called it "hallucination" in images, and I think such phenomena indeed occur in principle, so quantifying them is valuable.

Professor Yutaka Matsuo mentioned that "one third of JSAI papers are at a level that can be presented at international conferences." Personally, given the increase in paper numbers, I feel that the ratio may not be that high now, but this presentation was of international caliber, and I felt that talented young researchers are rapidly solving problems in Physical AI.

---

## Generative AI is Starting to Change AI Research Itself

More than any particular session, what I felt throughout the conference is that generative AI is starting to change the very way AI research is conducted. LLMs are beginning to take over many tasks that researchers used to spend time on, such as literature review, programming, experiment design, data organization, and model training. It seems that the focus of the workload is shifting from "implementing things" and "gathering information" to "what questions to ask" and "how to measure results." The shorter the trial cycles become, the easier it is to achieve new results, which in turn shortens the trial cycles—a positive feedback loop.

Personally, I have started spending more time creating environments that facilitate these cycles rather than deep diving into a single research topic. There are coding agents like Cursor and Codex. I also use applications connected to various AI APIs and GPU infrastructures like Google Colaboratory and Modal. The tools I currently use can be schematically represented roughly as follows.

![Environment Setup for AI Research (Personal Note)](/img/blogs/2026/0706_jsai2026_conference_report/jsai2026_ai_research_env.png)

By taking a meta-level perspective—such as which models to use, how to organize prior research, where to involve human judgment, and which GPUs to allocate to which experiments—and allocating resources across the entire experimental environment in this way, research accelerates. By tomorrow, similar research might already be published. In the midst of accelerating research, I think the most difficult part is deciding what topic to tackle.

---

## Conclusion

I could only attend on the last day, but the poster session was very fulfilling as I got to talk with representatives from many prominent LLM vendors. Five years ago, I never imagined that people known as AI model vendors would appear domestically, but I hope they continue to challenge the world. I also ran into some familiar faces with whom I had worked in the past and had various conversations. These are the true pleasures of in-person events, and I realized that the AI community, while seeming vast, is actually quite small.

Next is Nagasaki.

---

## References

<span id="本研究（shigyobench）"></span>

**This Work (ShigyoBench)**

- Todo, M. and Ishikawa, S. ShigyoBench: Construction and Evaluation of an LLM Benchmark Dataset Targeting Japan’s Professional Qualification Exams. *JSAI2026 Proceedings*, 2026. https://pub.confit.atlas.jp/ja/event/jsai2026/presentation/5Yin-A-16 / Dataset: https://huggingface.co/datasets/todo1111/shigyobench

**Practical Implementation & Healthcare**

- Gong EJ, Bang CS, Lee JJ, Baik GH. Knowledge-Practice Performance Gap in Clinical LLMs: Systematic Review of 39 Benchmarks. *J Med Internet Res*. 2025;27:e84120. https://doi.org/10.2196/84120

<span id="学会で印象に残った発表"></span>

**Notable Presentation at the Conference**

- Kim Bon-joon, et al. Design of a World Hand-Off Consistency Metric for Multi-View Video Generation for Autonomous Driving. *JSAI2026 Proceedings* (Physical AI in the Era of Foundation Models), 2026. https://pub.confit.atlas.jp/ja/event/jsai2026/presentation/2G4-OS-47a-02

**Conference**

<span id="jsai2026"></span>

- Japanese Society for Artificial Intelligence. [2026 JSAI (40th)](https://www.ai-gakkai.or.jp/jsai2026/)
