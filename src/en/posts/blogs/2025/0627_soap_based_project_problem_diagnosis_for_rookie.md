---
title: >-
  Diagnosing 'Problems' and Prescribing 'Tasks' — The Problem-Solving 'Pattern'
  Rookie Project Managers Learn from SOAP
author: makoto-takahashi
date: 2025-06-27T00:00:00.000Z
tags:
  - ProjectManagement
  - プロジェクト管理
  - 課題管理
  - 新人向け
translate: true
---

# Introduction
To all rookie project managers (PMs):  
Have you ever been in a situation during a project where you can’t figure out why things aren’t going well and you’re at a loss for what to do?

The root cause of an issue goes unidentified, you can’t implement the right countermeasures, and only time slips away.  
You may be left with that vague sense of anxiety.

In this article, we liken project troubles to an 'illness.'  
We will introduce the way of thinking and the “framework” for diagnosing problems and prescribing solutions, just like a doctor.

:::info
This article is part of a series for rookie project managers.

1. [Part 1: Starting with the Difference Between “Problem” and “Task” (Introduction to Issue Management)](https://developer.mamezou-tech.com/en/blogs/2025/06/06/from_problem_to_action_issue_management_for_rookies/)  
2. [Part 2: Detective-Style Management — How to Uncover the Truth (Thinking & Observation Edition)](https://developer.mamezou-tech.com/en/blogs/2025/06/13/fact_vs_truths_conan_inspired_pm_guide_for_rookies/)  
3. [Part 3: Starting with the Difference Between “Problem” and “Risk” (Introduction to Risk Management)](https://developer.mamezou-tech.com/en/blogs/2025/06/20/risk_management_starting_with_risk_vs_problem_for_rookies/)  
4. **Part 4: Diagnosing “Problems” with SOAP and Prescribing “Tasks” (Problem-Solving Edition)**

👉 If you’re reading for the first time, we recommend [starting from Part 1](https://developer.mamezou-tech.com/en/blogs/2025/06/06/from_problem_to_action_issue_management_for_rookies/).  
:::

# Project Troubles Are Like an 'Illness': Learning from a Doctor's 'Examination Process'
Project problems manifest like symptoms of an illness.  
You need to find the root cause, not just address the surface-level symptoms.  
Here, we will learn how to structure problems by referring to a doctor’s diagnostic methods.

## 1. Medical Interview
A doctor first asks the patient what symptoms they’re experiencing.  
At this stage, clarifying the one thing the patient is most troubled by—the “chief complaint”—is crucial.  
The chief complaint is the reason the patient came to the hospital.

Specifically, the following questions are asked:  
* Since when have you had this symptom?  
* Which part hurts?  
* What kind of symptoms do you have?  

Additionally, to confirm details of the symptoms and medical history, these questions are asked:  
* How have the symptoms changed over time?  
* What major illnesses have you had so far, and are you currently taking any medication?  
* Is there any family history of common or hereditary diseases?  

## 2. Physical Examination
After the interview, the doctor conducts an actual physical examination.  
This includes inspection (visual examination), palpation (feeling by touch), and auscultation (listening to sounds).

Through the physical examination, the doctor makes a more detailed diagnosis based on the information from the interview.  
If necessary, blood tests and imaging tests are also performed.

Specifically, the following examinations or tests may be done:  
* Use a light to visually check if the throat is red and swollen.  
* Place a stethoscope on the chest to listen for any abnormal breathing sounds.  
* Gently press the abdomen and feel for any painful areas.  
* Measure blood pressure and body temperature to confirm basic health status numerically.  

## 3. Diagnosis and Treatment Plan Determination
Finally, a diagnosis and treatment plan are determined based on the information obtained.  
A diagnosis is the process of identifying the disease name.  
The treatment plan is the plan for how to cure the disease.

Specifically, the doctor might communicate the diagnosis and treatment plan as follows:  
* Diagnosis: “It’s influenza” → Treatment plan: “Prescribe medication to suppress viral replication, and rest at home without school for five days.”  
* Diagnosis: “It’s a mild sprain” → Treatment plan: “Apply cold, immobilize the injured area, and provide a pain-relieving patch.”  
* Diagnosis: “More detailed tests are needed to identify the cause” → Treatment plan: “Refer to a specialized medical institution for a comprehensive examination.”  

# The 'Pattern' of Medical Records: Understanding the SOAP Format
Doctors record a patient’s medical details and progress in a medical chart.  
The term “chart” (カルテ) derives from the German word “Karte” and is used to organize and record medical information.

## Charts Also Have a 'Pattern': What Is the SOAP Format?
The “SOAP” in the title of this article is a record format for medical charts that is routinely used in clinical settings.  
Physicians use it to systematically record a patient’s condition and develop effective diagnosis and treatment plans.  
SOAP is an acronym for the following four components:  
* **S (Subjective)**: Subjective information (symptoms and complaints the patient feels, chief complaint, etc.)  
* **O (Objective)**: Objective information (clinical findings observed by the physician, test data, vital signs, etc.)  
* **A (Assessment)**: Evaluation (the results of comprehensive judgment and analysis by the physician based on S and O, or the diagnosis)  
* **P (Plan)**: Plan (specific actions for future treatment policies, prescriptions, tests, instructions, etc., based on the assessment)  

## The Role of SOAP: Why Is Systematic Record-Keeping Important?
The SOAP format is a representative “pattern” for organizing medical records in clinical settings.  
It records information in four categories: Subjective (S), Objective (O), Assessment (A), and Plan (P).  
This prevents misunderstandings within the medical team regarding the patient's condition and treatment plan.  
As a result, appropriate decisions and responses can be made efficiently.

## Application to Project Management: Why SOAP Is a Powerful Problem-Solving Tool
SOAP is a record “pattern” in medical settings, but its essence is a thinking process for capturing issues systematically.  
This approach can also be applied to project management.  
It particularly facilitates team information sharing and the verbalization of policies and processes, making it a powerful tool for solving the communication challenges PMs face.  

| Item                       | Meaning in Medical Setting                                | Application to Projects                                 |
| :------------------------- | :--------------------------------------------------------- | :------------------------------------------------------- |
| **S: Subjective**          | Patient’s subjective complaints                           | Stakeholders’ concerns and feedback                     |
| **O: Objective**           | Objective data observed by the physician                   | Facts such as metrics and deliverables                  |
| **A: Assessment**          | Comprehensive evaluation/diagnosis                        | Root cause analysis and evaluation                      |
| **P: Plan**                | Treatment plan                                            | Specific improvement actions (task formulation)         |

# Practice: Diagnosing and Prescribing Project Problems with SOAP
From here, we will examine a common project issue and see how to organize and analyze it using the SOAP format.  
We will also introduce how to translate that into a concrete action plan (tasks).

## Case: Frequent Rework in the Design Phase Is Affecting Quality

### S: Subjective Information – Interview
First, listen to the stakeholders’ voices.  
At this point, do not evaluate; record subjective complaints as they are.

* “Preparing review materials takes a lot of time, which is slowing down development speed.”  
* “Every time we have a review, we receive fundamental feedback and end up redoing the work.”  

### O: Objective Information – Examination
Next, gather the “facts” that support these complaints.  
Avoid subjective expressions and collect concrete data.

* (From time logs) It takes more than 4 hours on average to prepare for reviews and create individualized explanation materials.  
* (From review records) The number of comments in the past three reviews averages 12 per session.  

### A: Assessment – Diagnosis
Compare S and O and analyze why the problem is occurring.

* The creation of design documents and separate explanatory materials overlaps, increasing the team’s workload.  
* Many comments stem from different interpretations of the design format.  
* [Diagnosis] The root cause of the issue lies in the inefficiency of the review process itself.  

### P: Plan – Treatment Plan (Task Formulation)
Based on the root cause identified in the assessment (A), develop a concrete action plan.  
It’s important to clearly describe these actions as “tasks,” as learned in [Part 1](https://developer.mamezou-tech.com/en/blogs/2025/06/06/from_problem_to_action_issue_management_for_rookies/).

* **Task**: Review the design review process to reduce rework man-hours and quality degradation.  
  * **Action 1**: Trial of direct design document review  
    * Description: Pilot the process of reviewing design documents directly in collaboration with Department XX.  
    * Owner: Akashi  
    * Deadline: XX/XX  
  * **Action 2**: Conduct a session to share the design format and review perspectives  
    * Description: Hold a meeting with a Q&A session to unify understanding of the design format and review criteria.  
    * Owner: Togashi  
    * Deadline: XX/YY  
  * **Action 3**: Evaluate the effects of process improvements and decide on formal implementation  
    * Description: Two weeks after the above actions, review the results and evaluate the improvement effects based on objective data (e.g., rework man-hours, number of comments), then decide whether to formally adopt the process.  
    * Owner: Date  
    * Deadline: XX/ZZ  

# 3 Benefits of Using SOAP

1. **Turn “vague dissatisfaction” into “analyzable information.”**  
   By gathering objective (O) data, you can calmly and accurately analyze root causes.  

2. **Move beyond “What do I do?” to “What should be done?”**  
   From Assessment (A) to Plan (P), the steps for problem solving are naturally guided.  

3. **Functions as a “common language” for the team.**  
   Structuring discussions according to SOAP prevents information gaps and misunderstandings.  

# Conclusion: PMs Should Be the “Project Clinician”
For PMs, diagnosing the health of a project and administering appropriate treatment is one of the most important roles.

Like a clinical doctor, attentively listen to the voices from the field (S).  
Collect and analyze objective facts (O), and accurately diagnose the root causes of problems (A).  
Then, based on that diagnosis, prescribe tasks as a concrete treatment plan (P).  
This entire process is the key to leading the project to success.

The SOAP format is a tool for organizing those daily “Huh?” and “That’s odd” feelings of discomfort.  
It has the power to connect those sensations to systematic problem solving.

First, start by incorporating the SOAP format into your daily work and making a habit of taking notes.  
The problem-solving “pattern” you develop through SOAP will eventually become your confidence as a PM.

And it will become a powerful “weapon” for facing any challenge.
