---
title: >-
  Introduction to Requirements Definition ①: What Is Requirements Definition –
  Roles and the Big Picture in the Field
author: ryosuke-kono
date: 2026-04-01T00:00:00.000Z
tags:
  - 初心者向け
  - 要件定義
image: true
translate: true

---

# Introduction to Requirements Definition ①: What Is Requirements Definition – Roles and the Big Picture in the Field

## 1. Introduction

We often hear the term "requirements definition," but many people may feel, "I don’t actually know what they do." Especially when you’re new on site, you’re often involved in development phases like implementation and testing, and your understanding of requirements definition tends to remain at the level of “it’s the phase that comes first.” For that reason, there are plenty of moments when you wonder, “What exactly happens in requirements definition?”

In this article, we’ll clearly organize the role of requirements definition using concrete examples for easy understanding.

---

## 2. What Is Requirements Definition

Requirements definition is the process of “clarifying the conditions (requirements) that a system must satisfy and reaching agreement among stakeholders.”

Here, “requirements” refers to the conditions of “what the system should achieve.”

### Why Requirements Definition Is Necessary

System development begins with the customer’s “wants” (requests). However, if you pass those requests directly to the development team without concretizing them, it’s easy for the finished product to end up “different from what was expected.” Furthermore, factors such as “budget,” “personnel,” and “technical constraints” can make realization difficult from the start.

### What Happens in Requirements Definition

Therefore, during requirements definition we repeat interactions like the following:

- Organize the customer’s requests  
- Evaluate feasibility from the development side  
- Propose solutions based on implementation methods and constraints  
- The customer reviews and adjusts the proposal  

By repeating this process, we ultimately define the agreed-upon content of “this is what we’ll build.” Requirements definition can also be described as the process of reconciling “wants” and “reality (constraints)” and shaping them into a feasible form. Also, since the customer cannot always clarify everything, it’s important for the development team to concretize requirements through questions and proposals.

---

## 3. How It Differs from Design

What’s often confused with requirements definition is “design.” The difference between the two can be organized as follows:

- Requirements Definition: What to build (What)  
- Design: How to build it (How)

### Concrete Example

Example: A function that allows users to log in.

- Requirements Definition  
  The user can log in with an ID and password

- Design  
  Use JWT for authentication  
  Store passwords as hashes

If you discuss design during the requirements definition phase, you won’t be able to respond flexibly when requirements change later. Therefore, it’s important to consciously separate “What” and “How.”

---

## 4. Basic Flow

Requirements definition generally proceeds as follows:

![Flow of Requirements Definition](https://i.gyazo.com/d7ba606f33bdf39de7076cec5c9da8c0.png)

“Wants” and “requirements” are similar, but in this article we define them as follows:

- Wants: The customer’s subjective desires  
- Requirements: The concretized needs

---

## 5. Concrete Example

Example: Time and Attendance Management System.

In this section, we’ll map the flow of requirements definition to a concrete case.

---

### ■ Wants (What They Want)

The customer’s initial wants are typically presented in an abstract form.

(Example)  
“I want to manage employee attendance.”

*At this stage, the business flow and necessary functions are not yet clear.*

---

### ■ Requirements (Concretized Needs)

Through hearings, the development team organizes the wants into concrete requirements.

(Examples)

- “I want to record clock‐in and clock‐out times.”  
- “I want to be able to punch in from a smartphone.”  
- “I want to aggregate monthly working hours and overtime hours.”

---

### ■ Organization & Evaluation (Organizing Requirements & Checking Feasibility)

The requirements are organized, and the development team examines them from perspectives such as:

- Is it valid as a business requirement? (Consistency with the business flow)  
- Is it technically feasible?  
- Does it fit within cost and schedule?

If necessary, we also perform trade‐offs and prioritization of requirements.

---

### ■ Proposal (Presenting Implementation Plans)

Based on the evaluation results, the development team presents concrete implementation plans.

(Examples)

- “Provide it as a web application”  
  → Usable from both PC and smartphone browsers

- “Use a browser‐based punching method”  
  → Do not develop a dedicated app (considering development cost and timeline)

- “Do not integrate with existing HR systems”  
  → Operate as a standalone system in the initial release; consider future expansion

Also, if necessary, present viewpoints such as:

- Function priorities (Must‐have / Optional)  
- Scope (Coverage for this release)  
- Trade‐offs (Cost, Quality, Speed)

---

### ■ Review (Customer Validation)

The customer verifies the validity of the proposal:

- Can it be used without issues in their operations?  
- Are the necessary functions fulfilled?  
- Are there any missing or excessive requirements?

If needed, they request further modifications or additions to their wants.

---

### ■ Agreement (Requirements Finalization)

The customer and development team agree on the content and determine “what and to what extent will be implemented.” This agreed content becomes the “requirements” that serve as the basis for subsequent design and implementation.

---

## 6. Conclusion

- Requirements definition is the process of deciding “what to build (What).”  
- It reconciles wants and constraints to form a feasible solution.  
- It is important for the development team to proactively concretize the requirements.

Requirements definition is not just a preliminary phase; it is a crucial process that influences the quality of the entire project. Next time, we’ll explain how to actually elicit and organize requirements.
